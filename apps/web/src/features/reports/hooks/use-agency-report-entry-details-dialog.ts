import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";
import {
  reportRowAggregationKey,
  type ReportRowAggregationOptions,
} from "@/features/reports/agency-report-grouping";
import {
  deleteReportEntries,
  duplicateReportEntry,
  persistReportEntriesWaste,
  updateReportEntries,
  updateReportEntry,
} from "@/features/reports/report-entry-mutations";
import { useAgencyProjectsQuery } from "@/features/shared/agency-queries";
import { useAgencyProjectTasksForChooserQuery } from "@/features/shared/agency-task-chooser-catalog";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/features/time-tracking/agency-time-entry";
import { resolveWasteTogglePatch } from "@/features/time-tracking/agency-entry-group-waste";
import type { AgencyDayBulkDraft } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import { useTeamWorkSchedule } from "@/features/shared/use-team-work-schedule";
import {
  groupEntriesByWeek,
  type CollapsedEntryGroup,
  type TimeEntryWeekGroup,
} from "@/features/time-tracking/group-time-entries";
import {
  createAgencyTag,
  useAgencyTagsQuery,
} from "@/features/time-tracking/hooks/use-agency-tags";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/features/time-tracking/stores/agency-time-tracking";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export function selectEntriesForDetailsRow(
  entries: AgencyReportEntry[],
  rowKey: string | null,
  options: ReportRowAggregationOptions = {},
): AgencyReportEntry[] {
  if (!rowKey) return [];
  return entries.filter((entry) => reportRowAggregationKey(entry, options) === rowKey);
}

export function reportEntryDetailsDialogCopy(label: string, entryCount: number) {
  return {
    title: label,
    description: entryCount === 1 ? "1 time entry" : `${entryCount} time entries`,
  };
}

export type UseAgencyReportEntryDetailsDialogOptions = {
  teamId: string;
  entries: AgencyReportEntry[];
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type AgencyReportEntryDetailsDialogViewModel = {
  teamId: string;
  title: string;
  description: string;
  entriesEmpty: boolean;
  weekGroups: TimeEntryWeekGroup[];
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  tags: AgencyTagOption[];
  tagCreatePending: boolean;
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  selectedEntryIds: Set<string>;
  bulkEditDayKey: string | null;
  bulkFieldEditOpen: boolean;
  bulkDraft: AgencyDayBulkDraft;
  wastePending: boolean;
  prefersReducedMotion: boolean;
  onToggleGroupExpand: (collapseKey: string) => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
  onToggleWaste: (entryId: string | readonly string[]) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onSaveLinks: (entryId: string, links: string[]) => Promise<void>;
  onBulkPatch: (
    entryIds: string[],
    patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
      isWaste?: boolean;
    },
  ) => Promise<void>;
  onBulkDraftChange: (patch: Partial<AgencyDayBulkDraft>) => void;
  onToggleEntrySelected: (entryIds: string[]) => void;
  onToggleDayBulkEdit: (dateKey: string) => void;
  onToggleBulkFieldEdit: () => void;
  onDeleteSelected: (entryIds: string[]) => void;
  onMarkSelectedAsWaste: (entryIds: string[]) => void;
  onApplyBulk: () => void;
  onCreateTag?: (name: string) => void;
  onClose: () => void;
};

function trackPendingIds(
  setPending: (updater: (current: string[]) => string[]) => void,
  entryIds: string[],
  action: () => Promise<void>,
) {
  setPending((current) => [...new Set([...current, ...entryIds])]);
  return action().finally(() => {
    setPending((current) => current.filter((id) => !entryIds.includes(id)));
  });
}

