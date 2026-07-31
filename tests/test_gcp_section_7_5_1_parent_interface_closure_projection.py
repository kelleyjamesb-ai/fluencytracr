from __future__ import annotations

import copy
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

import pytest

from scripts.verify_gcp_section_7_5_1_parent_interface_closure_projection import (
    PROJECTION_PATH,
    REGISTRY_PATH,
    ProjectionValidationError,
    validate_projection,
)


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_REGISTRY_SHA256 = (
    "2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0"
)
EXPECTED_PARENT_CLOSURES = {
    ("S75A-P00", "SECTION_7_2_PARENT_INTERFACE"),
    ("S75A-P01", "SECTION_7_3_PARENT_ADMISSION"),
    ("S75A-P02", "SECTION_7_3_PARENT_ADMISSION"),
    ("S75A-P03", "SECTION_7_4_PARENT_APPROVAL"),
    ("S75A-P05", "SECTION_7_3_PARENT_ADMISSION"),
    ("S75A-P05", "SECTION_7_4_PARENT_VERIFICATION_TIME"),
    ("S75A-P06", "SECTION_7_3_PARENT_ADMISSION"),
    ("S75A-P07", "SECTION_7_4_PARENT_VERIFICATION_TIME"),
    ("S75A-P08", "SECTION_7_3_PARENT_ADMISSION"),
    ("S75A-P14", "SECTION_7_4_PARENT_APPROVAL"),
    ("S75A-P19", "SECTION_7_3_PARENT_ADMISSION"),
    ("S75A-P19", "SECTION_7_4_APPROVAL_ONLY"),
}
SOURCE_PATHS = (
    "docs/contracts/canonical-inference-gcp-runtime-object/runtime-object-contract.json",
    "docs/contracts/canonical-inference-gcp-security-authority/security-authority-contract.json",
    "docs/contracts/canonical-inference-gcp-security-authority/role-capability-matrix.json",
    "docs/contracts/canonical-inference-gcp-attestation-receipt/attestation-receipt-contract.json",
)


def _load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _copy_verifier_inputs(tmp_path: Path) -> Path:
    for relative_path in (REGISTRY_PATH, PROJECTION_PATH, *SOURCE_PATHS):
        source = ROOT / relative_path
        target = tmp_path / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    return tmp_path


def test_projection_closes_only_documentation_parent_interfaces_and_stays_silent(
    capsys: pytest.CaptureFixture[str],
) -> None:
    projection = validate_projection(ROOT)

    assert capsys.readouterr() == ("", "")
    assert projection["registry"]["sha256"] == EXPECTED_REGISTRY_SHA256
    assert {
        (row["prerequisite_id"], row["portion"])
        for row in projection["parent_interface_closures"]
    } == EXPECTED_PARENT_CLOSURES
    assert {
        row["prerequisite_id"] for row in projection["registry_rows"]
    } == {f"S75A-P{index:02d}" for index in range(20)}
    assert {row["registry_state"] for row in projection["registry_rows"]} == {
        "OPEN_BLOCKING"
    }
    assert projection["decision"] == (
        "SECTION_7_5_1_PARENT_INTERFACES_CLOSED_"
        "FULL_SECTION_7_5_CONTRACT_OPEN_BLOCKING"
    )
    assert projection["authority_effect"] == "NONE"
    assert projection["live_runtime"] == {
        "command": "NOT_AUTHORIZED",
        "expected_exit": "NOT_RUN",
    }
    assert projection["actual_evidence"] == {
        "aliases_present": False,
        "approvals_present": False,
        "live_evidence_present": False,
    }


