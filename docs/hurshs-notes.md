# Hursh’s Notes on ChartAuth

## 01 The work I want the score to recognize

I started with a practical question: what would convince another person that an eligibility check was actually completed? A confident sentence would not be enough. I would want to know which patient was checked, which visit the answer applied to, where the benefits came from, and whether the result was saved somewhere the next person could use it.

That question shaped ChartAuth. It is a small healthcare operations environment with a visible chart, a simulated payer exchange and a verifier that inspects the completed work. The result can be a supported benefit confirmation or a specific unresolved issue. Either can be correct when it follows the evidence.

I have kept the scope deliberately narrow. The records and benefit rules are fictional. The sample does not connect to a live EHR or payer, establish clinical reliability, or show a trained system’s accuracy. It makes a workflow contract concrete enough to inspect, run and challenge.

The useful distinction is between an answer that sounds finished and a record that another person can safely continue working from. I use that distinction throughout the design.

## 02 Why eligibility is a useful starting point

Eligibility sits close to everyday practice operations. Someone is scheduled for care. The practice has an insurance card. Before the visit, staff need to establish what the payer says about coverage for that person, service and date. An old card or a previous result may provide context, but the current work item still needs a current response under the sample’s rules.

I chose this workflow because the output can be bounded. The agent is not being asked to diagnose a condition or select treatment. It must interpret a limited payer response, preserve uncertainty and hand off the next administrative action.

The workflow also exposes meaningful failure cases without requiring a large clinical simulation. An active response can belong to the wrong member. Inactive coverage can arrive alongside benefit fields that should not be treated as usable confirmation. Both cases test whether the system understands the relationship between facts, rather than merely copying a favorable value.

Eligibility is not authorization, and neither one guarantees final payment. Keeping those boundaries explicit prevents the environment from rewarding an overstatement.

## 03 The connection to healthcare practice and supervised learning

Flagler’s public materials describe practice operations and specialty-care workflows. Alaska’s public materials emphasize learning through supervised healthcare cases. I see a natural connection between those themes: training examples should reflect work that a practice can recognize, and the quality of supervision should be visible in the way those examples are checked.

ChartAuth is my interpretation of that connection. I have not verified either organization’s internal architecture, contracts, data access or evaluation process. The relationship is conceptual, not an integration or endorsement.

A realistic-looking chart alone would not establish the connection. The task also needs the small operational details that change the outcome: the correct service date, a transaction tied to one inquiry, an unresolved status when identity does not match, and a responsible team for the next step.

Likewise, supervised examples need more than labels. Someone has to decide whether the reference is supported, record disagreements and keep unsuitable cases out of release. That production process is part of the environment design, not an administrative afterthought.

My longer-term goal is to support timely access and better coordination around the patient. Reliable eligibility work could reduce avoidable handoffs and uncertainty for clinicians and staff. This is relevant to value-based care, but it does not prove improved outcomes or lower total cost of care. A future pilot should measure delayed visits, exception resolution and staff effort alongside financial results, without turning coverage status into a clinical decision.

## 04 What I inspected in HealthAgentBench

I selected clinical trial matching Task 19 from HealthAgentBench. It is a clinical-document task with a patient note and a set of candidate trial descriptions. The inspected case has 301 candidate trials and four eligible identifiers. The instruction asks for eligible trials and excludes the others.

I read the task instruction, environment configuration, bootstrap and evaluator at the pinned repository version. This was static inspection. I did not run the complete benchmark harness or make a claim about an agent’s ability to interpret the patient’s clinical eligibility.

I then used controlled synthetic identifiers to exercise the unchanged evaluator. That lets me isolate what the parser and scoring rule accept. It does not validate the clinical reference, show that an agent could discover the answers, or establish that a suspected access-control weakness is reachable from the agent container.

Keeping those evidence types separate matters. A demonstrated scoring behavior deserves a concrete finding. A possible leakage route deserves a test plan. Combining them would make the audit sound stronger while making it less reliable.

## 05 What the agent sees and can change

In the inspected trial task, the patient note, topic and trial XML are staged in the workspace. The agent can use terminal actions to read documents, run scripts and create the requested output file. Files and processes can change during the attempt. The data mount is writable in the inspected configuration.

