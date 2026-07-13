from dataclasses import replace
import subprocess

import pytest

import fluencytracr_inference.longitudinal_replicated_validation as runner
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.longitudinal_replicated_validation import (
    CalibrationSlotResult,
    ExecutionIdentity,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT,
    LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT,
    ReplicatedValidationError,
    ReplicatedValidationWorkspaceError,
    _fit_binding_hash,
    _slot_result_with_hash,
    calibration_chunk_plan,
    calibration_seed,
    calibration_slot_result_from_dict,
    build_execution_identity,
    initialize_replicated_validation_workspace,
    longitudinal_replicated_validation_plan,
    recompute_calibration_case_receipt,
    required_calibration_slots,
    run_calibration_slot,
    summarize_calibration_results,
    validate_calibration_slot_result,
    write_json_atomic,
)
from fluencytracr_inference.longitudinal_replicated_validation_artifact import (
    _validated_generated_at,
)


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


def _diagnostics(slot_index: int) -> dict:
    return {
        "status": "PASS",
        "point_count": 8192,
        "finite_point_count": 8192,
        "effective_sample_size": 1024.0 + slot_index,
        "compiled_min_effective_sample_size": 256.0,
        "max_normalized_weight": 0.01,
        "compiled_max_normalized_weight": 0.05,
        "negative_log_posterior_at_mode": 100.0 + slot_index / 10_000,
        "hessian_condition_number": 10.0,
        "random_numbers_used": False,
        "seed_used_for_computation": False,
    }


def _result(
    slot,
    identity: ExecutionIdentity,
    *,
    covered: bool,
    signal: bool,
) -> CalibrationSlotResult:
    truth = float(slot.effect_size_sd)
    posterior_sd = 1.0
    posterior_mean = 2.0 if signal else truth
    lower = truth - 0.1 if covered else truth + 0.2
    upper = truth + 0.1 if covered else truth + 0.4
    unique = sha256_json({"slot": slot.to_dict(), "kind": "fixture"})
    truth_hash = sha256_json({"slot": slot.to_dict(), "kind": "truth"})
    prepared_hash = sha256_json({"slot": slot.to_dict(), "kind": "prepared"})
    model_hash = sha256_json({"slot": slot.to_dict(), "kind": "model"})
    context_hash = sha256_json({"slot": slot.to_dict(), "kind": "context"})
    case_hash = sha256_json(
        {
            "slot": slot.to_dict(),
            "truth_receipt_hash": truth_hash,
            "prepared_input_hash": prepared_hash,
            "model_input_hash": model_hash,
            "context_binding_hash": context_hash,
            "execution_identity_hash": identity.identity_hash,
        }
    )
    diagnostics = _diagnostics(slot.replication_index)
    fit_hash = _fit_binding_hash(
        case_binding_hash=case_hash,
        truth_effect_size_sd=truth,
        posterior_mean=posterior_mean,
        posterior_sd=posterior_sd,
        interval_80_lower=lower,
        interval_80_upper=upper,
        interval_covers_truth=covered,
        internal_validation_signal_detected=signal,
        integration_diagnostics=diagnostics,
    )
    assert unique
    return _slot_result_with_hash(
        slot=slot,
        execution_mode="full",
        status="PASS",
        failing_checks=(),
        truth_effect_size_sd=truth,
        posterior_mean=posterior_mean,
        posterior_sd=posterior_sd,
        interval_80_lower=lower,
        interval_80_upper=upper,
        interval_covers_truth=covered,
        internal_validation_signal_detected=signal,
        prepared_input_hash=prepared_hash,
        model_input_hash=model_hash,
        context_binding_hash=context_hash,
        truth_receipt_hash=truth_hash,
        case_binding_hash=case_hash,
        fit_summary_hash=fit_hash,
        integration_diagnostics=diagnostics,
        execution_identity_hash=identity.identity_hash,
    )


def _passing_full_results(identity: ExecutionIdentity):
    rows = []
    for slot in required_calibration_slots():
        covered = slot.replication_index < 160
        signal = slot.effect_size_sd == 0.0 and slot.replication_index < 10
        rows.append(_result(slot, identity, covered=covered, signal=signal))
    return tuple(rows)


def test_plan_is_exact_unique_and_fixed():
    slots = required_calibration_slots()
    plan = longitudinal_replicated_validation_plan()
    assert len(slots) == LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT
    assert len({slot.slot_id for slot in slots}) == 1200
    assert len({slot.seed for slot in slots}) == 1200
    assert plan["replications_per_cell"] == 200
    assert plan["aggregate_measurement_cell_k"] == 16
    assert plan["chunk_count"] == 20
    assert plan["accepted_concordance"]["acceptance_record_sha256"] == (
        LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256
    )
    chunk_ids = []
    for index in range(20):
        chunk = calibration_chunk_plan(index)
        assert chunk["expected_slot_count"] == 60
        chunk_ids.extend(chunk["slot_ids"])
    assert len(chunk_ids) == 1200
    assert len(set(chunk_ids)) == 1200
    assert set(chunk_ids) == {slot.slot_id for slot in slots}


