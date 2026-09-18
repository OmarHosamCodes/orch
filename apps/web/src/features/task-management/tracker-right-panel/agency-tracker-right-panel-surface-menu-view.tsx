import { Coffee, ListTodo } from "lucide-react";
import type { ReactNode } from "react";

import type { TrackerRightPanelSurfaceKind } from "@/features/task-management/stores/agency-tracker-right-panel";
import { cn } from "@/lib/utils";

export type AgencyTrackerRightPanelSurfaceMenuItem = {
  kind: TrackerRightPanelSurfaceKind;
  label: string;
  shortcut: string;
  icon: ReactNode;
  disabled: boolean;
};

export type AgencyTrackerRightPanelSurfaceMenuViewProps = {
  items: AgencyTrackerRightPanelSurfaceMenuItem[];
  onOpenSurface: (kind: TrackerRightPanelSurfaceKind) => void;
  className?: string;
  showHeader?: boolean;
};

const SURFACE_MENU_ITEMS: Omit<AgencyTrackerRightPanelSurfaceMenuItem, "disabled">[] = [
  {
    kind: "my-tasks",
    label: "My Tasks",
    shortcut: "T",
    icon: <ListTodo className="size-4 shrink-0" strokeWidth={2} aria-hidden />,
  },
  {
    kind: "break",
    label: "Break",
    shortcut: "B",
    icon: <Coffee className="size-4 shrink-0" strokeWidth={2} aria-hidden />,
  },
];

export function buildSurfaceMenuItems(
  canOpen: (kind: TrackerRightPanelSurfaceKind) => boolean,
): AgencyTrackerRightPanelSurfaceMenuItem[] {
  return SURFACE_MENU_ITEMS.map((item) => ({
    ...item,
    disabled: !canOpen(item.kind),
  }));
}

export function AgencyTrackerRightPanelSurfaceMenuView({
  items,
  onOpenSurface,
  className,
  showHeader = true,
}: AgencyTrackerRightPanelSurfaceMenuViewProps) {
  return (
    <div className={cn("flex flex-col gap-1 p-3", className)}>
      {showHeader ? (
        <p className="px-2 pb-1 text-xs font-medium text-muted">Open a surface</p>
      ) : null}
      <ul className="flex flex-col gap-0.5" role="menu">
        {items.map((item) => (
          <li key={item.kind} role="none">
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => onOpenSurface(item.kind)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium text-foreground",
                "hover:bg-accent disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              {item.icon}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <kbd className="rounded border border-default bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted">
                {item.shortcut}
              </kbd>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
