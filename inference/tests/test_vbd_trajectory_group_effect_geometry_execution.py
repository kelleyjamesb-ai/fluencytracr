"""Sampler-free execution, projection, and one-shot lifecycle checks."""

from __future__ import annotations

import ast
from copy import deepcopy
import importlib.util
import inspect
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
import xarray as xr

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference import (
    vbd_trajectory_group_effect_geometry_authorization as authorization,
    vbd_trajectory_group_effect_geometry_diagnostic as diagnostic,
    vbd_trajectory_group_effect_geometry_execution as execution,
    vbd_trajectory_group_effect_geometry_projection as projection,
    vbd_trajectory_nuts as nuts,
    vbd_trajectory_synthetic as synthetic,
    vbd_trajectory_validation_resumable as validation_runner,
)
from fluencytracr_inference.vbd_trajectory_group_effect_geometry_diagnostic import (
    build_vbd_trajectory_group_effect_geometry_arm_record,
    vbd_trajectory_group_effect_geometry_plan,
)
from fluencytracr_inference.vbd_trajectory_nuts import (
    build_vbd_trajectory_nuts_group_effect_geometry_binding,
)
from fluencytracr_inference.vbd_trajectory_preparation import TrajectoryPreparedInput
from fluencytracr_inference.vbd_trajectory_state_space import (
    TrajectoryDeterministicCommonQuantityReference,
    vbd_trajectory_common_quantity_names,
)
from fluencytracr_inference.vbd_trajectory_statistics import (
    TrajectoryPosteriorSummary,
)


_REPO = Path(__file__).resolve().parents[2]
_BOOTSTRAP_PATH = (
    _REPO
    / "inference/scripts/vbd_trajectory_group_effect_geometry_bootstrap.py"
)


@pytest.fixture(autouse=True)
def _generator_and_sampler_are_forbidden(monkeypatch):
    calls = []

    def sentinel(*args, **kwargs):
        calls.append((args, kwargs))
        raise AssertionError("authorization tests cannot generate or sample")

    monkeypatch.setattr(nuts.pm, "sample", sentinel)
    monkeypatch.setattr(synthetic, "_generate_vbd_trajectory_case", sentinel)
    yield
    assert calls == []


