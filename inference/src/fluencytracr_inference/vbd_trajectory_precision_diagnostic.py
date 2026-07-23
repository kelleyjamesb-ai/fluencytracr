"""Sanitized, permanently held MCSE precision-design diagnostic records."""

from __future__ import annotations

import math

import arviz as az
import numpy as np

from .hashing import sha256_json
from .vbd_trajectory_nuts import (
    VBD_TRAJECTORY_NUTS_BFMI_MIN,
    VBD_TRAJECTORY_NUTS_ESS_MIN,
    VBD_TRAJECTORY_NUTS_FULL_CHAINS,
    VBD_TRAJECTORY_NUTS_FULL_DRAWS,
    VBD_TRAJECTORY_NUTS_FULL_MAX_TREEDEPTH,
    VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX,
    VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES,
    VBD_TRAJECTORY_NUTS_RHAT_MAX,
    TrajectoryNutsPrecisionDiagnosticBinding,
    TrajectoryNutsPrecisionDiagnosticV2Binding,
    TrajectoryNutsPrecisionDiagnosticV3Binding,
    _bfmi_values,
    _expected_parameter_names,
    _labeled_diagnostic_rows,
    _parameter_labels_and_coordinates,
    _sample_stat_count,
    build_vbd_trajectory_nuts_precision_diagnostic_binding,
    build_vbd_trajectory_nuts_precision_diagnostic_v2_binding,
    build_vbd_trajectory_nuts_precision_diagnostic_v3_binding,
    vbd_nuts_execution_settings,
)
from .vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_CHAIN_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_GENERATOR_SEED,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_HOLD_REASON,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_ID,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PLAN_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_SEED_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TAIL_PROBABILITIES,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TIMEOUT_SECONDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHAIN_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_GENERATOR_SEED,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_PLAN_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_SEED_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHAIN_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_GENERATOR_SEED,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_ID,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_PLAN_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_SEED_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_INPUT_BINDING_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
)
from .vbd_trajectory_statistics import (
    VBD_TRAJECTORY_INTERVAL_80,
    VBD_TRAJECTORY_INTERVAL_99,
    weighted_quantile_v1,
)
from .vbd_trajectory_synthetic import (
    vbd_trajectory_precision_diagnostic_case_body,
    vbd_trajectory_precision_diagnostic_v2_case_body,
    vbd_trajectory_precision_diagnostic_v3_case_body,
)
from .vbd_trajectory_types import VBD_TRAJECTORY_LANES


VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_CANARY_SOURCE_COMMIT = (
    "c7014906918b3be4e40e0c312421383c66f2960a"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_FAILURE_RECORD_COMMIT = (
    "afda2e6f2ce2645e35cb3b315a7c4c249b245993"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES = (
    "alpha",
    "beta",
    "sigma_u",
    "u[0]",
    "u[1]",
    "u[2]",
    "u[3]",
    "u[4]",
    "u[5]",
    "sigma_r",
    "rho",
    "trajectory_movement",
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_NON_MCSE_FAILURE_ORDER = (
    "r_hat",
    "bulk_ess",
    "tail_ess",
    "divergences",
    "max_treedepth_saturation",
    "energy_bfmi",
)


class VbdTrajectoryPrecisionDiagnosticError(RuntimeError):
    """The diagnostic projection or sanitized record is malformed."""


def _strict_sha256(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 64
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(f"{name} is not a sha256")
    return value


def _strict_git_object_id(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 40
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            f"{name} is not an exact Git object ID"
        )
    return value


def _finite(value: object, name: str, *, positive: bool = False) -> float:
    if isinstance(value, (bool, np.bool_)) or not isinstance(
        value, (int, float, np.integer, np.floating)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(f"{name} is not numeric")
    number = float(value)
    if not math.isfinite(number) or (positive and number <= 0.0):
        raise VbdTrajectoryPrecisionDiagnosticError(f"{name} is out of domain")
    return 0.0 if number == 0.0 else number


def _nonnegative(value: object, name: str) -> float:
    number = _finite(value, name)
    if number < 0.0:
        raise VbdTrajectoryPrecisionDiagnosticError(f"{name} is negative")
    return number


def vbd_trajectory_precision_diagnostic_seed_manifest() -> dict:
    lanes = []
    for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
        start = 4 * lane_ordinal
        lanes.append(
            {
                "lane": lane,
                "lane_ordinal": lane_ordinal,
                "chain_seeds": list(
                    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_CHAIN_SEEDS[
                        start : start + 4
                    ]
                ),
            }
        )
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_SEED_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_ID,
        "generator_seed": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_GENERATOR_SEED,
        "lanes": lanes,
        "reserved_seeds": [
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_GENERATOR_SEED,
            *VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_CHAIN_SEEDS,
        ],
        "exclusive_to_diagnostic": True,
        "acceptance_seed_count": 0,
    }
    return {**body, "seed_manifest_hash": sha256_json(body)}


def vbd_trajectory_precision_diagnostic_plan() -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PLAN_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_ID,
        "case": vbd_trajectory_precision_diagnostic_case_body(),
        "lane_order": list(VBD_TRAJECTORY_LANES),
        "parameter_order": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
        ),
        "prefix_draws_per_chain": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS
        ),
        "mcse_endpoint_order": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS
        ),
        "tail_probabilities": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TAIL_PROBABILITIES
        ),
        "sampler_settings": vbd_nuts_execution_settings("full").to_dict(),
        "bundle_child_timeout_seconds": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TIMEOUT_SECONDS
        ),
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
        "state": "HOLD",
        "hold_reasons": [VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_HOLD_REASON],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_seed_manifest()[
            "seed_manifest_hash"
        ],
    }
    return {**body, "diagnostic_plan_hash": sha256_json(body)}


def vbd_trajectory_precision_diagnostic_v2_seed_manifest() -> dict:
    lanes = []
    for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
        start = 4 * lane_ordinal
        lanes.append(
            {
                "lane": lane,
                "lane_ordinal": lane_ordinal,
                "chain_seeds": list(
                    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHAIN_SEEDS[
                        start : start + 4
                    ]
                ),
            }
        )
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_SEED_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID,
        "generator_seed": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_GENERATOR_SEED,
        "lanes": lanes,
        "reserved_seeds": [
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_GENERATOR_SEED,
            *VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHAIN_SEEDS,
        ],
        "exclusive_to_diagnostic": True,
        "acceptance_seed_count": 0,
    }
    return {**body, "seed_manifest_hash": sha256_json(body)}


def vbd_trajectory_precision_diagnostic_v2_plan() -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_PLAN_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID,
        "case": vbd_trajectory_precision_diagnostic_v2_case_body(),
        "lane_order": list(VBD_TRAJECTORY_LANES),
        "parameter_order": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
        ),
        "prefix_draws_per_chain": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS
        ),
        "mcse_endpoint_order": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS
        ),
        "tail_probabilities": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TAIL_PROBABILITIES
        ),
        "sampler_settings": vbd_nuts_execution_settings("full").to_dict(),
        "bundle_child_timeout_seconds": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TIMEOUT_SECONDS
        ),
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
        "state": "HOLD",
        "hold_reasons": [VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_HOLD_REASON],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_v2_seed_manifest()[
            "seed_manifest_hash"
        ],
    }
    return {**body, "diagnostic_plan_hash": sha256_json(body)}


