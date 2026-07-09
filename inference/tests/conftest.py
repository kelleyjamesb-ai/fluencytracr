"""Shared fixtures for the proof-harness suite.

The clean recovery run (fit + diagnostics + artifacts) is expensive
(~3 minutes: main NUTS fit, posterior predictive, two prior-sensitivity
refits, pre-trend pseudo fit), so it is computed once per session and shared
by the recovery smoke, artifact-shape, self-hash, and HOLD-path tests.
"""

import pytest

from fluencytracr_inference.artifact import canonical_floor_checks, emit_proof_artifact
from fluencytracr_inference.calibration import control_study_inputs
from fluencytracr_inference.diagnostics import compute_diagnostics
from fluencytracr_inference.model import fit_did_model
from fluencytracr_inference.synthetic import generate_did_dataset
from fluencytracr_inference.synthetic_study import run_synthetic_study_inputs

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
def computed_study_inputs():
    return run_synthetic_study_inputs()


@pytest.fixture(scope="session")
def proof_pending_artifact(clean_dataset, clean_fit, clean_diagnostics):
    calibration_scenarios, null_checks = control_study_inputs()
    return emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        calibration_scenarios=calibration_scenarios,
        null_checks=null_checks,
        floor_checks=canonical_floor_checks(),
        generated_at=FIXED_GENERATED_AT,
    )


@pytest.fixture(scope="session")
def eligible_artifact(clean_dataset, clean_fit, clean_diagnostics, computed_study_inputs):
    return emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        **computed_study_inputs.as_run_proof_kwargs(),
        generated_at=FIXED_GENERATED_AT,
    )