There is no modeled care transaction in this task. The output is a list of trial identifiers, not an order, referral or saved eligibility record. That distinction affects what success can prove. A correct output file says something about a matching result; it does not prove an operational handoff occurred.

The gold labels and grader are intended to be separate from the agent service. I treat that as an intended boundary, not a completed security finding. A real isolation check would need to inspect the running sandbox, its mounts, accessible paths and network permissions.

The general lesson I carry into ChartAuth is to name the state explicitly. If saving work matters, there must be a saved record for the verifier to inspect. A message saying “saved” should not be the only evidence.

## 06 How an attempt starts and ends

The inspected benchmark bootstrap stages the inputs. Its configuration allows 3,600 seconds for the agent and 300 seconds for grading. Those are configuration values. Because I did not run the full harness, I do not treat them as observed timing or verified reset behavior.

For ChartAuth, an episode starts with an independent identifier and a fresh copy of the source records. There is no inquiry, payer response, assessment or saved result yet. The source documents are visible through the observation. The expected answer remains server-side.

The agent can finish the attempt, and the environment also enforces a forty-action limit and a ten-minute limit. The hosted storage session has its own expiry; that storage limit is separate from the task’s episode budget.

I want termination to be a property of the environment rather than something an agent can narrate into existence. Once the attempt ends, further task actions are rejected. A fresh attempt requires a reset, which also prevents an old saved receipt from becoming evidence for a new episode.

## 07 Benchmark and reinforcement learning environment

A benchmark is a way to compare results on a defined set of tasks. A reinforcement learning environment supplies observations, actions, state transitions and rewards through repeated attempts. These descriptions can apply to the same underlying system.

I therefore describe the inspected task as a benchmark implemented through a reward-bearing episodic environment. A built-in trainer is not required for that description, and a sparse terminal reward does not prevent reinforcement learning.

The harder question is whether the environment is ready to train against. Before doing that, I would qualify reset integrity, termination, reward isolation and label leakage. I would also connect the interface to a rollout loop and preserve a private evaluation split. Those steps make the environment usable for training; they do not automatically make its reward clinically meaningful.

ChartAuth similarly exposes a task contract without claiming a training result. A user can inspect the source, perform actions and receive a score. Whether optimization against that score produces useful behavior would need a separate experiment with independently reviewed cases and a clear evaluation protocol.

## 08 The active scoring rule

The benchmark’s parser identifies trial IDs, removes duplicates and drops identifiers outside the candidate pool. The success condition asks whether all four gold IDs appear in the first fifty retained predictions. If they do, reward is one. Otherwise it is zero.

The evaluator also reports precision and other information, but those reported quantities do not gate the active binary reward. That is the important detail. Reading a metric’s name or seeing a precision-related constant in a file is not enough; the audit has to follow the condition that actually decides success.

The instruction asks for the eligible trials without the ineligible ones. The active reward can accept a much broader list. This creates a gap between the written task and what the score reinforces.

I would resolve that gap before adding more elaborate supervision. The acceptance rule should reflect the intended deliverable, with an explicit decision about how to handle an incomplete or disputed clinical reference. A strict set check is easy to implement but can still be wrong when its gold labels are wrong.

## 09 Full credit with four correct choices out of fifty

The clearest probe submits four gold IDs followed by forty-six incorrect IDs from the candidate pool. All four gold IDs remain in the first fifty, so reward is one. Precision is four divided by fifty, or eight percent.

This is not a claim that a clinical system achieved eight percent accuracy. It is a controlled result from a scoring function using synthetic identifiers. The point is that the reward accepts a submission with many incorrect retained choices.

A second probe submits all 301 candidates with the gold IDs first. It also receives reward one, while full-list precision falls to four divided by 301, about 1.33 percent. Moving those four IDs to the end changes reward to zero even though the full list still contains the same choices.

That ordering result is useful because it isolates the cutoff. The score changes because of where the correct IDs appear, not because the total set has become more precise. It tells me exactly which part of the acceptance logic needs review.

## 10 Negated text and unknown identifiers

Two other probes examine the parser rather than clinical reasoning. In one, a gold identifier appears inside a sentence saying that the trial is ineligible. The parser still finds the identifier and counts it as a prediction. It is not interpreting the sentence’s meaning.

