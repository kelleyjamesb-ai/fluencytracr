from __future__ import annotations

import base64
import copy
import hashlib
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "docs/contracts/canonical-inference-gcp-security-authority"
README = DIR / "README.md"
CONTRACT = DIR / "security-authority-contract.json"
MATRIX = DIR / "role-capability-matrix.json"
SOURCES = DIR / "provider-source-evidence.json"
REVALIDATION = DIR / "provider-revalidation.json"
VECTORS = DIR / "canonicalization-vectors.json"
VERIFIER = ROOT / "scripts/verify_gcp_security_authority_revalidation.py"
CONTRACT_VALIDATOR = ROOT / "scripts/gcp_security_authority_contract_validation.py"
CONTRACT_VERIFIER = ROOT / "scripts/verify_gcp_security_authority_contract.py"
PARENT = ROOT / "docs/contracts/canonical-inference-gcp-runtime-candidate/README.md"
SECTION72 = ROOT / "docs/contracts/canonical-inference-gcp-runtime-object/README.md"
SECTION71_DIR = ROOT / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
PLAN = ROOT / "artifacts/plan_gcp_hsm_wif_iam_role_separation.md"
ATTRIBUTION = ROOT / "ATTRIBUTION.md"
BUNDLE = Path(
    os.environ.get(
        "GCP_SECURITY_AUTHORITY_SOURCE_BUNDLE",
        "~/.glean/recovery/fluencytracr/"
        "gcp-security-authority-source-snapshot-20260724T232044Z.zip",
    )
).expanduser()
HEX64 = re.compile(r"^[0-9a-f]{64}$")
HEX32 = re.compile(r"^[0-9a-f]{32}$")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

# Updated only after all normative bytes are final.
PINNED_ARTIFACTS = {
    "docs/contracts/canonical-inference-gcp-security-authority/README.md": "2874af72d70c44651052fa890885768de861232f11bee769c295c1edc8284326",
    "docs/contracts/canonical-inference-gcp-security-authority/provider-source-evidence.json": "83074b19ee9b2fe74409387a989a1b88c2ff5231182f8617ae0800dd19b48577",
    "docs/contracts/canonical-inference-gcp-security-authority/provider-revalidation.json": "6d50908f947f3f6be258b18646007446a895c3e7236c4e38b984a2f056e77aa4",
    "docs/contracts/canonical-inference-gcp-security-authority/role-capability-matrix.json": "90209f2c60018205a3479ca38981cf8738d17813fa4e6ade4b72407bf4a8ca17",
    "docs/contracts/canonical-inference-gcp-security-authority/security-authority-contract.json": "d9c46b1c576f75b435418ff220bf20a365c9ed78d200512bd4db3672dabb938d",
    "docs/contracts/canonical-inference-gcp-security-authority/canonicalization-vectors.json": "4e355727c59114c3c32ba0b101e4b13be5733d32a375f7233045d990940d9573",
    "scripts/verify_gcp_security_authority_revalidation.py": "e606060b02a27c327c34f238821908b10a2ec47fe5347d80cdaf5f023eade68a",
    "scripts/gcp_security_authority_contract_validation.py": "c22fd6cbf17415f2c079f88f683dd27ce6a8242905b523616ef3ab79839df3e7",
    "scripts/verify_gcp_security_authority_contract.py": "62f4029e2be804635fa0affe493815fec659c908f8f2af4f26fb0eb426d4b970",
}


def _json(path: Path) -> dict[str, Any]:
    value = _strict_loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("artifact root must be object")
    return value


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical(value: Any) -> bytes:
    _validate_canonical_value(value)
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def _validate_canonical_value(value: Any) -> None:
    if value is None or isinstance(value, float):
        raise ValueError("null/float prohibited")
    if type(value) in (bool, int):
        return
    if isinstance(value, str):
        if unicodedata.normalize("NFC", value) != value:
            raise ValueError("non-NFC string")
        if any(
            unicodedata.category(char) in {"Cc", "Cs"}
            for char in value
        ):
            raise ValueError("control/surrogate string")
        return
    if isinstance(value, list):
        for item in value:
            _validate_canonical_value(item)
        return
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise ValueError("non-string object key")
        for key, item in value.items():
            _validate_canonical_value(key)
            _validate_canonical_value(item)
        return
    raise ValueError("unsupported JSON value")


def _strict_loads(data: str) -> Any:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate key")
            result[key] = value
        return result

    def reject_constant(value: str) -> None:
        raise ValueError(value)

    def parse_integer(value: str) -> int:
        if value == "-0":
            raise ValueError("negative zero")
        return int(value)

    result = json.loads(
        data,
        object_pairs_hook=pairs,
        parse_constant=reject_constant,
        parse_float=lambda _: (_ for _ in ()).throw(ValueError("float")),
        parse_int=parse_integer,
    )
    _validate_canonical_value(result)
    return result