def _load_bootstrap():
    spec = importlib.util.spec_from_file_location(
        "geometry_bootstrap_under_test",
        _BOOTSTRAP_PATH,
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _prepared_stub(case_ordinal: int) -> TrajectoryPreparedInput:
    case = vbd_trajectory_group_effect_geometry_plan()["cases"][case_ordinal]
    body = case["case_body"]
    panel_group_count = body["panel_group_count"]
    row_count = panel_group_count * 2
    group_index = np.repeat(
        np.arange(panel_group_count, dtype=np.int64),
        2,
    )
    group_rows = tuple(
        np.flatnonzero(group_index == group).astype(np.int64)
        for group in range(panel_group_count)
    )
    time_index = np.tile(np.asarray((0, 1), dtype=np.int64), panel_group_count)
    time_tau = np.tile(
        np.asarray((-0.5, 0.5), dtype=np.float64),
        panel_group_count,
    )
    x = np.column_stack((np.ones(row_count), time_tau))
    basis = np.eye(panel_group_count, dtype=np.float64)[
        :, : panel_group_count - 1
    ]
    return TrajectoryPreparedInput(
        lane="frequency",
        panel_group_count=panel_group_count,
        aggregate_k=body["aggregate_k"],
        series_evidence_eligible=False,
        standardization_window_indexes=(0,),
        y=np.linspace(-0.2, 0.2, row_count, dtype=np.float64),
        known_se=np.full(row_count, 0.25, dtype=np.float64),
        time_index=time_index,
        time_tau=time_tau,
        post=np.tile(np.asarray((0, 1), dtype=np.int64), panel_group_count),
        group_index=group_index,
        group_rows=group_rows,
        x=x,
        fixed_effect_names=("alpha", "beta"),
        zero_sum_basis=basis,
        augmented_design=np.column_stack((x, basis[group_index])),
        latent_level_contrast=np.tile(
            np.asarray((-0.5, 0.5), dtype=np.float64) / panel_group_count,
            panel_group_count,
        ),
        raw_pre_mean=0.0,
        raw_pre_sd=1.0,
        direction_sign=1,
        transform_root="1" * 64,
        model_manifest_root="2" * 64,
        ordered_panel_manifest_root="3" * 64,
        cohort_partition_root="4" * 64,
        study_plan_root=case["case_plan_hash"],
        seed_manifest_root="5" * 64,
        lane_observation_root="6" * 64,
        joint_uncertainty_roots_hash="7" * 64,
        model_input_hash=f"{10 + case_ordinal:064x}",
        context_binding_hash="8" * 64,
        prepared_input_hash=f"{20 + case_ordinal:064x}",
    )


def _source(case_ordinal: int):
    case = vbd_trajectory_group_effect_geometry_plan()["cases"][case_ordinal]
    panel = SimpleNamespace(
        study_plan_root=case["case_plan_hash"],
        ordered_panel_manifest_root=f"{3 + case_ordinal:064x}",
        to_dict=lambda: case["case_body"],
    )
    return SimpleNamespace(panel=panel), _prepared_stub(case_ordinal)


def _reference(prepared) -> TrajectoryDeterministicCommonQuantityReference:
    summaries = tuple(
        TrajectoryPosteriorSummary(
            quantity_name=name,
            posterior_mean=0.0,
            posterior_sd=1.0,
            interval_80_lower=-1.0,
            interval_80_upper=1.0,
            interval_99_lower=-2.0,
            interval_99_upper=2.0,
        )
        for name in vbd_trajectory_common_quantity_names(
            prepared.panel_group_count
        )
    )
    return TrajectoryDeterministicCommonQuantityReference(
        lane=prepared.lane,
        panel_group_count=prepared.panel_group_count,
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        quantity_summaries=summaries,
        legacy_fit_summary_hash="f" * 64,
    )


def _fake_idata(panel_group_count: int, arm: str, *, reverse: bool = False):
    base = np.linspace(
        -1.0,
        1.0,
        4 * 20_000,
        dtype=np.float64,
    ).reshape(4, 20_000)
    sigma_u = 1.25 + 0.1 * base
    coefficients = np.arange(panel_group_count, dtype=np.float64)
    coefficients -= coefficients.mean()
    coefficients /= np.max(np.abs(coefficients))
    standardized = base[:, :, None] * coefficients[None, None, :]
    variables = {
        "alpha": xr.DataArray(0.1 + 0.2 * base, dims=("chain", "draw")),
        "beta": xr.DataArray(-0.2 + 0.3 * base, dims=("chain", "draw")),
        "sigma_u": xr.DataArray(sigma_u, dims=("chain", "draw")),
        "u": xr.DataArray(
            (
                sigma_u[:, :, None] * standardized
                if arm == "noncentered"
                else standardized
            ),
            dims=("chain", "draw", "u_dim_0"),
            coords={
                "u_dim_0": np.arange(panel_group_count, dtype=np.int64)
            },
        ),
        "sigma_r": xr.DataArray(0.8 + 0.05 * base, dims=("chain", "draw")),
        "rho": xr.DataArray(0.2 + 0.1 * base, dims=("chain", "draw")),
        "trajectory_movement": xr.DataArray(
            0.4 + 0.25 * base,
            dims=("chain", "draw"),
        ),
    }
    if arm == "noncentered":
        variables["u_std"] = xr.DataArray(
            standardized,
            dims=("chain", "draw", "u_std_dim_0"),
            coords={
                "u_std_dim_0": np.arange(
                    panel_group_count,
                    dtype=np.int64,
                )
            },
        )
    if reverse:
        variables = dict(reversed(tuple(variables.items())))
    return SimpleNamespace(
        posterior=xr.Dataset(variables),
        sample_stats=object(),
    )


def _diagnostic_tree(
    variable_names: list[str],
    panel_group_count: int,
    value: float,
) -> xr.Dataset:
    variables = {}
    for name in variable_names:
        if name in ("u", "u_std"):
            dimension = f"{name}_dim_0"
            variables[name] = xr.DataArray(
                np.full(panel_group_count, value, dtype=np.float64),
                dims=(dimension,),
                coords={
                    dimension: np.arange(
                        panel_group_count,
                        dtype=np.int64,
                    )
                },
            )
        else:
            variables[name] = xr.DataArray(np.float64(value))
    return xr.Dataset(variables)


@pytest.fixture
def deterministic_diagnostics(monkeypatch):
    def rhat(_idata, *, var_names):
        return _diagnostic_tree(var_names, _panel_group_count(var_names), 1.0)

    def ess(_idata, *, var_names, method):
        assert method in ("bulk", "tail")
        return _diagnostic_tree(
            var_names,
            _panel_group_count(var_names),
            1_000.0,
        )

    def mcse(_idata, *, var_names, method, prob=None):
        assert method in ("mean", "quantile")
        if method == "quantile":
            assert prob in (0.005, 0.1, 0.9, 0.995)
        return _diagnostic_tree(
            var_names,
            _panel_group_count(var_names),
            0.001,
        )

    monkeypatch.setattr(projection.az, "rhat", rhat)
    monkeypatch.setattr(projection.az, "ess", ess)
    monkeypatch.setattr(projection.az, "mcse", mcse)
    monkeypatch.setattr(
        projection,
        "_sample_stat_count",
        lambda *_args, **_kwargs: (0, True),
    )
    monkeypatch.setattr(
        projection,
        "_bfmi_values",
        lambda _idata: np.ones(4, dtype=np.float64),
    )


def _panel_group_count(variable_names: list[str]) -> int:
    current = getattr(_panel_group_count, "value", None)
    assert current in (6, 12)
    return current


@pytest.mark.parametrize(
    ("case_ordinal", "arm", "expected_diagnostic_rows", "expected_comparisons"),
    (
        (0, "centered", 12, 12),
        (0, "noncentered", 18, 12),
        (1, "centered", 18, 18),
        (1, "noncentered", 30, 18),
    ),
)
def test_full_shape_projection_has_exact_cardinality_and_no_values(
    deterministic_diagnostics,
    case_ordinal,
    arm,
    expected_diagnostic_rows,
    expected_comparisons,
):
    case, prepared = _source(case_ordinal)
    _panel_group_count.value = prepared.panel_group_count
    binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
        case_ordinal=case_ordinal,
        arm=arm,
        lane="frequency",
        lane_ordinal=0,
        plan_hash=case.panel.study_plan_root,
    )
    reference = _reference(prepared)
    record = projection.project_vbd_trajectory_group_effect_geometry_arm(
        _fake_idata(prepared.panel_group_count, arm),
        binding=binding,
        prepared=prepared,
        panel_hash=sha256_json(case.panel.to_dict()),
        ordered_panel_manifest_root=(
            case.panel.ordered_panel_manifest_root
        ),
        deterministic_reference=reference,
        deterministic_recomputation=reference,
    )
    assert len(record["sampler_diagnostic_rows"]) == expected_diagnostic_rows
    assert len(record["reference_comparisons"]) == expected_comparisons
    assert record["posterior_values_emitted"] is False
    assert record["raw_posterior_draws_emitted"] is False
    assert record["latent_paths_emitted"] is False
    assert record["u_std_reference_comparison_present"] is False
    assert "u_std" not in {
        row["quantity_name"] for row in record["reference_comparisons"]
    }


