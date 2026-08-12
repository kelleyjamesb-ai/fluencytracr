from dataclasses import replace
from datetime import datetime, timedelta, timezone
import json
import time
from types import SimpleNamespace

import numpy as np
import pytest

from fluencytracr_inference.vbd_joint_model import (
    VBDJointFit,
    VBDJointSamplerSettings,
    _fit_vbd_joint_model_with_settings,
    build_vbd_joint_model,
    fit_vbd_joint_model,
)
from fluencytracr_inference.vbd_joint_replicated_bridge import (
    VBDJointReplicatedBridgeError,
    build_vbd_joint_replicated_fit_spec,
    fit_vbd_joint_replicated_model,
    prepare_vbd_joint_replicated_dataset,
    _validated_fit_receipt,
)
from fluencytracr_inference.vbd_joint_replicated_synthetic import (
    generate_vbd_joint_replicated_case_for_slot,
)
import fluencytracr_inference.vbd_joint_replicated_runner as replicated_runner
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_joint_replicated_runner import (
    VBDJointReplicatedReviewReceipt,
    VBDJointReplicatedRuntimeManifest,
    authorize_reviewed_execution,
    build_sampler_free_execution_packet,
    make_claim_for_slot,
)
from fluencytracr_inference.vbd_joint_replicated_validation_plan import (
    vbd_joint_replicated_validation_plan,
)
from fluencytracr_inference.vbd_joint_types import (
    VBD_JOINT_PRIMARY_SEED,
    VBDJointStructureError,
)


def _slot(cell_id, *, namespace="qualifying", variant="full"):
    plan = vbd_joint_replicated_validation_plan()
    slots = {
        "qualifying": plan.qualifying_slots,
        "preflight": plan.preflight_slots,
        "runtime_canary": plan.canary_slots,
    }[namespace]
    return next(
        slot
        for slot in slots
        if slot.cell_id == cell_id and slot.variant == variant
    )


def _runtime_manifest():
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
        "source_commit": "a" * 40,
    }
    return VBDJointReplicatedRuntimeManifest(
        python_version=body["python_version"],
        platform=body["platform"],
        lockfile_hash=body["lockfile_hash"],
        package_versions=tuple(tuple(item) for item in body["package_versions"]),
        source_commit=body["source_commit"],
        manifest_hash=sha256_json(body),
    )


def _review_receipt(source_commit: str) -> VBDJointReplicatedReviewReceipt:
    body = {
        "repository": "kelleyjamesb-ai/fluencytracr",
        "pull_number": 485,
        "review_id": 12345,
        "reviewer_login": "independent-reviewer",
        "author_login": "kelleyjamesb-ai",
        "author_association": "COLLABORATOR",
        "reviewed_commit": source_commit,
        "state": "APPROVED",
        "submitted_at": "2026-08-11T00:00:00+00:00",
    }
    return VBDJointReplicatedReviewReceipt(
        **body,
        receipt_hash=sha256_json(body),
    )


@pytest.mark.parametrize(
    ("cell_id", "namespace"),
    (
        ("primary", "qualifying"),
        ("behavior_pathway_null", "qualifying"),
        ("omitted_confounder_stress", "qualifying"),
        ("high_capability_error", "qualifying"),
        ("runtime_canary", "runtime_canary"),
    ),
)
def test_every_v4_cell_prepares_and_builds_the_unchanged_model(cell_id, namespace):
    slot = _slot(cell_id, namespace=namespace)
    case = generate_vbd_joint_replicated_case_for_slot(slot)

    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)

    assert prepared.source_profile == "replicated_v4"
    assert prepared.generator_version == "v0_4_0"
    assert prepared.dataset_hash == case.content_hash()
    assert prepared.replicated_cell_id == case.cell_id
    assert prepared.replicate_index == case.replicate_index
    assert prepared.scenario_id == case.scenario_id
    assert prepared.capability_standard_error.flags.writeable is False
    model = build_vbd_joint_model(prepared, variant=slot.variant)
    assert "capability_observed" in model.named_vars


def test_high_error_standard_error_is_admitted_only_for_the_exact_v4_cell():
    high_slot = _slot("high_capability_error")
    high_case = generate_vbd_joint_replicated_case_for_slot(high_slot)
    prepared = prepare_vbd_joint_replicated_dataset(high_case, slot=high_slot)
    assert set(np.unique(prepared.capability_standard_error)) == {0.30}

    primary_slot = _slot("primary")
    primary_case = generate_vbd_joint_replicated_case_for_slot(primary_slot)
    forged_inner = replace(
        primary_case.dataset,
        capability_observations=tuple(
            replace(item, standard_error=0.30)
            for item in primary_case.dataset.capability_observations
        ),
    )
    forged = replace(primary_case, dataset=forged_inner)
    with pytest.raises(VBDJointReplicatedBridgeError):
        prepare_vbd_joint_replicated_dataset(forged, slot=primary_slot)


