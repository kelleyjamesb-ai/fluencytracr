"""Executable V4 readiness corpus with an intentional absent-SUT boundary.

This test-only module constructs packet-declared attacks and environment cells,
then asks the independent reference oracle for their governed result.  It does
not implement the Section 7.5.1 evaluator.
"""

from __future__ import annotations

from base64 import b64encode
from contextlib import contextmanager
from dataclasses import dataclass, replace
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
from typing import Callable, ContextManager, Iterator, Mapping, Sequence

from tests.gcp_s751_v4.bundle import open_harness_bundle
from tests.gcp_s751_v4.crypto import sign_ephemeral_batch
from tests.gcp_s751_v4.ledger import build_rule_ledger
from tests.gcp_s751_v4.model import (
    EvaluationResult,
    RulePacket,
    canonical_json,
    load_exact_parents,
    load_packet,
    signature_preimage,
    strict_load_json,
)
from tests.gcp_s751_v4.oracle import ReferenceOracle


ROOT = Path(__file__).resolve().parents[2]
SUT_PATH = ROOT / (
    "scripts/gcp_section_7_5_parent_contract_authority_closure_v4.py"
)
_IDENTIFIER_PROBE = "synthetic-probe@example.invalid"
_NODE_EXECUTABLE = Path(shutil.which("node") or "").resolve(strict=True)
_REFERENCE_CHILD_SOURCE = "\n".join(
    (
        "from base64 import b64decode",
        "from dataclasses import asdict",
        "import os",
        "import sys",
        "from tests.gcp_s751_v4.model import canonical_json, strict_load_json",
        "from tests.gcp_s751_v4.oracle import ReferenceOracle",
        "request = strict_load_json(sys.stdin.buffer.read())",
        "assert isinstance(request, dict)",
        "assert set(request) == {'anchor', 'candidate', 'envelope'}",
        "incoming_fd = int(sys.argv[1])",
        "normalized_fd = int(sys.argv[2])",
        "os.dup2(incoming_fd, normalized_fd)",
        "result = ReferenceOracle().evaluate(",
        "    b64decode(request['candidate'], validate=True),",
        "    b64decode(request['envelope'], validate=True),",
        "    b64decode(request['anchor'], validate=True),",
        "    normalized_fd,",
        ")",
        "sys.stdout.buffer.write(canonical_json(asdict(result)))",
    )
)


@dataclass(frozen=True)
class PreparedCase:
    case_id: str
    attack_id: str
    candidate_bytes: bytes
    envelope_bytes: bytes
    admitted_anchor_spki: bytes
    bundle_factory: Callable[[], ContextManager[int]]
    expected: EvaluationResult
    covered_rule_ids: tuple[str, ...]


@dataclass(frozen=True)
class MetamorphicGroup:
    group_id: str
    equivalent_cases: tuple[PreparedCase, ...]
    varied_artifacts: tuple[str, ...]


@dataclass(frozen=True)
class EnvironmentCell:
    environment: str
    resource_state: str
    command: str
    expected_exit: str
    expected_disposition: str
    claim_grade: str
    authority_effect: str
    executable: bool
    case: PreparedCase | None


@dataclass(frozen=True)
class _CaseDraft:
    case_id: str
    attack_id: str
    candidate_bytes: bytes
    envelope_bytes: bytes
    admitted_anchor_spki: bytes
    bundle_factory: Callable[[], ContextManager[int]]
    target_resources: tuple[str, ...]


@dataclass(frozen=True)
class _Corpus:
    attack_cases: tuple[PreparedCase, ...]
    metamorphic_groups: tuple[MetamorphicGroup, ...]
    environment_cells: tuple[EnvironmentCell, ...]
    fd_cases: tuple[PreparedCase, PreparedCase]


_CORPUS: _Corpus | None = None


def build_attack_cases(packet: RulePacket) -> tuple[PreparedCase, ...]:
    """Build and score every packet-declared attack and metamorphic case."""
    _require_current_packet(packet)
    return _corpus().attack_cases


def build_metamorphic_groups(
    packet: RulePacket,
) -> tuple[MetamorphicGroup, ...]:
    """Return semantic-equivalence groups for keys, aliases, and descriptors."""
    _require_current_packet(packet)
    return _corpus().metamorphic_groups


def build_environment_cells(
    packet: RulePacket,
) -> tuple[EnvironmentCell, ...]:
    """Construct the eight executable cells and preserve four live non-runs."""
    _require_current_packet(packet)
    return _corpus().environment_cells


def build_fd_discriminator_cases() -> tuple[PreparedCase, PreparedCase]:
    """Return exact and corrupt semantics for one normalized child descriptor."""
    return _corpus().fd_cases


def evaluate_reference_case(case: PreparedCase) -> EvaluationResult:
    """Evaluate only normative case inputs, never case metadata."""
    with case.bundle_factory() as reference_fd:
        return ReferenceOracle().evaluate(
            candidate_bytes=case.candidate_bytes,
            signed_context_envelope_bytes=case.envelope_bytes,
            verifier_anchor_spki=case.admitted_anchor_spki,
            trusted_parent_bundle_fd=reference_fd,
        )


def evaluate_in_isolated_children_with_dup2(
    normalized_fd: int,
    cases: Sequence[PreparedCase],
) -> tuple[EvaluationResult, ...]:
    """Evaluate each semantic case in a child under the same descriptor number."""
    if type(normalized_fd) is not int or normalized_fd < 3:
        raise ValueError("normalized descriptor must be an integer >= 3")
    prepared = tuple(cases)
    if not prepared or not all(isinstance(case, PreparedCase) for case in prepared):
        raise ValueError("isolated evaluation requires prepared cases")

    outcomes: list[EvaluationResult] = []
    for case in prepared:
        request = canonical_json(
            {
                "anchor": b64encode(
                    case.admitted_anchor_spki
                ).decode("ascii"),
                "candidate": b64encode(
                    case.candidate_bytes
                ).decode("ascii"),
                "envelope": b64encode(
                    case.envelope_bytes
                ).decode("ascii"),
            }
        )
        with case.bundle_factory() as reference_fd:
            completed = subprocess.run(
                [
                    str(Path(sys.executable).resolve(strict=True)),
                    "-c",
                    _REFERENCE_CHILD_SOURCE,
                    str(reference_fd),
                    str(normalized_fd),
                ],
                cwd=ROOT,
                env={
                    "LC_ALL": "C",
                    "PATH": str(_NODE_EXECUTABLE.parent),
                    "PYTHONHASHSEED": "0",
                    "TZ": "UTC",
                },
                input=request,
                pass_fds=(reference_fd,),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=30,
            )
        if completed.returncode != 0 or completed.stderr:
            raise AssertionError("isolated reference child failed")
        outcomes.append(parse_closed_result_bytes(completed.stdout))
    return tuple(outcomes)


