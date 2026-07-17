import math

import numpy as np
import pytest

from fluencytracr_inference.vbd_trajectory_statistics import (
    TrajectoryStatisticsError,
    conditional_normal_mixture_quantile_v2,
    normal_quadrature_v1,
    summarize_conditional_normal_mixture_v2,
    summarize_weighted_support,
    weighted_quantile_v1,
)


def test_conditional_normal_mixture_v2_matches_exact_binary64_oracles():
    probabilities = (0.005, 0.10, 0.90, 0.995)
    standard = [
        "-0x1.49b4c64d69160p+1",
        "-0x1.4813c36e26d32p+0",
        "0x1.4813c36e26d33p+0",
        "0x1.49b4c64d69160p+1",
    ]
    for probability, expected in zip(probabilities, standard, strict=True):
        assert conditional_normal_mixture_quantile_v2(
            [1.0], [0.0], [1.0], probability
        ).hex() == expected

    summary = summarize_conditional_normal_mixture_v2(
        "trajectory_movement",
        [0.35, 0.65],
        [-0.4, 0.7],
        [0.6**2, 1.1**2],
    )
    assert summary.posterior_mean.hex() == "0x1.428f5c28f5c28p-2"
    assert summary.posterior_sd.hex() == "0x1.17007814169ffp+0"
    assert [
        summary.interval_99_lower.hex(),
        summary.interval_80_lower.hex(),
        summary.interval_80_upper.hex(),
        summary.interval_99_upper.hex(),
    ] == [
        "-0x1.070d647d89159p+1",
        "-0x1.f4c4b60ce6076p-1",
        "0x1.d2857797c387dp+0",
        "0x1.aec938ed2fe2fp+1",
    ]


@pytest.mark.parametrize(
    ("weights", "means", "standard_deviations", "probability"),
    [
        ([], [], [], 0.10),
        ([0.0], [0.0], [1.0], 0.10),
        ([-0.0], [0.0], [1.0], 0.10),
        ([-1.0], [0.0], [1.0], 0.10),
        ([math.nan], [0.0], [1.0], 0.10),
        ([math.inf], [0.0], [1.0], 0.10),
        ([1.0], [math.nan], [1.0], 0.10),
        ([1.0], [0.0], [0.0], 0.10),
        ([1.0], [0.0], [1.0], 0.50),
        ([1.0], [0.0, 1.0], [1.0], 0.10),
    ],
)
def test_conditional_normal_mixture_v2_fails_closed(
    weights, means, standard_deviations, probability
):
    with pytest.raises(TrajectoryStatisticsError):
        conditional_normal_mixture_quantile_v2(
            weights, means, standard_deviations, probability
        )


def test_weighted_quantile_v1_uses_midpoints_endpoints_and_linear_interpolation():
    values = np.asarray([10.0, 0.0])
    weights = np.asarray([1.0, 1.0])
    indexes = np.asarray([7, 3])

    assert weighted_quantile_v1(values, weights, indexes, 0.0) == 0.0
    assert weighted_quantile_v1(values, weights, indexes, 0.25) == 0.0
    assert weighted_quantile_v1(values, weights, indexes, 0.50) == 5.0
    assert weighted_quantile_v1(values, weights, indexes, 0.75) == 10.0
    assert weighted_quantile_v1(values, weights, indexes, 1.0) == 10.0


def test_weighted_quantile_v1_removes_zero_weight_before_sorting():
    assert weighted_quantile_v1(
        np.asarray([-1_000.0, 0.0, 10.0]),
        np.asarray([0.0, 1.0, 1.0]),
        np.asarray([0, 1, 2]),
        0.5,
    ) == 5.0


def test_weighted_quantile_v1_is_invariant_to_input_permutation_and_weight_scale():
    values = np.asarray([4.0, -1.0, 2.0, 2.0])
    weights = np.asarray([1.0, 2.0, 3.0, 4.0])
    indexes = np.asarray([8, 2, 9, 3])
    permutation = np.asarray([2, 0, 3, 1])

    expected = weighted_quantile_v1(values, weights, indexes, 0.63)
    assert weighted_quantile_v1(
        values[permutation],
        17.0 * weights[permutation],
        indexes[permutation],
        0.63,
    ) == expected


@pytest.mark.parametrize(
    ("values", "weights", "indexes", "probability"),
    [
        ([0.0, math.nan], [1.0, 1.0], [0, 1], 0.5),
        ([0.0, 1.0], [1.0, math.inf], [0, 1], 0.5),
        ([0.0, 1.0], [1.0, -1.0], [0, 1], 0.5),
        ([0.0, 1.0], [0.0, 0.0], [0, 1], 0.5),
        ([0.0, 1.0], [1.0, 1.0], [0, 0], 0.5),
        ([0.0, 1.0], [1.0, 1.0], [0.0, 1.0], 0.5),
        ([0.0, 1.0], [1.0, 1.0], [-1, 0], 0.5),
        (
            [0.0, 0.0],
            [1.0, 2.0],
            np.asarray([0, 1], dtype=np.uint64),
            0.5,
        ),
        (
            [0.0, 0.0],
            [1.0, 2.0],
            np.asarray([0, 2**63], dtype=np.uint64),
            0.5,
        ),
        ([0.0], [1.0, 1.0], [0], 0.5),
        ([[0.0]], [[1.0]], [[0]], 0.5),
        ([0.0], [1.0], [0], -0.1),
        ([0.0], [1.0], [0], 1.1),
        ([0.0], [1.0], [0], True),
    ],
)
def test_weighted_quantile_v1_rejects_malformed_support(
    values, weights, indexes, probability
):
    with pytest.raises(TrajectoryStatisticsError):
        weighted_quantile_v1(values, weights, indexes, probability)


def test_normal_quadrature_v1_is_exact_frozen_standard_normal_support():
    support, weights, indexes = normal_quadrature_v1()

    assert support.shape == weights.shape == indexes.shape == (16,)
    assert np.array_equal(indexes, np.arange(16))
    assert math.isclose(float(weights.sum()), 1.0, rel_tol=0.0, abs_tol=1e-15)
    assert math.isclose(float(np.sum(weights * support)), 0.0, abs_tol=1e-15)
    assert math.isclose(float(np.sum(weights * support**2)), 1.0, abs_tol=1e-14)
    assert not support.flags.writeable
    assert not weights.flags.writeable
    assert not indexes.flags.writeable


def test_summary_uses_weighted_quantile_v1_for_both_intervals():
    summary = summarize_weighted_support(
        "trajectory_movement",
        np.asarray([-2.0, 0.0, 2.0]),
        np.asarray([0.25, 0.5, 0.25]),
        np.asarray([2, 1, 0]),
    )

    assert summary.posterior_mean == 0.0
    assert math.isclose(summary.posterior_sd, math.sqrt(2.0))
    assert summary.interval_99_lower <= summary.interval_80_lower
    assert summary.interval_80_upper <= summary.interval_99_upper
    assert set(summary.to_dict()) == {
        "quantity_name",
        "posterior_mean",
        "posterior_sd",
        "credible_interval_80",
        "credible_interval_99",
    }
