from dataclasses import replace
import math

import numpy as np
import pytest

import fluencytracr_inference.vbd_trajectory_types as trajectory_types
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_synthetic import (
    VBD_TRAJECTORY_SMOKE_SEED_MIN,
    _rebind_bundle_hashes,
    generate_vbd_trajectory_smoke_case,
)
from fluencytracr_inference.vbd_trajectory_types import (
    PrimitiveDistribution,
    TrajectoryObservationPanel,
    TrajectoryReferenceEntry,
    TrajectoryCovarianceError,
    TrajectoryStructureError,
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_MISSING_DEPTH_CONTEXT_ROOT,
    VBD_TRAJECTORY_BOOTSTRAP_DERIVATION,
    VBD_TRAJECTORY_EVENT_SCHEMA_VERSION,
    VBD_TRAJECTORY_RUNTIME_REF,
    VBD_TRAJECTORY_STATISTICS,
    TrajectoryReferenceManifest,
    expected_ordered_panel_manifest_root,
    reference_manifest_hash,
    trajectory_panel_depth_context_available,
    validate_trajectory_bundle,
    validate_trajectory_panel,
)


@pytest.fixture(scope="module")
def smoke_case():
    return generate_vbd_trajectory_smoke_case()


def _replace_observation(bundle, lane_index, observation):
    observations = list(bundle.observations)
    observations[lane_index] = observation
    return _rebind_bundle_hashes(
        replace(bundle, observations=tuple(observations))
    )


def test_smoke_panel_is_complete_deterministic_and_hash_bound(smoke_case):
    panel = smoke_case.panel
    validate_trajectory_panel(panel)

    assert len(panel.bundles) == 6 * 18
    assert panel.ordered_panel_manifest_root == (
        "a9a0e5dbdf70c016446c3047d39fe2705b80a1356476575beb34d89fa55759bc"
    )
    assert tuple(lane for lane, _ in panel.lane_observation_roots) == VBD_TRAJECTORY_LANES
    assert generate_vbd_trajectory_smoke_case().panel == panel
    assert (
        generate_vbd_trajectory_smoke_case(seed=VBD_TRAJECTORY_SMOKE_SEED_MIN + 1)
        .panel.ordered_panel_manifest_root
        != panel.ordered_panel_manifest_root
    )


def test_truth_sidecar_and_unsafe_material_never_enter_panel(smoke_case):
    panel_body = smoke_case.panel.to_dict()
    serialized = repr(panel_body).lower()

    assert smoke_case.truth.transformed_latent_paths.shape == (6, 18, 3)
    assert "truth" not in panel_body
    assert "latent" not in serialized
    assert "raw_rows" not in serialized
    assert "user_id" not in serialized
    assert "velocity_index" not in serialized
    assert "overall_vbd_score" not in serialized
    assert "integration_score" not in serialized


def test_public_smoke_generator_rejects_acceptance_seed_namespace():
    with pytest.raises(ValueError, match="disjoint seed namespace"):
        generate_vbd_trajectory_smoke_case(seed=2_056_100_000)


def test_conformance_bootstrap_provenance_cannot_enter_numerical_panel(smoke_case):
    bundle = _rebind_bundle_hashes(
        replace(
            smoke_case.panel.bundles[0],
            uncertainty_derivation_id=VBD_TRAJECTORY_BOOTSTRAP_DERIVATION,
        )
    )

    with pytest.raises(TrajectoryStructureError, match="only direct synthetic"):
        validate_trajectory_bundle(bundle, smoke_case.panel.reference_manifest)


@pytest.mark.parametrize("lane_index", [0, 1, 2])
@pytest.mark.parametrize("percentile", ["p10", "p50", "p90", "p99"])
@pytest.mark.parametrize("side", ["below", "above"])
def test_every_percentile_domain_mutation_rejects_before_hash(
    smoke_case, lane_index, percentile, side
):
    bundle = smoke_case.panel.bundles[0]
    observation = bundle.observations[lane_index]
    denominator = observation.denominator
    if lane_index == 0:
        invalid = -1.0 if side == "below" else math.inf
    else:
        invalid = -1.0 if side == "below" else float(denominator + 1)
    distribution = replace(observation.distribution, **{percentile: invalid})
    mutated = _replace_observation(
        bundle,
        lane_index,
        replace(observation, distribution=distribution),
    )

    with pytest.raises(TrajectoryStructureError, match="distribution"):
        validate_trajectory_bundle(mutated, smoke_case.panel.reference_manifest)


