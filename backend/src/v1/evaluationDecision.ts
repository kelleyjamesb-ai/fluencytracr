export type EvaluationDecision = {
  schema_version: "FT_V1_2026_01";
  artifact_name: "FT_V1_EVALUATION_DECISION";
  org_id: string;
  function_id: string;
  role_class: string;
  window_id: string;
  decision: "SURFACE";
};

export type EvaluationDecisionInput = {
  schema_version: "FT_V1_2026_01";
  artifact_name: "FT_V1_EVALUATION_DECISION";
  org_id: string;
  function_id: string;
  role_class: string;
  window_id: string;
  ambiguity_flag: boolean;
  evidence_present: boolean;
};

export const enforceV1EvaluationDecision = (
  input: EvaluationDecisionInput
): EvaluationDecision | null => {
  if (input.ambiguity_flag) {
    return null;
  }

  if (!input.evidence_present) {
    return null;
  }

  return {
    schema_version: input.schema_version,
    artifact_name: input.artifact_name,
    org_id: input.org_id,
    function_id: input.function_id,
    role_class: input.role_class,
    window_id: input.window_id,
    decision: "SURFACE"
  };
};
