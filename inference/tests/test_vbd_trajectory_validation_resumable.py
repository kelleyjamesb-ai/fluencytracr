from copy import deepcopy
from contextlib import contextmanager
import os
from pathlib import Path

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_validation_plan import (
    immutable_vbd_trajectory_validation_plan,
    required_vbd_trajectory_canaries,
    required_vbd_trajectory_validation_slots,
)
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    VBD_TRAJECTORY_FREEZE_MANIFEST_SCHEMA_VERSION,
    VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION,
    VbdTrajectoryValidationWorkspaceError,
    _canary_chain_root,
    _canary_phase_manifest,
    _combined_commit_record,
    _canonical_json_bytes,
    _cleanup_stale_atomic_temps,
    _decode_json_bytes,
    _execution_evidence_snapshot,
    _exclusive_lock,
    _launch_receipt,
    _launch_child,
    _load_workspace,
    _phase_manifest_body,
    _revalidate_launch_admission,
    _run_one_study_slot,
    _validate_canary_receipt,
    _validate_combined_commit,
    _validate_combined_value,
    _validate_concordance_receipt,
    _validate_freeze_manifest,
    _validate_progress_state,
    _validate_tree_links,
    _validate_workspace_record,
    _workspace_record,
    initialize_vbd_trajectory_validation_workspace,
    read_strict_json,
    run_vbd_trajectory_validation_canary,
    run_vbd_trajectory_validation_chunk,
    combine_vbd_trajectory_validation_workspace,
    vbd_trajectory_validation_runner_summary,
    write_json_create_once,
)


