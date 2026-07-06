// Planned vs actual duration helpers for appointment efficiency.
import { differenceInMinutes } from "date-fns";

export type EfficiencyStatus = "early" | "on_time" | "overrun" | "in_progress" | "unknown";

export interface Efficiency {
  planned: number;          // mins
  actual: number | null;    // mins (null if not started)
  delta: number | null;     // actual - planned
  status: EfficiencyStatus;
  label: string;            // short badge text
}

const ON_TIME_TOLERANCE = 5; // minutes either side counts as on-time

export function computeEfficiency(job: {
  started_at?: string | null;
  completed_at?: string | null;
  service_catalog?: { duration_minutes?: number | null } | null;
}): Efficiency {
  const planned = job.service_catalog?.duration_minutes ?? 45;
  const startedAt = job.started_at ? new Date(job.started_at) : null;
  const completedAt = job.completed_at ? new Date(job.completed_at) : null;

  if (!startedAt) {
    return { planned, actual: null, delta: null, status: "unknown", label: `~${planned}m` };
  }

  if (!completedAt) {
    const elapsed = Math.max(0, differenceInMinutes(new Date(), startedAt));
    const delta = elapsed - planned;
    return {
      planned,
      actual: elapsed,
      delta,
      status: "in_progress",
      label: delta > 0 ? `+${delta}m over` : `${elapsed}/${planned}m`,
    };
  }

  const actual = Math.max(0, differenceInMinutes(completedAt, startedAt));
  const delta = actual - planned;
  let status: EfficiencyStatus;
  let label: string;
  if (delta < -ON_TIME_TOLERANCE) {
    status = "early";
    label = `${delta}m early`;
  } else if (delta > ON_TIME_TOLERANCE) {
    status = "overrun";
    label = `+${delta}m over`;
  } else {
    status = "on_time";
    label = "On time";
  }
  return { planned, actual, delta, status, label };
}

export function efficiencyClasses(status: EfficiencyStatus): string {
  switch (status) {
    case "early":       return "bg-accent/15 text-accent border-accent/30";
    case "on_time":     return "bg-primary/10 text-primary border-primary/30";
    case "overrun":     return "bg-warning/15 text-warning-foreground border-warning/40";
    case "in_progress": return "bg-muted text-foreground border-border";
    default:            return "bg-muted/50 text-muted-foreground border-border/60";
  }
}
