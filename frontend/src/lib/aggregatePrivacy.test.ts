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
    for (const personReference of ["José Smith", "J. Smith", "Jane Q Smith"]) {
      expect(
        containsPotentialPersonName(
          `Customer Success will prepare QBRs faster for ${personReference}.`
        ),
        personReference
      ).toBe(true);
    }
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
      "account # ACCT-90210",
      "employee ID 123",
      "employee #42",
      "user ID 7",
      "employee no. 42",
      "account#42",
      "employee ID ABC",
      "account#ABC",
      "account\u200b#42",
      "employee no . 42"
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

  it("holds common direct identifiers", () => {
    for (const identifier of [
      "SSN 123-45-6789",
      "social security number 123-45-6789",
      "passport 123456789",
      "IP 192.168.1.1",
      "IP 2001:db8::1"
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
        "Customer Success will deploy software version 1.2.3.4 faster."
      )
    ).toBe(false);
  });
});
