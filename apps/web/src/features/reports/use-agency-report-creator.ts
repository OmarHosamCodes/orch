import type { AgencyTimeEntry } from "@orch/api/schemas/agency-ops";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";
import { filterEntriesByShowWaste } from "@/features/reports/agency-report-grouping";
import {
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  type AgencyReportShowWaste,
} from "@/features/reports/agency-report-show-waste";

type UseAgencyReportCreatorOptions = {
  initialExcludedEntryIds?: string[];
  showWaste?: AgencyReportShowWaste;
  resetKey?: string;
};

export type ReportExcludeHistoryStep = {
  entryIds: string[];
};

export function applyStartEditing(entryId: string) {
  return { selectedEntryId: entryId, editingEntryId: entryId };
}

export function applyExcludeEntries(args: {
  excludedEntryIds: Set<string>;
  excludeUndoStack: ReportExcludeHistoryStep[];
  excludeRedoStack?: ReportExcludeHistoryStep[];
  selectedEntryId: string | null;
  editingEntryId: string | null;
  entryIds: readonly string[];
}) {
  const entryIds = [...new Set(args.entryIds)].filter(
    (entryId) => !args.excludedEntryIds.has(entryId),
  );
  if (entryIds.length === 0) {
    return {
      excludedEntryIds: args.excludedEntryIds,
      excludeUndoStack: args.excludeUndoStack,
      excludeRedoStack: args.excludeRedoStack ?? [],
      selectedEntryId: args.selectedEntryId,
      editingEntryId: args.editingEntryId,
    };
  }

  const excludedEntryIds = new Set([...args.excludedEntryIds, ...entryIds]);
  const selectedCleared = args.selectedEntryId != null && entryIds.includes(args.selectedEntryId);
  const editingCleared = args.editingEntryId != null && entryIds.includes(args.editingEntryId);
  return {
    excludedEntryIds,
    excludeUndoStack: [...args.excludeUndoStack, { entryIds }],
    excludeRedoStack: [] as ReportExcludeHistoryStep[],
    selectedEntryId: selectedCleared ? null : args.selectedEntryId,
    editingEntryId: editingCleared ? null : args.editingEntryId,
  };
}

export function applyExcludeEntry(args: {
  excludedEntryIds: Set<string>;
  excludeUndoStack: ReportExcludeHistoryStep[];
  selectedEntryId: string | null;
  editingEntryId: string | null;
  entryId: string;
}) {
  return applyExcludeEntries({ ...args, entryIds: [args.entryId] });
}

export function applyUndoExclude(args: {
  excludedEntryIds: Set<string>;
  excludeUndoStack: ReportExcludeHistoryStep[];
  excludeRedoStack: ReportExcludeHistoryStep[];
}) {
  const step = args.excludeUndoStack[args.excludeUndoStack.length - 1];
  if (!step) {
    return {
      excludedEntryIds: args.excludedEntryIds,
      excludeUndoStack: args.excludeUndoStack,
      excludeRedoStack: args.excludeRedoStack,
      restored: null as ReportExcludeHistoryStep | null,
    };
  }
  const excludedEntryIds = new Set(args.excludedEntryIds);
  for (const entryId of step.entryIds) excludedEntryIds.delete(entryId);
  return {
    excludedEntryIds,
    excludeUndoStack: args.excludeUndoStack.slice(0, -1),
    excludeRedoStack: [...args.excludeRedoStack, step],
    restored: step,
  };
}

export function applyRedoExclude(args: {
  excludedEntryIds: Set<string>;
  excludeUndoStack: ReportExcludeHistoryStep[];
  excludeRedoStack: ReportExcludeHistoryStep[];
}) {
  const step = args.excludeRedoStack[args.excludeRedoStack.length - 1];
  if (!step) {
    return {
      excludedEntryIds: args.excludedEntryIds,
      excludeUndoStack: args.excludeUndoStack,
      excludeRedoStack: args.excludeRedoStack,
      redone: null as ReportExcludeHistoryStep | null,
    };
  }
  return {
    excludedEntryIds: new Set([...args.excludedEntryIds, ...step.entryIds]),
    excludeUndoStack: [...args.excludeUndoStack, step],
    excludeRedoStack: args.excludeRedoStack.slice(0, -1),
    redone: step,
  };
}

