"""Sampler-free graph checks for the collapsed group-effect target."""

from __future__ import annotations

import inspect
import math
from collections import OrderedDict

import numpy as np
import pytest
import xarray as xr
from scipy.stats import halfnorm, norm, uniform

import fluencytracr_inference.vbd_trajectory_nuts as nuts
import fluencytracr_inference.vbd_trajectory_synthetic as synthetic
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization as target
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization import (
    build_vbd_trajectory_group_effect_marginalized_model,
    canonical_vbd_group_effect_marginalization_posterior_grids,
    project_vbd_group_effect_marginalization_posterior,
    project_vbd_sampled_parameter,
    VbdGroupEffectConditionalReconstruction,
    VbdGroupEffectMarginalizationPosteriorProjection,
    validate_vbd_group_effect_marginalization_posterior_variable_order,
    vbd_group_effect_marginalized_log_density,
)
from vbd_trajectory_group_effect_marginalization_fixtures import (
    canonical_prepared_input,
)


@pytest.fixture(autouse=True)
def _sampling_is_forbidden(monkeypatch):
    calls = []

    def sentinel(*args, **kwargs):
        calls.append((args, kwargs))
        raise AssertionError("pm.sample must not run in marginalization model tests")

    monkeypatch.setattr(target.pm, "sample", sentinel)
    yield
    assert calls == []


def _prepared(panel_group_count: int):
    return canonical_prepared_input(panel_group_count)


@pytest.mark.parametrize("panel_group_count", (6, 12))
def test_candidate_graph_samples_exactly_five_parameters_and_matches_pure_target(
    panel_group_count,
):
    prepared = _prepared(panel_group_count)
    model = build_vbd_trajectory_group_effect_marginalized_model(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
    )
    assert tuple(rv.name for rv in model.free_RVs) == (
        "alpha", "beta", "sigma_u", "sigma_r", "rho"
    )
    assert tuple(rv.name for rv in model.deterministics) == ()
    assert tuple(rv.name for rv in model.observed_RVs) == ()
    assert tuple(potential.name for potential in model.potentials) == (
        "marginal_observation_logp",
    )
    assert validate_vbd_group_effect_marginalization_posterior_variable_order(
        ("alpha", "beta", "sigma_u", "sigma_r", "rho")
    ) == (
        "alpha", "beta", "sigma_u", "sigma_r", "rho"
    )
    point = dict(alpha=0.11, beta=-0.05, sigma_u=0.28, sigma_r=0.21, rho=0.33)
    transformed = {
        "alpha": np.asarray(point["alpha"]),
        "beta": np.asarray(point["beta"]),
        "sigma_u_log__": np.asarray(math.log(point["sigma_u"])),
        "sigma_r_log__": np.asarray(math.log(point["sigma_r"])),
        "rho_interval__": np.asarray(
            math.log((point["rho"] + 0.95) / (0.95 - point["rho"]))
        ),
    }
    graph_logp = float(model.compile_logp(vars=model.potentials)(transformed))
    pure_logp = vbd_group_effect_marginalized_log_density(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
        **point,
    )
    np.testing.assert_allclose(graph_logp, pure_logp, rtol=0.0, atol=2e-10)


def test_candidate_target_source_is_independent_and_cholesky_only():
    source = inspect.getsource(
        build_vbd_trajectory_group_effect_marginalized_model
    ) + inspect.getsource(
        target.vbd_group_effect_marginalized_symbolic_log_density
    )
    assert "_evaluate_target" not in source
    assert "_conditional_gaussian" not in source
    assert "fit_vbd_trajectory_state_space" not in source
    assert "inv(" not in source
    assert "cholesky" in source.lower()


def test_full_model_log_density_preserves_the_five_frozen_priors_once():
    prepared = _prepared(6)
    model = build_vbd_trajectory_group_effect_marginalized_model(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
    )
    point = dict(alpha=0.11, beta=-0.05, sigma_u=0.28, sigma_r=0.21, rho=0.33)
    transformed = {
        "alpha": np.asarray(point["alpha"]),
        "beta": np.asarray(point["beta"]),
        "sigma_u_log__": np.asarray(math.log(point["sigma_u"])),
        "sigma_r_log__": np.asarray(math.log(point["sigma_r"])),
        "rho_interval__": np.asarray(math.log((point["rho"] + 0.95) / (0.95 - point["rho"]))),
    }
    actual = float(model.compile_logp(jacobian=False)(transformed))
    likelihood = vbd_group_effect_marginalized_log_density(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
        **point,
    )
    expected = (
        likelihood
        + norm.logpdf(point["alpha"], loc=0.0, scale=1.0)
        + norm.logpdf(point["beta"], loc=0.0, scale=1.0)
        + halfnorm.logpdf(point["sigma_u"], scale=1.0)
        + halfnorm.logpdf(point["sigma_r"], scale=1.0)
        + uniform.logpdf(point["rho"], loc=-0.95, scale=1.9)
    )
    np.testing.assert_allclose(actual, expected, rtol=0.0, atol=2e-10)