@pytest.mark.parametrize("lane_index, boundary", [(1, 0.0), (1, 60.0), (2, 0.0), (2, 12.0)])
def test_engagement_and_breadth_p50_boundaries_reject(smoke_case, lane_index, boundary):
    bundle = smoke_case.panel.bundles[0]
    observation = bundle.observations[lane_index]
    values = [observation.distribution.p10, boundary, observation.distribution.p90, observation.distribution.p99]
    values.sort()
    if boundary == 0.0:
        values[0] = values[1] = 0.0
    else:
        values[1:] = [boundary, boundary, boundary]
    distribution = PrimitiveDistribution(*values)
    mutated = _replace_observation(
        bundle,
        lane_index,
        replace(observation, distribution=distribution),
    )

    with pytest.raises(TrajectoryStructureError, match="nonregular boundary"):
        validate_trajectory_bundle(mutated, smoke_case.panel.reference_manifest)


@pytest.mark.parametrize("delta", [-1, 1])
@pytest.mark.parametrize("lane_index", [0, 1, 2])
def test_lane_cohort_size_must_equal_bundle_k(smoke_case, lane_index, delta):
    bundle = smoke_case.panel.bundles[0]
    observation = bundle.observations[lane_index]
    mutated = _replace_observation(
        bundle,
        lane_index,
        replace(observation, cohort_size=bundle.k + delta),
    )

    with pytest.raises(TrajectoryStructureError, match="cohort_size"):
        validate_trajectory_bundle(mutated, smoke_case.panel.reference_manifest)


def test_coordinated_rehash_cannot_legitimize_definition_or_ref_drift(smoke_case):
    bundle = smoke_case.panel.bundles[0]
    frequency = bundle.observations[0]
    definition_drift = _replace_observation(
        bundle,
        0,
        replace(frequency, definition_hash="f" * 64),
    )
    cross_role_ref = _replace_observation(
        bundle,
        0,
        replace(frequency, source_ref="source:vbd-synthetic-engagement"),
    )

    with pytest.raises(TrajectoryStructureError, match="definition hash drifted"):
        validate_trajectory_bundle(definition_drift, smoke_case.panel.reference_manifest)
    with pytest.raises(TrajectoryStructureError, match="frequency_source"):
        validate_trajectory_bundle(cross_role_ref, smoke_case.panel.reference_manifest)


def test_coordinated_manifest_rehash_cannot_change_static_definition(smoke_case):
    panel = smoke_case.panel
    entries = list(panel.reference_manifest.entries)
    index = next(
        index
        for index, entry in enumerate(entries)
        if entry.ref == "definition:frequency-runs-per-active-day-v1"
    )
    entries[index] = replace(entries[index], bound_content_hash="f" * 64)
    manifest = TrajectoryReferenceManifest(
        entries=tuple(entries),
        manifest_hash=reference_manifest_hash(entries),
    )
    forged = replace(panel, reference_manifest=manifest)

    with pytest.raises(TrajectoryStructureError, match="content hash drifted"):
        validate_trajectory_panel(forged)


def test_reference_manifest_order_is_canonical_even_after_root_rehash(smoke_case):
    panel = smoke_case.panel
    reversed_entries = tuple(reversed(panel.reference_manifest.entries))
    manifest = TrajectoryReferenceManifest(
        entries=reversed_entries,
        manifest_hash=reference_manifest_hash(reversed_entries),
    )
    rebound = replace(
        panel,
        reference_manifest=manifest,
        ordered_panel_manifest_root="0" * 64,
    )
    forged = replace(
        rebound,
        ordered_panel_manifest_root=expected_ordered_panel_manifest_root(rebound),
    )

    with pytest.raises(TrajectoryStructureError, match="manifest order drifted"):
        validate_trajectory_panel(forged)


