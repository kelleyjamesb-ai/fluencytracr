from dataclasses import dataclass
from typing import Protocol, Dict


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    duration: float
    meta: Dict[str, object]


class CodeSandbox(Protocol):
    """Abstract interface for any execution environment."""

    def execute(
        self,
        code: str,
        language: str = "python",
        timeout: int = 30,
    ) -> ExecutionResult:
        """
        Execute the provided code synchronously.
        Must handle timeouts and capture Stdout/Stderr.
        """
        ...


def normalize_timeout(
    timeout: object,
    default: int = 30,
    min_seconds: int = 1,
    max_seconds: int = 600,
) -> int:
    """Return a bounded timeout with safe fallbacks.

    Invalid values, non-numeric values, and non-positive values fall back
    to a sane default to avoid immediate failures.
    """
    try:
        safe_default = int(default)
    except Exception:
        safe_default = 30

    if safe_default < min_seconds:
        safe_default = min_seconds

    try:
        value = int(timeout)
    except Exception:
        return safe_default

    if value < min_seconds:
        return safe_default

    return min(value, max_seconds)
