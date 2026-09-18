import { Check, Clock, CornerDownLeft, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import type { AgencyTaskRowViewModel } from "@/features/task-management/hooks/use-agency-task-row";
import { Input } from "@/ui/input";
import {
  agencyAvatarStackRingClass,
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyTaskRowCheckboxCheckedClass,
  agencyTaskRowCheckboxClass,
  agencyTaskRowCompleteClass,
  agencyTaskRowClass,
  agencyTaskRowContentClass,
  agencyTaskRowDoneClass,
  agencyTaskRowNestedContentClass,
  agencyTaskRowNeedsDescriptionClass,
  agencyTaskRowProjectPillClass,
  agencyTaskRowSelectedClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskRowCheckboxProps = {
  title: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

function AgencyTaskRowCheckbox({
  title,
  checked,
  disabled = false,
  onToggle,
}: AgencyTaskRowCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `${title} is done` : `Mark ${title} done`}
      disabled={disabled}
      className={cn(
        agencyTaskRowCheckboxClass,
        checked && agencyTaskRowCheckboxCheckedClass,
        disabled && "cursor-not-allowed opacity-50",
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (!checked) onToggle();
      }}
    >
      {checked ? <Check className="size-2" strokeWidth={3} aria-hidden /> : null}
    </button>
  );
}

type AgencyTaskRowViewProps = {
  viewModel: AgencyTaskRowViewModel;
  miniTimer: ReactNode;
};

export function AgencyTaskRowView({ viewModel, miniTimer }: AgencyTaskRowViewProps) {
  const {
    task,
    readOnly,
    highlight,
    isRowPending,
    onSelectProject,
    onReopenToActive,
    nested,
    trackingState,
    projectName,
    projectColorHueId,
    isSelected,
    completionCount,
    isDone,
    overdue,
    dueLabel,
    showCompletionMultiplier,
    showAssigneeStack,
    assigneeStack,
    assigneeOverflow,
    inlineAssigneeStack,
    canDelete,
    canEditBlueprint,
    canEditTracker,
    descriptionInputRef,
    descriptionInputValue,
    showDescriptionInput,
    showDescriptionRow,
    showSecondaryMeta,
    isSingleLineRow,
    showDescriptionTrigger,
    onBeginDescriptionEdit,
    onDeleteTask,
    onReopenTask,
    onSelectTask,
    onMarkDone,
    onSelectTaskProject,
    onDescriptionChange,
    onDescriptionKeyDown,
    onDescriptionBlur,
    onDescriptionDisplayClick,
  } = viewModel;
  const alignRowCenter = isSingleLineRow;

  const rowActions = (
    <div className="pointer-events-auto flex shrink-0 items-center gap-1">
      {showDescriptionTrigger ? (
        <button
          type="button"
          aria-label={`Add note for ${task.title}`}
          disabled={isRowPending}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted",
            "opacity-0 transition-[opacity,colors] group-hover/task-row:opacity-100 group-focus-within/task-row:opacity-100",
            isSelected && "opacity-100",
            "hover:bg-default hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            isRowPending && "cursor-not-allowed opacity-50",
          )}
          onClick={onBeginDescriptionEdit}
        >
          <CornerDownLeft className="size-3.5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          disabled={isRowPending}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted",
            "opacity-0 transition-[opacity,colors] group-hover/task-row:opacity-100 group-focus-within/task-row:opacity-100",
            isSelected && "opacity-100",
            "hover:bg-default hover:text-error",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            isRowPending && "cursor-not-allowed opacity-50",
          )}
          onClick={onDeleteTask}
        >
          <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      {showCompletionMultiplier ? (
        <span
          className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-1.5 text-[10px] font-semibold leading-none text-muted"
          aria-label={`Completed ${completionCount} times`}
        >
          ×{completionCount}
        </span>
      ) : null}
      {readOnly && onReopenToActive ? (
        <button
          type="button"
          aria-label={`Add ${task.title} to open tasks`}
          disabled={isRowPending}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted",
            "transition-colors hover:bg-default hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            isRowPending && "cursor-not-allowed opacity-50",
          )}
          onClick={onReopenTask}
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
      {!readOnly ? miniTimer : null}
    </div>
  );

  const rowSurface = (
    <div
      className={cn(
        nested ? agencyTaskRowNestedContentClass : agencyTaskRowContentClass,
        "items-center",
        isSelected && "ring-1 ring-inset ring-primary/30",
      )}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 z-0 rounded-none",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        aria-current={isSelected ? "true" : undefined}
        aria-label={`Open thread for ${task.title}`}
        onClick={onSelectTask}
      />

      <div className="pointer-events-none relative z-10 flex w-full min-w-0 items-center gap-1.5">
        <div className={cn("pointer-events-auto shrink-0", !alignRowCenter && "self-start")}>
          <AgencyTaskRowCheckbox
            title={task.title}
            checked={isDone}
            disabled={isRowPending || readOnly}
            onToggle={onMarkDone}
          />
        </div>

        <div
          className={cn(
            "min-w-0 flex-1",
            !isSingleLineRow && cn("flex flex-col", nested ? "gap-0.5" : "gap-1.5"),
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <AgencyEntityMark
              name={task.title}
              projectId={task.projectId}
              iconKey={task.iconKey}
              colorHueId={projectColorHueId}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm leading-tight",
                nested ? "font-medium" : "font-semibold",
                readOnly ? "text-muted line-through decoration-muted/50" : "text-highlighted",
              )}
            >
              {task.title}
            </span>
            {inlineAssigneeStack ? (
              <span className="inline-flex shrink-0 items-center">
                {assigneeStack.map((member, index) => (
                  <span
                    key={member.userId}
                    className={cn("relative", index > 0 && "-ml-1.5")}
                    style={{ zIndex: index + 1 }}
                  >
                    <AgencyMemberAvatar
                      name={member.userName}
                      userId={member.userId}
                      avatarUrl={member.userAvatar}
                      size="sm"
                      className={cn("size-5 rounded-full", agencyAvatarStackRingClass)}
                    />
                  </span>
                ))}
                {assigneeOverflow > 0 ? (
                  <span
                    className={cn(
                      "relative z-10 -ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                      "bg-muted text-[9px] font-bold text-foreground",
                      agencyAvatarStackRingClass,
                    )}
                    aria-hidden
                  >
                    +{assigneeOverflow}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          {showSecondaryMeta ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {onSelectProject && !nested ? (
                <button
                  type="button"
                  className={cn(
                    agencyTaskRowProjectPillClass,
                    agencyFocusRingClass,
                    "pointer-events-auto motion-reduce:transition-none",
                  )}
                  onClick={onSelectTaskProject}
                >
                  <span className="truncate">{projectName}</span>
                </button>
              ) : !nested ? (
                <span className={cn(agencyTaskRowProjectPillClass, "truncate")}>{projectName}</span>
              ) : null}

              {dueLabel ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px]",
                    overdue ? "text-error" : "text-muted",
                  )}
                >
                  <Clock className="size-3 shrink-0" aria-hidden />
                  <span className="font-mono tabular-nums">{overdue ? "Overdue" : dueLabel}</span>
                </span>
              ) : null}

              {showAssigneeStack && task.assignees.length > 0 ? (
                <span className="inline-flex shrink-0 items-center">
                  {assigneeStack.map((member, index) => (
                    <span
                      key={member.userId}
                      className={cn("relative", index > 0 && "-ml-1.5")}
                      style={{ zIndex: index + 1 }}
                    >
                      <AgencyMemberAvatar
                        name={member.userName}
                        userId={member.userId}
                        avatarUrl={member.userAvatar}
                        size="sm"
                        className={cn("rounded-full", agencyAvatarStackRingClass)}
                      />
                    </span>
                  ))}
                  {assigneeOverflow > 0 ? (
                    <span
                      className={cn(
                        "relative z-10 -ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        "bg-muted text-[9px] font-bold text-foreground",
                        agencyAvatarStackRingClass,
                      )}
                      aria-hidden
                    >
                      +{assigneeOverflow}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          ) : null}

          {showDescriptionRow ? (
            <div className="pointer-events-auto min-w-0">
              {showDescriptionInput ? (
                <Input
                  ref={descriptionInputRef}
                  value={descriptionInputValue}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={onDescriptionKeyDown}
                  onBlur={onDescriptionBlur}
                  placeholder="What are you working on?"
                  className={cn(
                    "h-6 min-w-0 border-0 bg-transparent px-0 text-[11px] leading-tight shadow-none focus-visible:ring-0",
                    agencyInputPlaceholderClass,
                    trackingState?.needsDescription ? "text-warning" : "text-muted",
                  )}
                  aria-label="Task note"
                />
              ) : descriptionInputValue.trim() ? (
                readOnly ? (
                  <span className="block truncate text-[11px] leading-tight text-muted/80">
                    {descriptionInputValue}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "block w-full truncate text-left text-[11px] leading-tight text-muted",
                      (canEditBlueprint || canEditTracker) && "hover:text-highlighted",
                      agencyFocusRingClass,
                    )}
                    onClick={onDescriptionDisplayClick}
                  >
                    {descriptionInputValue}
                  </button>
                )
              ) : null}
            </div>
          ) : null}
        </div>

        {rowActions}
      </div>
    </div>
  );

  return (
    <li
      data-task-id={viewModel.task.id}
      className={cn(
        "group/task-row",
        agencyTaskRowClass,
        isSelected && agencyTaskRowSelectedClass,
        readOnly && agencyTaskRowDoneClass,
        highlight && agencyTaskRowCompleteClass,
        trackingState?.needsDescription && !readOnly && agencyTaskRowNeedsDescriptionClass,
      )}
    >
      {rowSurface}
    </li>
  );
}
