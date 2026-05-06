## ADDED Requirements

### Requirement: Glean signal readiness map

The system SHALL define a Glean Signal Readiness Map contract that records, for a single organization and reporting window, which Glean signal families are available for FluencyTracr evidence derivation. Each signal family entry SHALL include source availability, export channel, scrub status, stable join keys, derived FluencyTracr evidence dimensions, readiness status, suppression state, data quality, and validation evidence.

#### Scenario: Available signal family

- **WHEN** a deployment can provide WorkflowRun data with stable `run_id` and `workflow_run_id` join keys
- **THEN** the readiness map records the signal family as `present`
- **AND** lists only aggregate evidence dimensions that can be computed from that source
- **AND** includes a validation evidence note without raw prompt, transcript, model output, or user identifier fields

#### Scenario: Missing or unconfirmed source

- **WHEN** a signal family has not been approved, exported, or verified for the deployment
- **THEN** the readiness map records it as `missing` or `not_computed`
- **AND** does not infer evidence from adjacent signal families

### Requirement: Privacy-preserving readiness validation

Readiness map validation SHALL reject entries that include individual attribution, ranking, productivity scoring, or raw content fields. Forbidden dimensions include user, team, manager, role, email, transcript, prompt text, and model output text.

#### Scenario: Forbidden field rejected

- **WHEN** a readiness entry includes a `user_id`, `team_ranking`, or `prompt_text` field
- **THEN** validation fails deterministically

### Requirement: Agent-safe evidence summary tool

The MCP adapter SHALL expose an agent-safe evidence summary tool that returns the strict `AgentEvidenceResponse` template from an EvidenceBundle v1 source. The summary tool SHALL omit raw bundle-only fields and reject invalid template output.

#### Scenario: Strict summary response

- **WHEN** a Glean Agent calls the summary tool for an org-window
- **THEN** the tool returns only `org_id`, `window`, `generated_at`, `suppression_applied`, `suppression_reasons`, `exposure`, `calibration`, `fragility`, `coverage_summary`, and `decision_safe_guidance`
- **AND** unknown top-level keys are not included
