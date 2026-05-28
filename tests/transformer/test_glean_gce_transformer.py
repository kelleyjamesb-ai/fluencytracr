import csv
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

from tests.transformer.gce_fixtures import (
    glean_bot_activity,
    non_surface_event,
    product_snapshot,
    verification_signal,
    workflow_run,
)


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


def payloads_by_workflow(rows):
    transformer = load_transformer_module()
    payloads = transformer.aggregate_gce_rows_to_payloads(
        rows,
        cohort_id="semantic-fixture-cohort",
        calibration_id="scio-prod-60d-2026-05",
        window_start="2026-03-23T00:00:00Z",
        window_end="2026-05-22T00:00:00Z",
    )
    return {payload["workflow_id"]: payload for payload in payloads}


def assert_aggregate_only_payload(payload):
    assert payload["schema_version"] == "FT_V3_2026_05"
    assert payload["privacy"] == {"person_level_fields_included": False}
    for forbidden in [
        "user_id",
        "user",
        "email",
        "name",
        "prompt",
        "output",
        "transcript",
        "raw_events",
        "rows",
    ]:
        assert forbidden not in payload
    assert set(payload["velocity"]) == {"frequency", "engagement", "breadth"}
    assert set(payload["quality_signals"]) == {
        "completion_rate",
        "error_rate",
        "abandonment_rate",
        "recovery_rate",
        "verification_rate",
        "p50_latency_ms",
        "p95_latency_ms",
    }


def test_semantic_fixture_classifies_autonomous_agent():
    payloads = payloads_by_workflow([
        product_snapshot(workflow_id="agent-auto", is_autonomous=True),
        workflow_run(feature="AGENT", root_workflow_id="agent-auto", run_id="run-auto"),
    ])

    assert set(payloads) == {"workflow:agent:autonomous"}
    assert_aggregate_only_payload(payloads["workflow:agent:autonomous"])


def test_semantic_fixture_classifies_named_workflow_agent():
    payloads = payloads_by_workflow([
        product_snapshot(
            workflow_id="agent-named",
            is_autonomous=False,
            name="Research assistant",
            unlisted=False,
        ),
        workflow_run(feature="AGENT", root_workflow_id="agent-named", run_id="run-named"),
    ])

    assert set(payloads) == {"workflow:agent:workflow_named"}


def test_semantic_fixture_classifies_ephemeral_agent_without_usable_snapshot():
    payloads = payloads_by_workflow([
        workflow_run(feature="AGENT", root_workflow_id="agent-missing-snapshot", run_id="run-ephemeral-1"),
        product_snapshot(workflow_id="agent-unlisted", is_autonomous=False, name="Draft", unlisted=True),
        workflow_run(feature="AGENT", root_workflow_id="agent-unlisted", run_id="run-ephemeral-2", session_token="session-2"),
        product_snapshot(workflow_id="agent-missing-name", is_autonomous=False, name=None, unlisted=False),
        workflow_run(feature="AGENT", root_workflow_id="agent-missing-name", run_id="run-ephemeral-3", session_token="session-3"),
    ])

    assert set(payloads) == {"workflow:agent:ephemeral"}
    assert payloads["workflow:agent:ephemeral"]["cohort_size"] == 1
    assert payloads["workflow:agent:ephemeral"]["velocity"]["frequency"]["p50"] == 3


def test_semantic_fixture_avoids_glean_bot_double_count_when_workflow_session_exists():
    payloads = payloads_by_workflow([
        workflow_run(feature="CHAT", root_workflow_id="chat", run_id="run-chat", session_token="shared-session"),
        glean_bot_activity(session_token="shared-session"),
    ])

    assert set(payloads) == {"workflow:CHAT"}
    assert payloads["workflow:CHAT"]["velocity"]["frequency"]["p50"] == 1


