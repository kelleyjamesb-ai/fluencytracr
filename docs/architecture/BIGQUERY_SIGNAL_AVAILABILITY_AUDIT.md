# BigQuery Signal Availability Audit

Status: planning audit only

Phase: `phase-ai-value-bigquery-signal-availability-audit`

Related prior phase: `docs/architecture/AI_VALUE_DATA_MODEL_AUDIT.md`

Pipeline boundary: this audit classifies aggregate source availability and
governed evidence-contract readiness. It does not authorize a production
Sigma/BigQuery AI Value data pipeline, live query execution, pipeline
persistence, customer projection, export packages, confidence research, ROI,
causality, productivity, probability, or customer-facing financial output.

This document does not create migrations, routes, schemas, ingestion, UI,
backend services, frontend views, BigQuery jobs, or governance changes. It
audits whether the current repository contains enough source contracts,
BigQuery probes, materializers, and tests to determine if FluencyTracr can
populate future `evidence_snapshots`, `claim_readiness_snapshots`, and
`executive_readout_snapshots`.

## 1. Purpose

The completed AI Value data model audit identifies the future product-state
sequence:

```text
value_hypotheses -> measurement_plans -> evidence_snapshots ->
claim_readiness_snapshots -> executive_readout_snapshots
```

This audit asks a narrower upstream question:

```text
Can FluencyTracr actually collect the aggregate evidence needed to populate
those snapshots without violating the aggregate-only governance boundary?
```

Short answer:

- Core Layer 1 telemetry is partially collectible today through existing
  BigQuery dogfood scripts, V3 aggregate ingest, forwarded distributions,
  velocity observations, and the real-evidence materializer.
- Layer 2 user voice is contractually supported only as aggregate AI Fluency
  baseline input. It is not available from the current BigQuery adapter.
- Layer 3 system-of-record outcomes are supported through aggregate
  customer-attested outcome evidence ingestion, not through a live system
  connector.
- Richer Glean Playbook lanes such as Skills, Agents, MCP/action boundaries,
  artifact outputs, controls, and assumptions have schema and review contracts,
  but not all have governed, end-to-end BigQuery materialization.
- The current repo can support a first evidence snapshot with strong caveats.
  It cannot yet populate a fully supported claim/readout snapshot without
  customer exports, governance approvals, or additional instrumentation for
  missing lanes.

## 2. Scope And Non-Goals

In scope:

- inventory existing BigQuery scripts and dogfood ingest scripts;
- inventory source readiness, aggregate evidence import, AI Work Evidence,
  outcome evidence, and materializer contracts;
- classify required AI Value Platform signals by availability;
- map each signal to the Glean Playbook evidence layer and FluencyTracr
  evidence lane;
- provide safe read-only BigQuery SQL probe templates.

Out of scope:

- running BigQuery queries;
- storing raw rows or query results;
- creating migrations or snapshot tables;
- adding backend routes, materializers, or frontend UI;
- changing canonical events, suppression reasons, thresholds, or governance
  gates;
- claiming ROI, causality, productivity lift, individual scoring,
  manager/team comparative ordering, or customer-facing economic value.

Aggregate workforce context note:

HRIS-derived data is not categorically excluded. It may support the snapshot
path only as aggregate, cohort-safe, customer-approved workforce context for
workflow-level value measurement. Person-level HRIS records, direct
identifiers, hashed or joinable person identifiers, individual productivity,
people decisioning, compensation/performance inference, promotion/discipline
inference, manager/team comparative ordering, and HRIS inference from AI usage remain
blocked.

## 3. Classification Legend

| Classification | Meaning |
| --- | --- |
| `available_now` | Existing repo code or contract can produce aggregate, governed evidence for this signal today; this does not mean production Sigma/BigQuery pipeline authorization. |
| `partially_available` | Some fields, contracts, or materializers exist, but the signal is incomplete, caveated, or not end-to-end. |
| `derivable_with_existing_data` | Existing BigQuery/repo data appears sufficient, but no governed production materializer currently emits the snapshot field. |
| `requires_customer_export` | The source is customer-owned or approval-owned and must arrive as an aggregate export or attested package. |
| `requires_new_instrumentation` | Required fields are not reliably present in current exports or need new logging/identity/version metadata. |
| `not_available` | Current repo evidence indicates the signal is not observable through the tested path. |
| `unknown` | The repo does not provide enough evidence to classify availability. |

Evidence layer values:

