#!/usr/bin/env python3
"""Phase 6 Governance Lock — CI gate that blocks modifications to governance-controlled files.

Governance is CLOSED. No schema, signal, or semantic changes are permitted.
If ambiguity exists, the build FAILS.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ── Governance-Controlled File Manifest ──────────────────────────────────────
# Category 1: Event Schemas
EVENT_SCHEMAS = [
    "schemas/ft_v1_disposition_observed.schema.json",
    "schemas/ft_v1_iteration_depth_observed.schema.json",
    "schemas/ft_v1_verification_presence_observed.schema.json",
    "schemas/ft_v1_recovery_observed.schema.json",
    "schemas/ft_v1_latency_observed.schema.json",
    "schemas/ft_v1_abandonment_observed.schema.json",
    "schemas/ft_v1_evaluation_decision.schema.json",
    "backend/src/phase1/contract.ts",
    "backend/src/contracts/judgment_event.schema.json",
    "backend/src/contracts/pattern_inference_record.schema.json",
    "shared/src/fluencyTracrV1Signal.ts",
    "shared/src/fluencyTracrSchemas.ts",
]

# Category 2: Signal Definitions
SIGNAL_DEFINITIONS = [
    "shared/src/types.ts",
    "shared/src/schemas.ts",
    "shared/src/fluencyTracrConfidence.ts",
    "shared/src/metricConstants.ts",
    "shared/src/privacy.ts",
]

# Category 3: Evaluation Logic
EVALUATION_LOGIC = [
    "backend/src/phase1/evaluateDecision.ts",
    "backend/src/phase1/surfaceDecision.ts",
    "backend/src/phase1/windowing.ts",
    "backend/src/v1/evaluationDecision.ts",
    "backend/src/inference/fluencytracr_v1_signal_evaluation.ts",
    "backend/src/inference/confidence_layer.ts",
    "backend/src/inference/classifier.ts",
    "backend/src/inference/gating.ts",
    "shared/src/anonymousContract.ts",
]

# Category 4: Contract Documentation
CONTRACT_DOCS = [
    "docs/contracts/FluencyTracr_V1_Phase1_Event_Contract.md",
    "docs/contracts/FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md",
]

ALL_LOCKED_FILES = EVENT_SCHEMAS + SIGNAL_DEFINITIONS + EVALUATION_LOGIC + CONTRACT_DOCS


def fail(message: str) -> None:
    print(f"PHASE 6 GOVERNANCE LOCK FAILED: {message}", file=sys.stderr)
    raise SystemExit(1)


def git_diff_base() -> str | None:
    base_ref = os.environ.get("GITHUB_BASE_REF")
    if base_ref:
        return f"origin/{base_ref}"
    try:
        return subprocess.check_output(
            ["git", "merge-base", "HEAD", "origin/main"], text=True
        ).strip()
    except subprocess.CalledProcessError:
        return None


def git_changed_files(base: str | None) -> set[str]:
    if not base:
        return set()
    try:
        output = subprocess.check_output(
            ["git", "diff", "--name-only", f"{base}..HEAD"], text=True
        )
        return {line.strip() for line in output.splitlines() if line.strip()}
    except subprocess.CalledProcessError:
        return set()


def categorize(path: str) -> str:
    if path in EVENT_SCHEMAS:
        return "EVENT_SCHEMA"
    if path in SIGNAL_DEFINITIONS:
        return "SIGNAL_DEFINITION"
    if path in EVALUATION_LOGIC:
        return "EVALUATION_LOGIC"
    if path in CONTRACT_DOCS:
        return "CONTRACT_DOCUMENTATION"
    return "UNKNOWN"


def main() -> None:
    base = git_diff_base()

    # Fail closed: if we cannot determine a merge base, we cannot verify that
    # governance-controlled files are unchanged. Ambiguity defaults to FAIL.
    if not base:
        fail(
            "Cannot determine merge base. "
            "Ensure the checkout has full git history (fetch-depth: 0) "
            "and origin/main is available, or set GITHUB_BASE_REF.\n"
            "Governance lock requires a verifiable base to diff against. "
            "Ambiguity defaults to FAIL per Phase 6 rules."
        )

    changed = git_changed_files(base)
    if not changed:
        print("Phase 6 governance lock: no changed files detected. PASS.")
        return

    violations: list[str] = []
    for locked_file in ALL_LOCKED_FILES:
        if locked_file in changed:
            category = categorize(locked_file)
            violations.append(f"  [{category}] {locked_file}")

    if violations:
        fail(
            "Governance is CLOSED. The following locked files were modified:\n"
            + "\n".join(sorted(violations))
            + "\n\nNo schema, signal, or semantic changes are permitted in Phase 6.\n"
            "To proceed, this change must go through a new Sentinel-led governance cycle."
        )

    print(f"Phase 6 governance lock: {len(ALL_LOCKED_FILES)} files verified unchanged. PASS.")


if __name__ == "__main__":
    main()
