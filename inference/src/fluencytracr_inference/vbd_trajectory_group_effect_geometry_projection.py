"""Sanitized completed-run projection for the VBD geometry diagnostic."""

from __future__ import annotations

import math

import arviz as az
import numpy as np

from .vbd_trajectory_group_effect_geometry_diagnostic import (
    build_vbd_trajectory_group_effect_geometry_arm_record,
)
from .vbd_trajectory_nuts import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMMON_PARAMETER_VARIABLES,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_PARAMETER_VARIABLE,
    VBD_TRAJECTORY_NUTS_FULL_CHAINS,
    VBD_TRAJECTORY_NUTS_FULL_DRAWS,
    TrajectoryNutsError,
    TrajectoryNutsGroupEffectGeometryBinding,
    _bfmi_values,
    _sample_stat_count,
    vbd_nuts_execution_settings,
)
from .hashing import sha256_json
from .vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
    validate_prepared_vbd_trajectory,
)
from .vbd_trajectory_state_space import (
    TrajectoryDeterministicCommonQuantityReference,
    vbd_trajectory_common_quantity_names,
)
from .vbd_trajectory_statistics import (
    VBD_TRAJECTORY_INTERVAL_80,
    VBD_TRAJECTORY_INTERVAL_99,
    TrajectoryPosteriorSummary,
    summarize_weighted_support,
)
from .vbd_trajectory_types import TrajectoryObservationPanel


class VbdTrajectoryGroupEffectGeometryProjectionError(ValueError):
    """A completed geometry sampler result cannot be projected safely."""


def _projection_error(message: str, exc: Exception | None = None):
    error = VbdTrajectoryGroupEffectGeometryProjectionError(message)
    if exc is None:
        raise error
    raise error from exc


def _expected_variables(arm: str) -> tuple[str, ...]:
    if arm == "centered":
        return VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMMON_PARAMETER_VARIABLES
    if arm == "noncentered":
        return (
            *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMMON_PARAMETER_VARIABLES,
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_PARAMETER_VARIABLE,
        )
    _projection_error("geometry projection arm is invalid")


def _parameter_labels(variable_name: str, panel_group_count: int) -> tuple[str, ...]:
    if variable_name in ("u", "u_std"):
        return tuple(
            f"{variable_name}[{index}]" for index in range(panel_group_count)
        )
    return (variable_name,)


def _validate_chain_draw_coordinates(value, *, name: str) -> None:
    expected = {
        "chain": np.arange(VBD_TRAJECTORY_NUTS_FULL_CHAINS, dtype=np.int64),
        "draw": np.arange(VBD_TRAJECTORY_NUTS_FULL_DRAWS, dtype=np.int64),
    }
    for dimension, expected_coordinate in expected.items():
        if dimension not in value.coords:
            _projection_error(f"geometry {name} {dimension} coordinate is missing")
        coordinate = np.asarray(value.coords[dimension])
        if (
            coordinate.dtype.kind not in "iu"
            or coordinate.shape != expected_coordinate.shape
            or not np.array_equal(coordinate, expected_coordinate)
        ):
            _projection_error(
                f"geometry {name} {dimension} coordinates are invalid"
            )


def _posterior_values(
    posterior,
    variable_name: str,
    *,
    panel_group_count: int,
) -> tuple[np.ndarray, tuple[str, ...]]:
    variable = posterior[variable_name]
    values = np.asarray(variable)
    if values.dtype != np.dtype(np.float64) or not np.all(np.isfinite(values)):
        _projection_error("geometry posterior values must be finite binary64")
    labels = _parameter_labels(variable_name, panel_group_count)
    if variable_name in ("u", "u_std"):
        expected_dimension = f"{variable_name}_dim_0"
        expected_shape = (
            VBD_TRAJECTORY_NUTS_FULL_CHAINS,
            VBD_TRAJECTORY_NUTS_FULL_DRAWS,
            panel_group_count,
        )
        if (
            tuple(str(dimension) for dimension in variable.dims)
            != ("chain", "draw", expected_dimension)
            or values.shape != expected_shape
        ):
            _projection_error("geometry vector posterior shape is invalid")
        coordinate = np.asarray(variable.coords[expected_dimension])
        expected_coordinate = np.arange(panel_group_count, dtype=np.int64)
        if (
            coordinate.dtype.kind not in "iu"
            or coordinate.shape != expected_coordinate.shape
            or not np.array_equal(coordinate, expected_coordinate)
        ):
            _projection_error("geometry vector posterior coordinates are invalid")
        flattened = values.reshape(
            VBD_TRAJECTORY_NUTS_FULL_CHAINS
            * VBD_TRAJECTORY_NUTS_FULL_DRAWS,
            panel_group_count,
        )
    else:
        if (
            tuple(str(dimension) for dimension in variable.dims)
            != ("chain", "draw")
            or values.shape
            != (
                VBD_TRAJECTORY_NUTS_FULL_CHAINS,
                VBD_TRAJECTORY_NUTS_FULL_DRAWS,
            )
        ):
            _projection_error("geometry scalar posterior shape is invalid")
        flattened = values.reshape(-1, 1)
    return np.asarray(flattened, dtype=np.float64), labels


