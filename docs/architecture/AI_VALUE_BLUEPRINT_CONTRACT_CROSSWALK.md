# AI Value Blueprint Contract Crosswalk

Status: docs-only crosswalk for `docs/architecture/AI_VALUE_BLUEPRINT.md`.

This crosswalk maps each blueprint concept to the current contract, doc, schema, persistence, runtime, and customer exposure posture in this worktree. It aligns the blueprint to the Glean Value Playbook as the required direction and treats FluencyTracr core as the governance layer that enables reliable and valid value or ROI claims when evidence infrastructure supports them. It does not authorize new implementation.

Column meanings:

- Contract/doc status: whether the concept has a current source document or contract.
- Schema status: whether a JSON schema or shared validator exists.
- Persistence status: whether durable storage exists or is intentionally blocked.
- Runtime status: whether a runtime helper exists or the concept is docs-only.
- Customer exposure status: whether the concept can appear externally.

## 1. Crosswalk

| Blueprint concept | Contract/doc status | Schema status | Persistence status | Runtime status | Customer exposure status |
| --- | --- | --- | --- | --- | --- |
| Blueprint alignment note | `docs/architecture/AI_VALUE_BLUEPRINT.md` | No schema; architecture note only | No persistence | No runtime | Not customer-visible |
| First productized pilot scope | `docs/architecture/AI_VALUE_PILOT_SCOPE_LOCK.md` | No schema; scope decision only | Uses existing minimal persistence foundation; adds none | No runtime | Not customer-visible; defines the first support-workflow pilot scope only |
| AI Value Intelligence foundation | `docs/contracts/ai-value-intelligence/README.md`; examples under `docs/contracts/ai-value-intelligence/examples/` | Existing schemas under `schemas/ai-value-intelligence/`, including `schemas/ai-value-intelligence/blueprint.schema.json` | Generic object and minimal persistence exist elsewhere, but this crosswalk adds none | Existing AI Value Engine validators/generators remain separate from this docs slice | Internal/product planning only unless later exposure contract allows |
| Post-sales customer journey | `docs/contracts/ai-value-customer-journey/README.md` | Shared validator: `shared/src/aiValueEngine/customerJourney.ts` | No new persistence from this blueprint | Contract helper only | Stage posture may guide customer work, but external display still depends on exposure policy |
| AI Fluency starting point | `docs/contracts/ai-value-ai-fluency-intake-bridge/README.md` | Shared validator: `shared/src/aiValueEngine/aiFluencyIntakeBridge.ts` | No persistence from the bridge | Bridge can create draft Measurement Plan context and evidence gaps | Aggregate posture only; not value proof |
| Measurement Plan | `docs/contracts/ai-value-measurement-plan/README.md` | Shared validator: `shared/src/aiValueEngine/measurementPlan.ts` | Minimal table exists for `measurement_plans`; this blueprint changes none | Existing validator/builder patterns | Internal planning artifact until projected and approved |
| VBD posture | Measurement Plan and Evidence Snapshot contracts define VBD boundaries | Shared validators in `measurementPlan.ts` and `evidenceSnapshot.ts` | VBD can be carried inside persisted Measurement Plans and Evidence Snapshots | Contract-derived context only | VBD remains Layer 1 AI fluency posture; not ROI proof, not value proof, not productivity proof, not causality proof, not financial output |
| Token Efficiency | `contract_only`: Track A artifacts are present at `docs/architecture/AI_VALUE_TOKEN_USAGE_STRATEGY.md` and `docs/contracts/ai-value-token-efficiency-signal/README.md` | Shared validator/builder: `shared/src/aiValueEngine/tokenEfficiencySignal.ts`; examples under `docs/contracts/ai-value-token-efficiency-signal/examples/`; test: `scripts/validate_ai_value_token_efficiency_signal.test.mjs` | No persistence | Contract helper only; no ingestion job, backend route, frontend UI, claim snapshot, or readout snapshot | Token Efficiency is Layer 1 cost/intensity overlay only; token usage is not ROI proof, not value proof, not productivity proof, not causality proof, not financial output |
| VBD x Token Efficiency Map | `contract_only`: `docs/contracts/ai-value-vbd-token-efficiency-map/README.md` defines aggregate strategy zones only | Shared validator/builder: `shared/src/aiValueEngine/vbdTokenEfficiencyMap.ts`; examples under `docs/contracts/ai-value-vbd-token-efficiency-map/examples/`; test: `scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs` | No persistence | Contract helper only; no ingestion job, backend route, frontend UI, claim snapshot, reportability readiness, or readout snapshot | Aggregate strategy context only; not ROI proof, not value proof, not productivity proof, not causality proof, not financial output |
| VBD x Token Pilot Runner | `contract_only`: `docs/contracts/ai-value-vbd-token-pilot-runner/README.md` defines aggregate time-series strategy posture only | Shared validator/builder: `shared/src/aiValueEngine/vbdTokenPilotRunner.ts`; example under `docs/contracts/ai-value-vbd-token-pilot-runner/examples/`; test: `scripts/validate_ai_value_vbd_token_pilot_runner.test.mjs` | No persistence | Contract helper only; no ingestion job, backend route, frontend UI, claim snapshot, reportability readiness, or readout snapshot | Aggregate pilot movement context only; not ROI proof, not value proof, not productivity proof, not causality proof, not financial output |
| Layer 2 and Layer 3 evidence asks | `docs/contracts/ai-value-client-evidence-request/README.md` | Shared validator: `shared/src/aiValueEngine/clientEvidenceRequest.ts` | No persistence from requests | Request builder/helper only | Customer ask is allowed as an evidence request, not as evidence or claim support |
| Client evidence entries | `docs/contracts/ai-value-client-evidence-entry/README.md` | Shared validator: `shared/src/aiValueEngine/clientEvidenceEntry.ts` | No new persistence; validated entries may convert to Source Packages | Validator and conversion helper | Entry status alone cannot become value proof or customer-facing financial output |
| Source Packages | `docs/contracts/ai-value-source-packages/README.md` | Shared validator: `shared/src/aiValueEngine/sourcePackages.ts` | Metadata refs table exists for `source_package_refs`; full package payload storage remains constrained | Validator supports aggregate source package handling | Source availability is not value proof; customer display requires exposure approval |
| Evidence Collection Assembler | `docs/contracts/ai-value-evidence-collection-assembler/README.md` | Shared validator/helper: `shared/src/aiValueEngine/evidenceCollectionAssembler.ts` | No persistence; produces snapshot input posture | Assembly helper only | Internal evidence assembly only |
| Evidence Snapshot | `docs/contracts/ai-value-evidence-snapshot/README.md` | Shared validator: `shared/src/aiValueEngine/evidenceSnapshot.ts` | Minimal table exists for `evidence_snapshots`; this blueprint changes none | Internal runtime builder may persist validated snapshots under existing boundaries | Not externally visible without projection and exposure approval |
| Claim Readiness Handoff | `docs/contracts/ai-value-claim-readiness-handoff/README.md` | Shared validator: `shared/src/aiValueEngine/claimReadinessHandoff.ts` | Non-persisted by contract | Handoff helper only | Internal claim boundary only |
| Claim Readiness Snapshot | `docs/contracts/ai-value-claim-readiness-snapshot/README.md` | Shared validator: `shared/src/aiValueEngine/claimReadinessSnapshot.ts` | Existing backend-only persistence authority is documented in `docs/architecture/AI_VALUE_PERSISTENCE_DESIGN.md`; this lineage pass changes none | Contract helper; persistence authority remains external to this pass | Internal claim review only; financial output is not authorized by this docs-only slice |
| Financial Claim Governance | Future promoted financial claim governance contract; this crosswalk reserves the required stage only | No schema in this slice | No persistence | No runtime | Future state ladder only: held, internal value investigation, financial translation ready, or customer-facing financial claim allowed |
| Executive Readout Snapshot | `docs/contracts/ai-value-executive-readout-snapshot/README.md` | Backend-only validator/builder authority is documented elsewhere; no JSON schema or external projection is authorized here | Existing backend-only persistence authority is documented in `docs/architecture/AI_VALUE_PERSISTENCE_DESIGN.md`; this lineage pass changes none | Internal helper; persistence authority remains external to this pass | No external display from this slice; financial claims require promoted financial claim governance first |
| Customer Exposure Policy | `docs/contracts/ai-value-customer-exposure-policy/README.md` | Shared validator: `shared/src/aiValueEngine/customerExposurePolicy.ts` | No persistence from policy | Policy helper only | Customer Exposure Policy must pass before external display; financial scope also requires promoted financial claim governance |
| Post-Sales Workflow Orchestrator | `docs/contracts/ai-value-post-sales-workflow-orchestrator/README.md` | Shared validator/helper: `shared/src/aiValueEngine/postSalesWorkflowOrchestrator.ts` | Transient contract object; no persistence | Orchestrates contract objects only | No customer-facing dashboard, route, export, or financial output from this slice |
| Quality Multiplier | `docs/contracts/quality-multiplier.md` | Existing value-realization contract outside this blueprint | No persistence change | Bounded downstream context only | Not ROI proof, not value proof, not productivity proof, not causality proof, not financial output |
| Causal Delta | `docs/contracts/causal-delta.md` | Existing value-realization contract outside this blueprint | No persistence change | Bounded downstream context only | Association/change context only; not causality proof |
| Reliability Factor | `docs/contracts/reliability-factor.md` | Existing value-realization contract outside this blueprint | No persistence change | Bounded downstream context only | Reliability context only; not value proof |
| Value Confidence contracts | `docs/contracts/value-confidence/README.md` and `docs/contracts/value-confidence/*` | Documentation-stage downstream contracts | No persistence change from this blueprint | bounded downstream context | Internal/bounded downstream context only; no customer-facing economic output |