@pytest.mark.parametrize(
    "names",
    (
        ("alpha", "beta", "sigma_u", "sigma_r"),
        ("alpha", "beta", "sigma_u", "sigma_r", "rho", "u"),
        ("alpha", "beta", "sigma_u", "sigma_r", "rho", "trajectory_movement"),
    ),
)
def test_candidate_posterior_variable_order_fails_closed(names):
    with pytest.raises(ValueError):
        validate_vbd_group_effect_marginalization_posterior_variable_order(names)


class _PosteriorContainer:
    def __init__(self, ordered_items):
        self.data_vars = [name for name, _value in ordered_items]
        self.coords = {
            "chain": np.arange(4, dtype=np.int64),
            "draw": np.arange(20_000, dtype=np.int64),
        }
        self._values = {
            name: _PosteriorVariable(value) for name, value in ordered_items
        }

    def __getitem__(self, name):
        return self._values[name]


class _PosteriorVariable:
    dims = ("chain", "draw")

    def __init__(self, values):
        self.values = values
        self.coords = {
            "chain": np.arange(4, dtype=np.int64),
            "draw": np.arange(20_000, dtype=np.int64),
        }


def _valid_posterior_items():
    draw = np.arange(20_000, dtype=np.float64)
    wave = np.stack([np.sin((draw + chain) / 41.0) for chain in range(4)])
    return OrderedDict(
        alpha=np.ascontiguousarray(0.1 * wave),
        beta=np.ascontiguousarray(0.05 * wave),
        sigma_u=np.ascontiguousarray(0.4 + 0.01 * wave),
        sigma_r=np.ascontiguousarray(0.3 + 0.01 * wave),
        rho=np.ascontiguousarray(0.2 + 0.01 * wave),
    )


def test_natural_posterior_storage_order_is_canonicalized_by_name():
    values = _valid_posterior_items()
    coords = {"chain": np.arange(4), "draw": np.arange(20_000)}
    natural_dataset = xr.Dataset(
        {name: (("chain", "draw"), value) for name, value in values.items()},
        coords=coords,
    )
    permuted_dataset = xr.Dataset(
        {
            name: (("chain", "draw"), value)
            for name, value in reversed(values.items())
        },
        coords=coords,
    )
    canonical = canonical_vbd_group_effect_marginalization_posterior_grids(
        natural_dataset
    )
    permuted = canonical_vbd_group_effect_marginalization_posterior_grids(
        permuted_dataset
    )
    assert tuple(canonical) == ("alpha", "beta", "sigma_u", "sigma_r", "rho")
    assert tuple(permuted) == tuple(canonical)
    assert all(np.array_equal(canonical[name], permuted[name]) for name in canonical)


@pytest.mark.parametrize("mutation", ("missing", "extra", "duplicate"))
def test_posterior_variable_set_rejects_missing_extra_or_duplicate(mutation):
    items = list(_valid_posterior_items().items())
    if mutation == "missing":
        items.pop()
    elif mutation == "extra":
        items.append(("u", items[0][1]))
    else:
        items.append(("alpha", items[0][1]))
    with pytest.raises(ValueError, match="variable set"):
        canonical_vbd_group_effect_marginalization_posterior_grids(
            _PosteriorContainer(items)
        )


def test_posterior_projection_rejects_missing_draw_coordinate_fail_closed():
    posterior = _PosteriorContainer(list(_valid_posterior_items().items()))
    del posterior["rho"].coords["draw"]
    with pytest.raises(ValueError, match="chain/draw identity"):
        canonical_vbd_group_effect_marginalization_posterior_grids(posterior)


@pytest.mark.parametrize(
    "mutation",
    (
        "extra_dataset_coordinate",
        "float_dataset_coordinate",
        "shifted_dataset_coordinate",
        "extra_variable_coordinate",
        "float_chain_coordinate",
        "int32_draw_coordinate",
        "shifted_draw_coordinate",
        "transposed_grid",
        "relabeled_dimensions",
    ),
)
def test_posterior_container_requires_exact_coordinate_schema_dtype_and_values(
    mutation,
):
    posterior = _PosteriorContainer(list(_valid_posterior_items().items()))
    variable = posterior["rho"]
    if mutation == "extra_dataset_coordinate":
        posterior.coords["warmup"] = np.asarray(0, dtype=np.int64)
    elif mutation == "float_dataset_coordinate":
        posterior.coords["chain"] = np.arange(4, dtype=np.float64)
    elif mutation == "shifted_dataset_coordinate":
        posterior.coords["draw"] = np.arange(1, 20_001, dtype=np.int64)
    elif mutation == "extra_variable_coordinate":
        variable.coords["warmup"] = np.asarray(0, dtype=np.int64)
    elif mutation == "float_chain_coordinate":
        variable.coords["chain"] = np.arange(4, dtype=np.float64)
    elif mutation == "int32_draw_coordinate":
        variable.coords["draw"] = np.arange(20_000, dtype=np.int32)
    elif mutation == "shifted_draw_coordinate":
        variable.coords["draw"] = np.arange(1, 20_001, dtype=np.int64)
    elif mutation == "transposed_grid":
        variable.values = variable.values.T
    else:
        variable.dims = ("draw", "chain")
    with pytest.raises(ValueError, match="chain/draw identity|posterior grid"):
        canonical_vbd_group_effect_marginalization_posterior_grids(posterior)


