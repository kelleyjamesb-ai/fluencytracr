# Confidence-Engine Workspace

Approved by the OpenSpec change `add-confidence-engine-workspace`, this
contract promotes the 16-module contribution-alignment Bayesian execution
spine out of loose `scripts/` runners and into the typed, workspace-versioned
npm package `packages/confidence-engine` (`@fluencytracr/confidence-engine`,
TypeScript + Zod). The port is a packaging refactor only: every emitted
artifact stays byte-identical to the original `.mjs` output, and the original
spine `scripts/run_ai_value_contribution_alignment_*.mjs` runners remain in
place as thin wrappers over the workspace build, preserving their CLI usage
and named public module exports. The research/prototype decision-record
scripts (immutable, hash-chained history) are not ported and stay in
`scripts/` untouched.

- Workspace: `packages/confidence-engine`
- Frozen porting inventory (module list, schema versions, hash edges):
  `packages/confidence-engine/PORTING.md`
- Test entry point: `npm run test:confidence-engine-workspace`
- Anchoring observation-lane contract:
  `docs/contracts/ai-value-confidence-engine-series-read-path-decision/README.md`

## Byte-compatibility contract

The port preserves, exactly and provably:

- **Schema version strings** — all 16 spine schema versions, from
  `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_2026_06`
  through
  `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_2026_06`,
  as frozen in `packages/confidence-engine/PORTING.md`. Any of these strings
  changing during the port is a porting defect, not an update.
- **State tokens** — ready/hold/reject states are carried verbatim, including
  the runtime's held state
  `INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW`.
- **Hashes and property insertion order** — every artifact self-hashes as
  `sha256(stableStringify(object minus its own *_hash field))` and embeds its
  upstream `..._hash` refs; the ported modules reproduce the identical stable
  stringification, field insertion order, and hash-chain bindings.

Enforcement is the golden-fixture chain plus per-module parity gates:

- `packages/confidence-engine/test/golden/` holds the canonical chain outputs
  (`00-internal-research-math-data-model.json` through
  `17-bayesian-hardening-orchestrator.json`).
  `test/golden/generate.sh` regenerates the full chain; because every spine
  module hardcodes `generated_at` and uses no randomness, regeneration on an
  unchanged `scripts/` tree must be a byte-for-byte no-op.
- Each ported module has a `*_parity.test.mjs` suite asserting that the
  workspace output equals the `.mjs` output, hashes included, before the next
  module ports; `test/hashing_parity.test.mjs` proves the shared hashing
  helpers first.
- The spine's validation test suites migrate into the workspace test runner
  (`test/validate_ai_value_contribution_alignment_*.test.mjs`) so the same
  boundary and governance assertions keep running against the ported code.

## What this contract does not change or authorize

- No model math changes, no prior changes, no gate-semantics changes. All
  held states stay held and promotion stays blocked exactly as before the
  port.
- No new outputs: posterior interpretation, confidence/probability/score
  output, customer/finance output, ROI, causality, and productivity output
  remain blocked, as do routes, UI, schemas of emitted artifacts,
  persistence, exports, rendered readouts, and live
  BigQuery/Sigma/Glean/customer connectors.
- The `ConfidenceModel` contract module (prior, evidence admission with
  machine-readable reason codes aligned to the confidence-engine series
  read-path decision contract, and credible-interval posterior
  representation) is types + Zod schemas only — it introduces no execution
  behavior.
- Executing the model on real observations, the Series snapshot
  implementation decision, and the statistical methodology itself stay out of
  scope (separate workstreams behind their own gates).

## Layout

- `packages/confidence-engine/src/` — the 16 spine modules in dependency
  order (`featureStabilityReview.ts` → `internalNumericWeightDecision.ts` →
  `versionedWeightObject.ts` → `weightedInternalModelFrame.ts` →
  `internalBayesianReadinessReview.ts` → `bayesianModelSpecification.ts` →
  `internalBayesianExecutionGate.ts` → `internalBayesianExecutionRuntime.ts`
  → `governedDiagnosticsSufficiencyEvidenceSource.ts` →
  `diagnosticsEvidencePacket.ts` →
  `internalDiagnosticsModelAdequacyReview.ts` →
  `posteriorOutputReviewGate.ts` → `bayesianPromotionDecisionGate.ts` →
  `promotionGatePassedArtifactHandoff.ts` →
  `internalBayesianExecutionArtifactV1.ts` →
  `bayesianHardeningOrchestrator.ts`), the shared hashing/boundary helpers in
  `src/internal/hashing.ts`, and the types-only `ConfidenceModel` contract
  module.
- `packages/confidence-engine/test/` — per-module parity suites, migrated
  validation suites, and `test/golden/` fixtures with `generate.sh`.
- `scripts/run_ai_value_contribution_alignment_*.mjs` (spine modules only) —
  thin wrappers over the workspace build at cutover; every existing
  `npm run run:ai-value-contribution-alignment-*` chain and CLI invocation
  keeps working unchanged. The wrappers import
  `packages/confidence-engine/dist/`, which is not committed; the workspace
  `prepare` script compiles it automatically during `npm ci` / `npm install`
  at the repo root, so standalone `node scripts/run_*.mjs` works from a fresh
  checkout after install. Running a wrapper before any install requires
  `npm run build --workspace packages/confidence-engine` first.
- Root `package.json` — workspace entry plus
  `test:confidence-engine-workspace`, which runs the workspace build and its
  full test suite (`npm run test --workspace packages/confidence-engine`).

## Verification

A reviewer can prove the contract from the repo root:

```bash
# Build the workspace and run all parity + migrated validation suites
npm run test:confidence-engine-workspace

# Determinism: regeneration must be a no-op on an unchanged scripts/ tree
bash packages/confidence-engine/test/golden/generate.sh
git status --short packages/confidence-engine/test/golden

# Frozen inventory the port must match
cat packages/confidence-engine/PORTING.md

# Spec gate
npx openspec validate add-confidence-engine-workspace --strict
```

## Change history

- OpenSpec change: `add-confidence-engine-workspace`
  (`openspec/changes/add-confidence-engine-workspace/`). Decision owner:
  James Kelley; approval recorded 2026-07-02. The porting freeze, merge
  collision fix record for
  `governed_diagnostics_sufficiency_evidence_source.mjs`, and the frozen
  schema-version/hash-edge tables live in
  `packages/confidence-engine/PORTING.md`.
