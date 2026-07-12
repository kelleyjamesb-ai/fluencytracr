"""Deterministic Gaussian state-space integration for synthetic validation.

The smoke model remains untouched. This sibling engine prepares one immutable
pre-period-standardized input, analytically integrates Gaussian coefficients,
zero-sum panel effects, and AR(1) states, then deterministically integrates the
three covariance hyperparameters. It emits summaries, never posterior draws.
"""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np
from scipy.linalg import cho_factor, cho_solve, helmert
from scipy.optimize import brentq, minimize
from scipy.special import gammaln, logsumexp, ndtr
from scipy.stats import chi2, norm, qmc

from .design_router import route_evidence_design
from .hashing import sha256_json
from .longitudinal_types import (
    MAX_APPROVED_BUSINESS_CONTROLS,
    MIN_POST_WINDOWS,
    MIN_PRE_WINDOWS,
    LongitudinalSyntheticDataset,
    validate_longitudinal_dataset_structure,
    validate_longitudinal_seed,
)

STATE_SPACE_PRIMARY_ENGINE = "deterministic_gaussian_state_space_integration"
STATE_SPACE_MODEL_KIND = "gaussian_longitudinal_zero_sum_ar1_state_space"
STATE_SPACE_FIXED_EFFECT_PRIOR_SD = 1.0
STATE_SPACE_GROUP_SCALE_PRIOR_SD = 1.0
STATE_SPACE_INNOVATION_SCALE_PRIOR_SD = 1.0
STATE_SPACE_RHO_ABS_BOUND = 0.95
STATE_SPACE_CUBATURE_LOG2_POINTS = 13
STATE_SPACE_CUBATURE_POINT_COUNT = 2**STATE_SPACE_CUBATURE_LOG2_POINTS
STATE_SPACE_CUBATURE_T_DF = 5.0
STATE_SPACE_CUBATURE_PROPOSAL_SCALE = 1.5
STATE_SPACE_MODE_LOG_SCALE_MIN = -10.0
STATE_SPACE_MODE_LOG_SCALE_MAX = 3.0
STATE_SPACE_MODE_TRANSFORMED_RHO_ABS_MAX = 7.0
STATE_SPACE_CUBATURE_MIN_EFFECTIVE_SAMPLE_SIZE = 256.0
STATE_SPACE_CUBATURE_MAX_NORMALIZED_WEIGHT = 0.05
STATE_SPACE_INTERVAL_LOWER_QUANTILE = 0.1
STATE_SPACE_INTERVAL_UPPER_QUANTILE = 0.9


class StateSpaceInputError(ValueError):
    """Malformed or unapproved input that cannot enter validation."""


class StateSpaceIntegrationError(RuntimeError):
    """Primary integration failed and the slot must HOLD."""


@dataclass(frozen=True)
class StandardizationStat:
    mean: float
    sd: float

    def to_dict(self) -> dict:
        return {"mean": float(self.mean), "sd": float(self.sd)}


@dataclass(frozen=True)
class PosteriorQuantitySummary:
    quantity_name: str
    posterior_mean: float
    posterior_sd: float
    interval_80_lower: float
    interval_80_upper: float

    def to_dict(self) -> dict:
        return {
            "quantity_name": self.quantity_name,
            "posterior_mean": float(self.posterior_mean),
            "posterior_sd": float(self.posterior_sd),
            "credible_interval_80": {
                "lower": float(self.interval_80_lower),
                "upper": float(self.interval_80_upper),
            },
        }


@dataclass(frozen=True)
class PreparedLongitudinalStateSpace:
    dataset: LongitudinalSyntheticDataset
    y: np.ndarray
    known_se: np.ndarray
    x: np.ndarray
    fixed_effect_names: tuple[str, ...]
    group_index: np.ndarray
    group_labels: tuple[int, ...]
    group_rows: tuple[np.ndarray, ...]
    zero_sum_basis: np.ndarray
    augmented_design: np.ndarray
    movement_contrast: np.ndarray
    standardization: dict[str, StandardizationStat]
    model_input_hash: str
    context_binding_hash: str
    prepared_input_hash: str

    @property
    def panel_group_count(self) -> int:
        return len(self.group_labels)


