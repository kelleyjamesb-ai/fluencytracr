"""Matched PyMC NUTS reference and exact PPC for VBD trajectories."""

from __future__ import annotations

from dataclasses import dataclass, replace
import math
from typing import Literal

import arviz as az
import numpy as np
import pymc as pm
import pytensor.tensor as pt
from scipy.linalg import cho_factor, cho_solve

from .hashing import sha256_json
from .longitudinal_types import MAX_JAVASCRIPT_SAFE_INTEGER
from .vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
    VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD,
    VBD_TRAJECTORY_GROUP_SCALE_PRIOR_SD,
    VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD,
    VBD_TRAJECTORY_RHO_ABS_BOUND,
    validate_prepared_vbd_trajectory,
)
from .vbd_trajectory_state_space import _stationary_ar1_covariance
from .vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
    VBD_TRAJECTORY_INTERVAL_80,
    summarize_weighted_support,
    weighted_quantile_v1,
)
from .vbd_trajectory_types import (
    TrajectoryObservationPanel,
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_SMOKE_SEED_MAX,
    VBD_TRAJECTORY_SMOKE_SEED_MIN,
    VBD_TRAJECTORY_TOTAL_WINDOW_COUNT,
)


VBD_TRAJECTORY_NUTS_REFERENCE_ENGINE = "pymc_nuts_state_space_reference"
VBD_TRAJECTORY_NUTS_FULL_CHAINS = 4
VBD_TRAJECTORY_NUTS_FULL_DRAWS = 1_000
VBD_TRAJECTORY_NUTS_FULL_TUNE = 2_000
VBD_TRAJECTORY_NUTS_FULL_TARGET_ACCEPT = 0.99
VBD_TRAJECTORY_NUTS_FULL_MAX_TREEDEPTH = 15
VBD_TRAJECTORY_NUTS_SMOKE_CHAINS = 2
VBD_TRAJECTORY_NUTS_SMOKE_DRAWS = 40
VBD_TRAJECTORY_NUTS_SMOKE_TUNE = 60
VBD_TRAJECTORY_NUTS_SMOKE_TARGET_ACCEPT = 0.90
VBD_TRAJECTORY_NUTS_SMOKE_MAX_TREEDEPTH = 10

VBD_TRAJECTORY_NUTS_RHAT_MAX = 1.01
VBD_TRAJECTORY_NUTS_ESS_MIN = 400.0
VBD_TRAJECTORY_NUTS_BFMI_MIN = 0.3
VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX = 0.1
VBD_TRAJECTORY_NUTS_PPC_VALUE_MIN = 0.05
VBD_TRAJECTORY_NUTS_PPC_VALUE_MAX = 0.95
VBD_TRAJECTORY_PPC_MANIFEST_ID = "vbd_trajectory_ppc_v1"
VBD_TRAJECTORY_PPC_STATISTIC_NAMES = (
    "pre_post_mean_movement",
    "between_panel_group_variance",
    "within_panel_group_variance",
    "tail_or_extreme_aggregate_statistic",
    "lag_one_within_group_autocorrelation",
)
VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES = (
    "alpha",
    "beta",
    "sigma_u",
    "u",
    "sigma_r",
    "rho",
    "trajectory_movement",
)


class TrajectoryNutsError(RuntimeError):
    """The matched NUTS reference failed a compiled requirement."""


@dataclass(frozen=True)
class TrajectoryNutsSettings:
    mode: Literal["full", "smoke"]
    chains: int
    draws: int
    tune: int
    target_accept: float
    max_treedepth: int
    sampler: str = "pymc"
    cores: int = 1
    blas_cores: int = 1
    compute_convergence_checks: bool = True

    def __post_init__(self) -> None:
        common = (
            self.sampler == "pymc"
            and self.cores == 1
            and self.blas_cores == 1
            and self.compute_convergence_checks is True
        )
        full = (
            self.mode == "full"
            and self.chains == VBD_TRAJECTORY_NUTS_FULL_CHAINS
            and self.draws == VBD_TRAJECTORY_NUTS_FULL_DRAWS
            and self.tune == VBD_TRAJECTORY_NUTS_FULL_TUNE
            and self.target_accept == VBD_TRAJECTORY_NUTS_FULL_TARGET_ACCEPT
            and self.max_treedepth == VBD_TRAJECTORY_NUTS_FULL_MAX_TREEDEPTH
        )
        smoke = (
            self.mode == "smoke"
            and self.chains == VBD_TRAJECTORY_NUTS_SMOKE_CHAINS
            and self.draws == VBD_TRAJECTORY_NUTS_SMOKE_DRAWS
            and self.tune == VBD_TRAJECTORY_NUTS_SMOKE_TUNE
            and self.target_accept == VBD_TRAJECTORY_NUTS_SMOKE_TARGET_ACCEPT
            and self.max_treedepth == VBD_TRAJECTORY_NUTS_SMOKE_MAX_TREEDEPTH
        )
        if not common or not (full or smoke):
            raise TrajectoryNutsError("NUTS settings are not a compiled mode")

    @property
    def full_settings(self) -> bool:
        return (
            self.mode == "full"
            and self.chains == VBD_TRAJECTORY_NUTS_FULL_CHAINS
            and self.draws == VBD_TRAJECTORY_NUTS_FULL_DRAWS
            and self.tune == VBD_TRAJECTORY_NUTS_FULL_TUNE
            and self.target_accept == VBD_TRAJECTORY_NUTS_FULL_TARGET_ACCEPT
            and self.max_treedepth == VBD_TRAJECTORY_NUTS_FULL_MAX_TREEDEPTH
            and self.sampler == "pymc"
            and self.cores == 1
            and self.blas_cores == 1
            and self.compute_convergence_checks is True
        )

    def to_dict(self) -> dict:
        return {
            "mode": self.mode,
            "chains": self.chains,
            "draws": self.draws,
            "tune": self.tune,
            "target_accept": float(self.target_accept),
            "max_treedepth": self.max_treedepth,
            "sampler": self.sampler,
            "cores": self.cores,
            "blas_cores": self.blas_cores,
            "compute_convergence_checks": self.compute_convergence_checks,
            "full_settings": self.full_settings,
        }


