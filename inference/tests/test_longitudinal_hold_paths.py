from dataclasses import replace

import pytest

from fluencytracr_inference.longitudinal_artifact import (
    emit_longitudinal_proof_artifact,
)
from fluencytracr_inference.longitudinal_artifact import run_longitudinal_proof
from fluencytracr_inference.longitudinal_model import (
    compute_longitudinal_diagnostics,
    fit_longitudinal_model,
)
from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset
from fluencytracr_inference.longitudinal_types import LongitudinalStructureError


FIXED_GENERATED_AT = "2026-07-10T00:00:00+00:00"


@pytest.mark.parametrize(
    ("scenario", "diagnostic"),
    [
        ("insufficient_history", "insufficient_history"),
        ("missing_or_suppressed_windows", "missing_or_suppressed_windows"),
        ("collinear_vbd", "design_matrix_identifiability"),
        ("non_normal_metric_request", "unsupported_likelihood_family"),
        ("target_contamination", "target_contamination"),
        ("staggered_rollout_misroute", "unsupported_staggered_event_study"),
        ("baseline_only", "baseline_only_no_contribution_confidence"),
        ("missing_measurement_uncertainty", "missing_measurement_uncertainty"),
    ],
)
def test_longitudinal_hold_paths_name_diagnostic(scenario, diagnostic):
    artifact, report = run_longitudinal_proof(
        generate_longitudinal_dataset(scenario=scenario, seed=20260710),
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )

    assert artifact["governance_state"]["state"] == "HOLD"
    assert diagnostic in artifact["governance_state"]["failing_diagnostics"]
    assert diagnostic in report["failing_diagnostics"]
    assert artifact["posterior_estimand_summary"] is None
    assert artifact["customer_output_authorized"] is False
    assert artifact["confidence_output_authorized"] is False
    assert artifact["probability_output_authorized"] is False
    if scenario == "collinear_vbd":
        check = artifact["diagnostics"]["pre_fit_design_matrix_check"]
        assert check["pass"] is False
        assert check["rank"] < check["parameter_count"] or (
            check["max_abs_velocity_breadth_correlation"]
            > check["compiled_velocity_breadth_correlation_gate"]
        )
    if scenario == "target_contamination":
        assert artifact["model_input_governance"]["target_value_used_as_prior"] is True


def test_unsafe_business_control_rejects_before_artifact_emission():
    with pytest.raises(LongitudinalStructureError, match="unsafe person-level"):
        run_longitudinal_proof(
            generate_longitudinal_dataset(
                scenario="unsafe_business_control",
                seed=20260710,
            ),
            seed=20260710,
            generated_at=FIXED_GENERATED_AT,
        )


@pytest.mark.parametrize(
    ("scenario", "diagnostic"),
    [
        ("wrong_lag", "lag_sensitivity"),
        ("approved_control_common_shock", "common_shock_sensitivity"),
        ("temporary_spike", "temporary_effect_persistence"),
    ],
)
def test_longitudinal_diagnostic_hold_after_fit(scenario, diagnostic):
    artifact, report = run_longitudinal_proof(
        generate_longitudinal_dataset(scenario=scenario, seed=20260710),
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )

    assert report["fit_available"] is True
    assert artifact["governance_state"]["state"] == "HOLD"
    assert diagnostic in artifact["governance_state"]["failing_diagnostics"]
    assert artifact["posterior_estimand_summary"] is not None


