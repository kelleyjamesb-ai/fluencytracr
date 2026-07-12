from dataclasses import fields, replace

import numpy as np
import pytest

from fluencytracr_inference.longitudinal_artifact import (
    emit_longitudinal_proof_artifact,
    run_longitudinal_proof,
)
from fluencytracr_inference.longitudinal_model import (
    compute_longitudinal_diagnostics,
    fit_longitudinal_model,
)
from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset
from fluencytracr_inference.longitudinal_types import LongitudinalStructureError


FIXED_GENERATED_AT = "2026-07-10T00:00:00+00:00"
NUMBER_MAX_SAFE_INTEGER = 9_007_199_254_740_991

ROW_VECTOR_FIELDS = (
    "organization_idx",
    "function_idx",
    "workflow_idx",
    "cohort_idx",
    "time_index",
    "post",
    "observed_outcome",
    "known_aggregate_se",
    "velocity_exposure",
    "breadth_exposure",
    "depth_exposure",
    "baseline_fluency_context",
)


def _run(dataset):
    return run_longitudinal_proof(
        dataset,
        seed=20260710,
        generated_at=FIXED_GENERATED_AT,
    )


def _reorder_rows(dataset, order):
    replacements = {
        field: np.asarray(getattr(dataset, field))[order]
        for field in ROW_VECTOR_FIELDS
    }
    replacements["control_matrix"] = dataset.control_matrix[order]
    replacements["window_refs"] = tuple(np.asarray(dataset.window_refs)[order])
    return replace(dataset, **replacements)


@pytest.mark.parametrize(
    "field",
    [
        "organization_idx",
        "function_idx",
        "workflow_idx",
        "cohort_idx",
        "time_index",
        "observed_outcome",
        "velocity_exposure",
        "breadth_exposure",
        "depth_exposure",
        "baseline_fluency_context",
    ],
)
def test_all_aligned_numeric_vectors_reject_nonfinite_values(field):
    dataset = generate_longitudinal_dataset(seed=20260710)
    values = np.asarray(getattr(dataset, field), dtype=float).copy()
    values[0] = np.nan

    with pytest.raises(LongitudinalStructureError, match="finite"):
        _run(replace(dataset, **{field: values}))


@pytest.mark.parametrize(
    ("field", "values"),
    [
        ("observed_outcome", np.asarray([1.0 + 1.0j])),
        ("post", np.asarray([False])),
    ],
)
def test_aligned_vectors_reject_nonreal_or_boolean_payloads(field, values):
    dataset = generate_longitudinal_dataset(seed=20260710)
    repeated = np.resize(values, len(dataset.observed_outcome))

    with pytest.raises(LongitudinalStructureError, match="finite numeric"):
        _run(replace(dataset, **{field: repeated}))


@pytest.mark.parametrize("value", [0.0, -0.1, np.nan, np.inf])
def test_known_aggregate_standard_error_must_be_positive_and_finite(value):
    dataset = generate_longitudinal_dataset(seed=20260710)
    known_se = dataset.known_aggregate_se.copy()
    known_se[0] = value

    with pytest.raises(LongitudinalStructureError, match="known_aggregate_se"):
        _run(replace(dataset, known_aggregate_se=known_se))


def test_post_flags_must_be_binary_and_ordered():
    dataset = generate_longitudinal_dataset(seed=20260710)
    post = dataset.post.copy()
    post[0] = 2
    with pytest.raises(LongitudinalStructureError, match="binary"):
        _run(replace(dataset, post=post))

    post = dataset.post.copy()
    first_cohort_post = np.flatnonzero(
        (dataset.cohort_idx == 0) & (dataset.post == 1)
    )[0]
    post[first_cohort_post] = 0
    post[first_cohort_post - 1] = 1
    with pytest.raises(LongitudinalStructureError, match="pre-period to post-period"):
        _run(replace(dataset, post=post))


