from copy import deepcopy
from types import SimpleNamespace

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_concordance import (
    VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX,
    VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN,
    concordance_chain_seeds,
    concordance_ppc_seed,
    evaluate_vbd_trajectory_quantity_concordance,
    required_vbd_trajectory_concordance_bundles,
    vbd_trajectory_concordance_plan,
    vbd_trajectory_concordance_seed_manifest_hash,
)
from fluencytracr_inference.vbd_trajectory_concordance_execution import (
    execute_vbd_trajectory_concordance_child,
)
from fluencytracr_inference.vbd_trajectory_concordance_resumable import (
    _canonical_json_bytes,
    _combined_value,
    _combined_commit_record,
    _file_sha256,
    _launch_receipt,
    _validate_child_output,
    _validate_combined_commit,
    _validate_receipt_shape,
    _validate_workspace_tree,
    combine_vbd_trajectory_concordance_workspace,
    initialize_vbd_trajectory_concordance_workspace,
    run_vbd_trajectory_concordance,
    verify_vbd_trajectory_concordance_receipt_path,
)
from fluencytracr_inference.vbd_trajectory_nuts import (
    _VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
    _expected_parameter_names,
    _validate_reference_seeds,
    TrajectoryNutsFit,
    TrajectoryPpcResult,
    TrajectorySamplerDiagnostics,
    TrajectorySamplerParameterDiagnostic,
    build_vbd_trajectory_nuts_concordance_binding,
    vbd_nuts_execution_settings,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    TrajectoryDeterministicFit,
    TrajectoryIntegrationDiagnostics,
)
from fluencytracr_inference.vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    _CONCORDANCE_GENERATION_RUNNER_TOKEN,
    _concordance_generation_context,
    generate_vbd_trajectory_scenario_smoke_case,
)
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION,
    VbdTrajectoryValidationWorkspaceError,
    _validate_concordance_receipt,
)


def _summary(
    *,
    mean=0.0,
    sd=1.0,
    lower_80=-1.0,
    upper_80=1.0,
    lower_99=-2.0,
    upper_99=2.0,
):
    return TrajectoryPosteriorSummary(
        quantity_name="trajectory_movement",
        posterior_mean=mean,
        posterior_sd=sd,
        interval_80_lower=lower_80,
        interval_80_upper=upper_80,
        interval_99_lower=lower_99,
        interval_99_upper=upper_99,
    )


def test_concordance_plan_is_exact_six_cells_by_five_seeds_by_three_lanes():
    bundles = required_vbd_trajectory_concordance_bundles()
    plan = vbd_trajectory_concordance_plan()

    assert len(bundles) == plan["bundle_count"] == 30
    assert plan["lane_fit_count_per_engine"] == 90
    assert plan["effect_sizes_sd"] == [0.0, 0.2, 0.5]
    assert plan["panel_group_counts"] == [6, 12]
    assert plan["seed_indexes"] == [0, 1, 2, 3, 4]
    assert plan["aggregate_k"] == 16
    assert len({bundle.bundle_seed for bundle in bundles}) == 30
    assert len(vbd_trajectory_concordance_seed_manifest_hash()) == 64
    assert plan["plan_hash"] == sha256_json(
        {key: value for key, value in plan.items() if key != "plan_hash"}
    )


def test_concordance_seed_formulas_match_frozen_contract():
    first = required_vbd_trajectory_concordance_bundles()[0]
    last = required_vbd_trajectory_concordance_bundles()[-1]

    assert first.bundle_seed == 2_056_500_000
    assert last.bundle_seed == 2_056_500_054
    assert concordance_chain_seeds(0, 0, 0) == (
        2_056_520_000,
        2_056_520_001,
        2_056_520_002,
        2_056_520_003,
    )
    assert concordance_chain_seeds(5, 4, 2) == (
        2_056_525_420,
        2_056_525_421,
        2_056_525_422,
        2_056_525_423,
    )
    assert concordance_ppc_seed(5, 4, 2) == 2_106_505_420


def test_cross_engine_gates_pass_at_boundaries_and_fail_outside():
    reference = _summary()
    passing = _summary(
        mean=VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD,
        sd=VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX,
        lower_80=(
            -1.0
            + VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        ),
        upper_80=(
            1.0
            - VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        ),
        lower_99=(
            -2.0
            + VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        ),
        upper_99=(
            2.0
            - VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        ),
    )
    result = evaluate_vbd_trajectory_quantity_concordance(passing, reference)
    assert result["passed"] is True
    assert result[
        "interval_80_lower_endpoint_difference_reference_sd"
    ] == pytest.approx(0.2)
    assert result[
        "interval_80_upper_endpoint_difference_reference_sd"
    ] == pytest.approx(0.2)
    assert result[
        "interval_99_lower_endpoint_difference_reference_sd"
    ] == pytest.approx(0.2)
    assert result[
        "interval_99_upper_endpoint_difference_reference_sd"
    ] == pytest.approx(0.2)

    for primary in (
        _summary(mean=VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD + 1e-8),
        _summary(
            lower_80=(
                -1.0
                - VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
                - 1e-8
            )
        ),
        _summary(
            upper_80=(
                1.0
                + VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
                + 1e-8
            )
        ),
        _summary(
            lower_99=(
                -2.0
                - VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
                - 1e-8
            )
        ),
        _summary(
            upper_99=(
                2.0
                + VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
                + 1e-8
            )
        ),
        _summary(sd=VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN - 1e-8),
        _summary(sd=VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX + 1e-8),
    ):
        assert evaluate_vbd_trajectory_quantity_concordance(
            primary, reference
        )["passed"] is False