def invoke_future_sut(case: PreparedCase) -> EvaluationResult:
    """Prove construction and oracle truth before the intentional absent-SUT red."""
    observed_reference = evaluate_reference_case(case)
    assert case.expected == observed_reference
    if not SUT_PATH.exists():
        raise AssertionError("MISSING_SUT")
    observed_sut = _invoke_closed_child(case)
    if observed_sut != case.expected:
        raise AssertionError("SUT_ORACLE_MISMATCH")
    return observed_sut


def parse_closed_result_bytes(data: bytes) -> EvaluationResult:
    """Admit exactly one canonical, closed five-field child result."""
    try:
        value = strict_load_json(data)
    except ValueError as exc:
        raise AssertionError("INVALID_SUT_RESULT") from exc
    if not isinstance(value, dict) or set(value) != {
        "schema_version",
        "decision",
        "reason",
        "authority_effect",
        "claim_grade",
    }:
        raise AssertionError("INVALID_SUT_RESULT")
    try:
        return EvaluationResult(
            schema_version=value["schema_version"],
            decision=value["decision"],
            reason=value["reason"],
            authority_effect=value["authority_effect"],
            claim_grade=value["claim_grade"],
        )
    except (TypeError, ValueError) as exc:
        raise AssertionError("INVALID_SUT_RESULT") from exc


def _corpus() -> _Corpus:
    global _CORPUS
    if _CORPUS is None:
        _CORPUS = _build_corpus(load_packet())
    return _CORPUS


def _build_corpus(packet: RulePacket) -> _Corpus:
    candidate = _valid_candidate(packet)
    candidate_bytes = canonical_json(candidate)
    base_payload = _base_payload(packet, candidate_bytes, "CLEAN_CI")
    base_candidate, base_envelope, base_anchor = _sign_material(
        packet, candidate_bytes, base_payload
    )
    exact_factory = _bundle_factory(packet, "EXACT")

    attack_drafts: list[_CaseDraft] = []
    metamorphic_drafts: dict[str, list[_CaseDraft]] = {
        "M001": [],
        "M002": [],
        "M003": [],
    }
    fd_drafts: list[_CaseDraft] = []

    attacks = _attack_entries(packet)
    for attack in attacks:
        attack_id = _required_attack_text(attack, "attack_id")
        generators = _attack_generators(attack)
        for generator in generators:
            generated = _generate_cases(
                packet=packet,
                attack_id=attack_id,
                generator=generator,
                candidate=candidate,
                base_candidate=base_candidate,
                base_envelope=base_envelope,
                base_anchor=base_anchor,
                exact_factory=exact_factory,
            )
            if attack_id in metamorphic_drafts:
                metamorphic_drafts[attack_id].extend(generated)
            elif attack_id == "M004":
                fd_drafts.extend(generated)
            else:
                attack_drafts.extend(generated)

    scored_attacks = [_score_draft(draft) for draft in attack_drafts]
    scored_groups: list[MetamorphicGroup] = []
    varied = {
        "M001": ("ephemeral_key", "signature"),
        "M002": ("context_bound_synthetic_alias",),
        "M003": ("descriptor_number",),
    }
    for attack_id in ("M001", "M002", "M003"):
        equivalents = tuple(
            _score_draft(draft) for draft in metamorphic_drafts[attack_id]
        )
        if len(equivalents) < 2:
            raise ValueError("metamorphic generator did not create equivalents")
        scored_groups.append(
            MetamorphicGroup(
                group_id=attack_id,
                equivalent_cases=equivalents,
                varied_artifacts=varied[attack_id],
            )
        )
        scored_attacks.extend(equivalents)

    if len(fd_drafts) != 2:
        raise ValueError("descriptor discriminator must create two cases")
    fd_cases = tuple(_score_draft(draft) for draft in fd_drafts)
    if len(fd_cases) != 2:
        raise ValueError("descriptor discriminator must create two cases")
    scored_attacks.extend(fd_cases)

    scored_attacks = list(
        _assign_ledger_coverage(
            packet,
            tuple(scored_attacks),
            tuple(
                attack_drafts
                + [
                    draft
                    for attack_id in ("M001", "M002", "M003")
                    for draft in metamorphic_drafts[attack_id]
                ]
                + fd_drafts
            ),
        )
    )
    scored_by_id = {case.case_id: case for case in scored_attacks}
    scored_groups = [
        replace(
            group,
            equivalent_cases=tuple(
                scored_by_id[case.case_id] for case in group.equivalent_cases
            ),
        )
        for group in scored_groups
    ]
    fd_pair = (
        scored_by_id[fd_cases[0].case_id],
        scored_by_id[fd_cases[1].case_id],
    )
    environments = _build_environment_cells(packet)

    expected_attack_ids = {
        _required_attack_text(attack, "attack_id") for attack in attacks
    }
    if {case.attack_id for case in scored_attacks} != expected_attack_ids:
        raise ValueError("packet attack catalog did not construct exactly")
    return _Corpus(
        attack_cases=tuple(scored_attacks),
        metamorphic_groups=tuple(scored_groups),
        environment_cells=environments,
        fd_cases=fd_pair,
    )


