"""Tool class inventory with org/team scoped records."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal


ToolClass = Literal[
    "llm_chat",
    "research",
    "coding",
    "workflow_automation",
    "embedded_ai",
]


@dataclass(frozen=True)
class ToolRecord:
    org_id: str
    team_id: str
    tool_class: ToolClass
    tool_name: str
    recorded_at: datetime


@dataclass
class ToolInventory:
    records: list[ToolRecord] = field(default_factory=list)
    by_org: dict[str, list[ToolRecord]] = field(default_factory=dict)
    by_team: dict[str, list[ToolRecord]] = field(default_factory=dict)

    def add_tool(self, record: ToolRecord) -> None:
        if record.recorded_at.tzinfo is None:
            raise ValueError("recorded_at must be timezone-aware")
        self.records.append(record)
        self.by_org.setdefault(record.org_id, []).append(record)
        if record.team_id:
            self.by_team.setdefault(record.team_id, []).append(record)

    def list_tools(self, *, org_id: str | None = None, team_id: str | None = None) -> list[ToolRecord]:
        if team_id is not None:
            return list(self.by_team.get(team_id, []))
        if org_id is not None:
            return list(self.by_org.get(org_id, []))
        return list(self.records)

