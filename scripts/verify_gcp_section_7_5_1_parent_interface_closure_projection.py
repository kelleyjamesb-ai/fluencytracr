#!/usr/bin/env python3
"""Offline verifier for the bounded Section 7.5.1 parent-interface projection."""

from __future__ import annotations

import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


REGISTRY_PATH = (
    "docs/contracts/canonical-inference-gcp-transport-persistence-constraints/"
    "constraints-open-obligations-contract.json"
)
PROJECTION_PATH = (
    "docs/contracts/canonical-inference-gcp-transport-persistence-constraints/"
    "section-7-5-1-parent-interface-closure-projection.json"
)
EXPECTED_REGISTRY_SHA256 = (
    "2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0"
)
EXPECTED_CANONICAL_PROJECTION_SHA256 = (
    "ca2205c2c8ef69222db4815abc988dc318cb0cb9cbc2e13dd119c6ead8eefad4"
)
EXPECTED_SOURCE_CONTRACTS = (
    (
        "SECTION_7_2",
        "docs/contracts/canonical-inference-gcp-runtime-object/"
        "runtime-object-contract.json",
        "9bd511fd7c859413fd599fa6bfc10e35534a532e7557df3f1a036017673c2474",
    ),
    (
        "SECTION_7_3",
        "docs/contracts/canonical-inference-gcp-security-authority/"
        "security-authority-contract.json",
        "3e49066b8f9080cb7b3abb43f339d45061d4db8581aac9c25419846857da0061",
    ),
    (
        "SECTION_7_3",
        "docs/contracts/canonical-inference-gcp-security-authority/"
        "role-capability-matrix.json",
        "90209f2c60018205a3479ca38981cf8738d17813fa4e6ade4b72407bf4a8ca17",
    ),
    (
        "SECTION_7_4",
        "docs/contracts/canonical-inference-gcp-attestation-receipt/"
        "attestation-receipt-contract.json",
        "3d72985a84f538c66ee16bba2f90f894fa6f0919c4ab39b0f7926b323c49e8f8",
    ),
)
EXPECTED_CLOSURES = (
    ("S75A-P00", "SECTION_7_2_PARENT_INTERFACE", "SECTION_7_2"),
    ("S75A-P01", "SECTION_7_3_PARENT_ADMISSION", "SECTION_7_3"),
    ("S75A-P02", "SECTION_7_3_PARENT_ADMISSION", "SECTION_7_3"),
    ("S75A-P03", "SECTION_7_4_PARENT_APPROVAL", "SECTION_7_4"),
    ("S75A-P05", "SECTION_7_3_PARENT_ADMISSION", "SECTION_7_3"),
    ("S75A-P05", "SECTION_7_4_PARENT_VERIFICATION_TIME", "SECTION_7_4"),
    ("S75A-P06", "SECTION_7_3_PARENT_ADMISSION", "SECTION_7_3"),
    ("S75A-P07", "SECTION_7_4_PARENT_VERIFICATION_TIME", "SECTION_7_4"),
    ("S75A-P08", "SECTION_7_3_PARENT_ADMISSION", "SECTION_7_3"),
    ("S75A-P14", "SECTION_7_4_PARENT_APPROVAL", "SECTION_7_4"),
    ("S75A-P19", "SECTION_7_3_PARENT_ADMISSION", "SECTION_7_3"),
    ("S75A-P19", "SECTION_7_4_APPROVAL_ONLY", "SECTION_7_4"),
)
EXPECTED_FUTURE_FULL_SECTION_7_5_COMPONENT_IDS = (
    "S75A-P04",
    "S75A-P05",
    "S75A-P07",
    "S75A-P08",
    "S75A-P09",
    "S75A-P10",
    "S75A-P11",
    "S75A-P12",
    "S75A-P13",
    "S75A-P18",
    "S75A-P19",
)
EXPECTED_EXPLICIT_UNCLOSED_IDS = (
    "S75A-P04",
    "S75A-P09",
    "S75A-P10",
    "S75A-P11",
    "S75A-P12",
    "S75A-P13",
    "S75A-P15",
    "S75A-P16",
    "S75A-P17",
    "S75A-P18",
)


class ProjectionValidationError(ValueError):
    """The closure projection is not the exact nonauthorizing contract."""


