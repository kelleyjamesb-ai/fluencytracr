import json
import os
from pathlib import Path
import subprocess
import sys

from fluencytracr_inference.longitudinal_concordance import (
    LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT,
)
from fluencytracr_inference.longitudinal_concordance_cli import main


def test_plan_cli_emits_exact_stdout_json(capsys):
    assert main(["--plan"]) == 0
    output = json.loads(capsys.readouterr().out)

    assert output["required_slot_count"] == LONGITUDINAL_CONCORDANCE_REQUIRED_SLOT_COUNT
    assert len(output["slot_ids"]) == 30
    assert output["plan_hash"]


def test_module_plan_cli_has_no_stderr_or_file_output():
    repo_root = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "fluencytracr_inference.longitudinal_concordance_cli",
            "--plan",
        ],
        check=False,
        capture_output=True,
        text=True,
        cwd=repo_root,
        env={
            **os.environ,
            "PYTHONPATH": str(repo_root / "inference" / "src"),
        },
    )

    assert result.returncode == 0
    assert result.stderr == ""
    assert json.loads(result.stdout)["required_slot_count"] == 30
