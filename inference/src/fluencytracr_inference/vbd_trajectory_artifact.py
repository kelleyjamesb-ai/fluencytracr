"""Summary-only internal HOLD artifact for VBD trajectory development smoke."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from importlib.metadata import version as package_version
import json
import math
import platform
import re

from . import __version__ as HARNESS_VERSION
from .artifact import lockfile_hash
from .hashing import sha256_json
from .vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
    prepare_vbd_trajectory_lane,
    validate_prepared_vbd_trajectory,
)
from .vbd_trajectory_state_space import (
    TrajectoryDeterministicFit,
    fit_vbd_trajectory_state_space,
)
from .vbd_trajectory_synthetic import generate_vbd_trajectory_smoke_case
from .vbd_trajectory_types import (
    TrajectoryObservationPanel,
    VBD_TRAJECTORY_EVENTS,
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_MODEL_COMPONENT,
    VBD_TRAJECTORY_MODEL_FAMILY,
    VBD_TRAJECTORY_STATISTICS,
    VBD_TRAJECTORY_TRANSFORMS,
    canonical_unavailable_depth_context_dict,
    trajectory_panel_depth_context_available,
    vbd_trajectory_model_manifest_body,
)


VBD_TRAJECTORY_ARTIFACT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_PROOF_2026_07_V1"
)
VBD_TRAJECTORY_ARTIFACT_CLASS = (
    "internal_synthetic_vbd_trajectory_validation"
)
VBD_TRAJECTORY_MODEL_SLICE = "vbd_trajectory_synthetic_validation"
VBD_TRAJECTORY_ARTIFACT_HASH_POSTURE = (
    "consistency_and_drift_detection_not_coordinated_replacement_authenticity"
)
VBD_TRAJECTORY_PYTHON_REQUIRES = ">=3.13,<3.14"
VBD_TRAJECTORY_SMOKE_FAILURES = (
    "smoke_mode_nonacceptance",
    "incomplete_evidence",
)
VBD_TRAJECTORY_PROHIBITED_COMPOSITES = (
    "velocity_index",
    "frequency_index",
    "engagement_index",
    "breadth_index",
    "overall_vbd_score",
    "integration_score",
    "vbd_quadrant",
)
VBD_TRAJECTORY_BLOCKED_OUTPUT_FIELDS = (
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "roi_output_authorized",
    "finance_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized",
    "ai_impact_claim_authorized",
    "ranking_authorized",
    "outcome_model_integration_authorized",
    "creates_route",
    "creates_ui",
    "writes_persistence",
    "creates_export",
    "renders_readout",
    "executes_connector",
)


class TrajectoryArtifactError(ValueError):
    """The summary artifact cannot be emitted safely."""


_EMISSION_TOKEN = object()
_RFC3339_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validated_generated_at(value: str | None) -> str:
    if value is None:
        return _now()
    if type(value) is not str or _RFC3339_RE.fullmatch(value) is None:
        raise TrajectoryArtifactError(
            "generated_at must be a timezone-aware RFC3339 timestamp"
        )
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise TrajectoryArtifactError(
            "generated_at must be a timezone-aware RFC3339 timestamp"
        ) from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise TrajectoryArtifactError(
            "generated_at must be a timezone-aware RFC3339 timestamp"
        )
    return value


def _validate_json_safe(value: object, path: str = "$") -> None:
    """Reject values that JSON or the cross-language hash could coerce."""

    if value is None or type(value) in (str, bool, int):
        return
    if type(value) is float:
        if not math.isfinite(value):
            raise TrajectoryArtifactError(f"artifact contains nonfinite JSON at {path}")
        return
    if type(value) in (list, tuple):
        for index, child in enumerate(value):
            _validate_json_safe(child, f"{path}[{index}]")
        return
    if type(value) is dict:
        for key, child in value.items():
            if type(key) is not str:
                raise TrajectoryArtifactError(
                    f"artifact contains a non-string JSON key at {path}"
                )
            _validate_json_safe(child, f"{path}.{key}")
        return
    raise TrajectoryArtifactError(
        f"artifact contains unsupported JSON value at {path}: {type(value).__name__}"
    )


def _generation_runtime() -> dict:
    return {
        "python": platform.python_version(),
        "pymc": package_version("pymc"),
        "arviz": package_version("arviz"),
        "numpy": package_version("numpy"),
        "scipy": package_version("scipy"),
    }


def vbd_trajectory_artifact_payload_hash_body(artifact: dict) -> dict:
    body = deepcopy(artifact)
    body.pop("hash_bindings", None)
    return body


def vbd_trajectory_artifact_payload_hash(artifact: dict) -> str:
    _validate_json_safe(artifact)
    return sha256_json(vbd_trajectory_artifact_payload_hash_body(artifact))


def vbd_trajectory_artifact_self_hash_body(artifact: dict) -> dict:
    body = deepcopy(artifact)
    if type(body.get("hash_bindings")) is not dict:
        raise TrajectoryArtifactError("artifact hash bindings are missing")
    body["hash_bindings"]["artifact_self_hash"] = ""
    return body


def vbd_trajectory_artifact_self_hash(artifact: dict) -> str:
    _validate_json_safe(artifact)
    return sha256_json(vbd_trajectory_artifact_self_hash_body(artifact))


def _depth_context(panel: TrajectoryObservationPanel) -> dict:
    available = trajectory_panel_depth_context_available(panel)
    if available:
        context = panel.bundles[0].depth_context
        if context is None:
            raise TrajectoryArtifactError("available Depth context is missing")
        context_body = context.to_dict()
    else:
        context_body = canonical_unavailable_depth_context_dict()
    return {
        "status": "available" if available else "unavailable",
        "context_ref": context_body["context_ref"],
        "context_root": context_body["context_root"],
        "definition_ref": context_body["definition_ref"],
        "source_ref": context_body["source_ref"],
        "source_hash": context_body["source_hash"],
        "aggregate_review_state": context_body["aggregate_review_state"],
        "suppression_posture": context_body["suppression_posture"],
        "caveat_refs": list(context_body["caveat_refs"]),
        "numeric_value_present": False,
        "used_in_likelihood": False,
        "used_in_estimand": False,
        "used_in_eligibility": False,
    }


def _input_manifest(panel: TrajectoryObservationPanel) -> dict:
    model_manifest = vbd_trajectory_model_manifest_body()
    return {
        "accepted_input_kind": "three_primitive_aggregate_trajectories",
        "active_lanes": list(VBD_TRAJECTORY_LANES),
        "lane_bindings": [
            {
                "lane": lane,
                "event_name": VBD_TRAJECTORY_EVENTS[lane],
                "statistic_name": VBD_TRAJECTORY_STATISTICS[lane],
                "transform_id": VBD_TRAJECTORY_TRANSFORMS[lane],
            }
            for lane in VBD_TRAJECTORY_LANES
        ],
        "canonical_velocity_estimated": False,
        "composite_input_present": False,
        "prohibited_composite_inputs": list(
            VBD_TRAJECTORY_PROHIBITED_COMPOSITES
        ),
        "panel_group_count": panel.panel_group_count,
        "aggregate_k": panel.aggregate_k,
        "pre_window_count": panel.pre_window_count,
        "post_window_count": panel.post_window_count,
        "direction_vector": list(panel.direction_vector),
        "direction_vector_root": panel.direction_vector_root,
        "ordered_panel_manifest_root": panel.ordered_panel_manifest_root,
        "cohort_partition_root": panel.cohort_partition_root,
        "study_plan_root": panel.study_plan_root,
        "seed_manifest_root": panel.seed_manifest_root,
        "model_manifest": model_manifest,
        "model_manifest_root": panel.model_manifest_root,
        "depth_context": _depth_context(panel),
    }


def _lane_record(
    prepared: TrajectoryPreparedInput,
    fit: TrajectoryDeterministicFit,
    panel: TrajectoryObservationPanel,
) -> dict:
    if type(prepared) is not TrajectoryPreparedInput:
        raise TrajectoryArtifactError("lane record requires an exact prepared input")
    if type(fit) is not TrajectoryDeterministicFit:
        raise TrajectoryArtifactError("lane record requires an exact deterministic fit")
    validate_prepared_vbd_trajectory(prepared, panel)
    if (
        fit.lane != prepared.lane
        or fit.prepared_input_hash != prepared.prepared_input_hash
        or fit.model_input_hash != prepared.model_input_hash
    ):
        raise TrajectoryArtifactError("lane fit does not bind its prepared input")
    return {
        "lane": prepared.lane,
        "panel_group_count": prepared.panel_group_count,
        "aggregate_k": prepared.aggregate_k,
        "series_evidence_eligible": prepared.series_evidence_eligible,
        "source_bindings": {
            "ordered_panel_manifest_root": prepared.ordered_panel_manifest_root,
            "cohort_partition_root": prepared.cohort_partition_root,
            "study_plan_root": prepared.study_plan_root,
            "seed_manifest_root": prepared.seed_manifest_root,
            "lane_observation_root": prepared.lane_observation_root,
            "joint_uncertainty_roots_hash": (
                prepared.joint_uncertainty_roots_hash
            ),
            "transform_root": prepared.transform_root,
            "model_manifest_root": prepared.model_manifest_root,
            "context_binding_hash": prepared.context_binding_hash,
        },
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "deterministic_fit": fit.to_dict(),
        "reference_fit_state": "NOT_RUN",
        "reference_fit_summary_hash": None,
    }


def emit_vbd_trajectory_smoke_artifact(
    panel: TrajectoryObservationPanel,
    prepared_inputs: tuple[TrajectoryPreparedInput, ...],
    fits: tuple[TrajectoryDeterministicFit, ...],
    *,
    generated_at: str | None = None,
    _token: object | None = None,
) -> dict:
    """Emit only from the in-process development-smoke path."""

    if _token is not _EMISSION_TOKEN:
        raise TrajectoryArtifactError("trajectory artifact emission is runner-owned")
    if type(panel) is not TrajectoryObservationPanel:
        raise TrajectoryArtifactError("trajectory artifact requires an exact panel")
    if type(prepared_inputs) is not tuple or type(fits) is not tuple:
        raise TrajectoryArtifactError("trajectory artifact inputs must be immutable")
    if any(type(prepared) is not TrajectoryPreparedInput for prepared in prepared_inputs):
        raise TrajectoryArtifactError("prepared inputs must use the exact supported type")
    if any(type(fit) is not TrajectoryDeterministicFit for fit in fits):
        raise TrajectoryArtifactError("fits must use the exact supported type")
    if tuple(prepared.lane for prepared in prepared_inputs) != VBD_TRAJECTORY_LANES:
        raise TrajectoryArtifactError("prepared lane manifest is incomplete or reordered")
    if tuple(fit.lane for fit in fits) != VBD_TRAJECTORY_LANES:
        raise TrajectoryArtifactError("fit lane manifest is incomplete or reordered")
    if panel.seed_namespace != "development_smoke_nonacceptance":
        raise TrajectoryArtifactError("only development smoke can emit this artifact")
    generated_at = _validated_generated_at(generated_at)
    lane_records = [
        _lane_record(prepared, fit, panel)
        for prepared, fit in zip(prepared_inputs, fits)
    ]
    input_manifest = _input_manifest(panel)
    artifact = {
        "schema_version": VBD_TRAJECTORY_ARTIFACT_SCHEMA_VERSION,
        "artifact_class": VBD_TRAJECTORY_ARTIFACT_CLASS,
        "generated_at": generated_at,
        "harness_version": HARNESS_VERSION,
        "python_requires": VBD_TRAJECTORY_PYTHON_REQUIRES,
        "lockfile_hash": lockfile_hash(),
        "generation_runtime": _generation_runtime(),
        "model_family": VBD_TRAJECTORY_MODEL_FAMILY,
        "model_component": VBD_TRAJECTORY_MODEL_COMPONENT,
        "model_slice": VBD_TRAJECTORY_MODEL_SLICE,
        "execution_mode": "development_smoke",
        "input_manifest": input_manifest,
        "lane_records": lane_records,
        "evidence_status": {
            "state": "HOLD",
            "failing_checks": list(VBD_TRAJECTORY_SMOKE_FAILURES),
            "deterministic_lane_fit_count": len(lane_records),
            "all_deterministic_lane_fits_present": True,
            "reference_engine_execution_state": "NOT_RUN",
            "concordance_bundle_count": 0,
            "canary_receipt_count": 0,
            "non_nuts_original_case_count": 0,
            "non_nuts_recomputation_case_count": 0,
            "floor_control_count": 0,
            "negative_control_count": 0,
            "exact_full_evidence_complete": False,
        },
        "governance_state": {
            "state": "HOLD",
            "failing_checks": list(VBD_TRAJECTORY_SMOKE_FAILURES),
            "summary_only": True,
            "synthetic_only": True,
            "aggregate_only": True,
            "noncausal": True,
            "independent_acceptance_required": True,
            "independent_acceptance_complete": False,
            "task_5_6_complete": False,
            "promotion_complete": False,
            "acceptance_execution_authorized": False,
            "downstream_outcome_integration_authorized": False,
        },
        "synthetic_data_boundary": {
            "real_data_present": False,
            "customer_data_present": False,
            "production_data_present": False,
            "live_data_source_present": False,
            "respondent_rows_present": False,
            "person_level_fields_present": False,
            "raw_event_rows_emitted": False,
            "input_arrays_emitted": False,
            "posterior_draws_emitted": False,
            "latent_paths_emitted": False,
            "posterior_support_emitted": False,
            "posterior_predictive_replicates_emitted": False,
        },
        "blocked_outputs": {
            field: False for field in VBD_TRAJECTORY_BLOCKED_OUTPUT_FIELDS
        },
        "hash_bindings": {
            "input_manifest_hash": sha256_json(input_manifest),
            "model_manifest_root": panel.model_manifest_root,
            "ordered_panel_manifest_root": panel.ordered_panel_manifest_root,
            "cohort_partition_root": panel.cohort_partition_root,
            "study_plan_root": panel.study_plan_root,
            "seed_manifest_root": panel.seed_manifest_root,
            "lane_records_hash": sha256_json(lane_records),
            "lane_observation_roots_hash": sha256_json(
                [
                    {
                        "lane": record["lane"],
                        "root": record["source_bindings"][
                            "lane_observation_root"
                        ],
                    }
                    for record in lane_records
                ]
            ),
            "prepared_input_hashes_hash": sha256_json(
                [record["prepared_input_hash"] for record in lane_records]
            ),
            "fit_summary_hashes_hash": sha256_json(
                [
                    record["deterministic_fit"]["fit_summary_hash"]
                    for record in lane_records
                ]
            ),
            "diagnostics_hashes_hash": sha256_json(
                [
                    sha256_json(
                        record["deterministic_fit"][
                            "integration_diagnostics"
                        ]
                    )
                    for record in lane_records
                ]
            ),
            "artifact_payload_hash": "",
            "artifact_self_hash": "",
            "hash_posture": VBD_TRAJECTORY_ARTIFACT_HASH_POSTURE,
        },
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "numeric_values_role": "internal_validation_evidence_not_customer_output",
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "roi_output_authorized": False,
        "finance_output_authorized": False,
        "causality_output_authorized": False,
        "productivity_output_authorized": False,
        "ai_impact_claim_authorized": False,
        "promotion_decision_ref": None,
    }
    artifact["hash_bindings"]["artifact_payload_hash"] = (
        vbd_trajectory_artifact_payload_hash(artifact)
    )
    artifact["hash_bindings"]["artifact_self_hash"] = (
        vbd_trajectory_artifact_self_hash(artifact)
    )
    _validate_json_safe(artifact)
    json.dumps(artifact, allow_nan=False)
    return artifact


def run_vbd_trajectory_smoke_artifact(
    *,
    generated_at: str | None = None,
    depth_context_ref: str = "depth-context:a",
) -> dict:
    """Run the disjoint development smoke and emit a permanent HOLD artifact."""

    case = generate_vbd_trajectory_smoke_case(
        depth_context_ref=depth_context_ref
    )
    prepared_inputs = tuple(
        prepare_vbd_trajectory_lane(case.panel, lane)
        for lane in VBD_TRAJECTORY_LANES
    )
    fits = tuple(
        fit_vbd_trajectory_state_space(prepared, case.panel)
        for prepared in prepared_inputs
    )
    return emit_vbd_trajectory_smoke_artifact(
        case.panel,
        prepared_inputs,
        fits,
        generated_at=generated_at,
        _token=_EMISSION_TOKEN,
    )
