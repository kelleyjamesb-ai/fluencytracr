import pytest

import fluencytracr_inference.vbd_trajectory_synthetic as synthetic
from fluencytracr_inference.vbd_trajectory_group_effect_geometry_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_GENERATOR_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE,
    vbd_trajectory_group_effect_geometry_chain_seeds,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_ALL_PRECISION_DIAGNOSTIC_RESERVED_SEEDS,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    VbdSyntheticRunnerError,
    generate_vbd_trajectory_group_effect_geometry_diagnostic_case,
    generate_vbd_trajectory_scenario_smoke_case,
    generate_vbd_trajectory_smoke_case,
    vbd_trajectory_group_effect_geometry_diagnostic_case_body,
)
from fluencytracr_inference.vbd_trajectory_types import (
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_SMOKE_SEED_MAX,
    VBD_TRAJECTORY_SMOKE_SEED_MIN,
)


def test_geometry_identity_cases_lanes_arms_and_hold_are_exact():
    assert (
        VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID
        == "vbd_group_effect_geometry_diagnostic_v1"
    )
    assert VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER == VBD_TRAJECTORY_LANES
    assert VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER == (
        "centered",
        "noncentered",
    )
    assert [
        (
            case.case_ordinal,
            case.effect_size_sd,
            case.panel_group_count,
            case.aggregate_k,
            case.generator_seed,
        )
        for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES
    ] == [
        (0, 0.0, 6, 16, 2_055_900_920),
        (1, 0.5, 12, 16, 2_055_900_921),
    ]

    for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES:
        body = vbd_trajectory_group_effect_geometry_diagnostic_case_body(
            case.case_ordinal
        )
        assert set(body) == {
            "diagnostic_id",
            "case_ordinal",
            "effect_size_sd",
            "panel_group_count",
            "aggregate_k",
            "generator_seed",
            "scenario_id",
            "lane_order",
            "arm_order",
            "direction_vector",
            "seed_namespace",
            "acceptance_slot_key",
            "ppc_state",
            "acceptance_concordance_state",
            "state",
            "hold_reason",
            "acceptance_evidence_eligible",
            "acceptance_count_effect",
            "internal_only",
            "synthetic_only",
            "aggregate_only",
            "customer_output_authorized",
        }
        assert body["diagnostic_id"] == (
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID
        )
        assert body["lane_order"] == list(VBD_TRAJECTORY_LANES)
        assert body["arm_order"] == ["centered", "noncentered"]
        assert body["state"] == VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE == "HOLD"
        assert body["hold_reason"] == (
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON
        )
        assert body["ppc_state"] == "NOT_RUN"
        assert body["acceptance_concordance_state"] == "NOT_RUN"
        assert body["acceptance_slot_key"] is None
        assert body["acceptance_evidence_eligible"] is False
        assert body["acceptance_count_effect"] == 0
        assert body["internal_only"] is True
        assert body["synthetic_only"] is True
        assert body["aggregate_only"] is True
        assert body["customer_output_authorized"] is False


def test_geometry_seed_formulas_reserve_exactly_50_disjoint_seeds():
    centered = []
    noncentered = []
    for case_ordinal in range(2):
        for lane_ordinal in range(3):
            expected_centered = tuple(
                2_055_900_930
                + 12 * case_ordinal
                + 4 * lane_ordinal
                + chain_index
                for chain_index in range(4)
            )
            expected_noncentered = tuple(
                2_055_900_960
                + 12 * case_ordinal
                + 4 * lane_ordinal
                + chain_index
                for chain_index in range(4)
            )
            assert vbd_trajectory_group_effect_geometry_chain_seeds(
                case_ordinal=case_ordinal,
                lane_ordinal=lane_ordinal,
                arm="centered",
            ) == expected_centered
            assert vbd_trajectory_group_effect_geometry_chain_seeds(
                case_ordinal=case_ordinal,
                lane_ordinal=lane_ordinal,
                arm="noncentered",
            ) == expected_noncentered
            centered.extend(expected_centered)
            noncentered.extend(expected_noncentered)

    assert VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_GENERATOR_SEEDS == (
        2_055_900_920,
        2_055_900_921,
    )
    assert VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEEDS == tuple(
        centered
    )
    assert VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEEDS == tuple(
        noncentered
    )
    assert centered == list(range(2_055_900_930, 2_055_900_954))
    assert noncentered == list(range(2_055_900_960, 2_055_900_984))
    assert VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS == frozenset(
        (
            *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_GENERATOR_SEEDS,
            *centered,
            *noncentered,
        )
    )
    assert len(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS) == 50
    assert VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS.isdisjoint(
        VBD_TRAJECTORY_ALL_PRECISION_DIAGNOSTIC_RESERVED_SEEDS
    )
    assert all(
        VBD_TRAJECTORY_SMOKE_SEED_MIN <= seed <= VBD_TRAJECTORY_SMOKE_SEED_MAX
        for seed in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS
    )


@pytest.mark.parametrize(
    ("case_ordinal", "lane_ordinal", "arm"),
    [
        (-1, 0, "centered"),
        (2, 0, "centered"),
        (True, 0, "centered"),
        (0, -1, "centered"),
        (0, 3, "centered"),
        (0, True, "centered"),
        (0, 0, "other"),
    ],
)
def test_geometry_seed_formula_rejects_off_plan_coordinates(
    case_ordinal, lane_ordinal, arm
):
    with pytest.raises(ValueError):
        vbd_trajectory_group_effect_geometry_chain_seeds(
            case_ordinal=case_ordinal,
            lane_ordinal=lane_ordinal,
            arm=arm,
        )


def test_geometry_case_body_rejects_off_plan_ordinals():
    for value in (-1, 2, True, 0.0, "0"):
        with pytest.raises(ValueError):
            vbd_trajectory_group_effect_geometry_diagnostic_case_body(value)


def test_geometry_generation_requires_private_token_before_generator(
    monkeypatch,
):
    reached_generator = False

    def fail_if_reached(*_args, **_kwargs):
        nonlocal reached_generator
        reached_generator = True
        raise AssertionError("geometry generator must not execute")

    monkeypatch.setattr(
        synthetic,
        "_generate_vbd_trajectory_case",
        fail_if_reached,
    )
    for case_ordinal in range(2):
        with pytest.raises(VbdSyntheticRunnerError, match="runner token"):
            generate_vbd_trajectory_group_effect_geometry_diagnostic_case(
                case_ordinal,
                _runner_token=object(),
            )
    assert reached_generator is False


def test_all_geometry_seeds_reject_from_generic_smoke_before_generation(
    monkeypatch,
):
    reached_generator = False

    def fail_if_reached(*_args, **_kwargs):
        nonlocal reached_generator
        reached_generator = True
        raise AssertionError("generic generator must not execute")

    monkeypatch.setattr(synthetic, "validate_vbd_trajectory_runtime", lambda: None)
    monkeypatch.setattr(synthetic.np.random, "default_rng", fail_if_reached)
    monkeypatch.setattr(
        synthetic,
        "_generate_vbd_trajectory_case",
        fail_if_reached,
    )
    for seed in sorted(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS):
        with pytest.raises(ValueError, match="reserved diagnostic seed"):
            generate_vbd_trajectory_smoke_case(seed=seed)
        with pytest.raises(ValueError, match="reserved diagnostic seed"):
            generate_vbd_trajectory_scenario_smoke_case(
                "frequency_only",
                seed=seed,
            )
    assert reached_generator is False