def test_projection_is_name_ordered_and_rejects_bad_noncentered_u(
    deterministic_diagnostics,
):
    case, prepared = _source(0)
    _panel_group_count.value = prepared.panel_group_count
    binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
        case_ordinal=0,
        arm="noncentered",
        lane="frequency",
        lane_ordinal=0,
        plan_hash=case.panel.study_plan_root,
    )
    reference = _reference(prepared)
    kwargs = {
        "binding": binding,
        "prepared": prepared,
        "panel_hash": sha256_json(case.panel.to_dict()),
        "ordered_panel_manifest_root": (
            case.panel.ordered_panel_manifest_root
        ),
        "deterministic_reference": reference,
        "deterministic_recomputation": reference,
    }
    natural = projection.project_vbd_trajectory_group_effect_geometry_arm(
        _fake_idata(prepared.panel_group_count, "noncentered"),
        **kwargs,
    )
    reordered = projection.project_vbd_trajectory_group_effect_geometry_arm(
        _fake_idata(
            prepared.panel_group_count,
            "noncentered",
            reverse=True,
        ),
        **kwargs,
    )
    assert reordered == natural

    malformed = _fake_idata(prepared.panel_group_count, "noncentered")
    malformed.posterior["u"].values[0, 0, 0] += 1.0
    with pytest.raises(
        projection.VbdTrajectoryGroupEffectGeometryProjectionError,
        match="reconstruction",
    ):
        projection.project_vbd_trajectory_group_effect_geometry_arm(
            malformed,
            **kwargs,
        )


def _passing_sampler_rows(panel_group_count: int, arm: str) -> list[dict]:
    names = list(vbd_trajectory_common_quantity_names(panel_group_count))
    if arm == "noncentered":
        names.extend(
            f"u_std[{index}]" for index in range(panel_group_count)
        )
    return [
        {
            "parameter_name": name,
            "r_hat": 1.0,
            "bulk_ess": 1_000.0,
            "tail_ess": 1_000.0,
            "posterior_mean_mcse_to_posterior_sd_ratio": 0.01,
            "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio": 0.01,
            "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio": 0.01,
            "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio": 0.01,
            "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio": 0.01,
        }
        for name in names
    ]


