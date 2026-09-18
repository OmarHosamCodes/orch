import { db } from "@orch/db";
import {
  agencyOpsMemberLeave,
  agencyOpsMemberProfileAlert,
  agencyOpsMemberProfileAlertPolicy,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsTenurePolicy,
  agencyOpsTimeEntry,
  workspaceTeamMember,
  type AgencyOpsMemberProfileAlertContext,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";

import { fanOutNotification } from "../../notifications/service";
import {
  getFiscalQuarterForDate,
  getFiscalQuarterRange,
  resolveProfilePeriodMonth,
} from "../resourcing/tenure-engine";
import { resolveWorkSchedule } from "../resourcing/work-schedule";
import { requireAgencyRole } from "../shared/membership";
import { resolveEntryWaste } from "../shared/waste-helpers";
import { addDaysToDateKey, localDateKeyFromInstant } from "../time-tracking/local-week-bounds";
import { expandLeaveDays } from "./member-profile-heat";
import {
  DEFAULT_ALERT_POLICY,
  detectSystemAlerts,
  alertFingerprintAliases,
  toFiscalCalendar,
  type DaySeconds,
  type DetectedAlert,
  type MemberProfileAlertPolicy,
} from "./member-profile-alerts";

export type MemberProfileAlertRecord = {
  id: string;
  kind: "abnormal_day" | "month_pace" | "quarter_pace" | "waste_spike" | "custom";
  source: "system" | "custom";
  status: "open" | "snoozed" | "removed";
  fingerprint: string;
  title: string;
  body: string;
  note: string | null;
  context: AgencyOpsMemberProfileAlertContext;
  sentAt: string | null;
  snoozedUntil: string | null;
  createdAt: string;
  ephemeral: boolean;
};

function addSuppressedFingerprint(suppressed: Set<string>, fingerprint: string) {
  for (const alias of alertFingerprintAliases(fingerprint)) {
    suppressed.add(alias);
  }
}

function findDurableByFingerprint(
  map: Map<string, typeof agencyOpsMemberProfileAlert.$inferSelect>,
  fingerprint: string,
) {
  for (const alias of alertFingerprintAliases(fingerprint)) {
    const row = map.get(alias);
    if (row) return row;
  }
  return undefined;
}

function mapAlertPolicy(
  row: typeof agencyOpsMemberProfileAlertPolicy.$inferSelect | undefined,
): MemberProfileAlertPolicy {
  if (!row) return DEFAULT_ALERT_POLICY;
  return {
    abnormalDayEnabled: row.abnormalDayEnabled,
    abnormalDayExtraHours: row.abnormalDayExtraHours,
    monthPaceEnabled: row.monthPaceEnabled,
    monthPacePercent: row.monthPacePercent,
    quarterPaceEnabled: row.quarterPaceEnabled,
    quarterPacePercent: row.quarterPacePercent,
    wasteSpikeEnabled: row.wasteSpikeEnabled,
    wasteSpikePercent: row.wasteSpikePercent,
  };
}

async function loadAlertPolicy(teamId: string): Promise<MemberProfileAlertPolicy> {
  const [row] = await db
    .select()
    .from(agencyOpsMemberProfileAlertPolicy)
    .where(eq(agencyOpsMemberProfileAlertPolicy.teamId, teamId))
    .limit(1);
  return mapAlertPolicy(row);
}

function mapRow(row: typeof agencyOpsMemberProfileAlert.$inferSelect): MemberProfileAlertRecord {
  return {
    id: row.id,
    kind: row.kind,
    source: row.source,
    status: row.status,
    fingerprint: row.fingerprint,
    title: row.title,
    body: row.body,
    note: row.note,
    context: row.contextJson ?? {},
    sentAt: row.sentAt?.toISOString() ?? null,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    ephemeral: false,
  };
}

function localInstantBounds(
  fromKey: string,
  toKey: string,
  utcOffsetMinutes: number,
): { from: Date; to: Date } {
  const fromMs = Date.parse(`${fromKey}T00:00:00.000Z`) + utcOffsetMinutes * 60_000;
  const toMs = Date.parse(`${toKey}T23:59:59.999Z`) + utcOffsetMinutes * 60_000;
  return { from: new Date(fromMs), to: new Date(toMs) };
}

async function loadDaySeconds(
  teamId: string,
  userId: string,
  fromKey: string,
  toKey: string,
  utcOffsetMinutes: number,
): Promise<DaySeconds[]> {
  const { from, to } = localInstantBounds(fromKey, toKey, utcOffsetMinutes);
  const rows = await db
    .select({
      startedAt: agencyOpsTimeEntry.startedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      isWaste: agencyOpsTimeEntry.isWaste,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      taskTitle: agencyOpsProjectTask.title,
      projectName: agencyOpsProject.name,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, teamId),
        eq(agencyOpsTimeEntry.userId, userId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, from),
        lte(agencyOpsTimeEntry.startedAt, to),
      ),
    );

  const byDate = new Map<string, DaySeconds>();
  for (const row of rows) {
    const dateKey = localDateKeyFromInstant(row.startedAt, utcOffsetMinutes);
    const current = byDate.get(dateKey) ?? { dateKey, totalSeconds: 0, wasteSeconds: 0 };
    current.totalSeconds += row.durationSeconds;
    if (resolveEntryWaste(row)) current.wasteSeconds += row.durationSeconds;
    byDate.set(dateKey, current);
  }
  return [...byDate.values()];
}

