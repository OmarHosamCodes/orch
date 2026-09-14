import { db } from "@orch/db";
import {
  agencyOpsProjectTask,
  agencyOpsTimeEntry,
  notificationDigestSent,
  notificationDeliverySettings,
  workspaceTeam,
  workspaceTeamMember,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import {
  DIGEST_LOCAL_HOUR,
  getLocalDateString,
  getLocalHour,
  getLocalYesterdayDateString,
} from "@orch/api/routers/notifications/delivery-policy";
import {
  emitTeamDigestNotification,
  flushDueDeferredNotificationPushes,
} from "@orch/api/routers/notifications/service";

function localDayRangeUtc(day: string, timeZone: string): { start: Date; end: Date } | null {
  // Approximate local day bounds via iterative scan of UTC hours mapped into the zone.
  const startGuess = new Date(`${day}T00:00:00.000Z`);
  let start: Date | null = null;
  let end: Date | null = null;
  for (let offsetHours = -36; offsetHours <= 36; offsetHours += 1) {
    const candidate = new Date(startGuess.getTime() + offsetHours * 60 * 60 * 1000);
    const local = getLocalDateString(candidate, timeZone);
    if (local === day && !start) start = candidate;
    if (start && local !== day) {
      end = candidate;
      break;
    }
  }
  if (!start || !end) return null;
  return { start, end };
}

async function alreadySentDigest(teamId: string, recipientUserId: string, digestDate: string) {
  const [row] = await db
    .select({ id: notificationDigestSent.id })
    .from(notificationDigestSent)
    .where(
      and(
        eq(notificationDigestSent.teamId, teamId),
        eq(notificationDigestSent.recipientUserId, recipientUserId),
        eq(notificationDigestSent.digestDate, digestDate),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function markDigestSent(teamId: string, recipientUserId: string, digestDate: string) {
  await db
    .insert(notificationDigestSent)
    .values({
      id: createWorkspaceId("notification-digest"),
      teamId,
      recipientUserId,
      digestDate,
      createdAt: new Date(),
    })
    .onConflictDoNothing({
      target: [
        notificationDigestSent.teamId,
        notificationDigestSent.recipientUserId,
        notificationDigestSent.digestDate,
      ],
    });
}

async function digestStatsForRange(teamId: string, range: { start: Date; end: Date }) {
  const [hoursRow] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)::int`,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, teamId),
        gte(agencyOpsTimeEntry.endedAt, range.start),
        lt(agencyOpsTimeEntry.endedAt, range.end),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    );

  const [tasksRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agencyOpsProjectTask)
    .where(
      and(
        eq(agencyOpsProjectTask.teamId, teamId),
        eq(agencyOpsProjectTask.status, "done"),
        gte(agencyOpsProjectTask.updatedAt, range.start),
        lt(agencyOpsProjectTask.updatedAt, range.end),
      ),
    );

  return {
    digestHoursSeconds: hoursRow?.totalSeconds ?? 0,
    digestTasksCompleted: tasksRow?.count ?? 0,
  };
}

async function runMemberDigest(input: {
  teamId: string;
  userId: string;
  timezone: string;
  now: Date;
}) {
  const localHour = getLocalHour(input.now, input.timezone);
  if (localHour !== DIGEST_LOCAL_HOUR) return;

  const digestDate = getLocalYesterdayDateString(input.now, input.timezone);
  if (!digestDate) return;
  if (await alreadySentDigest(input.teamId, input.userId, digestDate)) return;

  const range = localDayRangeUtc(digestDate, input.timezone);
  if (!range) return;

  const stats = await digestStatsForRange(input.teamId, range);
  await markDigestSent(input.teamId, input.userId, digestDate);

  if (stats.digestHoursSeconds === 0 && stats.digestTasksCompleted === 0) {
    return;
  }

  await emitTeamDigestNotification(null, {
    teamId: input.teamId,
    recipientUserId: input.userId,
    digestDate,
    digestHoursSeconds: stats.digestHoursSeconds,
    digestTasksCompleted: stats.digestTasksCompleted,
  });
}

async function runNotificationDigestTick() {
  const now = new Date();
  await flushDueDeferredNotificationPushes(null, {});

  const teams = await db.select({ id: workspaceTeam.id }).from(workspaceTeam);

  for (const team of teams) {
    const members = await db
      .select({ userId: workspaceTeamMember.userId })
      .from(workspaceTeamMember)
      .where(eq(workspaceTeamMember.teamId, team.id));

    for (const member of members) {
      const [settings] = await db
        .select({
          timezone: notificationDeliverySettings.timezone,
        })
        .from(notificationDeliverySettings)
        .where(
          and(
            eq(notificationDeliverySettings.userId, member.userId),
            eq(notificationDeliverySettings.teamId, team.id),
          ),
        )
        .limit(1);

      const timezone = settings?.timezone ?? "UTC";
      await runMemberDigest({
        teamId: team.id,
        userId: member.userId,
        timezone,
        now,
      });
    }
  }
}

export function startNotificationDigestScheduler() {
  const intervalMs = 60 * 60 * 1000;
  void runNotificationDigestTick();
  setInterval(() => {
    void runNotificationDigestTick();
  }, intervalMs);
}
