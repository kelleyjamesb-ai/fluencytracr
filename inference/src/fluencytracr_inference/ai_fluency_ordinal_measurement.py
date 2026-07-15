"""Aggregate ordinal-probit composite measurement proof.

The engine is intentionally narrow: it consumes complete item marginals and
pair tables, applies fixed weak priors, and uses Laplace approximations around
the composite posterior mode. It is not full-information SEM, NUTS, a source
of respondent scores, or a production measurement engine.
"""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np
from scipy.optimize import least_squares, minimize_scalar
from scipy.stats import multivariate_normal, norm

from .ai_fluency_measurement_evidence import (
    AggregateMeasurementPackage,
    AggregateMeasurementWave,
    validate_measurement_package,
)
from .ai_fluency_measurement_manifest import (
    CONSTRUCT_IDS,
    CORE_CONSTRUCT_IDS,
    manifest_construct_items,
    manifest_item_ids,
    manifest_pair_ids,
)
from .hashing import sha256_json


ORDINAL_MEASUREMENT_ENGINE = "laplace_ordinal_probit_pairwise_composite"
ORDINAL_MEASUREMENT_MODEL_KIND = "eight_first_order_five_core_second_order_ordinal_cfa"
CATEGORY_DIRICHLET_PRIOR = 1.5
FISHER_Z_PRIOR_SD = 1.0
LOADING_PRIOR_MEAN = 0.70
LOADING_PRIOR_SD = 0.25
LOADING_LOWER_BOUND = 0.20
LOADING_UPPER_BOUND = 0.95
CORRELATION_ABS_BOUND = 0.95
NUMERICAL_HESSIAN_STEP = 1e-4
BVN_CDF_RANDOM_SEED = 20260714


class OrdinalMeasurementFitError(RuntimeError):
    """The aggregate ordinal measurement fit cannot produce a valid result."""


@dataclass(frozen=True)
class ParameterSummary:
    parameter_name: str
    posterior_mode: float
    posterior_sd: float

    def to_dict(self) -> dict:
        return {
            "parameter_name": self.parameter_name,
            "posterior_mode": float(self.posterior_mode),
            "posterior_sd": float(self.posterior_sd),
        }


@dataclass(frozen=True)
class ConstructMeasurementSummary:
    construct_id: str
    item_loadings: tuple[ParameterSummary, ...]
    ordinal_omega: float

    def to_dict(self) -> dict:
        return {
            "construct_id": self.construct_id,
            "item_loadings": [loading.to_dict() for loading in self.item_loadings],
            "ordinal_omega": float(self.ordinal_omega),
        }


@dataclass(frozen=True)
class WaveMeasurementFit:
    wave_id: str
    wave_role: str
    evidence_hash: str
    thresholds: tuple[tuple[ParameterSummary, ...], ...]
    threshold_covariances: tuple[tuple[tuple[float, ...], ...], ...]
    pair_correlations: tuple[ParameterSummary, ...]
    constructs: tuple[ConstructMeasurementSummary, ...]
    second_order_core_loadings: tuple[ParameterSummary, ...]
    composite_log_likelihood: float
    wave_fit_hash: str

    def to_hash_body(self) -> dict:
        return {
            "wave_id": self.wave_id,
            "wave_role": self.wave_role,
            "evidence_hash": self.evidence_hash,
            "thresholds": [
                [threshold.to_dict() for threshold in item]
                for item in self.thresholds
            ],
            "threshold_covariances": [
                [list(row) for row in item_covariance]
                for item_covariance in self.threshold_covariances
            ],
            "pair_correlations": [value.to_dict() for value in self.pair_correlations],
            "constructs": [construct.to_dict() for construct in self.constructs],
            "second_order_core_loadings": [
                loading.to_dict() for loading in self.second_order_core_loadings
            ],
            "composite_log_likelihood": float(self.composite_log_likelihood),
        }

    def to_dict(self) -> dict:
        return {**self.to_hash_body(), "wave_fit_hash": self.wave_fit_hash}


