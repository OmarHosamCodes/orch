import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { orpcClient } from "@/lib/orpc";

const DEBOUNCE_MS = 2_500;
const MAX_WAIT_MS = 10_000;

type PendingReportActivityAction =
  | "created"
  | "renamed"
  | "entries_excluded"
  | "entries_restored"
  | "entry_edited"
  | "waste_toggled"
  | "exported";

export type PendingReportActivity = {
  action: PendingReportActivityAction;
  payload?: Record<string, unknown>;
};

export type AgencyReportAutosaveState = "idle" | "pending" | "saving" | "saved" | "error";

type UseAgencyReportAutosaveOptions = {
  teamId: string;
  reportId: string;
  name: string;
  excludedEntryIds: Set<string>;
  enabled?: boolean;
  initialBaseline?: { name: string; excludedEntryIds: string[] };
  onSaved?: (savedAt: Date) => void;
};

function setsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function coalesceActivities(activities: PendingReportActivity[]): PendingReportActivity[] {
  let excludedCount = 0;
  let restoredCount = 0;
  const others: PendingReportActivity[] = [];

  for (const activity of activities) {
    if (activity.action === "entries_excluded") {
      excludedCount += Number(activity.payload?.count ?? 1);
    } else if (activity.action === "entries_restored") {
      restoredCount += Number(activity.payload?.count ?? 1);
    } else {
      others.push(activity);
    }
  }

  const coalesced: PendingReportActivity[] = [...others];
  if (excludedCount > 0) {
    coalesced.push({ action: "entries_excluded", payload: { count: excludedCount } });
  }
  if (restoredCount > 0) {
    coalesced.push({ action: "entries_restored", payload: { count: restoredCount } });
  }
  return coalesced;
}

export function useAgencyReportAutosave({
  teamId,
  reportId,
  name,
  excludedEntryIds,
  enabled = true,
  initialBaseline,
  onSaved,
}: UseAgencyReportAutosaveOptions) {
  const [state, setState] = useState<AgencyReportAutosaveState>(initialBaseline ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(initialBaseline ? new Date() : null);

  const lastSavedNameRef = useRef(initialBaseline?.name ?? name);
  const lastSavedExcludedRef = useRef<Set<string>>(
    new Set(initialBaseline?.excludedEntryIds ?? excludedEntryIds),
  );
  const pendingActivitiesRef = useRef<PendingReportActivity[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushInFlightRef = useRef(false);
  const needsFlushRef = useRef(false);

  const saveMutation = useMutation({
    mutationFn: async (input: {
      name?: string;
      excludedEntryIds?: string[];
      actions?: PendingReportActivity[];
    }) => {
      return orpcClient.agencyOps.reports.saved.update({
        teamId,
        reportId,
        ...input,
      });
    },
  });

  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    if (!enabled || flushInFlightRef.current) {
      needsFlushRef.current = true;
      return;
    }

    clearTimers();

    const nameChanged = name !== lastSavedNameRef.current;
    const exclusionsChanged = !setsEqual(excludedEntryIds, lastSavedExcludedRef.current);
    const activities = coalesceActivities(pendingActivitiesRef.current);

    if (!nameChanged && !exclusionsChanged && activities.length === 0) {
      setState(lastSavedAt ? "saved" : "idle");
      return;
    }

    flushInFlightRef.current = true;
    setState("saving");

    try {
      await saveMutation.mutateAsync({
        ...(nameChanged ? { name } : {}),
        ...(exclusionsChanged ? { excludedEntryIds: [...excludedEntryIds] } : {}),
        ...(activities.length > 0 ? { actions: activities } : {}),
      });

      lastSavedNameRef.current = name;
      lastSavedExcludedRef.current = new Set(excludedEntryIds);
      pendingActivitiesRef.current = [];
      const savedAt = new Date();
      setLastSavedAt(savedAt);
      setState("saved");
      onSaved?.(savedAt);
    } catch {
      setState("error");
    } finally {
      flushInFlightRef.current = false;
      if (needsFlushRef.current) {
        needsFlushRef.current = false;
        void flush();
      }
    }
  }, [
    clearTimers,
    enabled,
    excludedEntryIds,
    lastSavedAt,
    name,
    onSaved,
    reportId,
    saveMutation,
    teamId,
  ]);

  const scheduleFlush = useCallback(() => {
    if (!enabled) return;
    setState("pending");
    needsFlushRef.current = false;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);

    if (!maxWaitTimerRef.current) {
      maxWaitTimerRef.current = setTimeout(() => {
        void flush();
      }, MAX_WAIT_MS);
    }
  }, [enabled, flush]);

  const queueActivity = useCallback(
    (activity: PendingReportActivity) => {
      pendingActivitiesRef.current.push(activity);
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const markBaseline = useCallback((baseline: { name: string; excludedEntryIds: string[] }) => {
    lastSavedNameRef.current = baseline.name;
    lastSavedExcludedRef.current = new Set(baseline.excludedEntryIds);
    setState("saved");
    setLastSavedAt(new Date());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const nameChanged = name !== lastSavedNameRef.current;
    const exclusionsChanged = !setsEqual(excludedEntryIds, lastSavedExcludedRef.current);

    if (nameChanged || exclusionsChanged) {
      scheduleFlush();
    }
  }, [enabled, excludedEntryIds, name, scheduleFlush]);

  // Keep stable flush/clearTimers for unmount + pagehide so name edits don't
  // re-bind this effect and immediately flush on every keystroke.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const clearTimersRef = useRef(clearTimers);
  clearTimersRef.current = clearTimers;

  useEffect(() => {
    function handlePageHide() {
      void flushRef.current();
    }

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      void flushRef.current();
      clearTimersRef.current();
    };
  }, []);

  return {
    state,
    lastSavedAt,
    queueActivity,
    markBaseline,
    retry: () => void flush(),
  };
}
