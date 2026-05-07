# Glean deep dive: strengthening FluencyTracr as the must-have trust layer

**Date:** 2026-05-07  
**Branch:** `cursor/glean-trust-layer-deep-dive-c7e6`  
**Scope:** Strategic/product analysis, not runtime implementation.  

## Paper note

The user referenced an enclosed paper, but no PDF, DOCX, or filename containing `paper` was present in `/workspace` during this pass. This analysis therefore uses the repository's existing FluencyTracr/Glean materials plus public Glean product and documentation research. If the paper is later provided by path, update this artifact with a paper-specific appendix.

## Executive takeaways

1. **Glean is no longer just enterprise search.** It is positioning itself as a Work AI platform: enterprise graph, Assistant, reusable Agents, orchestration, MCP, customer event logs, Protect/Protect+, and agent governance.
2. **Glean is already strong at in-platform prevention and permission enforcement.** It owns tenant isolation, ACL-aware retrieval, agent sharing controls, AI security policies, Protect+ guardrails, alignment checks, and centrally managed MCP.
3. **The gap FluencyTracr can own is independent behavioral assurance.** Glean can answer, "Was this request permitted and guarded inside Glean?" FluencyTracr should answer, "Across agent workflows, tools, humans, policies, and time, what can we prove is trustworthy, what is uncertain, and where must we suppress rather than infer?"
4. **The must-have wedge is a trust evidence plane, not another dashboard.** FluencyTracr should become the suppression-safe system of record for agent-run evidence: run lineage, control effectiveness, signal computability, policy coverage, fragility/calibration patterns, and audit-ready EvidenceBundles.
5. **The current repo is aligned with this wedge.** Existing Glean Signal Readiness Map, EvidenceBundle v1, MCP tools, Glean publisher, live-data gate, and PRD governance rules already encode the right posture: aggregate, deterministic, no raw prompts/responses, no person-level attribution, and explicit `missing` / `suppressed` / `not_computed` states.

## What Glean is becoming

Public Glean materials show five platform moves that matter for FluencyTracr:

### 1. Glean Agents as the workflow runtime

Glean Agents are reusable workflows composed of triggers, steps, actions, flow logic, sub-agents, and run memory. Glean describes agents as a horizontal agent environment with an agent builder, orchestration, library, engine, and governance. Agents can be manually launched, scheduled, triggered by content/system events, routed from Assistant, and embedded into tools.

**Implication:** FluencyTracr should treat Glean as an agent execution substrate. The core telemetry object is not a chat message; it is a `workflow_run` / agent run with trigger, initiator, platform, steps, actions, errors, tool calls, citations, feedback, and policy events.

### 2. Native agent governance and Protect+

Glean's governance stack includes:

- agent sharing controls
- permissions checks on every request
- agent alignment models that evaluate actions against intended purpose
- role/permission controls for agent creation and management
- Protect/Protect+ for sensitive content scanning, prompt injection, malicious code, toxic content, restricted topics, dashboards, APIs, SIEM/SOAR integrations, and partner integrations

**Implication:** FluencyTracr should not position itself as a replacement for Glean Protect or permission enforcement. The stronger position is independent evidence that these controls are present, applied, effective, incomplete, or not observable.

### 3. MCP as both action surface and risk boundary

Glean operates managed remote MCP servers that expose permission-aware enterprise context to hosts such as Claude, ChatGPT, Cursor, VS Code, and others. Glean also brings external MCP servers into Assistant and Agents. Public docs emphasize centralized server/tool approval, least-privilege execution, user-scoped identity, runtime scanning, and MCP activity logs.

**Implication:** MCP creates a new trust boundary: external hosts, OAuth clients, scopes, tool exposure, agent-as-tool constraints, read/write capability, human confirmation, and data egress. FluencyTracr should make this boundary observable without ingesting raw content.

### 4. WorkflowRun logs as the likely live-data integration anchor

Glean introduced `WORKFLOW_RUN` customer event logs to track Agents, AI Answers, Summarization, Deep Research, Daily Digests, and related AI features. Public schema fields include `runId`, `chatSessionId`, `sessionTrackingToken`, `feature`, `initiator`, `platform`, workflow executions, step executions, action executions, status, errors, tools/actions, citations, and linked LLM calls.

