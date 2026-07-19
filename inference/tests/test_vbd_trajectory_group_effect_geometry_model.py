"""Sampler-free identity checks for the VBD group-effect geometry arms."""

from __future__ import annotations

from dataclasses import replace
import math
from types import SimpleNamespace

import numpy as np
import pytest
import pytensor
import pytensor.tensor as pt
from pymc.distributions.transforms import ZeroSumTransform

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_group_effect_geometry_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS,
    vbd_trajectory_group_effect_geometry_chain_seeds,
)
from fluencytracr_inference import vbd_trajectory_nuts as nuts


_PLAN_HASH = "3" * 64


@pytest.fixture(autouse=True)
def _sampling_is_forbidden(monkeypatch):
    calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    def sentinel(*args, **kwargs):
        calls.append((args, kwargs))
        raise AssertionError("pm.sample must not run in geometry model tests")

    monkeypatch.setattr(nuts.pm, "sample", sentinel)
    yield
    assert calls == []


def _prepared_stub(panel_group_count: int) -> SimpleNamespace:
    rows_per_group = 2
    row_count = panel_group_count * rows_per_group
    group_rows = tuple(
        np.arange(
            group * rows_per_group,
            (group + 1) * rows_per_group,
            dtype=np.int64,
        )
        for group in range(panel_group_count)
    )
    time_tau = np.tile(np.asarray((-0.5, 0.5), dtype=np.float64), panel_group_count)
    group_pattern = np.repeat(
        np.linspace(-0.2, 0.2, panel_group_count, dtype=np.float64),
        rows_per_group,
    )
    contrast = np.tile(
        np.asarray((-0.5, 0.5), dtype=np.float64) / panel_group_count,
        panel_group_count,
    )
    return SimpleNamespace(
        panel_group_count=panel_group_count,
        group_rows=group_rows,
        y=0.1 + 0.05 * time_tau + group_pattern,
        known_se=np.full(row_count, 0.25, dtype=np.float64),
        time_tau=time_tau,
        latent_level_contrast=contrast,
    )


def _free_zero_sum_basis(model, variable_name: str, panel_group_count: int) -> np.ndarray:
    transform = model.rvs_to_transforms[model[variable_name]]
    assert type(transform) is ZeroSumTransform
    free = pt.vector("free_zero_sum_coordinate", dtype="float64")
    constrained = transform.backward(free)
    project = pytensor.function([free], constrained, mode="FAST_COMPILE")
    return np.column_stack(
        [
            project(np.eye(panel_group_count - 1, dtype=np.float64)[index])
            for index in range(panel_group_count - 1)
        ]
    )


def _compile_projected_u(model, variable_name: str):
    expression = model.replace_rvs_by_values([model["u"]])[0]
    values = {value.name: value for value in model.value_vars}
    scale = values["sigma_u_log__"]
    group = values[f"{variable_name}_zerosum__"]
    return pytensor.function(
        [scale, group],
        expression,
        mode="FAST_COMPILE",
        on_unused_input="ignore",
    )


def _mapped_points(panel_group_count: int, sigma_u: float):
    standardized = np.linspace(
        -0.35, 0.25, panel_group_count - 1, dtype=np.float64
    )
    common = {
        "alpha": np.asarray(0.12),
        "beta": np.asarray(-0.08),
        "sigma_u_log__": np.asarray(math.log(sigma_u)),
        "sigma_r_log__": np.asarray(math.log(0.4)),
        "rho_interval__": np.asarray(math.log((0.2 + 0.95) / (0.95 - 0.2))),
        "trajectory_movement": np.asarray(0.04),
    }
    centered = {**common, "u_zerosum__": sigma_u * standardized}
    noncentered = {**common, "u_std_zerosum__": standardized}
    return centered, noncentered, standardized


