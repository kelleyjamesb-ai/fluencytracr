import fs from "fs";
import path from "path";

import { buildMethodologyDecisionMemo, generateStrongestSafeClaim } from "@learnaire/shared";
import { summarizeMethodologySnapshotsForReview } from "../src/evidence/methodologyReviewWorkspace";

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

const customerSafeMethodologyRegistry = {
  ...methodologySnapshotRegistry,
  snapshots: methodologySnapshotRegistry.snapshots.map((snapshot: any) =>
    snapshot.methodology_snapshot_id === "nielsen_roi_payback_internal_2025_10"
      ? {
          ...snapshot,
          methodology_snapshot_id: "nielsen_roi_payback_customer_safe_2025_10",
          label: "Nielsen-style customer-safe ROI and payback fixture",
          approval_state: "customer_safe",
          approved_by_role: "finance",
          customer_safe_claim_effect: "enables_customer_safe",
          frozen_report_snapshot_ref: "nielsen.synthetic.customer_safe_roi.fixture.2025_10"
        }
      : snapshot
  )
};

const expiredMethodologyRegistry = {
  ...methodologySnapshotRegistry,
  snapshots: methodologySnapshotRegistry.snapshots.map((snapshot: any) =>
    snapshot.methodology_snapshot_id === "nielsen_roi_payback_internal_2025_10"
      ? {
          ...snapshot,
          methodology_snapshot_id: "expired_roi_model_2026_05",
          label: "Expired ROI model fixture",
          approval_state: "expired"
        }
      : snapshot
  )
};

describe("Methodology Review Workspace read helper", () => {
  it("summarizes snapshots for human review without raw or person-level fields", () => {
    const workspace = summarizeMethodologySnapshotsForReview(methodologySnapshotRegistry);

    expect(workspace.schema_version).toBe("MRW_2026_05");
    expect(workspace.snapshots).toHaveLength(4);
    expect(workspace.selected_snapshot.methodology_snapshot_id).toBe("glean_time_saves_mvp_2025_10");
    expect(workspace.snapshots[0]).toMatchObject({
      approval_state: "internal_review",
      customer_safe_claim_effect: "enables_caveated"
    });
    expect(workspace.snapshots[0].covered_surfaces).toEqual(["search", "chat", "ai_answers"]);
    expect(workspace.snapshots[0].excluded_surfaces).toEqual(
      expect.arrayContaining(["agents", "skills", "mcp_actions"])
    );
    expect(workspace.selected_snapshot.high_sensitivity_assumptions.map((assumption) => assumption.assumption_id)).toEqual(
      expect.arrayContaining(["base_minutes_saved", "quality_multiplier", "unclassified_fallback"])
    );
    expect(workspace.selected_snapshot.blocked_claim_effects.join(" ")).toMatch(/ROI|payback|customer-safe/i);
    expect(JSON.stringify(workspace)).not.toMatch(
      /raw_prompt|raw_response|transcript|query_text|tool_payload|file_content|user_id|employee_id|manager_view|ranking|productivity_score/i
    );
  });

  it("explains finance-approved snapshots as internal-only for financial claims", () => {
    const workspace = summarizeMethodologySnapshotsForReview(
      methodologySnapshotRegistry,
      "nielsen_roi_payback_internal_2025_10"
    );

    expect(workspace.selected_snapshot.approval_gate_explanation).toMatch(/finance-approved/i);
    expect(workspace.selected_snapshot.financial_claim_effect).toMatch(/internal-only/i);
    expect(workspace.selected_snapshot.example_claims.internal_only).toMatch(/internal/i);
    expect(workspace.selected_snapshot.example_claims.customer_safe).toMatch(/not enabled/i);
  });

  it("explains draft, rejected, and expired snapshots as suppressed for financial claims", () => {
    const expiredRegistry = {
      ...methodologySnapshotRegistry,
      snapshots: methodologySnapshotRegistry.snapshots.map((snapshot: any) =>
        snapshot.methodology_snapshot_id === "nielsen_roi_payback_internal_2025_10"
          ? {
              ...snapshot,
              methodology_snapshot_id: "expired_roi_model_2026_05",
              approval_state: "expired"
            }
          : snapshot
      )
    };

    for (const snapshotId of [
      "agentic_work_placeholder_2026_05",
      "suppressed_unapproved_value_model_2026_05",
      "expired_roi_model_2026_05"
    ]) {
      const registry = snapshotId === "expired_roi_model_2026_05" ? expiredRegistry : methodologySnapshotRegistry;
      const workspace = summarizeMethodologySnapshotsForReview(registry, snapshotId);

      expect(workspace.selected_snapshot.financial_claim_effect).toMatch(/suppressed/i);
      expect(workspace.selected_snapshot.example_claims.suppressed).toMatch(/suppressed/i);
    }
  });
});

