from dataclasses import replace

import numpy as np
import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.longitudinal_concordance import (
    evaluate_longitudinal_concordance,
    required_longitudinal_concordance_slots,
    run_longitudinal_concordance_slot,
)
from fluencytracr_inference.longitudinal_nuts import (
    LONGITUDINAL_NUTS_FULL_CHAINS,
    LONGITUDINAL_NUTS_FULL_DRAWS,
    LONGITUDINAL_NUTS_FULL_MAX_TREEDEPTH,
    LONGITUDINAL_NUTS_FULL_TARGET_ACCEPT,
    LONGITUDINAL_NUTS_FULL_TUNE,
    LONGITUDINAL_PPC_STATISTIC_NAMES,
    fit_longitudinal_nuts_reference,
    nuts_execution_settings,
)
from fluencytracr_inference.longitudinal_state_space import (
    STATE_SPACE_CUBATURE_POINT_COUNT,
    STATE_SPACE_MODEL_KIND,
    StateSpaceInputError,
    fit_deterministic_state_space,
    prepare_longitudinal_state_space,
)
from fluencytracr_inference.longitudinal_validation_synthetic import (
    generate_longitudinal_validation_case,
)


@pytest.fixture(scope="module")
def validation_case():
    return generate_longitudinal_validation_case(
        effect_size_sd=0.2,
        panel_group_count=6,
        seed=202607120,
    )


@pytest.fixture(scope="module")
def prepared(validation_case):
    return prepare_longitudinal_state_space(validation_case.dataset)


@pytest.fixture(scope="module")
def primary_fit(prepared):
    return fit_deterministic_state_space(prepared, seed=202607120)


@pytest.fixture(scope="module")
def nuts_smoke_fit(prepared):
    return fit_longitudinal_nuts_reference(
        prepared,
        seed=202607120,
        mode="smoke",
    )


def test_prepared_input_is_pre_period_standardized_and_shared(prepared):
    pre = prepared.dataset.post == 0

    assert prepared.x.shape == (108, 7)
    assert prepared.panel_group_count == 6
    assert prepared.fixed_effect_names == (
        "intercept",
        "historical_time_trend",
        "beta_velocity",
        "beta_breadth",
        "beta_fluency_context",
        "control_seasonality_index",
        "control_customer_demand_index",
    )
    assert prepared.prepared_input_hash
    assert prepared.model_input_hash
    assert prepared.context_binding_hash
    assert prepared.prepared_input_hash == sha256_json(
        {
            "model_input_hash": prepared.model_input_hash,
            "context_binding_hash": prepared.context_binding_hash,
        }
    )
    assert prepared.model_input_hash != prepared.context_binding_hash
    np.testing.assert_allclose(prepared.y[pre].mean(), 0.0, atol=1e-14)
    np.testing.assert_allclose(prepared.y[pre].std(ddof=1), 1.0, atol=1e-14)
    for index in range(1, prepared.x.shape[1]):
        np.testing.assert_allclose(prepared.x[pre, index].mean(), 0.0, atol=1e-14)
        np.testing.assert_allclose(prepared.x[pre, index].std(ddof=1), 1.0, atol=1e-14)


def test_known_aggregate_se_enters_exactly_without_extra_observation_scale(
    validation_case,
    prepared,
):
    expected = (
        validation_case.dataset.known_aggregate_se
        / validation_case.dataset.observed_outcome[validation_case.dataset.post == 0].std(
            ddof=1
        )
    )

    np.testing.assert_allclose(prepared.known_se, expected, rtol=0.0, atol=0.0)
    assert "observation_scale" not in prepared.fixed_effect_names


