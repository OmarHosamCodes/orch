import {
  buildMessageHouseStressTestPrompt,
  getMessageHouseSummary,
  type WorkspaceMessageHouseBlock,
} from "@orch/workspace";
import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { renderSimpleMarkdown } from "@/lib/utils/render-simple-markdown";

const bottomSections = [
  {
    key: "audiencePains" as const,
    label: "Audience Pains",
    placeholder: "What frustrations, risks, and stalled outcomes does the audience already feel?",
  },
  {
    key: "proofPoints" as const,
    label: "Proof Points",
    placeholder:
      "Case studies, client results, founder receipts, or market proof that support the promise.",
  },
  {
    key: "voicePrinciples" as const,
    label: "Voice Principles",
    placeholder: "Rules for how the brand should sound across posts, scripts, and team output.",
  },
];

export function WorkspaceMessageHouseBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceMessageHouseBlock>) {
  const { mutateBlock, runBlockAgentPrompt } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getMessageHouseSummary(block), [block]);
  const [isStressTesting, setIsStressTesting] = useState(false);

  async function runStressTest() {
    setIsStressTesting(true);

    try {
      const response = await runBlockAgentPrompt(
        tabId,
        block.id,
        buildMessageHouseStressTestPrompt(block),
      );

      mutateBlock(tabId, block.id, (entry, _tab, _node, timestamp) => {
        if (entry.type !== "message-house") {
          return;
        }
        entry.latestStressTest = response;
        entry.stressTestUpdatedAt = timestamp;
      });

      toast.success("Stress test saved", {
        description: "The Brand agent analysis was added to the message house.",
      });
    } catch (error) {
      toast.error("Stress test failed", {
        description: getErrorMessage(
          error,
          "The Brand agent could not stress-test the message house.",
        ),
      });
    } finally {
      setIsStressTesting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Filled</p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-primary sm:text-2xl">
            {summary.filledSectionCount}/7
          </p>
        </div>

        <div className="rounded-xl border border-secondary/10 bg-secondary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/60">
            Pillars
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-secondary sm:text-2xl">
            {summary.pillarCount}
          </p>
        </div>

        <div className="rounded-xl border border-warning/10 bg-warning/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/60">
            Stress Test
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-warning sm:text-xl">
            {summary.latestStressTestAvailable ? "Saved" : "Pending"}
          </p>
        </div>
      </div>

      <section className="rounded-surface border border-primary/20 bg-primary/5 p-surface">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Brand Promise</h2>
            <p className="mt-0.5 text-xs text-toned">
              The line the whole team can repeat without improvising.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={isStressTesting}
            onClick={runStressTest}
          >
            {isStressTesting ? <Loader2 className="animate-spin" /> : <Sparkles />}
            AI Stress-Test
          </Button>
        </div>

        <Textarea
          value={block.brandPromise}
          rows={3}
          className="rounded-xl bg-background text-lg leading-relaxed font-semibold tracking-tight"
          placeholder="What is the single promise this brand owns?"
          onChange={(event) =>
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== "message-house") {
                return;
              }
              entry.brandPromise = event.target.value.slice(0, 4000);
            })
          }
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {block.pillars.map((pillar) => (
          <article
            key={pillar.id}
            className="rounded-surface border border-muted bg-background p-surface"
          >
            <div className="mb-3">
              <Label
                htmlFor={`pillar-title-${pillar.id}`}
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
              >
                Pillar
              </Label>
              <Input
                id={`pillar-title-${pillar.id}`}
                value={pillar.title}
                placeholder="Pillar title"
                className="border-0 bg-transparent px-0 text-base font-semibold tracking-tight uppercase shadow-none focus-visible:ring-0"
                onChange={(event) =>
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== "message-house") {
                      return;
                    }
                    const target = entry.pillars.find((candidate) => candidate.id === pillar.id);
                    if (!target) {
                      return;
                    }
                    target.title = event.target.value.slice(0, 80);
                  })
                }
              />
            </div>

            <Label
              htmlFor={`pillar-body-${pillar.id}`}
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
            >
              Message
            </Label>
            <Textarea
              id={`pillar-body-${pillar.id}`}
              value={pillar.body}
              rows={5}
              className="rounded-xl bg-background leading-relaxed"
              placeholder="What repeatable message should this pillar carry?"
              onChange={(event) =>
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== "message-house") {
                    return;
                  }
                  const target = entry.pillars.find((candidate) => candidate.id === pillar.id);
                  if (!target) {
                    return;
                  }
                  target.body = event.target.value.slice(0, 2000);
                })
              }
            />
          </article>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bottomSections.map((section) => (
          <article
            key={section.key}
            className="rounded-surface border border-muted bg-background p-surface"
          >
            <Label
              htmlFor={section.key}
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-toned"
            >
              {section.label}
            </Label>
            <Textarea
              id={section.key}
              value={block[section.key]}
              rows={5}
              className="rounded-xl bg-background leading-relaxed"
              placeholder={section.placeholder}
              onChange={(event) =>
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== "message-house") {
                    return;
                  }
                  entry[section.key] = event.target.value.slice(0, 4000);
                })
              }
            />
          </article>
        ))}
      </div>

      <section className="rounded-surface border border-warning/20 bg-warning/5 p-surface">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Stress-Test Output
            </h2>
            <p className="mt-0.5 text-xs text-toned">Finds gaps, contradictions, and weak proof.</p>
          </div>

          {block.stressTestUpdatedAt ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-toned">
              Last run {formatDateTime(block.stressTestUpdatedAt)}
            </p>
          ) : null}
        </div>

        <div className="min-h-[80px] rounded-surface border border-muted bg-background p-surface text-sm leading-relaxed text-toned">
          {block.latestStressTest ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-toned"
              dangerouslySetInnerHTML={{
                __html: renderSimpleMarkdown(block.latestStressTest),
              }}
            />
          ) : (
            <p className="text-sm text-toned">
              Run AI Stress-Test to get a critique of the messaging.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
