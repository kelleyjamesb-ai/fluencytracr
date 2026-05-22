from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SQL = ROOT / "sql" / "dogfood" / "velocity_diagnostic.sql"
AGENT_SQL = ROOT / "sql" / "dogfood" / "agent_type_diagnostic.sql"


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

    assert "product_snapshots AS" in sql
    assert "snapshot.snapshot_workflow_id = root_workflow_id" in sql
    assert "agent:autonomous" in sql
    assert "agent:workflow_named" in sql
    assert "agent:ephemeral" in sql
    assert "TODO(AGENT_TYPES.md section 11)" in sql


def test_agent_type_diagnostic_reports_sub_surface_aggregates() -> None:
    sql = AGENT_SQL.read_text()

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