@pytest.mark.parametrize("panel_group_count", (6, 12))
def test_geometry_graphs_have_exact_arm_specific_variable_sets(panel_group_count):
    prepared = _prepared_stub(panel_group_count)
    default_model = nuts._build_reference_model(prepared)
    centered = nuts._build_reference_model(
        prepared, group_effect_arm="centered"
    )
    noncentered = nuts._build_reference_model(
        prepared, group_effect_arm="noncentered"
    )

    centered_free = (
        "alpha",
        "beta",
        "sigma_u",
        "u",
        "sigma_r",
        "rho",
        "trajectory_movement",
    )
    noncentered_free = (
        "alpha",
        "beta",
        "sigma_u",
        "u_std",
        "sigma_r",
        "rho",
        "trajectory_movement",
    )
    assert tuple(rv.name for rv in default_model.free_RVs) == centered_free
    assert tuple(rv.name for rv in centered.free_RVs) == centered_free
    assert tuple(rv.name for rv in noncentered.free_RVs) == noncentered_free
    assert tuple(value.name for value in centered.deterministics) == ()
    assert tuple(value.name for value in noncentered.deterministics) == ("u",)
    assert tuple(rv.name for rv in centered.observed_RVs) == tuple(
        f"observed_group_{group}" for group in range(panel_group_count)
    )
    assert tuple(rv.name for rv in noncentered.observed_RVs) == tuple(
        f"observed_group_{group}" for group in range(panel_group_count)
    )
    assert nuts._vbd_trajectory_group_effect_geometry_posterior_variables(
        "centered"
    ) == centered_free
    assert nuts._vbd_trajectory_group_effect_geometry_posterior_variables(
        "noncentered"
    ) == (
        "alpha",
        "beta",
        "sigma_u",
        "u_std",
        "u",
        "sigma_r",
        "rho",
        "trajectory_movement",
    )

    common_names = (
        "alpha",
        "beta",
        "sigma_u",
        *(f"u[{index}]" for index in range(panel_group_count)),
        "sigma_r",
        "rho",
        "trajectory_movement",
    )
    assert nuts._vbd_trajectory_group_effect_geometry_common_parameter_names(
        panel_group_count
    ) == common_names
    assert nuts._vbd_trajectory_group_effect_geometry_only_parameter_names(
        "centered", panel_group_count
    ) == ()
    assert nuts._vbd_trajectory_group_effect_geometry_only_parameter_names(
        "noncentered", panel_group_count
    ) == tuple(
        f"u_std[{index}]" for index in range(panel_group_count)
    )
    assert nuts._vbd_trajectory_group_effect_geometry_diagnostic_parameter_names(
        "noncentered", panel_group_count
    ) == (
        *common_names,
        *(f"u_std[{index}]" for index in range(panel_group_count)),
    )


@pytest.mark.parametrize("panel_group_count", (6, 12))
def test_noncentered_projection_is_exact_zero_sum_with_matching_covariance(
    panel_group_count,
):
    prepared = _prepared_stub(panel_group_count)
    centered = nuts._build_reference_model(prepared)
    noncentered = nuts._build_reference_model(
        prepared, group_effect_arm="noncentered"
    )
    centered_basis = _free_zero_sum_basis(centered, "u", panel_group_count)
    noncentered_basis = _free_zero_sum_basis(
        noncentered, "u_std", panel_group_count
    )
    expected_projection = np.eye(panel_group_count) - np.ones(
        (panel_group_count, panel_group_count), dtype=np.float64
    ) / panel_group_count
    np.testing.assert_allclose(
        centered_basis @ centered_basis.T,
        expected_projection,
        rtol=0.0,
        atol=1e-13,
    )
    np.testing.assert_allclose(
        noncentered_basis @ noncentered_basis.T,
        expected_projection,
        rtol=0.0,
        atol=1e-13,
    )

    sigma_u = 0.7
    centered_point, noncentered_point, standardized = _mapped_points(
        panel_group_count, sigma_u
    )
    centered_u = _compile_projected_u(centered, "u")(
        centered_point["sigma_u_log__"], centered_point["u_zerosum__"]
    )
    noncentered_u = _compile_projected_u(noncentered, "u_std")(
        noncentered_point["sigma_u_log__"],
        noncentered_point["u_std_zerosum__"],
    )
    expected_u = sigma_u * noncentered_basis @ standardized
    np.testing.assert_allclose(centered_u, expected_u, rtol=0.0, atol=1e-13)
    np.testing.assert_allclose(noncentered_u, expected_u, rtol=0.0, atol=1e-13)
    assert abs(float(np.sum(noncentered_u))) <= 1e-13
    np.testing.assert_allclose(
        sigma_u**2 * noncentered_basis @ noncentered_basis.T,
        sigma_u**2 * expected_projection,
        rtol=0.0,
        atol=1e-13,
    )


