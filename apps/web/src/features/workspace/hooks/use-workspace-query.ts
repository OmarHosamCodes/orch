import {
  cloneWorkspaceNodes,
  createDefaultWorkspaceTab,
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
  getWorkspaceNodeDashboardSelectableBlocks,
  normalizeWorkspaceNode,
  type WorkspaceNode,
  type WorkspaceNodeDashboardSelectableBlock,
} from "@orch/workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { sanitizeConnections } from "@/features/workspace/utils/workspace-node-connections";
import {
  useWorkspaceStore,
  type NodePosition,
  type SaveState,
  type WorkspaceConnectionPair,
  type WorkspaceSaveBadge,
} from "@/features/workspace/workspace-local-state";
import { bindApplyWorkspaceSnapshotHandler } from "@/features/workspace/workspace-snapshot-handler";

function createNodeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function haveSameConnections(
  leftConnections: WorkspaceNode["connections"],
  rightConnections: WorkspaceNode["connections"],
) {
  if (leftConnections.length !== rightConnections.length) return false;
  return leftConnections.every(
    (connection, index) => connection.targetNodeId === rightConnections[index]?.targetNodeId,
  );
}

function normalizeTrackedNode(node: WorkspaceNode, timestamp: string) {
  return normalizeWorkspaceNode({ ...node, label: node.title, updatedAt: timestamp });
}

function applyConnectionSanitization(draftNodes: WorkspaceNode[], timestamp: string) {
  const sanitizedNodes = sanitizeConnections(draftNodes);
  sanitizedNodes.forEach((sanitizedNode, index) => {
    const currentNode = draftNodes[index];
    if (!currentNode || haveSameConnections(currentNode.connections, sanitizedNode.connections)) {
      return;
    }
    draftNodes[index] = normalizeTrackedNode(
      { ...currentNode, connections: sanitizedNode.connections },
      timestamp,
    );
  });
}

function getSaveBadge(saveState: SaveState): WorkspaceSaveBadge {
  switch (saveState) {
    case "saving":
      return { label: "Syncing", className: "border-warning/40 bg-warning/10 text-warning" };
    case "saved":
      return { label: "Synced", className: "border-success/40 bg-success/10 text-success" };
    case "error":
      return { label: "Sync issue", className: "border-error/40 bg-error/10 text-error" };
    default:
      return { label: "Live", className: "border-muted/60 bg-elevated/80 text-toned" };
  }
}

function workspaceNodesSignature(nodes: WorkspaceNode[]): string {
  return nodes
    .map((node) => {
      const connectionTargets =
        node.nodeType === "orchestrator"
          ? [...(node.connections ?? [])]
              .map((connection) => connection.targetNodeId)
              .sort()
              .join(",")
          : "";
      return [
        node.id,
        node.x,
        node.y,
        node.width,
        node.height,
        node.nodeType,
        node.title,
        connectionTargets,
      ].join(":");
    })
    .sort()
    .join("\n");
}

