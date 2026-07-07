"""Synthetic calibration study, floor study, and negative controls (task 3.3).

Phase B2 of the proof harness: this module RUNS the study whose results the
artifact emitter consumes (replacing the Phase B1 fixture study inputs).

Three study layers, all seeded and synthetic-only:

1. **Calibration cells** — injected effects {0, 0.2, 0.5} SD x floor-eligible
   cohort counts k in {12, 16} (6 cells), >= 200 seeded replications per cell.
   Each replication generates a dataset, runs a cheap seeded NUTS fit
   (2 chains x 500 draws, target_accept 0.95 — sufficient for coverage;
   coverage does not gate on the ESS >= 400 production gate), and records
   whether the 80% credible interval covers the injected effect. Per-cell
   observed coverage must land in [74%, 86%], with the binomial 95%
   uncertainty interval around observed coverage reported alongside.
2. **Null false-eligibility** — pooled over the injected-effect-0 cells, the
   rate of replications that would have been contribution-estimate-ELIGIBLE
   must be <= 5%. See :func:`cheap_fit_sanity` for the documented cheap-fit
   analogue of the artifact's eligibility definition.
3. **Floor study and negative controls** — k=4 replications proving
   artifact-level floor rejection, k=8 replications proving the internal-only
   path (valid but below the k >= 10 series display floor), plus a few
   replications of each named negative control (no comparison cohort,
   violated pre-trend, mismatched comparison, prior-dominated weak data,
   missing/suppressed windows, naive repeated milestone peeking) proving
   fail-closed HOLD / evidence-tier-only behavior with the right named
   diagnostic.

Replications are embarrassingly parallel by seed: the runner uses a
``multiprocessing`` spawn pool (workers = max(2, cpu_count - 2)) and
checkpoints every replication as one JSONL line under
``inference/.calibration-cache/`` (gitignored), so an interrupted study
resumes without recomputing finished seeds.

The compact committed summary (``inference/calibration_study_results.json``)
carries per-cell coverage with binomial intervals, the pooled null
false-eligibility rate, floor and negative-control outcomes, seeds, and
settings — plus the ready-to-consume ``artifact_inputs`` section the emitter
loads (see :mod:`.artifact`).

CLI::

    python -m fluencytracr_inference.calibration            # full study
    python -m fluencytracr_inference.calibration --smoke    # 25 reps/cell
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import math
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from multiprocessing import get_context
from pathlib import Path

import numpy as np
import arviz as az
from scipy import stats as scipy_stats

from . import __version__ as HARNESS_VERSION
from .artifact import (
    DEFAULT_STUDY_RESULTS_PATH,
    canonical_floor_checks,
    emit_proof_artifact,
)
from .constants import (
    CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
    CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
    ENERGY_BFMI_WARNING_THRESHOLD,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN,
    INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
    INFERENCE_PROOF_RHAT_MAX,
)
from .diagnostics import (
    _bfmi_values,
    _tree_values,
    compute_diagnostics,
    run_pre_trend_check,
    run_prior_sensitivity,
)
from .hashing import sha256_json
from .model import FitResult, fit_did_model
from .synthetic import (
    generate_did_dataset,
    generate_mismatched_comparison,
    generate_missing_windows,
    generate_no_comparison_cohort,
    generate_prior_dominated_weak,
    generate_suppressed_windows,
    generate_violated_pre_trend,
)

STUDY_ID = "confidence-inference-proof-calibration-study"

# The task-3.3 cell grid: every injected effect x every floor-eligible k.
CALIBRATION_EFFECT_SIZES_SD = (0.0, 0.2, 0.5)
CALIBRATION_COHORT_SIZES = (12, 16)

DEFAULT_BASE_SEED = 20260706
DEFAULT_REPLICATIONS_PER_CELL = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
SMOKE_REPLICATIONS_PER_CELL = 25

# Cheap-fit settings (Phase B1 finding: calibration-sized fits at 2 chains x
# ~500 draws / target_accept 0.95 are sufficient for coverage; coverage does
# not gate on the production ESS >= 400 requirement).
CHEAP_FIT_SETTINGS = {
    "draws": 500,
    "tune": 500,
    "chains": 2,
    "target_accept": 0.95,
    "max_treedepth": 12,
}
# Full-quality (production) fit settings, used to re-measure any cell where
# the cheap instrument is shown to be biased (see the k=16 undercoverage
# investigation in the committed results' notes): matching fit_did_model's
# defaults, these fits are routinely divergence-free.
FULL_QUALITY_FIT_SETTINGS = {
    "draws": 2000,
    "tune": 1000,
    "chains": 2,
    "target_accept": 0.99,
    "max_treedepth": 12,
}
CREDIBLE_INTERVAL_LEVEL = 0.8

DEFAULT_CACHE_DIR = Path(__file__).resolve().parents[2] / ".calibration-cache"

FLOOR_REJECTION_K = 4
INTERNAL_ONLY_PATH_K = 8
DEFAULT_FLOOR_REPLICATIONS = 3
DEFAULT_NEGATIVE_CONTROL_REPLICATIONS = 3
# Injected apparent effect (SD units) for the prior-dominated weak-data
# negative control. The generator's default (4.0) left one study seed's
# posterior-mean shift at 0.399 SD — just under the 0.5 SD gate, i.e. the
# stimulus was not reliably prior-dominated at every seed. A stronger
# apparent effect makes the prior binding for every seed WITHOUT touching
# the gate threshold (fix the stimulus, never the gate).
PRIOR_DOMINATED_CONTROL_EFFECT_SD = 8.0

# Deterministic seed-space offsets so calibration cells, floor cells, and
# negative-control cells never share a seed.
_FLOOR_SEED_OFFSET = 50_000_000
_NEGATIVE_CONTROL_SEED_OFFSET = 60_000_000


@dataclass(frozen=True)
class CalibrationCell:
    injected_effect_sd: float
    k: int

    @property
    def effect_label(self) -> str:
        return f"{self.injected_effect_sd:g}"

    @property
    def cell_id(self) -> str:
        return f"effect-{self.effect_label}-k{self.k}"


CALIBRATION_CELLS: tuple[CalibrationCell, ...] = tuple(
    CalibrationCell(injected_effect_sd=effect, k=k)
    for effect in CALIBRATION_EFFECT_SIZES_SD
    for k in CALIBRATION_COHORT_SIZES
)


def derive_replication_seed(base_seed: int, cell_index: int, replication_index: int) -> int:
    """Deterministic per-replication seed: base + cell block + replication.

    Each cell owns a disjoint contiguous block of 1,000,000 seeds, so seeds
    never collide across cells and a cell's seed range is reportable as
    ``[first, last]``.
    """
    if replication_index >= 1_000_000:
        raise ValueError("replication_index exceeds the per-cell seed block")
    return base_seed + (cell_index + 1) * 1_000_000 + replication_index


# --- Cheap-fit sanity: the documented eligibility analogue ---------------------


def cheap_fit_sanity(fit: FitResult) -> dict:
    """Cheap-fit sanity checks: the calibration-study analogue of eligibility.

    ANALOGY (documented per task 3.3): the artifact defines
    contribution-estimate eligibility as ``governance_state.state ==
    "eligible_internal_only"`` — every sampler gate passes (R-hat <= 1.01 for
    all parameters, bulk/tail ESS >= 400, zero post-warmup divergences, no
    max-treedepth or E-BFMI backend warning, MCSE ratios in bound), the PPC /
    prior-sensitivity / pre-trend gates pass, the aggregate floors pass, the
    window evidence is complete, the comparison rubric passes in full, and
    the fixed-horizon peeking control passes — at which point
    ``comparison_supported_contribution_estimate_authorized`` is true.

    The closest CHEAP-FIT analogue used for null false-eligibility keeps the
    per-fit sampler-health gates that a cheap fit can meaningfully satisfy
    and drops only what is structurally either impossible or trivially true
    at calibration settings:

    - KEPT: post-warmup divergences == 0; no max-treedepth saturation; no
      E-BFMI backend warning; estimand R-hat <= 1.01. Any of these failing
      would force the real artifact to HOLD, so the replication could never
      have produced an eligible artifact.
    - DROPPED: the bulk/tail ESS >= 400 chain-total and MCSE gates — a
      2-chain x 500-draw cheap fit cannot reliably clear chain-total 400
      ESS by construction, so keeping them would make the null screen
      vacuous (every replication ineligible) instead of measuring inference
      behavior; the production fit (2 x 2000 draws) clears them routinely.
    - TRIVIALLY TRUE BY CONSTRUCTION (not re-checked per replication): the
      k >= 5 schema floor (cells use k in {12, 16}), clean window evidence,
      the complete passing comparison rubric, and the one-look peeking
      control — the clean generator declares all of these passing.
    - The per-fit PPC / prior-sensitivity / pre-trend gates are not run per
      replication (each costs additional full fits); the negative-control
      study proves each of those gates fails closed separately.

    A null replication is then contribution-estimate-eligible iff these
    sanity checks pass AND the estimand's 80% credible interval excludes 0
    (the artifact would otherwise be reporting a signed contribution
    estimate consistent with zero). The study reports the unscreened
    CI-excludes-zero rate alongside so the effect of the screen is visible.
    """
    sample_stats = fit.idata.sample_stats
    divergences = int(np.asarray(sample_stats["diverging"]).sum())
    if "reached_max_treedepth" in sample_stats.data_vars:
        saturation_rate = float(np.asarray(sample_stats["reached_max_treedepth"]).mean())
    else:  # pragma: no cover - backend variant
        saturation_rate = 0.0
    bfmi_values = _bfmi_values(fit.idata)
    bfmi_min = float(bfmi_values.min())
    rhat_tree = az.rhat(fit.idata, var_names=[INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME])
    estimand_r_hat = float(
        _tree_values(rhat_tree, INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME).reshape(-1)[0]
    )

    passed = (
        divergences == 0
        and saturation_rate == 0.0
        and bfmi_min >= ENERGY_BFMI_WARNING_THRESHOLD
        and estimand_r_hat <= INFERENCE_PROOF_RHAT_MAX
    )
    return {
        "post_warmup_divergences": divergences,
        "max_treedepth_saturation_rate": saturation_rate,
        "energy_bfmi_min": bfmi_min,
        "estimand_r_hat": estimand_r_hat,
        "pass": bool(passed),
    }


# --- Per-replication worker -----------------------------------------------------


def _worker_init() -> None:  # pragma: no cover - runs in child processes
    """Quiet worker processes and stop BLAS oversubscription."""
    import logging

    for name in ("pymc", "pytensor", "arviz"):
        logging.getLogger(name).setLevel(logging.ERROR)
    try:
        import threadpoolctl

        threadpoolctl.threadpool_limits(limits=1)
    except Exception:
        pass


def run_replication(task: dict) -> dict:
    """One seeded calibration replication: generate, cheap-fit, record.

    Pure function of ``task`` (seed-deterministic), so replication results
    are identical regardless of worker scheduling or resume order.
    """
    seed = int(task["seed"])
    effect = float(task["injected_effect_sd"])
    k = int(task["k"])
    started = time.perf_counter()
    dataset = generate_did_dataset(seed=seed, k=k, injected_effect_sd=effect)
    fit = fit_did_model(
        dataset,
        draws=int(task["draws"]),
        tune=int(task["tune"]),
        chains=int(task["chains"]),
        seed=seed,
        target_accept=float(task["target_accept"]),
        max_treedepth=int(task["max_treedepth"]),
        sample_posterior_predictive=False,
    )
    summary = fit.estimand_summary()
    lower = float(summary["credible_interval_80"]["lower"])
    upper = float(summary["credible_interval_80"]["upper"])
    sanity = cheap_fit_sanity(fit)
    ci_excludes_zero = not (lower <= 0.0 <= upper)
    return {
        "cell_id": task["cell_id"],
        "injected_effect_size_sd": effect,
        "cohort_size": k,
        "replication_index": int(task["replication_index"]),
        "seed": seed,
        "posterior_mean": float(summary["posterior_mean"]),
        "posterior_sd": float(summary["posterior_sd"]),
        "ci80_lower": lower,
        "ci80_upper": upper,
        "covers_injected_effect": bool(lower <= effect <= upper),
        "ci_excludes_zero": bool(ci_excludes_zero),
        "sanity": sanity,
        # Contribution-estimate eligibility (cheap-fit analogue, see
        # cheap_fit_sanity docstring); only pooled over effect-0 cells.
        "contribution_estimate_eligible": bool(sanity["pass"] and ci_excludes_zero),
        "wall_time_seconds": float(time.perf_counter() - started),
    }


# --- Checkpointing ----------------------------------------------------------------


def _study_key(base_seed: int, fit_settings: dict) -> str:
    """Cache namespace: base seed + fit settings (NOT replication count, so a
    resumed run with more replications reuses every finished seed)."""
    return sha256_json({"base_seed": int(base_seed), "fit_settings": fit_settings})[:12]


def _cell_cache_path(cache_dir: Path, study_key: str, cell: CalibrationCell) -> Path:
    return cache_dir / f"study-{study_key}" / f"{cell.cell_id}.jsonl"


def _load_checkpointed(path: Path) -> dict[int, dict]:
    """Load finished replications (replication_index -> record); resume support."""
    records: dict[int, dict] = {}
    if not path.exists():
        return records
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            records[int(record["replication_index"])] = record
    return records


def _checkpoint_line_count(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open(encoding="utf-8") as handle:
        return sum(1 for line in handle if line.strip())


def _append_checkpoint(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True) + "\n")
        handle.flush()


# --- Study runner -----------------------------------------------------------------


def default_worker_count() -> int:
    return max(2, (os.cpu_count() or 2) - 2)


def summarize_checkpoint_progress(
    *,
    base_seed: int = DEFAULT_BASE_SEED,
    replications_per_cell: int | None = None,
    smoke: bool = False,
    cache_dir: Path | str | None = None,
    fit_settings: dict | None = None,
    cell_fit_settings: dict[str, dict] | None = None,
    cells: tuple[CalibrationCell, ...] | None = None,
) -> dict:
    """Read checkpoint progress without launching new sampler work."""
    if replications_per_cell is None:
        replications_per_cell = (
            SMOKE_REPLICATIONS_PER_CELL if smoke else DEFAULT_REPLICATIONS_PER_CELL
        )
    cache_root = Path(cache_dir) if cache_dir is not None else DEFAULT_CACHE_DIR
    base_settings = {**CHEAP_FIT_SETTINGS, **(fit_settings or {})}
    active_cells = cells if cells is not None else CALIBRATION_CELLS
    cell_settings = {
        cell.cell_id: {**base_settings, **((cell_fit_settings or {}).get(cell.cell_id, {}))}
        for cell in active_cells
    }
    cell_summaries = []
    for cell in active_cells:
        settings = cell_settings[cell.cell_id]
        path = _cell_cache_path(cache_root, _study_key(base_seed, settings), cell)
        checkpointed = {
            index: record
            for index, record in _load_checkpointed(path).items()
            if index < replications_per_cell
        }
        completed = len(checkpointed)
        raw_lines = _checkpoint_line_count(path)
        covered = sum(1 for record in checkpointed.values() if record["covers_injected_effect"])
        coverage_rate = covered / completed if completed else None
        sanity_pass = sum(1 for record in checkpointed.values() if record["sanity"]["pass"])
        pending_indices = [
            index for index in range(replications_per_cell) if index not in checkpointed
        ]
        cell_summaries.append(
            {
                "cell_id": cell.cell_id,
                "injected_effect_size_sd": cell.injected_effect_sd,
                "cohort_size": cell.k,
                "checkpoint_path": str(path),
                "fit_settings": dict(settings),
                "target_replications": int(replications_per_cell),
                "raw_checkpoint_lines": raw_lines,
                "completed_replications": completed,
                "duplicate_checkpoint_lines": max(0, raw_lines - completed),
                "pending_replications": len(pending_indices),
                "next_pending_replication_index": pending_indices[0]
                if pending_indices
                else None,
                "covered_count": covered,
                "coverage_rate": coverage_rate,
                "sanity_pass_count": sanity_pass,
            }
        )
    return {
        "base_seed": int(base_seed),
        "target_replications_per_cell": int(replications_per_cell),
        "cells": cell_summaries,
        "total_completed_replications": sum(
            cell["completed_replications"] for cell in cell_summaries
        ),
        "total_pending_replications": sum(
            cell["pending_replications"] for cell in cell_summaries
        ),
    }


def run_calibration_study(
    *,
    base_seed: int = DEFAULT_BASE_SEED,
    replications_per_cell: int | None = None,
    smoke: bool = False,
    workers: int | None = None,
    cache_dir: Path | str | None = None,
    fit_settings: dict | None = None,
    cell_fit_settings: dict[str, dict] | None = None,
    cells: tuple[CalibrationCell, ...] | None = None,
    log=None,
) -> dict:
    """Run (or resume) the seeded calibration study across all cells.

    Returns ``{"records_by_cell", "settings", "cell_settings", "executed",
    "skipped", "workers", "wall_time_seconds", "base_seed",
    "replications_per_cell"}``. Checkpointed replications are skipped (resume
    support); only pending seeds are dispatched to the multiprocessing pool.

    ``cell_fit_settings`` applies per-cell fit-setting overrides (by
    ``cell_id``) on top of ``fit_settings``. Each distinct settings dict owns
    its own checkpoint namespace (the study key hashes the settings), so
    re-measuring one cell at different settings never mixes checkpoints with
    — and never invalidates — the other cells' finished replications. Every
    cell's summary records the exact settings it was measured with.
    """
    if replications_per_cell is None:
        replications_per_cell = (
            SMOKE_REPLICATIONS_PER_CELL if smoke else DEFAULT_REPLICATIONS_PER_CELL
        )
    workers = workers if workers is not None else default_worker_count()
    cache_root = Path(cache_dir) if cache_dir is not None else DEFAULT_CACHE_DIR
    base_settings = {**CHEAP_FIT_SETTINGS, **(fit_settings or {})}
    active_cells = cells if cells is not None else CALIBRATION_CELLS
    cell_settings = {
        cell.cell_id: {**base_settings, **((cell_fit_settings or {}).get(cell.cell_id, {}))}
        for cell in active_cells
    }
    emit = log if log is not None else (lambda message: None)

    started = time.perf_counter()
    cell_paths = {
        cell.cell_id: _cell_cache_path(
            cache_root, _study_key(base_seed, cell_settings[cell.cell_id]), cell
        )
        for cell in active_cells
    }
    records_by_cell: dict[str, dict[int, dict]] = {}
    pending: list[dict] = []
    skipped = 0
    for cell in active_cells:
        cell_index = CALIBRATION_CELLS.index(cell)
        finished = _load_checkpointed(cell_paths[cell.cell_id])
        records_by_cell[cell.cell_id] = {
            index: record
            for index, record in finished.items()
            if index < replications_per_cell
        }
        skipped += len(records_by_cell[cell.cell_id])
        for replication_index in range(replications_per_cell):
            if replication_index in finished:
                continue
            pending.append(
                {
                    "cell_id": cell.cell_id,
                    "cell_index": cell_index,
                    "injected_effect_sd": cell.injected_effect_sd,
                    "k": cell.k,
                    "replication_index": replication_index,
                    "seed": derive_replication_seed(base_seed, cell_index, replication_index),
                    **cell_settings[cell.cell_id],
                }
            )

    emit(
        f"calibration study: {len(active_cells)} cells x {replications_per_cell} reps; "
        f"{skipped} checkpointed, {len(pending)} pending, {workers} workers"
    )

    executed = 0
    if pending:
        context = get_context("spawn")
        with context.Pool(processes=workers, initializer=_worker_init) as pool:
            for record in pool.imap_unordered(run_replication, pending, chunksize=1):
                _append_checkpoint(cell_paths[record["cell_id"]], record)
                records_by_cell[record["cell_id"]][record["replication_index"]] = record
                executed += 1
                if executed % 25 == 0 or executed == len(pending):
                    emit(
                        f"  {executed}/{len(pending)} replications "
                        f"({time.perf_counter() - started:.0f}s elapsed)"
                    )

    return {
        "records_by_cell": {
            cell_id: [records[index] for index in sorted(records)]
            for cell_id, records in records_by_cell.items()
        },
        "settings": base_settings,
        "cell_settings": cell_settings,
        "base_seed": int(base_seed),
        "replications_per_cell": int(replications_per_cell),
        "executed": executed,
        "skipped": skipped,
        "workers": workers,
        "wall_time_seconds": float(time.perf_counter() - started),
    }


# --- Summaries ---------------------------------------------------------------------


def binomial_interval_95(successes: int, n: int) -> dict:
    """Exact (Clopper-Pearson) 95% binomial interval around an observed rate."""
    if n <= 0:
        raise ValueError("binomial interval requires n > 0")
    alpha = 0.05
    lower = (
        0.0
        if successes == 0
        else float(scipy_stats.beta.ppf(alpha / 2, successes, n - successes + 1))
    )
    upper = (
        1.0
        if successes == n
        else float(scipy_stats.beta.ppf(1 - alpha / 2, successes + 1, n - successes))
    )
    return {"lower": lower, "upper": upper, "level": 0.95, "method": "clopper_pearson"}


def summarize_calibration_cells(study: dict) -> list[dict]:
    """Per-cell coverage summary with the binomial 95% interval reported."""
    summaries = []
    for cell in CALIBRATION_CELLS:
        records = study["records_by_cell"].get(cell.cell_id)
        if not records:
            continue
        cell_index = CALIBRATION_CELLS.index(cell)
        n = len(records)
        covered = sum(1 for r in records if r["covers_injected_effect"])
        coverage_rate = covered / n
        first_seed = derive_replication_seed(study["base_seed"], cell_index, 0)
        last_seed = derive_replication_seed(study["base_seed"], cell_index, n - 1)
        summaries.append(
            {
                "cell_id": cell.cell_id,
                "injected_effect_size_sd": cell.injected_effect_sd,
                "cohort_size": cell.k,
                "replication_count": n,
                "covered_count": covered,
                "coverage_rate": coverage_rate,
                # Schema-exact standard error: sqrt(p * (1 - p) / n).
                "coverage_standard_error": math.sqrt(
                    coverage_rate * (1.0 - coverage_rate) / n
                ),
                "coverage_binomial_interval_95": binomial_interval_95(covered, n),
                "coverage_band": {
                    "min": INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN,
                    "max": INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX,
                },
                "pass": (
                    INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN
                    <= coverage_rate
                    <= INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
                ),
                "ci_excludes_zero_count": sum(1 for r in records if r["ci_excludes_zero"]),
                "sanity_pass_count": sum(1 for r in records if r["sanity"]["pass"]),
                "contribution_estimate_eligible_count": sum(
                    1 for r in records if r["contribution_estimate_eligible"]
                ),
                "mean_fit_wall_time_seconds": float(
                    np.mean([r["wall_time_seconds"] for r in records])
                ),
                # The exact fit settings this cell was MEASURED with (cells
                # re-measured at full-quality settings record them here).
                "fit_settings": dict(
                    study.get("cell_settings", {}).get(cell.cell_id, study["settings"])
                ),
                "seeds": {
                    "base_seed": study["base_seed"],
                    "derivation": "base_seed + (cell_index + 1) * 1_000_000 + replication_index",
                    "cell_index": cell_index,
                    "first_seed": first_seed,
                    "last_seed": last_seed,
                },
            }
        )
    return summaries


def summarize_null_false_eligibility(study: dict) -> dict:
    """Pooled null (injected effect 0) false-eligibility summary.

    A null replication counts as falsely eligible iff its cheap-fit sanity
    checks pass AND its 80% CI excludes 0 (see :func:`cheap_fit_sanity` for
    the documented analogue of artifact eligibility). The unscreened
    CI-excludes-zero rate is reported alongside for transparency.
    """
    null_records = [
        record
        for cell in CALIBRATION_CELLS
        if cell.injected_effect_sd == 0.0
        for record in study["records_by_cell"].get(cell.cell_id, [])
    ]
    n = len(null_records)
    if n == 0:
        raise ValueError("no null-effect replications in study")
    false_eligible = sum(1 for r in null_records if r["contribution_estimate_eligible"])
    excludes_zero = sum(1 for r in null_records if r["ci_excludes_zero"])
    sanity_pass = sum(1 for r in null_records if r["sanity"]["pass"])
    rate = false_eligible / n
    return {
        "null_effect_scenario_count": n,
        "false_eligible_count": false_eligible,
        "false_eligibility_rate": rate,
        "false_eligibility_binomial_interval_95": binomial_interval_95(false_eligible, n),
        "unscreened_ci_excludes_zero_count": excludes_zero,
        "unscreened_ci_excludes_zero_rate": excludes_zero / n,
        "sanity_pass_count": sanity_pass,
        "sanity_pass_rate": sanity_pass / n,
        "bound": INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
        "pass": rate <= INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
    }


def calibration_scenarios_from_summaries(cell_summaries: list[dict]) -> list[dict]:
    """Map study cell summaries to the artifact's strict calibration shape."""
    scenarios = []
    for summary in cell_summaries:
        effect = summary["injected_effect_size_sd"]
        scenarios.append(
            {
                "scenario_id": f"calibration-{summary['cell_id']}",
                # int 0 (not 0.0) so the JSON literal matches z.literal(0).
                "injected_effect_size_sd": int(effect) if effect == 0 else float(effect),
                "cohort_size": int(summary["cohort_size"]),
                "replication_count": int(summary["replication_count"]),
                "credible_interval_level": CREDIBLE_INTERVAL_LEVEL,
                "coverage_rate": float(summary["coverage_rate"]),
                "coverage_standard_error": float(summary["coverage_standard_error"]),
                "pass": bool(summary["pass"]),
            }
        )
    return scenarios


