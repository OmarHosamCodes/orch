import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";

import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import { toAgencyMemberOption } from "@/features/shared/agency-member-option";
import { useAgencyProjectsQuery } from "@/features/shared/agency-queries";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { buildMyTasksTimeConsumer } from "@/features/task-management/agency-my-tasks-row-meta";
import { useAgencyTaskMessagesInfiniteQuery } from "@/features/task-management/agency-task-messages-query";
import { useAgencyTaskMessagesStore } from "@/features/task-management/stores/agency-task-messages";
import type { AgencyTaskThreadHeaderAssignee } from "@/features/task-management/task-thread/agency-task-thread-header-view";
import {
  composeTaskMessageWithReply,
  contentMentionsOrch,
  ensureOrchMentionInDraft,
} from "@/features/task-management/task-thread/agency-task-thread-message-actions";
import { resolveTaskThreadProjectLabel } from "@/features/task-management/task-thread/agency-task-thread-project-label";
import { buildAgencyTaskThreadTimeline } from "@/features/task-management/task-thread/agency-task-thread-timeline";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
import { useAuthSession } from "@/lib/auth-session";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type UseAgencyTaskThreadOptions = {
  teamId: string;
  taskId: string;
  title: string;
  projectId: string;
  projectName: string | null;
  assignedToTeam: boolean;
  assignees: AgencyTaskThreadHeaderAssignee[];
  onBack: () => void;
};