def test_full_nuts_seed_admission_requires_exact_runner_owned_binding():
    bundle = required_vbd_trajectory_concordance_bundles()[0]
    plan_hash = vbd_trajectory_concordance_plan()["plan_hash"]
    binding = build_vbd_trajectory_nuts_concordance_binding(
        bundle_id=bundle.bundle_id,
        bundle_seed=bundle.bundle_seed,
        cell_ordinal=bundle.cell_ordinal,
        seed_index=bundle.seed_index,
        lane="frequency",
        lane_ordinal=0,
        plan_hash=plan_hash,
    )
    settings = vbd_nuts_execution_settings("full")

    assert _validate_reference_seeds(
        settings,
        binding.chain_seeds,
        binding.ppc_seed,
        concordance_binding=binding,
        runner_token=_VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
    ) == (binding.chain_seeds, binding.ppc_seed)
    with pytest.raises(ValueError, match="runner-owned"):
        _validate_reference_seeds(
            settings, binding.chain_seeds, binding.ppc_seed
        )
    with pytest.raises(ValueError, match="differ"):
        _validate_reference_seeds(
            settings,
            tuple(seed + 1 for seed in binding.chain_seeds),
            binding.ppc_seed,
            concordance_binding=binding,
            runner_token=_VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
        )


def test_acceptance_generator_and_full_nuts_require_committed_freeze(monkeypatch):
    from fluencytracr_inference import vbd_trajectory_nuts as nuts
    from fluencytracr_inference import vbd_trajectory_synthetic as synthetic
    from fluencytracr_inference import vbd_trajectory_validation_resumable as validation
    from fluencytracr_inference.vbd_trajectory_preparation import (
        TrajectoryPreparedInput,
    )
    from fluencytracr_inference.vbd_trajectory_types import (
        TrajectoryObservationPanel,
    )

    monkeypatch.setattr(validation, "read_strict_json", lambda _path: {})
    monkeypatch.setattr(
        validation,
        "_verify_current_freeze",
        lambda _value: (_ for _ in ()).throw(
            VbdTrajectoryValidationWorkspaceError("freeze required")
        ),
    )
    generator_called = {"value": False}
    monkeypatch.setattr(
        synthetic,
        "_generate_vbd_trajectory_case",
        lambda _spec: generator_called.__setitem__("value", True),
    )
    bundle = required_vbd_trajectory_concordance_bundles()[0]
    with _concordance_generation_context(
        capability_hash="1" * 64,
        capability_token_hash="2" * 64,
        launch_receipt_hash="3" * 64,
        _runner_token=_CONCORDANCE_GENERATION_RUNNER_TOKEN,
    ), pytest.raises(VbdTrajectoryValidationWorkspaceError, match="freeze required"):
        synthetic.generate_vbd_trajectory_concordance_case(bundle)
    assert generator_called["value"] is False

    monkeypatch.setattr(nuts, "validate_prepared_vbd_trajectory", lambda *_args: None)
    monkeypatch.setattr(
        nuts.pm,
        "sample",
        lambda **_kwargs: (_ for _ in ()).throw(AssertionError("sampler ran")),
    )
    prepared = object.__new__(TrajectoryPreparedInput)
    panel = object.__new__(TrajectoryObservationPanel)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError, match="freeze required"):
        nuts.fit_vbd_trajectory_nuts_reference(
            prepared,
            panel,
            chain_seeds=(),
            ppc_seed=0,
            mode="full",
        )


def _workspace_record():
    return {
        "workspace_hash": "1" * 64,
        "concordance_plan_hash": vbd_trajectory_concordance_plan()["plan_hash"],
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "2" * 64,
        "implementation_hash": "3" * 64,
        "runtime_identity_hash": "4" * 64,
        "executable_sha256": "5" * 64,
        "native_library_identity_hash": sha256_json([]),
    }


def _phase_record(phase):
    return {
        "phase": phase,
        "phase_hash": ("7" if phase == "primary" else "8") * 64,
        "phase_token": ("9" if phase == "primary" else "b") * 64,
    }


_CACHED_CONCORDANCE_CASE = None


def _cached_concordance_smoke_case():
    global _CACHED_CONCORDANCE_CASE
    if _CACHED_CONCORDANCE_CASE is None:
        _CACHED_CONCORDANCE_CASE = generate_vbd_trajectory_scenario_smoke_case(
            "primary", seed=2_055_900_100
        )
    return _CACHED_CONCORDANCE_CASE


