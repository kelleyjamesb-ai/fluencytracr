# Current Slice Contract

- Work item id: `v4-velocity-depth-zone-test`
- Title: `Test strict V4 scale-candidate zones with joined Velocity and Depth`
- Status: `completed`

## Summary

Run the next V4 data test requested by the readout-zone data test: produce a
Velocity x Depth Repertoire aggregate export, save the CSVs, and record whether
strict `SCALE_CANDIDATE` rows exist across the three fixed dogfood windows.

## Scope Paths

- `sql/dogfood/velocity_depth_zone_diagnostic.sql`
- `tests/dogfood/test_velocity_double_count.py`
- `docs/research/V4_VELOCITY_DEPTH_ZONE_TEST.md`
- `docs/research/V4_READOUT_ZONE_DATA_TEST.md`
- `docs/research/V4_NEXT_SPRINT_PLAN.md`
- `docs/research/V4_VALIDATION_PLAN.md`
- `dogfood-output/V4_RESEARCH_EXPORTS.md`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_1.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_2.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_3.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_all_windows.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`
- `README.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- The test must not authorize customer-facing economic output.
- The test must not create a score, ranking, maturity label, productivity
  claim, ROI claim, causal claim, prediction claim, or automated economic
  recommendation.
- The test must preserve the locked canonical event and suppression reason
  sets.
- Value hypotheses must stay downstream of aggregate behavior evidence,
  customer-owned assumptions, and customer-attested aggregate outcomes.
- Derived CSVs must remain aggregate-only and preserve small-cell suppression.
- Suppressed rows may redact metric values and must not be reconstructed.

## Planned Checks

- Run the targeted dogfood SQL contract test.
- Run docs contract sweep.
- Run semantic drift guard.
- Run V1 governance gates.
- Run diff whitespace check.
- Scan for conflict markers.
- Scan generated CSV headers for forbidden raw fields.

## Evaluator Command Profile

- `python3 -m unittest tests.dogfood.test_velocity_double_count`
- `scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `python3 scripts/ci_v1_governance_gates.py`
- `git diff --check`
- `rg -n "^(<<<<<<<|=======|>>>>>>>)"`

## Evaluator Pass Criteria

- The Velocity x Depth diagnostic emits aggregate-only joined rows.
- The three fixed-window CSVs plus all-window and safe-summary outputs are
  retained in `dogfood-output/`.
- The result clearly distinguishes strict scale candidates from shallow
  adoption, focused expert use, trust gaps, and suppressed rows.
- Guardrails remain explicit: no ROI, no productivity, no customer-facing
  economic output, no rankings, no raw skill names, and no person-level fields.
- Verification commands pass.

## Specialists To Consult

- None for this research-only decision slice.

## Next Handoff Note

Completed locally. The joined Velocity x Depth export found 12 stable strict
`SCALE_CANDIDATE` aggregate rows across all three fixed windows, while trust
gaps remained the dominant hold state. Proceed next to the team-demo artifact
from Workstream 4 only after review.
