"""Usage shape signals for AI tool adoption trends."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Literal


FrequencyBand = Literal["rare", "occasional", "regular", "habitual"]
UsageConfirmation = Literal["admin", "pulse"]


@dataclass(frozen=True)
class UsageShapeRecord:
    org_id: str
    team_id: str
    role_id: str
    band: FrequencyBand
    confirmed_by: UsageConfirmation
    recorded_at: datetime


@dataclass
class UsageShapeStore:
    records: list[UsageShapeRecord] = field(default_factory=list)
    by_org: dict[str, list[UsageShapeRecord]] = field(default_factory=dict)
    by_team: dict[str, list[UsageShapeRecord]] = field(default_factory=dict)
    by_role: dict[str, list[UsageShapeRecord]] = field(default_factory=dict)

    def add_usage(self, record: UsageShapeRecord) -> None:
        if record.band not in {"rare", "occasional", "regular", "habitual"}:
            raise ValueError("Unsupported frequency band")
        if record.confirmed_by not in {"admin", "pulse"}:
            raise ValueError("Usage shape must be admin or pulse confirmed")
        if record.recorded_at.tzinfo is None:
            raise ValueError("recorded_at must be timezone-aware")
        self.records.append(record)
        self.by_org.setdefault(record.org_id, []).append(record)
        if record.team_id:
            self.by_team.setdefault(record.team_id, []).append(record)
        if record.role_id:
            self.by_role.setdefault(record.role_id, []).append(record)

    def list_usage(
        self,
        *,
        org_id: str | None = None,
        team_id: str | None = None,
        role_id: str | None = None,
    ) -> list[UsageShapeRecord]:
        if role_id is not None:
            return list(self.by_role.get(role_id, []))
        if team_id is not None:
            return list(self.by_team.get(team_id, []))
        if org_id is not None:
            return list(self.by_org.get(org_id, []))
        return list(self.records)


def usage_trends(
    records: list[UsageShapeRecord],
    *,
    org_id: str | None = None,
    team_id: str | None = None,
    role_id: str | None = None,
) -> dict[date, dict[FrequencyBand, int]]:
    filtered = []
    for record in records:
        if org_id is not None and record.org_id != org_id:
            continue
        if team_id is not None and record.team_id != team_id:
            continue
        if role_id is not None and record.role_id != role_id:
            continue
        filtered.append(record)

    trends: dict[date, dict[FrequencyBand, int]] = {}
    for record in filtered:
        day = record.recorded_at.date()
        band_counts = trends.setdefault(
            day,
            {"rare": 0, "occasional": 0, "regular": 0, "habitual": 0},
        )
        band_counts[record.band] += 1

    return trends
