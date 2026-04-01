# Agent harness audit — FluencyTracr (local workspace)

_Date: 2026-03-31. Source: inspection of `/Users/jameskelley/FluencyTracr`._

## 1. Current repo state

| Check | Result |
| --- | --- |
| Working directory | `/Users/jameskelley/FluencyTracr` |
| Remotes | `origin` → `https://github.com/james-kelley-glean/fluencytracr.git` |
| Branch | `main`, **up to date** with `origin/main` |
| Uncommitted changes | **None** at audit time (`git status` clean) |

**Top-level shape (high level):** `backend/` (Express/TS), `frontend/` (Vite/React), `shared/` (types/schemas), `src/` (Python modules), `tests/` (Python unittest + some pytest imports), `docs/` (extensive specs and architecture), `openspec/` (spec-driven workflow), `harness/` (long-running agent loop), `fluencytracr-harness/` (separate batch analytics per harness README), `scripts/` + `.github/workflows/ci.yml` (CI), `schemas/`, `artifacts/` (runtime + plans; harness checkpoints gitignored except `.gitkeep`).

**Entrypoints:** Root `README.md` lists canonical docs; `AGENTS.md` / `CLAUDE.md` for assistants; `harness/README.md` for multi-session work; `openspec/AGENTS.md` for proposals.

**Agent-related:** `.cursorrules` → `.antigravity/rules.md`; harness prompts; `mission.md` (still example stock-agent text—replace when mission is finalized).

## 2. Gaps vs target harness

**Strong already:** Anthropic-style external state (`feature_list.json`, `agent-progress.txt`, session prompts); OpenSpec as system of record for specs/changes; CI encodes mechanical checks; `docs/ARCHITECTURE_MAP.md` and contract docs.

**Gaps addressed in this pass:**

- Root `AGENTS.md` was thin on **where to look first** and did not state **local = truth** vs GitHub.
- **Evaluator loop** was lighter than generator loop: bootstrap existed; no single script mirroring CI’s Python unittest step.
- **Task contract / definition-of-done** pattern was not documented in-repo for chunk work.
- **docs/agent/** hub missing as a deliberate navigation layer (Codex-style “short map, durable docs”).
- `feature_list.json` still had a **template** second item; not aligned with real verification paths.
- `artifacts/harness/checkpoints/` referenced in harness README but **`.gitkeep` missing** on disk.

**Remaining gaps (intentionally later):**

- No separate automated “evaluator agent” role—only scripts + CI (proportionate for current maturity).
- `mission.md` example content should be replaced with FluencyTracr mission when ready.
- Python tests: some modules expect `pytest` / full `requirements.txt`; local verify fails until deps match CI—documented in `docs/agent/EVALUATION.md`.
- Optional: add `artifacts/plans/` template file only when first real plan lands (avoid empty ceremony).

## 3. Highest-leverage changes (implemented)

1. **`docs/agent/README.md`** — Single navigation hub linking harness, OpenSpec, architecture, contracts.
2. **`docs/agent/TASK_CONTRACT.md`** — Chunk-level definition of done + handoff alignment.
3. **`docs/agent/EVALUATION.md`** — Separates generation from verification; maps to CI jobs and UI smoke.
4. **`harness/scripts/verify.sh`** — Runs bootstrap + `python -m unittest discover -s tests -p "test_*.py"` (CI parity for Python unit job).
5. **`artifacts/harness/checkpoints/.gitkeep`** — Matches `.gitignore` exception so path exists in repo.
6. **`AGENTS.md` / `CLAUDE.md`** — Local-vs-remote note, repo map table, evaluation pointer.
7. **`harness/README.md` / prompts** — Evaluation section and verify step in incremental/initializer flows.
8. **`harness/feature_list.json`** — Concrete items: verify script, Node workspaces, OpenSpec gate.
9. **`README.md`** — One canonical-doc bullet for `docs/agent/`.
10. **`harness/agent-progress.txt`** — Session handoff entry.

## 4. Minimal viable harness for this repo

- **Planner:** Human + OpenSpec proposals for large change; optional `artifacts/plans/*.md` using `TASK_CONTRACT.md`.
- **Generator:** Normal coding + harness session loop (one checklist item, small commits).
- **Evaluator:** `./harness/scripts/verify.sh` + `docs/agent/EVALUATION.md` + CI on push.

## 5. What exists now vs later

| Now | Later |
| --- | --- |
| Navigation hub, task contract doc, verify script | Richer plan artifacts per feature |
| Feature list items for Python + Node + OpenSpec | Mark `harness-002`/`003` passes after you run them successfully in a real env |
| Handoff log entry | Regular append-only entries each session |
| Checkpoints dir placeholder | Machine-readable checkpoints if multi-agent tooling needs them |

## Principle mapping

| Principle | How addressed |
| --- | --- |
| Anthropic: harness + external memory | Preserved; evaluation section and verify script strengthen “prove it” |
| Anthropic: chunks + explicit success | `TASK_CONTRACT.md`, `feature_list.json` steps |
| Anthropic: separate eval | `EVALUATION.md`, `verify.sh`, CI reference |
| Codex: short AGENTS map | Table + pointers to `docs/agent/` |
| Codex: repo as system of record | Docs under `docs/agent/`, harness state files |
| Codex: mechanical enforcement | `verify.sh` + CI pointers |
| Codex: legibility | README canonical link, architecture pointers in hub |

## Files touched (implementation)

- Added: `docs/agent/README.md`, `docs/agent/TASK_CONTRACT.md`, `docs/agent/EVALUATION.md`, `harness/scripts/verify.sh`, `artifacts/harness/checkpoints/.gitkeep`, `artifacts/agent-harness-audit-2026-03-31.md` (this file)
- Updated: `AGENTS.md`, `CLAUDE.md`, `README.md`, `harness/README.md`, `harness/feature_list.json`, `harness/agent-progress.txt`, `harness/prompts/initializer.md`, `harness/prompts/incremental_session.md`
