# FluencyTracr v1 — Implementation Blueprint

**Status:** build-ready planning artifact (PRD → code).  
**Hard rejects:** model-based “smart” classification, user scoring, rankings, ROI, trend narratives, probabilistic/ML classifiers on product paths, semantic verification (NLU). Only **deterministic structural rules**, **suppression-first**, **workflow-level** consumer outputs.

---

## 1. Architecture Summary

FluencyTracr v1 is a **pipeline**: **ingest (append-only)** → **normalize IDs** → **reconstruct trace** → **execution lifecycle** → **FSC gate** → **minimum signal gate** → **structural signal detection** → **per-workflow threshold calibration (internal numeric)** → **deterministic pattern classification (priority list)** → **suppression envelope** → **workflow aggregation** → **REST APIs**.

- **Single unit of analysis:** `(org_id, workflow_id, execution_id)`.
- **Hard gates:** classification runs only if FSC and minimum signal set pass; else **SUPPRESSED** with stable reason codes.
- **Thresholds:** computed per `workflow_id` over a **rolling last N executions (default N=200)**; **never** exposed as numbers; only **LOW / NORMAL / HIGH** buckets on allowed surfaces.
- **Storage:** PostgreSQL (recommended) for canonical events and optional materialized derived rows; **derived views recomputable** from events for audit/replay.
- **Existing repo alignment:** today much logic lives in `backend/src/*.ts` (`trace_engine.ts`, `execution_lifecycle.ts`, `execution_signals.ts`, `workflow_baseline.ts`, `execution_disclosure.ts`, `behavioral_patterns.ts`, `observability_aggregate.ts`). **Target layout** below modules those concerns without mandating a big-bang move—migrate incrementally.

---

## 2. Repository Structure

Proposed **target** tree under `backend/src/` (TypeScript, Node). Shared contracts in `shared/` (Zod + TS types) stay the single source for API validation.

```text
backend/src/
  domain/
    canonicalEvent.ts       # CanonicalEvent, validation constants
    execution.ts            # Execution, ExecutionLifecycleState, reducers
    trace.ts                # Trace, RetrySequence, ToolCallGroup
    signalProfile.ts        # ExecutionSignals + internal latency bucket
    pattern.ts              # PatternName enum, PatternClassification
    suppression.ts          # SuppressionResult, reason codes, hierarchy types
    aggregation.ts          # WorkflowAggregate, pattern counts, disclosure rollup

  services/
    ingest/
      IngestService.ts              # validate → dedupe key → append
      EventNormalizer.ts            # map source IDs → execution_id
    trace/
      TraceReconstructionService.ts # group, sort, retries, tool/step grouping
      TraceOrderValidator.ts        # fail-closed when order impossible
    lifecycle/
      ExecutionLifecycleReducer.ts  # state machine (wraps computeExecutionLifecycle)
    gates/
      FscEligibilityService.ts
      MinimumSignalGateService.ts
    signals/
      SignalDetectionService.ts     # iteration, verification, recovery, abandonment, latency, disposition
      SignalRegistry.ts             # PRD §17-style requires map (docs + optional checks)
    calibration/
      ThresholdCalibrationService.ts # rolling-200, P25/P75, internal only
      WorkflowThresholdStore.ts      # read/write calibrations (DB or recompute)
    classification/
      PatternClassificationService.ts # deterministic priority, mutual exclusion
    suppression/
      SuppressionPipeline.ts        # ordered hierarchy, single entry for traces API
    aggregation/
      WorkflowAggregationService.ts   # workflow_id bucket only

  api/
    routes/
      events.ts             # POST /api/events
      observability.ts      # GET /api/observability/:orgId
      internal/
        health.ts
        thresholdsRefresh.ts   # optional; admin-gated; no numeric leakage in response
    middleware/
      rbac.ts
      schemaVersion.ts
      forbiddenFields.ts    # reject scoring/ranking/trend fields at boundary

  db/
    migrations/
      001_canonical_events.sql
      002_derived_optional.sql
    repositories/
      EventRepository.ts
      AggregateRepository.ts
      ThresholdRepository.ts
      SuppressionAuditRepository.ts

  pipeline/
    ExecutionAnalysisPipeline.ts    # wires gates → signals → calibration → classify → suppress → (per trace)

  tests/
    unit/...
    integration/...
    contract/...

shared/
  schemas/
    canonical_event.schema.json
    fluency_event.zod.ts     # if not already present
```

