import { afterEach, describe, expect, it, vi } from "vitest";
import {
  writeSelectedOutcomeMetricSelection,
  writeSelectedOutcomeMetricWatchPlan,
  type SelectedOutcomeMetricSelection
} from "./aiValueMetricSelection";

const selection: SelectedOutcomeMetricSelection = {
  functionArea: "Engineering / Software Development",
  quadrantLabel: "High-fluency flow",
  vbdBaseline: "Velocity 88 · Breadth 86 · Depth 88",
  metrics: [
    {
      id: "eng-lead-time-for-changes",
      name: "Lead Time for Changes",
      valueRoute: "Acceleration",
      sourceSystem: "Version control and deployment systems",
      measurementUnit: "days",
      owner: "Engineering Operations"
    }
  ]
};

describe("aiValueMetricSelection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("does not crash the workspace when browser storage writes fail", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(() => writeSelectedOutcomeMetricSelection(selection)).not.toThrow();
    expect(() =>
      writeSelectedOutcomeMetricWatchPlan({
        activeFunctionArea: selection.functionArea,
        selectionsByFunction: {
          [selection.functionArea]: selection
        }
      })
    ).not.toThrow();
  });
});
