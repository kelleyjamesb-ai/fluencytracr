# AI Value Pilot Scope Lock

Status: scope lock only

Phase: `phase-ai-value-pilot-product-scope-lock`

This document locks the first full FT + Glean Value Playbook pilot scope. It
does not create migrations, Prisma schema changes, backend routes, frontend UI,
ingestion jobs, customer-facing readouts, claim readiness snapshot persistence,
executive readout snapshot persistence, ROI proof, EBITA output, causality
claims, productivity claims, headcount claims, individual attribution, blocked
manager/team ranking, blocked people decisioning, or customer-facing financial
output.

## 1. Decision

The first productized pilot should use:

- workflow: `customer_support_case_resolution`
- value route: `capacity_creation`
- primary customer metric: `support_median_resolution_hours`
- supporting customer metrics: `support_backlog_count`, `support_reopen_rate`,
  and `support_escalation_rate`
- Layer 1 source posture: aggregate Glean telemetry plus VBD operating map
- Layer 2 source posture: aggregate AI Fluency baseline and, when available,
  aggregate AI Fluency retest or user voice/workflow observation
- Layer 3 source posture: customer-attested support-system baseline and
  comparison exports for the selected metrics
- governance posture: k-min, suppression, source readiness, raw-content
  exclusion, source owner attestation, and finance/business-owner approval
  where financial translation is requested

This is the narrowest useful pilot because support workflows have clear
customer-owned operating metrics, existing repo examples, and an evidence path
that can remain aggregate without becoming employee productivity measurement.

## 2. Product Hypothesis

If a customer support organization uses Glean Search, Assistant, approved
Skills, or workflow agents in case-resolution work, then eligible aggregate
support cases should show better capacity posture over time while quality,
trust, and escalation caveats remain explicit.

The pilot may investigate whether AI-enabled support work is associated with:

- lower median resolution hours;
- lower or stable backlog count;
- lower escalation rate;
- stable or improved reopen rate.

The pilot must not claim that Glean caused those movements unless a later
customer-owned causal validation design explicitly supports that claim. The
default output is a governed value demonstration, not causal proof.

## 3. Why Customer Support Is The First Pilot

Customer support is the best first workflow because:

- the repo already contains customer-support Blueprint, Metrics Library, Value
  Scenario, ROI Scenario, outcome evidence, and readout examples;
- the primary metric can be exported as aggregate workflow-window data from a
  customer support system of record;
- the value route is concrete: capacity creation from faster aggregate
  resolution patterns;
- quality guardrails can be attached through reopen rate, escalation rate,
  verification coverage, and customer-owned caveats;
- the workflow avoids broad "employee productivity" framing;
- VBD can show movement in AI-enabled support work without being treated as
  financial proof.

Deferred first-pilot candidates:

| Candidate | Why not first |
| --- | --- |
| Sales / RFP cycle time | Useful, but more customer-specific and often harder to standardize across systems. |
| IT/helpdesk resolution | Viable second pilot, but current repo examples are less complete than support. |
| Broad employee productivity | Too ambiguous and too likely to violate claim and people-analytics boundaries. |
| Organization-wide ROI | Too broad for the first productized run; should be assembled from validated workflow pilots. |

## 4. Required Evidence Packet

The pilot evidence packet must include all Playbook layers before full coverage
or governed financial translation can be considered.

| Layer | Required pilot input | Source package posture | First-run expectation |
| --- | --- | --- | --- |
| Layer 1 telemetry | Aggregate Glean telemetry for support workflow activity, source readiness, eligible cohort size, suppression posture, and VBD movement | `layer_1_bigquery_telemetry_summary` | Required for every run. |
| Layer 2 user voice | Aggregate AI Fluency baseline plus aggregate user voice/workflow observation; retest for later windows | `layer_2_user_voice_empirical_export` | Baseline required; retest may be comparison-window pending in the first run. |
| Layer 3 system of record | Aggregate support metric baseline and comparison export for median resolution hours, with supporting backlog/reopen/escalation metrics where available | `layer_3_business_system_of_record_outcome_export` | Required before full Playbook coverage or financial translation. |
| Governance | Source readiness state, data boundary state, k-min posture, forbidden-field checks, raw-content exclusion, source-owner attestation | `governance_control_export` | Required before full Playbook coverage. |
| Assumptions | Customer-owned assumption approval; finance/business approval when financial translation is requested | `assumption_approval_export` | Required before internal ROI scenario review. |

Aggregate workforce context is optional. If provided, it can only appear as
aggregate, cohort-safe, source-owner-approved, non-decisioning context. It
cannot upgrade Playbook coverage or support people, manager, team, productivity,
or HRIS claims.

## 5. VBD Role In The Pilot

VBD is the Layer 1 operating map for the support workflow.

The first pilot should track VBD over reporting windows:

| VBD dimension | Pilot question | Example movement signal | Claim boundary |
| --- | --- | --- | --- |
| Velocity | Is AI-enabled support work increasing over time? | Aggregate workflow runs, assistant/search sessions, or eligible AI-assisted support activity by window | Not ROI, productivity, causality, or financial proof. |
| Breadth | Is AI-enabled support work spreading across approved aggregate slices? | Aggregate spread across support workflow surfaces, approved role-family cohorts, or use-case slices where k-min clears | No individual, manager, team, or department ranking. |
| Depth | Is AI becoming embedded in repeatable support workflow behavior? | Repeat workflow behavior, verification/corroboration, recovery, artifact, skill, or agent lifecycle posture where governed | Value relevance requires Layer 2/3 evidence and caveats. |

