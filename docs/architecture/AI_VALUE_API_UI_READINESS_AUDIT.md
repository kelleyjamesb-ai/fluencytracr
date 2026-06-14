# AI Value API and UI Readiness Audit

Status: audit only

Phase: `phase-ai-value-api-ui-readiness-audit`

This document does not create migrations, Prisma schema changes, backend
routes, frontend UI, ingestion jobs, new persistence, claim readiness snapshot
persistence, executive readout snapshot persistence, rendered readouts, or
customer-facing economic output.

## 1. Purpose

This audit determines what API and UI work would be required before the AI
Value chain can be presented safely.

The governed chain remains:

`Value Hypothesis -> Measurement Plan -> Evidence Collection / Source Packages -> Evidence Snapshot -> Claim Readiness Handoff -> Claim Readiness Snapshot -> Executive Readout Snapshot -> UI / API Presentation`

No API response or UI surface may make a stronger claim than the upstream
Evidence Snapshot, Claim Readiness Handoff, Claim Readiness Snapshot, and
Executive Readout Snapshot contracts permit.

## 2. Readiness Decision

Current decision: `not_ready_for_api_or_ui_implementation`.

The repo is ready for route contract design and display-contract design. It is
not ready to expose the Phase 5 runtime builder through public or
customer-facing routes, and it is not ready to build UI on top of the new typed
AI Value chain.

Why:

- the internal runtime builder is intentionally service-only;
- existing AI Value routes use a generic object API that can return full
  payloads;
- typed read/list projections for minimal persistence are not yet designed;
- route-level auth, RLS posture, response projection, and cross-org denial
  tests do not yet exist for the new typed chain;
- Claim Readiness Snapshot persistence is not implemented;
- Executive Readout Snapshot is design-only and not persisted;
- frontend display controls do not yet prove they can carry every
  `missing`, `held`, `suppressed`, and `not_computed` lane without flattening
  them into generic partial coverage.

Safe next step: design route contracts and UI display contracts before writing
runtime code, routes, or React surfaces.

## 3. Current Backend and API Inventory

| Surface | Current state | Readiness implication |
| --- | --- | --- |
| `backend/src/services/ai-value-runtime-builders.service.ts` | Internal service loads a persisted Measurement Plan, requires full Source Package runtime inputs bound to persisted refs, validates assembly, persists only an Evidence Snapshot, and returns a non-persisted Claim Readiness Handoff. | Safe as internal infrastructure. Do not expose directly through existing generic routes. |
| `backend/src/repositories/ai-value-minimal-persistence.repository.ts` | Typed minimal persistence helper for `value_hypotheses`, `measurement_plans`, `source_package_refs`, and `evidence_snapshots`. Source package refs are metadata-only. | Good persistence foundation, but typed projected read APIs still need design. |
| `backend/src/ai_value_routes.ts` | Existing AI Value workshop/object routes for generic `ai_value_objects`, value-chain runs, evidence-case assembly, outcome review, real-evidence materialization, and legacy HTML readout. | Useful auth and fail-closed patterns. Not suitable as the new source-bound snapshot route surface because detail reads return full payloads. |
| `backend/src/app.ts` readiness checks | Health/readiness checks include required AI Value tables. | Useful deployment gate, but not enough for typed route readiness, RLS policy validation, or projection safety. |
| `backend/tests/ai_value_runtime_builders.test.ts` | Confirms the runtime builder stays out of `app.ts`. | Existing test protects the internal-only boundary. Future API work must update this intentionally only after route contracts are approved. |

## 4. Current Frontend Inventory

