from dataclasses import replace
import math

import arviz as az
import numpy as np
import pytest

import fluencytracr_inference.vbd_trajectory_nuts as nuts
from fluencytracr_inference.vbd_trajectory_nuts import (
    TrajectoryPpcResult,
    TrajectorySamplerDiagnostics,
    TrajectorySamplerParameterDiagnostic,
    _build_reference_model,
    _compute_posterior_predictive_checks,
    _conditional_state_distribution,
    _expected_parameter_names,
    _sample_stat_count,
    _validate_reference_seeds,
    fit_vbd_trajectory_nuts_reference,
    vbd_nuts_execution_settings,
    vbd_trajectory_ppc_statistics,
)
from fluencytracr_inference.vbd_trajectory_preparation import (
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    _stationary_ar1_covariance,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    generate_vbd_trajectory_smoke_case,
)
from fluencytracr_inference.vbd_trajectory_types import (
    vbd_trajectory_model_manifest_body,
)


@pytest.fixture(scope="module")
def smoke_case():
    return generate_vbd_trajectory_smoke_case()


@pytest.fixture(scope="module")
def prepared(smoke_case):
    return prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")


@pytest.fixture(scope="module")
def smoke_fit(smoke_case, prepared):
    return fit_vbd_trajectory_nuts_reference(
        prepared,
        smoke_case.panel,
        chain_seeds=(2_055_900_001, 2_055_900_002),
        ppc_seed=2_055_900_003,
        mode="smoke",
    )


def test_nuts_settings_compile_exact_full_and_nonqualifying_smoke_modes():
    full = vbd_nuts_execution_settings("full")
    smoke = vbd_nuts_execution_settings("smoke")

    assert full.full_settings is True
    assert full.to_dict() == {
        "mode": "full",
        "chains": 4,
        "draws": 1000,
        "tune": 2000,
        "target_accept": 0.99,
        "max_treedepth": 15,
        "sampler": "pymc",
        "cores": 1,
        "blas_cores": 1,
        "compute_convergence_checks": True,
        "full_settings": True,
    }
    assert smoke.full_settings is False
    with pytest.raises(nuts.TrajectoryNutsError):
        replace(smoke, draws=41)
    with pytest.raises(ValueError):
        vbd_nuts_execution_settings("FULL")


def test_model_manifest_binds_exact_engines_statistics_ppc_and_gates():
    manifest = vbd_trajectory_model_manifest_body()

    assert manifest["deterministic_engine"] == {
        "engine_id": "deterministic_gaussian_state_space_integration",
        "outer_sequence": "unscrambled_sobol_v1",
        "outer_point_count": 8192,
        "proposal": "student_t_df_5_v1",
        "proposal_scale": 1.5,
        "minimum_finite_point_count": 4096,
        "minimum_effective_sample_size": 256.0,
        "maximum_normalized_weight": 0.05,
        "conditional_quadrature": "normal_quadrature_v1",
        "conditional_quadrature_point_count": 16,
        "stable_support_index": "16*original_sobol_ordinal+quadrature_index",
        "random_numbers_used": False,
    }
    assert manifest["reference_engine"]["engine_id"] == (
        "pymc_nuts_state_space_reference"
    )
    assert manifest["reference_engine"]["chains"] == 4
    assert manifest["reference_engine"]["draws"] == 1000
    assert manifest["reference_engine"]["tune"] == 2000
    assert manifest["posterior_statistics"]["weighted_quantile"] == (
        "weighted_quantile_v1"
    )
    assert tuple(manifest["posterior_predictive_check"]["statistics"]) == (
        nuts.VBD_TRAJECTORY_PPC_STATISTIC_NAMES
    )
    assert manifest["diagnostic_gates"] == {
        "r_hat_max": 1.01,
        "bulk_ess_min": 400.0,
        "tail_ess_min": 400.0,
        "post_warmup_divergences_max": 0,
        "max_treedepth_saturation_count_max": 0,
        "energy_bfmi_min": 0.3,
        "max_mcse_to_posterior_sd_ratio": 0.1,
        "ppc_value_range_inclusive": [0.05, 0.95],
    }