def test_slice_identifiers_and_source_accounting_are_exact(smoke_case):
    bundle = smoke_case.panel.bundles[0]
    manifest = smoke_case.panel.reference_manifest
    unknown_tuple = _rebind_bundle_hashes(
        replace(bundle, workflow_id="user-0001")
    )
    frequency = bundle.observations[0]
    missing_count = _replace_observation(
        bundle, 0, replace(frequency, missing_count=1, observed_count=bundle.k - 1)
    )
    breadth = bundle.observations[2]
    surface_drift = _replace_observation(
        bundle, 2, replace(breadth, eligible_surface_set_hash="f" * 64)
    )

    with pytest.raises(TrajectoryStructureError, match="frozen slice manifest"):
        validate_trajectory_bundle(unknown_tuple, manifest)
    with pytest.raises(TrajectoryStructureError, match="observed_count"):
        validate_trajectory_bundle(missing_count, manifest)
    with pytest.raises(TrajectoryStructureError, match="surface-set commitment"):
        validate_trajectory_bundle(surface_drift, manifest)


def test_canonical_source_identity_denominators_and_gate_receipts_are_exact(
    smoke_case,
):
    panel = smoke_case.panel
    gate_receipts = set()
    runtime_entry = panel.reference_manifest.by_ref()[panel.bundles[0].runtime_ref]
    assert runtime_entry.field_role == "runtime"
    for bundle in panel.bundles:
        assert bundle.runtime_ref == VBD_TRAJECTORY_RUNTIME_REF
        for observation in bundle.observations:
            assert observation.event_schema_version == VBD_TRAJECTORY_EVENT_SCHEMA_VERSION
            assert observation.statistic_name == VBD_TRAJECTORY_STATISTICS[observation.lane]
            gate_receipts.add(observation.gate_receipt_hash)
    assert tuple(
        observation.denominator for observation in panel.bundles[0].observations
    ) == (None, 60, 12)
    assert len(gate_receipts) == len(panel.bundles) * len(VBD_TRAJECTORY_LANES)


def test_coordinated_rehash_rejects_denominator_and_quantile_formula_drift(
    smoke_case,
):
    bundle = smoke_case.panel.bundles[0]
    engagement = bundle.observations[1]
    wrong_denominator = _replace_observation(
        bundle, 1, replace(engagement, denominator=61)
    )
    frequency = bundle.observations[0]
    drifted_distribution = replace(
        frequency.distribution,
        p90=frequency.distribution.p90 + 1e-4,
    )
    wrong_quantile = _replace_observation(
        bundle, 0, replace(frequency, distribution=drifted_distribution)
    )

    with pytest.raises(TrajectoryStructureError, match="denominator drifted"):
        validate_trajectory_bundle(
            wrong_denominator, smoke_case.panel.reference_manifest
        )
    with pytest.raises(TrajectoryStructureError, match="quantile formula drifted"):
        validate_trajectory_bundle(wrong_quantile, smoke_case.panel.reference_manifest)


def test_cross_group_cohort_alias_and_malformed_manifest_reject(smoke_case):
    panel = smoke_case.panel
    bundle = panel.bundles[0]
    cohort_ref = "cohort:vbd-synthetic-g01"
    cohort_hash = panel.reference_manifest.by_ref()[cohort_ref].bound_content_hash
    active_set = sha256_json(
        {
            "cohort_ref": cohort_ref,
            "active_set": "fixed-across-windows",
            "aggregate_k": bundle.k,
        }
    )
    aliased = _rebind_bundle_hashes(
        replace(
            bundle,
            cohort_ref=cohort_ref,
            cohort_hash=cohort_hash,
            active_set_commitment=active_set,
        )
    )
    entries = panel.reference_manifest.entries + (
        panel.reference_manifest.entries[0],
    )
    malformed_manifest = TrajectoryReferenceManifest(
        entries=entries,
        manifest_hash=panel.reference_manifest.manifest_hash,
    )

    with pytest.raises(TrajectoryStructureError, match="panel group"):
        validate_trajectory_bundle(aliased, panel.reference_manifest)
    with pytest.raises(TrajectoryStructureError, match="duplicate refs"):
        validate_trajectory_bundle(bundle, malformed_manifest)


