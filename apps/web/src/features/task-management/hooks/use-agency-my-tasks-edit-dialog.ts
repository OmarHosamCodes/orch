import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import type { AgencyMemberOption } from "@/features/shared/agency-member-option";
import {
  catalogWinningRate,
  parseBillableRateAmount,
  previewConvertedRate,
} from "@/features/shared/format-rate";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import {
  canSaveMyTasksEdit,
  myTasksEditDraftFromTask,
  type MyTasksEditDraft,
} from "@/features/task-management/agency-my-tasks-edit-draft";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import { agencyTeamCapabilities } from "@/features/shared/agency-team-capabilities";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type UseAgencyMyTasksEditDialogOptions = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  task: AgencyProjectTask;
  projectLabel: string;
  members: AgencyMemberOption[];
};

export type AgencyMyTasksEditDialogViewModel = {
  formId: string;
  projectLabel: string;
  members: AgencyMemberOption[];
  title: string;
  setTitle: (value: string) => void;
  iconKey: AgencyEntityIconKey | null;
  setIconKey: (value: AgencyEntityIconKey | null) => void;
  assignedToTeam: boolean;
  setAssignedToTeam: (value: boolean) => void;
  assigneeUserIds: string[];
  setAssigneeUserIds: (value: string[]) => void;
  estimateMinutes: number | null;
  setEstimateMinutes: (value: number | null) => void;
  isOwner: boolean;
  canEditRecords: boolean;
  billableRateDraft: string;
  setBillableRateDraft: (value: string) => void;
  billableRateCurrency: string;
  setBillableRateCurrency: (value: string) => void;
  parentRateAmount: number | null;
  parentRateCurrency: string;
  effectiveRateAmount: number | null;
  effectiveRateCurrency: string;
  agencyCurrency: string;
  ratePreviewAmount: number | null;
  canSubmit: boolean;
  pending: boolean;
  editError: string | null;
  handleSubmit: (event: FormEvent) => Promise<void>;
  onCancel: () => void;
};

function emptyDraft(): MyTasksEditDraft {
  return {
    title: "",
    iconKey: null,
    assignedToTeam: false,
    assigneeUserIds: [],
    estimateMinutes: null,
    billableRateDraft: "",
    billableRateCurrency: "USD",
  };
}