def test_panel_rejects_unbalanced_and_physically_unordered_cohorts():
    dataset = generate_longitudinal_dataset(seed=20260710)
    cohort_idx = dataset.cohort_idx.copy()
    cohort_idx[-1] = 3
    with pytest.raises(LongitudinalStructureError, match="balanced"):
        _run(replace(dataset, cohort_idx=cohort_idx))

    order = np.arange(len(dataset.observed_outcome))
    first_cohort_rows = np.flatnonzero(dataset.cohort_idx == 0)
    order[first_cohort_rows] = first_cohort_rows[::-1]
    with pytest.raises(LongitudinalStructureError, match="strictly ordered"):
        _run(_reorder_rows(dataset, order))

    time_major_order = np.argsort(dataset.time_index, kind="stable")
    with pytest.raises(LongitudinalStructureError, match="cohort and time"):
        _run(_reorder_rows(dataset, time_major_order))


def test_panel_rejects_duplicate_cohort_windows_and_mixed_context_indexes():
    dataset = generate_longitudinal_dataset(seed=20260710)
    time_index = dataset.time_index.copy()
    time_index[1] = time_index[0]
    with pytest.raises(LongitudinalStructureError, match="strictly ordered"):
        _run(replace(dataset, time_index=time_index))

    function_idx = dataset.function_idx.copy()
    function_idx[1] = 1
    with pytest.raises(LongitudinalStructureError, match="constant within"):
        _run(replace(dataset, function_idx=function_idx))


def test_controls_require_finite_matrix_and_aligned_unique_metadata():
    dataset = generate_longitudinal_dataset(seed=20260710)
    controls = dataset.control_matrix.copy()
    controls[0, 0] = np.inf
    with pytest.raises(LongitudinalStructureError, match="finite"):
        _run(replace(dataset, control_matrix=controls))

    complex_controls = dataset.control_matrix.astype(complex)
    complex_controls[0, 0] += 1j
    with pytest.raises(LongitudinalStructureError, match="finite"):
        _run(replace(dataset, control_matrix=complex_controls))

    with pytest.raises(LongitudinalStructureError, match="unique"):
        _run(
            replace(
                dataset,
                control_names=("seasonality_index",) * 2,
                control_source_refs=(dataset.control_source_refs[0],) * 2,
            )
        )

    with pytest.raises(LongitudinalStructureError, match="align"):
        _run(replace(dataset, control_source_refs=dataset.control_source_refs[:1]))


def test_too_many_aligned_controls_emit_a_bridgeable_design_hold():
    dataset = generate_longitudinal_dataset(seed=20260710)
    extra_names = ("campaign_index", "policy_index", "volume_index")
    extra_columns = np.zeros((len(dataset.observed_outcome), len(extra_names)))
    expanded = replace(
        dataset,
        control_matrix=np.column_stack([dataset.control_matrix, extra_columns]),
        control_names=dataset.control_names + extra_names,
        control_source_refs=dataset.control_source_refs
        + tuple(f"synthetic-control://{name}" for name in extra_names),
        control_source_hashes=dataset.control_source_hashes
        + ("a" * 64, "b" * 64, "c" * 64),
    )

    artifact, _ = _run(expanded)
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "design_matrix_identifiability" in artifact["governance_state"][
        "failing_diagnostics"
    ]
    assert len(artifact["business_control_evidence"]["control_names"]) == 5


def test_unsafe_control_source_ref_rejects_before_artifact_emission():
    dataset = generate_longitudinal_dataset(seed=20260710)
    unsafe = replace(
        dataset,
        control_source_refs=(
            "synthetic-control://manager-performance",
            dataset.control_source_refs[1],
        ),
    )

    with pytest.raises(LongitudinalStructureError, match="unsafe person-level"):
        _run(unsafe)


def test_unsafe_control_rejects_before_excess_control_hold():
    dataset = generate_longitudinal_dataset(seed=20260710)
    extra_names = ("campaign_index", "policy_index", "manager_performance")
    expanded = replace(
        dataset,
        control_matrix=np.column_stack(
            [dataset.control_matrix, np.zeros((len(dataset.observed_outcome), 3))]
        ),
        control_names=dataset.control_names + extra_names,
        control_source_refs=dataset.control_source_refs
        + tuple(f"synthetic-control://{name}" for name in extra_names),
        control_source_hashes=dataset.control_source_hashes
        + ("a" * 64, "b" * 64, "c" * 64),
    )

    with pytest.raises(LongitudinalStructureError, match="unsafe person-level"):
        _run(expanded)


