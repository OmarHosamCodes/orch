import {
  agencyActionLabel,
  agencyActionSchema,
  agencyDraftPlanSchema,
  type AgencyAction,
  type AgencyDraftPlan,
} from "@orch/agent/agency-actions";
import {
  bindCanvasPlanStepAction,
  canvasActionLabel,
  canvasActionSchema,
  canvasDraftPlanSchema,
  readLastCreatedCanvasTarget,
  stampCanvasCreateIds,
  type CanvasAction,
} from "@orch/agent/canvas-actions";
import {
  knowledgeActionLabel,
  knowledgeActionSchema,
  knowledgeDraftPlanSchema,
} from "@orch/agent/knowledge-actions";
import { applyCanvasAction } from "@orch/agent/tools";
import { db } from "@orch/db";
import {
  agentAgencyProposal,
  dashboardConversationMessage,
  type DashboardConversationMessageToolsCalledRecord,
} from "@orch/db/schema";
import {
  createWorkspaceId,
  knowledgeObjectHref,
  knowledgeObjectTypeSchema,
  type WorkspaceNode,
} from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";

import {
  archiveAgencyClient,
  createAgencyClient,
  listAgencyClients,
  updateAgencyClient,
} from "../agency-ops/clients/service";
import {
  exportMoneyDocuments,
  listPeriodMoneyObligations,
} from "../agency-ops/billing/money-export-service";
import {
  createAgencyProject,
  deleteAgencyProject,
  listAgencyProjects,
  restoreAgencyProject,
  updateAgencyProject,
} from "../agency-ops/projects/service";
import { requireTeamMembership } from "../agency-ops/shared/membership";
import { createAgencyTag, deleteAgencyTag, listAgencyTags } from "../agency-ops/tags/service";
import {
  createAgencyProjectTask,
  deleteAgencyProjectTask,
  listAgencyProjectTasks,
  updateAgencyProjectTask,
} from "../agency-ops/tasks/service";
import {
  createManualAgencyTimeEntry,
  deleteMyAgencyTimeEntry,
  getAgencyActiveTimer,
  getMyAgencyTimeEntry,
  startAgencyTimer,
  stopAgencyTimer,
  updateAgencyActiveTimerDescription,
  updateAgencyActiveTimerStart,
  updateAgencyActiveTimerTask,
  updateMyAgencyTimeEntry,
} from "../agency-ops/time-tracking/service";
import { getWorkspaceSnapshot, saveWorkspaceNodes } from "../workspace/service";
import { applyKnowledgeAction } from "../workspace/knowledge-service";

const PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000;

type ConfirmProposalRecord = {
  proposalId: string;
  status: "pending";
  action: unknown;
  before: unknown;
  after: unknown;
  label: string;
  boardHref?: string;
};

async function appendConfirmProposalsToAssistantMessage(
  actorUserId: string,
  conversationId: string | null | undefined,
  toolName: "propose_canvas_action" | "propose_agency_action" | "propose_knowledge_action",
  proposals: ConfirmProposalRecord[],
) {
  if (!conversationId || proposals.length === 0) {
    return;
  }
  const [message] = await db
    .select()
    .from(dashboardConversationMessage)
    .where(
      and(
        eq(dashboardConversationMessage.conversationId, conversationId),
        eq(dashboardConversationMessage.userId, actorUserId),
        eq(dashboardConversationMessage.role, "assistant"),
      ),
    )
    .orderBy(desc(dashboardConversationMessage.createdAt), desc(dashboardConversationMessage.id))
    .limit(1);
  if (!message) {
    return;
  }
  const existing =
    (message.toolsCalled as DashboardConversationMessageToolsCalledRecord | null) ?? [];
  const appended: DashboardConversationMessageToolsCalledRecord = proposals.map((proposal) => ({
    id: `confirm-${proposal.proposalId}`,
    name: toolName,
    input: { action: proposal.action, label: proposal.label },
    output: {
      proposalId: proposal.proposalId,
      status: proposal.status,
      label: proposal.label,
      action: proposal.action,
      before: proposal.before,
      after: proposal.after,
      ...(proposal.boardHref ? { boardHref: proposal.boardHref } : {}),
    },
    status: "completed",
  }));
  await db
    .update(dashboardConversationMessage)
    .set({ toolsCalled: [...existing, ...appended] })
    .where(eq(dashboardConversationMessage.id, message.id));
}

