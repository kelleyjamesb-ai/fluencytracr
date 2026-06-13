# AI Value Playbook Alignment Completion Plan

Status: program-level implementation plan and current-state audit. This Phase 0
document does not authorize migrations, Prisma schema changes, backend routes,
frontend UI, ingestion jobs, persistence, claim readiness snapshots, or
executive readout snapshots.

Program id: `program-ai-value-playbook-alignment-completion`

## 1. Purpose

This plan defines the remaining AI Value Playbook alignment sequence required
to move FluencyTracr from contract foundation to safe infrastructure
implementation.

The governing chain is:

`Value Hypothesis -> Measurement Plan -> Evidence Collection / Source Packages -> Evidence Snapshot -> Claim Readiness Handoff -> Claim Readiness Snapshot -> Executive Readout Snapshot -> UI / API Presentation`

No downstream object may make a stronger claim than the upstream evidence
supports. The next work must proceed in order, with verification and progress
updates after each phase.

## 2. Current Landed Foundation

The current branch is stacked on the non-persisted Claim Readiness Handoff
branch because the program depends on that foundation.

| Foundation artifact | Current repo path | Current state | Notes |
| --- | --- | --- | --- |
| AI Value Data Model Audit | `docs/architecture/AI_VALUE_DATA_MODEL_AUDIT.md` | Exists | Establishes current durable-state inventory and future minimal persistence direction. |
| BigQuery Signal Availability Audit | `docs/architecture/BIGQUERY_SIGNAL_AVAILABILITY_AUDIT.md` | Exists | Classifies source signals and safe probe templates. |
| BigQuery Signal Probe Results | `docs/architecture/BIGQUERY_SIGNAL_PROBE_RESULTS.md` | Exists | Records read-only probe posture and caveated snapshot readiness. |
| Aggregate Workforce Context Governance | `docs/architecture/AGGREGATE_WORKFORCE_CONTEXT_GOVERNANCE.md` | Exists | Allows only aggregate, cohort-safe, approved, non-decisioning workforce context. |
| AI Value Measurement Plan contract | `docs/contracts/ai-value-measurement-plan/README.md` | Exists | Defines plan requirements before evidence collection. |
| Measurement Plan validator/helper | `shared/src/aiValueEngine/measurementPlan.ts` | Exists | Enforces Playbook requirements, VBD design, workforce context, privacy, and readiness gates. |
| AI Value Evidence Snapshot contract | `docs/contracts/ai-value-evidence-snapshot/README.md` | Exists | Defines aggregate evidence posture and Playbook coverage matrix. |
| Evidence Snapshot validator/helper | `shared/src/aiValueEngine/evidenceSnapshot.ts` | Exists | Enforces coverage status, Layer 1-only blockers, VBD map, privacy, suppression, k-min, and caveats. |
| Claim Readiness Handoff contract | `docs/contracts/ai-value-claim-readiness-handoff/README.md` | Exists | Defines non-persisted handoff from validated Evidence Snapshot to downstream claim context. |
| Claim Readiness Handoff validator/helper | `shared/src/aiValueEngine/claimReadinessHandoff.ts` | Exists | Copies snapshot posture forward and fails closed for financial/readout boundaries. |
| Contract Chain Integration Audit | `docs/architecture/AI_VALUE_CONTRACT_CHAIN_INTEGRATION_AUDIT.md` | Exists | Identifies remaining source binding and persistence blockers. |
| Shared AI Value exports | `shared/src/aiValueEngine/index.ts` | Exists | Exports Measurement Plan, Evidence Snapshot, and Claim Readiness Handoff helpers. |

## 3. Current Validation Coverage

Existing validation scripts and package commands:

| Command or script | State | Coverage |
| --- | --- | --- |
| `npm run test:ai-value-measurement-plan` | Exists | Measurement Plan contract/examples/validator. |
| `npm run test:ai-value-contract-chain` | Exists | Measurement Plan to Evidence Snapshot chain safety. |
| `npm run test:ai-value-claim-readiness-handoff` | Exists | Evidence Snapshot to Claim Readiness Handoff contract safety. |
| `npm run build --workspace shared && node --test scripts/validate_ai_value_evidence_snapshot.test.mjs` | Exists | Evidence Snapshot contract/examples/validator. |
| `npm run test:ai-value-engine` | Exists | Shared engine export and value chain smoke coverage. |
| `bash scripts/ci_docs_contract_sweep.sh` | Exists | Docs and semantic drift guard. |
| `python3 scripts/ci_v1_governance_gates.py` | Exists | V1 governance regression gate. |

Not-started validation commands:

- `npm run test:ai-value-source-packages`
- `npm run test:ai-value-evidence-collection-assembler`

## 4. Remaining Not-Started Work

