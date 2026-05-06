# Phase 2 Internal Admin Beta Rollout

This runbook defines the Phase 2 rollout for `www.fluencytracr.com` using shadow-mode compliance.

## Scope
- Internal admin beta only
- Advisory compliance signals only (non-blocking)
- Authenticated org admin and approved viewer roles

## Required Environment Configuration
- `COMPLIANCE_MODE=shadow`
- `BETA_ORG_ALLOWLIST=org-1` (comma-separated org IDs)
- `AUDIT_LOG_ENABLED=true`

## Access and Guardrails
- Keep policy mapping and unresolved-clause decisions restricted to `ADMIN` role.
- Keep compliance status readable for `ADMIN`, `EXEC_VIEWER`, and `ENABLEMENT_LEAD`.
- Keep unresolved ambiguity explicit; do not auto-convert unresolved clauses to enabled.

## Release Gates
1. Functional validation in staging:
   - upload -> map -> unresolved decision -> status refresh -> events
2. Governance validation:
   - audit trail exists for every policy and clause decision
3. Internal beta signoff:
   - at least one internal org admin verifies usability on `www.fluencytracr.com`

## Exit Condition for Phase 2
Phase 2 is complete when internal admins can manage policy mapping end-to-end in shadow mode and compliance telemetry remains stable without enforcement blocks.
