"""Sampler-free authorization boundaries for the marginalization diagnostic."""

from __future__ import annotations

import ast
from copy import deepcopy
import importlib.machinery
import importlib.util
import inspect
from pathlib import Path
import py_compile
from types import SimpleNamespace

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
    bootstrap = _load_bootstrap()
    assert VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH == (
        "/Users/jkelley/.codex/evidence/"
        "vbd-group-effect-marginalization-diagnostic-v1-workspace"
    )
    assert str(bootstrap._WORKSPACE) == (
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH
    )
    assert str(bootstrap._LIFECYCLE) == (
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH
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
        "/Users/jkelley/.codex/evidence/"
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
    for function in ("_execute_child", "_validate_persisted"):
        function_source = inspect.getsource(getattr(_load_bootstrap(), function))
        assert function_source.index("_revalidate_source_binding(") < (
            function_source.index("_reject_alternate_first_party_imports(")
        )
        assert function_source.index("_reject_alternate_first_party_imports(") < (
            function_source.index("_install_reviewed_source_loader(")
        )
        assert function_source.index("_install_reviewed_source_loader(") < (
            function_source.index("from fluencytracr_inference import (")
        )


def test_reviewed_source_finder_executes_frozen_source_and_ignores_third_party():
    bootstrap = _load_bootstrap()
    reviewed = {
        "fluencytracr_inference": {
            "source_path": "/reviewed/fluencytracr_inference/__init__.py",
            "source_bytes": b"SOURCE_ONLY_SENTINEL = 'reviewed-bytes'\n",
            "is_package": True,
            "sha256": "1" * 64,
        }
    }
    finder = bootstrap._ReviewedSourceFinder(reviewed)
    spec = finder.find_spec("fluencytracr_inference")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.SOURCE_ONLY_SENTINEL == "reviewed-bytes"
    assert module.__cached__ is None
    assert finder.find_spec("numpy.linalg._umath_linalg") is None
    with pytest.raises(ImportError, match="unreviewed first-party"):
        finder.find_spec("fluencytracr_inference.unreviewed_shadow")


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


def test_lifecycle_consume_rejects_directory_name_replacement_before_success(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    lifecycle = tmp_path / "lifecycle"
    moved = tmp_path / "opened-lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir(mode=0o700)
    monkeypatch.setattr(bootstrap, "_LIFECYCLE", lifecycle)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    authorization_path = lifecycle / bootstrap._AUTHORIZATION_NAME
    authorization_path.write_bytes(bootstrap._canonical_bytes({"fixed": True}))
    authorization_path.chmod(0o600)
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
    original_write = bootstrap._write_exclusive_at

    def write_then_replace(root_fd, name, value):
        original_write(root_fd, name, value)
        lifecycle.rename(moved)
        lifecycle.mkdir(mode=0o700)

    monkeypatch.setattr(bootstrap, "_write_exclusive_at", write_then_replace)
    with pytest.raises(bootstrap.BootstrapError, match="directory name binding differs"):
        bootstrap._consume_permit_and_claim(
            manifest,
            "b" * 40,
            execution_authorization,
            permit,
            permit_info,
        )
    assert tuple(lifecycle.iterdir()) == ()
    assert (moved / bootstrap._CONSUMED_NAME).is_file()
    assert (moved / bootstrap._CLAIM_NAME).is_file()


def test_bootstrap_file_read_rejects_name_rebinding_during_descriptor_read(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    path = tmp_path / "launch_permit.consumed.json"
    encoded = bootstrap._canonical_bytes({"permit": "reviewed"})
    path.write_bytes(encoded)
    original_read = bootstrap.os.read
    replaced = False

    def replace_after_eof(descriptor, size):
        nonlocal replaced
        chunk = original_read(descriptor, size)
        if not chunk and not replaced:
            replaced = True
            path.rename(tmp_path / "opened-permit.json")
            path.write_bytes(encoded)
        return chunk

    monkeypatch.setattr(bootstrap.os, "read", replace_after_eof)
    with pytest.raises(bootstrap.BootstrapError, match="cannot be read safely"):
        bootstrap._read_file(path, "consumed launch permit")
    assert replaced


def test_consumed_permit_rejects_name_rebinding_during_semantic_validation(
    tmp_path,
    monkeypatch,
):
    path = tmp_path / "launch_permit.consumed.json"
    permit = {"permit_hash": "a" * 64}
    encoded = authorization._canonical_bytes(permit)
    path.write_bytes(encoded)
    info = path.stat()
    execution_authorization = {
        "launch_permit_hash": permit["permit_hash"],
        "launch_permit_file_sha256": authorization.hashlib.sha256(
            encoded
        ).hexdigest(),
        "launch_permit_device": info.st_dev,
        "launch_permit_inode": info.st_ino,
    }
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_execution_authorization",
        lambda value, **_kwargs: value,
    )

    def replace_name(value, **_kwargs):
        path.rename(tmp_path / "opened-consumed-permit.json")
        path.write_bytes(encoded)
        return value

    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_launch_permit",
        replace_name,
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="binding changed",
    ):
        authorization.read_vbd_trajectory_group_effect_marginalization_consumed_permit(
            manifest={"consumed_permit_path": str(path)},
            execution_authorization=execution_authorization,
            authorization_commit="a" * 40,
        )


def _install_test_bound_root_io(
    monkeypatch,
    lifecycle: Path,
    workspace: Path,
    *,
    manifest: dict | None = None,
):
    monkeypatch.setattr(
        authorization,
        "VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH",
        str(lifecycle),
    )
    monkeypatch.setattr(
        authorization,
        "VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH",
        str(workspace),
    )
    monkeypatch.setattr(authorization, "_BOOTSTRAP_ROOT_GUARD", None)
    monkeypatch.setattr(authorization, "_BOOTSTRAP_BOUND_ROOT_FDS", None)
    monkeypatch.setattr(authorization, "_BOOTSTRAP_FROZEN_MANIFEST_BYTES", None)
    monkeypatch.setattr(authorization, "_BOOTSTRAP_CANONICAL_ROOT_CHAINS", None)
    lifecycle_fd = __import__("os").open(lifecycle, __import__("os").O_RDONLY)
    workspace_fd = __import__("os").open(workspace, __import__("os").O_RDONLY)
    monkeypatch.setattr(
        authorization,
        "_BOOTSTRAP_BOUND_ROOT_FDS",
        {
            str(lifecycle): __import__("os").dup(lifecycle_fd),
            str(workspace): __import__("os").dup(workspace_fd),
        },
    )
    monkeypatch.setattr(
        authorization,
        "_BOOTSTRAP_FROZEN_MANIFEST_BYTES",
        authorization._canonical_bytes({} if manifest is None else manifest),
    )
    monkeypatch.setattr(authorization, "_BOOTSTRAP_ROOT_GUARD", True)
    monkeypatch.setattr(
        authorization,
        "_revalidate_vbd_trajectory_group_effect_marginalization_root_guard",
        lambda: None,
    )
    return lifecycle_fd, workspace_fd


def test_exported_token_and_forged_descriptors_cannot_install_root_io(
    tmp_path,
    monkeypatch,
):
    os_module = __import__("os")
    fake_lifecycle = tmp_path / "attacker-lifecycle"
    fake_workspace = tmp_path / "attacker-workspace"
    fake_lifecycle.mkdir(mode=0o700)
    fake_workspace.mkdir(mode=0o700)
    lifecycle_fd = os_module.open(fake_lifecycle, os_module.O_RDONLY)
    workspace_fd = os_module.open(fake_workspace, os_module.O_RDONLY)
    executable = "/verified/python"
    bootstrap_path = "/verified/bootstrap.py"
    manifest = {
        "command_argv": [
            executable,
            "-I",
            "-S",
            "-B",
            bootstrap_path,
            "run",
            "--execution-authorization",
            "/forged/authorization.json",
        ],
        "bootstrap_path": bootstrap_path,
    }
    monkeypatch.setattr(
        authorization,
        "VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH",
        str(fake_lifecycle),
    )
    monkeypatch.setattr(
        authorization,
        "VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH",
        str(fake_workspace),
    )
    monkeypatch.setattr(authorization, "_BOOTSTRAP_ROOT_GUARD", None)
    monkeypatch.setattr(authorization, "_BOOTSTRAP_BOUND_ROOT_FDS", None)
    monkeypatch.setattr(authorization, "_BOOTSTRAP_FROZEN_MANIFEST_BYTES", None)
    monkeypatch.setattr(authorization, "_BOOTSTRAP_CANONICAL_ROOT_CHAINS", None)
    monkeypatch.setattr(authorization.sys, "executable", executable)
    monkeypatch.setattr(authorization.sys, "_base_executable", executable)
    monkeypatch.setattr(
        authorization.sys,
        "orig_argv",
        ["framework", *manifest["command_argv"][1:]],
    )
    monkeypatch.setattr(
        authorization.sys.modules["__main__"],
        "__file__",
        bootstrap_path,
    )
    sampler_boundary = []

    def forged_launch():
        authorization._install_vbd_trajectory_group_effect_marginalization_root_guard(
            lifecycle_fd=lifecycle_fd,
            workspace_fd=workspace_fd,
            manifest_bytes=authorization._canonical_bytes(manifest),
        )
        sampler_boundary.append("reached")

    try:
        with pytest.raises(
            authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
            match="kernel process provenance differs",
        ):
            forged_launch()
        assert (
            authorization._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_CHILD_TOKEN
            is not None
        )
        assert authorization._BOOTSTRAP_BOUND_ROOT_FDS is None
        assert sampler_boundary == []
    finally:
        os_module.close(lifecycle_fd)
        os_module.close(workspace_fd)


def test_darwin_kernel_argv_parser_and_canonical_installer_positive_fixture(
    tmp_path,
    monkeypatch,
):
    os_module = __import__("os")
    lifecycle = tmp_path / "canonical-lifecycle"
    workspace = tmp_path / "canonical-workspace"
    lifecycle.mkdir(mode=0o700)
    workspace.mkdir(mode=0o700)
    executable = "/canonical/python"
    bootstrap_path = "/canonical/bootstrap.py"
    command = [
        executable,
        "-I",
        "-S",
        "-B",
        bootstrap_path,
        "run",
        "--execution-authorization",
        "/canonical/authorization.json",
    ]
    argc = len(command).to_bytes(
        authorization.ctypes.sizeof(authorization.ctypes.c_int),
        byteorder=authorization.sys.byteorder,
        signed=True,
    )
    raw = (
        argc
        + executable.encode("utf-8")
        + b"\0\0"
        + b"".join(value.encode("utf-8") + b"\0" for value in command)
    )
    assert authorization._parse_darwin_procargs2(raw) == (executable, command)
    manifest = {"command_argv": command, "bootstrap_path": bootstrap_path}
    monkeypatch.setattr(
        authorization,
        "VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH",
        str(lifecycle),
    )
    monkeypatch.setattr(
        authorization,
        "VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH",
        str(workspace),
    )
    for name in (
        "_BOOTSTRAP_ROOT_GUARD",
        "_BOOTSTRAP_BOUND_ROOT_FDS",
        "_BOOTSTRAP_FROZEN_MANIFEST_BYTES",
        "_BOOTSTRAP_CANONICAL_ROOT_CHAINS",
    ):
        monkeypatch.setattr(authorization, name, None)
    monkeypatch.setattr(
        authorization,
        "_darwin_kernel_process_provenance",
        lambda: (executable, command),
    )
    lifecycle_fd = os_module.open(lifecycle, os_module.O_RDONLY)
    workspace_fd = os_module.open(workspace, os_module.O_RDONLY)
    try:
        authorization._install_vbd_trajectory_group_effect_marginalization_root_guard(
            lifecycle_fd=lifecycle_fd,
            workspace_fd=workspace_fd,
            manifest_bytes=authorization._canonical_bytes(manifest),
        )
        authorization._revalidate_vbd_trajectory_group_effect_marginalization_root_guard()
        assert set(authorization._BOOTSTRAP_BOUND_ROOT_FDS) == {
            str(lifecycle),
            str(workspace),
        }
    finally:
        for descriptor in (
            authorization._BOOTSTRAP_BOUND_ROOT_FDS or {}
        ).values():
            os_module.close(descriptor)
        for chain_fds, _identities in (
            authorization._BOOTSTRAP_CANONICAL_ROOT_CHAINS or ()
        ):
            for descriptor in reversed(chain_fds):
                os_module.close(descriptor)
        os_module.close(lifecycle_fd)
        os_module.close(workspace_fd)


@pytest.mark.parametrize(
    ("root_name", "filename"),
    (
        ("lifecycle", "input_binding.json"),
        ("lifecycle", "completion_receipt.json"),
        ("workspace", "marginalization_diagnostic.staged.json"),
    ),
)
def test_claimed_artifact_write_rejects_name_swap_at_open(
    tmp_path,
    monkeypatch,
    root_name,
    filename,
):
    os_module = __import__("os")
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir(mode=0o700)
    workspace.mkdir(mode=0o700)
    lifecycle_fd, workspace_fd = _install_test_bound_root_io(
        monkeypatch, lifecycle, workspace
    )
    root = lifecycle if root_name == "lifecycle" else workspace
    original_open = authorization.os.open
    swapped = False

    def swap_at_open(path, flags, mode=0o777, *, dir_fd=None):
        nonlocal swapped
        descriptor = original_open(path, flags, mode, dir_fd=dir_fd)
        if path == filename and not swapped:
            swapped = True
            os_module.rename(
                filename,
                f"{filename}.detached",
                src_dir_fd=dir_fd,
                dst_dir_fd=dir_fd,
            )
            replacement = original_open(
                filename,
                os_module.O_WRONLY | os_module.O_CREAT | os_module.O_EXCL,
                0o600,
                dir_fd=dir_fd,
            )
            os_module.write(replacement, b"replacement\n")
            os_module.close(replacement)
        return descriptor

    monkeypatch.setattr(authorization.os, "open", swap_at_open)
    try:
        with pytest.raises(
            authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
            match="same-descriptor readback differs",
        ):
            authorization._write_exclusive_json(
                root / filename,
                {"artifact": filename},
                filename,
            )
        assert swapped
    finally:
        monkeypatch.setattr(authorization.os, "open", original_open)
        for descriptor in authorization._BOOTSTRAP_BOUND_ROOT_FDS.values():
            os_module.close(descriptor)
        os_module.close(lifecycle_fd)
        os_module.close(workspace_fd)


def test_persisted_validation_read_rejects_name_swap_at_open(
    tmp_path,
    monkeypatch,
):
    os_module = __import__("os")
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir(mode=0o700)
    workspace.mkdir(mode=0o700)
    filename = "marginalization_diagnostic.staged.json"
    encoded = authorization._canonical_bytes({"record": "held"})
    (workspace / filename).write_bytes(encoded)
    lifecycle_fd, workspace_fd = _install_test_bound_root_io(
        monkeypatch, lifecycle, workspace
    )
    original_open = authorization.os.open
    swapped = False

    def swap_at_open(path, flags, mode=0o777, *, dir_fd=None):
        nonlocal swapped
        descriptor = original_open(path, flags, mode, dir_fd=dir_fd)
        if path == filename and not swapped:
            swapped = True
            os_module.rename(
                filename,
                f"{filename}.detached",
                src_dir_fd=dir_fd,
                dst_dir_fd=dir_fd,
            )
            replacement = original_open(
                filename,
                os_module.O_WRONLY | os_module.O_CREAT | os_module.O_EXCL,
                0o600,
                dir_fd=dir_fd,
            )
            os_module.write(replacement, encoded)
            os_module.close(replacement)
        return descriptor

    monkeypatch.setattr(authorization.os, "open", swap_at_open)
    try:
        with pytest.raises(
            authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
            match="binding changed",
        ):
            authorization._read_canonical_json(
                workspace / filename,
                "marginalization persisted output",
            )
        assert swapped
    finally:
        monkeypatch.setattr(authorization.os, "open", original_open)
        for descriptor in authorization._BOOTSTRAP_BOUND_ROOT_FDS.values():
            os_module.close(descriptor)
        os_module.close(lifecycle_fd)
        os_module.close(workspace_fd)


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
        reviewed_sources=None,
    ):
        calls.append((path.name, allow_pending_alias))
        if fail_pending_validation and allow_pending_alias:
            raise bootstrap.BootstrapError("pending output invalid")

    monkeypatch.setattr(bootstrap, "_validate_persisted", validate)
    if fail_pending_validation:
        with pytest.raises(bootstrap.BootstrapError):
            bootstrap._publish({}, "a" * 40, tmp_path, {})
        assert tuple(path.name for path in workspace.iterdir()) == (
            bootstrap._STAGED_NAME,
        )
        assert staged.stat().st_nlink == 1
    else:
        bootstrap._publish({}, "a" * 40, tmp_path, {})
        final = workspace / bootstrap._OUTPUT_NAME
        assert final.read_bytes() == b"{}\n"
        assert final.stat().st_nlink == 1
        assert not staged.exists()
    assert calls[:2] == [
        (bootstrap._STAGED_NAME, False),
        (bootstrap._OUTPUT_NAME, True),
    ]