def _passing_reference_rows(panel_group_count: int) -> list[dict]:
    return [
        {
            "quantity_name": name,
            "absolute_mean_difference_reference_sd": 0.01,
            "interval_80_lower_endpoint_difference_reference_sd": 0.01,
            "interval_80_upper_endpoint_difference_reference_sd": 0.01,
            "interval_99_lower_endpoint_difference_reference_sd": 0.01,
            "interval_99_upper_endpoint_difference_reference_sd": 0.01,
            "primary_to_reference_sd_ratio": 1.0,
        }
        for name in vbd_trajectory_common_quantity_names(panel_group_count)
    ]


def _complete_arm_matrix() -> list[dict]:
    records = []
    for sequence in vbd_trajectory_group_effect_geometry_plan()[
        "execution_order"
    ]:
        value = sequence["binding"]
        binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
            case_ordinal=value["case_ordinal"],
            arm=value["arm"],
            lane=value["lane"],
            lane_ordinal=value["lane_ordinal"],
            plan_hash=value["plan_hash"],
        )
        records.append(
            build_vbd_trajectory_group_effect_geometry_arm_record(
                binding=binding,
                panel_hash=f"{binding.case_ordinal + 1:064x}",
                ordered_panel_manifest_root=(
                    f"{binding.case_ordinal + 3:064x}"
                ),
                prepared_input_hash=f"{10 + (len(records) >> 1):064x}",
                model_input_hash=f"{30 + (len(records) >> 1):064x}",
                deterministic_reference_hash=f"{50 + (len(records) >> 1):064x}",
                deterministic_recomputation_hash=f"{50 + (len(records) >> 1):064x}",
                sampler_diagnostic_rows=_passing_sampler_rows(
                    binding.panel_group_count,
                    binding.arm,
                ),
                reference_comparisons=_passing_reference_rows(
                    binding.panel_group_count
                ),
                post_warmup_divergences=(
                    1 if binding.arm == "centered" else 0
                ),
                max_treedepth_saturation_count=0,
                energy_bfmi_min=1.0,
            )
        )
    return records


def test_completed_record_is_valid_but_public_classifier_remains_fail_closed():
    implementation_commit = "a" * 40
    arms = _complete_arm_matrix()
    provenance = {
        "authorization_commit": "b" * 40,
        "authorization_manifest_hash": "1" * 64,
        "execution_authorization_hash": "2" * 64,
        "implementation_commit": implementation_commit,
        "implementation_tree": "c" * 40,
        "implementation_review_refs": {
            "CODE": f"review:code/go/{implementation_commit}/geometry",
            "BUG": f"review:bug/go/{implementation_commit}/geometry",
            "ADVERSARIAL": (
                f"review:adversarial/go/{implementation_commit}/geometry"
            ),
            "STATISTICAL_METHODOLOGY": (
                "review:statistical-methodology/go/"
                f"{implementation_commit}/geometry"
            ),
        },
        "launch_permit_hash": "3" * 64,
        "consumed_permit_file_hash": "4" * 64,
        "external_claim_hash": "5" * 64,
        "input_binding_hash": "6" * 64,
        "runtime_identity_hash": "7" * 64,
        "requirements_lock_hash": "8" * 64,
        "implementation_hash": "9" * 64,
        "native_library_manifest_hash": "a" * 64,
        "model_manifest_hash": "b" * 64,
        "diagnostic_plan_hash": vbd_trajectory_group_effect_geometry_plan()[
            "plan_hash"
        ],
        "seed_manifest_hash": diagnostic.vbd_trajectory_group_effect_geometry_seed_manifest()[
            "seed_manifest_hash"
        ],
        "command_hash": "c" * 64,
    }
    completion = (
        diagnostic.build_vbd_trajectory_group_effect_geometry_completion_binding(
            provenance=provenance,
            arm_records=arms,
            terminal_completion_receipt_hash="d" * 64,
        )
    )
    record = diagnostic.build_completed_vbd_trajectory_group_effect_geometry_record(
        arm_records=arms,
        runner_completion_binding=completion,
        _completion_token=(
            diagnostic._VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_COMPLETION_TOKEN
        ),
    )
    assert record["execution_state"] == "COMPLETE"
    assert record["classification"] == "SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT"
    assert diagnostic.validate_vbd_trajectory_group_effect_geometry_record(
        record
    ) == record
    assert (
        diagnostic.classify_vbd_trajectory_group_effect_geometry_result(record)
        == "INVALID_HOLD"
    )
    assert sum(
        len(arm["sampler_diagnostic_rows"]) for arm in arms
    ) == 234
    assert sum(len(arm["reference_comparisons"]) for arm in arms) == 180


