"""Deterministic Gaussian state-space integration for VBD trajectories."""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np
from scipy.linalg import cho_factor, cho_solve
from scipy.optimize import minimize
from scipy.special import gammaln, logsumexp
from scipy.stats import chi2, norm, qmc

from .hashing import sha256_json
from .vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
    VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD,
    VBD_TRAJECTORY_GROUP_SCALE_PRIOR_SD,
    VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD,
    VBD_TRAJECTORY_RHO_ABS_BOUND,
    validate_prepared_vbd_trajectory,
)
from .vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
    TrajectoryStatisticsError,
    summarize_conditional_normal_mixture_v2,
)
from .vbd_trajectory_types import (
    TrajectoryObservationPanel,
    VBD_TRAJECTORY_LANES,
)


VBD_TRAJECTORY_PRIMARY_ENGINE = "deterministic_gaussian_state_space_integration"
VBD_TRAJECTORY_OUTER_LOG2_POINTS = 13
VBD_TRAJECTORY_OUTER_POINT_COUNT = 2**VBD_TRAJECTORY_OUTER_LOG2_POINTS
VBD_TRAJECTORY_OUTER_T_DF = 5.0
VBD_TRAJECTORY_OUTER_PROPOSAL_SCALE = 1.5
VBD_TRAJECTORY_MODE_LOG_SCALE_MIN = -10.0
VBD_TRAJECTORY_MODE_LOG_SCALE_MAX = 3.0
VBD_TRAJECTORY_MODE_TRANSFORMED_RHO_ABS_MAX = 7.0
VBD_TRAJECTORY_MIN_FINITE_POINT_COUNT = VBD_TRAJECTORY_OUTER_POINT_COUNT // 2
VBD_TRAJECTORY_MIN_EFFECTIVE_SAMPLE_SIZE = 256.0
VBD_TRAJECTORY_MAX_NORMALIZED_WEIGHT = 0.05


class TrajectoryIntegrationError(RuntimeError):
    """The deterministic engine failed a compiled numerical requirement."""


