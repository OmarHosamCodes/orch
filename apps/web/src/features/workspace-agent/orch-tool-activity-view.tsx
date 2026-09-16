import { Check, Loader2 } from "lucide-react";

import { toolActivityLabel } from "@/features/workspace-agent/thinking-activity-view";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";

type OrchToolActivityItem = {
  id: string;
  name: string;
  status: "completed" | "error" | "in_progress";
  detail: string | null;
};

type OrchToolActivityViewProps = {
  items: OrchToolActivityItem[];
};

export function OrchToolActivityView({ items }: OrchToolActivityViewProps) {
  if (items.length === 0) return null;
  return (
    <ol className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {item.status === "in_progress" ? (
              <Loader2 className="size-3 animate-spin text-[#5b5bd6]" aria-hidden />
            ) : (
              <Check
                className={cn(
                  "size-3",
                  item.status === "error" ? "text-destructive" : "text-muted-foreground",
                )}
              />
            )}
            <span>{toolActivityLabel(item.name)}</span>
          </div>
          {item.detail ? (
            <Collapsible>
              <CollapsibleTrigger className="mt-0.5 ps-4 text-[11px] text-muted-foreground/80 hover:text-foreground">
                Inspect
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  {item.detail}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
