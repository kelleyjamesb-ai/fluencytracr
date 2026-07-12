import hashlib
import json
from copy import deepcopy
from pathlib import Path

from fluencytracr_inference.artifact import lockfile_hash
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.longitudinal_concordance_artifact import (
    LONGITUDINAL_CONCORDANCE_PYTHON_REQUIRES,
    longitudinal_concordance_payload_hash,
    longitudinal_concordance_self_hash,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_PATH = (
    Path(__file__).resolve().parents[1]
    / "evidence"
    / "longitudinal_state_space_nuts_concordance_2026_07.json"
)
FULL_ARTIFACT_PATH = (
    EVIDENCE_PATH.parent
    / "longitudinal_state_space_nuts_concordance_full_2026_07.json"
)
ACCEPTANCE_PATH = (
    EVIDENCE_PATH.parent
    / "longitudinal_state_space_nuts_concordance_acceptance_2026_07.json"
)


def _evidence():
    return json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))


def _acceptance():
    return json.loads(ACCEPTANCE_PATH.read_text(encoding="utf-8"))


def _committed_source_artifact(evidence):
    source = evidence["source_evidence"]
    assert source["source_artifact_committed"] is True
    assert REPO_ROOT / source["source_artifact_path"] == FULL_ARTIFACT_PATH
    assert FULL_ARTIFACT_PATH.is_file(), (
        "PASS evidence requires the committed full concordance artifact at "
        f"{FULL_ARTIFACT_PATH.relative_to(REPO_ROOT)}"
    )
    payload = FULL_ARTIFACT_PATH.read_bytes()
    assert hashlib.sha256(payload).hexdigest() == source["source_artifact_sha256"]
    assert FULL_ARTIFACT_PATH.resolve().is_relative_to(REPO_ROOT)
    artifact = json.loads(payload)
    assert artifact["schema_version"] == source["artifact_schema_version"]
    assert artifact["study_summary"]["execution_mode"] == source["execution_mode"]
    assert artifact["hash_bindings"]["artifact_self_hash"] == source["artifact_self_hash"]
    assert artifact["study_plan"]["plan_hash"] == source["study_plan_hash"]
    assert artifact["study_summary"]["study_result_hash"] == source["study_result_hash"]
    assert artifact["python_requires"] == source["python_requires"]
    assert artifact["lockfile_hash"] == source["lockfile_hash"] == lockfile_hash()
    assert artifact["generation_runtime"] == evidence["runtime_versions"]
    assert artifact["hash_bindings"]["artifact_payload_hash"] == (
        longitudinal_concordance_payload_hash(artifact)
    )
    assert artifact["hash_bindings"]["artifact_self_hash"] == (
        longitudinal_concordance_self_hash(artifact)
    )
    return artifact


