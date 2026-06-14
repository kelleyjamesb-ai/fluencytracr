import crypto from "crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  DashboardRequestSchema,
  DashboardResponse,
  GroupUpsertSchema,
  MetricObservationSchema,
  OrgCreateSchema,
  PolicyControlObservationSchema,
  ToolClassSchema,
  TrainingEventRollupSchema,
  BehavioralSignalAggregateSchema,
  BehavioralSignalImportSchema,
  ConnectorEventImportSchema,
  FluencyEventIngestSchema,
  FluencyEventSchema,
  FluencyJoinKeySchema,
  OutcomeEvidenceCreateSchema,
  OutcomeEvidenceQuerySchema,
  deriveAivmVerdictFields,
  UnifiedTelemetryEventSchema,
  FluencyScopeSchema,
  FluencyWindowSchema,
  FLUENCY_WINDOW_VALUES,  DecisionLedgerCreateSchema,
  DecisionLedgerEvaluationInputSchema,
  WorkflowRegistryVersionCreateSchema,
  OrientationWorkflowVisibilitySummaryResponse,
  BoardSnapshotResponse,
  WorkflowRegistryVersionsResponse,
  WorkflowRegistryWorkflowsResponse,
  WorkflowRegistryCreateVersionResponse,
  WorkflowRegistryAuditResponse,
  BoardSnapshotVisibilityLabel,
  ObservabilityResponseSchema,
  RoleSchema as AuthRoleSchema
} from "@learnaire/shared";
import type { FluencyEvent, FluencyWindow, UnifiedTelemetryEvent } from "@learnaire/shared";import { authMiddleware, orgScopeMiddleware, rbacMiddleware, enforceAggregation } from "./rbac";
import { registerAiValueRoutes } from "./ai_value_routes";
import { forbiddenFieldsMiddleware } from "./middleware/forbiddenFieldsMiddleware";
import { schemaVersionMiddleware } from "./middleware/schemaVersionMiddleware";
import {
  store,
  upsertControl,
  upsertCanonicalControl,
  insertComplianceEvent,
  upsertEnablement,
  upsertGroup,
  upsertMetric,
  upsertBehavioralSignal,
  EnablementEventRecord,
  MetricRecord,
  insertFluencyEvent,
  buildFluencyEventRecord,
  insertUnifiedTelemetryEvent,  insertDecisionLedgerEntry,
  insertDecisionLedgerEvaluation
} from "./store";
import type {
  CanonicalControlSnapshotRecord,
  DecisionLedgerEvaluationRecord,
  FluencyEventRecord
} from "./store";
import { reconstructTracesForQuery } from "./trace_engine";
import { attachPhase2ToTraces } from "./execution_signals";
import { applyDisclosureToTraces } from "./execution_disclosure";
import { buildObservabilityRollup } from "./observability_aggregate";import { suppressAndRollup as suppressAndRollupBehavioral } from "./behavioral_signals";
import { detectPatterns, getPreviousWeekBucket } from "./behavioral_patterns";
import { EnablementEventType, EnablementEventInput, generateEventId, parseEnablementCsv, parsePayload } from "./enablement";
import { runEnablementRollupsForEvents } from "./enablement_rollups";
import { ToolClass, TOOL_CLASSES, normalizeSeenTimestamp } from "./tool_inventory";
import { ensureToolClass, ensureUsageShape, normalizeUsageTimestamp } from "./usage_shape";
import { runSpreadRollupForOrg } from "./spread_metrics";
import { importRoster } from "./roster";
import { suppressAndRollup } from "./suppression";
import { clearLegacyFluencyIndexArtifacts } from "./fluency_service";
import { enforceScopeWhitelist, hasDisallowedScopes } from "./query_scope";
import { buildTransparencyReport } from "./transparency";
import { ConnectorService } from "./connectors";
import { listAuditLogs, logAuditEvent } from "./audit_log";
import { auditSuppressedObservabilityRows, listSuppressionAuditLogs } from "./suppression_audit_log";
import {
  causalDeltaWindowsOverlap,
  computeCausalDelta,
  MIN_CAUSAL_DELTA_WINDOW_DAYS
} from "./value_realization/causal_delta";
import {
  computeQualityMultiplier,
  computeQualityMultiplierFromForwardedDistribution,
  failClosedQualityMultiplierResponse
} from "./value_realization/quality_multiplier";
import { ForwardedDistributionSchema } from "./value_realization/forwarded_distribution";
import {
  computeVelocityIndex,
  findVelocityPersonField,
  loadVelocityBaseline,
  VelocityDistributionSchema,
  velocityAdjustmentFactor
} from "./value_realization/velocity_index";
import {
  findCalibrationBaseline,
  loadCalibrationBaselines
} from "./value_realization/calibration_registry";
import {
  computeV3AggregateVerdict,
  V3AggregateIngestSchema,
  velocityRecordsFromV3Aggregate
} from "./value_realization/v3_aggregate_ingest";
import { findForbiddenField } from "./validation/forbiddenFields";
import { getPrisma } from "./db";
import {
  isFluencyCanonicalPersistenceEnabled,
  loadFluencyEventRecords,
  persistFluencyEventRecord
} from "./services/fluency-canonical-persistence";
import {
  listOutcomeEvidence,
  persistOutcomeEvidence
} from "./repositories/outcome-evidence.repository";
import {
  isVelocityPersistenceEnabled,
  listVelocityDistributions,
  persistVelocityDistribution
} from "./repositories/velocity-distribution.repository";
import {
  listFluencyTracrVerdicts,
  persistFluencyTracrVerdict,
  VerdictAlreadyExistsError,
  verdictSliceKey
} from "./repositories/fluencytracr-verdict.repository";
import {
  buildCoverageSummary,
  COVERAGE_THRESHOLD,
  filterEventsByScope,
  MIN_COHORT_SIZE,
  WINDOW_DAYS
} from "./fluencytracr";
import { INFERENCE_VERSION, parameterHash } from "./inference/versioning";
import * as path from "path";
import {
  ComplianceModeUpdateSchema,
  PolicyUploadSchema,
  buildCanonicalSnapshots,
  buildComplianceSummary,
  buildDeterministicDecisionId,
  canonicalStatusFromLegacyBoolean,
  extractPolicyClauses,
  mapPolicyToControls,
  normalizeComplianceMode,
  normalizePolicyContent,
  PolicyUpdateSchema,
  sortComplianceEvents,
  UnresolvedClauseDecisionSchema
} from "./policy_compliance";
import {
  deleteCanonicalControlHistoryByOrgId,
  deleteComplianceDecisionsByOrgId,
  deleteComplianceEventsByOrgId,
  deletePolicyDocumentsByOrgId,
  deletePolicyDocumentById,
  deletePolicyMappingsByOrgId,
  deletePolicyMappingsByPolicyId,
  listComplianceEventsByOrg,
  listLatestCanonicalControlsByOrg,
  listPolicyDocumentsByOrg,
  listPolicyMappingsByOrg,
  persistCanonicalControlHistory,
  persistComplianceDecision,
  persistComplianceEvent,
  persistPolicyDocument,
  persistPolicyMapping
} from "./compliance_persistence";
import {
  createControlConfigVersion,
  getBaselineResetAtForRegistryVersion,
  getPolicyConfigForRegistryVersion,
  listBaselineResetsByOrg,
  listRegistryAudit,
  listRegistryEntriesByOrg,
  listRegistryEntriesByWorkflow,
  listRegistryPolicyConfigsByOrg,
  registerWorkflowVersion,
  resetBaseline
} from "./workflow_registry";
import { computeWorkflowVisibility, computeWorkflowVisibilitySummary } from "./workflow_visibility";
import { computeWorkflowVisibility as computeWorkflowVisibilityService } from "./workflow_visibility_service";
import { isAuthTokenIssuerAuthorized, resolveJwtSecret } from "./auth_secret";

const app = express();
// Trust proxy only in known reverse-proxy environments to avoid spoofable
// X-Forwarded-For behavior for direct connections in local/self-hosted setups.
const shouldTrustProxy =
  process.env.TRUST_PROXY === "1" ||
  process.env.VERCEL === "1" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.VERCEL_ENV === "preview";
if (shouldTrustProxy) {
  app.set("trust proxy", 1);
}
app.use(express.json());

const AuthTokenRequestSchema = z
  .object({
    email: z.string().email().optional(),
    sub: z.string().min(1).optional(),
    org_id: z.string().min(1),
    role: AuthRoleSchema,
    ttl_seconds: z.number().int().positive().max(7 * 24 * 60 * 60).optional()
  })
  .strict();

const base64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const signHs256Jwt = (payload: Record<string, unknown>, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedContent).digest();
  return `${signedContent}.${base64Url(signature)}`;
};

app.post("/auth/token", (req, res) => {
  if (!isAuthTokenIssuerAuthorized(req.header("x-auth-token-issuer-secret"))) {
    return res.status(403).json({ error: "Token minting is disabled for this runtime" });
  }

  const parsed = AuthTokenRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid auth token request" });
  }
  const { secret, isFallback } = resolveJwtSecret();
  if (!secret) {
    return res.status(500).json({ error: "Server auth misconfigured" });
  }
  if (isFallback) {
    console.warn("[AUTH] JWT_SECRET missing; using preview/test fallback secret");
  }
  const now = Math.floor(Date.now() / 1000);
  const defaultTtl = Number(process.env.JWT_TTL_SECONDS ?? 8 * 60 * 60);
  const ttlSeconds = Number.isFinite(defaultTtl) && defaultTtl > 0
    ? Math.floor(defaultTtl)
    : 8 * 60 * 60;
  const exp = now + (parsed.data.ttl_seconds ?? ttlSeconds);
  const token = signHs256Jwt(
    {
      sub: parsed.data.sub ?? parsed.data.email ?? "dashboard-user",
      role: parsed.data.role,
      org_id: parsed.data.org_id,
      exp
    },
    secret
  );
  return res.status(201).json({
    token,
    token_type: "Bearer",
    expires_at: new Date(exp * 1000).toISOString(),
    org_id: parsed.data.org_id,
    role: parsed.data.role
  });
});

app.use(authMiddleware);
app.use(orgScopeMiddleware);

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  // Express does not natively parse RFC7239 Forwarded header.
  // We rely on trusted X-Forwarded-For for client identity.
  validate: {
    forwardedHeader: false
  }
});

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  validate: {
    forwardedHeader: false
  },
  handler: (_req, res) => {
    return res.status(429).json({
      error: "Rate limited",
      reason_code: "rate_limited"
    });
  }
});

/** Evidence routes: calendar buckets plus all `FluencyWindow` rolling tokens (aligned with dashboard). */
const EVIDENCE_WINDOWS = new Set<string>(["daily", "weekly", ...FLUENCY_WINDOW_VALUES]);

type EvidenceBundleWindow = FluencyWindow | "daily" | "weekly";const INGEST_RECEIPT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Initialize connector service and load connector mappings
const connectorService = new ConnectorService();
const mappingsPath = path.join(__dirname, "connectors", "mappings");
try {
  connectorService.loadConnectors(mappingsPath);
  console.log(`Loaded ${connectorService.getLoadedConnectors().length} connectors`);
} catch (error) {
  console.warn("Failed to load connector mappings:", error);
}

const TeamSchema = z
  .object({
    name: z.string().min(1),
    parent_team_id: z.string().min(1).optional(),
    function_id: z.string().min(1).optional()  // Links team to a business function
  })
  .strict();

const RoleSchema = z
  .object({
    name: z.string().min(1)
  })
  .strict();

const RosterImportSchema = z
  .object({
    csv: z.string().min(1)
  })
  .strict();

const EnablementEventSchema = z
  .object({
    event_id: z.string().min(1).optional(),
    org_id: z.string().min(1),
    team_id: z.string().min(1),
    role_id: z.string().min(1),
    timestamp: z.string().min(1),
    event_type: z.enum([
      "assessment_pre",
      "assessment_post",
      "session_attended",
      "everboarding_touch"
    ]),
    payload: z.unknown().optional()
  })
  .strict();

const ToolInventorySchema = z
  .object({
    team_id: z.string().min(1),
    tool_class: ToolClassSchema,
    first_seen: z.string().optional(),
    last_seen: z.string().optional()
  })
  .strict();

const UsageShapeSchema = z
  .object({
    team_id: z.string().min(1).optional(),
    role_id: z.string().min(1).optional(),
    tool_class: ToolClassSchema,
    category: z.enum(["rare", "occasional", "regular", "habitual"]),
    recorded_at: z.string().optional()
  })
  .strict()
  .refine((data) => Boolean(data.team_id) !== Boolean(data.role_id), {
    message: "Provide exactly one of team_id or role_id"
  });

const WorkflowRegisterSchema = z.object({
  org_id: z.string().min(1),
  workflow_id: z.string().min(1),
  display_name: z.string().min(1).optional(),
  risk_class: z.enum(["low", "medium", "high"]),
  change_reason: z.string().min(1).optional()
}).strict();

const ControlConfigVersionCreateSchema = z.object({
  org_id: z.string().min(1),
  version_name: z.string().min(1),
  change_reason: z.string().min(1),
  window_days_low: z.number().int().positive(),
  window_days_medium: z.number().int().positive(),
  window_days_high: z.number().int().positive(),
  min_events_low: z.number().int().positive(),
  min_events_medium: z.number().int().positive(),
  min_events_high: z.number().int().positive(),
  require_verification_high: z.boolean()
}).strict();

const BaselineResetSchema = z.object({
  org_id: z.string().min(1),
  control_config_version_id: z.string().min(1),
  reason: z.string().min(1)
}).strict();

const validateRows = <T>(
  rows: unknown[],
  schema: z.ZodType<T>
) => {
  const accepted: T[] = [];
  const rejected: { index: number; error: string }[] = [];
  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (result.success) {
      accepted.push(result.data);
    } else {
      rejected.push({ index, error: result.error?.message ?? "Invalid row" });
    }
  });
  return { accepted, rejected };
};

const filterByQuery = (groupKey: string, groupType: string | undefined, vendor: string | undefined) => {
  return (record: { group_key: string; group_type?: string; vendor?: string }) => {
    if (groupKey !== "all" && record.group_key !== groupKey) {
      return false;
    }
    if (groupType && groupType !== "all" && record.group_type !== groupType) {
      return false;
    }
    if (vendor && vendor !== "all" && record.vendor !== vendor) {
      return false;
    }
    return true;
  };
};

const rangeToWeeks = (range: string) => {
  if (range === "12w") {
    return 12;
  }
  if (range === "6m") {
    return 24;
  }
  return 4;
};

const buildTimeseries = (metricName: string, metrics: typeof store.metrics, limit: number) => {
  const sorted = Array.from(metrics.values())
    .filter((metric) => metric.metric_name === metricName)
    .sort((a, b) => a.bucket_start.localeCompare(b.bucket_start));
  return sorted.slice(-limit).map((metric) => ({
    week_start: metric.bucket_start,
    value: metric.metric_value,
    suppressed: metric.suppressed || metric.metric_value === null
  }));
};

const latestSnapshot = (metricNames: string[], metrics: typeof store.metrics) => {
  const relevant = Array.from(metrics.values()).filter((metric) => metricNames.includes(metric.metric_name));
  if (relevant.length === 0) {
    return { bucket_start: null, values: {} as Record<string, number | null> };
  }
  const latestBucket = relevant.reduce(
    (latest, metric) => (metric.bucket_start > latest ? metric.bucket_start : latest),
    ""
  );
  const values: Record<string, number | null> = {};
  metricNames.forEach((name) => {
    const match = relevant.find((metric) => metric.bucket_start === latestBucket && metric.metric_name === name);
    values[name] = match?.suppressed || match?.metric_value === null ? null : (match?.metric_value ?? null);
  });
  return { bucket_start: latestBucket, values };
};

const latestControls = (controlNames: string[], controls: typeof store.controls) => {
  const relevant = Array.from(controls.values()).filter((control) => controlNames.includes(control.control_name));
  if (relevant.length === 0) {
    return { bucket_start: null, values: {} as Record<string, string | null> };
  }
  const latestBucket = relevant.reduce(
    (latest, control) => (control.bucket_start > latest ? control.bucket_start : latest),
    ""
  );
  const values: Record<string, boolean | null> = {};
  controlNames.forEach((name) => {
    const match = relevant.find((control) => control.bucket_start === latestBucket && control.control_name === name);
    values[name] = match?.control_value ?? null;
  });
  return { bucket_start: latestBucket, values };
};

const matchesWindow = (
  record: { window_start: string; window_end: string },
  window: FluencyWindow
): boolean => {
  const expectedDays = WINDOW_DAYS[window];  const start = new Date(record.window_start);
  const end = new Date(record.window_end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return days === expectedDays;};

const workflowIdFromScopeKey = (scopeKey: string) => {
  return scopeKey.split(":")[0] ?? scopeKey;
};

const patternToExecutiveWorkingStyle = (pattern: string | null) => {
  if (pattern === "CALIBRATED_FLUENCY") {
    return "Balanced AI use" as const;
  }
  if (pattern === "BLIND_EFFICIENCY") {
    return "Fast AI use" as const;
  }
  if (pattern === "RECOVERY_MATURITY") {
    return "Strong recovery behavior" as const;
  }
  if (pattern === "FRICTION_LOOP") {
    return "High back-and-forth" as const;
  }
  if (pattern === "UNDERTRUST_AVOIDANCE") {
    return "AI started but not used" as const;
  }
  return null;
};

const visibilityStateToLabel = (
  visibilityState: "VISIBLE" | "NOT_ENOUGH_DATA_YET" | "NOT_SHOWN_SAFETY"
): BoardSnapshotVisibilityLabel => {
  if (visibilityState === "VISIBLE") {
    return "Clear enough to show";
  }
  if (visibilityState === "NOT_ENOUGH_DATA_YET") {
    return "Not enough data yet";
  }
  return "Not shown (safety)";
};

const addDays = (start: string, days: number) => {
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const nowIso = () => new Date().toISOString();

const toCanonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => toCanonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${toCanonicalJson(val)}`)
    .join(",")}}`;
};

const payloadHash = (value: unknown) => {
  return crypto.createHash("sha256").update(toCanonicalJson(value)).digest("hex");
};

const parseCsvEnvVersions = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const getAcceptedSchemaVersions = () => {
  const configured = parseCsvEnvVersions(process.env.SCHEMA_ACCEPTED_VERSIONS);
  if (configured.length > 0) {
    return configured;
  }
  return ["0.1"];
};

const getAcceptedUnifiedTelemetrySchemaVersions = () => {
  const configured = parseCsvEnvVersions(process.env.UNIFIED_TELEMETRY_SCHEMA_ACCEPTED_VERSIONS);
  if (configured.length > 0) {
    return configured;
  }
  return ["UT_2026_04"];
};
const formatIssuePath = (pathSegments: Array<string | number>): string => {
  if (pathSegments.length === 0) {
    return "/";
  }
  return pathSegments.reduce<string>((acc, segment) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    if (!acc) {
      return segment;
    }
    return `${acc}.${segment}`;
  }, "");
};

const pruneIngestReceipts = () => {
  const cutoff = Date.now() - INGEST_RECEIPT_WINDOW_MS;
  for (const [key, receipt] of store.ingestReceipts.entries()) {
    const createdAtMs = new Date(receipt.createdAt).getTime();
    if (!Number.isFinite(createdAtMs) || createdAtMs < cutoff) {
      store.ingestReceipts.delete(key);
    }
  }
};

const evidenceStatusFromCondition = (
  suppressed: boolean,
  computed: boolean,
  condition: boolean
) => {
  if (suppressed) {
    return "suppressed";
  }
  if (!computed) {
    return "not_computed";
  }
  return condition ? "present" : "not_present";
};

const evidenceWindowDays = (window: EvidenceBundleWindow): number => {  if (window === "daily") {
    return 1;
  }
  if (window === "weekly") {
    return 7;
  }
  return WINDOW_DAYS[window];
};