def _nodes(contract: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {node["node_id"]: node for node in contract["hash_graph"]}


def _verify_stored_hash(
    stored: dict[str, Any], node: dict[str, Any], field: str
) -> None:
    if set(stored) != set(stored) or field not in stored:
        raise ValueError("stored hash field missing")
    body = dict(stored)
    observed = body.pop(field)
    if not isinstance(observed, str) or not HEX64.fullmatch(observed):
        raise ValueError("invalid stored hash")
    expected = _sha(
        node["domain_separator"].encode("ascii")
        + b"\x00"
        + _canonical(body)
    )
    if observed != expected:
        raise ValueError("stale self hash")


def _seal(stored: dict[str, Any], node: dict[str, Any], field: str) -> None:
    body = dict(stored)
    body.pop(field, None)
    stored[field] = _sha(
        node["domain_separator"].encode("ascii")
        + b"\x00"
        + _canonical(body)
    )


def _validate_policy(
    stored: dict[str, Any], contract: dict[str, Any]
) -> None:
    schema = contract["policy_schema"]
    required = set(schema["required_top_level_keys"]) | {schema["hash_field"]}
    if set(stored) != required:
        raise ValueError("policy keys are not closed")
    node = _nodes(contract)["security_authority_policy_hash"]
    _verify_stored_hash(stored, node, schema["hash_field"])
    body = dict(stored)
    observed_hash = body.pop(schema["hash_field"])
    if _canonical(body) != _canonical(contract["policy_template"]):
        raise ValueError("policy differs from compiled template")
    if schema["runtime_approved_hashes"] != []:
        raise ValueError("runtime policy admission must remain empty")
    if observed_hash not in schema["synthetic_test_hashes"]:
        raise ValueError("policy is not a synthetic vector")
    if body["authority_effect"] != "NONE_POLICY_TEMPLATE_CANNOT_AUTHORIZE":
        raise ValueError("policy attempted authorization")


def _validate_evidence(
    stored: dict[str, Any], contract: dict[str, Any]
) -> None:
    schema = contract["evidence_snapshot_schema"]
    required = set(schema["required_top_level_keys"]) | {schema["hash_field"]}
    if set(stored) != required:
        raise ValueError("evidence keys are not closed")
    node = _nodes(contract)["security_authority_evidence_snapshot_hash"]
    _verify_stored_hash(stored, node, schema["hash_field"])
    if stored["security_authority_policy_hash"] not in contract[
        "policy_schema"
    ]["synthetic_test_hashes"]:
        raise ValueError("evidence policy dependency mismatch")
    if stored["evidence_state"] != "NOT_OBSERVED_NO_GCP_ACCESS":
        raise ValueError("Section 7.3 must not contain live evidence")
    if any(
        value not in {"EXPLICITLY_ABSENT", "NOT_RUN", "NOT_ESTABLISHED"}
        for key, value in stored.items()
        if key
        in {
            "observation_window",
            "project_alias_bundle",
            "principal_alias_bundle",
            "controller_fixed_point",
            "wif_pool_provider_evidence",
            "hsm_key_generation_evidence",
            "effective_access_evidence",
            "alternate_credential_evidence",
            "rollover_evidence",
            "audit_interface_evidence",
            "freshness",
        }
    ):
        raise ValueError("synthetic absent evidence carries observed material")
    if schema["runtime_approved_hashes"] != []:
        raise ValueError("runtime evidence admission must remain empty")
    if stored[schema["hash_field"]] not in schema["synthetic_test_hashes"]:
        raise ValueError("evidence is not a synthetic vector")
    if stored["authority_effect"] != "NONE_EVIDENCE_ABSENT_CANNOT_AUTHORIZE":
        raise ValueError("evidence attempted authorization")


_validation_spec = importlib.util.spec_from_file_location(
    "gcp_security_authority_contract_validation",
    ROOT / "scripts/gcp_security_authority_contract_validation.py",
)
assert _validation_spec is not None and _validation_spec.loader is not None
_validation_module = importlib.util.module_from_spec(_validation_spec)
_validation_spec.loader.exec_module(_validation_module)
_validate_live_evidence_shape = _validation_module.validate_live_evidence_shape


def _vectors() -> dict[str, dict[str, Any]]:
    return {
        item["node_id"]: item for item in _json(VECTORS)["vectors"]
    }


def test_provider_source_registry_claims_and_revalidation_are_exact() -> None:
    evidence = _json(SOURCES)
    revalidation = _json(REVALIDATION)
    assert len(evidence["sources"]) == 23
    assert len(evidence["claims"]) == 42
    assert len({item["source_id"] for item in evidence["sources"]}) == 23
    assert len({item["claim_id"] for item in evidence["claims"]}) == 42
    assert evidence["source_registry_hash_basis"] == (
        "EXACT_SANITIZED_SNAPSHOT_RECORDS_IN_RECOVERY_BUNDLE"
    )
    assert evidence["source_registry_sha256"] == _sha(
        _canonical(evidence["sources"])
    )
    assert evidence["claim_registry_sha256"] == _sha(
        _canonical(evidence["claims"])
    )
    assert evidence["source_bundle"] == {
        "external_locator": "external-recovery://fluencytracr/gcp-security-authority-source-snapshot-20260724T232044Z.zip",
        "sha256": "6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3",
        "byte_count": 173399,
        "repo_committed": False,
        "contains_public_example_identifiers": True,
        "runtime_admission": "PROHIBITED",
    }
    expected_body = {
        "schema_version": "GCP_SECURITY_AUTHORITY_PROVIDER_REVALIDATION_V1",
        "source_bundle_sha256": evidence["source_bundle"]["sha256"],
        "section_7_1_bindings": evidence["section_7_1_bindings"],
        "section_7_1_claim_ids": evidence["section_7_1_claim_ids"],
        "source_registry_sha256": evidence["source_registry_sha256"],
        "claim_registry_sha256": evidence["claim_registry_sha256"],
        "source_count": 23,
        "claim_count": 42,
        "decision": "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED",
        "authority_effect": "NONE_PUBLIC_SOURCE_REVALIDATION_ONLY",
    }
    expected_hash = _sha(
        b"FLUENCYTRACR:GCP_SECURITY_AUTHORITY_PROVIDER_REVALIDATION:V1\x00"
        + _canonical(expected_body)
    )
    assert revalidation["provider_revalidation_hash"] == expected_hash
    assert evidence["provider_revalidation"]["provider_revalidation_hash"] == expected_hash
    assert revalidation["provider_source_evidence_sha256"] == _sha(
        SOURCES.read_bytes()
    )
    assert revalidation["recorded_state"] == (
        "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED"
    )
    assert revalidation["authorization_effect"] == "NONE_DOCS_ONLY"


def test_external_source_bundle_replays_when_available() -> None:
    if not BUNDLE.exists():
        pytest.skip("external public-source recovery bundle is intentionally uncommitted")
    result = subprocess.run(
        [sys.executable, str(VERIFIER), str(BUNDLE)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    assert payload == {
        "bundle_sha256": "6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3",
        "claim_count": 42,
        "decision": "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED",
        "provider_revalidation_hash": "9d2f21c49c5bfa6d498387a7d7a30a13c6c09d3b6bc7ae4a496f8e4e58f88ef6",
        "source_count": 23,
    }


def test_source_verifier_rejects_noncanonical_json_before_replay() -> None:
    spec = importlib.util.spec_from_file_location("gcp73_verifier", VERIFIER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for payload in (
        b'{"a":1,"a":2}',
        b'{"a":1.0}',
        b'{"a":null}',
        b'{"a":-0}',
        b'{"a":NaN}',
        b'{"a":"e\\u0301"}',
        b'{"a":"\\u0000"}',
        b'{"a":"\\ud800"}',
        b'[]',
        b'{"a":9223372036854775808}',
    ):
        with pytest.raises(ValueError):
            module.load_json_bytes(payload)


def test_source_verifier_rejects_unknown_evidence_fields(tmp_path: Path) -> None:
    if not BUNDLE.exists():
        pytest.skip("external public-source recovery bundle is intentionally uncommitted")
    spec = importlib.util.spec_from_file_location("gcp73_verifier_unknown", VERIFIER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    evidence = _json(SOURCES)
    evidence["unknown"] = True
    changed = tmp_path / "provider-source-evidence.json"
    changed.write_text(json.dumps(evidence, sort_keys=True) + "\n")
    module.EVIDENCE = changed
    with pytest.raises(ValueError, match="root keys mismatch"):
        module.replay(BUNDLE)


def test_source_verifier_rejects_section71_artifact_drift(tmp_path: Path) -> None:
    if not BUNDLE.exists():
        pytest.skip("external public-source recovery bundle is intentionally uncommitted")
    (tmp_path / "scripts").mkdir()
    target_contract = tmp_path / "docs/contracts/canonical-inference-gcp-security-authority"
    target_section71 = tmp_path / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
    target_contract.mkdir(parents=True)
    target_section71.mkdir(parents=True)
    shutil.copyfile(VERIFIER, tmp_path / "scripts/verify_gcp_security_authority_revalidation.py")
    shutil.copyfile(SOURCES, target_contract / "provider-source-evidence.json")
    source_section71 = ROOT / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
    for name in (
        "README.md",
        "source-evidence.json",
        "claim-evidence.json",
        "compute-field-projection.json",
    ):
        shutil.copyfile(source_section71 / name, target_section71 / name)
    (target_section71 / "README.md").write_text(
        (target_section71 / "README.md").read_text() + "\ndrift\n"
    )
    result = subprocess.run(
        [
            sys.executable,
            str(tmp_path / "scripts/verify_gcp_security_authority_revalidation.py"),
            str(BUNDLE),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    replay_failure = json.loads(result.stdout)
    assert replay_failure["decision"] == (
        "HOLD_FOR_PROVIDER_SOURCE_UNAVAILABLE_OR_DRIFT"
    )
    assert replay_failure["error_code"] == (
        "SECURITY_AUTHORITY_SOURCE_REPLAY_FAILED"
    )


def test_external_source_bundle_tampering_fails_closed(tmp_path: Path) -> None:
    if not BUNDLE.exists():
        pytest.skip("external public-source recovery bundle is intentionally uncommitted")
    tampered = tmp_path / "tampered.zip"
    tampered.write_bytes(BUNDLE.read_bytes() + b"tamper")
    result = subprocess.run(
        [sys.executable, str(VERIFIER), str(tampered)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert json.loads(result.stdout)["decision"] == (
        "HOLD_FOR_PROVIDER_SOURCE_UNAVAILABLE_OR_DRIFT"
    )


def test_role_capability_matrix_is_total_default_deny_and_separated() -> None:
    matrix = _json(MATRIX)
    contract = _json(CONTRACT)
    capabilities = matrix["capabilities"]
    roles = matrix["roles"]
    capability_ids = {item["capability_id"] for item in capabilities}
    assert len(capabilities) == len(capability_ids) == 16
    assert len(roles) == 14
    assert [item["role_id"] for item in roles] == sorted(
        item["role_id"] for item in roles
    )
    for role in roles:
        allowed = set(role["allowed_capability_ids"])
        forbidden = set(role["forbidden_capability_ids"])
        assert allowed.isdisjoint(forbidden)
        assert allowed | forbidden == capability_ids
        assert role["default"] == (
            "DENY_UNLISTED_SECURITY_SENSITIVE_CAPABILITY_OR_PERMISSION"
        )
    by_role = {item["role_id"]: item for item in roles}
    assert by_role["RUNTIME_SIGNER"]["allowed_capability_ids"] == [
        "SIGN_RUNTIME_RECEIPT_DIGEST"
    ]
    assert by_role["IMAGE_SIGNER"]["allowed_capability_ids"] == [
        "SIGN_IMAGE_PROVENANCE_DIGEST"
    ]
    assert "SIGN_RUNTIME_RECEIPT_DIGEST" in by_role["KMS_IAM_ADMIN"][
        "forbidden_capability_ids"
    ]
    assert by_role["KEY_LIFECYCLE_ADMIN"]["authority_class"] == (
        "AUTHORITY_MUTATOR"
    )
    assert by_role["KEY_DESTRUCTION_APPROVER"]["authority_class"] == (
        "APPROVAL_ONLY"
    )
    assert by_role["KEY_DESTRUCTION_EXECUTOR"]["authority_class"] == (
        "AUTHORITY_MUTATOR"
    )
    for capability in capabilities:
        assert "CUSTOM_CLOSED" not in json.dumps(capability)
        if capability["binding_kind"].startswith("EXTERNAL_") or capability[
            "binding_kind"
        ].startswith("SECTION_7_5"):
            assert capability["provider_bindings"] == []
    pairs = [tuple(item) for item in matrix["forbidden_controller_intersections"]]
    assert len(pairs) == len(set(pairs)) == 91
    assert all(len(pair) == 2 and pair[0] != pair[1] for pair in pairs)
    controller = matrix["controller_semantics"]
    assert controller["caller_asserted_completeness"] == "REJECT"
    assert controller["unknown_or_unviewable_edge"] == "HOLD"
    assert controller["credential_controller_algorithm"].startswith(
        "LEAST_FIXED_POINT"
    )
    assert controller["authority_mutator_influence_graph"].startswith(
        "SEPARATE_COMPLETE_GRAPH"
    )
    assert controller["intersection_check"] == (
        "EVERY_ROLE_PAIR_DISJOINT_OVER_TRANSITIVE_CREDENTIAL_CONTROLLER_SETS"
    )
    assert contract["role_capability_matrix_sha256"] == _sha(MATRIX.read_bytes())


def test_policy_schema_dependencies_and_hash_graph_are_closed() -> None:
    contract = _json(CONTRACT)
    policy = contract["policy_template"]
    assert contract["semantic_dependency"]["section_7_1_only"] is True
    section71 = ROOT / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
    expected_section71 = {
        "provider_readme_sha256": _sha((section71 / "README.md").read_bytes()),
        "provider_source_evidence_sha256": _sha(
            (section71 / "source-evidence.json").read_bytes()
        ),
        "provider_claim_evidence_sha256": _sha(
            (section71 / "claim-evidence.json").read_bytes()
        ),
        "provider_compute_projection_sha256": _sha(
            (section71 / "compute-field-projection.json").read_bytes()
        ),
    }
    assert contract["semantic_dependency"]["section_7_1_bindings"] == expected_section71
    assert policy["section_7_1_bindings"] == expected_section71
    claim_ids = {
        item["claim_id"]
        for item in _json(section71 / "claim-evidence.json")["claims"]
    }
    assert set(contract["semantic_dependency"]["section_7_1_claim_ids"]).issubset(
        claim_ids
    )
    assert policy["section_7_1_claim_ids"] == contract["semantic_dependency"][
        "section_7_1_claim_ids"
    ]
    assert contract["semantic_dependency"]["section_7_2"] == (
        "COMPATIBILITY_ONLY_NOT_HASH_DEPENDENCY"
    )
    assert policy["semantic_dependency"] == (
        "SECTION_7_1_PROVIDER_VOCABULARY_ONLY"
    )
    assert policy["section_7_2_compatibility_only_not_hash_dependency"] is True
    serialized = json.dumps(policy, sort_keys=True)
    for forbidden in (
        "runtime_profile_hash",
        "control_plane_observation_hash",
        "runtime_instance_observation_hash",
        "source_evidence_envelope_sha256",
    ):
        assert forbidden not in serialized
    graph = contract["hash_graph"]
    assert [node["node_id"] for node in graph] == [
        "provider_revalidation_hash",
        "security_authority_policy_hash",
        "security_authority_evidence_snapshot_hash",
    ]
    assert graph[0]["dependencies"] == []
    assert graph[1]["dependencies"] == ["provider_revalidation_hash"]
    assert graph[2]["dependencies"] == ["security_authority_policy_hash"]
    assert len({node["domain_separator"] for node in graph}) == 3
    assert contract["policy_schema"]["runtime_approved_hashes"] == []
    assert contract["evidence_snapshot_schema"]["runtime_approved_hashes"] == []
    approvals = contract["live_evidence_contract"]["approval_domains"]
    assert all(
        value == []
        for key, value in approvals.items()
        if key.startswith("runtime_approved_")
    )


def test_project_and_principal_roles_are_closed_and_unobserved() -> None:
    contract = _json(CONTRACT)
    projects = contract["project_role_contract"]
    principals = contract["principal_role_contract"]
    assert projects["role_ids"] == [
        "AUDIT_PROJECT",
        "BUILD_PROJECT",
        "KEY_CUSTODY_PROJECT",
        "RUNTIME_PROJECT",
        "SECURITY_POLICY_PROJECT",
    ]
    assert projects["pairwise_distinct"] is True
    assert projects["provider_requirement"] is False
    assert projects["actual_aliases"].startswith("ABSENT_")
    assert len(principals["role_ids"]) == 14
    assert principals["pairwise_distinct_aliases"] is True
    assert principals["controller_fixed_point_required"] is True
    assert principals["actual_aliases"].startswith("ABSENT_")
    assert contract["policy_template"]["identity_alias_contract"] == {
        "format": "CONTEXT_BOUND_CSPRNG_128_BIT_LOWERCASE_HEX",
        "pattern": "^[0-9a-f]{32}$",
        "derived_from_identifier": False,
        "cross_bundle_reuse": "PROHIBITED",
        "mapping_location": "RESTRICTED_EXTERNAL_EVIDENCE_ONLY",
        "plain_hash_or_identifier_bearing_locator": "REJECT",
    }


def _synthetic_live_evidence_fixture(contract: dict[str, Any]) -> dict[str, Any]:
    projects = contract["project_role_contract"]["role_ids"]
    principals = contract["principal_role_contract"]["role_ids"]
    live_schema = contract["live_evidence_contract"]
    alt_routes = live_schema["alternate_credential_record"]["route_ids_exact"]
    project_aliases = {
        role: f"{index:032x}" for index, role in enumerate(projects, 1)
    }
    principal_aliases = {
        role: f"{index:032x}" for index, role in enumerate(principals, 101)
    }
    alternate_route_aliases = {
        route: f"{index:032x}" for index, route in enumerate(alt_routes, 301)
    }
    credential_controller_aliases: list[str] = []
    credential_control_edges: list[dict[str, Any]] = []
    controller_sets = {role: [principal_aliases[role]] for role in principals}
    alias_context_id = "f" * 32
    alias_generation_method = (
        "CSPRNG_128_CONTEXT_BOUND_IN_RESTRICTED_EVIDENCE_BOUNDARY"
    )
    alias_generation_attestation_sha256 = "0" * 64
    alias_material = {
        "alias_context_id": alias_context_id,
        "alias_generation_method": alias_generation_method,
        "alias_generation_attestation_sha256": alias_generation_attestation_sha256,
        "project_role_aliases": project_aliases,
        "principal_role_aliases": principal_aliases,
        "alternate_route_aliases": alternate_route_aliases,
        "credential_controller_aliases": credential_controller_aliases,
    }
    policy_hash = contract["policy_schema"]["synthetic_test_hashes"][0]
    approvals = live_schema["approval_domains"]
    privacy_boundary_policy_hash = approvals[
        "synthetic_test_privacy_boundary_policy_hashes"
    ][0]
    provenance_verifier_policy_hash = approvals[
        "synthetic_test_provenance_verifier_policy_hashes"
    ][0]
    deployment_gate_policy_hash = approvals[
        "synthetic_test_deployment_gate_policy_hashes"
    ][0]
    privacy_mapping_sha256 = "e" * 64
    policy_snapshot_sha256 = "d" * 64
    influence_edges = live_schema["controller_closure"][
        "authority_mutator_influence_edges_exact"
    ]
    mutator_roles = live_schema["controller_closure"]["authority_mutator_roles"]
    policy_wif = contract["policy_template"]["wif"]
    wif_policy_material = {
        "pool_state": "ACTIVE",
        "pool_disabled": False,
        "pool_deleted": False,
        "provider_state": "ACTIVE",
        "provider_disabled": False,
        "provider_deleted": False,
        "pool_etag_sha256": "5" * 64,
        "provider_etag_sha256": "6" * 64,
        "mapping_ast_sha256": _sha(_canonical(policy_wif["attribute_mapping_ast"])),
        "condition_ast_sha256": _sha(_canonical(policy_wif["condition_ast"])),
        "sts_endpoint_binding_sha256": "9" * 64,
        "sts_exchange_audience_binding_sha256": "a" * 64,
    }
    wif_policy_binding_sha256 = _sha(_canonical(wif_policy_material))
    denial_material = {
        "wif_policy_binding_sha256": wif_policy_binding_sha256,
        "existing_token_denial_proved": True,
        "existing_token_denial_observed_at": "2026-07-24T00:00:20Z",
        "existing_token_denial_same_context_sha256": "b" * 64,
        "existing_token_denial_audit_correlation_sha256": "c" * 64,
        "existing_token_denial_cause": "AUTHORIZATION_PERMISSION_DENIED",
    }
    wif_evidence = {
        **wif_policy_material,
        "wif_policy_binding_sha256": wif_policy_binding_sha256,
        **{key: value for key, value in denial_material.items() if key != "wif_policy_binding_sha256"},
        "existing_token_denial_binding_sha256": _sha(
            _canonical(denial_material)
        ),
    }
    key_records = [
        {
            "key_purpose_id": purpose,
            "generation_alias": f"{index:032x}",
            "version_ids": ["1"],
            "version_state": "ENABLED",
            "protection_level": "HSM",
            "purpose": "ASYMMETRIC_SIGN",
            "algorithm": "EC_SIGN_P256_SHA256",
            "spki_der_sha256": spki * 64,
            "hsm_attestation_sha256": attestation * 64,
            "certificate_chain_sha256": "b" * 64,
            "hsm_nonextractable": True,
            "generated_in_hsm": True,
        }
        for index, purpose, spki, attestation in (
            (501, "IMAGE_PROVENANCE_SIGNING_KEY", "9", "a"),
            (502, "RUNTIME_RECEIPT_SIGNING_KEY", "8", "7"),
        )
    ]
    key_by_purpose = {item["key_purpose_id"]: item for item in key_records}
    image_key = key_by_purpose["IMAGE_PROVENANCE_SIGNING_KEY"]
    provenance = {
        "oci_manifest_digest": "sha256:" + "1" * 64,
        "oci_reference_keyed_commitment_sha256": "2" * 64,
        "key_purpose_id": "IMAGE_PROVENANCE_SIGNING_KEY",
        "generation_alias": image_key["generation_alias"],
        "version_id": "1",
        "algorithm": "EC_SIGN_P256_SHA256",
        "spki_der_sha256": image_key["spki_der_sha256"],
        "payload_schema_sha256": contract["policy_template"][
            "image_provenance"
        ]["payload_schema_sha256"],
        "canonical_payload_sha256": "3" * 64,
        "signature_sha256": "4" * 64,
        "provenance_verifier_policy_hash": provenance_verifier_policy_hash,
        "deployment_gate_policy_hash": deployment_gate_policy_hash,
        "verification_receipt_sha256": "0" * 64,
        "payload_binding_receipt_sha256": "0" * 64,
        "identifier_commitment_verification_receipt_sha256": "0" * 64,
        "verifier_alias": principal_aliases["PUBLIC_KEY_VERIFIER"],
        "verification_timestamp": "2026-07-24T00:01:00Z",
        "deployment_candidate_sha256": "7" * 64,
        "deployment_attempt_alias": f"{503:032x}",
        "deployment_gate_consumption_sha256": "0" * 64,
        "verification_result": "VALID",
        "deployment_gate_result": "DETACHED_PROVENANCE_VALID_FOR_EXACT_OCI_DIGEST",
    }
    provenance_schema = live_schema["image_provenance_evidence"]
    privacy_schema = live_schema["privacy_boundary_evidence"]
    identifier_material = {
        "privacy_boundary_policy_hash": privacy_boundary_policy_hash,
        "identifier_commitment_scheme": "HMAC_SHA256",
        "identifier_commitment_domain": "FLUENCYTRACR:GCP_SECURITY_AUTHORITY:IDENTIFIER_COMMITMENT:V1",
        "alias_mapping_evidence_sha256": privacy_mapping_sha256,
        "oci_reference_keyed_commitment_sha256": provenance[
            "oci_reference_keyed_commitment_sha256"
        ],
    }
    provenance["identifier_commitment_verification_receipt_sha256"] = _sha(
        privacy_schema["identifier_commitment_receipt_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(identifier_material)
    )
    payload_material = {
        key: provenance[key]
        for key in (
            "oci_manifest_digest",
            "oci_reference_keyed_commitment_sha256",
            "payload_schema_sha256",
            "canonical_payload_sha256",
        )
    }
    provenance["payload_binding_receipt_sha256"] = _sha(
        provenance_schema["payload_binding_receipt_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(payload_material)
    )
    verification_material = {
        key: provenance[key]
        for key in (
            "provenance_verifier_policy_hash",
            "oci_manifest_digest",
            "generation_alias",
            "version_id",
            "algorithm",
            "spki_der_sha256",
            "canonical_payload_sha256",
            "signature_sha256",
            "payload_binding_receipt_sha256",
            "identifier_commitment_verification_receipt_sha256",
            "verifier_alias",
            "verification_timestamp",
            "verification_result",
        )
    }
    provenance["verification_receipt_sha256"] = _sha(
        provenance_schema["verification_receipt_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(verification_material)
    )
    deployment_material = {
        key: provenance[key]
        for key in (
            "deployment_gate_policy_hash",
            "deployment_candidate_sha256",
            "deployment_attempt_alias",
            "verification_receipt_sha256",
            "payload_binding_receipt_sha256",
            "deployment_gate_result",
        )
    }
    provenance["deployment_gate_consumption_sha256"] = _sha(
        provenance_schema["deployment_gate_consumption_domain_separator"].encode(
            "ascii"
        )
        + b"\x00"
        + _canonical(deployment_material)
    )
    provenance["provenance_binding_sha256"] = _sha(_canonical(provenance))
    access_records = []
    resource_to_purpose = {
        "IMAGE_PROVENANCE_SIGNING_CRYPTOKEY": "IMAGE_PROVENANCE_SIGNING_KEY",
        "RUNTIME_RECEIPT_SIGNING_CRYPTOKEY": "RUNTIME_RECEIPT_SIGNING_KEY",
    }
    for item in live_schema["effective_access_record"]["tuple_universe"]:
        record = {
            **item,
            "principal_alias": principal_aliases[item["principal_role"]],
            "key_generation_alias": key_by_purpose[
                resource_to_purpose[item["resource_purpose"]]
            ]["generation_alias"],
            "observed": item["expected"],
            "observed_at": "2026-07-24T00:00:30Z",
            "same_context_sha256": _sha(
                item["context_group_id"].encode("ascii")
            ),
            "policy_snapshot_sha256": policy_snapshot_sha256,
            "wif_policy_binding_sha256": (
                wif_policy_binding_sha256
                if item["principal_role"] == "RUNTIME_SIGNER"
                else "0" * 64
            ),
            "audit_correlation_sha256": _sha(
                item["tuple_id"].encode("ascii")
            ),
            "denial_cause": (
                "NOT_APPLICABLE_ALLOWED"
                if item["expected"] == "ALLOW"
                else "AUTHORIZATION_PERMISSION_DENIED"
            ),
        }
        record["access_record_binding_sha256"] = _sha(_canonical(record))
        access_records.append(record)
    alternate_records = []
    for item in live_schema["alternate_credential_record"]["record_universe"]:
        purpose = resource_to_purpose[item["resource_purpose"]]
        record = {
            **item,
            "principal_alias": alternate_route_aliases[item["route_id"]],
            "key_generation_alias": key_by_purpose[purpose]["generation_alias"],
            "observed": "DENY",
            "observed_at": "2026-07-24T00:00:40Z",
            "same_context_sha256": _sha(item["route_id"].encode("utf-8")),
            "policy_snapshot_sha256": policy_snapshot_sha256,
            "audit_correlation_sha256": _sha(
                (item["route_id"] + item["resource_purpose"]).encode("utf-8")
            ),
            "denial_cause": "AUTHORIZATION_PERMISSION_DENIED",
        }
        record["alternate_record_binding_sha256"] = _sha(_canonical(record))
        alternate_records.append(record)
    rollover = {
        "state": "HOLD_PREPARE",
        "key_purpose_id": "IMAGE_PROVENANCE_SIGNING_KEY",
        "old_generation_alias": f"{701:032x}",
        "new_generation_alias": image_key["generation_alias"],
        "events": [
            {
                "state": "HOLD_PREPARE",
                "observed_at": "2026-07-24T00:00:50Z",
                "evidence_sha256": "6" * 64,
            }
        ],
        "old_denial_sha256": "1" * 64,
        "new_allow_sha256": "2" * 64,
        "cross_key_denial_sha256": "3" * 64,
        "same_context_sha256": "4" * 64,
        "policy_snapshot_sha256": policy_snapshot_sha256,
        "approver_alias": principal_aliases["KEY_DESTRUCTION_APPROVER"],
        "executor_alias": principal_aliases["KEY_DESTRUCTION_EXECUTOR"],
        "two_approved_generations": False,
    }
    rollover["rollover_binding_sha256"] = _sha(_canonical(rollover))
    audit = {
        "operation_inventory_sha256": live_schema["audit_interface_evidence"][
            "operation_inventory_sha256_expected"
        ],
        "section_7_5_contract_sha256": "5" * 64,
        "section_7_5_decision": "SECTION_7_5_APPROVED_IMMUTABLE_AUDIT_MAPPING",
        "section_7_5_method_mapping_sha256": "6" * 64,
        "section_7_5_approval_binding_sha256": "0" * 64,
        "completeness_window_start": "2026-07-24T00:00:00Z",
        "completeness_window_end": "2026-07-24T00:01:00Z",
        "missing_operation_count": 0,
        "raw_logs_retained_in_fluencytracr": False,
    }
    section75_material = {
        key: audit[key]
        for key in (
            "operation_inventory_sha256",
            "section_7_5_contract_sha256",
            "section_7_5_decision",
            "section_7_5_method_mapping_sha256",
        )
    }
    audit["section_7_5_approval_binding_sha256"] = _sha(
        live_schema["audit_interface_evidence"][
            "section_7_5_approval_binding_domain_separator"
        ].encode("ascii")
        + b"\x00"
        + _canonical(section75_material)
    )
    audit["audit_interface_binding_sha256"] = _sha(_canonical(audit))
    privacy_boundary = {
        "privacy_boundary_policy_hash": privacy_boundary_policy_hash,
        "alias_generation_attestation_sha256": alias_generation_attestation_sha256,
        "alias_mapping_evidence_sha256": privacy_mapping_sha256,
        "identifier_commitment_scheme": "HMAC_SHA256",
        "identifier_commitment_domain": "FLUENCYTRACR:GCP_SECURITY_AUTHORITY:IDENTIFIER_COMMITMENT:V1",
        "identifier_commitment_verification_receipt_sha256": provenance[
            "identifier_commitment_verification_receipt_sha256"
        ],
    }
    external_mutators = [
        {
            "mutator_alias": f"{801:032x}",
            "mutator_type": "OWNER_EDITOR",
            "influenced_roles": sorted(principals),
            "state": "DORMANT",
            "evidence_sha256": "f" * 64,
        }
    ]
    mutator_relevant = set(
        live_schema["controller_closure"]["mutator_relevant_source_types"]
    )
    source_records = [
        {
            "source_type": source_type,
            "record_count": (
                1
                if source_type == "OWNER_EDITOR"
                else 0
                if source_type in mutator_relevant
                else 1
            ),
            "snapshot_sha256": _sha(source_type.encode("ascii")),
        }
        for source_type in live_schema["controller_closure"]["source_types_exact"]
    ]
    mutator_states = {role: "DORMANT" for role in mutator_roles}
    edge_inventory = {
        "credential_control_edges": credential_control_edges,
        "credential_controller_sets": controller_sets,
        "internal_authority_mutator_edges": influence_edges,
        "external_authority_mutator_records": external_mutators,
    }
    completeness_material = {
        "authority_source_records": source_records,
        "credential_control_edges": credential_control_edges,
        "credential_controller_sets": controller_sets,
        "cycle_records": [],
        "external_authority_mutator_records": external_mutators,
        "authority_mutator_states": mutator_states,
        "missing_source_count": 0,
        "fixed_point_reached": True,
        "forbidden_intersection_count": 0,
        "active_authority_mutator_count": 0,
    }
    completeness_hash = _sha(
        live_schema["controller_closure"][
            "completeness_witness_domain_separator"
        ].encode("ascii")
        + b"\x00"
        + _canonical(completeness_material)
    )
    stored: dict[str, Any] = {
        "schema_version": "GCP_SECURITY_AUTHORITY_EVIDENCE_SNAPSHOT_V1",
        "canonicalization_version": "FT_CANONICAL_JSON_V1",
        "security_authority_policy_hash": policy_hash,
        "evidence_state": "SYNTHETIC_COMPLETE_SCHEMA_EXERCISE_NO_AUTHORITY",
        "observation_point": "2026-07-24T00:02:00Z",
        "alias_context_id": alias_context_id,
        "alias_generation_method": alias_generation_method,
        "alias_generation_attestation_sha256": alias_generation_attestation_sha256,
        "alias_assignment_sha256": _sha(_canonical(alias_material)),
        "privacy_alias_mapping_evidence_sha256": privacy_mapping_sha256,
        "project_role_aliases": project_aliases,
        "principal_role_aliases": principal_aliases,
        "alternate_route_aliases": alternate_route_aliases,
        "credential_controller_aliases": credential_controller_aliases,
        "privacy_boundary_evidence": privacy_boundary,
        "effective_policy_snapshot_sha256": policy_snapshot_sha256,
        "controller_closure": {
            "authority_source_records": source_records,
            "source_inventory_sha256": _sha(_canonical(source_records)),
            "credential_control_edges": credential_control_edges,
            "edge_inventory_sha256": _sha(_canonical(edge_inventory)),
            "completeness_witness_sha256": completeness_hash,
            "cycle_records": [],
            "cycle_set_sha256": _sha(_canonical([])),
            "credential_controller_sets_sha256": _sha(
                _canonical(controller_sets)
            ),
            "authority_mutator_influence_edges": influence_edges,
            "external_authority_mutator_records": external_mutators,
            "authority_mutator_influence_edges_sha256": _sha(
                _canonical(
                    {
                        "internal_edges": influence_edges,
                        "external_mutator_records": external_mutators,
                    }
                )
            ),
            "source_types": live_schema["controller_closure"][
                "source_types_exact"
            ],
            "missing_source_count": 0,
            "fixed_point_reached": True,
            "controller_sets": controller_sets,
            "forbidden_intersection_count": 0,
            "authority_mutator_states": mutator_states,
            "active_authority_mutator_count": 0,
        },
        "wif_evidence": wif_evidence,
        "key_generation_evidence": key_records,
        "image_provenance_evidence": provenance,
        "effective_access_records": access_records,
        "alternate_credential_records": alternate_records,
        "rollover_evidence": rollover,
        "audit_interface_evidence": audit,
        "mutation_counter": 0,
        "authority_effect": "NONE_SYNTHETIC_SCHEMA_EXERCISE",
    }
    _seal(
        stored,
        _nodes(contract)["security_authority_evidence_snapshot_hash"],
        "security_authority_evidence_snapshot_hash",
    )
    return stored


def test_live_evidence_schema_is_closed_typed_and_fails_common_bypasses() -> None:
    contract = _json(CONTRACT)
    original = _synthetic_live_evidence_fixture(contract)
    _validate_live_evidence_shape(original, contract)

    def bad_cycle_with_updated_cycle_commitment(item: dict[str, Any]) -> None:
        cycles = item["controller_closure"]["cycle_records"]
        cycles.append(
            {
                "cycle_id": "customer.example.com",
                "member_aliases": [
                    item["principal_role_aliases"]["RUNTIME_SIGNER"]
                ],
                "resolved": True,
            }
        )
        item["controller_closure"]["cycle_set_sha256"] = _sha(
            _canonical(cycles)
        )

    def controller_alias_collides_with_hsm_key(item: dict[str, Any]) -> None:
        alias = item["key_generation_evidence"][0]["generation_alias"]
        item["credential_controller_aliases"].append(alias)
        item["credential_controller_aliases"].sort()
        material = {
            "alias_context_id": item["alias_context_id"],
            "alias_generation_method": item["alias_generation_method"],
            "alias_generation_attestation_sha256": item[
                "alias_generation_attestation_sha256"
            ],
            "project_role_aliases": item["project_role_aliases"],
            "principal_role_aliases": item["principal_role_aliases"],
            "alternate_route_aliases": item["alternate_route_aliases"],
            "credential_controller_aliases": item[
                "credential_controller_aliases"
            ],
        }
        item["alias_assignment_sha256"] = _sha(_canonical(material))

    def forged_controller_set_without_source_edge(item: dict[str, Any]) -> None:
        alias = f"{900:032x}"
        item["credential_controller_aliases"].append(alias)
        alias_material = {
            "alias_context_id": item["alias_context_id"],
            "alias_generation_method": item["alias_generation_method"],
            "alias_generation_attestation_sha256": item[
                "alias_generation_attestation_sha256"
            ],
            "project_role_aliases": item["project_role_aliases"],
            "principal_role_aliases": item["principal_role_aliases"],
            "alternate_route_aliases": item["alternate_route_aliases"],
            "credential_controller_aliases": item[
                "credential_controller_aliases"
            ],
        }
        item["alias_assignment_sha256"] = _sha(_canonical(alias_material))
        closure = item["controller_closure"]
        closure["controller_sets"]["RUNTIME_SIGNER"].append(alias)
        closure["controller_sets"]["RUNTIME_SIGNER"].sort()
        closure["credential_controller_sets_sha256"] = _sha(
            _canonical(closure["controller_sets"])
        )
        edge_inventory = {
            "credential_control_edges": closure["credential_control_edges"],
            "credential_controller_sets": closure["controller_sets"],
            "internal_authority_mutator_edges": closure[
                "authority_mutator_influence_edges"
            ],
            "external_authority_mutator_records": closure[
                "external_authority_mutator_records"
            ],
        }
        closure["edge_inventory_sha256"] = _sha(_canonical(edge_inventory))

    def changed_section75_with_updated_interface_binding(
        item: dict[str, Any]
    ) -> None:
        audit = item["audit_interface_evidence"]
        audit["section_7_5_contract_sha256"] = "0" * 64
        audit["section_7_5_method_mapping_sha256"] = "1" * 64
        material = {
            key: value
            for key, value in audit.items()
            if key != "audit_interface_binding_sha256"
        }
        audit["audit_interface_binding_sha256"] = _sha(_canonical(material))

    mutations = [
        lambda item: item["wif_evidence"].update(provider_disabled=True),
        lambda item: item["wif_evidence"].update(pool_disabled=0),
        lambda item: item["wif_evidence"].update(mapping_ast_sha256="0" * 64),
        lambda item: item["wif_evidence"].update(
            existing_token_denial_same_context_sha256="0" * 64
        ),
        lambda item: item["controller_closure"]["controller_sets"][
            "RUNTIME_SIGNER"
        ].append(
            item["controller_closure"]["controller_sets"]["KMS_IAM_ADMIN"][0]
        ),
        lambda item: item["controller_closure"].update(missing_source_count=1),
        lambda item: item["controller_closure"].update(missing_source_count=False),
        lambda item: item["controller_closure"]["controller_sets"][
            "RUNTIME_SIGNER"
        ].append(
            item["controller_closure"]["controller_sets"]["RUNTIME_SIGNER"][0]
        ),
        lambda item: item["controller_closure"]["authority_mutator_states"].update(
            KMS_IAM_ADMIN="ACTIVE"
        ),
        lambda item: item["controller_closure"].update(
            authority_mutator_influence_edges_sha256="0" * 64
        ),
        lambda item: item["controller_closure"].update(
            completeness_witness_sha256="0" * 64
        ),
        lambda item: item["controller_closure"][
            "external_authority_mutator_records"
        ][0].update(mutator_alias=item["principal_role_aliases"]["RUNTIME_SIGNER"]),
        lambda item: item["controller_closure"][
            "external_authority_mutator_records"
        ].clear(),
        bad_cycle_with_updated_cycle_commitment,
        forged_controller_set_without_source_edge,
        controller_alias_collides_with_hsm_key,
        lambda item: item.update(alias_assignment_sha256="0" * 64),
        lambda item: item["privacy_boundary_evidence"].update(
            privacy_boundary_policy_hash="0" * 64
        ),
        lambda item: item["privacy_boundary_evidence"].update(
            identifier_commitment_scheme="PLAIN_SHA256"
        ),
        lambda item: item["key_generation_evidence"][0].update(
            version_ids=["1", "2"]
        ),
        lambda item: item["key_generation_evidence"][1].update(
            generation_alias=item["key_generation_evidence"][0]["generation_alias"]
        ),
        lambda item: item["key_generation_evidence"][1].update(
            spki_der_sha256=item["key_generation_evidence"][0]["spki_der_sha256"],
            hsm_attestation_sha256=item["key_generation_evidence"][0]["hsm_attestation_sha256"],
        ),
        lambda item: item["image_provenance_evidence"].update(
            canonical_payload_sha256="0" * 64,
            payload_schema_sha256="0" * 64,
        ),
        lambda item: item["image_provenance_evidence"].update(
            oci_manifest_digest="sha256:" + "f" * 64
        ),
        lambda item: item["image_provenance_evidence"].update(
            oci_reference_keyed_commitment_sha256="0" * 64
        ),
        lambda item: item["effective_access_records"][1].update(
            denial_cause="NETWORK_FAILURE"
        ),
        lambda item: item["effective_access_records"].pop(),
        lambda item: item["effective_access_records"][0].update(
            principal_role="UNLISTED",
            permission="*",
        ),
        lambda item: item["effective_access_records"][0].update(
            tuple_id="alice@example.com"
        ),
        lambda item: item["effective_access_records"][0].update(
            policy_snapshot_sha256="0" * 64
        ),
        lambda item: item["alternate_credential_records"].pop(),
        lambda item: item["alternate_credential_records"][0].update(
            resource_purpose="UNRELATED_RESOURCE"
        ),
        lambda item: item["alternate_credential_records"][0].update(
            same_context_sha256="0" * 64
        ),
        lambda item: item["alternate_credential_records"][0].update(
            audit_correlation_sha256=item["effective_access_records"][0][
                "audit_correlation_sha256"
            ]
        ),
        lambda item: item["rollover_evidence"].update(
            executor_alias=item["rollover_evidence"]["approver_alias"]
        ),
        lambda item: item["rollover_evidence"].update(
            old_generation_alias=item["rollover_evidence"]["new_generation_alias"]
        ),
        lambda item: item["rollover_evidence"].update(
            approver_alias="e" * 32,
            executor_alias="d" * 32,
        ),
        lambda item: item["rollover_evidence"].update(
            two_approved_generations=True
        ),
        lambda item: item["rollover_evidence"].update(
            old_denial_sha256="1" * 64,
            new_allow_sha256="1" * 64,
            cross_key_denial_sha256="1" * 64,
        ),
        lambda item: item["rollover_evidence"].update(
            state="HELD_PENDING_SECTION_7_7_AND_7_8"
        ),
        lambda item: item["audit_interface_evidence"].update(
            raw_logs_retained_in_fluencytracr=True
        ),
        lambda item: item["audit_interface_evidence"].update(
            missing_operation_count=False
        ),
        lambda item: item["audit_interface_evidence"].update(
            completeness_window_start="2026-07-25T00:00:00Z",
            completeness_window_end="2026-07-24T00:00:00Z",
        ),
        lambda item: item["audit_interface_evidence"].update(
            completeness_window_start="2026-99-99T00:00:00Z"
        ),
        lambda item: item["audit_interface_evidence"].update(
            completeness_window_start="2030-01-01T00:00:00Z",
            completeness_window_end="2030-01-01T00:01:00Z",
        ),
        changed_section75_with_updated_interface_binding,
        lambda item: item["audit_interface_evidence"].update(
            operation_inventory_sha256="0" * 64
        ),
        lambda item: item["audit_interface_evidence"].update(
            section_7_5_approval_binding_sha256="0" * 64
        ),
        lambda item: item["audit_interface_evidence"].update(
            completeness_window_start="2020-01-01T00:00:00Z",
            completeness_window_end="2020-01-01T00:01:00Z",
        ),
        lambda item: item.update(
            evidence_state="OBSERVED_COMPLETE_FRESH_ALL_PROOFS_PASS",
            authority_effect="NONE_LIVE_EVIDENCE_CANNOT_AUTHORIZE_ALONE",
        ),
        lambda item: item.update(extra="unknown"),
    ]
    node = _nodes(contract)["security_authority_evidence_snapshot_hash"]
    for mutate in mutations:
        candidate = copy.deepcopy(original)
        mutate(candidate)
        _seal(candidate, node, "security_authority_evidence_snapshot_hash")
        with pytest.raises(ValueError):
            _validate_live_evidence_shape(candidate, contract)

    observed_contract = copy.deepcopy(contract)
    observed = copy.deepcopy(original)
    observed["evidence_state"] = "OBSERVED_COMPLETE_FRESH_ALL_PROOFS_PASS"
    observed["authority_effect"] = "NONE_LIVE_EVIDENCE_CANNOT_AUTHORIZE_ALONE"
    observed_contract["policy_schema"]["runtime_approved_hashes"] = [
        observed["security_authority_policy_hash"]
    ]
    approvals = observed_contract["live_evidence_contract"]["approval_domains"]
    for runtime_key, synthetic_key in (
        (
            "runtime_approved_privacy_boundary_policy_hashes",
            "synthetic_test_privacy_boundary_policy_hashes",
        ),
        (
            "runtime_approved_provenance_verifier_policy_hashes",
            "synthetic_test_provenance_verifier_policy_hashes",
        ),
        (
            "runtime_approved_deployment_gate_policy_hashes",
            "synthetic_test_deployment_gate_policy_hashes",
        ),
    ):
        approvals[runtime_key] = approvals[synthetic_key]
    approvals["runtime_approved_section_7_5_binding_hashes"] = [
        observed["audit_interface_evidence"]["section_7_5_approval_binding_sha256"]
    ]
    _seal(observed, node, "security_authority_evidence_snapshot_hash")
    with pytest.raises(ValueError, match="evidence snapshot hash is not runtime-approved"):
        _validate_live_evidence_shape(observed, observed_contract)


def test_executable_contract_verifier_checks_current_and_synthetic_evidence(
    tmp_path: Path,
) -> None:
    current = subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    current_payload = json.loads(current.stdout)
    assert current_payload["evidence_state"] == "NOT_OBSERVED_NO_GCP_ACCESS"
    assert current_payload["decision"] == (
        "GCP_SECURITY_AUTHORITY_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD"
    )
    contract = _json(CONTRACT)
    evidence = _synthetic_live_evidence_fixture(contract)
    evidence_path = tmp_path / "synthetic-evidence.json"
    evidence_path.write_text(json.dumps(evidence, sort_keys=True) + "\n")
    validated = subprocess.run(
        [
            sys.executable,
            str(CONTRACT_VERIFIER),
            "--evidence",
            str(evidence_path),
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    validated_payload = json.loads(validated.stdout)
    assert validated_payload["validated_evidence_state"] == (
        "SYNTHETIC_COMPLETE_SCHEMA_EXERCISE_NO_AUTHORITY"
    )
    assert validated_payload["validated_evidence_semantics"] == (
        "STRUCTURE_AND_DERIVATION_ONLY_NO_EXTERNAL_AUTHENTICITY_OR_COMPLETENESS_PROOF"
    )
    evidence["image_provenance_evidence"]["oci_manifest_digest"] = (
        "sha256:" + "f" * 64
    )
    node = _nodes(contract)["security_authority_evidence_snapshot_hash"]
    _seal(evidence, node, "security_authority_evidence_snapshot_hash")
    evidence_path.write_text(json.dumps(evidence, sort_keys=True) + "\n")
    rejected = subprocess.run(
        [
            sys.executable,
            str(CONTRACT_VERIFIER),
            "--evidence",
            str(evidence_path),
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert rejected.returncode == 1
    assert json.loads(rejected.stdout)["error_code"] == (
        "SECURITY_AUTHORITY_CONTRACT_VALIDATION_FAILED"
    )
    hostile = tmp_path / "hostile-evidence.json"
    hostile.write_text(
        '{"person@example.com":1,"person@example.com":2}\n'
    )
    hostile_result = subprocess.run(
        [
            sys.executable,
            str(CONTRACT_VERIFIER),
            "--evidence",
            str(hostile),
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert hostile_result.returncode == 1
    assert "person@example.com" not in hostile_result.stdout
    assert json.loads(hostile_result.stdout)["error_code"] == (
        "SECURITY_AUTHORITY_CONTRACT_VALIDATION_FAILED"
    )


def test_current_contract_cli_rejects_nonempty_subordinate_approval_domain(
    tmp_path: Path,
) -> None:
    scripts = tmp_path / "scripts"
    contract_dir = (
        tmp_path / "docs/contracts/canonical-inference-gcp-security-authority"
    )
    section71_dir = (
        tmp_path / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
    )
    scripts.mkdir()
    contract_dir.mkdir(parents=True)
    section71_dir.mkdir(parents=True)
    for source in SECTION71_DIR.iterdir():
        if source.is_file():
            shutil.copyfile(source, section71_dir / source.name)
    for source in (CONTRACT_VALIDATOR, CONTRACT_VERIFIER):
        shutil.copyfile(source, scripts / source.name)
    for source in (CONTRACT, MATRIX, REVALIDATION, SOURCES, VECTORS):
        shutil.copyfile(source, contract_dir / source.name)
    changed_contract = _strict_loads((contract_dir / CONTRACT.name).read_text())
    changed_contract["live_evidence_contract"]["approval_domains"][
        "runtime_approved_privacy_boundary_policy_hashes"
    ] = ["a" * 64]
    (contract_dir / CONTRACT.name).write_text(
        json.dumps(changed_contract, indent=2, sort_keys=True) + "\n"
    )
    changed_vectors = _strict_loads((contract_dir / VECTORS.name).read_text())
    changed_vectors["security_authority_contract_sha256"] = _sha(
        (contract_dir / CONTRACT.name).read_bytes()
    )
    (contract_dir / VECTORS.name).write_text(
        json.dumps(changed_vectors, indent=2, sort_keys=True) + "\n"
    )
    result = subprocess.run(
        [sys.executable, str(scripts / CONTRACT_VERIFIER.name)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert json.loads(result.stdout)["error_code"] == (
        "SECURITY_AUTHORITY_CONTRACT_VALIDATION_FAILED"
    )


def test_current_contract_cli_rejects_semantically_conflicting_revalidation(
    tmp_path: Path,
) -> None:
    scripts = tmp_path / "scripts"
    contract_dir = (
        tmp_path / "docs/contracts/canonical-inference-gcp-security-authority"
    )
    section71_dir = (
        tmp_path / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
    )
    scripts.mkdir()
    contract_dir.mkdir(parents=True)
    section71_dir.mkdir(parents=True)
    for source in SECTION71_DIR.iterdir():
        if source.is_file():
            shutil.copyfile(source, section71_dir / source.name)
    for source in (CONTRACT_VALIDATOR, CONTRACT_VERIFIER):
        shutil.copyfile(source, scripts / source.name)
    for source in (CONTRACT, MATRIX, REVALIDATION, SOURCES, VECTORS):
        shutil.copyfile(source, contract_dir / source.name)
    changed = _strict_loads((contract_dir / REVALIDATION.name).read_text())
    changed["source_count"] = changed["source_count"] + 1
    (contract_dir / REVALIDATION.name).write_text(
        json.dumps(changed, indent=2, sort_keys=True) + "\n"
    )
    vectors = _strict_loads((contract_dir / VECTORS.name).read_text())
    vectors["provider_revalidation_sha256"] = _sha(
        (contract_dir / REVALIDATION.name).read_bytes()
    )
    (contract_dir / VECTORS.name).write_text(
        json.dumps(vectors, indent=2, sort_keys=True) + "\n"
    )
    result = subprocess.run(
        [sys.executable, str(scripts / CONTRACT_VERIFIER.name)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert json.loads(result.stdout)["error_code"] == (
        "SECURITY_AUTHORITY_CONTRACT_VALIDATION_FAILED"
    )


def test_current_contract_cli_recomputes_provider_claim_registry(
    tmp_path: Path,
) -> None:
    scripts = tmp_path / "scripts"
    contract_dir = (
        tmp_path / "docs/contracts/canonical-inference-gcp-security-authority"
    )
    section71_dir = (
        tmp_path / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
    )
    scripts.mkdir()
    contract_dir.mkdir(parents=True)
    section71_dir.mkdir(parents=True)
    for source in SECTION71_DIR.iterdir():
        if source.is_file():
            shutil.copyfile(source, section71_dir / source.name)
    for source in (CONTRACT_VALIDATOR, CONTRACT_VERIFIER):
        shutil.copyfile(source, scripts / source.name)
    for source in (CONTRACT, MATRIX, REVALIDATION, SOURCES, VECTORS):
        shutil.copyfile(source, contract_dir / source.name)

    source_evidence = _strict_loads((contract_dir / SOURCES.name).read_text())
    source_evidence["claims"][0]["statement"] += " coordinated-splice"
    (contract_dir / SOURCES.name).write_text(
        json.dumps(source_evidence, indent=2, sort_keys=True) + "\n"
    )
    source_evidence_sha = _sha((contract_dir / SOURCES.name).read_bytes())

    revalidation = _strict_loads((contract_dir / REVALIDATION.name).read_text())
    revalidation["provider_source_evidence_sha256"] = source_evidence_sha
    (contract_dir / REVALIDATION.name).write_text(
        json.dumps(revalidation, indent=2, sort_keys=True) + "\n"
    )

    contract = _strict_loads((contract_dir / CONTRACT.name).read_text())
    contract["semantic_dependency"][
        "provider_source_evidence_sha256"
    ] = source_evidence_sha
    (contract_dir / CONTRACT.name).write_text(
        json.dumps(contract, indent=2, sort_keys=True) + "\n"
    )

    vectors = _strict_loads((contract_dir / VECTORS.name).read_text())
    vectors["provider_revalidation_sha256"] = _sha(
        (contract_dir / REVALIDATION.name).read_bytes()
    )
    vectors["security_authority_contract_sha256"] = _sha(
        (contract_dir / CONTRACT.name).read_bytes()
    )
    (contract_dir / VECTORS.name).write_text(
        json.dumps(vectors, indent=2, sort_keys=True) + "\n"
    )

    result = subprocess.run(
        [sys.executable, str(scripts / CONTRACT_VERIFIER.name)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert json.loads(result.stdout)["error_code"] == (
        "SECURITY_AUTHORITY_CONTRACT_VALIDATION_FAILED"
    )


def test_wif_digest_mode_lifecycle_conditions_and_alternate_paths_are_exact() -> None:
    policy = _json(CONTRACT)["policy_template"]
    digest_mode = policy["digest_mode"]
    assert digest_mode == {
        "wif_admission_mode": "CONTAINER_IMAGE_DIGEST",
        "signed_image_launch_mode": "PROHIBITED",
        "tee_signed_image_repos": "PROHIBITED",
        "image_signature_claim_admission": "PROHIBITED",
        "detached_provenance": "DEFINED_NOT_EXECUTED",
    }
    wif = policy["wif"]
    assert wif["pool"] == {
        "required_state": "ACTIVE",
        "disabled": False,
        "deleted": False,
    }
    assert wif["provider"] == {
        "type": "OIDC",
        "required_state": "ACTIVE",
        "disabled": False,
        "deleted": False,
    }
    assert wif["issuer_uri"] == "https://confidentialcomputing.googleapis.com"
    assert wif["subject_token_audience"] == "https://sts.googleapis.com"
    assert wif["allowed_audiences"] == ["https://sts.googleapis.com"]
    assert wif["sts_endpoint_binding"].startswith("EXTERNAL_RESTRICTED_")
    assert wif["sts_exchange_audience_binding"].startswith(
        "EXTERNAL_RESTRICTED_"
    )
    assert "sts.googleapis.com/v1/token" not in json.dumps(wif)
    assert wif["access_mode"] == "DIRECT_FEDERATED_RESOURCE_ACCESS"
    assert wif["service_account_impersonation"] == "PROHIBITED"
    assert wif["google_service_accounts_claim"] == "NOT_ADMITTED_OR_RETAINED"
    condition_ids = [item["condition_id"] for item in wif["condition_ast"]]
    assert condition_ids == sorted(condition_ids)
    assert set(condition_ids) == {
        "AUD_EXACT",
        "CMD_OVERRIDE_EMPTY",
        "DBGSTAT_PRODUCTION",
        "ENV_OVERRIDE_EMPTY",
        "HWMODEL_TDX",
        "IMAGE_DIGEST_EXACT",
        "ISSUER_EXACT",
        "MONITORING_MEMORY_DISABLED",
        "PROJECT_EXACT",
        "RESTART_NEVER",
        "SECURE_BOOT",
        "STABLE_SUPPORT",
        "SWNAME_EXACT",
        "ZONE_MEMBER",
    }
    mappings = {item["target"]: item for item in wif["attribute_mapping_ast"]}
    assert set(mappings) == {"attribute.image_digest", "google.subject"}
    assert mappings["google.subject"]["maximum_utf8_bytes"] == 127
    serialized = json.dumps(wif, sort_keys=True)
    assert "serviceAccount:" not in serialized
    assert "roles/iam.workloadIdentityUser" not in serialized
    assert EMAIL.search(serialized) is None
    alternate = policy["alternate_credentials"]
    assert alternate["retained_identity_values"] == "NONE"
    for required in (
        "METADATA_SERVER_ACCESS_TOKEN_KMS_ACCESS",
        "USER_MANAGED_SERVICE_ACCOUNT_KEY",
        "iam.serviceAccounts.getAccessToken",
        "iam.serviceAccounts.signBlob",
        "roles/iam.serviceAccountTokenCreator",
    ):
        assert required in alternate["prohibited_paths"]


def test_hsm_key_profiles_are_distinct_single_version_and_nonexportable() -> None:
    profiles = _json(CONTRACT)["policy_template"]["hsm_key_profiles"]
    assert len(profiles) == 2
    assert {item["key_purpose_id"] for item in profiles} == {
        "IMAGE_PROVENANCE_SIGNING_KEY",
        "RUNTIME_RECEIPT_SIGNING_KEY",
    }
    assert {item["signer_role"] for item in profiles} == {
        "IMAGE_SIGNER",
        "RUNTIME_SIGNER",
    }
    for profile in profiles:
        assert profile["generation_model"] == "DISTINCT_CRYPTOKEY_PER_GENERATION"
        assert profile["key_material_origin"] == (
            "GENERATED_IN_CLOUD_HSM_NEVER_UNENCRYPTED_OUTSIDE_HSM"
        )
        assert profile["protection_level"] == "HSM"
        assert profile["purpose"] == "ASYMMETRIC_SIGN"
        assert profile["algorithm"] == "EC_SIGN_P256_SHA256"
        assert profile["version_ids"] == ["1"]
        assert profile["version_state"] == "ENABLED"
        assert profile["automatic_rotation_fields"] == "PROHIBITED"
        assert profile["cross_key_access"] == "DENY"
        assert set(profile["required_commitments"]) == {
            "CRYPTO_KEY_GENERATION_OPAQUE_ALIAS",
            "SPKI_DER_SHA256",
            "HSM_ATTESTATION_SHA256",
            "HSM_CERTIFICATE_CHAIN_SHA256",
        }


def test_detached_image_provenance_does_not_claim_runtime_enforcement() -> None:
    provenance = _json(CONTRACT)["policy_template"]["image_provenance"]
    assert provenance["mode"] == "DETACHED_PREDEPLOYMENT_PROVENANCE_ONLY"
    assert provenance["signature_algorithm_mapping"] == {
        "kms": "EC_SIGN_P256_SHA256",
        "confidential_space_claim": "ECDSA_P256_SHA256",
    }
    assert provenance["cosign_interoperability"].startswith("UNPROVEN_")
    assert provenance["binary_authorization_compute_enforcement"] == "NOT_CLAIMED"
    assert provenance["deployment_gate"] == {
        "required_before_deploy": True,
        "verifier_role": "PUBLIC_KEY_VERIFIER",
        "required_result": "DETACHED_PROVENANCE_VALID_FOR_EXACT_OCI_DIGEST",
        "result_commitment": "REQUIRED_EXTERNAL_RESTRICTED_EVIDENCE",
        "missing_or_mismatch": "REJECT_DEPLOYMENT_CANDIDATE",
    }
    schema = provenance["simple_signing_schema"]
    assert schema["optional"] == {}
    assert schema["critical.type"] == "cosign container image signature"
    assert schema["required_paths"] == sorted(schema["required_paths"])
    assert provenance["payload_schema_sha256"] == _sha(_canonical(schema))
    assert provenance["signing_composition"] == {
        "payload_bytes": "FT_CANONICAL_JSON_V1_OF_RESOLVED_SIMPLE_SIGNING_OBJECT",
        "digest_to_sign": "SHA256_OF_EXACT_CANONICAL_PAYLOAD_BYTES",
        "kms_request_field": "digest.sha256",
        "signature_encoding": "DER_ECDSA_EXTERNAL_RESTRICTED_NOT_RETAINED",
        "required_bindings": [
            "OCI_MANIFEST_DIGEST",
            "OCI_REFERENCE_COMMITMENT",
            "IMAGE_PROVENANCE_SIGNING_KEY",
            "GENERATION_ALIAS",
            "KEY_VERSION_1",
            "EC_SIGN_P256_SHA256",
            "SPKI_DER_SHA256",
            "PAYLOAD_SCHEMA_SHA256",
        ],
    }


def test_effective_access_audit_and_rollover_are_fail_closed() -> None:
    contract = _json(CONTRACT)
    effective = contract["effective_access_evidence_schema"]
    assert len(effective["tuple_universe"]) == 56
    assert effective["positive_tuple_count"] == 4
    assert effective["negative_tuple_count"] == 52
    assert effective["tuple_universe_sha256"] == _sha(
        _canonical(effective["tuple_universe"])
    )
    assert len(effective["alternate_credential_routes"]) == 9
    assert effective["same_context_required_within_context_group"] is True
    assert effective["ambiguous_failure"] == "HOLD"
    assert effective["unknown_policy_or_controller"] == "HOLD"
    policy_effective = contract["policy_template"]["effective_access"]
    assert policy_effective["policy_troubleshooter_for_workload_identity"].startswith(
        "NOT_AUTHORITATIVE"
    )
    assert policy_effective["unproven_deny_support_for_use_to_sign"] == (
        "DO_NOT_RELY"
    )
    rollover = contract["rollover_state_machine"]
    assert rollover["automatic_rotation"] == "PROHIBITED"
    assert rollover["two_approved_generations"] == "PROHIBITED"
    assert rollover["propagation_delay_timer"] == (
        "PROHIBITED_USE_OBSERVED_CANARIES"
    )
    assert rollover["states"][0] == "HOLD_PREPARE"
    assert rollover["states"][-1] == "HELD_PENDING_SECTION_7_7_AND_7_8"
    audit = contract["audit_evidence_interface"]
    assert audit["persistence_mechanism"] == "DEFERRED_TO_SECTION_7_5"
    assert audit["raw_logs_in_fluencytracr"] == "PROHIBITED"
    assert audit["kms_asymmetric_sign_data_access"].startswith(
        "SOURCE_CLOSED_MUST_BE_ENABLED"
    )
    assert audit["section_7_5_provider_method_mapping"].startswith(
        "REQUIRED_EXACT_SOURCE_REVALIDATION"
    )
    assert audit["other_operation_auditability"].startswith("UNPROVEN_")
    assert audit["policy_denied_exclusions"].startswith("PROHIBITED_IF_")
    assert "services" not in audit
    assert len(audit["required_authority_operation_ids"]) == 10
    assert contract["live_evidence_contract"]["audit_interface_evidence"][
        "operation_inventory_sha256_expected"
    ] == _sha(_canonical(audit["required_authority_operation_ids"]))
    destroy = rollover["destroy_restore"]
    assert destroy["approver_role"] == "KEY_DESTRUCTION_APPROVER"
    assert destroy["executor_role"] == "KEY_DESTRUCTION_EXECUTOR"
    assert destroy["controller_sets_pairwise_disjoint"] is True


def test_golden_vectors_replay_exact_bytes_and_dependencies() -> None:
    contract = _json(CONTRACT)
    vectors_artifact = _json(VECTORS)
    assert vectors_artifact["synthetic_only"] is True
    assert vectors_artifact["authorization_effect"] == "NONE_TEST_VECTORS_ONLY"
    assert vectors_artifact["security_authority_contract_sha256"] == _sha(
        CONTRACT.read_bytes()
    )
    assert vectors_artifact["provider_revalidation_sha256"] == _sha(
        REVALIDATION.read_bytes()
    )
    assert vectors_artifact["role_capability_matrix_sha256"] == _sha(
        MATRIX.read_bytes()
    )
    nodes = _nodes(contract)
    vectors = _vectors()
    assert set(vectors) == {
        "security_authority_policy_hash",
        "security_authority_evidence_snapshot_hash",
    }
    for node_id, vector in vectors.items():
        field = node_id
        stored = vector["stored_object"]
        body = dict(stored)
        observed = body.pop(field)
        body_bytes = _canonical(body)
        preimage = (
            nodes[node_id]["domain_separator"].encode("ascii")
            + b"\x00"
            + body_bytes
        )
        assert base64.b64decode(vector["canonical_body_utf8_base64"]) == body_bytes
        assert vector["canonical_body_sha256"] == _sha(body_bytes)
        assert base64.b64decode(vector["domain_separated_preimage_base64"]) == preimage
        assert vector["expected_hash"] == observed == _sha(preimage)
    _validate_policy(vectors["security_authority_policy_hash"]["stored_object"], contract)
    _validate_evidence(
        vectors["security_authority_evidence_snapshot_hash"]["stored_object"],
        contract,
    )


def test_coordinated_rehash_cannot_promote_synthetic_or_change_policy() -> None:
    contract = _json(CONTRACT)
    nodes = _nodes(contract)
    vectors = _vectors()
    policy = copy.deepcopy(vectors["security_authority_policy_hash"]["stored_object"])
    mutations = [
        lambda item: item.update(authority_effect="AUTHORIZED"),
        lambda item: item["wif"]["provider"].update(disabled=True),
        lambda item: item["wif"]["provider"].update(disabled=0),
        lambda item: item["wif"].update(service_account_impersonation="ALLOWED"),
        lambda item: item["digest_mode"].update(signed_image_launch_mode="ALLOWED"),
        lambda item: item["hsm_key_profiles"][0].update(version_ids=["1", "2"]),
        lambda item: item["hsm_key_profiles"][0].update(protection_level="SOFTWARE"),
        lambda item: item["effective_access"].update(unknown_or_unviewable="ALLOW"),
        lambda item: item["rollover"].update(two_approved_generations="ALLOWED"),
        lambda item: item["privacy"]["allowed"].append("RAW_PRINCIPAL"),
        lambda item: item.update(runtime_profile_hash="a" * 64),
    ]
    for mutate in mutations:
        candidate = copy.deepcopy(policy)
        mutate(candidate)
        _seal(candidate, nodes["security_authority_policy_hash"], "security_authority_policy_hash")
        with pytest.raises(ValueError):
            _validate_policy(candidate, contract)

    evidence = copy.deepcopy(
        vectors["security_authority_evidence_snapshot_hash"]["stored_object"]
    )
    evidence["evidence_state"] = "OBSERVED_COMPLETE_FRESH_ALL_PROOFS_PASS"
    evidence["authority_effect"] = "AUTHORIZED"
    _seal(
        evidence,
        nodes["security_authority_evidence_snapshot_hash"],
        "security_authority_evidence_snapshot_hash",
    )
    with pytest.raises(ValueError):
        _validate_evidence(evidence, contract)


def test_canonicalization_rejects_duplicate_float_null_unicode_and_stale_hash() -> None:
    for text in (
        '{"a":1,"a":2}',
        '{"a":1.0}',
        '{"a":null}',
        '{"a":NaN}',
        '{"a":-0}',
    ):
        with pytest.raises(ValueError):
            _strict_loads(text)
    with pytest.raises(ValueError):
        _canonical({"value": "e\u0301"})
    with pytest.raises(ValueError):
        _canonical({"value": "bad\u0000"})
    with pytest.raises(ValueError):
        _canonical({"value": "\ud800"})
    assert _validation_module._parse_utc(
        "2026-07-24T00:00:00.000000001Z"
    ) < _validation_module._parse_utc("2026-07-24T00:00:00.000000009Z")
    for timestamp in (
        "2026-07-24 00:00:00Z",
        "2026-07-24T00:00Z",
        "2026-07-24T00:00:00+00:00",
        "2026-99-99T00:00:00Z",
    ):
        with pytest.raises(ValueError):
            _validation_module._parse_utc(timestamp)
    contract = _json(CONTRACT)
    stored = copy.deepcopy(_vectors()["security_authority_policy_hash"]["stored_object"])
    stored["policy_id"] = "stale"
    with pytest.raises(ValueError, match="stale self hash"):
        _validate_policy(stored, contract)


def test_decision_precedence_future_ownership_and_nonauthorization_are_closed() -> None:
    contract = _json(CONTRACT)
    decision = contract["decision_algorithm"]
    assert decision["precedence"] == [
        "REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE",
        "REJECT_FOR_PROVIDER_CONFLICT_OR_UNSUPPORTED_CLAIM",
        "HOLD_FOR_PROVIDER_SOURCE_UNAVAILABLE_OR_DRIFT",
        "REJECT_FOR_ROLE_OR_CONTROLLER_COLLISION",
        "REJECT_FOR_KEY_WIF_POLICY_OR_DIGEST_MODE_MISMATCH",
        "HOLD_FOR_INCOMPLETE_STALE_OR_AMBIGUOUS_EVIDENCE",
        "GCP_SECURITY_AUTHORITY_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD",
    ]
    assert decision["unknown_or_missing"] == (
        "REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE"
    )
    assert decision["no_additive_authority_under_composition"] is True
    assert decision["maximum_state"] == (
        "CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD"
    )
    interfaces = {item["owner"]: item for item in contract["future_interfaces"]}
    assert set(interfaces) == {
        "SECTION_7_4",
        "SECTION_7_5",
        "SECTION_7_6",
        "SECTION_7_7",
        "SECTION_7_8",
    }
    assert interfaces["SECTION_7_4"]["section_7_3_defines_receipt_preimage"] is False
    assert "FRESH_HUMAN_EXECUTION_AUTHORIZATION" in interfaces["SECTION_7_8"][
        "must_require"
    ]
    assert not any(contract["non_authorization"].values())


def test_normative_runtime_artifacts_contain_no_direct_identifiers_or_secrets() -> None:
    # Public-source evidence is intentionally excluded: its external recovery
    # exception may contain public documentation examples.
    for path in (CONTRACT, MATRIX, VECTORS, README):
        text = path.read_text(encoding="utf-8")
        assert EMAIL.search(text) is None
        for forbidden in (
            "serviceAccount:",
            "principalSet://",
            "@ft-qualification",
            "PRIVATE KEY-----",
            "BEGIN PRIVATE KEY",
            "raw_attestation_token",
        ):
            assert forbidden not in text
    contract = _json(CONTRACT)
    assert "PERSON_USER_EMPLOYEE_ACCOUNT_EMAIL_GROUP_DOMAIN_IDENTIFIERS" in contract[
        "privacy"
    ]["prohibited"]
    assert "PLAIN_OR_DICTIONARYABLE_IDENTIFIER_HASHES" in contract["privacy"][
        "prohibited"
    ]


def test_docs_parent_attribution_and_scope_are_consistent() -> None:
    readme = " ".join(README.read_text(encoding="utf-8").split())
    parent = PARENT.read_text(encoding="utf-8")
    section72 = " ".join(SECTION72.read_text(encoding="utf-8").split())
    plan = PLAN.read_text(encoding="utf-8")
    attribution = ATTRIBUTION.read_text(encoding="utf-8")
    assert "GCP_SECURITY_AUTHORITY_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD" in readme
    assert "No Section 7.2 profile, control, instance, or hash value enters" in readme
    assert "No live GCP action may begin" in readme
    assert (
        "Missing source or source drift HOLDs. Conflicting current documentation "
        "or unsupported claims reject."
    ) in readme
    assert "provider source unavailable/drift" in plan
    assert "unsupported claims reject" in plan
    assert "HSM, WIF, IAM, and role-separation contract" in parent
    assert "canonical-inference-gcp-security-authority" in parent
    assert "Section 7.3" in section72 and "does not authorize that work" in section72
    assert "No GCP project/resource reads or writes" in plan
    assert "GCP security-authority qualification" in attribution
    assert "6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3" in attribution


def test_normative_artifact_bytes_are_exactly_pinned() -> None:
    for relative, expected in PINNED_ARTIFACTS.items():
        assert expected != "PENDING"
        assert _sha((ROOT / relative).read_bytes()) == expected
