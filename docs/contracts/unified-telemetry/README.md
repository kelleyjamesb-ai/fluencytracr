# Unified telemetry event contract (cross-surface)

**Schema family:** `UT_2026_04`  
**Status:** Design artifact — align backend / OpenSpec before enforcement  
**Harness:** This work was scoped with explicit roles (see [Agents / roles](#agents--roles-harness)) and recorded in `harness/agent-progress.txt`.

## Agents / roles (harness)

| Role | Responsibility |
| --- | --- |
| **Principal architect** | Envelope, categories, naming, versioning, streaming mapping (this document + JSON Schema). |
| **Schema evaluator** | Validate every example with `schemas/unified_telemetry/ut_event_union.schema.json`; add CI check when wired to ingest. |
| **Privacy / governance reviewer** | Human gate: confirm no prohibited fields ship to production emitters (`FluencyTracr_V1_Event_Contract.md`, `SCOPE_GUARDRAILS.md`). |
| **Integration owner** | Kafka/Pub/Sub topic strategy, partition keys, idempotent consumer offsets, DLQ policy. |
| **Implementation owner** | Map to `shared/` zod, `/api/ingest`, and EvidenceBundle derivation (follow OpenSpec when changing behavior). |

## Goals

- **Event-driven, append-only** — immutable facts; state is derived downstream.
- **Cross-surface** — chat, agent runtimes, APIs, IDEs share one envelope.
- **No raw sensitive content** — same class of prohibitions as V1 input contract (no prompts, outputs, transcripts, direct identifiers, free-text narrative).
- **Role-based aggregation later** — `role_class` and `function_id` are intentional aggregation keys (org-level policy, not individual surveillance).
- **Streaming-ready** — small JSON records with stable keys for partitioning and correlation.

## Behavioral traceability axes

Each event declares **`trace_axes`**: which downstream derivations this record supports (non-exclusive set):

| Axis | Meaning (metadata-only) |
| --- | --- |
| `iteration` | Multi-step / depth / loop structure (counts, buckets, sequence). |
| `override` | Human or policy superseded an automated path (disposition, policy decision). |
| `recovery` | Corrective loop after failure, rejection, or ambiguity (recovery type, presence). |
| `resolution` | Terminal or stage-closing state for a unit of work (completed, failed, suppressed, escalated). |

Emitters SHOULD populate `trace_axes` honestly; pipelines MAY drop events that omit required axes for a given consumer.

## Compatibility with existing contracts

- **FluencyTracr V1 signal events** (`FT_V1_*`, `schemas/ft_v1_*.schema.json`, `shared/src/fluencyTracrV1Signal.ts`) remain the strict Sentinel/Astra input set.  
- **Partner ingest fluency events** (`ai_output_disposition`, etc., `shared/src/fluencyTracrSchemas.ts`) remain supported for `/api/ingest`.  
- **Unified telemetry (`UT_2026_04`)** is a **superset envelope** for new cross-surface emitters. Map legacy → UT when consolidating (table below).

| Legacy signal | Suggested `event_category` | Notes |
| --- | --- | --- |
| `FT_V1_DISPOSITION_OBSERVED` | `HUMAN_INTERACTION` | disposition + override |
| `FT_V1_ITERATION_DEPTH_OBSERVED` | `HUMAN_INTERACTION` or `AGENT_EXECUTION` | depends on surface |
| `FT_V1_RECOVERY_OBSERVED` | `HUMAN_INTERACTION` or `AGENT_EXECUTION` | `trace_axes` includes `recovery` |
| `FT_V1_VERIFICATION_PRESENCE_OBSERVED` | `HUMAN_INTERACTION` | verification |
| `FT_V1_LATENCY_OBSERVED` | `AGENT_EXECUTION` or `HUMAN_INTERACTION` | surface-specific |
| `FT_V1_ABANDONMENT_OBSERVED` | `OUTCOME` | `resolution` axis |
| Ingest `ai_output_disposition` | `HUMAN_INTERACTION` | map buckets to UT enums |
| Ingest `ai_recovery_loop` | `HUMAN_INTERACTION` / `AGENT_EXECUTION` | recovery axis |

## Event naming convention

```
UT.<CATEGORY>.<PAST_TENSE_VERB>.<STABILITY>
```

- **CATEGORY:** `HUMAN` | `AGENT` | `CONTROL` | `OUTCOME` (short form)  
- **STABILITY:** `V1` until breaking change → `V2`  
- **Example:** `UT.HUMAN.DISPOSITION_RECORDED.V1`

`event_name` in JSON MUST equal this dot-separated string.

## Versioning strategy

| Bump | When |
| --- | --- |
| **Patch** (`UT_2026_04` metadata only) | Docs/clarifications; no JSON Schema change. |
| **Minor** (`UT_2026_05`) | Add optional fields, new enum values, new `event_name` values; old consumers forward-compatible. |
| **Major** (`UT_2027_01`) | Remove/rename fields, change enum meanings, incompatible envelope — new `schema_version` const. |

Emitters MUST send `schema_version`. Consumers MUST reject unknown major versions or run a versioned code path.

## Streaming (Kafka / PubSub) mapping

| Field / header | Use |
| --- | --- |
| **Message key** | `org_id` + `:` + `correlation_id` (stable co-location of a trace) |
| **Headers / attributes** | `schema_version`, `event_category`, `event_name`, `org_id`, `event_id` |
| **Payload** | UTF-8 JSON body validating `ut_event_union.schema.json` |
| **Ordering** | `sequence_no` optional monotonic per `correlation_id` for single-partition streams |

## Required vs optional (envelope)

| Field | Req | Description |
| --- | --- | --- |
| `schema_version` | yes | Const `UT_2026_04` |
| `event_id` | yes | UUIDv4; dedupe key for append-only sinks |
| `event_name` | yes | Dot notation per naming convention |
| `event_category` | yes | `HUMAN_INTERACTION` \| `AGENT_EXECUTION` \| `CONTROL_SECURITY` \| `OUTCOME` |
| `org_id` | yes | Tenant |
| `function_id` | yes | Aggregatable function / product area |
| `role_class` | yes | Coarse role bucket for RBAC aggregation (not individual identity) |
| `ingress_surface` | yes | `CHAT` \| `AGENT_RUNTIME` \| `API` \| `IDE` \| `ASSISTANT` \| `SEARCH` |
| `event_timestamp` | yes | UTC ISO-8601 |
| `window_id` | yes | `YYYY-MM-DD__YYYY-MM-DD` UTC bounds (same as V1) |
| `trace_axes` | yes | Non-empty array of `iteration` \| `override` \| `recovery` \| `resolution` |
| `ambiguity_flag` | yes | boolean |
| `ambiguity_reason_code` | iff flag | Same enum class as V1 where applicable; extensions in schema |
| `correlation_id` | yes | Opaque string linking a behavioral trace |
| `causation_event_id` | no | Prior `event_id` when known |
| `sequence_no` | no | Non-negative integer order within correlation |
| `workflow_id` | no | Opaque workflow/session bucket (no PII) |
| `emitter_version` | no | Semver of emitter SDK |

**Category-specific payloads** MUST live under a single `payload` object (see JSON Schema).

## Example events

### 1. Human interaction

```json
{
  "schema_version": "UT_2026_04",
  "event_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "event_name": "UT.HUMAN.DISPOSITION_RECORDED.V1",
  "event_category": "HUMAN_INTERACTION",
  "org_id": "org_123",
  "function_id": "fn_sales_ops",
  "role_class": "IC",
  "ingress_surface": "CHAT",
  "event_timestamp": "2026-03-31T18:00:00.000Z",
  "window_id": "2026-03-24__2026-03-31",
  "trace_axes": ["override", "resolution"],
  "correlation_id": "corr_a8f3c2",
  "sequence_no": 4,
  "workflow_id": "wf_9z2",
  "ambiguity_flag": false,
  "payload": {
    "disposition": "EDIT",
    "edit_magnitude_bucket": "LIGHT",
    "verification_requested": true
  }
}
```

### 2. Agent execution

```json
{
  "schema_version": "UT_2026_04",
  "event_id": "b1c2d3e4-f5a6-7890-abcd-ef1234567890",
  "event_name": "UT.AGENT.TOOL_STEP_RECORDED.V1",
  "event_category": "AGENT_EXECUTION",
  "org_id": "org_123",
  "function_id": "fn_support",
  "role_class": "IC",
  "ingress_surface": "AGENT_RUNTIME",
  "event_timestamp": "2026-03-31T18:01:12.000Z",
  "window_id": "2026-03-24__2026-03-31",
  "trace_axes": ["iteration", "recovery"],
  "correlation_id": "corr_a8f3c2",
  "causation_event_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sequence_no": 5,
  "ambiguity_flag": false,
  "payload": {
    "agent_run_id": "run_7k2",
    "step_index": 2,
    "tool_class": "RETRIEVAL",
    "attempt_outcome": "SUCCESS",
    "latency_ms": 842
  }
}
```

### 3. Control / security

```json
{
  "schema_version": "UT_2026_04",
  "event_id": "c2d3e4f5-a6b7-8901-cdef-234567890abc",
  "event_name": "UT.CONTROL.POLICY_DECISION_RECORDED.V1",
  "event_category": "CONTROL_SECURITY",
  "org_id": "org_123",
  "function_id": "fn_platform",
  "role_class": "SYSTEM",
  "ingress_surface": "API",
  "event_timestamp": "2026-03-31T18:01:13.500Z",
  "window_id": "2026-03-24__2026-03-31",
  "trace_axes": ["override", "resolution"],
  "correlation_id": "corr_a8f3c2",
  "sequence_no": 6,
  "ambiguity_flag": false,
  "payload": {
    "control_action": "DENY",
    "policy_rule_class": "DATA_CLASSIFICATION",
    "risk_bucket": "HIGH"
  }
}
```

### 4. Outcome

```json
{
  "schema_version": "UT_2026_04",
  "event_id": "d3e4f5a6-b7c8-9012-def3-4567890abcde",
  "event_name": "UT.OUTCOME.WORK_UNIT_RESOLVED.V1",
  "event_category": "OUTCOME",
  "org_id": "org_123",
  "function_id": "fn_sales_ops",
  "role_class": "IC",
  "ingress_surface": "IDE",
  "event_timestamp": "2026-03-31T18:05:00.000Z",
  "window_id": "2026-03-24__2026-03-31",
  "trace_axes": ["resolution", "recovery"],
  "correlation_id": "corr_a8f3c2",
  "workflow_id": "wf_9z2",
  "sequence_no": 12,
  "ambiguity_flag": true,
  "ambiguity_reason_code": "AMB_EVIDENCE_INSUFFICIENT",
  "payload": {
    "outcome_status": "SUPPRESSED",
    "resolution_bucket": "INSUFFICIENT_EVIDENCE",
    "escalation_triggered": false
  }
}
```

## JSON Schema artifacts

Machine-readable definitions: `schemas/unified_telemetry/` (`ut_event_union.schema.json` is the validation entrypoint).

## Next steps (implementation)

1. OpenSpec change if `/api/ingest` or EvidenceBundle derivation changes.  
2. Add zod mirrors in `shared/` and backend validation.  
3. Add CI: validate examples in this README against the union schema (optional script).
