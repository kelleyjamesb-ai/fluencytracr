## ADDED Requirements

### Requirement: Glean Assumption Ledger

The system SHALL define a Glean Assumption Ledger contract that records assumptions used by Glean value claims. Each assumption SHALL include assumption id, kind, scope, claim dependencies, value type, value label, source, confidence, sensitivity, approval state, customer-claim approval state, language constraint, customer visibility, review timestamp, and caveats.

#### Scenario: High-leverage assumption recorded

- **WHEN** a base-rate or multiplier materially affects Glean value evidence
- **THEN** the ledger records its source, confidence, sensitivity tier, approval state, and affected claims
- **AND** preserves caveats needed for customer-safe language review

### Requirement: Customer-claim assumption constraints

The system SHALL prevent assumptions from being approved for customer-facing value claims unless they are explicitly customer-safe and not low-confidence or high-sensitivity.

#### Scenario: Low-confidence assumption blocked

- **WHEN** an assumption has `confidence` of `low`
- **THEN** validation rejects `approved_for_customer_claims: true`

#### Scenario: High-sensitivity assumption blocked

- **WHEN** an assumption has high sensitivity
- **THEN** validation rejects `approved_for_customer_claims: true`

### Requirement: Assumption summary consistency

The system SHALL require ledger summary counts to match the assumption entries.

#### Scenario: Summary mismatch rejected

- **WHEN** the ledger summary reports a low-confidence, high-sensitivity, customer-safe, internal-only, or total count that does not match the entries
- **THEN** validation fails deterministically

### Requirement: Assumption-ledger governance gate

The Glean value governance gate SHALL validate the committed assumption ledger example and reject examples where low-confidence or high-sensitivity assumptions are marked customer-safe.

#### Scenario: Governance gate validates examples

- **WHEN** the docs contract sweep runs
- **THEN** the Glean value governance gate validates claim registry, claim evaluations, value evidence pack, and assumption ledger examples
