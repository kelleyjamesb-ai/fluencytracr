import csv
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRIVER = ROOT / "scripts" / "dogfood" / "run_trust_episode_pilot_readout.py"
RUNBOOK = ROOT / "docs" / "dogfood" / "TRUST_EPISODE_PILOT_RUNBOOK.md"
RETAINED_PILOT_OUTPUT = ROOT / "dogfood-output" / "trust-episode-boundary-pilot"

SUMMARY_OUTPUT = "trust_episode_pilot_summary.json"
READOUT_OUTPUT = "TRUST_EPISODE_PILOT_EXECUTIVE_READOUT.md"
PATTERN_OUTPUT = "trust_episode_pilot_pattern_summary.csv"


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def run_pilot(input_csv: Path, output_dir: Path) -> subprocess.CompletedProcess[str]:
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


def aggregate_rows() -> list[dict[str, object]]:
    return [
        {
            "episode_pattern": "resolved_with_confidence",
            "boundary_layer": "immediate_episode",
            "primary_evidence_family": "feedback_signal",
            "episode_count": 400,
            "episode_share": 0.04,
            "explicit_feedback_episode_count": 40,
            "negative_feedback_episode_count": 2,
            "positive_feedback_episode_count": 38,
            "agent_completion_episode_count": 300,
            "failure_or_friction_episode_count": 0,
            "post_failure_continuation_episode_count": 0,
            "skill_episode_count": 20,
            "post_skill_continuation_episode_count": 18,
            "citation_click_episode_count": 30,
            "citation_available_episode_count": 120,
            "coverage_caveat": "aggregate episode evidence only",
        },
        {
            "episode_pattern": "resolved_without_verification_signal",
            "boundary_layer": "same_session_continuation",
            "primary_evidence_family": "agent_completion",
            "episode_count": 3400,
            "episode_share": 0.34,
            "explicit_feedback_episode_count": 0,
            "negative_feedback_episode_count": 0,
            "positive_feedback_episode_count": 0,
            "agent_completion_episode_count": 3400,
            "failure_or_friction_episode_count": 0,
            "post_failure_continuation_episode_count": 0,
            "skill_episode_count": 100,
            "post_skill_continuation_episode_count": 75,
            "citation_click_episode_count": 0,
            "citation_available_episode_count": 400,
            "coverage_caveat": "resolution is observed, but explicit verification or feedback is not",
        },
        {
            "episode_pattern": "recovered_after_failure",
            "boundary_layer": "same_session_continuation",
            "primary_evidence_family": "post_failure_behavior",
            "episode_count": 1800,
            "episode_share": 0.18,
            "explicit_feedback_episode_count": 10,
            "negative_feedback_episode_count": 5,
            "positive_feedback_episode_count": 5,
            "agent_completion_episode_count": 1400,
            "failure_or_friction_episode_count": 1800,
            "post_failure_continuation_episode_count": 1800,
            "skill_episode_count": 250,
            "post_skill_continuation_episode_count": 200,
            "citation_click_episode_count": 50,
            "citation_available_episode_count": 600,
            "coverage_caveat": "aggregate episode evidence only",
        },
        {
            "episode_pattern": "stalled_after_ai_assist",
            "boundary_layer": "trace_context",
            "primary_evidence_family": "post_failure_behavior",
            "episode_count": 60,
            "episode_share": 0.006,
            "explicit_feedback_episode_count": 0,
            "negative_feedback_episode_count": 0,
            "positive_feedback_episode_count": 0,
            "agent_completion_episode_count": 0,
            "failure_or_friction_episode_count": 60,
            "post_failure_continuation_episode_count": 0,
            "skill_episode_count": 2,
            "post_skill_continuation_episode_count": 0,
            "citation_click_episode_count": 0,
            "citation_available_episode_count": 10,
            "coverage_caveat": "candidate episode-key count; trace, run, and session keys may overlap",
        },
        {
            "episode_pattern": "explicit_negative_feedback",
            "boundary_layer": "same_session_continuation",
            "primary_evidence_family": "feedback_signal",
            "episode_count": 2,
            "episode_share": 0.0002,
            "explicit_feedback_episode_count": 2,
            "negative_feedback_episode_count": 2,
            "positive_feedback_episode_count": 0,
            "agent_completion_episode_count": 0,
            "failure_or_friction_episode_count": 2,
            "post_failure_continuation_episode_count": 0,
            "skill_episode_count": 0,
            "post_skill_continuation_episode_count": 0,
            "citation_click_episode_count": 0,
            "citation_available_episode_count": 0,
            "coverage_caveat": "rare aggregate cell below output floor",
        },
        {
            "episode_pattern": "evidence_gap",
            "boundary_layer": "unknown_boundary",
            "primary_evidence_family": "evidence_gap",
            "episode_count": 4338,
            "episode_share": 0.4338,
            "explicit_feedback_episode_count": 0,
            "negative_feedback_episode_count": 0,
            "positive_feedback_episode_count": 0,
            "agent_completion_episode_count": 0,
            "failure_or_friction_episode_count": 0,
            "post_failure_continuation_episode_count": 0,
            "skill_episode_count": 0,
            "post_skill_continuation_episode_count": 0,
            "citation_click_episode_count": 0,
            "citation_available_episode_count": 0,
            "coverage_caveat": "episode has insufficient downstream evidence for trust interpretation",
        },
    ]


