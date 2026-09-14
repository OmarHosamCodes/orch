import type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyProjectTaskStatus,
  AgencyTaskProject,
} from "@orch/api/schemas/agency-ops";

export type {
  AgencyProject,
  AgencyProjectJourney,
  AgencyProjectJourneyStep,
  AgencyProjectTask,
  AgencyTaskProject,
};

export type TaskStatus = AgencyProjectTaskStatus;

/** Strip obsolete Work tab/filter query params. `task` stays as a Tracker deep-link. */
export function normalizeAgencyWorkSurfaceQueryParams(
  searchParams: URLSearchParams,
): URLSearchParams | null {
  if (!searchParams.has("tab") && !searchParams.has("filter") && !searchParams.has("section")) {
    return null;
  }
  const next = new URLSearchParams(searchParams);
  next.delete("tab");
  next.delete("filter");
  next.delete("section");
  return next;
}

type AgencyWorkSurfaceReadyProps = {
  status: "ready";
  teamId: string;
  projects: AgencyProject[];
};

export type AgencyWorkSurfaceView =
  | { status: "error"; message: string; onRetry: () => void }
  | {
      status: "empty";
      onGoToClients: () => void;
      onGoToProjects: () => void;
    }
  | AgencyWorkSurfaceReadyProps;
