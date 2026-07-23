"""Sampler-free exact-math checks for the collapsed group-effect diagnostic."""

from __future__ import annotations

from dataclasses import replace
import math

import numpy as np
import pytest
import pytensor
import pytensor.tensor as pt
from scipy.linalg import block_diag
from scipy.optimize import brentq
from scipy.special import ndtr

import fluencytracr_inference.vbd_trajectory_state_space as state_space
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization as marginalization
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization import (
    VbdTrajectoryGroupEffectMarginalizationError,
    VbdReconstructedQuantityProjection,
    VbdSampledParameterProjection,
    chain_diagnostics_for_vbd_conditional_normal_mixture,
    conditional_vbd_group_effect_reconstruction,
    _project_vbd_reconstructed_quantity,
    project_vbd_sampled_parameter,
    summarize_vbd_conditional_normal_mixture,
    validate_vbd_group_effect_marginalization_prepared_target,
    vbd_group_effect_marginalized_log_density,
    vbd_group_effect_marginalized_symbolic_log_density,
)
from fluencytracr_inference.hashing import sha256_json
from vbd_trajectory_group_effect_marginalization_fixtures import (
    canonical_prepared_input,
)


def _prepared(panel_group_count: int):
    return canonical_prepared_input(panel_group_count)


def _coordinated_rehash(prepared):
    model_hash = sha256_json(prepared.to_hash_body())
    return replace(
        prepared,
        model_input_hash=model_hash,
        prepared_input_hash=sha256_json(
            {
                "model_input_hash": model_hash,
                "context_binding_hash": prepared.context_binding_hash,
            }
        ),
    )


def _coordinated_context_rehash(prepared):
    context_hash = sha256_json(
        {
            "ordered_panel_manifest_root": prepared.ordered_panel_manifest_root,
            "lane_observation_root": prepared.lane_observation_root,
            "joint_uncertainty_roots_hash": prepared.joint_uncertainty_roots_hash,
            "cohort_partition_root": prepared.cohort_partition_root,
            "study_plan_root": prepared.study_plan_root,
            "seed_manifest_root": prepared.seed_manifest_root,
            "transform_root": prepared.transform_root,
            "cross_lane_covariance_bound_not_used_as_zero": True,
            "depth_context_excluded": True,
        }
    )
    return replace(
        prepared,
        context_binding_hash=context_hash,
        prepared_input_hash=sha256_json(
            {
                "model_input_hash": prepared.model_input_hash,
                "context_binding_hash": context_hash,
            }
        ),
    )


def _dense_parts(prepared, *, alpha, beta, sigma_u, sigma_r, rho):
    group_count = prepared.panel_group_count
    projection = np.eye(group_count) - np.ones((group_count, group_count)) / group_count
    incidence = np.eye(group_count)[prepared.group_index]
    state_blocks = []
    for rows in prepared.group_rows:
        lags = np.abs(np.subtract.outer(np.arange(len(rows)), np.arange(len(rows))))
        state_blocks.append(sigma_r**2 / (1.0 - rho**2) * rho**lags)
    state_covariance = block_diag(*state_blocks)
    group_covariance = sigma_u**2 * incidence @ projection @ incidence.T
    known_covariance = np.diag(prepared.known_se**2)
    fixed_mean = alpha + beta * prepared.time_tau
    return projection, incidence, state_covariance, group_covariance, known_covariance, fixed_mean


