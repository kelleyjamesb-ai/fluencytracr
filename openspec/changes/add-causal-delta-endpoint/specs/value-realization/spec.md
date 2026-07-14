## ADDED Requirements

### Requirement: Causal Delta Endpoint
The system SHALL expose `POST /api/v1/causal-delta` to compare aggregate workflow patterns before and after a supplied change moment.

#### Scenario: Surfaced comparison
- **WHEN** both pre and post windows independently clear suppression gates
- **THEN** the endpoint SHALL return `verdict: SURFACE`
- **AND** `shift` SHALL be one of `IMPROVED`, `HELD`, or `REGRESSED`
- **AND** `pre_pattern` and `post_pattern` SHALL use existing pattern enum values only

#### Scenario: Suppressed comparison
- **WHEN** either window fails suppression gates
- **THEN** the endpoint SHALL return `verdict: SUPPRESS`
- **AND** `shift` SHALL be `INDETERMINATE`
- **AND** a positive integer window shorter than 60 days SHALL use `suppression_reason: INSUFFICIENT_TIME`

### Requirement: No Statistical Claims
The Causal Delta endpoint SHALL NOT emit p-values, significance scores, confidence intervals, causal attribution, or dollarized ROI.

#### Scenario: Pattern shift only
- **WHEN** the endpoint returns a surfaced comparison
- **THEN** the response SHALL contain only pattern-shift verdict fields and aggregate cohort sizes

### Requirement: Non-overlapping Windows
The endpoint SHALL reject malformed or overlapping pre/post windows and SHALL
enforce a compiled 60-day minimum before either window can surface. Positive
integer windows below the surfacing minimum remain valid operating context but
MUST fail closed without pattern classification. The complete post window MUST
have elapsed before the comparison can surface.

#### Scenario: Sub-minimum operating window
- **WHEN** either window is a positive integer shorter than 60 days
- **THEN** the endpoint SHALL return `verdict: SUPPRESS`
- **AND** `suppression_reason` SHALL be `INSUFFICIENT_TIME`
- **AND** `shift` SHALL be `INDETERMINATE`
- **AND** `pre_pattern` and `post_pattern` SHALL be null

#### Scenario: Post window has not elapsed
- **WHEN** `event_at + post_window_days` is later than the computation time
- **THEN** the endpoint SHALL return `verdict: SUPPRESS`
- **AND** `suppression_reason` SHALL be `INSUFFICIENT_TIME`
- **AND** no pre/post pattern SHALL be classified

#### Scenario: Invalid window
- **WHEN** either window is zero, negative, fractional, malformed, or overlapping
- **THEN** the endpoint SHALL reject the request
