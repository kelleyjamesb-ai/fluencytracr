"""PyMC NUTS reference engine for longitudinal state-space concordance."""

from __future__ import annotations

from dataclasses import dataclass
import math
import time
from typing import Literal

import arviz as az
import numpy as np
import pymc as pm
import pytensor.tensor as pt

from .hashing import sha256_json
from .longitudinal_state_space import (
    PosteriorQuantitySummary,
    STATE_SPACE_FIXED_EFFECT_PRIOR_SD,
    STATE_SPACE_GROUP_SCALE_PRIOR_SD,
    STATE_SPACE_INNOVATION_SCALE_PRIOR_SD,
    STATE_SPACE_INTERVAL_LOWER_QUANTILE,
    STATE_SPACE_INTERVAL_UPPER_QUANTILE,
    STATE_SPACE_RHO_ABS_BOUND,
    PreparedLongitudinalStateSpace,
)
from .longitudinal_types import validate_longitudinal_seed

LONGITUDINAL_NUTS_REFERENCE_ENGINE = "pymc_nuts_state_space_reference"
LONGITUDINAL_NUTS_FULL_CHAINS = 4
LONGITUDINAL_NUTS_FULL_DRAWS = 1000
LONGITUDINAL_NUTS_FULL_TUNE = 2000
LONGITUDINAL_NUTS_FULL_TARGET_ACCEPT = 0.99
LONGITUDINAL_NUTS_FULL_MAX_TREEDEPTH = 15
LONGITUDINAL_NUTS_SMOKE_CHAINS = 2
LONGITUDINAL_NUTS_SMOKE_DRAWS = 80
LONGITUDINAL_NUTS_SMOKE_TUNE = 120
LONGITUDINAL_NUTS_SMOKE_TARGET_ACCEPT = 0.9
LONGITUDINAL_NUTS_SMOKE_MAX_TREEDEPTH = 10

LONGITUDINAL_NUTS_RHAT_MAX = 1.01
LONGITUDINAL_NUTS_ESS_MIN = 400.0
LONGITUDINAL_NUTS_BFMI_MIN = 0.3
LONGITUDINAL_NUTS_MCSE_RATIO_MAX = 0.1
LONGITUDINAL_NUTS_PPC_VALUE_MIN = 0.05
LONGITUDINAL_NUTS_PPC_VALUE_MAX = 0.95

LONGITUDINAL_PPC_STATISTIC_NAMES = (
    "pre_post_mean_movement",
    "between_panel_group_variance",
    "within_panel_group_variance",
    "tail_or_extreme_aggregate_statistic",
    "lag_one_within_group_autocorrelation",
)


@dataclass(frozen=True)
class NutsExecutionSettings:
    mode: Literal["full", "smoke"]
    chains: int
    draws: int
    tune: int
    target_accept: float
    max_treedepth: int

    @property
    def full_settings(self) -> bool:
        return (
            self.mode == "full"
            and self.chains == LONGITUDINAL_NUTS_FULL_CHAINS
            and self.draws == LONGITUDINAL_NUTS_FULL_DRAWS
            and self.tune == LONGITUDINAL_NUTS_FULL_TUNE
            and self.target_accept == LONGITUDINAL_NUTS_FULL_TARGET_ACCEPT
            and self.max_treedepth == LONGITUDINAL_NUTS_FULL_MAX_TREEDEPTH
        )

    def to_dict(self) -> dict:
        return {
            "mode": self.mode,
            "chains": int(self.chains),
            "draws": int(self.draws),
            "tune": int(self.tune),
            "target_accept": float(self.target_accept),
            "max_treedepth": int(self.max_treedepth),
            "full_settings": self.full_settings,
        }


@dataclass(frozen=True)
class ReferenceSamplerParameterDiagnostic:
    parameter_name: str
    r_hat: float
    bulk_ess: float
    tail_ess: float
    posterior_mean_mcse: float
    interval_endpoint_mcse: float
    posterior_sd: float

    @property
    def max_mcse_ratio(self) -> float:
        if self.posterior_sd <= 0.0:
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
class LongitudinalPpcResult:
    statistic_name: str
    observed_value: float
    predictive_mean: float
    predictive_interval_80_lower: float
    predictive_interval_80_upper: float
    p_value: float
    passed: bool

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
            "passed": bool(self.passed),
        }