@pytest.mark.parametrize(
    ("chain_seeds", "ppc_seed"),
    [
        ([2_055_900_001, 2_055_900_002], 2_055_900_003),
        ((2_055_900_001,), 2_055_900_003),
        ((2_055_900_001, 2_055_900_001), 2_055_900_003),
        ((2_055_900_001, 2_055_900_002), 2_055_900_002),
        ((True, 2_055_900_002), 2_055_900_003),
        ((2_056_020_000, 2_056_020_001), 2_106_000_000),
    ],
)
def test_smoke_seed_validation_rejects_implicit_duplicate_or_off_namespace_seeds(
    chain_seeds, ppc_seed
):
    with pytest.raises(ValueError):
        _validate_reference_seeds(
            vbd_nuts_execution_settings("smoke"), chain_seeds, ppc_seed
        )


def test_full_seed_validation_is_blocked_until_runner_slot_binding_exists():
    with pytest.raises(ValueError, match="runner-owned slot binding"):
        _validate_reference_seeds(
            vbd_nuts_execution_settings("full"),
            (1, 2, 3, 4),
            5,
        )


def test_reference_rejects_generator_seed_reuse_before_sampling(
    monkeypatch, smoke_case, prepared
):
    sampled = False

    def sample(*args, **kwargs):
        nonlocal sampled
        sampled = True
        raise AssertionError("sampler must not run")

    monkeypatch.setattr(nuts.pm, "sample", sample)
    with pytest.raises(ValueError, match="must be distinct"):
        fit_vbd_trajectory_nuts_reference(
            prepared,
            smoke_case.panel,
            chain_seeds=(smoke_case.panel.seed, 2_055_900_002),
            ppc_seed=2_055_900_003,
            mode="smoke",
        )
    assert sampled is False


def test_reference_graph_matches_marginalized_state_space_and_samples_movement(
    prepared,
):
    model = _build_reference_model(prepared)

    assert [variable.name for variable in model.free_RVs] == [
        "alpha",
        "beta",
        "sigma_u",
        "u",
        "sigma_r",
        "rho",
        "trajectory_movement",
    ]
    assert [variable.name for variable in model.observed_RVs] == [
        f"observed_group_{index}" for index in range(prepared.panel_group_count)
    ]
    assert math.isfinite(float(model.compile_logp()(model.initial_point())))


def test_ppc_statistics_match_frozen_five_statistic_oracle():
    values = np.arange(36, dtype=float).reshape(2, 18)
    statistics = vbd_trajectory_ppc_statistics(values)

    assert statistics["pre_post_mean_movement"] == 9.0
    assert statistics["between_panel_group_variance"] == 162.0
    assert statistics["within_panel_group_variance"] == 28.5
    assert statistics["tail_or_extreme_aggregate_statistic"] == 17.5
    assert math.isclose(
        statistics["lag_one_within_group_autocorrelation"], 807.5 / 824.5
    )
    assert vbd_trajectory_ppc_statistics(np.ones((2, 18)))[
        "lag_one_within_group_autocorrelation"
    ] == 0.0


def test_conditional_smoothed_state_matches_direct_gaussian_conditioning(prepared):
    rows = prepared.group_rows[0]
    state_covariance = _stationary_ar1_covariance(18, -0.35, 0.17)
    known_se = np.linspace(0.10, 0.20, 18)
    mean = 0.2 + 0.05 * prepared.time_tau[rows]
    conditional_mean, cholesky = _conditional_state_distribution(
        prepared.y[rows], mean, known_se, state_covariance
    )
    observed_covariance = state_covariance + np.diag(known_se**2)
    expected_mean = state_covariance @ np.linalg.solve(
        observed_covariance, prepared.y[rows] - mean
    )
    expected_covariance = state_covariance - state_covariance @ np.linalg.solve(
        observed_covariance, state_covariance
    )

    assert np.allclose(conditional_mean, expected_mean, atol=1e-12)
    assert np.allclose(cholesky @ cholesky.T, expected_covariance, atol=1e-12)


