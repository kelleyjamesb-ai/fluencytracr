## MODIFIED Requirements
### Requirement: Production Readiness Requires Governance Gate Validation
The system SHALL require strict allowlist gate validation before expanding beyond internal beta operations.

#### Scenario: Allowlist gate validation required
- **WHEN** production rollout readiness is assessed for Phase 3
- **THEN** explicit allowlisted-org success and non-allowlisted 403 denial checks are required
- **AND** the validation evidence is recorded in closure artifacts

### Requirement: Compliance Reevaluation Events Must Be Causally Auditable
The system SHALL include causal linkage metadata for compliance status reevaluation events.

#### Scenario: Policy mapping triggers reevaluation
- **WHEN** a policy is mapped and compliance status is refreshed
- **THEN** the refreshed status event includes `source_event_id`, `source_event_type`, and `recomputed_at`

### Requirement: Governance Export Must Be Deterministic
The system SHALL provide deterministic compliance event export output for governance review.

#### Scenario: Admin requests export in JSON
- **WHEN** an authorized admin requests compliance export without format override
- **THEN** the response includes sorted events, UTC timestamps, and total count

#### Scenario: Admin requests export in CSV
- **WHEN** an authorized admin requests `format=csv`
- **THEN** the response returns CSV with deterministic ordering and UTC timestamp fields
