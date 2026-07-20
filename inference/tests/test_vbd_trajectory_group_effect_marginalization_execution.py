"""Sampler-free authorization boundaries for the marginalization diagnostic."""

from __future__ import annotations

import ast
from copy import deepcopy
import importlib.util
import inspect
from pathlib import Path

import pytest

import fluencytracr_inference.vbd_trajectory_group_effect_marginalization_authorization as authorization
import fluencytracr_inference.vbd_trajectory_group_effect_marginalization_execution as execution
import fluencytracr_inference.vbd_trajectory_nuts as nuts
import fluencytracr_inference.vbd_trajectory_synthetic as synthetic
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization_diagnostic import (
    vbd_trajectory_group_effect_marginalization_plan,
    vbd_trajectory_group_effect_marginalization_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_group_effect_marginalization_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH,
)


_REPO = Path(__file__).resolve().parents[2]
_BOOTSTRAP = (
    _REPO
    / "inference/scripts/vbd_trajectory_group_effect_marginalization_bootstrap.py"
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
        "marginalization_bootstrap_under_test", _BOOTSTRAP
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def valid_manifest(monkeypatch):
    commit = "a" * 40
    tree = "b" * 40
    refs = {
        "CODE": f"review:code/go/{commit}/code-review",
        "BUG": f"review:bug/go/{commit}/bug-review",
        "ADVERSARIAL": f"review:adversarial/go/{commit}/adversarial-review",
        "STATISTICAL_METHODOLOGY": (
            f"review:statistical-methodology/go/{commit}/methodology-review"
        ),
    }
    files = [
        {"path": path, "sha256": "c" * 64}
        for path in authorization._MARGINALIZATION_RUNNER_SOURCE_PATHS
    ]

    def git_output(*args):
        if args == ("status", "--porcelain=v1", "--untracked-files=all"):
            return ""
        if args == ("rev-parse", "HEAD"):
            return commit
        if args == ("rev-parse", "HEAD^{tree}"):
            return tree
        raise AssertionError(args)

    monkeypatch.setattr(authorization, "_git_output", git_output)
    monkeypatch.setattr(
        authorization,
        "_implementation_review_refs_are_valid",
        lambda value, expected: value == refs and expected == commit,
    )
    monkeypatch.setattr(
        authorization,
        "vbd_trajectory_runner_implementation_manifest",
        lambda *, source_paths: {
            "files": files,
            "implementation_hash": sha256_json({"files": files}),
        },
    )
    monkeypatch.setattr(
        authorization,
        "build_vbd_trajectory_runtime_identity",
        lambda: {
            "runtime_identity_hash": "d" * 64,
            "native_libraries": [{"name": "Accelerate", "sha256": "e" * 64}],
        },
    )
    monkeypatch.setattr(
        authorization,
        "_pinned_site_package_paths",
        lambda: ["/fixed/site-packages"],
    )
    monkeypatch.setattr(
        authorization,
        "_trusted_git_executable",
        lambda: Path("/usr/bin/git"),
    )
    return authorization.build_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        implementation_review_refs=refs
    )


def test_fixed_roots_and_manifest_identity_are_diagnostic_specific():
    assert VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH == (
        "/Users/jameskelley/.codex/evidence/"
        "vbd-group-effect-marginalization-diagnostic-v1-workspace"
    )


def test_manifest_binds_complete_source_runtime_model_plan_seed_and_command(
    valid_manifest,
):
    assert len(valid_manifest["in_scope_files"]) == len(
        authorization._MARGINALIZATION_RUNNER_SOURCE_PATHS
    )
    assert len(valid_manifest["in_scope_files"]) == 52
    assert valid_manifest["diagnostic_plan_hash"] == (
        vbd_trajectory_group_effect_marginalization_plan()["plan_hash"]
    )
    assert valid_manifest["seed_manifest_hash"] == (
        vbd_trajectory_group_effect_marginalization_seed_manifest()[
            "seed_manifest_hash"
        ]
    )
    assert valid_manifest["command_hash"] == sha256_json(
        valid_manifest["command_argv"]
    )
    assert valid_manifest["execution_state"] == "NOT_RUN"
    assert valid_manifest["acceptance_complete"] is False
    assert valid_manifest["task_2_6_complete"] is False