@dataclass
class LongitudinalNutsFit:
    idata: object
    prepared: PreparedLongitudinalStateSpace
    settings: NutsExecutionSettings
    seed: int
    summaries: tuple[PosteriorQuantitySummary, ...]
    sampler_diagnostics: dict
    posterior_predictive_checks: tuple[LongitudinalPpcResult, ...]
    wall_time_seconds: float
    engine_kind: str = LONGITUDINAL_NUTS_REFERENCE_ENGINE

    def summary_by_name(self) -> dict[str, PosteriorQuantitySummary]:
        return {summary.quantity_name: summary for summary in self.summaries}

    def fit_summary_hash(self) -> str:
        return sha256_json(
            {
                "prepared_input_hash": self.prepared.prepared_input_hash,
                "engine_kind": self.engine_kind,
                "settings": self.settings.to_dict(),
                "seed": int(self.seed),
                "summaries": [summary.to_dict() for summary in self.summaries],
                "sampler_diagnostics": self.sampler_diagnostics,
                "posterior_predictive_checks": [
                    check.to_dict() for check in self.posterior_predictive_checks
                ],
                "raw_posterior_draws_emitted": False,
            }
        )


def nuts_execution_settings(mode: Literal["full", "smoke"]) -> NutsExecutionSettings:
    if mode == "full":
        return NutsExecutionSettings(
            mode="full",
            chains=LONGITUDINAL_NUTS_FULL_CHAINS,
            draws=LONGITUDINAL_NUTS_FULL_DRAWS,
            tune=LONGITUDINAL_NUTS_FULL_TUNE,
            target_accept=LONGITUDINAL_NUTS_FULL_TARGET_ACCEPT,
            max_treedepth=LONGITUDINAL_NUTS_FULL_MAX_TREEDEPTH,
        )
    if mode == "smoke":
        return NutsExecutionSettings(
            mode="smoke",
            chains=LONGITUDINAL_NUTS_SMOKE_CHAINS,
            draws=LONGITUDINAL_NUTS_SMOKE_DRAWS,
            tune=LONGITUDINAL_NUTS_SMOKE_TUNE,
            target_accept=LONGITUDINAL_NUTS_SMOKE_TARGET_ACCEPT,
            max_treedepth=LONGITUDINAL_NUTS_SMOKE_MAX_TREEDEPTH,
        )
    raise ValueError("NUTS execution mode must be full or smoke")


