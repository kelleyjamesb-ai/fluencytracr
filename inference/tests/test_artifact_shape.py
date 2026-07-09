"""Artifact JSON shape, governance pins, and self-hash behavior.

The required top-level field list below is derived from the TypeScript
``InferenceProofArtifactSchema`` (strict object) in
``packages/confidence-engine/src/confidenceModel.ts`` — every key, no
extras (unknown fields are rejected at the boundary).
"""

import dataclasses
import json
from types import SimpleNamespace

import numpy as np

from fluencytracr_inference.constants import INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME
from fluencytracr_inference.artifact import (
    emit_proof_artifact,
)
from fluencytracr_inference.constants import (
    CONFIDENCE_MODEL_BLOCKED_USES,
    INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
    INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA,
    INFERENCE_PROOF_PPC_STATISTIC_NAMES,
)
from fluencytracr_inference.hashing import inference_proof_artifact_self_hash

from conftest import FIXED_GENERATED_AT

# Exact top-level required fields of InferenceProofArtifactSchema (strict).
EXPECTED_TOP_LEVEL_FIELDS = [
    "schema_version",
    "artifact_class",
    "generated_at",
    "harness_version",
    "lockfile_hash",
    "synthetic_generator",
    "model_spec_binding",
    "measurement_cell_window_evidence",
    "diagnostics",
    "calibration",
    "null_checks",
    "floor_checks",
    "peeking_control",
    "comparison_adequacy",
    "governance_state",
    "hash_bindings",
    "blocked_uses",
    "numeric_values_role",
    "numeric_posterior_values_customer_authorized",
    "internal_only",
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "finance_output_authorized",
    "creates_route",
    "creates_ui",
    "writes_persistence",
    "creates_export",
    "renders_readout",
    "executes_connector",
    "promotion_decision_ref",
]


def test_exact_top_level_field_set(eligible_artifact):
    assert sorted(eligible_artifact.keys()) == sorted(EXPECTED_TOP_LEVEL_FIELDS)


def test_json_serializable(eligible_artifact):
    round_tripped = json.loads(json.dumps(eligible_artifact))
    assert round_tripped["schema_version"] == INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION


def test_governance_pins(eligible_artifact):
    a = eligible_artifact
    assert a["schema_version"] == INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION
    assert a["artifact_class"] == "internal_synthetic_inference_proof"
    assert a["internal_only"] is True
    assert a["customer_output_authorized"] is False
    assert a["probability_output_authorized"] is False
    assert a["confidence_output_authorized"] is False
    assert a["finance_output_authorized"] is False
    assert a["numeric_values_role"] == "internal_validation_inputs_not_output"
    assert a["numeric_posterior_values_customer_authorized"] is False
    assert a["creates_route"] is False
    assert a["creates_ui"] is False
    assert a["writes_persistence"] is False
    assert a["creates_export"] is False
    assert a["renders_readout"] is False
    assert a["executes_connector"] is False
    assert a["promotion_decision_ref"] is None
    assert a["blocked_uses"] == list(CONFIDENCE_MODEL_BLOCKED_USES)


def test_synthetic_generator_pins(eligible_artifact):
    generator = eligible_artifact["synthetic_generator"]
    assert generator["real_data_present"] is False
    assert generator["customer_data_present"] is False
    assert generator["production_data_present"] is False
    assert generator["live_data_source_present"] is False
    assert generator["seed_range"]["end_seed"] >= generator["seed_range"]["start_seed"]


def test_model_spec_binding(eligible_artifact):
    binding = eligible_artifact["model_spec_binding"]
    assert binding["model_family"] == (
        "bayesian_hierarchical_difference_in_differences_candidate"
    )
    assert binding["estimand_name"] == "aggregate_selected_metric_movement"
    assert binding["likelihood_family"] == "normal_continuous_aggregate"
    assert binding["link_function"] == "identity"
    assert binding["aggregate_cell_variance_mode"] == "cohort_size_weighted_known_variance"
    assert binding["cohort_size_enters_likelihood"] is True
    assert binding["missing_or_suppressed_windows_hold"] is True
    assert binding["pooling_structure"] == {
        "expectation_path": True,
        "workflow": True,
        "function": True,
        "cohort": True,
        "organization": True,
    }


def test_fixed_horizon_peeking_fields(eligible_artifact):
    control = eligible_artifact["peeking_control"]
    assert control["procedure"] == "fixed_horizon_one_look_only"
    assert control["repeated_evaluation"] is False
    assert control["look_index"] == 1
    assert control["total_planned_looks"] == 1
    assert len(control["milestone_days_included"]) == 1
    assert len(control["metrics_included"]) == 1
    assert len(control["cohorts_included"]) == 1
    assert control["sequential_method_name"] is None
    assert control["synthetic_null_proof_hash"] is None
    assert control["false_eligibility_bound"] == 0.05
    # Window evidence binds to the peeking milestone family.
    assert sorted(
        eligible_artifact["measurement_cell_window_evidence"]["required_milestone_days"]
    ) == sorted(control["milestone_days_included"])


