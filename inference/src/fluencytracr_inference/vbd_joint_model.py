"""PyMC reference model for the aggregate VBD joint synthetic proof."""

from __future__ import annotations

from dataclasses import dataclass
import math
import time
from typing import Literal

import arviz as az
import numpy as np
import pymc as pm
import pytensor.tensor as pt
from scipy.special import logsumexp

from .hashing import sha256_json
from .vbd_joint_preparation import (
    PreparedVBDJointData,
    validate_prepared_vbd_joint_data,
)
from .vbd_joint_types import (
    VBD_JOINT_CAPABILITY_INNOVATION_SCALE_PRIOR_SD,
    VBD_JOINT_ELIGIBLE_FAMILIES,
    VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
    VBD_JOINT_FULL_CHAINS,
    VBD_JOINT_FULL_DRAWS,
    VBD_JOINT_FULL_ESS_MIN,
    VBD_JOINT_FULL_MAX_TREEDEPTH,
    VBD_JOINT_FULL_RHAT_MAX,
    VBD_JOINT_FULL_TARGET_ACCEPT,
    VBD_JOINT_FULL_TUNE,
    VBD_JOINT_GROUP_SCALE_PRIOR_SD,
    VBD_JOINT_INTERCEPT_PRIOR_SD,
    VBD_JOINT_INTERVAL_LOWER,
    VBD_JOINT_INTERVAL_UPPER,
    VBD_JOINT_NULL_SEED,
    VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
    VBD_JOINT_PANEL_COUNT,
    VBD_JOINT_PRIMARY_SEED,
    VBD_JOINT_RESIDUAL_SCALE_PRIOR_SD,
    VBD_JOINT_RHO_ABS_BOUND,
    VBD_JOINT_SMOKE_CHAINS,
    VBD_JOINT_SMOKE_DRAWS,
    VBD_JOINT_SMOKE_MAX_TREEDEPTH,
    VBD_JOINT_SMOKE_TARGET_ACCEPT,
    VBD_JOINT_SMOKE_TUNE,
    VBD_JOINT_WINDOW_COUNT,
    VBDJointStructureError,
)


VBDJointFitMode = Literal["smoke", "full"]
VBDJointModelVariant = Literal["full", "restricted"]

_BEHAVIOR_COEFFICIENTS = (
    "capability_retention",
    "capability_embedding",
    "capability_active_nonembedded",
)
_SHARED_OUTCOME_COEFFICIENTS = (
    "outcome_capability",
    "outcome_time",
    "control_seasonality_index",
    "control_customer_demand_index",
)
_FULL_OUTCOME_COEFFICIENTS = (
    "outcome_embedded",
    "outcome_active_nonembedded",
    "outcome_capability_by_embedded",
)
_BASE_DIAGNOSTIC_PARAMETERS = (
    "capability_intercept",
    "capability_panel_scale",
    "capability_panel_raw",
    "capability_time",
    "capability_post",
    "capability_innovation_scale",
    "capability_innovation_raw",
    "retention_intercept",
    "embedding_intercept",
    "active_nonembedded_intercept",
    *_BEHAVIOR_COEFFICIENTS,
    "retention_time",
    "retention_post",
    "embedding_time",
    "embedding_post",
    "active_nonembedded_time",
    "active_nonembedded_post",
    "retention_panel_scale",
    "retention_panel_raw",
    "embedding_panel_scale",
    "embedding_panel_raw",
    "active_nonembedded_panel_scale",
    "active_nonembedded_panel_raw",
    "outcome_intercept",
    "outcome_panel_scale",
    "outcome_panel_raw",
    *_SHARED_OUTCOME_COEFFICIENTS,
    "residual_scale",
    "rho",
)


def vbd_joint_diagnostic_parameter_names(
    variant: VBDJointModelVariant,
) -> tuple[str, ...]:
    if variant == "full":
        return (*_BASE_DIAGNOSTIC_PARAMETERS, *_FULL_OUTCOME_COEFFICIENTS)
    if variant == "restricted":
        return _BASE_DIAGNOSTIC_PARAMETERS
    raise VBDJointStructureError("model variant must be full or restricted")


