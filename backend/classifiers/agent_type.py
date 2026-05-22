"""Classifier for V2.3 AGENT sub-surface labels."""

from __future__ import annotations


AGENT_AUTONOMOUS = "agent:autonomous"
AGENT_WORKFLOW_NAMED = "agent:workflow_named"
AGENT_EPHEMERAL = "agent:ephemeral"


def classify_agent_run(
    is_autonomous: bool | None,
    workflow_name: str | None,
    unlisted: bool,
) -> str:
    if is_autonomous is True:
        return AGENT_AUTONOMOUS
    # TODO(AGENT_TYPES.md section 11): revisit whether NO_SNAPSHOT runs should
    # be excluded entirely once V2.3 implementation has production data.
    if is_autonomous is None:
        return AGENT_EPHEMERAL
    if workflow_name is not None and workflow_name.strip() and unlisted is False:
        return AGENT_WORKFLOW_NAMED
    return AGENT_EPHEMERAL
