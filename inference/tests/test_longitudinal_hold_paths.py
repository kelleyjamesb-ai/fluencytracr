import pytest

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
        ("unrecorded_common_shock", "common_shock_sensitivity"),
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


def test_real_data_flag_rejects_before_artifact_emission():
    with pytest.raises(ValueError, match="synthetic aggregate inputs only"):
        run_longitudinal_proof(
            generate_longitudinal_dataset(scenario="real_data_flag", seed=20260710),
            seed=20260710,
            generated_at=FIXED_GENERATED_AT,
        )


def test_respondent_data_leak_rejects_before_artifact_emission():
    with pytest.raises(ValueError, match="aggregate-only"):
        run_longitudinal_proof(
            generate_longitudinal_dataset(scenario="respondent_data_leak", seed=20260710),
            seed=20260710,
            generated_at=FIXED_GENERATED_AT,
        )
