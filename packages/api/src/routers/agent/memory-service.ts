import { type MemoryPromptParts } from "@orch/agent";
import { db } from "@orch/db";
import { agentFact, agentObservation, profileNote } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";

export type InboxNoteRecord = {
  id: string;
  runId: string | null;
  kind: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export async function listInbox(
  actorUserId: string,
  input: { unreadOnly?: boolean },
): Promise<{ notes: InboxNoteRecord[] }> {
  const rows = await db
    .select()
    .from(profileNote)
    .where(
      input.unreadOnly
        ? and(eq(profileNote.userId, actorUserId), isNull(profileNote.readAt))
        : eq(profileNote.userId, actorUserId),
    )
    .orderBy(desc(profileNote.createdAt))
    .limit(50);

  return {
    notes: rows.map((row) => ({
      id: row.id,
      runId: row.runId,
      kind: row.kind,
      title: row.title,
      body: row.body,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function markInboxRead(
  actorUserId: string,
  input: { noteId: string },
): Promise<{ noteId: string; readAt: string }> {
  const [row] = await db
    .select({ id: profileNote.id })
    .from(profileNote)
    .where(and(eq(profileNote.id, input.noteId), eq(profileNote.userId, actorUserId)))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Inbox note was not found." });
  }

  const readAt = new Date();
  await db
    .update(profileNote)
    .set({ readAt })
    .where(and(eq(profileNote.id, input.noteId), eq(profileNote.userId, actorUserId)));

  return { noteId: input.noteId, readAt: readAt.toISOString() };
}

export async function insertInboxNote(
  actorUserId: string,
  input: { runId?: string; kind: "finish" | "pattern" | "nudge"; title: string; body: string },
): Promise<{ noteId: string }> {
  const noteId = createWorkspaceId("agent-note");
  await db.insert(profileNote).values({
    id: noteId,
    userId: actorUserId,
    runId: input.runId ?? null,
    kind: input.kind,
    title: input.title,
    body: input.body,
    readAt: null,
    createdAt: new Date(),
  });
  return { noteId };
}

export async function upsertFact(
  actorUserId: string,
  input: { key: string; value: string; sourceRunId?: string },
): Promise<{ key: string }> {
  const now = new Date();
  const id = createWorkspaceId("agent-fact");
  await db
    .insert(agentFact)
    .values({
      id,
      userId: actorUserId,
      key: input.key.trim(),
      value: input.value.trim(),
      sourceRunId: input.sourceRunId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agentFact.userId, agentFact.key],
      set: {
        value: input.value.trim(),
        sourceRunId: input.sourceRunId ?? null,
        updatedAt: now,
      },
    });
  return { key: input.key.trim() };
}

export async function appendObservation(
  actorUserId: string,
  input: { observedOn: string; kind: string; summary: string; evidence?: unknown },
): Promise<{ observationId: string }> {
  const observationId = createWorkspaceId("agent-obs");
  await db.insert(agentObservation).values({
    id: observationId,
    userId: actorUserId,
    observedOn: input.observedOn,
    kind: input.kind,
    summary: input.summary,
    evidence: input.evidence ?? null,
    createdAt: new Date(),
  });
  return { observationId };
}

export async function getMemoryForPrompt(
  actorUserId: string,
  input: Record<string, never>,
): Promise<MemoryPromptParts> {
  void input;
  const [facts, observations, inbox] = await Promise.all([
    db
      .select({ key: agentFact.key, value: agentFact.value })
      .from(agentFact)
      .where(eq(agentFact.userId, actorUserId))
      .orderBy(agentFact.key)
      .limit(40),
    db
      .select({
        observedOn: agentObservation.observedOn,
        summary: agentObservation.summary,
      })
      .from(agentObservation)
      .where(eq(agentObservation.userId, actorUserId))
      .orderBy(desc(agentObservation.createdAt))
      .limit(14),
    db
      .select({ title: profileNote.title, body: profileNote.body })
      .from(profileNote)
      .where(and(eq(profileNote.userId, actorUserId), isNull(profileNote.readAt)))
      .orderBy(desc(profileNote.createdAt))
      .limit(10),
  ]);

  return {
    facts: facts.map((fact) => `- ${fact.key}: ${fact.value}`).join("\n"),
    recentObservations: observations
      .map((observation) => `- ${observation.observedOn}: ${observation.summary}`)
      .join("\n"),
    unreadInbox: inbox.map((note) => `- ${note.title}: ${note.body}`).join("\n"),
  };
}
