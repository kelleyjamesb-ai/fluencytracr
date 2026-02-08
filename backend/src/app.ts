import crypto from "crypto";
import express from "express";
import cookieParser from "cookie-parser";
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
  FluencyScopeSchema,
  FluencyWindowSchema,
  DecisionLedgerCreateSchema,
  DecisionLedgerEvaluationInputSchema,
  OrientationSignalResponseSchema
} from "@learnaire/shared";
import type { FluencyEvent } from "@learnaire/shared";
import { assertGovernanceEnforcement, assertJwtSecretConfigured } from "./config/enforcement";
import { authMiddleware } from "./auth/authMiddleware";
import { signJwt } from "./auth/jwt";
import { findUser, verifyPassword } from "./auth/users";
import { rbacMiddleware, enforceAggregation } from "./rbac";
import { forbiddenFieldsMiddleware } from "./middleware/forbiddenFieldsMiddleware";
import { ambiguityMiddleware } from "./middleware/ambiguityMiddleware";
import { schemaVersionMiddleware } from "./middleware/schemaVersionMiddleware";
import {
  store,
  upsertControl,
  upsertEnablement,
  upsertGroup,
  upsertMetric,
  upsertBehavioralSignal,
  EnablementEventRecord,
  MetricRecord,
  insertFluencyEvent,
  insertDecisionLedgerEntry,
  insertDecisionLedgerEvaluation
} from "./store";
import type { DecisionLedgerEvaluationRecord, FluencyEventRecord } from "./store";
import { suppressAndRollup as suppressAndRollupBehavioral } from "./behavioral_signals";
import { detectPatterns, getPreviousWeekBucket } from "./behavioral_patterns";
import { EnablementEventType, EnablementEventInput, generateEventId, parseEnablementCsv, parsePayload } from "./enablement";
import { runEnablementRollupsForEvents } from "./enablement_rollups";
import { ToolClass, TOOL_CLASSES, normalizeSeenTimestamp } from "./tool_inventory";
import { ensureToolClass, ensureUsageShape, normalizeUsageTimestamp } from "./usage_shape";
import { runSpreadRollupForOrg } from "./spread_metrics";
import { importRoster } from "./roster";
import { suppressAndRollup } from "./suppression";
import { runFluencyIndexJob } from "./fluency_service";
import { enforceScopeWhitelist, hasDisallowedScopes } from "./query_scope";
import { buildTransparencyReport } from "./transparency";
import { ConnectorService } from "./connectors";
import { listAuditLogs, logAuditEvent } from "./audit_log";
import { findForbiddenField } from "./validation/forbiddenFields";
import {
  buildCoverageSummary,
  COVERAGE_THRESHOLD,
  filterEventsByScope,
  MIN_COHORT_SIZE,
  WINDOW_DAYS
} from "./fluencytracr";
import { INFERENCE_VERSION, parameterHash } from "./inference/versioning";
import { Phase1IngestPayloadSchema } from "./phase1/contract";
import { evaluateDecision } from "./phase1/evaluateDecision";
import { surfaceDecision } from "./phase1/surfaceDecision";
import * as path from "path";

const app = express();

assertGovernanceEnforcement();
assertJwtSecretConfigured();
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});

const SUPPORTED_INFERENCE_WINDOWS = new Set(["30d", "60d"]);

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