const buildEvidenceBundle = (
  orgId: string,
  window: EvidenceBundleWindow,
  fluencyEvents?: FluencyEventRecord[]
) => {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - evidenceWindowDays(window));

  const source = fluencyEvents ?? Array.from(store.fluencyEvents.values());
  const scopedEvents = source.filter((event) => {
    const timestamp = new Date(event.timestamp);
    if (Number.isNaN(timestamp.getTime()) || timestamp < start || timestamp > now) {
      return false;
    }
    if (typeof event.org_unit === "string" && event.org_unit.length > 0) {
      return event.org_unit === `org:${orgId}` || event.org_unit.startsWith(`org:${orgId}:`);
    }
    return false;
  });

  const cohortSize = new Set(scopedEvents.map((event) => event.workflow_id)).size;
  const hasComputableEvidence = scopedEvents.length > 0;
  const suppressionApplied = hasComputableEvidence && cohortSize > 0 && cohortSize < MIN_COHORT_SIZE;
  const suppressionReasons = suppressionApplied ? ["insufficient_population"] : [];

  const outputEvents = scopedEvents.filter((event) => event.event_type === "ai_output_disposition");
  const verificationSignals = scopedEvents.filter((event) => event.event_type === "verification_signal");
  const recoveryEvents = scopedEvents.filter((event) => event.event_type === "ai_recovery_loop");
  const abandonmentEvents = scopedEvents.filter(
    (event) =>
      event.event_type === "ai_abandonment" ||
      (event.event_type === "ai_output_disposition" && event.disposition === "abandoned")
  );
  const highRiskEvents = scopedEvents.filter((event) => event.risk_class === "high");

  const instrumentedSources: string[] = [];
  if (outputEvents.length > 0) {
    instrumentedSources.push("ai_output_disposition");
  }
  if (recoveryEvents.length > 0) {
    instrumentedSources.push("ai_recovery_loop");
  }
  if (verificationSignals.length > 0) {
    instrumentedSources.push("verification_signal");
  }
  if (abandonmentEvents.length > 0) {
    instrumentedSources.push("ai_abandonment");
  }
  if (scopedEvents.some((event) => event.event_type === "workflow_stage_transition")) {
    instrumentedSources.push("workflow_stage_transition");
  }

  const allSources = [
    "ai_output_disposition",
    "ai_recovery_loop",
    "verification_signal",
    "ai_abandonment",
    "workflow_stage_transition"
  ];
  const missingSources = allSources.filter((source) => !instrumentedSources.includes(source));

  const verificationPresentCount =
    verificationSignals.length +
    outputEvents.filter((event) => event.verification_present).length;
  const acceptedCount = outputEvents.filter((event) => event.disposition === "accepted").length;
  const acceptanceRate = outputEvents.length === 0 ? 0 : acceptedCount / outputEvents.length;
  const verificationRate =
    outputEvents.length === 0 ? 0 : verificationPresentCount / Math.max(outputEvents.length, 1);
  const abandonmentRate =
    scopedEvents.length === 0 ? 0 : abandonmentEvents.length / Math.max(scopedEvents.length, 1);

  let trendDirection: "improving" | "stable" | "degrading" | "suppressed" | "not_computed" =
    "not_computed";
  if (suppressionApplied) {
    trendDirection = "suppressed";
  } else if (evidenceWindowDays(window) >= 14 && hasComputableEvidence) {    const midpointMs = start.getTime() + (now.getTime() - start.getTime()) / 2;
    const firstHalf = outputEvents.filter((event) => new Date(event.timestamp).getTime() < midpointMs);
    const secondHalf = outputEvents.filter((event) => new Date(event.timestamp).getTime() >= midpointMs);
    const firstAcceptanceRate =
      firstHalf.length === 0
        ? 0
        : firstHalf.filter((event) => event.disposition === "accepted").length / firstHalf.length;
    const secondAcceptanceRate =
      secondHalf.length === 0
        ? 0
        : secondHalf.filter((event) => event.disposition === "accepted").length / secondHalf.length;
    const delta = secondAcceptanceRate - firstAcceptanceRate;
    if (delta > 0.1) {
      trendDirection = "improving";
    } else if (delta < -0.1) {
      trendDirection = "degrading";
    } else {
      trendDirection = "stable";
    }
  }

  return {
    schema_version: "evidence_bundle.v1",
    org_id: orgId,
    window,
    generated_at: nowIso(),
    suppression: {
      k_min: MIN_COHORT_SIZE,
      suppression_applied: suppressionApplied,
      suppression_reasons: suppressionReasons
    },
    coverage: {
      instrumented_sources: instrumentedSources,
      missing_sources: missingSources,
      coverage_notes: hasComputableEvidence
        ? "Coverage derived from metadata-only event streams."
        : "No computable events observed for this org-window."
    },
    exposure: {
      shadow_ai: evidenceStatusFromCondition(
        suppressionApplied,
        hasComputableEvidence,
        highRiskEvents.length > 0
      ),
      unsanctioned_tool_class: evidenceStatusFromCondition(
        suppressionApplied,
        false,
        false
      )
    },
    calibration: {
      verification_presence: evidenceStatusFromCondition(
        suppressionApplied,
        hasComputableEvidence,
        verificationPresentCount > 0
      ),
      recovery_presence: evidenceStatusFromCondition(
        suppressionApplied,
        hasComputableEvidence,
        recoveryEvents.length > 0
      ),
      escalation_to_safe_path_presence: evidenceStatusFromCondition(
        suppressionApplied,
        hasComputableEvidence,
        recoveryEvents.some((event) => event.recovery_type === "escalation")
      )
    },
    fragility: {
      friction_loops_elevated: evidenceStatusFromCondition(
        suppressionApplied,
        hasComputableEvidence,
        recoveryEvents.some((event) => event.cycles >= 3)
      ),
      rapid_abandonment_elevated: evidenceStatusFromCondition(
        suppressionApplied,
        hasComputableEvidence,
        abandonmentRate >= 0.15
      ),
      blind_acceptance_risk_elevated: evidenceStatusFromCondition(
        suppressionApplied,
        hasComputableEvidence,
        acceptanceRate >= 0.7 && verificationRate < 0.2
      )
    },
    learning: {
      trend_direction: trendDirection
    }
  };
};

const failClosedMetrics = {
  total: 0,
  byRoute: new Map<string, number>(),
  byReason: new Map<string, number>(),
  recent: [] as Array<{
    route: string;
    orgId?: string;
    reason: string;
    timestamp: string;
  }>
};

const opsMetrics = {
  startedAt: Date.now(),
  counters: new Map<string, number>()
};

const incrementOpsCounter = (counter: string, amount = 1) => {
  const current = opsMetrics.counters.get(counter) ?? 0;
  opsMetrics.counters.set(counter, current + amount);
};

const getOpsCounter = (counter: string) => {
  return opsMetrics.counters.get(counter) ?? 0;
};

const getAvailabilityTarget = () => {
  const raw = process.env.SLO_COMPLIANCE_STATUS_AVAILABILITY;
  if (!raw || raw.trim().length === 0) {
    return 0.999;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    return 0.999;
  }
  return parsed;
};

const recordFailClosed = (params: { route: string; reason: string; orgId?: string }) => {
  const timestamp = nowIso();
  failClosedMetrics.total += 1;
  const current = failClosedMetrics.byRoute.get(params.route) ?? 0;
  failClosedMetrics.byRoute.set(params.route, current + 1);
  const reasonCount = failClosedMetrics.byReason.get(params.reason) ?? 0;
  failClosedMetrics.byReason.set(params.reason, reasonCount + 1);
  incrementOpsCounter("fail_closed_total");
  failClosedMetrics.recent.unshift({
    route: params.route,
    orgId: params.orgId,
    reason: params.reason,
    timestamp
  });
  if (failClosedMetrics.recent.length > 50) {
    failClosedMetrics.recent.length = 50;
  }
  void persistFailClosedAuditEvent({
    route: params.route,
    reason: params.reason,
    orgId: params.orgId,
    timestamp
  });
};

const REQUIRED_COMPLIANCE_TABLES = [
  "Organization",
  "AuditEvent",
  "PolicyDocument",
  "PolicyMapping",
  "CanonicalControlStateHistory",
  "ComplianceEvent",
  "ComplianceDecision"
] as const;

// AI Value persistence. Surfaced in DB readiness so a deploy that skipped the
// AI Value migrations fails closed at /ops/db/readiness and /health instead of
// only erroring at the first value-chain or evidence persistence write.
const REQUIRED_AI_VALUE_TABLES = [
  "ai_value_objects",
  "value_hypotheses",
  "measurement_plans",
  "source_package_refs",
  "evidence_snapshots"
] as const;

const REQUIRED_PERSISTENCE_TABLES = [
  ...REQUIRED_COMPLIANCE_TABLES,
  ...REQUIRED_AI_VALUE_TABLES
] as const;

type DatabaseReadinessResult =
  | { status: "not_configured" }
  | { status: "ready"; missingTables: []; tableCount: number }
  | { status: "schema_incomplete"; missingTables: string[]; tableCount: number }
  | { status: "unavailable"; error: string };

const getDatabaseReadiness = async (): Promise<DatabaseReadinessResult> => {
  if (!process.env.DATABASE_URL) {
    return { status: "not_configured" };
  }

  try {
    const prisma = getPrisma();
    const rows = (await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )) as Array<{ tablename: string }>;
    const tableNames = new Set(rows.map((row) => row.tablename));
    const missingTables = REQUIRED_PERSISTENCE_TABLES.filter((tableName) => !tableNames.has(tableName));
    if (missingTables.length > 0) {
      return {
        status: "schema_incomplete",
        missingTables: [...missingTables],
        tableCount: tableNames.size
      };
    }
    return {
      status: "ready",
      missingTables: [],
      tableCount: tableNames.size
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: String(error)
    };
  }
};

const respondFailClosed = (
  res: express.Response,
  params: { route: string; reason: string; orgId?: string; details?: string }
) => {
  recordFailClosed({ route: params.route, reason: params.reason, orgId: params.orgId });
  console.error(
    JSON.stringify({
      type: "fail_closed",
      route: params.route,
      org_id: params.orgId ?? null,
      reason: params.reason,
      timestamp: nowIso()
    })
  );
  const payload: Record<string, unknown> = { error: "Service temporarily unavailable" };
  if (process.env.NODE_ENV !== "production" && params.details) {
    payload.details = params.details;
  }
  return res.status(503).json(payload);
};

const getOrgComplianceMode = (orgId: string) => {
  const org = store.orgs.get(orgId);
  return normalizeComplianceMode(org?.complianceMode ?? process.env.COMPLIANCE_MODE);
};

const getLatestPolicyMapping = (orgId: string, policyId: string) => {
  return Array.from(store.policyMappings.values())
    .filter((mapping) => mapping.orgId === orgId && mapping.policyId === policyId)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
};

const hydrateComplianceDomainForOrg = async (orgId: string) => {
  if (!process.env.DATABASE_URL) {
    return;
  }
  const [documents, mappings, controls, events] = await Promise.all([
    listPolicyDocumentsByOrg(orgId),
    listPolicyMappingsByOrg(orgId),
    listLatestCanonicalControlsByOrg(orgId),
    listComplianceEventsByOrg(orgId, {})
  ]);

  documents.forEach((record) => {
    store.policyDocuments.set(record.policyId, record);
  });
  mappings.forEach((record) => {
    store.policyMappings.set(record.mappingId, record);
  });
  controls.forEach((record) => {
    upsertCanonicalControl(record);
  });
  events.forEach((record) => {
    insertComplianceEvent(record);
  });
};

const recordCanonicalControlSnapshot = async (record: CanonicalControlSnapshotRecord) => {
  upsertCanonicalControl(record);
  try {
    await persistCanonicalControlHistory(record);
  } catch (error) {
    console.error("[compliance_persistence] failed to persist canonical control snapshot", {
      org_id: record.orgId,
      control_name: record.control_name,
      error: String(error)
    });
  }
};

const recordComplianceEvent = async (record: Parameters<typeof insertComplianceEvent>[0]) => {
  insertComplianceEvent(record);
  try {
    await persistComplianceEvent(record);
  } catch (error) {
    console.error("[compliance_persistence] failed to persist compliance event", {
      org_id: record.orgId,
      event_id: record.eventId,
      event_type: record.eventType,
      error: String(error)
    });
  }
};

const recomputeCompliancePostureForOrg = (orgId: string, updatedAt: string) => {
  const latestByControl = new Map<string, CanonicalControlSnapshotRecord>();
  Array.from(store.canonicalControlSnapshots.values())
    .filter((record) => record.orgId === orgId && record.control_name !== "compliance_posture_flag")
    .forEach((record) => {
      const existing = latestByControl.get(record.control_name);
      if (!existing || record.updatedAt > existing.updatedAt) {
        latestByControl.set(record.control_name, record);
      }
    });

  const summary = buildComplianceSummary(
    Array.from(latestByControl.values()).map((record) => ({
      control_name: record.control_name,
      status: record.status
    }))
  );

  const posture: CanonicalControlSnapshotRecord = {
    orgId,
    control_name: "compliance_posture_flag",
    status: summary.overall_status,
    source: "policy_mapping",
    bucket_start: updatedAt.slice(0, 10),
    bucket_end: updatedAt.slice(0, 10),
    updatedAt
  };
  void recordCanonicalControlSnapshot(posture);

  return summary;
};

const isOrgAllowedForBeta = (orgId: string) => {
  const raw = process.env.BETA_ORG_ALLOWLIST;
  if (!raw || raw.trim().length === 0) {
    return true;
  }
  const allow = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allow.includes(orgId);
};

const parseEnvAllowlist = (raw: string | undefined) => {
  if (!raw || raw.trim().length === 0) {
    return [];
  }
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const isOrgAllowedForEnforcementPilot = (orgId: string) => {
  const allow = parseEnvAllowlist(process.env.ENFORCEMENT_PILOT_ORG_ALLOWLIST);
  return allow.includes(orgId);
};

const getUnresolvedDecisionThreshold = () => {
  const raw = process.env.ENFORCEMENT_MAX_UNRESOLVED_CLAUSES;
  if (!raw || raw.trim().length === 0) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const countOutstandingUnresolvedClauses = (orgId: string) => {
  const latestByPolicy = new Map<string, { generatedAt: string; unresolved: number }>();
  Array.from(store.policyMappings.values())
    .filter((mapping) => mapping.orgId === orgId)
    .forEach((mapping) => {
      const unresolved = mapping.unresolvedClauses.filter((clause) => !clause.decision).length;
      const existing = latestByPolicy.get(mapping.policyId);
      if (!existing || mapping.generatedAt > existing.generatedAt) {
        latestByPolicy.set(mapping.policyId, { generatedAt: mapping.generatedAt, unresolved });
      }
    });
  return Array.from(latestByPolicy.values()).reduce((sum, entry) => sum + entry.unresolved, 0);
};

const runPolicyMappingForOrg = async (orgId: string, policyId: string, generatedAt = new Date().toISOString()) => {
  const policy = store.policyDocuments.get(policyId);
  if (!policy || policy.orgId !== orgId) {
    return null;
  }

  const clauses = extractPolicyClauses(policy.rawText);
  const mapped = mapPolicyToControls(policy.rawText, clauses);
  const mappingId = `mapping-${crypto.randomUUID()}`;
  const mappingRecord = {
    mappingId,
    policyId: policy.policyId,
    orgId,
    controls: mapped.controls,
    unresolvedClauses: mapped.unresolvedClauses,
    generatedAt
  };
  store.policyMappings.set(mappingId, mappingRecord);
  await persistPolicyMapping(mappingRecord).catch((error) => {
    console.error("[compliance_persistence] failed to persist policy mapping", {
      org_id: orgId,
      mapping_id: mappingId,
      error: String(error)
    });
  });

  const snapshots = buildCanonicalSnapshots(orgId, mapped.controls, generatedAt);
  for (const snapshot of snapshots) {
    await recordCanonicalControlSnapshot(snapshot);
    await recordComplianceEvent({
      eventId: `event-${crypto.randomUUID()}`,
      orgId,
      eventType: "control_state_updated",
      policyId: policy.policyId,
      controlName: snapshot.control_name,
      status: snapshot.status,
      createdAt: generatedAt,
      metadata: {
        source: "policy_mapping"
      }
    });
  }

  const policyMappedEventId = `event-${crypto.randomUUID()}`;
  await recordComplianceEvent({
    eventId: policyMappedEventId,
    orgId,
    eventType: "policy_mapped",
    policyId: policy.policyId,
    createdAt: generatedAt,
    metadata: {
      mapping_id: mappingId,
      controls_mapped: mapped.controls.length,
      unresolved_clauses: mapped.unresolvedClauses.length
    }
  });

  const summary = buildComplianceSummary(
    mapped.controls.map((control) => ({
      control_name: control.control_name,
      status: control.status
    }))
  );
  await recordComplianceEvent({
    eventId: `event-${crypto.randomUUID()}`,
    orgId,
    eventType: "compliance_status_refreshed",
    policyId: policy.policyId,
    createdAt: generatedAt,
    status: summary.overall_status,
    metadata: {
      ...summary.counts,
      source_event_id: policyMappedEventId,
      source_event_type: "policy_mapped",
      recomputed_at: generatedAt
    }
  });

  return {
    mappingId,
    policyId: policy.policyId,
    generatedAt,
    controls: mapped.controls,
    unresolvedClauses: mapped.unresolvedClauses
  };
};

const clearComplianceSandboxForOrg = async (orgId: string) => {
  const policyIds = Array.from(store.policyDocuments.values())
    .filter((policy) => policy.orgId === orgId)
    .map((policy) => policy.policyId);
  const mappingIds = Array.from(store.policyMappings.values())
    .filter((mapping) => mapping.orgId === orgId)
    .map((mapping) => mapping.mappingId);
  const eventIds = Array.from(store.complianceEvents.values())
    .filter((event) => event.orgId === orgId)
    .map((event) => event.eventId);
  const snapshotKeys = Array.from(store.canonicalControlSnapshots.entries())
    .filter(([, snapshot]) => snapshot.orgId === orgId)
    .map(([key]) => key);

  policyIds.forEach((policyId) => {
    store.policyDocuments.delete(policyId);
  });
  mappingIds.forEach((mappingId) => {
    store.policyMappings.delete(mappingId);
  });
  eventIds.forEach((eventId) => {
    store.complianceEvents.delete(eventId);
  });
  snapshotKeys.forEach((snapshotKey) => {
    store.canonicalControlSnapshots.delete(snapshotKey);
  });

  await Promise.all([
    deleteComplianceDecisionsByOrgId(orgId),
    deleteComplianceEventsByOrgId(orgId),
    deleteCanonicalControlHistoryByOrgId(orgId),
    deletePolicyMappingsByOrgId(orgId),
    deletePolicyDocumentsByOrgId(orgId)
  ]);

  return {
    policies: policyIds.length,
    mappings: mappingIds.length,
    events: eventIds.length,
    control_snapshots: snapshotKeys.length
  };
};

const SYNTHETIC_POLICY_PACK: Array<{ fileName: string; contentType: string; content: string }> = [
  {
    fileName: "Synthetic_Governance_Policy_01_Access_Sharing.txt",
    contentType: "text/plain",
    content: [
      "AI is permitted for approved internal workflows.",
      "External sharing disabled outside company systems.",
      "Customer data should not be used for model training."
    ].join(" ")
  },
  {
    fileName: "Synthetic_Governance_Policy_02_Retention_Training.txt",
    contentType: "text/plain",
    content: [
      "Data retention policy is required with a defined retention period.",
      "All teams must opt out of model training by default."
    ].join(" ")
  },
  {
    fileName: "Synthetic_Governance_Policy_03_Mixed_Signals.txt",
    contentType: "text/plain",
    content: [
      "AI enabled for approved business use cases.",
      "External sharing allowed only for approved external audits."
    ].join(" ")
  },
  {
    fileName: "Synthetic_Governance_Policy_04_Unresolved_Example.txt",
    contentType: "text/plain",
    content: [
      "Teams review prompt quality weekly and maintain facilitator notes.",
      "Escalation paths should be documented by policy owners."
    ].join(" ")
  }
];

const parsePersistedOrgConfig = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      minGroupSize: null as number | null,
      complianceMode: null as "shadow" | "enforced" | null,
      orgName: null as string | null
    };
  }
  const payload = metadata as Record<string, unknown>;
  const minGroupSize =
    typeof payload.min_group_size === "number" && Number.isFinite(payload.min_group_size)
      ? Math.max(1, Math.trunc(payload.min_group_size))
      : null;
  const complianceMode =
    payload.compliance_mode === "shadow" || payload.compliance_mode === "enforced"
      ? payload.compliance_mode
      : null;
  const orgName =
    typeof payload.org_name === "string" && payload.org_name.trim().length > 0
      ? payload.org_name.trim()
      : null;
  return { minGroupSize, complianceMode, orgName };
};

type HydrationResult =
  | { status: "found"; org: NonNullable<ReturnType<typeof store.orgs.get>> }
  | { status: "not_found" }
  | { status: "error"; message: string };

