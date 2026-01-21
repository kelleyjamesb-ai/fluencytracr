export const DRIVER_LIBRARY = {
  CALIBRATED_FLUENCY: [
    "Verification present alongside acceptance",
    "Edits remain light",
    "Recovery loops are contained"
  ],
  BLIND_EFFICIENCY: [
    "High acceptance with limited verification",
    "Low recovery loop activity",
    "Edits are infrequent"
  ],
  RECOVERY_MATURITY: [
    "Recovery loops resolve without escalation",
    "Overrides are controlled",
    "Latency remains consistent"
  ],
  FRICTION_LOOP: [
    "Edit ratio elevated",
    "Repeated overrides observed",
    "Abandonment signals increased"
  ],
  UNDERTRUST_AVOIDANCE: [
    "Verification intensity elevated",
    "Abandonment rate rising",
    "Rejection signals present"
  ],
  NO_PATTERN: [
    "Signals are insufficient",
    "Coverage does not meet thresholds"
  ]
};

export const getTopDrivers = (pattern: keyof typeof DRIVER_LIBRARY) => {
  const drivers = DRIVER_LIBRARY[pattern];
  return drivers.slice(0, Math.min(4, Math.max(2, drivers.length)));
};
