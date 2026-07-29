## ADDED Requirements

### Requirement: Comparison Privacy Does Not Weaken Single-Window Disclosure

The Slice C single-window authority SHALL continue to hold adjacent, rolling,
overlapping, alternate-width, union, reordered, time-advanced, and general
multi-window numeric requests. C.1 SHALL be a separate atomic Outcome Evidence
comparison authority, SHALL reuse the C.0 shared reservation, and SHALL NOT
make either component window independently queryable through the Slice C or
C.1 journal.

#### Scenario: Caller composes fixed-window releases

- **WHEN** a caller attempts to compose two Slice C releases, admission
  records, export values, or receipt metadata into a comparison
- **THEN** the request SHALL `HOLD`
- **AND** only one exact C.1 journal-bound atomic projection MAY be considered
  by a future separately governed consumer

#### Scenario: C.1 authority is unavailable

- **WHEN** the immutable C.1 row, referenced C.0 journal, shared reservation
  owner/reference, or exact stored projection readback is absent or unavailable
- **THEN** the system SHALL NOT fall back to Slice B, Slice C, export review,
  caller calculations, or a copied receipt
- **AND** readback SHALL NOT rerun or extend the short-lived signed proof
- **AND** the comparison SHALL remain `HOLD`

#### Scenario: Multiple valid slices are presented together

- **WHEN** a caller presents multiple valid C.1 receipts or requests a
  comparison across workflow, JBTD, or persona slices
- **THEN** C.1 SHALL `HOLD` without returning any component projection
- **AND** validity of each independent slice SHALL NOT authorize their
  composition
