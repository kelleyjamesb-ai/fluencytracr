from dataclasses import replace
import json
from pathlib import Path
import sys

import pytest

from fluencytracr_inference.ai_fluency_measurement_calibration import (
    MeasurementCalibrationSlotResult,
)
from fluencytracr_inference.ai_fluency_measurement_calibration_artifact import (
    validate_measurement_calibration_execution_identity,
)
from fluencytracr_inference.ai_fluency_measurement_calibration_resumable import (
    MEASUREMENT_CALIBRATION_CHUNK_COUNT,
    MEASUREMENT_CALIBRATION_REQUIRED_SLOT_COUNT,
    MEASUREMENT_CALIBRATION_SLOTS_PER_CHUNK,
    MeasurementCalibrationWorkspaceError,
    _checkpoint_record,
    build_measurement_calibration_execution_identity,
    emit_resumable_measurement_calibration_artifact,
    load_complete_primary_study,
    measurement_calibration_chunk_plan,
    measurement_calibration_resumable_plan,
    measurement_calibration_workspace_path,
    required_measurement_calibration_slot_keys,
    runner_implementation_manifest,
    run_measurement_calibration_chunk,
    run_measurement_calibration_phase,
    write_json_atomic,
)
from fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli import (
    main,
)
from fluencytracr_inference.hashing import sha256_json


EXPECTED_FAILURE = {
    "invariant": None,
    "invariant_latent_shift": None,
    "loading_drift": "loading_invariance",
    "threshold_drift": "threshold_invariance",
}


def _fake_slot(scenario: str, replication_index: int) -> MeasurementCalibrationSlotResult:
    expected = EXPECTED_FAILURE[scenario]
    failures = [] if expected is None else [expected]
    seed = next(
        seed
        for planned_scenario, planned_index, seed in required_measurement_calibration_slot_keys()
        if (planned_scenario, planned_index) == (scenario, replication_index)
    )
    body = {
        "scenario": scenario,
        "replication_index": replication_index,
        "seed": seed,
        "expected_failing_diagnostic": expected,
        "failing_diagnostics": failures,
        "expected_result_observed": True,
        "recovery_passed": True,
        "runner_error": None,
        "package_hash": sha256_json(["package", scenario, replication_index]),
        "fit_hash": sha256_json(["fit", scenario, replication_index]),
        "diagnostics_hash": sha256_json(["diagnostics", scenario, replication_index]),
    }
    return MeasurementCalibrationSlotResult(
        scenario=scenario,
        replication_index=replication_index,
        seed=seed,
        expected_failing_diagnostic=expected,
        failing_diagnostics=tuple(failures),
        expected_result_observed=True,
        recovery_passed=True,
        runner_error=None,
        package_hash=body["package_hash"],
        fit_hash=body["fit_hash"],
        diagnostics_hash=body["diagnostics_hash"],
        result_hash=sha256_json(body),
    )


def _fake_identity() -> dict:
    body = {
        "source_commit": "a" * 40,
        "source_tree_clean": True,
        "plan_hash": measurement_calibration_resumable_plan()["plan_hash"],
        "implementation_manifest": runner_implementation_manifest(),
        "requirements_lock_hash": "b" * 64,
        "runtime": {
            "python": "3.13.12",
            "python_implementation": "CPython",
            "python_compiler": "Clang 15.0.0",
            "platform_system": "Darwin",
            "platform_release": "25.0.0",
            "platform_machine": "arm64",
            "platform_tag": "macosx-15.0-arm64",
            "python_executable_sha256": "c" * 64,
            "native_binary_manifest_hash": "d" * 64,
            "numpy_build_config_hash": "d" * 64,
            "blas_backend_hash": "e" * 64,
            "threadpool_runtime_hash": "f" * 64,
            "threadpool_runtime_entry_count": 0,
            "python_thread_count": 1,
            "thread_environment": {
                "MKL_NUM_THREADS": "1",
                "NUMEXPR_NUM_THREADS": "1",
                "OMP_NUM_THREADS": "1",
                "OPENBLAS_NUM_THREADS": "1",
                "VECLIB_MAXIMUM_THREADS": "1",
            },
            "arviz": "1.2.0",
            "numpy": "2.4.6",
            "pymc": "6.0.1",
            "scipy": "1.18.0",
            "threadpoolctl": "3.6.0",
        },
    }
    return {**body, "identity_hash": sha256_json(body)}


