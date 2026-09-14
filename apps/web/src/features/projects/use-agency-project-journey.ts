import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  buildReorderPayload,
  isJourneyStepRemovable,
} from "@/features/projects/journey-step-layout";
import { orpc, orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { isOrpcNotFoundError } from "@/lib/utils/orpc-error";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";

export type AgencyProjectJourney = Awaited<
  ReturnType<typeof orpcClient.agencyOps.projects.journey.get>
>;

export type AgencyProjectJourneyStep = AgencyProjectJourney["steps"][number];

type UseAgencyProjectJourneyOptions = {
  enabled?: boolean;
};

export function useAgencyProjectJourney(
  teamId: string,
  projectId: string,
  options: UseAgencyProjectJourneyOptions = {},
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(teamId && projectId && options.enabled !== false);

  const journeyQueryOptions = orpc.agencyOps.projects.journey.get.queryOptions({
    input: { teamId, projectId },
  });

  const journeyQuery = useQuery({
    ...withAgencySyncQueryOptions(journeyQueryOptions, "warm", {
      liveGated: true,
      teamId,
      noPoll: true,
    }),
    enabled,
    retry: (failureCount, error) => {
      if (isOrpcNotFoundError(error)) return false;
      return failureCount < 2;
    },
  });

  const isLegacyProject = journeyQuery.isError && isOrpcNotFoundError(journeyQuery.error);
  const hasJourney = journeyQuery.isSuccess;
  const journey = journeyQuery.data ?? null;

  const [pendingRemoveStepId, setPendingRemoveStepId] = useState<string | null>(null);

  const previewRemoveQuery = useQuery({
    ...orpc.agencyOps.projects.journey.previewRemoveStep.queryOptions({
      input: { teamId, projectId, stepId: pendingRemoveStepId ?? "" },
    }),
    enabled: enabled && Boolean(pendingRemoveStepId),
  });

  function setJourneyCache(nextJourney: AgencyProjectJourney) {
    queryClient.setQueryData(journeyQueryOptions.queryKey, nextJourney);
  }

  const updateStepsMutation = useMutation({
    ...orpc.agencyOps.projects.journey.updateSteps.mutationOptions(),
    onSuccess: (data) => {
      setJourneyCache(data);
    },
    onError: (error) => {
      toast.error("Couldn't update journey", {
        description: getErrorMessage(error, "Try again."),
      });
    },
  });

  const addStepMutation = useMutation({
    ...orpc.agencyOps.projects.journey.addStep.mutationOptions(),
    onSuccess: (data) => {
      setJourneyCache(data);
    },
    onError: (error) => {
      toast.error("Couldn't add milestone", {
        description: getErrorMessage(error, "Try again."),
      });
    },
  });

  const removeStepMutation = useMutation({
    ...orpc.agencyOps.projects.journey.removeStep.mutationOptions(),
    onSuccess: (data) => {
      setJourneyCache(data);
      setPendingRemoveStepId(null);
    },
    onError: (error) => {
      toast.error("Couldn't remove step", {
        description: getErrorMessage(error, "Try again."),
      });
    },
  });

  const sortedSteps = useMemo(
    () => (journey ? [...journey.steps].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [journey],
  );

  const updateStepLabel = useCallback(
    async (stepId: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed || !journey) return;
      const existing = journey.steps.find((step) => step.id === stepId);
      if (!existing || existing.label === trimmed) return;

      await updateStepsMutation.mutateAsync({
        teamId,
        projectId,
        steps: [{ id: stepId, label: trimmed }],
      });
    },
    [journey, projectId, teamId, updateStepsMutation],
  );

  const reorderSteps = useCallback(
    async (orderedMiddleIds: string[]) => {
      if (!journey) return;
      const payload = buildReorderPayload(journey.steps, orderedMiddleIds);
      if (payload.length === 0) return;

      await updateStepsMutation.mutateAsync({
        teamId,
        projectId,
        steps: payload,
      });
    },
    [journey, projectId, teamId, updateStepsMutation],
  );

  const addMilestone = useCallback(
    async (label = "New milestone") => {
      const created = await addStepMutation.mutateAsync({
        teamId,
        projectId,
        label,
        stepKind: "milestone",
      });

      const middleSteps = [...created.steps]
        .filter((step) => step.stepKind === "milestone" || step.stepKind === "checkpoint")
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return middleSteps.at(-1)?.id ?? null;
    },
    [addStepMutation, projectId, teamId],
  );

  const requestRemoveStep = useCallback((stepId: string) => {
    setPendingRemoveStepId(stepId);
  }, []);

  const cancelRemoveStep = useCallback(() => {
    setPendingRemoveStepId(null);
  }, []);

  const confirmRemoveStep = useCallback(async () => {
    if (!pendingRemoveStepId) return;
    await removeStepMutation.mutateAsync({
      teamId,
      projectId,
      stepId: pendingRemoveStepId,
    });
  }, [pendingRemoveStepId, projectId, removeStepMutation, teamId]);

  const pendingRemoveStep = useMemo(() => {
    if (!pendingRemoveStepId || !journey) return null;
    return journey.steps.find((step) => step.id === pendingRemoveStepId) ?? null;
  }, [journey, pendingRemoveStepId]);

  const canRemovePendingStep =
    pendingRemoveStep !== null && isJourneyStepRemovable(pendingRemoveStep.stepKind);

  return {
    journey,
    sortedSteps,
    hasJourney,
    isLegacyProject,
    isLoading: journeyQuery.isPending,
    isError: journeyQuery.isError && !isLegacyProject,
    error: journeyQuery.error,
    refetch: journeyQuery.refetch,
    updateStepLabel,
    reorderSteps,
    addMilestone,
    requestRemoveStep,
    cancelRemoveStep,
    confirmRemoveStep,
    pendingRemoveStepId,
    pendingRemoveStep,
    removePreview: previewRemoveQuery.data ?? null,
    isRemovePreviewLoading: previewRemoveQuery.isPending && Boolean(pendingRemoveStepId),
    canRemovePendingStep,
    isUpdating: updateStepsMutation.isPending,
    isAdding: addStepMutation.isPending,
    isRemoving: removeStepMutation.isPending,
  };
}
