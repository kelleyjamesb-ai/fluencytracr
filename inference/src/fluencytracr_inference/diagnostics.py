"""Computed diagnostics with hard numeric gates (contract diagnostics table).

Every required diagnostic is computed as a real number and checked against
the explicit numeric gate mirrored in :mod:`.constants` — never a boolean
flag. Gate outcomes are returned as failing-diagnostic names drawn from the
schema vocabulary so the artifact emitter can HOLD naming every failure.

Gates computed here (task 3.4):

- R-hat <= 1.01 for every sampled parameter (``r_hat``)
- bulk ESS >= 400 and tail ESS >= 400 chain-total per parameter
  (``bulk_ess`` / ``tail_ess``)
- post-warmup divergent transitions == 0 (``divergences``)
- MCSE(posterior mean) and MCSE(interval endpoints) <= 0.1 posterior SD
  (``mcse``)
- max-treedepth saturation and E-BFMI backend warnings as explicit failing
  diagnostics (``max_treedepth_saturation`` / ``energy_bfmi``)
- posterior predictive p-values within [0.05, 0.95] for the five fixed
  statistics (``posterior_predictive_check``)
- prior sensitivity: posterior-mean shift < 0.5 posterior SD across the
  declared prior family, fit under >= 3 prior scalings (``prior_sensitivity``)
- pre-period trend: pre-window pseudo-effect 80% CI includes 0 (``pre_trend``)
- rank and energy plot data recorded as compact numeric summaries in the
  internal report (no image files)
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace as dc_replace
import math

import numpy as np
import arviz as az

from .constants import (
    ENERGY_BFMI_WARNING_THRESHOLD,
    INFERENCE_PROOF_ESS_MIN,
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    INFERENCE_PROOF_FAILING_DIAGNOSTICS,
    INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MIN,
    INFERENCE_PROOF_PPC_STATISTIC_NAMES,
    INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD,
    INFERENCE_PROOF_RHAT_MAX,
)
from .hashing import sha256_json
from .model import (
    OBSERVED_VARIABLE_NAME,
    PRIOR_SENSITIVITY_SCALINGS,
    FitResult,
    HoldViolation,
    PriorSpec,
    fit_did_model,
    fit_pre_trend_pseudo_model,
)
from .synthetic import GROUPINGS, SyntheticDataset


@dataclass(frozen=True)
class ParameterDiagnostic:
    parameter_name: str
    r_hat: float
    bulk_ess: float
    tail_ess: float
    posterior_mean_mcse: float
    interval_endpoint_mcse: float
    posterior_sd: float

    @property
    def max_mcse_to_posterior_sd_ratio(self) -> float:
        # Derivation mirrors the TS schema superRefine exactly (same IEEE
        # max-then-divide on the same serialized doubles).
        max_mcse = max(self.posterior_mean_mcse, self.interval_endpoint_mcse)
        if self.posterior_sd == 0.0:
            return 0.0 if max_mcse == 0.0 else float("inf")
        return max_mcse / self.posterior_sd


@dataclass(frozen=True)
class SamplerDiagnostics:
    parameters: tuple[ParameterDiagnostic, ...]
    post_warmup_divergences: int
    max_treedepth_saturation_rate: float
    max_treedepth_warning: bool
    energy_bfmi_min: float
    energy_bfmi_warning: bool


@dataclass(frozen=True)
class PpcStatistic:
    statistic_name: str
    observed_value: float
    predictive_mean: float
    predictive_ci80_lower: float
    predictive_ci80_upper: float
    p_value: float
    passed: bool


@dataclass(frozen=True)
class PriorSensitivityResult:
    documented: bool
    justification_ref: str | None
    justification_hash: str | None
    posterior_mean_shift_in_posterior_sd: float
    passed: bool
    prior_family: str
    scaling_means: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class PreTrendResult:
    ci80_lower: float
    ci80_upper: float
    includes_zero: bool
    passed: bool
    wall_time_seconds: float


@dataclass(frozen=True)
class DiagnosticsResult:
    sampler: SamplerDiagnostics
    posterior_predictive_checks: tuple[PpcStatistic, ...] | None
    prior_sensitivity: PriorSensitivityResult | None
    pre_trend: PreTrendResult
    internal_report: dict


# --- Sampler diagnostics -----------------------------------------------------


def _tree_values(tree, var_name: str) -> np.ndarray:
    """Extract a variable's values from an ArviZ 1.x DataTree result."""
    node = tree
    if hasattr(tree, "children") and "posterior" in getattr(tree, "children", {}):
        node = tree["posterior"]
    return np.atleast_1d(np.asarray(node[var_name]))


