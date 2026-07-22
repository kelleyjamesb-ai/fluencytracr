"""CLI for frozen, resumable VBD trajectory concordance execution."""

from __future__ import annotations

import argparse
import json
import os
import sys

from .vbd_trajectory_concordance import vbd_trajectory_concordance_plan
from .vbd_trajectory_concordance_execution import (
    _tag_child_failure_phase,
    build_vbd_trajectory_concordance_child_failure,
    emit_vbd_trajectory_concordance_child_phase,
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


def _take_diagnostic_fd() -> int:
    value = os.environ.pop("FT_VBD_TRAJECTORY_DIAGNOSTIC_FD", None)
    if value is None or not value.isascii() or not value.isdigit():
        return -1
    return int(value)


def _write_child_failure(diagnostic_fd: int, exc: BaseException) -> None:
    try:
        encoded = (
            json.dumps(
                build_vbd_trajectory_concordance_child_failure(exc),
                sort_keys=True,
                separators=(",", ":"),
                allow_nan=False,
            ).encode("ascii")
            + b"\n"
        )
        if len(encoded) > 512:
            return
        if diagnostic_fd >= 0:
            try:
                if os.write(diagnostic_fd, encoded) == len(encoded):
                    return
            except OSError:
                pass
        sys.stderr.buffer.write(encoded)
        sys.stderr.buffer.flush()
    except BaseException:
        pass


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
    raw_args = list(sys.argv[1:] if argv is None else argv)
    if raw_args and raw_args[0] == "_execute-bundle":
        diagnostic_fd = _take_diagnostic_fd()
        decoded = False
        active_phase = "child_entrypoint"
        try:
            emit_vbd_trajectory_concordance_child_phase(active_phase)
            if raw_args != ["_execute-bundle"]:
                raise ValueError("private child command arguments are invalid")
            active_phase = "stdin_decode"
            emit_vbd_trajectory_concordance_child_phase(active_phase)
            value = _decode_json_bytes(
                sys.stdin.buffer.read(), "concordance child stdin"
            )
            decoded = True
            result = execute_vbd_trajectory_concordance_child(value)
            try:
                emit_vbd_trajectory_concordance_child_phase("result_emit")
                _print_json(result)
            except BaseException as exc:
                _tag_child_failure_phase(exc, "result_emit")
                raise
            return 0
        except BaseException as exc:
            if not decoded:
                _tag_child_failure_phase(exc, active_phase)
            _write_child_failure(diagnostic_fd, exc)
            return 2
        finally:
            if diagnostic_fd >= 0:
                try:
                    os.close(diagnostic_fd)
                except OSError:
                    pass
    args = build_parser().parse_args(raw_args)
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
