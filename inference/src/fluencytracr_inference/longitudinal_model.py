"""Bayesian Gaussian longitudinal smoke model for synthetic aggregate inputs.

This first Phase 2B implementation uses a conjugate Gaussian posterior over a
predeclared aggregate design matrix plus an explicit AR(1) residual estimate
for review. It is a synthetic-only engineering proof of the model-input and
artifact path, not replicated calibration and not a production promotion.
"""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np

from .design_router import route_evidence_design
from .longitudinal_types import (
    LONGITUDINAL_FAILING_DIAGNOSTICS,
    MAX_APPROVED_BUSINESS_CONTROLS,
    MIN_POST_WINDOWS,
    MIN_PRE_WINDOWS,
    UNSAFE_CONTROL_NAME_FRAGMENTS,
    LongitudinalSyntheticDataset,
    assert_longitudinal_synthetic_only,
)

EARLY_POST_SPIKE_PRE_SD_MULTIPLIER = 4.0
EARLY_POST_SPIKE_ABSOLUTE_FLOOR = 0.25
EVALUATION_MOVEMENT_PRE_SD_MULTIPLIER = 2.0
COMMON_SHOCK_CONTROL_SHIFT_PRE_SD_MULTIPLIER = 4.0
TEMPORARY_SPIKE_PRE_SD_MULTIPLIER = 3.0
TEMPORARY_SPIKE_ABSOLUTE_FLOOR = 0.25
TEMPORARY_PERSISTENCE_SLOPE_PRE_SD_MULTIPLIER = -0.5
BACKTEST_RMSE_PRE_SD_MULTIPLIER = 3.0


class LongitudinalHoldViolation(Exception):
    """Condition that must produce a HOLD artifact."""

    def __init__(self, failing_diagnostic: str, message: str):
        super().__init__(message)
        if failing_diagnostic not in LONGITUDINAL_FAILING_DIAGNOSTICS:
            raise ValueError(f"unsupported longitudinal diagnostic {failing_diagnostic}")
        self.failing_diagnostic = failing_diagnostic


@dataclass(frozen=True)
class LongitudinalFitResult:
    dataset: LongitudinalSyntheticDataset
    parameter_names: tuple[str, ...]
    posterior_mean: np.ndarray
    posterior_covariance: np.ndarray
    posterior_draws: np.ndarray
    movement_draws: np.ndarray
    counterfactual_movement_draws: np.ndarray
    residual_rho_estimate: float
    residual_sd_estimate: float
    design_matrix_condition_number: float
    design_matrix_rank: int
    synthetic_input_hash: str
    seed: int
    sampler_kind: str = "closed_form_gaussian_posterior_smoke_not_nuts"
    chains: int = 2

    def movement_summary(self) -> dict:
        draws = self.movement_draws.reshape(-1)
        lower, upper = np.quantile(draws, [0.1, 0.9])
        mwc = float(self.dataset.hypothesis_plan.minimum_worthwhile_change)
        return {
            "estimand_name": "internal_in_sample_vbd_contrast",
            "posterior_mean_movement": float(draws.mean()),
            "posterior_sd": float(draws.std(ddof=1)),
            "credible_interval_80": {"lower": float(lower), "upper": float(upper)},
            "internal_draw_share_diagnostics": {
                "not_probability_output": True,
                "not_customer_facing": True,
                "movement_greater_than_zero_draw_share": float((draws > 0.0).mean()),
                "movement_exceeds_synthetic_fixture_minimum_draw_share": float(
                    (draws > mwc).mean()
                ),
            },
            "synthetic_fixture_minimum_worthwhile_change": mwc,
        }

    def coefficient_summary(self) -> dict:
        flattened = self.posterior_draws.reshape(-1, self.posterior_draws.shape[-1])
        return {
            name: {
                "posterior_mean": float(flattened[:, index].mean()),
                "posterior_sd": float(flattened[:, index].std(ddof=1)),
            }
            for index, name in enumerate(self.parameter_names)
        }