def test_input_binding_rejects_off_plan_sampler_hashes(monkeypatch):
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_geometry_authorization_manifest",
        lambda value: value,
    )
    plan = vbd_trajectory_group_effect_geometry_plan()
    manifest = {
        "manifest_hash": "1" * 64,
        "diagnostic_plan_hash": plan["plan_hash"],
        "seed_manifest_hash": diagnostic.vbd_trajectory_group_effect_geometry_seed_manifest()[
            "seed_manifest_hash"
        ],
    }
    claim_body = {
        "authorization_manifest_hash": manifest["manifest_hash"],
        "state": "CONSUMED_BEFORE_EXECUTION",
    }
    claim = {**claim_body, "claim_hash": sha256_json(claim_body)}
    arguments = {
        "manifest": manifest,
        "claim": claim,
        "case_panel_hashes": ["2" * 64, "3" * 64],
        "ordered_panel_manifest_roots": ["4" * 64, "5" * 64],
        "prepared_input_hashes": [f"{10 + index:064x}" for index in range(6)],
        "model_input_hashes": [f"{20 + index:064x}" for index in range(6)],
        "deterministic_reference_hashes": [
            f"{30 + index:064x}" for index in range(6)
        ],
        "deterministic_recomputation_hashes": [
            f"{30 + index:064x}" for index in range(6)
        ],
        "expected_sampler_binding_hashes": [
            item["binding"]["binding_hash"]
            for item in plan["execution_order"]
        ],
    }
    valid = authorization.build_vbd_trajectory_group_effect_geometry_input_binding(
        **arguments
    )
    assert valid["expected_sampler_binding_hashes"] == arguments[
        "expected_sampler_binding_hashes"
    ]
    malformed = deepcopy(arguments)
    malformed["expected_sampler_binding_hashes"] = list(
        reversed(malformed["expected_sampler_binding_hashes"])
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectGeometryAuthorizationError,
        match="sampler binding",
    ):
        authorization.build_vbd_trajectory_group_effect_geometry_input_binding(
            **malformed
        )


def test_bootstrap_has_only_stdlib_top_level_imports_and_consumes_before_fork():
    source = _BOOTSTRAP_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    top_level_imports = [
        node
        for node in tree.body
        if isinstance(node, (ast.Import, ast.ImportFrom))
    ]
    assert all(
        not (
            isinstance(node, ast.ImportFrom)
            and node.module
            and node.module.startswith("fluencytracr_inference")
        )
        for node in top_level_imports
    )
    run_source = inspect.getsource(_load_bootstrap()._run)
    supervised_source = inspect.getsource(_load_bootstrap()._run_claimed_child)
    assert run_source.index("_consume_permit_and_claim(") < run_source.index(
        "_run_claimed_child("
    )
    assert supervised_source.index("os.fork()") < supervised_source.index(
        "_wait_for_child("
    )
    assert "_terminate_and_reap_child(" in supervised_source
    assert "pm.sample" not in source


def test_permit_consumption_is_create_once_and_replay_rejects(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir()
    monkeypatch.setattr(bootstrap, "_LIFECYCLE", lifecycle)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)

    authorization_path = lifecycle / bootstrap._AUTHORIZATION_NAME
    permit_path = lifecycle / bootstrap._PERMIT_NAME
    authorization_path.write_bytes(bootstrap._canonical_bytes({"fixed": True}))
    permit = {"permit_token": "1" * 64}
    permit_path.write_bytes(bootstrap._canonical_bytes(permit))
    permit_info = permit_path.stat()
    manifest = {
        "manifest_hash": "1" * 64,
        "implementation_commit": "a" * 40,
        "implementation_review_refs": {
            "CODE": "code",
            "BUG": "bug",
            "ADVERSARIAL": "adversarial",
            "STATISTICAL_METHODOLOGY": "statistical",
        },
        "command_hash": "2" * 64,
        "bootstrap_sha256": "3" * 64,
        "canonical_workspace_identity_hash": "4" * 64,
        "lifecycle_root_identity_hash": "5" * 64,
        "diagnostic_plan_hash": "6" * 64,
        "seed_manifest_hash": "7" * 64,
    }
    authorization_record = {
        "execution_authorization_hash": "8" * 64,
        "launch_permit_hash": "9" * 64,
        "launch_permit_file_sha256": bootstrap._hash_bytes(
            bootstrap._canonical_bytes(permit)
        ),
        "launch_permit_device": permit_info.st_dev,
        "launch_permit_inode": permit_info.st_ino,
    }
    claim = bootstrap._consume_permit_and_claim(
        manifest,
        "b" * 40,
        authorization_record,
        permit,
        permit_info,
    )
    assert not permit_path.exists()
    assert (lifecycle / bootstrap._CONSUMED_NAME).is_file()
    assert (lifecycle / bootstrap._CLAIM_NAME).is_file()
    assert claim["state"] == "CONSUMED_BEFORE_EXECUTION"

    with pytest.raises(bootstrap.BootstrapError):
        bootstrap._consume_permit_and_claim(
            manifest,
            "b" * 40,
            authorization_record,
            permit,
            permit_info,
        )