export function useAgencyTaskThread({
  teamId,
  taskId,
  title: openTitle,
  projectId: openProjectId,
  projectName: openProjectName,
  assignedToTeam: openAssignedToTeam,
  assignees: openAssignees,
  onBack,
}: UseAgencyTaskThreadOptions) {
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const actorUserId = user?.id ?? null;
  const [sendPending, setSendPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [composerContent, setComposerContent] = useState("");
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(openTitle);
  const [titleSaving, setTitleSaving] = useState(false);
  const [assigneeSaving, setAssigneeSaving] = useState(false);
  const [replyTo, setReplyTo] = useState<AgencyTaskMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateProjectTask = useAgencyOpsStore((s) => s.updateProjectTask);
  const taskPending = useAgencyOpsStore((s) => s.pendingTaskIds.includes(taskId));
  const orchPresenceActive = useWorkspaceAgentStore((s) => s.orchPresence === "thread");

  const messagesQuery = useAgencyTaskMessagesInfiniteQuery(teamId, taskId);
  const projectsQuery = useAgencyProjectsQuery(teamId);
  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const membersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const cachedTask = useMemo(
    () => findProjectTaskInCache(teamId, taskId),
    // ponytail: pending flag re-reads query cache after optimistic/server patches
    [teamId, taskId, messagesQuery.dataUpdatedAt, taskPending],
  );

  const title = cachedTask?.title ?? openTitle;
  const projectId = cachedTask?.projectId ?? openProjectId;
  const resolvedProject = useMemo(
    () => (projectsQuery.data?.items ?? []).find((project) => project.id === projectId) ?? null,
    [projectId, projectsQuery.data?.items],
  );
  const projectLabel = resolveTaskThreadProjectLabel({
    title,
    projectName: resolvedProject?.name ?? openProjectName,
    clientName: resolvedProject?.clientName,
  });
  const assignedToTeam = cachedTask?.assignedToTeam ?? openAssignedToTeam;
  const assignees = useMemo(() => {
    if (cachedTask) {
      if (cachedTask.assignedToTeam) return [];
      return cachedTask.assignees.map((assignee) => ({
        userId: assignee.userId,
        userName: assignee.userName,
        userAvatar: assignee.userAvatar,
      }));
    }
    return openAssignees;
  }, [cachedTask, openAssignees]);

  const assigneeUserIds = useMemo(() => assignees.map((a) => a.userId), [assignees]);

  const members = useMemo(() => {
    const items = (membersQuery.data?.items ?? []).map(toAgencyMemberOption);
    if (!actorUserId || !user) return items;
    if (items.some((m) => m.userId === actorUserId)) return items;
    return [{ userId: actorUserId, userName: user.name, userAvatar: user.image ?? null }, ...items];
  }, [actorUserId, membersQuery.data?.items, user]);

  const teamRole = teamQuery.data?.role;
  const canPost = messagesQuery.data?.pages[0]?.canPost ?? false;
  const canEdit = canPost || teamRole === "editor" || teamRole === "owner";

  const timeConsumer = useMemo(
    () =>
      buildMyTasksTimeConsumer({
        totalTrackedSeconds: cachedTask?.totalTrackedSeconds,
        estimateMinutes: cachedTask?.estimateMinutes,
      }),
    [cachedTask?.estimateMinutes, cachedTask?.totalTrackedSeconds],
  );

  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages;
    return pages?.length
      ? pages
          .slice()
          .reverse()
          .flatMap((page) => page.items)
      : [];
  }, [messagesQuery.data?.pages]);

  const timeline = useMemo(() => buildAgencyTaskThreadTimeline(messages), [messages]);
  const orchMentioned = contentMentionsOrch(composerContent);

  function onMentionOrch(message: AgencyTaskMessage) {
    if (!canPost) return;
    setReplyTo(message);
    setComposerContent((prev) => ensureOrchMentionInDraft(prev));
    requestAnimationFrame(() => {
      const el = composerTextareaRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
  }

  function onReply(message: AgencyTaskMessage) {
    if (!canPost) return;
    setReplyTo(message);
    requestAnimationFrame(() => {
      const el = composerTextareaRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
  }

  function onBeginTitleEdit() {
    if (!canEdit || titleSaving) return;
    setTitleDraft(title);
    setTitleEditing(true);
  }

  function onTitleCancel() {
    setTitleEditing(false);
    setTitleDraft(title);
  }

  async function onTitleCommit() {
    if (!titleEditing || titleSaving) return;
    const next = titleDraft.trim();
    if (!next || next === title) {
      setTitleEditing(false);
      setTitleDraft(title);
      return;
    }
    setTitleSaving(true);
    setErrorMessage(null);
    try {
      await updateProjectTask({ teamId, taskId, title: next });
      setTitleEditing(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Couldn't update title."));
      setTitleDraft(title);
      setTitleEditing(false);
    } finally {
      setTitleSaving(false);
    }
  }

  async function persistAssignees(next: { assignedToTeam: boolean; assigneeUserIds: string[] }) {
    if (!canEdit || assigneeSaving) return;
    setAssigneeSaving(true);
    setErrorMessage(null);
    try {
      await updateProjectTask({
        teamId,
        taskId,
        assignedToTeam: next.assignedToTeam,
        assigneeUserIds: next.assignedToTeam ? [] : next.assigneeUserIds,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Couldn't update assignees."));
    } finally {
      setAssigneeSaving(false);
    }
  }

  function onAssignedToTeamChange(nextAssignedToTeam: boolean) {
    void persistAssignees({
      assignedToTeam: nextAssignedToTeam,
      assigneeUserIds: nextAssignedToTeam ? [] : assigneeUserIds,
    });
  }

  function onAssigneeUserIdsChange(userIds: string[]) {
    void persistAssignees({
      assignedToTeam: false,
      assigneeUserIds: userIds,
    });
  }

  function onShowDetails() {
    if (!projectId) return;
    void navigate({
      to: "/agency/projects/$projectId",
      params: { projectId },
      search: { focusTask: taskId },
    });
  }

  async function onSend() {
    if (!actorUserId || !user) return;
    const trimmed = composerContent.trim();
    if ((!trimmed && composerFiles.length === 0) || sendPending) return;
    const files = composerFiles;
    const replyTarget = replyTo;
    const content = replyTarget
      ? composeTaskMessageWithReply({ content: trimmed, replyTo: replyTarget })
      : trimmed;
    setComposerContent("");
    setComposerFiles([]);
    setReplyTo(null);
    setSendPending(true);
    setErrorMessage(null);
    try {
      await useAgencyTaskMessagesStore.getState().sendMessage({
        teamId,
        taskId,
        content,
        files,
        actor: {
          userId: actorUserId,
          userName: user.name,
          userAvatar: user.image ?? null,
        },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSendPending(false);
    }
  }

  return {
    title,
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
    hasOlder: Boolean(messagesQuery.hasNextPage),
    isFetchingOlder: messagesQuery.isFetchingNextPage,
    errorMessage:
      errorMessage ?? (messagesQuery.isError ? getErrorMessage(messagesQuery.error) : null),
    onBack,
    onShowDetails,
    onBeginTitleEdit,
    onTitleDraftChange: setTitleDraft,
    onTitleCommit: () => {
      void onTitleCommit();
    },
    onTitleCancel,
    onAssignedToTeamChange,
    onAssigneeUserIdsChange,
    onComposerContentChange: setComposerContent,
    onComposerPickFiles: (files: File[]) => {
      setComposerFiles((prev) => [...prev, ...files].slice(0, 10));
    },
    onComposerClearFiles: () => setComposerFiles([]),
    onClearReply: () => setReplyTo(null),
    onToggleOrchMention: () => {
      setComposerContent((prev) =>
        contentMentionsOrch(prev)
          ? prev.replace(/(^|[\s([{])@orch\b/gi, "$1").replace(/[ \t]{2,}/g, " ")
          : ensureOrchMentionInDraft(prev),
      );
      useWorkspaceAgentStore.getState().setExpanded(true);
    },
    onLoadOlder: () => {
      if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
      void messagesQuery.fetchNextPage();
    },
    onMentionOrch,
    onReply,
    onSend,
  };
}
