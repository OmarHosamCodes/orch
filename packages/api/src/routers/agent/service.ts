import {
  DASHBOARD_CONVERSATION_HISTORY_LIMIT,
  DASHBOARD_CONVERSATION_MESSAGE_WINDOW,
  DEFAULT_AGENT_MODEL_PRESET,
  agentChatTurnResponseSchema,
  agentChatTurnStreamEventSchema,
  agentToolCatalogResponseSchema,
  artifactFromToolCall,
  buildAgentModelUserContent,
  cappedArtifacts,
  formatMemoryForPrompt,
  modelContentLength,
  dashboardConversationDetailSchema,
  dashboardConversationListResponseSchema,
  dashboardConversationMessageSchema,
  dashboardConversationSummarySchema,
  dashboardConversationUsageSummarySchema,
  listAgentToolCatalog,
  normalizeDashboardAgentToolPreset,
  resolveOpenRouterModelForTurn,
  resolveUnlockedSurfaces,
  runDashboardAgent,
  streamDashboardAgent,
  finalizeAssistantResponseText,
  titleSeedFromAgentTurn,
  type AgencyAgentRuntime,
  type AgentChatTurnInput,
  type AgentChatTurnStreamEvent,
  type AgentModelInputMessage,
  type AgentSurface,
  type AgentTextAttachment,
  type AgentToolCall,
  type AgentToolCallEntry,
  type DashboardAgentWorkspaceContext,
  type AgentToolCatalogInput,
  type AiUiArtifact,
  type CanvasAgentRuntime,
  type DashboardConversationSummary,
  type DashboardConversationUsageLatest,
  type DashboardConversationUsageSummary,
  type MemoryAgentRuntime,
} from "@orch/agent";
import { db } from "@orch/db";
import type { AgencyOpsMemberProfileAlertContext } from "@orch/db/schema";
import {
  dashboardConversation,
  dashboardConversationMessage,
  workspaceTeam,
  workspaceTeamMember,
  type DashboardConversationMessageArtifactRecord,
  type DashboardConversationMessageAttachmentRecord,
  type DashboardConversationMessageContextNodeTitlesRecord,
  type DashboardConversationMessageToolsCalledRecord,
  type DashboardConversationUsageSummaryRecord,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { consumeOrchMessage } from "../../billing-team";
import { listAgencyClients } from "../agency-ops/clients/service";
import { listPeriodMoneyObligations } from "../agency-ops/billing/money-export-service";
import { listAgencyProjects } from "../agency-ops/projects/service";
import { getAgencyReportsSummary } from "../agency-ops/reports/service";
import { listAgencyTags } from "../agency-ops/tags/service";
import { listAgencyProjectTasks } from "../agency-ops/tasks/service";
import { listMemberProfileAlerts } from "../agency-ops/member-profile/member-profile-alert-service";
import { requireAgencyRole } from "../agency-ops/shared/membership";
import {
  getAgencyActiveTimer,
  getAgencyTimeSummary,
  listMyAgencyTimeEntries,
  listMyAgencyTimeEntriesInRange,
} from "../agency-ops/time-tracking/service";
import { carveAgencyTimeGaps } from "../agency-ops/time-tracking/time-gaps";
import { listTeamMembers } from "../team/service";
import {
  getWorkspaceMarketplaceItems,
  getWorkspaceSnapshot,
  saveWorkspaceNodes,
} from "../workspace/service";
import { getKnowledgeObject, queryKnowledgeObjects } from "../workspace/knowledge-service";
import {
  listCanvasWorkspaces,
  requireOwnedCanvasWorkspace,
} from "../workspace/canvas-workspace-service";
import {
  createAgencyProposalRecord,
  applyCanvasForYou,
  applyKnowledgeForYou,
} from "./agency-proposals";
import {
  buildDashboardConversationDeletionResult,
  buildDashboardConversationTitle,
  buildDashboardMessagePreview,
  normalizeDashboardConversationTitle,
} from "./conversation-contracts";
import { getMemoryForPrompt, insertInboxNote, upsertFact } from "./memory-service";
import {
  AGENT_TOKEN_FLUSH_CHARS,
  AGENT_TOKEN_FLUSH_MS,
  agentRunAbortRegistry,
  cancelRun,
  completeAgentRun,
  createTokenCoalescer,
  findRunningChatRun,
  findRunningChatRuns,
  hasRunListener,
  insertAgentRun,
  persistRunStreamEvent,
  scheduleDetachedRun,
  subscribeRun,
} from "./run-service";

async function resolveActorAgencyTeamId(actorUserId: string): Promise<string | null> {
  const [owned] = await db
    .select({ id: workspaceTeam.id })
    .from(workspaceTeam)
    .where(eq(workspaceTeam.createdByUserId, actorUserId))
    .limit(1);
  if (owned) return owned.id;

  const [member] = await db
    .select({ teamId: workspaceTeamMember.teamId })
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.userId, actorUserId))
    .limit(1);

  return member?.teamId ?? null;
}

async function consumeOrchMessageForActor(actorUserId: string, now = new Date()) {
  const teamId = await resolveActorAgencyTeamId(actorUserId);
  if (!teamId) return;
  await consumeOrchMessage(teamId, now);
}

function entryIdsFromMemberAlertContext(context: AgencyOpsMemberProfileAlertContext): string[] {
  const raw = context as AgencyOpsMemberProfileAlertContext & { entryIds?: string[] };
  if (!Array.isArray(raw.entryIds)) return [];
  return raw.entryIds.filter((id) => typeof id === "string" && id.trim().length > 0);
}

function attachmentsFromRow(
  value: DashboardConversationMessageAttachmentRecord[] | null | undefined,
): AgentTextAttachment[] {
  return (value ?? []) as AgentTextAttachment[];
}

function artifactsFromRow(
  value: DashboardConversationMessageArtifactRecord[] | null | undefined,
): AiUiArtifact[] {
  return cappedArtifacts((value ?? []) as AiUiArtifact[]);
}

function artifactsFromToolCalls(toolCalls: AgentToolCallEntry[]): AiUiArtifact[] {
  const artifacts: AiUiArtifact[] = [];
  for (const call of toolCalls) {
    if (typeof call === "string") continue;
    const artifact = artifactFromToolCall(call);
    if (artifact) artifacts.push(artifact);
  }
  return cappedArtifacts(artifacts);
}

