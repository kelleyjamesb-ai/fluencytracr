#!/usr/bin/env python3
"""Replay the Section 7.3 public-source bundle without network or GCP access."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import unicodedata
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = (
    ROOT
    / "docs"
    / "contracts"
    / "canonical-inference-gcp-security-authority"
    / "provider-source-evidence.json"
)
DOMAIN = b"FLUENCYTRACR:GCP_SECURITY_AUTHORITY_PROVIDER_REVALIDATION:V1\x00"
EXPECTED_PROVIDER_SOURCE_EVIDENCE_SHA256 = (
    "83074b19ee9b2fe74409387a989a1b88c2ff5231182f8617ae0800dd19b48577"
)
EXPECTED_SOURCE_REGISTRY_SHA256 = (
    "e12d0dcb6d7ff6b1a48519e21cc7c84364cde3e9611d24b9900b2581d6670062"
)
EXPECTED_CLAIM_REGISTRY_SHA256 = (
    "d824bdd1753145992f8be94639303fc11c87ed584ddfa317cb15ce8d0cc9420c"
)
EXPECTED_PROVIDER_REVALIDATION_HASH = (
    "9d2f21c49c5bfa6d498387a7d7a30a13c6c09d3b6bc7ae4a496f8e4e58f88ef6"
)
EXPECTED_SOURCE_BUNDLE_SHA256 = (
    "6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3"
)
EXPECTED_SOURCE_COUNT = 23
EXPECTED_CLAIM_COUNT = 42


def canonical(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json_bytes(data: bytes) -> Any:
    def reject_constant(value: str) -> None:
        raise ValueError(f"non-finite JSON constant: {value}")

    def reject_float(value: str) -> None:
        raise ValueError(f"floating JSON number: {value}")

    def parse_integer(value: str) -> int:
        if value == "-0":
            raise ValueError("negative zero")
        parsed = int(value)
        if not -(2**63) <= parsed <= 2**63 - 1:
            raise ValueError("integer outside signed 64-bit domain")
        return parsed

    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                raise ValueError(f"duplicate JSON key: {key}")
            result[key] = value
        return result

    result = json.loads(
        data.decode("utf-8"),
        object_pairs_hook=pairs,
        parse_constant=reject_constant,
        parse_float=reject_float,
        parse_int=parse_integer,
    )

    def validate(value: Any) -> None:
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
                raise ValueError("control or surrogate string")
            return
        if isinstance(value, list):
            for item in value:
                validate(item)
            return
        if isinstance(value, dict):
            for key, item in value.items():
                validate(key)
                validate(item)
            return
        raise ValueError("unsupported JSON value")

    validate(result)
    if not isinstance(result, dict):
        raise ValueError("JSON root must be object")
    return result


def validate_zip_member(name: str) -> None:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or "\\" in name:
        raise ValueError(f"unsafe bundle path: {name}")
    if not name or name.endswith("/"):
        raise ValueError(f"unexpected directory/empty member: {name}")


def replay(bundle: Path) -> dict[str, Any]:
    evidence_bytes = EVIDENCE.read_bytes()
    if digest(evidence_bytes) != EXPECTED_PROVIDER_SOURCE_EVIDENCE_SHA256:
        raise ValueError("provider source evidence compile pin mismatch")
    evidence = load_json_bytes(evidence_bytes)
    if set(evidence) != {
        "schema_version",
        "contract_scope",
        "retrieved_at",
        "revalidated_at",
        "section_7_1_bindings",
        "section_7_1_claim_ids",
        "source_bundle",
        "sources",
        "source_registry_hash_basis",
        "source_registry_sha256",
        "claims",
        "claim_registry_sha256",
        "provider_revalidation",
        "decision",
        "authorization_effect",
    }:
        raise ValueError("provider source evidence root keys mismatch")
    bundle_contract = evidence["source_bundle"]
    if bundle_contract["sha256"] != EXPECTED_SOURCE_BUNDLE_SHA256:
        raise ValueError("provider source bundle compile pin mismatch")
    if (
        len(evidence["sources"]) != EXPECTED_SOURCE_COUNT
        or len(evidence["claims"]) != EXPECTED_CLAIM_COUNT
    ):
        raise ValueError("provider registry compile-pinned count mismatch")
    if set(bundle_contract) != {
        "external_locator",
        "sha256",
        "byte_count",
        "repo_committed",
        "contains_public_example_identifiers",
        "runtime_admission",
    }:
        raise ValueError("source bundle contract keys mismatch")
    expected_source_keys = {
        "source_id",
        "requested_url",
        "resolved_url",
        "snapshot_sha256",
        "snapshot_byte_count",
        "bundle_path",
        "classification",
    }
    if any(set(source) != expected_source_keys for source in evidence["sources"]):
        raise ValueError("source registry record keys mismatch")
    expected_claim_keys = {
        "claim_id",
        "statement",
        "source_id",
        "needles",
        "max_span_chars",
        "observed_span_chars",
    }
    if any(set(claim) != expected_claim_keys for claim in evidence["claims"]):
        raise ValueError("claim registry record keys mismatch")
    bundle_bytes = bundle.read_bytes()
    if len(bundle_bytes) != bundle_contract["byte_count"]:
        raise ValueError("source bundle byte count mismatch")
    if digest(bundle_bytes) != bundle_contract["sha256"]:
        raise ValueError("source bundle SHA-256 mismatch")

    with zipfile.ZipFile(bundle) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("duplicate source bundle member")
        for name in names:
            validate_zip_member(name)
        expected = {"manifest.json"} | {
            source["bundle_path"] for source in evidence["sources"]
        }
        if set(names) != expected:
            raise ValueError("source bundle member set mismatch")
        manifest = load_json_bytes(archive.read("manifest.json"))
        if set(manifest) != {"schema_version", "sources"}:
            raise ValueError("source bundle manifest keys mismatch")
        expected_manifest_source_keys = {
            "source_id",
            "requested_url",
            "resolved_url",
            "snapshot_path",
            "snapshot_sha256",
            "snapshot_byte_count",
        }
        if any(
            set(item) != expected_manifest_source_keys
            for item in manifest["sources"]
        ):
            raise ValueError("source bundle manifest record keys mismatch")
        manifest_sources = {
            item["source_id"]: item for item in manifest["sources"]
        }
        if set(manifest_sources) != {
            source["source_id"] for source in evidence["sources"]
        }:
            raise ValueError("source manifest identity set mismatch")

        texts: dict[str, str] = {}
        for source in evidence["sources"]:
            manifest_source = manifest_sources[source["source_id"]]
            for key in (
                "requested_url",
                "resolved_url",
                "snapshot_path",
                "snapshot_sha256",
                "snapshot_byte_count",
            ):
                expected_value = source[
                    {"snapshot_path": "bundle_path"}.get(key, key)
                ]
                if manifest_source[key] != expected_value:
                    raise ValueError(
                        f"source manifest mismatch: {source['source_id']}:{key}"
                    )
            snapshot = archive.read(source["bundle_path"])
            if len(snapshot) != source["snapshot_byte_count"]:
                raise ValueError(f"snapshot size mismatch: {source['source_id']}")
            if digest(snapshot) != source["snapshot_sha256"]:
                raise ValueError(f"snapshot hash mismatch: {source['source_id']}")
            texts[source["source_id"]] = snapshot.decode("utf-8")

    if evidence["source_registry_hash_basis"] != (
        "EXACT_SANITIZED_SNAPSHOT_RECORDS_IN_RECOVERY_BUNDLE"
    ):
        raise ValueError("source registry hash basis mismatch")
    if evidence["source_registry_sha256"] != EXPECTED_SOURCE_REGISTRY_SHA256:
        raise ValueError("source registry compile pin mismatch")
    if digest(canonical(evidence["sources"])) != evidence[
        "source_registry_sha256"
    ]:
        raise ValueError("source registry hash mismatch")
    if evidence["claim_registry_sha256"] != EXPECTED_CLAIM_REGISTRY_SHA256:
        raise ValueError("claim registry compile pin mismatch")
    if digest(canonical(evidence["claims"])) != evidence["claim_registry_sha256"]:
        raise ValueError("claim registry hash mismatch")

    for claim in evidence["claims"]:
        text = texts[claim["source_id"]]
        cursor = 0
        positions: list[int] = []
        for needle in claim["needles"]:
            position = text.find(needle, cursor)
            if position < 0:
                raise ValueError(
                    f"claim source needle missing: {claim['claim_id']}:{needle}"
                )
            positions.append(position)
            cursor = position + len(needle)
        observed_span = cursor - positions[0]
        if observed_span != claim["observed_span_chars"]:
            raise ValueError(f"claim observed span mismatch: {claim['claim_id']}")
        if observed_span > claim["max_span_chars"]:
            raise ValueError(f"claim span exceeds bound: {claim['claim_id']}")

    section71 = ROOT / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
    actual_section71 = {
        "provider_readme_sha256": digest((section71 / "README.md").read_bytes()),
        "provider_source_evidence_sha256": digest(
            (section71 / "source-evidence.json").read_bytes()
        ),
        "provider_claim_evidence_sha256": digest(
            (section71 / "claim-evidence.json").read_bytes()
        ),
        "provider_compute_projection_sha256": digest(
            (section71 / "compute-field-projection.json").read_bytes()
        ),
    }
    if evidence["section_7_1_bindings"] != actual_section71:
        raise ValueError("Section 7.1 artifact binding mismatch")
    section71_claims = load_json_bytes(
        (section71 / "claim-evidence.json").read_bytes()
    )["claims"]
    section71_claim_ids = {item["claim_id"] for item in section71_claims}
    if not set(evidence["section_7_1_claim_ids"]).issubset(section71_claim_ids):
        raise ValueError("Section 7.1 inherited claim identity mismatch")

    expected_body = {
        "schema_version": "GCP_SECURITY_AUTHORITY_PROVIDER_REVALIDATION_V1",
        "source_bundle_sha256": bundle_contract["sha256"],
        "section_7_1_bindings": evidence["section_7_1_bindings"],
        "section_7_1_claim_ids": evidence["section_7_1_claim_ids"],
        "source_registry_sha256": evidence["source_registry_sha256"],
        "claim_registry_sha256": evidence["claim_registry_sha256"],
        "source_count": len(evidence["sources"]),
        "claim_count": len(evidence["claims"]),
        "decision": "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED",
        "authority_effect": "NONE_PUBLIC_SOURCE_REVALIDATION_ONLY",
    }
    expected_hash = digest(DOMAIN + canonical(expected_body))
    recorded = evidence["provider_revalidation"]
    if set(recorded) != set(expected_body) | {"provider_revalidation_hash"}:
        raise ValueError("provider revalidation record keys mismatch")
    if expected_hash != EXPECTED_PROVIDER_REVALIDATION_HASH:
        raise ValueError("provider revalidation compile pin mismatch")
    if recorded["provider_revalidation_hash"] != expected_hash:
        raise ValueError("provider revalidation hash mismatch")
    for key, value in expected_body.items():
        if recorded[key] != value:
            raise ValueError(f"provider revalidation field mismatch: {key}")
    if evidence["decision"] != "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED":
        raise ValueError("provider evidence decision mismatch")
    if evidence["authorization_effect"] != "NONE_DOCS_ONLY":
        raise ValueError("provider evidence attempted authorization")

    return {
        "bundle_sha256": bundle_contract["sha256"],
        "source_count": len(evidence["sources"]),
        "claim_count": len(evidence["claims"]),
        "provider_revalidation_hash": expected_hash,
        "decision": "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    args = parser.parse_args()
    try:
        result = replay(args.bundle)
    except Exception:  # fail closed without reflecting untrusted source text
        print(
            json.dumps(
                {
                    "decision": "HOLD_FOR_PROVIDER_SOURCE_UNAVAILABLE_OR_DRIFT",
                    "error_code": "SECURITY_AUTHORITY_SOURCE_REPLAY_FAILED",
                }
            )
        )
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
