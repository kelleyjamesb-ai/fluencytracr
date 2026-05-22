import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from backend.classifiers.agent_type import classify_agent_run


def test_autonomous_agent_wins_regardless_of_name_or_unlisted() -> None:
    assert classify_agent_run(True, "Named Skill", False) == "agent:autonomous"


def test_named_workflow_agent_requires_name_and_listed_workflow() -> None:
    assert classify_agent_run(False, "Published Skill", False) == "agent:workflow_named"


def test_blank_workflow_name_is_ephemeral() -> None:
    assert classify_agent_run(False, "   ", False) == "agent:ephemeral"


def test_unlisted_workflow_is_ephemeral() -> None:
    assert classify_agent_run(False, "Internal draft", True) == "agent:ephemeral"


def test_no_snapshot_defaults_to_ephemeral() -> None:
    assert classify_agent_run(None, None, False) == "agent:ephemeral"
