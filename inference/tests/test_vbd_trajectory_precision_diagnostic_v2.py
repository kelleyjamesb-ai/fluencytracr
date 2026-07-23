from copy import deepcopy
import json
import os
from pathlib import Path

import numpy as np
import pymc as pm
import pytest
import xarray as xr

import fluencytracr_inference.vbd_trajectory_nuts as nuts_module
import fluencytracr_inference.vbd_trajectory_precision_diagnostic as diagnostic_module
import fluencytracr_inference.vbd_trajectory_precision_diagnostic_v2_checkpoint as checkpoint_module
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
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_v2_checkpoint import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE,
    VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
    VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity,
    validate_vbd_precision_diagnostic_v2_checkpoint,
    validate_vbd_precision_diagnostic_v2_checkpoint_root,
)
from fluencytracr_inference.vbd_trajectory_preparation import (
    prepare_vbd_trajectory_lane,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    _PRECISION_DIAGNOSTIC_V2_GENERATION_RUNNER_TOKEN,
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
        posterior_predictive={name: values[name] for name in order},
        model=model,
        sample_dims=["chain", "draw"],
    )
    assert tuple(routed.posterior_predictive.data_vars) == order
    for name in order:
        assert np.array_equal(
            np.asarray(routed.posterior_predictive[name]), values[name]
        )
    routed["posterior"] = routed["posterior_predictive"].copy()
    del routed["posterior_predictive"]
    routed["sample_stats"] = _full_shape_idata(values, order)["sample_stats"].copy()
    return routed


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
        "external_claim_hash": "5" * 64,
        "input_binding_hash": "6" * 64,
        "runtime_identity_hash": "9" * 64,
        "requirements_lock_hash": "a" * 64,
        "implementation_hash": "b" * 64,
        "native_library_manifest_hash": "c" * 64,
        "model_manifest_hash": "d" * 64,
        "synthetic_input_hash": "e" * 64,
        "panel_manifest_root": "f" * 64,
    }


def _projected_lanes(idata, monkeypatch=None):
    if monkeypatch is not None:
        monkeypatch.setattr(
            diagnostic_module, "_diagnostic_metric_trees", _metric_trees
        )
        monkeypatch.setattr(
            diagnostic_module, "_bfmi_values", lambda _idata: np.ones(4)
        )
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


def test_v2_authorized_case_generates_and_prepares_without_sampling():
    case = generate_vbd_trajectory_precision_diagnostic_v2_case(
        _runner_token=_PRECISION_DIAGNOSTIC_V2_GENERATION_RUNNER_TOKEN
    )
    assert case.panel.seed == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_GENERATOR_SEED
    assert tuple(
        prepare_vbd_trajectory_lane(case.panel, lane).lane
        for lane in VBD_TRAJECTORY_LANES
    ) == VBD_TRAJECTORY_LANES


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
    natural_lanes = _projected_lanes(natural)
    canonical_lanes = _projected_lanes(canonical)
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
    terminal = _write_checkpoint_chain(
        checkpoint_root.resolve(), checkpoint_identity
    )[-1]
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
    assert record["consumed_v1_execution_anchor"][
        "authorization_manifest_hash"
    ] == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_freeze_manifest(record)
    with pytest.raises(VbdTrajectoryValidationStudyError):
        vbd_trajectory_slot_result_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_combined_value(record, {})

    for field, alternate in (
        ("authorization_commit", "3" * 40),
        ("authorization_manifest_hash", "0" * 64),
        ("execution_authorization_hash", "0" * 64),
        ("external_claim_hash", "0" * 64),
        ("input_binding_hash", "0" * 64),
    ):
        mismatched = _provenance()
        mismatched[field] = alternate
        mismatched_record = build_vbd_trajectory_precision_diagnostic_v2_record(
            provenance=mismatched,
            lane_records=lanes,
            terminal_checkpoint_hash=record["terminal_checkpoint_hash"],
        )
        with pytest.raises(
            VbdTrajectoryPrecisionDiagnosticError,
            match="provenance or checkpoint binding",
        ):
            validate_vbd_trajectory_precision_diagnostic_v2_record_with_checkpoints(
                mismatched_record,
                checkpoint_root=checkpoint_root.resolve(),
                checkpoint_identity=checkpoint_identity,
            )

    for field, consumed_value in (
        (
            "implementation_commit",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
        ),
        (
            "authorization_commit",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
        ),
        (
            "authorization_manifest_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
        ),
        (
            "execution_authorization_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
        ),
        (
            "external_claim_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        ),
        (
            "input_binding_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
        ),
    ):
        consumed = _provenance()
        consumed[field] = consumed_value
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


def _write_checkpoint_chain(root, identity, *, input_binding_hash="6" * 64):
    values = []
    predecessor_hash = None
    for ordinal, (filename, phase, lane) in enumerate(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE
    ):
        body = {
            "schema": checkpoint_module.VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SCHEMA,
            "diagnostic_identity": checkpoint_module.VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID,
            "implementation_commit": identity.implementation_commit,
            "authorization_commit": identity.authorization_commit,
            "authorization_manifest_hash": identity.authorization_manifest_hash,
            "human_execution_authorization_hash": (
                identity.human_execution_authorization_hash
            ),
            "attempt_claim_hash": identity.attempt_claim_hash,
            "input_binding_hash": None if ordinal == 0 else input_binding_hash,
            "ordinal": ordinal,
            "phase": phase,
            "lane": lane,
            "predecessor_checkpoint_hash": predecessor_hash,
            "created_at_utc": (
                "2026-07-18T00:00:00Z"
                if ordinal == 0
                else "2026-07-18T00:00:01Z"
            ),
        }
        value = {**body, "checkpoint_hash": sha256_json(body)}
        (root / filename).write_bytes(
            json.dumps(
                value,
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
                allow_nan=False,
            ).encode("utf-8")
            + b"\n"
        )
        values.append(value)
        predecessor_hash = value["checkpoint_hash"]
    return tuple(values)


def test_checkpoint_chain_readback_is_exact_and_has_no_creation_api(tmp_path):
    root = (tmp_path / "checkpoints").resolve()
    root.mkdir(mode=0o700)
    identity = _checkpoint_identity()
    values = _write_checkpoint_chain(root, identity)
    validated = validate_vbd_precision_diagnostic_v2_checkpoint_root(
        root=root, identity=identity
    )
    assert validated == values
    assert validated[-1]["phase"] == "result_ready_for_publication"
    bool_ordinal = deepcopy(values[1])
    bool_ordinal["ordinal"] = True
    bool_ordinal["checkpoint_hash"] = sha256_json(
        {
            key: value
            for key, value in bool_ordinal.items()
            if key != "checkpoint_hash"
        }
    )
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
        match="identity, sequence, or hash",
    ):
        validate_vbd_precision_diagnostic_v2_checkpoint(
            bool_ordinal,
            identity=identity,
            ordinal=1,
            predecessor_hash=values[0]["checkpoint_hash"],
            input_binding_hash="6" * 64,
        )
    assert not hasattr(
        checkpoint_module, "start_vbd_precision_diagnostic_v2_checkpoint_session"
    )
    assert not hasattr(
        checkpoint_module, "write_vbd_precision_diagnostic_v2_checkpoint"
    )

    alias = tmp_path / "checkpoint-alias.json"
    os.link(
        root / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[0][0],
        alias,
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=root, identity=identity
        )


