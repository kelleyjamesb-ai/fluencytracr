"""Strict completed-fit projection for the held marginalization diagnostic."""

from __future__ import annotations

import numpy as np

from .hashing import sha256_json
from .vbd_trajectory_group_effect_geometry_projection import (
    _bfmi_values,
    _sample_stat_count,
)
from .vbd_trajectory_group_effect_marginalization import (
    project_vbd_group_effect_marginalization_posterior,
)
from .vbd_trajectory_group_effect_marginalization_diagnostic import (
    _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_TOKEN,
    VbdTrajectoryGroupEffectMarginalizationBinding,
    VbdTrajectoryGroupEffectMarginalizationReferencePair,
    build_vbd_trajectory_group_effect_marginalization_fit_record,
    project_completed_vbd_trajectory_group_effect_marginalization_fit,
)
from .vbd_trajectory_nuts import vbd_nuts_execution_settings
from .vbd_trajectory_preparation import TrajectoryPreparedInput
from .vbd_trajectory_types import TrajectoryObservationPanel


def project_vbd_trajectory_group_effect_marginalization_fit(
    idata,
    *,
    binding: VbdTrajectoryGroupEffectMarginalizationBinding,
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
    deterministic_reference_pair: VbdTrajectoryGroupEffectMarginalizationReferencePair,
    panel_hash: str,
    ordered_panel_manifest_root: str,
) -> dict:
    """Project one exact five-variable posterior without retaining values."""

    if type(binding) is not VbdTrajectoryGroupEffectMarginalizationBinding:
        raise TypeError("marginalization projection binding is invalid")
    if type(prepared) is not TrajectoryPreparedInput:
        raise TypeError("marginalization projection prepared input is invalid")
    if type(source_panel) is not TrajectoryObservationPanel:
        raise TypeError("marginalization projection source panel is invalid")
    if (
        prepared.lane != binding.lane
        or prepared.panel_group_count != binding.panel_group_count
        or prepared.aggregate_k != binding.aggregate_k
        or prepared.study_plan_root != binding.plan_hash
        or source_panel.panel_group_count != binding.panel_group_count
        or source_panel.aggregate_k != binding.aggregate_k
        or source_panel.seed != binding.generator_seed
        or source_panel.scenario_id != binding.scenario_id
        or source_panel.study_plan_root != binding.plan_hash
        or panel_hash != sha256_json(source_panel.to_dict())
        or ordered_panel_manifest_root
        != source_panel.ordered_panel_manifest_root
    ):
        raise ValueError("marginalization projection source bindings differ")
    posterior = getattr(idata, "posterior", None)
    sample_stats = getattr(idata, "sample_stats", None)
    if posterior is None or sample_stats is None:
        raise ValueError("marginalization inference data is incomplete")
    posterior_projection = project_vbd_group_effect_marginalization_posterior(
        prepared,
        expected_model_input_hash=prepared.model_input_hash,
        expected_prepared_input_hash=prepared.prepared_input_hash,
        posterior=posterior,
    )
    if (
        type(deterministic_reference_pair)
        is not VbdTrajectoryGroupEffectMarginalizationReferencePair
    ):
        raise TypeError("marginalization deterministic reference pair is invalid")
    settings = vbd_nuts_execution_settings("full")
    divergences, divergences_valid = _sample_stat_count(
        sample_stats,
        "diverging",
        settings,
        binary=True,
    )
    reached_count, reached_valid = _sample_stat_count(
        sample_stats,
        "reached_max_treedepth",
        settings,
        binary=True,
    )
    depth_count, depth_valid = _sample_stat_count(
        sample_stats,
        "tree_depth",
        settings,
        binary=False,
        threshold=settings.max_treedepth,
    )
    bfmi = _bfmi_values(idata)
    if not (
        divergences_valid
        and reached_valid
        and depth_valid
        and reached_count == depth_count
        and bfmi.shape == (settings.chains,)
        and np.all(np.isfinite(bfmi))
    ):
        raise ValueError("marginalization sample-stat projection is invalid")
    fit = build_vbd_trajectory_group_effect_marginalization_fit_record(
        binding=binding,
        prepared=prepared,
        source_panel=source_panel,
        deterministic_reference_pair=deterministic_reference_pair,
        posterior_projection=posterior_projection,
        post_warmup_divergences=divergences,
        max_treedepth_saturation_count=reached_count,
        energy_bfmi_min=float(bfmi.min()),
    )
    return project_completed_vbd_trajectory_group_effect_marginalization_fit(
        fit_record=fit,
        panel_hash=panel_hash,
        ordered_panel_manifest_root=ordered_panel_manifest_root,
        _completion_token=(
            _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_TOKEN
        ),
    )
