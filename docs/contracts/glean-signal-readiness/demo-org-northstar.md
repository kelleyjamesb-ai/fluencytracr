# Seeded Demo: Northstar Enterprise

Source inventory: `examples/org-northstar-seeded-inventory.json`

Generated readiness map: `examples/org-northstar-weekly-readiness-map.json`

## Executive Summary

For the seeded org-window, FluencyTracr can already demonstrate how Glean-native signals translate into evidence readiness without using person-level attribution, raw prompts, model outputs, transcripts, or ranking fields.

## Measurable Now

- `workflow_run`: supports aggregate usage quality, behavior change, and coverage.
- `agent_run`: supports aggregate behavior change, capability growth, and coverage.
- `search_document_retrieval`: supports aggregate usage quality, calibration, and coverage.

## Not Computed Yet

- `mcp_usage`: approved in concept but waiting on confirmed export availability and scrubbed field set.

## Suppressed Pending Governance Review

- `ai_security`: available as an aggregate signal family, but withheld in the seeded map until governance confirms which policy/security flags can support exposure and leadership reinforcement evidence.

## Missing

- `skill_lifecycle`: not available in the seeded inventory. This is the clearest next data-access gap for capability-growth measurement.

## What This Unlocks

The seeded generator gives FluencyTracr a concrete target for future Glean adapters:

- confirm available signal families
- validate scrubbed export fields
- preserve stable join keys
- mark unsupported evidence as `missing`, `suppressed`, or `not_computed`
- avoid inferential claims when data is not ready
