"""Fast checks for the synthetic calibration-study runner.

These tests cover the study mechanics without launching hundreds of PyMC
fits. The real sampler path is exercised by the explicit smoke/full commands
documented in ``inference/README.md``.
"""

import inspect
import math
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest

from fluencytracr_inference import calibration as cal
from fluencytracr_inference.constants import (
    INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    INFERENCE_PROOF_PPC_STATISTIC_NAMES,
    INFERENCE_PROOF_FLOAT_TOLERANCE,
    LIKELIHOOD_FAMILY_LINKS,
    SUPPORTED_LIKELIHOOD_FAMILY,
)
from fluencytracr_inference.diagnostics import (
    DiagnosticsResult,
    ParameterDiagnostic,
    PpcStatistic,
    PreTrendResult,
    PriorSensitivityResult,
    SamplerDiagnostics,
)
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.model import (
    FitResult,
    PRIOR_SENSITIVITY_SCALINGS,
    PriorSpec,
    fit_did_model,
)
from fluencytracr_inference.synthetic import generate_did_dataset


EXPECTED_CELL_IDS = [cell.cell_id for cell in cal.CALIBRATION_CELLS]


def _fake_record(
    cell,
    index,
    *,
    covers=True,
    excludes_zero=False,
    sane=True,
    posterior_mean=0.0,
    posterior_sd=0.1,
    ci80_lower=-0.1,
    ci80_upper=0.1,
):
    return {
        "cell_id": cell.cell_id,
        "injected_effect_size_sd": cell.injected_effect_sd,
        "cohort_size": cell.k,
        "replication_index": index,
        "seed": cal.derive_replication_seed(
            cal.DEFAULT_BASE_SEED,
            cal.CALIBRATION_CELLS.index(cell),
            index,
        ),
        "posterior_mean": posterior_mean,
        "posterior_sd": posterior_sd,
        "ci80_lower": ci80_lower,
        "ci80_upper": ci80_upper,
        "covers_injected_effect": covers,
        "ci_excludes_zero": excludes_zero,
        "sanity": {"pass": sane},
        "contribution_estimate_eligible": bool(sane and excludes_zero),
        "wall_time_seconds": 1.0,
    }


def _fake_study():
    records_by_cell = {}
    for cell in cal.CALIBRATION_CELLS:
        records = []
        for index in range(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN):
            covers = index < 160
            excludes_zero = cell.injected_effect_sd == 0.0 and index < 3
            sane = not (cell.injected_effect_sd == 0.0 and index == 1)
            records.append(
                _fake_record(
                    cell,
                    index,
                    covers=covers,
                    excludes_zero=excludes_zero,
                    sane=sane,
                )
            )
        records_by_cell[cell.cell_id] = records
    return {
        "records_by_cell": records_by_cell,
        "settings": dict(cal.CHEAP_FIT_SETTINGS),
        "cell_settings": {
            cell.cell_id: dict(cal.CHEAP_FIT_SETTINGS) for cell in cal.CALIBRATION_CELLS
        },
        "base_seed": cal.DEFAULT_BASE_SEED,
        "replications_per_cell": INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        "workers": 2,
        "wall_time_seconds": 0.0,
    }


def test_calibration_cell_grid_and_seed_derivation_are_stable():
    assert EXPECTED_CELL_IDS == [
        "effect-0-k12",
        "effect-0-k16",
        "effect-0.2-k12",
        "effect-0.2-k16",
        "effect-0.5-k12",
        "effect-0.5-k16",
    ]
    seen = set()
    for cell_index, _cell in enumerate(cal.CALIBRATION_CELLS):
        for replication_index in (0, 1, 199):
            seed = cal.derive_replication_seed(
                cal.DEFAULT_BASE_SEED,
                cell_index,
                replication_index,
            )
            assert seed not in seen
            seen.add(seed)


def test_default_results_path_is_local_ignored_during_iteration():
    assert cal.DEFAULT_CLI_RESULTS_PATH.name == "calibration_study_results.local.json"
    assert cal.DEFAULT_STUDY_RESULTS_PATH.name == "calibration_study_results.json"


def test_full_quality_settings_match_reliable_model_defaults():
    signature = inspect.signature(fit_did_model)
    model_defaults = {
        "draws": signature.parameters["draws"].default,
        "tune": signature.parameters["tune"].default,
        "chains": signature.parameters["chains"].default,
        "target_accept": signature.parameters["target_accept"].default,
        "max_treedepth": signature.parameters["max_treedepth"].default,
    }

    assert cal.FULL_QUALITY_FIT_SETTINGS == model_defaults
    assert cal.FULL_QUALITY_FIT_SETTINGS == {
        "draws": 2000,
        "tune": 3000,
        "chains": 2,
        "target_accept": 0.999,
        "max_treedepth": 15,
    }


