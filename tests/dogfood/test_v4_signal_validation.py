import csv
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRIVER = ROOT / "scripts" / "dogfood" / "run_v4_signal_validation.py"
FIXTURE_ROOT = ROOT / "tests" / "fixtures" / "v4_signal_validation"


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys()) if rows else ["empty"]
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def run_validator(input_dir: Path, output_dir: Path) -> subprocess.CompletedProcess[str]:
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


def refinement_row(p50: float = 2.0) -> dict[str, object]:
    return {
        "surface_family": "workflow",
        "workflow_family": "eng-on-call-triage",
        "refinement_evidence_type": "confirmed_same_session_refinement",
        "aggregate_join_key_count": 44,
        "observed_event_count": 110,
        "repeated_event_count": 52,
        "p10": 1,
        "p50": p50,
        "p90": p50 * 2,
        "p99": p50 * 3,
    }


def delegation_row(p50: float = 0.12) -> dict[str, object]:
    return {
        "delegation_bucket": "structured_delegation",
        "aggregate_user_count": 64,
        "aggregate_bucket_events": 240,
        "aggregate_taxonomy_events": 1200,
        "bucket_event_share": 0.2,
        "p10": p50 / 4,
        "p50": p50,
        "p90": p50 * 2,
        "p99": p50 * 3,
    }


def reuse_row(p50: float = 8.0) -> dict[str, object]:
    return {
        "population": "named_reusable_workflows",
        "adopter_bucket": "team_scale_reuse",
        "workflow_count": 18,
        "run_count": 360,
        "summed_workflow_adopters": 144,
        "workflow_share": 0.36,
        "run_share": 0.41,
        "adopter_count_p50": p50,
        "adopter_count_p90": p50 * 2,
        "adopter_count_p99": p50 * 3,
    }


def velocity_depth_row(p50: float = 0.54) -> dict[str, object]:
    return {
        "zone": "high_velocity_high_depth",
        "cohort_size": 72,
        "velocity_p50": 0.74,
        "depth_p50": 0.61,
        "velocity_relationship": "complementary",
        "p10": p50 / 2,
        "p50": p50,
        "p90": p50 * 1.5,
        "p99": p50 * 1.8,
    }


def write_family_windows(
    input_dir: Path,
    family: str,
    row_factory,
    windows: int = 3,
) -> None:
    for window in range(1, windows + 1):
        write_csv(input_dir / f"v4_{family}_window_{window}.csv", [row_factory()])


def write_complete_input(input_dir: Path) -> None:
    write_family_windows(input_dir, "refinement", refinement_row)
    write_family_windows(input_dir, "delegation", delegation_row)
    write_family_windows(input_dir, "reuse_propagation", reuse_row)
    write_family_windows(input_dir, "velocity_depth", velocity_depth_row)


def test_three_stable_windows_can_recommend_promote_without_person_fields(tmp_path: Path) -> None:
    assert FIXTURE_ROOT.exists()
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    write_complete_input(input_dir)

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / "validation_summary.json").read_text())
    assert summary["status"] == "PASS"
    assert summary["governance"]["person_level_fields_present"] is False
    assert summary["governance"]["output_is_aggregate_only"] is True
    assert summary["signals"]["delegation_depth"]["decision"] == "PROMOTE"
    assert summary["signals"]["rapid_refinement"]["decision"] == "PROMOTE"
    assert summary["signals"]["reusable_workflow_propagation"]["decision"] == "PROMOTE"
    assert summary["signals"]["velocity_depth_zone"]["decision"] == "PROMOTE"

    readout = (output_dir / "VALIDATION_READOUT.md").read_text()
    assert "| delegation_depth | PROMOTE |" in readout
    assert "This is dogfood validation only." in readout
    assert "u-123" not in readout


def test_forbidden_person_level_field_fails_closed(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    write_complete_input(input_dir)
    unsafe = delegation_row()
    unsafe["user_id"] = "u-123"
    write_csv(input_dir / "v4_delegation_window_2.csv", [unsafe])

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 1
    assert "forbidden person-level fields" in completed.stderr
    summary = json.loads((output_dir / "validation_summary.json").read_text())
    assert summary["status"] == "FAIL"
    assert summary["signals"]["delegation_depth"]["decision"] == "REJECT"
    assert "user_id" in summary["signals"]["delegation_depth"]["forbidden_fields"]


def test_missing_required_column_fails_closed(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    write_complete_input(input_dir)
    incomplete = delegation_row()
    incomplete.pop("bucket_event_share")
    write_csv(input_dir / "v4_delegation_window_1.csv", [incomplete])

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 1
    assert "missing required columns" in completed.stderr
    summary = json.loads((output_dir / "validation_summary.json").read_text())
    assert summary["status"] == "FAIL"
    assert summary["signals"]["delegation_depth"]["decision"] == "REJECT"
    assert "bucket_event_share" in summary["signals"]["delegation_depth"]["missing_columns"]


def test_fewer_than_three_windows_holds_not_promotes(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    write_family_windows(input_dir, "refinement", refinement_row, windows=2)

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / "validation_summary.json").read_text())
    assert summary["status"] == "PASS"
    assert summary["signals"]["rapid_refinement"]["decision"] == "HOLD"
    assert summary["signals"]["rapid_refinement"]["windows_present"] == 2
    assert summary["signals"]["delegation_depth"]["decision"] == "HOLD"
    assert summary["signals"]["velocity_depth_zone"]["decision"] == "HOLD"
