const AGGREGATE_TERMS = [
  "information technology",
  "customer success",
  "service desk",
  "it support",
  "employee support",
  "account team",
  "customer outcomes",
  "quarterly business review",
  "quarterly business reviews",
  "service level agreement",
  "service level agreements",
  "account health score",
  "account health scores",
  "incident resolution time"
] as const;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const aggregateTermPattern = new RegExp(
  `\\b(?:${AGGREGATE_TERMS.map(escapeRegExp).join("|")})\\b`,
  "gi"
);
const capitalizedWord = "[A-Z][a-z]{1,30}(?:[-'][A-Z]?[a-z]{1,30})?";
const capitalizedNameToken = `(?:${capitalizedWord}|[A-Z]\\.?)`;
const capitalizedNamePattern = new RegExp(
  `\\b${capitalizedNameToken}\\s+(?:${capitalizedNameToken}\\s+)?${capitalizedWord}\\b`
);
const lowercaseNameContextPattern =
  /\b(?:by|for|from|owner|manager|lead|contact|prepared)\s*[:\-]?\s+[a-z]{2,}\s+[a-z]{2,}\b/i;
const lowercaseNameBeforeActionPattern =
  /(?:^|[.!?;,:]\s*)[a-z]{2,}\s+[a-z]{2,}\s+(?:in|from|at|will|has|is)\b/i;
const organizationIdentifierPattern =
  /\b(?:employee|worker|staff|user|account)(?:\s+(?:id|identifier|number|no\s*\.?)\s*[:#-]?\s*[a-z0-9][a-z0-9_-]*|[ \t]*#[ \t]*:?[ \t]*[a-z0-9][a-z0-9_-]*|\s+(?=[a-z0-9_-]*\d)[a-z0-9][a-z0-9_-]{3,})\b/i;
const directIdentifierPattern =
  /\b(?:(?:ssn|social\s+security\s+(?:number|no\.?))\s*[:#-]?\s*\d{3}[- ]?\d{2}[- ]?\d{4}|passport(?:\s+(?:id|number|no\.?))?\s*[:#-]?\s*[a-z0-9-]*\d[a-z0-9-]*)\b/i;
const labeledIpAddressPattern =
  /\bip(?:\s+address)?\s*[:#-]?\s*(?:(?:\d{1,3}\.){3}\d{1,3}|(?=[0-9a-f:]*:)[0-9a-f:]{2,})\b/i;
const dottedQuadPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const dottedVersionPrefixPattern = /(?:software\s+)?(?:version|release|build)\s*$/i;

const containsUnlabeledDottedQuad = (value: string) => {
  dottedQuadPattern.lastIndex = 0;
  for (const match of value.matchAll(dottedQuadPattern)) {
    const prefix = value.slice(Math.max(0, match.index - 32), match.index);
    if (!dottedVersionPrefixPattern.test(prefix)) {
      return true;
    }
  }
  return false;
};

/**
 * Conservative intake gate for person-level details in aggregate hypotheses.
 * Known aggregate function labels are masked first so ordinary function names
 * such as "Customer Success" do not look like personal names. Ambiguous input
 * is held for manual rewriting instead of being canonicalized downstream.
 */
export const containsPotentialPersonName = (value: string) => {
  const maskedAggregateTerms = value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFKC")
    .replace(aggregateTermPattern, " ");
  return (
    capitalizedNamePattern.test(maskedAggregateTerms) ||
    lowercaseNameContextPattern.test(maskedAggregateTerms) ||
    lowercaseNameBeforeActionPattern.test(maskedAggregateTerms)
  );
};

/** Hold organization-scoped identifiers that can still identify a person. */
export const containsPotentialOrganizationIdentifier = (value: string) => {
  const normalized = value.normalize("NFKC").replace(/\p{Cf}+/gu, "");
  return (
    organizationIdentifierPattern.test(normalized) ||
    directIdentifierPattern.test(normalized) ||
    labeledIpAddressPattern.test(normalized) ||
    containsUnlabeledDottedQuad(normalized)
  );
};