@dataclass(frozen=True)
class VBDJointSamplerSettings:
    mode: VBDJointFitMode
    chains: int
    draws: int
    tune: int
    target_accept: float
    max_treedepth: int

    @property
    def qualifying_settings(self) -> bool:
        return (
            self.mode == "full"
            and self.chains == VBD_JOINT_FULL_CHAINS
            and self.draws == VBD_JOINT_FULL_DRAWS
            and self.tune == VBD_JOINT_FULL_TUNE
            and self.target_accept == VBD_JOINT_FULL_TARGET_ACCEPT
            and self.max_treedepth == VBD_JOINT_FULL_MAX_TREEDEPTH
        )

    def to_dict(self) -> dict:
        return {
            "mode": self.mode,
            "chains": self.chains,
            "draws": self.draws,
            "tune": self.tune,
            "target_accept": self.target_accept,
            "max_treedepth": self.max_treedepth,
            "qualifying_settings": self.qualifying_settings,
        }


@dataclass(frozen=True)
class VBDJointCoefficientSummary:
    coefficient_name: str
    posterior_mean: float
    posterior_sd: float
    interval_80_lower: float
    interval_80_upper: float

    def to_dict(self) -> dict:
        return {
            "coefficient_name": self.coefficient_name,
            "posterior_mean": self.posterior_mean,
            "posterior_sd": self.posterior_sd,
            "interval_80": {
                "lower": self.interval_80_lower,
                "upper": self.interval_80_upper,
            },
        }


@dataclass
class VBDJointFit:
    idata: object
    prepared: PreparedVBDJointData
    variant: VBDJointModelVariant
    settings: VBDJointSamplerSettings
    seed: int
    coefficient_summaries: tuple[VBDJointCoefficientSummary, ...]
    diagnostics: dict
    bayesian_r_squared_mean: float
    future_window_rmse: float
    future_window_log_score: float
    wall_time_seconds: float

    def summary_by_name(self) -> dict[str, VBDJointCoefficientSummary]:
        return {item.coefficient_name: item for item in self.coefficient_summaries}

    def fit_summary_hash(self) -> str:
        return sha256_json(
            {
                "prepared_input_hash": self.prepared.prepared_input_hash,
                "variant": self.variant,
                "settings": self.settings.to_dict(),
                "seed": self.seed,
                "coefficient_summaries": [
                    item.to_dict() for item in self.coefficient_summaries
                ],
                "diagnostics": self.diagnostics,
                "bayesian_r_squared_mean": self.bayesian_r_squared_mean,
                "future_window_rmse": self.future_window_rmse,
                "future_window_log_score": self.future_window_log_score,
                "raw_posterior_draws_emitted": False,
                "latent_paths_emitted": False,
            }
        )


def vbd_joint_sampler_settings(mode: VBDJointFitMode) -> VBDJointSamplerSettings:
    if mode == "smoke":
        return VBDJointSamplerSettings(
            mode="smoke",
            chains=VBD_JOINT_SMOKE_CHAINS,
            draws=VBD_JOINT_SMOKE_DRAWS,
            tune=VBD_JOINT_SMOKE_TUNE,
            target_accept=VBD_JOINT_SMOKE_TARGET_ACCEPT,
            max_treedepth=VBD_JOINT_SMOKE_MAX_TREEDEPTH,
        )
    if mode == "full":
        return VBDJointSamplerSettings(
            mode="full",
            chains=VBD_JOINT_FULL_CHAINS,
            draws=VBD_JOINT_FULL_DRAWS,
            tune=VBD_JOINT_FULL_TUNE,
            target_accept=VBD_JOINT_FULL_TARGET_ACCEPT,
            max_treedepth=VBD_JOINT_FULL_MAX_TREEDEPTH,
        )
    raise VBDJointStructureError("fit mode must be smoke or full")


def _centered_panel_effect(name: str) -> pt.TensorVariable:
    scale = pm.HalfNormal(f"{name}_scale", sigma=VBD_JOINT_GROUP_SCALE_PRIOR_SD)
    raw = pm.Normal(f"{name}_raw", mu=0.0, sigma=1.0, shape=VBD_JOINT_PANEL_COUNT)
    return pm.Deterministic(name, scale * (raw - pt.mean(raw)))


