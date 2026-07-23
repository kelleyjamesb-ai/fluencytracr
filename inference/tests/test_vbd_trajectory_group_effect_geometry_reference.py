import math
import platform

import numpy as np
import pytest
from scipy.linalg import helmert

import fluencytracr_inference.vbd_trajectory_state_space as state_space
from fluencytracr_inference.hashing import sha256_json, stable_stringify
from fluencytracr_inference.vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    fit_vbd_trajectory_all_common_quantity_reference,
    fit_vbd_trajectory_state_space,
    vbd_trajectory_common_quantity_names,
)
from fluencytracr_inference.vbd_trajectory_types import (
    TrajectoryObservationPanel,
)


_LEGACY_C6_FIT_SUMMARY_HASH_BY_RUNTIME = {
    ("Darwin", "arm64"): (
        "bf1a4b0f659c5fe8414636e057a93d78e964aae3d14cf06ba8603689807b6409"
    ),
    ("Linux", "x86_64"): (
        "05b0c2c5bed28f03d9a8da6a88872f8dbb6c2875ad8c967de2f06905892e81c7"
    ),
}


def _generator_free_prepared_input(
    panel_group_count: int,
) -> TrajectoryPreparedInput:
    time_index = np.tile(np.arange(18, dtype=int), panel_group_count)
    group_index = np.repeat(
        np.arange(panel_group_count, dtype=int), 18
    )
    pre_time = np.arange(12, dtype=float)
    time_tau_unique = (
        np.arange(18, dtype=float) - pre_time.mean()
    ) / pre_time.std(ddof=1)
    time_tau = time_tau_unique[time_index]
    zero_sum_basis = np.asarray(
        helmert(panel_group_count, full=False).T, dtype=float
    )
    x = np.column_stack([np.ones(panel_group_count * 18), time_tau])
    augmented_design = np.column_stack(
        [x, zero_sum_basis[group_index]]
    )
    y = (
        0.07 * time_tau
        + zero_sum_basis[group_index, 0] * 0.12
        + 0.04
        * np.sin((time_index + 1) * (group_index + 1) / 7)
    )
    known_se = np.full(panel_group_count * 18, 0.18, dtype=float)
    post = (time_index >= 12).astype(int)
    group_rows = tuple(
        np.flatnonzero(group_index == group).astype(int)
        for group in range(panel_group_count)
    )
    latent_level_contrast = np.zeros(
        panel_group_count * 18, dtype=float
    )
    latent_level_contrast[post == 0] = -1 / (
        12 * panel_group_count
    )
    latent_level_contrast[
        np.isin(time_index, (15, 16, 17))
    ] = 1 / (3 * panel_group_count)

    return TrajectoryPreparedInput(
        lane="frequency",
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
        zero_sum_basis=zero_sum_basis,
        augmented_design=augmented_design,
        latent_level_contrast=latent_level_contrast,
        raw_pre_mean=0.0,
        raw_pre_sd=1.0,
        direction_sign=1,
        transform_root="1" * 64,
        model_manifest_root="2" * 64,
        ordered_panel_manifest_root="3" * 64,
        cohort_partition_root="4" * 64,
        study_plan_root="5" * 64,
        seed_manifest_root="6" * 64,
        lane_observation_root="7" * 64,
        joint_uncertainty_roots_hash="8" * 64,
        model_input_hash="9" * 64,
        context_binding_hash="a" * 64,
        prepared_input_hash="b" * 64,
    )


def _source_panel_sentinel() -> TrajectoryObservationPanel:
    return object.__new__(TrajectoryObservationPanel)


@pytest.mark.parametrize("panel_group_count", (6, 12))
def test_all_common_quantity_reference_is_canonical_and_deterministic(
    monkeypatch: pytest.MonkeyPatch,
    panel_group_count: int,
) -> None:
    monkeypatch.setattr(
        state_space,
        "validate_prepared_vbd_trajectory",
        lambda _prepared, _panel: None,
    )
    prepared = _generator_free_prepared_input(panel_group_count)
    source_panel = _source_panel_sentinel()

    first = fit_vbd_trajectory_all_common_quantity_reference(
        prepared, source_panel
    )
    second = fit_vbd_trajectory_all_common_quantity_reference(
        prepared, source_panel
    )
    legacy = fit_vbd_trajectory_state_space(prepared, source_panel)

    expected_names = vbd_trajectory_common_quantity_names(
        panel_group_count
    )
    assert tuple(
        summary.quantity_name for summary in first.quantity_summaries
    ) == expected_names
    assert stable_stringify(first.to_dict()).encode("utf-8") == (
        stable_stringify(second.to_dict()).encode("utf-8")
    )
    assert first.reference_hash() == second.reference_hash()

    payload = first.to_dict()
    reference_hash = payload.pop("reference_hash")
    assert reference_hash == sha256_json(payload)
    assert payload["quantity_order"] == list(expected_names)
    assert payload["posterior_support_emitted"] is False
    assert payload["latent_paths_emitted"] is False

    for summary in first.quantity_summaries:
        assert math.isfinite(summary.posterior_mean)
        assert math.isfinite(summary.posterior_sd)
        assert summary.posterior_sd > 0.0
        assert (
            summary.interval_99_lower
            <= summary.interval_80_lower
            <= summary.interval_80_upper
            <= summary.interval_99_upper
        )

    group_effects = first.quantity_summaries[3 : 3 + panel_group_count]
    assert math.isclose(
        sum(summary.posterior_mean for summary in group_effects),
        0.0,
        rel_tol=0.0,
        abs_tol=1e-12,
    )
    movement = first.quantity_summaries[-1]
    assert movement.to_dict() == legacy.movement_summary.to_dict()
    assert first.legacy_fit_summary_hash == legacy.fit_summary_hash()
    if panel_group_count == 6:
        runtime = (platform.system(), platform.machine())
        assert runtime in _LEGACY_C6_FIT_SUMMARY_HASH_BY_RUNTIME
        assert legacy.fit_summary_hash() == (
            _LEGACY_C6_FIT_SUMMARY_HASH_BY_RUNTIME[runtime]
        )
