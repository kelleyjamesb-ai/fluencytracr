## ADDED Requirements

### Requirement: Optional execution signals on trace read

The server SHALL support `include_signals` on `GET /api/traces/reconstructed` (`true` | `1` | `yes`). When set, each trace in the response SHALL include `signals`, `pattern`, and `pattern_confidence_tier` derived deterministically from stored fluency events for that execution.

#### Scenario: Omitting include_signals preserves Phase 1 shape

- **WHEN** the client does not set `include_signals`
- **THEN** each trace omits `signals`, `pattern`, and `pattern_confidence_tier` (Phase 1 JSON shape only)

---

### Requirement: Mutually exclusive pattern classification

When `include_signals` is set, `pattern` SHALL be exactly one value from `FluencyPatternName`, chosen by evaluating PRD §15.1 priority order (Undertrust Avoidance → Friction Loop → Recovery Maturity → Blind Efficiency → Calibrated Fluency → residual).

#### Scenario: Single verified acceptance is Calibrated Fluency

- **WHEN** an execution has one `ai_output_disposition` with `verification_present: true` and `iteration_depth` 0
- **THEN** `pattern` is `Calibrated Fluency` (assuming no higher-priority rule applies)