def test_zero_sum_basis_matches_projection_covariance(prepared):
    basis = prepared.zero_sum_basis
    group_count = prepared.panel_group_count
    expected_projection = np.eye(group_count) - np.ones((group_count, group_count)) / group_count

    assert basis.shape == (group_count, group_count - 1)
    np.testing.assert_allclose(basis.sum(axis=0), 0.0, atol=1e-14)
    np.testing.assert_allclose(basis.T @ basis, np.eye(group_count - 1), atol=1e-14)
    np.testing.assert_allclose(basis @ basis.T, expected_projection, atol=1e-14)


def test_post_values_do_not_change_pre_period_standardization(validation_case):
    dataset = validation_case.dataset
    altered_velocity = dataset.velocity_exposure.copy()
    altered_velocity[dataset.post == 1] += 100.0
    altered = prepare_longitudinal_state_space(
        replace(dataset, velocity_exposure=altered_velocity)
    )
    original = prepare_longitudinal_state_space(dataset)

    assert altered.standardization["velocity"] == original.standardization["velocity"]
    np.testing.assert_array_equal(
        altered.x[dataset.post == 0],
        original.x[dataset.post == 0],
    )
    assert altered.model_input_hash != original.model_input_hash


def test_depth_and_minimum_worthwhile_change_are_context_only(validation_case):
    dataset = validation_case.dataset
    altered_depth = dataset.depth_exposure.copy()
    altered_depth[dataset.post == 1] += np.linspace(0.0, 10.0, (dataset.post == 1).sum())
    altered_plan = replace(dataset.hypothesis_plan, minimum_worthwhile_change=999.0)
    original = prepare_longitudinal_state_space(dataset)
    altered = prepare_longitudinal_state_space(
        replace(
            dataset,
            depth_exposure=altered_depth,
            hypothesis_plan=altered_plan,
        )
    )

    np.testing.assert_array_equal(altered.x, original.x)
    np.testing.assert_array_equal(altered.y, original.y)
    assert altered.model_input_hash == original.model_input_hash
    assert altered.context_binding_hash != original.context_binding_hash
    assert altered.prepared_input_hash != original.prepared_input_hash
    assert all("depth" not in name for name in altered.fixed_effect_names)


def test_constant_pre_period_predictor_holds(validation_case):
    dataset = validation_case.dataset
    breadth = dataset.breadth_exposure.copy()
    breadth[dataset.post == 0] = 1.0

    with pytest.raises(StateSpaceInputError, match="breadth"):
        prepare_longitudinal_state_space(replace(dataset, breadth_exposure=breadth))


def test_noncontiguous_time_windows_hold(validation_case):
    dataset = validation_case.dataset
    time_index = dataset.time_index.copy()
    time_index[time_index == 17] = 18

    with pytest.raises(StateSpaceInputError, match="contiguous"):
        prepare_longitudinal_state_space(replace(dataset, time_index=time_index))


def test_primary_engine_is_deterministic_and_summary_only(prepared, primary_fit):
    repeated = fit_deterministic_state_space(prepared, seed=202607121)

    assert primary_fit.prepared is prepared
    assert primary_fit.engine_kind == "deterministic_gaussian_state_space_integration"
    assert primary_fit.integration_diagnostics["status"] == "PASS"
    assert primary_fit.integration_diagnostics["point_count"] == STATE_SPACE_CUBATURE_POINT_COUNT
    assert primary_fit.integration_diagnostics["random_numbers_used"] is False
    assert primary_fit.summaries == repeated.summaries
    assert primary_fit.fit_summary_hash() == repeated.fit_summary_hash()
    assert not hasattr(primary_fit, "posterior_draws")


def test_primary_reports_every_required_concordance_quantity(prepared, primary_fit):
    expected = {
        *prepared.fixed_effect_names,
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
    }
    summaries = primary_fit.summary_by_name()

    assert set(summaries) == expected
    for summary in summaries.values():
        assert np.isfinite(summary.posterior_mean)
        assert summary.posterior_sd > 0.0
        assert summary.interval_80_lower <= summary.interval_80_upper