**Implication:** The next live adapter should start with a strict whitelist around `WORKFLOW_RUN` metadata, not raw conversations. This aligns with FluencyTracr's existing PRD: execution boundaries, trace reconstruction, FSC, minimum signal gates, deterministic structural signals, suppression-first outputs.

### 5. AWARE as Glean's trust narrative

Glean's AWARE framework is: Actor Intent, Work Context, Autonomous Guardrails, Real-Time Risk Scoring & Blocking, and Ecosystem Observability.

**Implication:** FluencyTracr should map directly to the "Ecosystem Observability" and "control effectiveness" side of AWARE. The best complement is independent, cross-surface evidence of what agents did, which controls applied, which signals are computable, and what cannot be safely claimed.

## FluencyTracr's current strategic assets

The repo already contains the ingredients for the right Glean wedge:

- **Behavioral observability PRD:** deterministic, workflow-level, suppression-first behavioral signals; no productivity, ROI, rankings, or individual scoring (`artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md`).
- **Implementation blueprint:** ingest -> normalize -> reconstruct trace -> lifecycle -> FSC -> minimum signal gate -> signals -> calibration -> classification -> suppression -> aggregation (`artifacts/FLUENCYTRACR_V1_IMPLEMENTATION_BLUEPRINT.md`).
- **Glean Signal Readiness Map:** org-window scoped computability map with `present`, `missing`, `suppressed`, `not_computed` states (`docs/contracts/glean-signal-readiness/README.md`).
- **EvidenceBundle v1:** partner-facing evidence contract that preserves suppression and avoids raw content/identifiers (`docs/contracts/evidence-bundle/v1/README.md`).
- **Glean integration pack:** EvidenceBundle indexing, agent tooling, security/audit, acceptance tests, demo guide, live-data gate (`docs/integrations/glean/`).
- **MCP read tools:** strict aggregate summary and readiness tools for Glean Agents (`docs/integrations/glean/03-glean-agent-tooling.md`, `packages/fluencytracr-mcp/`).
- **Publisher path:** EvidenceBundle-to-Glean document builder and scheduled workflow gate (`packages/glean-publisher/`, `.github/workflows/glean-publisher-scheduled.yml`).
- **Data access RFI:** binding vendor/customer questionnaire for log availability, fields, join keys, retention, ordering, completeness, privacy, and schema evolution (`artifacts/DATA_ACCESS_CONTRACT_RFI.md`).

This is a defensible foundation because it does not bet on raw access. It makes uncertainty a first-class product state.

## The trust-layer thesis

**FluencyTracr should become the evidence layer that tells CIOs, CISOs, AI platform owners, and governance teams which parts of their Glean-based agent estate are trustworthy enough to reason about, which controls are working, and which claims must be suppressed.**

The product should make four promises:

1. **No hidden inference.** Unknown, missing, or governance-blocked signals remain `not_computed`, `missing`, or `suppressed`.
2. **No surveillance wedge.** No person/team ranking, no productivity proxy, no raw prompts, no raw responses, no file content.
3. **No platform duplication.** Glean remains the in-product runtime, index, permission layer, and guardrail surface.
4. **Independent evidence.** FluencyTracr provides normalized, reproducible, audit-ready behavioral evidence across Glean and eventually other agent platforms.

## Where FluencyTracr should go next

### 1. Package the product as a "Glean Trust Evidence Plane"

Create a Glean-specific solution narrative with three artifacts:

- **Readiness:** "Can we compute this signal safely?"
- **Assurance:** "Which agent/workflow behaviors and controls are observable?"
- **EvidenceBundle:** "What can executives and governance teams safely consume?"

The current demo guide already says "measurable now / blocked / suppressed / missing." Make that the default buyer narrative.

### 2. Promote WorkflowRun to the first live adapter candidate

Do not start with broad "Glean logs." Start with a narrow, approved `WORKFLOW_RUN` adapter:

- whitelist only metadata fields needed for execution boundary, step/action visibility, status/error visibility, and source coverage
- reject `WorkflowConversation.Messages.Text`, raw prompts, responses, document content, query text, and direct user identifiers
- preserve scrub status and field availability
- require a signed field manifest and join-key proof before production ingestion

