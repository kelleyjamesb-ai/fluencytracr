# FluencyTracr — Product Requirements Document (PRD v1)

**Status:** Signed-off, enforceable system contract (v1).  
**Canonical copy:** `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md`  
**Harness:** Phased implementation tracked in `harness/feature_list.json` (`prd-phase-01` … `prd-phase-04`). Large or breaking implementation follows OpenSpec (`harness-004`).

---

## 1. Product Definition

### 1.1 Purpose

FluencyTracr is a governed behavioral observability system that enables organizations to understand how AI is used inside workflows and where that usage creates stability, friction, or risk.

It does NOT:

- measure productivity
- score individuals
- estimate ROI
- rank teams

All outputs are behavioral signals, not evaluative judgments.

---

## 2. Core Product Wedge

### 2.1 Initial Use Case

Provide executives with:

- visibility into workflow stability vs fragility
- identification of where AI interactions break down
- insight into trust calibration (overtrust vs undertrust)

### 2.2 Target Users

| Role | Need |
| --- | --- |
| CIO / CTO | AI system reliability + risk visibility |
| Head of AI / Transformation | Where adoption is breaking vs working |
| Ops Leaders | Workflow-level friction insights |
| Compliance / Risk | Guardrail interaction patterns |

---

## 3. Core Conceptual Model

### 3.1 Unit of Work

Work Unit = `(workflow_id, execution_id)`

- `workflow_id` = task type
- `execution_id` = single attempt

### 3.2 Hierarchy

`workflow` → `execution` → `trace` → `event`

- **workflow:** semantic grouping
- **execution:** analysis boundary
- **trace:** interaction sequence
- **event:** atomic log

---

## 4. Data Inputs (Assumed Full Access)

### 4.1 Log Families

- Assistant logs
- Workflow logs
- Agent run logs
- Agent step logs
- MCP / tool logs
- Governance / security logs

**Vendor / export contract:** For third-party platform logs, use `artifacts/DATA_ACCESS_CONTRACT_RFI.md` as the executable questionnaire. First-party intake may use unified telemetry (`docs/contracts/unified-telemetry/README.md`) in parallel; join-key parity remains a design dependency.

---

## 5. System Architecture

### 5.1 Pipeline Overview

```
Ingestion Layer
  ↓
Normalization Layer (execution_id resolution)
  ↓
Trace Reconstruction Engine
  ↓
Signal Detection Engine
  ↓
Pattern Classification Engine
  ↓
Governance + Suppression Layer
  ↓
Observability API
```

---

## 6. Core System Components

### 6.1 Ingestion Layer

**Requirements:**

- Accept canonical events (`POST /api/events`)
- Validate schema strictly
- Reject unknown or malformed fields

**Output:**

- Append-only event store

### 6.2 Normalization Layer

**Purpose:** Resolve all incoming IDs into `execution_id`.

**Logic:**

- Map `workflow_run_id` and `run_id`
- Maintain lineage (`agent_run_id`, `chat_id`)

### 6.3 Trace Reconstruction Engine

**Input:** events grouped by `execution_id`  
**Output:** ordered event sequences

**Capabilities:**

- event ordering
- retry detection
- step grouping
- tool call grouping

### 6.4 Signal Detection Engine

| Signal | Logic |
| --- | --- |
| Iteration Depth | # of retries / loops |
| Verification | presence of checking behavior |
| Recovery | error → retry → success |
| Abandonment | no completion after start |
| Latency | time vs baseline |
| Disposition | accept / edit / reject |

### 6.5 Pattern Classification Engine

Deterministic rules. Each execution assigned **ONE** pattern:

| Pattern | Criteria |
| --- | --- |
| Calibrated Fluency | low iteration + verification present |
| Blind Efficiency | low iteration + no verification |
| Recovery Maturity | recovery sequence present |
| Friction Loop | high iteration + high latency |
| Undertrust Avoidance | abandonment or no AI usage |

**Constraints:**

- mutually exclusive
- confidence-gated
- relative to workflow baseline
- **FSC and minimum signal set gates apply (§18, §20); classification is not permitted without them.**

### 6.6 Governance + Suppression Layer

**Rules:**

- default: suppress if unsafe
- no individual-level outputs
- no ranking or scoring
- no longitudinal narratives
- **explicit suppression hierarchy (§21)**

**Output:** `ALLOWED` or `SUPPRESSED` with reason

---

## 7. API Design

### 7.1 Event Ingestion

`POST /api/events`

- strict validation
- append-only

### 7.2 Observability API

`GET /api/observability/:org_id`

**Constraints:**

- aggregated only
- no ranking
- no trends
- no individual exposure