@pytest.mark.parametrize(
    "evaluation_refs",
    [(), ("unknown-window",), ("m00",), ("m15", "m14")],
)
def test_evaluation_refs_must_be_nonempty_ordered_observed_post_subset(evaluation_refs):
    dataset = replace(
        generate_longitudinal_dataset(seed=20260710),
        evaluation_window_refs=evaluation_refs,
    )
    with pytest.raises(LongitudinalStructureError, match="evaluation"):
        _run(dataset)


@pytest.mark.parametrize(
    "field",
    ["suppressed_window_refs", "stale_window_refs", "imputed_window_refs"],
)
def test_observation_status_refs_must_reference_observed_windows(field):
    dataset = replace(
        generate_longitudinal_dataset(seed=20260710),
        **{field: ("unknown-window",)},
    )
    with pytest.raises(LongitudinalStructureError, match="observed windows"):
        _run(dataset)


def test_snapshot_coverage_and_uncertainty_structure_are_strict():
    dataset = generate_longitudinal_dataset(seed=20260710)
    snapshot = dataset.ai_fluency_snapshots[0]

    incomplete = replace(snapshot, dimension_standard_errors={})
    with pytest.raises(LongitudinalStructureError, match="cover every"):
        _run(replace(dataset, ai_fluency_snapshots=(incomplete,)))

    inconsistent = replace(snapshot, overall_standard_error=None)
    with pytest.raises(LongitudinalStructureError, match="must be complete"):
        _run(replace(dataset, ai_fluency_snapshots=(inconsistent,)))

    nonfinite = replace(snapshot, overall_standard_error=np.inf)
    with pytest.raises(LongitudinalStructureError, match="finite positive"):
        _run(replace(dataset, ai_fluency_snapshots=(nonfinite,)))

    boolean_score = replace(snapshot, confidence_score=True)
    with pytest.raises(LongitudinalStructureError, match="finite numeric"):
        _run(replace(dataset, ai_fluency_snapshots=(boolean_score,)))

    with pytest.raises(LongitudinalStructureError, match="AIFluencySnapshotRef"):
        _run(replace(dataset, ai_fluency_snapshots=(object(),)))


@pytest.mark.parametrize("flag", [None, 0, "false"])
def test_synthetic_only_flags_reject_falsey_non_boolean_values(flag):
    dataset = replace(
        generate_longitudinal_dataset(seed=20260710),
        real_data_present=flag,
    )
    with pytest.raises(ValueError, match="synthetic aggregate inputs only"):
        _run(dataset)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"pre_window_count": 0},
        {"post_window_count": -1},
        {"cohort_count": False},
    ],
)
def test_generator_rejects_invalid_panel_counts_before_array_access(kwargs):
    with pytest.raises(LongitudinalStructureError, match="positive integer"):
        generate_longitudinal_dataset(**kwargs)


@pytest.mark.parametrize("scenario", ["clean_historical_pathwya", None, 7])
def test_generator_rejects_unknown_scenarios_instead_of_falling_open(scenario):
    with pytest.raises(LongitudinalStructureError, match="approved synthetic fixture"):
        generate_longitudinal_dataset(scenario=scenario)


@pytest.mark.parametrize(
    "field",
    [
        "ai_fluency_snapshots",
        "control_names",
        "control_source_refs",
        "control_source_hashes",
        "window_refs",
        "evaluation_window_refs",
    ],
)
def test_structural_container_metadata_must_be_immutable_tuples(field):
    dataset = replace(generate_longitudinal_dataset(seed=20260710), **{field: None})
    with pytest.raises(LongitudinalStructureError, match="immutable tuple"):
        _run(dataset)