@dataclass(frozen=True)
class DeterministicStateSpaceFit:
    prepared: PreparedLongitudinalStateSpace
    summaries: tuple[PosteriorQuantitySummary, ...]
    integration_diagnostics: dict
    engine_kind: str = STATE_SPACE_PRIMARY_ENGINE

    def summary_by_name(self) -> dict[str, PosteriorQuantitySummary]:
        return {summary.quantity_name: summary for summary in self.summaries}

    def fit_summary_hash(self) -> str:
        return sha256_json(
            {
                "prepared_input_hash": self.prepared.prepared_input_hash,
                "model_input_hash": self.prepared.model_input_hash,
                "engine_kind": self.engine_kind,
                "summaries": [summary.to_dict() for summary in self.summaries],
                "integration_diagnostics": self.integration_diagnostics,
            }
        )


def _finite_stat(name: str, values: np.ndarray, pre_mask: np.ndarray) -> StandardizationStat:
    pre_values = np.asarray(values, dtype=float)[pre_mask]
    if pre_values.size < 2 or not np.all(np.isfinite(pre_values)):
        raise StateSpaceInputError(f"{name} requires finite pre-period values")
    mean = float(pre_values.mean())
    sd = float(pre_values.std(ddof=1))
    if not math.isfinite(sd) or sd <= 1e-9:
        raise StateSpaceInputError(f"{name} requires positive pre-period variation")
    return StandardizationStat(mean=mean, sd=sd)


def _apply_stat(values: np.ndarray, stat: StandardizationStat) -> np.ndarray:
    standardized = (np.asarray(values, dtype=float) - stat.mean) / stat.sd
    if not np.all(np.isfinite(standardized)):
        raise StateSpaceInputError("standardization produced non-finite values")
    return standardized


def _validate_state_space_input(dataset: LongitudinalSyntheticDataset) -> None:
    validate_longitudinal_dataset_structure(dataset)
    if dataset.hypothesis_plan.primary_metric_family != "continuous_normal_identity":
        raise StateSpaceInputError("state-space validation supports normal identity only")
    if dataset.hypothesis_plan.target_value_used_as_prior:
        raise StateSpaceInputError("target contamination is prohibited")
    if dataset.pre_window_count < MIN_PRE_WINDOWS or dataset.post_window_count < MIN_POST_WINDOWS:
        raise StateSpaceInputError("state-space validation requires sufficient history")
    if (
        dataset.missing_window_refs
        or dataset.suppressed_window_refs
        or dataset.stale_window_refs
        or dataset.imputed_window_refs
    ):
        raise StateSpaceInputError("required windows must be complete and observed")
    if len(dataset.control_names) > MAX_APPROVED_BUSINESS_CONTROLS:
        raise StateSpaceInputError("too many approved controls")
    if any(
        snapshot.measurement_uncertainty_state == "missing_uncertainty_visible"
        for snapshot in dataset.ai_fluency_snapshots
    ):
        raise StateSpaceInputError("aggregate AI Fluency uncertainty is required")
    route = route_evidence_design(
        dataset.hypothesis_plan.evidence_design,
        synthetic_only=True,
        historical_requirements_met=True,
    )
    if not route.routes_to_longitudinal_slice:
        raise StateSpaceInputError("evidence design does not route to longitudinal validation")