@pytest.mark.parametrize(
    "field",
    (
        "in_scope_files_hash",
        "runtime_identity_hash",
        "model_manifest_hash",
        "diagnostic_plan_hash",
        "seed_manifest_hash",
        "canonical_workspace_identity_hash",
        "command_hash",
    ),
)
def test_manifest_rejects_source_runtime_model_plan_seed_root_or_command_drift(
    valid_manifest,
    field,
):
    mutation = deepcopy(valid_manifest)
    mutation[field] = "0" * 64
    body = {key: value for key, value in mutation.items() if key != "manifest_hash"}
    mutation["manifest_hash"] = sha256_json(body)
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError
    ):
        authorization.validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
            mutation
        )


def test_input_binding_freezes_four_panels_twelve_fits_and_exact_order(monkeypatch):
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_authorization_manifest",
        lambda value: value,
    )
    plan = vbd_trajectory_group_effect_marginalization_plan()
    manifest = {
        "manifest_hash": "1" * 64,
        "diagnostic_plan_hash": plan["plan_hash"],
        "seed_manifest_hash": (
            vbd_trajectory_group_effect_marginalization_seed_manifest()[
                "seed_manifest_hash"
            ]
        ),
    }
    claim_body = {
        "authorization_manifest_hash": manifest["manifest_hash"],
        "state": "CONSUMED_BEFORE_EXECUTION",
    }
    claim = {**claim_body, "claim_hash": sha256_json(claim_body)}
    arguments = {
        "manifest": manifest,
        "claim": claim,
        "case_panel_hashes": [f"{10 + index:064x}" for index in range(4)],
        "ordered_panel_manifest_roots": [
            f"{20 + index:064x}" for index in range(4)
        ],
        "prepared_input_hashes": [f"{30 + index:064x}" for index in range(12)],
        "model_input_hashes": [f"{50 + index:064x}" for index in range(12)],
        "deterministic_reference_hashes": [
            f"{70 + index:064x}" for index in range(12)
        ],
        "deterministic_recomputation_hashes": [
            f"{70 + index:064x}" for index in range(12)
        ],
        "expected_sampler_binding_hashes": [
            item["binding"]["binding_hash"] for item in plan["execution_order"]
        ],
    }
    value = authorization.build_vbd_trajectory_group_effect_marginalization_input_binding(
        **arguments
    )
    assert len(value["case_panel_hashes"]) == 4
    assert len(value["prepared_input_hashes"]) == 12
    mutation = deepcopy(arguments)
    mutation["expected_sampler_binding_hashes"].reverse()
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError
    ):
        authorization.build_vbd_trajectory_group_effect_marginalization_input_binding(
            **mutation
        )
    native_type_tamper = deepcopy(value)
    native_type_tamper["internal_only"] = 1
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError
    ):
        authorization.validate_vbd_trajectory_group_effect_marginalization_input_binding(
            native_type_tamper,
            manifest=manifest,
            claim=claim,
        )


@pytest.mark.parametrize(
    ("field", "replacement"),
    (("evidence_eligible", 0), ("acceptance_count_effect", 0.0)),
)
def test_completion_receipt_rejects_native_type_substitution_without_rehash(
    field,
    replacement,
):
    manifest = {
        "manifest_hash": "1" * 64,
        "diagnostic_plan_hash": "2" * 64,
        "seed_manifest_hash": "3" * 64,
    }
    claim = {"claim_hash": "4" * 64}
    input_binding = {"input_binding_hash": "5" * 64}
    fit_records = [
        {"fit_record_hash": f"{100 + index:064x}"} for index in range(12)
    ]
    receipt = authorization.build_vbd_trajectory_group_effect_marginalization_completion_receipt(
        manifest=manifest,
        claim=claim,
        input_binding=input_binding,
        fit_records=fit_records,
    )
    mutation = deepcopy(receipt)
    mutation[field] = replacement
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError
    ):
        authorization.validate_vbd_trajectory_group_effect_marginalization_completion_receipt(
            mutation,
            manifest=manifest,
            claim=claim,
            input_binding=input_binding,
            fit_records=fit_records,
        )