const hydrateOrgFromDatabase = async (orgId: string): Promise<HydrationResult> => {
  if (store.orgs.has(orgId)) {
    return { status: "found", org: store.orgs.get(orgId)! };
  }
  try {
    const prisma = getPrisma();
    const orgRecord = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    const latestConfig = await prisma.auditEvent.findFirst({
      where: {
        orgId,
        eventType: "org_config"
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const latestAnyEvent = await prisma.auditEvent.findFirst({
      where: { orgId },
      orderBy: { createdAt: "desc" }
    });
    // Keep legacy orgs/addressability intact even when org_config is missing.
    if (!latestConfig && !orgRecord && !latestAnyEvent) {
      return { status: "not_found" };
    }
    const persistedConfig = parsePersistedOrgConfig(latestConfig?.metadata);
    const hydratedCreatedAt = latestAnyEvent?.createdAt ?? orgRecord?.createdAt ?? new Date();
    const hydrated = {
      id: orgId,
      name: persistedConfig.orgName ?? orgRecord?.name ?? `Org ${orgId.slice(0, 8)}`,
      minGroupSize: persistedConfig.minGroupSize ?? 10,
      createdAt: hydratedCreatedAt.toISOString(),
      complianceMode: normalizeComplianceMode(persistedConfig.complianceMode ?? process.env.COMPLIANCE_MODE)
    };
    store.orgs.set(orgId, hydrated);
    return { status: "found", org: hydrated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hydrate_org] Failed to hydrate org from database", {
      org_id: orgId,
      error: message
    });
    return { status: "error", message };
  }
};

const persistOrgConfigEvent = async (params: {
  orgId: string;
  minGroupSize: number;
  complianceMode: "shadow" | "enforced";
  source: "org_create" | "compliance_mode_update";
  orgName?: string;
  rationale?: string | null;
}) => {
  try {
    const prisma = getPrisma();
    const previous = await prisma.auditEvent.findFirst({
      where: { orgId: params.orgId },
      orderBy: { seq: "desc" }
    });
    const seq = (previous?.seq ?? 0) + 1;
    const prevHash = previous?.hash ?? "GENESIS";
    const hashPayload = JSON.stringify({
      org_id: params.orgId,
      seq,
      event_type: "org_config",
      metadata: {
        min_group_size: params.minGroupSize,
        compliance_mode: params.complianceMode,
        org_name: params.orgName ?? null,
        source: params.source,
        rationale: params.rationale ?? null
      },
      prev_hash: prevHash
    });
    const hash = crypto.createHash("sha256").update(hashPayload).digest("hex");
    await prisma.auditEvent.create({
      data: {
        orgId: params.orgId,
        seq,
        actorSub: "system",
        actorRole: "SYSTEM",
        eventType: "org_config",
        metadata: {
          min_group_size: params.minGroupSize,
          compliance_mode: params.complianceMode,
          org_name: params.orgName ?? null,
          source: params.source,
          rationale: params.rationale ?? null
        },
        prevHash,
        hash
      }
    });
  } catch (error) {
    // Best effort only.
  }
};

const persistFailClosedAuditEvent = async (params: {
  route: string;
  reason: string;
  orgId?: string;
  timestamp: string;
}) => {
  if (!process.env.DATABASE_URL) {
    return;
  }
  try {
    const prisma = getPrisma();
    const eventOrgId = params.orgId ?? "system";
    const previous = await prisma.auditEvent.findFirst({
      where: { orgId: eventOrgId },
      orderBy: { seq: "desc" }
    });
    const seq = (previous?.seq ?? 0) + 1;
    const prevHash = previous?.hash ?? "GENESIS";
    const hashPayload = JSON.stringify({
      org_id: eventOrgId,
      seq,
      event_type: "fail_closed",
      metadata: {
        route: params.route,
        reason: params.reason,
        org_id: params.orgId ?? null,
        timestamp: params.timestamp
      },
      prev_hash: prevHash
    });
    const hash = crypto.createHash("sha256").update(hashPayload).digest("hex");
    await prisma.auditEvent.create({
      data: {
        orgId: eventOrgId,
        seq,
        actorSub: "system",
        actorRole: "SYSTEM",
        eventType: "fail_closed",
        metadata: {
          route: params.route,
          reason: params.reason,
          org_id: params.orgId ?? null,
          timestamp: params.timestamp
        },
        prevHash,
        hash,
        createdAt: new Date(params.timestamp)
      }
    });
  } catch (error) {
    // Best effort only.
    console.error("[fail_closed] Failed to persist audit event", {
      route: params.route,
      reason: params.reason,
      org_id: params.orgId ?? null,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const persistOrganizationRecord = async (params: { orgId: string; name: string; createdAt: string }) => {
  try {
    const prisma = getPrisma();
    await prisma.organization.upsert({
      where: { id: params.orgId },
      update: { name: params.name },
      create: {
        id: params.orgId,
        name: params.name,
        createdAt: new Date(params.createdAt)
      }
    });
    console.log("[org_create] Persisted organization record", { org_id: params.orgId });
    return true;
  } catch (error) {
    console.error("[org_create] Failed to persist organization record", {
      org_id: params.orgId,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
};

const enforceScopeQuery = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    enforceScopeWhitelist(typeof req.query.scope === "string" ? req.query.scope : undefined);
    if (hasDisallowedScopes(req.query)) {
      return res.status(400).json({ error: "Disallowed scope requested" });
    }
    return next();
  } catch (error) {
    return res.status(400).json({ error: "Invalid scope requested" });
  }
};

const parseOrgCreatePayload = (body: unknown) => {
  const raw = (body ?? {}) as Record<string, unknown>;
  const candidateOrgId =
    typeof raw.orgId === "string"
      ? raw.orgId
      : typeof raw.org_id === "string"
        ? raw.org_id
        : undefined;
  const candidateMinGroupSize =
    typeof raw.minGroupSize === "number"
      ? raw.minGroupSize
      : typeof raw.min_group_size === "number"
        ? raw.min_group_size
        : undefined;
  const base = {
    name: raw.name,
    ...(candidateMinGroupSize !== undefined ? { minGroupSize: candidateMinGroupSize } : {})
  };
  const parsedBase = OrgCreateSchema.safeParse(base);
  if (!parsedBase.success) {
    return parsedBase;
  }
  const OrgCreateWithOptionalIdSchema = OrgCreateSchema.extend({
    orgId: z
      .string()
      .regex(/^[a-zA-Z0-9._-]+$/)
      .optional()
  });
  return OrgCreateWithOptionalIdSchema.safeParse({
    ...parsedBase.data,
    ...(candidateOrgId ? { orgId: candidateOrgId.trim() } : {})
  });
};

app.post("/orgs", strictLimiter, async (req, res) => {
  const parsed = parseOrgCreatePayload(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid org payload" });
  }
  const id = parsed.data.orgId && parsed.data.orgId.length > 0
    ? parsed.data.orgId
    : `org-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const persistedDurably = await persistOrganizationRecord({
    orgId: id,
    name: parsed.data.name,
    createdAt
  });
  const mustPersistDurably =
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.REQUIRE_DURABLE_ORG_CREATE === "1";
  if (mustPersistDurably && !persistedDurably) {
    return res.status(500).json({ error: "Internal server error" });
  }
  store.orgs.set(id, {
    id,
    name: parsed.data.name,
    minGroupSize: parsed.data.minGroupSize ?? 10,
    createdAt,
    complianceMode: "shadow"
  });
  const defaultRoles = ["Admin", "Exec Viewer", "Enablement Lead"];
  defaultRoles.forEach((roleName) => {
    const roleId = `role-${crypto.randomUUID()}`;
    store.roles.set(roleId, { id: roleId, orgId: id, name: roleName });
  });
  persistOrgConfigEvent({
    orgId: id,
    minGroupSize: parsed.data.minGroupSize ?? 10,
    complianceMode: "shadow",
    source: "org_create",
    orgName: parsed.data.name
  });
  return res.status(201).json({
    org_id: id,
    name: parsed.data.name,
    created_at: createdAt,
    min_group_size: parsed.data.minGroupSize ?? 10
  });
});

app.use("/orgs/:orgId", async (req, res, next) => {
  if (!store.orgs.has(req.params.orgId)) {
    const result = await hydrateOrgFromDatabase(req.params.orgId);
    if (result.status === "error") {
      const isDurableEnv =
        process.env.VERCEL === "1" ||
        process.env.VERCEL_ENV === "production" ||
        process.env.VERCEL_ENV === "preview" ||
        process.env.REQUIRE_DURABLE_ORG_CREATE === "1";
      if (isDurableEnv) {
        console.error("[hydrate_middleware] Returning 503 due to DB hydration failure", {
          org_id: req.params.orgId,
          error: result.message
        });
        return respondFailClosed(res, {
          route: "/orgs/:orgId/*",
          orgId: req.params.orgId,
          reason: "hydrate_org_failed",
          details: result.message
        });
      }
    }
  }
  return next();
});

app.get("/orgs/:orgId/teams", (req, res) => {
  const teams = Array.from(store.teams.values()).filter((team) => team.orgId === req.params.orgId);
  return res.json({ teams });
});

app.post("/orgs/:orgId/teams", rbacMiddleware(["ADMIN"]), (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  const parsed = TeamSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid team payload" });
  }
  const teamId = `team-${crypto.randomUUID()}`;
  const record = {
    id: teamId,
    orgId: org.id,
    name: parsed.data.name,
    parentTeamId: parsed.data.parent_team_id,
    functionId: parsed.data.function_id
  };
  store.teams.set(teamId, record);
  return res.status(201).json(record);
});

app.patch("/orgs/:orgId/teams/:teamId", rbacMiddleware(["ADMIN"]), (req, res) => {
  const team = store.teams.get(req.params.teamId);
  if (!team || team.orgId !== req.params.orgId) {
    return res.status(404).json({ error: "Team not found" });
  }
  const parsed = TeamSchema.partial().safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid team payload" });
  }
  const updated = {
    ...team,
    name: parsed.data.name ?? team.name,
    parentTeamId: parsed.data.parent_team_id ?? team.parentTeamId,
    functionId: parsed.data.function_id ?? team.functionId
  };
  store.teams.set(team.id, updated);
  return res.json(updated);
});

app.delete("/orgs/:orgId/teams/:teamId", rbacMiddleware(["ADMIN"]), (req, res) => {
  const team = store.teams.get(req.params.teamId);
  if (!team || team.orgId !== req.params.orgId) {
    return res.status(404).json({ error: "Team not found" });
  }
  store.teams.delete(team.id);
  store.employees.forEach((record) => {
    record.teamIds.delete(team.id);
  });
  return res.status(204).send();
});

app.get("/orgs/:orgId/roles", (req, res) => {
  const roles = Array.from(store.roles.values()).filter((role) => role.orgId === req.params.orgId);
  return res.json({ roles });
});

app.post("/orgs/:orgId/roles", rbacMiddleware(["ADMIN"]), (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  const parsed = RoleSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid role payload" });
  }
  const roleId = `role-${crypto.randomUUID()}`;
  const record = { id: roleId, orgId: org.id, name: parsed.data.name };
  store.roles.set(roleId, record);
  return res.status(201).json(record);
});

app.patch("/orgs/:orgId/roles/:roleId", rbacMiddleware(["ADMIN"]), (req, res) => {
  const role = store.roles.get(req.params.roleId);
  if (!role || role.orgId !== req.params.orgId) {
    return res.status(404).json({ error: "Role not found" });
  }
  const parsed = RoleSchema.partial().safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid role payload" });
  }
  const updated = { ...role, name: parsed.data.name ?? role.name };
  store.roles.set(role.id, updated);
  return res.json(updated);
});

app.delete("/orgs/:orgId/roles/:roleId", rbacMiddleware(["ADMIN"]), (req, res) => {
  const role = store.roles.get(req.params.roleId);
  if (!role || role.orgId !== req.params.orgId) {
    return res.status(404).json({ error: "Role not found" });
  }
  store.roles.delete(role.id);
  store.employees.forEach((record) => {
    record.roleIds.delete(role.id);
  });
  return res.status(204).send();
});

app.post(
  "/orgs/:orgId/roster/import",
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const parsed = RosterImportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid roster payload" });
    }
    try {
      const result = importRoster(org.id, parsed.data.csv);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: "Invalid roster CSV" });
    }
  }
);

app.post(
  "/enablement/import",
  express.text({ type: "text/csv" }),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (req, res) => {
    const errors: { index: number; error: string }[] = [];
    let rows: EnablementEventInput[] = [];
    if (typeof req.body === "string") {
      try {
        rows = parseEnablementCsv(req.body).map((row) => row as EnablementEventInput);
      } catch (error) {
        return res.status(400).json({ error: "Invalid CSV payload" });
      }
    } else if (Array.isArray(req.body)) {
      rows = req.body as EnablementEventInput[];
    } else if (req.body?.events && Array.isArray(req.body.events)) {
      rows = req.body.events as EnablementEventInput[];
    } else {
      return res.status(400).json({ error: "Unsupported enablement payload" });
    }

    const forbiddenMatch = findForbiddenField(rows);
    if (forbiddenMatch) {
      return res.status(400).json({
        error: "Forbidden field",
        field_path: forbiddenMatch.path,
        rule: "no_raw_content_or_direct_identifiers"
      });
    }

    if (req.authOrgId) {
      const mismatchedIndex = rows.findIndex((row) => {
        const parsed = EnablementEventSchema.safeParse(row);
        return parsed.success && parsed.data.org_id !== req.authOrgId;
      });
      if (mismatchedIndex >= 0) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Token org scope does not match request org",
          index: mismatchedIndex + 1
        });
      }
    }

    const stored: EnablementEventRecord[] = [];

    rows.forEach((row, index) => {
      const parsed = EnablementEventSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({ index: index + 1, error: parsed.error.message });
        return;
      }
      const org = store.orgs.get(parsed.data.org_id);
      if (!org) {
        errors.push({ index: index + 1, error: "Unknown org_id" });
        return;
      }
      const team = store.teams.get(parsed.data.team_id);
      if (!team || team.orgId !== org.id) {
        errors.push({ index: index + 1, error: "Unknown team_id" });
        return;
      }
      const role = store.roles.get(parsed.data.role_id);
      if (!role || role.orgId !== org.id) {
        errors.push({ index: index + 1, error: "Unknown role_id" });
        return;
      }
      const timestamp = new Date(parsed.data.timestamp);
      if (Number.isNaN(timestamp.getTime())) {
        errors.push({ index: index + 1, error: "Invalid timestamp" });
        return;
      }
      let payload: Record<string, unknown>;
      try {
        payload = parsePayload(parsed.data.payload);
      } catch (error) {
        errors.push({ index: index + 1, error: "Invalid payload" });
        return;
      }
      const eventId = parsed.data.event_id ?? generateEventId();
      if (store.enablementEvents.has(eventId)) {
        errors.push({ index: index + 1, error: "Duplicate event_id" });
        return;
      }
      const record = {
        eventId,
        orgId: org.id,
        teamId: team.id,
        roleId: role.id,
        timestamp: timestamp.toISOString(),
        eventType: parsed.data.event_type as EnablementEventType,
        payload
      };
      store.enablementEvents.set(eventId, record);
      stored.push(record);
    });

    if (stored.length > 0) {
      const byOrg = stored.reduce<Record<string, EnablementEventRecord[]>>((acc, event) => {
        acc[event.orgId] = acc[event.orgId] ?? [];
        acc[event.orgId].push(event);
        return acc;
      }, {});
      Object.entries(byOrg).forEach(([orgId, events]) => {
        runEnablementRollupsForEvents(orgId, events);
      });
    }

    return res.json({ imported: stored.length, rejected: errors.length, errors });
  }
);

app.post(
  "/orgs/:orgId/tools",
  rbacMiddleware(["ADMIN"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const parsed = ToolInventorySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid tool inventory payload" });
    }
    const team = store.teams.get(parsed.data.team_id);
    if (!team || team.orgId !== org.id) {
      return res.status(404).json({ error: "Team not found" });
    }
    let firstSeen: string;
    let lastSeen: string;
    try {
      firstSeen = normalizeSeenTimestamp(parsed.data.first_seen);
      lastSeen = normalizeSeenTimestamp(parsed.data.last_seen ?? parsed.data.first_seen);
    } catch (error) {
      return res.status(400).json({ error: "Invalid timestamp" });
    }
    const toolClass = parsed.data.tool_class as ToolClass;
    const key = `${org.id}:${team.id}:${toolClass}`;
    const existing = store.toolInventory.get(key);
    const record = {
      orgId: org.id,
      teamId: team.id,
      toolClass,
      firstSeen: existing ? existing.firstSeen : firstSeen,
      lastSeen: lastSeen
    };
    store.toolInventory.set(key, record);
    runSpreadRollupForOrg(org.id, record.lastSeen);
    return res.status(201).json(record);
  }
);

app.post(
  "/orgs/:orgId/usage-shape",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const parsed = UsageShapeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid usage shape payload" });
    }
    let teamId: string | undefined;
    let roleId: string | undefined;
    if (parsed.data.team_id) {
      const team = store.teams.get(parsed.data.team_id);
      if (!team || team.orgId !== org.id) {
        return res.status(404).json({ error: "Team not found" });
      }
      teamId = team.id;
    }
    if (parsed.data.role_id) {
      const role = store.roles.get(parsed.data.role_id);
      if (!role || role.orgId !== org.id) {
        return res.status(404).json({ error: "Role not found" });
      }
      roleId = role.id;
    }
    try {
      ensureToolClass(parsed.data.tool_class);
      ensureUsageShape(parsed.data.category);
    } catch (error) {
      return res.status(400).json({ error: "Unsupported category" });
    }
    let recordedAt: string;
    try {
      recordedAt = normalizeUsageTimestamp(parsed.data.recorded_at);
    } catch (error) {
      return res.status(400).json({ error: "Invalid timestamp" });
    }
    const scopeId = teamId ?? roleId ?? "unknown";
    const key = `${org.id}:${scopeId}:${parsed.data.tool_class}:${recordedAt}`;
    const record = {
      orgId: org.id,
      teamId,
      roleId,
      toolClass: parsed.data.tool_class,
      category: parsed.data.category,
      recordedAt
    };
    store.usageShapes.set(key, record);
    return res.status(201).json(record);
  }
);

app.post("/orgs/:orgId/groups", rbacMiddleware(["ADMIN"]), schemaVersionMiddleware, forbiddenFieldsMiddleware, (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  const rows = Array.isArray(req.body?.groups) ? req.body.groups : [];
  const { accepted, rejected } = validateRows(rows, GroupUpsertSchema);
  let inserted = 0;
  let updated = 0;
  accepted.forEach((group) => {
    const result = upsertGroup(org.id, group);
    if (result.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  });
  return res.json({ inserted, updated, rejected });
});

app.post("/orgs/:orgId/metrics/import", strictLimiter, schemaVersionMiddleware, forbiddenFieldsMiddleware, (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  const rows = Array.isArray(req.body?.observations) ? req.body.observations : [];
  const { accepted, rejected } = validateRows(rows, MetricObservationSchema);
  const suppressed = suppressAndRollup(
    accepted.map((row) => ({
      groupKey: row.group_key,
      groupType: row.group_type,
      vendor: row.vendor,
      bucketStart: row.bucket_start,
      bucketEnd: row.bucket_end,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      isUserCount: row.is_user_count ?? false,
      suppressed: false
    })),
    org.minGroupSize
  );

  let inserted = 0;
  let updated = 0;
  suppressed.forEach((metric) => {
    const record: MetricRecord = {
      orgId: org.id,
      group_key: metric.groupKey,
      group_type: (metric.groupType ?? "org") as "org" | "team" | "role",
      vendor: metric.vendor,
      bucket_start: metric.bucketStart,
      bucket_end: metric.bucketEnd,
      metric_name: metric.metricName,
      metric_value: metric.metricValue,
      is_user_count: metric.isUserCount,
      suppressed: metric.suppressed
    };
    const result = upsertMetric(record);
    if (result.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  });

  clearLegacyFluencyIndexArtifacts(org.id);
  return res.json({ inserted, updated, rejected });
});

app.post("/orgs/:orgId/controls/import", schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/controls/import",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }
  const rows = Array.isArray(req.body?.observations) ? req.body.observations : [];
  const { accepted, rejected } = validateRows(rows, PolicyControlObservationSchema);
  let inserted = 0;
  let updated = 0;
  for (const row of accepted) {
    const result = upsertControl({ ...row, orgId: org.id });
    const now = new Date().toISOString();
    await recordCanonicalControlSnapshot({
      orgId: org.id,
      control_name: row.control_name,
      status: canonicalStatusFromLegacyBoolean(row.control_value),
      source: "legacy_import",
      bucket_start: row.bucket_start,
      bucket_end: row.bucket_end,
      updatedAt: now
    });
    await recordComplianceEvent({
      eventId: `event-${crypto.randomUUID()}`,
      orgId: org.id,
      eventType: "control_state_updated",
      controlName: row.control_name,
      status: canonicalStatusFromLegacyBoolean(row.control_value),
      createdAt: now,
      metadata: {
        source: "legacy_import"
      }
    });
    if (result.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }
  return res.json({ inserted, updated, rejected });
});

app.post("/orgs/:orgId/policies/upload", schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }

  const parsed = PolicyUploadSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid policy payload", details: parsed.error.message });
  }

  const normalized = normalizePolicyContent(parsed.data);
  const clauses = extractPolicyClauses(normalized.rawText);
  const policyId = `policy-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  const policyRecord = {
    policyId,
    orgId: org.id,
    fileName: parsed.data.file_name,
    contentType: normalized.contentType,
    rawText: normalized.rawText,
    sourceFormat: normalized.sourceFormat,
    clauseCount: clauses.length,
    createdAt
  } as const;
  store.policyDocuments.set(policyId, policyRecord);
  await persistPolicyDocument(policyRecord).catch((error) => {
    console.error("[compliance_persistence] failed to persist policy document", {
      org_id: org.id,
      policy_id: policyId,
      error: String(error)
    });
  });

  await recordComplianceEvent({
    eventId: `event-${crypto.randomUUID()}`,
    orgId: org.id,
    eventType: "policy_uploaded",
    policyId,
    createdAt,
    metadata: {
      file_name: parsed.data.file_name,
      content_type: normalized.contentType,
      clause_count: clauses.length
    }
  });

  return res.status(201).json({
    policy_id: policyId,
    parse_status: "normalized",
    clause_count: clauses.length,
    source_format: normalized.sourceFormat
  });
});

app.get("/orgs/:orgId/policies", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/policies",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const policies = Array.from(store.policyDocuments.values())
    .filter((policy) => policy.orgId === org.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((policy) => {
      const latestMapping = getLatestPolicyMapping(org.id, policy.policyId);
      return {
        policy_id: policy.policyId,
        file_name: policy.fileName,
        content_type: policy.contentType,
        source_format: policy.sourceFormat,
        clause_count: policy.clauseCount,
        created_at: policy.createdAt,
        latest_mapping: latestMapping
          ? {
            mapping_id: latestMapping.mappingId,
            generated_at: latestMapping.generatedAt,
            controls_mapped: latestMapping.controls.length,
            unresolved_clauses: latestMapping.unresolvedClauses.filter((clause) => !clause.decision).length
          }
          : null
      };
    });

  return res.json({
    org_id: org.id,
    mode: getOrgComplianceMode(org.id),
    policies
  });
});

app.patch("/orgs/:orgId/policies/:policyId", rbacMiddleware(["ADMIN"]), schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/policies/:policyId",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const policy = store.policyDocuments.get(req.params.policyId);
  if (!policy || policy.orgId !== org.id) {
    return res.status(404).json({ error: "Policy not found" });
  }

  const parsed = PolicyUpdateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid policy update payload", details: parsed.error.message });
  }

  const hasContentUpdate = Boolean(parsed.data.content || parsed.data.content_base64);
  const normalized = hasContentUpdate
    ? normalizePolicyContent({
      file_name: parsed.data.file_name ?? policy.fileName,
      content_type: parsed.data.content_type ?? policy.contentType,
      content: parsed.data.content,
      content_base64: parsed.data.content_base64
    })
    : {
      rawText: policy.rawText,
      sourceFormat: policy.sourceFormat,
      contentType: parsed.data.content_type ?? policy.contentType
    };

  const clauses = extractPolicyClauses(normalized.rawText);
  const updatedAt = new Date().toISOString();
  const updatedPolicy = {
    ...policy,
    fileName: parsed.data.file_name ?? policy.fileName,
    contentType: normalized.contentType,
    rawText: normalized.rawText,
    sourceFormat: normalized.sourceFormat,
    clauseCount: clauses.length
  };
  store.policyDocuments.set(policy.policyId, updatedPolicy);

  if (hasContentUpdate) {
    Array.from(store.policyMappings.entries())
      .filter(([, mapping]) => mapping.policyId === policy.policyId && mapping.orgId === org.id)
      .forEach(([mappingId]) => {
        store.policyMappings.delete(mappingId);
      });
    await deletePolicyMappingsByPolicyId(policy.policyId).catch((error) => {
      console.error("[compliance_persistence] failed to delete policy mappings on policy update", {
        org_id: org.id,
        policy_id: policy.policyId,
        error: String(error)
      });
    });
  }

  await persistPolicyDocument(updatedPolicy).catch((error) => {
    console.error("[compliance_persistence] failed to persist updated policy document", {
      org_id: org.id,
      policy_id: policy.policyId,
      error: String(error)
    });
  });

  await recordComplianceEvent({
    eventId: `event-${crypto.randomUUID()}`,
    orgId: org.id,
    eventType: "policy_uploaded",
    policyId: policy.policyId,
    createdAt: updatedAt,
    metadata: {
      action: "policy_updated",
      file_name: updatedPolicy.fileName,
      content_type: updatedPolicy.contentType,
      clause_count: updatedPolicy.clauseCount,
      mapping_invalidated: hasContentUpdate
    }
  });

  return res.json({
    policy_id: policy.policyId,
    updated_at: updatedAt,
    mapping_invalidated: hasContentUpdate,
    clause_count: updatedPolicy.clauseCount
  });
});

app.delete("/orgs/:orgId/policies/:policyId", rbacMiddleware(["ADMIN"]), schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/policies/:policyId",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const policy = store.policyDocuments.get(req.params.policyId);
  if (!policy || policy.orgId !== org.id) {
    return res.status(404).json({ error: "Policy not found" });
  }

  const removedMappings = Array.from(store.policyMappings.entries())
    .filter(([, mapping]) => mapping.policyId === policy.policyId && mapping.orgId === org.id);
  removedMappings.forEach(([mappingId]) => {
    store.policyMappings.delete(mappingId);
  });
  store.policyDocuments.delete(policy.policyId);

  await deletePolicyDocumentById(policy.policyId).catch((error) => {
    console.error("[compliance_persistence] failed to delete policy document", {
      org_id: org.id,
      policy_id: policy.policyId,
      error: String(error)
    });
  });

  await recordComplianceEvent({
    eventId: `event-${crypto.randomUUID()}`,
    orgId: org.id,
    eventType: "policy_uploaded",
    policyId: policy.policyId,
    createdAt: new Date().toISOString(),
    metadata: {
      action: "policy_deleted",
      file_name: policy.fileName,
      removed_mappings: removedMappings.length
    }
  });

  return res.json({
    policy_id: policy.policyId,
    deleted: true,
    removed_mappings: removedMappings.length
  });
});

app.post("/orgs/:orgId/sandbox/reset", rbacMiddleware(["ADMIN"]), schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/sandbox/reset",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  try {
    const cleared = await clearComplianceSandboxForOrg(org.id);
    return res.json({
      org_id: org.id,
      reset_at: new Date().toISOString(),
      cleared
    });
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/sandbox/reset",
      orgId: org.id,
      reason: "sandbox_reset_failed",
      details: String(error)
    });
  }
});

