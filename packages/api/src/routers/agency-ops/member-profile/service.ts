import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsDepartment,
  agencyOpsMemberHrProfile,
  agencyOpsMemberLeave,
  agencyOpsMemberReview,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsTenurePolicy,
  agencyOpsTimeEntry,
  user,
  workspaceTeamMember,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import type { z } from "zod";

import { loadTeamWorkSchedule } from "../resourcing/load-team-work-schedule";
import { resolveProfilePeriodMonth, toFiscalCalendar } from "../resourcing/tenure-engine";
import { requireTeamMembership } from "../shared/membership";
import { isAgencyEntityIconKey, type AgencyEntityIconKey } from "../shared/entity-icon-catalog";
import { resolveEntryWaste } from "../shared/waste-helpers";
import {
  addDaysToDateKey,
  getLocalWeekBounds,
  localDateKeyFromInstant,
  localInstantFromDateKey,
} from "../time-tracking/local-week-bounds";
import { buildHeatDays, expandLeaveDays } from "./member-profile-heat";
import {
  buildCalendarMonth,
  buildLeaveBalances,
  buildWeekHours,
  DEFAULT_OFF_ALLOWANCE_DAYS,
} from "./member-profile-hr";
import { buildLeaveActivity, buildTimeEntryActivity } from "./member-profile-timeline";
import {
  normalizeHttpUrl,
  type memberHrProfileSchema,
  type memberLeaveSchema,
  type memberProfileSchema,
  type memberReviewSchema,
} from "./schemas";

type MemberLeave = z.infer<typeof memberLeaveSchema>;
type MemberReview = z.infer<typeof memberReviewSchema>;
type MemberProfile = z.infer<typeof memberProfileSchema>;
type MemberHrProfile = z.infer<typeof memberHrProfileSchema>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDateKey(value: string, label: string) {
  if (!DATE_RE.test(value)) {
    throw new ORPCError("BAD_REQUEST", { message: `Invalid ${label}` });
  }
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

function defaultHrProfile(): MemberHrProfile {
  return {
    status: "active",
    departmentId: null,
    departmentName: null,
    employmentType: null,
    workModel: null,
    gender: null,
    dateOfBirth: null,
    phone: null,
    address: null,
    linkedinUrl: null,
    xUrl: null,
    instagramUrl: null,
    offAllowanceDays: DEFAULT_OFF_ALLOWANCE_DAYS,
    leaveAllowancePeriod: "year",
  };
}

function asEntityIconKey(value: string | null | undefined): AgencyEntityIconKey | null {
  return isAgencyEntityIconKey(value) ? value : null;
}

function mapHrProfile(
  row: typeof agencyOpsMemberHrProfile.$inferSelect,
  departmentName: string | null = null,
): MemberHrProfile {
  return {
    status: row.status,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentId ? departmentName : null,
    employmentType: row.employmentType,
    workModel: row.workModel,
    gender: row.gender,
    dateOfBirth: row.dateOfBirth,
    phone: row.phone,
    address: row.address,
    linkedinUrl: row.linkedinUrl,
    xUrl: row.xUrl,
    instagramUrl: row.instagramUrl,
    offAllowanceDays: row.offAllowanceDays,
    leaveAllowancePeriod: row.leaveAllowancePeriod ?? "year",
  };
}

async function loadDepartmentName(teamId: string, departmentId: string | null) {
  if (!departmentId) return null;
  const [row] = await db
    .select({ name: agencyOpsDepartment.name })
    .from(agencyOpsDepartment)
    .where(and(eq(agencyOpsDepartment.id, departmentId), eq(agencyOpsDepartment.teamId, teamId)))
    .limit(1);
  return row?.name ?? null;
}

async function assertDepartmentOnTeam(teamId: string, departmentId: string) {
  const [row] = await db
    .select({ id: agencyOpsDepartment.id })
    .from(agencyOpsDepartment)
    .where(and(eq(agencyOpsDepartment.id, departmentId), eq(agencyOpsDepartment.teamId, teamId)))
    .limit(1);
  if (!row) {
    throw new ORPCError("BAD_REQUEST", { message: "Department was not found on this team." });
  }
}

async function requireSubjectMembership(teamId: string, userId: string) {
  const [membership] = await db
    .select({
      role: workspaceTeamMember.role,
      joinedAt: workspaceTeamMember.createdAt,
      userName: user.name,
      userAvatar: user.image,
      email: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, userId)))
    .limit(1);

  if (!membership) {
    throw new ORPCError("NOT_FOUND", { message: "Member not found on this team" });
  }
  return membership;
}

