import { useNavigate, useSearchParams } from "@/lib/navigation";

import { AgencyDashboardSurface } from "@/features/dashboard/agency-dashboard-surface";
import {
  AgencySegmentFiltersRoot,
  useAgencySegmentSurfaceFilters,
} from "@/features/shared/agency-segment-filters";
import {
  agencyClientHref,
  agencyMemberHref,
  agencyProjectHref,
  agencySegmentHref,
} from "@/features/shared/agency-segments";
import { useTeamStore } from "@/features/team/team-store";

function AgencyDashboardBody({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const filters = useAgencySegmentSurfaceFilters();
  if (filters.kind !== "timeRange") return null;

  return (
    <AgencyDashboardSurface
      teamId={teamId}
      filters={filters.applied}
      policyReady={!filters.isTenurePolicyPending}
      onSelectProject={(projectId) => navigate(agencyProjectHref(projectId))}
      onSelectClient={(clientId) => navigate(agencyClientHref(clientId))}
      onSelectMember={(userId) => navigate(agencyMemberHref(userId))}
      onGoToTracker={() => navigate(agencySegmentHref("work"))}
    />
  );
}

export function AgencyDashboardPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const [searchParams] = useSearchParams();

  return (
    <AgencySegmentFiltersRoot segment="dashboard" teamId={teamId} searchParams={searchParams}>
      <AgencyDashboardBody teamId={teamId} />
    </AgencySegmentFiltersRoot>
  );
}
