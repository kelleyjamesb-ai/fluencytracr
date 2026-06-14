/**
 * AI Value Engine - support pilot Glean readiness adapter.
 *
 * Narrow internal adapter for the first support pilot. It converts a validated
 * runtime Evidence Snapshot plus validated Source Packages into a GSR readiness
 * map for the existing Reportability Gate. It does not create reportability
 * permissions from Customer Exposure Policy, persist data, read raw rows, or
 * infer unavailable signal families from adjacent telemetry.
 */

import {
  GleanSignalReadinessMapSchema,
  type GleanSignalReadinessMap
} from "../gleanSignalReadinessSchemas";
import { validateEvidenceSnapshot } from "./evidenceSnapshot";
import { validateSourcePackage } from "./sourcePackages";

interface SignalFamilyConfig {
  signal_family: string;
  required_source_package_type: string;
  required_coverage_signals: string[];
  required_source_signal_families: string[];
  stable_join_keys: string[];
  derived_dimensions: string[];
  export_channel: string;
}

export interface BuildSupportPilotGleanReadinessMapInput {
  evidenceSnapshot: any;
  sourcePackages: any[];
  generatedAt?: string;
}

const UNSAFE_PRIVACY_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

const SUPPORT_PILOT_SIGNAL_FAMILIES: SignalFamilyConfig[] = [
  {
    signal_family: "assistant",
    required_source_package_type: "layer_1_bigquery_telemetry_summary",
    required_coverage_signals: ["chat_or_assistant_activity"],
    required_source_signal_families: ["assistant"],
    stable_join_keys: ["chat_session_id", "session_tracking_token"],
    derived_dimensions: ["usage_quality", "coverage"],
    export_channel: "bigquery_export"
  },
  {
    signal_family: "search_document_retrieval",
    required_source_package_type: "layer_1_bigquery_telemetry_summary",
    required_coverage_signals: ["search_activity"],
    required_source_signal_families: ["search_document_retrieval"],
    stable_join_keys: ["session_tracking_token", "event_timestamp"],
    derived_dimensions: ["usage_quality", "coverage"],
    export_channel: "bigquery_export"
  },
  {
    signal_family: "agent_run",
    required_source_package_type: "layer_1_bigquery_telemetry_summary",
    required_coverage_signals: ["agent_lifecycle_activity"],
    required_source_signal_families: ["agent_run", "workflow_agent"],
    stable_join_keys: ["workflow_run_id"],
    derived_dimensions: ["behavior_change", "coverage"],
    export_channel: "bigquery_export"
  }
];

const SUPPORT_PILOT_WORKFLOW_FAMILY = "customer_support_case_resolution";

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function coverageSignals(snapshot: any): Set<string> {
  return new Set(
    stringsOf(
      snapshot?.playbook_coverage?.layer_1_platform_telemetry?.covered_signals
    )
  );
}

function packageIsUnsafe(sourcePackage: any): boolean {
  const boundary = sourcePackage?.privacy_boundary ?? {};
  return boundary.aggregate_only !== true ||
    UNSAFE_PRIVACY_FLAGS.some((flag) => boundary[flag] === true);
}

function packageIsSuppressed(sourcePackage: any): boolean {
  return sourcePackage?.evidence_state === "suppressed" ||
    sourcePackage?.k_min_posture?.cohort_threshold_met === false ||
    Number(sourcePackage?.k_min_posture?.suppressed_or_unknown_slices ?? 0) > 0;
}

function packageHasPresentEvidence(sourcePackage: any): boolean {
  return sourcePackage?.evidence_state === "present";
}

function sourcePackageSignalFamilies(sourcePackage: any): Set<string> {
  return new Set([
    ...stringsOf(sourcePackage?.source_refs?.covered_signal_families),
    ...stringsOf(sourcePackage?.source_refs?.exported_signal_families),
    ...stringsOf(sourcePackage?.source_refs?.signal_families)
  ]);
}

function sourcePackageCoversSignalFamily(
  sourcePackage: any,
  config: SignalFamilyConfig
): boolean {
  const coveredFamilies = sourcePackageSignalFamilies(sourcePackage);
  return config.required_source_signal_families.some((family) =>
    coveredFamilies.has(family)
  );
}

function packageByType(sourcePackages: any[], packageType: string): any | null {
  return sourcePackages.find(
    (sourcePackage) => sourcePackage?.source_package_type === packageType
  ) ?? null;
}

function assertNoDuplicatePackageTypes(sourcePackages: any[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const sourcePackage of sourcePackages) {
    const packageType = String(sourcePackage?.source_package_type ?? "");
    if (!packageType) continue;
    if (seen.has(packageType)) {
      duplicates.add(packageType);
    }
    seen.add(packageType);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `Duplicate Source Package type(s) cannot build support pilot Glean readiness map: ${Array.from(duplicates).join(", ")}`
    );
  }
}

