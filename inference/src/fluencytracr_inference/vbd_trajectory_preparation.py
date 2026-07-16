"""Pre-period-only preparation for one VBD primitive trajectory lane."""

from __future__ import annotations

from dataclasses import dataclass
import math
import re

import numpy as np
from scipy.linalg import helmert

from .hashing import sha256_json
from .vbd_trajectory_types import (
    TrajectoryObservationPanel,
    TrajectoryStructureError,
    VBD_TRAJECTORY_EVALUATION_WINDOW_INDEXES,
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_PANEL_GROUP_COUNTS,
    VBD_TRAJECTORY_PRE_WINDOW_COUNT,
    VBD_TRAJECTORY_TOTAL_WINDOW_COUNT,
    VBD_TRAJECTORY_TRANSFORMS,
    transform_trajectory_value,
    validate_trajectory_panel,
    vbd_trajectory_model_manifest_body,
)


VBD_TRAJECTORY_AGGREGATE_SCHEMA_FLOOR_K = 5
VBD_TRAJECTORY_SERIES_EVIDENCE_FLOOR_K = 10
VBD_TRAJECTORY_FIXED_EFFECT_NAMES = ("alpha", "beta")
VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD = 1.0
VBD_TRAJECTORY_GROUP_SCALE_PRIOR_SD = 1.0
VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD = 1.0
VBD_TRAJECTORY_RHO_ABS_BOUND = 0.95
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class TrajectoryPreparationError(TrajectoryStructureError):
    """The aggregate panel cannot enter a trajectory fit."""

    def __init__(self, stage: str, message: str):
        super().__init__(message)
        self.stage = stage


def _prepared_sha256(value: object, name: str) -> str:
    if type(value) is not str or not _SHA256_RE.fullmatch(value):
        raise TrajectoryPreparationError(
            "prepared_hash", f"{name} must be lowercase SHA-256"
        )
    return value


@dataclass(frozen=True, eq=False)
class TrajectoryPreparedInput:
    lane: str
    panel_group_count: int
    aggregate_k: int
    series_evidence_eligible: bool
    y: np.ndarray
    known_se: np.ndarray
    time_index: np.ndarray
    time_tau: np.ndarray
    post: np.ndarray
    group_index: np.ndarray
    group_rows: tuple[np.ndarray, ...]
    x: np.ndarray
    fixed_effect_names: tuple[str, str]
    zero_sum_basis: np.ndarray
    augmented_design: np.ndarray
    latent_level_contrast: np.ndarray
    raw_pre_mean: float
    raw_pre_sd: float
    direction_sign: int
    transform_root: str
    model_manifest_root: str
    ordered_panel_manifest_root: str
    cohort_partition_root: str
    study_plan_root: str
    seed_manifest_root: str
    lane_observation_root: str
    joint_uncertainty_roots_hash: str
    model_input_hash: str
    context_binding_hash: str
    prepared_input_hash: str

    def __post_init__(self) -> None:
        for name in (
            "y",
            "known_se",
            "time_index",
            "time_tau",
            "post",
            "group_index",
            "x",
            "zero_sum_basis",
            "augmented_design",
            "latent_level_contrast",
        ):
            value = np.array(getattr(self, name), copy=True)
            value.setflags(write=False)
            object.__setattr__(self, name, value)
        frozen_group_rows = tuple(np.array(rows, copy=True) for rows in self.group_rows)
        for rows in frozen_group_rows:
            rows.setflags(write=False)
        object.__setattr__(self, "group_rows", frozen_group_rows)

    def to_hash_body(self) -> dict:
        return _model_input_body(
            lane=self.lane,
            panel_group_count=self.panel_group_count,
            aggregate_k=self.aggregate_k,
            series_evidence_eligible=self.series_evidence_eligible,
            y=self.y,
            known_se=self.known_se,
            time_index=self.time_index,
            time_tau=self.time_tau,
            post=self.post,
            group_index=self.group_index,
            group_rows=self.group_rows,
            x=self.x,
            zero_sum_basis=self.zero_sum_basis,
            augmented_design=self.augmented_design,
            latent_level_contrast=self.latent_level_contrast,
            raw_pre_mean=self.raw_pre_mean,
            raw_pre_sd=self.raw_pre_sd,
            direction_sign=self.direction_sign,
            transform_root=self.transform_root,
            model_manifest_root=self.model_manifest_root,
        )


