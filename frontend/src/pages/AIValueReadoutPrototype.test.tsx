import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AIValueReadoutPrototype } from "./AIValueReadoutPrototype";

const readoutCss = readFileSync(`${process.cwd()}/src/styles.css`, "utf8");
const cssHasDeclaration = (selector: string, declaration: string) => {
  const rules = readoutCss.matchAll(/([^{}]+)\{([^{}]+)\}/g);
  return Array.from(rules).some(([, selectors, body]) =>
    selectors
      .split(",")
      .map((item) => item.trim())
      .includes(selector) && body.includes(declaration)
  );
};

const renderReadout = () =>
  render(
    <MemoryRouter>
      <AIValueReadoutPrototype />
    </MemoryRouter>
  );

describe("AIValueReadoutPrototype", () => {
  it("renders an executive-readable governed AI value case", () => {
    const { container } = renderReadout();

    expect(
      screen.getByRole("heading", { name: /AI Value Executive Readout/i })
    ).toBeInTheDocument();
    const reportFrame = screen.getByRole("region", { name: /Governed report frame/i });
    expect(within(reportFrame).getByRole("heading", { name: /Decision Memo/i })).toBeInTheDocument();
    expect(within(reportFrame).getByText(/Evidence Annex/i)).toBeInTheDocument();
    const reportControls = within(reportFrame).getByRole("group", { name: /Report output controls/i });
    expect(within(reportControls).getByRole("button", { name: /Export not authorized/i })).toBeDisabled();
    expect(within(reportControls).getByRole("button", { name: /Share not authorized/i })).toBeDisabled();
    expect(within(reportFrame).getByText(/Preview only. Export not authorized/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Workspace navigation/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Alex Morgan/i)).not.toBeInTheDocument();
    const workflowContext = screen.getByRole("region", { name: /Workflow being evaluated/i });
    expect(within(workflowContext).getByText("Customer Support Resolution")).toBeInTheDocument();
    expect(within(workflowContext).getByText(/2026-Q1 to 2026-Q2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Stronger Claims Blocked/i).length).toBeGreaterThan(0);

    const summary = screen.getByRole("region", { name: /Executive value summary/i });
    expect(within(summary).getByText(/Fast but shallow/i)).toBeInTheDocument();
    expect(within(summary).getByText("Emerging Evidence")).toBeInTheDocument();
    expect(within(summary).getByText(/Internal Claim Boundary Review/i)).toBeInTheDocument();
    expect(within(summary).getByText(/Held/i)).toBeInTheDocument();
    expect(within(summary).queryByText(/Financial confidence/i)).not.toBeInTheDocument();
    expect(within(summary).queryByText(/Confidence/i)).not.toBeInTheDocument();

    const vbd = screen.getByRole("region", { name: /VBD operating posture/i });
    expect(within(vbd).getByText("Velocity")).toBeInTheDocument();
    expect(within(vbd).getByText("High")).toBeInTheDocument();
    expect(within(vbd).getByText("Breadth")).toBeInTheDocument();
    expect(within(vbd).getByText("Depth")).toBeInTheDocument();
    expect(within(vbd).getAllByText("Medium")).toHaveLength(2);
    expect(within(vbd).getByText(/not yet strong enough for stronger value claims/i)).toBeInTheDocument();

    const outcome = screen.getByRole("region", { name: /Measurement evidence/i });
    expect(within(outcome).getByText(/Resolution cycle time/i)).toBeInTheDocument();
    expect(within(outcome).getByText(/Reopen rate did not degrade/i)).toBeInTheDocument();

    const measurementStory = screen.getByRole("region", {
      name: /AI contribution reporting spine/i
    });
    expect(within(measurementStory).getByRole("heading", { name: /Measurement story/i })).toBeInTheDocument();
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

    const gate = screen.getByRole("region", { name: /Claim boundary review/i });
    expect(within(gate).getByText(/Internal Claim Boundary Review/i)).toBeInTheDocument();
    expect(within(gate).getByText(/No stronger outputs allowed/i)).toBeInTheDocument();
    expect(within(gate).getByText(/Value Accounting/i)).toBeInTheDocument();
    expect(within(gate).getByText(/Customer-Facing Economic Output/i)).toBeInTheDocument();
    expect(within(gate).getByText(/Aggregate Workflow Capacity/i)).toBeInTheDocument();

    const ebita = screen.getByRole("region", { name: /Stronger claims blocked/i });
    expect(within(ebita).getByText(/No realized economic claim is allowed/i)).toBeInTheDocument();
    expect(within(ebita).getByText(/Aggregate Capacity Context/i)).toBeInTheDocument();
    expect(within(ebita).getByText(/Operating Process Context/i)).toBeInTheDocument();

    const safeClaims = screen.getByRole("region", { name: /Safe claims and caveats/i });
    expect(within(safeClaims).getByText(/requires further review/i)).toBeInTheDocument();
    expect(within(safeClaims).getByText(/Usage telemetry alone does not establish realized value/i)).toBeInTheDocument();
    expect(within(safeClaims).queryByText(/individual productivity/i)).not.toBeInTheDocument();
    expect(within(safeClaims).queryByText(/manager/i)).not.toBeInTheDocument();

    const blocked = screen.getByRole("region", { name: /Blocked claims/i });
    expect(within(blocked).getByText(/Usage does not prove financial impact/i)).toBeInTheDocument();
    expect(within(blocked).getByText(/No headcount reduction claim/i)).toBeInTheDocument();
    expect(within(blocked).getByText(/No individual productivity claim/i)).toBeInTheDocument();
    expect(within(blocked).getByText(/No manager or team ranking/i)).toBeInTheDocument();

    const nextActions = screen.getByRole("region", { name: /Next evidence actions/i });
    expect(within(nextActions).getByText(/Attach customer-owned outcome assumptions/i)).toBeInTheDocument();
    expect(within(nextActions).getByText(/Confirm source owner and review state/i)).toBeInTheDocument();

    expect(container.textContent).not.toMatch(
      /AI saved \$|proved ROI|employee score|HRIS analytics|Financial confidence|Executive Caveated/i
    );
  });

  it("keeps readout governance boundaries readable on light report surfaces", () => {
    expect(
      cssHasDeclaration(".ai-value-readout-report-frame .ai-value-readout-warning", "color: #7a2e0e")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-readout-report-frame .ai-value-readout-permissions span", "color: #1f2937")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-readout-report-frame .ai-value-readout-export-bar .ai-value-map-label", "color: #334155")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-readout-report-frame .ai-value-readout-export-actions .ai-value-step:disabled", "opacity: 1")
    ).toBe(true);
    expect(cssHasDeclaration(".ai-value-readout-report-frame", "min-width: 0")).toBe(true);
    expect(cssHasDeclaration(".ai-value-readout-report-main", "min-width: 0")).toBe(true);
    expect(cssHasDeclaration(".ai-value-readout-report-hero", "min-width: 0")).toBe(true);
  });
});
