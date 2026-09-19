import test from "node:test";
import assert from "node:assert/strict";
import {
  reset,
  observe,
  step,
  score,
  evidenceFor,
  LIMITS,
} from "../core/environment.mjs";
import { expectedInquiry, expectedFields } from "../core/fixtures.mjs";
const T = 1800270000000;
async function action(s, a, n = 1) {
  return (await step(s, a, T + n)).session;
}
async function reviewed(k = "A") {
  let s = reset(k, T);
  s = await action(s, {
    type: "query",
    request: expectedInquiry(s.source_documents),
    idempotency_key: "query-001",
  });
  return action(s, { type: "poll" });
}
async function complete(k = "A", mutate) {
  let s = await reviewed(k);
  const fields = expectedFields(s.reference);
  if (mutate) mutate(fields);
  s = await action(s, {
    type: "assess",
    assessment: { fields, evidence: await evidenceFor(s) },
  });
  s = await action(s, { type: "save", idempotency_key: "record-001" });
  return action(s, { type: "finish" });
}
for (const k of ["A", "B", "C"]) {
  test(`${k}: intended workflow passes`, async () =>
    assert.equal((await complete(k)).result.reward, 1));
  for (const field of Object.keys(expectedFields(reset(k).reference)))
    test(`${k}: mutation of ${field} fails`, async () => {
      const s = await complete(k, (f) => {
        f[field] =
          typeof f[field] === "boolean"
            ? !f[field]
            : typeof f[field] === "number"
              ? f[field] + 1
              : "unsupported";
      });
      assert.equal(s.result.reward, 0);
      assert.ok(s.result.failed_checks.includes("assessment_fields"));
    });
}
test("reset isolates sessions", () => {
  const a = reset(),
    b = reset();
  a.source_documents.patient.last_name = "Changed";
  assert.notEqual(a.episode_id, b.episode_id);
  assert.equal(b.source_documents.patient.last_name, "Ellis");
});
test("observation hides payer response and reference before query", async () => {
  const o = await observe(reset());
  assert.equal(o.payer_response, null);
  assert.equal(o.result, null);
  assert.ok(!("reference" in o));
  assert.ok(!JSON.stringify(o).includes("SYN-R601"));
});
test("query acknowledgement is pending", async () => {
  const s = reset("A", T);
  const n = await action(s, {
    type: "query",
    request: expectedInquiry(s.source_documents),
    idempotency_key: "query-001",
  });
  assert.equal(n.status, "waiting");
  assert.equal(n.payer_response, null);
});
test("poll cannot create an unsolicited payer response", async () =>
  assert.equal((await step(reset("A", T), { type: "poll" }, T + 1)).code, 400));
test("finish before a response fails", async () =>
  assert.equal(
    (await action(reset("A", T), { type: "finish" })).result.reward,
    0,
  ));
test("matching cached coverage card is insufficient", async () =>
  assert.equal(
    (await action(reset("A", T), { type: "finish" })).result.checks
      .payer_response_received,
    false,
  ));
test("same inquiry retry creates one transaction", async () => {
  let s = reset("A", T);
  const a = {
    type: "query",
    request: expectedInquiry(s.source_documents),
    idempotency_key: "query-001",
  };
  s = await action(s, a);
  const r = await step(s, a, T + 2);
  assert.equal(r.output.replayed, true);
  assert.equal(r.session.inquiries.length, 1);
});
test("retry key cannot change inquiry content", async () => {
  let s = reset("A", T);
  const a = {
    type: "query",
    request: expectedInquiry(s.source_documents),
    idempotency_key: "query-001",
  };
  s = await action(s, a);
  a.request.member_id = "other";
  assert.equal((await step(s, a, T + 2)).code, 409);
});
test("new key cannot duplicate inquiry", async () => {
  let s = await reviewed();
  assert.equal(
    (
      await step(
        s,
        {
          type: "query",
          request: expectedInquiry(s.source_documents),
          idempotency_key: "query-002",
        },
        T + 3,
      )
    ).code,
    409,
  );
});
test("repeat poll preserves one response event", async () => {
  let s = await reviewed();
  s = await action(s, { type: "poll" });
  assert.equal(
    s.events.filter((e) => e.type === "response_received").length,
    1,
  );
});
test("assessment cannot precede response", async () =>
  assert.equal(
    (
      await step(
        reset("A", T),
        { type: "assess", assessment: { fields: {}, evidence: {} } },
        T + 1,
      )
    ).code,
    400,
  ));
