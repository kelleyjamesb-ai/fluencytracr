import json

import pytest

import fluencytracr_inference.longitudinal_replicated_validation_cli as cli
from fluencytracr_inference.longitudinal_replicated_validation_artifact import (
    emit_longitudinal_replicated_validation_artifact,
)
from fluencytracr_inference.longitudinal_replicated_validation_cli import main


def test_plan_cli_prints_only_the_compiled_plan(capsys):
    assert main(["plan"]) == 0
    plan = json.loads(capsys.readouterr().out)
    assert plan["required_slot_count"] == 1200
    assert plan["chunk_count"] == 20
    assert plan["thresholds_runtime_configurable"] is False
    assert plan["seeds_runtime_configurable"] is False
    assert plan["replication_count_runtime_configurable"] is False


def test_cli_exposes_no_seed_threshold_or_replication_overrides():
    with pytest.raises(SystemExit):
        main(["plan", "--base-seed", "1"])
    with pytest.raises(SystemExit):
        main(["run-chunk", "--chunk-index", "0", "--workspace", "/tmp/x", "--chunk-size", "1"])
    with pytest.raises(SystemExit):
        main(["run-controls", "--workspace", "/tmp/x", "--threshold", "0.5"])


def test_direct_full_artifact_emission_is_not_publicly_constructible():
    with pytest.raises(ValueError, match="strict workspace loader"):
        emit_longitudinal_replicated_validation_artifact(
            execution_identity=None,
            calibration_results=(),
            calibration_chunks=(),
            control_study=None,
            execution_mode="full",
        )


def test_combine_reuses_the_existing_timestamp_idempotently(
    tmp_path, monkeypatch, capsys
):
    calls = []

    def fake_full_artifact(*, workspace_dir, generated_at=None):
        calls.append((workspace_dir, generated_at))
        return {
            "generated_at": generated_at or "2026-07-12T00:00:00+00:00",
            "hash_bindings": {"artifact_self_hash": "a" * 64},
            "governance_state": {
                "state": "HOLD",
                "numerical_validation_gate_passed": False,
            },
        }

    monkeypatch.setattr(
        cli, "run_full_replicated_validation_artifact", fake_full_artifact
    )
    workspace = tmp_path / "workspace"

    assert main(["combine", "--workspace", str(workspace)]) == 0
    capsys.readouterr()
    first_bytes = (
        workspace / "longitudinal_replicated_validation_artifact.json"
    ).read_bytes()
    assert main(["combine", "--workspace", str(workspace)]) == 0
    capsys.readouterr()

    assert (
        workspace / "longitudinal_replicated_validation_artifact.json"
    ).read_bytes() == first_bytes
    assert calls[0][1] is None
    assert calls[1][1] == "2026-07-12T00:00:00+00:00"
