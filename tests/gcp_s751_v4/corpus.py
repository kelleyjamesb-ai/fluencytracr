"""Executable V4 readiness corpus with an intentional absent-SUT boundary.

This test-only module constructs packet-declared attacks and environment cells,
then asks the independent reference oracle for their governed result.  It does
not implement the Section 7.5.1 evaluator.
"""

from __future__ import annotations

from base64 import b64encode
from contextlib import contextmanager
from dataclasses import asdict, dataclass, replace
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tempfile
import threading
from typing import Callable, ContextManager, Iterator, Mapping, Sequence

from tests.gcp_s751_v4.bundle import open_harness_bundle
from tests.gcp_s751_v4.corpus_declarations import (
    CaseRecord,
    ExactLedgerSelector,
    load_case_records,
    reconcile_case_records,
    resolve_case_ledger_row,
    resolve_immutable_root_sha256,
)
from tests.gcp_s751_v4.crypto import anchor_key_id, sign_ephemeral_batch
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
    generator: str
    candidate_bytes: bytes
    envelope_bytes: bytes
    admitted_anchor_spki: bytes
    bundle_factory: Callable[[], ContextManager[int]]
    expected: EvaluationResult
    expected_sequence: tuple[EvaluationResult, ...]
    oracle_id: str
    mutation_evidence: MutationEvidence
    covered_rule_ids: tuple[str, ...]


@dataclass(frozen=True)
class MutationEvidence:
    immutable_root_id: str
    immutable_root_sha256: str
    source_sha256: str
    observed_sha256: str
    source_object_sha256: str
    source_envelope_sha256: str
    source_anchor_sha256: str
    source_result: EvaluationResult | None
    observed_ordering: tuple[str, ...]
    observed_operator: str
    observed_parameters: tuple[str, ...]
    source_relationship: str
    target_relationship: str


@dataclass(frozen=True)
class CaseObservation:
    case_id: str
    attack_id: str
    generator_id: str
    mutation_operator: str
    mutation_parameters: tuple[str, ...]
    source_relationship: str
    target_relationship: str
    immutable_root_id: str
    immutable_root_sha256: str
    ledger_selector: ExactLedgerSelector
    expected_sequence: tuple[tuple[str, ...], ...]
    oracle_id: str
    pytest_node: str


@dataclass(frozen=True)
class OutputBoundaryCase:
    case_id: str
    attack_id: str
    generator_id: str
    field: str
    input_bytes: bytes
    expected_failure: str
    oracle_id: str
    pytest_node: str


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
    generator: str
    candidate_bytes: bytes
    envelope_bytes: bytes
    admitted_anchor_spki: bytes
    bundle_factory: Callable[[], ContextManager[int]]
    source_sha256: str
    source_object_sha256: str = ""
    source_envelope_sha256: str = ""
    source_anchor_sha256: str = ""
    source_result: EvaluationResult | None = None
    baseline_candidate_bytes: bytes = b""
    baseline_envelope_bytes: bytes = b""
    baseline_anchor_spki: bytes = b""


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


def build_output_boundary_cases(
    packet: RulePacket,
) -> tuple[OutputBoundaryCase, ...]:
    """Construct the five packet-visible closed-result protocol probes."""
    _require_current_packet(packet)
    base = {
        "schema_version": "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        "decision": "HOLD",
        "reason": "CURRENT_PARENT_OBLIGATIONS_OPEN",
        "authority_effect": "NONE",
        "claim_grade": "STRUCTURAL_ONLY",
    }
    cases: list[OutputBoundaryCase] = []
    for field in (
        "schema_version",
        "decision",
        "reason",
        "authority_effect",
        "claim_grade",
    ):
        value = dict(base)
        value[field] = _IDENTIFIER_PROBE
        input_bytes = canonical_json(value)
        try:
            parse_closed_result_bytes(input_bytes)
        except AssertionError as exc:
            if str(exc) != "INVALID_SUT_RESULT":
                raise
        else:
            raise ValueError("closed-result boundary probe was accepted")
        cases.append(
            OutputBoundaryCase(
                case_id=f"a018-result-string-path-{field}",
                attack_id="A018",
                generator_id="RESULT_STRING_PATH",
                field=field,
                input_bytes=input_bytes,
                expected_failure="INVALID_SUT_RESULT",
                oracle_id="CLOSED_RESULT_PARSER_V4",
                pytest_node=(
                    "tests/"
                    "test_gcp_section_7_5_parent_contract_"
                    "authority_closure_readiness_v4.py::"
                    "test_result_boundary_rejects_identifier_"
                    f"class_outputs[{field}]"
                ),
            )
        )
    return tuple(cases)


def build_case_observations(
    packet: RulePacket,
) -> tuple[CaseObservation, ...]:
    """Return independent observations for every emitted packet case."""
    _require_current_packet(packet)
    attack_observations = tuple(
        _prepared_case_observation(packet, case)
        for case in build_attack_cases(packet)
    )
    environment_observations = tuple(
        _prepared_case_observation(packet, cell.case)
        for cell in build_environment_cells(packet)
        if cell.executable and cell.case is not None
    )
    output_observations = _output_case_observations(packet)
    return attack_observations + environment_observations + output_observations


def _output_case_observations(
    packet: RulePacket,
) -> tuple[CaseObservation, ...]:
    return tuple(
        CaseObservation(
            case_id=case.case_id,
            attack_id=case.attack_id,
            generator_id=case.generator_id,
            mutation_operator="IDENTIFIER_INJECTION",
            mutation_parameters=(f"result:/{case.field}",),
            source_relationship="CLOSED_VALID_RESULT",
            target_relationship="IDENTIFIER_CLASS_RESULT_VALUE",
            immutable_root_id="PUBLIC_BOUNDARY_SCHEMA_SET_V4",
            immutable_root_sha256=resolve_immutable_root_sha256(
                packet, "PUBLIC_BOUNDARY_SCHEMA_SET_V4"
            ),
            ledger_selector=_exact_observed_selector(
                "result", f"/{case.field}"
            ),
            expected_sequence=(
                ("PROTOCOL_FAILURE", case.expected_failure),
            ),
            oracle_id=case.oracle_id,
            pytest_node=case.pytest_node,
        )
        for case in build_output_boundary_cases(packet)
    )


def evaluate_reference_case(case: PreparedCase) -> EvaluationResult:
    """Evaluate only normative case inputs, never case metadata."""
    return evaluate_reference_sequence(case)[-1]


