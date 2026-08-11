from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace

import pytest

import fluencytracr_inference.vbd_joint_replicated_runner as replicated_runner

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_joint_replicated_runner import (
    VBDJointReplicatedAttemptLedger,
    VBDJointReplicatedRuntimeManifest,
    VBDJointReplicatedRunnerError,
    build_sampler_free_execution_packet,
    combine_namespace,
    emit_sanitized_ensemble_artifact,
    make_checkpoint_for_disposition,
    make_claim_for_slot,
    observe_runtime_manifest,
    validate_sanitized_ensemble_artifact,
)
from fluencytracr_inference.vbd_joint_replicated_validation_plan import (
    VBDJointReplicatedValidationDisposition,
    vbd_joint_replicated_validation_plan,
)


SOURCE_COMMIT = "a" * 40
STARTED_AT = "2026-08-11T00:00:00+00:00"
DEADLINE_AT = "2026-08-11T02:00:00+00:00"


def _manifest(source_commit=SOURCE_COMMIT):
    body = {
        "python_version": replicated_runner.VBD_JOINT_REPLICATED_RUNTIME_PYTHON,
        "platform": replicated_runner.VBD_JOINT_REPLICATED_RUNTIME_PLATFORM,
        "lockfile_hash": replicated_runner.VBD_JOINT_REPLICATED_RUNTIME_LOCKFILE_HASH,
        "package_versions": [
            list(item)
            for item in sorted(
                replicated_runner.VBD_JOINT_REPLICATED_RUNTIME_PACKAGES.items()
            )
        ],
        "source_commit": source_commit,
    }
    return VBDJointReplicatedRuntimeManifest(
        python_version=body["python_version"],
        platform=body["platform"],
        lockfile_hash=body["lockfile_hash"],
        package_versions=tuple(tuple(item) for item in body["package_versions"]),
        source_commit=body["source_commit"],
        manifest_hash=sha256_json(body),
    )


@pytest.fixture
def runtime_manifest(monkeypatch):
    manifest = _manifest()
    monkeypatch.setattr(replicated_runner, "observe_runtime_manifest", lambda: manifest)
    return manifest


def test_runtime_manifest_is_exact_and_hash_bound(runtime_manifest):
    assert runtime_manifest.source_commit == SOURCE_COMMIT
    assert runtime_manifest.manifest_hash == sha256_json(runtime_manifest.body_without_hash())
    with pytest.raises(VBDJointReplicatedRunnerError, match="platform"):
        replace(runtime_manifest, platform="linux")


def test_runtime_manifest_is_observed_from_the_current_process_and_repository():
    try:
        manifest = observe_runtime_manifest()
    except VBDJointReplicatedRunnerError as exc:
        # A non-frozen development/CI runtime must fail closed, not manufacture
        # a manifest from the declared protocol constants.
        assert "observed runtime" in str(exc)
    else:
        assert manifest.source_commit == replicated_runner._observed_source_commit()
        assert manifest.lockfile_hash == replicated_runner._sha256_file(
            Path(replicated_runner.__file__).resolve().parents[2] / "requirements.lock"
        )
        assert manifest.manifest_hash == sha256_json(manifest.body_without_hash())


def _mock_exact_runtime_observations(monkeypatch):
    lockfile_path = Path(replicated_runner.__file__).resolve().parents[2] / "requirements.lock"
    locked_versions = replicated_runner._locked_package_versions(lockfile_path)
    monkeypatch.setattr(replicated_runner.platform, "python_version", lambda: "3.13.14")
    monkeypatch.setattr(replicated_runner.platform, "system", lambda: "Darwin")
    monkeypatch.setattr(replicated_runner.platform, "machine", lambda: "arm64")
    monkeypatch.setattr(
        replicated_runner,
        "_sha256_file",
        lambda _path: replicated_runner.VBD_JOINT_REPLICATED_RUNTIME_LOCKFILE_HASH,
    )
    monkeypatch.setattr(
        replicated_runner,
        "_locked_package_versions",
        lambda _path: locked_versions,
    )
    monkeypatch.setattr(
        replicated_runner.importlib.metadata,
        "version",
        lambda name: locked_versions[name],
    )
    monkeypatch.setattr(replicated_runner, "_observed_source_commit", lambda: SOURCE_COMMIT)
    return locked_versions


def test_runtime_observer_constructs_manifest_only_from_exact_observations(monkeypatch):
    _mock_exact_runtime_observations(monkeypatch)

    manifest = observe_runtime_manifest()

    assert manifest.python_version == "3.13.14"
    assert manifest.platform == "macOS arm64"
    assert manifest.lockfile_hash == replicated_runner.VBD_JOINT_REPLICATED_RUNTIME_LOCKFILE_HASH
    assert dict(manifest.package_versions) == replicated_runner.VBD_JOINT_REPLICATED_RUNTIME_PACKAGES
    assert manifest.source_commit == SOURCE_COMMIT
    assert manifest.manifest_hash == sha256_json(manifest.body_without_hash())