| Surface | Current state | Readiness implication |
| --- | --- | --- |
| `frontend/src/lib/aiValueApi.ts` | Calls existing generic AI Value object, value-chain, evidence materializer, and HTML readout routes. | Future typed chain should not reuse generic detail responses that expose full payloads to broad read roles. |
| `frontend/src/pages/AIValueWorkspace.tsx` and workspace tests | Existing workspace has useful evidence-state and safe-language patterns. | Good reference for customer-safe language, but not proof that new snapshot coverage states are fully rendered. |
| `frontend/src/components/ValueEvidenceCasePanel.tsx` | Separates privacy boundaries from evidence-gated value claims. | Good pattern: permanent privacy blocks and gated claims should remain visually distinct. |
| `frontend/src/pages/AIValueReadoutPrototype.tsx` and readout tests | Existing prototype blocks realized ROI and customer-facing economic figures. | Useful guardrail pattern, but it is not a source-bound Executive Readout Snapshot implementation. |
| `frontend/src/pages/AIValueDiscovery.tsx` | Compresses coverage into `PRESENT`, `CAVEATED`, and `MISSING`. | Not sufficient for the new Playbook contract because held, suppressed, and not-computed lanes must remain explicit. |

## 5. Internal Service Surface

The only currently safe service surface is internal:

- input: persisted Measurement Plan id/version, persisted source package refs,
  full validated Source Package runtime inputs, generation metadata, and
  creator role;
- processing: validate Measurement Plan, bind Source Packages to persisted
  metadata refs, build Evidence Collection Assembly, validate Evidence
  Snapshot, enforce k-min and suppression, persist Evidence Snapshot only,
  build Claim Readiness Handoff;
- output: persisted Evidence Snapshot plus non-persisted Claim Readiness
  Handoff;
- blocked output: persisted handoff, persisted Claim Readiness Snapshot,
  persisted Executive Readout Snapshot, rendered readout, ROI, EBITA,
  causality, productivity, headcount reduction, people decisioning, ranking, or
  customer-facing financial output.

The builder must remain internal until a route contract defines request shape,
auth, response projection, error handling, and source-binding tests.

## 6. Eventual Backend Routes

These are candidate route shapes only. They are not implemented by this phase.

| Candidate route | Audience | Required posture before implementation |
| --- | --- | --- |
| `POST /api/v1/ai-value/internal/evidence-snapshots/build` | Admin/service-only | Must call the internal builder, persist only the validated Evidence Snapshot, return a projected handoff summary, and reject `EXEC_VIEWER`. |
| `GET /api/v1/ai-value/measurement-plans/:id` | Internal reviewer, projected executive read if later approved | Must be org-scoped, version-aware, and projected. Do not return raw `payload_json` to broad readers. |
| `GET /api/v1/ai-value/evidence-snapshots/:id` | Internal reviewer, projected executive read if later approved | Must preserve coverage, caveats, blocked uses, suppression, privacy, source/window provenance, and evidence gaps. |
| `GET /api/v1/ai-value/source-package-refs` | Internal lineage viewer | Metadata-only. Never return full Source Package payloads or raw source exports. |
| `POST /api/v1/ai-value/internal/claim-readiness-snapshots/build` | Deferred | Blocked until Claim Readiness Snapshot persistence is explicitly approved and source binding is route-tested. |
| `POST /api/v1/ai-value/internal/executive-readout-snapshots/build` | Deferred | Blocked until Executive Readout Snapshot moves beyond design-only status and source-bound claim snapshot posture exists. |

Routes should return explicit hold states, not silent omission, whenever
evidence is missing, held, suppressed, not computed, or internal-only.

## 7. Required Auth and RLS Checks

Future API work must include all of the following before implementation is
accepted:

- require real JWT or service identity outside test/dev environments;
- enforce `org_id` equality between authenticated org, route scope, persisted
  object, and supplied source package payload;
- reject cross-org reads and writes for every typed table and route;
- restrict build/write routes to `ADMIN` or approved service identity;
- restrict review routes to `ADMIN` and `ENABLEMENT_LEAD` unless a later
  policy explicitly adds another role;
- allow `EXEC_VIEWER` only projected read responses that are safe for the
  intended audience;
- keep direct database access fail-closed through RLS and revoked public table
  access;
