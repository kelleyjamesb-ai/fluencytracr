## ADDED Requirements

### Requirement: Unified telemetry ingest route

The system SHALL expose an HTTP ingest route for unified telemetry events (`UT_2026_04`) that is disabled by default and MUST be explicitly enabled via deployment configuration.

#### Scenario: Disabled by configuration

- **WHEN** `FLUENCY_UNIFIED_TELEMETRY_INGEST` is not set to the string `true`
- **THEN** the route SHALL return `403` with `reason_code` `feature_disabled`

#### Scenario: Schema version enforcement

- **WHEN** `X-FluencyTracr-Schema-Version` is missing or not in the configured accept list
- **THEN** the route SHALL return `400` with `reason_code` `invalid_schema_version`

#### Scenario: Valid batch accepted

- **WHEN** the body contains a non-empty `events` array and each element validates against the shared Zod contract
- **AND** required headers are present
- **THEN** the route SHALL return `202` with receipt fields including `accepted_count` equal to the number of valid events
- **AND** each accepted event SHALL be persisted with its payload `event_id` as the storage key

#### Scenario: Forbidden content-class fields

- **WHEN** the JSON body contains a forbidden field detected by the same mechanism as `/api/ingest`
- **THEN** the route SHALL return `400` with `reason_code` `forbidden_field`

#### Scenario: Idempotency

- **WHEN** the same `Idempotency-Key` is reused with an identical body
- **THEN** the route SHALL return the same receipt payload as the first successful acceptance
- **WHEN** the same `Idempotency-Key` is reused with a different body
- **THEN** the route SHALL return `409` with `reason_code` `idempotency_conflict`

### Requirement: Shared schema parity

The Zod definitions in `shared/src/unifiedTelemetrySchemas.ts` SHALL model the same event shapes as `schemas/unified_telemetry/ut_event_union.schema.json` for `schema_version` `UT_2026_04`.

#### Scenario: Contract updates

- **WHEN** either the JSON Schema or Zod mirror changes
- **THEN** the other artifact SHALL be updated in the same change or an immediately following change to restore parity
