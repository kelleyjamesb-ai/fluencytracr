# Current Slice Contract

- Work item id: `v4-value-realization-strategy-layer-v0`
- Title: `Add V0 value realization strategy routing`
- Status: `completed`

## Summary

Add the V0 strategy-routing layer that turns aggregate FluencyTracr zones into
human-reviewed value-realization strategy postures, CFO value questions, and
required monetary-value evidence without calculating dollars or ROI.

## Scope Paths

- `docs/research/V4_VALUE_REALIZATION_STRATEGY_LAYER.md`
- `docs/research/V4_VALUE_HYPOTHESIS_MAP.md`
- `docs/research/V4_VELOCITY_DEPTH_ZONE_TEST.md`
- `docs/research/V4_NEXT_SPRINT_PLAN.md`
- `docs/research/V4_VALIDATION_PLAN.md`
- `dogfood-output/V4_RESEARCH_EXPORTS.md`
- `dogfood-output/v4-value-realization-strategy/v4_value_realization_strategy_summary.csv`
- `tests/dogfood/test_velocity_double_count.py`
- `README.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Strategy routing must not become automated recommendations.
- CFO value questions must not become monetary value claims.
- The layer must not calculate ROI, expected savings, productivity lift,
  causality, prediction, ranking, or customer-facing economic output.
- Suppressed or held rows must not be upgraded.
- The retained strategy CSV must remain aggregate-only and avoid raw user,
  email, prompt, transcript, action, event, or skill-name fields.

## Planned Checks

- Run the targeted dogfood strategy/SQL contract test.
- Run docs contract sweep.
- Run semantic drift guard.
- Run V1 governance gates.
- Run diff whitespace check.
- Scan for conflict markers.
- Scan generated CSV headers for forbidden raw fields.

## Evaluator Command Profile

- `.venv/bin/python -m pytest tests/dogfood/test_velocity_double_count.py -q`
- `scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `python3 scripts/ci_v1_governance_gates.py`
- `git diff --check`
- `rg -n "^(<<<<<<<|=======|>>>>>>>)"`

## Evaluator Pass Criteria

- The strategy layer maps zones to strategy posture, value mechanism, CFO value
  question, required outcome evidence, required customer-owned assumptions, and
  blocked claims.
- The retained strategy CSV is saved in `dogfood-output/`.
- The layer explicitly blocks monetary value calculation in V0.
- Guardrails remain explicit: no ROI, no productivity, no customer-facing
  economic output, no rankings, no raw skill names, and no person-level fields.
- Verification commands pass.

## Specialists To Consult

- None for this research-only strategy-routing slice.

## Next Handoff Note

Completed locally. V0 maps stable strategy rows from the retained Velocity x
Depth summary: 12 scale-and-measure, 6 coach/redesign, 3 study/package, 92
repair-trust-loop, and 3 hold/no-interpretation rows across all three fixed
windows. Proceed next to the team-demo artifact only after review.
