from copy import deepcopy
import subprocess

import pytest

import fluencytracr_inference.longitudinal_replicated_validation_controls as controls
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.longitudinal_replicated_validation import (
    ExecutionIdentity,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT,
    longitudinal_replicated_validation_plan,
)
from fluencytracr_inference.longitudinal_replicated_validation_controls import (
    LONGITUDINAL_FLOOR_CONTROL_K_VALUES,
    LONGITUDINAL_NEGATIVE_CONTROL_IDS,
    assemble_control_study,
    control_result_from_dict,
    recompute_control_case_receipts,
    required_lag_control_slots,
    run_floor_control,
    run_lag_control,
    run_negative_control,
)
from fluencytracr_inference.longitudinal_state_space import StateSpaceInputError


def _identity() -> ExecutionIdentity:
    commit = subprocess.run(
        ("git", "rev-parse", "HEAD"),
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    body = {
        "source_commit": commit,
        "source_tree_clean": False,
        "implementation_hash": "1" * 64,
        "requirements_lock_hash": "2" * 64,
        "runtime": {
            "python": "3.13.5",
            "pymc": "6.0.1",
            "arviz": "1.2.0",
            "numpy": "2.4.6",
            "scipy": "1.18.0",
            "platform_system": "Darwin",
            "platform_machine": "arm64",
            "python_implementation": "CPython",
            "numpy_build_config_hash": "3" * 64,
            "blas_thread_env_hash": "4" * 64,
        },
        "plan_hash": longitudinal_replicated_validation_plan()["plan_hash"],
        "accepted_concordance_record_hash": (
            LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256
        ),
        "accepted_concordance_artifact_hash": (
            LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
        ),
        "accepted_concordance_reviewed_commit": (
            LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT
        ),
        "accepted_concordance_commit_is_ancestor": True,
    }
    return ExecutionIdentity(**body, identity_hash=sha256_json(body))


def test_floor_controls_keep_k_separate_and_reject_k4_before_fit(monkeypatch):
    identity = _identity()

    def forbidden_fit_path(**_kwargs):
        raise AssertionError("k=4 must not generate, prepare, or fit")

    monkeypatch.setattr(
        "fluencytracr_inference.longitudinal_replicated_validation_controls."
        "generate_longitudinal_validation_case",
        forbidden_fit_path,
    )
    below = run_floor_control(
        4, execution_identity=identity, execution_mode="smoke"
    )
    assert below.observed_outcome == "REJECTED_BEFORE_FIT_BELOW_PROVENANCE_FLOOR"
    assert below.evidence["fit_attempted"] is False
    assert below.plan["panel_group_count"] == 6
    assert below.plan["aggregate_measurement_cell_k"] == 4


def test_all_floor_controls_validate_and_recompute():
    identity = _identity()
    results = tuple(
        run_floor_control(
            aggregate_k,
            execution_identity=identity,
            execution_mode="smoke",
        )
        for aggregate_k in LONGITUDINAL_FLOOR_CONTROL_K_VALUES
    )
    assert [result.observed_outcome for result in results] == [
        "REJECTED_BEFORE_FIT_BELOW_PROVENANCE_FLOOR",
        "VALID_INTERNAL_ONLY_BELOW_VALIDATION_FLOOR",
        "VALIDATION_FLOOR_PASSED_NONAUTHORIZING",
        "VALIDATION_FLOOR_PASSED_NONAUTHORIZING",
    ]
    for result in results:
        assert control_result_from_dict(result.to_dict()) == result
        recompute_control_case_receipts(result)
        assert result.control_passed is True


def test_floor_control_rejects_uncompiled_observed_outcome():
    identity = _identity()
    result = run_floor_control(
        8, execution_identity=identity, execution_mode="smoke"
    )
    forged = deepcopy(result.to_dict())
    forged["observed_outcome"] = "MALFORMED_OUTCOME"
    forged["control_passed"] = False
    forged["result_hash"] = sha256_json(
        {key: value for key, value in forged.items() if key != "result_hash"}
    )

    with pytest.raises(ValueError, match="compiled policy"):
        control_result_from_dict(forged)


def test_lag_control_selects_true_lag_and_binds_shared_outcome_receipt():
    identity = _identity()
    slot = required_lag_control_slots()[30]
    assert slot.true_lag_windows == 2
    result = run_lag_control(
        slot, execution_identity=identity, execution_mode="smoke"
    )
    parsed = control_result_from_dict(result.to_dict())
    assert parsed.control_passed is True
    assert parsed.evidence["selected_lag_windows"] == 2
    assert parsed.evidence["true_lag_recovered"] is True
    candidates = parsed.evidence["candidate_scores"]
    assert [candidate["candidate_lag_windows"] for candidate in candidates] == [
        0,
        1,
        2,
        3,
        4,
    ]
    assert candidates[0]["declared_input_lag_windows"] == 1
    assert len({candidate["truth_receipt_hash"] for candidate in candidates}) == 1
    recompute_control_case_receipts(parsed)


def test_lag_control_rejects_coordinated_candidate_truth_substitution():
    identity = _identity()
    result = run_lag_control(
        required_lag_control_slots()[30],
        execution_identity=identity,
        execution_mode="smoke",
    )
    forged = deepcopy(result.to_dict())
    candidate = forged["evidence"]["candidate_scores"][0]
    candidate["truth_receipt_hash"] = "f" * 64
    candidate["case_binding_hash"] = sha256_json(
        {
            "lag_slot": forged["plan"],
            "candidate_lag_windows": candidate["candidate_lag_windows"],
            "truth_receipt_hash": candidate["truth_receipt_hash"],
            "synthetic_input_hash": candidate["synthetic_input_hash"],
            "prepared_input_hash": candidate["prepared_input_hash"],
            "model_input_hash": candidate["model_input_hash"],
            "context_binding_hash": candidate["context_binding_hash"],
            "execution_identity_hash": forged["execution_identity_hash"],
        }
    )
    candidate["fit_summary_hash"] = sha256_json(
        {
            "case_binding_hash": candidate["case_binding_hash"],
            "synthetic_input_hash": candidate["synthetic_input_hash"],
            "prepared_input_hash": candidate["prepared_input_hash"],
            "model_input_hash": candidate["model_input_hash"],
            "context_binding_hash": candidate["context_binding_hash"],
            "truth_receipt_hash": candidate["truth_receipt_hash"],
            "candidate_lag_windows": candidate["candidate_lag_windows"],
            "declared_input_lag_windows": candidate[
                "declared_input_lag_windows"
            ],
            "negative_log_posterior_at_mode": candidate[
                "negative_log_posterior_at_mode"
            ],
        }
    )
    candidate["candidate_result_hash"] = sha256_json(
        {
            key: value
            for key, value in candidate.items()
            if key != "candidate_result_hash"
        }
    )
    forged["result_hash"] = sha256_json(
        {key: value for key, value in forged.items() if key != "result_hash"}
    )
    with pytest.raises(ValueError, match="share one truth"):
        control_result_from_dict(forged)


def test_lag_evidence_rejects_boolean_integers_and_nonstring_errors():
    identity = _identity()
    result = run_lag_control(
        required_lag_control_slots()[0],
        execution_identity=identity,
        execution_mode="smoke",
    )

    boolean_identity = deepcopy(result.to_dict())
    boolean_identity["evidence"]["replication_index"] = False
    boolean_identity["result_hash"] = sha256_json(
        {
            key: value
            for key, value in boolean_identity.items()
            if key != "result_hash"
        }
    )
    with pytest.raises(ValueError, match="integer"):
        control_result_from_dict(boolean_identity)

    boolean_selection = deepcopy(result.to_dict())
    boolean_selection["evidence"]["selected_lag_windows"] = True
    boolean_selection["result_hash"] = sha256_json(
        {
            key: value
            for key, value in boolean_selection.items()
            if key != "result_hash"
        }
    )
    with pytest.raises(ValueError, match="integer"):
        control_result_from_dict(boolean_selection)

    bad_error = deepcopy(result.to_dict())
    candidate = bad_error["evidence"]["candidate_scores"][0]
    candidate["status"] = "HOLD"
    candidate["negative_log_posterior_at_mode"] = None
    candidate["runner_error_type"] = 7
    candidate["candidate_result_hash"] = sha256_json(
        {
            key: value
            for key, value in candidate.items()
            if key != "candidate_result_hash"
        }
    )
    bad_error["evidence"].update(
        {
            "all_candidates_passed": False,
            "score_tie": False,
            "selected_lag_windows": None,
            "true_lag_recovered": False,
        }
    )
    bad_error["observed_outcome"] = "LAG_CANDIDATE_RUNNER_ERROR"
    bad_error["control_passed"] = False
    bad_error["result_hash"] = sha256_json(
        {key: value for key, value in bad_error.items() if key != "result_hash"}
    )
    with pytest.raises(ValueError, match="runner error type"):
        control_result_from_dict(bad_error)


def test_negative_controls_match_every_compiled_safe_outcome():
    identity = _identity()
    results = tuple(
        run_negative_control(
            control_id,
            execution_identity=identity,
            execution_mode="smoke",
        )
        for control_id in LONGITUDINAL_NEGATIVE_CONTROL_IDS
    )
    assert all(result.control_passed for result in results)
    assert {result.control_id for result in results} == set(
        LONGITUDINAL_NEGATIVE_CONTROL_IDS
    )
    assert next(
        result for result in results if result.control_id == "uncontrolled_common_shock"
    ).observed_outcome == "HOLD_UNMEASURED_COMMON_SHOCK"
    assert next(
        result for result in results if result.control_id == "approved_control_shock"
    ).observed_outcome == "PASS_NO_INTERNAL_SIGNAL"
    for result in results:
        assert control_result_from_dict(result.to_dict()) == result
        recompute_control_case_receipts(result)


def test_structural_control_requires_the_exact_compiled_rejection(monkeypatch):
    identity = _identity()

    def wrong_rejection(_dataset):
        raise StateSpaceInputError("unrelated preparation failure")

    monkeypatch.setattr(controls, "prepare_longitudinal_state_space", wrong_rejection)
    result = run_negative_control(
        "weak_history",
        execution_identity=identity,
        execution_mode="smoke",
    )

    assert result.observed_outcome == "RUNNER_ERROR"
    assert result.control_passed is False
    assert control_result_from_dict(result.to_dict()) == result
    recompute_control_case_receipts(result)


def test_floor_and_statistical_runner_errors_are_resumable(monkeypatch):
    identity = _identity()

    def fail_generation(**_kwargs):
        raise RuntimeError("bounded floor failure")

    monkeypatch.setattr(
        controls, "generate_longitudinal_validation_case", fail_generation
    )
    floor = run_floor_control(
        8, execution_identity=identity, execution_mode="smoke"
    )
    assert floor.observed_outcome == "RUNNER_ERROR"
    assert floor.control_passed is False
    assert control_result_from_dict(floor.to_dict()) == floor
    recompute_control_case_receipts(floor)

    monkeypatch.undo()

    def fail_fit(*_args, **_kwargs):
        raise RuntimeError("bounded statistical failure")

    monkeypatch.setattr(controls, "_fit_summary", fail_fit)
    negative = run_negative_control(
        "approved_control_shock",
        execution_identity=identity,
        execution_mode="smoke",
    )
    assert negative.observed_outcome == "RUNNER_ERROR"
    assert negative.control_passed is False
    assert control_result_from_dict(negative.to_dict()) == negative
    recompute_control_case_receipts(negative)


def test_control_plan_parser_distinguishes_booleans_from_integers():
    identity = _identity()
    result = run_negative_control(
        "weak_history",
        execution_identity=identity,
        execution_mode="smoke",
    )
    forged = deepcopy(result.to_dict())
    forged["plan"]["customer_output_authorized"] = 0
    forged["result_hash"] = sha256_json(
        {key: value for key, value in forged.items() if key != "result_hash"}
    )

    with pytest.raises(ValueError, match="plan binding"):
        control_result_from_dict(forged)


def test_partial_control_study_is_always_hold():
    identity = _identity()
    study = assemble_control_study(
        floor_results=(
            run_floor_control(4, execution_identity=identity, execution_mode="smoke"),
        ),
        lag_results=(),
        negative_results=(),
        execution_identity=identity,
        execution_mode="smoke",
    )
    assert study.study_status == "HOLD"
    assert study.exact_manifest_complete is False
    assert "full_control_execution_required" in study.failing_checks