**Responsibility cheat-sheet**

| File | Responsibility |
|------|----------------|
| `domain/*` | Pure types + enums; no I/O |
| `services/ingest` | Parse, strict schema, reject unknown fields, append-only write |
| `services/trace` | Deterministic ordering, retry links, grouping |
| `services/gates` | FSC + min signal; no classification side effects |
| `services/signals` | Structural detectors only |
| `services/calibration` | Rolling window stats; category mapping |
| `services/classification` | Fixed priority table; tie → ambiguity → suppress |
| `services/suppression` | Hierarchy; reason codes |
| `services/aggregation` | Counts/distributions; cohort suppression |
| `pipeline/*` | Orchestration for batch/replay and API handlers |

**Explicit:** Do **not** route product classification through `backend/src/inference/*` (ML drivers, semantic confidence). If those files remain for experiments, they must be **feature-flagged off** and **absent** from `GET /api/observability` and governed trace payloads.

---

## 3. Domain Models

```typescript
// domain/canonicalEvent.ts — ingest envelope (names align with PRD + existing Fluency types)
export interface CanonicalEvent {
  event_id: string;              // unique ingest id (UUID)
  event_name: string;            // maps to event_type family
  event_version: string;         // semver or int string
  org_id: string;
  workflow_id: string;
  execution_id: string;        // or derived pre-ingest by Normalizer
  timestamp: string;             // ISO-8601 UTC
  actor_type: "human" | "agent" | "system" | "integration";
  context: Record<string, unknown>; // bounded keys per event_name; validated by Zod per type
  metadata: Record<string, unknown>; // same; no PII scores
}

// domain/execution.ts
export interface Execution {
  org_id: string;
  workflow_id: string;
  execution_id: string;
  event_ids: string[];         // append order as ingested
  created_at: string;
  /** Derived, recomputed */
  lifecycle_state: ExecutionLifecycleState;
}

export type ExecutionLifecycleState =
  | "INIT" | "ACTIVE" | "RETRY" | "PAUSED" | "COMPLETED" | "ERRORED" | "ABANDONED" | "CANCELLED";

// domain/trace.ts
export interface Trace {
  org_id: string;
  workflow_id: string;
  execution_id: string;
  ordered_event_ids: string[];
  retry_sequences: RetrySequence[];
  tool_call_groups: ToolCallGroup[];
  step_groups: StepGroup[];
}

export interface RetrySequence {
  failure_event_id: string;
  subsequent_event_id: string;
}

export interface ToolCallGroup {
  root_event_id: string;
  member_event_ids: string[];
}

export interface StepGroup {
  label: string;                 // structural label from event schema, not NLU
  member_event_ids: string[];
}

// domain/signalProfile.ts — internal to pipeline; not a “score”
export interface SignalProfile {
  iteration_depth: number;
  verification_present: boolean;    // structural: event types / flags only
  recovery_present: boolean;
  abandonment_present: boolean;
  /** Internal span; never expose raw ms on v1 product API */
  latency_ms: number | null;
  /** Structural disposition enum from last relevant event */
  disposition: "accepted" | "edited" | "rejected" | "abandoned" | null;
  /** Internal bucket from calibration; API exposes category only where allowed */
  latency_category: "LOW" | "NORMAL" | "HIGH" | null;
  iteration_category: "LOW" | "NORMAL" | "HIGH" | null;
  event_count: number;
  has_ai_usage: boolean;
}

// domain/pattern.ts
export type PatternName =
  | "undertrust_avoidance"
  | "friction_loop"
  | "recovery_maturity"
  | "blind_efficiency"
  | "calibrated_fluency";

export interface PatternClassification {
  pattern: PatternName | null;    // null when suppressed before classify or ambiguity
  matched_rule_id: string;          // stable id, e.g. "PAT-UT-01"
  /** No confidence score — optional tier only if structural (e.g. data completeness) */
  explain: readonly string[];       // deterministic reasons, not prose generation
}

// domain/suppression.ts
export type SuppressionReasonCode =
  | "INCOMPLETE_EXECUTION"   // FSC fail
  | "INSUFFICIENT_SIGNAL"    // min signal fail
  | "AMBIGUITY";             // classification tie / no exclusive winner

export interface SuppressionResult {
  status: "ALLOWED" | "SUPPRESSED";
  reason?: SuppressionReasonCode;
  /** Ordered list of gate failures for audit (internal) */
  failed_checks?: readonly string[];
}

// domain/aggregation.ts
export interface WorkflowAggregate {
  org_id: string;
  workflow_id: string;
  window: "7d" | "30d" | "90d" | "180d" | "360d"; // as per product contract
  total_executions: number;
  disclosed_executions: number;
  suppressed_executions: number;
  /** Counts only — no ranking */
  pattern_counts: Partial<Record<PatternName, number>>;
  suppression_reason_counts: Partial<Record<SuppressionReasonCode, number>>;
  /** Cohort-level disclosure flags only */
  disclosure: {
    suppression_applied: boolean;
    suppression_reasons: string[]; // e.g. insufficient_population — not per-user
  };
}
```