The movement graphic should show VBD as time-series context beside AI Fluency
and customer outcome metrics. It should not present a single "AI value score."

Recommended first graphic structure:

```text
Reporting window
-> Velocity movement
-> Breadth movement
-> Depth movement
-> AI Fluency/user voice movement
-> customer metric movement
-> Playbook coverage status
-> claim readiness state
```

## 6. Software Boundary For Phase 1

Phase 1 uses the contracts and persistence already present on `main`.

Available foundation:

- validated Measurement Plan contract;
- validated Source Package contract;
- validated Evidence Collection Assembler;
- validated Evidence Snapshot contract;
- validated Claim Readiness Handoff contract;
- validated Claim Readiness Snapshot contract;
- Customer Exposure Policy contract;
- Reportability gate contract;
- minimal aggregate persistence for value hypotheses, measurement plans, source
  package refs, and evidence snapshots;
- internal runtime builder tests that persist an Evidence Snapshot and build a
  non-persisted Claim Readiness Handoff.

Phase 1 must not add:

- new tables;
- new routes;
- frontend UI;
- ingestion jobs;
- customer-facing exports;
- persisted `claim_readiness_snapshots`;
- persisted `executive_readout_snapshots`;
- new canonical events;
- new suppression reasons;
- tunable thresholds;
- admin overrides.

## 7. Pilot Run Shape

The first full-run pilot should execute this sequence for one org, one support
workflow, and one reporting window pair:

```text
1. Lock value hypothesis.
2. Persist validated Measurement Plan.
3. Attach metadata-only Source Package refs.
4. Assemble Evidence Snapshot input.
5. Persist validated Evidence Snapshot.
6. Build non-persisted Claim Readiness Handoff.
7. Build or validate Claim Readiness Snapshot in memory.
8. Build and validate `PostSalesWorkflowOrchestrator` for the same support-pilot source bindings.
9. Run Customer Exposure Policy from the validated orchestrator.
10. Build or fetch, then validate, a `GSR_2026_05` Glean Signal Readiness Map as the Reportability Gate `readiness_map`.
11. Run Reportability Gate with the validated `readiness_map`.
12. Produce internal pilot readout draft with caveats and blocked claims.
```

For the support pilot, the readiness-map step may use the narrow runtime
evidence adapter when it is backed by the same validated source package refs.
It must remain aggregate-only and must not infer missing signal families from
adjacent telemetry.

The Customer Exposure Policy input must preserve the validated orchestrator
source binding, including `post_sales_workflow_orchestrator_id`. The
Reportability Gate input must include a valid `GSR_2026_05` readiness map; AI
Value objects are not a substitute for that `readiness_map`.

The first run should produce both:

- a telemetry-only/caveated path, proving missing Layer 2/3 evidence stays
  explicit; and
- a full-Playbook fixture path, proving the claim boundary can unlock internal
  governed ROI scenario review when all required packages are present.

## 8. Required Customer Inputs

For a real customer pilot, the implementation team must collect:

- approved workflow family and business objective;
- support metric owner and source-system owner;
- aggregate baseline and comparison windows;
- aggregate support metric baseline and comparison export;
- aggregate AI Fluency baseline and, if available, retest;
- source owner attestation that exports are aggregate and approved;
- assumption approval for case mix, volume, staffing/coverage, channel mix,
  metric definition stability, process/policy changes, knowledge-base changes,
  and AI rollout context;
- finance or business-owner approval before internal financial translation;
- explicit confirmation that no raw rows, direct identifiers, hashed or
  joinable person identifiers, raw prompts, raw responses, transcripts, file
  contents, or person-level HRIS/productivity records are included.

## 9. Allowed And Blocked Claims

Allowed first-pilot language:

- aggregate support workflow value investigation;
- source-bound evidence posture;
- VBD movement over time;
- aggregate AI Fluency/user voice movement;
- customer-owned metric movement;
- governed internal ROI scenario review when full Playbook coverage and
  approvals are present.

Always blocked in the first pilot:

- realized ROI proof;
- EBITA claim;
- causality claim;
- productivity claim;
- headcount reduction claim;
- individual attribution;
- manager or team ranking;
- people decisioning;
- customer-facing financial output;
- customer-facing economic output;
- HRIS inference from AI usage;
- raw or person-level evidence exposure.

## 10. Acceptance Criteria For Phase 1

Phase 1 is complete when:

- customer support case resolution is accepted as the first pilot workflow;
- capacity creation is accepted as the first value route;
- median resolution hours is accepted as the primary customer metric;
- the required Layer 1, Layer 2, Layer 3, governance, and assumption inputs are
  documented;
- VBD is explicitly scoped to Layer 1 time-series movement;
- blocked claims and no-go boundaries are explicit;
- the next implementation phase has a clear end-to-end test target.

## 11. Next Phase

Next phase:

`phase-ai-value-pilot-chain-e2e-verification`

Goal:

Build a focused test path that proves the selected support pilot can run through:

```text
Measurement Plan
-> Source Packages
-> Evidence Collection Assembly
-> Evidence Snapshot persistence
-> Claim Readiness Handoff
-> Claim Readiness Snapshot validation
-> `PostSalesWorkflowOrchestrator` validation
-> Customer Exposure Policy
-> `GSR_2026_05` `readiness_map`
-> Reportability Gate
```

The next phase should add tests and fixtures only unless a specific
implementation gap is found. It should not add new migrations, routes, frontend
UI, ingestion jobs, or persisted claim/readout snapshots.
