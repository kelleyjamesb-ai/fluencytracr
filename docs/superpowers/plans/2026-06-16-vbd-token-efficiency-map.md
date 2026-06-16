# VBD x Token Efficiency Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a governed VBD x Token Efficiency Map that combines aggregate VBD work-integration posture with aggregate token intensity/efficiency to emit strategy zones and caveats only.

**Architecture:** Add a shared AI Value engine composer/validator that accepts an existing Evidence Snapshot with `vbd_operating_map` plus a validated Token Efficiency Signal for the same org, window, workflow family, and approved aggregate grain. The output is a non-persisted aggregate strategy map: replicate, optimize, activate, mitigate, or hold. It must not compute ROI, productivity, causality, financial output, ranking, people decisioning, or customer-facing claims.

**Tech Stack:** TypeScript shared engine, Node test runner `.mjs`, JSON contract docs/examples, existing `validateEvidenceSnapshot`, `validateTokenEfficiencySignal`, and AI Value package scripts.

---

## File Structure

- Create `shared/src/aiValueEngine/vbdTokenEfficiencyMap.ts`
  - Owns schema version, builder, validator, zone derivation, privacy/claim guardrails, and non-persistence policy.
- Modify `shared/src/aiValueEngine/index.ts`
  - Re-export schema version, builder, validator, and types.
- Create `scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs`
  - Adds red/green tests for all strategy zones and governance failures.
- Modify `package.json`
  - Add `test:ai-value-vbd-token-efficiency-map`.
- Create `docs/contracts/ai-value-vbd-token-efficiency-map/README.md`
  - Documents purpose, inputs, strategy zones, allowed uses, blocked uses, and validation command.
- Create `docs/contracts/ai-value-vbd-token-efficiency-map/examples/valid-replicate-map.json`
  - Validator-backed example for high VBD + efficient token posture.
- Create `docs/contracts/ai-value-vbd-token-efficiency-map/examples/valid-mitigate-map.json`
  - Validator-backed example for low VBD + high token intensity posture.
- Create `docs/contracts/ai-value-vbd-token-efficiency-map/examples/held-map.json`
  - Validator-backed example preserving held/suppressed evidence.
- Modify `docs/contracts/ai-value-token-efficiency-signal/README.md`
  - Add a short relationship section pointing to the map contract and preserving the no-value-proof boundary.

## Subagent Roles

- **Code agent:** Own `shared/src/aiValueEngine/vbdTokenEfficiencyMap.ts`, export wiring, and package script.
- **Bug agent:** Own tests for failure modes, drift, k-min, suppressed evidence, and all no-output flags.
- **Adversarial agent:** Review docs/tests for accidental scoring, ranking, productivity, ROI, customer-facing financial output, or person/team interpretation.

## Strategy Zone Contract

Allowed `strategy_zone` values:

- `replicate_pattern`: high VBD posture + efficient token posture.
- `optimize_cost`: high VBD posture + high token intensity or inefficient token posture.
- `activate_workflow`: low or shallow VBD posture + efficient or moderate token posture.
- `mitigate_friction`: low or shallow VBD posture + high token intensity or inefficient token posture.
- `hold_for_evidence`: missing, held, suppressed, not-computed, k-min failed, unsafe privacy, or source mismatch.

Allowed `vbd_posture` values:

- `high_work_integration`
- `emerging_work_integration`
- `shallow_work_integration`
- `held`
- `suppressed`
- `unknown`

Allowed `token_posture` values:

- `efficient`
- `moderate`
- `high_intensity`
- `held`
- `suppressed`
- `unknown`

Required blocked uses:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

Required value-proof flags must be false:

- `map_is_roi_proof`
- `map_is_productivity_proof`
- `map_is_financial_output`
- `map_computes_causality`
- `map_allows_person_or_team_comparison`
- `downstream_claim_strength_upgrade_allowed`

## Task 1: Write Failing Strategy-Zone Tests

**Files:**
- Create: `scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs`

- [ ] **Step 1: Add test imports and fixture helpers**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTokenEfficiencySignalFromAggregateSummary,
  buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal,
  validateEvidenceSnapshot,
  validateTokenEfficiencySignal,
  validateVbdTokenEfficiencyMap
} from "../shared/dist/aiValueEngine/index.js";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const SNAPSHOT = "docs/contracts/ai-value-evidence-snapshot/examples/full-playbook-snapshot.json";

