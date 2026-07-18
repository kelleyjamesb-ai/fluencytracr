from copy import deepcopy

import numpy as np
import pytest
import xarray as xr

import fluencytracr_inference.vbd_trajectory_nuts as nuts_module
import fluencytracr_inference.vbd_trajectory_precision_diagnostic as diagnostic_module
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_nuts import (
    _validate_reference_seeds,
    build_vbd_trajectory_nuts_precision_diagnostic_binding,
    vbd_nuts_execution_settings,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES,
    VbdTrajectoryPrecisionDiagnosticError,
    build_vbd_trajectory_precision_diagnostic_record,
    project_vbd_trajectory_precision_diagnostic_lane,
    validate_vbd_trajectory_precision_diagnostic_lane,
    validate_vbd_trajectory_precision_diagnostic_record,
    vbd_trajectory_precision_diagnostic_plan,
    vbd_trajectory_precision_diagnostic_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_CHAIN_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_GENERATOR_SEED,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    generate_vbd_trajectory_scenario_smoke_case,
    generate_vbd_trajectory_smoke_case,
    vbd_trajectory_precision_diagnostic_case_body,
)
from fluencytracr_inference.vbd_trajectory_types import VBD_TRAJECTORY_LANES
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    VbdTrajectoryValidationWorkspaceError,
    _validate_combined_value,
    _validate_freeze_manifest,
)
from fluencytracr_inference.vbd_trajectory_validation_study import (
    VbdTrajectoryValidationStudyError,
    vbd_trajectory_slot_result_from_dict,
)


def _metric_tree(scalar: float, vector: float | None = None) -> xr.Dataset:
    value = scalar if vector is None else vector
    return xr.Dataset(
        {
            "alpha": xr.DataArray(scalar),
            "beta": xr.DataArray(scalar),
            "sigma_u": xr.DataArray(scalar),
            "u": xr.DataArray(
                np.full(6, value, dtype=np.float64),
                dims=("u_dim_0",),
                coords={"u_dim_0": np.arange(6)},
            ),
            "sigma_r": xr.DataArray(scalar),
            "rho": xr.DataArray(scalar),
            "trajectory_movement": xr.DataArray(scalar),
        }
    )


def _metric_trees(_prefix_idata):
    return (
        ("r_hat", _metric_tree(1.0)),
        ("bulk_ess", _metric_tree(1_000.0)),
        ("tail_ess", _metric_tree(900.0)),
        ("quantile_ess_005", _metric_tree(700.0)),
        ("quantile_ess_995", _metric_tree(710.0)),
        ("mean", _metric_tree(0.01)),
        ("interval_80_lower", _metric_tree(0.02)),
        ("interval_80_upper", _metric_tree(0.03)),
        ("interval_99_lower", _metric_tree(0.04)),
        ("interval_99_upper", _metric_tree(0.05)),
    )


@pytest.fixture(scope="module")
def fake_idata():
    draw = np.arange(20_000, dtype=np.float64)
    base = np.stack(
        [np.sin((draw + 1.0) / 37.0) + chain * 0.001 for chain in range(4)]
    )
    coords = {"chain": np.arange(4), "draw": np.arange(20_000)}
    posterior = xr.Dataset(
        {
            "alpha": (("chain", "draw"), base),
            "beta": (("chain", "draw"), base + 0.1),
            "sigma_u": (("chain", "draw"), base + 2.0),
            "u": (
                ("chain", "draw", "u_dim_0"),
                np.stack([base + index * 0.1 for index in range(6)], axis=2),
            ),
            "sigma_r": (("chain", "draw"), base + 3.0),
            "rho": (("chain", "draw"), base * 0.1),
            "trajectory_movement": (("chain", "draw"), base + 0.5),
        },
        coords={**coords, "u_dim_0": np.arange(6)},
    )
    sample_stats = xr.Dataset(
        {
            "diverging": (
                ("chain", "draw"),
                np.zeros((4, 20_000), dtype=bool),
            ),
            "tree_depth": (
                ("chain", "draw"),
                np.ones((4, 20_000), dtype=np.int64),
            ),
            "energy": (("chain", "draw"), base + 10.0),
        },
        coords=coords,
    )
    return xr.DataTree.from_dict(
        {
            "/posterior": posterior,
            "/sample_stats": sample_stats,
        }
    )


@pytest.fixture
def projected_lanes(fake_idata, monkeypatch):
    monkeypatch.setattr(diagnostic_module, "_diagnostic_metric_trees", _metric_trees)
    monkeypatch.setattr(
        diagnostic_module, "_bfmi_values", lambda _idata: np.ones(4)
    )
    monkeypatch.setattr(
        nuts_module.pm,
        "sample",
        lambda *args, **kwargs: pytest.fail("implementation tests cannot sample"),
    )
    case_plan_hash = sha256_json(vbd_trajectory_precision_diagnostic_case_body())
    lanes = []
    for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
        binding = build_vbd_trajectory_nuts_precision_diagnostic_binding(
            generator_seed=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_GENERATOR_SEED,
            lane=lane,
            lane_ordinal=lane_ordinal,
            plan_hash=case_plan_hash,
        )
        lanes.append(
            project_vbd_trajectory_precision_diagnostic_lane(
                fake_idata,
                lane=lane,
                lane_ordinal=lane_ordinal,
                binding=binding,
                prepared_input_hash=sha256_json(["prepared", lane]),
                model_input_hash=sha256_json(["model", lane]),
            )
        )
    return lanes