---

## 4. Event Schema

**TypeScript interface** (ingest superset; per-`event_name` Zod stricter):

```typescript
export interface CanonicalEventPayload {
  event_name: string;
  event_version: string;
  org_id: string;
  workflow_id: string;
  execution_id?: string;
  run_id?: string;
  workflow_run_id?: string;
  timestamp: string;
  actor_type: string;
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
```

**JSON Schema shape (conceptual)** — root `allOf`: base + `oneOf` per `event_name` variant; **additionalProperties: false** on each variant.

**Validation rules**

1. **Unknown top-level fields:** **reject** (400) with stable error code `UNKNOWN_FIELDS`.
2. **Unknown `context` / `metadata` keys:** reject per event schema (strict object).
3. **Types:** enforce string formats for ids, ISO timestamp.
4. **Immutability:** accepted row in `canonical_events` is **never updated**; corrections = new event with correction lineage in metadata if needed.
5. **Append-only:** deletes forbidden from app layer; DB role without DELETE on events table.
6. **`event_version`:** mismatch with server-supported set → 400 `UNSUPPORTED_EVENT_VERSION`.
7. **Forbidden fields** (governance): any field matching middleware denylist (e.g. `score`, `rank`, `roi`, `trend_delta`) → 400.

---

## 5. State Machine

**Enum** — same as `ExecutionLifecycleState` above.

**Constants**

```typescript
export const DEFAULT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_EXECUTION_WINDOW_MS = 24 * 60 * 60 * 1000;
```

**Transition table (event-driven, deterministic)**

Rows: current state; columns: condition (evaluated in order). PAUSED/CANCELLED reserved until explicit events exist.

| State | Condition | Next |
|-------|-----------|------|
| INIT | non-empty ordered events + trace | ACTIVE |
| * | `ai_abandonment` or disposition abandoned | ABANDONED |
| * | terminal success disposition | COMPLETED |
| * | terminal error event / ERRORED disposition | ERRORED |
| ACTIVE | new retry_sequence count > prior | RETRY |
| RETRY | accepted/edited after last retry | ACTIVE or COMPLETED per disposition rules |
| * | open stream + last event older than `inactivity_timeout_ms` | ABANDONED (timeout inference) |
| * | span > `max_execution_window_ms` | ABANDONED or ERRORED per PRD table |
| INIT | empty | INIT |

**Reducer-style pseudocode**