def _fake_deterministic_fit(prepared):
    diagnostics = TrajectoryIntegrationDiagnostics(
        point_count=8192,
        finite_point_count=8192,
        effective_sample_size=1000.0,
        max_normalized_weight=0.001,
        mode_transformed=(0.0, 0.0, 0.0),
        negative_log_posterior_at_mode=1.0,
        hessian_condition_number=2.0,
        minimum_conditional_movement_variance=0.1,
        maximum_conditional_movement_variance=0.2,
        movement_support_count=16 * 8192,
    )
    return TrajectoryDeterministicFit(
        lane=prepared.lane,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        movement_summary=_summary(
            mean=0.1,
            sd=0.5,
            lower_80=-0.4,
            upper_80=0.6,
            lower_99=-0.9,
            upper_99=1.1,
        ),
        integration_diagnostics=diagnostics,
    )


def _fake_nuts_fit(prepared, binding):
    settings = vbd_nuts_execution_settings("full")
    names = _expected_parameter_names(prepared.panel_group_count)
    parameters = tuple(
        TrajectorySamplerParameterDiagnostic(
            parameter_name=name,
            r_hat=1.0,
            bulk_ess=500.0,
            tail_ess=500.0,
            posterior_mean_mcse=0.01,
            interval_80_endpoint_mcse=0.01,
            interval_99_endpoint_mcse=0.01,
            posterior_sd=0.5,
        )
        for name in names
    )
    diagnostics = TrajectorySamplerDiagnostics(
        settings=settings,
        parameters=parameters,
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
        for name in (
            "pre_post_mean_movement",
            "between_panel_group_variance",
            "within_panel_group_variance",
            "tail_or_extreme_aggregate_statistic",
            "lag_one_within_group_autocorrelation",
        )
    )
    return TrajectoryNutsFit(
        lane=prepared.lane,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        settings=settings,
        chain_seeds=binding.chain_seeds,
        ppc_seed=binding.ppc_seed,
        movement_summary=_summary(
            mean=0.1,
            sd=0.5,
            lower_80=-0.4,
            upper_80=0.6,
            lower_99=-0.9,
            upper_99=1.1,
        ),
        sampler_diagnostics=diagnostics,
        posterior_predictive_checks=ppc,
        concordance_binding_hash=binding.binding_hash,
    )


def _execute_fake_phase(monkeypatch, phase):
    from fluencytracr_inference import vbd_trajectory_concordance_execution as execution

    record = _workspace_record()
    phase_record = _phase_record(phase)
    capability_token = "d" * 64
    receipt = _launch_receipt(
        phase=phase,
        phase_record=phase_record,
        bundle_index=0,
        lane_ordinal=None if phase == "primary" else 0,
        workspace_record=record,
        capability_token_hash=sha256_json(capability_token),
    )
    monkeypatch.setattr(
        execution,
        "_read_launch_capability",
        lambda _receipt: {"capability_hash": "e" * 64},
    )
    monkeypatch.setattr(
        execution,
        "generate_vbd_trajectory_concordance_case",
        lambda _bundle: _cached_concordance_smoke_case(),
    )
    monkeypatch.setattr(
        execution, "_start_parent_liveness_watchdog", lambda _receipt: None
    )
    monkeypatch.setattr(
        execution,
        "_verify_concordance_child_source_identity",
        lambda _receipt: (
            {
                "freeze_commit": record["freeze_commit"],
                "freeze_manifest_hash": record["freeze_manifest_hash"],
                "implementation_hash": record["implementation_hash"],
                "runtime_identity_hash": record["runtime_identity_hash"],
            },
            {},
            {
                "executable_sha256": record["executable_sha256"],
                "native_libraries": [],
            },
        ),
    )
    monkeypatch.setattr(
        execution,
        "fit_vbd_trajectory_state_space",
        lambda prepared, _panel: _fake_deterministic_fit(prepared),
    )
    monkeypatch.setattr(
        execution,
        "fit_vbd_trajectory_nuts_reference",
        lambda prepared, _panel, **kwargs: _fake_nuts_fit(
            prepared, kwargs["concordance_binding"]
        ),
    )
    parent_pid = receipt["parent_process_id"]
    child_pid = parent_pid + 10_000
    with monkeypatch.context() as child:
        child.setattr(execution.os, "getpid", lambda: child_pid)
        child.setattr(execution.os, "getppid", lambda: parent_pid)
        value = execute_vbd_trajectory_concordance_child(receipt)
    return receipt, child_pid, value


