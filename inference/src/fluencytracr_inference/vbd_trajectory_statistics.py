"""Exact weighted-support statistics for VBD trajectory validation."""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np
from scipy.special import ndtr, ndtri


VBD_TRAJECTORY_WEIGHTED_QUANTILE_ID = "weighted_quantile_v1"
VBD_TRAJECTORY_NORMAL_QUADRATURE_ID = "normal_quadrature_v1"
VBD_TRAJECTORY_NORMAL_QUADRATURE_POINTS = 16
VBD_TRAJECTORY_CONDITIONAL_NORMAL_MIXTURE_QUANTILE_ID = (
    "conditional_normal_mixture_quantile_v2"
)
VBD_TRAJECTORY_CONDITIONAL_NORMAL_MIXTURE_BISECTIONS = 64
VBD_TRAJECTORY_INTERVAL_80 = (0.10, 0.90)
VBD_TRAJECTORY_INTERVAL_99 = (0.005, 0.995)
VBD_TRAJECTORY_MIXTURE_QUANTILE_PROBABILITIES = (
    VBD_TRAJECTORY_INTERVAL_99[0],
    VBD_TRAJECTORY_INTERVAL_80[0],
    VBD_TRAJECTORY_INTERVAL_80[1],
    VBD_TRAJECTORY_INTERVAL_99[1],
)


class TrajectoryStatisticsError(ValueError):
    """A posterior support or requested statistic is malformed."""


@dataclass(frozen=True)
class TrajectoryPosteriorSummary:
    quantity_name: str
    posterior_mean: float
    posterior_sd: float
    interval_80_lower: float
    interval_80_upper: float
    interval_99_lower: float
    interval_99_upper: float

    def __post_init__(self) -> None:
        if type(self.quantity_name) is not str or not self.quantity_name:
            raise TrajectoryStatisticsError("quantity name must be a nonempty string")
        values = (
            self.posterior_mean,
            self.posterior_sd,
            self.interval_80_lower,
            self.interval_80_upper,
            self.interval_99_lower,
            self.interval_99_upper,
        )
        if any(type(value) not in (int, float) for value in values) or not all(
            math.isfinite(float(value)) for value in values
        ):
            raise TrajectoryStatisticsError("posterior summary values must be finite")
        if self.posterior_sd <= 0.0:
            raise TrajectoryStatisticsError("posterior SD must be positive")
        if not (
            self.interval_99_lower
            <= self.interval_80_lower
            <= self.interval_80_upper
            <= self.interval_99_upper
        ):
            raise TrajectoryStatisticsError("posterior intervals are not nested")

    def to_dict(self) -> dict:
        return {
            "quantity_name": self.quantity_name,
            "posterior_mean": float(self.posterior_mean),
            "posterior_sd": float(self.posterior_sd),
            "credible_interval_80": {
                "lower": float(self.interval_80_lower),
                "upper": float(self.interval_80_upper),
            },
            "credible_interval_99": {
                "lower": float(self.interval_99_lower),
                "upper": float(self.interval_99_upper),
            },
        }