def build_vbd_joint_model(
    prepared: PreparedVBDJointData,
    *,
    variant: VBDJointModelVariant,
) -> pm.Model:
    """Build the frozen full or no-behavior restricted model."""

    validate_prepared_vbd_joint_data(prepared)
    if variant not in ("full", "restricted"):
        raise VBDJointStructureError("model variant must be full or restricted")
    panel = prepared.panel_index
    cap_lag_index = prepared.lagged_capability_index
    behavior_training = prepared.training_mask
    capability_training = ~prepared.capability_evaluation
    with pm.Model() as model:
        capability_intercept = pm.Normal(
            "capability_intercept", mu=0.0, sigma=VBD_JOINT_INTERCEPT_PRIOR_SD
        )
        capability_panel = _centered_panel_effect("capability_panel")
        capability_time = pm.Normal(
            "capability_time", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        capability_post = pm.Normal(
            "capability_post", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        capability_innovation_scale = pm.HalfNormal(
            "capability_innovation_scale",
            sigma=VBD_JOINT_CAPABILITY_INNOVATION_SCALE_PRIOR_SD,
        )
        capability_innovation_raw = pm.Normal(
            "capability_innovation_raw",
            mu=0.0,
            sigma=1.0,
            shape=(VBD_JOINT_PANEL_COUNT, VBD_JOINT_WINDOW_COUNT),
        )
        capability_innovation = pm.Deterministic(
            "capability_innovation",
            capability_innovation_scale * capability_innovation_raw,
        )
        capability_latent = pm.Deterministic(
            "capability_latent",
            capability_intercept
            + capability_panel[prepared.capability_panel_index]
            + capability_time * prepared.capability_time_scaled
            + capability_post * prepared.capability_post
            + capability_innovation[
                prepared.capability_panel_index,
                prepared.capability_checkpoint_index,
            ],
        )
        pm.Normal(
            "capability_observed",
            mu=capability_latent[capability_training],
            sigma=prepared.capability_standard_error[capability_training],
            observed=prepared.capability_observed[capability_training],
        )
        lagged_capability = capability_latent[cap_lag_index]

        retention_intercept = pm.Normal(
            "retention_intercept", mu=0.0, sigma=VBD_JOINT_INTERCEPT_PRIOR_SD
        )
        embedding_intercept = pm.Normal(
            "embedding_intercept", mu=0.0, sigma=VBD_JOINT_INTERCEPT_PRIOR_SD
        )
        active_intercept = pm.Normal(
            "active_nonembedded_intercept",
            mu=0.0,
            sigma=VBD_JOINT_INTERCEPT_PRIOR_SD,
        )
        capability_retention = pm.Normal(
            "capability_retention", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        capability_embedding = pm.Normal(
            "capability_embedding", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        capability_active = pm.Normal(
            "capability_active_nonembedded",
            mu=0.0,
            sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
        )
        retention_time = pm.Normal(
            "retention_time", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        retention_post = pm.Normal(
            "retention_post", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        embedding_time = pm.Normal(
            "embedding_time", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        embedding_post = pm.Normal(
            "embedding_post", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        active_time = pm.Normal(
            "active_nonembedded_time",
            mu=0.0,
            sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
        )
        active_post = pm.Normal(
            "active_nonembedded_post",
            mu=0.0,
            sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
        )
        retention_panel = _centered_panel_effect("retention_panel")
        embedding_panel = _centered_panel_effect("embedding_panel")
        active_panel = _centered_panel_effect("active_nonembedded_panel")
        retention_probability = pm.Deterministic(
            "retention_probability",
            pm.math.sigmoid(
                retention_intercept
                + retention_panel[panel]
                + capability_retention * lagged_capability
                + retention_time * prepared.time_scaled
                + retention_post * prepared.post
            ),
        )
        embedding_probability = pm.Deterministic(
            "embedding_probability",
            pm.math.sigmoid(
                embedding_intercept
                + embedding_panel[panel]
                + capability_embedding * lagged_capability
                + embedding_time * prepared.time_scaled
                + embedding_post * prepared.post
            ),
        )
        active_probability = pm.Deterministic(
            "active_nonembedded_probability",
            pm.math.sigmoid(
                active_intercept
                + active_panel[panel]
                + capability_active * lagged_capability
                + active_time * prepared.time_scaled
                + active_post * prepared.post
            ),
        )
        pm.Binomial(
            "retained_count",
            n=prepared.retention_trials[behavior_training],
            p=retention_probability[behavior_training],
            observed=prepared.retained_count[behavior_training],
        )
        pm.Binomial(
            "newly_embedded_count",
            n=prepared.embedding_trials[behavior_training],
            p=embedding_probability[behavior_training],
            observed=prepared.newly_embedded_count[behavior_training],
        )
        pm.Binomial(
            "active_nonembedded_count",
            n=prepared.active_nonembedded_trials[behavior_training],
            p=active_probability[behavior_training],
            observed=prepared.active_nonembedded_count[behavior_training],
        )
        current_embedded_values = []
        current_active_values = []
        lagged_embedded_values = []
        lagged_active_values = []
        rows_per_panel = prepared.row_count // VBD_JOINT_PANEL_COUNT
        for panel_index in range(VBD_JOINT_PANEL_COUNT):
            panel_start = panel_index * rows_per_panel
            previous_embedded = prepared.previous_embedded_observed_share[panel_start]
            previous_active = prepared.previous_active_nonembedded_observed_share[
                panel_start
            ]
            previous_modeled_embedded = None
            previous_modeled_active = None
            for offset in range(rows_per_panel):
                row = panel_start + offset
                lagged_embedded_values.append(
                    previous_embedded
                    if previous_modeled_embedded is None
                    else previous_modeled_embedded
                )
                lagged_active_values.append(
                    previous_active
                    if previous_modeled_active is None
                    else previous_modeled_active
                )
                if prepared.evaluation[row]:
                    state_origin = previous_modeled_embedded
                else:
                    state_origin = prepared.previous_embedded_observed_share[row]
                current_embedded = (
                    state_origin * retention_probability[row]
                    + (1.0 - state_origin) * embedding_probability[row]
                )
                current_active = active_probability[row] * (1.0 - current_embedded)
                current_embedded_values.append(current_embedded)
                current_active_values.append(current_active)
                previous_modeled_embedded = current_embedded
                previous_modeled_active = current_active
        current_embedded_state = pm.Deterministic(
            "embedded_state", pt.stack(current_embedded_values)
        )
        current_active_state = pm.Deterministic(
            "active_nonembedded_state", pt.stack(current_active_values)
        )
        lagged_embedded_state = pt.stack(lagged_embedded_values)
        lagged_active_state = pt.stack(lagged_active_values)

        outcome_intercept = pm.Normal(
            "outcome_intercept", mu=0.0, sigma=VBD_JOINT_INTERCEPT_PRIOR_SD
        )
        outcome_panel = _centered_panel_effect("outcome_panel")
        outcome_capability = pm.Normal(
            "outcome_capability", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        outcome_time = pm.Normal(
            "outcome_time", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
        )
        control_seasonality = pm.Normal(
            "control_seasonality_index",
            mu=0.0,
            sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
        )
        control_demand = pm.Normal(
            "control_customer_demand_index",
            mu=0.0,
            sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
        )
        outcome_mean = (
            outcome_intercept
            + outcome_panel[panel]
            + outcome_capability * lagged_capability
            + outcome_time * prepared.time_scaled
            + control_seasonality * prepared.control_matrix[:, 0]
            + control_demand * prepared.control_matrix[:, 1]
        )
        if variant == "full":
            outcome_embedded = pm.Normal(
                "outcome_embedded", mu=0.0, sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD
            )
            outcome_active = pm.Normal(
                "outcome_active_nonembedded",
                mu=0.0,
                sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
            )
            outcome_interaction = pm.Normal(
                "outcome_capability_by_embedded",
                mu=0.0,
                sigma=VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
            )
            outcome_mean = (
                outcome_mean
                + outcome_embedded * lagged_embedded_state
                + outcome_active * lagged_active_state
                + outcome_interaction * lagged_capability * lagged_embedded_state
            )
        outcome_mean = pm.Deterministic("outcome_mean", outcome_mean)
        residual_scale = pm.HalfNormal(
            "residual_scale", sigma=VBD_JOINT_RESIDUAL_SCALE_PRIOR_SD
        )
        rho = pm.Uniform(
            "rho", lower=-VBD_JOINT_RHO_ABS_BOUND, upper=VBD_JOINT_RHO_ABS_BOUND
        )
        training_mask = prepared.training_mask
        for panel_index in range(VBD_JOINT_PANEL_COUNT):
            rows = np.flatnonzero((panel == panel_index) & training_mask)
            lags = np.abs(np.subtract.outer(np.arange(rows.size), np.arange(rows.size)))
            covariance = (
                residual_scale**2
                / (1.0 - rho**2)
                * pt.power(rho, lags)
                + pt.diag(prepared.outcome_standard_error[rows] ** 2)
            )
            pm.MvNormal(
                f"outcome_observed_panel_{panel_index}",
                mu=outcome_mean[rows],
                cov=covariance,
                observed=prepared.observed_outcome[rows],
            )
    return model


def _scalar_summary(idata, name: str) -> VBDJointCoefficientSummary:
    values = np.asarray(idata.posterior[name], dtype=float).reshape(-1)
    lower, upper = np.quantile(values, [VBD_JOINT_INTERVAL_LOWER, VBD_JOINT_INTERVAL_UPPER])
    return VBDJointCoefficientSummary(
        coefficient_name=name,
        posterior_mean=float(values.mean()),
        posterior_sd=float(values.std(ddof=1)),
        interval_80_lower=float(lower),
        interval_80_upper=float(upper),
    )


def _dataset_values(tree) -> np.ndarray:
    values = []
    for name in tree.data_vars:
        values.extend(np.asarray(tree[name], dtype=float).reshape(-1).tolist())
    return np.asarray(values, dtype=float)


def _sampler_diagnostics(idata, settings: VBDJointSamplerSettings) -> dict:
    variant = "full" if "outcome_embedded" in idata.posterior else "restricted"
    parameter_names = list(vbd_joint_diagnostic_parameter_names(variant))
    rhat = _dataset_values(az.rhat(idata, var_names=parameter_names))
    bulk_ess = _dataset_values(az.ess(idata, var_names=parameter_names, method="bulk"))
    tail_ess = _dataset_values(az.ess(idata, var_names=parameter_names, method="tail"))
    sample_stats_valid = True
    try:
        diverging_values = np.asarray(
            idata.sample_stats["diverging"], dtype=float
        )
        sample_stats_valid = (
            diverging_values.size > 0
            and np.isfinite(diverging_values).all()
            and np.isin(diverging_values, (0.0, 1.0)).all()
        )
    except (KeyError, TypeError, ValueError):
        diverging_values = np.asarray([], dtype=float)
        sample_stats_valid = False
    divergences = int(diverging_values.sum()) if sample_stats_valid else 0
    reached_max = 0
    if "reached_max_treedepth" in idata.sample_stats:
        try:
            reached_values = np.asarray(
                idata.sample_stats["reached_max_treedepth"], dtype=float
            )
            reached_valid = (
                reached_values.size > 0
                and np.isfinite(reached_values).all()
                and np.isin(reached_values, (0.0, 1.0)).all()
            )
        except (TypeError, ValueError):
            reached_values = np.asarray([], dtype=float)
            reached_valid = False
        sample_stats_valid = sample_stats_valid and reached_valid
        reached_max = int(reached_values.sum()) if reached_valid else 0
    elif "tree_depth" in idata.sample_stats:
        try:
            tree_depth_values = np.asarray(
                idata.sample_stats["tree_depth"], dtype=float
            )
            tree_depth_valid = (
                tree_depth_values.size > 0
                and np.isfinite(tree_depth_values).all()
                and (tree_depth_values >= 0.0).all()
                and np.equal(tree_depth_values, np.floor(tree_depth_values)).all()
            )
        except (TypeError, ValueError):
            tree_depth_values = np.asarray([], dtype=float)
            tree_depth_valid = False
        sample_stats_valid = sample_stats_valid and tree_depth_valid
        reached_max = int(
            (tree_depth_values >= settings.max_treedepth).sum()
        ) if tree_depth_valid else 0
    else:
        sample_stats_valid = False
    failures = []
    if not settings.qualifying_settings:
        failures.append("smoke_settings_nonqualifying")
    if divergences:
        failures.append("divergences")
    if reached_max:
        failures.append("max_treedepth")
    diagnostic_arrays = (rhat, bulk_ess, tail_ess)
    if (
        not sample_stats_valid
        or any(values.size == 0 or not np.isfinite(values).all() for values in diagnostic_arrays)
    ):
        failures.append("summary_nonfinite")
        return {
            "state": "HOLD",
            "failing_diagnostics": sorted(set(failures)),
            "max_r_hat": VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
            "min_bulk_ess": VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
            "min_tail_ess": VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL,
            "divergence_count": divergences,
            "max_treedepth_count": reached_max,
            "full_run_required_for_qualification": True,
        }
    if float(np.max(rhat)) > VBD_JOINT_FULL_RHAT_MAX:
        failures.append("r_hat")
    if float(np.min(bulk_ess)) < VBD_JOINT_FULL_ESS_MIN:
        failures.append("bulk_ess")
    if float(np.min(tail_ess)) < VBD_JOINT_FULL_ESS_MIN:
        failures.append("tail_ess")
    return {
        "state": "PASS" if not failures else "HOLD",
        "failing_diagnostics": sorted(set(failures)),
        "max_r_hat": float(np.max(rhat)),
        "min_bulk_ess": float(np.min(bulk_ess)),
        "min_tail_ess": float(np.min(tail_ess)),
        "divergence_count": divergences,
        "max_treedepth_count": reached_max,
        "full_run_required_for_qualification": True,
    }


def _predictive_summaries(idata, prepared: PreparedVBDJointData) -> tuple[float, float, float]:
    outcome_mean = np.asarray(idata.posterior["outcome_mean"], dtype=float)
    draws = outcome_mean.reshape(-1, prepared.row_count)
    training = prepared.training_mask
    evaluation = prepared.evaluation
    observed = prepared.observed_outcome
    variance_fit = np.var(draws[:, training], axis=1)
    variance_residual = np.var(observed[training] - draws[:, training], axis=1)
    denominator = variance_fit + variance_residual
    r_squared = np.divide(
        variance_fit,
        denominator,
        out=np.zeros_like(variance_fit),
        where=denominator > 0.0,
    )
    residual_scale = np.asarray(idata.posterior["residual_scale"], dtype=float).reshape(-1)
    rho = np.asarray(idata.posterior["rho"], dtype=float).reshape(-1)
    conditional_means = np.zeros((draws.shape[0], int(evaluation.sum())), dtype=float)
    joint_log_density = np.zeros(draws.shape[0], dtype=float)
    evaluation_cursor = 0
    for panel_index in range(VBD_JOINT_PANEL_COUNT):
        panel_rows = np.flatnonzero(prepared.panel_index == panel_index)
        training_rows = panel_rows[training[panel_rows]]
        evaluation_rows = panel_rows[evaluation[panel_rows]]
        train_positions = np.flatnonzero(training[panel_rows])
        evaluation_positions = np.flatnonzero(evaluation[panel_rows])
        lag_matrix = np.abs(
            np.subtract.outer(np.arange(panel_rows.size), np.arange(panel_rows.size))
        )
        known_variance = prepared.outcome_standard_error[panel_rows] ** 2
        for draw_index in range(draws.shape[0]):
            covariance = (
                residual_scale[draw_index] ** 2
                / (1.0 - rho[draw_index] ** 2)
                * np.power(rho[draw_index], lag_matrix)
                + np.diag(known_variance)
            )
            train_covariance = covariance[np.ix_(train_positions, train_positions)]
            future_train_covariance = covariance[
                np.ix_(evaluation_positions, train_positions)
            ]
            future_covariance = covariance[
                np.ix_(evaluation_positions, evaluation_positions)
            ]
            training_error = (
                observed[training_rows] - draws[draw_index, training_rows]
            )
            solved_error = np.linalg.solve(train_covariance, training_error)
            conditional_mean = (
                draws[draw_index, evaluation_rows]
                + future_train_covariance @ solved_error
            )
            conditional_covariance = (
                future_covariance
                - future_train_covariance
                @ np.linalg.solve(train_covariance, future_train_covariance.T)
            )
            conditional_covariance = (
                conditional_covariance + conditional_covariance.T
            ) / 2.0
            conditional_covariance += np.eye(evaluation_rows.size) * 1e-10
            sign, log_determinant = np.linalg.slogdet(conditional_covariance)
            if sign <= 0:
                raise VBDJointStructureError(
                    "conditional predictive covariance is not positive definite"
                )
            error = observed[evaluation_rows] - conditional_mean
            quadratic = float(
                error @ np.linalg.solve(conditional_covariance, error)
            )
            joint_log_density[draw_index] += -0.5 * (
                evaluation_rows.size * math.log(2.0 * math.pi)
                + log_determinant
                + quadratic
            )
            start = evaluation_cursor
            stop = start + evaluation_rows.size
            conditional_means[draw_index, start:stop] = conditional_mean
        evaluation_cursor += evaluation_rows.size
    predictive_mean = conditional_means.mean(axis=0)
    rmse = float(np.sqrt(np.mean((observed[evaluation] - predictive_mean) ** 2)))
    posterior_predictive_log_score = float(
        (logsumexp(joint_log_density) - math.log(joint_log_density.size))
        / int(evaluation.sum())
    )
    return float(r_squared.mean()), rmse, posterior_predictive_log_score


def fit_vbd_joint_model(
    prepared: PreparedVBDJointData,
    *,
    variant: VBDJointModelVariant,
    seed: int,
    mode: VBDJointFitMode = "smoke",
) -> VBDJointFit:
    """Fit one frozen variant and retain posterior state only in memory."""

    if type(prepared) is not PreparedVBDJointData:
        raise VBDJointStructureError("prepared data must use the exact frozen type")
    if prepared.source_profile != "v3":
        raise VBDJointStructureError(
            "V4 prepared data cannot use the V3 sampler path"
        )
    if type(seed) is not int or seed <= 0:
        raise VBDJointStructureError("fit seed must be a positive exact integer")
    expected_seed = (
        VBD_JOINT_PRIMARY_SEED
        if prepared.synthetic_scenario == "primary"
        else VBD_JOINT_NULL_SEED
    )
    if seed != expected_seed:
        raise VBDJointStructureError("fit seed does not bind the prepared scenario")
    settings = vbd_joint_sampler_settings(mode)
    return _fit_vbd_joint_model_with_settings(
        prepared,
        variant=variant,
        settings=settings,
        chain_seeds=tuple(seed + chain for chain in range(settings.chains)),
        summary_seed=seed,
    )


def _fit_vbd_joint_model_with_settings(
    prepared: PreparedVBDJointData,
    *,
    variant: VBDJointModelVariant,
    settings: VBDJointSamplerSettings,
    chain_seeds: tuple[int, ...],
    summary_seed: int,
) -> VBDJointFit:
    """V3 sampler path after the public entry point's exact seed binding."""

    if type(prepared) is not PreparedVBDJointData:
        raise VBDJointStructureError("prepared data must use the exact frozen type")
    if prepared.source_profile != "v3":
        raise VBDJointStructureError(
            "V4 prepared data cannot use the V3 sampler path"
        )
    if type(settings) is not VBDJointSamplerSettings:
        raise VBDJointStructureError("settings do not match the frozen V3 sampler binding")
    expected_seed = (
        VBD_JOINT_PRIMARY_SEED
        if prepared.synthetic_scenario == "primary"
        else VBD_JOINT_NULL_SEED
    )
    expected_settings = vbd_joint_sampler_settings(settings.mode)
    expected_chain_seeds = tuple(
        expected_seed + chain for chain in range(expected_settings.chains)
    )
    if (
        settings != expected_settings
        or summary_seed != expected_seed
        or chain_seeds != expected_chain_seeds
    ):
        raise VBDJointStructureError(
            "settings and seeds do not match the frozen V3 sampler binding"
        )
    model = build_vbd_joint_model(prepared, variant=variant)
    started = time.perf_counter()
    with model:
        idata = pm.sample(
            draws=settings.draws,
            tune=settings.tune,
            chains=settings.chains,
            cores=1,
            random_seed=list(chain_seeds),
            target_accept=settings.target_accept,
            max_treedepth=settings.max_treedepth,
            nuts_sampler="pymc",
            blas_cores=1,
            progressbar=False,
            compute_convergence_checks=True,
        )
    wall_time = time.perf_counter() - started
    coefficient_names = [*_BEHAVIOR_COEFFICIENTS, *_SHARED_OUTCOME_COEFFICIENTS]
    if variant == "full":
        coefficient_names.extend(_FULL_OUTCOME_COEFFICIENTS)
    summaries = tuple(_scalar_summary(idata, name) for name in coefficient_names)
    diagnostics = _sampler_diagnostics(idata, settings)
    r_squared, rmse, log_score = _predictive_summaries(idata, prepared)
    return VBDJointFit(
        idata=idata,
        prepared=prepared,
        variant=variant,
        settings=settings,
        seed=summary_seed,
        coefficient_summaries=summaries,
        diagnostics=diagnostics,
        bayesian_r_squared_mean=r_squared,
        future_window_rmse=rmse,
        future_window_log_score=log_score,
        wall_time_seconds=wall_time,
    )
