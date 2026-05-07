#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

TARGET_FILES=(
  "README.md"
  "docs/en/README.md"
  "docs/api/ingest.md"
  "docs/api/API_REFERENCE.md"
  "docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md"
  "docs/contracts/evidence-bundle/v1/README.md"
  "docs/integrations/glean/01-overview.md"
  "docs/integrations/glean/02-evidencebundle-to-glean-indexing.md"
  "docs/integrations/glean/03-glean-agent-tooling.md"
  "docs/integrations/glean/04-security-and-audit.md"
  "docs/integrations/glean/05-acceptance-tests.md"
  "docs/mcp/fluencytracr-mcp-server.md"
)

missing=0

check_link() {
  local src="$1"
  local link="$2"

  if [[ "$link" =~ ^https?:// || "$link" =~ ^mailto: || "$link" =~ ^# ]]; then
    return 0
  fi

  local base
  base="$(dirname "$src")"
  local candidate
  candidate="$(cd "$base" && cd "$(dirname "$link")" 2>/dev/null && pwd)/$(basename "$link")" || true

  if [[ -z "${candidate}" ]]; then
    echo "[linkcheck] Missing path from ${src}: ${link}" >&2
    missing=1
    return 0
  fi

  if [[ ! -f "$candidate" && ! -d "$candidate" ]]; then
    echo "[linkcheck] Missing path from ${src}: ${link}" >&2
    missing=1
  fi
}

echo "[linkcheck] Checking scoped FluencyTracr docs links..."
for file in "${TARGET_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "[linkcheck] Target file not found: $file" >&2
    missing=1
    continue
  fi

  while IFS= read -r link; do
    check_link "$file" "$link"
  done < <(rg -o "\[[^]]+\]\(([^)]+)\)" "$file" | sed -E 's/.*\(([^)]+)\).*/\1/' | sort -u)
done

if [[ "$missing" -ne 0 ]]; then
  echo "[linkcheck] Failed." >&2
  exit 1
fi

echo "[linkcheck] Passed."
