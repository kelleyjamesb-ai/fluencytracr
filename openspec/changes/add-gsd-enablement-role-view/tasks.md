# Tasks: add-gsd-enablement-role-view

## 1. OpenSpec scaffolding
- [x] 1.1 Create proposal.md, tasks.md, design.md, spec delta

## 2. ReadinessCoverageCard
- [x] 2.1 Create `frontend/src/components/gsd/ReadinessCoverageCard.tsx`
- [x] 2.2 Derive coverage from controls[].source === "policy_mapping" (training_attached absent from API)
- [x] 2.3 Render coverage bar + fraction label + degraded empty state

## 3. EnablementFocusHotspots
- [x] 3.1 Create `frontend/src/components/gsd/EnablementFocusHotspots.tsx`
- [x] 3.2 Accept policies prop; rank by unresolved_clauses desc
- [x] 3.3 Render top-5 list: policy name (truncated), unresolved count, RAG chip

## 4. EnablementActionQueue
- [x] 4.1 Create `frontend/src/components/gsd/EnablementActionQueue.tsx`
- [x] 4.2 Filter policies where latest_mapping === null
- [x] 4.3 Render count badge + list of unmapped policy names; empty state when clear

## 5. Wire EnablementView
- [x] 5.1 Fetch listPolicies + getComplianceStatus on mount (no listControls endpoint exists)
- [x] 5.2 Replace stub card with ReadinessCoverageCard, EnablementFocusHotspots, EnablementActionQueue
- [x] 5.3 Remove "Coming in V2" placeholder text

## 6. Build verification
- [x] 6.1 npm run build --workspace frontend — ✓ 499 modules, zero TS errors
- [x] 6.2 npm run test:ci --workspace backend — ✓ 228/228 pass
