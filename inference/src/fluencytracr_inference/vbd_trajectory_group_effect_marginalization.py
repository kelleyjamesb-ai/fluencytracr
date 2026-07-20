"""Exact collapsed target and conditional reconstruction for the held diagnostic."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import math

import arviz as az
import numpy as np
import pymc as pm
import pytensor.tensor as pt
from scipy.linalg import block_diag, helmert, solve_triangular
from scipy.special import ndtr

from .vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
    summarize_conditional_normal_mixture_v2,
    summarize_weighted_support,
)
from .hashing import sha256_json, stable_stringify
from .vbd_trajectory_group_effect_marginalization_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_COUNT,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER,
)
from .vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
    VBD_TRAJECTORY_FIXED_EFFECT_PRIOR_SD,
    VBD_TRAJECTORY_GROUP_SCALE_PRIOR_SD,
    VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD,
    VBD_TRAJECTORY_RHO_ABS_BOUND,
)
from .vbd_trajectory_types import (
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_TRANSFORMS,
    vbd_trajectory_model_manifest_body,
)


class VbdTrajectoryGroupEffectMarginalizationError(ValueError):
    """The collapsed target or reconstruction input is not exact and canonical."""


def validate_vbd_group_effect_marginalization_posterior_variable_order(
    variable_order: object,
) -> tuple[str, ...]:
    """Require exact variable-set identity and return canonical projection order."""

    if type(variable_order) not in (tuple, list):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization posterior variable set is invalid"
        )
    names = tuple(variable_order)
    expected = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER
    if (
        any(type(name) is not str for name in names)
        or len(names) != len(expected)
        or len(set(names)) != len(names)
        or set(names) != set(expected)
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization posterior variable set is invalid"
        )
    return VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER


def canonical_vbd_group_effect_marginalization_posterior_grids(
    posterior: object,
) -> dict[str, np.ndarray]:
    """Validate the natural stored set, then load exact grids by canonical name."""

    data_vars = getattr(posterior, "data_vars", None)
    dataset_coords = getattr(posterior, "coords", None)
    if data_vars is None or dataset_coords is None:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization posterior variable set is invalid"
        )
    try:
        if set(dataset_coords) != {"chain", "draw"}:
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization posterior chain/draw identity is invalid"
            )
        dataset_chain_coords = np.asarray(dataset_coords["chain"])
        dataset_draw_coords = np.asarray(dataset_coords["draw"])
        if (
            dataset_chain_coords.dtype != np.dtype(np.int64)
            or dataset_draw_coords.dtype != np.dtype(np.int64)
            or not np.array_equal(
                dataset_chain_coords, np.arange(4, dtype=np.int64)
            )
            or not np.array_equal(
                dataset_draw_coords, np.arange(20_000, dtype=np.int64)
            )
        ):
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization posterior chain/draw identity is invalid"
            )
    except TypeError as exc:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization posterior chain/draw identity is invalid"
        ) from exc
    try:
        stored_names = list(data_vars)
        canonical_names = validate_vbd_group_effect_marginalization_posterior_variable_order(
            stored_names
        )
    except (TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization posterior variable set is invalid"
        ) from exc
    grids: dict[str, np.ndarray] = {}
    for name in canonical_names:
        try:
            variable = posterior[name]
        except (KeyError, TypeError, AttributeError) as exc:
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization posterior variable set is invalid"
            ) from exc
        dims = getattr(variable, "dims", None)
        coords = getattr(variable, "coords", None)
        try:
            if set(coords) != {"chain", "draw"}:
                raise VbdTrajectoryGroupEffectMarginalizationError(
                    "marginalization posterior chain/draw identity is invalid"
                )
            chain_coords = np.asarray(coords["chain"])
            draw_coords = np.asarray(coords["draw"])
        except (KeyError, TypeError, AttributeError) as exc:
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization posterior chain/draw identity is invalid"
            ) from exc
        if (
            tuple(dims) != ("chain", "draw")
            or coords is None
            or not np.array_equal(
                chain_coords, np.arange(4, dtype=np.int64)
            )
            or not np.array_equal(
                draw_coords, np.arange(20_000, dtype=np.int64)
            )
            or chain_coords.dtype != np.dtype(np.int64)
            or draw_coords.dtype != np.dtype(np.int64)
        ):
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization posterior chain/draw identity is invalid"
            )
        raw = getattr(variable, "values", variable)
        array = np.asarray(raw)
        if (
            array.dtype != np.dtype(np.float64)
            or array.shape != (4, 20_000)
            or not np.all(np.isfinite(array))
        ):
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization posterior grid is invalid"
            )
        grids[name] = np.ascontiguousarray(array)
    return grids


@dataclass(frozen=True)
class VbdGroupEffectConditionalReconstruction:
    u_mean: np.ndarray
    u_covariance: np.ndarray
    movement_mean: float
    movement_variance: float
    joint_mean: np.ndarray
    joint_covariance: np.ndarray


@dataclass(frozen=True)
class VbdConditionalNormalMixtureSummary:
    summary: TrajectoryPosteriorSummary
    channels: dict[str, np.ndarray]


@dataclass(frozen=True, init=False)
class VbdReconstructedQuantityProjection:
    summary: TrajectoryPosteriorSummary
    channel_diagnostic_rows: tuple[dict, ...]
    component_grid_shape: tuple[int, int]
    component_count: int
    component_means_commitment: str
    component_variances_commitment: str
    component_grid_commitment: str
    conditional_components_emitted: bool
    pseudo_draws_emitted: bool
    conditional_mean_substitution: bool

    def __new__(cls, *_args, **_kwargs):
        raise TypeError(
            "reconstructed projections require exact component-grid derivation"
        )


@dataclass(frozen=True, init=False)
class VbdSampledParameterProjection:
    summary: TrajectoryPosteriorSummary
    diagnostic_row: dict
    posterior_grid_shape: tuple[int, int]
    posterior_value_count: int
    posterior_grid_commitment: str

    def __new__(cls, *_args, **_kwargs):
        raise TypeError("sampled projections require exact posterior-grid derivation")


@dataclass(frozen=True, init=False)
class VbdGroupEffectMarginalizationPosteriorProjection:
    lane: str
    panel_group_count: int
    prepared_input_hash: str
    model_input_hash: str
    posterior_grid_set_commitment: str
    sampled_parameter_projections: tuple[VbdSampledParameterProjection, ...]
    reconstructed_quantity_projections: tuple[VbdReconstructedQuantityProjection, ...]
    reconstruction_provenance_root: str

    def __new__(cls, *_args, **_kwargs):
        raise TypeError(
            "posterior projections require bound-grid conditional reconstruction"
        )


def _component_array_commitment(field: str, array: np.ndarray) -> str:
    canonical = np.asarray(array, dtype="<f8", order="C")
    header = {
        "algorithm": "vbd_conditional_normal_component_array_v1",
        "field": field,
        "shape": [4, 20_000],
        "dtype": "float64-le",
        "order": "chain_major_c",
    }
    digest = hashlib.sha256()
    digest.update(stable_stringify(header).encode("utf-8"))
    digest.update(b"\x00")
    digest.update(canonical.tobytes(order="C"))
    return digest.hexdigest()


def _posterior_grid_commitment(
    parameter_name: str, values: np.ndarray
) -> str:
    canonical = np.asarray(values, dtype="<f8", order="C")
    header = {
        "algorithm": "vbd_sampled_parameter_grid_v1",
        "parameter_name": parameter_name,
        "shape": [4, 20_000],
        "dtype": "float64-le",
        "order": "chain_major_c",
    }
    digest = hashlib.sha256()
    digest.update(stable_stringify(header).encode("utf-8"))
    digest.update(b"\x00")
    digest.update(canonical.tobytes(order="C"))
    return digest.hexdigest()


def validate_vbd_group_effect_marginalization_prepared_target(
    prepared: object,
    *,
    expected_model_input_hash: str,
    expected_prepared_input_hash: str,
) -> TrajectoryPreparedInput:
    """Validate the exact canonical prepared target against a trusted hash."""

    if (
        type(prepared) is not TrajectoryPreparedInput
        or not _is_sha256(expected_model_input_hash)
        or not _is_sha256(expected_prepared_input_hash)
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization prepared target identity is invalid"
        )
    c = prepared.panel_group_count
    n = c * 18
    time_index = np.tile(np.arange(18, dtype=np.int64), c)
    group_index = np.repeat(np.arange(c, dtype=np.int64), 18)
    pre_time = np.arange(12, dtype=np.float64)
    unique_tau = (
        np.arange(18, dtype=np.float64) - pre_time.mean()
    ) / pre_time.std(ddof=1)
    time_tau = unique_tau[time_index]
    x = np.column_stack((np.ones(n, dtype=np.float64), time_tau))
    basis = np.asarray(helmert(c, full=False).T, dtype=np.float64)
    augmented = np.column_stack((x, basis[group_index]))
    post = (time_index >= 12).astype(np.int64)
    group_rows = tuple(
        np.arange(group * 18, (group + 1) * 18, dtype=np.int64)
        for group in range(c)
    )
    contrast = np.zeros(n, dtype=np.float64)
    contrast[post == 0] = -prepared.direction_sign / (12 * c)
    contrast[np.isin(time_index, (15, 16, 17))] = prepared.direction_sign / (
        3 * c
    )
    arrays = (
        prepared.y,
        prepared.known_se,
        prepared.time_index,
        prepared.time_tau,
        prepared.post,
        prepared.group_index,
        prepared.x,
        prepared.zero_sum_basis,
        prepared.augmented_design,
        prepared.latent_level_contrast,
    )
    float_arrays = (
        prepared.y,
        prepared.known_se,
        prepared.time_tau,
        prepared.x,
        prepared.zero_sum_basis,
        prepared.augmented_design,
        prepared.latent_level_contrast,
    )
    integer_arrays = (
        prepared.time_index,
        prepared.post,
        prepared.group_index,
        *prepared.group_rows,
    )
    expected_transform_root = sha256_json(
        {
            "lane": prepared.lane,
            "raw_transform_id": VBD_TRAJECTORY_TRANSFORMS.get(prepared.lane),
            "raw_pre_mean": prepared.raw_pre_mean,
            "raw_pre_sd": prepared.raw_pre_sd,
            "standard_error_scaling": 1.0 / prepared.raw_pre_sd,
            "pre_window_indexes": list(prepared.standardization_window_indexes),
        }
    ) if type(prepared.raw_pre_sd) is float and prepared.raw_pre_sd > 0.0 else None
    context_body = {
        "ordered_panel_manifest_root": prepared.ordered_panel_manifest_root,
        "lane_observation_root": prepared.lane_observation_root,
        "joint_uncertainty_roots_hash": prepared.joint_uncertainty_roots_hash,
        "cohort_partition_root": prepared.cohort_partition_root,
        "study_plan_root": prepared.study_plan_root,
        "seed_manifest_root": prepared.seed_manifest_root,
        "transform_root": prepared.transform_root,
        "cross_lane_covariance_bound_not_used_as_zero": True,
        "depth_context_excluded": True,
    }
    roots = (
        prepared.transform_root,
        prepared.model_manifest_root,
        prepared.ordered_panel_manifest_root,
        prepared.cohort_partition_root,
        prepared.study_plan_root,
        prepared.seed_manifest_root,
        prepared.lane_observation_root,
        prepared.joint_uncertainty_roots_hash,
        prepared.model_input_hash,
        prepared.context_binding_hash,
        prepared.prepared_input_hash,
    )
    if (
        c not in (6, 12)
        or type(c) is not int
        or prepared.lane not in VBD_TRAJECTORY_LANES
        or prepared.aggregate_k != 16
        or type(prepared.aggregate_k) is not int
        or prepared.series_evidence_eligible is not True
        or prepared.standardization_window_indexes != tuple(range(12))
        or prepared.fixed_effect_names != ("alpha", "beta")
        or prepared.direction_sign not in (-1, 1)
        or type(prepared.direction_sign) is not int
        or any(type(array) is not np.ndarray for array in arrays)
        or any(array.flags.writeable for array in arrays)
        or any(array.dtype != np.dtype(np.float64) for array in float_arrays)
        or any(array.dtype != np.dtype(np.int64) for array in integer_arrays)
        or prepared.y.shape != (n,)
        or prepared.known_se.shape != (n,)
        or prepared.time_index.shape != (n,)
        or prepared.time_tau.shape != (n,)
        or prepared.post.shape != (n,)
        or prepared.group_index.shape != (n,)
        or prepared.x.shape != (n, 2)
        or prepared.zero_sum_basis.shape != (c, c - 1)
        or prepared.augmented_design.shape != (n, c + 1)
        or prepared.latent_level_contrast.shape != (n,)
        or not np.all(np.isfinite(prepared.y))
        or not np.all(np.isfinite(prepared.known_se))
        or np.any(prepared.known_se <= 0.0)
        or not np.array_equal(prepared.time_index, time_index)
        or not np.array_equal(prepared.time_tau, time_tau)
        or not np.array_equal(prepared.post, post)
        or not np.array_equal(prepared.group_index, group_index)
        or len(prepared.group_rows) != c
        or any(
            not np.array_equal(actual, expected)
            for actual, expected in zip(
                prepared.group_rows, group_rows, strict=True
            )
        )
        or not np.array_equal(prepared.x, x)
        or not np.array_equal(prepared.zero_sum_basis, basis)
        or not np.array_equal(prepared.augmented_design, augmented)
        or not np.array_equal(prepared.latent_level_contrast, contrast)
        or type(prepared.raw_pre_mean) is not float
        or not math.isfinite(prepared.raw_pre_mean)
        or type(prepared.raw_pre_sd) is not float
        or not math.isfinite(prepared.raw_pre_sd)
        or prepared.raw_pre_sd <= 0.0
        or any(not _is_sha256(root) for root in roots)
        or prepared.transform_root != expected_transform_root
        or prepared.model_manifest_root
        != sha256_json(vbd_trajectory_model_manifest_body())
        or prepared.model_input_hash != sha256_json(prepared.to_hash_body())
        or prepared.model_input_hash != expected_model_input_hash
        or prepared.context_binding_hash != sha256_json(context_body)
        or prepared.prepared_input_hash
        != sha256_json(
            {
                "model_input_hash": prepared.model_input_hash,
                "context_binding_hash": prepared.context_binding_hash,
            }
        )
        or prepared.prepared_input_hash != expected_prepared_input_hash
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization prepared target changed"
        )
    return prepared


def _is_sha256(value: object) -> bool:
    return (
        type(value) is str
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value)
    )


def _prepared_arrays(
    prepared: object,
    *,
    expected_model_input_hash: str,
    expected_prepared_input_hash: str,
) -> tuple[
    int,
    np.ndarray,
    tuple[np.ndarray, ...],
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
]:
    validate_vbd_group_effect_marginalization_prepared_target(
        prepared,
        expected_model_input_hash=expected_model_input_hash,
        expected_prepared_input_hash=expected_prepared_input_hash,
    )
    try:
        group_count = prepared.panel_group_count
        group_index = np.asarray(prepared.group_index)
        group_rows = tuple(np.asarray(rows) for rows in prepared.group_rows)
        y = np.asarray(prepared.y)
        known_se = np.asarray(prepared.known_se)
        time_tau = np.asarray(prepared.time_tau)
        basis = np.asarray(prepared.zero_sum_basis)
        contrast = np.asarray(prepared.latent_level_contrast)
    except (AttributeError, TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization prepared input is incomplete"
        ) from exc
    if (
        type(group_count) is not int
        or group_count not in (6, 12)
        or group_index.dtype.kind not in "iu"
        or group_index.ndim != 1
        or y.ndim != 1
        or known_se.ndim != 1
        or time_tau.ndim != 1
        or contrast.ndim != 1
        or not (len(group_index) == len(y) == len(known_se) == len(time_tau) == len(contrast))
        or basis.shape != (group_count, group_count - 1)
        or len(group_rows) != group_count
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization prepared dimensions are invalid"
        )
    group_index = np.asarray(group_index, dtype=np.int64)
    y = np.asarray(y, dtype=np.float64)
    known_se = np.asarray(known_se, dtype=np.float64)
    time_tau = np.asarray(time_tau, dtype=np.float64)
    basis = np.asarray(basis, dtype=np.float64)
    contrast = np.asarray(contrast, dtype=np.float64)
    if (
        np.any(group_index < 0)
        or np.any(group_index >= group_count)
        or not np.all(np.isfinite(y))
        or not np.all(np.isfinite(known_se))
        or np.any(known_se <= 0.0)
        or not np.all(np.isfinite(time_tau))
        or not np.all(np.isfinite(basis))
        or not np.all(np.isfinite(contrast))
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization prepared values are invalid"
        )
    expected_projection = np.eye(group_count) - np.ones(
        (group_count, group_count), dtype=np.float64
    ) / group_count
    if not np.allclose(
        basis.T @ basis,
        np.eye(group_count - 1),
        rtol=0.0,
        atol=1e-13,
    ) or not np.allclose(
        basis @ basis.T,
        expected_projection,
        rtol=0.0,
        atol=1e-13,
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "prepared Helmert basis or zero-sum covariance changed"
        )
    canonical_rows = []
    for group, rows in enumerate(group_rows):
        if rows.dtype.kind not in "iu" or rows.ndim != 1:
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization group rows are malformed"
            )
        rows = np.asarray(rows, dtype=np.int64)
        expected_rows = np.flatnonzero(group_index == group).astype(np.int64)
        if not np.array_equal(rows, expected_rows) or len(rows) == 0:
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "marginalization group rows changed"
            )
        canonical_rows.append(rows)
    return (
        group_count,
        group_index,
        tuple(canonical_rows),
        y,
        known_se,
        time_tau,
        basis,
        contrast,
    )


def _support(
    *, alpha: object, beta: object, sigma_u: object, sigma_r: object, rho: object
) -> tuple[float, float, float, float, float]:
    values = (alpha, beta, sigma_u, sigma_r, rho)
    if any(type(value) not in (int, float) for value in values):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization parameters must be scalar binary64 values"
        )
    converted = tuple(float(value) for value in values)
    if (
        not all(math.isfinite(value) for value in converted)
        or converted[2] <= 0.0
        or converted[3] <= 0.0
        or abs(converted[4]) >= 0.95
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization parameters are outside frozen support"
        )
    return converted


def _stationary_blocks(
    group_rows: tuple[np.ndarray, ...], sigma_r: float, rho: float
) -> np.ndarray:
    blocks = []
    for rows in group_rows:
        lags = np.abs(
            np.subtract.outer(np.arange(len(rows)), np.arange(len(rows)))
        )
        blocks.append(sigma_r**2 / (1.0 - rho**2) * rho**lags)
    return np.asarray(block_diag(*blocks), dtype=np.float64)


def _chol_solve(cholesky: np.ndarray, right_hand_side: np.ndarray) -> np.ndarray:
    lower = solve_triangular(
        cholesky,
        right_hand_side,
        lower=True,
        check_finite=False,
    )
    return solve_triangular(
        cholesky.T,
        lower,
        lower=False,
        check_finite=False,
    )


def vbd_group_effect_marginalized_log_density(
    prepared: object,
    *,
    expected_model_input_hash: str,
    expected_prepared_input_hash: str,
    alpha: float,
    beta: float,
    sigma_u: float,
    sigma_r: float,
    rho: float,
) -> float:
    """Evaluate the exact low-rank marginal likelihood with Cholesky solves."""

    alpha, beta, sigma_u, sigma_r, rho = _support(
        alpha=alpha,
        beta=beta,
        sigma_u=sigma_u,
        sigma_r=sigma_r,
        rho=rho,
    )
    group_count, group_index, group_rows, y, known_se, time_tau, basis, _ = (
        _prepared_arrays(
            prepared,
            expected_model_input_hash=expected_model_input_hash,
            expected_prepared_input_hash=expected_prepared_input_hash,
        )
    )
    incidence = np.eye(group_count, dtype=np.float64)[group_index]
    a = incidence @ basis
    state_covariance = _stationary_blocks(group_rows, sigma_r, rho)
    r = state_covariance + np.diag(known_se**2)
    residual = y - alpha - beta * time_tau
    try:
        r_cholesky = np.linalg.cholesky(r)
        u = sigma_u * a
        r_inverse_u = _chol_solve(r_cholesky, u)
        w = np.eye(group_count - 1, dtype=np.float64) + u.T @ r_inverse_u
        w_cholesky = np.linalg.cholesky(w)
        q = _chol_solve(r_cholesky, residual)
        b = u.T @ q
        w_inverse_b = _chol_solve(w_cholesky, b)
    except (np.linalg.LinAlgError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization covariance is not positive definite"
        ) from exc
    logdet = 2.0 * float(np.log(np.diag(r_cholesky)).sum()) + 2.0 * float(
        np.log(np.diag(w_cholesky)).sum()
    )
    quadratic = float(residual @ q - b @ w_inverse_b)
    result = -0.5 * (len(y) * math.log(2.0 * math.pi) + logdet + quadratic)
    if not math.isfinite(result):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "marginalization log density is nonfinite"
        )
    return result


def vbd_group_effect_marginalized_symbolic_log_density(
    prepared: object,
    *,
    expected_model_input_hash: str,
    expected_prepared_input_hash: str,
    alpha,
    beta,
    sigma_u,
    sigma_r,
    rho,
):
    """Build the independent PyTensor low-rank target used by the candidate model."""

    group_count, group_index, group_rows, y, known_se, time_tau, basis, _ = (
        _prepared_arrays(
            prepared,
            expected_model_input_hash=expected_model_input_hash,
            expected_prepared_input_hash=expected_prepared_input_hash,
        )
    )
    incidence = np.eye(group_count, dtype=np.float64)[group_index]
    a = incidence @ basis
    blocks = []
    for rows in group_rows:
        lags = np.abs(
            np.subtract.outer(np.arange(len(rows)), np.arange(len(rows)))
        )
        blocks.append(sigma_r**2 / (1.0 - rho**2) * pt.power(rho, lags))
    state_covariance = pt.linalg.block_diag(*blocks)
    r = state_covariance + np.diag(known_se**2)
    residual = y - alpha - beta * time_tau
    r_cholesky = pt.linalg.cholesky(r)
    u = sigma_u * a
    r_lower_u = pt.linalg.solve_triangular(r_cholesky, u, lower=True)
    r_inverse_u = pt.linalg.solve_triangular(
        r_cholesky.T, r_lower_u, lower=False
    )
    w = pt.eye(group_count - 1, dtype="float64") + pt.dot(u.T, r_inverse_u)
    w_cholesky = pt.linalg.cholesky(w)
    r_lower_e = pt.linalg.solve_triangular(r_cholesky, residual, lower=True)
    q = pt.linalg.solve_triangular(r_cholesky.T, r_lower_e, lower=False)
    b = pt.dot(u.T, q)
    w_lower_b = pt.linalg.solve_triangular(w_cholesky, b, lower=True)
    w_inverse_b = pt.linalg.solve_triangular(
        w_cholesky.T, w_lower_b, lower=False
    )
    logdet = 2.0 * pt.sum(pt.log(pt.diag(r_cholesky))) + 2.0 * pt.sum(
        pt.log(pt.diag(w_cholesky))
    )
    quadratic = pt.dot(residual, q) - pt.dot(b, w_inverse_b)
    return -0.5 * (
        len(y) * math.log(2.0 * math.pi) + logdet + quadratic
    )


def build_vbd_trajectory_group_effect_marginalized_model(
    prepared: object,
    *,
    expected_model_input_hash: str,
    expected_prepared_input_hash: str,
) -> pm.Model:
    """Build the sampler-free candidate graph; task 2.16 exposes no runner."""

    validate_vbd_group_effect_marginalization_posterior_variable_order(
        ("alpha", "beta", "sigma_u", "sigma_r", "rho")
    )
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
        sigma_r = pm.HalfNormal(
            "sigma_r", sigma=VBD_TRAJECTORY_INNOVATION_SCALE_PRIOR_SD
        )
        rho = pm.Uniform(
            "rho",
            lower=-VBD_TRAJECTORY_RHO_ABS_BOUND,
            upper=VBD_TRAJECTORY_RHO_ABS_BOUND,
        )
        pm.Potential(
            "marginal_observation_logp",
            vbd_group_effect_marginalized_symbolic_log_density(
                prepared,
                expected_model_input_hash=expected_model_input_hash,
                expected_prepared_input_hash=expected_prepared_input_hash,
                alpha=alpha,
                beta=beta,
                sigma_u=sigma_u,
                sigma_r=sigma_r,
                rho=rho,
            ),
        )
    return model


def conditional_vbd_group_effect_reconstruction(
    prepared: object,
    *,
    expected_model_input_hash: str,
    expected_prepared_input_hash: str,
    alpha: float,
    beta: float,
    sigma_u: float,
    sigma_r: float,
    rho: float,
) -> VbdGroupEffectConditionalReconstruction:
    """Return the exact joint conditional Normal for ``u`` and movement."""

    alpha, beta, sigma_u, sigma_r, rho = _support(
        alpha=alpha,
        beta=beta,
        sigma_u=sigma_u,
        sigma_r=sigma_r,
        rho=rho,
    )
    group_count, group_index, group_rows, y, known_se, time_tau, basis, contrast = (
        _prepared_arrays(
            prepared,
            expected_model_input_hash=expected_model_input_hash,
            expected_prepared_input_hash=expected_prepared_input_hash,
        )
    )
    incidence = np.eye(group_count, dtype=np.float64)[group_index]
    a = incidence @ basis
    projection = basis @ basis.T
    state_covariance = _stationary_blocks(group_rows, sigma_r, rho)
    d = np.diag(known_se**2)
    r = state_covariance + d
    residual = y - alpha - beta * time_tau
    u_low_rank = sigma_u * a
    try:
        r_cholesky = np.linalg.cholesky(r)
        r_inverse_u = _chol_solve(r_cholesky, u_low_rank)
        w = np.eye(group_count - 1) + u_low_rank.T @ r_inverse_u
        w_cholesky = np.linalg.cholesky(w)
        q = _chol_solve(r_cholesky, residual)
        z_mean = _chol_solve(w_cholesky, u_low_rank.T @ q)
        z_covariance = _chol_solve(
            w_cholesky, np.eye(group_count - 1, dtype=np.float64)
        )
        u_mean = basis @ (sigma_u * z_mean)
        u_covariance = sigma_u**2 * basis @ z_covariance @ basis.T

        g = state_covariance + u_low_rank @ u_low_rank.T
        v = g + d
        v_cholesky = np.linalg.cholesky(v)
        v_inverse_residual = _chol_solve(v_cholesky, residual)
        g_contrast = g @ contrast
        v_inverse_g_contrast = _chol_solve(v_cholesky, g_contrast)
    except (np.linalg.LinAlgError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "conditional reconstruction covariance is not positive definite"
        ) from exc
    fixed_mean = alpha + beta * time_tau
    movement_mean = float(
        contrast @ fixed_mean + g_contrast @ v_inverse_residual
    )
    movement_variance = float(
        contrast @ (g_contrast - g @ v_inverse_g_contrast)
    )
    u_y_covariance = sigma_u**2 * projection @ incidence.T
    prior_u_movement = u_y_covariance @ contrast
    cross_covariance = prior_u_movement - u_y_covariance @ v_inverse_g_contrast
    joint_mean = np.concatenate((u_mean, np.asarray([movement_mean])))
    joint_covariance = np.empty(
        (group_count + 1, group_count + 1), dtype=np.float64
    )
    joint_covariance[:group_count, :group_count] = u_covariance
    joint_covariance[:group_count, -1] = cross_covariance
    joint_covariance[-1, :group_count] = cross_covariance
    joint_covariance[-1, -1] = movement_variance
    joint_covariance = 0.5 * (joint_covariance + joint_covariance.T)
    if (
        not np.all(np.isfinite(joint_mean))
        or not np.all(np.isfinite(joint_covariance))
        or movement_variance <= 0.0
        or np.min(np.linalg.eigvalsh(joint_covariance)) < -1e-10
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "conditional joint reconstruction is invalid"
        )
    return VbdGroupEffectConditionalReconstruction(
        u_mean=np.asarray(u_mean, dtype=np.float64),
        u_covariance=np.asarray(u_covariance, dtype=np.float64),
        movement_mean=movement_mean,
        movement_variance=movement_variance,
        joint_mean=np.asarray(joint_mean, dtype=np.float64),
        joint_covariance=np.asarray(joint_covariance, dtype=np.float64),
    )


def summarize_vbd_conditional_normal_mixture(
    quantity_name: str,
    component_means: object,
    component_variances: object,
) -> VbdConditionalNormalMixtureSummary:
    """Summarize one equal-weight mixture and retain five chain-aware channels."""

    means = np.asarray(component_means)
    variances = np.asarray(component_variances)
    if (
        type(quantity_name) is not str
        or not quantity_name
        or means.ndim != 2
        or variances.ndim != 2
        or means.shape != variances.shape
        or means.dtype.kind not in "fiu"
        or variances.dtype.kind not in "fiu"
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "conditional mixture chain grid is malformed"
        )
    means = np.asarray(means, dtype=np.float64)
    variances = np.asarray(variances, dtype=np.float64)
    if (
        means.shape[0] < 2
        or means.shape[1] < 2
        or not np.all(np.isfinite(means))
        or not np.all(np.isfinite(variances))
        or np.any(variances <= 0.0)
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "conditional mixture components are invalid"
        )
    flat_means = means.reshape(-1)
    flat_variances = variances.reshape(-1)
    try:
        summary = summarize_conditional_normal_mixture_v2(
            quantity_name,
            np.ones(len(flat_means), dtype=np.float64),
            flat_means,
            flat_variances,
        )
    except (TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "conditional mixture summary is invalid"
        ) from exc
    channels: dict[str, np.ndarray] = {"conditional_mean": means.copy()}
    endpoints = (
        ("interval_80_lower_endpoint_influence", 0.10, summary.interval_80_lower),
        ("interval_80_upper_endpoint_influence", 0.90, summary.interval_80_upper),
        ("interval_99_lower_endpoint_influence", 0.005, summary.interval_99_lower),
        ("interval_99_upper_endpoint_influence", 0.995, summary.interval_99_upper),
    )
    standard_deviations = np.sqrt(flat_variances)
    for channel_name, probability, endpoint in endpoints:
        standardized = (endpoint - flat_means) / standard_deviations
        component_cdf = ndtr(standardized)
        component_density = np.exp(-0.5 * standardized**2) / (
            math.sqrt(2.0 * math.pi) * standard_deviations
        )
        mixture_density = float(np.mean(component_density))
        if not math.isfinite(mixture_density) or mixture_density <= 0.0:
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "conditional mixture endpoint density is invalid"
            )
        influence = (probability - component_cdf) / mixture_density
        if not np.all(np.isfinite(influence)):
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "conditional mixture endpoint influence is invalid"
            )
        channels[channel_name] = influence.reshape(means.shape)
    return VbdConditionalNormalMixtureSummary(summary=summary, channels=channels)


def chain_diagnostics_for_vbd_conditional_normal_mixture(
    mixture: VbdConditionalNormalMixtureSummary,
) -> list[dict]:
    """Diagnose five chain-shaped channels without treating components as draws."""

    if (
        type(mixture) is not VbdConditionalNormalMixtureSummary
        or type(mixture.summary) is not TrajectoryPosteriorSummary
        or type(mixture.channels) is not dict
        or tuple(mixture.channels)
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER
        or type(mixture.summary.posterior_sd) is not float
        or not math.isfinite(mixture.summary.posterior_sd)
        or mixture.summary.posterior_sd <= 0.0
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "conditional mixture diagnostics are malformed"
        )
    rows = []
    expected_shape = None
    for channel_name, raw_channel in mixture.channels.items():
        channel = np.asarray(raw_channel)
        if (
            channel.dtype.kind not in "fiu"
            or channel.ndim != 2
            or channel.shape[0]
            != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_COUNT
            or channel.shape[1] < 2
            or not np.all(np.isfinite(channel))
            or (expected_shape is not None and channel.shape != expected_shape)
        ):
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "conditional mixture channel grid is malformed"
            )
        expected_shape = channel.shape
        chain_grid = np.asarray(channel, dtype=np.float64)
        try:
            raw_values = (
                az.rhat(chain_grid),
                az.ess(chain_grid, method="bulk"),
                az.ess(chain_grid, method="tail", prob=(0.05, 0.95)),
                az.mcse(chain_grid, method="mean"),
            )
        except Exception as exc:
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "conditional mixture channel diagnostics are unavailable"
            ) from exc
        values = []
        for raw_value in raw_values:
            array = np.asarray(raw_value)
            if array.shape != ():
                raise VbdTrajectoryGroupEffectMarginalizationError(
                    "conditional mixture channel diagnostic is not scalar"
                )
            value = float(array)
            if not math.isfinite(value):
                raise VbdTrajectoryGroupEffectMarginalizationError(
                    "conditional mixture channel diagnostic is nonfinite"
                )
            values.append(value)
        r_hat, bulk_ess, tail_ess, mean_mcse = values
        ratio = mean_mcse / mixture.summary.posterior_sd
        if (
            r_hat <= 0.0
            or bulk_ess < 0.0
            or tail_ess < 0.0
            or mean_mcse < 0.0
            or not math.isfinite(ratio)
        ):
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "conditional mixture channel diagnostic is invalid"
            )
        rows.append(
            {
                "channel_name": channel_name,
                "r_hat": r_hat,
                "bulk_ess": bulk_ess,
                "tail_ess": tail_ess,
                "mean_mcse_to_posterior_sd_ratio": ratio,
            }
        )
    return rows


def _project_vbd_reconstructed_quantity(
    quantity_name: str,
    component_means: object,
    component_variances: object,
) -> VbdReconstructedQuantityProjection:
    """Commit and sanitize one exact 4-by-20,000 conditional component grid."""

    means = np.asarray(component_means)
    variances = np.asarray(component_variances)
    if (
        type(quantity_name) is not str
        or not quantity_name
        or means.dtype != np.dtype(np.float64)
        or variances.dtype != np.dtype(np.float64)
        or means.shape != (4, 20_000)
        or variances.shape != (4, 20_000)
        or not means.flags.c_contiguous
        or not variances.flags.c_contiguous
        or not np.all(np.isfinite(means))
        or not np.all(np.isfinite(variances))
        or np.any(variances <= 0.0)
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "reconstructed component grid is not exact chain-major binary64"
        )
    means_commitment = _component_array_commitment("component_means", means)
    variances_commitment = _component_array_commitment(
        "component_variances", variances
    )
    grid_body = {
        "algorithm": "vbd_conditional_normal_component_grid_v1",
        "quantity_name": quantity_name,
        "shape": [4, 20_000],
        "component_count": 80_000,
        "dtype": "float64-le",
        "order": "chain_major_c",
        "component_means_commitment": means_commitment,
        "component_variances_commitment": variances_commitment,
    }
    mixture = summarize_vbd_conditional_normal_mixture(
        quantity_name, means, variances
    )
    rows = chain_diagnostics_for_vbd_conditional_normal_mixture(mixture)
    projection = object.__new__(VbdReconstructedQuantityProjection)
    values = {
        "summary": mixture.summary,
        "channel_diagnostic_rows": tuple(dict(row) for row in rows),
        "component_grid_shape": (4, 20_000),
        "component_count": 80_000,
        "component_means_commitment": means_commitment,
        "component_variances_commitment": variances_commitment,
        "component_grid_commitment": sha256_json(grid_body),
        "conditional_components_emitted": False,
        "pseudo_draws_emitted": False,
        "conditional_mean_substitution": False,
    }
    for name, value in values.items():
        object.__setattr__(projection, name, value)
    return projection


def project_vbd_sampled_parameter(
    parameter_name: str,
    posterior_values: object,
) -> VbdSampledParameterProjection:
    """Derive one sanitized sampled-parameter row from its exact posterior grid."""

    if parameter_name not in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "sampled parameter name is off plan"
        )
    values = np.asarray(posterior_values)
    if (
        values.dtype != np.dtype(np.float64)
        or values.shape != (4, 20_000)
        or not values.flags.c_contiguous
        or not np.all(np.isfinite(values))
        or (parameter_name in ("sigma_u", "sigma_r") and np.any(values <= 0.0))
        or (
            parameter_name == "rho"
            and np.any(np.abs(values) >= VBD_TRAJECTORY_RHO_ABS_BOUND)
        )
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "sampled posterior grid is outside exact support"
        )
    flattened = values.reshape(-1)
    try:
        summary = summarize_weighted_support(
            parameter_name,
            flattened,
            np.ones(80_000, dtype=np.float64),
            np.arange(80_000, dtype=np.int64),
        )
        diagnostics = {
            "r_hat": az.rhat(values),
            "bulk_ess": az.ess(values, method="bulk"),
            "tail_ess": az.ess(
                values, method="tail", prob=(0.05, 0.95)
            ),
            "mean": az.mcse(values, method="mean"),
            "q10": az.mcse(values, method="quantile", prob=0.10),
            "q90": az.mcse(values, method="quantile", prob=0.90),
            "q005": az.mcse(values, method="quantile", prob=0.005),
            "q995": az.mcse(values, method="quantile", prob=0.995),
        }
    except Exception as exc:
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "sampled posterior projection failed"
        ) from exc
    scalar = {}
    for name, raw in diagnostics.items():
        array = np.asarray(raw)
        if array.shape != () or not math.isfinite(float(array)):
            raise VbdTrajectoryGroupEffectMarginalizationError(
                "sampled posterior diagnostic is invalid"
            )
        scalar[name] = float(array)
    ratios = {
        name: scalar[key] / summary.posterior_sd
        for name, key in (
            ("posterior_mean_mcse_to_posterior_sd_ratio", "mean"),
            ("interval_80_lower_endpoint_mcse_to_posterior_sd_ratio", "q10"),
            ("interval_80_upper_endpoint_mcse_to_posterior_sd_ratio", "q90"),
            ("interval_99_lower_endpoint_mcse_to_posterior_sd_ratio", "q005"),
            ("interval_99_upper_endpoint_mcse_to_posterior_sd_ratio", "q995"),
        )
    }
    if (
        scalar["r_hat"] <= 0.0
        or scalar["bulk_ess"] < 0.0
        or scalar["tail_ess"] < 0.0
        or any(not math.isfinite(value) or value < 0.0 for value in ratios.values())
    ):
        raise VbdTrajectoryGroupEffectMarginalizationError(
            "sampled posterior diagnostics are invalid"
        )
    projection = object.__new__(VbdSampledParameterProjection)
    for name, value in {
        "summary": summary,
        "diagnostic_row": {
            "parameter_name": parameter_name,
            "r_hat": scalar["r_hat"],
            "bulk_ess": scalar["bulk_ess"],
            "tail_ess": scalar["tail_ess"],
            **ratios,
        },
        "posterior_grid_shape": (4, 20_000),
        "posterior_value_count": 80_000,
        "posterior_grid_commitment": _posterior_grid_commitment(
            parameter_name, values
        ),
    }.items():
        object.__setattr__(projection, name, value)
    return projection


def project_vbd_group_effect_marginalization_posterior(
    prepared: object,
    *,
    expected_model_input_hash: str,
    expected_prepared_input_hash: str,
    posterior: object,
) -> VbdGroupEffectMarginalizationPosteriorProjection:
    """Project one exact posterior container and reconstruct from aligned draws."""

    validate_vbd_group_effect_marginalization_prepared_target(
        prepared,
        expected_model_input_hash=expected_model_input_hash,
        expected_prepared_input_hash=expected_prepared_input_hash,
    )
    grids = canonical_vbd_group_effect_marginalization_posterior_grids(posterior)
    sampled = tuple(
        project_vbd_sampled_parameter(name, grids[name])
        for name in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER
    )
    posterior_root_body = {
        "algorithm": "vbd_group_effect_marginalization_posterior_grid_set_v1",
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "variable_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER
        ),
        "ordered_grid_commitments": [
            projection.posterior_grid_commitment for projection in sampled
        ],
        "chain_count": 4,
        "draw_count": 20_000,
    }
    posterior_root = sha256_json(posterior_root_body)
    group_count = prepared.panel_group_count
    quantity_count = group_count + 1
    means = np.empty((quantity_count, 4, 20_000), dtype=np.float64)
    variances = np.empty_like(means)
    names = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER
    for chain in range(4):
        for draw in range(20_000):
            point = {name: float(grids[name][chain, draw]) for name in names}
            conditional = conditional_vbd_group_effect_reconstruction(
                prepared,
                expected_model_input_hash=expected_model_input_hash,
                expected_prepared_input_hash=expected_prepared_input_hash,
                **point,
            )
            if (
                type(conditional) is not VbdGroupEffectConditionalReconstruction
                or type(conditional.u_mean) is not np.ndarray
                or conditional.u_mean.shape != (group_count,)
                or type(conditional.u_covariance) is not np.ndarray
                or conditional.u_covariance.shape != (group_count, group_count)
                or type(conditional.joint_mean) is not np.ndarray
                or conditional.joint_mean.shape != (quantity_count,)
                or type(conditional.joint_covariance) is not np.ndarray
                or conditional.joint_covariance.shape != (quantity_count, quantity_count)
                or not np.array_equal(
                    conditional.joint_mean[:-1], conditional.u_mean
                )
                or conditional.joint_mean[-1] != conditional.movement_mean
                or not np.array_equal(
                    conditional.joint_covariance[:-1, :-1],
                    conditional.u_covariance,
                )
                or conditional.joint_covariance[-1, -1]
                != conditional.movement_variance
                or not np.allclose(conditional.u_mean.sum(), 0.0, rtol=0.0, atol=2e-12)
                or not np.allclose(
                    conditional.u_covariance.sum(axis=0), 0.0, rtol=0.0, atol=2e-12
                )
                or not np.allclose(
                    conditional.u_covariance.sum(axis=1), 0.0, rtol=0.0, atol=2e-12
                )
            ):
                raise VbdTrajectoryGroupEffectMarginalizationError(
                    "joint conditional reconstruction semantics are invalid"
                )
            means[:group_count, chain, draw] = conditional.u_mean
            variances[:group_count, chain, draw] = np.diag(
                conditional.u_covariance
            )
            means[-1, chain, draw] = conditional.movement_mean
            variances[-1, chain, draw] = conditional.movement_variance
    quantity_names = (
        *(f"u[{index}]" for index in range(group_count)),
        "trajectory_movement",
    )
    reconstructed = tuple(
        _project_vbd_reconstructed_quantity(
            name,
            np.ascontiguousarray(means[index]),
            np.ascontiguousarray(variances[index]),
        )
        for index, name in enumerate(quantity_names)
    )
    reconstruction_root = sha256_json(
        {
            "algorithm": "vbd_group_effect_joint_conditional_reconstruction_v1",
            "posterior_grid_set_commitment": posterior_root,
            "prepared_input_hash": prepared.prepared_input_hash,
            "model_input_hash": prepared.model_input_hash,
            "quantity_order": list(quantity_names),
            "ordered_component_grid_commitments": [
                projection.component_grid_commitment
                for projection in reconstructed
            ],
            "joint_zero_sum_covariance_preserved": True,
            "conditional_mean_substitution": False,
            "pseudo_draws_emitted": False,
        }
    )
    projection = object.__new__(VbdGroupEffectMarginalizationPosteriorProjection)
    for name, value in {
        "lane": prepared.lane,
        "panel_group_count": prepared.panel_group_count,
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "posterior_grid_set_commitment": posterior_root,
        "sampled_parameter_projections": sampled,
        "reconstructed_quantity_projections": reconstructed,
        "reconstruction_provenance_root": reconstruction_root,
    }.items():
        object.__setattr__(projection, name, value)
    return projection
