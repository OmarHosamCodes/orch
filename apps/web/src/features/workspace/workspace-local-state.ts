import { create } from "zustand";
import type {
  WorkspaceNode,
  WorkspaceNodeDashboardFeaturedBlock,
  WorkspaceNodeTint,
  WorkspaceNodeType,
} from "@orch/workspace";

type EditorMode = "create" | "edit";
export type SaveState = "idle" | "saving" | "saved" | "error";
export type NodePosition = { x: number; y: number };
export type WorkspaceConnectionPair = {
  orchestratorNodeId: string;
  standardNodeId: string;
};
export type WorkspaceSaveBadge = { label: string; className: string };
export type NodeDraft = {
  title: string;
  content: string;
  nodeType: WorkspaceNodeType;
  tint: WorkspaceNodeTint;
  featuredBlocks: WorkspaceNodeDashboardFeaturedBlock[];
};
export type WorkspaceStoreState = {
  nodes: WorkspaceNode[];
  selectedNodeIds: string[];
  editorOpen: boolean;
  editorMode: EditorMode;
  activeNodeId: string | null;
  pendingNodePosition: NodePosition | null;
  loadApplied: boolean;
  isHydratingWorkspace: boolean;
  saveState: SaveState;
  saveError: string | null;
  syncedAt: string | null;
  isPreloadingWorkspace: boolean;
  localRevision: number;
  syncedRevision: number;
  nodeDraft: NodeDraft;
  setNodes: (nodes: WorkspaceNode[]) => void;
  setSelectedNodeIds: (selectedNodeIds: string[]) => void;
  setEditorOpen: (open: boolean) => void;
  setEditorMode: (mode: EditorMode) => void;
  setActiveNodeId: (nodeId: string | null) => void;
  setPendingNodePosition: (position: NodePosition | null) => void;
  setLoadApplied: (value: boolean) => void;
  setIsHydratingWorkspace: (value: boolean) => void;
  setSaveState: (state: SaveState) => void;
  setSaveError: (error: string | null) => void;
  setSyncedAt: (value: string | null) => void;
  setIsPreloadingWorkspace: (value: boolean) => void;
  incrementLocalRevision: () => number;
  setSyncedRevision: (value: number) => void;
  patchNodeDraft: (patch: Partial<NodeDraft>) => void;
  resetDraft: () => void;
  resetWorkspaceState: () => void;
  applyWorkspaceSnapshot: (nodes: WorkspaceNode[], updatedAt: string | null) => void;
};
const defaultNodeDraft = (): NodeDraft => ({
  title: "",
  content: "",
  nodeType: "standard",
  tint: "neutral",
  featuredBlocks: [],
});

function sameIdList(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => ({
  nodes: [],
  selectedNodeIds: [],
  editorOpen: false,
  editorMode: "create",
  activeNodeId: null,
  pendingNodePosition: null,
  loadApplied: false,
  isHydratingWorkspace: false,
  saveState: "idle",
  saveError: null,
  syncedAt: null,
  isPreloadingWorkspace: false,
  localRevision: 0,
  syncedRevision: 0,
  nodeDraft: defaultNodeDraft(),
  setNodes: (nodes) => set({ nodes }),
  setSelectedNodeIds: (selectedNodeIds) =>
    set((state) =>
      sameIdList(state.selectedNodeIds, selectedNodeIds) ? state : { selectedNodeIds },
    ),
  setEditorOpen: (editorOpen) => set({ editorOpen }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  setPendingNodePosition: (pendingNodePosition) => set({ pendingNodePosition }),
  setLoadApplied: (loadApplied) => set({ loadApplied }),
  setIsHydratingWorkspace: (isHydratingWorkspace) => set({ isHydratingWorkspace }),
  setSaveState: (saveState) => set({ saveState }),
  setSaveError: (saveError) => set({ saveError }),
  setSyncedAt: (syncedAt) => set({ syncedAt }),
  setIsPreloadingWorkspace: (isPreloadingWorkspace) => set({ isPreloadingWorkspace }),
  incrementLocalRevision: () => {
    const next = get().localRevision + 1;
    set({ localRevision: next });
    return next;
  },
  setSyncedRevision: (syncedRevision) => set({ syncedRevision }),
  patchNodeDraft: (patch) => set({ nodeDraft: { ...get().nodeDraft, ...patch } }),
  resetDraft: () => set({ nodeDraft: defaultNodeDraft() }),
  resetWorkspaceState: () =>
    set({
      nodes: [],
      selectedNodeIds: [],
      editorOpen: false,
      editorMode: "create",
      activeNodeId: null,
      pendingNodePosition: null,
      loadApplied: false,
      isHydratingWorkspace: false,
      saveState: "idle",
      saveError: null,
      syncedAt: null,
      isPreloadingWorkspace: false,
      localRevision: 0,
      syncedRevision: 0,
      nodeDraft: defaultNodeDraft(),
    }),
  applyWorkspaceSnapshot: () => {},
}));