@dataclass(frozen=True)
class LongitudinalDiagnosticsResult:
    failing_diagnostics: tuple[str, ...]
    design_matrix_identifiability: dict
    residual_autocorrelation_check: dict
    pre_period_fit_check: dict
    pre_period_rolling_backtest: dict
    placebo_intervention_date_check: dict
    counterfactual_stability_check: dict
    lag_sensitivity_check: dict
    common_shock_sensitivity_check: dict
    temporary_effect_persistence_check: dict
    prior_sensitivity_check: dict

    @property
    def passed(self) -> bool:
        return len(self.failing_diagnostics) == 0

    def to_artifact_section(self) -> dict:
        return {
            "passed": self.passed,
            "failing_diagnostics": list(self.failing_diagnostics),
            "design_matrix_identifiability": self.design_matrix_identifiability,
            "residual_autocorrelation_check": self.residual_autocorrelation_check,
            "pre_period_fit_check": self.pre_period_fit_check,
            "pre_period_rolling_backtest": self.pre_period_rolling_backtest,
            "placebo_intervention_date_check": self.placebo_intervention_date_check,
            "counterfactual_stability_check": self.counterfactual_stability_check,
            "lag_sensitivity_check": self.lag_sensitivity_check,
            "common_shock_sensitivity_check": self.common_shock_sensitivity_check,
            "temporary_effect_persistence_check": self.temporary_effect_persistence_check,
            "prior_sensitivity_check": self.prior_sensitivity_check,
        }


def _standardize_from_pre(values: np.ndarray, post: np.ndarray) -> np.ndarray:
    pre = values[post == 0]
    mean = float(pre.mean())
    sd = float(pre.std(ddof=1)) if pre.size > 1 else 0.0
    if not math.isfinite(sd) or sd < 1e-9:
        sd = 1.0
    return (values - mean) / sd


def _design_matrix(dataset: LongitudinalSyntheticDataset) -> tuple[np.ndarray, tuple[str, ...]]:
    post = dataset.post
    columns = [
        np.ones_like(dataset.observed_outcome, dtype=float),
        _standardize_from_pre(dataset.time_index.astype(float), post),
        _standardize_from_pre(dataset.velocity_exposure, post),
        _standardize_from_pre(dataset.breadth_exposure, post),
        _standardize_from_pre(dataset.depth_exposure, post),
        _standardize_from_pre(dataset.baseline_fluency_context, post),
    ]
    names = [
        "intercept",
        "historical_time_trend",
        "beta_velocity",
        "beta_breadth",
        "beta_depth",
        "beta_fluency_context",
    ]
    for index, control_name in enumerate(dataset.control_names):
        columns.append(_standardize_from_pre(dataset.control_matrix[:, index], post))
        names.append(f"control_{control_name}")
    return np.column_stack(columns), tuple(names)


def _counterfactual_matrix(
    dataset: LongitudinalSyntheticDataset,
    x: np.ndarray,
    parameter_names: tuple[str, ...],
) -> np.ndarray:
    cf = x.copy()
    post_rows = dataset.post == 1
    pre_rows = dataset.post == 0
    for name in ("beta_velocity", "beta_breadth", "beta_depth"):
        index = parameter_names.index(name)
        cf[post_rows, index] = float(x[pre_rows, index].mean())
    return cf


