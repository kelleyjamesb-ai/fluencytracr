# Current Slice Contract

- Work item id: `v4-readout-zone-data-test`
- Title: `Test V4 readout zones against retained aggregate data`
- Status: `completed`

## Summary

Test the Workstreams 1-3 artifacts against retained aggregate dogfood CSVs and
record what can be assigned now, what remains held, and what data shape is
needed before strict Scale Candidate assignment is allowed.

## Scope Paths

- `docs/research/V4_READOUT_ZONE_MODEL.md`
- `docs/research/V4_BEHAVIOR_FEATURE_BACKLOG.md`
- `docs/research/V4_VALUE_HYPOTHESIS_MAP.md`
- `docs/research/V4_READOUT_ZONE_DATA_TEST.md`
- `docs/research/V4_NEXT_SPRINT_PLAN.md`
- `docs/research/V4_VALIDATION_PLAN.md`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_all_windows.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_summary.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_by_dimension.csv`
- `README.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- The data test must not authorize customer-facing economic output.
- The data test must not create a score, ranking, maturity label, productivity
  claim, ROI claim, causal claim, prediction claim, or automated economic
  recommendation.
- The data test must preserve the locked canonical event and suppression reason
  sets.
- Value hypotheses must stay downstream of aggregate behavior evidence,
  customer-owned assumptions, and customer-attested aggregate outcomes.
- Derived CSVs must remain aggregate-only and preserve small-cell suppression.

## Planned Checks

- Run docs contract sweep.
- Run semantic drift guard.
- Run V1 governance gates.
- Run diff whitespace check.
- Scan for conflict markers.

## Evaluator Command Profile

- `scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `python3 scripts/ci_v1_governance_gates.py`
- `git diff --check`
- `rg -n "^(<<<<<<<|=======|>>>>>>>)"`

## Evaluator Pass Criteria

- The retained aggregate CSVs have been tested against the zone and hypothesis
  grammar.
- Derived aggregate outputs are saved in `dogfood-output/`.
- The result clearly distinguishes assignable zones from data-shape gaps.
- Guardrails remain explicit: no ROI, no productivity, no customer-facing
  economic output, no rankings, no raw skill names, and no person-level fields.
- Verification commands pass.

## Specialists To Consult

- None for this documentation-only decision slice.

## Next Handoff Note

Completed locally. Tested the zone and hypothesis grammar against retained
aggregate CSVs, saved derived aggregate CSVs, and recorded that strict
`SCALE_CANDIDATE` assignment needs a Velocity x Depth aggregate join before it
can be used.
