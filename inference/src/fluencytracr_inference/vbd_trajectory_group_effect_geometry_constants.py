"""Frozen constants for the non-evidentiary VBD geometry diagnostic."""

from __future__ import annotations

from dataclasses import dataclass


VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID = (
    "vbd_group_effect_geometry_diagnostic_v1"
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_PLAN_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_PLAN_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SEED_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_SEEDS_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON = (
    "parameterization_geometry_diagnostic_nonacceptance"
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE = "HOLD"
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER = (
    "frequency",
    "engagement",
    "breadth",
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER = (
    "centered",
    "noncentered",
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_AGGREGATE_K = 16
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CHAIN_COUNT = 4
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASE_STRIDE = 12
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_STRIDE = 4
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEED_BASE = 2_055_900_930
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEED_BASE = 2_055_900_960


@dataclass(frozen=True)
class VbdTrajectoryGroupEffectGeometryCaseSpec:
    case_ordinal: int
    effect_size_sd: float
    panel_group_count: int
    aggregate_k: int
    generator_seed: int
    scenario_id: str


VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES = (
    VbdTrajectoryGroupEffectGeometryCaseSpec(
        case_ordinal=0,
        effect_size_sd=0.0,
        panel_group_count=6,
        aggregate_k=VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_AGGREGATE_K,
        generator_seed=2_055_900_920,
        scenario_id=(
            "development_smoke_scenario_"
            "vbd_group_effect_geometry_diagnostic_v1_case_0"
        ),
    ),
    VbdTrajectoryGroupEffectGeometryCaseSpec(
        case_ordinal=1,
        effect_size_sd=0.5,
        panel_group_count=12,
        aggregate_k=VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_AGGREGATE_K,
        generator_seed=2_055_900_921,
        scenario_id=(
            "development_smoke_scenario_"
            "vbd_group_effect_geometry_diagnostic_v1_case_1"
        ),
    ),
)


def vbd_trajectory_group_effect_geometry_chain_seeds(
    *,
    case_ordinal: int,
    lane_ordinal: int,
    arm: str,
) -> tuple[int, int, int, int]:
    """Return the exact four-chain seed tuple for one frozen paired fit."""

    if type(case_ordinal) is not int or not 0 <= case_ordinal < len(
        VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES
    ):
        raise ValueError("geometry case ordinal is invalid")
    if type(lane_ordinal) is not int or not 0 <= lane_ordinal < len(
        VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER
    ):
        raise ValueError("geometry lane ordinal is invalid")
    if arm not in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER:
        raise ValueError("geometry arm is invalid")
    base = (
        VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEED_BASE
        if arm == "centered"
        else VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEED_BASE
    )
    start = (
        base
        + VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASE_STRIDE * case_ordinal
        + VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_STRIDE * lane_ordinal
    )
    return tuple(
        start + chain_index
        for chain_index in range(
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CHAIN_COUNT
        )
    )


VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_GENERATOR_SEEDS = tuple(
    case.generator_seed for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEEDS = tuple(
    seed
    for case_ordinal in range(len(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES))
    for lane_ordinal in range(
        len(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER)
    )
    for seed in vbd_trajectory_group_effect_geometry_chain_seeds(
        case_ordinal=case_ordinal,
        lane_ordinal=lane_ordinal,
        arm="centered",
    )
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEEDS = tuple(
    seed
    for case_ordinal in range(len(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES))
    for lane_ordinal in range(
        len(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER)
    )
    for seed in vbd_trajectory_group_effect_geometry_chain_seeds(
        case_ordinal=case_ordinal,
        lane_ordinal=lane_ordinal,
        arm="noncentered",
    )
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS = frozenset(
    (
        *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_GENERATOR_SEEDS,
        *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEEDS,
        *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEEDS,
    )
)


if (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEEDS
    != tuple(range(2_055_900_930, 2_055_900_954))
    or VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEEDS
    != tuple(range(2_055_900_960, 2_055_900_984))
    or len(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS) != 50
):
    raise RuntimeError("frozen VBD geometry diagnostic seeds drifted")
