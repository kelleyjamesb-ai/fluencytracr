"""Frozen V2 identities and consumed-V1 tombstones for marginalization."""

from __future__ import annotations

from dataclasses import dataclass


VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_DIAGNOSTIC_ID = (
    "vbd_group_effect_marginalization_diagnostic_v1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_PLAN_REF = (
    "plan:vbd-group-effect-marginalization-diagnostic-v1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_SEED_NAMESPACE = (
    "group_effect_marginalization_diagnostic_nonacceptance"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_AUTHORIZATION_SCOPE = (
    "vbd_group_effect_marginalization_diagnostic_v1_nonacceptance_one_launch"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_WORKSPACE_PATH = (
    "/Users/james.kelley/.codex/evidence/"
    "vbd-group-effect-marginalization-diagnostic-v1-workspace"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_LIFECYCLE_ROOT_PATH = (
    "/Users/james.kelley/.codex/evidence/"
    "vbd-group-effect-marginalization-diagnostic-v1-lifecycle"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_AUTHORIZATION_COMMIT = (
    "9e4010e2520f30f78ba40e0248e13dc546f2d346"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_AUTHORIZATION_MANIFEST_HASH = (
    "bb50439dd69f0546a4e24a0bd16f351fb70d286df07024449c28a63a2053fbe1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_EXECUTION_AUTHORIZATION_HASH = (
    "3ee0fd4305169f3533b86c56641508a33e064517e2fbf520ca038b9dfc71af4b"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_PERMIT_HASH = (
    "d84faa9e55c5273fcf2690ebaa1739d6eb6cfc57c4eb8498c662ab9e1ecaa1a6"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_CLAIM_HASH = (
    "b4d9f84d38deb7059dab5e209e42db9671e60a6c7b9d292328e2b682c3ac7fc9"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_COMMAND_HASH = (
    "5a8e011f00d7196fb8dff1c73caada9b4f9225c304317a177b166cb11f04023e"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_GENERATOR_SEEDS = tuple(
    range(2_055_901_000, 2_055_901_004)
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_CHAIN_SEEDS = tuple(
    range(2_055_901_100, 2_055_901_148)
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_RESERVED_SEEDS = frozenset(
    (
        *VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_GENERATOR_SEEDS,
        *VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_CHAIN_SEEDS,
    )
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_TOMBSTONED_ROOTS = frozenset(
    (
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_WORKSPACE_PATH,
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_LIFECYCLE_ROOT_PATH,
    )
)

VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID = (
    "vbd_group_effect_marginalization_diagnostic_v2"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_2026_07_V2"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_PLAN_2026_07_V2"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_SEEDS_2026_07_V2"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON = (
    "group_effect_marginalization_diagnostic_nonacceptance"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE = "HOLD"
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF = (
    "plan:vbd-group-effect-marginalization-diagnostic-v2"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE = (
    "group_effect_marginalization_diagnostic_v2_nonacceptance"
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
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEED_BASE = 2_055_901_300
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_STRIDE = 12
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_STRIDE = 4
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH = (
    "/Users/james.kelley/.codex/evidence/"
    "vbd-group-effect-marginalization-diagnostic-v2-workspace"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH = (
    "/Users/james.kelley/.codex/evidence/"
    "vbd-group-effect-marginalization-diagnostic-v2-lifecycle"
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
        generator_seed=2_055_901_200 + case_ordinal,
        scenario_id=(
            "development_smoke_scenario_"
            f"vbd_group_effect_marginalization_diagnostic_v2_case_{case_ordinal}"
        ),
    )
    for case_ordinal, (effect_size_sd, panel_group_count) in enumerate(
        ((0.0, 6), (0.0, 12), (0.5, 6), (0.5, 12))
    )
)


def vbd_trajectory_group_effect_marginalization_chain_seeds(
    *, case_ordinal: int, lane_ordinal: int
) -> tuple[int, int, int, int]:
    """Return the exact four-chain tuple for one ordered V2 case/lane fit."""

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
VBD_TRAJECTORY_ALL_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS = frozenset(
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_RESERVED_SEEDS
    | VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS
)


def _vbd_trajectory_group_effect_marginalization_case_body(
    case_ordinal: int,
) -> dict:
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


_VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_BODY_SNAPSHOTS = tuple(
    tuple(
        (
            key,
            tuple(value) if type(value) is list else value,
        )
        for key, value in _vbd_trajectory_group_effect_marginalization_case_body(
            case_ordinal
        ).items()
    )
    for case_ordinal in range(len(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES))
)


def _exact_native_equal(left: object, right: object) -> bool:
    if type(left) is not type(right):
        return False
    if type(left) is dict:
        return (
            all(type(key) is str for key in left)
            and all(type(key) is str for key in right)
            and set(left) == set(right)
            and all(_exact_native_equal(left[key], right[key]) for key in left)
        )
    if type(left) in (list, tuple):
        return len(left) == len(right) and all(
            _exact_native_equal(left_item, right_item)
            for left_item, right_item in zip(left, right, strict=True)
        )
    return left == right


def validate_vbd_trajectory_group_effect_marginalization_case_body(
    value: object,
    *,
    case_ordinal: int,
) -> dict:
    """Require every V2 case-body key, native type, and value exactly."""

    if type(case_ordinal) is not int or not 0 <= case_ordinal < len(
        _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_BODY_SNAPSHOTS
    ):
        raise ValueError("marginalization diagnostic case ordinal is invalid")
    expected = {
        key: list(item) if key in ("lane_order", "direction_vector") else item
        for key, item in (
            _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_BODY_SNAPSHOTS[
                case_ordinal
            ]
        )
    }
    if not _exact_native_equal(value, expected):
        raise ValueError("marginalization diagnostic case body is not exact V2")
    return value


def vbd_trajectory_group_effect_marginalization_case_body(
    case_ordinal: int,
) -> dict:
    """Return one exact V2 diagnostic-only case identity without generating data."""

    if type(case_ordinal) is not int or not 0 <= case_ordinal < len(
        _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_BODY_SNAPSHOTS
    ):
        raise ValueError("marginalization diagnostic case ordinal is invalid")
    return {
        key: list(item) if key in ("lane_order", "direction_vector") else item
        for key, item in (
            _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASE_BODY_SNAPSHOTS[
                case_ordinal
            ]
        )
    }


if (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS
    != tuple(range(2_055_901_200, 2_055_901_204))
    or VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS
    != tuple(range(2_055_901_300, 2_055_901_348))
    or len(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS) != 52
    or len(VBD_TRAJECTORY_ALL_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS) != 104
    or VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_V1_RESERVED_SEEDS
    & VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS
):
    raise RuntimeError("frozen group-effect marginalization V1/V2 seeds drifted")
