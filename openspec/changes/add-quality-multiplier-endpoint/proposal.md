# Change: Add Quality Multiplier endpoint

## Why
Paul Li's time-saved pipeline needs a workflow-level adjustment that can discount or amplify raw time-saved estimates without turning FluencyTracr into an ROI engine or individual scoring system.

## What Changes
- Add a read-only `GET /api/v1/quality-multiplier` endpoint.
- Derive the multiplier from existing canonical workflow telemetry.
- Preserve fail-closed behavior: suppressed outputs return `multiplier: null`.
- Document the endpoint for value-realization consumers.

## Impact
- Affected specs: value-realization
- Affected code: backend read route and derive-on-read quality multiplier service
- No persistence or Prisma migration required.
