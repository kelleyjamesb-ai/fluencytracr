import { FORBIDDEN_FIELDS } from "@learnaire/shared";
import { store } from "./store";
import { ALLOWED_SCOPES } from "./query_scope";

export const DEFAULT_SIGNAL_SOURCES = [
  "training_platform",
  "support_ticketing",
  "code_review"
] as const;

export const DEFAULT_COLLECTED_DATA = [
  "aggregated_metrics",
  "policy_controls",
  "enablement_rollups"
] as const;

export const buildTransparencyReport = (orgId: string) => {
  if (!store.orgs.has(orgId)) {
    return null;
  }
  return {
    org_id: orgId,
    collected_data: DEFAULT_COLLECTED_DATA,
    never_collected: Array.from(FORBIDDEN_FIELDS),
    aggregation_rules: ALLOWED_SCOPES,
    enabled_signal_sources: DEFAULT_SIGNAL_SOURCES
  };
};