- decide whether future tenant isolation remains backend-service-enforced or
  becomes true request-scoped database policy enforcement;
- add route tests for cross-org denial, role denial, unsafe source package
  rejection, source-ref drift rejection, and projection safety;
- fail closed if typed persistence tables, Prisma schema, or route readiness
  checks are not current.

## 8. Frontend Display Constraints

Future UI must render from validated, source-bound contract fields. It must not
infer claim readiness from copy, object names, BigQuery availability, source
package presence, workforce context, VBD posture, or generic evidence labels.

Required display fields:

- `coverage_status`;
- Playbook coverage by layer and lane;
- required caveats;
- blocked uses and blocked claims;
- missing, held, suppressed, and not-computed evidence lanes;
- suppression posture;
- privacy posture;
- k-min posture;
- source refs and covered window provenance, in safe summary form;
- audience permission: internal-only, reviewer-only, or customer-facing safe;
- next evidence action.

Display rules:

- Layer 1-only snapshots must visibly block financial and customer-facing
  claims.
- BigQuery source availability must not be presented as full Playbook coverage.
- VBD must be shown as Layer 1 operating-map context only.
- Aggregate workforce context must be shown only as aggregate, cohort-safe,
  approved, non-decisioning context and cannot upgrade claim readiness.
- Missing Layer 2, Layer 3, governance, or assumption evidence must remain
  explicit as caveats.
- Suppressed or privacy-unsafe evidence must display only hold or repair
  language.
- The UI must distinguish permanent privacy boundaries from evidence-gated
  claims that could become available after customer validation.

## 9. Caveat Rendering Requirements

Every downstream screen or API projection must carry caveats forward from:

- Measurement Plan;
- Source Packages and source package refs;
- Evidence Collection Assembly;
- Evidence Snapshot;
- Claim Readiness Handoff;
- Claim Readiness Snapshot, if later implemented;
- Executive Readout Snapshot, if later implemented.

UI cannot hide caveats in secondary drawers if the main claim language depends
on them. If a screen has a claim headline, the caveat that limits that claim
must be visible in the same reading context.

Required caveat categories:

- missing or partial Layer 1 telemetry;
- missing or partial Layer 2 user voice;
- missing or partial Layer 3 system-of-record outcome evidence;
- missing governance evidence;
- missing, unapproved, or not-required assumption evidence;
- k-min, suppression, or coverage limitations;
- VBD Layer 1 boundary;
- aggregate workforce context boundary;
- customer-facing and financial-output boundary.

## 10. Blocked Claim Rendering Requirements

Blocked claims must be shown as explicit negative permissions, not merely
omitted.

Future projections and UI must visibly block:

- realized ROI;
- EBITA;
- causality;
- productivity claims;
- headcount reduction claims;
- individual attribution;
- `manager_or_team_ranking`;
- people decisioning;
- compensation, performance, promotion, discipline, attrition, or HRIS
  inference;
- customer-facing financial output;
- customer-facing economic output unless a later source-bound readout contract
  explicitly permits a narrower safe mode.

If a claim is blocked by privacy, it should be described as permanently outside
the product boundary. If a claim is blocked by missing evidence, it should be
described as held pending approved aggregate evidence and governance review.

## 11. Suppression Display Requirements

Suppression cannot be collapsed into generic partial coverage.

Future UI and API projections must show:

- default verdict remains `SUPPRESS`;
- suppression applies independently per approved aggregate slice;
- suppressed lanes;
- suppression reasons already recognized by the governed contract;
- k-min status;
- whether hidden values remain unexposed;
- whether a snapshot is blocked from downstream claim or readout use because of
  suppression.

If suppression is active, do not show reconstructed values, suppressed counts,
low-count cohorts, hidden rows, or wording that lets a reader infer the
suppressed value.

## 12. Customer-Facing vs Internal-Only Boundary

