import { create } from "zustand";

import type {
  KnowledgeCreateKind,
  KnowledgeDialogKind,
} from "@/features/workspace-knowledge/knowledge-create";
import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { getServerUrl } from "@/lib/env";
import type { KnowledgeAction } from "@orch/agent/knowledge-actions";

type CaptureResult = {
  status: "applied" | "pending";
  proposalId: string | null;
  objectId: string | null;
  label: string;
};

type CreateMenuPoint = { x: number; y: number; screenX: number; screenY: number };
type BoardPoint = { x: number; y: number };

type WorkspaceKnowledgeState = {
  capturePending: boolean;
  captureError: string | null;
  requestedCreateKind: KnowledgeCreateKind | null;
  createDialogOpen: boolean;
  createSurface: KnowledgeDialogKind | null;
  createMenuPoint: CreateMenuPoint | null;
  pendingPlacement: BoardPoint | null;
  requestCreateKind: (kind: KnowledgeCreateKind | null) => void;
  openUnplacedDialog: () => void;
  setCreateDialogOpen: (open: boolean) => void;
  openCreateMenuAt: (point: CreateMenuPoint | null) => void;
  setPendingPlacement: (point: BoardPoint | null) => void;
  uploadKnowledgeSource: (input: { teamId: string; file: File }) => Promise<{
    uploadId: string;
    filename: string;
    mediaType: string;
  }>;
  captureKnowledge: (input: {
    action: KnowledgeAction;
    canvasWorkspaceId: string;
    teamId?: string | null;
    label?: string;
    silent?: boolean;
  }) => Promise<CaptureResult>;
};

async function invalidateKnowledgeQueries() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.workspace.knowledge.board.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.workspace.knowledge.get.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.workspace.knowledge.query.key() }),
  ]);
}

export const useWorkspaceKnowledgeStore = create<WorkspaceKnowledgeState>((set) => ({
  capturePending: false,
  captureError: null,
  requestedCreateKind: null,
  createDialogOpen: false,
  createSurface: null,
  createMenuPoint: null,
  pendingPlacement: null,
  requestCreateKind: (kind) => {
    if (kind === "document") {
      set({ requestedCreateKind: "document" });
      return;
    }
    if (!kind) {
      set({ requestedCreateKind: null });
      return;
    }
    set({
      requestedCreateKind: kind,
      createSurface: kind,
      createDialogOpen: true,
    });
  },
  openUnplacedDialog: () => set({ createSurface: "unplaced", createDialogOpen: true }),
  setCreateDialogOpen: (open) =>
    set(
      open
        ? { createDialogOpen: true }
        : { createDialogOpen: false, createSurface: null, pendingPlacement: null },
    ),
  openCreateMenuAt: (point) => set({ createMenuPoint: point }),
  setPendingPlacement: (point) => set({ pendingPlacement: point }),
  uploadKnowledgeSource: async (input) => {
    const formData = new FormData();
    formData.append("teamId", input.teamId);
    formData.append("file", input.file);
    const response = await fetch(`${getServerUrl()}/uploads/knowledge-sources`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => ({ error: "Upload failed" }))) as {
        error?: string;
      };
      throw new Error(err.error ?? "Could not upload source.");
    }
    const body = (await response.json()) as {
      uploadId: string;
      fileName: string;
      mimeType: string;
    };
    return { uploadId: body.uploadId, filename: body.fileName, mediaType: body.mimeType };
  },
  captureKnowledge: async (input) => {
    if (!input.silent) set({ capturePending: true, captureError: null });
    try {
      const result = await orpcClient.workspace.knowledge.capture(input);
      await invalidateKnowledgeQueries();
      if (!input.silent) set({ capturePending: false });
      return result;
    } catch (error) {
      const message = getErrorMessage(error, "Could not save knowledge.");
      set({ capturePending: false, captureError: message });
      throw error;
    }
  },
}));