def _fake_workspace_record(workspace: Path | None = None):
    location = (
        {
            "workspace_path_hash": sha256_json(str(workspace)),
            "workspace_device": workspace.stat(follow_symlinks=False).st_dev,
            "workspace_inode": workspace.stat(follow_symlinks=False).st_ino,
        }
        if workspace is not None
        else {
            "workspace_path_hash": "6" * 64,
            "workspace_device": 1,
            "workspace_inode": 1,
        }
    )
    body = {
        "schema_version": "FT_AI_VALUE_VBD_TRAJECTORY_RUNNER_WORKSPACE_2026_07_V1",
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "b" * 64,
        "candidate_source_commit": "c" * 40,
        "candidate_source_tree": "d" * 40,
        "implementation_hash": "e" * 64,
        "runtime_identity_hash": "f" * 64,
        "executable_sha256": "7" * 64,
        "native_library_identity_hash": "8" * 64,
        "plan_hash": immutable_vbd_trajectory_validation_plan().plan_hash,
        "seed_manifest_hash": immutable_vbd_trajectory_validation_plan().seeds_hash,
        "concordance_receipt_hash": "1" * 64,
        **location,
        "created_at": "2026-07-15T12:00:00+00:00",
        "workspace_token": "2" * 64,
        "phase_order": ["original", "recomputation"],
        "required_slot_count_per_phase": 2_000,
        "required_canary_count": 4,
        "threat_model": (
            "trusted_frozen_host_crash_replay_and_workspace_tamper_detection_v1"
        ),
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    return {**body, "workspace_hash": sha256_json(body)}


def _phase_manifest(record, phase="original"):
    body = _phase_manifest_body(
        phase=phase, workspace_record=record, original_study_hash=None
    )
    return {**body, "phase_hash": sha256_json(body)}


def _capability_token():
    return "9" * 64


def _fake_combined(record):
    def execution_root(phase, phase_hash, fill):
        root_body = {
            "phase": phase,
            "phase_hash": phase_hash,
            "ordered_checkpoint_hashes_hash": fill * 64,
            "ordered_launch_receipt_hashes_hash": chr(ord(fill) + 1) * 64,
            "ordered_execution_attestation_hashes_hash": chr(ord(fill) + 2)
            * 64,
            "ordered_chunk_result_hashes_hash": chr(ord(fill) + 3) * 64,
        }
        return {**root_body, "execution_root_hash": sha256_json(root_body)}

    original_phase_hash = "e" * 64
    recomputation_phase_hash = "f" * 64
    body = {
        "schema_version": "FT_AI_VALUE_VBD_TRAJECTORY_RESUMABLE_COMBINED_2026_07_V1",
        "workspace_hash": record["workspace_hash"],
        "freeze_commit": record["freeze_commit"],
        "freeze_manifest_hash": record["freeze_manifest_hash"],
        "plan_hash": record["plan_hash"],
        "concordance_receipt_hash": record["concordance_receipt_hash"],
        "original_study_hash": "a" * 64,
        "recomputation_study_hash": "b" * 64,
        "semantic_combined_hash": "c" * 64,
        "canary_phase_hash": "d" * 64,
        "original_phase_hash": original_phase_hash,
        "recomputation_phase_hash": recomputation_phase_hash,
        "original_execution_roots": execution_root(
            "original", original_phase_hash, "1"
        ),
        "recomputation_execution_roots": execution_root(
            "recomputation", recomputation_phase_hash, "5"
        ),
        "execution_evidence_snapshot_hash": "1" * 64,
        "original_process_tokens_hash": "2" * 64,
        "recomputation_process_tokens_hash": "3" * 64,
        "original_process_count": 2_000,
        "recomputation_process_count": 2_000,
        "process_tokens_disjoint": True,
        "phase_identities_disjoint": True,
        "canary_chain_root": "4" * 64,
        "canary_receipt_hashes_hash": "5" * 64,
        "canary_receipt_chain_tip": "6" * 64,
        "canary_process_token_hashes_hash": "7" * 64,
        "all_process_tokens_pairwise_disjoint": True,
        "all_execution_tokens_hash": "8" * 64,
        "all_execution_tokens_pairwise_disjoint": True,
        "fresh_semantic_results_match": True,
        "state": "PASS",
        "failing_checks": [],
        "threat_model": (
            "trusted_frozen_host_crash_replay_and_workspace_tamper_detection_v1"
        ),
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "confidence_output_authorized": False,
        "probability_output_authorized": False,
        "roi_output_authorized": False,
        "causality_output_authorized": False,
        "productivity_output_authorized": False,
        "independent_acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    return {**body, "combined_hash": sha256_json(body)}


def test_runner_summary_is_nonexecuting_and_exact():
    value = vbd_trajectory_validation_runner_summary()
    assert value["slot_count_per_phase"] == 2_000
    assert value["fresh_process_count_required"] == 4_000
    assert value["canary_count"] == 4
    assert value["concordance_admission_implemented"] is False
    assert value["acceptance_plan_execution_authorized"] is False
    assert value["task_5_6_complete"] is False


def test_strict_json_rejects_duplicate_and_nonfinite_values():
    for encoded in (b'{"a":1,"a":1}', b'{"a":NaN}', b"not-json"):
        with pytest.raises(VbdTrajectoryValidationWorkspaceError):
            _decode_json_bytes(encoded, "test value")


def test_checkpoint_reader_rejects_noncanonical_json_bytes(tmp_path):
    path = tmp_path / "pretty.json"
    path.write_text('{\n  "value": 1\n}\n', encoding="utf-8")
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="canonical byte form"
    ):
        read_strict_json(path)


def test_create_once_bytes_cannot_be_replaced(tmp_path):
    path = tmp_path / "record.json"
    write_json_create_once(path, {"value": 1})
    write_json_create_once(path, {"value": 1})
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        write_json_create_once(path, {"value": 2})
    assert read_strict_json(path) == {"value": 1}


def test_create_once_rejects_temporary_inode_replacement_before_link(
    tmp_path, monkeypatch
):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    real_link = runner.os.link

    def replace_then_link(source, destination, **kwargs):
        source_path = Path(source)
        source_path.unlink()
        source_path.write_text('{"forged":true}\n', encoding="utf-8")
        return real_link(source, destination, **kwargs)

    monkeypatch.setattr(runner.os, "link", replace_then_link)
    destination = tmp_path / "record.json"
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="original temporary"
    ):
        write_json_create_once(destination, {"value": 1})
    assert not destination.exists()


