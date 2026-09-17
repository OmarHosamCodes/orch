import { db } from "@orch/db";
import {
  agencyOpsDepartment,
  agencyOpsMemberHrProfile,
  agencyOpsMemberTenureProfile,
  agencyOpsTenurePolicy,
  agencyOpsTenureQuarterExemption,
  agencyOpsTimeEntry,
  user,
  workspaceTeamMember,
  type AgencyOpsTenureExemptionType,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, gte, inArray, isNull, lt, min, sql } from "drizzle-orm";

import {
  computeMemberTenure,
  fiscalQuarterLabel,
  formatTenureMonths,
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  toFiscalCalendar,
  type FiscalQuarter,
  type MemberTenureProfileInput,
  type QuarterEvaluation,
  type TenureExemptionInput,
  type TenurePolicyInput,
  type TenureQuarterStatus,
} from "./tenure-engine";
import { requireAgencyRole } from "../shared/membership";
import { invalidateTeamWorkScheduleCache } from "./load-team-work-schedule";

type TenurePolicyRecord = {
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  quarterlyMinHours: number;
  monthlyMinHours: number;
  penaltyMonths: number;
  internDurationMonths: number;
  internDurationWeeks: number;
  requiredDailyHours: number;
  weekStartsOn: number;
  weekendDurationDays: number;
  offDayReduceHours: number;
  policyEffectiveFrom: string;
  enabled: boolean;
};

type TenureProfileRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;
  internStart: string | null;
  internEnd: string | null;
  internCountsTowardTenure: boolean;
  internExemptFromQuarterMin: boolean;
  notes: string | null;
};

type TenureExemptionRecord = {
  id: string;
  type: AgencyOpsTenureExemptionType;
  fiscalYear: number;
  fiscalQuarter: FiscalQuarter;
  userId: string | null;
  userName: string | null;
  reducedMinHours: number | null;
  frozenMonth: number | null;
  reason: string | null;
  createdAt: string;
};

type QuarterSummaryRecord = {
  fiscalYear: number;
  fiscalQuarter: FiscalQuarter;
  label: string;
  periodStart: string;
  periodEnd: string;
  requiredHours: number;
  loggedHours: number;
  status: TenureQuarterStatus;
  penaltyMonthsApplied: number;
  prorated: boolean;
};

type MemberTenureSummaryRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;
  departmentId: string | null;
  departmentName: string | null;
  employmentType: string | null;
  workModel: string | null;
  status: "active" | "inactive" | null;
  hasContact: boolean;
  internStart: string | null;
  internEnd: string | null;
  internDerived: boolean;
  rawTenureMonths: number;
  rawTenureLabel: string;
  penaltyMonths: number;
  netTenureMonths: number;
  netTenureLabel: string;
  failedQuarterCount: number;
  awaitingFirstEntry: boolean;
  currentQuarter: QuarterSummaryRecord | null;
};

type MemberTenureDetailRecord = MemberTenureSummaryRecord & {
  internCountsTowardTenure: boolean;
  internExemptFromQuarterMin: boolean;
  notes: string | null;
  quarters: QuarterSummaryRecord[];
};

function toPolicyRecord(row: typeof agencyOpsTenurePolicy.$inferSelect): TenurePolicyRecord {
  return {
    fiscalYearStartMonth: row.fiscalYearStartMonth,
    fiscalYearStartDay: row.fiscalYearStartDay,
    quarterlyMinHours: row.quarterlyMinHours,
    monthlyMinHours: row.monthlyMinHours,
    penaltyMonths: row.penaltyMonths,
    internDurationMonths: row.internDurationMonths,
    internDurationWeeks: row.internDurationWeeks,
    requiredDailyHours: row.requiredDailyHours,
    weekStartsOn: row.weekStartsOn,
    weekendDurationDays: row.weekendDurationDays,
    offDayReduceHours: row.offDayReduceHours,
    policyEffectiveFrom: row.policyEffectiveFrom.toISOString(),
    enabled: row.enabled,
  };
}