@pytest.mark.parametrize("phase", ["primary", "recomputation"])
def test_child_output_is_summary_only_hash_bound_and_revalidates(monkeypatch, phase):
    receipt, child_pid, value = _execute_fake_phase(monkeypatch, phase)

    assert _validate_child_output(
        value, receipt=receipt, observed_child_pid=child_pid
    ) == value
    assert value["raw_posterior_draws_emitted"] is False
    assert value["latent_paths_emitted"] is False
    assert value["input_arrays_emitted"] is False
    assert len(value["deterministic_records"]) == (3 if phase == "primary" else 1)
    assert len(value["nuts_records"]) == (3 if phase == "primary" else 0)
    if phase == "primary":
        assert set(value["concordance_records"][0]) == {
            "lane",
            "quantity_name",
            "absolute_mean_difference_reference_sd",
            "interval_80_lower_endpoint_difference_reference_sd",
            "interval_80_upper_endpoint_difference_reference_sd",
            "interval_99_lower_endpoint_difference_reference_sd",
            "interval_99_upper_endpoint_difference_reference_sd",
            "primary_to_reference_sd_ratio",
            "passed",
            "concordance_hash",
        }

    forged = deepcopy(value)
    forged["deterministic_records"][0]["fit"]["movement_summary"][
        "posterior_mean"
    ] += 0.1
    body = {key: item for key, item in forged.items() if key != "child_output_hash"}
    forged["child_output_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_child_output(
            forged, receipt=receipt, observed_child_pid=child_pid
        )


@pytest.mark.parametrize(
    "key",
    [
        "interval_99_lower_endpoint_difference_reference_sd",
        "interval_99_upper_endpoint_difference_reference_sd",
    ],
)
def test_child_output_rejects_rehashed_missing_99_percent_endpoint(
    monkeypatch, key
):
    receipt, child_pid, value = _execute_fake_phase(monkeypatch, "primary")
    forged = deepcopy(value)
    record = forged["concordance_records"][0]
    record.pop(key)
    concordance_body = {
        item_key: item_value
        for item_key, item_value in record.items()
        if item_key != "concordance_hash"
    }
    record["concordance_hash"] = sha256_json(concordance_body)
    _coordinated_rehash_child_output(forged)

    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError,
        match="not independently rederived",
    ):
        _validate_child_output(
            forged, receipt=receipt, observed_child_pid=child_pid
        )


def test_fabricated_self_hashed_receipt_cannot_bypass_workspace_recomputation():
    freeze_identity = {
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "b" * 64,
    }
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION,
        **freeze_identity,
        "plan_hash": vbd_trajectory_concordance_plan()["plan_hash"],
        "bundle_count": 30,
        "primary_deterministic_lane_fit_count": 90,
        "nuts_lane_fit_count": 90,
        "fresh_deterministic_lane_fit_count": 90,
        "bundle_records_hash": "1" * 64,
        "primary_deterministic_records_hash": "2" * 64,
        "nuts_records_hash": "3" * 64,
        "fresh_deterministic_records_hash": "4" * 64,
        "execution_attestations_hash": "5" * 64,
        "diagnostic_summary_hash": "6" * 64,
        "hard_failure_count": 0,
        "cross_engine_failure_count": 0,
        "sampler_failure_count": 0,
        "ppc_failure_count": 0,
        "state": "PASS",
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
    }
    receipt = {**body, "receipt_hash": sha256_json(body)}
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError,
        match="workspace recomputation",
    ):
        _validate_receipt_shape(receipt, freeze_identity, token=None)
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError,
        match="external workspace verification",
    ):
        _validate_concordance_receipt(receipt, freeze_identity)


def _coordinated_rehash_child_output(value):
    for record in value["nuts_records"]:
        fit_body = {
            key: item
            for key, item in record["fit"].items()
            if key != "fit_summary_hash"
        }
        record["fit"]["fit_summary_hash"] = sha256_json(fit_body)
        record_body = {
            key: item for key, item in record.items() if key != "record_hash"
        }
        record["record_hash"] = sha256_json(record_body)
    semantic_body = {
        key: item
        for key, item in value.items()
        if key not in (
            "semantic_result_hash",
            "execution_attestation",
            "child_output_hash",
        )
    }
    value["semantic_result_hash"] = sha256_json(semantic_body)
    value["execution_attestation"]["semantic_result_hash"] = value[
        "semantic_result_hash"
    ]
    attestation_body = {
        key: item
        for key, item in value["execution_attestation"].items()
        if key != "attestation_hash"
    }
    value["execution_attestation"]["attestation_hash"] = sha256_json(
        attestation_body
    )
    output_body = {
        key: item for key, item in value.items() if key != "child_output_hash"
    }
    value["child_output_hash"] = sha256_json(output_body)
    return value


def _coordinated_rehash_provenance(value):
    deterministic_body = {
        "bundle_hash": value["bundle"]["bundle_hash"],
        "ordered_panel_manifest_root": value["ordered_panel_manifest_root"],
        "truth_receipt_hash": value["truth_receipt_hash"],
        "records": [
            {
                key: item
                for key, item in record.items()
                if key not in ("process_phase_binding_hash", "record_hash")
            }
            for record in value["deterministic_records"]
        ],
    }
    value["deterministic_semantic_hash"] = sha256_json(deterministic_body)
    value["execution_attestation"]["deterministic_semantic_hash"] = value[
        "deterministic_semantic_hash"
    ]
    return _coordinated_rehash_child_output(value)


