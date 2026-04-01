# FluencyTracr — agent mission

**Objective:** Evolve **FluencyTracr** (LearnAIR Engable Tool): a **privacy-first** system that captures **organizational AI fluency signals** from **passive, approved, aggregated** data—without surveillance, individual scoring, or scope creep.

## Description

Work on this repo should advance:

1. **Ingestion and APIs** — Partner-facing ingestion, validation, and APIs described in `docs/api/` and contracts under `docs/contracts/`.
2. **Signal and confidence layer** — Behavioral signals remain **signals, not facts**; binary outcomes **`SURFACE`** or **`SUPPRESS`** with default **`SUPPRESS`**; suppression reason codes and invariants as in `README.md` (V1 confidence layer).
3. **Product surfaces** — Backend (`backend/`), shared schemas (`shared/`), and frontend (`frontend/`) stay aligned with specs and CI.
4. **Governance** — Changes respect `SCOPE_GUARDRAILS.md` (mission lock, non-goals, aggregation-first, transparency, retention).

Agents must **read guardrails and relevant specs before** large or ambiguous changes; use OpenSpec (`openspec/AGENTS.md`) when the work matches proposal triggers.

## Success criteria (for contributions)

- **Privacy and scope:** No individual surveillance, ranking, or repurposing beyond AI fluency signals; matches `SCOPE_GUARDRAILS.md`.
- **Signal semantics:** Confidence/suppression behavior stays consistent with documented invariants and contracts (e.g. event contract, EvidenceBundle, behavioral signals spec—see canonical list in `README.md`).
- **Verification:** Mechanical checks pass for the areas touched (`docs/agent/EVALUATION.md`, CI in `.github/workflows/ci.yml`).
- **Handoff:** Multi-session work follows `harness/README.md` (`feature_list.json`, `agent-progress.txt`).

## Canonical pointers

- Guardrails: [`SCOPE_GUARDRAILS.md`](SCOPE_GUARDRAILS.md)
- Architecture and APIs: [`README.md`](README.md) (canonical docs list)
- Agent workflow: [`docs/agent/README.md`](docs/agent/README.md)