def vbd_trajectory_precision_diagnostic_v3_seed_manifest() -> dict:
    lanes = []
    for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
        start = 4 * lane_ordinal
        lanes.append(
            {
                "lane": lane,
                "lane_ordinal": lane_ordinal,
                "chain_seeds": list(
                    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHAIN_SEEDS[
                        start : start + 4
                    ]
                ),
            }
        )
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_SEED_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_ID,
        "generator_seed": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_GENERATOR_SEED,
        "lanes": lanes,
        "reserved_seeds": [
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_GENERATOR_SEED,
            *VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHAIN_SEEDS,
        ],
        "exclusive_to_diagnostic": True,
        "acceptance_seed_count": 0,
    }
    return {**body, "seed_manifest_hash": sha256_json(body)}


def vbd_trajectory_precision_diagnostic_v3_plan() -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_PLAN_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_ID,
        "case": vbd_trajectory_precision_diagnostic_v3_case_body(),
        "lane_order": list(VBD_TRAJECTORY_LANES),
        "parameter_order": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
        ),
        "prefix_draws_per_chain": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS
        ),
        "mcse_endpoint_order": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS
        ),
        "tail_probabilities": list(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TAIL_PROBABILITIES
        ),
        "sampler_settings": vbd_nuts_execution_settings("full").to_dict(),
        "bundle_child_timeout_seconds": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_TIMEOUT_SECONDS
        ),
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
        "state": "HOLD",
        "hold_reasons": [VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_HOLD_REASON],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_v3_seed_manifest()[
            "seed_manifest_hash"
        ],
    }
    return {**body, "diagnostic_plan_hash": sha256_json(body)}


def _diagnostic_metric_trees(prefix_idata) -> tuple[tuple[str, object], ...]:
    variables = list(VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES)
    return (
        ("r_hat", az.rhat(prefix_idata, var_names=variables)),
        ("bulk_ess", az.ess(prefix_idata, var_names=variables, method="bulk")),
        ("tail_ess", az.ess(prefix_idata, var_names=variables, method="tail")),
        (
            "quantile_ess_005",
            az.ess(prefix_idata, var_names=variables, method="quantile", prob=0.005),
        ),
        (
            "quantile_ess_995",
            az.ess(prefix_idata, var_names=variables, method="quantile", prob=0.995),
        ),
        ("mean", az.mcse(prefix_idata, var_names=variables, method="mean")),
        (
            "interval_80_lower",
            az.mcse(
                prefix_idata,
                var_names=variables,
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_80[0],
            ),
        ),
        (
            "interval_80_upper",
            az.mcse(
                prefix_idata,
                var_names=variables,
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_80[1],
            ),
        ),
        (
            "interval_99_lower",
            az.mcse(
                prefix_idata,
                var_names=variables,
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_99[0],
            ),
        ),
        (
            "interval_99_upper",
            az.mcse(
                prefix_idata,
                var_names=variables,
                method="quantile",
                prob=VBD_TRAJECTORY_INTERVAL_99[1],
            ),
        ),
    )


def _weighted_endpoint(values: np.ndarray, stable_indexes: np.ndarray, prob: float) -> float:
    return weighted_quantile_v1(
        np.asarray(values, dtype=np.float64),
        np.ones(len(values), dtype=np.float64),
        np.asarray(stable_indexes, dtype=np.int64),
        prob,
    )


def _prefix_parameter_rows(
    idata, prefix_draws: int, *, require_canonical_storage_order: bool = True
) -> list[dict]:
    prefix = idata.isel(draw=slice(0, prefix_draws))
    posterior = prefix.posterior
    trees = _diagnostic_metric_trees(prefix)
    rows: list[dict] = []
    actual_variables = tuple(posterior.data_vars)
    variable_identity_valid = (
        actual_variables == VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES
        if require_canonical_storage_order
        else (
            all(type(name) is str for name in actual_variables)
            and len(actual_variables) == len(VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES)
            and set(actual_variables) == set(VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES)
        )
    )
    if not variable_identity_valid:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic posterior variables are missing, extra, malformed, or reordered"
        )
    for variable_name in VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES:
        posterior_variable = posterior[variable_name]
        try:
            (
                parameter_dimensions,
                parameter_shape,
                parameter_coordinates,
                parameter_labels,
            ) = _parameter_labels_and_coordinates(
                variable_name, posterior_variable
            )
            metrics = {
                name: _labeled_diagnostic_rows(
                    tree,
                    variable_name,
                    parameter_dimensions=parameter_dimensions,
                    parameter_shape=parameter_shape,
                    parameter_coordinates=parameter_coordinates,
                    parameter_labels=parameter_labels,
                )
                for name, tree in trees
            }
        except Exception as exc:
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic parameter coordinates are invalid"
            ) from exc
        if any(
            tuple(label for label, _value in metric_rows) != parameter_labels
            for metric_rows in metrics.values()
        ):
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic metric labels do not match posterior labels"
            )
        values = np.asarray(posterior_variable)
        expected_shape = (
            VBD_TRAJECTORY_NUTS_FULL_CHAINS,
            prefix_draws,
            *parameter_shape,
        )
        if (
            values.dtype.kind != "f"
            or values.dtype.itemsize != 8
            or values.shape != expected_shape
            or not np.all(np.isfinite(values))
        ):
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic posterior values are not exact finite binary64 prefixes"
            )
        matrix = values.reshape(VBD_TRAJECTORY_NUTS_FULL_CHAINS, prefix_draws, -1)
        for parameter_index, parameter_name in enumerate(parameter_labels):
            chain_values = matrix[:, :, parameter_index]
            pooled = chain_values.reshape(-1)
            posterior_sd = _finite(
                pooled.std(ddof=1), "diagnostic prefix posterior SD", positive=True
            )
            pooled_indexes = np.concatenate(
                [
                    chain_index * VBD_TRAJECTORY_NUTS_FULL_DRAWS
                    + np.arange(prefix_draws, dtype=np.int64)
                    for chain_index in range(VBD_TRAJECTORY_NUTS_FULL_CHAINS)
                ]
            )
            endpoint_offsets: dict[str, list[float]] = {}
            for probability, key in ((0.005, "q005"), (0.995, "q995")):
                pooled_endpoint = _weighted_endpoint(
                    pooled, pooled_indexes, probability
                )
                offsets = []
                for chain_index in range(VBD_TRAJECTORY_NUTS_FULL_CHAINS):
                    chain_indexes = (
                        chain_index * VBD_TRAJECTORY_NUTS_FULL_DRAWS
                        + np.arange(prefix_draws, dtype=np.int64)
                    )
                    chain_endpoint = _weighted_endpoint(
                        chain_values[chain_index], chain_indexes, probability
                    )
                    offset = (chain_endpoint - pooled_endpoint) / posterior_sd
                    offsets.append(_finite(offset, "chain endpoint offset"))
                endpoint_offsets[key] = offsets
            mcse_ratios = {
                endpoint: _nonnegative(
                    dict(metrics[endpoint])[parameter_name] / posterior_sd,
                    f"{endpoint} MCSE ratio",
                )
                for endpoint in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS
            }
            body = {
                "prefix_draws_per_chain": prefix_draws,
                "parameter_name": parameter_name,
                "r_hat": _finite(
                    dict(metrics["r_hat"])[parameter_name],
                    "R-hat",
                    positive=True,
                ),
                "bulk_ess": _finite(
                    dict(metrics["bulk_ess"])[parameter_name],
                    "bulk ESS",
                    positive=True,
                ),
                "tail_ess": _finite(
                    dict(metrics["tail_ess"])[parameter_name],
                    "tail ESS",
                    positive=True,
                ),
                "quantile_ess_005": _finite(
                    dict(metrics["quantile_ess_005"])[parameter_name],
                    "0.005 quantile ESS",
                    positive=True,
                ),
                "quantile_ess_995": _finite(
                    dict(metrics["quantile_ess_995"])[parameter_name],
                    "0.995 quantile ESS",
                    positive=True,
                ),
                "mcse_to_posterior_sd_ratios": mcse_ratios,
                "chain_endpoint_offsets": endpoint_offsets,
            }
            rows.append({**body, "row_hash": sha256_json(body)})
    return rows


