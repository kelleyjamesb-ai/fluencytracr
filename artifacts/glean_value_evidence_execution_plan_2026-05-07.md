# Glean Value Evidence execution plan

**Date:** 2026-05-07
**Branch:** `cursor/glean-trust-layer-deep-dive-c7e6`
**Purpose:** Turn the Glean ROI/value thesis into an executable FluencyTracr plan that can be run through repo harnesses, OpenSpec gates, and bounded agent slices.

## 0. Strategic lock

### Product goal

FluencyTracr should be insertable across Glean clients as the **Glean Value Evidence Pack**: a customer-safe artifact and API surface that shows which Glean value claims are evidenced, directional, assumption-heavy, not computed, or suppressed.

### Refined positioning

> FluencyTracr validates Glean customer value by showing whether AI usage has progressed from ad hoc assistance to repeatable, governed, skill-backed workflows, and which ROI/value claims are defensible at each stage.

Use **ROI/value evidence** as the insertion point, but do not promise to prove financial truth from telemetry alone.

### Hard boundaries

- No raw prompts, raw responses, transcripts, query text, tool payloads, or file content by default.
- No direct user identifiers, individual attribution, team ranking, manager views, productivity scoring, or hidden reconstruction of suppressed values.
- No customer-facing ROI claim unless the claim registry marks it customer-safe under the current evidence and assumptions.
- Unknown signal availability remains `missing`, `suppressed`, or `not_computed`; never infer it from adjacent signals.

## 1. Current Glean platform reality to plan against

The plan must assume these are current or imminent Glean value surfaces, not distant future work:

| Surface | Planning status | FluencyTracr value angle |
| --- | --- | --- |
| UI Chat / UI Search / AI Answers | Current Time-Saves baseline | Time/value evidence, assumption sensitivity, quality and coverage caveats |
| Chat/Search APIs, Gleanbot, Autocomplete | Near-term measurement expansion | Surface coverage and customer value completeness |
| Skills | Live/beta and strategic | Reusable expertise, task standardization, repeatability, capability growth |
| Auto Mode Agents | Launching now | Agent creation velocity, test/debug loop, workflow run evidence, operationalization |
| Content-triggered / scheduled Agents | Live/beta | Background automation, deflection, proactive work, completion evidence |
| MCP / Actions / MCP Insights | Live/coming-soon | Governed action boundary, host/tool/scopes, read/write class, activity-log coverage |
| Embedded hosts: Slack, Gemini, ChatGPT, Copilot/Teams | Live/coming-soon | Distributed value where employees work; host-specific confidence and attribution limits |
| Canvas / artifacts / interactive pages / spreadsheets | Live/coming-soon | Output-backed value, artifact creation, refresh/version lineage |
| Protect runtime controls | Live/coming-soon | Value delivered under guardrails; policy/control effectiveness evidence |

## 2. Product primitives to build

### 2.1 Value Evidence Pack

Customer/org-window artifact with these sections:

1. **Executive summary**
   - Value posture: `validated`, `directional`, `assumption_heavy`, `coverage_limited`, `internal_only`, `not_computed`, `suppressed`.
   - Covered surfaces and missing surfaces.
   - Approved customer-safe language.
2. **Surface coverage**
   - Chat, Search, AI Answers, APIs, Gleanbot, Autocomplete.
3. **Skill lifecycle**
   - Skill availability, invocation, reuse, association with tasks/agents, version lineage.
4. **Agent lifecycle**
   - Agent creation, test/debug, runs, completions, failures, retries, content/schedule triggers, artifacts/actions produced.
5. **MCP/action boundary**
   - Hosts, client classes, scopes, tools, read/write class, HITL, activity logs, policy decision visibility.
6. **Control evidence**
   - Protect/runtime policies, blocks/flags, alignment checks, sensitive-content policy coverage.
7. **Assumptions and sensitivity**
   - Base rates, multipliers, hourly rates, productivity recapture, confidence, sensitivity rank, approval state.
8. **Next instrumentation**
   - Exact signal families or export contracts needed to improve claim readiness.

### 2.2 Claim Registry

Canonical catalog of value/trust claims, each with:

- `claim_id`
- `claim_type`: `time_saved`, `roi`, `payback`, `surface_coverage`, `skill_reuse`, `agent_completion`, `automation_deflection`, `artifact_creation`, `governed_action`, `control_effectiveness`
- required signal families
- allowed evidence states
- forbidden inputs
- minimum aggregation scope
- customer-safe language modes
- suppression reasons

Example claims:

- `glean.time_saved.covered_surfaces`
- `glean.roi.customer_value_to_cost`
- `glean.skills.reusable_expertise_operationalized`
- `glean.agents.auto_mode_operationalized`
- `glean.agents.content_triggered_automation`
- `glean.mcp.governed_action_boundary`
- `glean.controls.runtime_policy_coverage`
- `glean.artifacts.output_backed_work`

