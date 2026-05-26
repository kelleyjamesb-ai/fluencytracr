# Current Slice Contract

- Work item id: `v4-promote-behavior-cohort-axes`
- Title: `Promote Velocity and Depth Repertoire behavior-cohort axes`
- Status: `completed`

## Summary

Promote the saved V4 behavior-cohort joint-distribution result into a durable
research decision: Velocity band and Depth Repertoire band are internal
behavior-cohort axes for Glean dogfood portfolio review. AGENT delegation and
Skill Read presence remain context-only. Economic interpretation remains
limited to non-dollarized value-investigation routing.

## Scope Paths

- `docs/research/V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md`
- `docs/research/V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md`
- `docs/research/V4_DATA_ANALYSIS_CLOSEOUT.md`
- `docs/research/V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md`
- `docs/research/V4_VALIDATION_PLAN.md`
- `docs/research/V4_CLOSEOUT_DECISION.md`
- `docs/research/V4_GLEAN_DOGFOOD_DECISION.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- The promotion must not authorize customer-facing V4 economic output.
- The promotion must not convert Velocity or Depth into productivity,
  maturity, ROI, ranking, or prediction claims.
- Skill Read presence and AGENT delegation must remain context-only.
- Economic suggestions must remain investigation routing, not dollarized
  recommendations.

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

- Promotion decision is documented and linked from the governing V4 research
  docs.
- Guardrails remain explicit: no ROI, no productivity, no customer-facing
  economic output, no rankings, no raw skill names, no org metadata segments.
- Verification commands pass.

## Specialists To Consult

- None for this documentation-only decision slice.

## Next Handoff Note

Completed locally. Velocity band and Depth Repertoire band are promoted as
internal aggregate behavior-cohort axes. AGENT delegation and Skill Read
presence remain context-only, and economic suggestions remain limited to
non-dollarized investigation routing.
