"""Closed packet declarations for the Section 7.5.1 readiness corpus.

This module owns declarative attack-to-ledger reconciliation.  It does not
construct mutations, evaluate the oracle, or distribute uncovered rows after
case construction.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
from typing import Mapping, Sequence

from tests.gcp_s751_v4.ledger import RuleRow
from tests.gcp_s751_v4.model import (
    EvaluationResult,
    RulePacket,
    canonical_json,
)


_CASE_RECORD_FIELDS = {
    "case_id",
    "attack_id",
    "generator_id",
    "mutation_operator",
    "mutation_parameters",
    "source_relationship",
    "target_relationship",
    "immutable_root_id",
    "immutable_root_sha256",
    "expected_sequence",
    "oracle_id",
    "pytest_node",
    "ledger_selector",
}
_EXACT_SELECTOR_FIELDS = {"resource", "pointer", "rule_id"}


@dataclass(frozen=True)
class ExactLedgerSelector:
    resource: str
    pointer: str
    rule_id: str


@dataclass(frozen=True)
class CaseRecord:
    case_id: str
    attack_id: str
    generator_id: str
    mutation_operator: str
    mutation_parameters: tuple[str, ...]
    source_relationship: str
    target_relationship: str
    immutable_root_id: str
    immutable_root_sha256: str
    expected_sequence: tuple[tuple[str, ...], ...]
    oracle_id: str
    pytest_node: str
    ledger_selector: ExactLedgerSelector


def load_case_records(packet: RulePacket) -> tuple[CaseRecord, ...]:
    """Parse the packet-owned exact record for every emitted case."""
    records: list[CaseRecord] = []
    for raw in packet.case_catalog:
        if set(raw) != _CASE_RECORD_FIELDS:
            raise ValueError("case record fields are not closed")
        selector_raw = raw["ledger_selector"]
        if (
            not isinstance(selector_raw, Mapping)
            or set(selector_raw) != _EXACT_SELECTOR_FIELDS
        ):
            raise ValueError("case ledger selector fields are not closed")
        parameters = _text_tuple(raw, "mutation_parameters")
        expected_raw = raw["expected_sequence"]
        if not isinstance(expected_raw, tuple) or not expected_raw:
            raise ValueError("case record expected sequence is empty")
        expected_sequence: list[tuple[str, ...]] = []
        for outcome in expected_raw:
            if (
                not isinstance(outcome, tuple)
                or not outcome
                or not all(
                    isinstance(value, str) and value
                    for value in outcome
                )
            ):
                raise ValueError(
                    "case record expected outcome is not closed"
                )
            if outcome[0] == "EVALUATION_RESULT" and len(outcome) == 6:
                EvaluationResult(
                    schema_version=outcome[1],
                    decision=outcome[2],
                    reason=outcome[3],
                    authority_effect=outcome[4],
                    claim_grade=outcome[5],
                )
            elif outcome != (
                "PROTOCOL_FAILURE",
                "INVALID_SUT_RESULT",
            ):
                raise ValueError(
                    "case record expected outcome is not closed"
                )
            expected_sequence.append(outcome)
        record = CaseRecord(
            case_id=_required_text(raw, "case_id"),
            attack_id=_required_text(raw, "attack_id"),
            generator_id=_required_text(raw, "generator_id"),
            mutation_operator=_required_text(
                raw, "mutation_operator"
            ),
            mutation_parameters=parameters,
            source_relationship=_required_text(
                raw, "source_relationship"
            ),
            target_relationship=_required_text(
                raw, "target_relationship"
            ),
            immutable_root_id=_required_text(
                raw, "immutable_root_id"
            ),
            immutable_root_sha256=_required_text(
                raw, "immutable_root_sha256"
            ),
            expected_sequence=tuple(expected_sequence),
            oracle_id=_required_text(raw, "oracle_id"),
            pytest_node=_required_text(raw, "pytest_node"),
            ledger_selector=ExactLedgerSelector(
                resource=_required_text(selector_raw, "resource"),
                pointer=_required_text_allow_empty(
                    selector_raw, "pointer"
                ),
                rule_id=_required_text(selector_raw, "rule_id"),
            ),
        )
        if (
            tuple(sorted(set(parameters))) != parameters
            or record.immutable_root_sha256
            != resolve_immutable_root_sha256(
                packet, record.immutable_root_id
            )
        ):
            raise ValueError(
                "case record parameters or immutable root are invalid"
            )
        records.append(record)
    return tuple(records)


def resolve_case_ledger_row(
    record: CaseRecord,
    rows: Sequence[RuleRow],
) -> RuleRow:
    """Resolve one exact selector and reject zero or multiple matches."""
    matches = [
        row
        for row in rows
        if row.resource == record.ledger_selector.resource
        and row.pointer == record.ledger_selector.pointer
        and row.rule_id == record.ledger_selector.rule_id
    ]
    if len(matches) != 1:
        raise ValueError(
            "case ledger selector must match exactly one row"
        )
    return matches[0]


def reconcile_case_records(
    packet: RulePacket,
    rows: Sequence[RuleRow],
    records: Sequence[CaseRecord],
    observations: Sequence[object],
) -> None:
    """Reconcile exact packet records with independently observed cases."""
    frozen_records = tuple(records)
    frozen_observations = tuple(observations)
    record_ids = [record.case_id for record in frozen_records]
    observation_ids = [
        _observation_text(observation, "case_id")
        for observation in frozen_observations
    ]
    if (
        len(record_ids) != len(set(record_ids))
        or len(observation_ids) != len(set(observation_ids))
        or set(record_ids) != set(observation_ids)
    ):
        raise ValueError("case record set mismatch")
    observations_by_id = {
        _observation_text(observation, "case_id"): observation
        for observation in frozen_observations
    }
    for record in frozen_records:
        observation = observations_by_id[record.case_id]
        observed_mutation = (
            _observation_text(observation, "attack_id"),
            _observation_text(observation, "generator_id"),
            _observation_text(observation, "mutation_operator"),
            tuple(getattr(observation, "mutation_parameters")),
            _observation_text(observation, "source_relationship"),
            _observation_text(observation, "target_relationship"),
            _observation_text(observation, "oracle_id"),
            _observation_text(observation, "pytest_node"),
        )
        recorded_mutation = (
            record.attack_id,
            record.generator_id,
            record.mutation_operator,
            record.mutation_parameters,
            record.source_relationship,
            record.target_relationship,
            record.oracle_id,
            record.pytest_node,
        )
        if recorded_mutation != observed_mutation:
            raise ValueError(
                "case record does not match observed mutation"
            )
        if (
            record.immutable_root_id
            != _observation_text(observation, "immutable_root_id")
            or record.immutable_root_sha256
            != _observation_text(
                observation, "immutable_root_sha256"
            )
        ):
            raise ValueError("case record immutable root mismatch")
        if record.expected_sequence != tuple(
            getattr(observation, "expected_sequence")
        ):
            raise ValueError(
                "case record expected sequence mismatch"
            )
        row = resolve_case_ledger_row(record, rows)
        _validate_expected_stage(record, row)


def _validate_expected_stage(
    record: CaseRecord,
    row: RuleRow,
) -> None:
    outcome = record.expected_sequence[-1]
    if outcome[0] == "PROTOCOL_FAILURE":
        reason = outcome[1]
        decision = "REJECT"
    else:
        decision = outcome[2]
        reason = outcome[3]
    allowed_stage = {
        "INVALID_CANDIDATE_SHAPE": ("CANDIDATE_SHAPE_ADMISSION",),
        "INVALID_ENVELOPE_SHAPE": (
            "SIGNED_CONTEXT_BINDING",
            "SIGNED_ENVELOPE_AUTHENTICATION",
            "NONCE_AND_TIME_ADMISSION",
        ),
        "INVALID_SIGNATURE": (
            "SIGNED_ENVELOPE_AUTHENTICATION",
            "VERIFIER_ANCHOR_AUTHENTICATION",
        ),
        "INVALID_SIGNED_CONTEXT_BINDING": (
            "SIGNED_CONTEXT_BINDING",
            "NONCE_AND_TIME_ADMISSION",
        ),
        "INVALID_CONTEXT_CONJUNCTION": (
            "RECEIPT_AND_APPROVAL_ADMISSION",
        ),
        "REPLAY_DETECTED": ("REPLAY_REGISTRY_ADMISSION",),
        "INVALID_PARENT_RESOURCE_SET": (
            "EXACT_PARENT_BUNDLE_ADMISSION",
        ),
        "INVALID_SECTION_7_3_AUTHORITY": (
            "SECTION_7_3_ROLE_CAPABILITY_ADMISSION",
        ),
        "CURRENT_PARENT_OBLIGATIONS_OPEN": ("OPEN_BLOCKER_HOLD",),
        "ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN": (
            "OPEN_BLOCKER_HOLD",
        ),
        "INVALID_SUT_RESULT": ("CLOSED_NONAUTHORIZING_RESULT",),
    }.get(reason)
    if (
        allowed_stage is None
        or row.failure != decision
        or not any(stage in row.decision_use for stage in allowed_stage)
    ):
        raise ValueError(
            "case expected boundary does not match ledger row stage"
        )




def resolve_immutable_root_sha256(
    packet: RulePacket,
    root_id: str,
) -> str:
    """Resolve a declaration root only from packet-pinned immutable inputs."""
    if root_id.startswith("SCHEMA:"):
        schema_name = root_id[len("SCHEMA:"):]
        try:
            value = packet.closed_schemas[schema_name]
        except KeyError as exc:
            raise ValueError("unknown case declaration immutable root") from exc
        return hashlib.sha256(canonical_json(_thaw(value))).hexdigest()
    if root_id == "PUBLIC_BOUNDARY_SCHEMA_SET_V4":
        return hashlib.sha256(
            canonical_json(_thaw(packet.closed_schemas))
        ).hexdigest()
    if root_id == "SIGNATURE_PROJECTION":
        return hashlib.sha256(
            canonical_json(_thaw(packet.signature_projection))
        ).hexdigest()
    if root_id == "EXACT_PARENT_MANIFEST":
        manifest = [
            {"member_name": entry.member_name, "sha256": entry.sha256}
            for entry in packet.parent_manifest
        ]
        return hashlib.sha256(canonical_json(manifest)).hexdigest()
    if root_id.startswith("PARENT:"):
        member_name = root_id[len("PARENT:"):]
        matches = [
            entry.sha256
            for entry in packet.parent_manifest
            if entry.member_name == member_name
        ]
        if len(matches) != 1:
            raise ValueError("unknown case declaration immutable root")
        return matches[0]

    matches = [
        root for root in packet.compile_pinned_roots
        if root.get("root_id") == root_id
    ]
    if len(matches) != 1:
        raise ValueError("unknown case declaration immutable root")
    root = matches[0]
    if set(root) != {
        "root_id",
        "schema_version",
        "trusted_time",
        "sha256",
    }:
        raise ValueError("compile-pinned root fields are not closed")
    projected = {
        "schema_version": _required_text(root, "schema_version"),
        "trusted_time": _required_text(root, "trusted_time"),
    }
    observed = hashlib.sha256(canonical_json(projected)).hexdigest()
    if observed != _required_text(root, "sha256"):
        raise ValueError("compile-pinned root hash does not match")
    return observed


def _required_text(value: Mapping[str, object], field: str) -> str:
    result = value.get(field)
    if not isinstance(result, str) or not result:
        raise ValueError(f"{field} must be a nonempty string")
    return result


def _required_text_allow_empty(
    value: Mapping[str, object],
    field: str,
) -> str:
    result = value.get(field)
    if not isinstance(result, str):
        raise ValueError(f"{field} must be a string")
    return result


def _text_tuple(
    value: Mapping[str, object],
    field: str,
) -> tuple[str, ...]:
    result = value.get(field)
    if (
        not isinstance(result, tuple)
        or not result
        or not all(isinstance(item, str) and item for item in result)
    ):
        raise ValueError(f"{field} must be a nonempty string tuple")
    return result


def _observation_text(observation: object, field: str) -> str:
    result = getattr(observation, field, None)
    if not isinstance(result, str) or not result:
        raise ValueError("case observation fields are not closed")
    return result


def _thaw(value: object) -> object:
    if isinstance(value, Mapping):
        return {key: _thaw(child) for key, child in value.items()}
    if isinstance(value, tuple):
        return [_thaw(child) for child in value]
    return value