def test_semantic_fixture_emits_standalone_glean_bot_without_workflow_overlap():
    payloads = payloads_by_workflow([
        glean_bot_activity(session_token="bot-only-session"),
    ])

    assert set(payloads) == {"standalone:GLEAN_BOT_ACTIVITY"}


def test_semantic_fixture_attributes_verification_without_creating_surface_volume():
    payloads = payloads_by_workflow([
        workflow_run(feature="CHAT", root_workflow_id="chat", run_id="run-chat", session_token="chat-session"),
        verification_signal("CHAT_CITATION_CLICK", run_id="run-chat"),
        verification_signal("AI_ANSWER_VOTE", session_token="chat-session", offset_minutes=2),
        verification_signal("AI_SUMMARY_VOTE", session_token="chat-session", offset_minutes=3),
        verification_signal("SEARCH_FEEDBACK", session_token="chat-session", offset_minutes=4),
        verification_signal("CHAT_FEEDBACK", session_token="chat-session", offset_minutes=5),
    ])

    assert set(payloads) == {"workflow:CHAT"}
    assert payloads["workflow:CHAT"]["quality_signals"]["verification_rate"] == 1
    assert payloads["workflow:CHAT"]["velocity"]["frequency"]["p50"] == 1


def test_semantic_fixture_attributes_verification_via_run_id_when_session_differs():
    # Feedback often arrives in a later session but still references the original
    # run id. The verification event therefore shares the surface's run id
    # (tracking_token) while carrying a different session token. Attribution must
    # match on any shared identifier, not only the first non-null key.
    payloads = payloads_by_workflow([
        workflow_run(feature="CHAT", root_workflow_id="chat", run_id="run-1", session_token="sess-A"),
        verification_signal("CHAT_FEEDBACK", session_token="sess-B", run_id="run-1", offset_minutes=2),
    ])

    assert set(payloads) == {"workflow:CHAT"}
    assert payloads["workflow:CHAT"]["quality_signals"]["verification_rate"] == 1


def test_semantic_fixture_does_not_alias_verification_across_same_session_surfaces():
    # Two workflow runs share one session. A feedback event for only run-1
    # carries that shared session token plus run-1's precise run id. Precise
    # keys must win, so only run-1's surface is verified -- attributing through
    # the session alias would wrongly mark both runs verified.
    payloads = payloads_by_workflow([
        workflow_run(feature="CHAT", root_workflow_id="chat-1", run_id="run-1", session_token="sess-A"),
        workflow_run(feature="CHAT", root_workflow_id="chat-2", run_id="run-2", session_token="sess-A", offset_minutes=1),
        verification_signal("CHAT_FEEDBACK", session_token="sess-A", run_id="run-1", offset_minutes=2),
    ])

    assert set(payloads) == {"workflow:CHAT"}
    assert payloads["workflow:CHAT"]["quality_signals"]["verification_rate"] == 0.5


def test_transformer_sql_prefers_precise_keys_before_session_aliases():
    transformer = load_transformer_module()
    sql = transformer.VELOCITY_SQL

    # Verification attribution must expand candidate keys rather than collapsing
    # to a single COALESCE'd value, but it must prefer precise run/workflow keys
    # and only fall back to broad session/tracking aliases when no precise key
    # is present, so a feedback event cannot verify every same-session surface.
    assert "COALESCE(workflow_run_id, session_token, tracking_token) AS attribution_join_key" not in sql
    assert "workflow_run_id IS NOT NULL OR root_workflow_id IS NOT NULL OR tracking_token IS NOT NULL" in sql
    assert "[workflow_run_id, root_workflow_id, tracking_token]" in sql
    assert "[session_token]" in sql


def test_semantic_fixture_ignores_non_surface_telemetry_when_alone():
    payloads = payloads_by_workflow([
        product_snapshot(workflow_id="snapshot-only", is_autonomous=True),
        non_surface_event("LLM_CALL"),
        non_surface_event("CLIENT_EVENT"),
        non_surface_event("ACTION"),
    ])

    assert payloads == {}
