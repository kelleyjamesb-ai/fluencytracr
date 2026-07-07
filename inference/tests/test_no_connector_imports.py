"""No-connector guard (task 3.6, skeleton portion).

Static source scan asserting that no module under the
``fluencytracr_inference`` package imports network clients or data
connectors. The harness is synthetic-only: no requests, urllib3,
http.client, google.cloud, BigQuery, or raw sockets. This scans the
package source directory in the repo, not site-packages.
"""

import ast
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent.parent / "src" / "fluencytracr_inference"

FORBIDDEN_TOP_LEVEL = {
    "requests",
    "urllib3",
    "urllib",
    "http",
    "socket",
    "aiohttp",
    "httpx",
    "ftplib",
    "smtplib",
    "telnetlib",
    "xmlrpc",
}

FORBIDDEN_PREFIXES = (
    "google.cloud",
    "google.bigquery",
    "http.client",
    "urllib.request",
)

FORBIDDEN_SUBSTRINGS = ("bigquery",)


def _forbidden_reason(module_name: str) -> str | None:
    top_level = module_name.split(".")[0]
    if top_level in FORBIDDEN_TOP_LEVEL:
        return f"forbidden top-level module '{top_level}'"
    for prefix in FORBIDDEN_PREFIXES:
        if module_name == prefix or module_name.startswith(prefix + "."):
            return f"forbidden module prefix '{prefix}'"
    for fragment in FORBIDDEN_SUBSTRINGS:
        if fragment in module_name.lower():
            return f"forbidden connector fragment '{fragment}'"
    return None


def _imported_modules(tree: ast.AST):
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                yield alias.name, node.lineno
        elif isinstance(node, ast.ImportFrom):
            # Relative imports (level > 0) stay inside the package.
            if node.level == 0 and node.module is not None:
                yield node.module, node.lineno


def test_package_source_directory_exists():
    assert PACKAGE_DIR.is_dir(), f"package source directory missing: {PACKAGE_DIR}"
    sources = list(PACKAGE_DIR.rglob("*.py"))
    assert sources, "package contains no Python sources to scan"


def test_no_connector_or_network_imports():
    violations = []
    for source_path in sorted(PACKAGE_DIR.rglob("*.py")):
        tree = ast.parse(source_path.read_text(encoding="utf-8"), filename=str(source_path))
        for module_name, lineno in _imported_modules(tree):
            reason = _forbidden_reason(module_name)
            if reason is not None:
                violations.append(f"{source_path}:{lineno}: imports '{module_name}' ({reason})")
    assert not violations, "connector/network imports found:\n" + "\n".join(violations)
