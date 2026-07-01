import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AIValueReadoutPrototype } from "./AIValueReadoutPrototype";

const qaNotes = readFileSync(`${process.cwd()}/../design-qa.md`, "utf8");
const uiTerm = (...parts: string[]) => parts.join("");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const forbiddenReportPattern = new RegExp(
  [
    uiTerm("AI", " ", "saved", " ", "$"),
    uiTerm("proved", " ", "ROI"),
    uiTerm("employee", " ", "score"),
    uiTerm("HRIS", " ", "analytics"),
    uiTerm("financial", " ", "confidence"),
    uiTerm("caused", " ", "revenue"),
    uiTerm("team", " ", "ranking")
  ]
    .map(escapeRegExp)
    .join("|"),
  "i"
);

const renderReadout = () =>
  render(
    <MemoryRouter>
      <AIValueReadoutPrototype />
    </MemoryRouter>
  );

describe("AIValueReadoutPrototype", () => {
  it("renders a report-first decision memo with governed evidence annex", () => {
    const { container } = renderReadout();

    expect(screen.getByRole("heading", { name: /Decision Memo/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Caveated internal review draft/i).length).toBeGreaterThan(0);

    const context = screen.getByRole("region", { name: /Report context/i });
    expect(within(context).getByText("Example client organization")).toBeInTheDocument();
    expect(within(context).getByText("AI Assistant Value Assessment")).toBeInTheDocument();
    expect(screen.getByText(/Caveated review only/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review caveats/i })).toBeInTheDocument();
    expect((container.textContent ?? "").indexOf("Caveated review only")).toBeLessThan(
      (container.textContent ?? "").indexOf("Review caveats")
    );
    expect(screen.queryByText("AM")).not.toBeInTheDocument();
    expect(screen.queryByText(/Alex Morgan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Value Lead/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Value realization role/i)).toBeInTheDocument();

    const report = screen.getByRole("article", { name: /Internal value evidence review draft/i });
    expect(within(report).getByText(/Evidence supports planning, not ROI proof/i)).toBeInTheDocument();
    expect(within(report).getByText(/Customer-owned metric required for stronger claims/i)).toBeInTheDocument();
    expect(within(report).getAllByText(/Causality blocked/i).length).toBeGreaterThan(0);
    expect(within(report).getByText(/Executive narrative/i)).toBeInTheDocument();
    expect(within(report).getByText(/Evidence posture/i)).toBeInTheDocument();
    expect(within(report).getByText(/Claim boundary/i)).toBeInTheDocument();
    expect(within(report).getByText(/Recommended next move/i)).toBeInTheDocument();

    expect(within(report).getByText(/Workflow process signals/i)).toBeInTheDocument();
    expect(within(report).getByText(/Quality \/ accuracy gains/i)).toBeInTheDocument();
    expect(within(report).getByText(/Financial impact/i)).toBeInTheDocument();
    expect(within(report).getByText(/Attribution to AI Assistant/i)).toBeInTheDocument();
    expect(within(report).getByText(/Implementation feasibility context/i)).toBeInTheDocument();
    expect(within(report).getByText(/not customer outcome evidence/i)).toBeInTheDocument();
    expect(report.textContent).not.toMatch(/Northbridge Financial Services|Vendor internal benchmarks|Internal only/i);

    const annex = screen.getByRole("complementary", { name: /Evidence annex/i });
    expect(within(annex).getByText(/Evidence blocks included in this caveated report/i)).toBeInTheDocument();
    expect(within(annex).getByText(/Workflow telemetry/i)).toBeInTheDocument();
    expect(within(annex).getByText(/Quality \/ error review/i)).toBeInTheDocument();
    expect(within(annex).getByText(/Adoption signals/i)).toBeInTheDocument();
    expect(within(annex).queryByText(/Cycle time analysis/i)).not.toBeInTheDocument();
    expect(within(annex).queryByText(/Business outcome metrics/i)).not.toBeInTheDocument();
    expect(within(annex).queryByText(/Financial impact analysis/i)).not.toBeInTheDocument();
    expect(within(annex).queryByText(/Vendor benchmark pack/i)).not.toBeInTheDocument();
    expect(within(annex).queryByText(/Attribution analysis/i)).not.toBeInTheDocument();
    expect(within(annex).getAllByText("Included")).toHaveLength(1);
    expect(within(annex).getAllByText("Caveated")).toHaveLength(2);
    expect(within(annex).queryByText("Blocked")).not.toBeInTheDocument();
    expect(within(annex).queryByText("Internal only")).not.toBeInTheDocument();
    expect(within(annex).queryByText("Needs evidence")).not.toBeInTheDocument();

    const exportReadiness = screen.getByRole("contentinfo", { name: /Export readiness/i });
    expect(within(exportReadiness).getByText(/Draft only - export blocked/i)).toBeInTheDocument();
    expect(within(exportReadiness).getByText(/Blocked and internal-only items are excluded/i)).toBeInTheDocument();
    expect(within(exportReadiness).getByText(/Evidence supports planning, not ROI proof/i)).toBeInTheDocument();
    expect(
      within(exportReadiness).getByRole("button", { name: /Review export blockers/i })
    ).toBeInTheDocument();
    expect(
      within(exportReadiness).getByRole("button", {
        name: /Export blocked pending governance contract/i
      })
    ).toBeDisabled();

    const measurementStory = screen.getByRole("region", {
      name: /AI contribution reporting spine/i
    });
    expect(within(measurementStory).getByRole("heading", { name: /Measurement story/i })).toBeInTheDocument();
    expect(
      within(measurementStory).getAllByText(/AI Assistant Value Assessment/i).length
    ).toBeGreaterThan(0);
    expect(within(measurementStory).queryByText(/Customer Support Resolution/i)).not.toBeInTheDocument();
    expect(within(measurementStory).getByText(/Candidate metric recommendations are planning inputs/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Selected metric approval/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Held for reviewer approval/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Reviewer metric-selection draft intake/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Comparison-design intake readiness/i)).toBeInTheDocument();
    expect(
      within(measurementStory).getAllByText(/Source package draft assembly/i).length
    ).toBeGreaterThan(0);
    expect(
      within(measurementStory).getAllByText(/Reviewer-owned source package collection/i).length
    ).toBeGreaterThan(0);
    expect(
      within(measurementStory).getAllByText(/Comparison-design source package review/i).length
    ).toBeGreaterThan(0);
    expect(within(measurementStory).getByText(/Draft intake held/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Readiness held/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Draft package not started/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Draft assembly held/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Collection held/i)).toBeInTheDocument();
    expect(within(measurementStory).getByText(/Source package review held/i)).toBeInTheDocument();
    expect(
      within(measurementStory).getByText(/Choose a candidate metric before draft intake preparation/i)
    ).toBeInTheDocument();
    const adapterView = within(measurementStory).getByRole("region", {
      name: /AI value UI view model/i
    });
    expect(
      within(adapterView).getByRole("heading", { name: /Metrics Recommended/i })
    ).toBeInTheDocument();
    expect(within(adapterView).getByText(/Step 3 of 13/i)).toBeInTheDocument();
    expect(within(adapterView).getByText(/Model review blocked/i)).toBeInTheDocument();
    expect(
      within(adapterView).queryByText(/Evidence streams for review/i)
    ).not.toBeInTheDocument();
    expect(
      within(adapterView).queryByText(/AI Fluency Instrument \(SED\)/i)
    ).not.toBeInTheDocument();
    expect(adapterView.textContent).not.toMatch(
      /confidence|probability|posterior|source_ref|source_hash|reviewer_owned_payload|employee_id|prompt|transcript|[a-f0-9]{64}/i
    );
    expect(
      within(measurementStory).getByText(/Comparison-design readiness does not create a source package/i)
    ).toBeInTheDocument();
    expect(
      within(measurementStory).getAllByText(
        /Source package review checks reviewer-owned completeness and admissibility only/i
      ).length
    ).toBeGreaterThan(0);
    expect(
      within(measurementStory).getAllByText(/Model review posture/i).length
    ).toBeGreaterThan(0);
    expect(within(measurementStory).getByText(/Held for evidence gaps/i)).toBeInTheDocument();
    expect(
      within(measurementStory).getAllByText(/Missing comparison-design source package/i)
        .length
    ).toBeGreaterThan(0);
    const draftMilestoneSchedule = within(measurementStory)
      .getByText(/Draft milestone schedule/i)
      .closest(".ai-value-map-cell") as HTMLElement;
    const milestonePlan = within(measurementStory)
      .getByText(/^Milestone plan$/i)
      .closest(".ai-value-map-cell") as HTMLElement;
    for (const milestone of ["T0", "T30", "T60", "T90", "T120", "T180", "T270", "T365"]) {
      expect(within(draftMilestoneSchedule).getByText(milestone)).toBeInTheDocument();
      expect(within(milestonePlan).getByText(milestone)).toBeInTheDocument();
    }


    expect(container.textContent).not.toMatch(forbiddenReportPattern);
    expect(qaNotes).not.toMatch(/\/Users\/|\/home\/|C:\\Users/i);
  });
});
