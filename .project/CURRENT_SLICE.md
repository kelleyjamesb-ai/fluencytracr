# Current Slice Contract

- Work item id: `v4-next-sprint-plan`
- Title: `Plan next V4 operating readout sprint`
- Status: `completed`

## Summary

Create a bounded next-sprint plan that moves from aggregate AI operating
fluency evidence to non-dollarized economic value hypotheses. The plan must be
usable for team presentation and future client-pilot framing while preserving
all current V1-V4 governance boundaries.

## Scope Paths

- `docs/research/V4_NEXT_SPRINT_PLAN.md`
- `docs/research/V4_VALIDATION_PLAN.md`
- `README.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- The plan must not authorize customer-facing economic output.
- The plan must not create a score, ranking, maturity label, productivity
  claim, ROI claim, causal claim, or prediction claim.
- The plan must preserve the locked canonical event and suppression reason
  sets.
- The plan must make economic value hypotheses downstream of aggregate
  behavior evidence, not a substitute for outcome validation.

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

- Sprint plan is documented and linked from the relevant V4 planning docs.
- Guardrails remain explicit: no ROI, no productivity, no customer-facing
  economic output, no rankings, no raw skill names, and no person-level fields.
- Verification commands pass.

## Specialists To Consult

- None for this documentation-only decision slice.

## Next Handoff Note

Completed locally. Added the V4 next sprint plan, linked it from the validation
plan and README, and kept the sprint docs/research-first with no runtime,
economic, scoring, ranking, or customer-facing implementation approval.
