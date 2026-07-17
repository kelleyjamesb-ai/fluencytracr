from copy import deepcopy
from dataclasses import replace
import json

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_artifact import (
    VBD_TRAJECTORY_ARTIFACT_CLASS,
    VBD_TRAJECTORY_ARTIFACT_SCHEMA_VERSION,
    VBD_TRAJECTORY_SMOKE_FAILURES,
    TrajectoryArtifactError,
    _depth_context,
    _input_manifest,
    _lane_record,
    _validated_generated_at,
    emit_vbd_trajectory_smoke_artifact,
    run_vbd_trajectory_smoke_artifact,
    vbd_trajectory_artifact_payload_hash,
    vbd_trajectory_artifact_self_hash,
)
from fluencytracr_inference.vbd_trajectory_preparation import (
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    _rebind_bundle_hashes,
    generate_vbd_trajectory_smoke_case,
)
from fluencytracr_inference.vbd_trajectory_types import (
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_MISSING_DEPTH_CONTEXT_ROOT,
    canonical_unavailable_depth_context_dict,
    validate_trajectory_panel,
)


@pytest.fixture(scope="module")
def artifact_a():
    return run_vbd_trajectory_smoke_artifact(
        generated_at="2026-07-15T00:00:00+00:00",
        depth_context_ref="depth-context:a",
    )


@pytest.fixture(scope="module")
def artifact_b():
    return run_vbd_trajectory_smoke_artifact(
        generated_at="2026-07-15T00:00:00+00:00",
        depth_context_ref="depth-context:b",
    )


def test_smoke_artifact_is_three_lane_summary_only_hold(artifact_a):
    assert artifact_a["schema_version"] == VBD_TRAJECTORY_ARTIFACT_SCHEMA_VERSION
    assert artifact_a["artifact_class"] == VBD_TRAJECTORY_ARTIFACT_CLASS
    assert artifact_a["execution_mode"] == "development_smoke"
    assert tuple(record["lane"] for record in artifact_a["lane_records"]) == (
        VBD_TRAJECTORY_LANES
    )
    assert artifact_a["evidence_status"]["state"] == "HOLD"
    assert tuple(artifact_a["evidence_status"]["failing_checks"]) == (
        VBD_TRAJECTORY_SMOKE_FAILURES
    )
    assert artifact_a["evidence_status"]["deterministic_lane_fit_count"] == 3
    assert artifact_a["evidence_status"]["reference_engine_execution_state"] == (
        "NOT_RUN"
    )
    assert artifact_a["evidence_status"]["exact_full_evidence_complete"] is False
    assert artifact_a["governance_state"]["summary_only"] is True
    assert artifact_a["governance_state"]["independent_acceptance_complete"] is False
    assert artifact_a["governance_state"]["task_5_6_complete"] is False
    assert artifact_a["governance_state"]["promotion_complete"] is False
    assert all(value is False for value in artifact_a["blocked_outputs"].values())


def test_artifact_hashes_bind_manifest_lane_fits_and_bytes(artifact_a):
    bindings = artifact_a["hash_bindings"]
    records = artifact_a["lane_records"]

    assert bindings["input_manifest_hash"] == sha256_json(
        artifact_a["input_manifest"]
    )
    assert bindings["model_manifest_root"] == sha256_json(
        artifact_a["input_manifest"]["model_manifest"]
    )
    assert bindings["lane_records_hash"] == sha256_json(records)
    assert bindings["lane_observation_roots_hash"] == sha256_json(
        [
            {
                "lane": record["lane"],
                "root": record["source_bindings"]["lane_observation_root"],
            }
            for record in records
        ]
    )
    assert bindings["prepared_input_hashes_hash"] == sha256_json(
        [record["prepared_input_hash"] for record in records]
    )
    assert bindings["fit_summary_hashes_hash"] == sha256_json(
        [record["deterministic_fit"]["fit_summary_hash"] for record in records]
    )
    assert bindings["diagnostics_hashes_hash"] == sha256_json(
        [
            sha256_json(record["deterministic_fit"]["integration_diagnostics"])
            for record in records
        ]
    )
    assert bindings["artifact_payload_hash"] == vbd_trajectory_artifact_payload_hash(
        artifact_a
    )
    assert bindings["artifact_self_hash"] == vbd_trajectory_artifact_self_hash(
        artifact_a
    )


def test_each_lane_fit_hash_is_summary_only_and_source_bound(artifact_a):
    prepared_hashes = set()
    observation_roots = set()
    for record in artifact_a["lane_records"]:
        fit = record["deterministic_fit"]
        fit_body = {key: value for key, value in fit.items() if key != "fit_summary_hash"}

        assert fit["fit_summary_hash"] == sha256_json(fit_body)
        assert fit["lane"] == record["lane"]
        assert fit["prepared_input_hash"] == record["prepared_input_hash"]
        assert fit["model_input_hash"] == record["model_input_hash"]
        assert fit["movement_summary"]["quantity_name"] == "trajectory_movement"
        assert fit["integration_diagnostics"]["status"] == "PASS"
        assert fit["integration_diagnostics"]["generated_point_count"] == 8192
        assert (
            fit["integration_diagnostics"]["retained_weight_count"]
            <= fit["integration_diagnostics"]["finite_log_weight_count"]
            <= 8192
        )
        assert fit["latent_paths_emitted"] is False
        assert fit["posterior_support_emitted"] is False
        assert record["reference_fit_state"] == "NOT_RUN"
        assert record["reference_fit_summary_hash"] is None
        prepared_hashes.add(record["prepared_input_hash"])
        observation_roots.add(record["source_bindings"]["lane_observation_root"])
    assert len(prepared_hashes) == 3
    assert len(observation_roots) == 3