- `Layer 1 telemetry`: product/workflow/event telemetry from Glean or BigQuery.
- `Layer 2 user voice`: aggregate survey, baseline, stated experience, or user
  voice evidence.
- `Layer 3 system-of-record`: customer-owned outcome, finance, approval, or
  source-of-truth business evidence.

FluencyTracr evidence lane values:

- `surface_usage`
- `skill_lifecycle`
- `agent_lifecycle`
- `mcp_action_boundary`
- `artifact_output`
- `control_evidence`
- `assumptions`

## 4. Repository Inventory

| Area | Existing files | What exists | Snapshot relevance | Audit finding |
| --- | --- | --- | --- | --- |
| BigQuery dogfood adapter | `scripts/run_dogfood_bq_ingest.py`, `src/connectors/glean_dogfood_bq/adapter.py`, `tests/test_glean_dogfood_bq_adapter.py`, `docs/integrations/glean/dogfood-bq-adapter.md`, `openspec/changes/add-glean-dogfood-bq-adapter/*` | Read-only adapter for `scio-apps.scrubbed_llm_call.scrubbed_llm_call_*`, `scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*`, and `scio-apps.scrubbed_workflows.scrubbed_workflows_*`; dry-run cost guard; `_TABLE_SUFFIX` guard; k-min suppression; aggregate V3 payload output. | Feeds `evidence_snapshots` through V3 verdicts and forwarded distributions. | `available_now` for narrow aggregate telemetry; `partially_available` for full VBD/Playbook signal coverage. |
| V3 aggregate ingest | `backend/src/value_realization/v3_aggregate_ingest.ts`, `backend/tests/v3_ingest_api.test.ts` | Accepts `FT_V3_2026_05` aggregate payloads, computes SURFACE/SUPPRESS verdicts, Quality Multiplier, Reliability Factor, Velocity Index, and forwarded distributions only when gates clear. | Core source for telemetry-backed evidence snapshots. | `available_now`. |
| Evidence materializer | `backend/src/ai_value_real_evidence_materializer.ts`, `backend/tests/ai_value_real_evidence_materializer.test.ts` | Converts surfaced V3 verdicts, forwarded distributions, velocity observations, and paired outcome evidence into `evidence_readiness` and `outcome_evidence_export` AI Value objects. | Closest current implementation to future `evidence_snapshots`. | `partially_available`; it materializes readiness objects, not immutable snapshot tables. |
| Outcome evidence ingestion | `docs/integrations/value-realization/outcome-evidence.md`, `shared/src/outcomeEvidenceSchemas.ts`, `schemas/outcome_evidence.schema.json`, `backend/src/repositories/outcome-evidence.repository.ts`, `backend/tests/outcome_evidence_api.test.ts` | Stores aggregate customer-attested KPI observations; rejects unknown/person-level fields; does not compute correlation, causality, attribution, dollarization, or readiness upgrades. | Layer 3 input for evidence and claim snapshots. | `available_now` as an aggregate API contract, but real customer values `requires_customer_export`. |
| Glean Signal Readiness | `docs/contracts/glean-signal-readiness/README.md`, `shared/src/gleanSignalReadinessSchemas.ts`, `shared/src/gleanSourceReadinessAdapter.ts`, `scripts/generate_glean_readiness_from_sources.mjs`, `backend/tests/glean_source_readiness_adapter.test.ts` | Org-window source readiness map for `workflow_run`, `agent_run`, `agent_step`, `actions`, `mcp_usage`, `ai_security`, `skill_lifecycle`, `assistant`, `search_document_retrieval`, `api_usage`, `gleanbot`, and `insights`. | Source availability summary for evidence snapshots and claim caveats. | `available_now` for the readiness contract; real source confirmation often `requires_customer_export`. |
| Glean AI Work Evidence adapter | `docs/contracts/glean-ai-work-evidence/README.md`, `shared/src/gleanAiWorkEvidenceAdapter.ts`, `backend/tests/glean_ai_work_evidence_adapter.test.ts` | Aggregate, metadata-only records across `surface_usage`, `skill_lifecycle`, `agent_lifecycle`, `mcp_action_boundary`, `artifact_output`, and `control_evidence`; maps to readiness inventory and claim evaluations. | Bridge from Glean value surfaces to `evidence_snapshots` and `claim_readiness_snapshots`. | `partially_available`; contract exists, but BigQuery materialization is incomplete by lane. |
| Glean Value Evidence Pack | `docs/contracts/glean-value-evidence/README.md`, `shared/src/gleanValueEvidenceSchemas.ts`, `backend/tests/glean_value_evidence_pack_schema.test.ts` | Org-window claim evidence posture with lane states, skill/agent/MCP/artifact/control/assumption sections, and claim readiness. | Candidate payload shape for claim snapshots. | `partially_available`; shape exists, source population remains lane-dependent. |
| Glean Claim Registry | `docs/contracts/glean-claim-registry/README.md`, `shared/src/gleanClaimRegistrySchemas.ts`, `backend/tests/glean_claim_registry_schema.test.ts` | Static claim templates plus evaluated claim set rules. | Deterministic rules for `claim_readiness_snapshots`. | `available_now` for templates and validation; source evidence still required. |
| Real Source Readiness Manifest | `docs/contracts/real-source-readiness/README.md`, `shared/src/realSourceReadinessSchemas.ts`, `backend/tests/real_source_readiness_manifest.test.ts` | Review layer for replacing synthetic fixtures with real aggregate sources; no ingestion, persistence, or readiness upgrade. | Records which sources are ready, blocked, unknown, or approval-dependent before snapshots are trusted. | `available_now` as review metadata; many source inputs remain `blocked`, `unknown`, or `needs_approval`. |
| Aggregate Evidence Import | `docs/contracts/aggregate-evidence-import/README.md`, `shared/src/aggregateEvidenceImportSchemas.ts`, `backend/tests/aggregate_evidence_import.test.ts` | Review-only admin-exported aggregate upload package; accepts ready-source records and withholds blocked/unknown/synthetic inputs. | Safe manual path for snapshot source packages before live connectors. | `available_now` for review; no persistence or claim upgrade by design. |
| AI Fluency baseline | `shared/src/aiValueEngine/fluencyBaseline.ts`, `docs/contracts/ai-value-intelligence/examples/customer-support-fluency-baseline.json` | Aggregate baseline validator and summary for 24-item/short-form AI Fluency baseline; suppresses small cohorts; rejects person-level fields. | Layer 2 context for evidence snapshots and retest/readout context. | `available_now` as aggregate contract; real baseline values `requires_customer_export`. |
| Dogfood research SQL | `sql/dogfood/*.sql`, `tests/dogfood/test_velocity_double_count.py`, `dogfood-output/V4_RESEARCH_EXPORTS.md`, `docs/research/V4_*` | Read-only aggregate diagnostics for velocity, depth repertoire, trust signal availability, skill reads, agent sub-surfaces, behavior cohorts, outcome joins, and value strategy. | Evidence for whether signals exist in BigQuery. | `derivable_with_existing_data` for several research signals; not productized unless promoted by validation gates. |

