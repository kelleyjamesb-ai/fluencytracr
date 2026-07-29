import { createHash } from "node:crypto";
import { z } from "zod";

import { canonicalCohortJsonBytes } from "../cohortProof";
import {
  OutcomeComparisonPrivacyReceiptSchema,
  OutcomeComparisonProjectionSchema
} from "../outcomeComparisonPrivacy";

export const AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION =
  "FT_AGGREGATE_CLAIM_AUTHORIZATION_2026_07";
export const AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID = "FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1";
export const AGGREGATE_CLAIM_SOURCE_GRAPH_SCHEMA_VERSION = "FT_AGGREGATE_CLAIM_SOURCE_GRAPH_V1";
export const AGGREGATE_CLAIM_MANIFEST_SCHEMA_VERSION =
  "FT_AGGREGATE_CLAIM_AUTHORIZATION_MANIFEST_V1";
export const AGGREGATE_CLAIM_ARTIFACT_SCHEMA_VERSION = "FT_AGGREGATE_CLAIM_AUTHORIZED_ARTIFACT_V1";
export const AGGREGATE_CLAIM_HELD_REASON = "AGGREGATE_CLAIM_AUTHORIZATION_HELD";

export const INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE = "aggregate_authorized_claim";
export const INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE = "aggregate_authorized_packet";
export const INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE = "aggregate_claim_authorization_manifest";
export const INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPES = Object.freeze([
  INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
  INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
  INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE
]);

export const AGGREGATE_CLAIM_CAVEATS = Object.freeze([
  "Aggregate observation only.",
  "No attribution to AI or any intervention.",
  "No causal conclusion.",
  "Internal review only; not customer-facing."
]);
export const AGGREGATE_CLAIM_MEASUREMENT_UNITS = [
  "cases",
  "count",
  "days",
  "hours",
  "minutes",
  "months",
  "percent",
  "percentage_points",
  "rate",
  "ratio",
  "seconds",
  "share",
  "weeks"
] as const;
export const AGGREGATE_CLAIM_METRIC_IDS = [
  "account_health_review_cycle_days",
  "at_risk_account_share",
  "customer_health_signal_coverage_share",
  "cycle_time",
  "expansion_signal_followup_share",
  "logo_churn_rate",
  "qbr_prep_hours_per_account",
  "renewal_action_staleness_count",
  "renewal_rate",
  "risk_review_coverage_share",
  "sales_forecast_exception_rate",
  "sales_next_step_completeness_share",
  "sales_record_update_lag_hours",
  "sales_stale_opportunity_count",
  "support_backlog_count",
  "support_escalation_rate",
  "support_first_contact_resolution_rate",
  "support_median_resolution_hours",
  "support_reopen_rate",
  "support_verification_coverage"
] as const;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,511}$/;
const FORBIDDEN_CLAIM_TOKEN =
  /(?:^|[_:-])(?:causal|causality|confidence|dollar|impact|improvement|individual|money|prediction|probability|productivity|rank|revenue|roi|score)(?:$|[_:-])/i;

const safeId = z
  .string()
  .regex(SAFE_ID)
  .refine((value) => !FORBIDDEN_CLAIM_TOKEN.test(value), {
    message: "identifier contains blocked claim semantics"
  });
const exactHash = z.string().regex(SHA256_HEX);
const finiteNumber = z.number().finite();
const nonNegativeInteger = z.number().int().nonnegative();
export const AggregateClaimMeasurementUnitSchema = z.enum(AGGREGATE_CLAIM_MEASUREMENT_UNITS);
export const AggregateClaimMetricIdSchema = z.enum(AGGREGATE_CLAIM_METRIC_IDS);

export const AggregateClaimSourceGraphSealSchema = z
  .object({
    schema_version: z.literal(AGGREGATE_CLAIM_SOURCE_GRAPH_SCHEMA_VERSION),
    source_graph_authoritative: z.literal(true),
    outcome_evidence_export_id: safeId,
    outcome_evidence_content_hash: exactHash,
    blueprint_id: safeId,
    blueprint_hash: exactHash,
    metrics_library_id: safeId,
    metrics_library_hash: exactHash,
    scenario_id: safeId,
    scenario_hash: exactHash,
    source_graph_hash: exactHash
  })
  .strict();

