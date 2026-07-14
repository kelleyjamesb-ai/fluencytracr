"""Compiled diagnostics for the synthetic ordinal measurement proof."""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np
from scipy.stats import norm

from .ai_fluency_measurement_manifest import (
    CONSTRUCT_IDS,
    manifest_construct_items,
    manifest_item_ids,
)
from .ai_fluency_measurement_synthetic import MeasurementSyntheticTruth
from .ai_fluency_ordinal_measurement import OrdinalMeasurementFit
from .hashing import sha256_json


MINIMUM_ORDINAL_OMEGA = 0.70
MINIMUM_FIRST_ORDER_LOADING = 0.40
MINIMUM_SECOND_ORDER_LOADING = 0.45
LOADING_INVARIANCE_ROPE_HALF_WIDTH = 0.20
THRESHOLD_INVARIANCE_ROPE_HALF_WIDTH = 0.35
MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY = 0.80
MAXIMUM_LOADING_RECOVERY_RMSE = 0.10
MAXIMUM_THRESHOLD_RECOVERY_RMSE = 0.12
MAXIMUM_SECOND_ORDER_RECOVERY_RMSE = 0.15

MEASUREMENT_FAILING_DIAGNOSTICS = (
    "configural_structure",
    "first_order_loading",
    "ordinal_reliability",
    "second_order_structure",
    "loading_invariance",
    "threshold_invariance",
    "loading_recovery",
    "threshold_recovery",
    "second_order_recovery",
)


@dataclass(frozen=True)
class DiagnosticCheck:
    diagnostic: str
    value: float | bool
    gate: str
    passed: bool

    def to_dict(self) -> dict:
        return {
            "diagnostic": self.diagnostic,
            "value": self.value,
            "gate": self.gate,
            "passed": self.passed,
        }


@dataclass(frozen=True)
class MeasurementDiagnostics:
    scenario: str
    checks: tuple[DiagnosticCheck, ...]
    estimated_followup_construct_means: tuple[tuple[str, float], ...]
    failing_diagnostics: tuple[str, ...]
    diagnostics_hash: str

    def to_hash_body(self) -> dict:
        return {
            "scenario": self.scenario,
            "checks": [check.to_dict() for check in self.checks],
            "estimated_followup_construct_means": [
                {"construct_id": construct_id, "posterior_mode": value}
                for construct_id, value in self.estimated_followup_construct_means
            ],
            "failing_diagnostics": list(self.failing_diagnostics),
        }

    def to_dict(self) -> dict:
        return {**self.to_hash_body(), "diagnostics_hash": self.diagnostics_hash}


def _flatten_first_order_loadings(fit_wave) -> np.ndarray:
    return np.asarray(
        [
            loading.posterior_mode
            for construct in fit_wave.constructs
            for loading in construct.item_loadings
        ],
        dtype=float,
    )


def _flatten_thresholds(fit_wave) -> np.ndarray:
    return np.asarray(
        [threshold.posterior_mode for item in fit_wave.thresholds for threshold in item],
        dtype=float,
    )


def _flatten_first_order_loading_sds(fit_wave) -> np.ndarray:
    return np.asarray(
        [
            loading.posterior_sd
            for construct in fit_wave.constructs
            for loading in construct.item_loadings
        ],
        dtype=float,
    )


def _flatten_threshold_covariance(fit_wave) -> np.ndarray:
    item_covariances = tuple(
        np.asarray(value, dtype=float) for value in fit_wave.threshold_covariances
    )
    expected_item_count = len(manifest_item_ids())
    if len(item_covariances) != expected_item_count or any(
        value.shape != (4, 4) for value in item_covariances
    ):
        raise ValueError("threshold covariance grid does not match the manifest")
    covariance = np.zeros(
        (expected_item_count * 4, expected_item_count * 4), dtype=float
    )
    for index, value in enumerate(item_covariances):
        start = index * 4
        covariance[start : start + 4, start : start + 4] = value
    return covariance


