"""Team and role CRUD with employee mappings."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from src.exceptions import AlreadyExistsError, NotFoundError

# Sentinel for distinguishing "not provided" from "explicitly None"
_UNSET: Final = object()


@dataclass(frozen=True)
class Team:
    team_id: str
    name: str
    parent_team_id: str | None = None


@dataclass(frozen=True)
class Role:
    role_id: str
    name: str


class Directory:
    def __init__(self) -> None:
        self._teams: dict[str, Team] = {}
        self._roles: dict[str, Role] = {}
        self._employee_teams: dict[str, set[str]] = {}
        self._employee_roles: dict[str, set[str]] = {}

    def list_teams(self) -> list[Team]:
        return list(self._teams.values())

    def create_team(self, team: Team) -> None:
        if team.team_id in self._teams:
            raise AlreadyExistsError(f"Team '{team.team_id}' already exists")
        self._teams[team.team_id] = team

    def update_team(
        self,
        team_id: str,
        *,
        name: str | None | object = _UNSET,
        parent_team_id: str | None | object = _UNSET,
    ) -> Team:
        """Update team fields. Use None to remove parent, omit param to keep current value."""
        if team_id not in self._teams:
            raise NotFoundError(f"Team '{team_id}' not found")
        current = self._teams[team_id]
        updated = Team(
            team_id=team_id,
            name=name if name is not _UNSET else current.name,  # type: ignore[arg-type]
            parent_team_id=parent_team_id if parent_team_id is not _UNSET else current.parent_team_id,  # type: ignore[arg-type]
        )
        self._teams[team_id] = updated
        return updated

    def delete_team(self, team_id: str) -> None:
        if team_id not in self._teams:
            raise NotFoundError(f"Team '{team_id}' not found")
        del self._teams[team_id]
        for teams in self._employee_teams.values():
            teams.discard(team_id)

    def list_roles(self) -> list[Role]:
        return list(self._roles.values())

    def create_role(self, role: Role) -> None:
        if role.role_id in self._roles:
            raise AlreadyExistsError(f"Role '{role.role_id}' already exists")
        self._roles[role.role_id] = role

    def update_role(self, role_id: str, *, name: str | None | object = _UNSET) -> Role:
        """Update role fields."""
        if role_id not in self._roles:
            raise NotFoundError(f"Role '{role_id}' not found")
        current = self._roles[role_id]
        updated = Role(role_id=role_id, name=name if name is not _UNSET else current.name)  # type: ignore[arg-type]
        self._roles[role_id] = updated
        return updated

    def delete_role(self, role_id: str) -> None:
        if role_id not in self._roles:
            raise NotFoundError(f"Role '{role_id}' not found")
        del self._roles[role_id]
        for roles in self._employee_roles.values():
            roles.discard(role_id)

    def map_employee_to_team(self, employee_id: str, team_id: str) -> None:
        if team_id not in self._teams:
            raise NotFoundError(f"Team '{team_id}' not found")
        self._employee_teams.setdefault(employee_id, set()).add(team_id)

    def map_employee_to_role(self, employee_id: str, role_id: str) -> None:
        if role_id not in self._roles:
            raise NotFoundError(f"Role '{role_id}' not found")
        self._employee_roles.setdefault(employee_id, set()).add(role_id)

    def list_employee_teams(self, employee_id: str) -> set[str]:
        return set(self._employee_teams.get(employee_id, set()))

    def list_employee_roles(self, employee_id: str) -> set[str]:
        return set(self._employee_roles.get(employee_id, set()))

    def team_member_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {team_id: 0 for team_id in self._teams}
        for teams in self._employee_teams.values():
            for team_id in teams:
                counts[team_id] = counts.get(team_id, 0) + 1
        return counts