function baseSnapshot(overrides = {}) {
  const snapshot = clone(readJson(SNAPSHOT));
  return {
    ...snapshot,
    org_id: "org_northstar_support",
    workflow_family: "customer_support",
    covered_window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    privacy_boundary: {
      ...snapshot.privacy_boundary,
      approved_aggregate_grain: "function"
    },
    vbd_operating_map: {
      velocity: {
        state: "high",
        evidence_state: "present",
        source_signals: ["workflow_run_count", "active_user_aggregate"],
        caveats: ["Velocity is aggregate Layer 1 posture only."]
      },
      breadth: {
        state: "broad",
        approved_aggregate_grain: "function",
        covered_slices: 6,
        suppressed_or_unknown_slices: 0,
        caveats: ["Breadth is aggregate-only."]
      },
      depth: {
        state: "embedded",
        evidence_state: "present",
        source_signals: ["agent_lifecycle_activity", "artifact_output_metadata"],
        requires_layer_3_for_value_claim: true,
        caveats: ["Depth is work-integration posture only."]
      },
      operating_mode: "high_fluency_flow",
      contributes_to_playbook_layer: "layer_1_platform_telemetry",
      allowed_interpretation: [
        "ai_fluency_posture",
        "layer_1_operating_signal",
        "evidence_collection_planning"
      ],
      blocked_interpretation: [
        "realized_roi",
        "ebita_claim",
        "causality_claim",
        "productivity_claim",
        "headcount_reduction_claim",
        "individual_attribution",
        "manager_or_team_ranking",
        "people_decisioning",
        "customer_facing_financial_output"
      ]
    },
    required_caveats: [
      ...snapshot.required_caveats,
      "High fluency flow is Layer 1 posture only and is not full value proof."
    ],
    ...overrides
  };
}

function tokenSignal(overrides = {}) {
  return buildTokenEfficiencySignalFromAggregateSummary(
    {
      org_id: "org_northstar_support",
      workflow_family: "customer_support",
      covered_window: {
        window_start: "2026-05-01",
        window_end: "2026-05-31"
      },
      approved_aggregate_grain: "function",
      minimum_cohort_threshold: 5,
      k_min_posture: {
        minimum_cohort_threshold: 5,
        cohort_threshold_met: true,
        total_slices: 6,
        k_min_clear_slices: 6,
        suppressed_or_unknown_slices: 0
      },
      aggregate_token_summary: {
        total_prompt_tokens: 120000,
        total_completion_tokens: 42000,
        total_tokens: 162000,
        aggregate_interaction_count: 840,
        aggregate_workflow_count: 120,
        high_intensity_workflow_share: 0.18,
        average_tokens_per_interaction: 193,
        average_tokens_per_workflow: 1350,
        prompt_to_completion_ratio: 2.85
      },
      source_refs: {
        aggregate_probe_id: "token_probe_customer_support_2026_05",
        source_readiness_id: "source_readiness_token_usage_2026_05"
      },
      source_owner_attestation: {
        attestation_state: "attested",
        attested_by_role: "customer_data_owner",
        attested_at: "2026-06-16T00:00:00.000Z",
        caveats: []
      },
      ...overrides
    },
    {
      signalId: "token_efficiency_signal_support_2026_05",
      generatedAt: "2026-06-16T00:00:00.000Z"
    }
  );
}
```

- [ ] **Step 2: Add zone tests**

```js
test("high VBD plus efficient token posture maps to replicate pattern", () => {
  const snapshot = baseSnapshot();
  const signal = tokenSignal();
  assert.equal(validateEvidenceSnapshot(snapshot).valid, true);
  assert.equal(validateTokenEfficiencySignal(signal).valid, true);

  const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(snapshot, signal, {
    mapId: "vbd_token_efficiency_map_replicate",
    generatedAt: "2026-06-16T00:00:00.000Z"
  });

  const result = validateVbdTokenEfficiencyMap(map);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(map.strategy_zone, "replicate_pattern");
  assert.equal(map.vbd_posture, "high_work_integration");
  assert.equal(map.token_posture, "efficient");
  assert.equal(map.feeds.claim_readiness_snapshot, false);
  assert.equal(map.feeds.executive_readout_snapshot, false);
  assert.equal(map.feeds.customer_facing_financial_output, false);
});

