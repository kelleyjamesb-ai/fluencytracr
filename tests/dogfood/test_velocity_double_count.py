import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SQL = ROOT / "sql" / "dogfood" / "velocity_diagnostic.sql"
AGENT_SQL = ROOT / "sql" / "dogfood" / "agent_type_diagnostic.sql"
DELEGATION_SQL = ROOT / "sql" / "dogfood" / "v4_signal_discovery_delegation.sql"
REFINEMENT_SQL = ROOT / "sql" / "dogfood" / "v4_signal_discovery_refinement.sql"
REUSE_SQL = ROOT / "sql" / "dogfood" / "v4_signal_discovery_reuse_propagation.sql"
AGENT_METADATA_SQL = ROOT / "sql" / "dogfood" / "agent_metadata_field_discovery.sql"
DEPTH_DELEGATION_SQL = ROOT / "sql" / "dogfood" / "delegation_depth_diagnostic.sql"
DEPTH_REFINEMENT_SQL = ROOT / "sql" / "dogfood" / "refinement_depth_diagnostic.sql"
DEPTH_REPERTOIRE_SQL = ROOT / "sql" / "dogfood" / "depth_repertoire_diagnostic.sql"
DEPTH_REUSE_SQL = ROOT / "sql" / "dogfood" / "reuse_propagation_diagnostic.sql"
V4_DELEGATION_SQL = ROOT / "sql" / "dogfood" / "v4_signal_discovery_delegation.sql"
V4_REFINEMENT_SQL = ROOT / "sql" / "dogfood" / "v4_signal_discovery_refinement.sql"
V4_REUSE_SQL = ROOT / "sql" / "dogfood" / "v4_signal_discovery_reuse_propagation.sql"
AGENT_JOIN_KEY_SQL = ROOT / "sql" / "dogfood" / "agent_snapshot_join_key_diagnostic.sql"
TAXONOMY_QM_RF_SQL = ROOT / "sql" / "dogfood" / "taxonomy_qm_rf_diagnostic.sql"

DOGFOOD_SQL = [
    SQL,
    AGENT_SQL,
    DELEGATION_SQL,
    REFINEMENT_SQL,
    REUSE_SQL,
    AGENT_METADATA_SQL,
    DEPTH_DELEGATION_SQL,
    DEPTH_REFINEMENT_SQL,
    DEPTH_REPERTOIRE_SQL,
    DEPTH_REUSE_SQL,
    V4_DELEGATION_SQL,
    V4_REFINEMENT_SQL,
    V4_REUSE_SQL,
    AGENT_JOIN_KEY_SQL,
    TAXONOMY_QM_RF_SQL,
]

INVALID_STRUCT_PATHS = [
    "jsonPayload.workflowrun.rootWorkflowId",
    "jsonPayload.workflowrun.workflowid",
    "jsonPayload.workflowrun.workflowId",
    "jsonPayload.workflowrun.runId",
    "jsonPayload.workflowrun.id",
    "jsonPayload.user.id",
    "jsonPayload.user.canonicalid",
    "productsnapshot.workflow.published",
    "productsnapshot.workflow.ispublished",
    "productsnapshot.workflow.reusable",
    "JSON_VALUE(jsonPayload",
]


def test_glean_bot_activity_anti_double_count_is_enforced_in_sql() -> None:
    sql = SQL.read_text()
    workflow_sessions_block = sql.split("workflow_sessions AS", 1)[1].split("workflow_surfaces AS", 1)[0]

    assert "standalone_glean_bot_activity AS" in sql
    assert "AND bot.workflow_feature IS NULL" in sql
    assert "NOT EXISTS" in sql
    assert "workflow_sessions" in sql
    assert "workflow_session.session_token = bot.session_token" in sql
    assert "workflow_feature IS NOT NULL" not in workflow_sessions_block
    assert "'standalone:GLEAN_BOT_ACTIVITY'" in sql


def test_standalone_surfaces_require_absence_of_workflow_wrapper() -> None:
    sql = SQL.read_text()

    for cte in [
        "standalone_search AS",
        "standalone_autocomplete AS",
        "standalone_mcp_usage AS",
        "standalone_ai_summary AS",
    ]:
        block = sql.split(cte, 1)[1].split("AND user_key IS NOT NULL", 1)[0]
        assert "AND workflow_feature IS NULL" in block


def test_sub_events_and_verification_signals_do_not_become_surfaces() -> None:
    sql = SQL.read_text()
    taxonomy_block = sql.split("taxonomy_surfaces AS", 1)[1].split("verification_signals AS", 1)[0]

    for excluded in ["CLIENT_EVENT", "PRODUCT_SNAPSHOT", "LLM_CALL", "ACTION"]:
        assert excluded in sql
        assert excluded not in taxonomy_block
    for verification_signal in ["CHAT_CITATION_CLICK", "AI_ANSWER_VOTE", "AI_SUMMARY_VOTE", "SEARCH_FEEDBACK"]:
        assert verification_signal not in taxonomy_block


