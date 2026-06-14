## ADDED Requirements

### Requirement: V3 surfaced verdicts forward aggregate distribution

The system SHALL add `forwarded_distribution` to V3 aggregate verdict payloads
only when the verdict is `SURFACE`.

#### Scenario: Surfaced aggregate forwards governed distribution

- **WHEN** `POST /api/v3/ingest/aggregate` receives an aggregate-only payload
  that clears all fail-closed gates
- **THEN** the returned and stored verdict SHALL be `SURFACE`
- **AND** the payload SHALL include `forwarded_distribution`
- **AND** the forwarded block SHALL contain only cohort/window metadata,
  percentile distributions, aggregate quality signals, distribution moments,
  surface taxonomy ids, calibration reference, AIVM tags, and aggregate-only
  privacy markers
- **AND** the forwarded block SHALL omit raw rows, direct identifiers, raw
  prompts, outputs, transcripts, raw skill names, action rows, and free text

#### Scenario: Suppressed aggregate forwards nothing

- **WHEN** any existing suppression reason applies
- **THEN** the returned and stored verdict SHALL be `SUPPRESS`
- **AND** `forwarded_distribution` SHALL be absent
- **AND** the suppression reason SHALL be one of `INSUFFICIENT_TIME`,
  `INSUFFICIENT_VOLUME`, `NO_CONVERGENCE`, `BASELINE_UNSTABLE`, or
  `HIGH_AMBIGUITY`

### Requirement: Forwarding preserves slice independence

Forwarding SHALL be decided independently per governed slice.

#### Scenario: One slice surfaces and another suppresses

- **WHEN** two workflow slices share a cohort but only one clears gates
- **THEN** the surfaced slice SHALL include its own `forwarded_distribution`
- **AND** the suppressed slice SHALL include no forwarded block
- **AND** no broader cohort, workflow, JBTD, or persona merge SHALL rescue the
  suppressed slice

### Requirement: Quality Multiplier consumes forwarded aggregate evidence

Quality Multiplier SHALL optionally consume a governed V3
`forwarded_distribution` without raw events.

#### Scenario: Forwarded distribution clears consumer re-check

- **WHEN** a caller requests Quality Multiplier with
  `use_forwarded_distribution=true` and a matching surfaced V3 verdict has a
  valid forwarded block
- **THEN** Quality Multiplier SHALL re-check window, volume, convergence,
  baseline, and ambiguity gates
- **AND** return `SURFACE` with a bounded multiplier
- **AND** emit `value_type=QUALITY_PREMIUM`
- **AND** emit `evidence_grade=CALIBRATED`

#### Scenario: Forwarded distribution fails consumer re-check

- **WHEN** the forwarded distribution fails any consumer boundary gate
- **THEN** Quality Multiplier SHALL return `SUPPRESS`
- **AND** `multiplier` SHALL be `null`
- **AND** no `value_type` SHALL be emitted
