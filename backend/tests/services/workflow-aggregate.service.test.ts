import { BehaviorPattern } from "../../src/services/pattern-classifier";
import {
  aggregateWorkflowClassifications,
  computePatternDistribution,
  DEFAULT_PREVALENCE_MODE,
  PREVALENCE_BAND_LOW_MAX_SHARE,
  PREVALENCE_BAND_MODERATE_MAX_SHARE,
  toPrevalenceBand,
  WORKFLOW_SHARE_DECIMALS,
  type ExecutionClassificationRecord,
  type PrevalenceMode
} from "../../src/services/workflow-aggregate.service";

const rec = (
  partial: Partial<ExecutionClassificationRecord> & Pick<ExecutionClassificationRecord, "execution_id">
): ExecutionClassificationRecord => ({
  workflow_id: "wf1",
  status: "ALLOWED",
  ...partial
});

function assertNumericDist(
  d: { share?: number; prevalence_band?: string },
  mode: PrevalenceMode
): void {
  if (mode === "NUMERIC_SHARE") {
    expect(d.share).toBeDefined();
    expect(d.prevalence_band).toBeUndefined();
  } else {
    expect(d.prevalence_band).toBeDefined();
    expect(d.share).toBeUndefined();
  }
}

describe("aggregateWorkflowClassifications", () => {
  it("defaults to CATEGORICAL_PREVALENCE", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        rec({ execution_id: "e1", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
        rec({ execution_id: "e2", pattern: BehaviorPattern.CALIBRATED_FLUENCY })
      ]
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.result.verdict).toBe("SUPPRESS");
      expect(out.result.suppression_reason).toBe("INSUFFICIENT_VOLUME");
      expect(out.result.prevalence_mode).toBe("CATEGORICAL_PREVALENCE");
      expect(out.result.prevalence_mode).toBe(DEFAULT_PREVALENCE_MODE);
      expect(out.result.pattern_distribution).toEqual([]);
    }
  });

  it("aggregates single workflow in NUMERIC_SHARE mode", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        rec({ execution_id: "e1", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
        rec({ execution_id: "e2", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
        rec({ execution_id: "e3", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
        rec({ execution_id: "e4", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
        rec({ execution_id: "e5", pattern: BehaviorPattern.CALIBRATED_FLUENCY })
      ],
      prevalence_mode: "NUMERIC_SHARE"
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.result.prevalence_mode).toBe("NUMERIC_SHARE");
      expect(out.result.verdict).toBe("SURFACE");
      expect(out.result.suppression_reason).toBeNull();
      const row = out.result.pattern_distribution[0]!;
      expect(row.share).toBe(1);
      expect(row.prevalence_band).toBeUndefined();
    }
  });

  it("aggregates single workflow in CATEGORICAL_PREVALENCE explicitly", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        rec({ execution_id: "e1", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
        rec({ execution_id: "e2", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
        rec({ execution_id: "e3", pattern: BehaviorPattern.FRICTION_LOOP }),
        rec({ execution_id: "e4", pattern: BehaviorPattern.FRICTION_LOOP }),
        rec({ execution_id: "e5", pattern: BehaviorPattern.FRICTION_LOOP })
      ],
      prevalence_mode: "CATEGORICAL_PREVALENCE"
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.result.prevalence_mode).toBe("CATEGORICAL_PREVALENCE");
      const cal = out.result.pattern_distribution.find(
        (d) => d.pattern === BehaviorPattern.CALIBRATED_FLUENCY
      )!;
      const fr = out.result.pattern_distribution.find(
        (d) => d.pattern === BehaviorPattern.FRICTION_LOOP
      )!;
      expect(cal.prevalence_band).toBe("MODERATE");
      expect(fr.prevalence_band).toBe("HIGH");
      assertNumericDist(cal, "CATEGORICAL_PREVALENCE");
      assertNumericDist(fr, "CATEGORICAL_PREVALENCE");
    }
  });

  it("suppresses the slice when any execution fails execution-level gates", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        rec({ execution_id: "e1", pattern: BehaviorPattern.BLIND_EFFICIENCY }),
        rec({ execution_id: "e3", pattern: BehaviorPattern.BLIND_EFFICIENCY }),
        rec({ execution_id: "e4", pattern: BehaviorPattern.BLIND_EFFICIENCY }),
        rec({ execution_id: "e5", pattern: BehaviorPattern.BLIND_EFFICIENCY }),
        rec({
          execution_id: "e2",
          status: "SUPPRESSED",
          suppression_reason: "INSUFFICIENT_SIGNAL"
        })
      ]
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.result.verdict).toBe("SUPPRESS");
      expect(out.result.suppression_reason).toBe("INSUFFICIENT_SIGNAL");
      expect(out.result.classified_execution_count).toBe(4);
      expect(out.result.suppressed_execution_count).toBe(1);
      expect(out.result.pattern_distribution).toEqual([]);
    }
  });

  it("rejects mixed workflow", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        { ...rec({ execution_id: "e1" }), workflow_id: "a" },
        { ...rec({ execution_id: "e2" }), workflow_id: "b" }
      ]
    });
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.failed_reason).toBe("MIXED_WORKFLOW");
    }
  });

  it("empty input fails", () => {
    const out = aggregateWorkflowClassifications({ records: [] });
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.failed_reason).toBe("EMPTY_INPUT");
    }
  });

  it("zero allowed executions yields empty distribution", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        rec({
          execution_id: "e1",
          status: "SUPPRESSED",
          suppression_reason: "INCOMPLETE_EXECUTION"
        })
      ]
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.result.verdict).toBe("SUPPRESS");
      expect(out.result.suppression_reason).toBe("INSUFFICIENT_VOLUME");
      expect(out.result.classified_execution_count).toBe(0);
      expect(out.result.pattern_distribution).toEqual([]);
      expect(out.result.prevalence_mode).toBe("CATEGORICAL_PREVALENCE");
    }
  });

  it("suppresses a one-execution JBTD persona slice independently", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        rec({
          execution_id: "solo",
          jbtd_id: "manager-review",
          persona_id: "frontline-manager",
          pattern: BehaviorPattern.CALIBRATED_FLUENCY
        })
      ]
    });

    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.result.workflow_id).toBe("wf1");
      expect(out.result.jbtd_id).toBe("manager-review");
      expect(out.result.persona_id).toBe("frontline-manager");
      expect(out.result.verdict).toBe("SUPPRESS");
      expect(out.result.suppression_reason).toBe("INSUFFICIENT_VOLUME");
      expect(out.result.classified_execution_count).toBe(0);
      expect(out.result.suppressed_execution_count).toBe(1);
      expect(out.result.pattern_distribution).toEqual([]);
    }
  });

  it("rejects mixed JBTD persona slices", () => {
    const out = aggregateWorkflowClassifications({
      records: [
        rec({ execution_id: "a", jbtd_id: "review", persona_id: "manager" }),
        rec({ execution_id: "b", jbtd_id: "triage", persona_id: "engineer" })
      ]
    });
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.failed_reason).toBe("MIXED_SLICE");
    }
  });
});

