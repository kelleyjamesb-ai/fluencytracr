"""Frozen, sampler-free V4 replicated validation plan.

This module contains only immutable identities and hash-bound manifests. It
does not generate observations, initialize a random generator, or run a fit.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
import re
from .hashing import sha256_json


VBD_JOINT_REPLICATED_PROTOCOL_ID = "FT_VBD_JOINT_REPLICATED_VALIDATION_V4"
VBD_JOINT_REPLICATED_INPUT_SCHEMA = "FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_V4"
VBD_JOINT_REPLICATED_GENERATOR_VERSION = "v0_4_0"
VBD_JOINT_REPLICATED_VALIDATION_VERSION = "0.3.1"
VBD_JOINT_REPLICATED_ARTIFACT_SCHEMA = (
    "FT_VBD_JOINT_REPLICATED_VALIDATION_SUMMARY_V4"
)

VBD_JOINT_REPLICATED_CELLS = (
    "primary",
    "behavior_pathway_null",
    "omitted_confounder_stress",
    "high_capability_error",
)
VBD_JOINT_REPLICATED_VARIANTS = ("full", "restricted")
VBD_JOINT_REPLICATED_NAMESPACES = (
    "preflight",
    "runtime_canary",
    "qualifying",
)
VBD_JOINT_REPLICATED_STATES = ("COMPLETE", "HOLD")
VBD_JOINT_REPLICATED_FAILURE_CODES = (
    "NONE",
    "CLAIM_COLLISION",
    "IDENTITY_MISMATCH",
    "RUNTIME_MISMATCH",
    "DATASET_REGENERATION_FAILURE",
    "PREPARATION_HOLD",
    "SAMPLER_TIMEOUT",
    "SAMPLER_ERROR",
    "DIAGNOSTIC_HOLD",
    "SUMMARY_NONFINITE",
    "ARTIFACT_REJECTED",
    "INTERRUPTED_OR_AMBIGUOUS",
)

VBD_JOINT_REPLICATED_REPLICATES = 100
VBD_JOINT_REPLICATED_DATASET_SEED_START = 202_610_000
VBD_JOINT_REPLICATED_DATASET_SEEDS = tuple(
    VBD_JOINT_REPLICATED_DATASET_SEED_START + index
    for index in range(VBD_JOINT_REPLICATED_REPLICATES)
)
VBD_JOINT_REPLICATED_RUNTIME_CANARY_DATASET_SEED = 202_619_999
VBD_JOINT_REPLICATED_CHUNK_COUNT = VBD_JOINT_REPLICATED_REPLICATES
VBD_JOINT_REPLICATED_WORKERS = 4
VBD_JOINT_REPLICATED_PER_FIT_TIMEOUT_SECONDS = 2 * 60 * 60
VBD_JOINT_REPLICATED_STUDY_TIMEOUT_SECONDS = 14 * 24 * 60 * 60

VBD_JOINT_REPLICATED_QUALIFYING_BASES = {
    ("primary", "full"): 302_610_000,
    ("primary", "restricted"): 312_610_000,
    ("behavior_pathway_null", "full"): 322_610_000,
    ("behavior_pathway_null", "restricted"): 332_610_000,
    ("omitted_confounder_stress", "full"): 342_610_000,
    ("high_capability_error", "full"): 352_610_000,
}
VBD_JOINT_REPLICATED_PREFLIGHT_BASES = {
    ("primary", "full"): 402_610_000,
    ("primary", "restricted"): 412_610_000,
    ("behavior_pathway_null", "full"): 422_610_000,
    ("behavior_pathway_null", "restricted"): 432_610_000,
    ("omitted_confounder_stress", "full"): 442_610_000,
    ("high_capability_error", "full"): 452_610_000,
}
VBD_JOINT_REPLICATED_CANARY_BASES = {
    ("runtime_canary", "full"): 362_619_990,
    ("runtime_canary", "restricted"): 372_619_990,
}

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_SAFE_ID_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class VBDJointReplicatedPlanError(ValueError):
    """Raised when the frozen replicated validation plan is malformed."""


def _safe_id(name: str, value: object) -> str:
    if type(value) is not str or _SAFE_ID_RE.fullmatch(value) is None:
        raise VBDJointReplicatedPlanError(f"{name} is not a closed identifier")
    return value


def _slot_id(name: str, value: object) -> str:
    if type(value) is not str or not value or len(value) > 255:
        raise VBDJointReplicatedPlanError(f"{name} is not a valid slot identity")
    return value


def _sha(name: str, value: object) -> str:
    if type(value) is not str or _SHA256_RE.fullmatch(value) is None:
        raise VBDJointReplicatedPlanError(f"{name} is not a SHA-256 hash")
    return value


def _exact_int(name: str, value: object, minimum: int = 0) -> int:
    if type(value) is not int or value < minimum:
        raise VBDJointReplicatedPlanError(f"{name} is not an integer >= {minimum}")
    return value


def _finite(name: str, value: object, *, positive: bool = False) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise VBDJointReplicatedPlanError(f"{name} is not finite")
    result = float(value)
    if not math.isfinite(result) or (positive and result <= 0.0):
        raise VBDJointReplicatedPlanError(f"{name} is not finite and valid")
    return result


def _assert_closed(value: object, allowed: tuple[str, ...], name: str) -> str:
    if type(value) is not str or value not in allowed:
        raise VBDJointReplicatedPlanError(f"{name} is outside the frozen enum")
    return value


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedValidationSlot:
    namespace: str
    cell_id: str
    replicate_index: int | None
    scenario_id: str
    variant: str
    dataset_seed: int
    sampler_seed_base: int
    chains: int
    draws: int
    tune: int
    target_accept: float
    max_treedepth: int

    def __post_init__(self) -> None:
        _assert_closed(self.namespace, VBD_JOINT_REPLICATED_NAMESPACES, "namespace")
        if self.namespace == "runtime_canary":
            _safe_id("cell_id", self.cell_id)
            if self.cell_id != "runtime_canary" or self.replicate_index is not None:
                raise VBDJointReplicatedPlanError("canary identity is invalid")
        else:
            _assert_closed(self.cell_id, VBD_JOINT_REPLICATED_CELLS, "cell_id")
            if type(self.replicate_index) is not int or not (
                0 <= self.replicate_index < VBD_JOINT_REPLICATED_REPLICATES
            ):
                raise VBDJointReplicatedPlanError("replicate index is off plan")
        if self.variant not in VBD_JOINT_REPLICATED_VARIANTS:
            raise VBDJointReplicatedPlanError("variant is off plan")
        if self.cell_id in {"omitted_confounder_stress", "high_capability_error"}:
            if self.variant != "full":
                raise VBDJointReplicatedPlanError("sensitivity cells require full fits")
        _exact_int("dataset_seed", self.dataset_seed, minimum=1)
        _exact_int("sampler_seed_base", self.sampler_seed_base, minimum=1)
        _exact_int("chains", self.chains, minimum=1)
        _exact_int("draws", self.draws, minimum=1)
        _exact_int("tune", self.tune, minimum=1)
        _finite("target_accept", self.target_accept)
        if not 0.0 < self.target_accept < 1.0:
            raise VBDJointReplicatedPlanError("target_accept is outside (0,1)")
        _exact_int("max_treedepth", self.max_treedepth, minimum=1)
        if len(self.chain_seeds) != self.chains:
            raise VBDJointReplicatedPlanError("chain seed count does not match chains")
        if len(set(self.chain_seeds)) != len(self.chain_seeds):
            raise VBDJointReplicatedPlanError("chain seeds collide")

    @property
    def slot_id(self) -> str:
        replicate = "none" if self.replicate_index is None else str(self.replicate_index)
        return f"{self.namespace}/{self.cell_id}/{replicate}/{self.variant}"

    @property
    def chain_seeds(self) -> tuple[int, ...]:
        return tuple(self.sampler_seed_base + index for index in range(self.chains))

    def body_without_hash(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "namespace": self.namespace,
            "cell_id": self.cell_id,
            "replicate_index": self.replicate_index,
            "scenario_id": self.scenario_id,
            "variant": self.variant,
            "dataset_seed": self.dataset_seed,
            "sampler_seed_base": self.sampler_seed_base,
            "chain_seeds": list(self.chain_seeds),
            "chains": self.chains,
            "draws": self.draws,
            "tune": self.tune,
            "target_accept": self.target_accept,
            "max_treedepth": self.max_treedepth,
        }

    @property
    def slot_hash(self) -> str:
        return sha256_json(self.body_without_hash())

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "slot_hash": self.slot_hash}


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedValidationChunk:
    chunk_index: int
    slot_ids: tuple[str, ...]
    slot_hashes: tuple[str, ...]

    def __post_init__(self) -> None:
        if type(self.chunk_index) is not int or not (
            0 <= self.chunk_index < VBD_JOINT_REPLICATED_CHUNK_COUNT
        ):
            raise VBDJointReplicatedPlanError("chunk index is off plan")
        if type(self.slot_ids) is not tuple or type(self.slot_hashes) is not tuple:
            raise VBDJointReplicatedPlanError("chunk fields must be tuples")
        if len(self.slot_ids) != 6 or len(self.slot_hashes) != 6:
            raise VBDJointReplicatedPlanError("each chunk must contain six qualifying slots")
        if any(type(item) is not str for item in self.slot_ids + self.slot_hashes):
            raise VBDJointReplicatedPlanError("chunk identity fields are invalid")

    @property
    def chunk_id(self) -> str:
        return f"qualifying/chunk/{self.chunk_index:03d}"

    def body_without_hash(self) -> dict:
        return {
            "chunk_id": self.chunk_id,
            "chunk_index": self.chunk_index,
            "slot_ids": list(self.slot_ids),
            "slot_hashes": list(self.slot_hashes),
        }

    @property
    def chunk_hash(self) -> str:
        return sha256_json(self.body_without_hash())

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "chunk_hash": self.chunk_hash}


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedValidationClaim:
    namespace: str
    slot_id: str
    scenario_id: str
    variant: str
    dataset_seed: int
    chain_seeds: tuple[int, ...]
    slot_hash: str
    plan_hash: str
    source_commit: str
    runtime_manifest_hash: str
    started_at: str
    deadline_at: str
    claim_hash: str

    def __post_init__(self) -> None:
        _assert_closed(self.namespace, VBD_JOINT_REPLICATED_NAMESPACES, "namespace")
        _slot_id("slot_id", self.slot_id)
        if type(self.scenario_id) is not str or not self.scenario_id:
            raise VBDJointReplicatedPlanError("scenario ID is invalid")
        _assert_closed(self.variant, VBD_JOINT_REPLICATED_VARIANTS, "variant")
        _exact_int("dataset_seed", self.dataset_seed, minimum=1)
        if type(self.chain_seeds) is not tuple or not self.chain_seeds:
            raise VBDJointReplicatedPlanError("chain seeds are invalid")
        if any(type(seed) is not int or seed <= 0 for seed in self.chain_seeds):
            raise VBDJointReplicatedPlanError("chain seeds are invalid")
        if len(set(self.chain_seeds)) != len(self.chain_seeds):
            raise VBDJointReplicatedPlanError("chain seeds collide")
        for name, value in (
            ("slot_hash", self.slot_hash),
            ("plan_hash", self.plan_hash),
            ("runtime_manifest_hash", self.runtime_manifest_hash),
        ):
            _sha(name, value)
        if type(self.source_commit) is not str or not re.fullmatch(
            r"[0-9a-f]{40,64}", self.source_commit
        ):
            raise VBDJointReplicatedPlanError("source commit is not a full hash")
        for name, value in (("started_at", self.started_at), ("deadline_at", self.deadline_at)):
            if type(value) is not str or not value:
                raise VBDJointReplicatedPlanError(f"{name} is invalid")
        if self.claim_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedPlanError("claim hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "namespace": self.namespace,
            "slot_id": self.slot_id,
            "scenario_id": self.scenario_id,
            "variant": self.variant,
            "dataset_seed": self.dataset_seed,
            "chain_seeds": list(self.chain_seeds),
            "slot_hash": self.slot_hash,
            "plan_hash": self.plan_hash,
            "source_commit": self.source_commit,
            "runtime_manifest_hash": self.runtime_manifest_hash,
            "started_at": self.started_at,
            "deadline_at": self.deadline_at,
        }


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedValidationDisposition:
    namespace: str
    slot_id: str
    claim_hash: str
    state: str
    failure_code: str
    result_hash: str
    disposition_hash: str

    def __post_init__(self) -> None:
        _assert_closed(self.namespace, VBD_JOINT_REPLICATED_NAMESPACES, "namespace")
        if self.state not in VBD_JOINT_REPLICATED_STATES:
            raise VBDJointReplicatedPlanError("disposition state is off plan")
        _assert_closed(
            self.failure_code, VBD_JOINT_REPLICATED_FAILURE_CODES, "failure_code"
        )
        _sha("claim_hash", self.claim_hash)
        _sha("result_hash", self.result_hash)
        if self.state == "COMPLETE" and self.failure_code != "NONE":
            raise VBDJointReplicatedPlanError("complete disposition has a failure")
        if self.state == "HOLD" and self.failure_code == "NONE":
            raise VBDJointReplicatedPlanError("held disposition lacks a failure")
        if self.disposition_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedPlanError("disposition hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "namespace": self.namespace,
            "slot_id": self.slot_id,
            "claim_hash": self.claim_hash,
            "state": self.state,
            "failure_code": self.failure_code,
            "result_hash": self.result_hash,
        }


def _sampler_profile(*, full: bool) -> tuple[int, int, int, float, int]:
    if full:
        return (4, 1_000, 1_000, 0.95, 12)
    return (2, 300, 300, 0.90, 10)


def _slot(
    *, namespace: str, cell_id: str, replicate_index: int | None, variant: str,
    dataset_seed: int, sampler_seed_base: int, full: bool,
) -> VBDJointReplicatedValidationSlot:
    chains, draws, tune, target_accept, max_treedepth = _sampler_profile(full=full)
    scenario_id = f"{cell_id}:replicate={replicate_index}"
    return VBDJointReplicatedValidationSlot(
        namespace=namespace,
        cell_id=cell_id,
        replicate_index=replicate_index,
        scenario_id=scenario_id,
        variant=variant,
        dataset_seed=dataset_seed,
        sampler_seed_base=sampler_seed_base,
        chains=chains,
        draws=draws,
        tune=tune,
        target_accept=target_accept,
        max_treedepth=max_treedepth,
    )


def _qualifying_slots() -> tuple[VBDJointReplicatedValidationSlot, ...]:
    slots = []
    for replicate_index, dataset_seed in enumerate(VBD_JOINT_REPLICATED_DATASET_SEEDS):
        for cell_id in VBD_JOINT_REPLICATED_CELLS:
            variants = ("full", "restricted") if cell_id in {
                "primary", "behavior_pathway_null"
            } else ("full",)
            for variant in variants:
                base = VBD_JOINT_REPLICATED_QUALIFYING_BASES[(cell_id, variant)]
                slots.append(
                    _slot(
                        namespace="qualifying",
                        cell_id=cell_id,
                        replicate_index=replicate_index,
                        variant=variant,
                        dataset_seed=dataset_seed,
                        sampler_seed_base=base + 10 * replicate_index,
                        full=True,
                    )
                )
    return tuple(slots)


def _preflight_slots() -> tuple[VBDJointReplicatedValidationSlot, ...]:
    slots = []
    for cell_id in VBD_JOINT_REPLICATED_CELLS:
        variants = ("full", "restricted") if cell_id in {
            "primary", "behavior_pathway_null"
        } else ("full",)
        for variant in variants:
            slots.append(
                _slot(
                    namespace="preflight",
                    cell_id=cell_id,
                    replicate_index=0,
                    variant=variant,
                    dataset_seed=VBD_JOINT_REPLICATED_DATASET_SEEDS[0],
                    sampler_seed_base=VBD_JOINT_REPLICATED_PREFLIGHT_BASES[(cell_id, variant)],
                    full=False,
                )
            )
    return tuple(slots)


def _canary_slots() -> tuple[VBDJointReplicatedValidationSlot, ...]:
    return tuple(
        _slot(
            namespace="runtime_canary",
            cell_id="runtime_canary",
            replicate_index=None,
            variant=variant,
            dataset_seed=VBD_JOINT_REPLICATED_RUNTIME_CANARY_DATASET_SEED,
            sampler_seed_base=base,
            full=True,
        )
        for variant, base in (("full", 362_619_990), ("restricted", 372_619_990))
    )


def _chunks(slots: tuple[VBDJointReplicatedValidationSlot, ...]) -> tuple[VBDJointReplicatedValidationChunk, ...]:
    by_replicate: dict[int, list[VBDJointReplicatedValidationSlot]] = {}
    for slot in slots:
        assert slot.replicate_index is not None
        by_replicate.setdefault(slot.replicate_index, []).append(slot)
    chunks = []
    for replicate_index in range(VBD_JOINT_REPLICATED_REPLICATES):
        replicate_slots = tuple(by_replicate[replicate_index])
        chunks.append(
            VBDJointReplicatedValidationChunk(
                chunk_index=replicate_index,
                slot_ids=tuple(slot.slot_id for slot in replicate_slots),
                slot_hashes=tuple(slot.slot_hash for slot in replicate_slots),
            )
        )
    return tuple(chunks)


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedValidationPlan:
    qualifying_slots: tuple[VBDJointReplicatedValidationSlot, ...]
    preflight_slots: tuple[VBDJointReplicatedValidationSlot, ...]
    canary_slots: tuple[VBDJointReplicatedValidationSlot, ...]
    chunks: tuple[VBDJointReplicatedValidationChunk, ...]
    plan_hash: str

    def __post_init__(self) -> None:
        if len(self.qualifying_slots) != 600:
            raise VBDJointReplicatedPlanError("qualifying slot count is not 600")
        if len(self.preflight_slots) != 6 or len(self.canary_slots) != 2:
            raise VBDJointReplicatedPlanError("preflight or canary count is invalid")
        if len(self.chunks) != VBD_JOINT_REPLICATED_CHUNK_COUNT:
            raise VBDJointReplicatedPlanError("chunk count is invalid")
        all_slots = self.qualifying_slots + self.preflight_slots + self.canary_slots
        if len({slot.slot_id for slot in all_slots}) != len(all_slots):
            raise VBDJointReplicatedPlanError("slot IDs collide")
        all_chain_seeds = [seed for slot in all_slots for seed in slot.chain_seeds]
        if len(set(all_chain_seeds)) != len(all_chain_seeds):
            raise VBDJointReplicatedPlanError("sampler seeds collide")
        if self.plan_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedPlanError("plan hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "protocol_id": VBD_JOINT_REPLICATED_PROTOCOL_ID,
            "input_schema": VBD_JOINT_REPLICATED_INPUT_SCHEMA,
            "generator_version": VBD_JOINT_REPLICATED_GENERATOR_VERSION,
            "validation_version": VBD_JOINT_REPLICATED_VALIDATION_VERSION,
            "artifact_schema": VBD_JOINT_REPLICATED_ARTIFACT_SCHEMA,
            "replicate_count": VBD_JOINT_REPLICATED_REPLICATES,
            "workers": VBD_JOINT_REPLICATED_WORKERS,
            "per_fit_timeout_seconds": VBD_JOINT_REPLICATED_PER_FIT_TIMEOUT_SECONDS,
            "study_timeout_seconds": VBD_JOINT_REPLICATED_STUDY_TIMEOUT_SECONDS,
            "qualifying_slots": [slot.to_dict() for slot in self.qualifying_slots],
            "preflight_slots": [slot.to_dict() for slot in self.preflight_slots],
            "canary_slots": [slot.to_dict() for slot in self.canary_slots],
            "chunks": [chunk.to_dict() for chunk in self.chunks],
            "all_authorization_flags_false": True,
            "automatic_retries": False,
            "raw_exception_text_allowed": False,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "plan_hash": self.plan_hash}


def _build_plan() -> VBDJointReplicatedValidationPlan:
    qualifying = _qualifying_slots()
    preflight = _preflight_slots()
    canaries = _canary_slots()
    chunks = _chunks(qualifying)
    body = {
        "protocol_id": VBD_JOINT_REPLICATED_PROTOCOL_ID,
        "input_schema": VBD_JOINT_REPLICATED_INPUT_SCHEMA,
        "generator_version": VBD_JOINT_REPLICATED_GENERATOR_VERSION,
        "validation_version": VBD_JOINT_REPLICATED_VALIDATION_VERSION,
        "artifact_schema": VBD_JOINT_REPLICATED_ARTIFACT_SCHEMA,
        "replicate_count": VBD_JOINT_REPLICATED_REPLICATES,
        "workers": VBD_JOINT_REPLICATED_WORKERS,
        "per_fit_timeout_seconds": VBD_JOINT_REPLICATED_PER_FIT_TIMEOUT_SECONDS,
        "study_timeout_seconds": VBD_JOINT_REPLICATED_STUDY_TIMEOUT_SECONDS,
        "qualifying_slots": [slot.to_dict() for slot in qualifying],
        "preflight_slots": [slot.to_dict() for slot in preflight],
        "canary_slots": [slot.to_dict() for slot in canaries],
        "chunks": [chunk.to_dict() for chunk in chunks],
        "all_authorization_flags_false": True,
        "automatic_retries": False,
        "raw_exception_text_allowed": False,
    }
    return VBDJointReplicatedValidationPlan(
        qualifying_slots=qualifying,
        preflight_slots=preflight,
        canary_slots=canaries,
        chunks=chunks,
        plan_hash=sha256_json(body),
    )


_PLAN = _build_plan()


def vbd_joint_replicated_validation_plan() -> VBDJointReplicatedValidationPlan:
    """Return the immutable V4 plan without executing any model code."""

    return _PLAN


def validate_replicated_slot_manifest(
    namespace: str, slot_ids: tuple[str, ...]
) -> None:
    """Require an exact namespace-specific manifest with no cross-root mixing."""

    _assert_closed(namespace, VBD_JOINT_REPLICATED_NAMESPACES, "namespace")
    if type(slot_ids) is not tuple or any(type(item) is not str for item in slot_ids):
        raise VBDJointReplicatedPlanError("slot manifest must be a tuple of strings")
    expected = {
        "qualifying": tuple(slot.slot_id for slot in _PLAN.qualifying_slots),
        "preflight": tuple(slot.slot_id for slot in _PLAN.preflight_slots),
        "runtime_canary": tuple(slot.slot_id for slot in _PLAN.canary_slots),
    }[namespace]
    if slot_ids != expected:
        raise VBDJointReplicatedPlanError("slot manifest is incomplete or cross-bound")


def validate_seed_manifest() -> None:
    """Recheck all dataset and sampler seed uniqueness commitments."""

    slots = (
        _PLAN.qualifying_slots + _PLAN.preflight_slots + _PLAN.canary_slots
    )
    dataset_bindings = [
        (slot.namespace, slot.cell_id, slot.replicate_index, slot.dataset_seed)
        for slot in slots
    ]
    if len(set(dataset_bindings)) != 405:
        raise VBDJointReplicatedPlanError("dataset bindings are incomplete or collide")
    chain_bindings = [
        (slot.namespace, slot.slot_id, seed)
        for slot in slots
        for seed in slot.chain_seeds
    ]
    if len({item[2] for item in chain_bindings}) != len(chain_bindings):
        raise VBDJointReplicatedPlanError("chain seed bindings collide")


def validate_claim_for_slot(
    claim: VBDJointReplicatedValidationClaim,
    slot: VBDJointReplicatedValidationSlot,
    plan_hash: str,
) -> None:
    """Require a create-once claim to bind every frozen slot identity."""

    if type(claim) is not VBDJointReplicatedValidationClaim:
        raise VBDJointReplicatedPlanError("claim type is invalid")
    if type(slot) is not VBDJointReplicatedValidationSlot:
        raise VBDJointReplicatedPlanError("slot type is invalid")
    _sha("plan_hash", plan_hash)
    expected = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "scenario_id": slot.scenario_id,
        "variant": slot.variant,
        "dataset_seed": slot.dataset_seed,
        "chain_seeds": slot.chain_seeds,
        "slot_hash": slot.slot_hash,
        "plan_hash": plan_hash,
    }
    for name, value in expected.items():
        if getattr(claim, name) != value:
            raise VBDJointReplicatedPlanError(f"claim {name} does not bind the slot")


def validate_disposition_for_claim(
    disposition: VBDJointReplicatedValidationDisposition,
    claim: VBDJointReplicatedValidationClaim,
) -> None:
    """Require one disposition to bind exactly one immutable claim."""

    if type(disposition) is not VBDJointReplicatedValidationDisposition:
        raise VBDJointReplicatedPlanError("disposition type is invalid")
    if type(claim) is not VBDJointReplicatedValidationClaim:
        raise VBDJointReplicatedPlanError("claim type is invalid")
    if (
        disposition.namespace != claim.namespace
        or disposition.slot_id != claim.slot_id
        or disposition.claim_hash != claim.claim_hash
    ):
        raise VBDJointReplicatedPlanError("disposition does not bind the claim")
