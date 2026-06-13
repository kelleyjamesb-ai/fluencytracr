# Glean Value Evidence Pack

Schema version: `GVE_2026_05`

## Purpose

The Glean Value Evidence Pack is an org-window scoped contract for deciding which Glean customer value claims are supported by evidence, which are directional, which depend on assumptions, and which are not safe to claim.

It is designed for QBR, renewal, executive, procurement, and governance workflows where Glean value needs to be defensible without turning FluencyTracr into a productivity tracker or ROI oracle.

The pack answers:

- Which Glean value surfaces are covered?
- Which Skills and Agent lifecycle signals are available?
- Which MCP/action, artifact, and control signals are governed and observable?
- Which assumptions materially affect value language?
- Which claims are customer-safe, internal-only, suppressed, or not computed?
- What must be instrumented next to strengthen the value story?

## Non-goals

The Value Evidence Pack does not:

- certify financial ROI as ground truth
- rank users, teams, managers, departments, or roles
- expose raw prompts, responses, transcripts, query text, tool payloads, or file content
- infer hidden values from missing, suppressed, or not-computed signals
- replace EvidenceBundle v1

## Evidence posture

The top-level `value_posture` uses one of:

- `validated`: sufficient aggregate evidence and approved assumptions for customer-safe language.
- `directional`: useful signal exists, but caveats are required.
- `assumption_heavy`: assumptions dominate the claim.
- `coverage_limited`: material Glean surfaces are not covered.
- `internal_only`: useful for Glean or operator review, not customer-facing.
- `not_computed`: required inputs are not mapped or verified.
- `suppressed`: governance, safety, or privacy rules prevent surfacing.

## Evidence lanes

Allowed evidence lanes are:

- `surface_usage`
- `skill_lifecycle`
- `agent_lifecycle`
- `mcp_action_boundary`
- `artifact_output`
- `control_evidence`
- `assumptions`

Each lane reports an evidence state:

- `present`
- `not_present`
- `suppressed`
- `not_computed`

## Required top-level fields

Every pack must include:

- `schema_version`
- `org_id`
- `window`
- `generated_at`
- `source_system`
- `value_posture`
- `executive_summary`
- `coverage_lanes` with at least one lane
- `skill_lifecycle`
- `agent_lifecycle`
- `mcp_action_boundary`
- `artifact_outputs`
- `control_evidence`
- `assumptions`
- `claim_readiness` with at least one claim
- `next_instrumentation_actions`

See `examples/org-northstar-value-pack.json` for a complete valid payload.

Runtime validation lives in `shared/src/gleanValueEvidenceSchemas.ts` and is exported through `@learnaire/shared`.

## Privacy boundary

The pack is aggregate-only. It must not include:

- direct person identifiers such as email, employee ID, or user ID
- hashed, pseudonymous, tokenized, or otherwise joinable person identifiers
- person-level HRIS records or HRIS inference from AI usage
- team, manager, role, or person-level comparisons
- raw prompts, model outputs, transcripts, query text, tool payloads, or file content
- ranking, productivity scoring, or hidden reconstructed metrics

Aggregate workforce context may appear only as customer-approved assumption or
system-of-record context for workflow-level value measurement. It must not be
inferred from Glean usage telemetry and must not support people decisioning,
compensation/performance inference, promotion/discipline inference,
attrition prediction, manager ranking, or team ranking.

## Relationship to existing contracts

- **Glean Signal Readiness Map (`GSR_2026_05`)**: records whether source signal families are present, missing, suppressed, or not computed.
- **EvidenceBundle v1**: remains the executive-safe evidence posture contract.
- **Glean Value Evidence Pack (`GVE_2026_05`)**: evaluates value evidence posture and claim readiness across covered Glean value surfaces.

Only `present` readiness inputs should contribute to value evidence. Missing, suppressed, and not-computed inputs must remain visible as caveats or next instrumentation actions.