async function loadMemberLeaveByDate(
  teamId: string,
  userId: string,
  fromKey: string,
  toKey: string,
): Promise<Map<string, unknown>> {
  const rows = await db
    .select()
    .from(agencyOpsMemberLeave)
    .where(
      and(
        eq(agencyOpsMemberLeave.teamId, teamId),
        or(isNull(agencyOpsMemberLeave.userId), eq(agencyOpsMemberLeave.userId, userId)),
        lte(agencyOpsMemberLeave.startDate, toKey),
        gte(agencyOpsMemberLeave.endDate, fromKey),
      ),
    );
  return expandLeaveDays(
    rows.map((row) => ({
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      reason: row.reason,
    })),
    fromKey,
    toKey,
  );
}

async function upsertDetectedOpen(
  actorUserId: string,
  teamId: string,
  subjectUserId: string,
  alert: DetectedAlert,
): Promise<typeof agencyOpsMemberProfileAlert.$inferSelect> {
  const now = new Date();
  const [row] = await db
    .insert(agencyOpsMemberProfileAlert)
    .values({
      id: createWorkspaceId("agency-member-alert"),
      teamId,
      subjectUserId,
      createdByUserId: actorUserId,
      kind: alert.kind,
      source: "system",
      status: "open",
      fingerprint: alert.fingerprint,
      title: alert.title,
      body: alert.body,
      note: null,
      contextJson: alert.context,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        agencyOpsMemberProfileAlert.teamId,
        agencyOpsMemberProfileAlert.subjectUserId,
        agencyOpsMemberProfileAlert.fingerprint,
      ],
      set: {
        title: alert.title,
        body: alert.body,
        contextJson: alert.context,
        status: "open",
        snoozedUntil: null,
        removedAt: null,
        removedByUserId: null,
        updatedAt: now,
      },
      setWhere: ne(agencyOpsMemberProfileAlert.status, "removed"),
    })
    .returning();

  if (row) return row;

  const [existing] = await db
    .select()
    .from(agencyOpsMemberProfileAlert)
    .where(
      and(
        eq(agencyOpsMemberProfileAlert.teamId, teamId),
        eq(agencyOpsMemberProfileAlert.subjectUserId, subjectUserId),
        eq(agencyOpsMemberProfileAlert.fingerprint, alert.fingerprint),
      ),
    )
    .limit(1);
  if (!existing) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return existing;
}

