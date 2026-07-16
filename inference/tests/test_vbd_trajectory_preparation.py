from dataclasses import replace

import numpy as np
import pytest

import fluencytracr_inference.vbd_trajectory_preparation as preparation
from fluencytracr_inference.vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
    TrajectoryPreparationError,
    _model_input_body,
    prepare_vbd_trajectory_lane,
    validate_prepared_vbd_trajectory,
    validate_vbd_trajectory_pre_period_scale,
)
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_synthetic import (
    generate_vbd_trajectory_smoke_case,
)
from fluencytracr_inference.vbd_trajectory_types import VBD_TRAJECTORY_LANES


@pytest.fixture(scope="module")
def smoke_case():
    return generate_vbd_trajectory_smoke_case()


@pytest.mark.parametrize("lane", VBD_TRAJECTORY_LANES)
def test_preparation_recovers_exact_pre_standardization_and_fixed_estimand(
    smoke_case, lane
):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, lane)
    validate_prepared_vbd_trajectory(prepared, smoke_case.panel)

    assert prepared.y.shape == (6 * 18,)
    assert prepared.known_se.shape == (6 * 18,)
    assert np.isclose(prepared.y[prepared.post == 0].mean(), 0.0, atol=1e-12)
    assert np.isclose(prepared.y[prepared.post == 0].std(ddof=1), 1.0, atol=1e-12)
    assert np.isclose(prepared.latent_level_contrast.sum(), 0.0, atol=1e-15)
    assert np.count_nonzero(prepared.latent_level_contrast) == 6 * (12 + 3)
    assert prepared.series_evidence_eligible is True
    assert prepared.fixed_effect_names == ("alpha", "beta")


@pytest.mark.parametrize("lane", VBD_TRAJECTORY_LANES)
def test_preparation_uses_canonical_evidence_values_without_hidden_raw_inputs(
    smoke_case, lane
):
    lane_index = VBD_TRAJECTORY_LANES.index(lane)
    raw = np.asarray(
        [
            bundle.observations[lane_index].transformed_p50
            for bundle in smoke_case.panel.bundles
        ],
        dtype=float,
    )
    raw_se = np.asarray(
        [
            bundle.observations[lane_index].transformed_standard_error
            for bundle in smoke_case.panel.bundles
        ],
        dtype=float,
    )
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, lane)
    pre = raw[prepared.post == 0]
    expected_mean = float(pre.mean())
    expected_sd = float(pre.std(ddof=1))

    assert prepared.raw_pre_mean == expected_mean
    assert prepared.raw_pre_sd == expected_sd
    assert np.array_equal(prepared.y, (raw - expected_mean) / expected_sd)
    assert np.array_equal(prepared.known_se, raw_se / expected_sd)


def test_time_encoding_uses_unique_pre_indexes_not_repeated_rows(smoke_case):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    unique_pre = np.arange(12, dtype=float)
    expected = (np.arange(18, dtype=float) - unique_pre.mean()) / unique_pre.std(ddof=1)

    assert np.array_equal(prepared.time_tau[:18], expected)
    assert np.array_equal(prepared.time_tau[18:36], expected)


@pytest.mark.parametrize("lane", VBD_TRAJECTORY_LANES)
def test_depth_context_perturbation_cannot_change_prepared_input_or_fit_inputs(lane):
    context_a = generate_vbd_trajectory_smoke_case(depth_context_ref="depth-context:a")
    context_b = generate_vbd_trajectory_smoke_case(depth_context_ref="depth-context:b")
    unavailable = generate_vbd_trajectory_smoke_case(
        depth_context_ref="depth-context:unavailable"
    )

    prepared_a = prepare_vbd_trajectory_lane(context_a.panel, lane)
    prepared_b = prepare_vbd_trajectory_lane(context_b.panel, lane)
    prepared_unavailable = prepare_vbd_trajectory_lane(unavailable.panel, lane)

    assert prepared_a.prepared_input_hash == prepared_b.prepared_input_hash
    assert prepared_a.prepared_input_hash == prepared_unavailable.prepared_input_hash
    assert np.array_equal(prepared_a.y, prepared_b.y)
    assert np.array_equal(prepared_a.known_se, prepared_unavailable.known_se)


@pytest.mark.parametrize("aggregate_k, eligible", [(5, False), (8, False), (10, True), (12, True), (16, True)])
def test_inherited_floor_posture_is_preserved(aggregate_k, eligible):
    case = generate_vbd_trajectory_smoke_case(aggregate_k=aggregate_k)
    prepared = prepare_vbd_trajectory_lane(case.panel, "frequency")

    assert prepared.series_evidence_eligible is eligible


