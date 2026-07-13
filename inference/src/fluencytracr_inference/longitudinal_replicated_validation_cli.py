"""CLI for the compiled longitudinal replicated-validation workflow."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from .hashing import sha256_json
from .longitudinal_replicated_validation import (
    initialize_replicated_validation_workspace,
    longitudinal_replicated_validation_plan,
    read_json,
    replicated_validation_workspace_path,
    run_calibration_canary,
    run_calibration_chunk,
    strict_json_equal,
    write_json_atomic,
)
from .longitudinal_replicated_validation_artifact import (
    run_full_replicated_validation_artifact,
    run_replicated_validation_smoke_artifact,
)
from .longitudinal_replicated_validation_controls import run_control_workspace


def _print_json(value: object) -> None:
    print(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False))


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="longitudinal-replicated-validation",
        description="Synthetic-only internal longitudinal validation runner.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("plan", help="Print the immutable execution plan.")
    subparsers.add_parser("smoke", help="Run a reduced HOLD-only mechanics smoke.")

    canary = subparsers.add_parser(
        "canary", help="Run one compiled replication index across all six cells."
    )
    canary.add_argument("--replication-index", required=True, type=int)

    chunk = subparsers.add_parser(
        "run-chunk", help="Run or resume one of the 20 compiled calibration chunks."
    )
    chunk.add_argument("--chunk-index", required=True, type=int)
    chunk.add_argument("--workspace", required=True)

    controls = subparsers.add_parser(
        "run-controls", help="Run or resume the fixed floor/lag/negative controls."
    )
    controls.add_argument("--workspace", required=True)

    combine = subparsers.add_parser(
        "combine", help="Strictly combine a complete workspace into one artifact."
    )
    combine.add_argument("--workspace", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "plan":
        _print_json(longitudinal_replicated_validation_plan())
        return 0
    if args.command == "smoke":
        _print_json(run_replicated_validation_smoke_artifact())
        return 0
    if args.command == "canary":
        _print_json(
            run_calibration_canary(replication_index=args.replication_index)
        )
        return 0
    if args.command == "run-chunk":
        chunk = run_calibration_chunk(
            chunk_index=args.chunk_index,
            workspace_dir=args.workspace,
        )
        _print_json(
            {
                "chunk_index": chunk.chunk_index,
                "chunk_hash": chunk.chunk_hash,
                "slot_count": len(chunk.slot_results),
                "all_slots_passed": all(result.passed for result in chunk.slot_results),
                "workspace": str(Path(args.workspace).expanduser().resolve()),
                "internal_only": True,
                "customer_output_authorized": False,
            }
        )
        return 0
    if args.command == "run-controls":
        study = run_control_workspace(args.workspace)
        _print_json(
            {
                "study_status": study.study_status,
                "study_result_hash": study.study_result_hash,
                "floor_gate_passed": study.floor_gate_passed,
                "lag_gate_passed": study.lag_gate_passed,
                "negative_control_gate_passed": study.negative_control_gate_passed,
                "workspace": str(Path(args.workspace).expanduser().resolve()),
                "internal_only": True,
                "customer_output_authorized": False,
            }
        )
        return 0
    workspace = initialize_replicated_validation_workspace(args.workspace)
    output = replicated_validation_workspace_path(
        workspace, "longitudinal_replicated_validation_artifact.json"
    )
    if output.exists():
        existing = read_json(output)
        if not isinstance(existing, dict):
            raise ValueError("existing combined artifact must be an object")
        artifact = run_full_replicated_validation_artifact(
            workspace_dir=str(workspace),
            generated_at=existing.get("generated_at"),
        )
        if not strict_json_equal(existing, artifact):
            raise ValueError("existing combined artifact failed exact regeneration")
    else:
        artifact = run_full_replicated_validation_artifact(
            workspace_dir=str(workspace)
        )
        write_json_atomic(output, artifact)
    _print_json(
        {
            "artifact_path": str(output),
            "artifact_file_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "artifact_canonical_json_hash": sha256_json(artifact),
            "artifact_self_hash": artifact["hash_bindings"]["artifact_self_hash"],
            "governance_state": artifact["governance_state"]["state"],
            "numerical_validation_gate_passed": artifact["governance_state"][
                "numerical_validation_gate_passed"
            ],
            "independent_acceptance_complete": False,
            "longitudinal_proof_complete": False,
            "customer_output_authorized": False,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
