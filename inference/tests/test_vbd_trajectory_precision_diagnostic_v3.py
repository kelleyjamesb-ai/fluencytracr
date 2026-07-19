from copy import deepcopy
import importlib.util
import json
import os
from itertools import permutations

import numpy as np
import pytest
import xarray as xr

import fluencytracr_inference.vbd_trajectory_precision_diagnostic as diagnostic_module
import fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_authorization as authorization_module
import fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_rehearsal as rehearsal_module
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_nuts import (
    _validate_reference_seeds,
    build_vbd_trajectory_nuts_precision_diagnostic_v3_binding,
    vbd_nuts_execution_settings,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES,
    VbdTrajectoryPrecisionDiagnosticError,
    build_vbd_trajectory_precision_diagnostic_v3_record,
    project_vbd_trajectory_precision_diagnostic_v3_lane,
    validate_vbd_trajectory_precision_diagnostic_v3_record,
    validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints,
    vbd_trajectory_precision_diagnostic_v3_plan,
    vbd_trajectory_precision_diagnostic_v3_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_RESERVED_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHAIN_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_GENERATOR_SEED,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_RESERVED_SEEDS,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_checkpoint import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE,
    VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
    VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity,
    start_vbd_precision_diagnostic_v3_checkpoint_session,
    validate_vbd_precision_diagnostic_v3_checkpoint_root,
    write_vbd_precision_diagnostic_v3_checkpoint,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_rehearsal import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_FINAL_FILENAME,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_STAGED_FILENAME,
    VbdTrajectoryPrecisionDiagnosticV3RehearsalError,
    publish_vbd_precision_diagnostic_v3_rehearsal,
    run_vbd_precision_diagnostic_v3_persistence_rehearsal,
    write_vbd_precision_diagnostic_v3_rehearsal_staged,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_authorization import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_BOOTSTRAP_RELATIVE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_INPUT_BINDING_FILENAME,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    VbdSyntheticRunnerError,
    generate_vbd_trajectory_precision_diagnostic_v3_case,
    generate_vbd_trajectory_scenario_smoke_case,
    generate_vbd_trajectory_smoke_case,
    vbd_trajectory_precision_diagnostic_v3_case_body,
)
from fluencytracr_inference.vbd_trajectory_types import VBD_TRAJECTORY_LANES
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    VbdTrajectoryValidationWorkspaceError,
    _validate_combined_value,
    _validate_freeze_manifest,
    _repo_root,
    read_strict_json,
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
    case_hash = sha256_json(vbd_trajectory_precision_diagnostic_v3_case_body())
    values = []
    for lane_ordinal, lane in enumerate(VBD_TRAJECTORY_LANES):
        binding = build_vbd_trajectory_nuts_precision_diagnostic_v3_binding(
            generator_seed=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_GENERATOR_SEED,
            lane=lane,
            lane_ordinal=lane_ordinal,
            plan_hash=case_hash,
        )
        values.append(
            project_vbd_trajectory_precision_diagnostic_v3_lane(
                idata,
                lane=lane,
                lane_ordinal=lane_ordinal,
                binding=binding,
                prepared_input_hash=sha256_json(["prepared", lane]),
                model_input_hash=sha256_json(["model", lane]),
            )
        )
    return values


def test_v3_plan_and_reserved_seeds_are_exact_and_disjoint():
    plan = vbd_trajectory_precision_diagnostic_v3_plan()
    seeds = vbd_trajectory_precision_diagnostic_v3_seed_manifest()
    assert plan["case"]["generator_seed"] == 2_055_900_800
    assert seeds["reserved_seeds"] == [
        2_055_900_800,
        *range(2_055_900_900, 2_055_900_912),
    ]
    assert VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_RESERVED_SEEDS.isdisjoint(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_RESERVED_SEEDS
    )
    assert plan["state"] == "HOLD"
    assert plan["evidence_eligible"] is False
    with pytest.raises(VbdSyntheticRunnerError):
        generate_vbd_trajectory_precision_diagnostic_v3_case(_runner_token=object())


