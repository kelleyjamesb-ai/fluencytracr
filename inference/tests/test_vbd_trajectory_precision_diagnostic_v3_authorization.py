from copy import deepcopy
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import time

import pytest

import fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_authorization as authorization_module
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_precision_diagnostic import (
    vbd_trajectory_precision_diagnostic_v3_plan,
    vbd_trajectory_precision_diagnostic_v3_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_WORKSPACE_PATH,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_v3_authorization import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_AUTHORIZATION_MANIFEST_RELATIVE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_AUTHORIZATION_MANIFEST_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_AUTHORIZATION_SCOPE,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_BOOTSTRAP_RELATIVE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_EXECUTION_AUTHORIZATION_SCHEMA_VERSION,
    VbdTrajectoryPrecisionDiagnosticV3AuthorizationError,
    preflight_vbd_precision_diagnostic_v3_fixed_roots,
    validate_vbd_precision_diagnostic_v3_claim,
    validate_vbd_precision_diagnostic_v3_authorization_manifest,
    validate_vbd_precision_diagnostic_v3_execution_authorization,
    validate_vbd_precision_diagnostic_v3_input_binding,
    verify_vbd_precision_diagnostic_v3_authorization_commit,
)
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    _RUNNER_SOURCE_PATHS,
    _repo_root,
)


def _sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _manifest(tmp_path: Path):
    implementation = "1" * 40
    workspace = Path(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_WORKSPACE_PATH)
    claim_root = Path(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CLAIM_ROOT_PATH)
    checkpoint_root = Path(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_ROOT_PATH)
    authorization_path = claim_root / "execution_authorization.json"
    output = workspace / "diagnostic.json"
    bootstrap = (
        _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_BOOTSTRAP_RELATIVE_PATH
    ).resolve()
    git_path = Path(subprocess.check_output(["which", "git"], text=True).strip()).resolve()
    command = [
        os.path.realpath(sys.executable),
        "-I",
        "-S",
        "-B",
        str(bootstrap),
        "run",
        "--execution-authorization",
        str(authorization_path),
    ]
    files = [
        {"path": path, "sha256": sha256_json(["test", path])}
        for path in sorted(_RUNNER_SOURCE_PATHS)
    ]
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_AUTHORIZATION_MANIFEST_SCHEMA_VERSION,
        "implementation_commit": implementation,
        "implementation_tree": "2" * 40,
        "in_scope_files": files,
        "in_scope_files_hash": sha256_json(files),
        "implementation_review_refs": {
            "CODE": f"review:code/go/{implementation}/code",
            "BUG": f"review:bug/go/{implementation}/bug",
            "ADVERSARIAL": f"review:adversarial/go/{implementation}/adversarial",
            "STATISTICAL_METHODOLOGY": (
                f"review:statistical-methodology/go/{implementation}/stats"
            ),
        },
        "runtime_identity_hash": "3" * 64,
        "requirements_lock_hash": "4" * 64,
        "implementation_hash": "5" * 64,
        "native_library_manifest_hash": "6" * 64,
        "model_manifest_hash": "7" * 64,
        "diagnostic_plan_hash": vbd_trajectory_precision_diagnostic_v3_plan()[
            "diagnostic_plan_hash"
        ],
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_v3_seed_manifest()[
            "seed_manifest_hash"
        ],
        "bootstrap_path": str(bootstrap),
        "bootstrap_sha256": _sha_file(bootstrap),
        "git_executable_path": str(git_path),
        "git_executable_sha256": _sha_file(git_path),
        "site_package_paths": [str(tmp_path / "site-packages")],
        "canonical_workspace_path": str(workspace),
        "canonical_workspace_identity_hash": sha256_json(str(workspace)),
        "external_claim_root_path": str(claim_root),
        "external_claim_root_identity_hash": sha256_json(str(claim_root)),
        "checkpoint_root_path": str(checkpoint_root),
        "checkpoint_root_identity_hash": sha256_json(str(checkpoint_root)),
        "execution_authorization_record_path": str(authorization_path),
        "execution_authorization_record_path_hash": sha256_json(
            str(authorization_path)
        ),
        "output_path": str(output),
        "output_path_hash": sha256_json(str(output)),
        "command_argv": command,
        "command_hash": sha256_json(command),
        "execution_state": "NOT_RUN",
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_2_6_complete": False,
        "task_5_6_complete": False,
    }
    return {**body, "manifest_hash": sha256_json(body)}


