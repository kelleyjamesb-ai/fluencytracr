import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MethodologyReviewWorkspace } from "./MethodologyReviewWorkspace";

describe("MethodologyReviewWorkspace", () => {
  it("shows the review workspace with snapshot list and selected snapshot detail", () => {
    render(<MethodologyReviewWorkspace />);

    expect(screen.getByRole("heading", { name: /Methodology Review Workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Glean Time-Saves MVP measurement method/i })).toBeInTheDocument();
    expect(screen.getByText(/Approval gate/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Financial claim effect/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Dominant assumptions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sensitivity tests/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Safe \/ internal-only \/ suppressed examples/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Reviewer decision memo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Reviewer decision memo plain text/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Export claim packet/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/Claim packet JSON/i) as HTMLTextAreaElement).value).toContain(
      '"schema_version": "GCP_2026_05"'
    );
  });

  it("lets reviewers inspect internal-only and suppressed claim effects", async () => {
    render(<MethodologyReviewWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: /Nielsen-style internal ROI and payback fixture/i }));
    expect(screen.getAllByText(/internal-only/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/customer-facing ROI\/payback requires customer-safe methodology approval/i).length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/Reviewer decision memo plain text/i) as HTMLTextAreaElement).value).toMatch(
      /Decision state: internal-only/i
    );
    expect((screen.getByLabelText(/Claim packet JSON/i) as HTMLTextAreaElement).value).toMatch(
      /"selected_methodology_snapshot_id": "nielsen_roi_payback_internal_2025_10"/i
    );

    fireEvent.click(screen.getByRole("button", { name: /Suppressed unapproved value model/i }));
    expect(screen.getAllByText(/suppressed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rejected methodology snapshots exist only to preserve audit history/i).length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/Reviewer decision memo plain text/i) as HTMLTextAreaElement).value).toMatch(
      /Decision state: suppressed/i
    );
    expect((screen.getByLabelText(/Claim packet JSON/i) as HTMLTextAreaElement).value).toMatch(
      /"selected_methodology_snapshot_id": "suppressed_unapproved_value_model_2026_05"/i
    );
  });

  it("does not render forbidden raw or person-level review fields", () => {
    const { container } = render(<MethodologyReviewWorkspace />);

    expect(container.textContent).not.toMatch(
      /raw_prompt|raw_response|transcript_id|query_text|tool_payload|file_content|user_id|employee_id|manager_view|team_ranking|productivity_score/i
    );
  });
});