function modelUserContent(content: string, attachments: AgentTextAttachment[]) {
  return buildAgentModelUserContent(content, attachments);
}

type AgencyAgentTimeSummaryInput = Parameters<AgencyAgentRuntime["getTimeSummary"]>[0];
type AgencyAgentTimeSummary = Awaited<ReturnType<AgencyAgentRuntime["getTimeSummary"]>>;

export async function getAgencyAgentTimeSummary(
  actorUserId: string,
  input: AgencyAgentTimeSummaryInput & { teamId: string },
): Promise<AgencyAgentTimeSummary> {
  const { teamId } = input;
  const role = await requireAgencyRole(actorUserId, teamId, "viewer");

  if (role !== "viewer") {
    const result = await getAgencyTimeSummary(actorUserId, {
      teamId,
      from: input.from,
      to: input.to,
      memberUserId: input.memberUserId,
      projectId: input.projectId,
      clientId: input.clientId,
    });
    return {
      totalSeconds: result.summary.totalSeconds,
      members: result.summary.teamMembers.map((member) => ({
        userId: member.id,
        name: member.name,
        seconds: member.totalSeconds,
        isTiming: member.isActive,
      })),
    };
  }

  const [listed, activeTimer, members] = await Promise.all([
    listMyAgencyTimeEntriesInRange(actorUserId, {
      teamId,
      from: input.from,
      to: input.to,
    }),
    getAgencyActiveTimer(actorUserId, { teamId }),
    listTeamMembers(actorUserId, { teamId }),
  ]);
  const includesActor = !input.memberUserId || input.memberUserId === actorUserId;
  const entries = includesActor
    ? listed.items.filter(
        (entry) =>
          (!input.projectId || entry.projectId === input.projectId) &&
          (!input.clientId || entry.clientId === input.clientId),
      )
    : [];
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  const actor = members.find((member) => member.userId === actorUserId);

  return {
    totalSeconds,
    members: [
      {
        userId: actorUserId,
        name: actor?.userName ?? "You",
        seconds: totalSeconds,
        isTiming: Boolean(activeTimer.timer),
      },
    ],
  };
}

function createAgencyAgentRuntime(
  actorUserId: string,
  teamId: string,
  conversationId?: string | null,
): AgencyAgentRuntime {
  return {
    teamId,
    listMyTimeEntries: async ({ page, pageSize }) => {
      const result = await listMyAgencyTimeEntries(actorUserId, {
        teamId,
        page,
        pageSize,
      });
      return {
        entries: result.items.map((entry) => ({
          id: entry.id,
          description: entry.description,
          projectName: entry.projectName,
          clientName: entry.clientName,
          durationSeconds: entry.durationSeconds,
          startedAt: entry.startedAt,
          endedAt: entry.endedAt,
          isBillable: entry.isBillable,
        })),
      };
    },
    listProjects: async ({ clientId } = {}) => {
      const result = await listAgencyProjects(actorUserId, {
        teamId,
        ...(clientId ? { clientId } : {}),
      });
      return {
        projects: result.items.map((project) => ({
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          clientName: project.clientName,
        })),
      };
    },
    listMembers: async () => {
      const members = await listTeamMembers(actorUserId, { teamId });
      return {
        members: members.map((member) => ({
          userId: member.userId,
          name: member.userName,
          role: member.role,
        })),
      };
    },
    listClients: async ({ limit } = {}) => {
      const result = await listAgencyClients(actorUserId, { teamId });
      const capped = Math.min(Math.max(limit ?? 50, 1), 200);
      const clients = result.items.slice(0, capped).map((client) => ({
        id: client.id,
        name: client.name,
        category: client.category,
      }));
      return {
        clients,
        truncated: result.items.length > capped,
        total: result.items.length,
      };
    },
    listTags: async () => {
      const result = await listAgencyTags(actorUserId, { teamId });
      return {
        tags: result.items.map((tag) => ({ id: tag.id, name: tag.name })),
      };
    },
    listProjectTasks: async ({ projectId, page, pageSize }) => {
      const result = await listAgencyProjectTasks(actorUserId, {
        teamId,
        projectId,
        page: page ?? 1,
        pageSize: pageSize ?? 25,
      });
      return {
        tasks: result.items.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          projectId: task.projectId,
        })),
        truncated: result.total > result.items.length,
        total: result.total,
      };
    },
    getActiveTimer: async () => {
      const result = await getAgencyActiveTimer(actorUserId, { teamId });
      if (!result.timer) return { timer: null };
      return {
        timer: {
          id: result.timer.id,
          projectId: result.timer.projectId,
          taskId: result.timer.taskId,
          description: result.timer.description,
          startedAt: result.timer.startedAt,
          isBillable: result.timer.isBillable,
        },
      };
    },
    getTimeEntry: async ({ entryId }) => {
      const listed = await listMyAgencyTimeEntries(actorUserId, {
        teamId,
        page: 1,
        pageSize: 100,
      });
      const entry = listed.items.find((item) => item.id === entryId);
      if (!entry) return { entry: null };
      return {
        entry: {
          id: entry.id,
          description: entry.description,
          projectId: entry.projectId,
          projectName: entry.projectName,
          clientName: entry.clientName,
          taskId: entry.taskId,
          durationSeconds: entry.durationSeconds,
          startedAt: entry.startedAt,
          endedAt: entry.endedAt,
          isBillable: entry.isBillable,
          isWaste: entry.isWaste,
        },
      };
    },
    getTimeSummary: async (input) => {
      return getAgencyAgentTimeSummary(actorUserId, { teamId, ...input });
    },
    listTimeGaps: async ({ from, to }) => {
      const fromMs = Date.parse(`${from}T00:00:00.000Z`);
      const toMs = Date.parse(`${to}T00:00:00.000Z`) + 86_400_000;
      const listed = await listMyAgencyTimeEntriesInRange(actorUserId, {
        teamId,
        from,
        to,
      });
      const entries = listed.items.map((entry) => ({
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        projectId: entry.projectId,
        taskId: entry.taskId,
        durationSeconds: entry.durationSeconds,
      }));
      const trackedSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
      const gaps = carveAgencyTimeGaps({ fromMs, toMs, entries });
      const gapSeconds = gaps.reduce((sum, gap) => sum + gap.durationSeconds, 0);
      return {
        from,
        to,
        trackedSeconds,
        gapSeconds,
        gaps,
      };
    },
    getClientBill: async ({ clientId, periodStart, periodEnd }) => {
      const listed = await listPeriodMoneyObligations(actorUserId, {
        teamId,
        periodStart,
        periodEnd,
      });
      const rows = listed.clients.filter((row) => row.clientId === clientId);
      if (rows.length === 0) {
        return {
          clientId,
          clientName: null,
          amount: 0,
          remainingAmount: 0,
          wasteAmount: 0,
          lines: [],
        };
      }
      return {
        clientId,
        clientName: rows[0]!.clientName,
        amount: rows.reduce((sum, row) => sum + row.amount, 0),
        remainingAmount: rows.reduce((sum, row) => sum + row.remainingAmount, 0),
        wasteAmount: rows.reduce((sum, row) => sum + row.wasteAmount, 0),
        lines: rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          isCarry: row.isCarry,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          amount: row.amount,
          remainingAmount: row.remainingAmount,
        })),
      };
    },
    listMemberAlerts: async ({ userId }) => {
      const targetUserId = userId ?? actorUserId;
      const result = await listMemberProfileAlerts(actorUserId, {
        teamId,
        userId: targetUserId,
      });
      return {
        alerts: result.items
          .filter((alert) => alert.status !== "removed")
          .map((alert) => ({
            id: alert.id,
            kind: alert.kind,
            title: alert.title,
            dateKey: alert.context.dateKey ?? null,
            entryIds: entryIdsFromMemberAlertContext(alert.context),
          })),
        canManageAlerts: result.canManageAlerts,
      };
    },
    getReportsSummary: async (input) => {
      const result = await getAgencyReportsSummary(actorUserId, {
        teamId,
        from: input.from,
        to: input.to,
        memberUserId: input.memberUserId,
        projectId: input.projectId,
        clientId: input.clientId,
      });
      return {
        totalSeconds: result.composition.totalSeconds,
        composition: result.composition,
        byClient: result.summary.timeDistributionByClient.map((entry) => ({
          clientId: entry.clientId,
          clientName: entry.clientName,
          seconds: Math.round(entry.hours * 3_600),
        })),
        byProject: result.byProjectDetail,
        byMember: result.byMemberDetail,
      };
    },
    createProposal: async (input) =>
      createAgencyProposalRecord(actorUserId, {
        teamId,
        action: input.action,
        label: input.label,
        conversationId: input.conversationId ?? conversationId,
      }),
  };
}

