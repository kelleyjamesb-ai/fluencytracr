# Control Configuration Versioning (Dashboard V1)

## Purpose

Control configuration determines how visibility is computed.

This includes:

- Risk class thresholds
- Window gating duration
- Verification requirements
- Suppression sensitivity rules

Changes to control configuration must be versioned and auditable.

---

## What Is a Control Configuration?

A control configuration defines:

- Minimum evidence required for visibility
- Risk-weighted sufficiency rules
- Suppression criteria

It does not define interpretation.
It does not define performance.

---

## Versioning Rules

Every control configuration change must:

- Create a new version record
- Preserve all previous versions
- Record change_reason
- Record changed_by (role)
- Record timestamp
- Generate audit log entry

No in-place mutation is allowed.

---

## Baseline Reset

When control configuration changes:

- A baseline reset event must be created
- The reset binds to the new configuration version
- Historical events remain immutable
- Visibility computation re-evaluates only from the reset point forward

Reset does not erase history.
It redefines evaluation criteria going forward.

---

## Role Permissions

Only:

- GOV_OPERATOR
- ADMIN

May modify control configuration.

EXEC_VIEWER has read-only access.

---

## Audit Requirements

All configuration changes must be:

- Traceable
- Immutable
- Reviewable

If configuration change cannot be audited, it must not ship.

---

## Non-Goals

Control configuration does not:

- Adjust outputs retroactively
- Enable trend comparisons
- Introduce scoring
- Relax suppression boundaries
