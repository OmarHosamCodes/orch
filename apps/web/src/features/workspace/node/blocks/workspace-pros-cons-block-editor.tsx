import {
  createWorkspaceProsConsItem,
  getProsConsSummary,
  type WorkspaceProsConsBlock,
} from "@orch/workspace";
import { MinusCircle, Plus, PlusCircle, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import {
  ProsConsBalanceBar,
  ProsConsWeightButtons,
} from "@/features/workspace/node/blocks/shared/pros-cons-helpers";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

export function WorkspaceProsConsBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceProsConsBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getProsConsSummary(block), [block]);

  const verdictLabel =
    summary.verdict === "do-it" ? "Do it" : summary.verdict === "dont" ? "Don't" : "Tie";

  function addItem(list: "pros" | "cons") {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      entry[list].push(createWorkspaceProsConsItem({ text: "" }));
    });
  }

  function updateItemText(list: "pros" | "cons", itemId: string, value: string) {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      const target = entry[list].find((candidate) => candidate.id === itemId);
      if (target) {
        target.text = value.slice(0, 240);
      }
    });
  }

  function updateItemWeight(list: "pros" | "cons", itemId: string, weight: number) {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      const target = entry[list].find((candidate) => candidate.id === itemId);
      if (target) {
        target.weight = Math.min(5, Math.max(1, Math.round(weight)));
      }
    });
  }

  function removeItem(list: "pros" | "cons", itemId: string) {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      entry[list] = entry[list].filter((candidate) => candidate.id !== itemId);
    });
  }

  function renderList(list: "pros" | "cons", title: string, placeholder: string) {
    const items = block[list];
    const isPros = list === "pros";
    const addLabel = isPros ? "Add pro" : "Add con";

    return (
      <section className="space-y-3">
        <div
          className={cn("flex items-center gap-2", isPros ? "text-success" : "text-destructive")}
        >
          {isPros ? <PlusCircle className="size-5" /> : <MinusCircle className="size-5" />}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>

        {items.map((item) => (
          <div key={item.id} className="space-y-3 rounded-xl border border-muted p-3">
            <div className="flex items-start gap-3">
              <Input
                value={item.text}
                placeholder={placeholder}
                className="flex-1 border-0 bg-transparent px-0 text-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
                onChange={(event) => updateItemText(list, item.id, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg hover:text-destructive"
                aria-label={`Remove ${list === "pros" ? "pro" : "con"} point`}
                onClick={() => removeItem(list, item.id)}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">Weight</p>
              <ProsConsWeightButtons
                list={list}
                currentWeight={item.weight}
                onWeightChange={(weight) => updateItemWeight(list, item.id, weight)}
              />
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {isPros ? "No pros yet." : "No cons yet."}
          </p>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full px-4"
          aria-label={addLabel}
          onClick={() => addItem(list)}
        >
          <Plus />
          {addLabel}
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">
          {verdictLabel}
          {summary.totalScore !== 0
            ? ` · ${summary.totalScore > 0 ? "+" : ""}${summary.totalScore}`
            : ""}
        </p>
        <ProsConsBalanceBar prosWeight={summary.prosWeight} consWeight={summary.consWeight} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderList("pros", "Pros", "Add a reason in favor...")}
        {renderList("cons", "Cons", "Add a risk or downside...")}
      </div>
    </div>
  );
}
