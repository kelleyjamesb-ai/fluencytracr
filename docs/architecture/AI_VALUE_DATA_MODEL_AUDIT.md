# AI Value Data Model Audit

Status: historical planning audit only; superseded for current persistence
authority by `docs/architecture/AI_VALUE_PERSISTENCE_DESIGN.md` and for the
approved expectation-path data-model pass by
`docs/architecture/AI_VALUE_LOGICAL_DATA_MODEL.md`.

Phase: `phase-ai-value-data-model-audit`

This document does not create migrations, routes, schemas, ingestion, UI, or
governance changes. It audited the AI Value Platform state at the time it was
written. Treat proposed durable-state language here as historical planning
context unless a later current authority document re-promotes that exact scope.

## 1. Purpose

FluencyTracr has accumulated AI Value Platform concepts across docs, shared
engine objects, schemas, generated examples, frontend mocks, and backend
persistence. The product now needs a sharper boundary between:

- static framework and language defaults;
- customer-specific durable state;
- derived aggregate evidence snapshots; and
- external systems of record.

Core audit rule:

```text
If a concept appears in the Executive Readout, Claim Gate, Financial Translation,
Value Realization flow, or Intervention Loop, it must either be persisted as
customer-specific state or be derivable from persisted evidence snapshots.
```

## 2. Current Persistence Inventory

There is no top-level `supabase/` directory in this repo. Current database state
is managed through `backend/prisma/` and a Postgres datasource. Supabase-style
hardening exists through migrations that enable RLS on public application tables
and revoke direct `anon` / `authenticated` table access where tables are exposed.

| Area | Current durable table or file | Current behavior | Audit finding |
| --- | --- | --- | --- |
| Prisma schema | `backend/prisma/schema.prisma` | Defines Postgres models for V1/V2/V3 evidence, workflow governance, outcome evidence, and generic AI Value objects. | This is the current database source of truth. |
| AI Value objects | `ai_value_objects` via `backend/prisma/migrations/20260609220000_add_ai_value_objects/migration.sql` | Stores validated JSON objects by `org_id`, `object_type`, `object_id`, `schema_version`, `workflow_family`, payload, validation result, and validity. | Useful generic object store, but too broad to express durable product state, snapshots, lineage, and retention cleanly. |
| AI Value repository | `backend/src/repositories/ai-value-object.repository.ts` | Uses Prisma when `DATABASE_URL` exists; otherwise falls back to in-memory `store.aiValueObjects`. | Local demo state can disappear on backend restart; durable behavior depends on DATABASE_URL. |
| AI Value routes | `backend/src/ai_value_routes.ts` | Registers object types including `blueprint`, `metrics_library`, `value_scenario`, `roi_scenario`, `evidence_readiness`, `claim_boundary`, `executive_packet`, `engagement`, `fluency_baseline`, `outcome_evidence_export`, `data_boundary`, `value_improvement_loop`, and `value_evidence_case`. | Existing object-type registration covers many concepts, but readout/claim/evidence snapshot semantics are embedded inside payload JSON. |
| Outcome evidence | `outcome_evidence` via `backend/prisma/migrations/20260522053000_add_outcome_evidence_ingestion/migration.sql` | Stores aggregate customer-attested KPI outcomes by org, workflow, metric, window, aggregate value, cohort size, source system, optional JBTD/persona keys, and source attestation. | This is real durable evidence state and should remain upstream input to AI Value snapshots. |
| V3 verdicts | `fluencytracr_verdicts` via `backend/prisma/migrations/20260522170000_add_v3_fluencytracr_verdicts/migration.sql` | Stores immutable aggregate SURFACE/SUPPRESS verdicts with window, calibration, cohort, evidence grade, velocity, quality multiplier, and payload JSON. | This is the governed source for suppression-aware evidence snapshots. |
| Velocity distributions | `velocity_distribution_observations` via `backend/prisma/migrations/20260522123000_add_velocity_distribution_observations/migration.sql` | Stores aggregate V2 velocity observations only, with person-level flag forced false. | Durable input to VBD-style evidence, not itself an executive readout. |
| V1 persistence | `canonical_events`, `execution_snapshots`, `classification_outcomes`, `workflow_aggregates`, `threshold_calibrations`, `suppression_audit_log` | Stores canonical event and derived governance pipeline state. | Existing behavioral evidence layer; do not add canonical events or suppression reasons. |
| Suppression audit | `suppression_audit_log` and V3 verdict payloads | Records suppression and diagnostics for governance/debug. | Already durable. AI Value snapshots should reference suppression state rather than duplicate raw diagnostics. |
| EvidenceBundle v1 | `docs/contracts/evidence-bundle/v1/*` | Stable partner-facing contract with optional `forwarded_distribution`; no dedicated product table. | Contract is static; emitted bundles can be derived from verdict/evidence snapshots. |
| Glean Value Evidence Pack | `shared/src/gleanValueEvidenceSchemas.ts`, `docs/contracts/glean-value-evidence/*` | Validated schema, docs, and example for org-window claim evidence posture. | Not persisted today; should remain adapter/framework unless a future Glean-specific snapshot is required. |
| Glean Claim Registry | `shared/src/gleanClaimRegistrySchemas.ts`, `docs/contracts/glean-claim-registry/*` | Default templates plus example org-window evaluations. | Registry templates are static product defaults; evaluated claim readiness should be a derived snapshot when used. |
| Executive readout | `executive_packet` object, renderer in `shared/src/aiValueEngine/readoutHtml.ts`, static prototype page | Backend can render HTML from a stored executive packet and context; `/ai-value-readout` prototype uses hardcoded frontend mock data. | No dedicated readout snapshot table. Current static prototype data is not durable customer state. |
| BigQuery adapter evidence | `scripts/run_dogfood_bq_ingest.py`, dogfood docs/tests | Read-only adapter emits aggregate V3 payloads from scrubbed BigQuery sources or synthetic fixtures. | BigQuery remains the heavy evidence warehouse. Supabase should store only reviewed aggregate snapshot outputs and source-readiness summaries. |
| Frontend live mode | `frontend/src/hooks/useAiValueWorkspace.ts`, `frontend/src/hooks/useAiValueJourney.ts` | Fetches AI Value object summaries/details and can run value-chain/materializer actions. | UI depends on object store, but many derived screens are reconstructed live rather than persisted as readout snapshots. |
| Frontend static mocks | `frontend/src/constants/aiValueWorkspace.ts`, `frontend/src/pages/AIValueReadoutPrototype.tsx` | Example/workshop/prototype data embedded in frontend code. | Useful for UX exploration only; should not be treated as persisted product state. |

