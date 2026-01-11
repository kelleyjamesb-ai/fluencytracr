"""Opportunity library and matching logic for aggregated fluency patterns."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


MaturityStage = Literal["emerging", "scaling", "advanced"]


@dataclass(frozen=True)
class OpportunityPattern:
    maturity: MaturityStage
    title: str
    summary: str
    guidance: str


OPPORTUNITY_LIBRARY: tuple[OpportunityPattern, ...] = (
    OpportunityPattern(
        maturity="emerging",
        title="Prep account briefs with AI copilots",
        summary="Examples other organizations explore at this stage include concise account briefs.",
        guidance="Common patterns seen at this level of fluency focus on shared templates.",
    ),
    OpportunityPattern(
        maturity="scaling",
        title="Standardize call follow-ups",
        summary="Examples other organizations explore at this stage include consistent recap drafts.",
        guidance="Common patterns seen at this level of fluency include shared recap formats.",
    ),
    OpportunityPattern(
        maturity="emerging",
        title="Draft resolution playbooks",
        summary="Examples other organizations explore at this stage include resolution summaries.",
        guidance="Common patterns seen at this level of fluency include weekly review rituals.",
    ),
    OpportunityPattern(
        maturity="scaling",
        title="Improve code review readiness",
        summary="Examples other organizations explore at this stage include pre-review checklists.",
        guidance="Common patterns seen at this level of fluency include shared review checklists.",
    ),
    OpportunityPattern(
        maturity="advanced",
        title="Automate reporting narratives",
        summary="Examples other organizations explore at this stage include narrative summaries.",
        guidance="Common patterns seen at this level of fluency include reusable report templates.",
    ),
)


def match_opportunities(
    *,
    maturity: MaturityStage,
) -> list[OpportunityPattern]:
    return [pattern for pattern in OPPORTUNITY_LIBRARY if pattern.maturity == maturity]
