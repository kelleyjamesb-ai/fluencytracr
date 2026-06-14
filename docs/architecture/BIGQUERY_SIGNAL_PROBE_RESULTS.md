# BigQuery Signal Probe Results

Status: source availability summary only

Phase: `phase-ai-value-bigquery-probe-run-and-source-summary`

Related planning audit: `docs/architecture/BIGQUERY_SIGNAL_AVAILABILITY_AUDIT.md`

This document records safe, read-only BigQuery source probes for the AI Value
Platform evidence path. It does not create migrations, tables, backend routes,
frontend UI, ingestion jobs, destination tables, exported raw data, or
governance changes.

No raw rows, prompts, responses, transcripts, file contents, query text, emails,
user IDs, actor IDs, raw skill names, action payloads, document URLs, or
person-level productivity data are stored in this document.

## 1. Purpose

The prior BigQuery signal availability audit concluded that FluencyTracr has a
credible but incomplete source path for future `evidence_snapshots`,
`claim_readiness_snapshots`, and `executive_readout_snapshots`.

This phase tested whether the current environment and repo can confirm concrete
source availability through safe probes:

- metadata table discovery;
- metadata column and nested-field discovery;
- bounded aggregate event volume checks;
- bounded minimum cohort checks;
- lane and Playbook layer classification.

The operating principle is:

```text
A source availability summary is not a value claim.
```

Layer 1 telemetry can support evidence availability and caveated evidence
snapshots. It cannot, by itself, support realized ROI, EBITA movement,
causality, productivity, or customer-facing financial claims.

## 2. Execution Status

Execution Status: `RUN_COMPLETED`

Safe probes ran against the configured BigQuery project for the bounded
one-day probe window `2026-06-11`.

| Probe type | Status | Output stored here | Safety notes |
| --- | --- | --- | --- |
| Environment inspection | `RUN_COMPLETED` | Tool presence and project posture only | No secrets printed or stored. |
| Table discovery | `RUN_COMPLETED` | Table-family counts and date suffix range | `INFORMATION_SCHEMA.TABLES` only. |
| Column discovery | `RUN_COMPLETED` | Field-path counts and approved-field coverage | `INFORMATION_SCHEMA.COLUMN_FIELD_PATHS` only; no raw values. |
| Aggregate event volume | `RUN_COMPLETED` | Table-family event counts only | Bounded to one day; no `SELECT *`; no raw rows. |
| Minimum cohort checks | `RUN_COMPLETED` | Slice-count summaries only | Slice IDs and actor identifiers were not emitted. |
| Existing adapter dry-run | `RUN_COMPLETED` | Estimated bytes and pass/fail only | Existing CLI defaulted to dry-run and emitted no payloads. |
| Adjacent `scrubbed_agentspan` metadata and availability | `RUN_COMPLETED` | Aggregate presence counts only | No skill names, action payloads, or raw span rows emitted. |

Existing adapter dry-run:

- Command path: `scripts/run_dogfood_bq_ingest.py`
- Probe window: `2026-06-11` to `2026-06-11`
- Result: `PASS`
- Dry-run mode: `true`
- Payloads written: `0`
- Estimated bytes scanned: `19,026,567,131`

No helper script was added because the existing adapter and ad hoc read-only
queries were sufficient for this phase.

## 3. Environment Findings

