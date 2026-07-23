from dataclasses import replace
import inspect

import numpy as np
import pytest
import xarray as xr

import fluencytracr_inference.vbd_trajectory_group_effect_geometry_projection as projection
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_nuts import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMMON_PARAMETER_VARIABLES,
    VBD_TRAJECTORY_NUTS_FULL_CHAINS,
    VBD_TRAJECTORY_NUTS_FULL_DRAWS,
    build_vbd_trajectory_nuts_group_effect_geometry_binding,
)
from fluencytracr_inference.vbd_trajectory_preparation import (
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    TrajectoryDeterministicCommonQuantityReference,
    vbd_trajectory_common_quantity_names,
)
from fluencytracr_inference.vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    _GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_GENERATION_RUNNER_TOKEN,
    generate_vbd_trajectory_group_effect_geometry_diagnostic_case,
)


def _reference(prepared):
    summaries = tuple(
        TrajectoryPosteriorSummary(
            quantity_name=name,
            posterior_mean=0.0,
            posterior_sd=1.0,
            interval_80_lower=-1.0,
            interval_80_upper=1.0,
            interval_99_lower=-2.0,
            interval_99_upper=2.0,
        )
        for name in vbd_trajectory_common_quantity_names(
            prepared.panel_group_count
        )
    )
    return TrajectoryDeterministicCommonQuantityReference(
        lane=prepared.lane,
        panel_group_count=prepared.panel_group_count,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        quantity_summaries=summaries,
        legacy_fit_summary_hash=sha256_json(["legacy", prepared.lane]),
    )


def _full_shape_idata(
    panel_group_count: int,
    arm: str,
    *,
    posterior_chain=None,
    sample_draw=None,
):
    chains = VBD_TRAJECTORY_NUTS_FULL_CHAINS
    draws = VBD_TRAJECTORY_NUTS_FULL_DRAWS
    canonical_chain = np.arange(chains, dtype=np.int64)
    canonical_draw = np.arange(draws, dtype=np.int64)
    chain_coordinate = canonical_chain if posterior_chain is None else posterior_chain
    draw_coordinate = canonical_draw
    phase = (
        canonical_chain[:, None] * draws + canonical_draw[None, :]
    ).astype(np.float64)
    phase /= float(chains * draws)
    centered_group = np.arange(panel_group_count, dtype=np.float64)
    centered_group -= centered_group.mean()
    centered_group /= max(float(panel_group_count), 1.0)
    group_scale = 0.05 * np.sin(phase * 11.0)
    u_std = centered_group[None, None, :] + group_scale[:, :, None] * centered_group
    sigma_u = 1.0 + 0.1 * np.cos(phase * 7.0)
    posterior_values = {
        "alpha": (("chain", "draw"), 0.1 + 0.2 * phase),
        "beta": (("chain", "draw"), -0.2 + 0.1 * phase),
        "sigma_u": (("chain", "draw"), sigma_u),
        "sigma_r": (("chain", "draw"), 0.7 + 0.05 * phase),
        "rho": (("chain", "draw"), -0.1 + 0.2 * phase),
        "trajectory_movement": (("chain", "draw"), 0.3 + 0.15 * phase),
    }
    if arm == "centered":
        posterior_values["u"] = (
            ("chain", "draw", "u_dim_0"),
            u_std,
        )
    else:
        posterior_values["u_std"] = (
            ("chain", "draw", "u_std_dim_0"),
            u_std,
        )
        posterior_values["u"] = (
            ("chain", "draw", "u_dim_0"),
            sigma_u[:, :, None] * u_std,
        )
    posterior = xr.Dataset(
        posterior_values,
        coords={
            "chain": chain_coordinate,
            "draw": draw_coordinate,
            "u_dim_0": np.arange(panel_group_count, dtype=np.int64),
            **(
                {
                    "u_std_dim_0": np.arange(
                        panel_group_count, dtype=np.int64
                    )
                }
                if arm == "noncentered"
                else {}
            ),
        },
    )
    sample_stats = xr.Dataset(
        {
            "diverging": (
                ("chain", "draw"),
                np.zeros((chains, draws), dtype=bool),
            ),
            "reached_max_treedepth": (
                ("chain", "draw"),
                np.zeros((chains, draws), dtype=bool),
            ),
            "tree_depth": (
                ("chain", "draw"),
                np.ones((chains, draws), dtype=np.int64),
            ),
            "energy": (("chain", "draw"), 10.0 + phase),
        },
        coords={
            "chain": canonical_chain,
            "draw": canonical_draw if sample_draw is None else sample_draw,
        },
    )
    return xr.DataTree.from_dict(
        {"/posterior": posterior, "/sample_stats": sample_stats}
    )