## 3. Framework Concepts Inventory

The current framework concepts are useful, but they are not all database
entities. The safest model is:

- keep canonical language, templates, ladders, and definitions static;
- persist customer selections and measurement plans;
- derive evidence, claim, and readout snapshots from governed aggregate inputs;
- keep raw or near-raw data in external systems such as BigQuery or customer
  systems of record.

| Concept | Current Location | Current Form | Needs Supabase State? | Persist / Derive / Static | Suggested Table | Why | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI Fluency Baseline | `shared/src/aiValueEngine/fluencyBaseline.ts`, `customer-support-fluency-baseline.json`, `ai_value_objects` object type | Aggregate validated object and fixture | Yes, when used in readouts or retests | Persist snapshot or derive from imported aggregate baseline | `evidence_snapshots` | Readouts and retests need a reproducible aggregate baseline without person-level survey rows. | P1 |
| VBD Operating Map | `docs/concepts/AI_VALUE_MEASUREMENT_MODEL.md`, `value_evidence_case.vbd_summary`, frontend VBD views | Framework plus derived display context | Yes, as derived state | Derive from persisted evidence snapshots | `evidence_snapshots` | Executive readouts need the VBD posture that existed at a specific window. | P1 |
| Value Hypothesis | `blueprint.value_hypothesis`, `docs/contracts/value-hypothesis-registry/*`, `docs/architecture/CANONICAL_LANGUAGE_SYSTEM.md` | Customer/workflow hypothesis inside blueprint plus static registry examples | Yes | Persist | `value_hypotheses` | This is the customer's chosen value path and must survive between sessions. | P0 |
| Measurement Plan | `metrics_library`, `outcome_evidence_export`, `blueprint.windows`, ROI scenario source refs | Engine object composition | Yes | Persist | `measurement_plans` | Metric choices, source systems, owners, baseline window, and comparison window are customer-specific product state. | P0 |
| Evidence Collection | `evidence_readiness`, `outcome_evidence_export`, real evidence materializer | Derived engine object and reviewed export | Yes | Derive and snapshot | `evidence_snapshots` | Evidence state must be reproducible when a claim gate or readout is regenerated. | P0 |
| EvidenceBundle | `docs/contracts/evidence-bundle/v1/*`, optional V3 `forwarded_distribution` | Static contract plus derivable emitted bundle | No dedicated first pass | Static contract; derive emitted bundle from snapshot | `evidence_snapshots` if emitted | EvidenceBundle is a contract shape, not necessarily a separate product table. | P2 |
| Glean Value Evidence Pack | `shared/src/gleanValueEvidenceSchemas.ts`, `docs/contracts/glean-value-evidence/*` | Glean adapter contract and example | Not in minimal core | Derive or keep adapter-specific | `evidence_snapshots` or future adapter table | It is Glean-specific and should not become universal core state prematurely. | P2 |
| Evidence Layer Alignment | real evidence materializer, `evidence_readiness`, `value_evidence_case` | Derived readiness/alignment result | Yes | Derive and snapshot | `evidence_snapshots` | Claim readiness depends on which lanes were present, missing, suppressed, or held. | P1 |
| Claim Registry | `docs/contracts/glean-claim-registry/*`, `shared/src/gleanClaimRegistrySchemas.ts` | Static templates and example evaluation set | No for templates | Static framework default | Static product bundle | Default claim templates are product configuration; only evaluated readiness needs snapshots. | P2 |
| Claim Readiness | `claim_boundary`, Glean `claim_readiness`, `executive_packet` | Derived engine output | Yes | Derive and snapshot | `claim_readiness_snapshots` | Readouts must show exactly which claims were allowed, caveated, or blocked for the evidence window. | P0 |
| Financial Claim Gate | `roi_scenario.financial_claim_gate` | Derived gate inside ROI scenario | Yes | Derive and snapshot | `claim_readiness_snapshots` | Financial permission is a decision artifact and must be reproducible. | P1 |
| Financial Translation | `ebita_impact_summary`, `shared/src/aiValueEngine/ebitaBridge.ts`, language aliases | Derived translation layer | Yes, if displayed | Derive and snapshot | `claim_readiness_snapshots` | If a readout says financial translation is allowed or blocked, the basis must be retained. | P1 |
| EBITA Impact Bridge | `docs/concepts/EBITA_IMPACT_BRIDGE.md`, `shared/src/aiValueEngine/ebitaBridge.ts` | Deterministic shared object layer, no persistence authorization | Not as source state | Derive and snapshot only when included in readout | `claim_readiness_snapshots` | The bridge should not become a calculator table; store the decision posture, not raw financial math. | P1 |
| Productivity Recapture Rate | `docs/architecture/CANONICAL_LANGUAGE_SYSTEM.md`, assumption ledger schemas | Conceptual language and assumption category | Not as standalone table | Static framework plus customer assumptions | `measurement_plans` | Recapture is a customer-owned assumption, not proof from usage telemetry. | P2 |
| Value Chain Stage | `shared/src/aiValueEngine/spine.ts`, language docs | Static engine workflow | No | Static framework | Static product bundle | Stages define orchestration order, not customer state. | P2 |
| Value Accounting | ROI scenario financial claim gate, language system | Customer-owned assumptions plus derived financial permission | Yes, if selected | Persist inputs; derive gate | `measurement_plans`, `claim_readiness_snapshots` | Finance review depends on customer-owned assumptions and approval state. | P1 |
| Executive Readout | `executive_packet`, `readoutHtml`, `/ai-value-readout` prototype | Engine packet and static mock UI | Yes | Derive and snapshot | `executive_readout_snapshots` | Sponsor-facing artifacts need versioned, reproducible readout state. | P0 |
| Next Evidence Actions | executive packet, EBITA bridge, value evidence case, value improvement loop | Derived recommendations | Yes, if displayed or assigned | Derive and snapshot first | `executive_readout_snapshots` | The readout should preserve the action list shown to the sponsor. | P1 |
| Intervention Recommendation | `value_improvement_loop`, frontend Decision & Retest views | Engine object and UI view model | Yes, as part of loop | Persist plan inputs; derive recommendations | `measurement_plans`, `executive_readout_snapshots` | Intervention language is operational product state once a customer acts on it. | P1 |
| Retest Loop | `value_improvement_loop`, baseline/comparison docs, workspace decision flow | Engine object and UI view model | Yes | Persist next measurement cycle | `measurement_plans` | Retest requires a durable next window and comparison basis. | P1 |
| Renewal Evidence Pack | executive packet, claim packet schemas, readout renderer | Generated artifact concept | Not first pass | Derive and snapshot | `executive_readout_snapshots` | Renewal/QBR artifacts should come from the stored readout snapshot, not regenerated from drifting inputs. | P2 |
| Suppression Events | `suppression_audit_log`, `fluencytracr_verdicts`, V1/V3 gates | Existing durable governance state | Already exists | Persist in existing tables; reference from snapshots | Existing suppression/verdict tables | Do not duplicate or weaken fail-closed governance. | P0 |
| Governance Review State | `outcome_evidence_export.review`, claim gates, RLS migrations | Review fields embedded in object JSON | Yes | Persist as source decision or snapshot | `measurement_plans`, `claim_readiness_snapshots` | Human acceptance/rejection decisions are durable state and should not be lost in mock or transient payloads. | P1 |
| Customer Metric Selections | `metrics_library`, blueprint-to-metric recommendations, frontend bridge | Engine object and view model | Yes | Persist | `measurement_plans` | Customer-selected metrics drive the evidence path and readout. | P0 |
| Baseline Window | `blueprint.windows`, ROI scenario, outcome export | Repeated field across objects | Yes | Persist | `measurement_plans` | Window alignment is a gate for evidence and value language. | P0 |
| Comparison Window | `blueprint.windows`, ROI scenario, outcome export | Repeated field across objects | Yes | Persist | `measurement_plans` | Window alignment must be stable before evidence snapshots are derived. | P0 |
| System-of-Record Outcome Evidence | `outcome_evidence`, outcome export template, API push fixtures | Existing aggregate table plus export object | Yes, already partly | Persist aggregate values; snapshot derived use | Existing `outcome_evidence`, `evidence_snapshots` | Aggregate KPI evidence is a core source for claim readiness. | P0 |
| Survey / User Voice Evidence | `fluency_baseline`, AI Fluency baseline fixture, stated-evidence docs | Aggregate baseline object; no raw survey persistence in scope | Yes, aggregate only | Persist snapshot | `evidence_snapshots` | Stated evidence can provide context, but must stay aggregate and retestable. | P1 |
| BigQuery Signal Availability Audit | dogfood BigQuery adapter docs/scripts, source readiness contracts | External warehouse probe and readiness outputs | Not raw BigQuery state | External source of truth; snapshot summary only | `evidence_snapshots` | Store availability/readiness summaries, not query text or raw rows. | P2 |