def _flatten(name: str, values: np.ndarray) -> list[tuple[str, float]]:
    flat = values.reshape(-1)
    if flat.size == 1:
        return [(name, float(flat[0]))]
    return [(f"{name}[{i}]", float(v)) for i, v in enumerate(flat)]


def _is_finite(value: float) -> bool:
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _bfmi_values(idata) -> np.ndarray:
    bfmi_result = az.bfmi(idata)
    if isinstance(bfmi_result, dict):  # Compatibility with older wrappers.
        bfmi_result = bfmi_result.get("energy", [])
    data_vars = getattr(bfmi_result, "data_vars", None)
    if data_vars is not None:
        var_names = list(data_vars)
        if "energy" in var_names:
            bfmi_result = bfmi_result["energy"]
        elif len(var_names) == 1:
            bfmi_result = bfmi_result[var_names[0]]
    to_array = getattr(bfmi_result, "to_array", None)
    if callable(to_array):
        bfmi_result = to_array()
    to_numpy = getattr(bfmi_result, "to_numpy", None)
    if callable(to_numpy):
        bfmi_result = to_numpy()
    else:
        values = getattr(bfmi_result, "values", None)
        if callable(values):
            bfmi_result = values()
        elif values is not None:
            bfmi_result = values
    return np.atleast_1d(np.asarray(bfmi_result, dtype=float)).reshape(-1)


def compute_sampler_diagnostics(fit: FitResult) -> SamplerDiagnostics:
    """R-hat / ESS / MCSE per sampled parameter plus backend warnings.

    The parameter table covers posterior variables that can affect the
    fitted estimand — fixed effects including the estimand, hierarchical
    scales, non-centered zero-sum group offsets, and the scaled ``u_*`` group
    effects in the model equation — flattened per element.
    """
    idata = fit.idata
    posterior = idata.posterior
    candidate_var_names = [
        "alpha",
        "beta_post",
        "beta_treated",
        INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
        *[
            name
            for grouping in GROUPINGS
            for name in (
                f"sigma_{grouping}",
                f"z_{grouping}",
                f"u_{grouping}",
            )
        ],
    ]
    var_names = [name for name in candidate_var_names if name in posterior.data_vars]

    rhat_tree = az.rhat(idata, var_names=var_names)
    ess_bulk_tree = az.ess(idata, var_names=var_names, method="bulk")
    ess_tail_tree = az.ess(idata, var_names=var_names, method="tail")
    mcse_mean_tree = az.mcse(idata, var_names=var_names, method="mean")
    mcse_q10_tree = az.mcse(idata, var_names=var_names, method="quantile", prob=0.1)
    mcse_q90_tree = az.mcse(idata, var_names=var_names, method="quantile", prob=0.9)

    parameters: list[ParameterDiagnostic] = []
    for var_name in var_names:
        draws = np.asarray(posterior[var_name])
        # (chain, draw, *shape) -> per-element posterior SD.
        sd = draws.reshape(draws.shape[0] * draws.shape[1], -1).std(axis=0, ddof=1)
        rows = {
            "r_hat": _flatten(var_name, _tree_values(rhat_tree, var_name)),
            "bulk_ess": _flatten(var_name, _tree_values(ess_bulk_tree, var_name)),
            "tail_ess": _flatten(var_name, _tree_values(ess_tail_tree, var_name)),
            "mcse_mean": _flatten(var_name, _tree_values(mcse_mean_tree, var_name)),
            "mcse_q10": _flatten(var_name, _tree_values(mcse_q10_tree, var_name)),
            "mcse_q90": _flatten(var_name, _tree_values(mcse_q90_tree, var_name)),
        }
        names = [name for name, _ in rows["r_hat"]]
        for i, parameter_name in enumerate(names):
            parameters.append(
                ParameterDiagnostic(
                    parameter_name=parameter_name,
                    r_hat=rows["r_hat"][i][1],
                    bulk_ess=rows["bulk_ess"][i][1],
                    tail_ess=rows["tail_ess"][i][1],
                    posterior_mean_mcse=rows["mcse_mean"][i][1],
                    interval_endpoint_mcse=max(rows["mcse_q10"][i][1], rows["mcse_q90"][i][1]),
                    posterior_sd=float(sd[i]),
                )
            )

    sample_stats = idata.sample_stats
    divergences = int(np.asarray(sample_stats["diverging"]).sum())
    if "reached_max_treedepth" in sample_stats.data_vars:
        saturation_rate = float(np.asarray(sample_stats["reached_max_treedepth"]).mean())
    elif "tree_depth" in sample_stats.data_vars:
        saturation_rate = float((np.asarray(sample_stats["tree_depth"]) >= fit.max_treedepth).mean())
    else:  # pragma: no cover - backend variant
        saturation_rate = float("nan")

    bfmi_values = _bfmi_values(idata)
    bfmi_min = float(bfmi_values.min()) if bfmi_values.size else float("nan")

    return SamplerDiagnostics(
        parameters=tuple(parameters),
        post_warmup_divergences=divergences,
        max_treedepth_saturation_rate=saturation_rate,
        max_treedepth_warning=saturation_rate > 0.0,
        energy_bfmi_min=bfmi_min,
        energy_bfmi_warning=bfmi_min < ENERGY_BFMI_WARNING_THRESHOLD,
    )