---

## 8. Observability Outputs

### 8.1 Workflow-Level Signals

- distribution of behavioral patterns per workflow

### 8.2 Allowed Interpretations

- workflow exhibits recovery behavior
- workflow shows friction patterns

### 8.3 Disallowed Interpretations

- team performance
- productivity
- improvement claims

---

## 9. Non-Goals

- ROI calculations
- time saved metrics
- scoring
- ranking
- recommendations

---

## 10. Build Phases

| Phase | Scope |
| --- | --- |
| **Phase 1 — Core Engine** | ingestion, normalization, trace reconstruction |
| **Phase 2 — Signal + Pattern Layer** | signal detection, classification |
| **Phase 3 — Governance Enforcement** | suppression logic, API constraints |
| **Phase 4 — Observability Surface** | workflow outputs |

Harness checklist IDs: `prd-phase-01` … `prd-phase-04` in `harness/feature_list.json`.

---

## 11. Fail-First Risks

| Risk | Fix |
| --- | --- |
| Hidden outcome inference | enforce signal-only outputs |
| Execution boundary drift | strict start/end definitions |
| Pattern = score | no ordering, no trend surfaces |

---

## 12. Acceptance Criteria

**System:**

- append-only events
- traceable executions
- no evaluative metrics

**Governance:**

- no individual outputs
- suppression on ambiguity
- **FSC and minimum signal set enforced before classification (§18, §20, §21)**

**Output:**

- workflow-level only
- mutually exclusive patterns
- confidence gating enforced

---

## 13. Execution State Machine (Formal)

### 13.1 States

| State | Description |
| --- | --- |
| INIT | Execution created, awaiting first event |
| ACTIVE | Events are being processed |
| RETRY | A retry sequence detected after error or rejection |
| PAUSED | Execution paused or awaiting external input |
| COMPLETED | Terminal success state (system-level) |
| ERRORED | Terminal failure state |
| ABANDONED | No terminal event within timeout window |
| CANCELLED | User or system cancelled |

### 13.2 State Transitions (Deterministic)

- INIT → ACTIVE: first valid event received
- ACTIVE → RETRY: error event followed by subsequent attempt
- RETRY → ACTIVE: new attempt proceeds without immediate error
- ACTIVE → COMPLETED: terminal success signal present
- ACTIVE → ERRORED: terminal error signal present
- ACTIVE → CANCELLED: cancellation event
- ACTIVE → PAUSED: explicit pause or wait state
- ANY → ABANDONED: no events within inactivity timeout

### 13.3 Timeouts

- `inactivity_timeout_ms`: configurable per workflow (default: 15 minutes)
- `max_execution_window_ms`: hard cap (default: 24 hours)

### 13.4 Notes

- COMPLETED and ERRORED are system states, not outcome truth
- ABANDONED is inferred, not emitted

---

## 14. Signal Detection Logic (Deterministic Rules)

### 14.1 Iteration Depth

**Definition:** Count of distinct attempt cycles within execution.

**Rule:** `iteration_depth = count(retry_sequences)`

**Retry sequence defined as:** `(error OR rejection)` → subsequent attempt within window.

### 14.2 Verification Detection

**Definition:** Evidence of human or system checking AI output.

**Rules** (any true ⇒ `verification_present`):

- follow-up query referencing prior output
- tool call used for validation (e.g. retrieval, search)
- explicit "check" or "validate" step event

**Constraint:** must be structural, not semantic inference.

### 14.3 Recovery Detection

**Definition:** Error followed by successful continuation.

**Rule:** `recovery = (error_event)` → `(retry_event)` → `(non-error progression)`

### 14.4 Abandonment Detection

**Definition:** Execution started but not completed.

**Rule:** `start_event` exists; no terminal event; `inactivity_timeout` exceeded.

### 14.5 Latency

**Definition:** Time between key state transitions.

**Computed as:**

- `total_execution_time = end_time - start_time`
- `step_latency` = per-step duration

**Note:** used only for internal comparison, not surfaced as performance metric.

### 14.6 Disposition

**Definition:** How AI output is handled.

**Rules:**

- **ACCEPT:** no modification, no retry
- **EDIT:** modification or follow-up refinement
- **REJECT:** discard + retry
- **ABANDON:** no further use

---

## 15. Pattern Classification Logic (Deterministic)

Each execution assigned **ONE** pattern.

### 15.1 Priority Order (Prevents Overlap)

1. Undertrust Avoidance
2. Friction Loop
3. Recovery Maturity
4. Blind Efficiency
5. Calibrated Fluency

### 15.2 Rules

