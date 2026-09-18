import { db } from "@orch/db";
import {
  workspaceTeamMember,
  user,
  agencyOpsMemberCapacity,
  agencyOpsMemberLeave,
  agencyOpsTimeEntry,
} from "@orch/db/schema";
import { eq, asc, and, inArray, gte, lte, sql, sum, isNull, lt } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import { buildHeatDays, expandLeaveDays } from "../member-profile/member-profile-heat";
import {
  localDateKeyFromInstant,
  localInstantFromDateKey,
} from "../time-tracking/local-week-bounds";
import type { memberLeaveSchema, memberProfileHeatDaySchema } from "../member-profile/schemas";
import type { z } from "zod";
import { loadTeamWorkSchedule } from "./load-team-work-schedule";

type MemberLeave = z.infer<typeof memberLeaveSchema>;
type HeatDay = z.infer<typeof memberProfileHeatDaySchema>;

type AgencyCapacityWeek = {
  weekStart: string;
  members: Array<{
    userId: string;
    userName: string;
    capacitySeconds: number;
    bookedSeconds: number;
    loggedSeconds: number;
  }>;
};

export async function listMemberCapacity(
  actorUserId: string,
  input: { teamId: string; weekStart: string; weeks: number },
): Promise<{ weeks: AgencyCapacityWeek[] }> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const weekStartRaw = parseIsoDateTime(input.weekStart, "weekStart");
  // Normalize to exact UTC midnight so map keys are consistent with date_trunc output.
  const weekStartDate = new Date(
    Date.UTC(weekStartRaw.getUTCFullYear(), weekStartRaw.getUTCMonth(), weekStartRaw.getUTCDate()),
  );

  const weekStarts: Date[] = Array.from({ length: input.weeks }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d;
  });

  const weekStartStrings = weekStarts.map((d) => d.toISOString());

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  if (members.length === 0) return { weeks: [] };

  const userIds = members.map((m) => m.userId);

  const capacityRows = await db
    .select()
    .from(agencyOpsMemberCapacity)
    .where(
      and(
        eq(agencyOpsMemberCapacity.teamId, input.teamId),
        inArray(agencyOpsMemberCapacity.userId, userIds),
        gte(agencyOpsMemberCapacity.weekStart, weekStarts[0]!),
        lte(agencyOpsMemberCapacity.weekStart, weekStarts[weekStarts.length - 1]!),
      ),
    );

  const lastWeekEnd = new Date(weekStarts[weekStarts.length - 1]!);
  lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() + 7);

  const loggedRows = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      weekStart:
        sql<Date>`date_trunc('week', ${agencyOpsTimeEntry.startedAt} AT TIME ZONE 'UTC')`.as(
          "week_start",
        ),
      loggedSeconds: sum(agencyOpsTimeEntry.durationSeconds).as("logged_seconds"),
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        inArray(agencyOpsTimeEntry.userId, userIds),
        gte(agencyOpsTimeEntry.startedAt, weekStarts[0]!),
        lt(agencyOpsTimeEntry.startedAt, lastWeekEnd),
      ),
    )
    .groupBy(
      agencyOpsTimeEntry.userId,
      sql`date_trunc('week', ${agencyOpsTimeEntry.startedAt} AT TIME ZONE 'UTC')`,
    );

  const capacityKey = (userId: string, weekIso: string) => `${userId}:${weekIso}`;
  const capacityMap = new Map<string, number>();
  for (const row of capacityRows) {
    capacityMap.set(capacityKey(row.userId, row.weekStart.toISOString()), row.capacitySeconds);
  }

  const loggedMap = new Map<string, number>();
  for (const row of loggedRows) {
    const weekIso = new Date(row.weekStart).toISOString();
    loggedMap.set(capacityKey(row.userId, weekIso), Number(row.loggedSeconds ?? 0));
  }

  const weeks: AgencyCapacityWeek[] = weekStartStrings.map((weekIso) => ({
    weekStart: weekIso,
    members: members.map((m) => ({
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      capacitySeconds: capacityMap.get(capacityKey(m.userId, weekIso)) ?? 0,
      bookedSeconds: 0,
      loggedSeconds: loggedMap.get(capacityKey(m.userId, weekIso)) ?? 0,
    })),
  }));

  return { weeks };
}

export async function setMemberCapacity(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    weekStart: string;
    capacitySeconds: number;
  },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const weekStartDate = parseIsoDateTime(input.weekStart, "weekStart");
  const { weekStartsOn } = await loadTeamWorkSchedule(input.teamId);

  if (weekStartDate.getUTCDay() !== weekStartsOn) {
    throw new ORPCError("BAD_REQUEST", {
      message: `weekStart must match the team week start day (${weekStartsOn}, UTC).`,
    });
  }

  // Require exact midnight so keys join correctly with listing functions.
  if (
    weekStartDate.getUTCHours() !== 0 ||
    weekStartDate.getUTCMinutes() !== 0 ||
    weekStartDate.getUTCSeconds() !== 0 ||
    weekStartDate.getUTCMilliseconds() !== 0
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "weekStart must be at exactly midnight UTC (e.g. 2025-05-12T00:00:00.000Z).",
    });
  }

  const now = new Date();
  const [upserted] = await db
    .insert(agencyOpsMemberCapacity)
    .values({
      id: createWorkspaceId("agency-cap"),
      teamId: input.teamId,
      userId: input.userId,
      weekStart: weekStartDate,
      capacitySeconds: input.capacitySeconds,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        agencyOpsMemberCapacity.teamId,
        agencyOpsMemberCapacity.userId,
        agencyOpsMemberCapacity.weekStart,
      ],
      set: { capacitySeconds: input.capacitySeconds, updatedAt: now },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    userId: upserted.userId,
    weekStart: upserted.weekStart.toISOString(),
    capacitySeconds: upserted.capacitySeconds,
  };
}