def _validate_trace_identity(idata) -> None:
    try:
        posterior = idata.posterior
        sample_stats = idata.sample_stats
    except AttributeError as exc:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic requires posterior and sample_stats groups"
        ) from exc
    if tuple(str(name) for name in posterior.data_vars) != (
        VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic posterior variable order is not canonical"
        )
    for group, label in ((posterior, "posterior"), (sample_stats, "sample_stats")):
        if "chain" not in group.dims or "draw" not in group.dims:
            raise VbdTrajectoryPrecisionDiagnosticError(
                f"diagnostic {label} lacks chain/draw dimensions"
            )
        chain = np.asarray(group.coords["chain"])
        draw = np.asarray(group.coords["draw"])
        if (
            chain.dtype.kind not in "iu"
            or draw.dtype.kind not in "iu"
            or not np.array_equal(
                chain, np.arange(VBD_TRAJECTORY_NUTS_FULL_CHAINS)
            )
            or not np.array_equal(
                draw, np.arange(VBD_TRAJECTORY_NUTS_FULL_DRAWS)
            )
        ):
            raise VbdTrajectoryPrecisionDiagnosticError(
                f"diagnostic {label} coordinates are reordered or incomplete"
            )


def _validate_trace_identity_v2(idata) -> None:
    try:
        posterior = idata.posterior
        sample_stats = idata.sample_stats
    except AttributeError as exc:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 requires posterior and sample_stats groups"
        ) from exc
    variables = tuple(posterior.data_vars)
    if (
        not all(type(name) is str for name in variables)
        or len(variables) != len(VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES)
        or set(variables) != set(VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 posterior variable set is not exact"
        )
    for group, label in ((posterior, "posterior"), (sample_stats, "sample_stats")):
        if "chain" not in group.dims or "draw" not in group.dims:
            raise VbdTrajectoryPrecisionDiagnosticError(
                f"diagnostic V2 {label} lacks chain/draw dimensions"
            )
        chain = np.asarray(group.coords["chain"])
        draw = np.asarray(group.coords["draw"])
        if (
            chain.dtype.kind not in "iu"
            or draw.dtype.kind not in "iu"
            or not np.array_equal(
                chain, np.arange(VBD_TRAJECTORY_NUTS_FULL_CHAINS)
            )
            or not np.array_equal(draw, np.arange(VBD_TRAJECTORY_NUTS_FULL_DRAWS))
        ):
            raise VbdTrajectoryPrecisionDiagnosticError(
                f"diagnostic V2 {label} coordinates are reordered or incomplete"
            )


def _full_sampler_summary(idata) -> tuple[int, int, list[float]]:
    settings = vbd_nuts_execution_settings("full")
    sample_stats = idata.sample_stats
    divergences, divergence_valid = _sample_stat_count(
        sample_stats, "diverging", settings, binary=True
    )
    reached_count = None
    reached_valid = False
    depth_count = None
    depth_valid = False
    if "reached_max_treedepth" in sample_stats.data_vars:
        reached_count, reached_valid = _sample_stat_count(
            sample_stats, "reached_max_treedepth", settings, binary=True
        )
    if "tree_depth" in sample_stats.data_vars:
        depth_count, depth_valid = _sample_stat_count(
            sample_stats,
            "tree_depth",
            settings,
            binary=False,
            threshold=VBD_TRAJECTORY_NUTS_FULL_MAX_TREEDEPTH,
        )
    if reached_count is not None and depth_count is not None:
        treedepth = reached_count
        treedepth_valid = reached_valid and depth_valid and reached_count == depth_count
    elif reached_count is not None:
        treedepth = reached_count
        treedepth_valid = reached_valid
    elif depth_count is not None:
        treedepth = depth_count
        treedepth_valid = depth_valid
    else:
        treedepth = -1
        treedepth_valid = False
    try:
        bfmi = np.asarray(_bfmi_values(idata), dtype=np.float64)
    except Exception as exc:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic BFMI is unavailable"
        ) from exc
    if (
        not divergence_valid
        or not treedepth_valid
        or type(divergences) is not int
        or divergences < 0
        or type(treedepth) is not int
        or treedepth < 0
        or bfmi.shape != (VBD_TRAJECTORY_NUTS_FULL_CHAINS,)
        or not np.all(np.isfinite(bfmi))
        or np.any(bfmi <= 0.0)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic full sampler summary is malformed"
        )
    return divergences, treedepth, [float(value) for value in bfmi]


def _non_mcse_failures(
    full_rows: list[dict], divergences: int, treedepth: int, bfmi: list[float]
) -> list[str]:
    failures = []
    if any(row["r_hat"] > VBD_TRAJECTORY_NUTS_RHAT_MAX for row in full_rows):
        failures.append("r_hat")
    if any(row["bulk_ess"] < VBD_TRAJECTORY_NUTS_ESS_MIN for row in full_rows):
        failures.append("bulk_ess")
    if any(row["tail_ess"] < VBD_TRAJECTORY_NUTS_ESS_MIN for row in full_rows):
        failures.append("tail_ess")
    if divergences != 0:
        failures.append("divergences")
    if treedepth != 0:
        failures.append("max_treedepth_saturation")
    if any(value < VBD_TRAJECTORY_NUTS_BFMI_MIN for value in bfmi):
        failures.append("energy_bfmi")
    return failures


def project_vbd_trajectory_precision_diagnostic_lane(
    idata,
    *,
    lane: str,
    lane_ordinal: int,
    binding: TrajectoryNutsPrecisionDiagnosticBinding,
    prepared_input_hash: str,
    model_input_hash: str,
) -> dict:
    """Project one complete trace to the bounded diagnostic matrix."""

    if (
        lane not in VBD_TRAJECTORY_LANES
        or type(lane_ordinal) is not int
        or VBD_TRAJECTORY_LANES[lane_ordinal] != lane
        or type(binding) is not TrajectoryNutsPrecisionDiagnosticBinding
        or binding.lane != lane
        or binding.lane_ordinal != lane_ordinal
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic lane binding is invalid"
        )
    _strict_sha256(prepared_input_hash, "prepared input hash")
    _strict_sha256(model_input_hash, "model input hash")
    _validate_trace_identity(idata)
    rows = []
    for prefix_draws in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS:
        prefix_rows = _prefix_parameter_rows(idata, prefix_draws)
        if tuple(row["parameter_name"] for row in prefix_rows) != (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
        ):
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic parameter row order is invalid"
            )
        rows.extend(prefix_rows)
    if len(rows) != 36:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic lane row cardinality is invalid"
        )
    divergences, treedepth, bfmi = _full_sampler_summary(idata)
    full_rows = [
        row
        for row in rows
        if row["prefix_draws_per_chain"] == VBD_TRAJECTORY_NUTS_FULL_DRAWS
    ]
    failures = _non_mcse_failures(full_rows, divergences, treedepth, bfmi)
    binding_value = {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }
    lane_fit = {
        "prepared_input_hash": prepared_input_hash,
        "model_input_hash": model_input_hash,
        "parameter_rows": rows,
        "post_warmup_divergences": divergences,
        "max_treedepth_saturation_count": treedepth,
        "energy_bfmi_by_chain": bfmi,
        "non_mcse_sampler_failures": failures,
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
    }
    fit_body = {**lane_fit, "binding_hash": binding.binding_hash}
    body = {
        "lane": lane,
        "lane_ordinal": lane_ordinal,
        "binding": binding_value,
        **lane_fit,
        "fit_summary_hash": sha256_json(fit_body),
    }
    return {**body, "lane_result_hash": sha256_json(body)}