describe("computePatternDistribution", () => {
  it("rounds share deterministically in NUMERIC_SHARE mode", () => {
    const records: ExecutionClassificationRecord[] = [
      rec({ execution_id: "a", pattern: BehaviorPattern.RECOVERY_MATURITY }),
      rec({ execution_id: "b", pattern: BehaviorPattern.RECOVERY_MATURITY }),
      rec({ execution_id: "c", pattern: BehaviorPattern.FRICTION_LOOP })
    ];
    const dist = computePatternDistribution(records, "NUMERIC_SHARE");
    const friction = dist.find((d) => d.pattern === BehaviorPattern.FRICTION_LOOP)!;
    expect(friction.count).toBe(1);
    expect(friction.share).toBe(
      Math.round((1 / 3) * 10 ** WORKFLOW_SHARE_DECIMALS) / 10 ** WORKFLOW_SHARE_DECIMALS
    );
    expect(friction.prevalence_band).toBeUndefined();
  });

  it("maps bands correctly in CATEGORICAL_PREVALENCE mode", () => {
    const lowRecords: ExecutionClassificationRecord[] = [
      ...Array.from({ length: 9 }, (_, i) =>
        rec({ execution_id: `x${i}`, pattern: BehaviorPattern.BLIND_EFFICIENCY })
      ),
      rec({ execution_id: "y", pattern: BehaviorPattern.FRICTION_LOOP })
    ];
    const lowDist = computePatternDistribution(lowRecords, "CATEGORICAL_PREVALENCE");
    const frictionLow = lowDist.find((d) => d.pattern === BehaviorPattern.FRICTION_LOOP)!;
    expect(frictionLow.prevalence_band).toBe("LOW");
    expect(frictionLow.share).toBeUndefined();

    const modRecords: ExecutionClassificationRecord[] = [
      rec({ execution_id: "a", pattern: BehaviorPattern.RECOVERY_MATURITY }),
      rec({ execution_id: "b", pattern: BehaviorPattern.RECOVERY_MATURITY }),
      rec({ execution_id: "c", pattern: BehaviorPattern.RECOVERY_MATURITY }),
      rec({ execution_id: "d", pattern: BehaviorPattern.RECOVERY_MATURITY }),
      rec({ execution_id: "e", pattern: BehaviorPattern.FRICTION_LOOP })
    ];
    const modDist = computePatternDistribution(modRecords, "CATEGORICAL_PREVALENCE");
    const frMod = modDist.find((d) => d.pattern === BehaviorPattern.FRICTION_LOOP)!;
    expect(frMod.prevalence_band).toBe("MODERATE");

    const highRecords: ExecutionClassificationRecord[] = [
      rec({ execution_id: "a", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
      rec({ execution_id: "b", pattern: BehaviorPattern.CALIBRATED_FLUENCY })
    ];
    const highDist = computePatternDistribution(highRecords, "CATEGORICAL_PREVALENCE");
    expect(highDist[0]!.prevalence_band).toBe("HIGH");
  });

  it("defaults computePatternDistribution to CATEGORICAL_PREVALENCE", () => {
    const records = [
      rec({ execution_id: "a", pattern: BehaviorPattern.CALIBRATED_FLUENCY }),
      rec({ execution_id: "b", pattern: BehaviorPattern.CALIBRATED_FLUENCY })
    ];
    const dist = computePatternDistribution(records);
    expect(dist[0]!.prevalence_band).toBe("HIGH");
    expect(dist[0]!.share).toBeUndefined();
  });
});

describe("toPrevalenceBand", () => {
  it("uses named thresholds", () => {
    expect(toPrevalenceBand(PREVALENCE_BAND_LOW_MAX_SHARE - 0.01)).toBe("LOW");
    expect(toPrevalenceBand(PREVALENCE_BAND_LOW_MAX_SHARE)).toBe("MODERATE");
    expect(toPrevalenceBand(PREVALENCE_BAND_MODERATE_MAX_SHARE - 0.01)).toBe("MODERATE");
    expect(toPrevalenceBand(PREVALENCE_BAND_MODERATE_MAX_SHARE)).toBe("HIGH");
  });
});
