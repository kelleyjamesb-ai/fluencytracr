## ADDED Requirements

### Requirement: Materializer uses aggregate stores without weakening V3 governance

The materializer SHALL consume only existing aggregate V3 verdicts, forwarded
distributions, velocity observations, and customer-attested outcome evidence.

#### Scenario: Raw evidence is not materialized

- **WHEN** the materializer reads aggregate stores
- **THEN** generated objects SHALL omit raw GCE rows, direct identifiers, raw
  prompts, outputs, transcripts, raw skill names, and action rows
- **AND** generated objects SHALL not combine suppressed slices with surfaced
  slices to rescue a held verdict
- **AND** generated objects SHALL not calculate ROI, prove causality, measure
  productivity, perform HR analytics, rank people or teams, or create
  customer-facing economic output
