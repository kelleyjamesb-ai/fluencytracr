# AI Value Blueprint

Status: docs-only architecture note for the post-sales external-client product journey.

This document aligns the AI Value product journey after customer kickoff to the Glean Value Playbook as the required direction. It does not create a schema, endpoint, runtime builder, persistence table, ingest path, dashboard, claim snapshot, readout snapshot, financial claim governance object, or customer-facing output.

No migrations, Prisma schema edits, backend routes, frontend UI, ingestion jobs, persistence, raw/person-level fields, identifiers, raw prompts/responses/transcripts/query/file contents/raw BigQuery rows, unsupported ROI, EBITA, productivity, causality, headcount, individual attribution, manager_or_team_ranking, people decisioning, or customer-facing financial output are authorized by this docs-only slice.

## 1. Purpose

The blueprint defines how external-client post-sales work should move from an initial organization-level posture read to evidence collection, claim review, financial claim governance, and only then any external display decision.

FluencyTracr core is the governance layer that makes value-realization and ROI claims reliable and valid when the evidence infrastructure supports them. It does not replace the Glean Value Playbook; it enforces the evidence, privacy, suppression, source, assumption, and claim-boundary controls that determine whether Playbook-aligned value language can safely progress.

It protects a simple sequencing rule:

`AI Fluency intake -> Layer 1 posture/intensity -> Measurement Plan -> client evidence requests -> Source Packages -> Evidence Snapshot -> internal claim/readout review -> Financial Claim Governance -> Customer Exposure Policy`

The purpose is alignment, not implementation. Any runtime, persistence, API, or UI work still needs its own approved contract and verification slice.

## 2. Starting Signal

AI Fluency is the starting point.

In the post-sales journey, AI Fluency provides aggregate posture context about confidence, usage quality, behavior change, leadership reinforcement, and capability growth. It helps the value team understand where the client is starting and what evidence is missing, but it is not value proof, financial proof, productivity proof, causality proof, or customer-facing economic output.

AI Fluency can start a draft Measurement Plan and evidence gap review through the AI Fluency Intake Bridge. It cannot complete the Playbook, authorize claim readiness, or replace customer-owned Layer 2/3 evidence.

## 3. Layer 1 Posture

VBD remains Layer 1 AI fluency posture.

VBD describes the aggregate operating posture of AI-enabled work:

- Velocity: whether aggregate AI-enabled work is moving over time.
- Breadth: whether aggregate use spans surfaces, workflows, or functions.
- Depth: whether AI is embedded in repeatable workflow behavior.

VBD is useful because it shows where AI behavior is becoming visible enough to guide investigation. It is bounded because it remains posture, not proof. VBD cannot authorize ROI, EBITA, productivity, causality, headcount, individual attribution, manager_or_team_ranking, people decisioning, full Playbook coverage, or customer-facing financial output. Future financial translation requires promoted financial claim governance, not stronger interpretation of Layer 1 posture.

## 4. Layer 1 Cost/Intensity Overlay

Token Efficiency is Layer 1 cost/intensity overlay only.

Token Efficiency is `contract_only` in this worktree because Track A artifacts are present: the strategy doc, contract README, validator-backed examples, shared validator/builder, exports, and token-focused test script exist locally. It is still not a persistence object, ingestion job, runtime customer surface, claim readiness snapshot, executive readout snapshot, or customer-facing output.

Token usage can help frame cost pressure, model intensity, or identify where a client may need more efficient work patterns. It cannot upgrade VBD, evidence coverage, claim readiness, or exposure permission.

Required language:

- token usage is not ROI proof
- token usage is not value proof
- token usage is not productivity proof
- token usage is not causality proof
- token usage is not financial output

Token Efficiency must not appear in customer-facing readouts unless a later Customer Exposure Policy path explicitly authorizes the exact display scope. The current Track A contract authorizes only bounded Layer 1 cost/intensity review and evidence planning; financial translation remains gated by future/promoted financial claim governance.

## 5. Evidence Ladder

The blueprint separates current posture from missing evidence.

| Layer | What It Means | Current Blueprint Role | Boundary |
| --- | --- | --- | --- |
| Layer 1 | Aggregate platform telemetry, VBD posture, and cost/intensity context | Shows where AI-enabled work exists and where investigation should focus | Not value proof and not customer-facing economics |
| Layer 2 | Aggregate user voice, AI Fluency baseline/retest, survey, empirical, or workflow observation evidence | Explains whether people experience the workflow change as useful, trusted, and repeatable | Must be aggregate-only and customer-approved |
| Layer 3 | Customer-attested business system-of-record outcome evidence | Supports bounded value investigation and claim review | Requires source-owner review or caveat and never proves causality by itself |
| Governance and assumptions | Source, privacy, k-min, metric definition, business-context, and approval evidence | Determines whether any stronger internal review can proceed | Missing governance keeps claims held |

Missing Layer 2 and Layer 3 evidence becomes client evidence requests.

Client evidence requests should ask for aggregate-safe evidence only. They do not upgrade readiness by themselves. Only validated client evidence entries can become Source Packages, and only validated Source Packages can feed Evidence Snapshots.

