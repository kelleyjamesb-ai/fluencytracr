#!/usr/bin/env bash
set -euo pipefail

# Customer-owned example: raw GCE stays in the customer environment. This
# script posts only aggregate JSON payloads to FluencyTracr.

: "${GCE_PROJECT:?set GCE_PROJECT}"
: "${GCE_DATASET:?set GCE_DATASET}"
: "${GCE_TABLE:?set GCE_TABLE}"
: "${FLUENCYTRACR_URL:?set FLUENCYTRACR_URL}"
: "${FLUENCYTRACR_ORG_ID:?set FLUENCYTRACR_ORG_ID}"
: "${FLUENCYTRACR_COHORT_ID:?set FLUENCYTRACR_COHORT_ID}"

WINDOW_END="$(date -u +%Y-%m-%dT00:00:00Z)"
WINDOW_START="$(date -u -v-60d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '60 days ago' +%Y-%m-%dT00:00:00Z)"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/fluencytracr-v3}"

python transformer/glean_gce_transformer.py \
  --project "$GCE_PROJECT" \
  --dataset "$GCE_DATASET" \
  --table "$GCE_TABLE" \
  --window-start "$WINDOW_START" \
  --window-end "$WINDOW_END" \
  --cohort-id "$FLUENCYTRACR_COHORT_ID" \
  --calibration-id "${FLUENCYTRACR_CALIBRATION_ID:-scio-prod-60d-2026-05}" \
  --output-dir "$OUTPUT_DIR"

for payload in "$OUTPUT_DIR"/*.json; do
  curl -fsS -X POST "$FLUENCYTRACR_URL/api/v3/ingest/aggregate" \
    -H "Content-Type: application/json" \
    -H "x-role: ADMIN" \
    -H "x-org-id: $FLUENCYTRACR_ORG_ID" \
    --data-binary "@$payload"
done
