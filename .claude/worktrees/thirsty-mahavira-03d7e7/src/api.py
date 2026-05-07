"""API helpers enforcing aggregation and RBAC rules."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from src.access_control import RequestContext, enforce_aggregation_defaults, enforce_role_access
from src.enablement_import import EnablementStore
from src.fluency_service import build_executive_heat_map
from src.passive_signals import PassiveSignalStore
from src.teams_roles import Directory


def handle_dashboard_request(request: RequestContext) -> dict[str, str]:
    """Apply access controls and aggregation rules for dashboard requests."""
    enforce_role_access(request)
    query = enforce_aggregation_defaults(request.query)
    return {
        "endpoint": request.endpoint,
        "aggregation": query["aggregation"],
        "status": "ok",
    }


def handle_executive_command_center(
    request: RequestContext,
    *,
    directory: Directory,
    passive_store: PassiveSignalStore,
    enablement_store: EnablementStore,
    approved_ai_list: list[str],
) -> dict[str, object]:
    enforce_role_access(request)
    if request.endpoint != "/api/v1/executive/command-center":
        raise ValueError("Unsupported executive endpoint")
    org_id = request.query.get("org_id", "")
    if not org_id:
        raise ValueError("org_id is required")
    heat_map = build_executive_heat_map(
        org_id,
        directory=directory,
        passive_store=passive_store,
        enablement_store=enablement_store,
        approved_ai_list=approved_ai_list,
    )
    return {
        "org_id": heat_map.org_id,
        "org_index": heat_map.org_index,
        "team_deltas": heat_map.team_deltas,
    }
