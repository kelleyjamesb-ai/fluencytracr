from dataclasses import replace

import numpy as np
import pytest

from fluencytracr_inference.ai_fluency_measurement_diagnostics import (
    MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY,
    MINIMUM_ORDINAL_OMEGA,
    compute_measurement_diagnostics,
)
from fluencytracr_inference.ai_fluency_measurement_evidence import (
    MeasurementEvidenceError,
    validate_measurement_package,
)
from fluencytracr_inference.ai_fluency_measurement_synthetic import (
    generate_measurement_synthetic_case,
)
from fluencytracr_inference.ai_fluency_ordinal_measurement import (
    ORDINAL_MEASUREMENT_ENGINE,
    ORDINAL_MEASUREMENT_MODEL_KIND,
    LOADING_PRIOR_MEAN,
    LOADING_PRIOR_SD,
    OrdinalMeasurementFitError,
    _item_threshold_fit,
    _item_thresholds,
    _loading_posterior_hessian,
    fit_ordinal_measurement_model,
)
from fluencytracr_inference.hashing import sha256_json


@pytest.fixture(scope="module")
def invariant_result():
    case = generate_measurement_synthetic_case(seed=2026071410, scenario="invariant")
    fit = fit_ordinal_measurement_model(case.package)
    diagnostics = compute_measurement_diagnostics(fit, case.truth)
    return case, fit, diagnostics


@pytest.fixture(scope="module")
def loading_drift_result():
    case = generate_measurement_synthetic_case(seed=2026071410, scenario="loading_drift")
    fit = fit_ordinal_measurement_model(case.package)
    diagnostics = compute_measurement_diagnostics(fit, case.truth)
    return case, fit, diagnostics


@pytest.fixture(scope="module")
def threshold_drift_result():
    case = generate_measurement_synthetic_case(seed=2026071410, scenario="threshold_drift")
    fit = fit_ordinal_measurement_model(case.package)
    diagnostics = compute_measurement_diagnostics(fit, case.truth)
    return case, fit, diagnostics


@pytest.fixture(scope="module")
def invariant_latent_shift_result():
    case = generate_measurement_synthetic_case(
        seed=2026071410, scenario="invariant_latent_shift"
    )
    fit = fit_ordinal_measurement_model(case.package)
    diagnostics = compute_measurement_diagnostics(fit, case.truth)
    return case, fit, diagnostics


def test_invariant_same_form_recovers_measurement_structure(invariant_result):
    case, fit, diagnostics = invariant_result

    assert fit.engine_kind == ORDINAL_MEASUREMENT_ENGINE
    assert fit.model_kind == ORDINAL_MEASUREMENT_MODEL_KIND
    assert fit.package_hash == case.package.package_hash()
    assert len(fit.baseline.thresholds) == 24
    assert len(fit.baseline.threshold_covariances) == 24
    assert len(fit.followup.thresholds) == 24
    assert len(fit.baseline.pair_correlations) == 276
    assert len(fit.baseline.constructs) == 8
    assert len(fit.baseline.second_order_core_loadings) == 5
    assert diagnostics.failing_diagnostics == ()
    checks = {check.diagnostic: check for check in diagnostics.checks}
    assert checks["ordinal_reliability"].value >= MINIMUM_ORDINAL_OMEGA
    assert checks["loading_invariance"].value >= MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY
    assert checks["threshold_invariance"].value >= MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY


def test_attitude_intent_and_impact_remain_outside_second_order_fluency(
    invariant_result,
):
    _, fit, _ = invariant_result
    correlations = {
        value.parameter_name: value.posterior_mode
        for value in fit.baseline.pair_correlations
    }

    assert abs(correlations["polychoric:ai-fluency-q01:ai-fluency-q16"]) < 0.15
    assert tuple(
        value.parameter_name for value in fit.baseline.second_order_core_loadings
    ) == (
        "second_order_loading:confidence",
        "second_order_loading:usage_quality",
        "second_order_loading:behavior_change",
        "second_order_loading:leadership_reinforcement",
        "second_order_loading:capability_growth",
    )


def test_loading_drift_is_detected_without_threshold_false_positive(loading_drift_result):
    _, _, diagnostics = loading_drift_result

    assert "loading_invariance" in diagnostics.failing_diagnostics
    assert "threshold_invariance" not in diagnostics.failing_diagnostics
    assert "loading_recovery" not in diagnostics.failing_diagnostics


def test_threshold_drift_is_detected_without_loading_false_positive(threshold_drift_result):
    _, _, diagnostics = threshold_drift_result

    assert "threshold_invariance" in diagnostics.failing_diagnostics
    assert "loading_invariance" not in diagnostics.failing_diagnostics
    assert "threshold_recovery" not in diagnostics.failing_diagnostics


def test_invariant_latent_mean_shift_is_not_misclassified_as_threshold_drift(
    invariant_latent_shift_result,
):
    case, _, diagnostics = invariant_latent_shift_result
    estimated = dict(diagnostics.estimated_followup_construct_means)

    assert diagnostics.failing_diagnostics == ()
    assert "threshold_invariance" not in diagnostics.failing_diagnostics
    for construct_id, truth in zip(
        (
            "confidence",
            "usage_quality",
            "behavior_change",
            "leadership_reinforcement",
            "capability_growth",
            "ai_attitude",
            "behavioral_intent",
            "perceived_ai_impact",
        ),
        case.truth.followup_construct_means,
    ):
        assert estimated[construct_id] == pytest.approx(truth, abs=0.16)


def test_zero_count_categories_still_produce_finite_ordered_beta_thresholds():
    thresholds = _item_thresholds((40, 0, 0, 0, 0), "ai-fluency-q01")
    values = [threshold.posterior_mode for threshold in thresholds]

    assert len(values) == 4
    assert values == sorted(values)
    assert all(threshold.posterior_sd > 0.0 for threshold in thresholds)