| Work item | Current state | Dependency |
| --- | --- | --- |
| Source Package contracts | Missing | Must precede evidence assembly and ingestion. |
| Evidence Collection Assembler | Missing | Requires Measurement Plan and Source Package validators. |
| Persistence design | Missing | Requires source/assembly contracts to define safe durable shape. |
| Minimal persistence migration | Missing | Requires persistence design to classify tables as `implement_now`. |
| Internal runtime builder services | Missing | Requires safe persistence and assembler. |
| Claim Readiness Snapshot contract/design | Missing | Requires validated Evidence Snapshot and Claim Readiness Handoff. |
| Executive Readout Snapshot design | Missing | Requires source-bound claim readiness posture. |
| API/UI readiness audit | Missing | Requires persistence and internal runtime services to be safe first. |

## 5. Phase Sequence

| Phase | Phase id | Output | Implementation boundary |
| --- | --- | --- | --- |
| 0 | `program-ai-value-playbook-alignment-completion` | This completion plan and current-state audit. | Docs only. No runtime or persistence changes. |
| 1 | `phase-ai-value-source-package-contracts` | Source Package contract, helper, examples, tests, exports. | Contract/helper/tests only. No ingestion or persistence. |
| 2 | `phase-ai-value-evidence-collection-assembler` | Non-persisted assembler from Measurement Plan plus Source Packages to Evidence Snapshot input. | Contract/helper/tests only. No routes or persistence. |
| 3 | `phase-ai-value-persistence-design` | Persistence design doc. | Design only. No migrations. |
| 4 | `phase-ai-value-minimal-persistence` | Minimal approved aggregate persistence. | Only if design classifies selected tables as `implement_now`. No claim/readout persistence by default. |
| 5 | `phase-ai-value-runtime-builders-internal` | Internal service functions for validated chain building. | Internal only. No public routes or UI. |
| 6 | `phase-ai-value-claim-readiness-snapshot-design` | Claim Readiness Snapshot contract/helper; persistence only if prerequisites allow. | Stop after contract/tests if prerequisites are not fully safe. |
| 7 | `phase-ai-value-executive-readout-snapshot-design` | Executive Readout Snapshot design. | Design only unless later explicitly approved. |
| 8 | `phase-ai-value-api-ui-readiness-audit` | API/UI readiness audit. | Audit only. No UI implementation. |

## 6. Dependencies

- Source Packages must exist before any assembler or ingestion path can treat
  external evidence as input.
- Evidence Collection Assembly must exist before persistence can safely store
  derived Evidence Snapshots from external source refs.
- Persistence design must exist before migrations.
- Minimal persistence must be aggregate contract payloads only and must preserve
  schema version, derivation version, source refs, privacy, suppression, and
  caveats.
- Internal runtime builders must consume validated persisted aggregate contracts
  and return non-persisted Claim Readiness Handoffs.
- Claim Readiness Snapshots must be derived only from a validated Evidence
  Snapshot and validated Claim Readiness Handoff.
- Executive Readout Snapshots must remain design-only until source binding,
  caveat propagation, blocked claims, suppression, privacy, and financial
  boundaries are enforced.
- API and UI work must wait until persistence and internal runtime builders are
  safe.

## 7. Persistence Boundary

Persistence is blocked until Phase 3 design is complete.

Phase 4 may implement only tables that the design classifies as
`implement_now`. The default candidate set is:

- `value_hypotheses`
- `measurement_plans`
- `evidence_snapshots`
- `source_package_refs` or metadata-only `source_packages`

The default deferred set is:

- `claim_readiness_snapshots`, unless all handoff/runtime prerequisites justify
  it later;
- `executive_readout_snapshots`;
- raw source tables;
- UI-specific tables;
- person-level or joinable identifier tables.

Durable state must store validated aggregate contract payloads or metadata
refs only. Corrections must create new versions rather than mutating historical
evidence posture.

## 8. Runtime Boundary

Runtime builders are blocked until source package contracts, evidence assembly,
and minimal persistence are safe.

Allowed runtime behavior in Phase 5:

- load validated Measurement Plans;
- load validated source package refs or metadata;
- build an evidence collection assembly;
- validate an Evidence Snapshot;
- persist the Evidence Snapshot only if safe and Phase 4 has implemented the
  approved table;
- build a Claim Readiness Handoff;
- return the handoff as a non-persisted object.

Blocked runtime behavior:

- public backend routes;
- frontend UI;
- executive readout generation;
- ROI, EBITA, productivity, causality, or financial impact computation;
- weakening or hiding caveats, blocked uses, privacy, suppression, workforce,
  or VBD boundaries.

## 9. UI Boundary

No UI is authorized until the API/UI readiness audit is complete.

Future UI must prove it can render:

