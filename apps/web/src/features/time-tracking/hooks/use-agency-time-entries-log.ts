import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAgencyTimeEntriesLogStore } from "@/features/time-tracking/stores/agency-time-entries-log";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import {
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
import { prefetchAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { useAgencyProjectTasksForChooserQuery } from "@/features/shared/agency-task-chooser-catalog";
import { orpc } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import { useTeamWorkSchedule } from "@/features/shared/use-team-work-schedule";
import { pinnedWeekKeyFromVirtualTop } from "@/features/time-tracking/week-head-state";
import {
  flattenTimeEntryWeeksForVirtualization,
  groupEntriesByWeek,
  type CollapsedEntryGroup,
  type TimeEntryWeekGroup,
  type VirtualTimeEntryDay,
} from "@/features/time-tracking/group-time-entries";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/features/time-tracking/agency-time-entry";
import { resolveWasteTogglePatch } from "@/features/time-tracking/agency-entry-group-waste";
import {
  buildAgencyTimeEntryLinksUpdatePayload,
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/features/time-tracking/stores/agency-time-tracking";
import {
  createAgencyTag,
  useAgencyTagsQuery,
} from "@/features/time-tracking/hooks/use-agency-tags";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import type { AgencyDayBulkDraft } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500] as const;
const ESTIMATED_ENTRY_ROW_HEIGHT = 56;
const ESTIMATED_DAY_HEADER_HEIGHT = 52;
const WEEK_HEADER_HEIGHT = 62;
const DAY_GAP = 20;
const VIRTUALIZE_DAY_THRESHOLD = 16;

type UseAgencyTimeEntriesLogOptions = {
  teamId: string;
  className?: string;
};

export type AgencyTimeEntriesLogViewModel = {
  teamId: string;
  className?: string;
  logQueryError: string | null;
  onRetry: () => void;
  isLoading: boolean;
  entriesEmpty: boolean;
  weekGroups: TimeEntryWeekGroup[];
  virtualDays: VirtualTimeEntryDay[];
  virtualize: boolean;
  virtualItems: Array<{ index: number; key: string | number | bigint; start: number }>;
  virtualTotalSize: number;
  measureVirtualDay: (element: HTMLDivElement | null) => void;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  tags: AgencyTagOption[];
  tagCreatePending: boolean;
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
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
  selectedEntryIds: Set<string>;
  bulkEditDayKey: string | null;
  bulkFieldEditOpen: boolean;
  bulkDraft: AgencyDayBulkDraft;
  wastePending: boolean;
  onBulkDraftChange: (patch: Partial<AgencyDayBulkDraft>) => void;
  onToggleEntrySelected: (entryIds: string[]) => void;
  onToggleDayBulkEdit: (dateKey: string) => void;
  onToggleBulkFieldEdit: () => void;
  onDeleteSelected: (entryIds: string[]) => void;
  onMarkSelectedAsWaste: (entryIds: string[]) => void;
  onApplyBulk: () => void;
  onCreateTag: (name: string) => void;
  onRequestOpenTaskChooser: () => void;
  pinnedWeekOverlay: {
    weekStartKey: string;
    label: string;
    totalSeconds: number;
  } | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  showPagination: boolean;
  page: number;
  maxPage: number;
  rangeStart: number;
  rangeEnd: number;
  totalEntries: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
};

export function useAgencyTimeEntriesLog({
  teamId,
  className,
}: UseAgencyTimeEntriesLogOptions): AgencyTimeEntriesLogViewModel {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((s) => s.deletingEntryIds);
  const updatingEntryIds = useAgencyTimeTrackingStore((s) => s.updatingEntryIds);
  const duplicatingEntryIds = useAgencyTimeTrackingStore((s) => s.duplicatingEntryIds);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const requestOpenTaskChooser = useAgencyTimeTrackingStore((s) => s.requestOpenTaskChooser);

  const page = useAgencyTimeEntriesLogStore((s) => s.page);
  const pageSize = useAgencyTimeEntriesLogStore((s) => s.pageSize);
  const expandedGroupKeys = useAgencyTimeEntriesLogStore((s) => s.expandedGroupKeys);
  const setPage = useAgencyTimeEntriesLogStore((s) => s.setPage);
  const setPageSize = useAgencyTimeEntriesLogStore((s) => s.setPageSize);
  const toggleGroupExpand = useAgencyTimeEntriesLogStore((s) => s.toggleGroupExpand);
  const resetForTeam = useAgencyTimeEntriesLogStore((s) => s.resetForTeam);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(() => new Set());
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

  const entriesQuery = useAgencyTimeEntriesQuery(teamId, page, pageSize);
  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId);
  const tagsQuery = useAgencyTagsQuery(teamId);
  const entries = entriesQuery.data?.items ?? [];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];
  const tags = (tagsQuery.data?.items ?? []) as AgencyTagOption[];
  const weekSummary = entriesQuery.data?.weekSummary ?? null;
  const weekSummaries = entriesQuery.data?.weekSummaries ?? [];

  const workSchedule = useTeamWorkSchedule(teamId);

  const weekGroups = useMemo(() => {
    const groups = groupEntriesByWeek(entries, new Date(), workSchedule.weekStartsOn);
    const summariesByWeek = new Map(
      weekSummaries.map((summary) => [summary.weekStartKey, summary]),
    );
    if (weekSummary?.weekStartKey) {
      summariesByWeek.set(weekSummary.weekStartKey, weekSummary);
    }

    return groups.map((week) => {
      const summary = summariesByWeek.get(week.weekStartKey);
      if (!summary) return week;

      const apiDaily = new Map(summary.daily.map((daily) => [daily.date, daily.totalSeconds]));
      const days = week.days.map((day) => ({
        ...day,
        totalSeconds: apiDaily.get(day.dateKey) ?? day.totalSeconds,
      }));

      return { ...week, days, totalSeconds: summary.totalSeconds };
    });
  }, [entries, weekSummaries, weekSummary, workSchedule.weekStartsOn]);
  const virtualDays = useMemo(
    () => flattenTimeEntryWeeksForVirtualization(weekGroups),
    [weekGroups],
  );
  const virtualize = virtualDays.length > VIRTUALIZE_DAY_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: virtualize ? virtualDays.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    getItemKey: (index) => virtualDays[index]?.key ?? index,
    estimateSize: (index) => {
      const item = virtualDays[index];
      if (!item) return ESTIMATED_DAY_HEADER_HEIGHT + ESTIMATED_ENTRY_ROW_HEIGHT + DAY_GAP;
      const displayGroupCount =
        bulkEditDayKey === item.day.dateKey
          ? item.day.groups.reduce((count, group) => count + group.entries.length, 0)
          : item.day.groups.length;
      return (
        (item.week ? WEEK_HEADER_HEIGHT : 0) +
        ESTIMATED_DAY_HEADER_HEIGHT +
        displayGroupCount * ESTIMATED_ENTRY_ROW_HEIGHT +
        DAY_GAP
      );
    },
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const firstVisibleIndex = virtualItems[0]?.index ?? -1;
  const overlayWeekKey = pinnedWeekKeyFromVirtualTop(
    virtualDays.map((item) => item.week?.weekStartKey ?? null),
    firstVisibleIndex,
  );
  const overlayWeek =
    virtualDays.find((item) => item.week?.weekStartKey === overlayWeekKey)?.week ?? null;
  const firstVisibleHasWeek = Boolean(virtualDays[firstVisibleIndex]?.week);
  const pinnedWeekOverlay = overlayWeek && !firstVisibleHasWeek ? overlayWeek : null;

  const maxPage = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalEntries / pageSize));
  }, [pageSize, totalEntries]);

  const rangeStart = totalEntries === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalEntries);

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [maxPage, page, setPage]);

  useEffect(() => {
    resetForTeam();
  }, [teamId, resetForTeam]);

  useEffect(() => {
    if (!teamId || page >= maxPage || totalEntries === 0) return;
    try {
      const utcOffsetMinutes = new Date().getTimezoneOffset();
      void getQueryClient().prefetchQuery(
        prefetchAgencySyncQueryOptions(
          orpc.agencyOps.timeEntries.listMine.queryOptions({
            input: { teamId, page: page + 1, pageSize, utcOffsetMinutes },
          }),
          "hot",
        ),
      );
    } catch {
      // QueryProvider binds the client after first paint in some boot paths.
    }
  }, [teamId, page, pageSize, maxPage, totalEntries]);

  const logQueryError = entriesQuery.error ?? projectsQuery.error ?? null;

  async function deleteEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!teamId || !entry) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: [entry] });
  }

  async function deleteGroupEntries(entryIds: string[]) {
    const selectedEntries = entries.filter((entry) => entryIds.includes(entry.id));
    if (!teamId || selectedEntries.length === 0) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: selectedEntries });
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

    await agencyTimeTrackingStore.updateEntry({
      teamId,
      entryId: entry.id,
      previousEntry: entry,
      projectId: project.id,
      taskId: task?.id ?? null,
      task,
      project,
      description: draft.description,
      startAt: range.startAt,
      endAt: range.endAt,
      durationSeconds: range.durationSeconds,
      tagIds: draft.tagIds,
      isBillable: draft.isBillable,
    });
  }

  async function saveLinks(entryId: string, links: string[]) {
    const entry = entries.find((item) => item.id === entryId);
    if (!teamId || !entry) return;
    await useAgencyTimeTrackingStore
      .getState()
      .updateEntry(buildAgencyTimeEntryLinksUpdatePayload(entry, teamId, links));
  }

  async function duplicateEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!teamId || !entry) return;
    await agencyTimeTrackingStore.duplicateEntry({ teamId, entry });
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

  function toggleBulkFieldEdit() {
    setBulkFieldEditOpen((current) => !current);
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
      await saveBulkPatch(entryIds, { isWaste: true });
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
      await saveBulkPatch(patch.entryIds, { isWaste: patch.nextIsWaste });
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
    const previousEntries = entryIds
      .map((entryId) => entries.find((item) => item.id === entryId))
      .filter((entry): entry is (typeof entries)[number] => entry != null);
    await agencyTimeTrackingStore.updateEntriesBulk({
      teamId,
      entryIds,
      previousEntries,
      patch,
    });
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
    if (!teamId || tagCreatePending) return;
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
    className,
    logQueryError: logQueryError ? getErrorMessage(logQueryError, "Refresh and try again.") : null,
    onRetry: () => void entriesQuery.refetch(),
    isLoading: entriesQuery.isPending && entries.length === 0,
    entriesEmpty: entries.length === 0,
    weekGroups,
    virtualDays,
    virtualize,
    virtualItems,
    virtualTotalSize: virtualizer.getTotalSize(),
    measureVirtualDay: virtualizer.measureElement,
    projects,
    tasks,
    tags,
    tagCreatePending,
    expandedGroupKeys,
    isTimerMutationPending,
    deletingEntryIds,
    updatingEntryIds,
    duplicatingEntryIds,
    onToggleGroupExpand: toggleGroupExpand,
    onRestart: (group) => void restartEntry(group),
    onDeleteGroup: (entryIds) => void deleteGroupEntries(entryIds),
    onDeleteEntry: (entryId) => void deleteEntry(entryId),
    onDuplicate: (entryId) => void duplicateEntry(entryId),
    onToggleWaste: (entryId) => void toggleEntryWaste(entryId),
    onSaveEdit: saveEdit,
    onSaveLinks: saveLinks,
    onBulkPatch: saveBulkPatch,
    selectedEntryIds,
    bulkEditDayKey,
    bulkFieldEditOpen,
    bulkDraft,
    wastePending,
    onBulkDraftChange: (patch) => setBulkDraft((current) => ({ ...current, ...patch })),
    onToggleEntrySelected: toggleEntrySelected,
    onToggleDayBulkEdit: toggleDayBulkEdit,
    onToggleBulkFieldEdit: toggleBulkFieldEdit,
    onDeleteSelected: (entryIds) => void deleteSelected(entryIds),
    onMarkSelectedAsWaste: (entryIds) => void markSelectedAsWaste(entryIds),
    onApplyBulk: () => void applyBulkPatch(),
    onCreateTag: createTag,
    onRequestOpenTaskChooser: requestOpenTaskChooser,
    pinnedWeekOverlay,
    scrollContainerRef,
    showPagination: totalEntries > pageSize,
    page,
    maxPage,
    rangeStart,
    rangeEnd,
    totalEntries,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    onPreviousPage: () => setPage(Math.max(1, page - 1)),
    onNextPage: () => setPage(Math.min(maxPage, page + 1)),
    onPageSizeChange: setPageSize,
  };
}
