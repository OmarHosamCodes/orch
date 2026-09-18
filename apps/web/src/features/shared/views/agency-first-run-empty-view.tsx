import type { LucideIcon } from "lucide-react";

import { agencyEmptyPanelClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export type AgencyFirstRunEmptyViewProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryPending?: boolean;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
};

export function AgencyFirstRunEmptyView({
  icon: Icon,
  title,
  body,
  className,
  primaryLabel,
  onPrimary,
  primaryPending = false,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}: AgencyFirstRunEmptyViewProps) {
  const showPrimary = Boolean(primaryLabel && onPrimary);

  return (
    <div className={cn(agencyEmptyPanelClass, className)} role="status">
      <Icon className="mx-auto size-7 text-muted" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-highlighted">{title}</p>
      <p className="mt-1 text-xs text-muted text-pretty">{body}</p>
      {showPrimary ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={onPrimary} disabled={primaryDisabled || primaryPending}>
            {primaryLabel}
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSecondary}
              disabled={secondaryDisabled || primaryPending}
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