@dataclass(frozen=True)
class OrdinalMeasurementFit:
    package_hash: str
    baseline: WaveMeasurementFit
    followup: WaveMeasurementFit
    engine_kind: str
    model_kind: str
    fit_hash: str

    def to_hash_body(self) -> dict:
        return {
            "package_hash": self.package_hash,
            "engine_kind": self.engine_kind,
            "model_kind": self.model_kind,
            "baseline": self.baseline.to_dict(),
            "followup": self.followup.to_dict(),
            "posterior_draws_generated": False,
            "latent_states_emitted": False,
            "respondent_scores_emitted": False,
            "full_information_likelihood": False,
            "nuts_used": False,
        }

    def to_dict(self) -> dict:
        return {**self.to_hash_body(), "fit_hash": self.fit_hash}


def _item_threshold_fit(
    counts: tuple[int, ...], item_id: str
) -> tuple[tuple[ParameterSummary, ...], np.ndarray]:
    observed = np.asarray(counts, dtype=float)
    category_count = len(observed)
    summaries = []
    cumulative_alphas = []
    densities = []
    total_alpha = float(observed.sum() + category_count * CATEGORY_DIRICHLET_PRIOR)
    for index in range(1, category_count):
        alpha = float(observed[:index].sum() + index * CATEGORY_DIRICHLET_PRIOR)
        beta = total_alpha - alpha
        if alpha <= 1.0 or beta <= 1.0:
            raise OrdinalMeasurementFitError("threshold beta posterior has no interior mode")
        cumulative_mode = (alpha - 1.0) / (alpha + beta - 2.0)
        threshold = float(norm.ppf(cumulative_mode))
        variance_probability = alpha * beta / (
            (alpha + beta) ** 2 * (alpha + beta + 1.0)
        )
        density = max(float(norm.pdf(threshold)), 1e-12)
        posterior_sd = math.sqrt(max(variance_probability, 0.0)) / density
        if not math.isfinite(threshold) or not math.isfinite(posterior_sd):
            raise OrdinalMeasurementFitError("threshold approximation is non-finite")
        summaries.append(
            ParameterSummary(
                parameter_name=f"threshold:{item_id}:{index}",
                posterior_mode=threshold,
                posterior_sd=float(posterior_sd),
            )
        )
        cumulative_alphas.append(alpha)
        densities.append(density)

    cumulative_alphas_array = np.asarray(cumulative_alphas, dtype=float)
    probability_covariance = np.empty(
        (category_count - 1, category_count - 1), dtype=float
    )
    denominator = total_alpha**2 * (total_alpha + 1.0)
    for left in range(category_count - 1):
        for right in range(category_count - 1):
            lower_alpha = cumulative_alphas_array[min(left, right)]
            upper_alpha = cumulative_alphas_array[max(left, right)]
            probability_covariance[left, right] = (
                lower_alpha * (total_alpha - upper_alpha) / denominator
            )
    density_outer = np.outer(densities, densities)
    threshold_covariance = probability_covariance / density_outer
    threshold_covariance = 0.5 * (
        threshold_covariance + threshold_covariance.T
    )
    if (
        np.any(~np.isfinite(threshold_covariance))
        or np.any(np.diag(threshold_covariance) <= 0.0)
        or np.min(np.linalg.eigvalsh(threshold_covariance)) <= 0.0
    ):
        raise OrdinalMeasurementFitError("threshold covariance is invalid")
    return tuple(summaries), threshold_covariance


def _item_thresholds(counts: tuple[int, ...], item_id: str) -> tuple[ParameterSummary, ...]:
    return _item_threshold_fit(counts, item_id)[0]


def _bivariate_cell_probabilities(
    rho: float,
    left_thresholds: np.ndarray,
    right_thresholds: np.ndarray,
) -> np.ndarray:
    left_bounds = np.concatenate(([-np.inf], left_thresholds, [np.inf]))
    right_bounds = np.concatenate(([-np.inf], right_thresholds, [np.inf]))
    points = np.asarray(
        [(left, right) for left in left_bounds for right in right_bounds],
        dtype=float,
    )
    cdf = multivariate_normal.cdf(
        points,
        mean=np.zeros(2),
        cov=np.asarray([[1.0, rho], [rho, 1.0]], dtype=float),
        lower_limit=np.asarray([-np.inf, -np.inf]),
        rng=np.random.default_rng(BVN_CDF_RANDOM_SEED),
    ).reshape(6, 6)
    probabilities = np.diff(np.diff(cdf, axis=0), axis=1)
    probabilities = np.maximum(probabilities, 1e-14)
    probabilities /= float(probabilities.sum())
    return probabilities


