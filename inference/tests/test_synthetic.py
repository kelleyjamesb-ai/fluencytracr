"""Synthetic generator tests: determinism, structure, negative-control hooks."""

import numpy as np

from fluencytracr_inference.synthetic import (
    WindowEvidenceDeclaration,
    clean_window_evidence,
    generate_did_dataset,
    generate_mismatched_comparison,
    generate_missing_windows,
    generate_no_comparison_cohort,
    generate_prior_dominated_weak,
    generate_suppressed_windows,
    generate_violated_pre_trend,
    with_scenario,
)


def test_same_seed_same_dataset_hash():
    a = generate_did_dataset(seed=7, k=12, injected_effect_sd=0.2)
    b = generate_did_dataset(seed=7, k=12, injected_effect_sd=0.2)
    assert a.synthetic_input_hash() == b.synthetic_input_hash()
    assert np.array_equal(a.y, b.y)


def test_different_seed_different_dataset_hash():
    a = generate_did_dataset(seed=7, k=12, injected_effect_sd=0.2)
    b = generate_did_dataset(seed=8, k=12, injected_effect_sd=0.2)
    assert a.synthetic_input_hash() != b.synthetic_input_hash()


def test_synthetic_input_hash_binds_governance_provenance_fields():
    base = generate_did_dataset(seed=7, k=12, injected_effect_sd=0.2)
    base_hash = base.synthetic_input_hash()

    changed_rubric = dict(base.comparison_rubric)
    changed_rubric["same_metric_direction"] = False
    variants = [
        with_scenario(base, declared_minimum_cohort_floor=10),
        with_scenario(
            base,
            window_evidence=WindowEvidenceDeclaration(
                required_milestone_days=(0, 30),
                observed_milestone_days=(30,),
            ),
        ),
        with_scenario(base, comparison_cohort_present=False),
        with_scenario(base, comparison_rubric=changed_rubric),
        with_scenario(base, metric_id="synthetic_selected_metric_v2"),
        with_scenario(base, cohort_family_id="synthetic_cohort_family_v2"),
        with_scenario(base, real_data_present=True),
    ]
    assert all(variant.synthetic_input_hash() != base_hash for variant in variants)


def test_clean_dataset_structure():
    ds = generate_did_dataset(seed=1, k=16, injected_effect_sd=0.5)
    # Two arms of k cohorts, each with 2 pre + 1 post windows.
    assert len(ds.cohort_labels) == 32
    assert ds.y.shape == (32 * 3,)
    assert set(np.unique(ds.treated)) == {0, 1}
    assert set(np.unique(ds.post)) == {0, 1}
    # Ground truth carries the injected estimand.
    assert ds.ground_truth["delta"] == 0.5
    # Aggregate SE is cohort-size weighted.
    assert np.allclose(ds.se, ds.aggregate_unit_sd / np.sqrt(ds.members))
    # Clean rubric passes everything; clean evidence holds nothing.
    assert all(ds.comparison_rubric.values())
    assert ds.comparison_cohort_present
    assert not ds.window_evidence.holds


def test_injected_effect_visible_in_did_of_means():
    ds = generate_did_dataset(seed=3, k=16, injected_effect_sd=0.5)
    y, post, treated = ds.y, ds.post, ds.treated
    did = (
        y[(treated == 1) & (post == 1)].mean() - y[(treated == 1) & (post == 0)].mean()
    ) - (y[(treated == 0) & (post == 1)].mean() - y[(treated == 0) & (post == 0)].mean())
    assert abs(did - 0.5) < 0.3


def test_window_evidence_section_derivations():
    evidence = WindowEvidenceDeclaration(
        required_milestone_days=(0, 30),
        observed_milestone_days=(0,),
    )
    section = evidence.to_artifact_section()
    assert section["missing_milestone_days"] == [30]
    assert section["missing_window_refs"] == ["mcw-d030"]
    assert section["all_required_windows_observed"] is False
    assert section["all_windows_unsuppressed_and_fresh"] is True
    assert section["imputation_used"] is False
    assert evidence.holds

    clean = clean_window_evidence(30).to_artifact_section()
    assert clean["all_required_windows_observed"] is True
    assert clean["required_window_refs"] == ["mcw-d030"]


def test_negative_control_hooks():
    pre_trend = generate_violated_pre_trend(seed=2)
    assert pre_trend.scenario == "negative_control_violated_pre_trend"
    assert not pre_trend.window_evidence.holds  # data violation, not windows

    mismatched = generate_mismatched_comparison(seed=2)
    assert mismatched.comparison_rubric["same_expectation_path_and_context"] is False
    assert mismatched.comparison_rubric["similar_pre_period_level_trend"] is False

    absent = generate_no_comparison_cohort(seed=2)
    assert absent.comparison_cohort_present is False
    assert not any(absent.comparison_rubric.values())
    assert set(np.unique(absent.treated)) == {1}

    missing = generate_missing_windows(seed=2)
    assert missing.window_evidence.holds
    assert missing.window_evidence.missing_milestone_days == (30,)

    suppressed = generate_suppressed_windows(seed=2)
    assert suppressed.window_evidence.holds
    assert suppressed.comparison_rubric["no_suppressed_or_stale_windows"] is False

    weak = generate_prior_dominated_weak(seed=2)
    assert weak.k == 6
    assert weak.scenario == "negative_control_prior_dominated_weak_data"


def test_real_data_pins():
    ds = generate_did_dataset(seed=5, k=8)
    assert ds.real_data_present is False