const STALE_PROPOSAL_MESSAGE =
  "Underlying data changed. Reject this proposal and ask Orch to propose again.";
const STALE_PROPOSAL_ROW_ERROR = "State changed since proposal; reject and re-propose.";

function canonicalizeProposalState(value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalizeProposalState);
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const entry = (value as Record<string, unknown>)[key];
    if (entry === undefined) continue;
    out[key] = canonicalizeProposalState(entry);
  }
  return out;
}

function stableJson(value: unknown) {
  return JSON.stringify(canonicalizeProposalState(value));
}

function isStaleProposalError(error: unknown): boolean {
  return error instanceof ORPCError && error.message === STALE_PROPOSAL_MESSAGE;
}

function isRetryableStaleProposal(row: { status: string; error: string | null }): boolean {
  return (
    row.status === "failed" &&
    (row.error === STALE_PROPOSAL_MESSAGE || row.error === STALE_PROPOSAL_ROW_ERROR)
  );
}

const VOLATILE_PROPOSAL_KEYS = new Set([
  "updatedAt",
  "createdAt",
  "durationSeconds",
  "links",
  "heartbeatAt",
]);

function stripVolatileProposalState(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value ?? null;
  if (Array.isArray(value)) return value.map(stripVolatileProposalState);
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (VOLATILE_PROPOSAL_KEYS.has(key)) continue;
    out[key] = stripVolatileProposalState(entry);
  }
  return out;
}

export function proposalStateFingerprint(value: unknown): string {
  return stableJson(stripVolatileProposalState(value));
}