@pytest.mark.parametrize(
    "mutation",
    [
        lambda fit: fit.__setitem__("posterior_draws", [0.1, 0.2]),
        lambda fit: fit["settings"].__setitem__("draws", 999),
        lambda fit: fit["sampler_diagnostics"].__setitem__("passed", False),
    ],
)
def test_coordinated_rehash_cannot_launder_unknown_or_forged_nuts_content(
    monkeypatch, mutation
):
    receipt, child_pid, value = _execute_fake_phase(monkeypatch, "primary")
    forged = deepcopy(value)
    mutation(forged["nuts_records"][0]["fit"])
    _coordinated_rehash_child_output(forged)

    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_child_output(
            forged, receipt=receipt, observed_child_pid=child_pid
        )


def test_child_output_requires_separate_80_and_99_endpoint_mcse(monkeypatch):
    receipt, child_pid, value = _execute_fake_phase(monkeypatch, "primary")
    forged = deepcopy(value)
    parameter = forged["nuts_records"][0]["fit"]["sampler_diagnostics"][
        "parameters"
    ][0]
    parameter.pop("interval_99_endpoint_mcse")
    parameter["interval_endpoint_mcse"] = 0.01
    _coordinated_rehash_child_output(forged)

    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_child_output(
            forged, receipt=receipt, observed_child_pid=child_pid
        )


def test_recomputation_rejects_a_coherently_rehashed_primary_envelope(monkeypatch):
    _primary_receipt, child_pid, primary = _execute_fake_phase(
        monkeypatch, "primary"
    )
    recompute_record = _workspace_record()
    recompute_receipt = _launch_receipt(
        phase="recomputation",
        phase_record=_phase_record("recomputation"),
        bundle_index=0,
        lane_ordinal=0,
        workspace_record=recompute_record,
        capability_token_hash="f" * 64,
    )
    forged = deepcopy(primary)
    forged["phase"] = "recomputation"
    forged["lane_ordinal"] = 0
    forged["lane"] = "frequency"
    forged["execution_attestation"]["phase"] = "recomputation"
    forged["execution_attestation"]["phase_hash"] = recompute_receipt["phase_hash"]
    forged["execution_attestation"]["phase_token"] = recompute_receipt["phase_token"]
    forged["execution_attestation"]["lane_ordinal"] = 0
    forged["execution_attestation"]["lane"] = "frequency"
    forged["execution_attestation"]["launch_receipt_hash"] = recompute_receipt[
        "launch_receipt_hash"
    ]
    _coordinated_rehash_child_output(forged)

    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_child_output(
            forged, receipt=recompute_receipt, observed_child_pid=child_pid
        )


@pytest.mark.parametrize(
    "key",
    [
        "ordered_panel_manifest_root",
        "lane_observation_roots_hash",
        "truth_receipt_hash",
    ],
)
def test_child_output_rejects_rehashed_malformed_provenance_roots(
    monkeypatch, key
):
    receipt, child_pid, value = _execute_fake_phase(monkeypatch, "primary")
    forged = deepcopy(value)
    forged[key] = "not-a-sha256"
    _coordinated_rehash_provenance(forged)

    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_child_output(
            forged, receipt=receipt, observed_child_pid=child_pid
        )


def test_workspace_tree_rejects_raw_arrays_and_off_plan_files(tmp_path):
    (tmp_path / "primary").mkdir()
    (tmp_path / "recomputation").mkdir()
    (tmp_path / "primary" / "phase.json").write_text("{}\n", encoding="utf-8")
    (tmp_path / "recomputation" / "phase.json").write_text(
        "{}\n", encoding="utf-8"
    )
    _validate_workspace_tree(tmp_path, complete=False)

    raw = tmp_path / "posterior_draws.npy"
    raw.write_bytes(b"unsafe")
    with pytest.raises(VbdTrajectoryValidationWorkspaceError, match="off-plan"):
        _validate_workspace_tree(tmp_path, complete=False)


def test_file_hashing_rejects_symlink_paths(tmp_path):
    target = tmp_path / "target.json"
    target.write_text("{}\n", encoding="utf-8")
    link = tmp_path / "link.json"
    link.symlink_to(target)

    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _file_sha256(link)


def test_combined_marker_binds_exact_combined_receipt_and_snapshot_bytes(tmp_path):
    combined = {
        "workspace_hash": "1" * 64,
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "2" * 64,
        "plan_hash": "3" * 64,
        "combined_hash": "4" * 64,
        "execution_evidence_snapshot_hash": "5" * 64,
    }
    receipt = {"receipt_hash": "6" * 64}
    summary = {"summary_hash": "7" * 64}
    (tmp_path / "combined.json").write_text("{}\n", encoding="utf-8")
    (tmp_path / "concordance_receipt.json").write_text("{}\n", encoding="utf-8")
    (tmp_path / "concordance_summary.json").write_text("{}\n", encoding="utf-8")
    marker = _combined_commit_record(
        workspace=tmp_path,
        combined=combined,
        receipt=receipt,
        summary=summary,
    )
    assert _validate_combined_commit(
        marker,
        workspace=tmp_path,
        combined=combined,
        receipt=receipt,
        summary=summary,
    ) == marker

    (tmp_path / "combined.json").write_text('{"drift":true}\n', encoding="utf-8")
    with pytest.raises(VbdTrajectoryValidationWorkspaceError, match="drifted"):
        _validate_combined_commit(
            marker,
            workspace=tmp_path,
            combined=combined,
            receipt=receipt,
            summary=summary,
        )

    (tmp_path / "combined.json").write_text("{}\n", encoding="utf-8")
    (tmp_path / "concordance_summary.json").write_text(
        '{"drift":true}\n', encoding="utf-8"
    )
    with pytest.raises(VbdTrajectoryValidationWorkspaceError, match="drifted"):
        _validate_combined_commit(
            marker,
            workspace=tmp_path,
            combined=combined,
            receipt=receipt,
            summary=summary,
        )


