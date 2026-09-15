import type { DashboardHoursPlateId } from "./dashboard-hours-plate-signal";

export function dashboardHoursPlateMeta(plateId: DashboardHoursPlateId): {
  shortTitle: string;
  destinationHint: string;
  metricLabel: string;
} {
  switch (plateId) {
    case "paid":
      return {
        shortTitle: "Paid",
        destinationHint: "External",
        metricLabel: "Billable client share",
      };
    case "waste":
      return {
        shortTitle: "Waste",
        destinationHint: "External",
        metricLabel: "Non-billable external",
      };
    case "internal-billable":
      return {
        shortTitle: "Billable",
        destinationHint: "Internal",
        metricLabel: "Billable internal",
      };
    case "internal-non-billable":
      return {
        shortTitle: "Non-billable",
        destinationHint: "Internal",
        metricLabel: "Non-billable internal",
      };
    default: {
      const _exhaustive: never = plateId;
      return _exhaustive;
    }
  }
}
