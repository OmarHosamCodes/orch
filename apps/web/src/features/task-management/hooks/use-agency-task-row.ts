import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import type {
  AgencyProjectTask,
  AgencyTaskProject,
  TaskStatus,
} from "@/features/task-management/agency-work";
import { isTaskOverdue } from "@/features/task-management/agency-task-utils";
import { isJourneyMilestoneTask } from "@/features/projects/agency-task-journey";
import type { TaskTrackingState } from "@/features/time-tracking/task-tracking-state";

const STACK_AVATAR_LIMIT = 4;

export type AgencyTaskRowProps = {
  task: AgencyProjectTask;
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  readOnly?: boolean;
  highlight?: boolean;
  isRowPending: boolean;
  onSelect: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  blueprintId?: string | null;
  blueprintDescription?: string;
  showAllAssignees?: boolean;
  nested?: boolean;
  trackingState?: TaskTrackingState;
  onBlueprintDescriptionChange?: (value: string) => void;
  onTrackerDescriptionChange?: (value: string) => void;
  onAssociateTrackerForDescription?: (task: AgencyProjectTask) => void;
};

export type RenderAgencyTaskRow = (props: AgencyTaskRowProps) => ReactNode;

function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useAgencyTaskRow(props: AgencyTaskRowProps) {
  const {
    task,
    projects,
    selectedTaskId,
    readOnly = false,
    highlight = false,
    onSelectProject,
    onStatusChange,
    onReopenToActive,
    onDelete,
    blueprintId = null,
    blueprintDescription = "",
    showAllAssignees = false,
    nested = false,
    trackingState,
    onBlueprintDescriptionChange,
    onTrackerDescriptionChange,
    onAssociateTrackerForDescription,
  } = props;
  const [editingDescription, setEditingDescription] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const project = projects.find((item) => item.id === task.projectId);
  const projectName = project?.name ?? "Project";
  const projectColorHueId = project?.colorHueId ?? null;
  const isSelected = task.id === selectedTaskId;
  const completionCount = task.viewerCompletionCount ?? 0;
  const isDone = readOnly || task.viewerStatus === "done";
  const overdue = isTaskOverdue(task.dueDate);
  const dueLabel = task.dueDate ? formatDueDate(task.dueDate) : "";
  const journeyMilestone = isJourneyMilestoneTask(task);
  const showCompletionMultiplier = readOnly && completionCount >= 1;
  const showAssigneeStack = showAllAssignees || journeyMilestone;
  const assigneeStack = task.assignees.slice(0, STACK_AVATAR_LIMIT);
  const assigneeOverflow = task.assignees.length - assigneeStack.length;
  const inlineAssigneeStack = nested && showAssigneeStack && task.assignees.length > 0;
  const canDelete = !readOnly && Boolean(onDelete) && !journeyMilestone;
  const canEditBlueprint = Boolean(blueprintId && onBlueprintDescriptionChange && !readOnly);
  const canEditTracker = Boolean(!readOnly && onTrackerDescriptionChange);
  const descriptionInputValue = canEditBlueprint
    ? blueprintDescription
    : (trackingState?.trackerDescription ?? "");
  const hasDescription = Boolean(descriptionInputValue.trim());
  const showDescriptionInput = editingDescription && !readOnly;
  const showDescriptionRow = readOnly
    ? Boolean(blueprintDescription.trim())
    : hasDescription || showDescriptionInput;
  const showSecondaryMeta =
    !readOnly &&
    (Boolean(dueLabel) ||
      (showAssigneeStack && task.assignees.length > 0 && !inlineAssigneeStack) ||
      (!nested && Boolean(onSelectProject)));
  const isSingleLineRow = !showDescriptionRow && !showSecondaryMeta;
  const showDescriptionTrigger = !readOnly && !hasDescription && !showDescriptionInput;

  useEffect(() => {
    if (editingDescription) {
      descriptionInputRef.current?.focus();
    }
  }, [editingDescription]);

  function beginDescriptionEdit() {
    if (!canEditBlueprint) {
      onAssociateTrackerForDescription?.(task);
    }
    setEditingDescription(true);
  }

  function handleDescriptionChange(value: string) {
    if (canEditBlueprint) {
      onBlueprintDescriptionChange?.(value);
      return;
    }
    if (canEditTracker) {
      onTrackerDescriptionChange?.(value);
    }
  }

  function handleDescriptionKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (event.key === "Escape") {
      setEditingDescription(false);
      event.currentTarget.blur();
    }
  }

  function handleBeginDescriptionEdit(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    beginDescriptionEdit();
  }

  function handleDescriptionDisplayClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!canEditBlueprint && !canEditTracker) return;
    beginDescriptionEdit();
  }

  return {
    ...props,
    readOnly,
    highlight,
    blueprintId,
    blueprintDescription,
    showAllAssignees,
    nested,
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
    onBeginDescriptionEdit: handleBeginDescriptionEdit,
    onDeleteTask: (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onDelete?.(task);
    },
    onReopenTask: (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onReopenToActive?.(task);
    },
    onSelectTask: () => props.onSelect(task.id),
    onMarkDone: () => onStatusChange?.(task, "done"),
    onSelectTaskProject: () => onSelectProject?.(task.projectId),
    onDescriptionChange: handleDescriptionChange,
    onDescriptionKeyDown: handleDescriptionKeyDown,
    onDescriptionBlur: () => setEditingDescription(false),
    onDescriptionDisplayClick: handleDescriptionDisplayClick,
  };
}

export type AgencyTaskRowViewModel = ReturnType<typeof useAgencyTaskRow>;
