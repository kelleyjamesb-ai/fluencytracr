from __future__ import annotations

import copy
import json
import re
from collections import Counter
from hashlib import sha256
from datetime import datetime
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

import pytest

from scripts.verify_gcp_provider_source_bundle import (
    BundleVerificationError,
    derive_decision as production_derive_decision,
    load_claim_evidence,
    verify_bundle,
)

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_DIR = (
    ROOT / "docs" / "contracts" / "canonical-inference-gcp-provider-vocabulary"
)
CONTRACT = CONTRACT_DIR / "README.md"
SOURCES = CONTRACT_DIR / "source-evidence.json"
CLAIMS = CONTRACT_DIR / "claim-evidence.json"
COMPUTE = CONTRACT_DIR / "compute-field-projection.json"

READY = "GCP_PROVIDER_VOCABULARY_READY_FOR_RUNTIME_OBJECT_HARDENING"
HOLD = "HOLD_FOR_PROVIDER_CLAIM_REVALIDATION"
CONFLICT = "REJECT_FOR_PROVIDER_CLAIM_CONFLICT"
BOUNDARY = "REJECT_FOR_BOUNDARY_LEAKAGE"
EXPECTED_CLAIM_REGISTRY_SHA256 = (
    "4d9a53791b6f3dc8fec4b0dfe7d7d0ad6ef7fdd502f15193fe35989291fc062c"
)
EXPECTED_REQUIRED_SECTIONS = {"2", "6", "7", "8", "9", "10"}
EXPECTED_ARTIFACT_SHA256 = {
    "README.md": "a85e18b93f51303d26c46e0839705437a794c23957cde9f07b81afdf9d77bcda",
    "source-evidence.json": "939ebe94f73754caa0e05ed5f740e5d0fcc5e3f136b265ea5fbc5579cfd09743",
    "claim-evidence.json": "b6e5b878de67efbabbda699332e608af7c112d20c62910ea6ebd033bdb75e422",
    "compute-field-projection.json": "f161f131530ec5e978ff4a86cd965b92088617efd21f2810b0ab4e1e41f5815c",
    "../../../scripts/verify_gcp_provider_source_bundle.py": "fe2050c034c82d699cbf5e184091664a552842b80a35fea46c307de80b55eb9b",
}

EXPECTED_SOURCE_IDS = {
    "GCP_CPU_PLATFORMS_2026_07_24",
    "GCP_C3_MACHINE_TYPES_2026_07_24",
    "GCP_CONFIDENTIAL_VM_CONFIG_2026_07_24",
    "GCP_CONFIDENTIAL_VM_ATTESTATION_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_OVERVIEW_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_ASSERTIONS_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_TOKEN_CLAIMS_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_TOKEN_VALIDATION_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_DEPLOY_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_METADATA_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_LAUNCH_POLICY_2026_07_24",
    "GCP_CONFIDENTIAL_SPACE_WORKLOAD_2026_07_24",
    "GCP_COMPUTE_INSTANCES_REST_2026_07_24",
    "GCP_COMPUTE_DISCOVERY_V1_2026_07_24",
    "GCP_SOLE_TENANCY_2026_07_24",
    "GCP_HOST_EVENTS_2026_07_24",
}


def _json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


EXPECTED_DECISION_ALGORITHM = {
    "version": "GCP_PROVIDER_DECISION_V1",
    "observation_to_state": {
        "CONTRADICTS_FROZEN_MAPPING": "CONFLICTING_PROVIDER_EVIDENCE",
        "SOURCE_OR_PROVENANCE_UNAVAILABLE": "REVALIDATION_REQUIRED",
        "FIELD_UNAVAILABLE_FROM_PROVIDER": "UNAVAILABLE_FROM_PROVIDER",
        "MATCHED_FROZEN_MAPPING": "CONFIRMED_AT_RETRIEVAL",
    },
    "required_claim_state_precedence": [
        "CONFLICTING_PROVIDER_EVIDENCE",
        "REVALIDATION_REQUIRED",
        "UNAVAILABLE_FROM_PROVIDER",
        "CONFIRMED_AT_RETRIEVAL",
    ],
    "ready_requires": {
        "all_required_claims_confirmed": True,
        "all_required_sections_covered_by_required_claims": True,
        "all_source_ids_resolve": True,
        "no_boundary_leakage": True,
    },
    "non_required_unavailable_disposition": "DEFAULT_DENY_NO_PROMOTION",
}


