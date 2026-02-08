/**
 * Phase 7 — Audit Rollback-on-Failure Proof Tests
 *
 * Proves: when logAuditEvent() fails, NO in-memory state mutation survives.
 * Each handler's rollback is verified via deep equality of snapshotted structures.
 */

// jest.mock MUST be hoisted before any import that transitively loads audit_log
jest.mock("../src/audit_log", () => {
  const actual = jest.requireActual("../src/audit_log");
  return { __esModule: true, ...actual, logAuditEvent: jest.fn(actual.logAuditEvent) };
});

import { app } from "../src/app";
import { store } from "../src/store";
import { logAuditEvent } from "../src/audit_log";
import { requestApp, loginAs, withAuth, withSchemaVersion } from "./test_helpers";

const mockedAudit = logAuditEvent as jest.Mock;

const ORG_ID = "org-rollback-test";
let adminCookie: string;

beforeAll(async () => {
  adminCookie = await loginAs(app, "ADMIN");
});

beforeEach(() => {
  mockedAudit.mockReset();
  // Default: reject with DB_DOWN (overridden per-test if needed)
  mockedAudit.mockRejectedValue(new Error("DB_DOWN"));

  store.reset();
  store.orgs.set(ORG_ID, {
    id: ORG_ID,
    name: "Rollback Test Org",
    minGroupSize: 10,
    createdAt: new Date().toISOString(),
  });
});

// Snapshot helpers
const snapMap = <V>(m: Map<string, V>): Map<string, V> => new Map(m);
const snapEmployeeSets = () => {
  const snap = new Map<string, { teamIds: Set<string>; roleIds: Set<string> }>();
  store.employees.forEach((rec, id) => {
    snap.set(id, { teamIds: new Set(rec.teamIds), roleIds: new Set(rec.roleIds) });
  });
  return snap;
};
const assertEmployeeSetsMatch = (before: ReturnType<typeof snapEmployeeSets>) => {
  before.forEach(({ teamIds, roleIds }, empId) => {
    const current = store.employees.get(empId);
    expect(current).toBeDefined();
    expect(current!.teamIds).toEqual(teamIds);
    expect(current!.roleIds).toEqual(roleIds);
  });
};

// ═════════════════════════════════════════════════════════════════════════
// MULTI-MAP HANDLERS (3)
// ═════════════════════════════════════════════════════════════════════════

describe("Rollback — POST /orgs (multi-map: orgs + roles)", () => {
  it("returns 500 and leaves no org or default roles on audit failure", async () => {
    const orgsBefore = snapMap(store.orgs);
    const rolesBefore = snapMap(store.roles);

    const res = await requestApp(app, {
      method: "POST",
      path: "/orgs",
      headers: withAuth(adminCookie),
      body: { name: "Ghost Org" },
    });

    expect(res.status).toBe(500);
    expect(store.orgs).toEqual(orgsBefore);
    expect(store.roles).toEqual(rolesBefore);
  });
});

describe("Rollback — DELETE /orgs/:orgId/teams/:teamId (multi-map: teams + employees.teamIds)", () => {
  const TEAM_ID = "team-rollback-del";
  const EMP_ID = "emp-rollback-1";

  beforeEach(() => {
    store.teams.set(TEAM_ID, { id: TEAM_ID, orgId: ORG_ID, name: "Doomed Team" });
    store.employees.set(EMP_ID, {
      orgId: ORG_ID,
      employeeHash: "hash1",
      teamIds: new Set([TEAM_ID, "team-other"]),
      roleIds: new Set(["role-x"]),
    });
  });

  it("returns 500 and restores team + employee teamIds on audit failure", async () => {
    const teamsBefore = snapMap(store.teams);
    const empBefore = snapEmployeeSets();

    const res = await requestApp(app, {
      method: "DELETE",
      path: `/orgs/${ORG_ID}/teams/${TEAM_ID}`,
      headers: withAuth(adminCookie),
    });

    expect(res.status).toBe(500);
    expect(store.teams).toEqual(teamsBefore);
    assertEmployeeSetsMatch(empBefore);
  });
});

