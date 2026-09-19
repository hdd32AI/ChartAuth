import { suggestAssessment } from "./suggestions.js";
const $ = (id) => document.getElementById(id);
let token = "",
  obs = null,
  currentCase = "A",
  chartRole = "patient",
  busy = false,
  guided = false,
  costMode = "start";
const names = {
  patient_id: "Patient ID",
  member_id: "Member ID",
  payer_id: "Payer",
  provider_id: "Rendering provider",
  service_type: "Service type",
  service_date: "Date of service",
  dob: "Date of birth",
  last_name: "Last name",
  coverage_status: "Coverage status",
  network_status: "Network status",
  copay: "Visit copay (USD)",
  authorization_required: "Authorization required",
  disposition: "Eligibility result",
  next_owner: "Next responsible team",
  next_action: "Next action",
};
const queryKeys = [
  "patient_id",
  "member_id",
  "last_name",
  "dob",
  "payer_id",
  "provider_id",
  "service_type",
  "service_date",
];
const options = {
  coverage_status: ["unknown", "active", "inactive"],
  network_status: ["unknown", "in_network", "out_of_network"],
  authorization_required: ["unknown", "true", "false"],
  disposition: [
    "unresolved",
    "verified",
    "coverage_issue",
    "identity_review",
    "response_review",
    "benefit_review",
  ],
  next_owner: [
    "unassigned",
    "authorization_team",
    "registration",
    "benefits_team",
    "scheduling",
  ],
  next_action: [
    "unassigned",
    "start_prior_authorization",
    "request_updated_coverage",
    "resolve_member_identity",
    "request_corrected_response",
    "clarify_coverage",
    "review_network_options",
    "clarify_authorization",
    "request_cost_share",
    "confirm_visit_readiness",
  ],
};
const assessmentKeys = [
  "coverage_status",
  "network_status",
  "copay",
  "authorization_required",
  "disposition",
  "next_owner",
  "next_action",
];
const human = (v) =>
  String(v ?? "Unknown")
    .replaceAll("_", " ")
    .replace(/^./, (x) => x.toUpperCase());
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
const routeRoot = location.pathname.startsWith("/chartauth")
  ? "/chartauth"
  : "";
function page(name, push = true) {
  const selected = name === "impact" ? "overview" : name;
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.toggle("active", p.id === selected));
  document
    .querySelectorAll("[data-page]")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === name));
  if (push)
    history.pushState(
      null,
      "",
      routeRoot + (name === "overview" ? "/" : "/" + name),
    );
  document.body.dataset.page = selected;
  if (name === "impact")
    document
      .getElementById("impact")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}
function restoreRoute() {
  const part = location.pathname.split("/").filter(Boolean).pop();
  page(
    ["worklist", "research", "production", "impact"].includes(part)
      ? part
      : "overview",
    false,
  );
}
window.addEventListener("popstate", restoreRoute);
document
  .querySelectorAll("[data-page]")
  .forEach((b) => (b.onclick = () => page(b.dataset.page)));
