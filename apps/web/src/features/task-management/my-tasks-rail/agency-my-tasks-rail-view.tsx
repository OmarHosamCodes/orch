import { ListTodo, Loader2, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import type { AgencyMyTasksRailViewModel } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import {
  railEmptyVariants,
  railFastTransition,
  railTapScale,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyMyTasksCountTickClass,
  agencyMyTasksFilterPillActiveClass,
  agencyMyTasksFilterPillClass,
  agencyMyTasksFilterPillClearIconClass,
  agencyMyTasksRailAddButtonClass,
  agencyMyTasksRailComposerChooserClass,
  agencyMyTasksRailComposerFormClass,
  agencyMyTasksRailComposerRowClass,
  agencyTimeTrackerTaskChooserTriggerClass,
  agencyTaskRailClass,
  agencyTaskRailCollapsedClass,
  agencyTaskRailCollapsedWidthClass,
  agencyTaskRailExpandedWidthClass,
  agencyTaskRailWidthTransitionClass,
} from "@/features/shared/agency-ui";
import { AgencyMyTasksEstimatePopover } from "@/features/task-management/my-tasks-rail/agency-my-tasks-estimate-popover";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { ASSIGNEE_STACK_MAX_WIDTH_PX } from "@/features/shared/choosers/agency-member-stack";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { Button } from "@/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/ui/sheet";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

type AgencyMyTasksRailViewProps = {
  view: AgencyMyTasksRailViewModel;
  renderList: () => ReactNode;
};

function FilterPill({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  const actionHint = active ? `Turn off ${label}` : `Show ${label}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          onClick={onToggle}
          aria-pressed={active}
          aria-label={actionHint}
          title={actionHint}
          className={cn(
            "group/pill",
            agencyMyTasksFilterPillClass,
            active && agencyMyTasksFilterPillActiveClass,
          )}
          whileTap={railTapScale}
          transition={railFastTransition}
          layout
        >
          <span>{label}</span>
          {active ? (
            <X className={agencyMyTasksFilterPillClearIconClass} aria-hidden strokeWidth={2.5} />
          ) : null}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {actionHint}
      </TooltipContent>
    </Tooltip>
  );
}

function RailPanel({
  view,
  list,
  className,
  showCollapseControl,
}: {
  view: AgencyMyTasksRailViewModel;
  list: ReactNode;
  className?: string;
  showCollapseControl?: boolean;
}) {
  const canSubmit = Boolean(view.composerTaskId) && !view.isAddingTask;
  const addArmed = Boolean(view.composerTaskId) || view.isAddingTask;

  return (
    <div
      className={cn(agencyTaskRailClass, className)}
      data-od-id="my-tasks-rail"
      aria-label="My Tasks"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-default px-3 py-2.5 sm:px-4">
        <h2 className="min-w-0 text-sm font-semibold tracking-tight text-foreground">My Tasks</h2>
        {showCollapseControl ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse My Tasks"
            onClick={() => view.setCollapsed(true)}
          >
            <PanelRightClose />
          </Button>
        ) : null}
      </header>

      <form
        className={agencyMyTasksRailComposerFormClass}
        aria-label={view.composerFormAriaLabel}
        onSubmit={(event) => {
          event.preventDefault();
          void view.onCreateTask();
        }}
      >
        <div
          className={agencyMyTasksRailComposerChooserClass}
          data-od-id="my-tasks-composer-chooser"
        >
          <AgencyTaskChooser
            teamId={view.teamId}
            value={view.composerTaskId}
            onValueChange={view.onComposerTaskChange}
            projects={view.projects}
            tasks={view.tasks}
            placeholder="Choose task"
            triggerFormat="task-client"
            highlightSearch
            required
            contentAlign="start"
            disabled={view.isAddingTask}
            className={cn(
              agencyTimeTrackerTaskChooserTriggerClass,
              "w-full max-w-none justify-start border border-border",
            )}
          />
        </div>
        <div className={agencyMyTasksRailComposerRowClass}>
          <AgencyMemberChooser
            mode="multiple"
            assignedToTeam={view.assignedToTeam}
            selectedUserIds={view.assigneeUserIds}
            onAssignedToTeamChange={(nextAssignedToTeam) => {
              view.setAssignedToTeam(nextAssignedToTeam);
              if (nextAssignedToTeam) view.setAssigneeUserIds([]);
            }}
            onSelectedUserIdsChange={(nextIds) => {
              view.setAssignedToTeam(false);
              view.setAssigneeUserIds(nextIds);
            }}
            members={view.members}
            placeholder="Assignees"
            triggerVariant="stack"
            stackMaxWidthPx={ASSIGNEE_STACK_MAX_WIDTH_PX}
            contentAlign="start"
            disabled={view.isAddingTask}
            className="min-w-0 shrink"
          />
          <AgencyMyTasksEstimatePopover
            value={view.estimateMinutes}
            disabled={view.isAddingTask}
            onChange={view.setEstimateMinutes}
          />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("min-w-0 flex-1", !addArmed && "cursor-not-allowed")}>
                  <Button
                    type="submit"
                    variant={addArmed ? "default" : "outline"}
                    className={cn(agencyMyTasksRailAddButtonClass, "w-full")}
                    data-od-id="my-tasks-add"
                    data-armed={addArmed ? "true" : "false"}
                    aria-label={
                      addArmed ? view.composerSubmitArmedAriaLabel : "Choose a task to add"
                    }
                    aria-busy={view.isAddingTask}
                    disabled={!canSubmit}
                  >
                    <span>{view.composerSubmitLabel}</span>
                    {view.isAddingTask ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : null}
                  </Button>
                </span>
              </TooltipTrigger>
              {addArmed ? null : (
                <TooltipContent side="top" className="text-xs">
                  Choose a task first
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        {view.createError ? (
          <p className="text-xs text-destructive" role="alert">
            {view.createError}
          </p>
        ) : null}
        {view.composerStatus ? (
          <p className="sr-only" aria-live="polite">
            {view.composerStatus}
          </p>
        ) : null}
      </form>

      <div
        role="group"
        aria-label="Task filters"
        className="flex shrink-0 flex-wrap gap-1.5 border-b border-default px-3 py-2 sm:px-4"
      >
        <TooltipProvider delayDuration={200}>
          <FilterPill
            label="Open"
            active={view.pills.has("open")}
            onToggle={() => view.togglePill("open")}
          />
          <FilterPill
            label="Done"
            active={view.pills.has("done")}
            onToggle={() => view.togglePill("done")}
          />
          <FilterPill
            label="Delegated"
            active={view.pills.has("delegated")}
            onToggle={() => view.togglePill("delegated")}
          />
        </TooltipProvider>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1.5">
        {view.isLoading ? (
          <SurfaceShimmer className="min-h-40 mx-1" label="Loading tasks" />
        ) : view.errorMessage ? (
          <div className={cn(agencyErrorPanelClass, "mx-1 my-2 p-4")} role="alert">
            <p className="text-sm font-medium text-foreground">Tasks did not load</p>
            <p className="mt-1 text-xs text-muted">{view.errorMessage}</p>
            <Button type="button" size="sm" className="mt-3" onClick={view.onRetry}>
              Retry
            </Button>
          </div>
        ) : view.isEmpty ? (
          <motion.div
            className={cn(agencyEmptyPanelClass, "mx-1 my-2 p-5")}
            variants={railEmptyVariants}
            initial="hidden"
            animate="show"
          >
            <ListTodo className="mx-auto size-5 text-muted" aria-hidden />
            <p className="mt-2 text-sm font-medium text-foreground">Nothing in this filter</p>
            <p className="mt-1 text-xs text-muted">
              Add a task above, or turn on Open / Done / Delegated
            </p>
          </motion.div>
        ) : (
          list
        )}
      </div>
    </div>
  );
}

export function AgencyMyTasksRailView({ view, renderList }: AgencyMyTasksRailViewProps) {
  const sheet = (
    <Sheet open={view.sheetOpen} onOpenChange={view.setSheetOpen}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[min(100vw,24rem)] flex-col p-0 sm:max-w-96"
      >
        <SheetTitle className="sr-only">My Tasks</SheetTitle>
        {view.sheetOpen ? (
          <RailPanel
            view={view}
            list={renderList()}
            className="h-full w-full min-w-0 rounded-none border-0 shadow-none"
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );

  const mobileFab = (
    <Button
      type="button"
      size="icon"
      className="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-md"
      aria-label="Open My Tasks"
      onClick={() => view.setSheetOpen(true)}
    >
      <ListTodo />
      {view.openCount > 0 ? (
        <span
          key={view.countTickKey}
          className={cn(
            "absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-success text-xs font-semibold text-success-foreground tabular-nums",
            agencyMyTasksCountTickClass,
          )}
        >
          {view.openCount > 99 ? "99+" : view.openCount}
        </span>
      ) : null}
    </Button>
  );

  const dockedRail = (
    <aside
      className={cn(
        agencyTaskRailWidthTransitionClass,
        view.collapsed
          ? cn(agencyTaskRailCollapsedClass, agencyTaskRailCollapsedWidthClass)
          : cn(agencyTaskRailClass, agencyTaskRailExpandedWidthClass),
      )}
      aria-label={view.collapsed ? "My Tasks collapsed" : undefined}
    >
      {view.collapsed ? (
        <div className="flex h-full w-full min-w-0 flex-col items-center justify-start gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Expand My Tasks"
            onClick={() => view.setCollapsed(false)}
          >
            <PanelRightOpen />
          </Button>
          <div
            className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
            aria-label={`${view.openCount} open tasks`}
          >
            <span
              key={view.countTickKey}
              className={cn("tabular-nums", agencyMyTasksCountTickClass)}
            >
              {view.openCount > 99 ? "99+" : view.openCount}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-full w-full min-w-0">
          <RailPanel
            view={view}
            list={renderList()}
            className="h-full w-full min-w-0 rounded-none border-0 bg-transparent"
            showCollapseControl
          />
        </div>
      )}
    </aside>
  );

  return (
    <MotionConfig reducedMotion="user">
      {view.isDocked ? (
        dockedRail
      ) : (
        <>
          {mobileFab}
          {sheet}
        </>
      )}
    </MotionConfig>
  );
}