def test_v3_reserved_seeds_are_rejected_by_generic_smoke():
    for seed in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_RESERVED_SEEDS:
        with pytest.raises(ValueError):
            generate_vbd_trajectory_smoke_case(seed=seed)
        with pytest.raises(ValueError):
            generate_vbd_trajectory_scenario_smoke_case("frequency_only", seed=seed)
    with pytest.raises(ValueError):
        _validate_reference_seeds(
            vbd_nuts_execution_settings("smoke"),
            (VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHAIN_SEEDS[0], 2_055_900_001),
            2_055_900_002,
        )


def test_full_shape_natural_order_projects_identically_to_canonical_order(
    full_shape_values, monkeypatch
):
    natural = _full_shape_idata(full_shape_values, NATURAL_PYMC_ORDER)
    canonical = _full_shape_idata(full_shape_values, CANONICAL_STORAGE_ORDER)
    natural_lanes = _projected_lanes(natural)
    canonical_lanes = _projected_lanes(canonical)
    assert natural_lanes == canonical_lanes
    assert tuple(
        row["parameter_name"]
        for row in natural_lanes[0]["parameter_rows"][:12]
    ) == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXPECTED_PARAMETER_NAMES

    missing = deepcopy(natural)
    del missing.posterior["rho"]
    binding = build_vbd_trajectory_nuts_precision_diagnostic_v3_binding(
        generator_seed=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_GENERATOR_SEED,
        lane="frequency",
        lane_ordinal=0,
        plan_hash=sha256_json(vbd_trajectory_precision_diagnostic_v3_case_body()),
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError, match="variable set"):
        project_vbd_trajectory_precision_diagnostic_v3_lane(
            missing,
            lane="frequency",
            lane_ordinal=0,
            binding=binding,
            prepared_input_hash="1" * 64,
            model_input_hash="2" * 64,
        )


def _record_bundle(full_shape_values, monkeypatch, tmp_path, suffix="record"):
    lanes = _projected_lanes(
        _full_shape_idata(full_shape_values, NATURAL_PYMC_ORDER), monkeypatch
    )
    checkpoint_root = tmp_path / f"{suffix}-checkpoints"
    checkpoint_root.mkdir()
    checkpoint_identity = _checkpoint_identity()
    checkpoint_session = start_vbd_precision_diagnostic_v3_checkpoint_session(
        root=checkpoint_root.resolve(), identity=checkpoint_identity
    )
    try:
        terminal = write_vbd_precision_diagnostic_v3_checkpoint(
            checkpoint_session,
            created_at_utc="2026-07-18T00:00:00Z",
            input_binding_hash=None,
        )
        for _ordinal in range(1, 12):
            terminal = write_vbd_precision_diagnostic_v3_checkpoint(
                checkpoint_session,
                created_at_utc="2026-07-18T00:00:01Z",
                input_binding_hash="6" * 64,
            )
    finally:
        checkpoint_session.close()
    record = build_vbd_trajectory_precision_diagnostic_v3_record(
        provenance=_provenance(),
        lane_records=lanes,
        terminal_checkpoint_hash=terminal["checkpoint_hash"],
    )
    return record, checkpoint_root.resolve(), checkpoint_identity


