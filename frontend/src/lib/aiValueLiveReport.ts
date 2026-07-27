import type {
  AiValueChainRun,
  AiValueSpineRun,
  AiValueSpineStage
} from "./aiValueApi";

export type RequestBoundLiveRun = AiValueSpineRun;

type PersistedRecord = { object_type: string; object_id: string };
type RunEnvelope = {
  run: AiValueSpineRun | AiValueChainRun;
  persisted: PersistedRecord[];
};
type LiveReportInput = RunEnvelope;

export interface RequestBoundLiveReport {
  boundaryLabel: "Internal, request-bound preview";
  boundaryStatement: string;
  workflowName: string;
  valueRoute: string;
  decision: string;
  claimState: string;
  summary: string;
  currentPosture: Array<[string, string]>;
  layers: Array<{
    title: string;
    summary: string;
    bullets: string[];
  }>;
  recommendations: string[];
  governanceNotes: string[];
}

const record = (value: unknown): Record<string, any> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const sameStrings = (left: unknown, right: unknown) => {
  const leftStrings = strings(left);
  const rightStrings = strings(right);
  return (
    leftStrings.length === rightStrings.length &&
    leftStrings.every((value, index) => value === rightStrings[index])
  );
};

const sameJson = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const presentReferenceKeys = (value: Record<string, unknown>) =>
  Object.entries(value)
    .filter(([, reference]) => typeof reference === "string" && reference.trim())
    .map(([key]) => key)
    .sort();

const exactStage = (stage: AiValueSpineStage) =>
  stage.status === "VALID" &&
  record(stage.validation)?.valid === true &&
  record(stage.object) !== null;

const exactGeneratedStage = (stage: AiValueSpineStage) =>
  exactStage(stage) && stage.generated === true;

const normalizeInput = (
  input: LiveReportInput
): {
  chain: AiValueChainRun | null;
  spine: AiValueSpineRun;
  persisted: PersistedRecord[];
} | null => {
  const envelope = record(input);
  if (
    !envelope ||
    !("run" in envelope) ||
    !record(envelope.run) ||
    !Array.isArray(envelope.persisted)
  ) {
    return null;
  }
  const run = envelope.run as AiValueSpineRun | AiValueChainRun;
  const chain = "spine" in run ? (run as AiValueChainRun) : null;
  const spine = chain?.spine ?? (run as AiValueSpineRun);
  if (!record(spine)) return null;
  return {
    chain,
    spine,
    persisted: envelope.persisted as PersistedRecord[]
  };
};

const optionalChainStageIsContained = (
  stage: AiValueSpineStage,
  extraCheck?: () => boolean
) => {
  if (stage.status === "NOT_RUN") {
    return stage.object === null && stage.validation === null;
  }
  return exactStage(stage) && (extraCheck?.() ?? true);
};

const collectInternalIdentityValues = (value: unknown) => {
  const values = new Set<string>();
  const visit = (node: unknown, key = "") => {
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, key));
      return;
    }
    const nodeRecord = record(node);
    if (nodeRecord) {
      Object.entries(nodeRecord).forEach(([childKey, childValue]) =>
        visit(childValue, childKey)
      );
      return;
    }
    if (
      typeof node === "string" &&
      (key.endsWith("_id") ||
        key.endsWith("_ids") ||
        key === "metric_id" ||
        key === "included_metric_ids")
    ) {
      values.add(node);
    }
  };
  visit(value);
  return values;
};

const containsInternalIdentity = (
  report: RequestBoundLiveReport,
  identityValues: Set<string>
) => {
  const rendered = JSON.stringify(report);
  return [...identityValues].some(
    (value) => value.length > 0 && rendered.includes(value)
  );
};