function mapLeave(row: typeof agencyOpsMemberLeave.$inferSelect): MemberLeave {
  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    startDate: row.startDate,
    endDate: row.endDate,
    type: row.type,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Team leave overlapping an inclusive YYYY-MM-DD window (member + team holidays). */
export async function listTeamLeave(
  actorUserId: string,
  input: { teamId: string; fromDate: string; toDate: string },
): Promise<{ items: MemberLeave[] }> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.toDate)) {
    throw new ORPCError("BAD_REQUEST", { message: "fromDate and toDate must be YYYY-MM-DD." });
  }
  if (input.fromDate > input.toDate) {
    throw new ORPCError("BAD_REQUEST", { message: "fromDate must be on or before toDate." });
  }

  const rows = await db
    .select()
    .from(agencyOpsMemberLeave)
    .where(
      and(
        eq(agencyOpsMemberLeave.teamId, input.teamId),
        lte(agencyOpsMemberLeave.startDate, input.toDate),
        gte(agencyOpsMemberLeave.endDate, input.fromDate),
      ),
    )
    .orderBy(asc(agencyOpsMemberLeave.startDate), asc(agencyOpsMemberLeave.endDate));

  return { items: rows.map(mapLeave) };
}

function assertDateKey(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ORPCError("BAD_REQUEST", { message: `${field} must be YYYY-MM-DD.` });
  }
}

/** Team daily heat: logged hours + leave/off overlay per member (member-profile heat shape). */
export async function listTeamActivityHeat(
  actorUserId: string,
  input: {
    teamId: string;
    fromDate: string;
    toDate: string;
    utcOffsetMinutes: number;
  },
): Promise<{
  fromDate: string;
  toDate: string;
  members: Array<{ userId: string; userName: string; days: HeatDay[] }>;
}> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  assertDateKey(input.fromDate, "fromDate");
  assertDateKey(input.toDate, "toDate");
  if (input.fromDate > input.toDate) {
    throw new ORPCError("BAD_REQUEST", { message: "fromDate must be on or before toDate." });
  }

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  if (members.length === 0) {
    return { fromDate: input.fromDate, toDate: input.toDate, members: [] };
  }

  const rangeStart = localInstantFromDateKey(input.fromDate, input.utcOffsetMinutes);
  const rangeEnd = localInstantFromDateKey(input.toDate, input.utcOffsetMinutes, true);
  const userIds = members.map((member) => member.userId);

  const [leaveRows, entryRows] = await Promise.all([
    db
      .select()
      .from(agencyOpsMemberLeave)
      .where(
        and(
          eq(agencyOpsMemberLeave.teamId, input.teamId),
          lte(agencyOpsMemberLeave.startDate, input.toDate),
          gte(agencyOpsMemberLeave.endDate, input.fromDate),
        ),
      ),
    db
      .select({
        userId: agencyOpsTimeEntry.userId,
        startedAt: agencyOpsTimeEntry.startedAt,
        durationSeconds: agencyOpsTimeEntry.durationSeconds,
      })
      .from(agencyOpsTimeEntry)
      .where(
        and(
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          isNull(agencyOpsTimeEntry.deletedAt),
          inArray(agencyOpsTimeEntry.userId, userIds),
          gte(agencyOpsTimeEntry.startedAt, rangeStart),
          lt(agencyOpsTimeEntry.startedAt, rangeEnd),
        ),
      ),
  ]);

  const teamLeave = leaveRows
    .filter((row) => row.userId == null)
    .map((row) => ({
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      reason: row.reason,
    }));

  const leaveByUser = new Map<string, typeof teamLeave>();
  for (const row of leaveRows) {
    if (row.userId == null) continue;
    const list = leaveByUser.get(row.userId) ?? [];
    list.push({
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      reason: row.reason,
    });
    leaveByUser.set(row.userId, list);
  }

  const secondsByUserDate = new Map<string, Map<string, number>>();
  for (const entry of entryRows) {
    const date = localDateKeyFromInstant(entry.startedAt, input.utcOffsetMinutes);
    if (date < input.fromDate || date > input.toDate) continue;
    const byDate = secondsByUserDate.get(entry.userId) ?? new Map<string, number>();
    byDate.set(date, (byDate.get(date) ?? 0) + entry.durationSeconds);
    secondsByUserDate.set(entry.userId, byDate);
  }

  return {
    fromDate: input.fromDate,
    toDate: input.toDate,
    members: members.map((member) => {
      const memberLeave = [...teamLeave, ...(leaveByUser.get(member.userId) ?? [])];
      const leaveByDate = expandLeaveDays(memberLeave, input.fromDate, input.toDate);
      const days = buildHeatDays({
        windowStart: input.fromDate,
        windowEnd: input.toDate,
        secondsByDate: secondsByUserDate.get(member.userId) ?? new Map(),
        leaveByDate,
      });
      return {
        userId: member.userId,
        userName: member.userName ?? "Unknown",
        days,
      };
    }),
  };
}