def project_vbd_trajectory_precision_diagnostic_v2_lane(
    idata,
    *,
    lane: str,
    lane_ordinal: int,
    binding: TrajectoryNutsPrecisionDiagnosticV2Binding,
    prepared_input_hash: str,
    model_input_hash: str,
) -> dict:
    """Project V2 by exact variable set and canonical name lookup."""

    if (
        lane not in VBD_TRAJECTORY_LANES
        or type(lane_ordinal) is not int
        or not 0 <= lane_ordinal < len(VBD_TRAJECTORY_LANES)
        or VBD_TRAJECTORY_LANES[lane_ordinal] != lane
        or type(binding) is not TrajectoryNutsPrecisionDiagnosticV2Binding
        or binding.lane != lane
        or binding.lane_ordinal != lane_ordinal
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 lane binding is invalid"
        )
    _strict_sha256(prepared_input_hash, "prepared input hash")
    _strict_sha256(model_input_hash, "model input hash")
    _validate_trace_identity_v2(idata)
    rows = []
    for prefix_draws in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS:
        prefix_rows = _prefix_parameter_rows(
            idata,
            prefix_draws,
            require_canonical_storage_order=False,
        )
        if tuple(row["parameter_name"] for row in prefix_rows) != (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
        ):
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic V2 parameter row order is invalid"
            )
        rows.extend(prefix_rows)
    if len(rows) != 36:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 lane row cardinality is invalid"
        )
    divergences, treedepth, bfmi = _full_sampler_summary(idata)
    full_rows = [
        row
        for row in rows
        if row["prefix_draws_per_chain"] == VBD_TRAJECTORY_NUTS_FULL_DRAWS
    ]
    failures = _non_mcse_failures(full_rows, divergences, treedepth, bfmi)
    binding_value = {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }
    lane_fit = {
        "prepared_input_hash": prepared_input_hash,
        "model_input_hash": model_input_hash,
        "parameter_rows": rows,
        "post_warmup_divergences": divergences,
        "max_treedepth_saturation_count": treedepth,
        "energy_bfmi_by_chain": bfmi,
        "non_mcse_sampler_failures": failures,
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
    }
    fit_body = {**lane_fit, "binding_hash": binding.binding_hash}
    body = {
        "lane": lane,
        "lane_ordinal": lane_ordinal,
        "binding": binding_value,
        **lane_fit,
        "fit_summary_hash": sha256_json(fit_body),
    }
    return {**body, "lane_result_hash": sha256_json(body)}


def project_vbd_trajectory_precision_diagnostic_v3_lane(
    idata,
    *,
    lane: str,
    lane_ordinal: int,
    binding: TrajectoryNutsPrecisionDiagnosticV3Binding,
    prepared_input_hash: str,
    model_input_hash: str,
) -> dict:
    """Project V3 by exact variable set and canonical name lookup."""

    if (
        lane not in VBD_TRAJECTORY_LANES
        or type(lane_ordinal) is not int
        or not 0 <= lane_ordinal < len(VBD_TRAJECTORY_LANES)
        or VBD_TRAJECTORY_LANES[lane_ordinal] != lane
        or type(binding) is not TrajectoryNutsPrecisionDiagnosticV3Binding
        or binding.lane != lane
        or binding.lane_ordinal != lane_ordinal
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 lane binding is invalid"
        )
    _strict_sha256(prepared_input_hash, "prepared input hash")
    _strict_sha256(model_input_hash, "model input hash")
    _validate_trace_identity_v2(idata)
    rows = []
    for prefix_draws in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS:
        prefix_rows = _prefix_parameter_rows(
            idata,
            prefix_draws,
            require_canonical_storage_order=False,
        )
        if tuple(row["parameter_name"] for row in prefix_rows) != (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
        ):
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic V3 parameter row order is invalid"
            )
        rows.extend(prefix_rows)
    if len(rows) != 36:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 lane row cardinality is invalid"
        )
    divergences, treedepth, bfmi = _full_sampler_summary(idata)
    full_rows = [
        row
        for row in rows
        if row["prefix_draws_per_chain"] == VBD_TRAJECTORY_NUTS_FULL_DRAWS
    ]
    failures = _non_mcse_failures(full_rows, divergences, treedepth, bfmi)
    binding_value = {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }
    lane_fit = {
        "prepared_input_hash": prepared_input_hash,
        "model_input_hash": model_input_hash,
        "parameter_rows": rows,
        "post_warmup_divergences": divergences,
        "max_treedepth_saturation_count": treedepth,
        "energy_bfmi_by_chain": bfmi,
        "non_mcse_sampler_failures": failures,
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
    }
    fit_body = {**lane_fit, "binding_hash": binding.binding_hash}
    body = {
        "lane": lane,
        "lane_ordinal": lane_ordinal,
        "binding": binding_value,
        **lane_fit,
        "fit_summary_hash": sha256_json(fit_body),
    }
    return {**body, "lane_result_hash": sha256_json(body)}


def _validate_parameter_row(value: object, *, prefix: int, parameter: str) -> dict:
    expected_keys = {
        "prefix_draws_per_chain",
        "parameter_name",
        "r_hat",
        "bulk_ess",
        "tail_ess",
        "quantile_ess_005",
        "quantile_ess_995",
        "mcse_to_posterior_sd_ratios",
        "chain_endpoint_offsets",
        "row_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic parameter row shape is invalid"
        )
    ratios = value["mcse_to_posterior_sd_ratios"]
    offsets = value["chain_endpoint_offsets"]
    if (
        value["prefix_draws_per_chain"] != prefix
        or value["parameter_name"] != parameter
        or type(ratios) is not dict
        or tuple(ratios) != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS
        or type(offsets) is not dict
        or tuple(offsets) != ("q005", "q995")
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic parameter row order is invalid"
        )
    for key in ("r_hat", "bulk_ess", "tail_ess", "quantile_ess_005", "quantile_ess_995"):
        _finite(value[key], key, positive=True)
    for endpoint in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS:
        _nonnegative(ratios[endpoint], f"{endpoint} ratio")
    for key in ("q005", "q995"):
        if type(offsets[key]) is not list or len(offsets[key]) != 4:
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic endpoint offsets are incomplete"
            )
        for item in offsets[key]:
            _finite(item, "diagnostic endpoint offset")
    body = {key: item for key, item in value.items() if key != "row_hash"}
    if value["row_hash"] != sha256_json(body):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic parameter row hash is invalid"
        )
    return value


def _validate_parameter_row_v3(
    value: object, *, prefix: int, parameter: str
) -> dict:
    """Validate mapping keys by exact set, then traverse canonical names."""

    expected_keys = {
        "prefix_draws_per_chain",
        "parameter_name",
        "r_hat",
        "bulk_ess",
        "tail_ess",
        "quantile_ess_005",
        "quantile_ess_995",
        "mcse_to_posterior_sd_ratios",
        "chain_endpoint_offsets",
        "row_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 parameter row shape is invalid"
        )
    ratios = value["mcse_to_posterior_sd_ratios"]
    offsets = value["chain_endpoint_offsets"]
    if (
        value["prefix_draws_per_chain"] != prefix
        or value["parameter_name"] != parameter
        or type(ratios) is not dict
        or set(ratios) != set(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS)
        or not all(type(key) is str for key in ratios)
        or type(offsets) is not dict
        or set(offsets) != {"q005", "q995"}
        or not all(type(key) is str for key in offsets)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 parameter row identity is invalid"
        )
    for key in (
        "r_hat",
        "bulk_ess",
        "tail_ess",
        "quantile_ess_005",
        "quantile_ess_995",
    ):
        _finite(value[key], key, positive=True)
    for endpoint in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS:
        _nonnegative(ratios[endpoint], f"{endpoint} ratio")
    for key in ("q005", "q995"):
        if type(offsets[key]) is not list or len(offsets[key]) != 4:
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic V3 endpoint offsets are incomplete"
            )
        for item in offsets[key]:
            _finite(item, "diagnostic V3 endpoint offset")
    body = {key: item for key, item in value.items() if key != "row_hash"}
    if value["row_hash"] != sha256_json(body):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 parameter row hash is invalid"
        )
    return value


