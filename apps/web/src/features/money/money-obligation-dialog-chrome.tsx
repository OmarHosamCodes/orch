import { type ReactNode } from "react";

import { agencyMetricClass, agencyWorkTitleClass } from "@/features/shared/agency-ui";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

export type MoneyObligationMetricTone = "default" | "warning" | "success" | "muted";

export type MoneyObligationMetric = {
  label: string;
  value: string;
  tone?: MoneyObligationMetricTone;
};

function metricToneClass(tone: MoneyObligationMetricTone = "default"): string {
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "muted":
      return "text-muted";
    case "default":
      return "text-highlighted";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function statusToneClass(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("paid") || lower.includes("settled") || lower.includes("ready")) {
    return "text-success";
  }
  if (
    lower.includes("partial") ||
    lower.includes("outstanding") ||
    lower.includes("remaining") ||
    lower.includes("due")
  ) {
    return "text-warning";
  }
  if (lower.includes("sent")) return "text-highlighted";
  return "text-muted";
}

const dialogSizeClass = {
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

export function MoneyObligationDialog({
  open,
  onOpenChange,
  size = "lg",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: keyof typeof dialogSizeClass;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0",
          dialogSizeClass[size],
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function MoneyObligationDialogHeader({
  title,
  titleHref,
  statusLabel,
  caption,
  metrics,
}: {
  title: string;
  titleHref?: string | null;
  statusLabel: string;
  caption: string;
  metrics: MoneyObligationMetric[];
}) {
  return (
    <DialogHeader className="space-y-3 border-b border-default px-5 py-4 pr-14 text-left">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {titleHref ? (
          <DialogTitle asChild>
            <Link
              to={titleHref}
              className={cn(
                agencyWorkTitleClass,
                "rounded-sm text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              onClick={(event) => event.stopPropagation()}
            >
              {title}
            </Link>
          </DialogTitle>
        ) : (
          <DialogTitle className={cn(agencyWorkTitleClass, "text-balance")}>{title}</DialogTitle>
        )}
        <span className={cn("text-xs font-medium", statusToneClass(statusLabel))}>
          {statusLabel}
        </span>
      </div>
      <DialogDescription className="text-xs text-muted text-pretty">{caption}</DialogDescription>
      {metrics.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 rounded-xl border border-default bg-default px-3 py-2.5">
              <dt className="text-[0.6875rem] font-medium text-muted">{metric.label}</dt>
              <dd
                className={cn(
                  agencyMetricClass,
                  "mt-0.5 truncate font-mono text-sm font-semibold tabular-nums",
                  metricToneClass(metric.tone),
                )}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </DialogHeader>
  );
}

export function MoneyObligationDialogBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>;
}

export function MoneyObligationDialogSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MoneyObligationDialogFooter({ children }: { children: ReactNode }) {
  return (
    <DialogFooter className="border-t border-default bg-popover px-5 py-4 sm:justify-between">
      {children}
    </DialogFooter>
  );
}

export function MoneyObligationDialogActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