def _diagnostic_values(
    tree,
    variable_name: str,
    *,
    panel_group_count: int,
) -> np.ndarray:
    variable = tree[variable_name]
    values = np.asarray(variable)
    if variable_name in ("u", "u_std"):
        expected_dimension = f"{variable_name}_dim_0"
        if (
            tuple(str(dimension) for dimension in variable.dims)
            != (expected_dimension,)
            or values.shape != (panel_group_count,)
        ):
            _projection_error("geometry vector diagnostic shape is invalid")
        coordinate = np.asarray(variable.coords[expected_dimension])
        expected_coordinate = np.arange(panel_group_count, dtype=np.int64)
        if (
            coordinate.dtype.kind not in "iu"
            or not np.array_equal(coordinate, expected_coordinate)
        ):
            _projection_error("geometry vector diagnostic coordinates are invalid")
    elif tuple(str(dimension) for dimension in variable.dims) or values.shape != ():
        _projection_error("geometry scalar diagnostic shape is invalid")
    values = np.asarray(values, dtype=np.float64).reshape(-1)
    if not np.all(np.isfinite(values)):
        _projection_error("geometry sampler diagnostics must be finite")
    return values


def _sampler_diagnostic_rows(
    idata,
    *,
    variable_order: tuple[str, ...],
    posterior_values: dict[str, tuple[np.ndarray, tuple[str, ...]]],
    panel_group_count: int,
) -> list[dict]:
    try:
        trees = {
            "r_hat": az.rhat(idata, var_names=list(variable_order)),
            "bulk_ess": az.ess(
                idata, var_names=list(variable_order), method="bulk"
            ),
            "tail_ess": az.ess(
                idata, var_names=list(variable_order), method="tail"
            ),
            "mean": az.mcse(
                idata, var_names=list(variable_order), method="mean"
            ),
            "q10": az.mcse(
                idata,
                var_names=list(variable_order),
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_80[0],
            ),
            "q90": az.mcse(
                idata,
                var_names=list(variable_order),
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_80[1],
            ),
            "q005": az.mcse(
                idata,
                var_names=list(variable_order),
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_99[0],
            ),
            "q995": az.mcse(
                idata,
                var_names=list(variable_order),
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_99[1],
            ),
        }
    except Exception as exc:
        _projection_error("geometry sampler diagnostics are unavailable", exc)

    rows = []
    for variable_name in variable_order:
        flattened, labels = posterior_values[variable_name]
        posterior_sd = flattened.std(axis=0, ddof=1)
        if (
            posterior_sd.shape != (len(labels),)
            or not np.all(np.isfinite(posterior_sd))
            or np.any(posterior_sd <= 0.0)
        ):
            _projection_error("geometry posterior SD is invalid")
        values = {
            name: _diagnostic_values(
                tree,
                variable_name,
                panel_group_count=panel_group_count,
            )
            for name, tree in trees.items()
        }
        if any(value.shape != posterior_sd.shape for value in values.values()):
            _projection_error("geometry diagnostic cardinality is invalid")
        for index, label in enumerate(labels):
            rows.append(
                {
                    "parameter_name": label,
                    "r_hat": float(values["r_hat"][index]),
                    "bulk_ess": float(values["bulk_ess"][index]),
                    "tail_ess": float(values["tail_ess"][index]),
                    "posterior_mean_mcse_to_posterior_sd_ratio": float(
                        values["mean"][index] / posterior_sd[index]
                    ),
                    "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio": float(
                        values["q10"][index] / posterior_sd[index]
                    ),
                    "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio": float(
                        values["q90"][index] / posterior_sd[index]
                    ),
                    "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio": float(
                        values["q005"][index] / posterior_sd[index]
                    ),
                    "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio": float(
                        values["q995"][index] / posterior_sd[index]
                    ),
                }
            )
    if any(
        type(value) is not float or not math.isfinite(value) or value < 0.0
        for row in rows
        for key, value in row.items()
        if key != "parameter_name"
    ):
        _projection_error("geometry diagnostic ratios are invalid")
    return rows


