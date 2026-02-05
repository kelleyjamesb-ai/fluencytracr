#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVACY = ROOT / "shared" / "src" / "privacy.ts"

SCHEMA_DIRS = [
    ROOT / "backend" / "src" / "contracts",
    ROOT / "shared",
]


def fail(message: str) -> None:
    raise SystemExit(f"TG5 schema forbidden-key gate failed: {message}")


def read_text(path: Path) -> str:
    if not path.exists():
        fail(f"missing required file: {path}")
    return path.read_text(encoding="utf-8")


def parse_governance_forbidden() -> list[str]:
    text = read_text(PRIVACY)
    match = re.search(r"GOVERNANCE_FORBIDDEN_FIELDS\s*=\s*\[(.*?)\]", text, re.S)
    if not match:
        fail("GOVERNANCE_FORBIDDEN_FIELDS not found in shared/src/privacy.ts")
    body = match.group(1)
    items = re.findall(r"\"([^\"]+)\"", body)
    if not items:
        fail("GOVERNANCE_FORBIDDEN_FIELDS is empty")
    return items


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON schema {path}: {exc}")


def find_forbidden_keys(schema: dict, forbidden: set[str]) -> list[str]:
    hits: list[str] = []

    def walk(node: object) -> None:
        if isinstance(node, dict):
            if "properties" in node and isinstance(node["properties"], dict):
                for key in node["properties"].keys():
                    if key in forbidden:
                        hits.append(key)
            if "required" in node and isinstance(node["required"], list):
                for key in node["required"]:
                    if isinstance(key, str) and key in forbidden:
                        hits.append(key)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(schema)
    return sorted(set(hits))


def main() -> None:
    forbidden = set(parse_governance_forbidden())
    if not forbidden:
        fail("no forbidden keys parsed")

    schema_files: list[Path] = []
    for directory in SCHEMA_DIRS:
        if not directory.exists():
            continue
        schema_files.extend(directory.rglob("*.schema.json"))

    if not schema_files:
        fail("no schema files found to scan")

    violations: list[str] = []
    for schema_path in schema_files:
        schema = load_json(schema_path)
        hits = find_forbidden_keys(schema, forbidden)
        if hits:
            violations.append(f"{schema_path}: {', '.join(hits)}")

    if violations:
        fail("forbidden keys detected in schemas:\n" + "\n".join(violations))

    print("TG5 schema forbidden-key gate ok")


if __name__ == "__main__":
    main()
