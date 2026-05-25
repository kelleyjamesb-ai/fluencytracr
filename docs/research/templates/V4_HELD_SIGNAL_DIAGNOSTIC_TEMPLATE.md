# V4 Held Signal Diagnostic Template

## Purpose

Use this template for follow-up diagnostics on signals that are observable but
not yet governed.

## Signal

Signal name:

Current status:

- `HOLD_FOR_ATTRIBUTION_REFINEMENT`
- `HOLD_FOR_GOVERNED_IDENTITY`
- `HOLD_FOR_JOIN_COVERAGE`
- `HOLD_FOR_STABILITY`

## Why It Is Held

Explain the evidence gap in one paragraph.

## Required Proof

| Requirement | Evidence needed | Status |
| --- | --- | --- |
| Parent attribution |  |  |
| Join coverage |  |  |
| Window stability |  |  |
| Governed identity |  |  |
| Aggregate-only output |  |  |
| Suppression behavior |  |  |
| Small-cell suppression |  |  |

## Allowed Interim Use

Describe any caveat-only or availability-only use.

Do not surface low-count rows as examples.

## Blocked Use

List what this signal must not do while held.

## Decision

- `CONTINUE_HOLD`
- `NARROW_SCOPE`
- `PROMOTE_FOR_REVIEW`
- `REJECT_SIGNAL`
