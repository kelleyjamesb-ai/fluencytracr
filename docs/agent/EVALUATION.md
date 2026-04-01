# Evaluation and verification (evaluator loop)

Generation (writing code) should be followed by **mechanical** checks where possible. This separates “I think it works” from “the repo proves it.”

## Fast local gate (Python, mirrors part of CI)

From repo root, after dependencies are installed:

```bash
pip install -r requirements.txt   # or your equivalent venv
./harness/scripts/bootstrap.sh
./harness/scripts/verify.sh
```

`verify.sh` runs the same **Python unittest** discovery as [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`python -m unittest discover -s tests -p "test_*.py"`). Some tests may require optional deps (e.g. `pytest` for specific modules); fix imports or install dev extras as needed until the suite matches your environment.

## Governance gate (Python)

CI also runs:

```bash
python scripts/ci_v1_governance_gates.py
```

Run this when touching V1 contracts, suppression, or governance-sensitive paths.

## Node / UI / API (full CI parity)

When changing `backend/`, `frontend/`, or `shared/`:

```bash
npm install
npm run build --workspace shared
npm run test:ci --workspace backend
npm test --workspace frontend
```

Optional deeper CI scripts (docs, evidence bundles, link checks) live under `scripts/ci_*.sh` and are invoked from `.github/workflows/ci.yml`.

## User-facing UI smoke

If the change affects the dashboard or flows in `frontend/`:

1. Run frontend tests above.
2. Manually smoke the affected route(s) in dev (`npm run dev` in `frontend/` per package scripts) or document browser automation if you add it later.

## OpenSpec

For proposal-driven work: validate before merge as described in [`openspec/AGENTS.md`](../../openspec/AGENTS.md) (`openspec validate … --strict`).