@pytest.mark.parametrize("panel_group_count", (6, 12))
def test_low_rank_log_density_and_automatic_gradient_equal_independent_dense_normal(
    monkeypatch, panel_group_count,
):
    prepared = _prepared(panel_group_count)
    monkeypatch.setattr(
        state_space,
        "fit_vbd_trajectory_state_space",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            AssertionError("collapsed target called the primary evaluator")
        ),
    )
    point = np.asarray((0.12, -0.07, 0.31, 0.22, 0.37), dtype=np.float64)
    alpha, beta, sigma_u, sigma_r, rho = point
    *_, known_covariance, fixed_mean = _dense_parts(
        prepared,
        alpha=alpha,
        beta=beta,
        sigma_u=sigma_u,
        sigma_r=sigma_r,
        rho=rho,
    )
    projection, incidence, state_covariance, group_covariance, _, _ = _dense_parts(
        prepared,
        alpha=alpha,
        beta=beta,
        sigma_u=sigma_u,
        sigma_r=sigma_r,
        rho=rho,
    )
    dense_covariance = state_covariance + group_covariance + known_covariance
    residual = prepared.y - fixed_mean
    dense_cholesky = np.linalg.cholesky(dense_covariance)
    dense_logdet = 2.0 * float(np.log(np.diag(dense_cholesky)).sum())
    expected = -0.5 * (
        len(residual) * math.log(2.0 * math.pi)
        + dense_logdet
        + residual @ np.linalg.solve(dense_covariance, residual)
    )
    actual = vbd_group_effect_marginalized_log_density(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
        alpha=float(alpha),
        beta=float(beta),
        sigma_u=float(sigma_u),
        sigma_r=float(sigma_r),
        rho=float(rho),
    )
    np.testing.assert_allclose(actual, expected, rtol=0.0, atol=2e-11)

    theta = pt.vector("theta", dtype="float64")
    candidate = vbd_group_effect_marginalized_symbolic_log_density(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
        alpha=theta[0],
        beta=theta[1],
        sigma_u=theta[2],
        sigma_r=theta[3],
        rho=theta[4],
    )
    # Independent dense construction: no production low-rank helper is reused.
    c = panel_group_count
    z = np.eye(c)[prepared.group_index]
    p = np.eye(c) - np.ones((c, c)) / c
    blocks = []
    for rows in prepared.group_rows:
        lag = np.abs(np.subtract.outer(np.arange(len(rows)), np.arange(len(rows))))
        blocks.append(theta[3] ** 2 / (1.0 - theta[4] ** 2) * pt.power(theta[4], lag))
    k = pt.linalg.block_diag(*blocks)
    v = k + theta[2] ** 2 * (z @ p @ z.T) + np.diag(prepared.known_se**2)
    e = prepared.y - theta[0] - theta[1] * prepared.time_tau
    chol = pt.linalg.cholesky(v)
    solved = pt.linalg.solve_triangular(chol, e, lower=True)
    dense = -0.5 * (
        len(prepared.y) * math.log(2.0 * math.pi)
        + 2.0 * pt.sum(pt.log(pt.diag(chol)))
        + pt.dot(solved, solved)
    )
    compare = pytensor.function(
        [theta],
        [candidate, dense, pt.grad(candidate, theta), pt.grad(dense, theta)],
        mode="FAST_COMPILE",
    )
    candidate_value, dense_value, candidate_gradient, dense_gradient = compare(point)
    np.testing.assert_allclose(candidate_value, dense_value, rtol=0.0, atol=2e-10)
    np.testing.assert_allclose(candidate_gradient, dense_gradient, rtol=0.0, atol=2e-9)
    np.testing.assert_allclose(
        prepared.zero_sum_basis @ prepared.zero_sum_basis.T,
        projection,
        rtol=0.0,
        atol=1e-13,
    )
    assert incidence.shape == (len(prepared.y), panel_group_count)


