import { AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@/lib/navigation";

import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import {
  LazyInfiniteCanvas,
  type InfiniteCanvasHandle,
} from "@/features/workspace/canvas/lazy-infinite-canvas";
import { WorkspaceEditorModal } from "@/features/workspace/workspace-editor-modal";
import { WorkspaceNodeCard } from "@/features/workspace/workspace-node-card";
import { Badge } from "@/ui/badge";
import { authClient } from "@/lib/auth-client";
import { teamListQueryOptions } from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { useWorkspaceQuery } from "@/features/workspace/hooks/use-workspace-query";
import { dashboardErrorAlertClass } from "@/features/dashboard/dashboard-ui";
import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { shellContentInClass } from "@/features/app-shell/app-shell-ui";
import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import { CanvasKnowledgeCreateMenuContainer } from "@/features/workspace-knowledge/containers/canvas-knowledge-create-menu-container";
import { CanvasKnowledgeCreateDialog } from "@/features/workspace-knowledge/workspace-knowledge";
import { useCanvasKnowledgeBoard } from "@/features/workspace-knowledge/hooks/use-canvas-knowledge-board";
import { useWorkspaceKnowledgeStore } from "@/features/workspace-knowledge/stores/workspace-knowledge";
import { KnowledgeBoardCardView } from "@/features/workspace-knowledge/knowledge-board-card-view";
import { isDocumentBoardCard, knowledgeOpenHref } from "@/features/workspace-knowledge/board-cards";
import { cn } from "@/lib/utils";

function renderWorkspaceCard(
  node: CanvasNodeModel,
  selected: boolean,
  allNodes: CanvasNodeModel[],
) {
  if (isDocumentBoardCard(node)) {
    return <WorkspaceNodeCard node={node} selected={selected} allNodes={allNodes} />;
  }
  return (
    <KnowledgeBoardCardView
      kind={node.kind ?? "knowledge"}
      chip={node.chip ?? "Note"}
      bodyPreview={node.bodyPreview}
      agencyHref={node.agencyHref}
    />
  );
}

export function CanvasPage() {
  const canvasRef = useRef<InfiniteCanvasHandle | null>(null);
  const navigate = useNavigate();
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const [selectionArmed, setSelectionArmed] = useState(false);
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);

  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);

  const board = useWorkspaceQuery({ canvasWorkspaceId: workspaceId });
  const knowledge = useCanvasKnowledgeBoard({
    canvasWorkspaceId: workspaceId,
    documents: board.nodes,
    teamId: selectedTeamId || null,
  });
  const openCreateMenuAt = useWorkspaceKnowledgeStore((state) => state.openCreateMenuAt);

  const resolveBoardPoint = useCallback(() => canvasRef.current?.viewportCenter() ?? null, []);

  const handleCreateDocument = useCallback(
    (point?: { x: number; y: number }) => {
      board.openCreateNode(point ?? canvasRef.current?.viewportCenter() ?? { x: 0, y: 0 });
    },
    [board.openCreateNode],
  );

  useEffect(() => {
    if (board.selectedNodeIds.length > 0) {
      board.setSelectedNodeIds([]);
    }
    setSelectionArmed(true);
  }, []);

  const handleFlowNodesChange = useCallback(
    (nextNodes: CanvasNodeModel[]) => {
      board.updateNodes((draft) => {
        const positionById = new Map(nextNodes.map((node) => [node.id, node]));
        draft.forEach((node, index) => {
          const updated = positionById.get(node.id);
          if (!updated) return;
          draft[index] = {
            ...node,
            x: updated.x,
            y: updated.y,
            width: updated.width,
            height: updated.height,
          };
        });
      });
      knowledge.syncGeometry(nextNodes);
    },
    [board.updateNodes, knowledge.syncGeometry],
  );

  const handleOpenNode = useCallback(
    (payload: { nodeId: string }) => {
      const node = knowledge.cards.find((card) => card.id === payload.nodeId);
      const href = node ? knowledgeOpenHref(node, selectedTeamId) : `/node/${payload.nodeId}`;
      if (!href) return;
      board.setSelectedNodeIds([]);
      void navigate(href);
    },
    [board.setSelectedNodeIds, knowledge.cards, navigate, selectedTeamId],
  );

  const handleEditNode = useCallback(
    (payload: { nodeId: string }) => {
      const node = knowledge.cards.find((card) => card.id === payload.nodeId);
      if (node && !isDocumentBoardCard(node)) {
        handleOpenNode(payload);
        return;
      }
      board.openEditNode(payload);
    },
    [board.openEditNode, handleOpenNode, knowledge.cards],
  );

  const handleRemoveNode = useCallback(
    (payload: { nodeId: string }) => {
      const node = knowledge.cards.find((card) => card.id === payload.nodeId);
      if (node && !isDocumentBoardCard(node)) {
        void knowledge.removeCard(payload.nodeId);
        return;
      }
      board.removeNode(payload);
    },
    [board.removeNode, knowledge],
  );

  const teamListQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teams = teamListQuery.data?.items ?? [];

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  useEffect(() => {
    void board.preloadWorkspace();
  }, [board.preloadWorkspace]);

  const dataReady =
    !board.isWorkspaceInitialLoading && !teamListQuery.isPending && !knowledge.isLoading;
  const { isBooting } = useShellBootGate(dataReady);

  return (
    <AppShellPage>
      <ShellBootSurface booting={isBooting} label="Opening canvas">
        <div className="relative h-full w-full overflow-hidden bg-default selection:bg-primary/30">
          <main className="h-full w-full">
            <LazyInfiniteCanvas
              ref={canvasRef}
              nodes={knowledge.cards}
              selectedNodeIds={selectionArmed ? board.selectedNodeIds : []}
              loading={board.isWorkspaceInitialLoading || knowledge.isLoading}
              onNodesChange={handleFlowNodesChange}
              onSelectedNodeIdsChange={board.setSelectedNodeIds}
              onCreateNode={board.openCreateNode}
              onCreateRequest={openCreateMenuAt}
              onPlaceUnplaced={(payload) => {
                void knowledge.placeCard(payload);
              }}
              onEditNode={handleEditNode}
              onConnectNodePair={board.connectNodePair}
              onDisconnectNodePair={board.disconnectNodePair}
              onRemoveNode={handleRemoveNode}
              onOpenNode={handleOpenNode}
              renderNode={renderWorkspaceCard}
            />
          </main>

          <CanvasKnowledgeCreateDialog
            canvasWorkspaceId={workspaceId}
            teamId={selectedTeamId || null}
            resolveBoardPoint={resolveBoardPoint}
            onCreateDocument={handleCreateDocument}
          />
          <CanvasKnowledgeCreateMenuContainer
            canvasWorkspaceId={workspaceId}
            teamId={selectedTeamId || null}
            onCreateDocument={handleCreateDocument}
          />

          <div className="pointer-events-none absolute bottom-[11.5rem] left-4 z-30 flex max-w-xs flex-col gap-3 md:bottom-[12rem] md:left-6">
            {board.isWorkspaceRefreshing ? (
              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <Badge
                  key="refreshing"
                  variant="secondary"
                  className={cn("gap-1.5", shellContentInClass)}
                >
                  <Loader2 className="size-3 animate-spin" />
                  Refreshing
                </Badge>
              </div>
            ) : null}

            {board.saveError ? (
              <div
                key={board.saveError}
                className={cn(
                  dashboardErrorAlertClass,
                  shellContentInClass,
                  "pointer-events-auto rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
                )}
              >
                {board.saveError}
              </div>
            ) : null}

            {knowledge.captureError ? (
              <div
                key={knowledge.captureError}
                className={cn(
                  dashboardErrorAlertClass,
                  shellContentInClass,
                  "pointer-events-auto rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
                )}
              >
                {knowledge.captureError}
              </div>
            ) : null}

            {board.workspaceQuery.status === "error" ? (
              <div
                key={board.workspaceQuery.error?.message ?? "workspace-error"}
                className={cn(
                  dashboardErrorAlertClass,
                  shellContentInClass,
                  "pointer-events-auto rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
                )}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="size-4" />
                  Couldn&apos;t load workspace
                </div>
                <p className="mt-1">{board.workspaceQuery.error?.message}</p>
              </div>
            ) : null}
          </div>

          <WorkspaceEditorModal
            availableBlocks={board.editorBlockOptions}
            content={board.nodeDraft.content}
            featuredBlocks={board.nodeDraft.featuredBlocks}
            mode={board.editorMode}
            nodeType={board.nodeDraft.nodeType}
            open={board.editorOpen}
            tint={board.nodeDraft.tint}
            title={board.nodeDraft.title}
            valid={board.isDraftValid}
            onClose={board.closeEditor}
            onSubmit={board.submitNodeEditor}
            onFeaturedBlocksChange={(featuredBlocks) => board.patchNodeDraft({ featuredBlocks })}
            onContentChange={(content) => board.patchNodeDraft({ content })}
            onNodeTypeChange={(nodeType) => board.patchNodeDraft({ nodeType })}
            onTintChange={(tint) => board.patchNodeDraft({ tint })}
            onTitleChange={(title) => board.patchNodeDraft({ title })}
          />
        </div>
      </ShellBootSurface>
    </AppShellPage>
  );
}
