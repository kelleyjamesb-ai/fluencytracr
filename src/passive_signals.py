"""Passive AI fluency signal capture with guardrails."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, get_args

from src.data_contract import NON_COLLECTABLE_FIELDS
from src.exceptions import PrivacyViolationError, ValidationError


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
    is_shadow_ai: bool = False


def _validate_signal_source(value: str) -> SignalSource:
    """Validate and narrow signal source to literal union."""
    valid_sources = get_args(SignalSource)
    if value not in valid_sources:
        raise ValidationError(f"Invalid signal_source: '{value}'. Must be one of {valid_sources}")
    return value  # type: ignore[return-value]  # Safe after validation


def validate_signal_event(event: SignalEvent) -> None:
    if event.source not in {"training_platform", "support_ticketing", "code_review"}:
        raise ValidationError("Unsupported signal source")
    if event.occurred_at.tzinfo is None:
        raise ValidationError("Signal timestamp must be timezone-aware")
    prohibited = NON_COLLECTABLE_FIELDS.intersection(event.metadata.keys())
    if prohibited:
        raise PrivacyViolationError(
            "Signal metadata includes non-collectable fields: "
            + ", ".join(sorted(prohibited))
        )


def parse_signal_event(payload: dict[str, str]) -> SignalEvent:
    required = {"source", "occurred_at", "org_id", "role_id", "signal_type"}
    missing = required.difference(payload.keys())
    if missing:
        raise ValidationError(f"Missing required fields: {', '.join(sorted(missing))}")
    occurred_at = datetime.fromisoformat(payload["occurred_at"])
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    metadata = {key: value for key, value in payload.items() if key not in required | {"team_id", "is_shadow_ai"}}

    # Validate signal source before construction
    source = _validate_signal_source(payload["source"])

    # Parse is_shadow_ai boolean (default False)
    is_shadow_ai = payload.get("is_shadow_ai", "false").lower() in ("true", "1", "yes")

    event = SignalEvent(
        source=source,
        occurred_at=occurred_at,
        org_id=payload["org_id"],
        team_id=payload.get("team_id", ""),
        role_id=payload["role_id"],
        signal_type=payload["signal_type"],
        metadata=metadata,
        is_shadow_ai=is_shadow_ai,
    )
    validate_signal_event(event)
    return event
