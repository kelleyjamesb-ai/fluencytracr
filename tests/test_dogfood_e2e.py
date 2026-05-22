import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
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