def test_k4_rejects_at_existing_aggregate_floor_before_fit():
    case = generate_vbd_trajectory_smoke_case(aggregate_k=4)

    with pytest.raises(TrajectoryPreparationError) as error:
        prepare_vbd_trajectory_lane(case.panel, "frequency")
    assert error.value.stage == "aggregate_floor"


@pytest.mark.parametrize(
    "scale",
    [0, 0.0, -1.0, float("nan"), float("inf"), float("-inf"), True, None, "1"],
)
def test_pre_period_scale_validator_fails_closed(scale):
    with pytest.raises(
        TrajectoryPreparationError, match="pre-period scale"
    ) as error:
        validate_vbd_trajectory_pre_period_scale(scale)
    assert error.value.stage == "pre_period_standardization"


def test_pre_period_scale_validator_preserves_compiled_positive_semantics():
    assert validate_vbd_trajectory_pre_period_scale(1) == 1.0
    assert validate_vbd_trajectory_pre_period_scale(1e-12) == 1e-12


def test_preparation_uses_the_production_pre_period_scale_validator(
    smoke_case, monkeypatch
):
    observed: list[object] = []
    production_validator = preparation.validate_vbd_trajectory_pre_period_scale

    def recording_validator(scale):
        observed.append(scale)
        return production_validator(scale)

    monkeypatch.setattr(
        preparation,
        "validate_vbd_trajectory_pre_period_scale",
        recording_validator,
    )
    prepared = preparation.prepare_vbd_trajectory_lane(
        smoke_case.panel, "frequency"
    )

    assert observed == [prepared.raw_pre_sd, prepared.raw_pre_sd]


def test_post_period_values_cannot_change_pre_period_transform():
    null_case = generate_vbd_trajectory_smoke_case(terminal_truth=(0.0, 0.0, 0.0))
    moved_case = generate_vbd_trajectory_smoke_case(terminal_truth=(0.5, 0.5, 0.5))

    for lane in VBD_TRAJECTORY_LANES:
        null_prepared = prepare_vbd_trajectory_lane(null_case.panel, lane)
        moved_prepared = prepare_vbd_trajectory_lane(moved_case.panel, lane)
        assert null_prepared.raw_pre_mean == moved_prepared.raw_pre_mean
        assert null_prepared.raw_pre_sd == moved_prepared.raw_pre_sd
        assert np.array_equal(
            null_prepared.y[null_prepared.post == 0],
            moved_prepared.y[moved_prepared.post == 0],
        )


def test_prepared_hashes_fail_closed_after_array_mutation(smoke_case):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    changed_y = prepared.y.copy()
    changed_y[-1] += 0.1
    forged = replace(prepared, y=changed_y)

    with pytest.raises(TrajectoryPreparationError) as error:
        validate_prepared_vbd_trajectory(forged, smoke_case.panel)
    assert error.value.stage == "prepared_hash"


def _rehash_model_input(prepared):
    return sha256_json(
        _model_input_body(
            lane=prepared.lane,
            panel_group_count=prepared.panel_group_count,
            aggregate_k=prepared.aggregate_k,
            series_evidence_eligible=prepared.series_evidence_eligible,
            standardization_window_indexes=(
                prepared.standardization_window_indexes
            ),
            y=prepared.y,
            known_se=prepared.known_se,
            time_index=prepared.time_index,
            time_tau=prepared.time_tau,
            post=prepared.post,
            group_index=prepared.group_index,
            group_rows=prepared.group_rows,
            x=prepared.x,
            zero_sum_basis=prepared.zero_sum_basis,
            augmented_design=prepared.augmented_design,
            latent_level_contrast=prepared.latent_level_contrast,
            raw_pre_mean=prepared.raw_pre_mean,
            raw_pre_sd=prepared.raw_pre_sd,
            direction_sign=prepared.direction_sign,
            transform_root=prepared.transform_root,
            model_manifest_root=prepared.model_manifest_root,
        )
    )


def _fully_rehash(prepared):
    rebound = replace(prepared, model_input_hash=_rehash_model_input(prepared))
    return replace(
        rebound,
        prepared_input_hash=sha256_json(
            {
                "model_input_hash": rebound.model_input_hash,
                "context_binding_hash": rebound.context_binding_hash,
            }
        ),
    )


