## ADDED Requirements
### Requirement: WAIM Contract Enforcement
The system SHALL treat the WAIM v1 YAML artifact as a binding contract and SHALL suppress any orientation signal not explicitly allowed.

#### Scenario: Missing placement entry
- **WHEN** an orientation signal does not match any WAIM placement
- **THEN** the signal SHALL be suppressed

#### Scenario: WAIM missing or malformed
- **WHEN** the WAIM artifact is missing or invalid
- **THEN** all placements SHALL be suppressed

### Requirement: Placement Gate with Anti-Habit Suppression
The system SHALL enforce a placement gate after eligibility and before rendering, including non-deterministic suppression and anti-habit guards.

#### Scenario: Anti-habit guard trips
- **WHEN** repetition, same workflow step, or cooldown constraints are violated
- **THEN** the signal SHALL be suppressed

### Requirement: No Persistence Invariant
The system SHALL not persist orientation signal state or placement history.

#### Scenario: Reload or navigation
- **WHEN** a session reloads or navigates
- **THEN** no historical placement state SHALL be returned or implied
