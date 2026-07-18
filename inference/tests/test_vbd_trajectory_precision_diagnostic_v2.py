from copy import deepcopy

import numpy as np
import pymc as pm
import pytest
import xarray as xr

import fluencytracr_inference.vbd_trajectory_nuts as nuts_module
import fluencytracr_inference.vbd_trajectory_precision_diagnostic as diagnostic_module
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_nuts import (
    _build_reference_model,
    _validate_reference_seeds,
    build_vbd_trajectory_nuts_precision_diagnostic_v2_binding,
    vbd_nuts_execution_settings,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES,
    VbdTrajectoryPrecisionDiagnosticError,
    build_vbd_trajectory_precision_diagnostic_v2_record,
    project_vbd_trajectory_precision_diagnostic_v2_lane,
    validate_vbd_trajectory_precision_diagnostic_v2_record,
    validate_vbd_trajectory_precision_diagnostic_v2_record_with_checkpoints,
    vbd_trajectory_precision_diagnostic_v2_plan,
    vbd_trajectory_precision_diagnostic_v2_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_RESERVED_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHAIN_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_GENERATOR_SEED,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_RESERVED_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_v2_checkpoint import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE,
    VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
    VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity,
    start_vbd_precision_diagnostic_v2_checkpoint_session,
    validate_vbd_precision_diagnostic_v2_checkpoint_root,
    write_vbd_precision_diagnostic_v2_checkpoint,
)
from fluencytracr_inference.vbd_trajectory_preparation import (
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    VbdSyntheticRunnerError,
    generate_vbd_trajectory_precision_diagnostic_v2_case,
    generate_vbd_trajectory_scenario_smoke_case,
    generate_vbd_trajectory_smoke_case,
    vbd_trajectory_precision_diagnostic_v2_case_body,
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


NATURAL_PYMC_ORDER = (
    "alpha",
    "beta",
    "trajectory_movement",
    "sigma_u",
    "u",
    "sigma_r",
    "rho",
)
CANONICAL_STORAGE_ORDER = (
    "alpha",
    "beta",
    "sigma_u",
    "u",
    "sigma_r",
    "rho",
    "trajectory_movement",
)


def _metric_tree(scalar: float) -> xr.Dataset:
    return xr.Dataset(
        {
            "alpha": xr.DataArray(scalar),
            "beta": xr.DataArray(scalar),
            "sigma_u": xr.DataArray(scalar),
            "u": xr.DataArray(
                np.full(6, scalar, dtype=np.float64),
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
def full_shape_values():
    draw = np.arange(20_000, dtype=np.float64)
    base = np.stack(
        [np.sin((draw + 1.0) / 37.0) + chain * 0.001 for chain in range(4)]
    )
    return {
        "alpha": base,
        "beta": base + 0.1,
        "trajectory_movement": base + 0.5,
        "sigma_u": base + 2.0,
        "u": np.stack([base + index * 0.1 for index in range(6)], axis=2),
        "sigma_r": base + 3.0,
        "rho": base * 0.1,
    }


def _full_shape_idata(values: dict, order: tuple[str, ...]):
    coords = {"chain": np.arange(4), "draw": np.arange(20_000)}
    posterior_values = {}
    for name in order:
        if name == "u":
            posterior_values[name] = (
                ("chain", "draw", "u_dim_0"),
                values[name],
            )
        else:
            posterior_values[name] = (("chain", "draw"), values[name])
    posterior = xr.Dataset(
        posterior_values,
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
            "energy": (("chain", "draw"), values["alpha"] + 10.0),
        },
        coords=coords,
    )
    return xr.DataTree.from_dict(
        {"/posterior": posterior, "/sample_stats": sample_stats}
    )


def _pymc_routed_full_shape_idata(values: dict, order: tuple[str, ...], model):
    routed = pm.to_inference_data(
        prior={name: values[name] for name in order},
        model=model,
    )
    assert tuple(routed.prior.data_vars) == order
    routed_values = {}
    for name in order:
        array = np.asarray(routed.prior[name])
        assert array.shape[0] == 1
        routed_values[name] = array[0]
        assert np.array_equal(routed_values[name], values[name])
    return _full_shape_idata(routed_values, order)


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
            "ADVERSARIAL": (
                f"review:adversarial/go/{implementation}/adversarial-review"
            ),
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


def _projected_lanes(idata, monkeypatch):
    monkeypatch.setattr(diagnostic_module, "_diagnostic_metric_trees", _metric_trees)
    monkeypatch.setattr(diagnostic_module, "_bfmi_values", lambda _idata: np.ones(4))
    case_hash = sha256_json(vbd_trajectory_precision_diagnostic_v2_case_body())
    values = []
    for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
        binding = build_vbd_trajectory_nuts_precision_diagnostic_v2_binding(
            generator_seed=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_GENERATOR_SEED,
            lane=lane,
            lane_ordinal=lane_ordinal,
            plan_hash=case_hash,
        )
        values.append(
            project_vbd_trajectory_precision_diagnostic_v2_lane(
                idata,
                lane=lane,
                lane_ordinal=lane_ordinal,
                binding=binding,
                prepared_input_hash=sha256_json(["prepared", lane]),
                model_input_hash=sha256_json(["model", lane]),
            )
        )
    return values


def test_v2_plan_and_reserved_seeds_are_exact_and_disjoint():
    plan = vbd_trajectory_precision_diagnostic_v2_plan()
    seeds = vbd_trajectory_precision_diagnostic_v2_seed_manifest()
    assert plan["case"]["generator_seed"] == 2_055_900_600
    assert seeds["reserved_seeds"] == [
        2_055_900_600,
        *range(2_055_900_700, 2_055_900_712),
    ]
    assert VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_RESERVED_SEEDS.isdisjoint(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_RESERVED_SEEDS
    )
    assert plan["state"] == "HOLD"
    assert plan["evidence_eligible"] is False
    with pytest.raises(VbdSyntheticRunnerError):
        generate_vbd_trajectory_precision_diagnostic_v2_case(_runner_token=object())


def test_v2_reserved_seeds_are_rejected_by_generic_smoke():
    for seed in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_RESERVED_SEEDS:
        with pytest.raises(ValueError):
            generate_vbd_trajectory_smoke_case(seed=seed)
        with pytest.raises(ValueError):
            generate_vbd_trajectory_scenario_smoke_case("frequency_only", seed=seed)
    with pytest.raises(ValueError):
        _validate_reference_seeds(
            vbd_nuts_execution_settings("smoke"),
            (VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHAIN_SEEDS[0], 2_055_900_001),
            2_055_900_002,
        )


def test_production_pymc_conversion_exposes_the_observed_natural_order():
    case = generate_vbd_trajectory_smoke_case()
    prepared = prepare_vbd_trajectory_lane(case.panel, "frequency")
    model = _build_reference_model(prepared)
    assert set(variable.name for variable in model.free_RVs) == set(
        CANONICAL_STORAGE_ORDER
    )
    sentinel = np.zeros((2, 3), dtype=np.float64)
    natural_values = {
        name: np.zeros((2, 3, 6), dtype=np.float64) if name == "u" else sentinel
        for name in NATURAL_PYMC_ORDER
    }
    converted = pm.to_inference_data(prior=natural_values, model=model)
    assert tuple(converted.prior.data_vars) == NATURAL_PYMC_ORDER


def test_full_shape_natural_order_projects_identically_to_canonical_order(
    full_shape_values, monkeypatch
):
    monkeypatch.setattr(
        nuts_module.pm,
        "sample",
        lambda *args, **kwargs: pytest.fail("V2 implementation tests cannot sample"),
    )
    case = generate_vbd_trajectory_smoke_case()
    prepared = prepare_vbd_trajectory_lane(case.panel, "frequency")
    model = _build_reference_model(prepared)
    natural = _pymc_routed_full_shape_idata(
        full_shape_values, NATURAL_PYMC_ORDER, model
    )
    canonical = _pymc_routed_full_shape_idata(
        full_shape_values, CANONICAL_STORAGE_ORDER, model
    )
    natural_lanes = _projected_lanes(natural, monkeypatch)
    canonical_lanes = _projected_lanes(canonical, monkeypatch)
    assert natural_lanes == canonical_lanes
    assert tuple(
        row["parameter_name"]
        for row in natural_lanes[0]["parameter_rows"][:12]
    ) == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES

    missing = deepcopy(natural)
    del missing.posterior["rho"]
    binding = build_vbd_trajectory_nuts_precision_diagnostic_v2_binding(
        generator_seed=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_GENERATOR_SEED,
        lane="frequency",
        lane_ordinal=0,
        plan_hash=sha256_json(vbd_trajectory_precision_diagnostic_v2_case_body()),
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError, match="variable set"):
        project_vbd_trajectory_precision_diagnostic_v2_lane(
            missing,
            lane="frequency",
            lane_ordinal=0,
            binding=binding,
            prepared_input_hash="1" * 64,
            model_input_hash="2" * 64,
        )


def test_v2_record_is_permanent_hold_and_rejected_by_every_proof_path(
    full_shape_values, monkeypatch, tmp_path
):
    lanes = _projected_lanes(
        _full_shape_idata(full_shape_values, NATURAL_PYMC_ORDER), monkeypatch
    )
    checkpoint_root = tmp_path / "record-checkpoints"
    checkpoint_root.mkdir()
    checkpoint_identity = _checkpoint_identity()
    checkpoint_session = start_vbd_precision_diagnostic_v2_checkpoint_session(
        root=checkpoint_root.resolve(), identity=checkpoint_identity
    )
    try:
        terminal = write_vbd_precision_diagnostic_v2_checkpoint(
            checkpoint_session,
            created_at_utc="2026-07-18T00:00:00Z",
            input_binding_hash=None,
        )
        for _ordinal in range(1, 12):
            terminal = write_vbd_precision_diagnostic_v2_checkpoint(
                checkpoint_session,
                created_at_utc="2026-07-18T00:00:01Z",
                input_binding_hash="6" * 64,
            )
    finally:
        checkpoint_session.close()
    record = build_vbd_trajectory_precision_diagnostic_v2_record(
        provenance=_provenance(),
        lane_records=lanes,
        terminal_checkpoint_hash=terminal["checkpoint_hash"],
    )
    assert validate_vbd_trajectory_precision_diagnostic_v2_record(record) == record
    assert (
        validate_vbd_trajectory_precision_diagnostic_v2_record_with_checkpoints(
            record,
            checkpoint_root=checkpoint_root.resolve(),
            checkpoint_identity=checkpoint_identity,
        )
        == record
    )
    assert record["state"] == "HOLD"
    assert record["evidence_eligible"] is False
    assert record["consumed_v1_execution_anchor"][
        "statistical_result_available"
    ] is False
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_freeze_manifest(record)
    with pytest.raises(VbdTrajectoryValidationStudyError):
        vbd_trajectory_slot_result_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_combined_value(record, {})

    consumed = _provenance()
    consumed["implementation_commit"] = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError, match="consumed V1"):
        build_vbd_trajectory_precision_diagnostic_v2_record(
            provenance=consumed,
            lane_records=lanes,
            terminal_checkpoint_hash="0" * 64,
        )


def _checkpoint_identity():
    return VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity(
        implementation_commit="1" * 40,
        authorization_commit="2" * 40,
        authorization_manifest_hash="3" * 64,
        human_execution_authorization_hash="4" * 64,
        attempt_claim_hash="5" * 64,
    )


def test_checkpoint_chain_is_exact_create_once_and_nonresumable(tmp_path):
    root = tmp_path / "checkpoints"
    root.mkdir(mode=0o700)
    identity = _checkpoint_identity()
    session = start_vbd_precision_diagnostic_v2_checkpoint_session(
        root=root.resolve(), identity=identity
    )
    try:
        values = [
            write_vbd_precision_diagnostic_v2_checkpoint(
                session,
                created_at_utc="2026-07-18T00:00:00Z",
                input_binding_hash=None,
            )
        ]
        for _ordinal in range(1, 12):
            values.append(
                write_vbd_precision_diagnostic_v2_checkpoint(
                    session,
                    created_at_utc="2026-07-18T00:00:01Z",
                    input_binding_hash="6" * 64,
                )
            )
    finally:
        session.close()
    assert tuple(path.name for path in sorted(root.iterdir())) == tuple(
        sorted(item[0] for item in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE)
    )
    validated = validate_vbd_precision_diagnostic_v2_checkpoint_root(
        root=root.resolve(), identity=identity
    )
    assert validated == tuple(values)
    assert validated[-1]["phase"] == "result_ready_for_publication"

    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
        match="resume is forbidden",
    ):
        start_vbd_precision_diagnostic_v2_checkpoint_session(
            root=root.resolve(), identity=identity
        )


def test_checkpoint_root_rejects_unknown_tampered_or_partial_state(tmp_path):
    identity = _checkpoint_identity()
    partial = tmp_path / "partial"
    partial.mkdir()
    session = start_vbd_precision_diagnostic_v2_checkpoint_session(
        root=partial.resolve(), identity=identity
    )
    write_vbd_precision_diagnostic_v2_checkpoint(
        session,
        created_at_utc="2026-07-18T00:00:00Z",
        input_binding_hash=None,
    )
    session.close()
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=partial.resolve(), identity=identity
        )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
        start_vbd_precision_diagnostic_v2_checkpoint_session(
            root=partial.resolve(), identity=identity
        )

    empty = tmp_path / "unknown"
    empty.mkdir()
    (empty / "message.txt").write_text("unsafe", encoding="utf-8")
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
        start_vbd_precision_diagnostic_v2_checkpoint_session(
            root=empty.resolve(), identity=identity
        )

    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
        match="consumed V1",
    ):
        VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity(
            implementation_commit=(
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
            ),
            authorization_commit="2" * 40,
            authorization_manifest_hash="3" * 64,
            human_execution_authorization_hash="4" * 64,
            attempt_claim_hash="5" * 64,
        )
