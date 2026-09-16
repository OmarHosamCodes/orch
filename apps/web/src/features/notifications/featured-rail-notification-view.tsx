import { ArrowRight, Loader2, RefreshCw, X } from "lucide-react";

import type { FeaturedRailNotificationViewModel } from "@/features/notifications/hooks/use-featured-rail-notification";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { Button } from "@/ui/button";
import { SurfaceShimmer } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

type FeaturedRailNotificationViewProps = {
  view: FeaturedRailNotificationViewModel;
};

export function FeaturedRailNotificationView({ view }: FeaturedRailNotificationViewProps) {
  if (!view.isAppUpdate && !view.teamId) return null;

  if (view.listPending) {
    return (
      <div className="relative mx-1 min-h-[8.5rem] overflow-hidden rounded-xl border border-sidebar-border bg-sidebar">
        <SurfaceShimmer overlay label="Loading notification" />
      </div>
    );
  }

  if (view.count === 0 || (!view.featured && !view.isAppUpdate)) return null;

  return (
    <section
      aria-label={view.isAppUpdate ? "App update" : "Needs action"}
      className={cn(
        "mx-1 rounded-surface border border-sidebar-border bg-sidebar p-surface text-sidebar-foreground",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
      )}
    >
      <div className="flex items-start gap-2">
        {view.isAppUpdate ? (
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
            <RefreshCw className="size-3.5" aria-hidden />
          </span>
        ) : (
          <AgencyMemberAvatar
            name={view.actorName}
            avatarUrl={view.actorAvatar}
            size="sm"
            className="shrink-0"
          />
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {view.isAppUpdate ? "Update" : "Needs action"}
              {!view.isAppUpdate && view.relativeTime ? (
                <span className="text-muted-foreground/80"> · {view.relativeTime}</span>
              ) : null}
            </p>
          </div>
        </div>
        {view.isAppUpdate ? null : (
          <button
            type="button"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "disabled:pointer-events-none disabled:opacity-50",
              shellFocusRingClass,
            )}
            aria-label="Dismiss notification"
            disabled={view.actionPending}
            onClick={view.onDismiss}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
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
          disabled={view.actionPending}
          onClick={view.onPrimaryCta}
        >
          {view.actionPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <>
              {view.ctaLabel}
              <ArrowRight className="size-3.5" aria-hidden />
            </>
          )}
        </Button>
        {view.moreLabel ? (
          <button
            type="button"
            className={cn(
              "w-full py-1 text-center text-[11px] font-medium text-muted-foreground transition-colors",
              "hover:text-sidebar-foreground",
              shellFocusRingClass,
            )}
            onClick={view.onAdvanceFeatured}
          >
            {view.moreLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
