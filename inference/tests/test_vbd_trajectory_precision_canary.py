from copy import deepcopy
import json
import subprocess

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_nuts import (
    _VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
    _VBD_TRAJECTORY_PRECISION_CANARY_RUNNER_TOKEN,
    _validate_reference_seeds,
    build_vbd_trajectory_nuts_precision_canary_binding,
    vbd_nuts_execution_settings,
)
from fluencytracr_inference.vbd_trajectory_precision_canary import (
    VBD_TRAJECTORY_PRECISION_CANARY_HOLD_REASON,
    VBD_TRAJECTORY_PRECISION_CANARY_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_CANARY_TIMEOUT_SECONDS,
    VbdTrajectoryPrecisionCanaryError,
    run_vbd_trajectory_precision_canary,
    validate_vbd_trajectory_precision_canary_result,
    vbd_trajectory_precision_canary_plan,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    _PRECISION_CANARY_GENERATION_RUNNER_TOKEN,
    generate_vbd_trajectory_precision_canary_case,
    vbd_trajectory_precision_canary_case_body,
)
from fluencytracr_inference.vbd_trajectory_types import VBD_TRAJECTORY_LANES


def _result(canary_ordinal=0):
    canary = vbd_trajectory_precision_canary_case_body(canary_ordinal)
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_CANARY_SCHEMA_VERSION,
        "plan_hash": vbd_trajectory_precision_canary_plan()["plan_hash"],
        "canary": canary,
        "panel_manifest_root": "a" * 64,
        "lane_records": [{"lane": lane} for lane in VBD_TRAJECTORY_LANES],
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


def test_precision_canary_parent_uses_one_exact_timeout_and_no_retry(monkeypatch):
    calls = []
    value = _result()

    def run(command, **kwargs):
        calls.append((command, kwargs))
        return subprocess.CompletedProcess(
            command, 0, stdout=json.dumps(value).encode(), stderr=b""
        )

    monkeypatch.setattr(subprocess, "run", run)
    assert run_vbd_trajectory_precision_canary(0) == value
    assert len(calls) == 1
    assert calls[0][1]["timeout"] == VBD_TRAJECTORY_PRECISION_CANARY_TIMEOUT_SECONDS

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(args[0], kwargs["timeout"])

    monkeypatch.setattr(subprocess, "run", timeout)
    with pytest.raises(VbdTrajectoryPrecisionCanaryError, match="timeout"):
        run_vbd_trajectory_precision_canary(0)
