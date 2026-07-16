"""Immutable VBD trajectory concordance plan and cross-engine gates."""

from __future__ import annotations

from dataclasses import dataclass
import math

from .hashing import sha256_json
from .vbd_trajectory_statistics import TrajectoryPosteriorSummary
from .vbd_trajectory_types import (
    VBD_TRAJECTORY_CONCORDANCE_PLAN_REF,
    VBD_TRAJECTORY_LANES,
)


VBD_TRAJECTORY_CONCORDANCE_PLAN_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_PLAN_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_EFFECT_ORDER = (0.0, 0.2, 0.5)
VBD_TRAJECTORY_CONCORDANCE_GROUP_ORDER = (6, 12)
VBD_TRAJECTORY_CONCORDANCE_SEED_INDEXES = tuple(range(5))
VBD_TRAJECTORY_CONCORDANCE_BUNDLE_COUNT = 30
VBD_TRAJECTORY_CONCORDANCE_LANE_FIT_COUNT = 90
VBD_TRAJECTORY_CONCORDANCE_AGGREGATE_K = 16
VBD_TRAJECTORY_CONCORDANCE_BUNDLE_SEED_BASE = 2_056_500_000
VBD_TRAJECTORY_CONCORDANCE_CHAIN_SEED_BASE = 2_056_520_000
VBD_TRAJECTORY_CONCORDANCE_PPC_SEED_BASE = 2_106_500_000
VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD = 0.15
VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD = 0.20
VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD = 0.20
VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN = 0.85
VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX = 1.15


class VbdTrajectoryConcordanceError(ValueError):
    """A concordance plan, record, or numerical gate is malformed."""


def _effect_token(effect: float) -> str:
    return str(effect).replace(".", "p")


@dataclass(frozen=True, slots=True)
class VbdTrajectoryConcordanceBundle:
    effect_size_sd: float
    panel_group_count: int
    seed_index: int
    cell_ordinal: int
    bundle_seed: int
    bundle_id: str
    bundle_hash: str

    def body_without_hash(self) -> dict:
        lane_seeds = []
        for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
            lane_seeds.append(
                {
                    "lane": lane,
                    "lane_ordinal": lane_ordinal,
                    "chain_seeds": list(
                        concordance_chain_seeds(
                            self.cell_ordinal, self.seed_index, lane_ordinal
                        )
                    ),
                    "ppc_seed": concordance_ppc_seed(
                        self.cell_ordinal, self.seed_index, lane_ordinal
                    ),
                }
            )
        return {
            "bundle_id": self.bundle_id,
            "effect_size_sd": float(self.effect_size_sd),
            "panel_group_count": self.panel_group_count,
            "aggregate_k": VBD_TRAJECTORY_CONCORDANCE_AGGREGATE_K,
            "seed_index": self.seed_index,
            "cell_ordinal": self.cell_ordinal,
            "bundle_seed": self.bundle_seed,
            "direction_vector": [1, 1, 1],
            "lane_seeds": lane_seeds,
            "internal_only": True,
            "synthetic_only": True,
            "customer_output_authorized": False,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "bundle_hash": self.bundle_hash}


def concordance_chain_seeds(
    cell_ordinal: int, seed_index: int, lane_ordinal: int
) -> tuple[int, int, int, int]:
    if type(cell_ordinal) is not int or not 0 <= cell_ordinal < 6:
        raise VbdTrajectoryConcordanceError("cell ordinal is off plan")
    if type(seed_index) is not int or seed_index not in VBD_TRAJECTORY_CONCORDANCE_SEED_INDEXES:
        raise VbdTrajectoryConcordanceError("seed index is off plan")
    if type(lane_ordinal) is not int or not 0 <= lane_ordinal < 3:
        raise VbdTrajectoryConcordanceError("lane ordinal is off plan")
    base = (
        VBD_TRAJECTORY_CONCORDANCE_CHAIN_SEED_BASE
        + 1_000 * cell_ordinal
        + 100 * seed_index
        + 10 * lane_ordinal
    )
    return tuple(base + chain_index for chain_index in range(4))


