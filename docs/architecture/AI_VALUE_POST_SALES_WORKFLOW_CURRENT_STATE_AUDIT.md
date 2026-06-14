# AI Value Post-Sales Workflow Current State Audit

Status: Phase 0 current-state audit

Phase: `phase-ai-value-post-sales-workflow-current-state-audit`

Program: `program-ai-value-post-sales-client-evidence-workflow`

This document does not create migrations, Prisma schema changes, backend
routes, frontend UI, ingestion jobs, new persistence, claim readiness snapshot
persistence, executive readout snapshot persistence, rendered readouts, ROI,
EBITA, causality, productivity, headcount, ranking, people decisioning, or
customer-facing financial output.

## 1. Purpose

This audit evaluates the current repo against the intended post-sales customer
workflow:

`post_sales_kickoff -> ai_fluency_intake -> initial_signal_capture -> measurement_plan_draft -> evidence_gap_review -> client_evidence_request -> client_evidence_entry -> evidence_snapshot_review -> claim_readiness_review -> executive_readout_preparation -> intervention_retest`

The desired product posture is useful before full Layer 2 and Layer 3 evidence
exists, but early outputs must remain directional, caveated, aggregate-only, and
evidence-limited. Missing evidence must be represented as required, missing,
held, requested, awaiting customer, provided, validated, rejected, or
suppressed. Missing evidence must not be treated as support.

## 2. Current Decision

Current decision: `contracts_required_before_customer_workflow`.

The repo has strong evidence-chain foundations:

- aggregate AI Fluency baseline validation;
- Measurement Plan contract;
- Source Package contract;
- Evidence Collection Assembler;
- Evidence Snapshot contract;
- Claim Readiness Handoff;
- non-persisted Claim Readiness Snapshot;
- design-only Executive Readout Snapshot;
- minimal persistence for value hypotheses, measurement plans, source package
  refs, and evidence snapshots;
- internal runtime builder service.

The repo does not yet have first-class post-sales workflow contracts for:

- the customer journey state machine;
- client evidence requests;
- safe client evidence entry;
- AI Fluency to Measurement Plan bridge;
- internal post-sales workflow orchestration;
- customer exposure policy;
- customer workflow API/UI readiness decision.

Recommended next move: implement the contract sequence in this program before
any customer-facing dashboard, external route, raw ingestion job, claim
readiness persistence, or executive readout persistence is added.

Important distinction: current AI Fluency support starts at the validated
aggregate `fluency_baseline` object. Participant-level survey/intake collection
appears upstream or external to this AI Value object spine and should not be
pulled into this program as raw response intake.

## 3. Inspected Sources

Primary sources inspected:

- `shared/src/aiValueEngine/fluencyBaseline.ts`
- `docs/contracts/ai-value-measurement-plan/README.md`
- `shared/src/aiValueEngine/measurementPlan.ts`
- `docs/contracts/ai-value-source-packages/README.md`
- `shared/src/aiValueEngine/sourcePackages.ts`
- `docs/contracts/ai-value-evidence-collection-assembler/README.md`
- `shared/src/aiValueEngine/evidenceCollectionAssembler.ts`
- `docs/contracts/ai-value-evidence-snapshot/README.md`
- `shared/src/aiValueEngine/evidenceSnapshot.ts`
- `docs/contracts/ai-value-claim-readiness-handoff/README.md`
- `shared/src/aiValueEngine/claimReadinessHandoff.ts`
- `docs/contracts/ai-value-claim-readiness-snapshot/README.md`
- `shared/src/aiValueEngine/claimReadinessSnapshot.ts`
- `docs/contracts/ai-value-executive-readout-snapshot/README.md`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260613180000_add_ai_value_minimal_persistence/migration.sql`
- `backend/src/repositories/ai-value-minimal-persistence.repository.ts`
- `backend/src/services/ai-value-runtime-builders.service.ts`
- `backend/src/ai_value_routes.ts`
- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/pages/AIValueJourney.test.tsx`
- `frontend/src/pages/AIValueWorkspace.tsx`
- `frontend/src/pages/AIValueWorkspace.test.tsx`
- `docs/contracts/ai-value-intelligence/customer-support-pilot-design.md`
- `docs/contracts/ai-value-intelligence/customer-support-validation-workshop-kit.md`

## 4. Workflow Support Matrix