const humanize = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const buildRequestBoundLiveReport = (
  input: LiveReportInput
): RequestBoundLiveReport | null => {
  const normalized = normalizeInput(input);
  if (!normalized || normalized.persisted.length > 0) return null;
  const { chain, spine } = normalized;
  if (
    spine.halted_at !== null ||
    spine.decision !== "READY_FOR_EXECUTIVE_VALIDATION" ||
    spine.customer_facing_economic_output !== false
  ) {
    return null;
  }
  if (
    !exactStage(spine.stages.blueprint) ||
    !exactStage(spine.stages.metrics) ||
    !exactGeneratedStage(spine.stages.scenario) ||
    !exactGeneratedStage(spine.stages.readiness) ||
    !exactGeneratedStage(spine.stages.claim_boundary) ||
    !exactGeneratedStage(spine.stages.executive_packet)
  ) {
    return null;
  }

  if (
    chain &&
    (chain.halted_at !== null ||
      chain.decision !== spine.decision ||
      chain.customer_facing_economic_output !== false ||
      !optionalChainStageIsContained(
        chain.engagement,
        () => chain.engagement.covers_workflow_family === true
      ) ||
      !optionalChainStageIsContained(chain.fluency_baseline) ||
      !optionalChainStageIsContained(
        chain.outcome_evidence,
        () => chain.outcome_evidence.attached === true
      ))
  ) {
    return null;
  }

  const blueprint = record(spine.stages.blueprint.object)!;
  const metrics = record(spine.stages.metrics.object)!;
  const scenario = record(spine.stages.scenario.object)!;
  const readiness = record(spine.stages.readiness.object)!;
  const boundary = record(spine.stages.claim_boundary.object)!;
  const packet = record(spine.stages.executive_packet.object)!;
  const packetRefs = record(packet.source_refs);
  const scenarioSource = record(scenario.source);
  const scenarioInput = record(scenario.input);
  const readinessRefs = record(readiness.source_refs);
  const packetSections = record(packet.sections);
  const packetWorkflow = record(packetSections?.workflow);
  const packetScenario = record(packetSections?.scenario);
  const packetReadiness = record(packetSections?.readiness);
  const packetBoundary = record(packetSections?.claim_boundary);
  if (
    !packetRefs ||
    !scenarioSource ||
    !scenarioInput ||
    !readinessRefs ||
    !packetSections ||
    !packetWorkflow ||
    !packetScenario ||
    !packetReadiness ||
    !packetBoundary
  ) {
    return null;
  }

  const blueprintId = blueprint.blueprint_id;
  const metricsId = metrics.library_id;
  const scenarioId = scenario.scenario_id;
  const readinessId = readiness.readiness_id;
  const boundaryId = boundary.claim_boundary_id;
  const workflowFamily = blueprint.workflow_family;
  const valueRoute = record(blueprint.value_routes)?.primary;
  if (
    ![blueprintId, metricsId, scenarioId, readinessId, boundaryId, workflowFamily, valueRoute]
      .every((value) => typeof value === "string" && value.trim()) ||
    scenarioSource.blueprint_id !== blueprintId ||
    scenarioSource.metrics_library_id !== metricsId ||
    readinessRefs.blueprint_id !== blueprintId ||
    readinessRefs.metrics_library_id !== metricsId ||
    readinessRefs.scenario_id !== scenarioId ||
    boundary.source_readiness_id !== readinessId ||
    (boundary.source_decision !== undefined &&
      boundary.source_decision !== spine.decision) ||
    packetRefs.blueprint_id !== blueprintId ||
    packetRefs.metrics_library_id !== metricsId ||
    packetRefs.scenario_id !== scenarioId ||
    packetRefs.readiness_id !== readinessId ||
    packetRefs.claim_boundary_id !== boundaryId ||
    packetScenario.scenario_id !== scenarioId
  ) {
    return null;
  }

  if (
    packet.workflow_family !== workflowFamily ||
    packet.workflow_name !== blueprint.workflow_name ||
    scenarioInput.workflow_family !== workflowFamily ||
    readiness.workflow_family !== workflowFamily ||
    boundary.workflow_family !== workflowFamily ||
    packet.value_route !== valueRoute ||
    scenarioInput.value_route !== valueRoute ||
    readiness.value_route !== valueRoute ||
    boundary.value_route !== valueRoute ||
    readiness.decision !== spine.decision ||
    packet.decision !== spine.decision ||
    packetReadiness.decision !== spine.decision ||
    packet.claim_state !== boundary.claim_state ||
    packetBoundary.claim_state !== boundary.claim_state
  ) {
    return null;
  }

  if (
    packet.customer_facing_economic_output !== false ||
    !Array.isArray(metrics.metrics) ||
    !Array.isArray(scenarioInput.metric_references) ||
    !Array.isArray(packetSections.metrics) ||
    !Array.isArray(scenarioInput.scenario_bands) ||
    !Array.isArray(packetScenario.bands) ||
    !sameStrings(packetWorkflow.current_state_steps, blueprint.process_discovery?.current_state_steps) ||
    !sameStrings(packetWorkflow.future_state_steps, blueprint.process_discovery?.future_state_steps) ||
    packetWorkflow.hypothesis !== blueprint.value_hypothesis ||
    !sameJson(packetScenario.bands, scenarioInput.scenario_bands) ||
    !sameStrings(packetScenario.output_units, scenarioInput.output_units) ||
    !sameJson(packetReadiness.checks, readiness.readiness_checks) ||
    !sameStrings(packetReadiness.rationale, readiness.decision_rationale) ||
    !sameStrings(packetBoundary.safe_claims, boundary.safe_claims) ||
    !sameStrings(packetBoundary.caveated_claims, boundary.caveated_claims) ||
    !sameStrings(packetBoundary.blocked_claims, boundary.blocked_claims) ||
    !sameStrings(packetBoundary.required_caveats, boundary.required_caveats) ||
    !sameStrings(packetSections.next_actions, readiness.next_actions)
  ) {
    return null;
  }

  const scenarioMetricIds = strings(scenarioInput.metric_references.map(
    (metric: Record<string, unknown>) => metric?.metric_id
  ));
  const packetMetricIds = strings(packetSections.metrics.map(
    (metric: Record<string, unknown>) => metric?.metric_id
  ));
  const libraryMetricIds = new Set(
    strings(metrics.metrics?.map((metric: Record<string, unknown>) => metric?.metric_id))
  );
  if (
    !sameStrings(packetMetricIds, scenarioMetricIds) ||
    scenarioMetricIds.some((metricId) => !libraryMetricIds.has(metricId)) ||
    packetSections.metrics.some((packetMetric: Record<string, unknown>, index: number) => {
      const scenarioMetric = scenarioInput.metric_references[index];
      const libraryMetric = metrics.metrics.find(
        (metric: Record<string, unknown>) =>
          metric.metric_id === packetMetric.metric_id
      );
      return (
        !scenarioMetric ||
        !libraryMetric ||
        packetMetric.name !== scenarioMetric.name ||
        packetMetric.value_route !== scenarioMetric.value_route ||
        packetMetric.measurement_unit !== scenarioMetric.measurement_unit ||
        packetMetric.owner !== libraryMetric.owner
      );
    })
  ) {
    return null;
  }

  if (chain) {
    const engagementObject = record(chain.engagement.object);
    const baselineObject = record(chain.fluency_baseline.object);
    const outcomeObject = record(chain.outcome_evidence.object);
    if (
      (engagementObject
        ? packetRefs.engagement_id !== engagementObject.engagement_id
        : packetRefs.engagement_id !== undefined) ||
      (baselineObject
        ? packetRefs.fluency_baseline_id !== baselineObject.baseline_id
        : packetRefs.fluency_baseline_id !== undefined) ||
      (outcomeObject && chain.outcome_evidence.attached
        ? readinessRefs.outcome_evidence_export_id !== outcomeObject.export_id
        : readinessRefs.outcome_evidence_export_id !== undefined)
    ) {
      return null;
    }
  }

  const expectedPacketReferenceKeys = [
    "blueprint_id",
    "metrics_library_id",
    "scenario_id",
    "readiness_id",
    "claim_boundary_id",
    ...(chain?.engagement.object ? ["engagement_id"] : []),
    ...(chain?.fluency_baseline.object ? ["fluency_baseline_id"] : [])
  ].sort();
  const expectedReadinessReferenceKeys = [
    "blueprint_id",
    "metrics_library_id",
    "scenario_id",
    ...(chain?.fluency_baseline.object ? ["fluency_baseline_id"] : []),
    ...(chain?.outcome_evidence.object && chain.outcome_evidence.attached
      ? ["outcome_evidence_export_id"]
      : [])
  ].sort();
  if (
    !sameStrings(
      presentReferenceKeys(packetRefs),
      expectedPacketReferenceKeys
    ) ||
    !sameStrings(
      presentReferenceKeys(readinessRefs),
      expectedReadinessReferenceKeys
    )
  ) {
    return null;
  }

  const checks = record(packetReadiness.checks) ?? {};
  const report: RequestBoundLiveReport = {
    boundaryLabel: "Internal, request-bound preview",
    boundaryStatement:
      "This is an internal, request-bound preview. It is not source-bound, canonical, customer-facing, or audit-ready.",
    workflowName: String(packet.workflow_name),
    valueRoute: humanize(String(packet.value_route)),
    decision: "Ready for executive validation",
    claimState: humanize(String(packet.claim_state)),
    summary: String(packetWorkflow.hypothesis),
    currentPosture: [
      ["Workflow", String(packet.workflow_name)],
      ["Value route", humanize(String(packet.value_route))],
      ["Decision", "Ready for executive validation"],
      ["Claim state", humanize(String(packet.claim_state))]
    ],
    layers: [
      {
        title: "Workflow hypothesis",
        summary: String(packetWorkflow.hypothesis),
        bullets: [
          ...strings(packetWorkflow.current_state_steps).map(
            (step) => `Current: ${step}`
          ),
          ...strings(packetWorkflow.future_state_steps).map(
            (step) => `Future: ${step}`
          )
        ]
      },
      {
        title: "Governed metrics",
        summary: "Aggregate measures carried by this exact engine response.",
        bullets: (packetSections.metrics as Array<Record<string, unknown>>).map(
          (metric) =>
            `${String(metric.name)} (${String(metric.measurement_unit)}), owner ${humanize(String(metric.owner))}`
        )
      },
      {
        title: "Scenario interpretation",
        summary: "Directional planning bands from this exact engine response.",
        bullets: (packetScenario.bands as Array<Record<string, unknown>>).map(
          (band) => `${humanize(String(band.band))}: ${String(band.interpretation)}`
        )
      },
      {
        title: "Evidence readiness",
        summary: strings(packetReadiness.rationale).join(" "),
        bullets: Object.entries(checks).map(
          ([name, state]) => `${humanize(name)}: ${humanize(String(state))}`
        )
      },
      {
        title: "Claim boundary",
        summary: strings(packetBoundary.safe_claims).join(" "),
        bullets: [
          ...strings(packetBoundary.caveated_claims),
          ...strings(packetBoundary.blocked_claims).map(
            (claim) => `Blocked: ${humanize(claim)}`
          )
        ]
      }
    ],
    recommendations: strings(packetSections.next_actions),
    governanceNotes: [
      ...strings(packetBoundary.required_caveats),
      "No ROI proof, causality, productivity measurement, individual scoring, ranking, or customer-facing economic output is authorized."
    ]
  };

  const internalIdentityValues = collectInternalIdentityValues({
    chain,
    spine
  });
  return containsInternalIdentity(report, internalIdentityValues) ? null : report;
};
