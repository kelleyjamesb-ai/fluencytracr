# Code execution sandbox

Agent-supplied Python runs through `get_sandbox()` in `factory.py`.

## Modes

| `SANDBOX_TYPE` | Behavior |
| --- | --- |
| `local` | `subprocess` + current interpreter, temp dir, timeout and output caps. **Not isolated**—equivalent to running code as the current OS user. |
| `docker` | Container with optional CPU/memory limits; network off by default. **Preferred** for anything beyond a single trusted machine. |
| `e2b` | Reserved for future E2B integration (loads if `e2b_exec` is present). |

## Defaults

- **Development** (`ENVIRONMENT` / `APP_ENV` unset or not production-like): default is **`local`** unless you set `SANDBOX_TYPE`.
- **Production-like** (`ENVIRONMENT` or `APP_ENV` is `production`, `staging`, or `prod`): default is **`docker`** when `SANDBOX_TYPE` is unset.

## Disallowing local

Set `SANDBOX_ALLOW_LOCAL=false` to refuse the local runtime. Resolution moves to `docker`; if Docker is unavailable, `get_sandbox()` raises `RuntimeError` instead of silently falling back.

## Related environment variables

- `DOCKER_IMAGE`, `DOCKER_NETWORK_ENABLED`, `DOCKER_CPU_LIMIT`, `DOCKER_MEMORY_LIMIT` — see `docker_exec.py`.
- `SANDBOX_TIMEOUT_SEC`, `SANDBOX_MAX_OUTPUT_KB` — see `local.py` / execution tool.