def test_combiner_requires_all_120_process_attestations(monkeypatch, tmp_path):
    bundles = required_vbd_trajectory_concordance_bundles()
    parameters = [
        {
            "r_hat": 1.0,
            "bulk_ess": 500.0,
            "tail_ess": 500.0,
            "max_mcse_to_posterior_sd_ratio": 0.02,
        }
    ]
    ppc = [{"p_value": 0.5, "passed": True}]
    primary = []
    recomputation = []
    for bundle_index, bundle in enumerate(bundles):
        deterministic_records = []
        nuts_records = []
        concordance_records = []
        for lane_ordinal in range(3):
            fit_semantic_hash = sha256_json(
                ["deterministic", bundle_index, lane_ordinal]
            )
            deterministic_record = {
                "fit_semantic_hash": fit_semantic_hash,
                "record_hash": sha256_json(["primary", bundle_index, lane_ordinal]),
            }
            deterministic_records.append(deterministic_record)
            nuts_records.append(
                {
                    "fit": {
                        "sampler_diagnostics": {
                            "parameters": parameters,
                            "energy_bfmi_min": 0.5,
                            "post_warmup_divergences": 0,
                            "max_treedepth_saturation_count": 0,
                            "failing_diagnostics": [],
                        },
                            "posterior_predictive_checks": [
                                dict(item) for item in ppc
                            ],
                    },
                    "record_hash": sha256_json(
                        ["nuts", bundle_index, lane_ordinal]
                    ),
                }
            )
            concordance_records.append(
                {
                    "absolute_mean_difference_reference_sd": 0.01,
                    "interval_80_lower_endpoint_difference_reference_sd": 0.01,
                    "interval_80_upper_endpoint_difference_reference_sd": 0.01,
                    "interval_99_lower_endpoint_difference_reference_sd": 0.01,
                    "interval_99_upper_endpoint_difference_reference_sd": 0.01,
                    "primary_to_reference_sd_ratio": 1.0,
                    "passed": True,
                }
            )
            recomputation.append(
                {
                    "bundle": bundle.to_dict(),
                    "lane_ordinal": lane_ordinal,
                    "ordered_panel_manifest_root": "a" * 64,
                    "lane_observation_roots_hash": "b" * 64,
                    "truth_receipt_hash": "c" * 64,
                    "deterministic_records": [deterministic_record],
                    "execution_attestation": {
                        "process_token": f"recompute-process-{bundle_index}-{lane_ordinal}",
                        "process_phase_binding_hash": (
                            f"recompute-binding-{bundle_index}-{lane_ordinal}"
                        ),
                    },
                    "child_output_hash": sha256_json(
                        ["recompute-output", bundle_index, lane_ordinal]
                    ),
                    "state": "PASS",
                }
            )
        primary.append(
            {
                "bundle": bundle.to_dict(),
                "ordered_panel_manifest_root": "a" * 64,
                "lane_observation_roots_hash": "b" * 64,
                "truth_receipt_hash": "c" * 64,
                "deterministic_records": deterministic_records,
                "nuts_records": nuts_records,
                "concordance_records": concordance_records,
                "execution_attestation": {
                    "process_token": f"primary-process-{bundle_index}",
                    "process_phase_binding_hash": f"primary-binding-{bundle_index}",
                },
                "child_output_hash": sha256_json(["primary-output", bundle_index]),
                "state": "PASS",
            }
        )
    launches = {
        "primary": [
            {
                "launch_token": f"primary-launch-{index}",
                "capability_token_hash": f"primary-capability-{index}",
            }
            for index in range(30)
        ],
        "recomputation": [
            {
                "launch_token": f"recompute-launch-{index}",
                "capability_token_hash": f"recompute-capability-{index}",
            }
            for index in range(90)
        ],
    }
    results = {"primary": primary, "recomputation": recomputation}
    monkeypatch.setattr(
        "fluencytracr_inference.vbd_trajectory_concordance_resumable._load_all_results",
        lambda *_args: (results, launches),
    )
    monkeypatch.setattr(
        "fluencytracr_inference.vbd_trajectory_concordance_resumable._execution_evidence_snapshot",
        lambda _workspace: {"snapshot_hash": "f" * 64},
    )
    monkeypatch.setattr(
        "fluencytracr_inference.vbd_trajectory_concordance_resumable._rederive_concordance_source_roots",
        lambda _bundle: {
            "ordered_panel_manifest_root": "a" * 64,
            "lane_observation_roots_hash": "b" * 64,
            "truth_receipt_hash": "c" * 64,
        },
    )
    record = {
        "workspace_hash": "1" * 64,
        "workspace_token": "workspace-token",
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "2" * 64,
        "concordance_plan_hash": vbd_trajectory_concordance_plan()["plan_hash"],
    }
    phases = (
        {"phase": "primary", "phase_token": "primary-phase-token"},
        {"phase": "recomputation", "phase_token": "recompute-phase-token"},
    )

    combined = _combined_value(tmp_path, record, phases)

    assert combined["bundle_count"] == 30
    assert combined["primary_deterministic_lane_fit_count"] == 90
    assert combined["nuts_lane_fit_count"] == 90
    assert combined["fresh_deterministic_lane_fit_count"] == 90
    assert combined["state"] == "PASS"
    assert combined["diagnostic_summary_hash"] == combined["diagnostic_summary"][
        "diagnostic_summary_hash"
    ]
    assert combined["diagnostic_summary"]["cross_engine_concordance"] == {
        "max_mean_difference_reference_sd": 0.01,
        "max_interval_80_endpoint_difference_reference_sd": 0.01,
        "max_interval_99_endpoint_difference_reference_sd": 0.01,
        "min_primary_to_reference_sd_ratio": 1.0,
        "max_primary_to_reference_sd_ratio": 1.0,
        "failure_count": 0,
    }

    recomputation[0]["truth_receipt_hash"] = "d" * 64
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError,
        match="bundle universe or recomputation equality",
    ):
        _combined_value(tmp_path, record, phases)

    recomputation[0]["truth_receipt_hash"] = "c" * 64
    primary[0]["nuts_records"][0]["fit"]["sampler_diagnostics"][
        "failing_diagnostics"
    ] = ["posterior_predictive_check"]
    primary[0]["nuts_records"][0]["fit"]["posterior_predictive_checks"][0][
        "p_value"
    ] = 0.0
    primary[0]["nuts_records"][0]["fit"]["posterior_predictive_checks"][0][
        "passed"
    ] = False
    primary[0]["state"] = "HOLD"
    held = _combined_value(tmp_path, record, phases)
    assert held["state"] == "HOLD"
    assert held["sampler_failure_count"] == 0
    assert held["ppc_failure_count"] == 1


