# Enforcement Spec (V1)

Purpose: describe what is enforced, where it is enforced (runtime and CI), and how deterministic SURFACE/SUPPRESS behavior is guaranteed. This is a spec only; no code changes are introduced here.

## Inputs (approved contracts)
- `docs/contracts/FluencyTracr_V1_Phase1_Event_Contract.md`
- `docs/contracts/FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md`

## What is enforced
1) Event contract conformance (Phase 1)
- Event names, required fields, closed enums, ambiguity rules.

2) Signal evaluation contract conformance (Phase 2)
- Deterministic SURFACE/SUPPRESS decision.
- Ambiguity precedence.
- Windowing, adjacency, cohort size, and confidence gating.
- Exactly one internal `SUPP_*` diagnostic on an internal SUPPRESS candidate;
  no internal reason code on SURFACE. Product-facing SUPPRESS verdicts use only
  the canonical five suppression reasons.

3) Non-negotiables
- No new metrics, no content capture, no individual attribution, no rankings.

## Where enforced
### Runtime enforcement (request handling and evaluation)
These are the locations to enforce or extend enforcement without changing contract logic:
- `backend/src/app.ts` (ingest endpoints and evaluation responses)
- `backend/src/middleware/schemaVersionMiddleware.ts` (schema version gate)
- `backend/src/middleware/forbiddenFieldsMiddleware.ts` and `backend/src/validation/forbiddenFields.ts` (no content or identifiers)
- `shared/src/fluencyTracrSchemas.ts` (event schema validation for ingest payloads)
- `schemas/ft_v1_*_observed.schema.json` (JSON Schema validation if used for V1 payloads)
- `backend/src/suppression.ts` (suppression mechanics and k-thresholds)
- `backend/src/inference/*` (evaluation pipeline behavior and confidence gating)

### CI enforcement (build and test)
- `.github/workflows/ci.yml`
- `.github/workflows/test.yml`
- `scripts/` (location for contract validation scripts, if added)
- `backend/tests/` (invariant and property tests for SURFACE/SUPPRESS)

## Hard failure conditions
### Build/CI failures
- Any schema/event name non-conformance with Phase 1 or Phase 2 contracts.
- Any violation of ambiguity precedence or reason-code invariants.
- Any surfacing when window length is 30-59 days.
- Any presence of reason codes on SURFACE decisions.

### Runtime/evaluation failures (must SUPPRESS)
- Ambiguity present in input or derived evidence.
- Low confidence or insufficient coverage as defined by Phase 2.
- Missing required windowing/cohort inputs.

## Deterministic order of operations (summary)
1) Validate schema version header.
2) Validate event payload against Phase 1 contract (required fields, enums, no extra fields).
3) Enforce forbidden fields and privacy constraints (no content, no identifiers).
4) Apply ambiguity rule: ambiguity_flag true => SUPPRESS with ambiguity reason; takes precedence over all other logic.
5) Compute window length and adjacency; enforce window gating.
6) Apply cohort size gate (privacy suppression).
7) Apply confidence gating as defined in Phase 2.
8) Emit a binary decision only: SURFACE or SUPPRESS.
9) If an internal candidate is SUPPRESS, retain exactly one internal diagnostic;
   if SURFACE, retain none. Never relay `SUPP_*` through a product boundary.

## Explicit statement of constraints
- No new metrics are introduced by this spec.
- No content is stored, inspected, or derived.
- No individual attribution is permitted.
