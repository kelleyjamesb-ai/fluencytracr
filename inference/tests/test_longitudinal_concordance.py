from copy import deepcopy
from dataclasses import replace

import pytest

import fluencytracr_inference.longitudinal_concordance as concordance_module
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.longitudinal_concordance import (
    LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD,
    LONGITUDINAL_CONCORDANCE_MEAN_MAX_REFERENCE_SD,
    LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT,
    LONGITUDINAL_CONCORDANCE_SD_RATIO_MAX,
    LONGITUDINAL_CONCORDANCE_SD_RATIO_MIN,
    LONGITUDINAL_CONCORDANCE_SEEDS,
    LongitudinalConcordanceSlotResult,
    assemble_longitudinal_concordance_study,
    evaluate_quantity_concordance,
    is_runner_generated_concordance_study,
    longitudinal_concordance_plan,
    required_longitudinal_concordance_slots,
    run_longitudinal_concordance_study,
    validate_runner_generated_concordance_study,
)
from fluencytracr_inference.longitudinal_concordance_artifact import (
    LONGITUDINAL_CONCORDANCE_ARTIFACT_CLASS,
    LONGITUDINAL_CONCORDANCE_ARTIFACT_SCHEMA_VERSION,
    LONGITUDINAL_CONCORDANCE_MODEL_SLICE,
    emit_runner_generated_concordance_artifact,
    longitudinal_concordance_payload_hash,
    longitudinal_concordance_self_hash,
    run_longitudinal_concordance_artifact,
)
from fluencytracr_inference.longitudinal_state_space import PosteriorQuantitySummary


def _summary(
    name="beta_velocity",
    mean=0.0,
    sd=1.0,
    lower=-1.0,
    upper=1.0,
):
    return PosteriorQuantitySummary(name, mean, sd, lower, upper)


def test_compiled_plan_is_exactly_six_cells_by_five_seeds():
    slots = required_longitudinal_concordance_slots()
    plan = longitudinal_concordance_plan()

    assert len(slots) == LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT == 30
    assert len({slot.slot_id for slot in slots}) == 30
    assert {slot.effect_size_sd for slot in slots} == {0.0, 0.2, 0.5}
    assert {slot.panel_group_count for slot in slots} == {6, 12}
    assert {slot.seed for slot in slots} == set(LONGITUDINAL_CONCORDANCE_SEEDS)
    assert plan["required_slot_count"] == 30
    plan_body = {key: value for key, value in plan.items() if key != "plan_hash"}
    assert plan["plan_hash"] == sha256_json(plan_body)


def test_concordance_gates_pass_at_compiled_boundaries():
    reference = _summary()
    primary = _summary(
        mean=LONGITUDINAL_CONCORDANCE_MEAN_MAX_REFERENCE_SD,
        sd=LONGITUDINAL_CONCORDANCE_SD_RATIO_MAX,
        lower=-1.0 + LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD,
        upper=1.0 - LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD,
    )
    result = evaluate_quantity_concordance(primary, reference)

    assert result.passed is True
    assert result.primary_to_reference_sd_ratio == LONGITUDINAL_CONCORDANCE_SD_RATIO_MAX


@pytest.mark.parametrize(
    "primary",
    [
        _summary(mean=LONGITUDINAL_CONCORDANCE_MEAN_MAX_REFERENCE_SD + 1e-6),
        _summary(lower=-1.0 - LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD - 1e-6),
        _summary(upper=1.0 + LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD + 1e-6),
        _summary(sd=LONGITUDINAL_CONCORDANCE_SD_RATIO_MIN - 1e-6),
        _summary(sd=LONGITUDINAL_CONCORDANCE_SD_RATIO_MAX + 1e-6),
    ],
)
def test_each_concordance_gate_fails_closed(primary):
    assert evaluate_quantity_concordance(primary, _summary()).passed is False


def test_concordance_rejects_mismatched_or_invalid_summaries():
    with pytest.raises(ValueError, match="same quantity"):
        evaluate_quantity_concordance(_summary("beta_velocity"), _summary("rho"))
    with pytest.raises(ValueError, match="reference posterior SD"):
        evaluate_quantity_concordance(_summary(), _summary(sd=0.0))


