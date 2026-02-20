# Tasks: add-gsd-dashboard-shell

## 1. OpenSpec scaffolding
- [x] 1.1 Create proposal.md, tasks.md, design.md
- [x] 1.2 Create specs/gsd-dashboard-shell/spec.md with ADDED requirements

## 2. CSS extension
- [ ] 2.1 Append .gsd-shell-nav-section, .gsd-shell-section-label to styles.css
- [ ] 2.2 Append .gsd-freshness-badge, .gsd-freshness-ok, .gsd-freshness-stale, .gsd-freshness-unknown
- [ ] 2.3 Append .gsd-rag, .gsd-rag-green, .gsd-rag-amber, .gsd-rag-red, .gsd-rag-unknown
- [ ] 2.4 Append .gsd-role-badge, .gsd-stub-card, responsive rules

## 3. Hook extension
- [ ] 3.1 Add isExecViewer and isEnablementLead to useGovernanceContext.ts
- [ ] 3.2 Verify all existing consumers of isAdmin/role continue to compile

## 4. Atomic components
- [ ] 4.1 Create frontend/src/components/gsd/FreshnessChip.tsx
- [ ] 4.2 Create frontend/src/components/gsd/RagChip.tsx

## 5. Section view components
- [ ] 5.1 Create frontend/src/components/gsd/ExecBoardView.tsx
- [ ] 5.2 Create frontend/src/components/gsd/OperatorView.tsx
- [ ] 5.3 Create frontend/src/components/gsd/EnablementView.tsx

## 6. WorkflowStepRail extension
- [ ] 6.1 Add optional steps prop to WorkflowStepRail.tsx
- [ ] 6.2 Verify existing 2-step usage in GovernanceDocumentWorkspace still compiles

## 7. GSDDashboard page
- [ ] 7.1 Create frontend/src/pages/GSDDashboard.tsx
- [ ] 7.2 Wire Sidebar (existing) with role-gated items array
- [ ] 7.3 Implement section switching with role default and double-gate guard
- [ ] 7.4 Move session controls into sidebar footer <details>

## 8. Routing
- [ ] 8.1 Update main.tsx: / → GSDDashboard, /concept → GovernanceConcept
- [ ] 8.2 Add link from GovernanceConcept to / ("New Dashboard")

## 9. Build and governance verification
- [ ] 9.1 npm run build --workspace shared && npm run build --workspace frontend (zero TS errors)
- [ ] 9.2 npm run test:ci --workspace backend (228/228 pass, backend unchanged)
- [ ] 9.3 Smoke: / as EXEC_VIEWER — "Operator View" absent from sidebar DOM
- [ ] 9.4 Smoke: / as ADMIN — all three nav items present, each section renders
- [ ] 9.5 Smoke: FreshnessChip shows "Stale" (not green) when no recent events
- [ ] 9.6 Smoke: RagChip renders grey (not green) for unknown status
- [ ] 9.7 Smoke: /concept loads GovernanceConcept, /legacy-dashboard loads Dashboard