def _claim_registry_sha256(claims: list[dict]) -> str:
    material = json.dumps(claims, sort_keys=True, separators=(",", ":")).encode()
    return sha256(material).hexdigest()


def _project_claim_state(claim: dict, algorithm: dict) -> str:
    assert claim["source_requirement"] == "ALL"
    assert claim["source_ids"]
    assert len(claim["source_ids"]) == len(set(claim["source_ids"]))
    observations = claim["source_observations"]
    assert len(observations) == len(claim["source_ids"])
    assert {item["source_id"] for item in observations} == set(claim["source_ids"])
    mapping = algorithm["observation_to_state"]
    observed_states = {mapping[item["observation"]] for item in observations}
    return next(
        state for state in algorithm["required_claim_state_precedence"]
        if state in observed_states
    )


def _derive_decision(
    claims_payload: dict,
    source_ids: set[str],
    *,
    boundary_leakage: bool = False,
    enforce_registry_commitment: bool = True,
) -> str:
    if boundary_leakage:
        return BOUNDARY
    algorithm = claims_payload["decision_algorithm"]
    if algorithm != EXPECTED_DECISION_ALGORITHM:
        return HOLD
    claims = claims_payload["claims"]
    if (
        claims_payload.get("claim_count") != len(claims)
        or len(claims) != 20
        or claims_payload.get("source_observation_count")
        != sum(len(claim["source_observations"]) for claim in claims)
        or claims_payload.get("source_observation_count") != 22
        or (
            enforce_registry_commitment
            and (
                claims_payload.get("claim_registry_sha256")
                != _claim_registry_sha256(claims)
                or claims_payload.get("claim_registry_sha256")
                != EXPECTED_CLAIM_REGISTRY_SHA256
            )
        )
        or set(claims_payload.get("required_sections", []))
        != EXPECTED_REQUIRED_SECTIONS
    ):
        return HOLD
    projected: dict[str, str] = {}
    try:
        for claim in claims:
            projected[claim["claim_id"]] = _project_claim_state(claim, algorithm)
    except (AssertionError, KeyError, StopIteration):
        return HOLD
    for claim in claims:
        actual = projected[claim["claim_id"]]
        recorded = claim["snapshot_state"]
        if actual != recorded:
            if "CONFLICTING_PROVIDER_EVIDENCE" in {actual, recorded}:
                return CONFLICT
            return HOLD
    if any(
        projected[claim["claim_id"]] == "CONFLICTING_PROVIDER_EVIDENCE"
        for claim in claims
    ):
        return CONFLICT
    required = [claim for claim in claims if claim["required_for_ready"]]
    if any(
        projected[claim["claim_id"]] != "CONFIRMED_AT_RETRIEVAL"
        for claim in required
    ):
        return HOLD
    if any(
        not set(claim["source_ids"]).issubset(source_ids)
        or not claim["locators"]
        for claim in claims
    ):
        return HOLD
    if {
        source_id for claim in claims for source_id in claim["source_ids"]
    } != source_ids:
        return HOLD
    covered = {
        section
        for claim in required
        if projected[claim["claim_id"]] == "CONFIRMED_AT_RETRIEVAL"
        for section in claim["covers_sections"]
    }
    if not set(claims_payload["required_sections"]).issubset(covered):
        return HOLD
    return READY


def test_normative_artifact_bytes_are_exactly_pinned() -> None:
    for relative, expected in EXPECTED_ARTIFACT_SHA256.items():
        path = (CONTRACT_DIR / relative).resolve()
        assert _sha256(path) == expected


