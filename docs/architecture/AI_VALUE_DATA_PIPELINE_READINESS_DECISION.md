# AI Value Data Pipeline Readiness Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean, Sigma, or BigQuery execution, ingestion jobs, export packages,
rendered customer readouts, confidence math, ROI, causality, productivity,
probability, or customer-facing financial output.

Phase: `phase-ai-value-data-pipeline-readiness-decision`

Decision: `PIPELINE_NOT_BUILT__READINESS_DESIGN_REQUIRED`

## 1. Purpose

The current AI Value spine can accept reviewed scrubbed aggregate source objects
and move them through Operator Source Handoff, Data Spine review, Source Package
Review Queue, Measurement Cell Assembly, and Measurement Cell Series alignment.

It does not yet include a production Sigma or BigQuery data pipeline. The repo
does contain bounded V3 aggregate ingest and internal dogfood BigQuery adapter
paths; those are not authorization to build or describe a production
Sigma/BigQuery product pipeline. This decision records the safe next boundary
before any pipeline implementation can start.

## 2. Current Repo State

Current supported boundary:

```text
customer/Glean-approved transformation boundary
-> scrubbed aggregate Glean/BigQuery or dashboard summary
-> governed aggregate intake contract
-> Operator Source Handoff
-> Data Spine Readiness
-> Source Package Review Queue
-> Measurement Cell Assembly
```

Current repo support:

- contract-only scrubbed aggregate Glean/BigQuery summary intake;
- bounded V3 aggregate ingest for pre-computed cohort distributions;
- internal dogfood BigQuery adapter paths for governed aggregate testing;
- controlled aggregate connector adapter / review packet proof for
  BigQuery/Sigma-shaped saved aggregate fixtures;
- controlled aggregate manifest validation proof that a saved connector review
  packet can become Source Inventory, Aggregate Extraction, and Pipeline Run
  Review manifests without persistence or live execution;
- aggregate AI Fluency dashboard import contracts;
- VBD/token aggregate intake contracts;
- customer metric aggregate/manual-entry contracts;
- operator source handoffs;
- Data Spine alignment;
- Source Package Review Queue;
- Measurement Cell and Series contract objects.

Not built:

- production live BigQuery query execution for the AI Value spine;
- production live Sigma dashboard execution or export ingestion for the AI
  Value spine;
- live Glean data pulls;
- production connector runtime;
- raw-row parser;
- SQL/query runner;
- ingestion job;
- durable pipeline run storage;
- customer-facing pipeline output.

## 3. Decision

Do not build the Sigma/BigQuery data pipeline yet.

Decision value:

```text
PIPELINE_NOT_BUILT__READINESS_DESIGN_REQUIRED
```

Reason:

- the controlled scrubbed aggregate pilot has not been executed;
- Measurement Cell persistence is held;
- Series persistence is held;
- customer projection and exports are held;
- confidence research is held;
- live execution would introduce raw-row, query-text, identifier, source-drift,
  and overclaim risks before the governed aggregate pilot demonstrates the
  boundary.

## 4. Future Pipeline Boundary

Future pipeline work must keep execution upstream of FluencyTracr until a later
promotion decision says otherwise.

Bounded V3 aggregate ingest and internal dogfood BigQuery tooling remain
separate from this pipeline. They can demonstrate aggregate boundaries, but they
do not clear source inventory, Source Package Review Queue, Measurement Cell
persistence, customer projection, export governance, or live pipeline
implementation.

Allowed future boundary:

```text
BigQuery/Sigma/source-system execution inside approved Glean or customer boundary
-> aggregate extraction
-> suppression and k-min enforcement
-> source-owner attestation
-> scrubbed aggregate manifest
-> FluencyTracr aggregate intake contract
```

Blocked boundary:

```text
FluencyTracr runs BigQuery/Sigma/live customer queries
-> raw rows enter FluencyTracr
-> raw rows are parsed, stored, or rendered
-> outputs become customer-facing financial or confidence claims
```

## 5. Required Future Contracts Before Implementation

Before any code implementation, add docs/contracts for:

1. **Source Inventory Manifest**

   Required fields:

   - source lane;
   - source system category;
   - source owner role;
   - source owner attestation;
   - approved source reference;
   - approved extraction window;
   - cohort/function/workflow coverage;
   - k-min and suppression posture;
   - approved aggregate output fields;
   - blocked fields;
   - legal/trust review state when required.

2. **Aggregate Extraction Manifest**

   Required fields:

   - extraction manifest id;
   - source inventory ref;
   - approved aggregate definition ref, not query text;
   - upstream aggregate attestation ref, not live run handles;
   - execution boundary;
   - schema version;
   - aggregate grain;
   - metric definitions;
   - source package lane;
   - suppression results;
   - freshness state;
   - blocked-use posture.

   These refs must not be job IDs, run IDs, query refs, API handles,
   dashboard/export URLs, clearance decisions, executable references, or live
   execution handles.

3. **Pipeline Run Review Manifest**

   Required fields:

   - pipeline run review manifest id;
   - operator role;
   - source owner role;
   - reviewed aggregate source refs;
   - Data Spine alignment envelope;
   - Source Package Review Queue posture ref;
   - validation result refs;
   - allowed-use posture;
   - false boundary policy;
   - blocked claims;
   - caveats;
   - stop conditions.

   These refs must not be job IDs, run IDs, query refs, API handles,
   dashboard/export URLs, Source Package clearance decisions, executable
   references, or live execution handles.