def test_standalone_bundle_rejects_unknown_refs_and_cohort_hash_aliases(smoke_case):
    panel = smoke_case.panel
    bundle = panel.bundles[18]
    entries = list(panel.reference_manifest.entries)
    source_entry = next(
        entry for entry in entries if entry.ref == "source:vbd-synthetic-frequency"
    )
    entries.append(
        TrajectoryReferenceEntry(
            ref="source:vbd-unknown",
            field_role=source_entry.field_role,
            owner_role=source_entry.owner_role,
            source_definition_ref=source_entry.source_definition_ref,
            aggregate_only=source_entry.aggregate_only,
            blocked_uses=source_entry.blocked_uses,
            bound_content_hash=source_entry.bound_content_hash,
        )
    )
    unknown_manifest = TrajectoryReferenceManifest(
        entries=tuple(entries),
        manifest_hash=reference_manifest_hash(entries),
    )

    with pytest.raises(TrajectoryStructureError, match="manifest (?:order|ref set) drifted"):
        validate_trajectory_bundle(panel.bundles[0], unknown_manifest)

    entries = list(panel.reference_manifest.entries)
    cohort_zero_hash = panel.reference_manifest.by_ref()[
        "cohort:vbd-synthetic-g00"
    ].bound_content_hash
    cohort_one_index = next(
        index
        for index, entry in enumerate(entries)
        if entry.ref == "cohort:vbd-synthetic-g01"
    )
    entries[cohort_one_index] = replace(
        entries[cohort_one_index], bound_content_hash=cohort_zero_hash
    )
    aliased_manifest = TrajectoryReferenceManifest(
        entries=tuple(entries),
        manifest_hash=reference_manifest_hash(entries),
    )
    aliased_bundle = _rebind_bundle_hashes(
        replace(bundle, cohort_hash=cohort_zero_hash)
    )
    with pytest.raises(TrajectoryStructureError, match="cohort hash drifted"):
        validate_trajectory_bundle(aliased_bundle, aliased_manifest)


def test_covariance_controls_fail_at_compiled_stages(smoke_case):
    bundle = smoke_case.panel.bundles[0]
    manifest = smoke_case.panel.reference_manifest

    missing = _rebind_bundle_hashes(replace(bundle, transformed_covariance=()))
    with pytest.raises(TrajectoryCovarianceError) as missing_error:
        validate_trajectory_bundle(missing, manifest)
    assert missing_error.value.stage == "required_covariance_presence"

    permuted = _rebind_bundle_hashes(
        replace(
            bundle,
            covariance_lane_order=("breadth", "engagement", "frequency"),
        )
    )
    with pytest.raises(TrajectoryCovarianceError) as order_error:
        validate_trajectory_bundle(permuted, manifest)
    assert order_error.value.stage == "covariance_lane_order"

    frequency = bundle.observations[0]
    diagonal_mismatch = _replace_observation(
        bundle,
        0,
        replace(
            frequency,
            transformed_standard_error=frequency.transformed_standard_error * 1.1,
        ),
    )
    with pytest.raises(TrajectoryCovarianceError) as diagonal_error:
        validate_trajectory_bundle(diagonal_mismatch, manifest)
    assert diagonal_error.value.stage == "covariance_diagonal_consistency"

    standard_errors = np.asarray(
        [observation.transformed_standard_error for observation in bundle.observations]
    )
    bad_correlation = np.asarray(
        [[1.0, 0.9, 0.9], [0.9, 1.0, -0.9], [0.9, -0.9, 1.0]]
    )
    bad_covariance = (
        np.diag(standard_errors)
        @ bad_correlation
        @ np.diag(standard_errors)
    )
    non_psd = _rebind_bundle_hashes(
        replace(
            bundle,
            transformed_covariance=tuple(
                tuple(float(value) for value in row) for row in bad_covariance
            ),
        )
    )
    with pytest.raises(TrajectoryCovarianceError) as psd_error:
        validate_trajectory_bundle(non_psd, manifest)
    assert psd_error.value.stage == "covariance_positive_semidefinite"


