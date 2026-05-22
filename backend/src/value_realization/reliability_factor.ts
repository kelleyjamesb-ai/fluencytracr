export type ReliabilityComponents = {
  abandonment_rate: number;
  friction_loop_rate: number;
  recovery_success_rate: number;
  verification_presence_rate: number;
};

export type ReliabilityCounts = {
  total: number;
  abandonment: number;
  frictionLoop: number;
  recoverySuccess: number;
  verificationPresence: number;
};

type CanonicalReliabilityEvent = {
  event_name?: string;
  abandonment_present?: boolean | null;
  iteration_depth?: string | null;
  recovery_present?: boolean | null;
  verification_present?: boolean | null;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const round = (value: number): number => Number(value.toFixed(3));

const boundedRate = (count: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }
  return round(clamp01(count / total));
};

export const reliabilityComponentsFromCounts = (counts: ReliabilityCounts): ReliabilityComponents => ({
  abandonment_rate: boundedRate(counts.abandonment, counts.total),
  friction_loop_rate: boundedRate(counts.frictionLoop, counts.total),
  recovery_success_rate: boundedRate(counts.recoverySuccess, counts.total),
  verification_presence_rate: boundedRate(counts.verificationPresence, counts.total)
});

export const reliabilityComponentsFromCanonicalEvents = (
  events: ReadonlyArray<CanonicalReliabilityEvent> | undefined
): ReliabilityComponents => {
  const observed = {
    abandonment: 0,
    frictionLoop: 0,
    recoverySuccess: 0,
    verificationPresence: 0
  };
  const positive = {
    abandonment: 0,
    frictionLoop: 0,
    recoverySuccess: 0,
    verificationPresence: 0
  };

  for (const event of events ?? []) {
    switch (event.event_name) {
      case "FT_V1_ABANDONMENT_OBSERVED":
        observed.abandonment += 1;
        if (event.abandonment_present === true) {
          positive.abandonment += 1;
        }
        break;
      case "FT_V1_ITERATION_DEPTH_OBSERVED":
        observed.frictionLoop += 1;
        if (event.iteration_depth === "HEAVY") {
          positive.frictionLoop += 1;
        }
        break;
      case "FT_V1_RECOVERY_OBSERVED":
        observed.recoverySuccess += 1;
        if (event.recovery_present === true) {
          positive.recoverySuccess += 1;
        }
        break;
      case "FT_V1_VERIFICATION_PRESENCE_OBSERVED":
        observed.verificationPresence += 1;
        if (event.verification_present === true) {
          positive.verificationPresence += 1;
        }
        break;
      default:
        break;
    }
  }

  return {
    abandonment_rate: boundedRate(positive.abandonment, observed.abandonment),
    friction_loop_rate: boundedRate(positive.frictionLoop, observed.frictionLoop),
    recovery_success_rate: boundedRate(positive.recoverySuccess, observed.recoverySuccess),
    verification_presence_rate: boundedRate(
      positive.verificationPresence,
      observed.verificationPresence
    )
  };
};

export const computeReliabilityFactor = (components: ReliabilityComponents): number => {
  const raw =
    0.5 +
    0.25 * clamp01(components.verification_presence_rate) +
    0.25 * clamp01(components.recovery_success_rate) -
    0.25 * clamp01(components.abandonment_rate) -
    0.25 * clamp01(components.friction_loop_rate);

  return round(clamp01(raw));
};
