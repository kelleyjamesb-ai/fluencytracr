## ADDED Requirements

### Requirement: Execution disclosure on interpretive trace read

When `include_signals` is true on `GET /api/traces/reconstructed`, each trace SHALL include `disclosure` with `state` `ALLOWED` or `SUPPRESSED` and a `reasons` array. When `SUPPRESSED`, `signals`, `pattern`, and `pattern_confidence_tier` SHALL be null.

#### Scenario: Single-event execution is suppressed

- **WHEN** an execution has fewer than the configured minimum event count for disclosure
- **THEN** `disclosure.state` is `SUPPRESSED` and `reasons` includes `insufficient_event_count`, and interpretive fields are null

---

### Requirement: No numeric baseline exposure on trace read

The trace reconstruction response SHALL NOT include workflow baseline percentiles, numeric trend deltas, or cross-workflow comparison fields (PRD §16 alignment for this route).

#### Scenario: Response shape excludes baselines

- **WHEN** the client requests traces with `include_signals=true`
- **THEN** the JSON does not include baseline numeric series or cross-workflow rollup objects
