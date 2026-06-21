import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AIValueReadoutPrototype } from "./AIValueReadoutPrototype";

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
    const workflowContext = screen.getByRole("region", { name: /Workflow being evaluated/i });
    expect(within(workflowContext).getByText("Customer Support Resolution")).toBeInTheDocument();
    expect(within(workflowContext).getByText(/2026-Q1 to 2026-Q2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Financial Translation/i).length).toBeGreaterThan(0);

    const summary = screen.getByRole("region", { name: /Executive value summary/i });
    expect(within(summary).getByText(/Fast but shallow/i)).toBeInTheDocument();
    expect(within(summary).getByText("Emerging Evidence")).toBeInTheDocument();
    expect(within(summary).getByText(/Executive Caveated/i)).toBeInTheDocument();
    expect(within(summary).getByText(/Estimate/i)).toBeInTheDocument();

    const vbd = screen.getByRole("region", { name: /VBD operating posture/i });
    expect(within(vbd).getByText("Velocity")).toBeInTheDocument();
    expect(within(vbd).getByText("High")).toBeInTheDocument();
    expect(within(vbd).getByText("Breadth")).toBeInTheDocument();
    expect(within(vbd).getByText("Depth")).toBeInTheDocument();
    expect(within(vbd).getAllByText("Medium")).toHaveLength(2);
    expect(within(vbd).getByText(/not yet strong enough for realized financial claims/i)).toBeInTheDocument();

    const outcome = screen.getByRole("region", { name: /Measurement evidence/i });
    expect(within(outcome).getByText(/Resolution cycle time/i)).toBeInTheDocument();
    expect(within(outcome).getByText(/Reopen rate did not degrade/i)).toBeInTheDocument();

    const gate = screen.getByRole("region", { name: /Financial claim review/i });
    expect(within(gate).getByText(/Executive Caveated/i)).toBeInTheDocument();
    expect(within(gate).getByText(/Aggregate Workflow Capacity/i)).toBeInTheDocument();
    expect(within(gate).getByText(/Value Accounting/i)).toBeInTheDocument();
    expect(within(gate).getByText(/Customer-Facing Economic Output/i)).toBeInTheDocument();

    const ebita = screen.getByRole("region", { name: /Financial translation/i });
    expect(within(ebita).getByText(/No realized financial claim is allowed/i)).toBeInTheDocument();
    expect(within(ebita).getByText(/Capacity Created/i)).toBeInTheDocument();
    expect(within(ebita).getByText(/Operating Cost Reduction/i)).toBeInTheDocument();

    const safeClaims = screen.getByRole("region", { name: /Safe claims and caveats/i });
    expect(within(safeClaims).getByText(/This workflow may affect financial outcomes/i)).toBeInTheDocument();
    expect(within(safeClaims).getByText(/Usage telemetry alone does not establish realized financial value/i)).toBeInTheDocument();
    expect(within(safeClaims).queryByText(/individual productivity/i)).not.toBeInTheDocument();
    expect(within(safeClaims).queryByText(/manager/i)).not.toBeInTheDocument();

    const blocked = screen.getByRole("region", { name: /Blocked claims/i });
    expect(within(blocked).getByText(/Usage does not prove financial impact/i)).toBeInTheDocument();
    expect(within(blocked).getByText(/No headcount reduction claim/i)).toBeInTheDocument();
    expect(within(blocked).getByText(/No individual productivity claim/i)).toBeInTheDocument();
    expect(within(blocked).getByText(/No manager or team ranking/i)).toBeInTheDocument();

    const nextActions = screen.getByRole("region", { name: /Next evidence actions/i });
    expect(within(nextActions).getByText(/Attach customer-owned financial assumptions/i)).toBeInTheDocument();
    expect(within(nextActions).getByText(/Confirm finance owner and approval state/i)).toBeInTheDocument();

    expect(container.textContent).not.toMatch(/AI saved \$|proved ROI|employee score|HRIS analytics/i);
  });
});
