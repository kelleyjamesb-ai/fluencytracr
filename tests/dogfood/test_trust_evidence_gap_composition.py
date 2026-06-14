import csv
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRIVER = ROOT / "scripts" / "dogfood" / "run_trust_evidence_gap_composition_readout.py"
SQL = ROOT / "sql" / "dogfood" / "trust_evidence_gap_composition_diagnostic.sql"
RETAINED_OUTPUT = ROOT / "dogfood-output" / "trust-evidence-gap-composition"

SUMMARY_OUTPUT = "trust_evidence_gap_composition_summary.json"
READOUT_OUTPUT = "TRUST_EVIDENCE_GAP_COMPOSITION_READOUT.md"
COMPOSITION_OUTPUT = "trust_evidence_gap_composition_summary.csv"


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def run_composition(input_csv: Path, output_dir: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(DRIVER),
            "--input-csv",
            str(input_csv),
            "--output-dir",
            str(output_dir),
            "--customer-label",
            "Northstar aggregate pilot",
            "--window-label",
            "Seven approved business days",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=20,
    )


def composition_rows() -> list[dict[str, object]]:
    return [
        {
            "gap_component": "raw_gap_insufficient_downstream_evidence",
            "episode_count": 37484844,
            "coverage_caveat": "episode has insufficient downstream evidence for trust interpretation",
        },
        {
            "gap_component": "ambiguous_boundary_folded",
            "episode_count": 474414,
            "coverage_caveat": "candidate episode-key count; trace, run, and session keys may overlap",
        },
        {
            "gap_component": "small_cell_withheld",
            "episode_count": 2,
            "coverage_caveat": "rare aggregate cell below output floor",
        },
    ]


def test_composition_csv_generates_safe_gap_readout(tmp_path: Path) -> None:
    input_csv = tmp_path / "trust_gap_composition.csv"
    output_dir = tmp_path / "out"
    write_csv(input_csv, composition_rows())

    completed = run_composition(input_csv, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "RESEARCH_CONTEXT_ONLY"
    assert summary["customer_label"] == "Northstar aggregate pilot"
    assert summary["window_label"] == "Seven approved business days"
    assert summary["total_gap_episode_count"] == 37959260
    assert summary["components"]["raw_gap_insufficient_downstream_evidence"]["episode_count"] == 37484844
    assert summary["components"]["ambiguous_boundary_folded"]["episode_count"] == 474414
    assert summary["components"]["small_cell_withheld"]["episode_count"] is None
    assert summary["components"]["small_cell_withheld"]["share"] is None
    assert summary["components"]["small_cell_withheld"]["withheld_below_floor"] is True
    assert summary["small_cell_policy"]["emits_sub_floor_component_values"] is False
    assert summary["governance"]["output_is_aggregate_only"] is True
    assert summary["governance"]["adds_runtime_api"] is False
    assert summary["governance"]["adds_canonical_events"] is False
    assert summary["governance"]["adds_suppression_reasons"] is False
    assert summary["governance"]["calculates_roi"] is False
    assert summary["governance"]["identifies_or_scores_employees"] is False

    readout = (output_dir / READOUT_OUTPUT).read_text()
    for heading in [
        "## What The Gap Is Comprised Of",
        "## Interpretation",
        "## What This Does Not Mean",
        "## Recommended Next Diagnostic",
    ]:
        assert heading in readout
    for phrase in [
        "37,484,844 aggregate episodes",
        "474,414 aggregate episodes",
        "true downstream-evidence gap",
        "ambiguous boundary fold-in",
        "small-cell safety fold-in",
        "below the aggregate safety floor",
        "does not identify, score, rank, or evaluate employees",
        "does not calculate ROI",
        "does not establish causality",
        "does not add canonical events",
        "does not add suppression reasons",
    ]:
        assert phrase in readout
    for raw_code in [
        "raw_gap_insufficient_downstream_evidence",
        "ambiguous_boundary_folded",
        "small_cell_withheld",
    ]:
        assert raw_code not in readout
    assert "2 aggregate episodes" not in readout

    with (output_dir / COMPOSITION_OUTPUT).open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert rows[0]["component_label"] == "True downstream-evidence gap"
    assert rows[1]["component_label"] == "Ambiguous boundary fold-in"
    assert rows[2]["component_label"] == "Small-cell safety fold-in"
    assert rows[2]["episode_count"] == "WITHHELD"


def test_invalid_identity_columns_fail_closed_and_remove_outputs(tmp_path: Path) -> None:
    output_dir = tmp_path / "out"
    valid_csv = tmp_path / "valid.csv"
    invalid_csv = tmp_path / "invalid.csv"
    write_csv(valid_csv, composition_rows())
    write_csv(
        invalid_csv,
        [
            {
                "gap_component": "raw_gap_insufficient_downstream_evidence",
                "episode_count": 12,
                "user_name": "person@example.com",
            }
        ],
    )
    assert run_composition(valid_csv, output_dir).returncode == 0
    assert (output_dir / READOUT_OUTPUT).exists()
    assert (output_dir / COMPOSITION_OUTPUT).exists()

    completed = run_composition(invalid_csv, output_dir)

    assert completed.returncode == 1
    assert "forbidden person-level fields" in completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "INVALID_INPUT"
    assert not (output_dir / READOUT_OUTPUT).exists()
    assert not (output_dir / COMPOSITION_OUTPUT).exists()


def test_retained_gap_composition_artifacts_match_public_pilot_gap() -> None:
    summary = json.loads((RETAINED_OUTPUT / SUMMARY_OUTPUT).read_text())
    assert summary["total_gap_episode_count"] == 37959260
    assert summary["components"]["raw_gap_insufficient_downstream_evidence"]["episode_count"] == 37484844
    assert summary["components"]["ambiguous_boundary_folded"]["episode_count"] == 474414
    assert summary["components"]["small_cell_withheld"]["episode_count"] is None
    assert summary["components"]["small_cell_withheld"]["withheld_below_floor"] is True

    readout = (RETAINED_OUTPUT / READOUT_OUTPUT).read_text()
    assert "Glean dogfood aggregate run-first sample" in readout
    assert "The public evidence gap is 37,959,260 aggregate episodes" in readout
    assert "43.1%" in readout
    assert "not a trust score" in readout


def test_gap_composition_sql_is_aggregate_only_and_explains_gap_buckets() -> None:
    sql = SQL.read_text()
    final_select = sql.rsplit("SELECT", maxsplit=1)[-1]

    for component in [
        "raw_gap_insufficient_downstream_evidence",
        "verification_or_feedback_without_observed_resolution",
        "ai_activity_without_terminal_outcome",
        "span_or_llm_activity_without_governed_outcome",
        "weak_parent_linkage",
        "ambiguous_boundary_folded",
        "small_cell_withheld",
        "other_evidence_gap",
    ]:
        assert component in sql
    for output_field in [
        "gap_component",
        "episode_count",
        "episode_share_of_gap",
        "coverage_caveat",
    ]:
        assert output_field in final_select
    for forbidden in [
        "user_id",
        "email",
        "manager",
        "employee",
        "prompt",
        "output",
        "transcript",
        "raw_event",
        "team",
        "rank",
        "score",
    ]:
        assert forbidden not in final_select.lower()
    for prohibited_product_change in [
        "CREATE TABLE",
        "INSERT INTO",
        "MERGE INTO",
        "CREATE VIEW",
    ]:
        assert prohibited_product_change not in sql