@pytest.mark.parametrize("panel_group_count", (6, 12))
def test_joint_conditional_reconstruction_matches_direct_gaussian_conditioning(
    panel_group_count,
):
    prepared = _prepared(panel_group_count)
    values = dict(alpha=0.08, beta=0.03, sigma_u=0.27, sigma_r=0.19, rho=-0.21)
    actual = conditional_vbd_group_effect_reconstruction(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
        **values,
    )
    projection, incidence, state_covariance, group_covariance, known_covariance, fixed_mean = _dense_parts(
        prepared, **values
    )
    v = state_covariance + group_covariance + known_covariance
    g = state_covariance + group_covariance
    residual = prepared.y - fixed_mean
    u_y_covariance = values["sigma_u"] ** 2 * projection @ incidence.T
    movement_y_covariance = prepared.latent_level_contrast @ g
    latent_y_covariance = np.vstack((u_y_covariance, movement_y_covariance))
    prior_joint = np.zeros((panel_group_count + 1, panel_group_count + 1))
    prior_joint[:panel_group_count, :panel_group_count] = values["sigma_u"] ** 2 * projection
    u_movement = values["sigma_u"] ** 2 * projection @ incidence.T @ prepared.latent_level_contrast
    prior_joint[:panel_group_count, -1] = u_movement
    prior_joint[-1, :panel_group_count] = u_movement
    prior_joint[-1, -1] = prepared.latent_level_contrast @ g @ prepared.latent_level_contrast
    prior_mean = np.concatenate(
        (np.zeros(panel_group_count), [prepared.latent_level_contrast @ fixed_mean])
    )
    expected_mean = prior_mean + latent_y_covariance @ np.linalg.solve(v, residual)
    expected_covariance = prior_joint - latent_y_covariance @ np.linalg.solve(
        v, latent_y_covariance.T
    )
    np.testing.assert_allclose(actual.joint_mean, expected_mean, rtol=0.0, atol=2e-11)
    np.testing.assert_allclose(
        actual.joint_covariance, expected_covariance, rtol=0.0, atol=3e-11
    )
    assert abs(float(np.sum(actual.u_mean))) <= 1e-13
    assert np.max(np.abs(actual.u_covariance.sum(axis=0))) <= 1e-12


def test_exact_mixture_moments_endpoints_and_five_chain_major_influence_channels():
    means = np.asarray(((-0.7, -0.2, 0.1), (0.3, 0.8, 1.2)), dtype=np.float64)
    variances = np.asarray(((0.15, 0.2, 0.12), (0.18, 0.11, 0.25)), dtype=np.float64)
    result = summarize_vbd_conditional_normal_mixture(
        "u[0]", means, variances
    )
    flat_means = means.reshape(-1)
    flat_sds = np.sqrt(variances.reshape(-1))
    expected_mean = float(np.mean(flat_means))
    expected_variance = float(np.mean(variances.reshape(-1) + flat_means**2) - expected_mean**2)
    assert result.summary.posterior_mean == pytest.approx(expected_mean)
    assert result.summary.posterior_sd == pytest.approx(math.sqrt(expected_variance))
    endpoints = {
        "interval_80_lower_endpoint_influence": (0.10, result.summary.interval_80_lower),
        "interval_80_upper_endpoint_influence": (0.90, result.summary.interval_80_upper),
        "interval_99_lower_endpoint_influence": (0.005, result.summary.interval_99_lower),
        "interval_99_upper_endpoint_influence": (0.995, result.summary.interval_99_upper),
    }
    assert tuple(result.channels) == (
        "conditional_mean",
        "interval_80_lower_endpoint_influence",
        "interval_80_upper_endpoint_influence",
        "interval_99_lower_endpoint_influence",
        "interval_99_upper_endpoint_influence",
    )
    np.testing.assert_array_equal(result.channels["conditional_mean"], means)
    for channel_name, (probability, endpoint) in endpoints.items():
        oracle = brentq(
            lambda value: float(np.mean(ndtr((value - flat_means) / flat_sds))) - probability,
            float(np.min(flat_means - 10 * flat_sds)),
            float(np.max(flat_means + 10 * flat_sds)),
        )
        assert endpoint == pytest.approx(oracle, abs=2e-12)
        component_cdf = ndtr((endpoint - flat_means) / flat_sds)
        component_density = np.exp(-0.5 * ((endpoint - flat_means) / flat_sds) ** 2) / (
            math.sqrt(2.0 * math.pi) * flat_sds
        )
        expected_influence = (probability - component_cdf) / np.mean(component_density)
        np.testing.assert_allclose(
            result.channels[channel_name],
            expected_influence.reshape(means.shape),
            rtol=0.0,
            atol=2e-12,
        )


