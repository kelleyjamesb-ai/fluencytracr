"""Sampler-free graph checks for the collapsed group-effect target."""

from __future__ import annotations

import inspect
import math
from collections import OrderedDict
from dataclasses import replace

import numpy as np
import pytest
import xarray as xr
from scipy.stats import halfnorm, norm, uniform

import fluencytracr_inference.vbd_trajectory_nuts as nuts
import fluencytracr_inference.vbd_trajectory_synthetic as synthetic
import fluencytracr_inference.vbd_trajectory_types as trajectory_types
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization as target
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization_constants as marginalization_constants
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization_constants import (
    VBD_TRAJECTORY_ALL_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_DIAGNOSTIC_ID,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_PLAN_REF,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_SEED_NAMESPACE,
)
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


def test_task_2_20_generation_and_sampling_capabilities_require_runner_tokens():
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


def test_v2_production_wrapper_reaches_base_paths_without_running_generator_or_sampler(
    monkeypatch,
):
    monkeypatch.setattr(synthetic, "validate_vbd_trajectory_runtime", lambda: None)

    class ReachedBasePaths(RuntimeError):
        pass

    def reached_base_paths(**kwargs):
        assert kwargs == {
            "panel_group_count": 6,
            "aggregate_k": 16,
            "seed": 2_055_901_200,
            "group_correlation": 0.35,
            "innovation_correlation": 0.35,
            "observation_correlation": 0.25,
        }
        raise ReachedBasePaths

    monkeypatch.setattr(synthetic, "_generate_base_paths", reached_base_paths)
    with pytest.raises(ReachedBasePaths):
        synthetic.generate_vbd_trajectory_group_effect_marginalization_diagnostic_case(
            0,
            _runner_token=(
                synthetic._GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
            ),
        )


def test_v2_wrapper_panel_passes_shared_validation_with_stubbed_base_paths(
    monkeypatch,
):
    calls = []

    def deterministic_base_paths(
        *,
        panel_group_count,
        aggregate_k,
        seed,
        group_correlation,
        innovation_correlation,
        observation_correlation,
    ):
        calls.append(seed)
        assert aggregate_k == 16
        assert (group_correlation, innovation_correlation, observation_correlation) == (
            0.35,
            0.35,
            0.25,
        )
        group_axis = np.linspace(-1.0, 1.0, panel_group_count)[:, None]
        lane_axis = np.asarray([[0.025, 0.035, 0.045]])
        group_effects = group_axis * lane_axis
        group_effects -= group_effects.mean(axis=0, keepdims=True)
        group = np.arange(panel_group_count, dtype=float)[:, None, None] + 1.0
        time = np.arange(18, dtype=float)[None, :, None] + 1.0
        lane = np.arange(3, dtype=float)[None, None, :] + 1.0
        states = 0.03 * np.sin(group * time * lane / 7.0)
        observation_errors = 0.02 * np.cos(group * time * lane / 5.0)
        known_se = 0.08
        covariance = (
            np.diag(np.full(3, known_se))
            @ synthetic._equicorrelation(0.25)
            @ np.diag(np.full(3, known_se))
        )
        return group_effects, states, observation_errors, covariance

    monkeypatch.setattr(synthetic, "validate_vbd_trajectory_runtime", lambda: None)
    monkeypatch.setattr(synthetic, "_generate_base_paths", deterministic_base_paths)
    case = synthetic.generate_vbd_trajectory_group_effect_marginalization_diagnostic_case(
        0,
        _runner_token=(
            synthetic._GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
        ),
    )
    assert calls == [2_055_901_200, 2_055_901_200]
    assert case.panel.study_plan_root == synthetic.sha256_json(
        synthetic.vbd_trajectory_group_effect_marginalization_case_body(0)
    )
    assert case.panel.seed_namespace == (
        synthetic.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
    )
    assert synthetic._spec_for_panel(case.panel) is (
        synthetic._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATION_SPECS[0]
    )


