"""Environment smoke test for the pinned inference stack.

Proves that the locked PyMC + ArviZ environment can specify a model, run
NUTS, and compute diagnostics — and that a fixed seed is reproducible
in-process within this locked environment. Synthetic data only.
"""

import numpy as np
import pytest

import arviz as az
import pymc as pm

# Exact pins — must match requirements.lock / inference/pyproject.toml.
PINNED_PYMC_VERSION = "6.0.1"
PINNED_ARVIZ_VERSION = "1.2.0"
PINNED_NUMPY_VERSION = "2.4.6"
PINNED_SCIPY_VERSION = "1.18.0"

SEED = 20260706
DRAWS = 300
TUNE = 300
CHAINS = 2


def test_pinned_versions():
    import scipy

    assert pm.__version__ == PINNED_PYMC_VERSION
    assert az.__version__ == PINNED_ARVIZ_VERSION
    assert np.__version__ == PINNED_NUMPY_VERSION
    assert scipy.__version__ == PINNED_SCIPY_VERSION


def _synthetic_observations() -> np.ndarray:
    """Synthetic-only observations for the smoke fit (never real data)."""
    rng = np.random.default_rng(SEED)
    return rng.normal(loc=1.5, scale=1.0, size=50)


def _fit_normal_mean(observed: np.ndarray):
    # Returns a DataTree-backed InferenceData (ArviZ 1.x migrated
    # arviz.InferenceData to xarray.DataTree; pm.sample returns the
    # compatible object).
    with pm.Model():
        mu = pm.Normal("mu", mu=0.0, sigma=5.0)
        sigma = pm.HalfNormal("sigma", sigma=2.0)
        pm.Normal("y", mu=mu, sigma=sigma, observed=observed)
        return pm.sample(
            draws=DRAWS,
            tune=TUNE,
            chains=CHAINS,
            cores=1,
            random_seed=SEED,
            progressbar=False,
            compute_convergence_checks=False,
        )


@pytest.fixture(scope="module")
def smoke_fits():
    observed = _synthetic_observations()
    return _fit_normal_mean(observed), _fit_normal_mean(observed)


def test_nuts_sampling_shape(smoke_fits):
    idata, _ = smoke_fits
    posterior = idata.posterior
    assert posterior.sizes["chain"] == CHAINS
    assert posterior.sizes["draw"] == DRAWS
    assert "mu" in posterior and "sigma" in posterior


def test_rhat_gate(smoke_fits):
    idata, _ = smoke_fits
    rhat = az.rhat(idata)
    rhat_mu = float(rhat["mu"])
    rhat_sigma = float(rhat["sigma"])
    assert rhat_mu <= 1.01, f"R-hat(mu) = {rhat_mu} exceeds the 1.01 gate"
    assert rhat_sigma <= 1.01, f"R-hat(sigma) = {rhat_sigma} exceeds the 1.01 gate"


def test_no_divergences(smoke_fits):
    idata, _ = smoke_fits
    divergences = int(idata.sample_stats["diverging"].sum())
    assert divergences == 0


def test_fixed_seed_reproduces_posterior_mean(smoke_fits):
    idata_a, idata_b = smoke_fits
    mean_a = float(idata_a.posterior["mu"].mean())
    mean_b = float(idata_b.posterior["mu"].mean())
    assert abs(mean_a - mean_b) <= 1e-6, (
        f"Seeded posterior means differ in-process: {mean_a} vs {mean_b}"
    )
    # Sanity: the posterior mean is near the synthetic generating mean.
    assert abs(mean_a - 1.5) < 0.5