def _provenance():
    implementation = "1" * 40
    return {
        "authorization_commit": "2" * 40,
        "authorization_manifest_hash": "3" * 64,
        "execution_authorization_hash": "4" * 64,
        "implementation_commit": implementation,
        "implementation_tree": "5" * 40,
        "implementation_review_refs": {
            "CODE": f"review:code/go/{implementation}/code-review",
            "BUG": f"review:bug/go/{implementation}/bug-review",
            "ADVERSARIAL": f"review:adversarial/go/{implementation}/adversarial-review",
            "STATISTICAL_METHODOLOGY": (
                f"review:statistical-methodology/go/{implementation}/stats-review"
            ),
        },
        "canonical_workspace_identity_hash": "6" * 64,
        "external_claim_hash": "7" * 64,
        "input_binding_hash": "8" * 64,
        "runtime_identity_hash": "9" * 64,
        "requirements_lock_hash": "a" * 64,
        "implementation_hash": "b" * 64,
        "native_library_manifest_hash": "c" * 64,
        "model_manifest_hash": "d" * 64,
        "synthetic_input_hash": "e" * 64,
        "panel_manifest_root": "f" * 64,
    }


def _rehash_lane(lane):
    fit_body = {
        key: lane[key]
        for key in (
            "prepared_input_hash",
            "model_input_hash",
            "parameter_rows",
            "post_warmup_divergences",
            "max_treedepth_saturation_count",
            "energy_bfmi_by_chain",
            "non_mcse_sampler_failures",
            "ppc_state",
            "cross_engine_state",
        )
    }
    fit_body["binding_hash"] = lane["binding"]["binding_hash"]
    lane["fit_summary_hash"] = sha256_json(fit_body)
    body = {key: value for key, value in lane.items() if key != "lane_result_hash"}
    lane["lane_result_hash"] = sha256_json(body)


def test_diagnostic_plan_and_seeds_are_exact_and_nonaccepting():
    plan = vbd_trajectory_precision_diagnostic_plan()
    seeds = vbd_trajectory_precision_diagnostic_seed_manifest()
    assert plan["case"]["generator_seed"] == 2_055_900_400
    assert seeds["reserved_seeds"] == [2_055_900_400, *range(2_055_900_500, 2_055_900_512)]
    assert plan["prefix_draws_per_chain"] == [5_000, 10_000, 20_000]
    assert plan["ppc_state"] == plan["cross_engine_state"] == "NOT_RUN"
    assert plan["state"] == "HOLD"
    assert plan["evidence_eligible"] is False
    assert plan["acceptance_count_effect"] == 0


@pytest.mark.parametrize(
    "seed",
    [VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_GENERATOR_SEED],
)
def test_reserved_generator_seed_is_rejected_by_generic_smoke(seed):
    with pytest.raises(ValueError, match="reserved diagnostic"):
        generate_vbd_trajectory_smoke_case(seed=seed)
    with pytest.raises(ValueError, match="reserved diagnostic"):
        generate_vbd_trajectory_scenario_smoke_case("frequency_only", seed=seed)


def test_reserved_chain_seeds_are_rejected_by_generic_smoke_nuts():
    settings = vbd_nuts_execution_settings("smoke")
    for seed in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_CHAIN_SEEDS:
        with pytest.raises(ValueError, match="reserved diagnostic"):
            _validate_reference_seeds(
                settings,
                (seed, 2_055_900_001),
                2_055_900_002,
            )


def test_projection_is_complete_sanitized_and_hash_bound(projected_lanes):
    assert [lane["lane"] for lane in projected_lanes] == list(VBD_TRAJECTORY_LANES)
    assert sum(len(lane["parameter_rows"]) for lane in projected_lanes) == 108
    for lane in projected_lanes:
        assert validate_vbd_trajectory_precision_diagnostic_lane(lane) == lane
        assert len(lane["energy_bfmi_by_chain"]) == 4
        assert lane["ppc_state"] == lane["cross_engine_state"] == "NOT_RUN"
        assert tuple(
            row["parameter_name"] for row in lane["parameter_rows"][:12]
        ) == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES
        encoded = repr(lane)
        for forbidden in (
            "'posterior_sd':",
            "'posterior_mean':",
            "'interval_endpoint':",
            "'raw_posterior_draws':",
        ):
            assert forbidden not in encoded


