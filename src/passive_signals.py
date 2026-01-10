"""Passive AI fluency signal capture with guardrails."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from src.data_contract import NON_COLLECTABLE_FIELDS


SignalSource = Literal["training_platform", "support_ticketing", "code_review"]


@dataclass(frozen=True)
class SignalEvent:
    source: SignalSource
    occurred_at: datetime
    org_id: str
    team_id: str
    role_id: str
    signal_type: str
    metadata: dict[str, str]


def validate_signal_event(event: SignalEvent) -> None:
    if event.source not in {"training_platform", "support_ticketing", "code_review"}:
        raise ValueError("Unsupported signal source")
    if event.occurred_at.tzinfo is None:
        raise ValueError("Signal timestamp must be timezone-aware")
    prohibited = NON_COLLECTABLE_FIELDS.intersection(event.metadata.keys())
    if prohibited:
        raise ValueError(
            "Signal metadata includes non-collectable fields: "
            + ", ".join(sorted(prohibited))
        )


def parse_signal_event(payload: dict[str, str]) -> SignalEvent:
    required = {"source", "occurred_at", "org_id", "role_id", "signal_type"}
    missing = required.difference(payload.keys())
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(sorted(missing))}")
    occurred_at = datetime.fromisoformat(payload["occurred_at"])
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    metadata = {key: value for key, value in payload.items() if key not in required | {"team_id"}}
    event = SignalEvent(
        source=payload["source"],  # type: ignore[arg-type]
        occurred_at=occurred_at,
        org_id=payload["org_id"],
        team_id=payload.get("team_id", ""),
        role_id=payload["role_id"],
        signal_type=payload["signal_type"],
        metadata=metadata,
    )
    validate_signal_event(event)
    return event