export async function listMemberProfileAlerts(
  actorUserId: string,
  input: { teamId: string; userId: string; utcOffsetMinutes?: number },
): Promise<{ items: MemberProfileAlertRecord[]; canManageAlerts: boolean }> {
  const role = await requireAgencyRole(actorUserId, input.teamId, "viewer");
  const canManageAlerts = role === "owner" || role === "editor";

  const [subject] = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);
  if (!subject) {
    throw new ORPCError("NOT_FOUND", { message: "Member not found on this team." });
  }

  const durableRows = await db
    .select()
    .from(agencyOpsMemberProfileAlert)
    .where(
      and(
        eq(agencyOpsMemberProfileAlert.teamId, input.teamId),
        eq(agencyOpsMemberProfileAlert.subjectUserId, input.userId),
      ),
    );

  const now = new Date();
  const utcOffsetMinutes = input.utcOffsetMinutes ?? 0;
  const todayKey = localDateKeyFromInstant(now, utcOffsetMinutes);
  const suppressed = new Set<string>();
  const durableByFingerprint = new Map(durableRows.map((row) => [row.fingerprint, row] as const));
  const items: MemberProfileAlertRecord[] = [];

  for (const row of durableRows) {
    if (row.status === "removed") {
      addSuppressedFingerprint(suppressed, row.fingerprint);
      continue;
    }
    if (row.status === "snoozed" && row.snoozedUntil && row.snoozedUntil > now) {
      addSuppressedFingerprint(suppressed, row.fingerprint);
      continue;
    }
    if (row.status === "snoozed" && (!row.snoozedUntil || row.snoozedUntil <= now)) {
      if (row.source === "custom") {
        const [reopened] = await db
          .update(agencyOpsMemberProfileAlert)
          .set({ status: "open", snoozedUntil: null, updatedAt: now })
          .where(eq(agencyOpsMemberProfileAlert.id, row.id))
          .returning();
        if (reopened) {
          durableByFingerprint.set(reopened.fingerprint, reopened);
          items.push(mapRow(reopened));
        }
      }
      continue;
    }
    if (row.status === "open" && row.source === "custom") {
      items.push(mapRow(row));
    }
  }

  const [policyRow] = await db
    .select()
    .from(agencyOpsTenurePolicy)
    .where(eq(agencyOpsTenurePolicy.teamId, input.teamId))
    .limit(1);

  const schedule = resolveWorkSchedule(policyRow ?? null);
  const calendar = toFiscalCalendar({
    fiscalYearStartMonth: policyRow?.fiscalYearStartMonth ?? 1,
    fiscalYearStartDay: policyRow?.fiscalYearStartDay ?? 1,
  });
  const quarterlyMinHours = policyRow?.quarterlyMinHours ?? 525;
  const monthlyMinHours = policyRow?.monthlyMinHours ?? 200;
  const offDayReduceHours = policyRow?.offDayReduceHours ?? 8;
  const tenureEnabled = policyRow?.enabled ?? false;
  const alertPolicy = await loadAlertPolicy(input.teamId);
  const fromKey = addDaysToDateKey(todayKey, -100);
  const tenureMonth = resolveProfilePeriodMonth({
    tenureEnabled,
    calendar,
    anchorDateKey: todayKey,
  });
  const monthStart = tenureMonth.startKey;
  const monthEnd = tenureMonth.endKey;
  const refDate = new Date(`${todayKey}T12:00:00.000Z`);
  const quarterRef = getFiscalQuarterForDate(refDate, calendar);
  const quarterRange = getFiscalQuarterRange(
    calendar,
    quarterRef.fiscalYear,
    quarterRef.fiscalQuarter,
  );
  const quarterStart = quarterRange.start.toISOString().slice(0, 10);
  const quarterEnd = addDaysToDateKey(quarterRange.end.toISOString().slice(0, 10), -1);
  const leaveFrom = [fromKey, monthStart, quarterStart].sort()[0]!;
  const leaveTo = [todayKey, monthEnd, quarterEnd].sort().at(-1)!;
  const days = await loadDaySeconds(
    input.teamId,
    input.userId,
    fromKey,
    todayKey,
    utcOffsetMinutes,
  );
  const leaveByDate = await loadMemberLeaveByDate(input.teamId, input.userId, leaveFrom, leaveTo);

  const detected = detectSystemAlerts({
    days,
    schedule,
    calendar,
    monthlyMinHours,
    quarterlyMinHours,
    offDayReduceHours,
    leaveByDate,
    tenureEnabled,
    suppressedFingerprints: suppressed,
    todayKey,
    now,
    policy: alertPolicy,
  });

  for (const alert of detected) {
    const existing = findDurableByFingerprint(durableByFingerprint, alert.fingerprint);
    if (existing?.status === "removed") continue;
    if (existing?.status === "snoozed" && existing.snoozedUntil && existing.snoozedUntil > now) {
      continue;
    }

    const row = await upsertDetectedOpen(actorUserId, input.teamId, input.userId, alert);
    if (row.status !== "open") continue;
    if (!items.some((item) => item.id === row.id)) {
      items.push(mapRow(row));
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { items, canManageAlerts };
}

async function requireManageAlerts(actorUserId: string, teamId: string) {
  await requireAgencyRole(actorUserId, teamId, "editor");
}

async function loadAlertRow(
  teamId: string,
  userId: string,
  alertId: string,
): Promise<typeof agencyOpsMemberProfileAlert.$inferSelect> {
  const [existing] = await db
    .select()
    .from(agencyOpsMemberProfileAlert)
    .where(
      and(
        eq(agencyOpsMemberProfileAlert.id, alertId),
        eq(agencyOpsMemberProfileAlert.teamId, teamId),
        eq(agencyOpsMemberProfileAlert.subjectUserId, userId),
      ),
    )
    .limit(1);
  if (!existing || existing.status === "removed") {
    throw new ORPCError("NOT_FOUND", { message: "Alert not found." });
  }
  return existing;
}

export async function createMemberProfileAlert(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    title: string;
    body?: string;
    note?: string | null;
  },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const fingerprint = `custom:${createWorkspaceId("alert-fp")}`;
  const now = new Date();
  const [row] = await db
    .insert(agencyOpsMemberProfileAlert)
    .values({
      id: createWorkspaceId("agency-member-alert"),
      teamId: input.teamId,
      subjectUserId: input.userId,
      createdByUserId: actorUserId,
      kind: "custom",
      source: "custom",
      status: "open",
      fingerprint,
      title: input.title.trim(),
      body: (input.body ?? input.title).trim(),
      note: input.note?.trim() || null,
      contextJson: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return { alert: mapRow(row) };
}

export async function setMemberProfileAlertNote(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string; note: string },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  const [updated] = await db
    .update(agencyOpsMemberProfileAlert)
    .set({ note: input.note.trim() || null, updatedAt: new Date() })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id))
    .returning();
  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return { alert: mapRow(updated) };
}

