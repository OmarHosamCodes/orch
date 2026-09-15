import { ListTodo, Loader2, PanelRightOpen } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import type { AgencyTrackerRightPanelViewModel } from "@/features/task-management/hooks/use-agency-tracker-right-panel";
import { AgencyMyTasksEditDialog } from "@/features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog";
import { AgencyTrackerRightPanelHostView } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-host-view";
import { panelHostVariants } from "@/features/task-management/tracker-right-panel/agency-tracker-right-panel-motion";
import type { TrackerRightPanelSurface } from "@/features/task-management/stores/agency-tracker-right-panel";
import {
  agencyMyTasksCountTickClass,
  agencyTaskRailCollapsedClass,
  agencyTaskRailCollapsedWidthClass,
  agencyTaskRailWidthTransitionClass,
  agencyTrackerRightPanelCollapsedLabelClass,
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

function AgencyTrackerRightPanelCollapsedChrome({
  panel,
}: {
  panel: AgencyTrackerRightPanelViewModel;
}) {
  const hasPending = panel.pendingSurfaceIds.size > 0;

  return (
    <div className="flex h-full w-full min-w-0 flex-col" aria-label="My Tasks collapsed">
      <div className="flex h-full w-full min-w-0 flex-col items-center justify-start gap-2 pt-0 pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full"
          aria-label="Open My Tasks"
          onClick={() => panel.onOpenPanel()}
        >
          <PanelRightOpen />
        </Button>
        {panel.openTaskCount > 0 ? (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-semibold text-success tabular-nums"
            aria-label={`${panel.openTaskCount} open tasks`}
          >
            <span key={panel.openTaskCountTickKey} className={agencyMyTasksCountTickClass}>
              {panel.openTaskCount > 99 ? "99+" : panel.openTaskCount}
            </span>
          </div>
        ) : null}
        {hasPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-label="Panel busy" />
        ) : (
          <ListTodo className="size-4 shrink-0 text-muted" aria-hidden />
        )}
        <span className={agencyTrackerRightPanelCollapsedLabelClass}>My Tasks</span>
      </div>
    </div>
  );
}

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
      canAddMyTasks={panel.canAddMyTasks}
      renderSurface={renderSurface}
      onActivate={panel.onActivateSurface}
      onCloseSurface={panel.onCloseSurface}
      onCloseOthers={panel.onCloseOthers}
      onCloseToRight={panel.onCloseToRight}
      onAddMyTasks={panel.onAddMyTasks}
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
        aria-label="Open My Tasks"
        onClick={() => panel.onOpenPanel()}
      >
        <ListTodo />
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
        <SheetTitle className="sr-only">My Tasks</SheetTitle>
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
            : cn(
                agencyTaskRailCollapsedClass,
                agencyTaskRailCollapsedWidthClass,
                "self-stretch overflow-hidden",
              ),
        )}
        variants={panelHostVariants}
        initial={false}
        animate="show"
        layout={false}
        aria-label={panel.isOpen ? "My Tasks panel" : undefined}
      >
        {panel.isOpen ? host : <AgencyTrackerRightPanelCollapsedChrome panel={panel} />}
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