def _build_reference_model(prepared: PreparedLongitudinalStateSpace) -> pm.Model:
    with pm.Model() as model:
        beta = pm.Normal(
            "beta",
            mu=0.0,
            sigma=STATE_SPACE_FIXED_EFFECT_PRIOR_SD,
            shape=len(prepared.fixed_effect_names),
        )
        panel_group_scale = pm.HalfNormal(
            "panel_group_scale", sigma=STATE_SPACE_GROUP_SCALE_PRIOR_SD
        )
        z_panel_group = pm.ZeroSumNormal(
            "z_panel_group", sigma=1.0, shape=prepared.panel_group_count
        )
        u_panel_group = pm.Deterministic(
            "u_panel_group", z_panel_group * panel_group_scale
        )
        ar1_innovation_scale = pm.HalfNormal(
            "ar1_innovation_scale",
            sigma=STATE_SPACE_INNOVATION_SCALE_PRIOR_SD,
        )
        rho = pm.Uniform(
            "rho", lower=-STATE_SPACE_RHO_ABS_BOUND, upper=STATE_SPACE_RHO_ABS_BOUND
        )
        for index, name in enumerate(prepared.fixed_effect_names):
            pm.Deterministic(name, beta[index])
        pm.Deterministic(
            "longitudinal_movement",
            pt.dot(prepared.movement_contrast, beta),
        )

        for group, rows in enumerate(prepared.group_rows):
            length = len(rows)
            lags = np.abs(np.subtract.outer(np.arange(length), np.arange(length)))
            ar_covariance = (
                ar1_innovation_scale**2
                / (1.0 - rho**2)
                * pt.power(rho, lags)
            )
            covariance = ar_covariance + pt.diag(prepared.known_se[rows] ** 2)
            mean = pt.dot(prepared.x[rows], beta) + u_panel_group[group]
            pm.MvNormal(
                f"observed_group_{group}",
                mu=mean,
                cov=covariance,
                observed=prepared.y[rows],
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
    return [(f"{variable_name}[{index}]", float(value)) for index, value in enumerate(flat)]


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


def _compute_sampler_diagnostics(
    idata,
    *,
    prepared: PreparedLongitudinalStateSpace,
    settings: NutsExecutionSettings,
) -> dict:
    posterior = idata.posterior
    candidates = (
        "beta",
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
        "z_panel_group",
        "u_panel_group",
    )
    missing_parameters = [name for name in candidates if name not in posterior.data_vars]
    variable_names = [name for name in candidates if name in posterior.data_vars]
    rhat = az.rhat(idata, var_names=variable_names)
    ess_bulk = az.ess(idata, var_names=variable_names, method="bulk")
    ess_tail = az.ess(idata, var_names=variable_names, method="tail")
    mcse_mean = az.mcse(idata, var_names=variable_names, method="mean")
    mcse_q10 = az.mcse(
        idata,
        var_names=variable_names,
        method="quantile",
        prob=STATE_SPACE_INTERVAL_LOWER_QUANTILE,
    )
    mcse_q90 = az.mcse(
        idata,
        var_names=variable_names,
        method="quantile",
        prob=STATE_SPACE_INTERVAL_UPPER_QUANTILE,
    )
    parameters: list[ReferenceSamplerParameterDiagnostic] = []
    for variable_name in variable_names:
        draws = np.asarray(posterior[variable_name], dtype=float)
        posterior_sd = draws.reshape(draws.shape[0] * draws.shape[1], -1).std(
            axis=0, ddof=1
        )
        rows = {
            "rhat": _flatten_named(variable_name, _tree_values(rhat, variable_name)),
            "bulk": _flatten_named(variable_name, _tree_values(ess_bulk, variable_name)),
            "tail": _flatten_named(variable_name, _tree_values(ess_tail, variable_name)),
            "mean": _flatten_named(variable_name, _tree_values(mcse_mean, variable_name)),
            "q10": _flatten_named(variable_name, _tree_values(mcse_q10, variable_name)),
            "q90": _flatten_named(variable_name, _tree_values(mcse_q90, variable_name)),
        }
        for index, (parameter_name, r_hat_value) in enumerate(rows["rhat"]):
            parameters.append(
                ReferenceSamplerParameterDiagnostic(
                    parameter_name=parameter_name,
                    r_hat=r_hat_value,
                    bulk_ess=rows["bulk"][index][1],
                    tail_ess=rows["tail"][index][1],
                    posterior_mean_mcse=rows["mean"][index][1],
                    interval_endpoint_mcse=max(
                        rows["q10"][index][1], rows["q90"][index][1]
                    ),
                    posterior_sd=float(posterior_sd[index]),
                )
            )

    expected_parameter_names = [
        *(f"beta[{index}]" for index in range(len(prepared.fixed_effect_names))),
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
        *(
            f"z_panel_group[{index}]"
            for index in range(prepared.panel_group_count)
        ),
        *(
            f"u_panel_group[{index}]"
            for index in range(prepared.panel_group_count)
        ),
    ]
    actual_parameter_names = [parameter.parameter_name for parameter in parameters]
    duplicate_parameter_names = sorted(
        {
            name
            for name in actual_parameter_names
            if actual_parameter_names.count(name) > 1
        }
    )
    missing_parameter_names = [
        name for name in expected_parameter_names if name not in actual_parameter_names
    ]
    off_plan_parameter_names = sorted(
        set(actual_parameter_names).difference(expected_parameter_names)
    )

    sample_stats = idata.sample_stats
    divergences = int(np.asarray(sample_stats["diverging"]).sum())
    if "reached_max_treedepth" in sample_stats.data_vars:
        treedepth_saturation = int(
            np.asarray(sample_stats["reached_max_treedepth"]).sum()
        )
    elif "tree_depth" in sample_stats.data_vars:
        treedepth_saturation = int(
            (
                np.asarray(sample_stats["tree_depth"])
                >= settings.max_treedepth
            ).sum()
        )
    else:
        treedepth_saturation = -1
    bfmi = _bfmi_values(idata)
    bfmi_min = float(bfmi.min()) if bfmi.size else math.nan

    failures: list[str] = []
    if (
        missing_parameters
        or missing_parameter_names
        or duplicate_parameter_names
        or off_plan_parameter_names
        or actual_parameter_names != expected_parameter_names
    ):
        failures.append("missing_parameter_diagnostics")
    if not settings.full_settings:
        failures.append("full_sampler_settings")
    if any(
        not math.isfinite(parameter.r_hat)
        or parameter.r_hat <= 0.0
        or parameter.r_hat > LONGITUDINAL_NUTS_RHAT_MAX
        for parameter in parameters
    ):
        failures.append("r_hat")
    if any(
        not math.isfinite(parameter.bulk_ess)
        or parameter.bulk_ess < LONGITUDINAL_NUTS_ESS_MIN
        for parameter in parameters
    ):
        failures.append("bulk_ess")
    if any(
        not math.isfinite(parameter.tail_ess)
        or parameter.tail_ess < LONGITUDINAL_NUTS_ESS_MIN
        for parameter in parameters
    ):
        failures.append("tail_ess")
    if any(
        not math.isfinite(parameter.max_mcse_ratio)
        or parameter.max_mcse_ratio > LONGITUDINAL_NUTS_MCSE_RATIO_MAX
        for parameter in parameters
    ):
        failures.append("mcse")
    if divergences != 0:
        failures.append("divergences")
    if treedepth_saturation != 0:
        failures.append("max_treedepth_saturation")
    if not math.isfinite(bfmi_min) or bfmi_min < LONGITUDINAL_NUTS_BFMI_MIN:
        failures.append("energy_bfmi")
    return {
        "passed": not failures,
        "failing_diagnostics": list(dict.fromkeys(failures)),
        "parameters": [parameter.to_dict() for parameter in parameters],
        "required_parameter_variables": list(candidates),
        "missing_parameter_variables": missing_parameters,
        "required_parameter_names": expected_parameter_names,
        "missing_parameter_names": missing_parameter_names,
        "duplicate_parameter_names": duplicate_parameter_names,
        "off_plan_parameter_names": off_plan_parameter_names,
        "post_warmup_divergences": divergences,
        "max_treedepth_saturation_count": treedepth_saturation,
        "energy_bfmi_min": bfmi_min,
        "compiled_gates": {
            "r_hat_max": LONGITUDINAL_NUTS_RHAT_MAX,
            "bulk_ess_min": LONGITUDINAL_NUTS_ESS_MIN,
            "tail_ess_min": LONGITUDINAL_NUTS_ESS_MIN,
            "post_warmup_divergences_max": 0,
            "max_treedepth_saturation_count_max": 0,
            "energy_bfmi_min": LONGITUDINAL_NUTS_BFMI_MIN,
            "max_mcse_to_posterior_sd_ratio": (
                LONGITUDINAL_NUTS_MCSE_RATIO_MAX
            ),
        },
    }


def _posterior_summary(idata, quantity_name: str) -> PosteriorQuantitySummary:
    draws = np.asarray(idata.posterior[quantity_name], dtype=float).reshape(-1)
    lower, upper = np.quantile(
        draws,
        [STATE_SPACE_INTERVAL_LOWER_QUANTILE, STATE_SPACE_INTERVAL_UPPER_QUANTILE],
    )
    return PosteriorQuantitySummary(
        quantity_name=quantity_name,
        posterior_mean=float(draws.mean()),
        posterior_sd=float(draws.std(ddof=1)),
        interval_80_lower=float(lower),
        interval_80_upper=float(upper),
    )


def _lag_one_within_group_autocorrelation(
    values: np.ndarray,
    prepared: PreparedLongitudinalStateSpace,
) -> float:
    numerator = 0.0
    denominator = 0.0
    for rows in prepared.group_rows:
        series = np.asarray(values, dtype=float)[rows]
        centered = series - series.mean()
        numerator += float(centered[1:] @ centered[:-1])
        denominator += float(centered[:-1] @ centered[:-1])
    return 0.0 if denominator <= 0.0 else float(numerator / denominator)


def _ppc_statistics(
    values: np.ndarray,
    prepared: PreparedLongitudinalStateSpace,
) -> dict[str, float]:
    values = np.asarray(values, dtype=float)
    post = np.asarray(prepared.dataset.post, dtype=int)
    group_means = np.asarray([values[rows].mean() for rows in prepared.group_rows])
    group_variances = np.asarray(
        [values[rows].var(ddof=1) for rows in prepared.group_rows]
    )
    return {
        "pre_post_mean_movement": float(values[post == 1].mean() - values[post == 0].mean()),
        "between_panel_group_variance": float(group_means.var(ddof=1)),
        "within_panel_group_variance": float(group_variances.mean()),
        "tail_or_extreme_aggregate_statistic": float(np.abs(values - values.mean()).max()),
        "lag_one_within_group_autocorrelation": _lag_one_within_group_autocorrelation(
            values, prepared
        ),
    }


def _compute_posterior_predictive_checks(
    idata,
    prepared: PreparedLongitudinalStateSpace,
) -> tuple[LongitudinalPpcResult, ...]:
    posterior_predictive = idata.posterior_predictive
    group_draws = [
        np.asarray(posterior_predictive[f"observed_group_{group}"], dtype=float)
        for group in range(prepared.panel_group_count)
    ]
    sample_count = group_draws[0].shape[0] * group_draws[0].shape[1]
    replicated = np.empty((sample_count, len(prepared.y)), dtype=float)
    for group, rows in enumerate(prepared.group_rows):
        replicated[:, rows] = group_draws[group].reshape(sample_count, len(rows))
    observed = _ppc_statistics(prepared.y, prepared)
    replicated_stats = {
        name: np.empty(sample_count, dtype=float)
        for name in LONGITUDINAL_PPC_STATISTIC_NAMES
    }
    for index, sample in enumerate(replicated):
        statistics = _ppc_statistics(sample, prepared)
        for name in LONGITUDINAL_PPC_STATISTIC_NAMES:
            replicated_stats[name][index] = statistics[name]
    results = []
    for name in LONGITUDINAL_PPC_STATISTIC_NAMES:
        values = replicated_stats[name]
        observed_value = observed[name]
        p_value = float((values >= observed_value).mean())
        lower, upper = np.quantile(
            values,
            [STATE_SPACE_INTERVAL_LOWER_QUANTILE, STATE_SPACE_INTERVAL_UPPER_QUANTILE],
        )
        results.append(
            LongitudinalPpcResult(
                statistic_name=name,
                observed_value=observed_value,
                predictive_mean=float(values.mean()),
                predictive_interval_80_lower=float(lower),
                predictive_interval_80_upper=float(upper),
                p_value=p_value,
                passed=(
                    LONGITUDINAL_NUTS_PPC_VALUE_MIN
                    <= p_value
                    <= LONGITUDINAL_NUTS_PPC_VALUE_MAX
                ),
            )
        )
    return tuple(results)


def fit_longitudinal_nuts_reference(
    prepared: PreparedLongitudinalStateSpace,
    *,
    seed: int,
    mode: Literal["full", "smoke"] = "full",
) -> LongitudinalNutsFit:
    """Fit the compiled full or explicitly nonqualifying smoke reference."""

    validate_longitudinal_seed(seed, name="longitudinal NUTS seed")
    if not isinstance(prepared, PreparedLongitudinalStateSpace):
        raise TypeError("NUTS reference requires PreparedLongitudinalStateSpace")
    settings = nuts_execution_settings(mode)
    model = _build_reference_model(prepared)
    started = time.perf_counter()
    with model:
        idata = pm.sample(
            draws=settings.draws,
            tune=settings.tune,
            chains=settings.chains,
            cores=1,
            random_seed=[seed + chain for chain in range(settings.chains)],
            target_accept=settings.target_accept,
            max_treedepth=settings.max_treedepth,
            nuts_sampler="pymc",
            blas_cores=1,
            progressbar=False,
            compute_convergence_checks=True,
        )
        pm.sample_posterior_predictive(
            idata,
            var_names=[
                f"observed_group_{group}"
                for group in range(prepared.panel_group_count)
            ],
            random_seed=seed,
            progressbar=False,
            extend_inferencedata=True,
        )
    wall_time = time.perf_counter() - started

    summary_names = (
        *prepared.fixed_effect_names,
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
    )
    summaries = tuple(_posterior_summary(idata, name) for name in summary_names)
    sampler_diagnostics = _compute_sampler_diagnostics(
        idata,
        prepared=prepared,
        settings=settings,
    )
    ppc = _compute_posterior_predictive_checks(idata, prepared)
    if not all(check.passed for check in ppc):
        sampler_diagnostics = {
            **sampler_diagnostics,
            "passed": False,
            "failing_diagnostics": list(
                dict.fromkeys(
                    [
                        *sampler_diagnostics["failing_diagnostics"],
                        "posterior_predictive_check",
                    ]
                )
            ),
        }
    return LongitudinalNutsFit(
        idata=idata,
        prepared=prepared,
        settings=settings,
        seed=seed,
        summaries=summaries,
        sampler_diagnostics=sampler_diagnostics,
        posterior_predictive_checks=ppc,
        wall_time_seconds=wall_time,
    )
