#!/usr/bin/env python3
"""Verify the external GCP provider bundle and derive its vocabulary decision."""

from __future__ import annotations

import argparse
import hashlib
from html import unescape
from html.parser import HTMLParser
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_DIR = (
    ROOT / "docs" / "contracts" / "canonical-inference-gcp-provider-vocabulary"
)
DEFAULT_EVIDENCE = CONTRACT_DIR / "source-evidence.json"
DEFAULT_CLAIMS = CONTRACT_DIR / "claim-evidence.json"
DEFAULT_COMPUTE = CONTRACT_DIR / "compute-field-projection.json"
DEFAULT_CONTRACT = CONTRACT_DIR / "README.md"

READY = "GCP_PROVIDER_VOCABULARY_READY_FOR_RUNTIME_OBJECT_HARDENING"
HOLD = "HOLD_FOR_PROVIDER_CLAIM_REVALIDATION"
CONFLICT = "REJECT_FOR_PROVIDER_CLAIM_CONFLICT"
BOUNDARY = "REJECT_FOR_BOUNDARY_LEAKAGE"
EXPECTED_CONTRACT_SHA256 = (
    "a85e18b93f51303d26c46e0839705437a794c23957cde9f07b81afdf9d77bcda"
)
EXPECTED_SOURCE_EVIDENCE_SHA256 = (
    "939ebe94f73754caa0e05ed5f740e5d0fcc5e3f136b265ea5fbc5579cfd09743"
)
EXPECTED_COMPUTE_PROJECTION_SHA256 = (
    "f161f131530ec5e978ff4a86cd965b92088617efd21f2810b0ab4e1e41f5815c"
)
EXPECTED_CLAIM_EVIDENCE_SHA256 = (
    "b6e5b878de67efbabbda699332e608af7c112d20c62910ea6ebd033bdb75e422"
)
EXPECTED_CLAIM_REGISTRY_SHA256 = (
    "4d9a53791b6f3dc8fec4b0dfe7d7d0ad6ef7fdd502f15193fe35989291fc062c"
)
EXPECTED_REQUIRED_SECTIONS = {"2", "6", "7", "8", "9", "10"}
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


class BundleVerificationError(RuntimeError):
    pass


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _claim_registry_sha256(claims: list[dict]) -> str:
    material = json.dumps(claims, sort_keys=True, separators=(",", ":")).encode()
    return _sha256(material)


class _VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, object]]) -> None:
        if tag in {"script", "style"}:
            self.skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)


def _normalized_source_text(data: bytes) -> str:
    text = data.decode("utf-8", errors="strict")
    if text.lstrip().startswith("{"):
        return re.sub(r"\s+", " ", text)
    parser = _VisibleTextParser()
    parser.feed(text)
    return re.sub(r"\s+", " ", unescape(" ".join(parser.parts))).strip()