def test_record_reconstructs_failures_and_cannot_be_rehashed_to_pass(projected_lanes):
    record = build_vbd_trajectory_precision_diagnostic_record(
        provenance=_provenance(), lane_records=projected_lanes
    )
    assert validate_vbd_trajectory_precision_diagnostic_record(record) == record
    assert record["state"] == "HOLD"
    assert record["task_2_6_complete"] is False
    assert record["ppc_state"] == record["cross_engine_state"] == "NOT_RUN"

    forged = deepcopy(record)
    forged["state"] = "PASS"
    body = {key: value for key, value in forged.items() if key != "record_hash"}
    forged["record_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError):
        validate_vbd_trajectory_precision_diagnostic_record(forged)


def test_diagnostic_record_is_categorically_rejected_by_proof_paths(projected_lanes):
    record = build_vbd_trajectory_precision_diagnostic_record(
        provenance=_provenance(), lane_records=projected_lanes
    )
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_freeze_manifest(record)
    with pytest.raises(VbdTrajectoryValidationStudyError):
        vbd_trajectory_slot_result_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_combined_value(record, {})


def test_missing_reordered_or_mutated_rows_reject_after_coordinated_rehash(projected_lanes):
    for mutation in ("missing", "reordered", "ratio", "plan_hash"):
        forged = deepcopy(projected_lanes[0])
        if mutation == "missing":
            forged["parameter_rows"].pop()
        elif mutation == "reordered":
            forged["parameter_rows"][0], forged["parameter_rows"][1] = (
                forged["parameter_rows"][1],
                forged["parameter_rows"][0],
            )
        elif mutation == "ratio":
            row = forged["parameter_rows"][0]
            row["mcse_to_posterior_sd_ratios"]["mean"] = -0.1
            row_body = {key: value for key, value in row.items() if key != "row_hash"}
            row["row_hash"] = sha256_json(row_body)
        else:
            forged["binding"]["plan_hash"] = "0" * 64
            binding_body = {
                key: value
                for key, value in forged["binding"].items()
                if key != "binding_hash"
            }
            forged["binding"]["binding_hash"] = sha256_json(binding_body)
        _rehash_lane(forged)
        with pytest.raises(VbdTrajectoryPrecisionDiagnosticError):
            validate_vbd_trajectory_precision_diagnostic_lane(forged)


def test_fabricated_review_references_reject(projected_lanes):
    provenance = _provenance()
    provenance["implementation_review_refs"]["CODE"] = (
        "review:code/go/" + provenance["implementation_commit"] + "/duplicate"
    )
    provenance["implementation_review_refs"]["BUG"] = provenance[
        "implementation_review_refs"
    ]["CODE"]
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticError,
        match="review references",
    ):
        build_vbd_trajectory_precision_diagnostic_record(
            provenance=provenance, lane_records=projected_lanes
        )


def test_mcse_gate_is_strictly_greater_than_point_one(projected_lanes):
    lanes = deepcopy(projected_lanes)
    row = lanes[0]["parameter_rows"][24]
    row["mcse_to_posterior_sd_ratios"]["mean"] = 0.1
    row_body = {key: value for key, value in row.items() if key != "row_hash"}
    row["row_hash"] = sha256_json(row_body)
    _rehash_lane(lanes[0])
    record = build_vbd_trajectory_precision_diagnostic_record(
        provenance=_provenance(), lane_records=lanes
    )
    assert not any(
        item["lane"] == "frequency"
        and item["parameter_name"] == "alpha"
        and item["endpoint"] == "mean"
        for item in record["full_prefix_failing_coordinates"]
    )

    row["mcse_to_posterior_sd_ratios"]["mean"] = 0.10000000000000002
    row_body = {key: value for key, value in row.items() if key != "row_hash"}
    row["row_hash"] = sha256_json(row_body)
    _rehash_lane(lanes[0])
    record = build_vbd_trajectory_precision_diagnostic_record(
        provenance=_provenance(), lane_records=lanes
    )
    assert any(
        item["lane"] == "frequency"
        and item["parameter_name"] == "alpha"
        and item["endpoint"] == "mean"
        for item in record["full_prefix_failing_coordinates"]
    )


def test_arviz_method_mapping_is_exact(monkeypatch):
    calls = []
    tree = _metric_tree(1.0)

    monkeypatch.setattr(
        diagnostic_module.az,
        "rhat",
        lambda value, **kwargs: calls.append(("rhat", kwargs)) or tree,
    )
    monkeypatch.setattr(
        diagnostic_module.az,
        "ess",
        lambda value, **kwargs: calls.append(("ess", kwargs)) or tree,
    )
    monkeypatch.setattr(
        diagnostic_module.az,
        "mcse",
        lambda value, **kwargs: calls.append(("mcse", kwargs)) or tree,
    )
    diagnostic_module._diagnostic_metric_trees(object())
    assert calls == [
        ("rhat", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES)}),
        ("ess", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "bulk"}),
        ("ess", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "tail"}),
        ("ess", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "quantile", "prob": 0.005}),
        ("ess", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "quantile", "prob": 0.995}),
        ("mcse", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "mean"}),
        ("mcse", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "quantile", "prob": 0.1}),
        ("mcse", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "quantile", "prob": 0.9}),
        ("mcse", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "quantile", "prob": 0.005}),
        ("mcse", {"var_names": list(nuts_module.VBD_TRAJECTORY_NUTS_PARAMETER_VARIABLES), "method": "quantile", "prob": 0.995}),
    ]
