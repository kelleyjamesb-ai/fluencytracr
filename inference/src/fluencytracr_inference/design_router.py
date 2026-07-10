"""Evidence-design routing for the Bayesian model family.

This router is internal-only and synthetic-only. It keeps the current DiD
module specialized and routes only the exact first longitudinal synthetic
prototype slice implemented in this branch.
"""

from __future__ import annotations

from dataclasses import dataclass


EVIDENCE_DESIGNS = (
    "CONTROLLED_TEST",
    "TWO_GROUP_PRE_POST_COMPARISON",
    "STAGGERED_ROLLOUT",
    "MATCHED_COMPARISON",
    "HISTORICAL_STATE_SPACE",
    "REPEATED_PRE_POST",
    "BASELINE_ONLY",
)

COMPARISON_DID_MODULE = "comparison_supported_bayesian_did_module"
LONGITUDINAL_SLICE = "first_longitudinal_synthetic_model_slice"


@dataclass(frozen=True)
class RouteDecision:
    evidence_design: str
    decision: str
    module: str | None
    claim_cap: str
    routing_diagnostic: str | None

    @property
    def routes_to_longitudinal_slice(self) -> bool:
        return self.decision == "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE"

    def to_artifact_section(self) -> dict:
        return {
            "evidence_design": self.evidence_design,
            "decision": self.decision,
            "module": self.module,
            "claim_cap": self.claim_cap,
            "routing_diagnostic": self.routing_diagnostic,
        }


def route_evidence_design(
    evidence_design: str,
    *,
    synthetic_only: bool,
    comparison_reduces_to_two_group: bool = False,
    historical_requirements_met: bool = False,
) -> RouteDecision:
    """Return the fail-closed model-family route decision."""

    if evidence_design not in EVIDENCE_DESIGNS:
        return RouteDecision(
            evidence_design=evidence_design,
            decision="HOLD_UNSUPPORTED_EVIDENCE_DESIGN",
            module=None,
            claim_cap="HOLD",
            routing_diagnostic="unsupported_evidence_design",
        )
    if not synthetic_only:
        return RouteDecision(
            evidence_design=evidence_design,
            decision="HOLD_REAL_DATA_NOT_AUTHORIZED",
            module=None,
            claim_cap="HOLD",
            routing_diagnostic="real_data_not_authorized",
        )
    if evidence_design == "TWO_GROUP_PRE_POST_COMPARISON":
        return RouteDecision(
            evidence_design=evidence_design,
            decision="ROUTE_COMPARISON_SUPPORTED_DID",
            module=COMPARISON_DID_MODULE,
            claim_cap="internal_only_comparison_supported_contribution_estimate",
            routing_diagnostic=None,
        )
    if evidence_design == "MATCHED_COMPARISON" and comparison_reduces_to_two_group:
        return RouteDecision(
            evidence_design=evidence_design,
            decision="ROUTE_COMPARISON_SUPPORTED_DID",
            module=COMPARISON_DID_MODULE,
            claim_cap="internal_only_matched_comparison_context",
            routing_diagnostic=None,
        )
    if evidence_design in {"HISTORICAL_STATE_SPACE", "REPEATED_PRE_POST"}:
        if historical_requirements_met:
            return RouteDecision(
                evidence_design=evidence_design,
                decision="ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE",
                module=LONGITUDINAL_SLICE,
                claim_cap="internal_synthetic_noncausal_contribution_alignment_review",
                routing_diagnostic=None,
            )
        return RouteDecision(
            evidence_design=evidence_design,
            decision="HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE",
            module=None,
            claim_cap="HOLD",
            routing_diagnostic="insufficient_longitudinal_evidence",
        )
    if evidence_design == "STAGGERED_ROLLOUT":
        return RouteDecision(
            evidence_design=evidence_design,
            decision="HOLD_UNSUPPORTED_STAGGERED_EVENT_STUDY",
            module=None,
            claim_cap="HOLD",
            routing_diagnostic="unsupported_staggered_event_study",
        )
    if evidence_design == "BASELINE_ONLY":
        return RouteDecision(
            evidence_design=evidence_design,
            decision="HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE",
            module=None,
            claim_cap="HOLD",
            routing_diagnostic="baseline_only_no_contribution_confidence",
        )
    return RouteDecision(
        evidence_design=evidence_design,
        decision="HOLD_UNSUPPORTED_CONTROLLED_TEST_MODEL",
        module=None,
        claim_cap="HOLD",
        routing_diagnostic="unsupported_controlled_test_model",
    )