def _diagnostic_dataset(var_names, panel_group_count: int, value: float):
    values = {}
    for name in var_names:
        if name in ("u", "u_std"):
            dimension = f"{name}_dim_0"
            values[name] = (
                (dimension,),
                np.full(panel_group_count, value, dtype=np.float64),
            )
        else:
            values[name] = xr.DataArray(np.float64(value))
    return xr.Dataset(
        values,
        coords={
            "u_dim_0": np.arange(panel_group_count, dtype=np.int64),
            "u_std_dim_0": np.arange(panel_group_count, dtype=np.int64),
        },
    )


def _patch_diagnostics(monkeypatch, panel_group_count: int):
    monkeypatch.setattr(
        projection.az,
        "rhat",
        lambda _idata, *, var_names: _diagnostic_dataset(
            var_names, panel_group_count, 1.0
        ),
    )
    monkeypatch.setattr(
        projection.az,
        "ess",
        lambda _idata, *, var_names, method: _diagnostic_dataset(
            var_names, panel_group_count, 1_000.0
        ),
    )
    monkeypatch.setattr(
        projection.az,
        "mcse",
        lambda _idata, *, var_names, method, prob=None: _diagnostic_dataset(
            var_names, panel_group_count, 0.01
        ),
    )
    monkeypatch.setattr(
        projection,
        "_bfmi_values",
        lambda _idata: np.ones(VBD_TRAJECTORY_NUTS_FULL_CHAINS),
    )


def _projection_inputs(arm: str):
    case = generate_vbd_trajectory_group_effect_geometry_diagnostic_case(
        0,
        _runner_token=(
            _GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_GENERATION_RUNNER_TOKEN
        ),
    )
    prepared = prepare_vbd_trajectory_lane(case.panel, "frequency")
    binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
        case_ordinal=0,
        arm=arm,
        lane="frequency",
        lane_ordinal=0,
        plan_hash=case.panel.study_plan_root,
    )
    reference = _reference(prepared)
    return case.panel, prepared, binding, reference


@pytest.mark.parametrize("arm", ("centered", "noncentered"))
def test_full_shape_geometry_projection_derives_exact_source_identity(
    arm, monkeypatch
):
    source_panel, prepared, binding, reference = _projection_inputs(arm)
    _patch_diagnostics(monkeypatch, prepared.panel_group_count)
    record = projection.project_vbd_trajectory_group_effect_geometry_arm(
        _full_shape_idata(prepared.panel_group_count, arm),
        binding=binding,
        prepared=prepared,
        source_panel=source_panel,
        deterministic_reference=reference,
        deterministic_recomputation=reference,
    )
    assert record["panel_hash"] == sha256_json(source_panel.to_dict())
    assert (
        record["ordered_panel_manifest_root"]
        == source_panel.ordered_panel_manifest_root
        == prepared.ordered_panel_manifest_root
    )
    assert record["binding"]["arm"] == arm
    assert record["raw_posterior_draws_emitted"] is False
    assert record["posterior_values_emitted"] is False


def test_geometry_projection_rejects_reordered_coordinates_and_foreign_source(
    monkeypatch,
):
    source_panel, prepared, binding, reference = _projection_inputs("centered")
    _patch_diagnostics(monkeypatch, prepared.panel_group_count)
    reversed_chain = np.arange(VBD_TRAJECTORY_NUTS_FULL_CHAINS - 1, -1, -1)
    with pytest.raises(
        projection.VbdTrajectoryGroupEffectGeometryProjectionError,
        match="posterior chain coordinates",
    ):
        projection.project_vbd_trajectory_group_effect_geometry_arm(
            _full_shape_idata(
                prepared.panel_group_count,
                "centered",
                posterior_chain=reversed_chain,
            ),
            binding=binding,
            prepared=prepared,
            source_panel=source_panel,
            deterministic_reference=reference,
            deterministic_recomputation=reference,
        )

    reversed_draw = np.arange(VBD_TRAJECTORY_NUTS_FULL_DRAWS - 1, -1, -1)
    with pytest.raises(
        projection.VbdTrajectoryGroupEffectGeometryProjectionError,
        match="sample statistics draw coordinates",
    ):
        projection.project_vbd_trajectory_group_effect_geometry_arm(
            _full_shape_idata(
                prepared.panel_group_count,
                "centered",
                sample_draw=reversed_draw,
            ),
            binding=binding,
            prepared=prepared,
            source_panel=source_panel,
            deterministic_reference=reference,
            deterministic_recomputation=reference,
        )

    with pytest.raises(
        projection.VbdTrajectoryGroupEffectGeometryProjectionError,
        match="prepared input differs",
    ):
        projection.project_vbd_trajectory_group_effect_geometry_arm(
            _full_shape_idata(prepared.panel_group_count, "centered"),
            binding=binding,
            prepared=replace(prepared, ordered_panel_manifest_root="0" * 64),
            source_panel=source_panel,
            deterministic_reference=reference,
            deterministic_recomputation=reference,
        )

    parameters = inspect.signature(
        projection.project_vbd_trajectory_group_effect_geometry_arm
    ).parameters
    assert "panel_hash" not in parameters
    assert "ordered_panel_manifest_root" not in parameters