def test_execution_evidence_snapshot_changes_with_any_bound_file(
    tmp_path, monkeypatch
):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    monkeypatch.setattr(runner, "_ROOT_STATIC_FILES", {"workspace.json"})
    monkeypatch.setattr(runner, "_PHASE_STATIC_FILES", {"phase.json"})
    monkeypatch.setattr(
        runner, "required_vbd_trajectory_canaries", lambda: (object(),)
    )
    monkeypatch.setattr(runner, "VBD_TRAJECTORY_VALIDATION_PHASES", ("original",))
    monkeypatch.setattr(runner, "VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT", 1)
    monkeypatch.setattr(runner, "VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT", 1)
    paths = [tmp_path / "workspace.json"] + [
        tmp_path / "evidence" / f"file_{index}.json" for index in range(8)
    ]
    for index, path in enumerate(paths):
        write_json_create_once(path, {"value": index})
    first = _execution_evidence_snapshot(tmp_path)
    assert first["file_count"] == 9
    paths[-1].unlink()
    write_json_create_once(paths[-1], {"value": 99})
    second = _execution_evidence_snapshot(tmp_path)
    assert second["snapshot_hash"] != first["snapshot_hash"]


def test_workspace_directory_lock_detects_replaced_lock_inode(tmp_path):
    lock = tmp_path / ".runner.lock"
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="lock identity changed"
    ):
        with _exclusive_lock(lock) as verify_lock:
            lock.unlink()
            lock.write_text("replacement", encoding="utf-8")
            verify_lock()


def test_workspace_directory_lock_detects_replaced_workspace_inode(tmp_path):
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    lock = workspace / ".runner.lock"
    displaced = tmp_path / "displaced"
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="lock identity changed"
    ):
        with _exclusive_lock(lock) as verify_lock:
            workspace.rename(displaced)
            workspace.mkdir()
            verify_lock()


def test_workspace_identity_rejects_copy_and_idle_rename(tmp_path):
    workspace = tmp_path / "workspace"
    copied = tmp_path / "copied"
    renamed = tmp_path / "renamed"
    workspace.mkdir()
    copied.mkdir()
    record = _fake_workspace_record(workspace)
    assert _validate_workspace_record(record, workspace=workspace) == record
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="location differs"
    ):
        _validate_workspace_record(record, workspace=copied)
    workspace.rename(renamed)
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="location differs"
    ):
        _validate_workspace_record(record, workspace=renamed)


def test_safe_stale_atomic_temp_is_removed_for_resume(tmp_path):
    temporary = tmp_path / ".slot_0000.json.123.456.tmp"
    temporary.write_text("partial", encoding="utf-8")
    _cleanup_stale_atomic_temps(tmp_path)
    assert not temporary.exists()

    linked_temp = tmp_path / ".checkpoint.json.123.789.tmp"
    destination = tmp_path / "checkpoint.json"
    linked_temp.write_text('{"complete":true}\n', encoding="utf-8")
    os.link(linked_temp, destination)
    assert linked_temp.stat().st_nlink == 2
    _cleanup_stale_atomic_temps(tmp_path)
    assert not linked_temp.exists()
    assert destination.read_text(encoding="utf-8") == '{"complete":true}\n'
    assert destination.stat().st_nlink == 1


def test_initialization_recovers_linked_atomic_temp_before_tree_validation(
    tmp_path, monkeypatch
):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    repo = tmp_path / "repo"
    manifest = repo / runner.VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
    manifest.parent.mkdir(parents=True)
    manifest.write_text("{}\n", encoding="utf-8")
    concordance = tmp_path / "concordance.json"
    concordance.write_text("{}\n", encoding="utf-8")
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    temporary = workspace / ".plan.json.123.456.tmp"
    destination = workspace / "plan.json"
    temporary.write_text("{}\n", encoding="utf-8")
    os.link(temporary, destination)

    monkeypatch.setattr(runner, "_repo_root", lambda: repo)

    def stop_after_cleanup(_value):
        assert not temporary.exists()
        assert destination.stat().st_nlink == 1
        raise VbdTrajectoryValidationWorkspaceError("stop after cleanup")

    monkeypatch.setattr(runner, "_verify_current_freeze", stop_after_cleanup)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError, match="after cleanup"):
        initialize_vbd_trajectory_validation_workspace(
            workspace,
            freeze_manifest_path=manifest,
            concordance_receipt_path=concordance,
        )


def test_tree_rejects_symlink_hardlink_and_special_aliases(tmp_path):
    source = tmp_path / "source.json"
    source.write_text("{}\n", encoding="utf-8")
    _validate_tree_links(tmp_path)
    hard = tmp_path / "hard.json"
    os.link(source, hard)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_tree_links(tmp_path)
    hard.unlink()
    link = tmp_path / "link.json"
    link.symlink_to(source)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_tree_links(tmp_path)