# --- Posterior predictive checks ---------------------------------------------


def _ppc_statistics(
    y: np.ndarray, dataset: SyntheticDataset
) -> dict[str, float]:
    """The five FIXED PPC statistics for one (observed or replicated) vector."""
    post = dataset.post
    treated = dataset.treated
    cohort_idx = dataset.cohort_idx
    cohorts = np.unique(cohort_idx)
    cohort_means = np.array([y[cohort_idx == c].mean() for c in cohorts])
    cohort_vars = np.array([y[cohort_idx == c].var(ddof=1) for c in cohorts])
    did = (
        y[(treated == 1) & (post == 1)].mean() - y[(treated == 1) & (post == 0)].mean()
    ) - (
        (y[(treated == 0) & (post == 1)].mean() - y[(treated == 0) & (post == 0)].mean())
        if (treated == 0).any()
        else 0.0
    )
    return {
        "pre_post_mean_movement": float(y[post == 1].mean() - y[post == 0].mean()),
        "between_cohort_variance": float(cohort_means.var(ddof=1)),
        "within_cohort_variance": float(cohort_vars.mean()),
        "tail_or_extreme_cell_statistic": float(np.abs(y - y.mean()).max()),
        "difference_in_differences_contrast": float(did),
    }


def compute_posterior_predictive_checks(fit: FitResult) -> tuple[PpcStatistic, ...]:
    """PPC p-values for the five fixed statistics against the [0.05, 0.95] band."""
    dataset = fit.dataset
    y_rep = np.asarray(fit.idata.posterior_predictive[OBSERVED_VARIABLE_NAME])
    y_rep = y_rep.reshape(-1, y_rep.shape[-1])  # (samples, windows)

    observed = _ppc_statistics(dataset.y, dataset)
    replicated: dict[str, list[float]] = {name: [] for name in observed}
    for sample in y_rep:
        stats = _ppc_statistics(sample, dataset)
        for name, value in stats.items():
            replicated[name].append(value)

    results = []
    for statistic_name in INFERENCE_PROOF_PPC_STATISTIC_NAMES:
        rep = np.asarray(replicated[statistic_name])
        obs = observed[statistic_name]
        p_value = float((rep >= obs).mean())
        lower, upper = np.quantile(rep, [0.1, 0.9])
        results.append(
            PpcStatistic(
                statistic_name=statistic_name,
                observed_value=obs,
                predictive_mean=float(rep.mean()),
                predictive_ci80_lower=float(lower),
                predictive_ci80_upper=float(upper),
                p_value=p_value,
                passed=INFERENCE_PROOF_PPC_P_VALUE_MIN
                <= p_value
                <= INFERENCE_PROOF_PPC_P_VALUE_MAX,
            )
        )
    return tuple(results)


# --- Prior sensitivity --------------------------------------------------------