def _boundary_sampler_diagnostics(panel_group_count=6):
    settings = vbd_nuts_execution_settings("full")
    required_names = _expected_parameter_names(panel_group_count)
    parameters = tuple(
        TrajectorySamplerParameterDiagnostic(
            parameter_name=name,
            r_hat=1.01,
            bulk_ess=400.0,
            tail_ess=400.0,
            posterior_mean_mcse=0.1,
            interval_endpoint_mcse=0.1,
            posterior_sd=1.0,
        )
        for name in required_names
    )
    return TrajectorySamplerDiagnostics(
        settings=settings,
        parameters=parameters,
        required_parameter_names=required_names,
        missing_parameter_variables=(),
        missing_parameter_names=(),
        duplicate_parameter_names=(),
        off_plan_parameter_names=(),
        parameter_order_matches=True,
        trace_shape_matches=True,
        post_warmup_divergences=0,
        max_treedepth_saturation_count=0,
        energy_bfmi_min=0.3,
    )


def test_sampler_diagnostic_boundaries_are_inclusive_and_fail_closed():
    boundary = _boundary_sampler_diagnostics()
    assert boundary.passed is True

    first = boundary.parameters[0]
    mutations = (
        replace(first, r_hat=np.nextafter(1.01, math.inf)),
        replace(first, bulk_ess=np.nextafter(400.0, -math.inf)),
        replace(first, tail_ess=np.nextafter(400.0, -math.inf)),
        replace(first, posterior_mean_mcse=np.nextafter(0.1, math.inf)),
    )
    for mutation in mutations:
        altered = replace(
            boundary, parameters=(mutation, *boundary.parameters[1:])
        )
        assert altered.passed is False
    assert replace(
        boundary, post_warmup_divergences=1
    ).passed is False
    assert replace(
        boundary, max_treedepth_saturation_count=1
    ).passed is False
    assert replace(
        boundary, energy_bfmi_min=np.nextafter(0.3, -math.inf)
    ).passed is False
    assert replace(boundary, trace_shape_matches=False).passed is False
    assert replace(
        boundary, settings=vbd_nuts_execution_settings("smoke")
    ).passed is False
    assert replace(
        boundary, parameters=(), required_parameter_names=()
    ).passed is False


def test_malformed_sample_stats_fail_shape_and_type_validation():
    settings = vbd_nuts_execution_settings("smoke")
    malformed = az.from_dict(
        {
            "sample_stats": {
                "diverging": np.full((2, 40), 2, dtype=int),
                "tree_depth": np.full((2, 40), math.nan),
            }
        }
    ).sample_stats

    assert _sample_stat_count(
        malformed, "diverging", settings, binary=True
    ) == (-1, False)
    assert _sample_stat_count(
        malformed,
        "tree_depth",
        settings,
        binary=False,
        threshold=10,
    ) == (-1, False)


def test_ppc_gate_boundaries_are_inclusive():
    base = dict(
        statistic_name="pre_post_mean_movement",
        observed_value=0.0,
        predictive_mean=0.0,
        predictive_interval_80_lower=-1.0,
        predictive_interval_80_upper=1.0,
    )
    assert TrajectoryPpcResult(**base, p_value=0.05).passed is True
    assert TrajectoryPpcResult(**base, p_value=0.95).passed is True
    assert TrajectoryPpcResult(
        **base, p_value=np.nextafter(0.05, -math.inf)
    ).passed is False
    assert TrajectoryPpcResult(
        **base, p_value=np.nextafter(0.95, math.inf)
    ).passed is False
    with pytest.raises(nuts.TrajectoryNutsError):
        TrajectoryPpcResult(
            **{**base, "statistic_name": "unknown_statistic"}, p_value=0.5
        )
    with pytest.raises(nuts.TrajectoryNutsError):
        TrajectoryPpcResult(
            **{**base, "predictive_mean": math.nan}, p_value=0.5
        )
    with pytest.raises(nuts.TrajectoryNutsError):
        TrajectoryPpcResult(
            **{
                **base,
                "predictive_interval_80_lower": 2.0,
                "predictive_interval_80_upper": 1.0,
            },
            p_value=0.5,
        )


