# FluencyTracr — Product Requirements Document (PRD v1)

**Status:** Product definition (requirements).  
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

### 6.6 Governance + Suppression Layer

**Rules:**

- default: suppress if unsafe
- no individual-level outputs
- no ranking or scoring
- no longitudinal narratives

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
- thresholds defined per workflow
- no probabilistic classification

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

## 18. Open Questions

1. What % of executions meet full state coverage?
2. How are workflow-specific thresholds calibrated without trend exposure?
3. What is the minimum signal set required for classification?

---

## Appendix A — Repository alignment (as of PRD landing)

| PRD surface | Repo notes |
| --- | --- |
| `POST /api/events` | Implemented in `backend/src/app.ts` with `FluencyEventIngestSchema`, RBAC, schema version + forbidden-field middleware. |
| Partner / fluency ingest | `POST /api/ingest` — see `docs/api/ingest.md`. |
| Unified telemetry | `POST /api/ingest/unified-telemetry` (feature-flagged) — `docs/api/ingest-unified-telemetry.md`. |
| `GET /api/observability/:orgId` | **Phase 4** — `docs/api/observability-org.md` (workflow-level aggregates; `30d`/`60d` windows). |
| `GET /api/traces/reconstructed` | **Phase 1–2 internal read** — add `include_signals=true` for per-execution signals + pattern (`docs/api/traces-reconstructed.md`). Not the Phase 4 observability surface. |

Normalization, trace reconstruction, **per-execution signals/patterns** (`include_signals`), **disclosure**, and **workflow-level observability** (`GET /api/observability/:orgId`) are implemented against the in-memory fluency event store. Workflow-relative numeric baselines (PRD §16) for thresholds are **not** wired yet. Full execution state machine (§13) remains **future** work.

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
| Last updated | 2026-03-31 |
| Owner | Product / principal architect (TBD) |
