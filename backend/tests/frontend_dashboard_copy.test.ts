import fs from "fs";
import path from "path";

const dashboardPath = path.join(__dirname, "../../frontend/src/pages/Dashboard.tsx");

const readDashboard = () => {
  return fs.readFileSync(dashboardPath, "utf8");
};

it("defaults the executive dashboard window to 60d", () => {
  const content = readDashboard();
  expect(content).toMatch(/useState<[^>]*>\(\"60d\"\)/);
});

it("avoids forbidden language in UI copy", () => {
  const content = readDashboard().toLowerCase();
  const forbidden = ["proved", "caused", "improved performance", "underperformed", "roi", "success", "failure"];
  forbidden.forEach((word) => {
    expect(content).not.toContain(word);
  });
});

it("includes required pattern card sections", () => {
  const content = readDashboard();
  expect(content).toContain("What we're seeing");
  expect(content).toContain("What this might suggest");
  expect(content).toContain("What this does NOT mean");
  expect(content).toContain("Recommended posture");
});

it("includes compliance timeline filters for event type, policy, and since", () => {
  const content = readDashboard();
  expect(content).toContain("Compliance Event Timeline");
  expect(content).toContain("complianceEventTypeFilter");
  expect(content).toContain("complianceEventPolicyFilter");
  expect(content).toContain("complianceEventSinceFilter");
  expect(content).toContain("datetime-local");
});

it("includes quick since presets for governance review", () => {
  const content = readDashboard();
  expect(content).toContain("Last 24h");
  expect(content).toContain("Last 7d");
  expect(content).toContain("Last 30d");
  expect(content).toContain("Clear Since");
  expect(content).toContain("setSincePreset");
});

it("exports compliance events as filtered csv", () => {
  const content = readDashboard();
  expect(content).toContain("exportComplianceEventsCsv");
  expect(content).toContain("Export CSV");
  expect(content).toContain("compliance-events-${orgId}.csv");
  expect(content).toContain("URL.createObjectURL");
});

it("includes admin mode controls for shadow and enforced states", () => {
  const content = readDashboard();
  expect(content).toContain("PATCH");
  expect(content).toContain("/orgs/${orgId}/compliance/mode");
  expect(content).toContain("Set Shadow");
  expect(content).toContain("Set Enforced");
  expect(content).toContain("isAdminRole");
});

it("handles compliance timeline refresh and load-more errors", () => {
  const content = readDashboard();
  expect(content).toContain("Unable to refresh compliance events.");
  expect(content).toContain("Unable to load more compliance events.");
});
