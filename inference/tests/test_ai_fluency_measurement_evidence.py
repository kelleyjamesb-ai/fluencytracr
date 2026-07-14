from dataclasses import replace

import pytest

from fluencytracr_inference.ai_fluency_measurement_evidence import (
    AGGREGATE_OBSERVED_COUNT_FLOOR,
    AggregateMeasurementPackage,
    MeasurementEvidenceError,
    blocked_output_authorizations,
    measurement_package_from_dict,
    validate_measurement_package,
)
from fluencytracr_inference.ai_fluency_measurement_manifest import SHORT_FORM_ID
from fluencytracr_inference.ai_fluency_measurement_synthetic import (
    generate_measurement_synthetic_case,
)


@pytest.fixture(scope="module")
def measurement_package():
    return generate_measurement_synthetic_case(
        seed=2026071401, scenario="invariant", sample_size=40
    ).package


def test_complete_aggregate_package_round_trips_with_hashes(measurement_package):
    payload = measurement_package.to_dict()
    parsed = measurement_package_from_dict(payload)

    assert parsed == measurement_package
    assert parsed.package_hash() == payload["package_hash"]
    assert len(parsed.waves) == 2
    assert all(len(wave.items) == 24 for wave in parsed.waves)
    assert all(len(wave.pairs) == 276 for wave in parsed.waves)
    assert all(len(pair.cell_counts) == 5 for wave in parsed.waves for pair in wave.pairs)
    assert all(
        len(row) == 5
        for wave in parsed.waves
        for pair in wave.pairs
        for row in pair.cell_counts
    )


@pytest.mark.parametrize(
    "unsafe_field",
    [
        "respondentId",
        "employee_id",
        "email",
        "raw_answers",
        "usage_behavior_json",
        "real_work_task",
        "item_title",
        "profile",
    ],
)
def test_parser_rejects_person_behavior_and_raw_fields(measurement_package, unsafe_field):
    payload = measurement_package.to_dict()
    payload[unsafe_field] = "not-allowed"

    with pytest.raises(MeasurementEvidenceError, match="unsafe|behavior"):
        measurement_package_from_dict(payload)


@pytest.mark.parametrize(
    "identifier",
    ("person@example.com", "123-45-6789", "212-555-0199"),
)
def test_parser_rejects_identifier_values_even_under_known_fields(
    measurement_package, identifier
):
    payload = measurement_package.to_dict()
    payload["package_id"] = identifier

    with pytest.raises(MeasurementEvidenceError, match="direct identifier|safe non-personal"):
        measurement_package_from_dict(payload)


@pytest.mark.parametrize("field", ("package_id", "cohort_key"))
def test_free_form_human_names_cannot_be_rehashed_as_synthetic_identity(
    measurement_package, field
):
    candidate = replace(measurement_package, **{field: "james-kelley"})

    with pytest.raises(MeasurementEvidenceError, match="synthetic identity"):
        validate_measurement_package(candidate)


def test_free_form_wave_identity_cannot_pass_synthetic_validation(measurement_package):
    wave = replace(measurement_package.waves[0], wave_id="james-kelley")

    with pytest.raises(MeasurementEvidenceError, match="synthetic identity"):
        validate_measurement_package(
            replace(measurement_package, waves=(wave, measurement_package.waves[1]))
        )


def test_declared_safe_flags_cannot_mask_non_synthetic_source(measurement_package):
    wave = replace(
        measurement_package.waves[0],
        source_ref="production://customer-live-export",
    )

    with pytest.raises(MeasurementEvidenceError, match="synthetic generator"):
        validate_measurement_package(
            replace(measurement_package, waves=(wave, measurement_package.waves[1]))
        )


def test_compact_iso_dates_reject_before_lexical_wave_ordering(measurement_package):
    compact_baseline = replace(
        measurement_package.waves[0], window_end="20261231"
    )
    compact_followup = replace(
        measurement_package.waves[1], window_start="20261201"
    )

    with pytest.raises(MeasurementEvidenceError, match="canonical ISO date"):
        validate_measurement_package(
            replace(
                measurement_package,
                waves=(compact_baseline, compact_followup),
            )
        )


def test_canonical_wave_dates_are_compared_as_dates(measurement_package):
    overlapping_baseline = replace(
        measurement_package.waves[0], window_end="2026-04-15"
    )

    with pytest.raises(MeasurementEvidenceError, match="ordered and non-overlapping"):
        validate_measurement_package(
            replace(
                measurement_package,
                waves=(overlapping_baseline, measurement_package.waves[1]),
            )
        )


def test_invalid_hash_rejects(measurement_package):
    payload = measurement_package.to_dict()
    payload["waves"][0]["items"][0]["category_counts"][0] += 1

    with pytest.raises(MeasurementEvidenceError, match="reconcile|hash"):
        measurement_package_from_dict(payload)


