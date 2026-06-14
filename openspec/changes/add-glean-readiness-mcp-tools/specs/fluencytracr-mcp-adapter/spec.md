## ADDED Requirements

### Requirement: Glean readiness MCP tools

The MCP adapter SHALL expose `fluency.get_signal_readiness_map` and `fluency.get_signal_readiness_summary` for org-window Glean readiness questions. The tools SHALL read only a validated aggregate `GSR_2026_05` readiness map snapshot unless a future approved change adds live-data access.

#### Scenario: Trusted readiness map access

- **WHEN** a client calls `fluency.get_signal_readiness_map` with a valid `org_id` and `window`
- **THEN** the adapter returns a payload validated by `GleanSignalReadinessMapSchema`
- **AND** the tool does not fetch or expose raw Glean source records

#### Scenario: Agent-safe readiness summary

- **WHEN** a client calls `fluency.get_signal_readiness_summary` with a valid `org_id` and `window`
- **THEN** the adapter returns a strict summary containing readiness counts, ready signal families, non-computable signal families, suppression state, next actions, and decision-safe guidance
- **AND** the summary omits readiness entries, validation evidence, join keys, and raw source records

#### Scenario: Extra input fields rejected

- **WHEN** a readiness tool call includes extra top-level fields such as `team_id`
- **THEN** the adapter rejects the call with `reason_code` `invalid_payload`
