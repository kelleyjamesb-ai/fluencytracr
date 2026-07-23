#!/usr/bin/env python3
"""Fail closed unless the inference CI process has the pinned native runtime."""

from __future__ import annotations

import hashlib
import json
import os
import platform
from pathlib import Path

import numpy as np
import scipy
from numpy._core import _multiarray_umath
from threadpoolctl import threadpool_info


THREAD_ENV_KEYS = (
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
    "OMP_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
)
EXPECTED_OPENBLAS_CORETYPE = "Haswell"
EXPECTED_NUMPY_CPU_BASELINE = ("X86_V2",)
EXPECTED_NUMPY_CPU_DISPATCH = (
    "X86_V3",
    "X86_V4",
    "AVX512_ICL",
    "AVX512_SPR",
)
EXPECTED_NUMPY_EFFECTIVE_DISPATCH = ("X86_V3",)
EXPECTED_NUMPY_DISABLED_CPU_FEATURE_SET = frozenset(
    set(EXPECTED_NUMPY_CPU_DISPATCH) - set(EXPECTED_NUMPY_EFFECTIVE_DISPATCH)
)
EXPECTED_NUMPY_DISABLED_CPU_FEATURES = ",".join(
    sorted(EXPECTED_NUMPY_DISABLED_CPU_FEATURE_SET)
)
NUMPY_CPU_BASELINE = tuple(_multiarray_umath.__cpu_baseline__)
NUMPY_CPU_DISPATCH = tuple(_multiarray_umath.__cpu_dispatch__)
NUMPY_CPU_FEATURES = dict(_multiarray_umath.__cpu_features__)


def _parse_linux_cpu_identity(cpuinfo: str) -> dict[str, object]:
    first_cpu = cpuinfo.split("\n\n", 1)[0]
    fields = {}
    for line in first_cpu.splitlines():
        if ":" not in line:
            continue
        key, value = (item.strip() for item in line.split(":", 1))
        if key in fields:
            raise RuntimeError(f"inference CI Linux CPU identity repeats {key!r}")
        fields[key] = value
    flags = tuple(sorted(fields.get("flags", "").split()))
    required = ("vendor_id", "cpu family", "model", "stepping", "model name")
    if any(not fields.get(key) for key in required) or not flags:
        raise RuntimeError("inference CI Linux CPU identity is incomplete")
    x86_v4_flags = {"avx512f", "avx512cd", "avx512bw", "avx512dq", "avx512vl"}
    return {
        "status": "observed_non_authoritative",
        "vendor_id": fields["vendor_id"],
        "cpu_family": fields["cpu family"],
        "model": fields["model"],
        "stepping": fields["stepping"],
        "model_name": fields["model name"],
        "microcode": fields.get("microcode"),
        "raw_avx512f_present": "avx512f" in flags,
        "raw_x86_v4_flag_set_present": x86_v4_flags <= set(flags),
        "flags_count": len(flags),
        "flags_sha256": hashlib.sha256("\n".join(flags).encode("ascii")).hexdigest(),
    }


def _linux_cpu_identity() -> dict[str, object]:
    if platform.system() != "Linux" or platform.machine() != "x86_64":
        return {
            "status": "unsupported",
            "system": platform.system(),
            "machine": platform.machine(),
        }
    try:
        cpuinfo = Path("/proc/cpuinfo").read_text(encoding="utf-8")
    except OSError as error:
        raise RuntimeError("inference CI cannot read Linux CPU identity") from error
    return _parse_linux_cpu_identity(cpuinfo)


def main() -> int:
    np.linalg.solve(np.eye(2), np.ones(2))
    environment = {key: os.environ.get(key) for key in THREAD_ENV_KEYS}
    pools = threadpool_info()
    openblas_pools = [
        pool for pool in pools if pool.get("internal_api") == "openblas"
    ]
    enabled_numpy_features = tuple(
        sorted(name for name, enabled in NUMPY_CPU_FEATURES.items() if enabled)
    )
    effective_numpy_dispatch = tuple(
        name for name in NUMPY_CPU_DISPATCH if NUMPY_CPU_FEATURES.get(name, False)
    )
    print(
        json.dumps(
            {
                "platform": platform.platform(),
                "machine": platform.machine(),
                "python": platform.python_version(),
                "numpy": np.__version__,
                "numpy_cpu_baseline": NUMPY_CPU_BASELINE,
                "numpy_cpu_dispatch": NUMPY_CPU_DISPATCH,
                "numpy_cpu_effective_dispatch": effective_numpy_dispatch,
                "numpy_cpu_features_enabled": enabled_numpy_features,
                "numpy_disabled_cpu_features": os.environ.get("NPY_DISABLE_CPU_FEATURES"),
                "scipy": scipy.__version__,
                "openblas_coretype": os.environ.get("OPENBLAS_CORETYPE"),
                "linux_cpu_identity": _linux_cpu_identity(),
                "thread_environment": environment,
                "thread_pools": pools,
            },
            sort_keys=True,
        )
    )
    if set(environment.values()) != {"1"}:
        raise RuntimeError("inference CI thread limits are not all exactly one")
    if platform.system() != "Linux" or platform.machine() != "x86_64":
        raise RuntimeError("inference CI normalized profile requires Linux x86_64")
    if os.environ.get("OPENBLAS_CORETYPE") != EXPECTED_OPENBLAS_CORETYPE:
        raise RuntimeError("inference CI OpenBLAS core type is not pinned")
    mask_value = os.environ.get("NPY_DISABLE_CPU_FEATURES")
    mask_tokens = frozenset(mask_value.split(",")) if mask_value else frozenset()
    if (
        mask_value != EXPECTED_NUMPY_DISABLED_CPU_FEATURES
        or mask_tokens != EXPECTED_NUMPY_DISABLED_CPU_FEATURE_SET
        or any(name not in NUMPY_CPU_DISPATCH for name in mask_tokens)
    ):
        raise RuntimeError("inference CI NumPy CPU feature mask is not pinned")
    if NUMPY_CPU_BASELINE != EXPECTED_NUMPY_CPU_BASELINE:
        raise RuntimeError("inference CI NumPy baseline inventory is not exact")
    if NUMPY_CPU_DISPATCH != EXPECTED_NUMPY_CPU_DISPATCH:
        raise RuntimeError("inference CI NumPy compiled dispatch inventory is not exact")
    if effective_numpy_dispatch != EXPECTED_NUMPY_EFFECTIVE_DISPATCH:
        raise RuntimeError("inference CI NumPy effective dispatch inventory is not exact")
    if not openblas_pools:
        raise RuntimeError("inference CI did not load OpenBLAS")
    if any(pool.get("num_threads") != 1 for pool in pools):
        raise RuntimeError("inference CI loaded a non-single-threaded native pool")
    if {
        pool.get("architecture") for pool in openblas_pools
    } != {EXPECTED_OPENBLAS_CORETYPE}:
        raise RuntimeError("inference CI OpenBLAS architecture is not Haswell")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
