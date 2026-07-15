"""CLI for the fixed two-phase measurement calibration evidence run."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from .ai_fluency_measurement_calibration_resumable import (
    MEASUREMENT_CALIBRATION_CHUNK_COUNT,
    emit_resumable_measurement_calibration_artifact,
    load_complete_primary_study,
    measurement_calibration_resumable_plan,
    measurement_calibration_workspace_path,
    run_measurement_calibration_chunk,
    run_measurement_calibration_phase,
)


def _print_json(value: object) -> None:
    print(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the internal synthetic measurement calibration evidence plan."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("plan", help="Print the immutable two-phase plan.")
    for phase in ("primary", "recompute"):
        chunk = subparsers.add_parser(
            f"run-{phase}-chunk", help=f"Run or resume one fixed {phase} chunk."
        )
        chunk.add_argument("--chunk-index", required=True, type=int)
        chunk.add_argument("--workspace", required=True)
        complete = subparsers.add_parser(
            f"run-{phase}", help=f"Run or resume all fixed {phase} chunks."
        )
        complete.add_argument("--workspace", required=True)
    combine = subparsers.add_parser(
        "combine", help="Atomically emit from exact primary and recomputation phases."
    )
    combine.add_argument("--workspace", required=True)
    return parser


def _chunk_summary(chunk: dict, *, workspace: str) -> dict:
    return {
        "phase": chunk["phase"],
        "chunk_index": chunk["chunk_index"],
        "chunk_hash": chunk["chunk_hash"],
        "slot_count": len(chunk["slot_result_hashes"]),
        "runner_error_count": chunk["runner_error_count"],
        "workspace": str(Path(workspace).expanduser().resolve()),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "plan":
        _print_json(measurement_calibration_resumable_plan())
        return 0
    if args.command.startswith("run-"):
        phase = "recompute" if "recompute" in args.command else "primary"
        if args.command.endswith("-chunk"):
            chunk = run_measurement_calibration_chunk(
                phase=phase,
                chunk_index=args.chunk_index,
                workspace_dir=args.workspace,
            )
            summary = _chunk_summary(chunk, workspace=args.workspace)
            failing_checks = (
                list(load_complete_primary_study(args.workspace).failing_checks)
                if phase == "recompute"
                else []
            )
            summary["failing_checks"] = failing_checks
            _print_json(summary)
            return (
                0
                if chunk["runner_error_count"] == 0 and not failing_checks
                else 2
            )
        chunks = run_measurement_calibration_phase(
            phase=phase, workspace_dir=args.workspace
        )
        runner_error_count = sum(chunk["runner_error_count"] for chunk in chunks)
        failing_checks = list(
            load_complete_primary_study(args.workspace).failing_checks
        )
        _print_json(
            {
                "phase": phase,
                "chunk_count": len(chunks),
                "expected_chunk_count": MEASUREMENT_CALIBRATION_CHUNK_COUNT,
                "slot_count": sum(len(chunk["slot_result_hashes"]) for chunk in chunks),
                "runner_error_count": runner_error_count,
                "failing_checks": failing_checks,
                "workspace": str(Path(args.workspace).expanduser().resolve()),
                "internal_only": True,
                "synthetic_only": True,
                "customer_output_authorized": False,
            }
        )
        return 0 if runner_error_count == 0 and not failing_checks else 2
    artifact = emit_resumable_measurement_calibration_artifact(
        workspace_dir=args.workspace
    )
    output = measurement_calibration_workspace_path(
        Path(args.workspace).expanduser().resolve(),
        "ai_fluency_measurement_calibration_artifact.json",
    )
    _print_json(
        {
            "artifact_path": str(output),
            "artifact_file_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
            "artifact_self_hash": artifact["hash_bindings"]["artifact_self_hash"],
            "state": artifact["state"],
            "failing_checks": artifact["failing_checks"],
            "independent_acceptance_complete": False,
            "parent_openspec_task_5_5_complete": False,
            "customer_output_authorized": False,
        }
    )
    return 0 if artifact["state"] == "VALID_INTERNAL_SYNTHETIC_NON_AUTHORIZING" else 2


if __name__ == "__main__":
    raise SystemExit(main())