def test_source_evidence_is_complete_bounded_and_replayable() -> None:
    payload = _json(SOURCES)
    assert payload["schema_version"] == "GCP_PROVIDER_SOURCE_EVIDENCE_V1"
    assert payload["content_retention"] == "HASH_ONLY_EXTERNAL_SNAPSHOT_UNTRACKED"
    bundle = payload["external_snapshot_bundle"]
    assert bundle["repository_storage"] == "EXTERNAL_UNTRACKED"
    assert bundle["storage_locator"] == (
        "external-recovery://fluencytracr/"
        "gcp-provider-vocabulary-source-snapshot-20260724T030000Z.zip"
    )
    assert bundle["bundle_id"] == "gcp-provider-vocabulary-source-snapshot-20260724T030000Z"
    assert bundle["archive_format"] == "ZIP_DEFLATE_FIXED_METADATA_V1"
    assert bundle["fixed_member_timestamp"] == "1980-01-01T00:00:00"
    assert bundle["fixed_unix_mode"] == "0100644"
    assert bundle["bytes"] > 0
    assert re.fullmatch(r"[0-9a-f]{64}", bundle["sha256"])
    members = bundle["members"]
    assert bundle["member_order"] == [member["archive_name"] for member in members]
    assert len(members) == 18
    assert len({member["archive_name"] for member in members}) == len(members)
    assert {member["archive_name"] for member in members[-2:]} == {
        "sources.tsv",
        "items.ndjson",
    }

    start = _timestamp(payload["retrieval_started_at"])
    end = _timestamp(payload["retrieval_completed_at"])
    assert start < end
    sources = payload["sources"]
    assert len(sources) == len(EXPECTED_SOURCE_IDS)
    assert {source["source_id"] for source in sources} == EXPECTED_SOURCE_IDS
    assert len({source["official_url"] for source in sources}) == len(sources)

    member_by_source = {
        member["source_id"]: member for member in members if member["source_id"]
    }
    assert set(member_by_source) == EXPECTED_SOURCE_IDS
    for source in sources:
        assert source["http_status"] == 200
        assert source["retrieved_bytes"] > 0
        assert re.fullmatch(r"[0-9a-f]{64}", source["sha256"])
        assert source["official_url"].startswith("https://")
        assert source["effective_url"].startswith("https://")
        member = member_by_source[source["source_id"]]
        assert member["bytes"] == source["retrieved_bytes"]
        assert member["sha256"] == source["sha256"]
        assert start <= _timestamp(source["retrieved_at_start"])
        assert _timestamp(source["retrieved_at_end"]) <= end
        if source["source_id"] == "GCP_COMPUTE_DISCOVERY_V1_2026_07_24":
            assert source["provider_revision"] == "20260709"
        else:
            assert source["provider_last_updated"] == "2026-07-17"


