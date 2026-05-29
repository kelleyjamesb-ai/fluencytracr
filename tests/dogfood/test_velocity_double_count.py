import csv
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
SKILL_READ_SQL = ROOT / "sql" / "dogfood" / "skill_read_availability_diagnostic.sql"
TRUST_SIGNAL_SQL = ROOT / "sql" / "dogfood" / "trust_signal_availability_diagnostic.sql"
TRUST_ATTRIBUTION_SQL = ROOT / "sql" / "dogfood" / "trust_attribution_refinement_diagnostic.sql"
BEHAVIOR_COHORT_JOINT_SQL = ROOT / "sql" / "dogfood" / "behavior_cohort_joint_distribution_diagnostic.sql"
VELOCITY_DEPTH_ZONE_SQL = ROOT / "sql" / "dogfood" / "velocity_depth_zone_diagnostic.sql"
VALUE_STRATEGY_DOC = ROOT / "docs" / "research" / "V4_VALUE_REALIZATION_STRATEGY_LAYER.md"
VALUE_STRATEGY_SUMMARY_CSV = (
    ROOT
    / "dogfood-output"
    / "v4-value-realization-strategy"
    / "v4_value_realization_strategy_summary.csv"
)
SCALE_READINESS_CONTRACT = ROOT / "docs" / "contracts" / "value-confidence" / "scale-readiness-portfolio.md"
TRUST_EPISODE_SQL = ROOT / "sql" / "dogfood" / "trust_episode_boundary_diagnostic.sql"
TRUST_GAP_COMPOSITION_SQL = (
    ROOT / "sql" / "dogfood" / "trust_evidence_gap_composition_diagnostic.sql"
)
TRUST_EPISODE_DOC = ROOT / "docs" / "research" / "TRUST_EPISODE_BOUNDARY.md"
TRUST_EPISODE_VALIDATION_READOUT = (
    ROOT / "docs" / "research" / "V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md"
)
TRUST_EPISODE_INPUT_CONTRACT = (
    ROOT / "docs" / "contracts" / "value-confidence" / "trust-episode-boundary-input.md"
)

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
    SKILL_READ_SQL,
    TRUST_SIGNAL_SQL,
    TRUST_ATTRIBUTION_SQL,
    BEHAVIOR_COHORT_JOINT_SQL,
    VELOCITY_DEPTH_ZONE_SQL,
    TRUST_EPISODE_SQL,
    TRUST_GAP_COMPOSITION_SQL,
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


def test_velocity_verification_prefers_precise_keys_before_session() -> None:
    sql = SQL.read_text()

    # The run id arrives as tracking_token, so verification attribution must try
    # the precise run/workflow keys first and only fall back to session_token.
    # The old COALESCE(workflow_run_id, session_token, ...) in verification_signals
    # collapsed to session and over-attributed every surface in a session.
    verification_block = sql.split("verification_signals AS", 1)[1].split("surface_verification AS", 1)[0]
    assert "session_token,\n      CONCAT(" not in verification_block
    assert "workflow_run_id IS NOT NULL OR root_workflow_id IS NOT NULL OR tracking_token IS NOT NULL" in sql
    assert "[workflow_run_id, root_workflow_id, tracking_token]" in sql
    assert "[session_token]" in sql
    # Parent surfaces must expose tracking_token as an alias, or precise-key
    # feedback/vote events (SEARCH_FEEDBACK, AI_SUMMARY_VOTE) that no longer fall
    # back to session would fail to join and undercount verification.
    assert "tracking_token AS attribution_join_key" in sql


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


def test_trust_episode_boundary_doc_preserves_research_governance() -> None:
    doc = TRUST_EPISODE_DOC.read_text()

    for phrase in [
        "research-only",
        "AI Work Episode Boundary",
        "No individual scoring",
        "no new canonical events",
        "no new suppression reasons",
        "no ROI calculation",
        "not a citation-click metric",
        "citations are optional corroboration",
        "aggregate-only",
    ]:
        assert phrase in doc

    for pattern in [
        "resolved_with_confidence",
        "resolved_without_verification_signal",
        "recovered_after_failure",
        "stalled_after_ai_assist",
        "explicit_negative_feedback",
        "evidence_gap",
    ]:
        assert pattern in doc