def _correlation_mode_and_sd(
    counts: np.ndarray,
    left_thresholds: np.ndarray,
    right_thresholds: np.ndarray,
) -> tuple[float, float, float]:
    def negative_log_posterior(rho: float) -> float:
        probabilities = _bivariate_cell_probabilities(
            float(rho), left_thresholds, right_thresholds
        )
        log_likelihood = float(np.sum(counts * np.log(probabilities)))
        fisher_z = float(np.arctanh(rho))
        log_prior = -0.5 * (fisher_z / FISHER_Z_PRIOR_SD) ** 2
        return -(log_likelihood + log_prior)

    result = minimize_scalar(
        negative_log_posterior,
        bounds=(-CORRELATION_ABS_BOUND, CORRELATION_ABS_BOUND),
        method="bounded",
        options={"xatol": 1e-6, "maxiter": 120},
    )
    if not result.success or not math.isfinite(float(result.fun)):
        raise OrdinalMeasurementFitError("pairwise ordinal correlation fit failed")
    mode = float(result.x)
    step = min(NUMERICAL_HESSIAN_STEP, (CORRELATION_ABS_BOUND - abs(mode)) / 4.0)
    if step <= 1e-8:
        raise OrdinalMeasurementFitError("pairwise correlation mode is boundary-saturated")
    curvature = (
        negative_log_posterior(mode + step)
        - 2.0 * negative_log_posterior(mode)
        + negative_log_posterior(mode - step)
    ) / step**2
    if not math.isfinite(curvature) or curvature <= 0.0:
        raise OrdinalMeasurementFitError("pairwise correlation curvature is invalid")
    mode_probabilities = _bivariate_cell_probabilities(
        mode, left_thresholds, right_thresholds
    )
    composite_log_likelihood = float(
        np.sum(counts * np.log(mode_probabilities))
    )
    return mode, math.sqrt(1.0 / curvature), composite_log_likelihood


def _loading_posterior_hessian(
    loadings: np.ndarray,
    observed: np.ndarray,
    standard_deviations: np.ndarray,
    pairs: tuple[tuple[int, int], ...],
) -> np.ndarray:
    """Exact Hessian for the nonlinear loading-product posterior."""

    dimension = len(loadings)
    hessian = np.eye(dimension, dtype=float) / LOADING_PRIOR_SD**2
    for value, standard_deviation, (left, right) in zip(
        observed, standard_deviations, pairs
    ):
        inverse_variance = 1.0 / float(standard_deviation) ** 2
        left_loading = float(loadings[left])
        right_loading = float(loadings[right])
        hessian[left, left] += right_loading**2 * inverse_variance
        hessian[right, right] += left_loading**2 * inverse_variance
        cross_curvature = (
            2.0 * left_loading * right_loading - float(value)
        ) * inverse_variance
        hessian[left, right] += cross_curvature
        hessian[right, left] += cross_curvature
    return hessian


def _loading_covariance(
    loadings: np.ndarray,
    observed: np.ndarray,
    standard_deviations: np.ndarray,
    pairs: tuple[tuple[int, int], ...],
    *,
    name: str,
) -> np.ndarray:
    hessian = _loading_posterior_hessian(
        loadings, observed, standard_deviations, pairs
    )
    if np.any(~np.isfinite(hessian)):
        raise OrdinalMeasurementFitError(f"{name} loading Hessian is non-finite")
    try:
        np.linalg.cholesky(hessian)
        covariance = np.linalg.inv(hessian)
    except np.linalg.LinAlgError as exc:
        raise OrdinalMeasurementFitError(
            f"{name} loading Hessian is not positive definite"
        ) from exc
    covariance = 0.5 * (covariance + covariance.T)
    variances = np.diag(covariance)
    if np.any(~np.isfinite(variances)) or np.any(variances <= 0.0):
        raise OrdinalMeasurementFitError(f"{name} loading covariance is invalid")
    return covariance


