from copy import deepcopy

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_concordance import (
    evaluate_vbd_trajectory_quantity_concordance,
)
from fluencytracr_inference.vbd_trajectory_nuts import (
    TrajectoryNutsFit,
    TrajectoryPpcResult,
    TrajectorySamplerDiagnostics,
    TrajectorySamplerParameterDiagnostic,
    VBD_TRAJECTORY_PPC_STATISTIC_NAMES,
    _VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
    _VBD_TRAJECTORY_PRECISION_CANARY_RUNNER_TOKEN,
    _expected_parameter_names,
    _validate_reference_seeds,
    build_vbd_trajectory_nuts_precision_canary_binding,
    vbd_nuts_execution_settings,
)
from fluencytracr_inference.vbd_trajectory_preparation import (
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_precision_canary import (
    VBD_TRAJECTORY_PRECISION_CANARY_HOLD_REASON,
    VBD_TRAJECTORY_PRECISION_CANARY_SCHEMA_VERSION,
    VbdTrajectoryPrecisionCanaryError,
    run_vbd_trajectory_precision_canary,
    validate_vbd_trajectory_precision_canary_result,
    vbd_trajectory_precision_canary_plan,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    TrajectoryDeterministicFit,
    TrajectoryIntegrationDiagnostics,
    _build_outer_weight_retention_record,
)
from fluencytracr_inference.vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    _PRECISION_CANARY_GENERATION_RUNNER_TOKEN,
    generate_vbd_trajectory_precision_canary_case,
    generate_vbd_trajectory_scenario_smoke_case,
    vbd_trajectory_precision_canary_case_body,
)
from fluencytracr_inference.vbd_trajectory_types import VBD_TRAJECTORY_LANES