app.post("/orgs/:orgId/sandbox/seed-synthetic", rbacMiddleware(["ADMIN"]), schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/sandbox/seed-synthetic",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const createdAt = new Date().toISOString();
  const seeded: Array<{ policy_id: string; mapping_id: string; unresolved_clauses: number }> = [];
  for (const spec of SYNTHETIC_POLICY_PACK) {
    const normalized = normalizePolicyContent({
      file_name: spec.fileName,
      content_type: spec.contentType,
      content: spec.content
    });
    const policyId = `policy-${crypto.randomUUID()}`;
    const clauses = extractPolicyClauses(normalized.rawText);
    const policyRecord = {
      policyId,
      orgId: org.id,
      fileName: spec.fileName,
      contentType: normalized.contentType,
      rawText: normalized.rawText,
      sourceFormat: normalized.sourceFormat,
      clauseCount: clauses.length,
      createdAt
    } as const;
    store.policyDocuments.set(policyId, policyRecord);
    await persistPolicyDocument(policyRecord).catch((error) => {
      console.error("[compliance_persistence] failed to persist seeded policy document", {
        org_id: org.id,
        policy_id: policyId,
        error: String(error)
      });
    });
    await recordComplianceEvent({
      eventId: `event-${crypto.randomUUID()}`,
      orgId: org.id,
      eventType: "policy_uploaded",
      policyId,
      createdAt,
      metadata: {
        action: "synthetic_seed",
        file_name: spec.fileName,
        content_type: normalized.contentType,
        clause_count: clauses.length
      }
    });
    const mapped = await runPolicyMappingForOrg(org.id, policyId, createdAt);
    if (mapped) {
      seeded.push({
        policy_id: mapped.policyId,
        mapping_id: mapped.mappingId,
        unresolved_clauses: mapped.unresolvedClauses.length
      });
    }
  }

  return res.status(201).json({
    org_id: org.id,
    seeded_at: createdAt,
    synthetic_pack_size: SYNTHETIC_POLICY_PACK.length,
    created_policies: seeded.length,
    seeded
  });
});

app.post("/orgs/:orgId/policies/:policyId/map", schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/policies/:policyId/map",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const policy = store.policyDocuments.get(req.params.policyId);
  if (!policy || policy.orgId !== org.id) {
    return res.status(404).json({ error: "Policy not found" });
  }

  const mapped = await runPolicyMappingForOrg(org.id, policy.policyId);
  if (!mapped) {
    return res.status(404).json({ error: "Policy not found" });
  }

  return res.json({
    mapping_id: mapped.mappingId,
    policy_id: mapped.policyId,
    generated_at: mapped.generatedAt,
    controls: mapped.controls,
    unresolved_clauses: mapped.unresolvedClauses
  });
});

app.get("/orgs/:orgId/policies/:policyId/mapping", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/policies/:policyId/mapping",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const policy = store.policyDocuments.get(req.params.policyId);
  if (!policy || policy.orgId !== org.id) {
    return res.status(404).json({ error: "Policy not found" });
  }

  const latestMapping = getLatestPolicyMapping(org.id, policy.policyId);
  if (!latestMapping) {
    return res.status(404).json({ error: "Mapping not found" });
  }

  return res.json({
    org_id: org.id,
    policy_id: policy.policyId,
    mapping_id: latestMapping.mappingId,
    generated_at: latestMapping.generatedAt,
    controls: latestMapping.controls,
    unresolved_clauses: latestMapping.unresolvedClauses
  });
});

app.patch(
  "/orgs/:orgId/compliance/mode",
  rbacMiddleware(["ADMIN"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    if (!isOrgAllowedForBeta(org.id)) {
      return res.status(403).json({ error: "Org not enabled for internal beta" });
    }
    try {
      await hydrateComplianceDomainForOrg(org.id);
    } catch (error) {
      return respondFailClosed(res, {
        route: "/orgs/:orgId/compliance/mode",
        orgId: org.id,
        reason: "hydrate_compliance_domain_failed",
        details: String(error)
      });
    }

    const parsed = ComplianceModeUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid compliance mode payload", details: parsed.error.message });
    }

    const unresolvedThreshold = getUnresolvedDecisionThreshold();
    const outstandingUnresolved = countOutstandingUnresolvedClauses(org.id);
    if (parsed.data.mode === "enforced") {
      if (!isOrgAllowedForEnforcementPilot(org.id)) {
        return res.status(403).json({
          error: "Org not eligible for enforcement pilot",
          details: "Org is not listed in ENFORCEMENT_PILOT_ORG_ALLOWLIST."
        });
      }
      if (outstandingUnresolved > unresolvedThreshold) {
        return res.status(409).json({
          error: "Unresolved policy clauses exceed enforcement threshold",
          details: `Outstanding unresolved clauses (${outstandingUnresolved}) exceed threshold (${unresolvedThreshold}).`
        });
      }
    }

    const previousMode = getOrgComplianceMode(org.id);
    const isRollbackTransition = previousMode === "enforced" && parsed.data.mode === "shadow";
    org.complianceMode = parsed.data.mode;
    const now = new Date().toISOString();
    const complianceModeEventId = `event-${crypto.randomUUID()}`;
    await recordComplianceEvent({
      eventId: complianceModeEventId,
      orgId: org.id,
      eventType: "compliance_mode_updated",
      createdAt: now,
      metadata: {
        previous_mode: previousMode,
        next_mode: parsed.data.mode,
        mode_transition: `${previousMode}->${parsed.data.mode}`,
        rollback: isRollbackTransition,
        rationale: parsed.data.rationale ?? null,
        enforcement_guardrail: {
          pilot_eligible: isOrgAllowedForEnforcementPilot(org.id),
          unresolved_threshold: unresolvedThreshold,
          unresolved_outstanding: outstandingUnresolved
        }
      }
    });
    persistOrgConfigEvent({
      orgId: org.id,
      minGroupSize: org.minGroupSize,
      complianceMode: parsed.data.mode,
      source: "compliance_mode_update",
      orgName: org.name,
      rationale: parsed.data.rationale ?? null
    });

    return res.json({
      org_id: org.id,
      mode: org.complianceMode,
      rollback: isRollbackTransition,
      updated_at: now,
      source_event_id: complianceModeEventId
    });
  }
);

app.patch(
  "/orgs/:orgId/policies/:policyId/mapping/unresolved/:clauseId",
  rbacMiddleware(["ADMIN"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    if (!isOrgAllowedForBeta(org.id)) {
      return res.status(403).json({ error: "Org not enabled for internal beta" });
    }
    try {
      await hydrateComplianceDomainForOrg(org.id);
    } catch (error) {
      return respondFailClosed(res, {
        route: "/orgs/:orgId/policies/:policyId/mapping/unresolved/:clauseId",
        orgId: org.id,
        reason: "hydrate_compliance_domain_failed",
        details: String(error)
      });
    }

    const policy = store.policyDocuments.get(req.params.policyId);
    if (!policy || policy.orgId !== org.id) {
      return res.status(404).json({ error: "Policy not found" });
    }

    const parsed = UnresolvedClauseDecisionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid unresolved clause decision payload", details: parsed.error.message });
    }

    const latestMapping = getLatestPolicyMapping(org.id, policy.policyId);
    if (!latestMapping) {
      return res.status(404).json({ error: "Mapping not found" });
    }

    const clause = latestMapping.unresolvedClauses.find((entry) => entry.clause_id === req.params.clauseId);
    if (!clause) {
      return res.status(404).json({ error: "Unresolved clause not found" });
    }

    const now = new Date().toISOString();
    const previousDecision = {
      action: clause.decision,
      rationale: clause.decision_rationale,
      controlName: clause.mapped_control_name,
      status: clause.mapped_status,
      decidedAt: clause.decided_at
    };
    const isExactReplay =
      previousDecision.action === parsed.data.action &&
      previousDecision.rationale === parsed.data.rationale &&
      (parsed.data.control_name ?? undefined) === previousDecision.controlName &&
      (parsed.data.status ?? undefined) === previousDecision.status;
    const decidedAt = isExactReplay && previousDecision.decidedAt ? previousDecision.decidedAt : now;

    clause.decision = parsed.data.action;
    clause.decision_rationale = parsed.data.rationale;
    clause.decided_at = decidedAt;
    if (parsed.data.action === "map") {
      clause.mapped_control_name = parsed.data.control_name;
      clause.mapped_status = parsed.data.status;

      const mappedControl = latestMapping.controls.find((control) => control.control_name === parsed.data.control_name);
      if (mappedControl) {
        mappedControl.status = parsed.data.status!;
        mappedControl.rationale = `${mappedControl.rationale} | Admin override from unresolved clause ${clause.clause_id}.`;
      } else {
        latestMapping.controls.push({
          control_name: parsed.data.control_name!,
          status: parsed.data.status!,
          confidence: 0.7,
          matched_clause_ids: [clause.clause_id],
          rationale: "Admin decision from unresolved clause."
        });
      }

      await recordCanonicalControlSnapshot({
        orgId: org.id,
        control_name: parsed.data.control_name!,
        status: parsed.data.status!,
        source: "policy_mapping",
        bucket_start: decidedAt.slice(0, 10),
        bucket_end: decidedAt.slice(0, 10),
        updatedAt: decidedAt
      });
      await recordComplianceEvent({
        eventId: `event-${crypto.randomUUID()}`,
        orgId: org.id,
        eventType: "control_state_updated",
        policyId: policy.policyId,
        controlName: parsed.data.control_name!,
        status: parsed.data.status!,
        createdAt: decidedAt,
        metadata: {
          source: "unresolved_clause_decision",
          clause_id: clause.clause_id
        }
      });
    }

    await persistPolicyMapping(latestMapping).catch((error) => {
      console.error("[compliance_persistence] failed to persist unresolved mapping decision", {
        org_id: org.id,
        mapping_id: latestMapping.mappingId,
        error: String(error)
      });
    });
    const decisionId = buildDeterministicDecisionId({
      orgId: org.id,
      policyId: policy.policyId,
      mappingId: latestMapping.mappingId,
      clauseId: clause.clause_id,
      action: parsed.data.action,
      rationale: parsed.data.rationale,
      status: parsed.data.status,
      decidedAt
    });
    await persistComplianceDecision({
      decisionId,
      orgId: org.id,
      policyId: policy.policyId,
      mappingId: latestMapping.mappingId,
      clauseId: clause.clause_id,
      action: parsed.data.action,
      rationale: parsed.data.rationale,
      controlName: parsed.data.control_name,
      status: parsed.data.status,
      decidedAt
    }).catch((error) => {
      console.error("[compliance_persistence] failed to persist compliance decision", {
        org_id: org.id,
        mapping_id: latestMapping.mappingId,
        clause_id: clause.clause_id,
        error: String(error)
      });
    });

    await recordComplianceEvent({
      eventId: `event-${crypto.randomUUID()}`,
      orgId: org.id,
      eventType: "unresolved_clause_decided",
      policyId: policy.policyId,
      createdAt: decidedAt,
      metadata: {
        clause_id: clause.clause_id,
        action: parsed.data.action,
        decision_id: decisionId
      }
    });

    const summary = recomputeCompliancePostureForOrg(org.id, decidedAt);
    await recordComplianceEvent({
      eventId: `event-${crypto.randomUUID()}`,
      orgId: org.id,
      eventType: "compliance_status_refreshed",
      policyId: policy.policyId,
      status: summary.overall_status,
      createdAt: decidedAt,
      metadata: {
        trigger: "unresolved_clause_decision",
        clause_id: clause.clause_id,
        action: parsed.data.action
      }
    });

    return res.json({
      policy_id: policy.policyId,
      mapping_id: latestMapping.mappingId,
      clause_id: clause.clause_id,
      decision: clause.decision,
      overall_status: summary.overall_status
    });
  }
);

