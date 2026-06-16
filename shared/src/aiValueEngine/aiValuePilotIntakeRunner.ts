/**
 * AI Value Engine - Pilot Intake Runner.
 *
 * Pure deterministic runner for the first customer-safe pilot motion:
 * scrubbed aggregate Glean export summaries -> Source Packages ->
 * Evidence Collection Assembly -> draft Evidence Snapshot -> non-persisted
 * Claim Readiness Handoff.
 *
 * This module does not parse raw files, run BigQuery, persist objects, create
 * routes/UI, build claim-readiness snapshots, build executive readout
 * snapshots, feed reportability, or compute financial output.
 */

import {
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  validateClaimReadinessHandoff
} from "./claimReadinessHandoff";
import {
  buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages,
  validateEvidenceCollectionAssembly
} from "./evidenceCollectionAssembler";
import { validateEvidenceSnapshot } from "./evidenceSnapshot";
import { validateMeasurementPlan } from "./measurementPlan";
import {
  convertScrubbedGleanClientExportToEvidenceInputs,
  type ScrubbedGleanClientExportConversionResult
} from "./scrubbedGleanClientExportConverter";
import type { ClientEvidenceEntry } from "./clientEvidenceEntry";
import type { SourcePackage } from "./sourcePackages";

export const AI_VALUE_PILOT_INTAKE_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_PILOT_INTAKE_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_PILOT_INTAKE_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_pilot_intake_runner_2026_06";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const REQUIRED_CAVEATS = [
  "Pilot intake runner accepts scrubbed aggregate export summaries only; raw rows, prompts, responses, transcripts, query text, files, and identifiers are out of scope.",
  "Source Packages are evidence inputs only and cannot create full Playbook coverage, claim readiness, reportability readiness, or customer-facing financial output by themselves.",
  "Evidence Snapshot and Claim Readiness Handoff outputs are draft, non-persisted internal objects.",
  "Layer 1 telemetry, VBD, and source availability are not ROI, productivity, causality, headcount, attribution, or financial proof."
];

const DISALLOWED_KEY_PATTERNS = [
  /raw_(?:rows?|files?|prompt|response|transcript|content)/i,
  /^rows$/i,
  /^events$/i,
  /^samples$/i,
  /^records$/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /^file_contents?$/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /person_id/i,
  /person_identifier/i,
  /direct_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /^claim_readiness_snapshot$/i,
  /^executive_readout_snapshot$/i,
  /^reportability_readiness$/i,
  /^glean_signal_readiness_map$/i,
  /^persisted$/i,
  /^creates_migrations$/i,
  /^creates_backend_routes$/i,
  /^creates_frontend_ui$/i,
  /^creates_ingestion_jobs$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^roi$/i,
  /^ebita$/i,
  /^causality$/i
];

const DISALLOWED_TRUE_KEY_PATTERNS = [
  /contains_direct_identifiers/i,
  /contains_raw_content/i,
  /contains_raw_rows/i,
  /contains_raw_files/i,
  /contains_raw_prompts/i,
  /contains_raw_responses/i,
  /contains_transcripts/i,
  /contains_query_text/i,
  /contains_file_contents/i,
  /contains_person_level_productivity/i,
  /contains_person_level_hris_records/i,
  /contains_hashed_or_joinable_person_identifiers/i,
  /contains_manager_or_team_ranking/i,
  /contains_people_decisioning/i,
  /contains_compensation_or_performance_inference/i,
  /contains_promotion_or_discipline_inference/i,
  /contains_attrition_prediction/i,
  /contains_hris_inference_from_ai_usage/i,
  /^claim_readiness_snapshot$/i,
  /^executive_readout_snapshot$/i,
  /^reportability_readiness$/i,
  /^persisted$/i,
  /^creates_migrations$/i,
  /^creates_backend_routes$/i,
  /^creates_frontend_ui$/i,
  /^creates_ingestion_jobs$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^roi$/i,
  /^ebita$/i,
  /^causality$/i
];