def test_seed_inputs_are_strict_and_collision_free():
    assert calibration_seed(
        effect_size_sd=0.0, panel_group_count=6, replication_index=0
    ) == 202607130
    with pytest.raises(ValueError):
        calibration_seed(
            effect_size_sd=0.0, panel_group_count=6, replication_index=True
        )
    with pytest.raises(ValueError):
        calibration_seed(
            effect_size_sd=0.0, panel_group_count=6, replication_index=200
        )


def test_artifact_timestamp_requires_rfc3339_seconds():
    assert (
        _validated_generated_at("2026-07-12T00:00:00+00:00")
        == "2026-07-12T00:00:00+00:00"
    )
    for invalid in (
        "2026-07-12T00:00+00:00",
        "2026-02-30T00:00:00+00:00",
        "2026-07-12T24:00:00+00:00",
    ):
        with pytest.raises(ValueError, match="RFC3339"):
            _validated_generated_at(invalid)


def test_checkpoint_writes_are_create_once_and_workspace_stays_outside_repo(tmp_path):
    target = tmp_path / "slot.json"
    write_json_atomic(target, {"state": "HOLD"})
    write_json_atomic(target, {"state": "HOLD"})
    with pytest.raises(ReplicatedValidationWorkspaceError, match="different content"):
        write_json_atomic(target, {"state": "PASS"})
    with pytest.raises(ReplicatedValidationWorkspaceError, match="outside"):
        initialize_replicated_validation_workspace("inference/evidence/checkpoints")


def test_checkpoint_workspace_rejects_child_symlink_escape(tmp_path):
    workspace = initialize_replicated_validation_workspace(tmp_path / "workspace")
    escape = tmp_path / "escape"
    escape.mkdir()
    (workspace / "calibration_slots").symlink_to(escape, target_is_directory=True)

    with pytest.raises(ReplicatedValidationWorkspaceError, match="symlink"):
        initialize_replicated_validation_workspace(workspace)


def test_checkpoint_workspace_rejects_symlinked_root_before_writing(tmp_path):
    target = tmp_path / "workspace-target"
    target.mkdir()
    symlinked_root = tmp_path / "workspace-link"
    symlinked_root.symlink_to(target, target_is_directory=True)

    with pytest.raises(ReplicatedValidationWorkspaceError, match="symlink"):
        initialize_replicated_validation_workspace(symlinked_root)
    assert not (target / "plan.json").exists()


def test_execution_identity_rejects_unpinned_runtime(monkeypatch):
    monkeypatch.setattr(
        runner.importlib.metadata,
        "version",
        lambda _package: "9.9.9",
    )
    with pytest.raises(ReplicatedValidationError, match="pinned pymc"):
        build_execution_identity(require_clean=False)


def test_execution_identity_requires_the_entire_worktree_to_be_clean(monkeypatch):
    real_git_output = runner._git_output
    status_calls = []

    def dirty_git_output(*args):
        if args and args[0] == "status":
            status_calls.append(args)
            return "?? sitecustomize.py"
        return real_git_output(*args)

    monkeypatch.setattr(runner, "_git_output", dirty_git_output)

    with pytest.raises(ReplicatedValidationError, match="entirely clean worktree"):
        build_execution_identity(require_clean=True)
    assert status_calls == [("status", "--porcelain", "--untracked-files=all")]


def test_execution_identity_hashes_committed_concordance_evidence(monkeypatch):
    real_file_sha256 = runner._file_sha256

    def drift_full_artifact(path):
        if path.name == "longitudinal_state_space_nuts_concordance_full_2026_07.json":
            return "0" * 64
        return real_file_sha256(path)

    monkeypatch.setattr(runner, "_file_sha256", drift_full_artifact)
    with pytest.raises(ReplicatedValidationError, match="does not unblock"):
        runner._validated_concordance_acceptance_record()


def test_full_summary_uses_exact_integer_gates_and_fixed_denominators():
    identity = _identity()
    rows = _passing_full_results(identity)
    summary = summarize_calibration_results(rows, execution_mode="full")
    assert summary.study_status == "PASS"
    assert summary.exact_manifest_complete is True
    assert all(cell.coverage_count == 160 for cell in summary.cell_summaries)
    assert all(
        cell.null_signal_count == 10
        for cell in summary.cell_summaries
        if cell.effect_size_sd == 0.0
    )

    extra_null = list(rows)
    target = next(
        index
        for index, result in enumerate(extra_null)
        if result.slot.effect_size_sd == 0.0
        and result.slot.panel_group_count == 6
        and result.slot.replication_index == 10
    )
    extra_null[target] = _result(
        extra_null[target].slot, identity, covered=True, signal=True
    )
    failed = summarize_calibration_results(tuple(extra_null), execution_mode="full")
    assert failed.study_status == "HOLD"
    assert "null_false_signal" in failed.failing_checks

    missing = summarize_calibration_results(rows[:-1], execution_mode="full")
    assert missing.study_status == "HOLD"
    assert missing.cell_summaries[-1].expected_replication_count == 200
    assert missing.cell_summaries[-1].observed_replication_count == 199


