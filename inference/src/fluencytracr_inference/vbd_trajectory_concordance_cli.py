"""CLI for frozen, resumable VBD trajectory concordance execution."""

from __future__ import annotations

import argparse
import json
import sys

from .vbd_trajectory_concordance import vbd_trajectory_concordance_plan
from .vbd_trajectory_concordance_execution import (
    execute_vbd_trajectory_concordance_child,
)
from .vbd_trajectory_concordance_resumable import (
    combine_vbd_trajectory_concordance_workspace,
    initialize_vbd_trajectory_concordance_workspace,
    run_vbd_trajectory_concordance,
    run_vbd_trajectory_concordance_bundle,
)
from .vbd_trajectory_validation_resumable import _decode_json_bytes


def _print_json(value: object) -> None:
    print(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the frozen internal synthetic VBD concordance plan."
    )
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("plan", help="Print the exact 30-bundle plan.")
    initialize = commands.add_parser(
        "initialize", help="Create the external frozen concordance workspace."
    )
    initialize.add_argument("--workspace", required=True)
    bundle = commands.add_parser(
        "run-bundle", help="Run or resume one primary/recomputation bundle."
    )
    bundle.add_argument("--workspace", required=True)
    bundle.add_argument("--bundle-index", required=True, type=int)
    run = commands.add_parser("run", help="Run or resume all 30 bundles.")
    run.add_argument("--workspace", required=True)
    combine = commands.add_parser(
        "combine", help="Recompute and publish the sanitized PASS receipt."
    )
    combine.add_argument("--workspace", required=True)
    commands.add_parser("_execute-bundle", help=argparse.SUPPRESS)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "_execute-bundle":
        try:
            value = _decode_json_bytes(
                sys.stdin.buffer.read(), "concordance child stdin"
            )
            _print_json(execute_vbd_trajectory_concordance_child(value))
            return 0
        except Exception:
            return 2
    if args.command == "plan":
        _print_json(vbd_trajectory_concordance_plan())
        return 0
    if args.command == "initialize":
        workspace = initialize_vbd_trajectory_concordance_workspace(
            args.workspace
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
    if args.command == "run-bundle":
        result = run_vbd_trajectory_concordance_bundle(
            args.workspace, args.bundle_index
        )
        _print_json(result)
        return 0 if result["state"] == "PASS" else 2
    if args.command == "run":
        results = run_vbd_trajectory_concordance(args.workspace)
        _print_json(
            {
                "bundle_count": len(results),
                "pass_count": sum(result["state"] == "PASS" for result in results),
                "internal_only": True,
                "synthetic_only": True,
                "customer_output_authorized": False,
            }
        )
        return 0 if all(result["state"] == "PASS" for result in results) else 2
    receipt = combine_vbd_trajectory_concordance_workspace(args.workspace)
    _print_json(receipt)
    return 0 if receipt["state"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
