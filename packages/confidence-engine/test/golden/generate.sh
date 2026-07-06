#!/usr/bin/env bash
# Regenerates the golden fixtures for the confidence-engine porting parity
# gates (OpenSpec change add-confidence-engine-workspace, task 1.2).
#
# Every spine module hardcodes generated_at, so these outputs are fully
# deterministic: regenerating on an unchanged scripts/ tree must be a no-op.
# Run from anywhere inside the repo; requires the shared workspace build.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
OUT="packages/confidence-engine/test/golden"
mkdir -p "$OUT"
rm -f "$OUT/16-bayesian-hardening-orchestrator.json"

npm run build --workspace shared > /dev/null
npm run build --workspace packages/confidence-engine > /dev/null

PACKET="docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json"
FIXTURE="docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json"
DESIGN="docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md"
WINDOWS="docs/contracts/ai-value-contribution-alignment-internal-bayesian-execution-runtime/examples/aggregate-window-runtime-fixture.json"

run() { node "scripts/run_ai_value_contribution_alignment_$1.mjs" "${@:2}"; }

# Upstream input record (research lineage; not ported, stored as chain input)
run internal_research_math_data_model "$PACKET" \
  --source-fixture="$FIXTURE" --research-design="$DESIGN" \
  > "$OUT/00-internal-research-math-data-model.json"

run feature_stability_review - < "$OUT/00-internal-research-math-data-model.json" \
  > "$OUT/01-feature-stability-review.json"
run internal_numeric_weight_decision - < "$OUT/01-feature-stability-review.json" \
  > "$OUT/02-internal-numeric-weight-decision.json"
run versioned_weight_object - < "$OUT/02-internal-numeric-weight-decision.json" \
  > "$OUT/03-versioned-weight-object.json"
run weighted_internal_model_frame - < "$OUT/03-versioned-weight-object.json" \
  > "$OUT/04-weighted-internal-model-frame.json"
run internal_bayesian_readiness_review - < "$OUT/04-weighted-internal-model-frame.json" \
  > "$OUT/05-internal-bayesian-readiness-review.json"
run bayesian_model_specification - < "$OUT/05-internal-bayesian-readiness-review.json" \
  > "$OUT/06-bayesian-model-specification.json"
run internal_bayesian_execution_gate - < "$OUT/06-bayesian-model-specification.json" \
  > "$OUT/07-internal-bayesian-execution-gate.json"
run internal_bayesian_execution_runtime \
  "$OUT/07-internal-bayesian-execution-gate.json" "$WINDOWS" \
  > "$OUT/08-internal-bayesian-execution-runtime.json"
run internal_bayesian_execution_runtime \
  "$OUT/07-internal-bayesian-execution-gate.json" "$WINDOWS" --source-envelope \
  > "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json"
run governed_diagnostics_sufficiency_evidence_source - \
  < "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  > "$OUT/10-governed-diagnostics-sufficiency-evidence-source.json"
run diagnostics_evidence_packet - \
  < "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  > "$OUT/11-diagnostics-evidence-packet.json"
run internal_diagnostics_model_adequacy_review \
  "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  > "$OUT/12-internal-diagnostics-model-adequacy-review.json"
run posterior_output_review_gate - \
  < "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  > "$OUT/13-posterior-output-review-gate.json"
run bayesian_promotion_decision_gate \
  "$OUT/12-internal-diagnostics-model-adequacy-review.json" \
  "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  "$OUT/11-diagnostics-evidence-packet.json" \
  > "$OUT/14-bayesian-promotion-decision-gate.json"
run promotion_gate_passed_artifact_handoff \
  "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  > "$OUT/15-promotion-gate-passed-artifact-handoff.json"
run internal_bayesian_execution_artifact_v1 \
  "$OUT/15-promotion-gate-passed-artifact-handoff.json" \
  "$OUT/14-bayesian-promotion-decision-gate.json" \
  "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  "$OUT/12-internal-diagnostics-model-adequacy-review.json" \
  "$OUT/11-diagnostics-evidence-packet.json" \
  "$OUT/10-governed-diagnostics-sufficiency-evidence-source.json" \
  > "$OUT/16-internal-bayesian-execution-artifact-v1.json"
run bayesian_hardening_orchestrator - \
  < "$OUT/09-internal-bayesian-execution-runtime-source-envelope.json" \
  "$OUT/10-governed-diagnostics-sufficiency-evidence-source.json" \
  "$OUT/11-diagnostics-evidence-packet.json" \
  "$OUT/12-internal-diagnostics-model-adequacy-review.json" \
  "$OUT/14-bayesian-promotion-decision-gate.json" \
  "$OUT/15-promotion-gate-passed-artifact-handoff.json" \
  "$OUT/16-internal-bayesian-execution-artifact-v1.json" \
  > "$OUT/17-bayesian-hardening-orchestrator.json"

echo "golden fixtures written to $OUT"
