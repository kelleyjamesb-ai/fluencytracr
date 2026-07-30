"""Independent test-only oracle for Section 7.5.1 V4 readiness.

This module is deliberately separate from the absent future evaluator.  It
consumes only the reviewed closed model, crypto verifier, and final-directory
capability boundary and always returns one closed five-field result.
"""

from __future__ import annotations

from base64 import b64decode, b64encode
from datetime import datetime, timezone
import hashlib
import json
import re
from typing import Literal, Mapping, TypeAlias

from tests.gcp_s751_v4.bundle import (
    BundleAdmissionError,
    admit_parent_bundle,
)
from tests.gcp_s751_v4.crypto import (
    VerifyVector,
    anchor_key_id,
    verify_batch,
)
from tests.gcp_s751_v4.model import (
    EvaluationResult,
    RulePacket,
    canonical_json,
    load_packet,
    strict_load_json,
)


ControllerDecision = Literal[
    "VALID", "HOLD_UNKNOWN_EDGE", "REJECT_INVALID_GRAPH"
]
ReplayState: TypeAlias = set[bytes]

_HEX_32 = re.compile(r"^[0-9a-f]{32}$")
_HEX_64 = re.compile(r"^[0-9a-f]{64}$")
_KEY_ID = re.compile(r"^P256_SPKI_SHA256:[0-9a-f]{64}$")
_UTC_SECONDS = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
_MODES = {"CLEAN_CI", "ARCHIVE_CLOSEOUT", "LIVE_RUNTIME"}
_SIGNER_PURPOSES = {
    "IMAGE_PROVENANCE_SIGNING_CRYPTOKEY",
    "RUNTIME_RECEIPT_SIGNING_CRYPTOKEY",
}
_EXPECTED_OWNERS = {
    "S75A-P00": "SECTION_7_2",
    "S75A-P01": "SECTION_7_3",
    "S75A-P02": "SECTION_7_3",
    "S75A-P03": "SECTION_7_4",
    "S75A-P04": "FUTURE_FULL_SECTION_7_5",
    "S75A-P05": "SECTION_7_3_SECTION_7_4_FUTURE_FULL_SECTION_7_5",
    "S75A-P06": "SECTION_7_3",
    "S75A-P07": "FUTURE_FULL_SECTION_7_5_SECTION_7_4",
    "S75A-P08": "SECTION_7_3_FUTURE_FULL_SECTION_7_5",
    "S75A-P09": "FUTURE_FULL_SECTION_7_5",
    "S75A-P10": "FUTURE_FULL_SECTION_7_5",
    "S75A-P11": "FUTURE_FULL_SECTION_7_5",
    "S75A-P12": "FUTURE_FULL_SECTION_7_5",
    "S75A-P13": "FUTURE_FULL_SECTION_7_5_SECTION_7_7",
    "S75A-P14": "SECTION_7_4",
    "S75A-P15": "SECTION_7_7",
    "S75A-P16": "SECTION_7_8",
    "S75A-P17": "HUMAN",
    "S75A-P18": "SECTION_7_3_FUTURE_FULL_SECTION_7_5",
    "S75A-P19": "SECTION_7_3_FUTURE_FULL_SECTION_7_5_SECTION_7_4",
}