@pytest.mark.parametrize(
    ("drift", "message"),
    (
        ("python", "Python"),
        ("platform", "platform"),
        ("lockfile", "lockfile"),
        ("package", "packages"),
    ),
)
def test_runtime_observer_rejects_each_frozen_runtime_drift(monkeypatch, drift, message):
    locked_versions = _mock_exact_runtime_observations(monkeypatch)
    if drift == "python":
        monkeypatch.setattr(replicated_runner.platform, "python_version", lambda: "3.13.13")
    elif drift == "platform":
        monkeypatch.setattr(replicated_runner.platform, "machine", lambda: "x86_64")
    elif drift == "lockfile":
        monkeypatch.setattr(replicated_runner, "_sha256_file", lambda _path: "b" * 64)
    else:
        drifted_package = next(iter(locked_versions))
        monkeypatch.setattr(
            replicated_runner.importlib.metadata,
            "version",
            lambda name: "0.0.0" if name == drifted_package else locked_versions[name],
        )

    with pytest.raises(VBDJointReplicatedRunnerError, match=message):
        observe_runtime_manifest()


def test_observed_source_commit_rejects_dirty_or_malformed_git_state(monkeypatch):
    responses = iter(
        (
            SimpleNamespace(stdout=SOURCE_COMMIT + "\n"),
            SimpleNamespace(stdout=" M inference/file.py\n"),
        )
    )
    monkeypatch.setattr(replicated_runner.subprocess, "run", lambda *_args, **_kwargs: next(responses))
    with pytest.raises(VBDJointReplicatedRunnerError, match="not clean"):
        replicated_runner._observed_source_commit()

    responses = iter(
        (
            SimpleNamespace(stdout="not-a-commit\n"),
            SimpleNamespace(stdout=""),
        )
    )
    monkeypatch.setattr(replicated_runner.subprocess, "run", lambda *_args, **_kwargs: next(responses))
    with pytest.raises(VBDJointReplicatedRunnerError, match="source_commit"):
        replicated_runner._observed_source_commit()


def test_sampler_free_packet_binds_slot_and_dataset_without_sampling(runtime_manifest):
    slot = vbd_joint_replicated_validation_plan().preflight_slots[0]
    packet = build_sampler_free_execution_packet(slot, runtime_manifest=runtime_manifest)
    assert packet.slot_id == slot.slot_id
    assert packet.dataset_hash
    assert packet.packet_hash == sha256_json(packet.body_without_hash())


def test_claim_and_disposition_are_append_only_and_hash_bound(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.preflight_slots[0]
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    ledger = VBDJointReplicatedAttemptLedger().append_claim(
        claim, slot, plan.plan_hash, runtime_manifest=runtime_manifest
    )
    result_hash = sha256_json({"result": slot.slot_id})
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": result_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **body,
        disposition_hash=sha256_json(body),
    )
    checkpoint = make_checkpoint_for_disposition(
        disposition, case_hash=sha256_json({"case": slot.slot_id})
    )
    completed = ledger.append_disposition(disposition, checkpoint)
    assert completed.attempt_root != ledger.attempt_root
    with pytest.raises(VBDJointReplicatedRunnerError, match="already exists"):
        ledger.append_claim(
            claim, slot, plan.plan_hash, runtime_manifest=runtime_manifest
        )


def _append_complete(ledger, slot, plan, runtime_manifest):
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    ledger = ledger.append_claim(
        claim, slot, plan.plan_hash, runtime_manifest=runtime_manifest
    )
    result_hash = sha256_json({"result": slot.slot_id})
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": result_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **body,
        disposition_hash=sha256_json(body),
    )
    return ledger.append_disposition(
        disposition,
        make_checkpoint_for_disposition(
            disposition,
            case_hash=replicated_runner.generate_vbd_joint_replicated_case_for_slot(
                slot
            ).content_hash(),
        ),
    )


