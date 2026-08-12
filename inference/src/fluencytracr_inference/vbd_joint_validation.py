"""Bounded synthetic validation for the VBD joint research proof."""

from __future__ import annotations

from dataclasses import dataclass, replace

from .hashing import sha256_json
from .vbd_joint_artifact import emit_vbd_joint_artifact
from .vbd_joint_model import VBDJointFitMode, fit_vbd_joint_model
from .vbd_joint_preparation import prepare_vbd_joint_dataset
from .vbd_joint_synthetic import generate_vbd_joint_synthetic_dataset
from .vbd_joint_types import (
    VBD_JOINT_DECISION_STATES,
    VBD_JOINT_NULL_SEED,
    VBD_JOINT_PRIMARY_SEED,
    VBDJointAlignmentReceipt,
    VBDJointFreezeReceipt,
    VBDJointRegistryAudit,
    VBDJointStructureError,
    VBDJointSyntheticDataset,
    vbd_joint_freeze_hashes,
    vbd_joint_outcome_access_receipt_hash,
)


def _hash_records(records: tuple) -> str:
    return sha256_json([record.to_hash_body() for record in records])


def _rebind_dataset(
    dataset: VBDJointSyntheticDataset,
    *,
    plan=None,
    checkpoints=None,
    transitions=None,
    capabilities=None,
    outcomes=None,
    controls=None,
    registry_audit=None,
) -> VBDJointSyntheticDataset:
    plan = dataset.plan if plan is None else plan
    checkpoints = dataset.checkpoints if checkpoints is None else tuple(checkpoints)
    transitions = dataset.transitions if transitions is None else tuple(transitions)
    capabilities = (
        dataset.capability_observations if capabilities is None else tuple(capabilities)
    )
    outcomes = dataset.outcome_observations if outcomes is None else tuple(outcomes)
    controls = dataset.control_observations if controls is None else tuple(controls)
    registry_audit = dataset.registry_audit if registry_audit is None else registry_audit
    alignment = VBDJointAlignmentReceipt(
        plan_hash=plan.plan_hash,
        checkpoint_root=_hash_records(checkpoints),
        transition_root=_hash_records(transitions),
        capability_root=_hash_records(capabilities),
        outcome_root=_hash_records(outcomes),
        control_root=_hash_records(controls),
        outcome_access_receipt_hash=plan.outcome_access_receipt_hash,
        exact_scope_alignment=dataset.alignment_receipt.exact_scope_alignment,
        exact_window_alignment=dataset.alignment_receipt.exact_window_alignment,
        outcome_accessed_before_freeze=dataset.alignment_receipt.outcome_accessed_before_freeze,
    )
    freeze = VBDJointFreezeReceipt(
        plan_hash=plan.plan_hash,
        frozen_at=plan.frozen_at,
        frozen_before_outcome_access=True,
        **vbd_joint_freeze_hashes(),
    )
    return replace(
        dataset,
        plan=plan,
        checkpoints=checkpoints,
        transitions=transitions,
        capability_observations=capabilities,
        outcome_observations=outcomes,
        control_observations=controls,
        alignment_receipt=alignment,
        freeze_receipt=freeze,
        registry_audit=registry_audit,
    )


def _expect_hold(name: str, callback) -> dict:
    try:
        callback()
    except VBDJointStructureError as exc:
        return {"control_name": name, "state": "PASS", "hold_reason": str(exc)}
    raise AssertionError(f"{name} did not fail closed")


def _replace_plan_with_access_receipt(plan, **changes):
    changed = replace(plan, **changes, outcome_access_receipt_hash="0" * 64)
    return replace(
        changed,
        outcome_access_receipt_hash=vbd_joint_outcome_access_receipt_hash(changed),
    )