class ReferenceOracle:
    """Total, process-local reference oracle with isolated replay state."""

    def __init__(self) -> None:
        self._replay_state: ReplayState = set()

    def evaluate(
        self,
        candidate_bytes: bytes,
        signed_context_envelope_bytes: bytes,
        verifier_anchor_spki: bytes,
        trusted_parent_bundle_fd: int,
    ) -> EvaluationResult:
        packet = load_packet()

        try:
            candidate = _parse_candidate(candidate_bytes)
        except (TypeError, ValueError):
            return _reject("INVALID_CANDIDATE_SHAPE")

        try:
            envelope, payload, signature = _parse_envelope(
                signed_context_envelope_bytes
            )
        except (TypeError, ValueError):
            return _reject("INVALID_ENVELOPE_SHAPE")

        try:
            signed_payload = dict(payload)
            del signed_payload["key_id"]
            verified = verify_batch(
                verifier_anchor_spki,
                (VerifyVector(canonical_json(signed_payload), signature),),
            )
            if verified != (True,):
                return _reject("INVALID_SIGNATURE")
        except (TypeError, ValueError):
            return _reject("INVALID_SIGNATURE")

        try:
            if not _signed_bindings_are_valid(
                packet,
                candidate_bytes,
                payload,
                verifier_anchor_spki,
            ):
                return _reject("INVALID_SIGNED_CONTEXT_BINDING")
        except (TypeError, ValueError):
            return _reject("INVALID_SIGNED_CONTEXT_BINDING")

        mode = payload["mode"]
        if mode == "LIVE_RUNTIME":
            return _hold("LIVE_RUNTIME_NOT_AUTHORIZED", "DESIGN_ONLY")

        try:
            if not _context_conjunction_is_valid(packet, payload):
                return _reject("INVALID_CONTEXT_CONJUNCTION")
            nonce = bytes.fromhex(payload["nonce_time"]["nonce"])
            if nonce in self._replay_state:
                return _reject("REPLAY_DETECTED")
            self._replay_state.add(nonce)
        except (TypeError, ValueError):
            return _reject("INVALID_CONTEXT_CONJUNCTION")

        try:
            parents = admit_parent_bundle(
                trusted_parent_bundle_fd,
                packet.parent_manifest,
            )
        except BundleAdmissionError:
            return _reject("INVALID_PARENT_RESOURCE_SET")

        try:
            parent_objects = {
                name: _load_parent_json(data) for name, data in parents.items()
            }
            if not _parent_authority_semantics_are_valid(
                parent_objects, candidate["observation"]
            ):
                return _reject("INVALID_SECTION_7_3_AUTHORITY")
            controller = evaluate_controller_fixed_point(
                candidate["observation"]
            )
            if controller == "REJECT_INVALID_GRAPH":
                return _reject("INVALID_SECTION_7_3_AUTHORITY")
            if controller == "HOLD_UNKNOWN_EDGE":
                return _hold("UNKNOWN_CONTROLLER_EDGE", "STRUCTURAL_ONLY")
        except (KeyError, TypeError, ValueError):
            return _reject("INVALID_SECTION_7_3_AUTHORITY")

        try:
            if not _privacy_and_nonauthorization_are_valid(
                parent_objects,
                candidate,
                payload,
                envelope,
            ):
                return _reject("PRIVACY_OR_NONAUTHORIZATION_INVALID")
        except (KeyError, TypeError, ValueError):
            return _reject("PRIVACY_OR_NONAUTHORIZATION_INVALID")

        if mode == "ARCHIVE_CLOSEOUT":
            return _hold(
                "ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN",
                "ARCHIVE_CLOSEOUT_ONLY",
            )
        return _hold("CURRENT_PARENT_OBLIGATIONS_OPEN", "STRUCTURAL_ONLY")


