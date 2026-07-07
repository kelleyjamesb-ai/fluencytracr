"""Shared fixtures for the proof-harness suite.

The clean recovery run (fit + diagnostics + eligible artifact) is expensive
(~3 minutes: main NUTS fit, posterior predictive, two prior-sensitivity
refits, pre-trend pseudo fit), so it is computed once per session and shared
by the recovery smoke, artifact-shape, self-hash, and HOLD-path tests.
"""

import pytest

from fluencytracr_inference.artifact import (
    emit_proof_artifact,
    phase_b1_fixture_calibration_scenarios,
    phase_b1_fixture_floor_checks,
    phase_b1_fixture_null_checks,
)
from fluencytracr_inference.diagnostics import compute_diagnostics
from fluencytracr_inference.model import fit_did_model
from fluencytracr_inference.synthetic import generate_did_dataset

RECOVERY_SEED = 20260706
RECOVERY_K = 16
RECOVERY_INJECTED_EFFECT_SD = 0.5
FIXED_GENERATED_AT = "2026-07-06T00:00:00+00:00"


@pytest.fixture(scope="session")
def clean_dataset():
    return generate_did_dataset(
        seed=RECOVERY_SEED, k=RECOVERY_K, injected_effect_sd=RECOVERY_INJECTED_EFFECT_SD
    )


@pytest.fixture(scope="session")
def clean_fit(clean_dataset):
    return fit_did_model(clean_dataset, seed=RECOVERY_SEED)


@pytest.fixture(scope="session")
def clean_diagnostics(clean_fit):
    return compute_diagnostics(clean_fit)


@pytest.fixture(scope="session")
def eligible_artifact(clean_dataset, clean_fit, clean_diagnostics):
    return emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        calibration_scenarios=phase_b1_fixture_calibration_scenarios(),
        null_checks=phase_b1_fixture_null_checks(),
        floor_checks=phase_b1_fixture_floor_checks(),
        generated_at=FIXED_GENERATED_AT,
    )
