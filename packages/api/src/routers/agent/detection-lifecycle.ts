import { db } from "@orch/db";
import { agentRun, dashboardConversation } from "@orch/db/schema";
import { and, desc, eq } from "drizzle-orm";

import { appendObservation } from "./memory-service";
import { completeAgentRun, insertAgentRun } from "./run-service";

export const DETECTION_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function shouldStartDetection(lastDetectionAt: Date | null, now: Date): boolean {
  if (!lastDetectionAt) return true;
  return now.getTime() - lastDetectionAt.getTime() >= DETECTION_INTERVAL_MS;
}

async function latestConversationForUser(userId: string) {
  const [row] = await db
    .select({ id: dashboardConversation.id })
    .from(dashboardConversation)
    .where(eq(dashboardConversation.userId, userId))
    .orderBy(desc(dashboardConversation.updatedAt), desc(dashboardConversation.id))
    .limit(1);
  return row ?? null;
}

async function lastDetectionAtForUser(userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ startedAt: agentRun.startedAt })
    .from(agentRun)
    .where(and(eq(agentRun.userId, userId), eq(agentRun.kind, "detection")))
    .orderBy(desc(agentRun.startedAt))
    .limit(1);
  return row?.startedAt ?? null;
}

export async function runDueDetections(now = new Date()): Promise<{ startedCount: number }> {
  const users = await db
    .selectDistinct({ userId: dashboardConversation.userId })
    .from(dashboardConversation);

  let startedCount = 0;
  for (const { userId } of users) {
    const lastAt = await lastDetectionAtForUser(userId);
    if (!shouldStartDetection(lastAt, now)) continue;
    const conversation = await latestConversationForUser(userId);
    if (!conversation) continue;

    const { runId } = await insertAgentRun(userId, {
      conversationId: conversation.id,
      kind: "detection",
      model: "openrouter/auto-beta",
    });
    await appendObservation(userId, {
      observedOn: now.toISOString().slice(0, 10),
      kind: "presence",
      summary: "Checked in while you were away.",
      evidence: { runId },
    });
    await completeAgentRun(userId, { runId, status: "succeeded" });
    startedCount += 1;
  }

  return { startedCount };
}