@pytest.mark.parametrize("flag", ["suppressed", "stale", "imputed"])
def test_unusable_lane_window_rejects_before_fit(smoke_case, flag):
    bundle = smoke_case.panel.bundles[0]
    observation = bundle.observations[0]
    mutated = _replace_observation(
        bundle,
        0,
        replace(observation, **{flag: True}),
    )

    with pytest.raises(TrajectoryStructureError, match="suppressed, stale, or imputed"):
        validate_trajectory_bundle(mutated, smoke_case.panel.reference_manifest)


def test_numeric_depth_or_real_data_flags_reject(smoke_case):
    bundle = smoke_case.panel.bundles[0]
    numeric_depth = _rebind_bundle_hashes(replace(bundle, depth_context={"depth_value": 0.5}))
    real_data = _rebind_bundle_hashes(replace(bundle, real_data_present=True))

    with pytest.raises(TrajectoryStructureError, match="Depth context"):
        validate_trajectory_bundle(numeric_depth, smoke_case.panel.reference_manifest)
    with pytest.raises(TrajectoryStructureError, match="real, customer, production, or live"):
        validate_trajectory_bundle(real_data, smoke_case.panel.reference_manifest)


def test_depth_context_has_one_panel_binding_but_cannot_change_numerical_root():
    context_a = generate_vbd_trajectory_smoke_case(depth_context_ref="depth-context:a")
    context_b = generate_vbd_trajectory_smoke_case(depth_context_ref="depth-context:b")

    assert context_a.panel.depth_context_root != context_b.panel.depth_context_root
    assert (
        context_a.panel.ordered_panel_manifest_root
        == context_b.panel.ordered_panel_manifest_root
    )
    mixed_bundle = _rebind_bundle_hashes(
        replace(
            context_a.panel.bundles[0],
            depth_context=context_b.panel.bundles[0].depth_context,
        )
    )
    mixed_panel = replace(
        context_a.panel,
        bundles=(mixed_bundle,) + context_a.panel.bundles[1:],
    )
    with pytest.raises(TrajectoryStructureError, match="one immutable nonnumeric Depth"):
        validate_trajectory_panel(mixed_panel)


def test_contradictory_depth_state_degrades_to_unavailable_and_boolean_truth_rejects(
    smoke_case,
):
    bundle = smoke_case.panel.bundles[0]
    contradictory = replace(
        bundle.depth_context,
        aggregate_review_state="reviewed",
        suppression_posture="suppressed",
    )
    forged = _rebind_bundle_hashes(replace(bundle, depth_context=contradictory))
    panel = replace(
        smoke_case.panel,
        bundles=(forged,) + smoke_case.panel.bundles[1:],
    )

    validate_trajectory_panel(panel)
    assert forged.depth_context.context_ref == "depth-context:unavailable"
    assert forged.depth_context.aggregate_review_state == "unavailable"
    assert forged.depth_context.suppression_posture == "unavailable"
    assert "suppressed" not in repr(forged.depth_context.to_dict())
    assert trajectory_panel_depth_context_available(panel) is False
    with pytest.raises(ValueError, match="terminal truth"):
        generate_vbd_trajectory_smoke_case(terminal_truth=(True, False, True))


def test_missing_depth_is_canonical_unavailable_and_never_blocks_primitive_fit(
    smoke_case,
):
    first_missing = _rebind_bundle_hashes(
        replace(smoke_case.panel.bundles[0], depth_context=None)
    )
    partially_missing = replace(
        smoke_case.panel,
        bundles=(first_missing,) + smoke_case.panel.bundles[1:],
    )
    validate_trajectory_panel(partially_missing)
    assert first_missing.to_dict()["depth_context"]["context_ref"] == (
        "depth-context:unavailable"
    )
    assert partially_missing.to_dict()["depth_context_status"] == "unavailable"
    assert trajectory_panel_depth_context_available(partially_missing) is False

    all_missing_bundles = tuple(
        _rebind_bundle_hashes(replace(bundle, depth_context=None))
        for bundle in smoke_case.panel.bundles
    )
    all_missing = replace(
        smoke_case.panel,
        bundles=all_missing_bundles,
        depth_context_root=VBD_TRAJECTORY_MISSING_DEPTH_CONTEXT_ROOT,
    )
    validate_trajectory_panel(all_missing)
    assert trajectory_panel_depth_context_available(all_missing) is False


