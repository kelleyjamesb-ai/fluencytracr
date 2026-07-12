from dataclasses import FrozenInstanceError, fields
from itertools import product
import math

import numpy as np
import pytest

from fluencytracr_inference.longitudinal_types import (
    MAX_JAVASCRIPT_SAFE_INTEGER,
    LongitudinalStructureError,
    LongitudinalSyntheticDataset,
    validate_longitudinal_dataset_structure,
)
from fluencytracr_inference.longitudinal_validation_synthetic import (
    LONGITUDINAL_VALIDATION_AR1_RHO,
    LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD,
    LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS,
    LONGITUDINAL_VALIDATION_POST_WINDOW_COUNT,
    LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT,
    LongitudinalValidationCase,
    generate_longitudinal_validation_case,
)


REQUIRED_CELLS = tuple(
    product(
        LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD,
        LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS,
    )
)


def _case(
    effect_size_sd: float = 0.2,
    panel_group_count: int = 6,
    seed: int = 202607120,
) -> LongitudinalValidationCase:
    return generate_longitudinal_validation_case(
        effect_size_sd=effect_size_sd,
        panel_group_count=panel_group_count,
        seed=seed,
    )


def _standardized_from_pre(values: np.ndarray, post: np.ndarray) -> np.ndarray:
    pre = np.asarray(values, dtype=float)[post == 0]
    return (np.asarray(values, dtype=float) - pre.mean()) / pre.std(ddof=1)


@pytest.mark.parametrize(("effect_size_sd", "panel_group_count"), REQUIRED_CELLS)
def test_exact_six_cells_generate_governed_synthetic_cases(
    effect_size_sd,
    panel_group_count,
):
    case = _case(effect_size_sd, panel_group_count)
    dataset = case.dataset

    assert isinstance(case, LongitudinalValidationCase)
    assert isinstance(dataset, LongitudinalSyntheticDataset)
    assert case.truth.requested_effect_size_sd == effect_size_sd
    assert dataset.cohort_count == panel_group_count
    assert dataset.pre_window_count == LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT
    assert dataset.post_window_count == LONGITUDINAL_VALIDATION_POST_WINDOW_COUNT
    assert dataset.evaluation_window_refs == ("m14", "m15", "m16", "m17")
    validate_longitudinal_dataset_structure(dataset)

    assert np.all(dataset.known_aggregate_se > 0.0)
    assert dataset.control_names == (
        "seasonality_index",
        "customer_demand_index",
    )
    assert dataset.control_source_refs == (
        "synthetic-control://seasonality",
        "synthetic-control://demand-index",
    )
    assert dataset.real_data_present is False
    assert dataset.customer_data_present is False
    assert dataset.production_data_present is False
    assert dataset.live_data_source_present is False
    assert dataset.ai_fluency_snapshots[0].aggregate_only is True
    assert dataset.ai_fluency_snapshots[0].person_level_data_present is False


def test_case_and_truth_are_frozen_and_truth_stays_outside_model_input():
    case = _case()
    dataset_field_names = {field.name for field in fields(case.dataset)}

    assert case.truth_sidecar is case.truth
    assert "truth" not in dataset_field_names
    assert "truth_sidecar" not in dataset_field_names
    assert "ground_truth" not in dataset_field_names
    assert "effect_size_sd" not in dataset_field_names
    assert not hasattr(case.dataset, "truth")

    with pytest.raises(FrozenInstanceError):
        case.truth = case.truth  # type: ignore[misc]
    with pytest.raises(FrozenInstanceError):
        case.truth.requested_effect_size_sd = 0.5  # type: ignore[misc]


def test_seeded_generation_is_deterministic_without_collapsing_distinct_seeds():
    first = _case(seed=202607120)
    second = _case(seed=202607120)
    different = _case(seed=202607121)

    assert first == second
    assert first.truth == second.truth
    assert first.dataset.synthetic_input_hash() == second.dataset.synthetic_input_hash()
    np.testing.assert_array_equal(
        first.dataset.observed_outcome,
        second.dataset.observed_outcome,
    )

    assert first != different
    assert first.dataset.synthetic_input_hash() != different.dataset.synthetic_input_hash()
    assert not np.array_equal(
        first.dataset.observed_outcome,
        different.dataset.observed_outcome,
    )


@pytest.mark.parametrize("panel_group_count", LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS)
def test_panel_is_balanced_group_major_and_strictly_ordered(panel_group_count):
    dataset = _case(panel_group_count=panel_group_count).dataset
    expected_times = np.arange(
        LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT
        + LONGITUDINAL_VALIDATION_POST_WINDOW_COUNT
    )

    positions = list(zip(dataset.cohort_idx.tolist(), dataset.time_index.tolist()))
    assert positions == sorted(positions)
    for panel_group in range(panel_group_count):
        rows = dataset.cohort_idx == panel_group
        np.testing.assert_array_equal(dataset.time_index[rows], expected_times)
        np.testing.assert_array_equal(
            dataset.post[rows],
            np.concatenate(
                [
                    np.zeros(LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT, dtype=int),
                    np.ones(LONGITUDINAL_VALIDATION_POST_WINDOW_COUNT, dtype=int),
                ]
            ),
        )
        assert tuple(np.asarray(dataset.window_refs, dtype=object)[rows]) == tuple(
            f"m{time:02d}" for time in expected_times
        )


