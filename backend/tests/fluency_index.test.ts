import { computeFluencyIndexPreview, runFluencyIndexJob } from "../src/fluency_service";

it("suppresses fluency index computation under TG5", () => {
  const result = computeFluencyIndexPreview("org-1", "2024-01-01");
  expect(result).toBeNull();
});

it("suppresses fluency index job under TG5", () => {
  const result = runFluencyIndexJob("org-1");
  expect(result).toBeNull();
});
