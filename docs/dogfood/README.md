# Dogfood End-to-End Harness

This harness proves FluencyTracr can run end to end on mocked Glean GCE-shaped
workflow data without customer data, network calls, or a live service.

It is a release gate for the Glean dogfood path. The CI job `dogfood-e2e` runs
on every pull request.

## What It Runs

- `scripts/dogfood/generate_gce_fixtures.py` creates deterministic mocked
  `workflow_run` events for one workflow family.
- `scripts/dogfood/run_end_to_end.py` ingests those fixture events in memory,
  derives canonical V1 observations, computes the verdict, and prints a
  one-page readout.
- `tests/test_dogfood_e2e.py` runs three canonical scenarios:
  - healthy workflow
  - regressed workflow
  - sparse workflow

The readout includes:

- `SURFACE` / `SUPPRESS` verdict
- AIVM `value_type` and `evidence_grade`
- Reliability Factor and components
- Quality Multiplier
- Causal Delta when a `change_event` is configured

The Python runner intentionally mirrors the published contracts instead of
calling live services:

- AIVM mapping: `docs/contracts/FluencyTracr_V1_AIVM_Value_Mapping.md`
- Reliability Factor: `docs/contracts/reliability-factor.md`
- Quality Multiplier: `docs/integrations/value-realization/quality-multiplier.md`
- Causal Delta: `docs/contracts/causal-delta.md`

That keeps the release gate pure-stdlib at runtime, no-network, and fast enough
to run on every PR. If the production formulas change, update this harness and
its canonical scenarios in the same PR.

## Generate A Fixture

```bash
python scripts/dogfood/generate_gce_fixtures.py \
  --workflow-family manager-review-writer \
  --cohort-size 30 \
  --abandonment-rate 0.05 \
  --recovery-rate 0.85 \
  --verification-rate 0.90 \
  --output /tmp/manager-review-writer.json
```

Allowed workflow families:

- `manager-review-writer`
- `eng-on-call-triage`

## Run A Readout

```bash
python scripts/dogfood/run_end_to_end.py --scenario healthy
python scripts/dogfood/run_end_to_end.py --scenario regressed
python scripts/dogfood/run_end_to_end.py --scenario sparse
python scripts/dogfood/run_end_to_end.py --fixture /tmp/manager-review-writer.json
```

Use `--json` for machine-readable output.

## Run A Trust Episode Boundary Pilot

Trust Episode Boundary pilot readouts use aggregate BigQuery CSV exports, not
raw traces or backend APIs. See
[TRUST_EPISODE_PILOT_RUNBOOK.md](./TRUST_EPISODE_PILOT_RUNBOOK.md).

## Add A New Scenario

1. Add a deterministic scenario builder in
   `scripts/dogfood/run_end_to_end.py`.
2. Keep the fixture aggregate-only. Do not add raw prompts, raw responses,
   transcripts, query text, file content, user IDs, emails, names, or manager
   identifiers.
3. Add one unittest assertion block in `tests/test_dogfood_e2e.py`.
4. Verify the dogfood suite stays below 60 seconds:

```bash
python -m unittest tests.test_dogfood_e2e
```

## Boundaries

- Fixtures only; no real customer data.
- No network calls.
- No person-level fields.
- No new canonical events or suppression reasons.
- No ROI calculation, p-values, or statistical-causality claims.
