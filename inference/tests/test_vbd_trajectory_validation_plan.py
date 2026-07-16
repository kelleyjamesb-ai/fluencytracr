from copy import deepcopy
from dataclasses import fields

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_validation_plan import (
    VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT,
    VBD_TRAJECTORY_VALIDATION_DRIFT_COUNT,
    VBD_TRAJECTORY_VALIDATION_EFFECT_ORDER,
    VBD_TRAJECTORY_VALIDATION_FAMILY_ORDER,
    VBD_TRAJECTORY_VALIDATION_FLOOR_COUNT,
    VBD_TRAJECTORY_VALIDATION_GROUP_ORDER,
    VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_COUNT,
    VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER,
    VBD_TRAJECTORY_VALIDATION_PRIMARY_COUNT,
    VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT,
    VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK,
    VBD_TRAJECTORY_VALIDATION_TARGETED_COUNT,
    VbdTrajectoryValidationSlot,
    combine_vbd_trajectory_validation_chunks,
    immutable_vbd_trajectory_validation_plan,
    required_vbd_trajectory_canaries,
    required_vbd_trajectory_validation_chunks,
    required_vbd_trajectory_validation_slots,
    vbd_trajectory_canary_from_dict,
    vbd_trajectory_validation_chunk_from_dict,
    vbd_trajectory_validation_plan_from_dict,
    vbd_trajectory_validation_slot_constructor_fields,
    vbd_trajectory_validation_slot_from_dict,
)


def test_plan_has_exact_ordered_two_thousand_case_universe():
    slots = required_vbd_trajectory_validation_slots()
    assert len(slots) == VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT == 2_000
    counts = {
        family: sum(slot.family == family for slot in slots)
        for family in VBD_TRAJECTORY_VALIDATION_FAMILY_ORDER
    }
    assert counts == {
        "primary": VBD_TRAJECTORY_VALIDATION_PRIMARY_COUNT,
        "targeted": VBD_TRAJECTORY_VALIDATION_TARGETED_COUNT,
        "drift": VBD_TRAJECTORY_VALIDATION_DRIFT_COUNT,
        "floor": VBD_TRAJECTORY_VALIDATION_FLOOR_COUNT,
        "negative_control": VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_COUNT,
    }
    assert counts == {
        "primary": 1_200,
        "targeted": 360,
        "drift": 360,
        "floor": 12,
        "negative_control": 68,
    }
    assert slots[0].slot_id == "primary/effect=0/groups=6/replication=0"
    assert slots[1_199].slot_id == (
        "primary/effect=0.5/groups=12/replication=199"
    )
    assert slots[1_200].slot_id == (
        "targeted/frequency_only/groups=6/replication=0"
    )
    assert slots[-1].slot_id == (
        "negative_control/non_psd_covariance/groups=12/replication=0"
    )
    assert len({slot.slot_id for slot in slots}) == 2_000
    assert len({slot.seed for slot in slots}) == 2_000


def test_seed_formulas_match_every_family_boundary():
    slots = required_vbd_trajectory_validation_slots()
    by_id = {slot.slot_id: slot for slot in slots}
    assert by_id["primary/effect=0/groups=6/replication=0"].seed == 2_056_100_000
    assert (
        by_id["primary/effect=0.5/groups=12/replication=199"].seed
        == 2_056_105_199
    )
    assert (
        by_id["targeted/frequency_only/groups=6/replication=0"].seed
        == 2_056_200_000
    )
    assert (
        by_id["targeted/temporary_pulse/groups=12/replication=29"].seed
        == 2_056_205_129
    )
    assert (
        by_id["drift/quantile_algorithm_drift/groups=6/replication=0"].seed
        == 2_056_250_000
    )
    assert (
        by_id["drift/understated_uncertainty/groups=12/replication=29"].seed
        == 2_056_255_129
    )
    assert by_id["floor/k=4/groups=6/replication=0"].seed == 2_056_300_000
    assert by_id["floor/k=16/groups=12/replication=0"].seed == 2_056_300_051
    assert (
        by_id[
            "negative_control/common_availability_shock/groups=6/replication=0"
        ].seed
        == 2_056_400_000
    )
    assert (
        by_id[
            "negative_control/non_psd_covariance/groups=12/replication=0"
        ].seed
        == 2_056_400_331
    )


def test_primary_cell_order_and_semantics_are_frozen():
    slots = [
        slot
        for slot in required_vbd_trajectory_validation_slots()
        if slot.family == "primary"
    ]
    observed_cells = []
    for slot in slots:
        cell = (slot.scenario_or_control_id, slot.panel_group_count)
        if not observed_cells or observed_cells[-1] != cell:
            observed_cells.append(cell)
    expected_cells = [
        (("effect=0" if effect == 0 else f"effect={effect}"), groups)
        for effect in VBD_TRAJECTORY_VALIDATION_EFFECT_ORDER
        for groups in VBD_TRAJECTORY_VALIDATION_GROUP_ORDER
    ]
    assert observed_cells == expected_cells
    assert all(slot.k == 16 for slot in slots)
    assert all(slot.fit_expected is True for slot in slots)


