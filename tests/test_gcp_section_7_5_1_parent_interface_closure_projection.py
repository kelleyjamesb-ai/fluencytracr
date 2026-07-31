from __future__ import annotations

import base64
import copy
import hashlib
import importlib.util
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


def _load_verifier_module(relative_path: str, module_name: str) -> Any:
    spec = importlib.util.spec_from_file_location(module_name, ROOT / relative_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(ROOT / "scripts"))
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path.pop(0)
    return module


def _canonical_json(value: dict[str, Any]) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def _target_record(
    schema: dict[str, Any],
    target_identity_bytes: bytes,
) -> dict[str, Any]:
    record = {
        "schema_version": schema["schema_version"],
        "contract_kind": schema["contract_kind"],
        "contract_domain_separator": schema["domain_separator"],
        "canonical_contract_bytes_base64": base64.b64encode(
            target_identity_bytes
        ).decode("ascii"),
        "canonical_contract_bytes_sha256": hashlib.sha256(
            target_identity_bytes
        ).hexdigest(),
    }
    record["target_binding_sha256"] = hashlib.sha256(
        schema["target_binding_domain_separator"].encode("ascii")
        + b"\x00"
        + _canonical_json(record)
    ).hexdigest()
    return record


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


def test_registry_is_byte_pinned_without_requiring_a_remote_ref() -> None:
    registry = ROOT / REGISTRY_PATH

    assert hashlib.sha256(registry.read_bytes()).hexdigest() == EXPECTED_REGISTRY_SHA256


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
    "relative_path",
    (PROJECTION_PATH, REGISTRY_PATH, *SOURCE_PATHS),
)
def test_verifier_rejects_symlinked_explicit_locator(
    tmp_path: Path,
    relative_path: str,
) -> None:
    root = _copy_verifier_inputs(tmp_path)
    locator = root / relative_path
    target = root / f"same-bytes-{hashlib.sha256(relative_path.encode()).hexdigest()}.json"
    target.write_bytes(locator.read_bytes())
    locator.unlink()
    locator.symlink_to(target)

    with pytest.raises(ProjectionValidationError, match="unreadable"):
        validate_projection(root)


def test_verifier_rejects_symlinked_registry_parent_component(
    tmp_path: Path,
) -> None:
    root = _copy_verifier_inputs(tmp_path)
    registry = root / REGISTRY_PATH
    component = registry.parent
    moved = root / "same-registry-parent"
    component.rename(moved)
    component.symlink_to(moved, target_is_directory=True)

    with pytest.raises(ProjectionValidationError, match="unreadable"):
        validate_projection(root)


@pytest.mark.parametrize(
    ("field", "forged_value"),
    [
        ("authority_effect", "AUTHORIZED"),
        ("decision", "SECTION_7_5_CONTRACT_CLOSED"),
    ],
)
def test_verifier_rejects_duplicate_projection_authority_keys(
    tmp_path: Path,
    field: str,
    forged_value: str,
) -> None:
    root = _copy_verifier_inputs(tmp_path)
    projection_path = root / PROJECTION_PATH
    legitimate_line = next(
        line
        for line in projection_path.read_text(encoding="utf-8").splitlines()
        if line.startswith(f'  "{field}": ')
    )
    raw = projection_path.read_text(encoding="utf-8")
    projection_path.write_text(
        raw.replace(
            legitimate_line,
            f'  "{field}": {json.dumps(forged_value)},\n{legitimate_line}',
            1,
        ),
        encoding="utf-8",
    )

    with pytest.raises(ProjectionValidationError, match="unreadable"):
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


def test_section_7_3_and_7_4_accept_the_same_closed_full_target_identity_bytes() -> None:
    section_7_3 = _load_verifier_module(
        "scripts/verify_gcp_security_authority_contract.py",
        "gcp73_shared_target_identity",
    )
    section_7_4 = _load_verifier_module(
        "scripts/verify_gcp_attestation_receipt_contract.py",
        "gcp74_shared_target_identity",
    )
    security_contract = _load_json(ROOT / SOURCE_PATHS[1])
    attestation_contract = _load_json(ROOT / SOURCE_PATHS[3])
    section_7_3_schema = security_contract[
        "section_7_5_authority_admission_interface"
    ]["full_section_7_5_target_schema"]
    section_7_4_schema = attestation_contract[
        "section_7_5_external_approval_interface"
    ]["full_section_7_5_target_schema"]
    identity_bytes = _canonical_json(
        {
            "canonical_contract_body_sha256": "a" * 64,
            "contract_domain_separator": (
                "FLUENCYTRACR:GCP_CANONICAL_RUNTIME:SECTION_7_5:V1"
            ),
            "contract_kind": "FULL_SECTION_7_5",
            "schema_version": "GCP_CANONICAL_RUNTIME_SECTION_7_5_FULL_V1",
        }
    )

    assert identity_bytes
    section_7_3.validate_full_section_7_5_target_record(
        _target_record(section_7_3_schema, identity_bytes),
        section_7_3_schema,
    )
    section_7_4.validate_full_section_7_5_external_approval_target_record(
        _target_record(section_7_4_schema, identity_bytes),
        section_7_4_schema,
    )