test("unknown action is recorded and cannot earn credit", async () => {
  let s = await complete();
  s.terminated = false;
  s = await action(s, { type: "edit_source" });
  s = await action(s, { type: "finish" });
  assert.equal(s.result.checks.no_forbidden_actions, false);
});
test("source edits fail even if answer is correct", async () => {
  const s = await complete();
  s.source_documents.patient.last_name = "Changed";
  assert.equal((await score(s, T + 10)).checks.source_integrity, false);
});
test("forged payer response fails", async () => {
  const s = await complete();
  s.payer_response.copay = 0;
  assert.equal((await score(s, T + 10)).checks.response_integrity, false);
});
test("copied receipt from another episode fails", async () => {
  const a = await complete(),
    b = await complete();
  a.records[0] = b.records[0];
  assert.equal((await score(a, T + 10)).checks.record_binding, false);
});
test("missing evidence fails", async () => {
  let s = await reviewed();
  s = await action(s, {
    type: "assess",
    assessment: { fields: expectedFields(s.reference), evidence: {} },
  });
  s = await action(s, { type: "save", idempotency_key: "record-001" });
  s = await action(s, { type: "finish" });
  assert.equal(s.result.checks.evidence_mapping, false);
});
test("saved assessment cannot be edited", async () => {
  let s = await reviewed();
  s = await action(s, {
    type: "assess",
    assessment: {
      fields: expectedFields(s.reference),
      evidence: await evidenceFor(s),
    },
  });
  s = await action(s, { type: "save", idempotency_key: "record-001" });
  assert.equal(
    (await step(s, { type: "assess", assessment: s.assessment }, T + 4)).code,
    409,
  );
});
test("record retry is idempotent", async () => {
  let s = await reviewed();
  s = await action(s, {
    type: "assess",
    assessment: {
      fields: expectedFields(s.reference),
      evidence: await evidenceFor(s),
    },
  });
  const a = { type: "save", idempotency_key: "record-001" };
  s = await action(s, a);
  const r = await step(s, a, T + 4);
  assert.equal(r.output.replayed, true);
  assert.equal(r.session.records.length, 1);
});
test("time limit truncates with zero reward", async () => {
  const r = await step(reset("A", T), { type: "finish" }, T + 600001);
  assert.equal(r.session.truncated, true);
  assert.equal(r.session.result.reward, 0);
});
test("action limit is enforced", async () => {
  let s = reset("A", T);
  for (let i = 0; i < LIMITS.actions; i++)
    s = await action(s, { type: "inspect", role: "patient" });
  assert.equal(s.truncated, true);
  assert.equal(s.result.reward, 0);
});
test("completed episode rejects additional actions", async () =>
  assert.equal(
    (await step(await complete(), { type: "poll" }, T + 20)).code,
    409,
  ));
test("wrong member inquiry cannot be rescued by correct final labels", async () => {
  let s = reset("A", T);
  s = await action(s, {
    type: "query",
    request: { ...expectedInquiry(s.source_documents), member_id: "wrong" },
    idempotency_key: "query-001",
  });
  s = await action(s, { type: "poll" });
  s = await action(s, {
    type: "assess",
    assessment: {
      fields: expectedFields(s.reference),
      evidence: await evidenceFor(s),
    },
  });
  s = await action(s, { type: "save", idempotency_key: "record-001" });
  s = await action(s, { type: "finish" });
  assert.equal(s.result.reward, 0);
  assert.equal(s.result.checks.inquiry_binding, false);
});
test("prototype names cannot bypass action allowlist", async () =>
  assert.equal(
    (await step(reset("A", T), { type: "constructor" }, T + 1)).code,
    400,
  ));
test("extra action fields are rejected", async () =>
  assert.equal(
    (await step(reset("A", T), { type: "poll", reward: 1 }, T + 1)).code,
    400,
  ));
test("unknown case is rejected", () => assert.throws(() => reset("unknown")));