@pytest.fixture(scope="module")
def smoke_artifact():
    return run_longitudinal_concordance_artifact(
        mode="smoke",
        generated_at="2026-07-12T00:00:00+00:00",
    )[0]


def test_smoke_study_is_partial_and_hold():
    study = run_longitudinal_concordance_study(mode="smoke")

    assert study.study_status == "HOLD"
    assert study.passed is False
    assert study.exact_manifest_complete is False
    assert len(study.slot_results) == 1
    assert len(study.missing_slot_ids) == 29
    assert study.duplicate_evidence_binding_hashes == ()
    assert "full_study_settings" in study.failing_checks
    assert "missing_slots" in study.failing_checks


def test_copied_runner_study_cannot_reuse_runner_identity():
    study = run_longitudinal_concordance_study(mode="smoke")
    copied = replace(study)

    assert is_runner_generated_concordance_study(study) is True
    assert is_runner_generated_concordance_study(copied) is False
    with pytest.raises(ValueError, match="exact runner study object"):
        validate_runner_generated_concordance_study(copied)
    with pytest.raises(ValueError, match="exact runner study object"):
        emit_runner_generated_concordance_artifact(copied)


def test_runner_study_recomputation_rejects_nested_mutation():
    study = run_longitudinal_concordance_study(mode="smoke")
    study.slot_results[0].reference_settings["chains"] = 999

    with pytest.raises(ValueError, match="failed recomputation"):
        validate_runner_generated_concordance_study(study)


def test_direct_assembly_is_not_runner_registered_and_mismatched_mode_holds():
    study = run_longitudinal_concordance_study(mode="smoke")
    result = study.slot_results[0]
    mismatched = replace(result, execution_mode="full", slot_result_hash="")
    mismatched = replace(
        mismatched,
        slot_result_hash=sha256_json(mismatched.body_without_hash()),
    )
    assembled = assemble_longitudinal_concordance_study(
        (mismatched,),
        execution_mode="smoke",
        _token=concordance_module._RUNNER_TOKEN,
    )

    assert assembled.study_status == "HOLD"
    assert assembled.exact_manifest_complete is False
    assert "slot_failures" in assembled.failing_checks
    assert is_runner_generated_concordance_study(assembled) is False


def test_distinct_slot_ids_cannot_reuse_cloned_evidence_bindings(monkeypatch):
    slots = required_longitudinal_concordance_slots()
    cloned_hashes = {
        "prepared_input_hash": "a" * 64,
        "model_input_hash": "b" * 64,
        "context_binding_hash": "c" * 64,
        "truth_receipt_hash": "d" * 64,
        "case_binding_hash": "e" * 64,
        "primary_fit_summary_hash": "f" * 64,
        "reference_fit_summary_hash": "0" * 64,
    }
    template = LongitudinalConcordanceSlotResult(
        slot=slots[0],
        execution_mode="full",
        status="PASS",
        failing_checks=(),
        **cloned_hashes,
        primary_integration_diagnostics={},
        reference_settings={},
        reference_sampler_diagnostics={},
        posterior_predictive_checks=(),
        quantity_concordance=(),
        slot_result_hash="1" * 64,
    )

    def cloned_result(slot, *, mode):
        assert mode == "full"
        cloned = replace(
            template,
            slot=slot,
            slot_result_hash="",
        )
        return replace(
            cloned,
            slot_result_hash=sha256_json(cloned.body_without_hash()),
        )

    monkeypatch.setattr(
        concordance_module,
        "run_longitudinal_concordance_slot",
        cloned_result,
    )
    study = concordance_module.run_longitudinal_concordance_study(mode="full")

    assert len({result.slot.slot_id for result in study.slot_results}) == 30
    assert study.missing_slot_ids == ()
    assert study.duplicate_slot_ids == ()
    assert study.off_plan_slot_ids == ()
    assert set(study.duplicate_evidence_binding_hashes) == {
        f"{name}:{value}" for name, value in cloned_hashes.items()
    }
    assert study.all_slots_passed is True
    assert study.exact_manifest_complete is False
    assert study.study_status == "HOLD"
    assert study.failing_checks == ("duplicate_evidence_bindings",)


