"""Hierarchical Bayesian difference-in-differences model (contract equation).

Implements exactly the implementation-grade model equation from
``docs/contracts/confidence-inference-methodology/README.md``:

    y_i ~ Normal(mu_i, se_i)                       # normal continuous path
    mu_i = alpha + beta_post * post_i + beta_treated * treated_i
         + delta * post_i * treated_i
         + u_expectation_path[...] + u_workflow[...] + u_function[...]
         + u_cohort[...] + u_organization[...]

- The estimand is ``delta``; the PyMC variable is named
  ``contribution_alignment_effect`` so sampler diagnostics carry the
  schema-required estimand parameter name.
- Random effects are mean-zero partially pooled effects with hierarchical
  scale priors (non-centered parameterization); pooling factors are reported
  so reviewers can see when pooling drives the result.
- Only the normal continuous aggregate path with the identity link is
  implemented. Requesting any other likelihood family raises
  :class:`HoldViolation`, which the artifact emitter turns into a HOLD
  artifact naming ``unsupported_likelihood_family``.
- The aggregate standard error is cohort-size weighted and enters the
  likelihood as known variance (``cohort_size_weighted_known_variance``).
- Sampling is seeded NUTS with ``cores=1``: fixed seeds produce identical
  draws within the locked environment.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

import numpy as np
import pymc as pm

from .constants import (
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    LIKELIHOOD_FAMILY_LINKS,
    SUPPORTED_LIKELIHOOD_FAMILY,
)
from .synthetic import GROUPINGS, SyntheticDataset, assert_synthetic_only_dataset

# Declared prior family for the sensitivity sweep (contract prior policy:
# weakly informative, empirically justified, sensitivity always run).
PRIOR_FAMILY_NAME = "weakly_informative_normal_halfnormal_2026_07"
PRIOR_JUSTIFICATION_REF = (
    "docs/contracts/confidence-inference-methodology/README.md#prior-policy"
)
# The >= 3 prior scalings the sensitivity diagnostic fits under (base 1.0
# plus these multipliers applied to every prior scale).
PRIOR_SENSITIVITY_SCALINGS = (0.5, 2.0)

OBSERVED_VARIABLE_NAME = "y_obs"


class HoldViolation(Exception):
    """A condition that must surface as a HOLD artifact, never a crash.

    ``failing_diagnostic`` is a value from the schema's failing-diagnostic
    vocabulary (``InferenceProofFailingDiagnosticSchema``).
    """

    def __init__(self, failing_diagnostic: str, message: str):
        super().__init__(message)
        self.failing_diagnostic = failing_diagnostic


@dataclass(frozen=True)
class PriorSpec:
    """Weakly-informative prior configuration (declared family member).

    ``scale_multiplier`` is the prior-sensitivity sweep knob: it scales every
    prior scale below, so each multiplier is a member of the declared family.
    """

    family_name: str = PRIOR_FAMILY_NAME
    intercept_scale: float = 2.5
    fixed_effect_scale: float = 1.0
    group_scale_halfnormal: float = 0.5
    scale_multiplier: float = 1.0
    justification_ref: str = PRIOR_JUSTIFICATION_REF

    def describe(self) -> dict:
        return {
            "family_name": self.family_name,
            "intercept_scale": float(self.intercept_scale),
            "fixed_effect_scale": float(self.fixed_effect_scale),
            "group_scale_halfnormal": float(self.group_scale_halfnormal),
            "scale_multiplier": float(self.scale_multiplier),
            "justification_ref": self.justification_ref,
        }


@dataclass
class FitResult:
    """A seeded NUTS fit plus everything diagnostics need."""

    idata: object  # xarray.DataTree-backed InferenceData (ArviZ 1.x)
    dataset: SyntheticDataset
    prior_spec: PriorSpec
    likelihood_family: str
    link_function: str
    draws: int
    tune: int
    chains: int
    seed: int
    target_accept: float
    max_treedepth: int
    wall_time_seconds: float
    synthetic_input_hash: str
    pooling_factors: dict[str, float] = field(default_factory=dict)

    @property
    def estimand_draws(self) -> np.ndarray:
        return np.asarray(self.idata.posterior[INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME])

    def estimand_summary(self) -> dict:
        draws = self.estimand_draws.reshape(-1)
        lower, upper = np.quantile(draws, [0.1, 0.9])
        return {
            "parameter_name": INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
            "posterior_mean": float(draws.mean()),
            "posterior_sd": float(draws.std(ddof=1)),
            "credible_interval_80": {"lower": float(lower), "upper": float(upper)},
        }


def _build_model(
    y: np.ndarray,
    se: np.ndarray,
    post: np.ndarray,
    treated: np.ndarray,
    group_indices: dict[str, np.ndarray],
    group_sizes: dict[str, int],
    prior_spec: PriorSpec,
) -> pm.Model:
    m = prior_spec.scale_multiplier
    with pm.Model() as model:
        alpha = pm.Normal("alpha", mu=0.0, sigma=prior_spec.intercept_scale * m)
        beta_post = pm.Normal("beta_post", mu=0.0, sigma=prior_spec.fixed_effect_scale * m)
        beta_treated = pm.Normal(
            "beta_treated", mu=0.0, sigma=prior_spec.fixed_effect_scale * m
        )
        delta = pm.Normal(
            INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
            mu=0.0,
            sigma=prior_spec.fixed_effect_scale * m,
        )

        mu = alpha + beta_post * post + beta_treated * treated + delta * post * treated
        for grouping in group_indices:
            # Mean-zero partially pooled effects, hierarchical scale prior,
            # non-centered parameterization for sampler geometry.
            sigma_g = pm.HalfNormal(
                f"sigma_{grouping}", sigma=prior_spec.group_scale_halfnormal * m
            )
            z_g = pm.Normal(f"z_{grouping}", mu=0.0, sigma=1.0, shape=group_sizes[grouping])
            u_g = pm.Deterministic(f"u_{grouping}", z_g * sigma_g)
            mu = mu + u_g[group_indices[grouping]]

        # Known cohort-size-weighted aggregate standard error (contract:
        # cohort_size_weighted_known_variance; overdispersion only when
        # declared, which Slice 2 does not).
        pm.Normal(OBSERVED_VARIABLE_NAME, mu=mu, sigma=se, observed=y)
    return model


def _pooling_factors(idata, group_sizes: dict[str, int]) -> dict[str, float]:
    """Pooling factor per grouping: 1 - Var_levels(E[u]) / E[sigma_g^2].

    ~1 when partial pooling has shrunk the group effects to their common
    mean (pooling dominates); ~0 when the fitted level spread matches the
    hierarchical scale (evidence dominates). Reported in the internal report
    so reviewers can see when pooling is driving the result.
    """
    factors: dict[str, float] = {}
    for grouping in group_sizes:
        u_means = np.asarray(idata.posterior[f"u_{grouping}"]).reshape(
            -1, group_sizes[grouping]
        ).mean(axis=0)
        sigma_sq = float((np.asarray(idata.posterior[f"sigma_{grouping}"]) ** 2).mean())
        spread = float(np.var(u_means, ddof=1)) if group_sizes[grouping] > 1 else 0.0
        factors[grouping] = float(np.clip(1.0 - spread / max(sigma_sq, 1e-12), 0.0, 1.0))
    return factors


def fit_did_model(
    dataset: SyntheticDataset,
    *,
    likelihood_family: str = SUPPORTED_LIKELIHOOD_FAMILY,
    prior_spec: PriorSpec | None = None,
    draws: int = 2000,
    tune: int = 1000,
    chains: int = 2,
    seed: int = 20260706,
    target_accept: float = 0.99,
    max_treedepth: int = 12,
) -> FitResult:
    """Fit the contract equation with seeded NUTS (2+ chains, cores=1).

    Defaults (2 chains x 2000 draws after 1000 warmup, target_accept 0.99,
    max_treedepth 12) are tuned so a clean k=16 synthetic fit passes every
    sampler gate with margin: R-hat <= 1.01, chain-total bulk/tail ESS >= 400,
    zero divergences, zero max-treedepth saturation, MCSE ratio <= 0.1.

    Raises :class:`HoldViolation` (``unsupported_likelihood_family``) for any
    non-normal likelihood family: those are structurally typed but held until
    their samplers, diagnostics, and synthetic recovery tests are implemented
    in the same PR.
    """
    assert_synthetic_only_dataset(dataset)
    if likelihood_family != SUPPORTED_LIKELIHOOD_FAMILY:
        raise HoldViolation(
            "unsupported_likelihood_family",
            f"likelihood family '{likelihood_family}' is not implemented in Slice 2; "
            f"only '{SUPPORTED_LIKELIHOOD_FAMILY}' (identity link) is supported — "
            "the artifact must HOLD naming the family",
        )
    if chains < 2:
        raise ValueError("the contract requires at least 2 chains for convergence diagnostics")

    spec = prior_spec if prior_spec is not None else PriorSpec()
    group_indices = {g: dataset.group_idx(g) for g in GROUPINGS}
    group_sizes = {g: len(dataset.group_labels(g)) for g in GROUPINGS}

    started = time.perf_counter()
    model = _build_model(
        y=dataset.y,
        se=dataset.se,
        post=dataset.post,
        treated=dataset.treated,
        group_indices=group_indices,
        group_sizes=group_sizes,
        prior_spec=spec,
    )
    with model:
        idata = pm.sample(
            draws=draws,
            tune=tune,
            chains=chains,
            cores=1,
            random_seed=seed,
            target_accept=target_accept,
            max_treedepth=max_treedepth,
            progressbar=False,
            # Convergence checks stay ON per the contract: backend warnings
            # must surface, and diagnostics.py re-checks every gate anyway.
            compute_convergence_checks=True,
        )
        pm.sample_posterior_predictive(
            idata,
            var_names=[OBSERVED_VARIABLE_NAME],
            random_seed=seed,
            progressbar=False,
            extend_inferencedata=True,
        )
    wall = time.perf_counter() - started

    return FitResult(
        idata=idata,
        dataset=dataset,
        prior_spec=spec,
        likelihood_family=likelihood_family,
        link_function=LIKELIHOOD_FAMILY_LINKS[likelihood_family],
        draws=draws,
        tune=tune,
        chains=chains,
        seed=seed,
        target_accept=target_accept,
        max_treedepth=max_treedepth,
        wall_time_seconds=wall,
        synthetic_input_hash=dataset.synthetic_input_hash(),
        pooling_factors=_pooling_factors(idata, group_sizes),
    )


def fit_pre_trend_pseudo_model(
    dataset: SyntheticDataset,
    *,
    draws: int = 400,
    tune: int = 400,
    chains: int = 2,
    seed: int = 20260706,
    target_accept: float = 0.99,
    max_treedepth: int = 12,
) -> FitResult:
    """Pre-period trend check: pseudo-DiD on pre windows only.

    The latest pre-period time point is treated as pseudo-post; the pseudo
    estimand's 80% credible interval must include 0 (contract pre-trend
    gate). Uses the same model structure and priors as the main fit.
    """
    assert_synthetic_only_dataset(dataset)
    pre_mask = dataset.post == 0
    if not pre_mask.any():
        raise HoldViolation("pre_trend", "dataset has no pre-period windows to check")
    time_pre = dataset.time_index[pre_mask]
    if len(np.unique(time_pre)) < 2:
        raise HoldViolation(
            "pre_trend", "pre-period trend check requires at least two pre-period time points"
        )
    pseudo_post = (time_pre == time_pre.max()).astype(int)

    group_indices = {}
    group_sizes = {}
    for grouping in GROUPINGS:
        idx = dataset.group_idx(grouping)[pre_mask]
        levels, remapped = np.unique(idx, return_inverse=True)
        group_indices[grouping] = remapped
        group_sizes[grouping] = len(levels)

    spec = PriorSpec()
    started = time.perf_counter()
    model = _build_model(
        y=dataset.y[pre_mask],
        se=dataset.se[pre_mask],
        post=pseudo_post,
        treated=dataset.treated[pre_mask],
        group_indices=group_indices,
        group_sizes=group_sizes,
        prior_spec=spec,
    )
    with model:
        idata = pm.sample(
            draws=draws,
            tune=tune,
            chains=chains,
            cores=1,
            random_seed=seed,
            target_accept=target_accept,
            max_treedepth=max_treedepth,
            progressbar=False,
            compute_convergence_checks=False,
        )
    wall = time.perf_counter() - started

    return FitResult(
        idata=idata,
        dataset=dataset,
        prior_spec=spec,
        likelihood_family=SUPPORTED_LIKELIHOOD_FAMILY,
        link_function="identity",
        draws=draws,
        tune=tune,
        chains=chains,
        seed=seed,
        target_accept=target_accept,
        max_treedepth=max_treedepth,
        wall_time_seconds=wall,
        synthetic_input_hash=dataset.synthetic_input_hash(),
    )
