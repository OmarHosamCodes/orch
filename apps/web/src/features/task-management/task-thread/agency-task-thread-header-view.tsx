import type { KeyboardEvent, ReactNode } from "react";
import { ArrowLeft, Pencil } from "lucide-react";

import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";

import { AgencyEntityIconMarkPickerView } from "@/features/shared/agency-entity-icon-picker-view";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import type { AgencyMemberOption } from "@/features/shared/agency-member-option";
import type { MyTasksTimeConsumerDisplay } from "@/features/task-management/agency-my-tasks-row-meta";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

export type AgencyTaskThreadHeaderAssignee = {
  userId: string;
  userName: string;
  userAvatar: string | null;
};

type AgencyTaskThreadHeaderViewProps = {
  title: string;
  projectId: string;
  colorHueId?: number | null;
  iconKey?: string | null;
  projectLabel: string | null;
  assignedToTeam: boolean;
  assignees: AgencyTaskThreadHeaderAssignee[];
  canEdit: boolean;
  titleEditing: boolean;
  titleDraft: string;
  titleSaving: boolean;
  members: AgencyMemberOption[];
  assigneeUserIds: string[];
  assigneeSaving: boolean;
  timeConsumer: MyTasksTimeConsumerDisplay | null;
  onBack: () => void;
  onShowDetails: () => void;
  onBeginTitleEdit: () => void;
  onTitleDraftChange: (value: string) => void;
  onTitleCommit: () => void;
  onTitleCancel: () => void;
  onAssignedToTeamChange: (assignedToTeam: boolean) => void;
  onAssigneeUserIdsChange: (userIds: string[]) => void;
  onChangeIcon: (iconKey: AgencyEntityIconKey | null) => void;
  miniTimer?: ReactNode;
};

export function AgencyTaskThreadHeaderView({
  title,
  projectId,
  colorHueId,
  iconKey,
  projectLabel,
  assignedToTeam,
  assignees,
  canEdit,
  titleEditing,
  titleDraft,
  titleSaving,
  members,
  assigneeUserIds,
  assigneeSaving,
  timeConsumer,
  onBack,
  onShowDetails,
  onBeginTitleEdit,
  onTitleDraftChange,
  onTitleCommit,
  onTitleCancel,
  onAssignedToTeamChange,
  onAssigneeUserIdsChange,
  onChangeIcon,
  miniTimer,
}: AgencyTaskThreadHeaderViewProps) {
  const showAssignees = assignees.length > 0;
  const showTeam = !showAssignees && assignedToTeam;
  const hasMeta =
    Boolean(projectLabel) || canEdit || showAssignees || showTeam || Boolean(timeConsumer);

  function onTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onTitleCommit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onTitleCancel();
    }
  }

  return (
    <header className="shrink-0 border-b border-border px-2.5 py-2">
      <div className="flex items-start gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          className="mt-0.5 shrink-0"
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="group/title flex min-w-0 items-center gap-1.5">
            <AgencyEntityIconMarkPickerView
              name={titleEditing ? titleDraft : title}
              projectId={projectId}
              iconKey={iconKey}
              colorHueId={colorHueId}
              size="header"
              disabled={!canEdit}
              ariaLabel="Change task icon"
              onChange={onChangeIcon}
            />
            {titleEditing ? (
              <Input
                value={titleDraft}
                onChange={(event) => onTitleDraftChange(event.target.value)}
                onBlur={() => onTitleCommit()}
                onKeyDown={onTitleKeyDown}
                disabled={titleSaving}
                autoFocus
                aria-label="Task title"
                className="h-7 min-w-0 flex-1 border-border bg-background px-2 text-sm font-semibold"
              />
            ) : (
              <>
                <h2 className="min-w-0 truncate text-sm font-semibold leading-snug text-foreground">
                  {title}
                </h2>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Edit title"
                    className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/title:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
                    onClick={onBeginTitleEdit}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {hasMeta ? (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {projectLabel ? (
                <span className="min-w-0 truncate font-medium text-muted-foreground/90">
                  {projectLabel}
                </span>
              ) : null}

              {canEdit ? (
                <AgencyMemberChooser
                  mode="multiple"
                  assignedToTeam={assignedToTeam}
                  selectedUserIds={assigneeUserIds}
                  onAssignedToTeamChange={onAssignedToTeamChange}
                  onSelectedUserIdsChange={onAssigneeUserIdsChange}
                  members={members}
                  placeholder="Assignees"
                  triggerVariant="stack"
                  contentAlign="start"
                  disabled={assigneeSaving}
                  className="shrink-0"
                />
              ) : showAssignees ? (
                <span className="inline-flex shrink-0 items-center -space-x-1">
                  {assignees.slice(0, 4).map((assignee) => (
                    <AgencyMemberAvatar
                      key={assignee.userId}
                      name={assignee.userName}
                      userId={assignee.userId}
                      avatarUrl={assignee.userAvatar}
                      size="sm"
                      className="size-4 rounded-full ring-1 ring-card"
                    />
                  ))}
                  {assignees.length > 4 ? (
                    <span className="pl-1.5 text-[11px]">+{assignees.length - 4}</span>
                  ) : null}
                </span>
              ) : showTeam ? (
                <span className="shrink-0">Team</span>
              ) : null}

              {timeConsumer ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5",
                    timeConsumer.overdue ? "text-destructive" : "text-muted-foreground",
                  )}
                  aria-label={timeConsumer.ariaLabel}
                >
                  {(projectLabel || canEdit || showAssignees || showTeam) && (
                    <span className="text-border" aria-hidden>
                      ·
                    </span>
                  )}
                  <span
                    className="relative h-1 w-9 overflow-hidden rounded-full bg-muted"
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full",
                        timeConsumer.overdue ? "bg-destructive" : "bg-primary",
                      )}
                      style={{ width: `${Math.round(timeConsumer.ratio * 100)}%` }}
                    />
                  </span>
                  <span className="font-mono text-[11px] tabular-nums tracking-tight">
                    {timeConsumer.trackedLabel}/{timeConsumer.estimateLabel}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-0.5 flex shrink-0 items-center gap-1">
          {miniTimer}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onShowDetails}
          >
            Show details
          </Button>
        </div>
      </div>
    </header>
  );
}