| Workflow step | Current support | Gap before customer workflow |
| --- | --- | --- |
| `post_sales_kickoff` | Existing AI Value Journey and workshop docs frame pilot/workshop kickoff. | No first-class customer journey contract or stage state. |
| `ai_fluency_intake` | `fluencyBaseline.ts` validates aggregate-only AI Fluency baseline/follow-up input and blocks individual scoring, team/manager ranking, and customer-facing economic output. | No bridge that maps AI Fluency posture into a draft Measurement Plan and evidence gap review. |
| `initial_signal_capture` | Measurement Plan, Source Package, and Evidence Snapshot contracts can describe Layer 1/VBD and missing evidence posture. | No explicit initial-signal capture object for post-sales flow. |
| `measurement_plan_draft` | Measurement Plan contract supports draft readiness, windows, VBD, Layer 2/3 requirements, workforce context requirements, and assumptions. Minimal persistence can store validated Measurement Plans. | No builder from AI Fluency intake to draft Measurement Plan. |
| `evidence_gap_review` | Evidence Snapshot and Evidence Collection Assembler carry missing, held, suppressed, and not-computed lanes as caveats. | No standalone evidence gap review contract or customer-facing request mapping. |
| `client_evidence_request` | Older Journey UI has a customer evidence request packet pattern; Source Package requirements define what evidence is needed. | No typed Client Evidence Request contract, validator, examples, or builder from Measurement Plan/Snapshot gaps. |
| `client_evidence_entry` | Source Packages can represent validated aggregate evidence after it exists. Older outcome evidence export objects support submitted/accepted/rejected states. | No safe client evidence entry contract for manual aggregate entry, attestation, upload metadata, rejection, or conversion to Source Packages. |
| `evidence_snapshot_review` | Evidence Snapshot contract and persistence exist. Runtime builder persists safe snapshots after validating source-bound packages. | No post-sales orchestrator that reviews initial and updated snapshots from client evidence entries. |
| `claim_readiness_review` | Claim Readiness Handoff and non-persisted Claim Readiness Snapshot exist and preserve caveats, blocked uses, suppression, privacy, VBD, and workforce boundaries. | No post-sales workflow stage tying review state to customer evidence progress. |
| `executive_readout_preparation` | Executive Readout Snapshot is design-only and source-bound. Existing legacy readout/prototype patterns block ROI and customer-facing economics. | No customer exposure policy or readiness decision for what may be shown externally. |
| `intervention_retest` | Value Improvement Loop and Journey/Workspace tests include decision/retest patterns. AI Fluency baseline supports `followup` collection mode. | No post-sales stage contract tying interventions/retest to evidence-limited posture without causality claims. |

## 5. Existing Support Details

### AI Fluency Intake

Existing support is strong for aggregate-only AI Fluency baseline validation.
`shared/src/aiValueEngine/fluencyBaseline.ts`:

- accepts `kickoff` and `followup` collection modes;
- rejects respondent identifiers, user/email/employee/person-level fields, raw
  answers, response text, manager fields, and HRIS fields;
- enforces minimum cohort size of 5;
- requires small cohorts to be suppressed and scoreless;
- marks AI Fluency as optional value-chain context;
- hard-blocks individual scoring, team/manager ranking, and customer-facing
  economic output.

Gap: the baseline is not yet connected to a typed post-sales Journey contract
or a builder that produces a draft Measurement Plan and evidence gap review.
The repo does not contain a customer-facing participant intake submission route
for the survey itself; the safe product boundary begins after aggregation.

### Initial Signal Capture

Existing support is partial. Measurement Plan, Source Package, Evidence
Collection Assembler, and Evidence Snapshot contracts can represent Layer 1,
VBD, source availability, missing evidence, suppression, k-min, caveats, and
blocked uses.

Gap: there is no explicit initial-signal capture contract for the post-sales
workflow. The next program phases should decide whether this remains a stage in
Customer Journey or becomes a separate object.

### Measurement Plan Draft

Existing support is strong. The Measurement Plan contract:

- binds a value hypothesis, workflow scope, metric selection, windows,
  Playbook evidence requirements, source package requirements, aggregate
  workforce context requirements, VBD design, assumptions, privacy, readiness,
  allowed uses, and blocked uses;
- makes Layer 2, Layer 3, governance, and assumption requirements explicit;
- treats VBD as Layer 1 posture only;
- blocks ROI, EBITA, causality, productivity, headcount reduction, individual
  attribution, manager/team comparative ordering, people decisioning, and
  customer-facing financial claims.

Minimal persistence can now store validated Measurement Plans, but there is no
AI Fluency intake bridge that creates the draft plan from post-sales intake.

### Evidence Gap Review