def test_registry_is_byte_pinned_and_unchanged_from_origin_main() -> None:
    registry = ROOT / REGISTRY_PATH

    assert hashlib.sha256(registry.read_bytes()).hexdigest() == EXPECTED_REGISTRY_SHA256
    result = subprocess.run(
        ["git", "diff", "--exit-code", "origin/main", "--", REGISTRY_PATH],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value["open_prerequisite_registry"][0].update(
            owner="SECTION_7_3"
        ),
        lambda value: value["open_prerequisite_registry"][0].update(
            current_state="CLOSED"
        ),
        lambda value: value["open_prerequisite_registry"].pop(),
        lambda value: value["open_prerequisite_registry"].append(
            copy.deepcopy(value["open_prerequisite_registry"][-1])
        ),
        lambda value: value["prerequisite_edge_registry"]["forward_edges"][
            "S75A-C-AUTHORITY"
        ].pop(),
        lambda value: value["prerequisite_edge_registry"]["reverse_edges"][
            "S75A-P00"
        ].pop(),
    ],
    ids=[
        "owner-drift",
        "state-drift",
        "missing-prerequisite",
        "extra-prerequisite",
        "forward-edge-drift",
        "reverse-edge-drift",
    ],
)
def test_verifier_rejects_registry_semantic_drift(
    tmp_path: Path,
    mutate: Callable[[dict[str, Any]], None],
) -> None:
    root = _copy_verifier_inputs(tmp_path)
    registry_path = root / REGISTRY_PATH
    registry = _load_json(registry_path)
    mutate(registry)
    _write_json(registry_path, registry)

    with pytest.raises(ProjectionValidationError):
        validate_projection(root)


def test_verifier_rejects_changed_registry_bytes(tmp_path: Path) -> None:
    root = _copy_verifier_inputs(tmp_path)
    registry_path = root / REGISTRY_PATH
    registry_path.write_bytes(registry_path.read_bytes() + b"\n")

    with pytest.raises(ProjectionValidationError, match="registry byte hash"):
        validate_projection(root)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value["source_contracts"][0].update(
            path="docs/contracts/wrong.json"
        ),
        lambda value: value["source_contracts"][0].update(sha256="0" * 64),
        lambda value: value["parent_interface_closures"][1].update(
            owner="SECTION_7_4"
        ),
        lambda value: value["parent_interface_closures"][0].update(
            closure_state="RUNTIME_SATISFIED"
        ),
        lambda value: value.update(authority_effect="AUTHORIZED"),
        lambda value: value.update(
            decision="SECTION_7_5_CONTRACT_CLOSED"
        ),
        lambda value: value.update(unknown_field=True),
    ],
    ids=[
        "wrong-source-path",
        "wrong-source-hash",
        "cross-owned-closure",
        "runtime-satisfaction",
        "live-authority",
        "full-section-7-5-closed-alias",
        "unknown-field",
    ],
)
def test_verifier_rejects_projection_claim_drift(
    tmp_path: Path,
    mutate: Callable[[dict[str, Any]], None],
) -> None:
    root = _copy_verifier_inputs(tmp_path)
    projection_path = root / PROJECTION_PATH
    projection = _load_json(projection_path)
    mutate(projection)
    _write_json(projection_path, projection)

    with pytest.raises(ProjectionValidationError):
        validate_projection(root)


@pytest.mark.parametrize(
    ("prerequisite_id", "portion"),
    [
        ("S75A-P07", "SECTION_7_3_PARENT_ADMISSION"),
        ("S75A-P08", "SECTION_7_4_PARENT_APPROVAL"),
    ],
)
def test_verifier_rejects_forbidden_cross_parent_portions(
    tmp_path: Path,
    prerequisite_id: str,
    portion: str,
) -> None:
    root = _copy_verifier_inputs(tmp_path)
    projection_path = root / PROJECTION_PATH
    projection = _load_json(projection_path)
    projection["parent_interface_closures"].append(
        {
            "prerequisite_id": prerequisite_id,
            "portion": portion,
            "owner": portion.split("_PARENT", 1)[0],
            "closure_state": "DOCUMENTATION_INTERFACE_CLOSED",
        }
    )
    _write_json(projection_path, projection)

    with pytest.raises(ProjectionValidationError):
        validate_projection(root)


def test_cli_emits_one_bounded_success_line() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/verify_gcp_section_7_5_1_parent_interface_closure_projection.py",
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert result.stderr == ""
    assert result.stdout == "Section 7.5.1 parent-interface closure projection verified.\n"
