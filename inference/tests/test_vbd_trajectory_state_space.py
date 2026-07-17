from dataclasses import replace
import math

import numpy as np
import pytest
from scipy.linalg import block_diag

import fluencytracr_inference.vbd_trajectory_state_space as state_space
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_preparation import (
    VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD,
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    VBD_TRAJECTORY_OUTER_POINT_COUNT,
    TrajectoryIntegrationError,
    TrajectoryIntegrationDiagnostics,
    _build_outer_weight_retention_record,
    _conditional_gaussian,
    _normalize_outer_log_weights,
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
            generated_point_count=0,
            finite_log_weight_count=0,
            retained_weight_count=0,
            retained_sobol_ordinal_commitment="0" * 64,
            excluded_sobol_ordinal_commitment="0" * 64,
            outer_weight_retention_hash="0" * 64,
            effective_sample_size=math.nan,
            max_normalized_weight=math.nan,
            mode_transformed=(math.nan, 0.0, 0.0),
            negative_log_posterior_at_mode=math.nan,
            hessian_condition_number=math.nan,
            minimum_conditional_movement_variance=math.nan,
            maximum_conditional_movement_variance=math.nan,
            movement_component_count=0,
        )


def test_binary64_outer_weight_retention_excludes_only_underflowed_candidates():
    weights, retained, record = _normalize_outer_log_weights(
        [0.0, -744.0, -746.0], [3, 7, 11]
    )

    assert retained.tolist() == [True, True, False]
    assert [value.hex() for value in weights] == [
        "0x1.0000000000000p+0",
        "0x0.0000000000002p-1022",
    ]
    assert float(np.sum(weights, dtype=np.float64)) == 1.0
    assert record == {
        "excluded_sobol_ordinal_commitment": (
            "f0afaa7d423acad709b7683861155dd60a5bdb16f97c85051bc60ffb71ddfbd0"
        ),
        "finite_log_weight_count": 3,
        "generated_point_count": 8192,
        "retained_sobol_ordinal_commitment": (
            "8decf9fb1f6750f7a927a835dbf34dd7fedd7b0f69131e5abbf8ec258f9be74d"
        ),
        "retained_weight_count": 2,
        "outer_weight_retention_hash": (
            "677a2f639b762cc1317f1ba4a60536bc9557e5db54a1b38e8349882d20017f60"
        ),
    }


@pytest.mark.parametrize(
    ("log_weights", "ordinals"),
    [
        ([], []),
        ([math.nan], [0]),
        ([math.inf], [0]),
        ([-math.inf], [0]),
        ([0.0], []),
        ([0.0, -1.0], [0, 0]),
        ([0.0, -1.0], [1, 0]),
        ([0.0], [-1]),
        ([0.0], [8192]),
    ],
)
def test_outer_weight_normalization_rejects_malformed_finite_support(
    log_weights, ordinals
):
    with pytest.raises(TrajectoryIntegrationError):
        _normalize_outer_log_weights(log_weights, ordinals)


def test_binary64_retention_binding_cannot_be_changed_independently():
    record = _build_outer_weight_retention_record(
        finite_log_weight_count=8192,
        retained_ordinals=tuple(range(8192)),
    )
    record["retained_weight_count"] = 8191

    with pytest.raises(TrajectoryIntegrationError, match="retention binding"):
        TrajectoryIntegrationDiagnostics(
            **record,
            effective_sample_size=1000.0,
            max_normalized_weight=0.001,
            mode_transformed=(0.0, 0.0, 0.0),
            negative_log_posterior_at_mode=1.0,
            hessian_condition_number=2.0,
            minimum_conditional_movement_variance=0.1,
            maximum_conditional_movement_variance=0.2,
            movement_component_count=8191,
        )


def test_binary64_retention_rejects_equal_partition_commitments_after_rehash():
    record = _build_outer_weight_retention_record(
        finite_log_weight_count=8192,
        retained_ordinals=tuple(range(8192)),
    )
    record["excluded_sobol_ordinal_commitment"] = record[
        "retained_sobol_ordinal_commitment"
    ]
    retention_body = {
        "algorithm": "binary64_representable_normalized_weight_retention_v1",
        **{
            key: value
            for key, value in record.items()
            if key != "outer_weight_retention_hash"
        },
    }
    record["outer_weight_retention_hash"] = sha256_json(retention_body)

    with pytest.raises(TrajectoryIntegrationError, match="must be distinct"):
        TrajectoryIntegrationDiagnostics(
            **record,
            effective_sample_size=1000.0,
            max_normalized_weight=0.001,
            mode_transformed=(0.0, 0.0, 0.0),
            negative_log_posterior_at_mode=1.0,
            hessian_condition_number=2.0,
            minimum_conditional_movement_variance=0.1,
            maximum_conditional_movement_variance=0.2,
            movement_component_count=8192,
        )