Existing support is partial. Evidence Snapshot and Evidence Collection
Assembler contracts already require missing, held, suppressed, and not-computed
lanes to remain explicit as caveats. Evidence Snapshot `coverage_status`
distinguishes Layer 1-only posture from full Playbook coverage.

Gap: evidence gaps are embedded in snapshots and assembly output. There is no
standalone evidence gap review object that can drive customer evidence requests.

### Client Evidence Requests

Existing support is mostly pattern-level. The older AI Value Journey UI and
tests include a customer evidence request packet, and pilot docs contain
aggregate data request guidance. Source Package requirements show what evidence
must be collected.

Gap: there is no typed Client Evidence Request contract. The product cannot yet
derive customer action requests from Measurement Plan or Evidence Snapshot gaps
in a reusable, validator-backed way. Current request UI is a derived Journey
view rather than a governed request artifact with its own status, caveats,
forbidden fields, due state, and owner/approver roles.

### Client Evidence Entry

Existing support is incomplete. Source Packages define the safe shape of
validated aggregate evidence inputs, and outcome evidence export objects model
submitted/accepted/rejected review posture in the older object spine.

Gap: there is no safe client entry contract for:

- aggregate export upload metadata;
- manual aggregate metric entry;
- manual user voice aggregate entry;
- manual governance attestation;
- manual assumption approval;
- manual aggregate workforce context entry;
- validation/rejection/suppression state;
- conversion from validated entry to Source Package.

Existing `outcome_evidence_export` review is useful precedent, but it is not a
general manual evidence entry workflow and does not yet bridge accepted client
evidence entries into governed Source Packages or persisted `source_package_refs`
for the newer runtime path.

Manual entry must not store raw files, raw rows, prompts, responses,
transcripts, query text, file contents, direct identifiers, hashed or joinable
person identifiers, person-level HRIS, person-level productivity,
the blocked use `manager_or_team_ranking`, or people decisioning fields.

### Manual Customer Attestation

Existing support is partial. Source Package types include governance controls,
assumption approvals, aggregate workforce context, and Layer 3 metric owner
review/caveat posture. Customer support pilot docs define source-owner and
assumption-ledger workshop patterns.

Gap: attestation is not yet a reusable client evidence entry mode with
validation and Source Package conversion.

### Aggregate Export Packages

Existing support is strong for validated package shape and weaker for customer
workflow entry. Source Packages support:

- Layer 1 BigQuery telemetry summaries;
- Layer 2 aggregate user voice / AI Fluency / survey / empirical exports;
- Layer 3 customer-attested system-of-record outcome exports;
- aggregate workforce context;
- governance controls;
- assumption approvals.

Gap: the repo lacks a client evidence request/entry bridge that lets a customer
submit aggregate export metadata or manual aggregate values and then produces a
validated Source Package.

### Evidence Snapshot Review

Existing support is strong internally. The Evidence Collection Assembler can
produce a draft Evidence Snapshot input from a Measurement Plan plus Source
Packages. The runtime builder can validate source binding against persisted
metadata refs, persist only safe Evidence Snapshots, and return a non-persisted
Claim Readiness Handoff.

Gap: there is no internal post-sales orchestrator that composes initial
AI-Fluency-only posture, evidence requests, validated client evidence entries,
updated snapshots, and handoffs.

### Claim Readiness Review

Existing support is strong but internal-only. Claim Readiness Handoff and Claim
Readiness Snapshot contracts preserve upstream caveats, blocked claims,
suppression, privacy, VBD, aggregate workforce context, source refs, and
provenance. Claim Readiness Snapshot is explicitly non-persisted.

Gap: the post-sales workflow does not yet have a review stage that links claim
readiness state to the customer evidence journey.

### Executive Readout Preparation

Existing support is design-only. Executive Readout Snapshot is source-bound and
deferred. It blocks ROI, EBITA, causality, productivity, headcount reduction,
individual attribution, the blocked use `manager_or_team_ranking`, people
decisioning, customer-facing financial output, and customer-facing economic
output.

Gap: no Customer Exposure Policy exists for the post-sales workflow, and no
API/UI readiness decision exists for customer users.

### Intervention and Retest

Existing support is pattern-level. AI Fluency Baseline supports follow-up
collection mode, Value Improvement Loop includes intervention/retest language,
and existing frontend tests include Decision & Retest readout behavior.

Gap: no post-sales journey stage ensures retest remains evidence-limited and
does not imply causality without causal design.

## 6. Existing Frontend and Backend Route Patterns