function toPolicyInput(row: typeof agencyOpsTenurePolicy.$inferSelect): TenurePolicyInput {
  return {
    fiscalYearStartMonth: row.fiscalYearStartMonth,
    fiscalYearStartDay: row.fiscalYearStartDay,
    quarterlyMinHours: row.quarterlyMinHours,
    monthlyMinHours: row.monthlyMinHours,
    penaltyMonths: row.penaltyMonths,
    internDurationMonths: row.internDurationMonths,
    internDurationWeeks: row.internDurationWeeks,
    requiredDailyHours: row.requiredDailyHours,
    weekStartsOn: row.weekStartsOn,
    weekendDurationDays: row.weekendDurationDays,
    offDayReduceHours: row.offDayReduceHours,
    policyEffectiveFrom: row.policyEffectiveFrom,
    enabled: row.enabled,
  };
}

function defaultPolicyInput(): TenurePolicyInput {
  return {
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
    quarterlyMinHours: 525,
    monthlyMinHours: 200,
    penaltyMonths: 6,
    internDurationMonths: 4,
    internDurationWeeks: 0,
    requiredDailyHours: 8,
    weekStartsOn: 1,
    weekendDurationDays: 2,
    offDayReduceHours: 8,
    policyEffectiveFrom: new Date(),
    enabled: false,
  };
}

function toProfileInput(
  row: typeof agencyOpsMemberTenureProfile.$inferSelect | undefined,
): MemberTenureProfileInput {
  return {
    internStartOverride: row?.internStart ?? null,
    internEndOverride: row?.internEnd ?? null,
    internCountsTowardTenure: row?.internCountsTowardTenure ?? false,
    internExemptFromQuarterMin: row?.internExemptFromQuarterMin ?? true,
  };
}

function toExemptionInput(
  row: typeof agencyOpsTenureQuarterExemption.$inferSelect,
): TenureExemptionInput {
  return {
    type: row.type,
    fiscalYear: row.fiscalYear,
    fiscalQuarter: row.fiscalQuarter as FiscalQuarter,
    userId: row.userId,
    reducedMinHours: row.reducedMinHours,
    frozenMonth: row.frozenMonth,
  };
}

function quarterToRecord(quarter: QuarterEvaluation): QuarterSummaryRecord {
  return {
    fiscalYear: quarter.fiscalYear,
    fiscalQuarter: quarter.fiscalQuarter,
    label: fiscalQuarterLabel(quarter.fiscalYear, quarter.fiscalQuarter),
    periodStart: quarter.range.start.toISOString(),
    periodEnd: quarter.range.end.toISOString(),
    requiredHours: quarter.requiredHours,
    loggedHours: quarter.loggedHours,
    status: quarter.status,
    penaltyMonthsApplied: quarter.penaltyMonthsApplied,
    prorated: quarter.prorated,
  };
}

async function loadTeamMembers(teamId: string) {
  return db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userEmail: user.email,
      joinedAt: workspaceTeamMember.createdAt,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, teamId))
    .orderBy(asc(user.name));
}

async function loadPolicyRow(teamId: string) {
  const [row] = await db
    .select()
    .from(agencyOpsTenurePolicy)
    .where(eq(agencyOpsTenurePolicy.teamId, teamId))
    .limit(1);
  return row ?? null;
}

async function loadProfileRows(teamId: string, userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(agencyOpsMemberTenureProfile)
    .where(
      and(
        eq(agencyOpsMemberTenureProfile.teamId, teamId),
        inArray(agencyOpsMemberTenureProfile.userId, userIds),
      ),
    );
}

async function loadExemptionRows(teamId: string) {
  return db
    .select()
    .from(agencyOpsTenureQuarterExemption)
    .where(eq(agencyOpsTenureQuarterExemption.teamId, teamId));
}

async function loadFirstTrackedAtByUser(teamId: string, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Date>();
  }

  const rows = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      firstTrackedAt: min(agencyOpsTimeEntry.startedAt),
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, teamId),
        inArray(agencyOpsTimeEntry.userId, userIds),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .groupBy(agencyOpsTimeEntry.userId);

  return new Map(
    rows.filter((row) => row.firstTrackedAt).map((row) => [row.userId, row.firstTrackedAt as Date]),
  );
}