def _generate_cases(
    *,
    packet: RulePacket,
    attack_id: str,
    generator: str,
    candidate: dict[str, object],
    base_candidate: bytes,
    base_envelope: bytes,
    base_anchor: bytes,
    exact_factory: Callable[[], ContextManager[int]],
) -> list[_CaseDraft]:
    prefix = f"{attack_id.lower()}-{generator.lower().replace('_', '-')}"

    def draft(
        suffix: str,
        *,
        candidate_bytes: bytes = base_candidate,
        envelope_bytes: bytes = base_envelope,
        anchor: bytes = base_anchor,
        bundle_factory: Callable[[], ContextManager[int]] = exact_factory,
        resources: tuple[str, ...] = ("*",),
    ) -> _CaseDraft:
        case_id = prefix if not suffix else f"{prefix}-{suffix}"
        return _CaseDraft(
            case_id=case_id,
            attack_id=attack_id,
            candidate_bytes=candidate_bytes,
            envelope_bytes=envelope_bytes,
            admitted_anchor_spki=anchor,
            bundle_factory=bundle_factory,
            target_resources=resources,
        )

    if generator.startswith("RAW_CANDIDATE_"):
        value = _copy_json(candidate)
        if generator.endswith("UNKNOWN_FIELD"):
            value["unexpected"] = 0
            data = canonical_json(value)
        elif generator.endswith("MISSING_FIELD"):
            value.pop("requested_action")
            data = canonical_json(value)
        elif generator.endswith("WRONG_TYPE"):
            value["requested_action"] = 0
            data = canonical_json(value)
        else:
            raise ValueError("unknown candidate raw generator")
        return [draft("", candidate_bytes=data, resources=("candidate",))]

    if generator.startswith("RAW_PAYLOAD_"):
        envelope = _decode_envelope(base_envelope)
        payload = envelope["payload"]
        if not isinstance(payload, dict):
            raise ValueError("base payload is not an object")
        if generator.endswith("UNKNOWN_FIELD"):
            payload["unexpected"] = 0
        elif generator.endswith("MISSING_FIELD"):
            payload.pop("policy_id")
        elif generator.endswith("WRONG_TYPE"):
            payload["policy_id"] = 0
        else:
            raise ValueError("unknown payload raw generator")
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
                resources=("signed_context_payload",),
            )
        ]

    if generator.startswith("RAW_ENVELOPE_"):
        envelope = _decode_envelope(base_envelope)
        if generator.endswith("UNKNOWN_FIELD"):
            envelope["unexpected"] = 0
        elif generator.endswith("MISSING_FIELD"):
            envelope.pop("algorithm")
        elif generator.endswith("WRONG_TYPE"):
            envelope["algorithm"] = 0
        else:
            raise ValueError("unknown envelope raw generator")
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
                resources=("signed_context_envelope",),
            )
        ]

    if generator.startswith("RAW_NONCE_"):
        envelope = _decode_envelope(base_envelope)
        nonce_time = _payload(envelope)["nonce_time"]
        if not isinstance(nonce_time, dict):
            raise ValueError("base nonce/time is not an object")
        if generator.endswith("UNKNOWN_FIELD"):
            nonce_time["unexpected"] = 0
        elif generator.endswith("MISSING_FIELD"):
            nonce_time.pop("trusted_time")
        elif generator.endswith("WRONG_TYPE"):
            nonce_time["trusted_time"] = 0
        else:
            raise ValueError("unknown nonce raw generator")
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
                resources=("nonce_time",),
            )
        ]

    if generator == "CANDIDATE_NESTED_EXTRA_FIELD":
        value = _copy_json(candidate)
        observation = value["observation"]
        if not isinstance(observation, dict):
            raise ValueError("candidate observation is not an object")
        observation["unexpected"] = 0
        return [
            draft(
                "",
                candidate_bytes=canonical_json(value),
                resources=("candidate",),
            )
        ]

    if generator == "PAYLOAD_NESTED_EXTRA_FIELD":
        envelope = _decode_envelope(base_envelope)
        manifest = _payload(envelope)["parent_manifest"]
        if not isinstance(manifest, list) or not isinstance(manifest[0], dict):
            raise ValueError("base manifest is not closed")
        manifest[0]["unexpected"] = 0
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
                resources=("signed_context_payload",),
            )
        ]

    if generator == "CANDIDATE_TRUNCATION":
        return [
            draft(
                "",
                candidate_bytes=base_candidate[:-1],
                resources=("candidate",),
            )
        ]

    if generator == "ENVELOPE_TRUNCATION":
        return [
            draft(
                "",
                envelope_bytes=base_envelope[:-1],
                resources=("signed_context_envelope",),
            )
        ]

    if generator in {"CANDIDATE_SUBSTITUTION", "CANDIDATE_SPLICE"}:
        value = _copy_json(candidate)
        observation = value["observation"]
        if not isinstance(observation, dict):
            raise ValueError("candidate observation is not an object")
        observation["synthetic_aliases"] = [
            _synthetic_alias(base_candidate)
        ]
        return [
            draft(
                "",
                candidate_bytes=canonical_json(value),
                resources=("candidate",),
            )
        ]

    if generator == "PAYLOAD_SUBSTITUTION":
        envelope = _decode_envelope(base_envelope)
        _payload(envelope)["candidate_sha256"] = "1" * 64
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
                resources=("signed_context_payload",),
            )
        ]

    if generator == "PAYLOAD_SPLICE":
        envelope = _decode_envelope(base_envelope)
        payload = _base_payload(packet, base_candidate, "CLEAN_CI")
        payload["nonce_time"]["nonce"] = secrets.token_hex(16)
        _, alternate_envelope, _ = _sign_material(
            packet, base_candidate, payload
        )
        envelope["payload"] = _payload(
            _decode_envelope(alternate_envelope)
        )
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
                resources=("signed_context_payload",),
            )
        ]

    if generator == "SIGNATURE_SPLICE":
        payload = _base_payload(packet, base_candidate, "CLEAN_CI")
        _, alternate_envelope, _ = _sign_material(
            packet, base_candidate, payload
        )
        envelope = _decode_envelope(base_envelope)
        alternate = _decode_envelope(alternate_envelope)
        envelope["signature_der_base64"] = alternate[
            "signature_der_base64"
        ]
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
                resources=("signed_context_envelope", "verifier_anchor"),
            )
        ]

    if generator == "EACH_PARENT_SUBSTITUTION":
        return [
            draft(
                str(index + 1),
                bundle_factory=_bundle_factory(
                    packet,
                    "MUTATED_JSON",
                    target_member=entry.member_name,
                    parent_mutator=_mutate_first_scalar,
                ),
                resources=(entry.member_name,),
            )
            for index, entry in enumerate(packet.parent_manifest)
        ]

    if generator == "EACH_PARENT_SPLICE":
        return [
            draft(
                str(index + 1),
                bundle_factory=_bundle_factory(
                    packet, "SPLICE", target_member=entry.member_name
                ),
                resources=(entry.member_name,),
            )
            for index, entry in enumerate(packet.parent_manifest)
        ]

    if generator in {"FORGED_RECEIPT", "FORGED_PROVENANCE"}:
        payload = _base_payload(packet, base_candidate, "CLEAN_CI")
        if generator == "FORGED_RECEIPT":
            payload["receipt_sha256"] = "0" * 64
            resources = (
                "signed_context_payload",
                "replay",
                "attestation-receipt-contract.json",
            )
        else:
            payload["current_head_sha256"] = "0" * 64
            payload["anti_rollback_sha256"] = "0" * 64
            resources = ("signed_context_payload", "replay")
        _, envelope, anchor = _sign_material(
            packet, base_candidate, payload
        )
        return [
            draft(
                "",
                envelope_bytes=envelope,
                anchor=anchor,
                resources=resources,
            )
        ]

    if generator == "PROCESS_LOCAL_REPLAY":
        return [
            draft(
                "",
                resources=(
                    "signed_context_payload",
                    "signed_context_envelope",
                    "verifier_anchor",
                    "nonce_time",
                    "replay",
                    "attestation-receipt-contract.json",
                ),
            )
        ]

    if generator == "ALTERNATE_ANCHOR_FULL_RESEAL":
        value = _copy_json(candidate)
        observation = value["observation"]
        if not isinstance(observation, dict):
            raise ValueError("candidate observation is not an object")
        observation["synthetic_aliases"] = [
            _synthetic_alias(base_candidate)
        ]
        resealed_candidate = canonical_json(value)
        payload = _base_payload(packet, resealed_candidate, "CLEAN_CI")
        _, envelope, _alternate_anchor = _sign_material(
            packet, resealed_candidate, payload
        )
        return [
            draft(
                "",
                candidate_bytes=resealed_candidate,
                envelope_bytes=envelope,
                anchor=base_anchor,
                resources=(
                    "signed_context_payload",
                    "signed_context_envelope",
                    "verifier_anchor",
                    "replay",
                    "attestation-receipt-contract.json",
                ),
            )
        ]

    if generator == "ALL_TIME_FIELDS_RESEAL":
        payload = _base_payload(packet, base_candidate, "CLEAN_CI")
        payload["nonce_time"] = {
            "nonce": secrets.token_hex(16),
            "valid_from": "2026-07-31T00:00:00Z",
            "valid_until": "2026-07-31T00:10:00Z",
            "trusted_time": "2026-07-31T00:05:00Z",
        }
        _, envelope, anchor = _sign_material(
            packet, base_candidate, payload
        )
        return [
            draft(
                "",
                envelope_bytes=envelope,
                anchor=anchor,
                resources=(
                    "signed_context_payload",
                    "signed_context_envelope",
                    "nonce_time",
                    "replay",
                    "attestation-receipt-contract.json",
                ),
            )
        ]

    if generator in {"STALE_TIME", "FUTURE_TIME"}:
        payload = _base_payload(packet, base_candidate, "CLEAN_CI")
        payload["nonce_time"] = {
            "nonce": secrets.token_hex(16),
            "valid_from": "2026-07-30T00:00:00Z",
            "valid_until": "2026-07-30T00:10:00Z",
            "trusted_time": (
                "2026-07-29T23:59:59Z"
                if generator == "STALE_TIME"
                else "2026-07-30T00:10:01Z"
            ),
        }
        _, envelope, anchor = _sign_material(
            packet, base_candidate, payload
        )
        return [
            draft(
                "",
                envelope_bytes=envelope,
                anchor=anchor,
                resources=("signed_context_payload", "nonce_time"),
            )
        ]

    if generator == "MODE_CONFUSION":
        payload = _base_payload(packet, base_candidate, "CLEAN_CI")
        payload["mode"] = "CLEAN_ARCHIVE"
        _, envelope, anchor = _sign_material(
            packet, base_candidate, payload
        )
        return [
            draft(
                "",
                envelope_bytes=envelope,
                anchor=anchor,
                resources=("signed_context_payload",),
            )
        ]

    if generator == "AMBIENT_FALLBACK":
        return [
            draft(
                "",
                bundle_factory=_bundle_factory(packet, "ABSENT"),
                resources=("bundle_capability",),
            )
        ]

    if generator == "EACH_PARENT_MISSING":
        return [
            draft(
                str(index + 1),
                bundle_factory=_bundle_factory(
                    packet, "PARTIAL", target_member=entry.member_name
                ),
                resources=("bundle_capability", entry.member_name),
            )
            for index, entry in enumerate(packet.parent_manifest)
        ]

    if generator == "EACH_PARENT_CORRUPT":
        return [
            draft(
                str(index + 1),
                bundle_factory=_bundle_factory(
                    packet, "CORRUPT", target_member=entry.member_name
                ),
                resources=("bundle_capability", entry.member_name),
            )
            for index, entry in enumerate(packet.parent_manifest)
        ]

    resource_variant = {
        "EXTRA_MEMBER": "EXTRA",
        "NONREGULAR_MEMBER": "NONREGULAR",
        "SYMLINK_MEMBER": "SYMLINK",
        "REPLACED_MEMBER": "REPLACED",
        "CONCURRENT_REPLACEMENT": "CONCURRENT",
    }.get(generator)
    if resource_variant is not None:
        return [
            draft(
                "",
                bundle_factory=_bundle_factory(packet, resource_variant),
                resources=("bundle_capability",) + (
                    (packet.parent_manifest[0].member_name,)
                    if resource_variant != "EXTRA"
                    else ()
                ),
            )
        ]

    if generator == "EVERY_PUBLIC_STRING_PATH":
        return _privacy_probe_drafts(
            packet=packet,
            attack_id=attack_id,
            prefix=prefix,
            candidate=candidate,
            base_candidate=base_candidate,
            base_envelope=base_envelope,
            base_anchor=base_anchor,
            exact_factory=exact_factory,
        )

    if (
        generator.startswith("EVERY_SECTION_7_3_")
        or generator == "EVERY_PREREQUISITE_OWNER"
    ):
        return _authority_drafts(
            packet=packet,
            attack_id=attack_id,
            prefix=prefix,
            generator=generator,
            base_candidate=base_candidate,
            base_envelope=base_envelope,
            base_anchor=base_anchor,
            exact_factory=exact_factory,
        )

    if generator == "EPHEMERAL_KEY_EQUIVALENCE":
        drafts: list[_CaseDraft] = []
        for ordinal in range(2):
            payload = _base_payload(packet, base_candidate, "CLEAN_CI")
            _, envelope, anchor = _sign_material(
                packet, base_candidate, payload
            )
            drafts.append(
                draft(
                    str(ordinal + 1),
                    envelope_bytes=envelope,
                    anchor=anchor,
                    resources=(),
                )
            )
        return drafts

    if generator == "SYNTHETIC_ALIAS_EQUIVALENCE":
        drafts = []
        for ordinal in range(2):
            value = _copy_json(candidate)
            observation = value["observation"]
            if not isinstance(observation, dict):
                raise ValueError("candidate observation is not an object")
            observation["synthetic_aliases"] = [
                _synthetic_alias(base_candidate)
            ]
            varied_candidate = canonical_json(value)
            payload = _base_payload(packet, varied_candidate, "CLEAN_CI")
            _, envelope, anchor = _sign_material(
                packet, varied_candidate, payload
            )
            drafts.append(
                draft(
                    str(ordinal + 1),
                    candidate_bytes=varied_candidate,
                    envelope_bytes=envelope,
                    anchor=anchor,
                    resources=(),
                )
            )
        return drafts

    if generator == "DESCRIPTOR_NUMBER_EQUIVALENCE":
        return [
            draft(
                "1",
                bundle_factory=_bundle_factory(packet, "EXACT", fd_padding=0),
                resources=(),
            ),
            draft(
                "2",
                bundle_factory=_bundle_factory(packet, "EXACT", fd_padding=9),
                resources=(),
            ),
        ]

    if generator == "SAME_NORMALIZED_DESCRIPTOR_OPPOSING_OUTCOMES":
        return [
            draft(
                "exact",
                bundle_factory=_bundle_factory(packet, "EXACT"),
                resources=(),
            ),
            draft(
                "corrupt",
                bundle_factory=_bundle_factory(packet, "CORRUPT"),
                resources=(),
            ),
        ]

    raise ValueError(f"unknown packet attack generator: {generator}")