def test_trust_episode_boundary_diagnostic_is_aggregate_only() -> None:
    sql = TRUST_EPISODE_SQL.read_text()

    for phrase in [
        "Research-only",
        "AI Work Episode Boundary",
        "episodes AS",
        "episode_patterns AS",
        "aggregate_episode_matrix AS",
        "feedback_signal",
        "agent_completion",
        "post_failure_behavior",
        "post_skill_behavior",
        "verification_source_behavior",
        "citation_click_episode_count",
    ]:
        assert phrase in sql

    for pattern in [
        "resolved_with_confidence",
        "resolved_without_verification_signal",
        "recovered_after_failure",
        "stalled_after_ai_assist",
        "explicit_negative_feedback",
        "evidence_gap",
    ]:
        assert pattern in sql

    final_select = sql.rsplit("SELECT", 1)[1]
    for forbidden in [
        "user_key",
        "user_id",
        "useremail",
        "email",
        "person",
        "manager",
        "department",
        "team",
        "raw_prompt",
        "raw_output",
        "transcript",
        "trust_score",
        "roi",
    ]:
        assert forbidden not in final_select.lower()

    assert "PROJECT.DATASET.gce_events" in sql
    assert "PROJECT.DATASET.agent_span_events" in sql
    assert "APPROX_QUANTILES" in sql


def test_trust_episode_boundary_validation_promotes_without_productizing() -> None:
    readout = TRUST_EPISODE_VALIDATION_READOUT.read_text()

    for phrase in [
        "Candidate signal: Trust Episode Boundary",
        "Decision: `PROMOTE`",
        "eligible for later productization",
        "not automatically productized",
        "Trust Calibration Index",
        "recovered-after-failure",
        "99.95%",
        "about 18%",
        "about 42%",
        "Citation behavior is optional corroboration",
        "No individual scoring",
        "No team, manager, department, or employee ranking",
        "No ROI claim",
        "No causal claim",
        "No prediction claim",
        "No new canonical events",
        "No new suppression reasons",
    ]:
        assert phrase in readout

    for forbidden in [
        "calculates ROI",
        "proves causality",
        "proves output correctness",
        "scores employees",
        "ranks teams",
        "ranks managers",
        "productivity lift claim",
    ]:
        assert forbidden not in readout.lower()


def test_trust_episode_boundary_validation_has_customer_safe_output_language() -> None:
    readout = TRUST_EPISODE_VALIDATION_READOUT.read_text()

    assert "Customer-Safe Output Language" in readout
    assert "aggregate AI work episodes" in readout
    assert "resolves, recovers after friction, stalls" in readout
    assert "cannot prove output correctness, ROI, productivity lift, or causality" in readout
    assert "does not identify, score, rank, or evaluate employees" in readout


def test_trust_episode_boundary_input_contract_codifies_output_sequence() -> None:
    contract = TRUST_EPISODE_INPUT_CONTRACT.read_text()

    for phrase in [
        "Status: `PRODUCT_CONTRACT_PROPOSAL`",
        "Trust Calibration Index",
        "Customer-Safe Output Language",
        "Citation Requirements",
        "Evidence Handling Sequence",
        "Do not emit Trust Episode Boundary pattern values",
        "must cite the validation readout",
        "must cite the supporting dogfood BigQuery readouts",
        "does not add canonical events",
        "does not add suppression reasons",
        "does not calculate ROI",
        "does not establish causality",
    ]:
        assert phrase in contract

    for evidence_path in [
        "V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md",
        "TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md",
        "TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md",
        "TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md",
    ]:
        assert evidence_path in contract


def test_trust_episode_boundary_input_contract_keeps_output_aggregate_safe() -> None:
    contract = TRUST_EPISODE_INPUT_CONTRACT.read_text().lower()

    for required in [
        "aggregate ai work episodes",
        "recovers after friction",
        "stalls",
        "lacks enough evidence",
        "not identify, score, rank, or evaluate employees",
        "not a trust score",
        "not a citation-click metric",
        "not a correctness detector",
    ]:
        assert required in contract

    for forbidden in [
        "calculates roi",
        "proves causality",
        "proves output correctness",
        "scores employees",
        "ranks teams",
        "ranks managers",
        "individual productivity",
    ]:
        assert forbidden not in contract


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


