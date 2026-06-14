## ADDED Requirements

### Requirement: Quality Multiplier Endpoint
The system SHALL expose a read-only `GET /api/v1/quality-multiplier` endpoint that accepts `workflow_id` and `window_days` query parameters and returns a workflow-level aggregate multiplier verdict.

#### Scenario: Surfaced multiplier
- **WHEN** the workflow has enough aggregate evidence to clear all suppression gates
- **THEN** the response verdict SHALL be `SURFACE`
- **AND** `multiplier` SHALL be a number between `0.5` and `1.5`
- **AND** no individual-level identifiers SHALL be returned

#### Scenario: Suppressed multiplier
- **WHEN** any fail-closed suppression gate applies
- **THEN** the response verdict SHALL be `SUPPRESS`
- **AND** `multiplier` SHALL be `null`
- **AND** exactly one existing suppression reason SHALL be returned

### Requirement: Existing Suppression Reasons
The Quality Multiplier endpoint SHALL use only the existing suppression reasons: `INSUFFICIENT_TIME`, `INSUFFICIENT_VOLUME`, `NO_CONVERGENCE`, `BASELINE_UNSTABLE`, and `HIGH_AMBIGUITY`.

#### Scenario: No new suppression reason
- **WHEN** the endpoint suppresses
- **THEN** `suppression_reason` SHALL be one of the five existing reasons

### Requirement: Deterministic Canonical Derivation
The Quality Multiplier SHALL be computed deterministically from existing canonical workflow telemetry without new canonical events.

#### Scenario: Quality signals adjust time-saved estimates
- **WHEN** verification presence and recovery success rates are higher
- **THEN** the multiplier SHOULD increase relative to `1.0`
- **WHEN** abandonment and friction-loop rates are higher
- **THEN** the multiplier SHOULD decrease relative to `1.0`