def test_missing_item_pair_and_duplicate_pair_reject(measurement_package):
    missing_item = replace(
        measurement_package.waves[0], items=measurement_package.waves[0].items[:-1]
    )
    missing_pair = replace(
        measurement_package.waves[0], pairs=measurement_package.waves[0].pairs[:-1]
    )
    duplicate_pairs = list(measurement_package.waves[0].pairs)
    duplicate_pairs[-1] = duplicate_pairs[0]
    duplicate_pair = replace(
        measurement_package.waves[0], pairs=tuple(duplicate_pairs)
    )

    for wave in (missing_item, missing_pair, duplicate_pair):
        package = replace(measurement_package, waves=(wave, measurement_package.waves[1]))
        with pytest.raises(MeasurementEvidenceError, match="grid"):
            validate_measurement_package(package)


def test_sparse_item_and_pair_reject(measurement_package):
    wave = measurement_package.waves[0]
    sparse_item = replace(
        wave.items[0],
        category_counts=(AGGREGATE_OBSERVED_COUNT_FLOOR - 1, 0, 0, 0, 0),
        observed_count=AGGREGATE_OBSERVED_COUNT_FLOOR - 1,
        missing_count=wave.response_count - AGGREGATE_OBSERVED_COUNT_FLOOR + 1,
    )
    items = list(wave.items)
    items[0] = sparse_item
    sparse_item_wave = replace(wave, items=tuple(items))

    sparse_cells = ((AGGREGATE_OBSERVED_COUNT_FLOOR - 1, 0, 0, 0, 0),) + (
        (0, 0, 0, 0, 0),
    ) * 4
    sparse_pair = replace(
        wave.pairs[0],
        cell_counts=sparse_cells,
        observed_pair_count=AGGREGATE_OBSERVED_COUNT_FLOOR - 1,
        missing_pair_count=wave.response_count - AGGREGATE_OBSERVED_COUNT_FLOOR + 1,
    )
    pairs = list(wave.pairs)
    pairs[0] = sparse_pair
    sparse_pair_wave = replace(wave, pairs=tuple(pairs))

    for candidate in (sparse_item_wave, sparse_pair_wave):
        with pytest.raises(MeasurementEvidenceError, match="floor"):
            validate_measurement_package(
                replace(measurement_package, waves=(candidate, measurement_package.waves[1]))
            )


def test_pair_observed_count_respects_item_missingness_overlap(measurement_package):
    wave = measurement_package.waves[0]
    pair = wave.pairs[0]
    cells = [list(row) for row in pair.cell_counts]
    remaining_to_remove = 20
    for row in range(5):
        for column in range(5):
            removed = min(cells[row][column], remaining_to_remove)
            cells[row][column] -= removed
            remaining_to_remove -= removed
            if remaining_to_remove == 0:
                break
        if remaining_to_remove == 0:
            break
    assert remaining_to_remove == 0
    impossible_pair = replace(
        pair,
        cell_counts=tuple(tuple(row) for row in cells),
        observed_pair_count=20,
        missing_pair_count=20,
    )
    pairs = list(wave.pairs)
    pairs[0] = impossible_pair
    candidate = replace(wave, pairs=tuple(pairs))

    with pytest.raises(MeasurementEvidenceError, match="overlap bound"):
        validate_measurement_package(
            replace(measurement_package, waves=(candidate, measurement_package.waves[1]))
        )


def test_wrong_form_real_data_and_output_authorization_reject(measurement_package):
    wrong_form = replace(measurement_package, form_id=SHORT_FORM_ID)
    real_data = replace(measurement_package, synthetic_only=False, real_data_present=True)
    authorizations = blocked_output_authorizations()
    authorizations["customer_output_authorized"] = True
    authorized = replace(measurement_package, output_authorizations=authorizations)

    for candidate in (wrong_form, real_data, authorized):
        with pytest.raises(MeasurementEvidenceError):
            validate_measurement_package(candidate)


def test_package_hash_binds_every_pair_count(measurement_package):
    wave = measurement_package.waves[0]
    pair = wave.pairs[0]
    cells = [list(row) for row in pair.cell_counts]
    source = next(
        (left, right)
        for left in range(5)
        for right in range(5)
        if cells[left][right] > 0
    )
    destination = next(
        (left, right)
        for left in range(5)
        for right in range(5)
        if (left, right) != source
    )
    cells[source[0]][source[1]] -= 1
    cells[destination[0]][destination[1]] += 1
    changed_pair = replace(pair, cell_counts=tuple(tuple(row) for row in cells))
    pairs = list(wave.pairs)
    pairs[0] = changed_pair
    changed_wave = replace(wave, pairs=tuple(pairs))
    changed_package = replace(
        measurement_package, waves=(changed_wave, measurement_package.waves[1])
    )

    assert changed_package.package_hash() != measurement_package.package_hash()
    with pytest.raises(MeasurementEvidenceError, match="pair margins"):
        validate_measurement_package(changed_package)


def test_package_shape_has_only_aggregate_measurement_fields(measurement_package):
    payload_text = repr(measurement_package.to_dict()).lower()

    for forbidden in (
        "respondentid",
        "employee_id",
        "raw_answers",
        "usage_behavior",
        "real_work_task",
        "item_title",
        "free_text",
    ):
        assert forbidden not in payload_text
    assert measurement_package.output_authorizations == blocked_output_authorizations()
    with pytest.raises(TypeError):
        measurement_package.output_authorizations["customer_output_authorized"] = True