def _execution_authorization(manifest, authorization_commit="8" * 40):
    body = {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_EXECUTION_AUTHORIZATION_SCHEMA_VERSION,
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_AUTHORIZATION_SCOPE,
        "authorizing_decision_ref": "human-authorization:vbd-mcse-diagnostic/test",
        "decision_text_hash": "9" * 64,
        "authorized_at_utc": "2026-07-17T12:00:00Z",
        "maximum_launch_count": 1,
        "canonical_workspace_identity": manifest[
            "canonical_workspace_identity_hash"
        ],
        "external_claim_root_identity": manifest[
            "external_claim_root_identity_hash"
        ],
        "checkpoint_root_identity": manifest["checkpoint_root_identity_hash"],
        "command_hash": manifest["command_hash"],
    }
    return {**body, "execution_authorization_hash": sha256_json(body)}


def test_manifest_and_human_authorization_are_strict(tmp_path):
    manifest = _manifest(tmp_path)
    authorization = _execution_authorization(manifest)
    assert validate_vbd_precision_diagnostic_v3_authorization_manifest(manifest) == manifest
    assert (
        validate_vbd_precision_diagnostic_v3_execution_authorization(
            authorization,
            manifest=manifest,
            authorization_commit="8" * 40,
        )
        == authorization
    )
    for field, replacement in (
        ("maximum_launch_count", True),
        ("scope", "another-scope"),
        ("command_hash", "a" * 64),
        ("authorized_at_utc", "2026-02-30T12:00:00Z"),
    ):
        forged = deepcopy(authorization)
        forged[field] = replacement
        body = {
            key: value
            for key, value in forged.items()
            if key != "execution_authorization_hash"
        }
        forged["execution_authorization_hash"] = sha256_json(body)
        with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
            validate_vbd_precision_diagnostic_v3_execution_authorization(
                forged,
                manifest=manifest,
                authorization_commit="8" * 40,
            )

    consumed_manifest = deepcopy(manifest)
    consumed_manifest["implementation_commit"] = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
    )
    body = {
        key: value
        for key, value in consumed_manifest.items()
        if key != "manifest_hash"
    }
    consumed_manifest["manifest_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        validate_vbd_precision_diagnostic_v3_authorization_manifest(
            consumed_manifest
        )

    consumed_authorization = _execution_authorization(
        manifest,
        authorization_commit=(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT
        ),
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        validate_vbd_precision_diagnostic_v3_execution_authorization(
            consumed_authorization,
            manifest=manifest,
            authorization_commit=(
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT
            ),
        )

    consumed_manifest = deepcopy(manifest)
    consumed_manifest["implementation_commit"] = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT
    )
    body = {
        key: value
        for key, value in consumed_manifest.items()
        if key != "manifest_hash"
    }
    consumed_manifest["manifest_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        validate_vbd_precision_diagnostic_v3_authorization_manifest(
            consumed_manifest
        )

    consumed_authorization = _execution_authorization(
        manifest,
        authorization_commit=(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT
        ),
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        validate_vbd_precision_diagnostic_v3_execution_authorization(
            consumed_authorization,
            manifest=manifest,
            authorization_commit=(
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT
            ),
        )


def test_claim_validation_is_strict_without_consuming_the_future_claim(tmp_path):
    manifest = _manifest(tmp_path)
    authorization = _execution_authorization(manifest)
    body = authorization_module._vbd_precision_diagnostic_v3_claim_body(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit="8" * 40,
    )
    first = {**body, "claim_hash": sha256_json(body)}
    assert (
        validate_vbd_precision_diagnostic_v3_claim(
            first,
            manifest=manifest,
            execution_authorization=authorization,
            authorization_commit="8" * 40,
        )
        == first
    )
    assert first["state"] == "CONSUMED_BEFORE_EXECUTION"
    forged = deepcopy(first)
    forged["command_hash"] = "f" * 64
    forged_body = {
        key: value for key, value in forged.items() if key != "claim_hash"
    }
    forged["claim_hash"] = sha256_json(forged_body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        validate_vbd_precision_diagnostic_v3_claim(
            forged,
            manifest=manifest,
            execution_authorization=authorization,
            authorization_commit="8" * 40,
        )


def test_manifest_rejects_alternate_workspace_even_after_rehash(tmp_path):
    manifest = _manifest(tmp_path)
    forged = deepcopy(manifest)
    forged["canonical_workspace_path"] = str(tmp_path / "other")
    body = {key: value for key, value in forged.items() if key != "manifest_hash"}
    forged["manifest_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        validate_vbd_precision_diagnostic_v3_authorization_manifest(forged)


def test_d_a_verifier_requires_clean_sole_child_one_file_diff(tmp_path, monkeypatch):
    manifest = _manifest(tmp_path)
    authorization_commit = "8" * 40

    def git_output(*args):
        if args[:2] == ("status", "--porcelain=v1"):
            return ""
        if args == ("rev-parse", "HEAD"):
            return authorization_commit
        if args[:3] == ("rev-list", "--parents", "-n"):
            return f"{authorization_commit} {manifest['implementation_commit']}"
        if args[:3] == ("diff-tree", "--no-commit-id", "--name-only"):
            return VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_AUTHORIZATION_MANIFEST_RELATIVE_PATH
        if args == (
            "rev-parse",
            f"{manifest['implementation_commit']}^{{tree}}",
        ):
            return manifest["implementation_tree"]
        raise AssertionError(args)

    monkeypatch.setattr(authorization_module, "_git_output", git_output)
    verify_vbd_precision_diagnostic_v3_authorization_commit(
        manifest=manifest, authorization_commit=authorization_commit
    )

    def forged_git_output(*args):
        value = git_output(*args)
        if args[:3] == ("diff-tree", "--no-commit-id", "--name-only"):
            return value + "\ninference/extra.py"
        return value

    monkeypatch.setattr(authorization_module, "_git_output", forged_git_output)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        verify_vbd_precision_diagnostic_v3_authorization_commit(
            manifest=manifest, authorization_commit=authorization_commit
        )


def test_standalone_bootstrap_starts_under_isolated_python():
    bootstrap = (
        _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_BOOTSTRAP_RELATIVE_PATH
    )
    completed = subprocess.run(
        [sys.executable, "-I", "-S", "-B", str(bootstrap), "--help"],
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0
    assert "--execution-authorization" not in completed.stderr


def _load_bootstrap_module():
    bootstrap = (
        _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_BOOTSTRAP_RELATIVE_PATH
    )
    spec = importlib.util.spec_from_file_location(
        "vbd_precision_diagnostic_v3_bootstrap_test", bootstrap
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_bootstrap_and_python_validator_share_exact_v3_manifest(tmp_path):
    bootstrap = _load_bootstrap_module()
    manifest = _manifest(tmp_path)
    assert bootstrap._validate_manifest_shape(manifest) == manifest

    forged = deepcopy(manifest)
    forged["diagnostic_plan_hash"] = "a" * 64
    body = {key: value for key, value in forged.items() if key != "manifest_hash"}
    forged["manifest_hash"] = sha256_json(body)
    with pytest.raises(bootstrap.BootstrapError):
        bootstrap._validate_manifest_shape(forged)


def test_complete_manifest_validation_precedes_irreversible_claim(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap_module()
    manifest = _manifest(tmp_path)
    manifest["in_scope_files"] = manifest["in_scope_files"][:-1]
    manifest["in_scope_files_hash"] = sha256_json(manifest["in_scope_files"])
    body = {key: value for key, value in manifest.items() if key != "manifest_hash"}
    manifest["manifest_hash"] = sha256_json(body)

    def complete_manifest_validation(*, manifest, **_kwargs):
        validate_vbd_precision_diagnostic_v3_authorization_manifest(manifest)

    monkeypatch.setattr(
        bootstrap, "_validate_manifest_in_child", complete_manifest_validation
    )
    monkeypatch.setattr(
        bootstrap,
        "_consume_claim",
        lambda **_kwargs: pytest.fail("claim cannot precede complete validation"),
    )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        bootstrap._preflight_and_consume_claim(
            modules={},
            manifest=manifest,
            execution_authorization={},
            authorization_commit="8" * 40,
        )


def test_bootstrap_sets_compiled_thread_limits_before_numerical_import(monkeypatch):
    bootstrap = _load_bootstrap_module()
    for key in bootstrap.THREAD_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    bootstrap._configure_numerical_environment()
    assert {os.environ[key] for key in bootstrap.THREAD_ENV_KEYS} == {"1"}


def test_bootstrap_supervisor_enforces_timeout_and_removes_staging(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap_module()
    monkeypatch.setattr(bootstrap, "TIMEOUT_SECONDS", 0.01)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    staged.write_bytes(bootstrap._canonical_bytes({"state": "HOLD"}) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    child_pid = os.fork()
    if child_pid == 0:
        time.sleep(60)
        os._exit(0)
    with pytest.raises(bootstrap.BootstrapError, match="compiled timeout"):
        bootstrap._supervise_and_publish(
            child_pid,
            manifest,
            modules={},
            execution_authorization={},
            claim={},
            authorization_commit="8" * 40,
        )
    with pytest.raises(ChildProcessError):
        os.waitpid(child_pid, os.WNOHANG)
    assert not staged.exists()
    assert not output.exists()


def test_bootstrap_publishes_only_canonical_staged_output(tmp_path):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    value = {"state": "HOLD", "evidence_eligible": False}
    staged.write_bytes(bootstrap._canonical_bytes(value) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    assert bootstrap._publish_staged_output(manifest) == value
    assert not staged.exists()
    assert output.read_bytes() == bootstrap._canonical_bytes(value) + b"\n"


def test_bootstrap_fails_closed_when_staged_output_cannot_be_removed(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    value = {"state": "HOLD", "evidence_eligible": False}
    staged.write_bytes(bootstrap._canonical_bytes(value) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    real_unlink = bootstrap.os.unlink

    def fail_staged_unlink(path, *args, **kwargs):
        if path == bootstrap.STAGED_OUTPUT_FILENAME:
            raise OSError("injected staged cleanup failure")
        return real_unlink(path, *args, **kwargs)

    monkeypatch.setattr(bootstrap.os, "unlink", fail_staged_unlink)
    with pytest.raises(bootstrap.BootstrapError, match="could not be removed"):
        bootstrap._publish_staged_output(manifest)
    assert staged.exists()
    assert not output.exists()


def _successful_child_pid():
    child_pid = os.fork()
    if child_pid == 0:
        os._exit(0)
    return child_pid


def test_bootstrap_requires_staged_and_final_semantic_validation(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    value = {"state": "HOLD", "evidence_eligible": False}
    staged.write_bytes(bootstrap._canonical_bytes(value) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    calls = []

    def validate_persisted(**kwargs):
        calls.append(kwargs["final"])

    monkeypatch.setattr(
        bootstrap, "_validate_persisted_in_child", validate_persisted
    )
    assert (
        bootstrap._supervise_and_publish(
            _successful_child_pid(),
            manifest,
            modules={"reviewed": object()},
            execution_authorization={"authorized": True},
            claim={"claimed": True},
            authorization_commit="8" * 40,
        )
        == value
    )
    assert calls == [False, True]
    assert not staged.exists()
    assert output.read_bytes() == bootstrap._canonical_bytes(value) + b"\n"


@pytest.mark.parametrize("failure_stage", [False, True])
def test_bootstrap_semantic_validation_failure_removes_staged_and_final(
    tmp_path, monkeypatch, failure_stage
):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / f"workspace-{failure_stage}"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    value = {"state": "HOLD", "evidence_eligible": False}
    staged.write_bytes(bootstrap._canonical_bytes(value) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }

    def validate_persisted(**kwargs):
        if kwargs["final"] is failure_stage:
            raise bootstrap.BootstrapError("injected semantic failure")

    monkeypatch.setattr(
        bootstrap, "_validate_persisted_in_child", validate_persisted
    )
    with pytest.raises(bootstrap.BootstrapError, match="injected semantic failure"):
        bootstrap._supervise_and_publish(
            _successful_child_pid(),
            manifest,
            modules={},
            execution_authorization={},
            claim={},
            authorization_commit="8" * 40,
        )
    assert not staged.exists()
    assert not output.exists()


def test_bootstrap_rejects_duplicate_keys_before_publication(tmp_path):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    staged.write_bytes(b'{"state":"HOLD","state":"HOLD"}\n')
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    with pytest.raises(bootstrap.BootstrapError, match="duplicate JSON key"):
        bootstrap._publish_staged_output(manifest)
    assert not output.exists()


def test_bootstrap_preserves_preexisting_final_when_link_fails(tmp_path):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    staged.write_bytes(bootstrap._canonical_bytes({"state": "HOLD"}) + b"\n")
    sentinel = bootstrap._canonical_bytes({"existing": True}) + b"\n"
    output.write_bytes(sentinel)
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    with pytest.raises(bootstrap.BootstrapError, match="could not be published"):
        bootstrap._publish_staged_output(manifest)
    assert output.read_bytes() == sentinel
    assert staged.exists()


def test_bootstrap_rolls_back_new_final_when_post_link_fsync_fails(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    staged.write_bytes(bootstrap._canonical_bytes({"state": "HOLD"}) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    real_fsync = bootstrap.os.fsync
    calls = 0

    def fail_first_fsync(descriptor):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise OSError("injected post-link fsync failure")
        return real_fsync(descriptor)

    monkeypatch.setattr(bootstrap.os, "fsync", fail_first_fsync)
    with pytest.raises(bootstrap.BootstrapError, match="could not be published"):
        bootstrap._publish_staged_output(manifest)
    assert not output.exists()
    assert staged.exists()


def test_bootstrap_propagates_post_link_rollback_failure(tmp_path, monkeypatch):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    staged.write_bytes(bootstrap._canonical_bytes({"state": "HOLD"}) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }
    real_fsync = bootstrap.os.fsync
    real_unlink = bootstrap.os.unlink
    fsync_calls = 0

    def fail_first_fsync(descriptor):
        nonlocal fsync_calls
        fsync_calls += 1
        if fsync_calls == 1:
            raise OSError("injected post-link fsync failure")
        return real_fsync(descriptor)

    def fail_final_unlink(path, *, dir_fd=None):
        if path == output.name:
            raise OSError("injected rollback failure")
        return real_unlink(path, dir_fd=dir_fd)

    monkeypatch.setattr(bootstrap.os, "fsync", fail_first_fsync)
    monkeypatch.setattr(bootstrap.os, "unlink", fail_final_unlink)
    with pytest.raises(bootstrap.BootstrapError, match="output rollback failed"):
        bootstrap._publish_staged_output(manifest)
    assert output.exists()
    assert staged.exists()


def test_bootstrap_requires_exact_final_bytes_not_python_value_equality(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap_module()
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    staged = workspace / bootstrap.STAGED_OUTPUT_FILENAME
    output = workspace / "diagnostic.json"
    staged.write_bytes(bootstrap._canonical_bytes({"value": 1.0}) + b"\n")
    manifest = {
        "canonical_workspace_path": str(workspace),
        "output_path": str(output),
    }

    def mutate_final(*, final: bool, **_kwargs):
        if final:
            output.write_bytes(bootstrap._canonical_bytes({"value": 1}) + b"\n")

    monkeypatch.setattr(bootstrap, "_validate_persisted_in_child", mutate_final)
    with pytest.raises(bootstrap.BootstrapError, match="differs from staging"):
        bootstrap._supervise_and_publish(
            _successful_child_pid(),
            manifest,
            modules={},
            execution_authorization={},
            claim={},
            authorization_commit="8" * 40,
        )
    assert not output.exists()


def test_fixed_root_preflight_rejects_symlinked_ancestor(
    tmp_path, monkeypatch
):
    bootstrap = _load_bootstrap_module()
    real_parent = tmp_path / "real-parent"
    real_parent.mkdir()
    alias = tmp_path / "alias"
    alias.symlink_to(real_parent, target_is_directory=True)
    claim_root = tmp_path / "claim"
    claim_root.mkdir()
    authorization_path = claim_root / "execution_authorization.json"
    authorization_path.write_text("{}\n", encoding="utf-8")
    checkpoint_root = tmp_path / "checkpoints"
    site_packages = tmp_path / "site-packages"
    site_packages.mkdir()
    manifest = {
        "canonical_workspace_path": str(alias / "workspace"),
        "external_claim_root_path": str(claim_root),
        "checkpoint_root_path": str(checkpoint_root),
        "execution_authorization_record_path": str(authorization_path),
        "site_package_paths": [str(site_packages)],
    }
    with pytest.raises(bootstrap.BootstrapError, match="symlink"):
        bootstrap._preflight_fixed_roots(manifest)

    monkeypatch.setattr(
        authorization_module,
        "validate_vbd_precision_diagnostic_v3_authorization_manifest",
        lambda value: value,
    )
    with pytest.raises(
        VbdTrajectoryPrecisionDiagnosticV3AuthorizationError,
        match="symlink",
    ):
        preflight_vbd_precision_diagnostic_v3_fixed_roots(
            manifest=manifest, claim_consumed=False
        )


def test_input_binding_validator_rejects_off_plan_or_rehashed_content(tmp_path):
    manifest = _manifest(tmp_path)
    authorization = _execution_authorization(manifest)
    claim_body = authorization_module._vbd_precision_diagnostic_v3_claim_body(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit="8" * 40,
    )
    claim = {**claim_body, "claim_hash": sha256_json(claim_body)}
    body = {
        "schema_version": "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_INPUT_BINDING_2026_07_V3",
        "claim_hash": claim["claim_hash"],
        "synthetic_input_hash": "a" * 64,
        "panel_manifest_root": "b" * 64,
        "prepared_input_hashes": ["c" * 64, "d" * 64, "e" * 64],
        "model_input_hashes": ["f" * 64, "1" * 64, "2" * 64],
    }
    binding = {**body, "input_binding_hash": sha256_json(body)}
    assert (
        validate_vbd_precision_diagnostic_v3_input_binding(binding, claim=claim)
        == binding
    )
    forged = deepcopy(binding)
    forged["claim_hash"] = "3" * 64
    forged_body = {
        key: value for key, value in forged.items() if key != "input_binding_hash"
    }
    forged["input_binding_hash"] = sha256_json(forged_body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
        validate_vbd_precision_diagnostic_v3_input_binding(forged, claim=claim)

    for tombstone in (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
    ):
        forged = deepcopy(binding)
        forged["prepared_input_hashes"][0] = tombstone
        forged_body = {
            key: value
            for key, value in forged.items()
            if key != "input_binding_hash"
        }
        forged["input_binding_hash"] = sha256_json(forged_body)
        with pytest.raises(VbdTrajectoryPrecisionDiagnosticV3AuthorizationError):
            validate_vbd_precision_diagnostic_v3_input_binding(
                forged, claim=claim
            )


def test_human_authorization_has_no_creator_api():
    assert not hasattr(
        authorization_module,
        "build_vbd_precision_diagnostic_v3_execution_authorization",
    )
