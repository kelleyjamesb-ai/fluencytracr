import crypto from "crypto";

import { store, EmployeeRecord } from "./store";

export type RosterRow = {
  employee_id: string;
  team_id: string;
  role_id: string;
};

export type RosterImportResult = {
  imported: number;
  skipped: number;
  rejected: number;
};

const REQUIRED_HEADERS = ["employee_id", "team_id", "role_id"] as const;

export const hashEmployeeId = (employeeId: string): string => {
  return crypto.createHash("sha256").update(employeeId).digest("hex");
};

const parseCsvLine = (line: string): string[] => {
  return line.split(",").map((value) => value.trim());
};

export const parseRosterCsv = (csv: string): RosterRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }
  const headers = parseCsvLine(lines[0]);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing headers: ${missingHeaders.join(", ")}`);
  }
  const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return {
      employee_id: values[headerIndex.employee_id] ?? "",
      team_id: values[headerIndex.team_id] ?? "",
      role_id: values[headerIndex.role_id] ?? ""
    };
  });
};

const ensureEmployeeRecord = (orgId: string, employeeHash: string): EmployeeRecord => {
  const key = `${orgId}:${employeeHash}`;
  const existing = store.employees.get(key);
  if (existing) {
    return existing;
  }
  const record: EmployeeRecord = {
    orgId,
    employeeHash,
    teamIds: new Set<string>(),
    roleIds: new Set<string>()
  };
  store.employees.set(key, record);
  return record;
};

export const importRoster = (orgId: string, csv: string): RosterImportResult => {
  const rows = parseRosterCsv(csv);
  let imported = 0;
  let skipped = 0;
  let rejected = 0;

  rows.forEach((row) => {
    if (!row.employee_id || !row.team_id || !row.role_id) {
      rejected += 1;
      return;
    }
    const team = store.teams.get(row.team_id);
    const role = store.roles.get(row.role_id);
    if (!team || team.orgId !== orgId || !role || role.orgId !== orgId) {
      rejected += 1;
      return;
    }
    const employeeHash = hashEmployeeId(row.employee_id);
    const record = ensureEmployeeRecord(orgId, employeeHash);
    const beforeTeams = record.teamIds.size;
    const beforeRoles = record.roleIds.size;
    record.teamIds.add(row.team_id);
    record.roleIds.add(row.role_id);
    if (record.teamIds.size === beforeTeams && record.roleIds.size === beforeRoles) {
      skipped += 1;
    } else {
      imported += 1;
    }
  });

  return { imported, skipped, rejected };
};
