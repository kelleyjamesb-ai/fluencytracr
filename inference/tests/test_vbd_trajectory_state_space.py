from dataclasses import replace
import math

import numpy as np
import pytest
from scipy.linalg import block_diag

import fluencytracr_inference.vbd_trajectory_state_space as state_space
from fluencytracr_inference.vbd_trajectory_preparation import (
    VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD,
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    VBD_TRAJECTORY_OUTER_POINT_COUNT,
    TrajectoryIntegrationError,
    TrajectoryIntegrationDiagnostics,
    _conditional_gaussian,
    _stationary_ar1_covariance,
    fit_vbd_trajectory_state_space,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    generate_vbd_trajectory_smoke_case,
)
from fluencytracr_inference.vbd_trajectory_types import VBD_TRAJECTORY_LANES


@pytest.fixture(scope="module")
def smoke_case():
    return generate_vbd_trajectory_smoke_case()


@pytest.fixture(scope="module")
def prepared_by_lane(smoke_case):
    return {
        lane: prepare_vbd_trajectory_lane(smoke_case.panel, lane)
        for lane in VBD_TRAJECTORY_LANES
    }


@pytest.fixture(scope="module")
def fit_by_lane(smoke_case, prepared_by_lane):
    return {
        lane: fit_vbd_trajectory_state_space(prepared, smoke_case.panel)
        for lane, prepared in prepared_by_lane.items()
    }


def test_conditional_movement_matches_direct_joint_gaussian(prepared_by_lane):
    original = prepared_by_lane["frequency"]
    prepared = replace(
        original,
        known_se=np.tile(
            np.linspace(0.08, 0.24, 18), original.panel_group_count
        ),
    )
    group_scale = 0.23
    innovation_scale = 0.17
    rho = -0.35
    result = _conditional_gaussian(
        prepared,
        group_scale,
        innovation_scale,
        rho,
    )
    design = prepared.augmented_design
    prior_variance = np.concatenate(
        [
            np.full(2, VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD**2),
            np.full(
                prepared.panel_group_count - 1,
                group_scale**2,
            ),
        ]
    )
    prior_covariance = np.diag(prior_variance)
    state_blocks = [
        _stationary_ar1_covariance(
            len(rows),
            rho,
            innovation_scale,
        )
        for rows in prepared.group_rows
    ]
    state_covariance = block_diag(*state_blocks)
    latent_covariance = design @ prior_covariance @ design.T + state_covariance
    observed_covariance = latent_covariance + np.diag(prepared.known_se**2)
    contrast = prepared.latent_level_contrast
    covariance_q_y = contrast @ latent_covariance
    expected_mean = float(
        covariance_q_y @ np.linalg.solve(observed_covariance, prepared.y)
    )
    expected_variance = float(
        contrast @ latent_covariance @ contrast
        - covariance_q_y
        @ np.linalg.solve(observed_covariance, covariance_q_y)
    )
    observed_cholesky = np.linalg.cholesky(observed_covariance)
    logdet = 2.0 * float(np.log(np.diag(observed_cholesky)).sum())
    expected_log_marginal = -0.5 * (
        len(prepared.y) * math.log(2.0 * math.pi)
        + logdet
        + prepared.y @ np.linalg.solve(observed_covariance, prepared.y)
    )

    assert math.isclose(result.movement_mean, expected_mean, abs_tol=1e-11)
    assert math.isclose(result.movement_variance, expected_variance, abs_tol=1e-11)
    assert math.isclose(result.log_marginal, expected_log_marginal, abs_tol=1e-9)


def test_zero_contrast_post_windows_still_condition_smoothed_movement(
    prepared_by_lane,
):
    prepared = prepared_by_lane["frequency"]
    baseline = _conditional_gaussian(prepared, 0.23, 0.17, 0.4)
    changed_y = prepared.y.copy()
    changed_y[np.isin(prepared.time_index, (12, 13, 14))] += 1.0
    changed = _conditional_gaussian(
        replace(prepared, y=changed_y), 0.23, 0.17, 0.4
    )
    reflected = _conditional_gaussian(
        replace(
            prepared,
            latent_level_contrast=-prepared.latent_level_contrast,
        ),
        0.23,
        0.17,
        0.4,
    )

    assert changed.movement_mean != baseline.movement_mean
    assert math.isclose(reflected.movement_mean, -baseline.movement_mean)
    assert math.isclose(reflected.movement_variance, baseline.movement_variance)


