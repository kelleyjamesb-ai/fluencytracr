from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest


_RUNNER_PATH = Path(__file__).resolve().parents[1] / "qa" / "run_test_shard.py"
_SPEC = importlib.util.spec_from_file_location("inference_test_shard_runner", _RUNNER_PATH)
assert _SPEC is not None and _SPEC.loader is not None
shard_runner = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(shard_runner)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _fake_repo(tmp_path: Path) -> tuple[Path, Path, dict[str, object]]:
    tests_root = tmp_path / "inference" / "tests"
    tests_root.mkdir(parents=True)
    filenames = (
        "foundation_test.py",
        "test_foundation.py",
        "test_longitudinal_engine.py",
        "test_vbd_trajectory_engine.py",
        "test_vbd_trajectory_group_effect_geometry.py",
    )
    for filename in filenames:
        (tests_root / filename).write_text(
            "def test_placeholder(): pass\n", encoding="utf-8"
        )
    manifest = {
        "schema_version": shard_runner.SCHEMA_VERSION,
        "shards": {
            "foundation-measurement": [
                "foundation_test.py",
                "test_foundation.py",
            ],
            "longitudinal": ["test_longitudinal_engine.py"],
            "vbd-engine": [
                "test_vbd_trajectory_engine.py",
                "test_vbd_trajectory_group_effect_geometry.py",
            ],
        },
    }
    manifest_path = tmp_path / "test_shards.json"
    return tmp_path, manifest_path, manifest


def _write_manifest(path: Path, manifest: dict[str, object]) -> None:
    path.write_text(json.dumps(manifest), encoding="utf-8")


def test_repository_shard_manifest_covers_every_inference_test_exactly_once():
    shards = shard_runner.load_validated_shards(repo_root=_repo_root())
    assigned = [path for paths in shards.values() for path in paths]
    tests_root = _repo_root() / "inference" / "tests"
    discovered = {
        path
        for pattern in ("test_*.py", "*_test.py")
        for path in tests_root.glob(pattern)
    }
    assert len(assigned) == len(discovered)
    assert set(assigned) == discovered


def test_shard_manifest_accepts_complete_domain_partition(tmp_path):
    repo_root, manifest_path, manifest = _fake_repo(tmp_path)
    _write_manifest(manifest_path, manifest)
    shards = shard_runner.load_validated_shards(
        repo_root=repo_root,
        manifest_path=manifest_path,
    )
    assert {name: len(paths) for name, paths in shards.items()} == {
        "foundation-measurement": 2,
        "longitudinal": 1,
        "vbd-engine": 2,
    }


@pytest.mark.parametrize("failure", ["missing", "duplicate", "stale"])
def test_shard_manifest_rejects_incomplete_or_ambiguous_coverage(
    tmp_path, failure
):
    repo_root, manifest_path, manifest = _fake_repo(tmp_path)
    shards = manifest["shards"]
    assert isinstance(shards, dict)
    if failure == "missing":
        shards["vbd-engine"] = []
    elif failure == "duplicate":
        shards["vbd-engine"].append("test_foundation.py")
    else:
        shards["vbd-engine"].append("test_vbd_trajectory_removed.py")
    _write_manifest(manifest_path, manifest)
    with pytest.raises(shard_runner.ShardManifestError):
        shard_runner.load_validated_shards(
            repo_root=repo_root,
            manifest_path=manifest_path,
        )


def test_shard_matrix_output_is_derived_from_the_validated_manifest(capsys):
    assert shard_runner.main(["matrix"]) == 0
    assert json.loads(capsys.readouterr().out) == list(shard_runner.SHARD_NAMES)


def test_shard_manifest_rejects_cross_domain_assignment(tmp_path):
    repo_root, manifest_path, manifest = _fake_repo(tmp_path)
    shards = manifest["shards"]
    assert isinstance(shards, dict)
    shards["vbd-engine"] = []
    shards["foundation-measurement"].append("test_vbd_trajectory_engine.py")
    _write_manifest(manifest_path, manifest)
    with pytest.raises(shard_runner.ShardManifestError, match="must be assigned"):
        shard_runner.load_validated_shards(
            repo_root=repo_root,
            manifest_path=manifest_path,
        )


def test_shard_manifest_rejects_symlinked_test_subtrees(tmp_path):
    repo_root, manifest_path, manifest = _fake_repo(tmp_path)
    _write_manifest(manifest_path, manifest)
    external = tmp_path / "external-tests"
    external.mkdir()
    (external / "test_hidden.py").write_text(
        "def test_hidden(): assert False\n", encoding="utf-8"
    )
    linked = repo_root / "inference" / "tests" / "linked"
    try:
        linked.symlink_to(external, target_is_directory=True)
    except OSError as error:
        pytest.skip(f"symlinks unavailable: {error}")
    with pytest.raises(shard_runner.ShardManifestError, match="contains a symlink"):
        shard_runner.load_validated_shards(
            repo_root=repo_root,
            manifest_path=manifest_path,
        )


def _write_junit_report(path: Path, **overrides: int) -> None:
    counts = {
        "tests": shard_runner.EXPECTED_TEST_COUNTS["foundation-measurement"],
        "failures": 0,
        "errors": 0,
        "skipped": 0,
    }
    counts.update(overrides)
    attributes = " ".join(f'{key}="{value}"' for key, value in counts.items())
    path.write_text(
        f'<?xml version="1.0"?><testsuites><testsuite {attributes} />'
        f'</testsuites>',
        encoding="utf-8",
    )


def test_pytest_report_requires_the_exact_passing_shard_count(tmp_path):
    report = tmp_path / "report.xml"
    _write_junit_report(report)
    shard_runner._validate_pytest_report(
        report,
        shard_name="foundation-measurement",
    )


@pytest.mark.parametrize(
    "counts",
    [
        {
            "tests": shard_runner.EXPECTED_TEST_COUNTS[
                "foundation-measurement"
            ] - 1
        },
        {"failures": 1},
        {"errors": 1},
        {"skipped": 1},
    ],
)
def test_pytest_report_rejects_omissions_and_nonpassing_results(
    tmp_path, counts
):
    report = tmp_path / "report.xml"
    _write_junit_report(report, **counts)
    with pytest.raises(shard_runner.ShardManifestError, match="totals are not exact"):
        shard_runner._validate_pytest_report(
            report,
            shard_name="foundation-measurement",
        )


def test_shard_manifest_rejects_noncanonical_paths_and_order(tmp_path):
    repo_root, manifest_path, manifest = _fake_repo(tmp_path)
    shards = manifest["shards"]
    assert isinstance(shards, dict)
    shards["foundation-measurement"] = ["../test_escape.py"]
    _write_manifest(manifest_path, manifest)
    with pytest.raises(shard_runner.ShardManifestError, match="invalid test path"):
        shard_runner.load_validated_shards(
            repo_root=repo_root,
            manifest_path=manifest_path,
        )

    shards["foundation-measurement"] = ["test_z.py", "test_a.py"]
    _write_manifest(manifest_path, manifest)
    with pytest.raises(shard_runner.ShardManifestError, match="not sorted"):
        shard_runner.load_validated_shards(
            repo_root=repo_root,
            manifest_path=manifest_path,
        )
