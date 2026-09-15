import { ChevronRight } from "lucide-react";

import { type DashboardTeamMemberActivity } from "@/features/dashboard/dashboard-team-member-types";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

export type { DashboardTeamMemberActivity };

export type DashboardTeamActivityCellViewProps = {
  activity: DashboardTeamMemberActivity | null;
  isTracking: boolean;
  onOpen: () => void;
};

export function DashboardTeamActivityCellView({
  activity,
  isTracking,
  onOpen,
}: DashboardTeamActivityCellViewProps) {
  if (!activity) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex min-w-0 max-w-full items-center gap-2 rounded-md py-0.5 text-left",
          agencyFocusRingClass,
        )}
        aria-label="No activity. View member details."
      >
        <span className="min-w-0 flex-1 text-muted">No activity</span>
        <ChevronRight
          className="size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          aria-hidden
        />
      </button>
    );
  }

  const meta = activity.clientName
    ? `${activity.projectName} · ${activity.clientName}`
    : activity.projectName;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex min-w-0 max-w-full items-start gap-2 rounded-md py-0.5 text-left",
        agencyFocusRingClass,
      )}
      aria-label={`${activity.description || "No description"}. ${isTracking ? "In progress" : "Idle"}. View member details.`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-highlighted">
          {activity.description || "(no description)"}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
          <Badge
            variant={isTracking ? "default" : "secondary"}
            className="h-5 shrink-0 gap-1 px-1.5 text-[10px]"
          >
            <span
              className={cn(
                "size-1.5 rounded-full bg-current",
                isTracking && "motion-safe:animate-pulse",
              )}
              aria-hidden
            />
            {isTracking ? "In progress" : "Idle"}
          </Badge>
          <span className="shrink-0 text-muted" aria-hidden>
            ·
          </span>
          <span className="min-w-0 truncate text-[11px] text-muted">{meta}</span>
        </span>
      </span>
      <ChevronRight
        className="mt-0.5 size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        aria-hidden
      />
    </button>
  );
}
