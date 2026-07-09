"""Internal task-3.3 required-evidence report.

This module composes the sampler-artifact acceptance sidecar with the
negative-control and floor-control sidecars without trusting their JSON report
booleans as proof. Negative and floor controls are recomputed from emitted
artifacts in the same call. The output is an internal review ledger only: it
does not authorize artifact inputs, OpenSpec task completion, customer output,
probability/confidence output, ROI, causality, productivity, routes, UI,
persistence, exports, schemas, or connectors.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from .acceptance_study import AcceptanceStudyResult, _blocked_outputs
from .hashing import sha256_json
from .negative_control_study import (
    build_floor_control_report,
    build_negative_control_report,
)

TASK_3_3_REQUIRED_EVIDENCE_REPORT_CLASS = (
    "internal_synthetic_task_3_3_required_evidence_report"
)
TASK_3_3_REQUIRED_EVIDENCE_HOLD_STATE = "hold_required_evidence_incomplete"
TASK_3_3_REQUIRED_EVIDENCE_OBSERVED_STATE = (
    "required_evidence_observed_not_authorized"
)


def build_task_3_3_required_evidence_report(
    acceptance_result: AcceptanceStudyResult | object,
    *,
    negative_control_artifacts_by_control_id: Mapping[str, dict] | None = None,
    floor_control_artifacts_by_control_id: Mapping[str, dict] | None = None,
    evaluation_mode: str = "required_evidence_internal_review",
) -> dict:
    """Build a fail-closed internal ledger for OpenSpec task 3.3 evidence.

    ``acceptance_result`` must be an in-memory :class:`AcceptanceStudyResult`
    from the sampler-artifact runner or combiner. Passing a sidecar JSON report
    or plan is intentionally non-authorizing. Negative/floor report dicts are
    also not accepted as inputs; callers must pass artifact maps so the control
    sidecars can recompute their own findings.
    """

    sampler_report = (
        acceptance_result.to_report()
        if isinstance(acceptance_result, AcceptanceStudyResult)
        else None
    )
    sampler_artifact_acceptance_observed = bool(
        isinstance(acceptance_result, AcceptanceStudyResult)
        and acceptance_result.sampler_artifact_acceptance_passed
    )
    sampler_artifact_resumable_evidence_observed = bool(
        isinstance(acceptance_result, AcceptanceStudyResult)
        and acceptance_result.sampler_artifact_resumable_evidence_observed
    )

    negative_report = build_negative_control_report(
        _artifact_map_or_empty(negative_control_artifacts_by_control_id),
        evaluation_mode=evaluation_mode,
    )
    floor_report = build_floor_control_report(
        _artifact_map_or_empty(floor_control_artifacts_by_control_id),
        evaluation_mode=evaluation_mode,
    )

    negative_controls_observed = bool(
        negative_report["all_required_controls_present"]
        and negative_report["all_controls_pass"]
    )
    floor_controls_observed = bool(
        floor_report["all_required_controls_present"]
        and floor_report["all_controls_pass"]
    )
    required_evidence_observed = bool(
        sampler_artifact_acceptance_observed
        and negative_controls_observed
        and floor_controls_observed
    )

    body = {
        "report_class": TASK_3_3_REQUIRED_EVIDENCE_REPORT_CLASS,
        "task_id": "3.3",
        "evaluation_mode": evaluation_mode,
        "internal_only": True,
        "artifact_inputs_authorized": False,
        "open_spec_3_3_completion_authorized": False,
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "finance_output_authorized": False,
        "blocked_outputs": _blocked_outputs(),
        "sampler_artifact_acceptance_observed": (
            sampler_artifact_acceptance_observed
        ),
        "sampler_artifact_resumable_evidence_observed": (
            sampler_artifact_resumable_evidence_observed
        ),
        "negative_controls_observed": negative_controls_observed,
        "floor_controls_observed": floor_controls_observed,
        "task_3_3_required_evidence_observed": required_evidence_observed,
        "task_3_3_resumable_evidence_observed": bool(
            sampler_artifact_resumable_evidence_observed
            and negative_controls_observed
            and floor_controls_observed
        ),
        "task_3_3_required_evidence_state": (
            TASK_3_3_REQUIRED_EVIDENCE_OBSERVED_STATE
            if required_evidence_observed
            else TASK_3_3_REQUIRED_EVIDENCE_HOLD_STATE
        ),
        "component_hashes": {
            "sampler_acceptance_report_hash": (
                sha256_json(sampler_report) if sampler_report is not None else None
            ),
            "negative_control_report_hash": sha256_json(negative_report),
            "floor_control_report_hash": sha256_json(floor_report),
        },
        "components": {
            "sampler": _sampler_component_summary(
                acceptance_result, sampler_report
            ),
            "negative_controls": _control_component_summary(negative_report),
            "floor_controls": _control_component_summary(floor_report),
        },
    }
    body["report_hash"] = sha256_json(body)
    return body


def _artifact_map_or_empty(
    value: Mapping[str, dict] | None,
) -> dict[str, dict]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):
        return {}
    return {
        str(control_id): artifact
        for control_id, artifact in value.items()
        if isinstance(control_id, str) and isinstance(artifact, dict)
    }


def _sampler_component_summary(
    acceptance_result: object, sampler_report: dict | None
) -> dict:
    if not isinstance(acceptance_result, AcceptanceStudyResult) or sampler_report is None:
        return {
            "input_type_valid": False,
            "sampler_artifact_acceptance_observed": False,
            "reason": _invalid_acceptance_input_reason(acceptance_result),
        }
    manifest = sampler_report["acceptance_run_manifest"]
    return {
        "input_type_valid": True,
        "method": sampler_report["method"],
        "mode": sampler_report["mode"],
        "source_report_rehydrated": sampler_report["source_report_rehydrated"],
        "runner_generated": sampler_report["runner_generated"],
        "runner_generation_proof_valid": manifest[
            "runner_generation_proof_valid"
        ],
        "source_report_runner_generation_proof_observed": manifest[
            "source_report_runner_generation_proof_observed"
        ],
        "source_report_hash_count": manifest["source_report_hash_count"],
        "source_report_runner_generation_proof_hash_count": manifest[
            "source_report_runner_generation_proof_hash_count"
        ],
        "replication_count": sampler_report["replication_count"],
        "replication_count_per_cell": sampler_report[
            "replication_count_per_cell"
        ],
        "required_acceptance_cell_set_complete": sampler_report[
            "required_acceptance_cell_set_complete"
        ],
        "full_replication_requirement_met": sampler_report[
            "full_replication_requirement_met"
        ],
        "full_sampler_settings_exact": manifest["full_sampler_settings_exact"],
        "full_replication_slot_grid_exact": manifest[
            "full_replication_slot_grid_exact"
        ],
        "missing_expected_replication_slot_count": manifest[
            "missing_expected_replication_slot_count"
        ],
        "unexpected_replication_slot_count": manifest[
            "unexpected_replication_slot_count"
        ],
        "duplicate_replication_slot_count": manifest[
            "duplicate_replication_slot_count"
        ],
        "sampler_artifact_acceptance_observed": sampler_report[
            "sampler_artifact_acceptance_passed"
        ],
        "sampler_artifact_acceptance_passed": sampler_report[
            "sampler_artifact_acceptance_passed"
        ],
        "sampler_artifact_resumable_evidence_observed": sampler_report[
            "sampler_artifact_resumable_evidence_observed"
        ],
        "task_3_3_acceptance_state": sampler_report[
            "task_3_3_acceptance_state"
        ],
    }


def _invalid_acceptance_input_reason(value: object) -> str:
    if isinstance(value, dict):
        report_class = value.get("report_class")
        if report_class == "internal_synthetic_acceptance_execution_plan":
            return "acceptance_plan_is_not_run_evidence"
        if report_class == "internal_synthetic_acceptance_study_report":
            return "acceptance_report_json_is_not_in_memory_runner_evidence"
        return "dict_input_is_not_in_memory_runner_evidence"
    return "acceptance_result_missing_or_invalid"


def _control_component_summary(report: dict[str, Any]) -> dict:
    controls = report.get("controls", [])
    failed_ids = [
        str(control.get("control_id"))
        for control in controls
        if isinstance(control, dict) and control.get("pass") is not True
    ]
    return {
        "report_class": report["report_class"],
        "evaluation_mode": report["evaluation_mode"],
        "control_count": report["control_count"],
        "all_required_controls_present": report[
            "all_required_controls_present"
        ],
        "all_controls_pass": report["all_controls_pass"],
        "failed_control_ids": failed_ids,
    }