def _observation_commitment(
    source_id: str,
    source_sha256: str,
    needles: list[str],
    contexts: list[str],
) -> str:
    material = json.dumps(
        {
            "source_id": source_id,
            "source_sha256": source_sha256,
            "evidence_needles": needles,
            "evidence_contexts": contexts,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return _sha256(material)


def _project_claim_state(claim: dict, algorithm: dict) -> str:
    if claim.get("source_requirement") != "ALL" or not claim.get("source_ids"):
        raise BundleVerificationError(f"invalid claim source requirement: {claim.get('claim_id')}")
    source_ids = claim["source_ids"]
    observations = claim.get("source_observations", [])
    if len(source_ids) != len(set(source_ids)) or len(observations) != len(source_ids):
        raise BundleVerificationError(f"invalid claim observation cardinality: {claim['claim_id']}")
    if {item.get("source_id") for item in observations} != set(source_ids):
        raise BundleVerificationError(f"claim observation/source mismatch: {claim['claim_id']}")
    try:
        observed_states = {
            algorithm["observation_to_state"][item["observation"]]
            for item in observations
        }
        return next(
            state
            for state in algorithm["required_claim_state_precedence"]
            if state in observed_states
        )
    except (KeyError, StopIteration) as exc:
        raise BundleVerificationError(
            f"unknown claim observation or precedence: {claim['claim_id']}"
        ) from exc


def derive_decision(
    claims_payload: dict,
    source_ids: set[str],
    boundary_violations: tuple[str, ...] = (),
) -> str:
    if boundary_violations:
        return BOUNDARY
    algorithm = claims_payload.get("decision_algorithm")
    if algorithm != EXPECTED_DECISION_ALGORITHM:
        return HOLD
    claims = claims_payload.get("claims", [])
    if (
        claims_payload.get("claim_count") != len(claims)
        or len(claims) != 20
        or claims_payload.get("source_observation_count")
        != sum(len(claim.get("source_observations", [])) for claim in claims)
        or claims_payload.get("source_observation_count") != 22
        or claims_payload.get("claim_registry_sha256")
        != _claim_registry_sha256(claims)
        or claims_payload.get("claim_registry_sha256")
        != EXPECTED_CLAIM_REGISTRY_SHA256
        or set(claims_payload.get("required_sections", []))
        != EXPECTED_REQUIRED_SECTIONS
    ):
        return HOLD
    try:
        projected = {
            claim["claim_id"]: _project_claim_state(claim, algorithm)
            for claim in claims
        }
    except BundleVerificationError:
        return HOLD
    for claim in claims:
        actual = projected[claim["claim_id"]]
        recorded = claim.get("snapshot_state")
        if actual != recorded:
            if "CONFLICTING_PROVIDER_EVIDENCE" in {actual, recorded}:
                return CONFLICT
            return HOLD
    if any(
        projected[claim["claim_id"]] == "CONFLICTING_PROVIDER_EVIDENCE"
        for claim in claims
    ):
        return CONFLICT
    required = [claim for claim in claims if claim.get("required_for_ready") is True]
    if any(
        projected[claim["claim_id"]] != "CONFIRMED_AT_RETRIEVAL"
        for claim in required
    ):
        return HOLD
    if any(not claim.get("locators") for claim in claims):
        return HOLD
    if {source_id for claim in claims for source_id in claim["source_ids"]} != source_ids:
        return HOLD
    covered = {
        section
        for claim in required
        if projected[claim["claim_id"]] == "CONFIRMED_AT_RETRIEVAL"
        for section in claim["covers_sections"]
    }
    if not EXPECTED_REQUIRED_SECTIONS.issubset(covered):
        return HOLD
    return READY


def _derive_compute_fields(discovery: dict) -> list[dict]:
    schemas = discovery["schemas"]
    records: dict[str, dict] = {}

    def walk(node: dict, prefix: str = "", depth: int = 0) -> None:
        if depth > 7:
            raise BundleVerificationError("Compute discovery nesting exceeds bound")
        if "$ref" in node:
            node = schemas[node["$ref"]]
        for name, value in sorted(node.get("properties", {}).items()):
            path = f"{prefix}.{name}" if prefix else name
            is_array = value.get("type") == "array"
            if is_array:
                path += "[]"
            item = value.get("items", {})
            record = {
                "path": path,
                "json_type": value.get(
                    "type", "object" if "$ref" in value else "unknown"
                ),
            }
            for key in ("format", "enum", "pattern", "readOnly"):
                if key in value:
                    record[key] = value[key]
            if "$ref" in value:
                record["object_ref"] = value["$ref"]
            if "$ref" in item:
                record["item_ref"] = item["$ref"]
            for key in ("type", "format", "enum"):
                if key in item:
                    record[f"item_{key}"] = item[key]
            records[path] = record
            child = None
            if "$ref" in value:
                child = schemas[value["$ref"]]
            elif is_array and ("$ref" in item or item.get("properties")):
                child = schemas[item["$ref"]] if "$ref" in item else item
            elif value.get("properties"):
                child = value
            if child:
                walk(child, path, depth + 1)

    walk(schemas["Instance"])
    return [records[path] for path in sorted(records)]


def load_claim_evidence(
    claims_path: Path,
    *,
    enforce_compiled_commitments: bool = True,
) -> dict:
    claims_bytes = claims_path.read_bytes()
    if (
        enforce_compiled_commitments
        and _sha256(claims_bytes) != EXPECTED_CLAIM_EVIDENCE_SHA256
    ):
        raise BundleVerificationError("claim evidence exact-byte commitment mismatch")
    claims = json.loads(claims_bytes)
    if enforce_compiled_commitments and (
        claims.get("schema_version") != "GCP_PROVIDER_CLAIM_EVIDENCE_V1"
        or set(claims)
        != {
            "artifact_bindings",
            "claim_count",
            "claim_registry_sha256",
            "claims",
            "decision_algorithm",
            "recorded_decision",
            "required_sections",
            "schema_version",
            "source_observation_count",
        }
        or set(claims.get("artifact_bindings", {}))
        != {"source_evidence_sha256", "compute_field_projection_sha256"}
    ):
        raise BundleVerificationError("claim evidence envelope is not exact")
    return claims


def _verify_compute_projection(
    projection_path: Path,
    claims: dict,
    evidence: dict,
    source_bytes_by_id: dict[str, bytes],
) -> None:
    if _sha256(projection_path.read_bytes()) != EXPECTED_COMPUTE_PROJECTION_SHA256:
        raise BundleVerificationError("Compute projection exact-byte commitment mismatch")
    projection = json.loads(projection_path.read_text(encoding="utf-8"))
    if claims["artifact_bindings"]["compute_field_projection_sha256"] != _sha256(
        projection_path.read_bytes()
    ):
        raise BundleVerificationError("claim/Compute projection binding mismatch")
    source_id = projection["source_id"]
    source = next(item for item in evidence["sources"] if item["source_id"] == source_id)
    if projection["source_sha256"] != source["sha256"]:
        raise BundleVerificationError("Compute projection/source binding mismatch")
    discovery = json.loads(source_bytes_by_id[source_id].decode("utf-8"))
    if projection["provider_revision"] != discovery["revision"]:
        raise BundleVerificationError("Compute discovery revision mismatch")
    derived = _derive_compute_fields(discovery)
    projected_fields = projection["fields"]
    if projection["field_count"] != len(projected_fields) or len(derived) != 257:
        raise BundleVerificationError("Compute field count mismatch")
    stripped = [
        {key: value for key, value in field.items() if key != "disposition"}
        for field in projected_fields
    ]
    if stripped != derived:
        raise BundleVerificationError("Compute field schema projection mismatch")
    allowed_dispositions = {
        "ADMITTED_PROVIDER_VOCABULARY",
        "RECOGNIZED_BUT_RUNTIME_PROHIBITED",
        "PROHIBITED_SECRET_OR_KEY_MATERIAL",
        "NOT_ADMITTED_BY_THIS_VERSION",
    }
    if any(field.get("disposition") not in allowed_dispositions for field in projected_fields):
        raise BundleVerificationError("unknown Compute field disposition")


def verify_bundle(
    bundle_path: Path,
    evidence_path: Path = DEFAULT_EVIDENCE,
    claims_path: Path = DEFAULT_CLAIMS,
    compute_path: Path = DEFAULT_COMPUTE,
    contract_path: Path = DEFAULT_CONTRACT,
    *,
    enforce_compiled_commitments: bool = True,
) -> None:
    if (
        enforce_compiled_commitments
        and _sha256(contract_path.read_bytes()) != EXPECTED_CONTRACT_SHA256
    ):
        raise BundleVerificationError("provider contract exact-byte commitment mismatch")
    evidence_bytes = evidence_path.read_bytes()
    if (
        enforce_compiled_commitments
        and _sha256(evidence_bytes) != EXPECTED_SOURCE_EVIDENCE_SHA256
    ):
        raise BundleVerificationError("source evidence exact-byte commitment mismatch")
    evidence = json.loads(evidence_bytes)
    expected = evidence["external_snapshot_bundle"]
    bundle_bytes = bundle_path.read_bytes()
    if len(bundle_bytes) != expected["bytes"]:
        raise BundleVerificationError("bundle byte length mismatch")
    if _sha256(bundle_bytes) != expected["sha256"]:
        raise BundleVerificationError("bundle SHA-256 mismatch")
    if expected["archive_format"] != "ZIP_DEFLATE_FIXED_METADATA_V1":
        raise BundleVerificationError("unsupported archive format")

    expected_members = expected["members"]
    source_bytes_by_id: dict[str, bytes] = {}
    with ZipFile(bundle_path) as archive:
        infos = archive.infolist()
        if [info.filename for info in infos] != expected["member_order"]:
            raise BundleVerificationError("bundle member order mismatch")
        if len(infos) != len(expected_members):
            raise BundleVerificationError("bundle member count mismatch")
        for info, member in zip(infos, expected_members):
            if info.filename != member["archive_name"]:
                raise BundleVerificationError("bundle member name mismatch")
            if info.date_time != (1980, 1, 1, 0, 0, 0):
                raise BundleVerificationError(
                    f"bundle member timestamp mismatch: {info.filename}"
                )
            if info.compress_type != ZIP_DEFLATED:
                raise BundleVerificationError(
                    f"bundle member compression mismatch: {info.filename}"
                )
            if (info.external_attr >> 16) != 0o100644:
                raise BundleVerificationError(
                    f"bundle member mode mismatch: {info.filename}"
                )
            data = archive.read(info.filename)
            if len(data) != member["bytes"] or _sha256(data) != member["sha256"]:
                raise BundleVerificationError(
                    f"bundle member content mismatch: {info.filename}"
                )
            if member["source_id"] is not None:
                source_bytes_by_id[member["source_id"]] = data

        expected_tsv = "".join(
            f"{source['source_id']}\t{source['official_url']}\n"
            for source in evidence["sources"]
        )
        if archive.read("sources.tsv").decode("utf-8") != expected_tsv:
            raise BundleVerificationError("bundled sources.tsv disagrees with evidence")
        bundled_items = [
            json.loads(line)
            for line in archive.read("items.ndjson").decode("utf-8").splitlines()
        ]
        if bundled_items != evidence["sources"]:
            raise BundleVerificationError("bundled items.ndjson disagrees with evidence")

    source_by_id = {source["source_id"]: source for source in evidence["sources"]}
    member_by_id = {
        member["source_id"]: member
        for member in expected_members
        if member["source_id"] is not None
    }
    if set(source_by_id) != set(member_by_id) or set(source_by_id) != set(
        source_bytes_by_id
    ):
        raise BundleVerificationError("bundle source/member identity mismatch")
    for source_id, source in source_by_id.items():
        member = member_by_id[source_id]
        if (member["bytes"], member["sha256"]) != (
            source["retrieved_bytes"],
            source["sha256"],
        ):
            raise BundleVerificationError(
                f"bundle source evidence mismatch: {source_id}"
            )

    claims = load_claim_evidence(
        claims_path,
        enforce_compiled_commitments=enforce_compiled_commitments,
    )
    if claims["artifact_bindings"]["source_evidence_sha256"] != _sha256(
        evidence_bytes
    ):
        raise BundleVerificationError("claim/source evidence binding mismatch")
    if enforce_compiled_commitments and (
        claims.get("claim_registry_sha256")
        != _claim_registry_sha256(claims.get("claims", []))
        or claims.get("claim_registry_sha256")
        != EXPECTED_CLAIM_REGISTRY_SHA256
    ):
        raise BundleVerificationError("claim registry commitment mismatch")

    normalized_by_id = {
        source_id: _normalized_source_text(data)
        for source_id, data in source_bytes_by_id.items()
    }
    for claim in claims["claims"]:
        for observation in claim["source_observations"]:
            source_id = observation["source_id"]
            needles = observation["evidence_needles"]
            contexts = observation["evidence_contexts"]
            expected_commitment = _observation_commitment(
                source_id,
                source_by_id[source_id]["sha256"],
                needles,
                contexts,
            )
            if observation["evidence_commitment_sha256"] != expected_commitment:
                raise BundleVerificationError(
                    f"claim observation commitment mismatch: {claim['claim_id']}"
                )
            source_text = normalized_by_id[source_id]
            missing_contexts = [context for context in contexts if context not in source_text]
            if missing_contexts:
                raise BundleVerificationError(
                    f"claim evidence context missing: {claim['claim_id']}"
                )
            unbound_needles = [
                needle
                for needle in needles
                if not any(needle in context for context in contexts)
            ]
            if unbound_needles:
                raise BundleVerificationError(
                    f"claim needle lacks bound context: {claim['claim_id']} "
                    f"{unbound_needles!r}"
                )

    if enforce_compiled_commitments:
        _verify_compute_projection(
            compute_path, claims, evidence, source_bytes_by_id
        )
        claim_source_ids = {
            source_id
            for claim in claims["claims"]
            for source_id in claim["source_ids"]
        }
        unknown_sources = tuple(sorted(claim_source_ids - set(source_by_id)))
        decision = derive_decision(claims, set(source_by_id), unknown_sources)
        if decision != READY or claims.get("recorded_decision") != decision:
            raise BundleVerificationError(
                f"provider vocabulary decision is not READY: {decision}"
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--evidence", type=Path, default=DEFAULT_EVIDENCE)
    parser.add_argument("--claims", type=Path, default=DEFAULT_CLAIMS)
    parser.add_argument("--compute", type=Path, default=DEFAULT_COMPUTE)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT)
    args = parser.parse_args()
    try:
        verify_bundle(
            args.bundle.resolve(),
            args.evidence.resolve(),
            args.claims.resolve(),
            args.compute.resolve(),
            args.contract.resolve(),
        )
    except (
        OSError,
        KeyError,
        TypeError,
        ValueError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        BundleVerificationError,
    ) as exc:
        raise SystemExit(f"GCP provider source bundle verification failed: {exc}") from exc
    print("GCP provider source bundle verification passed; decision=READY")


if __name__ == "__main__":
    main()
