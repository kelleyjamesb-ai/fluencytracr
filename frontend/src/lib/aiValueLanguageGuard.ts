const unsafeValuePhrasePattern =
  /\b(roi|return\s+on\s+investment|ebita|ebitda|realized[-\s]?value|realized\s+roi|customer[-\s]?facing\s+economic|financial|economic|causal|causality|caused|attribution|productivity|confidence|probability|proof|customer-validated\s+realized|savings?|cost\s+(?:reduction|avoidance|savings?)|revenue|headcount|efficiency|lift|margin|dollar(?:ized)?|profit)\b/i;

const blockingCaveatPattern =
  /\b(blocked|held|remain(?:s)? held|remain(?:s)? blocked)\b|\bnot\s+(?:proof|evidence|a claim|realized\s+roi|roi)\b|\b(?:does not|can't|cannot)\s+(?:create|prove|establish|authorize|allow|support|validate)\b|\bdo not\s+(?:present|use|treat|claim|share|export)\b|\bwithout\s+(?:approved|accepted|reviewed|promoted|governed)\b/i;

const unlockCaveatPattern =
  /\bnot\s+(?:blocked|held|suppressed)\b|\b(?:unblocked|unlocked)\b|\b(?:ready|allowed|authorized)\b.*\b(?:roi|return\s+on\s+investment|financial|economic|causal|causality|attribution|productivity|confidence|probability|proof)\b|\b(?:roi|return\s+on\s+investment|financial|economic|causal|causality|attribution|productivity|confidence|probability|proof)\b.*\b(?:ready|allowed|authorized)\b/i;

export const blockedValueLanguageCopy =
  "Stronger value language remains blocked until a promoted contract authorizes it.";

export const displaySafeValuePhrase = (
  phrase: string,
  options: { preserveBlockingCaveat?: boolean } = {}
): string => {
  if (!unsafeValuePhrasePattern.test(phrase)) return phrase;
  if (
    options.preserveBlockingCaveat &&
    blockingCaveatPattern.test(phrase) &&
    !unlockCaveatPattern.test(phrase)
  ) {
    return phrase;
  }
  return blockedValueLanguageCopy;
};