def null_checks_from_summary(null_summary: dict, *, negative_controls_pass: bool) -> dict:
    """Map the pooled null summary to the artifact's strict null_checks shape.

    ``pass`` folds in the negative-control study outcome: the artifact's
    null/negative-control input only passes when the pooled false-eligibility
    rate is within bound AND every named negative control proved fail-closed.
    """
    return {
        "null_effect_scenario_count": int(null_summary["null_effect_scenario_count"]),
        "false_eligibility_rate": float(null_summary["false_eligibility_rate"]),
        "pass": bool(null_summary["pass"] and negative_controls_pass),
    }


# --- Floor study (k=4 rejection, k=8 internal-only, k=12/16 eligible) ---------------


def control_study_inputs() -> tuple[list[dict], dict]:
    """In-band CONTROL study inputs for the STRUCTURAL study cells only.

    The floor and negative-control cells are per-gate isolation experiments
    (Phase B1's HOLD-path pattern): each must prove that exactly the gate
    under test fires, with every other gate held passing. Feeding them the
    real calibration outcome would conflate orthogonal failures — an
    out-of-band calibration cell would put ``calibration_coverage`` into
    every structural artifact's failing set and mask (or spuriously fail)
    the floor/negative-control result. So the structural cells use these
    explicitly labeled, schema-valid, in-band control inputs instead.

    This does NOT weaken the real coupling: the emitter gates every REAL
    artifact on the committed study's actual calibration and null results
    (``emit_proof_artifact`` defaults), so a failing calibration cell still
    HOLDs every emitted artifact — proven separately in the suite.
    """
    scenarios = []
    for effect in CALIBRATION_EFFECT_SIZES_SD:
        for k in CALIBRATION_COHORT_SIZES:
            n, coverage = DEFAULT_REPLICATIONS_PER_CELL, 0.8
            scenarios.append(
                {
                    "scenario_id": f"structural-control-effect-{effect:g}-k{k}",
                    "injected_effect_size_sd": int(effect) if effect == 0 else float(effect),
                    "cohort_size": k,
                    "replication_count": n,
                    "credible_interval_level": CREDIBLE_INTERVAL_LEVEL,
                    "coverage_rate": coverage,
                    "coverage_standard_error": math.sqrt(coverage * (1 - coverage) / n),
                    "pass": True,
                }
            )
    null_checks = {
        "null_effect_scenario_count": 2 * DEFAULT_REPLICATIONS_PER_CELL,
        "false_eligibility_rate": 0.0,
        "pass": True,
    }
    return scenarios, null_checks


