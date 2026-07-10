import json

from fluencytracr_inference.longitudinal_artifact import (
    longitudinal_proof_artifact_self_hash,
    run_longitudinal_proof,
)
from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset
from fluencytracr_inference.longitudinal_types import (
    LONGITUDINAL_ARTIFACT_SCHEMA_VERSION,
    LONGITUDINAL_MODEL_FAMILY,
    LONGITUDINAL_MODEL_SLICE,
)


FIXED_GENERATED_AT = "2026-07-10T00:00:00+00:00"

EXPECTED_TOP_LEVEL_FIELDS = [
    "schema_version",
    "artifact_class",
    "generated_at",
    "harness_version",
    "model_family",
    "model_slice",
    "design_route",
    "hypothesis_binding",
    "primary_metric_binding",
    "baseline_and_post_window_evidence",
    "ai_fluency_snapshot_evidence",
    "vbd_exposure_evidence",
    "business_control_evidence",
    "model_specification",
    "posterior_estimand_summary",
    "behavior_outcome_pathway_evidence",
    "diagnostics",
    "counterfactual_derivation",
    "evidence_design_claim_cap",
    "governance_state",
    "synthetic_generator",
    "source_hashes",
    "hash_bindings",
    "blocked_outputs",
    "internal_only",
    "synthetic_only",
    "numeric_values_role",
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "roi_output_authorized",
    "finance_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized",
    "full_pathway_coherence_authorized",
    "promotion_decision_ref",
]


def _artifact(scenario="clean_historical_pathway"):
    artifact, _ = run_longitudinal_proof(
        generate_longitudinal_dataset(scenario=scenario, seed=20260710),
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )
    return artifact


def test_longitudinal_artifact_exact_top_level_shape():
    artifact = _artifact()
    assert sorted(artifact.keys()) == sorted(EXPECTED_TOP_LEVEL_FIELDS)
    assert artifact["schema_version"] == LONGITUDINAL_ARTIFACT_SCHEMA_VERSION
    assert artifact["model_family"] == LONGITUDINAL_MODEL_FAMILY
    assert artifact["model_slice"] == LONGITUDINAL_MODEL_SLICE
    assert json.loads(json.dumps(artifact))["schema_version"] == (
        LONGITUDINAL_ARTIFACT_SCHEMA_VERSION
    )


def test_longitudinal_governance_and_blocked_output_pins():
    artifact = _artifact()
    assert artifact["internal_only"] is True
    assert artifact["synthetic_only"] is True
    assert artifact["customer_output_authorized"] is False
    assert artifact["probability_output_authorized"] is False
    assert artifact["confidence_output_authorized"] is False
    assert artifact["roi_output_authorized"] is False
    assert artifact["finance_output_authorized"] is False
    assert artifact["causality_output_authorized"] is False
    assert artifact["productivity_output_authorized"] is False
    assert artifact["full_pathway_coherence_authorized"] is False
    assert artifact["promotion_decision_ref"] is None
    assert artifact["model_specification"]["synthetic_smoke_only"] is True
    assert artifact["model_specification"]["replicated_calibration_complete"] is False
    assert all(value is False for value in artifact["blocked_outputs"].values())


def test_longitudinal_hash_bindings():
    artifact = _artifact()
    assert artifact["hash_bindings"]["synthetic_input_hash"] == (
        artifact["synthetic_generator"]["synthetic_input_hash"]
    )
    assert artifact["hash_bindings"]["artifact_self_hash"] == (
        longitudinal_proof_artifact_self_hash(artifact)
    )
    for value in artifact["source_hashes"].values():
        if isinstance(value, list):
            assert all(isinstance(item, str) and len(item) == 64 for item in value)
        else:
            assert isinstance(value, str) and len(value) == 64


def test_longitudinal_null_and_hold_artifacts_keep_same_boundary():
    null_artifact = _artifact("null_pathway")
    hold_artifact = _artifact("missing_or_suppressed_windows")

    assert null_artifact["governance_state"]["state"] == "valid_internal_non_authorizing"
    assert hold_artifact["governance_state"]["state"] == "HOLD"
    assert hold_artifact["posterior_estimand_summary"] is None
    assert hold_artifact["hash_bindings"]["artifact_self_hash"] == (
        longitudinal_proof_artifact_self_hash(hold_artifact)
    )
    assert null_artifact["hash_bindings"]["artifact_self_hash"] == (
        longitudinal_proof_artifact_self_hash(null_artifact)
    )

