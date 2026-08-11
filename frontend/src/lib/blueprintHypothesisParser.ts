import { matchHypothesisToGleanWorkflows } from "./gleanMetricsLibraryAdapter";

const MAX_BLUEPRINT_TEXT_LENGTH = 100_000;
const MAX_SEGMENT_LENGTH = 1_200;
const MIN_SEGMENT_LENGTH = 12;
const SUPPORTED_SECTION_HEADING =
  /^(?:(?:customer|value)[ \t]+hypothesis|future[ \t]+state|target[ \t]+outcome|function)[ \t]*:/i;
const BLUEPRINT_STATUS_HEADING = /^blueprint[ \t]+status[ \t]*:/i;
const BLUEPRINT_STATUS_TOKEN = /\bblueprint[ \t]+status[ \t]*:/gi;
const SUPPORTED_STORY_TOKEN =
  /\b(?:(?:customer|value)[ \t]+hypothesis|future[ \t]+state|target[ \t]+outcome|function)[ \t]*:/gi;
const COMPACT_STORY_TOKEN =
  /(?:customerhypothesis|valuehypothesis|futurestate|targetoutcome|function):/gi;
const APPROVED_BLUEPRINT_STATUS = /^blueprint[ \t]+status[ \t]*:[ \t]*(?:approved|current)[ \t]*$/i;
const COMPACT_BLUEPRINT_STATUS_TOKEN = /blueprintstatus:/gi;
const CONFLICTING_STATUS_METADATA_LABELS = new Set([
  "approval",
  "approvalstatus",
  "cancellation",
  "expiry",
  "lifecycle",
  "review",
  "reviewstatus",
  "revocation",
  "status",
  "withdrawal"
]);
const METADATA_VALUE_DELIMITER = /[:=]|\s+[\p{Pd}]\s+/gu;
const UNSAFE_SOURCE_PROVENANCE =
  /\b(?:archived|cancelled|declined|deprecated|do not use|draft|expired|for reference only|historical|illustrative example|lapsed|never approved|not approved|obsolete|pending|previous version|rejected|rescinded|revoked|superseded|template|unapproved|void|withdrawn)\b/i;
const NESTED_SECTION_LABEL =
  /^(?:(?:customer|value)[ \t]+hypothesis|future[ \t]+state|target[ \t]+outcome|function)[ \t]*:[ \t]*[^:\r\n]+:/im;