### 2.3 Assumption Ledger

Govern the assumptions used by value claims without becoming an ROI calculator:

- base-rate source and confidence
- quality multiplier source and confidence
- hourly-rate and persona weighting
- productivity recapture discount
- customer overrides
- sensitivity rank
- approval state: `draft`, `internal_only`, `finance_reviewed`, `customer_safe`

### 2.4 Skill Lifecycle Ledger

Skills must be first-class because they represent reusable expertise, not just another event type.

Suggested aggregate metadata:

- skill type: `platform`, `personal`, `org`, `imported`
- skill category/task class
- version/hash
- enabled state
- sharing scope
- invocation count
- routed vs explicit invocation
- successful invocation count
- associated agent IDs/classes
- artifact/action outputs when available
- evidence state and governance state

Do not ingest full `SKILL.md` contents by default. Store metadata, hashes, categories, and version lineage unless explicitly approved.

### 2.5 Agent Lifecycle Ledger

Auto Mode Agents and triggered agents need a lifecycle model:

- agent created
- agent tested
- agent debug/trace inspected
- agent enabled
- manual run
- scheduled/content-triggered run
- completion/failure/cancelled status
- retries/recovery
- step/action count
- skill invoked
- artifact created
- action/MCP tool invoked
- policy/HITL/control state

### 2.6 MCP Boundary Ledger

Aggregate evidence for action boundaries:

- host class: managed SaaS, embedded host, local IDE, gateway, other
- client/auth class
- MCP server/tool inventory state
- scopes
- read/write/mixed operation class
- HITL state
- policy/alignment state
- activity-log coverage
- host attribution confidence

### 2.7 Claim Evaluation Record

For every evaluated claim:

- `evaluation_state`: `surface`, `suppress`
- `evidence_state`: `evidence_present`, `evidence_missing`, `evidence_suppressed`, `not_computed`, `not_safe_to_claim`
- reason codes
- contributing and missing signal families
- confidence basis: `direct_observed`, `derived_aggregate`, `assumption_backed`, `insufficient`
- allowed language: `executive_safe`, `customer_safe_with_caveats`, `internal_only`, `suppressed`

## 3. OpenSpec change sequence

Large product-contract changes should not be implemented directly. Use this sequence of small proposals:

### Change 1: `add-glean-value-evidence-pack`

**Goal:** Define the customer/org-window Value Evidence Pack contract and examples.

**Likely files:**

- `openspec/changes/add-glean-value-evidence-pack/`
- `docs/contracts/glean-value-evidence/README.md`
- `docs/contracts/glean-value-evidence/examples/org-northstar-value-pack.json`
- `shared/src/gleanValueEvidenceSchemas.ts`

**Validation:**

- `npx openspec validate add-glean-value-evidence-pack --strict`
- targeted schema tests
- `npm run build --workspace shared`

### Change 2: `add-glean-claim-registry`

**Goal:** Add claim templates, claim evaluation records, safe-language modes, and suppression reasons.

**Likely files:**

- `docs/contracts/glean-claim-registry/README.md`
- `shared/src/gleanClaimRegistrySchemas.ts`
- `backend/tests/glean_claim_registry*.test.ts`

**Validation:**

- schema tests
- governance gate for forbidden outputs
- shared build

### Change 3: `add-glean-assumption-ledger`

**Goal:** Govern base rates, multipliers, recapture, hourly rates, confidence, sensitivity, and approval state.

**Likely files:**

- `docs/contracts/glean-assumption-ledger/README.md`
- `shared/src/gleanAssumptionLedgerSchemas.ts`
- examples seeded from the Time-Saves MVP packet

**Validation:**

- tests showing low-confidence/high-sensitivity assumptions constrain claim language
- docs contract sweep

### Change 4: `expand-glean-readiness-for-skills-agents`

**Goal:** Promote `skill_lifecycle`, `agent_run`, `agent_step`, `actions`, `mcp_usage`, `ai_security`, `assistant`, and `insights` into first-class value-readiness families.

**Likely files:**

- `shared/src/gleanSignalReadinessSchemas.ts`
- `docs/contracts/glean-signal-readiness/README.md`
- source fixture examples for skill and agent lifecycle metadata

**Validation:**

- readiness examples validator
- backend readiness adapter tests
- shared build

### Change 5: `add-glean-ai-work-evidence-adapter`

**Goal:** Replace the narrow WorkflowRun-only adapter idea with a metadata-only `Glean AI Work Evidence Adapter v1`.

**Allowed families:**

- surface usage
- skill lifecycle
- agent lifecycle
- workflow run / step / action metadata
- MCP usage metadata
- embedded host metadata
- artifact metadata
- Protect/runtime control metadata