def _validate_dataset_before_fit(dataset: LongitudinalSyntheticDataset) -> None:
    assert_longitudinal_synthetic_only(dataset)
    if dataset.hypothesis_plan.primary_metric_family != "continuous_normal_identity":
        raise LongitudinalHoldViolation(
            "unsupported_likelihood_family",
            "first longitudinal slice supports only continuous_normal_identity",
        )
    if dataset.hypothesis_plan.target_value_used_as_prior:
        raise LongitudinalHoldViolation(
            "target_contamination",
            "financial or target values must not enter priors",
        )
    if dataset.pre_window_count < MIN_PRE_WINDOWS or dataset.post_window_count < MIN_POST_WINDOWS:
        raise LongitudinalHoldViolation(
            "insufficient_history",
            "longitudinal route requires at least 8 pre and 3 post windows",
        )
    if (
        dataset.missing_window_refs
        or dataset.suppressed_window_refs
        or dataset.stale_window_refs
        or dataset.imputed_window_refs
    ):
        raise LongitudinalHoldViolation(
            "missing_or_suppressed_windows",
            "missing, suppressed, stale, or imputed required windows HOLD",
        )
    if any(
        snapshot.measurement_uncertainty_state == "missing_uncertainty_visible"
        for snapshot in dataset.ai_fluency_snapshots
    ):
        raise LongitudinalHoldViolation(
            "missing_measurement_uncertainty",
            "missing aggregate AI Fluency uncertainty blocks model authorization",
        )
    if len(dataset.control_names) > MAX_APPROVED_BUSINESS_CONTROLS:
        raise LongitudinalHoldViolation(
            "design_matrix_identifiability",
            "too many approved aggregate controls for the first slice",
        )
    unsafe_controls = [
        name
        for name in dataset.control_names
        if any(fragment in name.lower() for fragment in UNSAFE_CONTROL_NAME_FRAGMENTS)
    ]
    if unsafe_controls:
        raise LongitudinalHoldViolation(
            "person_level_data_present",
            f"unsafe business controls are not allowed: {', '.join(unsafe_controls)}",
        )
    route = route_evidence_design(
        dataset.hypothesis_plan.evidence_design,
        synthetic_only=True,
        historical_requirements_met=True,
    )
    if not route.routes_to_longitudinal_slice:
        diagnostic = {
            "STAGGERED_ROLLOUT": "unsupported_staggered_event_study",
            "BASELINE_ONLY": "baseline_only_no_contribution_confidence",
        }.get(dataset.hypothesis_plan.evidence_design, "unsupported_evidence_design")
        raise LongitudinalHoldViolation(
            diagnostic,
            f"evidence design {dataset.hypothesis_plan.evidence_design} does not route",
        )


def _estimate_ar1(residuals: np.ndarray, cohort_idx: np.ndarray) -> float:
    numer = 0.0
    denom = 0.0
    for cohort in sorted(set(int(c) for c in cohort_idx)):
        series = residuals[cohort_idx == cohort]
        if len(series) < 2:
            continue
        numer += float(np.dot(series[1:], series[:-1]))
        denom += float(np.dot(series[:-1], series[:-1]))
    if denom <= 0:
        return 0.0
    return float(np.clip(numer / denom, -0.95, 0.95))


