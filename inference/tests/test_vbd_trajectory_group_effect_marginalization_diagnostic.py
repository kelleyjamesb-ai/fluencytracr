"""Strict permanent-HOLD records for the marginalization diagnostic."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import replace
from functools import lru_cache
import inspect
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import pytest

from fluencytracr_inference import vbd_trajectory_validation_resumable as validation_runner
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_concordance import (
    VbdTrajectoryConcordanceError,
    vbd_trajectory_concordance_bundle_from_dict,
)
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE,
    vbd_trajectory_group_effect_marginalization_case_body,
)
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization as target
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization_diagnostic as diagnostic
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization_projection as completed_projection
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization import (
    VbdGroupEffectConditionalReconstruction,
    project_vbd_group_effect_marginalization_posterior,
)
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization_diagnostic import (
    VbdTrajectoryGroupEffectMarginalizationDiagnosticError,
    _derive_classification,
    build_vbd_trajectory_group_effect_marginalization_fit_record,
    build_vbd_trajectory_group_effect_marginalization_record,
    build_vbd_trajectory_group_effect_marginalization_binding,
    build_vbd_trajectory_group_effect_marginalization_reference_pair,
    VbdTrajectoryGroupEffectMarginalizationReferencePair,
    classify_vbd_trajectory_group_effect_marginalization_result,
    validate_vbd_trajectory_group_effect_marginalization_reference_pair,
    validate_vbd_trajectory_group_effect_marginalization_fit_record,
    validate_vbd_trajectory_group_effect_marginalization_record,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    TrajectoryDeterministicCommonQuantityReference,
    vbd_trajectory_common_quantity_names,
)
from fluencytracr_inference.vbd_trajectory_types import (
    VBD_TRAJECTORY_GENERATOR_ID,
    VBD_TRAJECTORY_RNG_ID,
)
from fluencytracr_inference.vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
)
from fluencytracr_inference.vbd_trajectory_precision_canary import (
    VbdTrajectoryPrecisionCanaryError,
    validate_vbd_trajectory_precision_canary_result,
)
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    VbdTrajectoryValidationWorkspaceError,
    _validate_combined_value,
    _validate_freeze_manifest,
)
from fluencytracr_inference.vbd_trajectory_validation_study import (
    VbdTrajectoryValidationStudyError,
    vbd_trajectory_slot_result_from_dict,
)
from vbd_trajectory_group_effect_marginalization_fixtures import canonical_prepared_input


def _deterministic_reference(
    *, lane, group_count, prepared_hash, model_hash, summaries
):
    return TrajectoryDeterministicCommonQuantityReference(
        lane=lane,
        panel_group_count=group_count,
        prepared_input_hash=prepared_hash,
        model_input_hash=model_hash,
        quantity_summaries=tuple(replace(summary) for summary in summaries),
        legacy_fit_summary_hash="c" * 64,
    )


class _Variable:
    dims = ("chain", "draw")

    def __init__(self, values):
        self.values = values
        self.coords = {"chain": np.arange(4), "draw": np.arange(20_000)}


class _Posterior:
    def __init__(self, values):
        self.data_vars = list(reversed(values))
        self.coords = {
            "chain": np.arange(4, dtype=np.int64),
            "draw": np.arange(20_000, dtype=np.int64),
        }
        self._values = {name: _Variable(value) for name, value in values.items()}

    def __getitem__(self, name):
        return self._values[name]


@lru_cache(maxsize=2)
def _stub_reconstructed(group_count):
    draw = np.arange(20_000, dtype=np.float64)
    wave = np.ascontiguousarray(
        np.stack([np.sin((draw + chain * 5) / 37.0) for chain in range(4)])
    )
    names = (
        *(f"u[{index}]" for index in range(group_count)),
        "trajectory_movement",
    )
    return {
        name: target._project_vbd_reconstructed_quantity(
            name,
            np.ascontiguousarray(0.05 * wave + index / 10.0),
            np.ascontiguousarray(0.4 + 0.01 * wave**2),
        )
        for index, name in enumerate(names)
    }


@lru_cache(maxsize=12)
def _prepared_for_case(group_count, lane, case_ordinal):
    case = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES[case_ordinal]
    assert group_count == case.panel_group_count
    plan_hash = sha256_json(
        vbd_trajectory_group_effect_marginalization_case_body(case_ordinal)
    )
    seed_root = sha256_json(
        {
            "seed_namespace": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE,
            "seed": case.generator_seed,
            "generator_id": VBD_TRAJECTORY_GENERATOR_ID,
            "rng_id": VBD_TRAJECTORY_RNG_ID,
            "acceptance_slot_key": None,
        }
    )
    prepared = replace(
        canonical_prepared_input(group_count, lane=lane),
        ordered_panel_manifest_root=sha256_json(["panel-root", case_ordinal]),
        study_plan_root=plan_hash,
        seed_manifest_root=seed_root,
    )
    context_hash = sha256_json(
        {
            "ordered_panel_manifest_root": prepared.ordered_panel_manifest_root,
            "lane_observation_root": prepared.lane_observation_root,
            "joint_uncertainty_roots_hash": prepared.joint_uncertainty_roots_hash,
            "cohort_partition_root": prepared.cohort_partition_root,
            "study_plan_root": prepared.study_plan_root,
            "seed_manifest_root": prepared.seed_manifest_root,
            "transform_root": prepared.transform_root,
            "cross_lane_covariance_bound_not_used_as_zero": True,
            "depth_context_excluded": True,
        }
    )
    return replace(
        prepared,
        context_binding_hash=context_hash,
        prepared_input_hash=sha256_json(
            {
                "model_input_hash": prepared.model_input_hash,
                "context_binding_hash": context_hash,
            }
        ),
    )


@lru_cache(maxsize=12)
def _projection_bundle(group_count, lane, case_ordinal=0):
    draw = np.arange(20_000, dtype=np.float64)
    wave = np.sin(2.0 * np.pi * draw / 37.0)
    grid = np.ascontiguousarray(
        np.stack([np.roll(wave, chain * 5) for chain in range(4)])
    )
    values = {
        "alpha": np.ascontiguousarray(0.1 * grid),
        "beta": np.ascontiguousarray(0.05 * grid),
        "sigma_u": np.ascontiguousarray(0.4 + 0.01 * grid),
        "sigma_r": np.ascontiguousarray(0.3 + 0.01 * grid),
        "rho": np.ascontiguousarray(0.2 + 0.01 * grid),
    }
    prepared = _prepared_for_case(group_count, lane, case_ordinal)
    model_hash = sha256_json(prepared.to_hash_body())
    prepared = replace(
        prepared,
        model_input_hash=model_hash,
        prepared_input_hash=sha256_json(
            {"model_input_hash": model_hash, "context_binding_hash": prepared.context_binding_hash}
        ),
    )

    def conditional(
        prepared_value,
        *,
        expected_model_input_hash,
        expected_prepared_input_hash,
        **point,
    ):
        projection = prepared_value.zero_sum_basis @ prepared_value.zero_sum_basis.T
        coordinates = np.arange(1, group_count, dtype=np.float64)
        u_mean = prepared_value.zero_sum_basis @ (
            point["alpha"] * coordinates + point["beta"] * coordinates**2
        )
        u_covariance = (0.2 + 0.01 * point["sigma_u"]) * projection
        movement_mean = point["alpha"] + point["beta"]
        movement_variance = 0.5 + 0.01 * point["sigma_r"]
        joint_mean = np.concatenate((u_mean, [movement_mean]))
        joint_covariance = np.zeros((group_count + 1, group_count + 1))
        joint_covariance[:-1, :-1] = u_covariance
        joint_covariance[-1, -1] = movement_variance
        return VbdGroupEffectConditionalReconstruction(
            u_mean=u_mean, u_covariance=u_covariance,
            movement_mean=movement_mean, movement_variance=movement_variance,
            joint_mean=joint_mean, joint_covariance=joint_covariance,
        )

    stubs = _stub_reconstructed(group_count)
    with (
        patch.object(target, "conditional_vbd_group_effect_reconstruction", conditional),
        patch.object(
            target,
            "_project_vbd_reconstructed_quantity",
            side_effect=lambda name, _means, _variances: stubs[name],
        ),
    ):
        return project_vbd_group_effect_marginalization_posterior(
            prepared,
            expected_model_input_hash=prepared.model_input_hash,
            expected_prepared_input_hash=prepared.prepared_input_hash,
            posterior=_Posterior(values),
        )


class _SourcePanel:
    def __init__(self, binding, prepared):
        case = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES[
            binding.case_ordinal
        ]
        self.panel_group_count = case.panel_group_count
        self.aggregate_k = case.aggregate_k
        self.scenario_id = case.scenario_id
        self.seed = case.generator_seed
        self.seed_namespace = VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
        self.generator_id = VBD_TRAJECTORY_GENERATOR_ID
        self.rng_id = VBD_TRAJECTORY_RNG_ID
        self.seed_manifest_root = prepared.seed_manifest_root
        self.study_plan_root = binding.plan_hash
        self.ordered_panel_manifest_root = prepared.ordered_panel_manifest_root
        self.direction_vector = (1, 1, 1)
        self.synthetic_only = True
        self.aggregate_only = True
        self.real_data_present = False
        self.customer_data_present = False
        self.production_data_present = False
        self.live_data_source_present = False

    def to_dict(self):
        return dict(self.__dict__)


def _candidate_common_summaries(sampled, reconstructed, group_count):
    sampled_by_name = {item.summary.quantity_name: item.summary for item in sampled}
    reconstructed_by_name = {
        item.summary.quantity_name: item.summary for item in reconstructed
    }
    return tuple(
        (sampled_by_name | reconstructed_by_name)[name]
        for name in vbd_trajectory_common_quantity_names(group_count)
    )


def _reference_pair(binding, bundle, summaries, recomputation_summaries=None):
    prepared = replace(
        canonical_prepared_input(binding.panel_group_count, lane=binding.lane),
        model_input_hash=bundle.model_input_hash,
        prepared_input_hash=bundle.prepared_input_hash,
    )
    outputs = iter(
        (
            _deterministic_reference(
                lane=binding.lane, group_count=binding.panel_group_count,
                prepared_hash=bundle.prepared_input_hash,
                model_hash=bundle.model_input_hash, summaries=summaries,
            ),
            _deterministic_reference(
                lane=binding.lane, group_count=binding.panel_group_count,
                prepared_hash=bundle.prepared_input_hash,
                model_hash=bundle.model_input_hash,
                summaries=(
                    summaries
                    if recomputation_summaries is None
                    else recomputation_summaries
                ),
            ),
        )
    )
    with patch.object(
        diagnostic,
        "fit_vbd_trajectory_all_common_quantity_reference",
        side_effect=lambda _prepared, _panel: next(outputs),
    ):
        return build_vbd_trajectory_group_effect_marginalization_reference_pair(
            binding=binding, prepared=prepared, source_panel=object()
        )


def _fit_matrix(*, target=None, global_update=None):
    records = []
    for case in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES:
        for lane_ordinal, lane in enumerate(("frequency", "engagement", "breadth")):
            bundle = _projection_bundle(
                case.panel_group_count, lane, case.case_ordinal
            )
            prepared = _prepared_for_case(
                case.panel_group_count, lane, case.case_ordinal
            )
            sampled = bundle.sampled_parameter_projections
            reconstructed = bundle.reconstructed_quantity_projections
            global_values = {
                "post_warmup_divergences": 0,
                "max_treedepth_saturation_count": 0,
                "energy_bfmi_min": 0.8,
            }
            if target == (case.case_ordinal, lane_ordinal):
                if global_update:
                    global_values[global_update[0]] = global_update[1]
            summaries = _candidate_common_summaries(
                sampled, reconstructed, case.panel_group_count
            )
            binding = build_vbd_trajectory_group_effect_marginalization_binding(
                case_ordinal=case.case_ordinal,
                lane=lane,
                lane_ordinal=lane_ordinal,
                plan_hash=sha256_json(
                    vbd_trajectory_group_effect_marginalization_case_body(
                        case.case_ordinal
                    )
                ),
            )
            reference_pair = _reference_pair(binding, bundle, summaries)
            source_panel = _SourcePanel(binding, prepared)
            with (
                patch.object(
                    diagnostic,
                    "validate_prepared_vbd_trajectory",
                    return_value=None,
                ),
                patch.object(diagnostic, "TrajectoryObservationPanel", _SourcePanel),
            ):
                record = build_vbd_trajectory_group_effect_marginalization_fit_record(
                    binding=binding,
                    prepared=prepared,
                    source_panel=source_panel,
                    deterministic_reference_pair=reference_pair,
                    posterior_projection=bundle,
                    **global_values,
                )
            records.append(record)
    return records


def test_fit_matrix_has_exact_cardinalities_and_sanitized_variable_boundary():
    fits = _fit_matrix()
    assert len(fits) == 12
    assert sum(len(fit["sampled_parameter_rows"]) for fit in fits) == 60
    assert sum(len(fit["reconstructed_quantity_rows"]) for fit in fits) == 120
    assert sum(
        len(row["channel_diagnostic_rows"])
        for fit in fits
        for row in fit["reconstructed_quantity_rows"]
    ) == 600
    assert sum(len(fit["reference_comparisons"]) for fit in fits) == 180
    for fit in fits:
        assert fit["sampled_parameter_order"] == [
            "alpha", "beta", "sigma_u", "sigma_r", "rho"
        ]
        assert "u" not in fit["sampled_parameter_order"]
        assert "trajectory_movement" not in fit["sampled_parameter_order"]
        assert fit["raw_posterior_draws_emitted"] is False
        assert fit["posterior_values_emitted"] is False
        assert fit["source_provenance"]["panel_hash"] == fit["panel_hash"]
        assert (
            fit["source_provenance"]["ordered_panel_manifest_root"]
            == fit["ordered_panel_manifest_root"]
        )
        assert fit["source_provenance"]["source_execution_provenance_state"] == "NOT_RUN"
        assert fit["source_provenance"]["source_execution_provenance_verified"] is False
        assert validate_vbd_trajectory_group_effect_marginalization_fit_record(fit) == fit


@pytest.mark.parametrize(
    ("field", "value"),
    (
        ("post_warmup_divergences", 1),
        ("max_treedepth_saturation_count", 1),
        ("energy_bfmi_min", 0.299999),
    ),
)
def test_any_complete_global_gate_failure_rejects_candidate(field, value):
    fits = _fit_matrix(
        target=(0, 0),
        global_update=(field, value),
    )
    assert _derive_classification(fits) == "INVALID_HOLD"


def test_all_pass_is_supported_but_unexecuted_record_remains_permanent_invalid_hold():
    fits = _fit_matrix()
    assert _derive_classification(fits) == "INVALID_HOLD"
    assert all(
        fit["gate_results"]["deterministic_reference_execution_provenance_state"]
        == "NOT_RUN"
        and fit["gate_results"][
            "deterministic_reference_execution_provenance_verified"
        ]
        is False
        and fit["gate_results"]["all_reference_gates_passed"] is False
        and fit["gate_results"]["all_gates_passed"] is False
        for fit in fits
    )
    record = build_vbd_trajectory_group_effect_marginalization_record(fit_records=fits)
    assert record["execution_state"] == "NOT_RUN"
    assert record["classification"] == "INVALID_HOLD"
    assert record["state"] == "HOLD"
    assert record["hold_reasons"] == ["group_effect_marginalization_diagnostic_nonacceptance"]
    assert record["evidence_eligible"] is False
    assert record["acceptance_count_effect"] == 0
    assert record["ppc_state"] == "NOT_RUN"
    assert record["acceptance_concordance_state"] == "NOT_RUN"
    assert classify_vbd_trajectory_group_effect_marginalization_result(record) == "INVALID_HOLD"
    assert validate_vbd_trajectory_group_effect_marginalization_record(record) == record


def test_private_completed_projection_binds_exact_source_and_remains_permanent_hold():
    fits = []
    for fit in _fit_matrix():
        case_ordinal = fit["binding"]["case_ordinal"]
        fits.append(
            diagnostic.project_completed_vbd_trajectory_group_effect_marginalization_fit(
                fit_record=fit,
                panel_hash=sha256_json(["panel", case_ordinal]),
                ordered_panel_manifest_root=sha256_json(
                    ["ordered-panel", case_ordinal]
                ),
                _completion_token=(
                    diagnostic._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_TOKEN
                ),
            )
        )
    provenance = {
        "authorization_commit": "a" * 40,
        "authorization_manifest_hash": "b" * 64,
        "execution_authorization_hash": "c" * 64,
        "implementation_commit": "d" * 40,
        "implementation_tree": "e" * 40,
        "implementation_review_refs": {
            "CODE": f"review:code/go/{'d' * 40}/code-review",
            "BUG": f"review:bug/go/{'d' * 40}/bug-review",
            "ADVERSARIAL": (
                f"review:adversarial/go/{'d' * 40}/adversarial-review"
            ),
            "STATISTICAL_METHODOLOGY": (
                "review:statistical-methodology/go/"
                f"{'d' * 40}/methodology-review"
            ),
        },
        "launch_permit_hash": "f" * 64,
        "consumed_permit_file_hash": "1" * 64,
        "external_claim_hash": "2" * 64,
        "input_binding_hash": "3" * 64,
        "runtime_identity_hash": "4" * 64,
        "requirements_lock_hash": "5" * 64,
        "implementation_hash": "6" * 64,
        "native_library_manifest_hash": "7" * 64,
        "model_manifest_hash": "8" * 64,
        "diagnostic_plan_hash": (
            diagnostic.vbd_trajectory_group_effect_marginalization_plan()[
                "plan_hash"
            ]
        ),
        "seed_manifest_hash": (
            diagnostic.vbd_trajectory_group_effect_marginalization_seed_manifest()[
                "seed_manifest_hash"
            ]
        ),
        "command_hash": "9" * 64,
    }
    completion = (
        diagnostic.build_vbd_trajectory_group_effect_marginalization_completion_binding(
            provenance=provenance,
            fit_records=fits,
            terminal_completion_receipt_hash="0" * 64,
        )
    )
    record = diagnostic.build_completed_vbd_trajectory_group_effect_marginalization_record(
        fit_records=fits,
        runner_completion_binding=completion,
        _completion_token=(
            diagnostic._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_TOKEN
        ),
    )

    assert record["execution_state"] == "COMPLETE"
    assert record["classification"] in {
        "REJECT_GROUP_EFFECT_MARGINALIZATION_CANDIDATE",
        "SUPPORTED_FOR_LATER_REFERENCE_CONTRACT_AMENDMENT",
    }
    assert record["state"] == "HOLD"
    assert record["evidence_eligible"] is False
    assert record["acceptance_count_effect"] == 0
    assert record["sampled_parameter_row_count"] == 60
    assert record["reconstructed_quantity_row_count"] == 120
    assert record["channel_diagnostic_row_count"] == 600
    assert record["reference_comparison_count"] == 180
    assert (
        classify_vbd_trajectory_group_effect_marginalization_result(record)
        == "INVALID_HOLD"
    )
    assert validate_vbd_trajectory_group_effect_marginalization_record(record) == record


def test_sampler_free_completed_fit_projection_rejects_partial_inference_data(monkeypatch):
    fit = _fit_matrix()[0]
    binding = build_vbd_trajectory_group_effect_marginalization_binding(
        case_ordinal=0,
        lane="frequency",
        lane_ordinal=0,
        plan_hash=sha256_json(
            vbd_trajectory_group_effect_marginalization_case_body(0)
        ),
    )
    prepared = _prepared_for_case(6, "frequency", 0)
    source_panel = _SourcePanel(binding, prepared)
    panel_hash = sha256_json(source_panel.to_dict())
    monkeypatch.setattr(completed_projection, "TrajectoryObservationPanel", _SourcePanel)
    monkeypatch.setattr(
        completed_projection,
        "project_vbd_group_effect_marginalization_posterior",
        lambda *_args, **_kwargs: object(),
    )
    monkeypatch.setattr(
        completed_projection,
        "build_vbd_trajectory_group_effect_marginalization_fit_record",
        lambda **_kwargs: fit,
    )
    monkeypatch.setattr(
        completed_projection,
        "_sample_stat_count",
        lambda *_args, **_kwargs: (0, True),
    )
    monkeypatch.setattr(
        completed_projection,
        "_bfmi_values",
        lambda _idata: np.ones(4, dtype=np.float64),
    )
    reference_pair = _reference_pair(
        binding,
        _projection_bundle(6, "frequency", 0),
        _candidate_common_summaries(
            _projection_bundle(6, "frequency", 0).sampled_parameter_projections,
            _projection_bundle(6, "frequency", 0).reconstructed_quantity_projections,
            6,
        ),
    )
    record = completed_projection.project_vbd_trajectory_group_effect_marginalization_fit(
        SimpleNamespace(posterior=object(), sample_stats=object()),
        binding=binding,
        prepared=prepared,
        source_panel=source_panel,
        deterministic_reference_pair=reference_pair,
        panel_hash=panel_hash,
        ordered_panel_manifest_root=source_panel.ordered_panel_manifest_root,
    )
    assert record["source_provenance"]["source_execution_provenance_state"] == "COMPLETE"
    assert record["panel_hash"] == panel_hash
    with pytest.raises(ValueError, match="inference data is incomplete"):
        completed_projection.project_vbd_trajectory_group_effect_marginalization_fit(
            SimpleNamespace(posterior=object()),
            binding=binding,
            prepared=prepared,
            source_panel=source_panel,
            deterministic_reference_pair=reference_pair,
            panel_hash=panel_hash,
            ordered_panel_manifest_root=source_panel.ordered_panel_manifest_root,
        )


def test_fit_builder_derives_source_hashes_without_caller_hash_parameters():
    signature = inspect.signature(
        build_vbd_trajectory_group_effect_marginalization_fit_record
    )
    assert "prepared" in signature.parameters
    assert "source_panel" in signature.parameters
    assert "panel_hash" not in signature.parameters
    assert "ordered_panel_manifest_root" not in signature.parameters
    assert "prepared_input_hash" not in signature.parameters
    assert "model_input_hash" not in signature.parameters


def test_coordinated_source_identity_replacement_and_self_rehash_rejects():
    fit = deepcopy(_fit_matrix()[0])
    source = fit["source_provenance"]
    source["panel_hash"] = "a" * 64
    source["ordered_panel_manifest_root"] = "b" * 64
    source["effect_size_sd"] = 0.5
    source["generator_id"] = "replacement_generator"
    source["source_projection_hash"] = sha256_json(
        {key: value for key, value in source.items() if key != "source_projection_hash"}
    )
    fit["panel_hash"] = source["panel_hash"]
    fit["ordered_panel_manifest_root"] = source["ordered_panel_manifest_root"]
    fit["fit_record_hash"] = sha256_json(
        {key: value for key, value in fit.items() if key != "fit_record_hash"}
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_fit_record(fit)


def test_persisted_source_roots_are_unclaimed_and_root_only_rewrite_rejects():
    fit = deepcopy(_fit_matrix()[0])
    source = fit["source_provenance"]
    assert source["panel_hash"] is None
    assert source["ordered_panel_manifest_root"] is None
    assert source["source_projection_hash"] is None
    assert fit["panel_hash"] is None
    assert fit["ordered_panel_manifest_root"] is None

    source["panel_hash"] = "a" * 64
    source["ordered_panel_manifest_root"] = "b" * 64
    source["source_projection_hash"] = sha256_json(
        {
            key: value
            for key, value in source.items()
            if key != "source_projection_hash"
        }
    )
    fit["panel_hash"] = source["panel_hash"]
    fit["ordered_panel_manifest_root"] = source[
        "ordered_panel_manifest_root"
    ]
    fit["fit_record_hash"] = sha256_json(
        {key: value for key, value in fit.items() if key != "fit_record_hash"}
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_fit_record(fit)


def test_reference_recomputation_mismatch_and_structural_mutations_are_invalid():
    fits = _fit_matrix()
    source = fits[0]
    bundle = _projection_bundle(6, "frequency")
    sampled = bundle.sampled_parameter_projections
    reconstructed = bundle.reconstructed_quantity_projections
    summaries = _candidate_common_summaries(sampled, reconstructed, 6)
    mismatched_summaries = (
        TrajectoryPosteriorSummary(
            **{
                **summaries[0].__dict__,
                "posterior_mean": summaries[0].posterior_mean + 0.01,
            }
        ),
        *summaries[1:],
    )
    binding = build_vbd_trajectory_group_effect_marginalization_binding(
        case_ordinal=0, lane="frequency", lane_ordinal=0,
        plan_hash=sha256_json(vbd_trajectory_group_effect_marginalization_case_body(0)),
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        _reference_pair(
            binding, bundle, summaries,
            recomputation_summaries=mismatched_summaries,
        )
    record = build_vbd_trajectory_group_effect_marginalization_record(fit_records=fits)
    mutation = deepcopy(record)
    mutation["fit_records"][0]["unexpected"] = False
    mutation["record_hash"] = sha256_json(
        {key: value for key, value in mutation.items() if key != "record_hash"}
    )
    assert classify_vbd_trajectory_group_effect_marginalization_result(mutation) == "INVALID_HOLD"
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_record(mutation)


def test_reference_pair_requires_exact_canonical_semantics_and_hash_equality():
    bundle = _projection_bundle(6, "frequency")
    sampled = bundle.sampled_parameter_projections
    reconstructed = bundle.reconstructed_quantity_projections
    summaries = _candidate_common_summaries(sampled, reconstructed, 6)
    binding = build_vbd_trajectory_group_effect_marginalization_binding(
        case_ordinal=0, lane="frequency", lane_ordinal=0,
        plan_hash=sha256_json(vbd_trajectory_group_effect_marginalization_case_body(0)),
    )
    pair = _reference_pair(binding, bundle, summaries)
    assert validate_vbd_trajectory_group_effect_marginalization_reference_pair(
        pair, binding=binding, prepared_input_hash=bundle.prepared_input_hash,
        model_input_hash=bundle.model_input_hash,
    ) == pair.reference.semantic_reference_hash
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_reference_pair(
            pair, binding=binding, prepared_input_hash="a" * 64,
            model_input_hash=bundle.model_input_hash,
        )


def test_reference_pair_factory_runs_two_role_distinct_deterministic_lanes(monkeypatch):
    bundle = _projection_bundle(6, "frequency")
    summaries = _candidate_common_summaries(
        bundle.sampled_parameter_projections,
        bundle.reconstructed_quantity_projections,
        6,
    )
    reference = _deterministic_reference(
        lane="frequency", group_count=6,
        prepared_hash=bundle.prepared_input_hash,
        model_hash=bundle.model_input_hash, summaries=summaries,
    )
    calls = []

    def engine(prepared, source_panel):
        calls.append((prepared, source_panel))
        return _deterministic_reference(
            lane="frequency", group_count=6,
            prepared_hash=bundle.prepared_input_hash,
            model_hash=bundle.model_input_hash, summaries=summaries,
        )

    monkeypatch.setattr(diagnostic, "fit_vbd_trajectory_all_common_quantity_reference", engine)
    binding = build_vbd_trajectory_group_effect_marginalization_binding(
        case_ordinal=0, lane="frequency", lane_ordinal=0,
        plan_hash=sha256_json(vbd_trajectory_group_effect_marginalization_case_body(0)),
    )
    prepared = replace(
        canonical_prepared_input(6, lane="frequency"),
        model_input_hash=bundle.model_input_hash,
        prepared_input_hash=bundle.prepared_input_hash,
    )
    pair = build_vbd_trajectory_group_effect_marginalization_reference_pair(
        binding=binding, prepared=prepared, source_panel=object()
    )
    assert type(pair) is VbdTrajectoryGroupEffectMarginalizationReferencePair
    assert len(calls) == 2
    assert pair.reference.role == "REFERENCE"
    assert pair.recomputation.role == "FRESH_RECOMPUTATION"
    assert pair.reference.role_binding_hash != pair.recomputation.role_binding_hash
    assert pair.reference.envelope_hash != pair.recomputation.envelope_hash
    assert pair.reference.semantic_reference_hash == pair.recomputation.semantic_reference_hash
    with pytest.raises(TypeError):
        VbdTrajectoryGroupEffectMarginalizationReferencePair()


def test_reference_pair_factory_rejects_copied_engine_output_with_regenerated_role():
    bundle = _projection_bundle(6, "frequency")
    summaries = _candidate_common_summaries(
        bundle.sampled_parameter_projections,
        bundle.reconstructed_quantity_projections,
        6,
    )
    shared = _deterministic_reference(
        lane="frequency",
        group_count=6,
        prepared_hash=bundle.prepared_input_hash,
        model_hash=bundle.model_input_hash,
        summaries=summaries,
    )
    binding = build_vbd_trajectory_group_effect_marginalization_binding(
        case_ordinal=0,
        lane="frequency",
        lane_ordinal=0,
        plan_hash=sha256_json(vbd_trajectory_group_effect_marginalization_case_body(0)),
    )
    prepared = replace(
        canonical_prepared_input(6, lane="frequency"),
        model_input_hash=bundle.model_input_hash,
        prepared_input_hash=bundle.prepared_input_hash,
    )
    with patch.object(
        diagnostic,
        "fit_vbd_trajectory_all_common_quantity_reference",
        side_effect=(shared, replace(shared)),
    ):
        with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
            build_vbd_trajectory_group_effect_marginalization_reference_pair(
                binding=binding,
                prepared=prepared,
                source_panel=object(),
            )


def test_persisted_reference_copy_and_self_rehash_cannot_replace_recomputation():
    fit = deepcopy(_fit_matrix()[0])
    fit["deterministic_recomputation"] = deepcopy(
        fit["deterministic_reference"]
    )
    fit["fit_record_hash"] = sha256_json(
        {key: value for key, value in fit.items() if key != "fit_record_hash"}
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_fit_record(fit)


def test_persisted_reference_roles_cannot_be_swapped_and_rehashed():
    fit = deepcopy(_fit_matrix()[0])
    fit["deterministic_reference"], fit["deterministic_recomputation"] = (
        fit["deterministic_recomputation"], fit["deterministic_reference"]
    )
    fit["fit_record_hash"] = sha256_json(
        {key: value for key, value in fit.items() if key != "fit_record_hash"}
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_fit_record(fit)


def test_reconstructed_mixture_summary_commitment_cannot_be_self_rehashed():
    fit = deepcopy(_fit_matrix()[0])
    row = fit["reconstructed_quantity_rows"][0]
    row["mixture_summary_hash"] = "d" * 64
    row["reconstructed_row_hash"] = sha256_json(
        {key: value for key, value in row.items() if key != "reconstructed_row_hash"}
    )
    fit["fit_record_hash"] = sha256_json(
        {key: value for key, value in fit.items() if key != "fit_record_hash"}
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_fit_record(fit)


@pytest.mark.parametrize(
    "mutation",
    (
        "generator_seed_float",
        "shape_float",
        "count_float",
        "sampled_gate_int",
        "reference_flag_int",
        "fit_gate_int",
    ),
)
def test_recursive_runtime_types_reject_after_coordinated_rehash(mutation):
    fit = deepcopy(_fit_matrix()[0])
    if mutation == "generator_seed_float":
        fit["binding"]["generator_seed"] = float(fit["binding"]["generator_seed"])
        binding_body = {key: value for key, value in fit["binding"].items() if key != "binding_hash"}
        fit["binding"]["binding_hash"] = sha256_json(binding_body)
    elif mutation == "shape_float":
        fit["sampled_parameter_rows"][0]["posterior_grid_shape"][0] = 4.0
    elif mutation == "count_float":
        fit["sampled_parameter_rows"][0]["posterior_value_count"] = 80_000.0
    elif mutation == "sampled_gate_int":
        fit["sampled_parameter_rows"][0]["gate_results"]["passed"] = 1
    elif mutation == "reference_flag_int":
        for key in ("deterministic_reference", "deterministic_recomputation"):
            semantic = fit[key]["semantic_reference"]
            semantic["posterior_support_emitted"] = 0
            semantic_body = {name: value for name, value in semantic.items() if name != "reference_hash"}
            semantic["reference_hash"] = sha256_json(semantic_body)
            fit[key]["semantic_reference_hash"] = semantic["reference_hash"]
            envelope_body = {
                name: value
                for name, value in fit[key].items()
                if name != "envelope_hash"
            }
            fit[key]["envelope_hash"] = sha256_json(envelope_body)
            fit["deterministic_reference_hash"] = semantic["reference_hash"]
            fit["deterministic_recomputation_hash"] = semantic["reference_hash"]
    else:
        fit["gate_results"]["all_gates_passed"] = 1
    for row in fit["sampled_parameter_rows"]:
        row["diagnostic_row_hash"] = sha256_json(
            {key: value for key, value in row.items() if key != "diagnostic_row_hash"}
        )
    fit["fit_record_hash"] = sha256_json(
        {key: value for key, value in fit.items() if key != "fit_record_hash"}
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_fit_record(fit)


def test_final_record_integer_count_rejects_after_coordinated_rehash():
    record = build_vbd_trajectory_group_effect_marginalization_record(
        fit_records=_fit_matrix()
    )
    record["sampled_parameter_row_count"] = 60.0
    record["record_hash"] = sha256_json(
        {key: value for key, value in record.items() if key != "record_hash"}
    )
    with pytest.raises(VbdTrajectoryGroupEffectMarginalizationDiagnosticError):
        validate_vbd_trajectory_group_effect_marginalization_record(record)


def test_task_2_16_does_not_extend_any_consumed_runner_source_manifest():
    new_paths = {
        "inference/src/fluencytracr_inference/"
        "vbd_trajectory_group_effect_marginalization_constants.py",
        "inference/src/fluencytracr_inference/"
        "vbd_trajectory_group_effect_marginalization.py",
        "inference/src/fluencytracr_inference/"
        "vbd_trajectory_group_effect_marginalization_diagnostic.py",
    }
    assert len(validation_runner._RUNNER_SOURCE_PATHS) == 45
    assert set(validation_runner._RUNNER_SOURCE_PATHS).isdisjoint(new_paths)
    assert validation_runner._RUNNER_SOURCE_PATHS == tuple(
        sorted(validation_runner._RUNNER_SOURCE_PATHS)
    )


def test_marginalization_record_is_rejected_by_every_existing_python_proof_path():
    record = build_vbd_trajectory_group_effect_marginalization_record(
        fit_records=_fit_matrix()
    )
    with pytest.raises(VbdTrajectoryPrecisionCanaryError):
        validate_vbd_trajectory_precision_canary_result(record)
    with pytest.raises(VbdTrajectoryConcordanceError):
        vbd_trajectory_concordance_bundle_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationStudyError):
        vbd_trajectory_slot_result_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_freeze_manifest(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_combined_value(record, {})


def test_completed_and_malformed_records_remain_rejected_by_every_proof_path():
    fits = [
        diagnostic.project_completed_vbd_trajectory_group_effect_marginalization_fit(
            fit_record=fit,
            panel_hash=sha256_json(["completed-panel", fit["binding"]["case_ordinal"]]),
            ordered_panel_manifest_root=sha256_json(
                ["completed-order", fit["binding"]["case_ordinal"]]
            ),
            _completion_token=(
                diagnostic._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_TOKEN
            ),
        )
        for fit in _fit_matrix()
    ]
    implementation_commit = "d" * 40
    provenance = {
        "authorization_commit": "a" * 40,
        "authorization_manifest_hash": "b" * 64,
        "execution_authorization_hash": "c" * 64,
        "implementation_commit": implementation_commit,
        "implementation_tree": "e" * 40,
        "implementation_review_refs": {
            "CODE": f"review:code/go/{implementation_commit}/code",
            "BUG": f"review:bug/go/{implementation_commit}/bug",
            "ADVERSARIAL": f"review:adversarial/go/{implementation_commit}/adversarial",
            "STATISTICAL_METHODOLOGY": (
                "review:statistical-methodology/go/"
                f"{implementation_commit}/methodology"
            ),
        },
        "launch_permit_hash": "f" * 64,
        "consumed_permit_file_hash": "1" * 64,
        "external_claim_hash": "2" * 64,
        "input_binding_hash": "3" * 64,
        "runtime_identity_hash": "4" * 64,
        "requirements_lock_hash": "5" * 64,
        "implementation_hash": "6" * 64,
        "native_library_manifest_hash": "7" * 64,
        "model_manifest_hash": "8" * 64,
        "diagnostic_plan_hash": diagnostic.vbd_trajectory_group_effect_marginalization_plan()["plan_hash"],
        "seed_manifest_hash": diagnostic.vbd_trajectory_group_effect_marginalization_seed_manifest()["seed_manifest_hash"],
        "command_hash": "9" * 64,
    }
    completion = diagnostic.build_vbd_trajectory_group_effect_marginalization_completion_binding(
        provenance=provenance,
        fit_records=fits,
        terminal_completion_receipt_hash="0" * 64,
    )
    record = diagnostic.build_completed_vbd_trajectory_group_effect_marginalization_record(
        fit_records=fits,
        runner_completion_binding=completion,
        _completion_token=(
            diagnostic._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_TOKEN
        ),
    )
    for value in (record, {**record, "unexpected": False}):
        assert classify_vbd_trajectory_group_effect_marginalization_result(value) == "INVALID_HOLD"
        with pytest.raises(VbdTrajectoryPrecisionCanaryError):
            validate_vbd_trajectory_precision_canary_result(value)
        with pytest.raises(VbdTrajectoryConcordanceError):
            vbd_trajectory_concordance_bundle_from_dict(value)
        with pytest.raises(VbdTrajectoryValidationStudyError):
            vbd_trajectory_slot_result_from_dict(value)
        with pytest.raises(VbdTrajectoryValidationWorkspaceError):
            _validate_freeze_manifest(value)
        with pytest.raises(VbdTrajectoryValidationWorkspaceError):
            _validate_combined_value(value, {})