def _loading_modes(
    item_ids: tuple[str, str, str],
    pair_values: dict[tuple[str, str], tuple[float, float]],
) -> tuple[tuple[ParameterSummary, ...], np.ndarray]:
    pairs = ((0, 1), (0, 2), (1, 2))
    observed = np.asarray(
        [pair_values[(item_ids[left], item_ids[right])][0] for left, right in pairs],
        dtype=float,
    )
    standard_deviations = np.asarray(
        [pair_values[(item_ids[left], item_ids[right])][1] for left, right in pairs],
        dtype=float,
    )
    standard_deviations = np.maximum(standard_deviations, 0.02)

    def residuals(loadings: np.ndarray) -> np.ndarray:
        predicted = np.asarray(
            [loadings[left] * loadings[right] for left, right in pairs], dtype=float
        )
        residual = (observed - predicted) / standard_deviations
        prior = (loadings - LOADING_PRIOR_MEAN) / LOADING_PRIOR_SD
        return np.concatenate((residual, prior))

    result = least_squares(
        residuals,
        x0=np.full(3, LOADING_PRIOR_MEAN, dtype=float),
        bounds=(
            np.full(3, LOADING_LOWER_BOUND),
            np.full(3, LOADING_UPPER_BOUND),
        ),
        ftol=1e-12,
        xtol=1e-12,
        gtol=1e-12,
        max_nfev=300,
    )
    if not result.success or not np.all(np.isfinite(result.x)):
        raise OrdinalMeasurementFitError("first-order loading fit failed")
    if np.any(result.x <= LOADING_LOWER_BOUND + 1e-5) or np.any(
        result.x >= LOADING_UPPER_BOUND - 1e-5
    ):
        raise OrdinalMeasurementFitError("first-order loading fit saturated a bound")
    covariance = _loading_covariance(
        result.x,
        observed,
        standard_deviations,
        pairs,
        name="first-order",
    )
    variances = np.diag(covariance)
    return (
        tuple(
            ParameterSummary(
                parameter_name=f"loading:{item_id}",
                posterior_mode=float(mode),
                posterior_sd=float(math.sqrt(variance)),
            )
            for item_id, mode, variance in zip(item_ids, result.x, variances)
        ),
        covariance,
    )


def _ordinal_omega(loadings: tuple[ParameterSummary, ...]) -> float:
    values = np.asarray([loading.posterior_mode for loading in loadings], dtype=float)
    true_score_variance = float(values.sum() ** 2)
    error_variance = float(np.sum(1.0 - values**2))
    return true_score_variance / (true_score_variance + error_variance)


