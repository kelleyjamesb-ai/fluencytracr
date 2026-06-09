import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AIValueWorkspace } from "./AIValueWorkspace";

describe("AIValueWorkspace", () => {
  it("renders the governed V1 spine from Blueprint through Executive Packet", () => {
    const { container } = render(<AIValueWorkspace />);

    expect(screen.getByRole("heading", { name: /AI Value Workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/Customer support case resolution/i)).toBeInTheDocument();
    expect(screen.getByText(/CAPACITY_CREATION/i)).toBeInTheDocument();
    expect(screen.getByText(/HOLD_FOR_ASSUMPTIONS/i)).toBeInTheDocument();
    expect(screen.getByText(/INTERNAL_ONLY/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Blueprint/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Metrics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Scenario/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Evidence Readiness/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Claim Boundary/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Executive Packet/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Metrics/i }));
    expect(screen.getByText(/Median resolution time/i)).toBeInTheDocument();
    expect(screen.getByText(/Open backlog count/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Claim Boundary/i }));
    expect(screen.getByText(/Missing or caveated assumptions prevent external economic claims/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /raw_prompt|raw_response|employee_id|user_id|manager_view|team_ranking|productivity_score|Glean proved ROI/i
    );
  });

  it("lets users switch between object details without leaving the local workspace", () => {
    render(<AIValueWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: /Scenario/i }));
    expect(screen.getByText(/CONSERVATIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/BASE_CASE/i)).toBeInTheDocument();
    expect(screen.getByText(/EXPANDED/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Executive Packet/i }));
    expect(screen.getByText(/executive_packet_customer_support_v1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Customer Support AI Value Validation Packet/i).length).toBeGreaterThan(0);
  });
});
