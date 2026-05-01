# Plan: Seeded Glean Readiness Generator

## Scope

Build the next bounded slice for the Glean Signal Readiness Map:

1. Add a seeded Glean signal inventory fixture for a demo org.
2. Add a shared generator that converts that inventory into a validated `GSR_2026_05` readiness map.
3. Add a CLI command that writes the validated readiness map JSON.
4. Add a stakeholder-readable demo summary showing what is measurable now, what is missing, and what data access unlocks next.

## In

- `shared/src/gleanSignalReadinessSchemas.ts`
- `backend/tests/glean_signal_readiness_generator.test.ts`
- `docs/contracts/glean-signal-readiness/examples/`
- `docs/contracts/glean-signal-readiness/demo-org-northstar.md`
- `scripts/generate_glean_readiness_map.mjs`
- root `package.json` script
- OpenSpec change `add-seeded-glean-readiness-generator`

## Out

- No real Glean log ingestion.
- No adapter for WorkflowRun or MCP Usage exports yet.
- No individual, team, manager, role, ranking, or productivity fields.
- No frontend surface in this slice.

## Verification

- TDD red/green backend test for shared generator behavior.
- `npm run build --workspace shared`
- Run the generator command against the seeded inventory.
- Validate docs links/contract sweep.
- OpenSpec validation.