4. **Pipeline Promotion Decision**

   Required outcomes:

   - `HOLD_FOR_CONTROLLED_AGGREGATE_PILOT`
   - `HOLD_FOR_SOURCE_INVENTORY`
   - `HOLD_FOR_SUPPRESSION_REVIEW`
   - `HOLD_FOR_SECURITY_AND_TRUST_REVIEW`
   - `PROMOTE_SAVED_AGGREGATE_FIXTURE_ADAPTER`
   - `PROMOTE_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW`
   - `REJECT_CURRENT_PIPELINE_SCOPE`

Current docs-only status:

| Contract | Status |
| --- | --- |
| Source Inventory Manifest | Drafted in `docs/contracts/ai-value-source-inventory-manifest/README.md` |
| Aggregate Extraction Manifest | Drafted in `docs/contracts/ai-value-aggregate-extraction-manifest/README.md` |
| Pipeline Run Review Manifest | Drafted in `docs/contracts/ai-value-pipeline-run-review-manifest/README.md` |
| Pipeline Promotion Decision | Not promoted; live connector implementation remains blocked |

These documents are readiness contracts only. They do not authorize live
execution, credentials, query storage, raw rows, persistence, routes, UI,
exports, confidence math, ROI, causality, productivity, probability, finance
output, or customer-facing output.

## 6. Sigma Boundary

Sigma dashboards or exports can be future source surfaces only when they produce
approved aggregate summaries with source-owner attestation and suppression
posture.

Sigma must not be treated as:

- source-bound customer readout output;
- source package proof by itself;
- Measurement Cell proof;
- export governance approval;
- customer-facing finance output;
- confidence-model input;
- raw dashboard-row import permission.

## 7. BigQuery Boundary

BigQuery may remain the upstream execution environment for aggregate extraction,
but FluencyTracr must not receive:

- raw rows;
- raw files;
- query text;
- SQL text;
- prompts;
- responses;
- transcripts;
- ticket contents;
- file contents;
- direct identifiers;
- emails;
- user IDs;
- employee IDs;
- respondent IDs;
- row IDs;
- span IDs;
- hashed or joinable person identifiers;
- HRIS fields;
- workforce productivity measurement fields;
- ranking fields.

FluencyTracr may receive only reviewed aggregate summaries, compact source refs,
suppression posture, k-min posture, alignment metadata, blocked uses, and
caveats.

## 8. Must-Fail Checks

Future pipeline readiness or implementation must fail closed when:

| Check | Must fail when |
| --- | --- |
| Live execution overread | A doc, route, script, or UI implies FluencyTracr can run Sigma, Glean, or BigQuery live |
| Raw-row leakage | Raw rows, dashboard rows, files, query results, transcripts, prompts, SQL, or identifiers enter FluencyTracr |
| Unsafe source refs | Source refs contain query text, raw-table names with sensitive detail, identifiers, finance claims, probability/confidence language, ranking, or productivity language |
| Source drift | Source lane, owner, org/client/workflow/function/cohort/window/metric/path, source ref, or approval metadata drifts |
| Suppression drift | k-min, suppression, held, missing, rejected, or blocked evidence is hidden or softened |
| Sigma overread | Sigma dashboard status is treated as reviewed source clearance, Measurement Cell proof, export approval, or customer-safe output |
| BigQuery overread | BigQuery source availability is treated as full evidence coverage, value proof, ROI proof, causality, or confidence input |
| Stale validation | Any pipeline output trusts copied `valid: true`, stale validation JSON, stale timestamps, or copied review summaries |
| JSONB smuggling | Unsafe fields appear inside payload, validation, source refs, caveats, notes, labels, blocked uses, or compact posture fields |
| Generic object authority | `ai_value_objects`, legacy `executive_packet`, prototype readouts, generated output files, or generic full-payload routes are treated as source clearance, pipeline proof, Measurement Cell proof, customer-safe output, or durable authority |
| Persistence bypass | Any manifest, route, script, fixture adapter, JSONB blob, migration, table, repository method, generated artifact, or run report creates de facto pipeline run persistence before promotion |
| Finance/model overread | Any output contains ROI, EBITDA, finance-output, causality, productivity, probability, confidence, model, or score-like fields |

## 9. Promotion Ladder

Proceed in this order only:

1. Source inventory manifest design. `DONE_DOCS_ONLY`
2. Aggregate extraction manifest design. `DONE_DOCS_ONLY`
3. Pipeline run review manifest design. `DONE_DOCS_ONLY`
4. Saved aggregate fixture adapter decision. `PROMOTED_SAVED_FIXTURE_ONLY`
5. Controlled scrubbed aggregate pilot execution.
6. Measurement Cell persistence promotion reconsideration.
7. Separate live pipeline concept / boundary review decision.

Do not skip from this readiness decision to live BigQuery/Sigma execution.

## 10. Recommended Next Move

The three future contract docs now exist and have an executable saved-fixture
validation layer:

- Source Inventory Manifest;
- Aggregate Extraction Manifest;
- Pipeline Run Review Manifest;
- Controlled Aggregate Manifest Validation.

Completed safe move for pipeline work:

1. Bind the controlled aggregate connector adapter output to these three
   contract shapes using saved fixture data only.
2. Add red/green validation tests proving the three manifests reject unsafe
   refs, raw rows, query text, credentials, prompt/transcript fields,
   identifiers, Source Package clearance aliases, Measurement Cell snapshot
   aliases, ROI, EBITDA, causality, productivity, probability, confidence-like
   model fields, and customer-facing output.

Next safe move:

Draft a separate Pipeline Promotion Decision. That decision may still hold live
BigQuery/Sigma execution and must not promote manifest persistence, Series
persistence, customer-facing output, confidence research, or finance output
unless each exact scope is separately authorized.

## 11. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
