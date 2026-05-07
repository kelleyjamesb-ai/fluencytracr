#!/usr/bin/env python3
import re
import sys
from pathlib import Path

FILE = Path("CODEX_ENFORCEMENT_STATE.md")

REQUIRED_KEYS = [
    "state",
    "timestamp_utc",
    "authorizing_role",
    "commit_hash_activated",
    "v1_contract_reference",
]


def fail(msg: str) -> None:
    print(f"ENFORCEMENT_STATE_INVALID: {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if not FILE.exists():
        fail(f"Missing {FILE}")

    text = FILE.read_text(encoding="utf-8")

    # Simple "key: value" parser
    kv = {}
    for line in text.splitlines():
        line = line.strip()
        if (
            not line
            or line.startswith("#")
            or line.startswith("notes:")
            or line.startswith("-")
        ):
            continue
        match = re.match(r"^([a-zA-Z0-9_]+)\s*:\s*(.*)$", line)
        if match:
            kv[match.group(1)] = match.group(2).strip()

    for key in REQUIRED_KEYS:
        if key not in kv:
            fail(f"Missing required field '{key}'")

    state = kv["state"]
    if state not in ("OFF", "ON"):
        fail("state must be OFF or ON")

    if not re.match(
        r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", kv["timestamp_utc"]
    ):
        fail("timestamp_utc must be RFC3339 UTC, example 2026-02-01T00:00:00Z")

    if kv["authorizing_role"] != "Sentinel":
        fail("authorizing_role must be Sentinel")

    commit_hash = kv["commit_hash_activated"]
    if state == "OFF":
        if commit_hash:
            fail("commit_hash_activated must be blank when state is OFF")
    else:
        if not re.match(r"^[0-9a-f]{7,40}$", commit_hash):
            fail("commit_hash_activated must be a git commit hash when state is ON")

    contract_ref = kv["v1_contract_reference"]
    if not contract_ref:
        fail("v1_contract_reference must be non-empty")

    if not Path(contract_ref).exists():
        fail(f"v1_contract_reference file not found at '{contract_ref}'")

    print("ENFORCEMENT_STATE_OK")


if __name__ == "__main__":
    main()
