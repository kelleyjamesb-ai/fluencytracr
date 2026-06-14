# Current Slice Contract

- Work item id: `trust-evidence-gap-composition-diagnostic`
- Title: `Decompose Trust Episode Boundary evidence gap`
- Status: `completed`

## Summary

Add an aggregate-only dogfood diagnostic and readout path that decomposes the
Trust Episode Boundary evidence gap into interpretable composition buckets
without adding runtime output, schemas, APIs, canonical events, suppression
reasons, ROI, causality, individual scoring, or team/manager ranking.

## Scope Paths

- `sql/dogfood/trust_evidence_gap_composition_diagnostic.sql`
- `scripts/dogfood/run_trust_evidence_gap_composition_readout.py`
- `docs/research/TRUST_EVIDENCE_GAP_COMPOSITION.md`
- `docs/dogfood/TRUST_EPISODE_PILOT_RUNBOOK.md`
- `dogfood-output/trust-evidence-gap-composition/`
- `dogfood-output/trust-episode-boundary-pilot/`
- `output/doc/FluencyTracr_Trust_Calibration_Pilot_Brief.md`
- `output/doc/FluencyTracr_Trust_Calibration_Pilot_Brief.docx`
- `scripts/dogfood/run_trust_episode_pilot_readout.py`
- `tests/dogfood/test_trust_episode_pilot_readout.py`
- `tests/dogfood/test_trust_episode_external_brief.py`
- `tests/dogfood/test_trust_evidence_gap_composition.py`
- `tests/dogfood/test_velocity_double_count.py`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Gap composition buckets must not become canonical events or suppression
  reasons.
- Gap composition must stay aggregate-only and must not expose raw prompts,
  outputs, transcripts, emails, names, user IDs, manager fields, team fields,
  or person-level metrics.
- Ambiguous boundary rows and small cells must stay folded into caveated
  evidence-gap language.
- The readout must not claim trust scoring, correctness, ROI, causality,
  productivity, or ranking.

## Planned Checks

- Run focused Trust Evidence Gap Composition tests.
- Run Trust Episode pilot readout regression tests.
- Run the dogfood SQL contract tests touched by the new SQL file.
- Compile the new dogfood readout script.
- Run docs contract/link checks where relevant.
- Run semantic drift guard.
- Run V1 governance gates.
- Run diff whitespace check.

## Evaluator Command Profile

- `python -m pytest tests/dogfood/test_trust_evidence_gap_composition.py -q`
- `python -m pytest tests/dogfood/test_trust_episode_pilot_readout.py tests/dogfood/test_velocity_double_count.py -q`
- `python3 -m compileall scripts/dogfood/run_trust_evidence_gap_composition_readout.py`
- `bash scripts/ci_linkcheck_fluency_docs.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `python3 scripts/ci_v1_governance_gates.py`
- `git diff --check`

## Evaluator Pass Criteria

- The diagnostic emits only aggregate gap composition buckets.
- The readout explains the current public evidence gap as true gap, ambiguous
  boundary fold-in, and small-cell fold-in where those rows exist.
- Generated artifacts carry explicit caveats and non-goals.
- No runtime API, schema, canonical event, suppression reason, ROI, causality,
  individual scoring, or ranking behavior changes.

## Specialists To Consult

- None for this bounded dogfood/research slice.

## Next Handoff Note

Completed locally. Added the aggregate-only Trust Evidence Gap Composition
diagnostic, CSV-to-readout runner, retained run-first composition artifacts,
research doc, pilot runbook instructions, and tests. The retained readout
explains the deduped public pilot evidence gap as true downstream-evidence gap
plus ambiguous-boundary fold-in plus a sub-floor safety fold-in whose exact
value is withheld in shareable output. The BigQuery SQL dry-run and
seven-business-day candidate-key QA run passed; compare deeper BigQuery bucket
counts to the 43.1% pilot gap only after applying the same product-episode
dedup overlay. The executive pilot v0 now also carries evidence quality and
reliability context: raw candidate-key normalization, high-confidence
trace/run/action coverage, interpretation completeness, and boundary ambiguity
share, without changing runtime behavior or governance boundaries.
