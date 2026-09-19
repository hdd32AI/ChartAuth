# Eligibility verification

Complete one visit's eligibility check using the patient chart, a current simulated payer response and a saved result with supporting evidence. Correct exception handling is a successful outcome when the response cannot support a benefit confirmation.

- [Task manifest](task.json): native machine-readable contract and inventory.
- [Full specification](../../SPEC.md): verifier, judgment boundaries, production process and economics.
- [Environment](../../core/environment.mjs): reset, observation, actions and terminal scoring.
- [Fixtures](../../core/fixtures.mjs): three introductory cases and 50 generated scenario templates.
- [Reference trajectories](../../examples/): complete action sequences and terminal observations.

Run `npm test` from the repository root. The core suite checks the intended workflows, critical failure cases and all 1,000 generated visits. The manifest describes the current implementation; it is not an adapter for a third-party evaluation harness. Synthetic rules require specialist validation before any real-world use.