**Forbidden:**

- raw prompts, raw responses, transcript text, query text, file content, tool payloads, direct identifiers.

**Validation:**

- fail-first tests for forbidden fields
- strict schemas
- UT / readiness mapping tests

### Change 6: `add-glean-value-evidence-mcp-tools`

**Goal:** Let Glean Agents query bounded value evidence.

**Candidate tools:**

- `fluency.get_value_evidence_pack`
- `fluency.evaluate_claim_safety`
- `fluency.get_value_claim_readiness_summary`
- `fluency.get_non_computable_value_claims`

**Validation:**

- `npm test --workspace @learnaire/fluencytracr-mcp`
- strict response template tests

## 4. Harness and agent execution model

### 4.1 Execution tracks

Use both repo tracks:

- `.project/WORK_QUEUE.json` / `.project/PROGRESS.md` for active work state.
- `harness/feature_list.json` and `harness/agent-progress.txt` for verified milestones and handoff.

Do not edit `WORK_QUEUE.json` structure unless a human adds the new work items. Proposed queue items are listed below for human adoption.

### 4.2 Proposed human-owned queue items

Suggested bounded queue items:

1. `glean-value-01-pack-contract`
   - Value Evidence Pack contract, examples, schema.
2. `glean-value-02-claim-registry`
   - Claim templates, evaluation records, safe-language modes.
3. `glean-value-03-assumption-ledger`
   - Base-rate/multiplier/recapture governance.
4. `glean-value-04-skills-agents-readiness`
   - Skill and Auto Mode Agent lifecycle readiness examples.
5. `glean-value-05-ai-work-adapter`
   - Metadata-only adapter fixtures and mapping.
6. `glean-value-06-mcp-tools`
   - Read-only Glean Agent tools for value evidence.
7. `glean-value-07-executive-demo`
   - Customer-safe Value Evidence Pack prototype.
8. `glean-value-08-verification-hardening`
   - Docs sweep, forbidden-field tests, backend/MCP/shared builds, harness verify.

### 4.3 Agent roles to use

Use agents intentionally, not as a replacement for repo memory:

| Agent role | When to invoke | Expected output |
| --- | --- | --- |
| `explore` subagent | Before each implementation slice touching existing docs/code | File map, prior patterns, affected tests |
| `docs-researcher` or web/doc research | When Glean roadmap/API docs change | Current docs summary and source URLs |
| `generalPurpose` subagent | For focused design alternatives before OpenSpec | Options, risks, recommended contract shape |
| `code-reviewer` subagent | After each major contract/API implementation chunk | Findings against plan, tests, governance boundaries |
| `best-of-n-runner` subagents | For isolated competing schema/API prototypes if design is uncertain | Compare viable implementations before choosing |
| Optional OpenAI Agents sidecar | To validate repo harness prompts and specialist decomposition | Development-only validation via `npm run validate:agents` |

If a true external model consensus is needed, spawn Cursor background agents only when `CURSOR_BG_AGENT_KEY` is configured; otherwise record that consensus is same-model/persona-based.

### 4.4 Verification by slice

| Slice | Minimum verification |
| --- | --- |
| Docs-only strategy/contract | `git diff --check`; docs contract sweep if links/examples change |
| Shared schemas | targeted backend schema tests; `npm run build --workspace shared` |
| Backend mapping/derivation | targeted Jest tests; `npm run test:ci --workspace backend` for final slice |
| MCP tools | `npm test --workspace @learnaire/fluencytracr-mcp`; MCP build if changed |
| Glean publisher/indexing | `npm run test --workspace @learnaire/glean-publisher` |
| EvidenceBundle examples | `bash scripts/validate_evidence_bundle_schema.sh` |
| Readiness examples | `node scripts/validate_glean_readiness_examples.mjs` |
| Governance-sensitive output | `python scripts/ci_v1_governance_gates.py` |
| Full milestone | `./harness/scripts/verify.sh` plus relevant Node checks |

### 4.5 Proposed harness checklist candidates

Do not add these directly to `harness/feature_list.json` unless the team accepts this program as the next harness track. Once accepted, each candidate should be a bounded feature with `passes: false` until the listed mechanical checks pass.

