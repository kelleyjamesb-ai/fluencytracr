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

### Requirement: No Statistical Claims
The Causal Delta endpoint SHALL NOT emit p-values, significance scores, confidence intervals, causal attribution, or dollarized ROI.

#### Scenario: Pattern shift only
- **WHEN** the endpoint returns a surfaced comparison
- **THEN** the response SHALL contain only pattern-shift verdict fields and aggregate cohort sizes

### Requirement: Non-overlapping Windows
The endpoint SHALL reject malformed or overlapping pre/post windows and SHALL enforce a hard-coded minimum of 14 days per window.

#### Scenario: Invalid window
- **WHEN** either window is shorter than 14 days
- **THEN** the endpoint SHALL reject the request
