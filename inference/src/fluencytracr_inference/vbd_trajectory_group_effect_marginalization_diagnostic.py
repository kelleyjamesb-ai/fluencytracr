"""Strict records for the permanently held group-effect marginalization diagnostic."""

from __future__ import annotations

from dataclasses import dataclass
import math

from .hashing import sha256_json
from .vbd_trajectory_concordance import (
    VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX,
    VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN,
)
from .vbd_trajectory_group_effect_marginalization_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_SCHEMA_VERSION,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SCHEMA_VERSION,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_SCHEMA_VERSION,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE,
    VbdTrajectoryGroupEffectMarginalizationCaseSpec,
    vbd_trajectory_group_effect_marginalization_case_body,
    vbd_trajectory_group_effect_marginalization_chain_seeds,
)
from .vbd_trajectory_group_effect_marginalization import (
    VbdGroupEffectMarginalizationPosteriorProjection,
    VbdReconstructedQuantityProjection,
    VbdSampledParameterProjection,
    validate_vbd_group_effect_marginalization_prepared_target,
)
from .vbd_trajectory_nuts import (
    VBD_TRAJECTORY_NUTS_BFMI_MIN,
    VBD_TRAJECTORY_NUTS_ESS_MIN,
    VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX,
    VBD_TRAJECTORY_NUTS_RHAT_MAX,
    vbd_nuts_execution_settings,
)
from .vbd_trajectory_state_space import (
    TrajectoryDeterministicCommonQuantityReference,
    TrajectoryIntegrationError,
    fit_vbd_trajectory_all_common_quantity_reference,
    vbd_trajectory_common_quantity_names,
)
from .vbd_trajectory_preparation import (
    TrajectoryPreparedInput,
    validate_prepared_vbd_trajectory,
)
from .vbd_trajectory_types import (
    TrajectoryObservationPanel,
    VBD_TRAJECTORY_GENERATOR_ID,
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_RNG_ID,
)
from .vbd_trajectory_statistics import TrajectoryPosteriorSummary


VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_FIT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_FIT_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLASSIFICATIONS = (
    "REJECT_GROUP_EFFECT_MARGINALIZATION_CANDIDATE",
    "SUPPORTED_FOR_LATER_REFERENCE_CONTRACT_AMENDMENT",
    "INVALID_HOLD",
)

_BINDING_KEYS = {
    "binding_kind",
    "case_ordinal",
    "effect_size_sd",
    "panel_group_count",
    "aggregate_k",
    "generator_seed",
    "scenario_id",
    "lane",
    "lane_ordinal",
    "plan_hash",
    "chain_seeds",
    "ppc_state",
    "acceptance_concordance_state",
    "acceptance_slot_key",
    "acceptance_evidence_eligible",
    "binding_hash",
}
_SAMPLED_INPUT_KEYS = {
    "parameter_name",
    "r_hat",
    "bulk_ess",
    "tail_ess",
    "posterior_mean_mcse_to_posterior_sd_ratio",
    "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio",
    "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio",
    "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio",
    "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio",
}
_SAMPLED_RECORD_KEYS = _SAMPLED_INPUT_KEYS | {
    "posterior_summary",
    "posterior_grid_shape",
    "posterior_value_count",
    "posterior_grid_commitment",
    "gate_results",
    "diagnostic_row_hash",
}
_CHANNEL_INPUT_KEYS = {
    "channel_name",
    "r_hat",
    "bulk_ess",
    "tail_ess",
    "mean_mcse_to_posterior_sd_ratio",
}
_CHANNEL_RECORD_KEYS = _CHANNEL_INPUT_KEYS | {
    "gate_results",
    "channel_diagnostic_hash",
}
_RECONSTRUCTED_INPUT_KEYS = {
    "quantity_name",
    "posterior_mean",
    "posterior_sd",
    "interval_80_lower",
    "interval_80_upper",
    "interval_99_lower",
    "interval_99_upper",
    "channel_diagnostic_rows",
}
_RECONSTRUCTED_RECORD_KEYS = {
    "quantity_name",
    "posterior_mean",
    "posterior_sd",
    "interval_80_lower",
    "interval_80_upper",
    "interval_99_lower",
    "interval_99_upper",
    "component_grid_shape",
    "component_count",
    "component_means_commitment",
    "component_variances_commitment",
    "component_grid_commitment",
    "mixture_summary_hash",
    "channel_order",
    "channel_diagnostic_rows",
    "gate_results",
    "conditional_components_emitted",
    "pseudo_draws_emitted",
    "conditional_mean_substitution",
    "reconstructed_row_hash",
}
_REFERENCE_INPUT_KEYS = {
    "quantity_name",
    "absolute_mean_difference_reference_sd",
    "interval_80_lower_endpoint_difference_reference_sd",
    "interval_80_upper_endpoint_difference_reference_sd",
    "interval_99_lower_endpoint_difference_reference_sd",
    "interval_99_upper_endpoint_difference_reference_sd",
    "primary_to_reference_sd_ratio",
}
_REFERENCE_RECORD_KEYS = _REFERENCE_INPUT_KEYS | {
    "candidate_summary",
    "reference_summary",
    "passed",
    "comparison_hash",
}
_FIT_KEYS = {
    "schema_version",
    "diagnostic_id",
    "binding",
    "source_provenance",
    "panel_hash",
    "ordered_panel_manifest_root",
    "prepared_input_hash",
    "model_input_hash",
    "deterministic_reference_hash",
    "deterministic_recomputation_hash",
    "deterministic_reference",
    "deterministic_recomputation",
    "sampled_posterior_provenance_root",
    "conditional_component_provenance_root",
    "sampled_parameter_order",
    "reconstructed_quantity_order",
    "common_quantity_order",
    "sampled_parameter_rows",
    "reconstructed_quantity_rows",
    "reference_comparisons",
    "post_warmup_divergences",
    "max_treedepth_saturation_count",
    "energy_bfmi_min",
    "gate_results",
    "raw_posterior_draws_emitted",
    "posterior_values_emitted",
    "conditional_components_emitted",
    "pseudo_draws_emitted",
    "latent_paths_emitted",
    "fit_record_hash",
}
_SOURCE_PROVENANCE_KEYS = {
    "case_ordinal",
    "effect_size_sd",
    "panel_group_count",
    "aggregate_k",
    "generator_seed",
    "scenario_id",
    "seed_namespace",
    "generator_id",
    "rng_id",
    "panel_hash",
    "ordered_panel_manifest_root",
    "prepared_input_hash",
    "model_input_hash",
    "posterior_grid_set_commitment",
    "reconstruction_provenance_root",
    "source_execution_provenance_state",
    "source_execution_provenance_verified",
    "source_projection_hash",
}
_RECORD_KEYS = {
    "schema_version",
    "diagnostic_id",
    "plan_hash",
    "seed_manifest_hash",
    "execution_state",
    "runner_completion_binding",
    "classification",
    "state",
    "hold_reasons",
    "matrix_complete",
    "fit_records",
    "sampled_parameter_row_count",
    "reconstructed_quantity_row_count",
    "channel_diagnostic_row_count",
    "reference_comparison_count",
    "ppc_state",
    "acceptance_concordance_state",
    "evidence_eligible",
    "acceptance_count_effect",
    "internal_only",
    "synthetic_only",
    "aggregate_only",
    "customer_output_authorized",
    "raw_posterior_draws_emitted",
    "posterior_values_emitted",
    "conditional_components_emitted",
    "pseudo_draws_emitted",
    "record_hash",
}


class VbdTrajectoryGroupEffectMarginalizationDiagnosticError(ValueError):
    """A marginalization plan, fit, or result record is malformed."""


@dataclass(frozen=True)
class VbdTrajectoryGroupEffectMarginalizationBinding:
    case_ordinal: int
    effect_size_sd: float
    panel_group_count: int
    aggregate_k: int
    generator_seed: int
    scenario_id: str
    lane: str
    lane_ordinal: int
    plan_hash: str
    chain_seeds: tuple[int, int, int, int]
    binding_hash: str

    def body_without_hash(self) -> dict:
        return {
            "binding_kind": "group_effect_marginalization_diagnostic_nonacceptance",
            "case_ordinal": self.case_ordinal,
            "effect_size_sd": float(self.effect_size_sd),
            "panel_group_count": self.panel_group_count,
            "aggregate_k": self.aggregate_k,
            "generator_seed": self.generator_seed,
            "scenario_id": self.scenario_id,
            "lane": self.lane,
            "lane_ordinal": self.lane_ordinal,
            "plan_hash": self.plan_hash,
            "chain_seeds": list(self.chain_seeds),
            "ppc_state": "NOT_RUN",
            "acceptance_concordance_state": "NOT_RUN",
            "acceptance_slot_key": None,
            "acceptance_evidence_eligible": False,
        }

    def __post_init__(self) -> None:
        if (
            type(self.case_ordinal) is not int
            or not 0 <= self.case_ordinal < len(
                VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
            )
        ):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "marginalization binding case is invalid"
            )
        case = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES[
            self.case_ordinal
        ]
        expected_seeds = vbd_trajectory_group_effect_marginalization_chain_seeds(
            case_ordinal=self.case_ordinal,
            lane_ordinal=self.lane_ordinal,
        )
        if (
            type(case) is not VbdTrajectoryGroupEffectMarginalizationCaseSpec
            or self.effect_size_sd != case.effect_size_sd
            or self.panel_group_count != case.panel_group_count
            or self.aggregate_k != case.aggregate_k
            or self.generator_seed != case.generator_seed
            or self.scenario_id != case.scenario_id
            or self.lane not in VBD_TRAJECTORY_LANES
            or type(self.lane_ordinal) is not int
            or not 0 <= self.lane_ordinal < len(VBD_TRAJECTORY_LANES)
            or VBD_TRAJECTORY_LANES[self.lane_ordinal] != self.lane
            or type(self.plan_hash) is not str
            or len(self.plan_hash) != 64
            or any(character not in "0123456789abcdef" for character in self.plan_hash)
            or type(self.chain_seeds) is not tuple
            or self.chain_seeds != expected_seeds
            or self.binding_hash != sha256_json(self.body_without_hash())
        ):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "marginalization binding is invalid"
            )


