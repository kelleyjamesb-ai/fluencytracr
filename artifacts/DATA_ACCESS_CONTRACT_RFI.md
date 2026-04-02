# Glean / platform Data Access Contract — RFI (vendor questionnaire)

**Status:** Template for binding answers from Glean (or internal data-platform owner).  
**Version:** 2026-03-31  
**Audience:** Solutions architect, data platform, security / compliance.

**Canonical copy:** This file under `artifacts/`. Proto names below align with Glean’s open-source `glean_log_entry.proto` family; **export/API/streaming behavior is not implied** until the vendor fills **`[VENDOR]`** cells.

---

## Tag legend

| Tag | Meaning |
| --- | --- |
| **`[VENDOR]`** | Must be answered in writing for *your* deployment (SKU, region, export path). |
| **`[PROTO-HINT]`** | Shape or comment visible in public protos; **not contractual** until **`[VENDOR]`** confirms parity for your pipeline. |

---

## 0. Executive ask (send verbatim)

> We are building **downstream org-level behavioral analytics** that **join** Assistant, workflow, agent, MCP, and governance signals. We need a **written Data Access Contract** for **our deployment** covering **availability** (API / export / stream), **field fidelity** (full / redacted / dropped), **join keys** (stability, reuse, truncation), **time semantics**, **completeness baselines**, **error taxonomy mapping**, **sampling/loss**, **schema evolution**, **privacy impact on joins**, and **tier/deployment variance**. Please respond **per log family** in the attached matrix.

**Log families (per questionnaire):**

- `AssistantLogEntry`
- `WorkflowLogEntry`
- `AgentRunLogEntry`
- `AgentStepLogEntry`
- `AiSecurityLogEntry`
- `McpUsageLogEntry`

---

## 1. Log family availability and field contract

For **each** log family above:

| # | Question | Tag |
| --- | --- | --- |
| 1.1 | Is this family available via **customer-facing API**? Which API / operation? | `[VENDOR]` |
| 1.2 | Is it in **export** (BigQuery / SIEM / Snowflake / S3 / other)? Name pipeline / dataset / table pattern. | `[VENDOR]` |
| 1.3 | Is it **streaming** (webhook / Pub/Sub / Kafka / Kinesis)? Schema, delivery guarantees, ack semantics? | `[VENDOR]` |
| 1.4 | **Field manifest:** per field — **fully available** / **redacted** (method) / **dropped** in *our* export. | `[VENDOR]` |
| 1.5 | Protos annotate scrub methods (e.g. RAW, QUERY, USER_ID, HASH, DOCUMENT_ID) on some paths — **do these match our export row-for-row?** | `[PROTO-HINT]` → confirm `[VENDOR]` |
| 1.6 | **Latency class** per channel: real-time / near real-time (define) / batch (**cadence**: hourly, daily, …). | `[VENDOR]` |
| 1.7 | **Retention** per channel (min/max; legal hold). | `[VENDOR]` |
| 1.8 | **Rate limits**, **quotas**, **sampling**, **throttling under load** — per family if different. | `[VENDOR]` |

**Spreadsheet column suggestion (repeat per family):** `family | api_yes_no | export_yes_no | stream_yes_no | field_manifest_ref | latency | retention | limits_sampling`.

---

## 2. Join integrity

| # | Join | Question | Tag |
| --- | --- | --- | --- |
| 2.1 | `AssistantLogEntry.workflow_run_id` ↔ `WorkflowLogEntry.run_id` | Always true when Assistant is tied to a workflow run? Exceptions? | `[VENDOR]` |
| 2.2 | `WorkflowLogEntry.run_id` ↔ `AgentRunLogEntry.run_id` | Same identifier, same run? When divergent? | `[VENDOR]` |
| 2.3 | `AssistantLogEntry.chat_id` ↔ `WorkflowLogEntry.chat_session_id` | Always aligned? Nullable / missing cases? | `[VENDOR]` |
| 2.4 | Join semantics: **deterministic** / **eventually consistent** / **best-effort**? Max skew? | `[VENDOR]` |
| 2.5 | Measured **% events missing join keys** (by family); **% failed joins** in a reference deployment. | `[VENDOR]` |
| 2.6 | Are IDs **reused**, **regenerated**, **truncated**, or **hashed** in any export? List fields. | `[VENDOR]` |
| 2.7 | Assistant proto comments describe `workflow_run_id` joinable to `WorkflowLogEntry.run_id` — **confirm export preserves both.** | `[PROTO-HINT]` → `[VENDOR]` |