def evaluate_controller_fixed_point(
    observation: Mapping[str, object],
) -> ControllerDecision:
    """Validate and close the separate governed controller graph."""
    try:
        if not isinstance(observation, Mapping):
            return "REJECT_INVALID_GRAPH"
        expected = {
            "governed_roles",
            "synthetic_aliases",
            "controller_edges",
            "controller_cycles",
            "unknown_edge_count",
        }
        if set(observation) != expected:
            return "REJECT_INVALID_GRAPH"

        governed = observation["governed_roles"]
        edges_value = observation["controller_edges"]
        cycles_value = observation["controller_cycles"]
        unknown = observation["unknown_edge_count"]
        if (
            not isinstance(governed, list)
            or not governed
            or not all(isinstance(role, str) for role in governed)
            or governed != sorted(set(governed))
            or not isinstance(edges_value, list)
            or not isinstance(cycles_value, list)
            or type(unknown) is not int
            or unknown < 0
        ):
            return "REJECT_INVALID_GRAPH"
        roles = set(governed)

        edges: list[tuple[str, str]] = []
        edge_order: list[bytes] = []
        for value in edges_value:
            if not isinstance(value, Mapping) or set(value) != {
                "controller",
                "controlled",
            }:
                return "REJECT_INVALID_GRAPH"
            controller = value["controller"]
            controlled = value["controlled"]
            if (
                not isinstance(controller, str)
                or not isinstance(controlled, str)
                or controller not in roles
                or controlled not in roles
            ):
                return "REJECT_INVALID_GRAPH"
            edges.append((controller, controlled))
            edge_order.append(canonical_json(dict(value)))
        if edge_order != sorted(set(edge_order)):
            return "REJECT_INVALID_GRAPH"

        declared_cycles: list[tuple[str, ...]] = []
        for value in cycles_value:
            if (
                not isinstance(value, list)
                or len(value) < 2
                or not all(isinstance(role, str) for role in value)
                or value != sorted(set(value))
                or not set(value) <= roles
            ):
                return "REJECT_INVALID_GRAPH"
            declared_cycles.append(tuple(value))
        if declared_cycles != sorted(set(declared_cycles)):
            return "REJECT_INVALID_GRAPH"

        reach = {role: {role} for role in governed}
        for controller, controlled in edges:
            reach[controller].add(controlled)
        changed = True
        while changed:
            changed = False
            for role in governed:
                expanded = set(reach[role])
                for controlled in tuple(reach[role]):
                    expanded.update(reach[controlled])
                if expanded != reach[role]:
                    reach[role] = expanded
                    changed = True

        remaining = set(governed)
        observed_cycles: list[tuple[str, ...]] = []
        while remaining:
            role = min(remaining)
            component = {
                peer
                for peer in remaining
                if peer in reach[role] and role in reach[peer]
            }
            remaining.difference_update(component)
            if len(component) > 1:
                observed_cycles.append(tuple(sorted(component)))
        if tuple(sorted(observed_cycles)) != tuple(declared_cycles):
            return "REJECT_INVALID_GRAPH"
        if unknown:
            return "HOLD_UNKNOWN_EDGE"
        return "VALID"
    except (KeyError, TypeError, ValueError):
        return "REJECT_INVALID_GRAPH"


def _parse_candidate(data: bytes) -> dict[str, object]:
    value = strict_load_json(data)
    candidate = _exact_dict(
        value,
        {"schema_version", "requested_action", "observation"},
    )
    if (
        candidate["schema_version"] != "GCP_SECTION_7_5_1_CANDIDATE_V4"
        or candidate["requested_action"] != "EVALUATE_ONLY"
    ):
        raise ValueError("invalid candidate")
    observation = _exact_dict(
        candidate["observation"],
        {
            "governed_roles",
            "synthetic_aliases",
            "controller_edges",
            "controller_cycles",
            "unknown_edge_count",
        },
    )
    governed = _sorted_unique_strings(observation["governed_roles"], False)
    aliases = _sorted_unique_strings(observation["synthetic_aliases"], True)
    if not all(_HEX_32.fullmatch(alias) for alias in aliases):
        raise ValueError("invalid candidate")

    edges = observation["controller_edges"]
    if not isinstance(edges, list):
        raise ValueError("invalid candidate")
    edge_bytes: list[bytes] = []
    for edge_value in edges:
        edge = _exact_dict(edge_value, {"controller", "controlled"})
        if not all(isinstance(edge[field], str) for field in edge):
            raise ValueError("invalid candidate")
        edge_bytes.append(canonical_json(edge))
    if edge_bytes != sorted(set(edge_bytes)):
        raise ValueError("invalid candidate")

    cycles = observation["controller_cycles"]
    if not isinstance(cycles, list):
        raise ValueError("invalid candidate")
    cycle_bytes: list[bytes] = []
    for cycle in cycles:
        _sorted_unique_strings(cycle, False)
        cycle_bytes.append(canonical_json(cycle))
    if cycle_bytes != sorted(set(cycle_bytes)):
        raise ValueError("invalid candidate")
    unknown = observation["unknown_edge_count"]
    if type(unknown) is not int or unknown < 0:
        raise ValueError("invalid candidate")
    return candidate