def build_vbd_trajectory_group_effect_marginalization_binding(
    *, case_ordinal: int, lane: str, lane_ordinal: int, plan_hash: str
) -> VbdTrajectoryGroupEffectMarginalizationBinding:
    if type(case_ordinal) is not int or not 0 <= case_ordinal < len(
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization binding case is invalid"
        )
    case = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES[case_ordinal]
    chain_seeds = vbd_trajectory_group_effect_marginalization_chain_seeds(
        case_ordinal=case_ordinal, lane_ordinal=lane_ordinal
    )
    values = {
        "case_ordinal": case.case_ordinal,
        "effect_size_sd": case.effect_size_sd,
        "panel_group_count": case.panel_group_count,
        "aggregate_k": case.aggregate_k,
        "generator_seed": case.generator_seed,
        "scenario_id": case.scenario_id,
        "lane": lane,
        "lane_ordinal": lane_ordinal,
        "plan_hash": plan_hash,
        "chain_seeds": chain_seeds,
    }
    body = {
        "binding_kind": "group_effect_marginalization_diagnostic_nonacceptance",
        **{key: value for key, value in values.items() if key != "chain_seeds"},
        "chain_seeds": list(chain_seeds),
        "ppc_state": "NOT_RUN",
        "acceptance_concordance_state": "NOT_RUN",
        "acceptance_slot_key": None,
        "acceptance_evidence_eligible": False,
    }
    return VbdTrajectoryGroupEffectMarginalizationBinding(
        **values, binding_hash=sha256_json(body)
    )


@dataclass(frozen=True, init=False)
class VbdTrajectoryGroupEffectMarginalizationReferenceLane:
    role: str
    role_binding_hash: str
    binding_hash: str
    prepared_input_hash: str
    model_input_hash: str
    semantic_reference: TrajectoryDeterministicCommonQuantityReference
    semantic_reference_hash: str
    envelope_hash: str

    def __new__(cls, *_args, **_kwargs):
        raise TypeError("deterministic reference lanes require independent computation")

    def to_dict(self) -> dict:
        return {
            "role": self.role,
            "role_binding_hash": self.role_binding_hash,
            "binding_hash": self.binding_hash,
            "prepared_input_hash": self.prepared_input_hash,
            "model_input_hash": self.model_input_hash,
            "semantic_reference": self.semantic_reference.to_dict(),
            "semantic_reference_hash": self.semantic_reference_hash,
            "envelope_hash": self.envelope_hash,
        }


@dataclass(frozen=True, init=False)
class VbdTrajectoryGroupEffectMarginalizationReferencePair:
    reference: VbdTrajectoryGroupEffectMarginalizationReferenceLane
    recomputation: VbdTrajectoryGroupEffectMarginalizationReferenceLane

    def __new__(cls, *_args, **_kwargs):
        raise TypeError("deterministic reference pairs require two engine invocations")


def _reference_lane(
    *, role: str, binding: VbdTrajectoryGroupEffectMarginalizationBinding,
    prepared: object, semantic_reference: TrajectoryDeterministicCommonQuantityReference,
) -> VbdTrajectoryGroupEffectMarginalizationReferenceLane:
    role_binding_hash = sha256_json(
        {
            "algorithm": "vbd_marginalization_reference_role_binding_v1",
            "role": role,
            "binding_hash": binding.binding_hash,
            "prepared_input_hash": prepared.prepared_input_hash,
            "model_input_hash": prepared.model_input_hash,
        }
    )
    body = {
        "role": role,
        "role_binding_hash": role_binding_hash,
        "binding_hash": binding.binding_hash,
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "semantic_reference": semantic_reference.to_dict(),
        "semantic_reference_hash": semantic_reference.reference_hash(),
    }
    lane = object.__new__(VbdTrajectoryGroupEffectMarginalizationReferenceLane)
    stored = {
        **body,
        "semantic_reference": semantic_reference,
        "envelope_hash": sha256_json(body),
    }
    for name, value in stored.items():
        object.__setattr__(lane, name, value)
    return lane


def build_vbd_trajectory_group_effect_marginalization_reference_pair(
    *, binding: VbdTrajectoryGroupEffectMarginalizationBinding,
    prepared: object, source_panel: object,
) -> VbdTrajectoryGroupEffectMarginalizationReferencePair:
    """Invoke the deterministic engine twice and bind role-distinct provenance."""

    if (
        type(binding) is not VbdTrajectoryGroupEffectMarginalizationBinding
        or getattr(prepared, "lane", None) != binding.lane
        or getattr(prepared, "panel_group_count", None) != binding.panel_group_count
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "deterministic reference pair binding is invalid"
        )
    reference = fit_vbd_trajectory_all_common_quantity_reference(prepared, source_panel)
    recomputation = fit_vbd_trajectory_all_common_quantity_reference(prepared, source_panel)
    if (
        type(reference) is not TrajectoryDeterministicCommonQuantityReference
        or type(recomputation) is not TrajectoryDeterministicCommonQuantityReference
        or reference is recomputation
        or reference.quantity_summaries is recomputation.quantity_summaries
        or any(
            left is right
            for left, right in zip(
                reference.quantity_summaries,
                recomputation.quantity_summaries,
                strict=True,
            )
        )
        or not _strict_json_equal(reference.to_dict(), recomputation.to_dict())
        or reference.reference_hash() != recomputation.reference_hash()
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "independent deterministic computations differ"
        )
    pair = object.__new__(VbdTrajectoryGroupEffectMarginalizationReferencePair)
    object.__setattr__(pair, "reference", _reference_lane(
        role="REFERENCE", binding=binding, prepared=prepared,
        semantic_reference=reference,
    ))
    object.__setattr__(pair, "recomputation", _reference_lane(
        role="FRESH_RECOMPUTATION", binding=binding, prepared=prepared,
        semantic_reference=recomputation,
    ))
    _validate_vbd_trajectory_group_effect_marginalization_reference_pair(
        pair,
        binding=binding,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        require_in_memory_engine_outputs=True,
    )
    return pair


def _validate_vbd_trajectory_group_effect_marginalization_reference_pair(
    pair: VbdTrajectoryGroupEffectMarginalizationReferencePair,
    *,
    binding: VbdTrajectoryGroupEffectMarginalizationBinding,
    prepared_input_hash: str,
    model_input_hash: str,
    require_in_memory_engine_outputs: bool = True,
) -> str:
    """Validate equal semantics and role binding without persisted execution claims."""

    if type(pair) is not VbdTrajectoryGroupEffectMarginalizationReferencePair:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "deterministic reference pair type is invalid"
        )
    reference = pair.reference
    recomputation = pair.recomputation
    for lane, role in (
        (reference, "REFERENCE"),
        (recomputation, "FRESH_RECOMPUTATION"),
    ):
        if type(lane) is not VbdTrajectoryGroupEffectMarginalizationReferenceLane:
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "deterministic reference lane type is invalid"
            )
        semantic = lane.semantic_reference
        expected_role_binding_hash = sha256_json(
            {
                "algorithm": "vbd_marginalization_reference_role_binding_v1",
                "role": role,
                "binding_hash": binding.binding_hash,
                "prepared_input_hash": prepared_input_hash,
                "model_input_hash": model_input_hash,
            }
        )
        body = {
            "role": role,
            "role_binding_hash": lane.role_binding_hash,
            "binding_hash": binding.binding_hash,
            "prepared_input_hash": prepared_input_hash,
            "model_input_hash": model_input_hash,
            "semantic_reference": semantic.to_dict(),
            "semantic_reference_hash": semantic.reference_hash(),
        }
        if (
            lane.role != role
            or lane.role_binding_hash != expected_role_binding_hash
            or lane.binding_hash != binding.binding_hash
            or lane.prepared_input_hash != prepared_input_hash
            or lane.model_input_hash != model_input_hash
            or type(semantic) is not TrajectoryDeterministicCommonQuantityReference
            or semantic.lane != binding.lane
            or semantic.panel_group_count != binding.panel_group_count
            or semantic.prepared_input_hash != prepared_input_hash
            or semantic.model_input_hash != model_input_hash
            or lane.semantic_reference_hash != semantic.reference_hash()
            or lane.envelope_hash != sha256_json(body)
        ):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "deterministic reference lane provenance is invalid"
            )
    if (
        reference is recomputation
        or reference.role_binding_hash == recomputation.role_binding_hash
        or reference.envelope_hash == recomputation.envelope_hash
        or (
            require_in_memory_engine_outputs
            and reference.semantic_reference is recomputation.semantic_reference
        )
        or (
            require_in_memory_engine_outputs
            and reference.semantic_reference.quantity_summaries
            is recomputation.semantic_reference.quantity_summaries
        )
        or (
            require_in_memory_engine_outputs
            and any(
                left is right
                for left, right in zip(
                    reference.semantic_reference.quantity_summaries,
                    recomputation.semantic_reference.quantity_summaries,
                    strict=True,
                )
            )
        )
        or not _strict_json_equal(
            reference.semantic_reference.to_dict(),
            recomputation.semantic_reference.to_dict(),
        )
        or reference.semantic_reference_hash
        != recomputation.semantic_reference_hash
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "deterministic reference and recomputation differ"
        )
    return reference.semantic_reference_hash


