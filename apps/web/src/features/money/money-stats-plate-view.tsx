import { type MoneyStatsMetricKind } from "@/features/billing/money-stats-fixtures";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export function formatMoneyStatsMetricValue(
  kind: MoneyStatsMetricKind,
  amount: number,
  currency: string,
): string {
  if (kind === "percent") {
    return new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export type MoneyStatsMetricHint = {
  label: string;
  value: string;
  destination: string;
};

export function MoneyStatsMetricHintStrip({ hint }: { hint: MoneyStatsMetricHint | null }) {
  if (!hint) return null;

  return (
    <p
      className="rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-sm leading-snug text-muted-foreground"
      aria-live="polite"
    >
      <span className="font-medium text-foreground">{hint.label}</span>
      <span aria-hidden> · </span>
      <span className={cn(agencyMetricClass, "font-medium tracking-tight")}>{hint.value}</span>
      <span aria-hidden> · </span>
      <span>Showing {hint.destination}</span>
    </p>
  );
}