def test_main_defaults_to_local_results_path(monkeypatch):
    calls = {}

    def fake_run_calibration_study(**kwargs):
        calls["run_calibration_study"] = kwargs
        return {
            **_fake_study(),
            "executed": 0,
            "skipped": len(cal.CALIBRATION_CELLS)
            * INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        }

    def fake_run_carrier_pipeline(log):
        return SimpleNamespace(), SimpleNamespace()

    def fake_build_study_results(**kwargs):
        return {
            "calibration": {"cells": []},
            "null_false_eligibility": {
                "false_eligibility_rate": 0.0,
                "null_effect_scenario_count": 0,
                "unscreened_ci_excludes_zero_rate": 0.0,
                "pass": True,
            },
            "floor_study": {"pass": True},
            "negative_controls_pass": True,
            "total_wall_time_seconds": 0.0,
        }

    def fake_write_study_results(results, path):
        calls["write_study_results"] = {"results": results, "path": path}
        return path

    monkeypatch.setattr(cal, "run_calibration_study", fake_run_calibration_study)
    monkeypatch.setattr(cal, "_run_carrier_pipeline", fake_run_carrier_pipeline)
    monkeypatch.setattr(cal, "build_study_results", fake_build_study_results)
    monkeypatch.setattr(cal, "write_study_results", fake_write_study_results)

    assert cal.main([]) == 0

    assert calls["write_study_results"]["path"] == cal.DEFAULT_CLI_RESULTS_PATH


def test_calibration_cell_selection_limits_active_cells(monkeypatch):
    calls = {}

    def fake_run_calibration_study(**kwargs):
        calls["run_calibration_study"] = kwargs
        return {"executed": 0, "skipped": 0, "wall_time_seconds": 0.0}

    monkeypatch.setattr(cal, "run_calibration_study", fake_run_calibration_study)

    assert (
        cal.main(
            [
                "--calibration-cell",
                "effect-0.5-k16",
                "--full-quality-cell",
                "effect-0.5-k16",
                "--replications",
                "400",
                "--calibration-only",
            ]
        )
        == 0
    )

    cells = calls["run_calibration_study"]["cells"]
    assert [cell.cell_id for cell in cells] == ["effect-0.5-k16"]
    assert calls["run_calibration_study"]["replications_per_cell"] == 400
    assert calls["run_calibration_study"]["cell_fit_settings"] == {
        "effect-0.5-k16": cal.FULL_QUALITY_FIT_SETTINGS
    }


def test_binomial_interval_95_sanity():
    interval = cal.binomial_interval_95(160, 200)
    assert interval["lower"] < 0.8 < interval["upper"]
    assert interval["method"] == "clopper_pearson"
    assert cal.binomial_interval_95(0, 50)["lower"] == 0.0
    assert cal.binomial_interval_95(50, 50)["upper"] == 1.0


def test_calibration_summaries_map_to_artifact_inputs():
    summaries = cal.summarize_calibration_cells(_fake_study())
    assert [summary["cell_id"] for summary in summaries] == EXPECTED_CELL_IDS
    for summary in summaries:
        assert summary["coverage_rate"] == pytest.approx(0.8)
        assert summary["pass"] is True
        expected_se = math.sqrt(0.8 * 0.2 / INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN)
        assert abs(summary["coverage_standard_error"] - expected_se) <= (
            INFERENCE_PROOF_FLOAT_TOLERANCE
        )
        assert summary["fit_settings"] == cal.CHEAP_FIT_SETTINGS

    scenarios = cal.calibration_scenarios_from_summaries(summaries)
    assert len(scenarios) == 6
    assert scenarios[0]["injected_effect_size_sd"] == 0
    assert all(scenario["scenario_id"].startswith("calibration-effect-") for scenario in scenarios)
    assert all(scenario["pass"] is True for scenario in scenarios)


def test_calibration_summaries_fail_closed_on_incomplete_cells():
    study = _fake_study()
    cell = cal.CALIBRATION_CELLS[0]
    study["records_by_cell"][cell.cell_id] = study["records_by_cell"][cell.cell_id][:-1]

    summary = cal.summarize_calibration_cells(study)[0]

    assert summary["cell_id"] == cell.cell_id
    assert summary["replication_count"] == INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN - 1
    assert summary["target_replication_count"] == INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
    assert summary["completion_gap"] == 1
    assert summary["complete"] is False
    assert summary["coverage_in_band"] is True
    assert summary["pass"] is False


