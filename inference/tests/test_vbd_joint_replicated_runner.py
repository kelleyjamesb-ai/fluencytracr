from dataclasses import replace

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_joint_replicated_runner import (
    VBDJointReplicatedAttemptLedger,
    VBDJointReplicatedRunnerError,
    build_sampler_free_execution_packet,
    combine_namespace,
    emit_sanitized_ensemble_artifact,
    make_checkpoint_for_disposition,
    make_claim_for_slot,
    make_frozen_runtime_manifest,
    validate_sanitized_ensemble_artifact,
)
from fluencytracr_inference.vbd_joint_replicated_validation_plan import (
    VBDJointReplicatedValidationDisposition,
    vbd_joint_replicated_validation_plan,
)


SOURCE_COMMIT = "a" * 40
STARTED_AT = "2026-08-11T00:00:00+00:00"
DEADLINE_AT = "2026-08-11T02:00:00+00:00"


@pytest.fixture(scope="module")
def runtime_manifest():
    return make_frozen_runtime_manifest(SOURCE_COMMIT)


def test_runtime_manifest_is_exact_and_hash_bound(runtime_manifest):
    assert runtime_manifest.source_commit == SOURCE_COMMIT
    assert runtime_manifest.manifest_hash == sha256_json(runtime_manifest.body_without_hash())
    with pytest.raises(VBDJointReplicatedRunnerError, match="platform"):
        replace(runtime_manifest, platform="linux")


def test_sampler_free_packet_binds_slot_and_dataset_without_sampling(runtime_manifest):
    slot = vbd_joint_replicated_validation_plan().preflight_slots[0]
    packet = build_sampler_free_execution_packet(slot, runtime_manifest=runtime_manifest)
    assert packet.slot_id == slot.slot_id
    assert packet.dataset_hash
    assert packet.packet_hash == sha256_json(packet.body_without_hash())


def test_claim_and_disposition_are_append_only_and_hash_bound(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.preflight_slots[0]
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    ledger = VBDJointReplicatedAttemptLedger().append_claim(claim, slot, plan.plan_hash)
    result_hash = sha256_json({"result": slot.slot_id})
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": result_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **body,
        disposition_hash=sha256_json(body),
    )
    checkpoint = make_checkpoint_for_disposition(
        disposition, case_hash=sha256_json({"case": slot.slot_id})
    )
    completed = ledger.append_disposition(disposition, checkpoint)
    assert completed.attempt_root != ledger.attempt_root
    with pytest.raises(VBDJointReplicatedRunnerError, match="already exists"):
        ledger.append_claim(claim, slot, plan.plan_hash)


def _append_complete(ledger, slot, plan, runtime_manifest):
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    ledger = ledger.append_claim(claim, slot, plan.plan_hash)
    result_hash = sha256_json({"result": slot.slot_id})
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": result_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **body,
        disposition_hash=sha256_json(body),
    )
    return ledger.append_disposition(
        disposition,
        make_checkpoint_for_disposition(
            disposition, case_hash=sha256_json({"case": slot.slot_id})
        ),
    )


def test_qualifying_combiner_requires_the_exact_complete_manifest(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    ledger = VBDJointReplicatedAttemptLedger()
    for slot in plan.qualifying_slots:
        ledger = _append_complete(ledger, slot, plan, runtime_manifest)
    summary = combine_namespace(ledger, namespace="qualifying", plan=plan)
    assert summary.state == "COMPLETE"
    assert summary.expected_slot_count == 600
    assert summary.observed_disposition_count == 600
    assert summary.observed_dataset_count == 400


def test_incomplete_namespaces_hold_and_sanitized_artifact_is_nonauthorizing(runtime_manifest):
    artifact = emit_sanitized_ensemble_artifact(
        VBDJointReplicatedAttemptLedger(), runtime_manifest=runtime_manifest
    )
    validate_sanitized_ensemble_artifact(artifact)
    assert artifact["state"] == "HOLD"
    assert artifact["authorization_flags"][-1] == ["runtime_integration_authorized", False]
    assert artifact["failure_codes"] == ["INTERRUPTED_OR_AMBIGUOUS"]


def test_artifact_rejects_unsafe_fields_and_tampering(runtime_manifest):
    artifact = emit_sanitized_ensemble_artifact(
        VBDJointReplicatedAttemptLedger(), runtime_manifest=runtime_manifest
    )
    unsafe = {**artifact, "posterior_draws": []}
    with pytest.raises(VBDJointReplicatedRunnerError, match="keys"):
        validate_sanitized_ensemble_artifact(unsafe)
    forged = {**artifact, "state": "COMPLETE"}
    with pytest.raises(VBDJointReplicatedRunnerError, match="self-hash"):
        validate_sanitized_ensemble_artifact(forged)


def test_off_manifest_claim_cannot_enter_qualifying_combiner(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.preflight_slots[0]
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    forged_body = {**claim.body_without_hash(), "namespace": "qualifying"}
    forged_claim = replace(
        claim,
        namespace="qualifying",
        claim_hash=sha256_json(forged_body),
    )
    ledger = VBDJointReplicatedAttemptLedger(claims=(forged_claim,))
    with pytest.raises(VBDJointReplicatedRunnerError):
        combine_namespace(ledger, namespace="qualifying", plan=plan)