def validate_vbd_trajectory_group_effect_marginalization_reference_pair(
    pair: VbdTrajectoryGroupEffectMarginalizationReferencePair,
    *,
    binding: VbdTrajectoryGroupEffectMarginalizationBinding,
    prepared_input_hash: str,
    model_input_hash: str,
) -> str:
    """Validate a live factory pair and require distinct engine-output objects."""

    return _validate_vbd_trajectory_group_effect_marginalization_reference_pair(
        pair,
        binding=binding,
        prepared_input_hash=prepared_input_hash,
        model_input_hash=model_input_hash,
        require_in_memory_engine_outputs=True,
    )


def _require_exact_keys(value: object, expected: set[str], name: str) -> dict:
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            f"{name} shape is invalid"
        )
    return value


def _strict_json_equal(left: object, right: object) -> bool:
    if type(left) is not type(right):
        return False
    if type(left) is dict:
        return set(left) == set(right) and all(
            _strict_json_equal(left[key], right[key]) for key in left
        )
    if type(left) is list:
        return len(left) == len(right) and all(
            _strict_json_equal(a, b) for a, b in zip(left, right, strict=True)
        )
    return left == right


def _require_native_json(value: object, name: str) -> None:
    value_type = type(value)
    if value is None or value_type in (str, bool, int):
        return
    if value_type is float:
        if not math.isfinite(value):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                f"{name} contains a nonfinite float"
            )
        return
    if value_type is list:
        for item in value:
            _require_native_json(item, name)
        return
    if value_type is dict:
        if any(type(key) is not str for key in value):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                f"{name} contains a non-string key"
            )
        for item in value.values():
            _require_native_json(item, name)
        return
    raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
        f"{name} contains a non-JSON runtime type"
    )


def _strict_sha256(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 64
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            f"{name} is not a sha256"
        )
    return value


def _strict_float(
    value: object,
    name: str,
    *,
    positive: bool = False,
    nonnegative: bool = False,
) -> float:
    if type(value) is not float or not math.isfinite(value):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            f"{name} must be a finite float"
        )
    if positive and value <= 0.0:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            f"{name} must be positive"
        )
    if nonnegative and value < 0.0:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            f"{name} must be nonnegative"
        )
    return 0.0 if value == 0.0 else value


def _strict_nonnegative_int(value: object, name: str) -> int:
    if type(value) is not int or value < 0:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            f"{name} must be a nonnegative integer"
        )
    return value


def _summary_from_dict(value: object, expected_name: str) -> TrajectoryPosteriorSummary:
    record = _require_exact_keys(
        value,
        {
            "quantity_name",
            "posterior_mean",
            "posterior_sd",
            "credible_interval_80",
            "credible_interval_99",
        },
        "posterior summary",
    )
    interval_80 = _require_exact_keys(
        record["credible_interval_80"], {"lower", "upper"}, "80 interval"
    )
    interval_99 = _require_exact_keys(
        record["credible_interval_99"], {"lower", "upper"}, "99 interval"
    )
    if record["quantity_name"] != expected_name:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "posterior summary order is invalid"
        )
    try:
        summary = TrajectoryPosteriorSummary(
            quantity_name=expected_name,
            posterior_mean=_strict_float(record["posterior_mean"], "posterior mean"),
            posterior_sd=_strict_float(record["posterior_sd"], "posterior sd", positive=True),
            interval_80_lower=_strict_float(interval_80["lower"], "80 lower"),
            interval_80_upper=_strict_float(interval_80["upper"], "80 upper"),
            interval_99_lower=_strict_float(interval_99["lower"], "99 lower"),
            interval_99_upper=_strict_float(interval_99["upper"], "99 upper"),
        )
    except (TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "posterior summary is invalid"
        ) from exc
    if not _strict_json_equal(summary.to_dict(), record):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "posterior summary differs from reconstruction"
        )
    return summary


def _reference_from_dict(
    value: object,
) -> TrajectoryDeterministicCommonQuantityReference:
    record = _require_exact_keys(
        value,
        {
            "schema_version", "lane", "panel_group_count", "prepared_input_hash",
            "model_input_hash", "engine_kind", "quantity_order", "quantity_summaries",
            "legacy_fit_summary_hash", "posterior_support_emitted",
            "latent_paths_emitted", "reference_hash",
        },
        "deterministic reference",
    )
    try:
        names = vbd_trajectory_common_quantity_names(record["panel_group_count"])
        summaries = record["quantity_summaries"]
        if type(summaries) is not list or record["quantity_order"] != list(names):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "deterministic reference quantity order is invalid"
            )
        reference = TrajectoryDeterministicCommonQuantityReference(
            lane=record["lane"],
            panel_group_count=record["panel_group_count"],
            prepared_input_hash=record["prepared_input_hash"],
            model_input_hash=record["model_input_hash"],
            quantity_summaries=tuple(
                _summary_from_dict(summary, name)
                for summary, name in zip(summaries, names, strict=True)
            ),
            legacy_fit_summary_hash=record["legacy_fit_summary_hash"],
            engine_kind=record["engine_kind"],
        )
    except (TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "deterministic reference is invalid"
        ) from exc
    if not _strict_json_equal(reference.to_dict(), record):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "deterministic reference differs from reconstruction"
        )
    return reference


def _reference_lane_from_dict(
    value: object,
) -> VbdTrajectoryGroupEffectMarginalizationReferenceLane:
    record = _require_exact_keys(
        value,
        {
            "role", "role_binding_hash", "binding_hash", "prepared_input_hash",
            "model_input_hash", "semantic_reference", "semantic_reference_hash",
            "envelope_hash",
        },
        "deterministic reference lane",
    )
    semantic = _reference_from_dict(record["semantic_reference"])
    lane = object.__new__(VbdTrajectoryGroupEffectMarginalizationReferenceLane)
    for name in (
        "role", "role_binding_hash", "binding_hash", "prepared_input_hash",
        "model_input_hash", "semantic_reference_hash", "envelope_hash",
    ):
        object.__setattr__(lane, name, record[name])
    object.__setattr__(lane, "semantic_reference", semantic)
    return lane


def _reference_pair_from_dicts(
    reference_value: object, recomputation_value: object,
) -> VbdTrajectoryGroupEffectMarginalizationReferencePair:
    pair = object.__new__(VbdTrajectoryGroupEffectMarginalizationReferencePair)
    object.__setattr__(pair, "reference", _reference_lane_from_dict(reference_value))
    object.__setattr__(
        pair, "recomputation", _reference_lane_from_dict(recomputation_value)
    )
    return pair


def _case_plan_hash(case_ordinal: int) -> str:
    try:
        body = vbd_trajectory_group_effect_marginalization_case_body(
            case_ordinal
        )
    except (TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization case identity is invalid"
        ) from exc
    return sha256_json(body)


def _binding_to_dict(
    binding: VbdTrajectoryGroupEffectMarginalizationBinding,
) -> dict:
    return {**binding.body_without_hash(), "binding_hash": binding.binding_hash}


def _binding_from_dict(
    value: object,
) -> VbdTrajectoryGroupEffectMarginalizationBinding:
    record = _require_exact_keys(value, _BINDING_KEYS, "marginalization binding")
    if type(record["chain_seeds"]) is not list:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization binding chain seeds are invalid"
        )
    try:
        binding = build_vbd_trajectory_group_effect_marginalization_binding(
            case_ordinal=record["case_ordinal"],
            lane=record["lane"],
            lane_ordinal=record["lane_ordinal"],
            plan_hash=record["plan_hash"],
        )
    except (TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization binding is off plan"
        ) from exc
    if not _strict_json_equal(_binding_to_dict(binding), record):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization binding differs from its reconstruction"
        )
    return binding


def vbd_trajectory_group_effect_marginalization_seed_manifest() -> dict:
    """Return the exact four-case, twelve-fit, fifty-two-seed manifest."""

    cases = []
    for case in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES:
        case_plan_hash = _case_plan_hash(case.case_ordinal)
        lanes = []
        for lane_ordinal, lane in enumerate(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER
        ):
            binding = build_vbd_trajectory_group_effect_marginalization_binding(
                case_ordinal=case.case_ordinal,
                lane=lane,
                lane_ordinal=lane_ordinal,
                plan_hash=case_plan_hash,
            )
            lanes.append(
                {
                    "lane": lane,
                    "lane_ordinal": lane_ordinal,
                    "chain_seeds": list(binding.chain_seeds),
                    "binding_hash": binding.binding_hash,
                }
            )
        cases.append(
            {
                "case_ordinal": case.case_ordinal,
                "effect_size_sd": float(case.effect_size_sd),
                "panel_group_count": case.panel_group_count,
                "aggregate_k": case.aggregate_k,
                "generator_seed": case.generator_seed,
                "scenario_id": case.scenario_id,
                "case_plan_hash": case_plan_hash,
                "lanes": lanes,
            }
        )
    reserved = [
        *VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS,
        *VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS,
    ]
    if (
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER
        != VBD_TRAJECTORY_LANES
        or len(cases) != 4
        or len(reserved) != 52
        or len(set(reserved)) != 52
        or frozenset(reserved)
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization seed manifest constants drifted"
        )
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_SCHEMA_VERSION
        ),
        "diagnostic_id": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID
        ),
        "plan_ref": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF,
        "seed_namespace": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
        ),
        "case_order": [0, 1, 2, 3],
        "lane_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER
        ),
        "cases": cases,
        "reserved_seeds": reserved,
        "reserved_seed_count": 52,
        "exclusive_to_diagnostic": True,
        "acceptance_seed_count": 0,
        "state": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE,
        "hold_reason": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON
        ),
        "evidence_eligible": False,
    }
    return {**body, "seed_manifest_hash": sha256_json(body)}


