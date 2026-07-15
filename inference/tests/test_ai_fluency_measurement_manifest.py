import json
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

from fluencytracr_inference.ai_fluency_measurement_manifest import (
    BEHAVIOR_EVIDENCE_KEYS,
    CONSTRUCT_IDS,
    CORE_CONSTRUCT_IDS,
    LONG_FORM_ID,
    SHORT_FORM_ID,
    load_measurement_manifest,
    manifest_construct_items,
    manifest_item_ids,
    manifest_item_to_construct,
    manifest_pair_ids,
    measurement_manifest_hash,
)


def test_frozen_long_form_has_exact_measurement_structure():
    manifest = load_measurement_manifest()

    assert manifest["form_id"] == LONG_FORM_ID == "ai_fluency_long_v1"
    assert manifest["item_count"] == 24
    assert len(manifest_item_ids()) == 24
    assert len(set(manifest_item_ids())) == 24
    assert len(manifest_pair_ids()) == 276
    assert tuple(manifest_construct_items()) == CONSTRUCT_IDS
    assert all(len(items) == 3 for items in manifest_construct_items().values())
    assert tuple(
        manifest["measurement_structure"]["second_order_indicator_construct_ids"]
    ) == CORE_CONSTRUCT_IDS
    assert manifest["response_scale"]["values"] == [1, 2, 3, 4, 5]
    assert manifest["response_scale"]["reverse_coded_item_ids"] == []
    assert manifest["measurement_structure"]["structural_paths_in_calibration_scope"] is False


def test_manifest_matches_frozen_source_items_and_hash():
    manifest = load_measurement_manifest()

    assert manifest["items"][0] == {
        "item_id": "ai-fluency-q01",
        "item_index": 1,
        "construct_id": "confidence",
        "prompt": "I feel confident using AI tools to support my day-to-day work.",
    }
    assert manifest["items"][-1] == {
        "item_id": "ai-fluency-q24",
        "item_index": 24,
        "construct_id": "perceived_ai_impact",
        "prompt": "AI is increasing my effectiveness in ways that matter.",
    }
    assert measurement_manifest_hash() == (
        "1b1523baab5bd3007e0c42e732da8d71cf67594074a54d17bb4b741292565434"
    )
    assert manifest["source_lineage"]["candidate_artifact_sha256"] == (
        "268edeec251d253fbcc96bcf03a750ab6c31e236c914ae99095193ca3748e1fd"
    )


def test_short_form_and_behavior_evidence_remain_outside_calibration():
    manifest = load_measurement_manifest()
    short = manifest["short_form_policy"]
    behavior = manifest["behavior_evidence_policy"]

    assert short["form_id"] == SHORT_FORM_ID
    assert short["role"] == "pulse_only"
    assert short["equated_to_long_form"] is False
    assert short["eligible_for_longitudinal_change_calibration"] is False
    assert tuple(behavior["item_keys"]) == BEHAVIOR_EVIDENCE_KEYS
    assert behavior["loads_on_ai_fluency"] is False
    assert behavior["changes_measurement_eligibility"] is False
    assert behavior["changes_outcome_estimates"] is False
    assert behavior["can_rescue_hold"] is False


def test_item_to_construct_map_is_complete_and_stable():
    item_to_construct = manifest_item_to_construct()

    assert tuple(item_to_construct) == manifest_item_ids()
    for construct_id, item_ids in manifest_construct_items().items():
        assert all(item_to_construct[item_id] == construct_id for item_id in item_ids)


def test_manifest_loader_returns_defensive_copies():
    first = load_measurement_manifest()
    first["items"][0]["prompt"] = "mutated"

    assert load_measurement_manifest()["items"][0]["prompt"] != "mutated"
    assert measurement_manifest_hash() == (
        "1b1523baab5bd3007e0c42e732da8d71cf67594074a54d17bb4b741292565434"
    )


def test_built_wheel_loads_frozen_manifest_outside_checkout(tmp_path):
    inference_root = Path(__file__).resolve().parents[1]
    clean_project = tmp_path / "clean-project"
    clean_package = clean_project / "src" / "fluencytracr_inference"
    clean_package.parent.mkdir(parents=True)
    shutil.copy2(inference_root / "pyproject.toml", clean_project / "pyproject.toml")
    shutil.copytree(
        inference_root / "src" / "fluencytracr_inference",
        clean_package,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )
    wheelhouse = tmp_path / "wheelhouse"
    wheelhouse.mkdir()

    build = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            "--no-index",
            "--no-cache-dir",
            "--no-deps",
            "--no-build-isolation",
            "--wheel-dir",
            str(wheelhouse),
            str(clean_project),
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    assert build.returncode == 0, build.stdout + build.stderr

    wheels = tuple(wheelhouse.glob("fluencytracr_inference-*.whl"))
    assert len(wheels) == 1
    resource_member = "fluencytracr_inference/ai_fluency_long_v1_manifest.json"
    canonical_resource = (
        inference_root
        / "src"
        / "fluencytracr_inference"
        / "ai_fluency_long_v1_manifest.json"
    )
    with zipfile.ZipFile(wheels[0]) as wheel:
        matching_members = tuple(
            name
            for name in wheel.namelist()
            if name.endswith("/ai_fluency_long_v1_manifest.json")
        )
        assert matching_members == (resource_member,)
        assert wheel.read(resource_member) == canonical_resource.read_bytes()

    install_target = tmp_path / "installed"
    install = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--no-index",
            "--no-deps",
            "--no-compile",
            "--target",
            str(install_target),
            str(wheels[0]),
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    assert install.returncode == 0, install.stdout + install.stderr

    outside_checkout = tmp_path / "outside-checkout"
    outside_checkout.mkdir()
    probe = subprocess.run(
        [
            sys.executable,
            "-I",
            "-c",
            """
import json
import sys

sys.path.insert(0, sys.argv[1])
from fluencytracr_inference import ai_fluency_measurement_manifest as manifest_module

print(json.dumps({
    "form_id": manifest_module.load_measurement_manifest()["form_id"],
    "item_count": manifest_module.load_measurement_manifest()["item_count"],
    "manifest_hash": manifest_module.measurement_manifest_hash(),
    "module_path": manifest_module.__file__,
    "sys_path": sys.path,
}))
""",
            str(install_target),
        ],
        cwd=outside_checkout,
        capture_output=True,
        text=True,
        check=False,
    )
    assert probe.returncode == 0, probe.stdout + probe.stderr
    assert probe.stderr == ""
    result = json.loads(probe.stdout)

    assert result["form_id"] == "ai_fluency_long_v1"
    assert result["item_count"] == 24
    assert result["manifest_hash"] == (
        "1b1523baab5bd3007e0c42e732da8d71cf67594074a54d17bb4b741292565434"
    )
    assert Path(result["module_path"]).is_relative_to(install_target)
    assert str(inference_root / "src") not in "\n".join(result["sys_path"])

    (install_target / resource_member).unlink()
    missing_resource = subprocess.run(
        probe.args,
        cwd=outside_checkout,
        capture_output=True,
        text=True,
        check=False,
    )
    assert missing_resource.returncode != 0
    assert "MeasurementManifestError: unable to load measurement manifest" in (
        missing_resource.stderr
    )
    assert str(inference_root) not in missing_resource.stderr
