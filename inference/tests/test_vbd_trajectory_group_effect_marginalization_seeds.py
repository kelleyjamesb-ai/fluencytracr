"""Frozen identity and seed checks for the marginalization diagnostic."""

from __future__ import annotations

import inspect

import pytest

import fluencytracr_inference.vbd_trajectory_nuts as nuts
import fluencytracr_inference.vbd_trajectory_synthetic as synthetic
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE,
    vbd_trajectory_group_effect_marginalization_chain_seeds,
)
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization_diagnostic import (
    vbd_trajectory_group_effect_marginalization_plan,
    vbd_trajectory_group_effect_marginalization_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_synthetic import _is_reserved_diagnostic_seed


def test_four_case_seed_plan_and_full_settings_are_exact():
    assert [
        (case.effect_size_sd, case.panel_group_count, case.generator_seed)
        for case in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CASES
    ] == [
        (0.0, 6, 2_055_901_000),
        (0.0, 12, 2_055_901_001),
        (0.5, 6, 2_055_901_002),
        (0.5, 12, 2_055_901_003),
    ]
    assert VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_GENERATOR_SEEDS == tuple(
        range(2_055_901_000, 2_055_901_004)
    )
    assert VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CHAIN_SEEDS == tuple(
        range(2_055_901_100, 2_055_901_148)
    )
    assert len(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS) == 52
    for case_ordinal in range(4):
        for lane_ordinal in range(3):
            assert vbd_trajectory_group_effect_marginalization_chain_seeds(
                case_ordinal=case_ordinal, lane_ordinal=lane_ordinal
            ) == tuple(
                2_055_901_100 + 12 * case_ordinal + 4 * lane_ordinal + chain
                for chain in range(4)
            )
    manifest = vbd_trajectory_group_effect_marginalization_seed_manifest()
    plan = vbd_trajectory_group_effect_marginalization_plan()
    assert manifest["reserved_seed_count"] == 52
    assert manifest["reserved_seeds"] == [
        *range(2_055_901_000, 2_055_901_004),
        *range(2_055_901_100, 2_055_901_148),
    ]
    assert plan["required_fit_record_count"] == 12
    assert plan["required_sampled_parameter_row_count"] == 60
    assert plan["required_reconstructed_quantity_row_count"] == 120
    assert plan["required_channel_diagnostic_row_count"] == 600
    assert plan["required_reference_comparison_count"] == 180
    assert plan["posterior_variable_order"] == [
        "alpha", "beta", "sigma_u", "sigma_r", "rho"
    ]
    assert plan["sampler_settings"] == {
        "mode": "full",
        "chains": 4,
        "draws": 20_000,
        "tune": 5_000,
        "target_accept": 0.999,
        "max_treedepth": 15,
        "init": "jitter+adapt_full",
        "cores": 1,
        "blas_cores": 1,
        "compute_convergence_checks": True,
        "full_settings": True,
        "sampler": "pymc",
    }
    assert plan["ppc_state"] == "NOT_RUN"
    assert plan["state"] == "HOLD"
    assert plan["evidence_eligible"] is False


@pytest.mark.parametrize(
    ("case_ordinal", "lane_ordinal"),
    ((-1, 0), (4, 0), (0, -1), (0, 3), (True, 0), (0, False)),
)
def test_seed_formula_rejects_off_plan_coordinates(case_ordinal, lane_ordinal):
    with pytest.raises(ValueError):
        vbd_trajectory_group_effect_marginalization_chain_seeds(
            case_ordinal=case_ordinal, lane_ordinal=lane_ordinal
        )


def test_all_52_seeds_are_exclusive_from_generic_smoke():
    assert all(
        _is_reserved_diagnostic_seed(seed)
        for seed in VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_RESERVED_SEEDS
    )
    plan = vbd_trajectory_group_effect_marginalization_plan()
    assert plan["plan_ref"] == VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF
    assert plan["seed_namespace"] == (
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
    )
    assert all(
        case["case_body"]["plan_ref"]
        == VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PLAN_REF
        and case["case_body"]["seed_namespace"]
        == VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SEED_NAMESPACE
        for case in plan["cases"]
    )


def test_old_shared_import_closure_has_no_task_local_execution_capability():
    nuts_source = inspect.getsource(nuts)
    synthetic_source = inspect.getsource(synthetic)
    assert "vbd_trajectory_group_effect_marginalization" not in nuts_source
    assert "vbd_trajectory_group_effect_marginalization" not in synthetic_source
    assert "_GROUP_EFFECT_MARGINALIZATION_DIAGNOSTIC_GENERATION_RUNNER_TOKEN" not in synthetic_source
    assert "_VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_SAMPLING_TOKEN" not in nuts_source
    assert "_sample_vbd_trajectory_group_effect_marginalization_idata" not in nuts_source
    assert "generate_vbd_trajectory_group_effect_marginalization_diagnostic_case" not in synthetic_source
