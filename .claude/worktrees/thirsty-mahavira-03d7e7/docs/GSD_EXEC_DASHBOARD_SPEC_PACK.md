# GSD-Build Role Dashboard Spec Pack

Last updated: 2026-02-17
Scope: Governance Intelligence Dashboard for CEO, CTO, CISO, Admin, Enablement Lead

## 1) Goal
Create a governance-first, non-punitive dashboard system where each role gets role-appropriate decision support from the same evidence model.

## 2) Single Evidence Model (Source-of-Truth Contract)
All role views derive from the same canonical fields:
- `org_id`
- `as_of`
- `schema_version`
- `mode` (`shadow` | `enforced`)
- `control_name`
- `status` (`enabled` | `disabled` | `partial` | `unknown`)
- `confidence` (`0.0-1.0`)
- `freshness.last_event_at`
- `freshness.stale` (`true` | `false`)
- `suppressed_count`
- `unresolved_clauses`
- `event_type`
- `event_id`
- `policy_id`
- `mapping_id`
- `owner` (for action items)
- `due_at` (for action items)
- `risk_acceptance` metadata (optional for V1.1)

Rules:
- Unknown and suppressed states must be explicit.
- No person-level ranking, scoring, or punitive language.
- Every status tile must be traceable to auditable event lineage.

## 3) Role Layers

### 3.1 CEO Board Layer
Decision question: "Are we safer and more effective this quarter, and where do we focus?"

Widgets:
1. `Enterprise Governance Posture`
- Output: Red/Amber/Green + confidence + trend arrow
- Data: aggregate control statuses + confidence + freshness

2. `Top 3 Focus Areas`
- Output: short list of non-punitive focus themes
- Data: watchlist/blocked control clusters + unresolved hotspots

3. `Momentum (30/60/90d)`
- Output: improving/stable/declining
- Data: compliance status refresh trend + unresolved trend + stale trend

4. `Risk Acceptance Snapshot`
- Output: open accepted risks, expiring soon, overdue
- Data: exception/risk acceptance records

5. `What Changed Since Last Review`
- Output: concise timeline summary
- Data: compliance events filtered to high-impact event types

### 3.2 CTO/CISO Operator Layer
Decision question: "Which domains are drifting and what technical/governance action is needed?"

Widgets:
1. `Governance Heatmap`
- Rows: business domains/functions (aggregate only)
- Columns: core controls + mapping readiness + freshness
- Cell: status + confidence + staleness badge

2. `Control Drift Panel`
- Output: controls changed recently and direction of change
- Data: control state history + event timeline

3. `Policy Mapping Reliability`
- Output: mapped controls %, unresolved clause backlog, failed parses
- Data: policy/mapping endpoints + upload outcomes

4. `Fail-Closed and Warning Feed`
- Output: fail-closed reasons and operational blockers
- Data: fail-closed events + service readiness indicators

5. `Explainability Drawer`
- Output: why this cell is this status, with evidence references
- Data: causal event chain, policy mapping, freshness metadata

### 3.3 Admin/Enablement Execution Layer
Decision question: "What exact next actions must be done now?"

Widgets:
1. `Workflow State Rail`
- Steps: Parse -> Upload -> Select Policy -> Run Mapping -> Review Hotspots
- CTA highlight follows required next action

2. `Policy Upload and Mapping Queue`
- Multi-doc parse/upload state + per-file errors
- Batch success/failure and follow-up guidance

3. `Unresolved Clause Action Queue`
- Map/Ignore/Defer with rationale and audit logging

4. `Operational Readiness`
- org bootstrap state, role state, API connectivity, staleness flags

5. `Enablement Focus Hotspots`
- Aggregate areas where enablement work is needed
- No individual attribution

## 4) UI Semantics
- `Aligned`: control posture healthy and fresh
- `Watch`: partial/aging confidence or emerging unresolved growth
- `Blocked`: disabled/critical unresolved condition
- `Unknown/Suppressed`: insufficient safe evidence, intentionally withheld

Visual rules:
- Green is not "done forever"; freshness badge always visible.
- Unknown/suppressed never rendered as neutral success.
- Heatmap legend and non-punitive interpretation guidance always present.

## Executive Panels (fixed)

### 1) Exposure
- What fields are displayed (EvidenceBundle v1 mapping):
  - `exposure.shadow_ai`
  - `exposure.unsanctioned_tool_class`
  - `suppression.suppression_applied`
  - `suppression.suppression_reasons`
  - `window`
  - `generated_at`
- What is forbidden:
  - `team_id`
  - `manager_id`
  - ranking fields
  - comparative rank lists
- Decision levers supported:
  - strengthen sanctioned tool policy controls
  - prioritize org-level guardrail communications
  - tune policy checks for unsanctioned exposure patterns
- Suppression behavior and messaging:
  - when suppressed, show `Suppressed due to privacy and safety constraints`
  - display suppression reason codes only, never inferred substitute values

### 2) Calibration posture
- What fields are displayed (EvidenceBundle v1 mapping):
  - `calibration.verification_presence`
  - `calibration.recovery_presence`
  - `calibration.escalation_to_safe_path_presence`
  - `learning.trend_direction`
  - `window`
  - `generated_at`