def _unique_pre_time_encoding() -> np.ndarray:
    pre = np.arange(VBD_TRAJECTORY_PRE_WINDOW_COUNT, dtype=float)
    mean = float(pre.mean())
    sd = float(pre.std(ddof=1))
    if not math.isfinite(sd) or sd <= 0.0:
        raise TrajectoryPreparationError("time_encoding", "pre-period time scale is invalid")
    return (np.arange(VBD_TRAJECTORY_TOTAL_WINDOW_COUNT, dtype=float) - mean) / sd


def _model_input_body(
    *,
    lane: str,
    panel_group_count: int,
    aggregate_k: int,
    series_evidence_eligible: bool,
    y: np.ndarray,
    known_se: np.ndarray,
    time_index: np.ndarray,
    time_tau: np.ndarray,
    post: np.ndarray,
    group_index: np.ndarray,
    group_rows: tuple[np.ndarray, ...],
    x: np.ndarray,
    zero_sum_basis: np.ndarray,
    augmented_design: np.ndarray,
    latent_level_contrast: np.ndarray,
    raw_pre_mean: float,
    raw_pre_sd: float,
    direction_sign: int,
    transform_root: str,
    model_manifest_root: str,
) -> dict:
    return {
        "lane": lane,
        "panel_group_count": panel_group_count,
        "aggregate_k": aggregate_k,
        "series_evidence_eligible": series_evidence_eligible,
        "y": [float(value) for value in y],
        "known_se": [float(value) for value in known_se],
        "time_index": [int(value) for value in time_index],
        "time_tau": [float(value) for value in time_tau],
        "post": [int(value) for value in post],
        "group_index": [int(value) for value in group_index],
        "group_rows": [
            [int(value) for value in rows] for rows in group_rows
        ],
        "x": [[float(value) for value in row] for row in x],
        "fixed_effect_names": list(VBD_TRAJECTORY_FIXED_EFFECT_NAMES),
        "zero_sum_basis": [
            [float(value) for value in row] for row in zero_sum_basis
        ],
        "augmented_design": [
            [float(value) for value in row] for row in augmented_design
        ],
        "latent_level_contrast": [float(value) for value in latent_level_contrast],
        "raw_pre_mean": raw_pre_mean,
        "raw_pre_sd": raw_pre_sd,
        "direction_sign": direction_sign,
        "transform_root": transform_root,
        "model_manifest_root": model_manifest_root,
        "priors": {
            "fixed_effect_normal_sd": VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD,
            "group_scale_halfnormal_sd": VBD_TRAJECTORY_GROUP_SCALE_PRIOR_SD,
            "innovation_scale_halfnormal_sd": VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD,
            "rho_abs_bound": VBD_TRAJECTORY_RHO_ABS_BOUND,
        },
        "known_aggregate_se_used_exactly": True,
        "minimum_worthwhile_change_used_in_inference": False,
        "depth_used_in_likelihood": False,
        "additional_observation_scale": False,
    }


