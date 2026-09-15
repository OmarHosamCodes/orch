import { unstable_useComposerInput } from "@assistant-ui/react";
import { useEffect, useRef } from "react";

import type { WorkspaceAgentComposerTriggerSuggestion } from "@/features/workspace-agent/hooks/use-workspace-agent";

export function ComposerDraftBridge({
  draft,
  onDraftChange,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const { value, setText } = unstable_useComposerInput();
  const lastEmittedRef = useRef(draft);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    onDraftChange(value);
  }, [onDraftChange, value]);

  useEffect(() => {
    if (draft === lastEmittedRef.current) return;
    lastEmittedRef.current = draft;
    setText(draft);
  }, [draft, setText]);

  return null;
}

export function ComposerTriggerKeyboard({
  composerTriggerOpen,
  composerTriggerSuggestions,
  onPickComposerTrigger,
  onDismissComposerTrigger,
}: {
  composerTriggerOpen: boolean;
  composerTriggerSuggestions: readonly WorkspaceAgentComposerTriggerSuggestion[];
  onPickComposerTrigger: (suggestion: WorkspaceAgentComposerTriggerSuggestion) => void;
  onDismissComposerTrigger: () => void;
}) {
  const scopeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!composerTriggerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const input = scopeRef.current?.closest("form")?.querySelector("textarea");
      const suggestions = Array.from(
        document.querySelectorAll<HTMLButtonElement>("[data-composer-suggestion]"),
      );
      const focusedIndex = suggestions.findIndex((item) => item === target);
      if (target !== input && focusedIndex === -1) return;
      if (event.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!suggestions.length) return;
        event.preventDefault();
        event.stopPropagation();
        const next =
          focusedIndex === -1
            ? event.key === "ArrowDown"
              ? 0
              : suggestions.length - 1
            : (focusedIndex + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) %
              suggestions.length;
        suggestions[next]?.focus();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDismissComposerTrigger();
        input?.focus();
        return;
      }
      if (
        target === input &&
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        const first = composerTriggerSuggestions[0];
        if (!first) return;
        event.preventDefault();
        event.stopPropagation();
        onPickComposerTrigger(first);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [
    composerTriggerOpen,
    composerTriggerSuggestions,
    onDismissComposerTrigger,
    onPickComposerTrigger,
  ]);

  return <span ref={scopeRef} hidden />;
}

export function suggestionRowLabel(suggestion: WorkspaceAgentComposerTriggerSuggestion) {
  switch (suggestion.kind) {
    case "at":
      return suggestion.label;
    case "project":
      return `project · ${suggestion.label}`;
    case "task":
      return `task · ${suggestion.label}`;
    default: {
      const _exhaustive: never = suggestion.kind;
      return _exhaustive;
    }
  }
}
