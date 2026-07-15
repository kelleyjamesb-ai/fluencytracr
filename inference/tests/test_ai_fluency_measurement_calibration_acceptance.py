import hashlib
import json
import math
from copy import deepcopy
from pathlib import Path

from fluencytracr_inference.hashing import sha256_json


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = Path(__file__).resolve().parents[1] / "evidence"
FULL_ARTIFACT_PATH = (
    EVIDENCE_DIR / "ai_fluency_measurement_calibration_full_2026_07.json"
)
SUMMARY_PATH = EVIDENCE_DIR / "ai_fluency_measurement_calibration_2026_07.json"
ACCEPTANCE_PATH = (
    EVIDENCE_DIR / "ai_fluency_measurement_calibration_acceptance_2026_07.json"
)
EVIDENCE_TEST_PATH = (
    Path(__file__).resolve().parent
    / "test_ai_fluency_measurement_calibration_evidence.py"
)


def _strict_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _reject_nonfinite(value) -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("non-finite JSON number")
    if isinstance(value, dict):
        for item in value.values():
            _reject_nonfinite(item)
    elif isinstance(value, list):
        for item in value:
            _reject_nonfinite(item)


def _load(path: Path) -> dict:
    value = json.loads(
        path.read_bytes(),
        object_pairs_hook=_strict_object,
        parse_constant=lambda constant: (_ for _ in ()).throw(
            ValueError(f"non-finite JSON constant: {constant}")
        ),
    )
    if not isinstance(value, dict):
        raise ValueError("evidence JSON must be an object")
    _reject_nonfinite(value)
    return value


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_acceptance_record_binds_exact_review_commit_and_evidence_bytes():
    record = _load(ACCEPTANCE_PATH)
    artifact = _load(FULL_ARTIFACT_PATH)
    summary = _load(SUMMARY_PATH)
    source = record["source_evidence"]
    binding = record["reviewed_evidence_binding"]

    assert set(record) == {
        "schema_version",
        "record_class",
        "reviewed_at",
        "reviewed_change_id",
        "reviewed_evidence_binding",
        "source_evidence",
        "review_decisions",
        "overall_decision",
        "completion_state",
        "governance_pins",
        "hash_bindings",
    }
    assert record["schema_version"] == (
        "FT_INTERNAL_AI_FLUENCY_MEASUREMENT_CALIBRATION_ACCEPTANCE_2026_07_V1"
    )
    assert record["record_class"] == (
        "internal_synthetic_ai_fluency_measurement_calibration_independent_acceptance"
    )
    assert record["reviewed_change_id"] == (
        "ai-fluency-measurement-calibration-full-evidence"
    )
    assert binding == {
        "binding_kind": "committed_artifact_bytes",
        "branch_review_commit": "9c87dc2679e4d27483d8ea0de686d00e39743f65",
        "branch_review_commit_reachability_required": False,
        "full_artifact_sha256": source["full_artifact_sha256"],
        "compact_summary_sha256": source["compact_summary_sha256"],
        "artifact_self_hash": source["artifact_self_hash"],
        "evidence_test_sha256": source["evidence_test_sha256"],
    }

    assert REPO_ROOT / source["full_artifact_path"] == FULL_ARTIFACT_PATH
    assert REPO_ROOT / source["compact_summary_path"] == SUMMARY_PATH
    assert REPO_ROOT / source["evidence_test_path"] == EVIDENCE_TEST_PATH
    assert _sha256(FULL_ARTIFACT_PATH) == source["full_artifact_sha256"]
    assert _sha256(SUMMARY_PATH) == source["compact_summary_sha256"]
    assert _sha256(EVIDENCE_TEST_PATH) == source["evidence_test_sha256"]
    assert summary["source_evidence"]["source_artifact_sha256"] == source[
        "full_artifact_sha256"
    ]

    identity = artifact["execution_identity"]
    expected = {
        "artifact_payload_hash": artifact["hash_bindings"]["artifact_payload_hash"],
        "artifact_self_hash": artifact["hash_bindings"]["artifact_self_hash"],
        "manifest_hash": artifact["hash_bindings"]["manifest_hash"],
        "study_hash": artifact["hash_bindings"]["study_hash"],
        "slot_result_hashes_hash": artifact["study"]["slot_result_hashes_hash"],
        "execution_verification_hash": artifact["execution_recomputation"][
            "verification_hash"
        ],
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
        "requirements_lock_hash": identity["requirements_lock_hash"],
    }
    for key, value in expected.items():
        assert source[key] == value


def test_acceptance_records_three_independent_go_decisions_without_authorization():
    record = _load(ACCEPTANCE_PATH)
    artifact = _load(FULL_ARTIFACT_PATH)
    summary = _load(SUMMARY_PATH)
    reviews = record["review_decisions"]

    assert [review["role"] for review in reviews] == ["CODE", "BUG", "ADVERSARIAL"]
    assert all(review["decision"] == "GO" for review in reviews)
    assert all(
        review["reviewer_kind"] == "independent_codex_subagent"
        for review in reviews
    )
    assert [review["review_ref"] for review in reviews] == [
        "019f66cf-0833-7a02-86cd-53df79b671ed",
        "019f66cf-08d3-7902-a3d5-61f19d60b413",
        "019f66cf-0978-7540-98b7-bcffc14f70a3",
    ]
    assert record["overall_decision"] == "GO"

    completion = record["completion_state"]
    assert completion == {
        "action": "accept_internal_synthetic_measurement_calibration_only",
        "full_measurement_calibration_evidence_complete": True,
        "synthetic_measurement_calibration_accepted": True,
        "parent_openspec_task_5_5_complete": True,
        "real_data_calibration_complete": False,
        "short_form_equating_complete": False,
        "structural_path_calibration_complete": False,
        "vbd_trajectory_model_calibration_complete": False,
        "snapshot_persistence_promotion_complete": False,
        "ui_integration_complete": False,
        "production_promotion_complete": False,
    }
    assert artifact["completion_posture"]["independent_code_review"] == "NOT_RUN"
    assert artifact["completion_posture"]["independent_bug_review"] == "NOT_RUN"
    assert artifact["completion_posture"]["independent_adversarial_review"] == "NOT_RUN"
    assert artifact["completion_posture"]["parent_openspec_task_5_5_complete"] is False
    assert summary["governance"]["independent_acceptance_complete"] is False
    assert summary["governance"]["parent_openspec_task_5_5_complete"] is False

    pins = record["governance_pins"]
    assert pins["synthetic_only"] is True
    assert pins["aggregate_only"] is True
    assert pins["internal_only"] is True
    assert pins["internal_measurement_validation_accepted"] is True
    assert pins["long_form_id"] == "ai_fluency_long_v1"
    assert pins["short_form_role"] == "pulse_only_unequated"
    assert pins["behavior_evidence_role"] == (
        "separate_pathway_and_corroboration_only"
    )
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