@pytest.mark.parametrize("panel_group_count", (6, 12))
def test_mapped_targets_match_likelihood_and_group_prior_jacobian(
    panel_group_count,
):
    prepared = _prepared_stub(panel_group_count)
    centered = nuts._build_reference_model(prepared)
    noncentered = nuts._build_reference_model(
        prepared, group_effect_arm="noncentered"
    )
    sigma_u = 0.7
    centered_point, noncentered_point, _ = _mapped_points(
        panel_group_count, sigma_u
    )

    centered_likelihood = float(
        centered.compile_logp(vars=centered.observed_RVs)(centered_point)
    )
    noncentered_likelihood = float(
        noncentered.compile_logp(vars=noncentered.observed_RVs)(
            noncentered_point
        )
    )
    np.testing.assert_allclose(
        noncentered_likelihood, centered_likelihood, rtol=0.0, atol=1e-11
    )

    centered_movement = float(
        centered.compile_logp(vars=[centered["trajectory_movement"]])(
            centered_point
        )
    )
    noncentered_movement = float(
        noncentered.compile_logp(vars=[noncentered["trajectory_movement"]])(
            noncentered_point
        )
    )
    np.testing.assert_allclose(
        noncentered_movement, centered_movement, rtol=0.0, atol=1e-11
    )

    centered_group_prior = float(
        centered.compile_logp(vars=[centered["u"]], jacobian=True)(
            centered_point
        )
    )
    noncentered_group_prior = float(
        noncentered.compile_logp(vars=[noncentered["u_std"]], jacobian=True)(
            noncentered_point
        )
    )
    coordinate_log_jacobian = (panel_group_count - 1) * math.log(sigma_u)
    np.testing.assert_allclose(
        noncentered_group_prior,
        centered_group_prior + coordinate_log_jacobian,
        rtol=0.0,
        atol=1e-11,
    )

    centered_target = float(centered.compile_logp(jacobian=True)(centered_point))
    noncentered_target = float(
        noncentered.compile_logp(jacobian=True)(noncentered_point)
    )
    np.testing.assert_allclose(
        noncentered_target,
        centered_target + coordinate_log_jacobian,
        rtol=0.0,
        atol=1e-10,
    )


def test_geometry_binding_is_exact_and_rejects_forgery():
    for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES:
        for lane_ordinal, lane in enumerate(nuts.VBD_TRAJECTORY_LANES):
            for arm in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER:
                binding = (
                    nuts.build_vbd_trajectory_nuts_group_effect_geometry_binding(
                        case_ordinal=case.case_ordinal,
                        arm=arm,
                        lane=lane,
                        lane_ordinal=lane_ordinal,
                        plan_hash=_PLAN_HASH,
                    )
                )
                assert binding.effect_size_sd == case.effect_size_sd
                assert binding.panel_group_count == case.panel_group_count
                assert binding.aggregate_k == case.aggregate_k
                assert binding.generator_seed == case.generator_seed
                assert binding.scenario_id == case.scenario_id
                assert binding.chain_seeds == (
                    vbd_trajectory_group_effect_geometry_chain_seeds(
                        case_ordinal=case.case_ordinal,
                        lane_ordinal=lane_ordinal,
                        arm=arm,
                    )
                )
                assert binding.binding_hash == sha256_json(
                    binding.body_without_hash()
                )
                assert binding.body_without_hash()["ppc_state"] == "NOT_RUN"
                assert (
                    binding.body_without_hash()["acceptance_concordance_state"]
                    == "NOT_RUN"
                )
                assert binding.body_without_hash()["acceptance_evidence_eligible"] is False

    valid = nuts.build_vbd_trajectory_nuts_group_effect_geometry_binding(
        case_ordinal=0,
        arm="centered",
        lane="frequency",
        lane_ordinal=0,
        plan_hash=_PLAN_HASH,
    )
    mutations = (
        {"effect_size_sd": 0.5},
        {"panel_group_count": 12},
        {"aggregate_k": 15},
        {"generator_seed": valid.generator_seed + 1},
        {"scenario_id": valid.scenario_id + "-forged"},
        {"arm": "noncentered"},
        {"lane": "engagement"},
        {"lane_ordinal": 1},
        {"plan_hash": "F" * 64},
        {"chain_seeds": tuple(seed + 1 for seed in valid.chain_seeds)},
        {"binding_hash": "0" * 64},
    )
    for mutation in mutations:
        with pytest.raises(nuts.TrajectoryNutsError):
            replace(valid, **mutation)