export async function sendMemberProfileAlert(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string; note?: string },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  const note = (input.note ?? row.note ?? "").trim();
  if (!note) {
    throw new ORPCError("BAD_REQUEST", { message: "A note is required before sending." });
  }
  const now = new Date();
  const [updated] = await db
    .update(agencyOpsMemberProfileAlert)
    .set({ note, sentAt: now, status: "open", snoozedUntil: null, updatedAt: now })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id))
    .returning();
  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  await fanOutNotification(actorUserId, {
    teamId: input.teamId,
    recipientUserIds: [input.userId],
    type: "member.alert",
    payload: {
      subjectUserId: input.userId,
      alertId: updated.id,
      alertTitle: updated.title,
      notePreview: note.slice(0, 160),
      dateKey:
        typeof updated.contextJson?.dateKey === "string" ? updated.contextJson.dateKey : undefined,
      periodKey:
        typeof updated.contextJson?.periodKey === "string"
          ? updated.contextJson.periodKey
          : undefined,
    },
  });

  return { alert: mapRow(updated) };
}

export async function removeMemberProfileAlert(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string },
): Promise<{ id: string }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  const now = new Date();
  await db
    .update(agencyOpsMemberProfileAlert)
    .set({
      status: "removed",
      removedAt: now,
      removedByUserId: actorUserId,
      snoozedUntil: null,
      updatedAt: now,
    })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id));
  return { id: row.id };
}

export async function snoozeMemberProfileAlert(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string; snoozedUntil?: string },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  if (row.source !== "system") {
    throw new ORPCError("BAD_REQUEST", { message: "Only system alerts can be snoozed." });
  }

  let snoozedUntil: Date;
  if (input.snoozedUntil) {
    snoozedUntil = new Date(input.snoozedUntil);
    if (Number.isNaN(snoozedUntil.getTime())) {
      throw new ORPCError("BAD_REQUEST", { message: "Invalid snoozedUntil." });
    }
  } else {
    const hint =
      typeof row.contextJson?.defaultSnoozeUntil === "string"
        ? new Date(row.contextJson.defaultSnoozeUntil)
        : null;
    snoozedUntil =
      hint && !Number.isNaN(hint.getTime()) ? hint : new Date(Date.now() + 7 * 86_400_000);
  }

  const now = new Date();
  const [updated] = await db
    .update(agencyOpsMemberProfileAlert)
    .set({
      status: "snoozed",
      snoozedUntil,
      updatedAt: now,
    })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id))
    .returning();
  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return { alert: mapRow(updated) };
}

export async function getMemberProfileAlertPolicy(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ policy: MemberProfileAlertPolicy }> {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");
  return { policy: await loadAlertPolicy(input.teamId) };
}

export async function upsertMemberProfileAlertPolicy(
  actorUserId: string,
  input: { teamId: string } & MemberProfileAlertPolicy,
): Promise<{ policy: MemberProfileAlertPolicy }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");
  const now = new Date();
  const values = {
    teamId: input.teamId,
    abnormalDayEnabled: input.abnormalDayEnabled,
    abnormalDayExtraHours: input.abnormalDayExtraHours,
    monthPaceEnabled: input.monthPaceEnabled,
    monthPacePercent: input.monthPacePercent,
    quarterPaceEnabled: input.quarterPaceEnabled,
    quarterPacePercent: input.quarterPacePercent,
    wasteSpikeEnabled: input.wasteSpikeEnabled,
    wasteSpikePercent: input.wasteSpikePercent,
    createdAt: now,
    updatedAt: now,
  };
  const [row] = await db
    .insert(agencyOpsMemberProfileAlertPolicy)
    .values(values)
    .onConflictDoUpdate({
      target: agencyOpsMemberProfileAlertPolicy.teamId,
      set: {
        abnormalDayEnabled: values.abnormalDayEnabled,
        abnormalDayExtraHours: values.abnormalDayExtraHours,
        monthPaceEnabled: values.monthPaceEnabled,
        monthPacePercent: values.monthPacePercent,
        quarterPaceEnabled: values.quarterPaceEnabled,
        quarterPacePercent: values.quarterPacePercent,
        wasteSpikeEnabled: values.wasteSpikeEnabled,
        wasteSpikePercent: values.wasteSpikePercent,
        updatedAt: now,
      },
    })
    .returning();
  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return { policy: mapAlertPolicy(row) };
}