def vbd_trajectory_group_effect_marginalization_plan() -> dict:
    """Return the frozen collapsed-target diagnostic plan."""

    seed_manifest = vbd_trajectory_group_effect_marginalization_seed_manifest()
    cases = []
    execution_order = []
    sequence_ordinal = 0
    reconstructed_count = 0
    reference_count = 0
    for case in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES:
        case_body = (
            vbd_trajectory_group_effect_marginalization_case_body(
                case.case_ordinal
            )
        )
        case_plan_hash = sha256_json(case_body)
        reconstructed_order = [
            *(f"u[{index}]" for index in range(case.panel_group_count)),
            "trajectory_movement",
        ]
        common_order = list(
            vbd_trajectory_common_quantity_names(case.panel_group_count)
        )
        cases.append(
            {
                "case_body": case_body,
                "case_plan_hash": case_plan_hash,
                "reconstructed_quantity_order": reconstructed_order,
                "common_quantity_order": common_order,
            }
        )
        for lane_ordinal, lane in enumerate(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER
        ):
            binding = build_vbd_trajectory_group_effect_marginalization_binding(
                case_ordinal=case.case_ordinal,
                lane=lane,
                lane_ordinal=lane_ordinal,
                plan_hash=case_plan_hash,
            )
            execution_order.append(
                {
                    "sequence_ordinal": sequence_ordinal,
                    "binding": _binding_to_dict(binding),
                }
            )
            sequence_ordinal += 1
            reconstructed_count += len(reconstructed_order)
            reference_count += len(common_order)
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_SCHEMA_VERSION
        ),
        "diagnostic_id": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID
        ),
        "plan_ref": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF,
        "seed_namespace": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
        ),
        "case_order": [0, 1, 2, 3],
        "lane_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER
        ),
        "posterior_variable_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER
        ),
        "reconstructed_channel_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER
        ),
        "cases": cases,
        "execution_order": execution_order,
        "required_fit_record_count": 12,
        "required_sampled_parameter_row_count": 60,
        "required_reconstructed_quantity_row_count": reconstructed_count,
        "required_channel_diagnostic_row_count": reconstructed_count * 5,
        "required_reference_comparison_count": reference_count,
        "sampler_settings": vbd_nuts_execution_settings("full").to_dict(),
        "compiled_gates": {
            "r_hat_max": VBD_TRAJECTORY_NUTS_RHAT_MAX,
            "bulk_ess_min": VBD_TRAJECTORY_NUTS_ESS_MIN,
            "tail_ess_min": VBD_TRAJECTORY_NUTS_ESS_MIN,
            "post_warmup_divergences_max": 0,
            "max_treedepth_saturation_count_max": 0,
            "energy_bfmi_min": VBD_TRAJECTORY_NUTS_BFMI_MIN,
            "max_mcse_to_posterior_sd_ratio": (
                VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX
            ),
            "mean_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD
            ),
            "interval_80_endpoint_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
            ),
            "interval_99_endpoint_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
            ),
            "sd_ratio_min": VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN,
            "sd_ratio_max": VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX,
        },
        "target_contract": {
            "basis_identity": "P=B B'=I-11'/C",
            "low_rank_identity": "R=K+D; U=sigma_u*A; W=I+U'R^-1U; V=R+UU'",
            "solve_method": "positive_definite_cholesky_only",
            "primary_target_evaluator_called": False,
            "fixed_effects_marginalized": False,
            "group_effect_prior_duplicated": False,
        },
        "classifications": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLASSIFICATIONS
        ),
        "ppc_state": "NOT_RUN",
        "acceptance_concordance_state": "NOT_RUN",
        "state": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE,
        "hold_reasons": [
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON
        ],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "raw_posterior_draws_emitted": False,
        "posterior_values_emitted": False,
        "conditional_components_emitted": False,
        "pseudo_draws_emitted": False,
        "seed_manifest_hash": seed_manifest["seed_manifest_hash"],
    }
    if (
        reconstructed_count != 120
        or reconstructed_count * 5 != 600
        or reference_count != 180
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization plan cardinalities drifted"
        )
    return {**body, "plan_hash": sha256_json(body)}


def _sampled_row(value: object, expected_name: str) -> dict:
    row = _require_exact_keys(value, _SAMPLED_INPUT_KEYS, "sampled parameter row")
    if row["parameter_name"] != expected_name or type(row["parameter_name"]) is not str:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "sampled parameter order is invalid"
        )
    r_hat = _strict_float(row["r_hat"], "sampled R-hat", positive=True)
    bulk = _strict_float(row["bulk_ess"], "sampled bulk ESS", nonnegative=True)
    tail = _strict_float(row["tail_ess"], "sampled tail ESS", nonnegative=True)
    mcse_names = (
        "posterior_mean_mcse_to_posterior_sd_ratio",
        "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio",
        "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio",
        "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio",
        "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio",
    )
    mcse = tuple(
        _strict_float(row[name], name, nonnegative=True) for name in mcse_names
    )
    gates = {
        "r_hat_passed": r_hat <= VBD_TRAJECTORY_NUTS_RHAT_MAX,
        "bulk_ess_passed": bulk >= VBD_TRAJECTORY_NUTS_ESS_MIN,
        "tail_ess_passed": tail >= VBD_TRAJECTORY_NUTS_ESS_MIN,
        "mcse_passed": all(
            item <= VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX for item in mcse
        ),
    }
    gates["passed"] = all(gates.values())
    body = {
        "parameter_name": expected_name,
        "r_hat": r_hat,
        "bulk_ess": bulk,
        "tail_ess": tail,
        **dict(zip(mcse_names, mcse, strict=True)),
        "gate_results": gates,
    }
    return {**body, "diagnostic_row_hash": sha256_json(body)}


def _channel_row(value: object, expected_name: str) -> dict:
    row = _require_exact_keys(value, _CHANNEL_INPUT_KEYS, "channel diagnostic row")
    if row["channel_name"] != expected_name or type(row["channel_name"]) is not str:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "channel diagnostic order is invalid"
        )
    r_hat = _strict_float(row["r_hat"], "channel R-hat", positive=True)
    bulk = _strict_float(row["bulk_ess"], "channel bulk ESS", nonnegative=True)
    tail = _strict_float(row["tail_ess"], "channel tail ESS", nonnegative=True)
    mcse = _strict_float(
        row["mean_mcse_to_posterior_sd_ratio"],
        "channel mean MCSE ratio",
        nonnegative=True,
    )
    gates = {
        "r_hat_passed": r_hat <= VBD_TRAJECTORY_NUTS_RHAT_MAX,
        "bulk_ess_passed": bulk >= VBD_TRAJECTORY_NUTS_ESS_MIN,
        "tail_ess_passed": tail >= VBD_TRAJECTORY_NUTS_ESS_MIN,
        "mcse_passed": mcse <= VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX,
    }
    gates["passed"] = all(gates.values())
    body = {
        "channel_name": expected_name,
        "r_hat": r_hat,
        "bulk_ess": bulk,
        "tail_ess": tail,
        "mean_mcse_to_posterior_sd_ratio": mcse,
        "gate_results": gates,
    }
    return {**body, "channel_diagnostic_hash": sha256_json(body)}


def _reconstructed_row(value: object, expected_name: str) -> dict:
    row = _require_exact_keys(
        value, _RECONSTRUCTED_INPUT_KEYS, "reconstructed quantity input"
    )
    if row["quantity_name"] != expected_name or type(row["quantity_name"]) is not str:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reconstructed quantity order is invalid"
        )
    summary_names = (
        "posterior_mean",
        "posterior_sd",
        "interval_80_lower",
        "interval_80_upper",
        "interval_99_lower",
        "interval_99_upper",
    )
    summary = {
        name: _strict_float(
            row[name],
            f"reconstructed {name}",
            positive=name == "posterior_sd",
        )
        for name in summary_names
    }
    if not (
        summary["interval_99_lower"]
        <= summary["interval_80_lower"]
        <= summary["interval_80_upper"]
        <= summary["interval_99_upper"]
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reconstructed mixture endpoints are unordered"
        )
    raw_channels = row["channel_diagnostic_rows"]
    if type(raw_channels) is not list or len(raw_channels) != 5:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reconstructed quantity must contain exactly five channels"
        )
    channels = [
        _channel_row(raw, name)
        for raw, name in zip(
            raw_channels,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER,
            strict=True,
        )
    ]
    passed = all(item["gate_results"]["passed"] for item in channels)
    mixture_summary_body = {"quantity_name": expected_name, **summary}
    body = {
        "quantity_name": expected_name,
        **summary,
        "component_grid_shape": [4, 20_000],
        "component_count": 80_000,
        "mixture_summary_hash": sha256_json(mixture_summary_body),
        "channel_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER
        ),
        "channel_diagnostic_rows": channels,
        "gate_results": {
            "all_channel_gates_passed": passed,
            "passed": passed,
        },
        "conditional_components_emitted": False,
        "pseudo_draws_emitted": False,
        "conditional_mean_substitution": False,
    }
    return {**body, "reconstructed_row_hash": sha256_json(body)}