def test_taxonomy_qm_rf_verification_prefers_precise_keys_before_session() -> None:
    sql = TAXONOMY_QM_RF_SQL.read_text()

    verification_block = sql.split("verification_signals AS", 1)[1].split("surface_verification AS", 1)[0]
    assert "session_token,\n      CONCAT(" not in verification_block
    assert "workflow_run_id IS NOT NULL OR root_workflow_id IS NOT NULL OR tracking_token IS NOT NULL" in sql
    assert "[workflow_run_id, root_workflow_id, tracking_token]" in sql
    assert "[session_token]" in sql
    # Parent surfaces must expose tracking_token as an alias, or precise-key
    # feedback/vote events (SEARCH_FEEDBACK, AI_SUMMARY_VOTE) that no longer fall
    # back to session would fail to join and undercount verification.
    assert "tracking_token AS attribution_join_key" in sql


def test_skill_read_availability_diagnostic_is_aggregate_only() -> None:
    sql = SKILL_READ_SQL.read_text()

    for field in [
        "jsonPayload.action.agentmetadata.inputs",
        "jsonPayload.action.spaninfo.inputs",
        "jsonPayload.action.skill_reader_attributes.skill_name",
        "read_mechanism",
        "skill_name_status",
        "parent_join_status",
        "skill_read_rows",
        "distinct_specified_skill_names",
        "overall_unspecified_share",
        "overall_parent_join_key_share",
        "availability_status",
    ]:
        assert field in sql

    final_select = sql.split("SELECT\n  DATE(window_start)", 1)[1]
    assert "observed_skill_name" not in final_select
    assert "GROUP BY observed_skill_name" not in sql
    assert "COUNT(DISTINCT IF(skill_name_status = 'specified', observed_skill_name, NULL))" in sql


def test_skill_read_availability_diagnostic_emits_zero_volume_status() -> None:
    sql = SKILL_READ_SQL.read_text()

    assert "aggregate_output AS" in sql
    assert "'no_skill_read_volume' AS read_mechanism" in sql
    assert "WHERE overall.total_skill_read_rows = 0" in sql
    assert "FROM aggregate_output\nCROSS JOIN overall" in sql
    assert "WHEN overall.total_skill_read_rows = 0 THEN 'NO_SKILL_READ_VOLUME'" in sql


def test_trust_signal_availability_diagnostic_deduplicates_joined_signals() -> None:
    sql = TRUST_SIGNAL_SQL.read_text()

    assert "signal_key" in sql
    assert "TO_HEX(SHA256(CONCAT(" in sql
    assert "COUNT(DISTINCT signal_key) AS total_signal_count" in sql
    assert "COUNT(DISTINCT verification.signal_key) AS joined_signal_count" in sql
    assert "COUNT(*) AS joined_signal_count" not in sql


def test_trust_signal_availability_prefers_precise_keys_before_session() -> None:
    sql = TRUST_SIGNAL_SQL.read_text()

    # Single-key COALESCE design (the signal_key dedup CTE breaks under UNNEST),
    # so precise keys must simply precede session_token in the COALESCE order.
    assert "COALESCE(\n      workflow_run_id,\n      session_token," not in sql
    assert (
        "COALESCE(\n      workflow_run_id,\n      root_workflow_id,\n      tracking_token,\n      session_token\n    ) AS attribution_join_key"
        in sql
    )

    final_select = sql.split("SELECT\n  DATE(window_start)", 1)[1]
    assert "signal_key" not in final_select