const ALLOWED_INPUT_FIELDS = new Set([
  "measurementPlan",
  "scrubbedGleanExports",
  "intakeRunId",
  "assemblyId",
  "evidenceSnapshotId",
  "handoffId",
  "generatedAt"
]);

export interface BuildAiValuePilotIntakeRunInput {
  measurementPlan: any;
  scrubbedGleanExports: any[];
  intakeRunId?: string;
  assemblyId?: string;
  evidenceSnapshotId?: string;
  handoffId?: string;
  generatedAt?: string;
}

export interface AiValuePilotIntakeRun {
  schema_version: string;
  intake_run_id: string;
  org_id: string | null;
  measurement_plan_id: string | null;
  workflow_family: string | null;
  decision: string;
  valid: boolean;
  gaps: string[];
  measurement_plan_validation_result: ReturnType<typeof validateMeasurementPlan>;
  conversion_results: ScrubbedGleanClientExportConversionResult[];
  client_evidence_entries: ClientEvidenceEntry[];
  source_packages: SourcePackage[];
  evidence_collection_assembly: ReturnType<typeof buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages> | null;
  evidence_snapshot: Record<string, any> | null;
  claim_readiness_handoff: ReturnType<typeof buildClaimReadinessHandoffFromEvidenceSnapshot> | null;
  feeds: {
    normalized_evidence_inputs: boolean;
    evidence_collection_assembly: boolean;
    evidence_snapshot_input: boolean;
    claim_readiness_handoff: boolean;
    claim_readiness_snapshot: false;
    executive_readout_snapshot: false;
    reportability_readiness: false;
    customer_facing_financial_output: false;
  };
  persistence_policy: {
    persisted: false;
    creates_migrations: false;
    creates_prisma_schema: false;
    creates_backend_routes: false;
    creates_frontend_ui: false;
    creates_ingestion_jobs: false;
  };
  allowed_uses: string[];
  blocked_uses: string[];
  required_caveats: string[];
  generated_at: string;
  derivation_version: string;
}

