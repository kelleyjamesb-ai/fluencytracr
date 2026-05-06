## ADDED Requirements

### Requirement: Readiness to Unified Telemetry bridge

The system SHALL convert validated `present` Glean readiness entries into valid aggregate Unified Telemetry events and SHALL preserve `missing`, `suppressed`, and `not_computed` entries as explicit non-computable metadata outside UT event payloads.

#### Scenario: Present entries emit UT events

- **WHEN** a readiness map contains `present` entries
- **THEN** the bridge emits `UT_2026_04` events that pass `UnifiedTelemetryEventSchema`
- **AND** each event remains org-window scoped

#### Scenario: Non-computable entries are not inferred

- **WHEN** a readiness map contains `missing`, `suppressed`, or `not_computed` entries
- **THEN** the bridge does not emit UT events for those entries
- **AND** returns explicit metadata that explains why each signal family was not computable