def test_checkpoint_root_rejects_unknown_partial_or_consumed_identity(
    tmp_path, monkeypatch
):
    identity = _checkpoint_identity()
    partial = (tmp_path / "partial").resolve()
    partial.mkdir()
    values = _write_checkpoint_chain(partial, identity)
    (partial / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[-1][0]).unlink()
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=partial, identity=identity
        )
    assert len(values) == len(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE
    )

    unknown = (tmp_path / "unknown").resolve()
    unknown.mkdir()
    (unknown / "message.txt").write_text("unsafe", encoding="utf-8")
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=unknown, identity=identity
        )

    canonical_root = (tmp_path / "canonical-root").resolve()
    canonical_root.mkdir()
    _write_checkpoint_chain(canonical_root, identity)
    leaf_alias = tmp_path / "leaf-root-alias"
    leaf_alias.symlink_to(canonical_root, target_is_directory=True)
    parent_alias = tmp_path / "parent-root-alias"
    parent_alias.symlink_to(tmp_path, target_is_directory=True)
    for aliased_root in (leaf_alias, parent_alias / canonical_root.name):
        with pytest.raises(
            VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
            match="root is unavailable",
        ):
            validate_vbd_precision_diagnostic_v2_checkpoint_root(
                root=aliased_root,
                identity=identity,
            )

    invalid_roots = (
        Path("//" + str(canonical_root).lstrip("/")),
        Path(str(canonical_root) + "\0child"),
    )
    fd_count = len(os.listdir("/dev/fd"))
    for invalid_root in invalid_roots:
        for _attempt in range(5):
            with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
                validate_vbd_precision_diagnostic_v2_checkpoint_root(
                    root=invalid_root,
                    identity=identity,
                )
    assert len(os.listdir("/dev/fd")) == fd_count

    wrong_shape_root = (tmp_path / "wrong-shape-root").resolve()
    wrong_shape_root.mkdir()
    _write_checkpoint_chain(wrong_shape_root, identity)
    (
        wrong_shape_root
        / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[1][0]
    ).write_text("[]\n", encoding="utf-8")
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV2CheckpointError):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=wrong_shape_root,
            identity=identity,
        )

    race_root = (tmp_path / "hardlink-race-root").resolve()
    race_root.mkdir()
    _write_checkpoint_chain(race_root, identity)
    race_filename = VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[0][0]
    race_alias = tmp_path / "hardlink-race-alias.json"
    real_open = checkpoint_module.os.open
    swapped = False

    def hardlink_swap_open(path, flags, mode=0o777, *, dir_fd=None):
        nonlocal swapped
        if os.fspath(path) == race_filename and dir_fd is not None and not swapped:
            os.link(race_root / race_filename, race_alias)
            swapped = True
        if dir_fd is None:
            return real_open(path, flags, mode)
        return real_open(path, flags, mode, dir_fd=dir_fd)

    monkeypatch.setattr(checkpoint_module.os, "open", hardlink_swap_open)
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
        match="checkpoint bytes are invalid",
    ):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=race_root,
            identity=identity,
        )
    assert swapped is True
    monkeypatch.setattr(checkpoint_module.os, "open", real_open)

    replacement_root = (tmp_path / "replacement-race-root").resolve()
    replacement_root.mkdir()
    _write_checkpoint_chain(replacement_root, identity)
    replacement_filename = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[0][0]
    )
    replacement_source = tmp_path / "replacement-source.json"
    replacement_source.write_bytes(
        (replacement_root / replacement_filename).read_bytes()
    )
    replaced = False

    def replacement_swap_open(path, flags, mode=0o777, *, dir_fd=None):
        nonlocal replaced
        if (
            os.fspath(path) == replacement_filename
            and dir_fd is not None
            and not replaced
        ):
            os.replace(replacement_source, replacement_root / replacement_filename)
            replaced = True
        if dir_fd is None:
            return real_open(path, flags, mode)
        return real_open(path, flags, mode, dir_fd=dir_fd)

    monkeypatch.setattr(checkpoint_module.os, "open", replacement_swap_open)
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
        match="checkpoint bytes are invalid",
    ):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=replacement_root,
            identity=identity,
        )
    assert replaced is True
    monkeypatch.setattr(checkpoint_module.os, "open", real_open)

    fifo_root = (tmp_path / "fifo-race-root").resolve()
    fifo_root.mkdir()
    _write_checkpoint_chain(fifo_root, identity)
    fifo_filename = VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[0][0]
    fifo_swapped = False

    def fifo_swap_open(path, flags, mode=0o777, *, dir_fd=None):
        nonlocal fifo_swapped
        if os.fspath(path) == fifo_filename and dir_fd is not None and not fifo_swapped:
            (fifo_root / fifo_filename).unlink()
            os.mkfifo(fifo_root / fifo_filename)
            fifo_swapped = True
        if dir_fd is None:
            return real_open(path, flags, mode)
        return real_open(path, flags, mode, dir_fd=dir_fd)

    monkeypatch.setattr(checkpoint_module.os, "open", fifo_swap_open)
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
        match="checkpoint bytes are invalid",
    ):
        validate_vbd_precision_diagnostic_v2_checkpoint_root(
            root=fifo_root,
            identity=identity,
        )
    assert fifo_swapped is True
    monkeypatch.setattr(checkpoint_module.os, "open", real_open)

    malformed_payloads = (
        ("[" * 10_000 + "0" + "]" * 10_000 + "\n").encode("utf-8"),
        ("9" * 10_000 + "\n").encode("utf-8"),
    )
    for ordinal, payload in enumerate(malformed_payloads):
        malformed_root = (tmp_path / f"malformed-json-{ordinal}").resolve()
        malformed_root.mkdir()
        _write_checkpoint_chain(malformed_root, identity)
        (
            malformed_root
            / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[1][0]
        ).write_bytes(payload)
        with pytest.raises(
            VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
            match="checkpoint bytes are invalid",
        ):
            validate_vbd_precision_diagnostic_v2_checkpoint_root(
                root=malformed_root,
                identity=identity,
            )

    for ordinal, consumed_input_binding in enumerate(
        (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
        )
    ):
        consumed_root = (tmp_path / f"consumed-input-{ordinal}").resolve()
        consumed_root.mkdir()
        _write_checkpoint_chain(
            consumed_root,
            identity,
            input_binding_hash=consumed_input_binding,
        )
        with pytest.raises(
            VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
            match="consumed V1 hash",
        ):
            validate_vbd_precision_diagnostic_v2_checkpoint_root(
                root=consumed_root,
                identity=identity,
            )

    for field, consumed_value in (
        (
            "implementation_commit",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
        ),
        (
            "authorization_commit",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
        ),
        (
            "authorization_manifest_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
        ),
        (
            "human_execution_authorization_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
        ),
        (
            "attempt_claim_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        ),
    ):
        identity_body = {
            "implementation_commit": "1" * 40,
            "authorization_commit": "2" * 40,
            "authorization_manifest_hash": "3" * 64,
            "human_execution_authorization_hash": "4" * 64,
            "attempt_claim_hash": "5" * 64,
        }
        identity_body[field] = consumed_value
        with pytest.raises(
            VbdTrajectoryPrecisionDiagnosticV2CheckpointError,
            match="consumed V1",
        ):
            VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity(**identity_body)
