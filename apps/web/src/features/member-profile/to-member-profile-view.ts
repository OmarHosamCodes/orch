import { buildWeekHours } from "@orch/api/routers/agency-ops/member-profile/member-profile-hr";
import { projectPeriodPace } from "@orch/api/routers/agency-ops/resourcing/work-schedule";
import type { memberProfileSchema } from "@orch/api/routers/agency-ops/member-profile/schemas";
import type { z } from "zod";

import type { MemberProfileViewData } from "@/features/member-profile/agency-member-profile-types";
import { computeAttendanceStreak } from "@/features/member-profile/member-profile-attendance-streak";
import type { ProfilePaceParams } from "@/features/member-profile/member-profile-period";
import {
  activityKindLabel,
  employmentTypeLabel,
  formatDayParts,
  genderDisplayLabel,
  roleLabel,
  shortHours,
  weekContainingCaption,
  workModelLabel,
} from "@/features/member-profile/member-profile-format";
import { resolveMemberProfileHeatLayout } from "@/features/member-profile/member-profile-heat-layout";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import { getUserAvatarPublicUrl } from "@/lib/user-avatar-url";
import { formatDuration } from "@/lib/utils/format-duration";

type MemberProfileRecord = z.infer<typeof memberProfileSchema>;

export type BuildMemberProfileViewInput = {
  data: MemberProfileRecord;
  subjectUserId: string;
  serverUrl: string | null;
  today: string;
  periodLabel: string;
  paceParams: ProfilePaceParams;
  effectiveRangePreset: RangePreset;
  effectiveTenureMonthIndexes: number[];
  expandedDays: Record<string, boolean>;
  selectedHeatDate: string | null;
  weekStartsOn: number;
  weekendDurationDays: number;
  rangeStartKey: string;
  rangeEndKey: string;
  requiredDailyHours: number;
  offDayReduceHours: number;
  departments: Array<{ id: string; name: string }>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
};