def prepare_longitudinal_state_space(
    dataset: LongitudinalSyntheticDataset,
) -> PreparedLongitudinalStateSpace:
    """Build the canonical immutable input consumed by both engines."""

    _validate_state_space_input(dataset)
    pre_mask = np.asarray(dataset.post, dtype=int) == 0
    stats: dict[str, StandardizationStat] = {
        "outcome": _finite_stat("outcome", dataset.observed_outcome, pre_mask),
        "time": _finite_stat("time", dataset.time_index, pre_mask),
        "velocity": _finite_stat("velocity", dataset.velocity_exposure, pre_mask),
        "breadth": _finite_stat("breadth", dataset.breadth_exposure, pre_mask),
        "baseline_fluency_context": _finite_stat(
            "baseline_fluency_context", dataset.baseline_fluency_context, pre_mask
        ),
        "depth_context": _finite_stat("depth_context", dataset.depth_exposure, pre_mask),
    }
    for index, control_name in enumerate(dataset.control_names):
        stats[f"control_{control_name}"] = _finite_stat(
            f"control_{control_name}", dataset.control_matrix[:, index], pre_mask
        )

    y = _apply_stat(dataset.observed_outcome, stats["outcome"])
    known_se = np.asarray(dataset.known_aggregate_se, dtype=float) / stats["outcome"].sd
    if not np.all(np.isfinite(known_se)) or np.any(known_se <= 0.0):
        raise StateSpaceInputError("known aggregate SE must remain finite and positive")

    columns = [
        np.ones_like(y),
        _apply_stat(dataset.time_index, stats["time"]),
        _apply_stat(dataset.velocity_exposure, stats["velocity"]),
        _apply_stat(dataset.breadth_exposure, stats["breadth"]),
        _apply_stat(dataset.baseline_fluency_context, stats["baseline_fluency_context"]),
    ]
    names = [
        "intercept",
        "historical_time_trend",
        "beta_velocity",
        "beta_breadth",
        "beta_fluency_context",
    ]
    for index, control_name in enumerate(dataset.control_names):
        name = f"control_{control_name}"
        columns.append(_apply_stat(dataset.control_matrix[:, index], stats[name]))
        names.append(name)
    x = np.column_stack(columns)
    if not np.all(np.isfinite(x)):
        raise StateSpaceInputError("prepared design matrix must be finite")

    labels = tuple(sorted(set(int(value) for value in dataset.cohort_idx)))
    if len(labels) < 2:
        raise StateSpaceInputError("at least two panel groups are required")
    label_to_index = {label: index for index, label in enumerate(labels)}
    group_index = np.asarray([label_to_index[int(value)] for value in dataset.cohort_idx])
    group_rows = tuple(
        np.asarray(
            sorted(
                np.flatnonzero(group_index == group).tolist(),
                key=lambda row: int(dataset.time_index[row]),
            ),
            dtype=int,
        )
        for group in range(len(labels))
    )
    expected_times: tuple[int, ...] | None = None
    for rows in group_rows:
        times = tuple(int(value) for value in dataset.time_index[rows])
        if expected_times is None:
            expected_times = times
            if times != tuple(range(len(times))):
                raise StateSpaceInputError("state-space windows must be contiguous from zero")
        elif times != expected_times:
            raise StateSpaceInputError("panel groups must share ordered windows")

    zero_sum_basis = np.asarray(helmert(len(labels), full=False).T, dtype=float)
    augmented_design = np.column_stack([x, zero_sum_basis[group_index]])
    evaluation_mask = np.isin(dataset.window_refs, dataset.evaluation_window_refs)
    if not np.any(evaluation_mask):
        raise StateSpaceInputError("movement estimand requires evaluation windows")
    movement_contrast = np.zeros(x.shape[1], dtype=float)
    direction = 1.0 if dataset.hypothesis_plan.expected_metric_direction == "increase" else -1.0
    for name in ("beta_velocity", "beta_breadth"):
        index = names.index(name)
        movement_contrast[index] = direction * float(x[evaluation_mask, index].mean())

    model_body = {
        "model_kind": STATE_SPACE_MODEL_KIND,
        "fixed_effect_names": names,
        "standardization": {
            name: stat.to_dict()
            for name, stat in sorted(stats.items())
            if name != "depth_context"
        },
        "y": [float(value) for value in y],
        "known_se": [float(value) for value in known_se],
        "x": [[float(value) for value in row] for row in x.tolist()],
        "group_index": [int(value) for value in group_index],
        "zero_sum_basis": [
            [float(value) for value in row] for row in zero_sum_basis.tolist()
        ],
        "movement_contrast": [float(value) for value in movement_contrast],
        "priors": {
            "fixed_effect_normal_sd": STATE_SPACE_FIXED_EFFECT_PRIOR_SD,
            "group_scale_halfnormal_sd": STATE_SPACE_GROUP_SCALE_PRIOR_SD,
            "innovation_scale_halfnormal_sd": STATE_SPACE_INNOVATION_SCALE_PRIOR_SD,
            "rho_abs_bound": STATE_SPACE_RHO_ABS_BOUND,
        },
        "minimum_worthwhile_change_used_in_inference": False,
        "depth_used_in_likelihood": False,
    }
    context_body = {
        "synthetic_input_hash": dataset.synthetic_input_hash(),
        "depth_context": {
            "standardization": stats["depth_context"].to_dict(),
            "values_hash": sha256_json(
                [
                    float(value)
                    for value in _apply_stat(dataset.depth_exposure, stats["depth_context"])
                ]
            ),
            "used_in_likelihood": False,
        },
        "minimum_worthwhile_change": float(
            dataset.hypothesis_plan.minimum_worthwhile_change
        ),
        "minimum_worthwhile_change_used_in_inference": False,
    }
    model_input_hash = sha256_json(model_body)
    context_binding_hash = sha256_json(context_body)
    prepared_input_hash = sha256_json(
        {
            "model_input_hash": model_input_hash,
            "context_binding_hash": context_binding_hash,
        }
    )
    return PreparedLongitudinalStateSpace(
        dataset=dataset,
        y=y,
        known_se=known_se,
        x=x,
        fixed_effect_names=tuple(names),
        group_index=group_index,
        group_labels=labels,
        group_rows=group_rows,
        zero_sum_basis=zero_sum_basis,
        augmented_design=augmented_design,
        movement_contrast=movement_contrast,
        standardization=stats,
        model_input_hash=model_input_hash,
        context_binding_hash=context_binding_hash,
        prepared_input_hash=prepared_input_hash,
    )