def test_bundle_verifier_accepts_exact_bytes_and_rejects_tamper(tmp_path: Path) -> None:
    source_data = b"<html><body>official source</body></html>"
    source = {
        "source_id": "SOURCE_1",
        "official_url": "https://example.test/source",
        "retrieved_bytes": len(source_data),
        "sha256": sha256(source_data).hexdigest(),
    }
    member_data = {
        "source-01": source_data,
        "sources.tsv": b"SOURCE_1\thttps://example.test/source\n",
        "items.ndjson": (
            json.dumps(source, sort_keys=True, separators=(",", ":")) + "\n"
        ).encode(),
    }
    bundle = tmp_path / "bundle.zip"
    with ZipFile(bundle, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in member_data.items():
            info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    members = [
        {
            "archive_name": name,
            "source_id": "SOURCE_1" if name == "source-01" else None,
            "bytes": len(data),
            "sha256": sha256(data).hexdigest(),
        }
        for name, data in member_data.items()
    ]
    evidence = {
        "sources": [source],
        "external_snapshot_bundle": {
            "archive_format": "ZIP_DEFLATE_FIXED_METADATA_V1",
            "bytes": bundle.stat().st_size,
            "sha256": sha256(bundle.read_bytes()).hexdigest(),
            "member_order": list(member_data),
            "members": members,
        },
    }
    evidence_path = tmp_path / "evidence.json"
    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
    needles = ["official source"]
    contexts = ["official source"]
    commitment_material = json.dumps(
        {
            "source_id": "SOURCE_1",
            "source_sha256": source["sha256"],
            "evidence_needles": needles,
            "evidence_contexts": contexts,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    claims = {
        "artifact_bindings": {
            "source_evidence_sha256": sha256(evidence_path.read_bytes()).hexdigest()
        },
        "claims": [
            {
                "claim_id": "CLAIM_1",
                "source_observations": [
                    {
                        "source_id": "SOURCE_1",
                        "evidence_needles": needles,
                        "evidence_contexts": contexts,
                        "evidence_commitment_sha256": sha256(
                            commitment_material
                        ).hexdigest(),
                    }
                ],
            }
        ],
    }
    claims_path = tmp_path / "claims.json"
    claims_path.write_text(json.dumps(claims), encoding="utf-8")
    verify_bundle(
        bundle,
        evidence_path,
        claims_path,
        enforce_compiled_commitments=False,
    )

    bad_evidence = copy.deepcopy(evidence)
    bad_evidence["sources"][0]["official_url"] = "https://example.invalid/tamper"
    evidence_path.write_text(json.dumps(bad_evidence), encoding="utf-8")
    bad_claims = copy.deepcopy(claims)
    bad_claims["artifact_bindings"]["source_evidence_sha256"] = sha256(
        evidence_path.read_bytes()
    ).hexdigest()
    claims_path.write_text(json.dumps(bad_claims), encoding="utf-8")
    with pytest.raises(BundleVerificationError, match="sources.tsv disagrees"):
        verify_bundle(
            bundle,
            evidence_path,
            claims_path,
            enforce_compiled_commitments=False,
        )

    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
    claims_path.write_text(json.dumps(claims), encoding="utf-8")
    bundle.write_bytes(bundle.read_bytes() + b"tamper")
    with pytest.raises(BundleVerificationError, match="byte length mismatch"):
        verify_bundle(
            bundle,
            evidence_path,
            claims_path,
            enforce_compiled_commitments=False,
        )


def test_claim_envelope_rejects_schema_authorization_and_format_drift(
    tmp_path: Path,
) -> None:
    baseline = load_claim_evidence(CLAIMS)
    assert baseline["schema_version"] == "GCP_PROVIDER_CLAIM_EVIDENCE_V1"

    mutations = []
    schema = copy.deepcopy(baseline)
    schema["schema_version"] = "ARBITRARY_CLAIM_SCHEMA_V999"
    mutations.append(json.dumps(schema, indent=2, sort_keys=True) + "\n")
    authorization = copy.deepcopy(baseline)
    authorization["authorization"] = "QUALIFICATION_AND_MODEL_EXECUTION_AUTHORIZED"
    mutations.append(json.dumps(authorization, indent=2, sort_keys=True) + "\n")
    mutations.append(json.dumps(baseline, separators=(",", ":")))

    for index, content in enumerate(mutations):
        path = tmp_path / f"mutated-claims-{index}.json"
        path.write_text(content, encoding="utf-8")
        with pytest.raises(
            BundleVerificationError,
            match="claim evidence exact-byte commitment mismatch",
        ):
            load_claim_evidence(path)


def test_claim_graph_derives_ready_and_every_source_is_covered() -> None:
    sources = _json(SOURCES)
    claims = _json(CLAIMS)
    assert claims["artifact_bindings"] == {
        "source_evidence_sha256": _sha256(SOURCES),
        "compute_field_projection_sha256": _sha256(COMPUTE),
    }
    source_ids = {source["source_id"] for source in sources["sources"]}
    claim_ids = [claim["claim_id"] for claim in claims["claims"]]
    assert claims["claim_count"] == len(claim_ids) == 20
    assert claims["source_observation_count"] == 22
    assert len(claim_ids) == len(set(claim_ids))
    assert set(claims["required_sections"]) == EXPECTED_REQUIRED_SECTIONS
    assert claims["claim_registry_sha256"] == _claim_registry_sha256(
        claims["claims"]
    ) == EXPECTED_CLAIM_REGISTRY_SHA256
    assert {
        source_id
        for claim in claims["claims"]
        for source_id in claim["source_ids"]
    } == source_ids
    assert _derive_decision(claims, source_ids) == READY
    assert production_derive_decision(claims, source_ids) == READY
    assert claims["recorded_decision"] == READY

    tee_env = next(
        claim for claim in claims["claims"]
        if claim["claim_id"] == "GCP_TEE_ENV_SUFFIX_GRAMMAR"
    )
    assert tee_env["required_for_ready"] is False
    assert tee_env["snapshot_state"] == "UNAVAILABLE_FROM_PROVIDER"
    assert (
        claims["decision_algorithm"]["non_required_unavailable_disposition"]
        == "DEFAULT_DENY_NO_PROMOTION"
    )


def test_decision_algorithm_fails_closed_on_counterexamples() -> None:
    source_ids = EXPECTED_SOURCE_IDS
    original = _json(CLAIMS)

    conflict = copy.deepcopy(original)
    conflict["claims"][0]["source_observations"][0]["observation"] = (
        "CONTRADICTS_FROZEN_MAPPING"
    )
    conflict["claims"][0]["snapshot_state"] = "CONFLICTING_PROVIDER_EVIDENCE"
    assert _derive_decision(
        conflict, source_ids, enforce_registry_commitment=False
    ) == CONFLICT

    unavailable = copy.deepcopy(original)
    unavailable["claims"][0]["source_observations"][0]["observation"] = (
        "FIELD_UNAVAILABLE_FROM_PROVIDER"
    )
    unavailable["claims"][0]["snapshot_state"] = "UNAVAILABLE_FROM_PROVIDER"
    assert _derive_decision(
        unavailable, source_ids, enforce_registry_commitment=False
    ) == HOLD

    mixed = copy.deepcopy(original)
    compute = next(
        claim for claim in mixed["claims"]
        if claim["claim_id"] == "GCP_COMPUTE_INSTANCE_FIELD_SET"
    )
    compute["source_observations"][0]["observation"] = (
        "SOURCE_OR_PROVENANCE_UNAVAILABLE"
    )
    compute["source_observations"][1]["observation"] = (
        "CONTRADICTS_FROZEN_MAPPING"
    )
    compute["snapshot_state"] = "CONFLICTING_PROVIDER_EVIDENCE"
    assert _derive_decision(
        mixed, source_ids, enforce_registry_commitment=False
    ) == CONFLICT

    nonrequired_conflict = copy.deepcopy(original)
    tee_conflict = next(
        claim for claim in nonrequired_conflict["claims"]
        if claim["claim_id"] == "GCP_TEE_ENV_SUFFIX_GRAMMAR"
    )
    tee_conflict["source_observations"][0]["observation"] = (
        "CONTRADICTS_FROZEN_MAPPING"
    )
    tee_conflict["snapshot_state"] = "CONFLICTING_PROVIDER_EVIDENCE"
    assert _derive_decision(
        nonrequired_conflict,
        source_ids,
        enforce_registry_commitment=False,
    ) == CONFLICT

    missing_source = copy.deepcopy(original)
    missing_source["claims"][0]["source_ids"] = ["GCP_UNKNOWN_SOURCE_2026_07_24"]
    assert _derive_decision(missing_source, source_ids) == HOLD

    missing_coverage = copy.deepcopy(original)
    for claim in missing_coverage["claims"]:
        if claim["required_for_ready"]:
            claim["covers_sections"] = [
                section for section in claim["covers_sections"] if section != "7"
            ]
    tee_env = next(
        claim for claim in missing_coverage["claims"]
        if claim["claim_id"] == "GCP_TEE_ENV_SUFFIX_GRAMMAR"
    )
    tee_env["source_observations"][0]["observation"] = "MATCHED_FROZEN_MAPPING"
    tee_env["snapshot_state"] = "CONFIRMED_AT_RETRIEVAL"
    assert _derive_decision(missing_coverage, source_ids) == HOLD

    reversed_precedence = copy.deepcopy(original)
    reversed_precedence["decision_algorithm"][
        "required_claim_state_precedence"
    ].reverse()
    assert _derive_decision(reversed_precedence, source_ids) == HOLD

    weakened_ready = copy.deepcopy(original)
    weakened_ready["decision_algorithm"]["ready_requires"][
        "all_required_claims_confirmed"
    ] = False
    assert _derive_decision(weakened_ready, source_ids) == HOLD

    duplicate_observation = copy.deepcopy(original)
    duplicate_observation["claims"][0]["source_observations"].append(
        copy.deepcopy(duplicate_observation["claims"][0]["source_observations"][0])
    )
    assert _derive_decision(duplicate_observation, source_ids) == HOLD

    demoted_claim = copy.deepcopy(original)
    demoted_claim["claims"][1]["required_for_ready"] = False
    assert _derive_decision(demoted_claim, source_ids) == HOLD

    deleted_claim = copy.deepcopy(original)
    deleted_claim["claims"].pop(1)
    assert _derive_decision(deleted_claim, source_ids) == HOLD

    reduced_sections = copy.deepcopy(original)
    reduced_sections["required_sections"].remove("10")
    assert _derive_decision(reduced_sections, source_ids) == HOLD

    changed_mapping = copy.deepcopy(original)
    changed_mapping["claims"][0]["frozen_mapping"] = "arbitrary replacement"
    assert _derive_decision(changed_mapping, source_ids) == HOLD
    assert _derive_decision(original, source_ids, boundary_leakage=True) == BOUNDARY
    assert production_derive_decision(
        original, source_ids, ("UNKNOWN_ALIAS",)
    ) == BOUNDARY


def test_compute_projection_is_complete_typed_and_default_deny() -> None:
    payload = _json(COMPUTE)
    assert payload["schema_version"] == "GCP_COMPUTE_FIELD_PROJECTION_V1"
    assert payload["provider_revision"] == "20260709"
    source = next(
        item for item in _json(SOURCES)["sources"]
        if item["source_id"] == payload["source_id"]
    )
    assert payload["source_sha256"] == source["sha256"]
    assert payload["default_disposition"] == "NOT_ADMITTED_BY_THIS_VERSION"
    fields = payload["fields"]
    assert payload["field_count"] == len(fields) == 257
    assert len({field["path"] for field in fields}) == len(fields)
    counts = Counter(field["disposition"] for field in fields)
    assert counts == {
        "ADMITTED_PROVIDER_VOCABULARY": 149,
        "RECOGNIZED_BUT_RUNTIME_PROHIBITED": 9,
        "NOT_ADMITTED_BY_THIS_VERSION": 85,
        "PROHIBITED_SECRET_OR_KEY_MATERIAL": 14,
    }
    by_path = {field["path"]: field for field in fields}

    assert by_path["id"]["json_type"] == "string"
    assert by_path["id"]["format"] == "uint64"
    assert by_path["disks[].diskSizeGb"]["format"] == "int64"
    assert "TDX" in by_path[
        "confidentialInstanceConfig.confidentialInstanceType"
    ]["enum"]
    assert by_path["networkInterfaces[].stackType"]["enum"] == [
        "IPV4_IPV6",
        "IPV4_ONLY",
        "IPV6_ONLY",
    ]
    assert "PRESERVED" in by_path["disks[].savedState"]["enum"]
    assert "STOP" in by_path["keyRevocationActionType"]["enum"]
    assert "EPHEMERAL_KEY_ENCRYPTION" in by_path[
        "localSsdEncryptionMode"
    ]["enum"]

    for path in (
        "scheduling.nodeAffinities[]",
        "scheduling.localSsdRecoveryTimeout.seconds",
        "resourceStatus.scheduling.availabilityDomain",
        "networkInterfaces[].parentNicName",
        "networkInterfaces[].networkAttachment",
        "disks[].source",
    ):
        assert by_path[path]["disposition"] == "ADMITTED_PROVIDER_VOCABULARY"
    assert {
        path for path, field in by_path.items()
        if field["disposition"] == "RECOGNIZED_BUT_RUNTIME_PROHIBITED"
    } == {
        "hostname",
        "labels",
        "metadata",
        "metadata.items[]",
        "metadata.items[].key",
        "metadata.items[].value",
        "networkInterfaces[].ipv6Address",
        "networkInterfaces[].networkIP",
        "statusMessage",
    }
    assert {
        path for path, field in by_path.items()
        if field["disposition"] == "PROHIBITED_SECRET_OR_KEY_MATERIAL"
    } == {
        "disks[].diskEncryptionKey.rawKey",
        "disks[].diskEncryptionKey.rsaEncryptedKey",
        "disks[].initializeParams.sourceImageEncryptionKey.rawKey",
        "disks[].initializeParams.sourceImageEncryptionKey.rsaEncryptedKey",
        "disks[].initializeParams.sourceSnapshotEncryptionKey.rawKey",
        "disks[].initializeParams.sourceSnapshotEncryptionKey.rsaEncryptedKey",
        "disks[].shieldedInstanceInitialState.dbs[].content",
        "disks[].shieldedInstanceInitialState.dbxs[].content",
        "disks[].shieldedInstanceInitialState.keks[].content",
        "disks[].shieldedInstanceInitialState.pk.content",
        "instanceEncryptionKey.rawKey",
        "instanceEncryptionKey.rsaEncryptedKey",
        "sourceMachineImageEncryptionKey.rawKey",
        "sourceMachineImageEncryptionKey.rsaEncryptedKey",
    }


def test_contract_keeps_provider_namespaces_and_metadata_fail_closed() -> None:
    text = CONTRACT.read_text(encoding="utf-8")
    ids = set(re.findall(r"`(GCP_[A-Z0-9_]+_2026_07_24)`", text))
    assert ids == EXPECTED_SOURCE_IDS
    assert "2026_07_23" not in text
    assert 'raw JWT payload hwmodel                    = GCP_INTEL_TDX' in text
    assert 'CEL attestation-policy assertion.hwmodel  = INTEL_TDX' in text
    assert 'Compute confidentialInstanceType          = TDX' in text
    assert "header.x5c : string, optional, PKI tokens only" in text
    assert "payload.submods.container.image_signatures[].key_id" in text
    assert 'assertion.hwmodel == "INTEL_TDX"' in text
    assert "assertion.tdx[]" not in text
    assert "assertion.submods.container.args" not in text
    assert 'assertion.hwmodel == "GCP_INTEL_TDX"' not in text
    assert "tee-env suffix grammar = UNAVAILABLE_FROM_PROVIDER" in text
    assert "[A-Z_][A-Z0-9_]{0,63}" not in text
    assert "`ita-api-key` is credential-bearing and prohibited" in text


def test_authorization_and_next_step_remain_narrow() -> None:
    text = CONTRACT.read_text(encoding="utf-8")
    assert "Decision precedence is total" in text
    assert "required_for_ready=true" in text
    assert "Every future external or privileged action requires fresh approval" in text
    assert "qualification or model execution" in text
    assert "held VBD merge or Task 2.22" in text
    assert (
        "The only authorized next step is the docs-only runtime object and hash contract"
        in text
    )