def _derive_summary(artifact):
    slots = artifact["slot_results"]
    study = artifact["study_summary"]
    plan = artifact["study_plan"]
    cells = {}
    parameter_diagnostics = []
    sampler_diagnostics = []
    ppc_checks = []
    concordance = []

    for slot in slots:
        cell = cells.setdefault(slot["cell_id"], {"slot_count": 0, "pass_count": 0})
        cell["slot_count"] += 1
        if slot["status"] == "PASS" and not slot["failing_checks"]:
            cell["pass_count"] += 1
        sampler = slot["reference_sampler_diagnostics"]
        assert sampler is not None
        sampler_diagnostics.append(sampler)
        parameter_diagnostics.extend(sampler["parameters"])
        ppc_checks.extend(slot["posterior_predictive_checks"])
        concordance.extend(slot["quantity_concordance"])

    return {
        "plan": {
            "effect_sizes_sd": plan["effect_sizes_sd"],
            "panel_group_counts": plan["panel_group_counts"],
            "seeds": plan["seeds"],
            "required_slot_count": plan["required_slot_count"],
            "executed_slot_count": len(slots),
            "missing_slot_count": len(study["missing_slot_ids"]),
            "duplicate_slot_count": len(study["duplicate_slot_ids"]),
            "off_plan_slot_count": len(study["off_plan_slot_ids"]),
            "duplicate_evidence_binding_count": len(
                study["duplicate_evidence_binding_hashes"]
            ),
            "runner_error_count": sum(
                slot["runner_error_stage"] is not None
                or slot["runner_error_type"] is not None
                for slot in slots
            ),
        },
        "cells": cells,
        "sampler_diagnostics": {
            "max_r_hat": max(item["r_hat"] for item in parameter_diagnostics),
            "min_bulk_ess": min(item["bulk_ess"] for item in parameter_diagnostics),
            "min_tail_ess": min(item["tail_ess"] for item in parameter_diagnostics),
            "max_mcse_to_posterior_sd_ratio": max(
                item["max_mcse_to_posterior_sd_ratio"]
                for item in parameter_diagnostics
            ),
            "min_bfmi": min(
                item["energy_bfmi_min"] for item in sampler_diagnostics
            ),
            "post_warmup_divergence_count": sum(
                item["post_warmup_divergences"] for item in sampler_diagnostics
            ),
            "max_treedepth_saturation_count": sum(
                item["max_treedepth_saturation_count"]
                for item in sampler_diagnostics
            ),
        },
        "posterior_predictive_checks": {
            "min_p_value": min(item["p_value"] for item in ppc_checks),
            "max_p_value": max(item["p_value"] for item in ppc_checks),
            "failure_count": sum(not item["passed"] for item in ppc_checks),
        },
        "cross_engine_concordance": {
            "max_mean_difference_reference_sd": max(
                item["absolute_mean_difference_reference_sd"]
                for item in concordance
            ),
            "max_endpoint_difference_reference_sd": max(
                max(
                    item["lower_endpoint_difference_reference_sd"],
                    item["upper_endpoint_difference_reference_sd"],
                )
                for item in concordance
            ),
            "min_primary_to_reference_sd_ratio": min(
                item["primary_to_reference_sd_ratio"] for item in concordance
            ),
            "max_primary_to_reference_sd_ratio": max(
                item["primary_to_reference_sd_ratio"] for item in concordance
            ),
            "failure_count": sum(not item["passed"] for item in concordance),
        },
    }


def test_full_concordance_evidence_summary_is_exact_and_complete():
    evidence = _evidence()
    plan = evidence["plan"]

    assert plan["effect_sizes_sd"] == [0.0, 0.2, 0.5]
    assert plan["panel_group_counts"] == [6, 12]
    assert len(plan["seeds"]) == 5
    assert plan["required_slot_count"] == 30
    assert plan["executed_slot_count"] == 30
    assert plan["missing_slot_count"] == 0
    assert plan["duplicate_slot_count"] == 0
    assert plan["off_plan_slot_count"] == 0
    assert plan["duplicate_evidence_binding_count"] == 0
    assert plan["runner_error_count"] == 0
    assert len(evidence["cells"]) == 6
    assert all(
        cell == {"slot_count": 5, "pass_count": 5}
        for cell in evidence["cells"].values()
    )


def test_evidence_clears_every_compiled_gate():
    evidence = _evidence()
    sampler = evidence["sampler_diagnostics"]
    ppc = evidence["posterior_predictive_checks"]
    concordance = evidence["cross_engine_concordance"]

    assert sampler["max_r_hat"] <= 1.01
    assert sampler["min_bulk_ess"] >= 400
    assert sampler["min_tail_ess"] >= 400
    assert sampler["max_mcse_to_posterior_sd_ratio"] <= 0.1
    assert sampler["min_bfmi"] >= 0.3
    assert sampler["post_warmup_divergence_count"] == 0
    assert sampler["max_treedepth_saturation_count"] == 0
    assert 0.05 <= ppc["min_p_value"] <= ppc["max_p_value"] <= 0.95
    assert ppc["failure_count"] == 0
    assert concordance["max_mean_difference_reference_sd"] <= 0.15
    assert concordance["max_endpoint_difference_reference_sd"] <= 0.20
    assert concordance["min_primary_to_reference_sd_ratio"] >= 0.85
    assert concordance["max_primary_to_reference_sd_ratio"] <= 1.15
    assert concordance["failure_count"] == 0


def test_pass_evidence_is_derived_from_one_committed_source_artifact():
    evidence = _evidence()
    artifact = _committed_source_artifact(evidence)
    derived = _derive_summary(artifact)

    assert evidence["plan"] == derived["plan"]
    assert evidence["cells"] == derived["cells"]
    assert evidence["sampler_diagnostics"] == derived["sampler_diagnostics"]
    assert evidence["posterior_predictive_checks"] == derived[
        "posterior_predictive_checks"
    ]
    assert evidence["cross_engine_concordance"] == derived[
        "cross_engine_concordance"
    ]


