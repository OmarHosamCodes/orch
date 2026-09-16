import { Check, MoreVertical } from "lucide-react";
import { motion, type Variants } from "motion/react";
import type { ReactNode, KeyboardEvent } from "react";

import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyMyTasksCheckPopClass,
  agencyMyTasksCreateFlashClass,
  agencyMyTasksRailRowClass,
  agencyMyTasksRailRowDoneClass,
  agencyMyTasksRailRowSelectedClass,
  agencyMyTasksRailRowTrackingClass,
  agencyMyTasksRailRowTrackingPulseClass,
  agencyTaskRowCheckboxCheckedClass,
  agencyTaskRowCheckboxClass,
  agencyTaskRowCompleteClass,
} from "@/features/shared/agency-ui";
import type {
  MyTasksAssignerDisplay,
  MyTasksTimeConsumerDisplay,
} from "@/features/task-management/agency-my-tasks-row-meta";
import {
  railLayoutTransition,
  railRowStateTransition,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AgencyMyTasksRailRowViewProps = {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  colorHueId?: number | null;
  iconKey?: string | null;
  assigner: MyTasksAssignerDisplay;
  timeConsumer: MyTasksTimeConsumerDisplay | null;
  isDone: boolean;
  isSelected: boolean;
  isThreadOpen: boolean;
  isTracking: boolean;
  playPulse: boolean;
  completeFlash: boolean;
  createFlash: boolean;
  pending: boolean;
  miniTimer: ReactNode;
  onSelect: () => void;
  onOpenThread: () => void;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlayEnter: () => void;
  variants: Variants;
  stagger: number;
};

export function AgencyMyTasksRailRowView({
  taskId,
  title,
  projectId,
  projectName,
  colorHueId,
  iconKey,
  assigner,
  timeConsumer,
  isDone,
  isSelected,
  isThreadOpen,
  isTracking,
  playPulse,
  completeFlash,
  createFlash,
  pending,
  miniTimer,
  onSelect,
  onOpenThread,
  onToggleComplete,
  onEdit,
  onDelete,
  onPlayEnter,
  variants,
  stagger,
}: AgencyMyTasksRailRowViewProps) {
  return (
    <motion.li
      layout
      layoutDependency={isDone}
      variants={variants}
      custom={stagger}
      initial="hidden"
      animate="show"
      exit="exit"
      transition={railLayoutTransition}
      data-task-id={taskId}
      tabIndex={0}
      aria-selected={isSelected}
      className={cn(
        agencyMyTasksRailRowClass,
        "group/row",
        isDone && agencyMyTasksRailRowDoneClass,
        isSelected && agencyMyTasksRailRowSelectedClass,
        isThreadOpen && "bg-muted ring-1 ring-inset ring-border",
        isTracking && agencyMyTasksRailRowTrackingClass,
        playPulse && agencyMyTasksRailRowTrackingPulseClass,
        completeFlash && agencyTaskRowCompleteClass,
        createFlash && agencyMyTasksCreateFlashClass,
        pending && "opacity-60",
      )}
      onClick={onSelect}
      onKeyDown={(event: KeyboardEvent<HTMLLIElement>) => {
        if (event.key !== "Enter") return;
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onSelect();
        onPlayEnter();
      }}
    >
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={isDone ? `Reopen ${title}` : `Mark ${title} done`}
        disabled={pending}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md",
          "transition-colors hover:bg-default/80",
        )}
        animate={{ scale: completeFlash ? 1.08 : 1 }}
        transition={railRowStateTransition}
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete();
        }}
      >
        <motion.span
          layout
          className={cn(
            agencyTaskRowCheckboxClass,
            isDone && agencyTaskRowCheckboxCheckedClass,
            completeFlash && agencyMyTasksCheckPopClass,
          )}
          aria-hidden
          initial={false}
          animate={{
            scale: isDone ? 1 : 0.92,
            opacity: isDone ? 1 : 0.85,
          }}
          transition={railRowStateTransition}
        >
          {isDone ? <Check className="size-2" strokeWidth={3} /> : null}
        </motion.span>
      </motion.button>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <AgencyEntityMark
            name={title}
            projectId={projectId}
            iconKey={iconKey}
            colorHueId={colorHueId}
          />
          <motion.button
            type="button"
            className={cn(
              "min-w-0 max-w-full truncate text-left text-sm font-medium text-foreground",
              "cursor-pointer underline-offset-2 hover:underline hover:text-highlighted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
            )}
            aria-expanded={isThreadOpen}
            aria-label={`Open thread for ${title}`}
            initial={false}
            animate={{
              opacity: isDone ? 0.65 : 1,
              x: isDone ? 2 : 0,
            }}
            transition={railRowStateTransition}
            style={{
              textDecorationLine: isDone ? "line-through" : undefined,
              textDecorationColor:
                "color-mix(in oklch, var(--color-muted-foreground) 80%, transparent)",
            }}
            onClick={(event) => {
              event.stopPropagation();
              onOpenThread();
            }}
          >
            {title}
          </motion.button>
        </div>
        <motion.div
          className="mt-0.5 truncate text-xs text-muted"
          initial={false}
          animate={{ opacity: isDone ? 0.55 : 1 }}
          transition={railRowStateTransition}
        >
          <span className="inline-flex min-w-0 items-center gap-1">
            <MyTasksAssignerCluster assigner={assigner} />
            <span className="min-w-0 truncate">· {projectName}</span>
            {timeConsumer ? (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1",
                  timeConsumer.overdue ? "text-error" : "text-muted",
                )}
                aria-label={timeConsumer.ariaLabel}
              >
                <span aria-hidden>·</span>
                <span
                  className="relative h-1 w-8 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      timeConsumer.overdue ? "bg-error" : "bg-primary",
                    )}
                    style={{ width: `${Math.round(timeConsumer.ratio * 100)}%` }}
                  />
                </span>
                <span className="font-mono tabular-nums">
                  {timeConsumer.trackedLabel}/{timeConsumer.estimateLabel}
                </span>
              </span>
            ) : null}
          </span>
        </motion.div>
      </div>

      <div
        className={cn(
          "flex items-center gap-0.5 opacity-0 transition-opacity",
          "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          (isSelected || isTracking) && "opacity-100",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {miniTimer}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`More actions for ${title}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={pending} onClick={onEdit}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" disabled={pending} onClick={onDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  );
}

function myTasksAssignerAriaLabel(assigner: MyTasksAssignerDisplay): string {
  switch (assigner.kind) {
    case "me":
      return "Assigned by me";
    case "member":
      return `Assigned by ${assigner.userName}`;
    default: {
      const _exhaustive: never = assigner;
      return _exhaustive;
    }
  }
}

function myTasksAssignerContent(assigner: MyTasksAssignerDisplay): ReactNode {
  switch (assigner.kind) {
    case "me":
      return <span className="shrink-0">me</span>;
    case "member":
      return (
        <span className="inline-flex shrink-0 items-center">
          <AgencyMemberAvatar
            name={assigner.userName}
            userId={assigner.userId}
            avatarUrl={assigner.userAvatar}
            size="sm"
            className="size-3.5 rounded-full"
            alt=""
          />
        </span>
      );
    default: {
      const _exhaustive: never = assigner;
      return _exhaustive;
    }
  }
}

function MyTasksAssignerCluster({ assigner }: { assigner: MyTasksAssignerDisplay }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1"
      aria-label={myTasksAssignerAriaLabel(assigner)}
    >
      <span>Assigned by</span>
      {myTasksAssignerContent(assigner)}
    </span>
  );
}
