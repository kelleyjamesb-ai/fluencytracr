from dataclasses import replace
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

import fluencytracr_inference.vbd_joint_replicated_runner as replicated_runner

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_joint_replicated_runner import (
    VBDJointReplicatedAttemptLedger,
    VBDJointReplicatedFitReceipt,
    VBDJointReplicatedRuntimeManifest,
    VBDJointReplicatedRunnerError,
    build_sampler_free_execution_packet,
    combine_namespace,
    dataset_regeneration_failure_case_hash,
    emit_sanitized_ensemble_artifact,
    make_checkpoint_for_disposition,
    make_claim_for_slot,
    observe_github_review_receipt,
    observe_runtime_manifest,
    validate_sanitized_ensemble_artifact,
)
from fluencytracr_inference.vbd_joint_replicated_validation_plan import (
    VBD_JOINT_REPLICATED_STUDY_TIMEOUT_SECONDS,
    VBDJointReplicatedValidationClaim,
    VBDJointReplicatedValidationDisposition,
    vbd_joint_replicated_validation_plan,
)


SOURCE_COMMIT = "a" * 40
STARTED_AT = "2026-08-11T00:00:00+00:00"
DEADLINE_AT = "2026-08-11T02:00:00+00:00"
COMPLETED_AT = "2026-08-11T01:00:00+00:00"


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


