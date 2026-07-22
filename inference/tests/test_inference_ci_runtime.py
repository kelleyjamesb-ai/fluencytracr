from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


_RUNTIME_PATH = Path(__file__).resolve().parents[1] / "qa" / "verify_ci_runtime.py"
_SPEC = importlib.util.spec_from_file_location("inference_ci_runtime", _RUNTIME_PATH)
assert _SPEC is not None and _SPEC.loader is not None
runtime = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(runtime)


def _configure_valid_runtime(monkeypatch):
    for key in runtime.THREAD_ENV_KEYS:
        monkeypatch.setenv(key, "1")
    monkeypatch.setenv(
        "OPENBLAS_CORETYPE",
        runtime.EXPECTED_OPENBLAS_CORETYPE,
    )
    monkeypatch.setattr(runtime.np.linalg, "solve", lambda *_args: None)
    monkeypatch.setattr(
        runtime,
        "threadpool_info",
        lambda: [
            {
                "internal_api": "openblas",
                "num_threads": 1,
                "architecture": runtime.EXPECTED_OPENBLAS_CORETYPE,
            }
        ],
    )


def test_ci_runtime_accepts_only_the_exact_single_thread_haswell_pool(
    monkeypatch, capsys
):
    _configure_valid_runtime(monkeypatch)
    assert runtime.main() == 0
    output = capsys.readouterr().out
    assert '"openblas_coretype": "Haswell"' in output


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        ("missing_thread_limit", "thread limits"),
        ("wrong_coretype", "core type"),
        ("missing_openblas", "did not load OpenBLAS"),
        ("multiple_threads", "non-single-threaded"),
        ("wrong_architecture", "architecture"),
    ],
)
def test_ci_runtime_rejects_provenance_drift(monkeypatch, mutation, message):
    _configure_valid_runtime(monkeypatch)
    if mutation == "missing_thread_limit":
        monkeypatch.delenv(runtime.THREAD_ENV_KEYS[0])
    elif mutation == "wrong_coretype":
        monkeypatch.setenv("OPENBLAS_CORETYPE", "SkylakeX")
    elif mutation == "missing_openblas":
        monkeypatch.setattr(runtime, "threadpool_info", lambda: [])
    elif mutation == "multiple_threads":
        monkeypatch.setattr(
            runtime,
            "threadpool_info",
            lambda: [
                {
                    "internal_api": "openblas",
                    "num_threads": 2,
                    "architecture": runtime.EXPECTED_OPENBLAS_CORETYPE,
                }
            ],
        )
    else:
        monkeypatch.setattr(
            runtime,
            "threadpool_info",
            lambda: [
                {
                    "internal_api": "openblas",
                    "num_threads": 1,
                    "architecture": "SkylakeX",
                }
            ],
        )
    with pytest.raises(RuntimeError, match=message):
        runtime.main()