def test_persisted_validation_rechecks_source_binding_around_import_and_validation(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    calls = []
    authorization_commit = "a" * 40

    def revalidate(_manifest, commit, _repo):
        assert commit == authorization_commit
        calls.append("source")

    monkeypatch.setattr(bootstrap, "_revalidate_source_binding", revalidate)
    monkeypatch.setattr(bootstrap, "_install_source_paths", lambda *_args: None)
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_geometry_persisted_output",
        lambda *_args, **_kwargs: calls.append("persisted"),
    )
    bootstrap._validate_persisted(
        {},
        authorization_commit,
        tmp_path / "geometry.json",
        _REPO,
    )
    assert calls == ["source", "source", "persisted", "source"]


def test_post_run_source_drift_rejects_before_candidate_import(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    imported = []
    monkeypatch.setattr(
        bootstrap,
        "_revalidate_source_binding",
        lambda *_args: (_ for _ in ()).throw(
            bootstrap.BootstrapError("reviewed source bytes differ")
        ),
    )
    monkeypatch.setattr(
        bootstrap,
        "_install_source_paths",
        lambda *_args: imported.append(True),
    )
    with pytest.raises(bootstrap.BootstrapError, match="source bytes"):
        bootstrap._validate_persisted(
            {},
            "a" * 40,
            tmp_path / "geometry.json",
            _REPO,
        )
    assert imported == []


@pytest.mark.parametrize("fail_final_validation", (False, True))
def test_publication_uses_one_inode_and_rolls_back_invalid_final(
    tmp_path,
    monkeypatch,
    fail_final_validation,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap._STAGED_NAME
    staged.write_bytes(b"{}\n")
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    calls = []

    def validate(
        _manifest,
        _authorization_commit,
        path,
        _repo,
        *,
        allow_pending_alias=False,
    ):
        calls.append((path.name, allow_pending_alias))
        if (
            fail_final_validation
            and path.name == bootstrap._OUTPUT_NAME
            and allow_pending_alias
        ):
            raise bootstrap.BootstrapError("final validation failed")

    monkeypatch.setattr(bootstrap, "_validate_persisted", validate)
    if fail_final_validation:
        with pytest.raises(bootstrap.BootstrapError):
            bootstrap._publish({}, "a" * 40, tmp_path)
        assert tuple(path.name for path in workspace.iterdir()) == (
            bootstrap._STAGED_NAME,
        )
        assert staged.stat().st_nlink == 1
    else:
        bootstrap._publish({}, "a" * 40, tmp_path)
        final = workspace / bootstrap._OUTPUT_NAME
        assert final.read_bytes() == b"{}\n"
        assert final.stat().st_nlink == 1
        assert not staged.exists()
    expected_calls = [
        (bootstrap._STAGED_NAME, False),
        (bootstrap._OUTPUT_NAME, True),
    ]
    if not fail_final_validation:
        expected_calls.append((bootstrap._OUTPUT_NAME, False))
    assert calls == expected_calls


def test_actual_command_must_match_before_launch(monkeypatch):
    bootstrap = _load_bootstrap()
    command = [
        "/exact/python", "-I", "-S", "-B", "/exact/bootstrap.py",
        "run", "--execution-authorization", "/exact/authorization.json",
    ]
    monkeypatch.setattr(bootstrap.sys, "orig_argv", list(command))
    monkeypatch.setattr(bootstrap.os.path, "realpath", lambda value: value)
    bootstrap._validate_actual_command({"command_argv": command})
    monkeypatch.setattr(bootstrap.sys, "orig_argv", [*command, "--extra"])
    with pytest.raises(bootstrap.BootstrapError, match="actual bootstrap command"):
        bootstrap._validate_actual_command({"command_argv": command})


def test_supervisor_terminates_and_reaps_child_on_interruption(monkeypatch):
    bootstrap = _load_bootstrap()
    terminated = []
    monkeypatch.setattr(bootstrap.os, "fork", lambda: 4242)

    def interrupt(_child_pid):
        raise KeyboardInterrupt

    monkeypatch.setattr(bootstrap, "_wait_for_child", interrupt)
    monkeypatch.setattr(
        bootstrap,
        "_terminate_and_reap_child",
        lambda child_pid: terminated.append(child_pid),
    )
    with pytest.raises(KeyboardInterrupt):
        bootstrap._run_claimed_child(
            {},
            Path("/fixed/authorization.json"),
            "a" * 40,
            Path("/fixed/repo"),
        )
    assert terminated == [4242]


@pytest.mark.parametrize("extra_root", ("lifecycle", "workspace"))
def test_persisted_validation_rejects_off_plan_terminal_root_entries(
    tmp_path,
    monkeypatch,
    extra_root,
):
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir()
    workspace.mkdir()
    lifecycle_names, workspace_names = authorization._ROOT_PHASE_FILES["STAGED"]
    assert lifecycle_names is not None and workspace_names is not None
    for name in lifecycle_names:
        (lifecycle / name).write_bytes(b"{}\n")
    for name in workspace_names:
        (workspace / name).write_bytes(b"{}\n")
    ((lifecycle if extra_root == "lifecycle" else workspace) / "off-plan.json").write_bytes(
        b"{}\n"
    )
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_geometry_authorization_manifest",
        lambda manifest: manifest,
    )
    monkeypatch.setattr(
        authorization,
        "_fixed_paths",
        lambda _manifest: {"lifecycle": lifecycle, "workspace": workspace},
    )
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(
            workspace
            / authorization.VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_OUTPUT_FILENAME
        ),
    }
    staged = (
        workspace
        / authorization.VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STAGED_OUTPUT_FILENAME
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectGeometryAuthorizationError,
        match="contents are off plan",
    ):
        authorization.validate_vbd_trajectory_group_effect_geometry_persisted_output(
            staged,
            manifest=manifest,
            authorization_commit="a" * 40,
        )


