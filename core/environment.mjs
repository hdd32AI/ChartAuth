import { fixtures, expectedInquiry, expectedFields } from "./fixtures.mjs";
export const VERSION = "2.0.0";
export const LIMITS = Object.freeze({ actions: 40, seconds: 600 });
const clone = (v) => structuredClone(v);
const sort = (v) =>
  Array.isArray(v)
    ? v.map(sort)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sort(v[k])]),
        )
      : v;
export const canonical = (v) => JSON.stringify(sort(v));
export const equal = (a, b) => canonical(a) === canonical(b);
export async function digest(v) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical(v)),
      ),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const obj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const exactKeys = (o, keys) =>
  obj(o) && equal(Object.keys(o).sort(), [...keys].sort());
export function reset(key = "A", now = Date.now()) {
  if (!Object.hasOwn(fixtures, key)) throw Error("Unknown case");
  const reference = clone(fixtures[key]);
  return {
    version: VERSION,
    episode_id: crypto.randomUUID(),
    reference,
    source_documents: clone(reference.records),
    started_at: now,
    action_count: 0,
    status: "ready",
    inquiries: [],
    payer_response: null,
    assessment: null,
    records: [],
    events: [],
    idempotency: {},
    terminated: false,
    truncated: false,
    result: null,
  };
}
function event(s, type, details, now) {
  s.events.push({
    sequence: s.events.length + 1,
    type,
    episode_id: s.episode_id,
    at: now,
    ...details,
  });
}
export async function evidenceFor(s) {
  const evidence = {};
  for (const [role, doc] of Object.entries({
    ...s.source_documents,
    ...(s.payer_response ? { response: s.payer_response } : {}),
  }))
    evidence[role] = {
      id: doc.id,
      version: doc.version,
      digest: await digest(doc),
    };
  return evidence;
}
export async function observe(s) {
  const docs = {};
  for (const [k, v] of Object.entries(s.source_documents))
    docs[k] = { ...clone(v), source_digest: await digest(v) };
  return {
    version: VERSION,
    episode_id: s.episode_id,
    patient_id: s.source_documents.patient.id,
    policy_version: s.source_documents.policy.id,
    started_at: s.started_at,
    limits: LIMITS,
    action_count: s.action_count,
    status: s.status,
    source_documents: docs,
    inquiries: clone(s.inquiries),
    payer_response: clone(s.payer_response),
    assessment: clone(s.assessment),
    records: clone(s.records),
    events: clone(s.events),
    terminated: s.terminated,
    truncated: s.truncated,
    result: s.terminated ? clone(s.result) : null,
  };
}
export async function score(s, now = Date.now()) {
  const q = s.inquiries[0],
    record = s.records[0],
    f = s.reference;
  const expected = expectedFields(f);
  const checks = {
    source_integrity: equal(s.source_documents, f.records),
    within_budget:
      s.action_count <= LIMITS.actions &&
      !s.truncated &&
      now - s.started_at <= LIMITS.seconds * 1000,
    finished: s.terminated,
    no_forbidden_actions: !s.events.some((e) => e.type === "prohibited_action"),
    one_inquiry: s.inquiries.length === 1,
    inquiry_binding: equal(q?.fields, expectedInquiry(f.records)),
    payer_response_received: q?.status === "received" && !!s.payer_response,
  };
  checks.response_binding =
    !!s.payer_response &&
    s.payer_response.episode_id === s.episode_id &&
    s.payer_response.inquiry_id === q?.inquiry_id &&
    s.payer_response.request_digest === (await digest(q?.fields));
  if (s.payer_response) {
    const raw = clone(s.payer_response);
    for (const k of [
      "episode_id",
      "inquiry_id",
      "request_digest",
      "received_at",
    ])
      delete raw[k];
    checks.response_integrity = equal(raw, f.payer_response);
  } else checks.response_integrity = false;
  checks.assessment_fields = equal(s.assessment?.fields, expected);
  checks.evidence_mapping = equal(s.assessment?.evidence, await evidenceFor(s));
  checks.one_saved_record = s.records.length === 1;
  checks.record_binding =
    !!record &&
    record.episode_id === s.episode_id &&
    record.patient_id === f.records.patient.id &&
    record.inquiry_id === q?.inquiry_id &&
    record.assessment_digest === (await digest(s.assessment));
  checks.correct_disposition = s.status === expected.disposition;
  checks.event_history =
    s.events.filter((e) => e.type === "inquiry_created").length === 1 &&
    s.events.filter((e) => e.type === "response_received").length === 1 &&
    s.events.filter((e) => e.type === "record_saved").length === 1 &&
    s.events.some(
      (e) => e.record_id === record?.record_id && e.type === "record_saved",
    );
  const failed_checks = Object.keys(checks).filter((k) => !checks[k]);
  return {
    status: "scored",
    reward: failed_checks.length ? 0 : 1,
    passed: !failed_checks.length,
    checks,
    failed_checks,
    expected_disposition: expected.disposition,
    verifier_version: VERSION,
  };
}
async function transition(session, a, now) {
  const s = clone(session);
  if (s.terminated)
    return {
      session: s,
      error: "This episode has ended. Start a new episode to try again.",
      code: 409,
    };
  if (
    now - s.started_at > LIMITS.seconds * 1000 ||
    s.action_count >= LIMITS.actions
  ) {
    s.terminated = true;
    s.truncated = true;
    s.result = await score(s, now);
    return { session: s, error: "Episode limit reached", code: 409 };
  }
  const fail = (error, code = 400) => ({ session: s, error, code });
  const schemas = {
    inspect: ["type", "role"],
    query: ["type", "request", "idempotency_key"],
    poll: ["type"],
    assess: ["type", "assessment"],
    save: ["type", "idempotency_key"],
    finish: ["type"],
  };
  if (!obj(a) || !Object.hasOwn(schemas, a.type)) {
    s.action_count++;
    event(
      s,
      "prohibited_action",
      { action: typeof a?.type === "string" ? a.type : "invalid" },
      now,
    );
    return fail("Action is outside this workflow");
  }
  if (!exactKeys(a, schemas[a.type])) {
    s.action_count++;
    event(s, "invalid_action", {}, now);
    return fail("Unexpected or missing action fields");
  }
  let fingerprint, prior;
  if (["query", "save"].includes(a.type)) {
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(a.idempotency_key || "")) {
      s.action_count++;
      event(s, "invalid_action", {}, now);
      return fail("A valid transaction key is required");
    }
    fingerprint = await digest({
      type: a.type,
      body: a.type === "query" ? a.request : s.assessment,
    });
    prior = s.idempotency["key:" + a.idempotency_key];
    if (prior)
      return prior.fingerprint === fingerprint
        ? { session: s, output: { ...prior.output, replayed: true }, code: 200 }
        : fail("This transaction key belongs to different content", 409);
  }
  s.action_count++;
  let output = {};
  if (a.type === "inspect") {
    if (!Object.hasOwn(s.source_documents, a.role))
      return fail("Unknown chart section");
    event(s, "chart_opened", { role: a.role }, now);
  } else if (a.type === "query") {
    if (s.inquiries.length)
      return fail("An inquiry already exists. Check its status.", 409);
    const fields = a.request;
    if (
      !exactKeys(fields, Object.keys(expectedInquiry(s.reference.records))) ||
      Object.values(fields).some(
        (v) => typeof v !== "string" || !v || v.length > 100,
      )
    )
      return fail("Complete every inquiry field");
    const inquiry = {
      inquiry_id: "INQ-" + crypto.randomUUID(),
      episode_id: s.episode_id,
      fields: clone(fields),
      status: "pending",
      created_at: now,
    };
    s.inquiries.push(inquiry);
    s.status = "waiting";
    event(s, "inquiry_created", { inquiry_id: inquiry.inquiry_id }, now);
    output = { inquiry };
  } else if (a.type === "poll") {
    const q = s.inquiries[0];
    if (!q) return fail("Send an eligibility inquiry first");
    if (!s.payer_response) {
      const raw = equal(q.fields, expectedInquiry(s.reference.records))
        ? clone(s.reference.payer_response)
        : {
            ...clone(s.reference.payer_response),
            lookup_status: "not_found",
            coverage_status: "unknown",
            network_status: "unknown",
            copay: null,
            authorization_required: null,
          };
      s.payer_response = {
        ...raw,
        episode_id: s.episode_id,
        inquiry_id: q.inquiry_id,
        request_digest: await digest(q.fields),
        received_at: now,
      };
      q.status = "received";
      s.status = "review";
      event(
        s,
        "response_received",
        { inquiry_id: q.inquiry_id, response_id: raw.id },
        now,
      );
    }
    output = { response: clone(s.payer_response) };
  } else if (a.type === "assess") {
    if (!s.payer_response)
      return fail("Receive the payer response before documenting the result");
    if (s.records.length) return fail("The saved record is locked", 409);
    if (
      !exactKeys(a.assessment, ["fields", "evidence"]) ||
      !obj(a.assessment.fields) ||
      !obj(a.assessment.evidence)
    )
      return fail("An assessment requires fields and source references");
    s.assessment = clone(a.assessment);
    event(s, "assessment_drafted", {}, now);
  } else if (a.type === "save") {
    if (!s.assessment) return fail("Prepare the eligibility assessment first");
    if (s.records.length)
      return fail("An eligibility record already exists", 409);
    const record = {
      record_id: "ELG-" + crypto.randomUUID(),
      episode_id: s.episode_id,
      patient_id: s.source_documents.patient.id,
      inquiry_id: s.inquiries[0].inquiry_id,
      assessment_digest: await digest(s.assessment),
      saved_at: now,
    };
    s.records.push(record);
    s.status = String(s.assessment.fields.disposition || "unresolved");
    event(s, "record_saved", { record_id: record.record_id }, now);
    output = { record };
  } else if (a.type === "finish") {
    s.terminated = true;
    event(s, "episode_finished", {}, now);
    s.result = await score(s, now);
    output = { result: s.result };
  }
  if (fingerprint)
    s.idempotency["key:" + a.idempotency_key] = {
      fingerprint,
      output: clone(output),
    };
  return { session: s, output, code: 200 };
}
export async function step(session, action, now = Date.now()) {
  const r = await transition(session, action, now);
  if (!r.session.terminated && r.session.action_count >= LIMITS.actions) {
    r.session.terminated = true;
    r.session.truncated = true;
    r.session.result = await score(r.session, now);
  }
  return r;
}
