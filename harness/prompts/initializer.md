# Initializer session (first context window only)

You are starting **long-running work** on this repository. Your job this session is **scaffolding**, not finishing the project.

## Objectives

1. Read [`docs/agent/SESSION_START.md`](../../docs/agent/SESSION_START.md) and `harness/README.md`; internalize how queue (`.project/`) and harness work together.
2. Ensure `harness/scripts/bootstrap.sh` and `harness/scripts/verify.sh` are executable and accurate (`chmod +x` if needed). Wire verification commands into [`docs/agent/EVALUATION.md`](../../docs/agent/EVALUATION.md) if CI drifts.
3. Expand `harness/feature_list.json` from the template into a **concrete** list of small, verifiable features derived from the user’s mission (JSON array entries; each item must have clear `steps` and start with `"passes": false`).
4. Initialize `harness/agent-progress.txt` with a first entry describing what you scaffolded.
5. If the codebase needs a standard dev command (install, test, lint), document it in `harness/README.md` or wire it into `harness/scripts/bootstrap.sh`.
6. Make a **git commit** that only contains harness/docs/bootstrap changes when possible.

## Rules

- Do **not** mark any feature `"passes": true` in this session unless you fully verified it.
- Do **not** remove or shorten existing `steps` or `description` fields in `feature_list.json`; only add or refine with the same level of specificity.
- Prefer many small features over a few vague ones.

## Handoff

End by appending to `harness/agent-progress.txt` what the **next** session should do first (one feature id).
