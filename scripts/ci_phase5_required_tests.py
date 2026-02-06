#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "governance" / "phase5" / "REQUIRED_ENFORCEMENT_TESTS.md"
TEST_DIR = ROOT / "backend" / "tests"

GEM_ID = "GEM-TG5-12-ENFORCEMENT_VALIDITY_RULE"


def fail(message: str) -> None:
    raise SystemExit(f"Governance violation ({GEM_ID}): {message}")


def read_manifest() -> list[str]:
    if not MANIFEST.exists():
        fail("required enforcement test manifest missing")
    text = MANIFEST.read_text(encoding="utf-8")
    tests = []
    for line in text.splitlines():
        match = re.match(r"^\*\s+([A-Za-z0-9_\-]+\.test\.ts)\s*$", line.strip())
        if match:
            tests.append(match.group(1))
    if not tests:
        fail("required enforcement test manifest is empty")
    return tests


def ensure_presence(test_files: list[str]) -> list[Path]:
    missing = []
    paths: list[Path] = []
    for name in test_files:
        path = TEST_DIR / name
        if not path.exists():
            missing.append(name)
        else:
            paths.append(path)
    if missing:
        fail("required Phase 5 enforcement tests missing: " + ", ".join(missing))
    return paths


def run_required_tests(paths: list[Path]) -> None:
    cmd = [
        "npm",
        "test",
        "--workspace",
        "backend",
        "--",
        "--runTestsByPath",
        *[str(path) for path in paths],
        "--watchman=false",
    ]
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0:
        fail("required Phase 5 enforcement tests did not execute cleanly")


def main() -> None:
    tests = read_manifest()
    paths = ensure_presence(tests)
    run_required_tests(paths)
    print("Phase 5 required test guardrail ok")


if __name__ == "__main__":
    main()