def validate_vbd_trajectory_precision_diagnostic_lane(value: object) -> dict:
    expected_keys = {
        "lane",
        "lane_ordinal",
        "binding",
        "prepared_input_hash",
        "model_input_hash",
        "parameter_rows",
        "post_warmup_divergences",
        "max_treedepth_saturation_count",
        "energy_bfmi_by_chain",
        "non_mcse_sampler_failures",
        "ppc_state",
        "cross_engine_state",
        "fit_summary_hash",
        "lane_result_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic lane result shape is invalid"
        )
    lane = value["lane"]
    lane_ordinal = value["lane_ordinal"]
    if (
        lane not in VBD_TRAJECTORY_LANES
        or type(lane_ordinal) is not int
        or not 0 <= lane_ordinal < len(VBD_TRAJECTORY_LANES)
        or VBD_TRAJECTORY_LANES[lane_ordinal] != lane
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic lane identity is invalid"
        )
    binding_value = value["binding"]
    if type(binding_value) is not dict:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic binding is invalid"
        )
    expected_plan_hash = sha256_json(
        vbd_trajectory_precision_diagnostic_case_body()
    )
    if binding_value.get("plan_hash") != expected_plan_hash:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic binding differs from its compiled case plan"
        )
    binding = build_vbd_trajectory_nuts_precision_diagnostic_binding(
        generator_seed=binding_value.get("generator_seed"),
        lane=lane,
        lane_ordinal=lane_ordinal,
        plan_hash=binding_value.get("plan_hash"),
    )
    expected_binding = {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }
    if binding_value != expected_binding:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic binding differs from its compiled identity"
        )
    _strict_sha256(value["prepared_input_hash"], "prepared input hash")
    _strict_sha256(value["model_input_hash"], "model input hash")
    rows = value["parameter_rows"]
    if type(rows) is not list or len(rows) != 36:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic lane rows are incomplete"
        )
    expected_coordinates = [
        (prefix, parameter)
        for prefix in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS
        for parameter in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
    ]
    for row, (prefix, parameter) in zip(rows, expected_coordinates, strict=True):
        _validate_parameter_row(row, prefix=prefix, parameter=parameter)
    for key in (
        "post_warmup_divergences",
        "max_treedepth_saturation_count",
    ):
        if type(value[key]) is not int or value[key] < 0:
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic sampler count is invalid"
            )
    bfmi = value["energy_bfmi_by_chain"]
    if type(bfmi) is not list or len(bfmi) != 4:
        raise VbdTrajectoryPrecisionDiagnosticError("diagnostic BFMI is incomplete")
    for item in bfmi:
        _finite(item, "diagnostic BFMI", positive=True)
    full_rows = [row for row in rows if row["prefix_draws_per_chain"] == 20_000]
    failures = _non_mcse_failures(
        full_rows,
        value["post_warmup_divergences"],
        value["max_treedepth_saturation_count"],
        bfmi,
    )
    if (
        value["non_mcse_sampler_failures"] != failures
        or value["ppc_state"] != "NOT_RUN"
        or value["cross_engine_state"] != "NOT_RUN"
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic failure or NOT_RUN state is invalid"
        )
    fit_body = {
        key: value[key]
        for key in (
            "prepared_input_hash",
            "model_input_hash",
            "parameter_rows",
            "post_warmup_divergences",
            "max_treedepth_saturation_count",
            "energy_bfmi_by_chain",
            "non_mcse_sampler_failures",
            "ppc_state",
            "cross_engine_state",
        )
    }
    fit_body["binding_hash"] = binding.binding_hash
    body = {key: item for key, item in value.items() if key != "lane_result_hash"}
    if (
        value["fit_summary_hash"] != sha256_json(fit_body)
        or value["lane_result_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic lane hash hierarchy is invalid"
        )
    return value


def validate_vbd_trajectory_precision_diagnostic_v2_lane(value: object) -> dict:
    expected_keys = {
        "lane",
        "lane_ordinal",
        "binding",
        "prepared_input_hash",
        "model_input_hash",
        "parameter_rows",
        "post_warmup_divergences",
        "max_treedepth_saturation_count",
        "energy_bfmi_by_chain",
        "non_mcse_sampler_failures",
        "ppc_state",
        "cross_engine_state",
        "fit_summary_hash",
        "lane_result_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 lane result shape is invalid"
        )
    lane = value["lane"]
    lane_ordinal = value["lane_ordinal"]
    if (
        lane not in VBD_TRAJECTORY_LANES
        or type(lane_ordinal) is not int
        or not 0 <= lane_ordinal < len(VBD_TRAJECTORY_LANES)
        or VBD_TRAJECTORY_LANES[lane_ordinal] != lane
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 lane identity is invalid"
        )
    binding_value = value["binding"]
    if type(binding_value) is not dict:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 binding is invalid"
        )
    expected_plan_hash = sha256_json(
        vbd_trajectory_precision_diagnostic_v2_case_body()
    )
    if binding_value.get("plan_hash") != expected_plan_hash:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 binding differs from its compiled case plan"
        )
    binding = build_vbd_trajectory_nuts_precision_diagnostic_v2_binding(
        generator_seed=binding_value.get("generator_seed"),
        lane=lane,
        lane_ordinal=lane_ordinal,
        plan_hash=binding_value.get("plan_hash"),
    )
    expected_binding = {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }
    if binding_value != expected_binding:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 binding differs from its compiled identity"
        )
    _strict_sha256(value["prepared_input_hash"], "prepared input hash")
    _strict_sha256(value["model_input_hash"], "model input hash")
    rows = value["parameter_rows"]
    if type(rows) is not list or len(rows) != 36:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 lane rows are incomplete"
        )
    expected_coordinates = [
        (prefix, parameter)
        for prefix in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS
        for parameter in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
    ]
    for row, (prefix, parameter) in zip(rows, expected_coordinates, strict=True):
        _validate_parameter_row(row, prefix=prefix, parameter=parameter)
    for key in ("post_warmup_divergences", "max_treedepth_saturation_count"):
        if type(value[key]) is not int or value[key] < 0:
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic V2 sampler count is invalid"
            )
    bfmi = value["energy_bfmi_by_chain"]
    if type(bfmi) is not list or len(bfmi) != 4:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 BFMI is incomplete"
        )
    for item in bfmi:
        _finite(item, "diagnostic V2 BFMI", positive=True)
    full_rows = [row for row in rows if row["prefix_draws_per_chain"] == 20_000]
    failures = _non_mcse_failures(
        full_rows,
        value["post_warmup_divergences"],
        value["max_treedepth_saturation_count"],
        bfmi,
    )
    if (
        value["non_mcse_sampler_failures"] != failures
        or value["ppc_state"] != "NOT_RUN"
        or value["cross_engine_state"] != "NOT_RUN"
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 failure or NOT_RUN state is invalid"
        )
    fit_body = {
        key: value[key]
        for key in (
            "prepared_input_hash",
            "model_input_hash",
            "parameter_rows",
            "post_warmup_divergences",
            "max_treedepth_saturation_count",
            "energy_bfmi_by_chain",
            "non_mcse_sampler_failures",
            "ppc_state",
            "cross_engine_state",
        )
    }
    fit_body["binding_hash"] = binding.binding_hash
    body = {key: item for key, item in value.items() if key != "lane_result_hash"}
    if (
        value["fit_summary_hash"] != sha256_json(fit_body)
        or value["lane_result_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 lane hash hierarchy is invalid"
        )
    return value


def validate_vbd_trajectory_precision_diagnostic_v3_lane(value: object) -> dict:
    expected_keys = {
        "lane",
        "lane_ordinal",
        "binding",
        "prepared_input_hash",
        "model_input_hash",
        "parameter_rows",
        "post_warmup_divergences",
        "max_treedepth_saturation_count",
        "energy_bfmi_by_chain",
        "non_mcse_sampler_failures",
        "ppc_state",
        "cross_engine_state",
        "fit_summary_hash",
        "lane_result_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 lane result shape is invalid"
        )
    lane = value["lane"]
    lane_ordinal = value["lane_ordinal"]
    if (
        lane not in VBD_TRAJECTORY_LANES
        or type(lane_ordinal) is not int
        or not 0 <= lane_ordinal < len(VBD_TRAJECTORY_LANES)
        or VBD_TRAJECTORY_LANES[lane_ordinal] != lane
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 lane identity is invalid"
        )
    binding_value = value["binding"]
    if type(binding_value) is not dict:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 binding is invalid"
        )
    expected_plan_hash = sha256_json(
        vbd_trajectory_precision_diagnostic_v3_case_body()
    )
    if binding_value.get("plan_hash") != expected_plan_hash:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 binding differs from its compiled case plan"
        )
    binding = build_vbd_trajectory_nuts_precision_diagnostic_v3_binding(
        generator_seed=binding_value.get("generator_seed"),
        lane=lane,
        lane_ordinal=lane_ordinal,
        plan_hash=binding_value.get("plan_hash"),
    )
    expected_binding = {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }
    if binding_value != expected_binding:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 binding differs from its compiled identity"
        )
    _strict_sha256(value["prepared_input_hash"], "prepared input hash")
    _strict_sha256(value["model_input_hash"], "model input hash")
    rows = value["parameter_rows"]
    if type(rows) is not list or len(rows) != 36:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 lane rows are incomplete"
        )
    expected_coordinates = [
        (prefix, parameter)
        for prefix in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_PREFIX_DRAWS
        for parameter in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
    ]
    for row, (prefix, parameter) in zip(rows, expected_coordinates, strict=True):
        _validate_parameter_row_v3(row, prefix=prefix, parameter=parameter)
    for key in ("post_warmup_divergences", "max_treedepth_saturation_count"):
        if type(value[key]) is not int or value[key] < 0:
            raise VbdTrajectoryPrecisionDiagnosticError(
                "diagnostic V3 sampler count is invalid"
            )
    bfmi = value["energy_bfmi_by_chain"]
    if type(bfmi) is not list or len(bfmi) != 4:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 BFMI is incomplete"
        )
    for item in bfmi:
        _finite(item, "diagnostic V3 BFMI", positive=True)
    full_rows = [row for row in rows if row["prefix_draws_per_chain"] == 20_000]
    failures = _non_mcse_failures(
        full_rows,
        value["post_warmup_divergences"],
        value["max_treedepth_saturation_count"],
        bfmi,
    )
    if (
        value["non_mcse_sampler_failures"] != failures
        or value["ppc_state"] != "NOT_RUN"
        or value["cross_engine_state"] != "NOT_RUN"
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 failure or NOT_RUN state is invalid"
        )
    fit_body = {
        key: value[key]
        for key in (
            "prepared_input_hash",
            "model_input_hash",
            "parameter_rows",
            "post_warmup_divergences",
            "max_treedepth_saturation_count",
            "energy_bfmi_by_chain",
            "non_mcse_sampler_failures",
            "ppc_state",
            "cross_engine_state",
        )
    }
    fit_body["binding_hash"] = binding.binding_hash
    body = {key: item for key, item in value.items() if key != "lane_result_hash"}
    if (
        value["fit_summary_hash"] != sha256_json(fit_body)
        or value["lane_result_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 lane hash hierarchy is invalid"
        )
    return value


def _canary_failure_anchor() -> dict:
    body = {
        "canary_ordinal": 0,
        "source_commit": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_CANARY_SOURCE_COMMIT,
        "failure_record_commit": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_FAILURE_RECORD_COMMIT
        ),
        "state": "HOLD",
        "failing_categories": ["mcse"],
        "retry_authorized": False,
    }
    return {**body, "anchor_hash": sha256_json(body)}