def test_calibration_completion_requires_every_cell():
    study = _fake_study()
    missing_cell = cal.CALIBRATION_CELLS[-1]
    del study["records_by_cell"][missing_cell.cell_id]
    summaries = cal.summarize_calibration_cells(study)

    completion = cal.summarize_calibration_completion(study, summaries)

    assert completion["pass"] is False
    assert completion["required_cell_count"] == len(cal.CALIBRATION_CELLS)
    assert completion["observed_cell_count"] == len(cal.CALIBRATION_CELLS) - 1
    assert completion["missing_cell_ids"] == [missing_cell.cell_id]
    assert cal.all_calibration_cells_pass(study, summaries) is False


def test_coverage_diagnostics_show_undercoverage_shape():
    cell = cal.CALIBRATION_CELLS[-1]
    records = []
    for index in range(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN):
        if index < 144:
            records.append(
                _fake_record(
                    cell,
                    index,
                    covers=True,
                    posterior_mean=0.5,
                    ci80_lower=0.3,
                    ci80_upper=0.7,
                )
            )
        elif index < 174:
            records.append(
                _fake_record(
                    cell,
                    index,
                    covers=False,
                    posterior_mean=0.25,
                    ci80_lower=0.1,
                    ci80_upper=0.4,
                )
            )
        else:
            records.append(
                _fake_record(
                    cell,
                    index,
                    covers=False,
                    posterior_mean=0.75,
                    ci80_lower=0.6,
                    ci80_upper=0.9,
                )
            )
    study = _fake_study()
    study["records_by_cell"][cell.cell_id] = records

    summary = [
        item for item in cal.summarize_calibration_cells(study) if item["cell_id"] == cell.cell_id
    ][0]
    diagnostics = summary["coverage_diagnostics"]

    assert summary["coverage_rate"] == pytest.approx(0.72)
    assert summary["pass"] is False
    assert diagnostics["interval_below_injected_count"] == 30
    assert diagnostics["interval_above_injected_count"] == 26
    assert diagnostics["missed_count"] == 56
    assert diagnostics["median_ci80_width_sd"] == pytest.approx(0.4)
    assert diagnostics["mean_posterior_error_sd"] == pytest.approx((-30 * 0.25 + 26 * 0.25) / 200)
    assert diagnostics["empirical_posterior_mean_error_sd"] > diagnostics["mean_posterior_sd"]
    assert diagnostics["empirical_error_to_posterior_sd_ratio"] > 1.0
    assert diagnostics["coverage_gap_from_nominal_80"] == pytest.approx(0.08)
    assert diagnostics["missed_replication_seeds_sample"][0]["direction"] == "interval_below_injected"

    scenarios = cal.calibration_scenarios_from_summaries([summary])
    assert "coverage_diagnostics" not in scenarios[-1]


def test_empty_coverage_diagnostics_keep_stable_shape():
    diagnostics = cal.coverage_diagnostics([], injected_effect_size_sd=0.5)

    assert diagnostics == {
        "missed_count": 0,
        "interval_below_injected_count": 0,
        "interval_above_injected_count": 0,
        "declared_miss_overlap_count": 0,
        "mean_posterior_error_sd": None,
        "empirical_posterior_mean_error_sd": None,
        "mean_posterior_sd": None,
        "empirical_error_to_posterior_sd_ratio": None,
        "coverage_gap_from_nominal_80": None,
        "median_ci80_width_sd": None,
        "mean_ci80_width_sd": None,
        "missed_replication_seeds_sample": [],
    }


def test_null_false_eligibility_pooling_math():
    summary = cal.summarize_null_false_eligibility(_fake_study())
    assert summary["null_effect_scenario_count"] == 400
    assert summary["false_eligible_count"] == 4
    assert summary["unscreened_ci_excludes_zero_count"] == 6
    assert summary["false_eligibility_rate"] == pytest.approx(0.01)
    assert summary["pass"] is True

    passing = cal.null_checks_from_summary(summary, negative_controls_pass=True)
    assert passing == {
        "null_effect_scenario_count": 400,
        "false_eligibility_rate": pytest.approx(0.01),
        "pass": True,
    }
    blocked = cal.null_checks_from_summary(summary, negative_controls_pass=False)
    assert blocked["pass"] is False


def test_control_inputs_and_checkpoint_rules(tmp_path):
    scenarios, null_checks = cal.control_study_inputs()
    assert len(scenarios) == 6
    assert all(scenario["scenario_id"].startswith("structural-control-") for scenario in scenarios)
    assert all(0.74 <= scenario["coverage_rate"] <= 0.86 for scenario in scenarios)
    assert null_checks["pass"] is True

    path = tmp_path / "study" / "effect-0-k12.jsonl"
    record = _fake_record(cal.CALIBRATION_CELLS[0], 0)
    cal._append_checkpoint(path, record)
    assert cal._load_checkpointed(path) == {0: record}

    gitignore = Path(__file__).resolve().parent.parent / ".gitignore"
    assert ".calibration-cache/" in gitignore.read_text(encoding="utf-8")