@dataclass(frozen=True)
class TrajectorySamplerParameterDiagnostic:
    parameter_name: str
    r_hat: float
    bulk_ess: float
    tail_ess: float
    posterior_mean_mcse: float
    interval_endpoint_mcse: float
    posterior_sd: float

    def __post_init__(self) -> None:
        if type(self.parameter_name) is not str or not self.parameter_name:
            raise TrajectoryNutsError("sampler parameter name is invalid")
        for value in (
            self.r_hat,
            self.bulk_ess,
            self.tail_ess,
            self.posterior_mean_mcse,
            self.interval_endpoint_mcse,
            self.posterior_sd,
        ):
            if isinstance(value, (bool, np.bool_)) or not isinstance(
                value, (int, float, np.integer, np.floating)
            ):
                raise TrajectoryNutsError("sampler diagnostic value is not numeric")

    @property
    def max_mcse_ratio(self) -> float:
        if not math.isfinite(self.posterior_sd) or self.posterior_sd <= 0.0:
            return math.inf
        return max(self.posterior_mean_mcse, self.interval_endpoint_mcse) / self.posterior_sd

    def to_dict(self) -> dict:
        return {
            "parameter_name": self.parameter_name,
            "r_hat": float(self.r_hat),
            "bulk_ess": float(self.bulk_ess),
            "tail_ess": float(self.tail_ess),
            "posterior_mean_mcse": float(self.posterior_mean_mcse),
            "interval_endpoint_mcse": float(self.interval_endpoint_mcse),
            "posterior_sd": float(self.posterior_sd),
            "max_mcse_to_posterior_sd_ratio": float(self.max_mcse_ratio),
        }


