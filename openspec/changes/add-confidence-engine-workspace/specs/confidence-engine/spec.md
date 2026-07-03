## ADDED Requirements

### Requirement: Confidence-engine workspace with byte-compatible spine

The system SHALL provide a `packages/confidence-engine` workspace hosting the
contribution-alignment Bayesian execution spine, and every ported module SHALL
emit output byte-identical to its predecessor `scripts/` runner for the same
input, including schema version strings, state tokens, and hash values.

#### Scenario: Golden-fixture parity holds per module

- **WHEN** a ported spine module runs against the stored golden fixture input
- **THEN** its output object equals the recorded output of the corresponding
  `.mjs` runner, including all hash fields

#### Scenario: Existing entry points keep working

- **WHEN** any existing spine `npm run` script or `.mjs` CLI invocation runs
  after cutover
- **THEN** it produces the same output as before by delegating to the
  workspace build

#### Scenario: Existing module importers keep working

- **WHEN** peer runners or tests import named builders, validators, constants,
  or hash helpers from a cutover `.mjs` wrapper
- **THEN** the wrapper exposes the same named public module API as the
  predecessor script, or every importer is updated in the same cutover

### Requirement: Held engine posture preserved

The workspace port SHALL NOT change any gate semantics or held states: the
execution runtime SHALL remain a fixture-only prototype held for review, and
all previously blocked outputs SHALL remain blocked.

#### Scenario: Runtime hold state survives the port

- **WHEN** the ported execution runtime runs with a valid execution-gate
  source
- **THEN** it emits the same held runtime state as the predecessor runner and
  authorizes no model output, confidence/probability/score output, finance
  output, live connector execution, persistence, route, UI, export, or
  customer-facing output

### Requirement: ConfidenceModel contract module

The workspace SHALL provide a types-and-schema-only `ConfidenceModel`
contract describing prior provenance (Blueprint-derived, with the current
standard-normal placeholder explicitly labeled as a placeholder), evidence
admission (gate-cleared observations only, each carrying a machine-readable
admission or exclusion reason code aligned to the confidence-engine series
read-path decision contract in
`docs/contracts/ai-value-confidence-engine-series-read-path-decision/README.md`),
and posterior representation as credible intervals. The contract module SHALL
NOT execute inference.

#### Scenario: Contract validates an admissible observation shape

- **WHEN** an observation with a gate-cleared source ref, milestone day in
  [0, 30, 60, 90, 180, 365], and an admission reason code is validated
  against the contract
- **THEN** validation passes without producing any model, probability, or
  score output

#### Scenario: Contract rejects point-estimate posterior shapes

- **WHEN** a posterior representation without interval bounds is validated
  against the contract
- **THEN** validation fails