def test_artifact_emits_no_draw_path_support_truth_or_input_array_payload(artifact_a):
    payload = json.loads(json.dumps(artifact_a))
    forbidden_keys = {
        "truth",
        "terminal_truth",
        "transformed_latent_paths",
        "working_group_effects",
        "working_ar1_states",
        "posterior_draws",
        "latent_path_values",
        "posterior_support_values",
        "posterior_support_weights",
        "retained_sobol_ordinals",
        "excluded_sobol_ordinals",
        "log_weights",
        "normalized_weights",
        "outer_weights",
        "conditional_movement_means",
        "conditional_movement_variances",
        "posterior_predictive_replicates",
        "y",
        "known_se",
        "x",
        "augmented_design",
        "respondent_id",
        "user_id",
    }

    def visit(value):
        if isinstance(value, dict):
            assert forbidden_keys.isdisjoint(value)
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(payload)
    assert payload["synthetic_data_boundary"] == {
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
    }


def test_composites_and_numeric_depth_are_explicitly_absent(artifact_a):
    manifest = artifact_a["input_manifest"]
    depth = manifest["depth_context"]

    assert manifest["active_lanes"] == list(VBD_TRAJECTORY_LANES)
    assert manifest["canonical_velocity_estimated"] is False
    assert manifest["composite_input_present"] is False
    assert manifest["prohibited_composite_inputs"] == [
        "velocity_index",
        "frequency_index",
        "engagement_index",
        "breadth_index",
        "overall_vbd_score",
        "integration_score",
        "vbd_quadrant",
    ]
    assert depth["numeric_value_present"] is False
    assert depth["used_in_likelihood"] is False
    assert depth["used_in_estimand"] is False
    assert depth["used_in_eligibility"] is False


def test_nonnumeric_depth_context_cannot_change_numerical_fit(artifact_a, artifact_b):
    assert artifact_a["input_manifest"]["depth_context"]["context_root"] != (
        artifact_b["input_manifest"]["depth_context"]["context_root"]
    )
    for left, right in zip(artifact_a["lane_records"], artifact_b["lane_records"]):
        assert left["prepared_input_hash"] == right["prepared_input_hash"]
        assert left["model_input_hash"] == right["model_input_hash"]
        assert left["deterministic_fit"] == right["deterministic_fit"]


def test_direct_or_malformed_artifact_emission_fails_closed():
    with pytest.raises(TrajectoryArtifactError, match="runner-owned"):
        emit_vbd_trajectory_smoke_artifact(None, (), ())
    with pytest.raises(TrajectoryArtifactError, match="RFC3339"):
        _validated_generated_at("2026-07-15")


@pytest.mark.parametrize(
    "timestamp",
    [
        "2026-07-15 00:00:00+00:00",
        "2026-07-15T00:00+00:00",
        "2026-07-15T00:00:00",
        "2026-07-15T00:00:00+99:99",
        "2026-02-30T00:00:00+00:00",
        "2026-07-15T24:00:00+00:00",
    ],
)
def test_generated_at_uses_strict_rfc3339_grammar(timestamp):
    with pytest.raises(TrajectoryArtifactError, match="RFC3339"):
        _validated_generated_at(timestamp)


def test_lane_record_requires_exact_prepared_and_fit_types():
    case = generate_vbd_trajectory_smoke_case()
    prepared = prepare_vbd_trajectory_lane(case.panel, "frequency")

    with pytest.raises(TrajectoryArtifactError, match="exact prepared input"):
        _lane_record(object(), object(), case.panel)
    with pytest.raises(TrajectoryArtifactError, match="exact deterministic fit"):
        _lane_record(prepared, object(), case.panel)


def test_missing_depth_emits_canonical_unavailable_context():
    case = generate_vbd_trajectory_smoke_case()
    bundles = tuple(
        _rebind_bundle_hashes(replace(bundle, depth_context=None))
        for bundle in case.panel.bundles
    )
    panel = replace(
        case.panel,
        bundles=bundles,
        depth_context_root=VBD_TRAJECTORY_MISSING_DEPTH_CONTEXT_ROOT,
    )
    validate_trajectory_panel(panel)

    context = _depth_context(panel)
    canonical = canonical_unavailable_depth_context_dict()
    assert context == {
        "status": "unavailable",
        "context_ref": canonical["context_ref"],
        "context_root": canonical["context_root"],
        "definition_ref": canonical["definition_ref"],
        "source_ref": canonical["source_ref"],
        "source_hash": canonical["source_hash"],
        "aggregate_review_state": canonical["aggregate_review_state"],
        "suppression_posture": canonical["suppression_posture"],
        "caveat_refs": canonical["caveat_refs"],
        "numeric_value_present": False,
        "used_in_likelihood": False,
        "used_in_estimand": False,
        "used_in_eligibility": False,
    }
    assert _input_manifest(panel)["depth_context"] == context


@pytest.mark.parametrize("nonfinite", [float("nan"), float("inf"), float("-inf")])
def test_nonfinite_artifact_values_reject_before_hashing(artifact_a, nonfinite):
    artifact = deepcopy(artifact_a)
    artifact["lane_records"][0]["deterministic_fit"]["movement_summary"][
        "posterior_mean"
    ] = nonfinite

    with pytest.raises(TrajectoryArtifactError, match="nonfinite JSON"):
        vbd_trajectory_artifact_payload_hash(artifact)
    with pytest.raises(ValueError):
        json.dumps(artifact, allow_nan=False)


def test_emitted_artifact_is_strict_json(artifact_a):
    json.dumps(artifact_a, allow_nan=False)
