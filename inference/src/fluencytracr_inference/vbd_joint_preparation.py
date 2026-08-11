"""Deterministic preparation for the aggregate VBD joint synthetic proof."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

import numpy as np

from .hashing import sha256_json
from .vbd_joint_types import (
    VBD_JOINT_ALLOWED_GATE_STATE,
    VBD_JOINT_BEHAVIOR_BASIS,
    VBD_JOINT_CAPABILITY_BEHAVIOR_LAG,
    VBD_JOINT_CAPABILITY_FACTOR,
    VBD_JOINT_CAPABILITY_STANDARD_ERROR,
    VBD_JOINT_CAPABILITY_OUTCOME_LAG,
    VBD_JOINT_CONTROL_NAMES,
    VBD_JOINT_ELIGIBLE_FAMILIES,
    VBD_JOINT_GENERATOR_ID,
    VBD_JOINT_GENERATOR_VERSION,
    VBD_JOINT_NULL_SEED,
    VBD_JOINT_OUTCOME_FAMILY,
    VBD_JOINT_OUTCOME_STANDARD_ERROR,
    VBD_JOINT_PANEL_COUNT,
    VBD_JOINT_POST_WINDOWS,
    VBD_JOINT_PRE_WINDOWS,
    VBD_JOINT_PRIMARY_SEED,
    VBD_JOINT_WINDOW_COUNT,
    VBDJointAnalysisPlan,
    VBDJointAlignmentReceipt,
    VBDJointCapabilityObservation,
    VBDJointCheckpoint,
    VBDJointControlObservation,
    VBDJointFreezeReceipt,
    VBDJointOutcomeObservation,
    VBDJointRegistryAudit,
    VBDJointStructureError,
    VBDJointSyntheticDataset,
    VBDJointTransition,
    require_exact_int,
    require_finite,
    require_safe_id,
    require_sha256,
    vbd_joint_freeze_hashes,
    vbd_joint_outcome_access_receipt_hash,
)


def _exact_bool(name: str, value: object, expected: bool) -> None:
    if type(value) is not bool or value is not expected:
        raise VBDJointStructureError(f"{name} must be {expected}")


def _exact_tuple(name: str, value: object) -> tuple:
    if type(value) is not tuple:
        raise VBDJointStructureError(f"{name} must be an immutable tuple")
    return value


def _parse_timestamp(name: str, value: object) -> datetime:
    if not isinstance(value, str):
        raise VBDJointStructureError(f"{name} must be an RFC3339 timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise VBDJointStructureError(f"{name} must be an RFC3339 timestamp") from exc
    if parsed.tzinfo is None:
        raise VBDJointStructureError(f"{name} must include a timezone")
    return parsed


def _root_hash(items: Iterable[object]) -> str:
    bodies = []
    for item in items:
        body = getattr(item, "to_hash_body", None)
        if not callable(body):
            raise VBDJointStructureError("root item lacks a hash body")
        bodies.append(body())
    return sha256_json(bodies)


def _readonly(values, *, dtype) -> np.ndarray:
    source = np.asarray(values, dtype=dtype)
    array = np.frombuffer(source.tobytes(order="C"), dtype=source.dtype).reshape(
        source.shape
    )
    if array.flags.owndata or array.flags.writeable:
        raise VBDJointStructureError("prepared array storage is not immutable")
    return array


_PREPARED_ARRAY_FIELDS = (
    "panel_index",
    "checkpoint_index",
    "post",
    "evaluation",
    "retention_trials",
    "retained_count",
    "embedding_trials",
    "newly_embedded_count",
    "active_nonembedded_trials",
    "active_nonembedded_count",
    "capability_observed",
    "capability_standard_error",
    "capability_panel_index",
    "capability_checkpoint_index",
    "capability_post",
    "capability_evaluation",
    "capability_time_scaled",
    "lagged_capability_index",
    "observed_outcome",
    "outcome_standard_error",
    "control_matrix",
    "time_scaled",
    "lagged_behavior_row_index",
    "previous_embedded_observed_share",
    "previous_active_nonembedded_observed_share",
    "embedded_observed_share",
    "active_nonembedded_observed_share",
)


@dataclass(frozen=True)
class PreparedVBDJointData:
    dataset_hash: str
    synthetic_scenario: str
    seed: int
    source_profile: str
    generator_version: str
    replicated_cell_id: str | None
    replicate_index: int | None
    scenario_id: str
    plan_hash: str
    alignment_receipt_hash: str
    freeze_receipt_hash: str
    panel_index: np.ndarray
    checkpoint_index: np.ndarray
    post: np.ndarray
    evaluation: np.ndarray
    retention_trials: np.ndarray
    retained_count: np.ndarray
    embedding_trials: np.ndarray
    newly_embedded_count: np.ndarray
    active_nonembedded_trials: np.ndarray
    active_nonembedded_count: np.ndarray
    capability_observed: np.ndarray
    capability_standard_error: np.ndarray
    capability_panel_index: np.ndarray
    capability_checkpoint_index: np.ndarray
    capability_post: np.ndarray
    capability_evaluation: np.ndarray
    capability_time_scaled: np.ndarray
    lagged_capability_index: np.ndarray
    observed_outcome: np.ndarray
    outcome_standard_error: np.ndarray
    control_matrix: np.ndarray
    control_names: tuple[str, ...]
    time_scaled: np.ndarray
    lagged_behavior_row_index: np.ndarray
    previous_embedded_observed_share: np.ndarray
    previous_active_nonembedded_observed_share: np.ndarray
    embedded_observed_share: np.ndarray
    active_nonembedded_observed_share: np.ndarray
    model_input_hash: str
    context_binding_hash: str
    prepared_input_hash: str

    @property
    def row_count(self) -> int:
        return int(self.panel_index.size)

    @property
    def capability_row_count(self) -> int:
        return int(self.capability_observed.size)

    @property
    def training_mask(self) -> np.ndarray:
        mask = ~self.evaluation
        mask.setflags(write=False)
        return mask


def _validate_plan(plan: VBDJointAnalysisPlan) -> None:
    if type(plan) is not VBDJointAnalysisPlan:
        raise VBDJointStructureError("plan must use the exact joint plan type")
    require_safe_id("analysis_unit_id", plan.analysis_unit_id)
    require_safe_id("hypothesis_id", plan.hypothesis_id)
    require_safe_id("organization_ref", plan.organization_ref)
    for name in (
        "checkpoint_plan_hash",
        "capability_definition_hash",
        "outcome_definition_hash",
        "control_set_hash",
        "model_specification_hash",
        "comparison_specification_hash",
        "canonical_slice_manifest_root",
        "cohort_manifest_root",
        "family_registry_manifest_root",
        "source_universe_manifest_root",
        "outcome_access_receipt_hash",
    ):
        require_sha256(name, getattr(plan, name))
    _parse_timestamp("frozen_at", plan.frozen_at)
    _exact_bool("outcome_accessed_before_freeze", plan.outcome_accessed_before_freeze, False)
    if plan.outcome_access_receipt_hash != vbd_joint_outcome_access_receipt_hash(plan):
        raise VBDJointStructureError("outcome-access receipt does not bind the frozen plan")
    _exact_bool("synthetic_only", plan.synthetic_only, True)
    for name in (
        "real_data_present",
        "customer_data_present",
        "live_data_source_present",
        "production_data_present",
    ):
        _exact_bool(name, getattr(plan, name), False)
    expected = {
        "panel_count": VBD_JOINT_PANEL_COUNT,
        "pre_window_count": VBD_JOINT_PRE_WINDOWS,
        "post_window_count": VBD_JOINT_POST_WINDOWS,
        "eligible_family_count": VBD_JOINT_ELIGIBLE_FAMILIES,
        "capability_behavior_lag": VBD_JOINT_CAPABILITY_BEHAVIOR_LAG,
        "behavior_outcome_lag": 1,
        "capability_outcome_lag": VBD_JOINT_CAPABILITY_OUTCOME_LAG,
    }
    for name, value in expected.items():
        if require_exact_int(name, getattr(plan, name)) != value:
            raise VBDJointStructureError(f"{name} does not match the frozen profile")
    if plan.outcome_family != VBD_JOINT_OUTCOME_FAMILY:
        raise VBDJointStructureError("unsupported outcome family")
    if plan.capability_factor != VBD_JOINT_CAPABILITY_FACTOR:
        raise VBDJointStructureError("capability factor does not match the frozen plan")
    if _exact_tuple("behavior_basis", plan.behavior_basis) != VBD_JOINT_BEHAVIOR_BASIS:
        raise VBDJointStructureError("behavior basis is algebraically duplicated or off plan")
    if _exact_tuple("control_names", plan.control_names) != VBD_JOINT_CONTROL_NAMES:
        raise VBDJointStructureError("control set does not match the frozen plan")


def _validate_freeze(
    receipt: VBDJointFreezeReceipt,
    plan: VBDJointAnalysisPlan,
) -> None:
    if type(receipt) is not VBDJointFreezeReceipt:
        raise VBDJointStructureError("freeze receipt must use the exact receipt type")
    require_sha256("freeze plan_hash", receipt.plan_hash)
    if receipt.plan_hash != plan.plan_hash:
        raise VBDJointStructureError("freeze receipt does not bind the plan")
    expected = vbd_joint_freeze_hashes()
    for field, value in expected.items():
        require_sha256(field, getattr(receipt, field))
        if getattr(receipt, field) != value:
            raise VBDJointStructureError(f"{field} does not match the frozen profile")
    _parse_timestamp("freeze frozen_at", receipt.frozen_at)
    if receipt.frozen_at != plan.frozen_at:
        raise VBDJointStructureError("freeze timestamp does not match the plan")
    _exact_bool(
        "frozen_before_outcome_access",
        receipt.frozen_before_outcome_access,
        True,
    )


def _validate_checkpoint(checkpoint: VBDJointCheckpoint) -> None:
    if type(checkpoint) is not VBDJointCheckpoint:
        raise VBDJointStructureError("checkpoint must use the exact checkpoint type")
    require_exact_int("panel_index", checkpoint.panel_index)
    require_exact_int("checkpoint_index", checkpoint.checkpoint_index)
    for name in ("workflow_id", "jbtd_id", "persona_id", "cohort_ref", "checkpoint_id"):
        require_safe_id(name, getattr(checkpoint, name))
    for name in (
        "cohort_hash",
        "family_registry_root",
        "source_universe_hash",
        "semantic_policy_hash",
        "gate_receipt_hash",
    ):
        require_sha256(name, getattr(checkpoint, name))
    start = _parse_timestamp("window_start", checkpoint.window_start)
    end = _parse_timestamp("window_end", checkpoint.window_end)
    if start >= end:
        raise VBDJointStructureError("checkpoint window must be positive")
    eligible = require_exact_int("eligible_count", checkpoint.eligible_count)
    active = require_exact_int("active_count", checkpoint.active_count)
    embedded = require_exact_int("embedded_count", checkpoint.embedded_count)
    if eligible != VBD_JOINT_ELIGIBLE_FAMILIES or not 0 <= embedded <= active <= eligible:
        raise VBDJointStructureError("checkpoint counts violate Embedded <= Active <= Eligible")
    if checkpoint.gate_state != VBD_JOINT_ALLOWED_GATE_STATE:
        raise VBDJointStructureError("checkpoint gate did not independently clear")
    _exact_bool("finalized", checkpoint.finalized, True)
    _exact_bool("suppressed", checkpoint.suppressed, False)
    _exact_bool("stale", checkpoint.stale, False)
    _exact_bool("imputed", checkpoint.imputed, False)


def _validate_observation_types(
    dataset: VBDJointSyntheticDataset,
    *,
    expected_capability_standard_error: float,
) -> None:
    for item in dataset.capability_observations:
        if type(item) is not VBDJointCapabilityObservation:
            raise VBDJointStructureError("invalid capability observation type")
        require_exact_int("capability panel_index", item.panel_index)
        require_exact_int("capability checkpoint_index", item.checkpoint_index)
        require_safe_id("capability checkpoint_id", item.checkpoint_id)
        require_sha256("capability cohort_hash", item.cohort_hash)
        require_sha256("measurement_model_hash", item.measurement_model_hash)
        if item.factor_id != VBD_JOINT_CAPABILITY_FACTOR:
            raise VBDJointStructureError("capability factor is off plan")
        require_finite("capability observed_value", item.observed_value)
        standard_error = require_finite(
            "capability standard_error", item.standard_error, positive=True
        )
        if standard_error != expected_capability_standard_error:
            raise VBDJointStructureError("capability uncertainty is off the frozen profile")
        _exact_bool("capability finalized", item.finalized, True)
        _exact_bool("capability suppressed", item.suppressed, False)
        _exact_bool("capability stale", item.stale, False)
        _exact_bool("capability imputed", item.imputed, False)
    for item in dataset.outcome_observations:
        if type(item) is not VBDJointOutcomeObservation:
            raise VBDJointStructureError("invalid outcome observation type")
        require_exact_int("outcome panel_index", item.panel_index)
        require_exact_int("outcome checkpoint_index", item.checkpoint_index)
        require_safe_id("outcome checkpoint_id", item.checkpoint_id)
        for name in ("cohort_hash", "family_registry_root", "source_hash"):
            require_sha256(name, getattr(item, name))
        if item.metric_family != VBD_JOINT_OUTCOME_FAMILY:
            raise VBDJointStructureError("unsupported outcome family")
        require_finite("outcome observed_value", item.observed_value)
        standard_error = require_finite(
            "outcome standard_error", item.standard_error, positive=True
        )
        if standard_error != VBD_JOINT_OUTCOME_STANDARD_ERROR:
            raise VBDJointStructureError("outcome uncertainty is off the frozen profile")
        _exact_bool("outcome finalized", item.finalized, True)
        _exact_bool("outcome suppressed", item.suppressed, False)
        _exact_bool("outcome stale", item.stale, False)
        _exact_bool("outcome imputed", item.imputed, False)
    for item in dataset.control_observations:
        if type(item) is not VBDJointControlObservation:
            raise VBDJointStructureError("invalid control observation type")
        require_exact_int("control panel_index", item.panel_index)
        require_exact_int("control checkpoint_index", item.checkpoint_index)
        require_safe_id("control checkpoint_id", item.checkpoint_id)
        if item.control_name not in VBD_JOINT_CONTROL_NAMES:
            raise VBDJointStructureError("unsafe or off-plan control")
        require_finite("control observed_value", item.observed_value)
        require_sha256("control source_hash", item.source_hash)
        _exact_bool("control finalized", item.finalized, True)
        _exact_bool("control suppressed", item.suppressed, False)
        _exact_bool("control stale", item.stale, False)
        _exact_bool("control imputed", item.imputed, False)


def prepare_vbd_joint_dataset(dataset: VBDJointSyntheticDataset) -> PreparedVBDJointData:
    """Validate and deterministically project one frozen synthetic dataset."""

    if type(dataset) is not VBDJointSyntheticDataset:
        raise VBDJointStructureError("dataset must use the exact joint dataset type")
    if dataset.synthetic_scenario not in ("primary", "behavior_pathway_null"):
        raise VBDJointStructureError("synthetic scenario is off the frozen profile")
    expected_seed = (
        VBD_JOINT_PRIMARY_SEED
        if dataset.synthetic_scenario == "primary"
        else VBD_JOINT_NULL_SEED
    )
    return _prepare_vbd_joint_dataset(
        dataset,
        source_profile="v3",
        generator_version=VBD_JOINT_GENERATOR_VERSION,
        expected_seed=expected_seed,
        expected_capability_standard_error=VBD_JOINT_CAPABILITY_STANDARD_ERROR,
        dataset_hash=dataset.content_hash(),
        replicated_cell_id=None,
        replicate_index=None,
        scenario_id=dataset.synthetic_scenario,
    )


def _prepare_vbd_joint_dataset(
    dataset: VBDJointSyntheticDataset,
    *,
    source_profile: str,
    generator_version: str,
    expected_seed: int,
    expected_capability_standard_error: float,
    dataset_hash: str,
    replicated_cell_id: str | None,
    replicate_index: int | None,
    scenario_id: str,
) -> PreparedVBDJointData:
    """Shared deterministic projection after profile-specific admission."""

    if type(dataset) is not VBDJointSyntheticDataset:
        raise VBDJointStructureError("dataset must use the exact joint dataset type")
    _exact_bool("dataset synthetic_only", dataset.synthetic_only, True)
    for name in (
        "real_data_present",
        "customer_data_present",
        "live_data_source_present",
        "production_data_present",
    ):
        _exact_bool(f"dataset {name}", getattr(dataset, name), False)
    require_safe_id("generator_id", dataset.generator_id)
    require_safe_id("generator_version", dataset.generator_version)
    if dataset.generator_id != VBD_JOINT_GENERATOR_ID:
        raise VBDJointStructureError("generator identity is off the frozen profile")
    if dataset.generator_version != generator_version:
        raise VBDJointStructureError("generator version is off the frozen profile")
    require_exact_int("seed", dataset.seed, minimum=1)
    if dataset.synthetic_scenario not in ("primary", "behavior_pathway_null"):
        raise VBDJointStructureError("synthetic scenario is off the frozen profile")
    if dataset.seed != expected_seed:
        raise VBDJointStructureError("seed does not bind the synthetic scenario")
    _validate_plan(dataset.plan)
    _validate_freeze(dataset.freeze_receipt, dataset.plan)

    checkpoints = _exact_tuple("checkpoints", dataset.checkpoints)
    transitions = _exact_tuple("transitions", dataset.transitions)
    capabilities = _exact_tuple("capability_observations", dataset.capability_observations)
    outcomes = _exact_tuple("outcome_observations", dataset.outcome_observations)
    controls = _exact_tuple("control_observations", dataset.control_observations)
    expected_checkpoints = VBD_JOINT_PANEL_COUNT * VBD_JOINT_WINDOW_COUNT
    expected_transitions = VBD_JOINT_PANEL_COUNT * (VBD_JOINT_WINDOW_COUNT - 1)
    if len(checkpoints) != expected_checkpoints:
        raise VBDJointStructureError("checkpoint universe is incomplete")
    if len(transitions) != expected_transitions:
        raise VBDJointStructureError("transition universe is incomplete")
    if len(capabilities) != expected_checkpoints or len(outcomes) != expected_checkpoints:
        raise VBDJointStructureError("capability or outcome universe is incomplete")
    if len(controls) != expected_checkpoints * len(VBD_JOINT_CONTROL_NAMES):
        raise VBDJointStructureError("control universe is incomplete")

    registry_audit = dataset.registry_audit
    if type(registry_audit) is not VBDJointRegistryAudit:
        raise VBDJointStructureError("registry audit must use the exact audit type")
    panels = _exact_tuple(
        "panel_allocation_commitments",
        registry_audit.panel_allocation_commitments,
    )
    if len(panels) != VBD_JOINT_PANEL_COUNT:
        raise VBDJointStructureError("registry audit panel universe is incomplete")
    all_commitments = []
    for panel_index, panel_commitments in enumerate(panels):
        panel_commitments = _exact_tuple(
            f"panel allocation commitments {panel_index}", panel_commitments
        )
        if len(panel_commitments) != VBD_JOINT_ELIGIBLE_FAMILIES:
            raise VBDJointStructureError("registry audit family universe is incomplete")
        for commitment in panel_commitments:
            require_sha256("allocation commitment", commitment)
        if tuple(sorted(panel_commitments)) != panel_commitments:
            raise VBDJointStructureError("allocation commitments are not canonical")
        if len(set(panel_commitments)) != len(panel_commitments):
            raise VBDJointStructureError("allocation is duplicated within a panel")
        all_commitments.extend(panel_commitments)
    if len(set(all_commitments)) != len(all_commitments):
        raise VBDJointStructureError("family allocation overlaps across panels")
    require_sha256("allocation_manifest_root", registry_audit.allocation_manifest_root)
    if registry_audit.allocation_manifest_root != sha256_json(
        [list(panel) for panel in panels]
    ):
        raise VBDJointStructureError("allocation manifest root is invalid")
    _exact_bool(
        "exact_disjoint_allocation", registry_audit.exact_disjoint_allocation, True
    )
    _exact_bool("registry synthetic_only", registry_audit.synthetic_only, True)
    _exact_bool(
        "emitted_to_model_or_artifact",
        registry_audit.emitted_to_model_or_artifact,
        False,
    )

    for checkpoint in checkpoints:
        _validate_checkpoint(checkpoint)
    _validate_observation_types(
        dataset,
        expected_capability_standard_error=expected_capability_standard_error,
    )

    checkpoint_by_key = {(item.panel_index, item.checkpoint_index): item for item in checkpoints}
    capability_by_key = {(item.panel_index, item.checkpoint_index): item for item in capabilities}
    outcome_by_key = {(item.panel_index, item.checkpoint_index): item for item in outcomes}
    control_by_key = {
        (item.panel_index, item.checkpoint_index, item.control_name): item for item in controls
    }
    if len(checkpoint_by_key) != expected_checkpoints:
        raise VBDJointStructureError("checkpoint identities are duplicated")
    if len(capability_by_key) != expected_checkpoints or len(outcome_by_key) != expected_checkpoints:
        raise VBDJointStructureError("observation identities are duplicated")
    if len(control_by_key) != len(controls):
        raise VBDJointStructureError("control identities are duplicated")

    slices = set()
    registries = set()
    cohort_hashes = set()
    ordered_slices = []
    ordered_registries = []
    ordered_cohorts = []
    ordered_source_universes = []
    transition_by_key = {}
    frozen_schedule = None
    for transition in transitions:
        if type(transition) is not VBDJointTransition:
            raise VBDJointStructureError("transition must use the exact transition type")
        require_exact_int("transition panel_index", transition.panel_index)
        require_exact_int("transition_index", transition.transition_index, minimum=1)
        for name in (
            "previous_checkpoint_hash",
            "current_checkpoint_hash",
            "intersection_receipt_hash",
        ):
            require_sha256(name, getattr(transition, name))
        key = (transition.panel_index, transition.transition_index)
        if key in transition_by_key:
            raise VBDJointStructureError("transition identities are duplicated")
        transition_by_key[key] = transition

    for panel in range(VBD_JOINT_PANEL_COUNT):
        panel_checkpoints = [checkpoint_by_key[(panel, t)] for t in range(VBD_JOINT_WINDOW_COUNT)]
        first = panel_checkpoints[0]
        panel_slice = (first.workflow_id, first.jbtd_id, first.persona_id)
        if panel_slice in slices:
            raise VBDJointStructureError("one canonical slice was allocated to multiple panels")
        slices.add(panel_slice)
        ordered_slices.append(panel_slice)
        expected_registry_root = sha256_json(
            {
                "panel": panel,
                "allocation_commitment_root": sha256_json(list(panels[panel])),
                "eligible_count": VBD_JOINT_ELIGIBLE_FAMILIES,
            }
        )
        if first.family_registry_root != expected_registry_root:
            raise VBDJointStructureError("family registry does not bind the allocation audit")
        if first.family_registry_root in registries:
            raise VBDJointStructureError("family registry root is not disjoint")
        registries.add(first.family_registry_root)
        ordered_registries.append(first.family_registry_root)
        if first.cohort_hash in cohort_hashes:
            raise VBDJointStructureError("aggregate cohort binding is reused across panels")
        cohort_hashes.add(first.cohort_hash)
        ordered_cohorts.append(first.cohort_hash)
        source_universe_hash = first.source_universe_hash
        ordered_source_universes.append(source_universe_hash)
        semantic_policy_hash = first.semantic_policy_hash
        outcome_source_hash = outcome_by_key[(panel, 0)].source_hash
        control_source_hashes = {
            name: control_by_key[(panel, 0, name)].source_hash
            for name in VBD_JOINT_CONTROL_NAMES
        }
        previous_end = None
        panel_schedule = []
        for t, checkpoint in enumerate(panel_checkpoints):
            if checkpoint.panel_index != panel or checkpoint.checkpoint_index != t:
                raise VBDJointStructureError("checkpoint ordering is invalid")
            if (checkpoint.workflow_id, checkpoint.jbtd_id, checkpoint.persona_id) != panel_slice:
                raise VBDJointStructureError("panel contains more than one canonical slice")
            if checkpoint.cohort_hash != first.cohort_hash or checkpoint.cohort_ref != first.cohort_ref:
                raise VBDJointStructureError("cohort alignment changed within a panel")
            if checkpoint.family_registry_root != first.family_registry_root:
                raise VBDJointStructureError("family registry changed within a panel")
            if checkpoint.source_universe_hash != source_universe_hash:
                raise VBDJointStructureError("observable source universe drifted")
            if checkpoint.semantic_policy_hash != semantic_policy_hash:
                raise VBDJointStructureError("semantic policy drifted")
            start = _parse_timestamp("window_start", checkpoint.window_start)
            end = _parse_timestamp("window_end", checkpoint.window_end)
            if previous_end is not None and start != previous_end:
                raise VBDJointStructureError("checkpoint schedule is not contiguous")
            previous_end = end
            panel_schedule.append(
                {
                    "checkpoint_index": t,
                    "window_start": checkpoint.window_start,
                    "window_end": checkpoint.window_end,
                }
            )
            capability = capability_by_key[(panel, t)]
            outcome = outcome_by_key[(panel, t)]
            if capability.checkpoint_id != checkpoint.checkpoint_id:
                raise VBDJointStructureError("capability window is misaligned")
            if capability.cohort_hash != checkpoint.cohort_hash:
                raise VBDJointStructureError("capability cohort is misaligned")
            if capability.measurement_model_hash != dataset.plan.capability_definition_hash:
                raise VBDJointStructureError("capability definition is off plan")
            if outcome.checkpoint_id != checkpoint.checkpoint_id:
                raise VBDJointStructureError("outcome window is misaligned")
            if outcome.cohort_hash != checkpoint.cohort_hash:
                raise VBDJointStructureError("outcome cohort is misaligned")
            if outcome.family_registry_root != checkpoint.family_registry_root:
                raise VBDJointStructureError("outcome family registry is misaligned")
            if outcome.source_hash != outcome_source_hash:
                raise VBDJointStructureError("outcome source revision drifted")
            for control_name in VBD_JOINT_CONTROL_NAMES:
                control = control_by_key.get((panel, t, control_name))
                if control is None or control.checkpoint_id != checkpoint.checkpoint_id:
                    raise VBDJointStructureError("control window is misaligned")
                if control.source_hash != control_source_hashes[control_name]:
                    raise VBDJointStructureError("control source revision drifted")

        if frozen_schedule is None:
            frozen_schedule = panel_schedule
            if sha256_json(frozen_schedule) != dataset.plan.checkpoint_plan_hash:
                raise VBDJointStructureError("checkpoint schedule does not bind the plan")
        elif panel_schedule != frozen_schedule:
            raise VBDJointStructureError("panel checkpoint schedules are misaligned")

        for t in range(1, VBD_JOINT_WINDOW_COUNT):
            transition = transition_by_key.get((panel, t))
            if transition is None:
                raise VBDJointStructureError("adjacent transition is missing")
            previous = checkpoint_by_key[(panel, t - 1)]
            current = checkpoint_by_key[(panel, t)]
            if transition.previous_checkpoint_hash != previous.record_hash:
                raise VBDJointStructureError("transition previous endpoint is invalid")
            if transition.current_checkpoint_hash != current.record_hash:
                raise VBDJointStructureError("transition current endpoint is invalid")
            counts = (
                transition.eligible_count,
                transition.retained_count,
                transition.newly_embedded_count,
                transition.lapsed_count,
                transition.remaining_nonembedded_count,
            )
            for index, value in enumerate(counts):
                require_exact_int(f"transition count {index}", value)
            if transition.eligible_count != VBD_JOINT_ELIGIBLE_FAMILIES:
                raise VBDJointStructureError("transition eligibility changed")
            if transition.retained_count + transition.lapsed_count != previous.embedded_count:
                raise VBDJointStructureError("transition retention identity failed")
            if transition.retained_count + transition.newly_embedded_count != current.embedded_count:
                raise VBDJointStructureError("transition embedding identity failed")
            if sum(counts[1:]) != transition.eligible_count:
                raise VBDJointStructureError("transition partition identity failed")

    manifest_roots = {
        "canonical_slice_manifest_root": sha256_json(
            [list(value) for value in ordered_slices]
        ),
        "cohort_manifest_root": sha256_json(ordered_cohorts),
        "family_registry_manifest_root": sha256_json(ordered_registries),
        "source_universe_manifest_root": sha256_json(ordered_source_universes),
    }
    for name, value in manifest_roots.items():
        if getattr(dataset.plan, name) != value:
            raise VBDJointStructureError(f"{name} does not bind the prepared universe")

    receipt = dataset.alignment_receipt
    if type(receipt) is not VBDJointAlignmentReceipt:
        raise VBDJointStructureError("alignment receipt has an invalid type")
    for name in (
        "plan_hash",
        "checkpoint_root",
        "transition_root",
        "capability_root",
        "outcome_root",
        "control_root",
        "outcome_access_receipt_hash",
    ):
        require_sha256(name, getattr(receipt, name))
    expected_roots = {
        "plan_hash": dataset.plan.plan_hash,
        "checkpoint_root": _root_hash(checkpoints),
        "transition_root": _root_hash(transitions),
        "capability_root": _root_hash(capabilities),
        "outcome_root": _root_hash(outcomes),
        "control_root": _root_hash(controls),
    }
    for name, value in expected_roots.items():
        if getattr(receipt, name) != value:
            raise VBDJointStructureError(f"alignment {name} is invalid")
    if receipt.outcome_access_receipt_hash != dataset.plan.outcome_access_receipt_hash:
        raise VBDJointStructureError("alignment outcome-access receipt is invalid")
    _exact_bool("exact_scope_alignment", receipt.exact_scope_alignment, True)
    _exact_bool("exact_window_alignment", receipt.exact_window_alignment, True)
    _exact_bool(
        "alignment outcome_accessed_before_freeze",
        receipt.outcome_accessed_before_freeze,
        False,
    )
    if source_profile == "v3":
        from .vbd_joint_synthetic import generate_vbd_joint_synthetic_dataset

        expected_dataset = generate_vbd_joint_synthetic_dataset(
            scenario=dataset.synthetic_scenario
        )
    elif source_profile == "replicated_v4":
        from .vbd_joint_replicated_synthetic import (
            generate_vbd_joint_replicated_dataset,
        )

        expected_dataset = generate_vbd_joint_replicated_dataset(
            cell_id=replicated_cell_id,
            replicate_index=replicate_index,
            dataset_seed=expected_seed,
        ).dataset
    else:
        raise VBDJointStructureError("source profile is off the frozen projection")
    if dataset.content_hash() != expected_dataset.content_hash():
        raise VBDJointStructureError(
            "dataset does not match the frozen deterministic generator"
        )

    panel_values = []
    checkpoint_values = []
    post_values = []
    evaluation_values = []
    retention_trials = []
    retained = []
    embedding_trials = []
    newly_embedded = []
    active_trials = []
    active_counts = []
    lagged_capability_index = []
    observed_outcome = []
    outcome_se = []
    control_rows = []
    time_scaled = []
    lagged_behavior_row_index = []
    previous_embedded_share = []
    previous_active_share = []
    embedded_share = []
    active_share = []
    capability_values = []
    capability_se = []
    capability_panel_values = []
    capability_checkpoint_values = []
    capability_post_values = []
    capability_evaluation_values = []
    capability_time_values = []
    for panel in range(VBD_JOINT_PANEL_COUNT):
        for t in range(VBD_JOINT_WINDOW_COUNT):
            capability = capability_by_key[(panel, t)]
            capability_values.append(float(capability.observed_value))
            capability_se.append(float(capability.standard_error))
            capability_panel_values.append(panel)
            capability_checkpoint_values.append(t)
            capability_post_values.append(t >= VBD_JOINT_PRE_WINDOWS)
            capability_evaluation_values.append(t >= VBD_JOINT_WINDOW_COUNT - 3)
            capability_time_values.append(
                (t - (VBD_JOINT_WINDOW_COUNT - 1) / 2) / VBD_JOINT_WINDOW_COUNT
            )
        for t in range(1, VBD_JOINT_WINDOW_COUNT):
            transition = transition_by_key[(panel, t)]
            checkpoint = checkpoint_by_key[(panel, t)]
            previous = checkpoint_by_key[(panel, t - 1)]
            panel_values.append(panel)
            checkpoint_values.append(t)
            post_values.append(t >= VBD_JOINT_PRE_WINDOWS)
            evaluation_values.append(t >= VBD_JOINT_WINDOW_COUNT - 3)
            retention_trials.append(previous.embedded_count)
            retained.append(transition.retained_count)
            embedding_trials.append(VBD_JOINT_ELIGIBLE_FAMILIES - previous.embedded_count)
            newly_embedded.append(transition.newly_embedded_count)
            active_trials.append(VBD_JOINT_ELIGIBLE_FAMILIES - checkpoint.embedded_count)
            active_counts.append(checkpoint.active_count - checkpoint.embedded_count)
            lagged_capability_index.append(panel * VBD_JOINT_WINDOW_COUNT + t - 1)
            outcome = outcome_by_key[(panel, t)]
            observed_outcome.append(float(outcome.observed_value))
            outcome_se.append(float(outcome.standard_error))
            control_rows.append(
                [
                    float(control_by_key[(panel, t, name)].observed_value)
                    for name in VBD_JOINT_CONTROL_NAMES
                ]
            )
            time_scaled.append((t - (VBD_JOINT_WINDOW_COUNT - 1) / 2) / VBD_JOINT_WINDOW_COUNT)
            lagged_behavior_row_index.append(-1 if t == 1 else panel * (VBD_JOINT_WINDOW_COUNT - 1) + t - 2)
            previous_embedded_share.append(
                previous.embedded_count / VBD_JOINT_ELIGIBLE_FAMILIES
            )
            previous_active_share.append(
                (previous.active_count - previous.embedded_count)
                / VBD_JOINT_ELIGIBLE_FAMILIES
            )
            embedded_share.append(checkpoint.embedded_count / VBD_JOINT_ELIGIBLE_FAMILIES)
            active_share.append(
                (checkpoint.active_count - checkpoint.embedded_count)
                / VBD_JOINT_ELIGIBLE_FAMILIES
            )

    arrays = {
        "panel_index": _readonly(panel_values, dtype=np.int64),
        "checkpoint_index": _readonly(checkpoint_values, dtype=np.int64),
        "post": _readonly(post_values, dtype=np.bool_),
        "evaluation": _readonly(evaluation_values, dtype=np.bool_),
        "retention_trials": _readonly(retention_trials, dtype=np.int64),
        "retained_count": _readonly(retained, dtype=np.int64),
        "embedding_trials": _readonly(embedding_trials, dtype=np.int64),
        "newly_embedded_count": _readonly(newly_embedded, dtype=np.int64),
        "active_nonembedded_trials": _readonly(active_trials, dtype=np.int64),
        "active_nonembedded_count": _readonly(active_counts, dtype=np.int64),
        "capability_observed": _readonly(capability_values, dtype=float),
        "capability_standard_error": _readonly(capability_se, dtype=float),
        "capability_panel_index": _readonly(capability_panel_values, dtype=np.int64),
        "capability_checkpoint_index": _readonly(
            capability_checkpoint_values, dtype=np.int64
        ),
        "capability_post": _readonly(capability_post_values, dtype=np.bool_),
        "capability_evaluation": _readonly(
            capability_evaluation_values, dtype=np.bool_
        ),
        "capability_time_scaled": _readonly(capability_time_values, dtype=float),
        "lagged_capability_index": _readonly(lagged_capability_index, dtype=np.int64),
        "observed_outcome": _readonly(observed_outcome, dtype=float),
        "outcome_standard_error": _readonly(outcome_se, dtype=float),
        "control_matrix": _readonly(control_rows, dtype=float),
        "time_scaled": _readonly(time_scaled, dtype=float),
        "lagged_behavior_row_index": _readonly(lagged_behavior_row_index, dtype=np.int64),
        "previous_embedded_observed_share": _readonly(previous_embedded_share, dtype=float),
        "previous_active_nonembedded_observed_share": _readonly(previous_active_share, dtype=float),
        "embedded_observed_share": _readonly(embedded_share, dtype=float),
        "active_nonembedded_observed_share": _readonly(active_share, dtype=float),
    }
    model_input_body = {
        name: values.tolist()
        for name, values in arrays.items()
        if name not in {"post", "checkpoint_index"}
    }
    model_input_hash = sha256_json(model_input_body)
    context_binding_body = {
            "dataset_hash": dataset_hash,
            "synthetic_scenario": dataset.synthetic_scenario,
            "seed": dataset.seed,
            "plan_hash": dataset.plan.plan_hash,
            "alignment_receipt_hash": receipt.receipt_hash,
            "freeze_receipt_hash": dataset.freeze_receipt.receipt_hash,
            "post": arrays["post"].tolist(),
            "checkpoint_index": arrays["checkpoint_index"].tolist(),
            "control_names": list(VBD_JOINT_CONTROL_NAMES),
    }
    if source_profile == "replicated_v4":
        context_binding_body["replicated_v4"] = {
            "generator_version": generator_version,
            "cell_id": replicated_cell_id,
            "replicate_index": replicate_index,
            "scenario_id": scenario_id,
        }
    context_binding_hash = sha256_json(context_binding_body)
    prepared_input_hash = sha256_json(
        {
            "model_input_hash": model_input_hash,
            "context_binding_hash": context_binding_hash,
        }
    )
    return PreparedVBDJointData(
        dataset_hash=dataset_hash,
        synthetic_scenario=dataset.synthetic_scenario,
        seed=dataset.seed,
        source_profile=source_profile,
        generator_version=generator_version,
        replicated_cell_id=replicated_cell_id,
        replicate_index=replicate_index,
        scenario_id=scenario_id,
        plan_hash=dataset.plan.plan_hash,
        alignment_receipt_hash=receipt.receipt_hash,
        freeze_receipt_hash=dataset.freeze_receipt.receipt_hash,
        control_names=VBD_JOINT_CONTROL_NAMES,
        model_input_hash=model_input_hash,
        context_binding_hash=context_binding_hash,
        prepared_input_hash=prepared_input_hash,
        **arrays,
    )


def validate_prepared_vbd_joint_data(prepared: PreparedVBDJointData) -> None:
    """Revalidate exact deterministic provenance before any model is built."""

    if type(prepared) is not PreparedVBDJointData:
        raise VBDJointStructureError("model requires exact prepared joint data")
    if prepared.synthetic_scenario not in ("primary", "behavior_pathway_null"):
        raise VBDJointStructureError("prepared scenario is off the frozen profile")
    if prepared.source_profile == "v3":
        expected_seed = (
            VBD_JOINT_PRIMARY_SEED
            if prepared.synthetic_scenario == "primary"
            else VBD_JOINT_NULL_SEED
        )
        if type(prepared.seed) is not int or prepared.seed != expected_seed:
            raise VBDJointStructureError("prepared seed is off the frozen profile")
        from .vbd_joint_synthetic import generate_vbd_joint_synthetic_dataset

        expected = prepare_vbd_joint_dataset(
            generate_vbd_joint_synthetic_dataset(
                scenario=prepared.synthetic_scenario,
                seed=prepared.seed,
            )
        )
    elif prepared.source_profile == "replicated_v4":
        from .vbd_joint_replicated_bridge import prepare_vbd_joint_replicated_dataset
        from .vbd_joint_replicated_synthetic import (
            generate_vbd_joint_replicated_dataset,
        )
        from .vbd_joint_replicated_validation_plan import (
            vbd_joint_replicated_validation_plan,
        )

        plan = vbd_joint_replicated_validation_plan()
        slot = next(
            (
                candidate
                for candidate in (
                    plan.qualifying_slots + plan.preflight_slots + plan.canary_slots
                )
                if candidate.cell_id == prepared.replicated_cell_id
                and candidate.replicate_index == prepared.replicate_index
                and candidate.scenario_id == prepared.scenario_id
            ),
            None,
        )
        if slot is None:
            raise VBDJointStructureError("prepared replicated slot is off plan")
        case = generate_vbd_joint_replicated_dataset(
            cell_id=prepared.replicated_cell_id,
            replicate_index=prepared.replicate_index,
            dataset_seed=prepared.seed,
        )
        expected = prepare_vbd_joint_replicated_dataset(case, slot=slot)
    else:
        raise VBDJointStructureError("prepared source profile is off plan")
    for name in (
        "dataset_hash",
        "synthetic_scenario",
        "seed",
        "source_profile",
        "generator_version",
        "replicated_cell_id",
        "replicate_index",
        "scenario_id",
        "plan_hash",
        "alignment_receipt_hash",
        "freeze_receipt_hash",
        "control_names",
        "model_input_hash",
        "context_binding_hash",
        "prepared_input_hash",
    ):
        if getattr(prepared, name) != getattr(expected, name):
            raise VBDJointStructureError(f"prepared {name} is off the frozen projection")
    for name in _PREPARED_ARRAY_FIELDS:
        values = getattr(prepared, name)
        expected_values = getattr(expected, name)
        if type(values) is not np.ndarray:
            raise VBDJointStructureError(f"prepared {name} has an invalid type")
        if values.flags.owndata or values.flags.writeable:
            raise VBDJointStructureError(f"prepared {name} storage is mutable")
        if values.dtype != expected_values.dtype or values.shape != expected_values.shape:
            raise VBDJointStructureError(f"prepared {name} geometry is invalid")
        if not np.array_equal(values, expected_values, equal_nan=True):
            raise VBDJointStructureError(f"prepared {name} is off the frozen projection")