def _second_order_modes(
    construct_loadings: dict[str, tuple[ParameterSummary, ...]],
    construct_loading_covariances: dict[str, np.ndarray],
    pair_values: dict[tuple[str, str], tuple[float, float]],
) -> tuple[ParameterSummary, ...]:
    construct_items = manifest_construct_items()
    construct_pairs = tuple(
        (left, right)
        for left in range(len(CORE_CONSTRUCT_IDS))
        for right in range(left + 1, len(CORE_CONSTRUCT_IDS))
    )
    observed = []
    uncertainty = []
    for left_index, right_index in construct_pairs:
        left_construct = CORE_CONSTRUCT_IDS[left_index]
        right_construct = CORE_CONSTRUCT_IDS[right_index]
        left_loadings = {
            value.parameter_name.split(":", 1)[1]: value
            for value in construct_loadings[left_construct]
        }
        right_loadings = {
            value.parameter_name.split(":", 1)[1]: value
            for value in construct_loadings[right_construct]
        }
        left_item_ids = construct_items[left_construct]
        right_item_ids = construct_items[right_construct]
        estimates = []
        correlation_variances = []
        left_jacobian = np.zeros((9, 3), dtype=float)
        right_jacobian = np.zeros((9, 3), dtype=float)
        row_index = 0
        for left_item_index, left_item in enumerate(left_item_ids):
            for right_item_index, right_item in enumerate(right_item_ids):
                rho, rho_sd = pair_values[(left_item, right_item)]
                left_loading = left_loadings[left_item]
                right_loading = right_loadings[right_item]
                denominator = (
                    left_loading.posterior_mode * right_loading.posterior_mode
                )
                estimate = float(rho / denominator)
                if not math.isfinite(estimate) or abs(estimate) >= 0.95:
                    raise OrdinalMeasurementFitError(
                        "second-order construct correlation saturated its bound"
                    )
                estimates.append(estimate)
                correlation_variances.append((rho_sd / denominator) ** 2)
                left_jacobian[row_index, left_item_index] = -rho / (
                    left_loading.posterior_mode**2
                    * right_loading.posterior_mode
                )
                right_jacobian[row_index, right_item_index] = -rho / (
                    left_loading.posterior_mode
                    * right_loading.posterior_mode**2
                )
                row_index += 1

        estimates_array = np.asarray(estimates, dtype=float)
        ratio_covariance = np.diag(correlation_variances)
        ratio_covariance += (
            left_jacobian
            @ construct_loading_covariances[left_construct]
            @ left_jacobian.T
        )
        ratio_covariance += (
            right_jacobian
            @ construct_loading_covariances[right_construct]
            @ right_jacobian.T
        )
        ratio_covariance = 0.5 * (ratio_covariance + ratio_covariance.T)
        try:
            np.linalg.cholesky(ratio_covariance)
            precision_ones = np.linalg.solve(
                ratio_covariance, np.ones(len(estimates_array), dtype=float)
            )
        except np.linalg.LinAlgError as exc:
            raise OrdinalMeasurementFitError(
                "second-order ratio covariance is not positive definite"
            ) from exc
        information = float(np.sum(precision_ones))
        if not math.isfinite(information) or information <= 0.0:
            raise OrdinalMeasurementFitError(
                "second-order construct correlation is unidentified"
            )
        gls_weights = precision_ones / information
        observed.append(float(gls_weights @ estimates_array))
        uncertainty.append(float(max(math.sqrt(1.0 / information), 0.03)))
    observed_array = np.asarray(observed, dtype=float)
    uncertainty_array = np.maximum(np.asarray(uncertainty, dtype=float), 0.03)

    def residuals(loadings: np.ndarray) -> np.ndarray:
        predicted = np.asarray(
            [loadings[left] * loadings[right] for left, right in construct_pairs],
            dtype=float,
        )
        residual = (observed_array - predicted) / uncertainty_array
        prior = (loadings - LOADING_PRIOR_MEAN) / LOADING_PRIOR_SD
        return np.concatenate((residual, prior))

    result = least_squares(
        residuals,
        x0=np.full(len(CORE_CONSTRUCT_IDS), LOADING_PRIOR_MEAN, dtype=float),
        bounds=(
            np.full(len(CORE_CONSTRUCT_IDS), LOADING_LOWER_BOUND),
            np.full(len(CORE_CONSTRUCT_IDS), LOADING_UPPER_BOUND),
        ),
        ftol=1e-12,
        xtol=1e-12,
        gtol=1e-12,
        max_nfev=400,
    )
    if not result.success or np.any(~np.isfinite(result.x)):
        raise OrdinalMeasurementFitError("second-order loading fit failed")
    if np.any(result.x <= LOADING_LOWER_BOUND + 1e-5) or np.any(
        result.x >= LOADING_UPPER_BOUND - 1e-5
    ):
        raise OrdinalMeasurementFitError("second-order loading fit saturated a bound")
    covariance = _loading_covariance(
        result.x,
        observed_array,
        uncertainty_array,
        construct_pairs,
        name="second-order",
    )
    variances = np.diag(covariance)
    return tuple(
        ParameterSummary(
            parameter_name=f"second_order_loading:{construct_id}",
            posterior_mode=float(mode),
            posterior_sd=float(math.sqrt(variance)),
        )
        for construct_id, mode, variance in zip(
            CORE_CONSTRUCT_IDS, result.x, variances
        )
    )


