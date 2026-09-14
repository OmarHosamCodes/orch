import type { memberProfileSchema } from "@orch/api/routers/agency-ops/member-profile/schemas";
import type { z } from "zod";

import type { MemberProfileViewData } from "@/features/member-profile/agency-member-profile-types";
import type { AttendanceStreakModel } from "@/features/member-profile/member-profile-attendance-streak";
import {
  leaveRangeLabel,
  leaveTypeLabel,
  shortHours,
} from "@/features/member-profile/member-profile-format";
import {
  buildGaugeDetail,
  computeMonthPaceVisual,
  type GaugeDetailModel,
} from "@/features/member-profile/member-profile-gauge-detail";
import type { ProfilePaceParams } from "@/features/member-profile/member-profile-period";
import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";

type MemberProfileRecord = z.infer<typeof memberProfileSchema>;

export type BuildMemberProfileGaugeDetailInput = {
  openGaugeKey: StatPlateKey;
  data: MemberProfileRecord;
  profile: MemberProfileViewData;
  attendanceStreak: AttendanceStreakModel;
  periodLabel: string;
  today: string;
  weekStartsOn: number;
  weekendDurationDays: number;
  offDayReduceHours: number;
  requiredDailyHours: number;
  paceParams: ProfilePaceParams;
};

export function buildMemberProfileGaugeDetail(
  input: BuildMemberProfileGaugeDetailInput,
): GaugeDetailModel | null {
  const gauge = input.profile.leaveGauges.find((item) => item.key === input.openGaugeKey);
  if (!gauge) return null;

  const dayHours = input.data.timeline.map((day) => {
    let totalSeconds = 0;
    for (const item of day.items) {
      if (item.kind === "activity" && item.durationSeconds != null) {
        totalSeconds += item.durationSeconds;
      }
    }
    const date = new Date(`${day.date}T12:00:00.000Z`);
    const label = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return {
      date: day.date,
      label,
      hoursLabel: shortHours(totalSeconds),
      totalSeconds,
    };
  });

  const wasteDays: Array<{
    date: string;
    label: string;
    hoursLabel: string;
    totalSeconds: number;
    entryCount: number;
  }> = [];
  for (const day of input.data.timeline) {
    let wasteSeconds = 0;
    let entryCount = 0;
    for (const item of day.items) {
      if (item.kind === "activity" && item.isWaste && item.durationSeconds != null) {
        wasteSeconds += item.durationSeconds;
        entryCount += 1;
      }
    }
    if (wasteSeconds <= 0) continue;
    const date = new Date(`${day.date}T12:00:00.000Z`);
    wasteDays.push({
      date: day.date,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      hoursLabel: shortHours(wasteSeconds),
      totalSeconds: wasteSeconds,
      entryCount,
    });
  }

  let paidSeconds = 0;
  let internalSeconds = 0;
  for (const day of input.data.timeline) {
    for (const item of day.items) {
      if (item.kind !== "activity" || item.isWaste || item.durationSeconds == null) continue;
      if (item.isBillable) paidSeconds += item.durationSeconds;
      else internalSeconds += item.durationSeconds;
    }
  }

  const coverageLabel = input.paceParams.isSingleMonth
    ? input.profile.calendar.label
    : input.periodLabel;
  const offDayKeys = new Set(
    input.data.heatMap.days.filter((day) => day.off).map((day) => day.date),
  );
  const paceDayHours = input.data.heatMap.days.map((day) => {
    const date = new Date(`${day.date}T12:00:00.000Z`);
    const label = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return {
      date: day.date,
      label,
      hoursLabel: shortHours(day.totalSeconds),
      totalSeconds: day.totalSeconds,
    };
  });

  const monthPaceVisual =
    input.openGaugeKey === "period"
      ? computeMonthPaceVisual({
          dayHours: paceDayHours,
          schedule: {
            weekStartsOn: input.weekStartsOn,
            weekendDurationDays: input.weekendDurationDays,
            requiredDailyHours: input.requiredDailyHours,
          },
          baseMinHours: input.paceParams.baseMinHours,
          offDayReduceHours: input.offDayReduceHours,
          offDayKeys,
          todayKey: input.today,
          periodStartKey: input.paceParams.paceStartKey,
          periodEndKey: input.paceParams.paceEndKey,
          periodLabel: coverageLabel,
          isSingleMonthScope: input.paceParams.isSingleMonth,
        })
      : null;

  return buildGaugeDetail({
    canManageLeave: input.profile.canManageLeave,
    leavePeriodLabel: input.data.leaveBalances.period.label,
    usedDays: input.data.leaveBalances.all.usedDays,
    allowanceDays: input.data.leaveBalances.all.allowanceDays,
    leaveEntries: input.data.leave.map((entry) => ({
      id: entry.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
      typeLabel: leaveTypeLabel(entry.type),
      rangeLabel: leaveRangeLabel(entry.startDate, entry.endDate),
    })),
    periodLabel: input.periodLabel,
    periodHoursLabel: shortHours(input.data.periodTotalSeconds),
    periodTotalSeconds: input.data.periodTotalSeconds,
    periodWasteSeconds: input.data.periodWasteSeconds,
    periodWasteLabel: shortHours(input.data.periodWasteSeconds),
    hoursBreakdown: { paidSeconds, internalSeconds },
    dayHours,
    monthPaceVisual,
    calendarLabel: coverageLabel,
    calendarDays: input.profile.calendar.days.map((day) => {
      const date = new Date(`${day.date}T12:00:00.000Z`);
      return {
        date: day.date,
        inMonth: day.inMonth,
        status: day.status,
        dayLabel: date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      };
    }),
    wasteDays,
    gauge: {
      key: gauge.key,
      valueLabel: gauge.valueLabel,
      ratio: gauge.ratio,
      tone: gauge.tone,
    },
    attendanceStreak: input.openGaugeKey === "present" ? input.attendanceStreak : undefined,
  });
}