test("high VBD plus high token intensity maps to optimize cost", () => {
  const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
    baseSnapshot(),
    tokenSignal({
      aggregate_token_summary: {
        total_prompt_tokens: 980000,
        total_completion_tokens: 220000,
        total_tokens: 1200000,
        aggregate_interaction_count: 840,
        aggregate_workflow_count: 120,
        high_intensity_workflow_share: 0.72,
        average_tokens_per_interaction: 1428,
        average_tokens_per_workflow: 10000,
        prompt_to_completion_ratio: 4.45
      }
    }),
    { generatedAt: "2026-06-16T00:00:00.000Z" }
  );

  assert.equal(validateVbdTokenEfficiencyMap(map).valid, true);
  assert.equal(map.strategy_zone, "optimize_cost");
  assert.equal(map.token_posture, "high_intensity");
});

test("shallow VBD plus efficient token posture maps to activate workflow", () => {
  const snapshot = baseSnapshot({
    vbd_operating_map: {
      ...baseSnapshot().vbd_operating_map,
      velocity: {
        state: "low",
        evidence_state: "present",
        source_signals: ["workflow_run_count"],
        caveats: ["Velocity is low in this aggregate window."]
      },
      breadth: {
        state: "narrow",
        approved_aggregate_grain: "function",
        covered_slices: 2,
        suppressed_or_unknown_slices: 0,
        caveats: ["Breadth remains narrow."]
      },
      depth: {
        state: "shallow",
        evidence_state: "present",
        source_signals: ["chat_or_assistant_activity"],
        requires_layer_3_for_value_claim: true,
        caveats: ["Depth remains shallow."]
      },
      operating_mode: "low_integration"
    }
  });

  const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
    snapshot,
    tokenSignal(),
    { generatedAt: "2026-06-16T00:00:00.000Z" }
  );

  assert.equal(validateVbdTokenEfficiencyMap(map).valid, true);
  assert.equal(map.strategy_zone, "activate_workflow");
  assert.equal(map.vbd_posture, "shallow_work_integration");
});

test("shallow VBD plus high token intensity maps to mitigate friction", () => {
  const shallow = baseSnapshot({
    vbd_operating_map: {
      ...baseSnapshot().vbd_operating_map,
      velocity: {
        state: "low",
        evidence_state: "present",
        source_signals: ["workflow_run_count"],
        caveats: ["Velocity is low in this aggregate window."]
      },
      breadth: {
        state: "narrow",
        approved_aggregate_grain: "function",
        covered_slices: 2,
        suppressed_or_unknown_slices: 0,
        caveats: ["Breadth remains narrow."]
      },
      depth: {
        state: "shallow",
        evidence_state: "present",
        source_signals: ["chat_or_assistant_activity"],
        requires_layer_3_for_value_claim: true,
        caveats: ["Depth remains shallow."]
      },
      operating_mode: "low_integration"
    }
  });
  const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
    shallow,
    tokenSignal({
      aggregate_token_summary: {
        total_prompt_tokens: 980000,
        total_completion_tokens: 220000,
        total_tokens: 1200000,
        aggregate_interaction_count: 840,
        aggregate_workflow_count: 120,
        high_intensity_workflow_share: 0.72,
        average_tokens_per_interaction: 1428,
        average_tokens_per_workflow: 10000,
        prompt_to_completion_ratio: 4.45
      }
    }),
    { generatedAt: "2026-06-16T00:00:00.000Z" }
  );

  assert.equal(validateVbdTokenEfficiencyMap(map).valid, true);
  assert.equal(map.strategy_zone, "mitigate_friction");
});
```

- [ ] **Step 3: Run tests to verify red**

Run:

```bash
npm run build --workspace shared && node --test scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs
```

Expected: FAIL because `buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal` and `validateVbdTokenEfficiencyMap` are not exported yet.

## Task 2: Add Governance Failure Tests

**Files:**
- Modify: `scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs`

- [ ] **Step 1: Add fail-closed tests**

```js
test("map fails closed when token signal and snapshot source bindings drift", () => {
  const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
    baseSnapshot(),
    tokenSignal({ org_id: "org_other" }),
    { generatedAt: "2026-06-16T00:00:00.000Z" }
  );

  assert.equal(map.valid, false);
  assert.equal(map.strategy_zone, "hold_for_evidence");
  assert.ok(map.gaps.some((gap) => /org_id/i.test(gap)), map.gaps.join("; "));
});

