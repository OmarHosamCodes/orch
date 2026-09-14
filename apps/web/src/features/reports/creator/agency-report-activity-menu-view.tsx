import { Activity } from "lucide-react";

import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { SurfaceShimmer } from "@/ui/skeleton";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import type { AgencyReportActivityMenuViewModel } from "./hooks/use-agency-report-activity-menu";

export type AgencyReportActivityMenuViewProps = {
  align?: "start" | "center" | "end";
  vm: AgencyReportActivityMenuViewModel;
};

export function AgencyReportActivityMenuView({
  align = "start",
  vm,
}: AgencyReportActivityMenuViewProps) {
  return (
    <Popover open={vm.open} onOpenChange={vm.setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2.5 text-xs"
          aria-label="Report activity"
        >
          <Activity className="size-3.5" />
          <span className="hidden sm:inline">Activity</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-0">
        <div className="border-b border-default px-3 py-2.5">
          <p className="text-sm font-semibold text-highlighted">Activity</p>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {vm.isPending ? (
            <SurfaceShimmer className="min-h-32" label="Loading activity" />
          ) : vm.isError ? (
            <p className="px-1 py-3 text-center text-xs text-muted">Couldn't load activity.</p>
          ) : vm.items.length === 0 ? (
            <p className="px-1 py-3 text-center text-xs text-muted">No changes yet.</p>
          ) : (
            vm.items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-0.5 rounded-dense px-2 py-1.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-1",
                  agencyFocusRingClass,
                )}
              >
                <span className="text-xs font-semibold text-highlighted">{item.actorUserName}</span>
                <span className="text-xs text-muted">
                  {item.description} · {item.timeAgo}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
