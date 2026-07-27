import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GovernanceConcept } from "./GovernanceConcept";

vi.mock("../components/governanceConcept/ConceptHero", () => ({
  ConceptHero: () => <div>concept-hero</div>
}));
vi.mock("../components/governanceConcept/DesignStanceList", () => ({
  DesignStanceList: () => <div>design-stance</div>
}));
vi.mock("../components/governanceConcept/ExecutiveSignalHealth", () => ({
  ExecutiveSignalHealth: () => <div>signal-health</div>
}));
vi.mock("../components/governanceConcept/GovernanceDocumentWorkspace", () => ({
  GovernanceDocumentWorkspace: () => <div>document-workspace</div>
}));
vi.mock("../components/governanceConcept/HeroActionWorkspace", () => ({
  HeroActionWorkspace: () => <div>hero-workspace</div>
}));

describe("GovernanceConcept session containment", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("hides self-selected organization and role controls in required-auth mode", () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    localStorage.setItem("orgId", "stale-org");
    localStorage.setItem("role", "ADMIN");

    render(<GovernanceConcept />);

    expect(screen.queryByLabelText(/Organization ID/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Role/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply Local Example/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
  });

  it("labels self-selected controls as local-example-only when auth is not required", () => {
    render(<GovernanceConcept />);

    expect(screen.getByText(/Local example controls only/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
  });
});
