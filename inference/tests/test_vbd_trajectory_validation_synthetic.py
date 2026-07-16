from dataclasses import replace

import numpy as np
import pytest

import fluencytracr_inference.vbd_trajectory_synthetic as synthetic
from fluencytracr_inference.vbd_trajectory_preparation import (
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN,
    VbdSyntheticRunnerError,
    generate_vbd_trajectory_scenario_smoke_case,
    generate_vbd_trajectory_smoke_case,
    generate_vbd_trajectory_validation_case,
)
from fluencytracr_inference.vbd_trajectory_types import (
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_SMOKE_SEED_MAX,
    VBD_TRAJECTORY_SMOKE_SEED_MIN,
    validate_trajectory_panel,
)
from fluencytracr_inference.vbd_trajectory_validation_plan import (
    required_vbd_trajectory_validation_slots,
)


def _terminal_truth(case):
    latent = case.truth.transformed_latent_paths
    return (
        latent[:, 15:18, :].mean(axis=(0, 1))
        - latent[:, :12, :].mean(axis=(0, 1))
    )


def test_original_smoke_interface_and_hash_remain_unchanged():
    case = generate_vbd_trajectory_smoke_case()
    assert case.panel.ordered_panel_manifest_root == (
        "16225b6431b12ae9b33be902c19989c6fb47cdd2df29bb6b6c9eea10e38318a5"
    )
    validate_trajectory_panel(case.panel)


@pytest.mark.parametrize(
    "scenario,expected_truth,expected_direction",
    [
        ("frequency_only", (0.5, 0.0, 0.0), (1, 1, 1)),
        ("engagement_only", (0.0, 0.5, 0.0), (1, 1, 1)),
        ("breadth_only", (0.0, 0.0, 0.5), (1, 1, 1)),
        ("correlated_null", (0.0, 0.0, 0.0), (1, 1, 1)),
        ("composition_rotation", (0.5, -0.5, 0.0), (1, -1, 1)),
    ],
)
def test_targeted_mechanics_realize_exact_truth_only_in_smoke_namespace(
    scenario, expected_truth, expected_direction
):
    case = generate_vbd_trajectory_scenario_smoke_case(scenario)
    assert VBD_TRAJECTORY_SMOKE_SEED_MIN <= case.panel.seed <= (
        VBD_TRAJECTORY_SMOKE_SEED_MAX
    )
    assert case.panel.seed_namespace == "development_smoke_nonacceptance"
    assert case.panel.direction_vector == expected_direction
    assert np.allclose(_terminal_truth(case), expected_truth, rtol=0.0, atol=1e-12)
    validate_trajectory_panel(case.panel)


def test_temporary_pulse_has_zero_terminal_truth_after_first_three_post_windows():
    case = generate_vbd_trajectory_scenario_smoke_case("temporary_pulse")
    assert case.truth.post_pattern == VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN
    assert np.allclose(_terminal_truth(case), (0.0, 0.0, 0.0), atol=1e-12)
    adjustments = synthetic._post_adjustments(
        base_terminal=np.asarray((0.1, -0.2, 0.3)),
        terminal_truth=(0.0, 0.0, 0.0),
        post_pattern=VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN,
    )
    assert np.allclose(
        adjustments[:3] - adjustments[3:], 0.5, rtol=0.0, atol=1e-15
    )


def test_common_availability_shock_is_applied_to_all_post_windows_and_lanes():
    shocked = generate_vbd_trajectory_scenario_smoke_case(
        "common_availability_shock"
    )
    counterfactual = generate_vbd_trajectory_scenario_smoke_case(
        "depth_context_perturbation", seed=shocked.panel.seed
    )
    assert shocked.truth.shock_kind == "common_availability"
    assert shocked.truth.structural_terminal_truth == (0.0, 0.0, 0.0)
    assert shocked.truth.common_shock_terminal_shift == (0.5, 0.5, 0.5)
    delta = (
        shocked.truth.transformed_latent_paths
        - counterfactual.truth.transformed_latent_paths
    )
    assert np.array_equal(delta[:, :12, :], np.zeros_like(delta[:, :12, :]))
    assert np.allclose(delta[:, 12:, :], 0.5, rtol=0.0, atol=1e-15)