@pytest.mark.parametrize(
    ("name", "value"),
    (
        ("sigma_u", 0.0),
        ("sigma_u", -0.01),
        ("sigma_r", 0.0),
        ("rho", -0.95),
        ("rho", 0.95),
        ("rho", np.inf),
        ("alpha", np.nan),
    ),
)
def test_sampled_parameter_projection_enforces_exact_prior_support(name, value):
    baseline = 0.2 if name == "rho" else 1.0
    grid = np.full((4, 20_000), baseline, dtype=np.float64)
    grid[0, 0] = value
    with pytest.raises(ValueError, match="support"):
        project_vbd_sampled_parameter(name, grid)


def test_rho_projection_accepts_values_strictly_inside_frozen_support():
    draw = np.arange(20_000, dtype=np.float64)
    grid = np.ascontiguousarray(
        np.stack([0.90 + 0.01 * np.sin((draw + chain) / 29.0) for chain in range(4)])
    )
    grid[0, 0] = np.nextafter(0.95, 0.0)
    projection = project_vbd_sampled_parameter("rho", grid)
    assert projection.summary.quantity_name == "rho"


@pytest.mark.parametrize("name", ("sigma_u", "sigma_r"))
def test_scale_projection_accepts_values_strictly_above_zero(name):
    draw = np.arange(20_000, dtype=np.float64)
    grid = np.ascontiguousarray(
        np.stack([0.2 + 0.01 * np.sin((draw + chain) / 29.0) for chain in range(4)])
    )
    grid[0, 0] = np.nextafter(0.0, 1.0)
    assert project_vbd_sampled_parameter(name, grid).summary.quantity_name == name


def test_reconstruction_projection_is_derived_from_bound_outer_grids(monkeypatch):
    prepared = _prepared(6)
    calls = 0

    def exact_conditional(
        prepared_value,
        *,
        expected_model_input_hash,
        expected_prepared_input_hash,
        **point,
    ):
        nonlocal calls
        assert prepared_value is prepared
        assert expected_model_input_hash == prepared.model_input_hash
        assert expected_prepared_input_hash == prepared.prepared_input_hash
        calls += 1
        projection = prepared.zero_sum_basis @ prepared.zero_sum_basis.T
        coordinates = np.arange(1, 6, dtype=np.float64)
        u_mean = prepared.zero_sum_basis @ (
            point["alpha"] * coordinates + point["beta"] * coordinates**2
        )
        u_covariance = (0.2 + 0.01 * point["sigma_u"]) * projection
        movement_mean = point["alpha"] + point["beta"]
        joint_mean = np.concatenate((u_mean, [movement_mean]))
        joint_covariance = np.zeros((7, 7), dtype=np.float64)
        joint_covariance[:6, :6] = u_covariance
        joint_covariance[-1, -1] = 0.5 + 0.01 * point["sigma_r"]
        return VbdGroupEffectConditionalReconstruction(
            u_mean=u_mean,
            u_covariance=u_covariance,
            movement_mean=movement_mean,
            movement_variance=0.5 + 0.01 * point["sigma_r"],
            joint_mean=joint_mean,
            joint_covariance=joint_covariance,
        )

    monkeypatch.setattr(target, "conditional_vbd_group_effect_reconstruction", exact_conditional)
    bundle = project_vbd_group_effect_marginalization_posterior(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
        posterior=_PosteriorContainer(list(reversed(_valid_posterior_items().items()))),
    )
    assert type(bundle) is VbdGroupEffectMarginalizationPosteriorProjection
    assert calls == 80_000
    assert tuple(item.summary.quantity_name for item in bundle.sampled_parameter_projections) == (
        "alpha", "beta", "sigma_u", "sigma_r", "rho"
    )
    assert tuple(item.summary.quantity_name for item in bundle.reconstructed_quantity_projections) == (
        "u[0]", "u[1]", "u[2]", "u[3]", "u[4]", "u[5]", "trajectory_movement"
    )
    assert all(
        item.conditional_mean_substitution is False
        and item.pseudo_draws_emitted is False
        for item in bundle.reconstructed_quantity_projections
    )
    assert not any(isinstance(value, np.ndarray) for value in bundle.__dict__.values())
    with pytest.raises(TypeError):
        VbdGroupEffectMarginalizationPosteriorProjection()


def test_task_2_17_generation_and_sampling_capabilities_require_runner_tokens():
    assert hasattr(nuts, "_VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SAMPLING_TOKEN")
    assert hasattr(nuts, "_sample_vbd_trajectory_group_effect_marginalization_idata")
    assert hasattr(
        synthetic,
        "_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN",
    )
    with pytest.raises(synthetic.VbdSyntheticRunnerError):
        synthetic.generate_vbd_trajectory_group_effect_marginalization_diagnostic_case(
            0, _runner_token=object()
        )
    source = inspect.getsource(target)
    assert "pm.sample(" not in source
    assert "generate_vbd_trajectory" not in source
