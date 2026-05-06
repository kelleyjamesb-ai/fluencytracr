# Change: Add Glean live-data access decision gate

## Why

The readiness integration must not quietly assume live Glean export or MCP-hosted access before field availability, scrub status, join keys, and governance approval are confirmed.

## What Changes

- Add a live-data access decision gate for Glean integration.
- Record Path C, admin-exported aggregate inventory upload, as the current pilot default.
- Define the evidence required before Path A customer event-log import or Path B Glean-hosted MCP/read access.
- Link the gate from the Glean overview, demo guide, and README.

## Impact

- Affected specs: `glean-signal-readiness`
- Affected docs: `docs/integrations/glean/07-live-data-access-decision-gate.md`, Glean overview, demo guide, README