## 4. Concepts That Need Durable State

These are customer-specific product decisions or reviewed evidence states. They
should not remain only in static examples, frontend mocks, or transient engine
runs:

- selected value hypothesis;
- selected workflow/function/workflow family;
- selected customer metrics and metric owner roles;
- baseline and comparison windows;
- source-system readiness and approved aggregate grain;
- customer-owned assumption state and approval owner roles;
- outcome evidence review state;
- generated aggregate evidence snapshot;
- generated claim readiness snapshot;
- generated executive readout snapshot;
- intervention/retest plan inputs when the sponsor chooses a next cycle.

The current `ai_value_objects` table can hold many of these as JSON payloads, but
the next build needs stronger first-class semantics for lineage, immutability,
snapshot type, source refs, retention, and RLS review.

## 5. Concepts That Can Remain Static Framework

These can stay as docs, shared validators, bundled defaults, or display labels
unless a future requirement introduces customer customization:

- canonical language dictionary and aliases;
- value lifecycle and evidence ladder definitions;
- default metric dictionary definitions;
- default claim template registry;
- Value Chain stage ordering;
- VBD definitions;
- Productivity Recapture language;
- Glean Value Playbook mapping language;
- blocked claim classes and forbidden input categories;
- schema validators and examples used for assurance.

