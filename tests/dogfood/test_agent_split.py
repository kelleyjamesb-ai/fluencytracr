import csv
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


def write_velocity_csv(path: Path, rows: list[dict[str, object]]) -> None:
    fieldnames = [
        "workflow_id",
        "surface_category",
        "cohort_size",
        "window_days",
        "freq_p10",
        "freq_p50",
        "freq_p90",
        "freq_p99",
        "engagement_p10",
        "engagement_p50",
        "engagement_p90",
        "engagement_p99",
        "breadth_p10",
        "breadth_p50",
        "breadth_p90",
        "breadth_p99",
    ]
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def base_row(workflow_id: str, cohort: int, verification_rate: float = 0.9) -> dict[str, object]:
    return {
        "workflow_id": workflow_id,
        "real_cohort_size": cohort,
        "distinct_users": cohort,
        "window_days": 60,
        "completion_rate": 0.95,
        "error_rate": 0.0,
        "abandonment_rate": 0.0,
        "recovery_rate": 0.9,
        "verification_rate": verification_rate,
        "p50_latency_ms": 45000,
        "p95_latency_ms": 120000,
    }


def velocity_row(workflow_id: str, cohort: int, factor: float = 1.0) -> dict[str, object]:
    return {
        "workflow_id": workflow_id,
        "surface_category": "workflow",
        "cohort_size": cohort,
        "window_days": 60,
        "freq_p10": 11 * factor,
        "freq_p50": 71 * factor,
        "freq_p90": 350 * factor,
        "freq_p99": 701 * factor,
        "engagement_p10": 30 * factor,
        "engagement_p50": 61 * factor,
        "engagement_p90": 61 * factor,
        "engagement_p99": 61 * factor,
        "breadth_p10": 1 * factor,
        "breadth_p50": 7 * factor,
        "breadth_p90": 10 * factor,
        "breadth_p99": 12 * factor,
    }


def run_driver(input_path: Path, velocity_input: Path, output_dir: Path, readout: Path):
    return subprocess.run(
        [
            sys.executable,
            str(DRIVER),
            "--input",
            str(input_path),
            "--velocity-input",
            str(velocity_input),
            "--output-dir",
            str(output_dir),
            "--readout",
            str(readout),
            "--cohort-size",
            "30",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_agent_sub_surfaces_render_as_distinct_verdicts(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    velocity_input = tmp_path / "velocity.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    write_csv(
        input_path,
        [
            base_row("agent:autonomous", 60),
            base_row("agent:workflow_named", 30),
            base_row("agent:ephemeral", 10),
        ],
    )
    write_velocity_csv(
        velocity_input,
        [
            velocity_row("workflow:agent:autonomous", 60),
            velocity_row("workflow:agent:workflow_named", 30),
            velocity_row("workflow:agent:ephemeral", 10),
        ],
    )

    completed = run_driver(input_path, velocity_input, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "| agent:autonomous | workflow | surface | 60 | SURFACE | none |" in text
    assert "| agent:workflow_named | workflow | surface | 30 | SURFACE | none |" in text
    assert "| agent:ephemeral | workflow | surface | 10 | SURFACE | none |" in text
    assert "## AGENT sub-surface composition" in text
    assert "| autonomous | 60 | 60% | 1.495 |" in text
    assert "| workflow_named | 30 | 30% | 1.495 |" in text
    assert "| ephemeral | 10 | 10% | 1.495 |" in text


def test_agent_sub_surface_suppresses_independently(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    velocity_input = tmp_path / "velocity.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    write_csv(
        input_path,
        [
            base_row("agent:autonomous", 60),
            base_row("agent:workflow_named", 3),
            base_row("agent:ephemeral", 10),
        ],
    )
    write_velocity_csv(
        velocity_input,
        [
            velocity_row("workflow:agent:autonomous", 60),
            velocity_row("workflow:agent:workflow_named", 3),
            velocity_row("workflow:agent:ephemeral", 10),
        ],
    )

    completed = run_driver(input_path, velocity_input, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "| agent:workflow_named | workflow | surface | 3 | SUPPRESS | INSUFFICIENT_VOLUME |" in text
    assert "| workflow_named | 3 | 4.1% | n/a |" in text


def test_agent_legacy_volume_matches_sum_of_sub_surfaces(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    velocity_input = tmp_path / "velocity.csv"
    output_dir = tmp_path / "out"
    readout = output_dir / "READOUT.md"
    write_csv(
        input_path,
        [
            base_row("agent:autonomous", 50),
            base_row("agent:workflow_named", 25),
            base_row("agent:ephemeral", 25),
        ],
    )
    write_velocity_csv(
        velocity_input,
        [
            velocity_row("workflow:agent:autonomous", 50),
            velocity_row("workflow:agent:workflow_named", 25),
            velocity_row("workflow:agent:ephemeral", 25),
        ],
    )

    completed = run_driver(input_path, velocity_input, output_dir, readout)

    assert completed.returncode == 0, completed.stderr
    text = readout.read_text()
    assert "Legacy AGENT derived cohort: 100" in text
    assert "Legacy AGENT derived velocity-adjusted Quality Multiplier: 1.495" in text
