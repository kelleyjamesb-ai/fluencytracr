import ast
from pathlib import Path
import subprocess
import sys
import textwrap

from fluencytracr_inference import vbd_trajectory_validation_resumable


_REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
_IMPLEMENTATION_SOURCE_PATHS = {
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_constants.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_diagnostic.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_projection.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_constants.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_diagnostic.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_projection.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_precision_diagnostic_v2_checkpoint.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_precision_diagnostic_v3_checkpoint.py",
}
_FORBIDDEN_AUTHORIZATION_AND_EXECUTION_PATHS = {
    "inference/evidence/vbd_trajectory_group_effect_geometry_authorization.json",
    "inference/evidence/vbd_trajectory_group_effect_marginalization_authorization.json",
    "inference/evidence/vbd_trajectory_group_effect_marginalization_v2_authorization.json",
    "inference/evidence/vbd_trajectory_precision_diagnostic_v2_authorization.json",
    "inference/evidence/vbd_trajectory_precision_diagnostic_v3_authorization.json",
    "inference/scripts/vbd_trajectory_group_effect_geometry_bootstrap.py",
    "inference/scripts/vbd_trajectory_group_effect_marginalization_bootstrap.py",
    "inference/scripts/vbd_trajectory_precision_diagnostic_v2_bootstrap.py",
    "inference/scripts/vbd_trajectory_precision_diagnostic_v3_bootstrap.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_authorization.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_geometry_execution.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_authorization.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_execution.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_precision_diagnostic_v2_authorization.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_precision_diagnostic_v2_execution.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_precision_diagnostic_v3_authorization.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_precision_diagnostic_v3_execution.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_precision_diagnostic_v3_rehearsal.py",
    "inference/tests/test_vbd_trajectory_group_effect_geometry_execution.py",
    "inference/tests/test_vbd_trajectory_group_effect_marginalization_execution.py",
    "inference/tests/test_vbd_trajectory_precision_diagnostic_v2_authorization.py",
    "inference/tests/test_vbd_trajectory_precision_diagnostic_v3_authorization.py",
}


def test_clean_source_closure_contains_only_implementation_primitives():
    assert set(
        vbd_trajectory_validation_resumable._IMPLEMENTATION_ONLY_SOURCE_PATHS
    ) == _IMPLEMENTATION_SOURCE_PATHS
    assert all((_REPOSITORY_ROOT / path).is_file() for path in _IMPLEMENTATION_SOURCE_PATHS)
    assert not (
        set(vbd_trajectory_validation_resumable._RUNNER_SOURCE_PATHS)
        & _FORBIDDEN_AUTHORIZATION_AND_EXECUTION_PATHS
    )


def test_authorization_manifests_launchers_and_execution_modules_are_absent():
    assert not any(
        (_REPOSITORY_ROOT / path).exists()
        for path in _FORBIDDEN_AUTHORIZATION_AND_EXECUTION_PATHS
    )


def test_v1_reviewed_source_import_is_dependency_closed():
    script = textwrap.dedent(
        """
        import ast
        import importlib.util
        from pathlib import Path
        import sys

        root = Path(sys.argv[1])
        bootstrap_path = root / "inference/scripts/vbd_trajectory_precision_diagnostic_bootstrap.py"
        specification = importlib.util.spec_from_file_location(
            "v1_source_closure_bootstrap", bootstrap_path
        )
        bootstrap = importlib.util.module_from_spec(specification)
        specification.loader.exec_module(bootstrap)

        source = (
            root
            / "inference/src/fluencytracr_inference/vbd_trajectory_validation_resumable.py"
        ).read_text(encoding="utf-8")
        paths = None
        for node in ast.parse(source).body:
            if isinstance(node, ast.Assign) and any(
                isinstance(target, ast.Name)
                and target.id == "_RUNNER_SOURCE_PATHS_V1"
                for target in node.targets
            ):
                paths = ast.literal_eval(node.value)
                break
        if paths is None:
            raise RuntimeError("V1 source closure is absent")
        modules = {}
        for relative in paths:
            if not relative.startswith("inference/src/") or not relative.endswith(".py"):
                continue
            module_name = (
                relative.removeprefix("inference/src/")
                .removesuffix(".py")
                .replace("/", ".")
            )
            is_package = module_name.endswith(".__init__")
            if is_package:
                module_name = module_name.removesuffix(".__init__")
            path = root / relative
            modules[module_name] = (path.read_bytes(), str(path), is_package)
        sys.meta_path.insert(0, bootstrap._FrozenFinder(modules))
        __import__(
            "fluencytracr_inference.vbd_trajectory_precision_diagnostic_authorization"
        )
        """
    )
    completed = subprocess.run(
        [sys.executable, "-I", "-B", "-c", script, str(_REPOSITORY_ROOT)],
        cwd=_REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr


def test_clean_implementation_sources_define_no_persisted_root_paths():
    forbidden_suffixes = ("_PATH", "_ROOTS")
    for relative in _IMPLEMENTATION_SOURCE_PATHS:
        source = (_REPOSITORY_ROOT / relative).read_text(encoding="utf-8")
        tree = ast.parse(source, filename=relative)
        assigned_names = {
            target.id
            for node in tree.body
            if isinstance(node, (ast.Assign, ast.AnnAssign))
            for target in (
                node.targets if isinstance(node, ast.Assign) else (node.target,)
            )
            if isinstance(target, ast.Name)
        }
        assert not any(
            name.endswith(forbidden_suffixes) for name in assigned_names
        ), relative