def test_freeze_manifest_requires_exact_source_set_and_self_hash():
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    files = [
        {"path": path, "sha256": sha256_json(path)}
        for path in sorted(runner._RUNNER_SOURCE_PATHS)
    ]
    body = {
        "schema_version": VBD_TRAJECTORY_FREEZE_MANIFEST_SCHEMA_VERSION,
        "candidate_source_commit": "a" * 40,
        "candidate_source_tree": "b" * 40,
        "in_scope_files": files,
        "in_scope_files_hash": sha256_json(files),
        "implementation_review_refs": {
            "CODE": "review:code-go",
            "BUG": "review:bug-go",
            "ADVERSARIAL": "review:adversarial-go",
            "STATISTICAL_METHODOLOGY": "review:statistical-go",
        },
        "runtime_identity_hash": "c" * 64,
        "implementation_hash": "d" * 64,
        "requirements_lock_hash": "e" * 64,
        "generator_source_hash": "f" * 64,
        "interface_source_hash": "1" * 64,
        "plan_hash": immutable_vbd_trajectory_validation_plan().plan_hash,
        "seed_manifest_hash": immutable_vbd_trajectory_validation_plan().seeds_hash,
        "pre_run_roots_hash": "2" * 64,
        "allowed_command_ids": list(runner._ALLOWED_COMMAND_IDS),
        "execution_state": "NOT_RUN",
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    value = {**body, "manifest_hash": sha256_json(body)}
    assert _validate_freeze_manifest(value) == value
    missing = deepcopy(value)
    missing["in_scope_files"].pop()
    missing["in_scope_files_hash"] = sha256_json(missing["in_scope_files"])
    missing_body = {key: item for key, item in missing.items() if key != "manifest_hash"}
    missing["manifest_hash"] = sha256_json(missing_body)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_freeze_manifest(missing)


def test_self_hashed_concordance_pass_cannot_initialize_replication():
    freeze_identity = {
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "b" * 64,
        "plan_hash": immutable_vbd_trajectory_validation_plan().plan_hash,
    }
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION,
        **freeze_identity,
        "bundle_count": 30,
        "primary_deterministic_lane_fit_count": 90,
        "nuts_lane_fit_count": 90,
        "fresh_deterministic_lane_fit_count": 90,
        "bundle_records_hash": "1" * 64,
        "primary_deterministic_records_hash": "2" * 64,
        "nuts_records_hash": "3" * 64,
        "fresh_deterministic_records_hash": "4" * 64,
        "execution_attestations_hash": "5" * 64,
        "hard_failure_count": 0,
        "cross_engine_failure_count": 0,
        "sampler_failure_count": 0,
        "ppc_failure_count": 0,
        "state": "PASS",
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
    }
    receipt = {**body, "receipt_hash": sha256_json(body)}
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError,
        match="concordance admission remains disabled",
    ):
        _validate_concordance_receipt(receipt, freeze_identity)


def test_workspace_load_rejects_tampered_plan_before_other_admission(tmp_path):
    write_json_create_once(
        tmp_path / "workspace.json", _fake_workspace_record(tmp_path)
    )
    write_json_create_once(tmp_path / "plan.json", {"off_plan": True})
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="plan is malformed or off plan"
    ):
        _load_workspace(tmp_path)


@pytest.mark.parametrize("entrypoint", ["chunk", "canary", "combine"])
def test_execution_entrypoints_load_workspace_only_under_lock(
    tmp_path, monkeypatch, entrypoint
):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    lock_held = False

    @contextmanager
    def fake_lock(_path):
        nonlocal lock_held
        lock_held = True
        try:
            yield lambda: None
        finally:
            lock_held = False

    def stop_after_locked_load(_path):
        assert lock_held is True
        raise VbdTrajectoryValidationWorkspaceError("stop after locked load")

    monkeypatch.setattr(runner, "_exclusive_lock", fake_lock)
    monkeypatch.setattr(runner, "_load_workspace", stop_after_locked_load)
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="after locked load"
    ):
        if entrypoint == "chunk":
            run_vbd_trajectory_validation_chunk(
                phase="original", chunk_index=0, workspace_dir=tmp_path
            )
        elif entrypoint == "canary":
            run_vbd_trajectory_validation_canary(
                canary_index=0, workspace_dir=tmp_path
            )
        else:
            combine_vbd_trajectory_validation_workspace(tmp_path)