def _emit_study_artifact(
    dataset,
    *,
    carrier_fit: FitResult,
    carrier_diagnostics,
    diagnostics_override=None,
    repeated_evaluation_detected: bool = False,
) -> dict:
    """Emit an artifact for a structural study dataset over the carrier run.

    Mirrors Phase B1's HOLD-path pattern: the carrier fit/diagnostics come
    from one full-quality clean pipeline (every gate passing) and the
    study-level inputs are the in-band :func:`control_study_inputs`, so the
    emitted governance state isolates exactly the structural property under
    test (floors, windows, comparison rubric, peeking) or the single
    overridden diagnostic (pre-trend, prior sensitivity). Floor declarations
    use the canonical schema shape; the study itself is the evidence for it.
    """
    control_scenarios, control_null_checks = control_study_inputs()
    # The production emitter correctly requires the fit and dataset to bind
    # to the same synthetic input hash. Structural isolation cells reuse the
    # carrier posterior only as a gate-passing diagnostics carrier, so rebind
    # the carrier metadata to the synthetic dataset under test instead of
    # weakening the emitter boundary.
    bound_carrier_fit = dataclasses.replace(
        carrier_fit,
        dataset=dataset,
        synthetic_input_hash=dataset.synthetic_input_hash(),
    )
    return emit_proof_artifact(
        dataset=dataset,
        fit=bound_carrier_fit,
        diagnostics=diagnostics_override
        if diagnostics_override is not None
        else carrier_diagnostics,
        calibration_scenarios=control_scenarios,
        null_checks=control_null_checks,
        floor_checks=canonical_floor_checks(),
        repeated_evaluation_detected=repeated_evaluation_detected,
    )


