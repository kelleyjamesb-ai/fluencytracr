"""Generator-free canonical prepared inputs for task-2.16 sampler fixtures."""

from __future__ import annotations

from dataclasses import replace

import numpy as np
from scipy.linalg import helmert

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
)
from fluencytracr_inference.vbd_trajectory_types import (
    VBD_TRAJECTORY_TRANSFORMS,
    vbd_trajectory_model_manifest_body,
)


def canonical_prepared_input(
    panel_group_count: int, *, lane: str = "frequency"
) -> TrajectoryPreparedInput:
    time_index = np.tile(np.arange(18, dtype=np.int64), panel_group_count)
    group_index = np.repeat(
        np.arange(panel_group_count, dtype=np.int64), 18
    )
    pre_time = np.arange(12, dtype=np.float64)
    unique_tau = (
        np.arange(18, dtype=np.float64) - pre_time.mean()
    ) / pre_time.std(ddof=1)
    time_tau = unique_tau[time_index]
    basis = np.asarray(
        helmert(panel_group_count, full=False).T, dtype=np.float64
    )
    x = np.column_stack((np.ones(len(time_index)), time_tau))
    augmented = np.column_stack((x, basis[group_index]))
    y = (
        0.08
        + 0.04 * time_tau
        + 0.09 * basis[group_index, 0]
        + 0.02 * np.sin((time_index + 1) * (group_index + 1) / 9.0)
    )
    known_se = np.linspace(0.16, 0.22, len(time_index), dtype=np.float64)
    post = (time_index >= 12).astype(np.int64)
    group_rows = tuple(
        np.arange(group * 18, (group + 1) * 18, dtype=np.int64)
        for group in range(panel_group_count)
    )
    contrast = np.zeros(len(time_index), dtype=np.float64)
    contrast[post == 0] = -1.0 / (12 * panel_group_count)
    contrast[np.isin(time_index, (15, 16, 17))] = 1.0 / (
        3 * panel_group_count
    )
    transform_root = sha256_json(
        {
            "lane": lane,
            "raw_transform_id": VBD_TRAJECTORY_TRANSFORMS[lane],
            "raw_pre_mean": 0.0,
            "raw_pre_sd": 1.0,
            "standard_error_scaling": 1.0,
            "pre_window_indexes": list(range(12)),
        }
    )
    context_hash = sha256_json(
        {
            "ordered_panel_manifest_root": "3" * 64,
            "lane_observation_root": "7" * 64,
            "joint_uncertainty_roots_hash": "8" * 64,
            "cohort_partition_root": "4" * 64,
            "study_plan_root": "5" * 64,
            "seed_manifest_root": "6" * 64,
            "transform_root": transform_root,
            "cross_lane_covariance_bound_not_used_as_zero": True,
            "depth_context_excluded": True,
        }
    )
    prepared = TrajectoryPreparedInput(
        lane=lane,
        panel_group_count=panel_group_count,
        aggregate_k=16,
        series_evidence_eligible=True,
        standardization_window_indexes=tuple(range(12)),
        y=y,
        known_se=known_se,
        time_index=time_index,
        time_tau=time_tau,
        post=post,
        group_index=group_index,
        group_rows=group_rows,
        x=x,
        fixed_effect_names=("alpha", "beta"),
        zero_sum_basis=basis,
        augmented_design=augmented,
        latent_level_contrast=contrast,
        raw_pre_mean=0.0,
        raw_pre_sd=1.0,
        direction_sign=1,
        transform_root=transform_root,
        model_manifest_root=sha256_json(vbd_trajectory_model_manifest_body()),
        ordered_panel_manifest_root="3" * 64,
        cohort_partition_root="4" * 64,
        study_plan_root="5" * 64,
        seed_manifest_root="6" * 64,
        lane_observation_root="7" * 64,
        joint_uncertainty_roots_hash="8" * 64,
        model_input_hash="9" * 64,
        context_binding_hash=context_hash,
        prepared_input_hash="b" * 64,
    )
    model_hash = sha256_json(prepared.to_hash_body())
    return replace(
        prepared,
        model_input_hash=model_hash,
        prepared_input_hash=sha256_json(
            {
                "model_input_hash": model_hash,
                "context_binding_hash": context_hash,
            }
        ),
    )