@dataclass(frozen=True)
class TrajectorySamplerDiagnostics:
    settings: TrajectoryNutsSettings
    parameters: tuple[TrajectorySamplerParameterDiagnostic, ...]
    required_parameter_names: tuple[str, ...]
    missing_parameter_variables: tuple[str, ...]
    missing_parameter_names: tuple[str, ...]
    duplicate_parameter_names: tuple[str, ...]
    off_plan_parameter_names: tuple[str, ...]
    parameter_order_matches: bool
    trace_shape_matches: bool
    post_warmup_divergences: int
    max_treedepth_saturation_count: int
    energy_bfmi_min: float
    extra_failures: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if type(self.settings) is not TrajectoryNutsSettings:
            raise TrajectoryNutsError("sampler settings have an unsupported type")
        for value in (
            self.parameters,
            self.required_parameter_names,
            self.missing_parameter_variables,
            self.missing_parameter_names,
            self.duplicate_parameter_names,
            self.off_plan_parameter_names,
            self.extra_failures,
        ):
            if type(value) is not tuple:
                raise TrajectoryNutsError("sampler diagnostic collections must be tuples")
        if any(
            type(parameter) is not TrajectorySamplerParameterDiagnostic
            for parameter in self.parameters
        ):
            raise TrajectoryNutsError("sampler parameter diagnostics are malformed")
        if type(self.parameter_order_matches) is not bool or type(
            self.trace_shape_matches
        ) is not bool:
            raise TrajectoryNutsError("sampler diagnostic flags must be booleans")
        if type(self.post_warmup_divergences) is not int or type(
            self.max_treedepth_saturation_count
        ) is not int:
            raise TrajectoryNutsError("sampler diagnostic counts must be integers")
        if isinstance(self.energy_bfmi_min, (bool, np.bool_)) or not isinstance(
            self.energy_bfmi_min, (int, float, np.integer, np.floating)
        ):
            raise TrajectoryNutsError("sampler BFMI value must be numeric")

    @property
    def failing_diagnostics(self) -> tuple[str, ...]:
        failures = list(self.extra_failures)
        if not self.settings.full_settings:
            failures.append("smoke_mode_nonacceptance")
        canonical_required_names = self.required_parameter_names in (
            _expected_parameter_names(6),
            _expected_parameter_names(12),
        )
        actual_parameter_names = tuple(
            parameter.parameter_name for parameter in self.parameters
        )
        if (
            not canonical_required_names
            or actual_parameter_names != self.required_parameter_names
            or self.missing_parameter_variables
            or self.missing_parameter_names
            or self.duplicate_parameter_names
            or self.off_plan_parameter_names
            or not self.parameter_order_matches
            or not self.trace_shape_matches
        ):
            failures.append("parameter_diagnostics")
        if any(
            not math.isfinite(parameter.r_hat)
            or parameter.r_hat <= 0.0
            or parameter.r_hat > VBD_TRAJECTORY_NUTS_RHAT_MAX
            for parameter in self.parameters
        ):
            failures.append("r_hat")
        if any(
            not math.isfinite(parameter.bulk_ess)
            or parameter.bulk_ess < VBD_TRAJECTORY_NUTS_ESS_MIN
            for parameter in self.parameters
        ):
            failures.append("bulk_ess")
        if any(
            not math.isfinite(parameter.tail_ess)
            or parameter.tail_ess < VBD_TRAJECTORY_NUTS_ESS_MIN
            for parameter in self.parameters
        ):
            failures.append("tail_ess")
        if any(
            not math.isfinite(parameter.posterior_mean_mcse)
            or parameter.posterior_mean_mcse < 0.0
            or not math.isfinite(parameter.interval_endpoint_mcse)
            or parameter.interval_endpoint_mcse < 0.0
            or not math.isfinite(parameter.max_mcse_ratio)
            or parameter.max_mcse_ratio > VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX
            for parameter in self.parameters
        ):
            failures.append("mcse")
        if self.post_warmup_divergences != 0:
            failures.append("divergences")
        if self.max_treedepth_saturation_count != 0:
            failures.append("max_treedepth_saturation")
        if (
            not math.isfinite(self.energy_bfmi_min)
            or self.energy_bfmi_min < VBD_TRAJECTORY_NUTS_BFMI_MIN
        ):
            failures.append("energy_bfmi")
        return tuple(dict.fromkeys(failures))

    @property
    def passed(self) -> bool:
        return not self.failing_diagnostics

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "failing_diagnostics": list(self.failing_diagnostics),
            "parameters": [parameter.to_dict() for parameter in self.parameters],
            "required_parameter_variables": list(
                VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES
            ),
            "missing_parameter_variables": list(self.missing_parameter_variables),
            "required_parameter_names": list(self.required_parameter_names),
            "missing_parameter_names": list(self.missing_parameter_names),
            "duplicate_parameter_names": list(self.duplicate_parameter_names),
            "off_plan_parameter_names": list(self.off_plan_parameter_names),
            "parameter_order_matches": self.parameter_order_matches,
            "trace_shape_matches": self.trace_shape_matches,
            "post_warmup_divergences": self.post_warmup_divergences,
            "max_treedepth_saturation_count": self.max_treedepth_saturation_count,
            "energy_bfmi_min": float(self.energy_bfmi_min),
            "compiled_gates": {
                "r_hat_max": VBD_TRAJECTORY_NUTS_RHAT_MAX,
                "bulk_ess_min": VBD_TRAJECTORY_NUTS_ESS_MIN,
                "tail_ess_min": VBD_TRAJECTORY_NUTS_ESS_MIN,
                "post_warmup_divergences_max": 0,
                "max_treedepth_saturation_count_max": 0,
                "energy_bfmi_min": VBD_TRAJECTORY_NUTS_BFMI_MIN,
                "max_mcse_to_posterior_sd_ratio": (
                    VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX
                ),
            },
        }


@dataclass(frozen=True)
class TrajectoryPpcResult:
    statistic_name: str
    observed_value: float
    predictive_mean: float
    predictive_interval_80_lower: float
    predictive_interval_80_upper: float
    p_value: float

    def __post_init__(self) -> None:
        if self.statistic_name not in VBD_TRAJECTORY_PPC_STATISTIC_NAMES:
            raise TrajectoryNutsError("PPC statistic name is not canonical")
        values = (
            self.observed_value,
            self.predictive_mean,
            self.predictive_interval_80_lower,
            self.predictive_interval_80_upper,
            self.p_value,
        )
        if any(
            isinstance(value, (bool, np.bool_))
            or not isinstance(value, (int, float, np.integer, np.floating))
            or not math.isfinite(float(value))
            for value in values
        ):
            raise TrajectoryNutsError("PPC summary values must be finite numerics")
        if self.predictive_interval_80_lower > self.predictive_interval_80_upper:
            raise TrajectoryNutsError("PPC predictive interval is reversed")
        if not 0.0 <= self.p_value <= 1.0:
            raise TrajectoryNutsError("PPC p-value must be in [0,1]")

    @property
    def passed(self) -> bool:
        return bool(
            math.isfinite(self.p_value)
            and VBD_TRAJECTORY_NUTS_PPC_VALUE_MIN
            <= self.p_value
            <= VBD_TRAJECTORY_NUTS_PPC_VALUE_MAX
        )

    def to_dict(self) -> dict:
        return {
            "statistic_name": self.statistic_name,
            "observed_value": float(self.observed_value),
            "predictive_mean": float(self.predictive_mean),
            "predictive_interval_80": {
                "lower": float(self.predictive_interval_80_lower),
                "upper": float(self.predictive_interval_80_upper),
            },
            "p_value": float(self.p_value),
            "passed": self.passed,
        }


