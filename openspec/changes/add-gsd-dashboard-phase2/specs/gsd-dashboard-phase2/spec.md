## ADDED Requirements

### Requirement: Compliance Mode Toggle
The Operator view SHALL display the current compliance mode (shadow or enforced)
and allow the operator to toggle between modes via `PATCH /compliance/mode`.

#### Scenario: Load current mode
- **WHEN** OperatorView mounts
- **THEN** the toggle reflects the value returned by `GET /compliance/mode`

#### Scenario: Toggle mode
- **WHEN** operator clicks the toggle
- **THEN** `PATCH /compliance/mode` is called with the new value and the UI
  updates optimistically

### Requirement: Control Drift Live Table
The Operator view SHALL replace the Control Drift stub with a live table
showing per-control compliance status and staleness.

#### Scenario: Render controls
- **WHEN** OperatorView mounts
- **THEN** each control row shows: name, current status, and days since last update

#### Scenario: Stale indicator
- **WHEN** a control has not been updated in more than 30 days
- **THEN** a ⚠ warning indicator is shown on that row

### Requirement: Policy Coverage KPI Card
The Exec Board view SHALL surface a Policy Coverage KPI showing how many
policies are mapped and the total unresolved clause count.

#### Scenario: Mapped count
- **WHEN** ExecBoardView loads board signals
- **THEN** the KPI card displays "X of Y policies mapped"

#### Scenario: Unresolved clauses
- **WHEN** one or more policies have unresolved clauses
- **THEN** the total unresolved clause count is shown below the mapped count

### Requirement: Auto Org Initialization
The backend SHALL automatically upsert an org record on startup when
`SEED_ORG_ID` and `SEED_ORG_NAME` environment variables are present.

#### Scenario: Env vars present
- **WHEN** the backend starts with `SEED_ORG_ID` and `SEED_ORG_NAME` set
- **THEN** the org is created or updated without manual intervention

#### Scenario: Env vars absent
- **WHEN** either env var is missing
- **THEN** the startup proceeds normally with no error
