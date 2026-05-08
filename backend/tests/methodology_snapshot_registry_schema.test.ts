import fs from "fs";
import path from "path";

import {
  MethodologySnapshotRegistrySchema,
  StrongestSafeClaimSchema,
  buildMethodologySnapshotRegistry,
  generateStrongestSafeClaim
} from "@learnaire/shared";

const fixture = (contractPath: string, name: string) => {
  const fullPath = path.join(__dirname, "../../docs/contracts", contractPath, "examples", name);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
};

const methodologySnapshotRegistry = fixture(
  "methodology-snapshot-registry",
  "nielsen-style-methodology-snapshots.json"
);
const graph = fixture("ai-work-value-graph", "org-northstar-ai-work-value-graph.json");
const maturityModel = fixture("ai-work-maturity-model", "nielsen-style-ai-work-maturity-examples.json");
const valueHypothesisRegistry = fixture("value-hypothesis-registry", "nielsen-style-value-hypothesis-registry.json");
const outcomeInstrumentationMap = fixture("outcome-instrumentation-map", "nielsen-style-outcome-instrumentation-map.json");

describe("Methodology Snapshot Registry contract", () => {
  it("accepts the Nielsen-style methodology snapshot registry fixture", () => {
    const registry = buildMethodologySnapshotRegistry(methodologySnapshotRegistry);

    expect(registry.schema_version).toBe("MSR_2026_05");
    expect(registry.snapshots.map((snapshot) => snapshot.methodology_snapshot_id)).toEqual([
      "glean_time_saves_mvp_2025_10",
      "nielsen_roi_payback_internal_2025_10",
      "agentic_work_placeholder_2026_05",
      "suppressed_unapproved_value_model_2026_05"
    ]);
    expect(MethodologySnapshotRegistrySchema.parse(registry)).toEqual(registry);
  });

  it("requires the methodology fields needed to audit value claims", () => {
    const registry = buildMethodologySnapshotRegistry(methodologySnapshotRegistry);

    for (const snapshot of registry.snapshots) {
      expect(snapshot.methodology_snapshot_id).toBeTruthy();
      expect(snapshot.source_system).toBeTruthy();
      expect(snapshot.methodology_version).toBeTruthy();
      expect(snapshot.effective_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(snapshot.reporting_window).toBeTruthy();
      expect(snapshot.covered_surfaces.length).toBeGreaterThan(0);
      expect(snapshot.dedupe_policy).toBeTruthy();
      expect(snapshot.confidence_treatment).toBeTruthy();
      expect(snapshot.recapture_policy).toBeTruthy();
      expect(snapshot.dominant_assumptions.length).toBeGreaterThan(0);
      expect(snapshot.approval_state).toBeTruthy();
      expect(snapshot.customer_safe_claim_effect).toBeTruthy();
      expect(snapshot.caveats.length).toBeGreaterThan(0);
    }
  });

  it("rejects duplicate snapshot IDs and forbidden fields", () => {
    const duplicate = {
      ...methodologySnapshotRegistry,
      snapshots: [
        methodologySnapshotRegistry.snapshots[0],
        {
          ...methodologySnapshotRegistry.snapshots[1],
          methodology_snapshot_id: methodologySnapshotRegistry.snapshots[0].methodology_snapshot_id
        }
      ]
    };

    expect(MethodologySnapshotRegistrySchema.safeParse(duplicate).success).toBe(false);

    const unsafe = {
      ...methodologySnapshotRegistry,
      snapshots: [
        {
          ...methodologySnapshotRegistry.snapshots[0],
          query_text: "unsafe"
        },
        ...methodologySnapshotRegistry.snapshots.slice(1)
      ]
    };

    expect(MethodologySnapshotRegistrySchema.safeParse(unsafe).success).toBe(false);
  });

  it("requires customer-safe methodology approval before enabling customer-safe claims", () => {
    const broken = {
      ...methodologySnapshotRegistry,
      snapshots: [
        {
          ...methodologySnapshotRegistry.snapshots[1],
          approval_state: "finance_approved",
          customer_safe_claim_effect: "enables_customer_safe"
        }
      ]
    };

    expect(MethodologySnapshotRegistrySchema.safeParse(broken).success).toBe(false);
  });

  it("rejects covered and excluded surface conflicts", () => {
    const broken = {
      ...methodologySnapshotRegistry,
      snapshots: [
        {
          ...methodologySnapshotRegistry.snapshots[0],
          covered_surfaces: ["search", "chat"],
          excluded_surfaces: ["search", "agents"]
        }
      ]
    };

    expect(MethodologySnapshotRegistrySchema.safeParse(broken).success).toBe(false);
  });
});

describe("Strongest Safe Claim methodology governance", () => {
  it("downgrades financial claims by default when no methodology snapshot is present", () => {
    const result = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      preferred_hypothesis_id: "agentic_business_reporting"
    });

    expect(result.strongest_claim.maturity_stage).toBe("finance_approved");
    expect(result.strongest_claim.claim_readiness).toBe("internal_only");
    expect(result.strongest_claim.methodology_snapshot_id).toBeUndefined();
    expect(result.strongest_claim.methodology_caveats.join(" ")).toMatch(/No methodology snapshot was selected/i);
    expect(result.blocked_methodology_claims.join(" ")).toMatch(/selected methodology snapshot/i);
  });

  it("caps financial claims at internal-only when methodology is finance-approved but not customer-safe", () => {
    const result = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      methodology_snapshot_registry: methodologySnapshotRegistry,
      preferred_hypothesis_id: "agentic_business_reporting",
      preferred_methodology_snapshot_id: "nielsen_roi_payback_internal_2025_10"
    });

    expect(result.strongest_claim.maturity_stage).toBe("finance_approved");
    expect(result.strongest_claim.claim_readiness).toBe("internal_only");
    expect(result.strongest_claim.methodology_snapshot_id).toBe("nielsen_roi_payback_internal_2025_10");
    expect(result.strongest_claim.methodology_approval_state).toBe("finance_approved");
    expect(result.blocked_methodology_claims.join(" ")).toMatch(/customer-safe methodology approval/i);
    expect(StrongestSafeClaimSchema.parse(result)).toEqual(result);
  });

  it("suppresses financial claims when selected methodology is not approved for use", () => {
    const result = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      methodology_snapshot_registry: methodologySnapshotRegistry,
      preferred_hypothesis_id: "agentic_business_reporting",
      preferred_methodology_snapshot_id: "suppressed_unapproved_value_model_2026_05"
    });

    expect(result.strongest_claim.claim_readiness).toBe("suppressed");
    expect(result.strongest_claim.safe_claim_language).toMatch(/No customer-safe value claim is available/i);
    expect(result.blocked_methodology_claims.join(" ")).toMatch(/suppressed|rejected/i);
  });

  it("carries upstream Time-Saves exclusions as methodology caveats", () => {
    const result = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      methodology_snapshot_registry: methodologySnapshotRegistry,
      preferred_hypothesis_id: "cs_response_time_improvement",
      preferred_methodology_snapshot_id: "glean_time_saves_mvp_2025_10"
    });

    expect(result.strongest_claim.methodology_snapshot_id).toBe("glean_time_saves_mvp_2025_10");
    expect(result.strongest_claim.methodology_caveats.join(" ")).toMatch(/excludes agents/i);
  });
});