def _reference_row(value: object, expected_name: str) -> dict:
    row = _require_exact_keys(value, _REFERENCE_INPUT_KEYS, "reference comparison")
    if row["quantity_name"] != expected_name or type(row["quantity_name"]) is not str:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reference comparison order is invalid"
        )
    mean = _strict_float(
        row["absolute_mean_difference_reference_sd"],
        "reference mean difference",
        nonnegative=True,
    )
    i80l = _strict_float(
        row["interval_80_lower_endpoint_difference_reference_sd"],
        "reference 80 lower difference",
        nonnegative=True,
    )
    i80u = _strict_float(
        row["interval_80_upper_endpoint_difference_reference_sd"],
        "reference 80 upper difference",
        nonnegative=True,
    )
    i99l = _strict_float(
        row["interval_99_lower_endpoint_difference_reference_sd"],
        "reference 99 lower difference",
        nonnegative=True,
    )
    i99u = _strict_float(
        row["interval_99_upper_endpoint_difference_reference_sd"],
        "reference 99 upper difference",
        nonnegative=True,
    )
    ratio = _strict_float(
        row["primary_to_reference_sd_ratio"],
        "reference SD ratio",
        positive=True,
    )
    passed = (
        mean <= VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD
        and i80l <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        and i80u <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        and i99l <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        and i99u <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        and VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN
        <= ratio
        <= VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX
    )
    body = {
        "quantity_name": expected_name,
        "absolute_mean_difference_reference_sd": mean,
        "interval_80_lower_endpoint_difference_reference_sd": i80l,
        "interval_80_upper_endpoint_difference_reference_sd": i80u,
        "interval_99_lower_endpoint_difference_reference_sd": i99l,
        "interval_99_upper_endpoint_difference_reference_sd": i99u,
        "primary_to_reference_sd_ratio": ratio,
        "passed": passed,
    }
    return {**body, "comparison_hash": sha256_json(body)}


def _sampled_projection_row(
    projection: VbdSampledParameterProjection, expected_name: str
) -> dict:
    if (
        type(projection) is not VbdSampledParameterProjection
        or type(projection.summary) is not TrajectoryPosteriorSummary
        or projection.summary.quantity_name != expected_name
        or projection.posterior_grid_shape != (4, 20_000)
        or projection.posterior_value_count != 80_000
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "sampled projection provenance is invalid"
        )
    commitment = _strict_sha256(
        projection.posterior_grid_commitment, "posterior grid commitment"
    )
    diagnostic = _sampled_row(projection.diagnostic_row, expected_name)
    body = {
        **{key: diagnostic[key] for key in _SAMPLED_INPUT_KEYS},
        "posterior_summary": projection.summary.to_dict(),
        "posterior_grid_shape": [4, 20_000],
        "posterior_value_count": 80_000,
        "posterior_grid_commitment": commitment,
        "gate_results": diagnostic["gate_results"],
    }
    return {**body, "diagnostic_row_hash": sha256_json(body)}


def _reconstructed_projection_row(
    projection: VbdReconstructedQuantityProjection, expected_name: str
) -> dict:
    if (
        type(projection) is not VbdReconstructedQuantityProjection
        or type(projection.summary) is not TrajectoryPosteriorSummary
        or projection.summary.quantity_name != expected_name
        or projection.component_grid_shape != (4, 20_000)
        or projection.component_count != 80_000
        or type(projection.channel_diagnostic_rows) is not tuple
        or len(projection.channel_diagnostic_rows) != 5
        or projection.conditional_components_emitted is not False
        or projection.pseudo_draws_emitted is not False
        or projection.conditional_mean_substitution is not False
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reconstructed projection provenance is invalid"
        )
    channels = [
        _channel_row(raw, name)
        for raw, name in zip(
            projection.channel_diagnostic_rows,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER,
            strict=True,
        )
    ]
    summary = projection.summary
    summary_values = {
        "posterior_mean": float(summary.posterior_mean),
        "posterior_sd": float(summary.posterior_sd),
        "interval_80_lower": float(summary.interval_80_lower),
        "interval_80_upper": float(summary.interval_80_upper),
        "interval_99_lower": float(summary.interval_99_lower),
        "interval_99_upper": float(summary.interval_99_upper),
    }
    passed = all(row["gate_results"]["passed"] for row in channels)
    body = {
        "quantity_name": expected_name,
        **summary_values,
        "component_grid_shape": [4, 20_000],
        "component_count": 80_000,
        "component_means_commitment": _strict_sha256(
            projection.component_means_commitment, "component means commitment"
        ),
        "component_variances_commitment": _strict_sha256(
            projection.component_variances_commitment,
            "component variances commitment",
        ),
        "component_grid_commitment": _strict_sha256(
            projection.component_grid_commitment, "component grid commitment"
        ),
        "mixture_summary_hash": sha256_json(
            {"quantity_name": expected_name, **summary_values}
        ),
        "channel_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER
        ),
        "channel_diagnostic_rows": channels,
        "gate_results": {
            "all_channel_gates_passed": passed,
            "passed": passed,
        },
        "conditional_components_emitted": False,
        "pseudo_draws_emitted": False,
        "conditional_mean_substitution": False,
    }
    return {**body, "reconstructed_row_hash": sha256_json(body)}


def _derived_reference_row(
    candidate: TrajectoryPosteriorSummary,
    reference: TrajectoryPosteriorSummary,
    expected_name: str,
) -> dict:
    if (
        type(candidate) is not TrajectoryPosteriorSummary
        or type(reference) is not TrajectoryPosteriorSummary
        or candidate.quantity_name != expected_name
        or reference.quantity_name != expected_name
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reference comparison summaries are invalid"
        )
    scale = float(reference.posterior_sd)
    raw = {
        "quantity_name": expected_name,
        "absolute_mean_difference_reference_sd": abs(
            float(candidate.posterior_mean) - float(reference.posterior_mean)
        ) / scale,
        "interval_80_lower_endpoint_difference_reference_sd": abs(
            float(candidate.interval_80_lower) - float(reference.interval_80_lower)
        ) / scale,
        "interval_80_upper_endpoint_difference_reference_sd": abs(
            float(candidate.interval_80_upper) - float(reference.interval_80_upper)
        ) / scale,
        "interval_99_lower_endpoint_difference_reference_sd": abs(
            float(candidate.interval_99_lower) - float(reference.interval_99_lower)
        ) / scale,
        "interval_99_upper_endpoint_difference_reference_sd": abs(
            float(candidate.interval_99_upper) - float(reference.interval_99_upper)
        ) / scale,
        "primary_to_reference_sd_ratio": (
            float(candidate.posterior_sd) / scale
        ),
    }
    derived = _reference_row(raw, expected_name)
    body = {
        **{key: derived[key] for key in _REFERENCE_INPUT_KEYS},
        "candidate_summary": candidate.to_dict(),
        "reference_summary": reference.to_dict(),
        "passed": derived["passed"],
    }
    return {**body, "comparison_hash": sha256_json(body)}


def _fit_source_provenance(
    *,
    binding: VbdTrajectoryGroupEffectMarginalizationBinding,
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
    posterior_projection: VbdGroupEffectMarginalizationPosteriorProjection,
) -> dict:
    """Derive one in-memory source projection from the canonical panel relationship."""

    try:
        validate_prepared_vbd_trajectory(prepared, source_panel)
        validate_vbd_group_effect_marginalization_prepared_target(
            prepared,
            expected_model_input_hash=posterior_projection.model_input_hash,
            expected_prepared_input_hash=posterior_projection.prepared_input_hash,
        )
        panel_body = source_panel.to_dict()
    except (AttributeError, TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit source relationship is invalid"
        ) from exc
    case = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES[
        binding.case_ordinal
    ]
    expected_seed_root = sha256_json(
        {
            "seed_namespace": (
                VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
            ),
            "seed": case.generator_seed,
            "generator_id": VBD_TRAJECTORY_GENERATOR_ID,
            "rng_id": VBD_TRAJECTORY_RNG_ID,
            "acceptance_slot_key": None,
        }
    )
    if (
        type(prepared) is not TrajectoryPreparedInput
        or type(source_panel) is not TrajectoryObservationPanel
        or type(posterior_projection)
        is not VbdGroupEffectMarginalizationPosteriorProjection
        or prepared.lane != binding.lane
        or prepared.panel_group_count != case.panel_group_count
        or prepared.aggregate_k != case.aggregate_k
        or prepared.study_plan_root != binding.plan_hash
        or prepared.ordered_panel_manifest_root
        != source_panel.ordered_panel_manifest_root
        or prepared.seed_manifest_root != source_panel.seed_manifest_root
        or posterior_projection.lane != binding.lane
        or posterior_projection.panel_group_count != case.panel_group_count
        or posterior_projection.prepared_input_hash != prepared.prepared_input_hash
        or posterior_projection.model_input_hash != prepared.model_input_hash
        or source_panel.panel_group_count != case.panel_group_count
        or source_panel.aggregate_k != case.aggregate_k
        or source_panel.scenario_id != case.scenario_id
        or source_panel.seed != case.generator_seed
        or source_panel.seed_namespace
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
        or source_panel.generator_id != VBD_TRAJECTORY_GENERATOR_ID
        or source_panel.rng_id != VBD_TRAJECTORY_RNG_ID
        or source_panel.seed_manifest_root != expected_seed_root
        or source_panel.study_plan_root != binding.plan_hash
        or source_panel.direction_vector != (1, 1, 1)
        or source_panel.synthetic_only is not True
        or source_panel.aggregate_only is not True
        or source_panel.real_data_present is not False
        or source_panel.customer_data_present is not False
        or source_panel.production_data_present is not False
        or source_panel.live_data_source_present is not False
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit source identity is off plan"
        )
    derived_panel_hash = sha256_json(panel_body)
    _strict_sha256(derived_panel_hash, "derived panel hash")
    _strict_sha256(
        source_panel.ordered_panel_manifest_root,
        "derived ordered panel manifest root",
    )
    body = {
        "case_ordinal": case.case_ordinal,
        "effect_size_sd": case.effect_size_sd,
        "panel_group_count": case.panel_group_count,
        "aggregate_k": case.aggregate_k,
        "generator_seed": case.generator_seed,
        "scenario_id": case.scenario_id,
        "seed_namespace": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE,
        "generator_id": VBD_TRAJECTORY_GENERATOR_ID,
        "rng_id": VBD_TRAJECTORY_RNG_ID,
        "panel_hash": None,
        "ordered_panel_manifest_root": None,
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "posterior_grid_set_commitment": (
            posterior_projection.posterior_grid_set_commitment
        ),
        "reconstruction_provenance_root": (
            posterior_projection.reconstruction_provenance_root
        ),
        "source_execution_provenance_state": "NOT_RUN",
        "source_execution_provenance_verified": False,
        "source_projection_hash": None,
    }
    return body