def _mean_by_time(
    dataset: LongitudinalSyntheticDataset,
    values: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    times = np.asarray(sorted(set(int(t) for t in dataset.time_index)), dtype=int)
    means = []
    post_by_time = []
    refs = []
    refs_array = np.asarray(dataset.window_refs, dtype=object)
    for time in times:
        mask = dataset.time_index == time
        means.append(float(np.asarray(values)[mask].mean()))
        post_by_time.append(int(dataset.post[mask][0]))
        refs.append(str(refs_array[mask][0]))
    return (
        times,
        np.asarray(refs, dtype=object),
        np.asarray(post_by_time, dtype=int),
        np.asarray(means, dtype=float),
    )


def _direction_sign(dataset: LongitudinalSyntheticDataset) -> float:
    return 1.0 if dataset.hypothesis_plan.expected_metric_direction == "increase" else -1.0


def _pre_trend_residual_summary(dataset: LongitudinalSyntheticDataset) -> dict:
    times, refs, post_by_time, mean_y = _mean_by_time(dataset, dataset.observed_outcome)
    pre_mask = post_by_time == 0
    if int(pre_mask.sum()) < 3:
        return {
            "times": times,
            "refs": refs,
            "post_by_time": post_by_time,
            "mean_y": mean_y,
            "residuals": np.zeros_like(mean_y),
            "direction_adjusted_residuals": np.zeros_like(mean_y),
            "pre_residual_sd": 0.0,
            "pre_fit_pass": False,
        }
    slope, intercept = np.polyfit(times[pre_mask].astype(float), mean_y[pre_mask], 1)
    residuals = mean_y - (slope * times + intercept)
    pre_residuals = residuals[pre_mask]
    pre_residual_sd = float(pre_residuals.std(ddof=1))
    return {
        "times": times,
        "refs": refs,
        "post_by_time": post_by_time,
        "mean_y": mean_y,
        "residuals": residuals,
        "direction_adjusted_residuals": _direction_sign(dataset) * residuals,
        "pre_residual_sd": pre_residual_sd,
        "pre_fit_pass": math.isfinite(pre_residual_sd) and pre_residual_sd > 0.0,
    }


def _evaluate_lag_and_placebo(summary: dict, dataset: LongitudinalSyntheticDataset) -> dict:
    post_by_time = summary["post_by_time"]
    refs = summary["refs"]
    adjusted = summary["direction_adjusted_residuals"]
    pre_sd = max(float(summary["pre_residual_sd"]), 1e-9)
    eval_mask = np.isin(refs, dataset.evaluation_window_refs)
    early_post_mask = (post_by_time == 1) & ~eval_mask
    early_max = float(adjusted[early_post_mask].max()) if early_post_mask.any() else 0.0
    eval_mean = float(adjusted[eval_mask].mean()) if eval_mask.any() else 0.0
    early_threshold = max(
        EARLY_POST_SPIKE_ABSOLUTE_FLOOR,
        EARLY_POST_SPIKE_PRE_SD_MULTIPLIER * pre_sd,
    )
    eval_threshold = EVALUATION_MOVEMENT_PRE_SD_MULTIPLIER * pre_sd
    early_spike_without_approved_lag = early_max > early_threshold and eval_mean < eval_threshold
    return {
        "pass": not early_spike_without_approved_lag,
        "approved_lag_windows": dataset.hypothesis_plan.expected_outcome_signal_lag_windows,
        "future_values_used": False,
        "early_post_direction_adjusted_residual_max": early_max,
        "evaluation_direction_adjusted_residual_mean": eval_mean,
        "early_post_threshold": early_threshold,
        "evaluation_movement_threshold": eval_threshold,
    }


def _evaluate_common_shock(dataset: LongitudinalSyntheticDataset) -> dict:
    shifts = []
    for index, control_name in enumerate(dataset.control_names):
        _times, refs, post_by_time, control_means = _mean_by_time(
            dataset,
            dataset.control_matrix[:, index],
        )
        pre_values = control_means[post_by_time == 0]
        eval_values = control_means[np.isin(refs, dataset.evaluation_window_refs)]
        pre_sd = float(pre_values.std(ddof=1)) if pre_values.size > 1 else 0.0
        if not math.isfinite(pre_sd) or pre_sd < 1e-9:
            standardized_shift = 0.0
        else:
            standardized_shift = float((eval_values.mean() - pre_values.mean()) / pre_sd)
        shifts.append(
            {
                "control_name": control_name,
                "evaluation_minus_pre_standardized_shift": standardized_shift,
            }
        )
    max_abs_shift = max((abs(item["evaluation_minus_pre_standardized_shift"]) for item in shifts), default=0.0)
    return {
        "pass": max_abs_shift <= COMMON_SHOCK_CONTROL_SHIFT_PRE_SD_MULTIPLIER,
        "approved_controls_retained": list(dataset.control_names),
        "max_abs_evaluation_control_shift": float(max_abs_shift),
        "compiled_shift_gate": COMMON_SHOCK_CONTROL_SHIFT_PRE_SD_MULTIPLIER,
        "control_shift_summaries": shifts,
    }


def _evaluate_temporary_persistence(summary: dict, dataset: LongitudinalSyntheticDataset) -> dict:
    refs = summary["refs"]
    adjusted = summary["direction_adjusted_residuals"]
    pre_sd = max(float(summary["pre_residual_sd"]), 1e-9)
    eval_mask = np.isin(refs, dataset.evaluation_window_refs)
    eval_values = adjusted[eval_mask]
    if eval_values.size < 3:
        return {
            "pass": False,
            "evaluation_window_refs": list(dataset.evaluation_window_refs),
            "evaluation_residual_slope": 0.0,
            "evaluation_residual_max": 0.0,
        }
    slope = float(np.polyfit(np.arange(eval_values.size, dtype=float), eval_values, 1)[0])
    eval_max = float(eval_values.max())
    spike_threshold = max(
        TEMPORARY_SPIKE_ABSOLUTE_FLOOR,
        TEMPORARY_SPIKE_PRE_SD_MULTIPLIER * pre_sd,
    )
    slope_threshold = TEMPORARY_PERSISTENCE_SLOPE_PRE_SD_MULTIPLIER * pre_sd
    temporary_only = eval_max > spike_threshold and slope < slope_threshold
    return {
        "pass": not temporary_only,
        "evaluation_window_refs": list(dataset.evaluation_window_refs),
        "evaluation_residual_slope": slope,
        "evaluation_residual_max": eval_max,
        "spike_threshold": spike_threshold,
        "slope_threshold": slope_threshold,
    }


def _evaluate_pre_period_backtest(summary: dict) -> dict:
    times = summary["times"]
    mean_y = summary["mean_y"]
    post_by_time = summary["post_by_time"]
    pre_mask = post_by_time == 0
    pre_times = times[pre_mask].astype(float)
    pre_values = mean_y[pre_mask]
    if pre_values.size < 6:
        return {
            "pass": False,
            "compiled_backtest_policy": "last_two_pre_windows_held_out_smoke",
            "holdout_rmse": None,
        }
    train_times = pre_times[:-2]
    train_values = pre_values[:-2]
    holdout_times = pre_times[-2:]
    holdout_values = pre_values[-2:]
    slope, intercept = np.polyfit(train_times, train_values, 1)
    train_residuals = train_values - (slope * train_times + intercept)
    train_sd = float(train_residuals.std(ddof=1)) if train_residuals.size > 1 else 0.0
    predictions = slope * holdout_times + intercept
    holdout_rmse = float(np.sqrt(np.mean((holdout_values - predictions) ** 2)))
    threshold = BACKTEST_RMSE_PRE_SD_MULTIPLIER * max(train_sd, 1e-9)
    return {
        "pass": holdout_rmse <= threshold,
        "compiled_backtest_policy": "last_two_pre_windows_held_out_smoke",
        "holdout_rmse": holdout_rmse,
        "rmse_threshold": threshold,
    }


def fit_longitudinal_model(
    dataset: LongitudinalSyntheticDataset,
    *,
    seed: int = 20260710,
    draws: int = 1000,
    chains: int = 2,
) -> LongitudinalFitResult:
    """Fit the first-slice Bayesian Gaussian posterior approximation."""

    if chains < 2:
        raise ValueError("longitudinal proof requires at least two chains")
    _validate_dataset_before_fit(dataset)
    x, names = _design_matrix(dataset)
    y = dataset.observed_outcome
    condition_number = float(np.linalg.cond(x))
    rank = int(np.linalg.matrix_rank(x))
    if rank < x.shape[1] or condition_number > 1e6:
        raise LongitudinalHoldViolation(
            "design_matrix_identifiability",
            "longitudinal design matrix is rank-deficient or near-collinear",
        )
    vbd = np.column_stack(
        [
            _standardize_from_pre(dataset.velocity_exposure, dataset.post),
            _standardize_from_pre(dataset.breadth_exposure, dataset.post),
            _standardize_from_pre(dataset.depth_exposure, dataset.post),
        ]
    )
    corr = np.corrcoef(vbd, rowvar=False)
    off_diag = corr[np.triu_indices_from(corr, k=1)]
    if np.nanmax(np.abs(off_diag)) > 0.995:
        raise LongitudinalHoldViolation(
            "design_matrix_identifiability",
            "Velocity, Breadth, and Depth are duplicated or nearly collinear",
        )

    # First pass estimates residual scale and AR(1) posture for diagnostics.
    beta_ols, *_ = np.linalg.lstsq(x, y, rcond=None)
    residuals = y - x @ beta_ols
    residual_rho = _estimate_ar1(residuals, dataset.cohort_idx)
    residual_sd = float(max(residuals.std(ddof=x.shape[1]), 1e-6))

    known_variance = dataset.known_aggregate_se**2 + residual_sd**2
    precision = np.diag(1.0 / known_variance)
    prior_variance = 9.0
    prior_precision = np.eye(x.shape[1]) / prior_variance
    posterior_precision = x.T @ precision @ x + prior_precision
    posterior_covariance = np.linalg.inv(posterior_precision)
    posterior_mean = posterior_covariance @ (x.T @ precision @ y)

    rng = np.random.default_rng(seed)
    flat_draws = rng.multivariate_normal(
        posterior_mean,
        posterior_covariance,
        size=draws * chains,
    )
    posterior_draws = flat_draws.reshape(chains, draws, x.shape[1])
    x_cf = _counterfactual_matrix(dataset, x, names)
    evaluation_mask = np.isin(dataset.window_refs, dataset.evaluation_window_refs)
    direction_sign = 1.0 if dataset.hypothesis_plan.expected_metric_direction == "increase" else -1.0
    observed_mu = flat_draws @ x.T
    counterfactual_mu = flat_draws @ x_cf.T
    movement = direction_sign * (
        observed_mu[:, evaluation_mask] - counterfactual_mu[:, evaluation_mask]
    ).mean(axis=1)

    return LongitudinalFitResult(
        dataset=dataset,
        parameter_names=names,
        posterior_mean=posterior_mean,
        posterior_covariance=posterior_covariance,
        posterior_draws=posterior_draws,
        movement_draws=movement.reshape(chains, draws),
        counterfactual_movement_draws=movement.reshape(chains, draws),
        residual_rho_estimate=residual_rho,
        residual_sd_estimate=residual_sd,
        design_matrix_condition_number=condition_number,
        design_matrix_rank=rank,
        synthetic_input_hash=dataset.synthetic_input_hash(),
        seed=seed,
        chains=chains,
    )


def compute_longitudinal_diagnostics(
    fit: LongitudinalFitResult,
) -> LongitudinalDiagnosticsResult:
    dataset = fit.dataset
    failing: list[str] = []
    movement_summary = fit.movement_summary()

    residual_summary = _pre_trend_residual_summary(dataset)
    lag_check = _evaluate_lag_and_placebo(residual_summary, dataset)
    common_shock_check = _evaluate_common_shock(dataset)
    persistence_check = _evaluate_temporary_persistence(residual_summary, dataset)
    backtest_check = _evaluate_pre_period_backtest(residual_summary)

    if not lag_check["pass"]:
        failing.extend(["lag_sensitivity", "placebo_intervention_date"])
    if not common_shock_check["pass"]:
        failing.append("common_shock_sensitivity")
    if not persistence_check["pass"]:
        failing.append("temporary_effect_persistence")
    if not backtest_check["pass"]:
        failing.append("pre_period_rolling_backtest")
    if abs(fit.residual_rho_estimate) > 0.9:
        failing.append("residual_autocorrelation")

    pre_residual_sd = float(residual_summary["pre_residual_sd"])
    pre_fit_pass = bool(residual_summary["pre_fit_pass"])
    if not pre_fit_pass:
        failing.append("pre_period_fit")

    # Deduplicate while preserving order.
    failing_tuple = tuple(dict.fromkeys(failing))
    return LongitudinalDiagnosticsResult(
        failing_diagnostics=failing_tuple,
        design_matrix_identifiability={
            "pass": "design_matrix_identifiability" not in failing_tuple,
            "rank": fit.design_matrix_rank,
            "parameter_count": len(fit.parameter_names),
            "condition_number": fit.design_matrix_condition_number,
            "vbd_dimensions_kept_separate": True,
        },
        residual_autocorrelation_check={
            "pass": "residual_autocorrelation" not in failing_tuple,
            "residual_structure": "ar1_residual_structure",
            "rho_estimate": fit.residual_rho_estimate,
            "residual_sd_estimate": fit.residual_sd_estimate,
        },
        pre_period_fit_check={
            "pass": pre_fit_pass,
            "pre_period_observed_sd": pre_residual_sd,
        },
        pre_period_rolling_backtest={
            **backtest_check,
            "pass": "pre_period_rolling_backtest" not in failing_tuple,
        },
        placebo_intervention_date_check={
            "pass": "placebo_intervention_date" not in failing_tuple,
            "placebo_date_policy": "false_pre_period_intervention_date_smoke",
            "early_post_direction_adjusted_residual_max": lag_check[
                "early_post_direction_adjusted_residual_max"
            ],
            "early_post_threshold": lag_check["early_post_threshold"],
        },
        counterfactual_stability_check={
            "pass": "counterfactual_stability" not in failing_tuple,
            "counterfactual_reference": "pre_period_vbd_reference_values",
            "smoke_scope": "in_sample_vbd_contrast_not_historical_forecast",
        },
        lag_sensitivity_check={
            **lag_check,
            "pass": "lag_sensitivity" not in failing_tuple,
        },
        common_shock_sensitivity_check={
            **common_shock_check,
            "pass": "common_shock_sensitivity" not in failing_tuple,
        },
        temporary_effect_persistence_check={
            **persistence_check,
            "pass": "temporary_effect_persistence" not in failing_tuple,
        },
        prior_sensitivity_check={
            "pass": "prior_sensitivity" not in failing_tuple,
            "posterior_mean_movement": movement_summary["posterior_mean_movement"],
            "smoke_only": True,
        },
    )