**Undertrust Avoidance**

- `abandonment = true`

**Friction Loop**

- `iteration_depth >= threshold_high`
- `latency >= threshold_high`

**Recovery Maturity**

- `recovery = true`

**Blind Efficiency**

- `iteration_depth = 0`
- `verification = false`

**Calibrated Fluency**

- `iteration_depth <= threshold_low`
- `verification = true`

### 15.3 Constraints

- exactly one pattern per execution
- thresholds defined per workflow (see §16 and §19)
- no probabilistic classification
- **classification applies only when FSC and minimum signal set are satisfied (§18, §20); otherwise output is SUPPRESSED per §21**

---

## 16. Baseline Computation (Governance-Constrained)

### 16.1 Purpose

Provide relative context WITHOUT enabling trend or performance inference.

### 16.2 Rules

- baseline computed within `workflow_id` only
- no cross-workflow comparison
- no time-series trend exposure

### 16.3 Method

- compute distribution of signals within rolling window (internal only)
- expose only relative categories (e.g., "high iteration relative to workflow")

### 16.4 Constraints

- baseline never surfaced numerically
- no directional language (increase/decrease)

### 16.5 Normative reference

**Enforceable threshold calibration for classification inputs is specified in §19.** Section 16 states product intent; §19 states engineering and exposure rules that implement it without numeric or trend leakage.

---

## 17. Signal Registry (Dependency Mapping)

Each signal must declare required inputs.

**Example:**

```yaml
iteration_depth:
  requires: [retry_event OR step_logs]

recovery:
  requires: [error_event, retry_event]

verification:
  requires: [follow_up_event OR validation_tool_call]
```

---

## 18. Full State Coverage (FSC)

### 18.1 Definition

An execution has **Full State Coverage (FSC)** if **ALL** of the following are true:

**Boundary Integrity**

- `start_event` present (explicit or deterministically inferred)
- `terminal_state` present (**COMPLETED**, **ERRORED**, or **CANCELLED**) **OR** abandonment inferred via timeout

**Temporal Integrity**

- ≥ **95%** of events have valid timestamps
- ordering is reconstructable

**Trace Integrity**

- at least one trace exists
- retries (if present) are linkable

**Error Visibility**

- if an error occurs, at least one `error_event` is present

### 18.2 Rule

**FSC_REQUIRED = TRUE**

- Only FSC executions are eligible for classification.
- All non-FSC executions must be **SUPPRESSED** (see §21).

### 18.3 Internal Metric (NOT exposed)

```
fsc_rate = FSC_executions / total_executions
```

`fsc_rate` is for internal monitoring and governance review only. It MUST NOT be exposed on product APIs or user-facing surfaces.

---

## 19. Threshold Calibration (Governance Safe)

### 19.1 Policy

Thresholds are computed **per `workflow_id`** using **bounded reference windows** and are **never exposed numerically**.

### 19.2 Engineering Implementation

- **Rolling reference set:** last **N** executions per workflow, **N = 200** by default (configurable; MUST remain bounded).
- **Percentile thresholds (internal numeric use only):**
  - `iteration_high` = **P75** of iteration depth (or equivalent structural signal) over the reference set
  - `iteration_low` = **P25** of iteration depth over the reference set
  - `latency_high` = **P75** of latency over the reference set

All percentile computations are **within a single `workflow_id`** only.

### 19.3 External Exposure

Numeric thresholds MUST NOT appear in API responses or exports.

External exposure is **categories ONLY**, mapped deterministically from internal comparisons:

- **LOW**
- **NORMAL**
- **HIGH**

(Exact mapping rules from internal signals to these labels MUST be specified in implementation specs and remain stable for v1; labels MUST NOT encode raw percentiles or raw threshold values.)

### 19.4 Constraints

- No numeric exposure of thresholds or baselines
- No trend exposure (no time-ordered comparison of categories across periods in v1 product surfaces)
- No cross-workflow comparison of calibration or categories

---

## 20. Minimum Signal Set (Classification Gate)

### 20.1 Rule

**Classification_allowed = TRUE** only if the required signals exist for that execution.

Otherwise classification is not performed and the execution MUST be **SUPPRESSED** (§21).

### 20.2 Minimum Signal Set

**Must include:**

- **Execution boundary:** `start` **and** (`end` **OR** abandonment satisfying §18 boundary / timeout rules)

**AND at least ONE of:**

- **retry visibility** (linkable retry sequences or equivalent structural evidence)
- **step logs** (structural step or stage evidence sufficient for trace integrity)
- **error visibility** (at least one error-class event when an error path exists, aligned with §18 Error Visibility)