def _common_summaries(
    posterior_values: dict[str, tuple[np.ndarray, tuple[str, ...]]],
    *,
    panel_group_count: int,
) -> tuple[TrajectoryPosteriorSummary, ...]:
    support_count = (
        VBD_TRAJECTORY_NUTS_FULL_CHAINS * VBD_TRAJECTORY_NUTS_FULL_DRAWS
    )
    weights = np.ones(support_count, dtype=np.float64)
    stable_indices = np.arange(support_count, dtype=np.int64)
    summaries = []
    for variable_name in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMMON_PARAMETER_VARIABLES:
        values, labels = posterior_values[variable_name]
        for index, label in enumerate(labels):
            summaries.append(
                summarize_weighted_support(
                    label,
                    values[:, index],
                    weights,
                    stable_indices,
                )
            )
    expected = vbd_trajectory_common_quantity_names(panel_group_count)
    if tuple(summary.quantity_name for summary in summaries) != expected:
        _projection_error("geometry common summary order is invalid")
    return tuple(summaries)


def _reference_comparisons(
    summaries: tuple[TrajectoryPosteriorSummary, ...],
    reference: TrajectoryDeterministicCommonQuantityReference,
) -> list[dict]:
    rows = []
    for summary, expected in zip(
        summaries, reference.quantity_summaries, strict=True
    ):
        denominator = expected.posterior_sd
        rows.append(
            {
                "quantity_name": expected.quantity_name,
                "absolute_mean_difference_reference_sd": float(
                    abs(summary.posterior_mean - expected.posterior_mean)
                    / denominator
                ),
                "interval_80_lower_endpoint_difference_reference_sd": float(
                    abs(summary.interval_80_lower - expected.interval_80_lower)
                    / denominator
                ),
                "interval_80_upper_endpoint_difference_reference_sd": float(
                    abs(summary.interval_80_upper - expected.interval_80_upper)
                    / denominator
                ),
                "interval_99_lower_endpoint_difference_reference_sd": float(
                    abs(summary.interval_99_lower - expected.interval_99_lower)
                    / denominator
                ),
                "interval_99_upper_endpoint_difference_reference_sd": float(
                    abs(summary.interval_99_upper - expected.interval_99_upper)
                    / denominator
                ),
                "primary_to_reference_sd_ratio": float(
                    summary.posterior_sd / denominator
                ),
            }
        )
    return rows