def test_structural_source_commitments_and_plan_schedule_are_enforced():
    dataset = generate_longitudinal_dataset(seed=20260710)

    with pytest.raises(LongitudinalStructureError, match="generator_id"):
        _run(replace(dataset, generator_id="untrusted.generator"))

    unsafe_plan = replace(
        dataset.hypothesis_plan,
        source_system_ref="customer-source://account-health",
    )
    with pytest.raises(LongitudinalStructureError, match="synthetic-source"):
        _run(replace(dataset, hypothesis_plan=unsafe_plan))

    mismatched_schedule = replace(
        dataset.hypothesis_plan,
        observation_schedule=dataset.hypothesis_plan.observation_schedule[:-1],
    )
    with pytest.raises(LongitudinalStructureError, match="observation_schedule"):
        _run(replace(dataset, hypothesis_plan=mismatched_schedule))

    missing_signature = replace(dataset.hypothesis_plan, expected_vbd_signature=None)
    with pytest.raises(LongitudinalStructureError, match="expected_vbd_signature"):
        _run(replace(dataset, hypothesis_plan=missing_signature))

    wrong_role = replace(
        dataset.hypothesis_plan,
        expected_vbd_signature={
            **dataset.hypothesis_plan.expected_vbd_signature,
            "breadth": "CONTEXT",
        },
    )
    with pytest.raises(LongitudinalStructureError, match="not approved for V2 smoke"):
        _run(replace(dataset, hypothesis_plan=wrong_role))


def test_unsafe_aggregate_metadata_rejects_before_artifact_emission():
    dataset = generate_longitudinal_dataset(seed=20260710)
    unsafe_plan = replace(
        dataset.hypothesis_plan,
        cohort_scope="manager_level_l5_tenure_0_1",
    )
    with pytest.raises(LongitudinalStructureError, match="unsafe person-level"):
        _run(replace(dataset, hypothesis_plan=unsafe_plan))

    snapshot = replace(
        dataset.ai_fluency_snapshots[0],
        source_ref="synthetic-ai-fluency://manager-level-tenure",
    )
    with pytest.raises(LongitudinalStructureError, match="unsafe person-level"):
        _run(replace(dataset, ai_fluency_snapshots=(snapshot,)))


def test_evaluation_windows_are_bound_to_the_approved_lag_offset():
    dataset = generate_longitudinal_dataset(seed=20260710)
    bypass = replace(dataset, evaluation_window_refs=("m12", "m13", "m14"))

    with pytest.raises(LongitudinalStructureError, match="approved outcome lag"):
        _run(bypass)


@pytest.mark.parametrize("value", [None, "false", 0, 1])
def test_target_prior_flag_requires_a_strict_boolean(value):
    dataset = generate_longitudinal_dataset(seed=20260710)
    plan = replace(dataset.hypothesis_plan, target_value_used_as_prior=value)
    with pytest.raises(LongitudinalStructureError, match="must be boolean"):
        _run(replace(dataset, hypothesis_plan=plan))


@pytest.mark.parametrize("value", [object(), 123, "finance://path"])
def test_finance_pathway_metadata_is_absent_from_smoke_inputs(value):
    dataset = generate_longitudinal_dataset(seed=20260710)
    plan = replace(dataset.hypothesis_plan, finance_pathway_ref=value)
    with pytest.raises(LongitudinalStructureError, match="must remain absent"):
        _run(replace(dataset, hypothesis_plan=plan))


def test_direct_emitter_cannot_create_a_normal_non_hold_path():
    dataset = generate_longitudinal_dataset(seed=20260710)
    with pytest.raises(ValueError, match="owned by run_longitudinal_proof"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=None,
            diagnostics=None,
            generated_at=FIXED_GENERATED_AT,
        )

    fit = fit_longitudinal_model(dataset, seed=20260710)
    diagnostics = compute_longitudinal_diagnostics(fit)
    with pytest.raises(ValueError, match="owned by run_longitudinal_proof"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=fit,
            diagnostics=diagnostics,
            generated_at=FIXED_GENERATED_AT,
        )

    with pytest.raises(ValueError, match="owned by run_longitudinal_proof"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=fit,
            diagnostics=diagnostics,
            generated_at=FIXED_GENERATED_AT,
            _runner_token=object(),
        )

    with pytest.raises(ValueError, match="owned by run_longitudinal_proof"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=None,
            diagnostics=None,
            failing_diagnostics=("insufficient_history",),
            generated_at=FIXED_GENERATED_AT,
        )