def test_threshold_fit_preserves_cumulative_dirichlet_covariance():
    thresholds, covariance = _item_threshold_fit(
        (24, 36, 52, 47, 21), "ai-fluency-q01"
    )

    assert covariance.shape == (4, 4)
    assert np.all(np.linalg.eigvalsh(covariance) > 0.0)
    assert covariance[0, 1] > 0.0
    assert covariance[1, 2] > 0.0
    assert np.diag(covariance) == pytest.approx(
        [threshold.posterior_sd**2 for threshold in thresholds]
    )


def test_loading_laplace_hessian_includes_nonlinear_residual_curvature():
    loadings = np.asarray([0.58, 0.67, 0.76], dtype=float)
    observed = np.asarray([0.34, 0.49, 0.46], dtype=float)
    standard_deviations = np.asarray([0.08, 0.07, 0.09], dtype=float)
    pairs = ((0, 1), (0, 2), (1, 2))

    def objective(values):
        residuals = np.asarray(
            [
                (observed[index] - values[left] * values[right])
                / standard_deviations[index]
                for index, (left, right) in enumerate(pairs)
            ]
        )
        prior = (values - LOADING_PRIOR_MEAN) / LOADING_PRIOR_SD
        return 0.5 * float(residuals @ residuals + prior @ prior)

    step = 1e-4
    finite_difference = np.empty((3, 3), dtype=float)
    for left in range(3):
        for right in range(3):
            left_step = np.zeros(3, dtype=float)
            right_step = np.zeros(3, dtype=float)
            left_step[left] = step
            right_step[right] = step
            finite_difference[left, right] = (
                objective(loadings + left_step + right_step)
                - objective(loadings + left_step - right_step)
                - objective(loadings - left_step + right_step)
                + objective(loadings - left_step - right_step)
            ) / (4.0 * step**2)

    exact = _loading_posterior_hessian(
        loadings, observed, standard_deviations, pairs
    )
    assert exact == pytest.approx(finite_difference, rel=1e-6, abs=1e-5)

    gauss_newton_cross = loadings[0] * loadings[1] / standard_deviations[0] ** 2
    assert exact[0, 1] != pytest.approx(gauss_newton_cross)


def test_fit_emits_no_draws_latent_states_or_respondent_scores(invariant_result):
    _, fit, _ = invariant_result
    payload = fit.to_dict()
    text = repr(payload).lower()

    assert payload["posterior_draws_generated"] is False
    assert payload["latent_states_emitted"] is False
    assert payload["respondent_scores_emitted"] is False
    assert payload["full_information_likelihood"] is False
    assert payload["nuts_used"] is False
    assert "respondent_id" not in text
    assert "raw_answer" not in text
    assert "latent_score" not in text


def test_model_rejects_real_or_customer_marked_package_before_fit(invariant_result):
    case, _, _ = invariant_result
    unsafe = replace(
        case.package,
        synthetic_only=False,
        real_data_present=True,
        customer_data_present=True,
    )

    with pytest.raises(MeasurementEvidenceError):
        fit_ordinal_measurement_model(unsafe)


def test_model_recomputes_generator_instead_of_trusting_rehashed_pair_counts(
    invariant_result,
):
    case, _, _ = invariant_result
    wave = case.package.waves[0]
    pair = wave.pairs[0]
    cells = [list(row) for row in pair.cell_counts]
    cycle = None
    for row_one in range(5):
        for row_two in range(row_one + 1, 5):
            for column_one in range(5):
                for column_two in range(column_one + 1, 5):
                    if cells[row_one][column_one] and cells[row_two][column_two]:
                        cycle = (row_one, row_two, column_one, column_two)
                        break
                if cycle:
                    break
            if cycle:
                break
        if cycle:
            break
    assert cycle is not None
    row_one, row_two, column_one, column_two = cycle
    cells[row_one][column_one] -= 1
    cells[row_two][column_two] -= 1
    cells[row_one][column_two] += 1
    cells[row_two][column_one] += 1
    forged_pair = replace(pair, cell_counts=tuple(tuple(row) for row in cells))
    pairs = list(wave.pairs)
    pairs[0] = forged_pair
    aggregate_counts_hash = sha256_json(
        {
            "items": [item.to_dict() for item in wave.items],
            "pairs": [value.to_dict() for value in pairs],
        }
    )
    forged_source_hash = sha256_json(
        {
            "generator_binding_hash": wave.generator_binding_hash,
            "wave_role": wave.wave_role,
            "aggregate_counts_hash": aggregate_counts_hash,
        }
    )
    forged_wave = replace(
        wave,
        pairs=tuple(pairs),
        source_hash=forged_source_hash,
    )
    forged_package = replace(
        case.package,
        waves=(forged_wave, case.package.waves[1]),
    )

    validate_measurement_package(forged_package)
    with pytest.raises(OrdinalMeasurementFitError, match="fresh generator"):
        fit_ordinal_measurement_model(forged_package)


def test_model_rejects_rehashed_synthetic_metadata_relabel(invariant_result):
    case, _, _ = invariant_result
    relabeled = replace(
        case.package,
        package_id="synthetic-measurement-invariant-relabeled",
    )

    with pytest.raises(MeasurementEvidenceError, match="synthetic identity"):
        fit_ordinal_measurement_model(relabeled)


def test_seeded_fit_and_hash_are_deterministic(invariant_result):
    case, fit, _ = invariant_result
    repeated = fit_ordinal_measurement_model(case.package)

    assert repeated == fit
    assert repeated.fit_hash == fit.fit_hash
