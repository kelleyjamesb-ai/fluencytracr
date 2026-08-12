from dataclasses import replace

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_joint_replicated_validation_plan import (
    VBD_JOINT_REPLICATED_FAILURE_CODES,
    VBD_JOINT_REPLICATED_NAMESPACES,
    VBDJointReplicatedPlanError,
    VBDJointReplicatedValidationClaim,
    VBDJointReplicatedValidationDisposition,
    VBDJointReplicatedValidationSlot,
    validate_claim_for_slot,
    validate_disposition_for_claim,
    validate_replicated_slot_manifest,
    validate_seed_manifest,
    vbd_joint_replicated_validation_plan,
)


@pytest.fixture(scope="module")
def plan():
    return vbd_joint_replicated_validation_plan()


def test_plan_has_exact_frozen_universe(plan):
    assert len(plan.qualifying_slots) == 600
    assert len(plan.preflight_slots) == 6
    assert len(plan.canary_slots) == 2
    assert len(plan.chunks) == 100
    assert all(len(chunk.slot_ids) == 6 for chunk in plan.chunks)
    assert plan.body_without_hash()["all_authorization_flags_false"] is True
    assert plan.body_without_hash()["automatic_retries"] is False


def test_plan_is_deterministic_and_seed_bound(plan):
    repeated = vbd_joint_replicated_validation_plan()
    assert plan.plan_hash == repeated.plan_hash
    validate_seed_manifest()
    qualifying = plan.qualifying_slots
    assert qualifying[0].dataset_seed == 202_610_000
    assert qualifying[-1].dataset_seed == 202_610_099
    assert qualifying[0].chain_seeds == (302_610_000, 302_610_001, 302_610_002, 302_610_003)
    assert qualifying[1].chain_seeds == (312_610_000, 312_610_001, 312_610_002, 312_610_003)


def test_plan_has_namespace_separation(plan):
    for namespace, slots in (
        ("qualifying", plan.qualifying_slots),
        ("preflight", plan.preflight_slots),
        ("runtime_canary", plan.canary_slots),
    ):
        validate_replicated_slot_manifest(namespace, tuple(slot.slot_id for slot in slots))
    with pytest.raises(VBDJointReplicatedPlanError, match="incomplete"):
        validate_replicated_slot_manifest(
            "qualifying", tuple(slot.slot_id for slot in plan.preflight_slots)
        )


def test_invalid_slot_profile_is_rejected():
    with pytest.raises(VBDJointReplicatedPlanError, match="sensitivity"):
        VBDJointReplicatedValidationSlot(
            namespace="qualifying",
            cell_id="high_capability_error",
            replicate_index=0,
            scenario_id="high_capability_error:replicate=0",
            variant="restricted",
            dataset_seed=202_610_000,
            sampler_seed_base=352_610_000,
            chains=4,
            draws=1_000,
            tune=1_000,
            target_accept=0.95,
            max_treedepth=12,
        )


def _claim_for_slot(plan, slot):
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "scenario_id": slot.scenario_id,
        "variant": slot.variant,
        "dataset_seed": slot.dataset_seed,
        "chain_seeds": slot.chain_seeds,
        "slot_hash": slot.slot_hash,
        "plan_hash": plan.plan_hash,
        "source_commit": "a" * 40,
        "runtime_manifest_hash": "b" * 64,
        "started_at": "2026-08-11T00:00:00+00:00",
        "deadline_at": "2026-08-11T02:00:00+00:00",
    }
    return VBDJointReplicatedValidationClaim(
        **body, claim_hash=sha256_json(body)
    )


def test_claim_binds_execution_identity(plan):
    slot = plan.qualifying_slots[0]
    claim = _claim_for_slot(plan, slot)
    assert claim.body_without_hash()["chain_seeds"] == list(slot.chain_seeds)
    validate_claim_for_slot(claim, slot, plan.plan_hash)

    with pytest.raises(VBDJointReplicatedPlanError, match="claim hash"):
        replace(claim, claim_hash="c" * 64)

    with pytest.raises(VBDJointReplicatedPlanError, match="does not bind"):
        validate_claim_for_slot(claim, plan.qualifying_slots[1], plan.plan_hash)


def test_disposition_has_closed_state_and_failure_code(plan):
    slot = plan.qualifying_slots[0]
    claim = _claim_for_slot(plan, slot)
    claim_hash = claim.claim_hash
    result_hash = "b" * 64
    complete_body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": result_hash,
    }
    complete = VBDJointReplicatedValidationDisposition(
        **complete_body, disposition_hash=sha256_json(complete_body)
    )
    assert complete.failure_code == "NONE"

    held_body = {**complete_body, "state": "HOLD", "failure_code": "SAMPLER_TIMEOUT"}
    held = VBDJointReplicatedValidationDisposition(
        **held_body, disposition_hash=sha256_json(held_body)
    )
    assert held.state == "HOLD"
    validate_disposition_for_claim(complete, claim)

    with pytest.raises(VBDJointReplicatedPlanError, match="does not bind"):
        validate_disposition_for_claim(
            complete, _claim_for_slot(plan, plan.qualifying_slots[1])
        )

    with pytest.raises(VBDJointReplicatedPlanError, match="failure"):
        invalid_body = {**complete_body, "failure_code": "SAMPLER_ERROR"}
        VBDJointReplicatedValidationDisposition(
            **invalid_body,
            disposition_hash=sha256_json(invalid_body),
        )
    assert "RAW_EXCEPTION" not in VBD_JOINT_REPLICATED_FAILURE_CODES


def test_plan_serialization_contains_no_authority_or_raw_error_text(plan):
    rendered = repr(plan.to_dict())
    assert "customer_output_authorized" not in rendered
    assert "posterior_draw" not in rendered
    assert "traceback" not in rendered.lower()
    assert set(VBD_JOINT_REPLICATED_NAMESPACES) == {
        "preflight", "runtime_canary", "qualifying"
    }