def test_verification_signals_join_back_to_parent_surfaces() -> None:
    sql = SQL.read_text()

    assert "verification_signals AS" in sql
    assert "surface_join_aliases AS" in sql
    assert "surface_verification AS" in sql
    for verification_signal in [
        "CHAT_CITATION_CLICK",
        "AI_ANSWER_VOTE",
        "AI_SUMMARY_VOTE",
        "SEARCH_FEEDBACK",
    ]:
        assert verification_signal in sql
    assert "surface_join_key AS attribution_join_key" in sql
    assert "session_token AS attribution_join_key" in sql
    assert "verification.attribution_join_key = alias.attribution_join_key" in sql
    assert "LEFT JOIN surface_verification" in sql
    assert "verification_signal_count" in sql
    assert "verified_user_count" in sql
    assert "verification_rate" in sql


def test_velocity_sql_splits_agent_into_sub_surfaces() -> None:
    sql = SQL.read_text()

    snapshot_events_block = sql.split("product_snapshot_events AS", 1)[1].split("product_snapshot_latest AS", 1)[0]
    product_snapshots_block = sql.split("product_snapshots AS", 1)[1].split("workflow_sessions AS", 1)[0]

    assert "FROM `PROJECT.DATASET.gce_events`" in snapshot_events_block
    assert "timestamp < window_end" in snapshot_events_block
    assert "timestamp >= window_start" not in snapshot_events_block
    assert "FROM source_events" not in product_snapshots_block
    assert "ORDER BY snapshot_ts DESC" in sql
    assert "product_snapshots AS" in sql
    assert "snapshot.snapshot_workflow_id = root_workflow_id" in sql
    assert "agent:autonomous" in sql
    assert "agent:workflow_named" in sql
    assert "agent:ephemeral" in sql
    assert "TODO(AGENT_TYPES.md section 11)" in sql


def test_agent_type_diagnostic_reports_sub_surface_aggregates() -> None:
    sql = AGENT_SQL.read_text()

    snapshot_events_block = sql.split("product_snapshot_events AS", 1)[1].split("product_snapshot_latest AS", 1)[0]
    product_snapshots_block = sql.split("product_snapshots AS", 1)[1].split("agent_runs AS", 1)[0]

    assert "FROM `PROJECT.DATASET.gce_events`" in snapshot_events_block
    assert "timestamp < window_end" in snapshot_events_block
    assert "timestamp >= window_start" not in snapshot_events_block
    assert "FROM source_events" not in product_snapshots_block
    assert "ORDER BY snapshot_ts DESC" in sql
    assert "agent_runs AS" in sql
    assert "agent:autonomous" in sql
    assert "agent:workflow_named" in sql
    assert "agent:ephemeral" in sql
    for field in [
        "cohort_size",
        "completion_rate",
        "error_rate",
        "abandonment_rate",
        "recovery_rate",
        "p50_latency_ms",
        "p95_latency_ms",
    ]:
        assert field in sql


def test_dogfood_sql_uses_valid_scio_prod_struct_paths() -> None:
    for path in DOGFOOD_SQL:
        sql = path.read_text()
        for invalid_path in INVALID_STRUCT_PATHS:
            assert not re.search(
                rf"(?<![A-Za-z0-9_]){re.escape(invalid_path)}(?![A-Za-z0-9_])",
                sql,
            ), f"{path} uses invalid scio-prod path {invalid_path}"


def test_agent_metadata_field_discovery_is_aggregate_only() -> None:
    sql = AGENT_METADATA_SQL.read_text()

    assert "jsonPayload.workflowrun.rootworkflowid" in sql
    assert "jsonPayload.productsnapshot.workflow.workflowid" in sql
    assert "jsonPayload.productsnapshot.workflow.name" in sql
    assert "jsonPayload.productsnapshot.workflow.isautonomousagent" in sql
    assert "jsonPayload.productsnapshot.workflow.unlisted" in sql
    assert "jsonPayload.productsnapshot.workflow.isdraftonly" in sql
    for field in [
        "metadata_field",
        "populated_rows",
        "populated_rate",
        "distinct_value_count",
        "agent_run_rows",
        "autonomous_true_rows",
        "autonomous_false_rows",
        "unlisted_false_rows",
        "isdraftonly_false_rows",
        "notes",
        "candidate_classifier",
        "candidate_rows",
        "candidate_rate",
        "explanation",
    ]:
        assert field in sql