def _validate_fit_source_provenance(
    value: object,
    *,
    binding: VbdTrajectoryGroupEffectMarginalizationBinding,
) -> dict:
    record = _require_exact_keys(
        value, _SOURCE_PROVENANCE_KEYS, "marginalization source provenance"
    )
    case = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES[
        binding.case_ordinal
    ]
    for name in (
        "prepared_input_hash",
        "model_input_hash",
        "posterior_grid_set_commitment",
        "reconstruction_provenance_root",
    ):
        _strict_sha256(record[name], name)
    if (
        type(record["case_ordinal"]) is not int
        or record["case_ordinal"] != case.case_ordinal
        or type(record["effect_size_sd"]) is not float
        or record["effect_size_sd"] != case.effect_size_sd
        or type(record["panel_group_count"]) is not int
        or record["panel_group_count"] != case.panel_group_count
        or type(record["aggregate_k"]) is not int
        or record["aggregate_k"] != case.aggregate_k
        or type(record["generator_seed"]) is not int
        or record["generator_seed"] != case.generator_seed
        or record["scenario_id"] != case.scenario_id
        or record["seed_namespace"]
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
        or record["generator_id"] != VBD_TRAJECTORY_GENERATOR_ID
        or record["rng_id"] != VBD_TRAJECTORY_RNG_ID
        or record["panel_hash"] is not None
        or record["ordered_panel_manifest_root"] is not None
        or record["source_execution_provenance_state"] != "NOT_RUN"
        or record["source_execution_provenance_verified"] is not False
        or record["source_projection_hash"] is not None
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization source provenance is invalid"
        )
    return record


def build_vbd_trajectory_group_effect_marginalization_fit_record(
    *,
    binding: VbdTrajectoryGroupEffectMarginalizationBinding,
    prepared: TrajectoryPreparedInput,
    source_panel: TrajectoryObservationPanel,
    deterministic_reference_pair: VbdTrajectoryGroupEffectMarginalizationReferencePair,
    posterior_projection: VbdGroupEffectMarginalizationPosteriorProjection,
    post_warmup_divergences: int,
    max_treedepth_saturation_count: int,
    energy_bfmi_min: float,
) -> dict:
    """Build one sanitized case/lane fit and derive every unchanged gate."""

    if type(binding) is not VbdTrajectoryGroupEffectMarginalizationBinding:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit requires its exact NUTS binding"
        )
    expected = build_vbd_trajectory_group_effect_marginalization_binding(
        case_ordinal=binding.case_ordinal,
        lane=binding.lane,
        lane_ordinal=binding.lane_ordinal,
        plan_hash=binding.plan_hash,
    )
    if binding != expected or binding.plan_hash != _case_plan_hash(binding.case_ordinal):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit binding is off plan"
        )
    source_provenance = _fit_source_provenance(
        binding=binding,
        prepared=prepared,
        source_panel=source_panel,
        posterior_projection=posterior_projection,
    )
    hashes = {
        "panel_hash": source_provenance["panel_hash"],
        "ordered_panel_manifest_root": source_provenance[
            "ordered_panel_manifest_root"
        ],
        "prepared_input_hash": source_provenance["prepared_input_hash"],
        "model_input_hash": source_provenance["model_input_hash"],
    }
    for name in ("prepared_input_hash", "model_input_hash"):
        value = hashes[name]
        _strict_sha256(value, name)
    reference_hash = validate_vbd_trajectory_group_effect_marginalization_reference_pair(
        deterministic_reference_pair,
        binding=binding,
        prepared_input_hash=hashes["prepared_input_hash"],
        model_input_hash=hashes["model_input_hash"],
    )
    if (
        type(posterior_projection)
        is not VbdGroupEffectMarginalizationPosteriorProjection
        or posterior_projection.lane != binding.lane
        or posterior_projection.panel_group_count != binding.panel_group_count
        or posterior_projection.prepared_input_hash != hashes["prepared_input_hash"]
        or posterior_projection.model_input_hash != hashes["model_input_hash"]
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization posterior projection identity differs"
        )
    sampled_parameter_projections = posterior_projection.sampled_parameter_projections
    reconstructed_quantity_projections = (
        posterior_projection.reconstructed_quantity_projections
    )
    if type(sampled_parameter_projections) is not tuple or len(sampled_parameter_projections) != 5:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit requires exactly five sampled projections"
        )
    sampled = [
        _sampled_projection_row(value, name)
        for value, name in zip(
            sampled_parameter_projections,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER,
            strict=True,
        )
    ]
    reconstructed_order = (
        *(f"u[{index}]" for index in range(binding.panel_group_count)),
        "trajectory_movement",
    )
    if (
        type(reconstructed_quantity_projections) is not tuple
        or len(reconstructed_quantity_projections) != len(reconstructed_order)
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization reconstructed row cardinality is invalid"
        )
    reconstructed = [
        _reconstructed_projection_row(value, name)
        for value, name in zip(
            reconstructed_quantity_projections, reconstructed_order, strict=True
        )
    ]
    common_order = vbd_trajectory_common_quantity_names(binding.panel_group_count)
    candidate_by_name = {
        projection.summary.quantity_name: projection.summary
        for projection in (*sampled_parameter_projections, *reconstructed_quantity_projections)
    }
    reference_by_name = {
        summary.quantity_name: summary
        for summary in deterministic_reference_pair.reference.semantic_reference.quantity_summaries
    }
    comparisons = [
        _derived_reference_row(candidate_by_name[name], reference_by_name[name], name)
        for name in common_order
    ]
    divergences = _strict_nonnegative_int(
        post_warmup_divergences, "post-warmup divergences"
    )
    treedepth = _strict_nonnegative_int(
        max_treedepth_saturation_count, "treedepth saturation count"
    )
    bfmi = _strict_float(energy_bfmi_min, "energy BFMI", nonnegative=True)
    sampled_passed = all(row["gate_results"]["passed"] for row in sampled)
    reconstructed_passed = all(
        row["gate_results"]["passed"] for row in reconstructed
    )
    comparisons_passed = all(row["passed"] for row in comparisons)
    gates = {
        "sampled_parameter_gates_passed": sampled_passed,
        "reconstructed_channel_gates_passed": reconstructed_passed,
        "divergences_passed": divergences == 0,
        "max_treedepth_saturation_passed": treedepth == 0,
        "energy_bfmi_passed": bfmi >= VBD_TRAJECTORY_NUTS_BFMI_MIN,
        "reference_comparisons_passed": comparisons_passed,
        "deterministic_reference_semantic_equality_passed": True,
        "deterministic_reference_role_bindings_distinct": True,
        "deterministic_reference_execution_provenance_state": "NOT_RUN",
        "deterministic_reference_execution_provenance_verified": False,
    }
    gates["all_sampler_gates_passed"] = all(
        gates[name]
        for name in (
            "sampled_parameter_gates_passed",
            "reconstructed_channel_gates_passed",
            "divergences_passed",
            "max_treedepth_saturation_passed",
            "energy_bfmi_passed",
        )
    )
    gates["all_reference_gates_passed"] = (
        gates["reference_comparisons_passed"]
        and gates["deterministic_reference_semantic_equality_passed"]
        and gates["deterministic_reference_role_bindings_distinct"]
        and gates["deterministic_reference_execution_provenance_verified"]
    )
    gates["all_gates_passed"] = (
        gates["all_sampler_gates_passed"]
        and gates["all_reference_gates_passed"]
    )
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_FIT_SCHEMA_VERSION
        ),
        "diagnostic_id": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID
        ),
        "binding": _binding_to_dict(binding),
        "source_provenance": source_provenance,
        **hashes,
        "deterministic_reference_hash": reference_hash,
        "deterministic_recomputation_hash": reference_hash,
        "deterministic_reference": deterministic_reference_pair.reference.to_dict(),
        "deterministic_recomputation": deterministic_reference_pair.recomputation.to_dict(),
        "sampled_posterior_provenance_root": posterior_projection.posterior_grid_set_commitment,
        "conditional_component_provenance_root": posterior_projection.reconstruction_provenance_root,
        "sampled_parameter_order": list(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER
        ),
        "reconstructed_quantity_order": list(reconstructed_order),
        "common_quantity_order": list(common_order),
        "sampled_parameter_rows": sampled,
        "reconstructed_quantity_rows": reconstructed,
        "reference_comparisons": comparisons,
        "post_warmup_divergences": divergences,
        "max_treedepth_saturation_count": treedepth,
        "energy_bfmi_min": bfmi,
        "gate_results": gates,
        "raw_posterior_draws_emitted": False,
        "posterior_values_emitted": False,
        "conditional_components_emitted": False,
        "pseudo_draws_emitted": False,
        "latent_paths_emitted": False,
    }
    return {**body, "fit_record_hash": sha256_json(body)}


