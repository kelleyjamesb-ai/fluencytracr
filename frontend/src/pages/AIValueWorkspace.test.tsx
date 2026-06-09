import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AIValueWorkspace } from "./AIValueWorkspace";

describe("AIValueWorkspace", () => {
  it("renders a client-facing AI value workshop instead of internal object names", () => {
    const { container } = render(<AIValueWorkspace />);

    expect(screen.getByRole("heading", { name: /AI Value Workshop/i })).toBeInTheDocument();
    expect(screen.getByText(/Customer support case resolution/i)).toBeInTheDocument();
    expect(screen.getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs client assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Internal planning only/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Workflow Canvas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Value Signals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Value Story/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Evidence Check/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Safe Language/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Executive Brief/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Value Signals/i }));
    expect(screen.getByText(/Are cases resolving faster/i)).toBeInTheDocument();
    expect(screen.getByText(/Support case management system/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Safe Language/i }));
    expect(screen.getByText(/What we can say now/i)).toBeInTheDocument();
    expect(screen.getByText(/What we cannot say/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /workflow_state|metric_state|claim boundary|raw_prompt|raw_response|employee_id|user_id|manager_view|team_ranking|productivity_score|Glean proved ROI/i
    );
  });

  it("lets users move from value story to executive brief without database language", () => {
    render(<AIValueWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: /Value Story/i }));
    expect(screen.getByText(/Most cautious/i)).toBeInTheDocument();
    expect(screen.getByText(/Working case/i)).toBeInTheDocument();
    expect(screen.getByText(/Expansion case/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Executive Brief/i }));
    expect(screen.getByText(/Decision for the sponsor/i)).toBeInTheDocument();
    expect(screen.getByText(/Hold for assumptions before external value claims/i)).toBeInTheDocument();
  });
});