def test_external_human_execution_record_is_strict_and_validation_only(
    valid_manifest,
):
    authorization_commit = "f" * 40
    body = {
        "schema_version": (
            authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_SCHEMA_VERSION
        ),
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": valid_manifest["manifest_hash"],
        "scope": authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_SCOPE,
        "authorizing_decision_ref": (
            "human-authorization:vbd-marginalization-diagnostic/james-20260720"
        ),
        "decision_text_hash": "1" * 64,
        "authorized_at_utc": "2026-07-20T12:00:00Z",
        "maximum_launch_count": 1,
        "canonical_workspace_identity": valid_manifest[
            "canonical_workspace_identity_hash"
        ],
        "lifecycle_root_identity": valid_manifest[
            "lifecycle_root_identity_hash"
        ],
        "command_hash": valid_manifest["command_hash"],
        "launch_permit_path_hash": valid_manifest["launch_permit_path_hash"],
        "launch_permit_hash": "2" * 64,
        "launch_permit_file_sha256": "3" * 64,
        "launch_permit_device": 1,
        "launch_permit_inode": 2,
    }
    record = {**body, "execution_authorization_hash": sha256_json(body)}
    assert (
        authorization.validate_vbd_trajectory_group_effect_marginalization_execution_authorization(
            record,
            manifest=valid_manifest,
            authorization_commit=authorization_commit,
        )
        == record
    )
    mutation = {**record, "maximum_launch_count": 2}
    mutation["execution_authorization_hash"] = sha256_json(
        {
            key: value
            for key, value in mutation.items()
            if key != "execution_authorization_hash"
        }
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError
    ):
        authorization.validate_vbd_trajectory_group_effect_marginalization_execution_authorization(
            mutation,
            manifest=valid_manifest,
            authorization_commit=authorization_commit,
        )
    assert VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH == (
        "/Users/jameskelley/.codex/evidence/"
        "vbd-group-effect-marginalization-diagnostic-v1-lifecycle"
    )
    assert authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_SCOPE == (
        "vbd_group_effect_marginalization_diagnostic_v1_nonacceptance_one_launch"
    )
    assert authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_OUTPUT_FILENAME == (
        "marginalization_diagnostic.json"
    )


@pytest.mark.parametrize(
    ("field", "replacement"),
    (
        ("maximum_launch_count", True),
        ("maximum_launch_count", 1.0),
        ("customer_output_authorized", 0),
    ),
)
def test_package_permit_validation_rejects_native_type_substitution(
    valid_manifest,
    field,
    replacement,
):
    authorization_commit = "f" * 40
    body = authorization._permit_body(
        manifest=valid_manifest,
        authorization_commit=authorization_commit,
        permit_token="1" * 64,
    )
    permit = {**body, "permit_hash": sha256_json(body)}
    permit[field] = replacement
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="launch permit is invalid",
    ):
        authorization.validate_vbd_trajectory_group_effect_marginalization_launch_permit(
            permit,
            manifest=valid_manifest,
            authorization_commit=authorization_commit,
        )


