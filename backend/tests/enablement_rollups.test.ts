import { runEnablementRollupsForEvents } from "../src/enablement_rollups";

it("suppresses enablement rollups under TG5", () => {
  const result = runEnablementRollupsForEvents("org-1", [] as any);
  expect(result).toBeNull();
});