def _privacy_probe_drafts(
    *,
    packet: RulePacket,
    attack_id: str,
    prefix: str,
    candidate: dict[str, object],
    base_candidate: bytes,
    base_envelope: bytes,
    base_anchor: bytes,
    exact_factory: Callable[[], ContextManager[int]],
) -> list[_CaseDraft]:
    drafts: list[_CaseDraft] = []
    boundaries = (
        "candidate",
        "signed_context_payload",
        "signed_context_envelope",
        "verifier_anchor",
        "nonce_time",
    )
    for boundary in boundaries:
        schema = packet.closed_schemas[boundary]
        fields = schema["fields"]
        if not isinstance(fields, tuple):
            raise ValueError("closed schema fields are not frozen")
        string_paths = [
            field["pointer"]
            for field in fields
            if isinstance(field, Mapping) and field.get("type") == "STRING"
        ]
        for ordinal, pointer in enumerate(string_paths):
            suffix = f"{boundary.replace('_', '-')}-{ordinal + 1}"
            candidate_bytes = base_candidate
            envelope_bytes = base_envelope
            anchor = base_anchor
            if boundary == "candidate":
                value = _candidate_for_pointer(candidate, pointer)
                _set_pointer_probe(value, pointer)
                candidate_bytes = canonical_json(value)
            elif boundary == "signed_context_payload":
                envelope = _decode_envelope(base_envelope)
                _set_pointer_probe(_payload(envelope), pointer)
                envelope_bytes = canonical_json(envelope)
            elif boundary == "signed_context_envelope":
                envelope = _decode_envelope(base_envelope)
                _set_pointer_probe(envelope, pointer)
                envelope_bytes = canonical_json(envelope)
            elif boundary == "nonce_time":
                envelope = _decode_envelope(base_envelope)
                nonce_time = _payload(envelope)["nonce_time"]
                if not isinstance(nonce_time, dict):
                    raise ValueError("base nonce/time is not an object")
                _set_pointer_probe(nonce_time, pointer)
                envelope_bytes = canonical_json(envelope)
            else:
                anchor = _IDENTIFIER_PROBE.encode("ascii")
            drafts.append(
                _CaseDraft(
                    case_id=f"{prefix}-{suffix}",
                    attack_id=attack_id,
                    candidate_bytes=candidate_bytes,
                    envelope_bytes=envelope_bytes,
                    admitted_anchor_spki=anchor,
                    bundle_factory=exact_factory,
                    target_resources=(boundary,),
                )
            )
    return drafts


