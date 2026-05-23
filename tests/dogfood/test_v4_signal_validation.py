import csv
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRIVER = ROOT / "scripts" / "dogfood" / "run_v4_signal_validation.py"
FIXTURE_ROOT = ROOT / "tests" / "fixtures" / "v4_signal_validation"
SUMMARY_OUTPUT = "v4_signal_validation_summary.json"
READOUT_OUTPUT = "V4_SIGNAL_VALIDATION_READOUT.md"
PROMOTION_TABLE_OUTPUT = "v4_signal_promotion_table.csv"
PROMOTION_COLUMNS = [
    "signal_name",
    "decision",
    "confidence",
    "evidence_summary",
    "primary_reason",
    "product_destination",
    "required_followup",
]


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


def copy_fixture_dir(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    for path in source.glob("*.csv"):
        (target / path.name).write_text(path.read_text())


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


def display_header_row(row: dict[str, object]) -> dict[str, object]:
    return {
        key.replace("_", " ").title(): value
        for key, value in row.items()
    }


def test_three_stable_windows_can_recommend_promote_without_person_fields(tmp_path: Path) -> None:
    assert FIXTURE_ROOT.exists()
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "complete", input_dir)

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    assert (output_dir / SUMMARY_OUTPUT).exists()
    assert (output_dir / READOUT_OUTPUT).exists()
    assert (output_dir / PROMOTION_TABLE_OUTPUT).exists()
    summary_text = (output_dir / SUMMARY_OUTPUT).read_text()
    summary = json.loads(summary_text)
    assert summary["status"] == "PASS"
    assert summary["governance"]["person_level_fields_present"] is False
    assert summary["governance"]["output_is_aggregate_only"] is True
    assert summary["signals"]["depth"]["decision"] == "HOLD"
    assert summary["signals"]["delegation_depth"]["decision"] == "PROMOTE"
    assert summary["signals"]["rapid_refinement"]["decision"] == "PROMOTE"
    assert summary["signals"]["reusable_workflow_propagation"]["decision"] == "PROMOTE"
    assert summary["signals"]["velocity_depth_zone"]["decision"] == "REJECT"
    assert "user_id" not in summary_text
    assert "email" not in summary_text

    readout = (output_dir / READOUT_OUTPUT).read_text()
    for heading in [
        "## Executive Summary",
        "## Signals Evaluated",
        "## Inputs Found",
        "## Inputs Missing",
        "## Multi-Window Stability Summary",
        "## Distribution Shape Summary",
        "## Coverage Summary",
        "## Velocity Relationship Summary",
        "## Governance Safety Review",
        "## Promotion Decision Table",
        "## Recommended Next Phase",
        "## Required Caveats",
    ]:
        assert heading in readout
    assert "| delegation_depth | PROMOTE |" in readout
    assert "| depth | HOLD |" in readout
    assert "| velocity_depth_zone | REJECT |" in readout
    assert "This is dogfood validation only." in readout
    assert "u-123" not in readout
    assert "No individual scoring, team ranking, maturity scoring, productivity scoring" in readout
    for prohibited_claim in [
        "realized roi is",
        "causal productivity lift is",
        "customer-facing prediction is",
        "individual score:",
        "team rank:",
        "maturity score:",
    ]:
        assert prohibited_claim not in readout.lower()

    with (output_dir / PROMOTION_TABLE_OUTPUT).open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert list(rows[0].keys()) == PROMOTION_COLUMNS
    assert {row["signal_name"] for row in rows} == {
        "depth",
        "delegation_depth",
        "reusable_workflow_propagation",
        "rapid_refinement",
        "velocity_depth_zone",
    }
    decisions = {row["decision"] for row in rows}
    assert {"PROMOTE", "HOLD", "REJECT"}.issubset(decisions)


def test_header_format_variants_still_feed_metric_readers(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    for window in range(1, 4):
        write_csv(input_dir / f"v4_refinement_window_{window}.csv", [display_header_row(refinement_row())])
        write_csv(input_dir / f"v4_delegation_window_{window}.csv", [delegation_row()])
        write_csv(input_dir / f"v4_reuse_propagation_window_{window}.csv", [display_header_row(reuse_row())])
        write_csv(input_dir / f"v4_velocity_depth_window_{window}.csv", [velocity_depth_row()])

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["signals"]["rapid_refinement"]["decision"] == "PROMOTE"
    assert summary["signals"]["rapid_refinement"]["stability"]["p50_window_values"] == [2.0, 2.0, 2.0]
    assert summary["signals"]["rapid_refinement"]["coverage_summary"]["observed_event_count"] == 110.0
    assert summary["signals"]["reusable_workflow_propagation"]["decision"] == "PROMOTE"
    assert summary["signals"]["reusable_workflow_propagation"]["stability"]["p50_window_values"] == [8.0, 8.0, 8.0]
    assert summary["signals"]["reusable_workflow_propagation"]["coverage_summary"]["workflow_count"] == 18.0


def test_forbidden_person_level_field_fails_closed(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "forbidden_field", input_dir)

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 1
    assert "forbidden person-level fields" in completed.stderr
    summary_text = (output_dir / SUMMARY_OUTPUT).read_text()
    summary = json.loads(summary_text)
    assert summary["status"] == "FAIL"
    assert summary["signals"]["delegation_depth"]["decision"] == "REJECT"
    assert summary["signals"]["delegation_depth"]["forbidden_field_detected"] is True
    assert "user_id" not in summary_text


def test_missing_required_column_fails_closed(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "incomplete", input_dir)

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 1
    assert "missing required columns" in completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "FAIL"
    assert summary["signals"]["delegation_depth"]["decision"] == "REJECT"
    assert "bucket_event_share" in summary["signals"]["delegation_depth"]["missing_columns"]


def test_fewer_than_three_windows_holds_not_promotes(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    copy_fixture_dir(FIXTURE_ROOT / "two_windows", input_dir)

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "PASS"
    assert summary["signals"]["rapid_refinement"]["decision"] == "HOLD"
    assert summary["signals"]["rapid_refinement"]["windows_present"] == 2
    assert summary["signals"]["delegation_depth"]["decision"] == "HOLD"
    assert summary["signals"]["velocity_depth_zone"]["decision"] == "HOLD"


def test_non_contiguous_fixed_windows_hold_not_promote(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    output_dir = tmp_path / "out"
    write_complete_input(input_dir)
    (input_dir / "v4_refinement_window_1.csv").unlink()
    write_csv(input_dir / "v4_refinement_window_4.csv", [refinement_row()])

    completed = run_validator(input_dir, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    refinement = summary["signals"]["rapid_refinement"]
    assert refinement["decision"] == "HOLD"
    assert refinement["primary_reason"] == "missing required fixed windows"
    assert "v4_refinement_window_1.csv" in refinement["input_files_missing"]
    assert "v4_refinement_window_4.csv" in refinement["input_files_found"]
    assert refinement["stability"]["p50_window_values"] == [2.0, 2.0, 2.0]