def test_orphaned_launch_becomes_durable_runner_error_without_relaunch(
    tmp_path, monkeypatch
):
    record = _fake_workspace_record()
    phase = _phase_manifest(record)
    slot = required_vbd_trajectory_validation_slots()[0]
    launch = _launch_receipt(
        execution_kind="study",
        phase="original",
        phase_hash=phase["phase_hash"],
        phase_token=phase["phase_token"],
        slot=slot,
        slot_index=0,
        workspace_record=record,
        canary=None,
        capability_token_hash=sha256_json(_capability_token()),
    )
    launch_path = tmp_path / "original" / "launches" / "slot_0000.json"
    write_json_create_once(launch_path, launch)
    monkeypatch.setattr(
        "fluencytracr_inference.vbd_trajectory_validation_resumable._launch_child",
        lambda **kwargs: pytest.fail("orphaned receipt must never relaunch"),
    )
    result, checkpoint = _run_one_study_slot(
        workspace=tmp_path,
        workspace_record=record,
        phase_manifest=phase,
        slot_index=0,
        original_result=None,
        verify_lock_identity=lambda: None,
    )
    assert result.row_state == "RUNNER_ERROR"
    assert result.failure_code == "interrupted_launch"
    assert checkpoint["child_return_class"] == "interrupted_before_checkpoint"
    again, same_checkpoint = _run_one_study_slot(
        workspace=tmp_path,
        workspace_record=record,
        phase_manifest=phase,
        slot_index=0,
        original_result=None,
        verify_lock_identity=lambda: None,
    )
    assert again == result
    assert same_checkpoint == checkpoint


def test_child_failure_is_sanitized_and_create_once(tmp_path, monkeypatch):
    record = _fake_workspace_record()
    phase = _phase_manifest(record)
    calls = []

    def fail_child(**kwargs):
        receipt = kwargs["receipt"]
        calls.append(receipt["slot_id"])
        return 9999, 2, b"", b"private exception text"

    monkeypatch.setattr(
        "fluencytracr_inference.vbd_trajectory_validation_resumable._launch_child",
        fail_child,
    )
    result, checkpoint = _run_one_study_slot(
        workspace=tmp_path,
        workspace_record=record,
        phase_manifest=phase,
        slot_index=0,
        original_result=None,
        verify_lock_identity=lambda: None,
    )
    assert calls == [required_vbd_trajectory_validation_slots()[0].slot_id]
    assert result.failure_code == "child_process_failure"
    assert "private exception text" not in repr(checkpoint)
    assert checkpoint["child_stderr_hash"] != sha256_json(None)


def test_child_launch_uses_inherited_capability_and_liveness_pipes(monkeypatch):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    record = _fake_workspace_record()
    phase = _phase_manifest(record)
    slot = required_vbd_trajectory_validation_slots()[0]
    receipt = _launch_receipt(
        execution_kind="study",
        phase="original",
        phase_hash=phase["phase_hash"],
        phase_token=phase["phase_token"],
        slot=slot,
        slot_index=0,
        workspace_record=record,
        canary=None,
        capability_token_hash=sha256_json(_capability_token()),
    )
    captured = {}

    class FakeProcess:
        pid = 4242
        returncode = 0

        def __init__(self, _command, **kwargs):
            captured.update(kwargs)
            capability_fd, liveness_fd = kwargs["pass_fds"]
            self.capability_fd = os.dup(capability_fd)
            self.liveness_fd = os.dup(liveness_fd)

        def communicate(self, _stdin, timeout):
            assert timeout == runner.VBD_TRAJECTORY_CHILD_TIMEOUT_SECONDS
            encoded = bytearray()
            while True:
                block = os.read(self.capability_fd, 4096)
                if not block:
                    break
                encoded.extend(block)
            os.close(self.capability_fd)
            os.close(self.liveness_fd)
            captured["capability"] = _decode_json_bytes(
                bytes(encoded), "test capability"
            )
            return b"", b""

    monkeypatch.setattr(runner.subprocess, "Popen", FakeProcess)
    monkeypatch.setattr(runner, "_revalidate_launch_admission", lambda *_args: None)
    verifier_calls = []

    def verify_lock():
        verifier_calls.append(True)

    child_pid, return_code, stdout, stderr = _launch_child(
        receipt=receipt,
        capability_token=_capability_token(),
        workspace=Path("/unused/test/workspace"),
        verify_lock_identity=verify_lock,
    )
    assert (child_pid, return_code, stdout, stderr) == (4242, 0, b"", b"")
    assert len(captured["pass_fds"]) == 2
    assert captured["env"]["FT_VBD_TRAJECTORY_CAPABILITY_FD"]
    assert captured["env"]["FT_VBD_TRAJECTORY_PARENT_LIVENESS_FD"]
    assert captured["capability"]["launch_receipt_hash"] == receipt[
        "launch_receipt_hash"
    ]
    assert captured["capability"]["workspace_hash"] == record["workspace_hash"]
    assert receipt["capability_token_hash"] == sha256_json(_capability_token())
    assert len(verifier_calls) >= 4


