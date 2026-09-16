import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  normalizeReportFieldIds,
  parseReportFieldsParam,
  serializeReportFieldsParam,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import type {
  AggregatedReportRow,
  AgencyReportEntry,
} from "@/features/reports/agency-report-grouping";
import {
  AGENCY_REPORT_MERGE_TASKS_PARAM,
  parseMergeSameTaskNamesParam,
  serializeMergeSameTaskNamesParam,
} from "@/features/reports/agency-report-merge-tasks";
import {
  formatRelativeReportTime,
  suggestAgencyReportName,
} from "@/features/reports/agency-report-naming";
import { buildPreviewDocumentClients } from "@/features/reports/agency-report-preview";
import {
  areSameShowWaste,
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  parseShowWasteParam,
  serializeShowWasteParam,
  type AgencyReportShowWaste,
} from "@/features/reports/agency-report-show-waste";
import type { AgencyReportStudioOptionsViewProps } from "@/features/reports/agency-report-studio-options-view";
import {
  exportAgencyReportXlsx,
  exportAgencyReportXlsxPerClient,
} from "@/features/reports/export-agency-report-xlsx";
import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import {
  useSavedReportsList,
  useSavedReportsListBody,
} from "@/features/reports/hooks/use-agency-saved-reports-list";
import { useAgencyReportAutosave } from "@/features/reports/use-agency-report-autosave";
import { useAgencyReportCreator } from "@/features/reports/use-agency-report-creator";
import { parseAgencyPeriodQuery } from "@/features/shared/agency-period-query";
import { agencyReportHref } from "@/features/shared/agency-segments";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import { useAgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { useNavigate, useParams, useSearchParams } from "@/lib/navigation";
import { orpc, orpcClient } from "@/lib/orpc";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";

const RANGE_PRESETS = ["tenure", "today", "week", "month", "last30", "custom"] as const;
const PER_CLIENT_DOWNLOAD_STAGGER_MS = 150;
const REPORT_CHAPTER_HEADER_PX = 44;
const REPORT_CHAPTER_TABLE_HEAD_PX = 40;
const REPORT_CHAPTER_ROW_PX = 56;
const REPORT_CHAPTER_GAP_PX = 32;

function asRangePreset(value: string): RangePreset {
  for (const preset of RANGE_PRESETS) {
    if (preset === value) return preset;
  }
  return "custom";
}

function splitJoinedIds(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function downloadBlobFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export type UseAgencyReportsSurfaceProps = {
  teamId: string;
};

export function useAgencyReportsSurface({ teamId }: UseAgencyReportsSurfaceProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = useParams<{ reportId?: string }>().reportId ?? "";
  const hydratedRecipeIdRef = useRef<string | null>(null);

  const initialCustomRange = useMemo(
    () => parseAgencyPeriodQuery(searchParams),
    // Seed once from the landing URL; recipe hydrate overwrites when a report loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialFieldIds = useMemo(
    () => parseReportFieldsParam(searchParams.get("fields")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialShowWaste = useMemo(
    () => parseShowWasteParam(searchParams.get("showWaste")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialMergeSameTaskNames = useMemo(
    () => parseMergeSameTaskNamesParam(searchParams.get(AGENCY_REPORT_MERGE_TASKS_PARAM)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const timeRange = useAgencyTimeRangeFilters({
    teamId,
    includeClientFilter: true,
    fetchEntries: false,
    liveApply: true,
    initialCustomRange,
    initialFieldIds,
    initialShowWaste,
    initialMergeSameTaskNames,
  });

  const reportQuery = useQuery({
    queryKey: ["agency-reports", "saved", teamId, reportId],
    queryFn: () => orpcClient.agencyOps.reports.saved.get({ teamId, reportId }),
    enabled: Boolean(teamId && reportId),
  });
  const report = reportQuery.data;

  const savedListQuery = useSavedReportsList({ teamId, enabled: Boolean(teamId) });
  const savedItems = savedListQuery.data?.items ?? [];
  const recipesVm = useSavedReportsListBody({
    items: savedItems,
    searchContext: {
      clients: timeRange.clients,
      members: timeRange.members,
    },
  });

  const [recipeName, setRecipeName] = useState("");
  const [committedRecipeName, setCommittedRecipeName] = useState("");
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [exportPhase, setExportPhase] = useState<"idle" | "building" | "downloading">("idle");
  const [detailsRow, setDetailsRow] = useState<AggregatedReportRow | null>(null);
  const [recipeReady, setRecipeReady] = useState(() => !reportId);

  const visibleFields = useMemo<AgencyReportFieldId[]>(() => {
    const fromUrl = searchParams.get("fields");
    if (fromUrl) return parseReportFieldsParam(fromUrl);
    return report ? normalizeReportFieldIds(report.fieldIds) : allAgencyReportFieldIds();
  }, [report, searchParams]);

  const showWaste = useMemo(
    () => parseShowWasteParam(searchParams.get("showWaste")),
    [searchParams],
  );
  const mergeSameTaskNames = useMemo(
    () => parseMergeSameTaskNamesParam(searchParams.get(AGENCY_REPORT_MERGE_TASKS_PARAM)),
    [searchParams],
  );

  const replaceReportSearchParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      next.delete("section");
      next.delete("report");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleFieldIdsChange = useCallback(
    (fieldIds: AgencyReportFieldId[]) => {
      replaceReportSearchParams((next) => {
        const nextFields = fieldIds.length > 0 ? fieldIds : allAgencyReportFieldIds();
        if (areSameReportFieldSets(nextFields, allAgencyReportFieldIds())) {
          next.delete("fields");
        } else {
          next.set("fields", serializeReportFieldsParam(nextFields));
        }
      });
    },
    [replaceReportSearchParams],
  );

  const handleShowWasteChange = useCallback(
    (nextShowWaste: AgencyReportShowWaste) => {
      replaceReportSearchParams((next) => {
        if (areSameShowWaste(nextShowWaste, DEFAULT_AGENCY_REPORT_SHOW_WASTE)) {
          next.delete("showWaste");
        } else {
          next.set("showWaste", serializeShowWasteParam(nextShowWaste));
        }
      });
    },
    [replaceReportSearchParams],
  );

  const handleMergeSameTaskNamesChange = useCallback(
    (nextMerge: boolean) => {
      replaceReportSearchParams((next) => {
        const mergeParam = serializeMergeSameTaskNamesParam(nextMerge);
        if (!mergeParam) {
          next.delete(AGENCY_REPORT_MERGE_TASKS_PARAM);
        } else {
          next.set(AGENCY_REPORT_MERGE_TASKS_PARAM, mergeParam);
        }
      });
    },
    [replaceReportSearchParams],
  );

  const recipePending = Boolean(reportId) && (reportQuery.isPending || !recipeReady);
  const range = timeRange.applied.range;
  const previewInput = useMemo(
    () => ({
      teamId,
      from: range.from,
      to: range.to,
      clientIds: timeRange.applied.clientIds,
      projectIds: timeRange.applied.projectIds,
      memberUserIds: timeRange.applied.memberUserIds,
    }),
    [
      range.from,
      range.to,
      teamId,
      timeRange.applied.clientIds,
      timeRange.applied.memberUserIds,
      timeRange.applied.projectIds,
    ],
  );

  const previewQuery = useQuery({
    ...orpc.agencyOps.reports.preview.queryOptions({ input: previewInput }),
    enabled: Boolean(teamId) && !recipePending,
    placeholderData: keepPreviousData,
  });

  const previewEntries = useMemo<AgencyReportEntry[]>(
    () => previewQuery.data?.clients.flatMap((client) => client.entries) ?? [],
    [previewQuery.data?.clients],
  );

  const creator = useAgencyReportCreator(previewEntries, {
    initialExcludedEntryIds: report?.excludedEntryIds,
    showWaste,
    resetKey: report?.id ?? "unsaved",
  });

  const autosave = useAgencyReportAutosave({
    teamId,
    reportId,
    name: committedRecipeName,
    excludedEntryIds: creator.excludedEntryIds,
    enabled: Boolean(reportId && committedRecipeName && report),
    initialBaseline: report
      ? { name: report.name, excludedEntryIds: report.excludedEntryIds }
      : undefined,
  });

  useEffect(() => {
    if (!reportId) {
      hydratedRecipeIdRef.current = null;
      setRecipeReady(true);
      return;
    }
    if (hydratedRecipeIdRef.current !== reportId) {
      setRecipeReady(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!report) return;
    if (hydratedRecipeIdRef.current === report.id) return;
    hydratedRecipeIdRef.current = report.id;
    const snapshot = timeRange.captureAppliedSnapshot();
    timeRange.restoreSnapshot({
      id: report.id,
      savedAt: report.updatedAt,
      ...snapshot,
      rangePreset: asRangePreset(report.rangePreset),
      customFromDate: report.customFromDate,
      customToDate: report.customToDate,
      clientId: report.clientId,
      projectId: report.projectId,
      memberUserId: report.memberUserId,
      clientIds: splitJoinedIds(report.clientId),
      projectIds: splitJoinedIds(report.projectId),
      memberUserIds: splitJoinedIds(report.memberUserId),
      fieldIds: normalizeReportFieldIds(report.fieldIds),
      range: { from: report.rangeFrom, to: report.rangeTo },
    });
    setRecipeName(report.name);
    setCommittedRecipeName(report.name);
    autosave.markBaseline({ name: report.name, excludedEntryIds: report.excludedEntryIds });
    setRecipeReady(true);
    // Recipe identity is the only reseed; live scope edits must not rewind to the snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  const documentClients = useMemo(
    () =>
      buildPreviewDocumentClients(previewQuery.data?.clients ?? [], {
        showWaste,
        mergeSameTaskNames,
        excludedEntryIds: creator.excludedEntryIds,
      }),
    [creator.excludedEntryIds, mergeSameTaskNames, previewQuery.data?.clients, showWaste],
  );

  const chapterScrollRef = useRef<HTMLDivElement | null>(null);
  const jumpScrollTopRef = useRef<number | null>(null);
  const [pinnedClientId, setPinnedClientId] = useState<string | null>(null);
  const [, bumpChapterRange] = useReducer((count: number) => count + 1, 0);
  const estimateChapterSize = useCallback(
    (index: number) => {
      const rowCount = documentClients[index]?.rowCount ?? 1;
      return (
        REPORT_CHAPTER_HEADER_PX +
        REPORT_CHAPTER_TABLE_HEAD_PX +
        rowCount * REPORT_CHAPTER_ROW_PX +
        REPORT_CHAPTER_GAP_PX
      );
    },
    [documentClients],
  );
  const chapterVirtualizer = useVirtualizer({
    count: documentClients.length,
    getScrollElement: () => chapterScrollRef.current,
    estimateSize: estimateChapterSize,
    overscan: 2,
    getItemKey: (index) => documentClients[index]?.clientId ?? index,
    observeElementOffset: bindReportChapterOffset,
    observeElementRect: bindReportChapterRect,
  });
  const handleJumpToClient = useCallback(
    (clientId: string) => {
      const index = documentClients.findIndex((client) => client.clientId === clientId);
      if (index < 0) return;
      setPinnedClientId(clientId);
      jumpScrollTopRef.current = null;
      chapterVirtualizer.scrollToIndex(index, { align: "start", behavior: "auto" });
      const element = chapterScrollRef.current;
      if (element && syncReportChapterScroll(chapterVirtualizer, element.scrollTop)) {
        bumpChapterRange();
      }
    },
    [chapterVirtualizer, documentClients],
  );
  const handleChapterScroll = useCallback(() => {
    const element = chapterScrollRef.current;
    if (!element) return;
    if (!syncReportChapterScroll(chapterVirtualizer, element.scrollTop)) return;
    bumpChapterRange();
  }, [chapterVirtualizer]);
  const virtualItems = chapterVirtualizer.getVirtualItems();
  const virtualTotalSize = chapterVirtualizer.getTotalSize();
  const visibleStartIndex = chapterVirtualizer.range?.startIndex ?? virtualItems[0]?.index ?? 0;
  const visibleClientId = documentClients[visibleStartIndex]?.clientId ?? null;
  const currentClientId = pinnedClientId ?? visibleClientId;
  useEffect(() => {
    if (pinnedClientId != null && visibleClientId === pinnedClientId) {
      setPinnedClientId(null);
    }
  }, [pinnedClientId, visibleClientId]);
  useLayoutEffect(() => {
    if (pinnedClientId == null) return;
    const index = documentClients.findIndex((client) => client.clientId === pinnedClientId);
    if (index < 0 || visibleStartIndex === index) return;
    const element = chapterScrollRef.current;
    if (!element) return;
    const before = element.scrollTop;
    chapterVirtualizer.scrollToIndex(index, { align: "start", behavior: "auto" });
    const after = element.scrollTop;
    syncReportChapterScroll(chapterVirtualizer, after);
    if (after === before && jumpScrollTopRef.current === after) {
      setPinnedClientId(null);
    }
    jumpScrollTopRef.current = after;
  }, [chapterVirtualizer, documentClients, pinnedClientId, virtualTotalSize, visibleStartIndex]);
  const outline = useMemo(
    () =>
      documentClients.map((client) => ({
        clientId: client.clientId,
        clientName: client.clientName,
        hoursLabel: formatDuration(client.totalSeconds, "units"),
        isCurrent: client.clientId === currentClientId,
      })),
    [currentClientId, documentClients],
  );
  const currentClient = documentClients.find((client) => client.clientId === visibleClientId);
  const firstVirtual = virtualItems[0];
  const paperScrollTop = chapterVirtualizer.scrollOffset ?? 0;
  const stickyChapter =
    currentClient && firstVirtual != null && paperScrollTop > firstVirtual.start + 8
      ? {
          clientName: currentClient.clientName,
          hoursLabel: formatDuration(currentClient.totalSeconds, "units"),
          amountLabel: currentClient.amountLabel,
        }
      : null;
  const virtualChapters = virtualItems.flatMap((item) => {
    const client = documentClients[item.index];
    if (!client) return [];
    return [
      {
        index: item.index,
        key: String(item.key),
        start: item.start,
        client,
      },
    ];
  });

  const totalSeconds = previewQuery.data?.totals.totalSeconds ?? 0;
  const totalEntries = previewQuery.data?.totals.totalEntries ?? 0;
  const isEmpty = !previewQuery.isPending && totalSeconds === 0 && totalEntries === 0;

  const handleGoToTracker = useCallback(() => {
    navigate("/agency");
  }, [navigate]);

  const handleEditDetails = useCallback((row: AggregatedReportRow) => {
    if (row.entries.length === 0) return;
    setDetailsRow(row);
  }, []);

  const handleDetailsOpenChange = useCallback((open: boolean) => {
    if (!open) setDetailsRow(null);
  }, []);

  const handleExcludeRow = useCallback(
    (row: AggregatedReportRow) => {
      const excluded = creator.excludeEntries(row.entries.map((entry) => entry.id));
      if (excluded.length > 0 && report) {
        autosave.queueActivity({ action: "entries_excluded", payload: { count: excluded.length } });
      }
    },
    [autosave, creator, report],
  );

  const handleUndoExclude = useCallback(() => {
    const restored = creator.undoLastExclude();
    if (!restored) return;
    if (report) {
      autosave.queueActivity({
        action: "entries_restored",
        payload: { count: restored.entryIds.length },
      });
    }
    toast.success(
      restored.entryIds.length === 1
        ? "Restored removed entry"
        : `Restored ${restored.entryIds.length} removed entries`,
    );
  }, [autosave, creator, report]);

  const handleRedoExclude = useCallback(() => {
    const redone = creator.redoLastExclude();
    if (!redone) return;
    if (report) {
      autosave.queueActivity({
        action: "entries_excluded",
        payload: { count: redone.entryIds.length },
      });
    }
  }, [autosave, creator, report]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        if (!creator.canRedo) return;
        event.preventDefault();
        handleRedoExclude();
        return;
      }
      if (key === "z") {
        if (!creator.canUndo) return;
        event.preventDefault();
        handleUndoExclude();
        return;
      }
      if (key === "y") {
        if (!creator.canRedo) return;
        event.preventDefault();
        handleRedoExclude();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [creator.canRedo, creator.canUndo, handleRedoExclude, handleUndoExclude]);

  const recipeHref = useCallback(
    (nextReportId: string) => {
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      next.delete("report");
      const query = next.toString();
      return query ? `${agencyReportHref(nextReportId)}?${query}` : agencyReportHref(nextReportId);
    },
    [searchParams],
  );

  const handleSelectRecipe = useCallback(
    (nextReportId: string) => {
      if (nextReportId === reportId) return;
      navigate(recipeHref(nextReportId));
    },
    [navigate, recipeHref, reportId],
  );

  const handleRecipeNameChange = useCallback((name: string) => {
    setRecipeName(name);
  }, []);

  const handleSaveRecipe = useCallback(async () => {
    if (savingRecipe) return;
    const snapshot = timeRange.captureAppliedSnapshot();
    const name =
      recipeName.trim() ||
      suggestAgencyReportName(
        {
          range: snapshot.range,
          clientId:
            snapshot.clientIds.length === 1
              ? snapshot.clientIds[0]
              : snapshot.clientId || undefined,
          memberUserId:
            snapshot.memberUserIds.length === 1
              ? snapshot.memberUserIds[0]
              : snapshot.memberUserId || undefined,
        },
        { clients: timeRange.clients, members: timeRange.members },
      );
    if (!name) return;

    if (reportId && report) {
      setRecipeName(name);
      setCommittedRecipeName(name);
      if (name !== report.name) {
        autosave.queueActivity({ action: "renamed", payload: { name } });
      }
      return;
    }

    setSavingRecipe(true);
    try {
      const created = await orpcClient.agencyOps.reports.saved.create({
        teamId,
        name,
        rangePreset: snapshot.rangePreset,
        customFromDate: snapshot.customFromDate,
        customToDate: snapshot.customToDate,
        rangeFrom: snapshot.range.from,
        rangeTo: snapshot.range.to,
        clientId: snapshot.clientIds.join(",") || snapshot.clientId || undefined,
        projectId: snapshot.projectIds.join(",") || snapshot.projectId || undefined,
        memberUserId: snapshot.memberUserIds.join(",") || snapshot.memberUserId || undefined,
        fieldIds: visibleFields,
      });
      if (creator.excludedEntryIds.size > 0) {
        await orpcClient.agencyOps.reports.saved.update({
          teamId,
          reportId: created.id,
          excludedEntryIds: [...creator.excludedEntryIds],
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "saved", teamId] });
      toast.success("Recipe saved");
      navigate(recipeHref(created.id));
    } catch (error) {
      toast.error("Couldn't save recipe", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setSavingRecipe(false);
    }
  }, [
    autosave,
    creator.excludedEntryIds,
    navigate,
    queryClient,
    recipeHref,
    recipeName,
    report,
    reportId,
    savingRecipe,
    teamId,
    timeRange,
    visibleFields,
  ]);

  useEffect(() => {
    if (!reportId) return;
    const trimmed = recipeName.trim();
    if (!trimmed || trimmed === committedRecipeName) return;
    const timer = window.setTimeout(() => {
      setCommittedRecipeName(trimmed);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [committedRecipeName, recipeName, reportId]);

  const handleExport = useCallback(
    async (mode: "combined" | "per-client") => {
      if (!teamId || exportPhase !== "idle" || totalSeconds === 0) return;
      setExportPhase("building");
      try {
        const entries = await fetchAllReportEntries(teamId, range, {
          clientIds: timeRange.applied.clientIds,
          projectIds: timeRange.applied.projectIds,
          memberUserIds: timeRange.applied.memberUserIds,
        });
        const input = {
          teamId,
          reportName: recipeName.trim() || "Report",
          entries,
          excludedEntryIds: creator.excludedEntryIds,
          entryOverrides: creator.entryOverrides,
          visibleFields,
          showWaste,
          mergeSameTaskNames,
          rangeFrom: range.from,
          rangeTo: range.to,
        };
        setExportPhase("downloading");
        const files =
          mode === "per-client"
            ? await exportAgencyReportXlsxPerClient(input)
            : [await exportAgencyReportXlsx(input)];
        if (files.length === 0) {
          toast.error("Nothing to export", {
            description: "No clients left after the current filters.",
          });
          setExportPhase("idle");
          return;
        }
        for (const [index, file] of files.entries()) {
          downloadBlobFile(file.fileName, file.blob);
          if (index < files.length - 1) {
            await delay(PER_CLIENT_DOWNLOAD_STAGGER_MS);
          }
        }
        if (report) autosave.queueActivity({ action: "exported" });
        setExportPhase("idle");
      } catch (error) {
        setExportPhase("idle");
        toast.error("Couldn't export", {
          description: getErrorMessage(error, "Try again."),
        });
      }
    },
    [
      autosave,
      creator.entryOverrides,
      creator.excludedEntryIds,
      exportPhase,
      mergeSameTaskNames,
      range,
      recipeName,
      report,
      showWaste,
      teamId,
      timeRange.applied.clientIds,
      timeRange.applied.memberUserIds,
      timeRange.applied.projectIds,
      totalSeconds,
      visibleFields,
    ],
  );

  const autosaveLabel =
    autosave.state === "pending" || autosave.state === "saving"
      ? "Saving…"
      : autosave.state === "error"
        ? "Couldn't save"
        : autosave.state === "saved" && autosave.lastSavedAt
          ? `Saved · ${formatRelativeReportTime(autosave.lastSavedAt.toISOString())}`
          : null;

  const isPending = recipePending || (previewQuery.isPending && !previewQuery.isPlaceholderData);
  const isError = reportQuery.isError || previewQuery.isError;
  const error = reportQuery.isError
    ? getErrorMessage(reportQuery.error, "Try going back to Reports.")
    : getErrorMessage(previewQuery.error, "Try refreshing.");

  const options: Omit<AgencyReportStudioOptionsViewProps, "activityMenu"> = {
    scope: {
      clientIds: timeRange.clientIds,
      clientOptions: timeRange.clientOptions,
      clientsLoading: timeRange.clientsLoading,
      onClientIdsChange: timeRange.onClientIdsChange,
      projectIds: timeRange.projectIds,
      projectFilterGroups: timeRange.projectFilterGroups,
      projectsLoading: timeRange.projectsLoading,
      onProjectIdsChange: timeRange.onProjectIdsChange,
      memberUserIds: timeRange.memberUserIds,
      memberOptions: timeRange.memberOptions,
      onMemberUserIdsChange: timeRange.onMemberUserIdsChange,
      rangePreset: timeRange.rangePreset,
      onRangePresetChange: timeRange.onRangePresetChange,
      tenureAvailable: timeRange.tenureAvailable,
      tenurePeriodLabel: timeRange.tenurePeriodLabel,
      tenureQuarterLabel: timeRange.tenureQuarterLabel,
      tenureQuarterMonths: timeRange.tenureQuarterMonths,
      tenureMonthIndexes: timeRange.tenureMonthIndexes,
      onTenureMonthIndexesChange: timeRange.onTenureMonthIndexesChange,
      customFromDate: timeRange.customFromDate,
      customToDate: timeRange.customToDate,
      onCustomFromChange: timeRange.onCustomFromChange,
      onCustomToChange: timeRange.onCustomToChange,
      canReset: timeRange.canReset,
      onReset: timeRange.onReset,
    },
    fieldIds: visibleFields,
    onFieldIdsChange: handleFieldIdsChange,
    showWaste,
    onShowWasteChange: handleShowWasteChange,
    mergeSameTaskNames,
    onMergeSameTaskNamesChange: handleMergeSameTaskNamesChange,
    recipeName,
    onRecipeNameChange: handleRecipeNameChange,
    recipeId: reportId || null,
    autosaveLabel,
    onSaveRecipe: () => {
      void handleSaveRecipe();
    },
    savingRecipe,
    recipes: {
      items: savedItems,
      vm: recipesVm,
      onSelect: handleSelectRecipe,
      loading: savedListQuery.isPending,
      error: savedListQuery.isError
        ? getErrorMessage(savedListQuery.error, "Couldn't load recipes.")
        : null,
    },
    exportDisabled: totalSeconds === 0 || exportPhase !== "idle",
    exportPhase,
    onExport: (mode) => {
      void handleExport(mode);
    },
  };

  return {
    teamId,
    recipeId: reportId || null,
    options,
    document: {
      isPending,
      isError,
      error,
      onRetry: () => {
        if (reportQuery.isError) void reportQuery.refetch();
        void previewQuery.refetch();
      },
      isEmpty,
      onGoToTracker: handleGoToTracker,
      visibleFields,
      rangeFrom: range.from,
      rangeTo: range.to,
      totalSeconds,
      totalEntries,
      chapterScrollRef,
      outline,
      stickyChapter,
      onJumpToClient: handleJumpToClient,
      onChapterScroll: handleChapterScroll,
      virtualChapters,
      virtualTotalSize,
      measureChapter: chapterVirtualizer.measureElement,
      onEditDetails: handleEditDetails,
      onExcludeRow: handleExcludeRow,
      canUndo: creator.canUndo,
      canRedo: creator.canRedo,
      onUndo: handleUndoExclude,
      onRedo: handleRedoExclude,
    },
    detailsOpen: detailsRow !== null,
    detailsEntries: detailsRow?.entries ?? [],
    detailsLabel: detailsRow?.taskTitle || detailsRow?.description || detailsRow?.projectName || "",
    onDetailsOpenChange: handleDetailsOpenChange,
  };
}

function syncReportChapterScroll(virtualizer: { scrollOffset: number | null }, offset: number) {
  if (virtualizer.scrollOffset === offset) return false;
  virtualizer.scrollOffset = offset;
  return true;
}

function bindReportChapterOffset(
  instance: Pick<Virtualizer<HTMLDivElement, Element>, "scrollElement" | "targetWindow">,
  onOffset: (offset: number, isScrolling: boolean) => void,
) {
  const element = instance.scrollElement;
  if (!(element instanceof HTMLElement)) return;
  instance.targetWindow = element.ownerDocument.defaultView ?? window;
  const handleScroll = () => {
    onOffset(element.scrollTop, true);
  };
  element.addEventListener("scroll", handleScroll, { passive: true });
  onOffset(element.scrollTop, false);
  return () => {
    element.removeEventListener("scroll", handleScroll);
  };
}

function bindReportChapterRect(
  instance: Pick<Virtualizer<HTMLDivElement, Element>, "scrollElement" | "targetWindow">,
  onRect: (rect: { width: number; height: number }) => void,
) {
  const element = instance.scrollElement;
  if (!(element instanceof HTMLElement)) return;
  instance.targetWindow = element.ownerDocument.defaultView ?? window;
  const publish = () => {
    onRect({ width: element.clientWidth, height: element.clientHeight });
  };
  publish();
  const observer = new ResizeObserver(publish);
  observer.observe(element);
  return () => observer.disconnect();
}
