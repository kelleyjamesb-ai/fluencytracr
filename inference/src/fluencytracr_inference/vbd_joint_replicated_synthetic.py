"""V4 replicated synthetic cases for the VBD joint proof.

This module is a validation-only generator.  It deliberately does not change
the V3 generator, model, preparation contract, or product surfaces.  A V4
case is a thin, hash-bound envelope around the existing aggregate record types
with a closed cell identity and a master dataset seed.

The random streams are keyed by ``(master seed, component)`` rather than by
call order.  This preserves common random numbers across cells and prevents a
new component from shifting every later component.  The omitted confounder is
used only while generating the omitted-confounder cell and is never emitted.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
import hashlib
import math
from typing import Iterable

import numpy as np

from .hashing import sha256_json
from .vbd_joint_replicated_validation_plan import (
    VBD_JOINT_REPLICATED_CELLS,
    VBD_JOINT_REPLICATED_DATASET_SEEDS,
    VBD_JOINT_REPLICATED_RUNTIME_CANARY_DATASET_SEED,
    VBDJointReplicatedValidationSlot,
)
from .vbd_joint_synthetic import generate_vbd_joint_synthetic_dataset
from .vbd_joint_types import (
    VBD_JOINT_BEHAVIOR_BASIS,
    VBD_JOINT_CAPABILITY_FACTOR,
    VBD_JOINT_CAPABILITY_INNOVATION_STANDARD_DEVIATION,
    VBD_JOINT_CAPABILITY_STANDARD_ERROR,
    VBD_JOINT_CONTROL_NAMES,
    VBD_JOINT_ELIGIBLE_FAMILIES,
    VBD_JOINT_GENERATOR_ID,
    VBD_JOINT_OUTCOME_FAMILY,
    VBD_JOINT_OUTCOME_STANDARD_ERROR,
    VBD_JOINT_PANEL_COUNT,
    VBD_JOINT_POST_WINDOWS,
    VBD_JOINT_PRE_WINDOWS,
    VBD_JOINT_TRUTH,
    VBD_JOINT_WINDOW_COUNT,
    VBDJointAlignmentReceipt,
    VBDJointCapabilityObservation,
    VBDJointCheckpoint,
    VBDJointControlObservation,
    VBDJointFreezeReceipt,
    VBDJointOutcomeObservation,
    VBDJointStructureError,
    VBDJointSyntheticDataset,
    VBDJointTransition,
    vbd_joint_freeze_hashes,
    vbd_joint_outcome_access_receipt_hash,
)


VBD_JOINT_REPLICATED_GENERATOR_VERSION = "v0_4_0"
VBD_JOINT_REPLICATED_INPUT_SCHEMA = "FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_V4"
VBD_JOINT_REPLICATED_HIGH_ERROR_CAPABILITY_STANDARD_ERROR = 0.30
VBD_JOINT_REPLICATED_CONFOUNDER_AR_RHO = 0.50
VBD_JOINT_REPLICATED_CONFOUNDER_INNOVATION_STANDARD_DEVIATION = math.sqrt(0.75)
VBD_JOINT_REPLICATED_SUPPORTED_CELLS = tuple(VBD_JOINT_REPLICATED_CELLS) + (
    "runtime_canary",
)

_COMPONENTS = (
    "capability_latent",
    "capability_observation_error",
    "demand",
    "initial_embedding",
    "retention",
    "new_embedding",
    "active_nonembedded",
    "outcome_panel_intercept",
    "outcome_residual",
    "outcome_observation_error",
    "omitted_common_cause",
)


class VBDJointReplicatedSyntheticError(VBDJointStructureError):
    """Raised when a V4 generator request is outside the frozen protocol."""


def _exact_int(name: str, value: object, minimum: int = 0) -> int:
    if type(value) is not int or value < minimum:
        raise VBDJointReplicatedSyntheticError(f"{name} must be an integer >= {minimum}")
    return value


def _component_seed(master_seed: int, component: str) -> int:
    if component not in _COMPONENTS:
        raise VBDJointReplicatedSyntheticError("component is outside the frozen generator")
    digest = hashlib.sha256(
        f"{VBD_JOINT_REPLICATED_INPUT_SCHEMA}|{master_seed}|{component}".encode()
    ).digest()
    # NumPy's PCG64 accepts the positive 63-bit range on every supported build.
    return int.from_bytes(digest[:8], "big") & ((1 << 63) - 1) or 1


def _rngs(master_seed: int) -> dict[str, np.random.Generator]:
    return {
        component: np.random.default_rng(_component_seed(master_seed, component))
        for component in _COMPONENTS
    }


def _component_commitment(master_seed: int) -> str:
    return sha256_json(
        {
            "schema": VBD_JOINT_REPLICATED_INPUT_SCHEMA,
            "master_seed": master_seed,
            "components": [
                {"name": component, "seed": _component_seed(master_seed, component)}
                for component in _COMPONENTS
            ],
        }
    )


def _logistic(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def _hash_records(records: Iterable[object]) -> str:
    return sha256_json([record.to_hash_body() for record in records])


def _scenario_truth(cell_id: str) -> dict[str, float]:
    if cell_id == "behavior_pathway_null":
        return {
            **VBD_JOINT_TRUTH,
            "capability_retention": 0.0,
            "capability_embedding": 0.0,
            "capability_active_nonembedded": 0.0,
            "outcome_embedded": 0.0,
            "outcome_active_nonembedded": 0.0,
            "outcome_capability_by_embedded": 0.0,
        }
    return dict(VBD_JOINT_TRUTH)


def _expected_seed(cell_id: str, replicate_index: int | None) -> int:
    if cell_id == "runtime_canary":
        if replicate_index is not None:
            raise VBDJointReplicatedSyntheticError("canary has no replicate index")
        return VBD_JOINT_REPLICATED_RUNTIME_CANARY_DATASET_SEED
    if cell_id not in VBD_JOINT_REPLICATED_CELLS:
        raise VBDJointReplicatedSyntheticError("cell is outside the frozen protocol")
    _exact_int("replicate_index", replicate_index, minimum=0)
    if replicate_index >= len(VBD_JOINT_REPLICATED_DATASET_SEEDS):
        raise VBDJointReplicatedSyntheticError("replicate index is outside the frozen protocol")
    return VBD_JOINT_REPLICATED_DATASET_SEEDS[replicate_index]


def _make_plan(template: VBDJointSyntheticDataset, capability_se: float):
    plan = template.plan
    capability_definition_hash = sha256_json(
        {
            "factor": VBD_JOINT_CAPABILITY_FACTOR,
            "measurement_family": "normal_known_standard_error",
            "standard_error": capability_se,
            "aggregate_only": True,
        }
    )
    plan = replace(
        plan,
        analysis_unit_id="vbd_joint_synthetic_v4",
        capability_definition_hash=capability_definition_hash,
        model_specification_hash=sha256_json(
            {
                "model_family": "vbd_human_behavior_outcome_joint_model",
                "model_version": "0.3.0",
                "validation_generator_version": VBD_JOINT_REPLICATED_GENERATOR_VERSION,
                "behavior_basis": list(VBD_JOINT_BEHAVIOR_BASIS),
                **vbd_joint_freeze_hashes(),
            }
        ),
        outcome_access_receipt_hash="0" * 64,
    )
    return replace(plan, outcome_access_receipt_hash=vbd_joint_outcome_access_receipt_hash(plan))


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedSyntheticDataset:
    """A V4 dataset envelope with no emitted latent or family-level values."""

    dataset: VBDJointSyntheticDataset
    cell_id: str
    replicate_index: int | None
    scenario_id: str
    dataset_seed: int
    capability_standard_error: float
    omitted_confounder_present: bool
    component_commitment: str
    truth: tuple[tuple[str, float], ...]

    def __post_init__(self) -> None:
        if type(self.dataset) is not VBDJointSyntheticDataset:
            raise VBDJointReplicatedSyntheticError("dataset must use the exact joint dataset type")
        if self.cell_id not in VBD_JOINT_REPLICATED_SUPPORTED_CELLS:
            raise VBDJointReplicatedSyntheticError("cell is outside the frozen protocol")
        expected = _expected_seed(self.cell_id, self.replicate_index)
        if self.dataset_seed != expected:
            raise VBDJointReplicatedSyntheticError("dataset seed does not bind cell and replicate")
        expected_scenario = f"{self.cell_id}:replicate={self.replicate_index}"
        if self.scenario_id != expected_scenario:
            raise VBDJointReplicatedSyntheticError("scenario ID is not canonical")
        _exact_int("dataset_seed", self.dataset_seed, minimum=1)
        if self.dataset.seed != self.dataset_seed:
            raise VBDJointReplicatedSyntheticError("inner dataset seed is not bound")
        if self.dataset.generator_version != VBD_JOINT_REPLICATED_GENERATOR_VERSION:
            raise VBDJointReplicatedSyntheticError("inner generator version is not V4")
        expected_inner_scenario = (
            "behavior_pathway_null"
            if self.cell_id == "behavior_pathway_null"
            else "primary"
        )
        if self.dataset.synthetic_scenario != expected_inner_scenario:
            raise VBDJointReplicatedSyntheticError("inner scenario is not bound")
        if self.capability_standard_error not in (
            VBD_JOINT_CAPABILITY_STANDARD_ERROR,
            VBD_JOINT_REPLICATED_HIGH_ERROR_CAPABILITY_STANDARD_ERROR,
        ):
            raise VBDJointReplicatedSyntheticError("capability standard error is off plan")
        if type(self.omitted_confounder_present) is not bool:
            raise VBDJointReplicatedSyntheticError("omitted confounder flag is invalid")
        if self.omitted_confounder_present != (
            self.cell_id == "omitted_confounder_stress"
        ):
            raise VBDJointReplicatedSyntheticError("omitted confounder flag is not bound")
        if self.component_commitment != _component_commitment(self.dataset_seed):
            raise VBDJointReplicatedSyntheticError("component commitment is invalid")
        if type(self.truth) is not tuple or any(
            type(item) is not tuple or len(item) != 2 for item in self.truth
        ):
            raise VBDJointReplicatedSyntheticError("truth commitment is invalid")
        expected_truth = tuple(
            sorted(_scenario_truth(self.cell_id).items())
        )
        if self.truth != expected_truth:
            raise VBDJointReplicatedSyntheticError("truth is not bound to the frozen cell")

    @property
    def checkpoints(self):
        return self.dataset.checkpoints

    @property
    def transitions(self):
        return self.dataset.transitions

    @property
    def capability_observations(self):
        return self.dataset.capability_observations

    @property
    def outcome_observations(self):
        return self.dataset.outcome_observations

    @property
    def control_observations(self):
        return self.dataset.control_observations

    @property
    def alignment_receipt(self):
        return self.dataset.alignment_receipt

    @property
    def freeze_receipt(self):
        return self.dataset.freeze_receipt

    @property
    def registry_audit(self):
        return self.dataset.registry_audit

    @property
    def plan(self):
        return self.dataset.plan

    @property
    def synthetic_scenario(self):
        return self.dataset.synthetic_scenario

    @property
    def generator_version(self):
        return self.dataset.generator_version

    @property
    def synthetic_only(self):
        return self.dataset.synthetic_only

    def content_hash(self) -> str:
        return sha256_json(
            {
                "input_schema": VBD_JOINT_REPLICATED_INPUT_SCHEMA,
                "generator_version": VBD_JOINT_REPLICATED_GENERATOR_VERSION,
                "cell_id": self.cell_id,
                "replicate_index": self.replicate_index,
                "scenario_id": self.scenario_id,
                "dataset_seed": self.dataset_seed,
                "capability_standard_error": self.capability_standard_error,
                "omitted_confounder_present": self.omitted_confounder_present,
                "component_commitment": self.component_commitment,
                "truth": [[name, value] for name, value in self.truth],
                "dataset_hash": self.dataset.content_hash(),
            }
        )


def _build_case_records(
    template: VBDJointSyntheticDataset,
    *,
    cell_id: str,
    dataset_seed: int,
    capability_se: float,
) -> tuple[
    tuple[VBDJointCheckpoint, ...],
    tuple[VBDJointTransition, ...],
    tuple[VBDJointCapabilityObservation, ...],
    tuple[VBDJointOutcomeObservation, ...],
    tuple[VBDJointControlObservation, ...],
]:
    rng = _rngs(dataset_seed)
    truth = _scenario_truth(cell_id)
    omitted = cell_id == "omitted_confounder_stress"
    checkpoints: list[VBDJointCheckpoint] = []
    transitions: list[VBDJointTransition] = []
    capabilities: list[VBDJointCapabilityObservation] = []
    outcomes: list[VBDJointOutcomeObservation] = []
    controls: list[VBDJointControlObservation] = []
    expected_embedded_by_panel: list[list[float]] = []
    expected_active_by_panel: list[list[float]] = []
    latent_by_panel: list[np.ndarray] = []
    controls_by_panel: list[dict[str, np.ndarray]] = []
    omitted_by_panel: list[np.ndarray] = []

    # Shared component streams are consumed in the same order for every cell.
    for panel in range(VBD_JOINT_PANEL_COUNT):
        capability_latent = np.asarray(
            [
                float(rng["capability_latent"].normal(0.0, VBD_JOINT_CAPABILITY_INNOVATION_STANDARD_DEVIATION))
                + 0.035 * t
                + (0.30 if t >= VBD_JOINT_PRE_WINDOWS else 0.0)
                for t in range(VBD_JOINT_WINDOW_COUNT)
            ],
            dtype=float,
        )
        latent_by_panel.append(capability_latent)
        observed = capability_latent + rng["capability_observation_error"].normal(
            0.0, capability_se, VBD_JOINT_WINDOW_COUNT
        )
        for t in range(VBD_JOINT_WINDOW_COUNT):
            template_record = template.capability_observations[
                panel * VBD_JOINT_WINDOW_COUNT + t
            ]
            capabilities.append(
                replace(
                    template_record,
                    observed_value=float(observed[t]),
                    standard_error=capability_se,
                    measurement_model_hash="",
                )
            )

        seasonality = np.asarray(
            [math.sin(2.0 * math.pi * t / 12.0) for t in range(VBD_JOINT_WINDOW_COUNT)],
            dtype=float,
        )
        demand = np.asarray(
            [
                -0.45
                + 0.05 * t
                + 0.10 * panel
                + float(rng["demand"].normal(0.0, 0.04))
                for t in range(VBD_JOINT_WINDOW_COUNT)
            ],
            dtype=float,
        )
        controls_by_panel.append(
            {"seasonality_index": seasonality, "customer_demand_index": demand}
        )

        omitted_common_cause = np.zeros(VBD_JOINT_WINDOW_COUNT, dtype=float)
        if omitted:
            omitted_common_cause[0] = float(rng["omitted_common_cause"].normal(0.0, 1.0))
            for t in range(1, VBD_JOINT_WINDOW_COUNT):
                omitted_common_cause[t] = (
                    VBD_JOINT_REPLICATED_CONFOUNDER_AR_RHO * omitted_common_cause[t - 1]
                    + VBD_JOINT_REPLICATED_CONFOUNDER_INNOVATION_STANDARD_DEVIATION
                    * float(rng["omitted_common_cause"].normal(0.0, 1.0))
                )
        omitted_by_panel.append(omitted_common_cause)

        embedded = {
            f"synthetic-private-{panel}-{index}"
            for index, draw in enumerate(
                rng["initial_embedding"].random(VBD_JOINT_ELIGIBLE_FAMILIES)
            )
            if draw < 0.18
        }
        previous_embedded = set(embedded)
        expected_embedded: list[float] = []
        expected_active: list[float] = []
        panel_checkpoints: list[VBDJointCheckpoint] = []
        for t in range(VBD_JOINT_WINDOW_COUNT):
            if t == 0:
                retained = set(previous_embedded)
                newly = set()
                lapsed = set()
                retention_probability = 0.0
                embedding_probability = 0.0
            else:
                lagged_capability = float(capability_latent[t - 1])
                confounder = float(omitted_common_cause[t])
                retention_probability = _logistic(
                    1.35
                    + truth["capability_retention"] * lagged_capability
                    + 0.10 * panel
                    + 0.50 * confounder
                )
                embedding_probability = _logistic(
                    -2.15
                    + truth["capability_embedding"] * lagged_capability
                    + 0.045 * t
                    + (0.30 if t >= VBD_JOINT_PRE_WINDOWS else 0.0)
                    + 0.50 * confounder
                )
                ordered_previous = sorted(previous_embedded)
                retained = {
                    member
                    for member, draw in zip(
                        ordered_previous,
                        rng["retention"].random(len(ordered_previous)),
                    )
                    if draw < retention_probability
                }
                lapsed = previous_embedded - retained
                previously_nonembedded = sorted(
                    set(
                        f"synthetic-private-{panel}-{index}"
                        for index in range(VBD_JOINT_ELIGIBLE_FAMILIES)
                    )
                    - previous_embedded
                )
                newly = {
                    member
                    for member, draw in zip(
                        previously_nonembedded,
                        rng["new_embedding"].random(len(previously_nonembedded)),
                    )
                    if draw < embedding_probability
                }
                embedded = retained | newly
            nonembedded = set(
                f"synthetic-private-{panel}-{index}"
                for index in range(VBD_JOINT_ELIGIBLE_FAMILIES)
            ) - embedded
            lagged_capability = float(capability_latent[max(0, t - 1)])
            active_probability = _logistic(
                -0.55
                + truth["capability_active_nonembedded"] * lagged_capability
                + 0.035 * t
                + 0.50 * float(omitted_common_cause[t])
            )
            ordered_nonembedded = sorted(nonembedded)
            active = {
                member
                for member, draw in zip(
                    ordered_nonembedded,
                    rng["active_nonembedded"].random(len(ordered_nonembedded)),
                )
                if draw < active_probability
            }
            expected_embedded.append(
                len(embedded) / VBD_JOINT_ELIGIBLE_FAMILIES
                if t == 0
                else expected_embedded[-1] * retention_probability
                + (1.0 - expected_embedded[-1]) * embedding_probability
            )
            expected_active.append(
                len(active) / VBD_JOINT_ELIGIBLE_FAMILIES
                if t == 0
                else active_probability * (1.0 - expected_embedded[-1])
            )
            template_checkpoint = template.checkpoints[
                panel * VBD_JOINT_WINDOW_COUNT + t
            ]
            checkpoint = replace(
                template_checkpoint,
                active_count=len(embedded) + len(active),
                embedded_count=len(embedded),
            )
            checkpoints.append(checkpoint)
            panel_checkpoints.append(checkpoint)
            if t > 0:
                previous_checkpoint = panel_checkpoints[t - 1]
                transitions.append(
                    VBDJointTransition(
                        panel_index=panel,
                        transition_index=t,
                        previous_checkpoint_hash=previous_checkpoint.record_hash,
                        current_checkpoint_hash=checkpoint.record_hash,
                        eligible_count=VBD_JOINT_ELIGIBLE_FAMILIES,
                        retained_count=len(retained),
                        newly_embedded_count=len(newly),
                        lapsed_count=len(lapsed),
                        remaining_nonembedded_count=(
                            VBD_JOINT_ELIGIBLE_FAMILIES
                            - len(previous_embedded)
                            - len(newly)
                        ),
                        intersection_receipt_hash=sha256_json(
                            {
                                "panel": panel,
                                "transition": t,
                                "previous": previous_checkpoint.record_hash,
                                "current": checkpoint.record_hash,
                                "aggregate_derivation_only": True,
                            }
                        ),
                    )
                )
            previous_embedded = set(embedded)
        expected_embedded_by_panel.append(expected_embedded)
        expected_active_by_panel.append(expected_active)

    for panel in range(VBD_JOINT_PANEL_COUNT):
        residual = 0.0
        panel_intercept = float(rng["outcome_panel_intercept"].normal(0.0, 0.20))
        for t in range(VBD_JOINT_WINDOW_COUNT):
            residual = 0.35 * residual + float(rng["outcome_residual"].normal(0.0, 0.10))
            lag = max(0, t - 1)
            expected_embedded = expected_embedded_by_panel[panel][lag]
            expected_active = expected_active_by_panel[panel][lag]
            capability = float(latent_by_panel[panel][lag])
            outcome_mean = (
                panel_intercept
                + 0.025 * t
                + 0.35 * controls_by_panel[panel]["seasonality_index"][t]
                - 0.25 * controls_by_panel[panel]["customer_demand_index"][t]
                + truth["outcome_embedded"] * expected_embedded
                + truth["outcome_active_nonembedded"] * expected_active
                + truth["outcome_capability"] * capability
                + truth["outcome_capability_by_embedded"] * capability * expected_embedded
                + residual
            )
            # The common cause is intentionally generator-only.  Its lagged
            # contribution is applied here without being added to any record.
            if cell_id == "omitted_confounder_stress":
                outcome_mean += 0.20 * omitted_by_panel[panel][max(0, t - 1)]
            observed = outcome_mean + float(
                rng["outcome_observation_error"].normal(0.0, VBD_JOINT_OUTCOME_STANDARD_ERROR)
            )
            template_outcome = template.outcome_observations[
                panel * VBD_JOINT_WINDOW_COUNT + t
            ]
            outcomes.append(replace(template_outcome, observed_value=float(observed)))
            for control_name in VBD_JOINT_CONTROL_NAMES:
                template_control = next(
                    item
                    for item in template.control_observations
                    if item.panel_index == panel
                    and item.checkpoint_index == t
                    and item.control_name == control_name
                )
                controls.append(
                    replace(
                        template_control,
                        observed_value=float(controls_by_panel[panel][control_name][t]),
                    )
                )

    return (
        tuple(checkpoints),
        tuple(transitions),
        tuple(capabilities),
        tuple(outcomes),
        tuple(controls),
    )


def generate_vbd_joint_replicated_dataset(
    *,
    cell_id: str,
    replicate_index: int | None = None,
    dataset_seed: int | None = None,
) -> VBDJointReplicatedSyntheticDataset:
    """Generate one exact V4 case from the frozen cell and seed manifest."""

    expected_seed = _expected_seed(cell_id, replicate_index)
    if dataset_seed is not None and dataset_seed != expected_seed:
        raise VBDJointReplicatedSyntheticError("dataset seed does not match the cell manifest")
    dataset_seed = expected_seed
    if cell_id == "runtime_canary":
        dgp_cell = "primary"
    else:
        dgp_cell = cell_id
    template = generate_vbd_joint_synthetic_dataset(scenario="primary")
    capability_se = (
        VBD_JOINT_REPLICATED_HIGH_ERROR_CAPABILITY_STANDARD_ERROR
        if cell_id == "high_capability_error"
        else VBD_JOINT_CAPABILITY_STANDARD_ERROR
    )
    records = _build_case_records(
        template,
        cell_id=dgp_cell,
        dataset_seed=dataset_seed,
        capability_se=capability_se,
    )
    plan = _make_plan(template, capability_se)
    checkpoints, transitions, capabilities, outcomes, controls = records
    capabilities = tuple(
        replace(item, measurement_model_hash=plan.capability_definition_hash)
        for item in capabilities
    )
    dataset = VBDJointSyntheticDataset(
        plan=plan,
        checkpoints=checkpoints,
        transitions=transitions,
        capability_observations=capabilities,
        outcome_observations=outcomes,
        control_observations=controls,
        alignment_receipt=VBDJointAlignmentReceipt(
            plan_hash=plan.plan_hash,
            checkpoint_root=_hash_records(checkpoints),
            transition_root=_hash_records(transitions),
            capability_root=_hash_records(capabilities),
            outcome_root=_hash_records(outcomes),
            control_root=_hash_records(controls),
            outcome_access_receipt_hash=plan.outcome_access_receipt_hash,
            exact_scope_alignment=True,
            exact_window_alignment=True,
            outcome_accessed_before_freeze=False,
        ),
        freeze_receipt=VBDJointFreezeReceipt(
            plan_hash=plan.plan_hash,
            frozen_at=template.freeze_receipt.frozen_at,
            frozen_before_outcome_access=True,
            **vbd_joint_freeze_hashes(),
        ),
        registry_audit=template.registry_audit,
        synthetic_scenario=("behavior_pathway_null" if dgp_cell == "behavior_pathway_null" else "primary"),
        generator_id=VBD_JOINT_GENERATOR_ID,
        generator_version=VBD_JOINT_REPLICATED_GENERATOR_VERSION,
        seed=dataset_seed,
    )
    truth = _scenario_truth(dgp_cell)
    return VBDJointReplicatedSyntheticDataset(
        dataset=dataset,
        cell_id=cell_id,
        replicate_index=replicate_index,
        scenario_id=f"{cell_id}:replicate={replicate_index}",
        dataset_seed=dataset_seed,
        capability_standard_error=capability_se,
        omitted_confounder_present=cell_id == "omitted_confounder_stress",
        component_commitment=_component_commitment(dataset_seed),
        truth=tuple(sorted(truth.items())),
    )


def generate_vbd_joint_replicated_synthetic_dataset(**kwargs):
    """Compatibility alias with the longer protocol naming."""

    return generate_vbd_joint_replicated_dataset(**kwargs)


def validate_vbd_joint_replicated_dataset(
    case: VBDJointReplicatedSyntheticDataset,
) -> None:
    """Recompute the generator and require exact record and envelope hashes."""

    if type(case) is not VBDJointReplicatedSyntheticDataset:
        raise VBDJointReplicatedSyntheticError("case must use the exact V4 envelope type")
    expected = generate_vbd_joint_replicated_dataset(
        cell_id=case.cell_id,
        replicate_index=case.replicate_index,
        dataset_seed=case.dataset_seed,
    )
    if case.content_hash() != expected.content_hash():
        raise VBDJointReplicatedSyntheticError("case does not match deterministic regeneration")


def generate_vbd_joint_replicated_case_for_slot(
    slot: VBDJointReplicatedValidationSlot,
) -> VBDJointReplicatedSyntheticDataset:
    """Generate exactly the dataset identity named by one frozen plan slot."""

    if type(slot) is not VBDJointReplicatedValidationSlot:
        raise VBDJointReplicatedSyntheticError("slot must use the exact frozen slot type")
    case = generate_vbd_joint_replicated_dataset(
        cell_id=slot.cell_id,
        replicate_index=slot.replicate_index,
        dataset_seed=slot.dataset_seed,
    )
    if case.scenario_id != slot.scenario_id:
        raise VBDJointReplicatedSyntheticError("generated case does not bind the slot scenario")
    return case


__all__ = [
    "VBD_JOINT_REPLICATED_GENERATOR_VERSION",
    "VBD_JOINT_REPLICATED_INPUT_SCHEMA",
    "VBD_JOINT_REPLICATED_HIGH_ERROR_CAPABILITY_STANDARD_ERROR",
    "VBD_JOINT_REPLICATED_CONFOUNDER_AR_RHO",
    "VBD_JOINT_REPLICATED_CONFOUNDER_INNOVATION_STANDARD_DEVIATION",
    "VBDJointReplicatedSyntheticDataset",
    "VBDJointReplicatedSyntheticError",
    "generate_vbd_joint_replicated_dataset",
    "generate_vbd_joint_replicated_synthetic_dataset",
    "generate_vbd_joint_replicated_case_for_slot",
    "validate_vbd_joint_replicated_dataset",
]
