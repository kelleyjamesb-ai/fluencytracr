import json
from types import SimpleNamespace

from fluencytracr_inference import vbd_trajectory_validation_cli as cli


def test_runner_summary_cli_is_compact_and_nonauthorizing(capsys):
    assert cli.main(["runner-summary"]) == 0
    value = json.loads(capsys.readouterr().out)
    assert value["slot_count_per_phase"] == 2_000
    assert value["fresh_process_count_required"] == 4_000
    assert value["acceptance_plan_execution_authorized"] is False
    assert value["task_5_6_complete"] is False


def test_smoke_cli_remains_hold_and_has_no_acceptance_slot(monkeypatch, capsys):
    monkeypatch.setattr(
        cli,
        "run_vbd_trajectory_smoke_artifact",
        lambda: {
            "evidence_status": {
                "state": "HOLD",
                "failing_checks": ["smoke_mode_nonacceptance"],
            },
            "hash_bindings": {"artifact_self_hash": "a" * 64},
        },
    )
    assert cli.main(["smoke"]) == 0
    value = json.loads(capsys.readouterr().out)
    assert value["state"] == "HOLD"
    assert value["acceptance_slot_key"] is None
    assert value["aggregate_acceptance_gate_computed"] is False
    assert value["task_5_6_complete"] is False


def test_hidden_child_failure_is_silent_and_nonzero(monkeypatch, capsys):
    monkeypatch.setattr(cli.sys, "stdin", SimpleNamespace(buffer=None))
    assert cli.main(["_execute-slot"]) == 2
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == ""