def validate_vbd_trajectory_group_effect_marginalization_fit_record(
    value: object,
) -> dict:
    """Re-derive every metric and gate retained by one sanitized fit record."""

    _require_native_json(value, "marginalization fit record")
    record = _require_exact_keys(value, _FIT_KEYS, "marginalization fit record")
    binding = _binding_from_dict(record["binding"])
    if binding.plan_hash != _case_plan_hash(binding.case_ordinal):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit binding is off plan"
        )
    source_provenance = _validate_fit_source_provenance(
        record["source_provenance"], binding=binding
    )
    for name in (
        "prepared_input_hash", "model_input_hash", "deterministic_reference_hash",
        "deterministic_recomputation_hash", "sampled_posterior_provenance_root",
        "conditional_component_provenance_root", "fit_record_hash",
    ):
        _strict_sha256(record[name], name)
    if any(
        record[name] != source_provenance[name]
        for name in (
            "panel_hash",
            "ordered_panel_manifest_root",
            "prepared_input_hash",
            "model_input_hash",
        )
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit source projection differs"
        )
    reference_pair = _reference_pair_from_dicts(
        record["deterministic_reference"], record["deterministic_recomputation"]
    )
    reference_hash = _validate_vbd_trajectory_group_effect_marginalization_reference_pair(
        reference_pair,
        binding=binding,
        prepared_input_hash=record["prepared_input_hash"],
        model_input_hash=record["model_input_hash"],
        require_in_memory_engine_outputs=False,
    )
    if (
        record["deterministic_reference_hash"] != reference_hash
        or record["deterministic_recomputation_hash"] != reference_hash
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "deterministic reference hashes differ"
        )

    sampled = record["sampled_parameter_rows"]
    if type(sampled) is not list or len(sampled) != 5:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "sampled rows are malformed"
        )
    sampled_summaries = {}
    for row, name in zip(
        sampled,
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER,
        strict=True,
    ):
        _require_exact_keys(row, _SAMPLED_RECORD_KEYS, "sampled parameter row")
        summary = _summary_from_dict(row["posterior_summary"], name)
        diagnostic = _sampled_row(
            {key: row[key] for key in _SAMPLED_INPUT_KEYS}, name
        )
        expected_body = {
            **{key: diagnostic[key] for key in _SAMPLED_INPUT_KEYS},
            "posterior_summary": summary.to_dict(),
            "posterior_grid_shape": [4, 20_000],
            "posterior_value_count": 80_000,
            "posterior_grid_commitment": _strict_sha256(
                row["posterior_grid_commitment"], "posterior grid commitment"
            ),
            "gate_results": diagnostic["gate_results"],
        }
        if not _strict_json_equal(
            row, {**expected_body, "diagnostic_row_hash": sha256_json(expected_body)}
        ):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "sampled row differs from its derived projection"
            )
        sampled_summaries[name] = summary

    reconstructed_order = (
        *(f"u[{index}]" for index in range(binding.panel_group_count)),
        "trajectory_movement",
    )
    reconstructed = record["reconstructed_quantity_rows"]
    if type(reconstructed) is not list or len(reconstructed) != len(reconstructed_order):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reconstructed rows are malformed"
        )
    reconstructed_summaries = {}
    for row, name in zip(reconstructed, reconstructed_order, strict=True):
        _require_exact_keys(row, _RECONSTRUCTED_RECORD_KEYS, "reconstructed row")
        summary = TrajectoryPosteriorSummary(
            quantity_name=name,
            posterior_mean=_strict_float(row["posterior_mean"], "posterior mean"),
            posterior_sd=_strict_float(row["posterior_sd"], "posterior sd", positive=True),
            interval_80_lower=_strict_float(row["interval_80_lower"], "80 lower"),
            interval_80_upper=_strict_float(row["interval_80_upper"], "80 upper"),
            interval_99_lower=_strict_float(row["interval_99_lower"], "99 lower"),
            interval_99_upper=_strict_float(row["interval_99_upper"], "99 upper"),
        )
        channels = row["channel_diagnostic_rows"]
        if type(channels) is not list or len(channels) != 5:
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "reconstructed channels are malformed"
            )
        validated_channels = []
        for channel, channel_name in zip(
            channels,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER,
            strict=True,
        ):
            _require_exact_keys(channel, _CHANNEL_RECORD_KEYS, "channel row")
            validated_channels.append(
                _channel_row(
                    {key: channel[key] for key in _CHANNEL_INPUT_KEYS}, channel_name
                )
            )
        passed = all(item["gate_results"]["passed"] for item in validated_channels)
        summary_values = {
            "posterior_mean": float(summary.posterior_mean),
            "posterior_sd": float(summary.posterior_sd),
            "interval_80_lower": float(summary.interval_80_lower),
            "interval_80_upper": float(summary.interval_80_upper),
            "interval_99_lower": float(summary.interval_99_lower),
            "interval_99_upper": float(summary.interval_99_upper),
        }
        means_commitment = _strict_sha256(
            row["component_means_commitment"], "component means commitment"
        )
        variances_commitment = _strict_sha256(
            row["component_variances_commitment"], "component variances commitment"
        )
        component_grid_commitment = sha256_json(
            {
                "algorithm": "vbd_conditional_normal_component_grid_v1",
                "quantity_name": name,
                "shape": [4, 20_000],
                "component_count": 80_000,
                "dtype": "float64-le",
                "order": "chain_major_c",
                "component_means_commitment": means_commitment,
                "component_variances_commitment": variances_commitment,
            }
        )
        expected_body = {
            "quantity_name": name,
            **summary_values,
            "component_grid_shape": [4, 20_000],
            "component_count": 80_000,
            "component_means_commitment": means_commitment,
            "component_variances_commitment": variances_commitment,
            "component_grid_commitment": component_grid_commitment,
            "mixture_summary_hash": sha256_json({"quantity_name": name, **summary_values}),
            "channel_order": list(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHANNEL_ORDER),
            "channel_diagnostic_rows": validated_channels,
            "gate_results": {"all_channel_gates_passed": passed, "passed": passed},
            "conditional_components_emitted": False,
            "pseudo_draws_emitted": False,
            "conditional_mean_substitution": False,
        }
        if not _strict_json_equal(
            row, {**expected_body, "reconstructed_row_hash": sha256_json(expected_body)}
        ):
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "reconstructed row differs from its derived projection"
            )
        reconstructed_summaries[name] = summary

    if record["sampled_posterior_provenance_root"] != sha256_json(
        {
            "algorithm": "vbd_group_effect_marginalization_posterior_grid_set_v1",
            "prepared_input_hash": record["prepared_input_hash"],
            "model_input_hash": record["model_input_hash"],
            "variable_order": list(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER),
            "ordered_grid_commitments": [row["posterior_grid_commitment"] for row in sampled],
            "chain_count": 4,
            "draw_count": 20_000,
        }
    ) or record["conditional_component_provenance_root"] != sha256_json(
        {
            "algorithm": "vbd_group_effect_joint_conditional_reconstruction_v1",
            "posterior_grid_set_commitment": record["sampled_posterior_provenance_root"],
            "prepared_input_hash": record["prepared_input_hash"],
            "model_input_hash": record["model_input_hash"],
            "quantity_order": list(reconstructed_order),
            "ordered_component_grid_commitments": [row["component_grid_commitment"] for row in reconstructed],
            "joint_zero_sum_covariance_preserved": True,
            "conditional_mean_substitution": False,
            "pseudo_draws_emitted": False,
        }
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "fit provenance root differs"
        )
    if (
        source_provenance["posterior_grid_set_commitment"]
        != record["sampled_posterior_provenance_root"]
        or source_provenance["reconstruction_provenance_root"]
        != record["conditional_component_provenance_root"]
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization source and posterior projections differ"
        )

    common_order = vbd_trajectory_common_quantity_names(binding.panel_group_count)
    comparisons = record["reference_comparisons"]
    if type(comparisons) is not list or len(comparisons) != len(common_order):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reference comparisons are malformed"
        )
    candidate_summaries = sampled_summaries | reconstructed_summaries
    reference_summaries = {
        summary.quantity_name: summary
        for summary in reference_pair.reference.semantic_reference.quantity_summaries
    }
    expected_comparisons = [
        _derived_reference_row(candidate_summaries[name], reference_summaries[name], name)
        for name in common_order
    ]
    if not _strict_json_equal(comparisons, expected_comparisons):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "reference comparisons differ from their typed summaries"
        )

    divergences = _strict_nonnegative_int(record["post_warmup_divergences"], "divergences")
    treedepth = _strict_nonnegative_int(record["max_treedepth_saturation_count"], "treedepth")
    bfmi = _strict_float(record["energy_bfmi_min"], "energy BFMI", nonnegative=True)
    gates = {
        "sampled_parameter_gates_passed": all(row["gate_results"]["passed"] for row in sampled),
        "reconstructed_channel_gates_passed": all(row["gate_results"]["passed"] for row in reconstructed),
        "divergences_passed": divergences == 0,
        "max_treedepth_saturation_passed": treedepth == 0,
        "energy_bfmi_passed": bfmi >= VBD_TRAJECTORY_NUTS_BFMI_MIN,
        "reference_comparisons_passed": all(row["passed"] for row in comparisons),
        "deterministic_reference_semantic_equality_passed": True,
        "deterministic_reference_role_bindings_distinct": True,
        "deterministic_reference_execution_provenance_state": "NOT_RUN",
        "deterministic_reference_execution_provenance_verified": False,
    }
    gates["all_sampler_gates_passed"] = all(gates[name] for name in (
        "sampled_parameter_gates_passed", "reconstructed_channel_gates_passed",
        "divergences_passed", "max_treedepth_saturation_passed", "energy_bfmi_passed",
    ))
    gates["all_reference_gates_passed"] = (
        gates["reference_comparisons_passed"]
        and gates["deterministic_reference_semantic_equality_passed"]
        and gates["deterministic_reference_role_bindings_distinct"]
        and gates["deterministic_reference_execution_provenance_verified"]
    )
    gates["all_gates_passed"] = gates["all_sampler_gates_passed"] and gates["all_reference_gates_passed"]
    if not _strict_json_equal(record["gate_results"], gates):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError("fit gates differ")
    if (
        record["schema_version"] != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_FIT_SCHEMA_VERSION
        or record["diagnostic_id"] != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID
        or record["sampled_parameter_order"] != list(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_POSTERIOR_VARIABLE_ORDER)
        or record["reconstructed_quantity_order"] != list(reconstructed_order)
        or record["common_quantity_order"] != list(common_order)
        or any(record[name] is not False for name in (
            "raw_posterior_draws_emitted", "posterior_values_emitted",
            "conditional_components_emitted", "pseudo_draws_emitted", "latent_paths_emitted",
        ))
        or record["fit_record_hash"] != sha256_json(
            {key: item for key, item in record.items() if key != "fit_record_hash"}
        )
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization fit identity or hash differs"
        )
    return record