def run_floor_study(
    *,
    carrier_fit: FitResult,
    carrier_diagnostics,
    base_seed: int = DEFAULT_BASE_SEED,
    replications: int = DEFAULT_FLOOR_REPLICATIONS,
) -> dict:
    """Floor-enforcement study cells (reusing Phase B1's floor logic).

    Structural isolation cells over :func:`control_study_inputs`:

    - k=4: below the k >= 5 schema floor — every replication's artifact must
      HOLD naming EXACTLY ``floor_check`` (floor rejection at artifact level).
    - k=8: passes the schema floor but sits below the k >= 10 series display
      floor — every replication's artifact must be VALID internally
      (``eligible_internal_only``) while remaining display-ineligible.
    - k=12 and k=16: eligible floor cases (valid internally AND at/above the
      display floor).
    """
    def _floor_seed(block: int, replication_index: int) -> int:
        return base_seed + _FLOOR_SEED_OFFSET + block * 10_000 + replication_index

    k4_reps = []
    for index in range(replications):
        seed = _floor_seed(0, index)
        dataset = generate_did_dataset(seed=seed, k=FLOOR_REJECTION_K)
        artifact = _emit_study_artifact(
            dataset,
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
        )
        state = artifact["governance_state"]
        k4_reps.append(
            {
                "seed": seed,
                "state": state["state"],
                "failing_diagnostics": state["failing_diagnostics"],
                # Isolation cell: exactly the floor gate, nothing else.
                "rejected": state["state"] == "HOLD"
                and state["failing_diagnostics"] == ["floor_check"],
            }
        )

    k8_reps = []
    for index in range(replications):
        seed = _floor_seed(1, index)
        dataset = generate_did_dataset(seed=seed, k=INTERNAL_ONLY_PATH_K)
        artifact = _emit_study_artifact(
            dataset,
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
        )
        state = artifact["governance_state"]
        k8_reps.append(
            {
                "seed": seed,
                "state": state["state"],
                "failing_diagnostics": state["failing_diagnostics"],
                "valid_internal": state["state"] == "eligible_internal_only",
                "display_eligible": INTERNAL_ONLY_PATH_K
                >= CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
            }
        )

    eligible_cases = []
    for k in CALIBRATION_COHORT_SIZES:
        seed = _floor_seed(2, k)
        dataset = generate_did_dataset(seed=seed, k=k)
        artifact = _emit_study_artifact(
            dataset,
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
        )
        state = artifact["governance_state"]
        eligible_cases.append(
            {
                "cohort_size": k,
                "seed": seed,
                "state": state["state"],
                "failing_diagnostics": state["failing_diagnostics"],
                "valid_internal": state["state"] == "eligible_internal_only",
                "display_eligible": k >= CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
            }
        )

    k4_pass = bool(k4_reps) and all(rep["rejected"] for rep in k4_reps)
    k8_pass = bool(k8_reps) and all(
        rep["valid_internal"] and not rep["display_eligible"] for rep in k8_reps
    )
    eligible_pass = len(eligible_cases) == 2 and all(
        case["valid_internal"] and case["display_eligible"] for case in eligible_cases
    )
    return {
        "schema_floor": CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
        "series_display_floor": CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
        "k4_rejected": {
            "cohort_size": FLOOR_REJECTION_K,
            "outcome": "rejected_below_schema_floor",
            "replication_count": len(k4_reps),
            "replications": k4_reps,
            "pass": k4_pass,
        },
        "k8_internal_only": {
            "cohort_size": INTERNAL_ONLY_PATH_K,
            "outcome": "internal_only_display_ineligible",
            "replication_count": len(k8_reps),
            "replications": k8_reps,
            "pass": k8_pass,
        },
        "eligible_floor_cases": eligible_cases,
        "eligible_floor_cases_pass": eligible_pass,
        "pass": k4_pass and k8_pass and eligible_pass,
    }