def test_v4_preparation_rejects_a_case_and_slot_from_different_cells():
    primary_slot = _slot("primary")
    null_slot = _slot("behavior_pathway_null")
    case = generate_vbd_joint_replicated_case_for_slot(primary_slot)

    with pytest.raises(VBDJointReplicatedBridgeError, match="slot"):
        prepare_vbd_joint_replicated_dataset(case, slot=null_slot)


def test_v4_fit_spec_binds_exact_ordered_chain_seeds_and_sampler_settings():
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)

    spec = build_vbd_joint_replicated_fit_spec(prepared, slot=slot)

    assert spec.slot_hash == slot.slot_hash
    assert spec.prepared_input_hash == prepared.prepared_input_hash
    assert spec.variant == slot.variant
    assert spec.chain_seeds == slot.chain_seeds
    assert spec.chains == slot.chains
    assert spec.draws == slot.draws
    assert spec.tune == slot.tune
    assert spec.target_accept == slot.target_accept
    assert spec.max_treedepth == slot.max_treedepth


def test_v4_preparation_is_shared_by_full_and_restricted_fit_slots():
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)
    restricted = _slot("primary", variant="restricted")
    restricted_spec = build_vbd_joint_replicated_fit_spec(
        prepared, slot=restricted
    )
    assert restricted_spec.prepared_input_hash == prepared.prepared_input_hash
    assert restricted_spec.chain_seeds == restricted.chain_seeds


def test_v4_fit_spec_rejects_substituted_chain_seed_slot_before_sampling():
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)
    forged_slot = replace(slot, sampler_seed_base=slot.sampler_seed_base + 1)

    with pytest.raises(VBDJointReplicatedBridgeError, match="slot"):
        build_vbd_joint_replicated_fit_spec(prepared, slot=forged_slot)


def test_v4_fit_spec_wrong_type_fails_with_closed_bridge_error():
    with pytest.raises(VBDJointReplicatedBridgeError, match="prepared input"):
        build_vbd_joint_replicated_fit_spec(object(), slot=_slot("primary"))


def test_exact_v4_slot_reaches_the_full_joint_model_sampler_boundary(monkeypatch, tmp_path):
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)
    runtime_manifest = _runtime_manifest()
    monkeypatch.setattr(
        replicated_runner, "observe_runtime_manifest", lambda: runtime_manifest
    )
    packet = build_sampler_free_execution_packet(
        slot, runtime_manifest=runtime_manifest
    )
    started_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    deadline_at = started_at + timedelta(hours=2)
    claim = make_claim_for_slot(
        slot,
        plan_hash=vbd_joint_replicated_validation_plan().plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=started_at.isoformat(),
        deadline_at=deadline_at.isoformat(),
    )
    review_receipt = _review_receipt(runtime_manifest.source_commit)
    monkeypatch.setattr(
        replicated_runner,
        "observe_github_review_receipt",
        lambda **_kwargs: review_receipt,
    )
    authorization = authorize_reviewed_execution(
        slot,
        packet=packet,
        claim=claim,
        runtime_manifest=runtime_manifest,
        review_state="GO",
        review_receipt_hash=review_receipt.receipt_hash,
        review_receipt=review_receipt,
    )
    captured = {}

    class SamplerBoundaryReached(Exception):
        pass

    def capture_sampler(**kwargs):
        captured.update(kwargs)
        raise SamplerBoundaryReached

    monkeypatch.setattr("fluencytracr_inference.vbd_joint_model.pm.sample", capture_sampler)

    with pytest.raises(SamplerBoundaryReached):
        fit_vbd_joint_replicated_model(
            prepared,
            slot=slot,
            packet=packet,
            claim=claim,
            authorization=authorization,
            runtime_manifest=runtime_manifest,
            review_receipt=review_receipt,
            execution_root=tmp_path,
        )

    assert captured["draws"] == slot.draws
    assert captured["tune"] == slot.tune
    assert captured["chains"] == slot.chains
    assert captured["random_seed"] == list(slot.chain_seeds)
    assert captured["target_accept"] == slot.target_accept
    assert captured["max_treedepth"] == slot.max_treedepth


def test_arbitrary_review_hash_cannot_authorize_v4_sampling(monkeypatch):
    slot = _slot("primary")
    runtime_manifest = _runtime_manifest()
    monkeypatch.setattr(
        replicated_runner, "observe_runtime_manifest", lambda: runtime_manifest
    )
    packet = build_sampler_free_execution_packet(
        slot, runtime_manifest=runtime_manifest
    )
    started_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    claim = make_claim_for_slot(
        slot,
        plan_hash=vbd_joint_replicated_validation_plan().plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=started_at.isoformat(),
        deadline_at=(started_at + timedelta(hours=2)).isoformat(),
    )

    with pytest.raises(ValueError, match="authenticated review"):
        authorize_reviewed_execution(
            slot,
            packet=packet,
            claim=claim,
            runtime_manifest=runtime_manifest,
            review_state="GO",
            review_receipt_hash=sha256_json({}),
        )