def test_trust_attribution_refinement_diagnostic_is_tiered_and_aggregate_only() -> None:
    sql = TRUST_ATTRIBUTION_SQL.read_text()

    for required in [
        "EXACT_PARENT_KEY",
        "SESSION_PARENT_KEY",
        "STRICT_PARENT_ATTRIBUTION",
        "SESSION_PARENT_ATTRIBUTION",
        "AMBIGUOUS_PARENT",
        "CROSS_SURFACE_ALIAS",
        "NO_PARENT",
        "SMALL_CELL_SUPPRESSED",
        "TRUST_ATTRIBUTION_STRICT",
        "TRUST_ATTRIBUTION_SESSION",
        "Proximity attribution remains a research-only method candidate",
    ]:
        assert required in sql

    final_select = sql.split("SELECT\n  DATE(window_start)", 1)[1]
    for forbidden in [
        "user_key,",
        "signal_key,",
        "parent_record_key,",
        "direct_parent_key,",
    ]:
        assert forbidden not in final_select

    assert "distinct_signal_users >= 5" in sql
    assert "CASE WHEN clears_small_cell_gate THEN signal_count END" in sql


def test_behavior_cohort_joint_distribution_diagnostic_outputs_aggregate_joint_rows() -> None:
    sql = BEHAVIOR_COHORT_JOINT_SQL.read_text()

    for required in [
        "behavior_cohort_dimension",
        "behavior_cohort_band",
        "trust_classification",
        "agent_delegation_classification",
        "skill_read_presence_classification",
        "cohort_size",
        "signal_count",
        "suppression_status",
        "suppression_reason",
        "SURFACE_ELIGIBLE_RESEARCH_ONLY",
        "INSUFFICIENT_VOLUME",
    ]:
        assert required in sql

    for cohort in [
        "velocity_band",
        "depth_repertoire_band",
        "agent_delegation_band",
        "skill_read_presence_band",
    ]:
        assert cohort in sql

    assert "FROM `PROJECT.DATASET.gce_events`" in sql
    assert "FROM `PROJECT.DATASET.scrubbed_agentspan_*`" in sql
    assert "CREATE TEMP TABLE source_events AS" in sql
    assert "CREATE TEMP TABLE privacy_screened_results AS" in sql
    assert "COUNT(DISTINCT user_key) AS cohort_size" in sql
    assert "CASE WHEN cohort_size >= 5 THEN cohort_size END AS cohort_size" in sql

    final_select = sql.split("SELECT\n  DATE(window_start)", 1)[1]
    for forbidden in [
        "user_key",
        "observed_skill_name",
        "raw_skill",
        "prompt",
        "transcript",
        "email",
    ]:
        assert forbidden not in final_select


def test_behavior_cohort_joint_distribution_uses_value_based_velocity_bands() -> None:
    sql = BEHAVIOR_COHORT_JOINT_SQL.read_text()

    assert "NTILE(" not in sql
    assert "velocity_ntile" not in sql
    assert "velocity_boundaries" in sql
    assert "APPROX_QUANTILES(total_interactions, 3)" in sql
    assert "behavior.total_interactions > boundaries.high_velocity_boundary" in sql
    assert "behavior.total_interactions > boundaries.low_velocity_boundary" in sql
    assert "velocity_band AS behavior_cohort_band" in sql


def test_velocity_depth_zone_diagnostic_outputs_joined_aggregate_zones() -> None:
    sql = VELOCITY_DEPTH_ZONE_SQL.read_text()

    for required in [
        "velocity_band",
        "depth_repertoire_band",
        "trust_classification",
        "agent_delegation_classification",
        "skill_read_presence_classification",
        "SCALE_CANDIDATE",
        "SHALLOW_ADOPTION",
        "FOCUSED_EXPERT_USE",
        "TRUST_EVIDENCE_GAP",
        "INSTRUMENTATION_HOLD_UNSTABLE_DEPTH",
        "SUPPRESSED",
        "ACCELERATION_OR_QUALITY_PREMIUM_CANDIDATE_REQUIRES_OUTCOME_EVIDENCE",
        "COUNT(DISTINCT user_key) AS cohort_size",
        "CASE WHEN cohort_size >= 5 THEN cohort_size END AS cohort_size",
    ]:
        assert required in sql

    assert "FROM `PROJECT.DATASET.gce_events`" in sql
    assert "FROM `PROJECT.DATASET.scrubbed_agentspan_*`" in sql
    assert "CREATE TEMP TABLE aggregate_velocity_depth_distribution AS" in sql

    final_select = sql.split("SELECT\n  DATE(window_start)", 1)[1]
    for forbidden in [
        "user_key",
        "observed_skill_name",
        "raw_skill",
        "prompt",
        "transcript",
        "email",
    ]:
        assert forbidden not in final_select