export function useAgencyReportCreator(
  entries: AgencyReportEntry[],
  options: UseAgencyReportCreatorOptions = {},
) {
  const showWaste = options.showWaste ?? DEFAULT_AGENCY_REPORT_SHOW_WASTE;
  const [excludedEntryIds, setExcludedEntryIds] = useState<Set<string>>(
    () => new Set(options.initialExcludedEntryIds ?? []),
  );
  const [excludeUndoStack, setExcludeUndoStack] = useState<ReportExcludeHistoryStep[]>([]);
  const [excludeRedoStack, setExcludeRedoStack] = useState<ReportExcludeHistoryStep[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryOverrides, setEntryOverrides] = useState<Map<string, Partial<AgencyTimeEntry>>>(
    () => new Map(),
  );

  useEffect(() => {
    setExcludedEntryIds(new Set(options.initialExcludedEntryIds ?? []));
    setExcludeUndoStack([]);
    setExcludeRedoStack([]);
  }, [options.resetKey]);

  const targetingRef = useRef({
    excludedEntryIds,
    excludeUndoStack,
    excludeRedoStack,
    selectedEntryId,
    editingEntryId,
  });
  targetingRef.current = {
    excludedEntryIds,
    excludeUndoStack,
    excludeRedoStack,
    selectedEntryId,
    editingEntryId,
  };

  const visibleEntries = useMemo(() => {
    return filterEntriesByShowWaste(
      entries
        .filter((entry) => !excludedEntryIds.has(entry.id))
        .map((entry) => {
          const override = entryOverrides.get(entry.id);
          return override ? ({ ...entry, ...override } as AgencyReportEntry) : entry;
        }),
      showWaste,
    );
  }, [entries, excludedEntryIds, entryOverrides, showWaste]);

  const selectedEntry = useMemo(
    () => visibleEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [visibleEntries, selectedEntryId],
  );

  const selectEntry = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
    setEditingEntryId(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEntryId(null);
    setEditingEntryId(null);
  }, []);

  const excludeEntries = useCallback((entryIds: readonly string[]) => {
    const next = applyExcludeEntries({ ...targetingRef.current, entryIds });
    if (next.excludeUndoStack === targetingRef.current.excludeUndoStack) return [];
    setExcludedEntryIds(next.excludedEntryIds);
    setExcludeUndoStack(next.excludeUndoStack);
    setExcludeRedoStack(next.excludeRedoStack);
    setSelectedEntryId(next.selectedEntryId);
    setEditingEntryId(next.editingEntryId);
    return next.excludeUndoStack[next.excludeUndoStack.length - 1]?.entryIds ?? [];
  }, []);

  const excludeEntry = useCallback(
    (entryId: string) => {
      const excluded = excludeEntries([entryId]);
      return excluded[0];
    },
    [excludeEntries],
  );

  const excludeSelectedEntry = useCallback(() => {
    if (!selectedEntryId) return;
    return excludeEntry(selectedEntryId);
  }, [excludeEntry, selectedEntryId]);

  const undoLastExclude = useCallback(() => {
    const next = applyUndoExclude(targetingRef.current);
    if (!next.restored) return undefined;
    setExcludedEntryIds(next.excludedEntryIds);
    setExcludeUndoStack(next.excludeUndoStack);
    setExcludeRedoStack(next.excludeRedoStack);
    return next.restored;
  }, []);

  const redoLastExclude = useCallback(() => {
    const next = applyRedoExclude(targetingRef.current);
    if (!next.redone) return undefined;
    setExcludedEntryIds(next.excludedEntryIds);
    setExcludeUndoStack(next.excludeUndoStack);
    setExcludeRedoStack(next.excludeRedoStack);
    return next.redone;
  }, []);

  const startEditing = useCallback((entryId: string) => {
    const next = applyStartEditing(entryId);
    setSelectedEntryId(next.selectedEntryId);
    setEditingEntryId(next.editingEntryId);
  }, []);

  const startEditingSelected = useCallback(() => {
    if (!selectedEntryId) return;
    startEditing(selectedEntryId);
  }, [selectedEntryId, startEditing]);

  const cancelEditing = useCallback(() => {
    setEditingEntryId(null);
  }, []);

  const applyEntryOverride = useCallback((entryId: string, patch: Partial<AgencyTimeEntry>) => {
    setEntryOverrides((current) => {
      const next = new Map(current);
      next.set(entryId, { ...current.get(entryId), ...patch });
      return next;
    });
    setEditingEntryId(null);
  }, []);

  const setTaskWaste = useCallback((entryId: string, _taskId: string, isWaste: boolean) => {
    setEntryOverrides((current) => {
      const next = new Map(current);
      const base = current.get(entryId);
      next.set(entryId, { ...base, isWaste, taskIsWaste: base?.taskIsWaste ?? null });
      return next;
    });
  }, []);

  return {
    excludedEntryIds,
    excludeUndoStack,
    excludeRedoStack,
    canUndo: excludeUndoStack.length > 0,
    canRedo: excludeRedoStack.length > 0,
    selectedEntryId,
    editingEntryId,
    entryOverrides,
    visibleEntries,
    selectedEntry,
    selectEntry,
    clearSelection,
    excludeEntry,
    excludeEntries,
    excludeSelectedEntry,
    undoLastExclude,
    redoLastExclude,
    startEditing,
    startEditingSelected,
    cancelEditing,
    applyEntryOverride,
    setTaskWaste,
  };
}

export type AgencyReportCreatorState = ReturnType<typeof useAgencyReportCreator>;
