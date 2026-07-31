from __future__ import annotations

import base64
import copy
import hashlib
import ipaddress
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlparse

import pytest

from scripts.verify_gcp_runtime_object_revalidation import (
    EXPECTED_PROVIDER_ARTIFACTS,
    RevalidationVerificationError,
    _strict_json_loads as _strict_revalidation_json_loads,
    verify_runtime_profile_approval_interface,
    verify_revalidation_bundle,
)

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_DIR = ROOT / "docs/contracts/canonical-inference-gcp-runtime-object"
PROVIDER_DIR = ROOT / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
README = CONTRACT_DIR / "README.md"
REVALIDATION = CONTRACT_DIR / "provider-revalidation.json"
CONTROL = CONTRACT_DIR / "control-plane-projection.json"
CONTRACT = CONTRACT_DIR / "runtime-object-contract.json"
VECTORS = CONTRACT_DIR / "canonicalization-vectors.json"
CANDIDATE = ROOT / "docs/contracts/canonical-inference-gcp-runtime-candidate/README.md"
REVALIDATION_VERIFIER = ROOT / "scripts/verify_gcp_runtime_object_revalidation.py"
RECOVERY_BUNDLE = (
    Path.home()
    / ".glean/recovery/fluencytracr/"
    / "gcp-runtime-object-revalidation-source-snapshot-20260724T151043Z.zip"
)

EXPECTED_ARTIFACT_SHA256 = {
    "docs/contracts/canonical-inference-gcp-runtime-object/README.md": "6efc2eef1e91efc5fdca7ccf79d49d66caa858c7c4921d63bab518bde87b5ef2",
    "docs/contracts/canonical-inference-gcp-runtime-object/provider-revalidation.json": "63acb3c62c38aa96f1f6452bfd2449242071fd4bc46f65cfb35ec217b72916cc",
    "docs/contracts/canonical-inference-gcp-runtime-object/control-plane-projection.json": "010551be219b38cc8aed25102824406bfb6a8bc3806d04b93e831f1933ae8455",
    "docs/contracts/canonical-inference-gcp-runtime-object/runtime-object-contract.json": "9bd511fd7c859413fd599fa6bfc10e35534a532e7557df3f1a036017673c2474",
    "docs/contracts/canonical-inference-gcp-runtime-object/canonicalization-vectors.json": "24081453e851f2859bb9ec7bd57302855b3085a8978caf088bc4096b561f996b",
    "scripts/verify_gcp_runtime_object_revalidation.py": "a6fbbbe6ea83928832d45c9e67cc21cf03bd79a8666914022306b99b2bbc0d89",
}
EXPECTED_UPSTREAM_SHA256 = {
    "provider_contract_sha256": "a85e18b93f51303d26c46e0839705437a794c23957cde9f07b81afdf9d77bcda",
    "provider_source_evidence_sha256": "939ebe94f73754caa0e05ed5f740e5d0fcc5e3f136b265ea5fbc5579cfd09743",
    "provider_claim_evidence_sha256": "b6e5b878de67efbabbda699332e608af7c112d20c62910ea6ebd033bdb75e422",
    "provider_compute_projection_sha256": "f161f131530ec5e978ff4a86cd965b92088617efd21f2810b0ab4e1e41f5815c",
    "provider_claim_registry_sha256": "4d9a53791b6f3dc8fec4b0dfe7d7d0ad6ef7fdd502f15193fe35989291fc062c",
}
VISIBILITY = {
    "VISIBLE",
    "HIDDEN_BY_TDX",
    "NOT_EXPOSED_BY_GCP_ATTESTATION",
    "NOT_EXPOSED_BY_GCP_CONTROL_PLANE",
}
SUFFICIENCY = {
    "SUFFICIENT_FOR_FIELD_BINDING",
    "INSUFFICIENT_FOR_FIELD_BINDING",
    "REQUIRES_PARENT_GOVERNANCE_DECISION",
}
PRESENCE = {
    "PRESENT",
    "EXPLICITLY_ABSENT",
    "PROVIDER_HIDDEN",
    "NOT_OBSERVED_CONTRACT_ONLY",
}
HEX64 = re.compile(r"[0-9a-f]{64}")


def _json(path: Path) -> dict[str, Any]:
    value = _strict_json_loads(
        path.read_text(encoding="utf-8"),
        validate_canonical_values=CONTRACT_DIR in path.parents,
    )
    if not isinstance(value, dict):
        raise ValueError(f"normative JSON artifact is not an object: {path}")
    return value


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    return _sha256_bytes(path.read_bytes())


def _validate_canonical_value(value: object) -> None:
    if value is None or isinstance(value, float):
        raise ValueError("null and floats are prohibited")
    if isinstance(value, bool):
        return
    if isinstance(value, int):
        if not -(2**63) <= value <= 2**63 - 1:
            raise ValueError("integer outside signed 64-bit range")
        return
    if isinstance(value, str):
        if value != unicodedata.normalize("NFC", value):
            raise ValueError("string is not NFC")
        if any(unicodedata.category(character).startswith("C") for character in value):
            raise ValueError("control, format, private, or surrogate character")
        return
    if isinstance(value, list):
        for item in value:
            _validate_canonical_value(item)
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str) or not key.isascii():
                raise ValueError("schema keys must be ASCII strings")
            _validate_canonical_value(key)
            _validate_canonical_value(item)
        return
    raise ValueError(f"unsupported canonical type: {type(value)!r}")


def _canonical(value: object) -> bytes:
    _validate_canonical_value(value)
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _strict_json_loads(
    text: str, *, validate_canonical_values: bool = True
) -> Any:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                raise ValueError(f"duplicate key: {key}")
            result[key] = value
        return result

    def parse_int(token: str) -> int:
        if token == "-0":
            raise ValueError("negative zero is prohibited")
        value = int(token)
        if not -(2**63) <= value <= 2**63 - 1:
            raise ValueError("integer outside signed 64-bit range")
        return value

    def reject_numeric(token: str) -> float:
        raise ValueError(f"float/non-finite value is prohibited: {token}")

    value = json.loads(
        text,
        object_pairs_hook=pairs,
        parse_int=parse_int,
        parse_float=reject_numeric,
        parse_constant=reject_numeric,
    )
    if validate_canonical_values:
        _validate_canonical_value(value)
    return value


def _without_hash(stored: dict[str, Any], hash_field: str) -> dict[str, Any]:
    body = copy.deepcopy(stored)
    if hash_field not in body:
        raise ValueError("missing self hash")
    body.pop(hash_field)
    return body


def _seal(stored: dict[str, Any], node: dict[str, Any]) -> None:
    body = _without_hash(stored, node["self_hash_field"])
    stored[node["self_hash_field"]] = _sha256_bytes(
        node["domain_separator"].encode("ascii") + b"\x00" + _canonical(body)
    )


def _verify_self_hash(stored: dict[str, Any], node: dict[str, Any]) -> None:
    recorded = stored.get(node["self_hash_field"])
    if not isinstance(recorded, str) or not HEX64.fullmatch(recorded):
        raise ValueError("invalid self hash grammar")
    body = _without_hash(stored, node["self_hash_field"])
    actual = _sha256_bytes(
        node["domain_separator"].encode("ascii") + b"\x00" + _canonical(body)
    )
    if actual != recorded:
        raise ValueError("stale self hash")


def _looks_like_legacy_ipv4(hostname: str) -> bool:
    component = r"(?:0[xX][0-9A-Fa-f]+|0[0-7]*|[0-9]+)"
    return re.fullmatch(rf"{component}(?:\.{component}){{0,3}}", hostname) is not None


def _is_ip_shape(value: str) -> bool:
    if _looks_like_legacy_ipv4(value):
        return True
    try:
        ipaddress.ip_address(value)
    except ValueError:
        return False
    return True


def _validate_dns_hostname(hostname: str) -> None:
    if _is_ip_shape(hostname):
        raise ValueError("IP-literal authority is prohibited")
    if len(hostname) > 253:
        raise ValueError("DNS hostname exceeds 253 characters")
    labels = hostname.split(".")
    if any(
        not 1 <= len(label) <= 63
        or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", label)
        for label in labels
    ):
        raise ValueError("DNS hostname label is invalid")


def _validate_https_uri_surface(value: str) -> None:
    if not isinstance(value, str) or not value.startswith("https://"):
        raise ValueError("exact lowercase HTTPS URI required")
    try:
        value.encode("ascii")
    except UnicodeEncodeError as exc:
        raise ValueError("URI must be ASCII") from exc
    if any(token in value for token in ("%", "\\", ";", "?", "#")):
        raise ValueError("URI encoding/params/query/fragment prohibited")
    remainder = value[len("https://") :]
    if "/" not in remainder:
        raise ValueError("URI path required")
    authority, path = remainder.split("/", 1)
    if not authority or authority.lower() != authority:
        raise ValueError("URI authority is not canonical")
    _validate_dns_hostname(authority)
    segments = path.split("/")
    if len(value.encode("utf-8")) > 512 or len(segments) > 32:
        raise ValueError("URI exceeds total length or path-depth bound")
    if any(
        len(segment.encode("utf-8")) > 128
        or
        not segment
        or segment in {".", ".."}
        or not re.fullmatch(r"[A-Za-z0-9._~-]+", segment)
        for segment in segments
    ):
        raise ValueError("URI path segment is not canonical")


def _validate_gcp_resource_uri(value: str, resource_kind: str | None = None) -> None:
    _validate_https_uri_surface(value)
    prefix = "https://www.googleapis.com/compute/v1/projects/"
    if not value.startswith(prefix):
        raise ValueError("GCP resource URI authority or prefix mismatch")
    remainder = value[len(prefix) :]
    components = remainder.split("/")
    if len(components) < 3 or not re.fullmatch(
        r"ft-qualification-id-[0-9a-f]{8}",
        components[0],
    ):
        raise ValueError("GCP resource URI project or resource path invalid")
    resource_path = "/".join(components[1:])
    token = r"[a-z](?:[-a-z0-9]{0,61}[a-z0-9])?"
    qualified = r"ft-qualification-id-[0-9a-f]{8}"
    patterns = {
        "ZONE": rf"zones/{token}",
        "INSTANCE": rf"zones/{token}/instances/{qualified}",
        "MACHINE_TYPE": rf"zones/{token}/machineTypes/{token}",
        "DISK": rf"(?:zones|regions)/{token}/disks/{qualified}",
        "DISK_TYPE": rf"zones/{token}/diskTypes/{token}",
        "IMAGE": rf"global/images/{qualified}",
        "SNAPSHOT": rf"global/snapshots/{qualified}",
        "LICENSE": rf"global/licenses/{qualified}",
        "NETWORK": rf"global/networks/{qualified}",
        "NETWORK_ATTACHMENT": rf"regions/{token}/networkAttachments/{qualified}",
        "SUBNETWORK": rf"regions/{token}/subnetworks/{qualified}",
        "RESOURCE_POLICY": rf"regions/{token}/resourcePolicies/{qualified}",
        "MACHINE_IMAGE": rf"global/machineImages/{qualified}",
    }
    if resource_kind is not None and (
        resource_kind not in patterns
        or re.fullmatch(patterns[resource_kind], resource_path) is None
    ):
        raise ValueError("GCP resource URI kind/path mismatch")


def _validate_oci_image_reference(value: str) -> str:
    if not isinstance(value, str) or len(value.encode("utf-8")) > 512:
        raise ValueError("OCI image reference exceeds total byte limit")
    if value.count("@") != 1:
        raise ValueError("OCI image reference must contain one digest separator")
    location, digest = value.split("@", 1)
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
        raise ValueError("OCI image reference digest is invalid")
    if any(token in location for token in ("%", "\\", ";", "?", "#")):
        raise ValueError("OCI image location contains prohibited delimiter")
    components = location.split("/")
    if len(components) < 3 or any(not component for component in components):
        raise ValueError("OCI image location requires authority and repository path")
    authority = components[0]
    if authority != "us-docker.pkg.dev":
        raise ValueError("OCI registry authority is not the approved non-person registry")
    _validate_dns_hostname(authority)
    repository = components[1:]
    if len(repository) != 3:
        raise ValueError("OCI repository must be project/repository/image")
    if not re.fullmatch(r"ft-qualification-id-[0-9a-f]{8}", repository[0]):
        raise ValueError("OCI project namespace is invalid")
    if repository[1] != "ft-runtime":
        raise ValueError("OCI repository namespace is invalid")
    if not re.fullmatch(r"image-[0-9a-f]{8}", repository[2]):
        raise ValueError("OCI image namespace is invalid")
    return digest


def _rfc3339_nanoseconds(value: str) -> int:
    match = re.fullmatch(
        r"([0-9]{4})-([0-9]{2})-([0-9]{2})T"
        r"([0-9]{2}):([0-9]{2}):([0-9]{2})"
        r"(?:\.([0-9]{1,9}))?(Z|[+-][0-9]{2}:[0-9]{2})",
        value,
    )
    if match is None:
        raise ValueError("invalid RFC3339 grammar")
    year, month, day, hour, minute, second = map(int, match.groups()[:6])
    fraction = match.group(7) or ""
    offset_text = match.group(8)
    if second > 59:
        raise ValueError("RFC3339 leap second prohibited without frozen table")
    if offset_text == "Z":
        offset = timezone.utc
    else:
        if offset_text == "-00:00":
            raise ValueError("RFC3339 unknown local offset is prohibited")
        offset_hour = int(offset_text[1:3])
        offset_minute = int(offset_text[4:6])
        if offset_hour > 23 or offset_minute > 59:
            raise ValueError("invalid RFC3339 offset")
        direction = 1 if offset_text[0] == "+" else -1
        offset = timezone(direction * timedelta(hours=offset_hour, minutes=offset_minute))
    try:
        parsed = datetime(
            year,
            month,
            day,
            hour,
            minute,
            second,
            tzinfo=offset,
        )
    except ValueError as exc:
        raise ValueError("invalid RFC3339 calendar value") from exc
    utc = parsed.astimezone(timezone.utc)
    epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
    delta = utc - epoch
    whole_seconds = delta.days * 86400 + delta.seconds
    return whole_seconds * 1_000_000_000 + int(fraction.ljust(9, "0"))


def _type_contract(value: Any, value_type: str, contract: dict[str, Any]) -> None:
    if value_type == "BOOLEAN":
        if type(value) is not bool:
            raise ValueError("expected Boolean")
    elif value_type == "INTEGER":
        if type(value) is not int:
            raise ValueError("expected integer distinct from Boolean")
        if not contract["minimum"] <= value <= contract["maximum"]:
            raise ValueError("integer out of range")
    elif value_type in {"STRING", "ENUM"}:
        if not isinstance(value, str) or not value:
            raise ValueError("expected nonempty string")
        if len(value.encode("utf-8")) > contract.get("maximum_utf8_bytes", 512):
            raise ValueError("string too long")
        if value_type == "STRING" and (
            re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+", value)
            or value.lstrip().startswith(("{", "["))
            or value != value.strip()
            or _is_ip_shape(value.strip())
        ):
            raise ValueError("generic string contains identifier/payload shape")
    elif value_type == "STRING_SET":
        if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
            raise ValueError("expected string set")
        if any(not item.isascii() for item in value):
            raise ValueError("string set element is not ASCII")
        if value != sorted(value) or len(value) != len(set(value)):
            raise ValueError("string set not sorted unique")
        if len(value) > contract["maximum_items"]:
            raise ValueError("string set too large")
    elif value_type == "ZONE":
        if not isinstance(value, str) or value not in contract["allowed_values"]:
            raise ValueError("zone outside candidate set")
    elif value_type == "GCP_OAUTH_SCOPE":
        if (
            not isinstance(value, str)
            or value not in contract["allowed_values"]
            or len(value.encode("utf-8")) > contract["maximum_total_utf8_bytes"]
        ):
            raise ValueError("OAuth scope is not in the exact allowlist")
    else:
        if not isinstance(value, str) or not re.fullmatch(contract["pattern"], value):
            raise ValueError(f"invalid {value_type}")
        if len(value.encode("utf-8")) > contract.get(
            "maximum_total_utf8_bytes", 2048
        ):
            raise ValueError(f"{value_type} exceeds total byte bound")
        if value_type == "GCP_UINT64_STRING" and int(value) > int(
            contract["maximum_decimal"]
        ):
            raise ValueError("GCP uint64 string outside domain")
        if value_type == "RFC3339":
            _rfc3339_nanoseconds(value)
        if value_type == "URI":
            _validate_https_uri_surface(value)
        if value_type == "OCI_IMAGE_REFERENCE":
            _validate_oci_image_reference(value)
        if value_type == "GCP_RESOURCE_URI":
            _validate_gcp_resource_uri(value)
        if value_type == "SAFE_TOKEN" and (
            value != value.strip() or _is_ip_shape(value.strip())
        ):
            raise ValueError("safe token contains padding or IP-shaped identifier")