app.get("/orgs/:orgId/compliance/status", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (req, res) => {
  incrementOpsCounter("compliance_status_requests");
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    incrementOpsCounter("compliance_status_fail_closed");
    return respondFailClosed(res, {
      route: "/orgs/:orgId/compliance/status",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const asOf = typeof req.query.as_of === "string" ? req.query.as_of : undefined;
  if (asOf && Number.isNaN(new Date(asOf).getTime())) {
    return res.status(400).json({ error: "Invalid as_of query parameter" });
  }

  const latestRecords =
    process.env.DATABASE_URL
      ? await listLatestCanonicalControlsByOrg(org.id, asOf)
      : (() => {
        const latestByControl = new Map<string, CanonicalControlSnapshotRecord>();
        Array.from(store.canonicalControlSnapshots.values())
          .filter((record) => record.orgId === org.id && (!asOf || record.updatedAt <= asOf))
          .forEach((record) => {
            const existing = latestByControl.get(record.control_name);
            if (!existing || record.updatedAt > existing.updatedAt) {
              latestByControl.set(record.control_name, record);
            }
          });
        return Array.from(latestByControl.values());
      })();

  const controls = latestRecords.map((record) => ({
    control_name: record.control_name,
    status: record.status,
    source: record.source,
    updated_at: record.updatedAt
  }));
  const summary = buildComplianceSummary(
    controls.map((control) => ({ control_name: control.control_name, status: control.status }))
  );
  const orgEvents =
    process.env.DATABASE_URL
      ? (await listComplianceEventsByOrg(org.id, { asOf })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : Array.from(store.complianceEvents.values())
        .filter((event) => event.orgId === org.id && (!asOf || event.createdAt <= asOf))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const effectiveAsOf = asOf ?? new Date().toISOString();

  incrementOpsCounter("compliance_status_success");
  return res.json({
    org_id: org.id,
    mode: getOrgComplianceMode(org.id),
    as_of: effectiveAsOf,
    freshness: {
      last_event_at: orgEvents[0]?.createdAt ?? null,
      stale: orgEvents.length === 0
    },
    overall_status: summary.overall_status,
    counts: summary.counts,
    controls
  });
});

app.get("/orgs/:orgId/compliance/events", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/compliance/events",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const since = typeof req.query.since === "string" ? req.query.since : undefined;
  const sinceDate = since ? new Date(since) : null;
  const policyId = typeof req.query.policy_id === "string" ? req.query.policy_id : undefined;
  const eventType = typeof req.query.event_type === "string" ? req.query.event_type : undefined;
  const cursorRaw = typeof req.query.cursor === "string" ? req.query.cursor : "0";
  const limitRaw = typeof req.query.limit === "string" ? req.query.limit : "50";
  const cursor = Number.parseInt(cursorRaw, 10);
  const requestedLimit = Number.parseInt(limitRaw, 10);
  const limit = Number.isNaN(requestedLimit) ? 50 : Math.min(200, Math.max(1, requestedLimit));
  if (since && (!sinceDate || Number.isNaN(sinceDate.getTime()))) {
    return res.status(400).json({ error: "Invalid since query parameter" });
  }
  if (Number.isNaN(cursor) || cursor < 0) {
    return res.status(400).json({ error: "Invalid cursor query parameter" });
  }

  const events = process.env.DATABASE_URL
    ? sortComplianceEvents(
      await listComplianceEventsByOrg(org.id, {
        since,
        policyId,
        eventType
      })
    ).reverse()
    : sortComplianceEvents(
      Array.from(store.complianceEvents.values()).filter((event) => {
        if (event.orgId !== org.id) {
          return false;
        }
        if (sinceDate && new Date(event.createdAt) < sinceDate) {
          return false;
        }
        if (policyId && event.policyId !== policyId) {
          return false;
        }
        if (eventType && event.eventType !== eventType) {
          return false;
        }
        return true;
      })
    ).reverse();
  const page = events.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < events.length ? String(cursor + limit) : null;

  return res.json({
    org_id: org.id,
    mode: getOrgComplianceMode(org.id),
    total_count: events.length,
    limit,
    cursor: String(cursor),
    next_cursor: nextCursor,
    events: page.map((event) => ({
      event_id: event.eventId,
      event_type: event.eventType,
      policy_id: event.policyId ?? null,
      control_name: event.controlName ?? null,
      status: event.status ?? null,
      created_at: event.createdAt,
      source_event_id: typeof event.metadata.source_event_id === "string" ? event.metadata.source_event_id : null,
      source_event_type: typeof event.metadata.source_event_type === "string" ? event.metadata.source_event_type : null,
      recomputed_at: typeof event.metadata.recomputed_at === "string" ? event.metadata.recomputed_at : null,
      metadata: event.metadata
    }))
  });
});

app.get("/orgs/:orgId/compliance/export", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  if (!isOrgAllowedForBeta(org.id)) {
    return res.status(403).json({ error: "Org not enabled for internal beta" });
  }
  try {
    await hydrateComplianceDomainForOrg(org.id);
  } catch (error) {
    return respondFailClosed(res, {
      route: "/orgs/:orgId/compliance/export",
      orgId: org.id,
      reason: "hydrate_compliance_domain_failed",
      details: String(error)
    });
  }

  const format = typeof req.query.format === "string" ? req.query.format : "json";
  const events = process.env.DATABASE_URL
    ? sortComplianceEvents(await listComplianceEventsByOrg(org.id, {}))
    : sortComplianceEvents(
      Array.from(store.complianceEvents.values()).filter((event) => event.orgId === org.id)
    );

  if (format === "csv") {
    const escapeCsv = (value: unknown) => {
      const serialized = typeof value === "string" ? value : JSON.stringify(value ?? "");
      return `"${serialized.replace(/"/g, "\"\"")}"`;
    };

    const rows = [
      ["org_id", "event_id", "event_type", "policy_id", "control_name", "status", "created_at_utc", "metadata"].join(","),
      ...events.map((event) =>
        [
          escapeCsv(org.id),
          escapeCsv(event.eventId),
          escapeCsv(event.eventType),
          escapeCsv(event.policyId ?? ""),
          escapeCsv(event.controlName ?? ""),
          escapeCsv(event.status ?? ""),
          escapeCsv(new Date(event.createdAt).toISOString()),
          escapeCsv(event.metadata)
        ].join(",")
      )
    ].join("\n");

    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename=\"compliance-export-${org.id}.csv\"`);
    return res.status(200).send(rows);
  }

  return res.json({
    org_id: org.id,
    mode: getOrgComplianceMode(org.id),
    generated_at_utc: new Date().toISOString(),
    total_count: events.length,
    events: events.map((event) => ({
      event_id: event.eventId,
      event_type: event.eventType,
      policy_id: event.policyId ?? null,
      control_name: event.controlName ?? null,
      status: event.status ?? null,
      created_at_utc: new Date(event.createdAt).toISOString(),
      source_event_id: typeof event.metadata.source_event_id === "string" ? event.metadata.source_event_id : null,
      source_event_type: typeof event.metadata.source_event_type === "string" ? event.metadata.source_event_type : null,
      recomputed_at: typeof event.metadata.recomputed_at === "string" ? event.metadata.recomputed_at : null,
      metadata: event.metadata
    }))
  });
});

app.post("/orgs/:orgId/enablement/import", schemaVersionMiddleware, forbiddenFieldsMiddleware, (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  const rows = Array.isArray(req.body?.observations) ? req.body.observations : [];
  const { accepted, rejected } = validateRows(rows, TrainingEventRollupSchema);
  let inserted = 0;
  let updated = 0;
  accepted.forEach((row) => {
    const result = upsertEnablement({ ...row, orgId: org.id });
    if (result.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  });
  return res.json({ inserted, updated, rejected });
});

app.post("/api/ingest", ingestLimiter, async (req, res) => {
  const schemaVersion = req.header("X-FluencyTracr-Schema-Version");
  const acceptedVersions = getAcceptedSchemaVersions();
  if (!schemaVersion || !acceptedVersions.includes(schemaVersion)) {
    return res.status(400).json({
      error: "Invalid schema version",
      reason_code: "invalid_schema_version",
      expected: acceptedVersions,
      received: schemaVersion ?? null
    });
  }

  const idempotencyKey = req.header("Idempotency-Key");
  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return res.status(400).json({
      error: "Missing required header",
      reason_code: "invalid_payload",
      field_path: "headers.Idempotency-Key"
    });
  }

  const forbiddenField = findForbiddenField(req.body);
  if (forbiddenField) {
    return res.status(400).json({
      error: "Forbidden field",
      reason_code: "forbidden_field",
      field_path: forbiddenField.path
    });
  }

  const events = Array.isArray(req.body?.events) ? req.body.events : null;
  if (!events || events.length === 0) {
    return res.status(400).json({
      error: "Invalid payload",
      reason_code: "invalid_payload",
      field_path: "events"
    });
  }

  pruneIngestReceipts();

  const trimmedKey = idempotencyKey.trim();
  const normalizedHash = payloadHash(req.body);
  const existingReceipt = store.ingestReceipts.get(trimmedKey);
  if (existingReceipt) {
    if (existingReceipt.payloadHash !== normalizedHash) {
      return res.status(409).json({
        error: "Idempotency conflict",
        reason_code: "idempotency_conflict",
        field_path: "headers.Idempotency-Key"
      });
    }
    return res.status(202).json(existingReceipt.response);
  }

  const acceptedEvents: FluencyEvent[] = [];
  const rejections: Array<{
    index: number;
    reason_code: string;
    field_path: string;
  }> = [];

  events.forEach((event: unknown, index: number) => {
    const parsed = FluencyEventSchema.safeParse(event);
    if (parsed.success) {
      acceptedEvents.push(parsed.data);
      return;
    }
    const firstIssue = parsed.error.issues[0];
    rejections.push({
      index,
      reason_code: "invalid_payload",
      field_path: firstIssue ? formatIssuePath(["events", index, ...firstIssue.path]) : `events[${index}]`
    });
  });

  try {
    for (const event of acceptedEvents) {
      const eventId = crypto.randomUUID();
      const record = buildFluencyEventRecord(event, eventId);
      await persistFluencyEventRecord(record, {
        orgId: req.authOrgId,
        schemaVersion
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isFluencyCanonicalPersistenceEnabled() && message.includes("org_id required")) {
      return res.status(400).json({
        error: "org_id required for canonical persistence",
        reason_code: "missing_org_scope",
        message:
          "When DATABASE_URL is set, fluency ingest must include org scope (JWT org_id or x-org-id in dev)."
      });
    }
    return res.status(500).json({
      error: "Ingest persistence failed",
      reason_code: "persist_failed",
      message
    });
  }

  const response = {
    receipt_id: `rcpt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    accepted_count: acceptedEvents.length,
    rejected_count: rejections.length,
    rejections
  };

  store.ingestReceipts.set(trimmedKey, {
    idempotencyKey: trimmedKey,
    payloadHash: normalizedHash,
    response,
    createdAt: nowIso()
  });

  return res.status(202).json(response);
});

app.post("/api/ingest/unified-telemetry", ingestLimiter, (req, res) => {
  if (process.env.FLUENCY_UNIFIED_TELEMETRY_INGEST !== "true") {
    return res.status(403).json({
      error: "Unified telemetry ingest is disabled",
      reason_code: "feature_disabled",
      field_path: "configuration.FLUENCY_UNIFIED_TELEMETRY_INGEST"
    });
  }

  const schemaVersion = req.header("X-FluencyTracr-Schema-Version");
  const acceptedUtVersions = getAcceptedUnifiedTelemetrySchemaVersions();
  if (!schemaVersion || !acceptedUtVersions.includes(schemaVersion)) {
    return res.status(400).json({
      error: "Invalid schema version",
      reason_code: "invalid_schema_version",
      expected: acceptedUtVersions,
      received: schemaVersion ?? null
    });
  }

  const idempotencyKey = req.header("Idempotency-Key");
  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return res.status(400).json({
      error: "Missing required header",
      reason_code: "invalid_payload",
      field_path: "headers.Idempotency-Key"
    });
  }

  const forbiddenField = findForbiddenField(req.body);
  if (forbiddenField) {
    return res.status(400).json({
      error: "Forbidden field",
      reason_code: "forbidden_field",
      field_path: forbiddenField.path
    });
  }

  const events = Array.isArray(req.body?.events) ? req.body.events : null;
  if (!events || events.length === 0) {
    return res.status(400).json({
      error: "Invalid payload",
      reason_code: "invalid_payload",
      field_path: "events"
    });
  }

  const seenEventIds = new Set<string>();
  for (let index = 0; index < events.length; index += 1) {
    const raw = events[index] as { event_id?: unknown };
    if (typeof raw?.event_id === "string") {
      if (seenEventIds.has(raw.event_id)) {
        return res.status(400).json({
          error: "Duplicate event_id in batch",
          reason_code: "invalid_payload",
          field_path: `events[${index}].event_id`
        });
      }
      seenEventIds.add(raw.event_id);
    }
  }

  pruneIngestReceipts();

  const trimmedKey = idempotencyKey.trim();
  const receiptKey = `unified-telemetry:${trimmedKey}`;
  const normalizedHash = payloadHash(req.body);
  const existingReceipt = store.ingestReceipts.get(receiptKey);
  if (existingReceipt) {
    if (existingReceipt.payloadHash !== normalizedHash) {
      return res.status(409).json({
        error: "Idempotency conflict",
        reason_code: "idempotency_conflict",
        field_path: "headers.Idempotency-Key"
      });
    }
    return res.status(202).json(existingReceipt.response);
  }

  const acceptedEvents: UnifiedTelemetryEvent[] = [];
  const rejections: Array<{
    index: number;
    reason_code: string;
    field_path: string;
  }> = [];

  events.forEach((event: unknown, index: number) => {
    const parsed = UnifiedTelemetryEventSchema.safeParse(event);
    if (parsed.success) {
      acceptedEvents.push(parsed.data);
      return;
    }
    const firstIssue = parsed.error.issues[0];
    rejections.push({
      index,
      reason_code: "invalid_payload",
      field_path: firstIssue ? formatIssuePath(["events", index, ...firstIssue.path]) : `events[${index}]`
    });
  });

  if (req.authOrgId) {
    const mismatchedIndex = acceptedEvents.findIndex((event) => event.org_id !== req.authOrgId);
    if (mismatchedIndex >= 0) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Token org scope does not match request org",
        index: mismatchedIndex + 1
      });
    }
  }

  acceptedEvents.forEach((event) => {
    insertUnifiedTelemetryEvent(event);
  });

  const response = {
    receipt_id: `rcpt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    accepted_count: acceptedEvents.length,
    rejected_count: rejections.length,
    rejections
  };

  store.ingestReceipts.set(receiptKey, {
    idempotencyKey: receiptKey,
    payloadHash: normalizedHash,
    response,
    createdAt: nowIso()
  });

  return res.status(202).json(response);
});
app.get(
  "/orgs/:orgId/transparency",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const report = buildTransparencyReport(req.params.orgId);
    if (!report) {
      return res.status(404).json({ error: "Org not found" });
    }
    return res.json(report);
  }
);

app.get(
  "/orgs/:orgId/dashboard/overview",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  enforceAggregation,
  enforceScopeQuery,
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const actorRole = req.role ?? "EXEC_VIEWER";
    logAuditEvent({
      orgId: org.id,
      action: "dashboard_access",
      actorRole,
      metadata: { path: req.originalUrl }
    });

    const range = typeof req.query.range === "string" ? req.query.range : "12w";
    const vendor = typeof req.query.vendor === "string" ? req.query.vendor : "all";
    const groupType = typeof req.query.groupType === "string" ? req.query.groupType : "org";
    const groupKey = typeof req.query.group_key === "string" ? req.query.group_key : "all";

    const metrics = new Map(
      Array.from(store.metrics.entries()).filter(([_, metric]) =>
        filterByQuery(groupKey, groupType, vendor)(metric)
      )
    );
    const controls = new Map(
      Array.from(store.controls.entries()).filter(([_, control]) =>
        filterByQuery(groupKey, groupType, vendor)(control)
      )
    );

    const weeks = rangeToWeeks(range);
    const coverageActive = buildTimeseries("weekly_active_users", metrics, weeks);
    const coverageAssigned = buildTimeseries("active_users_percent_of_assigned", metrics, weeks);

    const frequencyBands = latestSnapshot(
      [
        "usage_frequency_band_rare_count",
        "usage_frequency_band_occasional_count",
        "usage_frequency_band_regular_count",
        "usage_frequency_band_habitual_count"
      ],
      metrics
    );

    const spreadSnapshot = latestSnapshot(
      ["teams_with_any_ai_usage_percent", "usage_concentration_index"],
      metrics
    );

    const riskControls = latestControls(
      [
        "ai_enabled_status",
        "data_retention_policy_status",
        "model_training_opt_out_status",
        "external_sharing_disabled_status",
        "compliance_posture_flag"
      ],
      controls
    );

    const appUsage = latestSnapshot(
      [
        "usage_share_app_word_percent",
        "usage_share_app_outlook_percent",
        "usage_share_app_excel_percent",
        "usage_share_app_powerpoint_percent",
        "usage_share_app_teams_percent",
        "usage_share_app_docs_percent",
        "usage_share_app_gmail_percent",
        "usage_share_app_sheets_percent",
        "usage_share_app_slides_percent"
      ],
      metrics
    );

    return res.json({
      org_id: org.id,
      range,
      vendor,
      group_type: groupType,
      group_key: groupKey,
      coverage: {
        weekly_active_users: coverageActive,
        active_users_percent_of_assigned: coverageAssigned
      },
      sessions_shape: {
        bucket_start: frequencyBands.bucket_start,
        frequency_bands: frequencyBands.values
      },
      spread: {
        bucket_start: spreadSnapshot.bucket_start,
        teams_with_any_ai_usage_percent: spreadSnapshot.values.teams_with_any_ai_usage_percent ?? null,
        usage_concentration_index: spreadSnapshot.values.usage_concentration_index ?? null
      },
      risk_drift_controls: {
        bucket_start: riskControls.bucket_start,
        ai_enabled_status: riskControls.values.ai_enabled_status ?? null,
        data_retention_policy_status: riskControls.values.data_retention_policy_status ?? null,
        model_training_opt_out_status: riskControls.values.model_training_opt_out_status ?? null,
        external_sharing_disabled_status: riskControls.values.external_sharing_disabled_status ?? null,
        compliance_posture_flag: riskControls.values.compliance_posture_flag ?? null
      },
      app_usage_share: {
        bucket_start: appUsage.bucket_start,
        distribution: appUsage.values
      }
    });
  }
);

app.get(
  "/orgs/:orgId/dashboard/export.csv",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const actorRole = req.role ?? "EXEC_VIEWER";
    logAuditEvent({
      orgId: org.id,
      action: "dashboard_export",
      actorRole,
      metadata: { format: "csv" }
    });
    res.setHeader("content-type", "text/csv; charset=utf-8");
    return res.status(200).send("metric_name,metric_value\naggregate_evidence_status,not_computed\n");
  }
);

app.get(
  "/orgs/:orgId/dashboard/export.pdf",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const actorRole = req.role ?? "EXEC_VIEWER";
    logAuditEvent({
      orgId: org.id,
      action: "dashboard_export",
      actorRole,
      metadata: { format: "pdf" }
    });
    const pdfHeader = "%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n";
    res.setHeader("content-type", "application/pdf");
    return res.status(200).send(Buffer.from(pdfHeader));
  }
);

app.get(
  "/orgs/:orgId/audit-log",
  rbacMiddleware(["ADMIN"]),
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    return res.json({ logs: listAuditLogs(org.id) });
  }
);

app.get(
  "/orgs/:orgId/telemetry/index",
  rbacMiddleware(["ADMIN"]),
  (req, res) => {
    const windowParsed = FluencyWindowSchema.safeParse(req.query.window ?? "60d");
    if (!windowParsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }
    const window = windowParsed.data;
    const records = store.patternInferenceRecords.filter((record) =>
      matchesWindow(record, window)
    );

    const workflowIds = new Set(records.map((record) => workflowIdFromScopeKey(record.scope_key)));
    const cohortSize = workflowIds.size;

    if (cohortSize < MIN_COHORT_SIZE) {
      return res.status(400).json({
        error: "Cohort below minimum size",
        cohort_size: cohortSize,
        min_cohort_size: MIN_COHORT_SIZE
      });
    }

    const confidentRecords = records.filter((record) => ["MEDIUM", "HIGH"].includes(record.confidence_level));
    const confidentWorkflows = new Set(
      confidentRecords.map((record) => workflowIdFromScopeKey(record.scope_key))
    ).size;

    const workflowCoverage = cohortSize === 0 ? 0 : confidentWorkflows / cohortSize;
    const patternConfidence = records.length === 0 ? 0 : confidentRecords.length / records.length;
    const value = workflowCoverage * 0.67 + patternConfidence * 0.33;
    const confidence = records.length === 0 ? 0 : Math.min(1, 0.5 + 0.5 * patternConfidence);
    const latestRecord = records.reduce(
      (latest, record) => (record.generated_at > latest.generated_at ? record : latest),
      records[0]
    );

    return res.json({
      org_id: req.params.orgId,
      window,
      operational_telemetry_index: {
        value,
        confidence,
        components: {
          workflow_coverage: workflowCoverage,
          pattern_confidence: patternConfidence
        },
        does_not_mean: [
          "This index does not measure individual performance.",
          "This index does not guarantee outcome quality."
        ],
        inference_version: latestRecord?.inference_version ?? INFERENCE_VERSION,
        parameter_hash: latestRecord?.parameter_hash ?? parameterHash(),
        generated_at: latestRecord?.generated_at ?? nowIso()
      }
    });
  }
);

app.get(
  "/api/workflows",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const orgId = typeof req.query.org_id === "string" ? req.query.org_id : "";
    if (!orgId) {
      return res.status(400).json({ error: "org_id is required" });
    }
    const org = store.orgs.get(orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const entries = await listRegistryEntriesByOrg(org.id);
    const latestByWorkflow = entries
      .slice()
      .sort((a, b) => {
        if (a.workflowId !== b.workflowId) {
          return a.workflowId.localeCompare(b.workflowId);
        }
        if (a.version !== b.version) {
          return a.version - b.version;
        }
        return a.createdAt.localeCompare(b.createdAt);
      })
      .reduce((acc, entry) => {
        acc.set(entry.workflowId, entry);
        return acc;
      }, new Map<string, (typeof entries)[number]>());

    const workflows = await Promise.all(
      Array.from(latestByWorkflow.values())
        .sort((a, b) => a.workflowId.localeCompare(b.workflowId))
        .map(async (entry) => {
          const visibility = await computeWorkflowVisibilityService(org.id, entry.workflowId, new Date());
          return {
            workflow_id: entry.workflowId,
            display_name: entry.displayName,
            risk_class: entry.riskClass,
            version: entry.version,
            visibility_state: visibility.visibilityState,
            dominant_pattern: visibility.dominantPattern,
            updated_at: entry.createdAt
          };
        })
    );

    return res.json({ org_id: org.id, workflows });
  }
);

app.post(
  "/api/workflows/register",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR"]),
  async (req, res) => {
    const parsed = WorkflowRegisterSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const org = store.orgs.get(parsed.data.org_id);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const created = await registerWorkflowVersion({
      orgId: org.id,
      workflowId: parsed.data.workflow_id,
      displayName: parsed.data.display_name,
      riskClass: parsed.data.risk_class,
      changeReason: parsed.data.change_reason,
      actorSub: req.authSub ?? undefined,
      actorRole: req.role ?? undefined
    });
    return res.status(201).json({
      org_id: org.id,
      workflow_id: created.workflowId,
      display_name: created.displayName,
      version: created.version,
      risk_class: created.riskClass,
      created_at: created.createdAt
    });
  }
);

app.post(
  "/api/workflows/update-risk-class",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR"]),
  async (req, res) => {
    const parsed = WorkflowRegisterSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const org = store.orgs.get(parsed.data.org_id);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const created = await registerWorkflowVersion({
      orgId: org.id,
      workflowId: parsed.data.workflow_id,
      displayName: parsed.data.display_name,
      riskClass: parsed.data.risk_class,
      changeReason: parsed.data.change_reason ?? "risk class update",
      actorSub: req.authSub ?? undefined,
      actorRole: req.role ?? undefined
    });
    return res.status(201).json({
      org_id: org.id,
      workflow_id: created.workflowId,
      display_name: created.displayName,
      version: created.version,
      risk_class: created.riskClass,
      created_at: created.createdAt
    });
  }
);