def test_child_launch_rejects_capability_not_committed_by_receipt(monkeypatch):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    record = _fake_workspace_record()
    phase = _phase_manifest(record)
    slot = required_vbd_trajectory_validation_slots()[0]
    receipt = _launch_receipt(
        execution_kind="study",
        phase="original",
        phase_hash=phase["phase_hash"],
        phase_token=phase["phase_token"],
        slot=slot,
        slot_index=0,
        workspace_record=record,
        canary=None,
        capability_token_hash=sha256_json(_capability_token()),
    )
    monkeypatch.setattr(runner, "_revalidate_launch_admission", lambda *_args: None)
    monkeypatch.setattr(
        runner.subprocess,
        "Popen",
        lambda *_args, **_kwargs: pytest.fail("mismatched capability must not launch"),
    )
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="create-once receipt"
    ):
        _launch_child(
            receipt=receipt,
            capability_token="8" * 64,
            workspace=Path("/unused/test/workspace"),
            verify_lock_identity=lambda: None,
        )


def test_launch_admission_revalidates_the_persisted_create_once_receipt(
    tmp_path, monkeypatch
):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    record = _fake_workspace_record()
    phase = _phase_manifest(record)
    slot = required_vbd_trajectory_validation_slots()[0]
    receipt = _launch_receipt(
        execution_kind="study",
        phase="original",
        phase_hash=phase["phase_hash"],
        phase_token=phase["phase_token"],
        slot=slot,
        slot_index=0,
        workspace_record=record,
        canary=None,
        capability_token_hash=sha256_json(_capability_token()),
    )
    phase_path = tmp_path / "original" / "phase.json"
    launch_path = tmp_path / "original" / "launches" / "slot_0000.json"
    write_json_create_once(phase_path, phase)
    write_json_create_once(launch_path, receipt)
    monkeypatch.setattr(runner, "_load_workspace", lambda _path: (tmp_path, record))
    monkeypatch.setattr(runner, "_validate_workspace_tree", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(runner, "_validate_progress_state", lambda _path: "PRIMARY")
    _revalidate_launch_admission(tmp_path, receipt)

    launch_path.unlink()
    replaced = deepcopy(receipt)
    replaced["capability_token_hash"] = "8" * 64
    body = {
        key: value for key, value in replaced.items() if key != "launch_receipt_hash"
    }
    replaced["launch_receipt_hash"] = sha256_json(body)
    write_json_create_once(launch_path, replaced)
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="current create-once"
    ):
        _revalidate_launch_admission(tmp_path, receipt)


def test_canary_phase_rejects_nonpositive_creator_process_id(tmp_path):
    record = _fake_workspace_record()
    phase = _canary_phase_manifest(tmp_path, record)
    path = tmp_path / "canaries" / "phase.json"
    path.unlink()
    invalid = deepcopy(phase)
    invalid["creator_process_id"] = 0
    body = {key: value for key, value in invalid.items() if key != "phase_hash"}
    invalid["phase_hash"] = sha256_json(body)
    write_json_create_once(path, invalid)
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="canary phase manifest"
    ):
        _canary_phase_manifest(tmp_path, record)


