#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_PATH="${ROOT_DIR}/docs/contracts/evidence-bundle/v1/evidence-bundle.schema.json"
EXAMPLES_DIR="${ROOT_DIR}/docs/contracts/evidence-bundle/v1/examples"

if [[ ! -f "${SCHEMA_PATH}" ]]; then
  echo "Missing schema file: ${SCHEMA_PATH}" >&2
  exit 1
fi

if [[ ! -d "${EXAMPLES_DIR}" ]]; then
  echo "Missing examples directory: ${EXAMPLES_DIR}" >&2
  exit 1
fi

EXAMPLES=()
while IFS= read -r example; do
  EXAMPLES+=("${example}")
done < <(find "${EXAMPLES_DIR}" -maxdepth 1 -type f -name '*.json' | sort)
if [[ "${#EXAMPLES[@]}" -eq 0 ]]; then
  echo "No example JSON files found in ${EXAMPLES_DIR}" >&2
  exit 1
fi

node - "${SCHEMA_PATH}" "${EXAMPLES[@]}" <<'NODE'
const fs = require("fs");
const Ajv = require("ajv");

const [, , schemaPath, ...examplePaths] = process.argv;
if (!schemaPath || examplePaths.length === 0) {
  console.error("Usage error: schema and at least one example are required.");
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, schemaId: "auto" });
const validate = ajv.compile(schema);

let hasFailure = false;
for (const examplePath of examplePaths) {
  const payload = JSON.parse(fs.readFileSync(examplePath, "utf8"));
  const valid = validate(payload);
  if (!valid) {
    hasFailure = true;
    console.error(`INVALID: ${examplePath}`);
    for (const err of validate.errors || []) {
      const path = err.instancePath || err.dataPath || "/";
      console.error(`  - ${path} ${err.message}`);
    }
    continue;
  }
  console.log(`VALID: ${examplePath}`);
}

if (hasFailure) {
  process.exit(1);
}
NODE
