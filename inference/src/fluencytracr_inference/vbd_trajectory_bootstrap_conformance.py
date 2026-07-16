"""Process-local source-bootstrap conformance oracle for VBD trajectories."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import math

import numpy as np

from .hashing import sha256_json
from .vbd_trajectory_types import (
    VBD_TRAJECTORY_LANES,
    canonicalize_vbd_trajectory_uncertainty,
    validate_vbd_trajectory_runtime,
    vbd_trajectory_numeric_canonicalization_body,
)


VBD_BOOTSTRAP_FIXTURE_ID = "vbd_source_bootstrap_conformance_v1"
VBD_BOOTSTRAP_ORACLE_VERSION = "vbd_source_bootstrap_conformance_oracle_v2"
VBD_BOOTSTRAP_RESAMPLE_COUNT = 2_000
VBD_BOOTSTRAP_COHORT_SIZE = 16
VBD_BOOTSTRAP_PRIVATE_ROOT = (
    "fb43e8e9c7cdbb2faf943013fa1c9aca9004898539870cd2dc3d02bd84829967"
)
VBD_BOOTSTRAP_SEED = 3_765_976_209_925_714
VBD_BOOTSTRAP_ORACLE_HASH = (
    "f32b94e2a15df01d6aa257995c2201dfef788fcd25a48ea64241a2fb78f14a5e"
)
VBD_BOOTSTRAP_EXPECTED_TYPE7_P50 = (8.5, 15.0, 3.5)
VBD_BOOTSTRAP_EXPECTED_NEAREST_P50 = (9.0, 16.0, 4.0)
VBD_BOOTSTRAP_EXPECTED_COVARIANCE = (
    (0.04044726358396, 0.01440591242854, 0.01897453340341),
    (0.01440591242854, 0.005157809262658, 0.006849798111473),
    (0.01897453340341, 0.006849798111473, 0.00958500695148),
)
VBD_BOOTSTRAP_EXPECTED_STANDARD_ERRORS = (
    0.2011150506152,
    0.07181788957257,
    0.09790304873435,
)

_ENGAGEMENT_ACTIVE_DAYS = (1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30)
_FREQUENCY_RUN_COUNTS = (1, 4, 12, 24, 40, 60, 84, 112, 144, 180, 220, 264, 312, 364, 420, 480)
_FREQUENCY_RUNS_PER_ACTIVE_DAY = tuple(range(1, 17))
_BREADTH_DISTINCT_SURFACES = (1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8, 10, 12)


class BootstrapConformanceError(RuntimeError):
    """The pinned bootstrap implementation no longer matches its oracle."""


@dataclass(frozen=True)
class BootstrapConformanceResult:
    fixture_id: str
    type7_p50: tuple[float, float, float]
    nearest_index_p50: tuple[float, float, float]
    transformed_covariance: tuple[tuple[float, float, float], ...]
    transformed_standard_errors: tuple[float, float, float]
    oracle_hash: str
    passed: bool

    def to_dict(self) -> dict:
        return {
            "fixture_id": self.fixture_id,
            "oracle_version": VBD_BOOTSTRAP_ORACLE_VERSION,
            "numeric_canonicalization": (
                vbd_trajectory_numeric_canonicalization_body()
            ),
            "type7_p50": list(self.type7_p50),
            "nearest_index_p50": list(self.nearest_index_p50),
            "transformed_covariance": [
                list(row) for row in self.transformed_covariance
            ],
            "transformed_standard_errors": list(self.transformed_standard_errors),
            "oracle_hash": self.oracle_hash,
            "passed": self.passed,
            "fixture_rows_emitted": False,
            "member_material_emitted": False,
            "private_root_emitted": False,
            "bootstrap_seed_emitted": False,
            "numerical_study_input_authorized": False,
        }


def _definition_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def bootstrap_fixture_private_body() -> dict:
    """Return the fixture-private body for tests only, never artifact assembly."""

    return {
        "fixture_id": VBD_BOOTSTRAP_FIXTURE_ID,
        "cohort_size": VBD_BOOTSTRAP_COHORT_SIZE,
        "lane_order": list(VBD_TRAJECTORY_LANES),
        "engagement_active_days": list(_ENGAGEMENT_ACTIVE_DAYS),
        "frequency_run_counts": list(_FREQUENCY_RUN_COUNTS),
        "frequency_runs_per_active_day": list(_FREQUENCY_RUNS_PER_ACTIVE_DAY),
        "breadth_distinct_surfaces": list(_BREADTH_DISTINCT_SURFACES),
        "eligible_day_count": 60,
        "eligible_surface_count": 12,
        "active_set_commitment": "synthetic-bootstrap-fixture-active-set-v1",
        "window_id": "w00",
        "definition_hashes": [
            _definition_hash("runs-per-active-day-v1"),
            _definition_hash("eligible-day-v1"),
            _definition_hash("surface-taxonomy-v1"),
        ],
    }


def type7_quantile(values: np.ndarray, probability: float) -> float:
    array = np.asarray(values, dtype=float)
    if array.ndim != 1 or array.size == 0 or not np.all(np.isfinite(array)):
        raise ValueError("type-7 quantile requires a finite nonempty vector")
    if type(probability) not in (int, float) or not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
        raise ValueError("quantile probability is outside [0,1]")
    ordered = np.sort(array, kind="mergesort")
    location = (ordered.size - 1) * probability
    lower = int(math.floor(location))
    upper = int(math.ceil(location))
    fraction = location - lower
    return float(ordered[lower] + fraction * (ordered[upper] - ordered[lower]))


def nearest_index_quantile(values: np.ndarray, probability: float) -> float:
    array = np.asarray(values, dtype=float)
    if array.ndim != 1 or array.size == 0 or not np.all(np.isfinite(array)):
        raise ValueError("nearest-index quantile requires a finite nonempty vector")
    if type(probability) not in (int, float) or not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
        raise ValueError("quantile probability is outside [0,1]")
    ordered = np.sort(array, kind="mergesort")
    index = int(math.floor((ordered.size - 1) * probability + 0.5))
    return float(ordered[index])


def _fixture_values() -> np.ndarray:
    active_days = np.asarray(_ENGAGEMENT_ACTIVE_DAYS, dtype=np.int64)
    run_counts = np.asarray(_FREQUENCY_RUN_COUNTS, dtype=np.int64)
    frequency = run_counts.astype(float) / active_days.astype(float)
    if not np.array_equal(frequency, np.asarray(_FREQUENCY_RUNS_PER_ACTIVE_DAY, dtype=float)):
        raise BootstrapConformanceError("frequency fixture integer ratios drifted")
    return np.column_stack(
        [
            frequency,
            active_days.astype(float),
            np.asarray(_BREADTH_DISTINCT_SURFACES, dtype=float),
        ]
    )


def _transform_bootstrap_medians(medians: np.ndarray) -> np.ndarray:
    if medians.ndim != 2 or medians.shape[1] != 3:
        raise BootstrapConformanceError("bootstrap median matrix has the wrong shape")
    if np.any(medians[:, 0] < 0.0):
        raise BootstrapConformanceError("bootstrap frequency median is negative")
    if np.any((medians[:, 1] < 0.0) | (medians[:, 1] > 60.0)):
        raise BootstrapConformanceError("bootstrap engagement median is outside its denominator")
    if np.any((medians[:, 2] < 0.0) | (medians[:, 2] > 12.0)):
        raise BootstrapConformanceError("bootstrap breadth median is outside its denominator")
    return np.column_stack(
        [
            np.log1p(medians[:, 0]),
            np.arcsin(np.sqrt(medians[:, 1] / 60.0)),
            np.arcsin(np.sqrt(medians[:, 2] / 12.0)),
        ]
    )


def run_bootstrap_conformance() -> BootstrapConformanceResult:
    validate_vbd_trajectory_runtime()
    private_body = bootstrap_fixture_private_body()
    private_root = sha256_json(private_body)
    if private_root != VBD_BOOTSTRAP_PRIVATE_ROOT:
        raise BootstrapConformanceError("bootstrap fixture private root drifted")
    seed_digest = hashlib.sha256(
        f"{private_root}|vbd-bootstrap-v1".encode("utf-8")
    ).hexdigest()
    seed = int(seed_digest[:13], 16)
    if seed != VBD_BOOTSTRAP_SEED:
        raise BootstrapConformanceError("bootstrap fixture seed drifted")

    values = _fixture_values()
    type7_p50 = tuple(type7_quantile(values[:, index], 0.5) for index in range(3))
    nearest_p50 = tuple(
        nearest_index_quantile(values[:, index], 0.5) for index in range(3)
    )
    rng = np.random.Generator(np.random.PCG64DXSM(seed))
    indexes = rng.integers(
        0,
        VBD_BOOTSTRAP_COHORT_SIZE,
        size=(VBD_BOOTSTRAP_RESAMPLE_COUNT, VBD_BOOTSTRAP_COHORT_SIZE),
        endpoint=False,
        dtype=np.uint64,
    )
    resamples = values[indexes]
    medians = np.quantile(resamples, 0.5, axis=1, method="linear")
    transformed = _transform_bootstrap_medians(medians)
    covariance_array = np.cov(transformed, rowvar=False, ddof=1)
    covariance, standard_errors = canonicalize_vbd_trajectory_uncertainty(
        covariance_array
    )
    oracle_body = {
        "oracle_version": VBD_BOOTSTRAP_ORACLE_VERSION,
        "numeric_canonicalization": vbd_trajectory_numeric_canonicalization_body(),
        "prebootstrap_bundle_content_root": private_root,
        "bootstrap_seed": seed,
        "type7_p50": list(type7_p50),
        "transformed_covariance": [list(row) for row in covariance],
        "transformed_standard_errors": list(standard_errors),
    }
    oracle_hash = sha256_json(oracle_body)
    passed = (
        type7_p50 == VBD_BOOTSTRAP_EXPECTED_TYPE7_P50
        and nearest_p50 == VBD_BOOTSTRAP_EXPECTED_NEAREST_P50
        and covariance == VBD_BOOTSTRAP_EXPECTED_COVARIANCE
        and standard_errors == VBD_BOOTSTRAP_EXPECTED_STANDARD_ERRORS
        and oracle_hash == VBD_BOOTSTRAP_ORACLE_HASH
    )
    if not passed:
        raise BootstrapConformanceError("bootstrap conformance oracle drifted")
    return BootstrapConformanceResult(
        fixture_id=VBD_BOOTSTRAP_FIXTURE_ID,
        type7_p50=type7_p50,
        nearest_index_p50=nearest_p50,
        transformed_covariance=covariance,
        transformed_standard_errors=standard_errors,
        oracle_hash=oracle_hash,
        passed=True,
    )