@pytest.mark.parametrize(
    ("field", "replacement"),
    (
        (
            "diagnostic_id",
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_DIAGNOSTIC_ID,
        ),
        ("plan_ref", VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_PLAN_REF),
        (
            "seed_namespace",
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_SEED_NAMESPACE,
        ),
        ("generator_seed", 2_055_901_000),
        (
            "scenario_id",
            "development_smoke_scenario_vbd_group_effect_marginalization_diagnostic_v1_case_0",
        ),
        ("acceptance_slot_key", "off-plan"),
        ("direction_vector", [-1, 1, 1]),
        ("lane_order", ["breadth", "engagement", "frequency"]),
        ("effect_size_sd", 0.2),
        ("ppc_state", "PASS"),
        ("acceptance_concordance_state", "PASS"),
        ("state", "PASS"),
        ("hold_reason", "other"),
        ("acceptance_evidence_eligible", True),
        ("acceptance_count_effect", 1),
        ("acceptance_count_effect", False),
        ("internal_only", False),
        ("synthetic_only", False),
        ("aggregate_only", False),
        ("customer_output_authorized", True),
        ("unexpected_key", True),
    ),
)
def test_v2_production_wrapper_rejects_v1_and_off_plan_case_identity(
    monkeypatch, field, replacement
):
    original_body = synthetic.vbd_trajectory_group_effect_marginalization_case_body
    original = original_body(0)
    monkeypatch.setattr(
        synthetic,
        "vbd_trajectory_group_effect_marginalization_case_body",
        lambda _case_ordinal: {**original, field: replacement},
    )
    monkeypatch.setattr(
        synthetic,
        "_generate_vbd_trajectory_case",
        lambda _spec: (_ for _ in ()).throw(
            AssertionError("off-plan wrapper identity reached generation dispatcher")
        ),
    )
    with pytest.raises(
        (ValueError, synthetic.VbdSyntheticRunnerError),
    ):
        synthetic.generate_vbd_trajectory_group_effect_marginalization_diagnostic_case(
            0,
            _runner_token=(
                synthetic._GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
            ),
        )


def test_case_body_validator_expectation_is_independent_of_runtime_helpers(
    monkeypatch,
):
    canonical = synthetic.vbd_trajectory_group_effect_marginalization_case_body(0)
    forged = {**canonical, "state": "PASS"}
    monkeypatch.setattr(
        marginalization_constants,
        "_vbd_trajectory_group_effect_marginalization_case_body",
        lambda _case_ordinal: forged,
    )
    assert not hasattr(
        marginalization_constants,
        "_vbd_trajectory_group_effect_marginalization_case_body_snapshot",
    )
    monkeypatch.setattr(
        marginalization_constants,
        "_vbd_trajectory_group_effect_marginalization_case_body_snapshot",
        lambda _case_ordinal: forged,
        raising=False,
    )
    assert synthetic.vbd_trajectory_group_effect_marginalization_case_body(0) == canonical
    canonical_spec = (
        synthetic._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATION_SPECS[0]
    )
    monkeypatch.setattr(
        synthetic,
        "_vbd_group_effect_marginalization_generation_spec",
        lambda *_args, **_kwargs: replace(canonical_spec, plan_hash="0" * 64),
    )
    assert (
        synthetic._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATION_SPECS[0]
        is canonical_spec
    )
    with pytest.raises(ValueError, match="case body is not exact V2"):
        synthetic.validate_vbd_trajectory_group_effect_marginalization_case_body(
            forged,
            case_ordinal=0,
        )


@pytest.mark.parametrize("spoof_kind", ("same_text_subclass", "equality_hash_spoof"))
def test_case_body_rejects_non_native_mapping_keys_in_wrapper_and_panel_validator(
    monkeypatch, spoof_kind
):
    class SameTextKey(str):
        pass

    class EqualityHashSpoof(str):
        def __new__(cls):
            return super().__new__(cls, "different_plan_key")

        def __hash__(self):
            return hash("plan_ref")

        def __eq__(self, other):
            return other == "plan_ref"

    original = synthetic.vbd_trajectory_group_effect_marginalization_case_body(0)
    forged = dict(original)
    value = forged.pop("plan_ref")
    spoofed_key = (
        SameTextKey("plan_ref")
        if spoof_kind == "same_text_subclass"
        else EqualityHashSpoof()
    )
    forged[spoofed_key] = value
    with pytest.raises(ValueError, match="case body is not exact V2"):
        synthetic.validate_vbd_trajectory_group_effect_marginalization_case_body(
            forged,
            case_ordinal=0,
        )
    monkeypatch.setattr(
        synthetic,
        "vbd_trajectory_group_effect_marginalization_case_body",
        lambda _case_ordinal: forged,
    )
    monkeypatch.setattr(
        synthetic,
        "_generate_vbd_trajectory_case",
        lambda _spec: (_ for _ in ()).throw(
            AssertionError("non-native mapping key reached generation dispatcher")
        ),
    )
    with pytest.raises(ValueError, match="case body is not exact V2"):
        synthetic.generate_vbd_trajectory_group_effect_marginalization_diagnostic_case(
            0,
            _runner_token=(
                synthetic._GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
            ),
        )
    assert (
        "validate_vbd_trajectory_group_effect_marginalization_case_body("
        in inspect.getsource(trajectory_types.validate_trajectory_panel)
    )