def test_reference_runner_error_emits_bridgeable_hold_without_partial_fit(
    monkeypatch,
):
    def fail_reference(*_args, **_kwargs):
        raise RuntimeError("synthetic reference failure")

    monkeypatch.setattr(
        concordance_module,
        "fit_longitudinal_nuts_reference",
        fail_reference,
    )
    result = concordance_module.run_longitudinal_concordance_slot(
        required_longitudinal_concordance_slots()[0],
        mode="smoke",
    )

    assert result.status == "HOLD"
    assert result.failing_checks == ("runner_error",)
    assert result.runner_error_stage == "reference"
    assert result.runner_error_type == "RuntimeError"
    assert result.case_binding_hash is not None
    assert result.primary_fit_summary_hash is None
    assert result.primary_integration_diagnostics is None


def test_smoke_artifact_is_separate_hash_bound_and_nonauthorizing(smoke_artifact):
    artifact = smoke_artifact

    assert artifact["schema_version"] == LONGITUDINAL_CONCORDANCE_ARTIFACT_SCHEMA_VERSION
    assert artifact["artifact_class"] == LONGITUDINAL_CONCORDANCE_ARTIFACT_CLASS
    assert artifact["model_slice"] == LONGITUDINAL_CONCORDANCE_MODEL_SLICE
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["validation_scope"]["state_space_nuts_concordance_complete"] is False
    assert artifact["validation_scope"]["replicated_validation_complete"] is False
    assert artifact["governance_state"]["concordance_gate_passed"] is False
    assert artifact["governance_state"]["independent_acceptance_required"] is True
    assert artifact["governance_state"]["independent_acceptance_complete"] is False
    assert artifact["governance_state"]["replicated_validation_unblocked"] is False
    assert artifact["internal_only"] is True
    assert artifact["synthetic_only"] is True
    assert artifact["customer_output_authorized"] is False
    assert artifact["probability_output_authorized"] is False
    assert artifact["confidence_output_authorized"] is False
    assert artifact["hash_bindings"]["study_plan_hash"] == artifact["study_plan"]["plan_hash"]
    assert artifact["hash_bindings"]["slot_results_hash"] == sha256_json(
        artifact["slot_results"]
    )
    assert artifact["hash_bindings"]["artifact_payload_hash"] == longitudinal_concordance_payload_hash(
        artifact
    )
    assert artifact["hash_bindings"]["artifact_self_hash"] == longitudinal_concordance_self_hash(
        artifact
    )


def test_artifact_contains_no_truth_or_raw_posterior_payloads(smoke_artifact):
    def keys(value):
        if isinstance(value, dict):
            return set(value).union(*(keys(item) for item in value.values()))
        if isinstance(value, list):
            return set().union(*(keys(item) for item in value)) if value else set()
        return set()

    all_keys = keys(smoke_artifact)

    assert "ground_truth" not in all_keys
    assert "panel_group_effects" not in all_keys
    assert "posterior_draws" not in all_keys
    assert "latent_states" not in all_keys
    assert smoke_artifact["synthetic_data_boundary"]["posterior_draws_emitted"] is False
    assert smoke_artifact["synthetic_data_boundary"]["latent_states_emitted"] is False


def test_hashes_detect_slot_and_governance_tampering(smoke_artifact):
    slot_tampered = deepcopy(smoke_artifact)
    slot_tampered["slot_results"][0]["status"] = "PASS"
    assert longitudinal_concordance_payload_hash(slot_tampered) != slot_tampered[
        "hash_bindings"
    ]["artifact_payload_hash"]
    assert longitudinal_concordance_self_hash(slot_tampered) != slot_tampered[
        "hash_bindings"
    ]["artifact_self_hash"]

    governance_tampered = deepcopy(smoke_artifact)
    governance_tampered["customer_output_authorized"] = True
    assert longitudinal_concordance_self_hash(governance_tampered) != governance_tampered[
        "hash_bindings"
    ]["artifact_self_hash"]


def test_invalid_execution_mode_rejects():
    with pytest.raises(ValueError, match="full or smoke"):
        run_longitudinal_concordance_study(mode="fixture")  # type: ignore[arg-type]
