"""Deterministic aggregate synthetic fixtures for the VBD joint proof."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
import math
from typing import Literal

import numpy as np

from .hashing import sha256_json
from .vbd_joint_types import (
    VBD_JOINT_CAPABILITY_FACTOR,
    VBD_JOINT_CAPABILITY_INNOVATION_STANDARD_DEVIATION,
    VBD_JOINT_CAPABILITY_STANDARD_ERROR,
    VBD_JOINT_CONTROL_NAMES,
    VBD_JOINT_ELIGIBLE_FAMILIES,
    VBD_JOINT_GENERATOR_ID,
    VBD_JOINT_GENERATOR_VERSION,
    VBD_JOINT_MODEL_FAMILY,
    VBD_JOINT_MODEL_VERSION,
    VBD_JOINT_NULL_SEED,
    VBD_JOINT_OUTCOME_FAMILY,
    VBD_JOINT_OUTCOME_STANDARD_ERROR,
    VBD_JOINT_PANEL_COUNT,
    VBD_JOINT_POST_WINDOWS,
    VBD_JOINT_PRE_WINDOWS,
    VBD_JOINT_PRIMARY_SEED,
    VBD_JOINT_TRUTH,
    VBD_JOINT_WINDOW_COUNT,
    VBDJointAlignmentReceipt,
    VBDJointAnalysisPlan,
    VBDJointCapabilityObservation,
    VBDJointCheckpoint,
    VBDJointControlObservation,
    VBDJointFreezeReceipt,
    VBDJointOutcomeObservation,
    VBDJointRegistryAudit,
    VBDJointStructureError,
    VBDJointSyntheticDataset,
    VBDJointTransition,
    vbd_joint_freeze_hashes,
    vbd_joint_outcome_access_receipt_hash,
)


VBDJointSyntheticScenario = Literal["primary", "behavior_pathway_null"]
_FROZEN_AT = "2026-08-11T00:00:00+00:00"


def _logistic(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def _hash_records(records: tuple) -> str:
    return sha256_json([record.to_hash_body() for record in records])


def _window_bounds(index: int) -> tuple[str, str]:
    start = datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(days=30 * index)
    end = start + timedelta(days=30)
    return start.isoformat(), end.isoformat()


def _build_plan(
    *,
    canonical_slice_manifest_root: str,
    cohort_manifest_root: str,
    family_registry_manifest_root: str,
    source_universe_manifest_root: str,
) -> VBDJointAnalysisPlan:
    schedule = [
        {
            "checkpoint_index": index,
            "window_start": _window_bounds(index)[0],
            "window_end": _window_bounds(index)[1],
        }
        for index in range(VBD_JOINT_WINDOW_COUNT)
    ]
    plan = VBDJointAnalysisPlan(
        analysis_unit_id="vbd_joint_synthetic_v3",
        hypothesis_id="synthetic_customer_metric_hypothesis",
        organization_ref="synthetic_aggregate_organization",
        checkpoint_plan_hash=sha256_json(schedule),
        capability_definition_hash=sha256_json(
            {
                "factor": VBD_JOINT_CAPABILITY_FACTOR,
                "measurement_family": "normal_known_standard_error",
                "aggregate_only": True,
            }
        ),
        outcome_definition_hash=sha256_json(
            {
                "metric_id": "synthetic_customer_owned_metric",
                "family": VBD_JOINT_OUTCOME_FAMILY,
                "unit": "synthetic_standardized_unit",
                "aggregate_only": True,
            }
        ),
        control_set_hash=sha256_json(
            {
                "controls": list(VBD_JOINT_CONTROL_NAMES),
                "predeclared": True,
                "aggregate_only": True,
            }
        ),
        model_specification_hash=sha256_json(
            {
                "model_family": VBD_JOINT_MODEL_FAMILY,
                "model_version": VBD_JOINT_MODEL_VERSION,
                "full_model": True,
                **vbd_joint_freeze_hashes(),
            }
        ),
        comparison_specification_hash=sha256_json(
            {
                "full": "predeclared_behavior_pathway",
                "restricted": "no_behavior_outcome_terms",
                "same_rows_likelihood_controls_time_priors": True,
                "future_evaluation_windows": 3,
                "future_capability_or_behavior_training": False,
                "ar1_conditional_posterior_prediction": True,
            }
        ),
        canonical_slice_manifest_root=canonical_slice_manifest_root,
        cohort_manifest_root=cohort_manifest_root,
        family_registry_manifest_root=family_registry_manifest_root,
        source_universe_manifest_root=source_universe_manifest_root,
        outcome_access_receipt_hash="0" * 64,
        frozen_at=_FROZEN_AT,
        outcome_accessed_before_freeze=False,
    )
    return replace(
        plan,
        outcome_access_receipt_hash=vbd_joint_outcome_access_receipt_hash(plan),
    )


def generate_vbd_joint_synthetic_dataset(
    *,
    scenario: VBDJointSyntheticScenario = "primary",
    seed: int | None = None,
    duplicate_registry_allocation: bool = False,
) -> VBDJointSyntheticDataset:
    """Generate one aggregate-only fixture without emitting family identities."""

    if scenario not in ("primary", "behavior_pathway_null"):
        raise VBDJointStructureError("unsupported synthetic scenario")
    expected_seed = (
        VBD_JOINT_PRIMARY_SEED
        if scenario == "primary"
        else VBD_JOINT_NULL_SEED
    )
    if seed is None:
        seed = expected_seed
    if type(seed) is not int or seed != expected_seed:
        raise VBDJointStructureError("seed does not match the frozen scenario")
    rng = np.random.default_rng(seed)
    private_registries: list[set[str]] = []
    for panel in range(VBD_JOINT_PANEL_COUNT):
        registry = {
            f"synthetic-private-{panel}-{index}"
            for index in range(VBD_JOINT_ELIGIBLE_FAMILIES)
        }
        if duplicate_registry_allocation and panel == 1:
            registry.remove("synthetic-private-1-0")
            registry.add("synthetic-private-0-0")
        if any(registry & previous for previous in private_registries):
            raise VBDJointStructureError("synthetic family allocation is not disjoint")
        private_registries.append(registry)

    allocation_commitments = tuple(
        tuple(
            sorted(
                sha256_json({"synthetic_allocation_token": member})
                for member in registry
            )
        )
        for registry in private_registries
    )
    registry_roots = tuple(
        sha256_json(
            {
                "panel": panel,
                "allocation_commitment_root": sha256_json(
                    list(allocation_commitments[panel])
                ),
                "eligible_count": VBD_JOINT_ELIGIBLE_FAMILIES,
            }
        )
        for panel in range(VBD_JOINT_PANEL_COUNT)
    )
    cohort_hashes = tuple(
        sha256_json({"synthetic_cohort": panel, "aggregate_only": True})
        for panel in range(VBD_JOINT_PANEL_COUNT)
    )
    source_universe_hashes = tuple(
        sha256_json(
            {"synthetic_source_universe": panel, "stable_for_all_windows": True}
        )
        for panel in range(VBD_JOINT_PANEL_COUNT)
    )
    slice_manifest = tuple(
        (f"workflow_{panel}", f"jbtd_{panel}", f"role_{panel}")
        for panel in range(VBD_JOINT_PANEL_COUNT)
    )
    plan = _build_plan(
        canonical_slice_manifest_root=sha256_json(list(slice_manifest)),
        cohort_manifest_root=sha256_json(list(cohort_hashes)),
        family_registry_manifest_root=sha256_json(list(registry_roots)),
        source_universe_manifest_root=sha256_json(list(source_universe_hashes)),
    )
    registry_audit = VBDJointRegistryAudit(
        panel_allocation_commitments=allocation_commitments,
        allocation_manifest_root=sha256_json(
            [list(panel) for panel in allocation_commitments]
        ),
        exact_disjoint_allocation=True,
    )

    checkpoints: list[VBDJointCheckpoint] = []
    transitions: list[VBDJointTransition] = []
    capabilities: list[VBDJointCapabilityObservation] = []
    outcomes: list[VBDJointOutcomeObservation] = []
    controls: list[VBDJointControlObservation] = []
    behavior_effects = VBD_JOINT_TRUTH if scenario == "primary" else {
        **VBD_JOINT_TRUTH,
        "capability_retention": 0.0,
        "capability_embedding": 0.0,
        "capability_active_nonembedded": 0.0,
        "outcome_embedded": 0.0,
        "outcome_active_nonembedded": 0.0,
        "outcome_capability_by_embedded": 0.0,
    }

    for panel in range(VBD_JOINT_PANEL_COUNT):
        registry = sorted(private_registries[panel])
        registry_root = registry_roots[panel]
        cohort_hash = cohort_hashes[panel]
        source_universe_hash = source_universe_hashes[panel]
        semantic_policy_hash = sha256_json(
            {"synthetic_semantic_policy": "embedded_recurrence_v3", "panel": panel}
        )
        outcome_source_hash = sha256_json(
            {"synthetic_outcome_source": panel, "revision": "frozen_v3"}
        )
        control_source_hashes = {
            name: sha256_json({"synthetic_control_source": name, "revision": "frozen_v3"})
            for name in VBD_JOINT_CONTROL_NAMES
        }
        panel_capability_offset = float(rng.normal(0.0, 0.25))
        capability_latent = np.asarray(
            [
                panel_capability_offset
                + 0.035 * t
                + (0.30 if t >= VBD_JOINT_PRE_WINDOWS else 0.0)
                + float(
                    rng.normal(
                        0.0,
                        VBD_JOINT_CAPABILITY_INNOVATION_STANDARD_DEVIATION,
                    )
                )
                for t in range(VBD_JOINT_WINDOW_COUNT)
            ],
            dtype=float,
        )
        capability_observed = capability_latent + rng.normal(
            0.0,
            VBD_JOINT_CAPABILITY_STANDARD_ERROR,
            VBD_JOINT_WINDOW_COUNT,
        )
        seasonality = np.asarray(
            [math.sin(2.0 * math.pi * t / 12.0) for t in range(VBD_JOINT_WINDOW_COUNT)],
            dtype=float,
        )
        demand = np.asarray(
            [
                -0.45 + 0.05 * t + 0.10 * panel + float(rng.normal(0.0, 0.04))
                for t in range(VBD_JOINT_WINDOW_COUNT)
            ],
            dtype=float,
        )
        embedded_members = {
            member for member in registry if rng.random() < 0.18
        }
        panel_checkpoints: list[VBDJointCheckpoint] = []
        expected_embedded_states = []
        expected_active_nonembedded_states = []
        previous_embedded = set(embedded_members)
        for t in range(VBD_JOINT_WINDOW_COUNT):
            if t == 0:
                retained_members = set(previous_embedded)
                newly_embedded_members: set[str] = set()
                lapsed_members: set[str] = set()
            else:
                lagged_capability = float(capability_latent[t - 1])
                retention_probability = _logistic(
                    1.35
                    + behavior_effects["capability_retention"] * lagged_capability
                    + 0.10 * panel
                )
                embedding_probability = _logistic(
                    -2.15
                    + behavior_effects["capability_embedding"] * lagged_capability
                    + 0.045 * t
                    + (0.30 if t >= VBD_JOINT_PRE_WINDOWS else 0.0)
                )
                retained_members = {
                    member for member in previous_embedded if rng.random() < retention_probability
                }
                lapsed_members = previous_embedded - retained_members
                previously_nonembedded = set(registry) - previous_embedded
                newly_embedded_members = {
                    member
                    for member in previously_nonembedded
                    if rng.random() < embedding_probability
                }
                embedded_members = retained_members | newly_embedded_members
            nonembedded_members = set(registry) - embedded_members
            lagged_capability = float(capability_latent[max(0, t - 1)])
            active_probability = _logistic(
                -0.55
                + behavior_effects["capability_active_nonembedded"] * lagged_capability
                + 0.035 * t
            )
            active_nonembedded_members = {
                member for member in nonembedded_members if rng.random() < active_probability
            }
            if t == 0:
                expected_embedded_state = (
                    len(embedded_members) / VBD_JOINT_ELIGIBLE_FAMILIES
                )
                expected_active_state = (
                    len(active_nonembedded_members) / VBD_JOINT_ELIGIBLE_FAMILIES
                )
            else:
                state_origin = (
                    expected_embedded_states[-1]
                    if t >= VBD_JOINT_WINDOW_COUNT - 3
                    else len(previous_embedded) / VBD_JOINT_ELIGIBLE_FAMILIES
                )
                expected_embedded_state = (
                    state_origin * retention_probability
                    + (1.0 - state_origin) * embedding_probability
                )
                expected_active_state = active_probability * (
                    1.0 - expected_embedded_state
                )
            expected_embedded_states.append(expected_embedded_state)
            expected_active_nonembedded_states.append(expected_active_state)
            window_start, window_end = _window_bounds(t)
            checkpoint = VBDJointCheckpoint(
                panel_index=panel,
                workflow_id=f"workflow_{panel}",
                jbtd_id=f"jbtd_{panel}",
                persona_id=f"role_{panel}",
                cohort_ref=f"aggregate_cohort_{panel}",
                cohort_hash=cohort_hash,
                family_registry_root=registry_root,
                checkpoint_index=t,
                checkpoint_id=f"panel_{panel}_checkpoint_{t}",
                window_start=window_start,
                window_end=window_end,
                eligible_count=VBD_JOINT_ELIGIBLE_FAMILIES,
                active_count=len(embedded_members) + len(active_nonembedded_members),
                embedded_count=len(embedded_members),
                source_universe_hash=source_universe_hash,
                semantic_policy_hash=semantic_policy_hash,
                gate_receipt_hash=sha256_json(
                    {
                        "panel": panel,
                        "checkpoint": t,
                        "slice": [f"workflow_{panel}", f"jbtd_{panel}", f"role_{panel}"],
                        "independently_cleared": True,
                    }
                ),
            )
            checkpoints.append(checkpoint)
            panel_checkpoints.append(checkpoint)
            capabilities.append(
                VBDJointCapabilityObservation(
                    panel_index=panel,
                    checkpoint_index=t,
                    checkpoint_id=checkpoint.checkpoint_id,
                    cohort_hash=cohort_hash,
                    factor_id=VBD_JOINT_CAPABILITY_FACTOR,
                    observed_value=float(capability_observed[t]),
                    standard_error=VBD_JOINT_CAPABILITY_STANDARD_ERROR,
                    measurement_model_hash=plan.capability_definition_hash,
                )
            )
            controls.extend(
                (
                    VBDJointControlObservation(
                        panel_index=panel,
                        checkpoint_index=t,
                        checkpoint_id=checkpoint.checkpoint_id,
                        control_name="seasonality_index",
                        observed_value=float(seasonality[t]),
                        source_hash=control_source_hashes["seasonality_index"],
                    ),
                    VBDJointControlObservation(
                        panel_index=panel,
                        checkpoint_index=t,
                        checkpoint_id=checkpoint.checkpoint_id,
                        control_name="customer_demand_index",
                        observed_value=float(demand[t]),
                        source_hash=control_source_hashes["customer_demand_index"],
                    ),
                )
            )
            if t > 0:
                previous_checkpoint = panel_checkpoints[t - 1]
                transitions.append(
                    VBDJointTransition(
                        panel_index=panel,
                        transition_index=t,
                        previous_checkpoint_hash=previous_checkpoint.record_hash,
                        current_checkpoint_hash=checkpoint.record_hash,
                        eligible_count=VBD_JOINT_ELIGIBLE_FAMILIES,
                        retained_count=len(retained_members),
                        newly_embedded_count=len(newly_embedded_members),
                        lapsed_count=len(lapsed_members),
                        remaining_nonembedded_count=(
                            VBD_JOINT_ELIGIBLE_FAMILIES
                            - len(previous_embedded)
                            - len(newly_embedded_members)
                        ),
                        intersection_receipt_hash=sha256_json(
                            {
                                "registry_root": registry_root,
                                "previous_checkpoint_hash": previous_checkpoint.record_hash,
                                "current_checkpoint_hash": checkpoint.record_hash,
                                "retained": len(retained_members),
                                "newly_embedded": len(newly_embedded_members),
                                "lapsed": len(lapsed_members),
                                "aggregate_derivation_only": True,
                            }
                        ),
                    )
                )
            previous_embedded = set(embedded_members)

        panel_intercept = float(rng.normal(0.0, 0.20))
        residual = np.zeros(VBD_JOINT_WINDOW_COUNT, dtype=float)
        for t in range(VBD_JOINT_WINDOW_COUNT):
            residual[t] = (
                (0.35 * residual[t - 1] if t > 0 else 0.0)
                + float(rng.normal(0.0, 0.10))
            )
            lag = max(0, t - 1)
            outcome_mean = (
                panel_intercept
                + 0.025 * t
                + 0.35 * seasonality[t]
                - 0.25 * demand[t]
                + behavior_effects["outcome_embedded"]
                * expected_embedded_states[lag]
                + behavior_effects["outcome_active_nonembedded"]
                * expected_active_nonembedded_states[lag]
                + behavior_effects["outcome_capability"] * capability_latent[lag]
                + behavior_effects["outcome_capability_by_embedded"]
                * capability_latent[lag]
                * expected_embedded_states[lag]
                + residual[t]
            )
            observed = outcome_mean + float(
                rng.normal(0.0, VBD_JOINT_OUTCOME_STANDARD_ERROR)
            )
            checkpoint = panel_checkpoints[t]
            outcomes.append(
                VBDJointOutcomeObservation(
                    panel_index=panel,
                    checkpoint_index=t,
                    checkpoint_id=checkpoint.checkpoint_id,
                    cohort_hash=cohort_hash,
                    family_registry_root=registry_root,
                    metric_family=VBD_JOINT_OUTCOME_FAMILY,
                    observed_value=float(observed),
                    standard_error=VBD_JOINT_OUTCOME_STANDARD_ERROR,
                    source_hash=outcome_source_hash,
                )
            )

    checkpoints_tuple = tuple(checkpoints)
    transitions_tuple = tuple(transitions)
    capabilities_tuple = tuple(capabilities)
    outcomes_tuple = tuple(outcomes)
    controls_tuple = tuple(controls)
    alignment = VBDJointAlignmentReceipt(
        plan_hash=plan.plan_hash,
        checkpoint_root=_hash_records(checkpoints_tuple),
        transition_root=_hash_records(transitions_tuple),
        capability_root=_hash_records(capabilities_tuple),
        outcome_root=_hash_records(outcomes_tuple),
        control_root=_hash_records(controls_tuple),
        outcome_access_receipt_hash=plan.outcome_access_receipt_hash,
        exact_scope_alignment=True,
        exact_window_alignment=True,
        outcome_accessed_before_freeze=False,
    )
    freeze = VBDJointFreezeReceipt(
        plan_hash=plan.plan_hash,
        frozen_at=_FROZEN_AT,
        frozen_before_outcome_access=True,
        **vbd_joint_freeze_hashes(),
    )
    return VBDJointSyntheticDataset(
        plan=plan,
        checkpoints=checkpoints_tuple,
        transitions=transitions_tuple,
        capability_observations=capabilities_tuple,
        outcome_observations=outcomes_tuple,
        control_observations=controls_tuple,
        alignment_receipt=alignment,
        freeze_receipt=freeze,
        registry_audit=registry_audit,
        synthetic_scenario=scenario,
        generator_id=VBD_JOINT_GENERATOR_ID,
        generator_version=VBD_JOINT_GENERATOR_VERSION,
        seed=seed,
    )
