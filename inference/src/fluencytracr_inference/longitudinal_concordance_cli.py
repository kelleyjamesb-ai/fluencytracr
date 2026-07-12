"""Stdout-only CLI for longitudinal concordance planning and execution."""

from __future__ import annotations

import argparse
import json

from .longitudinal_concordance import (
    longitudinal_concordance_plan,
    required_longitudinal_concordance_slots,
    run_longitudinal_concordance_slot,
)
from .longitudinal_concordance_artifact import (
    run_longitudinal_concordance_artifact,
)


def _slot_by_id(slot_id: str):
    slots = {slot.slot_id: slot for slot in required_longitudinal_concordance_slots()}
    try:
        return slots[slot_id]
    except KeyError as exc:
        raise ValueError("slot-id is not in the compiled concordance plan") from exc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m fluencytracr_inference.longitudinal_concordance_cli",
        description=(
            "Plan or run synthetic-only longitudinal state-space/NUTS "
            "concordance. JSON is written to stdout only."
        ),
    )
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--plan", action="store_true")
    action.add_argument("--slot-id")
    action.add_argument("--smoke-artifact", action="store_true")
    action.add_argument("--full-artifact", action="store_true")
    parser.add_argument("--mode", choices=("full", "smoke"))
    parser.add_argument("--generated-at")
    args = parser.parse_args(argv)

    if args.plan:
        output = longitudinal_concordance_plan()
    elif args.slot_id is not None:
        if args.mode is None:
            parser.error("--slot-id requires --mode full or smoke")
        output = run_longitudinal_concordance_slot(
            _slot_by_id(args.slot_id), mode=args.mode
        ).to_dict()
    else:
        if args.mode is not None:
            parser.error("--mode is valid only with --slot-id")
        artifact, _report = run_longitudinal_concordance_artifact(
            mode="full" if args.full_artifact else "smoke",
            generated_at=args.generated_at,
        )
        output = artifact
    print(json.dumps(output, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