const matchesWindow = (record: { window_start: string; window_end: string }, window: string) => {
  if (window !== "30d" && window !== "60d") {
    return false;
  }
  const start = new Date(record.window_start);
  const end = new Date(record.window_end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return days === (window === "30d" ? 30 : 60);
};

const workflowIdFromScopeKey = (scopeKey: string) => {
  return scopeKey.split(":")[0] ?? scopeKey;
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

const respondGovernanceSuppressed = (res: express.Response) => {
  return res.status(404).json({ error: "Governance suppressed" });
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

// --- Auth endpoints ---
// POST /auth/login is allowlisted in authMiddleware (unauthenticated access)
app.post("/auth/login", async (req, res) => {
  const { username, password: credential } = req.body ?? {};
  if (typeof username !== "string" || !username) {
    return res.status(400).json({ error: "Bad request", message: "username is required" });
  }
  if (typeof credential !== "string" || !credential) {
    return res.status(400).json({ error: "Bad request", message: "password is required" });
  }

  try {
    const user = findUser(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(credential, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await signJwt({ sub: user.username, role: user.role });
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      maxAge: 15 * 60 * 1000
    });
    return res.json({ status: "authenticated", role: user.role });
  } catch {
    return res.status(503).json({ error: "Authentication service unavailable" });
  }
});

// GET /auth/me is NOT allowlisted — requires valid JWT
app.get("/auth/me", (req, res) => {
  return res.json({ sub: req.sub, role: req.role });
});

// --- Application routes ---
app.post("/orgs", strictLimiter, rbacMiddleware(["ADMIN"]), async (req, res) => {
  const parsed = OrgCreateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid org payload" });
  }
  const id = `org-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  store.orgs.set(id, {
    id,
    name: parsed.data.name,
    minGroupSize: parsed.data.minGroupSize ?? 10,
    createdAt
  });
  const defaultRoles = ["Admin", "Exec Viewer", "Enablement Lead"];
  defaultRoles.forEach((roleName) => {
    const roleId = `role-${crypto.randomUUID()}`;
    store.roles.set(roleId, { id: roleId, orgId: id, name: roleName });
  });
  await logAuditEvent({ orgId: id, actorSub: req.sub!, actorRole: req.role!, eventType: "org_create", metadata: { name: parsed.data.name } });
  return res.status(201).json({
    org_id: id,
    name: parsed.data.name,
    created_at: createdAt,
    min_group_size: parsed.data.minGroupSize ?? 10
  });
});

app.get("/orgs/:orgId/teams", rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]), (req, res) => {
  const teams = Array.from(store.teams.values()).filter((team) => team.orgId === req.params.orgId);
  return res.json({ teams });
});

app.post("/orgs/:orgId/teams", rbacMiddleware(["ADMIN"]), async (req, res) => {
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
  await logAuditEvent({ orgId: org.id, actorSub: req.sub!, actorRole: req.role!, eventType: "team_create", metadata: { teamId } });
  return res.status(201).json(record);
});

app.patch("/orgs/:orgId/teams/:teamId", rbacMiddleware(["ADMIN"]), async (req, res) => {
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
  await logAuditEvent({ orgId: req.params.orgId, actorSub: req.sub!, actorRole: req.role!, eventType: "team_update", metadata: { teamId: team.id } });
  return res.json(updated);
});

app.delete("/orgs/:orgId/teams/:teamId", rbacMiddleware(["ADMIN"]), async (req, res) => {
  const team = store.teams.get(req.params.teamId);
  if (!team || team.orgId !== req.params.orgId) {
    return res.status(404).json({ error: "Team not found" });
  }
  store.teams.delete(team.id);
  store.employees.forEach((record) => {
    record.teamIds.delete(team.id);
  });
  await logAuditEvent({ orgId: req.params.orgId, actorSub: req.sub!, actorRole: req.role!, eventType: "team_delete", metadata: { teamId: team.id } });
  return res.status(204).send();
});

app.get("/orgs/:orgId/roles", rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]), (req, res) => {
  const roles = Array.from(store.roles.values()).filter((role) => role.orgId === req.params.orgId);
  return res.json({ roles });
});

app.post("/orgs/:orgId/roles", rbacMiddleware(["ADMIN"]), async (req, res) => {
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
  await logAuditEvent({ orgId: org.id, actorSub: req.sub!, actorRole: req.role!, eventType: "role_create", metadata: { roleId } });
  return res.status(201).json(record);
});

app.patch("/orgs/:orgId/roles/:roleId", rbacMiddleware(["ADMIN"]), async (req, res) => {
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
  await logAuditEvent({ orgId: req.params.orgId, actorSub: req.sub!, actorRole: req.role!, eventType: "role_update", metadata: { roleId: role.id } });
  return res.json(updated);
});

app.delete("/orgs/:orgId/roles/:roleId", rbacMiddleware(["ADMIN"]), async (req, res) => {
  const role = store.roles.get(req.params.roleId);
  if (!role || role.orgId !== req.params.orgId) {
    return res.status(404).json({ error: "Role not found" });
  }
  store.roles.delete(role.id);
  store.employees.forEach((record) => {
    record.roleIds.delete(role.id);
  });
  await logAuditEvent({ orgId: req.params.orgId, actorSub: req.sub!, actorRole: req.role!, eventType: "role_delete", metadata: { roleId: role.id } });
  return res.status(204).send();
});

app.post(
  "/orgs/:orgId/roster/import",
  rbacMiddleware(["ADMIN"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/enablement/import",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  express.text({ type: "text/csv" }),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/orgs/:orgId/tools",
  rbacMiddleware(["ADMIN"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/orgs/:orgId/usage-shape",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post("/orgs/:orgId/groups", rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]), schemaVersionMiddleware, forbiddenFieldsMiddleware, async (req, res) => {
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
  await logAuditEvent({ orgId: org.id, actorSub: req.sub!, actorRole: req.role!, eventType: "group_upsert", metadata: { inserted, updated } });
  return res.json({ inserted, updated, rejected });
});

app.post(
  "/orgs/:orgId/metrics/import",
  strictLimiter,
  rbacMiddleware(["ADMIN"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/orgs/:orgId/controls/import",
  rbacMiddleware(["ADMIN"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/orgs/:orgId/enablement/import",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

// WP-09 DELETED: POST /api/v1/ingest
// Phase 6B-B enforcement ordering audit found this route persists events
// (appendPhase1Events) BEFORE evaluation or suppression. No ambiguityMiddleware,
// no evaluateDecision() call. Ambiguous events were stored without any gate.
// Directive: "DELETE the path. Do not patch or buffer."

app.post(
  "/api/v1/decision",
  strictLimiter,
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  forbiddenFieldsMiddleware,
  async (req, res) => {
    const parsed = Phase1IngestPayloadSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }
    const decision = evaluateDecision(parsed.data.events);
    await logAuditEvent({ orgId: parsed.data.events[0]?.org_id ?? "unknown", actorSub: req.sub!, actorRole: req.role!, eventType: "decision_evaluate", metadata: { eventCount: parsed.data.events.length } });
    return res.json(surfaceDecision(decision));
  }
);

app.post(
  "/api/ingest",
  strictLimiter,
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  ambiguityMiddleware,
  async (req, res) => {
    await logAuditEvent({ orgId: "ingest", actorSub: req.sub!, actorRole: req.role!, eventType: "event_ingest", metadata: {} });
    res.status(202).json({ status: "accepted" });
  }
);

app.get(
  "/api/orientation/:orgId",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (req, res) => {
    const orgId = req.params.orgId;
    if (!store.orgs.has(orgId)) {
      return res.status(404).json({ error: "Org not found" });
    }

    const sessionScopeNote =
      "Session Scope Note: “Session” refers to a bounded, transient interaction context and carries no temporal continuity across sessions.";

    const sessionStartRaw =
      typeof req.query.session_start === "string" ? req.query.session_start : null;
    const now = new Date();
    const sessionStart = sessionStartRaw ? new Date(sessionStartRaw) : null;
    const role = typeof req.query.role === "string" ? req.query.role : null;
    const workflow = typeof req.query.workflow === "string" ? req.query.workflow : null;
    const signal = typeof req.query.signal === "string" ? req.query.signal : null;
    const triggerEvent =
      typeof req.query.trigger_event === "string" ? req.query.trigger_event : null;
    const triggerPhase =
      typeof req.query.trigger_phase === "string" ? req.query.trigger_phase : null;
    const triggerBefore =
      typeof req.query.trigger_before === "string" ? req.query.trigger_before : null;
    const triggerWithoutHumanUse =
      typeof req.query.trigger_without_human_use === "string"
        ? req.query.trigger_without_human_use
        : null;
    const workflowStep =
      typeof req.query.workflow_step === "string" ? req.query.workflow_step : null;

    const observationState = (() => {
      if (!sessionStartRaw || !sessionStart || Number.isNaN(sessionStart.getTime())) {
        return "SUPPRESSED" as const;
      }

      // Phase 3 reconciliation: descriptive-only WAIM. Fail closed regardless of context.
      return "SUPPRESSED" as const;
    })();

    const response = {
      org_id: orgId,
      observation_detected: {
        state: observationState,
        session_scope_note: sessionScopeNote,
        does_not_mean: [
          "This does not imply usage volume or frequency.",
          "This does not imply interaction quality.",
          "This does not imply adoption, engagement, or readiness.",
          "This does not imply progress, improvement, or momentum.",
          "This does not imply organizational maturity or success."
        ]
      },
      suppression_in_effect: {
        state: "IN_EFFECT" as const,
        does_not_mean: [
          "This does not imply the system detected a problem.",
          "This does not imply risk increased or decreased.",
          "This does not imply a corrective action occurred.",
          "This does not imply compliance posture improved.",
          "This does not imply progress, maturity, or success."
        ]
      },
      generated_at: nowIso()
    };

    const validated = OrientationSignalResponseSchema.safeParse(response);
    if (!validated.success) {
      return res.status(500).json({ error: "Orientation response contract violation" });
    }

    return res.json(validated.data);
  }
);

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
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get(
  "/orgs/:orgId/dashboard/export.csv",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get(
  "/orgs/:orgId/dashboard/export.pdf",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get(
  "/orgs/:orgId/audit-log",
  rbacMiddleware(["ADMIN"]),
  async (req, res) => {
    const org = store.orgs.get(req.params.orgId);
    if (!org) {
      return res.status(404).json({ error: "Org not found" });
    }
    await logAuditEvent({ orgId: org.id, actorSub: req.sub!, actorRole: req.role!, eventType: "audit_log_read", metadata: {} });
    const logs = await listAuditLogs(org.id);
    return res.json({ logs });
  }
);

app.get(
  "/orgs/:orgId/telemetry/index",
  rbacMiddleware(["ADMIN"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get(
  "/api/dashboard",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  enforceAggregation,
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/api/events",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  ambiguityMiddleware,
  async (req, res) => {
    const parsed = FluencyEventIngestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const eventIds = parsed.data.events.map((event) => {
      const eventId = crypto.randomUUID();
      insertFluencyEvent({ ...event, event_id: eventId });
      return eventId;
    });

    await logAuditEvent({ orgId: "global", actorSub: req.sub!, actorRole: req.role!, eventType: "event_create", metadata: { count: eventIds.length } });
    return res.json({ status: "accepted", event_ids: eventIds });
  }
);

app.get(
  "/api/patterns",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get(
  "/api/coverage",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/api/ledger",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/api/ledger/:id/evaluate",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get(
  "/api/ledger",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/api/seed",
  strictLimiter,
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.post(
  "/orgs/:orgId/behavior/import",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
);

// Connector-based event import endpoint
app.post(
  "/orgs/:orgId/behavior/connector/import",
  rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
  schemaVersionMiddleware,
  forbiddenFieldsMiddleware,
  (_req, res) => respondGovernanceSuppressed(res)
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
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get(
  "/orgs/:orgId/behavior/patterns",
  rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
  (_req, res) => respondGovernanceSuppressed(res)
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

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