def run_vbd_joint_structural_validation() -> dict:
    """Run deterministic, sampler-free admission and privacy controls."""

    primary = generate_vbd_joint_synthetic_dataset(scenario="primary")
    behavior_pathway_null = generate_vbd_joint_synthetic_dataset(
        scenario="behavior_pathway_null"
    )
    prepared = prepare_vbd_joint_dataset(primary)
    repeated = prepare_vbd_joint_dataset(primary)
    behavior_pathway_null_prepared = prepare_vbd_joint_dataset(
        behavior_pathway_null
    )
    if prepared.prepared_input_hash != repeated.prepared_input_hash:
        raise AssertionError("deterministic preparation hash changed")

    source_checkpoints = list(primary.checkpoints)
    changed = replace(
        source_checkpoints[5],
        source_universe_hash=sha256_json({"off_plan_source_revision": 2}),
    )
    source_checkpoints[5] = changed
    source_transitions = []
    by_key = {(item.panel_index, item.checkpoint_index): item for item in source_checkpoints}
    for transition in primary.transitions:
        previous = by_key[(transition.panel_index, transition.transition_index - 1)]
        current = by_key[(transition.panel_index, transition.transition_index)]
        source_transitions.append(
            replace(
                transition,
                previous_checkpoint_hash=previous.record_hash,
                current_checkpoint_hash=current.record_hash,
                intersection_receipt_hash=sha256_json(
                    {
                        "coordinated_rehash": True,
                        "panel": transition.panel_index,
                        "transition": transition.transition_index,
                    }
                ),
            )
        )
    source_drift = _rebind_dataset(
        primary,
        checkpoints=source_checkpoints,
        transitions=source_transitions,
    )

    capability_rows = list(primary.capability_observations)
    capability_rows[8] = replace(
        capability_rows[8],
        cohort_hash=sha256_json({"misaligned_aggregate_cohort": True}),
    )
    cohort_misalignment = _rebind_dataset(primary, capabilities=capability_rows)

    capability_error_rows = list(primary.capability_observations)
    capability_error_rows[8] = replace(capability_error_rows[8], standard_error=0.0)
    capability_error = _rebind_dataset(primary, capabilities=capability_error_rows)

    duplicated_basis_plan = _replace_plan_with_access_receipt(
        primary.plan,
        behavior_basis=(
            "embedded_state",
            "active_nonembedded_state",
            "net_coverage_velocity",
        ),
    )
    duplicated_basis = _rebind_dataset(primary, plan=duplicated_basis_plan)
    wrong_lag = _rebind_dataset(
        primary,
        plan=_replace_plan_with_access_receipt(
            primary.plan,
            behavior_outcome_lag=2,
        ),
    )
    outcome_informed = _rebind_dataset(
        primary,
        plan=_replace_plan_with_access_receipt(
            primary.plan,
            outcome_accessed_before_freeze=True,
        ),
    )
    replacement_plan = replace(
        primary.plan,
        organization_ref="synthetic_replaced_organization",
        outcome_access_receipt_hash="0" * 64,
    )
    replacement_plan = replace(
        replacement_plan,
        outcome_access_receipt_hash=vbd_joint_outcome_access_receipt_hash(
            replacement_plan
        ),
    )
    coordinated_plan_replacement = _rebind_dataset(
        primary,
        plan=replacement_plan,
    )

    replacement_commitments = tuple(
        tuple(
            sorted(
                sha256_json(
                    {"replacement_allocation": [panel_index, family_index]}
                )
                for family_index in range(primary.plan.eligible_family_count)
            )
        )
        for panel_index in range(primary.plan.panel_count)
    )
    replacement_registry_roots = tuple(
        sha256_json(
            {
                "panel": panel_index,
                "allocation_commitment_root": sha256_json(
                    list(replacement_commitments[panel_index])
                ),
                "eligible_count": primary.plan.eligible_family_count,
            }
        )
        for panel_index in range(primary.plan.panel_count)
    )
    replacement_checkpoints = tuple(
        replace(
            checkpoint,
            family_registry_root=replacement_registry_roots[
                checkpoint.panel_index
            ],
        )
        for checkpoint in primary.checkpoints
    )
    replacement_checkpoint_by_key = {
        (checkpoint.panel_index, checkpoint.checkpoint_index): checkpoint
        for checkpoint in replacement_checkpoints
    }
    replacement_transitions = tuple(
        replace(
            transition,
            previous_checkpoint_hash=replacement_checkpoint_by_key[
                (transition.panel_index, transition.transition_index - 1)
            ].record_hash,
            current_checkpoint_hash=replacement_checkpoint_by_key[
                (transition.panel_index, transition.transition_index)
            ].record_hash,
            intersection_receipt_hash=sha256_json(
                {
                    "coordinated_registry_replacement": True,
                    "panel": transition.panel_index,
                    "transition": transition.transition_index,
                }
            ),
        )
        for transition in primary.transitions
    )
    replacement_outcomes = tuple(
        replace(
            outcome,
            family_registry_root=replacement_registry_roots[outcome.panel_index],
        )
        for outcome in primary.outcome_observations
    )
    replacement_registry_audit = VBDJointRegistryAudit(
        panel_allocation_commitments=replacement_commitments,
        allocation_manifest_root=sha256_json(
            [list(panel) for panel in replacement_commitments]
        ),
        exact_disjoint_allocation=True,
    )
    registry_plan = replace(
        primary.plan,
        family_registry_manifest_root=sha256_json(
            list(replacement_registry_roots)
        ),
        outcome_access_receipt_hash="0" * 64,
    )
    registry_plan = replace(
        registry_plan,
        outcome_access_receipt_hash=vbd_joint_outcome_access_receipt_hash(
            registry_plan
        ),
    )
    coordinated_registry_replacement = _rebind_dataset(
        primary,
        plan=registry_plan,
        checkpoints=replacement_checkpoints,
        transitions=replacement_transitions,
        outcomes=replacement_outcomes,
        registry_audit=replacement_registry_audit,
    )

    replacement_cohorts = tuple(
        sha256_json({"replacement_cohort": panel_index})
        for panel_index in range(primary.plan.panel_count)
    )
    cohort_checkpoints = tuple(
        replace(
            checkpoint,
            cohort_hash=replacement_cohorts[checkpoint.panel_index],
        )
        for checkpoint in primary.checkpoints
    )
    cohort_checkpoint_by_key = {
        (checkpoint.panel_index, checkpoint.checkpoint_index): checkpoint
        for checkpoint in cohort_checkpoints
    }
    cohort_transitions = tuple(
        replace(
            transition,
            previous_checkpoint_hash=cohort_checkpoint_by_key[
                (transition.panel_index, transition.transition_index - 1)
            ].record_hash,
            current_checkpoint_hash=cohort_checkpoint_by_key[
                (transition.panel_index, transition.transition_index)
            ].record_hash,
            intersection_receipt_hash=sha256_json(
                {
                    "coordinated_cohort_replacement": True,
                    "panel": transition.panel_index,
                    "transition": transition.transition_index,
                }
            ),
        )
        for transition in primary.transitions
    )
    cohort_capabilities = tuple(
        replace(
            capability,
            cohort_hash=replacement_cohorts[capability.panel_index],
        )
        for capability in primary.capability_observations
    )
    cohort_outcomes = tuple(
        replace(
            outcome,
            cohort_hash=replacement_cohorts[outcome.panel_index],
        )
        for outcome in primary.outcome_observations
    )
    cohort_plan = replace(
        primary.plan,
        cohort_manifest_root=sha256_json(list(replacement_cohorts)),
        outcome_access_receipt_hash="0" * 64,
    )
    cohort_plan = replace(
        cohort_plan,
        outcome_access_receipt_hash=vbd_joint_outcome_access_receipt_hash(
            cohort_plan
        ),
    )
    coordinated_cohort_replacement = _rebind_dataset(
        primary,
        plan=cohort_plan,
        checkpoints=cohort_checkpoints,
        transitions=cohort_transitions,
        capabilities=cohort_capabilities,
        outcomes=cohort_outcomes,
    )

    replacement_sources = tuple(
        sha256_json({"replacement_source_universe": panel_index})
        for panel_index in range(primary.plan.panel_count)
    )
    source_replacement_checkpoints = tuple(
        replace(
            checkpoint,
            source_universe_hash=replacement_sources[checkpoint.panel_index],
        )
        for checkpoint in primary.checkpoints
    )
    source_replacement_by_key = {
        (checkpoint.panel_index, checkpoint.checkpoint_index): checkpoint
        for checkpoint in source_replacement_checkpoints
    }
    source_replacement_transitions = tuple(
        replace(
            transition,
            previous_checkpoint_hash=source_replacement_by_key[
                (transition.panel_index, transition.transition_index - 1)
            ].record_hash,
            current_checkpoint_hash=source_replacement_by_key[
                (transition.panel_index, transition.transition_index)
            ].record_hash,
            intersection_receipt_hash=sha256_json(
                {
                    "coordinated_source_replacement": True,
                    "panel": transition.panel_index,
                    "transition": transition.transition_index,
                }
            ),
        )
        for transition in primary.transitions
    )
    source_plan = replace(
        primary.plan,
        source_universe_manifest_root=sha256_json(list(replacement_sources)),
        outcome_access_receipt_hash="0" * 64,
    )
    source_plan = replace(
        source_plan,
        outcome_access_receipt_hash=vbd_joint_outcome_access_receipt_hash(
            source_plan
        ),
    )
    coordinated_source_replacement = _rebind_dataset(
        primary,
        plan=source_plan,
        checkpoints=source_replacement_checkpoints,
        transitions=source_replacement_transitions,
    )
    replaced_generator = replace(primary, generator_version="v0_2_1")

    unavailable_checkpoint = _rebind_dataset(
        primary,
        checkpoints=(
            replace(primary.checkpoints[0], finalized=False),
            *primary.checkpoints[1:],
        ),
    )
    unavailable_capability = _rebind_dataset(
        primary,
        capabilities=(
            replace(primary.capability_observations[0], suppressed=True),
            *primary.capability_observations[1:],
        ),
    )
    unavailable_outcome = _rebind_dataset(
        primary,
        outcomes=(
            replace(primary.outcome_observations[0], stale=True),
            *primary.outcome_observations[1:],
        ),
    )
    unavailable_control = _rebind_dataset(
        primary,
        controls=(
            replace(primary.control_observations[0], imputed=True),
            *primary.control_observations[1:],
        ),
    )
    controls = [
        _expect_hold(
            "duplicate_private_registry_allocation",
            lambda: generate_vbd_joint_synthetic_dataset(
                scenario="primary", duplicate_registry_allocation=True
            ),
        ),
        _expect_hold(
            "observable_source_universe_drift",
            lambda: prepare_vbd_joint_dataset(source_drift),
        ),
        _expect_hold(
            "cohort_alignment",
            lambda: prepare_vbd_joint_dataset(cohort_misalignment),
        ),
        _expect_hold(
            "capability_uncertainty",
            lambda: prepare_vbd_joint_dataset(capability_error),
        ),
        _expect_hold(
            "algebraic_behavior_duplication",
            lambda: prepare_vbd_joint_dataset(duplicated_basis),
        ),
        _expect_hold("wrong_lag", lambda: prepare_vbd_joint_dataset(wrong_lag)),
        _expect_hold(
            "outcome_informed_freeze",
            lambda: prepare_vbd_joint_dataset(outcome_informed),
        ),
        _expect_hold(
            "coordinated_plan_replacement",
            lambda: prepare_vbd_joint_dataset(coordinated_plan_replacement),
        ),
        _expect_hold(
            "coordinated_registry_replacement",
            lambda: prepare_vbd_joint_dataset(
                coordinated_registry_replacement
            ),
        ),
        _expect_hold(
            "coordinated_cohort_replacement",
            lambda: prepare_vbd_joint_dataset(coordinated_cohort_replacement),
        ),
        _expect_hold(
            "coordinated_source_replacement",
            lambda: prepare_vbd_joint_dataset(coordinated_source_replacement),
        ),
        _expect_hold(
            "generator_identity_replacement",
            lambda: prepare_vbd_joint_dataset(replaced_generator),
        ),
        _expect_hold(
            "nonfinal_checkpoint",
            lambda: prepare_vbd_joint_dataset(unavailable_checkpoint),
        ),
        _expect_hold(
            "suppressed_capability",
            lambda: prepare_vbd_joint_dataset(unavailable_capability),
        ),
        _expect_hold(
            "stale_outcome",
            lambda: prepare_vbd_joint_dataset(unavailable_outcome),
        ),
        _expect_hold(
            "imputed_control",
            lambda: prepare_vbd_joint_dataset(unavailable_control),
        ),
    ]
    body = {
        "state": "PASS",
        "synthetic_only": True,
        "primary_prepared_input_hash": prepared.prepared_input_hash,
        "behavior_pathway_null_prepared_input_hash": (
            behavior_pathway_null_prepared.prepared_input_hash
        ),
        "deterministic_recomputation": True,
        "single_slice_per_panel": True,
        "cross_slice_derived_output": False,
        "confounding_controls_predeclared": True,
        "future_capability_windows_excluded_from_training": True,
        "future_behavior_windows_excluded_from_training": True,
        "future_outcome_windows_excluded_from_training": True,
        "complete_validation_universe_executed": False,
        "independent_review_passed": False,
        "controls": controls,
    }
    return {**body, "report_hash": sha256_json(body)}


