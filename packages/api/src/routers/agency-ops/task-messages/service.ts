import { ORPCError } from "@orpc/server";
import { db } from "@orch/db";
import {
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsTaskAttachment,
  agencyOpsTaskMessage,
  user,
} from "@orch/db/schema";
import { getTaskAttachmentReadUrl, parseTaskAttachmentUploadToken } from "@orch/api/storage";
import { createWorkspaceId } from "@orch/workspace";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";

import { notifyTaskMessage } from "../../notifications/fanout";
import { listTeamMemberUserIds } from "../../notifications/service";
import { requireAgencyRole } from "../shared/membership";
import { formatAvatarUrl } from "../shared/avatar-helpers";
import { loadTaskAssignees } from "../shared/task-helpers";
import { publishAgencyTaskMessageCreated } from "../live/live";
import { canPostTaskMessage } from "./task-message-authz";
import type { AgencyTaskMessage, ListTaskMessagesInput, SendTaskMessageInput } from "./schemas";

function encodeCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`;
}

function parseCursor(cursor: string): { createdAt: Date; id: string } | null {
  const sep = cursor.indexOf("|");
  if (sep <= 0) return null;
  const createdAt = new Date(cursor.slice(0, sep));
  const id = cursor.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

async function mapAttachments(messageIds: string[]) {
  const byMessage = new Map<
    string,
    Array<{
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      url: string | null;
    }>
  >();
  if (messageIds.length === 0) return byMessage;

  const rows = await db
    .select({
      id: agencyOpsTaskAttachment.id,
      messageId: agencyOpsTaskAttachment.messageId,
      fileName: agencyOpsTaskAttachment.fileName,
      mimeType: agencyOpsTaskAttachment.mimeType,
      sizeBytes: agencyOpsTaskAttachment.sizeBytes,
      storageKey: agencyOpsTaskAttachment.storageKey,
    })
    .from(agencyOpsTaskAttachment)
    .where(inArray(agencyOpsTaskAttachment.messageId, messageIds));

  for (const row of rows) {
    const list = byMessage.get(row.messageId) ?? [];
    list.push({
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      url: await getTaskAttachmentReadUrl(row.storageKey),
    });
    byMessage.set(row.messageId, list);
  }
  return byMessage;
}

async function toMessageRecords(
  rows: Array<{
    id: string;
    teamId: string;
    taskId: string;
    userId: string;
    userName: string | null;
    userAvatar: string | null;
    content: string;
    createdAt: Date;
  }>,
): Promise<AgencyTaskMessage[]> {
  const attachmentsByMessage = await mapAttachments(rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    teamId: row.teamId,
    taskId: row.taskId,
    userId: row.userId,
    userName: row.userName ?? "Unknown",
    userAvatar: formatAvatarUrl(row.userAvatar),
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    attachments: attachmentsByMessage.get(row.id) ?? [],
  }));
}

export async function listAgencyTaskMessages(actorUserId: string, input: ListTaskMessagesInput) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const [task] = await db
    .select({
      id: agencyOpsProjectTask.id,
      assignedToTeam: agencyOpsProjectTask.assignedToTeam,
    })
    .from(agencyOpsProjectTask)
    .where(
      and(eq(agencyOpsProjectTask.id, input.taskId), eq(agencyOpsProjectTask.teamId, input.teamId)),
    )
    .limit(1);

  if (!task) throw new ORPCError("NOT_FOUND", { message: "Task was not found." });

  const assignees = (await loadTaskAssignees([task.id])).get(task.id) ?? [];
  const canPost = canPostTaskMessage({
    assignedToTeam: task.assignedToTeam,
    assigneeUserIds: assignees.map((item) => item.userId),
    actorUserId,
  });

  const cursor = input.cursor ? parseCursor(input.cursor) : null;
  if (input.cursor && !cursor) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor." });
  }

  const filters = [
    eq(agencyOpsTaskMessage.teamId, input.teamId),
    eq(agencyOpsTaskMessage.taskId, input.taskId),
  ];
  if (cursor) {
    filters.push(
      or(
        lt(agencyOpsTaskMessage.createdAt, cursor.createdAt),
        and(
          eq(agencyOpsTaskMessage.createdAt, cursor.createdAt),
          lt(agencyOpsTaskMessage.id, cursor.id),
        ),
      )!,
    );
  }

  const rowsDesc = await db
    .select({
      id: agencyOpsTaskMessage.id,
      teamId: agencyOpsTaskMessage.teamId,
      taskId: agencyOpsTaskMessage.taskId,
      userId: agencyOpsTaskMessage.userId,
      userName: user.name,
      userAvatar: user.image,
      content: agencyOpsTaskMessage.content,
      createdAt: agencyOpsTaskMessage.createdAt,
    })
    .from(agencyOpsTaskMessage)
    .innerJoin(user, eq(user.id, agencyOpsTaskMessage.userId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsTaskMessage.createdAt), desc(agencyOpsTaskMessage.id))
    .limit(input.pageSize + 1);

  const hasMore = rowsDesc.length > input.pageSize;
  const pageDesc = hasMore ? rowsDesc.slice(0, input.pageSize) : rowsDesc;
  const pageAsc = [...pageDesc].reverse();
  const items = await toMessageRecords(pageAsc);
  const oldest = pageDesc[pageDesc.length - 1];
  const nextCursor = hasMore && oldest ? encodeCursor(oldest.createdAt, oldest.id) : null;

  return { items, nextCursor, canPost };
}

export async function sendAgencyTaskMessage(actorUserId: string, input: SendTaskMessageInput) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const [task] = await db
    .select({
      id: agencyOpsProjectTask.id,
      title: agencyOpsProjectTask.title,
      projectId: agencyOpsProjectTask.projectId,
      assignedToTeam: agencyOpsProjectTask.assignedToTeam,
      projectName: agencyOpsProject.name,
    })
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .where(
      and(eq(agencyOpsProjectTask.id, input.taskId), eq(agencyOpsProjectTask.teamId, input.teamId)),
    )
    .limit(1);

  if (!task) throw new ORPCError("NOT_FOUND", { message: "Task was not found." });

  const assignees = (await loadTaskAssignees([task.id])).get(task.id) ?? [];
  if (
    !canPostTaskMessage({
      assignedToTeam: task.assignedToTeam,
      assigneeUserIds: assignees.map((item) => item.userId),
      actorUserId,
    })
  ) {
    throw new ORPCError("FORBIDDEN", { message: "Only assignees can post." });
  }

  const content = input.content.trim();
  const tokens = input.attachmentUploadTokens ?? [];
  if (!content && tokens.length === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Message is empty." });
  }

  const attachmentsMeta = tokens.map((token) => {
    const payload = parseTaskAttachmentUploadToken(token);
    if (!payload || payload.teamId !== input.teamId || payload.taskId !== input.taskId) {
      throw new ORPCError("BAD_REQUEST", { message: "Invalid attachment upload." });
    }
    if (!payload.storageKey.startsWith(`task-attachments/${input.teamId}/${input.taskId}/`)) {
      throw new ORPCError("BAD_REQUEST", { message: "Invalid attachment storage key." });
    }
    return payload;
  });

  const messageId = createWorkspaceId("agency-task-msg");
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsTaskMessage).values({
      id: messageId,
      teamId: input.teamId,
      taskId: input.taskId,
      userId: actorUserId,
      content,
      createdAt: now,
      updatedAt: now,
    });

    if (attachmentsMeta.length > 0) {
      await tx.insert(agencyOpsTaskAttachment).values(
        attachmentsMeta.map((meta) => ({
          id: createWorkspaceId("agency-task-att"),
          teamId: input.teamId,
          messageId,
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          storageKey: meta.storageKey,
          sizeBytes: meta.sizeBytes,
          createdAt: now,
        })),
      );
    }
  });

  const [author] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);

  const message = (
    await toMessageRecords([
      {
        id: messageId,
        teamId: input.teamId,
        taskId: input.taskId,
        userId: actorUserId,
        userName: author?.name ?? null,
        userAvatar: author?.image ?? null,
        content,
        createdAt: now,
      },
    ])
  )[0]!;

  await publishAgencyTaskMessageCreated(input.teamId, message);

  const recipientUserIds = task.assignedToTeam
    ? await listTeamMemberUserIds(actorUserId, { teamId: input.teamId })
    : assignees.map((item) => item.userId);

  await notifyTaskMessage({
    teamId: input.teamId,
    actorUserId,
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: task.projectName,
    messageId,
    messagePreview: content.slice(0, 140) || message.attachments[0]?.fileName,
    recipientUserIds,
  });

  return message;
}