## 5. Signal Availability Matrix

| Required signal | Classification | Glean Playbook evidence layer | FluencyTracr evidence lane | Current repo evidence | Snapshot target | Audit decision |
| --- | --- | --- | --- | --- | --- | --- |
| BigQuery table discovery for Glean dogfood telemetry | `available_now` | Layer 1 telemetry | surface_usage | BigQuery adapter pins three sharded dogfood table families and tests table patterns. | `evidence_snapshots` source refs | Safe to record as source availability, not as customer evidence. |
| Column/field discovery for telemetry tables | `available_now` | Layer 1 telemetry | surface_usage | Adapter source allowlists and research SQL inspect nested field paths without raw row output. | `evidence_snapshots` source coverage | Safe for availability summaries. Do not store raw schemas with sensitive field names beyond approved allowlists. |
| Aggregate event volume by table/window | `available_now` | Layer 1 telemetry | surface_usage | Adapter query emits aggregate rows; research SQL emits aggregate counts and distributions. | `evidence_snapshots` | Safe when output is count-only and window-scoped. |
| Minimum cohort check by workflow/JBTD/persona slice | `available_now` | Layer 1 telemetry | surface_usage | Adapter applies k-min per slice; V3 ingest suppresses cohort size under 5. | `evidence_snapshots`, `claim_readiness_snapshots` | Required gate before any snapshot can surface. |
| V3 SURFACE/SUPPRESS verdict | `available_now` | Layer 1 telemetry | surface_usage | V3 aggregate ingest computes immutable verdicts and forwarded distributions only when gates clear. | `evidence_snapshots` | Safe primary telemetry input. |
| Velocity frequency/engagement/breadth distributions | `partially_available` | Layer 1 telemetry | surface_usage | V3 schema and velocity storage exist; dogfood SQL derives distributions; current BQ adapter uses narrow placeholder-style distribution fields in its aggregate output. | `evidence_snapshots` | Usable for test snapshots with caveats; production-quality derivation needs a governed BigQuery materializer. |
| Breadth/repertoire across Glean surfaces | `derivable_with_existing_data` | Layer 1 telemetry | surface_usage | Depth/repertoire and velocity/depth SQL use GCE plus agent-span sources to emit aggregate surface distributions. | `evidence_snapshots` | Research-proven, but not a current product materializer. |
| Completion, error, abandonment, recovery, verification, and latency rates | `partially_available` | Layer 1 telemetry | surface_usage | V3 and adapter support quality signals; trust diagnostics show richer attribution remains held or research-only. | `evidence_snapshots`, `claim_readiness_snapshots` | Basic quality/reliability is available; richer trust attribution remains caveated. Latency is corroborative only. |
| Trust signal availability and attribution | `partially_available` | Layer 1 telemetry | control_evidence | Trust signal SQL and validation readouts show aggregate signal availability; strict parent attribution still has hold states. | `evidence_snapshots`, `claim_readiness_snapshots` | Use as caveat/context unless attribution is promoted for the exact customer-safe scope. |
| AI Fluency baseline aggregate construct means | `requires_customer_export` | Layer 2 user voice | assumptions | Baseline validator and fixture exist, but BigQuery adapter does not collect survey/user voice data. | `evidence_snapshots`, `executive_readout_snapshots` | Accept only aggregate baseline export or stored validated object. |
| AI Fluency retest/follow-up movement | `requires_customer_export` | Layer 2 user voice | assumptions | Baseline schema supports collection modes, but no automated retest ingestion exists. | `evidence_snapshots`, `executive_readout_snapshots` | Requires aggregate kickoff/follow-up package and window alignment. |
| Customer-owned system-of-record KPI baseline/comparison | `requires_customer_export` | Layer 3 system-of-record | assumptions | Outcome Evidence API stores aggregate values and materializer pairs baseline/comparison records. | `evidence_snapshots`, `claim_readiness_snapshots` | Core Layer 3 path exists, but actual data must be customer-attested. |
| Aggregate HRIS-derived workforce context | `requires_customer_export` | Layer 3 system-of-record | assumptions | Data Boundary, Aggregate Evidence Import, Real Source Readiness, and Outcome Evidence can represent aggregate workforce context, but no live HRIS connector exists. | `evidence_snapshots`, `claim_readiness_snapshots`, `executive_readout_snapshots` | Allowed only as customer-approved aggregate context; person-level HRIS, joinable identifiers, people decisioning, ranking, and HRIS inference stay blocked. |
| Outcome evidence review state | `partially_available` | Layer 3 system-of-record | assumptions | `outcome_evidence_export.review` exists inside AI Value objects; dedicated snapshot table does not. | `claim_readiness_snapshots` | Can be derived today; durable review semantics need future snapshot state. |
| Source readiness by signal family | `available_now` | Layer 1 telemetry | assumptions | Glean Signal Readiness Map and Real Source Readiness Manifest exist. | `evidence_snapshots` | Good snapshot input for availability/caveat summaries. |
| Surface usage lane in Glean AI Work Evidence | `available_now` | Layer 1 telemetry | surface_usage | Current adapter/V3 path covers assistant/workflow-like surface usage; AI Work Evidence maps `surface_usage` to readiness and claims. | `evidence_snapshots`, `claim_readiness_snapshots` | Ready for caveated claim evaluation when aggregate counts clear gates. |
| Skill read usage availability | `partially_available` | Layer 1 telemetry | skill_lifecycle | Research readouts show agent-span skill-read evidence is available and mostly joinable; raw skill names are not emitted. | `evidence_snapshots` | Availability is real, but not governed enough for reusable expertise claims without identity/version/invocation validation. |
| Skill lifecycle identity, version, type, and reuse | `requires_new_instrumentation` | Layer 1 telemetry | skill_lifecycle | Contracts expect lifecycle counts and skill types; research notes block promotion without canonical skill identity, versioning, invocation mode, and personal/shared/org separation. | `claim_readiness_snapshots` | Cannot support stronger skill reuse claims yet. |
| Agent run volume and status | `derivable_with_existing_data` | Layer 1 telemetry | agent_lifecycle | `scrubbed_workflows` adapter fields and `agent_type_diagnostic.sql` can derive aggregate agent run counts/status. | `evidence_snapshots` | Derivable, but not a full product materializer. |
| Agent lifecycle created/tested/enabled/retried/triggered counts | `partially_available` | Layer 1 telemetry | agent_lifecycle | Glean Value Evidence schema supports these fields; source readiness fixtures model agent lifecycle availability. | `evidence_snapshots`, `claim_readiness_snapshots` | Requires validated export fields beyond current narrow BQ adapter output. |
| Named reusable agent workflow leverage | `not_available` | Layer 1 telemetry | agent_lifecycle | V4 signal discovery found healthy joins but missing `productsnapshot.workflow.name` in the tested GCE export path. | `claim_readiness_snapshots` | Do not infer named reusable leverage from the current GCE path. |
| Autonomous vs non-autonomous agent classification | `derivable_with_existing_data` | Layer 1 telemetry | agent_lifecycle | Agent diagnostics use product snapshot fields such as `isautonomousagent`. | `evidence_snapshots` | Useful as aggregate context; not enough for reusable leverage claims. |
| MCP/action boundary host class, operation class, HITL, activity log, policy decision | `requires_customer_export` | Layer 1 telemetry | mcp_action_boundary | Source readiness and real-source manifest show MCP/action boundary evidence is blocked or approved pending export. | `evidence_snapshots`, `claim_readiness_snapshots` | Need approved aggregate activity metadata before action claims. |
| Artifact output type/count/refreshed/shared metadata | `derivable_with_existing_data` | Layer 1 telemetry | artifact_output | `scrubbed_workflows` allowlist contains artifact metadata; Glean AI Work Evidence and Value Evidence schemas include artifact output fields. | `evidence_snapshots`, `claim_readiness_snapshots` | Likely derivable, but no current governed BigQuery materializer emits this lane. |
| Artifact contents or document body evidence | `not_available` | Layer 1 telemetry | artifact_output | All relevant contracts forbid file contents, raw outputs, prompts, transcripts, and raw content. | none | Must remain unavailable by design. |
| Runtime control and AI security aggregate states | `requires_customer_export` | Layer 1 telemetry | control_evidence | Source readiness can represent `ai_security`; real-source manifest marks control evidence blocked pending policy-owner approval. | `claim_readiness_snapshots` | Requires approved aggregate control states and governance review. |
| Assumption ledger / low-confidence and high-sensitivity assumptions | `requires_customer_export` | Layer 3 system-of-record | assumptions | Glean Value Evidence Pack supports assumption counts and approval states, but BigQuery telemetry cannot prove customer-owned assumptions. | `claim_readiness_snapshots`, `executive_readout_snapshots` | Must come from governed customer/business owner process. |
| Finance/customer-safe approval state | `requires_customer_export` | Layer 3 system-of-record | assumptions | Real Source Readiness Manifest models customer-safe financial approval as `needs_approval`; outcome/materializer paths do not create financial proof. | `claim_readiness_snapshots`, `executive_readout_snapshots` | Required before financial or renewal evidence strengthens. |
| Claim registry template availability | `available_now` | Layer 3 system-of-record | assumptions | Glean Claim Registry validates static templates and evaluated claim sets. | `claim_readiness_snapshots` | Templates are available; evaluated readiness depends on evidence lane states. |
| Claim readiness evaluation from AI Work Evidence lanes | `partially_available` | Layer 1 telemetry | assumptions | AI Work Evidence adapter maps lane states to claim evaluations; source lane population is incomplete. | `claim_readiness_snapshots` | Can produce caveated/suppressed readiness, not fully supported claims. |
| Executive readout content and next evidence actions | `partially_available` | Layer 3 system-of-record | assumptions | Executive packet/readout renderer and prototype exist; prior data model audit found no dedicated readout snapshot table. | `executive_readout_snapshots` | Can generate from existing objects, but should persist only after evidence and claim snapshots are stable. |
| Customer-specific production BigQuery export availability | `unknown` | Layer 1 telemetry | assumptions | Repo contains dogfood BigQuery paths and source-readiness contracts, not a confirmed customer export path. | all snapshot targets | Must be confirmed per customer or deployment. |

