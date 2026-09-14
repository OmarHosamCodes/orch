import type { FocusEvent, KeyboardEvent, MouseEvent, RefObject } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  applyDurationBackspace,
  applyDurationDigit,
  isDurationDigitKey,
  moveDurationSegment,
  normalizeDurationShape,
  durationSegmentNudgeSeconds,
  segmentIndexFromCaret,
  selectDurationSegmentInInput,
  type DurationSegmentIndex,
} from "@/features/time-tracking/duration-input-segments";
import {
  applyDurationToDraft,
  commitDurationToDraft,
  formatClockTimeLabel,
  type TimeEntryDraft,
} from "@/features/time-tracking/time-entry-draft";
import { nudgeDurationInput } from "@/features/time-tracking/time-field-keyboard";

type DurationCaret = {
  segmentIndex: DurationSegmentIndex;
  slotIndex: 0 | 1;
  resetSegment: boolean;
};

type PendingSelection = {
  segmentIndex: DurationSegmentIndex;
  slotIndex: 0 | 1;
  selectWhole: boolean;
};

const initialCaret = (): DurationCaret => ({
  segmentIndex: 0,
  slotIndex: 0,
  resetSegment: true,
});

type UseAgencyDurationInputOptions = {
  editDraft: TimeEntryDraft;
  isMulti: boolean;
  clearEditError: () => void;
  setEditError: (error: string) => void;
  setTimeEditorOpen: (open: boolean) => void;
  setEndTimeInput: (label: string) => void;
  updateInlineDraft: (draft: TimeEntryDraft) => void;
  saveInlineDraft: (draft?: TimeEntryDraft) => Promise<void>;
  resetEditDraft: () => void;
};

export type AgencyDurationInputBindings = {
  editingDuration: boolean;
  durationInputDraft: string;
  durationInputRef: RefObject<HTMLInputElement | null>;
  resetDurationSession: () => void;
  onDurationFocus: () => void;
  onDurationPointerDown: () => void;
  onDurationMouseUp: (event: MouseEvent<HTMLInputElement>) => void;
  onDurationChange: (value: string) => void;
  onDurationKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onDurationBlur: (event: FocusEvent<HTMLInputElement>) => void;
};

function isTimeFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const field = target.dataset.timeField;
  return field === "start" || field === "end" || field === "duration";
}

