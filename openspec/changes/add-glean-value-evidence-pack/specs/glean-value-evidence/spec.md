## ADDED Requirements

### Requirement: Glean Value Evidence Pack

The system SHALL define a Glean Value Evidence Pack contract for a single organization and reporting window. The pack SHALL communicate customer value evidence posture across Glean work surfaces, including core assistance, Skills, Auto Mode Agents, content-triggered or scheduled Agents, MCP/actions, embedded hosts, artifacts, controls, assumptions, claim readiness, and next instrumentation actions.

#### Scenario: Aggregate value evidence pack

- **WHEN** FluencyTracr receives a Glean value evidence payload for an org-window
- **THEN** validation accepts the payload only if it includes schema version, org id, window, generated timestamp, source system, value posture, executive summary, evidence lanes, surface coverage, skill lifecycle, agent lifecycle, MCP/action boundary, artifact outputs, control evidence, assumptions, claim readiness, and next instrumentation actions
- **AND** the pack remains aggregate and org-window scoped

#### Scenario: Current and live Glean surfaces represented

- **WHEN** the pack describes current or imminent Glean surfaces
- **THEN** it can represent Chat, Search, AI Answers, Gleanbot, APIs, Skills, Auto Mode Agents, content-triggered Agents, scheduled Agents, MCP/actions, embedded hosts, Canvas/artifacts, and Protect/runtime controls

### Requirement: Customer-safe value posture

The system SHALL classify each pack and each claim using bounded evidence states and customer-safe language modes. Value posture SHALL distinguish validated, directional, assumption-heavy, coverage-limited, internal-only, not-computed, and suppressed value evidence.

#### Scenario: Claim language constrained by evidence

- **WHEN** an ROI or value claim depends on low-confidence assumptions, missing surfaces, or suppressed signals
- **THEN** the pack marks the claim as internal-only, not computed, or suppressed instead of customer-safe
- **AND** includes deterministic reason codes and caveats

### Requirement: Privacy-preserving value evidence

The system SHALL reject value evidence payloads that include raw content, direct user identifiers, person-level attribution, ranking, productivity scoring, or hidden reconstruction of suppressed values.

#### Scenario: Forbidden field rejected

- **WHEN** a value evidence payload includes a `user_id`, `prompt_text`, `raw_response`, `transcript`, `team_ranking`, or `productivity_score` field
- **THEN** validation fails deterministically

### Requirement: Instrumentation gap visibility

The system SHALL preserve missing, suppressed, and not-computed states as first-class evidence states. Missing or unconfirmed signal families SHALL appear in coverage or next instrumentation actions rather than being inferred from adjacent signals.

#### Scenario: Skills not yet exported

- **WHEN** Skill lifecycle metadata is unavailable for an org-window
- **THEN** the pack records Skill lifecycle evidence as `not_computed` or `not_present`
- **AND** adds a next instrumentation action instead of assigning value credit to Skills