def test_five_channel_diagnostics_preserve_chain_grid_and_scale_mcse_by_mixture_sd(
    monkeypatch,
):
    means = np.arange(24, dtype=np.float64).reshape(4, 6) / 20.0
    variances = np.full((4, 6), 0.2, dtype=np.float64)
    mixture = summarize_vbd_conditional_normal_mixture(
        "trajectory_movement", means, variances
    )
    observed_shapes = []

    def _scalar(value):
        observed_shapes.append(np.asarray(value).shape)
        return np.asarray(1.0)

    monkeypatch.setattr(marginalization.az, "rhat", _scalar)
    monkeypatch.setattr(
        marginalization.az,
        "ess",
        lambda value, *, method, prob=None: (
            observed_shapes.append(np.asarray(value).shape) or np.asarray(500.0)
        ),
    )
    monkeypatch.setattr(
        marginalization.az,
        "mcse",
        lambda value, *, method: (
            observed_shapes.append(np.asarray(value).shape) or np.asarray(0.02)
        ),
    )

    rows = chain_diagnostics_for_vbd_conditional_normal_mixture(mixture)

    assert [row["channel_name"] for row in rows] == list(mixture.channels)
    assert len(rows) == 5
    assert observed_shapes == [(4, 6)] * 20
    assert all(row["r_hat"] == 1.0 for row in rows)
    assert all(row["bulk_ess"] == 500.0 for row in rows)
    assert all(row["tail_ess"] == 500.0 for row in rows)
    assert all(
        row["mean_mcse_to_posterior_sd_ratio"]
        == pytest.approx(0.02 / mixture.summary.posterior_sd)
        for row in rows
    )


def test_malformed_or_target_changing_inputs_reject():
    prepared = _prepared(6)
    expected_hash = prepared.model_input_hash
    changed_basis = prepared.zero_sum_basis.copy()
    changed_basis[0, 0] += 0.1
    prepared = replace(prepared, zero_sum_basis=changed_basis)
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        vbd_group_effect_marginalized_log_density(
            prepared,
            expected_model_input_hash=expected_hash,
            expected_prepared_input_hash=prepared.prepared_input_hash,
            alpha=0.0,
            beta=0.0,
            sigma_u=0.2,
            sigma_r=0.2,
            rho=0.2,
        )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        summarize_vbd_conditional_normal_mixture(
            "u[0]", np.zeros((2, 3)), np.zeros((2, 3))
        )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        summarize_vbd_conditional_normal_mixture(
            "u[0]", np.zeros(6), np.ones(6)
        )


@pytest.mark.parametrize(
    "mutation",
    (
        lambda p: replace(p, time_tau=np.roll(p.time_tau, 1)),
        lambda p: replace(p, time_index=np.roll(p.time_index, 1)),
        lambda p: replace(p, x=np.column_stack((np.ones(len(p.y)), p.time_tau + 0.1))),
        lambda p: replace(p, known_se=p.known_se * 1.01),
        lambda p: replace(p, latent_level_contrast=np.roll(p.latent_level_contrast, 1)),
        lambda p: replace(p, group_index=np.roll(p.group_index, 18)),
        lambda p: replace(p, group_rows=tuple(reversed(p.group_rows))),
        lambda p: replace(
            p,
            zero_sum_basis=np.column_stack(
                (-p.zero_sum_basis[:, 0], p.zero_sum_basis[:, 1:])
            ),
        ),
        lambda p: replace(p, zero_sum_basis=p.zero_sum_basis[:, ::-1]),
        lambda p: replace(p, augmented_design=np.roll(p.augmented_design, 1, axis=1)),
        lambda p: replace(p, fixed_effect_names=("beta", "alpha")),
        lambda p: replace(p, y=np.full_like(p.y, np.nan)),
    ),
)
def test_prepared_target_rejects_target_changes_even_after_coordinated_rehash(
    mutation,
):
    prepared = _prepared(6)
    mutated = _coordinated_rehash(mutation(prepared))
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        validate_vbd_group_effect_marginalization_prepared_target(
            mutated,
            expected_model_input_hash=prepared.model_input_hash,
            expected_prepared_input_hash=prepared.prepared_input_hash,
        )


