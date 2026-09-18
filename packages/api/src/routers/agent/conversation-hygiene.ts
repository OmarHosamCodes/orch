import {
  DASHBOARD_CONVERSATION_COMPACT_LIMIT,
  dashboardConversationCompactResponseSchema,
  dashboardConversationDetailSchema,
  dashboardConversationSummarySchema,
  dashboardConversationUsageSummarySchema,
  normalizeDashboardAgentToolPreset,
  type DashboardConversationSummary,
} from "@orch/agent";
import { db } from "@orch/db";
import { agentRun, dashboardConversation, dashboardConversationMessage } from "@orch/db/schema";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { buildDashboardMessagePreview } from "./conversation-contracts";
import { listInbox } from "./memory-service";
import { findRunningChatRuns } from "./run-service";
import { getDashboardConversation } from "./service";

function conversationIsUnread(row: { lastMessageAt: Date; lastReadAt: Date | null }): boolean {
  if (!row.lastReadAt) return true;
  return row.lastMessageAt.getTime() > row.lastReadAt.getTime();
}

function mapCompactSummary(args: {
  row: typeof dashboardConversation.$inferSelect;
  lastMessagePreview: string | null;
  activeRunId: string | null;
}): DashboardConversationSummary {
  return dashboardConversationSummarySchema.parse({
    id: args.row.id,
    title: args.row.title,
    model: args.row.model,
    toolPreset: normalizeDashboardAgentToolPreset(args.row.toolPreset),
    usageSummary: dashboardConversationUsageSummarySchema.parse(args.row.usageSummary),
    createdAt: args.row.createdAt.toISOString(),
    updatedAt: args.row.updatedAt.toISOString(),
    lastMessageAt: args.row.lastMessageAt.toISOString(),
    lastReadAt: args.row.lastReadAt?.toISOString() ?? null,
    archivedAt: args.row.archivedAt?.toISOString() ?? null,
    lastMessagePreview: args.lastMessagePreview,
    taskId: args.row.taskId ?? null,
    activeRunId: args.activeRunId,
    unread: conversationIsUnread(args.row),
  });
}

async function requireOwnedConversation(actorUserId: string, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.id, conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    )
    .limit(1);

  if (!conversation) {
    throw new ORPCError("NOT_FOUND", { message: "Conversation not found." });
  }

  return conversation;
}

async function previewMapFor(conversationIds: string[]) {
  if (conversationIds.length === 0) return new Map<string, string | null>();
  const rows = await db
    .select({
      conversationId: dashboardConversationMessage.conversationId,
      content: dashboardConversationMessage.content,
    })
    .from(dashboardConversationMessage)
    .where(inArray(dashboardConversationMessage.conversationId, conversationIds))
    .orderBy(desc(dashboardConversationMessage.createdAt), desc(dashboardConversationMessage.id));

  const previewMap = new Map<string, string | null>();
  for (const row of rows) {
    if (previewMap.has(row.conversationId)) continue;
    previewMap.set(row.conversationId, buildDashboardMessagePreview(row.content));
  }
  return previewMap;
}

export async function listCompactDashboardConversations(
  actorUserId: string,
  _input: Record<string, never>,
) {
  const [openRows, runningMap, inbox] = await Promise.all([
    db
      .select()
      .from(dashboardConversation)
      .where(
        and(
          eq(dashboardConversation.userId, actorUserId),
          isNull(dashboardConversation.archivedAt),
        ),
      )
      .orderBy(desc(dashboardConversation.lastMessageAt), desc(dashboardConversation.id))
      .limit(50),
    findRunningChatRuns(actorUserId, {}),
    listInbox(actorUserId, { unreadOnly: true }),
  ]);

  const openById = new Map(openRows.map((row) => [row.id, row]));
  const extraIds = [...runningMap.keys()].filter((id) => !openById.has(id));

  const finishRunIds = inbox.notes
    .filter((note) => note.kind === "finish" && note.runId)
    .map((note) => note.runId as string);

  if (finishRunIds.length > 0) {
    const noteRuns = await db
      .select({ id: agentRun.id, conversationId: agentRun.conversationId })
      .from(agentRun)
      .where(and(eq(agentRun.userId, actorUserId), inArray(agentRun.id, finishRunIds)));
    for (const run of noteRuns) {
      if (!openById.has(run.conversationId)) extraIds.push(run.conversationId);
    }
  }

  const uniqueExtraIds = [...new Set(extraIds)];
  if (uniqueExtraIds.length > 0) {
    const extraRows = await db
      .select()
      .from(dashboardConversation)
      .where(
        and(
          eq(dashboardConversation.userId, actorUserId),
          isNull(dashboardConversation.archivedAt),
          inArray(dashboardConversation.id, uniqueExtraIds),
        ),
      );
    for (const row of extraRows) openById.set(row.id, row);
  }

  const compactRows = [...openById.values()].filter((row) => {
    const running = runningMap.has(row.id);
    return running || conversationIsUnread(row);
  });

  compactRows.sort((left, right) => {
    const byMessage = right.lastMessageAt.getTime() - left.lastMessageAt.getTime();
    if (byMessage !== 0) return byMessage;
    return right.id.localeCompare(left.id);
  });

  const limited = compactRows.slice(0, DASHBOARD_CONVERSATION_COMPACT_LIMIT);
  const previewMap = await previewMapFor(limited.map((row) => row.id));

  return dashboardConversationCompactResponseSchema.parse({
    conversations: limited.map((row) =>
      mapCompactSummary({
        row,
        lastMessagePreview: previewMap.get(row.id) ?? null,
        activeRunId: runningMap.get(row.id)?.runId ?? null,
      }),
    ),
  });
}

export async function settleDashboardConversation(
  actorUserId: string,
  input: { conversationId: string },
) {
  await requireOwnedConversation(actorUserId, input.conversationId);
  const archivedAt = new Date();
  await db
    .update(dashboardConversation)
    .set({ archivedAt, updatedAt: archivedAt })
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    );
  return dashboardConversationDetailSchema.parse(
    await getDashboardConversation(actorUserId, { conversationId: input.conversationId }),
  );
}

export async function unsettleDashboardConversation(
  actorUserId: string,
  input: { conversationId: string },
) {
  await requireOwnedConversation(actorUserId, input.conversationId);
  const updatedAt = new Date();
  await db
    .update(dashboardConversation)
    .set({ archivedAt: null, updatedAt })
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    );
  return dashboardConversationDetailSchema.parse(
    await getDashboardConversation(actorUserId, { conversationId: input.conversationId }),
  );
}

export async function markDashboardConversationRead(
  actorUserId: string,
  input: { conversationId: string },
) {
  await requireOwnedConversation(actorUserId, input.conversationId);
  const lastReadAt = new Date();
  await db
    .update(dashboardConversation)
    .set({ lastReadAt, updatedAt: lastReadAt })
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    );
  return dashboardConversationDetailSchema.parse(
    await getDashboardConversation(actorUserId, { conversationId: input.conversationId }),
  );
}