export function useAgencyMyTasksEditDialog({
  open,
  onOpenChange,
  teamId,
  task,
  projectLabel,
  members,
}: UseAgencyMyTasksEditDialogOptions): AgencyMyTasksEditDialogViewModel {
  const formId = useId();
  const [baseline, setBaseline] = useState<MyTasksEditDraft>(emptyDraft);
  const [draft, setDraft] = useState<MyTasksEditDraft>(emptyDraft);
  const [editError, setEditError] = useState<string | null>(null);

  const updateProjectTask = useAgencyOpsStore((state) => state.updateProjectTask);
  const pendingTaskIds = useAgencyOpsStore((state) => state.pendingTaskIds);
  const pending = pendingTaskIds.includes(task.id);

  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId) && open,
  });
  const { isOwner, canEditRecords } = agencyTeamCapabilities(teamQuery.data?.role);

  const fxRatesQuery = useQuery({
    ...orpc.agencyOps.fxRates.list.queryOptions({
      input: { teamId },
    }),
    enabled: Boolean(teamId) && open && isOwner,
  });

  useEffect(() => {
    if (!open) {
      setEditError(null);
      return;
    }
    const next = myTasksEditDraftFromTask(task);
    setBaseline(next);
    setDraft(next);
    setEditError(null);
  }, [open, task.id]);

  const parentRate = catalogWinningRate(
    { billableRateAmount: null },
    {
      billableRateAmount: task.projectBillableRateAmount,
      sourceBillableRateAmount: task.projectSourceBillableRateAmount,
      currency: task.projectCurrency,
    },
    {
      billableRateAmount: task.clientBillableRateAmount,
      sourceBillableRateAmount: task.clientSourceBillableRateAmount,
      currency: task.clientCurrency,
    },
  );
  const parsedTaskRate =
    draft.billableRateDraft.trim() === "" ? null : parseBillableRateAmount(draft.billableRateDraft);
  const billableRateAmountValid = draft.billableRateDraft.trim() === "" || parsedTaskRate !== null;
  const effectiveRate = catalogWinningRate(
    {
      billableRateAmount: parsedTaskRate,
      sourceBillableRateAmount: parsedTaskRate,
      currency: draft.billableRateCurrency,
    },
    {
      billableRateAmount: task.projectBillableRateAmount,
      sourceBillableRateAmount: task.projectSourceBillableRateAmount,
      currency: task.projectCurrency,
    },
    {
      billableRateAmount: task.clientBillableRateAmount,
      sourceBillableRateAmount: task.clientSourceBillableRateAmount,
      currency: task.clientCurrency,
    },
  );
  const agencyCurrency = fxRatesQuery.data?.agencyCurrency ?? (task.clientCurrency || "USD");
  const ratePreviewAmount =
    parsedTaskRate != null && draft.billableRateCurrency !== agencyCurrency
      ? previewConvertedRate(
          parsedTaskRate,
          draft.billableRateCurrency,
          agencyCurrency,
          fxRatesQuery.data?.items ?? [],
        )
      : null;

  const canSubmit = canSaveMyTasksEdit({
    draft,
    baseline,
    pending,
    billableRateAmountValid: isOwner ? billableRateAmountValid : true,
  });

  function setTitle(value: string) {
    setDraft((prev) => ({ ...prev, title: value }));
  }

  function setIconKey(value: AgencyEntityIconKey | null) {
    setDraft((prev) => ({ ...prev, iconKey: value }));
  }

  function setAssignedToTeam(value: boolean) {
    setDraft((prev) => ({
      ...prev,
      assignedToTeam: value,
      assigneeUserIds: value ? [] : prev.assigneeUserIds,
    }));
  }

  function setAssigneeUserIds(value: string[]) {
    setDraft((prev) => ({
      ...prev,
      assignedToTeam: false,
      assigneeUserIds: value,
    }));
  }

  function setEstimateMinutes(value: number | null) {
    setDraft((prev) => ({ ...prev, estimateMinutes: value }));
  }

  function setBillableRateDraft(value: string) {
    setDraft((prev) => ({ ...prev, billableRateDraft: value }));
  }

  function setBillableRateCurrency(value: string) {
    setDraft((prev) => ({ ...prev, billableRateCurrency: value }));
  }

  function onCancel() {
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setEditError(null);
    try {
      const rateChanged =
        isOwner &&
        (baseline.billableRateDraft.trim() !== draft.billableRateDraft.trim() ||
          baseline.billableRateCurrency !== draft.billableRateCurrency);
      const billableRateAmount = rateChanged
        ? draft.billableRateDraft.trim() === ""
          ? null
          : parseBillableRateAmount(draft.billableRateDraft)
        : undefined;

      await updateProjectTask({
        teamId,
        taskId: task.id,
        title: draft.title.trim(),
        iconKey: draft.iconKey !== baseline.iconKey ? draft.iconKey : undefined,
        assignedToTeam: draft.assignedToTeam,
        assigneeUserIds: draft.assignedToTeam ? [] : draft.assigneeUserIds,
        estimateMinutes: draft.estimateMinutes,
        ...(rateChanged
          ? {
              billableRateAmount,
              currency: billableRateAmount == null ? undefined : draft.billableRateCurrency,
            }
          : {}),
      });
      onOpenChange(false);
    } catch (error) {
      setEditError(getErrorMessage(error, "Couldn't update task."));
    }
  }

  return {
    formId,
    projectLabel,
    members,
    title: draft.title,
    setTitle,
    iconKey: draft.iconKey,
    setIconKey,
    assignedToTeam: draft.assignedToTeam,
    setAssignedToTeam,
    assigneeUserIds: draft.assigneeUserIds,
    setAssigneeUserIds,
    estimateMinutes: draft.estimateMinutes,
    setEstimateMinutes,
    isOwner,
    canEditRecords,
    billableRateDraft: draft.billableRateDraft,
    setBillableRateDraft,
    billableRateCurrency: draft.billableRateCurrency,
    setBillableRateCurrency,
    parentRateAmount: parentRate.amount,
    parentRateCurrency: parentRate.currency,
    effectiveRateAmount: effectiveRate.amount,
    effectiveRateCurrency: effectiveRate.currency,
    agencyCurrency,
    ratePreviewAmount,
    canSubmit,
    pending,
    editError,
    handleSubmit,
    onCancel,
  };
}