def _validate_field_values(
    rows: Any,
    registry: list[dict[str, Any]],
    value_types: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    if not isinstance(rows, list):
        raise ValueError("field_values must be an array")
    expected_ids = [field["field_id"] for field in registry]
    actual_ids = [row.get("field_id") for row in rows if isinstance(row, dict)]
    if actual_ids != expected_ids or len(actual_ids) != len(set(actual_ids)):
        raise ValueError("field registry coverage/order mismatch")
    by_id: dict[str, dict[str, Any]] = {}
    for row, field in zip(rows, registry):
        if not isinstance(row, dict):
            raise ValueError("field row must be object")
        presence = row.get("presence")
        if presence not in PRESENCE or presence not in field["allowed_presence"]:
            raise ValueError("field presence is not allowed")
        if presence == "PRESENT":
            if set(row) != {"field_id", "presence", "value"}:
                raise ValueError("present field row shape mismatch")
            value = row["value"]
            _type_contract(value, field["value_type"], value_types[field["value_type"]])
            if "exact_value" in field and value != field["exact_value"]:
                raise ValueError("exact field value mismatch")
            if "allowed_values" in field and value not in field["allowed_values"]:
                raise ValueError("enum outside field domain")
            if "pattern" in field and (
                not isinstance(value, str)
                or not re.fullmatch(field["pattern"], value)
            ):
                raise ValueError("field string pattern mismatch")
            if "allowed_elements" in field and any(
                item not in field["allowed_elements"] for item in value
            ):
                raise ValueError("set element outside domain")
            if "required_elements" in field and not set(
                field["required_elements"]
            ).issubset(value):
                raise ValueError("required set element missing")
            if "minimum_items" in field and len(value) < field["minimum_items"]:
                raise ValueError("set too small")
            if "maximum_items" in field and len(value) > field["maximum_items"]:
                raise ValueError("set too large")
            if "element_pattern" in field and any(
                not re.fullmatch(field["element_pattern"], item) for item in value
            ):
                raise ValueError("set element grammar mismatch")
            if field.get("reject_ip_elements") is True and any(
                _is_ip_shape(item)
                and not (
                    item.isdigit()
                    and len(item) in field.get("ip_safe_numeric_lengths", [])
                )
                for item in value
            ):
                raise ValueError("set element contains IP-shaped identifier")
        elif set(row) != {"field_id", "presence"}:
            raise ValueError("nonpresent field must not carry value/unknown key")
        by_id[field["field_id"]] = row
    return by_id


def _present(rows: dict[str, dict[str, Any]], field_id: str) -> Any:
    row = rows[field_id]
    if row["presence"] != "PRESENT":
        raise ValueError(f"required present field is {row['presence']}: {field_id}")
    return row["value"]


def _validate_profile(
    stored: dict[str, Any], contract: dict[str, Any], nodes: dict[str, dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    schema = contract["object_schemas"]["profile"]
    if set(stored) != set(schema["required_keys"]):
        raise ValueError("profile keys are not closed")
    for key in ("schema_version", "canonicalization_version", "profile_id", "authority_effect"):
        if stored[key] != schema[key]:
            raise ValueError(f"profile constant mismatch: {key}")
    binding = stored["provider_vocabulary_binding"]
    if set(binding) != set(schema["provider_vocabulary_binding_required_keys"]):
        raise ValueError("provider binding keys mismatch")
    upstream = contract["upstream_bindings"]
    for key in schema["provider_vocabulary_binding_required_keys"]:
        if binding[key] != upstream[key]:
            raise ValueError("provider binding value mismatch")
    if stored["provider_revalidation_hash"] != upstream["provider_revalidation_hash"]:
        raise ValueError("provider revalidation mismatch")
    if stored["control_projection_contract_sha256"] != upstream[
        "control_plane_projection_sha256"
    ]:
        raise ValueError("control projection binding mismatch")
    if stored["field_registry_sha256"] != contract["field_registry_sha256"]:
        raise ValueError("field registry binding mismatch")
    rows = _validate_field_values(
        stored["field_values"],
        contract["field_registry"]["profile_fields"],
        contract["value_type_contracts"],
    )
    _verify_self_hash(stored, nodes["runtime_profile_hash"])
    if stored["runtime_profile_hash"] not in contract[
        "synthetic_test_profile_hashes"
    ]:
        raise ValueError("runtime profile hash is not an approved synthetic contract vector")
    return rows


def _validate_scalar_provider_type(value: Any, field: dict[str, Any]) -> None:
    expected = field["json_type"]
    if expected == "boolean" and type(value) is not bool:
        raise ValueError("wrong provider Boolean")
    if expected == "integer" and type(value) is not int:
        raise ValueError("wrong provider integer")
    if expected == "string" and not isinstance(value, str):
        raise ValueError("wrong provider string")
    if expected == "string" and field.get("path") != "serviceAccounts[].email" and (
        re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+", value)
        or value.lstrip().startswith(("{", "["))
    ):
        raise ValueError("provider string contains identifier/payload shape")
    if expected not in {"boolean", "integer", "string"}:
        raise ValueError("provider leaf is not scalar")
    if isinstance(value, str) and "://" in value:
        _validate_https_uri_surface(value)
    if "enum" in field and value not in field["enum"]:
        raise ValueError("provider enum outside domain")
    if "pattern" in field and (
        not isinstance(value, str) or not re.fullmatch(field["pattern"], value)
    ):
        raise ValueError("provider regex domain mismatch")
    value_format = field.get("format")
    if value_format == "int32" and not -(2**31) <= value <= 2**31 - 1:
        raise ValueError("provider int32 outside domain")
    if value_format in {"uint64", "int64"}:
        pattern = r"[0-9]+" if value_format == "uint64" else r"-?[0-9]+"
        if not isinstance(value, str) or not re.fullmatch(pattern, value):
            raise ValueError("provider numeric string coerced")
        number = int(value)
        if value_format == "uint64" and not 0 <= number <= 2**64 - 1:
            raise ValueError("provider uint64 outside domain")
        if value_format == "int64" and not -(2**63) <= number <= 2**63 - 1:
            raise ValueError("provider int64 outside domain")
    if value_format == "byte":
        if not isinstance(value, str):
            raise ValueError("provider byte is not string")
        try:
            base64.b64decode(value, validate=True)
        except Exception as exc:
            raise ValueError("provider byte is not base64") from exc


def _provider_field_value(value: Any, field: dict[str, Any], *, as_set: bool) -> None:
    if as_set:
        if not isinstance(value, list) or any(
            isinstance(item, (dict, list)) or item is None or isinstance(item, float)
            for item in value
        ):
            raise ValueError("provider set must contain scalar values")
        if any(isinstance(item, str) and not item.isascii() for item in value):
            raise ValueError("provider set string is not ASCII")
        if value != sorted(value) or len(value) != len(set(value)):
            raise ValueError("provider set must be sorted unique")
        scalar_field = field
        if field["json_type"] == "array":
            scalar_field = {
                "path": field.get("path"),
                "json_type": field.get("item_type"),
                **({"enum": field["item_enum"]} if "item_enum" in field else {}),
                **({"format": field["item_format"]} if "item_format" in field else {}),
                **({"pattern": field["item_pattern"]} if "item_pattern" in field else {}),
                **({"pattern": field["pattern"]} if "pattern" in field else {}),
            }
        for item in value:
            _validate_scalar_provider_type(item, scalar_field)
    else:
        if isinstance(value, (dict, list)) or value is None or isinstance(value, float):
            raise ValueError("provider scalar value required")
        _validate_scalar_provider_type(value, field)


def _profile_manifest_material(
    binding: dict[str, Any],
    scalar_rows: list[dict[str, Any]],
    resource_sets: list[dict[str, Any]],
) -> dict[str, Any]:
    paths = set(binding["paths"])
    filtered_scalar = [row for row in scalar_rows if row["path"] in paths]
    filtered_resources = []
    for resource_set in resource_sets:
        records = []
        for record in resource_set["records"]:
            fields = [field for field in record["fields"] if field["path"] in paths]
            if fields:
                records.append({"fields": fields})
        records.sort(key=_canonical)
        if records or any(path.startswith(resource_set["resource_root"]) for path in paths):
            filtered_resources.append(
                {"resource_root": resource_set["resource_root"], "records": records}
            )
    return {
        "manifest_id": binding["manifest_id"],
        "scalar_rows": filtered_scalar,
        "resource_sets": filtered_resources,
    }


def _source_evidence_envelope_hash(
    stored: dict[str, Any], contract: dict[str, Any]
) -> str:
    envelope_contract = contract["source_evidence_envelope"]
    material = {
        "schema_version": envelope_contract["schema_version"],
        "observation_point": stored["observation_point"],
        "projected_fields": stored["projected_fields"],
        "projected_resource_sets": stored["projected_resource_sets"],
        "derived_posture": stored["derived_posture"],
    }
    return _sha256_bytes(
        envelope_contract["domain_separator"].encode("ascii")
        + b"\x00"
        + _canonical(material)
    )


def _refresh_source_evidence_envelope(
    stored: dict[str, Any], contract: dict[str, Any]
) -> None:
    stored["source_evidence_envelope_sha256"] = _source_evidence_envelope_hash(
        stored, contract
    )


def _validate_control(
    stored: dict[str, Any],
    contract: dict[str, Any],
    control_contract: dict[str, Any],
    nodes: dict[str, dict[str, Any]],
    profile_hash: str,
) -> dict[str, Any]:
    schema = contract["object_schemas"]["control_observation"]
    if set(stored) != set(schema["required_keys"]):
        raise ValueError("control object keys are not closed")
    if stored["schema_version"] != schema["schema_version"]:
        raise ValueError("control schema mismatch")
    if stored["runtime_profile_hash"] != profile_hash:
        raise ValueError("control/profile hash mismatch")
    if not HEX64.fullmatch(stored["source_evidence_envelope_sha256"]):
        raise ValueError("sanitized source evidence envelope hash is malformed")
    _type_contract(
        stored["observation_point"],
        "RFC3339",
        contract["value_type_contracts"]["RFC3339"],
    )
    posture = stored["derived_posture"]
    if set(posture) != set(schema["derived_posture_required_keys"]):
        raise ValueError("derived posture keys mismatch")
    if any(type(value) is not bool for value in posture.values()):
        raise ValueError("derived posture must be Boolean")
    for key, expected in schema["derived_posture_exact_values"].items():
        if posture[key] is not expected:
            raise ValueError("derived posture exact value mismatch")

    scalar_rows = stored["projected_fields"]
    expected_scalar_paths = control_contract["scalar_hash_preimage_paths"]
    if not isinstance(scalar_rows, list) or [row.get("path") for row in scalar_rows] != expected_scalar_paths:
        raise ValueError("control scalar leaf coverage/order mismatch")
    if len(scalar_rows) != len({row["path"] for row in scalar_rows}):
        raise ValueError("duplicate control scalar path")
    field_by_path = {field["path"]: field for field in control_contract["fields"]}
    scalar_values: dict[str, Any] = {}
    required_present = set(control_contract["required_present_scalar_paths"])
    for row in scalar_rows:
        if not isinstance(row, dict):
            raise ValueError("control row must be object")
        presence = row.get("presence")
        if presence not in schema["projected_field_presence"]:
            raise ValueError("invalid control presence")
        if row["path"] in required_present and presence != "PRESENT":
            raise ValueError("required control scalar path is absent")
        if presence == "EXPLICITLY_ABSENT":
            if set(row) != {"path", "presence"}:
                raise ValueError("absent control row carries value")
            continue
        if set(row) != {"path", "presence", "value"}:
            raise ValueError("present control row shape mismatch")
        field = field_by_path[row["path"]]
        as_set = field["json_type"] == "array" or row["path"].endswith("[]")
        _provider_field_value(row["value"], field, as_set=as_set)
        if "runtime_value_type" in field:
            runtime_values = row["value"] if as_set else [row["value"]]
            for runtime_value in runtime_values:
                _type_contract(
                    runtime_value,
                    field["runtime_value_type"],
                    contract["value_type_contracts"][field["runtime_value_type"]],
                )
                if field["runtime_value_type"] == "GCP_RESOURCE_URI":
                    _validate_gcp_resource_uri(
                        runtime_value, field["runtime_uri_kind"]
                    )
        scalar_values[row["path"]] = row["value"]

    scalar_row_by_path = {row["path"]: row for row in scalar_rows}
    reservation_type = scalar_row_by_path[
        "reservationAffinity.consumeReservationType"
    ]
    if (
        reservation_type["presence"] == "PRESENT"
        and reservation_type["value"] == "SPECIFIC_RESERVATION"
    ):
        raise ValueError("specific reservation identity is not admitted")

    resource_sets = stored["projected_resource_sets"]
    specs = control_contract["resource_root_specs"]
    if not isinstance(resource_sets, list) or [item.get("resource_root") for item in resource_sets] != [
        spec["resource_root"] for spec in specs
    ]:
        raise ValueError("resource root coverage/order mismatch")
    resource_values: dict[str, list[dict[str, Any]]] = {}
    for resource_set, spec in zip(resource_sets, specs):
        if set(resource_set) != {"resource_root", "records"}:
            raise ValueError("resource set keys mismatch")
        records = resource_set["records"]
        cardinality = spec["cardinality"]
        if cardinality == "EXACTLY_ZERO" and records != []:
            raise ValueError("resource set must be empty")
        if cardinality == "EXACTLY_ONE" and len(records) != 1:
            raise ValueError("resource set must contain exactly one record")
        if [record.get("resource_id") for record in records] != sorted(
            record.get("resource_id") for record in records
        ) or len(records) != len({record["resource_id"] for record in records}):
            raise ValueError("resource identities not sorted unique")
        parsed_records = []
        for record in records:
            if set(record) != set(schema["resource_record_required_keys"]):
                raise ValueError("resource record keys mismatch")
            if not isinstance(record["resource_id"], str) or not record["resource_id"]:
                raise ValueError("resource identity missing")
            fields = record["fields"]
            if [field.get("path") for field in fields] != spec["field_paths"]:
                raise ValueError("resource field coverage/order mismatch")
            values: dict[str, Any] = {}
            for row in fields:
                presence = row.get("presence")
                if presence not in schema["projected_field_presence"]:
                    raise ValueError("invalid resource presence")
                if presence == "EXPLICITLY_ABSENT":
                    if set(row) != {"path", "presence"}:
                        raise ValueError("absent resource field carries value")
                    continue
                if set(row) != {"path", "presence", "value"}:
                    raise ValueError("present resource field shape mismatch")
                field = field_by_path[row["path"]]
                nested_set = row["path"].count("[]") > 1 or field["json_type"] == "array"
                _provider_field_value(row["value"], field, as_set=nested_set)
                if "runtime_value_type" in field:
                    runtime_values = row["value"] if nested_set else [row["value"]]
                    for runtime_value in runtime_values:
                        _type_contract(
                            runtime_value,
                            field["runtime_value_type"],
                            contract["value_type_contracts"][field["runtime_value_type"]],
                        )
                        if field["runtime_value_type"] == "GCP_RESOURCE_URI":
                            _validate_gcp_resource_uri(
                                runtime_value, field["runtime_uri_kind"]
                            )
                values[row["path"]] = row["value"]
            identity_parts = []
            for identity_path in spec["identity_paths"]:
                if identity_path not in values:
                    raise ValueError("resource identity field absent")
                identity_parts.append(
                    f"{identity_path.rsplit('.', 1)[-1].replace('[]', '')}={values[identity_path]}"
                )
            if record["resource_id"] != "|".join(identity_parts):
                raise ValueError("resource_id does not match identity fields")
            parsed_records.append(values)
        resource_values[spec["resource_root"]] = parsed_records

    if stored["source_evidence_envelope_sha256"] != _source_evidence_envelope_hash(
        stored, contract
    ):
        raise ValueError("sanitized source evidence envelope hash mismatch")

    profile_manifest_hashes = stored["profile_manifest_hashes"]
    manifest_bindings = control_contract["control_profile_crosswalk"]["manifest_bindings"]
    if set(profile_manifest_hashes) != {binding["manifest_id"] for binding in manifest_bindings}:
        raise ValueError("profile manifest key set mismatch")
    for binding in manifest_bindings:
        material = _profile_manifest_material(binding, scalar_rows, resource_sets)
        actual = _sha256_bytes(
            binding["domain_separator"].encode("ascii")
            + b"\x00"
            + _canonical(material)
        )
        if profile_manifest_hashes[binding["manifest_id"]] != actual:
            raise ValueError("profile manifest hash mismatch")

    _verify_self_hash(stored, nodes["control_plane_observation_hash"])
    return {
        "scalar": scalar_values,
        "resources": resource_values,
        "profile_manifest_hashes": profile_manifest_hashes,
        "derived_posture": posture,
        "source_evidence_envelope_sha256": stored[
            "source_evidence_envelope_sha256"
        ],
    }

def _validate_instance(
    stored: dict[str, Any],
    contract: dict[str, Any],
    nodes: dict[str, dict[str, Any]],
    profile_hash: str,
    control_hash: str,
) -> dict[str, dict[str, Any]]:
    schema = contract["object_schemas"]["instance_observation"]
    if set(stored) != set(schema["required_keys"]):
        raise ValueError("instance keys are not closed")
    if stored["schema_version"] != schema["schema_version"]:
        raise ValueError("instance schema mismatch")
    if stored["authority_effect"] != schema["authority_effect"]:
        raise ValueError("instance self-authorization")
    if stored["runtime_profile_hash"] != profile_hash:
        raise ValueError("instance/profile hash mismatch")
    if stored["control_plane_observation_hash"] != control_hash:
        raise ValueError("instance/control hash mismatch")
    rows = _validate_field_values(
        stored["field_values"],
        contract["field_registry"]["instance_fields"],
        contract["value_type_contracts"],
    )
    _verify_self_hash(stored, nodes["runtime_instance_observation_hash"])
    return rows


def _expected_compute_uris(
    project_id: str, zone: str, instance_name: str, machine_type: str
) -> dict[str, str]:
    zone_uri = (
        f"https://www.googleapis.com/compute/v1/projects/{project_id}/zones/{zone}"
    )
    return {
        "zone": zone_uri,
        "selfLink": f"{zone_uri}/instances/{instance_name}",
        "machineType": f"{zone_uri}/machineTypes/{machine_type}",
    }

def _validate_cross(
    profile: dict[str, dict[str, Any]],
    control: dict[str, Any],
    instance: dict[str, dict[str, Any]],
    observation_point: str,
    control_contract: dict[str, Any],
) -> None:
    scalar = control["scalar"]
    equalities = (
        ("instance_id", scalar["id"]),
        ("instance_name", scalar["name"]),
        ("compute_self_link", scalar["selfLink"]),
        ("creation_timestamp", scalar["creationTimestamp"]),
        ("last_start_timestamp", scalar["lastStartTimestamp"]),
        ("compute_machine_type_uri", scalar["machineType"]),
        ("compute_cpu_platform_raw", scalar["cpuPlatform"]),
        ("compute_status", scalar["status"]),
        ("compute_confidential_instance_type", scalar["confidentialInstanceConfig.confidentialInstanceType"]),
    )
    for instance_id, expected in equalities:
        observed = _present(instance, instance_id)
        if type(observed) is not type(expected) or observed != expected:
            raise ValueError(f"cross-object mismatch: {instance_id}")
    if _present(instance, "token_hwmodel") != "GCP_INTEL_TDX":
        raise ValueError("raw token alias mismatch")
    if _present(instance, "cel_hwmodel") != "INTEL_TDX":
        raise ValueError("CEL alias mismatch")
    if _present(instance, "container_restart_policy") != _present(
        profile, "container_restart_policy"
    ):
        raise ValueError("restart policy mismatch")
    image_digest = _present(instance, "container_image_digest")
    if image_digest.removeprefix("sha256:") != _present(
        profile, "service_image_digest"
    ):
        raise ValueError("image digest mismatch")
    if _present(instance, "container_image_reference").rsplit("@", 1)[-1] != image_digest:
        raise ValueError("image reference is not digest-qualified to the observed digest")

    expected_uris = _expected_compute_uris(
        _present(instance, "project_id"),
        _present(instance, "zone"),
        _present(instance, "instance_name"),
        _present(profile, "provisional_machine_type"),
    )
    for path, expected_uri in expected_uris.items():
        if scalar[path] != expected_uri:
            raise ValueError(f"Compute URI bytes mismatch: {path}")

    crosswalk = control_contract["control_profile_crosswalk"]
    for binding in crosswalk["direct_bindings"]:
        value = scalar[binding["path"]]
        if binding["transform"] == "FINAL_URI_SEGMENT":
            value = value.rsplit("/", 1)[-1]
        expected = _present(profile, binding["profile_field_id"])
        if type(value) is not type(expected) or value != expected:
            raise ValueError("profile/control direct binding mismatch")
    for binding in crosswalk["resource_cardinality_bindings"]:
        observed_count = len(control["resources"][binding["resource_root"]])
        expected_count = _present(profile, binding["profile_field_id"])
        if type(observed_count) is not type(expected_count) or observed_count != expected_count:
            raise ValueError("profile/resource cardinality mismatch")
    for binding in crosswalk["manifest_bindings"]:
        observed_manifest = control["profile_manifest_hashes"][binding["manifest_id"]]
        expected_manifest = _present(profile, binding["profile_field_id"])
        if type(observed_manifest) is not type(expected_manifest) or observed_manifest != expected_manifest:
            raise ValueError("profile/control manifest mismatch")
    for binding in crosswalk["derived_posture_bindings"]:
        observed_posture = control["derived_posture"][binding["posture_key"]]
        expected_posture = _present(profile, binding["profile_field_id"])
        if type(observed_posture) is not type(expected_posture) or observed_posture != expected_posture:
            raise ValueError("profile/derived posture mismatch")

    creation_ns = _rfc3339_nanoseconds(scalar["creationTimestamp"])
    start_ns = _rfc3339_nanoseconds(scalar["lastStartTimestamp"])
    observation_ns = _rfc3339_nanoseconds(observation_point)
    if not creation_ns <= start_ns <= observation_ns:
        raise ValueError("instance lifecycle timestamps are not chronological")
    if scalar["status"] == "RUNNING":
        for path in ("lastStopTimestamp", "lastSuspendedTimestamp"):
            if path in scalar:
                event_ns = _rfc3339_nanoseconds(scalar[path])
                if not creation_ns <= event_ns < start_ns:
                    raise ValueError(
                        "RUNNING instance stop/suspend is outside creation-to-start interval"
                    )

def _vectors() -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    payload = _json(VECTORS)
    return payload, {vector["node_id"]: vector for vector in payload["vectors"]}


def _derive_decision(
    *,
    boundary: bool = False,
    provider_result: str = "EXACT_MAPPING_RECONFIRMED",
    unbindable: bool = False,
    treatment_predeclared: bool = True,
) -> str:
    if boundary or provider_result == "BOUNDARY_LEAKAGE_DETECTED":
        return "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
    if provider_result == "CURRENT_SOURCE_CONFLICT":
        return "REJECT_C3_TDX_FOR_PROVIDER_CONFLICT"
    if unbindable:
        return "REJECT_C3_TDX_AND_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION"
    if provider_result != "EXACT_MAPPING_RECONFIRMED":
        return "HOLD_FOR_PROVIDER_CLAIM_REVALIDATION"
    if not treatment_predeclared:
        return "HOLD_FOR_PARENT_RUNTIME_IDENTITY_TREATMENT"
    return "GCP_RUNTIME_OBJECT_HASH_CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD"


def _derive_runtime_escalation(value: Any, contract: dict[str, Any]) -> str:
    schema = contract["runtime_escalation_input_schema"]
    algorithm = contract["runtime_escalation_algorithm"]
    if not isinstance(value, dict):
        return algorithm["precedence"][0]
    if set(value) != set(schema["required_keys"]) or value.get("schema_version") != schema["schema_version"]:
        return algorithm["precedence"][0]
    if type(value["boundary_leakage"]) is not bool:
        return algorithm["precedence"][0]
    results = value["field_binding_results"]
    expected_ids = schema["required_identity_field_ids"]
    if (
        not isinstance(results, list)
        or not all(isinstance(item, dict) for item in results)
        or [item.get("field_id") for item in results] != expected_ids
        or any(set(item) != {"field_id", "status"} for item in results)
        or any(item["status"] not in schema["field_binding_status"] for item in results)
        or value["provider_revalidation_result"]
        not in schema["provider_revalidation_result"]
        or value["parent_treatment_decision"] not in schema["parent_treatment_decision"]
        or value["qualification_exactness"] not in schema["qualification_exactness"]
    ):
        return algorithm["precedence"][0]
    provider = value["provider_revalidation_result"]
    if value["boundary_leakage"] or provider == "BOUNDARY_LEAKAGE_DETECTED":
        return algorithm["precedence"][0]
    if provider == "CURRENT_SOURCE_CONFLICT":
        return algorithm["precedence"][1]
    if (
        value["parent_treatment_decision"] == "REJECTED"
        or any(item["status"] == "UNBINDABLE" for item in results)
        or value["qualification_exactness"] == "MISMATCH"
    ):
        return algorithm["precedence"][2]
    if provider != "EXACT_MAPPING_RECONFIRMED":
        return algorithm["precedence"][3]
    return algorithm["precedence"][4]


def test_normative_artifact_bytes_are_exactly_pinned() -> None:
    assert EXPECTED_ARTIFACT_SHA256, "populate final exact-byte pins"
    for relative, expected in EXPECTED_ARTIFACT_SHA256.items():
        assert _sha256_file(ROOT / relative) == expected


def test_exact_upstream_vocabulary_and_fresh_revalidation_are_bound() -> None:
    contract = _json(CONTRACT)
    upstream = contract["upstream_bindings"]
    for key, expected in EXPECTED_UPSTREAM_SHA256.items():
        assert upstream[key] == expected
    assert upstream["provider_revalidation_artifact_sha256"] == _sha256_file(REVALIDATION)
    assert upstream["control_plane_projection_sha256"] == _sha256_file(CONTROL)
    revalidation = _json(REVALIDATION)
    assert upstream["provider_revalidation_hash"] == revalidation["revalidation_hash"]
    assert upstream["provider_revalidation_result"] == "EXACT_MAPPING_RECONFIRMED"
    revalidation_bindings = revalidation["vocabulary_bindings"]
    for binding_key, (artifact_path, expected_sha256) in EXPECTED_PROVIDER_ARTIFACTS.items():
        assert revalidation_bindings[binding_key] == expected_sha256
        assert _sha256_file(artifact_path) == expected_sha256
    assert contract["implements_candidate_section"] == "7.2"


def test_revalidation_is_replayable_complete_and_hash_bound() -> None:
    current = _json(REVALIDATION)
    frozen_sources = _json(PROVIDER_DIR / "source-evidence.json")
    frozen_claims = _json(PROVIDER_DIR / "claim-evidence.json")
    frozen_projection = _json(PROVIDER_DIR / "compute-field-projection.json")
    bundle = current["external_revalidation_bundle"]
    assert bundle["repository_storage"] == "EXTERNAL_UNTRACKED"
    assert bundle["storage_locator"] == (
        "external-recovery://fluencytracr/"
        "gcp-runtime-object-revalidation-source-snapshot-20260724T151043Z.zip"
    )
    assert bundle["bytes"] == 1017600
    assert bundle["sha256"] == "99f2387fa1bed1b491dfd34a5b5c365f37822af4a26cb96a3d29fc649b0372b9"
    assert len(bundle["members"]) == 18
    assert bundle["member_order"] == [member["archive_name"] for member in bundle["members"]]

    sources = current["sources"]
    assert current["source_count"] == len(sources) == 16
    assert [source["source_id"] for source in sources] == [
        source["source_id"] for source in frozen_sources["sources"]
    ]
    frozen_source_by_id = {source["source_id"]: source for source in frozen_sources["sources"]}
    current_source_by_id = {source["source_id"]: source for source in sources}
    for source in sources:
        assert source["http_status"] == 200
        assert source["official_url"] == frozen_source_by_id[source["source_id"]]["official_url"]
        assert HEX64.fullmatch(source["sha256"])
        assert source["frozen_snapshot_sha256"] == frozen_source_by_id[source["source_id"]]["sha256"]
        assert source["byte_equality_required"] is False

    claims = current["claims"]
    frozen_by_claim = {claim["claim_id"]: claim for claim in frozen_claims["claims"]}
    assert current["claim_count"] == len(claims) == 20
    assert current["source_observation_count"] == 22
    needle_count = 0
    for claim in claims:
        frozen = frozen_by_claim[claim["claim_id"]]
        assert claim["frozen_mapping"] == frozen["frozen_mapping"]
        assert claim["source_ids"] == frozen["source_ids"]
        assert claim["required_for_ready"] is frozen["required_for_ready"]
        assert claim["revalidation_result"] == "EXACT_MAPPING_RECONFIRMED"
        for observation in claim["source_observations"]:
            needle_count += len(observation["evidence_needles"])
            assert observation["current_source_sha256"] == current_source_by_id[
                observation["source_id"]
            ]["sha256"]
            for needle in observation["evidence_needles"]:
                assert any(needle in context for context in observation["evidence_contexts"])
            body = {
                "claim_id": claim["claim_id"],
                "source_id": observation["source_id"],
                "current_source_sha256": observation["current_source_sha256"],
                "frozen_mapping": claim["frozen_mapping"],
                "evidence_needles": observation["evidence_needles"],
                "evidence_contexts": observation["evidence_contexts"],
                "observation": observation["observation"],
            }
            assert observation["evidence_commitment_sha256"] == _sha256_bytes(_canonical(body))
    assert needle_count == 113
    tee_env = next(claim for claim in claims if claim["claim_id"] == "GCP_TEE_ENV_SUFFIX_GRAMMAR")
    assert tee_env["negative_disclosure_review"] == (
        "NO_COMPLETE_SUFFIX_GRAMMAR_PUBLISHED_DYNAMIC_KEYS_DEFAULT_DENY"
    )

    compute = current["compute_projection_revalidation"]
    stripped = [
        {key: value for key, value in field.items() if key != "disposition"}
        for field in frozen_projection["fields"]
    ]
    assert compute["provider_revision"] == frozen_projection["provider_revision"] == "20260709"
    assert compute["current_derived_projection"] == stripped
    assert compute["field_count"] == len(stripped) == 257
    assert compute["current_derived_projection_sha256"] == _sha256_bytes(_canonical(stripped))
    assert compute["projection_result"] == "EXACT_MAPPING_RECONFIRMED"

    body = copy.deepcopy(current)
    recorded = body.pop("revalidation_hash")
    assert recorded == _sha256_bytes(
        b"FLUENCYTRACR:GCP_PROVIDER_REVALIDATION:V1\x00" + _canonical(body)
    )
    assert current["recorded_result"] == "EXACT_MAPPING_RECONFIRMED"
    assert current["authorization_effect"] == "NONE_DOCS_ONLY"


def test_revalidation_verifier_rejects_self_consistent_untrusted_artifacts(
    tmp_path: Path,
) -> None:
    with pytest.raises(RevalidationVerificationError, match="duplicate JSON key"):
        _strict_revalidation_json_loads('{"schema_version":"a","schema_version":"b"}')
    for malformed in (
        '{"a":null}',
        '{"a":"e\\u0301"}',
        '{"a":"x\\u0001y"}',
        '{"a":"x\\u202ey"}',
        '{"a\\u0000":1}',
        '{"é":1}',
    ):
        with pytest.raises(RevalidationVerificationError):
            _strict_revalidation_json_loads(malformed)
    original = _json(REVALIDATION)
    mutations: list[Callable[[dict[str, Any]], None]] = [
        lambda item: item.update(authorization_effect="AUTHORIZED"),
        lambda item: item.update(extra={"authorize": True}),
        lambda item: item["claims"][0].update(frozen_mapping="tampered"),
        lambda item: item["claims"][0]["source_observations"][0].update(
            evidence_needles=[], evidence_contexts=[]
        ),
        lambda item: item["claims"][0]["source_observations"][0].update(
            current_source_sha256="0" * 64
        ),
    ]
    for index, mutate in enumerate(mutations):
        candidate = copy.deepcopy(original)
        mutate(candidate)
        candidate.pop("revalidation_hash", None)
        candidate["revalidation_hash"] = _sha256_bytes(
            b"FLUENCYTRACR:GCP_PROVIDER_REVALIDATION:V1\x00"
            + _canonical(candidate)
        )
        path = tmp_path / f"mutated-{index}.json"
        path.write_text(json.dumps(candidate, indent=2, sort_keys=True) + "\n")
        with pytest.raises(
            RevalidationVerificationError,
            match="exact-byte commitment mismatch",
        ):
            verify_revalidation_bundle(tmp_path / "not-read.zip", path)


@pytest.mark.skipif(
    not RECOVERY_BUNDLE.exists(),
    reason="external hash-bound recovery bundle is not present",
)
def test_external_revalidation_bundle_replays_when_available() -> None:
    verify_revalidation_bundle(RECOVERY_BUNDLE, REVALIDATION)


def test_profile_instance_registries_are_closed_typed_and_honestly_insufficient() -> None:
    contract = _json(CONTRACT)
    _, vectors = _vectors()
    assert contract["approved_runtime_profile_hashes"] == []
    assert contract["synthetic_test_profile_hashes"] == [
        vectors["runtime_profile_hash"]["expected_hash"]
    ]
    assert contract["profile_admission"]["runtime"].endswith(
        "EMPTY_IN_SECTION_7_2"
    )
    registry = contract["field_registry"]
    profiles = registry["profile_fields"]
    instances = registry["instance_fields"]
    assert len(profiles) == 84
    assert len(instances) == 30
    for fields, scope in (
        (profiles, "DETERMINISTIC_NUMERICAL_PROFILE"),
        (instances, "PER_INSTANCE_PER_BOOT_OBSERVATION"),
    ):
        assert [field["field_id"] for field in fields] == sorted(field["field_id"] for field in fields)
        assert len(fields) == len({field["field_id"] for field in fields})
        assert {field["object_scope"] for field in fields} == {scope}
        assert {field["attestation_visibility"] for field in fields}.issubset(VISIBILITY)
        assert {field["control_plane_visibility"] for field in fields}.issubset(VISIBILITY)
        assert {field["sufficiency"] for field in fields}.issubset(SUFFICIENCY)
        assert all(set(field["allowed_presence"]).issubset(PRESENCE) for field in fields)
        assert all(field["value_type"] in contract["value_type_contracts"] for field in fields)
    assert contract["field_registry_sha256"] == _sha256_bytes(_canonical(registry))
    assert contract["value_type_contracts_sha256"] == _sha256_bytes(
        _canonical(contract["value_type_contracts"])
    )

    profile = {field["field_id"]: field for field in profiles}
    instance = {field["field_id"]: field for field in instances}
    assert profile["openblas_thread_count"]["exact_value"] == 1
    assert profile["floating_point_rounding_mode"]["exact_value"] == (
        "ROUND_TO_NEAREST_TIES_TO_EVEN"
    )
    assert instance["token_hwmodel"]["exact_value"] == "GCP_INTEL_TDX"
    assert instance["cel_hwmodel"]["exact_value"] == "INTEL_TDX"
    assert instance["compute_confidential_instance_type"]["exact_value"] == "TDX"
    assert instance["compute_status"]["exact_value"] == "RUNNING"
    assert "runtime_measurement_hash" not in instance
    assert "boot_epoch_commitment" not in instance
    assert "control_plane_observation_hash" not in instance
    assert instance["raw_attestation_token_sha256"]["allowed_presence"] == ["PRESENT"]
    for field_id in (
        "cpu_family",
        "cpu_model",
        "cpu_stepping",
        "cpu_microcode",
        "required_instruction_profile_sha256",
    ):
        assert profile[field_id]["allowed_presence"] == ["PROVIDER_HIDDEN"]
        assert profile[field_id]["sufficiency"] == "REQUIRES_PARENT_GOVERNANCE_DECISION"
    assert contract["runtime_identity_sufficiency"]["current_runtime_identity"] == (
        "INSUFFICIENT_NO_OBSERVED_INSTANCE_ATTESTATION_OR_QUALIFICATION"
    )
    assert contract["runtime_identity_sufficiency"]["runtime_authority"] == "HELD"


def test_runtime_profile_approval_interface_binds_resolved_bytes_but_stays_held() -> None:
    contract = _json(CONTRACT)
    vector_payload, vectors = _vectors()
    interface = contract["runtime_profile_approval_interface"]

    assert set(interface) == {
        "approval_provenance_schema",
        "authority_effect",
        "external_approval_records",
        "held_reason",
        "resolved_profile_binding",
        "runtime_record_references",
        "schema_version",
    }
    assert interface["schema_version"] == "GCP_RUNTIME_PROFILE_APPROVAL_INTERFACE_V1"
    assert interface["authority_effect"] == "NONE"
    assert interface["held_reason"] == "EXTERNAL_APPROVAL_AND_RUNTIME_RECORD_REQUIRED"
    assert interface["resolved_profile_binding"] == {
        "canonical_body_sha256": vectors["runtime_profile_hash"][
            "canonical_body_sha256"
        ],
        "runtime_profile_hash": vectors["runtime_profile_hash"]["expected_hash"],
    }
    assert interface["external_approval_records"] == []
    assert interface["runtime_record_references"] == []
    assert interface["approval_provenance_schema"] == {
        "field_value_types": {
            "canonical_body_sha256": "DIGEST_SHA256",
            "external_approval_artifact_sha256": "DIGEST_SHA256",
            "external_approval_provenance": "SECTION_7_4_EXTERNAL_APPROVAL_PROVENANCE_RECORD",
            "runtime_profile_hash": "DIGEST_SHA256",
        },
        "owner": "SECTION_7_4",
        "required_keys": [
            "schema_version",
            "canonical_body_sha256",
            "runtime_profile_hash",
            "external_approval_provenance",
            "external_approval_artifact_sha256",
        ],
        "external_approval_artifact_sha256_field": "external_approval_artifact_sha256",
        "external_approval_provenance_field": "external_approval_provenance",
        "resolved_profile_canonical_body_sha256_field": "canonical_body_sha256",
        "schema_version": "GCP_RUNTIME_PROFILE_EXTERNAL_APPROVAL_PROVENANCE_V1",
    }
    assert vector_payload["authorization_effect"] == "NONE_TEST_VECTORS_ONLY"
    assert vectors["runtime_profile_hash"]["expected_hash"] not in contract[
        "approved_runtime_profile_hashes"
    ]
    assert vector_payload["runtime_profile_approval_interface_evidence"] == {
        "external_approval_record_count": 0,
        "resolved_profile_canonical_body_sha256": vectors["runtime_profile_hash"][
            "canonical_body_sha256"
        ],
        "runtime_profile_hash": vectors["runtime_profile_hash"]["expected_hash"],
        "runtime_record_reference_count": 0,
        "state": "EXTERNAL_APPROVAL_AND_RUNTIME_RECORD_REQUIRED",
    }
    verify_runtime_profile_approval_interface()


def test_control_projection_is_total_leaf_only_and_cannot_smuggle_descendants() -> None:
    runtime = _json(CONTROL)
    provider = _json(PROVIDER_DIR / "compute-field-projection.json")
    fields = runtime["fields"]
    assert runtime["field_count"] == len(fields) == 257
    assert [field["path"] for field in fields] == [field["path"] for field in provider["fields"]]
    by_path = {field["path"]: field for field in fields}
    assert len(by_path) == 257
    for source in provider["fields"]:
        projected = by_path[source["path"]]
        assert projected["provider_disposition"] == source["disposition"]
        for key, value in source.items():
            if key != "disposition":
                assert projected[key] == value
    assert Counter(field["runtime_disposition"] for field in fields) == {
        "DERIVED_POSTURE_ONLY": 2,
        "INSTANCE_AND_PROFILE_BINDING": 3,
        "INSTANCE_IDENTITY_BINDING": 41,
        "PROFILE_CONTROL_BINDING": 60,
        "REJECT_IF_PRESENT": 91,
        "STRUCTURAL_CONTAINER_ONLY": 45,
        "TRANSIENT_OBSERVATION_NO_RETENTION": 10,
        "TRANSIENT_POLICY_CHECK_NO_RETENTION": 5,
    }
    all_paths = [field["path"] for field in fields]
    parents = {
        path for path in all_paths if any(other.startswith(path + ".") for other in all_paths)
    }
    assert len(parents) == 45
    assert all(by_path[path]["runtime_disposition"] == "STRUCTURAL_CONTAINER_ONLY" for path in parents)
    assert by_path["disks[]"]["runtime_disposition"] == "STRUCTURAL_CONTAINER_ONLY"
    assert by_path["networkInterfaces[]"]["runtime_disposition"] == "STRUCTURAL_CONTAINER_ONLY"
    assert by_path["disks[].diskEncryptionKey.rawKey"]["runtime_disposition"] == "REJECT_IF_PRESENT"
    for path in (
        "disks[].diskEncryptionKey.kmsKeyServiceAccount",
        "instanceEncryptionKey.kmsKeyServiceAccount",
        "sourceMachineImageEncryptionKey.kmsKeyServiceAccount",
        "scheduling.locationHint",
        "resourceStatus.effectiveInstanceMetadata.vmDnsSettingMetadataValue",
        "resourceStatus.physicalHost",
        "resourceStatus.physicalHostTopology.block",
        "resourceStatus.physicalHostTopology.cluster",
        "resourceStatus.physicalHostTopology.host",
        "resourceStatus.physicalHostTopology.subblock",
    ):
        assert by_path[path]["runtime_disposition"] == "REJECT_IF_PRESENT"
        assert by_path[path]["retention"] == "PROHIBITED"
    assert by_path["metadata.items[].value"]["runtime_disposition"] == (
        "TRANSIENT_POLICY_CHECK_NO_RETENTION"
    )
    hashed = runtime["hash_preimage_paths"]
    assert runtime["hash_preimage_path_count"] == len(hashed) == 104
    for path in (
        "reservationAffinity.key",
        "reservationAffinity.values[]",
        "scheduling.nodeAffinities[].key",
        "workloadIdentityConfig.identity",
    ):
        assert by_path[path]["runtime_disposition"] == "REJECT_IF_PRESENT"
        assert path not in hashed
    for path in ("serviceAccounts[].email", "serviceAccounts[].scopes[]"):
        assert by_path[path]["runtime_disposition"] == "REJECT_IF_PRESENT"
        assert by_path[path]["retention"] == "PROHIBITED"
        assert path not in hashed
    for path in (
        "disks[].deviceName",
        "disks[].initializeParams.diskName",
        "networkInterfaces[].name",
        "networkInterfaces[].parentNicName",
        "name",
    ):
        assert by_path[path]["runtime_value_type"] == "OPAQUE_QUALIFICATION_ID"
    assert hashed == sorted(hashed)
    assert runtime["hash_preimage_paths_sha256"] == _sha256_bytes(_canonical(hashed))
    assert not parents.intersection(hashed)
    assert all(
        by_path[path]["runtime_disposition"]
        in {"PROFILE_CONTROL_BINDING", "INSTANCE_IDENTITY_BINDING", "INSTANCE_AND_PROFILE_BINDING"}
        for path in hashed
    )
    scalar = runtime["scalar_hash_preimage_paths"]
    resource_specs = runtime["resource_root_specs"]
    resource_paths = {
        path for spec in resource_specs for path in spec["field_paths"]
    }
    assert set(scalar).isdisjoint(resource_paths)
    assert set(scalar) | resource_paths == set(hashed)
    assert [spec["resource_root"] for spec in resource_specs] == [
        "disks[]",
        "guestAccelerators[]",
        "networkInterfaces[]",
        "scheduling.nodeAffinities[]",
    ]
    crosswalk = runtime["control_profile_crosswalk"]
    assert [
        (binding["path"], binding["profile_field_id"], binding["transform"])
        for binding in crosswalk["direct_bindings"]
    ] == [
        ("advancedMachineFeatures.enableNestedVirtualization", "nested_virtualization", "EXACT_VALUE"),
        ("advancedMachineFeatures.performanceMonitoringUnit", "performance_monitoring_unit", "EXACT_VALUE"),
        ("advancedMachineFeatures.threadsPerCore", "threads_per_core", "EXACT_VALUE"),
        ("advancedMachineFeatures.turboMode", "turbo_mode", "EXACT_VALUE"),
        ("advancedMachineFeatures.visibleCoreCount", "visible_core_count", "EXACT_VALUE"),
        ("confidentialInstanceConfig.confidentialInstanceType", "compute_confidential_instance_type", "EXACT_VALUE"),
        ("confidentialInstanceConfig.enableConfidentialCompute", "enable_confidential_compute", "EXACT_VALUE"),
        ("cpuPlatform", "compute_cpu_platform_raw", "EXACT_VALUE"),
        ("displayDevice.enableDisplay", "display_enabled", "EXACT_VALUE"),
        ("machineType", "provisional_machine_type", "FINAL_URI_SEGMENT"),
        ("minCpuPlatform", "compute_min_cpu_platform_raw", "EXACT_VALUE"),
        ("scheduling.automaticRestart", "automatic_restart", "EXACT_VALUE"),
        ("scheduling.onHostMaintenance", "on_host_maintenance", "EXACT_VALUE"),
        ("scheduling.preemptible", "preemptible", "EXACT_VALUE"),
        ("scheduling.provisioningModel", "provisioning_model", "EXACT_VALUE"),
        ("shieldedInstanceConfig.enableIntegrityMonitoring", "integrity_monitoring", "EXACT_VALUE"),
        ("shieldedInstanceConfig.enableSecureBoot", "secure_boot", "EXACT_VALUE"),
        ("shieldedInstanceConfig.enableVtpm", "vtpm", "EXACT_VALUE"),
    ]
    assert [
        (
            binding["resource_root"],
            binding["profile_field_id"],
            binding["transform"],
            binding["required_cardinality"],
        )
        for binding in crosswalk["resource_cardinality_bindings"]
    ] == [
        (
            "guestAccelerators[]",
            "guest_accelerator_count",
            "RESOURCE_RECORD_COUNT",
            "EXACTLY_ZERO",
        )
    ]
    assert [
        (
            binding["posture_key"],
            binding["profile_field_id"],
            binding["transform"],
        )
        for binding in crosswalk["derived_posture_bindings"]
    ] == [("public_address_present", "initial_public_ingress", "EXACT_VALUE")]
    assert [
        (
            binding["manifest_id"],
            binding["profile_field_id"],
            binding["domain_separator"],
        )
        for binding in crosswalk["manifest_bindings"]
    ] == [
        ("BOOT_DISK_CONTROL_MANIFEST_V1", "boot_disk_manifest_sha256", "FLUENCYTRACR:GCP_PROFILE_BOOT_DISK_CONTROLS:V1"),
        ("NETWORK_CONTROL_MANIFEST_V1", "network_interface_manifest_sha256", "FLUENCYTRACR:GCP_PROFILE_NETWORK_CONTROLS:V1"),
        ("RESIDUAL_CONTROL_MANIFEST_V1", "compute_residual_control_manifest_sha256", "FLUENCYTRACR:GCP_PROFILE_RESIDUAL_CONTROLS:V1"),
    ]
    assert all(
        binding["resource_record_id_in_preimage"] is False
        and binding["concrete_instance_identity_paths_in_preimage"] == []
        and binding["resource_record_order"]
        == "CANONICAL_ASCENDING_BY_FILTERED_FIELDS"
        for binding in crosswalk["manifest_bindings"]
    )
    profile_paths = {
        field["path"]
        for field in fields
        if field["runtime_disposition"]
        in {"PROFILE_CONTROL_BINDING", "INSTANCE_AND_PROFILE_BINDING"}
    }
    covered = {binding["path"] for binding in crosswalk["direct_bindings"]}
    covered |= {
        path
        for binding in crosswalk["manifest_bindings"]
        for path in binding["paths"]
    }
    covered |= set(
        next(
            spec["field_paths"]
            for spec in resource_specs
            if spec["resource_root"] == "guestAccelerators[]"
        )
    )
    assert covered == profile_paths
    assert not any(path.startswith("serviceAccounts[]") for path in profile_paths)
    assert "service_account_scope_manifest_sha256" not in {
        field["field_id"] for field in _json(CONTRACT)["field_registry"]["profile_fields"]
    }
    occurrences = [binding["path"] for binding in crosswalk["direct_bindings"]]
    occurrences.extend(
        path
        for binding in crosswalk["manifest_bindings"]
        for path in binding["paths"]
    )
    occurrences.extend(
        next(
            spec["field_paths"]
            for spec in resource_specs
            if spec["resource_root"] == "guestAccelerators[]"
        )
    )
    assert Counter(occurrences) == Counter({path: 1 for path in profile_paths})
    assert crosswalk["profile_bound_path_count"] == len(profile_paths)
    assert runtime["default_runtime_disposition"] == "REJECT_IF_PRESENT"
    assert runtime["projection_rules"]["projected_rows_are_leaf_paths_only"] is True
    assert runtime["projection_rules"][
        "wildcard_resource_paths_use_identity_keyed_records_not_independent_scalar_sets"
    ] is True
    assert runtime["projection_rules"]["raw_compute_response_retention"] == "PROHIBITED"


def test_every_gcp_resource_uri_kind_rejects_cross_kind_and_bad_names() -> None:
    prefix = "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/"
    examples = {
        "ZONE": prefix + "zones/us-central1-a",
        "INSTANCE": prefix + "zones/us-central1-a/instances/ft-qualification-id-00000001",
        "MACHINE_TYPE": prefix + "zones/us-central1-a/machineTypes/c3-standard-4",
        "DISK": prefix + "zones/us-central1-a/disks/ft-qualification-id-00000001",
        "DISK_TYPE": prefix + "zones/us-central1-a/diskTypes/pd-balanced",
        "IMAGE": prefix + "global/images/ft-qualification-id-00000001",
        "SNAPSHOT": prefix + "global/snapshots/ft-qualification-id-00000001",
        "LICENSE": prefix + "global/licenses/ft-qualification-id-00000001",
        "NETWORK": prefix + "global/networks/ft-qualification-id-00000001",
        "NETWORK_ATTACHMENT": prefix + "regions/us-central1/networkAttachments/ft-qualification-id-00000001",
        "SUBNETWORK": prefix + "regions/us-central1/subnetworks/ft-qualification-id-00000001",
        "RESOURCE_POLICY": prefix + "regions/us-central1/resourcePolicies/ft-qualification-id-00000001",
        "MACHINE_IMAGE": prefix + "global/machineImages/ft-qualification-id-00000001",
    }
    kinds = list(examples)
    for index, kind in enumerate(kinds):
        _validate_gcp_resource_uri(examples[kind], kind)
        wrong_kind = kinds[(index + 1) % len(kinds)]
        with pytest.raises(ValueError, match="kind/path mismatch"):
            _validate_gcp_resource_uri(examples[wrong_kind], kind)
    for kind, value in examples.items():
        prefix_path, final_name = value.rsplit("/", 1)
        for bad in (
            value + "-",
            prefix_path + "/" + final_name[:1].upper() + final_name[1:],
            prefix_path + "/" + "a" * 64,
        ):
            with pytest.raises(ValueError):
                _validate_gcp_resource_uri(bad, kind)


def test_reservation_affinity_domains_reject_unknown_and_identifier_shapes() -> None:
    control = _json(CONTROL)
    fields = {field["path"]: field for field in control["fields"]}
    with pytest.raises(ValueError, match="enum"):
        _provider_field_value(
            "NOT_A_RESERVATION",
            fields["reservationAffinity.consumeReservationType"],
            as_set=False,
        )
    safe_token = _json(CONTRACT)["value_type_contracts"]["SAFE_TOKEN"]
    for invalid in (
        "human@example.com",
        "127.0.0.1",
        "2130706433",
        "127.0.0.1 ",
        "0177.0.0.1 ",
        "2130706433.",
        "2001:db8::1",
        "2001:db8::1 ",
        "{arbitrary-payload}",
    ):
        with pytest.raises(ValueError):
            _type_contract(invalid, "SAFE_TOKEN", safe_token)

def test_canonicalization_rejects_lexical_and_numeric_collision_classes(
    tmp_path: Path,
) -> None:
    contract = _json(CONTRACT)
    canonicalization = contract["canonicalization"]
    assert canonicalization["version"] == "FT_CANONICAL_JSON_V1"
    assert canonicalization["floats"] == "PROHIBITED"
    assert canonicalization["null"].startswith("PROHIBITED")
    assert canonicalization["unknown_fields"] == "REJECT_RECURSIVELY"
    assert _strict_json_loads('{"a":1,"b":false}') == {"a": 1, "b": False}
    for text in (
        '{"a":1,"a":2}',
        '{"a":null}',
        '{"a":1.5}',
        '{"a":1e309}',
        '{"a":-0}',
        '{"a":9223372036854775808}',
        '{"a":NaN}',
    ):
        with pytest.raises(ValueError):
            _strict_json_loads(text)
    duplicate_artifact = tmp_path / "duplicate.json"
    duplicate_artifact.write_text('{"schema_version":"first","schema_version":"second"}')
    with pytest.raises(ValueError, match="duplicate key"):
        _json(duplicate_artifact)
    with pytest.raises(ValueError, match="ASCII"):
        _strict_json_loads('{"é":"accepted"}')
    with pytest.raises(ValueError):
        _strict_json_loads('{"a\\u0000":1}')
    for value in (
        {"a": float("nan")},
        {"a": float("inf")},
        {"a": -0.0},
        {"a": "e\u0301"},
        {"a": "x\x7fy"},
        {"a": "x\x85y"},
        {"a": chr(0xD800)},
        {"a": "x\u202ey"},
    ):
        with pytest.raises(ValueError):
            _validate_canonical_value(value)


def test_provider_int32_int64_byte_and_rfc3339_domains_fail_closed() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_hash = vectors["runtime_profile_hash"]["expected_hash"]
    original = vectors["control_plane_observation_hash"]["stored_object"]

    def scalar(control: dict[str, Any], path: str) -> dict[str, Any]:
        return next(row for row in control["projected_fields"] if row["path"] == path)

    def disk(control: dict[str, Any], path: str) -> dict[str, Any]:
        resource_set = next(
            item for item in control["projected_resource_sets"] if item["resource_root"] == "disks[]"
        )
        return next(row for row in resource_set["records"][0]["fields"] if row["path"] == path)

    mutations: list[Callable[[dict[str, Any]], None]] = [
        lambda obj: scalar(obj, "advancedMachineFeatures.visibleCoreCount").update(value=2**31),
        lambda obj: scalar(obj, "name").update(value="BadName"),
        lambda obj: scalar(obj, "name").update(value="alice-smith"),
        lambda obj: scalar(obj, "tags.items[]").update(presence="PRESENT", value=["BadTag"]),
        lambda obj: scalar(obj, "lastStopTimestamp").update(presence="PRESENT", value="not-a-timestamp"),
        lambda obj: scalar(obj, "lastSuspendedTimestamp").update(presence="PRESENT", value="2026-07-24T00:00:00-00:00"),
        lambda obj: scalar(obj, "scheduling.terminationTime").update(presence="PRESENT", value="2026-99-99T00:00:00Z"),
        lambda obj: scalar(obj, "resourceStatus.upcomingMaintenance.windowStartTime").update(presence="PRESENT", value="2026-07-24T00:00:00-00:00"),
        lambda obj: disk(obj, "disks[].diskSizeGb").update(value=str(2**63)),
    ]
    for mutate in mutations:
        candidate = copy.deepcopy(original)
        mutate(candidate)
        _recompute_control_manifests(candidate, control_contract)
        _seal(candidate, nodes["control_plane_observation_hash"])
        with pytest.raises(ValueError):
            _validate_control(
                candidate,
                contract,
                control_contract,
                nodes,
                profile_hash,
            )

    instance = copy.deepcopy(
        vectors["runtime_instance_observation_hash"]["stored_object"]
    )
    _mutate_field(
        instance,
        "tdx_tcb_date",
        lambda row: row.update(value="2026-99-99T99:99:99Z"),
    )
    _seal(instance, nodes["runtime_instance_observation_hash"])
    with pytest.raises(ValueError, match="RFC3339"):
        _validate_instance(
            instance,
            contract,
            nodes,
            vectors["runtime_profile_hash"]["expected_hash"],
            vectors["control_plane_observation_hash"]["expected_hash"],
        )


def test_uri_bounds_and_oauth_scope_allowlist() -> None:
    contracts = _json(CONTRACT)["value_type_contracts"]
    scope = "https://www.googleapis.com/auth/cloud-platform"
    _type_contract(scope, "GCP_OAUTH_SCOPE", contracts["GCP_OAUTH_SCOPE"])
    for invalid_scope in (
        "https://evil.example/person/alice-smith",
        "https://www.googleapis.com/auth/cloud-platform-extra",
    ):
        with pytest.raises(ValueError):
            _type_contract(
                invalid_scope,
                "GCP_OAUTH_SCOPE",
                contracts["GCP_OAUTH_SCOPE"],
            )

    def sized_uri(target_bytes: int) -> str:
        prefix = "https://example.com/"
        component_budget = target_bytes - len(prefix) - 3
        base, remainder = divmod(component_budget, 4)
        components = ["a" * (base + int(index < remainder)) for index in range(4)]
        result = prefix + "/".join(components)
        assert len(result.encode("utf-8")) == target_bytes
        return result

    _type_contract(sized_uri(512), "URI", contracts["URI"])
    with pytest.raises(ValueError):
        _type_contract(sized_uri(513), "URI", contracts["URI"])


def test_canonical_oci_reference_accepts_only_approved_registry_namespace() -> None:
    contract = _json(CONTRACT)["value_type_contracts"]["OCI_IMAGE_REFERENCE"]
    path = "ft-qualification-id-00000001/ft-runtime/image-00000001"
    value = f"us-docker.pkg.dev/{path}@sha256:" + "a" * 64
    _type_contract(value, "OCI_IMAGE_REFERENCE", contract)
    assert _validate_oci_image_reference(value) == "sha256:" + "a" * 64
    for invalid in (
        "user-alice-smith.example/" + path + "@sha256:" + "a" * 64,
        "us-docker.pkg.dev:443/" + path + "@sha256:" + "a" * 64,
        "us-docker.pkg.dev/ft-qualification-id-00000001/other/image-00000001@sha256:" + "a" * 64,
        "us-docker.pkg.dev/ft-qualification-id-00000001/ft-runtime/alice-smith@sha256:" + "a" * 64,
        "us-docker.pkg.dev/customers/alice-smith@sha256:" + "a" * 64,
    ):
        with pytest.raises(ValueError):
            _validate_oci_image_reference(invalid)
    for legacy_ip in (
        "127.1",
        "0177.0.0.1",
        "0x7f.0.0.1",
        "0300.0250.0001.0001",
        "2130706433",
        "017700000001",
        "0x7f000001",
    ):
        with pytest.raises(ValueError):
            _validate_https_uri_surface(f"https://{legacy_ip}/path")
        with pytest.raises(ValueError):
            _validate_oci_image_reference(
                f"{legacy_ip}/{path}@sha256:" + "a" * 64
            )

def test_rfc3339_offsets_nanoseconds_and_fail_closed_leap_seconds() -> None:
    contract = _json(CONTRACT)["value_type_contracts"]["RFC3339"]
    valid = [
        "2026-07-24T00:00:00Z",
        "2026-07-24T00:00:00.123456789Z",
        "2026-07-23T17:00:00-07:00",
        "2026-07-24T07:00:00+07:00",
        "2026-07-24T00:00:00+00:00",
    ]
    for value in valid:
        _type_contract(value, "RFC3339", contract)
    assert _rfc3339_nanoseconds(valid[0]) == _rfc3339_nanoseconds(valid[2])
    assert _rfc3339_nanoseconds(valid[0]) == _rfc3339_nanoseconds(valid[3])
    assert _rfc3339_nanoseconds(valid[1]) - _rfc3339_nanoseconds(valid[0]) == 123456789
    for value in (
        "2026-13-24T00:00:00Z",
        "2026-07-24T25:00:00Z",
        "2026-07-24T00:00:60Z",
        "2016-12-31T23:59:60Z",
        "2016-12-31T23:59:60.9Z",
        "2026-07-24T00:00:61Z",
        "2026-07-24T00:00:00-00:00",
        "2026-07-24T00:00:00+24:00",
        "2026-07-24T00:00:00+00:60",
    ):
        with pytest.raises(ValueError):
            _type_contract(value, "RFC3339", contract)


def test_golden_vectors_are_schema_valid_and_replay_exact_bytes() -> None:
    payload, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    assert payload["runtime_object_contract_sha256"] == _sha256_file(CONTRACT)
    assert payload["control_plane_projection_sha256"] == _sha256_file(CONTROL)
    assert payload["provider_revalidation_artifact_sha256"] == _sha256_file(REVALIDATION)
    assert payload["synthetic_only"] is True
    assert set(vectors) == {
        "runtime_profile_hash",
        "control_plane_observation_hash",
        "runtime_instance_observation_hash",
    }
    for node_id, vector in vectors.items():
        node = nodes[node_id]
        body = _without_hash(vector["stored_object"], node["self_hash_field"])
        body_bytes = _canonical(body)
        preimage = node["domain_separator"].encode("ascii") + b"\x00" + body_bytes
        assert base64.b64decode(vector["canonical_body_utf8_base64"]) == body_bytes
        assert vector["canonical_body_sha256"] == _sha256_bytes(body_bytes)
        assert base64.b64decode(vector["domain_separated_preimage_base64"]) == preimage
        assert vector["expected_hash"] == _sha256_bytes(preimage)
        assert vector["stored_object"][node["self_hash_field"]] == vector["expected_hash"]

    profile_object = vectors["runtime_profile_hash"]["stored_object"]
    control_object = vectors["control_plane_observation_hash"]["stored_object"]
    instance_object = vectors["runtime_instance_observation_hash"]["stored_object"]
    profile_rows = _validate_profile(profile_object, contract, nodes)
    control_values = _validate_control(
        control_object,
        contract,
        control_contract,
        nodes,
        profile_object["runtime_profile_hash"],
    )
    instance_rows = _validate_instance(
        instance_object,
        contract,
        nodes,
        profile_object["runtime_profile_hash"],
        control_object["control_plane_observation_hash"],
    )
    _validate_cross(
        profile_rows,
        control_values,
        instance_rows,
        control_object["observation_point"],
        control_contract,
    )


def test_hash_graph_closes_only_section_7_2_and_future_interfaces_do_not_loop() -> None:
    contract = _json(CONTRACT)
    graph = contract["hash_graph"]
    assert [node["node_id"] for node in graph] == [
        "provider_revalidation_hash",
        "runtime_profile_hash",
        "control_plane_observation_hash",
        "runtime_instance_observation_hash",
    ]
    assert {node["node_id"]: node["dependencies"] for node in graph} == {
        "provider_revalidation_hash": [],
        "runtime_profile_hash": ["provider_revalidation_hash"],
        "control_plane_observation_hash": ["runtime_profile_hash"],
        "runtime_instance_observation_hash": [
            "runtime_profile_hash",
            "control_plane_observation_hash",
        ],
    }
    assert "provider_revalidation_hash" in contract["object_schemas"]["profile"][
        "required_keys"
    ]
    assert "runtime_profile_hash" in contract["object_schemas"][
        "control_observation"
    ]["required_keys"]
    assert {
        "runtime_profile_hash",
        "control_plane_observation_hash",
    }.issubset(contract["object_schemas"]["instance_observation"]["required_keys"])
    assert len({node["domain_separator"] for node in graph}) == len(graph)
    assert len({node["self_hash_field"] for node in graph}) == len(graph)
    seen: set[str] = set()
    for node in graph:
        assert set(node["dependencies"]).issubset(seen)
        assert node["node_id"] not in node["dependencies"]
        seen.add(node["node_id"])
    assert contract["hash_graph_sha256"] == _sha256_bytes(_canonical(graph))
    interfaces = contract["future_dependency_interfaces"]
    assert interfaces["no_domain_separator_preimage_or_hash_is_defined_by_section_7_2"] is True
    interface_ids = {item["interface_id"] for item in interfaces["interfaces"]}
    assert interface_ids == {
        "SECTION_7_3_7_4_TRUST_POLICY",
        "SECTION_7_4_RUNTIME_MEASUREMENT",
        "SECTION_7_4_ATTESTED_RUNTIME_IDENTITY",
        "SECTION_7_4_TERMINAL_RECEIPT",
        "SECTION_7_6_REQUALIFICATION_LEDGER_SCHEMA",
        "SECTION_7_8_QUALIFICATION_PLAN_AND_RESULT",
        "SECTION_7_7_INTEGRATION_GATE",
    }
    runtime_measurement = next(
        item
        for item in interfaces["interfaces"]
        if item["interface_id"] == "SECTION_7_4_RUNTIME_MEASUREMENT"
    )
    assert runtime_measurement["must_bind"] == [
        "runtime_profile_hash",
        "runtime_instance_observation_hash",
        "raw_attestation_token_sha256",
        "last_start_timestamp",
        "observation_point",
        "boot_epoch_commitment",
        "fresh_nonce",
    ]
    requalification_ledger = next(
        item
        for item in interfaces["interfaces"]
        if item["interface_id"] == "SECTION_7_6_REQUALIFICATION_LEDGER_SCHEMA"
    )
    assert requalification_ledger["must_bind"] == [
        "attested_runtime_identity_hash",
        "source_evidence_envelope_sha256",
        "raw_provider_source_authentication_reference",
        "single_use_attempt_claim",
        "terminal_state",
    ]
    terminal_receipt = next(
        item
        for item in interfaces["interfaces"]
        if item["interface_id"] == "SECTION_7_4_TERMINAL_RECEIPT"
    )
    assert terminal_receipt["must_bind"] == [
        "runtime_profile_hash",
        "runtime_instance_observation_hash",
        "runtime_measurement_hash",
        "trust_policy_hash",
        "boot_epoch_commitment",
        "fresh_nonce",
    ]
    integration = next(
        item for item in interfaces["interfaces"] if item["interface_id"] == "SECTION_7_7_INTEGRATION_GATE"
    )
    assert integration["must_reconcile"] == [
        "ALL_SECTION_7_1_THROUGH_7_6_FIELDS_AND_INTERFACES_WITHOUT_INSTANTIATING_7_8_EVIDENCE"
    ]
    assert not any("DEFERRED_" in json.dumps(node) for node in graph)


def _mutate_field(stored: dict[str, Any], field_id: str, mutation: Callable[[dict[str, Any]], None]) -> None:
    row = next(item for item in stored["field_values"] if item["field_id"] == field_id)
    mutation(row)


def test_dependency_closure_source_hash_and_stale_manifests_fail_closed() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_original = vectors["runtime_profile_hash"]["stored_object"]
    control_original = vectors["control_plane_observation_hash"]["stored_object"]
    instance_original = vectors["runtime_instance_observation_hash"]["stored_object"]

    profile = copy.deepcopy(profile_original)
    profile["provider_vocabulary_binding"]["provider_claim_registry_sha256"] = "f" * 64
    _seal(profile, nodes["runtime_profile_hash"])
    with pytest.raises(ValueError):
        _validate_profile(profile, contract, nodes)

    control = copy.deepcopy(control_original)
    control["runtime_profile_hash"] = "f" * 64
    _seal(control, nodes["control_plane_observation_hash"])
    with pytest.raises(ValueError):
        _validate_control(
            control,
            contract,
            control_contract,
            nodes,
            profile_original["runtime_profile_hash"],
        )

    instance = copy.deepcopy(instance_original)
    instance["control_plane_observation_hash"] = "f" * 64
    _seal(instance, nodes["runtime_instance_observation_hash"])
    with pytest.raises(ValueError):
        _validate_instance(
            instance,
            contract,
            nodes,
            profile_original["runtime_profile_hash"],
            control_original["control_plane_observation_hash"],
        )

    for original, node_id, validator in (
        (
            profile_original,
            "runtime_profile_hash",
            lambda item: _validate_profile(item, contract, nodes),
        ),
        (
            control_original,
            "control_plane_observation_hash",
            lambda item: _validate_control(
                item,
                contract,
                control_contract,
                nodes,
                profile_original["runtime_profile_hash"],
            ),
        ),
        (
            instance_original,
            "runtime_instance_observation_hash",
            lambda item: _validate_instance(
                item,
                contract,
                nodes,
                profile_original["runtime_profile_hash"],
                control_original["control_plane_observation_hash"],
            ),
        ),
    ):
        candidate = copy.deepcopy(original)
        candidate["unknown_authority_override"] = True
        _seal(candidate, nodes[node_id])
        with pytest.raises(ValueError):
            validator(candidate)

    control = copy.deepcopy(control_original)
    control["source_evidence_envelope_sha256"] = "not-a-sha256"
    _seal(control, nodes["control_plane_observation_hash"])
    with pytest.raises(ValueError):
        _validate_control(
            control,
            contract,
            control_contract,
            nodes,
            profile_original["runtime_profile_hash"],
        )

    wrong_envelope = copy.deepcopy(control_original)
    wrong_envelope["source_evidence_envelope_sha256"] = "0" * 64
    _seal(wrong_envelope, nodes["control_plane_observation_hash"])
    with pytest.raises(ValueError, match="source evidence envelope hash mismatch"):
        _validate_control(
            wrong_envelope,
            contract,
            control_contract,
            nodes,
            profile_original["runtime_profile_hash"],
        )

    stale_manifest = copy.deepcopy(control_original)
    disk_set = next(
        item
        for item in stale_manifest["projected_resource_sets"]
        if item["resource_root"] == "disks[]"
    )
    next(
        row
        for row in disk_set["records"][0]["fields"]
        if row["path"] == "disks[].autoDelete"
    )["value"] = False
    _refresh_source_evidence_envelope(stale_manifest, contract)
    _seal(stale_manifest, nodes["control_plane_observation_hash"])
    with pytest.raises(ValueError, match="profile manifest hash mismatch"):
        _validate_control(
            stale_manifest,
            contract,
            control_contract,
            nodes,
            profile_original["runtime_profile_hash"],
        )

    resource_extra = copy.deepcopy(control_original)
    resource_extra["projected_resource_sets"][0]["extra"] = True
    _seal(resource_extra, nodes["control_plane_observation_hash"])
    with pytest.raises(ValueError):
        _validate_control(
            resource_extra,
            contract,
            control_contract,
            nodes,
            profile_original["runtime_profile_hash"],
        )


def test_profile_semantic_mutations_reject_even_after_coordinated_rehash() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    original = vectors["runtime_profile_hash"]["stored_object"]

    mutations: list[Callable[[dict[str, Any]], None]] = [
        lambda obj: obj.update(authority_effect="AUTHORIZED"),
        lambda obj: _mutate_field(obj, "provider", lambda row: row.update(value="NOT_GCP")),
        lambda obj: _mutate_field(obj, "provider", lambda row: (row.pop("value"), row.update(presence="EXPLICITLY_ABSENT"))),
        lambda obj: _mutate_field(obj, "openblas_thread_count", lambda row: row.update(value=True)),
        lambda obj: _mutate_field(obj, "openblas_thread_count", lambda row: row.update(value=2)),
        lambda obj: _mutate_field(obj, "floating_point_rounding_mode", lambda row: row.update(value="ARBITRARY")),
        lambda obj: _mutate_field(obj, "kernel_release", lambda row: row.update(value="human.user@example.com")),
        lambda obj: _mutate_field(obj, "kernel_release", lambda row: row.update(value="user-alice-smith")),
        lambda obj: _mutate_field(obj, "kernel_release", lambda row: row.update(value="127.0.0.1")),
        lambda obj: _mutate_field(obj, "locale", lambda row: row.update(value="127.1")),
        lambda obj: _mutate_field(obj, "python_version", lambda row: row.update(value="127.0.0.1 ")),
        lambda obj: _mutate_field(obj, "python_version", lambda row: row.update(value="2001:db8::1")),
        lambda obj: _mutate_field(obj, "compute_cpu_platform_raw", lambda row: row.update(value="projects/customer-123/instances/vm-1")),
        lambda obj: _mutate_field(obj, "python_version", lambda row: row.update(value='{"payload":"arbitrary"}')),
        lambda obj: _mutate_field(obj, "approved_zone_set", lambda row: row.update(value=list(reversed(row["value"])))),
        lambda obj: _mutate_field(obj, "approved_zone_set", lambda row: row.update(value=[row["value"][0], row["value"][0]])),
        lambda obj: _mutate_field(obj, "cpu_model", lambda row: row.update(presence="PRESENT", value="self-asserted")),
        lambda obj: _mutate_field(obj, "provider", lambda row: row.update(extra="unknown")),
        lambda obj: obj["field_values"].pop(0),
    ]
    for mutate in mutations:
        candidate = copy.deepcopy(original)
        mutate(candidate)
        _seal(candidate, nodes["runtime_profile_hash"])
        with pytest.raises(ValueError):
            _validate_profile(candidate, contract, nodes)

    stale = copy.deepcopy(original)
    _mutate_field(stale, "openblas_core_type", lambda row: row.update(value="OTHER"))
    with pytest.raises(ValueError, match="stale self hash"):
        _validate_profile(stale, contract, nodes)


def _recompute_control_manifests(
    control: dict[str, Any], control_contract: dict[str, Any]
) -> None:
    for binding in control_contract["control_profile_crosswalk"]["manifest_bindings"]:
        material = _profile_manifest_material(
            binding,
            control["projected_fields"],
            control["projected_resource_sets"],
        )
        control["profile_manifest_hashes"][binding["manifest_id"]] = _sha256_bytes(
            binding["domain_separator"].encode("ascii")
            + b"\x00"
            + _canonical(material)
        )
    _refresh_source_evidence_envelope(control, _json(CONTRACT))


def test_control_semantic_mutations_reject_parent_secret_and_raw_smuggling() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_hash = vectors["runtime_profile_hash"]["expected_hash"]
    original = vectors["control_plane_observation_hash"]["stored_object"]

    def validate(candidate: dict[str, Any]) -> None:
        _validate_control(candidate, contract, control_contract, nodes, profile_hash)

    mutations: list[Callable[[dict[str, Any]], None]] = [
        lambda obj: obj.update(projected_fields=[]),
        lambda obj: obj["projected_fields"].reverse(),
        lambda obj: obj["projected_fields"].pop(0),
        lambda obj: obj["projected_fields"].append(copy.deepcopy(obj["projected_fields"][0])),
        lambda obj: obj["projected_fields"][0].update(extra="unknown"),
        lambda obj: obj["projected_fields"][0].update(path="disks[]", presence="PRESENT", value={"diskEncryptionKey": {"rawKey": "SECRET"}}),
        lambda obj: obj["projected_fields"][0].update(path="disks[].diskEncryptionKey.rawKey", presence="PRESENT", value="SECRET"),
        lambda obj: obj["projected_fields"][0].update(path="metadata.items[].value", presence="PRESENT", value=["ssh-secret"]),
        lambda obj: obj["projected_fields"][0].update(path="resourceStatus.physicalHost", presence="PRESENT", value="human.user@example.com"),
        lambda obj: obj["projected_fields"][0].update(path="resourceStatus.physicalHostTopology.host", presence="PRESENT", value="human.user@example.com"),
        lambda obj: obj["projected_fields"][0].update(path="resourceStatus.physicalHostTopology.cluster", presence="PRESENT", value="human.user@example.com"),
        lambda obj: obj["projected_fields"][0].update(path="resourceStatus.effectiveInstanceMetadata.vmDnsSettingMetadataValue", presence="PRESENT", value="human.user@example.com"),
        lambda obj: next(row for row in obj["projected_fields"] if row["path"] == "tags.items[]").update(presence="PRESENT", value=[{"secret": "nested"}]),
        lambda obj: next(row for row in obj["projected_fields"] if row["path"] == "reservationAffinity.consumeReservationType").update(presence="PRESENT", value="SPECIFIC_RESERVATION"),
        lambda obj: next(row for row in obj["projected_fields"] if row["path"] == "scheduling.automaticRestart").update(value=1),
        lambda obj: obj["derived_posture"].update(metadata_allowlist_match=False),
        lambda obj: obj["derived_posture"].update(raw_metadata_retained=True),
        lambda obj: obj["derived_posture"].update(extra=True),
    ]
    for mutate in mutations:
        candidate = copy.deepcopy(original)
        mutate(candidate)
        with pytest.raises(ValueError):
            _seal(candidate, nodes["control_plane_observation_hash"])
            validate(candidate)

    stale = copy.deepcopy(original)
    stale["observation_point"] = "2026-07-24T00:03:00Z"
    with pytest.raises(ValueError, match="source evidence envelope hash mismatch"):
        validate(stale)


def test_identity_keyed_resource_sets_reject_cardinality_association_and_nested_smuggling() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_hash = vectors["runtime_profile_hash"]["expected_hash"]
    original = vectors["control_plane_observation_hash"]["stored_object"]

    def resource(candidate: dict[str, Any], root: str) -> dict[str, Any]:
        return next(
            item
            for item in candidate["projected_resource_sets"]
            if item["resource_root"] == root
        )

    mutations: list[Callable[[dict[str, Any]], None]] = [
        lambda obj: resource(obj, "disks[]")["records"].append(
            copy.deepcopy(resource(obj, "disks[]")["records"][0])
        ),
        lambda obj: resource(obj, "disks[]")["records"][0].update(
            resource_id="index=999"
        ),
        lambda obj: resource(obj, "disks[]")["records"][0]["fields"].pop(0),
        lambda obj: next(
            row
            for row in resource(obj, "disks[]")["records"][0]["fields"]
            if row["path"] == "disks[].boot"
        ).update(value={"secret": True}),
        lambda obj: next(
            row
            for row in resource(obj, "disks[]")["records"][0]["fields"]
            if row["path"] == "disks[].guestOsFeatures[].type"
        ).update(value=[{"secret": "nested"}]),
        lambda obj: next(
            row
            for row in resource(obj, "disks[]")["records"][0]["fields"]
            if row["path"] == "disks[].deviceName"
        ).update(value="alice-smith"),
        lambda obj: next(
            row
            for row in resource(obj, "disks[]")["records"][0]["fields"]
            if row["path"] == "disks[].source"
        ).update(value="not-a-uri"),
        lambda obj: next(
            row
            for row in resource(obj, "disks[]")["records"][0]["fields"]
            if row["path"] == "disks[].source"
        ).update(value="https://-bad..host-/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a/disks/boot-disk"),
        lambda obj: next(
            row
            for row in resource(obj, "disks[]")["records"][0]["fields"]
            if row["path"] == "disks[].source"
        ).update(value="https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/global/networks/not-a-disk"),
        lambda obj: next(
            row
            for row in resource(obj, "disks[]")["records"][0]["fields"]
            if row["path"] == "disks[].initializeParams.diskType"
        ).update(presence="PRESENT", value="https://evil.example/not-a-gcp-disk-type"),
        lambda obj: (
            resource(obj, "networkInterfaces[]")["records"][0].update(
                resource_id="name=alice-smith"
            ),
            next(
                row
                for row in resource(obj, "networkInterfaces[]")["records"][0]["fields"]
                if row["path"] == "networkInterfaces[].name"
            ).update(value="alice-smith"),
        ),
        lambda obj: resource(obj, "guestAccelerators[]")["records"].append(
            {
                "resource_id": "acceleratorType=example",
                "fields": [
                    {"path": path, "presence": "EXPLICITLY_ABSENT"}
                    for path in next(
                        spec["field_paths"]
                        for spec in control_contract["resource_root_specs"]
                        if spec["resource_root"] == "guestAccelerators[]"
                    )
                ],
            }
        ),
    ]
    for mutate in mutations:
        candidate = copy.deepcopy(original)
        mutate(candidate)
        _recompute_control_manifests(candidate, control_contract)
        _seal(candidate, nodes["control_plane_observation_hash"])
        with pytest.raises(ValueError):
            _validate_control(
                candidate,
                contract,
                control_contract,
                nodes,
                profile_hash,
            )


def test_instance_semantic_mutations_reject_alias_hidden_human_and_unknown_fields() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_hash = vectors["runtime_profile_hash"]["expected_hash"]
    control_hash = vectors["control_plane_observation_hash"]["expected_hash"]
    original = vectors["runtime_instance_observation_hash"]["stored_object"]

    mutations: list[Callable[[dict[str, Any]], None]] = [
        lambda obj: obj.update(authority_effect="AUTHORIZED"),
        lambda obj: _mutate_field(obj, "token_hwmodel", lambda row: row.update(value="INTEL_TDX")),
        lambda obj: _mutate_field(obj, "cel_hwmodel", lambda row: row.update(value="GCP_INTEL_TDX")),
        lambda obj: _mutate_field(obj, "compute_confidential_instance_type", lambda row: row.update(value="INTEL_TDX")),
        lambda obj: _mutate_field(obj, "instance_id", lambda row: row.update(value=1)),
        lambda obj: _mutate_field(obj, "project_id", lambda row: row.update(value=".")),
        lambda obj: _mutate_field(obj, "project_id", lambda row: row.update(value="..")),
        lambda obj: _mutate_field(obj, "project_id", lambda row: row.update(value="ft%2Fqualification-example")),
        lambda obj: _mutate_field(obj, "project_id", lambda row: row.update(value="ft-éxample")),
        lambda obj: _mutate_field(obj, "project_id", lambda row: row.update(value="ft-qualification-id-00000001;matrix=1")),
        lambda obj: _mutate_field(obj, "project_id", lambda row: row.update(value="ft-qualification-james-kelley")),
        lambda obj: _mutate_field(obj, "instance_name", lambda row: row.update(value="ft-qualification-james-kelley")),
        lambda obj: _mutate_field(obj, "physical_host_identity", lambda row: row.update(presence="PRESENT", value="human.user@example.com")),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="us-docker.pkg.dev/ft/example/model:latest")),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="us-docker.pkg.dev/ft/../ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="us-docker.pkg.dev/ft//ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="bad..host/ft/ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="user-alice-smith.example/ft-qualification-id-00000001/ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example:70000/ft/ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example:0/ft/ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example:080/ft/ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example:٨٠/ft/ft-runtime/image-00000001@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value=(".".join(["a" * 63, "b" * 63, "c" * 63, "d" * 62]) + "/ft/ft-runtime/image-00000001@sha256:" + "a" * 64))),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example/foo..bar/image@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example/repo@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example/ft/" + "a" * 129 + "@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "container_image_reference", lambda row: row.update(value="registry.example/" + "/".join(["a"] * 33) + "@sha256:" + "a" * 64)),
        lambda obj: _mutate_field(obj, "support_attributes", lambda row: row.update(value=["LATEST", "USABLE"])),
        lambda obj: _mutate_field(obj, "support_attributes", lambda row: row.update(value=["STABLE", "employee-james-kelley"])),
        lambda obj: _mutate_field(obj, "support_attributes", lambda row: row.update(value=["STABLE", "UNKNOWN"])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=["employee-james-kelley"])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=["invalid version!"])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=[])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=["127.0.0.1"])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=["0177.0.0.1"])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=["2130706433"])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=["0x7f000001"])),
        lambda obj: _mutate_field(obj, "token_swversion", lambda row: row.update(value=[f"v{index:02d}" for index in range(17)])),
        lambda obj: _mutate_field(obj, "tdx_tcb_date", lambda row: row.update(value="2026-07-24T00:00:00+00:00")),
        lambda obj: _mutate_field(obj, "observed_cpu_model", lambda row: row.update(presence="PRESENT", value="self-asserted")),
        lambda obj: _mutate_field(obj, "instance_id", lambda row: row.update(extra="unknown")),
        lambda obj: obj["field_values"].pop(0),
    ]
    for mutate in mutations:
        candidate = copy.deepcopy(original)
        mutate(candidate)
        _seal(candidate, nodes["runtime_instance_observation_hash"])
        with pytest.raises(ValueError):
            _validate_instance(candidate, contract, nodes, profile_hash, control_hash)


