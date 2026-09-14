import {
  agencyTimeTrackerCardClass,
  agencyTimeTrackerShimmerClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export function AgencyTimeTrackerLoadingView() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className={cn(agencyTimeTrackerCardClass, "relative overflow-hidden")}
        aria-busy="true"
        aria-label="Loading tracker"
      >
        <div className={agencyTimeTrackerShimmerClass} aria-hidden />
      </div>
    </div>
  );
}
