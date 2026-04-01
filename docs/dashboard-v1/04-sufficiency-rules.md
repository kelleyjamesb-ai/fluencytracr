# Risk-Weighted Sufficiency Rules

Deterministic thresholds are sourced from versioned workflow visibility policy config bound to the workflow registry version.
Thresholds are not hardcoded in runtime logic.

Policy fields:
- `lowMinEvents`
- `mediumMinEvents`
- `highMinEvents`
- `minWindowDays`
- `highSparseMinEvents`
- `highSparseMinWindowDays`

Evidence sources:
- V0 behavioral signals (`invoke_ai`, `delegate_to_agent`, `revoke_agent`, `refine_request`, `accept_output`, `retry_after_mismatch`, `override_to_manual`)
- Phase 1 canonical event types
