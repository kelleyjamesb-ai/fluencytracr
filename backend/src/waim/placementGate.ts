import crypto from "crypto";
import type { Waim, WaimPlacement } from "./waim";

export type PlacementContext = {
  role: string | null;
  workflow: string | null;
  signal: string | null;
  trigger_event: string | null;
  trigger_phase: string | null;
  trigger_before: string | null;
  trigger_without_human_use: string | null;
  session_start: Date | null;
  workflow_step: string | null;
  session_event_count: number;
  now: Date;
};

const matchesPlacement = (placement: WaimPlacement, context: PlacementContext): boolean => {
  if (!context.role || !context.workflow || !context.signal || !context.trigger_event) {
    return false;
  }
  if (
    placement.role !== context.role ||
    placement.workflow !== context.workflow ||
    placement.signal !== context.signal
  ) {
    return false;
  }
  if ("phase" in placement.trigger) {
    return (
      placement.trigger.event === context.trigger_event &&
      placement.trigger.phase === context.trigger_phase &&
      placement.trigger.before === context.trigger_before
    );
  }
  if ("without_human_use" in placement.trigger) {
    return (
      placement.trigger.event === context.trigger_event &&
      String(placement.trigger.without_human_use) === context.trigger_without_human_use
    );
  }
  return false;
};

const applyAntiHabitGuard = (placement: WaimPlacement, context: PlacementContext): boolean => {
  if (!context.session_start || !context.workflow_step) {
    return true;
  }

  const workflowStepHash = crypto
    .createHash("sha256")
    .update(context.workflow_step)
    .digest("hex");

  if (!workflowStepHash) {
    return true;
  }

  if (placement.suppression.repeat_within_session && context.session_event_count > 1) {
    return true;
  }

  if (placement.suppression.same_workflow_step && context.session_event_count > 1) {
    return true;
  }

  if ("multiple_corrections" in placement.suppression && context.session_event_count > 1) {
    return true;
  }

  if ("rapid_retries" in placement.suppression && context.session_event_count > 1) {
    return true;
  }

  const elapsedMs = context.now.getTime() - context.session_start.getTime();
  if (placement.suppression.cooldown_ms > 0 && elapsedMs < placement.suppression.cooldown_ms) {
    return true;
  }

  if (placement.appearance.non_deterministic) {
    const roll = crypto.randomInt(0, 2);
    if (roll === 0) {
      return true;
    }
  }

  return false;
};

export const shouldSuppressPlacement = (waim: Waim | null, context: PlacementContext): boolean => {
  if (!waim) {
    return true;
  }

  const placement = waim.placements.find((entry) => matchesPlacement(entry, context));
  if (!placement) {
    return true;
  }

  if (placement.enforcement.fail_closed) {
    if (applyAntiHabitGuard(placement, context)) {
      return true;
    }
  }

  return false;
};