export interface AiValuePilotIntakeRunValidationResult {
  schema_version: string;
  intake_run_id: string | null;
  org_id: string | null;
  measurement_plan_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: AiValuePilotIntakeRun["feeds"];
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function workflowFamilyOf(plan: any): string | null {
  return typeof plan?.workflow_scope?.workflow_family === "string"
    ? plan.workflow_scope.workflow_family
    : null;
}

function normalizedKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function keyMatches(patterns: RegExp[], key: string): boolean {
  const normalized = normalizedKey(key);
  return patterns.some((pattern) => pattern.test(key) || pattern.test(normalized));
}

function orgIdOf(plan: any): string | null {
  return typeof plan?.org_id === "string" ? plan.org_id : null;
}

function measurementPlanIdOf(plan: any): string | null {
  return typeof plan?.measurement_plan_id === "string"
    ? plan.measurement_plan_id
    : null;
}

function defaultIntakeRunId(plan: any): string {
  return `ai_value_pilot_intake_run_${safeIdPart(String(orgIdOf(plan) ?? "unknown_org"))}_${safeIdPart(String(workflowFamilyOf(plan) ?? "unknown_workflow"))}`;
}

function falseFeeds(): AiValuePilotIntakeRun["feeds"] {
  return {
    normalized_evidence_inputs: false,
    evidence_collection_assembly: false,
    evidence_snapshot_input: false,
    claim_readiness_handoff: false,
    claim_readiness_snapshot: false,
    executive_readout_snapshot: false,
    reportability_readiness: false,
    customer_facing_financial_output: false
  };
}

function feedsFor(run: {
  conversion_results: ScrubbedGleanClientExportConversionResult[];
  evidence_collection_assembly: any | null;
  evidence_snapshot: any | null;
  claim_readiness_handoff: any | null;
}): AiValuePilotIntakeRun["feeds"] {
  const normalized = run.conversion_results.length > 0 &&
    run.conversion_results.every((result) => result.valid);
  return {
    normalized_evidence_inputs: normalized,
    evidence_collection_assembly: run.evidence_collection_assembly !== null,
    evidence_snapshot_input: run.evidence_snapshot !== null,
    claim_readiness_handoff: run.claim_readiness_handoff !== null,
    claim_readiness_snapshot: false,
    executive_readout_snapshot: false,
    reportability_readiness: false,
    customer_facing_financial_output: false
  };
}

function persistencePolicy(): AiValuePilotIntakeRun["persistence_policy"] {
  return {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false
  };
}

function collectConversionGaps(
  conversionResults: ScrubbedGleanClientExportConversionResult[]
): string[] {
  const gaps: string[] = [];
  for (const [index, result] of conversionResults.entries()) {
    if (!result.valid) {
      gaps.push(
        ...result.gaps.map((gap) =>
          `scrubbedGleanExports[${index}] ${result.export_id ?? "unknown_export"}: ${gap}`
        )
      );
      continue;
    }
    if (result.source_package === null || result.feeds.evidence_collection_input !== true) {
      gaps.push(
        `scrubbedGleanExports[${index}] ${result.export_id ?? "unknown_export"} did not produce a Source Package for evidence collection`
      );
    }
  }
  return gaps;
}

function collectUnsupportedInputGaps(input: BuildAiValuePilotIntakeRunInput): string[] {
  if (!input || typeof input !== "object") {
    return ["pilot intake input must be an object"];
  }
  return Object.keys(input)
    .filter((field) => !ALLOWED_INPUT_FIELDS.has(field))
    .map((field) => `Unsupported pilot intake input field: ${field}`);
}

function collectBindingGaps(
  plan: any,
  conversionResults: ScrubbedGleanClientExportConversionResult[],
  sourcePackages: SourcePackage[]
): string[] {
  const gaps: string[] = [];
  const orgId = orgIdOf(plan);
  const measurementPlanId = measurementPlanIdOf(plan);
  const windowStart = String(plan?.windows?.baseline_window_start ?? "");
  const windowEnd = String(plan?.windows?.baseline_window_end ?? "");
  const aggregateGrain = String(plan?.workflow_scope?.approved_aggregate_grain ?? "");

  for (const [index, result] of conversionResults.entries()) {
    if (result.org_id !== orgId) {
      gaps.push(`scrubbedGleanExports[${index}] org_id does not match measurement plan`);
    }
    if (result.measurement_plan_id !== measurementPlanId) {
      gaps.push(`scrubbedGleanExports[${index}] measurement_plan_id does not match measurement plan`);
    }
  }

  for (const [index, sourcePackage] of sourcePackages.entries()) {
    if (sourcePackage.org_id !== orgId) {
      gaps.push(`source_packages[${index}] org_id does not match measurement plan`);
    }
    if (String(sourcePackage.covered_window?.window_start ?? "") !== windowStart) {
      gaps.push(`source_packages[${index}] covered_window.window_start does not match measurement plan`);
    }
    if (String(sourcePackage.covered_window?.window_end ?? "") !== windowEnd) {
      gaps.push(`source_packages[${index}] covered_window.window_end does not match measurement plan`);
    }
    if (
      sourcePackage.source_package_type !== "aggregate_workforce_context_export" &&
      String(sourcePackage.approved_aggregate_grain ?? "") !== aggregateGrain
    ) {
      gaps.push(`source_packages[${index}] approved_aggregate_grain does not match measurement plan`);
    }
  }

  const typeCounts = new Map<string, number>();
  for (const sourcePackage of sourcePackages) {
    typeCounts.set(
      sourcePackage.source_package_type,
      (typeCounts.get(sourcePackage.source_package_type) ?? 0) + 1
    );
  }
  for (const [type, count] of typeCounts.entries()) {
    if (count > 1) {
      gaps.push(`Duplicate Source Package type ${type} cannot build a pilot intake run without explicit selection`);
    }
  }
  return gaps;
}

function collectForbiddenKeys(value: any, keys: string[] = [], path: string[] = []): string[] {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenKeys(item, keys, [...path, String(index)]));
    return keys;
  }
  for (const [key, nested] of Object.entries(value)) {
    const trueOnlyKey = keyMatches(DISALLOWED_TRUE_KEY_PATTERNS, key);
    const keyIsDisallowed = keyMatches(DISALLOWED_KEY_PATTERNS, key);
    const trueKeyIsDisallowed = trueOnlyKey &&
      nested === true;
    if (keyIsDisallowed && !trueOnlyKey) {
      keys.push([...path, key].join("."));
    }
    if (trueKeyIsDisallowed) {
      keys.push([...path, key].join("."));
    }
    collectForbiddenKeys(nested, keys, [...path, key]);
  }
  return keys;
}