@pytest.mark.parametrize(
    "mutation, expected_stage",
    [
        ("group_rows", "panel_alignment"),
        ("augmented_design", "prepared_shape"),
        ("fixed_effect_names", "prepared_shape"),
        ("latent_level_contrast", "estimand_contrast"),
    ],
)
def test_coordinated_rehash_cannot_change_fit_driving_structures(
    smoke_case, mutation, expected_stage
):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    if mutation == "group_rows":
        rows = list(prepared.group_rows)
        rows[0] = rows[0][::-1]
        forged = replace(prepared, group_rows=tuple(rows))
    elif mutation == "augmented_design":
        value = prepared.augmented_design.copy()
        value[-1, -1] += 0.1
        forged = replace(prepared, augmented_design=value)
    elif mutation == "fixed_effect_names":
        forged = replace(prepared, fixed_effect_names=("alpha", "velocity_index"))
    else:
        value = prepared.latent_level_contrast.copy()
        value[-1] += 0.1
        value[-2] -= 0.1
        forged = replace(prepared, latent_level_contrast=value)
    forged = replace(forged, model_input_hash=_rehash_model_input(forged))
    forged = replace(
        forged,
        prepared_input_hash=sha256_json(
            {
                "model_input_hash": forged.model_input_hash,
                "context_binding_hash": forged.context_binding_hash,
            }
        ),
    )

    with pytest.raises(TrajectoryPreparationError) as error:
        validate_prepared_vbd_trajectory(forged, smoke_case.panel)
    assert error.value.stage == expected_stage


@pytest.mark.parametrize("falsey", [0, None, ""])
def test_falsey_series_eligibility_is_rejected(smoke_case, falsey):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    forged = replace(prepared, series_evidence_eligible=falsey)

    with pytest.raises(TrajectoryPreparationError, match="series evidence eligibility"):
        validate_prepared_vbd_trajectory(forged, smoke_case.panel)


def test_unknown_lane_rejects_before_preparation(smoke_case):
    with pytest.raises(TrajectoryPreparationError) as error:
        prepare_vbd_trajectory_lane(smoke_case.panel, "velocity_index")
    assert error.value.stage == "lane_selection"


def test_prepared_public_hash_body_matches_model_input_and_arrays_are_immutable(
    smoke_case,
):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")

    assert sha256_json(prepared.to_hash_body()) == prepared.model_input_hash
    for value in (
        prepared.y,
        prepared.known_se,
        prepared.x,
        prepared.augmented_design,
        prepared.latent_level_contrast,
        *prepared.group_rows,
    ):
        assert value.flags.writeable is False
    with pytest.raises(ValueError):
        prepared.y[0] = 99.0


@pytest.mark.parametrize(
    "field,value,stage",
    [
        ("lane", "velocity_index", "lane_selection"),
        ("transform_root", "f" * 64, "prepared_hash"),
        ("model_manifest_root", "f" * 64, "prepared_hash"),
    ],
)
def test_coordinated_rehash_rejects_semantic_identity_substitution(
    smoke_case, field, value, stage
):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    forged = _fully_rehash(replace(prepared, **{field: value}))

    with pytest.raises(TrajectoryPreparationError) as error:
        validate_prepared_vbd_trajectory(forged, smoke_case.panel)
    assert error.value.stage == stage


def test_coordinated_rehash_rejects_post_schedule_and_source_panel_substitution(
    smoke_case,
):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    post = prepared.post.copy()
    post[-1] = 0
    forged = _fully_rehash(replace(prepared, post=post))

    with pytest.raises(TrajectoryPreparationError) as schedule_error:
        validate_prepared_vbd_trajectory(forged, smoke_case.panel)
    assert schedule_error.value.stage == "panel_alignment"

    other_panel = generate_vbd_trajectory_smoke_case(
        seed=smoke_case.panel.seed + 1
    ).panel
    with pytest.raises(TrajectoryPreparationError) as source_error:
        validate_prepared_vbd_trajectory(prepared, other_panel)
    assert source_error.value.stage == "source_reconciliation"


def test_public_validation_cannot_skip_exact_source_reconciliation(smoke_case):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    changed_y = prepared.y.copy()
    changed_y[-1] += 0.1
    forged = _fully_rehash(replace(prepared, y=changed_y))

    with pytest.raises(TrajectoryPreparationError) as error:
        validate_prepared_vbd_trajectory(forged, smoke_case.panel)
    assert error.value.stage == "source_reconciliation"
    with pytest.raises(TypeError):
        validate_prepared_vbd_trajectory(
            prepared,
            smoke_case.panel,
            _skip_source_reconciliation=True,
        )


def test_post_period_standardization_hits_public_prepared_validation(smoke_case):
    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    forged = replace(
        prepared, standardization_window_indexes=tuple(range(18))
    )
    with pytest.raises(TrajectoryPreparationError) as error:
        validate_prepared_vbd_trajectory(forged, smoke_case.panel)
    assert error.value.stage == "pre_period_standardization"


def test_hostile_prepared_subclasses_are_rejected(smoke_case):
    class HostilePrepared(TrajectoryPreparedInput):
        pass

    prepared = prepare_vbd_trajectory_lane(smoke_case.panel, "frequency")
    hostile = HostilePrepared(**prepared.__dict__)
    with pytest.raises(TrajectoryPreparationError, match="unsupported type"):
        validate_prepared_vbd_trajectory(hostile, smoke_case.panel)