document.querySelector(".brand").onclick = (e) => {
  e.preventDefault();
  page("overview");
};
function notice(text, error = false) {
  $("notice").hidden = !text;
  $("notice").textContent = text;
  $("notice").classList.toggle("error", error);
}
async function api(route, payload = {}) {
  const headers = { "Content-Type": "application/json" };
  if (window.LAB_ACCESS_TOKEN)
    headers["x-access-token"] = window.LAB_ACCESS_TOKEN;
  if (window.LAB_PUBLIC_KEY) {
    headers.apikey = window.LAB_PUBLIC_KEY;
    headers.Authorization = "Bearer " + window.LAB_PUBLIC_KEY;
  }
  if (token) headers["x-episode-token"] = token;
  const r = await fetch(window.LAB_API + "/" + route, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (data.observation) {
    obs = data.observation;
    render();
  }
  if (!r.ok) throw Error(data.error || "The action could not be completed");
  return data;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  document.body.classList.add("busy");
  try {
    notice("");
    await fn();
  } catch (e) {
    notice(e.message, true);
  } finally {
    busy = false;
    document.body.classList.remove("busy", "starting-episode");
    renderButtons();
  }
}
function queryFields() {
  const d = obs.source_documents;
  return {
    patient_id: d.patient.id,
    member_id: d.coverage.member_id,
    last_name: d.patient.last_name,
    dob: d.patient.dob,
    payer_id: d.coverage.payer_id,
    provider_id: d.visit.provider_id,
    service_type: d.visit.service_type,
    service_date: d.visit.service_date,
  };
}
function inputFields(keys, container, prefix) {
  for (const k of keys) {
    const label = el("label", names[k]);
    label.htmlFor = prefix + k;
    let input;
    if (options[k]) {
      input = el("select");
      for (const v of options[k]) {
        const o = el(
          "option",
          v === "true" ? "Yes" : v === "false" ? "No" : human(v),
        );
        o.value = v;
        input.append(o);
      }
    } else {
      input = el("input");
      input.type =
        k.includes("date") || k === "dob"
          ? "date"
          : k === "copay"
            ? "number"
            : "text";
      if (k === "copay") {
        input.min = "0";
        input.step = "0.01";
        input.placeholder = "Unknown";
      }
    }
    input.id = prefix + k;
    if (prefix === "q-") input.required = true;
    label.append(input);
    $(container).append(label);
  }
}
inputFields(queryKeys, "query-fields", "q-");
inputFields(assessmentKeys, "assessment-fields", "a-");
function fillQuery() {
  const fields = queryFields();
  for (const k of queryKeys) $("q-" + k).value = fields[k];
  notice(
    "Inquiry fields copied from the current chart. Review them before sending.",
  );
}
function cleanDoc(d) {
  const v = structuredClone(d);
  delete v.source_digest;
  return v;
}
function canonical(v) {
  const sort = (x) =>
    Array.isArray(x)
      ? x.map(sort)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, sort(x[k])]),
          )
        : x;
  return JSON.stringify(sort(v));
}
async function sha(v) {
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
async function evidence() {
  const out = {};
  for (const [k, v] of Object.entries({
    ...obs.source_documents,
    response: obs.payer_response,
  })) {
    const d = cleanDoc(v);
    out[k] = { id: d.id, version: d.version, digest: await sha(d) };
  }
  return out;
}
function fillAssessment() {
  if (!obs.payer_response) return;
  const f = suggestAssessment(obs.source_documents, obs.payer_response);
  f.copay = f.copay === null ? "" : f.copay;
  f.authorization_required =
    f.authorization_required === null
      ? "unknown"
      : String(f.authorization_required);
  for (const k of assessmentKeys) $("a-" + k).value = f[k];
  $("payment-guarantee").checked = false;
  notice(
    "Suggested values follow this response and the visible workflow rules. Review before saving.",
  );
}

async function start(k, tour = guided) {
  const previous = { currentCase, guided, token, obs };
  currentCase = k;
  guided = tour;
  token = "";
  obs = null;
  document.body.classList.add("starting-episode");
  let data;
  try {
    data = await api("reset", { case_key: k });
  } catch (error) {
    ({ currentCase, guided, token, obs } = previous);
    render();
    throw error;
  } finally {
    document.body.classList.remove("starting-episode");
  }
  token = data.token;
  obs = data.observation;
  $("queue-view").hidden = true;
  $("case-view").hidden = false;
  $("guided").checked = guided;
  chartRole = "patient";
  page("worklist");
  queryKeys.forEach((k) => ($("q-" + k).value = ""));
  assessmentKeys.forEach(
    (k) => ($("a-" + k).value = k === "copay" ? "" : options[k]?.[0] || ""),
  );
  $("payment-guarantee").checked = false;
  render();
  notice("New episode started. The chart, inquiry and result have been reset.");
}
document.getElementById("work-rows").addEventListener("click", (e) => {
  const b = e.target.closest("[data-case]");
  if (b) run(() => start(b.dataset.case, false));
});
$("reset-case").onclick = () => run(() => start(currentCase));
$("back-queue").onclick = () => {
  $("case-view").hidden = true;
  $("queue-view").hidden = false;
};
$("tour-start").onclick = $("queue-tour").onclick = () =>
  run(() => start("A", true));
$("demo-try").onclick = () =>
  run(() => start($("demo-scenario").value || "A", true));
$("guided").onchange = () => {
  guided = $("guided").checked;
  renderGuide();
};
$("prefill-query").onclick = fillQuery;
$("prefill-assessment").onclick = fillAssessment;
$("query-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const request = Object.fromEntries(
      queryKeys.map((k) => [k, $("q-" + k).value]),
    );
    await api("step", {
      type: "query",
      request,
      idempotency_key: "inquiry-" + obs.episode_id,
    });
    notice("Inquiry sent. Check the payer response to continue.");
  });
};
$("poll").onclick = () =>
  run(async () => {
    await api("step", { type: "poll" });
    notice(
      "Payer response received. Confirm member identity before using the benefits.",
    );
  });
