export type AgencyHourBreakdownMetrics = {
  totalSeconds: number;
  externalSeconds: number;
  internalSeconds: number;
  internalBillableSeconds: number;
  paidSeconds: number;
};

export type HourBreakdownSegmentId = "paid" | "waste" | "internalBillable" | "internalNonBillable";

export type HourBreakdownSegment = {
  id: HourBreakdownSegmentId;
  label: string;
  shortLabel: string;
  purpose: string;
  seconds: number;
  barClass: string;
  dotClass: string;
};

export function deriveInternalSplit(metrics: AgencyHourBreakdownMetrics): {
  wasteSeconds: number;
  internalBillableSeconds: number;
  internalNonBillableSeconds: number;
} {
  const wasteSeconds = Math.max(0, metrics.externalSeconds - metrics.paidSeconds);
  const internalBillableSeconds = Math.min(
    metrics.internalSeconds,
    Math.max(0, metrics.internalBillableSeconds),
  );
  const internalNonBillableSeconds = Math.max(0, metrics.internalSeconds - internalBillableSeconds);
  return { wasteSeconds, internalBillableSeconds, internalNonBillableSeconds };
}

export function buildHourBreakdownSegments(
  metrics: AgencyHourBreakdownMetrics,
): HourBreakdownSegment[] {
  const { wasteSeconds, internalBillableSeconds, internalNonBillableSeconds } =
    deriveInternalSplit(metrics);

  return [
    {
      id: "paid",
      label: "Paid",
      shortLabel: "Paid",
      purpose: "External hours minus waste — the billable client share.",
      seconds: metrics.paidSeconds,
      barClass: "bg-primary",
      dotClass: "bg-primary",
    },
    {
      id: "waste",
      label: "Waste",
      shortLabel: "Waste",
      purpose: "External time marked as non-billable or waste.",
      seconds: wasteSeconds,
      barClass: "bg-destructive",
      dotClass: "bg-destructive",
    },
    {
      id: "internalBillable",
      label: "Internal billable",
      shortLabel: "Billable",
      purpose: "Internal-client work marked billable.",
      seconds: internalBillableSeconds,
      barClass: "bg-info",
      dotClass: "bg-info",
    },
    {
      id: "internalNonBillable",
      label: "Internal non-billable",
      shortLabel: "Non-billable",
      purpose: "Internal-client work marked non-billable.",
      seconds: internalNonBillableSeconds,
      barClass: "bg-info/45",
      dotClass: "bg-info/45",
    },
  ];
}
