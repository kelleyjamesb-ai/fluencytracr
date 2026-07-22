#!/usr/bin/env python3
"""Fail closed unless the inference CI process has the pinned native runtime."""

from __future__ import annotations

import json
import os
import platform

import numpy as np
import scipy
from threadpoolctl import threadpool_info


THREAD_ENV_KEYS = (
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
    "OMP_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
)
EXPECTED_OPENBLAS_CORETYPE = "Haswell"


def main() -> int:
    np.linalg.solve(np.eye(2), np.ones(2))
    environment = {key: os.environ.get(key) for key in THREAD_ENV_KEYS}
    pools = threadpool_info()
    openblas_pools = [
        pool for pool in pools if pool.get("internal_api") == "openblas"
    ]
    print(
        json.dumps(
            {
                "platform": platform.platform(),
                "machine": platform.machine(),
                "python": platform.python_version(),
                "numpy": np.__version__,
                "scipy": scipy.__version__,
                "openblas_coretype": os.environ.get("OPENBLAS_CORETYPE"),
                "thread_environment": environment,
                "thread_pools": pools,
            },
            sort_keys=True,
        )
    )
    if set(environment.values()) != {"1"}:
        raise RuntimeError("inference CI thread limits are not all exactly one")
    if os.environ.get("OPENBLAS_CORETYPE") != EXPECTED_OPENBLAS_CORETYPE:
        raise RuntimeError("inference CI OpenBLAS core type is not pinned")
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
