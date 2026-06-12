import json
import subprocess
import sys
from pathlib import Path

import pytest

from src.connectors.glean_dogfood_bq.adapter import (
    MAX_BYTES_SCANNED,
    TABLE_SPECS,
    apply_slice_k_min,
    build_union_query,
    enforce_cost_guard,
    guard_no_forbidden_fields,
    load_fixture_rows,
    rows_to_v3_payloads,
    validate_output_payload,
    validate_query_partition_guard,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "glean_dogfood_bq"
SCRIPT = ROOT / "scripts" / "run_dogfood_bq_ingest.py"


def test_table_specs_pin_real_sharded_sources_and_preserve_breadth():
    assert {
        key: spec.table_pattern for key, spec in TABLE_SPECS.items()
    } == {
        "scrubbed_llm_call": "scio-apps.scrubbed_llm_call.scrubbed_llm_call_*",
        "scrubbed_client_analytics": "scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*",
        "scrubbed_workflows": "scio-apps.scrubbed_workflows.scrubbed_workflows_*",
    }

    assert len(TABLE_SPECS["scrubbed_llm_call"].source_allowlist) >= 20
    assert len(TABLE_SPECS["scrubbed_client_analytics"].source_allowlist) >= 10
    assert len(TABLE_SPECS["scrubbed_workflows"].source_allowlist) >= 20

    assert {
        "jsonPayload.llmmodel",
        "jsonPayload.reasoningtokens",
        "jsonPayload.imagetokens",
        "jsonPayload.workflowrunid",
        "jsonPayload.totallatencymillis",
    }.issubset(set(TABLE_SPECS["scrubbed_llm_call"].source_allowlist))
    assert {
        "jsonPayload.trackingparams.eventname",
        "jsonPayload.trackingparams.category",
        "jsonPayload.events.trackingparams.timing.overalltimems",
        "jsonPayload.commonparams.deploymenttype",
        "jsonPayload.geo.country",
    }.issubset(set(TABLE_SPECS["scrubbed_client_analytics"].source_allowlist))
    assert {
        "jsonPayload.workflow.workflow_id",
        "jsonPayload.workflow.run_id",
        "jsonPayload.workflow.workflow_execution.status",
        "jsonPayload.workflow.step_execution.execution_time_millis",
        "jsonPayload.workflow.citations_data.has_user_facing_citations",
        "jsonPayload.llm_call.model",
        "jsonPayload.llm_call.input_tokens",
        "jsonPayload.span_info.execution_status.code",
    }.issubset(set(TABLE_SPECS["scrubbed_workflows"].source_allowlist))

    for spec in TABLE_SPECS.values():
        joined = "\n".join(spec.source_allowlist).lower()
        assert "query" not in joined
        assert "prompt" not in joined
        assert "response" not in joined
        assert "output" not in joined
        assert "document_url" not in joined
        assert "url" not in joined
        assert "skill_name" not in joined


@pytest.mark.parametrize(
    "forbidden_key",
    [
        "email",
        "user_id",
        "actor_id",
        "userId",
        "userid",
        "query",
        "query_text",
        "prompt",
        "response",
        "output",
        "message",
        "transcript",
        "body",
        "document_url",
        "url",
        "skill_name",
        "actor_email",
    ],
)
def test_forbidden_field_guard_rejects_forbidden_keys_anywhere(forbidden_key):
    with pytest.raises(ValueError, match=forbidden_key):
        guard_no_forbidden_fields({"safe": {"nested": {forbidden_key: "blocked"}}})


def test_poisoned_fixtures_trip_forbidden_field_guard():
    for path in sorted(FIXTURES.glob("poisoned-*.json")):
        with pytest.raises(ValueError):
            guard_no_forbidden_fields(json.loads(path.read_text()))


def test_connector_suppresses_sub_minimum_slice_without_emitting_payload():
    rows = [
        {
            "source_table": "scrubbed_workflows",
            "workflow_id": "workflow:case_resolution",
            "jbtd_id": None,
            "persona_id": None,
            "cohort_size": 4,
            "event_count": 20,
        }
    ]

    emitted, report = apply_slice_k_min(rows)

    assert emitted == []
    assert report["suppressed_slices"] == [
        {
            "workflow_id": "workflow:case_resolution",
            "jbtd_id": None,
            "persona_id": None,
            "cohort_size": 4,
            "suppression_reason": "INSUFFICIENT_VOLUME",
        }
    ]


def test_connector_suppresses_each_slice_independently_without_cross_slice_merge():
    rows = [
        {
            "source_table": "scrubbed_workflows",
            "workflow_id": "workflow:A",
            "jbtd_id": None,
            "persona_id": None,
            "cohort_size": 5,
            "event_count": 20,
        },
        {
            "source_table": "scrubbed_workflows",
            "workflow_id": "workflow:B",
            "jbtd_id": None,
            "persona_id": None,
            "cohort_size": 4,
            "event_count": 80,
        },
    ]

    emitted, report = apply_slice_k_min(rows)

    assert [row["workflow_id"] for row in emitted] == ["workflow:A"]
    assert [row["workflow_id"] for row in report["suppressed_slices"]] == ["workflow:B"]


def test_query_builder_requires_date_suffix_or_partition_predicate():
    query = build_union_query(
        ["scrubbed_llm_call", "scrubbed_client_analytics", "scrubbed_workflows"],
        start_date="2026-06-01",
        end_date="2026-06-11",
    )

    assert "_TABLE_SUFFIX BETWEEN '20260601' AND '20260611'" in query
    assert "scio-apps.scrubbed_llm_call.scrubbed_llm_call_*" in query
    assert "scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*" in query
    assert "scio-apps.scrubbed_workflows.scrubbed_workflows_*" in query
    validate_query_partition_guard(query)

    with pytest.raises(ValueError, match="partition"):
        validate_query_partition_guard("SELECT * FROM `scio-apps.scrubbed_llm_call.scrubbed_llm_call_*`")


def test_cost_guard_refuses_large_scan_without_explicit_override():
    with pytest.raises(ValueError, match="100 GB"):
        enforce_cost_guard(MAX_BYTES_SCANNED + 1, allow_large_scan=False)

    assert enforce_cost_guard(MAX_BYTES_SCANNED + 1, allow_large_scan=True) is None


def test_fixture_rows_emit_aggregate_only_v3_payloads_and_run_report():
    rows = load_fixture_rows(FIXTURES)
    payloads, report = rows_to_v3_payloads(
        rows,
        cohort_id="glean-dogfood",
        calibration_id="scio-prod-60d-2026-05",
        window_start="2026-04-12T00:00:00Z",
        window_end="2026-06-11T00:00:00Z",
    )

    assert {payload["workflow_id"] for payload in payloads} == {
        "workflow:assistant",
        "standalone:client-analytics",
        "workflow:agent:workflow_named",
    }
    assert [slice_["workflow_id"] for slice_ in report["suppressed_slices"]] == [
        "workflow:small-cohort"
    ]
    for payload in payloads:
        validate_output_payload(payload)
        serialized = json.dumps(payload).lower()
        for forbidden in ["user_id", "userid", "email", "query", "prompt", "response", "output", "url"]:
            assert forbidden not in serialized


def test_cli_fixture_dry_run_writes_payloads_and_report(tmp_path):
    completed = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--start-date",
            "2026-04-12",
            "--end-date",
            "2026-06-11",
            "--tables",
            "scrubbed_llm_call,scrubbed_client_analytics,scrubbed_workflows",
            "--fixture-dir",
            str(FIXTURES),
            "--output-dir",
            str(tmp_path),
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )

    result = json.loads(completed.stdout)
    assert result["dry_run"] is True
    assert result["payloads_written"] == 3
    assert (tmp_path / "run-report.json").exists()
    assert len(list(tmp_path.glob("*.json"))) == 4