@pytest.mark.parametrize(
    "mutation",
    (
        {"plan_ref": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_PLAN_REF},
        {
            "seed_namespace": (
                VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_SEED_NAMESPACE
            )
        },
        {"scenario_id": "development_smoke_scenario_off_plan"},
        {"acceptance_slot_key": "forbidden"},
        {"marginalization_runner_token": None},
        {"direction_vector": (-1, 1, 1)},
        {
            "post_pattern": (
                synthetic.VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN
            )
        },
        {"correlations": (0.0, 0.0, 0.0)},
        {"depth_context_ref": "depth-context:b"},
        {"shock_kind": "common_availability"},
        {
            "reported_standard_error_ratio": 0.5,
            "reported_covariance_ratio": 0.25,
        },
        {"zero_pre_period_variance": True},
        {"panel_group_count": 12},
        {"aggregate_k": 15},
        {"terminal_truth": (0.2, 0.2, 0.2)},
    ),
)
def test_v2_dispatcher_rejects_v1_and_off_plan_identity_before_base_paths(
    monkeypatch, mutation
):
    runner_token = (
        synthetic._GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
    )
    spec = synthetic._vbd_group_effect_marginalization_generation_spec(
        0,
        runner_token=runner_token,
    )
    monkeypatch.setattr(synthetic, "validate_vbd_trajectory_runtime", lambda: None)
    monkeypatch.setattr(
        synthetic,
        "_generate_base_paths",
        lambda **_kwargs: (_ for _ in ()).throw(
            AssertionError("off-plan identity reached base paths")
        ),
    )
    with pytest.raises(ValueError):
        synthetic._generate_vbd_trajectory_case(replace(spec, **mutation))


@pytest.mark.parametrize(
    "spoof_field",
    ("plan_ref", "seed_namespace", "plan_hash", "direction_vector", "seed"),
)
def test_v2_dispatcher_rejects_equality_spoofs_before_base_paths(
    monkeypatch, spoof_field
):
    class EqualitySpoof(str):
        def __eq__(self, _other):
            return True

        def __ne__(self, _other):
            return False

        __hash__ = str.__hash__

    class EqualityIntSpoof(int):
        def __eq__(self, _other):
            return True

        def __ne__(self, _other):
            return False

        __hash__ = int.__hash__

    runner_token = (
        synthetic._GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
    )
    canonical = synthetic._vbd_group_effect_marginalization_generation_spec(
        0,
        runner_token=runner_token,
    )
    replacements = {
        "plan_ref": EqualitySpoof(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_PLAN_REF
        ),
        "seed_namespace": EqualitySpoof(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_SEED_NAMESPACE
        ),
        "plan_hash": EqualitySpoof("0" * 64),
        "direction_vector": (EqualityIntSpoof(1), 1, 1),
        "seed": EqualityIntSpoof(canonical.seed),
    }
    forged = replace(canonical, **{spoof_field: replacements[spoof_field]})
    assert not synthetic._exact_vbd_trajectory_generation_spec_equal(
        forged, canonical
    )
    monkeypatch.setattr(synthetic, "validate_vbd_trajectory_runtime", lambda: None)
    monkeypatch.setattr(
        synthetic,
        "_generate_base_paths",
        lambda **_kwargs: (_ for _ in ()).throw(
            AssertionError("equality-spoofed identity reached base paths")
        ),
    )
    with pytest.raises(ValueError):
        synthetic._generate_vbd_trajectory_case(forged)


@pytest.mark.parametrize(
    "reserved_seed",
    sorted(VBD_TRAJECTORY_ALL_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS),
)
def test_all_v1_v2_reserved_seeds_reject_plan_family_substitution_before_base_paths(
    monkeypatch, reserved_seed
):
    runner_token = (
        synthetic._GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
    )
    spec = synthetic._vbd_group_effect_marginalization_generation_spec(
        0,
        runner_token=runner_token,
    )
    disguised = replace(
        spec,
        seed=reserved_seed,
        plan_ref=synthetic.VBD_TRAJECTORY_VALIDATION_PLAN_REF,
        plan_hash=synthetic.immutable_vbd_trajectory_validation_plan().plan_hash,
        seed_namespace=synthetic.VBD_TRAJECTORY_VALIDATION_SEED_NAMESPACE,
        acceptance_slot_key="forged-validation-slot",
        marginalization_runner_token=None,
    )
    monkeypatch.setattr(synthetic, "validate_vbd_trajectory_runtime", lambda: None)
    monkeypatch.setattr(
        synthetic,
        "_generate_base_paths",
        lambda **_kwargs: (_ for _ in ()).throw(
            AssertionError("reserved marginalization seed reached base paths")
        ),
    )
    with pytest.raises(ValueError, match="reserved seed is outside its exact V2 plan"):
        synthetic._generate_vbd_trajectory_case(disguised)