def _authority_drafts(
    *,
    packet: RulePacket,
    attack_id: str,
    prefix: str,
    generator: str,
    base_candidate: bytes,
    base_envelope: bytes,
    base_anchor: bytes,
    exact_factory: Callable[[], ContextManager[int]],
) -> list[_CaseDraft]:
    parents = {
        name: json.loads(data)
        for name, data in load_exact_parents(packet).items()
    }
    if generator == "EVERY_SECTION_7_3_ROLE":
        member = "role-capability-matrix.json"
        values = parents[member]["roles"]
        field = "role_id"
    elif generator == "EVERY_SECTION_7_3_CAPABILITY":
        member = "role-capability-matrix.json"
        values = parents[member]["capabilities"]
        field = "capability_id"
    elif generator == "EVERY_SECTION_7_3_HSM_PURPOSE":
        member = "security-authority-contract.json"
        values = parents[member]["policy_template"]["hsm_key_profiles"]
        field = "key_purpose_id"
    elif generator == "EVERY_PREREQUISITE_OWNER":
        member = "constraints-open-obligations-contract.json"
        values = parents[member]["open_prerequisite_registry"]
        field = "owner"
    else:
        raise ValueError("unknown authority generator")
    if not isinstance(values, list):
        raise ValueError("authority source is not a list")

    drafts: list[_CaseDraft] = []
    for index in range(len(values)):
        def mutate(value: dict[str, object], *, position: int = index) -> None:
            if generator == "EVERY_SECTION_7_3_ROLE":
                target = value["roles"][position]
            elif generator == "EVERY_SECTION_7_3_CAPABILITY":
                target = value["capabilities"][position]
            elif generator == "EVERY_SECTION_7_3_HSM_PURPOSE":
                target = value["policy_template"]["hsm_key_profiles"][position]
            else:
                target = value["open_prerequisite_registry"][position]
            target[field] = "UNRECOGNIZED_AUTHORITY_VALUE"

        drafts.append(
            _CaseDraft(
                case_id=f"{prefix}-{index + 1}",
                attack_id=attack_id,
                candidate_bytes=base_candidate,
                envelope_bytes=base_envelope,
                admitted_anchor_spki=base_anchor,
                bundle_factory=_bundle_factory(
                    packet,
                    "MUTATED_JSON",
                    target_member=member,
                    parent_mutator=mutate,
                ),
                target_resources=(member,),
            )
        )
    return drafts