In another, the four gold IDs are accompanied by one hundred unknown IDs. Those unknown IDs are removed before scoring, so they do not reduce retained-list precision or prevent success.

These behaviors suggest narrow repairs. I would accept only the documented output format and reject unknown IDs against a versioned candidate pool. The repairs should be tested with ordinary valid submissions as well as adversarial inputs, because strict formatting can introduce unnecessary failures.

Neither repair solves unsupported reasoning. A perfectly formatted list may still have been guessed or copied. That is why parsing, acceptance and evidence grounding need separate treatment. Each layer should solve the failure it can actually observe, instead of relying on one broad judge to infer everything from the final prose.

## 11 Correct answers without supported reasoning

An identifier-only evaluator cannot tell whether the answer followed from the source record. Correct identifiers can pass without criterion-level evidence because evidence is not part of the contract. I describe that as accepted by construction, rather than pretending to have measured the quality of a generated clinical explanation.

For a richer trial task, I would ask for relevant facts tied to specific inclusion and exclusion criteria. The verifier could check that a cited source exists and that the cited version belongs to the current case. A reviewer or calibrated rubric would still need to assess whether the fact supports the conclusion.

This matters in ChartAuth too. Five valid source references are not proof that a person interpreted them correctly. The sample checks exact structured fields under narrow fictional rules. If the task later includes free-text summaries or ambiguous chart interpretation, the evidence contract and review process must expand with it.

I would avoid rewarding length or confidence in a narrative. A shorter, supported handoff is more useful than a detailed explanation that quietly turns an unknown into a fact.

## 12 Leakage and the limits of a public demonstration

The inspected benchmark enables internet access, and its task materials are public. That creates a possible route to retrieving answers rather than doing the intended matching work. I have not demonstrated that route from the actual agent sandbox.

My proposed response has two parts. First, test the running permissions boundary: mounts, grader files, credentials and reachable network resources. Second, use private held-out case families for claims about generalization. Restricting access can help protect labels, but it can also block resources a legitimate task needs.

ChartAuth’s public source contains its fictional rules and reference cases so that visitors can inspect the design. That transparency is useful for a demonstration. It also means the public inventory is unsuitable for a held-out accuracy claim. A system could memorize the fifty scenario templates or infer the generated pattern.

I would split related cases together when building a private dataset. Renaming a patient or changing an identifier does not create an independent evaluation example. A meaningful split has to account for shared source records, templates and decision rules.

## 13 What the contrasting projects add

MedAgentBench is useful as a contrasting structured-EHR design. It encourages me to inspect the relationship between an action response and persisted state. In the pinned interaction branch I read, POST parses JSON and reports success without issuing an HTTP POST in that branch. Separately supplied reference checks were not inspected, so I do not generalize that observation to every task or validation path.

HealthAdminBench provides a different perspective through browser-based administrative workflows and a combination of exact checks and judgment rubrics. The useful design question is which claims can be established from state and which require interpretation.

I am not ranking the three projects. I did not run the same system across them or reproduce their reported performance. I used them to inspect different contracts: document matching, structured interaction and administrative workflow evaluation.

The resulting principle is practical. An acknowledgment is evidence that a tool replied. A saved record is evidence that a state changed. A reviewed reference establishes what that state should mean. These are related, but they are not interchangeable.

## 14 The mock EHR choice

I used a ModMed-style specialty-practice arrangement because the task begins with a chart, coverage information and a scheduled outpatient visit. Physical therapy after a knee-related visit makes the administrative context easy to understand without turning the sample into a clinical decision tool.

The interface is an independent interpretation. It is not a copy of the vendor’s product, an integration, or a claim that a live ModMed installation exposes these exact actions. I have not used vendor credentials or real patient data.

The chart pane separates the patient, coverage card, visit and workflow rules. The task pane handles the inquiry, payer response and assessment. The activity pane keeps the transaction sequence and saved result visible. Those divisions correspond to what the user needs to compare, rather than merely adding visual complexity.

If a team later adopted another EHR, I would keep the eligibility contract stable and adapt the observation and action mapping. The adapter would still need its own checks for identity, dates, persistence and audit events. A shared screen layout is not evidence of shared semantics.

