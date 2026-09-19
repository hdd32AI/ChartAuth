<div align="center">
<img src="web/assets/ChartAuth_Share.jpg" alt="ChartAuth" width="620">

# ChartAuth

Eligibility and authorization readiness

[Read the specification](SPEC.md) · [Three-page submission](docs/ChartAuth_Submission.pdf) · [Task contract](tasks/eligibility-verification/task.json)

</div>

ChartAuth is a specification for a verifiable healthcare administrative environment, supported by an audit of a published non-imaging task, a reward-exploit analysis and a runnable eligibility workflow. The implementation and website demonstrate the specified behavior.

The environment includes **three reference episodes**, **1,000 fictional visits** across 50 templates, ten operating conditions and five service types, **15 terminal checks** and **84 tests**. Each of the 50 templates has a defined assessment and handoff. Tests cover all 1,000 visits and reject a critical unsupported claim for every template. The fictional rules still need specialist validation; the public examples are not a held-out dataset.

## Specification

| Part | Document                                                      | What it covers                                                                                                                           |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [Environment review](docs/benchmark-review.md)                | Observations, actions, state, hidden information, reset, termination and evaluation; comparison with MedAgentBench and HealthAdminBench. |
| 2    | [Reward exploits](docs/reward-exploits.md)                    | Reproducible evaluator probes, why they pass or fail, where to fix them and what each fix can break.                                     |
| 3    | [Eligibility task specification](SPEC.md#objective-and-scope) | Mock-EHR choice, episode contract, reward, evidence, provenance, human review, production costs and scaling.                             |

The [three-page submission](docs/ChartAuth_Submission.pdf) is the concise reading version. The documents above and the task contract provide the inspectable specification; executable examples and tests check the implemented subset.

## Supporting material

| If you want to understand                  | Open                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| The task, verifier and production process  | **[Environment specification](SPEC.md)**                                  |
| The machine-readable task contract         | [Eligibility verification](tasks/eligibility-verification/task.json)      |
| The reasoning in plain English             | [Hursh’s Notes on ChartAuth](docs/hurshs-notes.md) — 30 chapters          |
| Three complete reference episodes          | [Reference episodes](examples/)                                           |
| The scoring gap in the published benchmark | [Evaluator audit](reference/benchmark_audit/)                             |
| What changes and how it is checked         | [Environment](core/environment.mjs) and [tests](tests/)                   |
| The economics and assumptions              | [Business-case formulas](core/economics.mjs) and the workspace calculator |
| Primary research and vendor context        | [Source register](docs/research-sources.json)                             |
| Tools, models and brand attribution        | [Technology disclosure](docs/technology.md)                               |

## What the sample demonstrates

- Active coverage with the correct member records the returned benefits and routes authorization to the next team.
- Inactive coverage records a coverage issue and asks registration for updated insurance.
- A member mismatch keeps coverage and benefits unknown and routes identity resolution to registration.
- Seven further operating conditions cover authorization not required, out-of-network benefits, unknown authorization, missing cost share, date mismatch, payer mismatch and unknown coverage. Each changes the supported assessment or next action.

Success requires the patient, visit, payer response, source references and saved record to agree. Eligibility does not grant authorization or guarantee payment. The records and payer rules are fictional; there is no live EHR or payer connection.

## Run locally

Use Node.js 22 or later. The application has no installed runtime dependencies.

```sh
npm test
npm start
```

Open `http://localhost:4173`. The local server uses an open development view and in-memory episodes. The hosted workspace adds password access and database-backed sessions. No hosted password or private service credential is included.

To reproduce the benchmark probes, use Python 3:

```sh
python3 reference/benchmark_audit/reproduce.py
```

Reference episode timestamps use a fixed simulation clock, independent of the export time.

The benchmark audit uses synthetic IDs against the pinned upstream evaluator. It is not a clinical accuracy measurement or a run of the full benchmark harness. The upstream license is retained beside that evaluator.

## Repository map

| Folder                       | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `tasks/`                     | Machine-readable task definition and entry point                          |
| `docs/`                      | Plain-English notes and primary sources                                   |
| `core/`                      | Episode contract, fictional records and economic formulas                 |
| `examples/`                  | Filled reference episodes and export script                               |
| `tests/`                     | Critical mutations, reset isolation, inventory and formula checks         |
| `web/`                       | Worklist, guided demo, research reader, financial model and access screen |
| `server/`                    | Local server, hosted adapter, protected views and database migrations     |
| `reference/benchmark_audit/` | Pinned evaluator, reproduction script and upstream license                |

## Hosted access and deployment

See the [deployment guide](docs/deployment.md) for the standalone frontend and API setup.

The hosted adapter uses a password hash stored in a protected configuration table, expiring access tokens and separate episode capabilities. Password attempts are limited globally for this small private demonstration. This may temporarily limit other visitors after repeated failed attempts. It is not a production tenant-identity system.

Apply the three SQL files in `server/`, configure the access hash outside source control, and deploy `server/edge.ts` with its imported modules. The service role stays server-side. The browser configuration contains only the public platform key. The frontend must use an allowed origin. The source package intentionally documents the fictional cases; private evaluation cases require a separate split and access boundary.

## Before training

Specialist reference review, stale and ambiguous cases, private case-family splits, an actual sandbox audit and a 50-episode review/cost pilot remain next steps. Cost and ROI outputs are planning assumptions, not measured savings. Hashes establish integrity, not truth.
