# AI Value Customer Workflow API/UI Readiness Decision

Status: decision only

Phase: `phase-ai-value-customer-workflow-api-ui-readiness-decision`

Decision: `design_only_continue`

This document does not create backend routes, frontend UI, migrations, Prisma
schema changes, ingestion jobs, exports, persisted Claim Readiness Snapshots,
persisted Executive Readout Snapshots, rendered readouts, customer-facing
financial output, ROI, EBITA, causality, productivity, headcount, individual
attribution, `manager_or_team_ranking`, or people decisioning.

## 1. Purpose

The post-sales workflow contracts now define the internal path from AI Fluency
intake through Client Evidence Requests, Client Evidence Entry, Source
Packages, Evidence Snapshot review, Claim Readiness Handoff, and Customer
Exposure Policy.

This decision determines whether customer workflow routes or UI should be built
next.

## 2. Decision

Do not build customer workflow routes or UI yet.

Continue with design-only route contracts, response-projection contracts, and
display contracts before implementation.

Rationale:

- the Customer Exposure Policy defines what can be shown, but not route
  authorization, response projection, or tenant isolation;
- existing generic AI Value object routes can return full payloads and are not
  safe as customer workflow routes;
- the post-sales orchestrator remains internal-only and transient;
- Claim Readiness Snapshot remains non-persisted;
- Executive Readout Snapshot remains design-only;
- export governance is not implemented;
- legal/trust review for customer-facing value language is not complete;
- customer-facing financial output remains blocked.

## 3. Required Evaluation

| Question | Decision | Notes |
| --- | --- | --- |
| Can customer users safely see AI Fluency posture? | Yes, with caveats | The Customer Exposure Policy allows aggregate posture only. It must be labeled posture, not value proof. |
| Can customer users safely see evidence gaps? | Yes, with caveats | Missing, held, suppressed, rejected, and not-computed evidence should be visible as gaps, not support. |
| Can customer users safely see Client Evidence Requests? | Yes, with caveats | Requests can be actionable evidence asks. They cannot upgrade claim readiness or create claims. |
| Can customer users safely enter manual aggregate evidence? | Not yet | The Client Evidence Entry contract is aggregate-safe, but customer routes, auth, validation projection, and UX are not designed yet. |
| Can customer users safely see evidence entry status? | Yes, with caveats | Status-only visibility is safe. Raw submitted evidence, files, rows, prompts, responses, transcripts, query text, and person-level records remain blocked. |
| Can customer users safely see Playbook coverage? | Yes, with projection design | Coverage status, gaps, caveats, blocked uses, suppression, privacy, and k-min posture may be shown only through a future projection contract. |
| Can customer users safely see VBD as Layer 1 posture? | Yes, with caveats | VBD can appear as Layer 1 operating posture only. It cannot become value proof or full Playbook coverage. |
| Can customer users safely see claim readiness preview? | Limited | Boundary preview is safe. Claim output, Claim Readiness Snapshot persistence, and customer-facing financial output remain blocked. |
| Can customer users safely see executive readout preparation status? | Limited | Preparation status is safe. Rendered readout output remains blocked until a customer-facing readout contract exists. |
| What must remain internal-only? | Internal-only | Orchestrator, runtime builder, full payloads, Source Package payloads, Claim Readiness Handoff, Claim Readiness Snapshot, Executive Readout Snapshot, suppressed values, raw/person-level data, and financial/economic output. |
| What requires auth/RLS/tenant validation? | Required before implementation | Every route must prove org equality across auth, route scope, persisted object, source refs, submitted evidence, and response projection. |
| What requires export governance? | Required before export | Any downloadable packet, deck, PDF, HTML readout, API export, or share package requires separate export governance. |
| What requires legal/trust review? | Required before customer-facing readout | Customer-facing value language, claim language, export language, financial assumptions, source descriptions, and caveat wording require review. |

## 4. What Is Safe Now

The product can safely continue designing around these customer-visible
surfaces:

- AI Fluency posture summary;
- evidence gap summary;
- Client Evidence Request list;
- Client Evidence Entry status summary;
- validated Source Package status summary;
- Evidence Snapshot coverage summary;
- claim boundary preview;
- executive readout preparation status.

These surfaces must carry caveats, blocked uses, privacy posture, suppression
posture, k-min posture, source/window provenance, and audience boundary.

## 5. What Is Not Safe Yet

Do not implement:

- customer workflow routes;
- customer workflow UI;
- generic external API routes;
- customer-facing dashboard;
- manual evidence entry UI;
- export packages;
- rendered executive readouts;
- persisted Claim Readiness Snapshots;
- persisted Executive Readout Snapshots;
- raw evidence ingestion;
- full Source Package payload display;
- customer-facing financial or economic output.

