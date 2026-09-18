import { agencyWorkSurfaceShellClass } from "@/features/shared/agency-ui";
import { AgencyWorkSurface } from "@/features/task-management/agency-work-surface";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyTrackerPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);

  return (
    <div className={agencyWorkSurfaceShellClass}>
      <AgencyWorkSurface teamId={teamId} />
    </div>
  );
}
