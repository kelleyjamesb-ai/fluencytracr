from fluencytracr_inference.ai_fluency_measurement_manifest import (
    BEHAVIOR_EVIDENCE_KEYS,
    CONSTRUCT_IDS,
    CORE_CONSTRUCT_IDS,
    LONG_FORM_ID,
    SHORT_FORM_ID,
    load_measurement_manifest,
    manifest_construct_items,
    manifest_item_ids,
    manifest_item_to_construct,
    manifest_pair_ids,
    measurement_manifest_hash,
)


def test_frozen_long_form_has_exact_measurement_structure():
    manifest = load_measurement_manifest()

    assert manifest["form_id"] == LONG_FORM_ID == "ai_fluency_long_v1"
    assert manifest["item_count"] == 24
    assert len(manifest_item_ids()) == 24
    assert len(set(manifest_item_ids())) == 24
    assert len(manifest_pair_ids()) == 276
    assert tuple(manifest_construct_items()) == CONSTRUCT_IDS
    assert all(len(items) == 3 for items in manifest_construct_items().values())
    assert tuple(
        manifest["measurement_structure"]["second_order_indicator_construct_ids"]
    ) == CORE_CONSTRUCT_IDS
    assert manifest["response_scale"]["values"] == [1, 2, 3, 4, 5]
    assert manifest["response_scale"]["reverse_coded_item_ids"] == []
    assert manifest["measurement_structure"]["structural_paths_in_calibration_scope"] is False


def test_manifest_matches_frozen_source_items_and_hash():
    manifest = load_measurement_manifest()

    assert manifest["items"][0] == {
        "item_id": "ai-fluency-q01",
        "item_index": 1,
        "construct_id": "confidence",
        "prompt": "I feel confident using AI tools to support my day-to-day work.",
    }
    assert manifest["items"][-1] == {
        "item_id": "ai-fluency-q24",
        "item_index": 24,
        "construct_id": "perceived_ai_impact",
        "prompt": "AI is increasing my effectiveness in ways that matter.",
    }
    assert measurement_manifest_hash() == (
        "1b1523baab5bd3007e0c42e732da8d71cf67594074a54d17bb4b741292565434"
    )
    assert manifest["source_lineage"]["candidate_artifact_sha256"] == (
        "268edeec251d253fbcc96bcf03a750ab6c31e236c914ae99095193ca3748e1fd"
    )


def test_short_form_and_behavior_evidence_remain_outside_calibration():
    manifest = load_measurement_manifest()
    short = manifest["short_form_policy"]
    behavior = manifest["behavior_evidence_policy"]

    assert short["form_id"] == SHORT_FORM_ID
    assert short["role"] == "pulse_only"
    assert short["equated_to_long_form"] is False
    assert short["eligible_for_longitudinal_change_calibration"] is False
    assert tuple(behavior["item_keys"]) == BEHAVIOR_EVIDENCE_KEYS
    assert behavior["loads_on_ai_fluency"] is False
    assert behavior["changes_measurement_eligibility"] is False
    assert behavior["changes_outcome_estimates"] is False
    assert behavior["can_rescue_hold"] is False


def test_item_to_construct_map_is_complete_and_stable():
    item_to_construct = manifest_item_to_construct()

    assert tuple(item_to_construct) == manifest_item_ids()
    for construct_id, item_ids in manifest_construct_items().items():
        assert all(item_to_construct[item_id] == construct_id for item_id in item_ids)


def test_manifest_loader_returns_defensive_copies():
    first = load_measurement_manifest()
    first["items"][0]["prompt"] = "mutated"

    assert load_measurement_manifest()["items"][0]["prompt"] != "mutated"
    assert measurement_manifest_hash() == (
        "1b1523baab5bd3007e0c42e732da8d71cf67594074a54d17bb4b741292565434"
    )
