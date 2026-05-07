"""CSV roster import with hashing and idempotent updates."""

from __future__ import annotations

from dataclasses import dataclass
import csv
import hashlib
import io

from src.exceptions import NotFoundError, ValidationError
from src.teams_roles import Directory


@dataclass(frozen=True)
class RosterRecord:
    employee_id: str
    team_id: str
    role_id: str


def hash_employee_identifier(identifier: str) -> str:
    if not identifier:
        raise ValueError("Employee identifier is required")
    return hashlib.sha256(identifier.encode("utf-8")).hexdigest()


def parse_roster_csv(csv_content: str) -> list[RosterRecord]:
    reader = csv.DictReader(io.StringIO(csv_content))
    required_fields = {"employee_id", "team_id", "role_id"}
    if not required_fields.issubset(reader.fieldnames or set()):
        missing = required_fields.difference(reader.fieldnames or set())
        raise ValueError(f"Missing required fields: {', '.join(sorted(missing))}")

    records: list[RosterRecord] = []
    for row in reader:
        records.append(
            RosterRecord(
                employee_id=hash_employee_identifier(row["employee_id"].strip()),
                team_id=row["team_id"].strip(),
                role_id=row["role_id"].strip(),
            )
        )
    return records


def import_roster(csv_content: str, directory: Directory) -> list[RosterRecord]:
    """Import roster entries idempotently into the directory."""
    records = parse_roster_csv(csv_content)
    errors: list[str] = []

    for idx, record in enumerate(records, start=1):
        # Try to map to team
        try:
            directory.map_employee_to_team(record.employee_id, record.team_id)
        except NotFoundError:
            errors.append(f"Row {idx}: team_id '{record.team_id}' not found")

        # Try to map to role
        try:
            directory.map_employee_to_role(record.employee_id, record.role_id)
        except NotFoundError:
            errors.append(f"Row {idx}: role_id '{record.role_id}' not found")

    if errors:
        error_summary = "\n".join(errors)
        raise ValidationError(f"Roster import failed with {len(errors)} error(s):\n{error_summary}")

    return records
