import { EnablementEventType } from "./enablement";
import { store, EnablementEventRecord, EnablementRollupRecord } from "./store";

const EVENT_TYPES: EnablementEventType[] = [
  "assessment_pre",
  "assessment_post",
  "session_attended",
  "everboarding_touch"
];

const emptyCounts = () => {
  return EVENT_TYPES.reduce<Record<EnablementEventType, number>>((acc, eventType) => {
    acc[eventType] = 0;
    return acc;
  }, {} as Record<EnablementEventType, number>);
};

const eventDay = (timestamp: string) => new Date(timestamp).toISOString().slice(0, 10);

export const runDailyEnablementRollup = (orgId: string, day: string): EnablementRollupRecord[] => {
  const org = store.orgs.get(orgId);
  if (!org) {
    return [];
  }
  const relevant = Array.from(store.enablementEvents.values()).filter((event) => {
    return event.orgId === orgId && eventDay(event.timestamp) === day;
  });
  const grouped = new Map<string, { counts: Record<EnablementEventType, number>; total: number }>();
  relevant.forEach((event) => {
    const key = `${event.orgId}:${event.teamId}:${event.roleId}`;
    const current = grouped.get(key) ?? { counts: emptyCounts(), total: 0 };
    const eventType = event.eventType as EnablementEventType;
    current.counts[eventType] += 1;
    current.total += 1;
    grouped.set(key, current);
  });

  const rollups: EnablementRollupRecord[] = [];
  grouped.forEach((value, key) => {
    const [orgKey, teamId, roleId] = key.split(":");
    const suppressed = value.total < org.minGroupSize;
    const assessmentDelta = Math.min(value.counts.assessment_post, value.counts.assessment_pre);
    const everboardingCadence = value.counts.everboarding_touch;
    const enabled = value.counts.assessment_post + value.counts.session_attended > 0;
    const record: EnablementRollupRecord = {
      orgId: orgKey,
      teamId,
      roleId,
      day,
      totalEvents: value.total,
      percentEnabledByRole: suppressed ? null : enabled ? 1 : 0,
      assessmentDelta: suppressed ? null : assessmentDelta,
      everboardingCadence: suppressed ? null : everboardingCadence,
      suppressed
    };
    const recordKey = `${orgKey}:${teamId}:${roleId}:${day}`;
    store.enablementRollups.set(recordKey, record);
    rollups.push(record);
  });

  return rollups;
};

export const runEnablementRollupsForEvents = (
  orgId: string,
  events: EnablementEventRecord[]
): EnablementRollupRecord[] => {
  const days = new Set(events.map((event) => eventDay(event.timestamp)));
  const rollups: EnablementRollupRecord[] = [];
  days.forEach((day) => {
    rollups.push(...runDailyEnablementRollup(orgId, day));
  });
  return rollups;
};