def test_emitter_rejects_forged_result_types_and_fit_shapes():
    dataset = generate_longitudinal_dataset(seed=20260710)
    with pytest.raises(ValueError, match="LongitudinalFitResult"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=object(),
            diagnostics=object(),
            generated_at=FIXED_GENERATED_AT,
        )

    fit = fit_longitudinal_model(dataset, seed=20260710)
    diagnostics = compute_longitudinal_diagnostics(fit)
    malformed_fit = replace(fit, posterior_mean=fit.posterior_mean[:-1])
    with pytest.raises(ValueError, match="posterior mean has invalid shape"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=malformed_fit,
            diagnostics=diagnostics,
            generated_at=FIXED_GENERATED_AT,
        )


def test_structural_validator_runs_on_direct_fit_and_emitter_boundaries():
    dataset = generate_longitudinal_dataset(seed=20260710)
    malformed = replace(
        dataset,
        observed_outcome=dataset.observed_outcome[:-1],
    )

    with pytest.raises(LongitudinalStructureError, match="53 rows"):
        fit_longitudinal_model(malformed, seed=20260710)
    with pytest.raises(LongitudinalStructureError, match="53 rows"):
        emit_longitudinal_proof_artifact(
            malformed,
            fit=None,
            diagnostics=None,
            failing_diagnostics=("insufficient_history",),
            generated_at=FIXED_GENERATED_AT,
        )


def test_emitter_recomputes_diagnostics_instead_of_trusting_fit_hash_only():
    dataset = generate_longitudinal_dataset(seed=20260710)
    fit = fit_longitudinal_model(dataset, seed=20260710)
    diagnostics = compute_longitudinal_diagnostics(fit)
    forged = replace(
        diagnostics,
        lag_sensitivity_check={**diagnostics.lag_sensitivity_check, "pass": False},
    )

    with pytest.raises(ValueError, match="diagnostics do not match"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=fit,
            diagnostics=forged,
            generated_at=FIXED_GENERATED_AT,
        )


def test_fit_hash_is_deterministic_and_depth_stays_outside_the_design():
    dataset = generate_longitudinal_dataset(seed=20260710)
    first_fit = fit_longitudinal_model(dataset, seed=20260710)
    second_fit = fit_longitudinal_model(dataset, seed=20260710)
    depth_changed = replace(dataset, depth_exposure=dataset.depth_exposure + 10.0)
    depth_changed_fit = fit_longitudinal_model(depth_changed, seed=20260710)

    assert first_fit.fit_summary_hash() == second_fit.fit_summary_hash()
    assert first_fit.fit_summary_hash() != depth_changed_fit.fit_summary_hash()
    assert not any("depth" in name for name in first_fit.parameter_names)
    np.testing.assert_allclose(first_fit.posterior_mean, depth_changed_fit.posterior_mean)


def test_unrun_advanced_diagnostics_never_claim_pass():
    artifact, _ = _run(generate_longitudinal_dataset(seed=20260710))
    for name in (
        "placebo_intervention_date_check",
        "counterfactual_stability_check",
        "prior_sensitivity_check",
        "posterior_predictive_check",
        "sampler_diagnostics",
    ):
        check = artifact["diagnostics"][name]
        assert check["status"] == "NOT_RUN"
        assert "pass" not in check

    residual_check = artifact["diagnostics"]["residual_autocorrelation_check"]
    assert residual_check["diagnostic_kind"] == (
        "post_hoc_ar1_residual_autocorrelation_only"
    )
    assert residual_check["modeled_in_likelihood"] is False


@pytest.mark.parametrize(
    ("field_name", "value"),
    [
        ("scenario", "clean_historical_pathway"),
        ("ground_truth", {"known_effect": True}),
    ],
)
def test_dataset_contract_does_not_admit_oracle_sidecars(field_name, value):
    dataset = generate_longitudinal_dataset(seed=20260710)

    assert field_name not in {field.name for field in fields(dataset)}
    assert not hasattr(dataset, field_name)
    with pytest.raises(TypeError):
        replace(dataset, **{field_name: value})


def test_unapproved_control_identity_source_pair_rejects_before_emission():
    dataset = generate_longitudinal_dataset(seed=20260710)
    unapproved = replace(
        dataset,
        control_names=(dataset.control_names[0], "ssn_123_45_6789_index"),
        control_source_refs=(
            dataset.control_source_refs[0],
            "synthetic-control://ssn_123_45_6789_index",
        ),
    )

    with pytest.raises(LongitudinalStructureError):
        _run(unapproved)


