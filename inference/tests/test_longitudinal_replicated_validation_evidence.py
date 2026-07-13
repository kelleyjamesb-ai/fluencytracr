import hashlib
import json
from copy import deepcopy
from pathlib import Path

from fluencytracr_inference.artifact import lockfile_hash
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.longitudinal_replicated_validation_artifact import (
    LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_SCHEMA_VERSION,
    LONGITUDINAL_REPLICATED_VALIDATION_PYTHON_REQUIRES,
    longitudinal_replicated_validation_payload_hash,
    longitudinal_replicated_validation_self_hash,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
SUMMARY_PATH = EVIDENCE_DIR / "longitudinal_replicated_validation_2026_07.json"
FULL_ARTIFACT_PATH = (
    EVIDENCE_DIR / "longitudinal_replicated_validation_full_2026_07.json"
)
ACCEPTANCE_PATH = (
    EVIDENCE_DIR / "longitudinal_replicated_validation_acceptance_2026_07.json"
)


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _summary() -> dict:
    return _load(SUMMARY_PATH)


def _artifact() -> dict:
    return _load(FULL_ARTIFACT_PATH)


def _acceptance() -> dict:
    return _load(ACCEPTANCE_PATH)


def _derived_plan(artifact: dict) -> dict:
    plan = artifact["calibration_plan"]
    summary = artifact["calibration_summary"]
    gates = plan["compiled_gates"]
    return {
        "effect_sizes_sd": plan["effect_sizes_sd"],
        "panel_group_counts": plan["panel_group_counts"],
        "replications_per_cell": plan["replications_per_cell"],
        "required_slot_count": plan["required_slot_count"],
        "executed_slot_count": len(artifact["calibration_slot_results"]),
        "chunk_count": plan["chunk_count"],
        "slots_per_chunk": plan["slots_per_chunk"],
        "aggregate_measurement_cell_k": plan["aggregate_measurement_cell_k"],
        "missing_slot_count": len(summary["missing_slot_ids"]),
        "duplicate_slot_count": len(summary["duplicate_slot_ids"]),
        "off_plan_slot_count": len(summary["off_plan_slot_ids"]),
        "duplicate_case_binding_count": len(
            summary["duplicate_case_binding_hashes"]
        ),
        "duplicate_fit_summary_count": len(
            summary["duplicate_fit_summary_hashes"]
        ),
        "hard_failure_count": summary["hard_failure_count"],
        "compiled_gates": {
            "credible_interval_level": gates["credible_interval_level"],
            "coverage_count_min_inclusive": gates[
                "coverage_count_min_inclusive"
            ],
            "coverage_count_max_inclusive": gates[
                "coverage_count_max_inclusive"
            ],
            "null_signal_count_max_inclusive": gates[
                "null_signal_count_max_inclusive"
            ],
            "aggregate_provenance_floor_k": gates[
                "aggregate_provenance_floor_k"
            ],
            "validation_floor_k": gates["validation_floor_k"],
        },
    }


def _derived_cells(artifact: dict) -> list[dict]:
    return [
        {
            "cell_id": cell["cell_id"],
            "effect_size_sd": cell["effect_size_sd"],
            "panel_group_count": cell["panel_group_count"],
            "replication_count": cell["observed_replication_count"],
            "coverage_count": cell["coverage_count"],
            "coverage_rate": cell["coverage_rate"],
            "coverage_standard_error": cell["coverage_standard_error"],
            "coverage_gate_passed": cell["coverage_gate_passed"],
            "null_signal_count": cell["null_signal_count"],
            "null_signal_rate": cell["null_signal_rate"],
            "null_gate_passed": cell["null_gate_passed"],
        }
        for cell in artifact["calibration_summary"]["cell_summaries"]
    ]


def _derived_floor_controls(artifact: dict) -> list[dict]:
    return [
        {
            "aggregate_measurement_cell_k": result["plan"][
                "aggregate_measurement_cell_k"
            ],
            "expected_outcome": result["expected_outcome"],
            "observed_outcome": result["observed_outcome"],
            "passed": result["control_passed"],
        }
        for result in artifact["control_study"]["floor_results"]
    ]


def _derived_lag_recovery(artifact: dict) -> list[dict]:
    return [
        {
            "true_lag_windows": item["true_lag_windows"],
            "recovered_count": item["exact_recovery_count"],
            "replication_count": item["observed_replication_count"],
            "required_recovery_count": item["required_recovery_count"],
            "recovery_rate": item["exact_recovery_rate"],
            "passed": item["passed"],
        }
        for item in artifact["control_study"]["lag_recovery_summaries"]
    ]


def _derived_negative_controls(artifact: dict) -> list[dict]:
    return [
        {
            "control_id": result["control_id"],
            "expected_outcome": result["expected_outcome"],
            "observed_outcome": result["observed_outcome"],
            "passed": result["control_passed"],
        }
        for result in artifact["control_study"]["negative_results"]
    ]


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
    assert artifact["schema_version"] == (
        LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_SCHEMA_VERSION
    )
    assert artifact["execution_mode"] == source["execution_mode"] == "full"
    assert artifact["python_requires"] == source["python_requires"]
    assert source["python_requires"] == LONGITUDINAL_REPLICATED_VALIDATION_PYTHON_REQUIRES
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
    assert longitudinal_replicated_validation_payload_hash(artifact) == source[
        "artifact_payload_hash"
    ]
    assert longitudinal_replicated_validation_self_hash(artifact) == source[
        "artifact_self_hash"
    ]

    bindings = artifact["hash_bindings"]
    for key in (
        "calibration_plan_hash",
        "calibration_study_result_hash",
        "control_plan_hash",
        "control_study_result_hash",
        "combined_study_hash",
        "execution_identity_hash",
        "implementation_hash",
    ):
        assert bindings[key] == source[key]
    assert artifact["execution_identity"]["source_commit"] == source["source_commit"]
    assert evidence["plan"] == _derived_plan(artifact)
    assert evidence["calibration_cells"] == _derived_cells(artifact)
    assert evidence["floor_controls"] == _derived_floor_controls(artifact)
    assert evidence["lag_recovery"] == _derived_lag_recovery(artifact)
    assert evidence["negative_controls"] == _derived_negative_controls(artifact)


def test_full_replicated_study_clears_every_compiled_numerical_control_gate():
    evidence = _summary()
    plan = evidence["plan"]

    assert plan["effect_sizes_sd"] == [0.0, 0.2, 0.5]
    assert plan["panel_group_counts"] == [6, 12]
    assert plan["replications_per_cell"] == 200
    assert plan["required_slot_count"] == plan["executed_slot_count"] == 1200
    assert plan["chunk_count"] == 20
    assert all(plan[key] == 0 for key in (
        "missing_slot_count",
        "duplicate_slot_count",
        "off_plan_slot_count",
        "duplicate_case_binding_count",
        "duplicate_fit_summary_count",
        "hard_failure_count",
    ))
    assert len(evidence["calibration_cells"]) == 6
    assert all(cell["coverage_gate_passed"] for cell in evidence["calibration_cells"])
    assert evidence["null_study"] == {
        "eligible_cell_count": 2,
        "worst_null_signal_count": 9,
        "worst_null_signal_rate": 0.045,
        "maximum_allowed_count": 10,
        "maximum_allowed_rate": 0.05,
        "gate_passed": True,
    }
    assert [item["aggregate_measurement_cell_k"] for item in evidence["floor_controls"]] == [
        4,
        8,
        12,
        16,
    ]
    assert all(item["passed"] for item in evidence["floor_controls"])
    assert all(
        item["recovered_count"] == 30 and item["passed"]
        for item in evidence["lag_recovery"]
    )
    assert len(evidence["negative_controls"]) == 9
    assert all(item["passed"] for item in evidence["negative_controls"])


def test_generated_evidence_remains_summary_only_and_nonauthorizing():
    evidence = _summary()
    source = evidence["source_evidence"]
    governance = evidence["governance"]

    assert source["source_artifact_committed"] is True
    assert source["summary_only"] is True
    assert source["posterior_draws_committed"] is False
    assert source["latent_states_committed"] is False
    assert governance["study_status"] == "PASS"
    assert governance["artifact_state"] == "valid_internal_validation_non_authorizing"
    assert governance["numerical_validation_gate_passed"] is True
    assert governance["exact_manifest_complete"] is True
    assert governance["full_evidence_generation_complete"] is True
    assert governance["state_space_nuts_concordance_accepted"] is True
    assert governance["independent_acceptance_complete"] is False
    assert governance["longitudinal_state_space_model_proof_complete"] is False
    assert governance["production_promotion_complete"] is False
    assert governance["aggregate_only"] is True
    assert governance["internal_only"] is True
    assert governance["synthetic_only"] is True
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
        )
    )