@dataclass(frozen=True)
class TrajectoryNutsFit:
    lane: str
    prepared_input_hash: str
    model_input_hash: str
    settings: TrajectoryNutsSettings
    chain_seeds: tuple[int, ...]
    ppc_seed: int
    movement_summary: TrajectoryPosteriorSummary
    sampler_diagnostics: TrajectorySamplerDiagnostics
    posterior_predictive_checks: tuple[TrajectoryPpcResult, ...]
    engine_kind: str = VBD_TRAJECTORY_NUTS_REFERENCE_ENGINE

    def __post_init__(self) -> None:
        if self.lane not in VBD_TRAJECTORY_LANES:
            raise TrajectoryNutsError("NUTS fit lane is invalid")
        for value in (self.prepared_input_hash, self.model_input_hash):
            if (
                type(value) is not str
                or len(value) != 64
                or any(character not in "0123456789abcdef" for character in value)
            ):
                raise TrajectoryNutsError("NUTS fit hash is invalid")
        if (
            type(self.settings) is not TrajectoryNutsSettings
            or type(self.chain_seeds) is not tuple
            or len(self.chain_seeds) != self.settings.chains
            or type(self.ppc_seed) is not int
            or type(self.movement_summary) is not TrajectoryPosteriorSummary
            or self.movement_summary.quantity_name != "trajectory_movement"
            or type(self.sampler_diagnostics) is not TrajectorySamplerDiagnostics
            or self.sampler_diagnostics.settings != self.settings
            or type(self.posterior_predictive_checks) is not tuple
            or self.engine_kind != VBD_TRAJECTORY_NUTS_REFERENCE_ENGINE
        ):
            raise TrajectoryNutsError("NUTS fit structure is invalid")
        if self.settings.mode == "full":
            raise TrajectoryNutsError(
                "full NUTS fits require the future runner-owned slot binding"
            )
        ppc_names = tuple(
            check.statistic_name for check in self.posterior_predictive_checks
        )
        if (
            any(
                type(check) is not TrajectoryPpcResult
                for check in self.posterior_predictive_checks
            )
            or ppc_names != VBD_TRAJECTORY_PPC_STATISTIC_NAMES
        ):
            raise TrajectoryNutsError("NUTS fit requires all five ordered PPCs")
        if (
            not all(check.passed for check in self.posterior_predictive_checks)
            and "posterior_predictive_check"
            not in self.sampler_diagnostics.failing_diagnostics
        ):
            raise TrajectoryNutsError("failed PPC is missing its diagnostic failure")

    def _hash_body(self) -> dict:
        return {
            "lane": self.lane,
            "prepared_input_hash": self.prepared_input_hash,
            "model_input_hash": self.model_input_hash,
            "engine_kind": self.engine_kind,
            "settings": self.settings.to_dict(),
            "chain_seeds": list(self.chain_seeds),
            "ppc_seed": self.ppc_seed,
            "movement_summary": self.movement_summary.to_dict(),
            "sampler_diagnostics": self.sampler_diagnostics.to_dict(),
            "posterior_predictive_checks": [
                check.to_dict() for check in self.posterior_predictive_checks
            ],
            "raw_posterior_draws_emitted": False,
            "latent_paths_emitted": False,
            "posterior_predictive_replicates_emitted": False,
        }

    def fit_summary_hash(self) -> str:
        return sha256_json(self._hash_body())

    def to_dict(self) -> dict:
        return {**self._hash_body(), "fit_summary_hash": self.fit_summary_hash()}


def vbd_nuts_execution_settings(
    mode: Literal["full", "smoke"],
) -> TrajectoryNutsSettings:
    if mode == "full":
        return TrajectoryNutsSettings(
            mode="full",
            chains=VBD_TRAJECTORY_NUTS_FULL_CHAINS,
            draws=VBD_TRAJECTORY_NUTS_FULL_DRAWS,
            tune=VBD_TRAJECTORY_NUTS_FULL_TUNE,
            target_accept=VBD_TRAJECTORY_NUTS_FULL_TARGET_ACCEPT,
            max_treedepth=VBD_TRAJECTORY_NUTS_FULL_MAX_TREEDEPTH,
        )
    if mode == "smoke":
        return TrajectoryNutsSettings(
            mode="smoke",
            chains=VBD_TRAJECTORY_NUTS_SMOKE_CHAINS,
            draws=VBD_TRAJECTORY_NUTS_SMOKE_DRAWS,
            tune=VBD_TRAJECTORY_NUTS_SMOKE_TUNE,
            target_accept=VBD_TRAJECTORY_NUTS_SMOKE_TARGET_ACCEPT,
            max_treedepth=VBD_TRAJECTORY_NUTS_SMOKE_MAX_TREEDEPTH,
        )
    raise ValueError("NUTS execution mode must be full or smoke")


def _strict_seed(value: object, name: str) -> int:
    if (
        type(value) is not int
        or value < 0
        or value > MAX_JAVASCRIPT_SAFE_INTEGER
    ):
        raise ValueError(f"{name} must be a nonnegative safe integer")
    return value