def _load_object(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ProjectionValidationError(f"{label} is unreadable") from exc
    if not isinstance(value, dict):
        raise ProjectionValidationError(f"{label} must be an object")
    return value


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical_sha256(value: Any) -> str:
    canonical = json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return _sha256(canonical)


def _expected_projection() -> dict[str, Any]:
    return {
        "actual_evidence": {
            "aliases_present": False,
            "approvals_present": False,
            "live_evidence_present": False,
        },
        "authority_effect": "NONE",
        "canonicalization_version": "FT_CANONICAL_JSON_V1",
        "decision": (
            "SECTION_7_5_1_PARENT_INTERFACES_CLOSED_"
            "FULL_SECTION_7_5_CONTRACT_OPEN_BLOCKING"
        ),
        "forbidden_parent_interface_portions": [
            {
                "portion": "SECTION_7_3_PARENT_ADMISSION",
                "prerequisite_id": "S75A-P07",
            },
            {
                "portion": "SECTION_7_4_PARENT_APPROVAL",
                "prerequisite_id": "S75A-P08",
            },
        ],
        "live_runtime": {
            "command": "NOT_AUTHORIZED",
            "expected_exit": "NOT_RUN",
        },
        "parent_interface_closures": [
            {
                "closure_state": "DOCUMENTATION_INTERFACE_CLOSED",
                "owner": owner,
                "portion": portion,
                "prerequisite_id": prerequisite_id,
            }
            for prerequisite_id, portion, owner in EXPECTED_CLOSURES
        ],
        "registry": {
            "canonical_projection_sha256": EXPECTED_CANONICAL_PROJECTION_SHA256,
            "path": REGISTRY_PATH,
            "sha256": EXPECTED_REGISTRY_SHA256,
        },
        "remaining_open_blocking": {
            "explicit_unclosed_prerequisite_ids": list(
                EXPECTED_EXPLICIT_UNCLOSED_IDS
            ),
            "full_section_7_5_contract_state": "OPEN_BLOCKING",
            "future_full_section_7_5_component_ids": list(
                EXPECTED_FUTURE_FULL_SECTION_7_5_COMPONENT_IDS
            ),
            "registry_prerequisite_states_unchanged": True,
        },
        "schema_version": (
            "GCP_SECTION_7_5_1_PARENT_INTERFACE_CLOSURE_PROJECTION_V1"
        ),
        "source_contracts": [
            {"owner": owner, "path": path, "sha256": sha256}
            for owner, path, sha256 in EXPECTED_SOURCE_CONTRACTS
        ],
    }


def _derive_registry_projection(registry: dict[str, Any]) -> dict[str, Any]:
    rows = registry.get("open_prerequisite_registry")
    edges = registry.get("prerequisite_edge_registry")
    if not isinstance(rows, list) or not isinstance(edges, dict):
        raise ProjectionValidationError("registry projection inputs are malformed")
    try:
        prerequisite_rows = [
            {
                "prerequisite_id": row["prerequisite_id"],
                "owner": row["owner"],
                "registry_state": row["current_state"],
            }
            for row in rows
        ]
        forward_edges = edges["forward_edges"]
        reverse_edges = edges["reverse_edges"]
    except (KeyError, TypeError) as exc:
        raise ProjectionValidationError("registry projection inputs are incomplete") from exc
    expected_ids = [f"S75A-P{index:02d}" for index in range(20)]
    if [row["prerequisite_id"] for row in prerequisite_rows] != expected_ids:
        raise ProjectionValidationError(
            "registry must contain exact ordered P00-P19 prerequisites"
        )
    if any(row["registry_state"] != "OPEN_BLOCKING" for row in prerequisite_rows):
        raise ProjectionValidationError("registry prerequisite state drift")
    if not isinstance(forward_edges, dict) or not isinstance(reverse_edges, dict):
        raise ProjectionValidationError("registry edge sets must be objects")
    return {
        "prerequisite_rows": prerequisite_rows,
        "forward_edges": forward_edges,
        "reverse_edges": reverse_edges,
    }


def validate_projection(repo_root: Path | str) -> dict[str, Any]:
    """Validate all source bytes and return the projection plus derived rows."""

    root = Path(repo_root)
    projection = _load_object(root / PROJECTION_PATH, "closure projection")
    expected = _expected_projection()
    if projection != expected:
        raise ProjectionValidationError(
            "closure projection differs from the closed schema or values"
        )

    registry_path = root / REGISTRY_PATH
    try:
        registry_bytes = registry_path.read_bytes()
    except OSError as exc:
        raise ProjectionValidationError("registry is unreadable") from exc
    if _sha256(registry_bytes) != EXPECTED_REGISTRY_SHA256:
        raise ProjectionValidationError("registry byte hash mismatch")
    registry = _load_object(registry_path, "registry")
    derived = _derive_registry_projection(registry)
    if _canonical_sha256(derived) != EXPECTED_CANONICAL_PROJECTION_SHA256:
        raise ProjectionValidationError(
            "registry owner, state, or forward/reverse edge projection drift"
        )

    for _owner, relative_path, expected_sha256 in EXPECTED_SOURCE_CONTRACTS:
        try:
            source_bytes = (root / relative_path).read_bytes()
        except OSError as exc:
            raise ProjectionValidationError(
                f"source contract is unreadable: {relative_path}"
            ) from exc
        if _sha256(source_bytes) != expected_sha256:
            raise ProjectionValidationError(
                f"source contract hash mismatch: {relative_path}"
            )

    validated = copy.deepcopy(projection)
    validated["registry_rows"] = derived["prerequisite_rows"]
    return validated


def main() -> int:
    try:
        validate_projection(Path(__file__).resolve().parents[1])
    except ProjectionValidationError as exc:
        print(f"Section 7.5.1 closure projection verification failed: {exc}", file=sys.stderr)
        return 1
    print("Section 7.5.1 parent-interface closure projection verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
