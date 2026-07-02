## 1. Decision artifacts (post-approval)

- [ ] 1.1 Add the confidence-engine observation requirement statement fixture
      and schema (consumer identity, milestone days, admission metadata
      fields, blocked-output posture) following the existing decision-artifact
      conventions in `scripts/`.
- [ ] 1.2 Add the confidence-engine series read-path decision runner emitting
      `SERIES_PERSISTENCE_AUTHORIZED_FOR_INTERNAL_CONFIDENCE_OBSERVATIONS` when
      all prerequisites hold, `HOLD_FOR_CONFIDENCE_OBSERVATION_REQUIREMENT`
      when the requirement statement is missing or unproven, and
      `REJECTED_FOR_BOUNDARY_LEAKAGE` on any boundary violation.
- [ ] 1.3 Extend `run_ai_value_durable_series_read_path_decision.mjs` so the
      customer-history hold state and the confidence authorization state
      coexist without weakening the customer-history decision.
- [ ] 1.4 Extend `run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs`
      to accept the confidence read-path proof as an alternative READY path.

## 2. Boundary enforcement

- [ ] 2.1 Keep every existing FALSE feed false except `research_model_feed`,
      which becomes the scoped token `internal_confidence_engine_only`.
- [ ] 2.2 Add validation tests proving any customer-facing, finance, live
      connector, export, route, or UI feed flips the decision to
      `REJECTED_FOR_BOUNDARY_LEAKAGE`.
- [ ] 2.3 Add validation tests proving milestone days other than
      [0, 30, 60, 90, 180, 365], missing admission reason codes, or non-compact
      refs are rejected.

## 3. Governance and hygiene

- [ ] 3.1 Record human approval (decision owner: James Kelley) on this
      proposal before starting section 1.
- [ ] 3.2 Register the new runner/tests without adding bespoke npm scripts if
      a parameterized runner exists by implementation time; otherwise follow
      the current `run:`/`test:` naming convention.
- [ ] 3.3 Update the README capability ledger and `docs/contracts/` alongside
      the decision artifacts, per the PR invariants checklist.
- [ ] 3.4 Run `openspec validate add-ai-value-series-confidence-read-path --strict`
      and the touched validation suites before requesting review.
