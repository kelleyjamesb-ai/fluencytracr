#!/usr/bin/env python3
"""Validate and run fail-closed inference test shards."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ElementTree
from pathlib import Path, PurePosixPath
from typing import Any

SCHEMA_VERSION = "FT_INFERENCE_TEST_SHARDS_2026_07_V1"
SHARD_NAMES = (
    "foundation-measurement",
    "longitudinal",
    "vbd-engine",
)
EXPECTED_TEST_COUNTS = {
    "foundation-measurement": 332,
    "longitudinal": 253,
    "vbd-engine": 421,
}
_TOP_LEVEL_KEYS = frozenset({"schema_version", "shards"})
_TEST_FILENAME = re.compile(r"(?:test_[a-z0-9_]+|[a-z0-9_]+_test)\.py\Z")
_DEFAULT_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_MANIFEST_PATH = Path(__file__).with_name("test_shards.json")


class ShardManifestError(ValueError):
    """Raised when the shard manifest does not cover the test suite exactly."""


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ShardManifestError(f"duplicate JSON key: {key}")
        value[key] = item
    return value


def _load_json(path: Path) -> Any:
    try:
        return json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
        )
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ShardManifestError(f"cannot read shard manifest: {error}") from error


def _validate_test_path(value: Any) -> str:
    if type(value) is not str:
        raise ShardManifestError("shard entries must be strings")
    pure = PurePosixPath(value)
    if (
        not value
        or value != pure.as_posix()
        or pure.is_absolute()
        or len(pure.parts) != 1
        or pure.parts[0] in {".", ".."}
        or _TEST_FILENAME.fullmatch(pure.name) is None
    ):
        raise ShardManifestError(f"invalid test path: {value!r}")
    return value


def _expected_shard(relative_path: str) -> str:
    if relative_path.startswith("test_vbd_trajectory_"):
        return "vbd-engine"
    if relative_path.startswith("test_longitudinal_"):
        return "longitudinal"
    return "foundation-measurement"


def load_validated_shards(
    *,
    repo_root: Path = _DEFAULT_REPO_ROOT,
    manifest_path: Path = _DEFAULT_MANIFEST_PATH,
) -> dict[str, tuple[Path, ...]]:
    """Return exact shard paths after proving complete, unique test coverage."""

    if tuple(EXPECTED_TEST_COUNTS) != SHARD_NAMES or any(
        type(count) is not int or count <= 0
        for count in EXPECTED_TEST_COUNTS.values()
    ):
        raise ShardManifestError("compiled shard test counts are invalid")

    repo_root = repo_root.resolve(strict=True)
    tests_root = repo_root / "inference" / "tests"
    if not tests_root.is_dir() or tests_root.is_symlink():
        raise ShardManifestError("inference test root must be a real directory")
    for current_root, directory_names, filenames in os.walk(
        tests_root, followlinks=False
    ):
        current_path = Path(current_root)
        for child_name in (*directory_names, *filenames):
            child_path = current_path / child_name
            if child_path.is_symlink():
                raise ShardManifestError(
                    f"inference test tree contains a symlink: "
                    f"{child_path.relative_to(tests_root).as_posix()!r}"
                )

    manifest = _load_json(manifest_path)
    if type(manifest) is not dict or frozenset(manifest) != _TOP_LEVEL_KEYS:
        raise ShardManifestError("shard manifest top-level keys are invalid")
    if manifest["schema_version"] != SCHEMA_VERSION:
        raise ShardManifestError("shard manifest schema version is invalid")

    raw_shards = manifest["shards"]
    if type(raw_shards) is not dict or tuple(raw_shards) != SHARD_NAMES:
        raise ShardManifestError("shard names or ordering are invalid")

    owners: dict[str, str] = {}
    shards: dict[str, tuple[Path, ...]] = {}
    for shard_name in SHARD_NAMES:
        raw_paths = raw_shards[shard_name]
        if type(raw_paths) is not list:
            raise ShardManifestError(f"shard {shard_name!r} must be a list")
        if not raw_paths:
            raise ShardManifestError(
                f"shard {shard_name!r} must contain at least one test file"
            )
        relative_paths = [_validate_test_path(path) for path in raw_paths]
        if relative_paths != sorted(relative_paths):
            raise ShardManifestError(f"shard {shard_name!r} is not sorted")

        absolute_paths: list[Path] = []
        for relative_path in relative_paths:
            previous_owner = owners.get(relative_path)
            if previous_owner is not None:
                raise ShardManifestError(
                    f"test {relative_path!r} appears in both "
                    f"{previous_owner!r} and {shard_name!r}"
                )
            expected_shard = _expected_shard(relative_path)
            if shard_name != expected_shard:
                raise ShardManifestError(
                    f"test {relative_path!r} must be assigned to {expected_shard!r}"
                )
            owners[relative_path] = shard_name
            absolute_path = tests_root / relative_path
            if not absolute_path.is_file() or absolute_path.is_symlink():
                raise ShardManifestError(
                    f"assigned test is not a real file: {relative_path!r}"
                )
            absolute_paths.append(absolute_path)
        shards[shard_name] = tuple(absolute_paths)

    discovered = {
        path.relative_to(tests_root).as_posix()
        for pattern in ("test_*.py", "*_test.py")
        for path in tests_root.rglob(pattern)
        if path.is_file()
    }
    assigned = set(owners)
    missing = sorted(discovered - assigned)
    stale = sorted(assigned - discovered)
    if missing or stale:
        raise ShardManifestError(
            f"shard coverage is incomplete: missing={missing!r}, stale={stale!r}"
        )
    return shards


def _junit_count(value: str | None, *, name: str) -> int:
    if value is None or re.fullmatch(r"0|[1-9][0-9]*", value) is None:
        raise ShardManifestError(f"pytest JUnit {name!r} count is invalid")
    return int(value)


def _validate_pytest_report(report_path: Path, *, shard_name: str) -> None:
    try:
        root = ElementTree.parse(report_path).getroot()
    except (OSError, ElementTree.ParseError) as error:
        raise ShardManifestError(f"cannot read pytest JUnit report: {error}") from error
    suites = list(root)
    if root.tag != "testsuites" or len(suites) != 1 or suites[0].tag != "testsuite":
        raise ShardManifestError("pytest JUnit report shape is invalid")
    suite = suites[0]
    counts = {
        name: _junit_count(suite.get(name), name=name)
        for name in ("tests", "failures", "errors", "skipped")
    }
    expected_tests = EXPECTED_TEST_COUNTS[shard_name]
    if counts != {
        "tests": expected_tests,
        "failures": 0,
        "errors": 0,
        "skipped": 0,
    }:
        raise ShardManifestError(
            f"pytest JUnit totals are not exact for {shard_name!r}: "
            f"expected_tests={expected_tests}, observed={counts!r}"
        )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("validate", help="validate exact shard coverage")
    subparsers.add_parser("matrix", help="emit the validated GitHub matrix")
    run_parser = subparsers.add_parser("run", help="validate and run one shard")
    run_parser.add_argument("shard", choices=SHARD_NAMES)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        shards = load_validated_shards()
    except ShardManifestError as error:
        print(f"inference shard validation failed: {error}", file=sys.stderr)
        return 2

    total = sum(len(paths) for paths in shards.values())
    if args.command == "validate":
        counts = ", ".join(f"{name}={len(shards[name])}" for name in SHARD_NAMES)
        print(f"validated {total} inference test files: {counts}")
        return 0
    if args.command == "matrix":
        print(json.dumps(list(shards), separators=(",", ":")))
        return 0

    selected = shards[args.shard]
    relative_paths = [str(path.relative_to(_DEFAULT_REPO_ROOT)) for path in selected]
    print(f"running shard {args.shard!r} with {len(selected)} test files", flush=True)
    with tempfile.TemporaryDirectory(prefix="fluencytracr-inference-pytest-") as temp:
        report_path = Path(temp) / "report.xml"
        completed = subprocess.run(
            [
                sys.executable,
                "-m",
                "pytest",
                "-q",
                "--durations=25",
                f"--junitxml={report_path}",
                *relative_paths,
            ],
            cwd=_DEFAULT_REPO_ROOT,
            check=False,
        )
        if completed.returncode != 0:
            return completed.returncode
        try:
            _validate_pytest_report(report_path, shard_name=args.shard)
        except ShardManifestError as error:
            print(f"inference shard result validation failed: {error}", file=sys.stderr)
            return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