def _validated_support(
    values: object,
    weights: object,
    stable_support_indices: object,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    value_array = np.asarray(values)
    weight_array = np.asarray(weights)
    index_array = np.asarray(stable_support_indices)
    if value_array.ndim != 1 or weight_array.ndim != 1 or index_array.ndim != 1:
        raise TrajectoryStatisticsError("weighted support arrays must be one-dimensional")
    if not (len(value_array) == len(weight_array) == len(index_array)):
        raise TrajectoryStatisticsError("weighted support arrays must have equal length")
    if len(value_array) == 0:
        raise TrajectoryStatisticsError("weighted support cannot be empty")
    if value_array.dtype.kind not in "fiu" or weight_array.dtype.kind not in "fiu":
        raise TrajectoryStatisticsError("weighted support values and weights must be numeric")
    if index_array.dtype.kind != "i":
        raise TrajectoryStatisticsError("stable support indices must be signed integers")
    if np.any(index_array < 0):
        raise TrajectoryStatisticsError("stable support indices cannot be negative")
    value_array = np.asarray(value_array, dtype=np.float64)
    weight_array = np.asarray(weight_array, dtype=np.float64)
    index_array = np.asarray(index_array, dtype=np.int64)
    if not np.all(np.isfinite(value_array)) or not np.all(np.isfinite(weight_array)):
        raise TrajectoryStatisticsError("weighted support must be finite")
    if np.any(weight_array < 0.0):
        raise TrajectoryStatisticsError("weighted support weights cannot be negative")
    if len(np.unique(index_array)) != len(index_array):
        raise TrajectoryStatisticsError("stable support indices must be unique")
    positive = weight_array > 0.0
    if not np.any(positive):
        raise TrajectoryStatisticsError("weighted support requires positive total weight")
    value_array = value_array[positive]
    weight_array = weight_array[positive]
    index_array = index_array[positive]
    total = float(weight_array.sum())
    if not math.isfinite(total) or total <= 0.0:
        raise TrajectoryStatisticsError("weighted support requires finite positive weight")
    order = np.lexsort((index_array, value_array))
    return value_array[order], weight_array[order] / total, index_array[order]


def weighted_quantile_v1(
    values: object,
    weights: object,
    stable_support_indices: object,
    probability: float,
) -> float:
    """Return the frozen midpoint-probability weighted quantile."""

    if type(probability) not in (int, float) or not math.isfinite(float(probability)):
        raise TrajectoryStatisticsError("quantile probability must be finite")
    probability = float(probability)
    if probability < 0.0 or probability > 1.0:
        raise TrajectoryStatisticsError("quantile probability must be in [0,1]")
    ordered_values, normalized_weights, _ = _validated_support(
        values, weights, stable_support_indices
    )
    midpoints = np.cumsum(normalized_weights) - 0.5 * normalized_weights
    if probability <= midpoints[0]:
        return float(ordered_values[0])
    if probability >= midpoints[-1]:
        return float(ordered_values[-1])
    upper = int(np.searchsorted(midpoints, probability, side="right"))
    lower = upper - 1
    span = float(midpoints[upper] - midpoints[lower])
    fraction = (probability - float(midpoints[lower])) / span
    return float(
        ordered_values[lower]
        + fraction * (ordered_values[upper] - ordered_values[lower])
    )


def normal_quadrature_v1() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return the pinned 16-point standard-normal Gauss-Hermite support."""

    nodes, weights = np.polynomial.hermite.hermgauss(
        VBD_TRAJECTORY_NORMAL_QUADRATURE_POINTS
    )
    support = np.asarray(math.sqrt(2.0) * nodes, dtype=np.float64)
    normalized_weights = np.asarray(weights / math.sqrt(math.pi), dtype=np.float64)
    stable_indices = np.arange(
        VBD_TRAJECTORY_NORMAL_QUADRATURE_POINTS, dtype=np.int64
    )
    for value in (support, normalized_weights, stable_indices):
        value.setflags(write=False)
    return support, normalized_weights, stable_indices


def _validated_conditional_normal_components(
    weights: object,
    means: object,
    standard_deviations: object,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    weight_array = np.asarray(weights)
    mean_array = np.asarray(means)
    sd_array = np.asarray(standard_deviations)
    if (
        weight_array.ndim != 1
        or mean_array.ndim != 1
        or sd_array.ndim != 1
        or len(weight_array) == 0
        or not (len(weight_array) == len(mean_array) == len(sd_array))
        or weight_array.dtype.kind not in "fiu"
        or mean_array.dtype.kind not in "fiu"
        or sd_array.dtype.kind not in "fiu"
    ):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture arrays are malformed"
        )
    weight_array = np.asarray(weight_array, dtype=np.float64)
    mean_array = np.asarray(mean_array, dtype=np.float64)
    sd_array = np.asarray(sd_array, dtype=np.float64)
    if (
        not np.all(np.isfinite(weight_array))
        or not np.all(np.isfinite(mean_array))
        or not np.all(np.isfinite(sd_array))
        or np.any(weight_array <= 0.0)
        or np.any(sd_array <= 0.0)
    ):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture requires finite positive weights and scales"
        )
    return weight_array, mean_array, sd_array


def _validated_conditional_normal_mixture(
    weights: object,
    means: object,
    standard_deviations: object,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    weight_array, mean_array, sd_array = _validated_conditional_normal_components(
        weights, means, standard_deviations
    )
    total = float(np.sum(weight_array))
    if not math.isfinite(total) or total <= 0.0:
        raise TrajectoryStatisticsError(
            "conditional Normal mixture weight total is invalid"
        )
    normalized = np.asarray(weight_array / total, dtype=np.float64)
    if not np.all(np.isfinite(normalized)) or np.any(normalized <= 0.0):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture normalized weights are invalid"
        )
    return normalized, mean_array, sd_array


def _conditional_normal_mixture_quantile_from_components(
    normalized: np.ndarray,
    mean_array: np.ndarray,
    sd_array: np.ndarray,
    probability: float,
) -> float:
    """Evaluate one quantile from already validated final binary64 weights."""

    if (
        type(probability) not in (int, float)
        or not math.isfinite(float(probability))
        or float(probability) not in VBD_TRAJECTORY_MIXTURE_QUANTILE_PROBABILITIES
    ):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture probability is off plan"
        )
    probability = float(probability)
    z_probability = float(ndtri(probability))
    if not math.isfinite(z_probability):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture Normal oracle is invalid"
        )
    component_quantiles = mean_array + sd_array * z_probability
    lower = float(np.nextafter(np.min(component_quantiles), -math.inf))
    upper = float(np.nextafter(np.max(component_quantiles), math.inf))

    def cdf(value: float) -> float:
        result = float(np.sum(normalized * ndtr((value - mean_array) / sd_array)))
        if not math.isfinite(result):
            raise TrajectoryStatisticsError(
                "conditional Normal mixture CDF is nonfinite"
            )
        return result

    if cdf(lower) > probability or cdf(upper) < probability:
        raise TrajectoryStatisticsError(
            "conditional Normal mixture quantile is not bracketed"
        )
    for _ in range(VBD_TRAJECTORY_CONDITIONAL_NORMAL_MIXTURE_BISECTIONS):
        midpoint = lower + (upper - lower) / 2.0
        if cdf(midpoint) >= probability:
            upper = midpoint
        else:
            lower = midpoint
    if not math.isfinite(upper):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture quantile is nonfinite"
        )
    return upper


def conditional_normal_mixture_quantile_v2(
    weights: object,
    means: object,
    standard_deviations: object,
    probability: float,
) -> float:
    """Return one pinned direct conditional-Normal mixture quantile."""

    normalized, mean_array, sd_array = _validated_conditional_normal_mixture(
        weights, means, standard_deviations
    )
    return _conditional_normal_mixture_quantile_from_components(
        normalized, mean_array, sd_array, probability
    )


def _validated_conditional_standard_deviations(variances: object) -> np.ndarray:
    variance_array = np.asarray(variances)
    if variance_array.ndim != 1 or variance_array.dtype.kind not in "fiu":
        raise TrajectoryStatisticsError(
            "conditional Normal mixture variances are malformed"
        )
    variance_array = np.asarray(variance_array, dtype=np.float64)
    if not np.all(np.isfinite(variance_array)) or np.any(variance_array <= 0.0):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture variances must be finite and positive"
        )
    return np.sqrt(variance_array)


def _summarize_conditional_normal_components(
    quantity_name: str,
    normalized: np.ndarray,
    mean_array: np.ndarray,
    standard_deviations: np.ndarray,
) -> TrajectoryPosteriorSummary:
    posterior_mean = float(np.sum(normalized * mean_array))
    posterior_variance = float(
        np.sum(
            normalized
            * (standard_deviations**2 + (mean_array - posterior_mean) ** 2)
        )
    )
    if (
        not math.isfinite(posterior_mean)
        or not math.isfinite(posterior_variance)
        or posterior_variance <= 0.0
    ):
        raise TrajectoryStatisticsError(
            "conditional Normal mixture moments are invalid"
        )
    quantiles = {
        probability: _conditional_normal_mixture_quantile_from_components(
            normalized, mean_array, standard_deviations, probability
        )
        for probability in VBD_TRAJECTORY_MIXTURE_QUANTILE_PROBABILITIES
    }
    return TrajectoryPosteriorSummary(
        quantity_name=quantity_name,
        posterior_mean=posterior_mean,
        posterior_sd=math.sqrt(posterior_variance),
        interval_80_lower=quantiles[VBD_TRAJECTORY_INTERVAL_80[0]],
        interval_80_upper=quantiles[VBD_TRAJECTORY_INTERVAL_80[1]],
        interval_99_lower=quantiles[VBD_TRAJECTORY_INTERVAL_99[0]],
        interval_99_upper=quantiles[VBD_TRAJECTORY_INTERVAL_99[1]],
    )


def summarize_conditional_normal_mixture_v2(
    quantity_name: str,
    weights: object,
    means: object,
    variances: object,
) -> TrajectoryPosteriorSummary:
    """Summarize caller-provided conditional Normals after one normalization."""

    standard_deviations = _validated_conditional_standard_deviations(variances)
    normalized, mean_array, standard_deviations = (
        _validated_conditional_normal_mixture(
            weights, means, standard_deviations
        )
    )
    return _summarize_conditional_normal_components(
        quantity_name, normalized, mean_array, standard_deviations
    )


def _summarize_pre_normalized_conditional_normal_mixture_v2(
    quantity_name: str,
    weights: object,
    means: object,
    variances: object,
) -> TrajectoryPosteriorSummary:
    """Summarize engine-produced final weights without another normalization."""

    standard_deviations = _validated_conditional_standard_deviations(variances)
    normalized, mean_array, standard_deviations = (
        _validated_conditional_normal_components(
            weights, means, standard_deviations
        )
    )
    return _summarize_conditional_normal_components(
        quantity_name, normalized, mean_array, standard_deviations
    )


def summarize_weighted_support(
    quantity_name: str,
    values: object,
    weights: object,
    stable_support_indices: object,
) -> TrajectoryPosteriorSummary:
    """Summarize one exact support without retaining or emitting its members."""

    ordered_values, normalized_weights, ordered_indices = _validated_support(
        values, weights, stable_support_indices
    )
    mean = float(np.sum(normalized_weights * ordered_values))
    variance = float(np.sum(normalized_weights * (ordered_values - mean) ** 2))
    if not math.isfinite(variance) or variance <= 0.0:
        raise TrajectoryStatisticsError("posterior support variance must be positive")
    return TrajectoryPosteriorSummary(
        quantity_name=quantity_name,
        posterior_mean=mean,
        posterior_sd=math.sqrt(variance),
        interval_80_lower=weighted_quantile_v1(
            ordered_values,
            normalized_weights,
            ordered_indices,
            VBD_TRAJECTORY_INTERVAL_80[0],
        ),
        interval_80_upper=weighted_quantile_v1(
            ordered_values,
            normalized_weights,
            ordered_indices,
            VBD_TRAJECTORY_INTERVAL_80[1],
        ),
        interval_99_lower=weighted_quantile_v1(
            ordered_values,
            normalized_weights,
            ordered_indices,
            VBD_TRAJECTORY_INTERVAL_99[0],
        ),
        interval_99_upper=weighted_quantile_v1(
            ordered_values,
            normalized_weights,
            ordered_indices,
            VBD_TRAJECTORY_INTERVAL_99[1],
        ),
    )