export type AggregateClaimSourceGraphSeal = z.infer<typeof AggregateClaimSourceGraphSealSchema>;

export const AggregateObservedMovementSchema = z
  .object({
    metric_id: AggregateClaimMetricIdSchema,
    measurement_unit: AggregateClaimMeasurementUnitSchema,
    baseline_value: finiteNumber,
    comparison_value: finiteNumber,
    absolute_delta: finiteNumber,
    percent_change: finiteNumber.optional(),
    observed_direction: z.enum(["INCREASE", "DECREASE", "NO_CHANGE"]),
    approved_metric_direction: z
      .enum(["INCREASE", "DECREASE", "MAINTAIN", "MONITOR", "NO_CHANGE"])
      .optional(),
    claim_label: z.literal("OBSERVED_NON_ATTRIBUTABLE")
  })
  .strict();

export type AggregateObservedMovement = z.infer<typeof AggregateObservedMovementSchema>;

export const AggregateClaimPolicyStateSchema = z
  .object({
    evidence_schema_state: z.literal("VALID"),
    evidence_review_state: z.literal("ACCEPTED"),
    evidence_admission_state: z.literal("ADMITTED"),
    comparison_privacy_state: z.literal("ATOMIC_COMPARISON_PRIVACY_RELEASED"),
    readiness_state: z.literal("INTERNAL_CLAIM_REVIEW_PERMITTED"),
    model_eligibility_state: z.literal("NOT_REQUESTED"),
    model_use_authorized: z.literal(false),
    claim_authorization_state: z.literal("AUTHORIZED"),
    customer_facing_output_authorized: z.literal(false)
  })
  .strict();

export type AggregateClaimPolicyState = z.infer<typeof AggregateClaimPolicyStateSchema>;

const exactCaveats = z
  .array(z.string())
  .length(AGGREGATE_CLAIM_CAVEATS.length)
  .refine((value) => value.every((entry, index) => entry === AGGREGATE_CLAIM_CAVEATS[index]), {
    message: "aggregate claim caveats must match the fixed template"
  });

export const AggregateAuthorizedClaimContentSchema = z
  .object({
    policy_version: z.literal(AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION),
    template_id: z.literal(AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID),
    org_id: safeId,
    workflow_id: safeId,
    jbtd_id: safeId,
    persona_id: safeId,
    movement: AggregateObservedMovementSchema,
    caveats: exactCaveats,
    model_use_authorized: z.literal(false),
    customer_facing_output_authorized: z.literal(false)
  })
  .strict();

export type AggregateAuthorizedClaimContent = z.infer<typeof AggregateAuthorizedClaimContentSchema>;

export const AggregateAuthorizedPacketContentSchema = z
  .object({
    policy_version: z.literal(AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION),
    template_id: z.literal(AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID),
    org_id: safeId,
    workflow_id: safeId,
    jbtd_id: safeId,
    persona_id: safeId,
    claim_content_hash: exactHash,
    movement: AggregateObservedMovementSchema,
    caveats: exactCaveats,
    customer_facing_output_authorized: z.literal(false)
  })
  .strict();

export type AggregateAuthorizedPacketContent = z.infer<
  typeof AggregateAuthorizedPacketContentSchema
>;

export const AggregateClaimManifestCoreSchema = z
  .object({
    policy_version: z.literal(AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION),
    org_id: safeId,
    workflow_id: safeId,
    jbtd_id: safeId,
    persona_id: safeId,
    source_graph_seal: AggregateClaimSourceGraphSealSchema,
    readiness_id: safeId,
    readiness_hash: exactHash,
    accepted_export_payload_hash: exactHash,
    accepted_review_hash: exactHash,
    comparison_privacy_receipt: OutcomeComparisonPrivacyReceiptSchema,
    comparison_projection: OutcomeComparisonProjectionSchema,
    policy_state: AggregateClaimPolicyStateSchema,
    template_id: z.literal(AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID),
    claim_content_hash: exactHash,
    packet_content_hash: exactHash
  })
  .strict();