def _validate_reference_seeds(
    settings: TrajectoryNutsSettings,
    chain_seeds: object,
    ppc_seed: object,
) -> tuple[tuple[int, ...], int]:
    if settings.mode == "full":
        raise ValueError(
            "full NUTS seeds require the future runner-owned slot binding"
        )
    if type(chain_seeds) is not tuple or len(chain_seeds) != settings.chains:
        raise ValueError("NUTS requires one explicit seed per chain")
    validated_chains = tuple(
        _strict_seed(seed, f"chain seed {index}")
        for index, seed in enumerate(chain_seeds)
    )
    validated_ppc = _strict_seed(ppc_seed, "PPC seed")
    if len(set(validated_chains)) != len(validated_chains):
        raise ValueError("NUTS chain seeds must be unique")
    if validated_ppc in validated_chains:
        raise ValueError("PPC seed must be distinct from every chain seed")
    if settings.mode == "smoke" and any(
        not VBD_TRAJECTORY_SMOKE_SEED_MIN
        <= seed
        <= VBD_TRAJECTORY_SMOKE_SEED_MAX
        for seed in (*validated_chains, validated_ppc)
    ):
        raise ValueError("smoke NUTS seeds must remain in the smoke namespace")
    return validated_chains, validated_ppc


def _build_reference_model(prepared: TrajectoryPreparedInput) -> pm.Model:
    with pm.Model() as model:
        alpha = pm.Normal(
            "alpha", mu=0.0, sigma=VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD
        )
        beta = pm.Normal(
            "beta", mu=0.0, sigma=VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD
        )
        sigma_u = pm.HalfNormal(
            "sigma_u", sigma=VBD_TRAJECTORY_GROUP_SCALE_PRIOR_SD
        )
        u = pm.ZeroSumNormal(
            "u", sigma=sigma_u, shape=prepared.panel_group_count
        )
        sigma_r = pm.HalfNormal(
            "sigma_r", sigma=VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD
        )
        rho = pm.Uniform(
            "rho",
            lower=-VBD_TRAJECTORY_RHO_ABS_BOUND,
            upper=VBD_TRAJECTORY_RHO_ABS_BOUND,
        )
        movement_mean = pt.as_tensor_variable(0.0)
        movement_variance = pt.as_tensor_variable(0.0)
        for group, rows in enumerate(prepared.group_rows):
            length = len(rows)
            lags = np.abs(
                np.subtract.outer(np.arange(length), np.arange(length))
            )
            state_covariance = (
                sigma_r**2
                / (1.0 - rho**2)
                * pt.power(rho, lags)
            )
            observation_covariance = state_covariance + pt.diag(
                prepared.known_se[rows] ** 2
            )
            group_mean = alpha + beta * prepared.time_tau[rows] + u[group]
            pm.MvNormal(
                f"observed_group_{group}",
                mu=group_mean,
                cov=observation_covariance,
                observed=prepared.y[rows],
            )
            contrast = prepared.latent_level_contrast[rows]
            state_contrast = pt.dot(state_covariance, contrast)
            inverse_residual = pt.linalg.solve(
                observation_covariance,
                prepared.y[rows] - group_mean,
            )
            inverse_state_contrast = pt.linalg.solve(
                observation_covariance, state_contrast
            )
            movement_mean = (
                movement_mean
                + pt.dot(contrast, group_mean)
                + pt.dot(state_contrast, inverse_residual)
            )
            movement_variance = movement_variance + pt.dot(
                contrast,
                state_contrast
                - pt.dot(state_covariance, inverse_state_contrast),
            )
        pm.Normal(
            "trajectory_movement",
            mu=movement_mean,
            sigma=pt.sqrt(movement_variance),
        )
    return model


def _tree_values(tree, variable_name: str) -> np.ndarray:
    node = tree
    if hasattr(tree, "children") and "posterior" in getattr(tree, "children", {}):
        node = tree["posterior"]
    return np.asarray(node[variable_name], dtype=float)


def _flatten_named(variable_name: str, values: np.ndarray) -> list[tuple[str, float]]:
    flat = np.asarray(values, dtype=float).reshape(-1)
    if flat.size == 1:
        return [(variable_name, float(flat[0]))]
    return [
        (f"{variable_name}[{index}]", float(value))
        for index, value in enumerate(flat)
    ]


def _bfmi_values(idata) -> np.ndarray:
    result = az.bfmi(idata)
    if isinstance(result, dict):
        result = result.get("energy", [])
    data_vars = getattr(result, "data_vars", None)
    if data_vars is not None:
        variable_names = list(data_vars)
        if "energy" in variable_names:
            result = result["energy"]
        elif len(variable_names) == 1:
            result = result[variable_names[0]]
    to_array = getattr(result, "to_array", None)
    if callable(to_array):
        result = to_array()
    to_numpy = getattr(result, "to_numpy", None)
    if callable(to_numpy):
        result = to_numpy()
    else:
        values = getattr(result, "values", None)
        if callable(values):
            result = values()
        elif values is not None:
            result = values
    return np.atleast_1d(np.asarray(result, dtype=float)).reshape(-1)


def _sample_stat_count(
    sample_stats,
    name: str,
    settings: TrajectoryNutsSettings,
    *,
    binary: bool,
    threshold: int | None = None,
) -> tuple[int, bool]:
    if name not in sample_stats.data_vars:
        return -1, False
    values = np.asarray(sample_stats[name])
    if values.shape != (settings.chains, settings.draws):
        return -1, False
    if binary:
        if values.dtype.kind not in "biu" or not np.all(
            (values == 0) | (values == 1)
        ):
            return -1, False
        return int(values.sum()), True
    if (
        values.dtype.kind not in "iu"
        or np.any(values < 0)
        or threshold is None
    ):
        return -1, False
    return int(np.count_nonzero(values >= threshold)), True


