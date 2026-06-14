import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MethodologyReviewWorkspace } from "./MethodologyReviewWorkspace";

describe("MethodologyReviewWorkspace", () => {
  it("shows the review workspace with snapshot list and selected snapshot detail", () => {
    render(<MethodologyReviewWorkspace />);

    expect(screen.getByRole("heading", { name: /Methodology Review Workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/Methodology-Governed Claim Packaging/i)).toBeInTheDocument();
    expect(screen.getAllByText(/QBR-prep artifact/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not an ROI calculator/i)).toBeInTheDocument();
    expect(screen.getByText(/strongest safe claim language/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Glean Time-Saves MVP measurement method/i })).toBeInTheDocument();
    expect(screen.getByText(/Approval gate/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Financial claim effect/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Dominant assumptions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sensitivity tests/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Safe \/ internal-only \/ suppressed examples/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Reviewer decision memo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Reviewer decision memo plain text/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Export methodology-governed claim packet/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/Claim packet JSON/i) as HTMLTextAreaElement).value).toContain(
      '"schema_version": "GCP_2026_05"'
    );
    expect(screen.getByRole("heading", { name: /QBR narrative view/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /QBR readiness summary/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Customer-safe claims/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Top blockers/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Next upgrade action/i })).toBeInTheDocument();
    expect(screen.getByText(/1 customer-safe claim with caveats/i)).toBeInTheDocument();
    expect(screen.getByText(/No internal-only claims in this packet/i)).toBeInTheDocument();
    expect(screen.getByText(/2 suppressed or not-computed claims/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Real-source readiness/i })).toBeInTheDocument();
    expect(screen.getByText(/No ingestion is implemented/i)).toBeInTheDocument();
    expect(screen.getAllByText(/admin-exported aggregate upload/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Ready sources/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Blocked or unknown sources/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Approval required/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Affected claim buckets/i })).toBeInTheDocument();
    expect(screen.getAllByText(/no readiness upgrade/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Source evidence import/i })).toBeInTheDocument();
    expect(screen.getAllByText(/review only, no persistence/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Accepted aggregate evidence/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Withheld aggregate evidence/i })).toBeInTheDocument();
    expect(screen.getAllByText(/admin-exported aggregate upload/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/No live ingestion occurred/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Executive decision/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Strongest safe claim/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /Caveated claims/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: /Internal-only claims/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Suppressed \/ not-computed claims/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Evidence gaps/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Upgrade actions/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Governance boundaries/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Methodology snapshot summary/i })).toBeInTheDocument();
  });

  it("lets reviewers inspect internal-only and suppressed claim effects", async () => {
    render(<MethodologyReviewWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: /Synthetic Nielsen-style internal ROI and payback fixture/i }));
    expect(screen.getAllByText(/internal-only/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/customer-facing ROI\/payback requires customer-safe methodology approval/i).length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/Reviewer decision memo plain text/i) as HTMLTextAreaElement).value).toMatch(
      /Decision state: internal-only/i
    );
    expect((screen.getByLabelText(/Claim packet JSON/i) as HTMLTextAreaElement).value).toMatch(
      /"selected_methodology_snapshot_id": "nielsen_roi_payback_internal_2025_10"/i
    );
    expect(screen.getByText(/Executive decision: internal only/i)).toBeInTheDocument();
    expect(screen.getAllByText(/claim:cs_response_time_improvement/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Suppressed unapproved value model/i }));
    expect(screen.getAllByText(/suppressed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rejected methodology snapshots exist only to preserve audit history/i).length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/Reviewer decision memo plain text/i) as HTMLTextAreaElement).value).toMatch(
      /Decision state: suppressed/i
    );
    expect((screen.getByLabelText(/Claim packet JSON/i) as HTMLTextAreaElement).value).toMatch(
      /"selected_methodology_snapshot_id": "suppressed_unapproved_value_model_2026_05"/i
    );
    expect(screen.getAllByText(/suppressed_unapproved_value_model_2026_05/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/financial claim language is suppressed/i).length).toBeGreaterThan(0);
  });

  it("renders separated suppressed claims, evidence gaps, upgrade actions, and governance boundaries", () => {
    render(<MethodologyReviewWorkspace />);

    expect(screen.getAllByText(/glean\.roi\.customer_value_to_cost/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/strongest_safe_claim:financial_model/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Attach a finance-approved value model/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/does not calculate ROI independently/i).length).toBeGreaterThan(0);
  });

  it("does not render forbidden raw or person-level review fields", () => {
    const { container } = render(<MethodologyReviewWorkspace />);

    expect(container.textContent).not.toMatch(
      /raw_prompt|raw_response|transcript_id|query_text|tool_payload|file_content|user_id|employee_id|manager_view|team_ranking|productivity_score/i
    );
  });
});
