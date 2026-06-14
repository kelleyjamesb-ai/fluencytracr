## ADDED Requirements

### Requirement: Glean Claim Registry

The system SHALL define a Glean Claim Registry contract that lists reusable Glean value claim templates. Each template SHALL include claim id, claim type, description, required and optional evidence lanes, required surfaces, forbidden input classes, minimum aggregation scope, allowed language modes, suppression reasons, and review owner.

#### Scenario: Registry defines customer-safe time-saved claim

- **WHEN** a claim template describes covered-surface time-saved evidence
- **THEN** the registry records the required surface and assumption lanes
- **AND** includes forbidden inputs that prevent direct identifiers, raw content, rankings, productivity scores, and hidden suppressed values
- **AND** includes a customer-safe caveated language template

#### Scenario: ROI claim guarded by assumptions

- **WHEN** a claim template describes ROI or value-to-cost language
- **THEN** the registry requires the assumptions lane
- **AND** the template does not default to executive-safe language

### Requirement: Glean Claim Evaluation Records

The system SHALL define org-window claim evaluation records that apply claim templates to a current evidence state. Each evaluation SHALL include evaluation state, evidence state, confidence basis, readiness state, language mode, reason codes, contributing lanes, missing lanes, and optional approved language.

#### Scenario: Customer-safe evaluated claim

- **WHEN** a claim is evaluated as surfaceable with present evidence
- **THEN** the evaluation may use customer-safe language only when approved language is present

#### Scenario: Suppressed evaluated claim

- **WHEN** a claim is suppressed, not computed, missing, or not safe to claim
- **THEN** the evaluation uses suppressed language mode
- **AND** includes deterministic reason codes
- **AND** omits approved customer-safe language

### Requirement: Privacy-preserving claim governance

The system SHALL reject claim templates and evaluations that introduce unsafe input requirements or unsafe customer-facing language. Forbidden inputs include direct identifiers, raw prompts, raw responses, transcripts, query text, tool payloads, file content, team ranking, productivity scoring, and hidden reconstruction of suppressed values.

#### Scenario: Unsafe field rejected

- **WHEN** a claim registry payload includes an unrecognized direct field such as `prompt_text` or a template omits forbidden inputs
- **THEN** validation fails deterministically