describe("Rollback — DELETE /orgs/:orgId/roles/:roleId (multi-map: roles + employees.roleIds)", () => {
  const ROLE_ID = "role-rollback-del";
  const EMP_ID = "emp-rollback-2";

  beforeEach(() => {
    store.roles.set(ROLE_ID, { id: ROLE_ID, orgId: ORG_ID, name: "Doomed Role" });
    store.employees.set(EMP_ID, {
      orgId: ORG_ID,
      employeeHash: "hash2",
      teamIds: new Set(["team-a"]),
      roleIds: new Set([ROLE_ID, "role-other"]),
    });
  });

  it("returns 500 and restores role + employee roleIds on audit failure", async () => {
    const rolesBefore = snapMap(store.roles);
    const empBefore = snapEmployeeSets();

    const res = await requestApp(app, {
      method: "DELETE",
      path: `/orgs/${ORG_ID}/roles/${ROLE_ID}`,
      headers: withAuth(adminCookie),
    });

    expect(res.status).toBe(500);
    expect(store.roles).toEqual(rolesBefore);
    assertEmployeeSetsMatch(empBefore);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// SINGLE-MAP HANDLERS (5)
// ═════════════════════════════════════════════════════════════════════════

describe("Rollback — POST /orgs/:orgId/teams (single-map: teams)", () => {
  it("returns 500 and adds no team on audit failure", async () => {
    const teamsBefore = snapMap(store.teams);

    const res = await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/teams`,
      headers: withAuth(adminCookie),
      body: { name: "Ghost Team" },
    });

    expect(res.status).toBe(500);
    expect(store.teams).toEqual(teamsBefore);
  });
});

describe("Rollback — PATCH /orgs/:orgId/teams/:teamId (single-map: teams)", () => {
  const TEAM_ID = "team-rollback-patch";

  beforeEach(() => {
    store.teams.set(TEAM_ID, { id: TEAM_ID, orgId: ORG_ID, name: "Original Name" });
  });

  it("returns 500 and restores original team on audit failure", async () => {
    const teamsBefore = snapMap(store.teams);

    const res = await requestApp(app, {
      method: "PATCH",
      path: `/orgs/${ORG_ID}/teams/${TEAM_ID}`,
      headers: withAuth(adminCookie),
      body: { name: "Changed Name" },
    });

    expect(res.status).toBe(500);
    expect(store.teams).toEqual(teamsBefore);
    expect(store.teams.get(TEAM_ID)!.name).toBe("Original Name");
  });
});

describe("Rollback — POST /orgs/:orgId/roles (single-map: roles)", () => {
  it("returns 500 and adds no role on audit failure", async () => {
    const rolesBefore = snapMap(store.roles);

    const res = await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/roles`,
      headers: withAuth(adminCookie),
      body: { name: "Ghost Role" },
    });

    expect(res.status).toBe(500);
    expect(store.roles).toEqual(rolesBefore);
  });
});

describe("Rollback — PATCH /orgs/:orgId/roles/:roleId (single-map: roles)", () => {
  const ROLE_ID = "role-rollback-patch";

  beforeEach(() => {
    store.roles.set(ROLE_ID, { id: ROLE_ID, orgId: ORG_ID, name: "Original Role" });
  });

  it("returns 500 and restores original role on audit failure", async () => {
    const rolesBefore = snapMap(store.roles);

    const res = await requestApp(app, {
      method: "PATCH",
      path: `/orgs/${ORG_ID}/roles/${ROLE_ID}`,
      headers: withAuth(adminCookie),
      body: { name: "Changed Role" },
    });

    expect(res.status).toBe(500);
    expect(store.roles).toEqual(rolesBefore);
    expect(store.roles.get(ROLE_ID)!.name).toBe("Original Role");
  });
});

describe("Rollback — POST /api/events (single-map: fluencyEvents)", () => {
  it("returns 500 and adds no fluency events on audit failure", async () => {
    const eventsBefore = snapMap(store.fluencyEvents);

    const res = await requestApp(app, {
      method: "POST",
      path: "/api/events",
      headers: { ...withAuth(adminCookie), ...withSchemaVersion() },
      body: {
        events: [
          {
            event_type: "ai_output_disposition",
            timestamp: new Date().toISOString(),
            risk_class: "low",
            workflow_id: "wf-1",
            disposition: "accepted",
            edit_distance_bucket: "none",
            verification_present: false,
            time_to_action_ms: 100,
          },
        ],
      },
    });

    expect(res.status).toBe(500);
    expect(store.fluencyEvents).toEqual(eventsBefore);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// GROUP UPSERT SPECIAL CASE
// ═════════════════════════════════════════════════════════════════════════

describe("Rollback — POST /orgs/:orgId/groups (groups map: insert + update)", () => {
  const EXISTING_KEY = `${ORG_ID}:existing-group`;

  beforeEach(() => {
    store.groups.set(EXISTING_KEY, {
      orgId: ORG_ID,
      groupKey: "existing-group",
      groupType: "department",
    });
  });

  it("returns 500 and restores all groups to pre-call state on audit failure", async () => {
    const groupsBefore = snapMap(store.groups);

    const res = await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/groups`,
      headers: { ...withAuth(adminCookie), ...withSchemaVersion() },
      body: {
        groups: [
          { group_key: "existing-group", group_type: "CHANGED" },
          { group_key: "new-group", group_type: "team" },
        ],
      },
    });

    expect(res.status).toBe(500);
    expect(store.groups).toEqual(groupsBefore);
    expect(store.groups.get(EXISTING_KEY)!.groupType).toBe("department");
    expect(store.groups.has(`${ORG_ID}:new-group`)).toBe(false);
  });
});