def test_both_parents_reject_noncanonical_base64_target_aliases() -> None:
    section_7_3 = _load_verifier_module(
        "scripts/verify_gcp_security_authority_contract.py",
        "gcp73_canonical_target_base64",
    )
    section_7_4 = _load_verifier_module(
        "scripts/verify_gcp_attestation_receipt_contract.py",
        "gcp74_canonical_target_base64",
    )
    security_contract = _load_json(ROOT / SOURCE_PATHS[1])
    attestation_contract = _load_json(ROOT / SOURCE_PATHS[3])
    section_7_3_schema = security_contract[
        "section_7_5_authority_admission_interface"
    ]["full_section_7_5_target_schema"]
    section_7_4_schema = attestation_contract[
        "section_7_5_external_approval_interface"
    ]["full_section_7_5_target_schema"]
    identity_bytes = _canonical_json(
        {
            "canonical_contract_body_sha256": "a" * 64,
            "contract_domain_separator": (
                "FLUENCYTRACR:GCP_CANONICAL_RUNTIME:SECTION_7_5:V1"
            ),
            "contract_kind": "FULL_SECTION_7_5",
            "schema_version": "GCP_CANONICAL_RUNTIME_SECTION_7_5_FULL_V1",
        }
    )
    canonical = base64.b64encode(identity_bytes).decode("ascii")
    assert canonical.endswith("==")
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    final_value = alphabet.index(canonical[-3])
    alias_value = (final_value & 0b110000) | ((final_value + 1) & 0b001111)
    aliased = canonical[:-3] + alphabet[alias_value] + "=="
    assert aliased != canonical
    assert base64.b64decode(aliased, validate=True) == identity_bytes

    for validator, schema in (
        (section_7_3.validate_full_section_7_5_target_record, section_7_3_schema),
        (
            section_7_4.validate_full_section_7_5_external_approval_target_record,
            section_7_4_schema,
        ),
    ):
        record = _target_record(schema, identity_bytes)
        record["canonical_contract_bytes_base64"] = aliased
        record["target_binding_sha256"] = hashlib.sha256(
            schema["target_binding_domain_separator"].encode("ascii")
            + b"\x00"
            + _canonical_json(
                {
                    key: value
                    for key, value in record.items()
                    if key != "target_binding_sha256"
                }
            )
        ).hexdigest()
        with pytest.raises(ValueError, match="canonical base64"):
            validator(record, schema)


def test_both_parents_reject_open_ended_full_target_identity_fields() -> None:
    section_7_3 = _load_verifier_module(
        "scripts/verify_gcp_security_authority_contract.py",
        "gcp73_closed_target_identity",
    )
    section_7_4 = _load_verifier_module(
        "scripts/verify_gcp_attestation_receipt_contract.py",
        "gcp74_closed_target_identity",
    )
    security_contract = _load_json(ROOT / SOURCE_PATHS[1])
    attestation_contract = _load_json(ROOT / SOURCE_PATHS[3])
    section_7_3_schema = security_contract[
        "section_7_5_authority_admission_interface"
    ]["full_section_7_5_target_schema"]
    section_7_4_schema = attestation_contract[
        "section_7_5_external_approval_interface"
    ]["full_section_7_5_target_schema"]
    attacked_identity_bytes = _canonical_json(
        {
            "canonical_contract_body_sha256": "a" * 64,
            "contract_domain_separator": (
                "FLUENCYTRACR:GCP_CANONICAL_RUNTIME:SECTION_7_5:V1"
            ),
            "contract_kind": "FULL_SECTION_7_5",
            "schema_version": "GCP_CANONICAL_RUNTIME_SECTION_7_5_FULL_V1",
            "unknown_future_authority": "ALLOW",
        }
    )

    with pytest.raises(ValueError, match="target identity keys mismatch"):
        section_7_3.validate_full_section_7_5_target_record(
            _target_record(section_7_3_schema, attacked_identity_bytes),
            section_7_3_schema,
        )
    with pytest.raises(ValueError, match="target identity keys mismatch"):
        section_7_4.validate_full_section_7_5_external_approval_target_record(
            _target_record(section_7_4_schema, attacked_identity_bytes),
            section_7_4_schema,
        )


def test_both_parents_reject_section_7_5a_target_identity_bytes() -> None:
    section_7_3 = _load_verifier_module(
        "scripts/verify_gcp_security_authority_contract.py",
        "gcp73_section_7_5a_target_identity",
    )
    section_7_4 = _load_verifier_module(
        "scripts/verify_gcp_attestation_receipt_contract.py",
        "gcp74_section_7_5a_target_identity",
    )
    security_contract = _load_json(ROOT / SOURCE_PATHS[1])
    attestation_contract = _load_json(ROOT / SOURCE_PATHS[3])
    section_7_3_schema = security_contract[
        "section_7_5_authority_admission_interface"
    ]["full_section_7_5_target_schema"]
    section_7_4_schema = attestation_contract[
        "section_7_5_external_approval_interface"
    ]["full_section_7_5_target_schema"]
    attacked_identity_bytes = _canonical_json(
        {
            "canonical_contract_body_sha256": "a" * 64,
            "contract_domain_separator": (
                "FLUENCYTRACR:GCP_CANONICAL_RUNTIME:SECTION_7_5A:V1"
            ),
            "contract_kind": "SECTION_7_5A",
            "schema_version": "GCP_SECTION_7_5A_CONSTRAINTS_OPEN_OBLIGATIONS_V1",
        }
    )

    with pytest.raises(ValueError, match="target identity discriminator mismatch"):
        section_7_3.validate_full_section_7_5_target_record(
            _target_record(section_7_3_schema, attacked_identity_bytes),
            section_7_3_schema,
        )
    with pytest.raises(ValueError, match="target identity discriminator mismatch"):
        section_7_4.validate_full_section_7_5_external_approval_target_record(
            _target_record(section_7_4_schema, attacked_identity_bytes),
            section_7_4_schema,
        )


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