export function buildMemberProfileView(input: BuildMemberProfileViewInput): MemberProfileViewData {
  const { data } = input;

  const avatarUrl =
    data.userAvatar && input.serverUrl
      ? getUserAvatarPublicUrl({
          baseUrl: input.serverUrl,
          userId: data.userId,
          storageKey: data.userAvatar,
        })
      : null;

  const joined = new Date(data.joinedAt);
  const joinedAtLabel = Number.isNaN(joined.getTime())
    ? "—"
    : joined.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const leaveSummary =
    data.leave.length === 0
      ? "No off days in this period"
      : `${data.leave.length} off-day range${data.leave.length === 1 ? "" : "s"}`;

  const heatLayout = resolveMemberProfileHeatLayout(
    input.effectiveRangePreset,
    input.effectiveTenureMonthIndexes,
    data.heatMap.startDate,
    data.heatMap.endDate,
  );

  const weekHoursSource = input.selectedHeatDate
    ? buildWeekHours(
        input.selectedHeatDate,
        new Map(data.heatMap.days.map((day) => [day.date, day.totalSeconds])),
        input.weekStartsOn,
      )
    : [];
  const maxWeekSeconds = Math.max(1, ...weekHoursSource.map((day) => day.totalSeconds));
  const weekHoursTotalSeconds = weekHoursSource.reduce((sum, day) => sum + day.totalSeconds, 0);

  const calendarLegendCounts = {
    present: 0,
    leave: 0,
    holiday: 0,
    weekend: 0,
    empty: 0,
  };
  for (const day of data.calendarMonth.days) {
    if (!day.inMonth) continue;
    calendarLegendCounts[day.status] += 1;
  }

  const leaveAll = data.leaveBalances.all;
  const streakAnchor =
    input.today < input.rangeStartKey
      ? input.rangeStartKey
      : input.today > input.rangeEndKey
        ? input.rangeEndKey
        : input.today;
  const heatDays = data.heatMap.days.map((day) => ({
    date: day.date,
    totalSeconds: day.totalSeconds,
    off: day.off,
  }));
  const calendarDays = data.calendarMonth.days.map((day) => ({
    date: day.date,
    inMonth: day.inMonth,
    status: day.status,
  }));
  const attendanceStreak = computeAttendanceStreak({
    anchorDate: streakAnchor,
    schedule: { weekStartsOn: input.weekStartsOn, weekendDurationDays: input.weekendDurationDays },
    heatDays,
    calendarDays,
    periodRange: { startKey: input.rangeStartKey, endKey: input.rangeEndKey },
  });

  const offDayKeys = new Set(data.heatMap.days.filter((day) => day.off).map((day) => day.date));
  const periodPaceProjection = projectPeriodPace({
    startKey: input.paceParams.paceStartKey,
    endKey: input.paceParams.paceEndKey,
    todayKey: input.today,
    daySeconds: data.heatMap.days.map((day) => ({
      dateKey: day.date,
      totalSeconds: day.totalSeconds,
    })),
    schedule: {
      weekStartsOn: input.weekStartsOn,
      weekendDurationDays: input.weekendDurationDays,
      requiredDailyHours: input.requiredDailyHours,
    },
    baseMinHours: input.paceParams.baseMinHours,
    offDayReduceHours: input.offDayReduceHours,
    offDayKeys,
  });
  const periodHoursTargetSeconds =
    periodPaceProjection != null
      ? Math.max(periodPaceProjection.monthMinHours, 1) * 3600
      : Math.max(input.paceParams.baseMinHours, 1) * 3600;
  const streakSecondaryLabel = input.paceParams.isSingleMonth
    ? data.calendarMonth.label
    : input.periodLabel;
  const leaveGauges: MemberProfileViewData["leaveGauges"] = [
    {
      key: "leaves",
      label: "Off days",
      valueLabel: `${leaveAll.usedDays}/${leaveAll.allowanceDays}`,
      secondary: data.leaveBalances.period.label,
      ratio:
        leaveAll.allowanceDays <= 0
          ? 0
          : Math.min(1, leaveAll.usedDays / Math.max(leaveAll.allowanceDays, 1)),
      tone: "success",
    },
    {
      key: "period",
      label: "Period hours",
      valueLabel: shortHours(data.periodTotalSeconds),
      secondary: input.periodLabel,
      ratio:
        data.periodTotalSeconds > 0
          ? Math.min(1, data.periodTotalSeconds / periodHoursTargetSeconds)
          : 0.08,
      tone: "foreground",
    },
    {
      key: "present",
      label: "Attendance streak",
      valueLabel: String(attendanceStreak.currentStreak),
      secondary: streakSecondaryLabel,
      ratio: Math.min(1, attendanceStreak.currentStreak / 7),
      tone: attendanceStreak.currentStreak > 0 ? "success" : "foreground",
      streakSegments: attendanceStreak.segments,
      bestInMonth: attendanceStreak.bestInMonth,
      monthPresentDays: attendanceStreak.monthPresentDays,
      monthWorkingDays: attendanceStreak.monthWorkingDays,
    },
    {
      key: "waste",
      label: "Waste",
      valueLabel: shortHours(data.periodWasteSeconds),
      secondary: "this period",
      ratio:
        data.periodWasteSeconds <= 0
          ? 0
          : Math.min(1, data.periodWasteSeconds / Math.max(data.periodTotalSeconds, 1)),
      tone: data.periodWasteSeconds <= 0 ? "foreground" : "warning",
    },
  ];

  const dob = data.hrProfile.dateOfBirth
    ? new Date(`${data.hrProfile.dateOfBirth}T12:00:00.000Z`)
    : null;

  return {
    userName: data.userName,
    userAvatarUrl: avatarUrl,
    email: data.email,
    role: data.role,
    roleLabel: roleLabel(data.role),
    joinedAtLabel,
    isSelf: data.isSelf,
    canAddReview: data.canAddReview,
    canManageLeave: data.canManageLeave,
    canEditHr: data.canEditHr,
    periodHoursLabel: shortHours(data.periodTotalSeconds),
    weekHoursTotalLabel: shortHours(weekHoursTotalSeconds),
    weekHoursCaption: input.selectedHeatDate ? weekContainingCaption(input.selectedHeatDate) : "",
    selectedHeatDate: input.selectedHeatDate,
    heatLayout,
    heatMap: {
      startDate: data.heatMap.startDate,
      endDate: data.heatMap.endDate,
      days: data.heatMap.days.map((day, index, all) => {
        let offBand: "single" | "start" | "middle" | "end" | null = null;
        if (day.off) {
          const leaveId = day.off.leaveId;
          const hasPrev = all[index - 1]?.off?.leaveId === leaveId;
          const hasNext = all[index + 1]?.off?.leaveId === leaveId;
          if (!hasPrev && !hasNext) offBand = "single";
          else if (!hasPrev && hasNext) offBand = "start";
          else if (hasPrev && hasNext) offBand = "middle";
          else offBand = "end";
        }
        return {
          ...day,
          hoursLabel: shortHours(day.totalSeconds),
          dayOfMonthLabel: String(Number(day.date.slice(8, 10))),
          offBand,
        };
      }),
    },
    leaveSummary,
    hr: {
      status: data.hrProfile.status,
      statusLabel: data.hrProfile.status === "active" ? "Active" : "Inactive",
      departmentId: data.hrProfile.departmentId,
      departmentName: data.hrProfile.departmentName,
      employmentType: data.hrProfile.employmentType,
      employmentTypeLabel: employmentTypeLabel(data.hrProfile.employmentType),
      workModel: data.hrProfile.workModel,
      workModelLabel: workModelLabel(data.hrProfile.workModel),
      gender: genderDisplayLabel(data.hrProfile.gender),
      dateOfBirthLabel:
        dob && !Number.isNaN(dob.getTime())
          ? dob.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })
          : null,
      phone: data.hrProfile.phone,
      address: data.hrProfile.address,
      linkedinUrl: data.hrProfile.linkedinUrl,
      xUrl: data.hrProfile.xUrl,
      instagramUrl: data.hrProfile.instagramUrl,
      offAllowanceDays: data.hrProfile.offAllowanceDays,
      leaveAllowancePeriod: data.hrProfile.leaveAllowancePeriod,
    },
    departments: input.departments,
    attendanceStreak,
    leaveGauges,
    weekHours: weekHoursSource.map((day) => ({
      date: day.date,
      weekdayLabel: day.weekdayLabel,
      totalSeconds: day.totalSeconds,
      hoursLabel: shortHours(day.totalSeconds),
      heightPct: Math.round((day.totalSeconds / maxWeekSeconds) * 100),
    })),
    calendar: {
      label: data.calendarMonth.label,
      weekdayLabels: data.calendarMonth.weekdayLabels,
      days: data.calendarMonth.days.map((day) => ({
        date: day.date,
        dayOfMonth: day.dayOfMonth,
        inMonth: day.inMonth,
        status: day.status,
        leaveId: day.leaveId,
      })),
      legend: [
        { status: "present", label: "logged", count: calendarLegendCounts.present },
        { status: "leave", label: "off", count: calendarLegendCounts.leave },
        { status: "holiday", label: "holiday", count: calendarLegendCounts.holiday },
        { status: "weekend", label: "weekend", count: calendarLegendCounts.weekend },
        { status: "empty", label: "no hours", count: calendarLegendCounts.empty },
      ],
      onPrevMonth: input.onPrevMonth,
      onNextMonth: input.onNextMonth,
      canGoPrevMonth: input.canGoPrevMonth,
      canGoNextMonth: input.canGoNextMonth,
      todayDate: input.today,
    },
    timeline: data.timeline.map((day, index) => {
      const defaultOpen =
        day.date === input.today ||
        (input.expandedDays[day.date] === undefined &&
          !data.timeline.some((entry) => entry.date === input.today) &&
          index === 0);
      const parts = formatDayParts(day.date, input.today);
      const countLabel = `${day.items.length} event${day.items.length === 1 ? "" : "s"}`;

      return {
        date: day.date,
        title: parts.title,
        subtitle: parts.subtitle,
        countLabel,
        open: input.expandedDays[day.date] ?? defaultOpen,
        items: day.items.map((item) => {
          if (item.kind === "review") {
            const authorAvatarUrl =
              item.authorAvatar && input.serverUrl
                ? getUserAvatarPublicUrl({
                    baseUrl: input.serverUrl,
                    userId: item.authorUserId,
                    storageKey: item.authorAvatar,
                  })
                : null;
            return {
              kind: "review" as const,
              id: item.id,
              body: item.body,
              authorName: item.authorName,
              authorAvatarUrl,
              timeLabel: new Date(item.createdAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              }),
            };
          }
          return {
            kind: "activity" as const,
            id: item.id,
            eventType: item.eventType,
            kindLabel: activityKindLabel(item.eventType),
            title: item.title,
            body: item.body,
            meta: item.meta,
            timeLabel: new Date(item.startedAt ?? item.createdAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            }),
            durationLabel:
              item.durationSeconds == null ? null : formatDuration(item.durationSeconds, "clock"),
            durationSeconds: item.durationSeconds,
            projectId: item.projectId,
            projectName: item.projectName,
            taskId: item.taskId,
            taskTitle: item.taskTitle,
            taskIconKey: item.taskIconKey,
            colorHueId: item.colorHueId,
            projectIconKey: item.projectIconKey,
            clientId: item.clientId,
            clientName: item.clientName,
            description: item.description,
            isWaste: item.isWaste,
            taskIsWaste: item.taskIsWaste,
            startedAt: item.startedAt,
            endedAt: item.endedAt,
            teamId: item.teamId,
            userId: item.userId,
            userName: item.userName,
            source: item.source,
            isBillable: item.isBillable,
          };
        }),
      };
    }),
  };
}
