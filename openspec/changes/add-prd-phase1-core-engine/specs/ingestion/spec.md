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

The server SHALL expose `GET /api/traces/reconstructed` for roles `ADMIN` and `ENABLEMENT_LEAD`, requiring at least one of `workflow_id` or `execution_id`, returning ordered event ids and deterministic retry/step groupings for matching stored events.

#### Scenario: Missing query parameters rejected

- **WHEN** the client omits both `workflow_id` and `execution_id`
- **THEN** the server responds with 400
