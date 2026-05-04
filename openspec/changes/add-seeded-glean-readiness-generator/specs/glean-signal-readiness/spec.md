## ADDED Requirements

### Requirement: Seeded readiness inventory generator

The system SHALL provide a deterministic generator that converts a seeded Glean signal inventory into a validated `GSR_2026_05` Glean Signal Readiness Map. The generator SHALL derive `present`, `missing`, `suppressed`, or `not_computed` status from source availability, scrub status, suppression, join keys, and derived dimensions.

#### Scenario: Present signal family

- **WHEN** a seeded inventory entry is available, scrubbed, has at least one stable join key, has at least one derived dimension, and is not suppressed
- **THEN** the generated readiness map marks the signal family as `present`

#### Scenario: Missing signal family

- **WHEN** a seeded inventory entry is unavailable
- **THEN** the generated readiness map marks the signal family as `missing`

#### Scenario: Not computed signal family

- **WHEN** a seeded inventory entry is unconfirmed, pending export, has unknown scrub status, lacks join keys, or lacks derived dimensions
- **THEN** the generated readiness map marks the signal family as `not_computed`

#### Scenario: Suppressed signal family

- **WHEN** a seeded inventory entry has suppression applied
- **THEN** the generated readiness map marks the signal family as `suppressed`
- **AND** preserves suppression reason codes

### Requirement: Seeded stakeholder demo output

The repository SHALL include a seeded readiness map output and a short stakeholder-readable demo summary that separates measurable-now signals from missing, suppressed, or not-computed signals.

#### Scenario: Demo summary

- **WHEN** a stakeholder reviews the seeded demo summary
- **THEN** they can identify what Glean evidence FluencyTracr can use now
- **AND** what Glean data access or validation unlocks next
