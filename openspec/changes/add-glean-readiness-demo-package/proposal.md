# Change: Add Glean readiness demo package

## Why

Reviewers need a single stakeholder-facing path that explains the Glean readiness value story without reading source code. The demo should separate measurable-now signals from blocked, suppressed, and missing families.

## What Changes

- Add a Glean readiness demo guide with narrative, assets, commands, agent question examples, and non-goals.
- Link seeded readiness, source-derived readiness, derived EvidenceBundle, and MCP readiness summary artifacts.
- Update the Northstar seeded demo summary with source-derived and MCP readiness references.
- Add the guide to the README canonical docs list.

## Impact

- Affected specs: `glean-signal-readiness`
- Affected docs: `docs/integrations/glean/06-readiness-demo-guide.md`, `docs/contracts/glean-signal-readiness/demo-org-northstar.md`, `README.md`
