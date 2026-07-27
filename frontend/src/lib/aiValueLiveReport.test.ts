import { aiValueEngine } from "@fluencytracr/shared";
import { describe, expect, it } from "vitest";
import blueprint from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json";
import engagement from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-engagement.json";
import fluencyBaseline from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-fluency-baseline.json";
import metricsLibrary from "../../../docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";
import {
  buildRequestBoundLiveReport,
  type RequestBoundLiveRun
} from "./aiValueLiveReport";

const readySpine = () => {
  const run = structuredClone(
    aiValueEngine.runSpine({
      blueprint,
      metricsLibrary
    })
  ) as RequestBoundLiveRun;
  run.decision = "READY_FOR_EXECUTIVE_VALIDATION";
  const readiness = run.stages.readiness.object as Record<string, any>;
  const packet = run.stages.executive_packet.object as Record<string, any>;
  readiness.decision = "READY_FOR_EXECUTIVE_VALIDATION";
  packet.decision = "READY_FOR_EXECUTIVE_VALIDATION";
  packet.sections.readiness.decision = "READY_FOR_EXECUTIVE_VALIDATION";
  return run;
};

const buildReport = (run: Parameters<typeof buildRequestBoundLiveReport>[0]["run"]) =>
  buildRequestBoundLiveReport({ run, persisted: [] });

const readyChain = () => {
  const spine = readySpine();
  const packet = spine.stages.executive_packet.object as Record<string, any>;
  packet.source_refs.engagement_id = engagement.engagement_id;
  packet.source_refs.fluency_baseline_id = fluencyBaseline.baseline_id;
  (spine.stages.readiness.object as Record<string, any>).source_refs.fluency_baseline_id =
    fluencyBaseline.baseline_id;
  return {
    schema_version: "FT_AI_VALUE_CHAIN_RUN_2026_06",
    decision: "READY_FOR_EXECUTIVE_VALIDATION",
    halted_at: null,
    customer_facing_economic_output: false as const,
    engagement: {
      status: "VALID" as const,
      validation: { valid: true },
      object: engagement,
      generated: false,
      hold_reason: null,
      covers_workflow_family: true
    },
    fluency_baseline: {
      status: "VALID" as const,
      validation: { valid: true },
      object: fluencyBaseline,
      generated: false,
      hold_reason: null,
      summary: {}
    },
    outcome_evidence: {
      status: "NOT_RUN" as const,
      validation: null,
      object: null,
      generated: false,
      hold_reason: null,
      attached: false
    },
    spine
  };
};

describe("request-bound AI Value live report", () => {
  it("projects a valid exact-run packet without identifiers or source references", () => {
    const run = readyChain();
    const report = buildReport(run);

    expect(report).not.toBeNull();
    expect(report?.boundaryLabel).toBe("Internal, request-bound preview");
    expect(report?.boundaryStatement).toMatch(
      /not source-bound, canonical, customer-facing, or audit-ready/i
    );

    const rendered = JSON.stringify(report);
    const internalValues = [
      blueprint.blueprint_id,
      metricsLibrary.library_id,
      engagement.engagement_id,
      fluencyBaseline.baseline_id,
      (run.spine.stages.scenario.object as Record<string, string>).scenario_id,
      (run.spine.stages.readiness.object as Record<string, string>).readiness_id,
      (run.spine.stages.claim_boundary.object as Record<string, string>).claim_boundary_id,
      (run.spine.stages.executive_packet.object as Record<string, string>).packet_id
    ];
    for (const internalValue of internalValues) {
      expect(rendered).not.toContain(internalValue);
    }
    expect(rendered).not.toContain("source_refs");
  });

  it("holds when the packet source references do not match the same run", () => {
    const run = readySpine();
    (run.stages.executive_packet.object as Record<string, any>).source_refs.scenario_id =
      "scenario-from-another-run";

    expect(buildReport(run)).toBeNull();
  });

  it("holds any decision other than the exact ready allowlist value", () => {
    const run = readySpine();
    run.decision = "HOLD_FOR_ASSUMPTIONS";

    expect(buildReport(run)).toBeNull();
  });

  it("holds when a non-persistent request reports persisted objects", () => {
    const run = readySpine();

    expect(
      buildRequestBoundLiveReport({ run, persisted: [{ object_type: "executive_packet", object_id: "packet-1" }] })
    ).toBeNull();
  });

  it("holds when persistence evidence is missing or malformed", () => {
    const run = readySpine();

    expect(buildRequestBoundLiveReport({ run } as any)).toBeNull();
    expect(buildRequestBoundLiveReport({ run, persisted: null } as any)).toBeNull();
  });

  it("holds a non-canonical source decision when one is present", () => {
    const run = readySpine();
    (run.stages.claim_boundary.object as Record<string, any>).source_decision =
      "HOLD_FOR_ASSUMPTIONS";

    expect(buildReport(run)).toBeNull();
  });

  it("holds rather than echoing an internal identifier embedded in packet prose", () => {
    const run = readySpine();
    const packet = run.stages.executive_packet.object as Record<string, any>;
    packet.sections.next_actions = [`Review ${packet.packet_id}`];

    expect(buildReport(run)).toBeNull();
  });

  it("binds optional chain context references to the same response", () => {
    const run = readyChain();
    (run.spine.stages.executive_packet.object as Record<string, any>).source_refs.engagement_id =
      "another-engagement";

    expect(buildReport(run)).toBeNull();
  });

  it("holds unexpected source references instead of treating them as same-run lineage", () => {
    const run = readySpine();
    (run.stages.executive_packet.object as Record<string, any>).source_refs.stored_packet_id =
      "independently-selected-packet";

    expect(buildReport(run)).toBeNull();
  });
});
