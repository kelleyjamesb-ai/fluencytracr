import csv
import importlib.util
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "transformer" / "glean_gce_transformer.py"


def load_transformer_module():
    spec = importlib.util.spec_from_file_location("glean_gce_transformer", SCRIPT)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_transformer_sql_uses_struct_access_for_jsonpayload():
    transformer = load_transformer_module()
    sql_sources = [
        ("transformer", transformer.VELOCITY_SQL),
        ("velocity diagnostic", (ROOT / "sql" / "dogfood" / "velocity_diagnostic.sql").read_text()),
        ("agent type diagnostic", (ROOT / "sql" / "dogfood" / "agent_type_diagnostic.sql").read_text()),
    ]

    for name, sql in sql_sources:
        assert "JSON_VALUE(jsonPayload" not in sql, f"{name} still treats jsonPayload as JSON text"

    assert "jsonPayload.workflowrun.feature" in transformer.VELOCITY_SQL
    assert "jsonPayload.user.userid" in transformer.VELOCITY_SQL


def test_transformer_sql_enforces_surface_taxonomy():
    transformer = load_transformer_module()
    sql = transformer.VELOCITY_SQL

    assert "jsonPayload.llmcall.feature" not in sql
    assert "NULLIF(TRIM(jsonPayload.type), '')" not in sql
    assert "taxonomy_surfaces" in sql
    assert "verification_signals" in sql
    assert "surface_verification" in sql

    for standalone in [
        "standalone:SEARCH",
        "standalone:AUTOCOMPLETE",
        "standalone:MCP_USAGE",
        "standalone:AI_SUMMARY",
        "standalone:GLEAN_BOT_ACTIVITY",
    ]:
        assert standalone in sql

    for verification_event in [
        "CHAT_CITATION_CLICK",
        "CHAT_CITATIONS",
        "AI_ANSWER_VOTE",
        "AI_SUMMARY_VOTE",
        "SEARCH_FEEDBACK",
        "CHAT_FEEDBACK",
    ]:
        assert verification_event in sql
        assert f"standalone:{verification_event}" not in sql
        assert f"workflow:{verification_event}" not in sql

    for agent_surface in [
        "workflow:agent:autonomous",
        "workflow:agent:workflow_named",
        "workflow:agent:ephemeral",
    ]:
        assert agent_surface in sql


def test_transformer_writes_aggregate_payloads_from_preaggregated_csv(tmp_path):
    source = tmp_path / "aggregates.csv"
    output_dir = tmp_path / "out"
    with source.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "workflow_id",
                "cohort_size",
                "completion_rate",
                "error_rate",
                "abandonment_rate",
                "recovery_rate",
                "verification_rate",
                "p50_latency_ms",
                "p95_latency_ms",
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
            ],
        )
        writer.writeheader()
        writer.writerow(
            {
                "workflow_id": "workflow:CHAT",
                "cohort_size": "30",
                "completion_rate": "0.9",
                "error_rate": "0.01",
                "abandonment_rate": "0.02",
                "recovery_rate": "0.7",
                "verification_rate": "0.4",
                "p50_latency_ms": "1000",
                "p95_latency_ms": "3000",
                "freq_p10": "2",
                "freq_p50": "10",
                "freq_p90": "20",
                "freq_p99": "40",
                "engagement_p10": "5",
                "engagement_p50": "20",
                "engagement_p90": "40",
                "engagement_p99": "60",
                "breadth_p10": "1",
                "breadth_p50": "3",
                "breadth_p90": "5",
                "breadth_p99": "8",
            }
        )

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--project",
            "customer-project",
            "--dataset",
            "gce",
            "--table",
            "events",
            "--window-start",
            "2026-03-23T00:00:00Z",
            "--window-end",
            "2026-05-22T00:00:00Z",
            "--cohort-id",
            "customer-cohort",
            "--calibration-id",
            "scio-prod-60d-2026-05",
            "--input-csv",
            str(source),
            "--output-dir",
            str(output_dir),
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    assert json.loads(result.stdout)["status"] == "PASS"
    payload = json.loads((output_dir / "workflow_CHAT.json").read_text())
    assert payload["schema_version"] == "FT_V3_2026_05"
    assert payload["cohort_id"] == "customer-cohort"
    assert payload["workflow_id"] == "workflow:CHAT"
    assert payload["velocity"]["frequency"]["p50"] == 10
    assert payload["privacy"]["person_level_fields_included"] is False