def run_prior_sensitivity(
    base_fit: FitResult,
    *,
    scalings: tuple[float, ...] = PRIOR_SENSITIVITY_SCALINGS,
    draws: int = 300,
    tune: int = 400,
    seed: int | None = None,
) -> PriorSensitivityResult:
    """Refit under the declared prior family and measure estimand-mean shift.

    The declared family is the base :class:`PriorSpec` under >= 3 prior
    scalings (base 1.0 plus ``scalings``). The gate: max posterior-mean shift
    across the family must stay below 0.5 posterior SD of the base fit.
    """
    if len(scalings) < 2:
        raise ValueError("the declared prior family requires at least 3 scalings including base")
    base_summary = base_fit.estimand_summary()
    base_mean = base_summary["posterior_mean"]
    base_sd = base_summary["posterior_sd"]

    scaling_means: dict[str, float] = {"1.0": float(base_mean)}
    max_shift_sd = 0.0
    for multiplier in scalings:
        scaled_fit = fit_did_model(
            base_fit.dataset,
            prior_spec=dc_replace(base_fit.prior_spec, scale_multiplier=multiplier),
            draws=draws,
            tune=tune,
            chains=base_fit.chains,
            seed=seed if seed is not None else base_fit.seed,
            target_accept=base_fit.target_accept,
            max_treedepth=base_fit.max_treedepth,
        )
        scaled_mean = scaled_fit.estimand_summary()["posterior_mean"]
        scaling_means[str(multiplier)] = float(scaled_mean)
        shift_sd = abs(scaled_mean - base_mean) / base_sd if base_sd > 0 else float("inf")
        max_shift_sd = max(max_shift_sd, shift_sd)

    justification_ref = base_fit.prior_spec.justification_ref
    justification_hash = sha256_json(
        {
            "justification_ref": justification_ref,
            "prior_family": base_fit.prior_spec.family_name,
            "prior_spec": base_fit.prior_spec.describe(),
            "scalings": [1.0, *[float(s) for s in scalings]],
        }
    )
    return PriorSensitivityResult(
        documented=True,
        justification_ref=justification_ref,
        justification_hash=justification_hash,
        posterior_mean_shift_in_posterior_sd=float(max_shift_sd),
        passed=max_shift_sd < INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD,
        prior_family=base_fit.prior_spec.family_name,
        scaling_means=scaling_means,
    )


# --- Pre-period trend check -----------------------------------------------------


def run_pre_trend_check(
    dataset: SyntheticDataset,
    *,
    draws: int = 400,
    tune: int = 400,
    chains: int = 2,
    seed: int = 20260706,
) -> PreTrendResult:
    """Pre-window pseudo-effect 80% credible interval must include 0."""
    try:
        fit = fit_pre_trend_pseudo_model(
            dataset, draws=draws, tune=tune, chains=chains, seed=seed
        )
    except HoldViolation as violation:
        if violation.failing_diagnostic != "pre_trend":
            raise
        return PreTrendResult(
            ci80_lower=1.0,
            ci80_upper=1.0,
            includes_zero=False,
            passed=False,
            wall_time_seconds=0.0,
        )
    pseudo_draws = fit.estimand_draws.reshape(-1)
    lower, upper = np.quantile(pseudo_draws, [0.1, 0.9])
    includes_zero = bool(lower <= 0.0 <= upper)
    return PreTrendResult(
        ci80_lower=float(lower),
        ci80_upper=float(upper),
        includes_zero=includes_zero,
        passed=includes_zero,
        wall_time_seconds=fit.wall_time_seconds,
    )


# --- Rank / energy compact summaries --------------------------------------------


def rank_and_energy_summaries(fit: FitResult, *, rank_bins: int = 8) -> dict:
    """Compact numeric rank-plot and energy-plot data (no image files)."""
    draws = fit.estimand_draws  # (chain, draw)
    pooled_ranks = np.argsort(np.argsort(draws.reshape(-1))).reshape(draws.shape)
    n_total = draws.size
    edges = np.linspace(0, n_total, rank_bins + 1)
    rank_histogram_per_chain = [
        np.histogram(pooled_ranks[chain], bins=edges)[0].tolist()
        for chain in range(draws.shape[0])
    ]
    energy = np.asarray(fit.idata.sample_stats["energy"])
    bfmi_values = _bfmi_values(fit.idata)
    return {
        "rank_plot": {
            "parameter_name": INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
            "bins": rank_bins,
            "expected_count_per_bin": n_total / rank_bins / draws.shape[0],
            "per_chain_counts": rank_histogram_per_chain,
        },
        "energy_plot": {
            "per_chain_energy_mean": [float(v) for v in energy.mean(axis=1)],
            "per_chain_energy_sd": [float(v) for v in energy.std(axis=1, ddof=1)],
            "per_chain_bfmi": [float(v) for v in bfmi_values],
        },
    }


# --- Full diagnostics + gate evaluation ------------------------------------------