function createMemoryAgentRuntime(actorUserId: string, sourceRunId?: string): MemoryAgentRuntime {
  return {
    rememberFact: async (input) =>
      upsertFact(actorUserId, {
        key: input.key,
        value: input.value,
        sourceRunId,
      }),
  };
}

function createCanvasAgentRuntime(
  actorUserId: string,
  conversationId: string,
  teamId?: string | null,
  canvasWorkspaceId?: string | null,
): CanvasAgentRuntime {
  return {
    applyCanvasAction: async (input) =>
      applyCanvasForYou(actorUserId, {
        action: input.action,
        label: input.label,
        conversationId: input.conversationId ?? conversationId,
        teamId,
        canvasWorkspaceId,
      }),
    listWorkspaces: async () => {
      const listed = await listCanvasWorkspaces(actorUserId, {});
      return {
        items: listed.items.map((item) => ({
          id: item.id,
          title: item.title,
          instructions: item.instructions,
        })),
      };
    },
    queryKnowledge: async (input) =>
      queryKnowledgeObjects(actorUserId, {
        canvasWorkspaceId: canvasWorkspaceId ?? input.canvasWorkspaceId ?? undefined,
        teamId: input.teamId ?? teamId ?? undefined,
        objectType: input.objectType,
        query: input.query,
        about: input.about,
        limit: input.limit,
      }),
    getKnowledge: async (input) =>
      getKnowledgeObject(actorUserId, {
        id: input.id,
        objectType: input.objectType,
        teamId: input.teamId ?? teamId ?? undefined,
      }),
    applyKnowledgeAction: async (input) =>
      applyKnowledgeForYou(actorUserId, {
        action: input.action,
        label: input.label,
        conversationId: input.conversationId ?? conversationId,
        teamId,
        canvasWorkspaceId,
      }),
  };
}

export function getAgentToolsCatalog(actorUserId: string, input: AgentToolCatalogInput) {
  void actorUserId;
  return agentToolCatalogResponseSchema.parse({
    tools: listAgentToolCatalog({
      surface: input.surface,
      mode: input.mode,
      unlockedSurfaces: input.unlockedSurfaces,
    }),
  });
}
function normalizeConversationUsageSummary(
  usageSummary: DashboardConversationUsageSummaryRecord | null | undefined,
) {
  return dashboardConversationUsageSummarySchema.parse(
    usageSummary ?? {
      latest: null,
      totals: {
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        costUsd: 0,
      },
    },
  );
}

function buildNextConversationUsageSummary(
  currentUsageSummary: DashboardConversationUsageSummaryRecord | null | undefined,
  latestUsage: DashboardConversationUsageLatest | null,
): DashboardConversationUsageSummary {
  const current = normalizeConversationUsageSummary(currentUsageSummary);

  if (!latestUsage) {
    return current;
  }

  return dashboardConversationUsageSummarySchema.parse({
    latest: latestUsage,
    totals: {
      inputTokens: current.totals.inputTokens + latestUsage.inputTokens,
      cachedTokens: current.totals.cachedTokens + latestUsage.cachedTokens,
      outputTokens: current.totals.outputTokens + latestUsage.outputTokens,
      reasoningTokens: current.totals.reasoningTokens + latestUsage.reasoningTokens,
      totalTokens: current.totals.totalTokens + latestUsage.totalTokens,
      costUsd: current.totals.costUsd + (latestUsage.costUsd ?? 0),
    },
  });
}

