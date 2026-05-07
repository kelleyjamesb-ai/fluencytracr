## ADDED Requirements

### Requirement: Value Evidence Pack MCP access

The MCP adapter SHALL expose a read-only tool that returns a validated aggregate Glean Value Evidence Pack for a requested org-window. The tool SHALL reject unknown input fields and SHALL NOT return raw source records beyond the bounded `GVE_2026_05` aggregate contract.

#### Scenario: Trusted aggregate value pack returned

- **WHEN** a trusted Glean Agent calls `fluency.get_value_evidence_pack` for an existing org-window
- **THEN** the tool returns the validated `GVE_2026_05` pack
- **AND** records an audit event

### Requirement: Agent-safe value claim readiness summary

The MCP adapter SHALL expose an agent-safe value readiness summary that omits raw source records and returns value posture, evidence lanes, claim readiness counts, customer-safe claims, non-computable claims, next instrumentation actions, and decision-safe guidance.

#### Scenario: Strict value readiness summary

- **WHEN** a Glean Agent calls `fluency.get_value_claim_readiness_summary`
- **THEN** the response includes only the strict summary template
- **AND** suppressed or not-computed claims preserve reason codes

### Requirement: Single-claim safety evaluation

The MCP adapter SHALL expose a tool that returns readiness and language state for a single registered Glean value claim.

#### Scenario: ROI claim suppressed

- **WHEN** a Glean Agent asks whether `glean.roi.customer_value_to_cost` is safe
- **THEN** the tool returns suppressed language mode and reason codes while omitting customer-safe language

### Requirement: Non-computable value claims

The MCP adapter SHALL expose a tool that returns only suppressed or not-computed value claims for an org-window.

#### Scenario: Non-computable claims returned

- **WHEN** an org-window contains suppressed ROI and not-computed MCP boundary claims
- **THEN** the tool returns those claims and reason codes only