def test_pending_publication_requires_exact_two_link_workspace(
    tmp_path,
    monkeypatch,
):
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir()
    workspace.mkdir()
    lifecycle_names, _ = authorization._ROOT_PHASE_FILES["PUBLISHING"]
    assert lifecycle_names is not None
    for name in lifecycle_names:
        (lifecycle / name).write_bytes(b"{}\n")
    staged = (
        workspace
        / authorization.VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STAGED_OUTPUT_FILENAME
    )
    final = workspace / authorization.VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_OUTPUT_FILENAME
    staged.write_bytes(b"{}\n")
    final.hardlink_to(staged)
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_geometry_authorization_manifest",
        lambda manifest: manifest,
    )
    monkeypatch.setattr(
        authorization,
        "_fixed_paths",
        lambda _manifest: {"lifecycle": lifecycle, "workspace": workspace},
    )
    authorization.preflight_vbd_trajectory_group_effect_geometry_fixed_roots(
        manifest={},
        phase="PUBLISHING",
    )
    final.unlink()
    final.write_bytes(b"{}\n")
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectGeometryAuthorizationError,
        match="file is unsafe",
    ):
        authorization.preflight_vbd_trajectory_group_effect_geometry_fixed_roots(
            manifest={},
            phase="PUBLISHING",
        )


def test_execution_has_one_fixed_sampler_call_and_no_caller_plan_inputs():
    tree = ast.parse(inspect.getsource(execution))
    sampler_calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id
        == "_sample_vbd_trajectory_group_effect_geometry_idata"
    ]
    assert len(sampler_calls) == 1
    parameters = inspect.signature(
        execution.execute_authorized_vbd_trajectory_group_effect_geometry
    ).parameters
    assert set(parameters) == {
        "manifest",
        "execution_authorization",
        "claim",
        "_execution_token",
    }


@pytest.mark.parametrize(
    ("source_paths", "expected_count"),
    (
        (validation_runner._RUNNER_SOURCE_PATHS_V1, 30),
        (validation_runner._RUNNER_SOURCE_PATHS_V2, 34),
        (validation_runner._RUNNER_SOURCE_PATHS_V3, 39),
        (validation_runner._RUNNER_SOURCE_PATHS, 45),
    ),
)
def test_versioned_implementation_manifests_use_their_frozen_source_sets(
    source_paths,
    expected_count,
):
    manifest = validation_runner.vbd_trajectory_runner_implementation_manifest(
        source_paths=source_paths
    )
    assert [item["path"] for item in manifest["files"]] == list(source_paths)
    assert len(manifest["files"]) == expected_count


