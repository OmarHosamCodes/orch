import { useEffect } from "react";
import { useSearchParams } from "@/lib/navigation";

import type { AgencySegmentId } from "@/features/shared/agency-segments";
import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";
import { normalizeAgencyWorkSurfaceQueryParams } from "@/features/task-management/agency-work";
import { useAgencyTaskThreadShell } from "@/features/task-management/hooks/use-agency-task-thread-shell";
import { useAgencyProjectsQuery } from "@/features/shared/agency-queries";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type UseAgencyWorkSurfaceOptions = {
  teamId: string;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function useAgencyWorkSurface({ teamId, onSegmentChange }: UseAgencyWorkSurfaceOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const thread = useAgencyTaskThreadShell();

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];

  useEffect(() => {
    const next = normalizeAgencyWorkSurfaceQueryParams(searchParams);
    if (!next) return;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  let view: AgencyWorkSurfaceView;

  if (projectsQuery.isError) {
    view = {
      status: "error",
      message: getErrorMessage(projectsQuery.error, "Try refreshing."),
      onRetry: () => void projectsQuery.refetch(),
    };
  } else {
    const showEmptyProjects =
      projectsQuery.isSuccess && projects.length === 0 && !projectsQuery.isFetching;

    if (showEmptyProjects) {
      view = {
        status: "empty",
        onGoToClients: () => onSegmentChange("clients"),
        onGoToProjects: () => onSegmentChange("projects"),
      };
    } else {
      view = {
        status: "ready",
        teamId,
        projects,
      };
    }
  }

  return { view, thread };
}