def _parse_envelope(
    data: bytes,
) -> tuple[dict[str, object], dict[str, object], bytes]:
    value = strict_load_json(data)
    envelope = _exact_dict(
        value,
        {
            "schema_version",
            "algorithm",
            "payload",
            "signature_der_base64",
        },
    )
    if (
        envelope["schema_version"]
        != "GCP_SECTION_7_5_1_SIGNED_CONTEXT_ENVELOPE_V4"
        or envelope["algorithm"] != "ECDSA_P256_SHA256_DER"
    ):
        raise ValueError("invalid envelope")
    payload = _exact_dict(
        envelope["payload"],
        {
            "schema_version",
            "policy_id",
            "candidate_sha256",
            "mode",
            "parent_manifest",
            "registry_sha256",
            "receipt_sha256",
            "approval_target_sha256",
            "current_head_sha256",
            "anti_rollback_sha256",
            "role_matrix_sha256",
            "signer_purpose",
            "key_id",
            "nonce_time",
            "authority_effect",
        },
    )
    if (
        payload["schema_version"]
        != "GCP_SECTION_7_5_1_SIGNED_CONTEXT_PAYLOAD_V4"
    ):
        raise ValueError("invalid envelope")
    for field in (
        "candidate_sha256",
        "registry_sha256",
        "receipt_sha256",
        "approval_target_sha256",
        "current_head_sha256",
        "anti_rollback_sha256",
        "role_matrix_sha256",
    ):
        if not isinstance(payload[field], str) or not _HEX_64.fullmatch(
            payload[field]
        ):
            raise ValueError("invalid envelope")
    if not isinstance(payload["key_id"], str) or not _KEY_ID.fullmatch(
        payload["key_id"]
    ):
        raise ValueError("invalid envelope")
    for field in ("policy_id", "mode", "signer_purpose", "authority_effect"):
        if not isinstance(payload[field], str):
            raise ValueError("invalid envelope")

    manifest = payload["parent_manifest"]
    if not isinstance(manifest, list) or len(manifest) != 5:
        raise ValueError("invalid envelope")
    for entry_value in manifest:
        entry = _exact_dict(entry_value, {"member_name", "sha256"})
        if (
            not isinstance(entry["member_name"], str)
            or not isinstance(entry["sha256"], str)
            or not _HEX_64.fullmatch(entry["sha256"])
        ):
            raise ValueError("invalid envelope")

    nonce_time = _exact_dict(
        payload["nonce_time"],
        {"nonce", "valid_from", "valid_until", "trusted_time"},
    )
    if (
        not isinstance(nonce_time["nonce"], str)
        or not _HEX_32.fullmatch(nonce_time["nonce"])
    ):
        raise ValueError("invalid envelope")
    for field in ("valid_from", "valid_until", "trusted_time"):
        if (
            not isinstance(nonce_time[field], str)
            or not _UTC_SECONDS.fullmatch(nonce_time[field])
        ):
            raise ValueError("invalid envelope")

    signature_text = envelope["signature_der_base64"]
    if not isinstance(signature_text, str):
        raise ValueError("invalid envelope")
    signature = b64decode(signature_text.encode("ascii"), validate=True)
    if not signature or b64encode(signature).decode("ascii") != signature_text:
        raise ValueError("invalid envelope")
    return envelope, payload, signature


def _signed_bindings_are_valid(
    packet: RulePacket,
    candidate_bytes: bytes,
    payload: Mapping[str, object],
    anchor_spki: bytes,
) -> bool:
    expected_manifest = [
        {"member_name": entry.member_name, "sha256": entry.sha256}
        for entry in packet.parent_manifest
    ]
    nonce_time = payload["nonce_time"]
    if not isinstance(nonce_time, Mapping):
        return False
    valid_from = _parse_utc(nonce_time["valid_from"])
    valid_until = _parse_utc(nonce_time["valid_until"])
    trusted_time = _parse_utc(nonce_time["trusted_time"])
    role_matrix_sha256 = next(
        entry.sha256
        for entry in packet.parent_manifest
        if entry.member_name == "role-capability-matrix.json"
    )
    return (
        payload["candidate_sha256"]
        == hashlib.sha256(candidate_bytes).hexdigest()
        and payload["policy_id"] == "FT_CANONICAL_JSON_V1"
        and payload["mode"] in _MODES
        and valid_from < valid_until
        and valid_from <= trusted_time <= valid_until
        and payload["key_id"] == anchor_key_id(anchor_spki)
        and payload["signer_purpose"] in _SIGNER_PURPOSES
        and payload["authority_effect"] == "NONE"
        and payload["parent_manifest"] == expected_manifest
        and payload["role_matrix_sha256"] == role_matrix_sha256
    )


