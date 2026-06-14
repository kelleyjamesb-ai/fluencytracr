# Change: Add Glean AI Work Evidence Adapter

## Why
The Value Evidence Pack needs a metadata-only bridge from current Glean work surfaces into readiness and claim evaluation. WorkflowRun-only ingestion is too narrow now that Skills, Auto Mode Agents, MCP/actions, artifacts, and runtime controls are current value surfaces.

## What Changes
- Add a `GAW_2026_05` Glean AI Work Evidence export schema.
- Map AI work evidence lanes into Glean Signal Readiness inventory records.
- Map AI work evidence lanes into deterministic Glean Claim Evaluation records.
- Add a synthetic metadata-only export example.
- Reject raw content and arbitrary free-text action fields before mapping.

## Impact
- Affected specs: `glean-ai-work-evidence`
- Affected docs: `docs/contracts/glean-ai-work-evidence/`
- Affected code: `shared/src/`
- Affected tests: backend adapter tests
