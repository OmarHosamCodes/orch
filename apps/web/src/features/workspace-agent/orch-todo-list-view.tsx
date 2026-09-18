import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

type OrchTodoItem = {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "completed";
};

type OrchTodoListViewProps = {
  items: OrchTodoItem[];
};

export function OrchTodoListView({ items }: OrchTodoListViewProps) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-0.5 rounded-[14.4px] border border-border px-2.5 py-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-xs">
          {item.status === "completed" ? (
            <Check className="mt-0.5 size-3 text-muted-foreground" aria-hidden />
          ) : (
            <Circle className="mt-0.5 size-3 text-muted-foreground" />
          )}
          <span className={cn(item.status === "completed" && "text-muted-foreground line-through")}>
            {item.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
