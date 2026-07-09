"""Internal synthetic negative-control study report for task 3.3.

This module is a sidecar verifier, not an artifact-schema extension. It uses
the proof artifact emitter as the system under test, then summarizes whether
required synthetic controls HOLD or remain internal-only as expected. The
report is internal study evidence only and never authorizes customer,
probability, confidence, finance, ROI, causality, productivity, route, UI,
persistence, export, or connector output.
"""

from __future__ import annotations

from dataclasses import dataclass

from .acceptance_study import (
    _artifact_valid_internal_only as _strict_artifact_valid_internal_only,
    _blocked_outputs,
)
from .synthetic import (
    SyntheticDataset,
    generate_did_dataset,
    generate_mismatched_comparison,
    generate_missing_windows,
    generate_no_comparison_cohort,
    generate_prior_dominated_weak,
    generate_suppressed_windows,
    generate_violated_pre_trend,
)

DEFAULT_NEGATIVE_CONTROL_BASE_SEED = 202607180


@dataclass(frozen=True)
class NegativeControlCase:
    control_id: str
    seed_offset: int
    expected_failing_diagnostics: tuple[str, ...]
    expected_evidence_tier_only: bool = False
    repeated_evaluation_detected: bool = False


@dataclass(frozen=True)
class FloorControlCase:
    control_id: str
    seed_offset: int
    k: int
    expected_state: str
    expected_failing_diagnostics: tuple[str, ...]
    valid_internal: bool
    display_eligible: bool


@dataclass(frozen=True)
class ControlReportResult:
    control_id: str
    artifact_valid: bool
    artifact_bound_to_expected_input: bool
    section_evidence_matches: bool
    governance_state: str
    failing_diagnostics: tuple[str, ...]
    expected_failing_diagnostics: tuple[str, ...]
    unexpected_failing_diagnostics: tuple[str, ...]
    comparison_supported_contribution_estimate_authorized: bool
    evidence_tier_only: bool
    pass_: bool

    def to_report_section(self) -> dict:
        return {
            "control_id": self.control_id,
            "artifact_valid": self.artifact_valid,
            "artifact_bound_to_expected_input": self.artifact_bound_to_expected_input,
            "section_evidence_matches": self.section_evidence_matches,
            "governance_state": self.governance_state,
            "failing_diagnostics": list(self.failing_diagnostics),
            "expected_failing_diagnostics": list(self.expected_failing_diagnostics),
            "unexpected_failing_diagnostics": list(self.unexpected_failing_diagnostics),
            "comparison_supported_contribution_estimate_authorized": (
                self.comparison_supported_contribution_estimate_authorized
            ),
            "evidence_tier_only": self.evidence_tier_only,
            "pass": self.pass_,
        }


@dataclass(frozen=True)
class FloorReportResult:
    control_id: str
    artifact_valid: bool
    artifact_bound_to_expected_input: bool
    section_evidence_matches: bool
    governance_state: str
    failing_diagnostics: tuple[str, ...]
    expected_state: str
    expected_failing_diagnostics: tuple[str, ...]
    expected_valid_internal: bool
    expected_display_eligible: bool
    observed_valid_internal: bool | None
    observed_display_eligible: bool | None
    customer_output_authorized: bool
    pass_: bool

    def to_report_section(self) -> dict:
        return {
            "control_id": self.control_id,
            "artifact_valid": self.artifact_valid,
            "artifact_bound_to_expected_input": self.artifact_bound_to_expected_input,
            "section_evidence_matches": self.section_evidence_matches,
            "governance_state": self.governance_state,
            "failing_diagnostics": list(self.failing_diagnostics),
            "expected_state": self.expected_state,
            "expected_failing_diagnostics": list(self.expected_failing_diagnostics),
            "expected_valid_internal": self.expected_valid_internal,
            "expected_display_eligible": self.expected_display_eligible,
            "observed_valid_internal": self.observed_valid_internal,
            "observed_display_eligible": self.observed_display_eligible,
            "customer_output_authorized": self.customer_output_authorized,
            "pass": self.pass_,
        }