def test_public_workspace_lifecycle_is_create_once_resumable_and_reverified(
    monkeypatch, tmp_path
):
    from fluencytracr_inference import (
        vbd_trajectory_concordance_execution as execution,
    )
    from fluencytracr_inference import (
        vbd_trajectory_concordance_resumable as resumable,
    )

    identity = {
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "1" * 64,
        "candidate_source_commit": "b" * 40,
        "candidate_source_tree": "c" * 40,
        "implementation_hash": "2" * 64,
        "runtime_identity_hash": "3" * 64,
        "executable_sha256": "4" * 64,
        "native_library_identity_hash": sha256_json([]),
        "plan_hash": "5" * 64,
        "seed_manifest_hash": "6" * 64,
    }
    fake_repo = tmp_path / "repo"
    manifest_path = fake_repo / "inference/evidence/vbd_trajectory_freeze_manifest.json"
    manifest_path.parent.mkdir(parents=True)
    manifest_path.write_text('{"synthetic_freeze":true}\n', encoding="utf-8")
    monkeypatch.setattr(resumable, "_repo_root", lambda: fake_repo)
    monkeypatch.setattr(resumable, "_validate_freeze_manifest", lambda value: value)
    monkeypatch.setattr(resumable, "_verify_current_freeze", lambda _value: identity)

    panel = SimpleNamespace(
        ordered_panel_manifest_root="a" * 64,
        lane_observation_roots=(
            ("frequency", "d" * 64),
            ("engagement", "e" * 64),
            ("breadth", "f" * 64),
        ),
        seed_manifest_root="9" * 64,
    )
    source_case = SimpleNamespace(panel=panel)
    source_roots = {
        "ordered_panel_manifest_root": panel.ordered_panel_manifest_root,
        "lane_observation_roots_hash": sha256_json(
            [list(item) for item in panel.lane_observation_roots]
        ),
        "truth_receipt_hash": "c" * 64,
    }
    monkeypatch.setattr(
        resumable,
        "_rederive_concordance_source_roots",
        lambda _bundle: source_roots,
    )
    monkeypatch.setattr(
        execution,
        "generate_vbd_trajectory_concordance_case",
        lambda _bundle: source_case,
    )
    monkeypatch.setattr(execution, "_truth_receipt_hash", lambda _case: "c" * 64)
    monkeypatch.setattr(
        execution,
        "prepare_vbd_trajectory_lane",
        lambda _panel, lane: SimpleNamespace(
            lane=lane,
            prepared_input_hash=sha256_json(["prepared", lane]),
            model_input_hash=sha256_json(["model", lane]),
            context_binding_hash=sha256_json(["context", lane]),
            panel_group_count=6,
        ),
    )
    monkeypatch.setattr(
        execution, "_read_launch_capability", lambda _receipt: {"capability_hash": "7" * 64}
    )
    monkeypatch.setattr(execution, "_start_parent_liveness_watchdog", lambda _receipt: None)
    monkeypatch.setattr(
        execution,
        "_verify_concordance_child_source_identity",
        lambda _receipt: (
            identity,
            {},
            {
                "executable_sha256": identity["executable_sha256"],
                "native_libraries": [],
            },
        ),
    )
    monkeypatch.setattr(
        execution,
        "fit_vbd_trajectory_state_space",
        lambda prepared, _panel: _fake_deterministic_fit(prepared),
    )
    monkeypatch.setattr(
        execution,
        "fit_vbd_trajectory_nuts_reference",
        lambda prepared, _panel, **kwargs: _fake_nuts_fit(
            prepared, kwargs["concordance_binding"]
        ),
    )
    launches = {"count": 0}

    def fake_launch_child(*, receipt, capability_token, verify_lock_identity):
        assert type(capability_token) is str
        verify_lock_identity()
        launches["count"] += 1
        child_pid = 50_000 + launches["count"]
        with monkeypatch.context() as child:
            child.setattr(execution.os, "getpid", lambda: child_pid)
            child.setattr(
                execution.os,
                "getppid",
                lambda: receipt["parent_process_id"],
            )
            value = execute_vbd_trajectory_concordance_child(receipt)
        return child_pid, 0, _canonical_json_bytes(value), b""

    monkeypatch.setattr(resumable, "_launch_child", fake_launch_child)
    workspace = tmp_path / "concordance-workspace"

    assert initialize_vbd_trajectory_concordance_workspace(workspace) == workspace
    first = run_vbd_trajectory_concordance(workspace)
    assert len(first) == 30
    assert all(item["state"] == "PASS" for item in first)
    assert launches["count"] == 120

    resumed = run_vbd_trajectory_concordance(workspace)
    assert resumed == first
    assert launches["count"] == 120

    receipt = combine_vbd_trajectory_concordance_workspace(workspace)
    assert receipt["state"] == "PASS"
    assert verify_vbd_trajectory_concordance_receipt_path(
        workspace / "concordance_receipt.json",
        freeze_identity=identity,
    ) == receipt
    summary = resumable.read_strict_json(workspace / "concordance_summary.json")
    assert summary["diagnostic_summary"]["posterior_means_emitted"] is False
    assert summary["diagnostic_summary"][
        "posterior_interval_endpoints_emitted"
    ] is False

    primary_launch = workspace / "primary" / "launches" / "bundle_00.json"
    primary_result = workspace / "primary" / "results" / "bundle_00.json"
    primary_launch.unlink()
    primary_result.unlink()
    monkeypatch.setattr(
        resumable,
        "_launch_child",
        lambda **_kwargs: pytest.fail("deleted concordance evidence must not rerun"),
    )
    with pytest.raises(
        VbdTrajectoryValidationWorkspaceError,
        match="interrupted before a create-once result",
    ):
        resumable.run_vbd_trajectory_concordance_bundle(workspace, 0)
    assert launches["count"] == 120
    assert primary_launch.is_file()
    assert (workspace / "primary" / "failures" / "bundle_00.json").is_file()