def compute_diagnostics(
    fit: FitResult,
    *,
    prior_sensitivity_draws: int = 300,
    prior_sensitivity_tune: int = 400,
    pre_trend_draws: int = 400,
    pre_trend_tune: int = 400,
) -> DiagnosticsResult:
    """Compute every gate for real: sampler, PPC, prior sensitivity, pre-trend."""
    sampler = compute_sampler_diagnostics(fit)
    ppc = compute_posterior_predictive_checks(fit)
    prior_sensitivity = run_prior_sensitivity(
        fit, draws=prior_sensitivity_draws, tune=prior_sensitivity_tune
    )
    pre_trend = run_pre_trend_check(
        fit.dataset,
        draws=pre_trend_draws,
        tune=pre_trend_tune,
        chains=fit.chains,
        seed=fit.seed,
    )
    internal_report = {
        **rank_and_energy_summaries(fit),
        "pooling_factors": dict(fit.pooling_factors),
        "prior_sensitivity_scaling_means": dict(prior_sensitivity.scaling_means),
        "fit_wall_time_seconds": float(fit.wall_time_seconds),
        "pre_trend_wall_time_seconds": float(pre_trend.wall_time_seconds),
    }
    return DiagnosticsResult(
        sampler=sampler,
        posterior_predictive_checks=ppc,
        prior_sensitivity=prior_sensitivity,
        pre_trend=pre_trend,
        internal_report=internal_report,
    )


def evaluate_gates(diagnostics: DiagnosticsResult) -> list[str]:
    """Every failing gate as a schema failing-diagnostic name, in vocabulary order."""
    failing: set[str] = set()
    sampler = diagnostics.sampler

    if not any(
        p.parameter_name == INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME
        for p in sampler.parameters
    ):
        failing.add("sampler_diagnostic")
    for parameter in sampler.parameters:
        if not _is_finite(parameter.r_hat) or parameter.r_hat > INFERENCE_PROOF_RHAT_MAX:
            failing.add("r_hat")
        if not _is_finite(parameter.bulk_ess) or parameter.bulk_ess < INFERENCE_PROOF_ESS_MIN:
            failing.add("bulk_ess")
        if not _is_finite(parameter.tail_ess) or parameter.tail_ess < INFERENCE_PROOF_ESS_MIN:
            failing.add("tail_ess")
        if (
            not _is_finite(parameter.posterior_mean_mcse)
            or not _is_finite(parameter.interval_endpoint_mcse)
            or not _is_finite(parameter.posterior_sd)
            or not _is_finite(parameter.max_mcse_to_posterior_sd_ratio)
            or parameter.max_mcse_to_posterior_sd_ratio
            > INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX
        ):
            failing.add("mcse")
    if (
        not _is_finite(sampler.post_warmup_divergences)
        or sampler.post_warmup_divergences > 0
    ):
        failing.add("divergences")
    if (
        sampler.max_treedepth_warning
        or not _is_finite(sampler.max_treedepth_saturation_rate)
        or sampler.max_treedepth_saturation_rate > 0
    ):
        failing.add("max_treedepth_saturation")
    if (
        sampler.energy_bfmi_warning
        or not _is_finite(sampler.energy_bfmi_min)
        or sampler.energy_bfmi_min < ENERGY_BFMI_WARNING_THRESHOLD
    ):
        failing.add("energy_bfmi")

    ppc = diagnostics.posterior_predictive_checks
    if ppc is None:
        failing.add("posterior_predictive_check")
    else:
        observed_names = {statistic.statistic_name for statistic in ppc}
        if observed_names != set(INFERENCE_PROOF_PPC_STATISTIC_NAMES):
            failing.add("posterior_predictive_check")
        for statistic in ppc:
            if (
                not _is_finite(statistic.observed_value)
                or not _is_finite(statistic.predictive_mean)
                or not _is_finite(statistic.predictive_ci80_lower)
                or not _is_finite(statistic.predictive_ci80_upper)
                or not _is_finite(statistic.p_value)
                or not statistic.passed
                or statistic.p_value < INFERENCE_PROOF_PPC_P_VALUE_MIN
                or statistic.p_value > INFERENCE_PROOF_PPC_P_VALUE_MAX
            ):
                failing.add("posterior_predictive_check")

    sensitivity = diagnostics.prior_sensitivity
    if sensitivity is None:
        failing.add("prior_sensitivity")
    else:
        if (
            not sensitivity.documented
            or sensitivity.justification_ref is None
            or sensitivity.justification_hash is None
            or not sensitivity.passed
            or not _is_finite(sensitivity.posterior_mean_shift_in_posterior_sd)
            or sensitivity.posterior_mean_shift_in_posterior_sd
            >= INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD
        ):
            failing.add("prior_sensitivity")

    pre_trend = diagnostics.pre_trend
    if (
        not _is_finite(pre_trend.ci80_lower)
        or not _is_finite(pre_trend.ci80_upper)
        or not pre_trend.passed
        or not pre_trend.includes_zero
    ):
        failing.add("pre_trend")

    return [name for name in INFERENCE_PROOF_FAILING_DIAGNOSTICS if name in failing]