## 2. Required Contract Inventory

The blueprint alignment references the current Planck inventory as follows:

- `docs/contracts/ai-value-intelligence/README.md`
- `docs/architecture/AI_VALUE_PILOT_SCOPE_LOCK.md`
- `docs/contracts/ai-value-measurement-plan/README.md`
- `docs/contracts/ai-value-source-packages/README.md`
- `docs/contracts/ai-value-evidence-collection-assembler/README.md`
- `docs/contracts/ai-value-evidence-snapshot/README.md`
- `docs/contracts/ai-value-claim-readiness-handoff/README.md`
- `docs/contracts/ai-value-claim-readiness-snapshot/README.md`
- `docs/contracts/ai-value-executive-readout-snapshot/README.md`
- `docs/contracts/ai-value-customer-exposure-policy/README.md`
- `docs/contracts/ai-value-post-sales-workflow-orchestrator/README.md`
- `docs/contracts/ai-value-customer-journey/README.md`
- `docs/contracts/ai-value-client-evidence-request/README.md`
- `docs/contracts/ai-value-client-evidence-entry/README.md`
- `docs/contracts/ai-value-ai-fluency-intake-bridge/README.md`
- `docs/architecture/AI_VALUE_TOKEN_USAGE_STRATEGY.md`
- `docs/contracts/ai-value-token-efficiency-signal/README.md`
- `docs/contracts/ai-value-token-efficiency-signal/examples/valid-token-efficiency-signal.json`
- `docs/contracts/ai-value-token-efficiency-signal/examples/held-token-efficiency-signal.json`
- `shared/src/aiValueEngine/tokenEfficiencySignal.ts`
- `scripts/validate_ai_value_token_efficiency_signal.test.mjs`
- `docs/contracts/ai-value-vbd-token-efficiency-map/README.md`
- `docs/contracts/ai-value-vbd-token-efficiency-map/examples/valid-replicate-map.json`
- `docs/contracts/ai-value-vbd-token-efficiency-map/examples/valid-mitigate-map.json`
- `docs/contracts/ai-value-vbd-token-efficiency-map/examples/held-map.json`
- `shared/src/aiValueEngine/vbdTokenEfficiencyMap.ts`
- `scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs`
- `docs/contracts/ai-value-vbd-token-pilot-runner/README.md`
- `docs/contracts/ai-value-vbd-token-pilot-runner/examples/customer-success-50-synthetic-pilot-run.json`
- `shared/src/aiValueEngine/vbdTokenPilotRunner.ts`
- `scripts/validate_ai_value_vbd_token_pilot_runner.test.mjs`
- `docs/contracts/quality-multiplier.md`
- `docs/contracts/causal-delta.md`
- `docs/contracts/reliability-factor.md`
- `docs/contracts/value-confidence/README.md`
- `docs/contracts/value-confidence/internal-scale-readiness-readout.md`
- `docs/contracts/value-confidence/ai-manager-outcomes-recommendations.md`