$("assessment-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const q = queryFields();
    delete q.dob;
    delete q.last_name;
    const fields = { ...q };
    for (const k of assessmentKeys) {
      let v = $("a-" + k).value;
      if (k === "copay") v = v === "" ? null : Number(v);
      if (k === "authorization_required")
        v = v === "unknown" ? null : v === "true";
      fields[k] = v;
    }
    fields.payment_guaranteed = $("payment-guarantee").checked;
    await api("step", {
      type: "assess",
      assessment: { fields, evidence: await evidence() },
    });
    notice(
      "Assessment prepared with source fingerprints. Save the eligibility record when ready.",
    );
  });
};
$("save").onclick = () =>
  run(async () => {
    await api("step", {
      type: "save",
      idempotency_key: "record-" + obs.episode_id,
    });
    notice(
      "Eligibility record saved. Finish the episode to see independent verification.",
    );
  });
$("finish").onclick = () =>
  run(async () => {
    await api("step", { type: "finish" });
    notice(
      obs.result.passed
        ? "Episode complete. Every required check passed."
        : "Episode complete. Review the failed checks, then start a new episode.",
      !obs.result.passed,
    );
    $("result").scrollIntoView({ behavior: "smooth", block: "center" });
  });
$("export").onclick = () =>
  run(async () => {
    const record = await api("export");
    const blob = new Blob([JSON.stringify(record, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = el("a");
    a.href = url;
    a.download = "ChartAuth_Episode_" + obs.episode_id.slice(0, 8) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });
document.querySelectorAll("[data-chart]").forEach(
  (b) =>
    (b.onclick = () =>
      run(async () => {
        chartRole = b.dataset.chart;
        renderChart();
        if (obs && !obs.terminated)
          await api("step", { type: "inspect", role: chartRole });
      })),
);
function field(container, label, value) {
  const d = el("dl", undefined, "chart-field");
  d.append(el("dt", label), el("dd", value));
  container.append(d);
}
function renderChart() {
  if (!obs) return;
  const pp = obs.source_documents.patient,
    vv = obs.source_documents.visit,
    cc = obs.source_documents.coverage;
  $("patient-name").textContent = pp.first_name + " " + pp.last_name;
  $("patient-avatar").textContent = pp.first_name[0] + pp.last_name[0];
  $("encounter-context").replaceChildren();
  for (const [k, v] of [
    ["Appointment", vv.service_date],
    ["Service", human(vv.service_type)],
    ["Practice", vv.provider_name],
    ["Location", vv.location],
    ["Member", cc.member_id],
  ]) {
    const x = el("div");
    x.append(el("small", k), el("strong", v));
    $("encounter-context").append(x);
  }
  document
    .querySelectorAll("[data-chart]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.chart === chartRole),
    );
  const d = obs.source_documents[chartRole],
    c = $("chart-content");
  c.replaceChildren();
  const layouts = {
    patient: [
      ["Full name", d.first_name + " " + d.last_name],
      ["Patient ID", d.id],
      ["Date of birth", d.dob],
      ["Sex field", d.sex],
      ["Record", d.synthetic ? "Fictional patient" : "Source record"],
    ],
    coverage: [
      ["Plan", d.plan_name],
      ["Member ID", d.member_id],
      ["Payer", d.payer_id],
      ["Relationship", human(d.subscriber_relationship)],
      ["Card received", d.card_received],
      ["Current check", human(d.verification_status)],
    ],
    visit: [
      ["Service", human(d.service_type)],
      ["Date", d.service_date],
      ["Provider", d.provider_name],
      ["Provider ID", d.provider_id],
      ["Location", d.location],
      ["Visit reason", d.reason],
    ],
  };
  if (chartRole === "policy") {
    field(c, "Workflow rules", d.id);
    const ul = el("ol", undefined, "policy-list");
    d.rules.forEach((t) => ul.append(el("li", t)));
    c.append(ul);
  } else layouts[chartRole].forEach((x) => field(c, ...x));
  $("chart-json").textContent = JSON.stringify(d, null, 2);
}
function renderResponse() {
  const c = $("response-content"),
    r = obs.payer_response;
  c.replaceChildren();
  if (!r) {
    c.className = "empty-state";
    c.append(
      el("span", "↔", "empty-symbol"),
      el(
        "strong",
        obs.inquiries.length
          ? "Inquiry sent. Response pending."
          : "Waiting for an inquiry",
      ),
      el(
        "p",
        obs.inquiries.length
          ? "Select Check response to retrieve the simulated payer reply."
          : "The response will appear here, with a transaction reference.",
      ),
    );
    return;
  }
  c.className = "response-data";
  const q = queryFields(),
    mismatch =
      r.member_id !== q.member_id ||
      r.patient_id !== q.patient_id ||
      r.lookup_status !== "matched";
  const scopeMismatch =
    r.service_date !== q.service_date ||
    r.payer_id !== q.payer_id ||
    r.provider_id !== q.provider_id ||
    r.service_type !== q.service_type;
  const coverageKnown =
    r.coverage_status === "active" || r.coverage_status === "inactive";
  const status = mismatch
    ? "Identity needs review"
    : scopeMismatch
      ? "Response scope needs review"
      : !coverageKnown
        ? "Coverage unknown"
        : r.coverage_status === "inactive"
          ? "Inactive coverage"
          : "Active coverage";
  const title = el("div", undefined, "response-title");
  title.append(
    el(
      "strong",
      status,
      "badge " +
        (mismatch || scopeMismatch || r.coverage_status !== "active"
          ? "warn"
          : "good"),
    ),
    el("span", r.id),
  );
  c.append(title);
  const grid = el("div", undefined, "response-grid");
  for (const [k, v] of [
    ["Member returned", r.member_id],
    ["Date of service", r.service_date],
    ["Network", human(r.network_status)],
    ["Copay returned", r.copay == null ? "Unknown" : "$" + r.copay],
    [
      "Authorization",
      r.authorization_required === null
        ? "Unknown"
        : r.authorization_required
          ? "Required"
          : "Not required",
    ],
    ["Payer", r.payer_id],
  ]) {
    const box = el("div");
    box.append(el("small", k), el("strong", v));
    grid.append(box);
  }
  c.append(grid);
  if (!mismatch && scopeMismatch)
    c.append(
      el(
        "div",
        "The response does not match this visit’s payer, provider, service or date. Request a corrected response before using benefits.",
        "response-warning",
      ),
    );
  if (mismatch)
    c.append(
      el(
        "div",
        "The response member does not match this chart, or the lookup did not match. Do not use these benefit values.",
        "response-warning",
      ),
    );
  else if (r.coverage_status === "inactive")
    c.append(
      el(
        "div",
        "Coverage is inactive for the requested service date. Benefit values returned with the response are not a usable benefit confirmation.",
        "response-warning",
      ),
    );
  else if (!coverageKnown)
    c.append(
      el(
        "div",
        "Coverage has not been confirmed. Keep usable benefits unknown and ask the benefits team to clarify coverage.",
        "response-warning",
      ),
    );
  c.append(
    el(
      "p",
      "Eligibility does not guarantee payment. Authorization is a separate workflow.",
      "response-note",
    ),
  );
  const details = el("details", undefined, "raw");
  details.append(
    el("summary", "Transaction and source response"),
    el("pre", JSON.stringify(r, null, 2)),
  );
  c.append(details);
}
function renderGuide() {
  if (!obs) return;
  $("guide-banner").hidden = !guided;
  let text = "",
    label = "",
    fn;
  if (obs.terminated) {
    text =
      "The verifier has graded the saved record. Compare another scenario or start again with one deliberately wrong field.";
    label = "Open worklist";
    fn = () => {
      $("case-view").hidden = true;
      $("queue-view").hidden = false;
    };
  } else if (!obs.inquiries.length) {
    text =
      "Begin with " +
      obs.source_documents.patient.first_name +
      "’s chart. Copy the member and service fields, review them, then send the inquiry.";
    label = "Fill inquiry fields";
    fn = fillQuery;
  } else if (!obs.payer_response) {
    text =
      "The inquiry has a transaction ID. Retrieve the current payer response before documenting benefits.";
    label = "Check response";
    fn = () => $("poll").click();
  } else if (!obs.assessment) {
    text =
      "Compare the returned member to the chart. Use the response to draft the result, then prepare the assessment.";
    label = "Use response values";
    fn = fillAssessment;
  } else if (!obs.records.length) {
    text =
      "The prepared assessment includes source fingerprints. Save one record with the result and responsible next team.";
    label = "Save record";
    fn = () => $("save").click();
  } else {
    text =
      "The record is saved. Finish the episode to check patient binding, source evidence and transaction history.";
    label = "Finish and verify";
    fn = () => $("finish").click();
  }
  $("guide-text").textContent = text;
  $("guide-next").textContent = label;
  $("guide-next").onclick = fn;
}
function renderButtons() {
  if (!obs) return;
  const closed = obs.terminated;
  for (const id of ["prefill-query", "send-query"])
    $(id).disabled = busy || closed || !!obs.inquiries.length;
  queryKeys.forEach(
    (k) => ($("q-" + k).disabled = closed || !!obs.inquiries.length),
  );
  $("poll").disabled = busy || closed || !obs.inquiries.length;
  $("prefill-assessment").disabled = $("prepare").disabled =
    busy || closed || !obs.payer_response || !!obs.records.length;
  assessmentKeys.forEach(
    (k) =>
      ($("a-" + k).disabled =
        closed || !obs.payer_response || !!obs.records.length),
  );
  $("payment-guarantee").disabled =
    closed || !obs.payer_response || !!obs.records.length;
  $("save").disabled =
    busy || closed || !obs.assessment || !!obs.records.length;
  $("finish").disabled = busy || closed || !obs.records.length;
  $("reset-case").disabled = busy;
  $("guide-next").disabled = busy;
}
const eventLabels = {
  chart_opened: "Chart section reviewed",
  inquiry_created: "Eligibility inquiry sent",
  response_received: "Payer response received",
  assessment_drafted: "Assessment prepared",
  record_saved: "Eligibility record saved",
  episode_finished: "Verification requested",
  invalid_action: "Action rejected",
  prohibited_action: "Action outside workflow",
};
function render() {
  if (!obs) return;
  const d = obs.source_documents;
  $("case-title").textContent = "Scenario " + currentCase + " / Eligibility";
  $("patient-line").textContent =
    "DOB " +
    d.patient.dob +
    " · " +
    d.patient.id +
    " · " +
    d.coverage.plan_name +
    " · " +
    human(d.visit.service_type) +
    " " +
    d.visit.service_date;
  $("status-label").textContent = obs.terminated
    ? obs.result?.passed
      ? "Verified completion"
      : "Review failed checks"
    : human(obs.status);
  $("episode-short").textContent = "Episode " + obs.episode_id.slice(0, 8);
  $("action-count").textContent = obs.action_count + " / 40 actions";
  const stage = obs.records.length
    ? 4
    : obs.payer_response
      ? 3
      : obs.inquiries.length
        ? 2
        : 1;
  document.querySelectorAll("[data-stage]").forEach((d) => {
    const n = Number(d.dataset.stage);
    d.classList.toggle("current", stage === n);
    d.classList.toggle(
      "done",
      stage > n || (obs.terminated && obs.result?.passed),
    );
  });
  $("query-state").textContent = obs.inquiries.length
    ? "INQ · " +
      obs.inquiries[0].inquiry_id.slice(-8) +
      " · " +
      human(obs.inquiries[0].status)
    : "No inquiry sent";
  $("assessment-state").textContent = obs.assessment
    ? "Assessment prepared"
    : "No assessment prepared";
  $("evidence-status").textContent = obs.assessment
    ? "5 source references attached to this assessment."
    : "Source references attach when you prepare the assessment.";
  renderChart();
  renderResponse();
  $("events").replaceChildren();
  const start = el("li", "Episode started");
  start.append(el("small", "Clean chart snapshot"));
  $("events").append(start);
  for (const e of obs.events) {
    const li = el("li", eventLabels[e.type] || human(e.type));
    li.append(
      el(
        "small",
        e.role
          ? human(e.role)
          : new Date(e.at).toISOString().slice(11, 19) + " UTC",
      ),
    );
    $("events").append(li);
  }
  $("saved-record").hidden = !obs.records.length;
  if (obs.records.length) {
    $("saved-record").replaceChildren(
      el("strong", "Record saved"),
      el("span", obs.records[0].record_id),
      el("p", "Next team: " + human(obs.assessment.fields.next_owner)),
    );
  }
  $("result").hidden = !obs.result;
  if (obs.result) {
    const r = obs.result;
    $("result").replaceChildren(
      el(
        "div",
        r.passed ? "Completion verified" : "Verification failed",
        "result-head" + (r.passed ? "" : " failed"),
      ),
      el(
        "p",
        "Reward " +
          r.reward +
          " · " +
          Object.values(r.checks).filter(Boolean).length +
          "/" +
          Object.keys(r.checks).length +
          " checks",
      ),
    );
    for (const [k, v] of Object.entries(r.checks)) {
      const row = el("div", undefined, "check-row" + (v ? "" : " fail"));
      row.append(el("span", v ? "✓" : "×"), el("div", human(k)));
      $("result").append(row);
    }
  }
  renderGuide();
  renderButtons();
}
setInterval(() => {
  if (obs) {
    const s = Math.min(
      600,
      Math.max(0, Math.floor((Date.now() - obs.started_at) / 1000)),
    );
    $("elapsed").textContent =
      String(Math.floor(s / 60)).padStart(2, "0") +
      ":" +
      String(s % 60).padStart(2, "0");
  }
}, 1000);
const probes = [
  {
    n: 4,
    gold: [0, 1, 2, 3],
    reward: 1,
    p: 1,
    desc: "The intended output contains exactly the four eligible IDs.",
    note: "All four retained IDs are eligible.",
  },
  {
    n: 50,
    gold: [0, 1, 2, 3],
    reward: 1,
    p: 0.08,
    desc: "The evaluator accepts 46 incorrect predictions alongside the four correct IDs.",
    note: "Full reward despite 8% precision. All four gold IDs remain inside the first 50.",
  },
  {
    n: 301,
    gold: [0, 1, 2, 3],
    reward: 1,
    p: 4 / 301,
    desc: "Returning every candidate passes if the four gold IDs occur early enough.",
    note: "All 301 retained IDs appear below. Reward depends on the first 50 positions.",
  },
  {
    n: 301,
    gold: [297, 298, 299, 300],
    reward: 0,
    p: 4 / 301,
    desc: "The same set loses credit when the four eligible IDs appear after position 50.",
    note: "Ordering changes the reward even though overall precision is unchanged.",
  },
  {
    n: 4,
    gold: [0, 1, 2, 3],
    reward: 1,
    p: 1,
    desc: "Negated sentences still yield the four IDs because the parser extracts their identifier pattern.",
    note: "A sentence saying a trial is not eligible can still contribute a prediction.",
  },
  {
    n: 4,
    gold: [0, 1, 2, 3],
    reward: 1,
    p: 1,
    desc: "One hundred unknown IDs disappear before the evaluator computes precision.",
    note: "Four retained predictions remain. The 100 discarded IDs are not drawn.",
  },
];
function probe() {
  const p = probes[Number($("probe").value)];
  $("probe-explanation").textContent = p.desc;
  $("probe-reward").textContent = p.reward;
  $("probe-precision").textContent =
    (p.p * 100).toFixed(p.p === 1 ? 0 : 1) + "%";
  $("probe-count").textContent = p.n + " retained IDs";
  $("rank-note").textContent = p.note;
  $("id-grid").replaceChildren();
  for (let i = 0; i < p.n; i++) {
    const z = el("i", undefined, p.gold.includes(i) ? "gold" : "");
    z.title =
      "Position " +
      (i + 1) +
      ": " +
      (p.gold.includes(i) ? "eligible" : "incorrect");
    $("id-grid").append(z);
  }
}
$("probe").onchange = probe;
probe();
function cost() {
  const a = Number($("author-min").value),
    y = Number($("yield").value) / 100;
  const mature = costMode === "mature",
    other = mature ? 46.25 : 86.25,
    minutes = mature ? 35 : 65,
    compute = mature ? 3 : 5;
  const labor = a * 0.75 + other;
  $("author-value").textContent = a;
  $("yield-value").textContent = Math.round(y * 100) + "%";
  $("cost-total").textContent = "$" + ((labor + compute) / y).toFixed(2);
  $("cost-breakdown").textContent =
    "Labor per candidate: $" +
    labor.toFixed(2) +
    " · Compute: $" +
    compute +
    " · Accepted labor: " +
    ((a + minutes) / 60 / y).toFixed(2) +
    " hours";
}
function costSet(m) {
  costMode = m;
  $("author-min").value = m === "start" ? 60 : 25;
  $("yield").value = m === "start" ? 85 : 95;
  $("cost-start").classList.toggle("active", m === "start");
  $("cost-mature").classList.toggle("active", m === "mature");
  cost();
}
$("cost-start").onclick = () => costSet("start");
$("cost-mature").onclick = () => costSet("mature");
$("author-min").oninput = $("yield").oninput = cost;
cost();
restoreRoute();
