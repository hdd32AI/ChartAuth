import test from "node:test";
import assert from "node:assert/strict";
import {
  worklist,
  fixtures,
  expectedInquiry,
  expectedFields,
} from "../core/fixtures.mjs";
import { reset, step, evidenceFor } from "../core/environment.mjs";
import { businessCase } from "../core/economics.mjs";
test("inventory has 1000 distinct bound patients and balanced scenario families", () => {
  assert.equal(worklist.length, 1000);
  for (const key of ["case_key", "patient_id", "member_id"])
    assert.equal(new Set(worklist.map((x) => x[key])).size, 1000);
  assert.equal(new Set(worklist.map((x) => x.scenario)).size, 50);
  assert.equal(new Set(worklist.map((x) => x.scenario_family)).size, 10);
  assert.ok(
    [...new Set(worklist.map((x) => x.scenario))].every(
      (k) => worklist.filter((x) => x.scenario === k).length === 20,
    ),
  );
  for (const x of worklist) {
    const f = fixtures[x.case_key];
    assert.equal(f.records.patient.id, x.patient_id);
    assert.equal(f.records.coverage.member_id, x.member_id);
    assert.equal(f.records.visit.service_date, x.service_date);
  }
});
test("every generated visit completes under its own source-derived contract", async () => {
  for (const x of worklist) {
    let s = reset(x.case_key);
    for (const a of [
      {
        type: "query",
        request: expectedInquiry(s.source_documents),
        idempotency_key: "inventory-inquiry",
      },
      { type: "poll" },
    ])
      s = (await step(s, a)).session;
    s = (
      await step(s, {
        type: "assess",
        assessment: {
          fields: expectedFields(s.reference),
          evidence: await evidenceFor(s),
        },
      })
    ).session;
    s = (await step(s, { type: "save", idempotency_key: "inventory-record" }))
      .session;
    s = (await step(s, { type: "finish" })).session;
    assert.equal(s.result.reward, 1, x.case_key);
  }
});
test("business case handles baseline, no savings and zero cost without fabricated ROI", () => {
  const input = {
    volume: 1000,
    minutes: 5,
    rate: 35,
    realization: 70,
    monthlyCost: 1000,
    setupCost: 6000,
  };
  const r = businessCase(input);
  assert.ok(Math.abs(r.net - 6500) < 1e-8);
  assert.ok(Math.abs(r.roi - 6500 / 18000) < 1e-8);
  assert.ok(Math.abs(r.payback - 5.76) < 1e-8);
  const none = businessCase({ ...input, minutes: 0 });
  assert.equal(none.payback, null);
  assert.equal(none.net, -18000);
  assert.equal(
    businessCase({ ...input, monthlyCost: 0, setupCost: 0 }).roi,
    null,
  );
  assert.throws(() => businessCase({ ...input, realization: 101 }));
});
