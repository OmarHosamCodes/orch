import { useQuery } from "@tanstack/react-query";

import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";

export function useAgencyTagsQuery(teamId: string) {
  const tagsQuery = useQuery({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });

  return {
    ...tagsQuery,
    canEditRecords: agencyTeamCapabilities(teamQuery.data?.role).canEditRecords,
  };
}

export async function createAgencyTag(teamId: string, name: string): Promise<AgencyTagOption> {
  const created = (await orpcClient.agencyOps.tags.create({ teamId, name })) as {
    id: string;
    name: string;
  };
  await getQueryClient().invalidateQueries({
    queryKey: orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }).queryKey,
  });
  return { id: created.id, name: created.name };
}