export function useWorkspaceQuery(input: { canvasWorkspaceId?: string; nodeId?: string } = {}) {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const forNodeQuery = useQuery({
    ...orpc.workspace.brains.forNode.queryOptions({
      input: { nodeId: input.nodeId ?? "" },
    }),
    enabled: !input.canvasWorkspaceId && Boolean(input.nodeId),
  });
  const canvasWorkspaceId = input.canvasWorkspaceId ?? forNodeQuery.data?.canvasWorkspaceId ?? null;
  const workspaceGetQueryOptions = useMemo(
    () =>
      orpc.workspace.get.queryOptions({
        input: { canvasWorkspaceId: canvasWorkspaceId ?? "" },
      }),
    [canvasWorkspaceId],
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousNodesRef = useRef<WorkspaceNode[] | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const previousWorkspaceIdRef = useRef<string | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const scheduleWorkspaceSaveRef = useRef<(delay?: number) => void>(() => {});

  const store = useWorkspaceStore();
  const {
    nodes,
    selectedNodeIds,
    loadApplied,
    isHydratingWorkspace,
    saveState,
    saveError,
    syncedAt,
    isPreloadingWorkspace,
    syncedRevision,
    activeNodeId,
    nodeDraft,
    setNodes,
    setSelectedNodeIds,
    setLoadApplied,
    setIsHydratingWorkspace,
    setSaveState,
    setSaveError,
    setSyncedAt,
    setIsPreloadingWorkspace,
    incrementLocalRevision,
    setSyncedRevision,
    resetDraft,
    resetWorkspaceState,
    setEditorOpen,
    setEditorMode,
    setActiveNodeId,
    setPendingNodePosition,
    patchNodeDraft,
  } = store;

  const authEnabled = Boolean(session.data?.user);
  const userId = session.data?.user?.id ?? null;
  const workspaceQuery = useQuery({
    ...workspaceGetQueryOptions,
    enabled: authEnabled && Boolean(canvasWorkspaceId),
    staleTime: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });
  const saveWorkspace = useMutation(orpc.workspace.save.mutationOptions());
  const deleteWorkspaceNode = useMutation(orpc.workspace.deleteNode.mutationOptions());
  const clearSaveTimer = useCallback(() => {
    if (!saveTimerRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);
  const clearRetryTimer = useCallback(() => {
    if (!retryTimerRef.current) return;
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);
  const clearSavedStateTimer = useCallback(() => {
    if (!savedStateTimerRef.current) return;
    clearTimeout(savedStateTimerRef.current);
    savedStateTimerRef.current = null;
  }, []);
  const scheduleSavedStateReset = useCallback(() => {
    clearSavedStateTimer();
    savedStateTimerRef.current = setTimeout(() => {
      savedStateTimerRef.current = null;
      if (useWorkspaceStore.getState().saveState === "saved") {
        setSaveState("idle");
      }
    }, 2_000);
  }, [clearSavedStateTimer, setSaveState]);
  const workspaceReadyForEdits =
    authEnabled && Boolean(canvasWorkspaceId) && loadApplied && !isHydratingWorkspace;
  const isWorkspaceInitialLoading =
    authEnabled &&
    !loadApplied &&
    (workspaceQuery.isLoading || workspaceQuery.isFetching || isPreloadingWorkspace);
  const isWorkspaceRefreshing =
    loadApplied && (workspaceQuery.isRefetching || isPreloadingWorkspace);
  const hasWorkspaceLoaded = loadApplied;
  const isDraftValid = nodeDraft.title.trim().length > 0;
  const editorBlockOptions = useMemo<WorkspaceNodeDashboardSelectableBlock[]>(() => {
    if (!activeNodeId) return [];
    const node = nodes.find((entry) => entry.id === activeNodeId);
    return node ? getWorkspaceNodeDashboardSelectableBlocks(node) : [];
  }, [activeNodeId, nodes]);
  const saveBadge = getSaveBadge(saveState);

  const applyRemoteSnapshot = useCallback(
    (remoteNodes: WorkspaceNode[], updatedAt: string | null) => {
      const state = useWorkspaceStore.getState();
      isApplyingRemoteRef.current = true;
      setIsHydratingWorkspace(true);
      setNodes(remoteNodes.map(normalizeWorkspaceNode));
      setSelectedNodeIds(
        state.selectedNodeIds.filter((nodeId) => remoteNodes.some((node) => node.id === nodeId)),
      );
      setLoadApplied(true);
      setSyncedAt(updatedAt);
      setSyncedRevision(state.localRevision);
      setSaveState("idle");
      setSaveError(null);
    },
    [
      setIsHydratingWorkspace,
      setLoadApplied,
      setNodes,
      setSaveError,
      setSaveState,
      setSelectedNodeIds,
      setSyncedAt,
      setSyncedRevision,
    ],
  );

  const applyWorkspaceSnapshot = useCallback(
    (remoteNodes: WorkspaceNode[], updatedAt: string | null) => {
      if (!canvasWorkspaceId) return;
      clearSaveTimer();
      clearRetryTimer();
      queryClient.setQueryData(workspaceGetQueryOptions.queryKey, {
        canvasWorkspaceId,
        nodes: remoteNodes,
        updatedAt,
      });
      applyRemoteSnapshot(remoteNodes, updatedAt);
    },
    [
      applyRemoteSnapshot,
      canvasWorkspaceId,
      clearRetryTimer,
      clearSaveTimer,
      queryClient,
      workspaceGetQueryOptions.queryKey,
    ],
  );

  const persistWorkspace = useCallback(
    async (snapshot: WorkspaceNode[], revision: number) => {
      if (!canvasWorkspaceId) return;
      try {
        const response = await saveWorkspace.mutateAsync({
          canvasWorkspaceId,
          nodes: snapshot,
        });
        setSyncedRevision(Math.max(syncedRevision, revision));
        setSyncedAt(response.updatedAt);
        if (revision < useWorkspaceStore.getState().localRevision) {
          setSaveState("saving");
          return;
        }
        setSaveState("saved");
        setSaveError(null);
        queryClient.setQueryData(workspaceGetQueryOptions.queryKey, {
          canvasWorkspaceId,
          nodes: snapshot.map(normalizeWorkspaceNode),
          updatedAt: response.updatedAt,
        });
        scheduleSavedStateReset();
      } catch (error) {
        if (revision < useWorkspaceStore.getState().localRevision) return;
        setSaveState("error");
        setSaveError(getErrorMessage(error, "Failed to sync workspace"));
        clearRetryTimer();
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          const state = useWorkspaceStore.getState();
          const ready = authEnabled && state.loadApplied && !state.isHydratingWorkspace;
          const pending = state.localRevision > state.syncedRevision || saveWorkspace.isPending;
          if (!ready || !pending) return;
          scheduleWorkspaceSaveRef.current(0);
        }, 2_000);
      }
    },
    [
      authEnabled,
      canvasWorkspaceId,
      clearRetryTimer,
      queryClient,
      saveWorkspace,
      scheduleSavedStateReset,
      setSaveError,
      setSaveState,
      setSyncedAt,
      setSyncedRevision,
      syncedRevision,
      workspaceGetQueryOptions.queryKey,
    ],
  );

  const scheduleWorkspaceSave = useCallback(
    (delay = 250) => {
      const state = useWorkspaceStore.getState();
      const ready = authEnabled && state.loadApplied && !state.isHydratingWorkspace;
      if (!ready) return;
      clearSaveTimer();
      clearRetryTimer();
      clearSavedStateTimer();
      setSaveState("saving");
      setSaveError(null);
      const revision = state.localRevision;
      const snapshot = cloneWorkspaceNodes(state.nodes);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persistWorkspace(snapshot, revision);
      }, delay);
    },
    [
      authEnabled,
      clearRetryTimer,
      clearSaveTimer,
      clearSavedStateTimer,
      persistWorkspace,
      setSaveError,
      setSaveState,
    ],
  );

  scheduleWorkspaceSaveRef.current = scheduleWorkspaceSave;

  const findNode = useCallback(
    (nodeId: string) => nodes.find((node) => node.id === nodeId) ?? null,
    [nodes],
  );
  const updateNodes = useCallback(
    (mutator: (draft: WorkspaceNode[]) => void) => {
      const state = useWorkspaceStore.getState();
      const ready = authEnabled && state.loadApplied && !state.isHydratingWorkspace;
      if (!ready) return;
      const nextNodes = cloneWorkspaceNodes(state.nodes);
      mutator(nextNodes);
      setNodes(nextNodes);
      setSelectedNodeIds(
        state.selectedNodeIds.filter((nodeId) => nextNodes.some((node) => node.id === nodeId)),
      );
    },
    [authEnabled, setNodes, setSelectedNodeIds],
  );
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setActiveNodeId(null);
    setPendingNodePosition(null);
    resetDraft();
  }, [resetDraft, setActiveNodeId, setEditorOpen, setPendingNodePosition]);
  const openCreateNode = useCallback(
    (payload: NodePosition) => {
      if (!workspaceReadyForEdits) return;
      setEditorMode("create");
      setPendingNodePosition(payload);
      setActiveNodeId(null);
      resetDraft();
      setEditorOpen(true);
    },
    [
      resetDraft,
      setActiveNodeId,
      setEditorMode,
      setEditorOpen,
      setPendingNodePosition,
      workspaceReadyForEdits,
    ],
  );
  const openEditNode = useCallback(
    (payload: { nodeId: string }) => {
      if (!workspaceReadyForEdits) return;
      const node = findNode(payload.nodeId);
      if (!node) return;
      setEditorMode("edit");
      setActiveNodeId(node.id);
      setPendingNodePosition(null);
      patchNodeDraft({
        title: node.title,
        content: node.content,
        nodeType: node.nodeType,
        tint: node.dashboard.tint,
        featuredBlocks: [...node.dashboard.featuredBlocks],
      });
      setEditorOpen(true);
    },
    [
      findNode,
      patchNodeDraft,
      setActiveNodeId,
      setEditorMode,
      setEditorOpen,
      setPendingNodePosition,
      workspaceReadyForEdits,
    ],
  );
  const removeNode = useCallback(
    (payload: { nodeId: string }) => {
      if (!workspaceReadyForEdits) return;
      const node = findNode(payload.nodeId);
      if (!node) return;
      updateNodes((draftNodes) => {
        const timestamp = new Date().toISOString();
        const nextNodes = draftNodes.filter((entry) => entry.id !== payload.nodeId);
        applyConnectionSanitization(nextNodes, timestamp);
        draftNodes.splice(0, draftNodes.length, ...nextNodes);
      });
      deleteWorkspaceNode.mutate(
        { nodeId: payload.nodeId, ownerUserId: node.ownerUserId ?? undefined },
        {
          onError: () => {
            void workspaceQuery.refetch();
          },
        },
      );
    },
    [deleteWorkspaceNode, findNode, updateNodes, workspaceQuery, workspaceReadyForEdits],
  );
  const connectNodePair = useCallback(
    (payload: WorkspaceConnectionPair) => {
      updateNodes((draftNodes) => {
        const orchestratorIndex = draftNodes.findIndex(
          (node) => node.id === payload.orchestratorNodeId,
        );
        const standardNode = draftNodes.find((node) => node.id === payload.standardNodeId);
        if (orchestratorIndex < 0 || !standardNode) return;
        const orchestratorNode = draftNodes[orchestratorIndex];
        if (
          !orchestratorNode ||
          orchestratorNode.nodeType !== "orchestrator" ||
          standardNode.nodeType !== "standard" ||
          orchestratorNode.connections.some(
            (connection) => connection.targetNodeId === payload.standardNodeId,
          )
        ) {
          return;
        }
        const timestamp = new Date().toISOString();
        orchestratorNode.connections.push({ targetNodeId: payload.standardNodeId });
        draftNodes[orchestratorIndex] = normalizeTrackedNode(orchestratorNode, timestamp);
        applyConnectionSanitization(draftNodes, timestamp);
      });
    },
    [updateNodes],
  );
  const disconnectNodePair = useCallback(
    (payload: WorkspaceConnectionPair) => {
      updateNodes((draftNodes) => {
        const orchestratorIndex = draftNodes.findIndex(
          (node) => node.id === payload.orchestratorNodeId,
        );
        if (orchestratorIndex < 0) return;
        const orchestratorNode = draftNodes[orchestratorIndex];
        if (!orchestratorNode || orchestratorNode.nodeType !== "orchestrator") return;
        if (
          !orchestratorNode.connections.some(
            (connection) => connection.targetNodeId === payload.standardNodeId,
          )
        )
          return;
        const timestamp = new Date().toISOString();
        orchestratorNode.connections = orchestratorNode.connections.filter(
          (connection) => connection.targetNodeId !== payload.standardNodeId,
        );
        draftNodes[orchestratorIndex] = normalizeTrackedNode(orchestratorNode, timestamp);
        applyConnectionSanitization(draftNodes, timestamp);
      });
    },
    [updateNodes],
  );
  const submitNodeEditor = useCallback(() => {
    const draft = useWorkspaceStore.getState().nodeDraft;
    const title = draft.title.trim();
    if (!title) return;
    const content = draft.content.trim();
    const timestamp = new Date().toISOString();
    const mode = useWorkspaceStore.getState().editorMode;
    const activeId = useWorkspaceStore.getState().activeNodeId;
    const position = useWorkspaceStore.getState().pendingNodePosition ?? { x: 0, y: 0 };
    if (mode === "edit") {
      if (!activeId) return;
      updateNodes((draftNodes) => {
        const nodeIndex = draftNodes.findIndex((node) => node.id === activeId);
        if (nodeIndex < 0) return;
        const currentNode = draftNodes[nodeIndex];
        if (!currentNode) return;
        draftNodes[nodeIndex] = normalizeWorkspaceNode({
          ...currentNode,
          title,
          content,
          nodeType: draft.nodeType,
          connections: draft.nodeType === "orchestrator" ? currentNode.connections : [],
          label: title,
          dashboard: { tint: draft.tint, featuredBlocks: [...draft.featuredBlocks] },
          updatedAt: timestamp,
        });
        applyConnectionSanitization(draftNodes, timestamp);
      });
      closeEditor();
      return;
    }
    const nextNode = normalizeWorkspaceNode({
      id: createNodeId(),
      title,
      content,
      nodeType: draft.nodeType,
      visibility: "private",
      connections: [],
      label: title,
      x: position.x - 160,
      y: position.y - 110,
      width: DEFAULT_WORKSPACE_NODE_WIDTH,
      height: DEFAULT_WORKSPACE_NODE_HEIGHT,
      minWidth: DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
      minHeight: DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
      createdAt: timestamp,
      updatedAt: timestamp,
      tabs: [createDefaultWorkspaceTab("Overview", content)],
      customBlockTemplates: [],
      viewState: { notePreviewState: {} },
      dashboard: { tint: draft.tint, featuredBlocks: [] },
    });
    const state = useWorkspaceStore.getState();
    setNodes([...state.nodes, nextNode]);
    setSelectedNodeIds([nextNode.id]);
    closeEditor();
  }, [closeEditor, setNodes, setSelectedNodeIds, updateNodes]);
  const preloadWorkspace = useCallback(async () => {
    if (!authEnabled || !canvasWorkspaceId) return;
    if (useWorkspaceStore.getState().isPreloadingWorkspace) return;
    setIsPreloadingWorkspace(true);
    try {
      const snapshot = await queryClient.ensureQueryData({
        ...workspaceGetQueryOptions,
        staleTime: 30_000,
      });
      if (snapshot && !useWorkspaceStore.getState().loadApplied) {
        applyRemoteSnapshot(snapshot.nodes, snapshot.updatedAt);
      }
    } catch {
    } finally {
      setIsPreloadingWorkspace(false);
    }
  }, [
    applyRemoteSnapshot,
    authEnabled,
    canvasWorkspaceId,
    queryClient,
    setIsPreloadingWorkspace,
    workspaceGetQueryOptions,
  ]);

  useEffect(() => {
    if (!userId) {
      clearSaveTimer();
      clearRetryTimer();
      closeEditor();
      resetWorkspaceState();
      previousUserIdRef.current = null;
      return;
    }
    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      clearSaveTimer();
      clearRetryTimer();
      closeEditor();
      resetWorkspaceState();
    }
    previousUserIdRef.current = userId;
  }, [clearRetryTimer, clearSaveTimer, closeEditor, resetWorkspaceState, userId]);

  useEffect(() => {
    if (!canvasWorkspaceId) return;
    if (previousWorkspaceIdRef.current && previousWorkspaceIdRef.current !== canvasWorkspaceId) {
      clearSaveTimer();
      clearRetryTimer();
      closeEditor();
      resetWorkspaceState();
    }
    previousWorkspaceIdRef.current = canvasWorkspaceId;
  }, [canvasWorkspaceId, clearRetryTimer, clearSaveTimer, closeEditor, resetWorkspaceState]);

  useEffect(() => {
    const remoteWorkspace = workspaceQuery.data;
    if (!remoteWorkspace) return;
    const state = useWorkspaceStore.getState();
    if (!state.loadApplied) {
      applyRemoteSnapshot(remoteWorkspace.nodes, remoteWorkspace.updatedAt);
      return;
    }
    const normalizedRemote = remoteWorkspace.nodes.map(normalizeWorkspaceNode);
    const normalizedLocal = state.nodes.map(normalizeWorkspaceNode);
    if (workspaceNodesSignature(normalizedRemote) === workspaceNodesSignature(normalizedLocal)) {
      if (remoteWorkspace.updatedAt !== state.syncedAt) {
        setSyncedAt(remoteWorkspace.updatedAt);
      }
      return;
    }
    if (remoteWorkspace.updatedAt === state.syncedAt) return;
    const pending =
      state.localRevision > state.syncedRevision ||
      Boolean(saveTimerRef.current) ||
      saveWorkspace.isPending;
    if (pending) return;
    applyRemoteSnapshot(remoteWorkspace.nodes, remoteWorkspace.updatedAt);
  }, [applyRemoteSnapshot, saveWorkspace.isPending, setSyncedAt, workspaceQuery.data]);

  useEffect(() => {
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      previousNodesRef.current = nodes;
      setIsHydratingWorkspace(false);
      return;
    }
    if (previousNodesRef.current === nodes) return;
    previousNodesRef.current = nodes;
    if (!workspaceReadyForEdits || isHydratingWorkspace) return;
    incrementLocalRevision();
    scheduleWorkspaceSaveRef.current();
  }, [
    nodes,
    workspaceReadyForEdits,
    isHydratingWorkspace,
    incrementLocalRevision,
    setIsHydratingWorkspace,
  ]);

  useEffect(
    () => () => {
      clearSaveTimer();
      clearRetryTimer();
      clearSavedStateTimer();
    },
    [clearRetryTimer, clearSaveTimer, clearSavedStateTimer],
  );
  useEffect(() => {
    bindApplyWorkspaceSnapshotHandler(applyWorkspaceSnapshot);
    return () => bindApplyWorkspaceSnapshotHandler(null);
  }, [applyWorkspaceSnapshot]);

  return {
    canvasWorkspaceId,
    workspaceQuery,
    preloadWorkspace,
    workspaceReadyForEdits,
    hasWorkspaceLoaded,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    nodes,
    selectedNodeIds,
    saveBadge,
    saveError,
    syncedAt,
    editorOpen: store.editorOpen,
    editorMode: store.editorMode,
    nodeDraft,
    editorBlockOptions,
    isDraftValid,
    closeEditor,
    openCreateNode,
    openEditNode,
    connectNodePair,
    disconnectNodePair,
    removeNode,
    submitNodeEditor,
    applyWorkspaceSnapshot,
    updateNodes,
    setSelectedNodeIds,
    patchNodeDraft,
  };
}