def _derived_mcse_failures(lane_records: list[dict]) -> list[dict]:
    failures = []
    for lane_record in lane_records:
        for row in lane_record["parameter_rows"]:
            if row["prefix_draws_per_chain"] != 20_000:
                continue
            for endpoint in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS:
                ratio = row["mcse_to_posterior_sd_ratios"][endpoint]
                if ratio > VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX:
                    failures.append(
                        {
                            "lane": lane_record["lane"],
                            "lane_ordinal": lane_record["lane_ordinal"],
                            "parameter_name": row["parameter_name"],
                            "endpoint": endpoint,
                            "mcse_to_posterior_sd_ratio": ratio,
                        }
                    )
    return failures


def build_vbd_trajectory_precision_diagnostic_record(
    *,
    provenance: dict,
    lane_records: list[dict],
) -> dict:
    """Build the complete non-evidentiary record from validated lane rows."""

    validated_lanes = [
        validate_vbd_trajectory_precision_diagnostic_lane(value)
        for value in lane_records
    ]
    if [value["lane"] for value in validated_lanes] != list(VBD_TRAJECTORY_LANES):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic result lane order is incomplete"
        )
    expected_provenance_keys = {
        "authorization_commit",
        "authorization_manifest_hash",
        "execution_authorization_hash",
        "implementation_commit",
        "implementation_tree",
        "implementation_review_refs",
        "canonical_workspace_identity_hash",
        "external_claim_hash",
        "input_binding_hash",
        "runtime_identity_hash",
        "requirements_lock_hash",
        "implementation_hash",
        "native_library_manifest_hash",
        "model_manifest_hash",
        "synthetic_input_hash",
        "panel_manifest_root",
    }
    if type(provenance) is not dict or set(provenance) != expected_provenance_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic provenance shape is invalid"
        )
    for key, value in provenance.items():
        if key == "implementation_review_refs":
            from .vbd_trajectory_validation_resumable import (
                _implementation_review_refs_are_valid,
            )

            if not _implementation_review_refs_are_valid(
                value, provenance["implementation_commit"]
            ):
                raise VbdTrajectoryPrecisionDiagnosticError(
                    "diagnostic implementation review references are invalid"
                )
            continue
        if key in {
            "authorization_commit",
            "implementation_commit",
            "implementation_tree",
        }:
            _strict_git_object_id(value, key)
        else:
            _strict_sha256(value, key)
    failures = _derived_mcse_failures(validated_lanes)
    all_coordinates = []
    for lane_record in validated_lanes:
        for row in lane_record["parameter_rows"]:
            if row["prefix_draws_per_chain"] != 20_000:
                continue
            for endpoint in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS:
                all_coordinates.append(
                    {
                        "lane": lane_record["lane"],
                        "lane_ordinal": lane_record["lane_ordinal"],
                        "parameter_name": row["parameter_name"],
                        "endpoint": endpoint,
                        "mcse_to_posterior_sd_ratio": row[
                            "mcse_to_posterior_sd_ratios"
                        ][endpoint],
                    }
                )
    worst = max(
        all_coordinates,
        key=lambda item: item["mcse_to_posterior_sd_ratio"],
    )
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_ID,
        "canary_failure_anchor": _canary_failure_anchor(),
        "provenance": provenance,
        "diagnostic_plan_hash": vbd_trajectory_precision_diagnostic_plan()[
            "diagnostic_plan_hash"
        ],
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_seed_manifest()[
            "seed_manifest_hash"
        ],
        "lane_records": validated_lanes,
        "full_prefix_failing_coordinates": failures,
        "worst_coordinate": worst,
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
        "state": "HOLD",
        "hold_reasons": [VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_HOLD_REASON],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "acceptance_complete": False,
        "task_2_6_complete": False,
        "task_5_6_complete": False,
        "customer_output_authorized": False,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
    }
    return {**body, "record_hash": sha256_json(body)}


