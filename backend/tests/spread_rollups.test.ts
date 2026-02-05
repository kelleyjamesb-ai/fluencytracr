import { runDailySpreadRollup } from "../src/spread_metrics";

it("suppresses spread rollups under TG5", () => {
  const result = runDailySpreadRollup("org-1", "2026-01-01");
  expect(result).toBeNull();
});