@pytest.mark.parametrize("mutation", ["delete", "duplicate"])
def test_concordance_rejects_deleted_or_duplicated_movement_quantity(
    primary_fit,
    mutation,
):
    summaries = list(primary_fit.summaries)
    movement = next(
        summary
        for summary in summaries
        if summary.quantity_name == "longitudinal_movement"
    )
    if mutation == "delete":
        summaries.remove(movement)
    else:
        summaries.append(movement)
    forged = replace(primary_fit, summaries=tuple(summaries))

    with pytest.raises(ValueError):
        evaluate_longitudinal_concordance(forged, forged)


def test_reference_smoke_uses_same_prepared_input_but_cannot_qualify(
    prepared,
    nuts_smoke_fit,
):
    assert nuts_smoke_fit.prepared is prepared
    assert nuts_smoke_fit.settings.mode == "smoke"
    assert nuts_smoke_fit.settings.full_settings is False
    assert nuts_smoke_fit.sampler_diagnostics["passed"] is False
    assert "full_sampler_settings" in nuts_smoke_fit.sampler_diagnostics[
        "failing_diagnostics"
    ]
    assert set(nuts_smoke_fit.summary_by_name()) == {
        *prepared.fixed_effect_names,
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
    }
    assert tuple(
        check.statistic_name for check in nuts_smoke_fit.posterior_predictive_checks
    ) == LONGITUDINAL_PPC_STATISTIC_NAMES


def test_reference_reports_each_required_scalar_diagnostic_once(
    prepared,
    nuts_smoke_fit,
):
    diagnostics = nuts_smoke_fit.sampler_diagnostics
    expected_names = [
        *(f"beta[{index}]" for index in range(len(prepared.fixed_effect_names))),
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
        *(f"z_panel_group[{index}]" for index in range(prepared.panel_group_count)),
        *(f"u_panel_group[{index}]" for index in range(prepared.panel_group_count)),
    ]
    actual_names = [
        diagnostic["parameter_name"] for diagnostic in diagnostics["parameters"]
    ]

    assert diagnostics["required_parameter_variables"] == [
        "beta",
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
        "z_panel_group",
        "u_panel_group",
    ]
    assert diagnostics["required_parameter_names"] == expected_names
    assert actual_names == expected_names
    assert actual_names.count("longitudinal_movement") == 1
    assert diagnostics["missing_parameter_names"] == []
    assert diagnostics["duplicate_parameter_names"] == []
    assert diagnostics["off_plan_parameter_names"] == []


def test_full_reference_settings_are_compiled_and_exact():
    settings = nuts_execution_settings("full")

    assert settings.full_settings is True
    assert settings.chains == LONGITUDINAL_NUTS_FULL_CHAINS == 4
    assert settings.draws == LONGITUDINAL_NUTS_FULL_DRAWS == 1000
    assert settings.tune == LONGITUDINAL_NUTS_FULL_TUNE == 2000
    assert settings.target_accept == LONGITUDINAL_NUTS_FULL_TARGET_ACCEPT == 0.99
    assert settings.max_treedepth == LONGITUDINAL_NUTS_FULL_MAX_TREEDEPTH == 15


def test_one_exact_full_setting_concordance_canary_passes():
    result = run_longitudinal_concordance_slot(
        required_longitudinal_concordance_slots()[0],
        mode="full",
    )

    assert result.status == "PASS"
    assert result.failing_checks == ()
    assert result.runner_error_stage is None
    assert result.runner_error_type is None
    assert result.reference_sampler_diagnostics["passed"] is True
    assert result.reference_sampler_diagnostics["failing_diagnostics"] == []
    assert all(check["passed"] for check in result.posterior_predictive_checks)
    assert all(quantity.passed for quantity in result.quantity_concordance)


def test_model_kind_is_literal():
    assert STATE_SPACE_MODEL_KIND == "gaussian_longitudinal_zero_sum_ar1_state_space"
