"""Frozen identities for the non-evidentiary group-effect marginalization diagnostic."""

from __future__ import annotations

from dataclasses import dataclass


VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID = (
    "vbd_group_effect_marginalization_diagnostic_v1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_PLAN_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_SEEDS_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON = (
    "group_effect_marginalization_diagnostic_nonacceptance"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE = "HOLD"
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF = (
    "plan:vbd-group-effect-marginalization-diagnostic-v1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE = (
    "group_effect_marginalization_diagnostic_nonacceptance"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER = (
    "frequency",
    "engagement",
    "breadth",
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER = (
    "alpha",
    "beta",
    "sigma_u",
    "sigma_r",
    "rho",
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER = (
    "conditional_mean",
    "interval_80_lower_endpoint_influence",
    "interval_80_upper_endpoint_influence",
    "interval_99_lower_endpoint_influence",
    "interval_99_upper_endpoint_influence",
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AGGREGATE_K = 16
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_COUNT = 4
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEED_BASE = 2_055_901_100
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_STRIDE = 12
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_STRIDE = 4
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH = (
    "/Users/james.kelley/.codex/evidence/"
    "vbd-group-effect-marginalization-diagnostic-v1-workspace"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH = (
    "/Users/james.kelley/.codex/evidence/"
    "vbd-group-effect-marginalization-diagnostic-v1-lifecycle"
)


@dataclass(frozen=True)
class VbdTrajectoryGroupEffectMarginalizationCaseSpec:
    case_ordinal: int
    effect_size_sd: float
    panel_group_count: int
    aggregate_k: int
    generator_seed: int
    scenario_id: str


VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES = tuple(
    VbdTrajectoryGroupEffectMarginalizationCaseSpec(
        case_ordinal=case_ordinal,
        effect_size_sd=effect_size_sd,
        panel_group_count=panel_group_count,
        aggregate_k=VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AGGREGATE_K,
        generator_seed=2_055_901_000 + case_ordinal,
        scenario_id=(
            "development_smoke_scenario_"
            f"vbd_group_effect_marginalization_diagnostic_v1_case_{case_ordinal}"
        ),
    )
    for case_ordinal, (effect_size_sd, panel_group_count) in enumerate(
        ((0.0, 6), (0.0, 12), (0.5, 6), (0.5, 12))
    )
)


def vbd_trajectory_group_effect_marginalization_chain_seeds(
    *, case_ordinal: int, lane_ordinal: int
) -> tuple[int, int, int, int]:
    """Return the exact four-chain tuple for one ordered case/lane fit."""

    if type(case_ordinal) is not int or not 0 <= case_ordinal < len(
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
    ):
        raise ValueError("marginalization case ordinal is invalid")
    if type(lane_ordinal) is not int or not 0 <= lane_ordinal < len(
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER
    ):
        raise ValueError("marginalization lane ordinal is invalid")
    start = (
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEED_BASE
        + VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_STRIDE * case_ordinal
        + VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_STRIDE * lane_ordinal
    )
    return tuple(
        start + chain_index
        for chain_index in range(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_COUNT
        )
    )


VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS = tuple(
    case.generator_seed
    for case in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS = tuple(
    seed
    for case in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
    for lane_ordinal in range(
        len(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER)
    )
    for seed in vbd_trajectory_group_effect_marginalization_chain_seeds(
        case_ordinal=case.case_ordinal,
        lane_ordinal=lane_ordinal,
    )
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS = frozenset(
    (
        *VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS,
        *VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS,
    )
)


def vbd_trajectory_group_effect_marginalization_case_body(
    case_ordinal: int,
) -> dict:
    """Return one exact diagnostic-only case identity without generating data."""

    if type(case_ordinal) is not int or not 0 <= case_ordinal < len(
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
    ):
        raise ValueError("marginalization diagnostic case ordinal is invalid")
    case = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES[case_ordinal]
    if case.case_ordinal != case_ordinal:
        raise RuntimeError("marginalization diagnostic case order drifted")
    return {
        "diagnostic_id": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID,
        "plan_ref": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF,
        "seed_namespace": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE,
        "case_ordinal": case.case_ordinal,
        "effect_size_sd": case.effect_size_sd,
        "panel_group_count": case.panel_group_count,
        "aggregate_k": case.aggregate_k,
        "generator_seed": case.generator_seed,
        "scenario_id": case.scenario_id,
        "lane_order": list(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER),
        "direction_vector": [1, 1, 1],
        "acceptance_slot_key": None,
        "ppc_state": "NOT_RUN",
        "acceptance_concordance_state": "NOT_RUN",
        "state": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE,
        "hold_reason": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON,
        "acceptance_evidence_eligible": False,
        "acceptance_count_effect": 0,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
    }

if (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS
    != tuple(range(2_055_901_000, 2_055_901_004))
    or VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS
    != tuple(range(2_055_901_100, 2_055_901_148))
    or len(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS) != 52
):
    raise RuntimeError("frozen group-effect marginalization seeds drifted")