async function resolveTurnCanvasWorkspaceId(
  actorUserId: string,
  turn: AgentChatTurnInput,
): Promise<string | null> {
  if (!turn.canvasWorkspaceId) return null;
  await requireOwnedCanvasWorkspace(actorUserId, {
    canvasWorkspaceId: turn.canvasWorkspaceId,
  });
  return turn.canvasWorkspaceId;
}

async function loadTurnWorkspaceSnapshot(
  actorUserId: string,
  canvasWorkspaceId: string | null,
  turnNodes: AgentChatTurnInput["nodes"],
) {
  if (turnNodes) {
    return { nodes: turnNodes, updatedAt: null as string | null };
  }
  if (!canvasWorkspaceId) {
    return { nodes: [], updatedAt: null as string | null };
  }
  return getWorkspaceSnapshot(actorUserId, { canvasWorkspaceId });
}

function conversationIsUnread(row: { lastMessageAt: Date; lastReadAt: Date | null }): boolean {
  if (!row.lastReadAt) return true;
  return row.lastMessageAt.getTime() > row.lastReadAt.getTime();
}

function mapConversationSummary(args: {
  row: typeof dashboardConversation.$inferSelect;
  lastMessagePreview: string | null;
  activeRunId?: string | null;
}): DashboardConversationSummary {
  return dashboardConversationSummarySchema.parse({
    id: args.row.id,
    title: args.row.title,
    model: args.row.model,
    toolPreset: normalizeDashboardAgentToolPreset(args.row.toolPreset),
    usageSummary: normalizeConversationUsageSummary(
      args.row.usageSummary as DashboardConversationUsageSummaryRecord | null,
    ),
    createdAt: args.row.createdAt.toISOString(),
    updatedAt: args.row.updatedAt.toISOString(),
    lastMessageAt: args.row.lastMessageAt.toISOString(),
    lastReadAt: args.row.lastReadAt?.toISOString() ?? null,
    archivedAt: args.row.archivedAt?.toISOString() ?? null,
    lastMessagePreview: args.lastMessagePreview,
    taskId: args.row.taskId ?? null,
    activeRunId: args.activeRunId ?? null,
    unread: conversationIsUnread(args.row),
  });
}

function mapConversationMessage(row: typeof dashboardConversationMessage.$inferSelect) {
  return dashboardConversationMessageSchema.parse({
    id: row.id,
    role: row.role,
    content: row.content,
    attachments: attachmentsFromRow(row.attachments),
    contextNodeTitles:
      (row.contextNodeTitles as DashboardConversationMessageContextNodeTitlesRecord | null) ?? [],
    model: row.model,
    toolsCalled: (row.toolsCalled as DashboardConversationMessageToolsCalledRecord | null) ?? [],
    artifacts: artifactsFromRow(row.artifacts),
    createdAt: row.createdAt.toISOString(),
  });
}

async function getConversationRecord(userId: string, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(dashboardConversation)
    .where(
      and(eq(dashboardConversation.id, conversationId), eq(dashboardConversation.userId, userId)),
    )
    .limit(1);

  if (!conversation) {
    throw new ORPCError("NOT_FOUND", {
      message: "Conversation not found.",
    });
  }

  return conversation;
}

async function getConversationPreviewMap(conversationIds: string[]) {
  if (conversationIds.length === 0) {
    return new Map<string, string | null>();
  }

  const rows = await db
    .select({
      conversationId: dashboardConversationMessage.conversationId,
      content: dashboardConversationMessage.content,
      createdAt: dashboardConversationMessage.createdAt,
    })
    .from(dashboardConversationMessage)
    .where(inArray(dashboardConversationMessage.conversationId, conversationIds))
    .orderBy(desc(dashboardConversationMessage.createdAt), desc(dashboardConversationMessage.id));

  const previewMap = new Map<string, string | null>();

  for (const row of rows) {
    if (previewMap.has(row.conversationId)) {
      continue;
    }

    previewMap.set(row.conversationId, buildDashboardMessagePreview(row.content));
  }

  return previewMap;
}

export async function listDashboardConversations(
  actorUserId: string,
  input: { filter?: "open" | "settled"; canvasWorkspaceId?: string | null },
) {
  const filter = input.filter ?? "open";
  const workspaceClause =
    input.canvasWorkspaceId === undefined
      ? undefined
      : input.canvasWorkspaceId === null
        ? isNull(dashboardConversation.canvasWorkspaceId)
        : eq(dashboardConversation.canvasWorkspaceId, input.canvasWorkspaceId);
  const conversations = await db
    .select()
    .from(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.userId, actorUserId),
        filter === "settled"
          ? isNotNull(dashboardConversation.archivedAt)
          : isNull(dashboardConversation.archivedAt),
        workspaceClause,
      ),
    )
    .orderBy(desc(dashboardConversation.updatedAt), desc(dashboardConversation.id))
    .limit(DASHBOARD_CONVERSATION_HISTORY_LIMIT);

  const previewMap = await getConversationPreviewMap(conversations.map((item) => item.id));
  const runningMap = await findRunningChatRuns(actorUserId, {
    conversationIds: conversations.map((item) => item.id),
  });

  return dashboardConversationListResponseSchema.parse({
    conversations: conversations.map((conversation) =>
      mapConversationSummary({
        row: conversation,
        lastMessagePreview: previewMap.get(conversation.id) ?? null,
        activeRunId: runningMap.get(conversation.id)?.runId ?? null,
      }),
    ),
  });
}

export async function getDashboardConversation(
  actorUserId: string,
  input: { conversationId: string },
) {
  const conversation = await getConversationRecord(actorUserId, input.conversationId);
  const messages = await db
    .select()
    .from(dashboardConversationMessage)
    .where(
      and(
        eq(dashboardConversationMessage.conversationId, input.conversationId),
        eq(dashboardConversationMessage.userId, actorUserId),
      ),
    )
    .orderBy(asc(dashboardConversationMessage.createdAt), asc(dashboardConversationMessage.id));

  const running = await findRunningChatRun(actorUserId, {
    conversationId: input.conversationId,
  });
  const detail = dashboardConversationDetailSchema.parse({
    ...mapConversationSummary({
      row: conversation,
      lastMessagePreview: buildDashboardMessagePreview(messages.at(-1)?.content ?? ""),
      activeRunId: running?.runId ?? null,
    }),
    messages: messages.map(mapConversationMessage),
    activeRunId: running?.runId ?? null,
    activeRunLastSeq: running?.lastSeq ?? 0,
  });

  return detail;
}

