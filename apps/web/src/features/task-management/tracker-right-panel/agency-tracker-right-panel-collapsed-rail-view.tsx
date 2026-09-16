import { PanelRightOpen } from "lucide-react";

import type { AgencyTrackerRightPanelViewModel } from "@/features/task-management/hooks/use-agency-tracker-right-panel";
import {
  buildTrackerRightPanelCollapsedRailGroups,
  trackerRightPanelSurfaceIcon,
  trackerRightPanelSurfaceKindLabel,
} from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-meta";
import { agencyMyTasksCountTickClass } from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

type AgencyTrackerRightPanelCollapsedRailViewProps = {
  panel: AgencyTrackerRightPanelViewModel;
};

export function AgencyTrackerRightPanelCollapsedRailView({
  panel,
}: AgencyTrackerRightPanelCollapsedRailViewProps) {
  const groups = buildTrackerRightPanelCollapsedRailGroups({
    surfaces: panel.surfaces,
    activeSurfaceId: panel.activeSurfaceId,
    pendingSurfaceIds: panel.pendingSurfaceIds,
    openTaskCount: panel.openTaskCount,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex h-full w-full min-w-0 flex-col items-center"
        aria-label="Panel collapsed"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground"
              aria-label="Open panel"
              onClick={() => panel.onOpenPanel()}
            >
              <PanelRightOpen />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open panel</TooltipContent>
        </Tooltip>

        {groups.length > 0 ? (
          <ul
            className="mt-1 flex w-full min-w-0 flex-col items-center gap-0.5 border-t border-border pt-1"
            aria-label="Open surfaces"
          >
            {groups.map((group) => {
              const Icon = trackerRightPanelSurfaceIcon(group.kind);
              const label = trackerRightPanelSurfaceKindLabel(group.kind);
              const badge =
                group.badgeCount != null
                  ? group.badgeCount > 99
                    ? "99+"
                    : String(group.badgeCount)
                  : null;
              const tooltip =
                group.isRunning && badge != null
                  ? `${label} · ${badge} · live`
                  : group.isRunning
                    ? `${label} · live`
                    : badge != null
                      ? `${label} · ${badge}`
                      : label;

              return (
                <li key={group.kind} className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "relative size-8 shrink-0 text-muted-foreground",
                          group.isActiveKind && "bg-muted text-foreground",
                          group.isRunning && "text-foreground",
                        )}
                        aria-current={group.isActiveKind ? "page" : undefined}
                        aria-label={tooltip}
                        onClick={() => panel.onOpenPanelToSurface(group.targetSurfaceId)}
                      >
                        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{tooltip}</TooltipContent>
                  </Tooltip>
                  {badge != null ? (
                    <span
                      className={cn(
                        "pointer-events-none absolute top-0 right-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-semibold leading-none tabular-nums ring-2 ring-card",
                        group.isRunning
                          ? "bg-primary text-primary-foreground"
                          : group.kind === "my-tasks"
                            ? "bg-success text-success-foreground"
                            : "bg-muted-foreground/80 text-background",
                        group.kind === "my-tasks" &&
                          !group.isRunning &&
                          agencyMyTasksCountTickClass,
                      )}
                    >
                      {badge}
                    </span>
                  ) : group.isRunning ? (
                    <span
                      className="pointer-events-none absolute top-1 right-1 size-1.5 rounded-full bg-primary ring-2 ring-card"
                      aria-hidden
                    >
                      <span className="absolute inset-0 animate-ping rounded-full bg-primary/70 motion-reduce:animate-none" />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
