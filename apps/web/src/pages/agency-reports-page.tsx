import { AgencyReportsSurface } from "@/features/reports/agency-reports-surface";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyReportsPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  return <AgencyReportsSurface teamId={teamId} />;
}
