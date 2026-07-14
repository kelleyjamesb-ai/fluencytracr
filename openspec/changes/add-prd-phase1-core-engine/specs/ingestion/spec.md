## ADDED Requirements

### Requirement: Fluency event correlation fields

Partner payloads MAY include opaque correlation identifiers on each fluency event: `run_id`, `workflow_run_id`, `agent_run_id`, `chat_id`. Values MUST be non-empty strings when present and MUST NOT carry raw user content.

#### Scenario: Ingest accepts optional run_id

- **WHEN** a valid fluency event includes `run_id`
- **THEN** the server persists the event with correlation fields unchanged

---

### Requirement: Execution identity normalization

The server SHALL assign a deterministic `execution_id` for every stored fluency event: prefer `run_id`, else `workflow_run_id`, else a singleton key derived from `event_id` and `workflow_id`.

#### Scenario: Same run_id shares execution

- **WHEN** two events share the same `workflow_id` and `run_id`
- **THEN** they receive the same `execution_id`

---

### Requirement: Trace reconstruction read API

The server SHALL expose `GET /api/traces/reconstructed` for roles `ADMIN` and
`ENABLEMENT_LEAD`, requiring at least one of `workflow_id` or `execution_id`.
The response SHALL return sanitized deterministic retry indexes and step/tool
group identifiers for matching stored events. It SHALL NOT return internal
`execution_id` values or ordered event identifiers.

#### Scenario: Missing query parameters rejected

- **WHEN** the client omits both `workflow_id` and `execution_id`
- **THEN** the server responds with 400

#### Scenario: Matching traces are sanitized

- **WHEN** an authorized caller requests matching reconstructed traces
- **THEN** the response includes sanitized retry indexes and step/tool group identifiers
- **AND** internal `execution_id` and ordered event identifiers are omitted

---

### Requirement: Direct connector identifier rejection

Declarative connector mappings SHALL reject direct user identifiers at any
nesting depth and SHALL return no partial signals from a batch containing a
privacy violation. The direct chat connector SHALL accept only `event_type`,
`timestamp`, and input paths explicitly declared by the active compiled
mapping; undeclared fields are privacy-invalid. Declared correlation values
MUST use the mapping's namespaced opaque UUID format, and timestamps MUST be
offset datetimes. Chat session mapping MUST NOT require `user_id`.

#### Scenario: Chat event contains a direct user identifier

- **WHEN** a direct chat connector batch contains `user_id` or a casing/nesting alias
- **THEN** the connector rejects the batch
- **AND** no signals from that batch are returned

#### Scenario: Chat event contains an undeclared field

- **WHEN** a direct chat connector event contains a path not declared by its active mapping
- **THEN** the connector rejects the batch fail closed
- **AND** no signals from that batch are returned

#### Scenario: Chat event omits a direct user identifier

- **WHEN** a valid `chat.session.started` event contains its governed session correlation key and no direct identifier
- **THEN** the event may map without requiring `user_id`