TASK_3_3_NEGATIVE_CONTROL_CASES = (
    NegativeControlCase(
        control_id="no_credible_comparison_cohort",
        seed_offset=1,
        expected_failing_diagnostics=("comparison_cohort_adequacy",),
        expected_evidence_tier_only=True,
    ),
    NegativeControlCase(
        control_id="violated_pre_trend",
        seed_offset=2,
        expected_failing_diagnostics=("pre_trend",),
    ),
    NegativeControlCase(
        control_id="badly_mismatched_comparison_cohort",
        seed_offset=3,
        expected_failing_diagnostics=("comparison_cohort_adequacy",),
        expected_evidence_tier_only=True,
    ),
    NegativeControlCase(
        control_id="prior_dominated_weak_data",
        seed_offset=4,
        expected_failing_diagnostics=("prior_sensitivity",),
    ),
    NegativeControlCase(
        control_id="missing_windows",
        seed_offset=5,
        expected_failing_diagnostics=("missing_or_suppressed_windows",),
    ),
    NegativeControlCase(
        control_id="suppressed_windows",
        seed_offset=6,
        expected_failing_diagnostics=(
            "comparison_cohort_adequacy",
            "missing_or_suppressed_windows",
        ),
        expected_evidence_tier_only=True,
    ),
    NegativeControlCase(
        control_id="naive_repeated_milestone_peeking",
        seed_offset=7,
        expected_failing_diagnostics=("peeking_control",),
        repeated_evaluation_detected=True,
    ),
)

TASK_3_3_FLOOR_CONTROL_CASES = (
    FloorControlCase(
        control_id="k4_below_schema_floor",
        seed_offset=20,
        k=4,
        expected_state="HOLD",
        expected_failing_diagnostics=("floor_check",),
        valid_internal=False,
        display_eligible=False,
    ),
    FloorControlCase(
        control_id="k8_internal_only_display_ineligible",
        seed_offset=21,
        k=8,
        expected_state="eligible_internal_only",
        expected_failing_diagnostics=(),
        valid_internal=True,
        display_eligible=False,
    ),
)


def negative_control_cases() -> tuple[NegativeControlCase, ...]:
    return TASK_3_3_NEGATIVE_CONTROL_CASES


def floor_control_cases() -> tuple[FloorControlCase, ...]:
    return TASK_3_3_FLOOR_CONTROL_CASES


def generate_negative_control_dataset(
    case: NegativeControlCase | str,
    *,
    base_seed: int = DEFAULT_NEGATIVE_CONTROL_BASE_SEED,
) -> SyntheticDataset:
    control_id = case.control_id if isinstance(case, NegativeControlCase) else case
    if isinstance(case, NegativeControlCase):
        seed_offset = case.seed_offset
    else:
        matching = [c for c in TASK_3_3_NEGATIVE_CONTROL_CASES if c.control_id == control_id]
        if not matching:
            raise ValueError(f"unknown negative control: {control_id!r}")
        seed_offset = matching[0].seed_offset
    seed = base_seed + seed_offset
    if control_id == "no_credible_comparison_cohort":
        return generate_no_comparison_cohort(seed=seed, k=16)
    if control_id == "violated_pre_trend":
        return generate_violated_pre_trend(seed=seed, k=16)
    if control_id == "badly_mismatched_comparison_cohort":
        return generate_mismatched_comparison(seed=seed, k=16)
    if control_id == "prior_dominated_weak_data":
        return generate_prior_dominated_weak(seed=seed)
    if control_id == "missing_windows":
        return generate_missing_windows(seed=seed, k=16)
    if control_id == "suppressed_windows":
        return generate_suppressed_windows(seed=seed, k=16)
    if control_id == "naive_repeated_milestone_peeking":
        return generate_did_dataset(seed=seed, k=16, injected_effect_sd=0.5)
    raise ValueError(f"unknown negative control: {control_id!r}")


def generate_floor_control_dataset(
    case: FloorControlCase | str,
    *,
    base_seed: int = DEFAULT_NEGATIVE_CONTROL_BASE_SEED,
) -> SyntheticDataset:
    control_id = case.control_id if isinstance(case, FloorControlCase) else case
    if isinstance(case, FloorControlCase):
        selected = case
    else:
        matching = [c for c in TASK_3_3_FLOOR_CONTROL_CASES if c.control_id == control_id]
        if not matching:
            raise ValueError(f"unknown floor control: {control_id!r}")
        selected = matching[0]
    return generate_did_dataset(
        seed=base_seed + selected.seed_offset,
        k=selected.k,
        injected_effect_sd=0.5,
    )


def _artifact_valid_internal_only(artifact: dict | None) -> bool:
    return _strict_artifact_valid_internal_only(artifact)


def _governance_fields(artifact: dict | None) -> tuple[str, tuple[str, ...], bool, bool]:
    if not isinstance(artifact, dict):
        return "MISSING", (), True, False
    governance = artifact.get("governance_state", {})
    return (
        str(governance.get("state")),
        tuple(governance.get("failing_diagnostics", ())),
        bool(governance.get("comparison_supported_contribution_estimate_authorized")),
        bool(governance.get("evidence_tier_only")),
    )