describe("Methodology Review Workspace claim gates", () => {
  it("keeps finance-approved methodology financial claims internal-only", () => {
    const result = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      methodology_snapshot_registry: methodologySnapshotRegistry,
      preferred_hypothesis_id: "agentic_business_reporting",
      preferred_methodology_snapshot_id: "nielsen_roi_payback_internal_2025_10"
    });

    expect(result.strongest_claim.claim_readiness).toBe("internal_only");
  });

  it("allows customer-safe methodology to enable customer-safe financial language", () => {
    const result = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      methodology_snapshot_registry: customerSafeMethodologyRegistry,
      preferred_hypothesis_id: "agentic_business_reporting",
      preferred_methodology_snapshot_id: "nielsen_roi_payback_customer_safe_2025_10"
    });

    expect(result.strongest_claim.claim_readiness).toBe("customer_safe");
  });

  it.each([
    ["draft", "agentic_work_placeholder_2026_05"],
    ["rejected", "suppressed_unapproved_value_model_2026_05"],
    ["expired", "expired_roi_model_2026_05"]
  ])("suppresses financial claims for %s methodology snapshots", (_state, snapshotId) => {
    const registry =
      snapshotId === "expired_roi_model_2026_05"
        ? {
            ...methodologySnapshotRegistry,
            snapshots: methodologySnapshotRegistry.snapshots.map((snapshot: any) =>
              snapshot.methodology_snapshot_id === "nielsen_roi_payback_internal_2025_10"
                ? {
                    ...snapshot,
                    methodology_snapshot_id: "expired_roi_model_2026_05",
                    approval_state: "expired"
                  }
                : snapshot
            )
          }
        : methodologySnapshotRegistry;

    const result = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      methodology_snapshot_registry: registry,
      preferred_hypothesis_id: "agentic_business_reporting",
      preferred_methodology_snapshot_id: snapshotId
    });

    expect(result.strongest_claim.claim_readiness).toBe("suppressed");
  });

  it("downgrades financial claims deterministically when no methodology snapshot is selected", () => {
    const first = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      preferred_hypothesis_id: "agentic_business_reporting"
    });
    const second = generateStrongestSafeClaim({
      graph,
      maturity_model: maturityModel,
      value_hypothesis_registry: valueHypothesisRegistry,
      outcome_instrumentation_map: outcomeInstrumentationMap,
      preferred_hypothesis_id: "agentic_business_reporting"
    });

    expect(first.strongest_claim.claim_readiness).toBe("internal_only");
    expect(second.strongest_claim).toEqual(first.strongest_claim);
  });
});

describe("Methodology decision memo export", () => {
  it("says finance-approved methodology is internal-only", () => {
    const workspace = summarizeMethodologySnapshotsForReview(
      methodologySnapshotRegistry,
      "nielsen_roi_payback_internal_2025_10"
    );
    const memo = buildMethodologyDecisionMemo(workspace, "nielsen_roi_payback_internal_2025_10");

    expect(memo).toMatch(/Decision state: internal-only/i);
    expect(memo).toMatch(/Selected methodology snapshot: Nielsen-style internal ROI and payback fixture/i);
    expect(memo).toMatch(/Approval state: finance_approved/i);
    expect(memo).toMatch(/Financial claim effect: internal-only/i);
    expect(memo).toMatch(/Strongest safe language:/i);
    expect(memo).toMatch(/Blocked claim language:/i);
    expect(memo).toMatch(/Why stronger claims are blocked:/i);
    expect(memo).toMatch(/High-sensitivity assumptions:/i);
    expect(memo).toMatch(/Covered surfaces:/i);
    expect(memo).toMatch(/Excluded surfaces:/i);
    expect(memo).toMatch(/Caveats:/i);
    expect(memo).toMatch(/Upgrade actions:/i);
  });

  it("allows customer-safe financial language for customer-safe methodology", () => {
    const workspace = summarizeMethodologySnapshotsForReview(
      customerSafeMethodologyRegistry,
      "nielsen_roi_payback_customer_safe_2025_10"
    );
    const memo = buildMethodologyDecisionMemo(workspace, "nielsen_roi_payback_customer_safe_2025_10");

    expect(memo).toMatch(/Decision state: customer-safe/i);
    expect(memo).toMatch(/customer-facing ROI\/payback can be enabled/i);
    expect(memo).toMatch(/Strongest safe language: Customer-safe/i);
  });

  it.each([
    ["draft", methodologySnapshotRegistry, "agentic_work_placeholder_2026_05"],
    ["rejected", methodologySnapshotRegistry, "suppressed_unapproved_value_model_2026_05"],
    ["expired", expiredMethodologyRegistry, "expired_roi_model_2026_05"]
  ])("says %s methodology is suppressed", (_state, registry, snapshotId) => {
    const workspace = summarizeMethodologySnapshotsForReview(registry, snapshotId);
    const memo = buildMethodologyDecisionMemo(workspace, snapshotId);

    expect(memo).toMatch(/Decision state: suppressed/i);
    expect(memo).toMatch(/Financial claim effect: suppressed/i);
    expect(memo).toMatch(/Blocked claim language:/i);
  });

  it("contains no forbidden raw or person-level fields", () => {
    const workspace = summarizeMethodologySnapshotsForReview(
      methodologySnapshotRegistry,
      "nielsen_roi_payback_internal_2025_10"
    );
    const memo = buildMethodologyDecisionMemo(workspace, "nielsen_roi_payback_internal_2025_10");

    expect(memo).not.toMatch(
      /raw_prompt|raw_response|transcript|query_text|tool_payload|file_content|user_id|employee_id|manager_view|ranking|productivity_score/i
    );
  });
});