def test_v3_record_is_permanent_hold_and_rejected_by_every_proof_path(
    full_shape_values, monkeypatch, tmp_path
):
    record, checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values, monkeypatch, tmp_path
    )
    assert validate_vbd_trajectory_precision_diagnostic_v3_record(record) == record
    encoded = json.dumps(
        record, sort_keys=True, separators=(",", ":"), allow_nan=False
    )
    persisted = json.loads(encoded)
    assert validate_vbd_trajectory_precision_diagnostic_v3_record(persisted) == persisted
    assert (
        validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
            record,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
        == record
    )
    assert record["state"] == "HOLD"
    assert record["evidence_eligible"] is False
    assert record["consumed_v1_execution_anchor"][
        "statistical_result_available"
    ] is False
    assert record["consumed_v2_execution_anchor"][
        "statistical_result_available"
    ] is False

    endpoint_names = tuple(
        record["lane_records"][0]["parameter_rows"][0][
            "mcse_to_posterior_sd_ratios"
        ]
    )
    for ordering in permutations(endpoint_names):
        reordered = deepcopy(record)
        ratios = reordered["lane_records"][0]["parameter_rows"][0][
            "mcse_to_posterior_sd_ratios"
        ]
        reordered["lane_records"][0]["parameter_rows"][0][
            "mcse_to_posterior_sd_ratios"
        ] = {name: ratios[name] for name in ordering}
        assert validate_vbd_trajectory_precision_diagnostic_v3_record(reordered)

    malformed = deepcopy(record)
    del malformed["lane_records"][0]["parameter_rows"][0][
        "mcse_to_posterior_sd_ratios"
    ]["mean"]
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError):
        validate_vbd_trajectory_precision_diagnostic_v3_record(malformed)

    malformed = deepcopy(record)
    malformed["lane_records"][0]["parameter_rows"][0][
        "mcse_to_posterior_sd_ratios"
    ]["extra"] = 0.0
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError):
        validate_vbd_trajectory_precision_diagnostic_v3_record(malformed)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_freeze_manifest(record)
    with pytest.raises(VbdTrajectoryValidationStudyError):
        vbd_trajectory_slot_result_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_combined_value(record, {})

    consumed = _provenance()
    consumed["authorization_manifest_hash"] = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError, match="consumed V1/V2"):
        build_vbd_trajectory_precision_diagnostic_v3_record(
            provenance=consumed,
            lane_records=record["lane_records"],
            terminal_checkpoint_hash="0" * 64,
        )

    off_plan = _provenance()
    off_plan["input_binding_hash"] = "8" * 64
    off_plan_record = build_vbd_trajectory_precision_diagnostic_v3_record(
        provenance=off_plan,
        lane_records=record["lane_records"],
        terminal_checkpoint_hash=record["terminal_checkpoint_hash"],
    )
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticError,
        match="provenance or checkpoint binding",
    ):
        validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
            off_plan_record,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )

    consumed = _provenance()
    consumed["implementation_commit"] = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError, match="consumed V1/V2"):
        build_vbd_trajectory_precision_diagnostic_v3_record(
            provenance=consumed,
            lane_records=record["lane_records"],
            terminal_checkpoint_hash="0" * 64,
        )

    consumed = _provenance()
    consumed["implementation_commit"] = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError, match="consumed V1/V2"):
        build_vbd_trajectory_precision_diagnostic_v3_record(
            provenance=consumed,
            lane_records=record["lane_records"],
            terminal_checkpoint_hash="0" * 64,
        )