def test_value_realization_strategy_layer_routes_without_monetary_claims() -> None:
    doc = VALUE_STRATEGY_DOC.read_text()

    for required in [
        "Value Realization Strategy Layer",
        "strategy posture",
        "value mechanism",
        "stakeholder value question",
        "stakeholder evidence needs",
        "CFO monetary track",
        "CIO operating track",
        "AI operator track",
        "business owner track",
        "customer-owned economic model",
        "does not calculate monetary value",
        "SCALE_AND_MEASURE",
        "COACH_OR_REDESIGN",
        "STUDY_AND_PACKAGE",
        "REPAIR_TRUST_LOOP",
        "FIX_INSTRUMENTATION",
        "HOLD_NO_INTERPRETATION",
        "BLOCKED_CFO_MONETARY_VALUE",
    ]:
        assert required in doc


def test_value_realization_strategy_csv_is_aggregate_only() -> None:
    with VALUE_STRATEGY_SUMMARY_CSV.open(newline="") as handle:
        rows = list(csv.DictReader(handle))

    assert rows
    required_columns = {
        "readout_zone_test_result",
        "strategy_posture",
        "strategy_motion",
        "value_mechanism",
        "stakeholder_value_question",
        "stakeholder_evidence_needs",
        "primary_stakeholder_tracks",
        "required_outcome_evidence",
        "required_customer_owned_assumptions",
        "monetary_value_status",
        "blocked_claims",
    }
    assert required_columns.issubset(rows[0])

    forbidden_columns = {
        "user_key",
        "user_id",
        "email",
        "name",
        "raw_skill",
        "skill_name",
        "prompt",
        "output",
        "transcript",
        "action_row",
        "raw_event",
    }
    assert forbidden_columns.isdisjoint({column.lower() for column in rows[0]})

    expected_strategy_by_zone = {
        "SCALE_CANDIDATE": "SCALE_AND_MEASURE",
        "SHALLOW_ADOPTION": "COACH_OR_REDESIGN",
        "FOCUSED_EXPERT_USE": "STUDY_AND_PACKAGE",
        "TRUST_EVIDENCE_GAP": "REPAIR_TRUST_LOOP",
        "SUPPRESSED": "HOLD_NO_INTERPRETATION",
    }
    three_window_rows = [row for row in rows if row["window_count"] == "3"]
    assert three_window_rows
    assert set(expected_strategy_by_zone).issubset(
        {row["readout_zone_test_result"] for row in three_window_rows}
    )

    for row in three_window_rows:
        zone = row["readout_zone_test_result"]
        assert zone in expected_strategy_by_zone
        assert row["strategy_posture"] == expected_strategy_by_zone[zone]

    for row in rows:
        assert row["monetary_value_status"] in {
            "BLOCKED_PENDING_OUTCOME_EVIDENCE",
            "BLOCKED_PENDING_TRUST_EVIDENCE",
            "BLOCKED_PENDING_SOURCE_COVERAGE",
            "BLOCKED_SUPPRESSED",
        }


def test_scale_readiness_contract_carries_depth_context_without_runtime_promotion() -> None:
    contract = SCALE_READINESS_CONTRACT.read_text()

    for required in [
        "PROMOTE_AI_SCALE_READINESS_WITH_DEPTH_REPERTOIRE_CONTEXT",
        "INTEGRATED_REPERTOIRE",
        "ACTIVE_BUT_SHALLOW",
        "FOCUSED_INTEGRATION",
        "UNSTABLE_OR_INSUFFICIENT",
        "TRUST_ATTRIBUTION_HOLD",
        "SKILL_READ_EVIDENCE_AVAILABLE",
        "PROMOTE_INVESTIGATION_ROUTING_ONLY",
        "This contract is approved for internal Glean dogfood readout shape only.",
        "does not approve runtime APIs, schemas, customer-facing readouts",
    ]:
        assert required in contract

    for blocked in [
        "hidden multiplier",
        "Raw skill names must not appear",
        "does not produce economic output",
    ]:
        assert blocked in contract
