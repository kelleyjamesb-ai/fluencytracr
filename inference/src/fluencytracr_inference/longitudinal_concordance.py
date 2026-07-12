"""Exact-slot state-space/NUTS concordance runner and summary types."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import math
from typing import Literal

from .hashing import sha256_json
from .longitudinal_nuts import LongitudinalNutsFit, fit_longitudinal_nuts_reference
from .longitudinal_state_space import (
    DeterministicStateSpaceFit,
    PosteriorQuantitySummary,
    fit_deterministic_state_space,
    prepare_longitudinal_state_space,
)
from .longitudinal_validation_synthetic import (
    LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD,
    LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS,
    generate_longitudinal_validation_case,
)
from .longitudinal_types import validate_longitudinal_seed

LONGITUDINAL_CONCORDANCE_SEEDS = (
    202607120,
    202607121,
    202607122,
    202607123,
    202607124,
)
LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT = 30
LONGITUDINAL_CONCORDANCE_MEAN_MAX_REFERENCE_SD = 0.15
LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD = 0.20
LONGITUDINAL_CONCORDANCE_SD_RATIO_MIN = 0.85
LONGITUDINAL_CONCORDANCE_SD_RATIO_MAX = 1.15
LONGITUDINAL_CONCORDANCE_PLAN_VERSION = "1.0.0"

_RUNNER_TOKEN = object()


@dataclass(frozen=True, order=True)
class LongitudinalConcordanceSlot:
    effect_size_sd: float
    panel_group_count: int
    seed: int

    @property
    def slot_id(self) -> str:
        effect_token = str(self.effect_size_sd).replace(".", "p")
        return (
            f"effect_{effect_token}__groups_{self.panel_group_count}__seed_{self.seed}"
        )

    @property
    def cell_id(self) -> str:
        effect_token = str(self.effect_size_sd).replace(".", "p")
        return f"effect_{effect_token}__groups_{self.panel_group_count}"

    def to_dict(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "cell_id": self.cell_id,
            "effect_size_sd": float(self.effect_size_sd),
            "panel_group_count": int(self.panel_group_count),
            "seed": int(self.seed),
        }


@dataclass(frozen=True)
class QuantityConcordance:
    quantity_name: str
    primary: PosteriorQuantitySummary
    reference: PosteriorQuantitySummary
    absolute_mean_difference_reference_sd: float
    lower_endpoint_difference_reference_sd: float
    upper_endpoint_difference_reference_sd: float
    primary_to_reference_sd_ratio: float
    passed: bool

    def to_dict(self) -> dict:
        return {
            "quantity_name": self.quantity_name,
            "primary_summary": self.primary.to_dict(),
            "reference_summary": self.reference.to_dict(),
            "absolute_mean_difference_reference_sd": float(
                self.absolute_mean_difference_reference_sd
            ),
            "lower_endpoint_difference_reference_sd": float(
                self.lower_endpoint_difference_reference_sd
            ),
            "upper_endpoint_difference_reference_sd": float(
                self.upper_endpoint_difference_reference_sd
            ),
            "primary_to_reference_sd_ratio": float(
                self.primary_to_reference_sd_ratio
            ),
            "passed": bool(self.passed),
        }


@dataclass(frozen=True)
class LongitudinalConcordanceSlotResult:
    slot: LongitudinalConcordanceSlot
    execution_mode: Literal["full", "smoke"]
    status: Literal["PASS", "HOLD"]
    failing_checks: tuple[str, ...]
    prepared_input_hash: str | None
    model_input_hash: str | None
    context_binding_hash: str | None
    truth_receipt_hash: str | None
    case_binding_hash: str | None
    primary_fit_summary_hash: str | None
    reference_fit_summary_hash: str | None
    primary_integration_diagnostics: dict | None
    reference_settings: dict | None
    reference_sampler_diagnostics: dict | None
    posterior_predictive_checks: tuple[dict, ...]
    quantity_concordance: tuple[QuantityConcordance, ...]
    runner_error_stage: str | None = None
    runner_error_type: str | None = None
    slot_result_hash: str = ""

    @property
    def passed(self) -> bool:
        return self.status == "PASS" and not self.failing_checks

    def body_without_hash(self) -> dict:
        return {
            **self.slot.to_dict(),
            "execution_mode": self.execution_mode,
            "status": self.status,
            "failing_checks": list(self.failing_checks),
            "prepared_input_hash": self.prepared_input_hash,
            "model_input_hash": self.model_input_hash,
            "context_binding_hash": self.context_binding_hash,
            "truth_receipt_hash": self.truth_receipt_hash,
            "case_binding_hash": self.case_binding_hash,
            "primary_fit_summary_hash": self.primary_fit_summary_hash,
            "reference_fit_summary_hash": self.reference_fit_summary_hash,
            "primary_integration_diagnostics": self.primary_integration_diagnostics,
            "reference_settings": self.reference_settings,
            "reference_sampler_diagnostics": self.reference_sampler_diagnostics,
            "posterior_predictive_checks": list(self.posterior_predictive_checks),
            "quantity_concordance": [item.to_dict() for item in self.quantity_concordance],
            "runner_error_stage": self.runner_error_stage,
            "runner_error_type": self.runner_error_type,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "slot_result_hash": self.slot_result_hash}


@dataclass(frozen=True)
class LongitudinalConcordanceStudyResult:
    execution_mode: Literal["full", "smoke"]
    planned_slots: tuple[LongitudinalConcordanceSlot, ...]
    slot_results: tuple[LongitudinalConcordanceSlotResult, ...]
    missing_slot_ids: tuple[str, ...]
    duplicate_slot_ids: tuple[str, ...]
    off_plan_slot_ids: tuple[str, ...]
    duplicate_evidence_binding_hashes: tuple[str, ...]
    all_slots_passed: bool
    exact_manifest_complete: bool
    study_status: Literal["PASS", "HOLD"]
    failing_checks: tuple[str, ...]
    plan_hash: str
    study_result_hash: str
    _runner_token: object = field(repr=False, compare=False, default=None)

    @property
    def passed(self) -> bool:
        return self.study_status == "PASS" and self.exact_manifest_complete and self.all_slots_passed

    def to_summary_dict(self) -> dict:
        return {
            "execution_mode": self.execution_mode,
            "planned_slot_count": len(self.planned_slots),
            "executed_slot_count": len(self.slot_results),
            "missing_slot_ids": list(self.missing_slot_ids),
            "duplicate_slot_ids": list(self.duplicate_slot_ids),
            "off_plan_slot_ids": list(self.off_plan_slot_ids),
            "duplicate_evidence_binding_hashes": list(
                self.duplicate_evidence_binding_hashes
            ),
            "all_slots_passed": self.all_slots_passed,
            "exact_manifest_complete": self.exact_manifest_complete,
            "study_status": self.study_status,
            "failing_checks": list(self.failing_checks),
            "plan_hash": self.plan_hash,
            "study_result_hash": self.study_result_hash,
        }


def required_longitudinal_concordance_slots() -> tuple[LongitudinalConcordanceSlot, ...]:
    slots = tuple(
        LongitudinalConcordanceSlot(effect, groups, seed)
        for effect in LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD
        for groups in LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS
        for seed in LONGITUDINAL_CONCORDANCE_SEEDS
    )
    if len(slots) != LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT:
        raise AssertionError("compiled concordance plan must contain exactly 30 slots")
    return slots


def longitudinal_concordance_plan() -> dict:
    slots = required_longitudinal_concordance_slots()
    body = {
        "plan_version": LONGITUDINAL_CONCORDANCE_PLAN_VERSION,
        "effect_sizes_sd": list(LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD),
        "panel_group_counts": list(LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS),
        "seeds": list(LONGITUDINAL_CONCORDANCE_SEEDS),
        "required_slot_count": LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT,
        "slot_ids": [slot.slot_id for slot in slots],
        "compiled_concordance_gates": {
            "mean_max_reference_sd": LONGITUDINAL_CONCORDANCE_MEAN_MAX_REFERENCE_SD,
            "endpoint_max_reference_sd": LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD,
            "sd_ratio_min": LONGITUDINAL_CONCORDANCE_SD_RATIO_MIN,
            "sd_ratio_max": LONGITUDINAL_CONCORDANCE_SD_RATIO_MAX,
        },
    }
    return {**body, "plan_hash": sha256_json(body)}


def evaluate_quantity_concordance(
    primary: PosteriorQuantitySummary,
    reference: PosteriorQuantitySummary,
) -> QuantityConcordance:
    if primary.quantity_name != reference.quantity_name:
        raise ValueError("concordance summaries must name the same quantity")
    reference_sd = float(reference.posterior_sd)
    if not math.isfinite(reference_sd) or reference_sd <= 0.0:
        raise ValueError("reference posterior SD must be finite and positive")
    operands = (
        primary.posterior_mean,
        primary.posterior_sd,
        primary.interval_80_lower,
        primary.interval_80_upper,
        reference.posterior_mean,
        reference.interval_80_lower,
        reference.interval_80_upper,
    )
    if not all(math.isfinite(value) for value in operands) or primary.posterior_sd <= 0.0:
        raise ValueError("concordance summaries must be finite with positive SD")
    mean_difference = abs(primary.posterior_mean - reference.posterior_mean) / reference_sd
    lower_difference = abs(primary.interval_80_lower - reference.interval_80_lower) / reference_sd
    upper_difference = abs(primary.interval_80_upper - reference.interval_80_upper) / reference_sd
    sd_ratio = primary.posterior_sd / reference_sd
    passed = (
        mean_difference <= LONGITUDINAL_CONCORDANCE_MEAN_MAX_REFERENCE_SD
        and lower_difference <= LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD
        and upper_difference <= LONGITUDINAL_CONCORDANCE_ENDPOINT_MAX_REFERENCE_SD
        and LONGITUDINAL_CONCORDANCE_SD_RATIO_MIN
        <= sd_ratio
        <= LONGITUDINAL_CONCORDANCE_SD_RATIO_MAX
    )
    return QuantityConcordance(
        quantity_name=primary.quantity_name,
        primary=primary,
        reference=reference,
        absolute_mean_difference_reference_sd=mean_difference,
        lower_endpoint_difference_reference_sd=lower_difference,
        upper_endpoint_difference_reference_sd=upper_difference,
        primary_to_reference_sd_ratio=sd_ratio,
        passed=passed,
    )


def evaluate_longitudinal_concordance(
    primary: DeterministicStateSpaceFit,
    reference: LongitudinalNutsFit,
) -> tuple[QuantityConcordance, ...]:
    if primary.prepared is not reference.prepared:
        raise ValueError("both engines must consume the same prepared-input object")
    if primary.prepared.prepared_input_hash != reference.prepared.prepared_input_hash:
        raise ValueError("both engines must bind the same prepared-input hash")
    required_quantity_names = (
        *primary.prepared.fixed_effect_names,
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
    )
    primary_quantity_names = tuple(
        summary.quantity_name for summary in primary.summaries
    )
    reference_quantity_names = tuple(
        summary.quantity_name for summary in reference.summaries
    )
    if (
        primary_quantity_names != required_quantity_names
        or reference_quantity_names != required_quantity_names
    ):
        raise ValueError("both engines must report the exact ordered quantity manifest")
    primary_summaries = primary.summary_by_name()
    reference_summaries = reference.summary_by_name()
    if set(primary_summaries) != set(reference_summaries):
        raise ValueError("both engines must report the exact same quantity set")
    return tuple(
        evaluate_quantity_concordance(
            primary_summaries[name], reference_summaries[name]
        )
        for name in primary_summaries
    )


def _slot_result_with_hash(**kwargs) -> LongitudinalConcordanceSlotResult:
    unbound = LongitudinalConcordanceSlotResult(**kwargs)
    return LongitudinalConcordanceSlotResult(
        **{**kwargs, "slot_result_hash": sha256_json(unbound.body_without_hash())}
    )


def _case_binding_hash(
    slot: LongitudinalConcordanceSlot,
    *,
    prepared_input_hash: str,
    model_input_hash: str,
    context_binding_hash: str,
    truth_receipt_hash: str,
) -> str:
    return sha256_json(
        {
            "slot": slot.to_dict(),
            "prepared_input_hash": prepared_input_hash,
            "model_input_hash": model_input_hash,
            "context_binding_hash": context_binding_hash,
            "truth_receipt_hash": truth_receipt_hash,
        }
    )


def _fit_binding_hash(
    *, case_binding_hash: str | None, engine_fit_summary_hash: str | None
) -> str | None:
    if case_binding_hash is None or engine_fit_summary_hash is None:
        return None
    return sha256_json(
        {
            "case_binding_hash": case_binding_hash,
            "engine_fit_summary_hash": engine_fit_summary_hash,
        }
    )


def run_longitudinal_concordance_slot(
    slot: LongitudinalConcordanceSlot,
    *,
    mode: Literal["full", "smoke"],
) -> LongitudinalConcordanceSlotResult:
    if mode not in ("full", "smoke"):
        raise ValueError("concordance execution mode must be full or smoke")
    if slot not in required_longitudinal_concordance_slots():
        raise ValueError("concordance slot is not in the compiled plan")
    validate_longitudinal_seed(slot.seed, name="concordance slot seed")
    prepared = None
    truth_hash = None
    case_hash = None
    primary = None
    stage = "generate"
    try:
        case = generate_longitudinal_validation_case(
            effect_size_sd=slot.effect_size_sd,
            panel_group_count=slot.panel_group_count,
            seed=slot.seed,
        )
        truth_hash = sha256_json(asdict(case.truth))
        stage = "prepare"
        prepared = prepare_longitudinal_state_space(case.dataset)
        case_hash = _case_binding_hash(
            slot,
            prepared_input_hash=prepared.prepared_input_hash,
            model_input_hash=prepared.model_input_hash,
            context_binding_hash=prepared.context_binding_hash,
            truth_receipt_hash=truth_hash,
        )
        stage = "primary"
        primary = fit_deterministic_state_space(prepared, seed=slot.seed)
        stage = "reference"
        reference = fit_longitudinal_nuts_reference(
            prepared, seed=slot.seed, mode=mode
        )
        stage = "concordance"
        concordance = evaluate_longitudinal_concordance(primary, reference)
    except Exception as exc:
        return _slot_result_with_hash(
            slot=slot,
            execution_mode=mode,
            status="HOLD",
            failing_checks=("runner_error",),
            prepared_input_hash=(prepared.prepared_input_hash if prepared else None),
            model_input_hash=(prepared.model_input_hash if prepared else None),
            context_binding_hash=(prepared.context_binding_hash if prepared else None),
            truth_receipt_hash=truth_hash,
            case_binding_hash=case_hash,
            primary_fit_summary_hash=None,
            reference_fit_summary_hash=None,
            primary_integration_diagnostics=None,
            reference_settings=None,
            reference_sampler_diagnostics=None,
            posterior_predictive_checks=(),
            quantity_concordance=(),
            runner_error_stage=stage,
            runner_error_type=type(exc).__name__,
        )

    failures = []
    if mode != "full" or not reference.settings.full_settings:
        failures.append("full_sampler_settings")
    failures.extend(reference.sampler_diagnostics["failing_diagnostics"])
    if not all(check.passed for check in reference.posterior_predictive_checks):
        failures.append("posterior_predictive_check")
    if not all(item.passed for item in concordance):
        failures.append("cross_engine_concordance")
    failures = list(dict.fromkeys(failures))
    primary_engine_fit_hash = primary.fit_summary_hash()
    reference_engine_fit_hash = reference.fit_summary_hash()
    primary_fit_binding_hash = _fit_binding_hash(
        case_binding_hash=case_hash,
        engine_fit_summary_hash=primary_engine_fit_hash,
    )
    reference_fit_binding_hash = _fit_binding_hash(
        case_binding_hash=case_hash,
        engine_fit_summary_hash=reference_engine_fit_hash,
    )
    return _slot_result_with_hash(
        slot=slot,
        execution_mode=mode,
        status="PASS" if not failures else "HOLD",
        failing_checks=tuple(failures),
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        context_binding_hash=prepared.context_binding_hash,
        truth_receipt_hash=truth_hash,
        case_binding_hash=case_hash,
        primary_fit_summary_hash=primary_fit_binding_hash,
        reference_fit_summary_hash=reference_fit_binding_hash,
        primary_integration_diagnostics=primary.integration_diagnostics,
        reference_settings=reference.settings.to_dict(),
        reference_sampler_diagnostics=reference.sampler_diagnostics,
        posterior_predictive_checks=tuple(
            check.to_dict() for check in reference.posterior_predictive_checks
        ),
        quantity_concordance=concordance,
    )


def assemble_longitudinal_concordance_study(
    slot_results: tuple[LongitudinalConcordanceSlotResult, ...],
    *,
    execution_mode: Literal["full", "smoke"],
    _token: object | None = None,
) -> LongitudinalConcordanceStudyResult:
    if _token is not _RUNNER_TOKEN:
        raise ValueError("concordance study assembly is runner-owned")
    planned = required_longitudinal_concordance_slots()
    planned_ids = tuple(slot.slot_id for slot in planned)
    result_ids = tuple(result.slot.slot_id for result in slot_results)
    duplicates = tuple(sorted({slot_id for slot_id in result_ids if result_ids.count(slot_id) > 1}))
    off_plan = tuple(sorted(set(result_ids).difference(planned_ids)))
    missing = tuple(slot_id for slot_id in planned_ids if slot_id not in result_ids)
    evidence_bindings: list[tuple[str, str]] = []
    for result in slot_results:
        for name in (
            "prepared_input_hash",
            "model_input_hash",
            "context_binding_hash",
            "truth_receipt_hash",
            "case_binding_hash",
            "primary_fit_summary_hash",
            "reference_fit_summary_hash",
        ):
            value = getattr(result, name)
            if value is not None:
                evidence_bindings.append((name, value))
    duplicate_evidence_bindings = tuple(
        sorted(
            f"{name}:{value}"
            for name, value in set(evidence_bindings)
            if evidence_bindings.count((name, value)) > 1
        )
    )
    exact_manifest = (
        not missing
        and not duplicates
        and not off_plan
        and not duplicate_evidence_bindings
        and len(slot_results) == LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT
    )
    all_passed = bool(slot_results) and all(result.passed for result in slot_results)
    failures = []
    if execution_mode != "full":
        failures.append("full_study_settings")
    if missing:
        failures.append("missing_slots")
    if duplicates:
        failures.append("duplicate_slots")
    if off_plan:
        failures.append("off_plan_slots")
    if duplicate_evidence_bindings:
        failures.append("duplicate_evidence_bindings")
    if not all_passed:
        failures.append("slot_failures")
    plan = longitudinal_concordance_plan()
    result_body = {
        "execution_mode": execution_mode,
        "plan_hash": plan["plan_hash"],
        "slot_result_hashes": [result.slot_result_hash for result in slot_results],
        "missing_slot_ids": list(missing),
        "duplicate_slot_ids": list(duplicates),
        "off_plan_slot_ids": list(off_plan),
        "duplicate_evidence_binding_hashes": list(duplicate_evidence_bindings),
        "all_slots_passed": all_passed,
        "exact_manifest_complete": exact_manifest,
        "failing_checks": failures,
    }
    return LongitudinalConcordanceStudyResult(
        execution_mode=execution_mode,
        planned_slots=planned,
        slot_results=slot_results,
        missing_slot_ids=missing,
        duplicate_slot_ids=duplicates,
        off_plan_slot_ids=off_plan,
        duplicate_evidence_binding_hashes=duplicate_evidence_bindings,
        all_slots_passed=all_passed,
        exact_manifest_complete=exact_manifest,
        study_status=(
            "PASS"
            if execution_mode == "full" and exact_manifest and all_passed
            else "HOLD"
        ),
        failing_checks=tuple(failures),
        plan_hash=plan["plan_hash"],
        study_result_hash=sha256_json(result_body),
        _runner_token=_RUNNER_TOKEN,
    )


def run_longitudinal_concordance_study(
    *,
    mode: Literal["full", "smoke"],
) -> LongitudinalConcordanceStudyResult:
    if mode not in ("full", "smoke"):
        raise ValueError("concordance execution mode must be full or smoke")
    planned = required_longitudinal_concordance_slots()
    selected = planned if mode == "full" else planned[:1]
    results = tuple(
        run_longitudinal_concordance_slot(slot, mode=mode) for slot in selected
    )
    return assemble_longitudinal_concordance_study(
        results, execution_mode=mode, _token=_RUNNER_TOKEN
    )


def is_runner_generated_concordance_study(
    study: LongitudinalConcordanceStudyResult,
) -> bool:
    return (
        isinstance(study, LongitudinalConcordanceStudyResult)
        and study._runner_token is _RUNNER_TOKEN
    )
