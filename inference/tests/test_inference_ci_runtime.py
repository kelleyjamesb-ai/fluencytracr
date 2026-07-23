from __future__ import annotations

import hashlib
import importlib.util
import json
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
    monkeypatch.setenv(
        "NPY_DISABLE_CPU_FEATURES",
        runtime.EXPECTED_NUMPY_DISABLED_CPU_FEATURES,
    )
    monkeypatch.setattr(runtime.platform, "system", lambda: "Linux")
    monkeypatch.setattr(runtime.platform, "machine", lambda: "x86_64")
    monkeypatch.setattr(
        runtime,
        "_linux_cpu_identity",
        lambda: {"status": "observed_non_authoritative"},
    )
    monkeypatch.setattr(
        runtime,
        "NUMPY_CPU_BASELINE",
        runtime.EXPECTED_NUMPY_CPU_BASELINE,
    )
    monkeypatch.setattr(
        runtime,
        "NUMPY_CPU_DISPATCH",
        runtime.EXPECTED_NUMPY_CPU_DISPATCH,
    )
    monkeypatch.setattr(
        runtime,
        "NUMPY_CPU_FEATURES",
        {
            "X86_V3": True,
            "X86_V4": False,
            "AVX512_ICL": False,
            "AVX512_SPR": False,
            "VAES": True,
            "VPCLMULQDQ": True,
        },
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


def test_linux_cpu_identity_is_complete_and_order_stable():
    first = runtime._parse_linux_cpu_identity(
        """vendor_id : GenuineIntel
cpu family : 6
model : 143
model name : Intel Xeon
stepping : 8
microcode : 0x123
flags : sse2 fma avx2
"""
    )
    second = runtime._parse_linux_cpu_identity(
        """vendor_id : GenuineIntel
cpu family : 6
model : 143
model name : Intel Xeon
stepping : 8
microcode : 0x123
flags : avx2 sse2 fma
"""
    )
    assert first == second
    assert first["flags_count"] == 3
    assert first["raw_avx512f_present"] is False
    assert first["raw_x86_v4_flag_set_present"] is False
    assert first["flags_sha256"] == hashlib.sha256(
        b"avx2\nfma\nsse2"
    ).hexdigest()
    x86_v4 = runtime._parse_linux_cpu_identity(
        """vendor_id : GenuineIntel
cpu family : 6
model : 143
model name : Intel Xeon
stepping : 8
microcode : 0x123
flags : avx2 fma avx512f avx512cd avx512bw avx512dq avx512vl
"""
    )
    assert x86_v4["raw_avx512f_present"] is True
    assert x86_v4["raw_x86_v4_flag_set_present"] is True
    with pytest.raises(RuntimeError, match="identity is incomplete"):
        runtime._parse_linux_cpu_identity("vendor_id : GenuineIntel\n")
    with pytest.raises(RuntimeError, match="repeats 'vendor_id'"):
        runtime._parse_linux_cpu_identity(
            """vendor_id : GenuineIntel
vendor_id : AuthenticAMD
cpu family : 6
model : 143
model name : CPU
stepping : 8
flags : avx2 fma
"""
        )


def test_ci_runtime_accepts_only_the_exact_single_thread_haswell_pool(
    monkeypatch, capsys
):
    _configure_valid_runtime(monkeypatch)
    assert runtime.main() == 0
    output = json.loads(capsys.readouterr().out)
    assert output["openblas_coretype"] == "Haswell"
    assert (
        output["numpy_disabled_cpu_features"]
        == runtime.EXPECTED_NUMPY_DISABLED_CPU_FEATURES
    )
    assert tuple(output["numpy_cpu_baseline"]) == runtime.EXPECTED_NUMPY_CPU_BASELINE
    assert tuple(output["numpy_cpu_dispatch"]) == runtime.EXPECTED_NUMPY_CPU_DISPATCH
    assert tuple(output["numpy_cpu_effective_dispatch"]) == (
        runtime.EXPECTED_NUMPY_EFFECTIVE_DISPATCH
    )
    assert {"VAES", "VPCLMULQDQ"} <= set(output["numpy_cpu_features_enabled"])


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        ("missing_thread_limit", "thread limits"),
        ("wrong_coretype", "core type"),
        ("missing_openblas", "did not load OpenBLAS"),
        ("multiple_threads", "non-single-threaded"),
        ("wrong_architecture", "architecture"),
        ("missing_numpy_mask", "NumPy CPU feature mask"),
        ("missing_x86_v3", "effective dispatch inventory"),
        ("x86_v4_enabled", "effective dispatch inventory"),
        ("baseline_drift", "baseline inventory"),
        ("unknown_x86_v5", "compiled dispatch inventory"),
        ("wrong_platform", "requires Linux x86_64"),
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
    elif mutation == "wrong_architecture":
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
    elif mutation == "missing_numpy_mask":
        monkeypatch.delenv("NPY_DISABLE_CPU_FEATURES")
    elif mutation == "missing_x86_v3":
        monkeypatch.setattr(
            runtime,
            "NUMPY_CPU_FEATURES",
            {**runtime.NUMPY_CPU_FEATURES, "X86_V3": False},
        )
    elif mutation == "x86_v4_enabled":
        monkeypatch.setattr(
            runtime,
            "NUMPY_CPU_FEATURES",
            {**runtime.NUMPY_CPU_FEATURES, "X86_V4": True},
        )
    elif mutation == "baseline_drift":
        monkeypatch.setattr(runtime, "NUMPY_CPU_BASELINE", ("X86_V2", "X86_V3"))
    elif mutation == "unknown_x86_v5":
        monkeypatch.setattr(
            runtime,
            "NUMPY_CPU_DISPATCH",
            (*runtime.NUMPY_CPU_DISPATCH, "X86_V5"),
        )
        monkeypatch.setattr(
            runtime,
            "NUMPY_CPU_FEATURES",
            {**runtime.NUMPY_CPU_FEATURES, "X86_V5": True},
        )
    else:
        monkeypatch.setattr(runtime.platform, "system", lambda: "Darwin")
    with pytest.raises(RuntimeError, match=message):
        runtime.main()