def test_malformed_safe_depth_metadata_is_canonicalized_before_serialization(
    smoke_case,
):
    context = replace(
        smoke_case.panel.bundles[0].depth_context,
        source_hash="f" * 64,
        caveat_refs=["caveat:depth-context-only"],
    )

    assert context.context_ref == "depth-context:unavailable"
    assert context.caveat_refs == ("caveat:depth-context-only",)
    assert context.to_dict() == trajectory_types.canonical_unavailable_depth_context_dict()


@pytest.mark.parametrize("falsey", [0, None, ""])
def test_falsey_non_booleans_cannot_bypass_safety_flags(smoke_case, falsey):
    bundle = smoke_case.panel.bundles[0]
    observation = bundle.observations[0]
    falsey_observation = _replace_observation(
        bundle, 0, replace(observation, suppressed=falsey)
    )
    falsey_real_flag = _rebind_bundle_hashes(
        replace(bundle, real_data_present=falsey)
    )

    with pytest.raises(TrajectoryStructureError, match="must be a boolean"):
        validate_trajectory_bundle(falsey_observation, smoke_case.panel.reference_manifest)
    with pytest.raises(TrajectoryStructureError, match="must be a boolean"):
        validate_trajectory_bundle(falsey_real_flag, smoke_case.panel.reference_manifest)


def test_seed_manifest_and_partition_attestation_are_recomputed(smoke_case):
    panel = smoke_case.panel
    with pytest.raises(TrajectoryStructureError, match="seed manifest root drifted"):
        validate_trajectory_panel(replace(panel, seed_manifest_root="f" * 64))

    bundle = _rebind_bundle_hashes(
        replace(panel.bundles[0], partition_attestation_root="f" * 64)
    )
    forged_panel = replace(panel, bundles=(bundle,) + panel.bundles[1:])
    with pytest.raises(TrajectoryStructureError, match="partition attestation drifted"):
        validate_trajectory_panel(forged_panel)


def test_seed_manifest_is_an_ancestor_of_the_ordered_panel_root(smoke_case):
    panel = smoke_case.panel
    changed_seed = panel.seed + 1
    changed_seed_root = sha256_json(
        {
            "seed_namespace": panel.seed_namespace,
            "seed": changed_seed,
            "generator_id": panel.generator_id,
            "rng_id": panel.rng_id,
            "acceptance_slot_key": None,
        }
    )
    forged = replace(panel, seed=changed_seed, seed_manifest_root=changed_seed_root)

    assert expected_ordered_panel_manifest_root(forged) != panel.ordered_panel_manifest_root
    with pytest.raises(TrajectoryStructureError, match="ordered panel manifest root drifted"):
        validate_trajectory_panel(forged)


def test_coordinated_seed_and_root_rehash_cannot_copy_another_seed_panel(smoke_case):
    panel = smoke_case.panel
    changed_seed = panel.seed + 1
    changed_seed_root = sha256_json(
        {
            "seed_namespace": panel.seed_namespace,
            "seed": changed_seed,
            "generator_id": panel.generator_id,
            "rng_id": panel.rng_id,
            "acceptance_slot_key": None,
        }
    )
    rebound = replace(
        panel,
        seed=changed_seed,
        seed_manifest_root=changed_seed_root,
        ordered_panel_manifest_root="0" * 64,
    )
    forged = replace(
        rebound,
        ordered_panel_manifest_root=expected_ordered_panel_manifest_root(rebound),
    )

    with pytest.raises(TrajectoryStructureError, match="declared seed"):
        validate_trajectory_panel(forged)


def test_unpinned_numpy_runtime_rejects(monkeypatch, smoke_case):
    monkeypatch.setattr(trajectory_types.np, "__version__", "2.4.4")
    with pytest.raises(TrajectoryStructureError, match="frozen Python/NumPy"):
        validate_trajectory_panel(smoke_case.panel)


