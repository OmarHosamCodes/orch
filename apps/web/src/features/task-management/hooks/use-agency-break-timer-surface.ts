import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  applyBreakCountdownBackspace,
  applyBreakCountdownDigit,
  breakCountdownSegmentIndexFromCaret,
  breakCountdownSegmentNudgeSeconds,
  breakCountdownShapeToSeconds,
  isBreakCountdownDigitKey,
  moveBreakCountdownSegment,
  normalizeBreakCountdownShape,
  secondsToBreakCountdownShape,
  selectBreakCountdownSegmentInInput,
  type BreakCountdownSegmentIndex,
  type BreakCountdownSlotIndex,
} from "@/features/task-management/break-timer/break-countdown-segments";
import {
  BREAK_PRESET_SECONDS,
  type BreakPresetKey,
  formatBreakDurationMinutes,
  isBreakComplete,
  isBreakPaused,
  isBreakRunning,
  parseBreakDurationInput,
  sanitizeBreakDurationInput,
} from "@/features/task-management/break-timer/break-timer-state";
import {
  useAgencyTrackerRightPanelStore,
  type TrackerRightPanelBreakSurface,
} from "@/features/task-management/stores/agency-tracker-right-panel";

type UseAgencyBreakTimerSurfaceOptions = {
  surfaceId: string;
};

type BreakCountdownCaret = {
  segmentIndex: BreakCountdownSegmentIndex;
  slotIndex: BreakCountdownSlotIndex;
  resetSegment: boolean;
};

type PendingBreakCountdownSelection = {
  segmentIndex: BreakCountdownSegmentIndex;
  slotIndex: BreakCountdownSlotIndex;
  selectWhole: boolean;
};

const initialBreakCountdownCaret = (): BreakCountdownCaret => ({
  segmentIndex: 0,
  slotIndex: 0,
  resetSegment: true,
});

