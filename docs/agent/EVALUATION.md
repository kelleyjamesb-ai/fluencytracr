# Evaluation and verification (evaluator loop)

Generation (writing code) should be followed by **mechanical** checks where possible. This separates “I think it works” from “the repo proves it.”

## Fast local gate (Python, mirrors part of CI)

From repo root, after dependencies are installed:

```bash
pip install -r requirements.txt   # or your equivalent venv
./harness/scripts/bootstrap.sh
./harness/scripts/verify.sh
```

`verify.sh` installs `requirements.txt` and runs the same **pytest** suite as [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) (`python -m pytest tests/ -q`). Pytest collects both `unittest.TestCase` subclasses and pytest-style tests.

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

GitHub Actions Node jobs use **Node 24** with `actions/setup-node@v6` and `actions/checkout@v5` (see `.github/workflows/ci.yml`, `governance-gate.yml`).

## Optional OpenAI Agents SDK harness

When changing `integrations/openai-agents/` or the related docs/scripts:

```bash
npm install
npm run validate:agents
```

This validates the optional development sidecar only. It does not replace the repo harness, OpenSpec gates, or backend/frontend/shared checks above.

## Cursor rules and agent-run contract

When changing `.cursor/rules/`, `shared/src/agentRunSchemas.ts`, `schemas/agent_run/`, `scripts/agentic_harness_*.mjs`, or `docs/contracts/agent-run/`:

```bash
npm run test:agentic-harness
npm test --workspace backend -- --runTestsByPath tests/agent_run_schema.test.ts
npm run build --workspace shared
bash scripts/ci_docs_contract_sweep.sh
bash scripts/ci_linkcheck_fluency_docs.sh
```

This validates the provider-neutral development harness contract. It does not enable a Cursor runtime adapter by itself.

## User-facing UI smoke

If the change affects the dashboard or flows in `frontend/`:

1. Run frontend tests above.
2. Manually smoke the affected route(s) in dev (`npm run dev` in `frontend/` per package scripts) or document browser automation if you add it later.

## OpenSpec

For proposal-driven work: validate before merge as described in [`openspec/AGENTS.md`](../../openspec/AGENTS.md) (`openspec validate … --strict`).