def test_conditional_gaussian_failure_is_not_silently_dropped(
    monkeypatch, prepared_by_lane
):
    def fail(*args, **kwargs):
        raise TrajectoryIntegrationError("invalid conditional movement variance")

    monkeypatch.setattr(state_space, "_conditional_gaussian", fail)
    with pytest.raises(TrajectoryIntegrationError):
        state_space._evaluate_target(
            prepared_by_lane["frequency"], np.zeros(3, dtype=float)
        )


def test_deterministic_diagnostics_cannot_self_declare_pass():
    with pytest.raises(TrajectoryIntegrationError):
        TrajectoryIntegrationDiagnostics(
            point_count=0,
            finite_point_count=0,
            effective_sample_size=math.nan,
            max_normalized_weight=math.nan,
            mode_transformed=(math.nan, 0.0, 0.0),
            negative_log_posterior_at_mode=math.nan,
            hessian_condition_number=math.nan,
            minimum_conditional_movement_variance=math.nan,
            maximum_conditional_movement_variance=math.nan,
            movement_component_count=0,
        )


def test_indefinite_mode_hessian_fails_instead_of_being_repaired(
    monkeypatch, smoke_case, prepared_by_lane
):
    monkeypatch.setattr(
        state_space,
        "_finite_difference_hessian",
        lambda function, point: np.diag([1.0, 1.0, -1e-8]),
    )
    with pytest.raises(TrajectoryIntegrationError, match="positive definite"):
        fit_vbd_trajectory_state_space(
            prepared_by_lane["frequency"], smoke_case.panel
        )


@pytest.mark.parametrize("lane", VBD_TRAJECTORY_LANES)
def test_primary_engine_fits_each_lane_with_exact_full_support(
    lane, smoke_case, fit_by_lane
):
    fit = fit_by_lane[lane]
    diagnostics = fit.integration_diagnostics.to_dict()
    truth_by_lane = dict(
        zip(VBD_TRAJECTORY_LANES, smoke_case.truth.direction_adjusted_truth)
    )

    assert fit.lane == lane
    assert fit.engine_kind == "deterministic_gaussian_state_space_integration"
    assert diagnostics["status"] == "PASS"
    assert diagnostics["point_count"] == VBD_TRAJECTORY_OUTER_POINT_COUNT
    assert 4096 <= diagnostics["finite_point_count"] <= (
        VBD_TRAJECTORY_OUTER_POINT_COUNT
    )
    assert diagnostics["conditional_movement_mixture"] == {
        "algorithm": "conditional_normal_mixture_quantile_v2",
        "component_count": diagnostics["finite_point_count"],
        "bisection_iterations": 64,
        "normal_cdf": "scipy.special.ndtr",
        "normal_quantile": "scipy.special.ndtri",
    }
    assert diagnostics["minimum_conditional_movement_variance"] > 0.0
    assert (
        fit.movement_summary.interval_80_lower
        <= truth_by_lane[lane]
        <= fit.movement_summary.interval_80_upper
    )


def test_primary_engine_is_deterministic_and_summary_only(
    smoke_case, prepared_by_lane, fit_by_lane
):
    first = fit_by_lane["frequency"]
    second = fit_vbd_trajectory_state_space(
        prepared_by_lane["frequency"], smoke_case.panel
    )

    assert first.to_dict() == second.to_dict()
    assert first.fit_summary_hash() == second.fit_summary_hash()
    payload = first.to_dict()
    assert payload["latent_paths_emitted"] is False
    assert payload["posterior_support_emitted"] is False
    assert "posterior_draws" not in payload
    assert "latent_path_values" not in payload
    assert "support_values" not in payload
    assert set(payload) == {
        "lane",
        "prepared_input_hash",
        "model_input_hash",
        "engine_kind",
        "movement_summary",
        "integration_diagnostics",
        "latent_paths_emitted",
        "posterior_support_emitted",
        "fit_summary_hash",
    }


def test_primary_engine_reconciles_prepared_input_to_exact_source_panel(
    smoke_case, prepared_by_lane
):
    prepared = prepared_by_lane["frequency"]
    forged = replace(prepared, y=prepared.y + 0.01)

    with pytest.raises(ValueError):
        fit_vbd_trajectory_state_space(forged, smoke_case.panel)


def test_primary_engine_rejects_source_panel_alias(prepared_by_lane):
    other = generate_vbd_trajectory_smoke_case(seed=2_055_900_001)

    with pytest.raises(ValueError):
        fit_vbd_trajectory_state_space(prepared_by_lane["frequency"], other.panel)
