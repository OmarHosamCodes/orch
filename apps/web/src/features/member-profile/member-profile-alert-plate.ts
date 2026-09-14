export type AlertPlateKind =
  | "abnormal_day"
  | "month_pace"
  | "quarter_pace"
  | "waste_spike"
  | "custom";

export type AlertPlateContext = {
  hours?: number;
  projectedHours?: number;
  requiredHours?: number;
  loggedHours?: number;
  wasteRatio?: number;
};

export type AlertPlateTone = "warning" | "danger" | "info";

export type AlertPlateModel = {
  shortLabel: string;
  metric: string;
  tone: AlertPlateTone;
  chartRatio: number | null;
};

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

function alertPlateShortLabel(kind: AlertPlateKind): string {
  switch (kind) {
    case "abnormal_day":
      return "Day hours";
    case "month_pace":
      return "Month pace";
    case "quarter_pace":
      return "Quarter pace";
    case "waste_spike":
      return "Waste share";
    case "custom":
      return "Manager note";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function alertPlateTone(kind: AlertPlateKind): AlertPlateTone {
  switch (kind) {
    case "abnormal_day":
    case "waste_spike":
      return "danger";
    case "month_pace":
    case "quarter_pace":
      return "warning";
    case "custom":
      return "info";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildAlertPlate(
  kind: AlertPlateKind,
  context: AlertPlateContext,
  options?: { title?: string },
): AlertPlateModel {
  const shortLabel = alertPlateShortLabel(kind);
  const tone = alertPlateTone(kind);

  switch (kind) {
    case "abnormal_day": {
      const hours = context.hours;
      return {
        shortLabel,
        metric: typeof hours === "number" ? formatHours(hours) : "—",
        tone,
        chartRatio:
          typeof hours === "number" &&
          typeof context.requiredHours === "number" &&
          context.requiredHours > 0
            ? Math.min(1, hours / (context.requiredHours + 4))
            : 0.72,
      };
    }
    case "month_pace":
    case "quarter_pace": {
      const projected = context.projectedHours;
      const required = context.requiredHours;
      return {
        shortLabel,
        metric: typeof projected === "number" ? formatHours(projected) : "—",
        tone,
        chartRatio:
          typeof projected === "number" && typeof required === "number" && required > 0
            ? Math.min(1, Math.max(0.08, projected / required))
            : 0.4,
      };
    }
    case "waste_spike": {
      const ratio = context.wasteRatio;
      const pct = typeof ratio === "number" ? Math.round(ratio * 100) : null;
      return {
        shortLabel,
        metric: pct === null ? "—" : `${pct}%`,
        tone,
        chartRatio: typeof ratio === "number" ? Math.min(1, Math.max(0, ratio)) : 0.18,
      };
    }
    case "custom": {
      const title = options?.title?.trim();
      return {
        shortLabel,
        metric: title ? title.slice(0, 8) : "—",
        tone,
        chartRatio: null,
      };
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
