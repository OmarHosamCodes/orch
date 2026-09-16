import { ArrowRight } from "lucide-react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import type { FeaturedRailAlertsViewModel } from "@/features/notifications/hooks/use-featured-rail-alerts";
import { AlertPlateGlyph } from "@/features/member-profile/member-profile-alert-glyphs";
import { instrumentPlateInkClass } from "@/features/member-profile/member-profile-instrument-plate";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

type FeaturedRailAlertsViewProps = {
  view: FeaturedRailAlertsViewModel;
};

export function FeaturedRailAlertsView({ view }: FeaturedRailAlertsViewProps) {
  if (!view.userId || !view.teamId) return null;

  if (view.listPending) {
    return (
      <div className="relative mx-1 min-h-[7rem] overflow-hidden rounded-xl border border-sidebar-border bg-sidebar">
        <SurfaceShimmer overlay label="Loading alerts" />
      </div>
    );
  }

  if (view.count === 0 || !view.featured || !view.plate) return null;

  return (
    <section
      aria-label="Alerts"
      className={cn(
        "mx-1 rounded-surface border border-sidebar-border bg-sidebar p-surface text-sidebar-foreground",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "inline-flex h-7 w-10 shrink-0 items-center justify-center",
            instrumentPlateInkClass("warning"),
          )}
        >
          <AlertPlateGlyph
            kind={view.featured.kind}
            ratio={view.plate.chartRatio}
            className="h-full w-full"
          />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
            <p className="truncate text-[11px] font-medium text-muted-foreground">Alerts</p>
          </div>
        </div>
      </div>

      <h2 className="mt-2.5 text-balance text-sm font-semibold leading-snug tracking-tight text-sidebar-foreground">
        {view.title}
      </h2>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {view.body}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 w-full rounded-full bg-sidebar-foreground text-xs font-semibold text-sidebar hover:bg-sidebar-foreground/90"
          onClick={view.onPrimaryCta}
        >
          View alert
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
        {view.moreLabel ? (
          <button
            type="button"
            className={cn(
              "w-full py-1 text-center text-[11px] font-medium text-muted-foreground transition-colors",
              "hover:text-sidebar-foreground",
              shellFocusRingClass,
            )}
            onClick={view.onOpenAll}
          >
            {view.moreLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