def _fit_receipt(slot, claim, case_hash):
    body = {
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "launch_receipt_hash": "1" * 64,
        "prepared_input_hash": "2" * 64,
        "dataset_hash": case_hash,
        "variant": slot.variant,
        "fit_summary_hash": "3" * 64,
        "diagnostics_hash": "4" * 64,
        "max_r_hat": 1.0,
        "min_bulk_ess": 500.0,
        "min_tail_ess": 500.0,
        "divergence_count": 0,
        "max_treedepth_count": 0,
        "wall_time_seconds": 1.0,
    }
    return VBDJointReplicatedFitReceipt(
        **body,
        receipt_hash=sha256_json(body),
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


def test_github_review_observer_requires_approval_for_the_exact_pr_head(monkeypatch):
    review = {
        "id": 12345,
        "user": {"login": "independent-reviewer"},
        "author_association": "COLLABORATOR",
        "commit_id": SOURCE_COMMIT,
        "state": "APPROVED",
        "submitted_at": "2026-08-11T00:00:00+00:00",
    }
    pull = {
        "number": 485,
        "user": {"login": "kelleyjamesb-ai"},
        "base": {"repo": {"full_name": "kelleyjamesb-ai/fluencytracr"}},
        "head": {"sha": SOURCE_COMMIT},
    }
    responses = iter(
        (
            SimpleNamespace(stdout=json.dumps(review)),
            SimpleNamespace(stdout=json.dumps(pull)),
        )
    )
    monkeypatch.setattr(
        replicated_runner.subprocess,
        "run",
        lambda *_args, **_kwargs: next(responses),
    )

    receipt = observe_github_review_receipt(pull_number=485, review_id=12345)
    assert receipt.reviewed_commit == SOURCE_COMMIT
    assert receipt.state == "APPROVED"

    stale_pull = {**pull, "head": {"sha": "b" * 40}}
    responses = iter(
        (
            SimpleNamespace(stdout=json.dumps(review)),
            SimpleNamespace(stdout=json.dumps(stale_pull)),
        )
    )
    with pytest.raises(VBDJointReplicatedRunnerError, match="exact pull request head"):
        observe_github_review_receipt(pull_number=485, review_id=12345)


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


def test_sampler_free_packet_rejects_a_self_consistent_replacement_plan(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    changed_slot = replace(plan.preflight_slots[0], draws=999)
    changed_preflight = (changed_slot, *plan.preflight_slots[1:])
    changed_body = {
        **plan.body_without_hash(),
        "preflight_slots": [slot.to_dict() for slot in changed_preflight],
    }
    changed_plan = replace(
        plan,
        preflight_slots=changed_preflight,
        plan_hash=sha256_json(changed_body),
    )

    with pytest.raises(VBDJointReplicatedRunnerError, match="canonical frozen plan"):
        build_sampler_free_execution_packet(
            changed_slot,
            plan=changed_plan,
            runtime_manifest=runtime_manifest,
        )


def test_claim_creation_and_append_reject_a_substituted_slot(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    changed_slot = replace(plan.preflight_slots[0], draws=301)
    with pytest.raises(VBDJointReplicatedRunnerError, match="canonical frozen plan"):
        make_claim_for_slot(
            changed_slot,
            plan_hash=plan.plan_hash,
            runtime_manifest=runtime_manifest,
            started_at=STARTED_AT,
            deadline_at=DEADLINE_AT,
        )

    forged_body = {
        "namespace": changed_slot.namespace,
        "slot_id": changed_slot.slot_id,
        "scenario_id": changed_slot.scenario_id,
        "variant": changed_slot.variant,
        "dataset_seed": changed_slot.dataset_seed,
        "chain_seeds": tuple(changed_slot.chain_seeds),
        "slot_hash": changed_slot.slot_hash,
        "plan_hash": plan.plan_hash,
        "source_commit": runtime_manifest.source_commit,
        "runtime_manifest_hash": runtime_manifest.manifest_hash,
        "started_at": STARTED_AT,
        "deadline_at": DEADLINE_AT,
    }
    forged = VBDJointReplicatedValidationClaim(
        **forged_body,
        claim_hash=sha256_json(forged_body),
    )
    with pytest.raises(VBDJointReplicatedRunnerError, match="canonical frozen plan"):
        VBDJointReplicatedAttemptLedger().append_claim(
            forged,
            changed_slot,
            plan.plan_hash,
            runtime_manifest=runtime_manifest,
        )


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
    case_hash = sha256_json({"case": slot.slot_id})
    fit_receipt = _fit_receipt(slot, claim, case_hash)
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": fit_receipt.receipt_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **body,
        disposition_hash=sha256_json(body),
    )
    checkpoint = make_checkpoint_for_disposition(
        disposition,
        case_hash=case_hash,
        completed_at=COMPLETED_AT,
        fit_receipt=fit_receipt,
    )
    completed = ledger.append_disposition(disposition, checkpoint)
    assert completed.attempt_root != ledger.attempt_root
    with pytest.raises(VBDJointReplicatedRunnerError, match="already exists"):
        ledger.append_claim(
            claim, slot, plan.plan_hash, runtime_manifest=runtime_manifest
        )


def test_complete_disposition_rejects_an_arbitrary_result_hash(runtime_manifest):
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
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": sha256_json({"fabricated": "result"}),
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **body,
        disposition_hash=sha256_json(body),
    )

    with pytest.raises(VBDJointReplicatedRunnerError, match="validated fit receipt"):
        ledger.append_disposition(
            disposition,
            make_checkpoint_for_disposition(
                disposition,
                case_hash=replicated_runner.generate_vbd_joint_replicated_case_for_slot(
                    slot
                ).content_hash(),
                completed_at=COMPLETED_AT,
            ),
        )


def test_complete_fit_receipt_rejects_failed_diagnostics():
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.qualifying_slots[0]
    claim_hash = "a" * 64
    case_hash = "b" * 64
    receipt = _fit_receipt(
        slot,
        SimpleNamespace(claim_hash=claim_hash),
        case_hash,
    )
    forged_body = {
        **receipt.body_without_hash(),
        "max_r_hat": 1.02,
    }

    with pytest.raises(VBDJointReplicatedRunnerError, match="diagnostics"):
        VBDJointReplicatedFitReceipt(
            **forged_body,
            receipt_hash=sha256_json(forged_body),
        )


def test_claim_requires_the_exact_frozen_two_hour_deadline(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slot = plan.preflight_slots[0]

    for deadline in (
        "2026-08-11T01:59:59+00:00",
        "2026-08-11T02:00:01+00:00",
        "2026-08-12T00:00:00+00:00",
    ):
        with pytest.raises(VBDJointReplicatedRunnerError, match="two-hour"):
            make_claim_for_slot(
                slot,
                plan_hash=plan.plan_hash,
                runtime_manifest=runtime_manifest,
                started_at=STARTED_AT,
                deadline_at=deadline,
            )

    valid = make_claim_for_slot(
        slot,
        plan_hash=plan.plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=STARTED_AT,
        deadline_at=DEADLINE_AT,
    )
    forged_body = {
        **valid.body_without_hash(),
        "deadline_at": "2026-08-12T00:00:00+00:00",
    }
    forged = replace(
        valid,
        deadline_at=forged_body["deadline_at"],
        claim_hash=sha256_json(forged_body),
    )
    with pytest.raises(VBDJointReplicatedRunnerError, match="two-hour"):
        VBDJointReplicatedAttemptLedger().append_claim(
            forged,
            slot,
            plan.plan_hash,
            runtime_manifest=runtime_manifest,
        )
    with pytest.raises(VBDJointReplicatedRunnerError, match="two-hour"):
        combine_namespace(
            VBDJointReplicatedAttemptLedger(claims=(forged,)),
            plan=plan,
            namespace=slot.namespace,
            runtime_manifest=runtime_manifest,
        )


def test_checkpoint_completion_must_be_inside_the_claimed_execution_window(
    runtime_manifest,
):
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
    case_hash = sha256_json({"case": slot.slot_id})
    fit_receipt = _fit_receipt(slot, claim, case_hash)
    disposition_body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": fit_receipt.receipt_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **disposition_body,
        disposition_hash=sha256_json(disposition_body),
    )
    checkpoint = make_checkpoint_for_disposition(
        disposition,
        case_hash=case_hash,
        completed_at="2026-08-11T03:00:00+00:00",
        fit_receipt=fit_receipt,
    )

    with pytest.raises(VBDJointReplicatedRunnerError, match="execution window"):
        ledger.append_disposition(disposition, checkpoint)
    with pytest.raises(VBDJointReplicatedRunnerError, match="execution window"):
        ledger.append_disposition(
            disposition,
            make_checkpoint_for_disposition(
                disposition,
                case_hash=case_hash,
                completed_at=DEADLINE_AT,
                fit_receipt=fit_receipt,
            ),
        )


def test_sampler_timeout_checkpoint_can_record_post_deadline_observation(
    runtime_manifest,
):
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
    disposition_body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "HOLD",
        "failure_code": "SAMPLER_TIMEOUT",
        "result_hash": sha256_json({"timeout": slot.slot_id}),
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **disposition_body,
        disposition_hash=sha256_json(disposition_body),
    )
    with pytest.raises(VBDJointReplicatedRunnerError, match="execution window"):
        ledger.append_disposition(
            disposition,
            make_checkpoint_for_disposition(
                disposition,
                case_hash=sha256_json({"case": slot.slot_id}),
                completed_at=COMPLETED_AT,
            ),
        )
    completed = ledger.append_disposition(
        disposition,
        make_checkpoint_for_disposition(
            disposition,
            case_hash=replicated_runner.generate_vbd_joint_replicated_case_for_slot(
                slot
            ).content_hash(),
            completed_at=DEADLINE_AT,
        ),
    )

    summary = combine_namespace(
        completed,
        namespace="preflight",
        plan=plan,
        runtime_manifest=runtime_manifest,
    )
    assert summary.hold_count == 1
    assert "SAMPLER_TIMEOUT" in summary.failure_codes

    late = ledger.append_disposition(
        disposition,
        make_checkpoint_for_disposition(
            disposition,
            case_hash=replicated_runner.generate_vbd_joint_replicated_case_for_slot(
                slot
            ).content_hash(),
            completed_at="2026-08-26T00:00:00+00:00",
        ),
    )
    late_summary = combine_namespace(
        late,
        namespace="preflight",
        plan=plan,
        runtime_manifest=runtime_manifest,
    )
    assert "SAMPLER_TIMEOUT" in late_summary.failure_codes
    assert "INTERRUPTED_OR_AMBIGUOUS" in late_summary.failure_codes


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
    case_hash = replicated_runner.generate_vbd_joint_replicated_case_for_slot(
        slot
    ).content_hash()
    fit_receipt = _fit_receipt(slot, claim, case_hash)
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "COMPLETE",
        "failure_code": "NONE",
        "result_hash": fit_receipt.receipt_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **body,
        disposition_hash=sha256_json(body),
    )
    return ledger.append_disposition(
        disposition,
        make_checkpoint_for_disposition(
            disposition,
            case_hash=case_hash,
            completed_at=COMPLETED_AT,
            fit_receipt=fit_receipt,
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


def test_attempt_roots_are_canonical_across_parallel_completion_order(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    slots = plan.preflight_slots[:2]
    forward = VBDJointReplicatedAttemptLedger()
    reverse = VBDJointReplicatedAttemptLedger()
    for slot in slots:
        forward = _append_complete(forward, slot, plan, runtime_manifest)
    for slot in reversed(slots):
        reverse = _append_complete(reverse, slot, plan, runtime_manifest)

    assert forward.namespace_root("preflight") == reverse.namespace_root("preflight")
    assert forward.attempt_root == reverse.attempt_root


def test_combiner_holds_attempts_beyond_the_frozen_fourteen_day_limit(runtime_manifest):
    plan = vbd_joint_replicated_validation_plan()
    ledgers = []
    for index, slot in enumerate(plan.preflight_slots):
        started_at = STARTED_AT if index == 0 else "2026-08-25T00:00:01+00:00"
        deadline_at = DEADLINE_AT if index == 0 else "2026-08-25T02:00:01+00:00"
        claim = make_claim_for_slot(
            slot,
            plan_hash=plan.plan_hash,
            runtime_manifest=runtime_manifest,
            started_at=started_at,
            deadline_at=deadline_at,
        )
        slot_ledger = VBDJointReplicatedAttemptLedger().append_claim(
            claim, slot, plan.plan_hash, runtime_manifest=runtime_manifest
        )
        case_hash = replicated_runner.generate_vbd_joint_replicated_case_for_slot(
            slot
        ).content_hash()
        fit_receipt = _fit_receipt(slot, claim, case_hash)
        disposition_body = {
            "namespace": slot.namespace,
            "slot_id": slot.slot_id,
            "claim_hash": claim.claim_hash,
            "state": "COMPLETE",
            "failure_code": "NONE",
            "result_hash": fit_receipt.receipt_hash,
        }
        disposition = VBDJointReplicatedValidationDisposition(
            **disposition_body,
            disposition_hash=sha256_json(disposition_body),
        )
        slot_ledger = slot_ledger.append_disposition(
            disposition,
            make_checkpoint_for_disposition(
                disposition,
                case_hash=case_hash,
                completed_at=(
                    COMPLETED_AT
                    if index == 0
                    else "2026-08-25T01:00:01+00:00"
                ),
                fit_receipt=fit_receipt,
            ),
        )
        ledgers.append(slot_ledger)

    with pytest.raises(VBDJointReplicatedRunnerError, match="fourteen-day"):
        ledgers[0].append_claim(
            ledgers[1].claims[0],
            plan.preflight_slots[1],
            plan.plan_hash,
            runtime_manifest=runtime_manifest,
        )

    ledger = VBDJointReplicatedAttemptLedger(
        claims=tuple(item.claims[0] for item in ledgers),
        dispositions=tuple(item.dispositions[0] for item in ledgers),
        checkpoints=tuple(item.checkpoints[0] for item in ledgers),
    )

    assert VBD_JOINT_REPLICATED_STUDY_TIMEOUT_SECONDS == 14 * 24 * 60 * 60
    summary = combine_namespace(
        ledger,
        namespace="preflight",
        plan=plan,
        runtime_manifest=runtime_manifest,
    )
    assert summary.state == "HOLD"
    assert "INTERRUPTED_OR_AMBIGUOUS" in summary.failure_codes


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
    with pytest.raises(VBDJointReplicatedRunnerError, match="validated fit receipt"):
        replace(
            checkpoint,
            case_hash=forged_body["case_hash"],
            checkpoint_hash=sha256_json(forged_body),
        )


def test_dataset_regeneration_failure_is_a_durable_sanitized_hold(
    runtime_manifest, monkeypatch
):
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
    disposition_body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "HOLD",
        "failure_code": "DATASET_REGENERATION_FAILURE",
        "result_hash": sha256_json({"failure": slot.slot_id}),
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **disposition_body,
        disposition_hash=sha256_json(disposition_body),
    )
    ledger = ledger.append_disposition(
        disposition,
        make_checkpoint_for_disposition(
            disposition,
            case_hash=dataset_regeneration_failure_case_hash(claim),
            completed_at=COMPLETED_AT,
        ),
    )

    def regeneration_must_not_run(_slot):
        raise AssertionError("failed dataset regeneration was retried")

    monkeypatch.setattr(
        replicated_runner,
        "generate_vbd_joint_replicated_case_for_slot",
        regeneration_must_not_run,
    )

    summary = combine_namespace(
        ledger,
        namespace="preflight",
        plan=plan,
        runtime_manifest=runtime_manifest,
    )
    artifact = emit_sanitized_ensemble_artifact(
        ledger,
        plan=plan,
        runtime_manifest=runtime_manifest,
    )

    assert summary.state == "HOLD"
    assert summary.hold_count == 1
    assert "DATASET_REGENERATION_FAILURE" in summary.failure_codes
    assert artifact["state"] == "HOLD"
    assert "DATASET_REGENERATION_FAILURE" in artifact["failure_codes"]


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


def test_artifact_counts_durable_hold_dispositions_as_observed_fits(
    runtime_manifest, monkeypatch
):
    ledger = VBDJointReplicatedAttemptLedger()
    plan = vbd_joint_replicated_validation_plan()
    summaries = {
        namespace: combine_namespace(
            ledger,
            namespace=namespace,
            plan=plan,
            runtime_manifest=runtime_manifest,
        )
        for namespace in replicated_runner.VBD_JOINT_REPLICATED_NAMESPACES
    }
    qualifying = summaries["qualifying"]
    held_body = {
        **qualifying.body_without_hash(),
        "observed_disposition_count": 1,
        "hold_count": 1,
        "failure_codes": ["DIAGNOSTIC_HOLD", "INTERRUPTED_OR_AMBIGUOUS"],
    }
    summaries["qualifying"] = replicated_runner.VBDJointReplicatedNamespaceSummary(
        **{
            **held_body,
            "failure_codes": tuple(held_body["failure_codes"]),
            "summary_hash": sha256_json(held_body),
        }
    )
    monkeypatch.setattr(
        replicated_runner,
        "combine_namespace",
        lambda _ledger, *, namespace, **_kwargs: summaries[namespace],
    )

    artifact = emit_sanitized_ensemble_artifact(
        ledger,
        runtime_manifest=runtime_manifest,
        plan=plan,
    )

    assert artifact["observed_fit_count"] == 1


def test_completed_ledgers_do_not_report_an_execution_interruption(
    runtime_manifest, monkeypatch
):
    plan = vbd_joint_replicated_validation_plan()
    case = SimpleNamespace(content_hash=lambda: "c" * 64)
    monkeypatch.setattr(
        replicated_runner,
        "generate_vbd_joint_replicated_case_for_slot",
        lambda _slot: case,
    )
    ledger = VBDJointReplicatedAttemptLedger()
    for slot in plan.qualifying_slots + plan.preflight_slots + plan.canary_slots:
        ledger = _append_complete(ledger, slot, plan, runtime_manifest)

    artifact = emit_sanitized_ensemble_artifact(
        ledger,
        runtime_manifest=runtime_manifest,
        plan=plan,
    )

    assert artifact["state"] == "HOLD"
    assert artifact["failure_codes"] == []


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