def test_execution_authorization_write_rejects_self_consistent_fabricated_permit_identity(
    tmp_path,
    monkeypatch,
):
    lifecycle = tmp_path / "lifecycle"
    lifecycle.mkdir(mode=0o700)
    permit_path = lifecycle / authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_FILENAME
    authorization_path = lifecycle / authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME
    manifest = {
        "manifest_hash": "1" * 64,
        "launch_permit_path": str(permit_path),
        "execution_authorization_record_path": str(authorization_path),
        "canonical_workspace_identity_hash": "2" * 64,
        "lifecycle_root_identity_hash": "3" * 64,
        "command_hash": "4" * 64,
        "launch_permit_path_hash": authorization._path_hash(permit_path),
    }
    authorization_commit = "a" * 40
    permit_body = authorization._permit_body(
        manifest=manifest,
        authorization_commit=authorization_commit,
        permit_token="5" * 64,
    )
    permit = {**permit_body, "permit_hash": sha256_json(permit_body)}
    permit_path.write_bytes(authorization._canonical_bytes(permit))
    permit_path.chmod(0o600)
    fabricated_body = {
        "schema_version": authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_SCHEMA_VERSION,
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_SCOPE,
        "authorizing_decision_ref": "human-authorization:vbd-marginalization-diagnostic/fabricated",
        "decision_text_hash": "6" * 64,
        "authorized_at_utc": "2026-07-20T12:00:00Z",
        "maximum_launch_count": 1,
        "canonical_workspace_identity": manifest["canonical_workspace_identity_hash"],
        "lifecycle_root_identity": manifest["lifecycle_root_identity_hash"],
        "command_hash": manifest["command_hash"],
        "launch_permit_path_hash": manifest["launch_permit_path_hash"],
        "launch_permit_hash": "7" * 64,
        "launch_permit_file_sha256": "8" * 64,
        "launch_permit_device": 987654,
        "launch_permit_inode": 123456,
    }
    fabricated = {
        **fabricated_body,
        "execution_authorization_hash": sha256_json(fabricated_body),
    }
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_authorization_manifest",
        lambda value: value,
    )
    monkeypatch.setattr(
        authorization,
        "verify_vbd_trajectory_group_effect_marginalization_authorization_commit",
        lambda **_kwargs: None,
    )
    monkeypatch.setattr(
        authorization,
        "preflight_vbd_trajectory_group_effect_marginalization_fixed_roots",
        lambda **_kwargs: None,
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="permit identity differs",
    ):
        authorization.write_vbd_trajectory_group_effect_marginalization_execution_authorization(
            manifest=manifest,
            authorization=fabricated,
            authorization_commit=authorization_commit,
        )
    assert permit_path.is_file()
    assert not authorization_path.exists()