def validate_vbd_trajectory_precision_diagnostic_record(value: object) -> dict:
    expected_keys = {
        "schema_version",
        "diagnostic_id",
        "canary_failure_anchor",
        "provenance",
        "diagnostic_plan_hash",
        "seed_manifest_hash",
        "lane_records",
        "full_prefix_failing_coordinates",
        "worst_coordinate",
        "ppc_state",
        "cross_engine_state",
        "state",
        "hold_reasons",
        "evidence_eligible",
        "acceptance_count_effect",
        "acceptance_complete",
        "task_2_6_complete",
        "task_5_6_complete",
        "customer_output_authorized",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "record_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic record shape is invalid"
        )
    rebuilt = build_vbd_trajectory_precision_diagnostic_record(
        provenance=value["provenance"],
        lane_records=value["lane_records"],
    )
    if value != rebuilt:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic record differs from independent reconstruction"
        )
    return value


def _consumed_v1_execution_anchor() -> dict:
    body = {
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_ID,
        "implementation_commit": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
        ),
        "authorization_commit": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT
        ),
        "authorization_manifest_hash": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH
        ),
        "execution_authorization_hash": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH
        ),
        "claim_hash": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
        "input_binding_hash": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH
        ),
        "state": "HOLD",
        "statistical_result_available": False,
        "retry_authorized": False,
    }
    return {**body, "anchor_hash": sha256_json(body)}


def build_vbd_trajectory_precision_diagnostic_v2_record(
    *,
    provenance: dict,
    lane_records: list[dict],
    terminal_checkpoint_hash: str,
) -> dict:
    validated_lanes = [
        validate_vbd_trajectory_precision_diagnostic_v2_lane(value)
        for value in lane_records
    ]
    if [value["lane"] for value in validated_lanes] != list(VBD_TRAJECTORY_LANES):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 result lane order is incomplete"
        )
    expected_provenance_keys = {
        "authorization_commit",
        "authorization_manifest_hash",
        "execution_authorization_hash",
        "implementation_commit",
        "implementation_tree",
        "implementation_review_refs",
        "canonical_workspace_identity_hash",
        "external_claim_hash",
        "input_binding_hash",
        "runtime_identity_hash",
        "requirements_lock_hash",
        "implementation_hash",
        "native_library_manifest_hash",
        "model_manifest_hash",
        "synthetic_input_hash",
        "panel_manifest_root",
    }
    if type(provenance) is not dict or set(provenance) != expected_provenance_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 provenance shape is invalid"
        )
    consumed_v1_values = {
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
    }
    if any(
        item in consumed_v1_values
        for item in provenance.values()
        if type(item) is str
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "consumed V1 provenance cannot satisfy diagnostic V2"
        )
    for key, value in provenance.items():
        if key == "implementation_review_refs":
            from .vbd_trajectory_validation_resumable import (
                _implementation_review_refs_are_valid,
            )

            if not _implementation_review_refs_are_valid(
                value, provenance["implementation_commit"]
            ):
                raise VbdTrajectoryPrecisionDiagnosticError(
                    "diagnostic V2 implementation review references are invalid"
                )
        elif key in {
            "authorization_commit",
            "implementation_commit",
            "implementation_tree",
        }:
            _strict_git_object_id(value, key)
        else:
            _strict_sha256(value, key)
    _strict_sha256(terminal_checkpoint_hash, "terminal checkpoint hash")
    failures = _derived_mcse_failures(validated_lanes)
    all_coordinates = []
    for lane_record in validated_lanes:
        for row in lane_record["parameter_rows"]:
            if row["prefix_draws_per_chain"] != 20_000:
                continue
            for endpoint in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS:
                all_coordinates.append(
                    {
                        "lane": lane_record["lane"],
                        "lane_ordinal": lane_record["lane_ordinal"],
                        "parameter_name": row["parameter_name"],
                        "endpoint": endpoint,
                        "mcse_to_posterior_sd_ratio": row[
                            "mcse_to_posterior_sd_ratios"
                        ][endpoint],
                    }
                )
    worst = max(
        all_coordinates,
        key=lambda item: item["mcse_to_posterior_sd_ratio"],
    )
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID,
        "consumed_v1_execution_anchor": _consumed_v1_execution_anchor(),
        "canary_failure_anchor": _canary_failure_anchor(),
        "provenance": provenance,
        "diagnostic_plan_hash": vbd_trajectory_precision_diagnostic_v2_plan()[
            "diagnostic_plan_hash"
        ],
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_v2_seed_manifest()[
            "seed_manifest_hash"
        ],
        "terminal_checkpoint_hash": terminal_checkpoint_hash,
        "lane_records": validated_lanes,
        "full_prefix_failing_coordinates": failures,
        "worst_coordinate": worst,
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
        "state": "HOLD",
        "hold_reasons": [VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_HOLD_REASON],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "acceptance_complete": False,
        "task_2_6_complete": False,
        "task_5_6_complete": False,
        "customer_output_authorized": False,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
    }
    return {**body, "record_hash": sha256_json(body)}


def validate_vbd_trajectory_precision_diagnostic_v2_record(value: object) -> dict:
    expected_keys = {
        "schema_version",
        "diagnostic_id",
        "consumed_v1_execution_anchor",
        "canary_failure_anchor",
        "provenance",
        "diagnostic_plan_hash",
        "seed_manifest_hash",
        "terminal_checkpoint_hash",
        "lane_records",
        "full_prefix_failing_coordinates",
        "worst_coordinate",
        "ppc_state",
        "cross_engine_state",
        "state",
        "hold_reasons",
        "evidence_eligible",
        "acceptance_count_effect",
        "acceptance_complete",
        "task_2_6_complete",
        "task_5_6_complete",
        "customer_output_authorized",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "record_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 record shape is invalid"
        )
    rebuilt = build_vbd_trajectory_precision_diagnostic_v2_record(
        provenance=value["provenance"],
        lane_records=value["lane_records"],
        terminal_checkpoint_hash=value["terminal_checkpoint_hash"],
    )
    if value != rebuilt:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 record differs from independent reconstruction"
        )
    return value


def validate_vbd_trajectory_precision_diagnostic_v2_record_with_checkpoints(
    value: object,
    *,
    checkpoint_root,
    checkpoint_identity,
) -> dict:
    """Require the complete external checkpoint chain for internal validity."""

    from .vbd_trajectory_precision_diagnostic_v2_checkpoint import (
        validate_vbd_precision_diagnostic_v2_checkpoint_root,
    )

    record = validate_vbd_trajectory_precision_diagnostic_v2_record(value)
    checkpoints = validate_vbd_precision_diagnostic_v2_checkpoint_root(
        root=checkpoint_root,
        identity=checkpoint_identity,
    )
    provenance = record["provenance"]
    if (
        record["terminal_checkpoint_hash"] != checkpoints[-1]["checkpoint_hash"]
        or provenance["implementation_commit"]
        != checkpoint_identity.implementation_commit
        or provenance["authorization_commit"]
        != checkpoint_identity.authorization_commit
        or provenance["authorization_manifest_hash"]
        != checkpoint_identity.authorization_manifest_hash
        or provenance["execution_authorization_hash"]
        != checkpoint_identity.human_execution_authorization_hash
        or provenance["external_claim_hash"]
        != checkpoint_identity.attempt_claim_hash
        or provenance["input_binding_hash"]
        != checkpoints[1]["input_binding_hash"]
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V2 provenance or checkpoint binding is invalid"
        )
    return record


