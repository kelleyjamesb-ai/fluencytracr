from dataclasses import replace
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from fluencytracr_inference.vbd_joint_model import (
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
)
from fluencytracr_inference.vbd_joint_replicated_synthetic import (
    generate_vbd_joint_replicated_case_for_slot,
)
import fluencytracr_inference.vbd_joint_replicated_runner as replicated_runner
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_joint_replicated_runner import (
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


def test_exact_v4_slot_reaches_the_full_joint_model_sampler_boundary(monkeypatch):
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
    authorization = authorize_reviewed_execution(
        slot,
        packet=packet,
        claim=claim,
        runtime_manifest=runtime_manifest,
        review_state="GO",
        review_receipt_hash=sha256_json({"review": "external-go", "slot": slot.slot_id}),
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
        )

    assert captured["draws"] == slot.draws
    assert captured["tune"] == slot.tune
    assert captured["chains"] == slot.chains
    assert captured["random_seed"] == list(slot.chain_seeds)
    assert captured["target_accept"] == slot.target_accept
    assert captured["max_treedepth"] == slot.max_treedepth


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