export type AggregateClaimManifestCore = z.infer<typeof AggregateClaimManifestCoreSchema>;

export const AggregateAuthorizedClaimArtifactSchema = z
  .object({
    schema_version: z.literal(AGGREGATE_CLAIM_ARTIFACT_SCHEMA_VERSION),
    claim_id: z.string().regex(/^aggregate_claim_[0-9a-f]{64}_[0-9a-f]{64}$/),
    manifest_id: z.string().regex(/^manifest_[0-9a-f]{64}$/),
    content_hash: exactHash,
    content: AggregateAuthorizedClaimContentSchema
  })
  .strict();

export const AggregateAuthorizedPacketArtifactSchema = z
  .object({
    schema_version: z.literal(AGGREGATE_CLAIM_ARTIFACT_SCHEMA_VERSION),
    packet_id: z.string().regex(/^aggregate_packet_[0-9a-f]{64}_[0-9a-f]{64}$/),
    manifest_id: z.string().regex(/^manifest_[0-9a-f]{64}$/),
    claim_id: z.string().regex(/^aggregate_claim_[0-9a-f]{64}_[0-9a-f]{64}$/),
    content_hash: exactHash,
    content: AggregateAuthorizedPacketContentSchema
  })
  .strict();

export const AggregateClaimAuthorizationManifestSchema = z
  .object({
    schema_version: z.literal(AGGREGATE_CLAIM_MANIFEST_SCHEMA_VERSION),
    manifest_id: z.string().regex(/^manifest_[0-9a-f]{64}$/),
    manifest_hash: exactHash,
    claim_id: z.string().regex(/^aggregate_claim_[0-9a-f]{64}_[0-9a-f]{64}$/),
    packet_id: z.string().regex(/^aggregate_packet_[0-9a-f]{64}_[0-9a-f]{64}$/),
    core: AggregateClaimManifestCoreSchema
  })
  .strict();

export type AggregateAuthorizedClaimArtifact = z.infer<
  typeof AggregateAuthorizedClaimArtifactSchema
>;
export type AggregateAuthorizedPacketArtifact = z.infer<
  typeof AggregateAuthorizedPacketArtifactSchema
>;
export type AggregateClaimAuthorizationManifest = z.infer<
  typeof AggregateClaimAuthorizationManifestSchema
>;

export const AggregateClaimHeldResponseSchema = z
  .object({
    decision: z.literal("HOLD"),
    reason_family: z.literal(AGGREGATE_CLAIM_HELD_REASON),
    persisted: z.array(z.never()).length(0)
  })
  .strict();

export const AggregateClaimAuthorizedResponseSchema = z
  .object({
    decision: z.literal("AUTHORIZED"),
    claim_authorization_state: z.literal("AUTHORIZED"),
    packet_id: z.string().regex(/^aggregate_packet_[0-9a-f]{64}_[0-9a-f]{64}$/),
    persisted: z
      .array(
        z
          .object({
            object_type: z.enum([
              INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
              INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
              INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE
            ]),
            object_id: z.string().min(1)
          })
          .strict()
      )
      .length(3),
    customer_facing_output_authorized: z.literal(false)
  })
  .strict();

const encoder = new TextEncoder();

const uint32 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
};

const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
};

export const aggregateClaimCanonicalBytes = (domain: string, value: unknown): Uint8Array => {
  const domainBytes = encoder.encode(domain);
  const payloadBytes = canonicalCohortJsonBytes(value);
  return concat([
    uint32(domainBytes.byteLength),
    domainBytes,
    uint32(payloadBytes.byteLength),
    payloadBytes
  ]);
};

export const aggregateClaimHash = (domain: string, value: unknown): string =>
  createHash("sha256").update(aggregateClaimCanonicalBytes(domain, value)).digest("hex");

export const outcomeEvidenceContentProjection = (
  exportObject: Record<string, unknown>
): Record<string, unknown> => {
  const { review: _review, ...content } = exportObject;
  return content;
};

