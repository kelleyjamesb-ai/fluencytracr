## ADDED Requirements

### Requirement: Canonical Value Engine Boundary

The AI Value platform SHALL designate a single local engine module as the
owner of the canonical AI value object spine (Workflow Blueprint, Metrics
Library, Value Scenario, Evidence Readiness, Claim Boundary, Executive
Packet). Spine consumers — validator and generator scripts, the agent handoff
harness, and the local workspace UI — SHALL delegate object validation and
governance gating to the engine rather than re-implementing it.

#### Scenario: New spine stage is added through the engine

- **WHEN** a contributor adds a new spine object type or validator
- **THEN** the validation and governance logic is added to the engine module
- **AND** the consumer (script, harness, or UI) only invokes the engine

#### Scenario: Consumer bypass is rejected in review

- **WHEN** a change implements spine validation or claim gating outside the
  engine after that stage has migrated
- **THEN** the change is rejected against this capability spec

### Requirement: Pipeline Ordering Enforcement

The engine SHALL enforce spine ordering: a downstream stage MUST refuse input
objects that have not passed upstream validation, and the refusal MUST be
explicit rather than a silent skip.

#### Scenario: Executive packet from unvalidated claim boundary

- **WHEN** executive packet generation is requested with a claim boundary
  object that has not passed claim boundary validation
- **THEN** the engine refuses to generate the packet
- **AND** reports the failed upstream stage as the reason

### Requirement: Fail-Closed Governance Invariants

The engine SHALL enforce the existing AI Value governance boundaries at the
engine level and fail closed: blocked claims (realized ROI, causality,
productivity measurement, individual scoring, ranking, HR analytics) MUST be
rejected, suppression and missing-evidence states MUST propagate to all
downstream stages, and missing or ambiguous governance fields MUST resolve to
withheld or blocked output rather than permissive output.

#### Scenario: Blocked claim language in an input object

- **WHEN** an input object contains claim language matching a blocked-claim
  pattern
- **THEN** the engine rejects the object with the blocked-claim reason

#### Scenario: Suppressed upstream evidence

- **WHEN** an upstream object carries a suppressed or missing evidence state
- **THEN** every downstream stage output reflects that state
- **AND** no downstream stage upgrades the claim confidence

### Requirement: Deterministic Local Execution

The engine SHALL run locally and deterministically: no network access, no
runtime services, no storage side effects, and identical decisions for
identical input objects.

#### Scenario: Repeated run over the same fixtures

- **WHEN** the engine validates the same seeded fixture set twice
- **THEN** both runs produce identical verdicts, reasons, and generated output

### Requirement: Behavior-Preserving Validator Migration

The engine migration process SHALL preserve the command-line contract and
existing test expectations of each standalone validator or generator moved
behind the engine; a stage's logic MUST be considered migrated only when its
pre-existing tests pass unchanged against the engine-backed path.

#### Scenario: Blueprint validator migrates behind the engine

- **WHEN** `scripts/validate_ai_value_blueprint.mjs` is rewired to delegate to
  the engine
- **THEN** its CLI invocation, exit codes, and output contract are unchanged
- **AND** `scripts/validate_ai_value_blueprint.test.mjs` passes without test
  modifications
