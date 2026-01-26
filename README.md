# LearnAIR_Engable_Tool
This is a way to capture organizational signals on AI Fluency using passive data.

## Scope guardrails
This project intentionally rejects surveillance and scope creep. Please read and follow
the guardrails in [SCOPE_GUARDRAILS.md](SCOPE_GUARDRAILS.md) before proposing changes.

## FluencyTracr V1 — CODEX Schema Packet
This packet provides CODEX with the missing artifacts required to implement the V1 Event Contract and Phase 2 evaluation deterministically.

### Contents
- `FluencyTracr_V1_Event_Contract.md` — input contract summary (fields + canonical event names)
- `FluencyTracr_V1_Windowing_And_Cohort_Primitives.md` — adjacency, surfacing length, cohort_size inputs
- `schemas/` — JSON Schema Draft 2020-12 files:
  - `ft_v1_disposition_observed.schema.json`
  - `ft_v1_iteration_depth_observed.schema.json`
  - `ft_v1_verification_presence_observed.schema.json`
  - `ft_v1_recovery_observed.schema.json`
  - `ft_v1_latency_observed.schema.json`
  - `ft_v1_abandonment_observed.schema.json`
  - `ft_v1_evaluation_decision.schema.json` (internal-only output schema)

### Notes
- All schemas set `additionalProperties=false` and define required fields only.
- `ambiguity_reason_code` is required iff `ambiguity_flag=true`.
- Evaluation decision requires `suppress_reason_code` iff decision=SUPPRESS; forbidden otherwise.