## 15 The expanded worklist

The worklist contains one thousand fictional visits. Each visit has its own patient and member identifiers, appointment date and independent episode on opening. Visitors can search by patient or identifier and filter by scenario and clinic.

The inventory uses fifty explicit scenario templates: ten operating conditions across five service types, with twenty bound visits per template. Conditions include required or unnecessary authorization, out-of-network benefits, missing authorization or cost share, inactive or unknown coverage, and member, payer or service-date mismatches. Each template has an expected assessment and next owner. These fictional cases have executable checks; specialist adjudication and clinical validation remain future work.

I keep scenario labels visible in the reviewer worklist so a visitor can deliberately compare the ten operating conditions. A private evaluation interface would need to hide labels and remove predictable case-key patterns. The observation itself keeps the scenario response and expected answer server-side until the defined actions expose the response.

That separation is important to the presentation. The three reference examples explain the logic. The larger inventory adds service-specific benefit and response-scope variation. A future expert-reviewed dataset would serve a different purpose and require a separate release process.

## 16 Active coverage and the next responsible team

The first reference case returns active coverage for the correct member and service date. The fictional response includes an in-network status, a thirty-dollar copay and a requirement for authorization. The correct result records those facts and routes the next action to the authorization team.

The eligibility task ends with a supported record and handoff. It does not submit or obtain authorization. That next workflow has its own requirements, evidence and completion condition.

The example is useful because a superficially favorable answer can still overstate the outcome. Marking payment as guaranteed is unsupported. Treating active coverage as authorization approval is also unsupported. The UI lets a reviewer deliberately test an incorrect payment guarantee and see that the verifier rejects it.

I want the next team to receive a precise administrative fact: this payer response matches this visit, these benefits were returned, and authorization remains to be handled. That is a more useful operational outcome than a general success message that leaves responsibility unclear.

## 17 Inactive coverage is a completed finding

The second reference case changes only the coverage status in the payer response from active to inactive. The chart, member and visit stay the same. This isolates a single fact that should change the output.

Under the fictional rules, the correct result records a coverage issue and asks registration to obtain updated coverage. Returned copay, network and authorization values are not treated as usable benefit confirmation. They remain unknown in the assessment.

This is a completed task when the record and handoff are correct. The environment should not reward a system for forcing a favorable outcome merely because the word “success” suggests active coverage. The work was to establish the supported status and assign the appropriate next action.

I would preserve that distinction in a larger dataset. Negative, unresolved and escalated outcomes need well-defined completion conditions. Otherwise a training process may learn to avoid them, guess missing facts or prematurely close work items. A good task can finish with a clear reason that a downstream workflow cannot yet proceed.

## 18 A member mismatch changes what can be used

The third reference case changes only the member identifier returned by the payer. The response still contains active coverage and favorable benefit values, but it no longer matches the chart member.

The correct assessment keeps coverage and benefits unknown and routes identity resolution to registration. The agent can report that a response was received, but it cannot use someone else’s returned benefits as confirmation for this patient.

This case is the most compact explanation of the project’s design. A value can be present, correctly copied and still be inappropriate for the current task. The relationship between the value and the patient is part of correctness.

I would extend the same idea to stale dates, wrong providers, duplicate inquiries and responses from another episode. Each extension should change one decisive fact before adding more complicated combinations. That makes failures easier to diagnose and helps reviewers determine whether the verifier is testing the intended condition rather than an accidental feature of the example.

## 19 The action contract

The environment supports inspect, query, poll, assess, save and finish. Inspect opens a source record. Query creates an inquiry tied to the patient and service context. Poll retrieves the simulated response. Assess prepares the structured result and its evidence references. Save writes one record. Finish asks the verifier to grade the episode.

These actions have ordering constraints. An assessment cannot precede a response. A saved assessment is locked. Retrying the same inquiry or save transaction should return the existing result rather than create a duplicate. Reusing a transaction key with different content is rejected.

The contract also limits action fields and rejects unknown actions. That reduces ambiguity about what the agent is allowed to do. It does not constitute a full sandbox for an arbitrary autonomous system; the public sample exposes a bounded application interface.