export async function createDashboardConversation(
  actorUserId: string,
  input: {
    content: string;
    attachments?: AgentTextAttachment[];
    model?: string | null;
    toolPreset: AgentChatTurnInput["toolPreset"];
    taskId?: string | null;
    canvasWorkspaceId?: string | null;
  },
) {
  const now = new Date();
  const conversationId = createWorkspaceId("conversation");

  await db.insert(dashboardConversation).values({
    id: conversationId,
    userId: actorUserId,
    title: buildDashboardConversationTitle(
      titleSeedFromAgentTurn(input.content, input.attachments ?? []),
    ),
    model: input.model?.trim() || null,
    toolPreset: input.toolPreset,
    usageSummary: normalizeConversationUsageSummary(null),
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastReadAt: now,
    archivedAt: null,
    taskId: input.taskId ?? null,
    canvasWorkspaceId: input.canvasWorkspaceId ?? null,
  });

  return getConversationRecord(actorUserId, conversationId);
}

export async function getOrCreateTaskConversation(
  actorUserId: string,
  input: { taskId: string; title?: string },
) {
  const [existing] = await db
    .select()
    .from(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.userId, actorUserId),
        eq(dashboardConversation.taskId, input.taskId),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.archivedAt) {
      await db
        .update(dashboardConversation)
        .set({ archivedAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(dashboardConversation.id, existing.id),
            eq(dashboardConversation.userId, actorUserId),
          ),
        );
    }
    return getDashboardConversation(actorUserId, { conversationId: existing.id });
  }

  const now = new Date();
  const conversationId = createWorkspaceId("conversation");
  await db.insert(dashboardConversation).values({
    id: conversationId,
    userId: actorUserId,
    title: buildDashboardConversationTitle(input.title?.trim() || "Task"),
    model: null,
    toolPreset: "agent",
    usageSummary: normalizeConversationUsageSummary(null),
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastReadAt: now,
    archivedAt: null,
    taskId: input.taskId,
  });

  return getDashboardConversation(actorUserId, { conversationId });
}

export async function renameDashboardConversation(
  actorUserId: string,
  input: { conversationId: string; title: string },
) {
  await getConversationRecord(actorUserId, input.conversationId);
  const now = new Date();

  await db
    .update(dashboardConversation)
    .set({
      title: normalizeDashboardConversationTitle(input.title),
      updatedAt: now,
    })
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    );

  return getDashboardConversation(actorUserId, { conversationId: input.conversationId });
}

export async function deleteDashboardConversation(
  actorUserId: string,
  input: { conversationId: string },
) {
  await getConversationRecord(actorUserId, input.conversationId);

  await db
    .delete(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    );

  return buildDashboardConversationDeletionResult(input.conversationId);
}