def test_reuse_propagation_diagnostic_reports_candidate_and_coverage_metrics() -> None:
    sql = DEPTH_REUSE_SQL.read_text()

    for population in [
        "named_workflow_candidate",
        "confirmed_reusable_candidate",
        "autonomous_agent",
        "ephemeral_or_unlisted_agent",
        "unclassified_agent_workflow",
        "unmatched_agent_workflow",
    ]:
        assert population in sql

    for output_field in [
        "population",
        "adopter_bucket",
        "workflow_count",
        "run_count",
        "summed_workflow_adopters",
        "workflow_share",
        "run_share",
        "adopter_count_p50",
        "adopter_count_p90",
        "adopter_count_p99",
        "bucket_adopter_count_p50",
        "bucket_adopter_count_p90",
        "bucket_adopter_count_p99",
        "snapshot_match_rate",
        "named_candidate_count",
        "confirmed_reusable_candidate_count",
        "unmatched_agent_workflow_count",
    ]:
        assert output_field in sql

    assert "named_workflow_candidate AS (" in sql
    assert "confirmed_reusable_candidate AS (" in sql
    assert "snapshot_join_coverage AS (" in sql
    assert (
        "COUNT(DISTINCT IF(is_named_workflow_candidate, workflow_key, NULL)) "
        "AS named_candidate_count"
    ) in sql
    assert (
        "COUNT(DISTINCT IF(is_confirmed_reusable_candidate, workflow_key, NULL)) "
        "AS confirmed_reusable_candidate_count"
    ) in sql
    assert (
        "COUNT(DISTINCT IF(NOT has_snapshot_match, workflow_key, NULL)) "
        "AS unmatched_agent_workflow_count"
    ) in sql


def test_agent_snapshot_join_key_diagnostic_compares_aggregate_candidates() -> None:
    sql = AGENT_JOIN_KEY_SQL.read_text()

    for candidate in [
        "rootworkflowid",
        "runid",
        "sessiontrackingtoken",
    ]:
        assert candidate in sql

    for field in [
        "candidate_join_key_name",
        "agent_run_rows",
        "distinct_agent_workflows",
        "candidate_key_present_rows",
        "product_snapshot_match_rows",
        "product_snapshot_match_rate",
        "matched_rows_with_workflow_name",
        "matched_rows_unlisted_false",
        "matched_rows_isdraftonly_false",
        "matched_rows_autonomous_true",
        "matched_rows_autonomous_false",
        "named_candidate_rows",
        "named_not_draft_candidate_rows",
        "notes",
    ]:
        assert field in sql

    assert "UNNEST(jsonPayload.workflowrun.workflowexecutions)" in sql
    assert "jsonPayload.productsnapshot.workflow.isdraftonly" in sql
    assert "jsonPayload.productsnapshot.workflow.name" in sql
    assert "jsonPayload.productsnapshot.workflow.workflowid" in sql


def test_depth_repertoire_diagnostic_reports_aggregate_repertoire_and_repeat_metrics() -> None:
    sql = DEPTH_REPERTOIRE_SQL.read_text()

    for field in [
        "segment",
        "cohort_size",
        "repertoire_p10",
        "repertoire_p50",
        "repertoire_p90",
        "repertoire_p99",
        "repeated_surface_p10",
        "repeated_surface_p50",
        "repeated_surface_p90",
        "repeated_surface_p99",
        "multi_day_surface_p10",
        "multi_day_surface_p50",
        "multi_day_surface_p90",
        "multi_day_surface_p99",
        "depth_candidate_p50",
        "depth_candidate_p90",
        "depth_candidate_p99",
        "workflow_surface_p50",
        "standalone_surface_p50",
    ]:
        assert field in sql

    for segment in [
        "overall",
        "01_single_surface",
        "02_two_to_three_surfaces",
        "03_four_to_six_surfaces",
        "04_seven_to_ten_surfaces",
        "05_eleven_plus_surfaces",
    ]:
        assert segment in sql

    assert "surface_repertoire * repeated_surface_count" in sql
    assert "CLIENT_EVENT" not in sql
    assert "PRODUCT_SNAPSHOT" not in sql
    assert "LLM_CALL" not in sql
    assert "ACTION" not in sql
    assert "GROUP BY user_key, surface_id" in sql


def test_taxonomy_qm_rf_diagnostic_emits_work_mode_aggregate_inputs() -> None:
    sql = TAXONOMY_QM_RF_SQL.read_text()

    for output_field in [
        "workflow_id",
        "surface_category",
        "work_mode",
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
        "metric_sources",
    ]:
        assert output_field in sql

    for work_mode in [
        "retrieval",
        "conversational_work",
        "synthesis_transformation",
        "embedded_assist",
        "delegated_execution",
        "reusable_workflow_skill",
        "exploratory_agent_work",
        "specialized_workflow",
    ]:
        assert work_mode in sql

    assert "standalone:GLEAN_BOT_ACTIVITY" in sql
    assert "NOT EXISTS" in sql
    assert "workflow_session.session_token = bot.session_token" in sql
    assert "CHAT_CITATION_CLICK" in sql
    assert "CHAT_FEEDBACK" in sql
    assert "AI_ANSWER_VOTE" in sql
    assert "AI_SUMMARY_VOTE" in sql
    assert "SEARCH_FEEDBACK" in sql
    assert "observed_event_proxy" in sql
    assert "workflow_status" in sql
