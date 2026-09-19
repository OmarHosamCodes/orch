import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CanvasKnowledgeCreateMenuViewProps,
  MenuMotionState,
} from "@/features/workspace-knowledge/canvas-knowledge-create-menu-view";
import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import type { KnowledgeCreateKind } from "@/features/workspace-knowledge/knowledge-create";
import { orpc } from "@/lib/orpc";

const CLOSE_DURATION_MS = 260;

export function useCanvasKnowledgeCreateMenu(input: {
  canvasWorkspaceId: string;
  teamId?: string | null;
  onCreateDocument: (point: { x: number; y: number }) => void;
}): CanvasKnowledgeCreateMenuViewProps {
  const createMenuPoint = useWorkspaceKnowledgeStore((state) => state.createMenuPoint);
  const openCreateMenuAt = useWorkspaceKnowledgeStore((state) => state.openCreateMenuAt);
  const requestCreateKind = useWorkspaceKnowledgeStore((state) => state.requestCreateKind);
  const openUnplacedDialog = useWorkspaceKnowledgeStore((state) => state.openUnplacedDialog);
  const setPendingPlacement = useWorkspaceKnowledgeStore((state) => state.setPendingPlacement);
  const teamId = input.teamId ?? undefined;
  const canvasWorkspaceId = input.canvasWorkspaceId;

  const boardQuery = useQuery({
    ...orpc.workspace.knowledge.board.queryOptions({
      input: { canvasWorkspaceId, teamId },
    }),
    enabled: Boolean(canvasWorkspaceId),
  });

  const onSelect = useCallback(
    (kind: KnowledgeCreateKind) => {
      if (createMenuPoint) {
        setPendingPlacement({ x: createMenuPoint.x, y: createMenuPoint.y });
      }
      if (kind === "document" && createMenuPoint) {
        input.onCreateDocument({ x: createMenuPoint.x, y: createMenuPoint.y });
        setPendingPlacement(null);
        openCreateMenuAt(null);
        return;
      }
      requestCreateKind(kind);
      openCreateMenuAt(null);
    },
    [createMenuPoint, input, openCreateMenuAt, requestCreateKind, setPendingPlacement],
  );

  const onOpenUnplaced = useCallback(() => {
    if (createMenuPoint) {
      setPendingPlacement({ x: createMenuPoint.x, y: createMenuPoint.y });
    }
    openUnplacedDialog();
    openCreateMenuAt(null);
  }, [createMenuPoint, openCreateMenuAt, openUnplacedDialog, setPendingPlacement]);

  const open = Boolean(createMenuPoint);
  const [motionState, setMotionState] = useState<MenuMotionState>(
    createMenuPoint ? "open" : "hidden",
  );
  const [activeKind, setActiveKind] = useState<KnowledgeCreateKind | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMotionState("opening");
      const timeout = window.setTimeout(() => setMotionState("open"), 0);
      return () => window.clearTimeout(timeout);
    }
    setActiveKind(null);
    setMotionState((current) => (current === "hidden" ? "hidden" : "closing"));
    const timeout = window.setTimeout(() => setMotionState("hidden"), CLOSE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") openCreateMenuAt(null);
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [open, openCreateMenuAt]);

  const visible = motionState !== "hidden";
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [visible]);

  return {
    open,
    x: createMenuPoint?.screenX ?? 0,
    y: createMenuPoint?.screenY ?? 0,
    unplacedCount: boardQuery.data?.unplaced.length ?? 0,
    motionState,
    activeKind,
    menuRef,
    onActiveKindChange: setActiveKind,
    onClose: () => openCreateMenuAt(null),
    onSelect,
    onOpenUnplaced,
  };
}
