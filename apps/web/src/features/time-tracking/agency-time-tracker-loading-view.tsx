import {
  agencyTimeTrackerCardClass,
  agencyTimeTrackerPrimaryActionClass,
  agencyTimeTrackerRailCellClass,
  agencyTimeTrackerRailClass,
  agencyTimeTrackerRailDividerClass,
  agencyTimeTrackerShimmerClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Separator } from "@/ui/separator";

export function AgencyTimeTrackerLoadingView() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className={cn(agencyTimeTrackerCardClass, "relative")}
        aria-busy="true"
        aria-label="Loading tracker"
      >
        <div className="relative min-h-9 min-w-0 flex-1 overflow-hidden pr-2">
          <div className={agencyTimeTrackerShimmerClass} aria-hidden />
        </div>
        <div className={agencyTimeTrackerRailClass}>
          <Separator
            orientation="vertical"
            decorative
            className={agencyTimeTrackerRailDividerClass}
          />
          <div className={agencyTimeTrackerRailCellClass}>
            <div className="relative h-9 w-[8.5rem] overflow-hidden rounded-md">
              <div className={agencyTimeTrackerShimmerClass} aria-hidden />
            </div>
          </div>
          <Separator
            orientation="vertical"
            decorative
            className={agencyTimeTrackerRailDividerClass}
          />
          <div className={agencyTimeTrackerRailCellClass}>
            <Button size="lg" className={agencyTimeTrackerPrimaryActionClass} disabled>
              Start
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
