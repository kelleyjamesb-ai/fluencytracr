import { describe, expect, it } from "vitest";

import {
  containsPotentialOrganizationIdentifier,
  containsPotentialPersonName
} from "./aggregatePrivacy";

describe("aggregate hypothesis privacy gate", () => {
  it("holds capitalized and lowercase person-name patterns", () => {
    expect(containsPotentialPersonName("Jane Smith in Customer Success will prepare QBRs faster.")).toBe(true);
    expect(containsPotentialPersonName("jane smith in Customer Success will prepare QBRs faster.")).toBe(true);
    expect(containsPotentialPersonName("Customer Success owner: jane smith will prepare QBRs faster.")).toBe(true);
  });

  it("allows known aggregate function labels", () => {
    expect(containsPotentialPersonName("Customer Success will prepare QBRs faster.")).toBe(false);
    expect(containsPotentialPersonName("Information Technology will resolve incidents faster.")).toBe(false);
    expect(
      containsPotentialPersonName(
        "Customer Success will prepare Quarterly Business Review faster."
      )
    ).toBe(false);
    for (const phrase of [
      "Service Level Agreement",
      "Account Health Score",
      "Incident Resolution Time"
    ]) {
      expect(
        containsPotentialPersonName(`Customer Success will improve ${phrase}.`),
        phrase
      ).toBe(false);
    }
  });

  it("holds labeled employee and account identifiers", () => {
    expect(
      containsPotentialOrganizationIdentifier(
        "Customer Success will prepare QBRs faster for employee E12345."
      )
    ).toBe(true);
    expect(
      containsPotentialOrganizationIdentifier(
        "Customer Success will prepare QBRs faster for account ID ACCT-90210."
      )
    ).toBe(true);
    for (const identifier of [
      "employee #: E12345",
      "employee identifier E12345",
      "account # ACCT-90210"
    ]) {
      expect(
        containsPotentialOrganizationIdentifier(
          `Customer Success will prepare QBRs faster for ${identifier}.`
        ),
        identifier
      ).toBe(true);
    }
    expect(
      containsPotentialOrganizationIdentifier(
        "Customer Success will prepare QBRs faster for enterprise accounts."
      )
    ).toBe(false);
  });
});
