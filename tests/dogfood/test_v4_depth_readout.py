import csv
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRIVER = ROOT / "scripts" / "dogfood" / "run_v4_depth_readout.py"
FIXTURE_ROOT = ROOT / "tests" / "fixtures" / "v4_depth_readout"

SUMMARY_OUTPUT = "v4_depth_summary.json"
READOUT_OUTPUT = "V4_DEPTH_READOUT.md"
BY_SURFACE_OUTPUT = "v4_depth_by_surface.csv"
ALLOWED_ZONES = {
    "OPERATING_LEVERAGE_CANDIDATE",
    "FRAGILE_SCALE_CANDIDATE",
    "FOCUSED_DEPTH_CANDIDATE",
    "THIN_USE_CANDIDATE",
    "INSUFFICIENT_EVIDENCE",
    "SUPPRESSED",
}


def copy_fixture_dir(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    for path in source.glob("*.csv"):
        (target / path.name).write_text(path.read_text())


def run_depth_readout(input_dir: Path, output_dir: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(DRIVER),
            "--input-dir",
            str(input_dir),
            "--output-dir",
            str(output_dir),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=20,
    )


def output_text(output_dir: Path) -> str:
    return "\n".join(
        [
            (output_dir / READOUT_OUTPUT).read_text(),
            (output_dir / SUMMARY_OUTPUT).read_text(),
            (output_dir / BY_SURFACE_OUTPUT).read_text(),
        ]
    )


def remove_column_from_csv(path: Path, column: str) -> None:
    with path.open(newline="") as handle:
        rows = list(csv.DictReader(handle))
        original_fieldnames = list(rows[0].keys())
        fieldnames = [field for field in original_fieldnames if field != column]
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row[field] for field in fieldnames})


def test_depth_readout_generates_outputs_and_all_zones(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "complete", input_dir)

    completed = run_depth_readout(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    assert (output_dir / READOUT_OUTPUT).exists()
    assert (output_dir / SUMMARY_OUTPUT).exists()
    assert (output_dir / BY_SURFACE_OUTPUT).exists()

    summary_text = (output_dir / SUMMARY_OUTPUT).read_text()
    summary = json.loads(summary_text)
    assert summary["status"] == "PASS"
    assert summary["governance"]["dogfood_only"] is True
    assert summary["reusable_workflow_propagation"]["decision"] == "HOLD"
    assert summary["reusable_workflow_propagation"]["used_as_depth_driver"] is False
    assert "user_id" not in summary_text
    assert "email" not in summary_text

    with (output_dir / BY_SURFACE_OUTPUT).open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    zones = {row["zone"] for row in rows}
    assert zones == ALLOWED_ZONES
    assert {row["surface_id"] for row in rows} >= {
        "workflow:agent:autonomous",
        "workflow:CHAT",
        "workflow:agent:workflow_named",
        "standalone:SEARCH",
        "workflow:UNMAPPED",
        "workflow:SPARSE",
    }

    readout = (output_dir / READOUT_OUTPUT).read_text()
    for heading in [
        "## Executive Summary",
        "## Inputs Found",
        "## Inputs Missing",
        "## Velocity Summary",
        "## Delegation Depth Summary",
        "## Refinement Depth Summary",
        "## Velocity × Depth Zone Summary",
        "## Surfaces by Zone",
        "## Evidence Gaps",
        "## Reusable Workflow Propagation Status",
        "## Governance Caveats",
        "## Recommended Next Build",
        "## Non-Capabilities",
    ]:
        assert heading in readout
    for required_language in [
        "This readout is dogfood-only.",
        "This readout does not calculate ROI.",
        "This readout does not prove productivity lift.",
        "This readout does not rank teams, people, managers, or departments.",
        "This readout does not productize V4.",
        "Reusable Workflow Propagation and Named Workflow Leverage remain HOLD pending metadata observability.",
        "V4 economic readouts remain blocked until Depth readout stability is demonstrated across windows or cohorts.",
    ]:
        assert required_language in readout

    combined = output_text(output_dir).lower()
    for prohibited_claim in [
        "roi calculated",
        "productivity lift proven",
        "prediction:",
        "individual score:",
        "team rank:",
        "maturity score:",
        "productivity score:",
    ]:
        assert prohibited_claim not in combined


def test_bucket_level_delegation_does_not_drive_surface_depth(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "complete", input_dir)
    for path in input_dir.glob("v4_delegation_window_*.csv"):
        remove_column_from_csv(path, "workflow_id")

    completed = run_depth_readout(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    with (output_dir / BY_SURFACE_OUTPUT).open(newline="") as handle:
        rows = {row["surface_id"]: row for row in csv.DictReader(handle)}

    unmapped = rows["workflow:UNMAPPED"]
    assert unmapped["zone"] == "INSUFFICIENT_EVIDENCE"
    assert unmapped["depth_index"] == ""
    assert unmapped["delegation_depth_index"] == ""
    assert rows["workflow:agent:autonomous"]["zone"] == "OPERATING_LEVERAGE_CANDIDATE"
    assert "Delegation export is bucket-level" in (output_dir / READOUT_OUTPUT).read_text()


def test_forbidden_person_level_fields_fail_closed(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "forbidden_field", input_dir)

    completed = run_depth_readout(input_dir, output_dir)

    assert completed.returncode == 1
    assert "forbidden person-level fields" in completed.stderr
    summary_text = (output_dir / SUMMARY_OUTPUT).read_text()
    summary = json.loads(summary_text)
    assert summary["status"] == "FAIL"
    assert summary["governance"]["person_level_fields_present"] is True
    assert "user_id" not in summary_text
    assert "unsafe-user" not in summary_text


def test_missing_required_file_fails_closed(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "missing_required_file", input_dir)

    completed = run_depth_readout(input_dir, output_dir)

    assert completed.returncode == 1
    assert "missing required files" in completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "FAIL"
    assert "v4_velocity_window_3.csv" in summary["inputs_missing"]