def test_provider_documented_support_superset_and_swversion_example_are_accepted() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    instance = copy.deepcopy(
        vectors["runtime_instance_observation_hash"]["stored_object"]
    )
    _mutate_field(
        instance,
        "support_attributes",
        lambda row: row.update(value=["LATEST", "STABLE", "USABLE"]),
    )
    _mutate_field(
        instance,
        "token_swversion",
        lambda row: row.update(value=["230103"]),
    )
    _seal(instance, nodes["runtime_instance_observation_hash"])
    _validate_instance(
        instance,
        contract,
        nodes,
        vectors["runtime_profile_hash"]["expected_hash"],
        vectors["control_plane_observation_hash"]["expected_hash"],
    )


def test_resource_identity_changes_instance_not_stable_profile() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile = vectors["runtime_profile_hash"]["stored_object"]
    control = copy.deepcopy(
        vectors["control_plane_observation_hash"]["stored_object"]
    )
    instance = copy.deepcopy(
        vectors["runtime_instance_observation_hash"]["stored_object"]
    )
    disk_set = next(
        item
        for item in control["projected_resource_sets"]
        if item["resource_root"] == "disks[]"
    )
    disk_record = disk_set["records"][0]
    disk_record["resource_id"] = "deviceName=ft-qualification-id-00000002"
    next(
        row
        for row in disk_record["fields"]
        if row["path"] == "disks[].deviceName"
    )["value"] = "ft-qualification-id-00000002"
    next(
        row
        for row in disk_record["fields"]
        if row["path"] == "disks[].source"
    )["value"] = (
        "https://www.googleapis.com/compute/v1/projects/"
        "ft-qualification-id-00000001/zones/us-central1-a/disks/"
        "ft-qualification-id-00000002"
    )
    _refresh_source_evidence_envelope(control, contract)
    _seal(control, nodes["control_plane_observation_hash"])
    instance["control_plane_observation_hash"] = control[
        "control_plane_observation_hash"
    ]
    _seal(instance, nodes["runtime_instance_observation_hash"])
    profile_rows = _validate_profile(profile, contract, nodes)
    control_values = _validate_control(
        control,
        contract,
        control_contract,
        nodes,
        profile["runtime_profile_hash"],
    )
    instance_rows = _validate_instance(
        instance,
        contract,
        nodes,
        profile["runtime_profile_hash"],
        control["control_plane_observation_hash"],
    )
    _validate_cross(
        profile_rows,
        control_values,
        instance_rows,
        control["observation_point"],
        control_contract,
    )
    assert profile["runtime_profile_hash"] == vectors["runtime_profile_hash"][
        "expected_hash"
    ]
    assert instance["runtime_instance_observation_hash"] != vectors[
        "runtime_instance_observation_hash"
    ]["expected_hash"]

    nic_control = copy.deepcopy(
        vectors["control_plane_observation_hash"]["stored_object"]
    )
    nic_instance = copy.deepcopy(
        vectors["runtime_instance_observation_hash"]["stored_object"]
    )
    nic_set = next(
        item
        for item in nic_control["projected_resource_sets"]
        if item["resource_root"] == "networkInterfaces[]"
    )
    nic_record = nic_set["records"][0]
    nic_record["resource_id"] = "name=ft-qualification-id-00000002"
    next(
        row
        for row in nic_record["fields"]
        if row["path"] == "networkInterfaces[].name"
    )["value"] = "ft-qualification-id-00000002"
    _refresh_source_evidence_envelope(nic_control, contract)
    _seal(nic_control, nodes["control_plane_observation_hash"])
    nic_instance["control_plane_observation_hash"] = nic_control[
        "control_plane_observation_hash"
    ]
    _seal(nic_instance, nodes["runtime_instance_observation_hash"])
    nic_values = _validate_control(
        nic_control,
        contract,
        control_contract,
        nodes,
        profile["runtime_profile_hash"],
    )
    nic_rows = _validate_instance(
        nic_instance,
        contract,
        nodes,
        profile["runtime_profile_hash"],
        nic_control["control_plane_observation_hash"],
    )
    _validate_cross(
        profile_rows,
        nic_values,
        nic_rows,
        nic_control["observation_point"],
        control_contract,
    )
    assert profile["runtime_profile_hash"] == vectors["runtime_profile_hash"][
        "expected_hash"
    ]
    assert nic_instance["runtime_instance_observation_hash"] != vectors[
        "runtime_instance_observation_hash"
    ]["expected_hash"]

    projection = _json(CONTROL)
    by_path = {field["path"]: field for field in projection["fields"]}
    for path in (
        "fingerprint",
        "labelFingerprint",
        "metadata.fingerprint",
        "networkInterfaces[].fingerprint",
        "tags.fingerprint",
    ):
        assert by_path[path]["runtime_disposition"] == (
            "TRANSIENT_OBSERVATION_NO_RETENTION"
        )
        assert path not in projection["hash_preimage_paths"]


