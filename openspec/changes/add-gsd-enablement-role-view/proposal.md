# Change: Add GSD Enablement Role View

## Why

EnablementView is the third GSD role but currently renders one component
and a stub. The three-role demo narrative (Exec → Operator → Enablement)
breaks here. Readiness coverage, focus hotspots, and an action queue can
all be derived from data already on the wire — no new endpoints needed.

## What Changes

- **NEW** `ReadinessCoverageCard` — org-aggregate % of controls with
  attached training material; sourced from existing `listControls` data.
- **NEW** `EnablementFocusHotspots` — top control areas by unresolved
  clause count; re-uses `listPolicies` already fetched in OperatorView.
- **NEW** `EnablementActionQueue` — policies uploaded but not yet mapped
  to any control; surfaces the actionable backlog for enablement leads.
- **MODIFIED** `EnablementView` — replaces stub card with the three
  components above; removes "Coming in V2" placeholder.

## Impact

- Affected capability: `gsd-enablement-role-view` (new)
- Affected code: `frontend/src/components/gsd/` (3 new components),
  `frontend/src/components/gsd/EnablementView.tsx` (minor wiring)
- No new backend endpoints
- Risk: low (additive; existing `GovernanceDocumentWorkspace` unchanged)