def test_unpinned_scipy_runtime_rejects(monkeypatch, smoke_case):
    monkeypatch.setattr(trajectory_types.scipy, "__version__", "1.17.0")
    with pytest.raises(TrajectoryStructureError, match="frozen Python/NumPy/SciPy"):
        validate_trajectory_panel(smoke_case.panel)


def test_hostile_panel_subclasses_cannot_change_attributes_during_validation(
    smoke_case,
):
    class HostilePanel(TrajectoryObservationPanel):
        pass

    hostile = HostilePanel(**smoke_case.panel.__dict__)
    with pytest.raises(TrajectoryStructureError, match="unsupported type"):
        validate_trajectory_panel(hostile)


def test_mutable_containers_and_scalar_subclasses_reject(smoke_case):
    class HostileInt(int):
        pass

    class HostileFloat(float):
        pass

    class HostileStr(str):
        pass

    class HostileTuple(tuple):
        pass

    panel = smoke_case.panel
    bundle = panel.bundles[0]
    with pytest.raises(TrajectoryStructureError, match="immutable tuple"):
        validate_trajectory_panel(replace(panel, bundles=list(panel.bundles)))
    with pytest.raises(TrajectoryStructureError, match="must not be empty"):
        validate_trajectory_panel(
            replace(
                panel,
                reference_manifest=replace(
                    panel.reference_manifest,
                    entries=list(panel.reference_manifest.entries),
                ),
            )
        )
    with pytest.raises(TrajectoryStructureError, match="exactly three canonical lanes"):
        validate_trajectory_bundle(
            replace(bundle, observations=list(bundle.observations)),
            panel.reference_manifest,
        )
    with pytest.raises(TrajectoryStructureError, match="must be an integer"):
        validate_trajectory_bundle(
            replace(bundle, k=HostileInt(bundle.k)), panel.reference_manifest
        )
    hostile_distribution = replace(
        bundle.observations[0].distribution,
        p50=HostileFloat(bundle.observations[0].distribution.p50),
    )
    with pytest.raises(TrajectoryStructureError, match="must be numeric"):
        validate_trajectory_bundle(
            _replace_observation(
                bundle,
                0,
                replace(bundle.observations[0], distribution=hostile_distribution),
            ),
            panel.reference_manifest,
        )
    with pytest.raises(TrajectoryStructureError, match="unsupported namespace"):
        validate_trajectory_bundle(
            replace(bundle, runtime_ref=HostileStr(bundle.runtime_ref)),
            panel.reference_manifest,
        )
    with pytest.raises(TrajectoryCovarianceError, match="3x3 tuple"):
        validate_trajectory_bundle(
            replace(
                bundle,
                transformed_covariance=HostileTuple(bundle.transformed_covariance),
            ),
            panel.reference_manifest,
        )


def test_dgp_correlations_are_bound_to_plan_identity():
    baseline = generate_vbd_trajectory_smoke_case()
    correlated = generate_vbd_trajectory_smoke_case(
        group_correlation=0.8,
        innovation_correlation=0.8,
        observation_correlation=0.8,
    )

    assert baseline.panel.study_plan_root != correlated.panel.study_plan_root
    assert baseline.panel.ordered_panel_manifest_root != correlated.panel.ordered_panel_manifest_root


def test_missing_duplicate_and_off_plan_panels_reject(smoke_case):
    panel = smoke_case.panel
    with pytest.raises(TrajectoryStructureError, match="incomplete"):
        validate_trajectory_panel(replace(panel, bundles=panel.bundles[:-1]))

    duplicate = replace(
        panel,
        bundles=panel.bundles[:-1] + (panel.bundles[-2],),
    )
    with pytest.raises(TrajectoryStructureError, match="ordering drifted"):
        validate_trajectory_panel(duplicate)

    off_plan_bundle = replace(panel.bundles[-1], window_id="w99")
    off_plan = replace(panel, bundles=panel.bundles[:-1] + (off_plan_bundle,))
    with pytest.raises(TrajectoryStructureError, match="window id is off plan"):
        validate_trajectory_panel(off_plan)