def test_evidence_remains_summary_only_and_nonauthorizing():
    evidence = _evidence()
    source = evidence["source_evidence"]
    governance = evidence["governance"]

    assert len(source["source_artifact_sha256"]) == 64
    assert len(source["artifact_self_hash"]) == 64
    assert source["summary_only"] is True
    assert source["posterior_draws_committed"] is False
    assert source["latent_states_committed"] is False
    assert source["python_requires"] == LONGITUDINAL_CONCORDANCE_PYTHON_REQUIRES
    assert source["lockfile_hash"] == lockfile_hash()
    assert governance["study_status"] == "PASS"
    assert governance["artifact_state"] == "valid_internal_validation_non_authorizing"
    assert governance["concordance_gate_passed"] is True
    assert governance["independent_acceptance_complete"] is False
    assert governance["replicated_validation_unblocked"] is False
    assert governance["replicated_validation_complete"] is False
    assert governance["calibration_complete"] is False
    assert governance["production_promotion_complete"] is False
    assert governance["internal_only"] is True
    assert governance["synthetic_only"] is True
    assert governance["customer_output_authorized"] is False
    assert governance["probability_output_authorized"] is False
    assert governance["confidence_output_authorized"] is False
    assert governance["roi_output_authorized"] is False
    assert governance["causality_output_authorized"] is False
    assert governance["productivity_output_authorized"] is False


def test_separate_acceptance_record_binds_reviewed_commit_and_evidence():
    record = _acceptance()
    source = record["source_evidence"]
    full_artifact = json.loads(FULL_ARTIFACT_PATH.read_text(encoding="utf-8"))

    assert set(record) == {
        "schema_version",
        "record_class",
        "reviewed_at",
        "reviewed_change_id",
        "reviewed_implementation_commit",
        "source_evidence",
        "review_decisions",
        "overall_decision",
        "next_step_state",
        "governance_pins",
        "hash_bindings",
    }
    assert record["reviewed_implementation_commit"] == (
        "6c0b0faa7511dc0cdc7119c2856bdbe0ad06ad5c"
    )
    assert hashlib.sha256(FULL_ARTIFACT_PATH.read_bytes()).hexdigest() == (
        source["full_artifact_sha256"]
    )
    assert hashlib.sha256(EVIDENCE_PATH.read_bytes()).hexdigest() == (
        source["compact_summary_sha256"]
    )
    assert full_artifact["hash_bindings"]["artifact_self_hash"] == (
        source["artifact_self_hash"]
    )
    assert full_artifact["study_plan"]["plan_hash"] == source["study_plan_hash"]
    assert full_artifact["study_summary"]["study_result_hash"] == (
        source["study_result_hash"]
    )
    assert full_artifact["lockfile_hash"] == source["requirements_lock_hash"]
    assert full_artifact["python_requires"] == source["python_requires"]

    reviews = record["review_decisions"]
    assert [review["role"] for review in reviews] == ["CODE", "BUG", "ADVERSARIAL"]
    assert all(review["decision"] == "GO" for review in reviews)
    assert all(review["reviewer_kind"] == "independent_codex_subagent" for review in reviews)
    assert len({review["review_ref"] for review in reviews}) == 3
    assert record["overall_decision"] == "GO"

    next_step = record["next_step_state"]
    assert next_step["replicated_validation_unblocked"] is True
    assert next_step["replicated_validation_complete"] is False
    assert next_step["full_longitudinal_proof_complete"] is False
    pins = record["governance_pins"]
    assert pins["synthetic_only"] is True
    assert pins["aggregate_only"] is True
    assert pins["internal_only"] is True
    assert pins["did_status"] == "isolated_incomplete"
    assert all(
        value is False
        for key, value in pins.items()
        if key not in {"synthetic_only", "aggregate_only", "internal_only", "did_status"}
    )

    hash_body = deepcopy(record)
    hash_body["hash_bindings"]["record_self_hash"] = ""
    assert record["hash_bindings"]["record_self_hash"] == sha256_json(hash_body)
    assert record["hash_bindings"]["hash_posture"] == (
        "consistency_and_drift_detection_not_coordinated_replacement_authenticity"
    )