def test_qualifying_combiner_requires_the_exact_complete_manifest(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    ledger = VBDJointReplicatedAttemptLedger()
    for slot in plan.qualifying_slots:
        ledger = _append_complete(ledger, slot, plan, runtime_manifest)
    summary = combine_namespace(
        ledger,
        namespace="qualifying",
        plan=plan,
        runtime_manifest=runtime_manifest,
    )
    assert summary.state == "COMPLETE"
    assert summary.expected_slot_count == 600
    assert summary.observed_disposition_count == 600
    assert summary.observed_dataset_count == 400


def test_combiner_cannot_clear_complete_dispositions_without_checkpoints(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    ledger = VBDJointReplicatedAttemptLedger()
    for slot in plan.preflight_slots:
        ledger = _append_complete(ledger, slot, plan, runtime_manifest)
    checkpointless = replace(ledger, checkpoints=())

    summary = combine_namespace(
        checkpointless,
        namespace="preflight",
        plan=plan,
        runtime_manifest=runtime_manifest,
    )

    assert summary.state == "HOLD"
    assert "INTERRUPTED_OR_AMBIGUOUS" in summary.failure_codes


def test_combiner_rejects_checkpoint_with_fabricated_case_hash(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    ledger = _append_complete(
        VBDJointReplicatedAttemptLedger(),
        plan.preflight_slots[0],
        plan,
        runtime_manifest,
    )
    checkpoint = ledger.checkpoints[0]
    forged_body = {**checkpoint.body_without_hash(), "case_hash": "c" * 64}
    forged_checkpoint = replace(
        checkpoint,
        case_hash=forged_body["case_hash"],
        checkpoint_hash=sha256_json(forged_body),
    )

    with pytest.raises(VBDJointReplicatedRunnerError, match="case provenance"):
        combine_namespace(
            replace(ledger, checkpoints=(forged_checkpoint,)),
            namespace="preflight",
            plan=plan,
            runtime_manifest=runtime_manifest,
        )


def test_incomplete_namespaces_hold_and_sanitized_artifact_is_nonauthorizing(runtime_manifest):
    ledger = VBDJointReplicatedAttemptLedger()
    artifact = emit_sanitized_ensemble_artifact(
        ledger, runtime_manifest=runtime_manifest
    )
    validate_sanitized_ensemble_artifact(
        artifact, ledger=ledger, runtime_manifest=runtime_manifest
    )
    assert artifact["state"] == "HOLD"
    assert artifact["authorization_flags"][-1] == ["runtime_integration_authorized", False]
    assert artifact["failure_codes"] == ["INTERRUPTED_OR_AMBIGUOUS"]


def test_artifact_rejects_unsafe_fields_and_tampering(runtime_manifest):
    ledger = VBDJointReplicatedAttemptLedger()
    artifact = emit_sanitized_ensemble_artifact(
        ledger, runtime_manifest=runtime_manifest
    )
    unsafe = {**artifact, "posterior_draws": []}
    with pytest.raises(VBDJointReplicatedRunnerError, match="keys"):
        validate_sanitized_ensemble_artifact(
            unsafe, ledger=ledger, runtime_manifest=runtime_manifest
        )
    forged = {**artifact, "state": "COMPLETE"}
    with pytest.raises(VBDJointReplicatedRunnerError, match="self-hash"):
        validate_sanitized_ensemble_artifact(
            forged, ledger=ledger, runtime_manifest=runtime_manifest
        )

    resealed_body = {
        **{key: value for key, value in artifact.items() if key != "artifact_hash"},
        "expected_dataset_count": 999,
        "observed_dataset_count": 998,
        "expected_fit_count": 999,
        "observed_fit_count": 998,
        "preflight_summary_hash": "c" * 64,
    }
    resealed = {**resealed_body, "artifact_hash": sha256_json(resealed_body)}
    with pytest.raises(VBDJointReplicatedRunnerError, match="summary semantics"):
        validate_sanitized_ensemble_artifact(
            resealed, ledger=ledger, runtime_manifest=runtime_manifest
        )


def test_off_manifest_claim_cannot_enter_qualifying_combiner(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.preflight_slots[0]
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    forged_body = {**claim.body_without_hash(), "namespace": "qualifying"}
    forged_claim = replace(
        claim,
        namespace="qualifying",
        claim_hash=sha256_json(forged_body),
    )
    ledger = VBDJointReplicatedAttemptLedger(claims=(forged_claim,))
    with pytest.raises(VBDJointReplicatedRunnerError):
        combine_namespace(
            ledger,
            namespace="qualifying",
            plan=plan,
            runtime_manifest=runtime_manifest,
        )


def test_claim_append_rejects_a_different_runtime_provenance(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.preflight_slots[0]
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    other = _manifest("b" * 40)
    forged_body = {
        **claim.body_without_hash(),
        "source_commit": other.source_commit,
        "runtime_manifest_hash": other.manifest_hash,
    }
    forged = replace(
        claim,
        source_commit=other.source_commit,
        runtime_manifest_hash=other.manifest_hash,
        claim_hash=sha256_json(forged_body),
    )

    with pytest.raises(VBDJointReplicatedRunnerError, match="runtime provenance"):
        VBDJointReplicatedAttemptLedger().append_claim(
            forged, slot, plan.plan_hash, runtime_manifest=runtime_manifest
        )


def test_combiner_and_artifact_reject_mixed_runtime_provenance(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.preflight_slots[0]
    claim = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    other = _manifest("b" * 40)
    forged_body = {
        **claim.body_without_hash(),
        "source_commit": other.source_commit,
        "runtime_manifest_hash": other.manifest_hash,
    }
    forged = replace(
        claim,
        source_commit=other.source_commit,
        runtime_manifest_hash=other.manifest_hash,
        claim_hash=sha256_json(forged_body),
    )
    ledger = VBDJointReplicatedAttemptLedger(claims=(forged,))

    with pytest.raises(VBDJointReplicatedRunnerError, match="runtime provenance"):
        combine_namespace(
            ledger,
            namespace="preflight",
            plan=plan,
            runtime_manifest=runtime_manifest,
        )
    with pytest.raises(VBDJointReplicatedRunnerError, match="runtime provenance"):
        emit_sanitized_ensemble_artifact(
            ledger, runtime_manifest=runtime_manifest, plan=plan
        )
