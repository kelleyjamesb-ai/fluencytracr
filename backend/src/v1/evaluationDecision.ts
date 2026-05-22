import {
  deriveAivmVerdictFields,
  type AivmCanonicalEvidenceEvent,
  type AivmEvidenceGrade,
  type AivmValueType
} from "@learnaire/shared";

export type EvaluationDecision = {
  schema_version: "FT_V1_2026_01";
  artifact_name: "FT_V1_EVALUATION_DECISION";
  org_id: string;
  function_id: string;
  role_class: string;
  window_id: string;
  decision: "SURFACE" | "SUPPRESS";
  value_type: AivmValueType;
  evidence_grade: AivmEvidenceGrade;
  renderable: boolean;
  suppress_reason_code?: SuppressReasonCode;
};

export type SuppressReasonCode =
  | "SUPP_INTERNAL_INVARIANT_FAIL"
  | "SUPP_AMBIGUITY_PRESENT"
  | "SUPP_SMALL_TEAM_LT_5"
  | "SUPP_WINDOW_LT_60D"
  | "SUPP_NOT_ADJACENT_WINDOWS"
  | "SUPP_LT_2_BEHAVIOR_CLASSES"
  | "SUPP_NO_QUALIFYING_EVIDENCE"
  | "SUPP_SPARSE_DATA";

export type EvaluationDecisionInput = {
  schema_version: "FT_V1_2026_01";
  artifact_name: "FT_V1_EVALUATION_DECISION";
  org_id: string;
  function_id: string;
  role_class: string;
  window_id: string;
  window_length_days: number;
  ambiguity_flag: boolean;
  behavioral_classes_present: number;
  positive_evidence_present: boolean;
  ghost_use_candidate: boolean;
  cohort_size?: number | null;
  canonical_events?: ReadonlyArray<AivmCanonicalEvidenceEvent>;
  explicit_value_type?: "NET_NEW" | null;
  candidate_decision?: "SURFACE" | "SUPPRESS";
  suppress_reason_code?: SuppressReasonCode;
};

const DEFAULT_SUPPRESS_REASON: SuppressReasonCode = "SUPP_NO_QUALIFYING_EVIDENCE";

export const enforceV1EvaluationDecision = (
  input: EvaluationDecisionInput
): EvaluationDecision => {
  let decision: EvaluationDecision["decision"] = input.candidate_decision ?? "SUPPRESS";
  let suppress_reason_code: SuppressReasonCode | undefined;

  if (input.ambiguity_flag) {
    decision = "SUPPRESS";
    suppress_reason_code = "SUPP_AMBIGUITY_PRESENT";
  } else if (input.window_length_days < 60) {
    decision = "SUPPRESS";
    suppress_reason_code = "SUPP_WINDOW_LT_60D";
  } else if (input.behavioral_classes_present < 2) {
    decision = "SUPPRESS";
    suppress_reason_code = "SUPP_LT_2_BEHAVIOR_CLASSES";
  } else if (decision === "SUPPRESS") {
    suppress_reason_code = input.suppress_reason_code ?? DEFAULT_SUPPRESS_REASON;
  }

  if (decision === "SUPPRESS" && !suppress_reason_code) {
    suppress_reason_code = "SUPP_INTERNAL_INVARIANT_FAIL";
  }

  const renderable = input.window_length_days >= 60 && decision === "SURFACE";
  const aivm = deriveAivmVerdictFields({
    canonical_events: input.canonical_events,
    cohort_size: input.cohort_size,
    window_length_days: input.window_length_days,
    explicit_value_type: input.explicit_value_type
  });

  return {
    schema_version: input.schema_version,
    artifact_name: input.artifact_name,
    org_id: input.org_id,
    function_id: input.function_id,
    role_class: input.role_class,
    window_id: input.window_id,
    decision,
    value_type: aivm.value_type,
    evidence_grade: aivm.evidence_grade,
    renderable,
    ...(decision === "SUPPRESS" ? { suppress_reason_code } : {})
  };
};
