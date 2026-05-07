# Glean Claim Registry

Schema version: `GCR_2026_05`

## Purpose

The Glean Claim Registry is the contract that determines which Glean customer value claims may be evaluated, which evidence lanes each claim requires, which inputs are forbidden, and which language modes may be used when surfacing the result.

It is intentionally separate from the Glean Value Evidence Pack:

- **Claim Registry**: defines reusable claim templates and evaluation rules.
- **Claim Evaluation Set**: records the evaluated state for one organization and window.
- **Value Evidence Pack**: packages evaluated claim readiness with coverage, lifecycle, assumption, and instrumentation evidence.

## Claim templates

Each template includes:

- `claim_id`
- `claim_type`
- description
- required and optional evidence lanes
- required Glean surfaces
- forbidden input classes
- minimum aggregation scope
- allowed language modes
- safe language template when customer-safe language is permitted
- deterministic suppression reasons
- review owner

Allowed claim types are:

- `time_saved`
- `roi`
- `payback`
- `surface_coverage`
- `skill_reuse`
- `agent_completion`
- `automation_deflection`
- `artifact_creation`
- `governed_action`
- `control_effectiveness`

## Evaluation states

Each evaluated claim uses:

- `evaluation_state`: `surface` or `suppress`
- `evidence_state`: `present`, `missing`, `suppressed`, `not_computed`, or `not_safe_to_claim`
- `readiness_state`: `customer_safe`, `customer_safe_with_caveats`, `internal_only`, `not_computed`, or `suppressed`
- `language_mode`: `executive_safe`, `customer_safe_with_caveats`, `internal_only`, or `suppressed`

Suppressed, not-computed, missing, or not-safe claims must not include approved customer-safe language.

## Required top-level shapes

Registry:

```json
{
  "schema_version": "GCR_2026_05",
  "registry_id": "glean-default-value-claims",
  "generated_at": "2026-05-07T00:00:00.000Z",
  "source_system": "FluencyTracr",
  "claim_templates": []
}
```

Evaluation set:

```json
{
  "schema_version": "GCR_2026_05",
  "registry_id": "glean-default-value-claims",
  "org_id": "org-northstar",
  "window": "weekly",
  "evaluated_at": "2026-05-07T00:00:00.000Z",
  "source_system": "Glean",
  "evaluations": []
}
```

See `examples/default-claim-registry.json` and `examples/org-northstar-claim-evaluations.json` for complete valid payloads.

Runtime validation lives in `shared/src/gleanClaimRegistrySchemas.ts` and is exported through `@learnaire/shared`.

## Privacy boundary

The registry must not permit claim templates that depend on:

- direct identifiers
- raw prompts or raw responses
- transcripts or query text
- tool payloads or file content
- team ranking
- productivity scoring
- hidden reconstruction of suppressed values

These are represented as `forbidden_inputs` so unsafe requirements remain explicit and machine-checkable.

## Relationship to the Value Evidence Pack

Claim evaluation records are the source of the Value Evidence Pack `claim_readiness` section. The pack should only surface language that is allowed by the corresponding claim template and current evaluation state.

Use registry-aware validation, not only structural validation, before converting evaluations into pack claim readiness records. Registry-aware validation confirms:

- the evaluation set `registry_id` matches the registry
- every evaluated `claim_id` exists in the registry
- `claim_type` matches the registered template
- language mode is allowed by the template
- surfaceable evaluations include all required lanes
- suppressed evaluations use reasons allowed by the template