def _artifact_synthetic_input_hash(artifact: dict | None) -> str | None:
    if not isinstance(artifact, dict):
        return None
    try:
        return str(artifact["hash_bindings"]["synthetic_input_hash"])
    except (KeyError, TypeError):
        return None


def _expected_negative_control_input_hash(
    case: NegativeControlCase, *, base_seed: int
) -> str:
    return generate_negative_control_dataset(case, base_seed=base_seed).synthetic_input_hash()


def _expected_floor_control_input_hash(case: FloorControlCase, *, base_seed: int) -> str:
    return generate_floor_control_dataset(case, base_seed=base_seed).synthetic_input_hash()


def _diagnostic_supported_by_artifact_section(artifact: dict | None, diagnostic: str) -> bool:
    if not isinstance(artifact, dict):
        return False
    try:
        if diagnostic == "comparison_cohort_adequacy":
            return artifact["comparison_adequacy"]["all_required_checks_pass"] is False
        if diagnostic == "pre_trend":
            return artifact["diagnostics"]["pre_trend"]["pass"] is False
        if diagnostic == "prior_sensitivity":
            sensitivity = artifact["diagnostics"]["prior_sensitivity"]
            return isinstance(sensitivity, dict) and sensitivity["pass"] is False
        if diagnostic == "missing_or_suppressed_windows":
            evidence = artifact["measurement_cell_window_evidence"]
            return bool(
                evidence["all_required_windows_observed"] is False
                or evidence["all_windows_unsuppressed_and_fresh"] is False
                or evidence["missing_window_refs"]
                or evidence["suppressed_window_refs"]
                or evidence["stale_window_refs"]
                or evidence["imputed_window_refs"]
                or evidence["imputation_used"] is True
            )
        if diagnostic == "peeking_control":
            peeking = artifact["peeking_control"]
            return bool(
                peeking["pass"] is False
                and peeking["repeated_evaluation"] is True
                and peeking["procedure"] == "fixed_horizon_one_look_only"
            )
        if diagnostic == "floor_check":
            return artifact["floor_checks"]["k4_rejected"]["pass"] is True
    except (KeyError, TypeError):
        return False
    return False


def _all_expected_diagnostics_have_section_evidence(
    artifact: dict | None, expected: tuple[str, ...]
) -> bool:
    return all(
        _diagnostic_supported_by_artifact_section(artifact, diagnostic)
        for diagnostic in expected
    )


def _floor_section_evidence(
    artifact: dict | None, case: FloorControlCase
) -> tuple[bool, bool | None, bool | None]:
    if not isinstance(artifact, dict):
        return False, None, None
    try:
        checks = artifact["floor_checks"]
        if case.control_id == "k4_below_schema_floor":
            k4 = checks["k4_rejected"]
            matches = k4 == {
                "cohort_size": 4,
                "outcome": "rejected_below_schema_floor",
                "pass": True,
            }
            return matches, False if matches else None, False if matches else None
        if case.control_id == "k8_internal_only_display_ineligible":
            k8 = checks["k8_internal_only"]
            observed_valid_internal = bool(k8["valid_internal"])
            observed_display_eligible = bool(k8["display_eligible"])
            matches = bool(
                k8
                == {
                    "cohort_size": 8,
                    "outcome": "internal_only_display_ineligible",
                    "valid_internal": case.valid_internal,
                    "display_eligible": case.display_eligible,
                    "pass": True,
                }
            )
            return matches, observed_valid_internal, observed_display_eligible
    except (KeyError, TypeError):
        return False, None, None
    return False, None, None


