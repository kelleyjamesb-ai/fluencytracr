# FluencyTracr inference proof harness (`inference/`)

Internal-only Python package for the Bayesian inference proof harness
(OpenSpec change `add-bayesian-inference-proof-harness`, slice 2). It is the
Python side of the boundary defined in
[`docs/contracts/confidence-inference-methodology/README.md`](../docs/contracts/confidence-inference-methodology/README.md):
Python owns all statistical computation (PyMC + ArviZ); TypeScript
(`packages/confidence-engine`) owns all governance and validation. Artifacts
cross only as JSON validated by the `ConfidenceModel` Zod schemas.

## Posture

- **Synthetic data only.** Harness inputs come from synthetic generators;
  real observations are rejected. No network, BigQuery, or connector imports
  (enforced by `tests/test_no_connector_imports.py`).
- **Internal only.** No customer-facing output, no probability or confidence
  output, no persistence, no routes or UI. Every proof artifact pins
  `internal_only: true` and `customer_output_authorized: false`.
- **Isolated environment.** This package has its own pinned environment
  (`requirements.lock`). It adds nothing to the root `pyproject.toml` or
  `requirements.txt`.

## Environment

Requires Python 3.13 (pinned via `requires-python`). Create the environment
from the lockfile — the lockfile, not the `pyproject.toml` pins, is the
source of truth for the full transitive set:

```bash
cd inference
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
```

To change dependencies: edit the direct pins in `pyproject.toml`, reinstall,
then regenerate the lockfile with `.venv/bin/pip freeze > requirements.lock`.

## Running the tests

```bash
cd inference
.venv/bin/python -m pytest tests/ -q
```

`tests/test_environment_smoke.py` proves the pinned stack works end to end:
it fits a trivial seeded Normal-mean model with NUTS (2 chains), checks
R-hat <= 1.01, and asserts that a fixed seed reproduces the posterior mean
exactly across two in-process runs. `tests/test_no_connector_imports.py` is
a static source scan guarding the no-network / no-connector posture.

CI runs the same suite in `.github/workflows/inference-harness.yml`.
