import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GleanAssumptionLedgerSchema,
  buildGleanAssumptionLedger
} from "@fluencytracr/shared";

const repoRoot = resolve(__dirname, "../..");
const ledgerPath = resolve(
  repoRoot,
  "docs/contracts/glean-assumption-ledger/examples/default-assumption-ledger.json"
);

function loadLedger(): unknown {
  return JSON.parse(readFileSync(ledgerPath, "utf8"));
}

describe("GleanAssumptionLedgerSchema", () => {
  it("accepts the committed Time-Saves-seeded assumption ledger example", () => {
    const parsed = buildGleanAssumptionLedger(loadLedger());

    expect(parsed.schema_version).toBe("GAL_2026_05");
    expect(parsed.summary.assumption_count).toBe(parsed.assumptions.length);
    expect(parsed.assumptions.map((assumption) => assumption.assumption_id)).toContain(
      "time_saves.base_rate.unclassified_fallback"
    );
    expect(GleanAssumptionLedgerSchema.parse(parsed)).toEqual(parsed);
  });

  it("rejects low-confidence assumptions approved for customer claims", () => {
    const ledger = loadLedger() as { assumptions: Array<Record<string, unknown>> };

    const result = GleanAssumptionLedgerSchema.safeParse({
      ...ledger,
      assumptions: [
        {
          ...ledger.assumptions[0],
          approval_state: "customer_safe",
          approved_for_customer_claims: true,
          claim_language_constraint: "customer_safe_allowed"
        }
      ],
      summary: {
        assumption_count: 1,
        low_confidence_count: 1,
        high_sensitivity_count: 1,
        customer_safe_count: 1,
        internal_only_count: 0
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects high-sensitivity assumptions approved for customer claims", () => {
    const ledger = loadLedger() as { assumptions: Array<Record<string, unknown>> };

    const result = GleanAssumptionLedgerSchema.safeParse({
      ...ledger,
      assumptions: [
        {
          ...ledger.assumptions[2],
          approval_state: "customer_safe",
          approved_for_customer_claims: true,
          claim_language_constraint: "customer_safe_allowed"
        }
      ],
      summary: {
        assumption_count: 1,
        low_confidence_count: 0,
        high_sensitivity_count: 1,
        customer_safe_count: 1,
        internal_only_count: 0
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects low-confidence assumptions marked customer-safe with caveats", () => {
    const ledger = loadLedger() as { assumptions: Array<Record<string, unknown>> };

    const result = GleanAssumptionLedgerSchema.safeParse({
      ...ledger,
      assumptions: [
        {
          ...ledger.assumptions[0],
          claim_language_constraint: "customer_safe_with_caveats",
          customer_visible: true
        }
      ],
      summary: {
        assumption_count: 1,
        low_confidence_count: 1,
        high_sensitivity_count: 1,
        customer_safe_count: 0,
        internal_only_count: 0
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects low-confidence assumptions with customer-safe approval state", () => {
    const ledger = loadLedger() as { assumptions: Array<Record<string, unknown>> };

    const result = GleanAssumptionLedgerSchema.safeParse({
      ...ledger,
      assumptions: [
        {
          ...ledger.assumptions[0],
          approval_state: "customer_safe",
          claim_language_constraint: "internal_only",
          approved_for_customer_claims: false,
          customer_visible: false
        }
      ],
      summary: {
        assumption_count: 1,
        low_confidence_count: 1,
        high_sensitivity_count: 1,
        customer_safe_count: 0,
        internal_only_count: 1
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects summary counts that do not match assumption entries", () => {
    const ledger = loadLedger() as { summary: Record<string, unknown> };

    const result = GleanAssumptionLedgerSchema.safeParse({
      ...ledger,
      summary: {
        ...ledger.summary,
        low_confidence_count: 0
      }
    });

    expect(result.success).toBe(false);
  });
});
