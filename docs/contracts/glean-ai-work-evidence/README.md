# Glean AI Work Evidence Adapter

Schema version: `GAW_2026_05`

## Purpose

The Glean AI Work Evidence Adapter accepts aggregate, metadata-only records for Glean work surfaces and maps them into:

- Glean Signal Readiness inventory records
- Glean Claim Evaluation records

It is the bridge between live Glean value surfaces and FluencyTracr's Value Evidence Pack.

## Supported lanes

- `surface_usage`
- `skill_lifecycle`
- `agent_lifecycle`
- `mcp_action_boundary`
- `artifact_output`
- `control_evidence`

## Privacy boundary

The adapter does not accept arbitrary free text. Notes and next actions are represented as closed codes that render to fixed safe messages.

Records must not include:

- raw prompts or responses
- transcripts or query text
- tool payloads
- file or artifact contents
- direct identifiers
- hashed or joinable person identifiers
- person-level HRIS records or HRIS inference from AI usage
- person/team ranking
- productivity scoring

Strict schema validation rejects unknown keys before mapping.

Glean AI Work Evidence is Layer 1 telemetry. It may describe aggregate work
patterns, but it must not infer workforce outcomes or HRIS attributes from AI
usage. Aggregate workforce context must enter through customer-approved
system-of-record exports, outcome evidence, or assumption state.

## Output mappings

Readiness signal families:

| AI work lane | Readiness signal family |
| --- | --- |
| `surface_usage` | `assistant` |
| `skill_lifecycle` | `skill_lifecycle` |
| `agent_lifecycle` | `agent_run` |
| `mcp_action_boundary` | `mcp_usage` |
| `artifact_output` | `insights` |
| `control_evidence` | `ai_security` |

Claim evaluation examples:

- `glean.time_saved.covered_surfaces`
- `glean.roi.customer_value_to_cost`
- `glean.skills.reusable_expertise_operationalized`
- `glean.agents.auto_mode_operationalized`
- `glean.mcp.governed_action_boundary`
- `glean.artifacts.output_backed_work`

ROI remains suppressed until assumption governance explicitly permits customer-safe language.

## Example

See `examples/org-northstar-ai-work-export.json`.

Runtime validation lives in `shared/src/gleanAiWorkEvidenceAdapter.ts` and is exported through `@fluencytracr/shared`.