---

## 3. Execution boundary (start / end / terminal state)

| # | Question | Tag |
| --- | --- | --- |
| 3.1 | What **definitively** marks **execution start** for workflow vs agent run vs assistant turn (if distinct)? | `[VENDOR]` |
| 3.2 | What **definitively** marks **execution end**? Single event or derived? | `[VENDOR]` |
| 3.3 | Can **end** be missing (timeout, crash, client disconnect)? How represented downstream? | `[VENDOR]` |
| 3.4 | **Long-running**, **paused**, **user-cancelled** — which status values apply; are statuses **updated** after first emit? | `[VENDOR]` |
| 3.5 | Is `AgentRunLogEntry.run_execution_status` always present? Ever incorrect? Updated post-hoc? | `[VENDOR]` |
| 3.6 | `WorkflowLogEntry` is documented as **N rows per run** (filter `run_id`); `AgentRunLogEntry` carries timestamps, duration fields, `RunExecutionStatus`. | `[PROTO-HINT]` |

---

## 4. Event ordering and time semantics

| # | Question | Tag |
| --- | --- | --- |
| 4.1 | Are timestamps **monotonic** within a `run_id` per family? | `[VENDOR]` |
| 4.2 | Clock sync model across services; **allowed skew**. | `[VENDOR]` |
| 4.3 | Out-of-order delivery: occurs? Reorder key / **sequence numbers**? | `[VENDOR]` |
| 4.4 | **Canonical time** for analytics: ingestion vs event vs service-specific — **per family**. | `[VENDOR]` |
| 4.5 | Measured **% delayed / reordered** (typical enterprise), if available. | `[VENDOR]` |

---

## 5. Completeness and coverage (quantified)

| # | Question | Tag |
| --- | --- | --- |
| 5.1 | **%** workflow runs with observable **start + end** (or equivalent terminal). | `[VENDOR]` |
| 5.2 | **%** with **full step** logs (`WorkflowLogEntry` / `AgentStepLogEntry` as applicable). | `[VENDOR]` |
| 5.3 | **%** with **error** logs when a failure occurred. | `[VENDOR]` |
| 5.4 | **%** Assistant interactions with `workflow_id` / `workflow_run_id` populated. | `[VENDOR]` |
| 5.5 | **%** MCP calls logged; **%** joinable to `workflow_run_id`. | `[VENDOR]` |
| 5.6 | **%** governance / `AiSecurityLogEntry` events captured and exportable. | `[VENDOR]` |

---

## 6. Error semantics

| # | Question | Tag |
| --- | --- | --- |
| 6.1 | **Mapping table:** `AssistantLogEntry.error_type` ↔ API `AssistantErrorDomain` (and codes) ↔ human description. | `[VENDOR]` |
| 6.2 | **Canonical taxonomy** + **versioning** + **deprecation** policy. | `[VENDOR]` |
| 6.3 | **Stability** across releases; **backward compatibility** guarantees. | `[VENDOR]` |
| 6.4 | **Multiple errors** per run: representation (single field, repeated rows, array)? | `[VENDOR]` |
| 6.5 | Logs use string `error_type`; API uses enum domains — **mapping is not defined in protos for consumers.** | `[PROTO-HINT]` |

---

## 7. Governance signal availability (`AiSecurityLogEntry`)

| # | Question | Tag |
| --- | --- | --- |
| 7.1 | Available **externally**: fully / partial / not — per export channel. | `[VENDOR]` |
| 7.2 | If partial: which fields survive (`rule`, `policy_id`, BLOCK/ALLOW, namespace, …)? | `[VENDOR]` |
| 7.3 | Are BLOCK vs ALLOW always explicit or sometimes implicit? | `[VENDOR]` |
| 7.4 | Triggers tied to `run_id`, message, or standalone events? | `[VENDOR]` |
| 7.5 | Proto includes BLOCK/ALLOW style actions, `rule`, `policy_id`, nested validation metadata — **sensitive blocks may be scrubbed from analytics exports** per proto comments. | `[PROTO-HINT]` → `[VENDOR]` |

---

## 8. MCP / tooling semantics

