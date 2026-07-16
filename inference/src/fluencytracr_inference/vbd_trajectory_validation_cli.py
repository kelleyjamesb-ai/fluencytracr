"""CLI for the frozen VBD trajectory validation runner."""

from __future__ import annotations

import argparse
import json
import sys

from .vbd_trajectory_validation_execution import execute_vbd_trajectory_child
from .vbd_trajectory_validation_plan import vbd_trajectory_validation_plan
from .vbd_trajectory_validation_resumable import (
    _decode_json_bytes,
    build_vbd_trajectory_freeze_manifest,
    combine_vbd_trajectory_validation_workspace,
    initialize_vbd_trajectory_validation_workspace,
    run_vbd_trajectory_validation_canary,
    run_vbd_trajectory_validation_chunk,
    run_vbd_trajectory_validation_phase,
    vbd_trajectory_validation_runner_summary,
)


def _print_json(value: object) -> None:
    print(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False))


def run_vbd_trajectory_smoke_artifact() -> dict:
    from .vbd_trajectory_artifact import (
        run_vbd_trajectory_smoke_artifact as run_smoke,
    )

    return run_smoke()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the internal synthetic VBD trajectory proof plan."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("plan", help="Print the immutable 2,000-case plan.")
    subparsers.add_parser(
        "runner-summary", help="Print the compact non-executing runner summary."
    )
    subparsers.add_parser(
        "smoke", help="Run the disjoint development smoke, which always HOLDS."
    )
    freeze = subparsers.add_parser(
        "build-freeze-manifest",
        help="Print the create-once manifest for reviewed candidate commit S.",
    )
    freeze.add_argument("--code-review-ref", required=True)
    freeze.add_argument("--bug-review-ref", required=True)
    freeze.add_argument("--adversarial-review-ref", required=True)
    freeze.add_argument("--statistical-review-ref", required=True)
    initialize = subparsers.add_parser(
        "initialize", help="Create a frozen full-study workspace."
    )
    initialize.add_argument("--workspace", required=True)
    initialize.add_argument("--concordance-receipt", required=True)
    initialize.add_argument("--freeze-manifest")
    canary = subparsers.add_parser(
        "run-canary", help="Run one exact ordered full-setting canary."
    )
    canary.add_argument("--workspace", required=True)
    canary.add_argument("--canary-index", required=True, type=int)
    for phase in ("original", "recomputation"):
        chunk = subparsers.add_parser(
            f"run-{phase}-chunk", help=f"Run one fixed {phase} chunk."
        )
        chunk.add_argument("--workspace", required=True)
        chunk.add_argument("--chunk-index", required=True, type=int)
        complete = subparsers.add_parser(
            f"run-{phase}", help=f"Run all fixed {phase} chunks."
        )
        complete.add_argument("--workspace", required=True)
    combine = subparsers.add_parser(
        "combine", help="Combine exact original and recomputation phases."
    )
    combine.add_argument("--workspace", required=True)
    subparsers.add_parser("_execute-slot", help=argparse.SUPPRESS)
    return parser


def _chunk_summary(value: dict) -> dict:
    return {
        "phase": value["phase"],
        "chunk_index": value["chunk_index"],
        "chunk_result_hash": value["chunk_result_hash"],
        "slot_count": len(value["slot_ids"]),
        "runner_error_count": value["runner_error_count"],
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
        "task_5_6_complete": False,
    }


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "_execute-slot":
        try:
            value = _decode_json_bytes(sys.stdin.buffer.read(), "child stdin")
            _print_json(execute_vbd_trajectory_child(value))
            return 0
        except Exception:
            return 2
    if args.command == "plan":
        _print_json(vbd_trajectory_validation_plan())
        return 0
    if args.command == "runner-summary":
        _print_json(vbd_trajectory_validation_runner_summary())
        return 0
    if args.command == "smoke":
        artifact = run_vbd_trajectory_smoke_artifact()
        _print_json(
            {
                "state": artifact["evidence_status"]["state"],
                "hold_reasons": artifact["evidence_status"]["failing_checks"],
                "artifact_self_hash": artifact["hash_bindings"][
                    "artifact_self_hash"
                ],
                "acceptance_slot_key": None,
                "aggregate_acceptance_gate_computed": False,
                "internal_only": True,
                "synthetic_only": True,
                "customer_output_authorized": False,
                "task_5_6_complete": False,
            }
        )
        return 0
    if args.command == "build-freeze-manifest":
        _print_json(
            build_vbd_trajectory_freeze_manifest(
                implementation_review_refs={
                    "CODE": args.code_review_ref,
                    "BUG": args.bug_review_ref,
                    "ADVERSARIAL": args.adversarial_review_ref,
                    "STATISTICAL_METHODOLOGY": args.statistical_review_ref,
                }
            )
        )
        return 0
    if args.command == "initialize":
        workspace = initialize_vbd_trajectory_validation_workspace(
            args.workspace,
            freeze_manifest_path=args.freeze_manifest,
            concordance_receipt_path=args.concordance_receipt,
        )
        _print_json(
            {
                "workspace": str(workspace),
                "state": "INITIALIZED",
                "internal_only": True,
                "synthetic_only": True,
                "customer_output_authorized": False,
            }
        )
        return 0
    if args.command == "run-canary":
        value = run_vbd_trajectory_validation_canary(
            canary_index=args.canary_index, workspace_dir=args.workspace
        )
        _print_json(value)
        return 0 if value["state"] == "PASS" else 2
    if args.command.startswith("run-"):
        phase = "recomputation" if "recomputation" in args.command else "original"
        if args.command.endswith("-chunk"):
            value = run_vbd_trajectory_validation_chunk(
                phase=phase,
                chunk_index=args.chunk_index,
                workspace_dir=args.workspace,
            )
            summary = _chunk_summary(value)
            _print_json(summary)
            return 0 if summary["runner_error_count"] == 0 else 2
        chunks = run_vbd_trajectory_validation_phase(
            phase=phase, workspace_dir=args.workspace
        )
        runner_errors = sum(value["runner_error_count"] for value in chunks)
        _print_json(
            {
                "phase": phase,
                "chunk_count": len(chunks),
                "slot_count": sum(len(value["slot_ids"]) for value in chunks),
                "runner_error_count": runner_errors,
                "internal_only": True,
                "synthetic_only": True,
                "customer_output_authorized": False,
                "task_5_6_complete": False,
            }
        )
        return 0 if runner_errors == 0 else 2
    combined = combine_vbd_trajectory_validation_workspace(args.workspace)
    _print_json(combined)
    return 0 if combined["state"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
