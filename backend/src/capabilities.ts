export const ALLOWED_CAPABILITIES = [
  "VIEW_ORG_AGGREGATES",
  "VIEW_TEAM_AGGREGATES",
  "MANAGE_ORG_CONFIG",
  "INGEST_DATA"
] as const;

export const FORBIDDEN_CAPABILITIES = [
  "VIEW_INDIVIDUAL_ACTIVITY",
  "VIEW_RAW_EVENTS"
] as const;

export type Capability = (typeof ALLOWED_CAPABILITIES)[number];

export type Role = "ADMIN" | "EXEC_VIEWER" | "ENABLEMENT_LEAD";

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  ADMIN: [
    "VIEW_ORG_AGGREGATES",
    "VIEW_TEAM_AGGREGATES",
    "MANAGE_ORG_CONFIG",
    "INGEST_DATA"
  ],
  EXEC_VIEWER: ["VIEW_ORG_AGGREGATES"],
  ENABLEMENT_LEAD: ["VIEW_ORG_AGGREGATES", "VIEW_TEAM_AGGREGATES", "INGEST_DATA"]
};

export const roleHasCapability = (role: Role, capability: Capability) => {
  return ROLE_CAPABILITIES[role].includes(capability);
};

export const validateCapabilities = () => {
  const forbidden = new Set(FORBIDDEN_CAPABILITIES as readonly string[]);
  Object.values(ROLE_CAPABILITIES).forEach((caps) => {
    caps.forEach((capability) => {
      if (forbidden.has(capability)) {
        throw new Error("Forbidden capability assigned to role");
      }
    });
  });
};
