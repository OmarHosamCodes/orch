import { Loader2, PanelRightClose, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useRef, useEffect } from "react";

import {
  panelFastTransition,
  panelTapScale,
} from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-motion";
import { trackerRightPanelSurfaceTitle } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-meta";
import {
  AgencyTrackerRightPanelSurfaceMenuView,
  type AgencyTrackerRightPanelSurfaceMenuItem,
} from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-surface-menu-view";
import type {
  TrackerRightPanelSurface,
  TrackerRightPanelSurfaceKind,
} from "@/features/task-management/stores/agency-tracker-right-panel";
import { agencyTrackerRightPanelTabStripClass } from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type AgencyTrackerRightPanelTabStripProps = {
  surfaces: TrackerRightPanelSurface[];
  activeSurfaceId: string | null;
  pendingSurfaceIds: ReadonlySet<string>;
  surfaceMenuItems: AgencyTrackerRightPanelSurfaceMenuItem[];
  onActivate: (surface: TrackerRightPanelSurface) => void;
  onCloseSurface: (surface: TrackerRightPanelSurface) => void;
  onCloseOthers: (surface: TrackerRightPanelSurface) => void;
  onCloseToRight: (surface: TrackerRightPanelSurface) => void;
  onOpenSurfaceKind: (kind: TrackerRightPanelSurfaceKind) => void;
  onCollapsePanel?: () => void;
};

export function AgencyTrackerRightPanelTabStrip({
  surfaces,
  activeSurfaceId,
  pendingSurfaceIds,
  surfaceMenuItems,
  onActivate,
  onCloseSurface,
  onCloseOthers,
  onCloseToRight,
  onOpenSurfaceKind,
  onCollapsePanel,
}: AgencyTrackerRightPanelTabStripProps) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const canAddAnySurface = surfaceMenuItems.some((item) => !item.disabled);

  useEffect(() => {
    const activeTab = tabListRef.current?.querySelector<HTMLElement>("[data-active-tab='true']");
    activeTab?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeSurfaceId]);

  const handleTabAuxClick = useCallback(
    (event: ReactMouseEvent, surface: TrackerRightPanelSurface) => {
      if (event.button !== 1) return;
      event.preventDefault();
      onCloseSurface(surface);
    },
    [onCloseSurface],
  );

  return (
    <div className={agencyTrackerRightPanelTabStripClass}>
      <div
        ref={tabListRef}
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1.5 py-1"
        role="tablist"
        aria-label="Panel surfaces"
      >
        {surfaces.map((surface, surfaceIndex) => {
          const active = surface.id === activeSurfaceId;
          const pending = pendingSurfaceIds.has(surface.id);
          const title = trackerRightPanelSurfaceTitle(surface);
          return (
            <ContextMenu key={surface.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    "group/tab flex h-7 max-w-44 shrink-0 items-center gap-0.5 rounded-md pr-0.5 pl-2 text-xs font-medium",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <motion.button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active-tab={active ? "true" : "false"}
                    onClick={() => onActivate(surface)}
                    onAuxClick={(event) => handleTabAuxClick(event, surface)}
                    className="min-w-0 flex-1 truncate text-left"
                    whileTap={panelTapScale}
                    transition={panelFastTransition}
                  >
                    <span className="inline-flex max-w-full items-center gap-1 truncate">
                      <span className="truncate">{title}</span>
                      {pending ? (
                        <Loader2 className="size-3 shrink-0 animate-spin text-muted" aria-hidden />
                      ) : null}
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                      active
                        ? "opacity-100"
                        : "opacity-0 group-hover/tab:opacity-100 group-focus-within/tab:opacity-100",
                    )}
                    aria-label={`Close ${title}`}
                    onClick={() => onCloseSurface(surface)}
                    whileTap={panelTapScale}
                    transition={panelFastTransition}
                  >
                    <X className="size-3" strokeWidth={2.5} aria-hidden />
                  </motion.button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-40">
                <ContextMenuItem onClick={() => onCloseSurface(surface)}>Close</ContextMenuItem>
                <ContextMenuItem
                  disabled={surfaces.length <= 1}
                  onClick={() => onCloseOthers(surface)}
                >
                  Close others
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={surfaceIndex >= surfaces.length - 1}
                  onClick={() => onCloseToRight(surface)}
                >
                  Close to the right
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              type="button"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Add panel surface"
              disabled={!canAddAnySurface}
              whileTap={canAddAnySurface ? panelTapScale : undefined}
              transition={panelFastTransition}
            >
              <Plus className="size-3.5" aria-hidden />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48 p-0">
            <AgencyTrackerRightPanelSurfaceMenuView
              items={surfaceMenuItems}
              onOpenSurface={onOpenSurfaceKind}
              showHeader={false}
              className="p-1"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {onCollapsePanel ? (
        <div className="ml-auto flex shrink-0 items-center border-l border-default pl-1 pr-1.5 py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse panel"
            title="Collapse panel"
            onClick={onCollapsePanel}
            className="shrink-0"
          >
            <PanelRightClose />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