def test_comparison_adequacy_rubric_complete(eligible_artifact):
    adequacy = eligible_artifact["comparison_adequacy"]
    criteria = [check["criterion"] for check in adequacy["required_checks"]]
    assert criteria == list(INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA)
    assert adequacy["comparison_cohort_present"] is True
    assert adequacy["all_required_checks_pass"] is True


def test_diagnostics_sections_present(eligible_artifact):
    diagnostics = eligible_artifact["diagnostics"]
    assert set(diagnostics.keys()) == {
        "sampler",
        "posterior_predictive_checks",
        "prior_sensitivity",
        "pre_trend",
    }
    statistic_names = [
        s["statistic_name"] for s in diagnostics["posterior_predictive_checks"]
    ]
    assert statistic_names == list(INFERENCE_PROOF_PPC_STATISTIC_NAMES)
    sampler = diagnostics["sampler"]
    assert sampler["rank_plots_recorded"] is True
    assert sampler["energy_plots_recorded"] is True
    for parameter in sampler["parameters"]:
        expected_ratio = (
            max(parameter["posterior_mean_mcse"], parameter["interval_endpoint_mcse"])
            / parameter["posterior_sd"]
        )
        assert abs(parameter["max_mcse_to_posterior_sd_ratio"] - expected_ratio) <= 1e-12


def test_hash_bindings(eligible_artifact):
    bindings = eligible_artifact["hash_bindings"]
    assert set(bindings.keys()) == {
        "source_posterior_hash",
        "synthetic_input_hash",
        "artifact_self_hash",
    }
    for value in bindings.values():
        assert isinstance(value, str) and len(value) == 64
    assert (
        bindings["synthetic_input_hash"]
        == eligible_artifact["synthetic_generator"]["synthetic_input_hash"]
    )
    # Self-hash recomputes over the body with the self-hash field omitted —
    # the identical algorithm the TypeScript boundary uses.
    assert bindings["artifact_self_hash"] == inference_proof_artifact_self_hash(
        eligible_artifact
    )


def test_emission_deterministic_same_body_same_hash(
    clean_dataset, clean_fit, clean_diagnostics, computed_study_inputs, eligible_artifact
):
    again = emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        **computed_study_inputs.as_run_proof_kwargs(),
        generated_at=FIXED_GENERATED_AT,
    )
    assert again == eligible_artifact
    assert (
        again["hash_bindings"]["artifact_self_hash"]
        == eligible_artifact["hash_bindings"]["artifact_self_hash"]
    )


def test_valid_null_uncertain_artifact_does_not_authorize_contribution_estimate(
    clean_dataset, clean_fit, clean_diagnostics, computed_study_inputs
):
    neutral_draws = np.tile(np.linspace(-0.1, 0.1, 1000), (2, 1))
    neutral_fit = dataclasses.replace(
        clean_fit,
        idata=SimpleNamespace(
            posterior={INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME: neutral_draws}
        ),
    )

    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=neutral_fit,
        diagnostics=clean_diagnostics,
        **computed_study_inputs.as_run_proof_kwargs(),
        generated_at=FIXED_GENERATED_AT,
    )

    assert artifact["governance_state"] == {
        "state": "eligible_internal_only",
        "failing_diagnostics": [],
        "comparison_supported_contribution_estimate_authorized": False,
        "evidence_tier_only": False,
    }
    assert artifact["customer_output_authorized"] is False
    assert artifact["probability_output_authorized"] is False
    assert artifact["confidence_output_authorized"] is False
    assert artifact["hash_bindings"]["artifact_self_hash"] == (
        inference_proof_artifact_self_hash(artifact)
    )


def test_authorization_uses_null_guard_not_80_percent_interval(
    clean_dataset, clean_fit, clean_diagnostics, computed_study_inputs
):
    draws = np.array([0.1] * 1800 + [2.0] * 200, dtype=float).reshape(2, 1000)
    interval_excluding_zero_fit = dataclasses.replace(
        clean_fit,
        idata=SimpleNamespace(
            posterior={INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME: draws}
        ),
    )

    summary = interval_excluding_zero_fit.estimand_summary()
    assert summary["credible_interval_80"]["lower"] > 0.0
    assert summary["posterior_mean"] - 1.959963984540054 * summary["posterior_sd"] < 0.0

    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=interval_excluding_zero_fit,
        diagnostics=clean_diagnostics,
        **computed_study_inputs.as_run_proof_kwargs(),
        generated_at=FIXED_GENERATED_AT,
    )

    assert artifact["governance_state"]["state"] == "eligible_internal_only"
    assert artifact["governance_state"]["failing_diagnostics"] == []
    assert (
        artifact["governance_state"][
            "comparison_supported_contribution_estimate_authorized"
        ]
        is False
    )
    assert artifact["governance_state"]["evidence_tier_only"] is False


def test_mutated_field_changes_self_hash(eligible_artifact):
    mutated = json.loads(json.dumps(eligible_artifact))
    mutated["diagnostics"]["sampler"]["parameters"][0]["r_hat"] += 1e-9
    assert inference_proof_artifact_self_hash(mutated) != (
        eligible_artifact["hash_bindings"]["artifact_self_hash"]
    )
