import io
import json
import os
from types import SimpleNamespace

from fluencytracr_inference import vbd_trajectory_concordance_cli as cli


def test_concordance_plan_cli_is_exact_and_nonauthorizing(capsys):
    assert cli.main(["plan"]) == 0
    value = json.loads(capsys.readouterr().out)

    assert value["bundle_count"] == 30
    assert value["lane_fit_count_per_engine"] == 90
    assert value["execution"]["acceptance_canaries_executed"] is False
    assert value["execution"]["replicated_validation_executed"] is False
    assert value["customer_output_authorized"] is False
    assert value["task_5_6_complete"] is False


def test_private_child_cli_uses_bounded_diagnostic_fd_without_raw_text(
    monkeypatch, capsys
):
    secret = "raw exception text must never cross the child boundary"
    read_descriptor, write_descriptor = os.pipe()
    monkeypatch.setenv(
        "FT_VBD_TRAJECTORY_DIAGNOSTIC_FD", str(write_descriptor)
    )
    monkeypatch.setattr(
        cli.sys, "stdin", SimpleNamespace(buffer=io.BytesIO(b"{}"))
    )
    monkeypatch.setattr(cli, "_decode_json_bytes", lambda *_args: {})
    monkeypatch.setattr(
        cli,
        "execute_vbd_trajectory_concordance_child",
        lambda _value: (_ for _ in ()).throw(RuntimeError(secret)),
    )

    try:
        assert cli.main(["_execute-bundle"]) == 2
        write_descriptor = -1
        encoded = os.read(read_descriptor, 513)
    finally:
        if write_descriptor >= 0:
            os.close(write_descriptor)
        os.close(read_descriptor)
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == ""
    assert secret.encode("utf-8") not in encoded
    assert len(encoded) <= 512
    diagnostic = json.loads(encoded)
    assert diagnostic["failure_phase"] == "child_entrypoint"
    assert diagnostic["exception_type"] == "RuntimeError"
