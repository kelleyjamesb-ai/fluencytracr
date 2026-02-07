import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";
import { GOVERNANCE_FORBIDDEN_FIELDS } from "@learnaire/shared";

type UnknownRecord = Record<string, unknown>;

const collectKeys = (value: unknown, keys: Set<string>) => {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return;
  }
  Object.entries(value as UnknownRecord).forEach(([k, v]) => {
    keys.add(k);
    collectKeys(v, keys);
  });
};

describe("Phase 5A absence-is-neutral", () => {
  let viewerCookie: string;
  beforeEach(async () => {
    store.reset();
    store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
    viewerCookie = await loginAs(app, "EXEC_VIEWER");
  });

  it("returns only neutral, non-quantified language", async () => {
    const response = await requestApp(app, {
      method: "GET",
      path: "/api/orientation/org-1?session_start=2025-01-01T00:00:00Z",
      headers: withAuth(viewerCookie)
    });

    expect(response.status).toBe(200);
    const body = (response.body || {}) as UnknownRecord;

    expect((body.observation_detected as UnknownRecord | undefined)?.does_not_mean).toBeDefined();
    expect((body.suppression_in_effect as UnknownRecord | undefined)?.does_not_mean).toBeDefined();

    const keys = new Set<string>();
    collectKeys(body, keys);

    const forbidden = new Set((GOVERNANCE_FORBIDDEN_FIELDS as readonly string[]).map((k) => k.toLowerCase()));
    const hits = Array.from(keys).filter((key) => forbidden.has(key.toLowerCase()));

    expect(hits).toEqual([]);
  });
});
