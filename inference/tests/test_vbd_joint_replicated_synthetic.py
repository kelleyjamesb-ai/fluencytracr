import pytest

from fluencytracr_inference.vbd_joint_replicated_synthetic import (
    VBD_JOINT_REPLICATED_HIGH_ERROR_CAPABILITY_STANDARD_ERROR,
    VBDJointReplicatedSyntheticError,
    generate_vbd_joint_replicated_case_for_slot,
    generate_vbd_joint_replicated_dataset,
    validate_vbd_joint_replicated_dataset,
)
from fluencytracr_inference.vbd_joint_replicated_validation_plan import (
    vbd_joint_replicated_validation_plan,
)


def test_each_frozen_cell_binds_its_seed_and_scenario():
    for cell_id in (
        "primary",
        "behavior_pathway_null",
        "omitted_confounder_stress",
        "high_capability_error",
    ):
        case = generate_vbd_joint_replicated_dataset(cell_id=cell_id, replicate_index=0)
        assert case.dataset_seed == 202_610_000
        assert case.scenario_id == f"{cell_id}:replicate=0"
        assert len(case.checkpoints) == 6 * 18
        assert len(case.transitions) == 6 * 17
        validate_vbd_joint_replicated_dataset(case)


def test_canary_is_disjoint_and_has_no_replicate_index():
    case = generate_vbd_joint_replicated_dataset(
        cell_id="runtime_canary", replicate_index=None
    )
    assert case.dataset_seed == 202_619_999
    assert case.scenario_id == "runtime_canary:replicate=None"
    assert case.omitted_confounder_present is False

    with pytest.raises(VBDJointReplicatedSyntheticError, match="no replicate"):
        generate_vbd_joint_replicated_dataset(
            cell_id="runtime_canary", replicate_index=0
        )


def test_seed_binding_rejects_off_plan_requests():
    with pytest.raises(VBDJointReplicatedSyntheticError, match="does not match"):
        generate_vbd_joint_replicated_dataset(
            cell_id="primary", replicate_index=0, dataset_seed=202_610_001
        )
    with pytest.raises(VBDJointReplicatedSyntheticError, match="outside"):
        generate_vbd_joint_replicated_dataset(cell_id="primary", replicate_index=100)


def test_repeated_generation_is_byte_deterministic_and_replicates_differ():
    first = generate_vbd_joint_replicated_dataset(cell_id="primary", replicate_index=4)
    repeated = generate_vbd_joint_replicated_dataset(cell_id="primary", replicate_index=4)
    next_case = generate_vbd_joint_replicated_dataset(cell_id="primary", replicate_index=5)
    assert first.content_hash() == repeated.content_hash()
    assert first.component_commitment == repeated.component_commitment
    assert first.content_hash() != next_case.content_hash()


def test_null_and_high_error_cells_change_only_the_frozen_case_dimensions():
    primary = generate_vbd_joint_replicated_dataset(cell_id="primary", replicate_index=0)
    null = generate_vbd_joint_replicated_dataset(
        cell_id="behavior_pathway_null", replicate_index=0
    )
    high_error = generate_vbd_joint_replicated_dataset(
        cell_id="high_capability_error", replicate_index=0
    )
    assert dict(null.truth)["outcome_capability"] == 0.25
    assert dict(null.truth)["outcome_embedded"] == 0.0
    assert high_error.capability_standard_error == (
        VBD_JOINT_REPLICATED_HIGH_ERROR_CAPABILITY_STANDARD_ERROR
    )
    assert primary.capability_standard_error != high_error.capability_standard_error
    assert primary.capability_observations[0].observed_value != (
        high_error.capability_observations[0].observed_value
    )


def test_omitted_confounder_is_not_emitted_as_a_record_or_field():
    case = generate_vbd_joint_replicated_dataset(
        cell_id="omitted_confounder_stress", replicate_index=0
    )
    assert case.omitted_confounder_present is True
    assert not hasattr(case, "omitted_common_cause")
    assert "omitted_common_cause" not in repr(case.dataset)
    validate_vbd_joint_replicated_dataset(case)


def test_component_commitment_is_seed_keyed_not_call_order_keyed():
    first = generate_vbd_joint_replicated_dataset(cell_id="primary", replicate_index=0)
    null = generate_vbd_joint_replicated_dataset(
        cell_id="behavior_pathway_null", replicate_index=0
    )
    assert first.component_commitment == null.component_commitment


def test_slot_generation_binds_the_frozen_plan_identity():
    slot = vbd_joint_replicated_validation_plan().qualifying_slots[0]
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    assert case.scenario_id == slot.scenario_id
    assert case.dataset_seed == slot.dataset_seed