export const buildAggregateClaimSourceGraphSeal = (input: {
  outcomeEvidenceExport: Record<string, unknown>;
  blueprint: Record<string, unknown>;
  metricsLibrary: Record<string, unknown>;
  scenario: Record<string, unknown>;
}): AggregateClaimSourceGraphSeal => {
  const outcomeEvidenceExportId = safeId.parse(input.outcomeEvidenceExport.export_id);
  const blueprintId = safeId.parse(input.blueprint.blueprint_id);
  const metricsLibraryId = safeId.parse(input.metricsLibrary.library_id);
  const scenarioId = safeId.parse(input.scenario.scenario_id);
  const sealWithoutGraphHash = {
    schema_version: AGGREGATE_CLAIM_SOURCE_GRAPH_SCHEMA_VERSION,
    source_graph_authoritative: true as const,
    outcome_evidence_export_id: outcomeEvidenceExportId,
    outcome_evidence_content_hash: aggregateClaimHash(
      "FT_AGGREGATE_CLAIM_OUTCOME_EVIDENCE_CONTENT_V1",
      outcomeEvidenceContentProjection(input.outcomeEvidenceExport)
    ),
    blueprint_id: blueprintId,
    blueprint_hash: aggregateClaimHash("FT_AGGREGATE_CLAIM_BLUEPRINT_V1", input.blueprint),
    metrics_library_id: metricsLibraryId,
    metrics_library_hash: aggregateClaimHash(
      "FT_AGGREGATE_CLAIM_METRICS_LIBRARY_V1",
      input.metricsLibrary
    ),
    scenario_id: scenarioId,
    scenario_hash: aggregateClaimHash("FT_AGGREGATE_CLAIM_SCENARIO_V1", input.scenario)
  };
  return AggregateClaimSourceGraphSealSchema.parse({
    ...sealWithoutGraphHash,
    source_graph_hash: aggregateClaimHash(
      "FT_AGGREGATE_CLAIM_SOURCE_GRAPH_SEAL_V1",
      sealWithoutGraphHash
    )
  });
};

export const aggregateClaimSourceGraphMatches = (
  sealInput: unknown,
  input: {
    outcomeEvidenceExport: Record<string, unknown>;
    blueprint: Record<string, unknown>;
    metricsLibrary: Record<string, unknown>;
    scenario: Record<string, unknown>;
  }
): boolean => {
  const parsed = AggregateClaimSourceGraphSealSchema.safeParse(sealInput);
  if (!parsed.success) return false;
  try {
    return (
      aggregateClaimHash("FT_AGGREGATE_CLAIM_SOURCE_GRAPH_SEAL_COMPARE_V1", parsed.data) ===
      aggregateClaimHash(
        "FT_AGGREGATE_CLAIM_SOURCE_GRAPH_SEAL_COMPARE_V1",
        buildAggregateClaimSourceGraphSeal(input)
      )
    );
  } catch {
    return false;
  }
};

const normalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

export const buildAggregateObservedMovement = (input: {
  metricId: string;
  measurementUnit: string;
  baselineValue: number;
  comparisonValue: number;
  approvedMetricDirection?: string;
}): AggregateObservedMovement => {
  const baselineValue = normalizeZero(finiteNumber.parse(input.baselineValue));
  const comparisonValue = normalizeZero(finiteNumber.parse(input.comparisonValue));
  const absoluteDelta = normalizeZero(comparisonValue - baselineValue);
  if (!Number.isFinite(absoluteDelta)) {
    throw new Error("AGGREGATE_CLAIM_NONFINITE_DELTA");
  }
  const percentCandidate =
    baselineValue === 0 ? undefined : normalizeZero((absoluteDelta / baselineValue) * 100);
  const percentChange =
    percentCandidate !== undefined && Number.isFinite(percentCandidate)
      ? percentCandidate
      : undefined;
  const approvedDirection =
    input.approvedMetricDirection === undefined
      ? undefined
      : z
          .enum(["INCREASE", "DECREASE", "MAINTAIN", "MONITOR", "NO_CHANGE"])
          .parse(input.approvedMetricDirection.toUpperCase());
  return AggregateObservedMovementSchema.parse({
    metric_id: input.metricId,
    measurement_unit: input.measurementUnit,
    baseline_value: baselineValue,
    comparison_value: comparisonValue,
    absolute_delta: absoluteDelta,
    ...(percentChange === undefined ? {} : { percent_change: percentChange }),
    observed_direction:
      absoluteDelta > 0 ? "INCREASE" : absoluteDelta < 0 ? "DECREASE" : "NO_CHANGE",
    ...(approvedDirection === undefined ? {} : { approved_metric_direction: approvedDirection }),
    claim_label: "OBSERVED_NON_ATTRIBUTABLE"
  });
};