Static framework content should be versioned in code/docs. Customer-specific
selections made from those defaults belong in durable state.

## 6. Concepts That Should Be Derived From Evidence Snapshots

These should be recomputable from persisted selections plus governed aggregate
evidence, then stored as immutable snapshots when shown in an executive or
claim-governance artifact:

- VBD Operating Map posture;
- Evidence Layer Alignment;
- Claim Readiness;
- Financial Claim Gate;
- Financial Translation / EBITA Impact Bridge posture;
- Executive Readout sections;
- next evidence actions;
- renewal evidence packet content;
- intervention/retest recommendation language.

The product should store the snapshot result because the readout is a business
artifact. It should also store enough source references to explain how the
snapshot was derived without storing raw inputs.

## 7. Proposed Minimal Supabase State

Do not create these migrations in this phase. These are proposed table contracts
for the next build.

### 7.1 `value_hypotheses`

Purpose: durable customer-selected value hypothesis for a workflow/function.

Why needed: the product needs a stable object representing what the customer is
trying to test before evidence and readouts are derived.

Example fields:

- `id`
- `org_id`
- `hypothesis_id`
- `workflow_family`
- `function_area`
- `value_route`
- `hypothesis_statement`
- `business_objective`
- `sponsor_role`
- `status`
- `source_refs_json`
- `created_at`
- `updated_at`