@dataclass(frozen=True)
class TrajectoryIntegrationDiagnostics:
    point_count: int
    finite_point_count: int
    effective_sample_size: float
    max_normalized_weight: float
    mode_transformed: tuple[float, float, float]
    negative_log_posterior_at_mode: float
    hessian_condition_number: float
    minimum_conditional_movement_variance: float
    maximum_conditional_movement_variance: float
    movement_component_count: int

    def __post_init__(self) -> None:
        if type(self.point_count) is not int or self.point_count != (
            VBD_TRAJECTORY_OUTER_POINT_COUNT
        ):
            raise TrajectoryIntegrationError("integration point count drifted")
        if (
            type(self.finite_point_count) is not int
            or not VBD_TRAJECTORY_MIN_FINITE_POINT_COUNT
            <= self.finite_point_count
            <= self.point_count
        ):
            raise TrajectoryIntegrationError("finite integration count failed")
        if (
            type(self.effective_sample_size) not in (int, float)
            or not math.isfinite(float(self.effective_sample_size))
            or not VBD_TRAJECTORY_MIN_EFFECTIVE_SAMPLE_SIZE
            <= self.effective_sample_size
            <= self.finite_point_count + 1e-9
        ):
            raise TrajectoryIntegrationError("integration ESS failed")
        if (
            type(self.max_normalized_weight) not in (int, float)
            or not math.isfinite(float(self.max_normalized_weight))
            or self.max_normalized_weight <= 0.0
            or self.max_normalized_weight
            > VBD_TRAJECTORY_MAX_NORMALIZED_WEIGHT
        ):
            raise TrajectoryIntegrationError("integration maximum weight failed")
        if (
            type(self.mode_transformed) is not tuple
            or len(self.mode_transformed) != 3
            or any(
                type(value) not in (int, float) or not math.isfinite(float(value))
                for value in self.mode_transformed
            )
        ):
            raise TrajectoryIntegrationError("integration mode is invalid")
        for name, value in (
            ("negative log posterior", self.negative_log_posterior_at_mode),
            ("Hessian condition number", self.hessian_condition_number),
            (
                "minimum conditional movement variance",
                self.minimum_conditional_movement_variance,
            ),
            (
                "maximum conditional movement variance",
                self.maximum_conditional_movement_variance,
            ),
        ):
            if type(value) not in (int, float) or not math.isfinite(float(value)):
                raise TrajectoryIntegrationError(f"{name} is invalid")
        if self.hessian_condition_number < 1.0:
            raise TrajectoryIntegrationError("Hessian condition number is invalid")
        if (
            self.minimum_conditional_movement_variance <= 0.0
            or self.maximum_conditional_movement_variance
            < self.minimum_conditional_movement_variance
        ):
            raise TrajectoryIntegrationError("conditional movement variance failed")
        if (
            type(self.movement_component_count) is not int
            or self.movement_component_count != self.finite_point_count
        ):
            raise TrajectoryIntegrationError("movement component count drifted")

    def to_dict(self) -> dict:
        return {
            "status": "PASS",
            "point_count": self.point_count,
            "finite_point_count": self.finite_point_count,
            "compiled_min_finite_point_count": VBD_TRAJECTORY_MIN_FINITE_POINT_COUNT,
            "effective_sample_size": float(self.effective_sample_size),
            "compiled_min_effective_sample_size": (
                VBD_TRAJECTORY_MIN_EFFECTIVE_SAMPLE_SIZE
            ),
            "max_normalized_weight": float(self.max_normalized_weight),
            "compiled_max_normalized_weight": VBD_TRAJECTORY_MAX_NORMALIZED_WEIGHT,
            "mode_transformed": [float(value) for value in self.mode_transformed],
            "negative_log_posterior_at_mode": float(
                self.negative_log_posterior_at_mode
            ),
            "hessian_condition_number": float(self.hessian_condition_number),
            "minimum_conditional_movement_variance": float(
                self.minimum_conditional_movement_variance
            ),
            "maximum_conditional_movement_variance": float(
                self.maximum_conditional_movement_variance
            ),
            "outer_integration": {
                "sequence": "unscrambled_sobol_v1",
                "proposal": "student_t_df_5_v1",
                "original_sobol_ordinal_retained": True,
            },
            "conditional_movement_mixture": {
                "algorithm": "conditional_normal_mixture_quantile_v2",
                "component_count": self.movement_component_count,
                "bisection_iterations": 64,
                "normal_cdf": "scipy.special.ndtr",
                "normal_quantile": "scipy.special.ndtri",
            },
            "random_numbers_used": False,
            "latent_paths_emitted": False,
            "posterior_support_emitted": False,
        }


@dataclass(frozen=True)
class TrajectoryDeterministicFit:
    lane: str
    prepared_input_hash: str
    model_input_hash: str
    movement_summary: TrajectoryPosteriorSummary
    integration_diagnostics: TrajectoryIntegrationDiagnostics
    engine_kind: str = VBD_TRAJECTORY_PRIMARY_ENGINE

    def __post_init__(self) -> None:
        if self.lane not in VBD_TRAJECTORY_LANES:
            raise TrajectoryIntegrationError("deterministic fit lane is invalid")
        for value in (self.prepared_input_hash, self.model_input_hash):
            if (
                type(value) is not str
                or len(value) != 64
                or any(character not in "0123456789abcdef" for character in value)
            ):
                raise TrajectoryIntegrationError("deterministic fit hash is invalid")
        if (
            type(self.movement_summary) is not TrajectoryPosteriorSummary
            or self.movement_summary.quantity_name != "trajectory_movement"
            or type(self.integration_diagnostics)
            is not TrajectoryIntegrationDiagnostics
            or self.engine_kind != VBD_TRAJECTORY_PRIMARY_ENGINE
        ):
            raise TrajectoryIntegrationError("deterministic fit structure is invalid")

    def fit_summary_hash(self) -> str:
        return sha256_json(self._hash_body())

    def _hash_body(self) -> dict:
        return {
            "lane": self.lane,
            "prepared_input_hash": self.prepared_input_hash,
            "model_input_hash": self.model_input_hash,
            "engine_kind": self.engine_kind,
            "movement_summary": self.movement_summary.to_dict(),
            "integration_diagnostics": self.integration_diagnostics.to_dict(),
            "latent_paths_emitted": False,
            "posterior_support_emitted": False,
        }

    def to_dict(self) -> dict:
        return {**self._hash_body(), "fit_summary_hash": self.fit_summary_hash()}