## 6. Snapshot Readiness Assessment

### 6.1 `evidence_snapshots`

The repo can support an initial evidence snapshot if it is explicitly framed as
aggregate and caveated.

Currently available inputs:

- V3 aggregate verdicts and forwarded distributions;
- velocity distribution observations;
- aggregate quality signals;
- suppression state and held reasons;
- source readiness summaries;
- aggregate AI Fluency baseline objects when customer-exported;
- aggregate outcome evidence when customer-attested.
- aggregate HRIS-derived workforce context when customer-exported,
  cohort-safe, and approved for workflow-level value measurement.

Main gaps:

- no dedicated immutable `evidence_snapshots` table yet;
- no governed BigQuery materializer for every Glean AI Work Evidence lane;
- no automatic user-voice source besides validated aggregate baseline objects;
- customer production export availability is unknown until reviewed.

Decision:

```text
evidence_snapshots are technically feasible for telemetry + outcome + source
readiness summaries, but first implementation should preserve missing and held
lanes instead of synthesizing completeness.
```

### 6.2 `claim_readiness_snapshots`

The repo can evaluate claim readiness only as far as the evidence lanes allow.

Currently available inputs:

- static Glean Claim Registry templates;
- Glean AI Work Evidence lane-to-claim mapping;
- Glean Value Evidence Pack shape;
- real-source readiness and aggregate import review state;
- outcome evidence review state where materialized.

