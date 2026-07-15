import hashlib
import json
from pathlib import Path

from fluencytracr_inference.artifact import lockfile_hash
from fluencytracr_inference.ai_fluency_measurement_calibration_artifact import (
    MEASUREMENT_CALIBRATION_ARTIFACT_SCHEMA_VERSION,
    measurement_calibration_artifact_payload_hash,
    measurement_calibration_artifact_self_hash,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
SUMMARY_PATH = EVIDENCE_DIR / "ai_fluency_measurement_calibration_2026_07.json"
FULL_ARTIFACT_PATH = (
    EVIDENCE_DIR / "ai_fluency_measurement_calibration_full_2026_07.json"
)


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _summary() -> dict:
    return _load(SUMMARY_PATH)


def _artifact() -> dict:
    return _load(FULL_ARTIFACT_PATH)


def _derived_plan(artifact: dict) -> dict:
    study = artifact["study"]
    summaries = study["scenario_summaries"]
    return {
        "scenarios": [summary["scenario"] for summary in summaries],
        "replications_per_scenario": study["replications_per_scenario"],
        "required_slot_count": len(summaries) * study["replications_per_scenario"],
        "executed_slot_count": study["total_slot_count"],
        "sample_size_per_wave": study["sample_size_per_wave"],
        "execution_mode": study["execution_mode"],
        "complete_full_plan": study["complete_full_plan"],
        "separate_phase_execution": artifact["execution_identity"][
            "separate_phase_execution"
        ],
        "all_compiled_slots_freshly_recomputed": artifact[
            "execution_recomputation"
        ]["all_compiled_slots_freshly_recomputed"],
        "failing_check_count": len(study["failing_checks"]),
        "runner_error_count": sum(
            summary["runner_error_count"] for summary in summaries
        ),
    }


def _derived_gate_results(artifact: dict) -> dict:
    summaries = {
        item["scenario"]: item for item in artifact["study"]["scenario_summaries"]
    }
    gates = artifact["compiled_validation_gates"]
    maximum_false_hold_rate = gates["maximum_invariant_false_hold_rate"]
    minimum_drift_rate = gates["minimum_drift_detection_rate"]
    minimum_recovery_rate = gates["minimum_recovery_pass_rate"]

    invariant_false_hold = []
    for scenario in ("invariant", "invariant_latent_shift"):
        result = summaries[scenario]
        count = result["replication_count"] - result["expected_result_count"]
        maximum_count = int(
            result["replication_count"] * maximum_false_hold_rate
        )
        invariant_false_hold.append(
            {
                "scenario": scenario,
                "false_hold_count": count,
                "false_hold_rate": count / result["replication_count"],
                "maximum_allowed_count": maximum_count,
                "maximum_allowed_rate": maximum_false_hold_rate,
                "passed": count <= maximum_count,
            }
        )

    drift_detection = []
    for scenario in ("loading_drift", "threshold_drift"):
        result = summaries[scenario]
        minimum_count = int(result["replication_count"] * minimum_drift_rate)
        drift_detection.append(
            {
                "scenario": scenario,
                "detected_count": result["expected_result_count"],
                "detection_rate": result["expected_result_rate"],
                "minimum_required_count": minimum_count,
                "minimum_required_rate": minimum_drift_rate,
                "passed": result["expected_result_count"] >= minimum_count,
            }
        )

    recovery = []
    for scenario in (
        "invariant",
        "invariant_latent_shift",
        "loading_drift",
        "threshold_drift",
    ):
        result = summaries[scenario]
        minimum_count = int(result["replication_count"] * minimum_recovery_rate)
        recovery.append(
            {
                "scenario": scenario,
                "recovery_pass_count": result["recovery_pass_count"],
                "recovery_pass_rate": result["recovery_pass_rate"],
                "minimum_required_count": minimum_count,
                "minimum_required_rate": minimum_recovery_rate,
                "passed": result["recovery_pass_count"] >= minimum_count,
            }
        )
    return {
        "invariant_false_hold": invariant_false_hold,
        "drift_detection": drift_detection,
        "recovery": recovery,
    }


def _all_keys(value) -> set[str]:
    if isinstance(value, dict):
        return set(value).union(*(_all_keys(item) for item in value.values()), set())
    if isinstance(value, list):
        return set().union(*(_all_keys(item) for item in value), set())
    return set()


def test_compact_summary_is_exactly_derived_from_committed_full_artifact():
    evidence = _summary()
    source = evidence["source_evidence"]
    artifact_bytes = FULL_ARTIFACT_PATH.read_bytes()
    artifact = json.loads(artifact_bytes)

    assert REPO_ROOT / source["source_artifact_path"] == FULL_ARTIFACT_PATH
    assert FULL_ARTIFACT_PATH.resolve().is_relative_to(REPO_ROOT)
    assert hashlib.sha256(artifact_bytes).hexdigest() == source[
        "source_artifact_sha256"
    ]
    assert artifact["schema_version"] == source["artifact_schema_version"]
    assert artifact["schema_version"] == MEASUREMENT_CALIBRATION_ARTIFACT_SCHEMA_VERSION
    assert artifact["state"] == source["artifact_state"]
    assert artifact["study"]["execution_mode"] == source["execution_mode"] == "full"
    assert artifact["execution_identity"]["requirements_lock_hash"] == source[
        "requirements_lock_hash"
    ]
    assert source["requirements_lock_hash"] == lockfile_hash()
    assert artifact["hash_bindings"]["artifact_payload_hash"] == source[
        "artifact_payload_hash"
    ]
    assert artifact["hash_bindings"]["artifact_self_hash"] == source[
        "artifact_self_hash"
    ]
    assert measurement_calibration_artifact_payload_hash(artifact) == source[
        "artifact_payload_hash"
    ]
    assert measurement_calibration_artifact_self_hash(artifact) == source[
        "artifact_self_hash"
    ]

    identity = artifact["execution_identity"]
    bindings = artifact["hash_bindings"]
    recomputation = artifact["execution_recomputation"]
    expected_bindings = {
        "manifest_hash": bindings["manifest_hash"],
        "study_hash": bindings["study_hash"],
        "slot_result_hashes_hash": artifact["study"]["slot_result_hashes_hash"],
        "execution_verification_hash": recomputation["verification_hash"],
        "execution_identity_hash": identity["identity_hash"],
        "implementation_hash": identity["implementation_manifest"][
            "implementation_hash"
        ],
        "plan_hash": identity["plan_hash"],
        "primary_phase_hash": identity["primary_phase_hash"],
        "recompute_phase_hash": identity["recompute_phase_hash"],
        "primary_checkpoint_manifest_hash": identity[
            "primary_checkpoint_manifest_hash"
        ],
        "recompute_checkpoint_manifest_hash": identity[
            "recompute_checkpoint_manifest_hash"
        ],
        "primary_process_tokens_hash": identity["primary_process_tokens_hash"],
        "recompute_process_tokens_hash": identity["recompute_process_tokens_hash"],
        "source_commit": identity["source_commit"],
    }
    for key, value in expected_bindings.items():
        assert source[key] == value

    assert evidence["generated_at"] == artifact["generated_at"]
    assert evidence["plan"] == _derived_plan(artifact)
    assert evidence["scenario_results"] == artifact["study"]["scenario_summaries"]
    assert evidence["gate_results"] == _derived_gate_results(artifact)
    assert evidence["compiled_gates"] == artifact["compiled_validation_gates"]


def test_full_measurement_study_clears_every_compiled_numerical_gate():
    evidence = _summary()
    plan = evidence["plan"]

    assert plan == {
        "scenarios": [
            "invariant",
            "invariant_latent_shift",
            "loading_drift",
            "threshold_drift",
        ],
        "replications_per_scenario": 200,
        "required_slot_count": 800,
        "executed_slot_count": 800,
        "sample_size_per_wave": 800,
        "execution_mode": "full",
        "complete_full_plan": True,
        "separate_phase_execution": True,
        "all_compiled_slots_freshly_recomputed": True,
        "failing_check_count": 0,
        "runner_error_count": 0,
    }
    assert all(
        result["passed"]
        for family in evidence["gate_results"].values()
        for result in family
    )
    assert evidence["gate_results"]["invariant_false_hold"] == [
        {
            "scenario": "invariant",
            "false_hold_count": 1,
            "false_hold_rate": 0.005,
            "maximum_allowed_count": 10,
            "maximum_allowed_rate": 0.05,
            "passed": True,
        },
        {
            "scenario": "invariant_latent_shift",
            "false_hold_count": 2,
            "false_hold_rate": 0.01,
            "maximum_allowed_count": 10,
            "maximum_allowed_rate": 0.05,
            "passed": True,
        },
    ]
    assert [
        result["detection_rate"]
        for result in evidence["gate_results"]["drift_detection"]
    ] == [0.97, 1.0]
    assert all(
        result["recovery_pass_rate"] == 1.0
        for result in evidence["gate_results"]["recovery"]
    )


def test_committed_evidence_remains_summary_only_private_and_nonauthorizing():
    evidence = _summary()
    artifact = _artifact()
    source = evidence["source_evidence"]
    governance = evidence["governance"]

    assert set(artifact) == {
        "artifact_class",
        "blocked_outputs",
        "compiled_validation_gates",
        "completion_posture",
        "evidence_contract",
        "execution_identity",
        "execution_recomputation",
        "failing_checks",
        "generated_at",
        "harness_version",
        "hash_bindings",
        "measurement_manifest",
        "model_specification",
        "schema_version",
        "scope",
        "state",
        "study",
    }
    assert source["source_artifact_committed"] is True
    assert source["summary_only"] is True
    assert all(
        source[key] is False
        for key in (
            "primary_slot_results_committed",
            "recomputation_slot_results_committed",
            "respondent_rows_committed",
            "raw_answers_committed",
            "posterior_draws_committed",
            "latent_states_committed",
        )
    )
    forbidden_keys = {
        "slot_results",
        "category_counts",
        "cell_counts",
        "raw_answers",
        "respondent_id",
        "user_id",
        "email",
        "posterior_draws",
        "latent_states",
    }
    assert not (forbidden_keys & _all_keys(artifact))
    assert not (forbidden_keys & _all_keys(evidence))

    assert governance["study_status"] == "PASS"
    assert governance["artifact_state"] == (
        "VALID_INTERNAL_SYNTHETIC_NON_AUTHORIZING"
    )
    assert governance["numerical_calibration_gate_passed"] is True
    assert governance["exact_plan_complete"] is True
    assert governance["full_evidence_generation_complete"] is True
    assert governance["independent_acceptance_complete"] is False
    assert governance["ai_fluency_measurement_model_calibration_complete"] is False
    assert governance["parent_openspec_task_5_5_complete"] is False
    assert governance["real_data_calibration_complete"] is False
    assert governance["short_form_equating_complete"] is False
    assert governance["structural_path_calibration_complete"] is False
    assert governance["aggregate_only"] is True
    assert governance["internal_only"] is True
    assert governance["synthetic_only"] is True
    assert governance["promotion_decision_ref"] is None
    assert all(
        governance[key] is False
        for key in (
            "customer_output_authorized",
            "probability_output_authorized",
            "confidence_output_authorized",
            "roi_output_authorized",
            "finance_output_authorized",
            "causality_output_authorized",
            "productivity_output_authorized",
            "creates_route",
            "creates_ui",
            "writes_persistence",
            "creates_export",
            "renders_readout",
            "executes_connector",
        )
    )
    assert all(value is False for value in artifact["blocked_outputs"].values())