```typescript
function reduceLifecycle(
  ordered: CanonicalEvent[],
  trace: Trace | null,
  now: Date,
  cfg: { inactivity_timeout_ms: number; max_execution_window_ms: number }
): ExecutionLifecycle {
  if (!trace || ordered.length === 0)
    return { state: "INIT", retry_sequence_count: 0 };

  if (hasExplicitAbandonment(ordered)) return { state: "ABANDONED", retry_sequence_count: trace.retry_sequences.length };
  if (hasTerminalError(ordered)) return { state: "ERRORED", retry_sequence_count: trace.retry_sequences.length };
  if (hasCompletedDisposition(ordered)) return { state: "COMPLETED", retry_sequence_count: trace.retry_sequences.length };

  const lastT = lastEventTime(ordered);
  if (lastT && now.getTime() - lastT > cfg.inactivity_timeout_ms)
    return { state: "ABANDONED", retry_sequence_count: trace.retry_sequences.length };

  if (spanExceeds(ordered, cfg.max_execution_window_ms))
    return { state: "ABANDONED", retry_sequence_count: trace.retry_sequences.length }; // or ERRORED if error_signal without terminal

  const r = trace.retry_sequences.length;
  if (r > 0 && !resolvedAfterLastRetry(ordered, trace))
    return { state: "RETRY", retry_sequence_count: r };

  return { state: "ACTIVE", retry_sequence_count: r };
}
```

**Testability:** pure function; inject `now`; golden files per fixture event list.

---

## 6. Trace Reconstruction

**Service:** `TraceReconstructionService`

**Inputs:** `CanonicalEvent[]` for one `(org_id, workflow_id, execution_id)`  
**Outputs:** `Trace | null`, `ordering_valid: boolean`, `ordering_failure_reason?: string`

**Algorithm**

1. Filter events to execution key; reject cross-org mix.
2. Parse timestamps; partition **invalid** timestamps for FSC (do not drop events silently).
3. **Stable sort:** `(timestamp, tie_breaker)` where `tie_breaker` = `event_id` lexicographic (documented).
4. **Retry link:** scan for failure signals; pair with first subsequent event within `RETRY_SEQUENCE_WINDOW_MS` (constant from PRD).
5. **Tool groups:** cluster by `tool_invocation_id` / structural parent id from schema.
6. **Step groups:** cluster by `step_id` / stage field from schema.
7. If **contradictory order** (e.g. equal timestamps for all events and no tie policy) → `ordering_valid: false`.

**Pseudocode**

```typescript
reconstruct(events: CanonicalEvent[]): TraceReconstructionResult {
  assertSameExecution(events);
  const enriched = events.map(parseStrict);
  const sorted = stableSort(enriched, byTimestampThenEventId);
  if (!hasTotalOrder(sorted)) return { trace: null, ordering_valid: false, ordering_failure_reason: "NO_TOTAL_ORDER" };
  const retries = linkRetries(sorted, RETRY_WINDOW_MS);
  const tools = groupTools(sorted);
  const steps = groupSteps(sorted);
  return {
    trace: { ...ids, ordered_event_ids: sorted.map(e => e.event_id), retry_sequences: retries, tool_call_groups: tools, step_groups: steps },
    ordering_valid: true
  };
}
```

**Failure behavior:** downstream FSC marks **temporal/trace integrity** failed; classification **not** run; suppression reason `INCOMPLETE_EXECUTION` when FSC fails on ordering.

---

## 7. FSC Gate

**Service:** `FscEligibilityService`

```typescript
interface FscResult {
  eligible: boolean;
  failed_checks: string[];
}
```

**Checks (all must pass for `eligible: true`)**

1. **boundary_integrity:** inferred `start` present; terminal **COMPLETED|ERRORED|CANCELLED** or **ABANDONED** (explicit or timeout rule).
2. **temporal_integrity:** ≥95% events have valid timestamps; ordering reconstructable (see trace).
3. **trace_integrity:** at least one trace segment; retries linkable when failure events exist.
4. **error_visibility:** if any error-class event in stream, at least one `error_event` (or schema-equivalent) present.

**Pseudocode**

```typescript
function evaluateFsc(trace: Trace, ordered: CanonicalEvent[], lifecycle: ExecutionLifecycle): FscResult {
  const failed: string[] = [];
  if (!boundaryOk(lifecycle)) failed.push("boundary_integrity");
  if (!temporalOk(ordered)) failed.push("temporal_integrity");
  if (!traceOk(trace)) failed.push("trace_integrity");
  if (!errorVisibilityOk(ordered)) failed.push("error_visibility");
  return { eligible: failed.length === 0, failed_checks: failed };
}
```