export async function appendDashboardConversationTurn(
  actorUserId: string,
  input: { actorUserName: string; turn: AgentChatTurnInput },
) {
  const userId = actorUserId;
  const { actorUserName: userName, turn } = input;
  const surface: AgentSurface = turn.surface ?? "canvas";
  const toolPreset = turn.toolPreset;
  const unlockedSurfaces = resolveUnlockedSurfaces({
    surface,
    unlockedSurfaces: turn.unlockedSurfaces,
    scopeRefs: turn.scopeRefs,
  });
  const needsCanvas = unlockedSurfaces.includes("canvas");

  if (surface === "agency" && !turn.teamId?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Agency agent turns require a teamId.",
    });
  }

  const now = new Date();
  await consumeOrchMessageForActor(userId, now);
  const requestedWorkspaceId = await resolveTurnCanvasWorkspaceId(userId, turn);

  const [fullWorkspaceSnapshot, marketplaceResult] = await Promise.all([
    needsCanvas
      ? loadTurnWorkspaceSnapshot(userId, requestedWorkspaceId, turn.nodes)
      : Promise.resolve({ nodes: [], updatedAt: null as string | null }),
    needsCanvas
      ? getWorkspaceMarketplaceItems(userId, { limit: 200, kind: "all" })
      : Promise.resolve({ items: [] }),
  ]);

  const turnAttachments = turn.attachments ?? [];
  const turnModelContent = modelUserContent(turn.content, turnAttachments);
  const modelPreset = turn.modelPreset ?? DEFAULT_AGENT_MODEL_PRESET;
  const resolvedModel = await resolveOpenRouterModelForTurn({
    preset: modelPreset,
    pinnedModelId: turn.model,
    content: typeof turnModelContent === "string" ? turnModelContent : turn.content,
    signals: {
      contentLength: modelContentLength(turnModelContent),
      scopeCount: turn.scopeRefs?.length ?? turn.scopeNodes?.length ?? 0,
      mentionCount: turn.contextNodeTitles?.length ?? 0,
      toolPreset,
      surface,
    },
  });
  const resolvedModelId = resolvedModel.modelId;

  const conversation = turn.conversationId
    ? await getConversationRecord(userId, turn.conversationId)
    : await createDashboardConversation(userId, {
        content: turn.content,
        attachments: turnAttachments,
        model: resolvedModelId,
        toolPreset,
        canvasWorkspaceId: requestedWorkspaceId,
      });
  const createdConversation = !turn.conversationId;
  const canvasWorkspaceId = requestedWorkspaceId ?? conversation.canvasWorkspaceId ?? null;

  const recentMessagesDesc = await db
    .select()
    .from(dashboardConversationMessage)
    .where(
      and(
        eq(dashboardConversationMessage.conversationId, conversation.id),
        eq(dashboardConversationMessage.userId, userId),
      ),
    )
    .orderBy(desc(dashboardConversationMessage.createdAt), desc(dashboardConversationMessage.id))
    .limit(Math.max(0, DASHBOARD_CONVERSATION_MESSAGE_WINDOW - 1));
  const recentMessages = [...recentMessagesDesc].reverse().map((message) => ({
    role: message.role as "user" | "assistant",
    content:
      message.role === "user"
        ? modelUserContent(message.content, attachmentsFromRow(message.attachments))
        : message.content,
  }));
  const scopeNodes = turn.scopeNodes ?? turn.nodes;
  const agencyRuntime =
    unlockedSurfaces.includes("agency") && turn.teamId
      ? createAgencyAgentRuntime(userId, turn.teamId, conversation.id)
      : null;
  const canvasRuntime = needsCanvas
    ? createCanvasAgentRuntime(userId, conversation.id, turn.teamId, canvasWorkspaceId)
    : null;
  const memoryRuntime = createMemoryAgentRuntime(userId);
  const memoryText = formatMemoryForPrompt(await getMemoryForPrompt(userId, {}));
  const messagesWithMemory: AgentModelInputMessage[] = memoryText
    ? [{ role: "system", content: memoryText }, ...recentMessages]
    : recentMessages;

  const result = await runDashboardAgent(
    [
      ...messagesWithMemory,
      {
        role: "user",
        content: turnModelContent,
      },
    ],
    {
      nodes: fullWorkspaceSnapshot.nodes,
      scopeNodes,
      marketplaceItems: marketplaceResult.items,
      updatedAt: fullWorkspaceSnapshot.updatedAt,
      userName,
      activeTabId: turn.activeTabId,
      surface,
      unlockedSurfaces,
      scopeRefs: turn.scopeRefs,
      teamId: turn.teamId ?? null,
    },
    {
      model: resolvedModelId,
      modelPreset,
      toolPreset,
      agencyRuntime,
      canvasRuntime,
      memoryRuntime,
    },
  );
  const nextUsageSummary = buildNextConversationUsageSummary(
    conversation.usageSummary,
    result.usage,
  );
  const workspaceSnapshot =
    surface === "agency" || !canvasWorkspaceId
      ? null
      : result.workspaceSnapshot
        ? {
            nodes: result.workspaceSnapshot.nodes,
            updatedAt: (
              await saveWorkspaceNodes(userId, {
                canvasWorkspaceId,
                nodes: result.workspaceSnapshot.nodes,
              })
            ).updatedAt,
          }
        : null;

  const contextTitles = turn.contextNodeTitles ?? turn.scopeRefs?.map((ref) => ref.label) ?? [];

  const userMessageRow = {
    id: createWorkspaceId("message"),
    conversationId: conversation.id,
    userId,
    role: "user" as const,
    content: turn.content,
    attachments: turnAttachments,
    contextNodeTitles: contextTitles,
    model: resolvedModelId,
    toolsCalled: [],
    artifacts: [] as AiUiArtifact[],
    createdAt: now,
  };
  const assistantCreatedAt = new Date();
  const assistantMessageRow = {
    id: createWorkspaceId("message"),
    conversationId: conversation.id,
    userId,
    role: "assistant" as const,
    content: result.response,
    attachments: [] as AgentTextAttachment[],
    contextNodeTitles: [],
    model: result.model,
    toolsCalled: result.toolsCalled,
    artifacts: artifactsFromToolCalls(result.toolsCalled),
    createdAt: assistantCreatedAt,
  };

  await db.insert(dashboardConversationMessage).values([userMessageRow, assistantMessageRow]);

  await db
    .update(dashboardConversation)
    .set({
      model: result.model || resolvedModelId,
      toolPreset,
      usageSummary: nextUsageSummary,
      updatedAt: assistantCreatedAt,
      lastMessageAt: assistantCreatedAt,
    })
    .where(
      and(eq(dashboardConversation.id, conversation.id), eq(dashboardConversation.userId, userId)),
    );

  const conversationSummary = mapConversationSummary({
    row: {
      ...conversation,
      model: result.model || resolvedModelId,
      toolPreset,
      usageSummary: nextUsageSummary,
      updatedAt: assistantCreatedAt,
      lastMessageAt: assistantCreatedAt,
    },
    lastMessagePreview: buildDashboardMessagePreview(result.response),
  });

  return agentChatTurnResponseSchema.parse({
    conversation: conversationSummary,
    userMessage: mapConversationMessage(userMessageRow),
    assistantMessage: mapConversationMessage(assistantMessageRow),
    createdConversation,
    workspaceSnapshot,
  });
}

