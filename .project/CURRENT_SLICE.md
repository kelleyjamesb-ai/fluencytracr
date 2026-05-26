# Current Slice Contract

- Work item id: `v4-readout-workstreams-1-3`
- Title: `Define V4 readout zones, behavior features, and value hypotheses`
- Status: `completed`

## Summary

Execute Workstreams 1-3 from the V4 next sprint plan and then stop for team
review. The slice should produce durable docs for the aggregate readout zone
model, derived behavior-feature backlog, and non-dollarized value-hypothesis
map while preserving all current V1-V4 governance boundaries.

## Scope Paths

- `docs/research/V4_READOUT_ZONE_MODEL.md`
- `docs/research/V4_BEHAVIOR_FEATURE_BACKLOG.md`
- `docs/research/V4_VALUE_HYPOTHESIS_MAP.md`
- `docs/research/V4_NEXT_SPRINT_PLAN.md`
- `docs/research/V4_VALIDATION_PLAN.md`
- `README.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- The docs must not authorize customer-facing economic output.
- The docs must not create a score, ranking, maturity label, productivity
  claim, ROI claim, causal claim, prediction claim, or automated economic
  recommendation.
- The docs must preserve the locked canonical event and suppression reason
  sets.
- Value hypotheses must stay downstream of aggregate behavior evidence,
  customer-owned assumptions, and customer-attested aggregate outcomes.
- Workstreams 4-5 remain out of scope for this slice.

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

- Workstreams 1-3 have durable artifacts and are linked from the sprint plan,
  validation plan, and README.
- Guardrails remain explicit: no ROI, no productivity, no customer-facing
  economic output, no rankings, no raw skill names, and no person-level fields.
- Workstreams 4-5 are not implemented.
- Verification commands pass.

## Specialists To Consult

- None for this documentation-only decision slice.

## Next Handoff Note

Completed locally. Added durable artifacts for Workstreams 1-3 and stopped
before the team-demo artifact and client-pilot gate so the team can review the
zone model, feature backlog, and value-hypothesis language before continuing.
