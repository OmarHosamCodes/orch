import { normalizeWorkspaceNode, type WorkspaceBlock, type WorkspaceNode } from "@orch/workspace";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "@/lib/navigation";

import type { WorkspaceNodeEditorContextValue } from "@/features/workspace/node/context";
import { useWorkspaceNodeSharing } from "./use-workspace-node-sharing";
import {
  createWorkspaceBlockByType,
  createWorkspaceBlocksFromPreset,
} from "@/features/workspace/utils/create-workspace-block";
import type { WorkspaceBlockPresetId } from "@/features/workspace/utils/workspace-block-presets";
import { useWorkspaceQuery } from "@/features/workspace/hooks/use-workspace-query";

export function useWorkspaceNodePage() {
  const { id: nodeId = "" } = useParams<{ id: string }>();
  const workspace = useWorkspaceQuery({ nodeId });
  const {
    hasWorkspaceLoaded,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    nodes,
    preloadWorkspace,
    saveBadge,
    saveError,
    updateNodes,
    workspaceQuery,
  } = workspace;

  useEffect(() => {
    void preloadWorkspace();
  }, [preloadWorkspace]);

  const [blockSearch] = useState("");

  const node = useMemo(() => nodes.find((entry) => entry.id === nodeId) ?? null, [nodeId, nodes]);
  const activeTabId = node?.viewState.activeTabId ?? "";
  const activeTab = useMemo(
    () => node?.tabs.find((tab) => tab.id === activeTabId) ?? node?.tabs[0] ?? null,
    [activeTabId, node],
  );

  const sharing = useWorkspaceNodeSharing({ node, workspaceQuery });

  const visibleBlocks = useMemo(() => {
    if (!activeTab) return [] as WorkspaceBlock[];
    const query = blockSearch.trim().toLowerCase();
    if (!query) return activeTab.blocks;
    return activeTab.blocks.filter((block) =>
      `${block.title} ${block.type}`.toLowerCase().includes(query),
    );
  }, [activeTab, blockSearch]);

  function mutateCurrentNode(mutator: (entry: WorkspaceNode, timestamp: string) => void) {
    updateNodes((draftNodes) => {
      const index = draftNodes.findIndex((entry) => entry.id === nodeId);
      if (index < 0) return;
      const timestamp = new Date().toISOString();
      const entry = draftNodes[index];
      if (!entry) return;
      mutator(entry, timestamp);
      entry.label = entry.title;
      entry.updatedAt = timestamp;
      draftNodes[index] = normalizeWorkspaceNode(entry);
    });
  }

  const editorContext = {
    currentNode: node,
    blockSearch,
    normalizedBlockSearch: blockSearch.trim().toLowerCase(),
    tabEditor: { open: false, mode: "create" as const, title: "" },
    priorityOptions: [],
    domainOptions: [],
    setActiveTab(tabId: string) {
      mutateCurrentNode((entry) => {
        entry.viewState.activeTabId = tabId;
      });
    },
    openTabEditor() {},
    closeTabEditor() {},
    submitTabEditor() {},
    deleteActiveTab() {},
    saveNodeToMarketplace() {},
    saveActiveTabToMarketplace() {},
    addBlockToActiveTab(type: WorkspaceBlock["type"], options?: { title?: string }) {
      if (!activeTab || !sharing.canEditNodeContent) return null;

      const nextBlock = createWorkspaceBlockByType(type, options);
      if (!nextBlock) return null;

      mutateCurrentNode((entry) => {
        const tab = entry.tabs.find((candidate) => candidate.id === activeTab.id);
        if (!tab) return;
        tab.blocks.unshift(nextBlock);
      });

      return nextBlock.id;
    },
    addBlockPresetToActiveTab(presetId: WorkspaceBlockPresetId) {
      if (!activeTab || !sharing.canEditNodeContent) return [];

      const nextBlocks = createWorkspaceBlocksFromPreset(presetId);
      if (nextBlocks.length === 0) return [];

      mutateCurrentNode((entry) => {
        const tab = entry.tabs.find((candidate) => candidate.id === activeTab.id);
        if (!tab) return;
        tab.blocks.unshift(...nextBlocks);
      });

      return nextBlocks.map((block) => block.id);
    },
    removeBlock(tabId: string, blockId: string) {
      mutateCurrentNode((entry) => {
        const tab = entry.tabs.find((candidate) => candidate.id === tabId);
        if (!tab) return;
        tab.blocks = tab.blocks.filter((block) => block.id !== blockId);
      });
    },
    updateBlockTitle(tabId: string, blockId: string, value: string) {
      mutateCurrentNode((entry) => {
        const tab = entry.tabs.find((candidate) => candidate.id === tabId);
        const block = tab?.blocks.find((candidate) => candidate.id === blockId);
        if (block) block.title = value;
      });
    },
    toggleAgentContextBlock() {},
    clearAgentContextBlock() {},
    isAgentContextBlock: () => false,
    saveBlockToMarketplace() {},
    getTimeOrchestratorSummaryForBlock: () => null,
    mutateBlock(
      tabId: string,
      blockId: string,
      mutator: (
        block: WorkspaceBlock,
        tab: WorkspaceNode["tabs"][number],
        nodeEntry: WorkspaceNode,
        timestamp: string,
      ) => void,
    ) {
      mutateCurrentNode((entry, timestamp) => {
        const tab = entry.tabs.find((candidate) => candidate.id === tabId);
        const block = tab?.blocks.find((candidate) => candidate.id === blockId);
        if (!tab || !block) return;
        mutator(block, tab, entry, timestamp);
      });
    },
    mutateTypedBlock(tabId, blockId, type, mutator) {
      editorContext.mutateBlock(tabId, blockId, (block, tab, nodeEntry, timestamp) => {
        if (block.type !== type) return;
        mutator(block as never, tab, nodeEntry, timestamp);
      });
    },
    addTask() {},
    mutateTask() {},
    mutateCollectedTask() {},
    removeTask() {},
    addDecisionItem() {},
    mutateDecisionItem() {},
    removeDecisionItem() {},
    addTrackerEntry() {},
    mutateTrackerEntry() {},
    removeTrackerEntry() {},
    addKanbanColumn() {},
    mutateKanbanColumn() {},
    removeKanbanColumn() {},
    addKanbanCard() {},
    mutateKanbanCard() {},
    moveKanbanCard() {},
    removeKanbanCard() {},
    addTimelineMilestone() {},
    mutateTimelineMilestone() {},
    removeTimelineMilestone() {},
    moveTimelineMilestone() {},
    addScorecardMetric() {},
    mutateScorecardMetric() {},
    removeScorecardMetric() {},
    runPromptBlock() {},
    runCustomPrompt() {},
    runBlockAgentPrompt: async () => "",
    getBlockOperationState: () => ({ pending: false, label: null }),
    isBlockOperationPending: () => false,
    toggleNotePreview() {},
    isNotePreviewEnabled: () => false,
    getDisplayTabTitle: (tab) => tab?.title?.trim() || "Untitled tab",
    getDisplayBlockTitle: (block) => block.title?.trim() || "Untitled block",
    getBlockSearchMatches: () => [],
    highlightSearchMatch: (value: string) => value,
    getCustomTemplate: () => null,
    getCustomFormulaResult: () => null,
    getCustomPromptPreview: () => "",
    getPriorityBadgeClass: () => "",
    formatRelativeTaskMeta: () => "",
    formatFormulaResult: () => "",
    renderNotesPreview: (input: string) => input,
    allNodes: nodes,
    connectSource() {},
    disconnectSource() {},
    removeCollectedTask() {},
    addTaskToSource() {},
    navigateToSource() {},
  } satisfies WorkspaceNodeEditorContextValue;

  return {
    ...sharing,
    node,
    activeTab,
    activeTabId,
    workspaceQuery,
    hasWorkspaceLoaded,
    isWorkspaceInitialLoading,
    isWorkspaceRefreshing,
    saveBadge,
    saveError,
    editorContext,
    visibleBlocks,
    agentChatNodes: node ? [node] : [],
    agentContextBadgeItems: [] as Array<{ id: string; label: string }>,
  };
}