Primary key: `id`

Foreign keys: future `org_id` to organizations if the current org model remains
the tenant root.

RLS considerations: org-scoped read/write; no direct `anon` access; reviewer and
enablement roles can write; executive viewers read approved/current hypotheses.

Data retention considerations: retain across measurement cycles while the
customer relationship is active; soft-archive instead of hard-delete when a
hypothesis feeds snapshots.

Privacy risk: low if fields stay role/workflow level.

What should NOT be stored: raw workshop transcripts, customer notes containing
names, raw prompts, raw responses, file contents, person-level observations, or
unapproved financial figures.

### 7.2 `measurement_plans`

Purpose: durable plan for how a value hypothesis will be tested.

Why needed: baseline/comparison windows, selected metrics, source systems, and
customer-owned assumptions must be fixed before evidence snapshots and claim
gates are derived.

Example fields:

- `id`
- `org_id`
- `value_hypothesis_id`
- `workflow_family`
- `metric_selections_json`
- `source_systems_json`
- `baseline_window_start`
- `baseline_window_end`
- `comparison_window_start`
- `comparison_window_end`
- `approved_grain`
- `assumptions_json`
- `review_state`
- `created_at`
- `updated_at`

Primary key: `id`

Foreign keys: `value_hypothesis_id` -> `value_hypotheses.id`

RLS considerations: org-scoped; write access limited to admin/enablement roles;
read access for exec viewers only after required governance state is present.

Data retention considerations: retain all plans that feed evidence snapshots.
Closed or superseded plans should remain linked for readout reproducibility.

Privacy risk: medium. Source systems and assumptions can become sensitive if
they include finance or workforce context.

What should NOT be stored: raw system exports, row-level system-of-record data,
query text, ticket text, names, emails, employee IDs, hashed or joinable
person identifiers, person-level HRIS records, manager/team comparative ordering, individual
productivity, HRIS inference or decisioning fields, or dollarized
customer-facing outputs unless a later contract explicitly approves that exact
scope. Aggregate HRIS-derived workforce context may be referenced only when it
is cohort-safe, customer-approved, and used for workflow-level value
measurement.

### 7.3 `evidence_snapshots`

Purpose: immutable aggregate evidence snapshot derived from governed inputs.

Why needed: claim readiness and readouts need a stable evidence basis across V3
verdicts, outcome evidence, AI Fluency baseline, VBD posture, suppression state,
and source-readiness summaries.

Example fields:

- `id`
- `org_id`
- `measurement_plan_id`
- `snapshot_type`
- `window_start`
- `window_end`
- `cohort_id`
- `workflow_id`
- `jbtd_id`
- `persona_id`
- `source_refs_json`
- `evidence_summary_json`
- `suppression_state_json`
- `privacy_boundary_json`
- `created_at`

Primary key: `id`

Foreign keys: `measurement_plan_id` -> `measurement_plans.id`