def test_geometry_execution_sources_are_future_only_and_frozen():
    required = {
        "inference/scripts/vbd_trajectory_group_effect_geometry_bootstrap.py",
        "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_authorization.py",
        "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_constants.py",
        "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_diagnostic.py",
        "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_execution.py",
        "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_projection.py",
    }
    assert required <= set(validation_runner._RUNNER_SOURCE_PATHS)
    assert required.isdisjoint(validation_runner._RUNNER_SOURCE_PATHS_V3)
    assert validation_runner._RUNNER_SOURCE_PATHS == tuple(
        sorted(validation_runner._RUNNER_SOURCE_PATHS)
    )


def _input_binding_from_arms(arms: list[dict]) -> dict:
    pair_starts = tuple(range(0, 12, 2))
    plan = vbd_trajectory_group_effect_geometry_plan()
    return {
        "case_panel_hashes": [
            arms[0]["panel_hash"],
            arms[6]["panel_hash"],
        ],
        "ordered_panel_manifest_roots": [
            arms[0]["ordered_panel_manifest_root"],
            arms[6]["ordered_panel_manifest_root"],
        ],
        "prepared_input_hashes": [
            arms[index]["prepared_input_hash"] for index in pair_starts
        ],
        "model_input_hashes": [
            arms[index]["model_input_hash"] for index in pair_starts
        ],
        "deterministic_reference_hashes": [
            arms[index]["deterministic_reference_hash"]
            for index in pair_starts
        ],
        "deterministic_recomputation_hashes": [
            arms[index]["deterministic_recomputation_hash"]
            for index in pair_starts
        ],
        "expected_sampler_binding_hashes": [
            item["binding"]["binding_hash"]
            for item in plan["execution_order"]
        ],
    }


@pytest.mark.parametrize(
    ("field", "index"),
    (
        ("case_panel_hashes", 0),
        ("ordered_panel_manifest_roots", 1),
        ("prepared_input_hashes", 1),
        ("model_input_hashes", 2),
        ("deterministic_reference_hashes", 3),
        ("deterministic_recomputation_hashes", 4),
        ("expected_sampler_binding_hashes", 5),
    ),
)
def test_completed_arms_are_cross_bound_to_every_input_array(field, index):
    arms = _complete_arm_matrix()
    binding = _input_binding_from_arms(arms)
    authorization._validate_vbd_trajectory_group_effect_geometry_arm_input_bindings(
        arm_records=arms,
        input_binding=binding,
    )
    malformed = deepcopy(binding)
    malformed[field][index] = "e" * 64
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectGeometryAuthorizationError
    ):
        authorization._validate_vbd_trajectory_group_effect_geometry_arm_input_bindings(
            arm_records=arms,
            input_binding=malformed,
        )


def test_authorization_writer_rejects_a_symlinked_ancestor(tmp_path):
    real_parent = tmp_path / "real"
    real_parent.mkdir()
    redirected = tmp_path / "redirected"
    redirected.symlink_to(real_parent, target_is_directory=True)
    path = redirected / "fixed-root" / "record.json"
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectGeometryAuthorizationError,
        match="create-once",
    ):
        authorization._write_exclusive_json(
            path,
            {"state": "HOLD"},
            "test record",
        )
    assert tuple(real_parent.iterdir()) == ()


def test_permit_creation_verifies_exact_a_before_any_external_write(
    tmp_path,
    monkeypatch,
):
    manifest = {"launch_permit_path": str(tmp_path / "permit.json")}
    writes = []
    preflights = []

    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_geometry_authorization_manifest",
        lambda value: value,
    )

    def reject_before_write(**_kwargs):
        raise authorization.VbdTrajectoryGroupEffectGeometryAuthorizationError(
            "not exact A"
        )

    monkeypatch.setattr(
        authorization,
        "verify_vbd_trajectory_group_effect_geometry_authorization_commit",
        reject_before_write,
    )
    monkeypatch.setattr(
        authorization,
        "preflight_vbd_trajectory_group_effect_geometry_fixed_roots",
        lambda **kwargs: preflights.append(kwargs),
    )
    monkeypatch.setattr(
        authorization,
        "_write_exclusive_json",
        lambda *args: writes.append(args),
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectGeometryAuthorizationError,
        match="exact A",
    ):
        authorization.create_vbd_trajectory_group_effect_geometry_launch_permit(
            manifest=manifest,
            authorization_commit="a" * 40,
        )
    assert preflights == []
    assert writes == []