const UNAPPROVED_CONSTRUCTION = /\bnot(?:\s+\w+){0,3}\s+approved\b/i;
const UNAPPROVED_CONTRACTION =
  /\b(?:has|is|was)n['’]t(?:\s+\w+){0,2}\s+approved\b/i;
const NEGATIVE_EXPECTATION =
  /\b(?:in\s+no\s+way|never|unlikely|(?:(?:can|could|did|do|does|is|are|may|might|must|should|was|were|will|would)\s+not)|cannot|no longer|(?:can|could|did|does|is|may|might|must|should|was|were|will|would)n['’]t)\b/i;
const COMPACT_NEGATIVE_EXPECTATION =
  /(?:arenot|arent|cannot|couldnot|didnot|donot|doesnot|innoway|isnot|maynot|mightnot|mustnot|never|shouldnot|wasnot|werenot|willnot|wouldnot|wont|unlikely)/i;
const EXPLICIT_INVALIDATION =
  /\b(?:hypothesis|future\s+state|target\s+outcome)\s+(?:is|was)\s+(?:disputed|false|incorrect|invalid|unconfirmed|untrue)\b/i;
const COMPACT_UNSAFE_PROVENANCE =
  /(?:archived|cancelled|declined|deprecated|donotuse|draft|expired|forreferenceonly|hasnt(?:been)?approved|historical|illustrativeexample|isntapproved|lapsed|neverapproved|not(?:been|the)?approved(?:version)?|obsolete|olddraft|pending|previousversion|rejected|rescinded|revoked|superseded|template|unapproved|void|wasntapproved|withdrawn)/i;
const COMPACT_INVALIDATION =
  /(?:hypothesis|futurestate|targetoutcome)(?:is|was)(?:disputed|false|incorrect|invalid|unconfirmed|untrue)/i;

type MatchedBlueprintSegment = {
  hypothesis: string;
  score: number;
  workflowId: string;
};

type SegmentAnalysis = {
  ambiguous: boolean;
  match: MatchedBlueprintSegment | null;
};

const analyzeSegment = (value: string): SegmentAnalysis => {
  const result = matchHypothesisToGleanWorkflows(value);
  const strongest = result.candidates[0];
  if (!strongest) return { ambiguous: false, match: null };
  const tiedWorkflowIds = new Set(
    result.candidates
      .filter((candidate) => candidate.matchScore === strongest.matchScore)
      .map((candidate) => candidate.id)
  );
  if (tiedWorkflowIds.size > 1) return { ambiguous: true, match: null };
  return {
    ambiguous: false,
    match: {
      hypothesis: `${result.elements.function}: ${result.elements.expectedChange} ${result.elements.businessObject}; metric intent: ${result.elements.metricIntent}.`,
      score: strongest.matchScore,
      workflowId: strongest.id
    }
  };
};

const documentLines = (rawText: string) =>
  rawText
    .replace(/\0/g, " ")
    .split(/[\r\n\u2028\u2029]+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const documentSections = (rawText: string) =>
  documentLines(rawText).filter((part) => part.length >= MIN_SEGMENT_LENGTH);

const candidateSegments = (sections: string[]) =>
  sections.filter((section) => SUPPORTED_SECTION_HEADING.test(section));

const occurrenceCount = (value: string, pattern: RegExp) =>
  Array.from(value.matchAll(pattern)).length;

const containsConflictingStatusMetadata = (documents: string[]) =>
  documents.flatMap(documentLines).some((section) => {
    for (const delimiter of section.matchAll(METADATA_VALUE_DELIMITER)) {
      const labelTokens = section
        .slice(0, delimiter.index)
        .replace(/[^\p{L}\p{N}\s]+/gu, "")
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (labelTokens.join("") === "blueprintstatus") continue;
      if ([1, 2, 3].some((tokenCount) =>
        CONFLICTING_STATUS_METADATA_LABELS.has(
          labelTokens.slice(-tokenCount).join("")
        )
      )) {
        return true;
      }
    }
    return false;
  });

const containsContradictorySupportedExpectation = (sections: string[]) =>
  sections.some((section) => {
    const compactSection = section.replace(/[^\p{L}\p{N}]+/gu, "");
    if (
      COMPACT_NEGATIVE_EXPECTATION.test(compactSection) &&
      analyzeSegment(section).match
    ) {
      return true;
    }
    if (!NEGATIVE_EXPECTATION.test(section)) return false;
    const affirmativeForm = section
      .replace(/\b(?:can|could|did|do|does|is|are|may|might|must|should|was|were|will|would)\s+not\b/gi, "will")
      .replace(/\b(?:are|can|could|did|does|is|may|might|must|should|was|were|will|would)n['’]t\b/gi, "will")
      .replace(/\b(?:cannot|unlikely)\b/gi, "can")
      .replace(/\bno longer\b/gi, "will");
    return Boolean(analyzeSegment(affirmativeForm).match);
  });

export const deriveAggregateHypothesisFromBlueprint = (rawText: string) => {
  const canonicalText = rawText
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFKC")
    .replace(/\u0131/g, "i")
    .replace(/[\u02bc\u2018\u2019\u201b\u2032\uff07]/g, "'");
  const dehyphenatedProvenance = canonicalText.replace(
    /[\p{Pd}\p{S}\p{Cf}\u00ad/][ \t]*[\r\n\u2028\u2029]+[ \t]*/gu,
    ""
  );
  const provenanceVariants = [canonicalText, dehyphenatedProvenance].flatMap((value) => [
    value
      .replace(/[\p{P}\p{S}\p{M}\p{Cf}\0\u00ad]+/gu, " ")
      .replace(/[\s\u2028\u2029]+/g, " "),
    value
      .replace(/[\p{P}\p{S}\p{M}\p{Cf}\0\u00ad]+/gu, "")
      .replace(/[\s\u2028\u2029]+/g, " ")
  ]);
  const metadataVariants = [canonicalText, dehyphenatedProvenance].flatMap((value) => [
    value
      .replace(/[^\p{L}\p{N}\s:]+/gu, " ")
      .replace(/[\s\u2028\u2029]+/g, " "),
    value
      .replace(/[^\p{L}\p{N}\s:]+/gu, "")
      .replace(/[\s\u2028\u2029]+/g, " ")
  ]);
  const compactMetadataVariants = [canonicalText, dehyphenatedProvenance].map((value) =>
    value.replace(/[^\p{L}\p{N}:]+/gu, "")
  );
  const compactProvenanceVariants = [canonicalText, dehyphenatedProvenance].map((value) =>
    value.replace(/[^\p{L}\p{N}]+/gu, "")
  );
  if (
    !canonicalText.trim() ||
    canonicalText.length > MAX_BLUEPRINT_TEXT_LENGTH ||
    provenanceVariants.some(
      (value) =>
        UNSAFE_SOURCE_PROVENANCE.test(value) ||
        UNAPPROVED_CONSTRUCTION.test(value) ||
        UNAPPROVED_CONTRACTION.test(value)
    ) ||
    compactProvenanceVariants.some((value) => COMPACT_UNSAFE_PROVENANCE.test(value)) ||
    NESTED_SECTION_LABEL.test(canonicalText) ||
    provenanceVariants.some((value) => EXPLICIT_INVALIDATION.test(value)) ||
    compactProvenanceVariants.some((value) => COMPACT_INVALIDATION.test(value))
  ) {
    return "";
  }

  const sections = documentSections(canonicalText);
  const statusSections = sections.filter((section) => BLUEPRINT_STATUS_HEADING.test(section));
  if (
    occurrenceCount(canonicalText, BLUEPRINT_STATUS_TOKEN) !== 1 ||
    metadataVariants.some((value) => occurrenceCount(value, BLUEPRINT_STATUS_TOKEN) !== 1) ||
    compactMetadataVariants.some(
      (value) => occurrenceCount(value, COMPACT_BLUEPRINT_STATUS_TOKEN) !== 1
    ) ||
    occurrenceCount(canonicalText, SUPPORTED_STORY_TOKEN) !== 1 ||
    metadataVariants.some((value) => occurrenceCount(value, SUPPORTED_STORY_TOKEN) !== 1) ||
    compactMetadataVariants.some((value) => occurrenceCount(value, COMPACT_STORY_TOKEN) !== 1) ||
    statusSections.length !== 1 ||
    containsConflictingStatusMetadata([canonicalText, dehyphenatedProvenance]) ||
    !APPROVED_BLUEPRINT_STATUS.test(statusSections[0]) ||
    sections.some((section) => section.length > MAX_SEGMENT_LENGTH) ||
    containsContradictorySupportedExpectation(sections)
  ) {
    return "";
  }

  const segments = candidateSegments(sections);
  if (segments.length !== 1) return "";
  const analyses = segments.map(analyzeSegment);
  if (analyses.some((analysis) => analysis.ambiguous || !analysis.match)) return "";
  const matches = analyses
    .map((analysis) => analysis.match)
    .filter((candidate): candidate is MatchedBlueprintSegment => Boolean(candidate));
  const workflowIds = new Set(matches.map((candidate) => candidate.workflowId));
  const hypotheses = new Set(matches.map((candidate) => candidate.hypothesis));
  if (workflowIds.size !== 1 || hypotheses.size !== 1) return "";

  return matches[0]?.hypothesis ?? "";
};
