## ADDED Requirements

### Requirement: Suppressed Outcome Evidence Read Is Non-Disclosing

Outcome Evidence storage and exact-slice admission SHALL remain separate from
aggregate disclosure. When either the independent privacy decision is `HOLD`
or the existing product verdict is `SUPPRESS`, the read SHALL return no evidence
record, aggregate value, cohort size, evidence identifier, or reliability
value. Storage, admission, or review SHALL NOT override either decision.

#### Scenario: Stored evidence exists for a held or suppressed workflow slice

- **WHEN** aggregate Outcome Evidence is stored for an exact slice whose
  independent privacy decision is `HOLD` or whose existing product verdict is
  `SUPPRESS`
- **THEN** storage and internal replay MAY retain the record
- **AND** the HTTP aggregate read SHALL return an empty evidence collection and
  null reliability
- **AND** storage, review, or admission SHALL NOT override either decision
