# Change: Add GSD Dashboard Shell with Role-Based Navigation

## Why

The current `/` route renders `GovernanceConcept.tsx`, a flat single-column concept
prototype with no persistent navigation and no role-layer awareness.
`docs/GSD_EXEC_DASHBOARD_SPEC_PACK.md` defines three distinct role layers —
CEO/Board, CTO/CISO Operator, and Admin/Enablement — each requiring its own widget
set and decision altitude. Without a proper shell the three layers are collapsed into
one view that is neither complete for any role nor safe for the most restrictive role.

## What Changes

- **NEW** `GSDDashboard` page at route `/` — replaces GovernanceConcept as primary entry
- **NEW** `ExecBoardView` component — Board layer: RAG posture, Focus Areas, Momentum, Timeline
- **NEW** `OperatorView` component — Operator layer: reuses ExecutiveHeatmapV1 + stub cards
- **NEW** `EnablementView` component — Enablement layer: reuses GovernanceDocumentWorkspace
- **NEW** `FreshnessChip` atom — always-rendered freshness badge (governance Gate A2/B1)
- **NEW** `RagChip` atom — explicit RAG posture with grey unknown branch (governance Gate B2)
- **MODIFIED** `useGovernanceContext` — adds `isExecViewer` and `isEnablementLead` booleans
- **MODIFIED** `main.tsx` — `/` → GSDDashboard, `/concept` → GovernanceConcept (moved)
- **MODIFIED** `styles.css` — ~100 lines of `.gsd-*` classes appended (no removals)
- **MODIFIED** `WorkflowStepRail.tsx` — optional `steps` prop for 5-step GSD rail
- **DEFERRED** V1.1/V2 widgets — Control Drift Panel, Fail-Closed Feed, Risk Acceptance,
  Enablement Hotspots shown as labelled stub cards; require new backend endpoints

## Impact

- Affected capability: new `gsd-dashboard-shell`
- Affected frontend files: `pages/`, `components/gsd/`, `hooks/useGovernanceContext.ts`,
  `main.tsx`, `styles.css`, `components/governanceConcept/WorkflowStepRail.tsx`
- No new backend endpoints required for this slice
- No existing tests affected — backend unchanged, legacy routes preserved
- Risk: low-medium (additive; all existing routes `/concept` and `/legacy-dashboard` intact)

## Governance Attestation

This change preserves all five product intent invariants from the GSD Governance
Checklist:
1. Org-level signals only — no individual attribution in any new component
2. Suppression/unknown explicit — FreshnessChip and RagChip have no neutral-green
   fallback for unknown states
3. Role isolation — GSDDashboard positive-checks role for each nav item and double-gates
   section content; unknown roles default to most restrictive view
4. Directional language — all new copy uses "signals suggest" / "observed posture" framing
5. Audit trails — HeroActionWorkspace and GovernanceDocumentWorkspace unchanged
