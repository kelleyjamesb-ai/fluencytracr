import csv
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRIVER = ROOT / "scripts" / "dogfood" / "run_multi_surface.py"


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    fieldnames = [
        "workflow_id",
        "real_cohort_size",
        "distinct_users",
        "window_days",
        "completion_rate",
        "error_rate",
        "abandonment_rate",
        "recovery_rate",
        "verification_rate",
        "p50_latency_ms",
        "p95_latency_ms",
    ]
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def run_driver(input_path: Path, output_dir: Path, readout: Path, cohort_size: int = 30):
    return subprocess.run(
        [
            sys.executable,
            str(DRIVER),
            "--input",
            str(input_path),
            "--output-dir",
            str(output_dir),
            "--readout",
            str(readout),
            "--cohort-size",
            str(cohort_size),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )


def base_row(workflow_id: str, real_cohort_size: int, recovery_rate: float, verification_rate: float) -> dict[str, object]:
    return {
        "workflow_id": workflow_id,
        "real_cohort_size": real_cohort_size,
        "distinct_users": real_cohort_size,
        "window_days": 60,
        "completion_rate": 0.95,
        "error_rate": 0.0,
        "abandonment_rate": 0.0,
        "recovery_rate": recovery_rate,
        "verification_rate": verification_rate,
        "p50_latency_ms": 45000,
        "p95_latency_ms": 120000,
    }


def test_happy_path_weights_surface_rows(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    write_csv(
        input_path,
        [
            base_row("AGENT", 100, 0.9, 0.9),
            base_row("CHAT", 300, 0.8, 0.8),
            base_row("GLEANBOT", 600, 0.7, 0.7),
        ],
    )

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "Weighted Reliability Factor: 0.875" in text
    assert "Weighted Quality Multiplier: 1.413" in text
    assert "| AGENT | 100 | SURFACE | none | 0.95 | 1.495 | QUALITY_PREMIUM / QUALITATIVE |" in text
    assert "| CHAT | 300 | SURFACE | none | 0.9 | 1.44 | QUALITY_PREMIUM / QUALITATIVE |" in text
    assert "| GLEANBOT | 600 | SURFACE | none | 0.85 | 1.385 | QUALITY_PREMIUM / QUALITATIVE |" in text
    assert (output_dir / "AGENT.md").exists()
    assert (output_dir / "CHAT.md").exists()
    assert (output_dir / "GLEANBOT.md").exists()


def test_mixed_path_canonicalizes_short_windows(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    short = base_row("PRISM", 500, 0.9, 0.9)
    short["window_days"] = 14
    write_csv(
        input_path,
        [
            base_row("AGENT", 100, 0.9, 0.9),
            base_row("CHAT", 300, 0.8, 0.8),
            short,
        ],
    )

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "Weighted Reliability Factor: 0.912" in text
    assert (
        "| PRISM | 500 | SUPPRESS | INSUFFICIENT_TIME | n/a | n/a | "
        "UNCLASSIFIED / QUALITATIVE |"
    ) in text
    assert (output_dir / "PRISM.md").exists()


def test_blank_workflow_id_is_skipped_as_unclassified(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    blank = base_row("   ", 250, 0.9, 0.9)
    write_csv(
        input_path,
        [
            blank,
            base_row("CHAT", 300, 0.8, 0.8),
        ],
    )

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert (
        "| UNCLASSIFIED | 250 | Blank workflow_id in input — likely unclassified BigQuery feature rows; relabeled UNCLASSIFIED |"
        in text
    )
    assert "| CHAT | 300 | SURFACE | none | 0.9 | 1.44 | QUALITY_PREMIUM / QUALITATIVE |" in text
    assert not (output_dir / "UNCLASSIFIED.md").exists()


def test_json_input_is_supported(tmp_path: Path) -> None:
    input_path = tmp_path / "input.json"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    input_path.write_text(json.dumps({"rows": [base_row("AI_ANSWER", 120, 0.8, 0.8)]}))

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "| AI_ANSWER | 120 | SURFACE | none | 0.9 | 1.44 | QUALITY_PREMIUM / QUALITATIVE |" in text


def test_suppressed_surfaces_are_canonicalized_not_skipped(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    short = base_row("CHAT", 200, 0.9, 0.9)
    short["window_days"] = 14
    write_csv(input_path, [short])

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "No surfaces qualified for weighted rollup." in text
    assert (
        "| CHAT | 200 | SUPPRESS | INSUFFICIENT_TIME | n/a | n/a | "
        "UNCLASSIFIED / QUALITATIVE |"
    ) in text
    assert "| none | 0 | n/a |" in text


def test_real_cohorts_below_100_are_evaluated_not_skipped(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    write_csv(input_path, [base_row("AGENT", 99, 0.9, 0.9)])

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "| AGENT | 99 | SURFACE | none | 0.95 | 1.495 | QUALITY_PREMIUM / QUALITATIVE |" in text
    assert "| none | 0 | n/a |" in text
    assert (output_dir / "AGENT.md").exists()


def test_real_cohorts_below_canonical_volume_floor_suppress(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    write_csv(input_path, [base_row("AGENT", 1, 0.9, 0.9)])

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "No surfaces qualified for weighted rollup." in text
    assert (
        "| AGENT | 1 | SUPPRESS | INSUFFICIENT_VOLUME | n/a | n/a | "
        "UNCLASSIFIED / QUALITATIVE |"
    ) in text
    assert "| none | 0 | n/a |" in text
    assert (output_dir / "AGENT.md").exists()
    fixture = json.loads((output_dir / "AGENT.json").read_text())
    assert fixture["parameters"]["cohort_size"] == 1
    assert len(fixture["events"]) == 1


def test_bad_input_exits_one_with_clear_error(tmp_path: Path) -> None:
    input_path = tmp_path / "bad.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    input_path.write_text(
        "workflow_id,real_cohort_size,distinct_users,window_days,completion_rate,error_rate,abandonment_rate,recovery_rate,verification_rate,p50_latency_ms,p95_latency_ms\n"
        "CHAT,not-an-int,100,60,0.95,0.0,0.0,0.9,0.9,45000,120000\n"
    )

    completed = run_driver(input_path, output_dir, readout)

    assert completed.returncode == 1
    assert "Invalid input" in completed.stderr
    assert "real_cohort_size" in completed.stderr