async function loadLoggedHoursByQuarterByUser(
  teamId: string,
  userIds: string[],
  policy: TenurePolicyInput,
  from: Date,
  to: Date,
) {
  const byUserId = new Map<string, Map<string, number>>();
  if (userIds.length === 0) return byUserId;

  const entries = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      startedAt: agencyOpsTimeEntry.startedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, teamId),
        inArray(agencyOpsTimeEntry.userId, userIds),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, from),
        lt(agencyOpsTimeEntry.startedAt, to),
      ),
    );

  for (const entry of entries) {
    const ref = getFiscalQuarterForDate(entry.startedAt, toFiscalCalendar(policy));
    const key = `${ref.fiscalYear}-${ref.fiscalQuarter}`;
    const hours = entry.durationSeconds / 3600;
    const byQuarter = byUserId.get(entry.userId) ?? new Map<string, number>();
    byQuarter.set(key, (byQuarter.get(key) ?? 0) + hours);
    byUserId.set(entry.userId, byQuarter);
  }

  return byUserId;
}

type MemberHrSummary = {
  departmentId: string | null;
  departmentName: string | null;
  employmentType: string | null;
  workModel: string | null;
  status: "active" | "inactive" | null;
  hasContact: boolean;
};

async function loadMemberHrSummaries(
  teamId: string,
  userIds: string[],
): Promise<Map<string, MemberHrSummary>> {
  const byUserId = new Map<string, MemberHrSummary>();
  if (userIds.length === 0) return byUserId;

  const rows = await db
    .select({
      userId: agencyOpsMemberHrProfile.userId,
      departmentId: agencyOpsMemberHrProfile.departmentId,
      departmentName: agencyOpsDepartment.name,
      employmentType: agencyOpsMemberHrProfile.employmentType,
      workModel: agencyOpsMemberHrProfile.workModel,
      status: agencyOpsMemberHrProfile.status,
      phone: agencyOpsMemberHrProfile.phone,
      address: agencyOpsMemberHrProfile.address,
    })
    .from(agencyOpsMemberHrProfile)
    .leftJoin(
      agencyOpsDepartment,
      eq(agencyOpsDepartment.id, agencyOpsMemberHrProfile.departmentId),
    )
    .where(
      and(
        eq(agencyOpsMemberHrProfile.teamId, teamId),
        inArray(agencyOpsMemberHrProfile.userId, userIds),
      ),
    );

  for (const row of rows) {
    byUserId.set(row.userId, {
      departmentId: row.departmentId ?? null,
      departmentName: row.departmentName ?? null,
      employmentType: row.employmentType ?? null,
      workModel: row.workModel ?? null,
      status: row.status === "inactive" ? "inactive" : row.status === "active" ? "active" : null,
      hasContact: Boolean(row.phone?.trim() || row.address?.trim()),
    });
  }
  return byUserId;
}

function computeMemberSummary(input: {
  member: {
    userId: string;
    userName: string | null;
    userEmail: string;
    joinedAt: Date;
  };
  policy: TenurePolicyInput;
  profileRow: typeof agencyOpsMemberTenureProfile.$inferSelect | undefined;
  exemptions: TenureExemptionInput[];
  firstTrackedAt: Date | null;
  loggedHoursByQuarterKey: Map<string, number>;
  now: Date;
  hr?: MemberHrSummary | null;
}): MemberTenureSummaryRecord {
  const profile = toProfileInput(input.profileRow);

  const result = computeMemberTenure({
    policy: input.policy,
    profile,
    userId: input.member.userId,
    teamJoinDate: input.member.joinedAt,
    firstTrackedAt: input.firstTrackedAt,
    loggedHoursByQuarterKey: input.loggedHoursByQuarterKey,
    exemptions: input.exemptions,
    now: input.now,
  });

  const hr = input.hr ?? null;

  return {
    userId: input.member.userId,
    userName: input.member.userName ?? "Unknown",
    userEmail: input.member.userEmail,
    joinedAt: input.member.joinedAt.toISOString(),
    departmentId: hr?.departmentId ?? null,
    departmentName: hr?.departmentName ?? null,
    employmentType: hr?.employmentType ?? null,
    workModel: hr?.workModel ?? null,
    status: hr?.status ?? null,
    hasContact: hr?.hasContact ?? false,
    internStart: result.internStart?.toISOString() ?? null,
    internEnd: result.internEnd?.toISOString() ?? null,
    internDerived: result.internDerived,
    rawTenureMonths: result.rawTenureMonths,
    rawTenureLabel: formatTenureMonths(result.rawTenureMonths),
    penaltyMonths: result.penaltyMonths,
    netTenureMonths: result.netTenureMonths,
    netTenureLabel: formatTenureMonths(result.netTenureMonths),
    failedQuarterCount: result.failedQuarterCount,
    awaitingFirstEntry: result.awaitingFirstEntry,
    currentQuarter: result.currentQuarter ? quarterToRecord(result.currentQuarter) : null,
  };
}