def _minimum_equivalence_probability(
    baseline: np.ndarray,
    followup: np.ndarray,
    baseline_sd: np.ndarray,
    followup_sd: np.ndarray,
    *,
    rope_half_width: float,
) -> float:
    difference_mean = followup - baseline
    difference_sd = np.sqrt(baseline_sd**2 + followup_sd**2)
    if np.any(~np.isfinite(difference_sd)) or np.any(difference_sd <= 0.0):
        raise ValueError("invariance approximation requires positive finite uncertainty")
    probabilities = norm.cdf(
        (rope_half_width - difference_mean) / difference_sd
    ) - norm.cdf((-rope_half_width - difference_mean) / difference_sd)
    return float(np.min(probabilities))


def _minimum_difference_equivalence_probability(
    difference_mean: np.ndarray,
    difference_sd: np.ndarray,
    *,
    rope_half_width: float,
) -> float:
    if np.any(~np.isfinite(difference_sd)) or np.any(difference_sd <= 0.0):
        raise ValueError("invariance residuals require positive finite uncertainty")
    probabilities = norm.cdf(
        (rope_half_width - difference_mean) / difference_sd
    ) - norm.cdf((-rope_half_width - difference_mean) / difference_sd)
    return float(np.min(probabilities))


def _align_followup_thresholds_for_construct_means(
    baseline_thresholds: np.ndarray,
    followup_thresholds: np.ndarray,
    baseline_threshold_covariance: np.ndarray,
    followup_threshold_covariance: np.ndarray,
    baseline_loadings: np.ndarray,
    followup_loadings: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, tuple[tuple[str, float], ...]]:
    item_ids = manifest_item_ids()
    item_index = {item_id: index for index, item_id in enumerate(item_ids)}
    adjusted_followup = followup_thresholds.copy()
    aligned_difference_sds = np.empty_like(followup_thresholds)
    shifts = []
    for construct_id in CONSTRUCT_IDS:
        positions = []
        predictors = []
        for item_id in manifest_construct_items()[construct_id]:
            index = item_index[item_id]
            average_loading = 0.5 * (
                baseline_loadings[index] + followup_loadings[index]
            )
            for threshold_index in range(4):
                positions.append(index * 4 + threshold_index)
                predictors.append(-average_loading)
        positions_array = np.asarray(positions, dtype=int)
        predictor = np.asarray(predictors, dtype=float)
        difference = (
            followup_thresholds[positions_array]
            - baseline_thresholds[positions_array]
        )
        difference_covariance = (
            baseline_threshold_covariance[np.ix_(positions_array, positions_array)]
            + followup_threshold_covariance[np.ix_(positions_array, positions_array)]
        )
        if np.any(~np.isfinite(difference_covariance)):
            raise ValueError("threshold alignment requires finite covariance")
        try:
            np.linalg.cholesky(difference_covariance)
            precision_predictor = np.linalg.solve(
                difference_covariance, predictor
            )
            precision_difference = np.linalg.solve(
                difference_covariance, difference
            )
        except np.linalg.LinAlgError as exc:
            raise ValueError(
                "threshold alignment requires positive-definite covariance"
            ) from exc
        information = float(predictor @ precision_predictor)
        if not math.isfinite(information) or information <= 0.0:
            raise ValueError("threshold alignment construct mean is unidentified")
        construct_mean = float(predictor @ precision_difference / information)
        adjusted_followup[positions_array] = (
            followup_thresholds[positions_array] - predictor * construct_mean
        )
        projection = np.outer(predictor, precision_predictor) / information
        residual_operator = np.eye(len(positions_array)) - projection
        residual_covariance = (
            residual_operator
            @ difference_covariance
            @ residual_operator.T
        )
        residual_variances = np.diag(residual_covariance)
        if np.any(~np.isfinite(residual_variances)) or np.any(
            residual_variances <= 0.0
        ):
            raise ValueError("threshold alignment residual covariance is invalid")
        aligned_difference_sds[positions_array] = np.sqrt(residual_variances)
        shifts.append((construct_id, construct_mean))
    return adjusted_followup, aligned_difference_sds, tuple(shifts)