@pytest.mark.parametrize("bad_arm", (None, True, "non-centered", "CENTERED"))
def test_geometry_graph_rejects_unknown_arms_before_sampling(bad_arm):
    with pytest.raises(nuts.TrajectoryNutsError):
        nuts._build_reference_model(
            _prepared_stub(6), group_effect_arm=bad_arm
        )


def test_all_geometry_seeds_are_rejected_by_generic_smoke_path():
    settings = nuts.vbd_nuts_execution_settings("smoke")
    safe_chain = 2_055_900_010
    safe_ppc = 2_055_900_011
    for reserved_seed in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS:
        with pytest.raises(ValueError, match="reserved diagnostic seed"):
            nuts._validate_reference_seeds(
                settings,
                (reserved_seed, safe_chain),
                safe_ppc,
            )
        with pytest.raises(ValueError, match="reserved diagnostic seed"):
            nuts._validate_reference_seeds(
                settings,
                (safe_chain, safe_chain + 1),
                reserved_seed,
            )


def test_noncentered_sampler_has_no_non_geometry_route():
    class EqualityForgedToken:
        def __eq__(self, _other):
            return True

    with pytest.raises(
        nuts.TrajectoryNutsError, match="runner-owned token"
    ):
        nuts._sample_vbd_trajectory_nuts_idata(
            _prepared_stub(6),
            settings=nuts.vbd_nuts_execution_settings("smoke"),
            chain_seeds=(2_055_900_010, 2_055_900_011),
            _sampling_token=EqualityForgedToken(),
        )

    with pytest.raises(
        nuts.TrajectoryNutsError,
        match="noncentered NUTS sampling requires the exact geometry wrapper",
    ):
        nuts._sample_vbd_trajectory_nuts_idata(
            _prepared_stub(6),
            settings=nuts.vbd_nuts_execution_settings("smoke"),
            chain_seeds=(2_055_900_010, 2_055_900_011),
            _sampling_token=nuts._VBD_TRAJECTORY_REFERENCE_FIT_SAMPLING_TOKEN,
            group_effect_arm="noncentered",
        )

    with pytest.raises(
        nuts.TrajectoryNutsError,
        match="runner-owned token",
    ):
        nuts._sample_vbd_trajectory_nuts_idata(
            _prepared_stub(6),
            settings=nuts.vbd_nuts_execution_settings("full"),
            chain_seeds=(
                2_055_900_930,
                2_055_900_931,
                2_055_900_932,
                2_055_900_933,
            ),
            _sampling_token=(
                nuts._VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SAMPLING_TOKEN
            ),
            group_effect_arm="noncentered",
        )

    binding = nuts.build_vbd_trajectory_nuts_group_effect_geometry_binding(
        case_ordinal=0,
        arm="noncentered",
        lane="frequency",
        lane_ordinal=0,
        plan_hash=_PLAN_HASH,
    )
    with pytest.raises(
        nuts.TrajectoryNutsError,
        match="requires its exact runner binding",
    ):
        nuts._sample_vbd_trajectory_group_effect_geometry_idata(
            object(),
            object(),
            binding=binding,
            _runner_token=object(),
        )
    with pytest.raises(TypeError, match="exact prepared input"):
        nuts._sample_vbd_trajectory_group_effect_geometry_idata(
            object(),
            object(),
            binding=binding,
            _runner_token=(
                nuts._VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SAMPLING_TOKEN
            ),
        )
