import { LayoutPanelLeft } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import type { AgencyTrackerRightPanelViewModel } from "@/features/task-management/hooks/use-agency-tracker-right-panel";
import { AgencyMyTasksEditDialog } from "@/features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog";
import { AgencyTrackerRightPanelCollapsedRailView } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-collapsed-rail-view";
import { AgencyTrackerRightPanelHostView } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-host-view";
import { panelHostVariants } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-motion";
import type { TrackerRightPanelSurface } from "@/features/task-management/stores/agency-tracker-right-panel";
import {
  agencyMyTasksCountTickClass,
  agencyTaskRailCollapsedClass,
  agencyTaskRailCollapsedWidthClass,
  agencyTaskRailWidthTransitionClass,
  agencyTrackerRightPanelInlineClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/ui/sheet";
import { cn } from "@/lib/utils";

type AgencyTrackerRightPanelViewProps = {
  panel: AgencyTrackerRightPanelViewModel;
  renderSurface: (surface: TrackerRightPanelSurface) => ReactNode;
  editProjectLabel: string;
};

export function AgencyTrackerRightPanelView({
  panel,
  renderSurface,
  editProjectLabel,
}: AgencyTrackerRightPanelViewProps) {
  const host = (
    <AgencyTrackerRightPanelHostView
      surfaces={panel.surfaces}
      activeSurfaceId={panel.activeSurfaceId}
      pendingSurfaceIds={panel.pendingSurfaceIds}
      isEmptyOpen={panel.isEmptyOpen}
      surfaceMenuItems={panel.surfaceMenuItems}
      renderSurface={renderSurface}
      onActivate={panel.onActivateSurface}
      onCloseSurface={panel.onCloseSurface}
      onCloseOthers={panel.onCloseOthers}
      onCloseToRight={panel.onCloseToRight}
      onOpenSurfaceKind={panel.onOpenSurfaceKind}
      onCollapsePanel={panel.isOpen ? panel.onCollapsePanel : undefined}
      className="h-full min-h-0"
    />
  );

  const mobileFab =
    !panel.isDocked && !panel.isOpen ? (
      <Button
        type="button"
        size="icon"
        className="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-md"
        aria-label="Open panel"
        onClick={() => panel.onOpenPanel()}
      >
        <LayoutPanelLeft />
        {panel.openTaskCount > 0 ? (
          <span
            key={panel.openTaskCountTickKey}
            className={cn(
              "absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-success text-xs font-semibold text-success-foreground tabular-nums",
              agencyMyTasksCountTickClass,
            )}
          >
            {panel.openTaskCount > 99 ? "99+" : panel.openTaskCount}
          </span>
        ) : null}
      </Button>
    ) : null;

  const sheet = !panel.isDocked ? (
    <Sheet open={panel.sheetOpen} onOpenChange={panel.onSheetOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[min(100vw,24rem)] flex-col p-0 sm:max-w-96"
      >
        <SheetTitle className="sr-only">Tracker panel</SheetTitle>
        {panel.sheetOpen ? host : null}
      </SheetContent>
    </Sheet>
  ) : null;

  const dockedPanel = panel.isDocked ? (
    <MotionConfig reducedMotion="user">
      <motion.aside
        key="tracker-right-panel-docked"
        className={cn(
          agencyTaskRailWidthTransitionClass,
          panel.isOpen
            ? agencyTrackerRightPanelInlineClass
            : cn(agencyTaskRailCollapsedClass, agencyTaskRailCollapsedWidthClass, "self-stretch"),
        )}
        variants={panelHostVariants}
        initial={false}
        animate="show"
        layout={false}
        aria-label={panel.isOpen ? "Tracker panel" : undefined}
      >
        {panel.isOpen ? host : <AgencyTrackerRightPanelCollapsedRailView panel={panel} />}
      </motion.aside>
    </MotionConfig>
  ) : null;

  const editDialog =
    panel.tasksView.editingTask != null ? (
      <AgencyMyTasksEditDialog
        open={panel.tasksView.editingTaskId != null}
        onOpenChange={panel.tasksView.onEditOpenChange}
        teamId={panel.tasksView.teamId}
        task={panel.tasksView.editingTask}
        projectLabel={editProjectLabel}
        members={panel.tasksView.members}
      />
    ) : null;

  return (
    <>
      {dockedPanel}
      {sheet}
      {mobileFab}
      {editDialog}
    </>
  );
}