function assertSourcePackagesBoundToSnapshot(snapshot: any, sourcePackages: any[]): void {
  const snapshotWindowStart = String(snapshot?.window?.window_start ?? "");
  const snapshotWindowEnd = String(snapshot?.window?.window_end ?? "");
  const referencedPackageIds = new Set(stringsOf(snapshot?.source_refs?.source_package_ids));
  const providedPackageIds = new Set(
    sourcePackages.map((sourcePackage) => String(sourcePackage?.source_package_id ?? ""))
  );
  const drifted = sourcePackages.filter((sourcePackage) =>
    sourcePackage?.org_id !== snapshot?.org_id ||
    String(sourcePackage?.covered_window?.window_start ?? "") !== snapshotWindowStart ||
    String(sourcePackage?.covered_window?.window_end ?? "") !== snapshotWindowEnd ||
    !referencedPackageIds.has(String(sourcePackage?.source_package_id ?? ""))
  );

  const missingReferencedPackageIds = Array.from(referencedPackageIds).filter(
    (packageId) => !providedPackageIds.has(packageId)
  );
  if (drifted.length > 0) {
    throw new Error(
      `Source Package binding drift detected for support pilot Glean readiness map: ${drifted
        .map((sourcePackage) => sourcePackage?.source_package_id ?? "unknown")
        .join(", ")}`
    );
  }
  if (missingReferencedPackageIds.length > 0) {
    throw new Error(
      `Source Package binding drift detected for support pilot Glean readiness map: missing snapshot package ref(s) ${missingReferencedPackageIds.join(", ")}`
    );
  }
}

function assertSupportPilotWorkflow(snapshot: any): void {
  if (snapshot?.workflow?.workflow_family !== SUPPORT_PILOT_WORKFLOW_FAMILY) {
    throw new Error(
      `Support pilot workflow is required to build support pilot Glean readiness map: expected ${SUPPORT_PILOT_WORKFLOW_FAMILY}.`
    );
  }
}

function assertFullPlaybookCoverage(snapshot: any): void {
  if (snapshot?.playbook_coverage?.coverage_status !== "full_playbook_coverage") {
    throw new Error(
      "Full Playbook coverage is required before building support pilot Glean readiness map for reportability."
    );
  }
}

function readinessEntry(
  config: SignalFamilyConfig,
  sourcePackage: any | null,
  coveredSignals: Set<string>,
  generatedAt: string
): any {
  if (!sourcePackage) {
    return {
      signal_family: config.signal_family,
      source_availability: "unavailable",
      export_channel: "not_available",
      scrub_status: "unknown",
      stable_join_keys: [],
      derived_dimensions: [],
      readiness_status: "missing",
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "unknown",
        latency: "unknown",
        join_reliability: "unknown"
      },
      validation_evidence: []
    };
  }

  const sourceValidation = validateSourcePackage(sourcePackage);
  const unsafe = packageIsUnsafe(sourcePackage);
  const suppressed = packageIsSuppressed(sourcePackage);
  const presentEvidence = packageHasPresentEvidence(sourcePackage);
  const signalCovered = config.required_coverage_signals.some((signal) =>
    coveredSignals.has(signal)
  );
  const familyCovered = sourcePackageCoversSignalFamily(sourcePackage, config);
  const present =
    sourceValidation.valid &&
    !unsafe &&
    !suppressed &&
    presentEvidence &&
    signalCovered &&
    familyCovered;
  const blocked = !sourceValidation.valid || unsafe || suppressed;

  return {
    signal_family: config.signal_family,
    source_availability: "available",
    export_channel: config.export_channel,
    scrub_status: unsafe ? "unscrubbed_rejected" : "scrubbed",
    stable_join_keys: present ? config.stable_join_keys : [],
    derived_dimensions: present ? config.derived_dimensions : [],
    readiness_status: present
      ? "present"
      : blocked
        ? "suppressed"
        : "not_computed",
    suppression_applied: blocked,
    suppression_reasons: blocked
      ? [
          suppressed
            ? "source_package_suppressed_or_k_min_not_clear"
            : "source_package_invalid_or_unsafe"
        ]
      : [],
    data_quality: {
      completeness: present ? "verified" : "unknown",
      latency: present ? "known" : "unknown",
      join_reliability: present ? "stable" : "unknown"
    },
    validation_evidence: present
      ? [
          {
            checked_at: generatedAt,
            evidence_type: "automated_contract_check",
            note: `Derived from validated support pilot ${sourcePackage.source_package_type} Source Package ${sourcePackage.source_package_id}.`
          }
        ]
      : []
  };
}

export function buildSupportPilotGleanReadinessMapFromRuntimeEvidence(
  input: BuildSupportPilotGleanReadinessMapInput
): GleanSignalReadinessMap {
  const snapshotValidation = validateEvidenceSnapshot(input.evidenceSnapshot);
  if (!snapshotValidation.valid) {
    throw new Error(
      `Evidence Snapshot is invalid and cannot build support pilot Glean readiness map: ${snapshotValidation.gaps.join("; ")}`
    );
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const layerOneSignals = coverageSignals(input.evidenceSnapshot);
  assertSupportPilotWorkflow(input.evidenceSnapshot);
  assertFullPlaybookCoverage(input.evidenceSnapshot);
  assertNoDuplicatePackageTypes(input.sourcePackages);
  assertSourcePackagesBoundToSnapshot(input.evidenceSnapshot, input.sourcePackages);

  return GleanSignalReadinessMapSchema.parse({
    schema_version: "GSR_2026_05",
    org_id: input.evidenceSnapshot.org_id,
    window: `${input.evidenceSnapshot.window.window_start}_${input.evidenceSnapshot.window.window_end}`,
    generated_at: generatedAt,
    source_system: "Glean",
    entries: SUPPORT_PILOT_SIGNAL_FAMILIES.map((config) =>
      readinessEntry(
        config,
        packageByType(input.sourcePackages, config.required_source_package_type),
        layerOneSignals,
        generatedAt
      )
    ),
    next_actions: []
  });
}