export const buildAggregateClaimAuthorizationBundle = (input: {
  sourceGraphSeal: AggregateClaimSourceGraphSeal;
  readinessId: string;
  readinessHash: string;
  acceptedExportPayloadHash: string;
  acceptedReviewHash: string;
  comparisonPrivacyReceipt: unknown;
  comparisonProjection: unknown;
  policyState: AggregateClaimPolicyState;
  claimContent: AggregateAuthorizedClaimContent;
}): {
  claim: AggregateAuthorizedClaimArtifact;
  packet: AggregateAuthorizedPacketArtifact;
  manifest: AggregateClaimAuthorizationManifest;
} => {
  const claimContent = AggregateAuthorizedClaimContentSchema.parse(input.claimContent);
  const claimContentHash = aggregateClaimHash(
    "FT_AGGREGATE_AUTHORIZED_CLAIM_CONTENT_V1",
    claimContent
  );
  const packetContent = AggregateAuthorizedPacketContentSchema.parse({
    policy_version: AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
    template_id: AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID,
    org_id: claimContent.org_id,
    workflow_id: claimContent.workflow_id,
    jbtd_id: claimContent.jbtd_id,
    persona_id: claimContent.persona_id,
    claim_content_hash: claimContentHash,
    movement: claimContent.movement,
    caveats: claimContent.caveats,
    customer_facing_output_authorized: false
  });
  const packetContentHash = aggregateClaimHash(
    "FT_AGGREGATE_AUTHORIZED_PACKET_CONTENT_V1",
    packetContent
  );
  const core = AggregateClaimManifestCoreSchema.parse({
    policy_version: AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
    org_id: claimContent.org_id,
    workflow_id: claimContent.workflow_id,
    jbtd_id: claimContent.jbtd_id,
    persona_id: claimContent.persona_id,
    source_graph_seal: input.sourceGraphSeal,
    readiness_id: input.readinessId,
    readiness_hash: input.readinessHash,
    accepted_export_payload_hash: input.acceptedExportPayloadHash,
    accepted_review_hash: input.acceptedReviewHash,
    comparison_privacy_receipt: input.comparisonPrivacyReceipt,
    comparison_projection: input.comparisonProjection,
    policy_state: input.policyState,
    template_id: AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID,
    claim_content_hash: claimContentHash,
    packet_content_hash: packetContentHash
  });
  const manifestHash = aggregateClaimHash(
    "FT_AGGREGATE_CLAIM_AUTHORIZATION_MANIFEST_CORE_V1",
    core
  );
  const manifestId = `manifest_${manifestHash}`;
  const claimId = `aggregate_claim_${manifestHash}_${aggregateClaimHash(
    "FT_AGGREGATE_AUTHORIZED_CLAIM_ID_V1",
    { manifest_hash: manifestHash }
  )}`;
  const packetId = `aggregate_packet_${manifestHash}_${aggregateClaimHash(
    "FT_AGGREGATE_AUTHORIZED_PACKET_ID_V1",
    { manifest_hash: manifestHash }
  )}`;
  return {
    claim: AggregateAuthorizedClaimArtifactSchema.parse({
      schema_version: AGGREGATE_CLAIM_ARTIFACT_SCHEMA_VERSION,
      claim_id: claimId,
      manifest_id: manifestId,
      content_hash: claimContentHash,
      content: claimContent
    }),
    packet: AggregateAuthorizedPacketArtifactSchema.parse({
      schema_version: AGGREGATE_CLAIM_ARTIFACT_SCHEMA_VERSION,
      packet_id: packetId,
      manifest_id: manifestId,
      claim_id: claimId,
      content_hash: packetContentHash,
      content: packetContent
    }),
    manifest: AggregateClaimAuthorizationManifestSchema.parse({
      schema_version: AGGREGATE_CLAIM_MANIFEST_SCHEMA_VERSION,
      manifest_id: manifestId,
      manifest_hash: manifestHash,
      claim_id: claimId,
      packet_id: packetId,
      core
    })
  };
};