| Audience | Can show | Cannot show |
| --- | --- | --- |
| Internal builder/service | Validation gaps, source-binding errors, persisted ids, safe source refs, projected evidence posture. | Raw rows, raw content, raw source exports, person identifiers, persisted handoffs/readouts, customer-facing economics. |
| Internal reviewer | Coverage posture, caveats, blocked claims, source/window provenance, missing evidence actions, aggregate-only context. | Raw source payloads, suppressed values, individual/team/manager comparisons, unsupported financial or customer-facing claims. |
| Executive viewer | Projected summaries only after route/display contracts exist; must include caveats and blocked claims. | Full generic payloads, source package payloads, raw refs that reveal sensitive systems, hidden evidence, economic output not permitted upstream. |
| Customer-facing readout | Deferred. Only a future source-bound Executive Readout Snapshot may authorize this. | Anything currently produced by telemetry-only, VBD-only, BigQuery-only, workforce-context-only, or internal-only evidence posture. |

## 13. What Not To Show

Future API and UI surfaces must not show:

- raw BigQuery rows;
- full Source Package payloads;
- raw source exports;
- prompts, responses, transcripts, query text, SQL text, ticket text, file
  contents, or raw action rows;
- direct, hashed, joinable, pseudonymous, tokenized, or otherwise linkable
  person identifiers;
- names, emails, employee ids, manager ids, or person-level HRIS fields;
- person-level productivity, performance, compensation, promotion,
  discipline, attrition, or HRIS inference;
- low-count cohorts, suppressed values, or hidden values;
- manager, team, department, or employee rankings;
- customer-facing ROI, EBITA, productivity, causality, headcount reduction, or
  financial output;
- generic `payload_json` or `ai_value_objects.payload` to broad read roles;
- persisted Claim Readiness Handoffs, persisted Claim Readiness Snapshots, or
  persisted Executive Readout Snapshots until explicitly authorized.

## 14. What Can Be Shown Safely

After route/display contracts are designed and tested, the safe display set is:

- aggregate contract ids and versions;
- validated Measurement Plan summaries;
- metadata-only source package refs;
- covered window summaries;
- coverage status and Playbook layer posture;
- evidence lane states: present, partial, missing, held, suppressed, or
  not-computed;
- required caveats;
- blocked uses and blocked claims;
- suppression and k-min status without hidden values;
- privacy boundary summaries;
- VBD as Layer 1 context only;
- aggregate workforce context as approved, cohort-safe, non-decisioning context
  only;
- next evidence actions for customer-owned Layer 2, Layer 3, governance, or
  assumption evidence.

## 15. Implementation Stop Conditions

Do not start API or UI implementation if any of these remain true:

- route contracts and response projections are not written;
- route auth/RLS decision is unresolved;
- cross-org denial tests are missing;
- route tests do not prove source package payloads and generic payload JSON are
  not exposed to broad readers;
- full Playbook coverage can be reached from BigQuery, VBD, or aggregate
  workforce context alone;
- missing, held, suppressed, or not-computed lanes are hidden or collapsed;
- unsafe privacy flags can render as customer-safe;
- Claim Readiness Snapshot persistence is still unapproved;
- Executive Readout Snapshot remains design-only;
- frontend components cannot display caveats, blocked claims, suppression, and
  audience boundaries in the same reading context as the claims they limit.

## 16. Acceptance Checklist For A Future API/UI Phase

Before a later implementation phase begins, require:

- approved typed route contract;
- approved response projection contract;
- explicit audience matrix;
- route-level auth and org-scope tests;
- RLS or backend-service isolation decision;
- source-binding drift tests;
- no-public-builder test intentionally updated only after approval;
- frontend display contract for all coverage lane states;
- caveat and blocked-claim rendering tests;
- suppression rendering tests;
- customer-facing/readout boundary tests;
- docs update proving no migrations, routes, UI, ingestion, persistence, claim
  snapshots, or readout snapshots were added before their approved phase.