def test_separate_acceptance_record_binds_reviewed_commit_and_exact_evidence():
    record = _acceptance()
    source = record["source_evidence"]
    artifact = _artifact()

    assert set(record) == {
        "schema_version",
        "record_class",
        "reviewed_at",
        "reviewed_change_id",
        "reviewed_evidence_commit",
        "source_evidence",
        "review_decisions",
        "overall_decision",
        "completion_state",
        "governance_pins",
        "hash_bindings",
    }
    assert record["reviewed_evidence_commit"] == (
        "2ab71e198716015efccb27a680574eb39bb0873d"
    )
    assert REPO_ROOT / source["full_artifact_path"] == FULL_ARTIFACT_PATH
    assert REPO_ROOT / source["compact_summary_path"] == SUMMARY_PATH
    assert hashlib.sha256(FULL_ARTIFACT_PATH.read_bytes()).hexdigest() == source[
        "full_artifact_sha256"
    ]
    assert hashlib.sha256(SUMMARY_PATH.read_bytes()).hexdigest() == source[
        "compact_summary_sha256"
    ]

    bindings = artifact["hash_bindings"]
    for key in (
        "artifact_payload_hash",
        "artifact_self_hash",
        "calibration_plan_hash",
        "calibration_study_result_hash",
        "control_plan_hash",
        "control_study_result_hash",
        "combined_study_hash",
        "execution_identity_hash",
        "implementation_hash",
    ):
        assert bindings[key] == source[key]
    assert artifact["execution_identity"]["source_commit"] == source["source_commit"]
    assert artifact["python_requires"] == source["python_requires"]
    assert artifact["execution_identity"]["requirements_lock_hash"] == source[
        "requirements_lock_hash"
    ]

    reviews = record["review_decisions"]
    assert [review["role"] for review in reviews] == ["CODE", "BUG", "ADVERSARIAL"]
    assert all(review["decision"] == "GO" for review in reviews)
    assert all(
        review["reviewer_kind"] == "independent_codex_subagent"
        for review in reviews
    )
    assert len({review["review_ref"] for review in reviews}) == 3
    assert record["overall_decision"] == "GO"

    completion = record["completion_state"]
    assert completion["replicated_validation_complete"] is True
    assert completion["model_family_phase_3_complete"] is True
    assert completion["longitudinal_state_space_model_proof_complete"] is True
    assert completion["ai_fluency_measurement_model_calibration_complete"] is False
    assert completion["vbd_trajectory_model_calibration_complete"] is False
    assert completion["production_promotion_complete"] is False

    pins = record["governance_pins"]
    assert pins["synthetic_only"] is True
    assert pins["aggregate_only"] is True
    assert pins["internal_only"] is True
    assert pins["internal_model_validation_accepted"] is True
    assert pins["did_status"] == "isolated_incomplete"
    assert pins["promotion_decision_ref"] is None
    assert all(
        pins[key] is False
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

    hash_body = deepcopy(record)
    hash_body["hash_bindings"]["record_self_hash"] = ""
    assert record["hash_bindings"]["record_self_hash"] == sha256_json(hash_body)
    assert record["hash_bindings"]["hash_posture"] == (
        "consistency_and_drift_detection_not_coordinated_replacement_authenticity"
    )
