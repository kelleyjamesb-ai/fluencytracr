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

export type Role = "admin" | "exec" | "enablement_lead";

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  admin: [
    "VIEW_ORG_AGGREGATES",
    "VIEW_TEAM_AGGREGATES",
    "MANAGE_ORG_CONFIG",
    "INGEST_DATA"
  ],
  exec: ["VIEW_ORG_AGGREGATES"],
  enablement_lead: ["VIEW_ORG_AGGREGATES", "VIEW_TEAM_AGGREGATES", "INGEST_DATA"]
};

export const roleHasCapability = (role: Role, capability: Capability) => {
  return ROLE_CAPABILITIES[role].includes(capability);
};

export const validateCapabilities = () => {
  const forbidden = new Set(FORBIDDEN_CAPABILITIES);
  Object.values(ROLE_CAPABILITIES).forEach((caps) => {
    caps.forEach((capability) => {
      if (forbidden.has(capability)) {
        throw new Error("Forbidden capability assigned to role");
      }
    });
  });
};
