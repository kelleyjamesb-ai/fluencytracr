# Change: Add GSD Dashboard V1.1 — Explainability, Time-Window Filter, Mapping Reliability

## Why

The V1 shell ships three role views with working widgets but the Operator layer
uses a static explainability text string per heatmap row and does not surface
evidence metadata (policy IDs, mapping IDs, confidence counts, event chain).
The "What Changed" timeline has no time-window filter and is buried inside two
separate components. Policy Mapping Reliability exists only as a heatmap row,
not as a standalone actionable card.

Per the GSD spec Phase V1.1, these gaps block CTO/CISO traceability:
- "Can trace any heatmap cell to explainability and evidence lineage"
- "What changed since last review" as a dedicated generated view
- Risk acceptance and ownership metadata (backend endpoint deferred to V2)

## What Changes

- **NEW** `ExplainabilityDrawer` component — replaces the static `gc-heatmap-explain`
  div in `ExecutiveHeatmapV1` with a structured evidence panel showing confidence
  counts, freshness metadata, relevant event chain, and policy/mapping references.
- **NEW** `WhatChangedPanel` component — standalone timeline with 7d / 30d / 60d /
  All time-window toggle, usable from both ExecBoardView and OperatorView.
- **NEW** `PolicyMappingReliabilityCard` component — per-policy mapping status,
  unresolved clause count, and parse error summary in a standalone card inside
  OperatorView (replaces the "Policy Mapping Reliability" stub).
- **MODIFIED** `ExecutiveHeatmapV1` — swaps the inline explainability div for
  `ExplainabilityDrawer`, passes `HeatRow` evidence props.
- **MODIFIED** `ExecBoardView` — replaces inline event list with `WhatChangedPanel`.
- **MODIFIED** `OperatorView` — adds `PolicyMappingReliabilityCard`; keeps two
  remaining stubs (Control Drift, Fail-Closed Warning Feed) as V1.1 deferred.

## Impact

- Affected capability: `gsd-dashboard-v1-1` (new)
- Affected code: `frontend/src/components/gsd/` (3 new components),
  `frontend/src/components/governanceConcept/ExecutiveHeatmapV1.tsx` (minor),
  `frontend/src/components/gsd/ExecBoardView.tsx` (minor),
  `frontend/src/components/gsd/OperatorView.tsx` (minor)
- No new backend endpoints required for this slice
- Risk: low (additive; no existing render path removed)