export async function getTenurePolicy(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ policy: TenurePolicyRecord | null }> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const row = await loadPolicyRow(input.teamId);
  if (!row) {
    return { policy: null };
  }

  return {
    policy: toPolicyRecord(row),
  };
}

export async function upsertTenurePolicy(
  actorUserId: string,
  input: {
    teamId: string;
    fiscalYearStartMonth: number;
    fiscalYearStartDay: number;
    quarterlyMinHours: number;
    monthlyMinHours: number;
    penaltyMonths: number;
    internDurationMonths: number;
    internDurationWeeks: number;
    requiredDailyHours: number;
    weekStartsOn: number;
    weekendDurationDays: number;
    offDayReduceHours: number;
    policyEffectiveFrom: string;
    enabled: boolean;
  },
): Promise<{ policy: TenurePolicyRecord }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  if (input.fiscalYearStartMonth < 1 || input.fiscalYearStartMonth > 12) {
    throw new ORPCError("BAD_REQUEST", { message: "fiscalYearStartMonth must be 1–12." });
  }

  if (input.fiscalYearStartDay < 1 || input.fiscalYearStartDay > 31) {
    throw new ORPCError("BAD_REQUEST", { message: "fiscalYearStartDay must be 1–31." });
  }

  if (input.requiredDailyHours < 1 || input.requiredDailyHours > 24) {
    throw new ORPCError("BAD_REQUEST", { message: "requiredDailyHours must be 1–24." });
  }

  if (input.weekStartsOn < 0 || input.weekStartsOn > 6) {
    throw new ORPCError("BAD_REQUEST", { message: "weekStartsOn must be 0–6." });
  }

  if (input.weekendDurationDays < 1 || input.weekendDurationDays > 3) {
    throw new ORPCError("BAD_REQUEST", { message: "weekendDurationDays must be 1–3." });
  }

  if (
    !Number.isFinite(input.offDayReduceHours) ||
    input.offDayReduceHours < 0 ||
    input.offDayReduceHours > 24
  ) {
    throw new ORPCError("BAD_REQUEST", { message: "offDayReduceHours must be 0–24." });
  }
  const offDayReduceHours = Math.round(input.offDayReduceHours * 60) / 60;

  const policyEffectiveFrom = new Date(input.policyEffectiveFrom);
  if (Number.isNaN(policyEffectiveFrom.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid policyEffectiveFrom." });
  }

  const now = new Date();
  const existing = await loadPolicyRow(input.teamId);

  const [upserted] = await db
    .insert(agencyOpsTenurePolicy)
    .values({
      id: existing?.id ?? createWorkspaceId("agency-tenure-policy"),
      teamId: input.teamId,
      fiscalYearStartMonth: input.fiscalYearStartMonth,
      fiscalYearStartDay: input.fiscalYearStartDay,
      quarterlyMinHours: input.quarterlyMinHours,
      monthlyMinHours: input.monthlyMinHours,
      penaltyMonths: input.penaltyMonths,
      internDurationMonths: input.internDurationMonths,
      internDurationWeeks: input.internDurationWeeks,
      requiredDailyHours: input.requiredDailyHours,
      weekStartsOn: input.weekStartsOn,
      weekendDurationDays: input.weekendDurationDays,
      offDayReduceHours,
      policyEffectiveFrom,
      enabled: input.enabled,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsTenurePolicy.teamId,
      set: {
        fiscalYearStartMonth: input.fiscalYearStartMonth,
        fiscalYearStartDay: input.fiscalYearStartDay,
        quarterlyMinHours: input.quarterlyMinHours,
        monthlyMinHours: input.monthlyMinHours,
        penaltyMonths: input.penaltyMonths,
        internDurationMonths: input.internDurationMonths,
        internDurationWeeks: input.internDurationWeeks,
        requiredDailyHours: input.requiredDailyHours,
        weekStartsOn: input.weekStartsOn,
        weekendDurationDays: input.weekendDurationDays,
        offDayReduceHours,
        policyEffectiveFrom,
        enabled: input.enabled,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  invalidateTeamWorkScheduleCache(input.teamId);

  return {
    policy: toPolicyRecord(upserted),
  };
}

export async function listTenureProfiles(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ items: TenureProfileRecord[] }> {
  const role = await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const members = await loadTeamMembers(input.teamId);
  const userIds = members.map((member) => member.userId);
  const profileRows = await loadProfileRows(input.teamId, userIds);
  const profileByUserId = new Map(profileRows.map((row) => [row.userId, row]));
  const policyRow = await loadPolicyRow(input.teamId);
  const policy = policyRow ? toPolicyInput(policyRow) : defaultPolicyInput();
  const firstTracked = await loadFirstTrackedAtByUser(input.teamId, userIds);

  const visibleMembers =
    role === "owner" ? members : members.filter((member) => member.userId === actorUserId);

  const items: TenureProfileRecord[] = visibleMembers.map((member) => {
    const profileRow = profileByUserId.get(member.userId);
    const firstTrackedAt = firstTracked.get(member.userId) ?? null;
    const computed = computeMemberTenure({
      policy,
      profile: toProfileInput(profileRow),
      userId: member.userId,
      teamJoinDate: member.joinedAt,
      firstTrackedAt,
      loggedHoursByQuarterKey: new Map(),
      exemptions: [],
      now: new Date(),
    });

    return {
      userId: member.userId,
      userName: member.userName ?? "Unknown",
      userEmail: member.userEmail,
      joinedAt: member.joinedAt.toISOString(),
      internStart: computed.internStart?.toISOString() ?? null,
      internEnd: computed.internEnd?.toISOString() ?? null,
      internCountsTowardTenure: profileRow?.internCountsTowardTenure ?? false,
      internExemptFromQuarterMin: profileRow?.internExemptFromQuarterMin ?? true,
      notes: profileRow?.notes ?? null,
    };
  });

  return { items };
}

export async function upsertTenureProfile(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    internStart?: string | null;
    internEnd?: string | null;
    internCountsTowardTenure?: boolean;
    internExemptFromQuarterMin?: boolean;
    notes?: string | null;
  },
): Promise<{ profile: TenureProfileRecord }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const [member] = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userEmail: user.email,
      joinedAt: workspaceTeamMember.createdAt,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new ORPCError("NOT_FOUND", { message: "Team member not found." });
  }

  const now = new Date();
  const existingRows = await loadProfileRows(input.teamId, [input.userId]);
  const existing = existingRows[0];

  const internStart =
    input.internStart === undefined
      ? (existing?.internStart ?? null)
      : input.internStart
        ? new Date(input.internStart)
        : null;
  const internEnd =
    input.internEnd === undefined
      ? (existing?.internEnd ?? null)
      : input.internEnd
        ? new Date(input.internEnd)
        : null;

  const [upserted] = await db
    .insert(agencyOpsMemberTenureProfile)
    .values({
      id: existing?.id ?? createWorkspaceId("agency-tenure-profile"),
      teamId: input.teamId,
      userId: input.userId,
      internStart,
      internEnd,
      internCountsTowardTenure:
        input.internCountsTowardTenure ?? existing?.internCountsTowardTenure ?? false,
      internExemptFromQuarterMin:
        input.internExemptFromQuarterMin ?? existing?.internExemptFromQuarterMin ?? true,
      notes: input.notes !== undefined ? input.notes : (existing?.notes ?? null),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsMemberTenureProfile.teamId, agencyOpsMemberTenureProfile.userId],
      set: {
        internStart,
        internEnd,
        internCountsTowardTenure:
          input.internCountsTowardTenure !== undefined
            ? input.internCountsTowardTenure
            : sql`${agencyOpsMemberTenureProfile.internCountsTowardTenure}`,
        internExemptFromQuarterMin:
          input.internExemptFromQuarterMin !== undefined
            ? input.internExemptFromQuarterMin
            : sql`${agencyOpsMemberTenureProfile.internExemptFromQuarterMin}`,
        notes: input.notes !== undefined ? input.notes : sql`${agencyOpsMemberTenureProfile.notes}`,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const policyRow = await loadPolicyRow(input.teamId);
  const policy = policyRow ? toPolicyInput(policyRow) : defaultPolicyInput();
  const firstTracked = await loadFirstTrackedAtByUser(input.teamId, [input.userId]);
  const computed = computeMemberTenure({
    policy,
    profile: toProfileInput(upserted),
    userId: input.userId,
    teamJoinDate: member.joinedAt,
    firstTrackedAt: firstTracked.get(input.userId) ?? null,
    loggedHoursByQuarterKey: new Map(),
    exemptions: [],
    now,
  });

  return {
    profile: {
      userId: upserted.userId,
      userName: member.userName ?? "Unknown",
      userEmail: member.userEmail,
      joinedAt: member.joinedAt.toISOString(),
      internStart: computed.internStart?.toISOString() ?? null,
      internEnd: computed.internEnd?.toISOString() ?? null,
      internCountsTowardTenure: upserted.internCountsTowardTenure,
      internExemptFromQuarterMin: upserted.internExemptFromQuarterMin,
      notes: upserted.notes,
    },
  };
}

export async function listTenureExemptions(
  actorUserId: string,
  input: { teamId: string; fiscalYear?: number },
): Promise<{ items: TenureExemptionRecord[] }> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const rows = await db
    .select({
      exemption: agencyOpsTenureQuarterExemption,
      userName: user.name,
    })
    .from(agencyOpsTenureQuarterExemption)
    .leftJoin(user, eq(user.id, agencyOpsTenureQuarterExemption.userId))
    .where(
      input.fiscalYear
        ? and(
            eq(agencyOpsTenureQuarterExemption.teamId, input.teamId),
            eq(agencyOpsTenureQuarterExemption.fiscalYear, input.fiscalYear),
          )
        : eq(agencyOpsTenureQuarterExemption.teamId, input.teamId),
    )
    .orderBy(
      asc(agencyOpsTenureQuarterExemption.fiscalYear),
      asc(agencyOpsTenureQuarterExemption.fiscalQuarter),
    );

  return {
    items: rows.map((row) => ({
      id: row.exemption.id,
      type: row.exemption.type,
      fiscalYear: row.exemption.fiscalYear,
      fiscalQuarter: row.exemption.fiscalQuarter as FiscalQuarter,
      userId: row.exemption.userId,
      userName: row.userName,
      reducedMinHours: row.exemption.reducedMinHours,
      frozenMonth: row.exemption.frozenMonth,
      reason: row.exemption.reason,
      createdAt: row.exemption.createdAt.toISOString(),
    })),
  };
}

export async function upsertTenureExemption(
  actorUserId: string,
  input: {
    teamId: string;
    id?: string;
    type: AgencyOpsTenureExemptionType;
    fiscalYear: number;
    fiscalQuarter: FiscalQuarter;
    userId?: string | null;
    reducedMinHours?: number | null;
    frozenMonth?: number | null;
    reason?: string | null;
  },
): Promise<{ exemption: TenureExemptionRecord }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  if (input.type === "team_holiday" && input.userId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Team holiday exemptions cannot have a userId.",
    });
  }

  if (input.type !== "team_holiday" && !input.userId) {
    throw new ORPCError("BAD_REQUEST", { message: "Member exemptions require userId." });
  }

  if (input.type === "member_reduced_min" && input.reducedMinHours == null) {
    throw new ORPCError("BAD_REQUEST", { message: "Reduced minimum requires reducedMinHours." });
  }

  if (input.type === "member_frozen_month") {
    const policyRow = await loadPolicyRow(input.teamId);
    const calendar = toFiscalCalendar({
      fiscalYearStartMonth: policyRow?.fiscalYearStartMonth ?? 1,
      fiscalYearStartDay: policyRow?.fiscalYearStartDay ?? 1,
    });
    const range = getFiscalQuarterRange(calendar, input.fiscalYear, input.fiscalQuarter);
    const frozenMonth = input.frozenMonth;
    if (!frozenMonth || frozenMonth < 1 || frozenMonth > 12) {
      throw new ORPCError("BAD_REQUEST", { message: "Frozen month must be 1–12." });
    }
    let monthInQuarter = false;
    for (
      let cursor = new Date(range.start);
      cursor < range.end;
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    ) {
      if (cursor.getUTCMonth() + 1 === frozenMonth) {
        monthInQuarter = true;
        break;
      }
    }
    if (!monthInQuarter) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Frozen month must fall within the fiscal quarter.",
      });
    }
  }

  const now = new Date();
  let id = input.id ?? createWorkspaceId("agency-tenure-exemption");

  if (!input.id) {
    if (input.type === "team_holiday") {
      const [existingHoliday] = await db
        .select({ id: agencyOpsTenureQuarterExemption.id })
        .from(agencyOpsTenureQuarterExemption)
        .where(
          and(
            eq(agencyOpsTenureQuarterExemption.teamId, input.teamId),
            eq(agencyOpsTenureQuarterExemption.fiscalYear, input.fiscalYear),
            eq(agencyOpsTenureQuarterExemption.fiscalQuarter, input.fiscalQuarter),
            eq(agencyOpsTenureQuarterExemption.type, "team_holiday"),
          ),
        )
        .limit(1);
      if (existingHoliday) {
        id = existingHoliday.id;
      }
    } else if (input.userId) {
      const [existingMember] = await db
        .select({ id: agencyOpsTenureQuarterExemption.id })
        .from(agencyOpsTenureQuarterExemption)
        .where(
          and(
            eq(agencyOpsTenureQuarterExemption.teamId, input.teamId),
            eq(agencyOpsTenureQuarterExemption.userId, input.userId),
            eq(agencyOpsTenureQuarterExemption.fiscalYear, input.fiscalYear),
            eq(agencyOpsTenureQuarterExemption.fiscalQuarter, input.fiscalQuarter),
          ),
        )
        .limit(1);
      if (existingMember) {
        id = existingMember.id;
      }
    }
  }

  const [upserted] = await db
    .insert(agencyOpsTenureQuarterExemption)
    .values({
      id,
      teamId: input.teamId,
      type: input.type,
      fiscalYear: input.fiscalYear,
      fiscalQuarter: input.fiscalQuarter,
      userId: input.type === "team_holiday" ? null : (input.userId ?? null),
      reducedMinHours: input.type === "member_reduced_min" ? (input.reducedMinHours ?? null) : null,
      frozenMonth: input.type === "member_frozen_month" ? (input.frozenMonth ?? null) : null,
      reason: input.reason ?? null,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsTenureQuarterExemption.id,
      set: {
        type: input.type,
        fiscalYear: input.fiscalYear,
        fiscalQuarter: input.fiscalQuarter,
        userId: input.type === "team_holiday" ? null : (input.userId ?? null),
        reducedMinHours:
          input.type === "member_reduced_min" ? (input.reducedMinHours ?? null) : null,
        frozenMonth: input.type === "member_frozen_month" ? (input.frozenMonth ?? null) : null,
        reason: input.reason ?? null,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  const [userRow] = upserted.userId
    ? await db.select({ name: user.name }).from(user).where(eq(user.id, upserted.userId)).limit(1)
    : [];

  return {
    exemption: {
      id: upserted.id,
      type: upserted.type,
      fiscalYear: upserted.fiscalYear,
      fiscalQuarter: upserted.fiscalQuarter as FiscalQuarter,
      userId: upserted.userId,
      userName: userRow?.name ?? null,
      reducedMinHours: upserted.reducedMinHours,
      frozenMonth: upserted.frozenMonth,
      reason: upserted.reason,
      createdAt: upserted.createdAt.toISOString(),
    },
  };
}

export async function deleteTenureExemption(
  actorUserId: string,
  input: { teamId: string; exemptionId: string },
): Promise<{ ok: true }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  await db
    .delete(agencyOpsTenureQuarterExemption)
    .where(
      and(
        eq(agencyOpsTenureQuarterExemption.teamId, input.teamId),
        eq(agencyOpsTenureQuarterExemption.id, input.exemptionId),
      ),
    );

  return { ok: true };
}

export async function listTenureSummary(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ items: MemberTenureSummaryRecord[]; policyEnabled: boolean }> {
  const role = await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const members = await loadTeamMembers(input.teamId);
  const policyRow = await loadPolicyRow(input.teamId);
  const policy = policyRow ? toPolicyInput(policyRow) : defaultPolicyInput();
  const now = new Date();

  const visibleMembers =
    role === "owner" ? members : members.filter((member) => member.userId === actorUserId);

  const userIds = visibleMembers.map((member) => member.userId);
  const profileRows = await loadProfileRows(input.teamId, userIds);
  const profileByUserId = new Map(profileRows.map((row) => [row.userId, row]));
  const hrByUserId = await loadMemberHrSummaries(input.teamId, userIds);
  const exemptionRows = await loadExemptionRows(input.teamId);
  const exemptions = exemptionRows.map(toExemptionInput);
  const firstTracked = await loadFirstTrackedAtByUser(input.teamId, userIds);
  const loggedHoursByUserId = await loadLoggedHoursByQuarterByUser(
    input.teamId,
    userIds,
    policy,
    policy.policyEffectiveFrom,
    now,
  );

  const items = visibleMembers.map((member) =>
    computeMemberSummary({
      member,
      policy,
      profileRow: profileByUserId.get(member.userId),
      exemptions,
      firstTrackedAt: firstTracked.get(member.userId) ?? null,
      loggedHoursByQuarterKey: loggedHoursByUserId.get(member.userId) ?? new Map(),
      now,
      hr: hrByUserId.get(member.userId) ?? null,
    }),
  );

  return { items, policyEnabled: policy.enabled };
}

export async function getTenureMember(
  actorUserId: string,
  input: { teamId: string; userId: string },
): Promise<{ member: MemberTenureDetailRecord; policy: TenurePolicyRecord | null }> {
  const role = await requireAgencyRole(actorUserId, input.teamId, "viewer");

  if (role !== "owner" && actorUserId !== input.userId) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const [member] = await loadTeamMembers(input.teamId).then((rows) =>
    rows.filter((row) => row.userId === input.userId),
  );

  if (!member) {
    throw new ORPCError("NOT_FOUND", { message: "Team member not found." });
  }

  const policyRow = await loadPolicyRow(input.teamId);
  const policy = policyRow ? toPolicyInput(policyRow) : defaultPolicyInput();
  const now = new Date();
  const profileRows = await loadProfileRows(input.teamId, [input.userId]);
  const profileRow = profileRows[0];
  const exemptions = (await loadExemptionRows(input.teamId)).map(toExemptionInput);
  const firstTrackedAt = (await loadFirstTrackedAtByUser(input.teamId, [input.userId])).get(
    input.userId,
  );

  const loggedHoursByUserId = await loadLoggedHoursByQuarterByUser(
    input.teamId,
    [input.userId],
    policy,
    policy.policyEffectiveFrom,
    now,
  );
  const loggedHoursByQuarterKey = loggedHoursByUserId.get(input.userId) ?? new Map();

  const result = computeMemberTenure({
    policy,
    profile: toProfileInput(profileRow),
    userId: input.userId,
    teamJoinDate: member.joinedAt,
    firstTrackedAt: firstTrackedAt ?? null,
    loggedHoursByQuarterKey,
    exemptions,
    now,
  });

  const hr = (await loadMemberHrSummaries(input.teamId, [input.userId])).get(input.userId) ?? null;
  const summary = computeMemberSummary({
    member,
    policy,
    profileRow,
    exemptions,
    firstTrackedAt: firstTrackedAt ?? null,
    loggedHoursByQuarterKey,
    now,
    hr,
  });

  return {
    member: {
      ...summary,
      internCountsTowardTenure: profileRow?.internCountsTowardTenure ?? false,
      internExemptFromQuarterMin: profileRow?.internExemptFromQuarterMin ?? true,
      notes: profileRow?.notes ?? null,
      quarters: result.quarters.map(quarterToRecord),
    },
    policy: policyRow ? toPolicyRecord(policyRow) : null,
  };
}
