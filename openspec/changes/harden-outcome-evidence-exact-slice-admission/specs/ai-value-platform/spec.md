## ADDED Requirements

### Requirement: Outcome Evidence Export Preserves Exact Admission Context

A materialized `outcome_evidence_export` SHALL carry a valid exact-slice
admission receipt containing its workflow, JBTD, persona, exact baseline and
comparison windows, and admitted source evidence IDs. A direct or legacy export
without that receipt MAY remain stored or reviewed but SHALL NOT attach as
evidence.

#### Scenario: Materializer preserves admitted lineage

- **WHEN** the authoritative policy admits an exact baseline/comparison pair
- **THEN** the materializer SHALL emit the policy receipt with the export
- **AND** stale family-only export identity SHALL NOT reuse a terminal review
  from another slice
- **AND** terminal reuse SHALL require an exact authoritative receipt match

#### Scenario: Review does not create authority

- **WHEN** a reviewer accepts an export that lacks or conflicts with the
  authoritative admission receipt
- **THEN** the review state MAY remain `ACCEPTED`
- **AND** evidence attachment, readiness, model eligibility, claim
  authorization, and customer-facing output SHALL remain false or held

#### Scenario: Consumer binds to server-owned expected slice

- **WHEN** value-chain, evidence-case, or readout processing considers an
  accepted authoritative export
- **THEN** its receipt SHALL exactly match the server-owned receipt and export
  reference on the consuming evidence-readiness record
- **AND** a caller-supplied export ID, receipt, or same-family slice SHALL NOT
  establish the expected slice

#### Scenario: Exact-slice object identities do not normalize together

- **WHEN** two valid slices differ only by meaningful punctuation such as
  `resolve-case` and `resolve_case`
- **THEN** their materialized export and readiness identities SHALL remain
  distinct
- **AND** a terminal object from one identity SHALL NOT be reused by the other

### Requirement: Admission And Downstream Gates Remain Separate

Outcome Evidence admission SHALL NOT override privacy, suppression, review,
readiness, model-eligibility, or claim-authorization decisions. Every missing
or negative downstream decision SHALL remain fail-closed independently.

#### Scenario: Admitted evidence cannot rescue suppression

- **WHEN** exact-slice Outcome Evidence is admitted but the matching behavioral
  slice is suppressed or another downstream gate is absent
- **THEN** admission SHALL NOT surface the behavioral verdict
- **AND** it SHALL NOT authorize a model, claim, ROI, causality, prediction,
  productivity statement, ranking, or customer-facing economic output