Main gaps:

- source lane materialization is incomplete for Skills, MCP/actions, artifacts,
  controls, and assumptions;
- finance/customer-safe approval remains external;
- stronger claims must stay suppressed or caveated when required lanes are
  missing, held, or not computed.

Decision:

```text
claim_readiness_snapshots can be populated today as a governed claim posture
artifact, but most high-value claims should remain caveated, internal-only,
suppressed, or not computed until source exports and approvals are attached.
```

### 6.3 `executive_readout_snapshots`

The repo can render executive readouts from existing AI Value objects, but the
data foundation is uneven.

Currently available inputs:

- `executive_packet` object shape and readout renderers;
- Evidence Readiness and Outcome Evidence Export objects;
- Claim Boundary, Value Evidence Case, ROI Scenario, EBITA Bridge, and Value
  Improvement Loop objects;
- static prototype UI for executive readout review.

Main gaps:

- no dedicated immutable `executive_readout_snapshots` table;
- no stable lineage from evidence snapshot -> claim readiness snapshot ->
  readout snapshot;
- stronger financial or renewal language requires external approval and
  accepted evidence.

Decision:

```text
executive_readout_snapshots should not be the first persistence layer. Build
evidence and claim snapshots first, then persist readouts that reference those
source snapshots and carry caveats forward.
```