def _expected_parameter_names(panel_group_count: int) -> tuple[str, ...]:
    return (
        "alpha",
        "beta",
        "sigma_u",
        *(f"u[{index}]" for index in range(panel_group_count)),
        "sigma_r",
        "rho",
        "trajectory_movement",
    )


def _compute_sampler_diagnostics(
    idata,
    *,
    prepared: TrajectoryPreparedInput,
    settings: TrajectoryNutsSettings,
) -> TrajectorySamplerDiagnostics:
    posterior = idata.posterior
    actual_variables = tuple(str(name) for name in posterior.data_vars)
    missing_variables = tuple(
        name
        for name in VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES
        if name not in actual_variables
    )
    present_variables = tuple(
        name
        for name in VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES
        if name in actual_variables
    )
    off_plan_variables = tuple(
        name
        for name in actual_variables
        if name not in VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES
    )
    trace_shape_matches = all(
        np.asarray(posterior[name]).shape[:2] == (settings.chains, settings.draws)
        for name in present_variables
    )
    parameters: list[TrajectorySamplerParameterDiagnostic] = []
    if present_variables:
        rhat = az.rhat(idata, var_names=list(present_variables))
        ess_bulk = az.ess(
            idata, var_names=list(present_variables), method="bulk"
        )
        ess_tail = az.ess(
            idata, var_names=list(present_variables), method="tail"
        )
        mcse_mean = az.mcse(
            idata, var_names=list(present_variables), method="mean"
        )
        mcse_q10 = az.mcse(
            idata,
            var_names=list(present_variables),
            method="quantile",
            prob=VBD_TRAJECTORY_INTERVAL_80[0],
        )
        mcse_q90 = az.mcse(
            idata,
            var_names=list(present_variables),
            method="quantile",
            prob=VBD_TRAJECTORY_INTERVAL_80[1],
        )
        for variable_name in present_variables:
            draws = np.asarray(posterior[variable_name], dtype=float)
            flattened_draws = draws.reshape(
                draws.shape[0] * draws.shape[1], -1
            )
            posterior_sd = flattened_draws.std(axis=0, ddof=1)
            rows = {
                "rhat": _flatten_named(
                    variable_name, _tree_values(rhat, variable_name)
                ),
                "bulk": _flatten_named(
                    variable_name, _tree_values(ess_bulk, variable_name)
                ),
                "tail": _flatten_named(
                    variable_name, _tree_values(ess_tail, variable_name)
                ),
                "mean": _flatten_named(
                    variable_name, _tree_values(mcse_mean, variable_name)
                ),
                "q10": _flatten_named(
                    variable_name, _tree_values(mcse_q10, variable_name)
                ),
                "q90": _flatten_named(
                    variable_name, _tree_values(mcse_q90, variable_name)
                ),
            }
            row_count = min(len(values) for values in rows.values())
            row_count = min(row_count, len(posterior_sd))
            for index in range(row_count):
                parameters.append(
                    TrajectorySamplerParameterDiagnostic(
                        parameter_name=rows["rhat"][index][0],
                        r_hat=rows["rhat"][index][1],
                        bulk_ess=rows["bulk"][index][1],
                        tail_ess=rows["tail"][index][1],
                        posterior_mean_mcse=rows["mean"][index][1],
                        interval_endpoint_mcse=max(
                            rows["q10"][index][1], rows["q90"][index][1]
                        ),
                        posterior_sd=float(posterior_sd[index]),
                    )
                )

    required_names = _expected_parameter_names(prepared.panel_group_count)
    actual_names = tuple(parameter.parameter_name for parameter in parameters)
    duplicate_names = tuple(
        sorted({name for name in actual_names if actual_names.count(name) > 1})
    )
    missing_names = tuple(name for name in required_names if name not in actual_names)
    off_plan_names = tuple(
        sorted(
            {
                *off_plan_variables,
                *set(actual_names).difference(required_names),
            }
        )
    )
    sample_stats = idata.sample_stats
    divergences, divergence_valid = _sample_stat_count(
        sample_stats, "diverging", settings, binary=True
    )
    trace_shape_matches = trace_shape_matches and divergence_valid
    if "reached_max_treedepth" in sample_stats.data_vars:
        treedepth_saturation, treedepth_valid = _sample_stat_count(
            sample_stats,
            "reached_max_treedepth",
            settings,
            binary=True,
        )
    elif "tree_depth" in sample_stats.data_vars:
        treedepth_saturation, treedepth_valid = _sample_stat_count(
            sample_stats,
            "tree_depth",
            settings,
            binary=False,
            threshold=settings.max_treedepth,
        )
    else:
        treedepth_saturation, treedepth_valid = -1, False
    trace_shape_matches = trace_shape_matches and treedepth_valid
    try:
        bfmi = _bfmi_values(idata)
        if bfmi.shape != (settings.chains,) or not np.all(np.isfinite(bfmi)):
            bfmi_min = math.nan
            trace_shape_matches = False
        else:
            bfmi_min = float(bfmi.min())
    except (TypeError, ValueError, KeyError):
        bfmi_min = math.nan
        trace_shape_matches = False
    return TrajectorySamplerDiagnostics(
        settings=settings,
        parameters=tuple(parameters),
        required_parameter_names=required_names,
        missing_parameter_variables=missing_variables,
        missing_parameter_names=missing_names,
        duplicate_parameter_names=duplicate_names,
        off_plan_parameter_names=off_plan_names,
        parameter_order_matches=(
            not off_plan_variables and actual_names == required_names
        ),
        trace_shape_matches=trace_shape_matches,
        post_warmup_divergences=divergences,
        max_treedepth_saturation_count=treedepth_saturation,
        energy_bfmi_min=bfmi_min,
    )


