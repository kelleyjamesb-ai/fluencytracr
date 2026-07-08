import {
  createControlConfigVersion,
  registerWorkflowVersion,
  resetBaseline
} from "../src/workflow_registry";
import { store } from "../src/store";

beforeEach(() => {
  store.reset();
});

describe("workflow registry governance posture", () => {
  it("does not persist direct actor subjects for registry or baseline writes", async () => {
    const created = await registerWorkflowVersion({
      orgId: "org-1",
      workflowId: "wf-1",
      riskClass: "low",
      changeReason: "seed",
      actorSub: "user-123@example.com",
      actorRole: "ADMIN"
    });
    const reset = await resetBaseline({
      orgId: "org-1",
      controlConfigVersionId: "policy-1",
      reason: "manual reset",
      triggeredByUser: "user-456@example.com",
      triggeredByRole: "GOV_OPERATOR"
    });

    expect(created.changedByUser).toBe("system");
    expect(reset.triggeredByUser).toBe("system");
    expect(Array.from(store.workflowRegistryAudit.values())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actorSub: undefined }),
        expect.objectContaining({ actorSub: undefined })
      ])
    );
    expect(JSON.stringify(Array.from(store.workflowRegistry.values()))).not.toContain("user-123");
    expect(JSON.stringify(Array.from(store.baselineResetEvents.values()))).not.toContain("user-456");
  });

  it("persists compiled visibility constants instead of caller-supplied thresholds", async () => {
    const created = await createControlConfigVersion({
      orgId: "org-1",
      versionName: "attempted-override",
      changeReason: "attempted override",
      changedByUser: "user-789@example.com",
      changedByRole: "ADMIN",
      windowDaysLow: 1,
      windowDaysMedium: 2,
      windowDaysHigh: 3,
      minEventsLow: 1,
      minEventsMedium: 2,
      minEventsHigh: 3,
      requireVerificationHigh: false
    });

    expect(created.changedByUser).toBe("system");
    expect(created.windowDaysLow).toBe(60);
    expect(created.windowDaysMedium).toBe(60);
    expect(created.windowDaysHigh).toBe(60);
    expect(created.minEventsLow).toBe(5);
    expect(created.minEventsMedium).toBe(5);
    expect(created.minEventsHigh).toBe(8);
    expect(created.requireVerificationHigh).toBe(true);
  });
});
