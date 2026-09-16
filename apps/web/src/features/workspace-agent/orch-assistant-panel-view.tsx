import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export type OrchAssistantPanelTab = "chat" | "inbox" | "history";

const TABS: Array<{ id: OrchAssistantPanelTab; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "inbox", label: "Inbox" },
  { id: "history", label: "History" },
];

export function OrchAssistantPanelView({
  tab,
  unreadCount,
  onTabChange,
  children,
  className,
}: {
  tab: OrchAssistantPanelTab;
  unreadCount: number;
  onTabChange: (tab: OrchAssistantPanelTab) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-label="Orch"
      data-slot="orch-assistant-panel"
      className={cn(
        "flex h-[min(70vh,640px)] min-h-0 w-full flex-col overflow-hidden rounded-surface border border-border bg-card shadow-lg",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        {TABS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={tab === item.id ? "secondary" : "ghost"}
            className="h-8 rounded-lg px-2.5 text-xs"
            aria-pressed={tab === item.id}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
            {item.id === "inbox" && unreadCount > 0 ? (
              <span className="ms-1.5 text-[10px] text-chart-2">{unreadCount}</span>
            ) : null}
          </Button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
