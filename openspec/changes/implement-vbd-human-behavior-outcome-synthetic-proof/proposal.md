# Change: Implement VBD Human-Behavior Outcome Synthetic Proof

## Why

The docs-only VBD joint methodology now defines the human-behavior pathway,
aggregate contract, estimands, and claim ceiling. Steps 5 through 8 require a
bounded synthetic implementation and validation path before any integration
decision can be made. The implementation must not depend on the held legacy
frequency, engagement, and Breadth trajectory or create a product runtime.

## Human Approval

James Kelley approved proceeding with steps 5 through 8 on 2026-08-11.
This proposal interprets that approval as:

5. implement internal aggregate types, deterministic preparation, and
   synthetic family-state fixtures;
6. implement the synthetic joint Bayesian model and sanitized internal
   summaries;
7. run bounded synthetic recovery, calibration, sensitivity, negative-control,
   and predictive validation; and
8. record a docs-only integration decision.

The approval does not include real or customer data, production schemas,
services, APIs, persistence, UI, deployment, or customer-facing output.

## Queue Gate

Repository governance requires a human-authored queue item before high-risk
implementation. James Kelley explicitly directed Codex to add the exact row on
2026-08-11. The matching item now exists as the sole `in_progress` queue item,
so the synthetic-only implementation bound is active.

Requested queue item:

```json
{
  "id": "vbd-human-behavior-outcome-synthetic-proof",
  "title": "VBD human-behavior and outcome synthetic proof",
  "bound": "Synthetic-only inference/ plus required OpenSpec/docs/status: implement strict aggregate family-state, capability, outcome, alignment, and freeze types; deterministic preparation and single-slice synthetic fixtures; a joint Bayesian family-state and continuous-normal outcome model; sanitized internal summaries; bounded recovery, calibration, sensitivity, negative-control, and full-versus-restricted predictive validation; then record a docs-only integration decision. No real/customer/live data, cross-slice derived output, public schema, route, service, UI, persistence, connector, export, deployment, customer output, confidence/probability output, causal impact, productivity, ROI, ranking, new canonical event, new suppression reason, tunable product threshold, Depth likelihood use, or legacy VBD relabeling.",
  "status": "pending",
  "risk": "high"
}
```

The row was added only after the human's explicit direction and retains the
exact approved bound.

## What Changes After Queue Admission

- Add strict internal Python types for the frozen analysis plan, one-slice VBD
  checkpoints and transitions, stated capability, continuous-normal outcomes,
  safe aggregate controls, and exact alignment receipts.
- Add deterministic preparation that rejects missing, stale, suppressed,
  incomparable, post-outcome-edited, algebraically duplicated, or unsafe data.
- Add synthetic fixtures with one exact canonical slice and one disjoint family
  registry per panel. No family or derived metric crosses slices.
- Add a PyMC reference model with family-state transitions, capability
  measurement error, capability-to-behavior terms, lagged behavior-to-outcome
  terms, capability moderation, approved controls, and residual time structure.
- Add a deterministic or independently computed reference where feasible for
  structural and truth-recovery checks.
- Emit sanitized internal summaries only. Posterior draws and latent paths stay
  process-local and are never committed.
- Run bounded synthetic validation and record a docs-only integration decision.

## Privacy Resolution For The Synthetic Proof

The synthetic proof uses these compiled rules:

- each panel maps one-to-one to one exact
  `(workflow_id, jbtd_id, persona_id)` tuple;
- each panel has a disjoint opaque family registry and root;
- a family appears in exactly one panel and one registry;
- every panel carries independently clearing synthetic gate receipts;
- no held slice enters preparation or partial pooling;
- no cross-slice count, percentage, organization rollup, or per-slice model
  output is produced;
- model-level summaries contain only aggregate coefficients, uncertainty,
  diagnostics, and frozen comparison results; and
- all inputs are synthetic, aggregate-only, and contain no family IDs, member
  rows, user fields, prompts, outputs, transcripts, or raw events.

This resolves the synthetic proof boundary only. It does not resolve a future
real organization or multi-slice product design.

## Impact

- Proposed code: new isolated modules under
  `inference/src/fluencytracr_inference/`.
- Proposed tests: new focused modules under `inference/tests/`.
- Proposed docs and evidence: OpenSpec tasks, the methodology contract, and one
  future sanitized synthetic validation and decision artifact.
- Existing legacy VBD trajectory code: unchanged.
- Public runtime, shared schemas, backend, frontend, and deployment: unchanged.

## Non-Authorization

The queue gate is clear for only the synthetic implementation, validation, and
docs-only decision defined here. It never authorizes real data, product
integration, or customer-facing claims.