test("held token evidence produces hold zone and cannot feed downstream claims", () => {
  const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
    baseSnapshot(),
    tokenSignal({
      evidence_state: "held",
      k_min_posture: {
        minimum_cohort_threshold: 5,
        cohort_threshold_met: false,
        total_slices: 6,
        k_min_clear_slices: 4,
        suppressed_or_unknown_slices: 2
      },
      caveats: ["Token evidence held because k-min did not clear."]
    }),
    { generatedAt: "2026-06-16T00:00:00.000Z" }
  );

  const result = validateVbdTokenEfficiencyMap(map);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(map.strategy_zone, "hold_for_evidence");
  assert.equal(map.feeds.claim_readiness_snapshot, false);
  assert.equal(map.feeds.customer_facing_financial_output, false);
});

test("map rejects ROI, productivity, causality, ranking, or financial output fields", () => {
  const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
    baseSnapshot(),
    tokenSignal(),
    { generatedAt: "2026-06-16T00:00:00.000Z" }
  );

  for (const field of [
    "roi",
    "productivity_score",
    "causality_claim",
    "manager_or_team_ranking",
    "customer_facing_financial_output"
  ]) {
    const unsafe = { ...map, [field]: true };
    const result = validateVbdTokenEfficiencyMap(unsafe);
    assert.equal(result.valid, false, `${field} should fail closed`);
    assert.ok(result.gaps.some((gap) => new RegExp(field).test(gap)), result.gaps.join("; "));
  }
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm run build --workspace shared && node --test scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs
```

Expected: FAIL because the module does not exist yet.

## Task 3: Implement Shared Map Composer and Validator

**Files:**
- Create: `shared/src/aiValueEngine/vbdTokenEfficiencyMap.ts`
- Modify: `shared/src/aiValueEngine/index.ts`

- [ ] **Step 1: Add module skeleton**

```ts
import { validateEvidenceSnapshot } from "./evidenceSnapshot";
import { validateTokenEfficiencySignal } from "./tokenEfficiencySignal";

export const AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_vbd_token_efficiency_map_2026_06";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const SAFE_ALLOWED_USES = [
  "aggregate_strategy_planning",
  "workflow_design_review",
  "model_routing_review",
  "enablement_planning",
  "cost_exposure_review",
  "token_efficiency_review"
];

export interface BuildVbdTokenEfficiencyMapOptions {
  mapId?: string;
  generatedAt?: string;
}

export interface VbdTokenEfficiencyMapValidationResult {
  schema_version: string;
  map_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
}
```

- [ ] **Step 2: Add derivation helpers**

```ts
function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function evidenceState(value: any): string {
  return String(value?.evidence_state ?? "unknown");
}

function deriveVbdPosture(snapshot: any): string {
  const map = snapshot?.vbd_operating_map;
  if (!map) return "unknown";
  const states = [
    evidenceState(map.velocity),
    evidenceState(map.depth)
  ];
  if (states.includes("suppressed")) return "suppressed";
  if (states.includes("held") || states.includes("not_computed")) return "held";
  if (map.operating_mode === "high_fluency_flow") return "high_work_integration";
  if (map.depth?.state === "embedded" || map.breadth?.state === "broad") {
    return "emerging_work_integration";
  }
  if (map.depth?.state === "shallow" || map.breadth?.state === "narrow") {
    return "shallow_work_integration";
  }
  return "unknown";
}

