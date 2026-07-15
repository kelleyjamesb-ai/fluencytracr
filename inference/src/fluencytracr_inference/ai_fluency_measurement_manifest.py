"""Frozen AI Fluency long-form measurement manifest."""

from __future__ import annotations

import copy
from functools import lru_cache
from importlib import resources
import json

from .hashing import sha256_json


MANIFEST_SCHEMA_VERSION = "FT_AI_FLUENCY_MEASUREMENT_MANIFEST_2026_07_V1"
LONG_FORM_ID = "ai_fluency_long_v1"
SHORT_FORM_ID = "ai_fluency_short_v1"
LONG_FORM_ITEM_COUNT = 24
ORDERED_CATEGORY_VALUES = (1, 2, 3, 4, 5)
CORE_CONSTRUCT_IDS = (
    "confidence",
    "usage_quality",
    "behavior_change",
    "leadership_reinforcement",
    "capability_growth",
)
SEPARATE_CONSTRUCT_IDS = (
    "ai_attitude",
    "behavioral_intent",
    "perceived_ai_impact",
)
CONSTRUCT_IDS = CORE_CONSTRUCT_IDS + SEPARATE_CONSTRUCT_IDS
BEHAVIOR_EVIDENCE_KEYS = (
    "real_work_task",
    "first_draft_with_ai",
    "improved_ai_output",
    "summarized_insights_using_ai",
    "decision_support",
    "repeatable_ai_workflow",
)


class MeasurementManifestError(ValueError):
    """The committed instrument manifest is malformed or has drifted."""


def _require_exact_keys(value: dict, expected: set[str], *, name: str) -> None:
    actual = set(value)
    if actual != expected:
        missing = sorted(expected - actual)
        unknown = sorted(actual - expected)
        raise MeasurementManifestError(
            f"{name} keys do not match manifest schema; missing={missing}, unknown={unknown}"
        )