def _build_environment_cells(
    packet: RulePacket,
) -> tuple[EnvironmentCell, ...]:
    signed_by_mode: dict[str, tuple[bytes, bytes, bytes]] = {}
    cells: list[EnvironmentCell] = []
    for row in packet.environment_table:
        environment = _required_attack_text(row, "environment")
        resource_state = _required_attack_text(row, "resource_state")
        command = _required_attack_text(row, "command")
        expected_exit = _required_attack_text(row, "expected_exit")
        expected_disposition = _required_attack_text(
            row, "expected_disposition"
        )
        claim_grade = _required_attack_text(row, "claim_grade")
        authority_effect = _required_attack_text(row, "authority_effect")
        executable = environment != "LIVE_RUNTIME"
        prepared: PreparedCase | None = None
        if executable:
            if environment not in signed_by_mode:
                candidate = canonical_json(_valid_candidate(packet))
                payload = _base_payload(packet, candidate, environment)
                signed_by_mode[environment] = _sign_material(
                    packet, candidate, payload
                )
            candidate, envelope, anchor = signed_by_mode[environment]
            draft = _CaseDraft(
                case_id=(
                    "environment-"
                    f"{environment.lower().replace('_', '-')}-"
                    f"{resource_state.lower()}"
                ),
                attack_id="ENVIRONMENT",
                candidate_bytes=candidate,
                envelope_bytes=envelope,
                admitted_anchor_spki=anchor,
                bundle_factory=_bundle_factory(packet, resource_state),
                target_resources=(),
            )
            prepared = _score_draft(draft)
            observed_disposition = (
                f"{prepared.expected.decision}:{prepared.expected.reason}"
            )
            if (
                observed_disposition != expected_disposition
                or prepared.expected.claim_grade != claim_grade
                or prepared.expected.authority_effect != authority_effect
            ):
                raise ValueError("environment oracle disagrees with packet")
        elif command != "NOT_AUTHORIZED" or expected_exit != "NOT_RUN":
            raise ValueError("live environment cell is not a non-run")
        cells.append(
            EnvironmentCell(
                environment=environment,
                resource_state=resource_state,
                command=command,
                expected_exit=expected_exit,
                expected_disposition=expected_disposition,
                claim_grade=claim_grade,
                authority_effect=authority_effect,
                executable=executable,
                case=prepared,
            )
        )
    return tuple(cells)


def _score_draft(draft: _CaseDraft) -> PreparedCase:
    try:
        with draft.bundle_factory() as reference_fd:
            expected = ReferenceOracle().evaluate(
                candidate_bytes=draft.candidate_bytes,
                signed_context_envelope_bytes=draft.envelope_bytes,
                verifier_anchor_spki=draft.admitted_anchor_spki,
                trusted_parent_bundle_fd=reference_fd,
            )
    except Exception as exc:
        raise ValueError(
            f"case setup failed before oracle evaluation: {draft.case_id}"
        ) from exc
    return PreparedCase(
        case_id=draft.case_id,
        attack_id=draft.attack_id,
        candidate_bytes=draft.candidate_bytes,
        envelope_bytes=draft.envelope_bytes,
        admitted_anchor_spki=draft.admitted_anchor_spki,
        bundle_factory=draft.bundle_factory,
        expected=expected,
        covered_rule_ids=(),
    )


def _assign_ledger_coverage(
    packet: RulePacket,
    cases: tuple[PreparedCase, ...],
    drafts: tuple[_CaseDraft, ...],
) -> tuple[PreparedCase, ...]:
    if [case.case_id for case in cases] != [draft.case_id for draft in drafts]:
        raise ValueError("case/draft ordering diverged")
    mutable: dict[str, set[str]] = {case.case_id: set() for case in cases}
    cases_by_attack: dict[str, list[tuple[PreparedCase, _CaseDraft]]] = {}
    for case, draft in zip(cases, drafts):
        cases_by_attack.setdefault(case.attack_id, []).append((case, draft))

    next_case: dict[tuple[str, str], int] = {}
    for row in build_rule_ledger(packet):
        for attack_id in row.attack_ids:
            candidates = cases_by_attack.get(attack_id, [])
            if not candidates:
                raise ValueError("ledger attack has no executable case")
            matching = [
                pair for pair in candidates
                if "*" in pair[1].target_resources
                or row.resource in pair[1].target_resources
            ]
            available = matching or candidates
            cursor_key = (attack_id, row.resource)
            cursor = next_case.get(cursor_key, 0)
            chosen = available[cursor % len(available)][0]
            next_case[cursor_key] = cursor + 1
            mutable[chosen.case_id].add(row.rule_id)

    return tuple(
        replace(
            case,
            covered_rule_ids=tuple(sorted(mutable[case.case_id])),
        )
        for case in cases
    )


def _valid_candidate(packet: RulePacket) -> dict[str, object]:
    parents = load_exact_parents(packet)
    matrix = json.loads(parents["role-capability-matrix.json"])
    return {
        "schema_version": "GCP_SECTION_7_5_1_CANDIDATE_V4",
        "requested_action": "EVALUATE_ONLY",
        "observation": {
            "governed_roles": sorted(
                role["role_id"] for role in matrix["roles"]
            ),
            "synthetic_aliases": [],
            "controller_edges": [],
            "controller_cycles": [],
            "unknown_edge_count": 0,
        },
    }


def _base_payload(
    packet: RulePacket,
    candidate_bytes: bytes,
    mode: str,
) -> dict[str, object]:
    manifest = [
        {"member_name": entry.member_name, "sha256": entry.sha256}
        for entry in packet.parent_manifest
    ]
    receipt_sha256 = next(
        entry.sha256
        for entry in packet.parent_manifest
        if entry.member_name == "attestation-receipt-contract.json"
    )
    role_matrix_sha256 = next(
        entry.sha256
        for entry in packet.parent_manifest
        if entry.member_name == "role-capability-matrix.json"
    )
    head_sha256 = hashlib.sha256(
        bytes.fromhex(packet.base_commit)
    ).hexdigest()
    return {
        "schema_version": "GCP_SECTION_7_5_1_SIGNED_CONTEXT_PAYLOAD_V4",
        "policy_id": "FT_CANONICAL_JSON_V1",
        "candidate_sha256": hashlib.sha256(candidate_bytes).hexdigest(),
        "mode": mode,
        "parent_manifest": manifest,
        "registry_sha256": hashlib.sha256(
            canonical_json(manifest)
        ).hexdigest(),
        "receipt_sha256": receipt_sha256,
        "approval_target_sha256": receipt_sha256,
        "current_head_sha256": head_sha256,
        "anti_rollback_sha256": head_sha256,
        "role_matrix_sha256": role_matrix_sha256,
        "signer_purpose": "RUNTIME_RECEIPT_SIGNING_CRYPTOKEY",
        "nonce_time": {
            "nonce": secrets.token_hex(16),
            "valid_from": "2026-07-30T00:00:00Z",
            "valid_until": "2026-07-30T00:10:00Z",
            "trusted_time": "2026-07-30T00:05:00Z",
        },
        "authority_effect": "NONE",
    }


