from copy import deepcopy
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys

import pytest

import fluencytracr_inference.vbd_trajectory_precision_diagnostic_authorization as authorization_module
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_precision_diagnostic import (
    vbd_trajectory_precision_diagnostic_plan,
    vbd_trajectory_precision_diagnostic_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_precision_diagnostic_authorization import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_AUTHORIZATION_MANIFEST_RELATIVE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_AUTHORIZATION_MANIFEST_SCHEMA_VERSION,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_AUTHORIZATION_SCOPE,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_BOOTSTRAP_RELATIVE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXECUTION_AUTHORIZATION_SCHEMA_VERSION,
    VbdTrajectoryPrecisionDiagnosticAuthorizationError,
    consume_vbd_precision_diagnostic_claim,
    validate_vbd_precision_diagnostic_claim,
    validate_vbd_precision_diagnostic_authorization_manifest,
    validate_vbd_precision_diagnostic_execution_authorization,
    verify_vbd_precision_diagnostic_authorization_commit,
)
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    _RUNNER_SOURCE_PATHS,
    _repo_root,
)


def _sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _manifest(tmp_path: Path):
    implementation = "1" * 40
    workspace = tmp_path / "workspace"
    claim_root = tmp_path / "claim"
    authorization_path = claim_root / "execution_authorization.json"
    output = workspace / "diagnostic.json"
    bootstrap = (
        _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_BOOTSTRAP_RELATIVE_PATH
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
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_AUTHORIZATION_MANIFEST_SCHEMA_VERSION,
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
        "diagnostic_plan_hash": vbd_trajectory_precision_diagnostic_plan()[
            "diagnostic_plan_hash"
        ],
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_seed_manifest()[
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
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_EXECUTION_AUTHORIZATION_SCHEMA_VERSION,
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_AUTHORIZATION_SCOPE,
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
        "command_hash": manifest["command_hash"],
    }
    return {**body, "execution_authorization_hash": sha256_json(body)}


def test_manifest_and_human_authorization_are_strict(tmp_path):
    manifest = _manifest(tmp_path)
    authorization = _execution_authorization(manifest)
    assert validate_vbd_precision_diagnostic_authorization_manifest(manifest) == manifest
    assert (
        validate_vbd_precision_diagnostic_execution_authorization(
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
        with pytest.raises(VbdTrajectoryPrecisionDiagnosticAuthorizationError):
            validate_vbd_precision_diagnostic_execution_authorization(
                forged,
                manifest=manifest,
                authorization_commit="8" * 40,
            )


def test_claim_rejects_identical_repeat_and_partial_existing_file(tmp_path):
    manifest = _manifest(tmp_path)
    authorization = _execution_authorization(manifest)
    first = consume_vbd_precision_diagnostic_claim(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit="8" * 40,
    )
    assert first["state"] == "CONSUMED_BEFORE_EXECUTION"
    forged = deepcopy(first)
    forged["command_hash"] = "f" * 64
    forged_body = {
        key: value for key, value in forged.items() if key != "claim_hash"
    }
    forged["claim_hash"] = sha256_json(forged_body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticAuthorizationError):
        validate_vbd_precision_diagnostic_claim(
            forged,
            manifest=manifest,
            execution_authorization=authorization,
            authorization_commit="8" * 40,
        )
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticAuthorizationError):
        consume_vbd_precision_diagnostic_claim(
            manifest=manifest,
            execution_authorization=authorization,
            authorization_commit="8" * 40,
        )

    second_manifest = _manifest(tmp_path / "second")
    claim_root = Path(second_manifest["external_claim_root_path"])
    claim_root.parent.mkdir(parents=True)
    claim_root.mkdir(mode=0o700)
    (claim_root / "attempt_claim.json").write_bytes(b"{")
    second_authorization = _execution_authorization(second_manifest)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticAuthorizationError):
        consume_vbd_precision_diagnostic_claim(
            manifest=second_manifest,
            execution_authorization=second_authorization,
            authorization_commit="8" * 40,
        )


def test_manifest_rejects_alternate_workspace_even_after_rehash(tmp_path):
    manifest = _manifest(tmp_path)
    forged = deepcopy(manifest)
    forged["canonical_workspace_path"] = str(tmp_path / "other")
    body = {key: value for key, value in forged.items() if key != "manifest_hash"}
    forged["manifest_hash"] = sha256_json(body)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticAuthorizationError):
        validate_vbd_precision_diagnostic_authorization_manifest(forged)


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
            return VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_AUTHORIZATION_MANIFEST_RELATIVE_PATH
        if args == (
            "rev-parse",
            f"{manifest['implementation_commit']}^{{tree}}",
        ):
            return manifest["implementation_tree"]
        raise AssertionError(args)

    monkeypatch.setattr(authorization_module, "_git_output", git_output)
    verify_vbd_precision_diagnostic_authorization_commit(
        manifest=manifest, authorization_commit=authorization_commit
    )

    def forged_git_output(*args):
        value = git_output(*args)
        if args[:3] == ("diff-tree", "--no-commit-id", "--name-only"):
            return value + "\ninference/extra.py"
        return value

    monkeypatch.setattr(authorization_module, "_git_output", forged_git_output)
    with pytest.raises(VbdTrajectoryPrecisionDiagnosticAuthorizationError):
        verify_vbd_precision_diagnostic_authorization_commit(
            manifest=manifest, authorization_commit=authorization_commit
        )


def test_standalone_bootstrap_starts_under_isolated_python():
    bootstrap = (
        _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_BOOTSTRAP_RELATIVE_PATH
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
        _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_BOOTSTRAP_RELATIVE_PATH
    )
    spec = importlib.util.spec_from_file_location(
        "vbd_precision_diagnostic_bootstrap_test", bootstrap
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_bootstrap_sets_compiled_thread_limits_before_numerical_import(monkeypatch):
    bootstrap = _load_bootstrap_module()
    for key in bootstrap.THREAD_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    bootstrap._configure_numerical_environment()
    assert {os.environ[key] for key in bootstrap.THREAD_ENV_KEYS} == {"1"}


def test_bootstrap_supervisor_enforces_timeout_and_reaps_child(monkeypatch):
    bootstrap = _load_bootstrap_module()
    monkeypatch.setattr(bootstrap, "TIMEOUT_SECONDS", 0.01)
    child_pid = os.fork()
    if child_pid == 0:
        os.pause()
        os._exit(0)
    with pytest.raises(bootstrap.BootstrapError, match="compiled timeout"):
        bootstrap._wait_for_claimed_child(child_pid)
    with pytest.raises(ChildProcessError):
        os.waitpid(child_pid, os.WNOHANG)


def test_human_authorization_has_no_creator_api():
    assert not hasattr(
        authorization_module,
        "build_vbd_precision_diagnostic_execution_authorization",
    )
