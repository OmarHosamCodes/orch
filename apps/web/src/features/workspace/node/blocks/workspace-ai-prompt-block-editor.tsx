import type { WorkspaceAiPromptBlock } from "@orch/workspace";
import { AlertCircle, History, Sparkles, Terminal, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export function WorkspaceAiPromptBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceAiPromptBlock>) {
  const { mutateTypedBlock, runPromptBlock, getBlockOperationState } =
    useWorkspaceNodeEditorContext();
  const [runError, setRunError] = useState<string | null>(null);

  const operationState = getBlockOperationState(tabId, block.id);
  const hasPrompt = block.prompt.trim().length > 0;
  const contextModeLabel = useMemo(
    () => (block.includeContext ? "Uses current node" : "Standalone prompt"),
    [block.includeContext],
  );

  async function handleRun() {
    if (operationState.pending || !hasPrompt) {
      return;
    }
    setRunError(null);
    try {
      await runPromptBlock(tabId, block.id);
    } catch (error) {
      setRunError(getErrorMessage(error, "Could not run this prompt."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-surface border border-border bg-background p-surface">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-toned">
              <Sparkles className="size-5" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em]">Prompt</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-2xl">
                {contextModeLabel}
              </Badge>
              {operationState.pending ? (
                <Badge variant="secondary" className="rounded-2xl">
                  {operationState.label || "Running prompt"}
                </Badge>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
              <BlockCheckbox
                checked={block.includeContext}
                onCheckedChange={(checked) =>
                  mutateTypedBlock(tabId, block.id, "ai-prompt", (entry) => {
                    entry.includeContext = checked;
                  })
                }
              />
              <span>Include current node context</span>
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!hasPrompt || operationState.pending}
            onClick={handleRun}
          >
            <Zap />
            {operationState.pending ? "Running prompt" : "Run prompt"}
          </Button>
        </div>
        <Textarea
          value={block.prompt}
          placeholder="Ask for a structured summary, next actions, critique, or standalone answer..."
          className="min-h-[120px] w-full resize-y border-0 bg-transparent p-0 text-base leading-relaxed font-medium shadow-none focus-visible:ring-0"
          onChange={(event) =>
            mutateTypedBlock(tabId, block.id, "ai-prompt", (entry) => {
              entry.prompt = event.target.value;
            })
          }
        />
      </div>

      {runError ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm font-medium">{runError}</p>
        </div>
      ) : null}

      {block.latestOutput ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-toned" />
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                Latest result
              </h4>
            </div>
            <Badge variant="secondary" className="rounded-2xl">
              {contextModeLabel}
            </Badge>
          </div>
          <div className="rounded-surface border border-border bg-card p-surface">
            <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap text-foreground">
              {block.latestOutput}
            </div>
          </div>
        </div>
      ) : null}

      {block.outputHistory.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-toned" />
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                Prompt history
              </h4>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
              {block.outputHistory.length} entries
            </span>
          </div>
          <div className="grid gap-3">
            {block.outputHistory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-surface border border-border bg-background p-surface"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-toned">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-foreground/80 italic">"{entry.prompt}"</p>
                <div className="mt-2 line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                  {entry.output}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
