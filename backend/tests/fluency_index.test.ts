import {
  computeFluencyIndexPreview,
  LEGACY_FLUENCY_INDEX_QUARANTINED,
  runFluencyIndexJob
} from "../src/fluency_service";
import { store } from "../src/store";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
});

it("keeps the legacy fluency index compatibility module quarantined", () => {
  expect(LEGACY_FLUENCY_INDEX_QUARANTINED).toBe(true);
  const preview = computeFluencyIndexPreview("org-1", "2024-01-01");
  expect(preview).toEqual({
    score: null,
    dataCompleteness: 0,
    confidence: 0,
    dimensionScores: {
      coverage: null,
      depth: null,
      judgment: null,
      velocity: null
    }
  });
});

it("does not write legacy fluency_index metrics or score snapshots", () => {
  store.metrics.set("org-1:org:2024-01-01:active_users_percent_of_assigned:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "active_users_percent_of_assigned",
    metric_value: 0.8,
    is_user_count: false,
    suppressed: false
  });

  runFluencyIndexJob("org-1");

  expect(Array.from(store.metrics.values()).some((metric) => metric.metric_name === "fluency_index")).toBe(false);
  expect(store.fluencySnapshots.size).toBe(0);
  expect(store.fluencyDimensions.size).toBe(0);
});
