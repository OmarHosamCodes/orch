import type { ReactNode, RefObject } from "react";

import type { AgencyEntityIconKey } from "@orch/api/routers/agency-ops/shared/entity-icon-catalog";
import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";

import type { AgencyMemberOption } from "@/features/shared/agency-member-option";
import type { MyTasksTimeConsumerDisplay } from "@/features/task-management/agency-my-tasks-row-meta";
import { AgencyTaskThreadComposerView } from "@/features/task-management/task-thread/agency-task-thread-composer-view";
import {
  AgencyTaskThreadHeaderView,
  type AgencyTaskThreadHeaderAssignee,
} from "@/features/task-management/task-thread/agency-task-thread-header-view";
import { AgencyTaskThreadMessageListView } from "@/features/task-management/task-thread/agency-task-thread-message-list-view";
import type { AgencyTaskThreadTimelineItem } from "@/features/task-management/task-thread/agency-task-thread-timeline";

type AgencyTaskThreadViewProps = {
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
  timeline: AgencyTaskThreadTimelineItem[];
  actorUserId: string | null;
  canPost: boolean;
  sendPending: boolean;
  composerContent: string;
  composerFiles: File[];
  replyTo: AgencyTaskMessage | null;
  orchMentioned: boolean;
  orchPresenceActive: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  composerTextareaRef: RefObject<HTMLTextAreaElement | null>;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onShowDetails: () => void;
  onBeginTitleEdit: () => void;
  onTitleDraftChange: (value: string) => void;
  onTitleCommit: () => void;
  onTitleCancel: () => void;
  onAssignedToTeamChange: (assignedToTeam: boolean) => void;
  onAssigneeUserIdsChange: (userIds: string[]) => void;
  onChangeIcon: (iconKey: AgencyEntityIconKey | null) => void;
  onLoadOlder: () => void;
  onComposerContentChange: (value: string) => void;
  onComposerPickFiles: (files: File[]) => void;
  onComposerClearFiles: () => void;
  onClearReply: () => void;
  onToggleOrchMention: () => void;
  onMentionOrch: (message: AgencyTaskMessage) => void;
  onReply: (message: AgencyTaskMessage) => void;
  onSend: () => void;
  miniTimer?: ReactNode;
};

export function AgencyTaskThreadView({
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
  timeline,
  actorUserId,
  canPost,
  sendPending,
  composerContent,
  composerFiles,
  replyTo,
  orchMentioned,
  orchPresenceActive,
  fileInputRef,
  composerTextareaRef,
  hasOlder,
  isFetchingOlder,
  errorMessage,
  onBack,
  onShowDetails,
  onBeginTitleEdit,
  onTitleDraftChange,
  onTitleCommit,
  onTitleCancel,
  onAssignedToTeamChange,
  onAssigneeUserIdsChange,
  onChangeIcon,
  onLoadOlder,
  onComposerContentChange,
  onComposerPickFiles,
  onComposerClearFiles,
  onClearReply,
  onToggleOrchMention,
  onMentionOrch,
  onReply,
  onSend,
  miniTimer,
}: AgencyTaskThreadViewProps) {
  return (
    <div
      role="region"
      aria-label={`Task thread: ${title}`}
      className="flex h-full min-h-0 flex-col bg-card"
    >
      <AgencyTaskThreadHeaderView
        title={title}
        projectId={projectId}
        colorHueId={colorHueId}
        iconKey={iconKey}
        projectLabel={projectLabel}
        assignedToTeam={assignedToTeam}
        assignees={assignees}
        canEdit={canEdit}
        titleEditing={titleEditing}
        titleDraft={titleDraft}
        titleSaving={titleSaving}
        members={members}
        assigneeUserIds={assigneeUserIds}
        assigneeSaving={assigneeSaving}
        timeConsumer={timeConsumer}
        onBack={onBack}
        onShowDetails={onShowDetails}
        onBeginTitleEdit={onBeginTitleEdit}
        onTitleDraftChange={onTitleDraftChange}
        onTitleCommit={onTitleCommit}
        onTitleCancel={onTitleCancel}
        onAssignedToTeamChange={onAssignedToTeamChange}
        onAssigneeUserIdsChange={onAssigneeUserIdsChange}
        onChangeIcon={onChangeIcon}
        miniTimer={miniTimer}
      />

      {errorMessage ? (
        <p className="mx-auto w-full max-w-2xl border-b border-border px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <AgencyTaskThreadMessageListView
        timeline={timeline}
        actorUserId={actorUserId}
        canPost={canPost}
        hasOlder={hasOlder}
        isFetchingOlder={isFetchingOlder}
        onLoadOlder={onLoadOlder}
        onMentionOrch={onMentionOrch}
        onReply={onReply}
      />

      <div className="mx-auto w-full max-w-2xl shrink-0">
        <AgencyTaskThreadComposerView
          canPost={canPost}
          pending={sendPending}
          content={composerContent}
          files={composerFiles}
          replyTo={replyTo}
          orchMentioned={orchMentioned}
          orchPresenceActive={orchPresenceActive}
          fileInputRef={fileInputRef}
          textareaRef={composerTextareaRef}
          onContentChange={onComposerContentChange}
          onPickFiles={onComposerPickFiles}
          onClearFiles={onComposerClearFiles}
          onClearReply={onClearReply}
          onToggleOrchMention={onToggleOrchMention}
          onSend={onSend}
        />
      </div>
    </div>
  );
}