def _stationary_ar1_covariance(length: int, rho: float, innovation_scale: float) -> np.ndarray:
    lags = np.abs(np.subtract.outer(np.arange(length), np.arange(length)))
    return innovation_scale**2 / (1.0 - rho**2) * np.power(rho, lags)


def _conditional_gaussian(
    prepared: PreparedLongitudinalStateSpace,
    group_scale: float,
    innovation_scale: float,
    rho: float,
) -> tuple[float, np.ndarray, np.ndarray]:
    if group_scale <= 0.0 or innovation_scale <= 0.0 or abs(rho) >= STATE_SPACE_RHO_ABS_BOUND:
        raise StateSpaceIntegrationError("hyperparameters outside support")
    h = prepared.augmented_design
    dimension = h.shape[1]
    h_binv_h = np.zeros((dimension, dimension), dtype=float)
    h_binv_y = np.zeros(dimension, dtype=float)
    y_binv_y = 0.0
    logdet_b = 0.0
    for rows in prepared.group_rows:
        h_group = h[rows]
        y_group = prepared.y[rows]
        covariance = _stationary_ar1_covariance(
            len(rows), rho, innovation_scale
        ) + np.diag(prepared.known_se[rows] ** 2)
        factor = cho_factor(covariance, lower=True, check_finite=False)
        binv_h = cho_solve(factor, h_group, check_finite=False)
        binv_y = cho_solve(factor, y_group, check_finite=False)
        h_binv_h += h_group.T @ binv_h
        h_binv_y += h_group.T @ binv_y
        y_binv_y += float(y_group @ binv_y)
        logdet_b += 2.0 * float(np.log(np.diag(factor[0])).sum())

    fixed_count = prepared.x.shape[1]
    prior_variance = np.concatenate(
        [
            np.full(fixed_count, STATE_SPACE_FIXED_EFFECT_PRIOR_SD**2),
            np.full(prepared.panel_group_count - 1, group_scale**2),
        ]
    )
    precision = h_binv_h + np.diag(1.0 / prior_variance)
    factor = cho_factor(precision, lower=True, check_finite=False)
    covariance = cho_solve(factor, np.eye(dimension), check_finite=False)
    mean = cho_solve(factor, h_binv_y, check_finite=False)
    logdet_precision = 2.0 * float(np.log(np.diag(factor[0])).sum())
    quadratic = y_binv_y - float(h_binv_y @ mean)
    log_marginal = -0.5 * (
        len(prepared.y) * math.log(2.0 * math.pi)
        + logdet_b
        + float(np.log(prior_variance).sum())
        + logdet_precision
        + quadratic
    )
    return log_marginal, mean[:fixed_count], covariance[:fixed_count, :fixed_count]


