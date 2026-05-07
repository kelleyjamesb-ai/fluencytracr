## ADDED Requirements
### Requirement: Dashboard V1 Governance Persistence Model
The backend MUST persist workflow governance state using explicit workflow version history, workflow current pointers, org-level control configuration versions, and baseline reset events.

#### Scenario: Workflow risk update creates version and updates current pointer
- **WHEN** an authorized caller registers a workflow risk change
- **THEN** the system stores a new `WorkflowRegistryVersion` row
- **AND** updates or creates the corresponding `WorkflowRegistryCurrent` row for the same `(org, workflow)`

#### Scenario: Control config update creates baseline reset event
- **WHEN** control configuration changes are saved
- **THEN** the system stores a new `ControlConfigVersion` row
- **AND** stores a `BaselineResetEvent` row referencing the created control config version

### Requirement: Governance Visibility Remains Fail-Closed
The system MUST keep suppression-first and deterministic visibility behavior under the new persistence model.

#### Scenario: Suppression cannot be overridden
- **WHEN** workflow evidence includes suppression signals
- **THEN** visibility state is `NOT_SHOWN_SAFETY` regardless of additional evidence

#### Scenario: High-risk workflows require verification
- **WHEN** a workflow is high risk and lacks verification evidence
- **THEN** visibility state is `NOT_ENOUGH_DATA_YET`