# --- Negative controls ----------------------------------------------------------------


def run_negative_controls(
    *,
    carrier_fit: FitResult,
    carrier_diagnostics,
    base_seed: int = DEFAULT_BASE_SEED,
    replications: int = DEFAULT_NEGATIVE_CONTROL_REPLICATIONS,
) -> list[dict]:
    """The task-3.3 negative controls as seeded study cells, proving fail-closed.

    Structural isolation cells over :func:`control_study_inputs`: each named
    scenario runs ``replications`` seeded replications, and every replication
    must fail closed — HOLD (with evidence-tier-only where the comparison
    rubric is the failing gate) naming EXACTLY the scenario's expected
    failing diagnostics, nothing more and nothing less. Phase B1 proved
    single instances in ``tests/test_hold_paths.py``; here the same
    generators run as study cells whose outcomes feed the artifact's
    null/negative-control study input (see :func:`null_checks_from_summary`).
    """
    def _control_seed(block: int, replication_index: int) -> int:
        return base_seed + _NEGATIVE_CONTROL_SEED_OFFSET + block * 10_000 + replication_index

    results: list[dict] = []

    def _record(
        scenario: str,
        expected: list[str],
        reps: list[dict],
        *,
        expects_evidence_tier: bool = False,
    ) -> None:
        all_fail_closed = bool(reps) and all(rep["fail_closed"] for rep in reps)
        results.append(
            {
                "scenario": scenario,
                # The single gate under test (first entry) plus any
                # structurally entailed companions (e.g. suppression also
                # breaks the comparison rubric's window criterion).
                "expected_failing_diagnostic": expected[0],
                "expected_failing_diagnostics_exact": sorted(expected),
                "expects_evidence_tier_only": expects_evidence_tier,
                "replication_count": len(reps),
                "replications": reps,
                "all_fail_closed": all_fail_closed,
                "pass": all_fail_closed,
            }
        )

    def _rep_entry(
        artifact: dict,
        expected: list[str],
        seed: int,
        *,
        expects_evidence_tier: bool = False,
        extra: dict | None = None,
    ) -> dict:
        state = artifact["governance_state"]
        # Isolation cell: exactly the expected failing set, nothing else.
        fail_closed = state["state"] == "HOLD" and sorted(
            state["failing_diagnostics"]
        ) == sorted(expected)
        if expects_evidence_tier:
            fail_closed = fail_closed and state["evidence_tier_only"] is True
        entry = {
            "seed": seed,
            "state": state["state"],
            "failing_diagnostics": state["failing_diagnostics"],
            "evidence_tier_only": state["evidence_tier_only"],
            "fail_closed": bool(fail_closed),
        }
        if extra:
            entry.update(extra)
        return entry

    # 1. No credible comparison cohort => evidence-tier only, never a
    #    comparison-supported contribution estimate.
    expected = ["comparison_cohort_adequacy"]
    reps = []
    for index in range(replications):
        seed = _control_seed(0, index)
        artifact = _emit_study_artifact(
            generate_no_comparison_cohort(seed=seed, k=12),
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
        )
        reps.append(_rep_entry(artifact, expected, seed, expects_evidence_tier=True))
    _record("no_credible_comparison_cohort", expected, reps, expects_evidence_tier=True)

    # 2. Violated pre-trend: the pre-window pseudo-effect check must exclude 0
    #    (real per-replication pseudo fit) and the artifact must HOLD.
    expected = ["pre_trend"]
    reps = []
    for index in range(replications):
        seed = _control_seed(1, index)
        dataset = generate_violated_pre_trend(seed=seed, k=12)
        pre_trend = run_pre_trend_check(dataset, draws=300, tune=300, seed=seed)
        diagnostics = dataclasses.replace(carrier_diagnostics, pre_trend=pre_trend)
        artifact = _emit_study_artifact(
            dataset,
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
            diagnostics_override=diagnostics,
        )
        reps.append(
            _rep_entry(
                artifact, expected, seed,
                extra={
                    "pseudo_effect_ci80": [pre_trend.ci80_lower, pre_trend.ci80_upper],
                    "includes_zero": pre_trend.includes_zero,
                },
            )
        )
    _record("violated_pre_trend", expected, reps)

    # 3. Badly mismatched comparison cohort => rubric fails, evidence-tier only.
    expected = ["comparison_cohort_adequacy"]
    reps = []
    for index in range(replications):
        seed = _control_seed(2, index)
        artifact = _emit_study_artifact(
            generate_mismatched_comparison(seed=seed, k=12),
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
        )
        reps.append(_rep_entry(artifact, expected, seed, expects_evidence_tier=True))
    _record("badly_mismatched_comparison_cohort", expected, reps, expects_evidence_tier=True)

    # 4. Prior-dominated weak data: real per-replication fit + prior
    #    sensitivity sweep; the posterior-mean shift breaches 0.5 SD => HOLD.
    expected = ["prior_sensitivity"]
    reps = []
    for index in range(replications):
        seed = _control_seed(3, index)
        dataset = generate_prior_dominated_weak(
            seed=seed, injected_effect_sd=PRIOR_DOMINATED_CONTROL_EFFECT_SD
        )
        fit = fit_did_model(
            dataset, draws=400, tune=400, seed=seed,
            sample_posterior_predictive=False,
        )
        sensitivity = run_prior_sensitivity(fit, draws=300, tune=300)
        diagnostics = dataclasses.replace(carrier_diagnostics, prior_sensitivity=sensitivity)
        artifact = _emit_study_artifact(
            dataset,
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
            diagnostics_override=diagnostics,
        )
        reps.append(
            _rep_entry(
                artifact, expected, seed,
                extra={
                    "posterior_mean_shift_in_posterior_sd": (
                        sensitivity.posterior_mean_shift_in_posterior_sd
                    ),
                },
            )
        )
    _record("prior_dominated_weak_data", expected, reps)

    # 5. Missing required milestone windows => HOLD, no imputation rescue.
    expected = ["missing_or_suppressed_windows"]
    reps = []
    for index in range(replications):
        seed = _control_seed(4, index)
        artifact = _emit_study_artifact(
            generate_missing_windows(seed=seed, k=12),
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
        )
        reps.append(_rep_entry(artifact, expected, seed))
    _record("missing_windows", expected, reps)

    # 5b. Suppressed milestone windows => HOLD, no imputation rescue.
    #     Suppression also breaks the comparison rubric's
    #     no_suppressed_or_stale_windows criterion (structurally entailed).
    expected = ["missing_or_suppressed_windows", "comparison_cohort_adequacy"]
    reps = []
    for index in range(replications):
        seed = _control_seed(5, index)
        artifact = _emit_study_artifact(
            generate_suppressed_windows(seed=seed, k=12),
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
        )
        reps.append(_rep_entry(artifact, expected, seed))
    _record("suppressed_windows", expected, reps)

    # 6. Naive repeated milestone peeking => fixed-horizon control HOLDs.
    expected = ["peeking_control"]
    reps = []
    for index in range(replications):
        seed = _control_seed(6, index)
        artifact = _emit_study_artifact(
            generate_did_dataset(seed=seed, k=12),
            carrier_fit=carrier_fit,
            carrier_diagnostics=carrier_diagnostics,
            repeated_evaluation_detected=True,
        )
        reps.append(_rep_entry(artifact, expected, seed))
    _record("naive_repeated_milestone_peeking", expected, reps)

    return results


