import type { WorkspaceBlock } from "@orch/workspace";
import { Loader2, Search, Store, Trash2 } from "lucide-react";
import { Suspense, useEffect, useRef } from "react";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { getWorkspaceBlockRegistryEntry } from "@/features/workspace/utils/workspace-block-registry";

type WorkspaceNodeBlockRendererProps = {
  block: WorkspaceBlock;
  tabId: string;
  pendingFocusBlockId?: string | null;
  onFocusHandled?: (blockId: string) => void;
};

function BlockEditorFallback() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-muted px-4 py-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
      Loading editor
    </div>
  );
}

export function WorkspaceNodeBlockRenderer({
  block,
  tabId,
  pendingFocusBlockId,
  onFocusHandled,
}: WorkspaceNodeBlockRendererProps) {
  const {
    normalizedBlockSearch,
    getBlockSearchMatches,
    highlightSearchMatch,
    updateBlockTitle,
    toggleAgentContextBlock,
    isAgentContextBlock,
    saveBlockToMarketplace,
    removeBlock,
    getBlockOperationState,
  } = useWorkspaceNodeEditorContext();

  const titleInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldFocusTitle = pendingFocusBlockId === block.id;

  useEffect(() => {
    if (!shouldFocusTitle) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rootRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
    onFocusHandled?.(block.id);
  }, [block.id, onFocusHandled, shouldFocusTitle]);

  const registryEntry = getWorkspaceBlockRegistryEntry(block.type);
  const EditorComponent = registryEntry.component;
  const Icon = registryEntry.icon;
  const isContextBlock = isAgentContextBlock(tabId, block.id);
  const operationState = getBlockOperationState(tabId, block.id);
  const searchMatches = getBlockSearchMatches(block);

  return (
    <div
      ref={rootRef}
      data-block-id={block.id}
      className="group relative flex flex-col gap-5 rounded-surface border border-border bg-default p-surface transition-colors duration-200 hover:border-muted-foreground/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-muted bg-elevated text-toned">
            <Icon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <Input
              ref={titleInputRef}
              value={block.title}
              placeholder="Untitled block"
              autoFocus={shouldFocusTitle}
              className="h-auto border-0 bg-transparent px-0 text-xl font-semibold tracking-tight text-highlighted shadow-none placeholder:text-muted focus-visible:ring-0"
              onChange={(event) => updateBlockTitle(tabId, block.id, event.target.value)}
            />
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {registryEntry.label}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {operationState.pending ? (
            <Badge variant="secondary" className="rounded-full">
              <Loader2 className="mr-1.5 size-3.5 animate-spin motion-reduce:animate-none" />
              {operationState.label || "Working"}
            </Badge>
          ) : null}

          <Button
            type="button"
            variant={isContextBlock ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full"
            onClick={() => toggleAgentContextBlock(tabId, block.id)}
          >
            {isContextBlock ? "In Orch" : "Include in Orch"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl"
            aria-label="Save block to marketplace"
            onClick={() => void saveBlockToMarketplace(block)}
          >
            <Store className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-error/10 hover:text-error"
            aria-label="Delete block"
            onClick={() => removeBlock(tabId, block.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {normalizedBlockSearch && searchMatches.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-warning">
            <Search className="size-4" />
            <p className="text-xs font-semibold tracking-[0.14em] uppercase">Search matches</p>
          </div>
          <div className="space-y-1.5">
            {searchMatches.map((match, index) => (
              <p
                key={`${block.id}-match-${index}`}
                className="text-sm leading-relaxed text-toned"
                dangerouslySetInnerHTML={{ __html: highlightSearchMatch(match) }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[50px]">
        <Suspense fallback={<BlockEditorFallback />}>
          <EditorComponent block={block} tabId={tabId} />
        </Suspense>
      </div>
    </div>
  );
}