def test_publication_rejects_workspace_directory_name_replacement_during_validation(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    moved = tmp_path / "opened-workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    replaced = False

    def replace_workspace(
        _manifest,
        _commit,
        path,
        _repo,
        *,
        allow_pending_alias=False,
        reviewed_sources=None,
    ):
        nonlocal replaced
        if path.name == bootstrap._STAGED_NAME and not replaced:
            replaced = True
            workspace.rename(moved)
            workspace.mkdir(mode=0o700)
            replacement = workspace / bootstrap._STAGED_NAME
            replacement.write_bytes(b"{}\n")
            replacement.chmod(0o600)

    monkeypatch.setattr(bootstrap, "_validate_persisted", replace_workspace)
    with pytest.raises(bootstrap.BootstrapError, match="directory name binding differs"):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert replaced
    assert not (moved / bootstrap._OUTPUT_NAME).exists()
    assert not (workspace / bootstrap._OUTPUT_NAME).exists()


def test_directory_binding_rejects_absolute_ancestor_replacement(tmp_path):
    bootstrap = _load_bootstrap()
    fixed_parent = tmp_path / "fixed-parent"
    fixed_parent.mkdir()
    workspace = fixed_parent / "workspace"
    workspace.mkdir(mode=0o700)
    binding = bootstrap._DirectoryBinding(workspace)
    detached = tmp_path / "detached-parent"
    try:
        fixed_parent.rename(detached)
        fixed_parent.mkdir()
        (fixed_parent / "workspace").mkdir(mode=0o700)
        with pytest.raises(
            bootstrap.BootstrapError,
            match="directory name binding differs",
        ):
            binding.revalidate()
    finally:
        binding.close()


def test_publication_rejects_workspace_ancestor_replacement_before_link(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    fixed_parent = tmp_path / "fixed-parent"
    fixed_parent.mkdir()
    workspace = fixed_parent / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    detached = tmp_path / "detached-parent"
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)

    def replace_ancestor(*_args, **_kwargs):
        fixed_parent.rename(detached)
        fixed_parent.mkdir()
        replacement = fixed_parent / "workspace"
        replacement.mkdir(mode=0o700)
        replacement_staged = replacement / bootstrap._STAGED_NAME
        replacement_staged.write_bytes(b"{}\n")
        replacement_staged.chmod(0o600)

    monkeypatch.setattr(bootstrap, "_validate_persisted", replace_ancestor)
    with pytest.raises(
        bootstrap.BootstrapError,
        match="directory name binding differs",
    ):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert not (detached / "workspace" / bootstrap._OUTPUT_NAME).exists()
    assert not (fixed_parent / "workspace" / bootstrap._OUTPUT_NAME).exists()


def test_publication_rolls_back_final_when_post_unlink_enumeration_fails(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    monkeypatch.setattr(bootstrap, "_validate_persisted", lambda *_args, **_kwargs: None)
    original_binding_names = bootstrap._DirectoryBinding.names

    def fail_after_unlink(binding):
        if (
            binding.path == workspace
            and (workspace / bootstrap._OUTPUT_NAME).exists()
            and not staged.exists()
        ):
            raise bootstrap.BootstrapError("post-unlink enumeration failed")
        return original_binding_names(binding)

    monkeypatch.setattr(bootstrap._DirectoryBinding, "names", fail_after_unlink)
    with pytest.raises(bootstrap.BootstrapError, match="enumeration failed"):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert not (workspace / bootstrap._OUTPUT_NAME).exists()


def test_publication_rolls_back_final_when_final_semantic_validation_fails(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)

    def validate(
        _manifest,
        _commit,
        path,
        _repo,
        *,
        allow_pending_alias=False,
        reviewed_sources=None,
    ):
        if path.name == bootstrap._OUTPUT_NAME and not allow_pending_alias:
            raise bootstrap.BootstrapError("final semantic validation failed")

    monkeypatch.setattr(bootstrap, "_validate_persisted", validate)
    with pytest.raises(bootstrap.BootstrapError, match="semantic validation failed"):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert not (workspace / bootstrap._OUTPUT_NAME).exists()


def test_publication_preserves_rejecting_alias_when_rollback_unlink_fails(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    final = workspace / bootstrap._OUTPUT_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)

    def reject_final(
        _manifest,
        _commit,
        path,
        _repo,
        *,
        allow_pending_alias=False,
        reviewed_sources=None,
    ):
        if path == final and not allow_pending_alias:
            raise bootstrap.BootstrapError("final semantic validation failed")

    real_unlink = bootstrap.os.unlink

    def reject_rollback_unlink(path, *args, **kwargs):
        if path == bootstrap._OUTPUT_NAME:
            raise OSError("injected rollback unlink failure")
        return real_unlink(path, *args, **kwargs)

    monkeypatch.setattr(bootstrap, "_validate_persisted", reject_final)
    monkeypatch.setattr(bootstrap.os, "unlink", reject_rollback_unlink)
    with pytest.raises(bootstrap.BootstrapError, match="rollback could not be confirmed"):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    staged_info = staged.stat()
    final_info = final.stat()
    assert (staged_info.st_dev, staged_info.st_ino) == (
        final_info.st_dev,
        final_info.st_ino,
    )
    assert staged_info.st_nlink == final_info.st_nlink == 2


def test_publication_removes_final_when_second_link_rollback_restore_fails(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    final = workspace / bootstrap._OUTPUT_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)

    def reject_final(
        _manifest,
        _commit,
        path,
        _repo,
        *,
        allow_pending_alias=False,
        reviewed_sources=None,
    ):
        if path == final and not allow_pending_alias:
            raise bootstrap.BootstrapError("final semantic validation failed")

    original_link = bootstrap.os.link
    link_calls = 0

    def reject_second_link(*args, **kwargs):
        nonlocal link_calls
        link_calls += 1
        if link_calls == 2:
            raise OSError("injected staged alias restoration failure")
        return original_link(*args, **kwargs)

    monkeypatch.setattr(bootstrap, "_validate_persisted", reject_final)
    monkeypatch.setattr(bootstrap.os, "link", reject_second_link)
    with pytest.raises(bootstrap.BootstrapError, match="semantic validation failed"):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert link_calls == 2
    assert not staged.exists()
    assert not final.exists()
    assert tuple(workspace.iterdir()) == ()


def test_publication_marks_invalid_when_alias_restore_and_final_removal_fail(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    final = workspace / bootstrap._OUTPUT_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)

    def reject_final(
        _manifest,
        _commit,
        path,
        _repo,
        *,
        allow_pending_alias=False,
        reviewed_sources=None,
    ):
        if path == final and not allow_pending_alias:
            raise bootstrap.BootstrapError("final semantic validation failed")

    original_link = bootstrap.os.link
    original_unlink = bootstrap.os.unlink
    link_calls = 0

    def reject_alias_restore(*args, **kwargs):
        nonlocal link_calls
        link_calls += 1
        if link_calls == 2:
            raise OSError("injected staged alias restoration failure")
        return original_link(*args, **kwargs)

    def reject_final_removal(path, *args, **kwargs):
        if path == bootstrap._OUTPUT_NAME:
            raise OSError("injected final removal failure")
        return original_unlink(path, *args, **kwargs)

    monkeypatch.setattr(bootstrap, "_validate_persisted", reject_final)
    monkeypatch.setattr(bootstrap.os, "link", reject_alias_restore)
    monkeypatch.setattr(bootstrap.os, "unlink", reject_final_removal)
    with pytest.raises(
        bootstrap.BootstrapError,
        match="fallback rollback could not be confirmed",
    ):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert final.exists()
    assert staged.read_bytes() == b"ROLLBACK_UNCONFIRMED\n"
    assert staged.stat().st_ino != final.stat().st_ino


def test_publication_removes_final_when_rollback_alias_fsync_fails(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    final = workspace / bootstrap._OUTPUT_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    rollback_started = False

    def reject_final(
        _manifest,
        _commit,
        path,
        _repo,
        *,
        allow_pending_alias=False,
        reviewed_sources=None,
    ):
        nonlocal rollback_started
        if path == final and not allow_pending_alias:
            rollback_started = True
            raise bootstrap.BootstrapError("final semantic validation failed")

    real_fsync = bootstrap.os.fsync

    def reject_rollback_fsync(descriptor):
        if rollback_started and staged.exists() and final.exists():
            raise OSError("injected rollback fsync failure")
        return real_fsync(descriptor)

    monkeypatch.setattr(bootstrap, "_validate_persisted", reject_final)
    monkeypatch.setattr(bootstrap.os, "fsync", reject_rollback_fsync)
    with pytest.raises(bootstrap.BootstrapError, match="semantic validation failed"):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert staged.stat().st_nlink == 1
    assert not final.exists()


def test_rollback_rejects_mismatched_staged_identity(tmp_path):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    final = workspace / bootstrap._OUTPUT_NAME
    staged.write_bytes(b"staged\n")
    final.write_bytes(b"final\n")
    final_info = final.stat()
    root_fd = bootstrap._open_directory(workspace)
    try:
        bootstrap._rollback_final(
            root_fd,
            (final_info.st_dev, final_info.st_ino),
        )
    finally:
        bootstrap.os.close(root_fd)
    assert staged.exists()
    assert not final.exists()


def test_publication_handles_real_termination_through_rollback_in_post_unlink_window(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    monkeypatch.setattr(bootstrap, "_validate_persisted", lambda *_args, **_kwargs: None)
    original_binding_names = bootstrap._DirectoryBinding.names

    def terminate_after_unlink(binding):
        if (
            binding.path == workspace
            and (workspace / bootstrap._OUTPUT_NAME).exists()
            and not staged.exists()
        ):
            current_mask = bootstrap.signal.pthread_sigmask(
                bootstrap.signal.SIG_BLOCK,
                (),
            )
            assert bootstrap.signal.SIGTERM in current_mask
            assert all(
                bootstrap.signal.getsignal(signum)
                is bootstrap._raise_supervisor_termination
                for signum in bootstrap._TERMINATION_SIGNALS
            )
            bootstrap.os.kill(bootstrap.os.getpid(), bootstrap.signal.SIGTERM)
        return original_binding_names(binding)

    monkeypatch.setattr(bootstrap._DirectoryBinding, "names", terminate_after_unlink)
    with pytest.raises(bootstrap.BootstrapError, match="interrupted by signal"):
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    assert not (workspace / bootstrap._OUTPUT_NAME).exists()


def test_publication_delivers_real_post_commit_signal_to_previous_handler(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / bootstrap._STAGED_NAME
    final = workspace / bootstrap._OUTPUT_NAME
    staged.write_bytes(b"{}\n")
    staged.chmod(0o600)
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    monkeypatch.setattr(bootstrap, "_validate_persisted", lambda *_args, **_kwargs: None)
    received = []

    def previous_handler(signum, _frame):
        received.append(signum)

    original_handler = bootstrap.signal.getsignal(bootstrap.signal.SIGTERM)
    bootstrap.signal.signal(bootstrap.signal.SIGTERM, previous_handler)
    original_sigmask = bootstrap.signal.pthread_sigmask
    sent = False
    block_calls = 0

    def signal_after_commit(how, mask):
        nonlocal block_calls, sent
        result = original_sigmask(how, mask)
        if how == bootstrap.signal.SIG_BLOCK:
            block_calls += 1
        if block_calls == 3 and not sent:
            sent = True
            bootstrap.os.kill(bootstrap.os.getpid(), bootstrap.signal.SIGTERM)
        return result

    monkeypatch.setattr(bootstrap.signal, "pthread_sigmask", signal_after_commit)
    try:
        bootstrap._publish({}, "a" * 40, tmp_path, {})
    finally:
        bootstrap.signal.signal(bootstrap.signal.SIGTERM, original_handler)
    assert sent
    assert received == [bootstrap.signal.SIGTERM]
    assert final.exists()
    assert final.stat().st_nlink == 1


def test_persisted_output_rejects_name_rebinding_during_semantic_validation(
    tmp_path,
    monkeypatch,
):
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    staged = workspace / authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STAGED_OUTPUT_FILENAME
    encoded = authorization._canonical_bytes({"execution_state": "COMPLETE"})
    staged.write_bytes(encoded)
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(workspace / "marginalization_diagnostic.json"),
    }
    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_authorization_manifest",
        lambda value: value,
    )
    monkeypatch.setattr(
        authorization,
        "preflight_vbd_trajectory_group_effect_marginalization_fixed_roots",
        lambda **_kwargs: None,
    )

    def replace_name(value, **_kwargs):
        staged.rename(workspace / "opened-staged.json")
        staged.write_bytes(encoded)
        return value

    monkeypatch.setattr(
        authorization,
        "_validate_vbd_trajectory_group_effect_marginalization_persisted_record",
        replace_name,
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="binding changed",
    ):
        authorization.validate_vbd_trajectory_group_effect_marginalization_persisted_output(
            staged,
            manifest=manifest,
            authorization_commit="a" * 40,
        )


@pytest.mark.parametrize(
    "reader_kind",
    ("execution_authorization", "claim", "input_binding", "completion_receipt"),
)
def test_lifecycle_readers_reject_name_rebinding_during_validation(
    tmp_path,
    monkeypatch,
    reader_kind,
):
    path = tmp_path / f"{reader_kind}.json"
    value = {"record": reader_kind}
    encoded = authorization._canonical_bytes(value)
    path.write_bytes(encoded)
    manifest = {
        "execution_authorization_record_path": str(path),
        "claim_path": str(path),
        "input_binding_path": str(path),
        "completion_receipt_path": str(path),
    }

    def replace_name(candidate, **_kwargs):
        path.rename(tmp_path / f"opened-{reader_kind}.json")
        path.write_bytes(encoded)
        return candidate

    if reader_kind == "execution_authorization":
        monkeypatch.setattr(
            authorization,
            "validate_vbd_trajectory_group_effect_marginalization_execution_authorization",
            replace_name,
        )
        invoke = lambda: authorization.read_vbd_trajectory_group_effect_marginalization_execution_authorization(
            path,
            manifest=manifest,
            authorization_commit="a" * 40,
        )
    elif reader_kind == "claim":
        monkeypatch.setattr(
            authorization,
            "validate_vbd_trajectory_group_effect_marginalization_claim",
            replace_name,
        )
        invoke = lambda: authorization.read_vbd_trajectory_group_effect_marginalization_claim(
            manifest=manifest,
            execution_authorization={},
            authorization_commit="a" * 40,
        )
    elif reader_kind == "input_binding":
        monkeypatch.setattr(
            authorization,
            "validate_vbd_trajectory_group_effect_marginalization_input_binding",
            replace_name,
        )
        invoke = lambda: authorization.read_vbd_trajectory_group_effect_marginalization_input_binding(
            manifest=manifest,
            claim={},
        )
    else:
        monkeypatch.setattr(
            authorization,
            "validate_vbd_trajectory_group_effect_marginalization_completion_receipt",
            replace_name,
        )
        invoke = lambda: authorization.read_vbd_trajectory_group_effect_marginalization_completion_receipt(
            manifest=manifest,
            claim={},
            input_binding={},
            fit_records=[],
        )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="binding changed",
    ):
        invoke()


def test_committed_publication_succeeds_when_stdout_is_closed(tmp_path, monkeypatch):
    bootstrap = _load_bootstrap()
    workspace = tmp_path / "workspace"
    workspace.mkdir(mode=0o700)
    output = workspace / bootstrap._OUTPUT_NAME
    monkeypatch.setattr(bootstrap, "_WORKSPACE", workspace)
    monkeypatch.setattr(bootstrap, "_validate_environment", lambda: None)
    monkeypatch.setattr(
        bootstrap,
        "_read_json",
        lambda *_args: ({}, SimpleNamespace(st_nlink=1)),
    )
    monkeypatch.setattr(
        bootstrap,
        "_validate_manifest",
        lambda *_args: (Path("/usr/bin/git"), "a" * 40),
    )
    monkeypatch.setattr(bootstrap, "_validate_actual_command", lambda *_args: None)
    fake_lifecycle_binding = SimpleNamespace(
        revalidate=lambda: None,
        close=lambda: None,
    )
    fake_workspace_binding = SimpleNamespace(
        revalidate=lambda: None,
        close=lambda: None,
    )
    monkeypatch.setattr(
        bootstrap,
        "_validate_launch_records",
        lambda *_args: ({}, {}, SimpleNamespace(), fake_lifecycle_binding),
    )
    monkeypatch.setattr(
        bootstrap,
        "_freeze_reviewed_first_party_sources",
        lambda *_args: {},
    )
    monkeypatch.setattr(bootstrap, "_consume_permit_and_claim", lambda *_args: None)
    monkeypatch.setattr(
        bootstrap,
        "_create_directory_binding",
        lambda *_args: fake_workspace_binding,
    )
    monkeypatch.setattr(bootstrap, "_run_claimed_child", lambda *_args: None)
    monkeypatch.setattr(
        bootstrap,
        "_install_parent_candidate_root_io",
        lambda *_args: None,
    )

    def publish(*_args):
        output.write_bytes(b"{}\n")

    def closed_stdout(descriptor, _payload):
        assert descriptor == 1
        raise OSError("stdout is closed")

    monkeypatch.setattr(bootstrap, "_publish", publish)
    monkeypatch.setattr(bootstrap.os, "write", closed_stdout)
    assert bootstrap._run(tmp_path / "execution_authorization.json") == 0
    assert output.read_bytes() == b"{}\n"


@pytest.mark.parametrize("shadow_kind", ("timestamp_pyc", "extension"))
def test_bootstrap_rejects_first_party_import_shadow_before_consumption(
    tmp_path,
    monkeypatch,
    shadow_kind,
):
    bootstrap = _load_bootstrap()
    repo = tmp_path / "repo"
    script = repo / "inference/scripts/vbd_trajectory_group_effect_marginalization_bootstrap.py"
    script.parent.mkdir(parents=True)
    script.write_text("# bootstrap placeholder\n", encoding="utf-8")
    source = repo / "inference/src/fluencytracr_inference/hashing.py"
    source.parent.mkdir(parents=True)
    source.write_text("SOURCE_ONLY_SENTINEL = True\n", encoding="utf-8")
    package_source = source.parent / "__init__.py"
    package_source.write_text("# reviewed package\n", encoding="utf-8")
    if shadow_kind == "timestamp_pyc":
        pycache = source.parent / "__pycache__"
        pycache.mkdir()
        py_compile.compile(
            str(source),
            cfile=str(pycache / "hashing.cpython-313.pyc"),
            doraise=True,
        )
    else:
        source.with_name(
            source.stem + importlib.machinery.EXTENSION_SUFFIXES[0]
        ).write_bytes(b"extension shadow")
    source_hash = bootstrap._hash_bytes(source.read_bytes())
    manifest = {
        "in_scope_files": [
            {
                "path": "inference/src/fluencytracr_inference/__init__.py",
                "sha256": bootstrap._hash_bytes(package_source.read_bytes()),
            },
            {
                "path": "inference/src/fluencytracr_inference/hashing.py",
                "sha256": source_hash,
            }
        ]
    }
    permit_info = SimpleNamespace(st_dev=1, st_ino=2)
    calls = []
    monkeypatch.setattr(bootstrap, "__file__", str(script))
    monkeypatch.setattr(
        bootstrap,
        "_read_json",
        lambda *_args: (manifest, SimpleNamespace(st_nlink=1)),
    )
    monkeypatch.setattr(
        bootstrap,
        "_validate_manifest",
        lambda *_args: (Path("/usr/bin/git"), "a" * 40),
    )
    monkeypatch.setattr(bootstrap, "_validate_environment", lambda: None)
    monkeypatch.setattr(bootstrap, "_validate_actual_command", lambda _manifest: None)
    monkeypatch.setattr(
        bootstrap,
        "_validate_launch_records",
        lambda *_args: (
            {},
            {},
            permit_info,
            SimpleNamespace(close=lambda: None),
        ),
    )
    monkeypatch.setattr(
        bootstrap,
        "_consume_permit_and_claim",
        lambda *_args: calls.append("claim"),
    )
    monkeypatch.setattr(
        bootstrap,
        "_run_claimed_child",
        lambda *_args: calls.append("child_import"),
    )
    monkeypatch.setattr(
        bootstrap,
        "_publish",
        lambda *_args: calls.append("publication_import"),
    )
    with pytest.raises(bootstrap.BootstrapError, match="alternate first-party import"):
        bootstrap._run(Path("/fixed/authorization.json"))
    assert calls == []


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
            {},
            Path("/fixed/authorization.json"),
            "a" * 40,
            Path("/fixed/repo"),
            {},
        )
    assert terminated == [4242]


def test_supervisor_rejects_lifecycle_ancestor_replacement_at_child_boundary(
    tmp_path,
    monkeypatch,
):
    bootstrap = _load_bootstrap()
    lifecycle_parent = tmp_path / "lifecycle-parent"
    lifecycle_parent.mkdir()
    lifecycle = lifecycle_parent / "lifecycle"
    lifecycle.mkdir(mode=0o700)
    workspace_parent = tmp_path / "workspace-parent"
    workspace_parent.mkdir()
    workspace = workspace_parent / "workspace"
    workspace.mkdir(mode=0o700)
    lifecycle_binding = bootstrap._DirectoryBinding(lifecycle)
    workspace_binding = bootstrap._DirectoryBinding(workspace)
    detached = tmp_path / "detached-lifecycle-parent"
    monkeypatch.setattr(bootstrap.os, "fork", lambda: 4242)

    def replace_before_child_return(_child_pid):
        lifecycle_parent.rename(detached)
        lifecycle_parent.mkdir()
        (lifecycle_parent / "lifecycle").mkdir(mode=0o700)

    monkeypatch.setattr(bootstrap, "_wait_for_child", replace_before_child_return)
    try:
        with pytest.raises(
            bootstrap.BootstrapError,
            match="directory name binding differs",
        ):
            bootstrap._run_claimed_child(
                {},
                Path("/fixed/authorization.json"),
                "a" * 40,
                Path("/fixed/repo"),
                {},
                lifecycle_binding,
                workspace_binding,
            )
    finally:
        lifecycle_binding.close()
        workspace_binding.close()


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


def test_fixed_root_leaf_creation_fsyncs_parent_directory(tmp_path, monkeypatch):
    leaf = tmp_path / "new-fixed-root"
    fsync_calls = []
    monkeypatch.setattr(authorization.os, "fsync", fsync_calls.append)
    descriptor = authorization._open_absolute_directory_no_symlinks(
        leaf,
        create_leaf=True,
    )
    authorization.os.close(descriptor)
    assert leaf.is_dir()
    assert len(fsync_calls) == 1


def test_fixed_root_leaf_creation_fails_closed_when_parent_fsync_fails(
    tmp_path,
    monkeypatch,
):
    leaf = tmp_path / "new-fixed-root"

    def reject_fsync(_descriptor):
        raise OSError("injected parent directory fsync failure")

    monkeypatch.setattr(authorization.os, "fsync", reject_fsync)
    with pytest.raises(OSError, match="parent directory fsync failure"):
        authorization._open_absolute_directory_no_symlinks(
            leaf,
            create_leaf=True,
        )
    assert leaf.is_dir()


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


def test_claimed_child_root_replacement_rejects_before_sampler(monkeypatch):
    def reject_rebound_root():
        raise authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError(
            "fixed-root directory name binding differs"
        )

    monkeypatch.setattr(
        authorization,
        "_BOOTSTRAP_ROOT_GUARD",
        True,
    )
    monkeypatch.setattr(
        authorization,
        "_revalidate_vbd_trajectory_group_effect_marginalization_root_guard",
        reject_rebound_root,
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError,
        match="directory name binding differs",
    ):
        authorization.bootstrap_claimed_vbd_trajectory_group_effect_marginalization(
            manifest={},
            authorization_path=Path("/fixed/authorization.json"),
            authorization_commit="a" * 40,
            command_argv=[],
            _bootstrap_token=(
                authorization._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_CHILD_TOKEN
            ),
        )


def test_bound_child_verifies_frozen_manifest_and_reaches_sampler_boundary(
    tmp_path,
    monkeypatch,
):
    lifecycle = tmp_path / "lifecycle"
    workspace = tmp_path / "workspace"
    lifecycle.mkdir(mode=0o700)
    workspace.mkdir(mode=0o700)
    authorization_commit = "a" * 40
    implementation_commit = "b" * 40
    implementation_tree = "c" * 40
    manifest = {
        "implementation_commit": implementation_commit,
        "implementation_tree": implementation_tree,
        "command_argv": ["frozen-command"],
    }
    lifecycle_fd, workspace_fd = _install_test_bound_root_io(
        monkeypatch,
        lifecycle,
        workspace,
        manifest=manifest,
    )
    frozen = authorization._canonical_bytes(manifest)
    object_id = authorization.hashlib.sha1(
        f"blob {len(frozen)}\0".encode("ascii") + frozen
    ).hexdigest()
    reached = []

    def git_output(*args):
        if args == ("status", "--porcelain=v1", "--untracked-files=all"):
            return ""
        if args == ("rev-parse", "HEAD"):
            return authorization_commit
        if args[:4] == ("rev-list", "--parents", "-n", "1"):
            return f"{authorization_commit} {implementation_commit}"
        if args[:4] == (
            "diff-tree",
            "--no-commit-id",
            "--name-only",
            "-r",
        ):
            return authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_RELATIVE_PATH
        if args == ("rev-parse", f"{implementation_commit}^{{tree}}"):
            return implementation_tree
        if args == ("rev-parse", "--show-object-format"):
            return "sha1"
        if args == (
            "rev-parse",
            f"{authorization_commit}:{authorization.VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_RELATIVE_PATH}",
        ):
            return object_id
        raise AssertionError(f"unexpected Git call: {args!r}")

    monkeypatch.setattr(
        authorization,
        "validate_vbd_trajectory_group_effect_marginalization_authorization_manifest",
        lambda value: value,
    )
    monkeypatch.setattr(
        authorization,
        "preflight_vbd_trajectory_group_effect_marginalization_fixed_roots",
        lambda **_kwargs: None,
    )
    monkeypatch.setattr(authorization, "_git_output", git_output)
    monkeypatch.setattr(
        authorization,
        "read_vbd_trajectory_group_effect_marginalization_execution_authorization",
        lambda *_args, **_kwargs: {"authorization_commit": authorization_commit},
    )
    monkeypatch.setattr(
        authorization,
        "read_vbd_trajectory_group_effect_marginalization_consumed_permit",
        lambda **_kwargs: {},
    )
    monkeypatch.setattr(
        authorization,
        "read_vbd_trajectory_group_effect_marginalization_claim",
        lambda **_kwargs: {},
    )

    def sampler_boundary(**_kwargs):
        reached.append("sampler-boundary")
        raise RuntimeError("sampler boundary sentinel")

    monkeypatch.setattr(
        execution,
        "execute_authorized_vbd_trajectory_group_effect_marginalization",
        sampler_boundary,
    )
    try:
        with pytest.raises(RuntimeError, match="sampler boundary sentinel"):
            authorization.bootstrap_claimed_vbd_trajectory_group_effect_marginalization(
                manifest=manifest,
                authorization_path=lifecycle / "execution_authorization.json",
                authorization_commit=authorization_commit,
                command_argv=manifest["command_argv"],
                _bootstrap_token=(
                    authorization._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_CHILD_TOKEN
                ),
            )
        assert reached == ["sampler-boundary"]
    finally:
        for descriptor in authorization._BOOTSTRAP_BOUND_ROOT_FDS.values():
            __import__("os").close(descriptor)
        __import__("os").close(lifecycle_fd)
        __import__("os").close(workspace_fd)

def test_exported_execution_token_cannot_bypass_live_claimed_preflight(
    valid_manifest,
    monkeypatch,
):
    forged_authorization = {"authorization_commit": "a" * 40}
    forged_claim = {"state": "CONSUMED_BEFORE_EXECUTION"}
    monkeypatch.setattr(
        execution,
        "validate_vbd_trajectory_group_effect_marginalization_authorization_manifest",
        lambda value: value,
    )
    monkeypatch.setattr(
        execution,
        "validate_vbd_trajectory_group_effect_marginalization_execution_authorization",
        lambda value, **_kwargs: value,
    )
    monkeypatch.setattr(
        execution,
        "validate_vbd_trajectory_group_effect_marginalization_claim",
        lambda value, **_kwargs: value,
    )
    with pytest.raises(
        authorization.VbdTrajectoryGroupEffectMarginalizationAuthorizationError
    ):
        execution.execute_authorized_vbd_trajectory_group_effect_marginalization(
            manifest=valid_manifest,
            execution_authorization=forged_authorization,
            claim=forged_claim,
            _execution_token=(
                authorization._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_TOKEN
            ),
        )