# --- Full study orchestration + committed results file -------------------------------


def build_study_results(
    *,
    study: dict,
    carrier_fit: FitResult,
    carrier_diagnostics,
    floor_replications: int = DEFAULT_FLOOR_REPLICATIONS,
    negative_control_replications: int = DEFAULT_NEGATIVE_CONTROL_REPLICATIONS,
    generated_at: str | None = None,
    notes: list[str] | None = None,
) -> dict:
    """Summarize a finished calibration study and run the floor/negative cells.

    Returns the full committed-results document, including the strict
    ``artifact_inputs`` section the emitter consumes. ``notes`` carries
    study-level methodology notes (e.g. the coverage-instrument finding);
    cells measured with non-default fit settings are noted automatically.
    """
    cell_summaries = summarize_calibration_cells(study)
    null_summary = summarize_null_false_eligibility(study)
    scenarios = calibration_scenarios_from_summaries(cell_summaries)
    # Floor and negative-control cells are per-gate isolation experiments
    # over control_study_inputs() — see that docstring; feeding them the
    # real calibration outcome would conflate orthogonal failures.
    floor_study = run_floor_study(
        carrier_fit=carrier_fit,
        carrier_diagnostics=carrier_diagnostics,
        base_seed=study["base_seed"],
        replications=floor_replications,
    )
    negative_controls = run_negative_controls(
        carrier_fit=carrier_fit,
        carrier_diagnostics=carrier_diagnostics,
        base_seed=study["base_seed"],
        replications=negative_control_replications,
    )
    negative_controls_pass = all(control["pass"] for control in negative_controls)
    final_null_checks = null_checks_from_summary(
        null_summary, negative_controls_pass=negative_controls_pass
    )
    notes = list(notes or [])
    for cell in cell_summaries:
        if cell["fit_settings"] != study["settings"]:
            notes.append(
                f"{cell['cell_id']} was measured with non-default fit settings "
                f"{cell['fit_settings']} (see the coverage-instrument note); "
                "its checkpoint namespace is keyed by those settings."
            )
    return {
        "notes": notes,
        "study_id": STUDY_ID,
        "generated_at": generated_at
        if generated_at is not None
        else datetime.now(timezone.utc).isoformat(),
        "harness_version": HARNESS_VERSION,
        "base_seed": study["base_seed"],
        "settings": {
            **study["settings"],
            "credible_interval_level": CREDIBLE_INTERVAL_LEVEL,
            "replications_per_cell": study["replications_per_cell"],
            "floor_replications": floor_replications,
            "negative_control_replications": negative_control_replications,
        },
        "workers": study["workers"],
        "calibration": {
            "cells": cell_summaries,
            "all_cells_pass": all(cell["pass"] for cell in cell_summaries),
        },
        "null_false_eligibility": null_summary,
        "floor_study": floor_study,
        "negative_controls": negative_controls,
        "negative_controls_pass": negative_controls_pass,
        "artifact_inputs": {
            "calibration_scenarios": scenarios,
            "null_checks": final_null_checks,
            "floor_checks": canonical_floor_checks()
            if floor_study["pass"]
            else {"unproven": True, "floor_study_pass": False},
        },
        "total_wall_time_seconds": float(study["wall_time_seconds"]),
    }


