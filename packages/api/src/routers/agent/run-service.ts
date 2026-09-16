import { db } from "@orch/db";
import { agentRun, agentRunEvent, dashboardConversation } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, gt } from "drizzle-orm";

import { agentRunAbortRegistry } from "./run-lifecycle";

export {
  AGENT_TOKEN_FLUSH_CHARS,
  AGENT_TOKEN_FLUSH_MS,
  STALE_RUN_MS,
  agentRunAbortRegistry,
  bindListenerSignal,
  createRunAbortRegistry,
  createTokenCoalescer,
  recoverStaleRuns,
} from "./run-lifecycle";

async function requireOwnedRun(actorUserId: string, runId: string) {
  const [row] = await db
    .select()
    .from(agentRun)
    .where(and(eq(agentRun.id, runId), eq(agentRun.userId, actorUserId)))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Agent run was not found." });
  }

  return row;
}

export async function insertAgentRun(
  actorUserId: string,
  input: { conversationId: string; kind: "chat" | "detection"; model: string },
): Promise<{ runId: string }> {
  const [conversation] = await db
    .select({ id: dashboardConversation.id })
    .from(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    )
    .limit(1);

  if (!conversation) {
    throw new ORPCError("NOT_FOUND", { message: "Conversation was not found." });
  }

  const runId = createWorkspaceId("agent-run");
  const now = new Date();
  await db.insert(agentRun).values({
    id: runId,
    userId: actorUserId,
    conversationId: input.conversationId,
    kind: input.kind,
    status: "running",
    model: input.model,
    lastSeq: 0,
    error: null,
    startedAt: now,
    heartbeatAt: now,
    finishedAt: null,
    createdAt: now,
  });

  return { runId };
}

export async function appendRunEvent(
  actorUserId: string,
  input: { runId: string; type: string; payload: Record<string, unknown> },
): Promise<{ seq: number }> {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        lastSeq: agentRun.lastSeq,
        userId: agentRun.userId,
      })
      .from(agentRun)
      .where(eq(agentRun.id, input.runId))
      .limit(1);

    if (!row || row.userId !== actorUserId) {
      throw new ORPCError("NOT_FOUND", { message: "Agent run was not found." });
    }

    const seq = row.lastSeq + 1;
    const now = new Date();
    await tx.insert(agentRunEvent).values({
      id: createWorkspaceId("agent-event"),
      runId: input.runId,
      seq,
      type: input.type,
      payload: input.payload,
      createdAt: now,
    });
    await tx
      .update(agentRun)
      .set({ lastSeq: seq, heartbeatAt: now })
      .where(eq(agentRun.id, input.runId));

    return { seq };
  });
}

export async function completeAgentRun(
  actorUserId: string,
  input: { runId: string; status: "succeeded" | "failed" | "cancelled"; error?: string },
): Promise<void> {
  await requireOwnedRun(actorUserId, input.runId);
  const now = new Date();
  await db
    .update(agentRun)
    .set({
      status: input.status,
      error: input.error ?? null,
      finishedAt: now,
      heartbeatAt: now,
    })
    .where(eq(agentRun.id, input.runId));
  agentRunAbortRegistry.abort(input.runId);
}

export async function listRunEventsAfter(
  actorUserId: string,
  input: { runId: string; afterSeq: number },
): Promise<Array<{ seq: number; type: string; payload: Record<string, unknown> }>> {
  await requireOwnedRun(actorUserId, input.runId);
  const rows = await db
    .select({
      seq: agentRunEvent.seq,
      type: agentRunEvent.type,
      payload: agentRunEvent.payload,
    })
    .from(agentRunEvent)
    .where(and(eq(agentRunEvent.runId, input.runId), gt(agentRunEvent.seq, input.afterSeq)))
    .orderBy(asc(agentRunEvent.seq));

  return rows.map((row) => ({
    seq: row.seq,
    type: row.type,
    payload: row.payload ?? {},
  }));
}

export async function getAgentRun(
  actorUserId: string,
  input: { runId: string },
): Promise<{
  id: string;
  conversationId: string;
  kind: string;
  status: string;
  model: string;
  lastSeq: number;
  error: string | null;
  startedAt: Date;
  heartbeatAt: Date;
  finishedAt: Date | null;
}> {
  return await requireOwnedRun(actorUserId, input.runId);
}

export async function cancelRun(
  actorUserId: string,
  input: { runId: string },
): Promise<{ status: "cancelled" }> {
  agentRunAbortRegistry.abort(input.runId);
  await completeAgentRun(actorUserId, { runId: input.runId, status: "cancelled" });
  return { status: "cancelled" };
}

export async function findRunningChatRun(
  actorUserId: string,
  input: { conversationId: string },
): Promise<{ runId: string } | null> {
  const [row] = await db
    .select({ id: agentRun.id })
    .from(agentRun)
    .where(
      and(
        eq(agentRun.userId, actorUserId),
        eq(agentRun.conversationId, input.conversationId),
        eq(agentRun.kind, "chat"),
        eq(agentRun.status, "running"),
      ),
    )
    .limit(1);

  return row ? { runId: row.id } : null;
}