@pytest.mark.parametrize(
    ("field", "replacement"),
    (
        ("maximum_launch_count", True),
        ("maximum_launch_count", 1.0),
        ("customer_output_authorized", 0),
    ),
)
def test_bootstrap_rejects_bool_int_permit_substitution_before_consumption(
    tmp_path,
    monkeypatch,
    field,
    replacement,
):
    bootstrap = _load_bootstrap()
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir(mode=0o700)
    monkeypatch.setattr(bootstrap, "_LIFECYCLE", lifecycle)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    authorization_commit = "a" * 40
    manifest = {
        "manifest_hash": "1" * 64,
        "canonical_workspace_identity_hash": "2" * 64,
        "lifecycle_root_identity_hash": "3" * 64,
        "command_hash": "4" * 64,
        "launch_permit_path_hash": "5" * 64,
    }
    permit_body = {
        "schema_version": bootstrap._PERMIT_SCHEMA_VERSION,
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": bootstrap._SCOPE,
        "permit_token": "6" * 64,
        "maximum_launch_count": 1,
        "state": "AVAILABLE_BEFORE_EXECUTION",
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    permit = {**permit_body, "permit_hash": bootstrap._hash_json(permit_body)}
    permit[field] = replacement
    permit_path = lifecycle / bootstrap._PERMIT_NAME
    permit_path.write_bytes(bootstrap._canonical_bytes(permit))
    permit_path.chmod(0o600)
    permit_info = permit_path.stat()
    execution_body = {
        "schema_version": bootstrap._EXECUTION_SCHEMA_VERSION,
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": bootstrap._SCOPE,
        "authorizing_decision_ref": "human-authorization:vbd-marginalization-diagnostic/native-type",
        "decision_text_hash": "7" * 64,
        "authorized_at_utc": "2026-07-20T12:00:00Z",
        "maximum_launch_count": 1,
        "canonical_workspace_identity": manifest["canonical_workspace_identity_hash"],
        "lifecycle_root_identity": manifest["lifecycle_root_identity_hash"],
        "command_hash": manifest["command_hash"],
        "launch_permit_path_hash": manifest["launch_permit_path_hash"],
        "launch_permit_hash": permit["permit_hash"],
        "launch_permit_file_sha256": bootstrap._hash_bytes(
            bootstrap._canonical_bytes(permit)
        ),
        "launch_permit_device": permit_info.st_dev,
        "launch_permit_inode": permit_info.st_ino,
    }
    execution_authorization = {
        **execution_body,
        "execution_authorization_hash": bootstrap._hash_json(execution_body),
    }
    authorization_path = lifecycle / bootstrap._AUTHORIZATION_NAME
    authorization_path.write_bytes(
        bootstrap._canonical_bytes(execution_authorization)
    )
    authorization_path.chmod(0o600)
    with pytest.raises(bootstrap.BootstrapError, match="launch permit is invalid"):
        bootstrap._validate_launch_records(
            manifest,
            authorization_commit,
            authorization_path,
        )
    assert permit_path.is_file()
    assert not (lifecycle / bootstrap._CONSUMED_NAME).exists()
    assert not (lifecycle / bootstrap._CLAIM_NAME).exists()


def test_bootstrap_has_only_stdlib_top_level_imports_and_claim_precedes_candidate_import():
    bootstrap = (
        Path(__file__).parents[1]
        / "scripts/vbd_trajectory_group_effect_marginalization_bootstrap.py"
    )
    tree = ast.parse(bootstrap.read_text(encoding="utf-8"))
    top_level_modules = {
        alias.name.split(".")[0]
        for node in tree.body
        if isinstance(node, ast.Import)
        for alias in node.names
    } | {
        node.module.split(".")[0]
        for node in tree.body
        if isinstance(node, ast.ImportFrom) and node.module
    }
    assert "fluencytracr_inference" not in top_level_modules
    source = bootstrap.read_text(encoding="utf-8")
    assert source.index("_consume_permit_and_claim(") < source.index(
        "_run_claimed_child("
    )
    assert source.index("def _execute_child(") < source.index(
        "from fluencytracr_inference import ("
    )


def test_permit_is_consumed_once_before_claim_and_replay_rejects(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap()
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir()
    lifecycle.chmod(0o700)
    monkeypatch.setattr(bootstrap, "_LIFECYCLE", lifecycle)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    (lifecycle / bootstrap._AUTHORIZATION_NAME).write_bytes(
        bootstrap._canonical_bytes({"fixed": True})
    )
    (lifecycle / bootstrap._AUTHORIZATION_NAME).chmod(0o600)
    permit = {"permit_token": "1" * 64}
    permit_path = lifecycle / bootstrap._PERMIT_NAME
    permit_path.write_bytes(bootstrap._canonical_bytes(permit))
    permit_path.chmod(0o600)
    permit_info = permit_path.stat()
    manifest = {
        "manifest_hash": "1" * 64,
        "implementation_commit": "a" * 40,
        "implementation_review_refs": {
            "CODE": "code",
            "BUG": "bug",
            "ADVERSARIAL": "adversarial",
            "STATISTICAL_METHODOLOGY": "methodology",
        },
        "command_hash": "2" * 64,
        "bootstrap_sha256": "3" * 64,
        "canonical_workspace_identity_hash": "4" * 64,
        "lifecycle_root_identity_hash": "5" * 64,
        "diagnostic_plan_hash": "6" * 64,
        "seed_manifest_hash": "7" * 64,
    }
    execution_authorization = {
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
        execution_authorization,
        permit,
        permit_info,
    )
    assert claim["state"] == "CONSUMED_BEFORE_EXECUTION"
    assert not permit_path.exists()
    assert (lifecycle / bootstrap._CONSUMED_NAME).is_file()
    assert (lifecycle / bootstrap._CLAIM_NAME).is_file()
    with pytest.raises(bootstrap.BootstrapError):
        bootstrap._consume_permit_and_claim(
            manifest,
            "b" * 40,
            execution_authorization,
            permit,
            permit_info,
        )


@pytest.mark.parametrize("fail_pending_validation", (False, True))
def test_publication_is_one_inode_and_rolls_back_invalid_pending_output(
    tmp_path, monkeypatch, fail_pending_validation
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    workspace.chmod(0o700)
    staged = workspace / bootstrap._STAGED_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
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
        if fail_pending_validation and allow_pending_alias:
            raise bootstrap.BootstrapError("pending output invalid")

    monkeypatch.setattr(bootstrap, "_validate_persisted", validate)
    if fail_pending_validation:
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
    assert calls[:2] == [
        (bootstrap._STAGED_NAME, False),
        (bootstrap._OUTPUT_NAME, True),
    ]


def test_supervisor_terminates_and_reaps_failed_child(monkeypatch):
    bootstrap = _load_bootstrap()
    terminated = []
    monkeypatch.setattr(bootstrap.os, "fork", lambda: 4242)
    monkeypatch.setattr(
        bootstrap,
        "_wait_for_child",
        lambda _child_pid: (_ for _ in ()).throw(KeyboardInterrupt()),
    )
    monkeypatch.setattr(
        bootstrap,
        "_terminate_and_reap_child",
        lambda child_pid: terminated.append(child_pid),
    )
    with pytest.raises(KeyboardInterrupt):
        bootstrap._run_claimed_child(
            {}, Path("/fixed/authorization.json"), "a" * 40, Path("/fixed/repo")
        )
    assert terminated == [4242]


def test_actual_argv_and_executable_must_match_before_launch(monkeypatch):
    bootstrap = _load_bootstrap()
    executable = "/canonical/python"
    command = [
        executable,
        "-I",
        "-S",
        "-B",
        "/exact/bootstrap.py",
        "run",
        "--execution-authorization",
        "/exact/authorization.json",
    ]
    monkeypatch.setattr(bootstrap.sys, "executable", "/venv/python")
    monkeypatch.setattr(bootstrap.sys, "_base_executable", "/base/python")
    monkeypatch.setattr(
        bootstrap.sys,
        "orig_argv",
        ["/framework/Python", *command[1:]],
    )
    monkeypatch.setattr(
        bootstrap.os.path,
        "realpath",
        lambda value: executable
        if value in {"/venv/python", "/base/python"}
        else value,
    )
    bootstrap._validate_actual_command({"command_argv": command})
    monkeypatch.setattr(
        bootstrap.sys,
        "orig_argv",
        ["/framework/Python", *command[1:], "--extra"],
    )
    with pytest.raises(bootstrap.BootstrapError):
        bootstrap._validate_actual_command({"command_argv": command})


def test_fixed_root_rejects_extra_file_and_symlinked_ancestor(tmp_path, monkeypatch):
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir()
    expected_lifecycle, _ = authorization._ROOT_PHASE_FILES["CLAIMED"]
    assert expected_lifecycle is not None
    for name in expected_lifecycle:
        (lifecycle / name).write_bytes(b"{}\n")
    (lifecycle / "off-plan.json").write_bytes(b"{}\n")
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_authorization_manifest",
        lambda value: value,
    )
    monkeypatch.setattr(
        authorization,
        "_fixed_paths",
        lambda _manifest: {"lifecycle": lifecycle, "workspace": workspace},
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="contents are off plan",
    ):
        authorization.preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
            manifest={}, phase="CLAIMED"
        )

    (lifecycle / "off-plan.json").unlink()
    lifecycle.chmod(0o755)
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="ownership or mode",
    ):
        authorization.preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
            manifest={}, phase="CLAIMED"
        )

    real = tmp_path / "real"
    real.mkdir()
    link = tmp_path / "linked"
    link.symlink_to(real, target_is_directory=True)
    with pytest.raises(Exception):
        authorization._open_absolute_directory_no_symlinks(
            link, create_leaf=False
        )