export async function loadAgencyActionBefore(
  actorUserId: string,
  teamId: string,
  action: AgencyAction,
): Promise<unknown> {
  switch (action.type) {
    case "time_entry.create":
      return null;
    case "time_entry.update":
    case "time_entry.delete": {
      return getMyAgencyTimeEntry(actorUserId, { teamId, entryId: action.entryId });
    }
    case "timer.start":
    case "timer.stop":
    case "timer.update": {
      const timer = await getAgencyActiveTimer(actorUserId, { teamId });
      return timer.timer ?? null;
    }
    case "project.create":
      return null;
    case "project.update":
    case "project.archive":
    case "project.restore": {
      const projects = await listAgencyProjects(actorUserId, { teamId });
      return projects.items.find((project) => project.id === action.projectId) ?? null;
    }
    case "task.create":
      return null;
    case "task.update":
    case "task.delete": {
      const tasks = await listAgencyProjectTasks(actorUserId, {
        teamId,
        page: 1,
        pageSize: 100,
      });
      return tasks.items.find((task) => task.id === action.taskId) ?? null;
    }
    case "tag.create":
      return null;
    case "tag.delete": {
      const tags = await listAgencyTags(actorUserId, { teamId });
      return tags.items.find((tag) => tag.id === action.tagId) ?? null;
    }
    case "client.create":
      return null;
    case "client.update":
    case "client.archive": {
      const clients = await listAgencyClients(actorUserId, { teamId });
      return clients.items.find((client) => client.id === action.clientId) ?? null;
    }
    case "money.export_client": {
      const listed = await listPeriodMoneyObligations(actorUserId, {
        teamId,
        periodStart: action.periodStart,
        periodEnd: action.periodEnd,
      });
      return listed.clients.filter((row) => row.clientId === action.clientId);
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function buildAgencyActionAfter(before: unknown, action: AgencyAction): unknown {
  switch (action.type) {
    case "time_entry.create":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
        id: "(new)",
      };
    case "time_entry.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "time_entry.delete":
      return null;
    case "timer.start":
      return { ...action, id: "(new-timer)" };
    case "timer.stop":
      return null;
    case "timer.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "project.create":
      return { id: "(new)", name: action.name, clientId: action.clientId };
    case "project.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "project.archive":
      return {
        ...(typeof before === "object" && before ? before : {}),
        archived: true,
      };
    case "project.restore":
      return {
        ...(typeof before === "object" && before ? before : {}),
        archived: false,
      };
    case "task.create":
      return { id: "(new)", title: action.title, projectId: action.projectId };
    case "task.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "task.delete":
      return null;
    case "tag.create":
      return { id: "(new)", name: action.name };
    case "tag.delete":
      return null;
    case "client.create":
      return { id: "(new)", name: action.name, category: action.category ?? "external" };
    case "client.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "client.archive":
      return {
        ...(typeof before === "object" && before ? before : {}),
        archived: true,
      };
    case "money.export_client":
      return {
        exported: true,
        clientId: action.clientId,
        mode: action.mode ?? "combine",
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export async function executeAgencyAction(
  actorUserId: string,
  teamId: string,
  action: AgencyAction,
) {
  switch (action.type) {
    case "time_entry.create":
      return createManualAgencyTimeEntry(actorUserId, {
        teamId,
        projectId: action.projectId,
        taskId: action.taskId,
        startAt: action.startAt,
        endAt: action.endAt,
        description: action.description,
        tagIds: action.tagIds,
        isBillable: action.isBillable,
      });
    case "time_entry.update":
      return updateMyAgencyTimeEntry(actorUserId, {
        teamId,
        entryId: action.entryId,
        projectId: action.projectId,
        taskId: action.taskId,
        startAt: action.startAt,
        endAt: action.endAt,
        description: action.description,
        tagIds: action.tagIds,
        isBillable: action.isBillable,
        isWaste: action.isWaste,
      });
    case "time_entry.delete":
      return deleteMyAgencyTimeEntry(actorUserId, { teamId, entryId: action.entryId });
    case "timer.start":
      return startAgencyTimer(actorUserId, {
        teamId,
        projectId: action.projectId,
        taskId: action.taskId,
        description: action.description,
        tagIds: action.tagIds,
        isBillable: action.isBillable,
      });
    case "timer.stop":
      return stopAgencyTimer(actorUserId, { teamId });
    case "timer.update": {
      if (action.description !== undefined) {
        await updateAgencyActiveTimerDescription(actorUserId, {
          teamId,
          description: action.description,
        });
      }
      if (action.taskId !== undefined) {
        await updateAgencyActiveTimerTask(actorUserId, {
          teamId,
          taskId: action.taskId,
        });
      }
      if (action.startAt !== undefined) {
        await updateAgencyActiveTimerStart(actorUserId, {
          teamId,
          startedAt: action.startAt,
        });
      }
      return getAgencyActiveTimer(actorUserId, { teamId });
    }
    case "project.create":
      return createAgencyProject(actorUserId, {
        teamId,
        clientId: action.clientId,
        name: action.name,
      });
    case "project.update":
      return updateAgencyProject(actorUserId, {
        teamId,
        projectId: action.projectId,
        name: action.name,
        clientId: action.clientId,
      });
    case "project.archive":
      return deleteAgencyProject(actorUserId, { teamId, projectId: action.projectId });
    case "project.restore":
      return restoreAgencyProject(actorUserId, { teamId, projectId: action.projectId });
    case "task.create":
      return createAgencyProjectTask(actorUserId, {
        teamId,
        projectId: action.projectId,
        title: action.title,
        description: action.description,
      });
    case "task.update":
      return updateAgencyProjectTask(actorUserId, {
        teamId,
        taskId: action.taskId,
        title: action.title,
        status: action.status,
      });
    case "task.delete":
      return deleteAgencyProjectTask(actorUserId, { teamId, taskId: action.taskId });
    case "tag.create":
      return createAgencyTag(actorUserId, { teamId, name: action.name });
    case "tag.delete":
      return deleteAgencyTag(actorUserId, { teamId, tagId: action.tagId });
    case "client.create":
      return createAgencyClient(actorUserId, {
        teamId,
        name: action.name,
        category: action.category,
      });
    case "client.update":
      return updateAgencyClient(actorUserId, {
        teamId,
        clientId: action.clientId,
        name: action.name,
      });
    case "client.archive":
      return archiveAgencyClient(actorUserId, { teamId, clientId: action.clientId });
    case "money.export_client": {
      const listed = await listPeriodMoneyObligations(actorUserId, {
        teamId,
        periodStart: action.periodStart,
        periodEnd: action.periodEnd,
      });
      const rows = listed.clients.filter((row) => row.clientId === action.clientId);
      if (rows.length === 0) {
        throw new ORPCError("BAD_REQUEST", { message: "No client bill for that period." });
      }
      const selections = rows.map((row) => ({
        obligationId: row.id,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        kind: row.kind === "invoice" ? ("invoice" as const) : ("ready" as const),
        amount: row.remainingAmount,
      }));
      return exportMoneyDocuments(actorUserId, {
        teamId,
        partyType: "client",
        partyId: action.clientId,
        mode: action.mode ?? "combine",
        selections,
      });
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export async function createAgencyProposalRecord(
  actorUserId: string,
  input: {
    teamId: string;
    action: unknown;
    label?: string;
    conversationId?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const action = agencyActionSchema.parse(input.action);
  const before = await loadAgencyActionBefore(actorUserId, input.teamId, action);
  const after = buildAgencyActionAfter(before, action);
  const now = new Date();
  const id = createWorkspaceId("aap");
  const label = input.label?.trim() || agencyActionLabel(action);

  await db.insert(agentAgencyProposal).values({
    id,
    domain: "agency",
    teamId: input.teamId,
    actorUserId,
    conversationId: input.conversationId ?? null,
    messageId: null,
    action,
    beforeState: before,
    afterState: after,
    label,
    status: "pending",
    illustrationArtifactId: null,
    error: null,
    expiresAt: new Date(now.getTime() + PROPOSAL_TTL_MS),
    createdAt: now,
    updatedAt: now,
  });

  return {
    proposalId: id,
    status: "pending" as const,
    action,
    before,
    after,
    label,
  };
}

export async function confirmAgencyPlan(
  actorUserId: string,
  input: { teamId: string; conversationId?: string | null; plan: unknown },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const plan = agencyDraftPlanSchema.parse(input.plan);
  const proposals = [];
  for (const step of plan.steps) {
    proposals.push(
      await createAgencyProposalRecord(actorUserId, {
        teamId: input.teamId,
        action: step.action,
        label: step.label,
        conversationId: input.conversationId,
      }),
    );
  }
  await appendConfirmProposalsToAssistantMessage(
    actorUserId,
    input.conversationId,
    "propose_agency_action",
    proposals,
  );
  return { planId: plan.planId, proposals };
}

export async function applyCanvasForYou(
  actorUserId: string,
  input: {
    action: unknown;
    label?: string;
    conversationId?: string | null;
    teamId?: string | null;
    nodes?: WorkspaceNode[];
  },
) {
  if (input.teamId) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
  }
  const action = canvasActionSchema.parse(input.action);
  if (
    action.type === "node.create" &&
    action.visibility === "team" &&
    !action.teamId &&
    !input.teamId
  ) {
    throw new ORPCError("BAD_REQUEST", { message: "Team-shared nodes require a team." });
  }
  const snapshotNodes = input.nodes ?? (await getWorkspaceSnapshot(actorUserId, {})).nodes;
  const preview = await applyCanvasAction(snapshotNodes, action);
  const storedAction = stampCanvasCreateIds(action, preview.after);
  const saved = await saveWorkspaceNodes(actorUserId, { nodes: preview.nextNodes });
  const label = input.label?.trim() || canvasActionLabel(storedAction);
  const createdNodeId =
    storedAction.type === "node.create" && preview.after && typeof preview.after === "object"
      ? String((preview.after as { id?: string }).id ?? "")
      : storedAction.type.startsWith("node.") ||
          storedAction.type.startsWith("tab.") ||
          storedAction.type.startsWith("block.")
        ? "nodeId" in storedAction
          ? storedAction.nodeId
          : null
        : null;
  const blockId =
    storedAction.type.startsWith("block.") && "blockId" in storedAction
      ? String(storedAction.blockId)
      : null;
  const boardHref = createdNodeId ? `/node/${createdNodeId}` : "/canvas";
  void saved;
  void input.conversationId;
  return {
    applied: true as const,
    nodeId: createdNodeId || null,
    blockId,
    label,
    boardHref,
    after: preview.after,
    nextNodes: preview.nextNodes,
  };
}

export async function createCanvasProposalRecord(
  actorUserId: string,
  input: {
    action: unknown;
    label?: string;
    conversationId?: string | null;
    teamId?: string | null;
    nodes?: WorkspaceNode[];
  },
) {
  return applyCanvasForYou(actorUserId, input);
}

export async function applyKnowledgeForYou(
  actorUserId: string,
  input: {
    action: unknown;
    label?: string;
    conversationId?: string | null;
    teamId?: string | null;
  },
) {
  if (input.teamId) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
  }
  const action = knowledgeActionSchema.parse(input.action);
  const applied = await applyKnowledgeAction(actorUserId, {
    action,
    teamId: input.teamId,
  });
  const objectId =
    applied && typeof applied === "object" && "objectId" in applied
      ? String((applied as { objectId?: string }).objectId ?? "")
      : null;
  const after =
    applied && typeof applied === "object" && "after" in applied
      ? (applied as { after?: { objectType?: string; title?: string } }).after
      : null;
  const objectType =
    after && typeof after === "object" && "objectType" in after
      ? String((after as { objectType?: string }).objectType ?? "")
      : null;
  const label = input.label?.trim() || knowledgeActionLabel(action);
  void input.conversationId;
  const parsedType = knowledgeObjectTypeSchema.safeParse(objectType);
  return {
    applied: true as const,
    objectId: objectId || null,
    objectType: typeof objectType === "string" ? objectType : null,
    label,
    boardHref: objectId
      ? parsedType.success
        ? knowledgeObjectHref(parsedType.data, objectId)
        : `/object/${objectId}`
      : "/canvas",
  };
}

export async function createKnowledgeProposalRecord(
  actorUserId: string,
  input: {
    action: unknown;
    label?: string;
    conversationId?: string | null;
    teamId?: string | null;
  },
) {
  return applyKnowledgeForYou(actorUserId, input);
}

export async function confirmCanvasPlan(
  actorUserId: string,
  input: { conversationId?: string | null; teamId?: string | null; plan: unknown },
) {
  if (input.teamId) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
  }
  const plan = canvasDraftPlanSchema.parse(input.plan);
  const created = [];
  let draftNodes = (await getWorkspaceSnapshot(actorUserId, {})).nodes;
  let lastCreated = null as ReturnType<typeof readLastCreatedCanvasTarget>;
  for (const step of plan.steps) {
    const boundAction = bindCanvasPlanStepAction(step.action, draftNodes, lastCreated);
    const applied = await applyCanvasForYou(actorUserId, {
      action: boundAction,
      label: step.label,
      conversationId: input.conversationId,
      teamId: input.teamId,
      nodes: draftNodes,
    });
    created.push(applied);
    draftNodes = applied.nextNodes;
    lastCreated = readLastCreatedCanvasTarget(boundAction, applied.after) ?? lastCreated;
  }
  return { planId: plan.planId, proposals: [], created };
}

async function loadProposalForActor(
  actorUserId: string,
  input: { proposalId: string; teamId?: string },
) {
  const [row] = await db
    .select()
    .from(agentAgencyProposal)
    .where(
      and(
        eq(agentAgencyProposal.id, input.proposalId),
        eq(agentAgencyProposal.actorUserId, actorUserId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Proposal not found." });
  }
  if (row.domain === "agency") {
    const teamId = input.teamId ?? row.teamId;
    if (!teamId) {
      throw new ORPCError("BAD_REQUEST", { message: "Agency proposal requires a team." });
    }
    await requireTeamMembership(actorUserId, teamId, "viewer");
    if (row.teamId && row.teamId !== teamId) {
      throw new ORPCError("NOT_FOUND", { message: "Proposal not found." });
    }
  } else if (row.teamId) {
    await requireTeamMembership(actorUserId, row.teamId, "viewer");
  }
  return row;
}

async function executeCanvasAction(actorUserId: string, action: CanvasAction) {
  const snapshot = await getWorkspaceSnapshot(actorUserId, {});
  const applied = await applyCanvasAction(snapshot.nodes, action);
  const saved = await saveWorkspaceNodes(actorUserId, { nodes: applied.nextNodes });
  return {
    workspaceSnapshot: {
      nodes: applied.nextNodes,
      updatedAt: saved.updatedAt,
    },
  };
}

export async function approveAgencyProposal(
  actorUserId: string,
  input: { proposalId: string; teamId?: string },
) {
  const row = await loadProposalForActor(actorUserId, input);

  if (row.status !== "pending" && !isRetryableStaleProposal(row)) {
    throw new ORPCError("BAD_REQUEST", { message: `Proposal is ${row.status}.` });
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db
      .update(agentAgencyProposal)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(agentAgencyProposal.id, row.id));
    throw new ORPCError("BAD_REQUEST", { message: "Proposal expired." });
  }

  try {
    if (row.domain === "knowledge") {
      const applied = await applyKnowledgeAction(actorUserId, {
        action: knowledgeActionSchema.parse(row.action),
        proposalId: row.id,
        teamId: input.teamId ?? row.teamId,
      });
      const snapshot = await getWorkspaceSnapshot(actorUserId, {});
      await db
        .update(agentAgencyProposal)
        .set({ status: "executed", updatedAt: new Date(), error: null })
        .where(eq(agentAgencyProposal.id, row.id));
      return {
        proposalId: row.id,
        status: "executed" as const,
        result: applied,
        label: row.label,
        workspaceSnapshot: snapshot,
      };
    }
    if (row.domain === "canvas") {
      const canvasAction = canvasActionSchema.parse(row.action);
      const result = await executeCanvasAction(actorUserId, canvasAction);
      await db
        .update(agentAgencyProposal)
        .set({ status: "executed", updatedAt: new Date(), error: null })
        .where(eq(agentAgencyProposal.id, row.id));
      return {
        proposalId: row.id,
        status: "executed" as const,
        result,
        label: row.label,
        workspaceSnapshot: result.workspaceSnapshot,
      };
    }

    const teamId = input.teamId ?? row.teamId;
    if (!teamId) {
      throw new ORPCError("BAD_REQUEST", { message: "Agency proposal requires a team." });
    }
    const action = agencyActionSchema.parse(row.action);
    const currentBefore = await loadAgencyActionBefore(actorUserId, teamId, action);
    if (proposalStateFingerprint(currentBefore) !== proposalStateFingerprint(row.beforeState)) {
      throw new ORPCError("BAD_REQUEST", {
        message: STALE_PROPOSAL_MESSAGE,
      });
    }

    const result = await executeAgencyAction(actorUserId, teamId, action);
    await db
      .update(agentAgencyProposal)
      .set({ status: "executed", updatedAt: new Date(), error: null })
      .where(eq(agentAgencyProposal.id, row.id));
    return {
      proposalId: row.id,
      status: "executed" as const,
      result,
      label: row.label,
    };
  } catch (error) {
    if (isStaleProposalError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Execute failed";
    await db
      .update(agentAgencyProposal)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(agentAgencyProposal.id, row.id));
    throw error;
  }
}

export async function rejectAgencyProposal(
  actorUserId: string,
  input: { proposalId: string; teamId?: string },
) {
  const row = await loadProposalForActor(actorUserId, input);
  if (row.status !== "pending" && !isRetryableStaleProposal(row)) {
    throw new ORPCError("BAD_REQUEST", { message: `Proposal is ${row.status}.` });
  }

  await db
    .update(agentAgencyProposal)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(agentAgencyProposal.id, row.id));

  return { proposalId: row.id, status: "rejected" as const };
}

export async function confirmKnowledgePlan(
  actorUserId: string,
  input: { conversationId?: string | null; teamId?: string | null; plan: unknown },
) {
  if (input.teamId) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
  }
  const plan = knowledgeDraftPlanSchema.parse(input.plan);
  const created = [];
  for (const step of plan.steps) {
    const applied = await applyKnowledgeForYou(actorUserId, {
      action: step.action,
      label: step.label,
      conversationId: input.conversationId,
      teamId: input.teamId,
    });
    created.push(applied);
  }
  return { planId: plan.planId, proposals: [], created };
}

export async function confirmAgentPlan(
  actorUserId: string,
  input: {
    domain?: "agency" | "canvas" | "knowledge";
    teamId?: string;
    conversationId?: string | null;
    plan: unknown;
  },
) {
  const domain = input.domain ?? "agency";
  switch (domain) {
    case "knowledge":
      return confirmKnowledgePlan(actorUserId, {
        conversationId: input.conversationId,
        teamId: input.teamId,
        plan: input.plan,
      });
    case "canvas":
      return confirmCanvasPlan(actorUserId, {
        conversationId: input.conversationId,
        teamId: input.teamId,
        plan: input.plan,
      });
    case "agency": {
      if (!input.teamId) {
        throw new ORPCError("BAD_REQUEST", { message: "Agency plan confirm requires a team." });
      }
      return confirmAgencyPlan(actorUserId, {
        teamId: input.teamId,
        conversationId: input.conversationId,
        plan: input.plan,
      });
    }
    default: {
      const _exhaustive: never = domain;
      return _exhaustive;
    }
  }
}

export function parseAgencyDraftPlan(plan: unknown): AgencyDraftPlan {
  return agencyDraftPlanSchema.parse(plan);
}
