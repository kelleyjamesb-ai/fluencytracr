"""CLI for the fixed synthetic AI Fluency measurement calibration study."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Sequence

from .ai_fluency_measurement_calibration_artifact import (
    run_measurement_calibration_proof,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the internal synthetic AI Fluency measurement calibration proof."
    )
    parser.add_argument(
        "--mode",
        choices=("smoke", "full"),
        default="smoke",
        help="smoke is fast and always HOLD; full runs the fixed >=200-replication plan",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.mode == "full":
        print(
            "full evidence requires ai_fluency_measurement_calibration_resumable_cli",
            file=sys.stderr,
        )
        return 2
    artifact = run_measurement_calibration_proof(execution_mode=args.mode)
    print(json.dumps(artifact, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
