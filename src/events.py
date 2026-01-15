"""Enablement event schema and validation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, get_args

from src.exceptions import ValidationError


EventType = Literal[
    "assessment_pre",
    "assessment_post",
    "session_attended",
    "everboarding_touch",
    "workshop",
]


@dataclass(frozen=True)
class EnablementEvent:
    event_type: EventType
    occurred_at: datetime
    org_id: str
    team_id: str
    role_id: str


def _validate_event_type(value: str) -> EventType:
    """Validate and narrow event type to literal union."""
    valid_types = get_args(EventType)
    if value not in valid_types:
        raise ValidationError(f"Invalid event_type: '{value}'. Must be one of {valid_types}")
    return value  # type: ignore[return-value]  # Safe after validation


def validate_event(event: EnablementEvent) -> None:
    if event.event_type not in {
        "assessment_pre",
        "assessment_post",
        "session_attended",
        "everboarding_touch",
        "workshop",
    }:
        raise ValidationError("Invalid event type")
    if event.occurred_at.tzinfo is None:
        raise ValidationError("Event timestamp must be timezone-aware")


def parse_event(payload: dict[str, str]) -> EnablementEvent:
    if "event_type" not in payload or "occurred_at" not in payload:
        raise ValidationError("Missing required event fields")
    if not payload.get("org_id"):
        raise ValidationError("Missing org_id")
    if not payload.get("role_id"):
        raise ValidationError("Missing role_id")
    occurred_at_raw = payload["occurred_at"]
    if occurred_at_raw.endswith("Z"):
        occurred_at_raw = occurred_at_raw.replace("Z", "+00:00")
    try:
        occurred_at = datetime.fromisoformat(occurred_at_raw)
    except ValueError as exc:
        raise ValidationError(f"Invalid occurred_at: {payload['occurred_at']}") from exc
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)

    # Validate event type before construction
    event_type = _validate_event_type(payload["event_type"])

    event = EnablementEvent(
        event_type=event_type,
        occurred_at=occurred_at,
        org_id=payload["org_id"],
        team_id=payload.get("team_id", ""),
        role_id=payload["role_id"],
    )
    validate_event(event)
    return event
