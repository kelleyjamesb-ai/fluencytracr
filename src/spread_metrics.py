"""Org-level spread and concentration metrics rollups."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from src.organization import Team
from src.tool_inventory import ToolRecord


@dataclass(frozen=True)
class SpreadRollup:
    org_id: str
    day: date
    percent_teams_with_ai_presence: float
    concentration_index: float


@dataclass
class SpreadRollupTable:
    rows: list[SpreadRollup] = field(default_factory=list)
    by_org: dict[str, list[SpreadRollup]] = field(default_factory=dict)

    def add(self, rollup: SpreadRollup) -> None:
        self.rows.append(rollup)
        self.by_org.setdefault(rollup.org_id, []).append(rollup)


def run_spread_rollup(
    *,
    org_id: str,
    day: date,
    teams: list[Team],
    tool_records: list[ToolRecord],
    rollup_table: SpreadRollupTable,
) -> SpreadRollup:
    team_ids = {team.team_id for team in teams}
    org_records = [
        record
        for record in tool_records
        if record.org_id == org_id and record.team_id in team_ids
    ]

    team_presence = {record.team_id for record in org_records}
    percent_presence = 0.0
    if team_ids:
        percent_presence = len(team_presence) / len(team_ids)

    counts_by_team: dict[str, int] = {}
    for record in org_records:
        counts_by_team[record.team_id] = counts_by_team.get(record.team_id, 0) + 1

    total = sum(counts_by_team.values())
    if total == 0:
        concentration_index = 0.0
    else:
        concentration_index = sum(
            (count / total) ** 2 for count in counts_by_team.values()
        )

    rollup = SpreadRollup(
        org_id=org_id,
        day=day,
        percent_teams_with_ai_presence=percent_presence,
        concentration_index=concentration_index,
    )
    rollup_table.add(rollup)
    return rollup
