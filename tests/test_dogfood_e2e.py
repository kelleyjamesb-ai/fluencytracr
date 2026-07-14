import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "dogfood"))

from generate_gce_fixtures import build_fixture  # noqa: E402

GENERATOR = ROOT / "scripts" / "dogfood" / "generate_gce_fixtures.py"
RUNNER = ROOT / "scripts" / "dogfood" / "run_end_to_end.py"


def run_json(*args: str) -> dict:
    completed = subprocess.run(
        [sys.executable, str(RUNNER), *args, "--json"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=20,
    )
    return json.loads(completed.stdout)


class DogfoodEndToEndTest(unittest.TestCase):
    def test_generator_writes_gce_shaped_fixture_without_person_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "manager-review-writer.json"

            subprocess.run(
                [
                    sys.executable,
                    str(GENERATOR),
                    "--workflow-family",
                    "manager-review-writer",
                    "--cohort-size",
                    "6",
                    "--abandonment-rate",
                    "0.10",
                    "--recovery-rate",
                    "0.80",
                    "--verification-rate",
                    "0.90",
                    "--output",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
                timeout=20,
            )

            fixture = json.loads(output.read_text())

        self.assertEqual(fixture["schema_version"], "GCE_MOCK_2026_05")
        self.assertEqual(fixture["workflow_family"], "manager-review-writer")
        self.assertEqual(fixture["days"], 60)
        self.assertEqual(len(fixture["events"]), 6)
        self.assertEqual(fixture["events"][0]["source_type"], "workflow_run")
        self.assertIn("workflow_run_id", fixture["events"][0])
        self.assertNotIn("user_id", json.dumps(fixture))
        self.assertNotIn("email", json.dumps(fixture))

    def test_healthy_workflow_surfaces_value_readout(self) -> None:
        readout = run_json("--scenario", "healthy")

        self.assertEqual(readout["scenario"], "healthy")
        self.assertEqual(readout["verdict"], "SURFACE")
        self.assertEqual(
            readout["aivm"],
            {
                "value_type": "QUALITY_PREMIUM",
                "evidence_grade": "QUALITATIVE",
            },
        )
        self.assertGreaterEqual(readout["reliability_factor"], 0.85)
        self.assertGreaterEqual(
            readout["reliability_components"]["verification_presence_rate"], 0.85
        )
        self.assertGreater(readout["quality_multiplier"], 1.0)
        self.assertIsNone(readout["causal_delta"])
        self.assertEqual(readout["canonical_event_sample"]["schema_version"], "FT_V1_2026_01")
        self.assertIn("window_id", readout["canonical_event_sample"])
        self.assertIn("ambiguity_flag", readout["canonical_event_sample"])
        self.assertNotIn("workflow_run_id", readout["canonical_event_sample"])
        self.assertNotIn("workflow_id", readout["canonical_event_sample"])

    def test_regressed_workflow_surfaces_regressed_causal_delta(self) -> None:
        readout = run_json("--scenario", "regressed")

        self.assertEqual(readout["scenario"], "regressed")
        self.assertEqual(readout["verdict"], "SURFACE")
        self.assertLess(readout["quality_multiplier"], 1.0)
        self.assertLess(readout["reliability_factor"], 0.65)
        self.assertEqual(
            readout["causal_delta"],
            {
                "verdict": "SURFACE",
                "shift": "REGRESSED",
                "pre_pattern": "Calibrated Fluency",
                "post_pattern": "Friction Loop",
            },
        )

    def test_causal_delta_uses_change_timestamp_not_run_id_prefix(self) -> None:
        workflow = "eng-on-call-triage"
        pre = build_fixture(
            workflow_family=workflow,
            cohort_size=6,
            abandonment_rate=0.0,
            recovery_rate=0.90,
            verification_rate=0.92,
            friction_rate=0.05,
            days=60,
            start_offset_days=60,
            run_prefix="run",
        )
        post = build_fixture(
            workflow_family=workflow,
            cohort_size=30,
            abandonment_rate=0.25,
            recovery_rate=0.25,
            verification_rate=0.20,
            friction_rate=0.58,
            days=60,
            run_prefix="run",
        )
        stale = build_fixture(
            workflow_family=workflow,
            cohort_size=30,
            abandonment_rate=0.25,
            recovery_rate=0.25,
            verification_rate=0.20,
            friction_rate=0.58,
            days=30,
            start_offset_days=140,
            run_prefix="stale",
        )
        fixture = {
            **post,
            "days": 120,
            "change_event": {
                "label": "Agent prompt rollout",
                "event_at": "2026-03-23T00:00:00Z",
            },
            "events": stale["events"] + pre["events"] + post["events"],
        }

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "timestamp-causal-delta.json"
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(
            readout["causal_delta"],
            {
                "verdict": "SURFACE",
                "shift": "REGRESSED",
                "pre_pattern": "Calibrated Fluency",
                "post_pattern": "Friction Loop",
            },
        )

    def test_causal_delta_suppresses_sub_minimum_windows(self) -> None:
        fixture = build_fixture(
            workflow_family="eng-on-call-triage",
            cohort_size=30,
            abandonment_rate=0.0,
            recovery_rate=0.90,
            verification_rate=0.90,
            friction_rate=0.0,
        )
        fixture["change_event"] = {
            "label": "Tiny test window",
            "event_at": "2026-04-22T00:00:00Z",
            "pre_window_days": 1,
            "post_window_days": 1,
        }

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "tiny-causal-window.json"
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(readout["causal_delta"]["verdict"], "SUPPRESS")
        self.assertEqual(
            readout["causal_delta"]["suppression_reason"], "INSUFFICIENT_TIME"
        )
        self.assertEqual(readout["causal_delta"]["shift"], "INDETERMINATE")

    def test_causal_delta_suppresses_incomplete_post_window(self) -> None:
        fixture = build_fixture(
            workflow_family="eng-on-call-triage",
            cohort_size=30,
            abandonment_rate=0.0,
            recovery_rate=0.90,
            verification_rate=0.90,
            friction_rate=0.0,
        )
        fixture["change_event"] = {
            "label": "Incomplete post window",
            "event_at": "2026-04-22T00:00:00Z",
            "pre_window_days": 60,
            "post_window_days": 60,
        }

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "incomplete-causal-window.json"
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(readout["causal_delta"]["verdict"], "SUPPRESS")
        self.assertEqual(
            readout["causal_delta"]["suppression_reason"], "INSUFFICIENT_TIME"
        )

    def test_causal_delta_rejects_coerced_window_values(self) -> None:
        fixture = build_fixture(
            workflow_family="eng-on-call-triage",
            cohort_size=30,
            abandonment_rate=0.0,
            recovery_rate=0.90,
            verification_rate=0.90,
            friction_rate=0.0,
        )
        fixture["change_event"] = {
            "label": "Invalid string window",
            "event_at": "2026-03-23T00:00:00Z",
            "pre_window_days": "60",
            "post_window_days": 60,
        }

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "coerced-causal-window.json"
            output.write_text(json.dumps(fixture))
            completed = subprocess.run(
                [sys.executable, str(RUNNER), "--fixture", str(output), "--json"],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
                timeout=20,
            )

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("change_event.pre_window_days must be a positive integer", completed.stderr)

    def test_sparse_workflow_suppresses_and_nulls_value_outputs(self) -> None:
        readout = run_json("--scenario", "sparse")

        self.assertEqual(readout["scenario"], "sparse")
        self.assertEqual(readout["verdict"], "SUPPRESS")
        self.assertEqual(readout["suppression_reason"], "INSUFFICIENT_VOLUME")
        self.assertEqual(
            readout["aivm"],
            {
                "value_type": "UNCLASSIFIED",
                "evidence_grade": "QUALITATIVE",
            },
        )
        self.assertIsNone(readout["reliability_factor"])
        self.assertIsNone(readout["reliability_components"])
        self.assertIsNone(readout["quality_multiplier"])
        self.assertIsNone(readout["causal_delta"])

    def test_short_window_fixture_suppresses_for_insufficient_time(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "short-window.json"
            subprocess.run(
                [
                    sys.executable,
                    str(GENERATOR),
                    "--workflow-family",
                    "manager-review-writer",
                    "--cohort-size",
                    "30",
                    "--abandonment-rate",
                    "0.0",
                    "--recovery-rate",
                    "0.9",
                    "--verification-rate",
                    "0.9",
                    "--output",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
                timeout=20,
            )
            fixture = json.loads(output.read_text())
            fixture["days"] = 30
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(readout["verdict"], "SUPPRESS")
        self.assertEqual(readout["suppression_reason"], "INSUFFICIENT_TIME")
        self.assertIsNone(readout["quality_multiplier"])

    def test_ambiguous_fixture_suppresses_before_value_outputs(self) -> None:
        fixture = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=10,
            abandonment_rate=0.0,
            recovery_rate=0.9,
            verification_rate=0.9,
            friction_rate=0.0,
        )
        fixture["days"] = 30
        for event in fixture["events"][:3]:
            event["signals"]["ambiguity_present"] = True
            event["signals"]["ambiguity_reason_code"] = "AMB_EVIDENCE_CONFLICT"

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "ambiguous.json"
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(readout["verdict"], "SUPPRESS")
        self.assertEqual(readout["suppression_reason"], "HIGH_AMBIGUITY")
        self.assertIsNone(readout["reliability_factor"])
        self.assertIsNone(readout["quality_multiplier"])

    def test_non_convergent_fixture_suppresses_before_value_outputs(self) -> None:
        fixture = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=10,
            abandonment_rate=0.0,
            recovery_rate=0.0,
            verification_rate=0.0,
            friction_rate=0.0,
        )

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "non-convergent.json"
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(readout["verdict"], "SUPPRESS")
        self.assertEqual(readout["suppression_reason"], "NO_CONVERGENCE")
        self.assertIsNone(readout["reliability_factor"])
        self.assertIsNone(readout["quality_multiplier"])

    def test_unstable_baseline_fixture_suppresses_before_value_outputs(self) -> None:
        fixture = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=10,
            abandonment_rate=0.0,
            recovery_rate=0.0,
            verification_rate=1.0,
            friction_rate=1.0,
        )
        baseline = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=10,
            abandonment_rate=0.0,
            recovery_rate=1.0,
            verification_rate=1.0,
            friction_rate=0.0,
            days=60,
            start_offset_days=60,
            run_prefix="baseline",
        )
        fixture["baseline_events"] = baseline["events"]
        fixture["baseline_days"] = 60

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "unstable-baseline.json"
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(readout["verdict"], "SUPPRESS")
        self.assertEqual(readout["suppression_reason"], "BASELINE_UNSTABLE")
        self.assertIsNone(readout["reliability_factor"])
        self.assertIsNone(readout["quality_multiplier"])

    def test_suppressed_baseline_fixture_suppresses_before_value_outputs(self) -> None:
        fixture = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=10,
            abandonment_rate=0.0,
            recovery_rate=1.0,
            verification_rate=1.0,
            friction_rate=0.0,
        )
        baseline = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=4,
            abandonment_rate=0.0,
            recovery_rate=1.0,
            verification_rate=1.0,
            friction_rate=0.0,
            days=60,
            start_offset_days=60,
            run_prefix="baseline",
        )
        fixture["baseline_events"] = baseline["events"]
        fixture["baseline_days"] = 60

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "suppressed-baseline.json"
            output.write_text(json.dumps(fixture))
            readout = run_json("--fixture", str(output))

        self.assertEqual(readout["verdict"], "SUPPRESS")
        self.assertEqual(readout["suppression_reason"], "INSUFFICIENT_VOLUME")
        self.assertIsNone(readout["reliability_factor"])
        self.assertIsNone(readout["quality_multiplier"])

    def test_short_or_unbounded_baseline_fixture_suppresses_before_value_outputs(self) -> None:
        fixture = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=10,
            abandonment_rate=0.0,
            recovery_rate=1.0,
            verification_rate=1.0,
            friction_rate=0.0,
        )
        baseline = build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=10,
            abandonment_rate=0.0,
            recovery_rate=1.0,
            verification_rate=1.0,
            friction_rate=0.0,
            days=30,
            start_offset_days=60,
            run_prefix="baseline",
        )
        fixture["baseline_events"] = baseline["events"]
        fixture["baseline_days"] = 30

        with tempfile.TemporaryDirectory() as tmp:
            short_output = Path(tmp) / "short-baseline.json"
            short_output.write_text(json.dumps(fixture))
            short_readout = run_json("--fixture", str(short_output))

            fixture.pop("baseline_days")
            unbounded_output = Path(tmp) / "unbounded-baseline.json"
            unbounded_output.write_text(json.dumps(fixture))
            unbounded_readout = run_json("--fixture", str(unbounded_output))

        self.assertEqual(short_readout["verdict"], "SUPPRESS")
        self.assertEqual(short_readout["suppression_reason"], "INSUFFICIENT_TIME")
        self.assertEqual(unbounded_readout["verdict"], "SUPPRESS")
        self.assertEqual(unbounded_readout["suppression_reason"], "INSUFFICIENT_TIME")

    def test_fixture_with_forbidden_person_or_content_fields_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "forbidden.json"
            subprocess.run(
                [
                    sys.executable,
                    str(GENERATOR),
                    "--workflow-family",
                    "manager-review-writer",
                    "--cohort-size",
                    "5",
                    "--abandonment-rate",
                    "0.0",
                    "--recovery-rate",
                    "0.8",
                    "--verification-rate",
                    "0.8",
                    "--output",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
                timeout=20,
            )
            fixture = json.loads(output.read_text())
            fixture["events"][0]["user_id"] = "person-123"
            output.write_text(json.dumps(fixture))
            completed = subprocess.run(
                [sys.executable, str(RUNNER), "--fixture", str(output), "--json"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=20,
            )

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("forbidden fixture field", completed.stderr)


if __name__ == "__main__":
    unittest.main()
