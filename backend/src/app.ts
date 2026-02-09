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
  FluencyScopeSchema,
  FluencyWindowSchema,
  DecisionLedgerCreateSchema,
  DecisionLedgerEvaluationInputSchema
} from "@learnaire/shared";
import type { FluencyEvent } from "@learnaire/shared";
import { rbacMiddleware, enforceAggregation } from "./rbac";
import { forbiddenFieldsMiddleware } from "./middleware/forbiddenFieldsMiddleware";
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
import { Prisma } from "@prisma/client";
import { getPrisma } from "./db";
import { Prisma } from "@prisma/client";
import {
  buildCoverageSummary,
  COVERAGE_THRESHOLD,
  filterEventsByScope,
  MIN_COHORT_SIZE,
  WINDOW_DAYS
} from "./fluencytracr";
import { INFERENCE_VERSION, parameterHash } from "./inference/versioning";
import * as path from "path";

const app = express();
app.use(express.json());

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

app.post("/orgs", strictLimiter, (req, res) => {
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
  return res.status(201).json({
    org_id: id,
    name: parsed.data.name,
    created_at: createdAt,
    min_group_size: parsed.data.minGroupSize ?? 10
  });
});

app.get("/orgs/:orgId/teams", (req, res) => {
  const teams = Array.from(store.teams.values()).filter((team) => team.orgId === req.params.orgId);
  return res.json({ teams });
});

app.post("/orgs/:orgId/teams", (req, res) => {
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

app.patch("/orgs/:orgId/teams/:teamId", (req, res) => {
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

app.delete("/orgs/:orgId/teams/:teamId", (req, res) => {
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

app.post("/orgs/:orgId/roles", (req, res) => {
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

app.patch("/orgs/:orgId/roles/:roleId", (req, res) => {
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

app.delete("/orgs/:orgId/roles/:roleId", (req, res) => {
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

app.post("/orgs/:orgId/groups", schemaVersionMiddleware, forbiddenFieldsMiddleware, (req, res) => {
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

  runFluencyIndexJob(org.id);
  return res.json({ inserted, updated, rejected });
});

app.post("/orgs/:orgId/controls/import", schemaVersionMiddleware, forbiddenFieldsMiddleware, (req, res) => {
  const org = store.orgs.get(req.params.orgId);
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  const rows = Array.isArray(req.body?.observations) ? req.body.observations : [];
  const { accepted, rejected } = validateRows(rows, PolicyControlObservationSchema);
  let inserted = 0;
  let updated = 0;
  accepted.forEach((row) => {
    const result = upsertControl({ ...row, orgId: org.id });
    if (result.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  });
  return res.json({ inserted, updated, rejected });
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

app.post("/api/ingest", strictLimiter, schemaVersionMiddleware, forbiddenFieldsMiddleware, (_req, res) => {
  res.status(202).json({ status: "accepted" });
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
    const actorRole = req.header("x-role") ?? "EXEC_VIEWER";
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
    const actorRole = req.header("x-role") ?? "EXEC_VIEWER";
    logAuditEvent({
      orgId: org.id,
      action: "dashboard_export",
      actorRole,
      metadata: { format: "csv" }
    });
    res.setHeader("content-type", "text/csv; charset=utf-8");
    return res.status(200).send("metric_name,metric_value\nfluency_index,0\n");
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
    const actorRole = req.header("x-role") ?? "EXEC_VIEWER";
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
    if (!SUPPORTED_INFERENCE_WINDOWS.has(windowParsed.data)) {
      return res.status(400).json({ error: "Unsupported window" });
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
  (req, res) => {
    const parsed = FluencyEventIngestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.message });
    }

    const eventIds = parsed.data.events.map((event) => {
      const eventId = crypto.randomUUID();
      return {
        event_id: eventId,
        schema_version: schemaVersion,
        payload: { ...event, event_id: eventId } as unknown as Prisma.InputJsonValue,
      };
    });

    return res.json({ ingested: eventIds.length, event_ids: eventIds });
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

    if (!SUPPORTED_INFERENCE_WINDOWS.has(windowParsed.data)) {
      return res.status(400).json({ error: "Unsupported window" });
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

    const totalDays = window === "60d" ? 60 : 30;

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

    if (!SUPPORTED_INFERENCE_WINDOWS.has(windowParsed.data)) {
      return res.status(400).json({ error: "Unsupported window" });
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
  (req, res) => {
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

    const events: FluencyEventRecord[] = Array.from(store.fluencyEvents.values());
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
        seededEvents.push({
          event_id: crypto.randomUUID(),
          event_type: "ai_output_disposition" as const,
          timestamp,
          risk_class: index % 3 === 0 ? "high" : index % 2 === 0 ? "medium" : "low",
          org_unit: "org:executive",
          workflow_id: workflowId,
          disposition: dayOffset % 5 === 0 ? "edited" : "accepted",
          edit_distance_bucket: dayOffset % 7 === 0 ? "light" : "none",
          verification_present: dayOffset % 3 !== 0,
          time_to_action_ms: 120000
        });
        if (dayOffset % 6 === 0) {
          seededEvents.push({
            event_id: crypto.randomUUID(),
            event_type: "ai_recovery_loop" as const,
            timestamp,
            risk_class: "medium" as const,
            org_unit: "org:executive",
            workflow_id: workflowId,
            recovery_type: "re_prompt" as const,
            cycles: 2,
            resolution_time_ms: 240000
          });
        }
        if (dayOffset % 4 === 0) {
          seededEvents.push({
            event_id: crypto.randomUUID(),
            event_type: "verification_signal" as const,
            timestamp,
            risk_class: "medium" as const,
            org_unit: "org:executive",
            workflow_id: workflowId,
            verification_type: "policy_check" as const,
            verification_latency_ms: 90000
          });
        }
        if (dayOffset % 9 === 0) {
          seededEvents.push({
            event_id: crypto.randomUUID(),
            event_type: "ai_abandonment" as const,
            timestamp,
            risk_class: "high" as const,
            org_unit: "org:executive",
            workflow_id: workflowId,
            abandonment_stage: "reviewed" as const,
            reason_bucket: "low_trust" as const
          });
        }
      });
    }

    seededEvents.forEach((event) => insertFluencyEvent(event));

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
