# Change: Expand Glean Readiness for Skills and Auto Mode Agents

## Why
Glean Skills and Auto Mode Agents are now current value surfaces, not later roadmap concepts. FluencyTracr's Glean readiness source path should model Skill lifecycle and Auto Mode Agent lifecycle metadata as first-class computability signals so the Value Evidence Pack can distinguish ad hoc assistance from repeatable, skill-backed and agentic work.

## What Changes
- Extend the Glean source readiness adapter with `agent_run` and `skill_lifecycle` source fixture records.
- Add source fixtures for Auto Mode Agent lifecycle metadata and Skill lifecycle metadata.
- Update the source-derived readiness generator to include those fixtures by default.
- Regenerate the source-derived readiness map so Skills and Auto Mode Agent readiness are represented as present when safe aggregate metadata is available.

## Impact
- Affected specs: `glean-signal-readiness`
- Affected docs/examples: `docs/contracts/glean-signal-readiness/`
- Affected code: `shared/src/gleanSourceReadinessAdapter.ts`, `scripts/generate_glean_readiness_from_sources.mjs`
- Affected tests: backend readiness adapter and CLI contract tests