def test_valid_control_values_cannot_contradict_bound_profile_after_coordinated_rehash() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_object = vectors["runtime_profile_hash"]["stored_object"]
    original_control = vectors["control_plane_observation_hash"]["stored_object"]
    original_instance = vectors["runtime_instance_observation_hash"]["stored_object"]
    profile_rows = _validate_profile(profile_object, contract, nodes)

    def scalar(control: dict[str, Any], path: str) -> dict[str, Any]:
        return next(row for row in control["projected_fields"] if row["path"] == path)

    def resource_field(control: dict[str, Any], root: str, path: str) -> dict[str, Any]:
        resource_set = next(
            item for item in control["projected_resource_sets"] if item["resource_root"] == root
        )
        return next(
            row for row in resource_set["records"][0]["fields"] if row["path"] == path
        )

    mutations: list[Callable[[dict[str, Any]], None]] = [
        lambda obj: scalar(obj, "scheduling.automaticRestart").update(value=True),
        lambda obj: scalar(obj, "scheduling.onHostMaintenance").update(value="MIGRATE"),
        lambda obj: scalar(obj, "shieldedInstanceConfig.enableSecureBoot").update(value=False),
        lambda obj: scalar(obj, "status").update(value="STOPPED"),
        lambda obj: scalar(obj, "cpuPlatform").update(value="AMD Milan"),
        lambda obj: scalar(obj, "canIpForward").update(presence="PRESENT", value=True),
        lambda obj: resource_field(obj, "disks[]", "disks[].autoDelete").update(value=False),
    ]
    for mutate in mutations:
        control = copy.deepcopy(original_control)
        instance = copy.deepcopy(original_instance)
        mutate(control)
        _recompute_control_manifests(control, control_contract)
        _seal(control, nodes["control_plane_observation_hash"])
        instance["control_plane_observation_hash"] = control["control_plane_observation_hash"]
        if scalar(control, "cpuPlatform").get("value") != "Intel Sapphire Rapids":
            _mutate_field(
                instance,
                "compute_cpu_platform_raw",
                lambda row: row.update(value=scalar(control, "cpuPlatform")["value"]),
            )
        _seal(instance, nodes["runtime_instance_observation_hash"])
        control_values = _validate_control(
            control,
            contract,
            control_contract,
            nodes,
            profile_object["runtime_profile_hash"],
        )
        instance_rows = _validate_instance(
            instance,
            contract,
            nodes,
            profile_object["runtime_profile_hash"],
            control["control_plane_observation_hash"],
        )
        with pytest.raises(ValueError):
            _validate_cross(
                profile_rows,
                control_values,
                instance_rows,
                control["observation_point"],
                control_contract,
            )

    for path in ("scheduling.automaticRestart", "status"):
        control = copy.deepcopy(original_control)
        row = scalar(control, path)
        row.pop("value")
        row["presence"] = "EXPLICITLY_ABSENT"
        _seal(control, nodes["control_plane_observation_hash"])
        with pytest.raises(ValueError, match="required control scalar path is absent"):
            _validate_control(
                control,
                contract,
                control_contract,
                nodes,
                profile_object["runtime_profile_hash"],
            )