function decisionFor(run: Pick<AiValuePilotIntakeRun, "gaps" | "evidence_snapshot">): string {
  if (run.gaps.length > 0) return "HOLD_FOR_PILOT_INTAKE_REVIEW";
  const coverage = String(run.evidence_snapshot?.playbook_coverage?.coverage_status ?? "unknown");
  if (coverage === "full_playbook_coverage") return "READY_FOR_INTERNAL_CLAIM_REVIEW_HANDOFF";
  return "READY_FOR_CAVEATED_EVIDENCE_REVIEW";
}

function invalidRun(
  input: BuildAiValuePilotIntakeRunInput,
  measurementPlanValidation: ReturnType<typeof validateMeasurementPlan>,
  conversionResults: ScrubbedGleanClientExportConversionResult[],
  clientEvidenceEntries: ClientEvidenceEntry[],
  sourcePackages: SourcePackage[],
  gaps: string[]
): AiValuePilotIntakeRun {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const run: AiValuePilotIntakeRun = {
    schema_version: AI_VALUE_PILOT_INTAKE_RUN_SCHEMA_VERSION,
    intake_run_id: input.intakeRunId ?? defaultIntakeRunId(input.measurementPlan),
    org_id: orgIdOf(input.measurementPlan),
    measurement_plan_id: measurementPlanIdOf(input.measurementPlan),
    workflow_family: workflowFamilyOf(input.measurementPlan),
    decision: "HOLD_FOR_PILOT_INTAKE_REVIEW",
    valid: false,
    gaps,
    measurement_plan_validation_result: measurementPlanValidation,
    conversion_results: conversionResults,
    client_evidence_entries: clientEvidenceEntries,
    source_packages: sourcePackages,
    evidence_collection_assembly: null,
    evidence_snapshot: null,
    claim_readiness_handoff: null,
    feeds: falseFeeds(),
    persistence_policy: persistencePolicy(),
    allowed_uses: [
      "source_package_preparation",
      "evidence_collection_planning",
      "evidence_snapshot_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION
  };
  return run;
}

export function buildAiValuePilotIntakeRunFromScrubbedGleanExports(
  input: BuildAiValuePilotIntakeRunInput
): AiValuePilotIntakeRun {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const measurementPlanValidation = validateMeasurementPlan(input.measurementPlan);
  const initialGaps = [
    ...collectUnsupportedInputGaps(input),
    ...(!measurementPlanValidation.valid
      ? measurementPlanValidation.gaps.map((gap) => `measurementPlan: ${gap}`)
      : []),
    ...(!Array.isArray(input.scrubbedGleanExports)
      ? ["scrubbedGleanExports must be an array"]
      : [])
  ];
  if (initialGaps.length > 0) {
    return invalidRun(input, measurementPlanValidation, [], [], [], initialGaps);
  }

  const conversionResults = input.scrubbedGleanExports.map((exportInput, index) =>
    convertScrubbedGleanClientExportToEvidenceInputs(exportInput, {
      generatedAt,
      clientEvidenceEntryId: `client_evidence_entry_${safeIdPart(String(exportInput?.export_id ?? `export_${index}`))}`,
      sourcePackageId: `source_package_${safeIdPart(String(exportInput?.export_id ?? `export_${index}`))}`
    })
  );
  const clientEvidenceEntries = conversionResults
    .map((result) => result.client_evidence_entry)
    .filter((entry): entry is ClientEvidenceEntry => entry !== null);
  const sourcePackages = conversionResults
    .map((result) => result.source_package)
    .filter((sourcePackage): sourcePackage is SourcePackage => sourcePackage !== null);
  const preAssemblyGaps = [
    ...collectConversionGaps(conversionResults),
    ...collectBindingGaps(input.measurementPlan, conversionResults, sourcePackages)
  ];
  if (preAssemblyGaps.length > 0) {
    return invalidRun(
      input,
      measurementPlanValidation,
      conversionResults,
      clientEvidenceEntries,
      sourcePackages,
      preAssemblyGaps
    );
  }

  const assembly = buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages(
    input.measurementPlan,
    sourcePackages,
    {
      assemblyId: input.assemblyId ??
        `evidence_collection_assembly_${safeIdPart(String(input.intakeRunId ?? defaultIntakeRunId(input.measurementPlan)))}`,
      evidenceSnapshotId: input.evidenceSnapshotId ??
        `evidence_snapshot_${safeIdPart(String(input.intakeRunId ?? defaultIntakeRunId(input.measurementPlan)))}`,
      generatedAt
    }
  );
  const assemblyValidation = validateEvidenceCollectionAssembly(assembly);
  const evidenceSnapshot = assembly.draft_evidence_snapshot_input;
  const snapshotValidation = validateEvidenceSnapshot(evidenceSnapshot);
  const assemblyGaps = [
    ...(!assemblyValidation.valid
      ? assemblyValidation.gaps.map((gap) => `evidence_collection_assembly: ${gap}`)
      : []),
    ...(!snapshotValidation.valid
      ? snapshotValidation.gaps.map((gap) => `evidence_snapshot: ${gap}`)
      : [])
  ];
  if (assemblyGaps.length > 0) {
    return {
      ...invalidRun(
        input,
        measurementPlanValidation,
        conversionResults,
        clientEvidenceEntries,
        sourcePackages,
        assemblyGaps
      ),
      evidence_collection_assembly: assembly,
      evidence_snapshot: evidenceSnapshot,
      feeds: {
        ...falseFeeds(),
        normalized_evidence_inputs: true
      }
    };
  }

  const handoff = buildClaimReadinessHandoffFromEvidenceSnapshot(evidenceSnapshot, {
    handoffId: input.handoffId ??
      `claim_readiness_handoff_${safeIdPart(String(input.intakeRunId ?? defaultIntakeRunId(input.measurementPlan)))}`,
    createdAt: generatedAt
  });
  const handoffValidation = validateClaimReadinessHandoff(handoff);
  const handoffGaps = handoffValidation.valid
    ? []
    : handoffValidation.gaps.map((gap) => `claim_readiness_handoff: ${gap}`);
  const run: AiValuePilotIntakeRun = {
    schema_version: AI_VALUE_PILOT_INTAKE_RUN_SCHEMA_VERSION,
    intake_run_id: input.intakeRunId ?? defaultIntakeRunId(input.measurementPlan),
    org_id: orgIdOf(input.measurementPlan),
    measurement_plan_id: measurementPlanIdOf(input.measurementPlan),
    workflow_family: workflowFamilyOf(input.measurementPlan),
    decision: "UNKNOWN",
    valid: handoffGaps.length === 0,
    gaps: handoffGaps,
    measurement_plan_validation_result: measurementPlanValidation,
    conversion_results: conversionResults,
    client_evidence_entries: clientEvidenceEntries,
    source_packages: sourcePackages,
    evidence_collection_assembly: assembly,
    evidence_snapshot: evidenceSnapshot,
    claim_readiness_handoff: handoff,
    feeds: feedsFor({
      conversion_results: conversionResults,
      evidence_collection_assembly: assembly,
      evidence_snapshot: evidenceSnapshot,
      claim_readiness_handoff: handoff
    }),
    persistence_policy: persistencePolicy(),
    allowed_uses: [
      "source_package_preparation",
      "evidence_collection_planning",
      "evidence_snapshot_preparation",
      "claim_readiness_handoff_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION
  };
  run.decision = decisionFor(run);
  if (!run.valid) run.decision = "HOLD_FOR_PILOT_INTAKE_REVIEW";
  return run;
}

export function validateAiValuePilotIntakeRun(
  run: any
): AiValuePilotIntakeRunValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "intake_run_id",
    "org_id",
    "measurement_plan_id",
    "workflow_family",
    "decision",
    "valid",
    "gaps",
    "measurement_plan_validation_result",
    "conversion_results",
    "client_evidence_entries",
    "source_packages",
    "feeds",
    "persistence_policy",
    "allowed_uses",
    "blocked_uses",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    if (run?.[field] === undefined || run?.[field] === null || run?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (run?.schema_version && run.schema_version !== AI_VALUE_PILOT_INTAKE_RUN_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.valid !== true) {
    gaps.push("run.valid must be true for a validated pilot intake run");
  }
  if (!Array.isArray(run?.gaps) || run.gaps.length !== 0) {
    gaps.push("gaps must be an empty array for a validated pilot intake run");
  }
  if (run?.measurement_plan_validation_result?.valid !== true) {
    gaps.push("measurement_plan_validation_result.valid must be true");
  }
  if (!Array.isArray(run?.conversion_results) ||
      run.conversion_results.some((result: any) => result?.valid !== true)) {
    gaps.push("all conversion_results must be valid");
  }
  if (!Array.isArray(run?.source_packages) || run.source_packages.length === 0) {
    gaps.push("source_packages must contain at least one Source Package");
  }
  const sourcePackageTypes = stringsOf(
    Array.isArray(run?.source_packages)
      ? run.source_packages.map((sourcePackage: any) => sourcePackage?.source_package_type)
      : []
  );
  if (new Set(sourcePackageTypes).size !== sourcePackageTypes.length) {
    gaps.push("source_packages cannot contain duplicate source_package_type values");
  }
  if (run?.evidence_collection_assembly) {
    const assemblyValidation = validateEvidenceCollectionAssembly(run.evidence_collection_assembly);
    if (!assemblyValidation.valid) {
      gaps.push(...assemblyValidation.gaps.map((gap) => `evidence_collection_assembly: ${gap}`));
    }
  } else {
    gaps.push("evidence_collection_assembly is missing");
  }
  if (run?.evidence_snapshot) {
    const snapshotValidation = validateEvidenceSnapshot(run.evidence_snapshot);
    if (!snapshotValidation.valid) {
      gaps.push(...snapshotValidation.gaps.map((gap) => `evidence_snapshot: ${gap}`));
    }
  } else {
    gaps.push("evidence_snapshot is missing");
  }
  if (run?.claim_readiness_handoff) {
    const handoffValidation = validateClaimReadinessHandoff(run.claim_readiness_handoff);
    if (!handoffValidation.valid) {
      gaps.push(...handoffValidation.gaps.map((gap) => `claim_readiness_handoff: ${gap}`));
    }
    if (run.claim_readiness_handoff?.persistence_policy?.persisted !== false) {
      gaps.push("claim_readiness_handoff.persistence_policy.persisted must be false");
    }
  } else {
    gaps.push("claim_readiness_handoff is missing");
  }
  for (const [field, expected] of Object.entries({
    claim_readiness_snapshot: false,
    executive_readout_snapshot: false,
    reportability_readiness: false,
    customer_facing_financial_output: false
  })) {
    if (run?.feeds?.[field] !== expected) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const [field, expected] of Object.entries(persistencePolicy())) {
    if (run?.persistence_policy?.[field] !== expected) {
      gaps.push(`persistence_policy.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(run?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  const forbiddenKeys = collectForbiddenKeys(run);
  if (forbiddenKeys.length > 0) {
    gaps.push(`Forbidden field(s) detected: ${Array.from(new Set(forbiddenKeys)).sort().join(", ")}`);
  }
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    intake_run_id: run?.intake_run_id ?? null,
    org_id: run?.org_id ?? null,
    measurement_plan_id: run?.measurement_plan_id ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: run?.feeds ?? falseFeeds()
  };
}