def concordance_ppc_seed(
    cell_ordinal: int, seed_index: int, lane_ordinal: int
) -> int:
    if type(cell_ordinal) is not int or not 0 <= cell_ordinal < 6:
        raise VbdTrajectoryConcordanceError("cell ordinal is off plan")
    if type(seed_index) is not int or seed_index not in VBD_TRAJECTORY_CONCORDANCE_SEED_INDEXES:
        raise VbdTrajectoryConcordanceError("seed index is off plan")
    if type(lane_ordinal) is not int or not 0 <= lane_ordinal < 3:
        raise VbdTrajectoryConcordanceError("lane ordinal is off plan")
    return (
        VBD_TRAJECTORY_CONCORDANCE_PPC_SEED_BASE
        + 1_000 * cell_ordinal
        + 100 * seed_index
        + 10 * lane_ordinal
    )


def _make_bundle(
    effect_ordinal: int,
    effect: float,
    group_ordinal: int,
    groups: int,
    seed_index: int,
) -> VbdTrajectoryConcordanceBundle:
    cell_ordinal = 2 * effect_ordinal + group_ordinal
    bundle_seed = (
        VBD_TRAJECTORY_CONCORDANCE_BUNDLE_SEED_BASE
        + 10 * cell_ordinal
        + seed_index
    )
    bundle_id = (
        f"effect={_effect_token(effect)}/groups={groups}/seed_index={seed_index}"
    )
    provisional = object.__new__(VbdTrajectoryConcordanceBundle)
    values = {
        "effect_size_sd": effect,
        "panel_group_count": groups,
        "seed_index": seed_index,
        "cell_ordinal": cell_ordinal,
        "bundle_seed": bundle_seed,
        "bundle_id": bundle_id,
        "bundle_hash": "",
    }
    for name, value in values.items():
        object.__setattr__(provisional, name, value)
    return VbdTrajectoryConcordanceBundle(
        **{**values, "bundle_hash": sha256_json(provisional.body_without_hash())}
    )


def required_vbd_trajectory_concordance_bundles() -> tuple[
    VbdTrajectoryConcordanceBundle, ...
]:
    bundles = tuple(
        _make_bundle(effect_ordinal, effect, group_ordinal, groups, seed_index)
        for effect_ordinal, effect in enumerate(
            VBD_TRAJECTORY_CONCORDANCE_EFFECT_ORDER
        )
        for group_ordinal, groups in enumerate(
            VBD_TRAJECTORY_CONCORDANCE_GROUP_ORDER
        )
        for seed_index in VBD_TRAJECTORY_CONCORDANCE_SEED_INDEXES
    )
    if len(bundles) != VBD_TRAJECTORY_CONCORDANCE_BUNDLE_COUNT:
        raise AssertionError("concordance plan must contain exactly 30 bundles")
    if len({bundle.bundle_id for bundle in bundles}) != len(bundles):
        raise AssertionError("concordance bundle ids must be unique")
    all_seeds = [bundle.bundle_seed for bundle in bundles]
    for bundle in bundles:
        for lane_ordinal in range(3):
            all_seeds.extend(
                concordance_chain_seeds(
                    bundle.cell_ordinal, bundle.seed_index, lane_ordinal
                )
            )
            all_seeds.append(
                concordance_ppc_seed(
                    bundle.cell_ordinal, bundle.seed_index, lane_ordinal
                )
            )
    if len(set(all_seeds)) != len(all_seeds):
        raise AssertionError("concordance generator, chain, and PPC seeds must be unique")
    return bundles


def vbd_trajectory_concordance_plan() -> dict:
    bundles = required_vbd_trajectory_concordance_bundles()
    body = {
        "plan_version": VBD_TRAJECTORY_CONCORDANCE_PLAN_VERSION,
        "plan_ref": VBD_TRAJECTORY_CONCORDANCE_PLAN_REF,
        "effect_sizes_sd": list(VBD_TRAJECTORY_CONCORDANCE_EFFECT_ORDER),
        "panel_group_counts": list(VBD_TRAJECTORY_CONCORDANCE_GROUP_ORDER),
        "seed_indexes": list(VBD_TRAJECTORY_CONCORDANCE_SEED_INDEXES),
        "aggregate_k": VBD_TRAJECTORY_CONCORDANCE_AGGREGATE_K,
        "bundle_count": VBD_TRAJECTORY_CONCORDANCE_BUNDLE_COUNT,
        "lane_fit_count_per_engine": VBD_TRAJECTORY_CONCORDANCE_LANE_FIT_COUNT,
        "bundles": [bundle.to_dict() for bundle in bundles],
        "compiled_gates": {
            "mean_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD
            ),
            "interval_80_endpoint_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
            ),
            "interval_99_endpoint_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
            ),
            "sd_ratio_min": VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN,
            "sd_ratio_max": VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX,
        },
        "execution": {
            "primary_and_nuts_fresh_process_per_bundle": True,
            "fresh_deterministic_recomputation_process_per_lane": True,
            "required_primary_process_count": 30,
            "required_recomputation_process_count": 90,
            "required_attestation_count": 120,
            "raw_posterior_draws_emitted": False,
            "latent_paths_emitted": False,
            "acceptance_canaries_executed": False,
            "replicated_validation_executed": False,
        },
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "task_5_6_complete": False,
    }
    return {**body, "plan_hash": sha256_json(body)}


