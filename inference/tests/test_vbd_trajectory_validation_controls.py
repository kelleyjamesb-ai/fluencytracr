import pytest

import fluencytracr_inference.vbd_trajectory_validation_controls as controls
from fluencytracr_inference.vbd_trajectory_synthetic import (
    VBD_TRAJECTORY_SMOKE_SEED_MIN,
    generate_vbd_trajectory_smoke_case,
)
from fluencytracr_inference.vbd_trajectory_preparation import (
    TrajectoryPreparationError,
    validate_vbd_trajectory_standardization_window_indexes,
)
from fluencytracr_inference.vbd_trajectory_types import (
    TrajectoryStructureError,
    VBD_TRAJECTORY_LANES,
    validate_trajectory_lane_window_manifest,
)
from fluencytracr_inference.vbd_trajectory_validation_plan import (
    VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER,
    VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER,
    VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER,
    required_vbd_trajectory_validation_slots,
)
from fluencytracr_inference.vbd_trajectory_validation_study import (
    summarize_vbd_trajectory_validation_results,
)


def _slot(family, case_id, *, groups=6, replication=0):
    return next(
        slot
        for slot in required_vbd_trajectory_validation_slots()
        if slot.family == family
        and slot.scenario_or_control_id == case_id
        and slot.panel_group_count == groups
        and slot.replication_index == replication
    )


def _smoke_lane_window_keys():
    panel = generate_vbd_trajectory_smoke_case(
        seed=VBD_TRAJECTORY_SMOKE_SEED_MIN + 100
    ).panel
    return panel, tuple(
        (bundle.panel_group_index, lane, bundle.window_index)
        for bundle in panel.bundles
        for lane in VBD_TRAJECTORY_LANES
    )


def test_control_catalog_covers_exact_kinds_and_all_compiled_expansions():
    expected_keys = {
        *(("drift", value) for value in VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER[:5]),
        *(("floor", f"k={value}") for value in VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER),
        *(("negative_control", value) for value in VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER),
    }
    assert set(controls._CONTROL_SPECIFICATIONS) == expected_keys
    assert len(expected_keys) == 5 + 6 + 34

    expanded = tuple(
        slot
        for slot in required_vbd_trajectory_validation_slots()
        if (slot.family, slot.scenario_or_control_id) in expected_keys
    )
    assert len(expanded) == 300 + 12 + 68
    for slot in expanded:
        canonical, specification = controls._canonical_control_slot(slot)
        assert canonical == slot
        assert specification.expected_stage == slot.expected_failure_stage


def test_window_controls_hit_the_production_manifest_boundary_with_smoke_inputs():
    panel, keys = _smoke_lane_window_keys()
    validate_trajectory_lane_window_manifest(
        keys, panel_group_count=panel.panel_group_count
    )

    mutations = (
        (keys + ((0, "breadth", 10),), "duplicated"),
        (
            keys + tuple((0, lane, 99) for lane in VBD_TRAJECTORY_LANES),
            "off plan",
        ),
        (
            keys + tuple((0, lane, 18) for lane in VBD_TRAJECTORY_LANES),
            "lookahead",
        ),
        (
            tuple(
                (group, lane, window + 1 if lane == "breadth" else window)
                for group, lane, window in keys
            ),
            "misaligned",
        ),
    )
    for mutated, message in mutations:
        with pytest.raises(TrajectoryStructureError, match=message):
            validate_trajectory_lane_window_manifest(
                mutated, panel_group_count=panel.panel_group_count
            )


def test_standardization_recomputation_and_governance_boundaries_fail_closed():
    from fluencytracr_inference.vbd_trajectory_validation_resumable import (
        validate_vbd_trajectory_combined_governance,
        validate_vbd_trajectory_recomputation_source,
    )

    validate_vbd_trajectory_standardization_window_indexes(tuple(range(12)))
    with pytest.raises(TrajectoryPreparationError, match="twelve pre-period"):
        validate_vbd_trajectory_standardization_window_indexes(tuple(range(18)))
    validate_vbd_trajectory_recomputation_source("compiled_slot_regeneration")
    with pytest.raises(ValueError, match="cannot deserialize"):
        validate_vbd_trajectory_recomputation_source("primary_result")

    flags = {
        "independent_acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
        "customer_output_authorized": False,
        "confidence_output_authorized": False,
        "probability_output_authorized": False,
        "roi_output_authorized": False,
        "causality_output_authorized": False,
        "productivity_output_authorized": False,
    }
    validate_vbd_trajectory_combined_governance(flags)
    for key in flags:
        mutated = {**flags, key: True}
        with pytest.raises(ValueError, match="cannot authorize"):
            validate_vbd_trajectory_combined_governance(mutated)


def test_partial_study_hits_the_production_fail_closed_combiner():
    summary = summarize_vbd_trajectory_validation_results(())
    assert summary["state"] == "HOLD"
    assert summary["exact_manifest_complete"] is False
    assert "exact_manifest_incomplete" in summary["failing_checks"]


def test_zero_variance_control_hits_production_scale_gate_without_generation(
    monkeypatch,
):
    generated = False
    observed: list[object] = []
    production_validator = controls.validate_vbd_trajectory_pre_period_scale

    def forbidden_generation(_slot):
        nonlocal generated
        generated = True
        raise AssertionError("zero-variance control must not mutate a panel")

    def recording_validator(scale):
        observed.append(scale)
        return production_validator(scale)

    monkeypatch.setattr(controls, "_generate_control_base", forbidden_generation)
    monkeypatch.setattr(
        controls,
        "validate_vbd_trajectory_pre_period_scale",
        recording_validator,
    )
    slot = _slot("negative_control", "zero_pre_period_variance")

    result = controls.execute_vbd_trajectory_control_slot(
        slot, _token=controls._VBD_TRAJECTORY_CONTROL_RUNNER_TOKEN
    )

    assert generated is False
    assert observed == [0.0]
    assert result.row_state == "EXPECTED_HOLD"
    assert result.failure_stage == "pre_period_scale_gate_before_fit"
    assert result.failure_code == "expected_control_state"
    assert result.fit_attempted is False
    assert result.unplanned_runner_error is False
    assert result.expectation_matched is True


def test_runner_entry_rejects_bad_token_regular_slots_and_arbitrary_inputs(monkeypatch):
    called = False

    def forbidden_generation(_slot):
        nonlocal called
        called = True
        raise AssertionError("generation must not run")

    monkeypatch.setattr(controls, "_generate_control_base", forbidden_generation)
    floor = _slot("floor", "k=4")
    primary = _slot("primary", "effect=0")
    understated = _slot("drift", "understated_uncertainty")
    token = controls._VBD_TRAJECTORY_CONTROL_RUNNER_TOKEN

    with pytest.raises(controls.VbdTrajectoryControlExecutionError, match="runner-owned"):
        controls.execute_vbd_trajectory_control_slot(floor, _token=object())
    with pytest.raises(ValueError, match="only floor, negative, or structural-drift"):
        controls.execute_vbd_trajectory_control_slot(primary, _token=token)
    with pytest.raises(ValueError, match="only floor, negative, or structural-drift"):
        controls.execute_vbd_trajectory_control_slot(understated, _token=token)
    with pytest.raises(TypeError):
        controls.execute_vbd_trajectory_control_slot(
            floor, _token=token, panel={}  # type: ignore[call-arg]
        )
    assert called is False
