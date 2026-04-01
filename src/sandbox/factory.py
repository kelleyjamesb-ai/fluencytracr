import os

from .base import CodeSandbox
from .local import LocalSandbox


def _environment_is_production_like() -> bool:
    env = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "").strip().lower()
    return env in ("production", "staging", "prod")


def _sandbox_allow_local() -> bool:
    raw = (os.getenv("SANDBOX_ALLOW_LOCAL") or "true").strip().lower()
    return raw in ("1", "true", "yes", "")


def get_sandbox() -> CodeSandbox:
    """Return the configured code execution sandbox.

    Environment variables:

    - ``SANDBOX_TYPE``: ``local`` | ``docker`` | ``e2b``. If unset and
      ``ENVIRONMENT`` / ``APP_ENV`` is ``production``, ``staging``, or ``prod``,
      defaults to ``docker``. Otherwise defaults to ``local``.
    - ``SANDBOX_ALLOW_LOCAL``: If ``false``, the ``local`` runtime is not used;
      resolution falls through to ``docker`` (or raises if Docker cannot be used).

    Local execution runs arbitrary code with host interpreter privileges—use only
    in trusted development environments. Prefer ``docker`` for shared or
    production-like deployments. See ``src/sandbox/README.md``.
    """
    explicit = os.getenv("SANDBOX_TYPE")
    production_like = _environment_is_production_like()
    allow_local = _sandbox_allow_local()

    if explicit is not None:
        mode = explicit.strip().lower()
    elif production_like:
        mode = "docker"
    else:
        mode = "local"

    if mode == "local" and not allow_local:
        mode = "docker"

    if mode == "docker":
        try:
            from .docker_exec import DockerSandbox  # type: ignore

            return DockerSandbox()
        except Exception as exc:
            if production_like or explicit == "docker" or not allow_local:
                raise RuntimeError(
                    "Docker sandbox is required (production-like ENVIRONMENT, "
                    "SANDBOX_ALLOW_LOCAL=false, or SANDBOX_TYPE=docker) but Docker "
                    f"is not available: {exc}. Install the Docker SDK, start the "
                    "daemon, or set SANDBOX_TYPE=local only in trusted dev."
                ) from exc
            return LocalSandbox()

    if mode == "e2b":
        try:
            from .e2b_exec import E2BSandbox  # type: ignore

            return E2BSandbox()
        except Exception as exc:
            if production_like or not allow_local:
                raise RuntimeError(
                    "SANDBOX_TYPE=e2b was requested but the E2B sandbox could not "
                    f"be loaded: {exc}"
                ) from exc
            return LocalSandbox()

    return LocalSandbox()