I would document each new action before adding it. A realistic production environment needs to explain what the action changes, what proof it returns, how retries behave and what the verifier can observe afterward. Otherwise additional tools can create new shortcuts faster than they create useful work.

## 20 What the deterministic verifier can prove

The current verifier performs fifteen checks. They cover source integrity, episode limits, terminal state, forbidden actions, one inquiry, inquiry binding, response receipt, response binding, response integrity, assessment fields, evidence mapping, one saved record, record binding, disposition and event history.

The assessment has fourteen exact fields and five evidence references. Reward is one only when all required checks pass. A partially completed attempt does not receive a fractional success reward in this sample.

The narrow checks make specific failures inspectable. If a result belongs to another episode, the record binding should fail. If a source record changes, integrity should fail. If the final labels are right but no result was saved, the record check should fail.

These checks establish compliance with the fictional contract. They do not independently establish the truth of the clinical record or the appropriateness of a real payer policy. I would treat a deterministic verifier as a precise implementation of a reference, with reference quality remaining a separate responsibility.

## 21 Where judgment still belongs

The structured sample does not need a narrative judge. Exact fields can be compared with narrow source-derived rules. Adding a broad text judge would create another uncertain decision layer without solving the main task.

If the workflow later includes a written handoff, I would use a small rubric: unsupported, incomplete, or complete and supported. Review should focus on the claims made, the treatment of contradictions and whether the next team can act on the handoff. A judge should not override a failed patient-identity or transaction check.

A human eligibility specialist is still needed for ambiguous chart meaning, disputed labels and policy interpretation. An assisted review system could triage narrative or flag inconsistencies, but it would need calibration against reviewed examples and ongoing error analysis.

I would keep the decision authority explicit. Deterministic checks govern facts that can be established exactly. Rubric review handles bounded interpretation. Adjudication establishes or repairs the reference when reasonable reviewers disagree. This makes it easier to identify who owns a failure and which part of the system should change.

## 22 Provenance is more than a citation

Each source has an identifier, version and fingerprint. The assessment points back to the relevant source set, and the payer response is tied to the inquiry and episode. That gives the verifier a way to detect copied, stale or altered evidence within the sample.

A fingerprint establishes consistency with the stored content. It does not establish that the content is true. A source reference proves that a source was named; it does not prove that the source supports every claim in a narrative.

For production, I would keep the original authorized source snapshot, the transformation history and the field-level reference mapping. A reviewer should be able to trace a saved value back to the material that justified it and understand which rule was applied.

When a source or rule changes, I would version the affected reference and rerun the relevant checks. Quietly updating a document while keeping the old label would make the episode difficult to reproduce. Provenance is useful when it helps someone explain a result, not merely when it adds more identifiers to the record.

## 23 Before a real chart becomes a task

The current records are fictional. A real chart would require authorized use and a documented de-identification process before becoming a task. HHS describes Safe Harbor and Expert Determination as the two methods for de-identification under the relevant rule.

I would not treat a name replacement or date shift as sufficient. Free text, attachments, filenames and embedded identifiers need review, and any linkage keys should stay outside the agent-visible material. The process must account for the applicable method and the person qualified to review it.

The transformation can also change the task’s meaning. A shifted date can alter a coverage window or the ordering of events. Removing a detail can eliminate the very evidence the reference depends on. After transformation, the team must recheck relationships and expected outcomes rather than assuming the old labels remain valid.

This is both a data-access question and a quality question. I would retain a release gate that confirms the transformed source is permitted for use, internally coherent and still sufficient to solve the intended task. Unresolved records should remain out of the released dataset.

## 24 Who produces and checks an episode

An operations analyst prepares the episode, freezes the source snapshot and maps the proposed output to its evidence. Two reviewers then label the outcome independently, without seeing each other’s answers. Their disagreement is information about the case or rule, not simply a defect to average away.

An eligibility specialist adjudicates conflicts and records the rationale. If the case remains ambiguous or the source is insufficient, I would quarantine it. If a shared rule changes, related cases need review rather than only the disputed example.

Engineering owns schema checks, resets, transaction behavior and verifier regression tests. A privacy reviewer or appropriately qualified process owns real-chart transformation gates. These responsibilities should be clear even if one person fills more than one role in an early pilot.