def _result(canary_ordinal=0):
    canary = vbd_trajectory_precision_canary_case_body(canary_ordinal)
    case = generate_vbd_trajectory_precision_canary_case(
        canary_ordinal,
        _runner_token=_PRECISION_CANARY_GENERATION_RUNNER_TOKEN,
    )
    summary = TrajectoryPosteriorSummary(
        quantity_name="trajectory_movement",
        posterior_mean=0.1,
        posterior_sd=0.5,
        interval_80_lower=-0.4,
        interval_80_upper=0.6,
        interval_99_lower=-0.9,
        interval_99_upper=1.1,
    )
    lane_records = []
    for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
        prepared = prepare_vbd_trajectory_lane(case.panel, lane)
        primary = TrajectoryDeterministicFit(
            lane=lane,
            prepared_input_hash=prepared.prepared_input_hash,
            model_input_hash=prepared.model_input_hash,
            movement_summary=summary,
            integration_diagnostics=TrajectoryIntegrationDiagnostics(
                **_build_outer_weight_retention_record(
                    finite_log_weight_count=8192,
                    retained_ordinals=tuple(range(8192)),
                ),
                effective_sample_size=1000.0,
                max_normalized_weight=0.001,
                mode_transformed=(0.0, 0.0, 0.0),
                negative_log_posterior_at_mode=1.0,
                hessian_condition_number=2.0,
                minimum_conditional_movement_variance=0.1,
                maximum_conditional_movement_variance=0.2,
                movement_component_count=8192,
            ),
        )
        binding = build_vbd_trajectory_nuts_precision_canary_binding(
            canary_ordinal=canary_ordinal,
            bundle_seed=case.panel.seed,
            lane=lane,
            lane_ordinal=lane_ordinal,
            plan_hash=case.panel.study_plan_root,
        )
        settings = vbd_nuts_execution_settings("full")
        names = _expected_parameter_names(case.panel.panel_group_count)
        diagnostics = TrajectorySamplerDiagnostics(
            settings=settings,
            parameters=tuple(
                TrajectorySamplerParameterDiagnostic(
                    parameter_name=name,
                    r_hat=1.0,
                    bulk_ess=500.0,
                    tail_ess=500.0,
                    posterior_mean_mcse=0.01,
                    interval_80_lower_endpoint_mcse=0.01,
                    interval_80_upper_endpoint_mcse=0.01,
                    interval_99_lower_endpoint_mcse=0.01,
                    interval_99_upper_endpoint_mcse=0.01,
                    posterior_sd=0.5,
                )
                for name in names
            ),
            required_parameter_names=names,
            missing_parameter_variables=(),
            missing_parameter_names=(),
            duplicate_parameter_names=(),
            off_plan_parameter_names=(),
            parameter_order_matches=True,
            trace_shape_matches=True,
            post_warmup_divergences=0,
            max_treedepth_saturation_count=0,
            energy_bfmi_min=0.5,
        )
        ppc = tuple(
            TrajectoryPpcResult(
                statistic_name=name,
                observed_value=0.0,
                predictive_mean=0.0,
                predictive_interval_80_lower=-1.0,
                predictive_interval_80_upper=1.0,
                p_value=0.5,
            )
            for name in VBD_TRAJECTORY_PPC_STATISTIC_NAMES
        )
        reference = TrajectoryNutsFit(
            lane=lane,
            prepared_input_hash=prepared.prepared_input_hash,
            model_input_hash=prepared.model_input_hash,
            settings=settings,
            chain_seeds=binding.chain_seeds,
            ppc_seed=binding.ppc_seed,
            movement_summary=summary,
            sampler_diagnostics=diagnostics,
            posterior_predictive_checks=ppc,
            concordance_binding_hash=binding.binding_hash,
        )
        concordance = evaluate_vbd_trajectory_quantity_concordance(
            summary, summary
        )
        lane_records.append(
            {
                "lane": lane,
                "lane_ordinal": lane_ordinal,
                "binding": {
                    **binding.body_without_hash(),
                    "binding_hash": binding.binding_hash,
                },
                "primary_fit": primary.to_dict(),
                "reference_fit": reference.to_dict(),
                "cross_engine_concordance": concordance,
                "otherwise_applicable_failing_checks": [],
            }
        )
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_CANARY_SCHEMA_VERSION,
        "plan_hash": vbd_trajectory_precision_canary_plan()["plan_hash"],
        "canary": canary,
        "panel_manifest_root": case.panel.ordered_panel_manifest_root,
        "study_plan_root": case.panel.study_plan_root,
        "lane_records": lane_records,
        "otherwise_applicable_gates_passed": True,
        "otherwise_applicable_failing_checks": [],
        "state": "HOLD",
        "hold_reasons": [VBD_TRAJECTORY_PRECISION_CANARY_HOLD_REASON],
        "acceptance_evidence_eligible": False,
        "acceptance_counts_affected": False,
        "evidence_artifact_emitted": False,
        "raw_posterior_draws_emitted": False,
        "posterior_predictive_replicates_emitted": False,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    return {**body, "result_hash": sha256_json(body)}


def test_precision_canary_plan_pins_two_disjoint_nonacceptance_bundles():
    plan = vbd_trajectory_precision_canary_plan()
    assert [(item["effect_size_sd"], item["panel_group_count"]) for item in plan["canaries"]] == [
        (0.0, 6),
        (0.5, 12),
    ]
    assert [item["bundle_seed"] for item in plan["canaries"]] == [
        2_055_900_100,
        2_055_900_101,
    ]
    assert plan["bundle_child_timeout_seconds"] == 7200
    assert plan["acceptance_evidence_eligible"] is False


