import type { AiValueObjectSummary } from "./aiValueApi";

export interface AiValueWorkspaceChainSelectionInput {
  blueprints: AiValueObjectSummary[];
  libraries: AiValueObjectSummary[];
  engagements: AiValueObjectSummary[];
  baselines: AiValueObjectSummary[];
  evidenceCases?: AiValueObjectSummary[];
  preferredBlueprintId: string | null;
  preferredEngagementId: string | null;
}

export interface AiValueWorkspaceChainSelection {
  workflowFamily: string | null;
  blueprint: AiValueObjectSummary;
  metricsLibrary: AiValueObjectSummary;
  engagement: AiValueObjectSummary | null;
  fluencyBaseline: AiValueObjectSummary | null;
}

export interface AiValueJourneyObjectSelection {
  workflowFamily: string | null;
  engagement: AiValueObjectSummary | null;
  blueprint: AiValueObjectSummary | null;
  metricsLibrary: AiValueObjectSummary | null;
  readiness: AiValueObjectSummary | null;
  scenario: AiValueObjectSummary | null;
  roiScenario: AiValueObjectSummary | null;
}

const validObjects = (objects: AiValueObjectSummary[] = []) =>
  objects.filter((object) => object.valid !== false);

const matchingWorkflow = (
  objects: AiValueObjectSummary[] = [],
  workflowFamily: string | null | undefined
) =>
  workflowFamily
    ? validObjects(objects).filter((object) => object.workflow_family === workflowFamily)
    : [];

const firstForWorkflow = (
  objects: AiValueObjectSummary[] = [],
  workflowFamily: string | null | undefined
) => matchingWorkflow(objects, workflowFamily)[0] ?? null;

export const selectBestBaselineForWorkflow = (
  baselines: AiValueObjectSummary[] = [],
  workflowFamily: string | null | undefined
) =>
  validObjects(baselines)
    .filter((baseline) => Boolean(workflowFamily) && baseline.workflow_family === workflowFamily)
    .sort((a, b) => a.object_id.localeCompare(b.object_id))[0] ?? null;

const preferredEngagement = (
  engagements: AiValueObjectSummary[] = [],
  preferredEngagementId: string | null
) => {
  const valid = validObjects(engagements);
  return (
    valid.find((object) => object.object_id === preferredEngagementId) ??
    valid.find((object) => /northstar|enterprise/i.test(object.object_id)) ??
    valid[0] ??
    null
  );
};

export const selectAiValueWorkspaceChain = ({
  blueprints,
  libraries,
  engagements,
  baselines,
  evidenceCases = [],
  preferredBlueprintId,
  preferredEngagementId
}: AiValueWorkspaceChainSelectionInput): AiValueWorkspaceChainSelection | null => {
  const validBlueprints = validObjects(blueprints);
  const preferredBlueprint = validBlueprints.find(
    (object) => object.object_id === preferredBlueprintId
  );
  const candidates = (preferredBlueprint ? [preferredBlueprint] : validBlueprints)
    .map((blueprint) => {
      const workflowFamily = blueprint.workflow_family;
      const library = firstForWorkflow(libraries, workflowFamily);
      const baseline = selectBestBaselineForWorkflow(baselines, workflowFamily);
      const hasEvidenceCase = matchingWorkflow(evidenceCases, workflowFamily).length > 0;
      const score =
        (preferredBlueprint ? 100 : 0) +
        (hasEvidenceCase ? 20 : 0) +
        (library?.workflow_family === workflowFamily ? 10 : 0) +
        (baseline ? 1 : 0);
      return { blueprint, library, baseline, score };
    })
    .filter((candidate) => candidate.library);

  const selected = candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.blueprint.object_id.localeCompare(b.blueprint.object_id)
  )[0];

  if (!selected?.library) return null;
  return {
    workflowFamily: selected.blueprint.workflow_family,
    blueprint: selected.blueprint,
    metricsLibrary: selected.library,
    engagement: preferredEngagement(engagements, preferredEngagementId),
    fluencyBaseline: selected.baseline
  };
};

export const selectAiValueJourneyObjects = (
  byType: Record<string, AiValueObjectSummary[]>,
  preferences: {
    preferredBlueprintId?: string | null;
    preferredEngagementId?: string | null;
  } = {}
): AiValueJourneyObjectSelection => {
  const evidenceCases = validObjects(byType.value_evidence_case);
  const preferredBlueprint = validObjects(byType.blueprint).find(
    (object) => object.object_id === preferences.preferredBlueprintId
  );
  const evidenceCaseWorkflow =
    evidenceCases.find((object) => object.workflow_family)?.workflow_family ?? null;
  const selected =
    selectAiValueWorkspaceChain({
      blueprints: byType.blueprint ?? [],
      libraries: byType.metrics_library ?? [],
      engagements: byType.engagement ?? [],
      baselines: byType.fluency_baseline ?? [],
      evidenceCases,
      preferredBlueprintId: preferences.preferredBlueprintId ?? null,
      preferredEngagementId: preferences.preferredEngagementId ?? null
    }) ?? null;

  if (preferredBlueprint && !selected) {
    return {
      workflowFamily: preferredBlueprint.workflow_family,
      engagement: null,
      blueprint: null,
      metricsLibrary: null,
      readiness: null,
      scenario: null,
      roiScenario: null
    };
  }

  const workflowFamily = selected?.workflowFamily ?? evidenceCaseWorkflow;

  return {
    workflowFamily,
    engagement: selected?.engagement ?? validObjects(byType.engagement)[0] ?? null,
    blueprint: selected?.blueprint ?? firstForWorkflow(byType.blueprint, workflowFamily),
    metricsLibrary:
      selected?.metricsLibrary ?? firstForWorkflow(byType.metrics_library, workflowFamily),
    readiness: firstForWorkflow(byType.evidence_readiness, workflowFamily),
    scenario: firstForWorkflow(byType.value_scenario, workflowFamily),
    roiScenario: firstForWorkflow(byType.roi_scenario, workflowFamily)
  };
};