def test_sampler_free_persistence_rehearsal_is_repeatable_and_non_evidentiary(
    full_shape_values, monkeypatch, tmp_path
):
    outputs = []
    for ordinal in range(2):
        record, checkpoint_root, checkpoint_identity = _record_bundle(
            full_shape_values,
            monkeypatch,
            tmp_path,
            suffix=f"rehearsal-{ordinal}",
        )
        workspace = (tmp_path / f"rehearsal-{ordinal}-workspace").resolve()
        workspace.mkdir()
        output = run_vbd_precision_diagnostic_v3_persistence_rehearsal(
            record=record,
            workspace=workspace,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
        outputs.append(output)
        assert output == record
        assert tuple(path.name for path in workspace.iterdir()) == (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_FINAL_FILENAME,
        )
        assert output["state"] == "HOLD"
        assert output["evidence_eligible"] is False
        assert "claim_hash" not in output

    assert outputs[0] == outputs[1]


def test_rehearsal_rejects_malformed_or_duplicate_staging_and_cleans_final(
    full_shape_values, monkeypatch, tmp_path
):
    record, checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values, monkeypatch, tmp_path, suffix="malformed"
    )
    workspace = (tmp_path / "malformed-workspace").resolve()
    workspace.mkdir()
    staged = write_vbd_precision_diagnostic_v3_rehearsal_staged(
        record=record,
        workspace=workspace,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    final = workspace / (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_FINAL_FILENAME
    )
    malformed = deepcopy(record)
    del malformed["lane_records"][0]["parameter_rows"][0][
        "mcse_to_posterior_sd_ratios"
    ]["mean"]
    staged.write_text(
        json.dumps(malformed, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticError):
        publish_vbd_precision_diagnostic_v3_rehearsal(
            workspace=workspace,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
    assert not final.exists()

    staged.unlink()
    staged.write_bytes(b'{"state":"HOLD","state":"HOLD"}\n')
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        publish_vbd_precision_diagnostic_v3_rehearsal(
            workspace=workspace,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
    assert not final.exists()


def test_rehearsal_removes_final_when_post_publication_validation_fails(
    full_shape_values, monkeypatch, tmp_path
):
    record, checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values, monkeypatch, tmp_path, suffix="post-publication"
    )
    workspace = (tmp_path / "post-publication-workspace").resolve()
    workspace.mkdir()
    write_vbd_precision_diagnostic_v3_rehearsal_staged(
        record=record,
        workspace=workspace,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    real_validator = (
        rehearsal_module.validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints
    )
    calls = 0

    def fail_second_validation(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
                "injected final readback failure"
            )
        return real_validator(*args, **kwargs)

    monkeypatch.setattr(
        rehearsal_module,
        "validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints",
        fail_second_validation,
    )
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV3RehearsalError,
        match="injected final readback failure",
    ):
        publish_vbd_precision_diagnostic_v3_rehearsal(
            workspace=workspace,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
    assert calls == 2
    assert not (
        workspace
        / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_FINAL_FILENAME
    ).exists()
    assert not (
        workspace
        / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_STAGED_FILENAME
    ).exists()


def test_rehearsal_roots_cannot_overlap_governed_identities(
    full_shape_values, monkeypatch, tmp_path
):
    record, checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values, monkeypatch, tmp_path, suffix="overlap"
    )
    governed = (tmp_path / "governed").resolve()
    governed.mkdir()
    workspace = governed / "rehearsal"
    workspace.mkdir()
    monkeypatch.setattr(
        rehearsal_module,
        "VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_WORKSPACE_PATH",
        str(governed),
    )
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV3RehearsalError,
        match="overlap a governed identity",
    ):
        run_vbd_precision_diagnostic_v3_persistence_rehearsal(
            record=record,
            workspace=workspace,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )


def _load_v3_bootstrap_module():
    path = _repo_root() / (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_BOOTSTRAP_RELATIVE_PATH
    )
    spec = importlib.util.spec_from_file_location(
        "vbd_precision_diagnostic_v3_full_record_bootstrap_test", path
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _successful_child_pid():
    child_pid = os.fork()
    if child_pid == 0:
        os._exit(0)
    return child_pid


def _bootstrap_full_record_bundle(
    *, bootstrap, record, workspace, checkpoint_root, checkpoint_identity
):
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output_path = workspace / "diagnostic.json"
    staged.write_bytes(bootstrap._canonical_bytes(record) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output_path),
    }

    def validate_persisted(*, final: bool, **_kwargs):
        path = output_path if final else staged
        value = read_strict_json(path)
        validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
            value,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )

    return staged, output_path, manifest, validate_persisted


def test_bootstrap_publishes_complete_semantically_valid_v3_record(
    full_shape_values, monkeypatch, tmp_path
):
    bootstrap = _load_v3_bootstrap_module()
    record, checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values, monkeypatch, tmp_path, suffix="bootstrap-complete"
    )
    workspace = (tmp_path / "bootstrap-complete-workspace").resolve()
    workspace.mkdir()
    staged, final, manifest, validate_persisted = _bootstrap_full_record_bundle(
        bootstrap=bootstrap,
        record=record,
        workspace=workspace,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    monkeypatch.setattr(
        bootstrap, "_validate_persisted_in_child", validate_persisted
    )
    output = bootstrap._supervise_and_publish(
        _successful_child_pid(),
        manifest,
        modules={},
        execution_authorization={},
        claim={},
        authorization_commit="2" * 40,
    )
    assert output == record
    assert not staged.exists()
    assert read_strict_json(final) == record


def test_persisted_output_is_cross_bound_to_manifest_claim_and_input(
    full_shape_values, monkeypatch, tmp_path
):
    base_record, _base_checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values, monkeypatch, tmp_path, suffix="persisted-binding"
    )
    binding_body = {
        "schema_version": "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_INPUT_BINDING_2026_07_V3",
        "claim_hash": checkpoint_identity.attempt_claim_hash,
        "synthetic_input_hash": base_record["provenance"]["synthetic_input_hash"],
        "panel_manifest_root": base_record["provenance"]["panel_manifest_root"],
        "prepared_input_hashes": [
            lane["prepared_input_hash"] for lane in base_record["lane_records"]
        ],
        "model_input_hashes": [
            lane["model_input_hash"] for lane in base_record["lane_records"]
        ],
    }
    binding = {**binding_body, "input_binding_hash": sha256_json(binding_body)}
    checkpoint_root = (tmp_path / "persisted-bound-checkpoints").resolve()
    checkpoint_root.mkdir()
    checkpoint_session = start_vbd_precision_diagnostic_v3_checkpoint_session(
        root=checkpoint_root, identity=checkpoint_identity
    )
    try:
        terminal = write_vbd_precision_diagnostic_v3_checkpoint(
            checkpoint_session,
            created_at_utc="2026-07-18T00:00:00Z",
            input_binding_hash=None,
        )
        for _ordinal in range(1, 12):
            terminal = write_vbd_precision_diagnostic_v3_checkpoint(
                checkpoint_session,
                created_at_utc="2026-07-18T00:00:01Z",
                input_binding_hash=binding["input_binding_hash"],
            )
    finally:
        checkpoint_session.close()
    provenance = deepcopy(base_record["provenance"])
    provenance["input_binding_hash"] = binding["input_binding_hash"]
    record = build_vbd_trajectory_precision_diagnostic_v3_record(
        provenance=provenance,
        lane_records=base_record["lane_records"],
        terminal_checkpoint_hash=terminal["checkpoint_hash"],
    )
    workspace = (tmp_path / "persisted-binding-workspace").resolve()
    workspace.mkdir()
    staged = workspace / "diagnostic.staged.json"
    staged.write_text(
        json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    claim_root = (tmp_path / "persisted-binding-claim").resolve()
    claim_root.mkdir()
    (claim_root / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_INPUT_BINDING_FILENAME).write_text(
        json.dumps(binding, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    provenance = record["provenance"]
    manifest = {
        "manifest_hash": provenance["authorization_manifest_hash"],
        "implementation_commit": provenance["implementation_commit"],
        "implementation_tree": provenance["implementation_tree"],
        "implementation_review_refs": provenance["implementation_review_refs"],
        "canonical_workspace_identity_hash": provenance[
            "canonical_workspace_identity_hash"
        ],
        "runtime_identity_hash": provenance["runtime_identity_hash"],
        "requirements_lock_hash": provenance["requirements_lock_hash"],
        "implementation_hash": provenance["implementation_hash"],
        "native_library_manifest_hash": provenance[
            "native_library_manifest_hash"
        ],
        "model_manifest_hash": provenance["model_manifest_hash"],
        "checkpoint_root_path": str(checkpoint_root),
        "external_claim_root_path": str(claim_root),
        "canonical_workspace_path": str(workspace),
        "output_path": str(workspace / "diagnostic.json"),
    }
    execution_authorization = {
        "execution_authorization_hash": checkpoint_identity.human_execution_authorization_hash
    }
    claim = {"claim_hash": checkpoint_identity.attempt_claim_hash}
    monkeypatch.setattr(
        authorization_module,
        "validate_vbd_precision_diagnostic_v3_authorization_manifest",
        lambda value: value,
    )
    monkeypatch.setattr(
        authorization_module,
        "validate_vbd_precision_diagnostic_v3_execution_authorization",
        lambda value, **_kwargs: value,
    )
    monkeypatch.setattr(
        authorization_module,
        "validate_vbd_precision_diagnostic_v3_claim",
        lambda value, **_kwargs: value,
    )
    assert (
        authorization_module.validate_vbd_precision_diagnostic_v3_persisted_output(
            manifest=manifest,
            execution_authorization=execution_authorization,
            claim=claim,
            authorization_commit=checkpoint_identity.authorization_commit,
            final=False,
        )
        == record
    )

    forged_provenance = deepcopy(provenance)
    forged_provenance["runtime_identity_hash"] = "0" * 64
    forged = build_vbd_trajectory_precision_diagnostic_v3_record(
        provenance=forged_provenance,
        lane_records=record["lane_records"],
        terminal_checkpoint_hash=record["terminal_checkpoint_hash"],
    )
    staged.write_text(
        json.dumps(forged, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    with pytest.raises(
        authorization_module.VbdTrajectoryPrecisionDiagnosticV3AuthorizationError,
        match="persisted provenance is off-plan",
    ):
        authorization_module.validate_vbd_precision_diagnostic_v3_persisted_output(
            manifest=manifest,
            execution_authorization=execution_authorization,
            claim=claim,
            authorization_commit=checkpoint_identity.authorization_commit,
            final=False,
        )


@pytest.mark.parametrize("mutation_phase", ["staged", "final"])
def test_bootstrap_rejects_full_record_mutation_around_publication(
    full_shape_values, monkeypatch, tmp_path, mutation_phase
):
    bootstrap = _load_v3_bootstrap_module()
    record, checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values,
        monkeypatch,
        tmp_path,
        suffix=f"bootstrap-mutation-{mutation_phase}",
    )
    workspace = (tmp_path / f"bootstrap-mutation-{mutation_phase}-workspace").resolve()
    workspace.mkdir()
    staged, final, manifest, real_validate = _bootstrap_full_record_bundle(
        bootstrap=bootstrap,
        record=record,
        workspace=workspace,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )

    def validate_and_mutate(*, final: bool, **kwargs):
        real_validate(final=final, **kwargs)
        if (mutation_phase == "staged" and not final) or (
            mutation_phase == "final" and final
        ):
            path = final_path if final else staged
            path.write_bytes(
                bootstrap._canonical_bytes(
                    {"state": "HOLD", "evidence_eligible": False}
                )
                + b"\n"
            )

    final_path = final
    monkeypatch.setattr(
        bootstrap, "_validate_persisted_in_child", validate_and_mutate
    )
    with pytest.raises(bootstrap.BootstrapError):
        bootstrap._supervise_and_publish(
            _successful_child_pid(),
            manifest,
            modules={},
            execution_authorization={},
            claim={},
            authorization_commit="2" * 40,
        )
    assert not staged.exists()
    assert not final.exists()


def test_rehearsal_preserves_preexisting_final_on_link_failure(
    full_shape_values, monkeypatch, tmp_path
):
    record, checkpoint_root, checkpoint_identity = _record_bundle(
        full_shape_values, monkeypatch, tmp_path, suffix="preexisting-final"
    )
    workspace = (tmp_path / "preexisting-final-workspace").resolve()
    workspace.mkdir()
    staged = write_vbd_precision_diagnostic_v3_rehearsal_staged(
        record=record,
        workspace=workspace,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    final = workspace / (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_FINAL_FILENAME
    )
    sentinel = b"preexisting-final\n"
    final.write_bytes(sentinel)
    with pytest.raises(FileExistsError):
        publish_vbd_precision_diagnostic_v3_rehearsal(
            workspace=workspace,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
    assert final.read_bytes() == sentinel
    assert staged.exists()


def _checkpoint_identity():
    return VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity(
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
    session = start_vbd_precision_diagnostic_v3_checkpoint_session(
        root=root.resolve(), identity=identity
    )
    try:
        values = [
            write_vbd_precision_diagnostic_v3_checkpoint(
                session,
                created_at_utc="2026-07-18T00:00:00Z",
                input_binding_hash=None,
            )
        ]
        for _ordinal in range(1, 12):
            values.append(
                write_vbd_precision_diagnostic_v3_checkpoint(
                    session,
                    created_at_utc="2026-07-18T00:00:01Z",
                    input_binding_hash="6" * 64,
                )
            )
    finally:
        session.close()
    assert tuple(path.name for path in sorted(root.iterdir())) == tuple(
        sorted(item[0] for item in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE)
    )
    validated = validate_vbd_precision_diagnostic_v3_checkpoint_root(
        root=root.resolve(), identity=identity
    )
    assert validated == tuple(values)
    assert validated[-1]["phase"] == "result_ready_for_publication"

    alias = tmp_path / "checkpoint-alias.json"
    os.link(
        root / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE[0][0],
        alias,
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3CheckpointError):
        validate_vbd_precision_diagnostic_v3_checkpoint_root(
            root=root.resolve(), identity=identity
        )
    alias.unlink()

    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
        match="resume is forbidden",
    ):
        start_vbd_precision_diagnostic_v3_checkpoint_session(
            root=root.resolve(), identity=identity
        )


def test_checkpoint_root_rejects_unknown_tampered_or_partial_state(tmp_path):
    identity = _checkpoint_identity()
    partial = tmp_path / "partial"
    partial.mkdir()
    session = start_vbd_precision_diagnostic_v3_checkpoint_session(
        root=partial.resolve(), identity=identity
    )
    write_vbd_precision_diagnostic_v3_checkpoint(
        session,
        created_at_utc="2026-07-18T00:00:00Z",
        input_binding_hash=None,
    )
    session.close()
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3CheckpointError):
        validate_vbd_precision_diagnostic_v3_checkpoint_root(
            root=partial.resolve(), identity=identity
        )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3CheckpointError):
        start_vbd_precision_diagnostic_v3_checkpoint_session(
            root=partial.resolve(), identity=identity
        )

    empty = tmp_path / "unknown"
    empty.mkdir()
    (empty / "message.txt").write_text("unsafe", encoding="utf-8")
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3CheckpointError):
        start_vbd_precision_diagnostic_v3_checkpoint_session(
            root=empty.resolve(), identity=identity
        )

    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
        match="consumed V1",
    ):
        VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity(
            implementation_commit=(
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
            ),
            authorization_commit="2" * 40,
            authorization_manifest_hash="3" * 64,
            human_execution_authorization_hash="4" * 64,
            attempt_claim_hash="5" * 64,
        )
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
        match="consumed V1/V2",
    ):
        VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity(
            implementation_commit=(
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT
            ),
            authorization_commit="2" * 40,
            authorization_manifest_hash="3" * 64,
            human_execution_authorization_hash="4" * 64,
            attempt_claim_hash="5" * 64,
        )
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
        match="consumed V1/V2",
    ):
        VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity(
            implementation_commit="1" * 40,
            authorization_commit="2" * 40,
            authorization_manifest_hash=(
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH
            ),
            human_execution_authorization_hash="4" * 64,
            attempt_claim_hash="5" * 64,
        )