def _sign_material(
    packet: RulePacket,
    candidate_bytes: bytes,
    payload: dict[str, object],
) -> tuple[bytes, bytes, bytes]:
    signed = sign_ephemeral_batch([signature_preimage(packet, payload)])
    signed_payload = _copy_json(payload)
    signed_payload["key_id"] = signed.key_id
    envelope = {
        "schema_version": "GCP_SECTION_7_5_1_SIGNED_CONTEXT_ENVELOPE_V4",
        "algorithm": "ECDSA_P256_SHA256_DER",
        "payload": signed_payload,
        "signature_der_base64": b64encode(
            signed.vectors[0].signature_der
        ).decode("ascii"),
    }
    return candidate_bytes, canonical_json(envelope), signed.anchor_spki_der


@contextmanager
def _open_bundle(
    packet: RulePacket,
    variant: str,
    target_member: str | None,
    parent_mutator: Callable[[dict[str, object]], None] | None,
    fd_padding: int,
) -> Iterator[int]:
    parents = load_exact_parents(packet)
    target = target_member or packet.parent_manifest[0].member_name
    padding_fds: list[int] = []
    incoming_fd: int | None = None
    stop = threading.Event()
    worker: threading.Thread | None = None
    temporary_root = Path(tempfile.gettempdir()).resolve(strict=True)
    with tempfile.TemporaryDirectory(dir=temporary_root) as directory_text:
        directory = Path(directory_text)
        selected = dict(parents)
        if variant == "ABSENT":
            selected.clear()
        elif variant == "PARTIAL":
            selected.pop(target)
        elif variant in {
            "EXACT",
            "CORRUPT",
            "EXTRA",
            "NONREGULAR",
            "SYMLINK",
            "REPLACED",
            "CONCURRENT",
            "MUTATED_JSON",
            "SPLICE",
        }:
            pass
        else:
            raise ValueError("unknown bundle variant")

        for name, data in selected.items():
            (directory / name).write_bytes(data)
        if variant == "CORRUPT":
            (directory / target).write_bytes(parents[target] + b"\n")
        elif variant == "EXTRA":
            (directory / "unexpected-member.json").write_bytes(b"{}")
        elif variant == "NONREGULAR":
            (directory / target).unlink()
            (directory / target).mkdir()
        elif variant == "SYMLINK":
            (directory / target).unlink()
            replacement = next(name for name in parents if name != target)
            (directory / target).symlink_to(replacement)
        elif variant == "REPLACED":
            replacement = directory / "replacement"
            replacement.write_bytes(parents[target] + b"\n")
            os.replace(replacement, directory / target)
        elif variant == "MUTATED_JSON":
            if parent_mutator is None:
                raise ValueError("JSON mutation requires a mutator")
            value = json.loads(parents[target])
            parent_mutator(value)
            (directory / target).write_bytes(canonical_json(value))
        elif variant == "SPLICE":
            replacement = next(name for name in parents if name != target)
            (directory / target).write_bytes(parents[replacement])
        elif variant == "CONCURRENT":
            mutated = parents[target] + b"\n"
            first_replacement = threading.Event()

            def replace_repeatedly() -> None:
                while not stop.is_set():
                    replacement = directory / "replacement"
                    replacement.write_bytes(mutated)
                    os.replace(replacement, directory / target)
                    first_replacement.set()

            worker = threading.Thread(target=replace_repeatedly, daemon=True)
            worker.start()
            if not first_replacement.wait(timeout=2):
                stop.set()
                worker.join(timeout=2)
                raise RuntimeError("concurrent replacement did not start")

        try:
            for _ in range(fd_padding):
                padding_fds.append(os.open(os.devnull, os.O_RDONLY))
            incoming_fd = open_harness_bundle(directory)
            yield incoming_fd
        finally:
            stop.set()
            if worker is not None:
                worker.join(timeout=2)
            if incoming_fd is not None:
                os.close(incoming_fd)
            for padding_fd in padding_fds:
                os.close(padding_fd)


def _bundle_factory(
    packet: RulePacket,
    variant: str,
    *,
    target_member: str | None = None,
    parent_mutator: Callable[[dict[str, object]], None] | None = None,
    fd_padding: int = 0,
) -> Callable[[], ContextManager[int]]:
    def factory() -> ContextManager[int]:
        return _open_bundle(
            packet,
            variant,
            target_member,
            parent_mutator,
            fd_padding,
        )

    return factory


def _candidate_for_pointer(
    candidate: dict[str, object],
    pointer: str,
) -> dict[str, object]:
    value = _copy_json(candidate)
    observation = value["observation"]
    if not isinstance(observation, dict):
        raise ValueError("candidate observation is not an object")
    roles = observation["governed_roles"]
    if not isinstance(roles, list) or len(roles) < 2:
        raise ValueError("candidate roles are unavailable")
    if pointer.startswith("/observation/synthetic_aliases/"):
        observation["synthetic_aliases"] = [
            _synthetic_alias(canonical_json(value))
        ]
    elif pointer.startswith("/observation/controller_edges/"):
        observation["controller_edges"] = [
            {"controlled": roles[1], "controller": roles[0]}
        ]
    elif pointer.startswith("/observation/controller_cycles/"):
        observation["controller_cycles"] = [sorted([roles[0], roles[1]])]
    return value