Release requires a passing reference and failing critical mutations, along with source and privacy review. I would not release a case solely because two reviewers agree; they can agree on the same mistaken interpretation. The evidence mapping and adversarial checks provide additional, different ways to catch an error.

## 25 Measuring reviewer agreement

I would measure agreement before adjudication, because resolving disagreements first would hide how often they occurred. The pilot report should include raw agreement and a confusion matrix for disposition and critical fields, alongside Cohen’s kappa where it is defined.

Kappa adjusts for expected chance agreement, but it depends on the distribution of labels. A highly imbalanced sample can produce a confusing combination of high raw agreement and a lower kappa. A single-class sample can make kappa undefined. Those conditions should be reported, not converted into a reassuring number.

For a fifty-episode pilot, I propose targets of at least ninety-five percent raw agreement and kappa of at least 0.80. These are proposed gates, not measured results, and fifty cases would not establish reliability across every payer, EHR or specialty.

I would inspect disagreements by cause: missing evidence, unclear policy, reviewer interpretation or authoring error. The purpose is to improve the production process. A single aggregate agreement score would be much less useful if it concealed repeated errors in a critical minority scenario.

## 26 What a verified episode might cost

The cost model starts with candidate effort, then accounts for candidates that fail release. Initially, I assume sixty authoring minutes, twenty-five minutes for one reviewer, twenty for the other, ten for adjudication and ten for engineering support. That totals 125 minutes per candidate.

Hourly rates are planning inputs: forty-five dollars for authoring, seventy-five for each reviewer, one hundred for adjudication and eighty for engineering. Initial labor is therefore $131.25 per candidate. Adding five dollars of compute and dividing by an eighty-five percent accepted yield produces $160.29 per accepted episode. Accepted labor effort is about 2.45 hours.

These figures are not measured operating results or a vendor quote. Real-chart access, licensing, new integrations and other deployment-specific costs need separate estimates. I keep a six-thousand-dollar setup allocation separate; spread across five hundred accepted episodes, it adds twelve dollars each.

The yield adjustment matters because rejected work still consumes time. A model that reports only the cost of passing candidates would understate what the production process actually costs.

## 27 What should change after five hundred episodes

My later-state assumption reduces candidate effort to sixty minutes: twenty-five for authoring, fifteen and ten for the two reviewers, five for adjudication and five for engineering. Both reviewers remain in the process. The expected improvement comes from reusable authoring patterns, clearer rules and fewer avoidable defects.

At the same hourly rates, labor becomes sixty-five dollars. Adding three dollars of compute and dividing by ninety-five percent accepted yield produces $71.58 per accepted episode, or about 1.05 accepted labor hours. At only eighty-five percent yield, the same mature candidate cost rises to eighty dollars.

These are two planning points, not an observed learning curve or a forecast of the average cost of the first five hundred. The pilot should measure actual time by role, rework, rejection reasons and case difficulty before adopting the assumptions.

I would be cautious about reducing review effort just because output volume increased. If later cases are more ambiguous, the process may need more expert time. Cost per accepted episode should be considered alongside critical false passes and reference quality, rather than optimized in isolation.

## 28 The practice business case

There are two different economic questions. One is the cost of producing a verified training episode. The other is the value of a future deployed workflow to a practice. The website keeps those calculations separate.

For the practice model, I start with monthly checks, net minutes saved per check and loaded hourly labor cost. Multiplying those quantities gives the value of released capacity. I then apply a realization factor: the share of that capacity that can actually become avoided overtime, reduced external spending or another measurable economic benefit.

First-year net benefit subtracts recurring operating cost and implementation cost from realized benefit. First-year ROI divides that net benefit by total first-year cost. Simple payback divides implementation cost by positive monthly net benefit; when monthly net benefit is zero or negative, the model shows no payback.

All defaults are illustrative assumptions. Time saved must include review and exception handling. I do not add denial reduction, faster collections or recovered appointments without separate evidence, and I do not treat this demonstration as proof that any savings have occurred. A pilot should establish the baseline and realized change.

## 29 What breaks as the scope expands

