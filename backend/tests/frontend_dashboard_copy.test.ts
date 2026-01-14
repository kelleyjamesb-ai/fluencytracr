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