def test_lifecycle_inclusive_boundaries_are_valid() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_object = vectors["runtime_profile_hash"]["stored_object"]
    profile_rows = _validate_profile(profile_object, contract, nodes)

    for path, value, instance_field in (
        ("creationTimestamp", "2026-07-24T00:01:00Z", "creation_timestamp"),
        ("lastStartTimestamp", "2026-07-24T00:02:00Z", "last_start_timestamp"),
    ):
        control = copy.deepcopy(
            vectors["control_plane_observation_hash"]["stored_object"]
        )
        instance = copy.deepcopy(
            vectors["runtime_instance_observation_hash"]["stored_object"]
        )
        next(
            row for row in control["projected_fields"] if row["path"] == path
        )["value"] = value
        _refresh_source_evidence_envelope(control, contract)
        _seal(control, nodes["control_plane_observation_hash"])
        instance["control_plane_observation_hash"] = control[
            "control_plane_observation_hash"
        ]
        _mutate_field(
            instance,
            instance_field,
            lambda row, timestamp=value: row.update(value=timestamp),
        )
        _seal(instance, nodes["runtime_instance_observation_hash"])
        control_values = _validate_control(
            control,
            contract,
            control_contract,
            nodes,
            profile_object["runtime_profile_hash"],
        )
        instance_rows = _validate_instance(
            instance,
            contract,
            nodes,
            profile_object["runtime_profile_hash"],
            control["control_plane_observation_hash"],
        )
        _validate_cross(
            profile_rows,
            control_values,
            instance_rows,
            control["observation_point"],
            control_contract,
        )