**Hard gate:** `PatternClassificationService` **must not** run if `!eligible`.

---

## 8. Minimum Signal Gate

**Service:** `MinimumSignalGateService`

```typescript
interface MinSignalResult {
  passes: boolean;
  failed_checks: string[];
}
```

**Rule**

- **Execution boundary:** start + (end OR abandonment per §18).
- **AND at least one of:**
  - retry visibility: `trace.retry_sequences.length > 0` OR structural retry events
  - step logs: `step_groups` non-empty OR step-typed events
  - error visibility: same structural rule as FSC subset

**Pseudocode**

```typescript
function evaluateMinSignal(trace: Trace, ordered: CanonicalEvent[], lifecycle: ExecutionLifecycle): MinSignalResult {
  const failed: string[] = [];
  if (!hasExecutionBoundary(lifecycle)) failed.push("execution_boundary");
  const hasChannel = hasRetryVisibility(trace, ordered) || hasStepLogs(trace, ordered) || hasErrorVisibility(ordered);
  if (!hasChannel) failed.push("minimum_signal_channel");
  return { passes: failed.length === 0, failed_checks: failed };
}
```

**Suppression:** if fail after FSC passed → `INSUFFICIENT_SIGNAL`.

---

## 9. Signal Detection

**Service:** `SignalDetectionService`  
**Input:** `Trace`, ordered events, optional `Phase2Thresholds` (internal)  
**Output:** `SignalProfile`

| Signal | Required inputs | Rule |
|--------|-----------------|------|
| `iteration_depth` | trace.retry_sequences | `iteration_depth = retry_sequences.length` (align with PRD §14.1) |
| `verification_present` | ordered events | true if `verification_signal` event OR `ai_output_disposition.verification_present === true` |
| `recovery_present` | ordered, trace | true if `ai_recovery_loop.cycles>0` OR retry followed by accepted/edited disposition |
| `abandonment_present` | ordered | `ai_abandonment` OR disposition abandoned |
| `latency_ms` | ordered | last valid ts − first valid ts; null if invalid |
| `disposition` | ordered | last `ai_output_disposition.disposition` in order |

**Categories (internal → external)**

```typescript
function mapIterationCategory(depth: number, t: Phase2Thresholds): "LOW" | "NORMAL" | "HIGH" {
  if (depth <= t.iteration_low) return "LOW";
  if (depth >= t.iteration_high) return "HIGH";
  return "NORMAL";
}

function mapLatencyCategory(latency_ms: number, t: Phase2Thresholds): "LOW" | "NORMAL" | "HIGH" {
  if (latency_ms >= t.latency_high_ms) return "HIGH";
  // Define LOW as bottom quartile band vs internal reference — deterministic cut from calibration service
  return latency_ms <= t.latency_low_ms ? "LOW" : "NORMAL";
}
```

**Note:** `latency_low_ms` may be P25 internal cutoff — **never** return numeric cutoff in API.

---

## 10. Threshold Calibration

**Service:** `ThresholdCalibrationService`

**Rules**

- Pool events by `workflow_id` only.
- Rolling **last 200 executions** (by last event time), fixed N default, env override.
- Compute P25/P75 on `iteration_depth` and `latency_ms` samples.
- Persist **versioned** calibration row OR recompute on read (CPU tradeoff); **never** expose P25/P75 in JSON responses.

**Storage model**

```typescript
interface WorkflowThresholdCalibrationRow {
  org_id: string;
  workflow_id: string;
  reference_n: number;           // actual count used, <= 200
  computed_at: string;
  iteration_low: number;         // internal
  iteration_high: number;
  latency_high_ms: number;
  latency_low_ms: number;        // internal P25 boundary for bucket
  config_version: string;
}
```

**Update logic:** on new execution terminal event, **invalidate** or enqueue async recompute; read path may use previous snapshot until refresh — document staleness bound.

**Safeguards:** API DTO mapper **strip** all numeric threshold fields; integration tests grep OpenAPI JSON for forbidden keys.

---

## 11. Classification Engine

**Enum** — `PatternName` as in §3.

**Priority (first match wins)**