def _context_conjunction_is_valid(
    packet: RulePacket,
    payload: Mapping[str, object],
) -> bool:
    manifest = payload["parent_manifest"]
    receipt_sha256 = next(
        entry.sha256
        for entry in packet.parent_manifest
        if entry.member_name == "attestation-receipt-contract.json"
    )
    head_sha256 = hashlib.sha256(bytes.fromhex(packet.base_commit)).hexdigest()
    return (
        payload["registry_sha256"]
        == hashlib.sha256(canonical_json(manifest)).hexdigest()
        and payload["receipt_sha256"] == receipt_sha256
        and payload["approval_target_sha256"] == receipt_sha256
        and payload["current_head_sha256"] == head_sha256
        and payload["anti_rollback_sha256"] == head_sha256
    )


def _parent_authority_semantics_are_valid(
    parents: Mapping[str, Mapping[str, object]],
    observation: Mapping[str, object],
) -> bool:
    if set(parents) != {
        "runtime-object-contract.json",
        "security-authority-contract.json",
        "role-capability-matrix.json",
        "attestation-receipt-contract.json",
        "constraints-open-obligations-contract.json",
    }:
        return False
    runtime = parents["runtime-object-contract.json"]
    security = parents["security-authority-contract.json"]
    matrix = parents["role-capability-matrix.json"]
    receipt = parents["attestation-receipt-contract.json"]
    constraints = parents["constraints-open-obligations-contract.json"]

    project_roles = security["project_role_contract"]["role_ids"]
    principal_roles = security["principal_role_contract"]["role_ids"]
    roles = matrix["roles"]
    capabilities = matrix["capabilities"]
    hsm_profiles = security["policy_template"]["hsm_key_profiles"]
    if (
        runtime["implements_candidate_section"] != "7.2"
        or security["scope"] != "SECTION_7_3_DOCS_ONLY"
        or receipt["implements_candidate_section"] != "7.4"
        or constraints["scope"]
        != "DOCS_ONLY_CONSTRAINTS_NOT_FULL_SECTION_7_5"
        or not _distinct_strings(project_roles, 5)
        or not isinstance(roles, list)
        or len(roles) != 14
        or not isinstance(capabilities, list)
        or len(capabilities) != 16
        or not isinstance(hsm_profiles, list)
        or len(hsm_profiles) != 2
    ):
        return False

    role_ids = [role["role_id"] for role in roles]
    capability_ids = [value["capability_id"] for value in capabilities]
    if (
        len(set(role_ids)) != 14
        or sorted(role_ids) != sorted(principal_roles)
        or observation["governed_roles"] != sorted(role_ids)
        or len(set(capability_ids)) != 16
    ):
        return False
    capability_set = set(capability_ids)
    for role in roles:
        allowed = role["allowed_capability_ids"]
        forbidden = role["forbidden_capability_ids"]
        if (
            role["default"]
            != "DENY_UNLISTED_SECURITY_SENSITIVE_CAPABILITY_OR_PERMISSION"
            or not _string_partition(allowed, forbidden, capability_set)
        ):
            return False

    if {
        profile["key_purpose_id"] for profile in hsm_profiles
    } != {
        "IMAGE_PROVENANCE_SIGNING_KEY",
        "RUNTIME_RECEIPT_SIGNING_KEY",
    }:
        return False
    for profile in hsm_profiles:
        if (
            profile["algorithm"] != "EC_SIGN_P256_SHA256"
            or profile["protection_level"] != "HSM"
            or profile["purpose"] != "ASYMMETRIC_SIGN"
            or profile["version_ids"] != ["1"]
            or profile["version_state"] != "ENABLED"
        ):
            return False

    approvals = receipt["approval_registries"]
    if (
        not isinstance(approvals, Mapping)
        or len(approvals) != 16
        or any(value != [] for value in approvals.values())
    ):
        return False
    prerequisites = constraints["open_prerequisite_registry"]
    if not isinstance(prerequisites, list) or len(prerequisites) != 20:
        return False
    observed_owners = {
        value["prerequisite_id"]: value["owner"] for value in prerequisites
    }
    return (
        observed_owners == _EXPECTED_OWNERS
        and all(
            value["current_state"] == "OPEN_BLOCKING"
            and value["authority_effect"] == "NONE"
            for value in prerequisites
        )
    )


