from dataclasses import replace

import numpy as np
import pytest

from fluencytracr_inference.hashing import stable_stringify
from fluencytracr_inference.vbd_joint_preparation import prepare_vbd_joint_dataset
from fluencytracr_inference.vbd_joint_model import build_vbd_joint_model
from fluencytracr_inference.vbd_joint_synthetic import (
    generate_vbd_joint_synthetic_dataset,
)
from fluencytracr_inference.vbd_joint_types import (
    VBD_JOINT_CAPABILITY_STANDARD_ERROR,
    VBD_JOINT_ELIGIBLE_FAMILIES,
    VBD_JOINT_NULL_SEED,
    VBD_JOINT_OUTCOME_STANDARD_ERROR,
    VBD_JOINT_PANEL_COUNT,
    VBD_JOINT_PRIMARY_SEED,
    VBD_JOINT_WINDOW_COUNT,
    VBDJointStructureError,
    vbd_joint_freeze_hashes,
)
from fluencytracr_inference.vbd_joint_validation import (
    run_vbd_joint_structural_validation,
)


@pytest.fixture(scope="module")
def primary_dataset():
    return generate_vbd_joint_synthetic_dataset(scenario="primary")


@pytest.fixture(scope="module")
def prepared(primary_dataset):
    return prepare_vbd_joint_dataset(primary_dataset)


def test_frozen_synthetic_geometry_and_hashes(primary_dataset, prepared):
    assert primary_dataset.seed == VBD_JOINT_PRIMARY_SEED
    assert len(primary_dataset.checkpoints) == VBD_JOINT_PANEL_COUNT * VBD_JOINT_WINDOW_COUNT
    assert len(primary_dataset.transitions) == VBD_JOINT_PANEL_COUNT * (
        VBD_JOINT_WINDOW_COUNT - 1
    )
    assert prepared.row_count == VBD_JOINT_PANEL_COUNT * (VBD_JOINT_WINDOW_COUNT - 1)
    assert prepared.capability_row_count == VBD_JOINT_PANEL_COUNT * VBD_JOINT_WINDOW_COUNT
    assert primary_dataset.plan.eligible_family_count == VBD_JOINT_ELIGIBLE_FAMILIES
    assert set(vbd_joint_freeze_hashes()) == {
        "geometry_hash",
        "prior_hash",
        "sampler_hash",
        "validation_hash",
        "artifact_shape_hash",
    }


def test_preparation_is_deterministic_and_arrays_are_immutable(primary_dataset, prepared):
    repeated = prepare_vbd_joint_dataset(primary_dataset)

    assert prepared.prepared_input_hash == repeated.prepared_input_hash
    assert prepared.model_input_hash == repeated.model_input_hash
    assert prepared.context_binding_hash == repeated.context_binding_hash
    for value in (
        prepared.panel_index,
        prepared.capability_observed,
        prepared.observed_outcome,
        prepared.control_matrix,
    ):
        assert value.flags.writeable is False
        assert value.flags.owndata is False
        with pytest.raises(ValueError):
            value.setflags(write=True)
    with pytest.raises(ValueError):
        prepared.observed_outcome[0] = 0.0


def test_model_rejects_replaced_prepared_arrays(prepared):
    replaced_evaluation = np.zeros_like(prepared.evaluation)
    replaced_evaluation.setflags(write=False)
    forged = replace(prepared, evaluation=replaced_evaluation)

    with pytest.raises(VBDJointStructureError, match="prepared evaluation"):
        build_vbd_joint_model(forged, variant="full")


def test_fixture_is_aggregate_only_and_does_not_emit_private_registry_members(primary_dataset):
    serialized = stable_stringify(
        {
            "dataset_hash": primary_dataset.content_hash(),
            "checkpoints": [item.to_hash_body() for item in primary_dataset.checkpoints],
            "transitions": [item.to_hash_body() for item in primary_dataset.transitions],
        }
    )

    assert "synthetic-private" not in serialized
    assert "family_id" not in serialized
    assert "member" not in serialized
    assert "user" not in serialized


def test_each_panel_has_one_slice_and_disjoint_registry(primary_dataset):
    by_panel = {}
    for checkpoint in primary_dataset.checkpoints:
        by_panel.setdefault(checkpoint.panel_index, []).append(checkpoint)

    assert len(by_panel) == VBD_JOINT_PANEL_COUNT
    assert len(
        {
            (rows[0].workflow_id, rows[0].jbtd_id, rows[0].persona_id)
            for rows in by_panel.values()
        }
    ) == VBD_JOINT_PANEL_COUNT
    assert len({rows[0].family_registry_root for rows in by_panel.values()}) == VBD_JOINT_PANEL_COUNT
    with pytest.raises(VBDJointStructureError, match="not disjoint"):
        generate_vbd_joint_synthetic_dataset(
            scenario="primary",
            duplicate_registry_allocation=True,
        )


