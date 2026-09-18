import type {
  WorkspaceBlock,
  WorkspaceNode,
  WorkspaceNodeTab,
  WorkspaceTeamRole,
} from "@orch/workspace";
import {
  ArrowLeft,
  Blocks,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Pencil,
  ShieldCheck,
  Store,
  Trash2,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { agencyRefHref } from "@/features/workspace/workspace-agency-links";
import { useCallback, useEffect, useMemo, useState } from "react";

import { WorkspaceNodeBlockRenderer } from "@/features/workspace/node/workspace-node-block-renderer";
import {
  WorkspaceAddBlockCommand,
  type WorkspaceAddBlockCommandView,
} from "@/features/workspace/node/workspace-add-block-command";
import { WorkspaceNodeEmptyState } from "@/features/workspace/node/workspace-node-empty-state";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import type { WorkspaceSaveBadge } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { cn } from "@/lib/utils";

type WorkspaceTeamSummary = { id: string; name: string; role: WorkspaceTeamRole };
type WorkspaceNodeShellProps = {
  node: WorkspaceNode;
  activeTab: WorkspaceNodeTab;
  activeTabId: string;
  saveBadge: WorkspaceSaveBadge;
  saveError: string | null;
  visibleBlocks: WorkspaceBlock[];
  nodeVisibilityLabel: string;
  nodeVisibilityBadgeClass: string;
  nodeOwnerLabel: string;
  nodeTeamName: string | null;
  activeTeamRole: WorkspaceTeamRole | null;
  canEditNodeContent: boolean;
  teams: WorkspaceTeamSummary[];
  nodeShareTeamId: string;
  canManageNodeSharing: boolean;
  sharePending: boolean;
  unsharePending: boolean;
  onNodeShareTeamIdChange: (value: string) => void;
  onShareNode: () => void;
  onUnshareNode: () => void;
};

export function WorkspaceNodeShell({
  node,
  activeTab,
  activeTabId,
  saveBadge,
  saveError,
  visibleBlocks,
  nodeVisibilityLabel,
  nodeVisibilityBadgeClass,
  nodeOwnerLabel,
  nodeTeamName,
  activeTeamRole,
  canEditNodeContent,
  teams,
  nodeShareTeamId,
  canManageNodeSharing,
  sharePending,
  unsharePending,
  onNodeShareTeamIdChange,
  onShareNode,
  onUnshareNode,
}: WorkspaceNodeShellProps) {
  const {
    setActiveTab,
    openTabEditor,
    deleteActiveTab,
    saveActiveTabToMarketplace,
    getDisplayTabTitle,
    addBlockToActiveTab,
  } = useWorkspaceNodeEditorContext();
  const agencyHref = node.agencyRef ? agencyRefHref(node.agencyRef) : null;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [addBlockCommandOpen, setAddBlockCommandOpen] = useState(false);
  const [addBlockCommandView, setAddBlockCommandView] =
    useState<WorkspaceAddBlockCommandView>("search");
  const [pendingFocusBlockId, setPendingFocusBlockId] = useState<string | null>(null);
  const handleBlockInserted = useCallback((blockIds: string[]) => {
    const firstBlockId = blockIds[0];
    if (firstBlockId) setPendingFocusBlockId(firstBlockId);
  }, []);
  const handleFocusHandled = useCallback((blockId: string) => {
    setPendingFocusBlockId((current) => (current === blockId ? null : current));
  }, []);
  const openAddBlockCommand = useCallback((view: WorkspaceAddBlockCommandView = "search") => {
    setAddBlockCommandView(view);
    setAddBlockCommandOpen(true);
  }, []);
  useEffect(() => {
    if (!canEditNodeContent) return;
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      )
        return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAddBlockCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEditNodeContent]);
  const isNodeSharedWithTeam = node.visibility === "team";
  const isShareTogglePending = sharePending || unsharePending;
  const activeTeamRoleLabel = useMemo(() => {
    if (!activeTeamRole) return null;
    if (activeTeamRole === "owner") return "Owner";
    if (activeTeamRole === "editor") return "Editor";
    return "Viewer";
  }, [activeTeamRole]);
  return (
    <div className="flex h-full w-full gap-0 overflow-hidden bg-default">
      <aside
        className={cn(
          "flex flex-col border-r border-default bg-background transition-all duration-300",
          isSidebarOpen ? "w-80" : "w-0 opacity-0",
        )}
      >
        <div className="flex flex-1 flex-col overflow-y-auto p-surface">
          <Button
            variant="ghost"
            className="justify-start px-0 text-highlighted hover:bg-elevated hover:text-highlighted"
            asChild
          >
            <Link to="/canvas">
              <ArrowLeft className="size-4" />
              Canvas
            </Link>
          </Button>
          <div className="mb-8 mt-4 space-y-4">
            <Badge className={saveBadge.className}>{saveBadge.label}</Badge>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-highlighted">{node.title}</h1>
              {agencyHref ? (
                <Button variant="outline" size="sm" className="h-8 rounded-full" asChild>
                  <Link to={agencyHref}>Open in Agency</Link>
                </Button>
              ) : null}
            </div>
            <div className="rounded-surface border border-default bg-card p-surface">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Node Access
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        nodeVisibilityBadgeClass,
                      )}
                    >
                      {nodeVisibilityLabel}
                    </span>
                    <span className="text-[11px] text-toned">Owner: {nodeOwnerLabel}</span>
                    {activeTeamRoleLabel ? (
                      <span className="text-[11px] text-muted">Role: {activeTeamRoleLabel}</span>
                    ) : null}
                    {canManageNodeSharing && nodeTeamName ? (
                      <span className="truncate text-[11px] text-muted">Team: {nodeTeamName}</span>
                    ) : null}
                  </div>
                </div>
                <ShieldCheck className="mt-0.5 size-4 text-muted" />
              </div>
              {canManageNodeSharing ? (
                <div className="mt-2.5 flex items-center gap-2">
                  <Select
                    value={nodeShareTeamId || "__empty"}
                    disabled={teams.length === 0}
                    onValueChange={(next) =>
                      onNodeShareTeamIdChange(next === "__empty" ? "" : next)
                    }
                  >
                    <SelectTrigger aria-label="Select team" className="w-full">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      align="start"
                      className="w-(--radix-select-trigger-width)"
                    >
                      <SelectItem value="__empty" disabled>
                        Select team
                      </SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={isShareTogglePending || (!isNodeSharedWithTeam && !nodeShareTeamId)}
                    onClick={() => (isNodeSharedWithTeam ? onUnshareNode() : onShareNode())}
                  >
                    {isNodeSharedWithTeam ? "Unshare" : "Share"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mb-8 space-y-1">
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">
              Workspaces
            </p>
            {node.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  tab.id === activeTabId
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-toned hover:bg-elevated hover:text-highlighted",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.id === activeTabId ? (
                  <FolderOpen className="size-4.5" />
                ) : (
                  <Folder className="size-4.5" />
                )}
                <span className="flex-1 truncate text-left">{getDisplayTabTitle(tab)}</span>
              </button>
            ))}
            <button
              type="button"
              className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated hover:text-highlighted"
              onClick={() => openTabEditor("create")}
            >
              <Plus className="size-4.5" />
              Add workspace
            </button>
          </div>
          <div className="mt-auto space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-2xl text-toned hover:bg-elevated hover:text-highlighted"
              onClick={() => void saveActiveTabToMarketplace()}
            >
              <Store className="size-4" />
              Share template
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-2xl text-toned hover:bg-elevated hover:text-highlighted"
              onClick={() => openTabEditor("rename")}
            >
              <Pencil className="size-4" />
              Rename
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-2xl text-toned hover:bg-elevated hover:text-error"
              onClick={() => deleteActiveTab()}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </aside>
      <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-default bg-default p-surface">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-highlighted hover:bg-elevated hover:text-highlighted"
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
            <div>
              <p className="text-sm font-semibold text-highlighted">
                {getDisplayTabTitle(activeTab)}
              </p>
              <p className="text-xs text-muted">{visibleBlocks.length} blocks</p>
            </div>
          </div>
          <Button disabled={!canEditNodeContent} onClick={() => openAddBlockCommand("search")}>
            <Blocks className="size-4" />
            Add block
            <kbd className="ml-1 hidden rounded-md border border-primary-foreground/25 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary-foreground sm:inline">
              ⌘K
            </kbd>
          </Button>
        </header>
        <WorkspaceAddBlockCommand
          open={addBlockCommandOpen}
          canEdit={canEditNodeContent}
          initialView={addBlockCommandView}
          onOpenChange={setAddBlockCommandOpen}
          onInserted={handleBlockInserted}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-surface">
          {saveError ? (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {saveError}
            </div>
          ) : null}
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            {visibleBlocks.map((block) => (
              <WorkspaceNodeBlockRenderer
                key={block.id}
                block={block}
                tabId={activeTabId}
                pendingFocusBlockId={pendingFocusBlockId}
                onFocusHandled={handleFocusHandled}
              />
            ))}
            {visibleBlocks.length === 0 ? (
              <WorkspaceNodeEmptyState
                canEdit={canEditNodeContent}
                onAddBlock={(type) => addBlockToActiveTab(type)}
                onQuickAdd={(_type, blockId) => {
                  if (blockId) setPendingFocusBlockId(blockId);
                }}
                onBrowseAll={(view) => openAddBlockCommand(view)}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
