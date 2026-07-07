"""Fast checks for the synthetic calibration-study runner.

These tests cover the study mechanics without launching hundreds of PyMC
fits. The real sampler path is exercised by the explicit smoke/full commands
documented in ``inference/README.md``.
"""

import math
from pathlib import Path

import pytest

from fluencytracr_inference import calibration as cal
from fluencytracr_inference.constants import (
    INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    INFERENCE_PROOF_FLOAT_TOLERANCE,
)


EXPECTED_CELL_IDS = [cell.cell_id for cell in cal.CALIBRATION_CELLS]


def _fake_record(cell, index, *, covers=True, excludes_zero=False, sane=True):
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
        "posterior_mean": 0.0,
        "posterior_sd": 0.1,
        "ci80_lower": -0.1,
        "ci80_upper": 0.1,
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