def _fake_generation_identity() -> dict:
    workspace_identity = _fake_identity()
    body = {
        **{
            key: value
            for key, value in workspace_identity.items()
            if key != "identity_hash"
        },
        "workspace_identity_hash": workspace_identity["identity_hash"],
        "primary_phase_hash": "1" * 64,
        "recompute_phase_hash": "2" * 64,
        "primary_checkpoint_manifest_hash": "3" * 64,
        "recompute_checkpoint_manifest_hash": "4" * 64,
        "primary_process_tokens_hash": "5" * 64,
        "recompute_process_tokens_hash": "6" * 64,
        "separate_phase_execution": True,
    }
    return {**body, "identity_hash": sha256_json(body)}


@pytest.fixture
def fast_runner(monkeypatch):
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "build_measurement_calibration_execution_identity",
        lambda **_kwargs: _fake_identity(),
    )
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "run_measurement_calibration_slot",
        lambda *, scenario, replication_index: _fake_slot(scenario, replication_index),
    )


def test_compiled_resumable_plan_is_exact_and_not_runtime_tunable():
    plan = measurement_calibration_resumable_plan()
    slots = required_measurement_calibration_slot_keys()

    assert plan["replications_per_scenario"] == 200
    assert plan["required_slot_count"] == len(slots) == 800
    assert len({seed for _, _, seed in slots}) == 800
    assert plan["phase_order"] == ["primary", "recompute"]
    assert plan["chunk_count"] == MEASUREMENT_CALIBRATION_CHUNK_COUNT == 20
    assert plan["slots_per_chunk"] == MEASUREMENT_CALIBRATION_SLOTS_PER_CHUNK == 40
    assert all(
        plan[key] is False
        for key in (
            "thresholds_runtime_configurable",
            "seeds_runtime_configurable",
            "scenarios_runtime_configurable",
            "replication_count_runtime_configurable",
            "chunk_size_runtime_configurable",
            "worker_count_runtime_configurable",
        )
    )
    chunk_ids = [
        slot_id
        for index in range(20)
        for slot_id in measurement_calibration_chunk_plan(index)["slot_ids"]
    ]
    assert len(chunk_ids) == len(set(chunk_ids)) == 800


def test_real_execution_identity_binds_native_runtime(monkeypatch):
    for key in (
        "MKL_NUM_THREADS",
        "NUMEXPR_NUM_THREADS",
        "OMP_NUM_THREADS",
        "OPENBLAS_NUM_THREADS",
        "VECLIB_MAXIMUM_THREADS",
    ):
        monkeypatch.setenv(key, "1")
    identity = build_measurement_calibration_execution_identity(require_clean=False)
    runtime = identity["runtime"]

    assert len(identity["source_commit"]) == 40
    assert identity["plan_hash"] == measurement_calibration_resumable_plan()["plan_hash"]
    assert identity["requirements_lock_hash"]
    assert len(identity["implementation_manifest"]["files"]) == 14
    assert runtime["python"] == (
        f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    )
    assert runtime["python_implementation"] == "CPython"
    assert runtime["python_thread_count"] == 1
    assert runtime["threadpool_runtime_entry_count"] >= 0
    assert all(value == "1" for value in runtime["thread_environment"].values())
    for key in (
        "python_executable_sha256",
        "native_binary_manifest_hash",
        "numpy_build_config_hash",
        "blas_backend_hash",
        "threadpool_runtime_hash",
    ):
        assert len(runtime[key]) == 64
    assert {
        key: runtime[key]
        for key in ("arviz", "numpy", "pymc", "scipy", "threadpoolctl")
    } == {
        "arviz": "1.2.0",
        "numpy": "2.4.6",
        "pymc": "6.0.1",
        "scipy": "1.18.0",
        "threadpoolctl": "3.6.0",
    }