## 6. Financial Claim Governance

Financial Claim Governance is the required stage between internal claim review and customer exposure. It is the control point that decides whether Playbook-aligned value language remains held, can support an internal value investigation, is ready for financial translation, or is allowed as a customer-facing financial claim.

The current docs-only slice records the stage in the blueprint only. It does not create the governance object, schema, route, UI, persistence, ingestion, readout, export, or customer-facing output.

Allowed future governance states should remain explicit:

- `held`: evidence, assumptions, source ownership, privacy, suppression, or approval gates are incomplete.
- `internal_value_investigation`: aggregate evidence can guide internal value investigation, metric selection, or customer-owned evidence repair without financial output.
- `financial_translation_ready`: aggregate evidence, customer-owned assumptions, finance/business-owner review, caveats, and source refs are sufficient for governed financial translation review, but not yet customer-facing financial claims.
- `customer_facing_financial_claim_allowed`: a later promoted financial claim governance contract allows the exact customer-facing financial claim scope, language, caveats, and approval path.

Every state must preserve the hard guardrails: no raw/person-level data, no person identifiers, no joinable identifiers, no people decisioning, no ranking, no unsupported causality, no unsupported productivity, no headcount claims, no hidden suppression, and no claim stronger than the source-bound evidence supports.

## 7. Product Journey

| Step | External-client journey moment | Contract anchor | Output posture |
| --- | --- | --- | --- |
| 1 | AI Fluency intake | `docs/contracts/ai-value-ai-fluency-intake-bridge/README.md` | Aggregate starting posture and draft evidence gaps |
| 2 | Journey stage planning | `docs/contracts/ai-value-customer-journey/README.md` | Stage state for post-sales work |
| 3 | Measurement Plan | `docs/contracts/ai-value-measurement-plan/README.md` | Required evidence layers, VBD design, windows, and blocked uses |
| 4 | Evidence requests | `docs/contracts/ai-value-client-evidence-request/README.md` | Customer asks for missing aggregate evidence |
| 5 | Evidence entries | `docs/contracts/ai-value-client-evidence-entry/README.md` | Validated aggregate entry candidates |
| 6 | Source Packages | `docs/contracts/ai-value-source-packages/README.md` | Aggregate source-bound evidence packages |
| 7 | Evidence assembly and snapshot | `docs/contracts/ai-value-evidence-collection-assembler/README.md` and `docs/contracts/ai-value-evidence-snapshot/README.md` | Source-bound evidence posture with caveats and blocked uses |
| 8 | Claim review | `docs/contracts/ai-value-claim-readiness-handoff/README.md` and `docs/contracts/ai-value-claim-readiness-snapshot/README.md` | Internal claim review only |
| 9 | Financial claim governance | Future promoted financial claim governance contract | Held, internal value investigation, financial translation ready, or customer-facing financial claim allowed |
| 10 | Readout design | `docs/contracts/ai-value-executive-readout-snapshot/README.md` | Design-only readout shape; no customer-facing output from this slice |
| 11 | Exposure gate | `docs/contracts/ai-value-customer-exposure-policy/README.md` | External display decision |

## 8. Customer Exposure Rule

Customer Exposure Policy must pass before external display.

Before any external display, the policy must confirm:

- the source-bound evidence object exists and validates;
- required caveats and blocked uses are preserved;
- VBD and Token Efficiency remain Layer 1 context only;
- missing Layer 2/3 evidence is shown as evidence requests, not as support;
- financial claims follow the promoted financial claim governance state and remain blocked unless that state allows the exact customer-facing scope;
- unsupported productivity, causality, headcount, attribution, ranking, and people-decisioning claims remain blocked;
- no raw or person-level data crosses into output;
- the exact customer-visible scope is allowed by contract.

If any condition is unclear, the default posture is hold or suppress.

## 9. Downstream Context

Quality Multiplier, Causal Delta, Reliability Factor, and Value Confidence contracts are downstream context only in this blueprint. They can qualify or route already-governed aggregate evidence when their own gates allow it. They do not turn AI Fluency, VBD, Token Efficiency, Layer 1 telemetry, or source availability into ROI proof, value proof, productivity proof, causality proof, or financial output.

Value Confidence artifacts remain bounded downstream context. They must not become a shortcut around the Glean Value Playbook, customer evidence ladder, financial claim governance, exposure policy, or governance invariants.

## 10. Stop Conditions

Stop and return to contract design if a future slice tries to:

- describe Token Efficiency as anything stronger than Layer 1 cost/intensity context without Track A artifacts and tests;
- treat AI Fluency, VBD, source availability, BigQuery telemetry, or token usage as proof;
- expose customer-facing readouts before Customer Exposure Policy approval;
- generate financial output, ROI proof, EBITA proof, customer-facing financial claims, or financial translation without a promoted financial claim governance contract;
- generate unsupported productivity claims, causal claims, or headcount claims;
- store raw rows, raw text, raw prompts, raw responses, transcripts, query text, file contents, or person-level identifiers;
- add migrations, Prisma schema changes, backend routes, frontend UI, ingestion jobs, persistence, or readout snapshots from this blueprint.