1. **undertrust_avoidance** — `abandonment_present === true`
2. **friction_loop** — `iteration_category === "HIGH" && latency_category === "HIGH"`
3. **recovery_maturity** — `recovery_present === true`
4. **blind_efficiency** — `iteration_depth === 0 && verification_present === false`
5. **calibrated_fluency** — `iteration_category === "LOW" && verification_present === true`

**Ambiguity:** if no rule matches, or **two rules would match** (should not happen if predicates exclusive—verify in tests), return **no pattern** and let suppression layer emit `AMBIGUITY`.

**Pseudocode**

```typescript
function classify(s: SignalProfile): PatternClassification | null {
  if (s.abandonment_present) return { pattern: "undertrust_avoidance", matched_rule_id: "PAT-UT-01", explain: ["abandonment_present"] };
  if (s.iteration_category === "HIGH" && s.latency_category === "HIGH")
    return { pattern: "friction_loop", matched_rule_id: "PAT-FL-01", explain: ["iter_high", "lat_high"] };
  if (s.recovery_present) return { pattern: "recovery_maturity", matched_rule_id: "PAT-RM-01", explain: ["recovery_present"] };
  if (s.iteration_depth === 0 && !s.verification_present)
    return { pattern: "blind_efficiency", matched_rule_id: "PAT-BE-01", explain: ["no_retry", "no_verification"] };
  if (s.iteration_category === "LOW" && s.verification_present)
    return { pattern: "calibrated_fluency", matched_rule_id: "PAT-CF-01", explain: ["iter_low", "verification_present"] };
  return null;
}
```

**Constraint:** exactly **one** pattern or **suppressed** — enforced in `SuppressionPipeline`.

---

## 12. Suppression Engine

**Service:** `SuppressionPipeline`

**Invocation order**

1. Trace reconstruction → if invalid order, treat as FSC failure (temporal/trace integrity).
2. `evaluateFsc` → if fail → `{ status: "SUPPRESSED", reason: "INCOMPLETE_EXECUTION", failed_checks }`
3. `evaluateMinSignal` → if fail → `{ status: "SUPPRESSED", reason: "INSUFFICIENT_SIGNAL" }`
4. `SignalDetectionService` + calibration
5. `classify` → if `null` → `{ status: "SUPPRESSED", reason: "AMBIGUITY" }`
6. Else `{ status: "ALLOWED" }` and attach pattern + **internal** signal payload policy (strip for external tier)

**Interface**

```typescript
interface GovernedExecutionView {
  execution_id: string;
  workflow_id: string;
  suppression: SuppressionResult;
  pattern: PatternName | null;
  /** Omitted or null when SUPPRESSED */
  signals_public?: never; // use explicit DTO for API
}
```

**Audit:** append row to `suppression_audit_log` with reason + `failed_checks` (internal).

---

## 13. Aggregation Layer

**Service:** `WorkflowAggregationService`

**Logic**

- Input: set of `GovernedExecutionView` for `(org_id, workflow_id, window)`.
- Count `total_executions`, `suppressed_executions`, `disclosed_executions`.
- **pattern_counts:** sum ALLOWED only.
- **suppression_reason_counts:** bucket suppressed by reason.
- **Cohort suppression:** if population &lt; k (e.g. k=5), suppress **entire** aggregate slice per existing product rules — no per-execution leak.

**API-ready shape (sketch)**

```typescript
interface ObservabilityOrgResponse {
  org_id: string;
  windows: Record<string, WorkflowWindowAggregate>;
}

interface WorkflowWindowAggregate {
  workflow_id: string;
  total_executions: number;
  disclosed_executions: number;
  suppression: { applied: boolean; reasons: string[] };
  pattern_distribution: Partial<Record<PatternName, number>>;
  // explicitly NO: trends, ranks, scores, raw thresholds
}
```

---

## 14. API Contracts

### POST /api/events

- **Request:** body = `CanonicalEventPayload` (strict).
- **201:** stored; returns `{ event_id, accepted: true }`.
- **400:** validation error with `code`, `details[]`.
- **401/403:** RBAC.
- **409:** optional dedupe conflict on `event_id`.

### GET /api/observability/:orgId