def test_depth_perturbation_cannot_change_prepared_numerical_inputs():
    context_a = generate_vbd_trajectory_scenario_smoke_case(
        "depth_context_perturbation", depth_context_ref="depth-context:a"
    )
    context_b = generate_vbd_trajectory_scenario_smoke_case(
        "depth_context_perturbation", depth_context_ref="depth-context:b"
    )
    assert context_a.panel.depth_context_root != context_b.panel.depth_context_root
    for lane in VBD_TRAJECTORY_LANES:
        left = prepare_vbd_trajectory_lane(context_a.panel, lane)
        right = prepare_vbd_trajectory_lane(context_b.panel, lane)
        assert left.model_input_hash == right.model_input_hash
        assert left.prepared_input_hash == right.prepared_input_hash
        assert np.array_equal(left.y, right.y)
        assert np.array_equal(left.known_se, right.known_se)


def test_understated_uncertainty_reports_half_se_and_quarter_covariance():
    case = generate_vbd_trajectory_scenario_smoke_case(
        "understated_uncertainty"
    )
    true_covariance = np.asarray(
        case.truth.true_raw_transformed_covariance, dtype=float
    )
    reported = np.asarray(case.panel.bundles[0].transformed_covariance, dtype=float)
    assert np.allclose(reported, 0.25 * true_covariance, rtol=0.0, atol=1e-15)
    reported_se = np.asarray(
        [
            observation.transformed_standard_error
            for observation in case.panel.bundles[0].observations
        ]
    )
    assert np.allclose(
        reported_se,
        0.5 * np.sqrt(np.diag(true_covariance)),
        rtol=0.0,
        atol=1e-15,
    )


def test_acceptance_generation_rejects_before_rng_without_runner_token(monkeypatch):
    slot = required_vbd_trajectory_validation_slots()[0]
    called = False

    def forbidden_rng(**_kwargs):
        nonlocal called
        called = True
        raise AssertionError("acceptance RNG must not run in pre-freeze tests")

    monkeypatch.setattr(synthetic, "_generate_base_paths", forbidden_rng)
    with pytest.raises(VbdSyntheticRunnerError, match="admitted child capability"):
        generate_vbd_trajectory_validation_case(slot)
    assert called is False


def test_acceptance_generation_context_rejects_a_self_asserted_hash():
    with pytest.raises(VbdSyntheticRunnerError, match="capability is invalid"):
        with synthetic._validation_generation_context(
            capability_hash="1" * 64,
            capability_token_hash="2" * 64,
            launch_receipt_hash="3" * 64,
            _runner_token=object(),
        ):
            pass


def test_acceptance_generation_rejects_noncanonical_slot_before_rng(monkeypatch):
    slot = required_vbd_trajectory_validation_slots()[0]
    called = False

    def forbidden_rng(**_kwargs):
        nonlocal called
        called = True
        raise AssertionError("acceptance RNG must not run for a forged slot")

    monkeypatch.setattr(synthetic, "_generate_base_paths", forbidden_rng)
    with pytest.raises(ValueError, match="exact slot type"):
        synthetic._validation_generation_spec(object())
    assert called is False
    with pytest.raises(ValueError):
        replace(slot, seed=slot.seed + 1)


@pytest.mark.parametrize(
    "seed",
    [VBD_TRAJECTORY_SMOKE_SEED_MIN - 1, VBD_TRAJECTORY_SMOKE_SEED_MAX + 1],
)
def test_scenario_helper_rejects_non_smoke_seed_before_generation(seed, monkeypatch):
    called = False

    def forbidden_rng(**_kwargs):
        nonlocal called
        called = True
        raise AssertionError("non-smoke RNG must not run")

    monkeypatch.setattr(synthetic, "_generate_base_paths", forbidden_rng)
    with pytest.raises(ValueError, match="smoke"):
        generate_vbd_trajectory_scenario_smoke_case("frequency_only", seed=seed)
    assert called is False
