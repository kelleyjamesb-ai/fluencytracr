import { runEnablementRollupsForEvents } from "../src/enablement_rollups";
import { store } from "../src/store";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 2, createdAt: "now" });
  store.teams.set("team-1", { id: "team-1", orgId: "org-1", name: "Team" });
  store.roles.set("role-1", { id: "role-1", orgId: "org-1", name: "Role" });
});

it("suppresses rollups below minimum group size", () => {
  const event = {
    eventId: "evt-1",
    orgId: "org-1",
    teamId: "team-1",
    roleId: "role-1",
    timestamp: "2024-01-01T00:00:00Z",
    eventType: "assessment_pre",
    payload: {}
  };
  store.enablementEvents.set(event.eventId, event);
  const rollups = runEnablementRollupsForEvents("org-1", [event]);
  expect(rollups).toHaveLength(1);
  expect(rollups[0].suppressed).toBe(true);
  expect(rollups[0].percentEnabledByRole).toBeNull();
});

it("computes assessment delta and cadence when above threshold", () => {
  const events = [
    {
      eventId: "evt-1",
      orgId: "org-1",
      teamId: "team-1",
      roleId: "role-1",
      timestamp: "2024-01-02T00:00:00Z",
      eventType: "assessment_pre",
      payload: {}
    },
    {
      eventId: "evt-2",
      orgId: "org-1",
      teamId: "team-1",
      roleId: "role-1",
      timestamp: "2024-01-02T00:00:00Z",
      eventType: "assessment_post",
      payload: {}
    }
  ];
  events.forEach((event) => store.enablementEvents.set(event.eventId, event));
  const rollups = runEnablementRollupsForEvents("org-1", events);
  expect(rollups[0].suppressed).toBe(false);
  expect(rollups[0].assessmentDelta).toBe(1);
});