def prepare_vbd_trajectory_lane(
    panel: TrajectoryObservationPanel,
    lane: str,
) -> TrajectoryPreparedInput:
    """Prepare one lane without any truth or numeric Depth dependency."""

    try:
        validate_trajectory_panel(panel)
    except TrajectoryStructureError as exc:
        raise TrajectoryPreparationError("panel_validation", str(exc)) from exc
    if lane not in VBD_TRAJECTORY_LANES:
        raise TrajectoryPreparationError("lane_selection", "lane is not canonical")
    if panel.aggregate_k < VBD_TRAJECTORY_AGGREGATE_SCHEMA_FLOOR_K:
        raise TrajectoryPreparationError(
            "aggregate_floor",
            "aggregate k is below the existing schema floor",
        )
    lane_index = VBD_TRAJECTORY_LANES.index(lane)
    values: list[float] = []
    standard_errors: list[float] = []
    time_index: list[int] = []
    group_index: list[int] = []
    joint_roots: list[str] = []
    for bundle in panel.bundles:
        observation = bundle.observations[lane_index]
        transformed = transform_trajectory_value(
            lane, observation.distribution.p50, observation.denominator
        )
        if not math.isclose(
            transformed,
            observation.transformed_p50,
            rel_tol=1e-12,
            abs_tol=1e-12,
        ):
            raise TrajectoryPreparationError(
                "transform_reconciliation", "transformed p50 does not reconcile"
            )
        values.append(transformed)
        standard_errors.append(float(observation.transformed_standard_error))
        time_index.append(bundle.window_index)
        group_index.append(bundle.panel_group_index)
        joint_roots.append(bundle.joint_uncertainty_derivation_root)

    raw = np.asarray(values, dtype=float)
    raw_se = np.asarray(standard_errors, dtype=float)
    times = np.asarray(time_index, dtype=int)
    groups = np.asarray(group_index, dtype=int)
    post = (times >= VBD_TRAJECTORY_PRE_WINDOW_COUNT).astype(int)
    pre_mask = post == 0
    raw_pre = raw[pre_mask]
    if raw_pre.size != panel.panel_group_count * VBD_TRAJECTORY_PRE_WINDOW_COUNT:
        raise TrajectoryPreparationError("panel_alignment", "pre-period panel is incomplete")
    raw_pre_mean = float(raw_pre.mean())
    raw_pre_sd = float(raw_pre.std(ddof=1))
    if not math.isfinite(raw_pre_sd) or raw_pre_sd <= 0.0:
        raise TrajectoryPreparationError(
            "pre_period_standardization", "pre-period scale must be positive"
        )
    y = (raw - raw_pre_mean) / raw_pre_sd
    known_se = raw_se / raw_pre_sd
    if not np.all(np.isfinite(y)):
        raise TrajectoryPreparationError("pre_period_standardization", "prepared observations are nonfinite")
    if not np.all(np.isfinite(known_se)) or np.any(known_se <= 0.0):
        raise TrajectoryPreparationError("known_se", "prepared known SE is invalid")

    unique_tau = _unique_pre_time_encoding()
    tau = unique_tau[times]
    x = np.column_stack([np.ones_like(y), tau])
    zero_sum_basis = np.asarray(helmert(panel.panel_group_count, full=False).T, dtype=float)
    augmented_design = np.column_stack([x, zero_sum_basis[groups]])
    group_rows = tuple(
        np.flatnonzero(groups == group).astype(int)
        for group in range(panel.panel_group_count)
    )
    contrast = np.zeros_like(y)
    direction_sign = panel.direction_vector[lane_index]
    contrast[pre_mask] = -direction_sign / (
        VBD_TRAJECTORY_PRE_WINDOW_COUNT * panel.panel_group_count
    )
    evaluation_mask = np.isin(times, VBD_TRAJECTORY_EVALUATION_WINDOW_INDEXES)
    contrast[evaluation_mask] = direction_sign / (
        len(VBD_TRAJECTORY_EVALUATION_WINDOW_INDEXES) * panel.panel_group_count
    )
    transform_root = sha256_json(
        {
            "lane": lane,
            "raw_transform_id": panel.bundles[0].observations[lane_index].transform_id,
            "raw_pre_mean": raw_pre_mean,
            "raw_pre_sd": raw_pre_sd,
            "standard_error_scaling": 1.0 / raw_pre_sd,
            "pre_window_indexes": list(range(VBD_TRAJECTORY_PRE_WINDOW_COUNT)),
        }
    )
    model_body = _model_input_body(
        lane=lane,
        panel_group_count=panel.panel_group_count,
        aggregate_k=panel.aggregate_k,
        series_evidence_eligible=(
            panel.aggregate_k >= VBD_TRAJECTORY_SERIES_EVIDENCE_FLOOR_K
        ),
        y=y,
        known_se=known_se,
        time_index=times,
        time_tau=tau,
        post=post,
        group_index=groups,
        group_rows=group_rows,
        x=x,
        zero_sum_basis=zero_sum_basis,
        augmented_design=augmented_design,
        latent_level_contrast=contrast,
        raw_pre_mean=raw_pre_mean,
        raw_pre_sd=raw_pre_sd,
        direction_sign=direction_sign,
        transform_root=transform_root,
        model_manifest_root=panel.model_manifest_root,
    )
    model_input_hash = sha256_json(model_body)
    lane_root_map = dict(panel.lane_observation_roots)
    context_body = {
        "ordered_panel_manifest_root": panel.ordered_panel_manifest_root,
        "lane_observation_root": lane_root_map[lane],
        "joint_uncertainty_roots_hash": sha256_json(joint_roots),
        "cohort_partition_root": panel.cohort_partition_root,
        "study_plan_root": panel.study_plan_root,
        "seed_manifest_root": panel.seed_manifest_root,
        "transform_root": transform_root,
        "cross_lane_covariance_bound_not_used_as_zero": True,
        "depth_context_excluded": True,
    }
    context_binding_hash = sha256_json(context_body)
    prepared_input_hash = sha256_json(
        {
            "model_input_hash": model_input_hash,
            "context_binding_hash": context_binding_hash,
        }
    )
    prepared = TrajectoryPreparedInput(
        lane=lane,
        panel_group_count=panel.panel_group_count,
        aggregate_k=panel.aggregate_k,
        series_evidence_eligible=(
            panel.aggregate_k >= VBD_TRAJECTORY_SERIES_EVIDENCE_FLOOR_K
        ),
        y=y,
        known_se=known_se,
        time_index=times,
        time_tau=tau,
        post=post,
        group_index=groups,
        group_rows=group_rows,
        x=x,
        fixed_effect_names=VBD_TRAJECTORY_FIXED_EFFECT_NAMES,
        zero_sum_basis=zero_sum_basis,
        augmented_design=augmented_design,
        latent_level_contrast=contrast,
        raw_pre_mean=raw_pre_mean,
        raw_pre_sd=raw_pre_sd,
        direction_sign=direction_sign,
        transform_root=transform_root,
        model_manifest_root=panel.model_manifest_root,
        ordered_panel_manifest_root=panel.ordered_panel_manifest_root,
        cohort_partition_root=panel.cohort_partition_root,
        study_plan_root=panel.study_plan_root,
        seed_manifest_root=panel.seed_manifest_root,
        lane_observation_root=lane_root_map[lane],
        joint_uncertainty_roots_hash=context_body["joint_uncertainty_roots_hash"],
        model_input_hash=model_input_hash,
        context_binding_hash=context_binding_hash,
        prepared_input_hash=prepared_input_hash,
    )
    _validate_prepared_structure_and_hashes(prepared, panel)
    return prepared