export function useAgencyReportEntryDetailsDialog({
  teamId,
  entries,
  title,
  open,
  onOpenChange,
}: UseAgencyReportEntryDetailsDialogOptions): AgencyReportEntryDetailsDialogViewModel {
  const prefersReducedMotion = usePrefersReducedMotion();
  const queryClient = useQueryClient();
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);

  const [deletingEntryIds, setDeletingEntryIds] = useState<string[]>([]);
  const [updatingEntryIds, setUpdatingEntryIds] = useState<string[]>([]);
  const [duplicatingEntryIds, setDuplicatingEntryIds] = useState<string[]>([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState(() => new Set<string>());
  const [selectedEntryIds, setSelectedEntryIds] = useState(() => new Set<string>());
  const [bulkEditDayKey, setBulkEditDayKey] = useState<string | null>(null);
  const [bulkFieldEditOpen, setBulkFieldEditOpen] = useState(false);
  const [wastePending, setWastePending] = useState(false);
  const [bulkDraft, setBulkDraft] = useState<AgencyDayBulkDraft>({
    projectId: "",
    taskId: "",
    description: "",
    tagIds: [],
    isBillable: null,
  });
  const [tagCreatePending, setTagCreatePending] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId);
  const tagsQuery = useAgencyTagsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];
  const tags = (tagsQuery.data?.items ?? []) as AgencyTagOption[];

  const workSchedule = useTeamWorkSchedule(teamId);
  const weekGroups = useMemo(
    () => groupEntriesByWeek(entries, new Date(), workSchedule.weekStartsOn),
    [entries, workSchedule.weekStartsOn],
  );
  const copy = reportEntryDetailsDialogCopy(title, entries.length);

  useEffect(() => {
    if (!open) {
      setExpandedGroupKeys(new Set());
      setSelectedEntryIds(new Set());
      setBulkEditDayKey(null);
      setBulkFieldEditOpen(false);
      setBulkDraft({
        projectId: "",
        taskId: "",
        description: "",
        tagIds: [],
        isBillable: null,
      });
    }
  }, [open]);

  useEffect(() => {
    if (open && entries.length === 0) {
      onOpenChange(false);
    }
  }, [open, entries.length, onOpenChange]);

  async function deleteEntry(entryId: string) {
    if (!teamId) return;
    try {
      await trackPendingIds(setDeletingEntryIds, [entryId], () =>
        deleteReportEntries(queryClient, teamId, [entryId]),
      );
    } catch (error) {
      toast.error("Unable to delete entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  async function deleteGroupEntries(entryIds: string[]) {
    if (!teamId || entryIds.length === 0) return;
    try {
      await trackPendingIds(setDeletingEntryIds, entryIds, () =>
        deleteReportEntries(queryClient, teamId, entryIds),
      );
    } catch (error) {
      toast.error(entryIds.length > 1 ? "Unable to delete entries" : "Unable to delete entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  async function restartEntry(group: CollapsedEntryGroup) {
    const project = projects.find((projectEntry) => projectEntry.id === group.projectId);
    const sourceEntry = group.entries[0];
    if (!teamId || !project) return;

    await agencyTimeTrackingStore.restartEntry({
      teamId,
      project,
      task: group.taskId ? { id: group.taskId, title: group.taskTitle } : null,
      description: group.description,
      tagIds: sourceEntry?.tags?.map((tag) => tag.id) ?? [],
      isBillable: sourceEntry?.isBillable ?? true,
    });
  }

  async function saveEdit(entryId: string, draft: TimeEntryDraft) {
    const validationError = validateTimeEntryDraft(draft, { requireTask: false });
    if (validationError) return;

    const range = draftToIsoRange(draft);
    if ("error" in range) return;

    const entry = entries.find((item) => item.id === entryId);
    const catalogTask = tasks.find((item) => item.id === draft.taskId);
    const cachedTask =
      catalogTask ?? (teamId ? findProjectTaskInCache(teamId, draft.taskId) : null);
    const task =
      catalogTask ??
      cachedTask ??
      (entry?.taskId === draft.taskId && draft.taskId
        ? {
            id: draft.taskId,
            teamId: entry.teamId,
            projectId: entry.projectId,
            title: entry.taskTitle ?? entry.description,
            status: "open" as const,
            taskKind: "standard" as const,
            assignedToTeam: false,
            assignees: [],
            dueDate: null,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          }
        : null);
    const project =
      projects.find((item) => item.id === draft.projectId) ??
      (task ? projects.find((item) => item.id === task.projectId) : null) ??
      (entry ? projects.find((item) => item.id === entry.projectId) : null) ??
      null;

    if (!teamId || !entry || !project) return;
    if (draft.taskId && !task) return;

    try {
      await trackPendingIds(setUpdatingEntryIds, [entryId], async () => {
        await updateReportEntry(queryClient, teamId, entryId, {
          projectId: project.id,
          taskId: task?.id ?? null,
          description: draft.description.trim(),
          startAt: range.startAt,
          endAt: range.endAt,
          tagIds: draft.tagIds,
          isBillable: draft.isBillable,
        });
      });
    } catch (error) {
      toast.error("Unable to update entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  async function saveLinks(entryId: string, links: string[]) {
    if (!teamId) return;
    try {
      await trackPendingIds(setUpdatingEntryIds, [entryId], async () => {
        await updateReportEntry(queryClient, teamId, entryId, { links });
      });
    } catch (error) {
      toast.error("Unable to update links", {
        description: getErrorMessage(error, "Please try again."),
      });
      throw error;
    }
  }

  async function duplicateEntry(entryId: string) {
    if (!teamId) return;
    try {
      await trackPendingIds(setDuplicatingEntryIds, [entryId], async () => {
        await duplicateReportEntry(queryClient, teamId, entryId);
      });
    } catch (error) {
      toast.error("Unable to duplicate entry", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  function toggleGroupExpand(collapseKey: string) {
    setExpandedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(collapseKey)) next.delete(collapseKey);
      else next.add(collapseKey);
      return next;
    });
  }

  function toggleEntrySelected(entryIds: string[]) {
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      const allSelected = entryIds.every((entryId) => current.has(entryId));
      for (const entryId of entryIds) {
        if (allSelected) next.delete(entryId);
        else next.add(entryId);
      }
      return next;
    });
  }

  function toggleDayBulkEdit(dateKey: string) {
    setBulkEditDayKey((current) => {
      if (current === dateKey) {
        setSelectedEntryIds(new Set());
        setBulkFieldEditOpen(false);
        return null;
      }
      setSelectedEntryIds(new Set());
      setBulkFieldEditOpen(false);
      setBulkDraft({
        projectId: "",
        taskId: "",
        description: "",
        tagIds: [],
        isBillable: null,
      });
      return dateKey;
    });
  }

  async function deleteSelected(entryIds: string[]) {
    if (entryIds.length === 0) return;
    await deleteGroupEntries(entryIds);
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      for (const entryId of entryIds) next.delete(entryId);
      return next;
    });
    setBulkFieldEditOpen(false);
  }

  async function markSelectedAsWaste(entryIds: string[]) {
    if (!teamId || entryIds.length === 0 || wastePending) return;

    setWastePending(true);
    try {
      await persistReportEntriesWaste(queryClient, teamId, entryIds, true);
      toast.success(
        entryIds.length === 1 ? "Marked as waste" : `Marked ${entryIds.length} entries as waste`,
      );
    } catch (error) {
      toast.error("Couldn't mark as waste", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setWastePending(false);
    }
  }

  async function toggleEntryWaste(entryId: string | readonly string[]) {
    if (!teamId || wastePending) return;
    const selectedIds = typeof entryId === "string" ? [entryId] : [...entryId];
    const targets = entries.filter((item) => selectedIds.includes(item.id));
    const patch = resolveWasteTogglePatch(targets);
    if (!patch) return;

    setWastePending(true);
    try {
      await persistReportEntriesWaste(queryClient, teamId, patch.entryIds, patch.nextIsWaste);
      toast.success(
        patch.entryIds.length === 1
          ? patch.nextIsWaste
            ? "Marked as waste"
            : "Unmarked as waste"
          : patch.nextIsWaste
            ? `Marked ${patch.entryIds.length} entries as waste`
            : `Unmarked ${patch.entryIds.length} entries as waste`,
      );
    } catch (error) {
      toast.error("Couldn't update waste", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setWastePending(false);
    }
  }

  async function saveBulkPatch(
    entryIds: string[],
    patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
      isWaste?: boolean;
    },
  ) {
    if (!teamId || entryIds.length === 0 || Object.keys(patch).length === 0) return;
    if (patch.isWaste !== undefined && Object.keys(patch).length === 1) {
      await persistReportEntriesWaste(queryClient, teamId, entryIds, patch.isWaste);
      return;
    }

    const { isWaste: _isWaste, ...rest } = patch;
    if (Object.keys(rest).length === 0) return;

    try {
      await trackPendingIds(setUpdatingEntryIds, entryIds, () =>
        updateReportEntries(queryClient, teamId, entryIds, rest),
      );
    } catch (error) {
      toast.error("Unable to update entries", {
        description: getErrorMessage(error, "Please try again."),
      });
    }
  }

  async function applyBulkPatch() {
    if (selectedEntryIds.size === 0) return;
    const patch: {
      projectId?: string;
      taskId?: string | null;
      description?: string;
      tagIds?: string[];
      isBillable?: boolean;
    } = {};
    if (bulkDraft.projectId) patch.projectId = bulkDraft.projectId;
    if (bulkDraft.taskId) patch.taskId = bulkDraft.taskId;
    if (bulkDraft.description.trim()) patch.description = bulkDraft.description.trim();
    if (bulkDraft.tagIds.length > 0) patch.tagIds = bulkDraft.tagIds;
    if (bulkDraft.isBillable !== null) patch.isBillable = bulkDraft.isBillable;
    if (Object.keys(patch).length === 0) return;
    await saveBulkPatch([...selectedEntryIds], patch);
    setSelectedEntryIds(new Set());
    setBulkFieldEditOpen(false);
    setBulkEditDayKey(null);
  }

  function createTag(name: string) {
    if (!teamId || !tagsQuery.canEditRecords || tagCreatePending) return;
    setTagCreatePending(true);
    void createAgencyTag(teamId, name)
      .then((created) => {
        setBulkDraft((current) => ({
          ...current,
          tagIds: [...new Set([...current.tagIds, created.id])],
        }));
      })
      .finally(() => setTagCreatePending(false));
  }

  return {
    teamId,
    title: copy.title,
    description: copy.description,
    entriesEmpty: entries.length === 0,
    weekGroups,
    projects,
    tasks,
    tags,
    tagCreatePending,
    expandedGroupKeys,
    isTimerMutationPending,
    deletingEntryIds,
    updatingEntryIds,
    duplicatingEntryIds,
    selectedEntryIds,
    bulkEditDayKey,
    bulkFieldEditOpen,
    bulkDraft,
    wastePending,
    prefersReducedMotion,
    onToggleGroupExpand: toggleGroupExpand,
    onRestart: (group) => void restartEntry(group),
    onDeleteGroup: (entryIds) => void deleteGroupEntries(entryIds),
    onDeleteEntry: (entryId) => void deleteEntry(entryId),
    onDuplicate: (entryId) => void duplicateEntry(entryId),
    onToggleWaste: (entryId) => void toggleEntryWaste(entryId),
    onSaveEdit: saveEdit,
    onSaveLinks: saveLinks,
    onBulkPatch: saveBulkPatch,
    onBulkDraftChange: (patch) => setBulkDraft((current) => ({ ...current, ...patch })),
    onToggleEntrySelected: toggleEntrySelected,
    onToggleDayBulkEdit: toggleDayBulkEdit,
    onToggleBulkFieldEdit: () => setBulkFieldEditOpen((current) => !current),
    onDeleteSelected: (entryIds) => void deleteSelected(entryIds),
    onMarkSelectedAsWaste: (entryIds) => void markSelectedAsWaste(entryIds),
    onApplyBulk: () => void applyBulkPatch(),
    onCreateTag: tagsQuery.canEditRecords ? createTag : undefined,
    onClose: () => onOpenChange(false),
  };
}
