import {
  deriveInternalSplit,
  type AgencyHourBreakdownMetrics,
} from "@/features/shared/agency-hour-breakdown-metrics";
import type { InstrumentPlateTone } from "@/features/member-profile/member-profile-instrument-plate";

export type DashboardHoursPlateId =
  | "paid"
  | "waste"
  | "internal-billable"
  | "internal-non-billable";

export function clampHoursPlateRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

export type DashboardHoursPlateGlyphSignal =
  | { kind: "paid"; paidShare: number; externalShare: number; clientBillableRatio: number }
  | { kind: "waste"; wasteShare: number; externalShare: number; wasteExternalRatio: number }
  | {
      kind: "internal-billable";
      internalTotalShare: number;
      billableInternalRatio: number;
    }
  | {
      kind: "internal-non-billable";
      internalTotalShare: number;
      nonBillableInternalRatio: number;
    };

export type DashboardHoursPlateViewModel = {
  id: DashboardHoursPlateId;
  tone: InstrumentPlateTone;
  glyph: DashboardHoursPlateGlyphSignal;
  seconds: number;
  ariaLabel: string;
};

function ratioOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return clampHoursPlateRatio(part / whole);
}

export function buildDashboardHoursPlates(
  metrics: AgencyHourBreakdownMetrics,
): DashboardHoursPlateViewModel[] {
  const { wasteSeconds, internalBillableSeconds, internalNonBillableSeconds } =
    deriveInternalSplit(metrics);
  const total = Math.max(0, metrics.totalSeconds);
  const external = Math.max(0, metrics.externalSeconds);
  const internal = Math.max(0, metrics.internalSeconds);
  const paid = Math.max(0, metrics.paidSeconds);

  const paidShare = ratioOf(paid, total);
  const externalShare = ratioOf(external, total);
  const wasteShare = ratioOf(wasteSeconds, total);
  const internalTotalShare = ratioOf(internal, total);

  const paidExternalRatio = external > 0 ? clampHoursPlateRatio(paid / external) : 0;
  const wasteExternalRatio = external > 0 ? clampHoursPlateRatio(wasteSeconds / external) : 0;
  const billableInternalRatio =
    internal > 0 ? clampHoursPlateRatio(internalBillableSeconds / internal) : 0;
  const nonBillableInternalRatio =
    internal > 0 ? clampHoursPlateRatio(internalNonBillableSeconds / internal) : 0;

  return [
    {
      id: "paid",
      tone: paid > 0 ? "success" : "neutral",
      glyph: {
        kind: "paid",
        paidShare,
        externalShare,
        clientBillableRatio: paidExternalRatio,
      },
      seconds: paid,
      ariaLabel: `Paid hours. External billable share after waste.`,
    },
    {
      id: "waste",
      tone: wasteSeconds > 0 ? "danger" : "neutral",
      glyph: {
        kind: "waste",
        wasteShare,
        externalShare,
        wasteExternalRatio,
      },
      seconds: wasteSeconds,
      ariaLabel: `Waste hours. External time marked non-billable or waste.`,
    },
    {
      id: "internal-billable",
      tone: internalBillableSeconds > 0 ? "info" : "neutral",
      glyph: {
        kind: "internal-billable",
        internalTotalShare,
        billableInternalRatio,
      },
      seconds: internalBillableSeconds,
      ariaLabel: `Internal billable hours. Internal-client work marked billable.`,
    },
    {
      id: "internal-non-billable",
      tone: internalNonBillableSeconds > 0 ? "info" : "neutral",
      glyph: {
        kind: "internal-non-billable",
        internalTotalShare,
        nonBillableInternalRatio,
      },
      seconds: internalNonBillableSeconds,
      ariaLabel: `Internal non-billable hours. Internal-client work marked non-billable.`,
    },
  ];
}
