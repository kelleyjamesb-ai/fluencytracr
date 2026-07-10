import pytest

from fluencytracr_inference.design_router import route_evidence_design
from fluencytracr_inference.longitudinal_artifact import run_longitudinal_proof
from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset
from fluencytracr_inference.longitudinal_types import MIN_POST_WINDOWS, MIN_PRE_WINDOWS


FIXED_GENERATED_AT = "2026-07-10T00:00:00+00:00"


def test_clean_longitudinal_dataset_meets_window_requirements():
    dataset = generate_longitudinal_dataset(seed=20260710)

    assert dataset.pre_window_count >= MIN_PRE_WINDOWS
    assert dataset.post_window_count >= MIN_POST_WINDOWS
    assert dataset.hypothesis_plan.evidence_design == "HISTORICAL_STATE_SPACE"
    assert dataset.hypothesis_plan.primary_metric_family == "continuous_normal_identity"
    assert dataset.ai_fluency_snapshots[0].aggregate_only is True
    assert dataset.ai_fluency_snapshots[0].person_level_data_present is False
    assert dataset.real_data_present is False
    assert dataset.customer_data_present is False
    assert dataset.production_data_present is False
    assert dataset.live_data_source_present is False


def test_clean_longitudinal_proof_is_internal_smoke_eligible():
    artifact, report = run_longitudinal_proof(
        generate_longitudinal_dataset(seed=20260710),
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )

    assert report["synthetic_smoke_only"] is True
    assert report["replicated_calibration_complete"] is False
    assert artifact["governance_state"]["state"] == "eligible_internal_smoke_only"
    assert artifact["governance_state"]["failing_diagnostics"] == []
    assert artifact["posterior_estimand_summary"]["credible_interval_80"]["lower"] > 0
    assert artifact["behavior_outcome_pathway_evidence"]["pathway_state"] == (
        "BEHAVIOR_AND_OUTCOME_ALIGNED"
    )
    assert artifact["full_pathway_coherence_authorized"] is False


def test_null_longitudinal_proof_is_valid_non_authorizing():
    artifact, _ = run_longitudinal_proof(
        generate_longitudinal_dataset(scenario="null_pathway", seed=20260710),
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )

    assert artifact["governance_state"]["state"] == "valid_internal_non_authorizing"
    assert artifact["governance_state"]["failing_diagnostics"] == []
    interval = artifact["posterior_estimand_summary"]["credible_interval_80"]
    assert interval["lower"] < 0 < interval["upper"]
    assert artifact["behavior_outcome_pathway_evidence"]["pathway_state"] == (
        "NO_MEANINGFUL_MOVEMENT"
    )


@pytest.mark.parametrize(
    ("design", "expected_decision"),
    [
        ("STAGGERED_ROLLOUT", "HOLD_UNSUPPORTED_STAGGERED_EVENT_STUDY"),
        ("BASELINE_ONLY", "HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE"),
        ("CONTROLLED_TEST", "HOLD_UNSUPPORTED_CONTROLLED_TEST_MODEL"),
        ("TWO_GROUP_PRE_POST_COMPARISON", "ROUTE_COMPARISON_SUPPORTED_DID"),
    ],
)
def test_router_preserves_did_and_holds_unsupported_designs(design, expected_decision):
    route = route_evidence_design(
        design,
        synthetic_only=True,
        historical_requirements_met=False,
    )
    assert route.decision == expected_decision