### 20.3 Enforcement

- If satisfied → classification allowed (subject to FSC §18 and suppression hierarchy §21).
- If not satisfied → **SUPPRESSED**; no pattern label for that execution in allowed outputs.

---

## 21. Suppression Logic (Explicit)

### 21.1 Hierarchy (evaluate in order)

1. **Missing FSC** → **SUPPRESS**  
2. **Missing minimum signal set** (§20) → **SUPPRESS**  
3. **Ambiguous classification** (deterministic rules yield no single exclusive pattern, or tie-breaking cannot be resolved) → **SUPPRESS**

Later stages MUST NOT override an earlier suppression.

### 21.2 Output format

When suppressed, consumer-visible status MUST be expressible in this shape (field names MAY be nested in existing API envelopes; semantics MUST match):

```json
{
  "status": "SUPPRESSED",
  "reason": "INSUFFICIENT_SIGNAL | INCOMPLETE_EXECUTION | AMBIGUITY"
}
```

**Reason mapping (normative):**

| Condition | `reason` value |
| --- | --- |
| FSC not satisfied (§18) | `INCOMPLETE_EXECUTION` |
| Minimum signal set not satisfied (§20) | `INSUFFICIENT_SIGNAL` |
| Ambiguous classification | `AMBIGUITY` |

---

## 22. Implementation Contract (Non-Negotiable)

- Do **NOT** introduce scoring, ranking, or performance metrics.
- Do **NOT** expose numeric baselines or raw percentile/threshold values on product APIs.
- Do **NOT** add trend logic to v1 product surfaces.
- All rules MUST be **deterministic** and **enforceable** in code and tests.
- All suppression conditions MUST be **explicit** and **ordered** as in §21.

---

## Appendix A — Scope control and repository alignment

### A.1 In Scope (v1)

- execution-level classification (subject to §§18–21)
- workflow-level aggregation
- deterministic rules
- suppression-first outputs

### A.2 Deferred (v2)

- cross-workflow comparison
- trend analysis
- recommendations
- ROI or productivity metrics
- ML-based classification

### A.3 Repository alignment (as of PRD landing)

| PRD surface | Repo notes |
| --- | --- |
| `POST /api/events` | Implemented in `backend/src/app.ts` with `FluencyEventIngestSchema`, RBAC, schema version + forbidden-field middleware. |
| Partner / fluency ingest | `POST /api/ingest` — see `docs/api/ingest.md`. |
| Unified telemetry | `POST /api/ingest/unified-telemetry` (feature-flagged) — `docs/api/ingest-unified-telemetry.md`. |
| `GET /api/observability/:orgId` | **Phase 4** — `docs/api/observability-org.md` (workflow-level aggregates; full `FluencyWindow` set including `90d`/`180d`/`360d`). |
| `GET /api/traces/reconstructed` | **Phase 1–2 internal read** — add `include_signals=true` for per-execution signals + pattern (`docs/api/traces-reconstructed.md`). Not the Phase 4 observability surface. |

Normalization, trace reconstruction, **per-execution signals/patterns** (`include_signals`), **disclosure**, and **workflow-level observability** (`GET /api/observability/:orgId`) are implemented against the in-memory fluency event store. **PRD §16 / §19 alignment:** current code uses `workflow_baseline.ts` with calendar-windowed percentiles; **implementation MUST be brought into conformance** with §18–§21 and §19 (200-execution reference set, categorical external exposure only). **PRD §13:** `execution_lifecycle.ts` exposes `lifecycle` on traces when `include_signals=true` (`state` + `retry_sequence_count`); `PAUSED` / `CANCELLED` reserved until matching event types exist.

---

## Appendix B — Harness and OpenSpec

- **Multi-session loop:** `harness/README.md`, `harness/agent-progress.txt`.
- **Implementation phases:** `prd-phase-01` … `prd-phase-04` in `harness/feature_list.json` — mark `passes` only after verified behavior (tests / evaluator per `docs/agent/EVALUATION.md`).
- **Breaking API, schema, or architecture:** follow `openspec/AGENTS.md` and `harness-004` before implementation.

---

## Document control

| Field | Value |
| --- | --- |
| Version | v1 |
| Last updated | 2026-04-02 |
| Document Owner | Head of Product (AI Platform) |
| Technical Owner | Lead Architect (FluencyTracr) |
| Governance Owner | Compliance / AI Risk Lead |

### Required sign-off

| Role | Sign-off required |
| --- | --- |
| Product | Yes |
| Engineering | Yes |
| Governance | Yes |

The PRD is not operationally binding for production deployment until all three sign-offs are recorded under your organization’s document control process.
