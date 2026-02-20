# Tasks: add-gsd-dashboard-v1-1

## 1. OpenSpec scaffolding
- [x] 1.1 Create proposal.md, design.md, tasks.md
- [x] 1.2 Create specs/gsd-dashboard-v1-1/spec.md with ADDED requirements

## 2. ExplainabilityDrawer component
- [x] 2.1 Create frontend/src/components/gsd/ExplainabilityDrawer.tsx
- [x] 2.2 Render: status rationale, confidence counts, FreshnessChip, event chain, policy refs
- [x] 2.3 Update ExecutiveHeatmapV1: replace gc-heatmap-explain div with ExplainabilityDrawer
- [x] 2.4 Increase ExecutiveHeatmapV1 event fetch limit to 30 for richer evidence chain

## 3. WhatChangedPanel component
- [x] 3.1 Create frontend/src/components/gsd/WhatChangedPanel.tsx
- [x] 3.2 Implement 7d / 30d / 60d / All toggle with client-side filter
- [x] 3.3 Render explicit empty state when filtered result is empty
- [x] 3.4 Replace inline event list in ExecBoardView with WhatChangedPanel
- [x] 3.5 Replace gc-heatmap-timeline in ExecutiveHeatmapV1 with WhatChangedPanel

## 4. PolicyMappingReliabilityCard component
- [x] 4.1 Create frontend/src/components/gsd/PolicyMappingReliabilityCard.tsx
- [x] 4.2 Render: total count, mapped/unmapped split, unresolved total, per-policy list
- [x] 4.3 Update OperatorView: fetch listPolicies, render card, remove stub
- [x] 4.4 Verify no personal identifiers rendered (policy_id truncated to 8 chars)

## 5. Build verification
- [x] 5.1 npm run build --workspace frontend — ✓ 496 modules, zero TS errors
- [x] 5.2 npm run test:ci --workspace backend — ✓ 228/228 pass