def test_longitudinal_diagnostics_are_driven_by_arrays_without_oracle_sidecars():
    clean = generate_longitudinal_dataset(scenario="clean_historical_pathway", seed=20260710)
    assert not hasattr(clean, "scenario")
    assert not hasattr(clean, "ground_truth")
    clean_artifact, _ = run_longitudinal_proof(
        clean,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    assert clean_artifact["governance_state"]["state"] == (
        "valid_internal_smoke_non_authorizing"
    )

    common_shock = generate_longitudinal_dataset(
        scenario="approved_control_common_shock",
        seed=20260710,
    )
    artifact, _ = run_longitudinal_proof(
        common_shock,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "common_shock_sensitivity" in artifact["governance_state"]["failing_diagnostics"]

    wrong_lag = generate_longitudinal_dataset(scenario="wrong_lag", seed=20260710)
    artifact, _ = run_longitudinal_proof(
        wrong_lag,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "lag_sensitivity" in artifact["governance_state"]["failing_diagnostics"]

    temporary = generate_longitudinal_dataset(scenario="temporary_spike", seed=20260710)
    artifact, _ = run_longitudinal_proof(
        temporary,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "temporary_effect_persistence" in artifact["governance_state"]["failing_diagnostics"]


@pytest.mark.parametrize(
    "flag",
    [
        "real_data_present",
        "customer_data_present",
        "production_data_present",
        "live_data_source_present",
    ],
)
def test_synthetic_only_flags_reject_before_artifact_emission(flag):
    dataset = replace(generate_longitudinal_dataset(seed=20260710), **{flag: True})
    with pytest.raises(ValueError, match="synthetic aggregate inputs only"):
        run_longitudinal_proof(
            dataset,
            seed=20260710,
            generated_at=FIXED_GENERATED_AT,
        )


@pytest.mark.parametrize(
    "flag",
    [
        "real_data_present",
        "customer_data_present",
        "production_data_present",
        "live_data_source_present",
    ],
)
def test_direct_emitter_rejects_synthetic_only_flags(flag):
    dataset = replace(generate_longitudinal_dataset(seed=20260710), **{flag: True})
    with pytest.raises(ValueError, match="synthetic aggregate inputs only"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=None,
            diagnostics=None,
            generated_at=FIXED_GENERATED_AT,
        )


def test_respondent_data_leak_rejects_before_artifact_emission():
    with pytest.raises(ValueError, match="aggregate-only"):
        run_longitudinal_proof(
            generate_longitudinal_dataset(scenario="respondent_data_leak", seed=20260710),
            seed=20260710,
            generated_at=FIXED_GENERATED_AT,
        )


def test_fit_from_another_dataset_rejects_before_emission():
    first = generate_longitudinal_dataset(seed=20260710)
    second = generate_longitudinal_dataset(seed=20260711)
    fit = fit_longitudinal_model(first, seed=20260712)
    diagnostics = compute_longitudinal_diagnostics(fit)

    with pytest.raises(ValueError, match="fit is not bound"):
        emit_longitudinal_proof_artifact(
            second,
            fit=fit,
            diagnostics=diagnostics,
            generated_at=FIXED_GENERATED_AT,
        )


def test_diagnostics_from_another_fit_reject_before_emission():
    dataset = generate_longitudinal_dataset(seed=20260710)
    first_fit = fit_longitudinal_model(dataset, seed=20260711)
    second_fit = fit_longitudinal_model(dataset, seed=20260712)
    second_diagnostics = compute_longitudinal_diagnostics(second_fit)

    with pytest.raises(ValueError, match="diagnostics are not bound"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=first_fit,
            diagnostics=second_diagnostics,
            generated_at=FIXED_GENERATED_AT,
        )


@pytest.mark.parametrize(
    "mutation",
    [
        lambda dataset: replace(dataset, known_aggregate_se=dataset.known_aggregate_se[:-1]),
        lambda dataset: replace(dataset, known_aggregate_se=dataset.known_aggregate_se * -1),
        lambda dataset: replace(dataset, post=dataset.post.astype(float) + 0.5),
        lambda dataset: replace(dataset, control_matrix=dataset.control_matrix[:-1]),
        lambda dataset: replace(dataset, evaluation_window_refs=("unknown-window",)),
        lambda dataset: replace(dataset, ai_fluency_snapshots=()),
        lambda dataset: replace(
            dataset,
            hypothesis_plan=replace(dataset.hypothesis_plan, approval_state="draft"),
        ),
    ],
)
def test_malformed_longitudinal_structure_rejects(mutation):
    dataset = mutation(generate_longitudinal_dataset(seed=20260710))
    with pytest.raises(LongitudinalStructureError):
        run_longitudinal_proof(
            dataset,
            seed=20260710,
            generated_at=FIXED_GENERATED_AT,
        )