def test_four_canaries_are_ordered_and_outside_denominators():
    canaries = required_vbd_trajectory_canaries()
    assert [canary.slot.slot_id for canary in canaries] == [
        "primary/effect=0/groups=6/replication=0",
        "primary/effect=0.5/groups=12/replication=199",
        "targeted/composition_rotation/groups=6/replication=0",
        "targeted/correlated_null/groups=12/replication=29",
    ]
    for canary in canaries:
        assert canary.outside_study_denominators is True
        assert canary.seed_reuse_only_for_same_slot is True
        assert canary.aggregate_gate_computed is False
        assert canary.substitutes_for_study_slot is False
        assert canary.execution_authorized is False
        assert vbd_trajectory_canary_from_dict(canary.to_dict()) == canary


def test_forty_chunks_are_a_canonical_bijection():
    chunks = required_vbd_trajectory_validation_chunks()
    assert len(chunks) == VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT == 40
    assert all(
        len(chunk.slot_ids) == VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK == 50
        for chunk in chunks
    )
    restored = combine_vbd_trajectory_validation_chunks(chunks)
    assert restored == required_vbd_trajectory_validation_slots()
    assert len({slot_id for chunk in chunks for slot_id in chunk.slot_ids}) == 2_000
    for chunk in chunks:
        assert vbd_trajectory_validation_chunk_from_dict(chunk.to_dict()) == chunk


def test_plan_round_trips_only_as_exact_compiled_bytes():
    plan = immutable_vbd_trajectory_validation_plan()
    encoded = plan.to_dict()
    assert vbd_trajectory_validation_plan_from_dict(encoded) == plan
    assert encoded["execution_state"] == "NOT_RUN"
    assert encoded["required_slot_count"] == 2_000
    gates = encoded["compiled_gate_and_mutation_contract"]
    assert gates["primary_coverage_rate_band"] == [0.74, 0.86]
    assert gates["familywise_null_rate_max"] == 0.05
    assert gates["ceiling_mutations"]["engagement_ceiling"] == [59, 60, 60, 60]
    assert gates["covariance_mutations"]["non_psd_correlation"] == [
        [1.0, 0.9, 0.9],
        [0.9, 1.0, -0.9],
        [0.9, -0.9, 1.0],
    ]
    assert encoded["plan_hash"] == sha256_json(plan.body_without_hash())
    assert all(
        value is False
        for key, value in encoded.items()
        if key.endswith("_runtime_configurable") or key.endswith("_authorized")
    )


@pytest.mark.parametrize(
    "mutation",
    [
        lambda value: value.update({"extension": False}),
        lambda value: value.pop("chunks"),
        lambda value: value["family_counts"].update({"primary": 1_199}),
        lambda value: value["slots"].reverse(),
        lambda value: value["slots"][0].update({"seed": 2_056_100_001}),
        lambda value: value["canaries"][0].update(
            {"outside_study_denominators": False}
        ),
        lambda value: value.update({"fit_execution_authorized": True}),
        lambda value: value["compiled_gate_and_mutation_contract"].update(
            {"familywise_null_rate_max": 0.06}
        ),
    ],
)
def test_coordinated_plan_rehash_cannot_change_compiled_semantics(mutation):
    value = deepcopy(immutable_vbd_trajectory_validation_plan().to_dict())
    mutation(value)
    for slot in value.get("slots", []):
        body = {key: child for key, child in slot.items() if key != "slot_hash"}
        slot["slot_hash"] = sha256_json(body)
    value["slot_bodies_hash"] = sha256_json(
        [
            {key: child for key, child in slot.items() if key != "slot_hash"}
            for slot in value.get("slots", [])
        ]
    )
    body = {key: child for key, child in value.items() if key != "plan_hash"}
    value["plan_hash"] = sha256_json(body)
    with pytest.raises(ValueError):
        vbd_trajectory_validation_plan_from_dict(value)


def test_slot_parsing_rejects_bool_integer_unknown_and_omitted_fields():
    source = required_vbd_trajectory_validation_slots()[0].to_dict()
    for mutate in (
        lambda value: value.update({"seed": True}),
        lambda value: value.update({"extension": False}),
        lambda value: value.pop("truth_vector"),
        lambda value: value.update({"truth_vector": [0, 0.0, 0.0]}),
    ):
        value = deepcopy(source)
        mutate(value)
        with pytest.raises(ValueError):
            vbd_trajectory_validation_slot_from_dict(value)


def test_slot_constructor_has_no_defaults_or_hidden_plan_fields():
    constructor_fields = fields(VbdTrajectoryValidationSlot)
    assert vbd_trajectory_validation_slot_constructor_fields() == tuple(
        field.name for field in constructor_fields
    )
    assert all(field.default is field.default_factory for field in constructor_fields)
    with pytest.raises(TypeError):
        VbdTrajectoryValidationSlot()  # type: ignore[call-arg]


def test_plan_contains_no_source_bootstrap_or_person_level_material():
    encoded = repr(immutable_vbd_trajectory_validation_plan().to_dict()).lower()
    for forbidden in (
        "respondent",
        "user_id",
        "member_slot",
        "bootstrap_seed",
        "raw_rows",
        "posterior_draws",
        "latent_paths",
    ):
        assert forbidden not in encoded
    assert tuple(VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER) == tuple(
        slot.scenario_or_control_id
        for slot in required_vbd_trajectory_validation_slots()
        if slot.family == "negative_control" and slot.panel_group_count == 6
    )