def test_primary_chunk_resumes_only_missing_create_once_slots(
    tmp_path, monkeypatch, fast_runner
):
    calls = []

    def interrupted(*, scenario, replication_index):
        calls.append((scenario, replication_index))
        if len(calls) == 4:
            raise KeyboardInterrupt
        return _fake_slot(scenario, replication_index)

    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "run_measurement_calibration_slot",
        interrupted,
    )
    workspace = tmp_path / "measurement-checkpoints"
    with pytest.raises(KeyboardInterrupt):
        run_measurement_calibration_chunk(
            phase="primary", chunk_index=0, workspace_dir=workspace
        )
    assert len(list((workspace / "primary" / "slots").glob("*.json"))) == 3

    resumed_calls = []
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "run_measurement_calibration_slot",
        lambda *, scenario, replication_index: (
            resumed_calls.append((scenario, replication_index))
            or _fake_slot(scenario, replication_index)
        ),
    )
    chunk = run_measurement_calibration_chunk(
        phase="primary", chunk_index=0, workspace_dir=workspace
    )
    assert len(resumed_calls) == 37
    assert chunk["runner_error_count"] == 0
    assert len(list((workspace / "primary" / "slots").glob("*.json"))) == 40

    resumed_calls.clear()
    assert (
        run_measurement_calibration_chunk(
            phase="primary", chunk_index=0, workspace_dir=workspace
        )
        == chunk
    )
    assert resumed_calls == []


def test_partial_primary_cannot_start_recomputation(tmp_path, fast_runner):
    workspace = tmp_path / "measurement-checkpoints"
    run_measurement_calibration_chunk(
        phase="primary", chunk_index=0, workspace_dir=workspace
    )
    with pytest.raises(MeasurementCalibrationWorkspaceError, match="not exact"):
        run_measurement_calibration_chunk(
            phase="recompute", chunk_index=0, workspace_dir=workspace
        )


def test_chunks_must_run_in_serial_order(tmp_path, fast_runner):
    with pytest.raises(MeasurementCalibrationWorkspaceError, match="serial order"):
        run_measurement_calibration_chunk(
            phase="primary",
            chunk_index=1,
            workspace_dir=tmp_path / "measurement-checkpoints",
        )


def test_recomputation_requires_a_distinct_process_identity(tmp_path, fast_runner):
    workspace = tmp_path / "measurement-checkpoints"
    run_measurement_calibration_phase(phase="primary", workspace_dir=workspace)
    with pytest.raises(MeasurementCalibrationWorkspaceError, match="process"):
        run_measurement_calibration_chunk(
            phase="recompute", chunk_index=0, workspace_dir=workspace
        )


def test_corrupt_or_cross_phase_checkpoint_rejects(tmp_path, fast_runner):
    workspace = tmp_path / "measurement-checkpoints"
    run_measurement_calibration_chunk(
        phase="primary", chunk_index=0, workspace_dir=workspace
    )
    slot = workspace / "primary" / "slots" / "invariant__rep_000.json"
    record = json.loads(slot.read_text(encoding="utf-8"))
    record["phase"] = "recompute"
    slot.write_text(json.dumps(record), encoding="utf-8")

    with pytest.raises(MeasurementCalibrationWorkspaceError, match="binding"):
        run_measurement_calibration_chunk(
            phase="primary", chunk_index=0, workspace_dir=workspace
        )