def _validate_prepared_structure_and_hashes(
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
) -> None:
    if type(prepared) is not TrajectoryPreparedInput:
        raise TrajectoryPreparationError("prepared_shape", "prepared input has an unsupported type")
    try:
        validate_trajectory_panel(source_panel)
    except TrajectoryStructureError as exc:
        raise TrajectoryPreparationError("panel_validation", str(exc)) from exc
    if type(prepared.lane) is not str or prepared.lane not in VBD_TRAJECTORY_LANES:
        raise TrajectoryPreparationError("lane_selection", "lane is not canonical")
    if (
        type(prepared.panel_group_count) is not int
        or prepared.panel_group_count not in VBD_TRAJECTORY_PANEL_GROUP_COUNTS
    ):
        raise TrajectoryPreparationError("prepared_shape", "panel group count is off plan")
    if (
        type(prepared.aggregate_k) is not int
        or prepared.aggregate_k < VBD_TRAJECTORY_AGGREGATE_SCHEMA_FLOOR_K
    ):
        raise TrajectoryPreparationError("aggregate_floor", "aggregate k is below the schema floor")
    if (
        prepared.panel_group_count != source_panel.panel_group_count
        or prepared.aggregate_k != source_panel.aggregate_k
    ):
        raise TrajectoryPreparationError(
            "source_reconciliation", "prepared panel dimensions drifted from source"
        )
    expected_rows = prepared.panel_group_count * VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
    if type(prepared.series_evidence_eligible) is not bool:
        raise TrajectoryPreparationError(
            "prepared_shape", "series evidence eligibility must be a boolean"
        )
    if prepared.series_evidence_eligible is not (
        prepared.aggregate_k >= VBD_TRAJECTORY_SERIES_EVIDENCE_FLOOR_K
    ):
        raise TrajectoryPreparationError(
            "prepared_shape", "series evidence eligibility drifted"
        )
    if type(prepared.direction_sign) is not int or prepared.direction_sign not in (-1, 1):
        raise TrajectoryPreparationError("estimand_contrast", "direction sign drifted")
    if type(prepared.raw_pre_mean) not in (int, float) or not math.isfinite(
        prepared.raw_pre_mean
    ):
        raise TrajectoryPreparationError("pre_period_standardization", "raw pre mean is invalid")
    if (
        type(prepared.raw_pre_sd) not in (int, float)
        or not math.isfinite(prepared.raw_pre_sd)
        or prepared.raw_pre_sd <= 0.0
    ):
        raise TrajectoryPreparationError("pre_period_standardization", "raw pre scale is invalid")
    for name, value in (
        ("y", prepared.y),
        ("known_se", prepared.known_se),
        ("time_index", prepared.time_index),
        ("time_tau", prepared.time_tau),
        ("post", prepared.post),
        ("group_index", prepared.group_index),
        ("latent_level_contrast", prepared.latent_level_contrast),
    ):
        if type(value) is not np.ndarray or value.shape != (expected_rows,):
            raise TrajectoryPreparationError("prepared_shape", f"{name} has the wrong shape")
    if type(prepared.x) is not np.ndarray or prepared.x.shape != (expected_rows, 2):
        raise TrajectoryPreparationError("prepared_shape", "fixed-effect design has the wrong shape")
    if type(prepared.zero_sum_basis) is not np.ndarray or prepared.zero_sum_basis.shape != (
        prepared.panel_group_count,
        prepared.panel_group_count - 1,
    ):
        raise TrajectoryPreparationError("prepared_shape", "zero-sum basis has the wrong shape")
    if type(prepared.augmented_design) is not np.ndarray or prepared.augmented_design.shape != (
        expected_rows,
        2 + prepared.panel_group_count - 1,
    ):
        raise TrajectoryPreparationError("prepared_shape", "augmented design has the wrong shape")
    for value in (
        prepared.y,
        prepared.known_se,
        prepared.time_index,
        prepared.time_tau,
        prepared.post,
        prepared.group_index,
        prepared.x,
        prepared.zero_sum_basis,
        prepared.augmented_design,
        prepared.latent_level_contrast,
        *prepared.group_rows,
    ):
        if value.flags.writeable:
            raise TrajectoryPreparationError(
                "prepared_shape", "prepared arrays must be immutable"
            )
    if prepared.fixed_effect_names != VBD_TRAJECTORY_FIXED_EFFECT_NAMES:
        raise TrajectoryPreparationError("prepared_shape", "fixed effect names drifted")
    if type(prepared.fixed_effect_names) is not tuple:
        raise TrajectoryPreparationError(
            "prepared_shape", "fixed effect names must be an immutable tuple"
        )
    expected_time = np.tile(
        np.arange(VBD_TRAJECTORY_TOTAL_WINDOW_COUNT, dtype=int),
        prepared.panel_group_count,
    )
    expected_groups = np.repeat(
        np.arange(prepared.panel_group_count, dtype=int),
        VBD_TRAJECTORY_TOTAL_WINDOW_COUNT,
    )
    if not np.array_equal(prepared.time_index, expected_time):
        raise TrajectoryPreparationError("panel_alignment", "prepared time order drifted")
    if not np.array_equal(prepared.group_index, expected_groups):
        raise TrajectoryPreparationError("panel_alignment", "prepared group order drifted")
    expected_post = (
        expected_time >= VBD_TRAJECTORY_PRE_WINDOW_COUNT
    ).astype(int)
    if not np.array_equal(prepared.post, expected_post):
        raise TrajectoryPreparationError("panel_alignment", "prepared post schedule drifted")
    expected_group_rows = tuple(
        np.flatnonzero(expected_groups == group).astype(int)
        for group in range(prepared.panel_group_count)
    )
    if type(prepared.group_rows) is not tuple or any(
        type(rows) is not np.ndarray for rows in prepared.group_rows
    ) or len(prepared.group_rows) != len(expected_group_rows) or any(
        not np.array_equal(actual, expected)
        for actual, expected in zip(prepared.group_rows, expected_group_rows)
    ):
        raise TrajectoryPreparationError("panel_alignment", "group rows drifted")
    expected_x = np.column_stack([np.ones(expected_rows), prepared.time_tau])
    if not np.array_equal(prepared.x, expected_x):
        raise TrajectoryPreparationError("prepared_shape", "fixed-effect design drifted")
    expected_basis = np.asarray(
        helmert(prepared.panel_group_count, full=False).T, dtype=float
    )
    if not np.array_equal(prepared.zero_sum_basis, expected_basis):
        raise TrajectoryPreparationError("prepared_shape", "zero-sum basis drifted")
    expected_augmented = np.column_stack([expected_x, expected_basis[expected_groups]])
    if not np.array_equal(prepared.augmented_design, expected_augmented):
        raise TrajectoryPreparationError("prepared_shape", "augmented design drifted")
    if not np.all(np.isfinite(prepared.y)) or not np.all(np.isfinite(prepared.known_se)):
        raise TrajectoryPreparationError("prepared_finite", "prepared arrays must be finite")
    if np.any(prepared.known_se <= 0.0):
        raise TrajectoryPreparationError("known_se", "known SE must be positive")
    if not math.isclose(
        float(prepared.y[prepared.post == 0].mean()), 0.0, rel_tol=0.0, abs_tol=1e-12
    ):
        raise TrajectoryPreparationError("pre_period_standardization", "pre mean is not zero")
    if not math.isclose(
        float(prepared.y[prepared.post == 0].std(ddof=1)), 1.0, rel_tol=0.0, abs_tol=1e-12
    ):
        raise TrajectoryPreparationError("pre_period_standardization", "pre scale is not one")
    unique_tau = _unique_pre_time_encoding()
    if not np.array_equal(prepared.time_tau, unique_tau[prepared.time_index]):
        raise TrajectoryPreparationError("time_encoding", "time encoding drifted")
    expected_contrast = np.zeros(expected_rows, dtype=float)
    expected_contrast[prepared.post == 0] = -prepared.direction_sign / (
        VBD_TRAJECTORY_PRE_WINDOW_COUNT * prepared.panel_group_count
    )
    expected_contrast[
        np.isin(prepared.time_index, VBD_TRAJECTORY_EVALUATION_WINDOW_INDEXES)
    ] = prepared.direction_sign / (
        len(VBD_TRAJECTORY_EVALUATION_WINDOW_INDEXES) * prepared.panel_group_count
    )
    if not np.array_equal(prepared.latent_level_contrast, expected_contrast):
        raise TrajectoryPreparationError("estimand_contrast", "latent contrast drifted")
    if not math.isclose(float(prepared.latent_level_contrast.sum()), 0.0, abs_tol=1e-15):
        raise TrajectoryPreparationError("estimand_contrast", "latent contrast must sum to zero")
    expected_transform_root = sha256_json(
        {
            "lane": prepared.lane,
            "raw_transform_id": VBD_TRAJECTORY_TRANSFORMS[prepared.lane],
            "raw_pre_mean": prepared.raw_pre_mean,
            "raw_pre_sd": prepared.raw_pre_sd,
            "standard_error_scaling": 1.0 / prepared.raw_pre_sd,
            "pre_window_indexes": list(range(VBD_TRAJECTORY_PRE_WINDOW_COUNT)),
        }
    )
    if prepared.transform_root != expected_transform_root:
        raise TrajectoryPreparationError("prepared_hash", "transform root drifted")
    expected_model_manifest_root = sha256_json(vbd_trajectory_model_manifest_body())
    if prepared.model_manifest_root != expected_model_manifest_root:
        raise TrajectoryPreparationError("prepared_hash", "model manifest root drifted")
    for name, value in (
        ("transform_root", prepared.transform_root),
        ("model_manifest_root", prepared.model_manifest_root),
        ("ordered_panel_manifest_root", prepared.ordered_panel_manifest_root),
        ("cohort_partition_root", prepared.cohort_partition_root),
        ("study_plan_root", prepared.study_plan_root),
        ("seed_manifest_root", prepared.seed_manifest_root),
        ("lane_observation_root", prepared.lane_observation_root),
        ("joint_uncertainty_roots_hash", prepared.joint_uncertainty_roots_hash),
        ("model_input_hash", prepared.model_input_hash),
        ("context_binding_hash", prepared.context_binding_hash),
        ("prepared_input_hash", prepared.prepared_input_hash),
    ):
        _prepared_sha256(value, name)
    model_body = _model_input_body(
        lane=prepared.lane,
        panel_group_count=prepared.panel_group_count,
        aggregate_k=prepared.aggregate_k,
        series_evidence_eligible=prepared.series_evidence_eligible,
        y=prepared.y,
        known_se=prepared.known_se,
        time_index=prepared.time_index,
        time_tau=prepared.time_tau,
        post=prepared.post,
        group_index=prepared.group_index,
        group_rows=prepared.group_rows,
        x=prepared.x,
        zero_sum_basis=prepared.zero_sum_basis,
        augmented_design=prepared.augmented_design,
        latent_level_contrast=prepared.latent_level_contrast,
        raw_pre_mean=prepared.raw_pre_mean,
        raw_pre_sd=prepared.raw_pre_sd,
        direction_sign=prepared.direction_sign,
        transform_root=prepared.transform_root,
        model_manifest_root=prepared.model_manifest_root,
    )
    if prepared.model_input_hash != sha256_json(model_body):
        raise TrajectoryPreparationError("prepared_hash", "model input hash drifted")
    context_body = {
        "ordered_panel_manifest_root": prepared.ordered_panel_manifest_root,
        "lane_observation_root": prepared.lane_observation_root,
        "joint_uncertainty_roots_hash": prepared.joint_uncertainty_roots_hash,
        "cohort_partition_root": prepared.cohort_partition_root,
        "study_plan_root": prepared.study_plan_root,
        "seed_manifest_root": prepared.seed_manifest_root,
        "transform_root": prepared.transform_root,
        "cross_lane_covariance_bound_not_used_as_zero": True,
        "depth_context_excluded": True,
    }
    if prepared.context_binding_hash != sha256_json(context_body):
        raise TrajectoryPreparationError("prepared_hash", "context binding hash drifted")
    if prepared.prepared_input_hash != sha256_json(
        {
            "model_input_hash": prepared.model_input_hash,
            "context_binding_hash": prepared.context_binding_hash,
        }
    ):
        raise TrajectoryPreparationError("prepared_hash", "prepared input hash drifted")
    lane_root_map = dict(source_panel.lane_observation_roots)
    lane_index = VBD_TRAJECTORY_LANES.index(prepared.lane)
    expected_joint_roots_hash = sha256_json(
        [
            bundle.joint_uncertainty_derivation_root
            for bundle in source_panel.bundles
        ]
    )
    expected_source_bindings = {
        "ordered_panel_manifest_root": source_panel.ordered_panel_manifest_root,
        "cohort_partition_root": source_panel.cohort_partition_root,
        "study_plan_root": source_panel.study_plan_root,
        "seed_manifest_root": source_panel.seed_manifest_root,
        "lane_observation_root": lane_root_map[prepared.lane],
        "joint_uncertainty_roots_hash": expected_joint_roots_hash,
        "model_manifest_root": source_panel.model_manifest_root,
    }
    for name, expected_value in expected_source_bindings.items():
        if getattr(prepared, name) != expected_value:
            raise TrajectoryPreparationError(
                "source_reconciliation", f"{name} drifted from the source panel"
            )
    if prepared.direction_sign != source_panel.direction_vector[lane_index]:
        raise TrajectoryPreparationError(
            "source_reconciliation", "direction sign drifted from the source panel"
        )


def validate_prepared_vbd_trajectory(
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
) -> None:
    """Validate structure and exact deterministic reconciliation to its source panel."""

    _validate_prepared_structure_and_hashes(prepared, source_panel)
    expected_prepared = prepare_vbd_trajectory_lane(source_panel, prepared.lane)
    if prepared.prepared_input_hash != expected_prepared.prepared_input_hash:
        raise TrajectoryPreparationError(
            "source_reconciliation",
            "prepared input does not exactly match deterministic source preparation",
        )
