const AGGREGATE_TERMS = [
  "information technology",
  "customer success",
  "service desk",
  "it support",
  "employee support",
  "account team",
  "customer outcomes"
] as const;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const aggregateTermPattern = new RegExp(
  `\\b(?:${AGGREGATE_TERMS.map(escapeRegExp).join("|")})\\b`,
  "gi"
);
const capitalizedWord = "[A-Z][a-z]{1,30}(?:[-'][A-Z][a-z]{1,30})?";
const capitalizedNamePattern = new RegExp(
  `\\b${capitalizedWord}\\s+${capitalizedWord}\\b`
);
const lowercaseNameContextPattern =
  /\b(?:by|for|from|owner|manager|lead|contact|prepared)\s*[:\-]?\s+[a-z]{2,}\s+[a-z]{2,}\b/i;
const lowercaseNameBeforeActionPattern =
  /(?:^|[.!?;,:]\s*)[a-z]{2,}\s+[a-z]{2,}\s+(?:in|from|at|will|has|is)\b/i;

/**
 * Conservative intake gate for person-level details in aggregate hypotheses.
 * Known aggregate function labels are masked first so ordinary function names
 * such as "Customer Success" do not look like personal names. Ambiguous input
 * is held for manual rewriting instead of being canonicalized downstream.
 */
export const containsPotentialPersonName = (value: string) => {
  const maskedAggregateTerms = value.normalize("NFKC").replace(aggregateTermPattern, " ");
  return (
    capitalizedNamePattern.test(maskedAggregateTerms) ||
    lowercaseNameContextPattern.test(maskedAggregateTerms) ||
    lowercaseNameBeforeActionPattern.test(maskedAggregateTerms)
  );
};
