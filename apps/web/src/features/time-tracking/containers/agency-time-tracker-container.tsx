import { MotionConfig } from "motion/react";

import { useAgencyTimeTracker } from "@/features/time-tracking/hooks/use-agency-time-tracker";

import { AgencyTimeTrackerView } from "@/features/time-tracking/agency-time-tracker-view";

type AgencyTimeTrackerContainerProps = {
  teamId: string;
};

export function AgencyTimeTrackerContainer({ teamId }: AgencyTimeTrackerContainerProps) {
  const view = useAgencyTimeTracker({ teamId });
  return (
    <MotionConfig reducedMotion="user">
      <AgencyTimeTrackerView view={view} />
    </MotionConfig>
  );
}