- coverage status;
- required caveats;
- blocked claims;
- evidence gaps;
- suppression posture;
- privacy posture;
- customer-facing vs internal-only boundaries;
- VBD and aggregate workforce context as context, not claim authorization.

UI must not expose caveated, held, suppressed, or internal-only evidence as
customer-safe.

## 10. Governance Invariants

The program must preserve all existing privacy, workforce, suppression,
Playbook, VBD, ROI, EBITA, and claim-boundary controls.

The base FluencyTracr invariants remain active:

- no new canonical events beyond the existing nine;
- no new suppression reasons beyond the existing five;
- no tunable thresholds or admin overrides;
- no individual scoring or user-identifiable fields;
- default verdict remains `SUPPRESS`;
- latency remains corroborative only;
- Assurance Harness and governance gates must remain green;
- suppression gates apply independently per approved aggregate slice.

Never introduce:

- individual scoring;
- user-identifiable fields;
- person-level productivity;
- person-level HRIS records;
- direct identifiers;
- hashed or joinable person identifiers in product state;
- the blocked use `manager_or_team_ranking`;
- the blocked use `people_decisioning`;
- compensation/performance inference;
- promotion/discipline inference;
- attrition prediction;
- HRIS inference from AI usage;
- raw prompts, responses, transcripts, query text, file contents, or raw
  BigQuery rows;
- dollarized ROI from usage;
- EBITA claims from telemetry;
- causality claims without causal design;
- customer-facing financial output without full Playbook coverage and approved
  assumptions.

VBD remains Layer 1 platform telemetry only.

BigQuery source availability is not full Playbook coverage.

Aggregate workforce context is allowed only when aggregate-only, cohort-safe,
customer-approved, non-decisioning, non-ranking, and free of direct or joinable
person identifiers.

Default posture must remain fail-closed.

## 11. Durable Progress Rule

After each phase, update `.project/PROGRESS.md` with:

- phase id;
- status;
- files created or changed;
- tests and guardrails run;
- pass/fail results;
- blockers, if any;
- explicit confirmation that no forbidden runtime, persistence, route, UI,
  ingestion, claim snapshot, readout snapshot, or weakened governance control
  was added.

The program brief asks for `.project/WORK_QUEUE.json` updates, but
`.project/GOVERNANCE.md` forbids agents from adding, deleting, or merging queue
items. Agents may only update existing queue item status or `last_note`. If no
human-created program queue item exists, `.project/PROGRESS.md` is the
equivalent durable program update.

## 12. Test Strategy

After each implementation phase, run targeted phase tests plus the chain
regression commands relevant to touched contracts.

Global commands:

- `npm run test:ai-value-source-packages` once Phase 1 adds it.
- `npm run test:ai-value-evidence-collection-assembler` once Phase 2 adds it.
- `npm run test:ai-value-claim-readiness-handoff`
- `npm run test:ai-value-contract-chain`
- `npm run test:ai-value-measurement-plan`
- `npm run build --workspace shared && node --test scripts/validate_ai_value_evidence_snapshot.test.mjs`
- `npm run test:ai-value-engine`
- `bash scripts/ci_docs_contract_sweep.sh`
- `python3 scripts/ci_v1_governance_gates.py`
- `git diff --check`
- `rg -n "^(<<<<<<<|=======|>>>>>>>)" .`

If a command does not exist yet, the phase progress note must say so rather
than silently skipping it.

## 13. Stop Conditions

Stop and report instead of continuing if:

1. A phase requires weakening privacy, suppression, workforce, VBD, or
   claim-boundary controls.
2. A migration would need person-level, raw, direct-identifier, hashed
   identifier, or joinable-identifier fields.
3. A route or UI would expose caveated, suppressed, held, or internal-only
   evidence as customer-safe.
4. A test requires deletion or weakening to pass.
5. Existing repo conventions conflict with safe persistence.
6. Source Package contracts cannot represent Layer 2 or Layer 3 evidence
   safely.
7. Runtime builders cannot preserve caveats and blocked uses across the chain.
8. Full Playbook coverage can be reached without Layer 2, Layer 3, governance,
   assumptions or explicit not-required status, k-min, and safe privacy.
9. VBD or aggregate workforce context can upgrade coverage or claim readiness by
   itself.
10. BigQuery source availability can become full Playbook coverage.

## 14. Phase 0 Verification Scope

Phase 0 is complete when:

- this completion plan exists;
- the existing foundation is inventoried;
- missing phases are listed;
- dependencies and boundaries are explicit;
- stop conditions are explicit;
- no runtime, route, UI, ingestion, persistence, migration, claim snapshot, or
  readout snapshot changes are made.

Phase 0 should run docs/governance/static checks only. Source package and
assembler tests do not exist until later phases.