The repo has useful route and UI patterns, but they are not authorization to
build the customer workflow surface yet.

Backend:

- `backend/src/ai_value_routes.ts` registers existing AI Value object routes for
  older object types such as `fluency_baseline`, `outcome_evidence_export`,
  `value_improvement_loop`, and `value_evidence_case`.
- Existing object writes are fail-closed through shared validators.
- Existing object detail reads can return full payloads to `ADMIN`,
  `EXEC_VIEWER`, and `ENABLEMENT_LEAD`, so these generic routes should not be
  reused for new customer evidence workflow contracts without projection,
  exposure policy, and route-specific auth tests.
- The Phase 5 runtime builder is internal-only and should remain so until route
  contracts are approved.

The older generic object API and the newer typed Measurement Plan -> Source
Package -> Evidence Snapshot chain should not be treated as equivalent. The
post-sales workflow needs contract-backed handoffs between them before any
customer-visible surface is promoted.

Frontend:

- `AIValueJourney` and `AIValueWorkspace` already contain client-facing patterns
  for evidence request, evidence review, decision, readout, and retest language.
- Tests assert that customer evidence request packets and review states block
  realized ROI and customer-facing economic figures.
- These surfaces are useful UX references, but this program must not implement
  customer-facing dashboard work until contracts and exposure policy are safe.

## 7. Customer-Facing Workflow Gaps

The key gaps are not raw evidence or telemetry. The key gaps are workflow state,
request state, entry validation, and exposure policy.

Missing artifacts:

1. Customer Journey contract.
2. Client Evidence Request contract.
3. Client Evidence Entry contract.
4. AI Fluency Intake Bridge contract.
5. Internal Post-Sales Workflow Orchestrator contract/helper.
6. Customer Exposure Policy.
7. Customer Workflow API/UI Readiness Decision.

Missing safety gates:

- first-class journey stage state;
- governed Client Evidence Request status;
- request-level forbidden fields;
- entry-level aggregate-only validation;
- manual-entry rejection reasons;
- validated-entry to Source Package conversion;
- customer-visible versus internal-only field projection;
- explicit distinction between AI Fluency posture and value proof;
- explicit distinction between requested evidence and provided evidence;
- explicit distinction between submitted, validated, rejected, held, and
  suppressed client entries;
- retest language that blocks causality without causal design.

## 8. Recommended Implementation Sequence

Proceed in the program order:

1. **Customer Journey Contract**: define the stage model and customer-visible
   boundaries for the post-sales workflow.
2. **Client Evidence Request Contract**: translate Measurement Plan and Evidence
   Snapshot gaps into actionable aggregate evidence requests, not claims.
3. **Client Evidence Entry Contract**: validate aggregate-only manual/attested
   entry and convert only validated entries into Source Packages.
4. **AI Fluency Intake Bridge**: map aggregate AI Fluency posture to VBD,
   Measurement Plan draft, evidence gap review, and Client Evidence Requests.
5. **Internal Post-Sales Workflow Orchestrator**: compose the chain internally
   without routes, UI, ingestion, claim readiness persistence, or executive
   readout persistence.
6. **Customer Exposure Policy**: decide what can be shown externally and what
   remains internal-only.
7. **Customer Workflow API/UI Readiness Decision**: decide whether routes/UI are
   safe to build next.

Do not skip directly to routes or UI. The existing frontend patterns are useful,
but the new customer workflow needs typed validators first.

## 9. Stop Conditions For Later Phases

Stop and report if a later phase would require:

- treating AI Fluency baseline as value proof;
- collecting raw rows, raw files, prompts, responses, transcripts, query text,
  file contents, direct identifiers, hashed or joinable identifiers,
  person-level HRIS, or person-level productivity;
- manual evidence entry that can smuggle unsupported financial, productivity,
  causality, headcount, ranking, or people-decisioning claims;
- converting requested or missing evidence into support;
- hiding missing, held, rejected, suppressed, or not-computed evidence;
- weakening Source Package, Evidence Snapshot, suppression, privacy, VBD, or
  workforce context controls;
- exposing customer-facing routes or UI before Customer Exposure Policy and
  API/UI readiness decision exist.

## 10. Phase 0 Acceptance Check

This Phase 0 audit creates only this document.

It does not add:

- backend routes;
- frontend UI;
- ingestion jobs;
- migrations or Prisma schema changes;
- new persistence;
- claim readiness snapshot persistence;
- executive readout snapshot persistence;
- ROI, EBITA, causality, productivity, headcount, ranking, people decisioning,
  or customer-facing financial output.