def test_supplied_review_receipt_must_match_authenticated_github_evidence(monkeypatch):
    slot = _slot("primary")
    runtime_manifest = _runtime_manifest()
    supplied = _review_receipt(runtime_manifest.source_commit)
    observed_body = {
        **supplied.body_without_hash(),
        "reviewer_login": "different-reviewer",
    }
    observed = replicated_runner.VBDJointReplicatedReviewReceipt(
        **observed_body,
        receipt_hash=sha256_json(observed_body),
    )
    monkeypatch.setattr(
        replicated_runner, "observe_runtime_manifest", lambda: runtime_manifest
    )
    monkeypatch.setattr(
        replicated_runner,
        "observe_github_review_receipt",
        lambda **_kwargs: observed,
    )
    packet = build_sampler_free_execution_packet(
        slot, runtime_manifest=runtime_manifest
    )
    started_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    claim = make_claim_for_slot(
        slot,
        plan_hash=vbd_joint_replicated_validation_plan().plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=started_at.isoformat(),
        deadline_at=(started_at + timedelta(hours=2)).isoformat(),
    )

    with pytest.raises(ValueError, match="does not match GitHub"):
        authorize_reviewed_execution(
            slot,
            packet=packet,
            claim=claim,
            runtime_manifest=runtime_manifest,
            review_state="GO",
            review_receipt_hash=supplied.receipt_hash,
            review_receipt=supplied,
        )


def test_v4_claim_is_consumed_before_the_sampler_and_cannot_relaunch(
    monkeypatch, tmp_path
):
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)
    runtime_manifest = _runtime_manifest()
    review_receipt = _review_receipt(runtime_manifest.source_commit)
    monkeypatch.setattr(
        replicated_runner, "observe_runtime_manifest", lambda: runtime_manifest
    )
    monkeypatch.setattr(
        replicated_runner,
        "observe_github_review_receipt",
        lambda **_kwargs: review_receipt,
    )
    packet = build_sampler_free_execution_packet(
        slot, runtime_manifest=runtime_manifest
    )
    started_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    claim = make_claim_for_slot(
        slot,
        plan_hash=vbd_joint_replicated_validation_plan().plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=started_at.isoformat(),
        deadline_at=(started_at + timedelta(hours=2)).isoformat(),
    )
    authorization = authorize_reviewed_execution(
        slot,
        packet=packet,
        claim=claim,
        runtime_manifest=runtime_manifest,
        review_state="GO",
        review_receipt_hash=review_receipt.receipt_hash,
        review_receipt=review_receipt,
    )
    sampler_calls = 0

    class SamplerBoundaryReached(Exception):
        pass

    def capture_sampler(**_kwargs):
        nonlocal sampler_calls
        sampler_calls += 1
        raise SamplerBoundaryReached

    monkeypatch.setattr("fluencytracr_inference.vbd_joint_model.pm.sample", capture_sampler)

    with pytest.raises(SamplerBoundaryReached):
        fit_vbd_joint_replicated_model(
            prepared,
            slot=slot,
            packet=packet,
            claim=claim,
            authorization=authorization,
            runtime_manifest=runtime_manifest,
            review_receipt=review_receipt,
            execution_root=tmp_path,
        )
    with pytest.raises(VBDJointReplicatedBridgeError, match="already consumed"):
        fit_vbd_joint_replicated_model(
            prepared,
            slot=slot,
            packet=packet,
            claim=claim,
            authorization=authorization,
            runtime_manifest=runtime_manifest,
            review_receipt=review_receipt,
            execution_root=tmp_path,
        )
    assert sampler_calls == 1