def _validate_manifest(manifest: dict) -> None:
    _require_exact_keys(
        manifest,
        {
            "schema_version",
            "conceptual_model_version",
            "form_id",
            "form_role",
            "item_count",
            "measurement_structure",
            "response_scale",
            "constructs",
            "items",
            "formal_wave_policy",
            "short_form_policy",
            "behavior_evidence_policy",
            "source_lineage",
        },
        name="manifest",
    )
    if manifest["schema_version"] != MANIFEST_SCHEMA_VERSION:
        raise MeasurementManifestError("unexpected measurement manifest schema version")
    if manifest["form_id"] != LONG_FORM_ID or manifest["item_count"] != LONG_FORM_ITEM_COUNT:
        raise MeasurementManifestError("manifest must describe the exact 24-item long form")
    if manifest["conceptual_model_version"] != "AI Fluency Flywheel v2.3":
        raise MeasurementManifestError("conceptual model version has drifted")
    if manifest["form_role"] != "baseline_and_formal_followup":
        raise MeasurementManifestError("long form role has drifted")

    scale = manifest["response_scale"]
    _require_exact_keys(
        scale,
        {"kind", "values", "anchors", "reverse_coded_item_ids"},
        name="response_scale",
    )
    if scale["kind"] != "ordered_likert":
        raise MeasurementManifestError("measurement scale must be ordered Likert")
    if tuple(scale["values"]) != ORDERED_CATEGORY_VALUES or len(scale["anchors"]) != 5:
        raise MeasurementManifestError("measurement scale must contain the frozen five anchors")
    if scale["reverse_coded_item_ids"] != []:
        raise MeasurementManifestError("the frozen long form has no reverse-coded items")

    constructs = manifest["constructs"]
    if not isinstance(constructs, list) or len(constructs) != len(CONSTRUCT_IDS):
        raise MeasurementManifestError("manifest must contain exactly eight constructs")
    construct_map: dict[str, tuple[str, ...]] = {}
    for index, construct in enumerate(constructs):
        _require_exact_keys(
            construct,
            {"construct_id", "role", "item_ids"},
            name=f"construct[{index}]",
        )
        construct_id = construct["construct_id"]
        if construct_id != CONSTRUCT_IDS[index]:
            raise MeasurementManifestError("construct order or identity has drifted")
        expected_role = "core_first_order" if construct_id in CORE_CONSTRUCT_IDS else "separate_first_order"
        if construct["role"] != expected_role:
            raise MeasurementManifestError(f"unexpected role for {construct_id}")
        item_ids = tuple(construct["item_ids"])
        if len(item_ids) != 3 or len(set(item_ids)) != 3:
            raise MeasurementManifestError(f"{construct_id} must contain three unique items")
        construct_map[construct_id] = item_ids

    items = manifest["items"]
    if not isinstance(items, list) or len(items) != LONG_FORM_ITEM_COUNT:
        raise MeasurementManifestError("manifest must contain exactly 24 items")
    seen_ids: set[str] = set()
    for offset, item in enumerate(items, start=1):
        _require_exact_keys(
            item,
            {"item_id", "item_index", "construct_id", "prompt"},
            name=f"item[{offset}]",
        )
        expected_id = f"ai-fluency-q{offset:02d}"
        if item["item_id"] != expected_id or item["item_index"] != offset:
            raise MeasurementManifestError("item identity or ordering has drifted")
        if item["item_id"] in seen_ids:
            raise MeasurementManifestError("duplicate item id in manifest")
        if item["item_id"] not in construct_map.get(item["construct_id"], ()):
            raise MeasurementManifestError("item-to-construct map is inconsistent")
        if not isinstance(item["prompt"], str) or not item["prompt"].strip():
            raise MeasurementManifestError("item prompts must be nonempty")
        seen_ids.add(item["item_id"])

    structure = manifest["measurement_structure"]
    _require_exact_keys(
        structure,
        {
            "first_order_construct_count",
            "items_per_first_order_construct",
            "second_order_factor_id",
            "second_order_indicator_construct_ids",
            "separate_construct_ids",
            "structural_paths_in_calibration_scope",
        },
        name="measurement_structure",
    )
    if (
        structure["first_order_construct_count"] != 8
        or structure["items_per_first_order_construct"] != 3
        or structure["second_order_factor_id"] != "ai_fluency"
    ):
        raise MeasurementManifestError("measurement structure counts have drifted")
    if tuple(structure["second_order_indicator_construct_ids"]) != CORE_CONSTRUCT_IDS:
        raise MeasurementManifestError("second-order Fluency construct map has drifted")
    if tuple(structure["separate_construct_ids"]) != SEPARATE_CONSTRUCT_IDS:
        raise MeasurementManifestError("separate construct map has drifted")
    if structure["structural_paths_in_calibration_scope"] is not False:
        raise MeasurementManifestError("structural paths are outside calibration scope")

    short_policy = manifest["short_form_policy"]
    _require_exact_keys(
        short_policy,
        {
            "form_id",
            "item_count",
            "role",
            "equated_to_long_form",
            "eligible_for_longitudinal_change_calibration",
        },
        name="short_form_policy",
    )
    if (
        short_policy["form_id"] != SHORT_FORM_ID
        or short_policy["item_count"] != 14
        or short_policy["role"] != "pulse_only"
        or short_policy["equated_to_long_form"] is not False
        or short_policy["eligible_for_longitudinal_change_calibration"] is not False
    ):
        raise MeasurementManifestError("short form must remain unequated and pulse-only")

    behavior_policy = manifest["behavior_evidence_policy"]
    _require_exact_keys(
        behavior_policy,
        {
            "item_keys",
            "role",
            "loads_on_ai_fluency",
            "changes_measurement_eligibility",
            "changes_outcome_estimates",
            "can_rescue_hold",
        },
        name="behavior_evidence_policy",
    )
    if tuple(behavior_policy["item_keys"]) != BEHAVIOR_EVIDENCE_KEYS:
        raise MeasurementManifestError("behavior evidence keys have drifted")
    for field in (
        "loads_on_ai_fluency",
        "changes_measurement_eligibility",
        "changes_outcome_estimates",
        "can_rescue_hold",
    ):
        if behavior_policy[field] is not False:
            raise MeasurementManifestError("behavior evidence must remain outside measurement")

    wave_policy = manifest["formal_wave_policy"]
    _require_exact_keys(
        wave_policy,
        {
            "baseline_form_id",
            "followup_form_id",
            "three_month_and_six_month_are_distinct_waves",
            "person_level_linkage_allowed",
            "analysis_design",
        },
        name="formal_wave_policy",
    )
    if (
        wave_policy["baseline_form_id"] != LONG_FORM_ID
        or wave_policy["followup_form_id"] != LONG_FORM_ID
        or wave_policy["three_month_and_six_month_are_distinct_waves"] is not True
        or wave_policy["person_level_linkage_allowed"] is not False
        or wave_policy["analysis_design"]
        != "independent_repeated_cross_sectional_aggregate"
    ):
        raise MeasurementManifestError("formal wave policy has drifted")

    source_lineage = manifest["source_lineage"]
    _require_exact_keys(
        source_lineage,
        {
            "candidate_artifact_name",
            "candidate_artifact_sha256",
            "canonical_repo_artifact",
            "measurement_configuration_match_reviewed",
        },
        name="source_lineage",
    )
    if (
        source_lineage["candidate_artifact_name"] != "ai-fluency-24-item.html"
        or source_lineage["candidate_artifact_sha256"]
        != "268edeec251d253fbcc96bcf03a750ab6c31e236c914ae99095193ca3748e1fd"
        or source_lineage["canonical_repo_artifact"]
        != "frontend/public/ai-fluency/assessment-24-item.html"
        or source_lineage["measurement_configuration_match_reviewed"] is not True
    ):
        raise MeasurementManifestError("source lineage has drifted")


@lru_cache(maxsize=1)
def _load_measurement_manifest_cached() -> dict:
    """Load and validate the committed canonical manifest once."""

    try:
        manifest = json.loads(
            resources.files(__package__)
            .joinpath("ai_fluency_long_v1_manifest.json")
            .read_text(encoding="utf-8")
        )
    except (OSError, json.JSONDecodeError) as exc:
        raise MeasurementManifestError("unable to load measurement manifest") from exc
    if not isinstance(manifest, dict):
        raise MeasurementManifestError("measurement manifest must be a JSON object")
    _validate_manifest(manifest)
    return manifest


def load_measurement_manifest() -> dict:
    """Return a defensive copy of the frozen committed manifest."""

    return copy.deepcopy(_load_measurement_manifest_cached())


def measurement_manifest_hash() -> str:
    return sha256_json(_load_measurement_manifest_cached())


def manifest_item_ids() -> tuple[str, ...]:
    return tuple(item["item_id"] for item in load_measurement_manifest()["items"])


def manifest_item_to_construct() -> dict[str, str]:
    return {
        item["item_id"]: item["construct_id"]
        for item in load_measurement_manifest()["items"]
    }


def manifest_construct_items() -> dict[str, tuple[str, ...]]:
    return {
        construct["construct_id"]: tuple(construct["item_ids"])
        for construct in load_measurement_manifest()["constructs"]
    }


def manifest_pair_ids() -> tuple[tuple[str, str], ...]:
    item_ids = manifest_item_ids()
    return tuple(
        (item_ids[left], item_ids[right])
        for left in range(len(item_ids))
        for right in range(left + 1, len(item_ids))
    )