def test_two_phase_workspace_emits_exact_summary_only_artifact(
    tmp_path, monkeypatch, fast_runner
):
    workspace = tmp_path / "measurement-checkpoints"
    primary_chunks = run_measurement_calibration_phase(
        phase="primary", workspace_dir=workspace
    )
    study = load_complete_primary_study(workspace)
    assert len(primary_chunks) == 20
    assert len(study.slot_results) == MEASUREMENT_CALIBRATION_REQUIRED_SLOT_COUNT
    assert study.failing_checks == ()

    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "_PROCESS_RUN_TOKEN",
        "2" * 32,
    )
    recompute_chunks = run_measurement_calibration_phase(
        phase="recompute", workspace_dir=workspace
    )
    assert len(recompute_chunks) == 20
    artifact = emit_resumable_measurement_calibration_artifact(
        workspace_dir=workspace,
        generated_at="2026-07-15T00:00:00+00:00",
    )
    assert artifact["state"] == "VALID_INTERNAL_SYNTHETIC_NON_AUTHORIZING"
    assert artifact["study"]["total_slot_count"] == 800
    assert artifact["study"]["failing_checks"] == []
    assert artifact["execution_identity"]["source_tree_clean"] is True
    assert artifact["execution_identity"]["separate_phase_execution"] is True
    assert artifact["execution_recomputation"]["verification_mode"] == (
        "separate_process_resumable_phase"
    )
    assert artifact["execution_recomputation"]["slot_result_hashes_hash"] == (
        artifact["study"]["slot_result_hashes_hash"]
    )
    assert "slot_results" not in artifact
    assert "slot_results" not in artifact["study"]
    assert all(value is False for value in artifact["blocked_outputs"].values())

    repeated = emit_resumable_measurement_calibration_artifact(
        workspace_dir=workspace
    )
    assert repeated == artifact


def test_recomputation_mismatch_never_writes_checkpoint(
    tmp_path, monkeypatch, fast_runner
):
    workspace = tmp_path / "measurement-checkpoints"
    run_measurement_calibration_phase(phase="primary", workspace_dir=workspace)
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "_PROCESS_RUN_TOKEN",
        "2" * 32,
    )

    def changed(*, scenario, replication_index):
        result = _fake_slot(scenario, replication_index)
        if (scenario, replication_index) == ("invariant", 0):
            return replace(result, package_hash="f" * 64)
        return result

    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "run_measurement_calibration_slot",
        changed,
    )
    with pytest.raises(MeasurementCalibrationWorkspaceError, match="differs"):
        run_measurement_calibration_chunk(
            phase="recompute", chunk_index=0, workspace_dir=workspace
        )
    assert not (
        workspace / "recompute" / "slots" / "invariant__rep_000.json"
    ).exists()


def test_copied_primary_result_cannot_mint_recompute_checkpoint():
    copied = _fake_slot("invariant", 0)
    with pytest.raises(MeasurementCalibrationWorkspaceError, match="fresh execution"):
        _checkpoint_record(
            phase="recompute",
            phase_hash="a" * 64,
            primary_study_hash="b" * 64,
            result=copied,
        )


def test_unexpected_nested_or_non_json_file_blocks_combine(
    tmp_path, monkeypatch, fast_runner
):
    workspace = tmp_path / "measurement-checkpoints"
    run_measurement_calibration_phase(phase="primary", workspace_dir=workspace)
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "_PROCESS_RUN_TOKEN",
        "2" * 32,
    )
    run_measurement_calibration_phase(phase="recompute", workspace_dir=workspace)
    unsafe = workspace / "recompute" / "slots" / "backup.raw"
    unsafe.write_text("unsafe", encoding="utf-8")
    with pytest.raises(MeasurementCalibrationWorkspaceError, match="tree"):
        emit_resumable_measurement_calibration_artifact(workspace_dir=workspace)