def test_crosswalk_type_identity_rejects_boolean_integer_aliases() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_object = vectors["runtime_profile_hash"]["stored_object"]
    control_object = vectors["control_plane_observation_hash"]["stored_object"]
    instance_object = vectors["runtime_instance_observation_hash"]["stored_object"]
    profile_rows = _validate_profile(profile_object, contract, nodes)
    control_values = _validate_control(
        control_object,
        contract,
        control_contract,
        nodes,
        profile_object["runtime_profile_hash"],
    )
    instance_rows = _validate_instance(
        instance_object,
        contract,
        nodes,
        profile_object["runtime_profile_hash"],
        control_object["control_plane_observation_hash"],
    )
    for section, profile_field in (
        ("resource_cardinality_bindings", "initial_public_ingress"),
        ("derived_posture_bindings", "guest_accelerator_count"),
    ):
        mutated = copy.deepcopy(control_contract)
        mutated["control_profile_crosswalk"][section][0][
            "profile_field_id"
        ] = profile_field
        with pytest.raises(ValueError):
            _validate_cross(
                profile_rows,
                control_values,
                instance_rows,
                control_object["observation_point"],
                mutated,
            )
    direct_alias = copy.deepcopy(control_contract)
    automatic_restart = next(
        binding
        for binding in direct_alias["control_profile_crosswalk"]["direct_bindings"]
        if binding["path"] == "scheduling.automaticRestart"
    )
    automatic_restart["profile_field_id"] = "guest_accelerator_count"
    with pytest.raises(ValueError):
        _validate_cross(
            profile_rows,
            control_values,
            instance_rows,
            control_object["observation_point"],
            direct_alias,
        )