- **Query:** `window`, optional `workflow_ids[]` filter (must not enable cross-workflow comparison narratives in UI—API still per-workflow keys).
- **200:** `ObservabilityOrgResponse` — only workflow-level fields; categories not raw numbers.
- **Suppression:** when cohort rules apply, return rollup with `suppression.applied: true` and allowed reasons only.

### Internal (optional)

- `POST /internal/workflows/:workflowId/thresholds/refresh` — **admin**; response **no numerics**; `{ ok: true, workflow_id, computed_at }`.
- `GET /health` — liveness.
- `GET /internal/audit/suppression` — support only; paginated; no external product use.

---

## 15. Storage Design

| Table | PK | Indexes | Mutable? |
|-------|-----|---------|----------|
| `canonical_events` | `event_id` | `(org_id, workflow_id, execution_id, timestamp)`, `(org_id, ingested_at)` | Append-only |
| `executions` | `(org_id, execution_id)` | `(org_id, workflow_id, last_event_at)` | Mutable metadata only (last_event_at) |
| `execution_derived` (optional) | `(org_id, execution_id)` | `(org_id, workflow_id)` | Recomputable cache |
| `trace_cache` (optional) | same | — | Recomputable |
| `signal_profiles` (optional) | same | — | Recomputable |
| `classifications` (optional) | same | — | Recomputable |
| `workflow_aggregates` | `(org_id, workflow_id, window, as_of_hour)` | org_id | Snapshot; immutable per version |
| `workflow_threshold_calibrations` | `(org_id, workflow_id, config_version)` | — | Insert new version; no update |
| `suppression_audit_log` | `id` UUID | `(org_id, execution_id, at)` | Append-only |

**Recomputable:** traces, signals, classifications from `canonical_events` only.

---

## 16. Testing Plan

| Area | File(s) | Cases |
|------|---------|-------|
| Schema | `shared/tests/canonical_event.schema.test.ts` | valid/invalid variants, unknown fields, version mismatch |
| State machine | `backend/src/tests/execution_lifecycle.test.ts` | each transition, timeouts, retry edge cases |
| Trace | `backend/src/tests/trace_reconstruction.test.ts` | ordering ties, retry window, impossible order |
| FSC | `backend/src/tests/fsc_eligibility.test.ts` | each failed_check independently |
| Min signal | `backend/src/tests/min_signal_gate.test.ts` | boundary-only fail, channel-only fail |
| Signals | `backend/src/tests/signal_detection.test.ts` | structural verification only; no semantic fixtures |
| Calibration | `backend/src/tests/threshold_calibration.test.ts` | N=200 cap, P25/P75 math, no leak in DTO |
| Classification | `backend/src/tests/pattern_classification.test.ts` | priority order, mutual exclusion, ambiguity |
| Suppression | `backend/src/tests/suppression_pipeline.test.ts` | hierarchy order, reason codes |
| API | `backend/src/tests/observability_api.test.ts` | response shape snapshot; forbidden keys |
| Negative | `tests/adversarial/ingest_malformed.json` | large payloads, type confusion |
| Governance regression | `tests/governance/no_numeric_thresholds.test.ts` | snapshot OpenAPI + sample responses |

---

## 17. Build Phases

| Phase | Goal | Modules | Done criteria |
|-------|------|---------|----------------|
| **1** | Schemas + ingestion | `shared/schemas`, `services/ingest`, `db/migrations/001` | POST /api/events strict; DB append-only |
| **2** | Execution + trace | `trace`, `lifecycle` | Reducer + reconstruction tests green |
| **3** | FSC + min signal | `gates/*` | All FSC/min-signal tests; pipeline stops before classify |
| **4** | Signals + calibration | `signals`, `calibration`, DB thresholds | Rolling-200 calibration; categories internal |
| **5** | Classification + suppression | `classification`, `suppression` | Priority rules + ambiguity → SUPPRESS |
| **6** | Aggregation + API | `aggregation`, `api/routes/observability` | Contract tests; no forbidden fields |
| **7** | Hardening | tests, audit log, perf | Full `verify.sh`; governance regression suite |

**Dependencies:** linear 1→2→3→4→5→6; 7 parallelizes tests once 6 stable.

---

*End of blueprint.*