def test_v4_sampler_deadline_persists_a_durable_timeout_hold(monkeypatch, tmp_path):
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)
    runtime_manifest = _runtime_manifest()
    review_receipt = _review_receipt(runtime_manifest.source_commit)
    monkeypatch.setattr(
        replicated_runner, "observe_runtime_manifest", lambda: runtime_manifest
    )
    monkeypatch.setattr(
        replicated_runner,
        "observe_github_review_receipt",
        lambda **_kwargs: review_receipt,
    )
    packet = build_sampler_free_execution_packet(
        slot, runtime_manifest=runtime_manifest
    )
    started_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    claim = make_claim_for_slot(
        slot,
        plan_hash=vbd_joint_replicated_validation_plan().plan_hash,
        runtime_manifest=runtime_manifest,
        started_at=started_at.isoformat(),
        deadline_at=(started_at + timedelta(hours=2)).isoformat(),
    )
    authorization = authorize_reviewed_execution(
        slot,
        packet=packet,
        claim=claim,
        runtime_manifest=runtime_manifest,
        review_state="GO",
        review_receipt_hash=review_receipt.receipt_hash,
        review_receipt=review_receipt,
    )
    monkeypatch.setattr(
        "fluencytracr_inference.vbd_joint_model._remaining_replicated_sampler_seconds",
        lambda _claim: 0.05,
        raising=False,
    )
    monkeypatch.setattr(
        "fluencytracr_inference.vbd_joint_model.pm.sample",
        lambda **_kwargs: time.sleep(0.2),
    )

    with pytest.raises(VBDJointReplicatedBridgeError, match="two-hour sampler deadline"):
        fit_vbd_joint_replicated_model(
            prepared,
            slot=slot,
            packet=packet,
            claim=claim,
            authorization=authorization,
            runtime_manifest=runtime_manifest,
            review_receipt=review_receipt,
            execution_root=tmp_path,
        )

    timeout_path = tmp_path / "timeouts" / f"{claim.claim_hash}.json"
    persisted = json.loads(timeout_path.read_text(encoding="utf-8"))
    assert persisted["disposition"]["state"] == "HOLD"
    assert persisted["disposition"]["failure_code"] == "SAMPLER_TIMEOUT"
    assert persisted["checkpoint"]["claim_hash"] == claim.claim_hash
    assert persisted["checkpoint"]["case_hash"] == case.content_hash()


def test_fit_receipt_rejects_full_model_diagnostic_failure():
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)
    claim = SimpleNamespace(claim_hash="a" * 64)
    launch_body = {
        "slot_id": slot.slot_id,
        "packet_hash": "1" * 64,
        "claim_hash": claim.claim_hash,
        "authorization_hash": "2" * 64,
        "review_receipt_hash": "3" * 64,
        "consumed_at": "2026-08-11T00:00:00+00:00",
    }
    launch = replicated_runner.VBDJointReplicatedLaunchReceipt(
        **launch_body,
        launch_receipt_hash=sha256_json(launch_body),
    )
    fit = VBDJointFit(
        idata=object(),
        prepared=prepared,
        variant=slot.variant,
        settings=VBDJointSamplerSettings(
            mode="full",
            chains=slot.chains,
            draws=slot.draws,
            tune=slot.tune,
            target_accept=slot.target_accept,
            max_treedepth=slot.max_treedepth,
        ),
        seed=slot.sampler_seed_base,
        coefficient_summaries=(),
        diagnostics={
            "state": "HOLD",
            "failing_diagnostics": ["r_hat"],
            "max_r_hat": 1.02,
            "min_bulk_ess": 500.0,
            "min_tail_ess": 500.0,
            "divergence_count": 0,
            "max_treedepth_count": 0,
            "full_run_required_for_qualification": True,
        },
        bayesian_r_squared_mean=0.5,
        future_window_rmse=1.0,
        future_window_log_score=-1.0,
        wall_time_seconds=1.0,
    )

    with pytest.raises(VBDJointReplicatedBridgeError, match="durable HOLD"):
        _validated_fit_receipt(
            fit,
            slot=slot,
            claim=claim,
            launch_receipt=launch,
        )


def test_v4_prepared_data_cannot_reach_existing_sampler_entry_points(monkeypatch):
    slot = _slot("primary")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    prepared = prepare_vbd_joint_replicated_dataset(case, slot=slot)

    def sampler_reached(**_kwargs):
        raise AssertionError("sampler initialized")

    monkeypatch.setattr("fluencytracr_inference.vbd_joint_model.pm.sample", sampler_reached)
    with pytest.raises(VBDJointStructureError, match="V3 sampler path"):
        fit_vbd_joint_model(
            prepared,
            variant="full",
            seed=VBD_JOINT_PRIMARY_SEED,
            mode="smoke",
        )
    with pytest.raises(VBDJointStructureError, match="exact replicated sampler binding"):
        _fit_vbd_joint_model_with_settings(
            prepared,
            variant="full",
            settings=VBDJointSamplerSettings(
                mode="smoke",
                chains=2,
                draws=1,
                tune=1,
                target_accept=0.5,
                max_treedepth=1,
            ),
            chain_seeds=(7, 8),
            summary_seed=7,
        )

    with pytest.raises(VBDJointStructureError, match="execution packet"):
        _fit_vbd_joint_model_with_settings(
            prepared,
            variant=slot.variant,
            settings=VBDJointSamplerSettings(
                mode="full",
                chains=slot.chains,
                draws=1,
                tune=1,
                target_accept=0.5,
                max_treedepth=1,
            ),
            chain_seeds=slot.chain_seeds,
            summary_seed=slot.sampler_seed_base,
            replicated_slot=slot,
        )
