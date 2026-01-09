"""API helpers enforcing aggregation and RBAC rules."""

from __future__ import annotations

from src.access_control import RequestContext, enforce_aggregation_defaults, enforce_role_access


def handle_dashboard_request(request: RequestContext) -> dict[str, str]:
    """Apply access controls and aggregation rules for dashboard requests."""
    enforce_role_access(request)
    query = enforce_aggregation_defaults(request.query)
    return {
        "endpoint": request.endpoint,
        "aggregation": query["aggregation"],
        "status": "ok",
    }