def _fit_measurement_wave(wave: AggregateMeasurementWave) -> WaveMeasurementFit:
    item_ids = manifest_item_ids()
    item_by_id = {item.item_id: item for item in wave.items}
    threshold_fits = tuple(
        _item_threshold_fit(item_by_id[item_id].category_counts, item_id)
        for item_id in item_ids
    )
    thresholds = tuple(fit[0] for fit in threshold_fits)
    threshold_covariances = tuple(
        tuple(tuple(float(value) for value in row) for row in fit[1])
        for fit in threshold_fits
    )
    threshold_values = {
        item_id: np.asarray(
            [summary.posterior_mode for summary in item_thresholds], dtype=float
        )
        for item_id, item_thresholds in zip(item_ids, thresholds)
    }
    pair_values: dict[tuple[str, str], tuple[float, float]] = {}
    pair_summaries = []
    composite_log_likelihood = 0.0
    pair_by_ids = {
        (pair.left_item_id, pair.right_item_id): pair for pair in wave.pairs
    }
    for left_item_id, right_item_id in manifest_pair_ids():
        pair = pair_by_ids[(left_item_id, right_item_id)]
        mode, posterior_sd, log_likelihood = _correlation_mode_and_sd(
            np.asarray(pair.cell_counts, dtype=float),
            threshold_values[left_item_id],
            threshold_values[right_item_id],
        )
        pair_values[(left_item_id, right_item_id)] = (mode, posterior_sd)
        pair_summaries.append(
            ParameterSummary(
                parameter_name=f"polychoric:{left_item_id}:{right_item_id}",
                posterior_mode=mode,
                posterior_sd=posterior_sd,
            )
        )
        composite_log_likelihood += log_likelihood

    construct_items = manifest_construct_items()
    construct_loading_fits = {
        construct_id: _loading_modes(construct_items[construct_id], pair_values)
        for construct_id in CONSTRUCT_IDS
    }
    construct_loadings = {
        construct_id: fit[0] for construct_id, fit in construct_loading_fits.items()
    }
    construct_loading_covariances = {
        construct_id: fit[1] for construct_id, fit in construct_loading_fits.items()
    }
    constructs = tuple(
        ConstructMeasurementSummary(
            construct_id=construct_id,
            item_loadings=construct_loadings[construct_id],
            ordinal_omega=_ordinal_omega(construct_loadings[construct_id]),
        )
        for construct_id in CONSTRUCT_IDS
    )
    second_order_loadings = _second_order_modes(
        construct_loadings, construct_loading_covariances, pair_values
    )
    hash_body = {
        "wave_id": wave.wave_id,
        "wave_role": wave.wave_role,
        "evidence_hash": wave.evidence_hash(),
        "thresholds": [
            [threshold.to_dict() for threshold in item] for item in thresholds
        ],
        "threshold_covariances": [
            [list(row) for row in item_covariance]
            for item_covariance in threshold_covariances
        ],
        "pair_correlations": [value.to_dict() for value in pair_summaries],
        "constructs": [construct.to_dict() for construct in constructs],
        "second_order_core_loadings": [
            loading.to_dict() for loading in second_order_loadings
        ],
        "composite_log_likelihood": float(composite_log_likelihood),
    }
    return WaveMeasurementFit(
        wave_id=wave.wave_id,
        wave_role=wave.wave_role,
        evidence_hash=wave.evidence_hash(),
        thresholds=thresholds,
        threshold_covariances=threshold_covariances,
        pair_correlations=tuple(pair_summaries),
        constructs=constructs,
        second_order_core_loadings=second_order_loadings,
        composite_log_likelihood=float(composite_log_likelihood),
        wave_fit_hash=sha256_json(hash_body),
    )


def fit_ordinal_measurement_model(
    package: AggregateMeasurementPackage,
) -> OrdinalMeasurementFit:
    validate_measurement_package(package)
    from .ai_fluency_measurement_synthetic import (
        MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
        generate_measurement_synthetic_case,
    )

    if any(
        wave.response_count != MEASUREMENT_SYNTHETIC_SAMPLE_SIZE
        for wave in package.waves
    ):
        raise OrdinalMeasurementFitError(
            "measurement proof admits only the compiled synthetic sample size"
        )
    reference = generate_measurement_synthetic_case(
        seed=package.waves[0].synthetic_generator_seed,
        scenario=package.waves[0].synthetic_scenario,
        sample_size=MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
    ).package
    if package.to_dict() != reference.to_dict():
        raise OrdinalMeasurementFitError(
            "synthetic package does not match fresh generator recomputation"
        )
    baseline = _fit_measurement_wave(package.waves[0])
    followup = _fit_measurement_wave(package.waves[1])
    hash_body = {
        "package_hash": package.package_hash(),
        "engine_kind": ORDINAL_MEASUREMENT_ENGINE,
        "model_kind": ORDINAL_MEASUREMENT_MODEL_KIND,
        "baseline": baseline.to_dict(),
        "followup": followup.to_dict(),
        "posterior_draws_generated": False,
        "latent_states_emitted": False,
        "respondent_scores_emitted": False,
        "full_information_likelihood": False,
        "nuts_used": False,
    }
    return OrdinalMeasurementFit(
        package_hash=package.package_hash(),
        baseline=baseline,
        followup=followup,
        engine_kind=ORDINAL_MEASUREMENT_ENGINE,
        model_kind=ORDINAL_MEASUREMENT_MODEL_KIND,
        fit_hash=sha256_json(hash_body),
    )
