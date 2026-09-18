import { useAgencyBreakTimerSurface } from "@/features/task-management/hooks/use-agency-break-timer-surface";
import { AgencyBreakTimerSurfaceBodyView } from "@/features/task-management/break-timer/agency-break-timer-surface-body-view";

type AgencyBreakTimerSurfaceContainerProps = {
  surfaceId: string;
};

export function AgencyBreakTimerSurfaceContainer({
  surfaceId,
}: AgencyBreakTimerSurfaceContainerProps) {
  const view = useAgencyBreakTimerSurface({ surfaceId });
  return <AgencyBreakTimerSurfaceBodyView view={view} />;
}
