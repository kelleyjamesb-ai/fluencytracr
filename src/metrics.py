"""Enablement coverage metrics and daily rollups."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from src.events import EnablementEvent


@dataclass(frozen=True)
class RollupMetric:
    org_id: str
    team_id: str
    role_id: str
    day: date
    percent_enabled_by_role: float
    assessment_delta: int
    everboarding_cadence: int


@dataclass
class RollupTable:
    rows: list[RollupMetric] = field(default_factory=list)
    by_org: dict[str, list[RollupMetric]] = field(default_factory=dict)
    by_team: dict[str, list[RollupMetric]] = field(default_factory=dict)
    by_role: dict[str, list[RollupMetric]] = field(default_factory=dict)

    def add(self, metric: RollupMetric) -> None:
        self.rows.append(metric)
        self.by_org.setdefault(metric.org_id, []).append(metric)
        if metric.team_id:
            self.by_team.setdefault(metric.team_id, []).append(metric)
        self.by_role.setdefault(metric.role_id, []).append(metric)


def run_daily_rollup(
    events: list[EnablementEvent],
    *,
    day: date,
    rollup_table: RollupTable,
) -> list[RollupMetric]:
    """Compute daily rollups for percent enabled, assessment delta, cadence."""
    relevant = [event for event in events if event.occurred_at.date() == day]

    grouped: dict[tuple[str, str, str], dict[str, int]] = {}
    for event in relevant:
        key = (event.org_id, event.team_id, event.role_id)
        counters = grouped.setdefault(
            key,
            {
                "assessment_pre": 0,
                "assessment_post": 0,
                "session_attended": 0,
                "everboarding_touch": 0,
            },
        )
        counters[event.event_type] += 1

    metrics: list[RollupMetric] = []
    for (org_id, team_id, role_id), counts in grouped.items():
        assessment_delta = counts["assessment_post"] - counts["assessment_pre"]
        everboarding_cadence = counts["everboarding_touch"]
        enabled = counts["assessment_post"] + counts["session_attended"] > 0
        metric = RollupMetric(
            org_id=org_id,
            team_id=team_id,
            role_id=role_id,
            day=day,
            percent_enabled_by_role=1.0 if enabled else 0.0,
            assessment_delta=assessment_delta,
            everboarding_cadence=everboarding_cadence,
        )
        rollup_table.add(metric)
        metrics.append(metric)

    return metrics