def _log_halfnormal(value: float, scale: float) -> float:
    return 0.5 * math.log(2.0 / math.pi) - math.log(scale) - 0.5 * (value / scale) ** 2


def _evaluate_target(
    prepared: PreparedLongitudinalStateSpace,
    z: np.ndarray,
) -> tuple[float, np.ndarray | None, np.ndarray | None, tuple[float, float, float] | None]:
    if not np.all(np.isfinite(z)):
        return -math.inf, None, None, None
    try:
        group_scale = float(math.exp(float(z[0])))
        innovation_scale = float(math.exp(float(z[1])))
    except OverflowError:
        return -math.inf, None, None, None
    tanh_value = math.tanh(float(z[2]))
    if abs(tanh_value) == 1.0:
        tanh_value = math.copysign(math.nextafter(1.0, 0.0), tanh_value)
    rho = float(STATE_SPACE_RHO_ABS_BOUND * tanh_value)
    try:
        log_marginal, mean, covariance = _conditional_gaussian(
            prepared, group_scale, innovation_scale, rho
        )
    except (StateSpaceIntegrationError, np.linalg.LinAlgError, ValueError):
        return -math.inf, None, None, None
    log_prior_jacobian = (
        _log_halfnormal(group_scale, STATE_SPACE_GROUP_SCALE_PRIOR_SD)
        + float(z[0])
        + _log_halfnormal(innovation_scale, STATE_SPACE_INNOVATION_SCALE_PRIOR_SD)
        + float(z[1])
        - math.log(2.0 * STATE_SPACE_RHO_ABS_BOUND)
        + math.log(STATE_SPACE_RHO_ABS_BOUND)
        + 2.0
        * (
            math.log(2.0)
            - abs(float(z[2]))
            - math.log1p(math.exp(-2.0 * abs(float(z[2]))))
        )
    )
    return log_marginal + log_prior_jacobian, mean, covariance, (
        group_scale,
        innovation_scale,
        rho,
    )


def _finite_difference_hessian(function, point: np.ndarray) -> np.ndarray:
    dimension = len(point)
    steps = 2e-3 * np.maximum(1.0, np.abs(point))
    result = np.zeros((dimension, dimension), dtype=float)
    center = float(function(point))
    for i in range(dimension):
        step_i = np.zeros(dimension)
        step_i[i] = steps[i]
        result[i, i] = (
            float(function(point + step_i)) - 2.0 * center + float(function(point - step_i))
        ) / steps[i] ** 2
        for j in range(i + 1, dimension):
            step_j = np.zeros(dimension)
            step_j[j] = steps[j]
            cross = (
                float(function(point + step_i + step_j))
                - float(function(point + step_i - step_j))
                - float(function(point - step_i + step_j))
                + float(function(point - step_i - step_j))
            ) / (4.0 * steps[i] * steps[j])
            result[i, j] = result[j, i] = cross
    return result


def _weighted_quantile(values: np.ndarray, weights: np.ndarray, probability: float) -> float:
    order = np.argsort(values)
    ordered_values = values[order]
    ordered_weights = weights[order]
    centers = np.cumsum(ordered_weights) - 0.5 * ordered_weights
    return float(
        np.interp(
            probability,
            np.concatenate([[0.0], centers, [1.0]]),
            np.concatenate([[ordered_values[0]], ordered_values, [ordered_values[-1]]]),
        )
    )


def _normal_mixture_quantile(
    means: np.ndarray,
    variances: np.ndarray,
    weights: np.ndarray,
    probability: float,
) -> float:
    sds = np.sqrt(np.maximum(variances, 1e-15))
    lower = float(np.min(means - 12.0 * sds))
    upper = float(np.max(means + 12.0 * sds))

    def objective(value: float) -> float:
        return float(np.sum(weights * ndtr((value - means) / sds))) - probability

    return float(brentq(objective, lower, upper, maxiter=200))


def _mixture_summary(
    name: str,
    means: np.ndarray,
    variances: np.ndarray,
    weights: np.ndarray,
) -> PosteriorQuantitySummary:
    mean = float(np.sum(weights * means))
    variance = max(float(np.sum(weights * (variances + means**2))) - mean**2, 0.0)
    return PosteriorQuantitySummary(
        name,
        mean,
        math.sqrt(variance),
        _normal_mixture_quantile(means, variances, weights, STATE_SPACE_INTERVAL_LOWER_QUANTILE),
        _normal_mixture_quantile(means, variances, weights, STATE_SPACE_INTERVAL_UPPER_QUANTILE),
    )