def _expected_bindings() -> tuple[VbdTrajectoryGroupEffectMarginalizationBinding, ...]:
    return tuple(
        build_vbd_trajectory_group_effect_marginalization_binding(
            case_ordinal=case.case_ordinal,
            lane=lane,
            lane_ordinal=lane_ordinal,
            plan_hash=_case_plan_hash(case.case_ordinal),
        )
        for case in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
        for lane_ordinal, lane in enumerate(
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER
        )
    )


def _validate_fit_matrix(value: object) -> list[dict]:
    if type(value) is not list or len(value) != 12:
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization matrix must contain exactly twelve fits"
        )
    fits = [
        validate_vbd_trajectory_group_effect_marginalization_fit_record(record)
        for record in value
    ]
    bindings = tuple(_binding_from_dict(record["binding"]) for record in fits)
    if bindings != _expected_bindings():
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization matrix order or identity is invalid"
        )
    case_panels: dict[int, tuple[str, str]] = {}
    for fit, binding in zip(fits, bindings, strict=True):
        case_identity = (
            fit["panel_hash"],
            fit["ordered_panel_manifest_root"],
        )
        previous = case_panels.setdefault(binding.case_ordinal, case_identity)
        if previous != case_identity:
            raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
                "marginalization case lanes do not share one panel"
            )
    sampled_count = sum(len(fit["sampled_parameter_rows"]) for fit in fits)
    reconstructed_count = sum(len(fit["reconstructed_quantity_rows"]) for fit in fits)
    channel_count = sum(
        len(row["channel_diagnostic_rows"])
        for fit in fits
        for row in fit["reconstructed_quantity_rows"]
    )
    reference_count = sum(len(fit["reference_comparisons"]) for fit in fits)
    if (sampled_count, reconstructed_count, channel_count, reference_count) != (
        60,
        120,
        600,
        180,
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization matrix cardinalities are invalid"
        )
    return fits


def _derive_classification(fits: list[dict]) -> str:
    validated = _validate_fit_matrix(fits)
    if any(
        not fit["gate_results"][
            "deterministic_reference_execution_provenance_verified"
        ]
        for fit in validated
    ):
        return "INVALID_HOLD"
    if any(not fit["gate_results"]["all_gates_passed"] for fit in validated):
        return "REJECT_GROUP_EFFECT_MARGINALIZATION_CANDIDATE"
    return "SUPPORTED_FOR_LATER_REFERENCE_CONTRACT_AMENDMENT"


def _record_body(fit_records: list[dict]) -> dict:
    plan = vbd_trajectory_group_effect_marginalization_plan()
    seed_manifest = vbd_trajectory_group_effect_marginalization_seed_manifest()
    return {
        "schema_version": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID,
        "plan_hash": plan["plan_hash"],
        "seed_manifest_hash": seed_manifest["seed_manifest_hash"],
        "execution_state": "NOT_RUN",
        "runner_completion_binding": None,
        "classification": "INVALID_HOLD",
        "state": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE,
        "hold_reasons": [VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON],
        "matrix_complete": True,
        "fit_records": fit_records,
        "sampled_parameter_row_count": 60,
        "reconstructed_quantity_row_count": 120,
        "channel_diagnostic_row_count": 600,
        "reference_comparison_count": 180,
        "ppc_state": "NOT_RUN",
        "acceptance_concordance_state": "NOT_RUN",
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "raw_posterior_draws_emitted": False,
        "posterior_values_emitted": False,
        "conditional_components_emitted": False,
        "pseudo_draws_emitted": False,
    }


def build_vbd_trajectory_group_effect_marginalization_record(
    *, fit_records: list[dict]
) -> dict:
    """Build only the implementation-stage NOT_RUN permanent-HOLD record."""

    fits = _validate_fit_matrix(fit_records)
    body = _record_body(fits)
    return validate_vbd_trajectory_group_effect_marginalization_record(
        {**body, "record_hash": sha256_json(body)}
    )


def validate_vbd_trajectory_group_effect_marginalization_record(
    value: object,
) -> dict:
    """Validate the exact unexecuted record and permanent nonacceptance posture."""

    _require_native_json(value, "marginalization record")
    record = _require_exact_keys(value, _RECORD_KEYS, "marginalization record")
    if (
        record["schema_version"]
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SCHEMA_VERSION
        or record["diagnostic_id"]
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_ID
        or record["plan_hash"]
        != vbd_trajectory_group_effect_marginalization_plan()["plan_hash"]
        or record["seed_manifest_hash"]
        != vbd_trajectory_group_effect_marginalization_seed_manifest()["seed_manifest_hash"]
        or record["execution_state"] != "NOT_RUN"
        or record["runner_completion_binding"] is not None
        or record["classification"] != "INVALID_HOLD"
        or record["state"] != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STATE
        or record["hold_reasons"]
        != [VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_HOLD_REASON]
        or record["matrix_complete"] is not True
        or (
            record["sampled_parameter_row_count"],
            record["reconstructed_quantity_row_count"],
            record["channel_diagnostic_row_count"],
            record["reference_comparison_count"],
        )
        != (60, 120, 600, 180)
        or record["ppc_state"] != "NOT_RUN"
        or record["acceptance_concordance_state"] != "NOT_RUN"
        or record["evidence_eligible"] is not False
        or type(record["acceptance_count_effect"]) is not int
        or record["acceptance_count_effect"] != 0
        or record["internal_only"] is not True
        or record["synthetic_only"] is not True
        or record["aggregate_only"] is not True
        or record["customer_output_authorized"] is not False
        or record["raw_posterior_draws_emitted"] is not False
        or record["posterior_values_emitted"] is not False
        or record["conditional_components_emitted"] is not False
        or record["pseudo_draws_emitted"] is not False
    ):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization record identity or permanent HOLD posture is invalid"
        )
    fits = _validate_fit_matrix(record["fit_records"])
    _strict_sha256(record["record_hash"], "marginalization record hash")
    body = {key: item for key, item in record.items() if key != "record_hash"}
    if record["record_hash"] != sha256_json(body):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization record hash differs"
        )
    expected_body = _record_body(fits)
    expected = {**expected_body, "record_hash": sha256_json(expected_body)}
    if not _strict_json_equal(record, expected):
        raise VbdTrajectoryGroupEffectMarginalizationDiagnosticError(
            "marginalization record differs from reconstruction"
        )
    return record


def classify_vbd_trajectory_group_effect_marginalization_result(
    value: object,
) -> str:
    """Fail closed until task 2.17 supplies an exact runner-completion binding."""

    try:
        validate_vbd_trajectory_group_effect_marginalization_record(value)
    except (
        TrajectoryIntegrationError,
        TypeError,
        ValueError,
    ):
        return "INVALID_HOLD"
    return "INVALID_HOLD"