def test_atomic_checkpoint_is_create_once(tmp_path):
    path = tmp_path / "checkpoint.json"
    write_json_atomic(path, {"state": "HOLD"})
    write_json_atomic(path, {"state": "HOLD"})
    with pytest.raises(MeasurementCalibrationWorkspaceError, match="different content"):
        write_json_atomic(path, {"state": "PASS"})


def test_stale_atomic_temp_is_cleaned_before_resume(tmp_path, fast_runner):
    workspace = tmp_path / "measurement-checkpoints"
    run_measurement_calibration_chunk(
        phase="primary", chunk_index=0, workspace_dir=workspace
    )
    stale = workspace / "primary" / "slots" / ".slot.json.99999.tmp"
    stale.write_text("partial", encoding="utf-8")
    run_measurement_calibration_chunk(
        phase="primary", chunk_index=0, workspace_dir=workspace
    )
    assert not stale.exists()


def test_workspace_must_remain_outside_repository(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable."
        "build_measurement_calibration_execution_identity",
        lambda **_kwargs: _fake_identity(),
    )
    repo_child = Path(__file__).resolve().parents[2] / ".measurement-checkpoints"
    from fluencytracr_inference.ai_fluency_measurement_calibration_resumable import (
        initialize_measurement_calibration_workspace,
    )

    with pytest.raises(MeasurementCalibrationWorkspaceError, match="outside"):
        initialize_measurement_calibration_workspace(repo_child)


def test_execution_identity_rejects_minimal_or_unsafe_fabrication():
    with pytest.raises(ValueError, match="shape"):
        validate_measurement_calibration_execution_identity(
            {"identity_hash": "a" * 64, "source_tree_clean": True}
        )
    valid = _fake_generation_identity()
    validate_measurement_calibration_execution_identity(valid)
    unsafe = {
        **valid,
        "respondent_rows": [{"respondent_id": "person-1"}],
    }
    with pytest.raises(ValueError, match="shape"):
        validate_measurement_calibration_execution_identity(unsafe)


def test_resumable_cli_rejects_tunable_counts_and_returns_nonzero_on_hold(
    capsys, monkeypatch
):
    with pytest.raises(SystemExit):
        main(["run-primary", "--workspace", "/tmp/x", "--replications", "2"])
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli."
        "emit_resumable_measurement_calibration_artifact",
        lambda **_kwargs: {
            "state": "HOLD",
            "failing_checks": ["invariant_false_hold_rate"],
            "hash_bindings": {"artifact_self_hash": "a" * 64},
        },
    )
    output = Path("/tmp/x/ai_fluency_measurement_calibration_artifact.json")
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli."
        "measurement_calibration_workspace_path",
        lambda *_args: output,
    )
    monkeypatch.setattr(Path, "read_bytes", lambda _self: b"{}")
    assert main(["combine", "--workspace", "/tmp/x"]) == 2
    assert '"state":"HOLD"' in capsys.readouterr().out


def test_recompute_cli_propagates_failing_primary_study(capsys, monkeypatch):
    chunk = {"runner_error_count": 0, "slot_result_hashes": ["a" * 64] * 40}
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli."
        "run_measurement_calibration_phase",
        lambda **_kwargs: tuple(chunk for _ in range(20)),
    )
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli."
        "load_complete_primary_study",
        lambda _workspace: type(
            "FailingStudy", (), {"failing_checks": ("invariant_false_hold_rate",)}
        )(),
    )
    assert main(["run-recompute", "--workspace", "/tmp/x"]) == 2
    assert '"invariant_false_hold_rate"' in capsys.readouterr().out

    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli."
        "run_measurement_calibration_chunk",
        lambda **_kwargs: {
            "phase": "recompute",
            "chunk_index": 0,
            "chunk_hash": "a" * 64,
            "slot_result_hashes": ["b" * 64] * 40,
            "runner_error_count": 0,
        },
    )
    assert (
        main(
            [
                "run-recompute-chunk",
                "--chunk-index",
                "0",
                "--workspace",
                "/tmp/x",
            ]
        )
        == 2
    )