def _mutate_first_scalar(value: dict[str, object]) -> None:
    def mutate(current: object) -> bool:
        if isinstance(current, dict):
            for key in sorted(current):
                child = current[key]
                if isinstance(child, (dict, list)):
                    if mutate(child):
                        return True
                elif isinstance(child, bool):
                    current[key] = not child
                    return True
                elif isinstance(child, str):
                    current[key] = child + "_SUBSTITUTED"
                    return True
                elif isinstance(child, int):
                    current[key] = child + 1
                    return True
                elif child is None:
                    current[key] = "SUBSTITUTED"
                    return True
        elif isinstance(current, list):
            for index, child in enumerate(current):
                if isinstance(child, (dict, list)):
                    if mutate(child):
                        return True
                elif isinstance(child, bool):
                    current[index] = not child
                    return True
                elif isinstance(child, str):
                    current[index] = child + "_SUBSTITUTED"
                    return True
                elif isinstance(child, int):
                    current[index] = child + 1
                    return True
                elif child is None:
                    current[index] = "SUBSTITUTED"
                    return True
        return False

    if not mutate(value):
        raise ValueError("parent substitution found no scalar field")


def _set_pointer_probe(value: dict[str, object], pointer: str) -> None:
    tokens = [token for token in pointer.split("/") if token]
    current: object = value
    for position, token in enumerate(tokens):
        last = position == len(tokens) - 1
        if token == "*":
            if not isinstance(current, list) or not current:
                raise ValueError("probe wildcard has no member")
            if last:
                current[0] = _IDENTIFIER_PROBE
                return
            current = current[0]
            continue
        if not isinstance(current, dict) or token not in current:
            raise ValueError("probe pointer is outside the object")
        if last:
            current[token] = _IDENTIFIER_PROBE
            return
        current = current[token]
    raise ValueError("probe pointer did not identify a string")


def _decode_envelope(data: bytes) -> dict[str, object]:
    value = strict_load_json(data)
    if not isinstance(value, dict):
        raise ValueError("base envelope is not an object")
    return _copy_json(value)


def _payload(envelope: dict[str, object]) -> dict[str, object]:
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        raise ValueError("envelope payload is not an object")
    return payload


def _copy_json(value: object) -> object:
    return json.loads(json.dumps(value))


def _synthetic_alias(context: bytes) -> str:
    return hashlib.sha256(
        b"GCP_SECTION_7_5_1_SYNTHETIC_ALIAS_V1\x00"
        + hashlib.sha256(context).digest()
        + secrets.token_bytes(32)
    ).hexdigest()[:32]


def _attack_entries(packet: RulePacket) -> tuple[Mapping[str, object], ...]:
    entries = tuple(packet.attack_catalog)
    ids = [_required_attack_text(entry, "attack_id") for entry in entries]
    if len(ids) != len(set(ids)):
        raise ValueError("attack catalog IDs are not unique")
    return entries


def _attack_generators(attack: Mapping[str, object]) -> tuple[str, ...]:
    value = attack.get("generators")
    if (
        not isinstance(value, tuple)
        or not value
        or not all(isinstance(item, str) and item for item in value)
        or len(value) != len(set(value))
    ):
        raise ValueError("attack generators must be a nonempty unique sequence")
    return value


def _required_attack_text(
    value: Mapping[str, object],
    field: str,
) -> str:
    result = value.get(field)
    if not isinstance(result, str) or not result:
        raise ValueError(f"{field} must be a nonempty string")
    return result


def _require_current_packet(packet: RulePacket) -> None:
    current = load_packet()
    if packet != current:
        raise ValueError("corpus accepts only the current reviewed packet")


def _write_all(fd: int, data: bytes) -> None:
    position = 0
    while position < len(data):
        written = os.write(fd, data[position:])
        if written <= 0:
            raise OSError("descriptor write failed")
        position += written


def _read_bounded(fd: int, limit: int) -> bytes:
    chunks: list[bytes] = []
    size = 0
    while True:
        chunk = os.read(fd, min(1024, limit + 1 - size))
        if not chunk:
            break
        chunks.append(chunk)
        size += len(chunk)
        if size > limit:
            raise AssertionError("INVALID_SUT_RESULT")
    return b"".join(chunks)


def _invoke_closed_child(case: PreparedCase) -> EvaluationResult:
    input_values = (
        case.candidate_bytes,
        case.envelope_bytes,
        case.admitted_anchor_spki,
    )
    input_pipes = [os.pipe() for _ in input_values]
    result_read_fd, result_write_fd = os.pipe()
    process: subprocess.Popen[bytes] | None = None
    result_chunks: list[bytes] = []
    result_error: list[BaseException] = []

    for (_, write_fd), data in zip(input_pipes, input_values):
        _write_all(write_fd, data)
        os.close(write_fd)

    with case.bundle_factory() as bundle_fd:
        with tempfile.TemporaryDirectory() as isolated_home:
            command = [
                str(Path(sys.executable).resolve(strict=True)),
                "-I",
                str(SUT_PATH),
                "--candidate-fd",
                str(input_pipes[0][0]),
                "--envelope-fd",
                str(input_pipes[1][0]),
                "--anchor-fd",
                str(input_pipes[2][0]),
                "--bundle-fd",
                str(bundle_fd),
                "--result-fd",
                str(result_write_fd),
            ]
            inherited = tuple(
                [read_fd for read_fd, _ in input_pipes]
                + [bundle_fd, result_write_fd]
            )

            def read_result() -> None:
                try:
                    result_chunks.append(
                        _read_bounded(result_read_fd, 4096)
                    )
                except BaseException as exc:
                    result_error.append(exc)

            try:
                process = subprocess.Popen(
                    command,
                    cwd=ROOT,
                    env={
                        "HOME": isolated_home,
                        "LC_ALL": "C",
                        "PATH": "",
                        "PYTHONHASHSEED": "0",
                        "TZ": "UTC",
                    },
                    pass_fds=inherited,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                for read_fd, _ in input_pipes:
                    os.close(read_fd)
                os.close(result_write_fd)
                reader = threading.Thread(target=read_result)
                reader.start()
                stdout, stderr = process.communicate(timeout=30)
                reader.join(timeout=5)
                if reader.is_alive():
                    raise AssertionError("INVALID_SUT_RESULT")
                if (
                    process.returncode != 0
                    or stdout
                    or stderr
                    or result_error
                    or len(result_chunks) != 1
                ):
                    raise AssertionError("INVALID_SUT_RESULT")
                return parse_closed_result_bytes(result_chunks[0])
            finally:
                if process is not None and process.poll() is None:
                    process.kill()
                    process.wait()
                for read_fd, _ in input_pipes:
                    _close_quietly(read_fd)
                _close_quietly(result_read_fd)
                _close_quietly(result_write_fd)


def _close_quietly(fd: int) -> None:
    try:
        os.close(fd)
    except OSError:
        pass
