# Change: Add Phase 2 Orientation-Only Signals

## Why
Provide an orientation-only presence signal that is non-evaluative, non-narrative, and fail-closed under ambiguity.

## What Changes
- Add shared schemas for orientation-only signal responses.
- Add a read-only orientation endpoint that defaults to suppression and validates its response.
- Add tests for orientation API behavior.

## Impact
- Affected specs: orientation-signals
- Affected code: shared schemas, backend API
