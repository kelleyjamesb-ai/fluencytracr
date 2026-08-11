import { describe, expect, it } from "vitest";

import { deriveAggregateHypothesisFromBlueprint } from "./blueprintHypothesisParser";

const approvedBlueprint = (content: string) => `Blueprint status: Approved\n${content}`;

describe("deriveAggregateHypothesisFromBlueprint", () => {
  it("reduces approved structured Blueprint sections to a canonical aggregate hypothesis", () => {
    const result = deriveAggregateHypothesisFromBlueprint(approvedBlueprint(`
      Function: Customer Success will assemble account context faster for QBR preparation and reduce QBR preparation time.
    `));

    expect(result).toContain("Customer Success:");
    expect(result).toContain("metric intent: qbr preparation time");
  });

  it("allows status words inside an approved aggregate hypothesis", () => {
    const result = deriveAggregateHypothesisFromBlueprint(approvedBlueprint(`
      Customer hypothesis: Customer Success will prepare quarterly business reviews faster and reduce QBR preparation time.
    `));

    expect(result).toContain("Customer Success:");
    expect(result).toContain("metric intent: qbr preparation time");
  });

  it("allows draft as an ordinary workflow verb in approved hypothesis prose", () => {
    const result = deriveAggregateHypothesisFromBlueprint(approvedBlueprint(`
      Customer hypothesis: Customer Success will draft quarterly business reviews faster and reduce QBR preparation time.
    `));

    expect(result).toContain("Customer Success:");
    expect(result).toContain("metric intent: qbr preparation time");
  });

  it("rejects draft provenance appended to supported hypothesis prose", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(approvedBlueprint(`
        Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time. Draft version.
      `))
    ).toBe("");
  });

  it("rejects draft provenance anywhere in source metadata values", () => {
    for (const metadata of [
      "Version: First Draft",
      "Document state: working draft",
      "Working Draft",
      "First Draft",
      "Version First Draft",
      "Working Draft v1",
      "First Draft v2",
      "Working-Draft",
      "Draft v1"
    ]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(approvedBlueprint(`
          ${metadata}
          Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time.
        `)),
        metadata
      ).toBe("");
    }
  });

  it("rejects status metadata appended to the hypothesis line", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(approvedBlueprint(`
        Customer hypothesis: Customer Success will prepare quarterly business reviews faster and reduce QBR preparation time. Review status: OK
      `))
    ).toBe("");
  });

  it("does not carry names, email addresses, or unrelated document text into the result", () => {
    const result = deriveAggregateHypothesisFromBlueprint(approvedBlueprint(`
      Prepared by Jane Smith, jane.smith@example.com.
      Confidential sales notes should not travel downstream.
      Customer hypothesis: Customer Success will assemble account context faster for QBR preparation and reduce QBR preparation time.
    `));

    expect(result).toContain("Customer Success:");
    expect(result).not.toMatch(/Jane Smith|jane\.smith@example\.com|Confidential sales notes/i);
  });

  it("requires exactly one approved or current Blueprint status", () => {
    const hypothesis = "Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time.";
    expect(deriveAggregateHypothesisFromBlueprint(hypothesis)).toBe("");
    expect(deriveAggregateHypothesisFromBlueprint(`Blueprint status: Pending\n${hypothesis}`)).toBe("");
    expect(deriveAggregateHypothesisFromBlueprint(`Blueprint status: Approved\nBlueprint status: Current\n${hypothesis}`)).toBe("");
    expect(deriveAggregateHypothesisFromBlueprint(`Blueprint status: Approved\nBlueprint sta—tus: Approved\n${hypothesis}`)).toBe("");
    expect(deriveAggregateHypothesisFromBlueprint(`Blueprint status: Approved\nBlueprint.sta,tus: Current\n${hypothesis}`)).toBe("");
    expect(deriveAggregateHypothesisFromBlueprint(`Blueprint status: Approved\nBlueprint sta\u0301tus: Current\n${hypothesis}`)).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        `Blueprint status: Approved\n${hypothesis} Blueprint status: Current`
      )
    ).toBe("");
    expect(deriveAggregateHypothesisFromBlueprint(`Blueprint status: Current\n${hypothesis}`)).toContain("Customer Success:");
    for (const revokedContext of [
      "Approval revoked by customer.",
      "Approval rev\noked by customer.",
      "Approval withdrawn.",
      "Approval rescinded.",
      "This Blueprint has not been approved.",
      "This Blueprint was never approved.",
      "This Blueprint wasn't approved.",
      "This Blueprint isn't approved.",
      "This Blueprint hasn't been approved.",
      "This is not the approved version."
    ]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          `Blueprint status: Approved\n${revokedContext}\n${hypothesis}`
        )
      ).toBe("");
    }
    for (const conflictingContext of [
      "Document type: Template",
      "Review status: Declined",
      "Review status: Unapproved",
      "Approval status: Pending",
      "Lifecycle: Draft",
      "Lifecycle: Expired",
      "Review status: Cancelled",
      "Revocation: recorded",
      "Expiry: 2027-01-01",
      "Cancellation: requested",
      "Withdrawal: requested",
      "Status: OK",
      "Review: OK",
      "Review sta\0tus: OK",
      "Review sta\u00adtus: OK",
      "Review sta\u200btus: OK",
      "Review sta\u0301tus: OK",
      "Review sta-\ntus: OK",
      "Appro\0val: recorded",
      "Life\u00adcycle: active",
      "Revoca-\ntion: recorded",
      "Review sta.tus: OK",
      "Appro,val: recorded",
      "Life(cycle): active",
      "Revoca—tion: recorded",
      "Review.sta,tus: OK",
      "Ｄｏｃｕｍｅｎｔ ｔｙｐｅ: Ｔｅｍｐｌａｔｅ",
      "Ｌｉｆｅｃｙｃｌｅ: Ｄｒａｆｔ",
      "Review status = Inactive",
      "Review status — Not current",
      "Approval status = Invalid",
      "Lifecycle — Inactive"
    ]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          `Blueprint status: Approved\n${conflictingContext}\n${hypothesis}`
        ),
        conflictingContext
      ).toBe("");
    }
  });

  it("fails closed when the document has no supported aggregate hypothesis section", () => {
    expect(deriveAggregateHypothesisFromBlueprint(approvedBlueprint("Use AI everywhere to transform the company."))).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer Success will prepare QBRs faster and reduce QBR preparation time.")
      )
    ).toBe("");
  });

  it("fails closed on contradictory, rejected, or historical source language", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success should not reduce QBR preparation time.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success does not reduce QBR preparation time.")
      )
    ).toBe("");
    for (const directNegative of ["will never", "must not", "must n.o.t"]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`Customer hypothesis: Customer Success ${directNegative} reduce QBR preparation time.`)
        )
      ).toBe("");
    }
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will in no way reduce QBR preparation time.")
      )
    ).toBe("");
    for (const fragmentedNegative of ["n.o.t", "no-t", "no/t", "n o t"]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`Customer hypothesis: Customer Success does ${fragmentedNegative} reduce QBR preparation time.`)
        )
      ).toBe("");
    }
    for (const areNegative of ["are n.o.t", "ar.e.n.t"]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`Customer hypothesis: Customer Success teams ${areNegative} reducing QBR preparation time.`)
        )
      ).toBe("");
    }
    for (const apostrophe of ["ʼ", "‘", "’"]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`Customer hypothesis: Customer Success won${apostrophe}t reduce QBR preparation time.`)
        )
      ).toBe("");
    }
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint(
          "Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time.\nPrevi—\nous version"
        )
      )
    ).toBe("");
    for (const marker of [
      "Rejected old draft",
      "Archived Blueprint",
      "Historical Blueprint",
      "Previous version",
      "Previous\nversion",
      "Previous\0version",
      "Previous\u00adversion",
      "Previ-\nous version",
      "Previ—\nous version",
      "Not\napproved",
      "Not\0approved",
      "Dra\0ft",
      "Dra\u00adft",
      "Dra\u200bft",
      "Dra\u0301ft",
      "Dra\nft",
      "D. r. a. f. t",
      "N.o.t.a.p.p.r.o.v.e.d",
      "Tem\nplate",
      "For\nreference\nonly",
      "Previous-version",
      "Not-approved",
      "Do-not-use",
      "For/reference/only",
      "D.r.a.f.t",
      "Not.approved",
      "Previous.version",
      "Do—not—use",
      "Ｎｏｔ ａｐｐｒｏｖｅｄ",
      "Ｐｒｅｖｉｏｕｓ ｖｅｒｓｉｏｎ",
      "Obsolete proposal"
    ]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`${marker}. Value hypothesis: Information Technology will resolve incidents faster and reduce mean time to resolution.`)
        )
      ).toBe("");
    }
  });

  it("fails closed instead of collapsing multiple supported workflows", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Value hypothesis: Information Technology will resolve incidents faster and reduce mean time to resolution. Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time.\nCustomer hypothesıs: Information Technology will resolve incidents faster and reduce mean time to resolution.")
      )
    ).toBe("");
  });

  it("requires exact supported headings and rejects aliases or qualified suffixes", () => {
    for (const heading of ["Customer hypothesis examples", "Future state assumptions", "Hypothesis", "Business function"]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`${heading}: Customer Success will prepare QBRs faster and reduce QBR preparation time.`)
        )
      ).toBe("");
    }
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint(
          "Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time. Extra label: stale"
        )
      )
    ).toBe("");
    for (const nestedLabel of [
      "Business function",
      "Template",
      "Internal note",
      "Internal-note",
      "Internal.note",
      "内部注記",
      "Owner 2",
      "A"
    ]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`Customer hypothesis: ${nestedLabel}: Customer Success will prepare QBRs faster and reduce QBR preparation time.`)
        )
      ).toBe("");
    }
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint(
          "Customer hypothesis:\nInternal note: Customer Success will prepare QBRs faster and reduce QBR preparation time."
        )
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint(
          "Customer hypothesis:\nCustomer Success will prepare QBRs faster and reduce QBR preparation time."
        )
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint(
          "Prepared by account team. Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time."
        )
      )
    ).toBe("");
  });

  it("holds equal workflow ties and conflicting explicit function headings", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will improve QBR risk identification.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Function: Customer Success\nInformation Technology will resolve incidents faster and reduce mean time to resolution.")
      )
    ).toBe("");
  });

  it("holds whenever more than one supported story section is present", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time. Target outcome: Customer Success will complete account research faster and reduce account research time.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will prepare QBRs faster for renewals and reduce QBR preparation time. Target outcome: Customer Success will prepare QBRs faster for escalations and reduce QBR preparation time.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will prepare QBRs faster for renewals and reduce QBR preparation time; Target outcome: Customer Success will prepare QBRs faster for escalations and reduce QBR preparation time.")
      )
    ).toBe("");
    for (const secondHeading of ["Target.outcome", "Target outco\u0301me", "Target out\u200bcome", "Target—\noutcome"]) {
      expect(
        deriveAggregateHypothesisFromBlueprint(
          approvedBlueprint(`Customer hypothesis: Customer Success will prepare QBRs faster and reduce QBR preparation time.\n${secondHeading}: Customer Success will prepare QBRs faster.`)
        )
      ).toBe("");
    }
  });

  it("rejects qualified or explicit invalidation of a structured hypothesis", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success is unlikely to reduce QBR preparation time.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will reduce QBR preparation time. However, this hypothesis is false.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will reduce QBR preparation time. This hypothesis is ｆａｌｓｅ.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will reduce QBR preparation time. This hypothesis is fal\nse.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer hypothesis: Customer Success will reduce QBR preparation time. This hypothesis is untrue.")
      )
    ).toBe("");
  });

  it("does not fuse unrelated adjacent sections or silently truncate long documents", () => {
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint("Customer Success owns account planning.\nGlossary entry: QBR preparation time is measured in hours.")
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint(`${"Background material. ".repeat(6_000)} Customer hypothesis: Customer Success will prepare QBRs faster.`)
      )
    ).toBe("");
    expect(
      deriveAggregateHypothesisFromBlueprint(
        approvedBlueprint(`Value hypothesis: Information Technology will resolve incidents faster and reduce mean time to resolution.\n${"Background ".repeat(160)} Customer Success will prepare QBRs faster.`)
      )
    ).toBe("");
  });
});