This makes the live-data path concrete while preserving the existing Path C pilot default until evidence is available.

### 3. Add a "MCP Boundary Ledger"

MCP is where Glean's trust story becomes cross-system. FluencyTracr should model an aggregate ledger for:

- MCP host class: managed SaaS, local IDE, gateway, other
- OAuth/client type: static, dynamic, user token
- server/tool exposure
- scopes
- read vs write capability
- human-in-the-loop availability
- tool invocation status/error class
- policy/alignment decision state
- suppression state

The output should be aggregate and org-window scoped. The value is not "who used which tool"; it is "which classes of tool boundaries are governed, observable, and safe enough to include in trust evidence."

### 4. Move from readiness to control-effectiveness evidence

Current readiness says whether a signal family can contribute. The next product move is to derive control-effectiveness evidence:

- Are AI security policies present for Assistant, interactive agents, and scheduled/content-triggered agents?
- Are blocked vs flagged events observable as aggregate counts or states?
- Are alignment checks observable before high-impact actions?
- Are MCP activity logs available and scoped?
- Are agent routing rules visible enough to distinguish intended vs accidental invocation?
- Is the error/status taxonomy stable enough to classify friction and recovery?

This is where FluencyTracr becomes must-have for CISO/CIO governance reviews: it does not merely surface usage; it proves the trust boundary is instrumented.

### 5. Build an "AWARE evidence crosswalk"

Use Glean's own security language to avoid category friction:

| AWARE dimension | FluencyTracr evidence angle |
| --- | --- |
| Actor Intent | initiator, trigger, run/workflow identity, agent purpose metadata, route source |
| Work Context | org-window, workflow class, policy applicability, source coverage, suppression context |
| Autonomous Guardrails | alignment check presence, policy enforcement state, write/HITL capability state |
| Real-Time Risk Scoring & Blocking | blocked/flagged aggregate states, unsafe tool/action class, error/retry/recovery patterns |
| Ecosystem Observability | WorkflowRun lineage, MCP boundary ledger, EvidenceBundle, readiness map, audit export |

Position FluencyTracr as the evidence plane that operationalizes AWARE beyond a single UI and across time.

### 6. Create a "trust launch pack" for Glean pilots

For Glean customers or prospects deploying Agents/MCP, FluencyTracr can offer a concrete launch motion:

1. **Pre-launch readiness review:** field manifest, scrub proof, join keys, retention, policy surfaces.
2. **Pilot instrumentation map:** what is present / missing / suppressed / not computed.
3. **Agent workflow evidence:** workflow-run coverage, step/action visibility, error/status coverage.
4. **MCP boundary evidence:** approved hosts, scopes, tools, activity logs, host attribution limits.
5. **Executive-safe report:** EvidenceBundle indexed back into Glean and queryable through bounded MCP tools.

This turns FluencyTracr into a deployment accelerant rather than a post-hoc analytics add-on.

## Roadmap slices

### Immediate: tighten the narrative and proof kit

- Update Glean docs to use the "Trust Evidence Plane" naming consistently.
- Add a one-page AWARE crosswalk to `docs/integrations/glean/`.
- Add a sample "Glean Trust Launch Pack" checklist that references existing RFI, readiness map, EvidenceBundle, MCP tools, and demo.
- Keep Path C as default until live-data evidence is confirmed.

### Next: narrow live-data proposal

Create an OpenSpec proposal for a `WorkflowRun`-only adapter:

- allowed source fields
- forbidden fields
- scrub status handling
- join-key requirements
- mapping into Unified Telemetry / agent-run schema / readiness map
- tests that reject raw content and direct identifiers
- suppression and audit behavior

This is the most important bridge from demo to production.

### Next: MCP boundary model

Create a contract for aggregate MCP boundary evidence:

- server/tool inventory state
- host/client class
- scopes and operation class
- activity-log coverage
- policy/alignment/HITL observability
- non-computable states

Start as a readiness/evidence contract before implementing live ingestion.

### Later: cross-platform agent trust

Once Glean is proven, expand the same evidence model to other agent substrates. This is where FluencyTracr becomes bigger than Glean:

