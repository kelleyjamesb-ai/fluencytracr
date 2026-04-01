# Updates 2026-02-21: Glean, Evidence, MCP

## Locked Decisions
- Glean-first integration focus
- EvidenceBundle v1 is a stable partner contract
- /api/ingest is recommended partner-facing async ingest facade
- /api/events remains strict canonical validator
- MCP is an adapter tool surface for agentic integrations, not the core telemetry pipeline
- Behavioral signals include human plus agentic
- Executive observability is irreducibly aggregated with suppression, no attribution

## Canonical Sources of Truth
- Canonical: docs/** markdown, shared/** schemas, docs/contracts/**
- PDFs are exports only

## File-by-file Change List
- Added this decision lock document: `docs/UPDATES_2026-02-21_GLEAN_EVIDENCE_MCP.md`
- Updated governance CI gate specification: `docs/CI_GOVERNANCE_GATES.md`
- Added discoverability link from docs README: `docs/en/README.md`

## Acceptance Criteria
- CI fails if EvidenceBundle schema or examples missing
- CI fails if /api/ingest docs missing
- CI fails if Glean integration pack missing
- CI fails if contract changes without docs plus schema plus examples updated

## PR Sequence
- PR 1: Docs lock-in and CI governance gate updates for Glean, EvidenceBundle, and MCP framing
- PR 2: CI implementation wiring for contract-presence and validation checks
- PR 3: Follow-up hardening and guardrail tests for agentic integration regressions
