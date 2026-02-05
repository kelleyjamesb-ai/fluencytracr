# LearnAIR_Engable_Tool
This is a way to capture organizational signals on AI Fluency using passive data.

## Scope guardrails
This project intentionally rejects surveillance and scope creep. Please read and follow
the guardrails in [SCOPE_GUARDRAILS.md](SCOPE_GUARDRAILS.md) before proposing changes.

## FluencyTracr V1 Confidence & Signal Layer
The confidence layer enforces inference safety invariants for behavioral signals:
- Outputs are signals, not facts, and are strictly binary: `SURFACE` or `SUPPRESS`.
- Default state is `SUPPRESS`; ambiguity is first-class and always suppressive.
- No content storage or individual attribution is permitted.
- Latency is corroborative only and never triggers surfacing on its own.
- No tunable thresholds or admin overrides are allowed; constants are compiled into code.

Suppression reason codes (one-hot, immutable):
- `INSUFFICIENT_TIME`
- `INSUFFICIENT_VOLUME`
- `NO_CONVERGENCE`
- `BASELINE_UNSTABLE`
- `HIGH_AMBIGUITY`

## Phase 1 Thin Slice — What It Does / Does Not Do
Phase 1 implements a governance-first pipeline that:
- Accepts only canonical Phase 1 events and hard-rejects unknown or forbidden fields.
- Evaluates deterministically to `SURFACE` or `SUPPRESS`, defaulting to suppression.
- Emits a binary decision payload only, with no identifiers, metrics, or narrative fields.

Phase 1 explicitly does not:
- Produce UI, dashboards, reports, or exports.
- Emit counts, trends, deltas, or timestamps.
- Introduce new signals, semantics, or role comparisons.

## GEM Enforcement Map

| GEM Rule | Enforcement Layer |
| --- | --- |
| No Cross-Window Linkage | Evaluation logic |
| No Ordering, Streaks, or Duration | Evaluation logic; CI schema validation |
| No Deltas, Comparisons, or Trends | Evaluation logic; Export/API boundary |
| Binary-Only Executive Visibility | Surfacing layer |
| Suppression-Before-Surfacing | Suppression gate; Surfacing layer |
| Absence-Is-Neutral | Evaluation logic; Surfacing layer |
| Non-Ordinal Pattern Labels | Evaluation logic |
| No Executive Export Enabling Aggregation | Export/API boundary |
| Decision-Support Suppression | Evaluation logic |
| Enforcement On / Off Semantics | CI/config validation |
| Ambiguity Fail-Closed | Ingestion; Evaluation |
| Enforcement Validity Rule | CI |