app.post(
  "/api/control-config/create-version",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR"]),
  async (req, res) => {
    const parsed = ControlConfigVersionCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const org = store.orgs.get(parsed.data.org_id);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const created = await createControlConfigVersion({
      orgId: org.id,
      versionName: parsed.data.version_name,
      changeReason: parsed.data.change_reason,
      changedByUser: req.authSub ?? undefined,
      changedByRole: req.role ?? undefined,
      windowDaysLow: parsed.data.window_days_low,
      windowDaysMedium: parsed.data.window_days_medium,
      windowDaysHigh: parsed.data.window_days_high,
      minEventsLow: parsed.data.min_events_low,
      minEventsMedium: parsed.data.min_events_medium,
      minEventsHigh: parsed.data.min_events_high,
      requireVerificationHigh: parsed.data.require_verification_high
    });
    return res.status(201).json({
      org_id: org.id,
      control_config_version_id: created.id,
      version_name: created.versionName,
      created_at: created.createdAt
    });
  }
);

app.post(
  "/api/control-config/reset-baseline",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR"]),
  async (req, res) => {
    const parsed = BaselineResetSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const org = store.orgs.get(parsed.data.org_id);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const config = (await listRegistryPolicyConfigsByOrg(org.id)).find(
      (row) => row.id === parsed.data.control_config_version_id
    );
    if (!config) {
      return res.status(404).json({ error: "Control config version not found" });
    }
    const reset = await resetBaseline({
      orgId: org.id,
      controlConfigVersionId: parsed.data.control_config_version_id,
      reason: parsed.data.reason,
      triggeredByUser: req.authSub ?? undefined,
      triggeredByRole: req.role ?? undefined
    });
    return res.status(201).json({
      org_id: org.id,
      baseline_reset_event_id: reset.id,
      control_config_version_id: reset.controlConfigVersionId,
      reset_at: reset.resetAt
    });
  }
);

app.get(
  "/api/workflow-registry/:orgId/workflows/:workflowId/versions",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const versions = await listRegistryEntriesByWorkflow(org.id, req.params.workflowId);
    const policyConfigs = await listRegistryPolicyConfigsByOrg(org.id);
    const payload: WorkflowRegistryVersionsResponse = {
      org_id: org.id,
      workflow_id: req.params.workflowId,
      versions: versions.map((version) => ({
        version: version.version,
        risk_class: version.riskClass,
        change_reason: version.changeReason ?? null,
        actor_sub: version.changedByUser ?? null,
        actor_role: version.changedByRole ?? null,
        policy_config: (() => {
          const policy = getPolicyConfigForRegistryVersion(policyConfigs, version);
          if (!policy) {
            return null;
          }
          return {
            policy_version: policy.versionName,
            low_min_events: policy.minEventsLow,
            medium_min_events: policy.minEventsMedium,
            high_min_events: policy.minEventsHigh,
            min_window_days: Math.min(policy.windowDaysLow, policy.windowDaysMedium),
            high_sparse_min_events: Math.max(policy.minEventsHigh + 4, 12),
            high_sparse_min_window_days: policy.windowDaysHigh
          };
        })(),
        created_at: version.createdAt
      }))
    };
    return res.json(payload);
  }
);

app.get(
  "/api/workflow-registry/:orgId/workflows",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const entries = await listRegistryEntriesByOrg(org.id);
    const latestByWorkflow = entries
      .slice()
      .sort((a, b) => {
        if (a.workflowId !== b.workflowId) {
          return a.workflowId.localeCompare(b.workflowId);
        }
        if (a.version !== b.version) {
          return a.version - b.version;
        }
        return a.createdAt.localeCompare(b.createdAt);
      })
      .reduce((acc, entry) => {
        acc.set(entry.workflowId, entry);
        return acc;
      }, new Map<string, (typeof entries)[number]>());

    const payload: WorkflowRegistryWorkflowsResponse = {
      org_id: org.id,
      workflows: Array.from(latestByWorkflow.values())
        .sort((a, b) => a.workflowId.localeCompare(b.workflowId))
        .map((entry) => ({
          workflow_id: entry.workflowId,
          version: entry.version,
          risk_class: entry.riskClass,
          created_at: entry.createdAt
        }))
    };
    return res.json(payload);
  }
);

app.post(
  "/api/workflow-registry/:orgId/workflows/:workflowId/versions",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const parsed = WorkflowRegistryVersionCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const created = await registerWorkflowVersion({
      orgId: org.id,
      workflowId: req.params.workflowId,
      riskClass: parsed.data.risk_class,
      changeReason: parsed.data.change_reason,
      actorSub: req.authSub ?? undefined,
      actorRole: req.role ?? undefined,
      policyConfig: parsed.data.policy_config
        ? {
            policyVersion: parsed.data.policy_config.policy_version,
            lowMinEvents: parsed.data.policy_config.low_min_events,
            mediumMinEvents: parsed.data.policy_config.medium_min_events,
            highMinEvents: parsed.data.policy_config.high_min_events,
            minWindowDays: parsed.data.policy_config.min_window_days,
            highSparseMinEvents: parsed.data.policy_config.high_sparse_min_events,
            highSparseMinWindowDays: parsed.data.policy_config.high_sparse_min_window_days
          }
        : undefined
    });

    const payload: WorkflowRegistryCreateVersionResponse = {
      workflow_id: created.workflowId,
      version: created.version,
      risk_class: created.riskClass,
      change_reason: created.changeReason ?? null,
      created_at: created.createdAt
    };
    return res.status(201).json(payload);
  }
);

app.get(
  "/api/workflow-registry/:orgId/audit",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    const workflowId = typeof req.query.workflow_id === "string" ? req.query.workflow_id : undefined;
    const events = await listRegistryAudit(org.id, workflowId);
    const payload: WorkflowRegistryAuditResponse = {
      org_id: org.id,
      events: events.map((event) => ({
        workflow_id: event.workflowId,
        version: event.version,
        action: event.action,
        actor_sub: event.actorSub ?? null,
        actor_role: event.actorRole ?? null,
        metadata: event.metadata,
        created_at: event.createdAt
      }))
    };
    return res.json(payload);
  }
);

app.get(
  "/api/orientation/:orgId",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const parsedWindow = FluencyWindowSchema.safeParse(req.query.window ?? "60d");
    if (!parsedWindow.success) {
      return res.status(400).json({ error: "Invalid query" });
    }
    const entries = await listRegistryEntriesByOrg(org.id);
    const policyConfigs = await listRegistryPolicyConfigsByOrg(org.id);
    const baselineResets = await listBaselineResetsByOrg(org.id);
    const fluencyEvents = await loadFluencyEventRecords({ dbOrgId: org.id });
    const baselineResetsByWorkflowVersion = entries.reduce<Record<string, string | null>>(
      (acc, entry) => {
        acc[`${entry.workflowId}:${entry.version}`] = getBaselineResetAtForRegistryVersion(
          baselineResets,
          entry
        );
        return acc;
      },
      {}
    );
    const summary = computeWorkflowVisibilitySummary(entries, parsedWindow.data, {
      policyConfigs,
      baselineResetsByWorkflowVersion,
      fluencyEvents,
      v0Signals: Array.from(store.behavioralSignals.values()),
      patternInferenceRecords: store.patternInferenceRecords
    });

    const payload: OrientationWorkflowVisibilitySummaryResponse = {
      org_id: org.id,
      workflow_visibility_summary: {
        visible: summary.VISIBLE,
        not_enough_data_yet: summary.NOT_ENOUGH_DATA_YET,
        not_shown_safety: summary.NOT_SHOWN_SAFETY
      }
    };

    return res.json(payload);
  }
);

app.get(
  "/api/board-snapshot/:orgId",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const parsedWindow = FluencyWindowSchema.safeParse(req.query.window ?? "60d");
    if (!parsedWindow.success) {
      return res.status(400).json({ error: "Invalid query" });
    }
    const window = parsedWindow.data;
    const entries = await listRegistryEntriesByOrg(org.id);
    const currentWorkflows = entries
      .slice()
      .sort((a, b) => {
        if (a.workflowId !== b.workflowId) {
          return a.workflowId.localeCompare(b.workflowId);
        }
        if (a.version !== b.version) {
          return a.version - b.version;
        }
        return a.createdAt.localeCompare(b.createdAt);
      })
      .reduce((acc, entry) => {
        acc.set(entry.workflowId, entry);
        return acc;
      }, new Map<string, (typeof entries)[number]>());
    const now = new Date();
    const fluencyEvents = await loadFluencyEventRecords({ dbOrgId: org.id });
    const workflows = await Promise.all(
      Array.from(currentWorkflows.values())
        .sort((a, b) => {
          if (a.displayName !== b.displayName) {
            return a.displayName.localeCompare(b.displayName);
          }
          return a.workflowId.localeCompare(b.workflowId);
        })
        .map(async (workflow) => {
          const visibility = await computeWorkflowVisibilityService(org.id, workflow.workflowId, now, fluencyEvents);
          const workingStyle =
            visibility.visibilityState === "VISIBLE"
              ? patternToExecutiveWorkingStyle(visibility.dominantPattern)
              : null;
          return {
            workflow_id: workflow.workflowId,
            workflow_display_name: workflow.displayName,
            visibility_state: visibility.visibilityState,
            visibility_label: visibilityStateToLabel(visibility.visibilityState),
            observation_window: window,
            working_style: workingStyle
          };
        })
    );

    const payload: BoardSnapshotResponse = {
      org_id: org.id,
      header: {
        observation_window: window,
        visible: workflows.filter((workflow) => workflow.visibility_state === "VISIBLE").length,
        not_enough_data_yet: workflows.filter((workflow) => workflow.visibility_state === "NOT_ENOUGH_DATA_YET").length,
        not_shown_safety: workflows.filter((workflow) => workflow.visibility_state === "NOT_SHOWN_SAFETY").length
      },
      workflows
    };
    return res.json(payload);
  }
);

app.get(
  "/api/dashboard",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  enforceAggregation,
  (req, res) => {
    const parsed = DashboardRequestSchema.safeParse({
      orgId: req.query.orgId,
      aggregation: req.query.aggregation,
      metricNames: req.query.metricNames ? (req.query.metricNames as string).split(",") : undefined
    });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }

    const response: DashboardResponse = {
      metrics: [],
      controls: [],
      enablement: []
    };

    return res.json(response);
  }
);

app.post(
  "/api/events",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  async (req, res) => {
    const parsed = FluencyEventIngestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const schemaVersion = req.header("X-FluencyTracr-Schema-Version") ?? "0.1";
    const eventIds: string[] = [];
    const executionIds: string[] = [];
    try {
      for (const event of parsed.data.events) {
        const eventId = crypto.randomUUID();
        const record = buildFluencyEventRecord(event, eventId);
        await persistFluencyEventRecord(record, {
          orgId: req.authOrgId,
          schemaVersion
        });
        eventIds.push(eventId);
        executionIds.push(record.execution_id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isFluencyCanonicalPersistenceEnabled() && message.includes("org_id required")) {
        return res.status(400).json({
          error: "org_id required for canonical persistence",
          message:
            "When DATABASE_URL is set, fluency ingest must include org scope (JWT org_id or x-org-id in dev)."
        });
      }
      return res.status(500).json({ error: "Event persistence failed", message });
    }

    return res.json({
      ingested: eventIds.length,
      event_ids: eventIds,
      execution_ids: executionIds,
      schema_version: schemaVersion
    });
  }
);

const TraceReconstructedQuerySchema = z
  .object({
    workflow_id: z.string().min(1).optional(),
    execution_id: z.string().min(1).optional(),
    baseline_window: FluencyWindowSchema.optional()
  })
  .refine((q) => Boolean(q.workflow_id ?? q.execution_id), {
    message: "Provide at least one of workflow_id, execution_id"
  });

const CausalDeltaBodySchema = z.object({
  workflow_id: z.string().min(1),
  jbtd_id: FluencyJoinKeySchema.nullable().optional(),
  persona_id: FluencyJoinKeySchema.nullable().optional(),
  event_at: z.string().datetime({ offset: true }),
  pre_window_days: z.number().int().positive().default(30),
  post_window_days: z.number().int().positive().default(30),
  label: z.string()
}).strict();

const QualityMultiplierQuerySchema = z.object({
  workflow_id: z.string().min(1),
  jbtd_id: FluencyJoinKeySchema.nullable().optional(),
  persona_id: FluencyJoinKeySchema.nullable().optional(),
  window_days: z.coerce.number().int().positive().max(3650),
  cohort_id: z.string().min(1).optional(),
  use_forwarded_distribution: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  include_velocity: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
}).strict();

const VelocityIndexQuerySchema = z.object({
  workflow_id: z.string().min(1),
  jbtd_id: FluencyJoinKeySchema.nullable().optional(),
  persona_id: FluencyJoinKeySchema.nullable().optional(),
  window_days: z.coerce.number().int().positive().max(3650)
}).strict();

const V3VerdictsQuerySchema = z.object({
  cohort_id: z.string().min(1),
  workflow_id: z.string().min(1).optional()
}).strict();

const eventBelongsToAuthOrg = (event: FluencyEventRecord, orgId: string | undefined): boolean => {
  if (!orgId) {
    return true;
  }
  return (
    typeof event.org_unit === "string" &&
    (event.org_unit === `org:${orgId}` || event.org_unit.startsWith(`org:${orgId}:`))
  );
};

app.post(
  "/api/v1/causal-delta",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const parsed = CausalDeltaBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid causal delta request",
        details: parsed.error.flatten()
      });
    }

    const { workflow_id, jbtd_id, persona_id, event_at, pre_window_days, post_window_days } = parsed.data;
    if (
      pre_window_days < MIN_CAUSAL_DELTA_WINDOW_DAYS ||
      post_window_days < MIN_CAUSAL_DELTA_WINDOW_DAYS
    ) {
      return res.status(400).json({
        error: "Invalid causal delta request",
        reason_code: "window_below_minimum",
        min_window_days: MIN_CAUSAL_DELTA_WINDOW_DAYS
      });
    }

    const changeAt = new Date(event_at);
    const preStart = new Date(changeAt.getTime() - pre_window_days * 24 * 60 * 60 * 1000);
    const preEnd = changeAt;
    const postStart = changeAt;
    const postEnd = new Date(changeAt.getTime() + post_window_days * 24 * 60 * 60 * 1000);
    if (causalDeltaWindowsOverlap(preStart, preEnd, postStart, postEnd)) {
      return res.status(400).json({
        error: "Invalid causal delta request",
        reason_code: "overlapping_windows"
      });
    }

    const loadedEvents = await loadFluencyEventRecords({ dbOrgId: req.authOrgId });
    const scopedEvents = loadedEvents.filter((event) => eventBelongsToAuthOrg(event, req.authOrgId));
    return res.json(
      computeCausalDelta({
        workflowId: workflow_id,
        jbtdId: jbtd_id ?? null,
        personaId: persona_id ?? null,
        eventAt: event_at,
        preWindowDays: pre_window_days,
        postWindowDays: post_window_days,
        events: scopedEvents
      })
    );
  }
);

app.get("/api/v1/quality-multiplier", async (req, res) => {
  // TODO(auth): replace ambient/dev header context with service auth when Paul Li's pipeline identity is defined.
  const rawWorkflowId = typeof req.query.workflow_id === "string" ? req.query.workflow_id : "";
  const rawWindowDays =
    typeof req.query.window_days === "string" && /^\d+$/.test(req.query.window_days)
      ? Number(req.query.window_days)
      : 0;
  const parsed = QualityMultiplierQuerySchema.safeParse({
    workflow_id: req.query.workflow_id,
    jbtd_id: req.query.jbtd_id,
    persona_id: req.query.persona_id,
    window_days: req.query.window_days,
    cohort_id: req.query.cohort_id,
    use_forwarded_distribution: req.query.use_forwarded_distribution,
    include_velocity: req.query.include_velocity
  });

  if (!parsed.success) {
    return res.status(400).json(
      failClosedQualityMultiplierResponse(rawWorkflowId, rawWindowDays)
    );
  }

  if (parsed.data.use_forwarded_distribution && parsed.data.cohort_id && req.authOrgId) {
    const verdicts = await listFluencyTracrVerdicts({
      orgId: req.authOrgId,
      cohortId: parsed.data.cohort_id,
      workflowId: parsed.data.workflow_id
    });
    const forwardedVerdict = verdicts.find((row) => {
      const payload = row.payload_json as Record<string, unknown>;
      if (payload.verdict !== "SURFACE") {
        return false;
      }
      if ((payload.jbtd_id ?? null) !== (parsed.data.jbtd_id ?? null)) {
        return false;
      }
      if ((payload.persona_id ?? null) !== (parsed.data.persona_id ?? null)) {
        return false;
      }
      return typeof payload.forwarded_distribution === "object" && payload.forwarded_distribution !== null;
    });
    const parsedForwarded = ForwardedDistributionSchema.safeParse(
      forwardedVerdict?.payload_json.forwarded_distribution
    );
    if (parsedForwarded.success && parsedForwarded.data.window_days >= parsed.data.window_days) {
      return res.json(
        computeQualityMultiplierFromForwardedDistribution({
          forwardedDistribution: parsedForwarded.data
        })
      );
    }
  }

  const loadedEvents = await loadFluencyEventRecords({ dbOrgId: req.authOrgId });
  const scopedEvents = loadedEvents.filter((event) => eventBelongsToAuthOrg(event, req.authOrgId));
  const baseResponse = computeQualityMultiplier({
    workflowId: parsed.data.workflow_id,
    jbtdId: parsed.data.jbtd_id ?? null,
    personaId: parsed.data.persona_id ?? null,
    windowDays: parsed.data.window_days,
    events: scopedEvents
  });
  if (!parsed.data.include_velocity || baseResponse.verdict !== "SURFACE" || baseResponse.multiplier === null) {
    return res.json(baseResponse);
  }
  const velocityResponse = computeVelocityIndex({
    workflowId: parsed.data.workflow_id,
    jbtdId: parsed.data.jbtd_id ?? null,
    personaId: parsed.data.persona_id ?? null,
    windowDays: parsed.data.window_days,
    distributions: await listVelocityDistributions({
      orgId: req.authOrgId,
      workflowId: parsed.data.workflow_id,
      jbtdId: parsed.data.jbtd_id ?? null,
      personaId: parsed.data.persona_id ?? null
    })
  });
  if (velocityResponse.verdict !== "SURFACE" || velocityResponse.velocity_index === null) {
    return res.json(baseResponse);
  }
  const velocity_adjustment_factor = velocityAdjustmentFactor(velocityResponse.velocity_index);
  return res.json({
    ...baseResponse,
    multiplier: Number(Math.min(1.5, Math.max(0.5, baseResponse.multiplier * velocity_adjustment_factor)).toFixed(3)),
    velocity_adjustment_factor,
    velocity_index: velocityResponse.velocity_index
  });
});

app.post("/api/v2/ingest/velocity-distribution", rbacMiddleware(["ADMIN"]), async (req, res) => {
  const personField = findVelocityPersonField(req.body);
  if (personField) {
    return res.status(400).json({
      error: "Person-level field rejected",
      reason_code: "person_level_field_rejected",
      field_path: personField
    });
  }
  const parsed = VelocityDistributionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid velocity distribution",
      reason_code: "invalid_velocity_distribution",
      details: parsed.error.flatten()
    });
  }
  if (!req.authOrgId && isVelocityPersistenceEnabled()) {
    return res.status(400).json({
      error: "Velocity distribution requires organization scope",
      reason_code: "missing_org_scope"
    });
  }
  const orgId = req.authOrgId ?? "org-in-memory";
  const calibrationReference = parsed.data.calibration_reference ?? loadVelocityBaseline().calibration_id;
  const record = {
    ...parsed.data,
    org_id: orgId,
    jbtd_id: parsed.data.jbtd_id ?? null,
    persona_id: parsed.data.persona_id ?? null,
    calibration_reference: calibrationReference,
    ingested_at: new Date().toISOString()
  };
  try {
    await persistVelocityDistribution(record);
  } catch {
    return res.status(500).json({
      error: "Velocity persistence failed",
      reason_code: "velocity_persistence_failed"
    });
  }
  return res.status(202).json({
    accepted: true,
    event_name: record.event_name,
    workflow_id: record.workflow_id,
    calibration_reference: record.calibration_reference
  });
});

