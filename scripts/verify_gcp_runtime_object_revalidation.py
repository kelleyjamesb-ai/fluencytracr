#!/usr/bin/env python3
"""Replay Section 7.2 provider revalidation from its external source bundle."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import unicodedata
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_DIR = ROOT / "docs/contracts/canonical-inference-gcp-runtime-object"
PROVIDER_DIR = ROOT / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
DEFAULT_REVALIDATION = RUNTIME_DIR / "provider-revalidation.json"
EXPECTED_REVALIDATION_ARTIFACT_SHA256 = (
    "63acb3c62c38aa96f1f6452bfd2449242071fd4bc46f65cfb35ec217b72916cc"
)
EXPECTED_REVALIDATION_HASH = (
    "38aa8151ed391369c3703279bb1172d0e1fef389f6ea4d70e9242d401d578535"
)
EXPECTED_BUNDLE_SHA256 = (
    "99f2387fa1bed1b491dfd34a5b5c365f37822af4a26cb96a3d29fc649b0372b9"
)
EXPECTED_CLAIM_REGISTRY_SHA256 = (
    "4d9a53791b6f3dc8fec4b0dfe7d7d0ad6ef7fdd502f15193fe35989291fc062c"
)
EXPECTED_PROVIDER_ARTIFACTS = {
    "provider_contract_sha256": (
        PROVIDER_DIR / "README.md",
        "a85e18b93f51303d26c46e0839705437a794c23957cde9f07b81afdf9d77bcda",
    ),
    "source_evidence_sha256": (
        PROVIDER_DIR / "source-evidence.json",
        "939ebe94f73754caa0e05ed5f740e5d0fcc5e3f136b265ea5fbc5579cfd09743",
    ),
    "claim_evidence_sha256": (
        PROVIDER_DIR / "claim-evidence.json",
        "b6e5b878de67efbabbda699332e608af7c112d20c62910ea6ebd033bdb75e422",
    ),
    "compute_field_projection_sha256": (
        PROVIDER_DIR / "compute-field-projection.json",
        "f161f131530ec5e978ff4a86cd965b92088617efd21f2810b0ab4e1e41f5815c",
    ),
}


class RevalidationVerificationError(RuntimeError):
    """Raised when retained Section 7.2 evidence cannot replay exactly."""


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical(value: object) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _validate_canonical_value(value: object) -> None:
    if value is None or isinstance(value, float):
        raise RevalidationVerificationError("null and floats are prohibited")
    if isinstance(value, bool):
        return
    if isinstance(value, int):
        if not -(2**63) <= value <= 2**63 - 1:
            raise RevalidationVerificationError("integer outside signed 64-bit range")
        return
    if isinstance(value, str):
        if value != unicodedata.normalize("NFC", value):
            raise RevalidationVerificationError("string is not NFC")
        if any(unicodedata.category(character).startswith("C") for character in value):
            raise RevalidationVerificationError("string contains prohibited control")
        return
    if isinstance(value, list):
        for item in value:
            _validate_canonical_value(item)
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str) or not key.isascii():
                raise RevalidationVerificationError("schema key is not ASCII")
            _validate_canonical_value(key)
            _validate_canonical_value(item)
        return
    raise RevalidationVerificationError("unsupported canonical JSON type")


def _strict_json_loads(text: str) -> object:
    def pairs(items: list[tuple[str, object]]) -> dict[str, object]:
        result: dict[str, object] = {}
        for key, value in items:
            if key in result:
                raise RevalidationVerificationError(f"duplicate JSON key: {key}")
            result[key] = value
        return result

    def parse_int(token: str) -> int:
        if token == "-0":
            raise RevalidationVerificationError("negative-zero integer")
        value = int(token)
        if not -(2**63) <= value <= 2**63 - 1:
            raise RevalidationVerificationError("integer outside signed 64-bit range")
        return value

    def reject_numeric(token: str) -> float:
        raise RevalidationVerificationError(f"float/non-finite JSON number: {token}")

    value = json.loads(
        text,
        object_pairs_hook=pairs,
        parse_int=parse_int,
        parse_float=reject_numeric,
        parse_constant=reject_numeric,
    )
    _validate_canonical_value(value)
    return value


def _load_provider_verifier() -> Any:
    path = ROOT / "scripts/verify_gcp_provider_source_bundle.py"
    spec = importlib.util.spec_from_file_location("gcp_provider_verifier", path)
    if spec is None or spec.loader is None:
        raise RevalidationVerificationError("cannot load provider verifier")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_revalidation_bundle(
    bundle_path: Path,
    revalidation_path: Path = DEFAULT_REVALIDATION,
) -> None:
    """Verify source bytes, all claim observations, and the Compute projection."""
    revalidation_bytes = revalidation_path.read_bytes()
    if _sha256(revalidation_bytes) != EXPECTED_REVALIDATION_ARTIFACT_SHA256:
        raise RevalidationVerificationError(
            "revalidation artifact exact-byte commitment mismatch"
        )
    payload = _strict_json_loads(revalidation_bytes.decode("utf-8"))
    if not isinstance(payload, dict):
        raise RevalidationVerificationError("revalidation artifact is not an object")
    if payload.get("schema_version") != "GCP_PROVIDER_REVALIDATION_V1":
        raise RevalidationVerificationError("revalidation schema mismatch")
    if payload.get("authorization_effect") != "NONE_DOCS_ONLY":
        raise RevalidationVerificationError("revalidation cannot authorize")
    if payload.get("revalidation_hash") != EXPECTED_REVALIDATION_HASH:
        raise RevalidationVerificationError("compiled revalidation hash mismatch")
    vocabulary_bindings = payload.get("vocabulary_bindings", {})
    if vocabulary_bindings.get("claim_registry_sha256") != EXPECTED_CLAIM_REGISTRY_SHA256:
        raise RevalidationVerificationError("claim registry binding mismatch")
    for binding_key, (artifact_path, expected_sha256) in EXPECTED_PROVIDER_ARTIFACTS.items():
        if vocabulary_bindings.get(binding_key) != expected_sha256:
            raise RevalidationVerificationError(
                f"provider binding mismatch: {binding_key}"
            )
        if _sha256(artifact_path.read_bytes()) != expected_sha256:
            raise RevalidationVerificationError(
                f"local provider artifact mismatch: {artifact_path.name}"
            )
    expected = payload["external_revalidation_bundle"]
    if expected.get("sha256") != EXPECTED_BUNDLE_SHA256:
        raise RevalidationVerificationError("compiled bundle hash mismatch")
    bundle_bytes = bundle_path.read_bytes()
    if len(bundle_bytes) != expected["bytes"]:
        raise RevalidationVerificationError("bundle byte length mismatch")
    if _sha256(bundle_bytes) != expected["sha256"]:
        raise RevalidationVerificationError("bundle SHA-256 mismatch")
    if expected["archive_format"] != "ZIP_DEFLATE_FIXED_METADATA_V1":
        raise RevalidationVerificationError("unsupported archive format")

    expected_members = expected["members"]
    source_bytes: dict[str, bytes] = {}
    with ZipFile(bundle_path) as archive:
        infos = archive.infolist()
        if [info.filename for info in infos] != expected["member_order"]:
            raise RevalidationVerificationError("bundle member order mismatch")
        if len(infos) != len(expected_members):
            raise RevalidationVerificationError("bundle member count mismatch")
        for info, member in zip(infos, expected_members):
            if info.filename != member["archive_name"]:
                raise RevalidationVerificationError("bundle member name mismatch")
            if info.date_time != (1980, 1, 1, 0, 0, 0):
                raise RevalidationVerificationError("bundle timestamp mismatch")
            if info.compress_type != ZIP_DEFLATED:
                raise RevalidationVerificationError("bundle compression mismatch")
            if (info.external_attr >> 16) != 0o100644:
                raise RevalidationVerificationError("bundle mode mismatch")
            data = archive.read(info.filename)
            if len(data) != member["bytes"] or _sha256(data) != member["sha256"]:
                raise RevalidationVerificationError(
                    f"bundle member content mismatch: {info.filename}"
                )
            if member.get("source_id") is not None:
                source_bytes[member["source_id"]] = data

        sources = payload["sources"]
        expected_tsv = "".join(
            f"{source['source_id']}\t{source['official_url']}\n"
            for source in sources
        )
        if archive.read("sources.tsv").decode("utf-8") != expected_tsv:
            raise RevalidationVerificationError("sources.tsv mismatch")
        expected_items = [
            _strict_json_loads(line)
            for line in archive.read("items.ndjson")
            .decode("utf-8")
            .splitlines()
        ]
        if expected_items != sources:
            raise RevalidationVerificationError("items.ndjson mismatch")

    source_by_id = {source["source_id"]: source for source in payload["sources"]}
    if set(source_by_id) != set(source_bytes) or len(source_by_id) != 16:
        raise RevalidationVerificationError("source identity set mismatch")
    for source_id, source in source_by_id.items():
        data = source_bytes[source_id]
        if source["http_status"] != 200:
            raise RevalidationVerificationError(f"non-200 source: {source_id}")
        if len(data) != source["retrieved_bytes"] or _sha256(data) != source["sha256"]:
            raise RevalidationVerificationError(f"source commitment mismatch: {source_id}")

    provider_verifier = _load_provider_verifier()
    normalized = {
        source_id: provider_verifier._normalized_source_text(data)
        for source_id, data in source_bytes.items()
    }
    frozen_claim_payload = json.loads(
        (PROVIDER_DIR / "claim-evidence.json").read_text(encoding="utf-8")
    )
    frozen_claims = {
        claim["claim_id"]: claim for claim in frozen_claim_payload["claims"]
    }
    if payload.get("claim_count") != len(frozen_claims) or set(
        claim["claim_id"] for claim in payload.get("claims", [])
    ) != set(frozen_claims):
        raise RevalidationVerificationError("claim identity set mismatch")
    claim_count = 0
    observation_count = 0
    needle_count = 0
    for claim in payload["claims"]:
        claim_count += 1
        frozen_claim = frozen_claims[claim["claim_id"]]
        if (
            claim.get("frozen_mapping") != frozen_claim["frozen_mapping"]
            or claim.get("source_ids") != frozen_claim["source_ids"]
            or claim.get("required_for_ready") is not frozen_claim["required_for_ready"]
        ):
            raise RevalidationVerificationError(
                f"claim differs from Section 7.1: {claim['claim_id']}"
            )
        if claim["revalidation_result"] != "EXACT_MAPPING_RECONFIRMED":
            raise RevalidationVerificationError(
                f"claim is not reconfirmed: {claim['claim_id']}"
            )
        if len(claim["source_observations"]) != len(frozen_claim["source_observations"]):
            raise RevalidationVerificationError(
                f"claim observation count mismatch: {claim['claim_id']}"
            )
        for observation in claim["source_observations"]:
            observation_count += 1
            needle_count += len(observation["evidence_needles"])
            source_id = observation["source_id"]
            text = normalized[source_id]
            if observation.get("current_source_sha256") != source_by_id[source_id]["sha256"]:
                raise RevalidationVerificationError(
                    f"observation/source hash mismatch: {claim['claim_id']}"
                )
            if not observation["evidence_needles"] or not observation["evidence_contexts"]:
                raise RevalidationVerificationError(
                    f"empty claim evidence: {claim['claim_id']}"
                )
            if any(needle not in text for needle in observation["evidence_needles"]):
                raise RevalidationVerificationError(
                    f"missing current claim evidence: {claim['claim_id']}"
                )
            if any(context not in text for context in observation["evidence_contexts"]):
                raise RevalidationVerificationError(
                    f"recorded context not in source: {claim['claim_id']}"
                )
            body = {
                "claim_id": claim["claim_id"],
                "source_id": source_id,
                "current_source_sha256": observation["current_source_sha256"],
                "frozen_mapping": claim["frozen_mapping"],
                "evidence_needles": observation["evidence_needles"],
                "evidence_contexts": observation["evidence_contexts"],
                "observation": observation["observation"],
            }
            if observation["evidence_commitment_sha256"] != _sha256(
                _canonical(body)
            ):
                raise RevalidationVerificationError(
                    f"claim commitment mismatch: {claim['claim_id']}"
                )
    if claim_count != payload["claim_count"] or claim_count != 20:
        raise RevalidationVerificationError("claim count mismatch")
    if observation_count != payload["source_observation_count"] or observation_count != 22:
        raise RevalidationVerificationError("observation count mismatch")
    if needle_count != 113:
        raise RevalidationVerificationError("evidence needle count mismatch")

    compute = payload["compute_projection_revalidation"]
    discovery = json.loads(source_bytes[compute["source_id"]].decode("utf-8"))
    derived = provider_verifier._derive_compute_fields(discovery)
    if discovery["revision"] != compute["provider_revision"]:
        raise RevalidationVerificationError("Compute revision mismatch")
    if derived != compute["current_derived_projection"]:
        raise RevalidationVerificationError("current Compute projection mismatch")
    if _sha256(_canonical(derived)) != compute["current_derived_projection_sha256"]:
        raise RevalidationVerificationError("current projection hash mismatch")
    frozen = json.loads(
        (PROVIDER_DIR / "compute-field-projection.json").read_text(encoding="utf-8")
    )
    stripped = [
        {key: value for key, value in field.items() if key != "disposition"}
        for field in frozen["fields"]
    ]
    if derived != stripped or len(derived) != 257:
        raise RevalidationVerificationError("frozen/current Compute mapping changed")

    hash_body = dict(payload)
    recorded_hash = hash_body.pop("revalidation_hash")
    actual_hash = _sha256(
        b"FLUENCYTRACR:GCP_PROVIDER_REVALIDATION:V1\x00"
        + _canonical(hash_body)
    )
    if actual_hash != recorded_hash:
        raise RevalidationVerificationError("revalidation hash mismatch")
    if payload["recorded_result"] != "EXACT_MAPPING_RECONFIRMED":
        raise RevalidationVerificationError("revalidation result is not exact")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--revalidation", type=Path, default=DEFAULT_REVALIDATION)
    args = parser.parse_args()
    verify_revalidation_bundle(args.bundle, args.revalidation)
    payload = json.loads(args.revalidation.read_text(encoding="utf-8"))
    print(
        json.dumps(
            {
                "decision": payload["recorded_result"],
                "revalidation_hash": payload["revalidation_hash"],
                "bundle_sha256": payload["external_revalidation_bundle"]["sha256"],
                "claim_count": payload["claim_count"],
                "compute_field_count": payload["compute_projection_revalidation"]["field_count"],
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
