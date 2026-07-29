import { canonicalIdentityAggregateSourceIsApproved } from "../src/services/aggregate-claim-authorization.service";

describe("Slice E canonical identity source compatibility", () => {
  it.each(["bigquery_export", "sigma_export"])(
    "accepts governed aggregate pipeline source %s independently of the outcome source",
    (sourceSystem) => {
      expect(canonicalIdentityAggregateSourceIsApproved(sourceSystem)).toBe(true);
    }
  );

  it.each(["customer_crm", "service_now", "", null, undefined])(
    "rejects non-pipeline aggregate source %p",
    (sourceSystem) => {
      expect(canonicalIdentityAggregateSourceIsApproved(sourceSystem)).toBe(false);
    }
  );
});