app.get("/api/v2/velocity-index", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (req, res) => {
  const parsed = VelocityIndexQuerySchema.safeParse({
    workflow_id: req.query.workflow_id,
    jbtd_id: req.query.jbtd_id,
    persona_id: req.query.persona_id,
    window_days: req.query.window_days
  });
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid velocity index request",
      reason_code: "invalid_velocity_index_request",
      details: parsed.error.flatten()
    });
  }
  return res.json(
    computeVelocityIndex({
      workflowId: parsed.data.workflow_id,
      jbtdId: parsed.data.jbtd_id ?? null,
      personaId: parsed.data.persona_id ?? null,
      windowDays: parsed.data.window_days,
      distributions: await listVelocityDistributions({
        orgId: req.authOrgId,
        workflowId: parsed.data.workflow_id,
        jbtdId: parsed.data.jbtd_id ?? null,
        personaId: parsed.data.persona_id ?? null
      })
    })
  );
});

app.get(
  "/api/v3/calibration/baselines",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => {
    try {
      return res.json({
        baselines: loadCalibrationBaselines().map((baseline) => ({
          calibration_id: baseline.calibration_id,
          source: baseline.source,
          frequency_p50: baseline.frequency_p50,
          engagement_p50: baseline.engagement_p50,
          breadth_p50: baseline.breadth_p50
        }))
      });
    } catch {
      return res.status(500).json({
        error: "Calibration baselines unavailable",
        reason_code: "calibration_baselines_unavailable"
      });
    }
  }
);

app.post("/api/v3/ingest/aggregate", rbacMiddleware(["ADMIN"]), async (req, res) => {
  const personField = findVelocityPersonField(req.body);
  if (personField) {
    return res.status(400).json({
      error: "Person-level field rejected",
      reason_code: "person_level_field_rejected",
      field_path: personField
    });
  }
  const forbiddenField = findForbiddenField(req.body);
  if (forbiddenField) {
    return res.status(400).json({
      error: "Forbidden raw field rejected",
      reason_code: "forbidden_field_rejected",
      field_path: forbiddenField.path
    });
  }
  const parsed = V3AggregateIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid aggregate ingest payload",
      reason_code: "invalid_aggregate_ingest_payload",
      details: parsed.error.flatten()
    });
  }
  const baseline = findCalibrationBaseline(parsed.data.calibration_id);
  if (!baseline) {
    return res.status(400).json({
      error: "Unknown calibration baseline",
      reason_code: "unknown_calibration_id",
      calibration_id: parsed.data.calibration_id
    });
  }
  if (!req.authOrgId) {
    return res.status(400).json({
      error: "Aggregate ingest requires organization scope",
      reason_code: "missing_org_scope"
    });
  }

  const computed = computeV3AggregateVerdict(parsed.data, baseline);
  const now = new Date().toISOString();
  const orgId = req.authOrgId;
  const record = {
    id: crypto.randomUUID(),
    org_id: orgId,
    cohort_id: computed.cohort_id,
    workflow_id: computed.workflow_id,
    jbtd_id: computed.jbtd_id,
    persona_id: computed.persona_id,
    slice_key: verdictSliceKey(computed.jbtd_id, computed.persona_id),
    window_start: computed.window_start,
    window_end: computed.window_end,
    calibration_id: computed.calibration_id,
    verdict: computed.verdict,
    suppression_reason: computed.suppression_reason,
    cohort_size: computed.cohort_size,
    evidence_grade: computed.evidence_grade,
    velocity_index: computed.velocity_index,
    quality_multiplier: computed.quality_multiplier,
    payload_json: {
      ...computed,
      privacy: parsed.data.privacy
    },
    computed_at: computed.computed_at,
    created_at: now
  };

  try {
    await persistFluencyTracrVerdict(record);
    for (const velocityRecord of velocityRecordsFromV3Aggregate(orgId, parsed.data, now)) {
      await persistVelocityDistribution(velocityRecord);
    }
  } catch (error) {
    if (error instanceof VerdictAlreadyExistsError) {
      return res.status(409).json({
        error: "Verdict already exists for immutable aggregate key",
        reason_code: "verdict_already_exists"
      });
    }
    return res.status(500).json({
      error: "Aggregate ingest failed",
      reason_code: "aggregate_ingest_failed"
    });
  }

  return res.status(202).json({
    accepted: true,
    verdict: computed
  });
});

app.get(
  "/api/v3/verdicts",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const parsed = V3VerdictsQuerySchema.safeParse({
      cohort_id: req.query.cohort_id,
      workflow_id: req.query.workflow_id
    });
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid verdict query",
        reason_code: "invalid_verdict_query",
        details: parsed.error.flatten()
      });
    }
    if (!req.authOrgId) {
      return res.status(400).json({
        error: "Verdict query requires organization scope",
        reason_code: "missing_org_scope"
      });
    }
    const rows = await listFluencyTracrVerdicts({
      orgId: req.authOrgId,
      cohortId: parsed.data.cohort_id,
      workflowId: parsed.data.workflow_id
    });
    return res.json({
      cohort_id: parsed.data.cohort_id,
      verdicts: rows.map((row) => row.payload_json)
    });
  }
);

const toOutcomeEvidenceSuppressionReason = (reasons: string[] | undefined) => {
  if (!reasons || reasons.length === 0) {
    return null;
  }
  if (reasons.includes("insufficient_disclosed_executions")) {
    return "INSUFFICIENT_VOLUME";
  }
  return "HIGH_AMBIGUITY";
};

const outcomeEvidenceAivmFields = (
  events: FluencyEventRecord[],
  workflowId: string,
  jbtdId: string | null,
  personaId: string | null,
  periodStart: string,
  periodEnd: string
) => {
  const startMs = Date.parse(periodStart);
  const endMs = Date.parse(periodEnd);
  const canonical_events = events
    .filter((event) => event.workflow_id === workflowId)
    .filter((event) => (event.jbtd_id ?? null) === jbtdId)
    .filter((event) => (event.persona_id ?? null) === personaId)
    .filter((event) => {
      const at = Date.parse(event.timestamp);
      return at >= startMs && at <= endMs;
    })
    .map((event) => {
      switch (event.event_type) {
        case "ai_output_disposition":
          return {
            event_name: "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
            verification_present: event.verification_present
          };
        case "ai_recovery_loop":
          return { event_name: "FT_V1_RECOVERY_OBSERVED", recovery_present: true };
        case "ai_abandonment":
          return { event_name: "FT_V1_ABANDONMENT_OBSERVED", abandonment_present: true };
        default:
          return { event_name: "FT_V1_DISPOSITION_OBSERVED" };
      }
    });
  return deriveAivmVerdictFields({
    canonical_events,
    cohort_size: new Set(
      events
        .filter((event) => event.workflow_id === workflowId)
        .filter((event) => (event.jbtd_id ?? null) === jbtdId)
        .filter((event) => (event.persona_id ?? null) === personaId)
        .map((event) => event.execution_id)
    ).size,
    window_length_days: Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000))
  });
};

app.post(
  "/api/v1/outcome-evidence",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    // TODO(auth): bind outcome evidence writes to a service identity for Paul Li's pipeline / AIOM ingestion.
    const parsed = OutcomeEvidenceCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const insufficientVolume = parsed.error.issues.some((issue) => issue.message === "INSUFFICIENT_VOLUME");
      return res.status(insufficientVolume ? 422 : 400).json({
        error: "Invalid outcome evidence payload",
        reason: insufficientVolume ? "INSUFFICIENT_VOLUME" : "INVALID_PAYLOAD",
        details: flattened
      });
    }
    if (!req.authOrgId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const evidenceId = crypto.randomUUID();
    const acceptedAt = new Date().toISOString();
    await persistOutcomeEvidence(req.authOrgId, parsed.data, evidenceId, acceptedAt);

    return res.status(201).json({
      evidence_id: evidenceId,
      accepted_at: acceptedAt,
      workflow_id: parsed.data.workflow_id
    });
  }
);

app.get(
  "/api/v1/outcome-evidence",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    // TODO(auth): replace ambient org header auth with a scoped read token for value-realization consumers.
    const parsed = OutcomeEvidenceQuerySchema.safeParse({
      workflow_id: req.query.workflow_id,
      period_start: req.query.period_start,
      period_end: req.query.period_end,
      jbtd_id: req.query.jbtd_id,
      persona_id: req.query.persona_id
    });
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid outcome evidence query",
        reason: "INVALID_QUERY",
        details: parsed.error.flatten()
      });
    }

    const orgId = req.authOrgId;
    if (!orgId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const loadedEvents = await loadFluencyEventRecords({ dbOrgId: orgId });
    const scopedEvents = loadedEvents.filter((event) => eventBelongsToAuthOrg(event, orgId));
    const periodEnd = new Date(parsed.data.period_end);
    const rows = orgId
      ? buildObservabilityRollup(scopedEvents, orgId, "90d", { now: periodEnd })
      : [];
    const row = rows.find(
      (entry) =>
        entry.workflow_id === parsed.data.workflow_id &&
        (entry.jbtd_id ?? null) === (parsed.data.jbtd_id ?? null) &&
        (entry.persona_id ?? null) === (parsed.data.persona_id ?? null)
    );
    const verdict = row?.disclosure === "ALLOWED" ? "SURFACE" : "SUPPRESS";
    const outcomeEvidence = await listOutcomeEvidence(orgId, parsed.data);
    const aivm = outcomeEvidenceAivmFields(
      scopedEvents,
      parsed.data.workflow_id,
      parsed.data.jbtd_id ?? null,
      parsed.data.persona_id ?? null,
      parsed.data.period_start,
      parsed.data.period_end
    );

    return res.json({
      workflow_id: parsed.data.workflow_id,
      verdict,
      suppression_reason:
        verdict === "SURFACE" ? null : toOutcomeEvidenceSuppressionReason(row?.suppression_reasons) ?? "INSUFFICIENT_VOLUME",
      value_type: aivm.value_type,
      evidence_grade: aivm.evidence_grade,
      reliability_factor: row?.reliability_factor ?? null,
      outcome_evidence: outcomeEvidence.map((record) => ({
        evidence_id: record.evidence_id,
        outcome_metric: record.outcome_metric,
        outcome_unit: record.outcome_unit,
        period_start: record.period_start,
        period_end: record.period_end,
        aggregate_value: record.aggregate_value,
        cohort_size: record.cohort_size,
        source_system: record.source_system,
        ingested_at: record.ingested_at
      }))
    });
  }
);

app.get(
  "/api/traces/reconstructed",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const parsed = TraceReconstructedQuerySchema.safeParse({
      workflow_id: typeof req.query.workflow_id === "string" ? req.query.workflow_id : undefined,
      execution_id: typeof req.query.execution_id === "string" ? req.query.execution_id : undefined,
      baseline_window:
        typeof req.query.baseline_window === "string" ? req.query.baseline_window : undefined
    });
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid query",
        details: parsed.error.flatten()
      });
    }
    const loadedEvents = await loadFluencyEventRecords({ dbOrgId: req.authOrgId });
    const events = loadedEvents.filter((event) => {
      if (!req.authOrgId) {
        return true;
      }
      return (
        typeof event.org_unit === "string" &&
        (event.org_unit === `org:${req.authOrgId}` || event.org_unit.startsWith(`org:${req.authOrgId}:`))
      );
    });
    const traces = reconstructTracesForQuery(events, parsed.data);
    const includeSignals =
      req.query.include_signals === "true" ||
      req.query.include_signals === "1" ||
      req.query.include_signals === "yes";
    if (includeSignals) {
      const withSignals = attachPhase2ToTraces(traces, events, {
        baselineWindow: parsed.data.baseline_window ?? "90d",
        now: new Date()
      });
      return res.json({ traces: applyDisclosureToTraces(withSignals) });
    }
    return res.json({ traces });
  }
);

app.get(
  "/api/observability/:orgId",
  rbacMiddleware(["ADMIN", "GOV_OPERATOR", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    if (req.authOrgId && req.authOrgId !== req.params.orgId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Org scope mismatch"
      });
    }
    const windowParsed = FluencyWindowSchema.safeParse(req.query.window ?? "60d");
    if (!windowParsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }
    const observationWindow = windowParsed.data;
    const fluencyEvents = await loadFluencyEventRecords({ dbOrgId: org.id });
    const workflows = buildObservabilityRollup(
      fluencyEvents,
      org.id,
      observationWindow,
      { minDisclosedExecutions: MIN_COHORT_SIZE, now: new Date() }
    );
    await auditSuppressedObservabilityRows(org.id, workflows);
    const payload = {
      org_id: org.id,
      observation_window: observationWindow,
      workflows: workflows.filter(
        (workflow) =>
          workflow.disclosure === "ALLOWED" ||
          (workflow.jbtd_id === null && workflow.persona_id === null)
      )
    };
    const validated = ObservabilityResponseSchema.safeParse(payload);
    if (!validated.success) {
      return res.status(500).json({ error: "Internal response shape error" });
    }
    return res.json(validated.data);
  }
);
app.get(
  "/orgs/:orgId/suppression-audit-log",
  rbacMiddleware(["ADMIN"]),
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    return res.json({ logs: listSuppressionAuditLogs(org.id) });
  }
);
app.get(
  "/api/patterns",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const windowParsed = FluencyWindowSchema.safeParse(req.query.window ?? "60d");
    const scopeParsed = FluencyScopeSchema.safeParse(req.query.scope ?? "org");

    if (!windowParsed.success || !scopeParsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }

    if (scopeParsed.data !== "org") {
      return res.status(400).json({
        error: "Unsupported scope for inference records",
        supported_scopes: ["org"],
        requested_scope: scopeParsed.data
      });
    }

    const window = windowParsed.data;
    const records = store.patternInferenceRecords.filter((record) =>
      matchesWindow(record, window)
    );

    const workflowIds = new Set(records.map((record) => workflowIdFromScopeKey(record.scope_key)));
    const cohortSize = workflowIds.size;

    if (cohortSize < MIN_COHORT_SIZE) {
      return res.status(400).json({
        error: "Cohort below minimum size",
        cohort_size: cohortSize,
        min_cohort_size: MIN_COHORT_SIZE
      });
    }

    const patternCopy = {
      CALIBRATED_FLUENCY: {
        name: "Calibrated Fluency",
        what_we_see: "Accepted outputs appear alongside regular verification touchpoints and light edits.",
        might_suggest: "This signal may reflect steady calibration between automation and human review.",
        does_not_mean: "This does NOT mean outcomes are guaranteed or that any group is ahead of another.",
        posture: "Scale"
      },
      BLIND_EFFICIENCY: {
        name: "Blind Efficiency",
        what_we_see: "Acceptance rates appear high while verification signals remain limited.",
        might_suggest: "This signal may reflect a speed-first flow with lighter verification coverage.",
        does_not_mean: "This does NOT mean outputs are correct or that scrutiny is unnecessary.",
        posture: "Study"
      },
      RECOVERY_MATURITY: {
        name: "Recovery Maturity",
        what_we_see: "Recovery loops appear with resolution and limited escalation.",
        might_suggest: "This signal may reflect maturing correction habits when automation needs adjustment.",
        does_not_mean: "This does NOT mean issues will stop appearing or that attention is no longer needed.",
        posture: "Stabilize"
      },
      FRICTION_LOOP: {
        name: "Friction Loop",
        what_we_see: "Repeated edits or overrides cluster in the current window.",
        might_suggest: "This signal may reflect friction in prompts, handoffs, or verification steps.",
        does_not_mean: "This does NOT mean any individual or small team is struggling.",
        posture: "Study"
      },
      UNDERTRUST_AVOIDANCE: {
        name: "Undertrust Avoidance",
        what_we_see: "Verification and abandonment signals rise alongside rejections.",
        might_suggest: "This signal may reflect cautious adoption in higher-risk moments.",
        does_not_mean: "This does NOT mean the system is unsafe or that the approach should be paused.",
        posture: "Stabilize"
      },
      NO_PATTERN: {
        name: "No Pattern",
        what_we_see: "Signals are insufficient to classify a pattern.",
        might_suggest: "Coverage may be limited for this window.",
        does_not_mean: "This does NOT mean activity is absent.",
        posture: "Study"
      }
    } as const;

    const signalStatusMap = {
      WITHHOLD: "Emerging Pattern",
      LOW: "Emerging Pattern",
      MEDIUM: "Observed Behavioral Shift",
      HIGH: "Sustained Pattern"
    } as const;

    const totalDays = WINDOW_DAYS[window];
    const patterns = records
      .filter(
        (record) =>
          record.pattern !== "NO_PATTERN" &&
          ["MEDIUM", "HIGH"].includes(record.confidence_level)
      )
      .map((record) => {
        const copy = patternCopy[record.pattern];
        return {
          pattern_name: copy.name,
          signal_status: signalStatusMap[record.confidence_level],
          confidence: record.confidence_level === "HIGH" ? "High" : "Medium",
          window: windowParsed.data,
          risk_context: "medium",
          coverage: Math.min(1, record.coverage_days / totalDays),
          what_we_see: copy.what_we_see,
          might_suggest: copy.might_suggest,
          does_not_mean: copy.does_not_mean,
          recommended_posture: copy.posture
        };
      });

    return res.json({
      window: windowParsed.data,
      scope: scopeParsed.data,
      cohort_size: cohortSize,
      patterns
    });
  }
);

app.get(
  "/api/coverage",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const windowParsed = FluencyWindowSchema.safeParse(req.query.window ?? "60d");
    const scopeParsed = FluencyScopeSchema.safeParse(req.query.scope ?? "org");

    if (!windowParsed.success || !scopeParsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }

    const window = windowParsed.data;
    const records = store.patternInferenceRecords.filter((record) =>
      matchesWindow(record, window)
    );

    const workflowIds = new Set(records.map((record) => workflowIdFromScopeKey(record.scope_key)));
    const cohortSize = workflowIds.size;

    if (cohortSize < MIN_COHORT_SIZE) {
      return res.status(400).json({
        error: "Cohort below minimum size",
        cohort_size: cohortSize,
        min_cohort_size: MIN_COHORT_SIZE
      });
    }

    const activeWorkflows = new Set(
      records
        .filter((record) => record.pattern !== "NO_PATTERN" && ["MEDIUM", "HIGH"].includes(record.confidence_level))
        .map((record) => workflowIdFromScopeKey(record.scope_key))
    ).size;

    const coverage = cohortSize === 0 ? 0 : activeWorkflows / cohortSize;

    return res.json({
      window: windowParsed.data,
      cohort_size: cohortSize,
      coverage,
      verification_rate: null,
      risk_mix: {
        low: null,
        medium: null,
        high: null
      }
    });
  }
);

app.get(
  "/api/evidence/bundles/:orgId",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const windowRaw = typeof req.query.window === "string" ? req.query.window : "weekly";
    if (!EVIDENCE_WINDOWS.has(windowRaw)) {
      return res.status(400).json({
        error: "Invalid query",
        reason_code: "invalid_payload",
        field_path: "window",
        supported_windows: Array.from(EVIDENCE_WINDOWS)
      });
    }

    const fluencyEvents = await loadFluencyEventRecords({ dbOrgId: req.params.orgId });
    const bundle = buildEvidenceBundle(req.params.orgId, windowRaw as EvidenceBundleWindow, fluencyEvents);
    return res.json(bundle);
  }
);

app.get(
  "/api/evidence/coverage/:orgId",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const windowRaw = typeof req.query.window === "string" ? req.query.window : "weekly";
    if (!EVIDENCE_WINDOWS.has(windowRaw)) {
      return res.status(400).json({
        error: "Invalid query",
        reason_code: "invalid_payload",
        field_path: "window",
        supported_windows: Array.from(EVIDENCE_WINDOWS)
      });
    }

    const fluencyEvents = await loadFluencyEventRecords({ dbOrgId: req.params.orgId });
    const bundle = buildEvidenceBundle(req.params.orgId, windowRaw as EvidenceBundleWindow, fluencyEvents);
    return res.json({
      org_id: bundle.org_id,
      schema_version: bundle.schema_version,
      window: bundle.window,
      generated_at: bundle.generated_at,
      suppression: bundle.suppression,
      coverage: bundle.coverage
    });
  }
);

app.get(
  "/api/evidence/controls/:orgId",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const windowRaw = typeof req.query.window === "string" ? req.query.window : "weekly";
    if (!EVIDENCE_WINDOWS.has(windowRaw)) {
      return res.status(400).json({
        error: "Invalid query",
        reason_code: "invalid_payload",
        field_path: "window",
        supported_windows: Array.from(EVIDENCE_WINDOWS)
      });
    }

    const fluencyEvents = await loadFluencyEventRecords({ dbOrgId: req.params.orgId });
    const bundle = buildEvidenceBundle(req.params.orgId, windowRaw as EvidenceBundleWindow, fluencyEvents);
    return res.json({
      org_id: bundle.org_id,
      schema_version: bundle.schema_version,
      window: bundle.window,
      generated_at: bundle.generated_at,
      suppression: bundle.suppression,
      exposure: bundle.exposure,
      calibration: bundle.calibration,
      fragility: bundle.fragility,
      learning: bundle.learning
    });
  }
);