export async function* streamDashboardConversationTurn(
  actorUserId: string,
  input: { actorUserName: string; turn: AgentChatTurnInput; signal?: AbortSignal },
): AsyncGenerator<AgentChatTurnStreamEvent, void, void> {
  const userId = actorUserId;
  const { actorUserName: userName, turn } = input;
  const surface: AgentSurface = turn.surface ?? "canvas";
  const toolPreset = turn.toolPreset;
  const unlockedSurfaces = resolveUnlockedSurfaces({
    surface,
    unlockedSurfaces: turn.unlockedSurfaces,
    scopeRefs: turn.scopeRefs,
  });
  const needsCanvas = unlockedSurfaces.includes("canvas");

  if (surface === "agency" && !turn.teamId?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Agency agent turns require a teamId.",
    });
  }

  const now = new Date();
  await consumeOrchMessageForActor(userId, now);
  const requestedWorkspaceId = await resolveTurnCanvasWorkspaceId(userId, turn);

  const [fullWorkspaceSnapshot, marketplaceResult] = await Promise.all([
    needsCanvas
      ? loadTurnWorkspaceSnapshot(userId, requestedWorkspaceId, turn.nodes)
      : Promise.resolve({ nodes: [], updatedAt: null as string | null }),
    needsCanvas
      ? getWorkspaceMarketplaceItems(userId, { limit: 200, kind: "all" })
      : Promise.resolve({ items: [] }),
  ]);

  const turnAttachments = turn.attachments ?? [];
  const turnModelContent = modelUserContent(turn.content, turnAttachments);
  const modelPreset = turn.modelPreset ?? DEFAULT_AGENT_MODEL_PRESET;
  const resolvedModel = await resolveOpenRouterModelForTurn({
    preset: modelPreset,
    pinnedModelId: turn.model,
    content: typeof turnModelContent === "string" ? turnModelContent : turn.content,
    signals: {
      contentLength: modelContentLength(turnModelContent),
      scopeCount: turn.scopeRefs?.length ?? turn.scopeNodes?.length ?? 0,
      mentionCount: turn.contextNodeTitles?.length ?? 0,
      toolPreset,
      surface,
    },
  });
  const resolvedModelId = resolvedModel.modelId;

  const conversation = turn.conversationId
    ? await getConversationRecord(userId, turn.conversationId)
    : await createDashboardConversation(userId, {
        content: turn.content,
        attachments: turnAttachments,
        model: resolvedModelId,
        toolPreset,
        canvasWorkspaceId: requestedWorkspaceId,
      });
  const createdConversation = !turn.conversationId;
  const canvasWorkspaceId = requestedWorkspaceId ?? conversation.canvasWorkspaceId ?? null;

  const recentMessagesDesc = await db
    .select()
    .from(dashboardConversationMessage)
    .where(
      and(
        eq(dashboardConversationMessage.conversationId, conversation.id),
        eq(dashboardConversationMessage.userId, userId),
      ),
    )
    .orderBy(desc(dashboardConversationMessage.createdAt), desc(dashboardConversationMessage.id))
    .limit(Math.max(0, DASHBOARD_CONVERSATION_MESSAGE_WINDOW - 1));
  const recentMessages = [...recentMessagesDesc].reverse().map((message) => ({
    role: message.role as "user" | "assistant",
    content:
      message.role === "user"
        ? modelUserContent(message.content, attachmentsFromRow(message.attachments))
        : message.content,
  }));
  const memoryText = formatMemoryForPrompt(await getMemoryForPrompt(userId, {}));
  const messagesWithMemory: AgentModelInputMessage[] = memoryText
    ? [{ role: "system", content: memoryText }, ...recentMessages]
    : recentMessages;
  const scopeNodes = turn.scopeNodes ?? turn.nodes;
  const agencyRuntime =
    unlockedSurfaces.includes("agency") && turn.teamId
      ? createAgencyAgentRuntime(userId, turn.teamId, conversation.id)
      : null;
  const canvasRuntime = needsCanvas
    ? createCanvasAgentRuntime(userId, conversation.id, turn.teamId, canvasWorkspaceId)
    : null;

  const contextTitles = turn.contextNodeTitles ?? turn.scopeRefs?.map((ref) => ref.label) ?? [];
  const userMessageId = createWorkspaceId("message");
  const assistantMessageId = createWorkspaceId("message");

  const userMessageRow = {
    id: userMessageId,
    conversationId: conversation.id,
    userId,
    role: "user" as const,
    content: turn.content,
    attachments: turnAttachments,
    contextNodeTitles: contextTitles,
    model: resolvedModelId,
    toolsCalled: [] as AgentToolCall[],
    artifacts: [] as AiUiArtifact[],
    createdAt: now,
  };

  await db.insert(dashboardConversationMessage).values(userMessageRow);

  const previousRun = await findRunningChatRun(userId, { conversationId: conversation.id });
  if (previousRun) {
    await cancelRun(userId, { runId: previousRun.runId });
  }

  const { runId } = await insertAgentRun(userId, {
    conversationId: conversation.id,
    kind: "chat",
    model: resolvedModelId,
  });
  const serverController = new AbortController();
  agentRunAbortRegistry.attach(runId, serverController);

  const startedEvent = agentChatTurnStreamEventSchema.parse({
    type: "started",
    runId,
    conversationId: conversation.id,
    createdConversation,
    userMessageId,
    assistantMessageId,
    model: resolvedModelId,
  });
  await persistRunStreamEvent(userId, { runId, event: startedEvent });

  scheduleDetachedRun(() =>
    executeDashboardConversationRun({
      actorUserId: userId,
      runId,
      serverSignal: serverController.signal,
      conversation,
      createdConversation,
      userMessageRow,
      assistantMessageId,
      userName,
      turn,
      turnModelContent,
      surface,
      toolPreset,
      unlockedSurfaces,
      fullWorkspaceSnapshot,
      marketplaceItems: marketplaceResult.items,
      scopeNodes,
      agencyRuntime,
      canvasRuntime,
      resolvedModelId,
      modelPreset,
      recentMessages: messagesWithMemory,
      canvasWorkspaceId,
    }),
  );

  yield* subscribeRun(userId, { runId, afterSeq: 0, signal: input.signal });
}

