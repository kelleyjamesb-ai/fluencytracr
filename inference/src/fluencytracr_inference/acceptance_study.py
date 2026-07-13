"""Internal acceptance-study sidecar for task 3.3.

This module keeps the current gap explicit: the existing
``synthetic_study`` runner is an aggregate approximation, while task 3.3
ultimately needs sampler-level, artifact-level replicated evidence. The
helpers here record that method distinction and can run small synthetic null
smoke replications through ``artifact.run_proof`` with reduced sampler
settings.

The sidecar is inference-only metadata. It does not extend the artifact
schema, does not produce customer output, and refuses to produce artifact
inputs unless a future method is both full and explicitly approved.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
import math
import re
from statistics import NormalDist
from typing import Callable

from .constants import (
    CONFIDENCE_MODEL_BLOCKED_USES,
    INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
    INFERENCE_PROOF_ESS_MIN,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN,
    INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA,
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
    INFERENCE_PROOF_FAILING_DIAGNOSTICS,
    INFERENCE_PROOF_FLOAT_TOLERANCE,
    INFERENCE_PROOF_LIKELIHOOD_FAMILIES,
    INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MIN,
    INFERENCE_PROOF_PPC_STATISTIC_NAMES,
    INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD,
    INFERENCE_PROOF_NULL_REPLICATIONS_MIN,
    INFERENCE_PROOF_RHAT_MAX,
    LIKELIHOOD_FAMILY_LINKS,
    SUPPORTED_LIKELIHOOD_FAMILY,
)
from .hashing import inference_proof_artifact_self_hash, sha256_json
from .synthetic import generate_did_dataset
from .synthetic_study import (
    CALIBRATION_COHORT_SIZES,
    CALIBRATION_EFFECT_SIZES,
    CREDIBLE_INTERVAL_LEVEL,
    SyntheticStudyInputs,
    SyntheticStudyResult,
    run_synthetic_study_inputs,
)

ACCEPTANCE_METHOD_AGGREGATE_APPROXIMATION = "aggregate_approximation"
ACCEPTANCE_METHOD_SAMPLER_ARTIFACT = "sampler_artifact"
ACCEPTANCE_MODE_SMOKE = "smoke"
ACCEPTANCE_MODE_FULL = "full"

# No current method is approved to emit acceptance-study artifact inputs.
# A future full sampler-artifact study can change this constant in the same PR
# that proves >=200 sampler-level replications per required cell.
APPROVED_ARTIFACT_INPUT_METHODS: frozenset[str] = frozenset()

DEFAULT_SAMPLER_SMOKE_BASE_SEED = 202607230
DEFAULT_SAMPLER_SMOKE_REPLICATIONS = 1
DEFAULT_ACCEPTANCE_PLAN_CHUNK_SIZE = 10
_NULL_FALSE_ELIGIBILITY_Z = NormalDist().inv_cdf(
    1.0 - INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX / 2.0
)
_CALIBRATION_PARTITIONABLE_DIAGNOSTIC_HOLDS = frozenset({"pre_trend"})

_REQUIRED_ARTIFACT_TOP_LEVEL_KEYS = frozenset(
    {
        "schema_version",
        "artifact_class",
        "generated_at",
        "harness_version",
        "lockfile_hash",
        "synthetic_generator",
        "model_spec_binding",
        "measurement_cell_window_evidence",
        "diagnostics",
        "calibration",
        "null_checks",
        "floor_checks",
        "peeking_control",
        "comparison_adequacy",
        "governance_state",
        "hash_bindings",
        "blocked_uses",
        "numeric_values_role",
        "numeric_posterior_values_customer_authorized",
        "internal_only",
        "customer_output_authorized",
        "probability_output_authorized",
        "confidence_output_authorized",
        "finance_output_authorized",
        "creates_route",
        "creates_ui",
        "writes_persistence",
        "creates_export",
        "renders_readout",
        "executes_connector",
        "promotion_decision_ref",
    }
)
_RUNNER_GENERATION_TOKEN = object()


@dataclass(frozen=True)
class AcceptanceCell:
    """One required sampler-artifact acceptance cell."""

    effect_size: float
    cohort_size: int

    def to_report_section(self) -> dict:
        return {
            "injected_effect_size_sd": self.effect_size,
            "cohort_size": self.cohort_size,
        }


def required_acceptance_cells() -> tuple[AcceptanceCell, ...]:
    """Every task-3.3 calibration cell required for sampler-artifact proof."""

    return tuple(
        AcceptanceCell(effect_size=effect_size, cohort_size=cohort_size)
        for effect_size in CALIBRATION_EFFECT_SIZES
        for cohort_size in CALIBRATION_COHORT_SIZES
    )


def plan_sampler_artifact_full_acceptance_run(
    *,
    base_seed: int = DEFAULT_SAMPLER_SMOKE_BASE_SEED,
    replications_per_cell: int = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    chunk_size: int = DEFAULT_ACCEPTANCE_PLAN_CHUNK_SIZE,
) -> dict:
    """Return a deterministic stdout-only plan for the full artifact study.

    The plan is pure data: it writes nothing, persists nothing, and contains
    only synthetic cell/replication/seed metadata. Chunks align with the
    existing CLI shape, where one chunk runs the same replication-index range
    across every required task-3.3 cell.
    """

    base_seed = _strict_int(base_seed)
    replications_per_cell = _strict_int(replications_per_cell)
    chunk_size = _strict_int(chunk_size)
    if replications_per_cell < INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN:
        raise ValueError(
            "full acceptance plan requires at least "
            f"{INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN} replications per cell"
        )
    if chunk_size <= 0:
        raise ValueError("acceptance plan chunk_size must be positive")

    cells = required_acceptance_cells()
    expected_keys = _expected_acceptance_plan_keys(
        base_seed=base_seed,
        replications_per_cell=replications_per_cell,
    )
    chunks = []
    for replication_start in range(0, replications_per_cell, chunk_size):
        replication_count = min(
            chunk_size, replications_per_cell - replication_start
        )
        chunk_keys = tuple(
            key
            for key in expected_keys
            if replication_start <= key[2] < replication_start + replication_count
        )
        chunk_body = {
            "chunk_id": (
                f"sampler-full-seed-{base_seed}-"
                f"start-{replication_start}-n{replication_count}"
            ),
            "replication_start": replication_start,
            "replication_count": replication_count,
            "replication_count_per_cell": replication_count,
            "replication_index_start_inclusive": replication_start,
            "replication_index_end_exclusive": replication_start + replication_count,
            "expected_artifact_count": len(cells) * replication_count,
            "expected_replication_slot_hash": _acceptance_plan_key_hash(
                chunk_keys
            ),
            "cli_args": [
                "--acceptance-full",
                "--base-seed",
                str(base_seed),
                "--replication-start",
                str(replication_start),
                "--replication-count",
                str(replication_count),
            ],
            "cells": [
                {
                    **cell.to_report_section(),
                    "start_seed": _sampler_acceptance_seed(
                        base_seed=base_seed,
                        effect_size=cell.effect_size,
                        cohort_size=cell.cohort_size,
                        replication_index=replication_start,
                    ),
                    "end_seed": _sampler_acceptance_seed(
                        base_seed=base_seed,
                        effect_size=cell.effect_size,
                        cohort_size=cell.cohort_size,
                        replication_index=replication_start
                        + replication_count
                        - 1,
                    ),
                }
                for cell in cells
            ],
        }
        chunk_body["chunk_hash"] = sha256_json(chunk_body)
        chunks.append(chunk_body)

    body = {
        "report_class": "internal_synthetic_acceptance_execution_plan",
        "plan_class": "internal_synthetic_sampler_artifact_full_acceptance_plan",
        "method": ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
        "mode": ACCEPTANCE_MODE_FULL,
        "base_seed": base_seed,
        "required_cells": [cell.to_report_section() for cell in cells],
        "required_replications_per_cell": (
            INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        ),
        "required_total_replications": (
            len(cells) * INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        ),
        "minimum_required_replications_per_cell": (
            INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        ),
        "replications_per_cell": replications_per_cell,
        "chunk_size": chunk_size,
        "chunk_replication_count": chunk_size,
        "chunk_count": len(chunks),
        "expected_total_artifacts": len(expected_keys),
        "expected_replication_key_hash": _acceptance_plan_key_hash(expected_keys),
        "sampler_settings": SamplerFullSettings().as_run_proof_kwargs(),
        "plan_only": True,
        "artifact_level_evidence": False,
        "internal_only": True,
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "finance_output_authorized": False,
        "stdout_only": True,
        "writes_persistence": False,
        "creates_export": False,
        "artifact_inputs_authorized": False,
        "open_spec_3_3_completion_authorized": False,
        "blocked_outputs": _blocked_outputs(),
        "chunks": chunks,
    }
    body["plan_hash"] = sha256_json(body)
    return body


def sampler_artifact_acceptance_plan_coverage(
    result: "AcceptanceStudyResult",
    *,
    plan: dict | None = None,
) -> dict:
    """Measure observed sampler-artifact rows against a deterministic plan."""

    active_plan = (
        plan
        if plan is not None
        else _default_full_acceptance_plan_for_result(result)
    )
    canonical_plan = _canonicalize_acceptance_plan(active_plan)
    expected_keys = set(
        _expected_acceptance_plan_keys(
            base_seed=canonical_plan["base_seed"],
            replications_per_cell=canonical_plan["replications_per_cell"],
        )
    )
    observed_keys: list[tuple[float, int, int, int]] = []
    malformed_count = 0
    for replication in result.replications:
        key = _observed_acceptance_plan_key(
            replication,
            base_seed=canonical_plan["base_seed"],
        )
        if key is None:
            malformed_count += 1
        else:
            observed_keys.append(key)

    seen: set[tuple[float, int, int, int]] = set()
    duplicate_count = 0
    for key in observed_keys:
        if key in seen:
            duplicate_count += 1
        seen.add(key)

    observed_key_set = set(observed_keys)
    missing = expected_keys - observed_key_set
    unexpected = observed_key_set - expected_keys
    per_cell = []
    for cell in required_acceptance_cells():
        cell_expected = {
            key for key in expected_keys
            if key[0] == cell.effect_size and key[1] == cell.cohort_size
        }
        cell_observed = {
            key for key in observed_key_set
            if key[0] == cell.effect_size and key[1] == cell.cohort_size
        }
        cell_missing = cell_expected - cell_observed
        cell_unexpected = cell_observed - cell_expected
        observed_indexes = sorted(key[2] for key in cell_observed)
        per_cell.append(
            {
                **cell.to_report_section(),
                "expected_replication_count": len(cell_expected),
                "observed_replication_count": len(cell_observed),
                "missing_replication_count": len(cell_missing),
                "unexpected_replication_count": len(cell_unexpected),
                "observed_replication_index_min": (
                    observed_indexes[0] if observed_indexes else None
                ),
                "observed_replication_index_max": (
                    observed_indexes[-1] if observed_indexes else None
                ),
                "complete": bool(
                    len(cell_missing) == 0 and len(cell_unexpected) == 0
                ),
            }
        )

    complete = bool(
        result.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
        and result.mode == ACCEPTANCE_MODE_FULL
        and result.base_seed == canonical_plan["base_seed"]
        and result.required_cells == required_acceptance_cells()
        and result.sampler_settings == SamplerFullSettings()
        and malformed_count == 0
        and duplicate_count == 0
        and len(missing) == 0
        and len(unexpected) == 0
        and len(observed_keys) == len(expected_keys)
    )
    return {
        "plan_hash": canonical_plan["plan_hash"],
        "base_seed": canonical_plan["base_seed"],
        "planned_replications_per_cell": canonical_plan[
            "replications_per_cell"
        ],
        "planned_total_artifacts": len(expected_keys),
        "observed_total_artifacts": len(observed_keys),
        "missing_replication_count": len(missing),
        "unexpected_replication_count": len(unexpected) + malformed_count,
        "duplicate_replication_count": duplicate_count,
        "malformed_replication_count": malformed_count,
        "expected_replication_key_hash": canonical_plan[
            "expected_replication_key_hash"
        ],
        "observed_replication_key_hash": _acceptance_plan_key_hash(
            tuple(sorted(observed_key_set))
        ),
        "per_cell": per_cell,
        "complete": complete,
    }


def validate_sampler_artifact_acceptance_plan(
    result: "AcceptanceStudyResult",
    *,
    plan: dict | None = None,
) -> dict:
    """Return plan coverage, raising unless the full deterministic grid matches."""

    coverage = sampler_artifact_acceptance_plan_coverage(result, plan=plan)
    if coverage["complete"] is not True:
        raise ValueError("sampler-artifact acceptance result does not match the plan")
    return coverage


def _full_acceptance_plan_grid_exact(result: "AcceptanceStudyResult") -> bool:
    try:
        return sampler_artifact_acceptance_plan_coverage(result)["complete"] is True
    except ValueError:
        return False


def _runner_generation_proof_hash(
    *,
    method: str,
    mode: str,
    base_seed: int | None,
    required_cells: tuple[AcceptanceCell, ...],
    replications: tuple[AcceptanceReplication, ...],
    sampler_settings: SamplerSmokeSettings | SamplerFullSettings | None,
) -> str:
    return sha256_json(
        {
            "proof_class": "internal_sampler_acceptance_runner_generation",
            "method": method,
            "mode": mode,
            "base_seed": base_seed,
            "required_cells": [
                cell.to_report_section() for cell in required_cells
            ],
            "sampler_settings": (
                sampler_settings.as_run_proof_kwargs()
                if sampler_settings is not None
                else None
            ),
            "replication_count": len(replications),
            "replications": [
                replication.to_report_section()
                for replication in sorted(
                    replications,
                    key=lambda replication: _replication_sort_key(
                        replication,
                        base_seed=base_seed,
                    ),
                )
            ],
        }
    )


def _runner_generation_proof_valid(result: "AcceptanceStudyResult") -> bool:
    if result.runner_generated is not True or result.source_report_rehydrated:
        return False
    if result.runner_generation_token is not _RUNNER_GENERATION_TOKEN:
        return False
    if not _sha256_hex(result.runner_generation_proof_hash):
        return False
    return result.runner_generation_proof_hash == _runner_generation_proof_hash(
        method=result.method,
        mode=result.mode,
        base_seed=result.base_seed,
        required_cells=result.required_cells,
        replications=result.replications,
        sampler_settings=result.sampler_settings,
    )


@dataclass(frozen=True)
class SamplerSmokeSettings:
    """Reduced sampler settings for local sampler-artifact smoke checks."""

    draws: int = 120
    tune: int = 120
    chains: int = 2
    target_accept: float = 0.95
    max_treedepth: int = 10
    prior_sensitivity_draws: int = 60
    prior_sensitivity_tune: int = 60
    pre_trend_draws: int = 60
    pre_trend_tune: int = 60

    def as_run_proof_kwargs(self) -> dict:
        return {
            "draws": self.draws,
            "tune": self.tune,
            "chains": self.chains,
            "target_accept": self.target_accept,
            "max_treedepth": self.max_treedepth,
            "prior_sensitivity_draws": self.prior_sensitivity_draws,
            "prior_sensitivity_tune": self.prior_sensitivity_tune,
            "pre_trend_draws": self.pre_trend_draws,
            "pre_trend_tune": self.pre_trend_tune,
        }


@dataclass(frozen=True)
class SamplerFullSettings:
    """Default full sampler settings used by ``artifact.run_proof``."""

    draws: int = 2000
    tune: int = 5000
    chains: int = 2
    target_accept: float = 0.999
    max_treedepth: int = 15
    prior_sensitivity_draws: int = 300
    prior_sensitivity_tune: int = 400
    pre_trend_draws: int = 400
    pre_trend_tune: int = 400

    def as_run_proof_kwargs(self) -> dict:
        return {
            "draws": self.draws,
            "tune": self.tune,
            "chains": self.chains,
            "target_accept": self.target_accept,
            "max_treedepth": self.max_treedepth,
            "prior_sensitivity_draws": self.prior_sensitivity_draws,
            "prior_sensitivity_tune": self.prior_sensitivity_tune,
            "pre_trend_draws": self.pre_trend_draws,
            "pre_trend_tune": self.pre_trend_tune,
        }


@dataclass(frozen=True)
class AcceptanceReplication:
    replication_id: str
    seed: int
    effect_size: float
    cohort_size: int
    artifact_valid: bool
    governance_state: str
    failing_diagnostics: tuple[str, ...]
    contribution_estimate_eligible: bool
    posterior_null_guard_evaluable: bool
    posterior_null_guard_excludes_zero: bool
    artifact_self_hash: str | None
    artifact_bound_to_expected_input: bool
    ci80_lower: float | None = None
    ci80_upper: float | None = None
    covered_injected_effect: bool | None = None
    runner_error_type: str | None = None

    def to_report_section(self) -> dict:
        return {
            "replication_id": self.replication_id,
            "seed": self.seed,
            "effect_size": self.effect_size,
            "cohort_size": self.cohort_size,
            "artifact_valid": self.artifact_valid,
            "governance_state": self.governance_state,
            "failing_diagnostics": list(self.failing_diagnostics),
            "acceptance_usable_artifact": self.acceptance_usable_artifact,
            "contribution_estimate_eligible": self.contribution_estimate_eligible,
            "posterior_null_guard_evaluable": self.posterior_null_guard_evaluable,
            "posterior_null_guard_excludes_zero": (
                self.posterior_null_guard_excludes_zero
            ),
            "artifact_self_hash": self.artifact_self_hash,
            "artifact_bound_to_expected_input": self.artifact_bound_to_expected_input,
            "covered_injected_effect": self.covered_injected_effect,
            "runner_error_type": self.runner_error_type,
        }

    @property
    def acceptance_usable_artifact(self) -> bool:
        return bool(
            self.artifact_valid
            and self.artifact_bound_to_expected_input
            and self.governance_state == "eligible_internal_only"
            and self.failing_diagnostics == ()
        )


@dataclass(frozen=True)
class AcceptanceStudyResult:
    method: str
    mode: str
    study_id: str
    base_seed: int | None
    replication_count: int
    replication_count_per_cell: int | None = None
    required_cells: tuple[AcceptanceCell, ...] = ()
    replications: tuple[AcceptanceReplication, ...] = ()
    aggregate_source_summary: dict | None = None
    sampler_settings: SamplerSmokeSettings | SamplerFullSettings | None = None
    runner_generated: bool = False
    runner_generation_proof_hash: str | None = None
    source_report_rehydrated: bool = False
    source_report_hashes: tuple[str, ...] = ()
    source_report_runner_generation_proof_hashes: tuple[str, ...] = ()
    source_report_rehydration_token: object | None = field(
        default=None,
        compare=False,
        repr=False,
    )
    runner_generation_token: object | None = field(
        default=None,
        compare=False,
        repr=False,
    )

    @property
    def full_replication_requirement_met(self) -> bool:
        if self.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT and self.required_cells:
            return all(
                _cell_replication_count(self.replications, cell)
                >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
                for cell in self.required_cells
            )
        count = (
            self.replication_count_per_cell
            if self.replication_count_per_cell is not None
            else self.replication_count
        )
        return count >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN

    @property
    def required_acceptance_cell_set_complete(self) -> bool:
        if self.method != ACCEPTANCE_METHOD_SAMPLER_ARTIFACT:
            return False
        return self.required_cells == required_acceptance_cells()

    @property
    def sampler_artifact_acceptance_passed(self) -> bool:
        return self._acceptance_evidence_passes()

    @property
    def sampler_artifact_resumable_evidence_observed(self) -> bool:
        return self._resumable_evidence_observed()

    @property
    def task_3_3_acceptance_state(self) -> str:
        if self.method == ACCEPTANCE_METHOD_AGGREGATE_APPROXIMATION:
            return "aggregate_approximation_not_authorized"
        if self.method != ACCEPTANCE_METHOD_SAMPLER_ARTIFACT:
            return "unknown_not_authorized"
        if self.mode == ACCEPTANCE_MODE_SMOKE:
            return "sampler_smoke_not_authorized"
        if not self.required_acceptance_cell_set_complete:
            return "sampler_full_incomplete_cell_grid_not_authorized"
        if not self.full_replication_requirement_met:
            return "sampler_full_incomplete_replications_not_authorized"
        if self.source_report_rehydrated:
            if self.sampler_artifact_resumable_evidence_observed:
                return "sampler_full_rehydrated_evidence_observed_not_authorized"
            return "sampler_full_rehydrated_report_not_authorized"
        if self.sampler_artifact_acceptance_passed:
            return "sampler_full_generated_not_authorized"
        return "sampler_full_failed_not_authorized"

    @property
    def artifact_inputs_authorized(self) -> bool:
        return (
            self.method in APPROVED_ARTIFACT_INPUT_METHODS
            and self.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
            and self.mode == ACCEPTANCE_MODE_FULL
            and self.full_replication_requirement_met
            and self.sampler_artifact_acceptance_passed
        )

    @property
    def open_spec_3_3_completion_authorized(self) -> bool:
        return False

    def artifact_level_null_eligibility(self) -> dict | None:
        if self.method != ACCEPTANCE_METHOD_SAMPLER_ARTIFACT:
            return None
        null_replications = [
            replication for replication in self.replications if replication.effect_size == 0.0
        ]
        if not null_replications:
            return None
        null_cells = [
            cell for cell in _report_cells(self.required_cells, self.replications)
            if cell.effect_size == 0.0
        ]
        per_cell = []
        for cell in null_cells:
            cell_replications = _cell_replications(self.replications, cell)
            cell_false_eligible = sum(
                1
                for replication in cell_replications
                if replication.contribution_estimate_eligible
            )
            cell_invalid = sum(
                1
                for replication in cell_replications
                if not _replication_valid_and_bound(replication)
            )
            cell_hard_failure_reason_counts = _hard_failure_reason_counts(
                cell_replications
            )
            cell_hard_failure_count = sum(cell_hard_failure_reason_counts.values())
            cell_unusable = sum(
                1
                for replication in cell_replications
                if not replication.acceptance_usable_artifact
            )
            cell_diagnostic_hold_counts = _diagnostic_hold_reason_counts(
                cell_replications
            )
            cell_diagnostic_hold_count = sum(cell_diagnostic_hold_counts.values())
            cell_authorized = sum(
                1
                for replication in cell_replications
                if replication.contribution_estimate_eligible
            )
            cell_unevaluable = sum(
                1
                for replication in cell_replications
                if not replication.posterior_null_guard_evaluable
            )
            cell_posterior_excluding_zero = sum(
                1
                for replication in cell_replications
                if replication.posterior_null_guard_excludes_zero
            )
            cell_count = len(cell_replications)
            cell_valid = cell_count - cell_invalid
            cell_false_rate_denominator = cell_valid
            per_cell.append(
                {
                    "injected_effect_size_sd": cell.effect_size,
                    "cohort_size": cell.cohort_size,
                    "replication_count": cell_count,
                    "valid_artifact_count": cell_valid,
                    "invalid_artifact_count": cell_invalid,
                    "hard_failure_count": cell_hard_failure_count,
                    "hard_failure_reason_counts": cell_hard_failure_reason_counts,
                    "acceptance_usable_artifact_count": cell_count - cell_unusable,
                    "acceptance_unusable_artifact_count": cell_unusable,
                    "diagnostic_hold_artifact_count": cell_diagnostic_hold_count,
                    "diagnostic_hold_failing_diagnostic_counts": (
                        cell_diagnostic_hold_counts
                    ),
                    "posterior_null_guard_evaluable_count": (
                        cell_count - cell_unevaluable
                    ),
                    "posterior_null_guard_unevaluable_count": cell_unevaluable,
                    "posterior_null_guard_excluding_zero_count": (
                        cell_posterior_excluding_zero
                    ),
                    "posterior_null_guard_excluding_zero_rate": (
                        cell_posterior_excluding_zero / cell_count
                        if cell_count
                        else 1.0
                    ),
                    "false_eligible_count": cell_false_eligible,
                    "false_eligibility_rate": (
                        cell_false_eligible / cell_false_rate_denominator
                        if cell_false_rate_denominator
                        else 1.0
                    ),
                }
            )
        false_eligible = sum(
            1
            for replication in null_replications
            if replication.contribution_estimate_eligible
        )
        invalid = sum(
            1
            for replication in null_replications
            if not _replication_valid_and_bound(replication)
        )
        hard_failure_reason_counts = _hard_failure_reason_counts(null_replications)
        hard_failure_count = sum(hard_failure_reason_counts.values())
        unusable = sum(
            1
            for replication in null_replications
            if not replication.acceptance_usable_artifact
        )
        diagnostic_hold_counts = _diagnostic_hold_reason_counts(null_replications)
        diagnostic_hold_count = sum(diagnostic_hold_counts.values())
        unevaluable = sum(
            1
            for replication in null_replications
            if not replication.posterior_null_guard_evaluable
        )
        posterior_excluding_zero = sum(
            1
            for replication in null_replications
            if replication.posterior_null_guard_excludes_zero
        )
        null_count = len(null_replications)
        valid_null_count = null_count - invalid
        rate = max(
            (cell["false_eligibility_rate"] for cell in per_cell),
            default=false_eligible / valid_null_count if valid_null_count else 1.0,
        )
        full_null_gate_observed = bool(
            self.full_replication_requirement_met
            and null_count > 0
            and invalid == 0
            and hard_failure_count == 0
            and unevaluable == 0
            and rate <= INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
        )
        smoke_null_gate_observed = bool(
            null_count > 0
            and invalid == 0
            and hard_failure_count == 0
            and unevaluable == 0
            and rate <= INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
        )
        return {
            "replication_count": null_count,
            "valid_artifact_count": valid_null_count,
            "invalid_artifact_count": invalid,
            "hard_failure_count": hard_failure_count,
            "hard_failure_reason_counts": hard_failure_reason_counts,
            "acceptance_usable_artifact_count": null_count - unusable,
            "acceptance_unusable_artifact_count": unusable,
            "diagnostic_hold_artifact_count": diagnostic_hold_count,
            "diagnostic_hold_failing_diagnostic_counts": diagnostic_hold_counts,
            "posterior_null_guard_evaluable_count": null_count - unevaluable,
            "posterior_null_guard_unevaluable_count": unevaluable,
            "posterior_null_guard_excluding_zero_count": posterior_excluding_zero,
            "posterior_null_guard_excluding_zero_rate": (
                posterior_excluding_zero / null_count if null_count else 1.0
            ),
            "false_eligible_count": false_eligible,
            "false_eligibility_rate": rate,
            "per_cell": per_cell,
            "null_gate_observed": full_null_gate_observed
            if self.mode == ACCEPTANCE_MODE_FULL
            else smoke_null_gate_observed,
            "smoke_null_gate_observed": smoke_null_gate_observed,
            "full_null_gate_observed": full_null_gate_observed,
            "full_replication_requirement_met": self.full_replication_requirement_met,
        }

    def coverage_summary(self) -> dict | None:
        if self.method != ACCEPTANCE_METHOD_SAMPLER_ARTIFACT:
            return None
        cells = _report_cells(self.required_cells, self.replications)
        scenarios = []
        for cell in cells:
            cell_replications = _cell_replications(self.replications, cell)
            available = [
                replication
                for replication in cell_replications
                if _replication_posterior_interval_available(replication)
            ]
            covered = sum(
                1 for replication in available if replication.covered_injected_effect is True
            )
            invalid = sum(
                1
                for replication in cell_replications
                if not _replication_valid_and_bound(replication)
            )
            hard_failure_reason_counts = _hard_failure_reason_counts(
                cell_replications
            )
            hard_failure_count = sum(hard_failure_reason_counts.values())
            unusable = sum(
                1
                for replication in cell_replications
                if not replication.acceptance_usable_artifact
            )
            diagnostic_hold_counts = _diagnostic_hold_reason_counts(
                cell_replications
            )
            diagnostic_hold_count = sum(diagnostic_hold_counts.values())
            diagnostic_hold_with_posterior_count = sum(
                1
                for replication in cell_replications
                if _replication_diagnostic_hold(replication)
                and _replication_posterior_interval_available(replication)
            )
            missing_ci = sum(
                1
                for replication in cell_replications
                if replication.covered_injected_effect is None
            )
            cell_authorized = sum(
                1
                for replication in cell_replications
                if replication.contribution_estimate_eligible
            )
            coverage_rate = covered / len(available) if available else 0.0
            scenarios.append(
                {
                    "scenario_id": (
                        f"sampler-artifact-effect-{cell.effect_size:g}-"
                        f"k{cell.cohort_size}-n{len(cell_replications)}"
                    ),
                    "injected_effect_size_sd": cell.effect_size,
                    "cohort_size": cell.cohort_size,
                    "replication_count": len(cell_replications),
                    "valid_artifact_count": len(cell_replications) - invalid,
                    "invalid_artifact_count": invalid,
                    "hard_failure_count": hard_failure_count,
                    "hard_failure_reason_counts": hard_failure_reason_counts,
                    "acceptance_usable_artifact_count": (
                        len(cell_replications) - unusable
                    ),
                    "acceptance_unusable_artifact_count": unusable,
                    "diagnostic_hold_artifact_count": diagnostic_hold_count,
                    "diagnostic_hold_with_posterior_interval_count": (
                        diagnostic_hold_with_posterior_count
                    ),
                    "diagnostic_hold_failing_diagnostic_counts": (
                        diagnostic_hold_counts
                    ),
                    "contribution_estimate_authorized_count": cell_authorized,
                    "contribution_estimate_authorization_observed": bool(
                        cell.effect_size == 0.0 or cell_authorized > 0
                    ),
                    "credible_interval_level": CREDIBLE_INTERVAL_LEVEL,
                    "coverage_denominator": (
                        "valid_bound_posterior_interval_available"
                    ),
                    "posterior_interval_available_count": len(available),
                    "covered_count": covered,
                    "coverage_rate": coverage_rate,
                    "coverage_standard_error": _coverage_standard_error(
                        coverage_rate, len(available)
                    )
                    if available
                    else 0.0,
                    "missing_credible_interval_count": missing_ci,
                    "full_replication_requirement_met": (
                        len(cell_replications)
                        >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
                    ),
                    "calibration_band_observed": bool(
                        len(cell_replications)
                        >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
                        and invalid == 0
                        and hard_failure_count == 0
                        and (
                            cell.effect_size == 0.0
                            or cell_authorized > 0
                        )
                        and missing_ci == 0
                        and INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN
                        <= coverage_rate
                        <= INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
                    ),
                }
            )

        available_replications = [
            replication
            for replication in self.replications
            if _replication_posterior_interval_available(replication)
        ]
        covered = sum(
            1
            for replication in available_replications
            if replication.covered_injected_effect is True
        )
        invalid = sum(
            1
            for replication in self.replications
            if not _replication_valid_and_bound(replication)
        )
        hard_failure_reason_counts = _hard_failure_reason_counts(self.replications)
        hard_failure_count = sum(hard_failure_reason_counts.values())
        unusable = sum(
            1
            for replication in self.replications
            if not replication.acceptance_usable_artifact
        )
        diagnostic_hold_counts = _diagnostic_hold_reason_counts(self.replications)
        diagnostic_hold_count = sum(diagnostic_hold_counts.values())
        diagnostic_hold_with_posterior_count = sum(
            1
            for replication in self.replications
            if _replication_diagnostic_hold(replication)
            and _replication_posterior_interval_available(replication)
        )
        missing_ci = sum(
            1
            for replication in self.replications
            if replication.covered_injected_effect is None
        )
        authorized = sum(
            1
            for replication in self.replications
            if replication.contribution_estimate_eligible
        )
        non_null_cells_authorization_observed = all(
            any(
                replication.contribution_estimate_eligible
                for replication in _cell_replications(self.replications, cell)
            )
            for cell in cells
            if cell.effect_size != 0.0
        )
        rate = (
            covered / len(available_replications)
            if available_replications
            else 0.0
        )
        standard_error = (
            _coverage_standard_error(rate, len(available_replications))
            if available_replications
            else 0.0
        )
        return {
            "replication_count": self.replication_count,
            "required_cells": [cell.to_report_section() for cell in cells],
            "scenario_count": len(scenarios),
            "scenarios": scenarios,
            "covered_count": covered,
            "coverage_rate": rate,
            "coverage_standard_error": standard_error,
            "invalid_artifact_count": invalid,
            "hard_failure_count": hard_failure_count,
            "hard_failure_reason_counts": hard_failure_reason_counts,
            "acceptance_usable_artifact_count": self.replication_count - unusable,
            "acceptance_unusable_artifact_count": unusable,
            "diagnostic_hold_artifact_count": diagnostic_hold_count,
            "diagnostic_hold_with_posterior_interval_count": (
                diagnostic_hold_with_posterior_count
            ),
            "diagnostic_hold_failing_diagnostic_counts": diagnostic_hold_counts,
            "contribution_estimate_authorized_count": authorized,
            "non_null_contribution_estimate_authorization_observed": (
                non_null_cells_authorization_observed
            ),
            "coverage_denominator": "valid_bound_posterior_interval_available",
            "posterior_interval_available_count": len(available_replications),
            "missing_credible_interval_count": missing_ci,
            "full_replication_requirement_met": self.full_replication_requirement_met,
            "calibration_band_observed": bool(
                self.full_replication_requirement_met
                and invalid == 0
                and hard_failure_count == 0
                and non_null_cells_authorization_observed
                and missing_ci == 0
                and scenarios
                and all(scenario["calibration_band_observed"] for scenario in scenarios)
            ),
        }

    def to_report(self) -> dict:
        body = {
            "report_class": "internal_synthetic_acceptance_study_report",
            "study_id": self.study_id,
            "method": self.method,
            "mode": self.mode,
            "base_seed": self.base_seed,
            "source_report_rehydrated": self.source_report_rehydrated,
            "source_report_hashes": list(self.source_report_hashes),
            "source_report_runner_generation_proof_hashes": list(
                self.source_report_runner_generation_proof_hashes
            ),
            "runner_generated": self.runner_generated,
            "runner_generation_proof_hash": self.runner_generation_proof_hash,
            "artifact_level_evidence": self.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
            "aggregate_approximation_only": (
                self.method == ACCEPTANCE_METHOD_AGGREGATE_APPROXIMATION
            ),
            "replication_count": self.replication_count,
            "replication_count_per_cell": self.replication_count_per_cell,
            "required_cells": [
                cell.to_report_section()
                for cell in _report_cells(self.required_cells, self.replications)
            ],
            "full_replication_requirement_met": self.full_replication_requirement_met,
            "required_acceptance_cell_set_complete": (
                self.required_acceptance_cell_set_complete
            ),
            "sampler_artifact_acceptance_passed": (
                self.sampler_artifact_acceptance_passed
            ),
            "sampler_artifact_resumable_evidence_observed": (
                self.sampler_artifact_resumable_evidence_observed
            ),
            "task_3_3_acceptance_state": self.task_3_3_acceptance_state,
            "artifact_inputs_authorized": self.artifact_inputs_authorized,
            "open_spec_3_3_completion_authorized": (
                self.open_spec_3_3_completion_authorized
            ),
            "blocked_outputs": _blocked_outputs(),
            "aggregate_source_summary": self.aggregate_source_summary,
            "sampler_settings": self.sampler_settings.as_run_proof_kwargs()
            if self.sampler_settings is not None
            else None,
            "acceptance_run_manifest": self.acceptance_run_manifest(),
            "coverage_summary": self.coverage_summary(),
            "artifact_level_posterior_ci80_coverage": self.coverage_summary(),
            "artifact_level_null_eligibility": self.artifact_level_null_eligibility(),
            "replications": [
                replication.to_report_section() for replication in self.replications
            ],
        }
        body["study_hash"] = sha256_json(body)
        return body

    def acceptance_run_manifest(self) -> dict:
        cells = _report_cells(self.required_cells, self.replications)
        required_per_cell = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        required_total = (
            len(required_acceptance_cells()) * required_per_cell
            if self.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
            else None
        )
        plan_coverage = (
            sampler_artifact_acceptance_plan_coverage(self)
            if self.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
            and self.mode == ACCEPTANCE_MODE_FULL
            and self.base_seed is not None
            else None
        )
        return {
            "base_seed": self.base_seed,
            "required_replications_per_cell": required_per_cell,
            "required_total_replications": required_total,
            "observed_total_replications": self.replication_count,
            "source_report_rehydrated": self.source_report_rehydrated,
            "runner_generation_proof_valid": _runner_generation_proof_valid(self),
            "source_report_hash_count": len(self.source_report_hashes),
            "source_report_hashes": list(self.source_report_hashes),
            "source_report_runner_generation_proof_hash_count": len(
                self.source_report_runner_generation_proof_hashes
            ),
            "source_report_runner_generation_proof_hashes": list(
                self.source_report_runner_generation_proof_hashes
            ),
            "source_report_runner_generation_proof_observed": (
                self._source_report_runner_generation_proof_observed()
            ),
            "required_cell_grid_complete": self.required_acceptance_cell_set_complete,
            "full_sampler_settings_exact": self.sampler_settings == SamplerFullSettings(),
            "per_cell": [
                {
                    "injected_effect_size_sd": cell.effect_size,
                    "cohort_size": cell.cohort_size,
                    "observed_replication_count": _cell_replication_count(
                        self.replications, cell
                    ),
                    "missing_replication_count": max(
                        required_per_cell
                        - _cell_replication_count(self.replications, cell),
                        0,
                    ),
                    "full_requirement_met": (
                        _cell_replication_count(self.replications, cell)
                        >= required_per_cell
                    ),
                }
                for cell in cells
            ],
            "expected_full_replication_slot_hash": (
                plan_coverage["expected_replication_key_hash"]
                if plan_coverage is not None
                else None
            ),
            "observed_replication_slot_hash": (
                plan_coverage["observed_replication_key_hash"]
                if plan_coverage is not None
                else None
            ),
            "full_replication_slot_grid_exact": (
                plan_coverage["complete"] if plan_coverage is not None else False
            ),
            "missing_expected_replication_slot_count": (
                plan_coverage["missing_replication_count"]
                if plan_coverage is not None
                else None
            ),
            "unexpected_replication_slot_count": (
                plan_coverage["unexpected_replication_count"]
                if plan_coverage is not None
                else None
            ),
            "duplicate_replication_slot_count": (
                plan_coverage["duplicate_replication_count"]
                if plan_coverage is not None
                else None
            ),
            "acceptance_plan_coverage": plan_coverage,
        }

    def _acceptance_evidence_passes(self) -> bool:
        return self._acceptance_evidence_complete(
            allow_rehydrated_source_reports=False
        )

    def _resumable_evidence_observed(self) -> bool:
        return self._acceptance_evidence_complete(
            allow_rehydrated_source_reports=True
        )

    def _acceptance_evidence_complete(
        self,
        *,
        allow_rehydrated_source_reports: bool,
        generated_evidence_override: bool | None = None,
    ) -> bool:
        coverage = self.coverage_summary()
        null = self.artifact_level_null_eligibility()
        generated_evidence = (
            bool(generated_evidence_override)
            if generated_evidence_override is not None
            else bool(
                self.runner_generated
                and _runner_generation_proof_valid(self)
                and not self.source_report_rehydrated
            )
        )
        rehydrated_evidence = bool(
            allow_rehydrated_source_reports
            and self.source_report_rehydrated
            and self._source_report_runner_generation_proof_observed()
        )
        return bool(
            self.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
            and self.mode == ACCEPTANCE_MODE_FULL
            and (generated_evidence or rehydrated_evidence)
            and self.required_acceptance_cell_set_complete
            and self.full_replication_requirement_met
            and self.sampler_settings == SamplerFullSettings()
            and self.replication_count_per_cell is not None
            and self.replication_count_per_cell
            >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
            and self.replication_count
            >= len(required_acceptance_cells())
            * INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
            and _full_acceptance_plan_grid_exact(self)
            and
            coverage is not None
            and null is not None
            and coverage.get("calibration_band_observed") is True
            and null.get("full_null_gate_observed") is True
        )

    def _source_report_runner_generation_proof_observed(self) -> bool:
        return bool(
            self.source_report_rehydrated
            and self.source_report_hashes
            and self.source_report_runner_generation_proof_hashes
            and self.source_report_rehydration_token is _RUNNER_GENERATION_TOKEN
            and all(_sha256_hex(value) for value in self.source_report_hashes)
            and all(
                _sha256_hex(value)
                for value in self.source_report_runner_generation_proof_hashes
            )
        )

    def to_artifact_inputs(self) -> SyntheticStudyInputs:
        if not self.artifact_inputs_authorized:
            raise ValueError(
                "acceptance study is not approved to produce artifact inputs; "
                f"method={self.method!r}, mode={self.mode!r}, "
                f"approved_methods={sorted(APPROVED_ARTIFACT_INPUT_METHODS)!r}"
            )
        raise NotImplementedError(
            "full sampler-artifact acceptance inputs are not implemented in this slice"
        )


def build_aggregate_approximation_acceptance_study(
    study: SyntheticStudyResult,
) -> AcceptanceStudyResult:
    """Record current aggregate approximation evidence without promoting it."""

    mode = (
        ACCEPTANCE_MODE_FULL
        if study.full_replication_requirement_met
        else ACCEPTANCE_MODE_SMOKE
    )
    summary = {
        "source_module": "synthetic_study",
        "source_method": ACCEPTANCE_METHOD_AGGREGATE_APPROXIMATION,
        "replication_count_per_cell": study.replication_count_per_cell,
        "calibration_scenario_count": len(study.calibration_scenarios),
        "null_false_eligibility_rate": study.null_checks.get("false_eligibility_rate"),
        "artifact_level_evidence": False,
        "sampler_artifact_replications": 0,
    }
    return AcceptanceStudyResult(
        method=ACCEPTANCE_METHOD_AGGREGATE_APPROXIMATION,
        mode=mode,
        study_id=f"aggregate-approximation-{mode}-seed-{study.base_seed}",
        base_seed=study.base_seed,
        replication_count=study.replication_count_per_cell,
        replication_count_per_cell=study.replication_count_per_cell,
        aggregate_source_summary=summary,
        runner_generated=False,
    )


def run_sampler_artifact_smoke_acceptance_study(
    *,
    base_seed: int = DEFAULT_SAMPLER_SMOKE_BASE_SEED,
    replication_count: int = DEFAULT_SAMPLER_SMOKE_REPLICATIONS,
    cohort_size: int = 12,
    required_cells: Sequence[AcceptanceCell | tuple[float, int]] | None = None,
    settings: SamplerSmokeSettings | None = None,
    study_inputs: SyntheticStudyInputs | None = None,
    proof_runner: Callable[..., tuple[dict, dict]] | None = None,
    generated_at: str | None = None,
) -> AcceptanceStudyResult:
    """Run synthetic null smoke replications through ``run_proof``.

    This is artifact-level evidence because every replication is an emitted
    proof artifact. It is still smoke evidence: reduced draws, null effect
    only, and no task-completion or artifact-input authorization.
    """

    return run_sampler_artifact_acceptance_batch(
        effect_size=0.0 if required_cells is None else None,
        cohort_size=cohort_size if required_cells is None else None,
        required_cells=required_cells,
        base_seed=base_seed,
        replication_start=0,
        replication_count=replication_count,
        settings=settings,
        study_inputs=study_inputs,
        proof_runner=proof_runner,
        generated_at=generated_at,
        mode=ACCEPTANCE_MODE_SMOKE,
        study_id_prefix="sampler-artifact-smoke-null",
    )


def run_sampler_artifact_full_acceptance_study(
    *,
    base_seed: int = DEFAULT_SAMPLER_SMOKE_BASE_SEED,
    replication_start: int = 0,
    replication_count: int = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    study_inputs: SyntheticStudyInputs | None = None,
    proof_runner: Callable[..., tuple[dict, dict]] | None = None,
    generated_at: str | None = None,
) -> AcceptanceStudyResult:
    """Run the full-settings sampler-artifact acceptance cells.

    This is intentionally still non-authorizing: it can run the required
    sampler-artifact cells with full sampler defaults, but the report cannot
    produce artifact inputs and OpenSpec task completion remains hard false
    until the resulting evidence is actually generated and reviewed.
    """

    return run_sampler_artifact_acceptance_batch(
        required_cells=required_acceptance_cells(),
        base_seed=base_seed,
        replication_start=replication_start,
        replication_count=replication_count,
        settings=SamplerFullSettings(),
        study_inputs=study_inputs,
        proof_runner=proof_runner,
        generated_at=generated_at,
        mode=ACCEPTANCE_MODE_FULL,
        study_id_prefix="sampler-artifact-full",
    )


def combine_sampler_artifact_acceptance_batches(
    batches: Sequence[AcceptanceStudyResult],
    *,
    study_id: str | None = None,
) -> AcceptanceStudyResult:
    """Combine non-overlapping sampler-artifact acceptance batches.

    This pure reducer allows a long full sampler-artifact proof to be run in
    chunks without adding checkpoint files, persistence, exports, or artifact
    input authorization. Every combined batch must represent the same method,
    mode, base seed, required cell grid, and sampler settings.
    """

    if not batches:
        raise ValueError("at least one acceptance batch is required")

    first = batches[0]
    if first.method != ACCEPTANCE_METHOD_SAMPLER_ARTIFACT:
        raise ValueError("only sampler-artifact acceptance batches can be combined")
    for batch in batches:
        if batch.method != first.method:
            raise ValueError("acceptance batches must use the same method")
        if batch.mode != first.mode:
            raise ValueError("acceptance batches must use the same mode")
        if batch.base_seed != first.base_seed:
            raise ValueError("acceptance batches must use the same base_seed")
        if batch.required_cells != first.required_cells:
            raise ValueError("acceptance batches must use the same required cells")
        if batch.sampler_settings != first.sampler_settings:
            raise ValueError("acceptance batches must use the same sampler settings")
        if batch.aggregate_source_summary is not None:
            raise ValueError("aggregate approximation batches cannot be combined here")

    replications: list[AcceptanceReplication] = []
    seen_replication_ids: set[str] = set()
    seen_cell_seeds: set[tuple[float, int, int]] = set()
    for batch in batches:
        for replication in batch.replications:
            cell_seed = (
                replication.effect_size,
                replication.cohort_size,
                replication.seed,
            )
            if replication.replication_id in seen_replication_ids:
                raise ValueError(
                    f"duplicate acceptance replication_id: {replication.replication_id!r}"
                )
            if cell_seed in seen_cell_seeds:
                raise ValueError(
                    "duplicate acceptance replication cell/seed: "
                    f"{cell_seed!r}"
                )
            seen_replication_ids.add(replication.replication_id)
            seen_cell_seeds.add(cell_seed)
            replications.append(replication)

    combined_replications = tuple(
        sorted(
            replications,
            key=lambda replication: _replication_sort_key(
                replication,
                base_seed=first.base_seed,
            ),
        )
    )
    per_cell_counts = {
        _cell_replication_count(combined_replications, cell)
        for cell in first.required_cells
    }
    replication_count_per_cell = (
        per_cell_counts.pop() if len(per_cell_counts) == 1 else None
    )
    runner_generated = all(_runner_generation_proof_valid(batch) for batch in batches)
    all_batches_rehydrated = all(batch.source_report_rehydrated for batch in batches)
    all_rehydrated_batches_token_verified = bool(
        all_batches_rehydrated
        and all(
            batch.source_report_rehydration_token is _RUNNER_GENERATION_TOKEN
            for batch in batches
        )
    )
    source_report_hashes = (
        tuple(
            sorted(
                {
                    source_hash
                    for batch in batches
                    for source_hash in batch.source_report_hashes
                }
            )
        )
        if all_rehydrated_batches_token_verified
        else ()
    )
    source_report_runner_generation_proof_hashes = (
        tuple(
            sorted(
                {
                    proof_hash
                    for batch in batches
                    for proof_hash in batch.source_report_runner_generation_proof_hashes
                }
            )
        )
        if all_rehydrated_batches_token_verified
        else ()
    )
    source_report_rehydration_token = (
        _RUNNER_GENERATION_TOKEN
        if source_report_hashes and source_report_runner_generation_proof_hashes
        else None
    )
    return AcceptanceStudyResult(
        method=first.method,
        mode=first.mode,
        study_id=study_id
        if study_id is not None
        else f"combined-{first.mode}-sampler-artifact-acceptance",
        base_seed=first.base_seed,
        replication_count=len(combined_replications),
        replication_count_per_cell=replication_count_per_cell,
        required_cells=first.required_cells,
        replications=combined_replications,
        sampler_settings=first.sampler_settings,
        runner_generated=runner_generated,
        runner_generation_proof_hash=_runner_generation_proof_hash(
            method=first.method,
            mode=first.mode,
            base_seed=first.base_seed,
            required_cells=first.required_cells,
            replications=combined_replications,
            sampler_settings=first.sampler_settings,
        )
        if runner_generated
        else None,
        source_report_rehydrated=any(
            batch.source_report_rehydrated for batch in batches
        ),
        source_report_hashes=source_report_hashes,
        source_report_runner_generation_proof_hashes=(
            source_report_runner_generation_proof_hashes
        ),
        source_report_rehydration_token=source_report_rehydration_token,
        runner_generation_token=_RUNNER_GENERATION_TOKEN
        if runner_generated
        else None,
    )


def acceptance_study_result_from_report(report: dict) -> AcceptanceStudyResult:
    """Rehydrate a sanitized acceptance report after verifying its hash.

    This supports long sampler-artifact runs split across process boundaries
    without adding checkpoint files, persistence, exports, or raw posterior
    values. The report must be exactly the internal sidecar shape emitted by
    ``AcceptanceStudyResult.to_report()``.
    """

    if not isinstance(report, dict):
        raise ValueError("acceptance report must be a dictionary")
    expected_hash = report.get("study_hash")
    if not isinstance(expected_hash, str) or not _sha256_hex(expected_hash):
        raise ValueError("acceptance report is missing a valid study_hash")
    body = {key: value for key, value in report.items() if key != "study_hash"}
    if sha256_json(body) != expected_hash:
        raise ValueError("acceptance report study_hash does not match the report body")
    if body.get("report_class") != "internal_synthetic_acceptance_study_report":
        raise ValueError("unknown acceptance report_class")
    if body.get("method") != ACCEPTANCE_METHOD_SAMPLER_ARTIFACT:
        raise ValueError("only sampler-artifact acceptance reports can be rehydrated")
    if body.get("aggregate_approximation_only") is not False:
        raise ValueError("aggregate approximation reports cannot be rehydrated here")
    if body.get("artifact_level_evidence") is not True:
        raise ValueError("acceptance report must carry artifact-level evidence")
    if body.get("artifact_inputs_authorized") is not False:
        raise ValueError("rehydrated reports must not authorize artifact inputs")
    if body.get("open_spec_3_3_completion_authorized") is not False:
        raise ValueError("rehydrated reports must not authorize OpenSpec completion")
    if body.get("blocked_outputs") != _blocked_outputs():
        raise ValueError("acceptance report blocked outputs are not pinned false")
    _assert_acceptance_report_omits_raw_posterior_values(body)

    try:
        source_report_rehydrated = _strict_bool(body["source_report_rehydrated"])
        source_report_hashes = _sha256_hex_tuple(body["source_report_hashes"])
        source_report_runner_generation_proof_hashes = _sha256_hex_tuple(
            body["source_report_runner_generation_proof_hashes"]
        )
        required_cells = _normalize_required_cells(
            tuple(
                _acceptance_cell_from_report_section(section)
                for section in body["required_cells"]
            )
        )
        replications = tuple(
            _acceptance_replication_from_report_section(section)
            for section in body["replications"]
        )
        _validate_unique_acceptance_replications(replications)
        replication_count = _strict_int(body["replication_count"])
        if replication_count != len(replications):
            raise ValueError("acceptance report replication_count is inconsistent")
        replication_count_per_cell = (
            _strict_int(body["replication_count_per_cell"])
            if body["replication_count_per_cell"] is not None
            else None
        )
        if replication_count_per_cell is not None and required_cells:
            if any(
                _cell_replication_count(replications, cell) != replication_count_per_cell
                for cell in required_cells
            ):
                raise ValueError(
                    "acceptance report replication_count_per_cell is inconsistent"
                )
        mode = str(body["mode"])
        result = AcceptanceStudyResult(
            method=str(body["method"]),
            mode=mode,
            study_id=str(body["study_id"]),
            base_seed=_strict_int(body["base_seed"])
            if body["base_seed"] is not None
            else None,
            replication_count=replication_count,
            replication_count_per_cell=replication_count_per_cell,
            required_cells=required_cells,
            replications=replications,
            aggregate_source_summary=body.get("aggregate_source_summary"),
            sampler_settings=_sampler_settings_from_report(
                mode=mode,
                raw=body.get("sampler_settings"),
            ),
            runner_generated=_strict_bool(body["runner_generated"]),
            runner_generation_proof_hash=_optional_sha256_hex_string(
                body["runner_generation_proof_hash"]
            ),
            source_report_rehydrated=source_report_rehydrated,
            source_report_hashes=source_report_hashes,
            source_report_runner_generation_proof_hashes=(
                source_report_runner_generation_proof_hashes
            ),
            runner_generation_token=None,
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("acceptance report has an invalid shape") from exc

    if not source_report_rehydrated and (
        source_report_hashes or source_report_runner_generation_proof_hashes
    ):
        raise ValueError("acceptance report has an invalid shape")

    if result.runner_generated and result.runner_generation_proof_hash != (
        _runner_generation_proof_hash(
            method=result.method,
            mode=result.mode,
            base_seed=result.base_seed,
            required_cells=result.required_cells,
            replications=result.replications,
            sampler_settings=result.sampler_settings,
        )
    ):
        raise ValueError("acceptance report runner generation hash is inconsistent")

    if not _acceptance_report_matches_untrusted_result(result, report):
        raise ValueError("acceptance report derived summaries are inconsistent")
    rehydrated_source_report_hashes: tuple[str, ...] = ()
    rehydrated_source_report_runner_generation_proof_hashes: tuple[str, ...] = ()
    rehydration_token = None
    return AcceptanceStudyResult(
        method=result.method,
        mode=result.mode,
        study_id=result.study_id,
        base_seed=result.base_seed,
        replication_count=result.replication_count,
        replication_count_per_cell=result.replication_count_per_cell,
        required_cells=result.required_cells,
        replications=result.replications,
        aggregate_source_summary=result.aggregate_source_summary,
        sampler_settings=result.sampler_settings,
        runner_generated=False,
        runner_generation_proof_hash=None,
        source_report_rehydrated=True,
        source_report_hashes=rehydrated_source_report_hashes,
        source_report_runner_generation_proof_hashes=(
            rehydrated_source_report_runner_generation_proof_hashes
        ),
        source_report_rehydration_token=rehydration_token,
        runner_generation_token=None,
    )


def _acceptance_report_matches_untrusted_result(
    result: AcceptanceStudyResult,
    report: dict,
) -> bool:
    expected = result.to_report()
    if result.runner_generated is not True:
        return expected == report

    report_proof_valid = bool(
        not result.source_report_rehydrated
        and _sha256_hex(result.runner_generation_proof_hash)
        and result.runner_generation_proof_hash
        == _runner_generation_proof_hash(
            method=result.method,
            mode=result.mode,
            base_seed=result.base_seed,
            required_cells=result.required_cells,
            replications=result.replications,
            sampler_settings=result.sampler_settings,
        )
    )
    expected_passed = result._acceptance_evidence_complete(
        allow_rehydrated_source_reports=False,
        generated_evidence_override=report_proof_valid,
    )
    expected_resumable = result._acceptance_evidence_complete(
        allow_rehydrated_source_reports=True,
        generated_evidence_override=report_proof_valid,
    )
    expected_manifest = dict(expected["acceptance_run_manifest"])
    expected_manifest["runner_generation_proof_valid"] = report_proof_valid
    expected["acceptance_run_manifest"] = expected_manifest
    expected["sampler_artifact_acceptance_passed"] = expected_passed
    expected["sampler_artifact_resumable_evidence_observed"] = expected_resumable
    if expected_passed and result.mode == ACCEPTANCE_MODE_FULL:
        expected["task_3_3_acceptance_state"] = (
            "sampler_full_generated_not_authorized"
        )
    # Acceptance evidence is not artifact-input authorization. Preserve the
    # independently governed property, which remains false for this method.
    expected["artifact_inputs_authorized"] = result.artifact_inputs_authorized
    expected_body = {
        key: value for key, value in expected.items() if key != "study_hash"
    }
    expected["study_hash"] = sha256_json(expected_body)
    return expected == report


def combine_sampler_artifact_acceptance_reports(
    reports: Sequence[dict],
    *,
    study_id: str | None = None,
) -> AcceptanceStudyResult:
    """Combine sanitized sampler-artifact acceptance reports in memory."""

    return combine_sampler_artifact_acceptance_batches(
        [acceptance_study_result_from_report(report) for report in reports],
        study_id=study_id,
    )


def run_sampler_artifact_acceptance_batch(
    *,
    effect_size: float | None = None,
    cohort_size: int | None = None,
    required_cells: Sequence[AcceptanceCell | tuple[float, int]] | None = None,
    base_seed: int = DEFAULT_SAMPLER_SMOKE_BASE_SEED,
    replication_start: int = 0,
    replication_count: int = DEFAULT_SAMPLER_SMOKE_REPLICATIONS,
    settings: SamplerSmokeSettings | SamplerFullSettings | None = None,
    study_inputs: SyntheticStudyInputs | None = None,
    proof_runner: Callable[..., tuple[dict, dict]] | None = None,
    generated_at: str | None = None,
    mode: str = ACCEPTANCE_MODE_SMOKE,
    study_id_prefix: str = "sampler-artifact-batch",
) -> AcceptanceStudyResult:
    """Run one sampler-artifact batch for required calibration cells.

    The function is intentionally batch-shaped: callers can run/resume a
    long acceptance study by deterministic ``base_seed`` plus
    ``replication_start`` ranges without this module writing checkpoints or
    creating persistence. Reports remain internal sidecar evidence and cannot
    be converted into artifact inputs.
    """

    cells = _normalize_required_cells(
        required_cells
        if required_cells is not None
        else _single_required_cell(effect_size=effect_size, cohort_size=cohort_size)
    )
    if replication_start < 0:
        raise ValueError("replication_start must be nonnegative")
    if replication_count <= 0:
        raise ValueError("replication_count must be positive")
    if mode not in (ACCEPTANCE_MODE_SMOKE, ACCEPTANCE_MODE_FULL):
        raise ValueError(f"unknown acceptance mode: {mode!r}")
    active_settings: SamplerSmokeSettings | SamplerFullSettings
    if mode == ACCEPTANCE_MODE_FULL:
        active_settings = settings if settings is not None else SamplerFullSettings()
        if active_settings != SamplerFullSettings():
            raise ValueError(
                "sampler-artifact full mode requires the exact full sampler "
                "settings used by artifact.run_proof defaults"
            )
        if cells != required_acceptance_cells():
            raise ValueError(
                "sampler-artifact full mode requires every task-3.3 "
                "effect-size/cohort-size calibration cell"
            )
    else:
        active_settings = settings if settings is not None else SamplerSmokeSettings()

    active_study_inputs = (
        study_inputs if study_inputs is not None else run_synthetic_study_inputs()
    )
    canonical_runner_used = proof_runner is None
    if proof_runner is None:
        from .artifact import run_proof

        proof_runner = run_proof

    replications: list[AcceptanceReplication] = []
    for cell in cells:
        for offset in range(replication_count):
            replication_index = replication_start + offset
            seed = _sampler_acceptance_seed(
                base_seed=base_seed,
                effect_size=cell.effect_size,
                cohort_size=cell.cohort_size,
                replication_index=replication_index,
            )
            dataset = generate_did_dataset(
                seed=seed,
                k=cell.cohort_size,
                injected_effect_sd=cell.effect_size,
                scenario="sampler_artifact_acceptance_study",
            )
            replication_id = (
                f"{study_id_prefix}-effect-{cell.effect_size:g}-"
                f"k{cell.cohort_size}-rep-{replication_index + 1}"
            )
            try:
                artifact, internal_report = proof_runner(
                    dataset,
                    seed=seed,
                    **active_settings.as_run_proof_kwargs(),
                    **active_study_inputs.as_run_proof_kwargs(),
                    generated_at=generated_at,
                )
            except Exception as exc:
                replications.append(
                    _acceptance_replication_from_runner_error(
                        replication_id=replication_id,
                        seed=seed,
                        effect_size=cell.effect_size,
                        cohort_size=cell.cohort_size,
                        error_type=exc.__class__.__name__,
                    )
                )
                continue
            replications.append(
                _acceptance_replication_from_artifact(
                    artifact,
                    internal_report=internal_report,
                    expected_synthetic_input_hash=dataset.synthetic_input_hash(),
                    replication_id=replication_id,
                    seed=seed,
                    effect_size=cell.effect_size,
                    cohort_size=cell.cohort_size,
                )
            )

    cell_suffix = "-".join(
        f"effect-{cell.effect_size:g}-k{cell.cohort_size}" for cell in cells
    )
    replication_tuple = tuple(replications)
    return AcceptanceStudyResult(
        method=ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
        mode=mode,
        study_id=(
            f"{study_id_prefix}-{mode}-seed-{base_seed}-{cell_suffix}-"
            f"start-{replication_start}-n{replication_count}"
        ),
        base_seed=base_seed,
        replication_count=len(replications),
        replication_count_per_cell=replication_count,
        required_cells=cells,
        replications=replication_tuple,
        sampler_settings=active_settings,
        runner_generated=canonical_runner_used,
        runner_generation_proof_hash=_runner_generation_proof_hash(
            method=ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
            mode=mode,
            base_seed=base_seed,
            required_cells=cells,
            replications=replication_tuple,
            sampler_settings=active_settings,
        )
        if canonical_runner_used
        else None,
        runner_generation_token=(
            _RUNNER_GENERATION_TOKEN if canonical_runner_used else None
        ),
    )


def _acceptance_replication_from_artifact(
    artifact: dict | None,
    *,
    internal_report: dict | None,
    expected_synthetic_input_hash: str,
    replication_id: str,
    seed: int,
    effect_size: float,
    cohort_size: int,
) -> AcceptanceReplication:
    artifact_valid = _artifact_valid_internal_only(artifact)
    state, failing, eligible = _governance_fields(artifact)
    artifact_bound_to_expected_input = (
        _artifact_synthetic_input_hash(artifact) == expected_synthetic_input_hash
    )
    if artifact_valid and artifact_bound_to_expected_input:
        ci80_lower, ci80_upper, covered = _coverage_from_internal_report(
            internal_report, artifact=artifact, effect_size=effect_size
        )
        posterior_null_guard_evaluable, posterior_null_guard_excludes_zero = (
            _posterior_null_guard_from_internal_report(
                internal_report, artifact=artifact
            )
        )
    else:
        ci80_lower, ci80_upper, covered = None, None, None
        posterior_null_guard_evaluable = False
        posterior_null_guard_excludes_zero = False
    governance_eligible = bool(
        artifact_valid
        and artifact_bound_to_expected_input
        and state == "eligible_internal_only"
        and eligible
        and posterior_null_guard_evaluable
        and posterior_null_guard_excludes_zero
    )
    return AcceptanceReplication(
        replication_id=replication_id,
        seed=seed,
        effect_size=effect_size,
        cohort_size=cohort_size,
        artifact_valid=artifact_valid,
        governance_state=state,
        failing_diagnostics=failing,
        contribution_estimate_eligible=governance_eligible,
        posterior_null_guard_evaluable=posterior_null_guard_evaluable,
        posterior_null_guard_excludes_zero=bool(
            posterior_null_guard_evaluable and posterior_null_guard_excludes_zero
        ),
        artifact_self_hash=_artifact_self_hash(artifact) if artifact_valid else None,
        artifact_bound_to_expected_input=artifact_bound_to_expected_input,
        ci80_lower=ci80_lower,
        ci80_upper=ci80_upper,
        covered_injected_effect=covered,
    )


def _acceptance_replication_from_runner_error(
    *,
    replication_id: str,
    seed: int,
    effect_size: float,
    cohort_size: int,
    error_type: str,
) -> AcceptanceReplication:
    return AcceptanceReplication(
        replication_id=replication_id,
        seed=seed,
        effect_size=effect_size,
        cohort_size=cohort_size,
        artifact_valid=False,
        governance_state="RUNNER_ERROR",
        failing_diagnostics=(),
        contribution_estimate_eligible=False,
        posterior_null_guard_evaluable=False,
        posterior_null_guard_excludes_zero=False,
        artifact_self_hash=None,
        artifact_bound_to_expected_input=False,
        ci80_lower=None,
        ci80_upper=None,
        covered_injected_effect=None,
        runner_error_type=error_type if error_type else "Exception",
    )


def _single_required_cell(
    *, effect_size: float | None, cohort_size: int | None
) -> tuple[AcceptanceCell, ...]:
    if effect_size is None or cohort_size is None:
        raise ValueError(
            "effect_size and cohort_size are required when required_cells is absent"
        )
    return (AcceptanceCell(effect_size=float(effect_size), cohort_size=int(cohort_size)),)


def _normalize_required_cells(
    required_cells: Sequence[AcceptanceCell | tuple[float, int]],
) -> tuple[AcceptanceCell, ...]:
    if not required_cells:
        raise ValueError("required_cells must contain at least one calibration cell")

    cells: list[AcceptanceCell] = []
    seen: set[tuple[float, int]] = set()
    for raw in required_cells:
        if isinstance(raw, AcceptanceCell):
            cell = raw
        else:
            try:
                effect_size, cohort_size = raw
            except (TypeError, ValueError):
                raise ValueError(
                    f"invalid required cell: {raw!r}"
                ) from None
            cell = AcceptanceCell(
                effect_size=float(effect_size),
                cohort_size=int(cohort_size),
            )

        if cell.effect_size not in CALIBRATION_EFFECT_SIZES:
            raise ValueError(
                f"unsupported calibration effect_size: {cell.effect_size!r}"
            )
        if cell.cohort_size not in CALIBRATION_COHORT_SIZES:
            raise ValueError(
                f"unsupported calibration cohort_size: {cell.cohort_size!r}"
            )
        key = (cell.effect_size, cell.cohort_size)
        if key in seen:
            raise ValueError(f"duplicate required calibration cell: {key!r}")
        seen.add(key)
        cells.append(cell)

    return tuple(cells)


def _acceptance_cell_from_report_section(section: dict) -> AcceptanceCell:
    if not isinstance(section, dict) or set(section.keys()) != {
        "injected_effect_size_sd",
        "cohort_size",
    }:
        raise ValueError("invalid acceptance cell report section")
    return AcceptanceCell(
        effect_size=float(section["injected_effect_size_sd"]),
        cohort_size=int(section["cohort_size"]),
    )


def _acceptance_replication_from_report_section(section: dict) -> AcceptanceReplication:
    expected_keys = {
        "replication_id",
        "seed",
        "effect_size",
        "cohort_size",
        "artifact_valid",
        "governance_state",
        "failing_diagnostics",
        "acceptance_usable_artifact",
        "contribution_estimate_eligible",
        "posterior_null_guard_evaluable",
        "posterior_null_guard_excludes_zero",
        "artifact_self_hash",
        "artifact_bound_to_expected_input",
        "covered_injected_effect",
        "runner_error_type",
    }
    if not isinstance(section, dict) or set(section.keys()) != expected_keys:
        raise ValueError("invalid acceptance replication report section")
    failing = section["failing_diagnostics"]
    if not isinstance(failing, list):
        raise ValueError("invalid failing diagnostics in acceptance report")
    replication = AcceptanceReplication(
        replication_id=str(section["replication_id"]),
        seed=_strict_int(section["seed"]),
        effect_size=float(section["effect_size"]),
        cohort_size=_strict_int(section["cohort_size"]),
        artifact_valid=_strict_bool(section["artifact_valid"]),
        governance_state=str(section["governance_state"]),
        failing_diagnostics=tuple(str(name) for name in failing),
        contribution_estimate_eligible=_strict_bool(
            section["contribution_estimate_eligible"]
        ),
        posterior_null_guard_evaluable=_strict_bool(
            section["posterior_null_guard_evaluable"]
        ),
        posterior_null_guard_excludes_zero=_strict_bool(
            section["posterior_null_guard_excludes_zero"]
        ),
        artifact_self_hash=str(section["artifact_self_hash"])
        if section["artifact_self_hash"] is not None
        else None,
        artifact_bound_to_expected_input=_strict_bool(
            section["artifact_bound_to_expected_input"]
        ),
        ci80_lower=None,
        ci80_upper=None,
        covered_injected_effect=_optional_bool(section["covered_injected_effect"]),
        runner_error_type=_optional_string(section["runner_error_type"]),
    )
    if replication.to_report_section() != section:
        raise ValueError("acceptance replication report section is inconsistent")
    if replication.artifact_self_hash is not None and not _sha256_hex(
        replication.artifact_self_hash
    ):
        raise ValueError("acceptance replication artifact_self_hash must be sha256 hex")
    if replication.artifact_valid and replication.artifact_self_hash is None:
        raise ValueError("valid acceptance replications must carry artifact_self_hash")
    if not replication.artifact_valid and replication.artifact_self_hash is not None:
        raise ValueError("invalid acceptance replications must not carry artifact hashes")
    if (
        replication.runner_error_type is not None
        and (
            replication.artifact_valid
            or replication.artifact_bound_to_expected_input
            or replication.artifact_self_hash is not None
            or replication.covered_injected_effect is not None
            or replication.contribution_estimate_eligible
            or replication.posterior_null_guard_evaluable
            or replication.posterior_null_guard_excludes_zero
        )
    ):
        raise ValueError("runner-error acceptance replications must be fail-closed")
    if not _replication_valid_and_bound(replication) and (
        replication.covered_injected_effect is not None
        or replication.contribution_estimate_eligible
        or replication.posterior_null_guard_evaluable
        or replication.posterior_null_guard_excludes_zero
    ):
        raise ValueError(
            "invalid or unbound acceptance replications must not carry posterior evidence"
        )
    return replication


def _sampler_settings_from_report(
    *, mode: str, raw: dict | None
) -> SamplerSmokeSettings | SamplerFullSettings | None:
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ValueError("invalid sampler settings in acceptance report")
    kwargs = {
        "draws": _strict_int(raw["draws"]),
        "tune": _strict_int(raw["tune"]),
        "chains": _strict_int(raw["chains"]),
        "target_accept": float(raw["target_accept"]),
        "max_treedepth": _strict_int(raw["max_treedepth"]),
        "prior_sensitivity_draws": _strict_int(raw["prior_sensitivity_draws"]),
        "prior_sensitivity_tune": _strict_int(raw["prior_sensitivity_tune"]),
        "pre_trend_draws": _strict_int(raw["pre_trend_draws"]),
        "pre_trend_tune": _strict_int(raw["pre_trend_tune"]),
    }
    if set(raw.keys()) != set(kwargs.keys()):
        raise ValueError("invalid sampler settings keys in acceptance report")
    settings: SamplerSmokeSettings | SamplerFullSettings
    if mode == ACCEPTANCE_MODE_FULL:
        settings = SamplerFullSettings(**kwargs)
    elif mode == ACCEPTANCE_MODE_SMOKE:
        settings = SamplerSmokeSettings(**kwargs)
    else:
        raise ValueError(f"unknown acceptance mode: {mode!r}")
    if settings.as_run_proof_kwargs() != raw:
        raise ValueError("sampler settings report section is inconsistent")
    return settings


def _optional_bool(value: object) -> bool | None:
    if value is None:
        return None
    return _strict_bool(value)


def _optional_string(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or value == "":
        raise ValueError("expected a nonempty string or null")
    return value


def _optional_sha256_hex_string(value: object) -> str | None:
    if value is None:
        return None
    if not _sha256_hex(value):
        raise ValueError("expected sha256 hex or null")
    return str(value)


def _sha256_hex_tuple(value: object) -> tuple[str, ...]:
    if not isinstance(value, list):
        raise ValueError("expected a list of sha256 hex strings")
    hashes: list[str] = []
    for item in value:
        if not _sha256_hex(item):
            raise ValueError("expected a list of sha256 hex strings")
        hashes.append(str(item))
    return _dedupe_hash_tuple(tuple(hashes))


def _dedupe_hash_tuple(values: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(sorted(set(values)))


def _strict_bool(value: object) -> bool:
    if not isinstance(value, bool):
        raise ValueError("expected a strict boolean")
    return value


def _assert_acceptance_report_omits_raw_posterior_values(value: object) -> None:
    blocked = {
        "posterior_mean",
        "posterior_sd",
        "credible_interval_80",
        "ci80_lower",
        "ci80_upper",
        "threshold_probability",
        "expected_loss",
    }
    if isinstance(value, dict):
        leaked = set(value) & blocked
        if leaked:
            raise ValueError(
                "acceptance reports must omit raw posterior values: "
                f"{sorted(leaked)!r}"
            )
        for child in value.values():
            _assert_acceptance_report_omits_raw_posterior_values(child)
    elif isinstance(value, list):
        for child in value:
            _assert_acceptance_report_omits_raw_posterior_values(child)


def _report_cells(
    required_cells: tuple[AcceptanceCell, ...],
    replications: tuple[AcceptanceReplication, ...],
) -> tuple[AcceptanceCell, ...]:
    if required_cells:
        return required_cells
    observed = {
        (replication.effect_size, replication.cohort_size)
        for replication in replications
    }
    return tuple(
        AcceptanceCell(effect_size=effect_size, cohort_size=cohort_size)
        for effect_size, cohort_size in sorted(observed)
    )


def _cell_replications(
    replications: tuple[AcceptanceReplication, ...],
    cell: AcceptanceCell,
) -> list[AcceptanceReplication]:
    return [
        replication
        for replication in replications
        if replication.effect_size == cell.effect_size
        and replication.cohort_size == cell.cohort_size
    ]


def _cell_replication_count(
    replications: tuple[AcceptanceReplication, ...],
    cell: AcceptanceCell,
) -> int:
    return len(_cell_replications(replications, cell))


def _validate_unique_acceptance_replications(
    replications: tuple[AcceptanceReplication, ...],
) -> None:
    seen_replication_ids: set[str] = set()
    seen_cell_seeds: set[tuple[float, int, int]] = set()
    for replication in replications:
        cell_seed = (
            replication.effect_size,
            replication.cohort_size,
            replication.seed,
        )
        if replication.replication_id in seen_replication_ids:
            raise ValueError(
                f"duplicate acceptance replication_id: {replication.replication_id!r}"
            )
        if cell_seed in seen_cell_seeds:
            raise ValueError(
                "duplicate acceptance replication cell/seed: "
                f"{cell_seed!r}"
            )
        seen_replication_ids.add(replication.replication_id)
        seen_cell_seeds.add(cell_seed)


def _default_full_acceptance_plan_for_result(
    result: AcceptanceStudyResult,
) -> dict:
    if result.base_seed is None:
        raise ValueError("sampler-artifact full acceptance plan requires base_seed")
    observed_per_cell = (
        result.replication_count_per_cell
        if result.replication_count_per_cell is not None
        else INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
    )
    return plan_sampler_artifact_full_acceptance_run(
        base_seed=result.base_seed,
        replications_per_cell=max(
            observed_per_cell,
            INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        ),
    )


def _canonicalize_acceptance_plan(plan: dict) -> dict:
    if not isinstance(plan, dict):
        raise ValueError("acceptance plan must be a dictionary")
    expected_hash = plan.get("plan_hash")
    if not _sha256_hex(expected_hash):
        raise ValueError("acceptance plan is missing a valid plan_hash")
    body = {key: value for key, value in plan.items() if key != "plan_hash"}
    if sha256_json(body) != expected_hash:
        raise ValueError("acceptance plan_hash does not match the plan body")
    try:
        base_seed = _strict_int(body["base_seed"])
        replications_per_cell = _strict_int(body["replications_per_cell"])
        expected_total = _strict_int(body["expected_total_artifacts"])
        chunk_size = _strict_int(body["chunk_size"])
        required_cells = _normalize_required_cells(
            tuple(
                _acceptance_cell_from_report_section(section)
                for section in body["required_cells"]
            )
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("acceptance plan has an invalid shape") from exc
    expected_keys = _expected_acceptance_plan_keys(
        base_seed=base_seed,
        replications_per_cell=replications_per_cell,
    )
    if (
        body.get("plan_class")
        != "internal_synthetic_sampler_artifact_full_acceptance_plan"
        or body.get("method") != ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
        or body.get("mode") != ACCEPTANCE_MODE_FULL
        or required_cells != required_acceptance_cells()
        or body.get("report_class")
        != "internal_synthetic_acceptance_execution_plan"
        or body.get("minimum_required_replications_per_cell")
        != INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        or body.get("required_replications_per_cell")
        != INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        or body.get("required_total_replications")
        != len(required_acceptance_cells())
        * INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        or replications_per_cell < INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        or expected_total != len(expected_keys)
        or body.get("expected_replication_key_hash")
        != _acceptance_plan_key_hash(expected_keys)
        or body.get("sampler_settings") != SamplerFullSettings().as_run_proof_kwargs()
        or body.get("plan_only") is not True
        or body.get("artifact_level_evidence") is not False
        or body.get("internal_only") is not True
        or body.get("customer_output_authorized") is not False
        or body.get("probability_output_authorized") is not False
        or body.get("confidence_output_authorized") is not False
        or body.get("finance_output_authorized") is not False
        or body.get("stdout_only") is not True
        or body.get("writes_persistence") is not False
        or body.get("creates_export") is not False
        or body.get("artifact_inputs_authorized") is not False
        or body.get("open_spec_3_3_completion_authorized") is not False
        or body.get("blocked_outputs") != _blocked_outputs()
        or chunk_size <= 0
    ):
        raise ValueError("acceptance plan has an invalid shape")
    chunks = body.get("chunks")
    if not isinstance(chunks, list) or len(chunks) != body.get("chunk_count"):
        raise ValueError("acceptance plan chunks are inconsistent")
    observed_ranges: list[tuple[int, int]] = []
    for chunk in chunks:
        if not isinstance(chunk, dict):
            raise ValueError("acceptance plan chunk has an invalid shape")
        chunk_hash = chunk.get("chunk_hash")
        if not _sha256_hex(chunk_hash):
            raise ValueError("acceptance plan chunk is missing chunk_hash")
        chunk_body = {key: value for key, value in chunk.items() if key != "chunk_hash"}
        if sha256_json(chunk_body) != chunk_hash:
            raise ValueError("acceptance plan chunk_hash mismatch")
        start = _strict_int(chunk["replication_start"])
        count = _strict_int(chunk["replication_count"])
        if chunk.get("replication_count_per_cell") != count:
            raise ValueError("acceptance plan chunk replication count is invalid")
        if start < 0 or count <= 0:
            raise ValueError("acceptance plan chunk range is invalid")
        if (
            chunk.get("replication_index_start_inclusive") != start
            or chunk.get("replication_index_end_exclusive") != start + count
        ):
            raise ValueError("acceptance plan chunk indexes are invalid")
        if chunk.get("expected_artifact_count") != len(required_acceptance_cells()) * count:
            raise ValueError("acceptance plan chunk artifact count is invalid")
        if chunk.get("cli_args") != [
            "--acceptance-full",
            "--base-seed",
            str(base_seed),
            "--replication-start",
            str(start),
            "--replication-count",
            str(count),
        ]:
            raise ValueError("acceptance plan chunk cli_args are invalid")
        chunk_keys = tuple(
            key for key in expected_keys if start <= key[2] < start + count
        )
        if chunk.get("expected_replication_slot_hash") != _acceptance_plan_key_hash(
            chunk_keys
        ):
            raise ValueError("acceptance plan chunk slot hash is invalid")
        chunk_cells = chunk.get("cells")
        if not isinstance(chunk_cells, list) or len(chunk_cells) != len(
            required_acceptance_cells()
        ):
            raise ValueError("acceptance plan chunk cells are invalid")
        for raw_cell in chunk_cells:
            if not isinstance(raw_cell, dict):
                raise ValueError("acceptance plan chunk cells are invalid")
            cell = AcceptanceCell(
                effect_size=float(raw_cell["injected_effect_size_sd"]),
                cohort_size=_strict_int(raw_cell["cohort_size"]),
            )
            if cell not in required_acceptance_cells():
                raise ValueError("acceptance plan chunk cells are invalid")
            if raw_cell.get("start_seed") != _sampler_acceptance_seed(
                base_seed=base_seed,
                effect_size=cell.effect_size,
                cohort_size=cell.cohort_size,
                replication_index=start,
            ) or raw_cell.get("end_seed") != _sampler_acceptance_seed(
                base_seed=base_seed,
                effect_size=cell.effect_size,
                cohort_size=cell.cohort_size,
                replication_index=start + count - 1,
            ):
                raise ValueError("acceptance plan chunk cell seeds are invalid")
        observed_ranges.append((start, start + count))
    observed_ranges.sort()
    expected_start = 0
    for start, end in observed_ranges:
        if start != expected_start:
            raise ValueError("acceptance plan chunks are not contiguous")
        expected_start = end
    if expected_start != replications_per_cell:
        raise ValueError("acceptance plan chunks do not cover the full range")
    return {
        **body,
        "plan_hash": expected_hash,
        "base_seed": base_seed,
        "replications_per_cell": replications_per_cell,
        "expected_replication_key_hash": _acceptance_plan_key_hash(expected_keys),
    }


def _expected_acceptance_plan_keys(
    *, base_seed: int, replications_per_cell: int
) -> tuple[tuple[float, int, int, int], ...]:
    keys: list[tuple[float, int, int, int]] = []
    for cell in required_acceptance_cells():
        for replication_index in range(replications_per_cell):
            seed = _sampler_acceptance_seed(
                base_seed=base_seed,
                effect_size=cell.effect_size,
                cohort_size=cell.cohort_size,
                replication_index=replication_index,
            )
            keys.append(
                (cell.effect_size, cell.cohort_size, replication_index, seed)
            )
    return tuple(sorted(keys))


def _acceptance_plan_key_hash(
    keys: tuple[tuple[float, int, int, int], ...],
) -> str:
    return sha256_json(
        [
            {
                "injected_effect_size_sd": effect_size,
                "cohort_size": cohort_size,
                "replication_index": replication_index,
                "seed": seed,
            }
            for effect_size, cohort_size, replication_index, seed in sorted(keys)
        ]
    )


def _observed_acceptance_plan_key(
    replication: AcceptanceReplication,
    *,
    base_seed: int,
) -> tuple[float, int, int, int] | None:
    if replication.effect_size not in CALIBRATION_EFFECT_SIZES:
        return None
    if replication.cohort_size not in CALIBRATION_COHORT_SIZES:
        return None
    start_seed = _sampler_acceptance_seed(
        base_seed=base_seed,
        effect_size=replication.effect_size,
        cohort_size=replication.cohort_size,
        replication_index=0,
    )
    replication_index = replication.seed - start_seed
    if replication_index < 0:
        return None
    expected_seed = _sampler_acceptance_seed(
        base_seed=base_seed,
        effect_size=replication.effect_size,
        cohort_size=replication.cohort_size,
        replication_index=replication_index,
    )
    if expected_seed != replication.seed:
        return None
    return (
        replication.effect_size,
        replication.cohort_size,
        replication_index,
        replication.seed,
    )


def _replication_sort_key(
    replication: AcceptanceReplication,
    *,
    base_seed: int | None,
) -> tuple[float, int, int, int, str]:
    replication_index = -1
    if base_seed is not None:
        key = _observed_acceptance_plan_key(replication, base_seed=base_seed)
        if key is not None:
            replication_index = key[2]
    return (
        replication.effect_size,
        replication.cohort_size,
        replication_index,
        replication.seed,
        replication.replication_id,
    )


def _replication_valid_and_bound(replication: AcceptanceReplication) -> bool:
    return bool(
        replication.artifact_valid and replication.artifact_bound_to_expected_input
    )


def _replication_posterior_interval_available(
    replication: AcceptanceReplication,
) -> bool:
    return bool(
        _replication_valid_and_bound(replication)
        and replication.runner_error_type is None
        and replication.covered_injected_effect is not None
    )


def _replication_diagnostic_hold(replication: AcceptanceReplication) -> bool:
    return bool(
        _replication_valid_and_bound(replication)
        and replication.runner_error_type is None
        and replication.governance_state == "HOLD"
        and replication.failing_diagnostics != ()
    )


def _replication_partitionable_calibration_hold(
    replication: AcceptanceReplication,
) -> bool:
    return bool(
        _replication_diagnostic_hold(replication)
        and set(replication.failing_diagnostics)
        == _CALIBRATION_PARTITIONABLE_DIAGNOSTIC_HOLDS
    )


def _replication_hard_failure_reason(
    replication: AcceptanceReplication,
) -> str | None:
    if replication.runner_error_type is not None:
        return "runner_error"
    if not replication.artifact_valid:
        return "invalid_artifact"
    if not replication.artifact_bound_to_expected_input:
        return "unbound_artifact"
    if replication.covered_injected_effect is None:
        return "missing_posterior_interval_or_hash_mismatch"
    if replication.governance_state == "HOLD":
        if _replication_partitionable_calibration_hold(replication):
            return None
        return "unsupported_diagnostic_hold"
    if replication.governance_state != "eligible_internal_only":
        return "unsupported_governance_state"
    return None


def _hard_failure_reason_counts(
    replications: Sequence[AcceptanceReplication],
) -> dict[str, int]:
    counts: dict[str, int] = {}
    for replication in replications:
        reason = _replication_hard_failure_reason(replication)
        if reason is not None:
            counts[reason] = counts.get(reason, 0) + 1
    return dict(sorted(counts.items()))


def _diagnostic_hold_reason_counts(
    replications: Sequence[AcceptanceReplication],
) -> dict[str, int]:
    counts: dict[str, int] = {}
    for replication in replications:
        if not _replication_diagnostic_hold(replication):
            continue
        for diagnostic in replication.failing_diagnostics:
            counts[diagnostic] = counts.get(diagnostic, 0) + 1
    return dict(sorted(counts.items()))


def _coverage_standard_error(coverage_rate: float, replication_count: int) -> float:
    return math.sqrt(coverage_rate * (1.0 - coverage_rate) / replication_count)


def _sampler_acceptance_seed(
    *, base_seed: int, effect_size: float, cohort_size: int, replication_index: int
) -> int:
    effect_code = int(round(effect_size * 1000))
    return int(base_seed + effect_code * 100_000 + cohort_size * 1_000 + replication_index)


def _coverage_from_internal_report(
    internal_report: dict | None, *, artifact: dict | None, effect_size: float
) -> tuple[float | None, float | None, bool | None]:
    if not isinstance(internal_report, dict):
        return None, None, None
    try:
        estimand_summary = internal_report["estimand_summary"]
        if not isinstance(estimand_summary, dict):
            return None, None, None
        if not _source_posterior_hash_matches_artifact(artifact, estimand_summary):
            return None, None, None
        interval = estimand_summary["credible_interval_80"]
        lower = float(interval["lower"])
        upper = float(interval["upper"])
    except (KeyError, TypeError, ValueError):
        return None, None, None
    if not math.isfinite(lower) or not math.isfinite(upper) or lower > upper:
        return None, None, None
    return lower, upper, bool(lower <= effect_size <= upper)


def _posterior_null_guard_from_internal_report(
    internal_report: dict | None, *, artifact: dict | None
) -> tuple[bool, bool]:
    if not isinstance(internal_report, dict):
        return False, False
    try:
        estimand_summary = internal_report["estimand_summary"]
        if not isinstance(estimand_summary, dict):
            return False, False
        if not _source_posterior_hash_matches_artifact(artifact, estimand_summary):
            return False, False
        posterior_mean = float(estimand_summary["posterior_mean"])
        posterior_sd = float(estimand_summary["posterior_sd"])
    except (KeyError, TypeError, ValueError):
        return False, False
    if (
        not math.isfinite(posterior_mean)
        or not math.isfinite(posterior_sd)
        or posterior_sd <= 0.0
    ):
        return False, False
    null_guard_lower = posterior_mean - _NULL_FALSE_ELIGIBILITY_Z * posterior_sd
    null_guard_upper = posterior_mean + _NULL_FALSE_ELIGIBILITY_Z * posterior_sd
    return True, bool(null_guard_lower > 0.0 or null_guard_upper < 0.0)


def _artifact_valid_internal_only(artifact: dict | None) -> bool:
    if not isinstance(artifact, dict):
        return False
    try:
        return bool(
            set(artifact.keys()) == _REQUIRED_ARTIFACT_TOP_LEVEL_KEYS
            and artifact.get("schema_version") == INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION
            and artifact.get("artifact_class") == "internal_synthetic_inference_proof"
            and _artifact_required_sections_present(artifact)
            and artifact["hash_bindings"]["artifact_self_hash"]
            == inference_proof_artifact_self_hash(artifact)
            and _sha256_hex(artifact["hash_bindings"]["source_posterior_hash"])
            and _synthetic_generator_section_valid(artifact)
            and _sha256_hex(artifact["lockfile_hash"])
            and _diagnostics_section_valid(artifact)
            and _model_spec_binding_section_valid(artifact)
            and _measurement_cell_window_evidence_section_valid(artifact)
            and artifact["numeric_values_role"]
            == "internal_validation_inputs_not_output"
            and artifact["numeric_posterior_values_customer_authorized"] is False
            and artifact["internal_only"] is True
            and artifact["customer_output_authorized"] is False
            and artifact["probability_output_authorized"] is False
            and artifact["confidence_output_authorized"] is False
            and artifact["finance_output_authorized"] is False
            and artifact["creates_route"] is False
            and artifact["creates_ui"] is False
            and artifact["writes_persistence"] is False
            and artifact["creates_export"] is False
            and artifact["renders_readout"] is False
            and artifact["executes_connector"] is False
            and artifact["promotion_decision_ref"] is None
            and artifact["blocked_uses"] == list(CONFIDENCE_MODEL_BLOCKED_USES)
            and _artifact_study_sections_valid(artifact)
            and _governance_state_consistent(artifact)
        )
    except (KeyError, TypeError):
        return False


def _synthetic_generator_section_valid(artifact: dict) -> bool:
    try:
        generator = artifact["synthetic_generator"]
        seed_range = generator["seed_range"]
        return bool(
            set(generator.keys())
            == {
                "generator_id",
                "generator_version",
                "seed_range",
                "synthetic_input_hash",
                "real_data_present",
                "customer_data_present",
                "production_data_present",
                "live_data_source_present",
            }
            and _nonempty_string(generator["generator_id"])
            and _nonempty_string(generator["generator_version"])
            and set(seed_range.keys()) == {"start_seed", "end_seed"}
            and isinstance(seed_range["start_seed"], int)
            and not isinstance(seed_range["start_seed"], bool)
            and isinstance(seed_range["end_seed"], int)
            and not isinstance(seed_range["end_seed"], bool)
            and seed_range["start_seed"] >= 0
            and seed_range["end_seed"] >= seed_range["start_seed"]
            and _sha256_hex(generator["synthetic_input_hash"])
            and artifact["hash_bindings"]["synthetic_input_hash"]
            == generator["synthetic_input_hash"]
            and generator["real_data_present"] is False
            and generator["customer_data_present"] is False
            and generator["production_data_present"] is False
            and generator["live_data_source_present"] is False
        )
    except (AttributeError, KeyError, TypeError):
        return False


def _artifact_study_sections_valid(artifact: dict) -> bool:
    return bool(
        _calibration_section_valid(artifact)
        and _null_checks_section_valid(artifact)
        and _floor_checks_section_valid(artifact)
        and _peeking_control_section_valid(artifact)
        and _comparison_adequacy_section_valid(artifact)
    )


def _model_spec_binding_section_valid(artifact: dict) -> bool:
    try:
        binding = artifact["model_spec_binding"]
        if set(binding.keys()) != {
            "model_family",
            "estimand_name",
            "estimand_units",
            "likelihood_family",
            "link_function",
            "aggregate_cell_variance_mode",
            "cohort_size_enters_likelihood",
            "missing_or_suppressed_windows_hold",
            "treatment_effect_pooling",
            "pooling_structure",
        }:
            return False
        pooling = binding["pooling_structure"]
        likelihood_family = binding["likelihood_family"]
        return bool(
            binding["model_family"]
            == "bayesian_hierarchical_difference_in_differences_candidate"
            and binding["estimand_name"] == "aggregate_selected_metric_movement"
            and binding["estimand_units"] == "standardized_effect_sd"
            and likelihood_family in INFERENCE_PROOF_LIKELIHOOD_FAMILIES
            and binding["link_function"]
            == LIKELIHOOD_FAMILY_LINKS[likelihood_family]
            and binding["aggregate_cell_variance_mode"]
            == "cohort_size_weighted_known_variance"
            and binding["cohort_size_enters_likelihood"] is True
            and binding["missing_or_suppressed_windows_hold"] is True
            and binding["treatment_effect_pooling"] == "global"
            and pooling
            == {
                "expectation_path": True,
                "workflow": True,
                "function": True,
                "cohort": True,
                "organization": True,
            }
        )
    except (AttributeError, KeyError, TypeError):
        return False


def _measurement_cell_window_evidence_section_valid(artifact: dict) -> bool:
    try:
        evidence = artifact["measurement_cell_window_evidence"]
        if set(evidence.keys()) != {
            "required_milestone_days",
            "observed_milestone_days",
            "missing_milestone_days",
            "suppressed_milestone_days",
            "stale_milestone_days",
            "imputed_milestone_days",
            "required_window_refs",
            "observed_window_refs",
            "missing_window_refs",
            "suppressed_window_refs",
            "stale_window_refs",
            "imputed_window_refs",
            "all_required_windows_observed",
            "all_windows_unsuppressed_and_fresh",
            "imputation_used",
            "measurement_cell_window_evidence_hash",
        }:
            return False

        required = _strict_int_list(evidence["required_milestone_days"])
        observed = _strict_int_list(evidence["observed_milestone_days"])
        missing = _strict_int_list(evidence["missing_milestone_days"])
        suppressed = _strict_int_list(evidence["suppressed_milestone_days"])
        stale = _strict_int_list(evidence["stale_milestone_days"])
        imputed = _strict_int_list(evidence["imputed_milestone_days"])
        if required is None or observed is None or missing is None or suppressed is None:
            return False
        if stale is None or imputed is None:
            return False
        milestone_days = (required, observed, missing, suppressed, stale, imputed)
        if not required or any(
            len(set(days)) != len(days) for days in milestone_days
        ):
            return False
        planned = _strict_int_list(
            artifact["peeking_control"]["milestone_days_included"]
        )
        if planned is None or sorted(required) != sorted(planned):
            return False
        observed_or_sidecar = observed + suppressed + stale + imputed
        if any(day not in planned for day in observed_or_sidecar):
            return False
        derived_missing = [day for day in required if day not in observed]
        if sorted(missing) != sorted(derived_missing):
            return False

        ref_keys = (
            "required_window_refs",
            "observed_window_refs",
            "missing_window_refs",
            "suppressed_window_refs",
            "stale_window_refs",
            "imputed_window_refs",
        )
        for key in ref_keys:
            if not isinstance(evidence[key], list) or any(
                not _nonempty_string(ref) for ref in evidence[key]
            ):
                return False
            if len(set(evidence[key])) != len(evidence[key]):
                return False
        if not evidence["required_window_refs"]:
            return False

        ref_day_pairs = (
            ("required_window_refs", "required_milestone_days"),
            ("observed_window_refs", "observed_milestone_days"),
            ("missing_window_refs", "missing_milestone_days"),
            ("suppressed_window_refs", "suppressed_milestone_days"),
            ("stale_window_refs", "stale_milestone_days"),
            ("imputed_window_refs", "imputed_milestone_days"),
        )
        for ref_key, day_key in ref_day_pairs:
            if len(evidence[ref_key]) != len(evidence[day_key]):
                return False

        derived_missing_refs = [
            ref for ref in evidence["required_window_refs"]
            if ref not in evidence["observed_window_refs"]
        ]
        if sorted(evidence["missing_window_refs"]) != sorted(derived_missing_refs):
            return False

        return bool(
            _sha256_hex(evidence["measurement_cell_window_evidence_hash"])
            and evidence["all_required_windows_observed"] is (
                len(missing) == 0 and len(derived_missing_refs) == 0
            )
            and evidence["all_windows_unsuppressed_and_fresh"]
            is (
                len(suppressed) == 0
                and len(stale) == 0
                and len(evidence["suppressed_window_refs"]) == 0
                and len(evidence["stale_window_refs"]) == 0
            )
            and evidence["imputation_used"] is (
                len(imputed) > 0 or len(evidence["imputed_window_refs"]) > 0
            )
        )
    except (AttributeError, KeyError, TypeError, ValueError):
        return False


def _diagnostics_section_valid(artifact: dict) -> bool:
    try:
        diagnostics = artifact["diagnostics"]
        sampler = diagnostics["sampler"]
        parameters = sampler["parameters"]
        if not isinstance(parameters, list) or not parameters:
            return False
        parameter_names: set[str] = set()
        has_estimand = False
        for parameter in parameters:
            if set(parameter.keys()) != {
                "parameter_name",
                "r_hat",
                "bulk_ess",
                "tail_ess",
                "posterior_mean_mcse",
                "interval_endpoint_mcse",
                "posterior_sd",
                "max_mcse_to_posterior_sd_ratio",
            }:
                return False
            if not _nonempty_string(parameter["parameter_name"]):
                return False
            if parameter["parameter_name"] in parameter_names:
                return False
            parameter_names.add(parameter["parameter_name"])
            if parameter["parameter_name"] == INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME:
                has_estimand = True
            if not _all_finite(
                parameter["r_hat"],
                parameter["bulk_ess"],
                parameter["tail_ess"],
                parameter["posterior_mean_mcse"],
                parameter["interval_endpoint_mcse"],
                parameter["posterior_sd"],
                parameter["max_mcse_to_posterior_sd_ratio"],
            ):
                return False
            if (
                float(parameter["bulk_ess"]) < 0
                or float(parameter["tail_ess"]) < 0
                or float(parameter["posterior_mean_mcse"]) < 0
                or float(parameter["interval_endpoint_mcse"]) < 0
                or float(parameter["posterior_sd"]) < 0
                or float(parameter["max_mcse_to_posterior_sd_ratio"]) < 0
            ):
                return False
            observed_mcse = max(
                float(parameter["posterior_mean_mcse"]),
                float(parameter["interval_endpoint_mcse"]),
            )
            posterior_sd = float(parameter["posterior_sd"])
            expected_ratio = 0.0 if posterior_sd == 0 and observed_mcse == 0 else (
                float("inf") if posterior_sd == 0 else observed_mcse / posterior_sd
            )
            if (
                not math.isfinite(expected_ratio)
                or abs(
                    float(parameter["max_mcse_to_posterior_sd_ratio"])
                    - expected_ratio
                )
                > INFERENCE_PROOF_FLOAT_TOLERANCE
            ):
                return False
        if not has_estimand:
            return False
        if set(sampler.keys()) != {
            "parameters",
            "post_warmup_divergences",
            "max_treedepth_saturation_rate",
            "max_treedepth_warning",
            "energy_bfmi_min",
            "energy_bfmi_warning",
            "rank_plots_recorded",
            "energy_plots_recorded",
        }:
            return False
        if (
            _strict_int(sampler["post_warmup_divergences"]) < 0
            or not _all_finite(
                sampler["max_treedepth_saturation_rate"],
                sampler["energy_bfmi_min"],
            )
            or float(sampler["max_treedepth_saturation_rate"]) < 0
            or float(sampler["energy_bfmi_min"]) < 0
            or not isinstance(sampler["max_treedepth_warning"], bool)
            or not isinstance(sampler["energy_bfmi_warning"], bool)
            or sampler["rank_plots_recorded"] is not True
            or sampler["energy_plots_recorded"] is not True
        ):
            return False

        pre_trend = diagnostics["pre_trend"]
        interval = pre_trend["pseudo_effect_credible_interval_80"]
        lower = float(interval["lower"])
        upper = float(interval["upper"])
        includes_zero = lower <= 0.0 <= upper
        if (
            set(pre_trend.keys())
            != {"pseudo_effect_credible_interval_80", "includes_zero", "pass"}
            or set(interval.keys()) != {"lower", "upper"}
            or not math.isfinite(lower)
            or not math.isfinite(upper)
            or lower > upper
            or pre_trend["includes_zero"] is not includes_zero
            or not isinstance(pre_trend["pass"], bool)
        ):
            return False

        ppcs = diagnostics["posterior_predictive_checks"]
        if not isinstance(ppcs, list) or len(ppcs) != len(
            INFERENCE_PROOF_PPC_STATISTIC_NAMES
        ):
            return False
        seen_ppc: set[str] = set()
        for statistic in ppcs:
            if set(statistic.keys()) != {
                "statistic_name",
                "observed_value",
                "posterior_predictive_summary",
                "p_value",
                "pass",
            }:
                return False
            name = statistic["statistic_name"]
            if name not in INFERENCE_PROOF_PPC_STATISTIC_NAMES or name in seen_ppc:
                return False
            seen_ppc.add(name)
            summary = statistic["posterior_predictive_summary"]
            summary_interval = summary["credible_interval_80"]
            if (
                set(summary.keys()) != {"mean", "credible_interval_80"}
                or set(summary_interval.keys()) != {"lower", "upper"}
                or not _all_finite(
                    statistic["observed_value"],
                    summary["mean"],
                    summary_interval["lower"],
                    summary_interval["upper"],
                    statistic["p_value"],
                )
                or not 0.0 <= float(statistic["p_value"]) <= 1.0
                or not isinstance(statistic["pass"], bool)
            ):
                return False
        if tuple(stat["statistic_name"] for stat in ppcs) != INFERENCE_PROOF_PPC_STATISTIC_NAMES:
            return False

        sensitivity = diagnostics["prior_sensitivity"]
        if not isinstance(sensitivity, dict) or set(sensitivity.keys()) != {
            "empirical_prior_justification_documented",
            "empirical_prior_justification_ref",
            "empirical_prior_justification_hash",
            "posterior_mean_shift_in_posterior_sd",
            "pass",
        }:
            return False
        return bool(
            sensitivity["empirical_prior_justification_documented"] is True
            and _nonempty_string(sensitivity["empirical_prior_justification_ref"])
            and _sha256_hex(sensitivity["empirical_prior_justification_hash"])
            and _all_finite(sensitivity["posterior_mean_shift_in_posterior_sd"])
            and float(sensitivity["posterior_mean_shift_in_posterior_sd"]) >= 0
            and isinstance(sensitivity["pass"], bool)
        )
    except (AttributeError, KeyError, TypeError, ValueError):
        return False


def _calibration_section_valid(artifact: dict) -> bool:
    try:
        calibration = artifact["calibration"]
        if set(calibration.keys()) != {"scenarios", "per_scenario_required"}:
            return False
        if calibration["per_scenario_required"] is not True:
            return False
        scenarios = calibration["scenarios"]
        if not isinstance(scenarios, list) or len(scenarios) != len(
            CALIBRATION_EFFECT_SIZES
        ) * len(CALIBRATION_COHORT_SIZES):
            return False

        observed: set[tuple[float, int]] = set()
        for scenario in scenarios:
            if set(scenario.keys()) != {
                "scenario_id",
                "injected_effect_size_sd",
                "cohort_size",
                "replication_count",
                "credible_interval_level",
                "coverage_rate",
                "coverage_standard_error",
                "pass",
            }:
                return False
            effect = float(scenario["injected_effect_size_sd"])
            cohort_size = int(scenario["cohort_size"])
            replication_count = _strict_int(scenario["replication_count"])
            coverage_rate = float(scenario["coverage_rate"])
            coverage_standard_error = float(scenario["coverage_standard_error"])
            cell = (effect, cohort_size)
            expected_se = (
                _coverage_standard_error(coverage_rate, replication_count)
                if replication_count > 0 and math.isfinite(coverage_rate)
                else float("nan")
            )
            if (
                not _nonempty_string(scenario["scenario_id"])
                or cell in observed
                or effect not in CALIBRATION_EFFECT_SIZES
                or cohort_size not in CALIBRATION_COHORT_SIZES
                or replication_count < INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
                or float(scenario["credible_interval_level"]) != CREDIBLE_INTERVAL_LEVEL
                or not math.isfinite(coverage_rate)
                or not 0.0 <= coverage_rate <= 1.0
                or not math.isfinite(coverage_standard_error)
                or coverage_standard_error < 0.0
                or not math.isfinite(expected_se)
                or abs(coverage_standard_error - expected_se)
                > INFERENCE_PROOF_FLOAT_TOLERANCE
                or not isinstance(scenario["pass"], bool)
            ):
                return False
            observed.add(cell)
        return observed == {
            (effect, cohort_size)
            for effect in CALIBRATION_EFFECT_SIZES
            for cohort_size in CALIBRATION_COHORT_SIZES
        }
    except (AttributeError, KeyError, TypeError, ValueError):
        return False


def _null_checks_section_valid(artifact: dict) -> bool:
    try:
        checks = artifact["null_checks"]
        count = _strict_int(checks["null_effect_scenario_count"])
        rate = float(checks["false_eligibility_rate"])
        return bool(
            set(checks.keys())
            == {"null_effect_scenario_count", "false_eligibility_rate", "pass"}
            and count >= INFERENCE_PROOF_NULL_REPLICATIONS_MIN
            and math.isfinite(rate)
            and 0.0 <= rate <= 1.0
            and isinstance(checks["pass"], bool)
        )
    except (AttributeError, KeyError, TypeError, ValueError):
        return False


def _floor_checks_section_valid(artifact: dict) -> bool:
    try:
        checks = artifact["floor_checks"]
        if set(checks.keys()) != {
            "k4_rejected",
            "k8_internal_only",
            "eligible_floor_cases",
        }:
            return False
        k4 = checks["k4_rejected"]
        k8 = checks["k8_internal_only"]
        eligible_cases = checks["eligible_floor_cases"]
        if (
            k4
            != {
                "cohort_size": 4,
                "outcome": "rejected_below_schema_floor",
                "pass": True,
            }
            or k8
            != {
                "cohort_size": 8,
                "outcome": "internal_only_display_ineligible",
                "valid_internal": True,
                "display_eligible": False,
                "pass": True,
            }
            or not isinstance(eligible_cases, list)
            or len(eligible_cases) != 2
        ):
            return False
        observed = set()
        for case in eligible_cases:
            if set(case.keys()) != {
                "cohort_size",
                "valid_internal",
                "display_eligible",
                "pass",
            }:
                return False
            cohort_size = _strict_int(case["cohort_size"])
            if case != {
                "cohort_size": cohort_size,
                "valid_internal": True,
                "display_eligible": True,
                "pass": True,
            }:
                return False
            observed.add(cohort_size)
        return observed == {12, 16}
    except (AttributeError, KeyError, TypeError, ValueError):
        return False


def _peeking_control_section_valid(artifact: dict) -> bool:
    try:
        control = artifact["peeking_control"]
        if set(control.keys()) != {
            "procedure",
            "repeated_evaluation",
            "look_index",
            "total_planned_looks",
            "milestone_days_included",
            "metrics_included",
            "cohorts_included",
            "metric_family_bound",
            "cohort_family_bound",
            "sequential_method_name",
            "synthetic_null_proof_hash",
            "false_eligibility_bound",
            "pass",
        }:
            return False
        procedure = control["procedure"]
        look_index = _strict_int(control["look_index"])
        total_planned_looks = _strict_int(control["total_planned_looks"])
        if (
            procedure
            not in {
                "fixed_horizon_one_look_only",
                "always_valid_sequential_procedure_proven",
            }
            or not isinstance(control["repeated_evaluation"], bool)
            or look_index <= 0
            or total_planned_looks <= 0
            or not _nonempty_list(control["milestone_days_included"])
            or not _nonempty_list(control["metrics_included"])
            or not _nonempty_list(control["cohorts_included"])
            or not isinstance(control["metric_family_bound"], bool)
            or not isinstance(control["cohort_family_bound"], bool)
            or float(control["false_eligibility_bound"])
            != INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
            or not isinstance(control["pass"], bool)
        ):
            return False
        if procedure == "fixed_horizon_one_look_only":
            return bool(
                look_index == 1
                and total_planned_looks == 1
                and len(control["milestone_days_included"]) == 1
                and len(control["metrics_included"]) == 1
                and len(control["cohorts_included"]) == 1
                and control["sequential_method_name"] is None
                and control["synthetic_null_proof_hash"] is None
            )
        return bool(
            control["repeated_evaluation"] is True
            and _nonempty_string(control["sequential_method_name"])
            and _sha256_hex(control["synthetic_null_proof_hash"])
        )
    except (AttributeError, KeyError, TypeError, ValueError):
        return False


def _comparison_adequacy_section_valid(artifact: dict) -> bool:
    try:
        adequacy = artifact["comparison_adequacy"]
        if set(adequacy.keys()) != {
            "comparison_cohort_present",
            "adequacy_proof_hash",
            "reviewer_owned_comparison_design_adequacy_ref",
            "required_checks",
            "all_required_checks_pass",
        }:
            return False
        checks = adequacy["required_checks"]
        if (
            not isinstance(adequacy["comparison_cohort_present"], bool)
            or not _sha256_hex(adequacy["adequacy_proof_hash"])
            or not (
                adequacy["reviewer_owned_comparison_design_adequacy_ref"] is None
                or _nonempty_string(
                    adequacy["reviewer_owned_comparison_design_adequacy_ref"]
                )
            )
            or not isinstance(checks, list)
            or len(checks) != len(INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA)
            or not isinstance(adequacy["all_required_checks_pass"], bool)
        ):
            return False
        observed: set[str] = set()
        for check in checks:
            if set(check.keys()) != {"criterion", "pass"}:
                return False
            criterion = check["criterion"]
            if (
                criterion not in INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA
                or criterion in observed
                or not isinstance(check["pass"], bool)
            ):
                return False
            observed.add(criterion)
        computed_pass = adequacy["comparison_cohort_present"] and all(
            check["pass"] for check in checks
        )
        return bool(
            tuple(check["criterion"] for check in checks)
            == INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA
            and adequacy["all_required_checks_pass"] == computed_pass
        )
    except (AttributeError, KeyError, TypeError):
        return False


def _artifact_gate_failures(artifact: dict) -> set[str]:
    failures: set[str] = set()
    try:
        diagnostics = artifact["diagnostics"]
        sampler = diagnostics["sampler"]
        parameters = sampler["parameters"]
        if not any(
            parameter["parameter_name"] == INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME
            for parameter in parameters
        ):
            failures.add("sampler_diagnostic")
        for parameter in parameters:
            if float(parameter["r_hat"]) > INFERENCE_PROOF_RHAT_MAX:
                failures.add("r_hat")
            if float(parameter["bulk_ess"]) < INFERENCE_PROOF_ESS_MIN:
                failures.add("bulk_ess")
            if float(parameter["tail_ess"]) < INFERENCE_PROOF_ESS_MIN:
                failures.add("tail_ess")
            if (
                float(parameter["max_mcse_to_posterior_sd_ratio"])
                > INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX
            ):
                failures.add("mcse")
        if int(sampler["post_warmup_divergences"]) > 0:
            failures.add("divergences")
        if (
            sampler["max_treedepth_warning"] is True
            or float(sampler["max_treedepth_saturation_rate"]) > 0
        ):
            failures.add("max_treedepth_saturation")
        if sampler["energy_bfmi_warning"] is True:
            failures.add("energy_bfmi")

        ppcs = diagnostics["posterior_predictive_checks"]
        if not isinstance(ppcs, list):
            failures.add("posterior_predictive_check")
        else:
            for statistic in ppcs:
                p_value = float(statistic["p_value"])
                if (
                    statistic["pass"] is not True
                    or p_value < INFERENCE_PROOF_PPC_P_VALUE_MIN
                    or p_value > INFERENCE_PROOF_PPC_P_VALUE_MAX
                ):
                    failures.add("posterior_predictive_check")

        sensitivity = diagnostics["prior_sensitivity"]
        if (
            sensitivity["empirical_prior_justification_documented"] is not True
            or not _nonempty_string(sensitivity["empirical_prior_justification_ref"])
            or not _sha256_hex(sensitivity["empirical_prior_justification_hash"])
            or sensitivity["pass"] is not True
            or float(sensitivity["posterior_mean_shift_in_posterior_sd"])
            >= INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD
        ):
            failures.add("prior_sensitivity")

        pre_trend = diagnostics["pre_trend"]
        if pre_trend["pass"] is not True or pre_trend["includes_zero"] is not True:
            failures.add("pre_trend")

        binding = artifact["model_spec_binding"]
        if (
            binding["likelihood_family"] != SUPPORTED_LIKELIHOOD_FAMILY
            or binding["link_function"]
            != LIKELIHOOD_FAMILY_LINKS[SUPPORTED_LIKELIHOOD_FAMILY]
        ):
            failures.add("unsupported_likelihood_family")

        window = artifact["measurement_cell_window_evidence"]
        if sorted(window["required_milestone_days"]) != sorted(
            artifact["peeking_control"]["milestone_days_included"]
        ):
            failures.add("missing_or_suppressed_windows")
        planned_milestones = set(artifact["peeking_control"]["milestone_days_included"])
        observed_or_sidecar_milestones = (
            window["observed_milestone_days"]
            + window["suppressed_milestone_days"]
            + window["stale_milestone_days"]
            + window["imputed_milestone_days"]
        )
        if any(day not in planned_milestones for day in observed_or_sidecar_milestones):
            failures.add("peeking_control")
        if (
            window["all_required_windows_observed"] is not True
            or window["all_windows_unsuppressed_and_fresh"] is not True
            or window["imputation_used"] is True
            or window["missing_window_refs"]
            or window["suppressed_window_refs"]
            or window["stale_window_refs"]
            or window["imputed_window_refs"]
        ):
            failures.add("missing_or_suppressed_windows")

        for scenario in artifact["calibration"]["scenarios"]:
            coverage_rate = float(scenario["coverage_rate"])
            if (
                scenario["pass"] is not True
                or coverage_rate < INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN
                or coverage_rate > INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
            ):
                failures.add("calibration_coverage")
        null_checks = artifact["null_checks"]
        if (
            null_checks["pass"] is not True
            or float(null_checks["false_eligibility_rate"])
            > INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
        ):
            failures.add("null_false_eligibility")
        peeking = artifact["peeking_control"]
        if (
            peeking["pass"] is not True
            or (
                peeking["procedure"] == "fixed_horizon_one_look_only"
                and peeking["repeated_evaluation"] is True
            )
            or int(peeking["look_index"]) > int(peeking["total_planned_looks"])
        ):
            failures.add("peeking_control")
        if artifact["comparison_adequacy"]["all_required_checks_pass"] is not True:
            failures.add("comparison_cohort_adequacy")
        governance = artifact["governance_state"]
        if (
            governance["state"] == "HOLD"
            and "floor_check" in governance["failing_diagnostics"]
            and artifact["floor_checks"]["k4_rejected"]
            == {
                "cohort_size": 4,
                "outcome": "rejected_below_schema_floor",
                "pass": True,
            }
        ):
            failures.add("floor_check")
    except (AttributeError, KeyError, TypeError, ValueError):
        failures.add("sampler_diagnostic")
    return failures


def _nonempty_string(value: object) -> bool:
    return isinstance(value, str) and value != ""


def _nonempty_list(value: object) -> bool:
    return isinstance(value, list) and len(value) > 0


def _strict_int(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("expected integer")
    return value


def _strict_int_list(value: object) -> list[int] | None:
    if not isinstance(value, list):
        return None
    parsed: list[int] = []
    for item in value:
        if isinstance(item, bool) or not isinstance(item, int):
            return None
        parsed.append(item)
    return parsed


def _all_finite(*values: object) -> bool:
    try:
        return all(math.isfinite(float(value)) for value in values)
    except (TypeError, ValueError):
        return False


_SHA256_HEX_RE = re.compile(r"^[0-9a-f]{64}$")


def _sha256_hex(value: object) -> bool:
    return isinstance(value, str) and bool(_SHA256_HEX_RE.fullmatch(value))


def _artifact_synthetic_input_hash(artifact: dict | None) -> str | None:
    if not isinstance(artifact, dict):
        return None
    try:
        return str(artifact["hash_bindings"]["synthetic_input_hash"])
    except (KeyError, TypeError):
        return None


def _source_posterior_hash_matches_artifact(
    artifact: dict | None, estimand_summary: dict
) -> bool:
    if not isinstance(artifact, dict):
        return False
    try:
        return artifact["hash_bindings"]["source_posterior_hash"] == sha256_json(
            estimand_summary
        )
    except (KeyError, TypeError):
        return False


def _governance_state_consistent(artifact: dict) -> bool:
    try:
        governance = artifact["governance_state"]
        state = governance["state"]
        comparison_authorized = governance[
            "comparison_supported_contribution_estimate_authorized"
        ]
        failing = governance["failing_diagnostics"]
        evidence_tier_only = governance["evidence_tier_only"]
        if not isinstance(failing, list) or any(
            diagnostic not in INFERENCE_PROOF_FAILING_DIAGNOSTICS
            for diagnostic in failing
        ):
            return False
        section_failures = _artifact_gate_failures(artifact)
        if state == "eligible_internal_only":
            return bool(
                evidence_tier_only is False
                and isinstance(comparison_authorized, bool)
                and artifact["comparison_adequacy"][
                    "all_required_checks_pass"
                ]
                is True
                and failing == []
                and not section_failures
            )
        if state == "HOLD":
            return bool(
                comparison_authorized is False
                and len(failing) > 0
                and set(failing) == section_failures
            )
    except (KeyError, TypeError):
        return False
    return False


def _artifact_required_sections_present(artifact: dict) -> bool:
    try:
        return bool(
            _nonempty_string(artifact["model_spec_binding"]["model_family"])
            and _nonempty_string(artifact["model_spec_binding"]["estimand_name"])
            and _nonempty_string(artifact["model_spec_binding"]["likelihood_family"])
            and _sha256_hex(
                artifact["measurement_cell_window_evidence"][
                    "measurement_cell_window_evidence_hash"
                ]
            )
            and isinstance(
                artifact["measurement_cell_window_evidence"]["required_window_refs"],
                list,
            )
            and isinstance(artifact["diagnostics"]["sampler"]["parameters"], list)
            and len(artifact["diagnostics"]["sampler"]["parameters"]) > 0
            and isinstance(artifact["diagnostics"]["pre_trend"], dict)
            and isinstance(artifact["calibration"]["scenarios"], list)
            and len(artifact["calibration"]["scenarios"]) > 0
            and "false_eligibility_rate" in artifact["null_checks"]
            and "k4_rejected" in artifact["floor_checks"]
            and "pass" in artifact["peeking_control"]
            and "all_required_checks_pass" in artifact["comparison_adequacy"]
            and isinstance(artifact["blocked_uses"], list)
            and len(artifact["blocked_uses"]) > 0
        )
    except (KeyError, TypeError):
        return False


def _governance_fields(artifact: dict | None) -> tuple[str, tuple[str, ...], bool]:
    if not isinstance(artifact, dict):
        return "MISSING", (), False
    governance = artifact.get("governance_state", {})
    return (
        str(governance.get("state")),
        tuple(governance.get("failing_diagnostics", ())),
        bool(governance.get("comparison_supported_contribution_estimate_authorized")),
    )


def _artifact_self_hash(artifact: dict | None) -> str | None:
    if not isinstance(artifact, dict):
        return None
    try:
        return str(artifact["hash_bindings"]["artifact_self_hash"])
    except (KeyError, TypeError):
        return None


def _blocked_outputs() -> dict:
    return {
        "customer_output": False,
        "probability_output": False,
        "confidence_output": False,
        "finance_output": False,
        "roi_output": False,
        "causality_claim": False,
        "productivity_claim": False,
        "route_creation": False,
        "ui_creation": False,
        "schema_creation": False,
        "persistence_write": False,
        "export_creation": False,
        "connector_execution": False,
    }