@dataclass(frozen=True)
class VBDJointFittedValidation:
    structural_report: dict
    primary_artifact: dict
    behavior_pathway_null_artifact: dict
    decision_state: str
    qualifying_evidence: bool

    def to_sanitized_dict(self) -> dict:
        body = {
            "structural_report_hash": self.structural_report["report_hash"],
            "primary_artifact_hash": self.primary_artifact["artifact_self_hash"],
            "behavior_pathway_null_artifact_hash": (
                self.behavior_pathway_null_artifact["artifact_self_hash"]
            ),
            "primary_internal_state": self.primary_artifact["internal_state"],
            "behavior_pathway_null_internal_state": (
                self.behavior_pathway_null_artifact["internal_state"]
            ),
            "decision_state": self.decision_state,
            "qualifying_evidence": self.qualifying_evidence,
            "real_data_authorized": False,
            "product_integration_authorized": False,
            "customer_output_authorized": False,
        }
        return {**body, "validation_hash": sha256_json(body)}


def run_vbd_joint_fitted_validation(
    *,
    mode: VBDJointFitMode = "smoke",
) -> VBDJointFittedValidation:
    """Run primary and behavior-pathway-null fits under one frozen mode."""

    structural = run_vbd_joint_structural_validation()
    artifacts = {}
    for scenario in ("primary", "behavior_pathway_null"):
        prepared = prepare_vbd_joint_dataset(
            generate_vbd_joint_synthetic_dataset(scenario=scenario)
        )
        fit_seed = VBD_JOINT_PRIMARY_SEED if scenario == "primary" else VBD_JOINT_NULL_SEED
        full = fit_vbd_joint_model(
            prepared,
            variant="full",
            seed=fit_seed,
            mode=mode,
        )
        restricted = fit_vbd_joint_model(
            prepared,
            variant="restricted",
            seed=fit_seed,
            mode=mode,
        )
        artifact = emit_vbd_joint_artifact(
            full_fit=full,
            restricted_fit=restricted,
            synthetic_case=scenario,
        )
        if artifact != emit_vbd_joint_artifact(
            full_fit=full,
            restricted_fit=restricted,
            synthetic_case=scenario,
        ):
            raise AssertionError("sanitized artifact recomputation changed")
        artifacts[scenario] = artifact
    qualifying = False
    decision = "HOLD_FOR_MODEL_REPAIR"
    if decision not in VBD_JOINT_DECISION_STATES:
        raise AssertionError("invalid integration decision")
    return VBDJointFittedValidation(
        structural_report=structural,
        primary_artifact=artifacts["primary"],
        behavior_pathway_null_artifact=artifacts["behavior_pathway_null"],
        decision_state=decision,
        qualifying_evidence=qualifying,
    )