def test_self_asserted_canary_pass_without_child_output_is_rejected(tmp_path):
    record = _fake_workspace_record()
    phase = _canary_phase_manifest(tmp_path, record)
    canary = required_vbd_trajectory_canaries()[0]
    slot_index = next(
        index
        for index, slot in enumerate(required_vbd_trajectory_validation_slots())
        if slot.slot_id == canary.slot.slot_id
    )
    launch = _launch_receipt(
        execution_kind="canary",
        phase="canary",
        phase_hash=phase["phase_hash"],
        phase_token=phase["phase_token"],
        slot=canary.slot,
        slot_index=slot_index,
        workspace_record=record,
        canary=canary,
        capability_token_hash=sha256_json(_capability_token()),
    )
    chain_root = _canary_chain_root(record)
    body = {
        "schema_version": "FT_AI_VALUE_VBD_TRAJECTORY_CANARY_RECEIPT_2026_07_V1",
        "canary_ordinal": canary.canary_ordinal,
        "canary_id": canary.canary_id,
        "canary_hash": canary.canary_hash,
        "slot_id": canary.slot.slot_id,
        "slot_hash": canary.slot.slot_hash,
        "workspace_hash": record["workspace_hash"],
        "phase_hash": phase["phase_hash"],
        "phase_token": phase["phase_token"],
        "launch_receipt_hash": launch["launch_receipt_hash"],
        "previous_canary_receipt_hash": chain_root,
        "execution_attestation_hash": "3" * 64,
        "child_output_hash": "4" * 64,
        "execution_attestation": {},
        "prepared_input_hashes_hash": "5" * 64,
        "execution_process_token_hash": "6" * 64,
        "child_process_id": 1234,
        "child_return_class": "success",
        "semantic_result_hash": "7" * 64,
        "planned_row_state_observed": True,
        "hard_diagnostic_failure": False,
        "runner_failure": False,
        "state": "PASS",
        "aggregate_gate_computed": False,
        "outside_study_denominators": True,
        "substitutes_for_study_slot": False,
        "receipt_result_values_emitted": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    receipt = {**body, "receipt_hash": sha256_json(body)}
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="child output"
    ):
        _validate_canary_receipt(
            receipt,
            canary=canary,
            workspace_record=record,
            previous_receipt_hash=chain_root,
            phase_manifest=phase,
            launch=launch,
            child_output=None,
        )


def test_child_entry_refuses_before_generation_without_frozen_child_context(
    monkeypatch,
):
    from fluencytracr_inference import vbd_trajectory_validation_execution as execution

    record = _fake_workspace_record()
    phase = _phase_manifest(record)
    slot = required_vbd_trajectory_validation_slots()[0]
    receipt = _launch_receipt(
        execution_kind="study",
        phase="original",
        phase_hash=phase["phase_hash"],
        phase_token=phase["phase_token"],
        slot=slot,
        slot_index=0,
        workspace_record=record,
        canary=None,
        capability_token_hash=sha256_json(_capability_token()),
    )
    monkeypatch.delenv("FT_VBD_TRAJECTORY_CHILD", raising=False)
    monkeypatch.setattr(
        execution,
        "_execute_slot",
        lambda _slot: pytest.fail("acceptance generation must not start"),
    )
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="inherited runner pipe"
    ):
        execution.execute_vbd_trajectory_child(receipt)


def test_progress_state_blocks_skipped_canaries_and_early_recomputation(tmp_path):
    assert _validate_progress_state(tmp_path) == "INIT"
    canary_launches = tmp_path / "canaries" / "launches"
    canary_outputs = tmp_path / "canaries" / "outputs"
    canary_receipts = tmp_path / "canaries" / "receipts"
    canary_launches.mkdir(parents=True)
    canary_outputs.mkdir(parents=True)
    canary_receipts.mkdir(parents=True)
    (canary_launches / "canary_00.json").write_text("{}\n", encoding="utf-8")
    assert _validate_progress_state(tmp_path) == "CANARIES"

    original_launches = tmp_path / "original" / "launches"
    original_launches.mkdir(parents=True)
    (original_launches / "slot_0000.json").write_text("{}\n", encoding="utf-8")
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="before all canaries"
    ):
        _validate_progress_state(tmp_path)

    for index in range(4):
        launch = canary_launches / f"canary_{index:02d}.json"
        receipt = canary_receipts / f"canary_{index:02d}.json"
        if not launch.exists():
            launch.write_text("{}\n", encoding="utf-8")
        (canary_outputs / f"canary_{index:02d}.json").write_text(
            "{}\n", encoding="utf-8"
        )
        receipt.write_text("{}\n", encoding="utf-8")
    assert _validate_progress_state(tmp_path) == "PRIMARY"

    recompute_launches = tmp_path / "recomputation" / "launches"
    recompute_launches.mkdir(parents=True)
    (recompute_launches / "slot_0000.json").write_text(
        "{}\n", encoding="utf-8"
    )
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="before the original phase"
    ):
        _validate_progress_state(tmp_path)


