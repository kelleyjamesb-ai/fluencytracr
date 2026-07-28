import { runDailySpreadRollup } from "../src/spread_metrics";
import { store } from "../src/store";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
  store.teams.set("team-1", { id: "team-1", orgId: "org-1", name: "Team" });
  store.teams.set("team-2", { id: "team-2", orgId: "org-1", name: "Team 2" });
  store.toolInventory.set("org-1:team-1:llm_chat", {
    orgId: "org-1",
    teamId: "team-1",
    toolClass: "llm_chat",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-01T00:00:00Z"
  });
  store.toolInventory.set("org-1:team-2:coding", {
    orgId: "org-1",
    teamId: "team-2",
    toolClass: "coding",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-01T00:00:00Z"
  });
});

it("computes spread rollups from tool inventory", () => {
  const rollup = runDailySpreadRollup("org-1", "2024-01-01");
  expect(rollup).toBeNull();
  const stored = store.spreadRollups.get("org-1:2024-01-01");
  expect(stored?.totalTeams).toBe(2);
  expect(stored?.teamsWithAi).toBe(2);
  expect(stored?.percentTeamsWithAi).toBe(1);
});

it("holds spread outputs when the adopting-team numerator is below k", () => {
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
  store.toolInventory.delete("org-1:team-2:coding");
  for (let index = 3; index <= 5; index += 1) {
    store.teams.set(`team-${index}`, {
      id: `team-${index}`,
      orgId: "org-1",
      name: `Team ${index}`
    });
  }

  const rollup = runDailySpreadRollup("org-1", "2024-01-01");
  expect(rollup).toBeNull();
  const stored = store.spreadRollups.get("org-1:2024-01-01");
  expect(stored?.suppressed).toBe(true);
  expect(stored?.totalTeams).toBe(0);
  expect(stored?.teamsWithAi).toBe(0);
  expect(stored?.percentTeamsWithAi).toBeNull();
  expect(stored?.adoptionSpread).toBeNull();
  expect(stored?.concentrationIndex).toBeNull();
});
