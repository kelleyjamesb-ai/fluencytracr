from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


BASE_TIME = datetime(2026, 5, 1, tzinfo=timezone.utc)


def workflow_run(
    *,
    user: str = "user-1",
    feature: str = "CHAT",
    root_workflow_id: str = "workflow-1",
    run_id: str = "run-1",
    session_token: str = "session-1",
    offset_minutes: int = 0,
    status: str = "completed",
) -> dict[str, Any]:
    return {
        "timestamp": (BASE_TIME + timedelta(minutes=offset_minutes)).isoformat(),
        "jsonPayload": {
            "type": "WORKFLOW_RUN",
            "user": {"userid": user},
            "workflowrun": {
                "feature": feature,
                "rootworkflowid": root_workflow_id,
                "runid": run_id,
                "sessiontrackingtoken": session_token,
                "totalexecutionlatency": 1000,
                "workflowexecutions": [{"status": status}],
            },
            "workflow": {"workflowexecutionstatus": status},
        },
    }


def product_snapshot(
    *,
    workflow_id: str = "workflow-1",
    is_autonomous: bool = False,
    name: str | None = "Reusable skill",
    unlisted: bool = False,
    user: str = "user-1",
    offset_minutes: int = -1,
) -> dict[str, Any]:
    workflow: dict[str, Any] = {
        "workflowid": workflow_id,
        "isautonomousagent": is_autonomous,
        "unlisted": unlisted,
    }
    if name is not None:
        workflow["name"] = name
    return {
        "timestamp": (BASE_TIME + timedelta(minutes=offset_minutes)).isoformat(),
        "jsonPayload": {
            "type": "PRODUCT_SNAPSHOT",
            "user": {"userid": user},
            "productsnapshot": {
                "user": {"id": user},
                "workflow": workflow,
            },
        },
    }


def glean_bot_activity(
    *,
    user: str = "user-1",
    session_token: str = "bot-session-1",
    offset_minutes: int = 0,
) -> dict[str, Any]:
    return {
        "timestamp": (BASE_TIME + timedelta(minutes=offset_minutes)).isoformat(),
        "jsonPayload": {
            "type": "GLEAN_BOT_ACTIVITY",
            "user": {"userid": user},
            "gleanbotactivity": {"eventtrackingtoken": session_token},
        },
    }


def verification_signal(
    event_type: str,
    *,
    user: str = "user-1",
    session_token: str | None = None,
    tracking_token: str | None = None,
    run_id: str | None = None,
    offset_minutes: int = 1,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": event_type,
        "user": {"userid": user},
    }
    key = event_type.lower()
    compact_key = key.replace("_", "")
    payload[compact_key] = {}
    if tracking_token is not None:
        payload[compact_key]["trackingtoken"] = tracking_token
    if session_token is not None:
        payload[compact_key]["sessiontrackingtoken"] = session_token
        payload[compact_key]["chatsessionid"] = session_token
    if run_id is not None:
        payload[compact_key]["runid"] = run_id
        payload[compact_key]["workflowrunid"] = run_id
    return {
        "timestamp": (BASE_TIME + timedelta(minutes=offset_minutes)).isoformat(),
        "jsonPayload": payload,
    }


def non_surface_event(event_type: str, *, user: str = "user-1") -> dict[str, Any]:
    return {
        "timestamp": BASE_TIME.isoformat(),
        "jsonPayload": {
            "type": event_type,
            "user": {"userid": user},
            event_type.lower(): {"sessiontrackingtoken": "non-surface-session"},
        },
    }