@pytest.mark.parametrize("field", ("time_index", "post"))
def test_prepared_target_rejects_float64_substitution_for_integer_arrays(field):
    prepared = _prepared(6)
    mutated = replace(prepared, **{field: getattr(prepared, field).astype(np.float64)})
    mutated = _coordinated_rehash(mutated)
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        validate_vbd_group_effect_marginalization_prepared_target(
            mutated,
            expected_model_input_hash=prepared.model_input_hash,
            expected_prepared_input_hash=prepared.prepared_input_hash,
        )


@pytest.mark.parametrize("mutation", ("context_hash", "ordered_panel_root"))
def test_prepared_target_rejects_forged_context_provenance_after_self_rehash(
    mutation,
):
    prepared = _prepared(6)
    if mutation == "context_hash":
        forged = replace(prepared, context_binding_hash="f" * 64)
        forged = replace(
            forged,
            prepared_input_hash=sha256_json(
                {
                    "model_input_hash": forged.model_input_hash,
                    "context_binding_hash": forged.context_binding_hash,
                }
            ),
        )
    else:
        forged = _coordinated_context_rehash(
            replace(prepared, ordered_panel_manifest_root="e" * 64)
        )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        validate_vbd_group_effect_marginalization_prepared_target(
            forged,
            expected_model_input_hash=prepared.model_input_hash,
            expected_prepared_input_hash=prepared.prepared_input_hash,
        )


def test_projection_binds_exact_full_chain_component_grid_before_discarding():
    base = np.linspace(-1.0, 1.0, 4 * 20_000, dtype=np.float64).reshape(
        4, 20_000
    )
    means = np.ascontiguousarray(0.2 + 0.3 * base)
    variances = np.ascontiguousarray(0.4 + 0.02 * base**2)

    projection = _project_vbd_reconstructed_quantity(
        "trajectory_movement", means, variances
    )

    assert type(projection) is VbdReconstructedQuantityProjection
    assert projection.component_grid_shape == (4, 20_000)
    assert projection.component_count == 80_000
    assert len(projection.channel_diagnostic_rows) == 5
    assert not hasattr(projection, "component_means")
    assert not hasattr(projection, "component_variances")
    assert projection.conditional_components_emitted is False
    assert projection.pseudo_draws_emitted is False
    assert projection.conditional_mean_substitution is False
    changed = means.copy()
    changed[3, 19_999] = np.nextafter(changed[3, 19_999], math.inf)
    changed_projection = _project_vbd_reconstructed_quantity(
        "trajectory_movement", changed, variances
    )
    assert changed_projection.component_means_commitment != (
        projection.component_means_commitment
    )
    assert changed_projection.component_grid_commitment != (
        projection.component_grid_commitment
    )


@pytest.mark.parametrize(
    "shape",
    ((4, 19_999), (20_000, 4), (1, 80_000), (5, 20_000)),
)
def test_projection_rejects_noncanonical_component_cardinality(shape):
    means = np.zeros(shape, dtype=np.float64)
    variances = np.ones(shape, dtype=np.float64)
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        _project_vbd_reconstructed_quantity("u[0]", means, variances)


def test_projection_type_cannot_be_constructed_from_conditional_means():
    with pytest.raises(TypeError):
        VbdReconstructedQuantityProjection()


def test_sampled_projection_derives_summary_diagnostics_and_grid_commitment():
    base = np.linspace(-0.5, 0.5, 4 * 20_000, dtype=np.float64).reshape(
        4, 20_000
    )
    values = np.ascontiguousarray(0.2 + base)
    projection = project_vbd_sampled_parameter("alpha", values)
    assert type(projection) is VbdSampledParameterProjection
    assert projection.summary.quantity_name == "alpha"
    assert projection.posterior_grid_shape == (4, 20_000)
    assert projection.posterior_value_count == 80_000
    assert projection.diagnostic_row["parameter_name"] == "alpha"
    assert set(projection.diagnostic_row) == {
        "parameter_name",
        "r_hat",
        "bulk_ess",
        "tail_ess",
        "posterior_mean_mcse_to_posterior_sd_ratio",
        "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio",
        "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio",
        "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio",
        "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio",
    }
    assert not hasattr(projection, "posterior_values")
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        project_vbd_sampled_parameter("u", values)
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationError):
        project_vbd_sampled_parameter("alpha", values[:, :-1])