def test_ppc_uses_pcg64dxsm_path_then_observation_draw_order(
    monkeypatch, prepared
):
    settings = vbd_nuts_execution_settings("smoke")
    posterior = {
        "alpha": np.full((2, 40), 0.1),
        "beta": np.full((2, 40), 0.03),
        "sigma_r": np.full((2, 40), 0.2),
        "rho": np.full((2, 40), 0.4),
        "u": np.zeros((2, 40, prepared.panel_group_count)),
    }
    idata = az.from_dict({"posterior": posterior})
    captured = []
    original = nuts.vbd_trajectory_ppc_statistics

    def capture(values):
        captured.append(np.asarray(values).copy())
        return original(values)

    monkeypatch.setattr(nuts, "vbd_trajectory_ppc_statistics", capture)
    factor_calls = 0
    original_factor = nuts._conditional_state_factor

    def count_factor(*args, **kwargs):
        nonlocal factor_calls
        factor_calls += 1
        return original_factor(*args, **kwargs)

    monkeypatch.setattr(nuts, "_conditional_state_factor", count_factor)
    seed = 2_055_900_009
    _compute_posterior_predictive_checks(
        idata, prepared, settings=settings, ppc_seed=seed
    )
    ppc_factor_calls = factor_calls

    rows = prepared.group_rows[0]
    state_covariance = _stationary_ar1_covariance(18, 0.4, 0.2)
    mean = 0.1 + 0.03 * prepared.time_tau[rows]
    conditional_mean, cholesky = _conditional_state_distribution(
        prepared.y[rows], mean, prepared.known_se[rows], state_covariance
    )
    rng = np.random.Generator(np.random.PCG64DXSM(seed))
    path_normal = rng.standard_normal(18)
    observation_normal = rng.standard_normal(18)
    expected_group_zero = (
        mean
        + conditional_mean
        + cholesky @ path_normal
        + prepared.known_se[rows] * observation_normal
    )

    assert len(captured) == 81
    assert np.allclose(captured[1][0], expected_group_zero, rtol=0.0, atol=1e-15)
    assert ppc_factor_calls == 80


def test_smoke_reference_is_summary_only_and_permanently_nonaccepting(smoke_fit):
    assert smoke_fit.settings.full_settings is False
    assert smoke_fit.sampler_diagnostics.passed is False
    assert "smoke_mode_nonacceptance" in (
        smoke_fit.sampler_diagnostics.failing_diagnostics
    )
    assert "parameter_diagnostics" not in (
        smoke_fit.sampler_diagnostics.failing_diagnostics
    )
    assert smoke_fit.chain_seeds == (2_055_900_001, 2_055_900_002)
    assert smoke_fit.ppc_seed == 2_055_900_003
    assert tuple(
        check.statistic_name for check in smoke_fit.posterior_predictive_checks
    ) == nuts.VBD_TRAJECTORY_PPC_STATISTIC_NAMES
    assert not hasattr(smoke_fit, "idata")
    payload = smoke_fit.to_dict()
    assert payload["raw_posterior_draws_emitted"] is False
    assert payload["latent_paths_emitted"] is False
    assert payload["posterior_predictive_replicates_emitted"] is False
    assert "posterior_draws" not in payload
    assert "posterior_predictive_replicates" not in payload
    with pytest.raises(nuts.TrajectoryNutsError, match="five ordered PPCs"):
        replace(smoke_fit, posterior_predictive_checks=())