function deriveTokenPosture(signal: any): string {
  const state = evidenceState(signal);
  if (state === "suppressed") return "suppressed";
  if (["held", "not_computed"].includes(state)) return "held";
  const summary = signal?.aggregate_token_summary ?? {};
  if (Number(summary.high_intensity_workflow_share ?? 0) >= 0.5) return "high_intensity";
  if (Number(summary.average_tokens_per_workflow ?? 0) >= 5000) return "high_intensity";
  if (Number(summary.high_intensity_workflow_share ?? 0) >= 0.25) return "moderate";
  return "efficient";
}

function deriveStrategyZone(vbdPosture: string, tokenPosture: string): string {
  if (["held", "suppressed", "unknown"].includes(vbdPosture) ||
      ["held", "suppressed", "unknown"].includes(tokenPosture)) {
    return "hold_for_evidence";
  }
  const highVbd = vbdPosture === "high_work_integration" ||
    vbdPosture === "emerging_work_integration";
  const highToken = tokenPosture === "high_intensity";
  if (highVbd && !highToken) return "replicate_pattern";
  if (highVbd && highToken) return "optimize_cost";
  if (!highVbd && highToken) return "mitigate_friction";
  return "activate_workflow";
}
```

- [ ] **Step 3: Add builder**

```ts
export function buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
  evidenceSnapshot: any,
  tokenEfficiencySignal: any,
  options: BuildVbdTokenEfficiencyMapOptions = {}
): any {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const snapshotValidation = validateEvidenceSnapshot(evidenceSnapshot);
  const tokenValidation = validateTokenEfficiencySignal(tokenEfficiencySignal);
  const gaps = [
    ...(!snapshotValidation.valid ? snapshotValidation.gaps.map((gap) => `evidence_snapshot: ${gap}`) : []),
    ...(!tokenValidation.valid ? tokenValidation.gaps.map((gap) => `token_efficiency_signal: ${gap}`) : []),
    ...collectBindingGaps(evidenceSnapshot, tokenEfficiencySignal)
  ];
  const vbdPosture = gaps.length > 0 ? "held" : deriveVbdPosture(evidenceSnapshot);
  const tokenPosture = gaps.length > 0 ? "held" : deriveTokenPosture(tokenEfficiencySignal);
  const strategyZone = gaps.length > 0
    ? "hold_for_evidence"
    : deriveStrategyZone(vbdPosture, tokenPosture);

  return {
    schema_version: AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION,
    map_id: options.mapId ??
      `vbd_token_efficiency_map_${safeIdPart(String(evidenceSnapshot?.org_id ?? "unknown_org"))}_${safeIdPart(String(evidenceSnapshot?.workflow_family ?? "unknown_workflow"))}`,
    org_id: evidenceSnapshot?.org_id ?? null,
    workflow_family: evidenceSnapshot?.workflow_family ?? null,
    covered_window: evidenceSnapshot?.covered_window ?? null,
    approved_aggregate_grain: evidenceSnapshot?.privacy_boundary?.approved_aggregate_grain ?? null,
    minimum_cohort_threshold: evidenceSnapshot?.minimum_cohort_threshold ?? tokenEfficiencySignal?.minimum_cohort_threshold ?? null,
    k_min_posture: tokenEfficiencySignal?.k_min_posture ?? null,
    valid: gaps.length === 0,
    gaps,
    vbd_posture: vbdPosture,
    token_posture: tokenPosture,
    strategy_zone: strategyZone,
    source_refs: {
      evidence_snapshot_id: evidenceSnapshot?.snapshot_id ?? null,
      token_efficiency_signal_id: tokenEfficiencySignal?.token_efficiency_signal_id ?? null,
      token_source_refs: tokenEfficiencySignal?.source_refs ?? {}
    },
    allowed_uses: SAFE_ALLOWED_USES,
    blocked_uses: REQUIRED_BLOCKED_USES,
    value_proof_policy: {
      map_is_roi_proof: false,
      map_is_productivity_proof: false,
      map_is_financial_output: false,
      map_computes_causality: false,
      map_allows_person_or_team_comparison: false,
      downstream_claim_strength_upgrade_allowed: false
    },
    feeds: {
      evidence_snapshot_context: true,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      reportability_readiness: false,
      customer_facing_financial_output: false
    },
    persistence_policy: {
      persisted: false,
      creates_migrations: false,
      creates_prisma_schema: false,
      creates_backend_routes: false,
      creates_frontend_ui: false,
      creates_ingestion_jobs: false
    },
    caveats: [
      "VBD x Token Efficiency Map is aggregate strategy context only.",
      "Token usage is cost/intensity context and is not ROI, productivity, causality, or financial proof.",
      "VBD is Layer 1 work-integration posture and cannot create full Playbook coverage by itself.",
      ...stringsOf(evidenceSnapshot?.required_caveats),
      ...stringsOf(tokenEfficiencySignal?.caveats)
    ],
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION
  };
}
```

- [ ] **Step 4: Add binding and validator functions**

```ts
function collectBindingGaps(snapshot: any, tokenSignal: any): string[] {
  const gaps: string[] = [];
  if (snapshot?.org_id !== tokenSignal?.org_id) gaps.push("org_id must match");
  if (snapshot?.workflow_family !== tokenSignal?.workflow_family) {
    gaps.push("workflow_family must match");
  }
  if (snapshot?.covered_window?.window_start !== tokenSignal?.covered_window?.window_start) {
    gaps.push("covered_window.window_start must match");
  }
  if (snapshot?.covered_window?.window_end !== tokenSignal?.covered_window?.window_end) {
    gaps.push("covered_window.window_end must match");
  }
  const snapshotGrain = snapshot?.privacy_boundary?.approved_aggregate_grain;
  if (snapshotGrain !== tokenSignal?.approved_aggregate_grain) {
    gaps.push("approved_aggregate_grain must match");
  }
  return gaps;
}