def write_study_results(results: dict, path: Path | str = DEFAULT_STUDY_RESULTS_PATH) -> Path:
    path = Path(path)
    path.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path


def _run_carrier_pipeline(log) -> tuple[FitResult, object]:
    """One full-quality clean pipeline (every gate passing) as the shared
    carrier for the floor/negative-control emissions (Phase B1 pattern)."""
    log("carrier: full-quality clean fit + diagnostics (k=16, 0.5 SD)...")
    dataset = generate_did_dataset(
        seed=DEFAULT_BASE_SEED, k=16, injected_effect_sd=0.5
    )
    fit = fit_did_model(dataset, seed=DEFAULT_BASE_SEED)
    diagnostics = compute_diagnostics(fit)
    return fit, diagnostics


def main(argv: list[str] | None = None) -> int:  # pragma: no cover - CLI
    parser = argparse.ArgumentParser(
        description="Run the synthetic calibration study (task 3.3)."
    )
    parser.add_argument("--smoke", action="store_true", help="25 replications per cell")
    parser.add_argument("--replications", type=int, default=None)
    parser.add_argument("--workers", type=int, default=None)
    parser.add_argument("--base-seed", type=int, default=DEFAULT_BASE_SEED)
    parser.add_argument("--output", type=Path, default=DEFAULT_STUDY_RESULTS_PATH)
    parser.add_argument(
        "--calibration-only",
        action="store_true",
        help="run/resume the calibration cells only (no summary file written)",
    )
    parser.add_argument(
        "--checkpoint-summary-only",
        action="store_true",
        help="summarize checkpoint progress and exit without launching sampler workers",
    )
    parser.add_argument(
        "--full-quality-cell",
        action="append",
        default=[],
        metavar="CELL_ID",
        help="measure this cell with FULL_QUALITY_FIT_SETTINGS instead of the "
        "cheap calibration settings (repeatable; use when the cheap "
        "instrument is shown to be biased for a cell)",
    )
    parser.add_argument(
        "--note",
        action="append",
        default=[],
        help="methodology note to record in the results file (repeatable)",
    )
    args = parser.parse_args(argv)

    def log(message: str) -> None:
        print(f"[calibration] {message}", flush=True)

    known_cell_ids = {cell.cell_id for cell in CALIBRATION_CELLS}
    unknown = set(args.full_quality_cell) - known_cell_ids
    if unknown:
        parser.error(f"unknown cell id(s): {sorted(unknown)}")

    cell_fit_settings = {
        cell_id: dict(FULL_QUALITY_FIT_SETTINGS) for cell_id in args.full_quality_cell
    }
    if args.checkpoint_summary_only:
        progress = summarize_checkpoint_progress(
            base_seed=args.base_seed,
            replications_per_cell=args.replications,
            smoke=args.smoke,
            cell_fit_settings=cell_fit_settings,
        )
        print(json.dumps(progress, indent=2, sort_keys=True))
        return 0

    started = time.perf_counter()
    study = run_calibration_study(
        base_seed=args.base_seed,
        replications_per_cell=args.replications,
        smoke=args.smoke,
        workers=args.workers,
        cell_fit_settings=cell_fit_settings,
        log=log,
    )
    log(
        f"calibration cells done: executed={study['executed']} "
        f"skipped(resumed)={study['skipped']} wall={study['wall_time_seconds']:.0f}s"
    )
    if args.calibration_only:
        return 0

    carrier_fit, carrier_diagnostics = _run_carrier_pipeline(log)
    results = build_study_results(
        study=study,
        carrier_fit=carrier_fit,
        carrier_diagnostics=carrier_diagnostics,
        notes=args.note,
    )
    results["total_wall_time_seconds"] = float(time.perf_counter() - started)
    path = write_study_results(results, args.output)
    log(f"wrote {path}")
    for cell in results["calibration"]["cells"]:
        interval = cell["coverage_binomial_interval_95"]
        log(
            f"  {cell['cell_id']}: coverage={cell['coverage_rate']:.3f} "
            f"95% CI [{interval['lower']:.3f}, {interval['upper']:.3f}] "
            f"n={cell['replication_count']} pass={cell['pass']}"
        )
    null_summary = results["null_false_eligibility"]
    log(
        f"  null false-eligibility: {null_summary['false_eligibility_rate']:.4f} "
        f"(n={null_summary['null_effect_scenario_count']}, "
        f"unscreened excludes-zero rate "
        f"{null_summary['unscreened_ci_excludes_zero_rate']:.3f}) "
        f"pass={null_summary['pass']}"
    )
    log(f"  floor study pass={results['floor_study']['pass']}")
    log(f"  negative controls pass={results['negative_controls_pass']}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
