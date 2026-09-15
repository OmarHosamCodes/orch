import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import { AgencyTrackerRightPanelTabStrip } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-tab-strip";
import {
  AgencyTrackerRightPanelSurfaceMenuView,
  type AgencyTrackerRightPanelSurfaceMenuItem,
} from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-surface-menu-view";
import { panelBodyVariants } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-motion";
import type {
  TrackerRightPanelSurface,
  TrackerRightPanelSurfaceKind,
} from "@/features/task-management/stores/agency-tracker-right-panel";
import { agencyTaskRailClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyTrackerRightPanelHostViewProps = {
  surfaces: TrackerRightPanelSurface[];
  activeSurfaceId: string | null;
  pendingSurfaceIds: ReadonlySet<string>;
  isEmptyOpen: boolean;
  surfaceMenuItems: AgencyTrackerRightPanelSurfaceMenuItem[];
  renderSurface: (surface: TrackerRightPanelSurface) => ReactNode;
  onActivate: (surface: TrackerRightPanelSurface) => void;
  onCloseSurface: (surface: TrackerRightPanelSurface) => void;
  onCloseOthers: (surface: TrackerRightPanelSurface) => void;
  onCloseToRight: (surface: TrackerRightPanelSurface) => void;
  onOpenSurfaceKind: (kind: TrackerRightPanelSurfaceKind) => void;
  onCollapsePanel?: () => void;
  className?: string;
};

export function AgencyTrackerRightPanelHostView({
  surfaces,
  activeSurfaceId,
  pendingSurfaceIds,
  isEmptyOpen,
  surfaceMenuItems,
  renderSurface,
  onActivate,
  onCloseSurface,
  onCloseOthers,
  onCloseToRight,
  onOpenSurfaceKind,
  onCollapsePanel,
  className,
}: AgencyTrackerRightPanelHostViewProps) {
  const activeSurface = surfaces.find((surface) => surface.id === activeSurfaceId) ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(agencyTaskRailClass, "h-full min-h-0", className)}
        data-od-id="tracker-right-panel"
        aria-label="Tracker panel"
      >
        <AgencyTrackerRightPanelTabStrip
          surfaces={surfaces}
          activeSurfaceId={activeSurfaceId}
          pendingSurfaceIds={pendingSurfaceIds}
          surfaceMenuItems={surfaceMenuItems}
          onActivate={onActivate}
          onCloseSurface={onCloseSurface}
          onCloseOthers={onCloseOthers}
          onCloseToRight={onCloseToRight}
          onOpenSurfaceKind={onOpenSurfaceKind}
          onCollapsePanel={onCollapsePanel}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden" role="tabpanel">
          {isEmptyOpen ? (
            <AgencyTrackerRightPanelSurfaceMenuView
              items={surfaceMenuItems}
              onOpenSurface={onOpenSurfaceKind}
              className="h-full justify-center"
            />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {activeSurface ? (
                <motion.div
                  key={activeSurface.id}
                  className="absolute inset-0 flex min-h-0 flex-col"
                  variants={panelBodyVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  {renderSurface(activeSurface)}
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