export function useAgencyDurationInput({
  editDraft,
  isMulti,
  clearEditError,
  setEditError,
  setTimeEditorOpen,
  setEndTimeInput,
  updateInlineDraft,
  saveInlineDraft,
  resetEditDraft,
}: UseAgencyDurationInputOptions): AgencyDurationInputBindings {
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInputDraft, setDurationInputDraft] = useState("");
  const caretRef = useRef<DurationCaret>(initialCaret());
  const pointerFocusRef = useRef(false);
  const durationInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSelectionRef = useRef<PendingSelection | null>(null);

  const resetDurationSession = useCallback(() => {
    setDurationInputDraft("");
    caretRef.current = initialCaret();
  }, []);

  useLayoutEffect(() => {
    const pending = pendingSelectionRef.current;
    const input = durationInputRef.current;
    if (!pending || !input) return;
    selectDurationSegmentInInput(
      input,
      pending.segmentIndex,
      pending.slotIndex,
      pending.selectWhole,
    );
    pendingSelectionRef.current = null;
  }, [durationInputDraft]);

  const previewEndTime = useCallback(
    (nextDuration: string) => {
      const preview = applyDurationToDraft(editDraft, nextDuration);
      setEndTimeInput(formatClockTimeLabel(preview.endTime));
      updateInlineDraft(preview);
    },
    [editDraft, setEndTimeInput, updateInlineDraft],
  );

  const commitDurationInput = useCallback(
    async (raw: string) => {
      if (isMulti) return;
      const result = commitDurationToDraft(editDraft, raw);
      if ("error" in result) {
        setDurationInputDraft(result.revertInput);
        caretRef.current = initialCaret();
        setEditError(result.error);
        return;
      }
      resetDurationSession();
      setEndTimeInput(formatClockTimeLabel(result.draft.endTime));
      updateInlineDraft(result.draft);
      await saveInlineDraft(result.draft);
    },
    [
      editDraft,
      isMulti,
      resetDurationSession,
      saveInlineDraft,
      setEditError,
      setEndTimeInput,
      updateInlineDraft,
    ],
  );

  const onDurationFocus = useCallback(() => {
    setDurationInputDraft(normalizeDurationShape(editDraft.durationInput));
    setEditingDuration(true);
    setTimeEditorOpen(true);
    clearEditError();
    if (pointerFocusRef.current) {
      pointerFocusRef.current = false;
      return;
    }
    caretRef.current = initialCaret();
    pendingSelectionRef.current = { segmentIndex: 0, slotIndex: 0, selectWhole: true };
  }, [clearEditError, editDraft.durationInput, setTimeEditorOpen]);

  const onDurationPointerDown = useCallback(() => {
    pointerFocusRef.current = true;
  }, []);

  const onDurationMouseUp = useCallback((event: MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const segment = segmentIndexFromCaret(input.selectionStart ?? 0);
    caretRef.current = { segmentIndex: segment, slotIndex: 0, resetSegment: true };
    selectDurationSegmentInInput(input, segment, 0, true);
  }, []);

  const onDurationChange = useCallback(
    (value: string) => {
      const next = normalizeDurationShape(value);
      caretRef.current = { ...caretRef.current, resetSegment: true };
      setDurationInputDraft(next);
      clearEditError();
      previewEndTime(next);
    },
    [clearEditError, previewEndTime],
  );

  const onDurationKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const currentValue =
        durationInputDraft !== ""
          ? durationInputDraft
          : normalizeDurationShape(editDraft.durationInput);
      const caret = caretRef.current;

      if (isDurationDigitKey(event.key)) {
        event.preventDefault();
        const result = applyDurationDigit(
          currentValue,
          caret.segmentIndex,
          caret.slotIndex,
          event.key,
          caret.resetSegment,
        );
        caretRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          resetSegment: result.resetSegment,
        };
        pendingSelectionRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          selectWhole: result.slotIndex === 0,
        };
        setDurationInputDraft(result.value);
        previewEndTime(result.value);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        const result = applyDurationBackspace(currentValue, caret.segmentIndex, caret.slotIndex);
        caretRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          resetSegment: result.resetSegment,
        };
        pendingSelectionRef.current = {
          segmentIndex: result.segmentIndex,
          slotIndex: result.slotIndex,
          selectWhole: false,
        };
        setDurationInputDraft(result.value);
        previewEndTime(result.value);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const nextSegment = moveDurationSegment(
          caret.segmentIndex,
          event.key === "ArrowLeft" ? -1 : 1,
        );
        caretRef.current = { segmentIndex: nextSegment, slotIndex: 0, resetSegment: true };
        const input = durationInputRef.current;
        if (input) selectDurationSegmentInInput(input, nextSegment, 0, true);
        return;
      }

      const durationDelta = durationSegmentNudgeSeconds(caret.segmentIndex, event);
      if (durationDelta !== null) {
        event.preventDefault();
        const nextDuration = nudgeDurationInput(currentValue, durationDelta);
        if (!nextDuration) return;
        pendingSelectionRef.current = {
          segmentIndex: caret.segmentIndex,
          slotIndex: 0,
          selectWhole: true,
        };
        caretRef.current = { ...caret, resetSegment: true };
        setDurationInputDraft(nextDuration);
        previewEndTime(nextDuration);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        resetEditDraft();
        resetDurationSession();
        setEditingDuration(false);
        setTimeEditorOpen(false);
        event.currentTarget.blur();
      }
    },
    [
      durationInputDraft,
      editDraft.durationInput,
      previewEndTime,
      resetDurationSession,
      resetEditDraft,
      setTimeEditorOpen,
    ],
  );

  const onDurationBlur = useCallback(
    async (event: FocusEvent<HTMLInputElement>) => {
      const stayingInTime = isTimeFieldTarget(event.relatedTarget);
      try {
        if (durationInputDraft !== "") {
          await commitDurationInput(durationInputDraft);
        }
      } finally {
        setEditingDuration(false);
        if (!stayingInTime) setTimeEditorOpen(false);
      }
    },
    [commitDurationInput, durationInputDraft, setTimeEditorOpen],
  );

  return {
    editingDuration,
    durationInputDraft,
    durationInputRef,
    resetDurationSession,
    onDurationFocus,
    onDurationPointerDown,
    onDurationMouseUp,
    onDurationChange,
    onDurationKeyDown,
    onDurationBlur,
  };
}