def test_combined_output_is_not_committed_without_final_marker(
    tmp_path, monkeypatch
):
    from fluencytracr_inference import vbd_trajectory_validation_resumable as runner

    def complete_indexes(directory, _pattern):
        if directory.name == "chunks":
            return tuple(range(40))
        if directory.name in {"launches", "slots"} and directory.parent.name in {
            "original",
            "recomputation",
        }:
            return tuple(range(2_000))
        if directory.parent.name == "canaries":
            return tuple(range(4))
        return ()

    monkeypatch.setattr(runner, "_indexed_files", complete_indexes)
    (tmp_path / "combined.json").write_text("{}\n", encoding="utf-8")
    assert _validate_progress_state(tmp_path) == "COMBINED_PENDING_COMMIT"
    (tmp_path / "combined_commit.json").write_text("{}\n", encoding="utf-8")
    assert _validate_progress_state(tmp_path) == "COMBINED"


def test_combined_commit_marker_binds_output_and_evidence_snapshot():
    record = _fake_workspace_record()
    combined = _fake_combined(record)
    assert _validate_combined_value(combined, record) == combined
    marker = _combined_commit_record(
        workspace_record=record, combined=combined
    )
    assert (
        _validate_combined_commit(
            marker, workspace_record=record, combined=combined
        )
        == marker
    )
    replaced = {**combined, "combined_hash": "5" * 64}
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="commit marker"
    ):
        _validate_combined_commit(
            marker, workspace_record=record, combined=replaced
        )


def test_combined_readback_rejects_rehashed_authorization_and_unknown_fields():
    record = _fake_workspace_record()
    for field in (
        "customer_output_authorized",
        "confidence_output_authorized",
        "probability_output_authorized",
        "roi_output_authorized",
        "causality_output_authorized",
        "productivity_output_authorized",
        "independent_acceptance_complete",
        "task_5_6_complete",
        "promotion_complete",
    ):
        forged = _fake_combined(record)
        forged[field] = True
        body = {
            key: value for key, value in forged.items() if key != "combined_hash"
        }
        forged["combined_hash"] = sha256_json(body)
        with pytest.raises(
            VbdTrajectoryValidationWorkspaceError, match="governance"
        ):
            _validate_combined_value(forged, record)
    unknown = _fake_combined(record)
    unknown["authorization_override"] = True
    body = {
        key: value for key, value in unknown.items() if key != "combined_hash"
    }
    unknown["combined_hash"] = sha256_json(body)
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="shape"
    ):
        _validate_combined_value(unknown, record)

    inconsistent = _fake_combined(record)
    inconsistent["fresh_semantic_results_match"] = False
    inconsistent["all_process_tokens_pairwise_disjoint"] = False
    inconsistent["failing_checks"] = [
        "fresh_semantic_recomputation_mismatch",
        "cross_phase_process_token_reuse",
    ]
    inconsistent["state"] = "PASS"
    body = {
        key: value
        for key, value in inconsistent.items()
        if key != "combined_hash"
    }
    inconsistent["combined_hash"] = sha256_json(body)
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError, match="not derived"
    ):
        _validate_combined_value(inconsistent, record)

    held = _fake_combined(record)
    held["original_process_count"] = 1_999
    held["all_process_tokens_pairwise_disjoint"] = False
    held["failing_checks"] = ["fresh_process_token_count"]
    held["state"] = "HOLD"
    body = {
        key: value for key, value in held.items() if key != "combined_hash"
    }
    held["combined_hash"] = sha256_json(body)
    assert _validate_combined_value(held, record) == held