Two hundred workflows across four EHRs can create up to eight hundred workflow/interface combinations before payer and specialty variation. That does not mean every combination should be supported. It means the team needs an explicit compatibility map and release criteria for the combinations it does support.

I would separate shared workflow rules from versioned adapters. A common eligibility rule should not be reimplemented independently in every interface, but each adapter still needs to prove that it reads and writes the intended fields and preserves the transaction evidence.

My expected constraints are policy maintenance, verifier changes and reviewer calibration. More authors can increase candidate output while making those constraints worse if references and rules drift. I would monitor adjudication queues, rejection causes and stale-version rates alongside throughput.

The one-thousand-visit worklist does not solve that scaling problem. It demonstrates interface and case-binding scale across ten operating conditions and five service types. The fifty templates broaden decisions, but expert review still has to confirm that each fictional rule is appropriate before replacing it with a real payer policy.

## 30 What I would do before training

I would first ask an eligibility specialist to review the three introductory reference examples, the fifty templates and their rules. Then I would add stale responses, ambiguous records, missing responses and contradictory evidence. Those cases should have explicit completion and escalation conditions before anyone trains against them.

Next, I would build a private case-family split and test the actual agent sandbox. Public examples are useful for explanation, but they cannot establish resistance to memorization or label retrieval. A training run would also need a documented rollout interface, reset checks and an evaluation protocol that stays separate from development.

The fifty-case production pilot would measure independent reviewer agreement, role-level time, yield and critical verifier errors. A separate practice pilot would measure baseline task time, exception burden and realized economic benefit. Neither result should be inferred from a working demo.

What makes ChartAuth useful is the connection between an operational requirement and an inspectable acceptance rule. The project gives a reviewer a specific patient, a specific response and a specific saved result to challenge. That is the starting point I would want before making broader claims about reliability, scale or financial value.

## Sources

- [HealthAgentBench task 19 instructions](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/instruction.md)
- [HealthAgentBench task 19 evaluator](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/tests/harbor_evaluator.py)
- [HealthAgentBench container mounts](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/environment/docker-compose.yaml)
- [HealthAgentBench task configuration](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/task.toml)
- [HealthAgentBench bootstrap](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/environment/bootstrap.sh)
- [MedAgentBench interaction implementation](https://github.com/stanfordmlgroup/MedAgentBench/blob/99260117137b09f04837a8c18d18a1107efa55ae/src/server/tasks/medagentbench/__init__.py)
- [HealthAdminBench research paper](https://arxiv.org/abs/2604.09937)
- [Flagler products and operating model](https://www.flaglerhealth.io/)
- [ModMed orthopedic EHR](https://www.modmed.com/specialties/orthopedics/)
- [HHS guidance on de identification](https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html)
- [Tau bench final state and repeated trial reliability](https://arxiv.org/abs/2406.12045)
- [HealthAdminBench repository and verification approach](https://github.com/som-shahlab/health-admin-bench)
- [MedAgentBench evaluator dispatch](https://github.com/stanfordmlgroup/MedAgentBench/blob/99260117137b09f04837a8c18d18a1107efa55ae/src/server/tasks/medagentbench/eval.py)
- [HealthAgentBench task 19 candidate pool](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/tests/pool_ncts.txt)
- [HealthAgentBench task 19 eligible labels](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/tests/gold.txt)
- [HealthAgentBench task image definition](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/environment/Dockerfile)
- [HealthAgentBench trial staging and cache handling](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/environment/fetch_trials.py)
- [CMS eligibility inquiry and response](https://www.cms.gov/priorities/key-initiatives/burden-reduction/administrative-simplification/transactions/health-plan-eligibility-benefit-inquiry-response)
- [ModMed practice management and eligibility](https://www.modmed.com/what-we-do/practice-management/)
- [ModMed eligibility workflow demonstration](https://www.modmed.com/resources/videos/derm-wow-insurance-eligibility-video)
- [Alaska supervised healthcare case learning](https://www.alaskalabs.ai/)
- [DataSpring powered by CAQH 2025 Index overview](https://www.dataspring.com/advisory-services/index-report)
- [CMS explanation of value-based care](https://www.cms.gov/priorities/innovation/key-concepts/value-based-care)