@dataclass(frozen=True)
class _ConditionalGaussianResult:
    log_marginal: float
    theta_mean: np.ndarray
    theta_covariance: np.ndarray
    movement_mean: float
    movement_variance: float


def _stationary_ar1_covariance(
    length: int, rho: float, innovation_scale: float
) -> np.ndarray:
    lags = np.abs(np.subtract.outer(np.arange(length), np.arange(length)))
    return innovation_scale**2 / (1.0 - rho**2) * np.power(rho, lags)


def _conditional_gaussian(
    prepared: TrajectoryPreparedInput,
    group_scale: float,
    innovation_scale: float,
    rho: float,
) -> _ConditionalGaussianResult:
    if (
        not math.isfinite(group_scale)
        or not math.isfinite(innovation_scale)
        or not math.isfinite(rho)
        or group_scale <= 0.0
        or innovation_scale <= 0.0
        or abs(rho) >= VBD_TRAJECTORY_RHO_ABS_BOUND
    ):
        raise TrajectoryIntegrationError("hyperparameters are outside support")
    design = prepared.augmented_design
    dimension = design.shape[1]
    design_precision = np.zeros((dimension, dimension), dtype=np.float64)
    design_score = np.zeros(dimension, dtype=np.float64)
    data_quadratic = 0.0
    logdet_observation = 0.0
    movement_design = np.zeros(dimension, dtype=np.float64)
    movement_base = 0.0
    movement_state_variance = 0.0
    for rows in prepared.group_rows:
        group_design = design[rows]
        group_y = prepared.y[rows]
        contrast = prepared.latent_level_contrast[rows]
        state_covariance = _stationary_ar1_covariance(
            len(rows), rho, innovation_scale
        )
        observation_covariance = state_covariance + np.diag(
            prepared.known_se[rows] ** 2
        )
        factor = cho_factor(
            observation_covariance, lower=True, check_finite=False
        )
        inverse_design = cho_solve(factor, group_design, check_finite=False)
        inverse_y = cho_solve(factor, group_y, check_finite=False)
        state_contrast = state_covariance @ contrast
        inverse_state_contrast = cho_solve(
            factor, state_contrast, check_finite=False
        )
        design_precision += group_design.T @ inverse_design
        design_score += group_design.T @ inverse_y
        data_quadratic += float(group_y @ inverse_y)
        logdet_observation += 2.0 * float(
            np.log(np.diag(factor[0])).sum()
        )
        movement_design += group_design.T @ (
            contrast - inverse_state_contrast
        )
        movement_base += float(contrast @ state_covariance @ inverse_y)
        movement_state_variance += float(
            contrast
            @ (state_contrast - state_covariance @ inverse_state_contrast)
        )

    fixed_count = len(prepared.fixed_effect_names)
    prior_variance = np.concatenate(
        [
            np.full(
                fixed_count,
                VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD**2,
                dtype=np.float64,
            ),
            np.full(
                prepared.panel_group_count - 1,
                group_scale**2,
                dtype=np.float64,
            ),
        ]
    )
    posterior_precision = design_precision + np.diag(1.0 / prior_variance)
    posterior_factor = cho_factor(
        posterior_precision, lower=True, check_finite=False
    )
    theta_covariance = cho_solve(
        posterior_factor, np.eye(dimension), check_finite=False
    )
    theta_mean = cho_solve(
        posterior_factor, design_score, check_finite=False
    )
    logdet_precision = 2.0 * float(
        np.log(np.diag(posterior_factor[0])).sum()
    )
    quadratic = data_quadratic - float(design_score @ theta_mean)
    log_marginal = -0.5 * (
        len(prepared.y) * math.log(2.0 * math.pi)
        + logdet_observation
        + float(np.log(prior_variance).sum())
        + logdet_precision
        + quadratic
    )
    movement_mean = movement_base + float(movement_design @ theta_mean)
    movement_variance = movement_state_variance + float(
        movement_design @ theta_covariance @ movement_design
    )
    if (
        not math.isfinite(log_marginal)
        or not np.all(np.isfinite(theta_mean))
        or not np.all(np.isfinite(theta_covariance))
        or not math.isfinite(movement_mean)
        or not math.isfinite(movement_variance)
        or movement_variance <= 0.0
    ):
        raise TrajectoryIntegrationError("conditional Gaussian result is invalid")
    return _ConditionalGaussianResult(
        log_marginal=log_marginal,
        theta_mean=theta_mean,
        theta_covariance=theta_covariance,
        movement_mean=movement_mean,
        movement_variance=movement_variance,
    )


