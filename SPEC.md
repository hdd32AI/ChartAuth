# ChartAuth specification

The specification has three parts:

1. [Environment review](docs/benchmark-review.md): the inspected non-imaging task and comparison with related benchmarks.
2. [Reward exploits](docs/reward-exploits.md): six evaluator probes, remediation locations and risks introduced by each fix.
3. [Proposed eligibility environment](#objective-and-scope): the full task and production specification below.

The [task manifest](tasks/eligibility-verification/task.json) provides the machine-readable contract. The [three-page submission](docs/ChartAuth_Submission.pdf) summarizes all three parts.

## Objective and scope

Complete an eligibility check for one scheduled visit. Use the patient chart and returned payer evidence to save a supported result, identify the responsible next team and finish the episode. A justified exception handoff can earn the same reward as a confirmed benefit result. Active coverage does not grant authorization, guarantee payment or establish that care is clinically appropriate.

The task surface is a specialty-practice pre-visit worklist with patient, coverage, visit and workflow-rule sections. This keeps the administrative decision concrete without requiring a clinical diagnosis or reproducing a commercial EHR. Records, benefits and payer rules are fictional. No live EHR or payer integration is present.

The [task manifest](tasks/eligibility-verification/task.json) describes the implemented contract. [Three reference episodes](examples/) supply complete actions and terminal observations. `core/environment.mjs` is the executable authority; `core/fixtures.mjs` owns case data and expected transformations. This is ChartAuth's native contract, not a compatibility claim with another benchmark's harness. The separate published-benchmark audit lives in `reference/benchmark_audit/`.

## Initial state and boundaries

Each reset creates a new episode ID, independent patient/coverage/visit/policy snapshots and a hidden payer-response fixture. The work item concerns eligibility and benefits for a specified outpatient service, provider and service date. The worklist spans physical therapy, occupational therapy, office visits, specialist consultations and diagnostic labs. Four source documents are visible immediately. The expected assessment, baseline source copies and payer response are server-owned. The response becomes visible only after an inquiry and a poll.

The three introductory physical-therapy cases use fictional policy `ELIG_DEMO_V1`. Case A is the baseline. Case B changes only the payer response's coverage status. Case C changes only its member ID. The 1,000 worklist visits use `ELIG_DEMO_V2`: 50 templates across ten operating conditions and five service types, with 20 bound visits per template. Both versions define explicit supported results and handoffs. These are fictional, inspectable fixtures, not a representative clinical population.

## Action contract

`reset(case_key)` initializes independent state. `observe(state)` exposes the episode ID, patient ID, policy version, start time, limits, action count, status, four source documents with source digests, inquiries, any released payer response, assessment, saved records and event history. It also reports termination, truncation and the terminal result. The reference fixture, expected-field transformation and idempotency map are absent from the observation. The public source still reveals fictional reference rules and cases; this is not a hidden evaluation dataset.

| Action  | Input                    | Effect and constraints                                                                                                           |
| ------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| inspect | role                     | Records review of patient, coverage, visit or policy. The returned observation continues to include all four visible documents.  |
| query   | request, idempotency_key | Creates one pending inquiry. Same-key, same-content retries reuse it. Changed content or a duplicate with a new key is rejected. |
| poll    | none                     | Returns the server's response for the inquiry. Repeated polls do not create another response event.                              |
| assess  | assessment               | Stages structured fields and evidence after a response exists. Saved assessments are immutable.                                  |
| save    | idempotency_key          | Persists exactly one record bound to this episode, inquiry and response. Same-key retries reuse the saved record.                |
| finish  | none                     | Terminates and computes all required checks.                                                                                     |

Unknown actions and extra action keys are rejected. Inquiry fields are patient_id, member_id, payer_id, provider_id, service_type, service_date, dob and last_name. Assessment fields are patient_id, member_id, payer_id, provider_id, service_type, service_date, coverage_status, network_status, copay, authorization_required, payment_guaranteed, disposition, next_owner and next_action.

Each inquiry value must be a nonempty string of at most 100 characters. Query and save keys contain 8–80 letters, digits, underscores or hyphens. A successful same-key retry with unchanged content returns the original output without adding another action or transaction. Most rejected attempts consume an action; a conflicting retry key does not. Unknown action types also leave a prohibited-action event that prevents reward. Assessment structure is checked on entry, while exact supported fields and evidence are checked at completion; accepting a draft does not certify it as correct.

Evidence contains five document references with ID, version and digest: patient, coverage, visit, policy and payer response. The reference transformation in `expectedFields` maps these records to the assessment. The payload does not contain field-level text-span citations. A later real-document pipeline needs such anchors and human validation of the transformation.

## Terminal verifier

Reward is 1 only when all fifteen checks pass; otherwise 0. Individual diagnostics never compensate for a wrong member or unsupported claim.

| Check                   | Required condition                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| source_integrity        | Visible source snapshots match their baseline digests.                                                                                                        |
| within_budget           | Episode remains within time and action budgets.                                                                                                               |
| finished                | The episode is terminated; budget checks separately reject truncation.                                                                                        |
| no_forbidden_actions    | No forbidden action appears in history.                                                                                                                       |
| one_inquiry             | Exactly one inquiry exists.                                                                                                                                   |
| inquiry_binding         | Every inquiry field matches the intended patient, coverage and visit.                                                                                         |
| payer_response_received | A response was obtained through the inquiry workflow.                                                                                                         |
| response_binding        | Response links to this episode, inquiry and exact request digest.                                                                                             |
| response_integrity      | Returned payer facts match the server fixture.                                                                                                                |
| assessment_fields       | Every required output value matches the supported transformation.                                                                                             |
| evidence_mapping        | All five evidence references match current source IDs, versions and digests.                                                                                  |
| one_saved_record        | Exactly one record was saved.                                                                                                                                 |
| record_binding          | Record matches the episode, patient and inquiry, with the current assessment digest. Response linkage is checked through the inquiry and assessment evidence. |
| correct_disposition     | The saved route and next action match the case.                                                                                                               |
| event_history           | One inquiry-created, response-received and record-saved event exists, with the saved record ID linked. Transition guards enforce the action sequence.         |

A finish without a response fails. The budget is 600 seconds and 40 counted actions. Finish may be the fortieth action and can succeed at the exact time limit. A fortieth nonterminal action truncates with zero reward; attempting another action after the time budget also truncates. Time is checked when an action is attempted, not by an autonomous server timer. Further actions after termination are rejected. Hosted infrastructure failures return an input error with null reward rather than pretending that the agent failed. IDs and timestamps vary across resets; supported outcomes and scoring rules remain fixed for a given fixture.

## Judgment and provenance

The executable sample scores structured data. No free-form narrative judge contributes to reward. If narrative is added, use an anchored rubric for support, contradictions and handoff usefulness: 0 wrong/unsupported, 1 incomplete, 2 supported and sufficient. An optional model judge may triage only after calibration against blinded experts and may not override a hard failure. Specialists adjudicate ambiguous meaning and policy interpretation.

Real-chart preparation requires authorized access and use, a documented de-identification approach, scanning of structured fields, text and attachments, consistent surrogate identities and dates, and a release review. The HHS Safe Harbor or Expert Determination requirements would govern the selected approach; substituting names or shifting dates alone does not establish de-identification. Transformations must preserve eligibility windows and event order, followed by fresh review of the expected result.

Retain the source-to-output evidence mapping in the restricted production system: source ID, version, retrieval time, transformation history, relevant field or text span, expected value and reviewer rationale. The sample implements document IDs, versions and digests; field-level span anchoring and human release review remain proposed. Hashes establish integrity of a snapshot, not clinical or administrative truth.

## Production pipeline and QC

An operations analyst drafts the episode with an eligibility specialist responsible for policy interpretation. Two independent reviewers label the outcome and supporting evidence without seeing one another's answers. A senior specialist adjudicates conflicts; unresolved or insufficiently supported cases are quarantined. An engineer checks schema validity, stable outcomes, reset isolation and adversarial verifier cases. A qualified privacy review governs any real-chart transformation. Release requires permitted/de-identified sources, coherent chronology, complete evidence, adjudicated reference labels and no unresolved critical defect.

For each candidate, freeze the source and rule versions, write the initial state and accepted outcome, run the intended trajectory, then run critical mutations such as wrong member, stale evidence or an unsupported payment guarantee. A changed policy or adjudication rule triggers review and replay of related cases. Version the released fixture, verifier and evidence map together. The executable sample covers the stated synthetic checks; this full human production process has not been run.

Measure raw agreement, category-specific disagreement, and Cohen's kappa for the two reviewers' categorical outcome labels. Inspect the confusion matrix and label prevalence alongside kappa. Reviewers reconcile with source evidence; unresolved differences go to a senior specialist. Update the rule and replay affected cases before release. Proposed pilot targets are at least 95% raw agreement and kappa of 0.80, subject to category prevalence, sample size and specialist review; no measured agreement is claimed here.

## Planning economics and scale

| Input                               | Initial | After 500 episodes |
| ----------------------------------- | ------: | -----------------: |
| Author minutes at $45/hour          |      60 |                 25 |
| Reviewer 1 minutes at $75/hour      |      25 |                 15 |
| Reviewer 2 minutes at $75/hour      |      20 |                 10 |
| Adjudication allowance at $100/hour |      10 |                  5 |
| Engineering/QC minutes at $80/hour  |      10 |                  5 |
| Labor per attempted episode         | $131.25 |             $65.00 |
| Compute per attempt                 |   $5.00 |              $3.00 |
| Acceptance yield                    |     85% |                95% |
| Hours per accepted episode          |    2.45 |               1.05 |
| Variable cost per accepted episode  | $160.29 |             $71.58 |

These are planning assumptions, not observed productivity. Accepted cost is (labor + compute) / acceptance yield. A separate $6,000 setup allocation over 500 accepted episodes adds $12 each. Adding $12 to either point estimate does not estimate the average cost of the first 500 episodes. At 85% mature acceptance yield, mature variable cost becomes $80.

Two hundred workflows across four EHRs imply up to 800 workflow–EHR combinations before payer and specialty variation. Versioned adapters, source semantics, reference-label maintenance and reviewer calibration become the first constraints. Use reusable workflow primitives, explicit adapter contracts and a risk-ranked combination matrix; do not assume identical UI semantics across vendors.

## Residual risks and next work

The public reference cases and 50 scenario templates can be memorized, and their generated visits do not constitute a private evaluation split. A correct value plus the required document digests does not prove the agent read or understood the source. A wrong reference label can cause the verifier to enforce the wrong answer. Overly strict matching may reject an equally correct route. Synthetic payer responses do not cover real transaction errors or vendor behavior. The hosted demo has no per-user login, tenant isolation or production clinical controls.

Before training: validate labels independently, add unseen case families and alternative valid outcomes, inject stale/mismatched/contradictory responses, measure false passes, and exercise concurrency and recovery at scale. Keep private reference labels separate from agent-visible records. Before broader EHR coverage: contract-test each adapter and measure production throughput rather than extrapolating these assumptions.

## Expanded scenario inventory

The three introductory counterfactual examples remain fixed. The worklist adds 50 explicit templates: ten operating conditions across five service types, with 20 independent visits per template. Conditions: authorization required, authorization not required, out of network, authorization unknown, cost share missing, inactive coverage, member mismatch, service-date mismatch, payer mismatch and unknown coverage. Service types: physical therapy, occupational therapy, office visit, specialist consultation and diagnostic lab.

Versioned fictional rules preserve known fields and route unresolved issues. Matching active in-network coverage without authorization goes to scheduling to confirm readiness; this is not a guarantee of payment. Network and cost-share questions go to benefits review. Missing authorization status goes to the authorization team. Misbound response scope keeps benefits unknown and requests a corrected response. An identity mismatch goes to registration. No clinical decision or live vendor integration is performed.

The 84-test suite includes explicit handoff expectations for ten conditions, all-visit completion, and critical rejection across all 50 templates. The worklist exposes scenario labels for exploration; a training evaluation must use private, unlabelled cases. The ten landing-page tours execute the same server contract.
