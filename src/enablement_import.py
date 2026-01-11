"""Enablement import API for CSV or JSON payloads."""

from __future__ import annotations

from dataclasses import dataclass, field
import csv
import io
import json
from typing import Iterable

from src.events import EnablementEvent, parse_event
from src.exceptions import ValidationError


@dataclass
class EnablementStore:
    events: list[EnablementEvent] = field(default_factory=list)
    by_org: dict[str, list[EnablementEvent]] = field(default_factory=dict)
    by_team: dict[str, list[EnablementEvent]] = field(default_factory=dict)
    by_role: dict[str, list[EnablementEvent]] = field(default_factory=dict)

    def add(self, event: EnablementEvent) -> None:
        self.events.append(event)
        self.by_org.setdefault(event.org_id, []).append(event)
        if event.team_id:
            self.by_team.setdefault(event.team_id, []).append(event)
        self.by_role.setdefault(event.role_id, []).append(event)


def _parse_csv_rows(csv_content: str) -> Iterable[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(csv_content))
    if not reader.fieldnames:
        raise ValueError("CSV must include headers")
    for row in reader:
        yield {key: (value or "").strip() for key, value in row.items()}


def _parse_json_rows(json_content: str) -> Iterable[dict[str, str]]:
    data = json.loads(json_content)
    if not isinstance(data, list):
        raise ValueError("JSON payload must be a list of objects")
    for item in data:
        if not isinstance(item, dict):
            raise ValueError("JSON payload items must be objects")
        yield {str(key): str(value) for key, value in item.items()}


def import_enablement(
    payload: str,
    *,
    content_type: str,
    store: EnablementStore,
) -> dict[str, object]:
    """Import enablement events, returning stored events and row errors."""
    if content_type == "csv":
        rows = _parse_csv_rows(payload)
    elif content_type == "json":
        rows = _parse_json_rows(payload)
    else:
        raise ValueError("Unsupported content type")

    errors: list[str] = []
    stored: list[EnablementEvent] = []
    for index, row in enumerate(rows, start=1):
        try:
            event = parse_event(row)
        except (ValueError, ValidationError) as exc:
            errors.append(f"row {index}: {exc}")
            continue
        store.add(event)
        stored.append(event)

    return {"stored": stored, "errors": errors}
