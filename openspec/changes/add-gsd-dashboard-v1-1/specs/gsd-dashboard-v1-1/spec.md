## ADDED Requirements

### Requirement: Explainability Drawer with Evidence Metadata
The OperatorView heatmap SHALL replace the static explainability text div with
an `ExplainabilityDrawer` component that shows confidence counts, freshness
metadata, a relevant event chain, and policy/mapping references for the selected
heatmap row. The drawer SHALL use only data already fetched by the heatmap.

#### Scenario: Explainability drawer opens for a heatmap row
- WHEN an ADMIN clicks "Explain Why" on a heatmap row
- THEN the ExplainabilityDrawer SHALL render with the following sections:
  status rationale, confidence breakdown (enabled/disabled/partial/unknown counts),
  freshness metadata with FreshnessChip, up to 3 recent evidence events, and
  policy reference list

#### Scenario: Explainability drawer is not accessible to EXEC_VIEWER
- WHEN a user with role EXEC_VIEWER views the dashboard
- THEN ExplainabilityDrawer SHALL NOT appear in the DOM
- AND the heatmap SHALL NOT be rendered in the ExecBoardView section

#### Scenario: Unknown counts rendered explicitly
- WHEN confidence breakdown shows unknown > 0
- THEN the drawer SHALL display the unknown count with explicit grey styling
- AND SHALL NOT suppress or omit the unknown count from the breakdown

### Requirement: What Changed Panel with Time-Window Filter
The WhatChangedPanel SHALL render a compliance events timeline with a client-side
time-window toggle (7d / 30d / 60d / All) and a default window of 30d. When the
filtered result is empty, the panel SHALL display an explicit empty state message
directing the user to expand the window.

#### Scenario: Default 30d window filters events
- WHEN WhatChangedPanel mounts with a list of events
- THEN only events with created_at within the last 30 days SHALL be displayed
- AND the "30d" toggle SHALL be visually active

#### Scenario: Empty filtered result shown explicitly
- WHEN no events fall within the selected time window
- THEN the panel SHALL display "No events in this window — expand to All to
  see full history."
- AND SHALL NOT render a silent empty state

#### Scenario: WhatChangedPanel replaces inline event lists
- WHEN ExecBoardView renders its "What Changed Since Last Review" section
- THEN it SHALL use WhatChangedPanel instead of an inline event list
- WHEN ExecutiveHeatmapV1 renders its timeline section
- THEN it SHALL use WhatChangedPanel with the heatmap's recentEvents

### Requirement: Policy Mapping Reliability Card
The OperatorView SHALL render a `PolicyMappingReliabilityCard` that shows total
policies, mapping coverage count, total unresolved clauses, and a per-policy
list. The card SHALL replace the existing deferred stub for this widget.

#### Scenario: Policy mapping card shows coverage
- WHEN ADMIN opens Operator View and policies exist
- THEN PolicyMappingReliabilityCard SHALL display: total policy count, count of
  mapped vs unmapped policies, and total unresolved clause count

#### Scenario: Policy list shows no raw personal identifiers
- WHEN the policy list renders
- THEN each row SHALL show only a truncated policy_id, mapping status, and
  unresolved clause count
- AND SHALL NOT display any user email, name, or direct identifier

#### Scenario: No policies uploaded
- WHEN the org has no policies
- THEN the card SHALL display "No policies uploaded yet." with guidance to
  start in the Enablement section
- AND SHALL NOT display a silent empty state
