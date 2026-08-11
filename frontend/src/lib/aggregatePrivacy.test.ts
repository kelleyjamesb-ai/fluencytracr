import { describe, expect, it } from "vitest";

import { containsPotentialPersonName } from "./aggregatePrivacy";

describe("aggregate hypothesis privacy gate", () => {
  it("holds capitalized and lowercase person-name patterns", () => {
    expect(containsPotentialPersonName("Jane Smith in Customer Success will prepare QBRs faster.")).toBe(true);
    expect(containsPotentialPersonName("jane smith in Customer Success will prepare QBRs faster.")).toBe(true);
    expect(containsPotentialPersonName("Customer Success owner: jane smith will prepare QBRs faster.")).toBe(true);
  });

  it("allows known aggregate function labels", () => {
    expect(containsPotentialPersonName("Customer Success will prepare QBRs faster.")).toBe(false);
    expect(containsPotentialPersonName("Information Technology will resolve incidents faster.")).toBe(false);
  });
});
