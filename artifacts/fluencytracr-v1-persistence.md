# FluencyTracr v1 — Persistence Layer (PostgreSQL + Prisma)

## 1. Persistence Summary

v1 pipeline data is split into **append-only** logs (`canonical_events`, `suppression_audit_log`), **recomputable caches** (`execution_snapshots`, `workflow_aggregates`, `threshold_calibrations`), and **execution-scoped outcomes** (`classification_outcomes`). **Tenant key** is `org_id` (TEXT, no FK to legacy `Organization` so it can match correlation IDs from ingest). **JSONB** is used for payloads, diagnostics, signal profiles, and pattern distributions—**not** for every column. **CHECK** constraints enforce actor types, classification status, suppression reasons, pattern enum, and **ALLOWED ⇒ pattern present / SUPPRESSED ⇒ reason present**. **Triggers** block `UPDATE`/`DELETE` on append-only tables. **No** score, ranking, trend, time-series, or cross-workflow columns on observability-facing aggregates.

**Prisma models:** `V1CanonicalEvent`, `V1ExecutionSnapshot`, `V1ClassificationOutcome`, `V1WorkflowAggregate`, `V1ThresholdCalibration`, `V1SuppressionAuditLog` in `backend/prisma/schema.prisma`.

**Applied migration:** `backend/prisma/migrations/20260402180000_fluencytracr_v1_persistence/migration.sql`.

---

## 2. Table Design

| Table | Role | Mutability |
|-------|------|------------|
| `canonical_events` | Source of truth for ingest + replay | Append-only (trigger) |
| `execution_snapshots` | Cached derived execution state | Upsert / rebuild from events |
| `classification_outcomes` | Final ALLOWED/SUPPRESSED + pattern | Upsert per `(org_id, execution_id)` |
| `workflow_aggregates` | Workflow-level observability cache | Upsert per `(org_id, workflow_id)` |
| `threshold_calibrations` | Internal workflow calibration rows | Insert new version rows |
| `suppression_audit_log` | Governance/audit trail for suppressions | Append-only (trigger) |

---

## 3. Migration File Tree

```
backend/prisma/schema.prisma                          # V1* models appended
backend/prisma/migrations/20260402180000_fluencytracr_v1_persistence/migration.sql
artifacts/fluencytracr-v1-persistence.md              # this document
```

Prisma **does not ship down migrations** in-repo; roll forward with a new migration that reverses changes if needed.

---

## 4–9. SQL (single migration; sections match file order)

The following is **exactly** what is in `migration.sql` (one file, six logical blocks).

### 4. `canonical_events`

- PK `id` UUID, default `gen_random_uuid()`
- `ingest_sequence` `BIGSERIAL` UNIQUE (global monotonic order for replay tie-breaks)
- `actor_type` CHECK ∈ `{human, ai, system}`
- Indexes: `org_id`, `execution_id`, `workflow_id`, `(org_id, workflow_id)`, `(execution_id, event_timestamp, ingest_sequence)`

### 5. `execution_snapshots`

- PK `(org_id, execution_id)`
- Boolean `fsc_eligible`, `minimum_signal_allowed`; ints for trace/retry/source counts; `snapshot_version`
- Index `(org_id, workflow_id)`

### 6. `classification_outcomes`

- PK `(org_id, execution_id)`
- CHECK `status` ∈ `ALLOWED` | `SUPPRESSED`
- CHECK `suppression_reason` null or INCOMPLETE_EXECUTION | INSUFFICIENT_SIGNAL | AMBIGUITY
- CHECK `pattern` null or one of five `BehaviorPattern` strings
- CHECK: ALLOWED ⇒ pattern set + no suppression_reason; SUPPRESSED ⇒ suppression_reason set
- Index `(org_id, workflow_id, processed_at)`

### 7. `workflow_aggregates`

- PK `id` UUID; UNIQUE `(org_id, workflow_id)`
- `prevalence_mode` CHECK ∈ `CATEGORICAL_PREVALENCE` | `NUMERIC_SHARE`
- `pattern_distribution_json` JSONB (no separate trend/rank columns)
- Index `org_id`