def test_checkpoint_progress_summary_dedupes_duplicate_lines(tmp_path):
    cell = cal.CALIBRATION_CELLS[-1]
    study_key = cal._study_key(cal.DEFAULT_BASE_SEED, cal.FULL_QUALITY_FIT_SETTINGS)
    path = cal._cell_cache_path(tmp_path, study_key, cell)
    first = _fake_record(cell, 0, covers=False)
    replacement = _fake_record(cell, 0, covers=True)
    second = _fake_record(cell, 1, covers=True)
    cal._append_checkpoint(path, first)
    cal._append_checkpoint(path, replacement)
    cal._append_checkpoint(path, second)

    summary = cal.summarize_checkpoint_progress(
        replications_per_cell=4,
        cache_dir=tmp_path,
        cell_fit_settings={cell.cell_id: dict(cal.FULL_QUALITY_FIT_SETTINGS)},
        cells=(cell,),
    )

    assert summary["total_pending_replications"] == 2
    cell_summary = summary["cells"][0]
    assert cell_summary["cell_id"] == cell.cell_id
    assert cell_summary["raw_checkpoint_lines"] == 3
    assert cell_summary["completed_replications"] == 2
    assert cell_summary["duplicate_checkpoint_lines"] == 1
    assert cell_summary["coverage_rate"] == 1.0
    assert cell_summary["fit_settings"] == cal.FULL_QUALITY_FIT_SETTINGS


def _passing_diagnostics() -> DiagnosticsResult:
    prior_spec = PriorSpec()
    justification_hash = sha256_json(
        {
            "justification_ref": prior_spec.justification_ref,
            "prior_family": prior_spec.family_name,
            "prior_spec": prior_spec.describe(),
            "scalings": [1.0, *[float(s) for s in PRIOR_SENSITIVITY_SCALINGS]],
        }
    )
    return DiagnosticsResult(
        sampler=SamplerDiagnostics(
            parameters=(
                ParameterDiagnostic(
                    parameter_name=INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
                    r_hat=1.002,
                    bulk_ess=1200.0,
                    tail_ess=1100.0,
                    posterior_mean_mcse=0.001,
                    interval_endpoint_mcse=0.002,
                    posterior_sd=0.1,
                ),
            ),
            post_warmup_divergences=0,
            max_treedepth_saturation_rate=0.0,
            max_treedepth_warning=False,
            energy_bfmi_min=0.9,
            energy_bfmi_warning=False,
        ),
        posterior_predictive_checks=tuple(
            PpcStatistic(
                statistic_name=name,
                observed_value=0.0,
                predictive_mean=0.0,
                predictive_ci80_lower=-1.0,
                predictive_ci80_upper=1.0,
                p_value=0.5,
                passed=True,
            )
            for name in INFERENCE_PROOF_PPC_STATISTIC_NAMES
        ),
        prior_sensitivity=PriorSensitivityResult(
            documented=True,
            justification_ref=prior_spec.justification_ref,
            justification_hash=justification_hash,
            posterior_mean_shift_in_posterior_sd=0.1,
            passed=True,
            prior_family=prior_spec.family_name,
        ),
        pre_trend=PreTrendResult(
            ci80_lower=-0.1,
            ci80_upper=0.1,
            includes_zero=True,
            passed=True,
            wall_time_seconds=0.0,
        ),
        internal_report={},
    )


def _fake_fit(dataset) -> FitResult:
    draws = np.full((2, 100), 0.5)
    idata = SimpleNamespace(posterior={INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME: draws})
    return FitResult(
        idata=idata,
        dataset=dataset,
        prior_spec=PriorSpec(),
        likelihood_family=SUPPORTED_LIKELIHOOD_FAMILY,
        link_function=LIKELIHOOD_FAMILY_LINKS[SUPPORTED_LIKELIHOOD_FAMILY],
        draws=100,
        tune=100,
        chains=2,
        seed=dataset.seed,
        target_accept=0.99,
        max_treedepth=12,
        wall_time_seconds=0.0,
        synthetic_input_hash=dataset.synthetic_input_hash(),
    )


def test_structural_study_artifact_rebinds_carrier_to_dataset_under_test():
    carrier_dataset = generate_did_dataset(seed=101, k=16)
    structural_dataset = generate_did_dataset(seed=102, k=4)
    artifact = cal._emit_study_artifact(
        structural_dataset,
        carrier_fit=_fake_fit(carrier_dataset),
        carrier_diagnostics=_passing_diagnostics(),
    )

    assert artifact["hash_bindings"]["synthetic_input_hash"] == (
        structural_dataset.synthetic_input_hash()
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["floor_check"]
