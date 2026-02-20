# Design: GSD Dashboard V1.1

## ExplainabilityDrawer

Current state: `ExecutiveHeatmapV1` tracks `activeExplainability: string | null`
and renders a single `gc-heatmap-explain` div with a static `row.explainability`
string. The button is labelled "Explain Why" / "Hide Why" inline in the heatmap row.

Target: A structured `ExplainabilityDrawer` component that receives the full
`HeatRow` plus the raw compliance and policy data slices it needs to render
evidence metadata.

Props:
```ts
type ExplainabilityDrawerProps = {
  row: HeatRow;                           // area, posture, confidence, freshness
  counts: ComplianceStatusResponse["counts"];
  freshness: ComplianceStatusResponse["freshness"] | undefined;
  policies: PolicySummary[];
  recentEvents: ComplianceEventsResponse["events"];
  onClose: () => void;
};
```

Sections rendered:
1. **Status rationale** — the existing `row.explainability` text, given prominence
2. **Confidence breakdown** — enabled / disabled / partial / unknown counts as a
   small inline table (data already in `ComplianceStatusResponse.counts`)
3. **Freshness metadata** — last_event_at timestamp + stale boolean with
   explicit "Stale" or "Fresh" badge (uses `FreshnessChip`)
4. **Evidence chain** — last 3 events relevant to this row, showing event_type +
   policy_id + created_at (data already fetched by heatmap as `recentEvents`)
5. **Policy references** — list of policy IDs with their mapping status
   (data already in `policies[]`)

Decision: Pass evidence data as props rather than re-fetching inside the drawer.
The heatmap already fetches all this data; passing props avoids double requests.

## WhatChangedPanel

Current state: Two parallel implementations — inline `<ul>` in `ExecBoardView`
(last 6 events, no filter) and inline `gc-heatmap-timeline` in `ExecutiveHeatmapV1`
(last 6 events, no filter).

Target: A shared `WhatChangedPanel` component with:
- Props: `events: ComplianceEventsResponse["events"]`, `isLoading?: boolean`
- Internal state: `window: "7d" | "30d" | "60d" | "all"` (default: "30d")
- Filtering: client-side; filter `events` array by `created_at >= now - window`
- Display: same `gc-timeline`-style list, with window toggle buttons above

Decision: The API already returns events with `created_at` timestamps so client-
side filtering is sufficient. No new endpoint needed.

Decision: Replace both existing inline event lists with `WhatChangedPanel`.
`ExecBoardView` passes its `events` state; `ExecutiveHeatmapV1` passes its
`recentEvents` state. The heatmap should fetch more events (increase limit to 30)
so filtering produces meaningful results.

## PolicyMappingReliabilityCard

Current state: "Policy Mapping Reliability" exists as row 2 of the heatmap
showing only a Posture / Confidence / Freshness cell. The stub in OperatorView
references it as deferred.

Target: A standalone `PolicyMappingReliabilityCard` that shows:
- Total policies uploaded
- Count of policies with a mapping vs without
- Total unresolved clauses across all mapped policies
- Per-policy list with: policy_id (truncated), mapped (yes/no), unresolved count

Data: already available from `governanceApi.listPolicies()` — `PolicySummary[]`
with `latest_mapping.unresolved_clauses` and `latest_mapping.status`.

Decision: `OperatorView` fetches its own `listPolicies` call rather than having
`PolicyMappingReliabilityCard` fetch internally — consistent with how
`ExplainabilityDrawer` receives data as props, keeps components testable.

## Risks

- Risk: Explainability drawer shows too much information, overwhelming EXEC_VIEWER
  — Mitigation: `ExplainabilityDrawer` is only rendered inside `ExecutiveHeatmapV1`
  which is only rendered inside `OperatorView` (ADMIN-only). EXEC_VIEWER never
  reaches it.
- Risk: Client-side time filtering returns empty results if event window is small
  — Mitigation: When filtered result is empty, render "No events in this window —
  expand to All to see full history." Never render an empty state silently.
- Risk: Policy list exposes raw UUIDs
  — Mitigation: Truncate to first 8 chars with `policy.policy_id.slice(0, 8)`
  following the existing pattern in ExecBoardView.