def evaluate_reference_sequence(
    case: PreparedCase,
) -> tuple[EvaluationResult, ...]:
    """Evaluate one call, or the declared two-call replay session."""
    oracle = ReferenceOracle()
    with case.bundle_factory() as reference_fd:
        return tuple(
            oracle.evaluate(
                candidate_bytes=case.candidate_bytes,
                signed_context_envelope_bytes=case.envelope_bytes,
                verifier_anchor_spki=case.admitted_anchor_spki,
                trusted_parent_bundle_fd=reference_fd,
            )
            for _ in case.expected_sequence
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
    observed_reference = evaluate_reference_sequence(case)
    assert case.expected_sequence == observed_reference
    if not SUT_PATH.exists():
        raise AssertionError("MISSING_SUT")
    observed_sut = _invoke_closed_child(case)
    if observed_sut != case.expected_sequence:
        raise AssertionError("SUT_ORACLE_MISMATCH")
    return observed_sut[-1]


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


def _parse_closed_result_sequence_bytes(
    data: bytes,
    expected_count: int,
) -> tuple[EvaluationResult, ...]:
    """Admit one result, or the exact ordered two-result replay sequence."""
    if expected_count == 1:
        return (parse_closed_result_bytes(data),)
    if expected_count != 2:
        raise AssertionError("INVALID_SUT_RESULT")
    try:
        value = strict_load_json(data)
    except ValueError as exc:
        raise AssertionError("INVALID_SUT_RESULT") from exc
    if not isinstance(value, list) or len(value) != 2:
        raise AssertionError("INVALID_SUT_RESULT")
    return tuple(
        parse_closed_result_bytes(canonical_json(result))
        for result in value
    )


def _corpus() -> _Corpus:
    global _CORPUS
    if _CORPUS is None:
        _CORPUS = _build_corpus(load_packet())
    return _CORPUS


def _build_corpus(packet: RulePacket) -> _Corpus:
    candidate = _valid_candidate(packet)
    candidate_bytes = canonical_json(candidate)
    base_payload = _base_payload(packet, candidate_bytes, "CLEAN_CI")
    time_reseal_payload = _base_payload(
        packet, candidate_bytes, "CLEAN_CI"
    )
    time_reseal_payload["nonce_time"] = {
        "nonce": secrets.token_hex(16),
        "valid_from": "2026-07-31T00:00:00Z",
        "valid_until": "2026-07-31T00:10:00Z",
        "trusted_time": "2026-07-31T00:05:00Z",
    }
    base_material, time_reseal_material = _sign_material_batch(
        packet,
        candidate_bytes,
        (base_payload, time_reseal_payload),
    )
    base_candidate, base_envelope, base_anchor = base_material
    exact_factory = _bundle_factory(packet, "EXACT")
    rows = build_rule_ledger(packet)
    records = load_case_records(packet)
    records_by_id = {record.case_id: record for record in records}
    source_sha256 = _normative_source_sha256(
        packet,
        base_candidate,
        base_envelope,
        base_anchor,
    )

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
                source_sha256=source_sha256,
                time_reseal_material=time_reseal_material,
            )
            if attack_id in metamorphic_drafts:
                metamorphic_drafts[attack_id].extend(generated)
            elif attack_id == "M004":
                fd_drafts.extend(generated)
            else:
                attack_drafts.extend(generated)

    scored_attacks = [
        _score_draft(draft, rows, records_by_id[draft.case_id])
        for draft in attack_drafts
    ]
    scored_groups: list[MetamorphicGroup] = []
    varied = {
        "M001": ("ephemeral_key", "signature"),
        "M002": ("context_bound_synthetic_alias",),
        "M003": ("descriptor_number",),
    }
    for attack_id in ("M001", "M002", "M003"):
        equivalents = tuple(
            _score_draft(
                draft, rows, records_by_id[draft.case_id]
            )
            for draft in metamorphic_drafts[attack_id]
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
    fd_cases = tuple(
        _score_draft(draft, rows, records_by_id[draft.case_id])
        for draft in fd_drafts
    )
    if len(fd_cases) != 2:
        raise ValueError("descriptor discriminator must create two cases")
    scored_attacks.extend(fd_cases)

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
    environments = _build_environment_cells(
        packet, rows, records_by_id
    )

    expected_attack_ids = {
        _required_attack_text(attack, "attack_id") for attack in attacks
    }
    if {case.attack_id for case in scored_attacks} != expected_attack_ids:
        raise ValueError("packet attack catalog did not construct exactly")
    local_observations = tuple(
        _prepared_case_observation(packet, case)
        for case in scored_attacks
    ) + tuple(
        _prepared_case_observation(packet, cell.case)
        for cell in environments
        if cell.executable and cell.case is not None
    ) + _output_case_observations(packet)
    reconcile_case_records(
        packet,
        rows,
        records,
        local_observations,
    )
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
    source_sha256: str,
    time_reseal_material: tuple[bytes, bytes, bytes],
) -> list[_CaseDraft]:
    prefix = f"{attack_id.lower()}-{generator.lower().replace('_', '-')}"

    def draft(
        suffix: str,
        *,
        candidate_bytes: bytes = base_candidate,
        envelope_bytes: bytes = base_envelope,
        anchor: bytes = base_anchor,
        bundle_factory: Callable[[], ContextManager[int]] = exact_factory,
        source_object_sha256: str = "",
        source_envelope_sha256: str = "",
        source_anchor_sha256: str = "",
        source_result: EvaluationResult | None = None,
    ) -> _CaseDraft:
        case_id = prefix if not suffix else f"{prefix}-{suffix}"
        return _CaseDraft(
            case_id=case_id,
            attack_id=attack_id,
            generator=generator,
            candidate_bytes=candidate_bytes,
            envelope_bytes=envelope_bytes,
            admitted_anchor_spki=anchor,
            bundle_factory=bundle_factory,
            source_sha256=source_sha256,
            source_object_sha256=source_object_sha256,
            source_envelope_sha256=source_envelope_sha256,
            source_anchor_sha256=source_anchor_sha256,
            source_result=source_result,
            baseline_candidate_bytes=base_candidate,
            baseline_envelope_bytes=base_envelope,
            baseline_anchor_spki=base_anchor,
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
        return [draft("", candidate_bytes=data)]

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
            )
        ]

    if generator == "CANDIDATE_TRUNCATION":
        return [
            draft(
                "",
                candidate_bytes=base_candidate[:-1],
            )
        ]

    if generator == "ENVELOPE_TRUNCATION":
        return [
            draft(
                "",
                envelope_bytes=base_envelope[:-1],
            )
        ]

    if generator == "CANDIDATE_SUBSTITUTION":
        value = _copy_json(candidate)
        observation = value["observation"]
        if not isinstance(observation, dict):
            raise ValueError("candidate observation is not an object")
        observation["synthetic_aliases"] = [
            _synthetic_alias(base_candidate, "0" * 32)
        ]
        return [
            draft(
                "",
                candidate_bytes=canonical_json(value),
            )
        ]

    if generator == "CANDIDATE_SPLICE":
        source_value = _copy_json(candidate)
        source_observation = source_value["observation"]
        if not isinstance(source_observation, dict):
            raise ValueError("candidate observation is not an object")
        source_nonce = secrets.token_hex(16)
        source_observation["synthetic_aliases"] = [
            _synthetic_alias(base_candidate, source_nonce)
        ]
        source_candidate = canonical_json(source_value)
        source_payload = _base_payload(
            packet, source_candidate, "CLEAN_CI"
        )
        source_payload["nonce_time"]["nonce"] = source_nonce
        _, source_envelope, source_anchor = _sign_material(
            packet, source_candidate, source_payload
        )
        with exact_factory() as source_bundle_fd:
            source_result = ReferenceOracle().evaluate(
                candidate_bytes=source_candidate,
                signed_context_envelope_bytes=source_envelope,
                verifier_anchor_spki=source_anchor,
                trusted_parent_bundle_fd=source_bundle_fd,
            )
        if source_result != EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "HOLD",
            "CURRENT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "STRUCTURAL_ONLY",
        ):
            raise ValueError(
                "candidate splice source did not authenticate independently"
            )
        return [
            draft(
                "",
                candidate_bytes=source_candidate,
                source_object_sha256=hashlib.sha256(
                    source_candidate
                ).hexdigest(),
                source_envelope_sha256=hashlib.sha256(
                    source_envelope
                ).hexdigest(),
                source_anchor_sha256=hashlib.sha256(
                    source_anchor
                ).hexdigest(),
                source_result=source_result,
            )
        ]

    if generator == "PAYLOAD_SUBSTITUTION":
        envelope = _decode_envelope(base_envelope)
        _payload(envelope)["candidate_sha256"] = "1" * 64
        return [
            draft(
                "",
                envelope_bytes=canonical_json(envelope),
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
            )
            for index, entry in enumerate(packet.parent_manifest)
        ]

    if generator in {"FORGED_RECEIPT", "FORGED_PROVENANCE"}:
        payload = _base_payload(packet, base_candidate, "CLEAN_CI")
        if generator == "FORGED_RECEIPT":
            payload["receipt_sha256"] = "0" * 64
        else:
            payload["current_head_sha256"] = "0" * 64
            payload["anti_rollback_sha256"] = "0" * 64
        _, envelope, anchor = _sign_material(
            packet, base_candidate, payload
        )
        return [
            draft(
                "",
                envelope_bytes=envelope,
                anchor=anchor,
            )
        ]

    if generator == "PROCESS_LOCAL_REPLAY":
        return [
            draft("")
        ]

    if generator == "ALTERNATE_ANCHOR_FULL_RESEAL":
        value = _copy_json(candidate)
        observation = value["observation"]
        if not isinstance(observation, dict):
            raise ValueError("candidate observation is not an object")
        alias_nonce = secrets.token_hex(16)
        observation["synthetic_aliases"] = [
            _synthetic_alias(base_candidate, alias_nonce)
        ]
        resealed_candidate = canonical_json(value)
        payload = _base_payload(packet, resealed_candidate, "CLEAN_CI")
        payload["nonce_time"]["nonce"] = alias_nonce
        _, envelope, _alternate_anchor = _sign_material(
            packet, resealed_candidate, payload
        )
        return [
            draft(
                "",
                candidate_bytes=resealed_candidate,
                envelope_bytes=envelope,
                anchor=base_anchor,
            )
        ]

    if generator == "ALL_TIME_FIELDS_RESEAL":
        resealed_candidate, envelope, anchor = time_reseal_material
        if resealed_candidate != base_candidate or anchor != base_anchor:
            raise ValueError(
                "time reseal did not retain the original signing batch anchor"
            )
        return [
            draft(
                "",
                envelope_bytes=envelope,
                anchor=anchor,
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
            )
        ]

    if generator == "AMBIENT_FALLBACK":
        return [
            draft(
                "",
                bundle_factory=_bundle_factory(packet, "ABSENT"),
            )
        ]

    if generator == "EACH_PARENT_MISSING":
        return [
            draft(
                str(index + 1),
                bundle_factory=_bundle_factory(
                    packet, "PARTIAL", target_member=entry.member_name
                ),
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
            source_sha256=source_sha256,
            generator=generator,
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
            source_sha256=source_sha256,
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
            alias_nonce = secrets.token_hex(16)
            observation["synthetic_aliases"] = [
                _synthetic_alias(base_candidate, alias_nonce)
            ]
            varied_candidate = canonical_json(value)
            payload = _base_payload(packet, varied_candidate, "CLEAN_CI")
            payload["nonce_time"]["nonce"] = alias_nonce
            _, envelope, anchor = _sign_material(
                packet, varied_candidate, payload
            )
            drafts.append(
                draft(
                    str(ordinal + 1),
                    candidate_bytes=varied_candidate,
                    envelope_bytes=envelope,
                    anchor=anchor,
                )
            )
        return drafts

    if generator == "DESCRIPTOR_NUMBER_EQUIVALENCE":
        return [
            draft(
                "1",
                bundle_factory=_bundle_factory(packet, "EXACT", fd_padding=0),
            ),
            draft(
                "2",
                bundle_factory=_bundle_factory(packet, "EXACT", fd_padding=9),
            ),
        ]

    if generator == "SAME_NORMALIZED_DESCRIPTOR_OPPOSING_OUTCOMES":
        return [
            draft(
                "exact",
                bundle_factory=_bundle_factory(packet, "EXACT"),
            ),
            draft(
                "corrupt",
                bundle_factory=_bundle_factory(packet, "CORRUPT"),
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
    source_sha256: str,
    generator: str,
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
                if pointer == "/observation/synthetic_aliases/*":
                    value["observation"]["synthetic_aliases"] = [
                        hashlib.md5(b"victim@example.com").hexdigest()
                    ]
                candidate_bytes = canonical_json(value)
                payload = _base_payload(
                    packet, candidate_bytes, "CLEAN_CI"
                )
                _, envelope_bytes, anchor = _sign_material(
                    packet, candidate_bytes, payload
                )
            elif boundary == "signed_context_payload":
                envelope = _decode_envelope(base_envelope)
                payload = _payload(envelope)
                _set_pointer_probe(payload, pointer)
                _, envelope_bytes, anchor = _sign_material(
                    packet, base_candidate, payload
                )
                if pointer == "/key_id":
                    envelope = _decode_envelope(envelope_bytes)
                    _payload(envelope)["key_id"] = _IDENTIFIER_PROBE
                    envelope_bytes = canonical_json(envelope)
            elif boundary == "signed_context_envelope":
                envelope = _decode_envelope(base_envelope)
                _set_pointer_probe(envelope, pointer)
                envelope_bytes = canonical_json(envelope)
            elif boundary == "nonce_time":
                envelope = _decode_envelope(base_envelope)
                payload = _payload(envelope)
                nonce_time = payload["nonce_time"]
                if not isinstance(nonce_time, dict):
                    raise ValueError("base nonce/time is not an object")
                _set_pointer_probe(nonce_time, pointer)
                _, envelope_bytes, anchor = _sign_material(
                    packet, base_candidate, payload
                )
            else:
                if pointer == "/spki_der_base64":
                    anchor = _IDENTIFIER_PROBE.encode("ascii")
                elif pointer == "/key_id":
                    payload = _base_payload(
                        packet, base_candidate, "CLEAN_CI"
                    )
                    _, envelope_bytes, anchor = _sign_material(
                        packet, base_candidate, payload
                    )
                    envelope = _decode_envelope(envelope_bytes)
                    _payload(envelope)["key_id"] = (
                        "P256_SPKI_SHA256:"
                        + hashlib.sha256(
                            _IDENTIFIER_PROBE.encode("ascii")
                        ).hexdigest()
                    )
                    envelope_bytes = canonical_json(envelope)
                else:
                    raise ValueError(
                        "unknown verifier-anchor string boundary"
                    )
            drafts.append(
                _CaseDraft(
                    case_id=f"{prefix}-{suffix}",
                    attack_id=attack_id,
                    generator=generator,
                    candidate_bytes=candidate_bytes,
                    envelope_bytes=envelope_bytes,
                    admitted_anchor_spki=anchor,
                    bundle_factory=exact_factory,
                    source_sha256=source_sha256,
                    baseline_candidate_bytes=base_candidate,
                    baseline_envelope_bytes=base_envelope,
                    baseline_anchor_spki=base_anchor,
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
    source_sha256: str,
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
    if generator == "EVERY_SECTION_7_3_ROLE":
        for index in range(len(values)):
            candidate_value = strict_load_json(base_candidate)
            if not isinstance(candidate_value, dict):
                raise ValueError("authority candidate is not an object")
            observation = candidate_value["observation"]
            if not isinstance(observation, dict):
                raise ValueError("authority observation is not an object")
            governed_roles = observation["governed_roles"]
            if not isinstance(governed_roles, list):
                raise ValueError("authority roles are not a list")
            governed_roles[index] = "UNRECOGNIZED_AUTHORITY_VALUE"
            observation["governed_roles"] = sorted(governed_roles)
            candidate_bytes = canonical_json(candidate_value)
            payload = _base_payload(packet, candidate_bytes, "CLEAN_CI")
            _, envelope_bytes, anchor = _sign_material(
                packet, candidate_bytes, payload
            )
            drafts.append(
                _CaseDraft(
                    case_id=f"{prefix}-{index + 1}",
                    attack_id=attack_id,
                    generator=generator,
                    candidate_bytes=candidate_bytes,
                    envelope_bytes=envelope_bytes,
                    admitted_anchor_spki=anchor,
                    bundle_factory=exact_factory,
                    source_sha256=source_sha256,
                    baseline_candidate_bytes=base_candidate,
                    baseline_envelope_bytes=base_envelope,
                    baseline_anchor_spki=base_anchor,
                )
            )
        return drafts

    for index in range(len(values)):
        def mutate(value: dict[str, object], *, position: int = index) -> None:
            if generator == "EVERY_SECTION_7_3_CAPABILITY":
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
                generator=generator,
                candidate_bytes=base_candidate,
                envelope_bytes=base_envelope,
                admitted_anchor_spki=base_anchor,
                bundle_factory=_bundle_factory(
                    packet,
                    "MUTATED_JSON",
                    target_member=member,
                    parent_mutator=mutate,
                ),
                source_sha256=source_sha256,
                baseline_candidate_bytes=base_candidate,
                baseline_envelope_bytes=base_envelope,
                baseline_anchor_spki=base_anchor,
            )
        )
    return drafts


def _build_environment_cells(
    packet: RulePacket,
    rows: Sequence[object],
    records_by_id: Mapping[str, CaseRecord],
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
                generator="ENVIRONMENT_CELL",
                candidate_bytes=candidate,
                envelope_bytes=envelope,
                admitted_anchor_spki=anchor,
                bundle_factory=_bundle_factory(packet, resource_state),
                source_sha256=_normative_source_sha256(
                    packet, candidate, envelope, anchor
                ),
                baseline_candidate_bytes=candidate,
                baseline_envelope_bytes=envelope,
                baseline_anchor_spki=anchor,
            )
            prepared = _score_draft(
                draft, rows, records_by_id[draft.case_id]
            )
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


def _score_draft(
    draft: _CaseDraft,
    rows: Sequence[object],
    record: CaseRecord,
) -> PreparedCase:
    try:
        oracle = ReferenceOracle()
        with draft.bundle_factory() as reference_fd:
            call_count = 2 if draft.attack_id == "A009" else 1
            observed_sequence = tuple(
                oracle.evaluate(
                    candidate_bytes=draft.candidate_bytes,
                    signed_context_envelope_bytes=draft.envelope_bytes,
                    verifier_anchor_spki=draft.admitted_anchor_spki,
                    trusted_parent_bundle_fd=reference_fd,
                )
                for _ in range(call_count)
            )
        observed_ordering = tuple(
            getattr(draft.bundle_factory, "observed_events", ())
        )
    except Exception as exc:
        raise ValueError(
            f"case setup failed before oracle evaluation: {draft.case_id}"
        ) from exc
    if record.case_id != draft.case_id:
        raise ValueError("case record ID does not match constructed case")
    selected_row = resolve_case_ledger_row(record, rows)
    expected = observed_sequence[-1]
    covered_rule_ids = (selected_row.rule_id,)
    oracle_id = "REFERENCE_ORACLE_V4"
    root_id = record.immutable_root_id
    root_sha256 = record.immutable_root_sha256
    observed_sha256 = _observed_mutation_sha256(
        draft,
        observed_sequence,
    )
    (
        observed_operator,
        observed_parameters,
        source_relationship,
        target_relationship,
    ) = _observe_mutation_relationship(
        draft,
        observed_sequence,
        observed_ordering,
    )
    return PreparedCase(
        case_id=draft.case_id,
        attack_id=draft.attack_id,
        generator=draft.generator,
        candidate_bytes=draft.candidate_bytes,
        envelope_bytes=draft.envelope_bytes,
        admitted_anchor_spki=draft.admitted_anchor_spki,
        bundle_factory=draft.bundle_factory,
        expected=expected,
        expected_sequence=observed_sequence,
        oracle_id=oracle_id,
        mutation_evidence=MutationEvidence(
            immutable_root_id=root_id,
            immutable_root_sha256=root_sha256,
            source_sha256=draft.source_sha256,
            observed_sha256=observed_sha256,
            source_object_sha256=draft.source_object_sha256,
            source_envelope_sha256=draft.source_envelope_sha256,
            source_anchor_sha256=draft.source_anchor_sha256,
            source_result=draft.source_result,
            observed_ordering=observed_ordering,
            observed_operator=observed_operator,
            observed_parameters=observed_parameters,
            source_relationship=source_relationship,
            target_relationship=target_relationship,
        ),
        covered_rule_ids=covered_rule_ids,
    )


def _prepared_case_observation(
    packet: RulePacket,
    case: PreparedCase,
) -> CaseObservation:
    test_function = (
        "test_future_sut_environment_cell"
        if case.attack_id == "ENVIRONMENT"
        else "test_future_sut_attack_case"
    )
    immutable_root_id = _observed_immutable_root_id(case)
    ledger_selector = _observed_ledger_selector(packet, case)
    return CaseObservation(
        case_id=case.case_id,
        attack_id=case.attack_id,
        generator_id=case.generator,
        mutation_operator=case.mutation_evidence.observed_operator,
        mutation_parameters=case.mutation_evidence.observed_parameters,
        source_relationship=(
            case.mutation_evidence.source_relationship
        ),
        target_relationship=(
            case.mutation_evidence.target_relationship
        ),
        immutable_root_id=immutable_root_id,
        immutable_root_sha256=resolve_immutable_root_sha256(
            packet, immutable_root_id
        ),
        ledger_selector=ledger_selector,
        expected_sequence=tuple(
            (
                "EVALUATION_RESULT",
                result.schema_version,
                result.decision,
                result.reason,
                result.authority_effect,
                result.claim_grade,
            )
            for result in case.expected_sequence
        ),
        oracle_id=case.oracle_id,
        pytest_node=(
            "tests/"
            "test_gcp_section_7_5_parent_contract_"
            "authority_closure_readiness_v4.py::"
            f"{test_function}[{case.case_id}]"
        ),
    )


def _observed_ledger_selector(
    packet: RulePacket,
    case: PreparedCase,
) -> ExactLedgerSelector:
    """Derive one exact ledger row from actual mutation and oracle evidence."""
    if case.attack_id == "A018":
        return _observed_a018_selector(case)
    parameters = set(case.mutation_evidence.observed_parameters)
    reason = case.expected.reason
    if reason == "INVALID_CANDIDATE_SHAPE":
        resource, pointer = "candidate", "/schema_version"
    elif reason == "INVALID_ENVELOPE_SHAPE":
        if any(
            value.startswith("envelope:/payload/nonce_time/")
            for value in parameters
        ):
            resource, pointer = "nonce_time", "/trusted_time"
        elif (
            "envelope:RAW_BYTES_CHANGED" in parameters
            or any(
                value.startswith("envelope:/")
                and not value.startswith("envelope:/payload/")
                for value in parameters
            )
        ):
            resource, pointer = (
                "signed_context_envelope",
                "/schema_version",
            )
        else:
            resource, pointer = (
                "signed_context_payload",
                "/schema_version",
            )
    elif reason == "INVALID_SIGNED_CONTEXT_BINDING":
        if "envelope:/payload/mode" in parameters:
            resource, pointer = "signed_context_payload", "/mode"
        elif any("/nonce_time/" in value for value in parameters):
            resource, pointer = "nonce_time", "/trusted_time"
        else:
            resource, pointer = (
                "signed_context_payload",
                "/candidate_sha256",
            )
    elif reason == "INVALID_SIGNATURE":
        candidate_changed = any(
            value.startswith("candidate:")
            or value.startswith("candidate_role_")
            for value in parameters
        )
        envelope_changed = any(
            value.startswith("envelope:") for value in parameters
        )
        anchor_changed = "anchor_changed:true" in parameters
        if (
            (anchor_changed and not envelope_changed)
            or (candidate_changed and envelope_changed)
        ):
            resource, pointer = (
                "verifier_anchor",
                "/spki_der_base64",
            )
        else:
            resource, pointer = (
                "signed_context_envelope",
                "/signature_der_base64",
            )
    elif reason == "INVALID_CONTEXT_CONJUNCTION":
        resource, pointer = "attestation-receipt-contract.json", ""
    elif reason == "REPLAY_DETECTED":
        resource, pointer = "replay", "/nonce"
    elif reason == "INVALID_PARENT_RESOURCE_SET":
        resource, pointer = "bundle_capability", "/member_names"
    elif reason == "INVALID_SECTION_7_3_AUTHORITY":
        removed_roles = [
            value[len("candidate_role_removed:"):]
            for value in parameters
            if value.startswith("candidate_role_removed:")
        ]
        parents = load_exact_parents(packet)
        matrix = json.loads(
            parents["role-capability-matrix.json"]
        )
        roles = (
            matrix.get("roles")
            if isinstance(matrix, Mapping)
            else None
        )
        if len(removed_roles) != 1 or not isinstance(roles, list):
            raise ValueError(
                "observed authority mutation has no exact role row"
            )
        matches = [
            index
            for index, value in enumerate(roles)
            if isinstance(value, Mapping)
            and value.get("role_id") == removed_roles[0]
        ]
        if len(matches) != 1:
            raise ValueError(
                "observed authority mutation has no exact role row"
            )
        resource = "role-capability-matrix.json"
        pointer = f"/roles/{matches[0]}/role_id"
    elif reason in {
        "CURRENT_PARENT_OBLIGATIONS_OPEN",
        "ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN",
    }:
        resource, pointer = (
            "constraints-open-obligations-contract.json",
            "",
        )
    else:
        raise ValueError(
            "observed result has no exact ledger selector"
        )
    return _exact_observed_selector(resource, pointer)


def _observed_a018_selector(
    case: PreparedCase,
) -> ExactLedgerSelector:
    """Resolve the attacked public field only from the mutated inputs."""
    candidate = strict_load_json(case.candidate_bytes)
    envelope = strict_load_json(case.envelope_bytes)
    if not isinstance(candidate, dict) or not isinstance(envelope, dict):
        raise ValueError("A018 inputs are not closed objects")

    candidate_pointers = _value_pointers(
        candidate, _IDENTIFIER_PROBE
    )
    if len(candidate_pointers) == 1:
        return _exact_observed_selector(
            "candidate",
            _normalize_schema_pointer(candidate_pointers[0]),
        )

    observation = candidate.get("observation")
    payload = envelope.get("payload")
    if isinstance(observation, dict) and isinstance(payload, dict):
        aliases = observation.get("synthetic_aliases")
        nonce_time = payload.get("nonce_time")
        if (
            isinstance(aliases, list)
            and aliases
            and all(isinstance(alias, str) for alias in aliases)
            and isinstance(nonce_time, dict)
            and isinstance(nonce_time.get("nonce"), str)
        ):
            candidate_projection = _copy_json(candidate)
            projected_observation = candidate_projection.get(
                "observation"
            )
            if not isinstance(projected_observation, dict):
                raise ValueError("A018 candidate projection is invalid")
            projected_observation["synthetic_aliases"] = []
            expected_aliases = sorted(
                _synthetic_alias(
                    canonical_json(candidate_projection),
                    nonce_time["nonce"],
                    ordinal,
                )
                for ordinal in range(len(aliases))
            )
            if aliases != expected_aliases:
                return _exact_observed_selector(
                    "candidate",
                    "/observation/synthetic_aliases/*",
                )

    envelope_pointers = _value_pointers(
        envelope, _IDENTIFIER_PROBE
    )
    if len(envelope_pointers) == 1:
        pointer = _normalize_schema_pointer(envelope_pointers[0])
        if pointer.startswith("/payload/nonce_time/"):
            return _exact_observed_selector(
                "nonce_time",
                pointer[len("/payload/nonce_time"):],
            )
        if pointer.startswith("/payload/"):
            return _exact_observed_selector(
                "signed_context_payload",
                pointer[len("/payload"):],
            )
        return _exact_observed_selector(
            "signed_context_envelope",
            pointer,
        )

    if case.admitted_anchor_spki == _IDENTIFIER_PROBE.encode("ascii"):
        return _exact_observed_selector(
            "verifier_anchor",
            "/spki_der_base64",
        )
    if isinstance(payload, dict):
        key_id = payload.get("key_id")
        try:
            expected_key_id = anchor_key_id(
                case.admitted_anchor_spki
            )
        except (TypeError, ValueError):
            expected_key_id = None
        if (
            isinstance(key_id, str)
            and key_id.startswith("P256_SPKI_SHA256:")
            and key_id != expected_key_id
        ):
            return _exact_observed_selector(
                "verifier_anchor",
                "/key_id",
            )
    raise ValueError("A018 mutation has no exact observed string boundary")


def _value_pointers(
    value: object,
    target: str,
    pointer: str = "",
) -> tuple[str, ...]:
    pointers: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_pointer = f"{pointer}/{_pointer_escape(key)}"
            pointers.extend(
                _value_pointers(child, target, child_pointer)
            )
    elif isinstance(value, list):
        for index, child in enumerate(value):
            pointers.extend(
                _value_pointers(child, target, f"{pointer}/{index}")
            )
    elif value == target:
        pointers.append(pointer or "/")
    return tuple(pointers)


def _normalize_schema_pointer(pointer: str) -> str:
    return re.sub(r"/[0-9]+(?=/|$)", "/*", pointer)


def _exact_observed_selector(
    resource: str,
    pointer: str,
) -> ExactLedgerSelector:
    material = f"{resource}\x00{pointer}".encode("utf-8")
    return ExactLedgerSelector(
        resource=resource,
        pointer=pointer,
        rule_id=f"RULE-LEDGER-{hashlib.sha256(material).hexdigest()}",
    )


def _observed_immutable_root_id(case: PreparedCase) -> str:
    """Identify the normative root from the constructed case boundary."""
    generator = case.generator
    if case.attack_id == "ENVIRONMENT":
        return "EXACT_PARENT_MANIFEST"
    if case.attack_id == "A019":
        if generator in {
            "EVERY_SECTION_7_3_ROLE",
            "EVERY_SECTION_7_3_CAPABILITY",
        }:
            return "PARENT:role-capability-matrix.json"
        if generator == "EVERY_SECTION_7_3_HSM_PURPOSE":
            return "PARENT:security-authority-contract.json"
        if generator == "EVERY_PREREQUISITE_OWNER":
            return "PARENT:constraints-open-obligations-contract.json"
    if case.attack_id == "A018" or generator in {
        "EVERY_PUBLIC_STRING_PATH",
        "SYNTHETIC_ALIAS_EQUIVALENCE",
    }:
        return "PUBLIC_BOUNDARY_SCHEMA_SET_V4"
    if generator.startswith("RAW_CANDIDATE_") or generator in {
        "CANDIDATE_NESTED_EXTRA_FIELD",
        "CANDIDATE_TRUNCATION",
        "CANDIDATE_SUBSTITUTION",
        "CANDIDATE_SPLICE",
    }:
        return "SCHEMA:candidate"
    if generator.startswith("RAW_PAYLOAD_") or generator in {
        "PAYLOAD_NESTED_EXTRA_FIELD",
        "PAYLOAD_SUBSTITUTION",
        "PAYLOAD_SPLICE",
        "MODE_CONFUSION",
    }:
        return "SCHEMA:signed_context_payload"
    if generator.startswith("RAW_ENVELOPE_") or generator == (
        "ENVELOPE_TRUNCATION"
    ):
        return "SCHEMA:signed_context_envelope"
    if generator.startswith("RAW_NONCE_"):
        return "SCHEMA:nonce_time"
    if generator in {
        "SIGNATURE_SPLICE",
        "FORGED_PROVENANCE",
        "ALTERNATE_ANCHOR_FULL_RESEAL",
        "EPHEMERAL_KEY_EQUIVALENCE",
    }:
        return "SIGNATURE_PROJECTION"
    if generator == "FORGED_RECEIPT":
        return "PARENT:attestation-receipt-contract.json"
    if generator == "PROCESS_LOCAL_REPLAY":
        return "SCHEMA:replay_record"
    if generator in {
        "ALL_TIME_FIELDS_RESEAL",
        "STALE_TIME",
        "FUTURE_TIME",
    }:
        return "TRUSTED_TIME_POLICY_V1"
    if generator in {
        "EACH_PARENT_SUBSTITUTION",
        "EACH_PARENT_SPLICE",
        "EACH_PARENT_MISSING",
        "EACH_PARENT_CORRUPT",
    }:
        return "EXACT_PARENT_MANIFEST"
    if generator in {
        "AMBIENT_FALLBACK",
        "EXTRA_MEMBER",
        "NONREGULAR_MEMBER",
        "SYMLINK_MEMBER",
        "REPLACED_MEMBER",
        "CONCURRENT_REPLACEMENT",
        "DESCRIPTOR_NUMBER_EQUIVALENCE",
        "SAME_NORMALIZED_DESCRIPTOR_OPPOSING_OUTCOMES",
    }:
        return "SCHEMA:parent_bundle_descriptor"
    raise ValueError("constructed case has no independent immutable root")


def _observe_mutation_relationship(
    draft: _CaseDraft,
    observed_sequence: Sequence[EvaluationResult],
    observed_ordering: Sequence[str],
) -> tuple[str, tuple[str, ...], str, str]:
    parameters: list[str] = []
    candidate_changes = _json_change_markers(
        "candidate",
        draft.baseline_candidate_bytes,
        draft.candidate_bytes,
    )
    envelope_changes = _json_change_markers(
        "envelope",
        draft.baseline_envelope_bytes,
        draft.envelope_bytes,
    )
    anchor_changed = (
        draft.baseline_anchor_spki != draft.admitted_anchor_spki
    )
    variant = str(
        getattr(draft.bundle_factory, "bundle_variant", "UNDECLARED")
    )
    target = str(
        getattr(draft.bundle_factory, "bundle_target", "UNDECLARED")
    )
    fd_padding = int(
        getattr(draft.bundle_factory, "fd_padding", -1)
    )
    role_set_markers = _candidate_role_set_markers(
        draft.baseline_candidate_bytes,
        draft.candidate_bytes,
    )
    if role_set_markers:
        candidate_changes = tuple(
            marker
            for marker in candidate_changes
            if not marker.startswith(
                "candidate:/observation/governed_roles/"
            )
        )
    parameters.extend(candidate_changes)
    parameters.extend(envelope_changes)
    parameters.extend(
        tuple(
            getattr(
                draft.bundle_factory,
                "parent_change_markers",
                (),
            )
        )
    )
    parameters.extend(role_set_markers)
    parameters.extend(
        (
            f"anchor_changed:{str(anchor_changed).lower()}",
            f"bundle_target:{target}",
            f"bundle_variant:{variant}",
            f"fd_padding:{fd_padding}",
            f"session_calls:{len(observed_sequence)}",
        )
    )
    parameters.extend(
        f"ordering:{event}" for event in observed_ordering
    )
    if draft.source_result is not None:
        parameters.append("independent_source_authenticated:true")

    if draft.source_result is not None:
        operator = "AUTHENTICATED_SOURCE_SPLICE"
        source_relationship = "INDEPENDENT_AUTHENTICATED_SOURCE_OBJECT"
    elif len(observed_sequence) == 2:
        operator = "PROCESS_LOCAL_REPLAY"
        source_relationship = "IDENTICAL_FIRST_CALL_NORMATIVE_INPUT"
    elif variant != "EXACT":
        operator = "BUNDLE_STATE_CHANGE"
        source_relationship = "EXACT_PARENT_BUNDLE"
    elif any(marker.endswith(":RAW_BYTES_CHANGED") for marker in parameters):
        operator = "RAW_BYTES_CHANGE"
        source_relationship = "BASELINE_NORMATIVE_INPUT"
    elif candidate_changes and envelope_changes:
        operator = "RESIGNED_CANDIDATE_CHANGE"
        source_relationship = "BASELINE_NORMATIVE_INPUT"
    elif candidate_changes:
        operator = "CANDIDATE_CHANGE"
        source_relationship = "BASELINE_CANDIDATE"
    elif anchor_changed:
        operator = "CRYPTOGRAPHIC_CONTEXT_CHANGE"
        source_relationship = "BASELINE_CRYPTOGRAPHIC_CONTEXT"
    elif envelope_changes:
        operator = "ENVELOPE_CHANGE"
        source_relationship = "BASELINE_ENVELOPE"
    elif fd_padding > 0:
        operator = "DESCRIPTOR_NUMBER_CHANGE"
        source_relationship = "BASELINE_BUNDLE_CAPABILITY"
    else:
        operator = "UNCHANGED_INPUT_EVALUATION"
        source_relationship = "BASELINE_NORMATIVE_INPUT"

    if len(observed_sequence) == 2:
        target_relationship = "PROCESS_LOCAL_REPLAY_SESSION"
    elif variant != "EXACT":
        target_relationship = "MUTATED_PARENT_BUNDLE"
    elif draft.source_result is not None:
        target_relationship = "SOURCE_OBJECT_UNDER_BASELINE_ENVELOPE"
    elif candidate_changes or envelope_changes or anchor_changed:
        target_relationship = "MUTATED_NORMATIVE_INPUT"
    elif fd_padding > 0:
        target_relationship = "EQUIVALENT_DESCRIPTOR_CAPABILITY"
    else:
        target_relationship = "UNCHANGED_NORMATIVE_INPUT"
    return (
        operator,
        tuple(sorted(parameters)),
        source_relationship,
        target_relationship,
    )


def _json_change_markers(
    label: str,
    source: bytes,
    target: bytes,
) -> tuple[str, ...]:
    if source == target:
        return ()
    try:
        source_value = strict_load_json(source)
        target_value = strict_load_json(target)
    except ValueError:
        return (f"{label}:RAW_BYTES_CHANGED",)
    pointers: list[str] = []
    _collect_changed_pointers(source_value, target_value, "", pointers)
    if not pointers:
        return (f"{label}:CANONICAL_BYTES_CHANGED",)
    return tuple(
        f"{label}:{pointer or '/'}" for pointer in sorted(set(pointers))
    )


def _candidate_role_set_markers(
    source: bytes,
    target: bytes,
) -> tuple[str, ...]:
    try:
        source_value = strict_load_json(source)
        target_value = strict_load_json(target)
        source_roles = source_value["observation"]["governed_roles"]
        target_roles = target_value["observation"]["governed_roles"]
    except (KeyError, TypeError, ValueError):
        return ()
    if not isinstance(source_roles, list) or not isinstance(target_roles, list):
        return ()
    removed = sorted(set(source_roles) - set(target_roles))
    added = sorted(set(target_roles) - set(source_roles))
    if not removed and not added:
        return ()
    return tuple(
        [f"candidate_role_removed:{value}" for value in removed]
        + [f"candidate_role_added:{value}" for value in added]
    )


def _collect_changed_pointers(
    source: object,
    target: object,
    pointer: str,
    output: list[str],
) -> None:
    if type(source) is not type(target):
        output.append(pointer)
        return
    if isinstance(source, dict):
        source_keys = set(source)
        target_keys = set(target)
        for key in sorted(source_keys | target_keys):
            child_pointer = f"{pointer}/{_pointer_escape(key)}"
            if key not in source or key not in target:
                output.append(child_pointer)
            else:
                _collect_changed_pointers(
                    source[key],
                    target[key],
                    child_pointer,
                    output,
                )
        return
    if isinstance(source, list):
        for index in range(max(len(source), len(target))):
            child_pointer = f"{pointer}/{index}"
            if index >= len(source) or index >= len(target):
                output.append(child_pointer)
            else:
                _collect_changed_pointers(
                    source[index],
                    target[index],
                    child_pointer,
                    output,
                )
        return
    if source != target:
        output.append(pointer)


def _pointer_escape(value: object) -> str:
    return str(value).replace("~", "~0").replace("/", "~1")


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
    return _sign_material_batch(
        packet, candidate_bytes, (payload,)
    )[0]


def _sign_material_batch(
    packet: RulePacket,
    candidate_bytes: bytes,
    payloads: Sequence[dict[str, object]],
) -> tuple[tuple[bytes, bytes, bytes], ...]:
    frozen_payloads = tuple(_copy_json(payload) for payload in payloads)
    signed = sign_ephemeral_batch(
        [
            signature_preimage(packet, payload)
            for payload in frozen_payloads
        ]
    )
    materials: list[tuple[bytes, bytes, bytes]] = []
    for payload, vector in zip(frozen_payloads, signed.vectors):
        if not isinstance(payload, dict):
            raise ValueError("signed payload batch is not closed")
        payload["key_id"] = signed.key_id
        envelope = {
            "schema_version": (
                "GCP_SECTION_7_5_1_SIGNED_CONTEXT_ENVELOPE_V4"
            ),
            "algorithm": "ECDSA_P256_SHA256_DER",
            "payload": payload,
            "signature_der_base64": b64encode(
                vector.signature_der
            ).decode("ascii"),
        }
        materials.append(
            (
                candidate_bytes,
                canonical_json(envelope),
                signed.anchor_spki_der,
            )
        )
    return tuple(materials)


@contextmanager
def _open_bundle(
    packet: RulePacket,
    variant: str,
    target_member: str | None,
    parent_mutator: Callable[[dict[str, object]], None] | None,
    fd_padding: int,
    observed_events: list[str],
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
        elif variant == "MUTATED_JSON":
            if parent_mutator is None:
                raise ValueError("JSON mutation requires a mutator")
            value = json.loads(parents[target])
            parent_mutator(value)
            (directory / target).write_bytes(canonical_json(value))
        elif variant == "SPLICE":
            replacement = next(name for name in parents if name != target)
            (directory / target).write_bytes(parents[replacement])
        try:
            for _ in range(fd_padding):
                padding_fds.append(os.open(os.devnull, os.O_RDONLY))
            incoming_fd = open_harness_bundle(directory)
            observed_events.append("CAPABILITY_OPENED")
            if variant == "REPLACED":
                replacement = directory / "replacement"
                replacement.write_bytes(parents[target] + b"\n")
                os.replace(replacement, directory / target)
                observed_events.append("MEMBER_REPLACED")
            elif variant == "CONCURRENT":
                mutated = parents[target] + b"\n"
                first_replacement = threading.Event()

                def replace_repeatedly() -> None:
                    while not stop.is_set():
                        replacement = directory / "replacement"
                        replacement.write_bytes(mutated)
                        os.replace(replacement, directory / target)
                        first_replacement.set()

                worker = threading.Thread(
                    target=replace_repeatedly, daemon=True
                )
                worker.start()
                observed_events.append(
                    "CONCURRENT_REPLACEMENT_STARTED"
                )
                if not first_replacement.wait(timeout=2):
                    stop.set()
                    worker.join(timeout=2)
                    raise RuntimeError(
                        "concurrent replacement did not start"
                    )
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
    observed_events: list[str] = []
    parent_change_markers: tuple[str, ...] = ()
    resolved_target = (
        target_member or packet.parent_manifest[0].member_name
    )
    if parent_mutator is not None:
        parent_bytes = load_exact_parents(packet)[resolved_target]
        parent_value = json.loads(parent_bytes)
        parent_mutator(parent_value)
        parent_change_markers = _json_change_markers(
            f"bundle:{resolved_target}",
            parent_bytes,
            canonical_json(parent_value),
        )

    def factory() -> ContextManager[int]:
        observed_events.clear()
        return _open_bundle(
            packet,
            variant,
            target_member,
            parent_mutator,
            fd_padding,
            observed_events,
        )

    setattr(factory, "observed_events", observed_events)
    setattr(factory, "bundle_variant", variant)
    setattr(
        factory,
        "bundle_target",
        resolved_target,
    )
    setattr(factory, "fd_padding", fd_padding)
    setattr(factory, "parent_change_markers", parent_change_markers)
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
            "0" * 32
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


def _synthetic_alias(
    context: bytes,
    nonce: str,
    ordinal: int = 0,
) -> str:
    if (
        not isinstance(context, bytes)
        or not isinstance(nonce, str)
        or len(nonce) != 32
        or any(character not in "0123456789abcdef" for character in nonce)
        or type(ordinal) is not int
        or ordinal < 0
    ):
        raise ValueError("synthetic alias derivation inputs are invalid")
    return hashlib.sha256(
        b"GCP_SECTION_7_5_1_SYNTHETIC_ALIAS_V1\x00"
        + hashlib.sha256(context).digest()
        + b"\x00"
        + bytes.fromhex(nonce)
        + ordinal.to_bytes(4, "big")
    ).hexdigest()[:32]


def _normative_source_sha256(
    packet: RulePacket,
    candidate_bytes: bytes,
    envelope_bytes: bytes,
    anchor_bytes: bytes,
) -> str:
    return hashlib.sha256(
        canonical_json(
            {
                "anchor_sha256": hashlib.sha256(anchor_bytes).hexdigest(),
                "candidate_sha256": hashlib.sha256(
                    candidate_bytes
                ).hexdigest(),
                "envelope_sha256": hashlib.sha256(
                    envelope_bytes
                ).hexdigest(),
                "parent_manifest": [
                    {
                        "member_name": entry.member_name,
                        "sha256": entry.sha256,
                    }
                    for entry in packet.parent_manifest
                ],
            }
        )
    ).hexdigest()


def _observed_mutation_sha256(
    draft: _CaseDraft,
    observed_sequence: Sequence[EvaluationResult],
) -> str:
    bundle_members: list[dict[str, object]] = []
    try:
        with draft.bundle_factory() as bundle_fd:
            for member_name in sorted(os.listdir(bundle_fd)):
                try:
                    member_stat = os.stat(
                        member_name,
                        dir_fd=bundle_fd,
                        follow_symlinks=False,
                    )
                    kind = (
                        "REGULAR"
                        if stat.S_ISREG(member_stat.st_mode)
                        else "NONREGULAR"
                    )
                    content_sha256 = ""
                    if kind == "REGULAR":
                        member_fd = os.open(
                            member_name,
                            os.O_RDONLY
                            | os.O_NONBLOCK
                            | os.O_NOFOLLOW,
                            dir_fd=bundle_fd,
                        )
                        try:
                            chunks: list[bytes] = []
                            while chunk := os.read(
                                member_fd, 1024 * 1024
                            ):
                                chunks.append(chunk)
                            content_sha256 = hashlib.sha256(
                                b"".join(chunks)
                            ).hexdigest()
                        finally:
                            os.close(member_fd)
                    bundle_members.append(
                        {
                            "content_sha256": content_sha256,
                            "kind": kind,
                            "member_name": member_name,
                        }
                    )
                except OSError:
                    bundle_members.append(
                        {
                            "content_sha256": "",
                            "kind": "UNSTABLE",
                            "member_name": member_name,
                        }
                    )
    except OSError:
        bundle_members.append(
            {
                "content_sha256": "",
                "kind": "UNSTABLE_DIRECTORY",
                "member_name": "",
            }
        )
    return hashlib.sha256(
        canonical_json(
            {
                "anchor_sha256": hashlib.sha256(
                    draft.admitted_anchor_spki
                ).hexdigest(),
                "bundle_members": bundle_members,
                "candidate_sha256": hashlib.sha256(
                    draft.candidate_bytes
                ).hexdigest(),
                "envelope_sha256": hashlib.sha256(
                    draft.envelope_bytes
                ).hexdigest(),
                "oracle_sequence": [
                    asdict(result) for result in observed_sequence
                ],
            }
        )
    ).hexdigest()


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


def _invoke_closed_child(
    case: PreparedCase,
) -> tuple[EvaluationResult, ...]:
    primary_input_values = (
        case.candidate_bytes,
        case.envelope_bytes,
        case.admitted_anchor_spki,
    )
    replay_input_values = (
        primary_input_values if len(case.expected_sequence) == 2 else ()
    )
    input_values = primary_input_values + replay_input_values
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
            if replay_input_values:
                command.extend(
                    [
                        "--replay-candidate-fd",
                        str(input_pipes[3][0]),
                        "--replay-envelope-fd",
                        str(input_pipes[4][0]),
                        "--replay-anchor-fd",
                        str(input_pipes[5][0]),
                    ]
                )
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
                return _parse_closed_result_sequence_bytes(
                    result_chunks[0],
                    len(case.expected_sequence),
                )
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