def test_concordance_workspace_rejects_completed_subtree_replacement(tmp_path):
    from fluencytracr_inference import vbd_trajectory_concordance_resumable as runner

    workspace = tmp_path / "concordance-workspace"
    workspace.mkdir()
    identity = {
        "freeze_commit": "a" * 40,
        "freeze_manifest_hash": "1" * 64,
        "candidate_source_commit": "b" * 40,
        "candidate_source_tree": "c" * 40,
        "implementation_hash": "2" * 64,
        "runtime_identity_hash": "3" * 64,
        "executable_sha256": "4" * 64,
        "native_library_identity_hash": "5" * 64,
        "plan_hash": "6" * 64,
        "seed_manifest_hash": "7" * 64,
    }
    with runner._exclusive_lock(workspace / ".runner.lock"):
        runner._ensure_workspace_directories(
            workspace, runner._CONCORDANCE_WORKSPACE_DIRECTORIES
        )
        runner._attempt_anchor_root_binding(workspace, create=True)
        body = runner._workspace_body(workspace, identity)
        record = {**body, "workspace_hash": sha256_json(body)}
        assert runner._validate_workspace(record, workspace) == record
    displaced = workspace / "displaced-results"
    (workspace / "primary" / "results").rename(displaced)
    (workspace / "primary" / "results").mkdir()
    with runner._exclusive_lock(workspace / ".runner.lock"):
        with pytest.raises(
            VbdTrajectoryValidationWorkspaceError,
            match="concordance workspace is invalid",
        ):
            runner._validate_workspace(record, workspace)