| Candidate id | Description | Mark passing only after |
| --- | --- | --- |
| `glean-value-pack-contract` | Value Evidence Pack contract, shared schema, and synthetic example cover surface, skill, agent, MCP/action, artifact, control, and assumption lanes | OpenSpec strict validation, schema/example validation, shared build |
| `glean-claim-registry-contract` | Claim Registry and Claim Evaluation contracts enforce customer-safe states and deterministic suppression reasons | targeted schema tests, governance gate for forbidden wording |
| `glean-assumption-ledger` | Base-rate, multiplier, recapture, hourly-rate, confidence, and sensitivity assumptions are governable evidence | assumption-ledger tests showing unsafe assumptions constrain claim language |
| `glean-skills-agents-readiness` | Skill lifecycle and Auto Mode Agent lifecycle are first-class readiness/value signal families | readiness validator, adapter tests, shared build |
| `glean-ai-work-evidence-adapter` | Metadata-only adapter maps approved Glean AI work surfaces into readiness and claim evaluation without raw content | forbidden-field fail-first tests, mapping tests, backend targeted tests |
| `glean-value-evidence-mcp-tools` | Glean Agents can query bounded value evidence and claim readiness through strict MCP tools | MCP package tests and strict response template tests |
| `glean-value-demo-pack` | Executive/client prototype demonstrates QBR-safe value evidence, gaps, and next instrumentation | prototype validator, docs sweep, optional browser smoke |

## 5. Recommended build order

### Phase A: lock the customer-facing artifact

1. Add Value Evidence Pack contract and one synthetic example.
2. Add allowed state taxonomy.
3. Add docs explaining how this differs from ROI certification.

Why first: this makes the insertion point clear for Glean CS/GTM before implementation complexity expands.

### Phase B: add claim governance

1. Claim Registry schema.
2. Claim Evaluation schema.
3. Safe-language modes.
4. Initial claim templates for time saved, ROI, skills, agents, MCP/actions, controls, artifacts.

Why second: every later adapter should map to claim readiness, not raw metrics.

### Phase C: add assumptions as governable evidence

1. Assumption Ledger schema.
2. Seed examples from the Time-Saves MVP packet.
3. Tests proving high-sensitivity/low-confidence assumptions constrain customer-safe language.

Why third: this is the defensibility layer for current Glean time-saved work.

### Phase D: promote Skills and Auto Mode Agents

1. Skill lifecycle fixture and readiness map entry.
2. Agent lifecycle fixture including Auto Mode/test/debug/trace state.
3. Readiness-to-value mapping.

Why fourth: Skills and Auto Mode Agents are live strategic surfaces and cannot remain "later".

### Phase E: broaden adapter from WorkflowRun to AI Work Evidence

1. Metadata-only source fixture adapter.
2. Strict forbidden-field rejection.
3. Mapping to readiness and claim evaluation.

Why fifth: this creates the eventual live-data bridge while keeping Path C safe.

### Phase F: expose bounded read tools

1. MCP tools for value pack and claim safety.
2. Strict templates and rejection of unsafe dimensions.
3. Glean Agent usage docs.

Why sixth: lets Glean-native workflows consume the evidence without raw records.

### Phase G: executive/client prototype

1. Static demo using synthetic Value Evidence Pack.
2. QBR-safe language examples.
3. Coverage and instrumentation-gap callouts.

Why seventh: aligns product, GTM, and customer narrative.

## 6. First two executable slices

### Slice 1: Value Evidence Pack contract

**Bound:** docs + shared schema + example only.

**Deliverables:**

- OpenSpec `add-glean-value-evidence-pack`
- `docs/contracts/glean-value-evidence/README.md`
- JSON schema or Zod schema in `shared/`
- one synthetic example
- validator test

**Acceptance criteria:**

- Example validates mechanically.
- Contract includes Skills, Auto Mode Agents, MCP, artifacts, and controls as evidence lanes.
- Contract has no raw content/direct identifiers.
- OpenSpec validates strict.

### Slice 2: Claim Registry contract

**Bound:** docs + shared schema + examples only.

**Deliverables:**

- OpenSpec `add-glean-claim-registry`
- claim template schema
- claim evaluation schema
- reason code taxonomy
- first 10 Glean claim templates

**Acceptance criteria:**

- Customer-facing ROI claims cannot surface unless required evidence and assumption states pass.
- Skills and Auto Mode Agent claims are first-class.
- Unsafe claims produce deterministic reason codes.

## 7. Decisions needed from humans

1. Should the active `.project/WORK_QUEUE.json` be updated with the proposed `glean-value-*` queue items, or should current `phase-03-fsc-min-signal` remain the only active queue path?
2. Which Glean live surfaces can provide customer-accessible aggregate metadata now: Skills, Auto Mode Agents, MCP Insights, Protect runtime controls, Canvas/artifacts?
3. Which audiences need the first Value Evidence Pack: internal Glean CS/GTM, customer admins, procurement/CFO, or executive sponsor?
4. What language is acceptable: "ROI validation", "ROI evidence", "value evidence", or "business value assurance"?
5. Are customer-level account names/ARR allowed in synthetic examples, or should examples remain fully fictional?

## 8. Operating rule for the whole program

Every slice must preserve the core value proposition:

> FluencyTracr makes Glean client value claims more usable by making them more defensible. It should enable the strongest safe claim, not maximize the biggest number.
