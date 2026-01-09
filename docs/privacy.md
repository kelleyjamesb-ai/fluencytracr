# Privacy contract

## Non-collectable fields
The following fields must never be collected, stored, or transmitted. Introducing them
into any schema or payload is a build-failing error.

- prompt_content
- output_content
- keystrokes
- file_names
- message_text
- raw logs

## Enforcement
The data contract is enforced via:

- `NON_COLLECTABLE_FIELDS` in `src/data_contract.py`
- `validate_schema_fields(...)` and `validate_payload(...)` validators
- unit tests in `tests/test_data_contract.py` that assert violations raise errors

## Aggregation enforcement
Dashboards must aggregate by default, and employee-level endpoints are restricted by role:

- `enforce_aggregation_defaults(...)` enforces org/team-only aggregation
- `enforce_role_access(...)` blocks exec access to employee-level endpoints
- `handle_dashboard_request(...)` applies rules server-side