## 6. Backend Preconditions For Future Routes

Future backend route work must first define route contracts for:

- customer-visible posture and gap projection;
- Client Evidence Request projection;
- Client Evidence Entry submission and status projection;
- Source Package status projection;
- Evidence Snapshot coverage projection;
- claim boundary preview projection;
- executive readout preparation status projection.

Before implementation, future route contracts must specify:

- request shape;
- response projection;
- role permissions;
- org-scope enforcement;
- source-binding checks;
- validation error shape;
- caveat carry-forward;
- suppression and k-min display behavior;
- blocked claim display behavior;
- export prohibition;
- privacy boundary behavior.

Route tests must include:

- cross-org read denial;
- cross-org write denial;
- role denial;
- source-ref drift rejection;
- source package payload mismatch rejection;
- unsafe raw/person-level payload rejection;
- projection safety;
- hidden/suppressed evidence non-exposure;
- financial output denial.

## 7. Auth, RLS, And Tenant Requirements

Future implementation must require real JWT or approved service identity outside
development and test.

Every customer workflow route must enforce org equality across:

- authenticated org;
- route org;
- persisted object org;
- Measurement Plan org;
- Evidence Snapshot org;
- Claim Readiness Handoff org;
- Client Evidence Request org;
- Client Evidence Entry org;
- Source Package reference org.

Build or write routes should be limited to `ADMIN` or approved service identity.

Review routes should be limited to `ADMIN` and `ENABLEMENT_LEAD` until a later
policy adds another role.

`EXEC_VIEWER` must receive only projected summaries if later approved.

The implementation decision must explicitly choose backend-service isolation or
request-scoped database policy enforcement for any new typed persistence route.

## 8. Frontend Preconditions For Future UI

Future UI design must prove it can display:

- coverage status;
- Playbook layer posture;
- missing, held, suppressed, rejected, and not-computed evidence;
- required caveats;
- blocked uses and blocked claims;
- suppression posture;
- privacy posture;
- k-min posture;
- source/window provenance;
- audience boundary;
- next evidence action.

The UI must not flatten held, suppressed, rejected, or not-computed lanes into
generic partial coverage.

The UI must distinguish:

- posture from proof;
- request from support;
- entry status from evidence;
- Source Package status from raw payload;
- claim boundary preview from claim output;
- executive readout preparation from rendered readout;
- internal-only review from customer-facing output.

## 9. Export Governance Requirements

No export may be built until a separate export governance contract defines:

- audience;
- allowed sections;
- blocked sections;
- caveat carry-forward;
- source refs and provenance;
- suppression and k-min behavior;
- privacy review;
- legal/trust approval state;
- customer approval state;
- expiration or versioning;
- prohibited fields;
- export validation tests.

Export must remain blocked for:

- raw rows;
- raw files;
- raw prompts;
- raw responses;
- transcripts;
- query text;
- file contents;
- direct identifiers;
- hashed or joinable person identifiers;
- person-level HRIS;
- person-level productivity;
- suppressed values;
- full Source Package payloads;
- Claim Readiness Snapshot export;
- Executive Readout Snapshot export;
- customer-facing financial output.

## 10. Legal And Trust Review Requirements

Legal/trust review is required before any customer-facing readout language,
export language, or value-claim language ships.

Review must confirm:

- AI Fluency posture is not framed as value proof;
- BigQuery source availability is not framed as value proof;
- VBD is Layer 1 posture only;
- aggregate workforce context is non-decisioning context only;
- missing evidence remains explicit;
- financial claims remain blocked;
- customer-facing financial output remains blocked;
- no people analytics, ranking, productivity, HRIS, or performance inference is
  introduced.

## 11. Required Next Design Artifacts

Recommended next design-only artifacts:

1. Customer workflow route projection contract.
2. Customer evidence entry submission contract for API shape.
3. Customer workflow display contract.
4. Export governance contract.
5. Legal/trust copy review checklist.

These should be completed before any route or UI implementation starts.

## 12. Stop Conditions For Future Implementation

Stop instead of implementing routes or UI if:

- customer-visible posture is treated as value proof;
- missing evidence is hidden;
- customer evidence request upgrades claim readiness;
- manual entry requires raw/person-level data;
- Source Package payloads would be exposed;
- Claim Readiness Handoff or snapshots would be persisted without approval;
- Executive Readout Snapshot would move beyond design-only without approval;
- route auth or tenant isolation is unresolved;
- export governance is missing;
- legal/trust review is missing;
- tests require weakening privacy, workforce, suppression, or governance
  controls.

## 13. Final Recommendation

Do not build routes or UI next.

Recommended next move: design the route projection contract and display
contract as separate docs-first phases, then implement only after auth, tenant
isolation, projection, export, and legal/trust gates are explicit.