def project_vbd_trajectory_group_effect_geometry_arm(
    idata,
    *,
    binding: TrajectoryNutsGroupEffectGeometryBinding,
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
    deterministic_reference: TrajectoryDeterministicCommonQuantityReference,
    deterministic_recomputation: TrajectoryDeterministicCommonQuantityReference,
) -> dict:
    """Project one full geometry fit without retaining posterior values."""

    if type(binding) is not TrajectoryNutsGroupEffectGeometryBinding:
        _projection_error("geometry projection binding is invalid")
    if type(prepared) is not TrajectoryPreparedInput:
        _projection_error("geometry projection prepared input is invalid")
    if type(source_panel) is not TrajectoryObservationPanel:
        _projection_error("geometry projection source panel is invalid")
    try:
        validate_prepared_vbd_trajectory(prepared, source_panel)
    except Exception as exc:
        _projection_error("geometry prepared input differs from its source panel", exc)
    if (
        type(deterministic_reference)
        is not TrajectoryDeterministicCommonQuantityReference
        or type(deterministic_recomputation)
        is not TrajectoryDeterministicCommonQuantityReference
    ):
        _projection_error("geometry deterministic reference is invalid")
    if (
        source_panel.seed != binding.generator_seed
        or source_panel.scenario_id != binding.scenario_id
        or source_panel.panel_group_count != binding.panel_group_count
        or source_panel.aggregate_k != binding.aggregate_k
        or source_panel.study_plan_root != binding.plan_hash
        or prepared.ordered_panel_manifest_root
        != source_panel.ordered_panel_manifest_root
        or prepared.lane != binding.lane
        or prepared.panel_group_count != binding.panel_group_count
        or prepared.aggregate_k != binding.aggregate_k
        or prepared.study_plan_root != binding.plan_hash
        or deterministic_reference.lane != binding.lane
        or deterministic_reference.panel_group_count != binding.panel_group_count
        or deterministic_reference.prepared_input_hash
        != prepared.prepared_input_hash
        or deterministic_reference.model_input_hash != prepared.model_input_hash
        or deterministic_recomputation.to_dict()
        != deterministic_reference.to_dict()
    ):
        _projection_error("geometry projection source bindings differ")
    posterior = getattr(idata, "posterior", None)
    sample_stats = getattr(idata, "sample_stats", None)
    if posterior is None or sample_stats is None:
        _projection_error("geometry inference data is incomplete")
    _validate_chain_draw_coordinates(posterior, name="posterior")
    _validate_chain_draw_coordinates(sample_stats, name="sample statistics")
    expected_variables = _expected_variables(binding.arm)
    actual_variables = tuple(str(name) for name in posterior.data_vars)
    if set(actual_variables) != set(expected_variables) or len(actual_variables) != len(
        expected_variables
    ):
        _projection_error("geometry posterior variable set is invalid")
    posterior_values = {
        variable_name: _posterior_values(
            posterior,
            variable_name,
            panel_group_count=binding.panel_group_count,
        )
        for variable_name in expected_variables
    }
    if binding.arm == "noncentered":
        sigma_u = posterior_values["sigma_u"][0][:, 0]
        u_std = posterior_values["u_std"][0]
        stored_u = posterior_values["u"][0]
        reconstructed_u = sigma_u[:, None] * u_std
        if not np.array_equal(stored_u, reconstructed_u):
            _projection_error("geometry noncentered u reconstruction differs")

    diagnostic_order = (
        *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMMON_PARAMETER_VARIABLES,
        *(
            (VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_PARAMETER_VARIABLE,)
            if binding.arm == "noncentered"
            else ()
        ),
    )
    sampler_rows = _sampler_diagnostic_rows(
        idata,
        variable_order=diagnostic_order,
        posterior_values=posterior_values,
        panel_group_count=binding.panel_group_count,
    )
    common_summaries = _common_summaries(
        posterior_values,
        panel_group_count=binding.panel_group_count,
    )
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
    if not (
        divergences_valid
        and reached_valid
        and depth_valid
        and reached_count == depth_count
    ):
        _projection_error("geometry sample-stat shape is invalid")
    try:
        bfmi = _bfmi_values(idata)
    except Exception as exc:
        _projection_error("geometry BFMI is unavailable", exc)
    if bfmi.shape != (settings.chains,) or not np.all(np.isfinite(bfmi)):
        _projection_error("geometry BFMI shape is invalid")

    return build_vbd_trajectory_group_effect_geometry_arm_record(
        binding=binding,
        panel_hash=sha256_json(source_panel.to_dict()),
        ordered_panel_manifest_root=source_panel.ordered_panel_manifest_root,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        deterministic_reference_hash=deterministic_reference.reference_hash(),
        deterministic_recomputation_hash=(
            deterministic_recomputation.reference_hash()
        ),
        sampler_diagnostic_rows=sampler_rows,
        reference_comparisons=_reference_comparisons(
            common_summaries,
            deterministic_reference,
        ),
        post_warmup_divergences=divergences,
        max_treedepth_saturation_count=reached_count,
        energy_bfmi_min=float(bfmi.min()),
    )
