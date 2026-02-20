# Spec: gsd-dashboard-shell

## ADDED Requirements

### Requirement: Role-Gated Dashboard Shell

The GSD Dashboard SHALL render a left sidebar with navigation sections visible only to
the user's assigned role. EXEC_VIEWER SHALL see the Board View only. ADMIN SHALL see
Board View, Operator View, and Enablement. ENABLEMENT_LEAD SHALL see Board View and
Enablement. Unknown roles SHALL default to the most restrictive view (Board View only).

#### Scenario: EXEC_VIEWER sees Board View only
- GIVEN a user with role EXEC_VIEWER is authenticated
- WHEN the GSD Dashboard loads at route /
- THEN the sidebar SHALL contain a "Board View" nav item
- AND the sidebar SHALL NOT contain an "Operator View" nav item in the DOM
- AND the sidebar SHALL NOT contain an "Enablement" nav item in the DOM

#### Scenario: ADMIN sees all three sections
- GIVEN a user with role ADMIN is authenticated
- WHEN the GSD Dashboard loads
- THEN the sidebar SHALL contain "Board View", "Operator View", and "Enablement" nav items

#### Scenario: ENABLEMENT_LEAD sees Board and Enablement
- GIVEN a user with role ENABLEMENT_LEAD is authenticated
- WHEN the GSD Dashboard loads
- THEN the sidebar SHALL contain "Board View" and "Enablement" nav items
- AND the sidebar SHALL NOT contain an "Operator View" nav item in the DOM

#### Scenario: Unknown role defaults to Board View
- GIVEN a user with an unrecognized role string is authenticated
- WHEN the GSD Dashboard loads
- THEN the system SHALL render the Board View only
- AND SHALL NOT render Operator View or Enablement section content

---

### Requirement: Freshness Badge Always Visible

Every status display in the GSD Dashboard SHALL be accompanied by a visible freshness
indicator. Unknown and suppressed states SHALL use explicit non-green visual treatment.

#### Scenario: FreshnessChip renders stale state
- GIVEN compliance data has freshness.stale = true or lastEventAt is null
- WHEN FreshnessChip renders
- THEN the chip SHALL have class gsd-freshness-stale or gsd-freshness-unknown
- AND SHALL NOT have class gsd-freshness-ok

#### Scenario: FreshnessChip renders fresh state
- GIVEN compliance data has freshness.stale = false and lastEventAt is set
- WHEN FreshnessChip renders
- THEN the chip SHALL have class gsd-freshness-ok

---

### Requirement: RagChip Never Green for Unknown Status

The RagChip atom SHALL render explicit green ONLY when control status is "enabled".
Status "unknown" SHALL render grey. There SHALL be no green fallback path for any
status other than "enabled".

#### Scenario: RagChip for unknown status
- GIVEN a compliance status value of "unknown"
- WHEN RagChip renders
- THEN the chip SHALL have class gsd-rag-unknown (grey)
- AND SHALL NOT have class gsd-rag-green

#### Scenario: RagChip for disabled status
- GIVEN a compliance status value of "disabled"
- WHEN RagChip renders
- THEN the chip SHALL have class gsd-rag-red

#### Scenario: RagChip for partial status
- GIVEN a compliance status value of "partial"
- WHEN RagChip renders
- THEN the chip SHALL have class gsd-rag-amber

---

### Requirement: Board Layer Widgets (V1)

The Board View section SHALL render for roles EXEC_VIEWER and ADMIN and SHALL include:
Enterprise Governance Posture (RagChip + FreshnessChip), Top 3 Focus Areas, Momentum
label, and What Changed Since Last Review timeline.

#### Scenario: Board View loads with compliance data
- GIVEN a user with role EXEC_VIEWER navigates to Board View
- WHEN getComplianceStatus and getComplianceEvents resolve successfully
- THEN Enterprise Governance Posture SHALL render a RagChip reflecting overall_status
- AND a FreshnessChip SHALL be rendered adjacent to the RagChip
- AND Top 3 Focus Areas SHALL render a non-empty list derived from control data
- AND the timeline SHALL show recent compliance events with timestamps

#### Scenario: Board View handles API error
- GIVEN getComplianceStatus returns an error
- WHEN ExecBoardView renders
- THEN each widget area SHALL render an explicit "Unavailable" or error state
- AND SHALL NOT render a neutral empty or loading-forever state

---

### Requirement: Operator View (V1)

The Operator View section SHALL render for role ADMIN only and SHALL include:
the ExecutiveHeatmapV1 component and labelled stub cards for deferred widgets.

#### Scenario: Operator View renders heatmap
- GIVEN a user with role ADMIN navigates to Operator View
- WHEN OperatorView renders
- THEN ExecutiveHeatmapV1 SHALL be present in the DOM
- AND each heatmap row SHALL include posture, confidence, and freshness columns

#### Scenario: Operator View stub cards labelled correctly
- GIVEN a user with role ADMIN is in Operator View
- WHEN deferred widget areas render
- THEN each stub card SHALL state the widget name and "Available in V1.1" or "Available in V2"
- AND SHALL include the reason (e.g., "requires backend control history endpoint")

---

### Requirement: Enablement View (V1)

The Enablement View section SHALL render for roles ADMIN and ENABLEMENT_LEAD and SHALL
include: GovernanceDocumentWorkspace and WorkflowStepRail with 5-step GSD configuration.

#### Scenario: Enablement View workflow rail shows 5 steps
- GIVEN a user with role ENABLEMENT_LEAD navigates to Enablement View
- WHEN EnablementView renders
- THEN WorkflowStepRail SHALL show 5 steps: Parse, Upload, Select Policy, Run Mapping, Review Hotspots

#### Scenario: Enablement View document workspace is read-only for ENABLEMENT_LEAD
- GIVEN a user with role ENABLEMENT_LEAD is in Enablement View
- WHEN GovernanceDocumentWorkspace renders
- THEN the workspace SHALL display the read-only note for non-admin users
- AND destructive actions (delete, upload) SHALL be hidden or disabled

---

### Requirement: No Individual Attribution in Any Shell View

All widgets in all three GSD Dashboard sections SHALL operate on organization-level
aggregate data only. No row, cell, or label in any section SHALL reference an individual
user, email address, or person-level score.

#### Scenario: Heatmap rows reference only aggregate domains
- GIVEN OperatorView renders the ExecutiveHeatmapV1 component
- WHEN heatmap rows are inspected
- THEN no row SHALL reference an individual user identifier
- AND each row SHALL reference only aggregate governance dimensions

#### Scenario: Focus Areas list is non-punitive
- GIVEN ExecBoardView derives Top 3 Focus Areas from control data
- WHEN the focus areas list renders
- THEN no item SHALL name or score an individual contributor
- AND each item SHALL describe an organizational control or coverage theme