### 8. `threshold_calibrations`

- PK `id` UUID; internal numeric thresholds (iterations + `latency_high_threshold` in **milliseconds**)
- Index `(org_id, workflow_id, computed_at)` for latest calibration lookup

### 9. `suppression_audit_log`

- PK `id` UUID; CHECK on `suppression_reason`
- Indexes `(org_id, workflow_id, created_at)`, `(org_id, execution_id)`
- Append-only trigger

**Triggers (both append-only tables):** `fluencytracr_v1_forbid_row_mutation()` raises on UPDATE/DELETE.

---

## 10. Indexing Strategy

| Access pattern | Index |
|----------------|--------|
| Replay events for one execution in deterministic order | `(execution_id, event_timestamp, ingest_sequence)` |
| Org-scoped listing / fan-out | `canonical_events(org_id)`, `workflow_aggregates(org_id)` |
| Workflow aggregate row | UNIQUE `(org_id, workflow_id)` |
| Recent classifications per workflow | `(org_id, workflow_id, processed_at)` |
| Suppression audit by workflow / time | `(org_id, workflow_id, created_at)` |
| Suppression audit by execution | `(org_id, execution_id)` |
| Calibration history | `(org_id, workflow_id, computed_at)` |

---

## 11. Constraint Rules

- **Append-only:** enforced with triggers on `canonical_events` and `suppression_audit_log` (DB-level; not only application discipline).
- **Enums:** `actor_type`, `status`, `suppression_reason`, `pattern` (when non-null), `prevalence_mode` via CHECK (no separate PG ENUM types for v1 tables—easier to extend with a new migration).
- **JSONB:** canonical event body + source identity; diagnostics/signal profile; pattern distribution blob; calibration not in JSON (structured ints).
- **Immutability:** only the two append-only tables are immutable; outcomes/snapshots/aggregates are **logically** recomputable from `canonical_events` + pipeline version (document `snapshot_version` / `calibration_version` for forward compatibility).
- **Retention:** not enforced in SQL—use `COMMENT ON TABLE` + operational policy (partition/archive by `ingested_at` / `created_at` later).
- **No score/rank/trend columns** on any v1 table.

---

## 12. Repository Integration Notes

1. **Apply migration:** `cd backend && DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy` (or `migrate dev` in development).
2. **Generate client:** `npx prisma generate`.
3. **Map domain → rows:**
   - `CanonicalEvent` + raw upstream hints → `event_payload_json` / `source_identity_json`; set `event_timestamp` from canonical `timestamp`; `ingest_sequence` assigned by DB.
   - `ExecutionClassificationOutcome` → `classification_outcomes` row; mirror `diagnostics` / `signal_profile` arrays/objects into JSONB.
   - `WorkflowAggregateResult` → single `workflow_aggregates` row; serialize `pattern_distribution` to `pattern_distribution_json`.
4. **Dual-write period:** keep `InMemory*` repos for tests; add `PrismaV1*Repository` classes implementing existing `EventRepository`, `ClassificationRepository`, `WorkflowAggregateRepository` interfaces (translate types; use transactions: insert canonical event → run pipeline → upsert outcome + aggregate).
5. **Append-only:** use `INSERT` only on `canonical_events`; updates fail at DB—surface as 409/500 per API policy.
6. **Suppression audit:** on every SUPPRESSED outcome, `INSERT` into `suppression_audit_log` (same transaction as outcome upsert).
7. **Executive API:** `handleGetObservability` reads **only** `workflow_aggregates` (and must **not** read `threshold_calibrations`, `suppression_audit_log`, or raw `canonical_events`).
8. **Down migrations:** intentionally omitted—ship corrective forward migrations; document breaking changes in migration comments.

---

## TypeScript persistence model (Prisma)

Client symbols: `prisma.v1CanonicalEvent`, `v1ExecutionSnapshot`, `v1ClassificationOutcome`, `v1WorkflowAggregate`, `v1ThresholdCalibration`, `v1SuppressionAuditLog` (actual casing from Prisma: `v1CanonicalEvent` etc.—verify after `prisma generate`).