function isManagerRole(role: "owner" | "editor" | "viewer") {
  return role === "owner" || role === "editor";
}

export async function getMemberProfile(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    utcOffsetMinutes: number;
    from: string;
    to: string;
    calendarMonth?: string;
    periodMonthStart?: string;
  },
): Promise<MemberProfile> {
  const actorRole = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const subject = await requireSubjectMembership(input.teamId, input.userId);

  const rangeStart = new Date(input.from);
  const rangeEnd = new Date(input.to);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid range" });
  }
  if (rangeEnd.getTime() < rangeStart.getTime()) {
    throw new ORPCError("BAD_REQUEST", { message: "to must be on or after from" });
  }

  const startDate = localDateKeyFromInstant(rangeStart, input.utcOffsetMinutes);
  const endDate = localDateKeyFromInstant(rangeEnd, input.utcOffsetMinutes);

  const [schedule, policyRow] = await Promise.all([
    loadTeamWorkSchedule(input.teamId),
    db
      .select()
      .from(agencyOpsTenurePolicy)
      .where(eq(agencyOpsTenurePolicy.teamId, input.teamId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);
  const { weekStartsOn, weekendDurationDays } = schedule;
  const fiscalCalendar = toFiscalCalendar({
    fiscalYearStartMonth: policyRow?.fiscalYearStartMonth ?? 1,
    fiscalYearStartDay: policyRow?.fiscalYearStartDay ?? 1,
  });
  const legacyCalendarMonthStart = input.calendarMonth ? `${input.calendarMonth}-01` : undefined;
  const periodMonth = resolveProfilePeriodMonth({
    tenureEnabled: policyRow?.enabled ?? false,
    calendar: fiscalCalendar,
    anchorDateKey: endDate,
    requestedStartKey: input.periodMonthStart ?? legacyCalendarMonthStart,
  });
  const monthStart = periodMonth.startKey;
  const monthEnd = periodMonth.endKey;

  const leaveFrom = [startDate, monthStart].sort()[0]!;
  const leaveTo = [endDate, monthEnd].sort().at(-1)!;
  const weekBounds = getLocalWeekBounds(rangeEnd, input.utcOffsetMinutes, weekStartsOn);

  const entryFromKey = [startDate, weekBounds.weekStartKey, monthStart].sort()[0]!;
  const entryToKey = [endDate, addDaysToDateKey(weekBounds.weekStartKey, 6), monthEnd]
    .sort()
    .at(-1)!;
  const entryFrom = localInstantFromDateKey(entryFromKey, input.utcOffsetMinutes);
  const entryTo = localInstantFromDateKey(entryToKey, input.utcOffsetMinutes, true);

  const [entries, leaveRows, reviewRows, hrRow] = await Promise.all([
    db
      .select({
        id: agencyOpsTimeEntry.id,
        teamId: agencyOpsTimeEntry.teamId,
        userId: agencyOpsTimeEntry.userId,
        projectId: agencyOpsTimeEntry.projectId,
        taskId: agencyOpsTimeEntry.taskId,
        source: agencyOpsTimeEntry.source,
        description: agencyOpsTimeEntry.description,
        isBillable: agencyOpsTimeEntry.isBillable,
        isWaste: agencyOpsTimeEntry.isWaste,
        startedAt: agencyOpsTimeEntry.startedAt,
        endedAt: agencyOpsTimeEntry.endedAt,
        durationSeconds: agencyOpsTimeEntry.durationSeconds,
        createdAt: agencyOpsTimeEntry.createdAt,
        updatedAt: agencyOpsTimeEntry.updatedAt,
        projectName: agencyOpsProject.name,
        clientId: agencyOpsClient.id,
        clientName: agencyOpsClient.name,
        colorHueId: agencyOpsProject.colorHueId,
        projectIconKey: agencyOpsProject.iconKey,
        taskTitle: agencyOpsProjectTask.title,
        taskIconKey: agencyOpsProjectTask.iconKey,
        taskIsWaste: agencyOpsProjectTask.isWaste,
      })
      .from(agencyOpsTimeEntry)
      .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
      .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
      .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
      .where(
        and(
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          eq(agencyOpsTimeEntry.userId, input.userId),
          isNull(agencyOpsTimeEntry.deletedAt),
          gte(agencyOpsTimeEntry.startedAt, entryFrom),
          lte(agencyOpsTimeEntry.startedAt, entryTo),
        ),
      )
      .orderBy(desc(agencyOpsTimeEntry.startedAt))
      .limit(4_000),
    db
      .select()
      .from(agencyOpsMemberLeave)
      .where(
        and(
          eq(agencyOpsMemberLeave.teamId, input.teamId),
          or(isNull(agencyOpsMemberLeave.userId), eq(agencyOpsMemberLeave.userId, input.userId)),
          lte(agencyOpsMemberLeave.startDate, leaveTo),
          gte(agencyOpsMemberLeave.endDate, leaveFrom),
        ),
      )
      .orderBy(asc(agencyOpsMemberLeave.startDate)),
    db
      .select({
        id: agencyOpsMemberReview.id,
        teamId: agencyOpsMemberReview.teamId,
        subjectUserId: agencyOpsMemberReview.subjectUserId,
        authorUserId: agencyOpsMemberReview.authorUserId,
        authorName: user.name,
        authorAvatar: user.image,
        reviewDate: agencyOpsMemberReview.reviewDate,
        body: agencyOpsMemberReview.body,
        createdAt: agencyOpsMemberReview.createdAt,
        updatedAt: agencyOpsMemberReview.updatedAt,
      })
      .from(agencyOpsMemberReview)
      .innerJoin(user, eq(user.id, agencyOpsMemberReview.authorUserId))
      .where(
        and(
          eq(agencyOpsMemberReview.teamId, input.teamId),
          eq(agencyOpsMemberReview.subjectUserId, input.userId),
          gte(agencyOpsMemberReview.reviewDate, startDate),
          lte(agencyOpsMemberReview.reviewDate, endDate),
        ),
      )
      .orderBy(desc(agencyOpsMemberReview.reviewDate), desc(agencyOpsMemberReview.createdAt)),
    db
      .select({
        hr: agencyOpsMemberHrProfile,
        departmentName: agencyOpsDepartment.name,
      })
      .from(agencyOpsMemberHrProfile)
      .leftJoin(
        agencyOpsDepartment,
        eq(agencyOpsDepartment.id, agencyOpsMemberHrProfile.departmentId),
      )
      .where(
        and(
          eq(agencyOpsMemberHrProfile.teamId, input.teamId),
          eq(agencyOpsMemberHrProfile.userId, input.userId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const secondsByDate = new Map<string, number>();
  let periodTotalSeconds = 0;
  let periodWasteSeconds = 0;
  for (const entry of entries) {
    const date = localDateKeyFromInstant(entry.startedAt, input.utcOffsetMinutes);
    const next = (secondsByDate.get(date) ?? 0) + entry.durationSeconds;
    secondsByDate.set(date, next);
    if (date >= startDate && date <= endDate) {
      periodTotalSeconds += entry.durationSeconds;
      if (resolveEntryWaste(entry)) periodWasteSeconds += entry.durationSeconds;
    }
  }

  const allLeave = leaveRows.map(mapLeave);
  const leave = allLeave.filter((row) => row.endDate >= startDate && row.startDate <= endDate);
  const leaveByDate = expandLeaveDays(
    leave.map((row) => ({
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      reason: row.reason,
    })),
    startDate,
    endDate,
  );

  const heatDays = buildHeatDays({
    windowStart: startDate,
    windowEnd: endDate,
    secondsByDate,
    leaveByDate,
  });

  type TimelineItem =
    | {
        kind: "review";
        id: string;
        date: string;
        createdAt: string;
        authorUserId: string;
        authorName: string;
        authorAvatar: string | null;
        body: string;
      }
    | ReturnType<typeof buildTimeEntryActivity>
    | NonNullable<ReturnType<typeof buildLeaveActivity>>;

  const itemsByDate = new Map<string, TimelineItem[]>();

  for (const review of reviewRows) {
    const item: TimelineItem = {
      kind: "review",
      id: review.id,
      date: review.reviewDate,
      createdAt: review.createdAt.toISOString(),
      authorUserId: review.authorUserId,
      authorName: review.authorName,
      authorAvatar: review.authorAvatar,
      body: review.body,
    };
    const list = itemsByDate.get(review.reviewDate) ?? [];
    list.push(item);
    itemsByDate.set(review.reviewDate, list);
  }

  const periodEntries = entries.filter((entry) => {
    const date = localDateKeyFromInstant(entry.startedAt, input.utcOffsetMinutes);
    return date >= startDate && date <= endDate;
  });
  for (const entry of periodEntries.slice(0, 400)) {
    const date = localDateKeyFromInstant(entry.startedAt, input.utcOffsetMinutes);
    const item = buildTimeEntryActivity({
      id: entry.id,
      date,
      createdAt: entry.updatedAt.toISOString(),
      description: entry.description,
      projectId: entry.projectId,
      projectName: entry.projectName,
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      taskIconKey: entry.taskId ? asEntityIconKey(entry.taskIconKey) : null,
      colorHueId: entry.colorHueId,
      projectIconKey: asEntityIconKey(entry.projectIconKey),
      clientId: entry.clientId,
      clientName: entry.clientName,
      durationSeconds: entry.durationSeconds,
      isWaste: entry.isWaste,
      taskIsWaste: entry.taskIsWaste ?? null,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt.toISOString(),
      teamId: entry.teamId,
      userId: entry.userId,
      userName: subject.userName,
      source: entry.source,
      isBillable: entry.isBillable,
    });
    const list = itemsByDate.get(date) ?? [];
    list.push(item);
    itemsByDate.set(date, list);
  }

  for (const row of leave) {
    const item = buildLeaveActivity({
      id: row.id,
      type: row.type,
      reason: row.reason,
      startDate: row.startDate,
      endDate: row.endDate,
      createdAt: row.createdAt,
      windowStart: startDate,
      windowEnd: endDate,
    });
    if (!item) continue;
    const list = itemsByDate.get(item.date) ?? [];
    list.push(item);
    itemsByDate.set(item.date, list);
  }

  const timeline = [...itemsByDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => {
        if (a.kind === "review" && b.kind !== "review") return -1;
        if (a.kind !== "review" && b.kind === "review") return 1;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    }));

  const isSelf = actorUserId === input.userId;
  const canAddReview = isManagerRole(actorRole);
  const canManageLeave = isSelf || canAddReview;
  const canEditHr = canAddReview;
  const hrProfile = hrRow ? mapHrProfile(hrRow.hr, hrRow.departmentName) : defaultHrProfile();

  const leaveBalances = buildLeaveBalances({
    period: hrProfile.leaveAllowancePeriod,
    anchorDate: endDate,
    leave: allLeave,
    offAllowanceDays: hrProfile.offAllowanceDays,
  });

  const weekHours = buildWeekHours(endDate, secondsByDate, weekStartsOn);
  const calendarMonth = buildCalendarMonth({
    periodStartKey: monthStart,
    periodEndKey: monthEnd,
    label: periodMonth.label,
    isTenureMonth: periodMonth.isTenureMonth,
    secondsByDate,
    weekStartsOn,
    weekendDurationDays,
    leave: allLeave.map((row) => ({
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      reason: row.reason,
    })),
  });

  return {
    teamId: input.teamId,
    userId: input.userId,
    userName: subject.userName,
    userAvatar: subject.userAvatar,
    email: subject.email,
    role: subject.role,
    joinedAt: subject.joinedAt.toISOString(),
    isSelf,
    canAddReview,
    canManageLeave,
    canEditHr,
    periodTotalSeconds,
    periodWasteSeconds,
    range: {
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    },
    heatMap: {
      startDate,
      endDate,
      days: heatDays,
    },
    leave,
    timeline,
    hrProfile,
    leaveBalances,
    weekHours,
    calendarMonth,
  };
}

export async function upsertMemberHrProfile(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    patch: Partial<MemberHrProfile>;
  },
): Promise<MemberHrProfile> {
  await requireTeamMembership(actorUserId, input.teamId, "editor");
  await requireSubjectMembership(input.teamId, input.userId);

  if (input.patch.dateOfBirth) assertDateKey(input.patch.dateOfBirth, "dateOfBirth");
  if (input.patch.departmentId) {
    await assertDepartmentOnTeam(input.teamId, input.patch.departmentId);
  }

  const [existing] = await db
    .select()
    .from(agencyOpsMemberHrProfile)
    .where(
      and(
        eq(agencyOpsMemberHrProfile.teamId, input.teamId),
        eq(agencyOpsMemberHrProfile.userId, input.userId),
      ),
    )
    .limit(1);

  const existingDepartmentName = existing
    ? await loadDepartmentName(input.teamId, existing.departmentId)
    : null;
  const base = existing ? mapHrProfile(existing, existingDepartmentName) : defaultHrProfile();
  const next: MemberHrProfile = {
    ...base,
    ...input.patch,
    departmentId:
      input.patch.departmentId === undefined ? base.departmentId : input.patch.departmentId,
    departmentName: null,
    gender: input.patch.gender === undefined ? base.gender : input.patch.gender?.trim() || null,
    phone: input.patch.phone === undefined ? base.phone : input.patch.phone?.trim() || null,
    address: input.patch.address === undefined ? base.address : input.patch.address?.trim() || null,
    linkedinUrl:
      input.patch.linkedinUrl === undefined
        ? base.linkedinUrl
        : normalizeHttpUrl(input.patch.linkedinUrl),
    xUrl: input.patch.xUrl === undefined ? base.xUrl : normalizeHttpUrl(input.patch.xUrl),
    instagramUrl:
      input.patch.instagramUrl === undefined
        ? base.instagramUrl
        : normalizeHttpUrl(input.patch.instagramUrl),
  };

  if (existing) {
    const [row] = await db
      .update(agencyOpsMemberHrProfile)
      .set({
        status: next.status,
        departmentId: next.departmentId,
        employmentType: next.employmentType,
        workModel: next.workModel,
        gender: next.gender,
        dateOfBirth: next.dateOfBirth,
        phone: next.phone,
        address: next.address,
        linkedinUrl: next.linkedinUrl,
        xUrl: next.xUrl,
        instagramUrl: next.instagramUrl,
        offAllowanceDays: next.offAllowanceDays,
        leaveAllowancePeriod: next.leaveAllowancePeriod,
      })
      .where(eq(agencyOpsMemberHrProfile.id, existing.id))
      .returning();
    if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
    const departmentName = await loadDepartmentName(input.teamId, row.departmentId);
    return mapHrProfile(row, departmentName);
  }

  const [row] = await db
    .insert(agencyOpsMemberHrProfile)
    .values({
      id: createWorkspaceId("agency-hr"),
      teamId: input.teamId,
      userId: input.userId,
      departmentId: next.departmentId,
      status: next.status,
      employmentType: next.employmentType,
      workModel: next.workModel,
      gender: next.gender,
      dateOfBirth: next.dateOfBirth,
      phone: next.phone,
      address: next.address,
      linkedinUrl: next.linkedinUrl,
      xUrl: next.xUrl,
      instagramUrl: next.instagramUrl,
      offAllowanceDays: next.offAllowanceDays,
      leaveAllowancePeriod: next.leaveAllowancePeriod,
    })
    .returning();

  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  const departmentName = await loadDepartmentName(input.teamId, row.departmentId);
  return mapHrProfile(row, departmentName);
}

export async function createMemberLeave(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string | null;
    startDate: string;
    endDate: string;
    type: MemberLeave["type"];
    reason?: string | null;
  },
): Promise<MemberLeave> {
  assertDateKey(input.startDate, "startDate");
  assertDateKey(input.endDate, "endDate");
  if (input.endDate < input.startDate) {
    throw new ORPCError("BAD_REQUEST", { message: "endDate must be on or after startDate" });
  }

  const role = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const isManager = isManagerRole(role);
  if (input.userId === null || input.type === "team_holiday") {
    if (!isManager) {
      throw new ORPCError("UNAUTHORIZED", { message: "Managers can add team holidays" });
    }
  } else if (input.userId !== actorUserId && !isManager) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (input.userId) {
    await requireSubjectMembership(input.teamId, input.userId);
  }

  const [row] = await db
    .insert(agencyOpsMemberLeave)
    .values({
      id: createWorkspaceId("agency-leave"),
      teamId: input.teamId,
      userId: input.type === "team_holiday" ? null : input.userId,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type === "team_holiday" ? "team_holiday" : input.type,
      reason: input.reason?.trim() || null,
      createdByUserId: actorUserId,
    })
    .returning();

  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return mapLeave(row);
}

export async function deleteMemberLeave(
  actorUserId: string,
  input: { teamId: string; leaveId: string },
): Promise<{ id: string }> {
  const role = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const [existing] = await db
    .select()
    .from(agencyOpsMemberLeave)
    .where(
      and(
        eq(agencyOpsMemberLeave.teamId, input.teamId),
        eq(agencyOpsMemberLeave.id, input.leaveId),
      ),
    )
    .limit(1);

  if (!existing) throw new ORPCError("NOT_FOUND");

  const isManager = isManagerRole(role);
  const canDelete =
    isManager ||
    existing.createdByUserId === actorUserId ||
    (existing.userId !== null && existing.userId === actorUserId);
  if (!canDelete) throw new ORPCError("UNAUTHORIZED");

  await db.delete(agencyOpsMemberLeave).where(eq(agencyOpsMemberLeave.id, input.leaveId));
  return { id: input.leaveId };
}

export async function createMemberReview(
  actorUserId: string,
  input: { teamId: string; subjectUserId: string; reviewDate: string; body: string },
): Promise<MemberReview> {
  assertDateKey(input.reviewDate, "reviewDate");
  const body = input.body.trim();
  if (!body) throw new ORPCError("BAD_REQUEST", { message: "Review body is required" });

  await requireTeamMembership(actorUserId, input.teamId, "editor");
  await requireSubjectMembership(input.teamId, input.subjectUserId);

  const [row] = await db
    .insert(agencyOpsMemberReview)
    .values({
      id: createWorkspaceId("agency-review"),
      teamId: input.teamId,
      subjectUserId: input.subjectUserId,
      authorUserId: actorUserId,
      reviewDate: input.reviewDate,
      body,
    })
    .returning();

  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const [author] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);

  return {
    id: row.id,
    teamId: row.teamId,
    subjectUserId: row.subjectUserId,
    authorUserId: row.authorUserId,
    authorName: author?.name ?? "Member",
    authorAvatar: author?.image ?? null,
    reviewDate: row.reviewDate,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteMemberReview(
  actorUserId: string,
  input: { teamId: string; reviewId: string },
): Promise<{ id: string }> {
  const role = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const [existing] = await db
    .select()
    .from(agencyOpsMemberReview)
    .where(
      and(
        eq(agencyOpsMemberReview.teamId, input.teamId),
        eq(agencyOpsMemberReview.id, input.reviewId),
      ),
    )
    .limit(1);

  if (!existing) throw new ORPCError("NOT_FOUND");

  if (!isManagerRole(role) && existing.authorUserId !== actorUserId) {
    throw new ORPCError("UNAUTHORIZED");
  }

  await db.delete(agencyOpsMemberReview).where(eq(agencyOpsMemberReview.id, input.reviewId));
  return { id: input.reviewId };
}
