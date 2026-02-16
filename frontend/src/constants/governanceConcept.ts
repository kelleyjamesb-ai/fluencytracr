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
  id: GovernanceHeroActionId;
  label: string;
  tone: "primary" | "secondary" | "outline";
};

export type GovernanceHeroActionId = "org_signals" | "timeline" | "mode_change";

export type GovernanceSignalGroup = {
  heading: string;
  tone: GovernanceTagTone;
  items: string[];
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
  { id: "org_signals", label: "View Org Signal Board", tone: "primary" },
  { id: "timeline", label: "Open Governance Timeline", tone: "secondary" },
  { id: "mode_change", label: "Admin: Request Mode Change", tone: "outline" }
];

export const GOVERNANCE_HERO_COPY = {
  badge: "Product Intent Locked",
  title: "Fluency signals, not surveillance.",
  subtitle:
    "This governance-first concept prioritizes organizational evidence operations. Suppressed states are explicit, confidence is directional, and all state-changing actions are audit-aware."
} as const;

export const GOVERNANCE_ROLE_ACTIONS_FOOTER_COPY =
  "Intent-aligned UI rules: directional language, auditable actions, safe defaults, and visible suppression semantics.";

export const GOVERNANCE_PAGE_COPY = {
  lowerPanelSignalsLabel: "Signals Summary",
  lowerPanelDocumentsLabel: "Document Workspace",
  legacyDashboardLabel: "Open Legacy Dashboard"
} as const;

export const GOVERNANCE_EXEC_SIGNAL_SECTION = {
  title: "Organizational Signal Health",
  subtitle:
    "Aggregated hotspot trends for governance alignment. This view is directional and never used for individual evaluation."
} as const;

export const GOVERNANCE_EXEC_SIGNAL_GROUPS: GovernanceSignalGroup[] = [
  {
    heading: "Strengthening Signals",
    tone: "good",
    items: [
      "Human review actions are consistently observed before external delegation.",
      "Policy mapping refreshes are occurring with stable cadence."
    ]
  },
  {
    heading: "Watchlist Signals",
    tone: "warn",
    items: [
      "Unresolved clause decisions are accumulating in selected policy areas.",
      "Compliance timeline refresh intervals show intermittent gaps."
    ]
  },
  {
    heading: "Muted Signals",
    tone: "danger",
    items: [
      "Signals withheld due to insufficient volume in protected slices.",
      "Signals suppressed where ambiguity blocks safe interpretation."
    ]
  }
];

export const GOVERNANCE_EXEC_MEANING_LINES = [
  "Reflects: Group-level momentum across teams or functions.",
  "Does not mean: Any person is being rated, ranked, or scored.",
  "Reflects: Aggregated patterns over time, not one-off events.",
  "Does not mean: A compliance breach or disciplinary trigger."
] as const;

export const GOVERNANCE_FORBIDDEN_TERMS = [
  "underperformer",
  "low performer",
  "failing",
  "disciplinary action",
  "non-compliant employee",
  "productivity score",
  "ranked bottom",
  "PIP candidate"
] as const;
