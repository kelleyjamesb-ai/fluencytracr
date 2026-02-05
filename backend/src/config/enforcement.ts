const PRIMARY_ENV = "GOVERNANCE_ENFORCEMENT" as const;
const SECONDARY_ENVS = [
  "FLUENCYTRACR_GOVERNANCE_ENFORCEMENT",
  "GOVERNANCE_ENFORCEMENT_MODE",
  "ENFORCEMENT_MODE"
] as const;

type EnforcementConfig = {
  enabled: true;
  source: typeof PRIMARY_ENV;
};

const readEnforcementConfig = (): EnforcementConfig => {
  const configured: string[] = [];
  if (process.env[PRIMARY_ENV]) {
    configured.push(PRIMARY_ENV);
  }
  SECONDARY_ENVS.forEach((key) => {
    if (process.env[key]) {
      configured.push(key);
    }
  });

  if (configured.length === 0) {
    throw new Error(
      `[GOVERNANCE] ${PRIMARY_ENV} must be explicitly set to "ON" to start.`
    );
  }

  if (configured.length > 1) {
    throw new Error(
      `[GOVERNANCE] Conflicting enforcement flags detected: ${configured.join(", ")}`
    );
  }

  if (configured[0] !== PRIMARY_ENV) {
    throw new Error(
      `[GOVERNANCE] Enforcement must be configured only via ${PRIMARY_ENV}.`
    );
  }

  if (process.env[PRIMARY_ENV] !== "ON") {
    throw new Error(
      `[GOVERNANCE] ${PRIMARY_ENV} must be "ON"; disabling enforcement is not permitted in TG5.`
    );
  }

  return { enabled: true, source: PRIMARY_ENV };
};

export const GOVERNANCE_ENFORCEMENT = readEnforcementConfig();

export const assertGovernanceEnforcement = (): EnforcementConfig => GOVERNANCE_ENFORCEMENT;
