"""Audit log for imports, role changes, and dashboard access metadata."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from src.data_contract import NON_COLLECTABLE_FIELDS


AuditEventType = Literal["data_import", "role_change", "dashboard_access"]


ALLOWED_METADATA_KEYS = {
    "org_id",
    "team_id",
    "actor_role",
    "action",
    "resource_id",
    "count",
    "source",
}


@dataclass(frozen=True)
class AuditEvent:
    event_type: AuditEventType
    occurred_at: datetime
    metadata: dict[str, str]


@dataclass
class AuditLog:
    events: list[AuditEvent] = field(default_factory=list)

    def log_event(self, event: AuditEvent) -> None:
        if event.occurred_at.tzinfo is None:
            raise ValueError("occurred_at must be timezone-aware")
        if event.event_type not in {"data_import", "role_change", "dashboard_access"}:
            raise ValueError("Unsupported audit event type")
        prohibited = NON_COLLECTABLE_FIELDS.intersection(event.metadata.keys())
        if prohibited:
            raise ValueError(
                "Audit metadata includes non-collectable fields: "
                + ", ".join(sorted(prohibited))
            )
        invalid_keys = set(event.metadata.keys()).difference(ALLOWED_METADATA_KEYS)
        if invalid_keys:
            raise ValueError("Audit metadata contains unsupported keys")
        self.events.append(event)

    def list_events(self, *, requester_role: str) -> list[AuditEvent]:
        if requester_role != "admin":
            raise PermissionError("Audit log access is restricted to admins")
        return list(self.events)