async function executeDashboardConversationRun(args: {
  actorUserId: string;
  runId: string;
  serverSignal: AbortSignal;
  conversation: Awaited<ReturnType<typeof getConversationRecord>>;
  createdConversation: boolean;
  userMessageRow: {
    id: string;
    conversationId: string;
    userId: string;
    role: "user";
    content: string;
    attachments: AgentTextAttachment[];
    contextNodeTitles: string[];
    model: string;
    toolsCalled: AgentToolCall[];
    artifacts: AiUiArtifact[];
    createdAt: Date;
  };
  assistantMessageId: string;
  userName: string;
  turn: AgentChatTurnInput;
  turnModelContent: ReturnType<typeof modelUserContent>;
  surface: AgentSurface;
  toolPreset: AgentChatTurnInput["toolPreset"];
  unlockedSurfaces: AgentSurface[];
  fullWorkspaceSnapshot: {
    nodes: DashboardAgentWorkspaceContext["nodes"];
    updatedAt: string | null;
  };
  marketplaceItems: NonNullable<DashboardAgentWorkspaceContext["marketplaceItems"]>;
  scopeNodes: AgentChatTurnInput["scopeNodes"] | AgentChatTurnInput["nodes"];
  agencyRuntime: ReturnType<typeof createAgencyAgentRuntime> | null;
  canvasRuntime: ReturnType<typeof createCanvasAgentRuntime> | null;
  resolvedModelId: string;
  modelPreset: NonNullable<AgentChatTurnInput["modelPreset"]> | typeof DEFAULT_AGENT_MODEL_PRESET;
  recentMessages: AgentModelInputMessage[];
  canvasWorkspaceId: string | null;
}) {
  const {
    actorUserId: userId,
    runId,
    serverSignal,
    conversation,
    createdConversation,
    userMessageRow,
    assistantMessageId,
    userName,
    turn,
    turnModelContent,
    surface,
    toolPreset,
    unlockedSurfaces,
    fullWorkspaceSnapshot,
    marketplaceItems,
    scopeNodes,
    agencyRuntime,
    canvasRuntime,
    resolvedModelId,
    modelPreset,
    recentMessages,
    canvasWorkspaceId,
  } = args;

  const persist = (event: AgentChatTurnStreamEvent) =>
    persistRunStreamEvent(userId, { runId, event });

  const toolsById = new Map<string, AgentToolCall>();
  const toolOrder: string[] = [];
  const streamedArtifacts: AiUiArtifact[] = [];
  const coalescer = createTokenCoalescer({
    flushMs: AGENT_TOKEN_FLUSH_MS,
    flushChars: AGENT_TOKEN_FLUSH_CHARS,
    onFlush: async (delta) => {
      await persist(agentChatTurnStreamEventSchema.parse({ type: "token", delta }));
    },
  });

  try {
    for await (const event of streamDashboardAgent(
      [
        ...recentMessages,
        {
          role: "user",
          content: turnModelContent,
        },
      ],
      {
        nodes: fullWorkspaceSnapshot.nodes,
        scopeNodes,
        marketplaceItems,
        updatedAt: fullWorkspaceSnapshot.updatedAt,
        userName,
        activeTabId: turn.activeTabId,
        surface,
        unlockedSurfaces,
        scopeRefs: turn.scopeRefs,
        teamId: turn.teamId ?? null,
      },
      {
        model: resolvedModelId,
        modelPreset,
        toolPreset,
        agencyRuntime,
        canvasRuntime,
        memoryRuntime: createMemoryAgentRuntime(userId, runId),
        signal: serverSignal,
      },
    )) {
      if (event.type === "token") {
        coalescer.push(event.delta);
        continue;
      }
      await coalescer.flush();
      if (event.type === "tool") {
        const toolId = event.tool.id ?? `tool_${toolOrder.length}`;
        if (!toolsById.has(toolId)) {
          toolOrder.push(toolId);
        }
        toolsById.set(toolId, { ...event.tool, id: toolId });
        await persist(
          agentChatTurnStreamEventSchema.parse({
            type: "tool",
            tool: { ...event.tool, id: toolId },
          }),
        );
        continue;
      }
      if (event.type === "artifact") {
        streamedArtifacts.push(event.artifact);
        await persist(agentChatTurnStreamEventSchema.parse(event));
        continue;
      }
      if (
        event.type === "plan" ||
        event.type === "todo" ||
        event.type === "proposal" ||
        event.type === "question" ||
        event.type === "created_object"
      ) {
        await persist(agentChatTurnStreamEventSchema.parse(event));
        continue;
      }
      if (event.type === "done") {
        const stopped = serverSignal.aborted;
        const toolsCalled = toolOrder
          .map((id) => toolsById.get(id))
          .filter((tool): tool is AgentToolCall => Boolean(tool));
        const finalTools = event.toolCalls.length > 0 ? event.toolCalls : toolsCalled;
        const fromDone = event.artifacts ?? [];
        const finalArtifacts = cappedArtifacts(
          fromDone.length > 0
            ? fromDone
            : streamedArtifacts.length > 0
              ? streamedArtifacts
              : artifactsFromToolCalls(finalTools),
        );
        const responseText = finalizeAssistantResponseText({
          responseText: event.responseText,
          stopped,
          toolCount: finalTools.length,
        });

        const nextUsageSummary = buildNextConversationUsageSummary(
          conversation.usageSummary,
          event.usage,
        );
        const workspaceSnapshot =
          surface === "agency" || !canvasWorkspaceId
            ? null
            : event.workspaceSnapshot
              ? {
                  nodes: event.workspaceSnapshot.nodes,
                  updatedAt: (
                    await saveWorkspaceNodes(userId, {
                      canvasWorkspaceId,
                      nodes: event.workspaceSnapshot.nodes,
                    })
                  ).updatedAt,
                }
              : null;

        const assistantCreatedAt = new Date();
        const assistantMessageRow = {
          id: assistantMessageId,
          conversationId: conversation.id,
          userId,
          role: "assistant" as const,
          content: responseText,
          attachments: [] as AgentTextAttachment[],
          contextNodeTitles: [] as string[],
          model: event.model || resolvedModelId,
          toolsCalled: finalTools,
          artifacts: finalArtifacts,
          createdAt: assistantCreatedAt,
        };

        await db.insert(dashboardConversationMessage).values(assistantMessageRow);
        await db
          .update(dashboardConversation)
          .set({
            model: event.model || resolvedModelId,
            toolPreset,
            usageSummary: nextUsageSummary,
            updatedAt: assistantCreatedAt,
            lastMessageAt: assistantCreatedAt,
          })
          .where(
            and(
              eq(dashboardConversation.id, conversation.id),
              eq(dashboardConversation.userId, userId),
            ),
          );

        const conversationSummary = mapConversationSummary({
          row: {
            ...conversation,
            model: event.model || resolvedModelId,
            toolPreset,
            usageSummary: nextUsageSummary,
            updatedAt: assistantCreatedAt,
            lastMessageAt: assistantCreatedAt,
          },
          lastMessagePreview: buildDashboardMessagePreview(responseText),
        });

        await persist(
          agentChatTurnStreamEventSchema.parse({
            type: "completed",
            conversation: conversationSummary,
            userMessage: mapConversationMessage(userMessageRow),
            assistantMessage: mapConversationMessage(assistantMessageRow),
            createdConversation,
            workspaceSnapshot,
            stopped,
          }),
        );
        await completeAgentRun(userId, {
          runId,
          status: stopped ? "cancelled" : "succeeded",
        });
        if (!hasRunListener(runId)) {
          await insertInboxNote(userId, {
            runId,
            kind: "finish",
            title: stopped ? "I stopped before finishing" : "I finished a reply",
            body: responseText.slice(0, 400),
          });
        }
      }
    }
  } catch (error) {
    await coalescer.flush();
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 2_000)
        : "Failed to stream the agent reply.";
    await persist(
      agentChatTurnStreamEventSchema.parse({
        type: "error",
        message,
      }),
    );
    await completeAgentRun(userId, {
      runId,
      status: serverSignal.aborted ? "cancelled" : "failed",
      error: message,
    });
    if (!hasRunListener(runId)) {
      await insertInboxNote(userId, {
        runId,
        kind: "finish",
        title: "I hit a problem",
        body: message,
      });
    }
  }
}