export function useAgencyBreakTimerSurface({ surfaceId }: UseAgencyBreakTimerSurfaceOptions) {
  const surface = useAgencyTrackerRightPanelStore((state) =>
    state.surfaces.find(
      (entry): entry is TrackerRightPanelBreakSurface =>
        entry.id === surfaceId && entry.kind === "break",
    ),
  );
  const startBreak = useAgencyTrackerRightPanelStore((state) => state.startBreak);
  const pauseBreak = useAgencyTrackerRightPanelStore((state) => state.pauseBreak);
  const resetBreak = useAgencyTrackerRightPanelStore((state) => state.resetBreak);
  const setBreakDuration = useAgencyTrackerRightPanelStore((state) => state.setBreakDuration);

  const [customDuration, setCustomDuration] = useState("");
  const [customDurationTouched, setCustomDurationTouched] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState(false);
  const [countdownInputDraft, setCountdownInputDraft] = useState("015:00");
  const countdownInputRef = useRef<HTMLInputElement>(null);
  const countdownCaretRef = useRef<BreakCountdownCaret>(initialBreakCountdownCaret());
  const pendingCountdownSelectionRef = useRef<PendingBreakCountdownSelection | null>(null);

  const running = surface ? isBreakRunning(surface) : false;
  const paused = surface ? isBreakPaused(surface) : false;
  const complete = surface ? isBreakComplete(surface) : false;
  const idle = surface ? surface.startedAt == null : true;

  const remainingSeconds = surface?.remainingSeconds ?? 0;

  const syncCountdownDraftFromSurface = useCallback(() => {
    if (!surface || !idle) return;
    setCountdownInputDraft(secondsToBreakCountdownShape(surface.durationSeconds));
  }, [idle, surface]);

  useLayoutEffect(() => {
    if (editingCountdown) return;
    syncCountdownDraftFromSurface();
  }, [editingCountdown, syncCountdownDraftFromSurface]);

  useLayoutEffect(() => {
    const pending = pendingCountdownSelectionRef.current;
    const input = countdownInputRef.current;
    if (!pending || !input) return;
    selectBreakCountdownSegmentInInput(
      input,
      pending.segmentIndex,
      pending.slotIndex,
      pending.selectWhole,
    );
    pendingCountdownSelectionRef.current = null;
  }, [countdownInputDraft, editingCountdown]);

  const activePreset = useMemo((): BreakPresetKey | null => {
    if (!surface || !idle) return null;
    const entry = Object.entries(BREAK_PRESET_SECONDS).find(
      ([, seconds]) => seconds === surface.durationSeconds,
    );
    return (entry?.[0] as BreakPresetKey | undefined) ?? null;
  }, [idle, surface]);

  const commitCountdownDraft = useCallback(
    (draft: string) => {
      if (!surface || !idle) return;
      const nextSeconds = breakCountdownShapeToSeconds(draft);
      setBreakDuration(surfaceId, nextSeconds);
      setCountdownInputDraft(secondsToBreakCountdownShape(nextSeconds));
      setCustomDuration(formatBreakDurationMinutes(Math.floor(nextSeconds / 60)));
      setCustomDurationTouched(false);
    },
    [idle, setBreakDuration, surface, surfaceId],
  );

  const onSelectPreset = useCallback(
    (key: BreakPresetKey) => {
      if (!surface || !idle) return;
      setBreakDuration(surfaceId, BREAK_PRESET_SECONDS[key]);
      setCustomDuration("");
      setCustomDurationTouched(false);
      setCountdownInputDraft(secondsToBreakCountdownShape(BREAK_PRESET_SECONDS[key]));
    },
    [idle, setBreakDuration, surface, surfaceId],
  );

  const parsedCustomDuration = useMemo(
    () => parseBreakDurationInput(customDuration),
    [customDuration],
  );

  const customDurationError =
    customDurationTouched && customDuration.trim().length > 0 && !parsedCustomDuration.ok
      ? "Use minutes or 1h 3m"
      : null;

  const canApplyCustomDuration =
    idle && parsedCustomDuration.ok && customDuration.trim().length > 0;

  const onCustomDurationChange = useCallback((value: string) => {
    setCustomDurationTouched(true);
    setCustomDuration(sanitizeBreakDurationInput(value));
  }, []);

  const onApplyCustomDuration = useCallback(() => {
    if (!surface || !idle) return;
    const parsed = parseBreakDurationInput(customDuration);
    if (!parsed.ok) {
      setCustomDurationTouched(true);
      return;
    }
    const nextSeconds = parsed.minutes * 60;
    setBreakDuration(surfaceId, nextSeconds);
    setCustomDuration(formatBreakDurationMinutes(parsed.minutes));
    setCustomDurationTouched(false);
    setCountdownInputDraft(secondsToBreakCountdownShape(nextSeconds));
  }, [customDuration, idle, setBreakDuration, surface, surfaceId]);

  const onCountdownFocus = useCallback(() => {
    if (!idle) return;
    setEditingCountdown(true);
    pendingCountdownSelectionRef.current = {
      segmentIndex: 0,
      slotIndex: 0,
      selectWhole: true,
    };
  }, [idle]);

  const onCountdownPointerDown = useCallback(() => {
    if (!idle) return;
    setEditingCountdown(true);
  }, [idle]);

  const onCountdownMouseUp = useCallback((event: MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const segment = breakCountdownSegmentIndexFromCaret(input.selectionStart ?? 0);
    countdownCaretRef.current = { segmentIndex: segment, slotIndex: 0, resetSegment: true };
    selectBreakCountdownSegmentInInput(input, segment, 0, true);
  }, []);

  const onCountdownChange = useCallback((value: string) => {
    setCountdownInputDraft(normalizeBreakCountdownShape(value));
  }, []);

  const onCountdownKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!idle) return;
      const input = event.currentTarget;
      const caret = countdownCaretRef.current;

      if (isBreakCountdownDigitKey(event.key)) {
        event.preventDefault();
        const result = applyBreakCountdownDigit(
          countdownInputDraft,
          caret.segmentIndex,
          caret.slotIndex,
          event.key,
          caret.resetSegment,
        );
        countdownCaretRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          resetSegment: result.resetSegment,
        };
        pendingCountdownSelectionRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          selectWhole: false,
        };
        setCountdownInputDraft(result.value);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        const result = applyBreakCountdownBackspace(
          countdownInputDraft,
          caret.segmentIndex,
          caret.slotIndex,
        );
        countdownCaretRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          resetSegment: result.resetSegment,
        };
        pendingCountdownSelectionRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          selectWhole: false,
        };
        setCountdownInputDraft(result.value);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const delta = event.key === "ArrowLeft" ? -1 : 1;
        const nextSegment = moveBreakCountdownSegment(caret.segmentIndex, delta);
        countdownCaretRef.current = { segmentIndex: nextSegment, slotIndex: 0, resetSegment: true };
        pendingCountdownSelectionRef.current = {
          segmentIndex: nextSegment,
          slotIndex: 0,
          selectWhole: true,
        };
        return;
      }

      const nudge = breakCountdownSegmentNudgeSeconds(caret.segmentIndex, event);
      if (nudge != null) {
        event.preventDefault();
        const nextSeconds = breakCountdownShapeToSeconds(countdownInputDraft) + nudge;
        const nextDraft = secondsToBreakCountdownShape(nextSeconds);
        setCountdownInputDraft(nextDraft);
        pendingCountdownSelectionRef.current = {
          segmentIndex: caret.segmentIndex,
          slotIndex: 0,
          selectWhole: true,
        };
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        commitCountdownDraft(countdownInputDraft);
        input.blur();
      }
    },
    [commitCountdownDraft, countdownInputDraft, idle],
  );

  const onCountdownBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      if (!idle) return;
      commitCountdownDraft(countdownInputDraft);
      setEditingCountdown(false);
      countdownCaretRef.current = initialBreakCountdownCaret();
    },
    [commitCountdownDraft, countdownInputDraft, idle],
  );

  const onToggleRun = useCallback(() => {
    if (!surface) return;
    if (running) {
      pauseBreak(surfaceId);
      return;
    }
    startBreak(surfaceId);
  }, [pauseBreak, running, startBreak, surface, surfaceId]);

  const onReset = useCallback(() => {
    if (!surface) return;
    resetBreak(surfaceId);
    setCustomDuration("");
    setCustomDurationTouched(false);
    setEditingCountdown(false);
    syncCountdownDraftFromSurface();
  }, [resetBreak, surface, surfaceId, syncCountdownDraftFromSurface]);

  return {
    surface,
    remainingSeconds,
    durationSeconds: surface?.durationSeconds ?? 0,
    running,
    paused,
    complete,
    idle,
    activePreset,
    customDuration,
    customDurationError,
    canApplyCustomDuration,
    editingCountdown,
    countdownInputDraft,
    countdownInputRef,
    onSelectPreset,
    onCustomDurationChange,
    onApplyCustomDuration,
    onCountdownFocus,
    onCountdownPointerDown,
    onCountdownMouseUp,
    onCountdownChange,
    onCountdownKeyDown,
    onCountdownBlur,
    onToggleRun,
    onReset,
  };
}

export type AgencyBreakTimerSurfaceViewModel = ReturnType<typeof useAgencyBreakTimerSurface>;
