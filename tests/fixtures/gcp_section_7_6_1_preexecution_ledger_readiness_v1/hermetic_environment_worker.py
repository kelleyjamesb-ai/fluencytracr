"""Stdlib-only worker for Section 7.6.1 readiness environment cells."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import socket
import sys


def _network_forbidden(*_args: object, **_kwargs: object) -> object:
    raise RuntimeError("network access is forbidden in readiness environments")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--root", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--mode", required=True, choices=("CLEAN_CI", "ARCHIVE_CLOSEOUT"))
    args = parser.parse_args()
    repo = Path(args.repo).resolve(strict=True)
    root = Path(args.root).resolve(strict=True)
    candidate = json.loads(Path(args.candidate).read_text(encoding="utf-8"))
    fixture_path = repo / "tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/packet-rules.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    trusted_path = root / fixture["synthetic_trusted_context_root"]["path"]
    trusted_context = json.loads(trusted_path.read_text(encoding="utf-8"))
    paths = [repo / path for path in fixture["sut_paths"]]
    if not all(path.is_file() for path in paths):
        print("MISSING_SUT")
        return 86
    socket.socket = _network_forbidden  # type: ignore[assignment]
    spec = importlib.util.spec_from_file_location("gcp_s761_future_sut", paths[-1])
    if spec is None or spec.loader is None:
        print("MISSING_SUT")
        return 86
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = module.evaluate_candidate(
        root,
        candidate,
        mode=args.mode,
        state={},
        interleaving=None,
        trusted_context=trusted_context,
    )
    if not isinstance(result, str):
        return 87
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
