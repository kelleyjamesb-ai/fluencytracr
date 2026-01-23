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

- `X-FluencyTracr-Schema-Version: 0.1`

Requests missing the header or using any other value are rejected.

## Workflow Completion Semantics
A workflow is complete when either:

- an `ai_output_disposition` event exists with `disposition` in `accepted`, `edited`, `rejected`, or `abandoned`, or
- an `ai_abandonment` event exists with `abandonment_stage` set to `reviewed`.

## Suppression Rule
Minimum cohort size defaults to `5`. Cohorts below the threshold are suppressed and not reported.
