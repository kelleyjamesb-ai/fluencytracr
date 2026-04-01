"""Access control and aggregation enforcement for API requests."""

from __future__ import annotations

from dataclasses import dataclass

from src.exceptions import AccessDeniedError, ValidationError


EMPLOYEE_LEVEL_ENDPOINTS = frozenset(
    {
        "/api/employees",
        "/api/employee-detail",
    }
)


@dataclass(frozen=True)
class RequestContext:
    role: str
    endpoint: str
    query: dict[str, str]


def enforce_aggregation_defaults(query: dict[str, str]) -> dict[str, str]:
    """Ensure aggregation is enforced server-side."""
    aggregation = query.get("aggregation", "org")
    if aggregation not in {"org", "team"}:
        raise ValidationError(f"Aggregation must be org or team level, got: '{aggregation}'")
    return {**query, "aggregation": aggregation}


def enforce_role_access(request: RequestContext) -> None:
    """Block employee-level endpoints for exec roles."""
    if request.role == "exec" and request.endpoint in EMPLOYEE_LEVEL_ENDPOINTS:
        raise AccessDeniedError(f"Exec role cannot access employee-level endpoint: {request.endpoint}")