def test_ess_count_consistency_keeps_only_the_compiled_binary64_allowance():
    record = _build_outer_weight_retention_record(
        finite_log_weight_count=4097,
        retained_ordinals=tuple(range(4097)),
    )
    diagnostics = TrajectoryIntegrationDiagnostics(
        **record,
        effective_sample_size=4097.000000000002,
        max_normalized_weight=1.0 / 4097.0,
        mode_transformed=(0.0, 0.0, 0.0),
        negative_log_posterior_at_mode=1.0,
        hessian_condition_number=2.0,
        minimum_conditional_movement_variance=0.1,
        maximum_conditional_movement_variance=0.2,
        movement_component_count=4097,
    )

    assert diagnostics.to_dict()["compiled_ess_count_rounding_allowance"] == 1e-9
    with pytest.raises(TrajectoryIntegrationError, match="ESS"):
        replace(diagnostics, effective_sample_size=4097.000000002)


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
    retention_oracles = {
        "frequency": (
            8191,
            "9ac75113e6456398559c2120ba3ee0278e80b6a15e4af043a25c40627520079c",
            "fa06758bdec9a710e5cb88426308e6b5a06327235c85841cb75fdcc48f9492da",
            "34f67f48d6a04a0f8d0cc45b499fac5a669d957f450266943bf4236b23edd6e8",
            "0x1.867d53c2a39f4p+12",
            "0x1.6aa2fc4e5ad18p-10",
        ),
        "engagement": (
            8191,
            "9ac75113e6456398559c2120ba3ee0278e80b6a15e4af043a25c40627520079c",
            "fa06758bdec9a710e5cb88426308e6b5a06327235c85841cb75fdcc48f9492da",
            "34f67f48d6a04a0f8d0cc45b499fac5a669d957f450266943bf4236b23edd6e8",
            "0x1.39db1d5377d06p+11",
            "0x1.fe9eac9b40627p-8",
        ),
        "breadth": (
            8189,
            "4372522f67b8abee08fc23fff6d168c75f7cba40831880d9bac442ffba0568f7",
            "3e017d449fd39897f2db257a8a7c26b889b1f1256591983c5ca9cd331be0ab12",
            "a2a420c33995d76e4b2c7e391823498dcaa39f24f686270999d24443c1de2d8c",
            "0x1.7af4570bd8b5ap+11",
            "0x1.7bd438b54177bp-8",
        ),
    }
    summary_oracles = {
        "frequency": (
            "0x1.321dbbd710a96p-1",
            "0x1.6fbdd5a593eeap-4",
            "0x1.ee6650889d16bp-2",
            "0x1.6d0351eb5d352p-1",
            "0x1.77381196aa8ebp-2",
            "0x1.a874b8719a0c5p-1",
        ),
        "engagement": (
            "0x1.ca57be00f6611p-2",
            "0x1.46e0e3306a8bfp-4",
            "0x1.6197274b8e900p-2",
            "0x1.19848a3d5cfd1p-1",
            "0x1.ef1f83a2d26a3p-3",
            "0x1.4e4e2b679451dp-1",
        ),
        "breadth": (
            "0x1.4386b175847e0p-1",
            "0x1.e95c888f58606p-4",
            "0x1.ea4819119c764p-2",
            "0x1.91eb530c4eec4p-1",
            "0x1.4bf45ba7706e8p-2",
            "0x1.e124aabdfe9cfp-1",
        ),
    }
    (
        expected_retained,
        expected_retained_commitment,
        expected_excluded_commitment,
        expected_retention_hash,
        expected_ess,
        expected_max_weight,
    ) = retention_oracles[lane]

    assert fit.lane == lane
    assert fit.engine_kind == "deterministic_gaussian_state_space_integration"
    assert diagnostics["status"] == "PASS"
    assert diagnostics["generated_point_count"] == VBD_TRAJECTORY_OUTER_POINT_COUNT
    assert 4096 <= diagnostics["retained_weight_count"] <= (
        diagnostics["finite_log_weight_count"]
    ) <= (
        VBD_TRAJECTORY_OUTER_POINT_COUNT
    )
    assert diagnostics["finite_log_weight_count"] == 8192
    assert diagnostics["retained_weight_count"] == expected_retained
    assert (
        diagnostics["retained_sobol_ordinal_commitment"]
        == expected_retained_commitment
    )
    assert (
        diagnostics["excluded_sobol_ordinal_commitment"]
        == expected_excluded_commitment
    )
    assert diagnostics["outer_weight_retention_hash"] == expected_retention_hash
    assert float(diagnostics["effective_sample_size"]).hex() == expected_ess
    assert float(diagnostics["max_normalized_weight"]).hex() == expected_max_weight
    summary = fit.movement_summary
    assert (
        summary.posterior_mean.hex(),
        summary.posterior_sd.hex(),
        summary.interval_80_lower.hex(),
        summary.interval_80_upper.hex(),
        summary.interval_99_lower.hex(),
        summary.interval_99_upper.hex(),
    ) == summary_oracles[lane]
    retention_body = {
        "algorithm": "binary64_representable_normalized_weight_retention_v1",
        "excluded_sobol_ordinal_commitment": diagnostics[
            "excluded_sobol_ordinal_commitment"
        ],
        "finite_log_weight_count": diagnostics["finite_log_weight_count"],
        "generated_point_count": diagnostics["generated_point_count"],
        "retained_sobol_ordinal_commitment": diagnostics[
            "retained_sobol_ordinal_commitment"
        ],
        "retained_weight_count": diagnostics["retained_weight_count"],
    }
    assert diagnostics["outer_weight_retention_hash"] == sha256_json(
        retention_body
    )
    assert diagnostics["conditional_movement_mixture"] == {
        "algorithm": "conditional_normal_mixture_quantile_v2",
        "component_count": diagnostics["retained_weight_count"],
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