RLS considerations: org-scoped; append-only after creation; no direct public
table access; snapshots with suppressed outputs must not expose hidden values.

Data retention considerations: retain immutable snapshots that feed any
claim/readout artifact. Allow lifecycle archival by org policy.

Privacy risk: medium to high because snapshots may summarize sensitive aggregate
business evidence.

What should NOT be stored: raw BigQuery rows, raw prompts, raw responses,
transcripts, query text, file contents, action rows, direct identifiers,
hashed or joinable person identifiers, person-level HRIS records, sub-5
values, hidden suppressed values, or person-level telemetry. Aggregate
workforce context may be stored only as governed source context, outcome
evidence, or customer-owned assumptions with privacy flags preserved.

### 7.4 `claim_readiness_snapshots`

Purpose: immutable derived claim and financial-permission snapshot.

Why needed: Executive Readout, Claim Gate, Financial Translation, and Value
Realization all need the exact claim posture that was valid for a given evidence
snapshot.

Example fields:

- `id`
- `org_id`
- `evidence_snapshot_id`
- `claim_registry_version`
- `claim_readiness_json`
- `financial_claim_gate_json`
- `financial_translation_json`
- `safe_language_json`
- `blocked_claims_json`
- `required_caveats_json`
- `created_at`

Primary key: `id`

Foreign keys: `evidence_snapshot_id` -> `evidence_snapshots.id`

RLS considerations: org-scoped; append-only; customer-facing fields must be
absent or false unless approved by the underlying gate.

Data retention considerations: retain all snapshots that feed readouts,
renewal artifacts, or audit review.

Privacy risk: medium. Safe language can still overstate evidence if source refs
or caveats are lost.

What should NOT be stored: unreviewed customer-facing ROI language, unsupported
causality, individual productivity, manager/team comparative ordering, HRIS inference,
headcount reduction claims, compensation/performance inference,
promotion/discipline inference, people decisioning, or any text that
reconstructs suppressed evidence.

### 7.5 `executive_readout_snapshots`

Purpose: versioned sponsor-facing artifact state.

Why needed: the readout is a business artifact. It must not be regenerated from
changed object payloads without a record of what was shown, which caveats
traveled with it, and what next actions were recommended.

Example fields:

- `id`
- `org_id`
- `claim_readiness_snapshot_id`
- `readout_version`
- `audience`
- `readout_sections_json`
- `next_evidence_actions_json`
- `intervention_retest_json`
- `customer_facing_economic_output_allowed`
- `created_at`
- `created_by_role`

Primary key: `id`

Foreign keys: `claim_readiness_snapshot_id` -> `claim_readiness_snapshots.id`

RLS considerations: org-scoped; executive viewers can read approved/internal
readouts; only admin/enablement roles can create; customer-facing approval must
be explicit and derived from gates, not UI preference.

Data retention considerations: retain as audit artifacts; avoid overwriting.
Create a new snapshot for every materially different readout.

Privacy risk: high if readout text contains unsupported financial or people
claims.

What should NOT be stored: raw source documents, raw evidence files, raw
prompts/responses/transcripts, customer financial workpapers, direct
identifiers, hashed or joinable person identifiers, person-level HRIS records,
person-level data, manager/team comparative ordering, or unapproved
customer-facing economic outputs.

## 8. Privacy and Governance Constraints

The persistence model must preserve the repo invariants exactly:

- no new canonical events;
- no new suppression reasons;
- no tunable thresholds;
- no admin overrides of suppression decisions;
- no individual scoring or user-identifiable fields in inputs, storage, or
  outputs;
- default verdict remains SUPPRESS;
- SURFACE requires all gates clearing;
- latency remains corroborative only;
- suppression applies independently per slice;
- every implementation PR must keep assurance and governance checks green.

Additional AI Value constraints:

- Supabase should store derived aggregate/product state, not raw or near-raw
  telemetry.
- BigQuery and customer systems should remain the source of heavy evidence,
  raw/near-raw telemetry, and system-of-record exports.
- `ai_value_objects` should not become an unbounded dumping ground for every
  readout concept.
- Customer-facing economic output must remain blocked unless a later contract
  explicitly approves the exact scope.
- Financial language must remain customer-owned, caveated, and tied to evidence
  gates.