def test_fixed_root_preflight_rejects_cross_device_roots(monkeypatch):
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_authorization_manifest",
        lambda value: value,
    )
    monkeypatch.setattr(
        authorization,
        "_fixed_paths",
        lambda _manifest: {
            "lifecycle": Path("/fixed/lifecycle"),
            "workspace": Path("/fixed/workspace"),
        },
    )
    devices = iter((101, 202))
    monkeypatch.setattr(
        authorization,
        "_validate_root_files",
        lambda *_args, **_kwargs: next(devices),
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="cross devices",
    ):
        authorization.preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
            manifest={}, phase="PUBLISHED"
        )


def test_execution_exposes_no_caller_plan_or_retry_controls():
    signature = execution.execute_authorized_vbd_trajectory_group_effect_marginalization
    assert tuple(__import__("inspect").signature(signature).parameters) == (
        "manifest",
        "execution_authorization",
        "claim",
        "_execution_token",
    )
    source = __import__("inspect").getsource(execution)
    assert source.count("_sample_vbd_trajectory_group_effect_marginalization_idata(") == 1
    for forbidden in ("retry", "resume", "seed_rotation", "adaptive_extension"):
        assert forbidden not in source


def test_execution_token_rejects_before_candidate_work():
    with pytest.raises(PermissionError):
        execution.execute_authorized_vbd_trajectory_group_effect_marginalization(
            manifest={},
            execution_authorization={},
            claim={},
            _execution_token=object(),
        )