| Area | Finding |
| --- | --- |
| BigQuery CLI | Present: `bq 2.1.31`. |
| Google Cloud CLI | Present: `Google Cloud SDK 569.0.0`. |
| Active account posture | One active gcloud account was configured. |
| Application Default Credentials | Available. |
| Configured project | `scio-apps`. |
| BigQuery env vars | Common project/dataset variables were unset in the shell: `GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, `GCP_PROJECT`, `BQ_PROJECT_ID`, `BIGQUERY_PROJECT_ID`, `BIGQUERY_DATASET`, `FLUENCYTRACR_DOGFOOD_BQ_PROJECT`, and `FLUENCYTRACR_DOGFOOD_BQ_LOCATION`. |
| Credential env vars | `GOOGLE_APPLICATION_CREDENTIALS` was unset; ADC was used instead. |
| Repo configuration | The current dogfood adapter pins `scio-apps.scrubbed_llm_call.scrubbed_llm_call_*`, `scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*`, and `scio-apps.scrubbed_workflows.scrubbed_workflows_*` in code and docs. |
| Existing safety controls | `_TABLE_SUFFIX` guard, dry-run default, 100 GB estimate guard, k-min suppression, aggregate-only V3 output, and forbidden-field guard are implemented and tested. |

Relevant repo assets inspected:

- `scripts/run_dogfood_bq_ingest.py`
- `src/connectors/glean_dogfood_bq/adapter.py`
- `tests/test_glean_dogfood_bq_adapter.py`
- `docs/integrations/glean/dogfood-bq-adapter.md`
- `docs/CONNECTOR_MAPPING_SPEC.md`
- `sql/dogfood/*.sql`
- `docs/contracts/glean-ai-work-evidence/README.md`
- `docs/contracts/glean-signal-readiness/*`
- `docs/contracts/aggregate-evidence-import/*`
- `docs/contracts/real-source-readiness/*`
- `docs/integrations/value-realization/outcome-evidence.md`
- `docs/architecture/BIGQUERY_SIGNAL_AVAILABILITY_AUDIT.md`

## 4. Probe Window

| Field | Value |
| --- | --- |
| Probe run date | `2026-06-13` |
| Data window | `2026-06-11` through `2026-06-11` |
| Shard suffix | `20260611` |
| Project | `scio-apps` |
| Primary table families | `scrubbed_llm_call`, `scrubbed_client_analytics`, `scrubbed_workflows` |
| Adjacent research table families | `scrubbed_agentspan`, `scrubbed_glean_customer_event` |

This was intentionally a one-day source-availability check, not a 60-day
customer evidence run.

## 5. Table Discovery Results

`INFORMATION_SCHEMA.TABLES` confirmed the current dogfood table families and
the adjacent research sources used by V4 signal diagnostics.

| Table family | Table count | Minimum suffix | Maximum suffix | Probe-window table present |
| --- | ---: | --- | --- | --- |
| `scrubbed_client_analytics` | 1,342 | `20221010` | `20260613` | yes |
| `scrubbed_workflows` | 399 | `20250511` | `20260613` | yes |
| `scrubbed_llm_call` | 654 | `20240829` | `20260613` | yes |
| `scrubbed_agentspan` | 332 | `20250717` | `20260613` | yes |
| `scrubbed_glean_customer_event` | 1 | n/a | n/a | yes |

Interpretation:

- The three existing adapter table families are present and current.
- `scrubbed_agentspan_*` is also present for research-only skill, agent, and
  action-boundary diagnostics, but it is not part of the current governed V3
  dogfood adapter output.
- `scrubbed_glean_customer_event` is present as an adjacent trust/research
  source, not as customer system-of-record outcome evidence.

## 6. Column Discovery Results

`INFORMATION_SCHEMA.COLUMN_FIELD_PATHS` was run against the `20260611` sharded
tables. Results below count approved metadata paths only; raw field values were
not selected.

| Table | Total field paths seen | Approved fields expected | Approved fields found | Approved fields missing |
| --- | ---: | ---: | ---: | ---: |
| `scrubbed_llm_call_20260611` | 150 | 41 | 41 | 0 |
| `scrubbed_client_analytics_20260611` | 172 | 50 | 48 | 2 |
| `scrubbed_workflows_20260611` | 336 | 126 | 126 | 0 |
| `scrubbed_agentspan_20260611` | 836 | 8 research fields | 8 | 0 |

Interpretation:

- The current adapter allowlist fully matches the live `scrubbed_llm_call` and
  `scrubbed_workflows` metadata for the probe date.
- `scrubbed_client_analytics` is mostly aligned, with two approved paths not
  present in the probed shard. This does not block surface usage volume checks,
  but it should remain a caveat for production materialization.
- The `scrubbed_agentspan` research fields needed for skill-read and parent
  join availability checks exist, but this does not promote Skills or action
  boundary claims.

## 7. Aggregate Volume Results

Aggregate count-only probes were run for the three current dogfood adapter
families. The final output stored here is table-family volume only.

| Table family | Aggregate rows/events in `2026-06-11` window |
| --- | ---: |
| `scrubbed_workflows` | 192,652,306 |
| `scrubbed_client_analytics` | 65,196,515 |
| `scrubbed_llm_call` | 16,361,354 |
| Total across current adapter families | 274,210,175 |

Adjacent `scrubbed_agentspan` aggregate presence check:

| Signal | Count |
| --- | ---: |
| Total agent span rows | 141,701,963 |
| Rows with skill-reader attribute present | 67,446 |
| Rows with legacy agentmetadata skill input present | 0 |
| Rows with legacy spaninfo skill input present | 0 |
| Rows with parent join reference present | 16,498,618 |

Workflow metadata presence check:

| Metadata presence signal | Count |
| --- | ---: |
| Total workflow rows | 192,652,306 |
| Rows with artifact metadata present | 547,899 |
| Rows with agent routing marker present | 0 |
| Rows with trigger metadata present | 55,881,189 |
| Rows with verification metadata present | 16,350,404 |

Dry-run estimates:

- Existing adapter dry-run estimate: `19,026,567,131` bytes.
- Minimum cohort check dry-run estimate: `18,454,787,116` bytes.
- `scrubbed_agentspan` skill-presence aggregate dry-run estimate:
  `608,238,633` bytes.
- Workflow metadata presence aggregate dry-run estimate: `1,205,110,090` bytes.
- The count-only table-family volume query dry-run returned `0` bytes processed
  for the optimized `COUNT(*)` form. Treat this as a query planner/cost
  optimization signal, not as evidence that all volume checks are cost-free.

## 8. Minimum Cohort Results

Minimum cohort checks were run as aggregate summaries. The probe computed slice
counts and k-min clear counts inside BigQuery, but did not emit slice IDs or
actor identifiers.

| Table family | Total aggregate slices | k-min clear slices | Sub-minimum or unknown slices | Events reviewed |
| --- | ---: | ---: | ---: | ---: |
| `scrubbed_workflows` | 38,472 | 1,662 | 36,810 | 192,652,306 |
| `scrubbed_llm_call` | 60,402 | 1,617 | 58,785 | 16,361,354 |
| `scrubbed_client_analytics` | 1 | 1 | 0 | 65,196,515 |
| Total | 98,875 | 3,280 | 95,595 | 274,210,175 |

Interpretation:

- There is enough volume for a meaningful set of aggregate Layer 1 telemetry
  slices.
- Most workflow-like slices remain sub-minimum or unknown in a one-day window.
  This reinforces the need for independent per-slice suppression and likely a
  longer governed window before productizing snapshot persistence.
- The cohort check confirms availability only. It does not produce customer
  value evidence or claim readiness by itself.

## 9. Evidence Lane Availability Summary

| Evidence lane | Classification | Source checked | Fields exist | Aggregate volume exists | k-min gate posture | Customer-safe output | Can support `evidence_snapshots` now | Can support `claim_readiness_snapshots` now | Required caveats |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `surface_usage` | `available_now` | Current adapter families, V3 aggregate ingest, source readiness contracts | yes | yes, 274.2M events in one-day probe | yes for 3,280 slices; many slices suppress | yes, aggregate only | yes, caveated Layer 1 telemetry | partially, as source posture only | No ROI, EBITA, causality, productivity, or customer financial claims from telemetry alone. |
| `skill_lifecycle` | `partially_available` | `scrubbed_agentspan_*`, skill-read diagnostic SQL, Glean AI Work Evidence contract | research fields present | yes, 67,446 rows with skill-reader attribute present | not validated by canonical skill identity/version | availability counts only | yes, as research/source availability context | no, not for reusable expertise claims | Raw skill names remain forbidden; canonical skill identity, versioning, invocation mode, and personal/shared/org separation remain required. |
| `agent_lifecycle` | `derivable_with_existing_data` | `scrubbed_workflows_*`, `scrubbed_agentspan_*`, agent diagnostics, source readiness contracts | yes for workflow/span metadata | yes | partially, by workflow-like slice only | yes if emitted as aggregate counts | yes, for caveated run/status context | partially, for posture only | Agent lifecycle is not financial agent value unless paired with Layer 3 outcomes and approved claim gates. |
| `mcp_action_boundary` | `requires_customer_export` | `scrubbed_agentspan` metadata, AI Work Evidence contract, real-source readiness contracts | partial metadata found | not fully probed as governed lane | not validated | not yet | no, except as missing/held lane | no | Needs approved aggregate action-boundary export with host class, operation class, HITL, activity log, and policy decision states. |
| `artifact_output` | `derivable_with_existing_data` | `scrubbed_workflows_*`, Glean AI Work Evidence and Value Evidence contracts | yes | yes, 547,899 rows with artifact metadata present | not artifact-specific in this run | yes if type/count only | yes, as output metadata context | partially, with quality/outcome pairing | Artifact output is not business value unless paired with quality, outcome, review, or customer approval evidence. No artifact contents. |
| `control_evidence` | `requires_customer_export` | Source readiness contracts, real-source readiness, AI Work Evidence control lane | contract exists; live BQ lane not confirmed | unknown for approved control states | not validated | only after policy-owner approval | no, except as missing/held lane | no | Control evidence is governance evidence, not product telemetry. Needs approved aggregate AI security/control-state export. |
| `assumptions` | `requires_customer_export` | Value Evidence Pack, claim registry, real-source readiness, outcome evidence contracts | contract exists; not telemetry | not applicable | not applicable | yes only as governed business-owner state | yes, if exported as aggregate assumption state | partially, if approval state is attached | Assumptions are not telemetry. Finance/customer-safe approval and low-confidence/high-sensitivity assumption review must come from governed business process. |

## 10. Playbook Evidence Layer Summary

| Evidence layer | Current availability | Source path | Confidence | Gap | First evidence snapshot | First executive readout | Financial translation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Layer 1: Platform Telemetry | `partially_available` | Current dogfood adapter, V3 aggregate ingest, `scrubbed_agentspan` research metadata, source readiness contracts | medium-high for dogfood source availability; medium for productized lane completeness | Skills, MCP/action boundary, artifact, and control lanes are not all governed end-to-end materializers | yes, caveated | yes, as telemetry context only | no |
| Layer 2: User Voice / Empirical Evidence | `requires_customer_export` | AI Fluency baseline contract and aggregate exports | medium for contract readiness; unknown for live customer availability | No BigQuery source in current adapter; retest movement requires customer aggregate export | yes, only when exported | yes, with caveats | no |
| Layer 3: Business System Outcomes | `requires_customer_export` | Outcome Evidence API and customer-attested aggregate KPI exports | medium for repo contract; unknown for customer data availability | No live system-of-record connector; no automatic finance approval | yes, only when customer-attested baseline/comparison exists | yes, only with accepted outcome evidence | only after finance/customer approval |
| Governance Evidence | `available_now` | Suppression gates, adapter tests, source readiness, aggregate import, claim registry, forbidden-field guards | high for repo controls | Does not replace missing business evidence | yes, as caveats and source posture | yes, as caveats and blocked-claim language | no |
| Assumption Evidence | `requires_customer_export` | Value Evidence Pack assumptions, real-source readiness approval states, claim boundary artifacts | medium for contract shape; unknown for live approvals | Assumption ledger and financial approval are external to BigQuery | yes, if exported as aggregate review state | yes, if approved and caveated | only with explicit approval |

## 11. Gaps And Blockers

1. Layer 1 telemetry is real, but uneven by lane.
   The current adapter proves surface/workflow source availability. It does not
   yet productize the full Skills, Agents, MCP/actions, artifacts, controls,
   and assumptions model.

2. One-day k-min clearance is selective.
   The probe found 3,280 k-min clearing slices and 95,595 sub-minimum or
   unknown slices. This is enough to prove source availability, but not enough
   to assume broad claim coverage.

3. `scrubbed_client_analytics` has minor allowlist drift.
   Two approved fields were not present in the probed shard. This should be
   handled as source drift before a production materializer depends on those
   fields.

4. Skill-read evidence is available but not promoted.
   `scrubbed_agentspan_*` contains skill-reader availability and parent join
   references, but raw skill names remain forbidden and reusable skill claims
   remain blocked until canonical identity, version, invocation mode, and
   ownership boundaries are validated.

5. MCP/action boundary evidence is not ready.
   Metadata suggests some action-boundary fields exist, but the required
   governed lane needs customer-approved aggregate export fields and policy
   decision states.

6. Artifact output is available only as metadata.
   Artifact metadata presence is not enough for business value. It needs
   quality review, customer outcome evidence, or accepted business-system
   evidence before it can support stronger claims.

7. Layer 2 and Layer 3 are outside the current BigQuery adapter.
   AI Fluency baseline, retest movement, customer-owned KPIs, assumption
   approval, and finance approval require aggregate customer exports or
   customer-attested outcome evidence.

8. Snapshot persistence should not begin with executive readouts.
   Evidence lineage must flow from source availability to evidence snapshot to
   claim readiness snapshot before executive readout snapshots are durable.

## 12. Snapshot Readiness Decision

Decision: `READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT`

What can be snapshotted now:

- Layer 1 surface/workflow telemetry availability;
- table-family source references and probe-window coverage;
- approved-field coverage by current adapter table;
- aggregate event volumes by table family;
- k-min clear/sub-minimum slice summaries;
- source readiness and governance caveats;
- missing or held lane states for Skills, MCP/actions, controls, assumptions,
  Layer 2, and Layer 3;
- artifact metadata presence as output-context evidence only.

What must remain missing or caveated:

- user voice unless supplied as aggregate AI Fluency baseline or retest export;
- customer system-of-record outcomes unless supplied through aggregate outcome
  evidence ingestion;
- aggregate HRIS-derived workforce context unless supplied as cohort-safe,
  customer-approved aggregate source context, outcome evidence, or assumption
  state;
- finance/customer-safe approval state;
- reusable skill or named workflow leverage claims;
- MCP/action boundary claims;
- artifact-backed business value claims;
- agent value claims without paired outcome evidence;
- any financial translation beyond approved customer/finance evidence.

What must be blocked:

- realized ROI, EBITA, causality, prediction, productivity, headcount, manager
  comparison, team-level comparative ordering, or individual attribution claims;
- person-level HRIS records, direct identifiers, hashed or joinable person
  identifiers, people decisioning, compensation/performance inference,
  promotion/discipline inference, and HRIS inference from AI usage;
- raw row export or raw content storage;
- raw skill names, action payloads, prompt/response content, transcripts,
  query text, file contents, URLs, emails, user IDs, or actor IDs;
- `claim_readiness_snapshots` that silently treat missing lanes as supported;
- `executive_readout_snapshots` that do not carry evidence and claim caveats
  forward.

Source exports needed next:

- aggregate AI Fluency baseline and retest package for Layer 2;
- aggregate customer-attested KPI baseline/comparison package for Layer 3;
- customer-approved aggregate workforce context package where HRIS-derived
  context is needed for workflow-level value measurement;
- approved MCP/action boundary aggregate export;
- approved control/AI security aggregate export;
- governed skill lifecycle export with canonical identity, versioning,
  invocation mode, and ownership separation;
- assumption ledger or claim boundary approval state from the customer/business
  owner process.

Persistence readiness:

```text
Evidence snapshot persistence can be considered only for a telemetry-first,
caveated source snapshot that preserves held and missing lanes.

Claim readiness and executive readout snapshot persistence should hold until
Layer 2, Layer 3, approval, and lane-specific export paths are attached.
```

## 13. Next Recommended Product Step

Recommended next move:

```text
Define a minimal telemetry-first evidence_snapshot contract before any
migration.
```

The contract should persist only aggregate, customer-safe fields:

- source family;
- probe window;
- approved-field coverage summary;
- aggregate event volume;
- k-min summary;
- evidence lane classification;
- Playbook layer classification;
- missing/held lane caveats;
- links to source readiness and claim boundary artifacts.

Do not proceed directly to claim/readiness or executive readout persistence.
The safer sequence is:

1. Draft the minimal `evidence_snapshots` contract.
2. Require source manifests for Layer 2 and Layer 3 before stronger claims.
3. Keep `claim_readiness_snapshots` as a posture artifact until missing lanes
   are explicitly held, exported, or promoted.
4. Persist `executive_readout_snapshots` only after they reference evidence and
   claim snapshots and carry all caveats forward.

Biggest risk:

```text
Treating high Layer 1 volume as proof of value.
```

What to validate first:

```text
Whether a 60-day aggregate telemetry window produces stable enough k-min
coverage for a telemetry-only evidence snapshot without implying unsupported
claim readiness or financial value.
```
