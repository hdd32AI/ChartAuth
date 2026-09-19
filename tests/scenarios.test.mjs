import test from "node:test";
import assert from "node:assert/strict";
import {
  fixtures,
  expectedInquiry,
  expectedFields,
} from "../core/fixtures.mjs";
import { reset, step, evidenceFor } from "../core/environment.mjs";
import { suggestAssessment } from "../web/suggestions.js";
const paths = [
  [
    "CW0001",
    "verified",
    "authorization_team",
    "start_prior_authorization",
    "active",
    0,
    true,
  ],
  [
    "CW0006",
    "verified",
    "scheduling",
    "confirm_visit_readiness",
    "active",
    0,
    false,
  ],
  [
    "CW0011",
    "benefit_review",
    "benefits_team",
    "review_network_options",
    "active",
    0,
    true,
  ],
  [
    "CW0016",
    "benefit_review",
    "authorization_team",
    "clarify_authorization",
    "active",
    0,
    null,
  ],
  [
    "CW0021",
    "benefit_review",
    "benefits_team",
    "request_cost_share",
    "active",
    null,
    true,
  ],
  [
    "CW0026",
    "coverage_issue",
    "registration",
    "request_updated_coverage",
    "inactive",
    null,
    null,
  ],
  [
    "CW0031",
    "identity_review",
    "registration",
    "resolve_member_identity",
    "unknown",
    null,
    null,
  ],
  [
    "CW0036",
    "response_review",
    "benefits_team",
    "request_corrected_response",
    "unknown",
    null,
    null,
  ],
  [
    "CW0041",
    "response_review",
    "benefits_team",
    "request_corrected_response",
    "unknown",
    null,
    null,
  ],
  [
    "CW0046",
    "benefit_review",
    "benefits_team",
    "clarify_coverage",
    "unknown",
    null,
    null,
  ],
];
for (const [key, disposition, owner, action, coverage, copay, auth] of paths)
  test(key + " follows its explicit handoff and usable benefits", () => {
    for (const f of [
      expectedFields(fixtures[key]),
      suggestAssessment(fixtures[key].records, fixtures[key].payer_response),
    ])
      assert.deepEqual(
        [
          f.disposition,
          f.next_owner,
          f.next_action,
          f.coverage_status,
          f.copay,
          f.authorization_required,
        ],
        [disposition, owner, action, coverage, copay, auth],
      );
  });
test("all 50 templates reject a saved payment guarantee even with valid sources", async () => {
  for (let i = 1; i <= 50; i++) {
    const key = "CW" + String(i).padStart(4, "0");
    let s = reset(key);
    s = (
      await step(s, {
        type: "query",
        request: expectedInquiry(s.source_documents),
        idempotency_key: "mutation-inquiry",
      })
    ).session;
    s = (await step(s, { type: "poll" })).session;
    const fields = expectedFields(s.reference);
    fields.payment_guaranteed = true;
    s = (
      await step(s, {
        type: "assess",
        assessment: { fields, evidence: await evidenceFor(s) },
      })
    ).session;
    s = (await step(s, { type: "save", idempotency_key: "mutation-record" }))
      .session;
    s = (await step(s, { type: "finish" })).session;
    assert.equal(s.result.reward, 0, key);
    assert.equal(s.result.checks.assessment_fields, false, key);
  }
});
