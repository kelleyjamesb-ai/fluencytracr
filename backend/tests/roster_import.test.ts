import { importRoster, hashEmployeeId } from "../src/roster";
import { store } from "../src/store";

const setupOrg = () => {
  const orgId = "org-1";
  store.orgs.set(orgId, { id: orgId, name: "Org", minGroupSize: 10, createdAt: "now" });
  store.teams.set("team-1", { id: "team-1", orgId, name: "Team One" });
  store.roles.set("role-1", { id: "role-1", orgId, name: "Role One" });
  return orgId;
};

beforeEach(() => {
  store.reset();
});

it("hashes employee identifiers before storage", () => {
  const hashed = hashEmployeeId("employee@example.com");
  expect(hashed).toHaveLength(64);
  expect(hashed).not.toEqual("employee@example.com");
});

it("deduplicates roster imports", () => {
  const orgId = setupOrg();
  const csv = "employee_id,team_id,role_id\nemp-1,team-1,role-1\n";
  const first = importRoster(orgId, csv);
  const second = importRoster(orgId, csv);
  expect(first).toEqual({ imported: 1, skipped: 0, rejected: 0 });
  expect(second).toEqual({ imported: 0, skipped: 1, rejected: 0 });
  const employeeHash = hashEmployeeId("emp-1");
  const record = store.employees.get(`${orgId}:${employeeHash}`);
  expect(record?.teamIds.has("team-1")).toBe(true);
  expect(record?.roleIds.has("role-1")).toBe(true);
});
