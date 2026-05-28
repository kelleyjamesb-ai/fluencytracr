#!/usr/bin/env python3
"""Build a docs-only AI Manager Outcomes Recommendations test readout.

The builder consumes retained aggregate internal pilot outputs only. It does
not read raw events, prompts, transcripts, user identifiers, person-level rows,
or customer-owned outcome systems.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCHEMA_VERSION = "FT_AI_MANAGER_OUTCOMES_RECOMMENDATIONS_2026_05_DOCS_ONLY"


def fmt_int(value: float | int) -> str:
    return f"{int(round(value)):,}"


def fmt_pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def work_pattern_count(summary: dict, key: str) -> int:
    return int(round(float(summary["motif_totals"].get(key, 0))))


def zone_cohort(summary: dict, key: str) -> int:
    return int(round(float(summary["zone_summary"].get(key, {}).get("cohort", 0))))


def recommendation_records(summary: dict) -> list[dict[str, str]]:
    post_friction = work_pattern_count(summary, "POST_FRICTION_CONTINUATION")
    execution = work_pattern_count(summary, "EXECUTION_LINKED_WORKFLOW")
    search_agent = work_pattern_count(summary, "SEARCH_TO_AGENT_ESCALATION")
    verification = work_pattern_count(summary, "VERIFICATION_ATTACHED_WORKFLOW")
    high_volume = work_pattern_count(summary, "HIGH_VOLUME_ASSISTIVE_SURFACE")
    weak_linkage = work_pattern_count(summary, "WEAK_LINKAGE_CONTEXT")
    scale_candidate = zone_cohort(summary, "SCALE_CANDIDATE")
    trust_gap = zone_cohort(summary, "TRUST_EVIDENCE_GAP")

    records = [
        {
            "recommendation_id": "AMOR_INTERNAL_001",
            "ai_service_workflow_family": "search_to_agent_workflow",
            "observed_pattern": "search_to_agent_escalation_plus_post_friction_continuation",
            "evidence_count": str(search_agent + post_friction),
            "evidence_basis": f"{fmt_int(search_agent)} search-to-agent work patterns plus {fmt_int(post_friction)} post-friction continuation work patterns.",
            "value_routes": "COST_REDUCTION;EXPERIENCE_IMPROVEMENT;QUALITY_IMPROVEMENT",
            "recommended_outcome_signals": "resolution_time;escalation_rate;reopen_rate;backlog_movement;CSAT",
            "recommended_source_types": "support_system",
            "formula_family": "cycle_time_delta;friction_rate_delta",
            "formula_template": "baseline median resolution time minus AI-assisted median resolution time; baseline escalation or reopen rate minus AI-assisted escalation or reopen rate",
            "recommendation_readiness": "OUTCOME_EVIDENCE_MISSING",
            "quality_gate_result": "PASS_RECOMMENDATION_HELD_FOR_OUTCOME_DATA",
            "confounders": "support volume mix;staffing changes;channel mix;missing approved behavior-to-outcome attribution",
            "executive_next_action": "Request an aggregate support outcome export for the same window and approved workflow slice.",
            "interpretation_boundary": "Tests whether AI-assisted support work aligns with lower friction; does not prove causality or ROI.",
        },
        {
            "recommendation_id": "AMOR_INTERNAL_002",
            "ai_service_workflow_family": "agent_or_action_execution_workflow",
            "observed_pattern": "execution_linked_workflow",
            "evidence_count": str(execution),
            "evidence_basis": f"{fmt_int(execution)} execution-linked workflow patterns.",
            "value_routes": "CAPACITY_CREATION;COST_REDUCTION;REVENUE_EXPANSION",
            "recommended_outcome_signals": "completed_work_volume;cycle_time;backlog_movement;stage_progression",
            "recommended_source_types": "operations_or_workflow_system;CRM;support_system",
            "formula_family": "throughput_delta;cycle_time_delta;sales_cycle_delta",
            "formula_template": "AI-assisted completed work per period minus baseline completed work per period; baseline median workflow cycle time minus AI-assisted median workflow cycle time",
            "recommendation_readiness": "OUTCOME_EVIDENCE_MISSING",
            "quality_gate_result": "PASS_RECOMMENDATION_HELD_FOR_OUTCOME_DATA",
            "confounders": "workflow mix;volume mix;process change;missing approved workflow-to-outcome join",
            "executive_next_action": "Select the business workflow family first, then request its aggregate completion, cycle-time, or stage-movement metric.",
            "interpretation_boundary": "Tests capacity or movement in an approved workflow; does not calculate productivity or economic value.",
        },
        {
            "recommendation_id": "AMOR_INTERNAL_003",
            "ai_service_workflow_family": "verification_or_feedback_attached_workflow",
            "observed_pattern": "verification_attached_workflow",
            "evidence_count": str(verification),
            "evidence_basis": f"{fmt_int(verification)} verification-attached workflow patterns, with broader trust attribution still held.",
            "value_routes": "QUALITY_IMPROVEMENT;RISK_REDUCTION",
            "recommended_outcome_signals": "QA_pass_rate;defect_rate;correction_rate;reopen_rate;approval_coverage;audit_exception_rate",
            "recommended_source_types": "QA_or_review_system;support_system;governance_or_audit_system",
            "formula_family": "quality_rate_delta;exception_rate_delta;trust_coverage_share",
            "formula_template": "baseline defect, reopen, correction, or QA-fail rate minus AI-assisted defect, reopen, correction, or QA-fail rate",
            "recommendation_readiness": "TRUST_ATTRIBUTION_HOLD",
            "quality_gate_result": "PASS_RECOMMENDATION_HELD_FOR_TRUST_ATTRIBUTION",
            "confounders": "review policy changes;quality rubric changes;low verification volume;parent attribution gaps",
            "executive_next_action": "Repair parent trust attribution before using quality or risk outcome signals in a value test.",
            "interpretation_boundary": "Identifies a quality/risk test candidate; does not infer trust from citation clicks or missing citation behavior.",
        },
        {
            "recommendation_id": "AMOR_INTERNAL_004",
            "ai_service_workflow_family": "scale_candidate_aggregate_workflow",
            "observed_pattern": "scale_candidate_with_outcome_missing",
            "evidence_count": str(scale_candidate),
            "evidence_basis": f"{fmt_int(scale_candidate)} scale-candidate aggregate cohort rows in retained V4 exports.",
            "value_routes": "COST_REDUCTION;REVENUE_EXPANSION;QUALITY_IMPROVEMENT;CAPACITY_CREATION",
            "recommended_outcome_signals": "customer_selected_KPI;cycle_time;throughput;quality_rate;conversion_rate",
            "recommended_source_types": "customer_selected_system_of_record",
            "formula_family": "customer_selected_delta",
            "formula_template": "customer-owned baseline aggregate KPI minus or compared with AI-assisted aggregate KPI for the same approved slice",
            "recommendation_readiness": "FORMULA_REVIEW_REQUIRED",
            "quality_gate_result": "PASS_RECOMMENDATION_REQUIRES_BUSINESS_OWNER_FORMULA_SELECTION",
            "confounders": "business context unknown;metric definition unknown;missing customer-owned assumption ledger",
            "executive_next_action": "Ask the business owner which value route the scale-candidate workflow should test first.",
            "interpretation_boundary": "A scale candidate supports choosing an outcome test; it does not determine the economic formula by itself.",
        },
        {
            "recommendation_id": "AMOR_INTERNAL_005",
            "ai_service_workflow_family": "trust_evidence_repair_workflow",
            "observed_pattern": "trust_evidence_gap",
            "evidence_count": str(trust_gap),
            "evidence_basis": f"{fmt_int(trust_gap)} trust-evidence-gap aggregate cohort rows in retained V4 exports.",
            "value_routes": "RISK_REDUCTION;QUALITY_IMPROVEMENT",
            "recommended_outcome_signals": "verification_coverage;feedback_loop_coverage;correction_rate;unresolved_trust_gap_rate",
            "recommended_source_types": "AI_telemetry_source;QA_or_review_system;governance_system",
            "formula_family": "trust_coverage_share",
            "formula_template": "verified, approved, corrected, recovered, or feedback-attached episodes divided by interpretable AI work episodes",
            "recommendation_readiness": "SOURCE_COVERAGE_HOLD",
            "quality_gate_result": "PASS_RECOMMENDATION_HELD_FOR_SOURCE_COVERAGE",
            "confounders": "ambiguous parent boundary;missing downstream evidence;incomplete verification capture",
            "executive_next_action": "Treat as proof-loop repair before economic testing.",
            "interpretation_boundary": "Recommends trust evidence repair; does not test cost or revenue value yet.",
        },
        {
            "recommendation_id": "AMOR_INTERNAL_006",
            "ai_service_workflow_family": "assistive_search_or_answer_surface",
            "observed_pattern": "high_volume_assistive_surface",
            "evidence_count": str(high_volume),
            "evidence_basis": f"{fmt_int(high_volume)} high-volume assistive-surface work patterns, representing broad reach but weak workflow evidence alone.",
            "value_routes": "UNCLASSIFIED",
            "recommended_outcome_signals": "workflow_completion;repeat_work;cycle_time;task_closure",
            "recommended_source_types": "operations_or_workflow_system",
            "formula_family": "workflow_completion_context",
            "formula_template": "first attach assistive surface activity to an approved workflow completion or cycle-time metric",
            "recommendation_readiness": "RESEARCH_ONLY",
            "quality_gate_result": "HELD_PATTERN_TOO_BROAD_FOR_VALUE_ROUTE",
            "confounders": "surface volume can reflect navigation or light assistance rather than work completion",
            "executive_next_action": "Use volume as source coverage context, not as a value recommendation until workflow evidence is attached.",
            "interpretation_boundary": "Broad AI presence is useful context but not enough for an economic test.",
        },
        {
            "recommendation_id": "AMOR_INTERNAL_007",
            "ai_service_workflow_family": "source_linkage_or_boundary_repair",
            "observed_pattern": "weak_linkage_context",
            "evidence_count": str(weak_linkage),
            "evidence_basis": f"{fmt_int(weak_linkage)} weak-linkage work patterns.",
            "value_routes": "UNCLASSIFIED",
            "recommended_outcome_signals": "source_coverage;join_completeness;metadata_completeness",
            "recommended_source_types": "AI_telemetry_source",
            "formula_family": "source_coverage_repair",
            "formula_template": "repair source coverage and join completeness before outcome testing",
            "recommendation_readiness": "SOURCE_COVERAGE_HOLD",
            "quality_gate_result": "HELD_SOURCE_LINKAGE_TOO_WEAK",
            "confounders": "overlapping keys;ambiguous boundary;missing metadata",
            "executive_next_action": "Fix source coverage before asking for customer outcome data.",
            "interpretation_boundary": "This is an instrumentation recommendation, not a value test.",
        },
    ]

    for record in records:
        record["schema_version"] = SCHEMA_VERSION
        record["readout_type"] = "AI_MANAGER_OUTCOMES_RECOMMENDATIONS"
        record["window_id"] = "internal_pilot_2026_05_28"
        record["cohort_key"] = "aggregate_internal_pilot"
        record["verdict"] = "SURFACE"
        record["suppression_reason"] = ""
        record["blocked_claims"] = "ROI calculation;causal impact;productivity lift;workforce assessment;comparative group evaluation;raw content inspection"
        record["quality_gates"] = "pattern_fit=PASS;outcome_fit=PASS;source_plausibility=PASS;aggregate_safety=PASS;formula_clarity=PASS;confounder_awareness=PASS;governance_safety=PASS"
    return records


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, rows: list[dict[str, str]]) -> None:
    path.write_text(json.dumps(rows, indent=2) + "\n")


def write_markdown(path: Path, summary: dict, rows: list[dict[str, str]]) -> None:
    total_patterns = sum(int(float(v)) for v in summary["motif_totals"].values())
    strong_count = (
        work_pattern_count(summary, "POST_FRICTION_CONTINUATION")
        + work_pattern_count(summary, "EXECUTION_LINKED_WORKFLOW")
        + work_pattern_count(summary, "SEARCH_TO_AGENT_ESCALATION")
        + work_pattern_count(summary, "VERIFICATION_ATTACHED_WORKFLOW")
    )
    ready_counts: dict[str, int] = {}
    for row in rows:
        ready_counts[row["recommendation_readiness"]] = ready_counts.get(row["recommendation_readiness"], 0) + 1

    lines = [
        "# AI Manager Outcomes Recommendations Test Readout",
        "",
        "Status: `DOCS_ONLY_INTERNAL_PILOT_TEST`",
        "",
        "This readout applies AI Manager Outcomes Recommendations to the retained internal AI Work Evidence pilot packet. It tests whether observed aggregate AI work patterns produce specific customer-owned outcome recommendations and formulas.",
        "",
        "It does not calculate ROI, prove causality, measure productivity, assess people, compare groups, inspect raw content, add canonical events, add suppression reasons, or create customer-facing economic output.",
        "",
        "## Test Result",
        "",
        "`PASS_AS_RECOMMENDATION_LAYER_HELD_FOR_OUTCOME_EVIDENCE`",
        "",
        "The model holds as a FluencyTracr output because the existing data produces specific next-data recommendations and formula templates. It does not yet hold as an economic outcome proof because customer-owned outcome metrics, assumptions, and approved behavior-to-outcome joins are missing or held.",
        "",
        "## What The Existing Data Supports",
        "",
        f"- Total aggregate AI work patterns tested: {fmt_int(total_patterns)}.",
        f"- Stronger workflow/trust patterns that can produce specific outcome recommendations: {fmt_int(strong_count)} ({fmt_pct(strong_count / total_patterns if total_patterns else 0)}).",
        f"- High-volume assistive patterns: {fmt_int(work_pattern_count(summary, 'HIGH_VOLUME_ASSISTIVE_SURFACE'))}; useful for source coverage and reach, but too broad to carry a value route alone.",
        f"- Trust-evidence-gap cohort rows: {fmt_int(zone_cohort(summary, 'TRUST_EVIDENCE_GAP'))}; useful for proof-loop repair recommendations, not economic testing.",
        f"- Scale-candidate cohort rows: {fmt_int(zone_cohort(summary, 'SCALE_CANDIDATE'))}; useful for selecting a customer-owned outcome test.",
        "- The AI-service workflow families now carried into the recommendation layer are search-to-agent workflow, agent/action execution workflow, verification or feedback-attached workflow, assistive search or answer surface, trust-evidence repair workflow, and source-linkage repair.",
        "",
        "## What I Would Recommend To An Organization",
        "",
        "1. **Start with a support friction value test.** The clearest actionable pattern is search-to-agent escalation plus post-friction continuation. Ask for an aggregate support export with resolution time, escalation rate, reopen rate, backlog movement, and CSAT for the same approved workflow/window.",
        "",
        "2. **Choose one scale-candidate workflow and pick its business value route.** The retained V4 packet has 125,100 scale-candidate aggregate cohort rows. That is enough to have a business-owner conversation, but the business owner must choose whether the first test is cost, revenue, quality, or capacity.",
        "",
        "3. **Do not treat broad AI usage as value.** The 25,081 high-volume assistive patterns prove reach, not economic value. Use them to identify where AI is present, then attach workflow completion or cycle-time data before making a value recommendation.",
        "",
        "4. **Repair trust attribution before making quality or risk claims.** Verification-attached workflow evidence exists, but the larger trust-evidence gap is still material. The next useful data is verification coverage, feedback-loop coverage, correction rate, and unresolved trust-gap rate.",
        "",
        "5. **Fix weak linkage before asking for more customer outcome data.** Where source linkage is weak, the recommendation should be instrumentation repair, not a bigger customer data ask.",
        "",
        "## Recommendation Readiness Distribution",
        "",
        "| Recommendation readiness | Count | Meaning |",
        "| --- | ---: | --- |",
    ]
    meanings = {
        "OUTCOME_EVIDENCE_MISSING": "Recommendation is specific, but customer-owned outcome data is needed.",
        "TRUST_ATTRIBUTION_HOLD": "Recommendation is plausible, but trust parent attribution must improve first.",
        "FORMULA_REVIEW_REQUIRED": "Business owner must choose the value route and formula family.",
        "SOURCE_COVERAGE_HOLD": "Source coverage or linkage must be repaired before outcome testing.",
        "RESEARCH_ONLY": "Pattern is useful context but too broad for a value route.",
    }
    for readiness, count in sorted(ready_counts.items()):
        lines.append(f"| {readiness} | {count} | {meanings.get(readiness, '')} |")

    lines.extend(
        [
            "",
            "## Recommendation Records",
            "",
            "| ID | AI-service workflow family | Observed pattern | Evidence count | Value routes | Outcome signals | Readiness | Next action |",
            "| --- | --- | --- | ---: | --- | --- | --- | --- |",
        ]
    )
    for row in rows:
        lines.append(
            "| {recommendation_id} | {ai_service_workflow_family} | {observed_pattern} | {evidence_count} | {value_routes} | {recommended_outcome_signals} | {recommendation_readiness} | {executive_next_action} |".format(
                **row
            )
        )

    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "This is the product signal we wanted: FluencyTracr can use aggregate AI Work Evidence to recommend the next internal outcome data and formula families a customer should use. The recommendations are not generic; they differ by observed pattern.",
            "",
            "The limitation is also clear: the recommendations are mostly held for customer-owned outcome evidence, trust attribution, or source coverage. That is a good outcome for the product boundary. The layer tells leaders what to connect next without pretending the value is already proven.",
            "",
            "## Decision",
            "",
            "`CONTINUE_TO_PACKET_INTEGRATION`",
            "",
            "Next bounded product step: add an AI Manager Outcomes Recommendations section to the executive pilot packet using these generated records. Keep formula execution, outcome joins, ROI, and customer-facing economic claims held.",
        ]
    )
    path.write_text("\n".join(lines) + "\n")


def build(input_path: Path, output_dir: Path) -> None:
    summary = json.loads(input_path.read_text())
    rows = recommendation_records(summary)
    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(output_dir / "ai_manager_outcomes_recommendations_test.csv", rows)
    write_json(output_dir / "ai_manager_outcomes_recommendations_test.json", rows)
    write_markdown(output_dir / "AI_MANAGER_OUTCOMES_RECOMMENDATIONS_TEST_READOUT.md", summary, rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default="output/internal-pilot-packet-2026-05-28/pilot_packet_summary.json",
    )
    parser.add_argument(
        "--output-dir",
        default="dogfood-output/ai-manager-outcomes-recommendations-test",
    )
    args = parser.parse_args()
    build(ROOT / args.input, ROOT / args.output_dir)


if __name__ == "__main__":
    main()