def test_precision_canary_generation_and_sampler_binding_are_exact():
    case = generate_vbd_trajectory_precision_canary_case(
        0, _runner_token=_PRECISION_CANARY_GENERATION_RUNNER_TOKEN
    )
    assert case.panel.seed == 2_055_900_100
    assert case.panel.panel_group_count == 6
    assert case.panel.aggregate_k == 16
    assert case.panel.seed_namespace == "development_smoke_nonacceptance"
    ordinary = generate_vbd_trajectory_scenario_smoke_case(
        "primary", seed=2_055_900_100
    )
    assert ordinary.panel.scenario_id == "development_smoke_scenario_primary"

    binding = build_vbd_trajectory_nuts_precision_canary_binding(
        canary_ordinal=0,
        bundle_seed=case.panel.seed,
        lane="breadth",
        lane_ordinal=2,
        plan_hash=case.panel.study_plan_root,
    )
    assert binding.chain_seeds == (
        2_055_900_208,
        2_055_900_209,
        2_055_900_210,
        2_055_900_211,
    )
    assert binding.ppc_seed == 2_055_900_302
    assert _validate_reference_seeds(
        vbd_nuts_execution_settings("full"),
        binding.chain_seeds,
        binding.ppc_seed,
        precision_canary_binding=binding,
        runner_token=_VBD_TRAJECTORY_PRECISION_CANARY_RUNNER_TOKEN,
    ) == (binding.chain_seeds, binding.ppc_seed)
    with pytest.raises(ValueError):
        _validate_reference_seeds(
            vbd_nuts_execution_settings("full"),
            binding.chain_seeds,
            binding.ppc_seed,
            precision_canary_binding=binding,
            runner_token=_VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
        )


def test_precision_canary_result_cannot_be_rehashed_into_acceptance():
    value = _result()
    assert validate_vbd_trajectory_precision_canary_result(value) == value
    forged = deepcopy(value)
    forged["state"] = "PASS"
    forged["hold_reasons"] = []
    body = {key: item for key, item in forged.items() if key != "result_hash"}
    forged["result_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionCanaryError):
        validate_vbd_trajectory_precision_canary_result(forged)


def test_precision_canary_rejects_missing_retention_evidence_after_rehash():
    retention_fields = (
        "generated_point_count",
        "finite_log_weight_count",
        "retained_weight_count",
        "retained_sobol_ordinal_commitment",
        "excluded_sobol_ordinal_commitment",
        "outer_weight_retention_hash",
    )
    for field in retention_fields:
        forged = deepcopy(_result())
        fit = forged["lane_records"][0]["primary_fit"]
        fit["integration_diagnostics"].pop(field)
        fit_body = {
            key: item for key, item in fit.items() if key != "fit_summary_hash"
        }
        fit["fit_summary_hash"] = sha256_json(fit_body)
        result_body = {
            key: item for key, item in forged.items() if key != "result_hash"
        }
        forged["result_hash"] = sha256_json(result_body)
        with pytest.raises(VbdTrajectoryPrecisionCanaryError, match="fit record"):
            validate_vbd_trajectory_precision_canary_result(forged)


def test_precision_canary_rejects_coordinated_off_plan_panel_and_fit_hashes():
    panel_forged = deepcopy(_result())
    panel_forged["panel_manifest_root"] = "0" * 64
    body = {
        key: item for key, item in panel_forged.items() if key != "result_hash"
    }
    panel_forged["result_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionCanaryError, match="panel binding"):
        validate_vbd_trajectory_precision_canary_result(panel_forged)

    fit_forged = deepcopy(_result())
    for lane_ordinal, lane_record in enumerate(fit_forged["lane_records"]):
        prepared_hash = sha256_json(["forged-prepared", lane_ordinal])
        model_hash = sha256_json(["forged-model", lane_ordinal])
        for fit_name in ("primary_fit", "reference_fit"):
            fit = lane_record[fit_name]
            fit["prepared_input_hash"] = prepared_hash
            fit["model_input_hash"] = model_hash
            fit_body = {
                key: item
                for key, item in fit.items()
                if key != "fit_summary_hash"
            }
            fit["fit_summary_hash"] = sha256_json(fit_body)
    body = {
        key: item for key, item in fit_forged.items() if key != "result_hash"
    }
    fit_forged["result_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionCanaryError, match="inconsistent"):
        validate_vbd_trajectory_precision_canary_result(fit_forged)


@pytest.mark.parametrize("canary_ordinal", [0, 1])
def test_precision_canary_execution_is_permanently_tombstoned(canary_ordinal):
    with pytest.raises(VbdTrajectoryPrecisionCanaryError, match="tombstoned"):
        run_vbd_trajectory_precision_canary(canary_ordinal)