def vbd_trajectory_ppc_statistics(values: object) -> dict[str, float]:
    matrix = np.asarray(values)
    if (
        matrix.ndim != 2
        or matrix.shape[0] < 2
        or matrix.shape[1] != VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
        or matrix.dtype.kind not in "fiu"
    ):
        raise TrajectoryNutsError("PPC values must be a balanced numeric panel")
    matrix = np.asarray(matrix, dtype=np.float64)
    if not np.all(np.isfinite(matrix)):
        raise TrajectoryNutsError("PPC values must be finite")
    group_means = matrix.mean(axis=1)
    group_variances = matrix.var(axis=1, ddof=1)
    centered = matrix - matrix.mean(axis=1, keepdims=True)
    lag_denominator = float(np.sum(centered[:, :-1] ** 2))
    lag_numerator = float(np.sum(centered[:, 1:] * centered[:, :-1]))
    return {
        "pre_post_mean_movement": float(
            matrix[:, 12:18].mean() - matrix[:, 0:12].mean()
        ),
        "between_panel_group_variance": float(group_means.var(ddof=1)),
        "within_panel_group_variance": float(group_variances.mean()),
        "tail_or_extreme_aggregate_statistic": float(
            np.abs(matrix - matrix.mean()).max()
        ),
        "lag_one_within_group_autocorrelation": (
            0.0 if lag_denominator <= 0.0 else lag_numerator / lag_denominator
        ),
    }


def _conditional_state_factor(
    known_se: np.ndarray,
    state_covariance: np.ndarray,
) -> tuple[tuple[np.ndarray, bool], np.ndarray]:
    observation_covariance = state_covariance + np.diag(known_se**2)
    factor = cho_factor(observation_covariance, lower=True, check_finite=False)
    conditional_covariance = state_covariance - state_covariance @ cho_solve(
        factor, state_covariance, check_finite=False
    )
    scale = max(1.0, float(np.max(np.abs(conditional_covariance))))
    if (
        not np.all(np.isfinite(conditional_covariance))
        or float(
            np.max(np.abs(conditional_covariance - conditional_covariance.T))
        )
        > 1e-12 * scale
    ):
        raise TrajectoryNutsError("conditional smoothed state is invalid")
    conditional_covariance = 0.5 * (
        conditional_covariance + conditional_covariance.T
    )
    try:
        cholesky = np.linalg.cholesky(conditional_covariance)
    except np.linalg.LinAlgError as exc:
        raise TrajectoryNutsError(
            "conditional smoothed state covariance is not positive definite"
        ) from exc
    return factor, cholesky