| # | Question | Tag |
| --- | --- | --- |
| 8.1 | Are MCP calls always logged to `McpUsageLogEntry` in *our* export? | `[VENDOR]` |
| 8.2 | Is `workflow_run_id` always populated when the call is workflow-scoped? | `[VENDOR]` |
| 8.3 | **Retries:** separate events, idempotent key, or overwrite? | `[VENDOR]` |
| 8.4 | **Concurrent** tool calls: correlation (trace, ordering)? | `[VENDOR]` |
| 8.5 | Tool failures always surfaced vs sometimes swallowed — when? | `[VENDOR]` |
| 8.6 | `McpUsageLogEntry` includes request/response times, `duration_ms`, status, error codes, workflow ids, trace id (proto). | `[PROTO-HINT]` |

---

## 9. Sampling, filtering, and loss

| # | Question | Tag |
| --- | --- | --- |
| 9.1 | Sampling / rate limits / drops under load — **per family**. | `[VENDOR]` |
| 9.2 | **Size limits**, truncation, field stripping rules. | `[VENDOR]` |
| 9.3 | Tier or customer **restrictions** on log completeness. | `[VENDOR]` |

---

## 10. Schema evolution and stability

| # | Question | Tag |
| --- | --- | --- |
| 10.1 | Frequency of field / enum changes; **versioned** export schema identifier. | `[VENDOR]` |
| 10.2 | **Backward compatibility** window; **deprecation** notice period. | `[VENDOR]` |
| 10.3 | Some proto fields marked deprecated — export may lag proto. | `[PROTO-HINT]` |

---

## 11. Privacy and redaction vs joins

| # | Question | Tag |
| --- | --- | --- |
| 11.1 | Which join keys are ever hashed, rotated, or anonymized per export? | `[VENDOR]` |
| 11.2 | Can redaction **break joins** across tables? Document examples. | `[VENDOR]` |
| 11.3 | Confirm `run_id`, `workflow_id`, and related keys remain **join-stable** in *our* export despite scrub rules. | `[PROTO-HINT]` → `[VENDOR]` |

---

## 12. Multi-session / multi-system workflows

| # | Question | Tag |
| --- | --- | --- |
| 12.1 | Can one logical workflow span multiple `chat_id` / sessions? | `[VENDOR]` |
| 12.2 | Handoff across agents/tools — **parent run** or flat runs only? | `[VENDOR]` |
| 12.3 | Context messages include workflow run and agent trace concepts (trace/span/parent) — **confirm exposure in export.** | `[PROTO-HINT]` |

---

## 13. Ground truth vs system state

| # | Question | Tag |
| --- | --- | --- |
| 13.1 | Does SUCCESS mean pipeline completed vs user-valued task completed? | `[VENDOR]` |
| 13.2 | SUCCESS but user abandons — any distinct signal? | `[VENDOR]` |
| 13.3 | User acceptance / feedback — which families in export? | `[VENDOR]` |

---

## 14. Deployment variability

| # | Question | Tag |
| --- | --- | --- |
| 14.1 | Matrix: SaaS vs VPC vs on-prem × tier × **feature flags** affecting logging. | `[VENDOR]` |
| 14.2 | If publishable: **% customers** with full vs partial telemetry. | `[VENDOR]` |

---

## 15. Acceptance criteria (make answers executable)

Require the vendor to deliver:

1. **Signed matrix** — rows = log families × channels; columns = §1.1–1.8 (or attached spreadsheet).
2. **Join key contract** — explicit §2.1–2.6 answers with **documented exceptions**.
3. **SLA / semantics sheet** — latency, retention, ordering, completeness (or “not measured”).
4. **Error mapping CSV** — `log.error_type` ↔ API domain ↔ description (versioned).
5. **Schema registry pin** — Avro/JSON schema or proto package version for **export** rows.
6. **Change policy** — notice period for breaking changes (e.g. 90 days) and compatibility rules.

---

## 16. Relationship to FluencyTracr first-party telemetry

FluencyTracr’s **unified telemetry** ingest (`docs/contracts/unified-telemetry/README.md`, `docs/api/ingest-unified-telemetry.md`) is a **parallel** path for org-controlled, suppression-safe events. It does **not** replace vendor answers above unless you explicitly **standardize** on first-party emitters for join-critical fields.

---

## Document control

| Field | Value |
| --- | --- |
| Owner | Integration / data platform (fill) |
| Vendor response received | (date) |
| Export path / SKU | (fill) |
| Reviewed by privacy | (yes/no / date) |