def compute_measurement_diagnostics(
    fit: OrdinalMeasurementFit,
    truth: MeasurementSyntheticTruth,
) -> MeasurementDiagnostics:
    baseline_loadings = _flatten_first_order_loadings(fit.baseline)
    followup_loadings = _flatten_first_order_loadings(fit.followup)
    baseline_thresholds = _flatten_thresholds(fit.baseline)
    followup_thresholds = _flatten_thresholds(fit.followup)
    baseline_loading_sds = _flatten_first_order_loading_sds(fit.baseline)
    followup_loading_sds = _flatten_first_order_loading_sds(fit.followup)
    baseline_threshold_covariance = _flatten_threshold_covariance(fit.baseline)
    followup_threshold_covariance = _flatten_threshold_covariance(fit.followup)
    (
        aligned_followup_thresholds,
        aligned_threshold_difference_sds,
        estimated_construct_means,
    ) = _align_followup_thresholds_for_construct_means(
        baseline_thresholds,
        followup_thresholds,
        baseline_threshold_covariance,
        followup_threshold_covariance,
        baseline_loadings,
        followup_loadings,
    )
    truth_baseline_loadings = np.asarray(truth.baseline_loadings, dtype=float)
    truth_followup_loadings = np.asarray(truth.followup_loadings, dtype=float)
    truth_baseline_thresholds = np.asarray(truth.baseline_thresholds, dtype=float).reshape(-1)
    truth_followup_thresholds = np.asarray(truth.followup_thresholds, dtype=float).reshape(-1)
    baseline_second_order = np.asarray(
        [value.posterior_mode for value in fit.baseline.second_order_core_loadings],
        dtype=float,
    )
    followup_second_order = np.asarray(
        [value.posterior_mode for value in fit.followup.second_order_core_loadings],
        dtype=float,
    )
    truth_second_order = np.asarray(truth.second_order_loadings, dtype=float)
    expected_loading_count = len(manifest_item_ids())
    configural_structure = bool(
        baseline_loadings.size == expected_loading_count
        and followup_loadings.size == expected_loading_count
        and baseline_thresholds.size == expected_loading_count * 4
        and followup_thresholds.size == expected_loading_count * 4
        and tuple(construct.construct_id for construct in fit.baseline.constructs)
        == tuple(construct.construct_id for construct in fit.followup.constructs)
    )
    minimum_first_order_loading = float(
        min(np.min(baseline_loadings), np.min(followup_loadings))
    )
    minimum_omega = float(
        min(
            construct.ordinal_omega
            for construct in fit.baseline.constructs + fit.followup.constructs
        )
    )
    minimum_second_order_loading = float(
        min(
            loading.posterior_mode
            for loading in (
                fit.baseline.second_order_core_loadings
                + fit.followup.second_order_core_loadings
            )
        )
    )
    minimum_loading_invariance_probability = _minimum_equivalence_probability(
        baseline_loadings,
        followup_loadings,
        baseline_loading_sds,
        followup_loading_sds,
        rope_half_width=LOADING_INVARIANCE_ROPE_HALF_WIDTH,
    )
    minimum_threshold_invariance_probability = _minimum_difference_equivalence_probability(
        aligned_followup_thresholds - baseline_thresholds,
        aligned_threshold_difference_sds,
        rope_half_width=THRESHOLD_INVARIANCE_ROPE_HALF_WIDTH,
    )
    loading_recovery_rmse = float(
        np.sqrt(
            np.mean(
                np.concatenate(
                    (
                        baseline_loadings - truth_baseline_loadings,
                        followup_loadings - truth_followup_loadings,
                    )
                )
                ** 2
            )
        )
    )
    threshold_recovery_rmse = float(
        np.sqrt(
            np.mean(
                np.concatenate(
                    (
                        baseline_thresholds - truth_baseline_thresholds,
                        aligned_followup_thresholds - truth_followup_thresholds,
                    )
                )
                ** 2
            )
        )
    )
    second_order_recovery_rmse = float(
        np.sqrt(
            np.mean(
                np.concatenate(
                    (
                        baseline_second_order - truth_second_order,
                        followup_second_order - truth_second_order,
                    )
                )
                ** 2
            )
        )
    )
    numeric_values = (
        minimum_first_order_loading,
        minimum_omega,
        minimum_second_order_loading,
        minimum_loading_invariance_probability,
        minimum_threshold_invariance_probability,
        loading_recovery_rmse,
        threshold_recovery_rmse,
        second_order_recovery_rmse,
    )
    if not all(math.isfinite(value) for value in numeric_values):
        raise ValueError("measurement diagnostics must be finite")
    checks = (
        DiagnosticCheck(
            "configural_structure",
            configural_structure,
            "exact frozen 24-item eight-construct structure",
            configural_structure,
        ),
        DiagnosticCheck(
            "first_order_loading",
            minimum_first_order_loading,
            f">={MINIMUM_FIRST_ORDER_LOADING}",
            minimum_first_order_loading >= MINIMUM_FIRST_ORDER_LOADING,
        ),
        DiagnosticCheck(
            "ordinal_reliability",
            minimum_omega,
            f">={MINIMUM_ORDINAL_OMEGA}",
            minimum_omega >= MINIMUM_ORDINAL_OMEGA,
        ),
        DiagnosticCheck(
            "second_order_structure",
            minimum_second_order_loading,
            f">={MINIMUM_SECOND_ORDER_LOADING}",
            minimum_second_order_loading >= MINIMUM_SECOND_ORDER_LOADING,
        ),
        DiagnosticCheck(
            "loading_invariance",
            minimum_loading_invariance_probability,
            (
                f"minimum item posterior P(difference within +/-"
                f"{LOADING_INVARIANCE_ROPE_HALF_WIDTH})"
                f">={MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY}"
            ),
            minimum_loading_invariance_probability
            >= MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY,
        ),
        DiagnosticCheck(
            "threshold_invariance",
            minimum_threshold_invariance_probability,
            (
                f"minimum item posterior P(difference within +/-"
                f"{THRESHOLD_INVARIANCE_ROPE_HALF_WIDTH})"
                f">={MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY}"
            ),
            minimum_threshold_invariance_probability
            >= MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY,
        ),
        DiagnosticCheck(
            "loading_recovery",
            loading_recovery_rmse,
            f"<={MAXIMUM_LOADING_RECOVERY_RMSE}",
            loading_recovery_rmse <= MAXIMUM_LOADING_RECOVERY_RMSE,
        ),
        DiagnosticCheck(
            "threshold_recovery",
            threshold_recovery_rmse,
            f"<={MAXIMUM_THRESHOLD_RECOVERY_RMSE}",
            threshold_recovery_rmse <= MAXIMUM_THRESHOLD_RECOVERY_RMSE,
        ),
        DiagnosticCheck(
            "second_order_recovery",
            second_order_recovery_rmse,
            f"<={MAXIMUM_SECOND_ORDER_RECOVERY_RMSE}",
            second_order_recovery_rmse <= MAXIMUM_SECOND_ORDER_RECOVERY_RMSE,
        ),
    )
    failing = tuple(check.diagnostic for check in checks if not check.passed)
    body = {
        "scenario": truth.scenario,
        "checks": [check.to_dict() for check in checks],
        "estimated_followup_construct_means": [
            {"construct_id": construct_id, "posterior_mode": value}
            for construct_id, value in estimated_construct_means
        ],
        "failing_diagnostics": list(failing),
    }
    return MeasurementDiagnostics(
        scenario=truth.scenario,
        checks=checks,
        estimated_followup_construct_means=estimated_construct_means,
        failing_diagnostics=failing,
        diagnostics_hash=sha256_json(body),
    )