app.post(
  "/api/ledger",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const parsed = DecisionLedgerCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const createdAt = nowIso();
    const decisionDate = parsed.data.decision.decision_date || createdAt;
    const observationStart = parsed.data.observation?.observation_start ?? decisionDate;
    const observationEnd =
      parsed.data.observation?.observation_end ?? addDays(observationStart, 60);

    const entry = {
      ledger_id: crypto.randomUUID(),
      decision: parsed.data.decision,
      rationale: parsed.data.rationale,
      observation: {
        window_type: "rolling" as const,
        window_length_days: parsed.data.observation?.window_length_days ?? 60,
        observation_start: observationStart,
        observation_end: observationEnd,
        status: "observing" as const
      },
      meta: {
        created_at: createdAt,
        locked_at: createdAt
      }
    };

    insertDecisionLedgerEntry(entry);
    return res.json(entry);
  }
);

app.post(
  "/api/ledger/:id/evaluate",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  async (req, res) => {
    const entry = store.decisionLedgerEntries.get(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Ledger entry not found" });
    }

    const parsed = DecisionLedgerEvaluationInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const observationEnd = new Date(entry.observation.observation_end);
    const observationStart = new Date(entry.observation.observation_start);
    const now = new Date();

    if (Number.isNaN(observationEnd.getTime()) || now < observationEnd) {
      return res.json({
        ledger_id: entry.ledger_id,
        status: "observing",
        observation_end: entry.observation.observation_end
      });
    }

    if (entry.observation.window_length_days < 60) {
      return res.status(400).json({ error: "Observation window too short" });
    }

    const events: FluencyEventRecord[] = await loadFluencyEventRecords({});
    const scoped = filterEventsByScope(events, entry.decision.scope);
    const observationEvents = scoped.filter((event) => {
      const ts = new Date(event.timestamp);
      return !Number.isNaN(ts.getTime()) && ts >= observationStart && ts <= observationEnd;
    });

    const coverage = buildCoverageSummary(observationEvents, "60d").coverage;
    if (coverage < COVERAGE_THRESHOLD) {
      return res.status(400).json({
        error: "Coverage below threshold",
        coverage,
        coverage_threshold: COVERAGE_THRESHOLD
      });
    }

    const evaluationId = crypto.randomUUID();
    const createdAt = nowIso();
    const evaluationRecord = {
      evaluation_id: evaluationId,
      ledger_id: entry.ledger_id,
      evaluation: parsed.data.evaluation,
      meta: {
        coverage_at_evaluation: coverage,
        created_at: createdAt,
        locked_at: createdAt
      }
    };

    insertDecisionLedgerEvaluation(evaluationRecord);

    return res.json({
      ledger_id: entry.ledger_id,
      evaluation_id: evaluationId,
      status: "complete",
      evaluation: evaluationRecord.evaluation,
      meta: evaluationRecord.meta
    });
  }
);

app.get(
  "/api/ledger",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const windowParsed = FluencyWindowSchema.safeParse(req.query.window ?? "60d");
    if (!windowParsed.success) {
      return res.status(400).json({ error: "Invalid query" });
    }

    const start = addDays(nowIso(), -WINDOW_DAYS[windowParsed.data]);
    const startDate = new Date(start);
    const evaluationsByLedger = Array.from(store.decisionLedgerEvaluations.values()).reduce(
      (acc, evaluation) => {
        const list = acc.get(evaluation.ledger_id) ?? [];
        list.push(evaluation);
        acc.set(evaluation.ledger_id, list);
        return acc;
      },
      new Map<string, DecisionLedgerEvaluationRecord[]>()
    );

    const entries = Array.from(store.decisionLedgerEntries.values()).filter((entry) => {
      const decisionDate = new Date(entry.decision.decision_date);
      if (Number.isNaN(decisionDate.getTime())) {
        return true;
      }
      return decisionDate >= startDate;
    });

    const responseEntries = entries.map((entry) => {
      const evaluations = evaluationsByLedger.get(entry.ledger_id) ?? [];
      const latestEvaluation = evaluations.sort((a, b) =>
        a.meta.created_at.localeCompare(b.meta.created_at)
      )[evaluations.length - 1];

      return {
        ...entry,
        evaluation: latestEvaluation?.evaluation ?? entry.evaluation,
        meta: {
          ...entry.meta,
          coverage_at_evaluation: latestEvaluation?.meta.coverage_at_evaluation ?? entry.meta.coverage_at_evaluation
        }
      };
    });

    return res.json({
      window: windowParsed.data,
      entries: responseEntries
    });
  }
);

app.post(
  "/api/seed",
  strictLimiter,
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  (_req, res) => {
    store.fluencyEvents.clear();
    store.fluencyPatterns.clear();
    store.decisionLedgerEntries.clear();
    store.decisionLedgerEvaluations.clear();

    const now = new Date();
    const workflows = Array.from({ length: 8 }, (_, index) => `workflow-${index + 1}`);
    const seededEvents: FluencyEventRecord[] = [];

    for (let dayOffset = 0; dayOffset < 70; dayOffset += 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - dayOffset);
      const timestamp = day.toISOString();
      workflows.forEach((workflowId, index) => {
        const push = (payload: FluencyEvent) => {
          const eventId = crypto.randomUUID();
          const record = buildFluencyEventRecord(payload, eventId);
          seededEvents.push(record);
          insertFluencyEvent(record);
        };
        push({
          event_type: "ai_output_disposition",          timestamp,
          risk_class: index % 3 === 0 ? "high" : index % 2 === 0 ? "medium" : "low",
          org_unit: "org:executive",
          workflow_id: workflowId,
          disposition: dayOffset % 5 === 0 ? "edited" : "accepted",
          edit_distance_bucket: dayOffset % 7 === 0 ? "light" : "none",
          verification_present: dayOffset % 3 !== 0,
          time_to_action_ms: 120000
        });
        if (dayOffset % 6 === 0) {
          push({
            event_type: "ai_recovery_loop",
            timestamp,
            risk_class: "medium",
            org_unit: "org:executive",
            workflow_id: workflowId,
            recovery_type: "re_prompt",            cycles: 2,
            resolution_time_ms: 240000
          });
        }
        if (dayOffset % 4 === 0) {
          push({
            event_type: "verification_signal",
            timestamp,
            risk_class: "medium",
            org_unit: "org:executive",
            workflow_id: workflowId,
            verification_type: "policy_check",            verification_latency_ms: 90000
          });
        }
        if (dayOffset % 9 === 0) {
          push({
            event_type: "ai_abandonment",
            timestamp,
            risk_class: "high",
            org_unit: "org:executive",
            workflow_id: workflowId,
            abandonment_stage: "reviewed",
            reason_bucket: "low_trust"          });
        }
      });
    }

    const entry = {
      ledger_id: crypto.randomUUID(),
      decision: {
        title: "Verification guidance refresh",
        description: "Updated guidance to keep verification steps visible in high-risk workflows.",
        decision_type: "guidance" as const,
        scope: "org" as const,
        decision_date: addDays(nowIso(), -75),
        logged_by_role: "executive" as const
      },
      rationale: {
        primary_pattern: "Calibrated Fluency" as const,
        signal_status_at_decision: "Emerging Pattern" as const,
        confidence_at_decision: "Medium" as const
      },
      observation: {
        window_type: "rolling" as const,
        window_length_days: 60,
        observation_start: addDays(nowIso(), -75),
        observation_end: addDays(nowIso(), -15),
        status: "observing" as const
      },
      meta: {
        created_at: nowIso(),
        locked_at: nowIso()
      }
    };
    insertDecisionLedgerEntry(entry);

    return res.json({ seeded_events: seededEvents.length, seeded_ledger_entries: 1 });
  }
);

app.post(
  "/orgs/:orgId/behavior/import",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const parsed = BehavioralSignalImportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const errors: { index: number; error: string }[] = [];
    let imported = 0;
    let suppressed = 0;
    let rolledUp = 0;

    // Validate that all org_ids match the route parameter
    parsed.data.aggregates.forEach((agg, index) => {
      if (agg.org_id !== org.id) {
        errors.push({ index, error: `org_id mismatch: expected ${org.id}, got ${agg.org_id}` });
      }
    });

    // Filter out errors
    const validAggregates = parsed.data.aggregates.filter((_, index) =>
      !errors.some((e) => e.index === index)
    );

    // Apply suppression and rollup (k=5 for behavioral signals)
    const processedSignals = suppressAndRollupBehavioral(validAggregates, 5);

    // Count suppressed and rolled up
    processedSignals.forEach((signal) => {
      const result = upsertBehavioralSignal(signal);
      if (result.inserted) {
        imported += 1;
      }
      if (signal.suppressed) {
        suppressed += 1;
      }
      if (signal.includesRollup) {
        rolledUp += 1;
      }
    });

    return res.json({
      imported,
      suppressed,
      rolled_up: rolledUp,
      rejected: errors.length,
      errors
    });
  }
);

// Connector-based event import endpoint
app.post(
  "/orgs/:orgId/behavior/connector/import",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const parsed = ConnectorEventImportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    // Validate org_id matches route parameter
    if (parsed.data.org_id !== org.id) {
      return res.status(400).json({ error: `org_id mismatch: expected ${org.id}, got ${parsed.data.org_id}` });
    }

    const unknownEvents = connectorService.findUnknownEvents(parsed.data);
    if (unknownEvents.unknown_event_types.length > 0) {
      const recordId = `quarantine-${crypto.randomUUID()}`;
      store.connectorEventQuarantine.set(recordId, {
        vendor: parsed.data.vendor,
        connector_name: parsed.data.connector_name,
        org_id: parsed.data.org_id,
        group_id: parsed.data.group_id,
        bucket_start: parsed.data.bucket_start,
        unknown_event_types: unknownEvents.unknown_event_types,
        sample_events: unknownEvents.sample_events,
        received_at: new Date().toISOString()
      });
      return res.status(202).json({
        status: "quarantined",
        quarantined_count: unknownEvents.unknown_event_count,
        unknown_event_types: unknownEvents.unknown_event_types
      });
    }

    const invalidEvents = connectorService.findInvalidMappedEvents(parsed.data);
    if (invalidEvents.invalid_event_types.length > 0) {
      const recordId = `quarantine-${crypto.randomUUID()}`;
      store.connectorEventQuarantine.set(recordId, {
        vendor: parsed.data.vendor,
        connector_name: parsed.data.connector_name,
        org_id: parsed.data.org_id,
        group_id: parsed.data.group_id,
        bucket_start: parsed.data.bucket_start,
        unknown_event_types: [],
        invalid_event_types: invalidEvents.invalid_event_types,
        invalid_event_count: invalidEvents.invalid_event_count,
        invalid_sample_events: invalidEvents.sample_events,
        sample_events: [],
        received_at: new Date().toISOString()
      });
      return res.status(202).json({
        status: "quarantined",
        quarantined_count: invalidEvents.invalid_event_count,
        unknown_event_types: [],
        invalid_event_types: invalidEvents.invalid_event_types
      });
    }

    // Transform external events using connector
    const transformResult = connectorService.transformEvents(parsed.data);

    if (!transformResult.success || !transformResult.aggregates) {
      return res.status(400).json({
        error: "Connector transformation failed",
        details: transformResult.errors
      });
    }

    // Apply suppression and rollup (k=5 for behavioral signals)
    const processedSignals = suppressAndRollupBehavioral(transformResult.aggregates as any, 5);

    let imported = 0;
    let suppressed = 0;
    let rolledUp = 0;

    // Store signals
    processedSignals.forEach((signal) => {
      const result = upsertBehavioralSignal(signal);
      if (result.inserted) {
        imported += 1;
      }
      if (signal.suppressed) {
        suppressed += 1;
      }
      if (signal.includesRollup) {
        rolledUp += 1;
      }
    });

    return res.json({
      imported,
      suppressed,
      rolled_up: rolledUp,
      events_processed: parsed.data.events.length,
      signals_generated: transformResult.aggregates.length
    });
  }
);

// List loaded connectors
app.get(
  "/connectors",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const connectors = connectorService.getLoadedConnectors();
    return res.json({ connectors });
  }
);

app.get(
  "/orgs/:orgId/behavior/signals",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const bucketStart = typeof req.query.bucket_start === "string" ? req.query.bucket_start : undefined;
    const groupType = typeof req.query.group_type === "string" ? req.query.group_type : undefined;
    const groupId = typeof req.query.group_id === "string" ? req.query.group_id : undefined;
    const signalName = typeof req.query.signal_name === "string" ? req.query.signal_name : undefined;
    const includeSuppressed = req.query.include_suppressed === "true";

    // Filter signals
    let signals = Array.from(store.behavioralSignals.values()).filter(
      (signal) => signal.org_id === org.id
    );

    if (bucketStart) {
      signals = signals.filter((s) => s.bucket_start === bucketStart);
    }

    if (groupType) {
      signals = signals.filter((s) => s.group_type === groupType);
    }

    if (groupId) {
      signals = signals.filter((s) => s.group_id === groupId);
    }

    if (signalName) {
      signals = signals.filter((s) => s.signal_name === signalName);
    }

    // Exclude suppressed by default
    if (!includeSuppressed) {
      signals = signals.filter((s) => !s.suppressed);
    }

    const suppressedCount = signals.filter((s) => s.suppressed).length;

    return res.json({
      org_id: org.id,
      signals: signals.map((s) => ({
        group_id: s.group_id,
        group_type: s.group_type,
        function_id: s.function_id,
        bucket_start: s.bucket_start,
        signal_name: s.signal_name,
        count: s.count,
        tool_class: s.tool_class,
        suppressed: s.suppressed,
        includes_rollup: s.includesRollup,
        metadata: s.metadata
      })),
      total_count: signals.length,
      suppressed_count: suppressedCount
    });
  }
);

app.get(
  "/orgs/:orgId/behavior/patterns",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }

    const bucketStart = typeof req.query.bucket_start === "string"
      ? req.query.bucket_start
      : undefined;
    const groupType = typeof req.query.group_type === "string"
      ? req.query.group_type
      : "function";
    const groupId = typeof req.query.group_id === "string"
      ? req.query.group_id
      : undefined;

    // Get signals for current week
    let currentSignals = Array.from(store.behavioralSignals.values()).filter(
      (signal) => signal.org_id === org.id
    );

    // Default to latest bucket_start if not specified
    let targetBucket = bucketStart;
    if (!targetBucket) {
      const buckets = currentSignals.map((s) => s.bucket_start).sort();
      targetBucket = buckets[buckets.length - 1];
    }

    if (!targetBucket) {
      return res.json({ org_id: org.id, bucket_start: null, patterns: [] });
    }

    currentSignals = currentSignals.filter((s) => s.bucket_start === targetBucket);

    if (groupType) {
      currentSignals = currentSignals.filter((s) => s.group_type === groupType);
    }

    if (groupId) {
      currentSignals = currentSignals.filter((s) => s.group_id === groupId);
    }

    // Get previous week signals for trend detection
    const previousBucket = getPreviousWeekBucket(targetBucket);
    const previousSignals = Array.from(store.behavioralSignals.values()).filter(
      (signal) =>
        signal.org_id === org.id &&
        signal.bucket_start === previousBucket &&
        (!groupType || signal.group_type === groupType) &&
        (!groupId || signal.group_id === groupId)
    );

    // Group signals by group_id
    const signalsByGroup: Record<string, typeof currentSignals> = {};
    const previousByGroup: Record<string, typeof previousSignals> = {};

    currentSignals.forEach((signal) => {
      if (!signalsByGroup[signal.group_id]) {
        signalsByGroup[signal.group_id] = [];
      }
      signalsByGroup[signal.group_id].push(signal);
    });

    previousSignals.forEach((signal) => {
      if (!previousByGroup[signal.group_id]) {
        previousByGroup[signal.group_id] = [];
      }
      previousByGroup[signal.group_id].push(signal);
    });

    // Detect patterns for each group
    const allPatterns: any[] = [];
    Object.entries(signalsByGroup).forEach(([gid, signals]) => {
      const prev = previousByGroup[gid] ?? [];
      const patterns = detectPatterns(signals, prev, gid, targetBucket);
      allPatterns.push(...patterns);
    });

    return res.json({
      org_id: org.id,
      bucket_start: targetBucket,
      patterns: allPatterns
    });
  }
);

app.get("/ops/failclosed", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), (_req, res) => {
  const byRoute = Array.from(failClosedMetrics.byRoute.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([route, count]) => ({ route, count }));
  const byReason = Array.from(failClosedMetrics.byReason.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));
  return res.json({
    total: failClosedMetrics.total,
    by_route: byRoute,
    by_reason: byReason,
    recent: failClosedMetrics.recent
  });
});

app.get("/ops/metrics", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (_req, res) => {
  incrementOpsCounter("ops_metrics_requests");
  const readiness = await getDatabaseReadiness();
  const complianceStatusRequests = getOpsCounter("compliance_status_requests");
  const complianceStatusSuccess = getOpsCounter("compliance_status_success");
  const complianceStatusFailClosed = getOpsCounter("compliance_status_fail_closed");
  const availabilityTarget = getAvailabilityTarget();
  const availabilityRatio =
    complianceStatusRequests > 0 ? complianceStatusSuccess / complianceStatusRequests : 1;
  const failClosedRate =
    complianceStatusRequests > 0 ? complianceStatusFailClosed / complianceStatusRequests : 0;

  return res.json({
    as_of: nowIso(),
    uptime_seconds: Math.floor((Date.now() - opsMetrics.startedAt) / 1000),
    db_readiness: readiness.status,
    counters: {
      compliance_status_requests: complianceStatusRequests,
      compliance_status_success: complianceStatusSuccess,
      compliance_status_fail_closed: complianceStatusFailClosed,
      fail_closed_total: failClosedMetrics.total,
      health_requests: getOpsCounter("health_requests"),
      health_ok: getOpsCounter("health_ok"),
      health_degraded: getOpsCounter("health_degraded")
    },
    sli: {
      compliance_status_availability: {
        value: Number(availabilityRatio.toFixed(6)),
        target: availabilityTarget,
        breached: availabilityRatio < availabilityTarget
      },
      compliance_status_fail_closed_rate: {
        value: Number(failClosedRate.toFixed(6)),
        target_max: Number((1 - availabilityTarget).toFixed(6)),
        breached: failClosedRate > 1 - availabilityTarget
      }
    },
    alert_context: {
      severity: availabilityRatio < availabilityTarget ? "critical" : failClosedRate > 0 ? "warning" : "ok",
      top_fail_closed_routes: Array.from(failClosedMetrics.byRoute.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([route, count]) => ({ route, count }))
    }
  });
});

app.get("/ops/db/readiness", rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]), async (_req, res) => {
  const readiness = await getDatabaseReadiness();
  if (readiness.status === "not_configured") {
    return res.json({
      status: "not_configured",
      required_tables: [...REQUIRED_PERSISTENCE_TABLES]
    });
  }
  if (readiness.status === "unavailable") {
    return res.status(503).json({
      status: "unavailable",
      error: "database_unavailable",
      details: process.env.NODE_ENV === "production" ? undefined : readiness.error,
      required_tables: [...REQUIRED_PERSISTENCE_TABLES]
    });
  }
  if (readiness.status === "schema_incomplete") {
    return res.status(503).json({
      status: "schema_incomplete",
      table_count: readiness.tableCount,
      missing_tables: readiness.missingTables,
      required_tables: [...REQUIRED_PERSISTENCE_TABLES]
    });
  }
  return res.json({
    status: "ready",
    table_count: readiness.tableCount,
    required_tables: [...REQUIRED_PERSISTENCE_TABLES]
  });
});

app.get("/health", async (_req, res) => {
  incrementOpsCounter("health_requests");
  const readiness = await getDatabaseReadiness();
  if (readiness.status === "not_configured") {
    incrementOpsCounter("health_ok");
    return res.json({ status: "ok", db: "not_configured" });
  }
  if (readiness.status === "ready") {
    incrementOpsCounter("health_ok");
    return res.json({
      status: "ok",
      db: "postgres",
      db_tables: readiness.tableCount,
      fail_closed_total: failClosedMetrics.total
    });
  }
  if (readiness.status === "schema_incomplete") {
    incrementOpsCounter("health_degraded");
    recordFailClosed({
      route: "/health",
      reason: "database_schema_incomplete"
    });
    return res.status(503).json({
      status: "degraded",
      error: "database_schema_incomplete",
      missing_tables: readiness.missingTables,
      fail_closed_total: failClosedMetrics.total,
      details: "Apply pending Prisma migration for compliance persistence models."
    });
  }

  recordFailClosed({
    route: "/health",
    reason: "db_connectivity_check_failed"
  });
  incrementOpsCounter("health_degraded");
  return res.status(503).json({
    status: "degraded",
    error: "database_unavailable",
    fail_closed_total: failClosedMetrics.total,
    details: process.env.NODE_ENV === "production" ? undefined : readiness.error
  });
});

registerAiValueRoutes(app);

// Global error handler middleware - must be defined last
// Catches any unhandled errors from route handlers and middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] Unhandled error: ${err.message}`);

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Validation error", message: err.message });
  }

  // Default to 500 for unhandled errors
  return res.status(500).json({ error: "Internal server error" });
});

export { app };
export default app;