def test_aggregate_csv_generates_executive_safe_readout(tmp_path: Path) -> None:
    input_csv = tmp_path / "trust_episode_export.csv"
    output_dir = tmp_path / "out"
    write_csv(input_csv, aggregate_rows())

    completed = run_pilot(input_csv, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "EVIDENCE_CONTEXT_ONLY"
    assert summary["customer_label"] == "Northstar aggregate pilot"
    assert summary["window_label"] == "Seven approved business days"
    assert summary["total_episode_count"] == 10000
    assert summary["patterns"]["recovered_after_failure"]["share"] == 0.18
    assert summary["patterns"]["stalled_after_ai_assist"]["episode_count"] == 0
    assert summary["patterns"]["explicit_negative_feedback"]["episode_count"] == 0
    assert summary["patterns"]["evidence_gap"]["episode_count"] == 4400
    assert summary["small_cell_policy"]["emits_sub_floor_pattern_values"] is False
    assert summary["small_cell_policy"]["folds_sub_floor_pattern_values_into_evidence_gap"] is True
    assert summary["source_coverage_policy"]["emits_ambiguous_coverage_pattern_values"] is False
    assert summary["source_coverage_policy"]["folds_unsafe_coverage_rows_into_evidence_gap"] is True
    assert summary["governance"]["output_is_aggregate_only"] is True
    assert summary["governance"]["requires_customer_approved_aggregate_scope"] is True
    assert summary["governance"]["adds_runtime_api"] is False

    readout = (output_dir / READOUT_OUTPUT).read_text()
    for heading in [
        "## Executive Interpretation",
        "## Aggregate Episode Evidence",
        "## Trust Calibration Context",
        "## Source Coverage And Caveats",
        "## Required Citations",
        "## Non-Goals",
    ]:
        assert heading in readout
    for phrase in [
        "work resolves, recovers after friction, stalls, or lacks enough evidence",
        "does not identify, score, rank, or evaluate employees",
        "not a trust score",
        "not a citation-click metric",
        "not a correctness detector",
        "does not calculate ROI",
        "does not establish causality",
        "does not add canonical events",
        "does not add suppression reasons",
        "V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md",
        "TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md",
        "TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md",
        "Rare pattern cells below the aggregate safety floor",
        "Rows with incomplete, ambiguous, or undocumented source coverage",
    ]:
        assert phrase in readout
    assert "Work stalled after AI assistance" not in readout
    assert "60 aggregate episodes" not in readout
    assert "Explicit negative feedback appeared" not in readout
    assert "2 aggregate episodes" not in readout
    for raw_code in [
        "resolved_with_confidence",
        "resolved_without_verification_signal",
        "recovered_after_failure",
        "stalled_after_ai_assist",
        "explicit_negative_feedback",
        "evidence_gap",
    ]:
        assert raw_code not in readout
    for prohibited_claim in [
        "proves causality",
        "calculates roi",
        "scores employees",
        "ranks teams",
        "ranks managers",
        "individual productivity",
    ]:
        assert prohibited_claim not in readout.lower()

    with (output_dir / PATTERN_OUTPUT).open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert rows[0]["pattern_label"] == "Work resolved with corroboration"
    assert rows[2]["pattern_label"] == "Work recovered after friction"
    assert "Work stalled after AI assistance" not in {
        row["pattern_label"] for row in rows
    }
    assert "Explicit negative feedback appeared" not in {
        row["pattern_label"] for row in rows
    }


def test_forbidden_person_level_columns_fail_closed(tmp_path: Path) -> None:
    input_csv = tmp_path / "unsafe.csv"
    output_dir = tmp_path / "out"
    rows = aggregate_rows()
    rows[0]["user_email"] = "person@example.com"
    write_csv(input_csv, rows)

    completed = run_pilot(input_csv, output_dir)

    assert completed.returncode == 1
    assert "forbidden person-level fields" in completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "INVALID_INPUT"
    assert summary["governance"]["output_is_aggregate_only"] is False
    assert "person@example.com" not in (output_dir / SUMMARY_OUTPUT).read_text()


def test_identity_name_columns_fail_closed(tmp_path: Path) -> None:
    for header in ["user_name", "username", "full_name", "display_name"]:
        input_csv = tmp_path / f"{header}.csv"
        output_dir = tmp_path / f"out_{header}"
        rows = aggregate_rows()
        rows[0][header] = "Jane Example"
        write_csv(input_csv, rows)

        completed = run_pilot(input_csv, output_dir)

        assert completed.returncode == 1
        assert "forbidden person-level fields" in completed.stderr
        summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
        assert summary["status"] == "INVALID_INPUT"
        assert "Jane Example" not in (output_dir / SUMMARY_OUTPUT).read_text()


def test_missing_source_coverage_folds_to_evidence_gap(tmp_path: Path) -> None:
    input_csv = tmp_path / "undocumented_coverage.csv"
    output_dir = tmp_path / "out"
    rows = aggregate_rows()
    rows[0]["boundary_layer"] = ""
    rows[0]["coverage_caveat"] = ""
    write_csv(input_csv, rows)

    completed = run_pilot(input_csv, output_dir)

    assert completed.returncode == 0, completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["patterns"]["resolved_with_confidence"]["episode_count"] == 0
    assert summary["patterns"]["evidence_gap"]["episode_count"] == 4800

    readout = (output_dir / READOUT_OUTPUT).read_text()
    assert "Work resolved with corroboration" not in readout
    assert "Rows with incomplete, ambiguous, or undocumented source coverage" in readout


def test_unknown_pattern_fails_closed_without_readout_values(tmp_path: Path) -> None:
    input_csv = tmp_path / "unknown.csv"
    output_dir = tmp_path / "out"
    rows = aggregate_rows()
    rows[0]["episode_pattern"] = "employee_trust_score"
    write_csv(input_csv, rows)

    completed = run_pilot(input_csv, output_dir)

    assert completed.returncode == 1
    assert "unknown Trust Episode Boundary pattern" in completed.stderr
    summary = json.loads((output_dir / SUMMARY_OUTPUT).read_text())
    assert summary["status"] == "INVALID_INPUT"
    assert "employee_trust_score" not in (output_dir / SUMMARY_OUTPUT).read_text()


def test_pilot_runbook_keeps_next_phase_aggregate_and_api_free() -> None:
    runbook = RUNBOOK.read_text()

    for phrase in [
        "No API is required",
        "Aggregate CSV export",
        "run_trust_episode_pilot_readout.py",
        "customer-approved aggregate scope",
        "does not ingest raw traces",
        "does not add canonical events",
        "does not add suppression reasons",
        "does not calculate ROI",
        "does not establish causality",
    ]:
        assert phrase in runbook


def test_retained_dogfood_pilot_output_uses_real_aggregate_counts() -> None:
    summary = json.loads((RETAINED_PILOT_OUTPUT / SUMMARY_OUTPUT).read_text())
    readout = (RETAINED_PILOT_OUTPUT / READOUT_OUTPUT).read_text()

    assert summary["status"] == "EVIDENCE_CONTEXT_ONLY"
    assert summary["customer_label"] == "Glean dogfood aggregate run-first sample"
    assert summary["total_episode_count"] == 88028657
    assert summary["patterns"]["recovered_after_failure"]["episode_count"] == 15826000
    assert summary["patterns"]["stalled_after_ai_assist"]["episode_count"] == 0
    assert summary["patterns"]["explicit_negative_feedback"]["episode_count"] == 0
    assert summary["patterns"]["evidence_gap"]["episode_count"] == 37959260
    assert summary["governance"]["adds_runtime_api"] is False

    assert "88,028,657 aggregate AI work episodes" in readout
    assert "15,826,000 aggregate episodes" in readout
    assert "37,959,260 aggregate episodes" in readout
    assert "Work stalled after AI assistance" not in readout
    assert "474,414 aggregate episodes" not in readout
    assert "Explicit negative feedback appeared" not in readout
    assert "2 aggregate episodes" not in readout
    assert "not a trust score" in readout
    assert "does not calculate ROI" in readout
    assert "does not establish causality" in readout
    for raw_code in [
        "recovered_after_failure",
        "resolved_without_verification_signal",
        "evidence_gap",
    ]:
        assert raw_code not in readout