@pytest.mark.parametrize(("effect_size_sd", "panel_group_count"), REQUIRED_CELLS)
def test_zero_sum_group_truth_and_stationary_ar1_parameters(
    effect_size_sd,
    panel_group_count,
):
    truth = _case(effect_size_sd, panel_group_count).truth

    assert len(truth.panel_group_effects) == panel_group_count
    assert sum(truth.panel_group_effects) == pytest.approx(0.0, abs=2e-15)
    assert truth.random_effect_generation == "zero_sum_centered_panel_groups"
    assert truth.ar1_rho == LONGITUDINAL_VALIDATION_AR1_RHO
    assert truth.ar1_initialization == "stationary"
    assert truth.ar1_initial_stationary_sd == pytest.approx(
        truth.ar1_innovation_scale
        / math.sqrt(1.0 - LONGITUDINAL_VALIDATION_AR1_RHO**2)
    )
    assert truth.panel_group_scale > 0.0
    assert truth.ar1_innovation_scale > 0.0
    assert truth.known_aggregate_se > 0.0


@pytest.mark.parametrize(("effect_size_sd", "panel_group_count"), REQUIRED_CELLS)
def test_requested_effect_is_realized_by_velocity_breadth_contrast(
    effect_size_sd,
    panel_group_count,
):
    case = _case(effect_size_sd, panel_group_count)
    dataset = case.dataset
    truth = case.truth
    fixed_effects = truth.fixed_effect_by_name()
    evaluation_mask = np.isin(dataset.window_refs, dataset.evaluation_window_refs)
    standardized_velocity = _standardized_from_pre(
        dataset.velocity_exposure,
        dataset.post,
    )
    standardized_breadth = _standardized_from_pre(
        dataset.breadth_exposure,
        dataset.post,
    )
    reconstructed = (
        fixed_effects["beta_velocity"]
        * float(standardized_velocity[evaluation_mask].mean())
        + fixed_effects["beta_breadth"]
        * float(standardized_breadth[evaluation_mask].mean())
    )

    assert truth.pre_period_outcome_sd == pytest.approx(
        float(dataset.observed_outcome[dataset.post == 0].std(ddof=1))
    )
    assert truth.realized_effect_size_sd == pytest.approx(
        effect_size_sd,
        abs=1e-12,
    )
    assert reconstructed == pytest.approx(truth.realized_effect_size_sd, abs=1e-12)
    assert truth.evaluation_movement_outcome_units == pytest.approx(
        truth.realized_effect_size_sd * truth.pre_period_outcome_sd,
        abs=1e-12,
    )


def test_velocity_and_breadth_are_separate_while_depth_is_context_only():
    case = _case(effect_size_sd=0.5, panel_group_count=12)
    dataset = case.dataset
    truth = case.truth
    correlation = float(
        np.corrcoef(dataset.velocity_exposure, dataset.breadth_exposure)[0, 1]
    )

    assert dataset.velocity_exposure is not dataset.breadth_exposure
    assert not np.array_equal(dataset.velocity_exposure, dataset.breadth_exposure)
    assert abs(correlation) < 0.90
    assert truth.depth_context_only is True
    assert all("depth" not in name for name, _value in truth.fixed_effects)
    assert float(dataset.depth_exposure[dataset.post == 0].std(ddof=1)) > 0.0
    assert float(dataset.baseline_fluency_context[dataset.post == 0].std(ddof=1)) > 0.0


@pytest.mark.parametrize(
    "effect_size_sd",
    [-0.1, 0.1, 0.3, 1.0, float("nan"), float("inf"), True, "0.2", None],
)
def test_off_plan_effect_sizes_reject(effect_size_sd):
    with pytest.raises(LongitudinalStructureError, match="effect_size_sd"):
        generate_longitudinal_validation_case(
            effect_size_sd=effect_size_sd,
            panel_group_count=6,
            seed=202607120,
        )


@pytest.mark.parametrize(
    "panel_group_count",
    [0, 5, 8, 13, 6.0, True, "6", None, np.int64(6)],
)
def test_off_plan_panel_group_counts_reject(panel_group_count):
    with pytest.raises(LongitudinalStructureError, match="panel_group_count"):
        generate_longitudinal_validation_case(
            effect_size_sd=0.2,
            panel_group_count=panel_group_count,
            seed=202607120,
        )


@pytest.mark.parametrize(
    "seed",
    [-1, MAX_JAVASCRIPT_SAFE_INTEGER + 1, True, 1.0, "1", np.int64(1)],
)
def test_invalid_or_non_javascript_safe_seeds_reject(seed):
    with pytest.raises(LongitudinalStructureError, match="JavaScript-safe"):
        generate_longitudinal_validation_case(
            effect_size_sd=0.2,
            panel_group_count=6,
            seed=seed,
        )


def test_javascript_safe_seed_boundary_is_accepted():
    case = generate_longitudinal_validation_case(
        effect_size_sd=0.0,
        panel_group_count=6,
        seed=MAX_JAVASCRIPT_SAFE_INTEGER,
    )

    assert case.dataset.seed == MAX_JAVASCRIPT_SAFE_INTEGER
