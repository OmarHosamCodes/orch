import { Plus } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import { AgencyPickerSearch } from "@/features/shared/pickers/agency-picker-shell";

import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import { AgencyTaskChooserClientSection } from "@/features/time-tracking/choosers/agency-task-chooser-client-section";
import { AgencyTaskChooserFavoritesSection } from "@/features/time-tracking/choosers/agency-task-chooser-favorites-section";
import { AgencyTaskChooserProjectRow } from "@/features/time-tracking/choosers/agency-task-chooser-project-row";
import { AgencyTaskChooserTaskRow } from "@/features/time-tracking/choosers/agency-task-chooser-task-row";
import { AgencyTaskCreateDialog } from "@/features/time-tracking/choosers/agency-task-create-dialog";
import { AgencyTaskChooserProjectCreateDialog } from "@/features/time-tracking/choosers/agency-task-chooser-project-create-dialog";
import type { AgencyTaskChooserViewModel } from "@/features/time-tracking/hooks/use-agency-task-chooser";
import type { ChooserProjectGroup } from "@/features/time-tracking/agency-task-chooser-groups";
import {
  chooserCollapseVariants,
  chooserEmptyVariants,
  chooserListContainerVariants,
  chooserListItemVariants,
  chooserTapScale,
} from "@/features/time-tracking/agency-task-chooser-motion";
import {
  taskChooserOptionDomId,
  taskChooserProjectOptionKey,
  taskChooserTaskOptionKey,
} from "@/features/time-tracking/agency-task-chooser-keyboard";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton, SkeletonGroup } from "@/ui/skeleton";
import {
  agencyTaskChooserCreateActionClass,
  agencyTaskChooserCreateActionMutedClass,
  agencyTaskChooserPanelClass,
  agencyTaskChooserTriggerClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskChooserViewProps = {
  view: AgencyTaskChooserViewModel;
};

export function AgencyTaskChooserView({ view }: AgencyTaskChooserViewProps) {
  const {
    value,
    disabled,
    loading,
    placeholder,
    required,
    searchPlaceholder,
    className,
    contentAlign,
    triggerFormat,
    open,
    searchTerm,
    triggerProject,
    selectedTask,
    triggerTaskTitle,
    favorites,
    clientGroups,
    favoriteProjectIds,
    favoriteTaskIds,
    searchInputRef,
    listRef,
    isProjectExpanded,
    isClientExpanded,
    onOpenChange,
    onSearchChange,
    onSearchKeyDown,
    onSelectTask,
    onSelectProject,
    pickProject,
    onToggleProject,
    onToggleClient,
    onToggleProjectFavorite,
    onToggleTaskFavorite,
    highlightSearch,
    bestMatchTaskId,
    activeOptionKey,
    activeOptionDomId,
    createPriority,
    canEditRecords,
    teamId,
    createTaskOpen,
    createTaskProjectId,
    createProjectOpen,
    clients,
    templates,
    onOpenCreateTask,
    onCreateTaskOpenChange,
    onOpenCreateProject,
    onCreateProjectOpenChange,
    onTaskCreated,
    onProjectCreated,
  } = view;

  const createMuted = createPriority === "demoted";
  const createElevated = createPriority === "elevated";

  function renderEmptyPlaceholder() {
    return (
      <span className="min-w-0 truncate text-muted-foreground">
        {placeholder}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
    );
  }

  function renderTriggerLabel() {
    if (loading) {
      return <Skeleton className="h-4 w-28 max-w-full rounded-md" aria-hidden />;
    }
    if (triggerFormat === "task-client") {
      if (triggerProject && triggerTaskTitle) {
        return (
          <AgencyTimeEntryProjectLabel
            format="task-client"
            projectId={triggerProject.id}
            projectName={triggerProject.name}
            clientName={triggerProject.clientName}
            taskTitle={triggerTaskTitle}
            colorHueId={triggerProject.colorHueId}
            projectIconKey={triggerProject.iconKey}
            taskIconKey={selectedTask?.iconKey}
            className="min-w-0"
          />
        );
      }
      if (triggerProject) {
        return (
          <AgencyTimeEntryProjectLabel
            format="project-client"
            projectId={triggerProject.id}
            projectName={triggerProject.name}
            clientName={triggerProject.clientName}
            colorHueId={triggerProject.colorHueId}
            projectIconKey={triggerProject.iconKey}
            className="min-w-0"
          />
        );
      }
      return renderEmptyPlaceholder();
    }
    if (triggerFormat === "project-client") {
      if (triggerProject) {
        return (
          <AgencyTimeEntryProjectLabel
            projectId={triggerProject.id}
            projectName={triggerProject.name}
            clientName={triggerProject.clientName}
            colorHueId={triggerProject.colorHueId}
            projectIconKey={triggerProject.iconKey}
            className="min-w-0"
          />
        );
      }
      return renderEmptyPlaceholder();
    }
    if (triggerTaskTitle) {
      return <span className="min-w-0 truncate">{triggerTaskTitle}</span>;
    }
    return renderEmptyPlaceholder();
  }

  function renderProjectGroup(
    entry: ChooserProjectGroup,
    showClientName: boolean,
    keyScope: string,
  ): ReactNode {
    const expanded = !pickProject && isProjectExpanded(entry.project.id);
    const favorited = favoriteProjectIds.has(entry.project.id) || entry.isFavorite;
    const projectOptionKey = taskChooserProjectOptionKey(keyScope, entry.project.id);
    const isSelectedProject = pickProject && value === entry.project.id;
    return (
      <div key={`${keyScope}-${entry.project.id}`}>
        <AgencyTaskChooserProjectRow
          projectId={entry.project.id}
          projectName={entry.project.name}
          clientName={entry.project.clientName}
          colorHueId={entry.project.colorHueId}
          iconKey={entry.project.iconKey}
          taskCount={entry.tasks.length}
          expanded={expanded}
          favorited={favorited}
          active={activeOptionKey === projectOptionKey || isSelectedProject}
          optionId={taskChooserOptionDomId(projectOptionKey)}
          searchTerm={searchTerm}
          highlightSearch={highlightSearch}
          showClientName={showClientName}
          showCreateTask={!pickProject && canEditRecords}
          createMuted={createMuted}
          pickMode={pickProject}
          onToggle={() => {
            if (pickProject) onSelectProject(entry.project.id);
            else onToggleProject(entry.project.id);
          }}
          onToggleFavorite={() => onToggleProjectFavorite(entry.project.id)}
          onCreateTask={() => onOpenCreateTask(entry.project.id)}
        />
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key={`${keyScope}-${entry.project.id}-tasks`}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={chooserCollapseVariants}
              className="overflow-hidden"
            >
              <div className="space-y-0.5 pb-0.5">
                {entry.tasks.map((task) => {
                  const taskOptionKey = taskChooserTaskOptionKey(keyScope, task.id);
                  return (
                    <AgencyTaskChooserTaskRow
                      key={task.id}
                      taskId={task.id}
                      title={task.title}
                      projectId={entry.project.id}
                      colorHueId={entry.project.colorHueId}
                      iconKey={task.iconKey}
                      selected={task.id === value}
                      bestMatch={Boolean(bestMatchTaskId) && task.id === bestMatchTaskId}
                      active={activeOptionKey === taskOptionKey}
                      optionId={taskChooserOptionDomId(taskOptionKey)}
                      favorited={favoriteTaskIds.has(task.id)}
                      searchTerm={searchTerm}
                      highlightSearch={highlightSearch}
                      onSelect={() => onSelectTask(task.id, task.projectId)}
                      onToggleFavorite={() => onToggleTaskFavorite(task.id)}
                    />
                  );
                })}
                {canEditRecords ? (
                  <div className="flex items-center py-0.5 pl-5">
                    <motion.button
                      type="button"
                      className={cn(
                        createMuted
                          ? agencyTaskChooserCreateActionMutedClass
                          : agencyTaskChooserCreateActionClass,
                        createElevated && "text-sm",
                      )}
                      whileTap={chooserTapScale}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={() => onOpenCreateTask(entry.project.id)}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Create task
                    </motion.button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  const isEmpty = favorites.length === 0 && clientGroups.length === 0;
  const emptyLabel = searchTerm.trim() ? "No matches" : "No projects yet.";
  const hasFavorites = favorites.length > 0;

  return (
    <>
      <div className="inline-flex min-w-0 max-w-full shrink items-center self-center">
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || loading}
              aria-required={required && !(pickProject ? triggerProject : value) ? true : undefined}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(
                agencyTaskChooserTriggerClass,
                triggerFormat === "task-only" ? "gap-2" : "gap-1",
                className,
              )}
            >
              {renderTriggerLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align={contentAlign}
            collisionPadding={12}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              searchInputRef.current?.focus({ preventScroll: true });
            }}
            className={agencyTaskChooserPanelClass}
          >
            <MotionConfig reducedMotion="user">
              <AgencyPickerSearch
                autoFocus
                value={searchTerm}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                inputProps={{
                  ref: searchInputRef,
                  role: "combobox",
                  "aria-expanded": open,
                  "aria-controls": "agency-task-chooser-listbox",
                  "aria-autocomplete": "list",
                  "aria-activedescendant": activeOptionDomId,
                  onKeyDown: onSearchKeyDown,
                }}
              />

              <div
                id="agency-task-chooser-listbox"
                ref={listRef}
                role="listbox"
                aria-label={pickProject ? "Projects" : "Tasks"}
                className="min-h-0 max-h-[min(24rem,60vh)] overflow-y-auto [overflow-anchor:none] px-1.5 py-2"
              >
                {loading ? (
                  <SkeletonGroup className="space-y-1.5 px-1 py-1">
                    {[1, 2, 3, 4, 5].map((rowIndex) => (
                      <Skeleton key={rowIndex} className="h-8 rounded-lg" />
                    ))}
                  </SkeletonGroup>
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    {isEmpty ? (
                      <motion.p
                        key={`empty-${emptyLabel}`}
                        variants={chooserEmptyVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        {emptyLabel}
                      </motion.p>
                    ) : (
                      <motion.div
                        key="chooser-list"
                        className="space-y-2"
                        variants={chooserListContainerVariants}
                        initial="hidden"
                        animate="show"
                      >
                        {hasFavorites ? (
                          <motion.div variants={chooserListItemVariants} custom={0}>
                            <AgencyTaskChooserFavoritesSection>
                              {favorites.map((entry) => renderProjectGroup(entry, true, "fav"))}
                            </AgencyTaskChooserFavoritesSection>
                          </motion.div>
                        ) : null}
                        {clientGroups.map((group, groupIndex) => (
                          <motion.div
                            key={group.clientName}
                            variants={chooserListItemVariants}
                            custom={hasFavorites ? groupIndex + 1 : groupIndex}
                          >
                            <AgencyTaskChooserClientSection
                              clientName={group.clientName}
                              projectCount={group.projects.length}
                              expanded={isClientExpanded(group.clientName)}
                              searchTerm={searchTerm}
                              highlightSearch={highlightSearch}
                              onToggle={() => onToggleClient(group.clientName)}
                            >
                              {group.projects.map((entry) =>
                                renderProjectGroup(entry, false, `client-${group.clientName}`),
                              )}
                            </AgencyTaskChooserClientSection>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              {canEditRecords ? (
                <div className="shrink-0 border-t border-border px-3 py-2.5">
                  <motion.button
                    type="button"
                    className={cn(
                      createMuted
                        ? agencyTaskChooserCreateActionMutedClass
                        : agencyTaskChooserCreateActionClass,
                      "px-1 text-sm",
                      createElevated && "text-primary",
                    )}
                    whileTap={chooserTapScale}
                    onClick={onOpenCreateProject}
                  >
                    <Plus className="size-4" aria-hidden />
                    Create project
                  </motion.button>
                </div>
              ) : null}
            </MotionConfig>
          </PopoverContent>
        </Popover>
      </div>

      {canEditRecords ? (
        <>
          <AgencyTaskCreateDialog
            open={createTaskOpen}
            onOpenChange={onCreateTaskOpenChange}
            teamId={teamId}
            projectId={createTaskProjectId}
            onCreated={onTaskCreated}
          />
          <AgencyTaskChooserProjectCreateDialog
            open={createProjectOpen}
            onOpenChange={onCreateProjectOpenChange}
            teamId={teamId}
            clients={clients}
            templates={templates}
            onCreated={onProjectCreated}
          />
        </>
      ) : null}
    </>
  );
}