def _log_halfnormal(value: float, scale: float) -> float:
    return (
        0.5 * math.log(2.0 / math.pi)
        - math.log(scale)
        - 0.5 * (value / scale) ** 2
    )


def _evaluate_target(
    prepared: TrajectoryPreparedInput, transformed: np.ndarray
) -> tuple[float, _ConditionalGaussianResult | None, tuple[float, float, float] | None]:
    if transformed.shape != (3,) or not np.all(np.isfinite(transformed)):
        return -math.inf, None, None
    try:
        group_scale = float(math.exp(float(transformed[0])))
        innovation_scale = float(math.exp(float(transformed[1])))
    except OverflowError:
        return -math.inf, None, None
    if group_scale <= 0.0 or innovation_scale <= 0.0:
        return -math.inf, None, None
    tanh_value = math.tanh(float(transformed[2]))
    if abs(tanh_value) == 1.0:
        tanh_value = math.copysign(math.nextafter(1.0, 0.0), tanh_value)
    rho = float(VBD_TRAJECTORY_RHO_ABS_BOUND * tanh_value)
    try:
        conditional = _conditional_gaussian(
            prepared, group_scale, innovation_scale, rho
        )
    except (np.linalg.LinAlgError, ValueError) as exc:
        raise TrajectoryIntegrationError(
            "conditional Gaussian factorization failed"
        ) from exc
    rho_log_jacobian = (
        math.log(VBD_TRAJECTORY_RHO_ABS_BOUND)
        + 2.0
        * (
            math.log(2.0)
            - abs(float(transformed[2]))
            - math.log1p(math.exp(-2.0 * abs(float(transformed[2]))))
        )
    )
    log_prior_jacobian = (
        _log_halfnormal(
            group_scale, VBD_TRAJECTORY_GROUP_SCALE_PRIOR_SD
        )
        + float(transformed[0])
        + _log_halfnormal(
            innovation_scale, VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD
        )
        + float(transformed[1])
        - math.log(2.0 * VBD_TRAJECTORY_RHO_ABS_BOUND)
        + rho_log_jacobian
    )
    return (
        conditional.log_marginal + log_prior_jacobian,
        conditional,
        (group_scale, innovation_scale, rho),
    )


def _finite_difference_hessian(function, point: np.ndarray) -> np.ndarray:
    dimension = len(point)
    steps = 2e-3 * np.maximum(1.0, np.abs(point))
    result = np.zeros((dimension, dimension), dtype=np.float64)
    center = float(function(point))
    if not math.isfinite(center):
        raise TrajectoryIntegrationError("mode target is nonfinite")
    for first in range(dimension):
        first_step = np.zeros(dimension)
        first_step[first] = steps[first]
        result[first, first] = (
            float(function(point + first_step))
            - 2.0 * center
            + float(function(point - first_step))
        ) / steps[first] ** 2
        for second in range(first + 1, dimension):
            second_step = np.zeros(dimension)
            second_step[second] = steps[second]
            cross = (
                float(function(point + first_step + second_step))
                - float(function(point + first_step - second_step))
                - float(function(point - first_step + second_step))
                + float(function(point - first_step - second_step))
            ) / (4.0 * steps[first] * steps[second])
            result[first, second] = result[second, first] = cross
    if not np.all(np.isfinite(result)):
        raise TrajectoryIntegrationError("mode Hessian is nonfinite")
    return result