Value-confidence/* is included only as bounded downstream context. It must not be used to bypass the Glean Value Playbook, Evidence Snapshot, Claim Readiness, Financial Claim Governance, or Customer Exposure Policy gates.

## 3. Exposure Rules

External display remains blocked unless the Customer Exposure Policy validates the exact scope. Customer-facing financial claims also require a later promoted financial claim governance contract that allows the exact claim language, caveats, source refs, approval path, and display scope.

Customer exposure must never be inferred from:

- AI Fluency baseline or retest posture;
- VBD posture;
- Token Efficiency cost/intensity context;
- Layer 1 platform telemetry;
- BigQuery source availability;
- Source Package presence;
- Client Evidence Request status;
- Client Evidence Entry status;
- internal claim readiness context;
- unpromoted financial claim governance state;
- value-confidence downstream context.

Financial claim governance states must remain explicit and non-magical:

- `held`: incomplete evidence, assumptions, privacy, suppression, source, or approval gates.
- `internal_value_investigation`: aggregate evidence can guide internal value investigation or customer-owned evidence repair without financial output.
- `financial_translation_ready`: approved aggregate evidence and assumptions can move into governed financial translation review, but not customer-facing financial claims.
- `customer_facing_financial_claim_allowed`: a future promoted governance contract allows the exact customer-facing financial claim scope.

Any future display must preserve caveats, blocked uses, source refs, suppression posture, privacy posture, Layer 2/3 gaps, VBD boundaries, token usage boundaries, financial boundaries, and the Glean Value Playbook evidence sequence.

## 4. Stop Conditions

Stop the slice if a future change attempts to mark Token Efficiency stronger than `contract_only` without a later approved runtime/persistence/exposure contract, or if it treats token usage, VBD, AI Fluency, source availability, or Layer 1 telemetry as ROI proof, value proof, productivity proof, causality proof, or financial output.

Stop the slice if a future change adds migrations, Prisma schema edits, backend routes, frontend UI, ingestion jobs, persistence, raw/person-level fields, identifiers, raw prompts/responses/transcripts/query/file contents/raw BigQuery rows, unsupported ROI, EBITA, productivity, causality, headcount, individual attribution, manager_or_team_ranking, people decisioning, or customer-facing financial output.

Stop the slice if a future change creates financial translation, customer-facing financial claims, ROI proof, EBITA proof, or dollarized output without a later promoted financial claim governance contract.