def test_cross_object_splicing_rejects_after_all_child_hashes_are_recomputed() -> None:
    _, vectors = _vectors()
    contract = _json(CONTRACT)
    control_contract = _json(CONTROL)
    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    profile_object = copy.deepcopy(vectors["runtime_profile_hash"]["stored_object"])
    original_control = vectors["control_plane_observation_hash"]["stored_object"]
    original_instance = vectors["runtime_instance_observation_hash"]["stored_object"]
    profile_rows = _validate_profile(profile_object, contract, nodes)

    def coordinated(
        change_control: Callable[[dict[str, Any]], None] | None = None,
        change_instance: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        control = copy.deepcopy(original_control)
        instance = copy.deepcopy(original_instance)
        if change_control:
            change_control(control)
        _seal(control, nodes["control_plane_observation_hash"])
        instance["control_plane_observation_hash"] = control["control_plane_observation_hash"]
        if change_instance:
            change_instance(instance)
        _seal(instance, nodes["runtime_instance_observation_hash"])
        with pytest.raises(ValueError):
            control_values = _validate_control(
                control,
                contract,
                control_contract,
                nodes,
                profile_object["runtime_profile_hash"],
            )
            instance_rows = _validate_instance(
                instance,
                contract,
                nodes,
                profile_object["runtime_profile_hash"],
                control["control_plane_observation_hash"],
            )
            _validate_cross(
                profile_rows,
                control_values,
                instance_rows,
                control["observation_point"],
                control_contract,
            )

    def splice_project(control: dict[str, Any]) -> None:
        for row in control["projected_fields"]:
            if row["path"] in {"selfLink", "zone", "machineType"}:
                row["value"] = row["value"].replace(
                    "/projects/ft-qualification-id-00000001/", "/projects/spliced-project/"
                )

    def replace_scalar(control: dict[str, Any], path: str, value: str) -> None:
        next(row for row in control["projected_fields"] if row["path"] == path).update(
            value=value
        )

    coordinated(change_control=splice_project)
    coordinated(
        change_control=lambda obj: replace_scalar(
            obj,
            "zone",
            "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-b",
        )
    )
    coordinated(
        change_control=lambda obj: replace_scalar(
            obj,
            "zone",
            "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/global",
        )
    )
    for bad_zone in (
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a?alt=1",
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a#alt",
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a?",
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a#",
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a;",
        "HTTPS://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a",
        "https://www.googleapis.com/compute//v1/projects/ft-qualification-id-00000001/zones/us-central1-a",
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a/",
    ):
        coordinated(
            change_control=lambda obj, value=bad_zone: replace_scalar(
                obj, "zone", value
            )
        )
    coordinated(
        change_control=lambda obj: replace_scalar(
            obj,
            "selfLink",
            "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/instances/ft-qualification-id-00000001",
        ),
        change_instance=lambda obj: _mutate_field(
            obj,
            "compute_self_link",
            lambda row: row.update(
                value="https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/instances/ft-qualification-id-00000001"
            ),
        ),
    )
    for bad_self_link in (
        "https://www.googleapis.com/compute//v1/projects/ft-qualification-id-00000001/zones/us-central1-a/instances/ft-qualification-id-00000001",
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a/instances/ft-qualification-id-00000001#junk/instances/ft-qualification-id-00000001",
    ):
        coordinated(
            change_control=lambda obj, value=bad_self_link: replace_scalar(
                obj, "selfLink", value
            ),
            change_instance=lambda obj, value=bad_self_link: _mutate_field(
                obj,
                "compute_self_link",
                lambda row: row.update(value=value),
            ),
        )
    coordinated(
        change_control=lambda obj: replace_scalar(
            obj,
            "machineType",
            "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/machineTypes/c3-standard-4",
        ),
        change_instance=lambda obj: _mutate_field(
            obj,
            "compute_machine_type_uri",
            lambda row: row.update(
                value="https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/machineTypes/c3-standard-4"
            ),
        ),
    )
    for bad_machine_type in (
        "https://www.googleapis.com/compute//v1/projects/ft-qualification-id-00000001/zones/us-central1-a/machineTypes/c3-standard-4",
        "https://www.googleapis.com/compute/v1/projects/ft-qualification-id-00000001/zones/us-central1-a/machineTypes/c3-standard-4#junk/c3-standard-4",
    ):
        coordinated(
            change_control=lambda obj, value=bad_machine_type: replace_scalar(
                obj, "machineType", value
            ),
            change_instance=lambda obj, value=bad_machine_type: _mutate_field(
                obj,
                "compute_machine_type_uri",
                lambda row: row.update(value=value),
            ),
        )
    coordinated(
        change_control=lambda obj: replace_scalar(
            obj, "creationTimestamp", "2026-07-25T00:00:00Z"
        ),
        change_instance=lambda obj: _mutate_field(
            obj,
            "creation_timestamp",
            lambda row: row.update(value="2026-07-25T00:00:00Z"),
        ),
    )
    coordinated(
        change_control=lambda obj: replace_scalar(
            obj, "lastStartTimestamp", "2026-07-24T00:03:00Z"
        ),
        change_instance=lambda obj: _mutate_field(
            obj,
            "last_start_timestamp",
            lambda row: row.update(value="2026-07-24T00:03:00Z"),
        ),
    )
    coordinated(
        change_control=lambda obj: next(
            row
            for row in obj["projected_fields"]
            if row["path"] == "lastStopTimestamp"
        ).update(presence="PRESENT", value="2026-07-24T00:01:30Z")
    )
    coordinated(
        change_control=lambda obj: next(
            row
            for row in obj["projected_fields"]
            if row["path"] == "lastSuspendedTimestamp"
        ).update(presence="PRESENT", value="2026-07-24T00:01:00Z")
    )
    for path in ("lastStopTimestamp", "lastSuspendedTimestamp"):
        coordinated(
            change_control=lambda obj, timestamp_path=path: next(
                row
                for row in obj["projected_fields"]
                if row["path"] == timestamp_path
            ).update(presence="PRESENT", value="2025-01-01T00:00:00Z")
        )
    coordinated(
        change_instance=lambda obj: _mutate_field(
            obj, "instance_id", lambda row: row.update(value="0000000000000000002")
        )
    )
    coordinated(
        change_instance=lambda obj: _mutate_field(
            obj, "last_start_timestamp", lambda row: row.update(value="2026-07-24T00:02:30Z")
        )
    )
    coordinated(
        change_instance=lambda obj: _mutate_field(
            obj,
            "container_image_digest",
            lambda row: row.update(value="sha256:" + "f" * 64),
        )
    )
    coordinated(
        change_instance=lambda obj: _mutate_field(
            obj,
            "container_image_reference",
            lambda row: row.update(
                value="us-docker.pkg.dev/ft-qualification-id-00000001/ft-runtime/image-00000001@sha256:"
                + "f" * 64
            ),
        )
    )


def test_decision_escalation_and_requalification_are_total_fail_closed() -> None:
    contract = _json(CONTRACT)
    algorithm = contract["decision_algorithm"]
    assert algorithm["precedence"] == [
        "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE",
        "REJECT_C3_TDX_FOR_PROVIDER_CONFLICT",
        "REJECT_C3_TDX_AND_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION",
        "HOLD_FOR_PROVIDER_CLAIM_REVALIDATION",
        "HOLD_FOR_PARENT_RUNTIME_IDENTITY_TREATMENT",
        "GCP_RUNTIME_OBJECT_HASH_CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD",
    ]
    assert algorithm["recorded_decision"] == _derive_decision()
    assert _derive_decision(boundary=True) == algorithm["precedence"][0]
    assert _derive_decision(provider_result="CURRENT_SOURCE_CONFLICT") == algorithm["precedence"][1]
    assert _derive_decision(unbindable=True) == algorithm["precedence"][2]
    for result in ("SOURCE_OR_PROVENANCE_UNAVAILABLE", "FROZEN_MAPPING_CHANGED"):
        assert _derive_decision(provider_result=result) == algorithm["precedence"][3]
    assert _derive_decision(treatment_predeclared=False) == algorithm["precedence"][4]
    assert algorithm["fixed_physical_escalation_result"] == algorithm["precedence"][2]
    assert algorithm["fixed_physical_escalation_predicates"] == [
        "SECTION_7_7_REJECTS_VIRTUAL_PROFILE_EFFECTIVE_STATE_AND_EXACT_EQUIVALENCE_V1",
        "ANY_REQUIRED_RUNTIME_IDENTITY_FIELD_IS_UNBINDABLE_OR_PARENT_TREATMENT_CANNOT_DETECT_ITS_DRIFT_BEFORE_MODEL_IMPORT",
        "ANY_QUALIFICATION_OR_REQUALIFICATION_MATH_RELEVANT_PROFILE_OR_SEMANTIC_BYTES_DIFFER",
    ]

    escalation_schema = contract["runtime_escalation_input_schema"]
    escalation_algorithm = contract["runtime_escalation_algorithm"]
    expected_required_identity_fields = [
        f"PROFILE:{field['field_id']}"
        for field in contract["field_registry"]["profile_fields"]
        if field["runtime_identity_relevant"]
    ] + [
        f"INSTANCE:{field['field_id']}"
        for field in contract["field_registry"]["instance_fields"]
        if field["runtime_identity_relevant"]
    ]
    expected_optional_identity_fields = [
        f"INSTANCE:{field['field_id']}"
        for field in contract["field_registry"]["instance_fields"]
        if not field["runtime_identity_relevant"]
    ]
    assert escalation_schema["required_identity_field_ids"] == (
        expected_required_identity_fields
    )
    assert Counter(escalation_schema["required_identity_field_ids"]) == Counter(
        {field_id: 1 for field_id in expected_required_identity_fields}
    )
    assert escalation_schema["optional_nonpromoting_field_ids"] == (
        expected_optional_identity_fields
    ) == ["INSTANCE:physical_host_identity"]
    base_input = {
        "schema_version": escalation_schema["schema_version"],
        "boundary_leakage": False,
        "provider_revalidation_result": "EXACT_MAPPING_RECONFIRMED",
        "parent_treatment_decision": "NOT_REVIEWED",
        "field_binding_results": [
            {"field_id": field_id, "status": "PENDING"}
            for field_id in escalation_schema["required_identity_field_ids"]
        ],
        "qualification_exactness": "NOT_RUN",
    }
    assert _derive_runtime_escalation(base_input, contract) == (
        "RUNTIME_AUTHORITY_HELD_NO_ESCALATION_EVIDENCE"
    )
    provider_outcomes = {
        "BOUNDARY_LEAKAGE_DETECTED": "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE",
        "CURRENT_SOURCE_CONFLICT": "REJECT_C3_TDX_FOR_PROVIDER_CONFLICT",
        "SOURCE_OR_PROVENANCE_UNAVAILABLE": "HOLD_FOR_PROVIDER_CLAIM_REVALIDATION",
        "FROZEN_MAPPING_CHANGED": "HOLD_FOR_PROVIDER_CLAIM_REVALIDATION",
        "EXACT_MAPPING_RECONFIRMED": "RUNTIME_AUTHORITY_HELD_NO_ESCALATION_EVIDENCE",
    }
    for provider_result, expected in provider_outcomes.items():
        candidate = copy.deepcopy(base_input)
        candidate["provider_revalidation_result"] = provider_result
        assert _derive_runtime_escalation(candidate, contract) == expected
    precedence = copy.deepcopy(base_input)
    precedence["boundary_leakage"] = True
    precedence["provider_revalidation_result"] = "CURRENT_SOURCE_CONFLICT"
    precedence["field_binding_results"][0]["status"] = "UNBINDABLE"
    assert _derive_runtime_escalation(precedence, contract) == (
        "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
    )
    precedence["boundary_leakage"] = False
    assert _derive_runtime_escalation(precedence, contract) == (
        "REJECT_C3_TDX_FOR_PROVIDER_CONFLICT"
    )
    precedence["provider_revalidation_result"] = "SOURCE_OR_PROVENANCE_UNAVAILABLE"
    assert _derive_runtime_escalation(precedence, contract) == (
        "REJECT_C3_TDX_AND_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION"
    )
    parent_reject = copy.deepcopy(base_input)
    parent_reject["parent_treatment_decision"] = "REJECTED"
    assert _derive_runtime_escalation(parent_reject, contract) == (
        "REJECT_C3_TDX_AND_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION"
    )
    mismatch = copy.deepcopy(base_input)
    mismatch["qualification_exactness"] = "MISMATCH"
    assert _derive_runtime_escalation(mismatch, contract) == (
        "REJECT_C3_TDX_AND_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION"
    )
    for index in range(len(base_input["field_binding_results"])):
        unbindable = copy.deepcopy(base_input)
        unbindable["field_binding_results"][index]["status"] = "UNBINDABLE"
        assert _derive_runtime_escalation(unbindable, contract) == (
            "REJECT_C3_TDX_AND_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION"
        )
    for malformed_input in (None, 7, "not-an-object", []):
        assert _derive_runtime_escalation(malformed_input, contract) == (
            "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
        )
    wrong_schema = copy.deepcopy(base_input)
    wrong_schema["schema_version"] = "UNKNOWN_ESCALATION_SCHEMA"
    assert _derive_runtime_escalation(wrong_schema, contract) == (
        "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
    )
    for non_boolean in (0, 1, "false", None):
        wrong_boundary = copy.deepcopy(base_input)
        wrong_boundary["boundary_leakage"] = non_boolean
        assert _derive_runtime_escalation(wrong_boundary, contract) == (
            "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
        )
    duplicate = copy.deepcopy(base_input)
    duplicate["field_binding_results"][1]["field_id"] = duplicate[
        "field_binding_results"
    ][0]["field_id"]
    assert _derive_runtime_escalation(duplicate, contract) == (
        "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
    )
    reordered = copy.deepcopy(base_input)
    reordered["field_binding_results"][0], reordered["field_binding_results"][1] = (
        reordered["field_binding_results"][1],
        reordered["field_binding_results"][0],
    )
    assert _derive_runtime_escalation(reordered, contract) == (
        "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
    )
    malformed = copy.deepcopy(base_input)
    malformed["field_binding_results"].pop()
    assert _derive_runtime_escalation(malformed, contract) == (
        "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
    )
    for malformed_record in (None, 7, "not-an-object", []):
        malformed = copy.deepcopy(base_input)
        malformed["field_binding_results"][0] = malformed_record
        assert _derive_runtime_escalation(malformed, contract) == (
            "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
        )
    for unknown_provider in ("UNKNOWN_PROVIDER_STATE", 7, None, {"state": "unknown"}):
        unknown = copy.deepcopy(base_input)
        unknown["provider_revalidation_result"] = unknown_provider
        assert _derive_runtime_escalation(unknown, contract) == (
            "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
        )
    unknown_status = copy.deepcopy(base_input)
    unknown_status["field_binding_results"][0]["status"] = "UNKNOWN_STATUS"
    assert _derive_runtime_escalation(unknown_status, contract) == (
        "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
    )
    for key, unknown_value in (
        ("parent_treatment_decision", "UNKNOWN_PARENT_DECISION"),
        ("qualification_exactness", "UNKNOWN_QUALIFICATION_STATE"),
    ):
        unknown = copy.deepcopy(base_input)
        unknown[key] = unknown_value
        assert _derive_runtime_escalation(unknown, contract) == (
            "REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE"
        )
    assert escalation_algorithm["fixed_physical_when"] == [
        "parent_treatment_decision == REJECTED",
        "ANY field_binding_results.status == UNBINDABLE",
        "qualification_exactness == MISMATCH",
    ]

    triggers = contract["requalification_triggers"]
    assert len(triggers) == 17
    assert len({trigger["trigger"] for trigger in triggers}) == 17
    assert all(trigger["prior_identity_reusable"] is False for trigger in triggers)
    expected_triggers = {
        "EVERY_VM_BOOT_OR_RESTART": ("INVALIDATE", "FULL_PER_BOOT_REQUALIFICATION_BEFORE_MODEL_IMPORT"),
        "HOST_REPLACEMENT_FAILOVER_OR_MAINTENANCE_TERMINATION": ("INVALIDATE", "DOWNTIME_UNTIL_FRESH_INSTANCE_REQUALIFIES"),
        "CPU_MICROCODE_FIRMWARE_HYPERVISOR_TDX_OR_VM_MEASUREMENT_CHANGE": ("INVALIDATE", "NEW_PROFILE_REVIEW_AND_FULL_QUALIFICATION"),
        "CONFIDENTIAL_SPACE_IMAGE_SWVERSION_OR_SUPPORT_ATTRIBUTE_CHANGE": ("INVALIDATE", "NEW_PROFILE_REVIEW_AND_FULL_QUALIFICATION"),
        "OS_KERNEL_OR_SERVICE_IMAGE_REBUILD_OR_DIGEST_CHANGE": ("INVALIDATE", "NEW_CANDIDATE_IDENTITY_AND_FULL_QUALIFICATION"),
        "PYTHON_DEPENDENCY_WHEEL_NATIVE_LIBRARY_OR_LOADER_CHANGE": ("INVALIDATE", "NEW_PROFILE_VERSION_AND_FULL_QUALIFICATION"),
        "NUMPY_SCIPY_NATIVE_DISPATCH_OPENBLAS_CORE_OR_THREAD_STATE_CHANGE": ("INVALIDATE", "NEW_PROFILE_VERSION_AND_FULL_QUALIFICATION"),
        "FLOATING_POINT_ROUNDING_OR_CONTROL_STATE_CHANGE": ("INVALIDATE", "NEW_PROFILE_VERSION_AND_FULL_QUALIFICATION"),
        "SOURCE_COMMIT_MANIFEST_MODEL_PLAN_OR_COMPILED_CONSTANT_CHANGE": ("INVALIDATE", "NEW_PROFILE_VERSION_AND_FULL_QUALIFICATION"),
        "NETWORK_FILESYSTEM_LOCALE_ENVIRONMENT_OR_PROCESS_POLICY_CHANGE": ("INVALIDATE", "NEW_PROFILE_VERSION_AND_FULL_QUALIFICATION"),
        "MACHINE_TYPE_OR_ZONE_SUBSTITUTION": ("REJECT", "NEW_CANDIDATE_SELECTION_DECISION_REQUIRED"),
        "PROVIDER_MAPPING_OR_COMPUTE_DISCOVERY_REVISION_CHANGE": ("HOLD", "NEW_SECTION_7_1_VOCABULARY_OR_EXACT_REVALIDATION_REQUIRED"),
        "ATTESTATION_TRUST_POLICY_SIGNER_KEY_OR_REVOCATION_CHANGE": ("INVALIDATE", "SECTIONS_7_3_7_4_REVIEW_AND_FULL_REQUALIFICATION"),
        "REQUIRED_FIELD_UNBINDABLE_OR_TREATMENT_CANNOT_DETECT_PREEXECUTION_DRIFT": ("REJECT", "REJECT_C3_TDX_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION"),
        "SECTION_7_7_REJECTS_VIRTUAL_PROFILE_TREATMENT": ("REJECT", "REJECT_C3_TDX_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION"),
        "UNKNOWN_STALE_REPLAYED_REVOKED_OR_MISMATCHED_MEASUREMENT": ("REJECT", "DO_NOT_IMPORT_MODEL_OR_EXECUTE"),
        "EXACT_CROSS_INSTANCE_OR_SAME_PROFILE_SEMANTIC_MISMATCH": ("REJECT", "REJECT_C3_TDX_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION_WITHOUT_FAVORABLE_RERUN"),
    }
    assert {
        trigger["trigger"]: (
            trigger["transition"],
            trigger["required_action"],
        )
        for trigger in triggers
    } == expected_triggers
    assert contract["initial_lifecycle_state"] == "INACTIVE_UNQUALIFIED_NO_INSTANCE"


def test_docs_privacy_nonauthorization_and_next_scope_are_consistent() -> None:
    text = README.read_text(encoding="utf-8")
    candidate = CANDIDATE.read_text(encoding="utf-8")
    attribution = (ROOT / "ATTRIBUTION.md").read_text(encoding="utf-8")
    contract = _json(CONTRACT)
    assert "GCP_RUNTIME_OBJECT_HASH_CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD" in text
    assert "INSUFFICIENT_NO_OBSERVED_INSTANCE_ATTESTATION_OR_QUALIFICATION" in text
    assert "Section 7.2 has no runtime-identity candidate object" in text
    assert "This contract does not" in text and "authorize that work" in text
    assert "No GCP action or" in text and "qualification may begin" in text
    assert "Raw service-account email and scope values are not admitted" in " ".join(text.split())
    assert "[Runtime object and hash contract]" in candidate
    assert "keeps runtime authority held" in candidate
    assert "GCP Canonical Runtime Object and Hash" in attribution
    assert contract["privacy"]["service_account_rule"] == (
        "RAW_SERVICE_ACCOUNT_EMAIL_AND_SCOPE_VALUES_ARE_NOT_ADMITTED_OR_HASHED_BY_SECTION_7_2; SECTION_7_3_OWNS_ANY_FUTURE_DERIVED_IDENTITY_POSTURE"
    )
    assert "PERSON_USER_EMPLOYEE_ACCOUNT_OR_EMAIL_IDENTIFIERS" in contract["privacy"]["prohibited"]
    assert "EXTERNAL_RESTRICTED_PUBLIC_PROVIDER_DOCUMENT_RECOVERY_BYTES" in contract[
        "privacy"
    ]["allowed"]
    assert contract["privacy"]["public_source_recovery_exception"].startswith(
        "PUBLIC_PROVIDER_DOCUMENT_BYTES_MAY_CONTAIN_PUBLIC_EXAMPLE_EMAIL_OR_IP_LITERALS"
    )
    assert not any(contract["non_authorization"].values())