- What is forbidden:
  - `team_id`
  - `manager_id`
  - ranking fields
  - comparative rank lists
- Decision levers supported:
  - reinforce verification expectations in high-risk workflows
  - invest in recovery and escalation enablement
  - refine governance guardrails for safe-path routing
- Suppression behavior and messaging:
  - when suppression is active, render calibration state as suppressed
  - include reason codes and hide subgroup comparisons

### 3) Fragility indicators
- What fields are displayed (EvidenceBundle v1 mapping):
  - `fragility.friction_loops_elevated`
  - `fragility.rapid_abandonment_elevated`
  - `fragility.blind_acceptance_risk_elevated`
  - `suppression.suppression_applied`
  - `suppression.suppression_reasons`
  - `window`
- What is forbidden:
  - `team_id`
  - `manager_id`
  - ranking fields
  - comparative rank lists
- Decision levers supported:
  - prioritize workflow stabilization initiatives
  - target verification interventions for blind-acceptance risk
  - schedule governance reviews for recurring fragility patterns
- Suppression behavior and messaging:
  - show suppressed state when k-min or aggregation constraints apply
  - message as `Insufficient safely reportable evidence for executive view`

### 4) Coverage map
- What fields are displayed (EvidenceBundle v1 mapping):
  - `coverage.instrumented_sources`
  - `coverage.missing_sources`
  - `coverage.coverage_notes`
  - `suppression.suppression_applied`
  - `window`
  - `generated_at`
- What is forbidden:
  - `team_id`
  - `manager_id`
  - ranking fields
  - comparative rank lists
- Decision levers supported:
  - prioritize instrumentation gaps
  - authorize integration work for missing sources
  - validate org-level evidence sufficiency before policy changes
- Suppression behavior and messaging:
  - if suppression applies, keep coverage source classes visible but suppress sensitive aggregates
  - explicitly state that missing-source visibility does not imply individual attribution

## 5) Acceptance Criteria by Role

### CEO
- Can identify posture + top 3 focus areas in under 30 seconds.
- Can see "what changed" since last review with timestamped summary.
- Cannot access person-level views.

### CTO
- Can identify top technical governance drifts and affected domains.
- Can trace any heatmap cell to explainability and evidence lineage.

### CISO
- Can validate compliance posture with deterministic controls and freshness.
- Can export evidence with schema version and reproducibility metadata.

### Admin
- Can complete upload->mapping flow with clear step guidance.
- Sees exact failure reason and recovery path for each failed stage.

### Enablement Lead
- Can see aggregate behavior hotspots tied to governance outcomes.
- Can define intervention targets without individual attribution.

## 6) Data/API Requirements

Use existing first (V1):
- `GET /orgs/:orgId/compliance/status`
- `GET /orgs/:orgId/compliance/events`
- `GET /orgs/:orgId/policies`
- `GET /orgs/:orgId/policies/:policyId/mapping`
- `POST /orgs/:orgId/policies/upload`
- `POST /orgs/:orgId/policies/:policyId/map`

Potential V1.1/V2 additions:
- `GET /orgs/:orgId/compliance/heatmap?groupBy=function|domain`
- `GET /orgs/:orgId/compliance/risk-acceptances`
- `GET /orgs/:orgId/compliance/actions`

## 7) Phased Build Plan

### Phase V1 (Immediate)
1. Add CEO summary row to executive panel.
2. Add CTO/CISO heatmap V1 from existing aggregate data.
3. Add workflow state rail and dynamic CTA highlighting.
4. Add explicit unknown/suppressed semantics and legend.
5. Add precise error and next-step messaging.

### Phase V1.1
1. Add risk acceptance and ownership metadata.
2. Add explainability drawer per heatmap cell.
3. Add "what changed since last review" generated view.

### Phase V2
1. Add function/domain aggregation endpoint if needed for depth.
2. Add trend analytics and SLO-backed freshness warnings.
3. Add export packets tailored for CISO/board review.

## 8) Team Responsibilities
- Project Lead (Codex): sequencing, integration, acceptance gates
- Frontend Engineer: role views, heatmap UX, state rail, explainability UI
- Backend Engineer: aggregation and action endpoints as needed
- QA/Test Engineer: role-based E2E, state transitions, regression coverage
- Governance Reviewer: language guardrails, non-punitive semantics, audit-first checks

## 9) Risks and Guardrails
- Risk: visual heatmap interpreted as performance scorecard
  - Guardrail: explicit interpretation panel + forbidden language filters
- Risk: stale/partial data interpreted as certainty
  - Guardrail: freshness and confidence badges mandatory
- Risk: "source-of-truth" claim without traceability
  - Guardrail: evidence linkage and event lineage required in aggregated trace views

## 10) Immediate Next Implementation Slice
1. Build `ExecutiveHeatmapV1` component under governance concept path.
2. Add `WorkflowStepRail` component to document workspace.
3. Add shared type contract for heatmap cells and role summaries.
4. Add tests for role visibility and next-action highlighting.