export const aggregateManifestIdFromPacketId = (packetId: string): string | null => {
  const match = /^aggregate_packet_([0-9a-f]{64})_([0-9a-f]{64})$/.exec(packetId);
  if (
    !match ||
    match[2] !==
      aggregateClaimHash("FT_AGGREGATE_AUTHORIZED_PACKET_ID_V1", {
        manifest_hash: match[1]
      })
  ) {
    return null;
  }
  return match ? `manifest_${match[1]}` : null;
};

export const aggregateClaimBundleReconciles = (input: {
  claim: unknown;
  packet: unknown;
  manifest: unknown;
}): boolean => {
  const claim = AggregateAuthorizedClaimArtifactSchema.safeParse(input.claim);
  const packet = AggregateAuthorizedPacketArtifactSchema.safeParse(input.packet);
  const manifest = AggregateClaimAuthorizationManifestSchema.safeParse(input.manifest);
  if (!claim.success || !packet.success || !manifest.success) return false;
  try {
    const rebuilt = buildAggregateClaimAuthorizationBundle({
      sourceGraphSeal: manifest.data.core.source_graph_seal,
      readinessId: manifest.data.core.readiness_id,
      readinessHash: manifest.data.core.readiness_hash,
      acceptedExportPayloadHash: manifest.data.core.accepted_export_payload_hash,
      acceptedReviewHash: manifest.data.core.accepted_review_hash,
      comparisonPrivacyReceipt: manifest.data.core.comparison_privacy_receipt,
      comparisonProjection: manifest.data.core.comparison_projection,
      policyState: manifest.data.core.policy_state,
      claimContent: claim.data.content
    });
    return (
      aggregateClaimHash("FT_AGGREGATE_CLAIM_BUNDLE_COMPARE_V1", rebuilt) ===
        aggregateClaimHash("FT_AGGREGATE_CLAIM_BUNDLE_COMPARE_V1", {
          claim: claim.data,
          packet: packet.data,
          manifest: manifest.data
        }) && packet.data.content.claim_content_hash === claim.data.content_hash
    );
  } catch {
    return false;
  }
};

export const aggregateClaimFixedHeldResponse = () =>
  AggregateClaimHeldResponseSchema.parse({
    decision: "HOLD",
    reason_family: AGGREGATE_CLAIM_HELD_REASON,
    persisted: []
  });

export const aggregateClaimPolicyState = (): AggregateClaimPolicyState =>
  AggregateClaimPolicyStateSchema.parse({
    evidence_schema_state: "VALID",
    evidence_review_state: "ACCEPTED",
    evidence_admission_state: "ADMITTED",
    comparison_privacy_state: "ATOMIC_COMPARISON_PRIVACY_RELEASED",
    readiness_state: "INTERNAL_CLAIM_REVIEW_PERMITTED",
    model_eligibility_state: "NOT_REQUESTED",
    model_use_authorized: false,
    claim_authorization_state: "AUTHORIZED",
    customer_facing_output_authorized: false
  });

export const aggregateClaimReadoutText = (movement: AggregateObservedMovement): string => {
  const parsed = AggregateObservedMovementSchema.parse(movement);
  const percent =
    parsed.percent_change === undefined ? "" : ` (${parsed.percent_change}% mechanical change)`;
  return `Observed ${parsed.metric_id} moved from ${parsed.baseline_value} ${parsed.measurement_unit} to ${parsed.comparison_value} ${parsed.measurement_unit}; absolute delta ${parsed.absolute_delta}${percent}. OBSERVED_NON_ATTRIBUTABLE.`;
};

export const aggregateClaimCohortFloor = (
  baselineCohort: number,
  comparisonCohort: number
): number =>
  Math.min(nonNegativeInteger.parse(baselineCohort), nonNegativeInteger.parse(comparisonCohort));
