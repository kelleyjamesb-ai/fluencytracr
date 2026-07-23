from copy import deepcopy
import json
import os
from itertools import permutations

import numpy as np
import pytest
import xarray as xr

import fluencytracr_inference.vbd_trajectory_precision_diagnostic as diagnostic_module
import fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_checkpoint as checkpoint_module
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
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_checkpoint import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE,
    VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
    VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity,
    validate_vbd_precision_diagnostic_v3_checkpoint,
    validate_vbd_precision_diagnostic_v3_checkpoint_root,
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
    terminal = _write_checkpoint_chain(
        checkpoint_root.resolve(), checkpoint_identity
    )[-1]
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

    for tombstone in (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
    ):
        consumed = _provenance()
        consumed["authorization_manifest_hash"] = tombstone
        with pytest.raises(
            VbdTrajectoryPrecisionDiagnosticError, match="consumed V1/V2"
        ):
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


def _checkpoint_identity():
    return VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity(
        implementation_commit="1" * 40,
        authorization_commit="2" * 40,
        authorization_manifest_hash="3" * 64,
        human_execution_authorization_hash="4" * 64,
        attempt_claim_hash="5" * 64,
    )


def _write_checkpoint_chain(root, identity):
    values = []
    predecessor_hash = None
    for ordinal, (filename, phase, lane) in enumerate(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE
    ):
        body = {
            "schema": checkpoint_module.VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SCHEMA,
            "diagnostic_identity": checkpoint_module.VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_ID,
            "implementation_commit": identity.implementation_commit,
            "authorization_commit": identity.authorization_commit,
            "authorization_manifest_hash": identity.authorization_manifest_hash,
            "human_execution_authorization_hash": (
                identity.human_execution_authorization_hash
            ),
            "attempt_claim_hash": identity.attempt_claim_hash,
            "input_binding_hash": None if ordinal == 0 else "6" * 64,
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
    validated = validate_vbd_precision_diagnostic_v3_checkpoint_root(
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
        VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
        match="identity, sequence, or hash",
    ):
        validate_vbd_precision_diagnostic_v3_checkpoint(
            bool_ordinal,
            identity=identity,
            ordinal=1,
            predecessor_hash=values[0]["checkpoint_hash"],
            input_binding_hash="6" * 64,
        )
    assert not hasattr(
        checkpoint_module, "start_vbd_precision_diagnostic_v3_checkpoint_session"
    )
    assert not hasattr(
        checkpoint_module, "write_vbd_precision_diagnostic_v3_checkpoint"
    )

    alias = tmp_path / "checkpoint-alias.json"
    os.link(
        root / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE[0][0],
        alias,
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3CheckpointError):
        validate_vbd_precision_diagnostic_v3_checkpoint_root(
            root=root, identity=identity
        )


def test_checkpoint_root_rejects_unknown_partial_or_consumed_identity(tmp_path):
    identity = _checkpoint_identity()
    partial = (tmp_path / "partial").resolve()
    partial.mkdir()
    values = _write_checkpoint_chain(partial, identity)
    (partial / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE[-1][0]).unlink()
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3CheckpointError):
        validate_vbd_precision_diagnostic_v3_checkpoint_root(
            root=partial, identity=identity
        )
    assert len(values) == len(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE
    )

    unknown = (tmp_path / "unknown").resolve()
    unknown.mkdir()
    (unknown / "message.txt").write_text("unsafe", encoding="utf-8")
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3CheckpointError):
        validate_vbd_precision_diagnostic_v3_checkpoint_root(
            root=unknown, identity=identity
        )

    for field, consumed_value in (
        (
            "implementation_commit",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
        ),
        (
            "implementation_commit",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
        ),
        (
            "authorization_manifest_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        ),
        (
            "authorization_manifest_hash",
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
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
            VbdTrajectoryPrecisionDiagnosticV3CheckpointError,
            match="consumed V1/V2",
        ):
            VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity(**identity_body)