## 7. Read-Only BigQuery Probe Templates

These templates are for manual source discovery and aggregate availability
review only. They must be run as dry-run first where possible. They must not be
modified to select raw rows, prompts, outputs, transcripts, file contents,
emails, user IDs, actor IDs, skill names, action payloads, or document URLs.

Do not add `CREATE TABLE`, `CREATE VIEW`, `INSERT`, `UPDATE`, `DELETE`,
`MERGE`, `EXPORT DATA`, or destination table settings. Do not persist query
results except as approved aggregate summaries.

### 7.1 Table Discovery

Purpose: find date-sharded or partitioned source tables without reading data
rows.

```sql
-- Replace PROJECT_ID and region-us.
-- Read-only INFORMATION_SCHEMA query. No source table rows are scanned.

SELECT
  table_catalog,
  table_schema,
  table_name,
  table_type,
  creation_time,
  row_count,
  size_bytes
FROM `PROJECT_ID.region-us`.INFORMATION_SCHEMA.TABLES
WHERE table_schema IN (
    'scrubbed_llm_call',
    'scrubbed_client_analytics',
    'scrubbed_workflows',
    'scrubbed_glean_customer_event',
    'scrubbed_agentspan'
  )
  AND (
    table_name LIKE 'scrubbed_llm_call_%'
    OR table_name LIKE 'scrubbed_client_analytics_%'
    OR table_name LIKE 'scrubbed_workflows_%'
    OR table_name LIKE 'scrubbed_agentspan_%'
    OR table_name = 'scrubbed_glean_customer_event'
  )
ORDER BY
  table_schema,
  table_name DESC;
```

Expected output: table names, approximate table sizes, and row counts only.

Safe interpretation:

- Confirms source existence and sharding pattern.
- Does not prove required fields are present.
- Does not authorize reading raw rows.

