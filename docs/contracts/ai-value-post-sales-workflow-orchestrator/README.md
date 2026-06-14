# AI Value Post-Sales Workflow Orchestrator Contract

Schema version: `FT_AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_2026_06`

## 1. Purpose

The AI Value Post-Sales Workflow Orchestrator is an internal-only, non-route
composition contract for the post-sales customer evidence workflow.

It wires the existing aggregate-safe AI Value contracts into one transient
workflow:

1. AI Fluency Intake
2. Measurement Plan Draft
3. Initial Evidence Snapshot posture
4. Evidence Gap Review
5. Client Evidence Requests
6. Client Evidence Entry to Source Packages
7. Updated Evidence Snapshot
8. Claim Readiness Handoff

It does not create a customer-facing dashboard, external API route, ingestion
job, migration, Prisma model, persisted claim readiness snapshot, persisted
executive readout snapshot, ROI output, EBITA output, causality output,
productivity output, headcount output, people-decisioning output,
`manager_or_team_ranking` output, or customer-facing financial output.

Related contracts:

- [AI Value Customer Journey](../ai-value-customer-journey/README.md)
- [AI Value AI Fluency Intake Bridge](../ai-value-ai-fluency-intake-bridge/README.md)
- [AI Value Client Evidence Request](../ai-value-client-evidence-request/README.md)
- [AI Value Client Evidence Entry](../ai-value-client-evidence-entry/README.md)
- [AI Value Source Packages](../ai-value-source-packages/README.md)
- [AI Value Evidence Collection Assembler](../ai-value-evidence-collection-assembler/README.md)
- [AI Value Evidence Snapshot](../ai-value-evidence-snapshot/README.md)
- [AI Value Claim Readiness Handoff](../ai-value-claim-readiness-handoff/README.md)

## 2. Inputs

The orchestrator accepts:

- aggregate AI Fluency intake posture or the safe missing-baseline placeholder
  supported by the AI Fluency Intake Bridge;
- Measurement Plan draft inputs;
- optional aggregate-safe Source Packages, such as an already validated Layer 1
  telemetry summary;
- optional Client Evidence Entry objects.

Client Evidence Entry payloads are validated before Source Package conversion.
The orchestrator output records validation/rejection metadata only; it does not
retain raw submitted rows, raw files, prompts, responses, transcripts, query
text, file contents, direct identifiers, hashed or joinable person identifiers,
person-level HRIS, or person-level productivity.

## 3. Output

The orchestrator returns one `PostSalesWorkflowOrchestrator` object with:

- `customer_journey`
- `ai_fluency_intake_bridge`
- `initial_evidence_gap_review`
- `current_evidence_gap_review`
- `client_evidence_requests.initial_requests`
- `client_evidence_requests.current_requests`
- `client_evidence_entry_reviews`
- `source_packages`
- `initial_evidence_snapshot`
- `evidence_collection_assembly`
- `evidence_snapshot`
- `claim_readiness_handoff`
- `workflow_phases`
- `coverage_summary`
- `governance`
- `privacy_boundary`
- `feeds`
- `persistence_policy`
- `allowed_uses`
- `blocked_uses`
- `required_caveats`

All outputs are transient contract objects. The handoff is not a Claim Readiness
Snapshot and is not persisted.

## 4. Workflow Rules

AI Fluency-only startup is useful, but evidence-limited. It can produce a draft
Measurement Plan, evidence gap review, Client Evidence Requests, a caveated
Evidence Snapshot posture, and a non-persisted Claim Readiness Handoff.

AI Fluency baseline is aggregate user voice / posture context only. It is not
value proof.

VBD remains Layer 1 operating posture only. It cannot support financial,
productivity, causality, headcount, attribution, ranking, people-decisioning, or
customer-facing financial claims.

Client Evidence Requests identify missing evidence. They do not improve claim
readiness by themselves.

Client Evidence Entries can become Source Packages only when:

- the entry validates;
- the entry is aggregate-only;
- the entry is attested by the appropriate source owner role;
- the entry meets k-min requirements;
- the entry has `validation_status: validated`;
- the entry has `evidence_state: present` or `partial`;
- the entry matches the orchestrated `org_id` and Measurement Plan.

Invalid, held, suppressed, rejected, or mismatched entries remain visible as
review metadata and cannot become Source Packages.

Updated Evidence Snapshots can improve Playbook layer posture when validated
Source Packages are available. Missing, held, suppressed, rejected, and
not-computed evidence remains explicit and cannot be treated as support.

Aggregate workforce context can be accepted only as aggregate, cohort-safe,
approved, non-decisioning context. It cannot upgrade coverage by itself.

## 5. Claim Boundary

The orchestrator may build only a non-persisted Claim Readiness Handoff from a
validated Evidence Snapshot.

The handoff carries forward:

- Playbook coverage
- coverage status
- caveats
- blocked uses
- blocked claims
- suppression posture
- privacy posture
- source refs
- source provenance
- VBD boundary
- aggregate workforce context boundary
- financial boundary
- executive readout boundary

It must not create claim readiness snapshots or executive readout snapshots.

Financial translation, ROI, EBITA, customer-facing financial output, causality,
productivity, and headcount claims remain blocked unless future contracts
explicitly authorize those scopes.

## 6. Required Blocked Uses

Every orchestrator output must preserve:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

## 7. Persistence And Exposure Policy

The orchestrator persistence policy must keep all of the following false:

- `persisted`
- `creates_migrations`
- `creates_prisma_schema`
- `creates_backend_routes`
- `creates_frontend_ui`
- `creates_ingestion_jobs`
- `stores_raw_rows`
- `stores_raw_files`
- `creates_claim_readiness_snapshots`
- `persists_claim_readiness_snapshots`
- `creates_executive_readout_snapshots`
- `persists_executive_readout_snapshots`

Customer exposure is still blocked pending the customer exposure policy and
API/UI readiness decision phases.

## 8. Validation Expectations

`validatePostSalesWorkflowOrchestrator` must fail closed when:

- required phases are missing or reordered;
- AI Fluency, Measurement Plan, request, entry, Source Package, assembly,
  Evidence Snapshot, or handoff contracts fail validation;
- entries are accepted despite invalid validation results;
- Source Packages are created from invalid, held, rejected, suppressed, or
  mismatched entries;
- missing, held, suppressed, rejected, or not-computed evidence is hidden;
- unsafe allowed uses, produced outputs, feeds, governance flags, persistence
  flags, privacy flags, or claim boundaries are introduced;
- raw/person-level fields or unsafe people analytics fields appear anywhere in
  the orchestrator object.

## 9. Non-Goals

This phase does not authorize:

- migrations or Prisma schema changes;
- backend routes;
- frontend UI;
- ingestion jobs;
- raw file or raw row storage;
- persisted Evidence Snapshots beyond already authorized internal persistence;
- persisted Claim Readiness Snapshots;
- persisted Executive Readout Snapshots;
- customer-facing readouts;
- ROI, EBITA, causality, productivity, headcount, ranking, people decisioning,
  or customer-facing financial output.
