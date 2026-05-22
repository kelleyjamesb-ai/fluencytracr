#!/usr/bin/env python3
"""Run mocked Glean GCE fixtures through a local FluencyTracr dogfood pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from datetime import timedelta
from pathlib import Path
from typing import Any

from generate_gce_fixtures import SCHEMA_VERSION, build_fixture


MIN_COHORT_SIZE = 5
MIN_WINDOW_DAYS = 60
MIN_CAUSAL_WINDOW_DAYS = 14
MIN_CONVERGENT_SIGNAL_CLASSES = 2
AMBIGUITY_RATE_THRESHOLD = 0.20
FORBIDDEN_FIXTURE_KEYS = {
    "email",
    "manager_id",
    "manager_name",
    "name",
    "prompt",
    "query_text",
    "raw_content",
    "raw_prompt",
    "raw_response",
    "response",
    "transcript",
    "user_id",
    "user_name",
}
PATTERN_RANK = {
    "Undertrust Avoidance": 1,
    "Friction Loop": 2,
    "Blind Efficiency": 3,
    "Recovery Maturity": 4,
    "Calibrated Fluency": 5,
}


def _round(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 3)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _window_id(days: int) -> str:
    start_by_days = {
        30: "2026-04-22",
        60: "2026-03-23",
    }
    return f"{start_by_days.get(days, '2026-03-23')}__2026-05-22"


def _reject_forbidden_fields(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in FORBIDDEN_FIXTURE_KEYS:
                raise ValueError(f"forbidden fixture field: {child_path}")
            _reject_forbidden_fields(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _reject_forbidden_fields(child, f"{path}[{index}]")


def scenario_fixture(name: str) -> dict[str, Any]:
    if name == "healthy":
        return build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=30,
            abandonment_rate=0.03,
            recovery_rate=0.87,
            verification_rate=0.90,
            friction_rate=0.07,
        )
    if name == "sparse":
        return build_fixture(
            workflow_family="manager-review-writer",
            cohort_size=4,
            abandonment_rate=0.0,
            recovery_rate=0.75,
            verification_rate=0.75,
            friction_rate=0.0,
        )
    if name == "regressed":
        workflow = "eng-on-call-triage"
        pre = build_fixture(
            workflow_family=workflow,
            cohort_size=6,
            abandonment_rate=0.0,
            recovery_rate=0.90,
            verification_rate=0.92,
            friction_rate=0.05,
            days=30,
            start_offset_days=30,
            run_prefix="pre",
        )
        post = build_fixture(
            workflow_family=workflow,
            cohort_size=30,
            abandonment_rate=0.25,
            recovery_rate=0.25,
            verification_rate=0.20,
            friction_rate=0.58,
            days=30,
            run_prefix="post",
        )
        return {
            **post,
            "days": 60,
            "parameters": {
                "cohort_size": 24,
                "abandonment_rate": "pre/post",
                "recovery_rate": "pre/post",
                "verification_rate": "pre/post",
                "friction_rate": "pre/post",
            },
            "change_event": {
                "label": "Agent prompt rollout",
                "event_at": "2026-04-22T00:00:00Z",
            },
            "events": pre["events"] + post["events"],
        }
    raise ValueError(f"unknown scenario: {name}")


def ingest_events(fixture: dict[str, Any], *, event_key: str = "events") -> list[dict[str, Any]]:
    if fixture.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"unsupported fixture schema_version: {fixture.get('schema_version')}")
    _reject_forbidden_fields(fixture)

    canonical: list[dict[str, Any]] = []
    window_id = _window_id(int(fixture.get("days", 60)))
    for event in fixture.get(event_key, []):
        if event.get("source_type") != "workflow_run":
            continue
        if event.get("privacy", {}).get("raw_content_included") is not False:
            raise ValueError("dogfood fixtures must not include raw content")
        if event.get("privacy", {}).get("person_level_fields_included") is not False:
            raise ValueError("dogfood fixtures must not include person-level fields")

        signals = event.get("signals", {})
        metadata = {
            "workflow_id": event["workflow_id"],
            "workflow_family": event["workflow_family"],
            "workflow_run_id": event["workflow_run_id"],
        }
        ambiguity_flag = bool(signals.get("ambiguity_present", False))
        base = {
            "schema_version": "FT_V1_2026_01",
            "org_id": "org-dogfood-synthetic",
            "function_id": event["workflow_family"],
            "role_class": "knowledge_worker",
            "tool_surface": "ASSISTANT",
            "event_timestamp": event["event_timestamp"],
            "window_id": window_id,
            "ambiguity_flag": ambiguity_flag,
        }
        if ambiguity_flag:
            base["ambiguity_reason_code"] = signals.get(
                "ambiguity_reason_code", "AMB_EVIDENCE_INSUFFICIENT"
            )
        def record(fields: dict[str, Any]) -> dict[str, Any]:
            return {"metadata": metadata, "v1_event": {**base, **fields}}

        canonical.extend(
            [
                record({
                    "event_name": "FT_V1_DISPOSITION_OBSERVED",
                    "disposition": "ABANDON"
                    if signals.get("abandonment_present")
                    else "ACCEPT",
                }),
                record({
                    "event_name": "FT_V1_ITERATION_DEPTH_OBSERVED",
                    "iteration_depth": "HEAVY"
                    if signals.get("friction_loop_present")
                    else "LIGHT",
                }),
                record({
                    "event_name": "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
                    "verification_present": bool(signals.get("verification_present")),
                }),
                record({
                    "event_name": "FT_V1_RECOVERY_OBSERVED",
                    "recovery_present": bool(signals.get("recovery_present")),
                }),
                *(
                    [
                        record({
                            "event_name": "FT_V1_LATENCY_OBSERVED",
                            "latency_bucket": "SLOWER",
                        })
                    ]
                    if signals.get("friction_loop_present")
                    else []
                ),
                record({
                    "event_name": "FT_V1_ABANDONMENT_OBSERVED",
                    "abandonment_present": bool(signals.get("abandonment_present")),
                }),
            ]
        )
    return canonical


def _run_ids(events: list[dict[str, Any]]) -> set[str]:
    return {event["metadata"]["workflow_run_id"] for event in events}


def _v1(event: dict[str, Any]) -> dict[str, Any]:
    return event["v1_event"]


def _rate(events: list[dict[str, Any]], event_name: str, field: str, positive: Any) -> float:
    matching = [event for event in events if _v1(event)["event_name"] == event_name]
    if not matching:
        return 0.0
    count = sum(1 for event in matching if _v1(event).get(field) == positive)
    return _round(count / len(matching))


def _ambiguous_run_rate(events: list[dict[str, Any]]) -> float:
    runs = _run_ids(events)
    if not runs:
        return 0.0
    ambiguous = {
        event["metadata"]["workflow_run_id"]
        for event in events
        if _v1(event).get("ambiguity_flag") is True
    }
    return _round(len(ambiguous) / len(runs))


def active_signal_classes(components: dict[str, float]) -> set[str]:
    classes: set[str] = set()
    if components["abandonment_rate"] > 0:
        classes.add("ABANDONMENT")
    if components["friction_loop_rate"] > 0:
        classes.add("ITERATION")
    if components["recovery_success_rate"] > 0:
        classes.add("RECOVERY")
    if components["verification_presence_rate"] > 0:
        classes.add("VERIFICATION")
    return classes


def reliability_components(events: list[dict[str, Any]]) -> dict[str, float]:
    return {
        "abandonment_rate": _rate(
            events, "FT_V1_ABANDONMENT_OBSERVED", "abandonment_present", True
        ),
        "friction_loop_rate": _rate(
            events, "FT_V1_ITERATION_DEPTH_OBSERVED", "iteration_depth", "HEAVY"
        ),
        "recovery_success_rate": _rate(
            events, "FT_V1_RECOVERY_OBSERVED", "recovery_present", True
        ),
        "verification_presence_rate": _rate(
            events,
            "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
            "verification_present",
            True,
        ),
    }


def compute_reliability_factor(components: dict[str, float]) -> float:
    raw = (
        0.5
        + 0.25 * components["verification_presence_rate"]
        + 0.25 * components["recovery_success_rate"]
        - 0.25 * components["abandonment_rate"]
        - 0.25 * components["friction_loop_rate"]
    )
    return _round(raw)


def compute_quality_multiplier(components: dict[str, float]) -> float:
    raw = (
        1.0
        + 0.30 * components["verification_presence_rate"]
        + 0.25 * components["recovery_success_rate"]
        - 0.35 * components["abandonment_rate"]
        - 0.30 * components["friction_loop_rate"]
    )
    return round(_clamp(raw, 0.5, 1.5), 3)


def derive_aivm(events: list[dict[str, Any]], cohort_size: int, window_days: int) -> dict[str, str]:
    latency_observed = sum(1 for event in events if _v1(event)["event_name"] == "FT_V1_LATENCY_OBSERVED")
    low_abandonment = sum(
        1
        for event in events
        if _v1(event)["event_name"] == "FT_V1_ABANDONMENT_OBSERVED"
        and _v1(event).get("abandonment_present") is False
    )
    abandonment = sum(
        1
        for event in events
        if _v1(event)["event_name"] == "FT_V1_ABANDONMENT_OBSERVED"
        and _v1(event).get("abandonment_present") is True
    )
    verification = sum(
        1
        for event in events
        if _v1(event)["event_name"] == "FT_V1_VERIFICATION_PRESENCE_OBSERVED"
        and _v1(event).get("verification_present") is True
    )
    recovery = sum(
        1
        for event in events
        if _v1(event)["event_name"] == "FT_V1_RECOVERY_OBSERVED"
        and _v1(event).get("recovery_present") is True
    )

    acceleration_score = latency_observed + low_abandonment
    quality_score = verification + recovery
    value_type = "UNCLASSIFIED"
    if latency_observed and low_abandonment > abandonment and acceleration_score > quality_score:
        value_type = "ACCELERATION"
    elif verification and recovery and quality_score > acceleration_score:
        value_type = "QUALITY_PREMIUM"

    return {
        "value_type": value_type,
        "evidence_grade": "OBJECTIVE"
        if cohort_size >= 30 and window_days >= 90
        else "QUALITATIVE",
    }


def classify_pattern(components: dict[str, float]) -> str:
    if components["abandonment_rate"] >= 0.35:
        return "Undertrust Avoidance"
    if components["friction_loop_rate"] >= 0.40:
        return "Friction Loop"
    if (
        components["verification_presence_rate"] >= 0.70
        and components["recovery_success_rate"] >= 0.60
        and components["abandonment_rate"] <= 0.15
    ):
        return "Calibrated Fluency"
    if components["verification_presence_rate"] < 0.30 and components["abandonment_rate"] <= 0.20:
        return "Blind Efficiency"
    if components["recovery_success_rate"] >= 0.60:
        return "Recovery Maturity"
    return "Undertrust Avoidance"


def _suppressed_verdict(
    *,
    reason: str,
    cohort_size: int,
    evidence_grade: str,
) -> dict[str, Any]:
    return {
        "verdict": "SUPPRESS",
        "suppression_reason": reason,
        "cohort_size": cohort_size,
        "aivm": {
            "value_type": "UNCLASSIFIED",
            "evidence_grade": evidence_grade,
        },
        "reliability_factor": None,
        "reliability_components": None,
        "quality_multiplier": None,
        "pattern": None,
    }


def compute_verdict(
    events: list[dict[str, Any]],
    *,
    window_days: int = 60,
    baseline_events: list[dict[str, Any]] | None = None,
    baseline_window_days: int | None = None,
) -> dict[str, Any]:
    cohort_size = len(_run_ids(events))
    aivm = derive_aivm(events, cohort_size, window_days)

    if _ambiguous_run_rate(events) > AMBIGUITY_RATE_THRESHOLD:
        return _suppressed_verdict(
            reason="HIGH_AMBIGUITY",
            cohort_size=cohort_size,
            evidence_grade=aivm["evidence_grade"],
        )

    if window_days < MIN_WINDOW_DAYS:
        return _suppressed_verdict(
            reason="INSUFFICIENT_TIME",
            cohort_size=cohort_size,
            evidence_grade=aivm["evidence_grade"],
        )

    if cohort_size < MIN_COHORT_SIZE:
        return _suppressed_verdict(
            reason="INSUFFICIENT_VOLUME",
            cohort_size=cohort_size,
            evidence_grade=aivm["evidence_grade"],
        )

    components = reliability_components(events)
    signal_classes = active_signal_classes(components)
    if len(signal_classes) < MIN_CONVERGENT_SIGNAL_CLASSES:
        return _suppressed_verdict(
            reason="NO_CONVERGENCE",
            cohort_size=cohort_size,
            evidence_grade=aivm["evidence_grade"],
        )

    if baseline_events is not None:
        baseline_verdict = compute_verdict(
            baseline_events,
            window_days=baseline_window_days if baseline_window_days is not None else 0,
        )
        if baseline_verdict["verdict"] == "SUPPRESS":
            return _suppressed_verdict(
                reason=baseline_verdict["suppression_reason"],
                cohort_size=cohort_size,
                evidence_grade=aivm["evidence_grade"],
            )
        baseline_components = reliability_components(baseline_events)
        baseline_signal_classes = active_signal_classes(baseline_components)
        if signal_classes != baseline_signal_classes:
            return _suppressed_verdict(
                reason="BASELINE_UNSTABLE",
                cohort_size=cohort_size,
                evidence_grade=aivm["evidence_grade"],
            )

    return {
        "verdict": "SURFACE",
        "suppression_reason": None,
        "cohort_size": cohort_size,
        "aivm": aivm,
        "reliability_factor": compute_reliability_factor(components),
        "reliability_components": components,
        "quality_multiplier": compute_quality_multiplier(components),
        "pattern": classify_pattern(components),
    }


def compute_causal_delta(fixture: dict[str, Any], canonical_events: list[dict[str, Any]]) -> dict[str, Any] | None:
    change_event = fixture.get("change_event")
    if not change_event:
        return None

    change_at = _parse_timestamp(change_event["event_at"])
    pre_window_days = int(change_event.get("pre_window_days", 30))
    post_window_days = int(change_event.get("post_window_days", 30))
    if pre_window_days < MIN_CAUSAL_WINDOW_DAYS or post_window_days < MIN_CAUSAL_WINDOW_DAYS:
        return {
            "verdict": "SUPPRESS",
            "shift": "INDETERMINATE",
            "pre_pattern": None,
            "post_pattern": None,
        }
    pre_start = change_at - timedelta(days=pre_window_days)
    post_end = change_at + timedelta(days=post_window_days)
    pre_events = [
        event
        for event in canonical_events
        if pre_start <= _parse_timestamp(_v1(event)["event_timestamp"]) < change_at
    ]
    post_events = [
        event
        for event in canonical_events
        if change_at <= _parse_timestamp(_v1(event)["event_timestamp"]) < post_end
    ]
    pre = compute_verdict(pre_events, window_days=60)
    post = compute_verdict(post_events, window_days=60)

    if pre["verdict"] == "SUPPRESS" or post["verdict"] == "SUPPRESS":
        return {
            "verdict": "SUPPRESS",
            "shift": "INDETERMINATE",
            "pre_pattern": pre["pattern"],
            "post_pattern": post["pattern"],
        }

    pre_pattern = pre["pattern"]
    post_pattern = post["pattern"]
    if PATTERN_RANK[post_pattern] > PATTERN_RANK[pre_pattern]:
        shift = "IMPROVED"
    elif PATTERN_RANK[post_pattern] < PATTERN_RANK[pre_pattern]:
        shift = "REGRESSED"
    else:
        shift = "HELD"

    return {
        "verdict": "SURFACE",
        "shift": shift,
        "pre_pattern": pre_pattern,
        "post_pattern": post_pattern,
    }


def run_fixture(fixture: dict[str, Any], *, scenario: str | None = None) -> dict[str, Any]:
    canonical_events = ingest_events(fixture)
    baseline_events = (
        ingest_events(fixture, event_key="baseline_events")
        if "baseline_events" in fixture
        else None
    )
    baseline_window_days = fixture.get("baseline_days")
    if baseline_events is not None and baseline_window_days is None:
        baseline_window_days = 0
    verdict = compute_verdict(
        canonical_events,
        window_days=int(fixture.get("days", 60)),
        baseline_events=baseline_events,
        baseline_window_days=int(baseline_window_days)
        if baseline_window_days is not None
        else None,
    )
    return {
        "scenario": scenario,
        "workflow_family": fixture["workflow_family"],
        **{key: value for key, value in verdict.items() if key != "pattern"},
        "causal_delta": compute_causal_delta(fixture, canonical_events),
        "canonical_event_count": len(canonical_events),
        "canonical_event_sample": canonical_events[0]["v1_event"] if canonical_events else None,
    }


def one_page(readout: dict[str, Any]) -> str:
    lines = [
        "# FluencyTracr Glean Dogfood Readout",
        "",
        f"Workflow family: {readout['workflow_family']}",
        f"Scenario: {readout.get('scenario') or 'fixture'}",
        f"Verdict: {readout['verdict']}",
        f"Suppression reason: {readout['suppression_reason'] or 'none'}",
        f"AIVM: value_type={readout['aivm']['value_type']} evidence_grade={readout['aivm']['evidence_grade']}",
        f"Reliability factor: {readout['reliability_factor']}",
        f"Reliability components: {json.dumps(readout['reliability_components'], sort_keys=True)}",
        f"Quality multiplier: {readout['quality_multiplier']}",
        f"Causal delta: {json.dumps(readout['causal_delta'], sort_keys=True)}",
        f"Canonical events ingested: {readout['canonical_event_count']}",
    ]
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--scenario", choices=("healthy", "regressed", "sparse"))
    source.add_argument("--fixture", type=Path)
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.scenario:
            fixture = scenario_fixture(args.scenario)
            scenario = args.scenario
        else:
            fixture = json.loads(args.fixture.read_text())
            scenario = None

        readout = run_fixture(fixture, scenario=scenario)
        if args.json:
            print(json.dumps(readout, sort_keys=True))
        else:
            print(one_page(readout), end="")
        return 0
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
