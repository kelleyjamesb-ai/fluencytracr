from dataclasses import replace

import pytest

from fluencytracr_inference.longitudinal_artifact import (
    emit_longitudinal_proof_artifact,
    longitudinal_proof_artifact_self_hash,
)
from fluencytracr_inference.longitudinal_artifact import run_longitudinal_proof
from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset


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
        ("unsafe_business_control", "person_level_data_present"),
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
    if scenario == "unsafe_business_control":
        assert artifact["business_control_evidence"]["control_names"] == []
        assert artifact["business_control_evidence"]["control_source_refs"] == []
        assert artifact["business_control_evidence"]["unsafe_control_refs_redacted"] is True


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


def test_longitudinal_diagnostics_are_not_driven_by_scenario_labels():
    clean = generate_longitudinal_dataset(scenario="clean_historical_pathway", seed=20260710)
    clean_artifact, _ = run_longitudinal_proof(
        clean,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    for label in ("wrong_lag", "approved_control_common_shock", "temporary_spike"):
        relabeled_clean = replace(clean, scenario=label)
        relabeled_clean_artifact, _ = run_longitudinal_proof(
            relabeled_clean,
            seed=20260710,
            generated_at=FIXED_GENERATED_AT,
        )

        assert relabeled_clean_artifact["governance_state"] == clean_artifact["governance_state"]
        assert relabeled_clean_artifact["hash_bindings"]["synthetic_input_hash"] == (
            clean_artifact["hash_bindings"]["synthetic_input_hash"]
        )
        assert relabeled_clean_artifact["hash_bindings"]["artifact_self_hash"] == (
            longitudinal_proof_artifact_self_hash(relabeled_clean_artifact)
        )

    common_shock = generate_longitudinal_dataset(
        scenario="approved_control_common_shock",
        seed=20260710,
    )
    relabeled_common_shock = replace(common_shock, scenario="clean_historical_pathway")
    artifact, _ = run_longitudinal_proof(
        relabeled_common_shock,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "common_shock_sensitivity" in artifact["governance_state"]["failing_diagnostics"]

    wrong_lag = generate_longitudinal_dataset(scenario="wrong_lag", seed=20260710)
    relabeled_wrong_lag = replace(wrong_lag, scenario="clean_historical_pathway")
    artifact, _ = run_longitudinal_proof(
        relabeled_wrong_lag,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "lag_sensitivity" in artifact["governance_state"]["failing_diagnostics"]

    temporary = generate_longitudinal_dataset(scenario="temporary_spike", seed=20260710)
    relabeled_temporary = replace(temporary, scenario="clean_historical_pathway")
    artifact, _ = run_longitudinal_proof(
        relabeled_temporary,
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