def _discrete_summary(name: str, values: np.ndarray, weights: np.ndarray) -> PosteriorQuantitySummary:
    mean = float(np.sum(weights * values))
    variance = max(float(np.sum(weights * values**2)) - mean**2, 0.0)
    return PosteriorQuantitySummary(
        name,
        mean,
        math.sqrt(variance),
        _weighted_quantile(values, weights, STATE_SPACE_INTERVAL_LOWER_QUANTILE),
        _weighted_quantile(values, weights, STATE_SPACE_INTERVAL_UPPER_QUANTILE),
    )


def fit_deterministic_state_space(
    prepared: PreparedLongitudinalStateSpace,
    *,
    seed: int | None = None,
) -> DeterministicStateSpaceFit:
    """Fit the deterministic primary engine from the shared prepared input."""

    if not isinstance(prepared, PreparedLongitudinalStateSpace):
        raise TypeError("primary engine requires PreparedLongitudinalStateSpace")
    if seed is not None:
        validate_longitudinal_seed(seed, name="state-space slot seed")

    def negative_log_target(z: np.ndarray) -> float:
        value = _evaluate_target(prepared, z)[0]
        return 1e100 if not math.isfinite(value) else -value

    starts = (
        np.asarray([-1.2, -1.2, 0.0]),
        np.asarray([-2.0, -1.0, 0.5]),
        np.asarray([-1.0, -2.0, -0.5]),
    )
    results = [
        minimize(
            negative_log_target,
            start,
            method="L-BFGS-B",
            bounds=(
                (STATE_SPACE_MODE_LOG_SCALE_MIN, STATE_SPACE_MODE_LOG_SCALE_MAX),
                (STATE_SPACE_MODE_LOG_SCALE_MIN, STATE_SPACE_MODE_LOG_SCALE_MAX),
                (
                    -STATE_SPACE_MODE_TRANSFORMED_RHO_ABS_MAX,
                    STATE_SPACE_MODE_TRANSFORMED_RHO_ABS_MAX,
                ),
            ),
        )
        for start in starts
    ]
    successful = [result for result in results if result.success and math.isfinite(result.fun)]
    if not successful:
        raise StateSpaceIntegrationError("state-space mode search failed")
    optimum = min(successful, key=lambda result: float(result.fun))
    mode = np.asarray(optimum.x, dtype=float)
    hessian = _finite_difference_hessian(negative_log_target, mode)
    hessian = 0.5 * (hessian + hessian.T)
    eigenvalues, eigenvectors = np.linalg.eigh(hessian)
    clipped = np.maximum(eigenvalues, 1e-4)
    laplace_covariance = eigenvectors @ np.diag(1.0 / clipped) @ eigenvectors.T
    proposal_scale = STATE_SPACE_CUBATURE_PROPOSAL_SCALE * laplace_covariance
    proposal_scale = 0.5 * (proposal_scale + proposal_scale.T)
    proposal_cholesky = np.linalg.cholesky(proposal_scale)
    sign, logdet = np.linalg.slogdet(proposal_scale)
    if sign <= 0:
        raise StateSpaceIntegrationError("cubature proposal is singular")

    unit = qmc.Sobol(d=4, scramble=False).random_base2(
        m=STATE_SPACE_CUBATURE_LOG2_POINTS
    )
    epsilon = 0.5 / STATE_SPACE_CUBATURE_POINT_COUNT
    unit = np.clip(unit, epsilon, 1.0 - epsilon)
    normal_points = norm.ppf(unit[:, :3])
    chi_points = chi2.ppf(unit[:, 3], df=STATE_SPACE_CUBATURE_T_DF)
    standardized_t = normal_points / np.sqrt(
        chi_points[:, None] / STATE_SPACE_CUBATURE_T_DF
    )
    nodes = mode + standardized_t @ proposal_cholesky.T
    dimension = 3
    proposal_constant = (
        gammaln((STATE_SPACE_CUBATURE_T_DF + dimension) / 2.0)
        - gammaln(STATE_SPACE_CUBATURE_T_DF / 2.0)
        - 0.5 * (dimension * math.log(STATE_SPACE_CUBATURE_T_DF * math.pi) + logdet)
    )
    proposal_inverse = np.linalg.inv(proposal_scale)
    log_weights = []
    beta_means = []
    beta_covariances = []
    hyperparameters = []
    for node in nodes:
        target, beta_mean, beta_covariance, values = _evaluate_target(prepared, node)
        if not math.isfinite(target) or beta_mean is None or beta_covariance is None or values is None:
            continue
        delta = node - mode
        mahalanobis = float(delta @ proposal_inverse @ delta)
        proposal_log_density = proposal_constant - 0.5 * (
            STATE_SPACE_CUBATURE_T_DF + dimension
        ) * math.log1p(mahalanobis / STATE_SPACE_CUBATURE_T_DF)
        log_weights.append(target - proposal_log_density)
        beta_means.append(beta_mean)
        beta_covariances.append(beta_covariance)
        hyperparameters.append(values)
    if len(log_weights) < STATE_SPACE_CUBATURE_POINT_COUNT // 2:
        raise StateSpaceIntegrationError("too few finite cubature nodes")
    log_weights_array = np.asarray(log_weights)
    weights = np.exp(log_weights_array - logsumexp(log_weights_array))
    effective_sample_size = float(1.0 / np.sum(weights**2))
    max_weight = float(weights.max())
    if (
        effective_sample_size < STATE_SPACE_CUBATURE_MIN_EFFECTIVE_SAMPLE_SIZE
        or max_weight > STATE_SPACE_CUBATURE_MAX_NORMALIZED_WEIGHT
    ):
        raise StateSpaceIntegrationError("cubature failed compiled stability gates")

    beta_mean_array = np.asarray(beta_means)
    beta_covariance_array = np.asarray(beta_covariances)
    summaries = [
        _mixture_summary(
            name,
            beta_mean_array[:, index],
            beta_covariance_array[:, index, index],
            weights,
        )
        for index, name in enumerate(prepared.fixed_effect_names)
    ]
    movement_means = beta_mean_array @ prepared.movement_contrast
    movement_variances = np.einsum(
        "i,nij,j->n",
        prepared.movement_contrast,
        beta_covariance_array,
        prepared.movement_contrast,
    )
    summaries.append(
        _mixture_summary(
            "longitudinal_movement",
            movement_means,
            movement_variances,
            weights,
        )
    )
    hyper = np.asarray(hyperparameters)
    summaries.extend(
        [
            _discrete_summary("panel_group_scale", hyper[:, 0], weights),
            _discrete_summary("ar1_innovation_scale", hyper[:, 1], weights),
            _discrete_summary("rho", hyper[:, 2], weights),
        ]
    )
    for summary in summaries:
        values = (
            summary.posterior_mean,
            summary.posterior_sd,
            summary.interval_80_lower,
            summary.interval_80_upper,
        )
        if not all(math.isfinite(value) for value in values) or summary.posterior_sd <= 0.0:
            raise StateSpaceIntegrationError("invalid deterministic posterior summary")

    diagnostics = {
        "status": "PASS",
        "point_count": STATE_SPACE_CUBATURE_POINT_COUNT,
        "finite_point_count": len(log_weights),
        "effective_sample_size": effective_sample_size,
        "compiled_min_effective_sample_size": STATE_SPACE_CUBATURE_MIN_EFFECTIVE_SAMPLE_SIZE,
        "max_normalized_weight": max_weight,
        "compiled_max_normalized_weight": STATE_SPACE_CUBATURE_MAX_NORMALIZED_WEIGHT,
        "mode_transformed": [float(value) for value in mode],
        "negative_log_posterior_at_mode": float(optimum.fun),
        "hessian_condition_number": float(clipped.max() / clipped.min()),
        "random_numbers_used": False,
        "seed_used_for_computation": False,
    }
    return DeterministicStateSpaceFit(
        prepared=prepared,
        summaries=tuple(summaries),
        integration_diagnostics=diagnostics,
    )
