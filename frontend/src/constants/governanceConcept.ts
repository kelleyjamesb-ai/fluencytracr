export type GovernanceTagTone = "good" | "warn" | "danger";

export type GovernanceTaggedItem = {
  label: string;
  state: string;
  stateClass: GovernanceTagTone;
};

export type GovernanceKpi = {
  label: string;
  value: string;
};

export type GovernanceTimelineItem = {
  title: string;
  detail: string;
};

export type GovernanceHeroAction = {
  label: string;
  tone: "primary" | "secondary" | "outline";
};

export const DESIGN_STANCE_ITEMS: GovernanceTaggedItem[] = [
  { label: "No user-level drilldowns", state: "ENFORCED", stateClass: "good" },
  { label: "Ambiguity defaults to suppress", state: "ENFORCED", stateClass: "good" },
  { label: "Role-gated admin actions", state: "REVIEWED", stateClass: "warn" },
  { label: "Raw content exposure risk", state: "BLOCKED", stateClass: "danger" }
];

export const ROLE_AWARE_ACTION_ITEMS: GovernanceTaggedItem[] = [
  { label: "EXEC_VIEWER can read signal summaries", state: "ALLOW", stateClass: "good" },
  { label: "ENABLEMENT_LEAD can inspect adoption trend", state: "ALLOW", stateClass: "good" },
  { label: "EXEC_VIEWER toggles compliance mode", state: "DENY", stateClass: "danger" },
  { label: "ADMIN exports governed event log", state: "CONFIRM", stateClass: "warn" }
];

export const GOVERNANCE_KPIS: GovernanceKpi[] = [
  { label: "Signal Confidence", value: "74%" },
  { label: "Suppression Rate", value: "19%" },
  { label: "Governance Posture", value: "Shadow" }
];

export const GOVERNANCE_TIMELINE_ITEMS: GovernanceTimelineItem[] = [
  {
    title: "Pattern surfaced (org scope)",
    detail: "Directional: delegation-with-review increased over last 60d"
  },
  {
    title: "Suppression applied",
    detail: "Reason: insufficient volume at team slice, rolled up safely"
  },
  {
    title: "Mode update requested",
    detail: "Pending admin confirmation and policy evidence check"
  }
];

export const GOVERNANCE_HERO_ACTIONS: GovernanceHeroAction[] = [
  { label: "View Org Signal Board", tone: "primary" },
  { label: "Open Governance Timeline", tone: "secondary" },
  { label: "Admin: Request Mode Change", tone: "outline" }
];

export const GOVERNANCE_ROLE_ACTIONS_FOOTER_COPY =
  "Intent-aligned UI rules: directional language, auditable actions, safe defaults, and visible suppression semantics.";