def vbd_trajectory_concordance_seed_manifest_hash() -> str:
    return sha256_json(
        [
            {
                "bundle_id": bundle.bundle_id,
                "bundle_seed": bundle.bundle_seed,
                "lane_seeds": bundle.body_without_hash()["lane_seeds"],
            }
            for bundle in required_vbd_trajectory_concordance_bundles()
        ]
    )


def vbd_trajectory_concordance_bundle_from_dict(
    value: object,
) -> VbdTrajectoryConcordanceBundle:
    if type(value) is not dict:
        raise VbdTrajectoryConcordanceError("concordance bundle must be an object")
    matches = tuple(
        bundle
        for bundle in required_vbd_trajectory_concordance_bundles()
        if bundle.to_dict() == value
    )
    if len(matches) != 1:
        raise VbdTrajectoryConcordanceError("concordance bundle is off plan")
    return matches[0]


def evaluate_vbd_trajectory_quantity_concordance(
    primary: TrajectoryPosteriorSummary,
    reference: TrajectoryPosteriorSummary,
) -> dict:
    if (
        type(primary) is not TrajectoryPosteriorSummary
        or type(reference) is not TrajectoryPosteriorSummary
        or primary.quantity_name != "trajectory_movement"
        or reference.quantity_name != "trajectory_movement"
    ):
        raise VbdTrajectoryConcordanceError(
            "concordance requires matching trajectory-movement summaries"
        )
    values = (
        primary.posterior_mean,
        primary.posterior_sd,
        primary.interval_80_lower,
        primary.interval_80_upper,
        primary.interval_99_lower,
        primary.interval_99_upper,
        reference.posterior_mean,
        reference.posterior_sd,
        reference.interval_80_lower,
        reference.interval_80_upper,
        reference.interval_99_lower,
        reference.interval_99_upper,
    )
    if any(not math.isfinite(float(value)) for value in values):
        raise VbdTrajectoryConcordanceError("concordance summaries must be finite")
    if primary.posterior_sd <= 0.0 or reference.posterior_sd <= 0.0:
        raise VbdTrajectoryConcordanceError(
            "concordance posterior standard deviations must be positive"
        )
    reference_sd = float(reference.posterior_sd)
    mean_difference = abs(primary.posterior_mean - reference.posterior_mean) / reference_sd
    interval_80_lower_difference = abs(
        primary.interval_80_lower - reference.interval_80_lower
    ) / reference_sd
    interval_80_upper_difference = abs(
        primary.interval_80_upper - reference.interval_80_upper
    ) / reference_sd
    interval_99_lower_difference = abs(
        primary.interval_99_lower - reference.interval_99_lower
    ) / reference_sd
    interval_99_upper_difference = abs(
        primary.interval_99_upper - reference.interval_99_upper
    ) / reference_sd
    sd_ratio = primary.posterior_sd / reference_sd
    passed = (
        mean_difference <= VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD
        and interval_80_lower_difference
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        and interval_80_upper_difference
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        and interval_99_lower_difference
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        and interval_99_upper_difference
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        and VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN
        <= sd_ratio
        <= VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX
    )
    body = {
        "quantity_name": "trajectory_movement",
        "absolute_mean_difference_reference_sd": float(mean_difference),
        "interval_80_lower_endpoint_difference_reference_sd": float(
            interval_80_lower_difference
        ),
        "interval_80_upper_endpoint_difference_reference_sd": float(
            interval_80_upper_difference
        ),
        "interval_99_lower_endpoint_difference_reference_sd": float(
            interval_99_lower_difference
        ),
        "interval_99_upper_endpoint_difference_reference_sd": float(
            interval_99_upper_difference
        ),
        "primary_to_reference_sd_ratio": float(sd_ratio),
        "passed": passed,
    }
    return {**body, "concordance_hash": sha256_json(body)}