- Glean
- Microsoft agent/control-plane surfaces
- OpenAI/Claude/Cursor development agents
- internal workflow agents
- custom MCP servers

The common layer is not vendor-specific telemetry. It is the normalized assertion: what ran, under whose authority class, through which boundary, with which control states, and what can safely be reported.

## Product boundaries to protect

Keep these non-negotiable:

- no individual attribution
- no team/manager/ranking/productivity views
- no raw prompts, raw responses, transcripts, message text, file content, or direct identifiers
- no inference from missing/suppressed/not-computed signals
- no numeric threshold or baseline exposure on executive surfaces
- no trend narrative until explicitly approved by future spec
- no live Glean ingestion without field, scrub, join, retention, suppression, and audit evidence

These constraints are not limitations; they are the trust differentiator.

## Key risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Glean expands native dashboards | Could appear to absorb observability | Position FluencyTracr as independent evidence, cross-system normalization, and suppression-safe audit layer |
| Data access varies by deployment | Live adapter may not be portable | Treat readiness as product state; require signed field manifests and keep Path C |
| Buyer hears "analytics" as surveillance | Trust story can be misread | Lead with no raw content, no person/team ranking, no productivity scoring |
| MCP telemetry is host-dependent | Host attribution and policy guarantees vary | Model host/client confidence and expose `not_computed` when attribution is weak |
| Control-effectiveness claims overreach | Could imply compliance certification | Use evidence presence and bounded assertions, not compliance scores |

## Source references

### Internal repository

- `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md`
- `artifacts/FLUENCYTRACR_V1_IMPLEMENTATION_BLUEPRINT.md`
- `artifacts/DATA_ACCESS_CONTRACT_RFI.md`
- `docs/integrations/glean/01-overview.md`
- `docs/integrations/glean/02-evidencebundle-to-glean-indexing.md`
- `docs/integrations/glean/03-glean-agent-tooling.md`
- `docs/integrations/glean/04-security-and-audit.md`
- `docs/integrations/glean/05-acceptance-tests.md`
- `docs/integrations/glean/06-readiness-demo-guide.md`
- `docs/integrations/glean/07-live-data-access-decision-gate.md`
- `docs/contracts/glean-signal-readiness/README.md`
- `docs/contracts/evidence-bundle/v1/README.md`
- `docs/superpowers/plans/2026-05-01-glean-readiness-integration-roadmap.md`
- `packages/fluencytracr-mcp/src/tools.ts`
- `packages/glean-publisher/src/gleanDocument.ts`

### Public Glean sources reviewed

- Glean Agents product page: `https://www.glean.com/product/ai-agents`
- Glean Agent Governance: `https://glean.com/product/agent-governance`
- Glean Agent Orchestration: `https://glean.com/product/agent-orchestration`
- Glean APIs: `https://glean.com/product/api`
- Glean Agents docs: `https://docs.glean.com/agents/`
- Glean Agents introduction: `https://docs.glean.com/agents/introduction.md`
- How Glean Agents work: `https://docs.glean.com/agents/how-agents-work.md`
- Glean Protect overview: `https://docs.glean.com/administration/protect/overview`
- AI security policy configuration: `https://docs.glean.com/administration/protect/ai-security/configuring-policies`
- MCP security/data flow/permissions: `https://docs.glean.com/administration/platform/mcp/security`
- Agents as MCP tools: `https://docs.glean.com/administration/platform/mcp/agents-as-tools`
- WorkflowRun logs: `https://docs.glean.com/administration/gce-logs/migrating-to-workflowrun-logs`
- Glean customer event schema: `https://docs.glean.com/administration/gce-logs/data-dictionary-detailed`
- MCP in Glean blog: `https://glean.com/blog/mcp-mar-drop-2026`
- AWARE / Glean Protect blog: `https://glean.com/blog/agentic-security-aware`

## Bottom line

Glean is becoming the enterprise agent runtime and context layer. FluencyTracr should become the independent trust evidence layer around it: a deterministic, suppression-safe, cross-boundary system that proves where agent behavior is observable, governed, computable, and safe to report. The path to "must-have" is to make uncertainty visible, make controls auditable, and give executives a safe way to ask trust questions inside Glean without turning FluencyTracr into surveillance or a scoring product.