def build_negative_control_report(
    artifacts_by_control_id: dict[str, dict],
    *,
    evaluation_mode: str = "artifact_gate_smoke",
    base_seed: int = DEFAULT_NEGATIVE_CONTROL_BASE_SEED,
) -> dict:
    """Summarize required negative controls from emitted artifacts."""
    results: list[ControlReportResult] = []
    for case in TASK_3_3_NEGATIVE_CONTROL_CASES:
        artifact = artifacts_by_control_id.get(case.control_id)
        artifact_valid = _artifact_valid_internal_only(artifact)
        expected_input_hash = _expected_negative_control_input_hash(
            case, base_seed=base_seed
        )
        artifact_bound_to_expected_input = (
            _artifact_synthetic_input_hash(artifact) == expected_input_hash
        )
        section_evidence_matches = _all_expected_diagnostics_have_section_evidence(
            artifact, case.expected_failing_diagnostics
        )
        state, failing, comparison_authorized, evidence_tier_only = _governance_fields(
            artifact
        )
        unexpected = tuple(
            diagnostic
            for diagnostic in failing
            if diagnostic not in case.expected_failing_diagnostics
        )
        pass_ = bool(
            artifact_valid
            and artifact_bound_to_expected_input
            and section_evidence_matches
            and state == "HOLD"
            and failing == case.expected_failing_diagnostics
            and not unexpected
            and not comparison_authorized
            and evidence_tier_only == case.expected_evidence_tier_only
        )
        results.append(
            ControlReportResult(
                control_id=case.control_id,
                artifact_valid=artifact_valid,
                artifact_bound_to_expected_input=artifact_bound_to_expected_input,
                section_evidence_matches=section_evidence_matches,
                governance_state=state,
                failing_diagnostics=failing,
                expected_failing_diagnostics=case.expected_failing_diagnostics,
                unexpected_failing_diagnostics=unexpected,
                comparison_supported_contribution_estimate_authorized=comparison_authorized,
                evidence_tier_only=evidence_tier_only,
                pass_=pass_,
            )
        )
    return {
        "report_class": "internal_synthetic_negative_control_report",
        "evaluation_mode": evaluation_mode,
        "internal_only": True,
        "artifact_inputs_authorized": False,
        "open_spec_3_3_completion_authorized": False,
        "control_count": len(results),
        "all_required_controls_present": all(
            case.control_id in artifacts_by_control_id
            for case in TASK_3_3_NEGATIVE_CONTROL_CASES
        ),
        "all_controls_pass": all(result.pass_ for result in results),
        "blocked_outputs": _blocked_outputs(),
        "controls": [result.to_report_section() for result in results],
    }


def build_floor_control_report(
    artifacts_by_control_id: dict[str, dict],
    *,
    evaluation_mode: str = "artifact_gate_smoke",
    base_seed: int = DEFAULT_NEGATIVE_CONTROL_BASE_SEED,
) -> dict:
    results: list[FloorReportResult] = []
    for case in TASK_3_3_FLOOR_CONTROL_CASES:
        artifact = artifacts_by_control_id.get(case.control_id)
        artifact_valid = _artifact_valid_internal_only(artifact)
        expected_input_hash = _expected_floor_control_input_hash(case, base_seed=base_seed)
        artifact_bound_to_expected_input = (
            _artifact_synthetic_input_hash(artifact) == expected_input_hash
        )
        (
            section_evidence_matches,
            observed_valid_internal,
            observed_display_eligible,
        ) = _floor_section_evidence(artifact, case)
        state, failing, _comparison_authorized, _evidence_tier_only = _governance_fields(
            artifact
        )
        customer_output_authorized = bool(
            artifact.get("customer_output_authorized") if isinstance(artifact, dict) else True
        )
        pass_ = bool(
            artifact_valid
            and artifact_bound_to_expected_input
            and section_evidence_matches
            and state == case.expected_state
            and failing == case.expected_failing_diagnostics
            and not customer_output_authorized
        )
        results.append(
            FloorReportResult(
                control_id=case.control_id,
                artifact_valid=artifact_valid,
                artifact_bound_to_expected_input=artifact_bound_to_expected_input,
                section_evidence_matches=section_evidence_matches,
                governance_state=state,
                failing_diagnostics=failing,
                expected_state=case.expected_state,
                expected_failing_diagnostics=case.expected_failing_diagnostics,
                expected_valid_internal=case.valid_internal,
                expected_display_eligible=case.display_eligible,
                observed_valid_internal=observed_valid_internal,
                observed_display_eligible=observed_display_eligible,
                customer_output_authorized=customer_output_authorized,
                pass_=pass_,
            )
        )
    return {
        "report_class": "internal_synthetic_floor_control_report",
        "evaluation_mode": evaluation_mode,
        "internal_only": True,
        "artifact_inputs_authorized": False,
        "open_spec_3_3_completion_authorized": False,
        "control_count": len(results),
        "all_required_controls_present": all(
            case.control_id in artifacts_by_control_id
            for case in TASK_3_3_FLOOR_CONTROL_CASES
        ),
        "all_controls_pass": all(result.pass_ for result in results),
        "blocked_outputs": _blocked_outputs(),
        "controls": [result.to_report_section() for result in results],
    }