def _privacy_and_nonauthorization_are_valid(
    parents: Mapping[str, Mapping[str, object]],
    candidate: Mapping[str, object],
    payload: Mapping[str, object],
    envelope: Mapping[str, object],
) -> bool:
    if (
        candidate["requested_action"] != "EVALUATE_ONLY"
        or payload["authority_effect"] != "NONE"
        or set(envelope)
        != {
            "schema_version",
            "algorithm",
            "payload",
            "signature_der_base64",
        }
    ):
        return False
    for parent_name in (
        "runtime-object-contract.json",
        "security-authority-contract.json",
        "attestation-receipt-contract.json",
        "constraints-open-obligations-contract.json",
    ):
        parent = parents[parent_name]
        nonauthorization = parent["non_authorization"]
        if (
            not isinstance(nonauthorization, Mapping)
            or any(value is not False for value in nonauthorization.values())
        ):
            return False
    receipt_privacy = parents[
        "attestation-receipt-contract.json"
    ]["privacy"]
    return (
        receipt_privacy["restricted_evidence_only"] is True
        and receipt_privacy["public_receipt_projection"] is False
        and receipt_privacy["raw_identifiers_in_public_artifacts"] is False
    )


def _load_parent_json(data: bytes) -> Mapping[str, object]:
    value = json.loads(
        data.decode("utf-8"),
        object_pairs_hook=_reject_duplicate_keys,
        parse_float=_reject_number,
        parse_constant=_reject_number,
    )
    if not isinstance(value, dict):
        raise ValueError("invalid parent")
    return value


def _reject_duplicate_keys(
    pairs: list[tuple[str, object]],
) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("invalid parent")
        result[key] = value
    return result


def _reject_number(value: str) -> object:
    raise ValueError("invalid parent")


def _exact_dict(value: object, keys: set[str]) -> dict[str, object]:
    if not isinstance(value, dict) or set(value) != keys:
        raise ValueError("invalid closed object")
    return value


def _sorted_unique_strings(value: object, allow_empty: bool) -> list[str]:
    if (
        not isinstance(value, list)
        or (not allow_empty and not value)
        or not all(isinstance(item, str) for item in value)
        or value != sorted(set(value))
    ):
        raise ValueError("invalid closed string sequence")
    return value


def _distinct_strings(value: object, count: int) -> bool:
    return (
        isinstance(value, list)
        and len(value) == count
        and all(isinstance(item, str) for item in value)
        and len(set(value)) == count
    )


def _string_partition(
    allowed: object,
    forbidden: object,
    universe: set[str],
) -> bool:
    return (
        isinstance(allowed, list)
        and isinstance(forbidden, list)
        and all(isinstance(item, str) for item in allowed + forbidden)
        and len(allowed) == len(set(allowed))
        and len(forbidden) == len(set(forbidden))
        and set(allowed).isdisjoint(forbidden)
        and set(allowed) | set(forbidden) == universe
    )


def _parse_utc(value: object) -> datetime:
    if not isinstance(value, str) or not _UTC_SECONDS.fullmatch(value):
        raise ValueError("invalid time")
    parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    return parsed.replace(tzinfo=timezone.utc)


def _reject(reason: str) -> EvaluationResult:
    return EvaluationResult(
        schema_version="GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        decision="REJECT",
        reason=reason,
        authority_effect="NONE",
        claim_grade="NONE",
    )


def _hold(reason: str, claim_grade: str) -> EvaluationResult:
    return EvaluationResult(
        schema_version="GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        decision="HOLD",
        reason=reason,
        authority_effect="NONE",
        claim_grade=claim_grade,
    )
