"""Closed, test-only model for the Section 7.5.1 V4 readiness packet.

This module deliberately provides parsing and enumeration primitives only.  It
does not evaluate a candidate or project parent-contract closure.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
from types import MappingProxyType
from typing import Literal, Mapping, TypeAlias


ClosedSchema: TypeAlias = Mapping[str, object]
Decision = Literal["REJECT", "HOLD"]
AuthorityEffect = Literal["NONE"]
ClaimGrade = Literal[
    "NONE", "STRUCTURAL_ONLY", "ARCHIVE_CLOSEOUT_ONLY", "DESIGN_ONLY"
]
ResultReason = Literal[
    "INVALID_CANDIDATE_SHAPE",
    "INVALID_ENVELOPE_SHAPE",
    "INVALID_SIGNATURE",
    "INVALID_SIGNED_CONTEXT_BINDING",
    "INVALID_CONTEXT_CONJUNCTION",
    "REPLAY_DETECTED",
    "INVALID_PARENT_RESOURCE_SET",
    "INVALID_SECTION_7_3_AUTHORITY",
    "PRIVACY_OR_NONAUTHORIZATION_INVALID",
    "UNKNOWN_CONTROLLER_EDGE",
    "CURRENT_PARENT_OBLIGATIONS_OPEN",
    "ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN",
    "LIVE_RUNTIME_NOT_AUTHORIZED",
]


_EXPECTED_RESULT_TUPLES = frozenset(
    {
        ("REJECT", "INVALID_CANDIDATE_SHAPE", "NONE", "NONE"),
        ("REJECT", "INVALID_ENVELOPE_SHAPE", "NONE", "NONE"),
        ("REJECT", "INVALID_SIGNATURE", "NONE", "NONE"),
        ("REJECT", "INVALID_SIGNED_CONTEXT_BINDING", "NONE", "NONE"),
        ("REJECT", "INVALID_CONTEXT_CONJUNCTION", "NONE", "NONE"),
        ("REJECT", "REPLAY_DETECTED", "NONE", "NONE"),
        ("REJECT", "INVALID_PARENT_RESOURCE_SET", "NONE", "NONE"),
        ("REJECT", "INVALID_SECTION_7_3_AUTHORITY", "NONE", "NONE"),
        (
            "REJECT",
            "PRIVACY_OR_NONAUTHORIZATION_INVALID",
            "NONE",
            "NONE",
        ),
        ("HOLD", "UNKNOWN_CONTROLLER_EDGE", "NONE", "STRUCTURAL_ONLY"),
        (
            "HOLD",
            "CURRENT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "STRUCTURAL_ONLY",
        ),
        (
            "HOLD",
            "ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "ARCHIVE_CLOSEOUT_ONLY",
        ),
        (
            "HOLD",
            "LIVE_RUNTIME_NOT_AUTHORIZED",
            "NONE",
            "DESIGN_ONLY",
        ),
    }
)


@dataclass(frozen=True)
class SchemaPath:
    boundary: str
    pointer: str
    json_type: str
    cardinality: str
    value_rule: str


@dataclass(frozen=True)
class ManifestEntry:
    member_name: str
    repo_path: str
    sha256: str


@dataclass(frozen=True)
class ResultMapping:
    decision: Decision
    reason: ResultReason
    authority_effect: AuthorityEffect
    claim_grade: ClaimGrade

    def __post_init__(self) -> None:
        if (
            self.decision,
            self.reason,
            self.authority_effect,
            self.claim_grade,
        ) not in _EXPECTED_RESULT_TUPLES:
            raise ValueError("result mapping is outside the closed model")


@dataclass(frozen=True)
class RulePacket:
    schema_version: str
    protocol_version: str
    protocol_sha256: str
    base_commit: str
    queue_item_id: str
    risk: Literal["high"]
    authority_effect: Literal["NONE"]
    parent_manifest: tuple[ManifestEntry, ...]
    closed_schemas: Mapping[str, ClosedSchema]
    signature_projection: Mapping[str, object]
    rule_templates: tuple[Mapping[str, object], ...]
    oracle_precedence: tuple[str, ...]
    result_mappings: tuple[ResultMapping, ...]
    environment_table: tuple[Mapping[str, object], ...]
    attack_catalog: tuple[Mapping[str, object], ...]
    case_catalog: tuple[Mapping[str, object], ...]
    compile_pinned_roots: tuple[Mapping[str, object], ...]


@dataclass(frozen=True)
class OracleInput:
    candidate_bytes: bytes
    signed_context_envelope_bytes: bytes
    verifier_anchor_spki: bytes
    trusted_parent_bundle_fd: int


@dataclass(frozen=True)
class EvaluationResult:
    schema_version: str
    decision: Decision
    reason: ResultReason
    authority_effect: AuthorityEffect
    claim_grade: ClaimGrade

    def __post_init__(self) -> None:
        if self.schema_version != "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4":
            raise ValueError("result schema version is outside the closed model")
        if (
            self.decision,
            self.reason,
            self.authority_effect,
            self.claim_grade,
        ) not in _EXPECTED_RESULT_TUPLES:
            raise ValueError("evaluation result is outside the closed model")


CandidateSchemaVersion = Literal["GCP_SECTION_7_5_1_CANDIDATE_V4"]
RequestedAction = Literal["EVALUATE_ONLY"]
SignedContextPayloadSchemaVersion = Literal[
    "GCP_SECTION_7_5_1_SIGNED_CONTEXT_PAYLOAD_V4"
]
SignedContextEnvelopeSchemaVersion = Literal[
    "GCP_SECTION_7_5_1_SIGNED_CONTEXT_ENVELOPE_V4"
]
ResultSchemaVersion = Literal["GCP_SECTION_7_5_1_EVALUATION_RESULT_V4"]
ContextMode = Literal["CLEAN_CI", "ARCHIVE_CLOSEOUT", "LIVE_RUNTIME"]
SignerPurpose = Literal[
    "IMAGE_PROVENANCE_SIGNING_CRYPTOKEY", "RUNTIME_RECEIPT_SIGNING_CRYPTOKEY"
]
_ROOT = Path(__file__).resolve().parents[2]
_PACKET_PATH = _ROOT / (
    "tests/fixtures/"
    "gcp_section_7_5_parent_contract_authority_closure_readiness_v4/"
    "packet-rules.json"
)
_BOUNDARY_NAMES = MappingProxyType(
    {
        "replay_record": "replay",
        "parent_bundle_descriptor": "bundle_capability",
    }
)


def canonical_json(value: object) -> bytes:
    """Encode one ASCII, whitespace-free, deterministically ordered JSON value."""
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
        allow_nan=False,
    ).encode("ascii")


def signature_preimage(
    packet: RulePacket,
    payload: Mapping[str, object],
) -> bytes:
    """Project the versioned detached-signature preimage from closed context."""
    projection = packet.signature_projection
    expected = {
        "schema_version": "GCP_SECTION_7_5_1_SIGNATURE_PROJECTION_V1",
        "domain_separator": (
            "FLUENCYTRACR:GCP_SECTION_7_5_1_SIGNED_CONTEXT:V1"
        ),
        "excluded_payload_field": "key_id",
        "key_id_binding": (
            "EXACT_P256_SPKI_SHA256_OF_OUT_OF_BAND_ADMITTED_SPKI"
        ),
        "preimage": (
            "DOMAIN_SEPARATOR_UTF8 || 0x00 || "
            "CANONICAL_JSON(PAYLOAD_WITHOUT_KEY_ID)"
        ),
    }
    if dict(projection) != expected:
        raise ValueError("invalid signature projection")
    projected = dict(payload)
    projected.pop("key_id", None)
    return (
        expected["domain_separator"].encode("ascii")
        + b"\x00"
        + canonical_json(projected)
    )


def strict_load_json(data: bytes) -> object:
    """Load exactly canonical UTF-8 JSON with no duplicate keys or floats."""
    if not isinstance(data, bytes):
        raise ValueError("strict JSON input must be bytes")
    try:
        decoded = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("strict JSON must be UTF-8") from exc

    def reject_duplicates(pairs: list[tuple[str, object]]) -> dict[str, object]:
        result: dict[str, object] = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate JSON key: {key}")
            result[key] = value
        return result

    def reject_float(value: str) -> object:
        raise ValueError(f"floating-point values are forbidden: {value}")

    def reject_constant(value: str) -> object:
        raise ValueError(f"non-JSON constant is forbidden: {value}")

    try:
        value = json.loads(
            decoded,
            object_pairs_hook=reject_duplicates,
            parse_float=reject_float,
            parse_constant=reject_constant,
        )
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("invalid strict JSON") from exc

    if canonical_json(value) != data:
        raise ValueError("JSON bytes are not canonical")
    return value


def load_packet() -> RulePacket:
    """Load the reviewed compact rule packet without creating a second schema."""
    raw = _load_packet_object()
    protocol = _required_mapping(raw, "protocol")
    manifest_raw = _required_list(raw, "parent_manifest")
    schemas_raw = _required_mapping(raw, "closed_schemas")

    manifest = tuple(
        ManifestEntry(
            member_name=_required_string(entry, "member_name"),
            repo_path=_required_string(entry, "repository_path"),
            sha256=_required_string(entry, "sha256"),
        )
        for entry in (_as_mapping(value, "parent manifest entry") for value in manifest_raw)
    )
    if len(manifest) != 5 or len({entry.member_name for entry in manifest}) != 5:
        raise ValueError("packet must contain five distinct parent manifest members")

    closed_schemas = MappingProxyType(
        {
            name: _freeze_mapping(_as_mapping(schema, f"closed schema {name}"))
            for name, schema in schemas_raw.items()
            if isinstance(name, str)
        }
    )
    if len(closed_schemas) != len(schemas_raw):
        raise ValueError("closed schema names must be strings")

    risk = _required_string(raw, "risk")
    authority_effect = _required_string(raw, "authority_effect")
    if risk != "high" or authority_effect != "NONE":
        raise ValueError("packet risk or authority effect is outside the closed model")

    result_mappings = tuple(
        ResultMapping(
            decision=_required_string(entry, "decision"),
            reason=_required_string(entry, "reason"),
            authority_effect=_required_string(entry, "authority_effect"),
            claim_grade=_required_string(entry, "claim_grade"),
        )
        for entry in (
            _as_mapping(value, "result mapping")
            for value in _required_list(raw, "result_mappings")
        )
    )
    if (
        len(result_mappings) != len(_EXPECTED_RESULT_TUPLES)
        or len({mapping.reason for mapping in result_mappings})
        != len(result_mappings)
        or {
            (
                mapping.decision,
                mapping.reason,
                mapping.authority_effect,
                mapping.claim_grade,
            )
            for mapping in result_mappings
        }
        != _EXPECTED_RESULT_TUPLES
    ):
        raise ValueError("packet result mappings are outside the closed model")

    signature_projection = _freeze_mapping(
        _required_mapping(raw, "signature_projection")
    )
    if dict(signature_projection) != {
        "schema_version": "GCP_SECTION_7_5_1_SIGNATURE_PROJECTION_V1",
        "domain_separator": (
            "FLUENCYTRACR:GCP_SECTION_7_5_1_SIGNED_CONTEXT:V1"
        ),
        "excluded_payload_field": "key_id",
        "key_id_binding": (
            "EXACT_P256_SPKI_SHA256_OF_OUT_OF_BAND_ADMITTED_SPKI"
        ),
        "preimage": (
            "DOMAIN_SEPARATOR_UTF8 || 0x00 || "
            "CANONICAL_JSON(PAYLOAD_WITHOUT_KEY_ID)"
        ),
    }:
        raise ValueError("packet signature projection is outside the closed model")

    return RulePacket(
        schema_version=_required_string(raw, "schema_version"),
        protocol_version=_required_string(protocol, "version"),
        protocol_sha256=_required_string(protocol, "sha256"),
        base_commit=_required_string(raw, "base_commit"),
        queue_item_id=_required_string(raw, "queue_item_id"),
        risk=risk,
        authority_effect=authority_effect,
        parent_manifest=manifest,
        closed_schemas=closed_schemas,
        signature_projection=signature_projection,
        rule_templates=_mapping_tuple(raw, "rule_templates"),
        oracle_precedence=_string_tuple(raw, "oracle_precedence"),
        result_mappings=result_mappings,
        environment_table=_mapping_tuple(raw, "environment_table"),
        attack_catalog=_mapping_tuple(raw, "attack_catalog"),
        case_catalog=_mapping_tuple(raw, "case_catalog"),
        compile_pinned_roots=_mapping_tuple(raw, "compile_pinned_roots"),
    )


def load_exact_parents(packet: RulePacket) -> dict[str, bytes]:
    """Read only packet-manifest parents and verify their exact raw-byte hashes."""
    parents: dict[str, bytes] = {}
    for entry in packet.parent_manifest:
        member_path = _ROOT / entry.repo_path
        try:
            resolved = member_path.resolve(strict=True)
            resolved.relative_to(_ROOT)
        except (OSError, ValueError) as exc:
            raise ValueError(f"invalid parent repository path: {entry.repo_path}") from exc
        data = resolved.read_bytes()
        actual_hash = hashlib.sha256(data).hexdigest()
        if actual_hash != entry.sha256:
            raise ValueError(f"parent hash mismatch: {entry.member_name}")
        parents[entry.member_name] = data
    return parents


def enumerate_all_dynamic_paths(packet: RulePacket) -> tuple[SchemaPath, ...]:
    """Enumerate every packet-declared dynamic path under its public boundary."""
    paths: list[SchemaPath] = []
    for packet_name, schema in packet.closed_schemas.items():
        boundary = _BOUNDARY_NAMES.get(packet_name, packet_name)
        paths.extend(
            SchemaPath(
                boundary=boundary,
                pointer=path.pointer,
                json_type=path.json_type,
                cardinality=path.cardinality,
                value_rule=path.value_rule,
            )
            for path in enumerate_schema_paths(schema)
        )
    return tuple(paths)


def enumerate_schema_paths(schema: ClosedSchema) -> tuple[SchemaPath, ...]:
    """Recursively enumerate packet field paths with RFC 6901 pointer escaping."""
    fields = schema.get("fields")
    if not isinstance(fields, tuple):
        raise ValueError("closed schema fields must be an immutable sequence")

    tree: dict[str, object] = {}
    for field in fields:
        field_mapping = _as_mapping(field, "closed schema field")
        pointer = _required_string(field_mapping, "pointer")
        tokens = _pointer_tokens(pointer)
        node = tree
        for token in tokens:
            child = node.setdefault(token, {})
            if not isinstance(child, dict):
                raise ValueError(f"invalid closed schema pointer: {pointer}")
            node = child
        if "" in node:
            raise ValueError(f"duplicate closed schema pointer: {pointer}")
        node[""] = SchemaPath(
            boundary="",
            pointer=pointer,
            json_type=_required_string(field_mapping, "type"),
            cardinality=_required_string(field_mapping, "cardinality"),
            value_rule=_required_string(field_mapping, "value_rule"),
        )

    paths: list[SchemaPath] = []

    def walk(node: Mapping[str, object], pointer: str) -> None:
        path = node.get("")
        if path is not None:
            if not isinstance(path, SchemaPath):
                raise ValueError("invalid closed schema path metadata")
            paths.append(path)
        for token, child in node.items():
            if token == "":
                continue
            if not isinstance(child, Mapping):
                raise ValueError("invalid closed schema tree")
            walk(child, f"{pointer}/{_escape_pointer_token(token)}")

    walk(tree, "")
    return tuple(paths)


def _load_packet_object() -> Mapping[str, object]:
    try:
        text = _PACKET_PATH.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("packet must be UTF-8") from exc
    try:
        value = json.loads(text, object_pairs_hook=_reject_duplicate_packet_keys)
    except json.JSONDecodeError as exc:
        raise ValueError("packet is not valid JSON") from exc
    return _as_mapping(value, "packet")


def _reject_duplicate_packet_keys(
    pairs: list[tuple[str, object]],
) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate packet key: {key}")
        result[key] = value
    return result


def _freeze_mapping(value: Mapping[str, object]) -> Mapping[str, object]:
    return MappingProxyType({key: _freeze_json(child) for key, child in value.items()})


def _freeze_json(value: object) -> object:
    if isinstance(value, Mapping):
        return _freeze_mapping(value)
    if isinstance(value, list):
        return tuple(_freeze_json(child) for child in value)
    return value


def _mapping_tuple(packet: Mapping[str, object], field: str) -> tuple[Mapping[str, object], ...]:
    return tuple(
        _freeze_mapping(_as_mapping(value, field))
        for value in _required_list(packet, field)
    )


def _string_tuple(packet: Mapping[str, object], field: str) -> tuple[str, ...]:
    values = _required_list(packet, field)
    if not all(isinstance(value, str) for value in values):
        raise ValueError(f"packet field {field} must contain only strings")
    return tuple(values)


def _required_mapping(packet: Mapping[str, object], field: str) -> Mapping[str, object]:
    return _as_mapping(packet.get(field), field)


def _required_list(packet: Mapping[str, object], field: str) -> list[object]:
    value = packet.get(field)
    if not isinstance(value, list):
        raise ValueError(f"packet field {field} must be a list")
    return value


def _required_string(packet: Mapping[str, object], field: str) -> str:
    value = packet.get(field)
    if not isinstance(value, str):
        raise ValueError(f"packet field {field} must be a string")
    return value


def _as_mapping(value: object, label: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        raise ValueError(f"{label} must be an object")
    if not all(isinstance(key, str) for key in value):
        raise ValueError(f"{label} keys must be strings")
    return value


def _pointer_tokens(pointer: str) -> tuple[str, ...]:
    if not pointer.startswith("/"):
        raise ValueError(f"RFC 6901 pointer must start with '/': {pointer}")
    return tuple(_unescape_pointer_token(token) for token in pointer[1:].split("/"))


def _unescape_pointer_token(token: str) -> str:
    result = ""
    index = 0
    while index < len(token):
        if token[index] != "~":
            result += token[index]
            index += 1
            continue
        if index + 1 >= len(token) or token[index + 1] not in "01":
            raise ValueError(f"invalid RFC 6901 escape: {token}")
        result += "~" if token[index + 1] == "0" else "/"
        index += 2
    return result


def _escape_pointer_token(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")
