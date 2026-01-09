"""Enablement event schema and validation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal


EventType = Literal[
    "assessment_pre",
    "assessment_post",
    "session_attended",
    "everboarding_touch",
]


@dataclass(frozen=True)
class EnablementEvent:
    event_type: EventType
    occurred_at: datetime
    team_id: str
    role_id: str


def validate_event(event: EnablementEvent) -> None:
    if event.event_type not in {
        "assessment_pre",
        "assessment_post",
        "session_attended",
        "everboarding_touch",
    }:
        raise ValueError("Invalid event type")
    if event.occurred_at.tzinfo is None:
        raise ValueError("Event timestamp must be timezone-aware")


def parse_event(payload: dict[str, str]) -> EnablementEvent:
    if "event_type" not in payload or "occurred_at" not in payload:
        raise ValueError("Missing required event fields")
    occurred_at = datetime.fromisoformat(payload["occurred_at"])
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    event = EnablementEvent(
        event_type=payload["event_type"],  # type: ignore[arg-type]
        occurred_at=occurred_at,
        team_id=payload.get("team_id", ""),
        role_id=payload.get("role_id", ""),
    )
    validate_event(event)
    return event