export function validateVbdTokenEfficiencyMap(map: any): VbdTokenEfficiencyMapValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "map_id",
    "org_id",
    "workflow_family",
    "covered_window",
    "approved_aggregate_grain",
    "vbd_posture",
    "token_posture",
    "strategy_zone",
    "source_refs",
    "allowed_uses",
    "blocked_uses",
    "value_proof_policy",
    "feeds",
    "persistence_policy",
    "caveats",
    "generated_at",
    "derivation_version"
  ]) {
    if (map?.[field] === undefined || map?.[field] === null || map?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (map?.schema_version !== AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(map?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const [field, value] of Object.entries(map?.value_proof_policy ?? {})) {
    if (value !== false) gaps.push(`value_proof_policy.${field} must be false`);
  }
  for (const field of [
    "claim_readiness_snapshot",
    "executive_readout_snapshot",
    "reportability_readiness",
    "customer_facing_financial_output"
  ]) {
    if (map?.feeds?.[field] !== false) gaps.push(`feeds.${field} must be false`);
  }
  for (const field of [
    "persisted",
    "creates_migrations",
    "creates_prisma_schema",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_ingestion_jobs"
  ]) {
    if (map?.persistence_policy?.[field] !== false) {
      gaps.push(`persistence_policy.${field} must be false`);
    }
  }
  for (const key of Object.keys(map ?? {})) {
    if (/roi|productivity|causality|customer_facing_financial_output|manager_or_team_ranking/i.test(key)) {
      gaps.push(`Forbidden field present: ${key}`);
    }
  }
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    map_id: map?.map_id ?? null,
    org_id: map?.org_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}
```

- [ ] **Step 5: Export from index**

```ts
export {
  AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION,
  buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal,
  validateVbdTokenEfficiencyMap
} from "./vbdTokenEfficiencyMap";
export type {
  BuildVbdTokenEfficiencyMapOptions,
  VbdTokenEfficiencyMapValidationResult
} from "./vbdTokenEfficiencyMap";
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm run build --workspace shared && node --test scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs
```

Expected: PASS all VBD x Token Efficiency Map tests.

## Task 4: Add Contract Docs and Examples

**Files:**
- Create: `docs/contracts/ai-value-vbd-token-efficiency-map/README.md`
- Create: `docs/contracts/ai-value-vbd-token-efficiency-map/examples/valid-replicate-map.json`
- Create: `docs/contracts/ai-value-vbd-token-efficiency-map/examples/valid-mitigate-map.json`
- Create: `docs/contracts/ai-value-vbd-token-efficiency-map/examples/held-map.json`
- Modify: `docs/contracts/ai-value-token-efficiency-signal/README.md`

- [ ] **Step 1: Add README**

```markdown
# AI Value VBD x Token Efficiency Map Contract

Schema version: `FT_AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_2026_06`

## Purpose

The VBD x Token Efficiency Map combines aggregate VBD work-integration posture
with aggregate token intensity/efficiency to produce strategy zones for
enablement, workflow design, model routing, and cost exposure review.

It is not ROI, productivity measurement, causality, financial output, individual
attribution, comparative manager/team output, or people decisioning.

## Strategy Zones

| Zone | Meaning | Action |
| --- | --- | --- |
| `replicate_pattern` | High work integration with efficient token posture. | Study and replicate the workflow pattern. |
| `optimize_cost` | High work integration with high token intensity. | Optimize prompts, agents, model routing, or workflow design. |
| `activate_workflow` | Shallow work integration with efficient/moderate token posture. | Improve use cases and enablement. |
| `mitigate_friction` | Shallow work integration with high token intensity. | Diagnose friction before stronger interpretation. |
| `hold_for_evidence` | Missing, held, suppressed, unsafe, or mismatched evidence. | Preserve caveats and do not interpret. |

## Validation

Run:

```bash
npm run test:ai-value-vbd-token-efficiency-map
```
```

- [ ] **Step 2: Add examples generated from passing test fixtures**

Use the builder output from the passing tests to write:

```bash
node --test scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs
```

Expected: PASS before committing examples.

- [ ] **Step 3: Update Token Efficiency README**

Append:

```markdown
## Relationship to VBD x Token Efficiency Map

The VBD x Token Efficiency Map may reference a valid Token Efficiency Signal as
Layer 1 cost/intensity context only. The map can emit aggregate strategy zones
for replication, optimization, activation, mitigation, or evidence hold, but it
must not upgrade Playbook coverage, claim readiness, financial permission,
productivity interpretation, causality, or customer-facing economic output.
```

## Task 5: Add Package Script and Blueprint Consistency Guard

**Files:**
- Modify: `package.json`
- Modify: `scripts/validate_ai_value_blueprint_consistency.test.mjs`

- [ ] **Step 1: Add package script**

```json
"test:ai-value-vbd-token-efficiency-map": "npm run build --workspace shared && node --test scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs"
```

- [ ] **Step 2: Add consistency checks**

Add checks that require:

```js
assertContains(
  crosswalk,
  "shared/src/aiValueEngine/vbdTokenEfficiencyMap.ts",
  CROSSWALK_DOC
);
assertContains(
  crosswalk,
  "scripts/validate_ai_value_vbd_token_efficiency_map.test.mjs",
  CROSSWALK_DOC
);
```

If the current blueprint consistency file has no crosswalk section for this exact artifact, add only package/doc/script presence checks to avoid broad rewrites.

- [ ] **Step 3: Run script**

Run:

```bash
npm run test:ai-value-vbd-token-efficiency-map
```

Expected: PASS.

## Task 6: Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused checks**

```bash
npm run test:ai-value-vbd-token-efficiency-map
npm run test:ai-value-token-efficiency-signal
npm run test:ai-value-evidence-collection-assembler
npm run test:ai-value-claim-readiness-handoff
```

Expected: all pass.

- [ ] **Step 2: Run governance checks**

```bash
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
git diff --check
```

Expected: all pass.

- [ ] **Step 3: Adversarial review checklist**

Confirm:

- No migrations.
- No backend routes.
- No frontend UI.
- No ingestion jobs.
- No persistence writes.
- No raw rows, prompts, responses, transcripts, query text, files, direct identifiers, or joinable person identifiers.
- No individual attribution.
- No comparative manager/team output.
- No people decisioning.
- No ROI, EBITA, productivity, causality, headcount, financial impact, or customer-facing economic output.
- Token usage remains Layer 1 cost/intensity context only.
- VBD remains Layer 1 work-integration posture only.
- The map emits strategy zones and caveats only.

## Self-Review

- Spec coverage: The plan covers the contract object, composer, validator, strategy zones, source binding, governance boundaries, docs, examples, package script, and verification.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: The plan consistently uses `buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal`, `validateVbdTokenEfficiencyMap`, `strategy_zone`, `vbd_posture`, and `token_posture`.