def _conditional_state_distribution(
    y: np.ndarray,
    mean: np.ndarray,
    known_se: np.ndarray,
    state_covariance: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    factor, cholesky = _conditional_state_factor(known_se, state_covariance)
    conditional_mean = state_covariance @ cho_solve(
        factor, y - mean, check_finite=False
    )
    if not np.all(np.isfinite(conditional_mean)):
        raise TrajectoryNutsError("conditional smoothed state mean is invalid")
    return conditional_mean, cholesky


def _posterior_draws(idata, name: str) -> np.ndarray:
    if name not in idata.posterior.data_vars:
        raise TrajectoryNutsError(f"posterior is missing {name}")
    values = np.asarray(idata.posterior[name], dtype=np.float64)
    if not np.all(np.isfinite(values)):
        raise TrajectoryNutsError(f"posterior {name} contains nonfinite draws")
    return values


def _compute_posterior_predictive_checks(
    idata,
    prepared: TrajectoryPreparedInput,
    *,
    settings: TrajectoryNutsSettings,
    ppc_seed: int,
) -> tuple[TrajectoryPpcResult, ...]:
    alpha = _posterior_draws(idata, "alpha").reshape(-1)
    beta = _posterior_draws(idata, "beta").reshape(-1)
    sigma_r = _posterior_draws(idata, "sigma_r").reshape(-1)
    rho = _posterior_draws(idata, "rho").reshape(-1)
    u = _posterior_draws(idata, "u").reshape(-1, prepared.panel_group_count)
    sample_count = settings.chains * settings.draws
    if any(len(values) != sample_count for values in (alpha, beta, sigma_r, rho, u)):
        raise TrajectoryNutsError("posterior trace shape does not match settings")
    rng = np.random.Generator(np.random.PCG64DXSM(ppc_seed))
    observed_matrix = prepared.y.reshape(
        prepared.panel_group_count, VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
    )
    observed = vbd_trajectory_ppc_statistics(observed_matrix)
    replicated_statistics = {
        name: np.empty(sample_count, dtype=np.float64)
        for name in VBD_TRAJECTORY_PPC_STATISTIC_NAMES
    }
    for draw_index in range(sample_count):
        if (
            sigma_r[draw_index] <= 0.0
            or abs(rho[draw_index]) >= VBD_TRAJECTORY_RHO_ABS_BOUND
        ):
            raise TrajectoryNutsError("posterior hyperparameter draw is outside support")
        state_covariance = _stationary_ar1_covariance(
            VBD_TRAJECTORY_TOTAL_WINDOW_COUNT,
            float(rho[draw_index]),
            float(sigma_r[draw_index]),
        )
        replicate = np.empty_like(observed_matrix)
        distribution_cache: dict[
            bytes, tuple[tuple[np.ndarray, bool], np.ndarray]
        ] = {}
        for group, rows in enumerate(prepared.group_rows):
            group_mean = (
                alpha[draw_index]
                + beta[draw_index] * prepared.time_tau[rows]
                + u[draw_index, group]
            )
            known_se = prepared.known_se[rows]
            cache_key = known_se.tobytes()
            cached = distribution_cache.get(cache_key)
            if cached is None:
                factor, cholesky = _conditional_state_factor(
                    known_se, state_covariance
                )
                distribution_cache[cache_key] = (factor, cholesky)
            else:
                factor, cholesky = cached
            conditional_mean = state_covariance @ cho_solve(
                factor, prepared.y[rows] - group_mean, check_finite=False
            )
            if not np.all(np.isfinite(conditional_mean)):
                raise TrajectoryNutsError(
                    "conditional smoothed state mean is invalid"
                )
            path_standard_normal = rng.standard_normal(
                VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
            )
            observation_standard_normal = rng.standard_normal(
                VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
            )
            conditional_state = conditional_mean + cholesky @ path_standard_normal
            replicate[group] = (
                group_mean
                + conditional_state
                + known_se * observation_standard_normal
            )
        statistics = vbd_trajectory_ppc_statistics(replicate)
        for name in VBD_TRAJECTORY_PPC_STATISTIC_NAMES:
            replicated_statistics[name][draw_index] = statistics[name]

    stable_indices = np.arange(sample_count, dtype=np.int64)
    equal_weights = np.ones(sample_count, dtype=np.float64)
    results = []
    for name in VBD_TRAJECTORY_PPC_STATISTIC_NAMES:
        values = replicated_statistics[name]
        observed_value = observed[name]
        results.append(
            TrajectoryPpcResult(
                statistic_name=name,
                observed_value=observed_value,
                predictive_mean=float(values.mean()),
                predictive_interval_80_lower=weighted_quantile_v1(
                    values,
                    equal_weights,
                    stable_indices,
                    VBD_TRAJECTORY_INTERVAL_80[0],
                ),
                predictive_interval_80_upper=weighted_quantile_v1(
                    values,
                    equal_weights,
                    stable_indices,
                    VBD_TRAJECTORY_INTERVAL_80[1],
                ),
                p_value=float(np.count_nonzero(values >= observed_value) / sample_count),
            )
        )
    return tuple(results)


def _movement_summary(idata) -> TrajectoryPosteriorSummary:
    draws = _posterior_draws(idata, "trajectory_movement").reshape(-1)
    return summarize_weighted_support(
        "trajectory_movement",
        draws,
        np.ones(len(draws), dtype=np.float64),
        np.arange(len(draws), dtype=np.int64),
    )


def fit_vbd_trajectory_nuts_reference(
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
    *,
    chain_seeds: tuple[int, ...],
    ppc_seed: int,
    mode: Literal["full", "smoke"] = "smoke",
) -> TrajectoryNutsFit:
    """Run the matched sampler and return summaries without retaining draws."""

    if type(prepared) is not TrajectoryPreparedInput:
        raise TypeError("NUTS reference requires an exact TrajectoryPreparedInput")
    if type(source_panel) is not TrajectoryObservationPanel:
        raise TypeError("NUTS reference requires an exact source panel")
    validate_prepared_vbd_trajectory(prepared, source_panel)
    settings = vbd_nuts_execution_settings(mode)
    validated_chain_seeds, validated_ppc_seed = _validate_reference_seeds(
        settings, chain_seeds, ppc_seed
    )
    if source_panel.seed in (*validated_chain_seeds, validated_ppc_seed):
        raise ValueError("generator, NUTS chain, and PPC seeds must be distinct")
    model = _build_reference_model(prepared)
    with model:
        idata = pm.sample(
            draws=settings.draws,
            tune=settings.tune,
            chains=settings.chains,
            cores=settings.cores,
            random_seed=list(validated_chain_seeds),
            target_accept=settings.target_accept,
            max_treedepth=settings.max_treedepth,
            nuts_sampler=settings.sampler,
            blas_cores=settings.blas_cores,
            progressbar=False,
            compute_convergence_checks=settings.compute_convergence_checks,
        )
    movement_summary = _movement_summary(idata)
    diagnostics = _compute_sampler_diagnostics(
        idata, prepared=prepared, settings=settings
    )
    ppc = _compute_posterior_predictive_checks(
        idata,
        prepared,
        settings=settings,
        ppc_seed=validated_ppc_seed,
    )
    if not all(check.passed for check in ppc):
        diagnostics = replace(
            diagnostics,
            extra_failures=tuple(
                dict.fromkeys(
                    (*diagnostics.extra_failures, "posterior_predictive_check")
                )
            ),
        )
    return TrajectoryNutsFit(
        lane=prepared.lane,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        settings=settings,
        chain_seeds=validated_chain_seeds,
        ppc_seed=validated_ppc_seed,
        movement_summary=movement_summary,
        sampler_diagnostics=diagnostics,
        posterior_predictive_checks=ppc,
    )