def test_chunk_concatenation_order_differs_from_required_global_order():
    slots = required_calibration_slots()
    by_id = {slot.slot_id: slot for slot in slots}
    chunk_order = tuple(
        by_id[slot_id]
        for chunk_index in range(20)
        for slot_id in calibration_chunk_plan(chunk_index)["slot_ids"]
    )
    assert chunk_order != slots
    assert tuple(sorted(chunk_order)) == slots


def test_strict_slot_parser_rejects_derived_and_diagnostic_forgery():
    identity = _identity()
    result = _result(
        required_calibration_slots()[0], identity, covered=True, signal=False
    )
    assert calibration_slot_result_from_dict(result.to_dict()) == result

    malformed = result.to_dict()
    malformed["replication_index"] = 0.5
    with pytest.raises(ValueError):
        calibration_slot_result_from_dict(malformed)

    malformed = result.to_dict()
    malformed["integration_diagnostics"] = {}
    malformed["result_hash"] = sha256_json(
        {key: value for key, value in malformed.items() if key != "result_hash"}
    )
    with pytest.raises(ValueError):
        calibration_slot_result_from_dict(malformed)

    forged = result.to_dict()
    forged["interval_covers_truth"] = False
    forged["result_hash"] = sha256_json(
        {key: value for key, value in forged.items() if key != "result_hash"}
    )
    with pytest.raises(ValueError):
        calibration_slot_result_from_dict(forged)

    inverted = result.to_dict()
    inverted["posterior_summary"]["credible_interval_80"] = {
        "lower": 1.0,
        "upper": -1.0,
    }
    inverted["interval_covers_truth"] = False
    inverted["fit_summary_hash"] = _fit_binding_hash(
        case_binding_hash=inverted["case_binding_hash"],
        truth_effect_size_sd=inverted["truth_effect_size_sd"],
        posterior_mean=inverted["posterior_summary"]["posterior_mean"],
        posterior_sd=inverted["posterior_summary"]["posterior_sd"],
        interval_80_lower=1.0,
        interval_80_upper=-1.0,
        interval_covers_truth=False,
        internal_validation_signal_detected=inverted[
            "internal_validation_signal_detected"
        ],
        integration_diagnostics=inverted["integration_diagnostics"],
    )
    inverted["result_hash"] = sha256_json(
        {key: value for key, value in inverted.items() if key != "result_hash"}
    )
    with pytest.raises(ValueError, match="endpoints"):
        calibration_slot_result_from_dict(inverted)


def test_real_slot_recomputes_case_and_rejects_coordinated_receipt_rebind():
    identity = _identity()
    slot = required_calibration_slots()[0]
    result = run_calibration_slot(
        slot, execution_identity=identity, execution_mode="smoke"
    )
    assert result.passed
    recompute_calibration_case_receipt(result)

    fake_prepared = "f" * 64
    fake_case = sha256_json(
        {
            "slot": slot.to_dict(),
            "truth_receipt_hash": result.truth_receipt_hash,
            "prepared_input_hash": fake_prepared,
            "model_input_hash": result.model_input_hash,
            "context_binding_hash": result.context_binding_hash,
            "execution_identity_hash": identity.identity_hash,
        }
    )
    fake_fit = _fit_binding_hash(
        case_binding_hash=fake_case,
        truth_effect_size_sd=result.truth_effect_size_sd,
        posterior_mean=result.posterior_mean,
        posterior_sd=result.posterior_sd,
        interval_80_lower=result.interval_80_lower,
        interval_80_upper=result.interval_80_upper,
        interval_covers_truth=result.interval_covers_truth,
        internal_validation_signal_detected=(
            result.internal_validation_signal_detected
        ),
        integration_diagnostics=result.integration_diagnostics,
    )
    rebound = replace(
        result,
        prepared_input_hash=fake_prepared,
        case_binding_hash=fake_case,
        fit_summary_hash=fake_fit,
        result_hash="",
    )
    rebound = replace(rebound, result_hash=sha256_json(rebound.body_without_hash()))
    validate_calibration_slot_result(rebound)
    with pytest.raises(ValueError, match="deterministic case recomputation"):
        recompute_calibration_case_receipt(rebound)
