# FluencyTracr V0 Data Contract

## Scope
This contract applies to ingest endpoints in the FluencyTracr backend.

## Privacy Forbidden Keys
Payloads MUST NOT include raw content or direct identifiers. The following keys are forbidden anywhere in the payload (recursive):

- prompt_content
- output_content
- keystrokes
- file_names
- message_text
- raw_logs
- user_id
- userid
- userId
- email
- name
- full_name
- first_name
- last_name
- employee_id
- employeeId
- person_id
- username

## Schema Version Header
All ingest requests MUST include:

- `X-FluencyTracr-Schema-Version: <version>`

Default accepted version is `0.1`.

Compatibility rollout can be configured with:

- `SCHEMA_ACCEPTED_VERSIONS=0.1,0.2` (comma-separated allow-list)
- `SCHEMA_DEPRECATED_VERSIONS=0.1` (comma-separated subset that remains accepted but marked deprecated)

Requests missing the header or using an unsupported version are rejected.

When a deprecated but accepted version is used, responses include:

- `X-FluencyTracr-Schema-Deprecated: true`

## Workflow Completion Semantics
A workflow is complete when either:

- an `ai_output_disposition` event exists with `disposition` in `accepted`, `edited`, `rejected`, or `abandoned`, or
- an `ai_abandonment` event exists with `abandonment_stage` set to `reviewed`.

## Suppression Rule
Minimum cohort size defaults to `5`. Cohorts below the threshold are suppressed and not reported.
