# Reproduce the benchmark scoring audit

This directory contains the HealthAgentBench Task 19 evaluator and a small, deterministic probe script. It supports [the environment review](../../docs/benchmark-review.md) and [the training-signal audit](../../docs/reward-exploits.md).

## Run

From the ChartAuth repository root, with Python 3.9 or later:

```bash
python3 reference/benchmark_audit/reproduce.py
```

The script uses only the Python standard library. No model credentials, network access, patient records or benchmark harness are required. It creates temporary synthetic pool, gold and submission files, invokes the evaluator, prints JSON results and removes those temporary files when finished.

## Expected results

| Probe name              | Reward | Retained IDs | Retained precision | Discarded IDs |
| ----------------------- | ------ | ------------ | ------------------ | ------------- |
| `exact_gold`            | 1      | 4            | 100%               | 0             |
| `50_picks_with_4_gold`  | 1      | 50           | 8%                 | 0             |
| `whole_pool_gold_first` | 1      | 301          | 1.3289%            | 0             |
| `whole_pool_gold_last`  | 0      | 301          | 1.3289%            | 0             |
| `negative_statements`   | 1      | 4            | 100%               | 0             |
| `gold_plus_out_of_pool` | 1      | 4            | 100%               | 100           |

The script asserts the six rewards. The printed metrics make the false-positive and filtering effects inspectable. The exact-gold input is a positive control; the gold-last input is an ordering control. Six probes do not mean six independently discovered exploits.

## Scope of the evidence

The synthetic fixture mirrors the inspected task’s counts: 301 pool IDs and four gold IDs. Its identifiers are placeholders, not clinical trial labels copied from the patient case. The results demonstrate what the parser and acceptance rule allow. They do not establish agent performance, medical correctness, label completeness, sandbox access or a successful full-harness run.

The benchmark evaluator is separate from ChartAuth’s [eligibility environment](../../core/environment.mjs) and [tests](../../tests/). Passing ChartAuth tests does not repair the benchmark or prove production readiness.

## Files and attribution

| File                                                         | Purpose                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [harbor_evaluator.py](harbor_evaluator.py)                   | Copied upstream evaluator; retained for reproducible inspection of the active scoring rule. |
| [reproduce.py](reproduce.py)                                 | Constructs and scores the six controlled inputs.                                            |
| [LICENSE_HealthAgentBench.txt](LICENSE_HealthAgentBench.txt) | Upstream license retained with the copied evaluator.                                        |

Upstream source: [Microsoft HealthAgentBench, Task 19 evaluator](https://github.com/microsoft/HealthAgentBench/blob/bcbb8085fd549469e2dc7455f4bfd68a1b98895a/tasks/clinical_trial_matching_task_19/tests/harbor_evaluator.py), pinned at commit `bcbb8085fd549469e2dc7455f4bfd68a1b98895a`.

The active implementation accepts full top-50 recall. Its unused precision constant and precision-related return description are not the executed reward condition. Proposed changes are explained in the audit rather than applied to this reference copy.