def fit_vbd_trajectory_state_space(
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
) -> TrajectoryDeterministicFit:
    """Fit one lane with the fixed deterministic integration contract."""

    if type(prepared) is not TrajectoryPreparedInput:
        raise TypeError("primary engine requires an exact TrajectoryPreparedInput")
    if type(source_panel) is not TrajectoryObservationPanel:
        raise TypeError("primary engine requires an exact source panel")
    validate_prepared_vbd_trajectory(prepared, source_panel)

    def negative_log_target(transformed: np.ndarray) -> float:
        value = _evaluate_target(prepared, transformed)[0]
        return 1e100 if not math.isfinite(value) else -value

    starts = (
        np.asarray([-1.2, -1.2, 0.0]),
        np.asarray([-2.0, -1.0, 0.5]),
        np.asarray([-1.0, -2.0, -0.5]),
    )
    searches = [
        minimize(
            negative_log_target,
            start,
            method="L-BFGS-B",
            bounds=(
                (VBD_TRAJECTORY_MODE_LOG_SCALE_MIN, VBD_TRAJECTORY_MODE_LOG_SCALE_MAX),
                (VBD_TRAJECTORY_MODE_LOG_SCALE_MIN, VBD_TRAJECTORY_MODE_LOG_SCALE_MAX),
                (
                    -VBD_TRAJECTORY_MODE_TRANSFORMED_RHO_ABS_MAX,
                    VBD_TRAJECTORY_MODE_TRANSFORMED_RHO_ABS_MAX,
                ),
            ),
        )
        for start in starts
    ]
    successful = [
        result
        for result in searches
        if result.success and math.isfinite(float(result.fun))
    ]
    if not successful:
        raise TrajectoryIntegrationError("state-space mode search failed")
    optimum = min(successful, key=lambda result: float(result.fun))
    mode = np.asarray(optimum.x, dtype=np.float64)
    hessian = _finite_difference_hessian(negative_log_target, mode)
    hessian = 0.5 * (hessian + hessian.T)
    eigenvalues, eigenvectors = np.linalg.eigh(hessian)
    if not np.all(np.isfinite(eigenvalues)):
        raise TrajectoryIntegrationError("mode Hessian eigenvalues are nonfinite")
    if float(eigenvalues.min()) <= 0.0:
        raise TrajectoryIntegrationError("mode Hessian is not positive definite")
    laplace_covariance = (
        eigenvectors @ np.diag(1.0 / eigenvalues) @ eigenvectors.T
    )
    proposal_covariance = VBD_TRAJECTORY_OUTER_PROPOSAL_SCALE * laplace_covariance
    proposal_covariance = 0.5 * (
        proposal_covariance + proposal_covariance.T
    )
    try:
        proposal_cholesky = np.linalg.cholesky(proposal_covariance)
    except np.linalg.LinAlgError as exc:
        raise TrajectoryIntegrationError("cubature proposal is singular") from exc
    sign, proposal_logdet = np.linalg.slogdet(proposal_covariance)
    if sign <= 0 or not math.isfinite(float(proposal_logdet)):
        raise TrajectoryIntegrationError("cubature proposal determinant is invalid")

    unit = qmc.Sobol(d=4, scramble=False).random_base2(
        m=VBD_TRAJECTORY_OUTER_LOG2_POINTS
    )
    epsilon = 0.5 / VBD_TRAJECTORY_OUTER_POINT_COUNT
    unit = np.clip(unit, epsilon, 1.0 - epsilon)
    normal_points = norm.ppf(unit[:, :3])
    chi_points = chi2.ppf(unit[:, 3], df=VBD_TRAJECTORY_OUTER_T_DF)
    student_points = normal_points / np.sqrt(
        chi_points[:, None] / VBD_TRAJECTORY_OUTER_T_DF
    )
    nodes = mode + student_points @ proposal_cholesky.T
    proposal_constant = (
        gammaln((VBD_TRAJECTORY_OUTER_T_DF + 3.0) / 2.0)
        - gammaln(VBD_TRAJECTORY_OUTER_T_DF / 2.0)
        - 0.5
        * (
            3.0 * math.log(VBD_TRAJECTORY_OUTER_T_DF * math.pi)
            + float(proposal_logdet)
        )
    )
    proposal_inverse = np.linalg.inv(proposal_covariance)
    log_weights: list[float] = []
    movement_means: list[float] = []
    movement_variances: list[float] = []
    for node in nodes:
        target, conditional, _ = _evaluate_target(prepared, node)
        if not math.isfinite(target) or conditional is None:
            continue
        delta = node - mode
        mahalanobis = float(delta @ proposal_inverse @ delta)
        proposal_log_density = proposal_constant - 0.5 * (
            VBD_TRAJECTORY_OUTER_T_DF + 3.0
        ) * math.log1p(mahalanobis / VBD_TRAJECTORY_OUTER_T_DF)
        log_weight = target - proposal_log_density
        if not math.isfinite(log_weight):
            continue
        log_weights.append(log_weight)
        movement_means.append(conditional.movement_mean)
        movement_variances.append(conditional.movement_variance)
    if len(log_weights) < VBD_TRAJECTORY_MIN_FINITE_POINT_COUNT:
        raise TrajectoryIntegrationError("too few finite cubature nodes")
    log_weight_array = np.asarray(log_weights, dtype=np.float64)
    outer_weights = np.exp(log_weight_array - logsumexp(log_weight_array))
    retained = np.isfinite(outer_weights) & (outer_weights > 0.0)
    if np.count_nonzero(retained) < VBD_TRAJECTORY_MIN_FINITE_POINT_COUNT:
        raise TrajectoryIntegrationError("too few positive cubature weights")
    outer_weights = np.asarray(outer_weights[retained], dtype=np.float64)
    outer_weights /= float(np.sum(outer_weights))
    if not np.all(np.isfinite(outer_weights)) or not math.isclose(
        float(outer_weights.sum()), 1.0, rel_tol=0.0, abs_tol=1e-12
    ):
        raise TrajectoryIntegrationError("normalized cubature weights are invalid")
    effective_sample_size = float(1.0 / np.sum(outer_weights**2))
    max_weight = float(outer_weights.max())
    if effective_sample_size < VBD_TRAJECTORY_MIN_EFFECTIVE_SAMPLE_SIZE:
        raise TrajectoryIntegrationError("cubature effective sample size is too small")
    if max_weight > VBD_TRAJECTORY_MAX_NORMALIZED_WEIGHT:
        raise TrajectoryIntegrationError("cubature maximum weight is too large")

    movement_mean_array = np.asarray(movement_means, dtype=np.float64)[retained]
    movement_variance_array = np.asarray(movement_variances, dtype=np.float64)[
        retained
    ]
    try:
        movement_summary = summarize_conditional_normal_mixture_v2(
            "trajectory_movement",
            outer_weights,
            movement_mean_array,
            movement_variance_array,
        )
    except TrajectoryStatisticsError as exc:
        raise TrajectoryIntegrationError("movement summary is invalid") from exc
    diagnostics = TrajectoryIntegrationDiagnostics(
        point_count=VBD_TRAJECTORY_OUTER_POINT_COUNT,
        finite_point_count=len(outer_weights),
        effective_sample_size=effective_sample_size,
        max_normalized_weight=max_weight,
        mode_transformed=tuple(float(value) for value in mode),
        negative_log_posterior_at_mode=float(optimum.fun),
        hessian_condition_number=float(
            eigenvalues.max() / eigenvalues.min()
        ),
        minimum_conditional_movement_variance=float(
            movement_variance_array.min()
        ),
        maximum_conditional_movement_variance=float(
            movement_variance_array.max()
        ),
        movement_component_count=len(movement_mean_array),
    )
    return TrajectoryDeterministicFit(
        lane=prepared.lane,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        movement_summary=movement_summary,
        integration_diagnostics=diagnostics,
    )
