# Tasks: add-gsd-enablement-role-view

## 1. OpenSpec scaffolding
- [x] 1.1 Create proposal.md, tasks.md, design.md, spec delta

## 2. ReadinessCoverageCard
- [ ] 2.1 Create `frontend/src/components/gsd/ReadinessCoverageCard.tsx`
- [ ] 2.2 Fetch controls via existing endpoint; compute % with training attached
- [ ] 2.3 Render coverage bar + fraction label (e.g. "14 of 20 controls covered")

## 3. EnablementFocusHotspots
- [ ] 3.1 Create `frontend/src/components/gsd/EnablementFocusHotspots.tsx`
- [ ] 3.2 Accept policies prop (passed from EnablementView); rank by unresolved count desc
- [ ] 3.3 Render top-5 list: policy name (truncated), unresolved clause count, RAG chip

## 4. EnablementActionQueue
- [ ] 4.1 Create `frontend/src/components/gsd/EnablementActionQueue.tsx`
- [ ] 4.2 Filter policies where mapped_controls === 0
- [ ] 4.3 Render count badge + list of unmapped policy names; empty state when clear

## 5. Wire EnablementView
- [ ] 5.1 Fetch `listPolicies` + `listControls` on mount
- [ ] 5.2 Replace stub card with ReadinessCoverageCard, EnablementFocusHotspots,
       EnablementActionQueue
- [ ] 5.3 Remove "Coming in V2" placeholder text

## 6. Build verification
- [ ] 6.1 npm run build --workspace frontend — zero TS errors
- [ ] 6.2 npm run test:ci --workspace backend — all pass