### 7.2 Column And Nested Field Discovery

Purpose: confirm whether approved aggregate candidate fields exist before a
materializer is designed.

```sql
-- Replace PROJECT_ID and DATASET_ID.
-- Use one dataset at a time. This reads metadata only.

SELECT
  table_catalog,
  table_schema,
  table_name,
  column_name,
  field_path,
  data_type,
  description
FROM `PROJECT_ID.DATASET_ID`.INFORMATION_SCHEMA.COLUMN_FIELD_PATHS
WHERE table_name LIKE 'TABLE_PREFIX_%'
  AND (
    field_path IN (
      'timestamp',
      'jsonPayload.type',
      'jsonPayload.workflowrun.feature',
      'jsonPayload.workflowrun.runid',
      'jsonPayload.workflowrun.rootworkflowid',
      'jsonPayload.workflow.workflow_id',
      'jsonPayload.workflow.run_id',
      'jsonPayload.workflow.workflow_execution.status',
      'jsonPayload.workflow.citations_data.has_user_facing_citations',
      'jsonPayload.workflow.artifacts_data.artifact_type',
      'jsonPayload.workflow.artifacts_data.file_extension',
      'jsonPayload.workflow.trigger_data.trigger_type',
      'jsonPayload.context.agent_trace.trace_id',
      'jsonPayload.action.skill_reader_attributes.skill_name',
      'jsonPayload.action.workflow_id',
      'jsonPayload.action.action_run_id'
    )
    OR field_path LIKE 'jsonPayload.workflow.%'
    OR field_path LIKE 'jsonPayload.action.%'
  )
ORDER BY
  table_name DESC,
  field_path;
```

Expected output: metadata paths only.

Safe interpretation:

- Confirms field availability for aggregate planning.
- If sensitive field paths appear, do not include their values in later probes.
- Raw skill-name values remain forbidden in output; aggregate cardinality is the
  maximum safe first check.

### 7.3 Aggregate Event Volume

Purpose: estimate whether approved telemetry surfaces have enough aggregate
volume for a window. This template emits only grouped counts and no raw rows.

```sql
-- Replace PROJECT_ID.DATASET.TABLE_PATTERN with an approved wildcard source,
-- for example `PROJECT_ID.scrubbed_workflows.scrubbed_workflows_*`.
-- Use a bounded window and dry-run before execution.

DECLARE window_start DATE DEFAULT DATE('2026-06-01');
DECLARE window_end DATE DEFAULT DATE('2026-06-08');

WITH aggregate_events AS (
  SELECT
    DATE(timestamp) AS event_date,
    COALESCE(
      NULLIF(TRIM(jsonPayload.workflow.workflow_id), ''),
      NULLIF(TRIM(jsonPayload.workflowid), ''),
      NULLIF(TRIM(jsonPayload.context.workflow.workflow_id), ''),
      CONCAT('event_type:', COALESCE(NULLIF(TRIM(jsonPayload.type), ''), 'unknown'))
    ) AS surface_or_workflow_id,
    COUNT(*) AS event_count,
    COUNT(DISTINCT COALESCE(
      NULLIF(TRIM(jsonPayload.userid), ''),
      NULLIF(TRIM(jsonPayload.workflow.user_id), ''),
      NULLIF(TRIM(jsonPayload.workflow_compiler.user_id), '')
    )) AS internal_distinct_actor_count,
    COUNT(DISTINCT COALESCE(
      NULLIF(TRIM(jsonPayload.workflow.run_id), ''),
      NULLIF(TRIM(jsonPayload.workflowid), ''),
      NULLIF(TRIM(jsonPayload.context.workflow.run_id), '')
    )) AS aggregate_run_count
  FROM `PROJECT_ID.DATASET.TABLE_PATTERN`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', window_start)
    AND FORMAT_DATE('%Y%m%d', DATE_SUB(window_end, INTERVAL 1 DAY))
    AND timestamp >= TIMESTAMP(window_start)
    AND timestamp < TIMESTAMP(window_end)
  GROUP BY
    event_date,
    surface_or_workflow_id
)
SELECT
  event_date,
  surface_or_workflow_id,
  event_count,
  aggregate_run_count,
  CASE
    WHEN internal_distinct_actor_count >= 5 THEN internal_distinct_actor_count
    ELSE NULL
  END AS cohort_size,
  CASE
    WHEN internal_distinct_actor_count >= 5 THEN 'SURFACE_CANDIDATE'
    ELSE 'SUPPRESS'
  END AS availability_status,
  CASE
    WHEN internal_distinct_actor_count >= 5 THEN NULL
    ELSE 'INSUFFICIENT_VOLUME'
  END AS suppression_reason
FROM aggregate_events
ORDER BY
  event_date,
  surface_or_workflow_id;
```