def _consumed_v2_execution_anchor() -> dict:
    body = {
        "implementation_commit": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT
        ),
        "authorization_commit": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT
        ),
        "authorization_manifest_hash": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH
        ),
        "execution_authorization_hash": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_EXECUTION_AUTHORIZATION_HASH
        ),
        "claim_hash": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_HASH,
        "input_binding_hash": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_INPUT_BINDING_HASH
        ),
        "persisted_output_sha256": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256
        ),
        "state": "HOLD",
        "statistical_result_available": False,
        "retry_authorized": False,
    }
    return {**body, "anchor_hash": sha256_json(body)}


def _validate_v3_provenance(provenance: object) -> dict:
    expected_keys = {
        "authorization_commit",
        "authorization_manifest_hash",
        "execution_authorization_hash",
        "implementation_commit",
        "implementation_tree",
        "implementation_review_refs",
        "canonical_workspace_identity_hash",
        "external_claim_hash",
        "input_binding_hash",
        "runtime_identity_hash",
        "requirements_lock_hash",
        "implementation_hash",
        "native_library_manifest_hash",
        "model_manifest_hash",
        "synthetic_input_hash",
        "panel_manifest_root",
    }
    if type(provenance) is not dict or set(provenance) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 provenance shape is invalid"
        )
    consumed_values = {
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_INPUT_BINDING_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
    }
    if any(value in consumed_values for value in provenance.values() if type(value) is str):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "consumed V1/V2 provenance cannot satisfy diagnostic V3"
        )
    for key, value in provenance.items():
        if key == "implementation_review_refs":
            from .vbd_trajectory_validation_resumable import (
                _implementation_review_refs_are_valid,
            )

            if not _implementation_review_refs_are_valid(
                value, provenance["implementation_commit"]
            ):
                raise VbdTrajectoryPrecisionDiagnosticError(
                    "diagnostic V3 implementation review references are invalid"
                )
        elif key in {
            "authorization_commit",
            "implementation_commit",
            "implementation_tree",
        }:
            _strict_git_object_id(value, key)
        else:
            _strict_sha256(value, key)
    return provenance


def build_vbd_trajectory_precision_diagnostic_v3_record(
    *,
    provenance: dict,
    lane_records: list[dict],
    terminal_checkpoint_hash: str,
) -> dict:
    validated_lanes = [
        validate_vbd_trajectory_precision_diagnostic_v3_lane(value)
        for value in lane_records
    ]
    if [value["lane"] for value in validated_lanes] != list(VBD_TRAJECTORY_LANES):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 result lane order is incomplete"
        )
    provenance = _validate_v3_provenance(provenance)
    _strict_sha256(terminal_checkpoint_hash, "terminal checkpoint hash")
    failures = _derived_mcse_failures(validated_lanes)
    all_coordinates = []
    for lane_record in validated_lanes:
        for row in lane_record["parameter_rows"]:
            if row["prefix_draws_per_chain"] != 20_000:
                continue
            for endpoint in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_MCSE_ENDPOINTS:
                all_coordinates.append(
                    {
                        "lane": lane_record["lane"],
                        "lane_ordinal": lane_record["lane_ordinal"],
                        "parameter_name": row["parameter_name"],
                        "endpoint": endpoint,
                        "mcse_to_posterior_sd_ratio": row[
                            "mcse_to_posterior_sd_ratios"
                        ][endpoint],
                    }
                )
    worst = max(
        all_coordinates,
        key=lambda item: item["mcse_to_posterior_sd_ratio"],
    )
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_ID,
        "consumed_v1_execution_anchor": _consumed_v1_execution_anchor(),
        "consumed_v2_execution_anchor": _consumed_v2_execution_anchor(),
        "canary_failure_anchor": _canary_failure_anchor(),
        "provenance": provenance,
        "diagnostic_plan_hash": vbd_trajectory_precision_diagnostic_v3_plan()[
            "diagnostic_plan_hash"
        ],
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_v3_seed_manifest()[
            "seed_manifest_hash"
        ],
        "terminal_checkpoint_hash": terminal_checkpoint_hash,
        "lane_records": validated_lanes,
        "full_prefix_failing_coordinates": failures,
        "worst_coordinate": worst,
        "ppc_state": "NOT_RUN",
        "cross_engine_state": "NOT_RUN",
        "state": "HOLD",
        "hold_reasons": [VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_HOLD_REASON],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "acceptance_complete": False,
        "task_2_6_complete": False,
        "task_5_6_complete": False,
        "customer_output_authorized": False,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
    }
    return {**body, "record_hash": sha256_json(body)}


def validate_vbd_trajectory_precision_diagnostic_v3_record(value: object) -> dict:
    expected_keys = {
        "schema_version",
        "diagnostic_id",
        "consumed_v1_execution_anchor",
        "consumed_v2_execution_anchor",
        "canary_failure_anchor",
        "provenance",
        "diagnostic_plan_hash",
        "seed_manifest_hash",
        "terminal_checkpoint_hash",
        "lane_records",
        "full_prefix_failing_coordinates",
        "worst_coordinate",
        "ppc_state",
        "cross_engine_state",
        "state",
        "hold_reasons",
        "evidence_eligible",
        "acceptance_count_effect",
        "acceptance_complete",
        "task_2_6_complete",
        "task_5_6_complete",
        "customer_output_authorized",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "record_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 record shape is invalid"
        )
    rebuilt = build_vbd_trajectory_precision_diagnostic_v3_record(
        provenance=value["provenance"],
        lane_records=value["lane_records"],
        terminal_checkpoint_hash=value["terminal_checkpoint_hash"],
    )
    if value != rebuilt:
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 record differs from independent reconstruction"
        )
    return value


def validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
    value: object,
    *,
    checkpoint_root,
    checkpoint_identity,
) -> dict:
    from .vbd_trajectory_precision_diagnostic_v3_checkpoint import (
        validate_vbd_precision_diagnostic_v3_checkpoint_root,
    )

    record = validate_vbd_trajectory_precision_diagnostic_v3_record(value)
    checkpoints = validate_vbd_precision_diagnostic_v3_checkpoint_root(
        root=checkpoint_root,
        identity=checkpoint_identity,
    )
    provenance = record["provenance"]
    if (
        record["terminal_checkpoint_hash"] != checkpoints[-1]["checkpoint_hash"]
        or provenance["implementation_commit"]
        != checkpoint_identity.implementation_commit
        or provenance["authorization_commit"]
        != checkpoint_identity.authorization_commit
        or provenance["authorization_manifest_hash"]
        != checkpoint_identity.authorization_manifest_hash
        or provenance["execution_authorization_hash"]
        != checkpoint_identity.human_execution_authorization_hash
        or provenance["external_claim_hash"]
        != checkpoint_identity.attempt_claim_hash
        or provenance["input_binding_hash"]
        != checkpoints[1]["input_binding_hash"]
    ):
        raise VbdTrajectoryPrecisionDiagnosticError(
            "diagnostic V3 provenance or checkpoint binding is invalid"
        )
    return record
