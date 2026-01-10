"""Organization and identity structures for aggregation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


AggregationScope = Literal["org", "team"]


@dataclass(frozen=True)
class Member:
    member_id: str
    name: str


@dataclass(frozen=True)
class Team:
    team_id: str
    name: str
    members: tuple[Member, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class Organization:
    org_id: str
    name: str
    teams: tuple[Team, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class Signal:
    team_id: str
    value: float


def aggregate_signals(
    signals: list[Signal],
    scope: AggregationScope,
) -> dict[str, float]:
    """Aggregate signals at org or team level only."""
    if scope not in ("org", "team"):
        raise ValueError("Aggregation scope must be org or team")

    totals: dict[str, float] = {}
    if scope == "org":
        totals["org"] = sum(signal.value for signal in signals)
        return totals

    for signal in signals:
        totals[signal.team_id] = totals.get(signal.team_id, 0.0) + signal.value
    return totals