- HRIS-derived data is allowed only as aggregate, cohort-safe,
  customer-approved workforce context for workflow-level value measurement.
  Person-level HRIS records, direct identifiers, hashed or joinable person
  identifiers, individual productivity, people decisioning,
  compensation/performance inference, promotion/discipline inference,
  manager/team comparative ordering, and HRIS inference from AI usage are prohibited.

## 9. Open Questions

1. Should `ai_value_objects` remain as the flexible object ingestion layer while
   the five proposed tables become the durable product-state layer, or should
   future AI Value objects be migrated entirely into typed tables?
2. Should `evidence_snapshots` store normalized columns for VBD posture and
   suppression state, or keep those inside JSON with only source refs indexed?
3. Should outcome evidence review state stay in the `outcome_evidence_export`
   object, or be promoted into `measurement_plans` as a first-class review
   state?
4. Should intervention/retest become its own table after the first snapshot
   implementation, or remain embedded in `executive_readout_snapshots` until a
   customer-facing workflow requires task ownership?
5. What is the minimum source reference required to make a BigQuery-derived
   evidence snapshot auditable without storing query text?
6. What approval state is required before an executive readout snapshot can be
   marked customer-facing?
7. Which Glean Value Playbook concepts should become bundled static defaults,
   and which should be customer-overridable?

## 10. Recommended Implementation Order

1. Freeze the minimum durable path:
   `value_hypotheses` -> `measurement_plans` -> `evidence_snapshots` ->
   `claim_readiness_snapshots` -> `executive_readout_snapshots`.
2. Keep `ai_value_objects` as an adapter/compatibility layer for current engine
   objects during the transition.
3. Implement `value_hypotheses` and `measurement_plans` first, because they
   capture customer-specific selections and windows before any derived evidence
   is created.
4. Add `evidence_snapshots` next, derived only from existing governed inputs:
   `fluencytracr_verdicts`, `velocity_distribution_observations`,
   `outcome_evidence`, accepted `outcome_evidence_export` objects, and aggregate
   fluency baseline objects.
5. Add `claim_readiness_snapshots` as a deterministic derivation from
   `evidence_snapshots`, preserving safe language, caveats, financial gates, and
   blocked claims.
6. Add `executive_readout_snapshots` only after the evidence and claim snapshot
   contracts are stable.
7. Defer separate intervention/task tables until the product needs owner
   assignment, due dates, notifications, or workflow automation.
8. Defer Glean-specific Value Evidence Pack persistence until the universal
   AI Value state model is stable; Glean adapter outputs can reference the core
   snapshots.

## BigQuery vs Supabase Responsibility Split

BigQuery should remain the heavy evidence warehouse for raw or near-raw
telemetry, large event data, date-sharded dogfood tables, and customer-approved
aggregate exports that require warehouse-scale processing.

Supabase should store:

- product state;
- customer selections;
- measurement plans;
- aggregate evidence snapshots;
- claim readiness snapshots;
- financial assumption states;
- executive readout snapshots; and
- next evidence actions shown in sponsor-facing artifacts.

Diagram:

```text
BigQuery signal
-> aggregate evidence derivation
-> Supabase evidence snapshot
-> claim readiness
-> executive readout
```

## Minimum Durable Data Path

To make FluencyTracr real without expanding product surface prematurely:

1. Customer selects value hypothesis.
2. Customer selects workflow and metrics.
3. Measurement plan defines baseline and comparison window.
4. Evidence snapshot is generated from available aggregate data.
5. Claim readiness snapshot is generated.
6. Executive readout snapshot is persisted.
7. Next evidence actions are persisted inside the readout snapshot or derived
   from the claim/evidence snapshots until workflow ownership requires its own
   table.

## Current Missing Pieces

- No dedicated durable `value_hypotheses` table.
- No dedicated durable `measurement_plans` table.
- No dedicated immutable `evidence_snapshots` table.
- No dedicated immutable `claim_readiness_snapshots` table.
- No dedicated `executive_readout_snapshots` table.
- No first-class VBD map snapshot schema.
- No first-class intervention/retest state beyond `value_improvement_loop`
  payloads and frontend view models.
- No durable BigQuery signal availability audit summary table.

The better move is to harden this persistence contract before building more
readout UI, claim surfaces, or financial translation screens.
