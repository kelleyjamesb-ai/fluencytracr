"""Opportunity library and matching logic for role-based patterns."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


MaturityStage = Literal["emerging", "scaling", "advanced"]


@dataclass(frozen=True)
class OpportunityPattern:
    role: str
    maturity: MaturityStage
    title: str
    summary: str
    gap_tags: tuple[str, ...]
    guidance: str


OPPORTUNITY_LIBRARY: tuple[OpportunityPattern, ...] = (
    OpportunityPattern(
        role="sales",
        maturity="emerging",
        title="Prep account briefs with AI copilots",
        summary="Use AI to summarize account history and prep discovery questions.",
        gap_tags=("coverage_low", "velocity_low"),
        guidance="Start with standard brief templates and shared prompt guidance.",
    ),
    OpportunityPattern(
        role="sales",
        maturity="scaling",
        title="Standardize call follow-ups",
        summary="Generate consistent recap emails and CRM updates.",
        gap_tags=("depth_low", "velocity_low"),
        guidance="Codify prompts for recap format and compliance checks.",
    ),
    OpportunityPattern(
        role="support",
        maturity="emerging",
        title="Draft resolution playbooks",
        summary="Summarize past tickets into reusable resolution snippets.",
        gap_tags=("coverage_low", "judgment_low"),
        guidance="Review drafts weekly to refine tone and safety checks.",
    ),
    OpportunityPattern(
        role="engineering",
        maturity="scaling",
        title="Improve code review readiness",
        summary="Use AI to catch common issues before review.",
        gap_tags=("depth_low", "judgment_low"),
        guidance="Define a shared checklist to keep suggestions consistent.",
    ),
    OpportunityPattern(
        role="operations",
        maturity="advanced",
        title="Automate reporting narratives",
        summary="Generate weekly summaries from dashboards.",
        gap_tags=("velocity_low", "coverage_low"),
        guidance="Align report templates with exec-level decision cadence.",
    ),
)


def match_opportunities(
    *,
    role: str,
    maturity: MaturityStage,
    gaps: list[str],
) -> list[OpportunityPattern]:
    normalized_role = role.strip().lower() or "general"
    normalized_gaps = {gap.strip().lower() for gap in gaps if gap.strip()}

    matches: list[OpportunityPattern] = []
    for pattern in OPPORTUNITY_LIBRARY:
        role_match = pattern.role == normalized_role or pattern.role == "general"
        maturity_match = pattern.maturity == maturity
        gap_match = bool(normalized_gaps.intersection(pattern.gap_tags))
        if role_match and maturity_match and gap_match:
            matches.append(pattern)

    return matches
