import { store, SpreadRollupRecord } from "./store";

const dayKey = (timestamp: string) => new Date(timestamp).toISOString().slice(0, 10);

export const runDailySpreadRollup = (orgId: string, day: string): SpreadRollupRecord | null => {
  const org = store.orgs.get(orgId);
  if (!org) {
    return null;
  }
  const teams = Array.from(store.teams.values()).filter((team) => team.orgId === orgId);
  const totalTeams = teams.length;
  const records = Array.from(store.toolInventory.values()).filter(
    (record) => record.orgId === orgId && dayKey(record.lastSeen) === day
  );
  const byTeam = new Map<string, number>();
  records.forEach((record) => {
    byTeam.set(record.teamId, (byTeam.get(record.teamId) ?? 0) + 1);
  });
  const teamsWithAi = byTeam.size;
  const totalSignals = Array.from(byTeam.values()).reduce((sum, count) => sum + count, 0);
  const concentrationIndex = totalSignals
    ? Array.from(byTeam.values()).reduce((sum, count) => sum + (count / totalSignals) ** 2, 0)
    : 0;
  const suppressed = totalTeams > 0 && totalTeams < org.minGroupSize;
  const record: SpreadRollupRecord = {
    orgId,
    day,
    totalTeams,
    teamsWithAi,
    percentTeamsWithAi: suppressed || totalTeams === 0 ? null : teamsWithAi / totalTeams,
    adoptionSpread: suppressed || totalTeams === 0 ? null : teamsWithAi / totalTeams,
    concentrationIndex: suppressed || totalTeams === 0 ? null : concentrationIndex,
    suppressed
  };
  store.spreadRollups.set(`${orgId}:${day}`, record);
  return record;
};

export const runSpreadRollupForOrg = (orgId: string, timestamp: string): SpreadRollupRecord | null => {
  return runDailySpreadRollup(orgId, dayKey(timestamp));
};