@pytest.mark.parametrize(
    "generated_at",
    [
        "not-a-timestamp",
        "James Kelley +1 212-555-0199",
        "2026-07-10T00:00:00",
        "2026-02-30T00:00:00Z",
        20260710,
    ],
)
def test_invalid_generated_at_rejects_before_artifact_emission(generated_at):
    dataset = generate_longitudinal_dataset(seed=20260710)

    with pytest.raises(ValueError):
        run_longitudinal_proof(
            dataset,
            seed=20260710,
            generated_at=generated_at,
        )


@pytest.mark.parametrize(
    "evidence_design",
    ["UNKNOWN_DESIGN", "TWO_GROUP_PRE_POST_COMPARISON"],
)
def test_non_longitudinal_designs_cannot_emit_an_artifact(evidence_design):
    dataset = generate_longitudinal_dataset(seed=20260710)
    plan = replace(dataset.hypothesis_plan, evidence_design=evidence_design)

    with pytest.raises(LongitudinalStructureError):
        _run(replace(dataset, hypothesis_plan=plan))


@pytest.mark.parametrize(
    ("evidence_design", "route_decision", "diagnostic"),
    [
        (
            "CONTROLLED_TEST",
            "HOLD_UNSUPPORTED_CONTROLLED_TEST_MODEL",
            "unsupported_evidence_design",
        ),
        (
            "MATCHED_COMPARISON",
            "HOLD_UNSUPPORTED_CONTROLLED_TEST_MODEL",
            "unsupported_evidence_design",
        ),
        (
            "STAGGERED_ROLLOUT",
            "HOLD_UNSUPPORTED_STAGGERED_EVENT_STUDY",
            "unsupported_staggered_event_study",
        ),
        (
            "BASELINE_ONLY",
            "HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE",
            "baseline_only_no_contribution_confidence",
        ),
    ],
)
def test_non_routed_designs_remain_fail_closed_holds(
    evidence_design,
    route_decision,
    diagnostic,
):
    dataset = generate_longitudinal_dataset(seed=20260710)
    plan = replace(dataset.hypothesis_plan, evidence_design=evidence_design)

    artifact, report = _run(replace(dataset, hypothesis_plan=plan))

    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["design_route"]["decision"] == route_decision
    assert diagnostic in artifact["governance_state"]["failing_diagnostics"]
    assert report["fit_available"] is False
    assert artifact["posterior_estimand_summary"] is None
    assert all(value is False for value in artifact["blocked_outputs"].values())


@pytest.mark.parametrize("seed", [-1, NUMBER_MAX_SAFE_INTEGER + 1])
def test_generator_and_dataset_seeds_reject_outside_javascript_safe_range(seed):
    with pytest.raises(LongitudinalStructureError):
        generate_longitudinal_dataset(seed=seed)

    dataset = generate_longitudinal_dataset(seed=20260710)
    with pytest.raises(LongitudinalStructureError):
        _run(replace(dataset, seed=seed))


@pytest.mark.parametrize("seed", [-1, NUMBER_MAX_SAFE_INTEGER + 1])
def test_fit_and_run_seeds_reject_outside_javascript_safe_range(seed):
    dataset = generate_longitudinal_dataset(seed=20260710)

    with pytest.raises(LongitudinalStructureError):
        fit_longitudinal_model(dataset, seed=seed)
    with pytest.raises(LongitudinalStructureError):
        run_longitudinal_proof(
            dataset,
            seed=seed,
            generated_at=FIXED_GENERATED_AT,
        )


def test_replaced_fit_seed_is_revalidated_before_diagnostics_or_emission():
    dataset = generate_longitudinal_dataset(seed=20260710)
    fit = fit_longitudinal_model(dataset, seed=20260710)
    forged_fit = replace(fit, seed=-1)

    with pytest.raises(LongitudinalStructureError, match="JavaScript-safe"):
        compute_longitudinal_diagnostics(forged_fit)

    diagnostics = compute_longitudinal_diagnostics(fit)
    with pytest.raises(LongitudinalStructureError, match="JavaScript-safe"):
        emit_longitudinal_proof_artifact(
            dataset,
            fit=forged_fit,
            diagnostics=diagnostics,
            generated_at=FIXED_GENERATED_AT,
        )
