import { z } from "zod";

export const AivmValueTypeSchema = z.enum([
  "ACCELERATION",
  "QUALITY_PREMIUM",
  "NET_NEW",
  "UNCLASSIFIED"
]);
export type AivmValueType = z.infer<typeof AivmValueTypeSchema>;

export const AivmEvidenceGradeSchema = z.enum([
  "OBJECTIVE",
  "CALIBRATED",
  "QUALITATIVE"
]);
export type AivmEvidenceGrade = z.infer<typeof AivmEvidenceGradeSchema>;

export type AivmCanonicalEvidenceEvent = {
  readonly event_name?: string;
  readonly latency_ms?: number | null;
  readonly latency_bucket?: string | null;
  readonly abandonment_present?: boolean | null;
  readonly verification_present?: boolean | null;
  readonly recovery_present?: boolean | null;
};

export type AivmVerdictInput = {
  readonly canonical_events?: ReadonlyArray<AivmCanonicalEvidenceEvent>;
  readonly cohort_size?: number | null;
  readonly window_length_days?: number | null;
  /**
   * V1 only honors explicit upstream tagging for NET_NEW; other value types
   * remain derived from canonical evidence to avoid hidden override behavior.
   */
  readonly explicit_value_type?: "NET_NEW" | null;
};

export type AivmVerdictFields = {
  readonly value_type: AivmValueType;
  readonly evidence_grade: AivmEvidenceGrade;
};

const eventName = (event: AivmCanonicalEvidenceEvent): string => String(event.event_name ?? "");

const deriveEvidenceGrade = (input: AivmVerdictInput): AivmEvidenceGrade => {
  const cohortSize = input.cohort_size ?? 0;
  const windowDays = input.window_length_days ?? 0;
  return cohortSize >= 30 && windowDays >= 90 ? "OBJECTIVE" : "QUALITATIVE";
};

const deriveValueType = (input: AivmVerdictInput): AivmValueType => {
  if (input.explicit_value_type === "NET_NEW") {
    return "NET_NEW";
  }

  const events = input.canonical_events ?? [];
  let latencyObserved = 0;
  let lowAbandonmentObserved = 0;
  let abandonmentObserved = 0;
  let verificationObserved = 0;
  let recoveryObserved = 0;

  for (const event of events) {
    switch (eventName(event)) {
      case "FT_V1_LATENCY_OBSERVED":
        latencyObserved += 1;
        break;
      case "FT_V1_ABANDONMENT_OBSERVED":
        if (event.abandonment_present === false) {
          lowAbandonmentObserved += 1;
        } else if (event.abandonment_present === true) {
          abandonmentObserved += 1;
        }
        break;
      case "FT_V1_VERIFICATION_PRESENCE_OBSERVED":
        if (event.verification_present === true) {
          verificationObserved += 1;
        }
        break;
      case "FT_V1_RECOVERY_OBSERVED":
        if (event.recovery_present === true) {
          recoveryObserved += 1;
        }
        break;
      default:
        break;
    }
  }

  const accelerationScore = latencyObserved + lowAbandonmentObserved;
  const qualityScore = verificationObserved + recoveryObserved;
  const lowAbandonmentDominates =
    lowAbandonmentObserved > 0 && lowAbandonmentObserved > abandonmentObserved;
  const qualityEvidenceComplete = verificationObserved > 0 && recoveryObserved > 0;

  if (latencyObserved > 0 && lowAbandonmentDominates && accelerationScore > qualityScore) {
    return "ACCELERATION";
  }

  if (qualityEvidenceComplete && qualityScore > accelerationScore) {
    return "QUALITY_PREMIUM";
  }

  return "UNCLASSIFIED";
};

export const deriveAivmVerdictFields = (input: AivmVerdictInput = {}): AivmVerdictFields => ({
  value_type: deriveValueType(input),
  evidence_grade: deriveEvidenceGrade(input)
});