Expected output: grouped counts, run counts, suppression status, and surfaced
cohort sizes only.

Safe interpretation:

- `internal_distinct_actor_count` is used only inside BigQuery to enforce
  k-min.
- The final output hides sub-minimum cohort sizes.
- Do not add actor identifiers to the final select.

### 7.4 Minimum Cohort Checks By Slice

Purpose: test whether future snapshot slices clear the independent
`workflow_id`, `jbtd_id`, and `persona_id` cohort gate.

```sql
-- Replace PROJECT_ID.DATASET.TABLE_PATTERN with an approved source.
-- Keep JBTD/persona fields null unless they already exist as approved
-- aggregate join keys inside the customer/Glean boundary.

DECLARE window_start DATE DEFAULT DATE('2026-06-01');
DECLARE window_end DATE DEFAULT DATE('2026-06-08');

WITH slice_counts AS (
  SELECT
    COALESCE(
      NULLIF(TRIM(jsonPayload.workflow.workflow_id), ''),
      NULLIF(TRIM(jsonPayload.workflowid), ''),
      'workflow:unknown'
    ) AS workflow_id,
    CAST(NULL AS STRING) AS jbtd_id,
    CAST(NULL AS STRING) AS persona_id,
    COUNT(*) AS event_count,
    COUNT(DISTINCT COALESCE(
      NULLIF(TRIM(jsonPayload.userid), ''),
      NULLIF(TRIM(jsonPayload.workflow.user_id), ''),
      NULLIF(TRIM(jsonPayload.workflow_compiler.user_id), '')
    )) AS internal_cohort_size
  FROM `PROJECT_ID.DATASET.TABLE_PATTERN`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', window_start)
    AND FORMAT_DATE('%Y%m%d', DATE_SUB(window_end, INTERVAL 1 DAY))
    AND timestamp >= TIMESTAMP(window_start)
    AND timestamp < TIMESTAMP(window_end)
  GROUP BY
    workflow_id,
    jbtd_id,
    persona_id
)
SELECT
  workflow_id,
  jbtd_id,
  persona_id,
  event_count,
  CASE
    WHEN internal_cohort_size >= 5 THEN internal_cohort_size
    ELSE NULL
  END AS cohort_size,
  CASE
    WHEN internal_cohort_size >= 5 THEN 'SURFACE_CANDIDATE'
    ELSE 'SUPPRESS'
  END AS verdict_candidate,
  CASE
    WHEN internal_cohort_size >= 5 THEN NULL
    ELSE 'INSUFFICIENT_VOLUME'
  END AS suppression_reason
FROM slice_counts
ORDER BY
  verdict_candidate,
  workflow_id;
```

Expected output: slice-level aggregate rows only.

Safe interpretation:

- Suppression applies independently per slice.
- Do not merge sub-minimum slices to make them pass.
- Do not use JBTD/persona segmentation unless approved and independently
  suppressed.

## 8. Recommended Next Move

Do not build snapshot tables yet.

Recommended sequence:

1. Run only the read-only discovery probes against the approved dogfood or
   customer-export BigQuery source, with dry-run first and bounded windows.
2. Record aggregate availability findings by evidence lane:
   `surface_usage`, `skill_lifecycle`, `agent_lifecycle`,
   `mcp_action_boundary`, `artifact_output`, `control_evidence`, and
   `assumptions`.
3. Treat missing, suppressed, unconfirmed, and governance-held lanes as first-
   class snapshot content, not as empty values to infer around.
4. Create `evidence_snapshots` only after the source-availability summary is
   repeatable and the snapshot can preserve source refs, held reasons, and
   suppression state.
5. Create `claim_readiness_snapshots` and `executive_readout_snapshots` after
   evidence snapshots exist and caveats propagate cleanly.

Biggest risk:

```text
The product could over-read Layer 1 telemetry as value proof.
```

The safe path is to let BigQuery prove source availability and aggregate
behavior, then require Layer 2 or Layer 3 evidence before stronger value,
financial, renewal, or executive claims are allowed.