def test_transition_counts_reconcile_exactly(primary_dataset):
    checkpoints = {
        (item.panel_index, item.checkpoint_index): item
        for item in primary_dataset.checkpoints
    }
    for transition in primary_dataset.transitions:
        previous = checkpoints[(transition.panel_index, transition.transition_index - 1)]
        current = checkpoints[(transition.panel_index, transition.transition_index)]
        assert transition.retained_count + transition.lapsed_count == previous.embedded_count
        assert transition.retained_count + transition.newly_embedded_count == current.embedded_count
        assert (
            transition.retained_count
            + transition.newly_embedded_count
            + transition.lapsed_count
            + transition.remaining_nonembedded_count
            == VBD_JOINT_ELIGIBLE_FAMILIES
        )


def test_known_measurement_error_is_present(primary_dataset):
    assert {
        item.standard_error for item in primary_dataset.capability_observations
    } == {VBD_JOINT_CAPABILITY_STANDARD_ERROR}
    assert {item.standard_error for item in primary_dataset.outcome_observations} == {
        VBD_JOINT_OUTCOME_STANDARD_ERROR
    }


def test_null_case_has_separate_seed_and_input_hash(primary_dataset):
    null = generate_vbd_joint_synthetic_dataset(
        scenario="behavior_pathway_null"
    )

    assert null.seed == VBD_JOINT_NULL_SEED
    assert null.content_hash() != primary_dataset.content_hash()
    assert (
        prepare_vbd_joint_dataset(null).prepared_input_hash
        != prepare_vbd_joint_dataset(primary_dataset).prepared_input_hash
    )


def test_missing_or_held_values_are_not_coerced_to_zero(primary_dataset):
    checkpoints = list(primary_dataset.checkpoints)
    checkpoints[0] = replace(checkpoints[0], suppressed=True)
    held = replace(primary_dataset, checkpoints=tuple(checkpoints))

    with pytest.raises(VBDJointStructureError, match="suppressed"):
        prepare_vbd_joint_dataset(held)


def test_behavior_lag_mapping_stays_within_each_panel(prepared):
    for row, panel in enumerate(prepared.panel_index):
        lagged_row = int(prepared.lagged_behavior_row_index[row])
        if lagged_row >= 0:
            assert prepared.panel_index[lagged_row] == panel
            assert prepared.checkpoint_index[lagged_row] == prepared.checkpoint_index[row] - 1
        else:
            assert prepared.checkpoint_index[row] == 1


def test_structural_validation_covers_frozen_fail_closed_controls():
    report = run_vbd_joint_structural_validation()

    assert report["state"] == "PASS"
    assert report["deterministic_recomputation"] is True
    assert report["cross_slice_derived_output"] is False
    assert report["future_capability_windows_excluded_from_training"] is True
    assert report["future_behavior_windows_excluded_from_training"] is True
    assert report["future_outcome_windows_excluded_from_training"] is True
    assert report["complete_validation_universe_executed"] is False
    assert report["independent_review_passed"] is False
    assert {item["control_name"] for item in report["controls"]} == {
        "duplicate_private_registry_allocation",
        "observable_source_universe_drift",
        "cohort_alignment",
        "capability_uncertainty",
        "algebraic_behavior_duplication",
        "wrong_lag",
        "outcome_informed_freeze",
        "coordinated_plan_replacement",
        "coordinated_registry_replacement",
        "coordinated_cohort_replacement",
        "coordinated_source_replacement",
        "generator_identity_replacement",
        "nonfinal_checkpoint",
        "suppressed_capability",
        "stale_outcome",
        "imputed_control",
    }
    assert all(item["state"] == "PASS" for item in report["controls"])
    controls = {item["control_name"]: item for item in report["controls"]}
    assert "behavior basis" in controls["algebraic_behavior_duplication"][
        "hold_reason"
    ]
    assert "behavior_outcome_lag" in controls["wrong_lag"]["hold_reason"]


def test_model_inputs_are_finite(prepared):
    for values in (
        prepared.capability_observed,
        prepared.capability_standard_error,
        prepared.observed_outcome,
        prepared.outcome_standard_error,
        prepared.control_matrix,
    ):
        assert np.isfinite(values).all()
