import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { isWeekendDateKey } from "@orch/api/routers/agency-ops/resourcing/work-schedule";

import type { MemberProfileHeatMapData } from "@/features/shared/heat/member-profile-heat-map";
import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
import {
  buildPresenceCalendarDays,
  monthLabelFromKey,
  monthWindowDateKeys,
  presenceWeekdayLabels,
  shiftMonthKey,
  shortDisplayName,
  type PresenceDayCell,
  type PresencePerson,
} from "@/features/resourcing/resourcing-team-presence";
import { addDaysToDateKey } from "@/features/resourcing/resourcing-workload-heat";
import { useTeamWorkSchedule } from "@/features/shared/use-team-work-schedule";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type ResourcingActivityHeatMemberRow = {
  userId: string;
  userName: string;
  heatMap: MemberProfileHeatMapData;
};

type ResourcingAbsenceAgendaItem = {
  id: string;
  userId: string | null;
  userName: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string | null;
  daySpan: number;
};

type ResourcingOutPerson = PresencePerson & {
  leaveType: string;
  leaveReason: string | null;
};

export type AgencyResourcingWorkloadViewModel = {
  periodTitle: string;
  focusMonthKey: string;
  focusMonthLabel: string;
  activityRows: ResourcingActivityHeatMemberRow[];
  calendarDays: PresenceDayCell[];
  weekdayLabels: string[];
  selectedDate: string | null;
  selectedDay: PresenceDayCell | null;
  selectedOut: ResourcingOutPerson[];
  selectedOutPreview: ResourcingOutPerson[];
  selectedOutHiddenCount: number;
  selectedOutExpanded: boolean;
  selectedWorkingCount: number;
  coveragePct: number;
  briefingDayNumber: string;
  briefingWeekday: string;
  briefingHeadline: string;
  briefingStatus: string;
  selectedDayLabel: string;
  selectedDaySummary: string;
  agenda: ResourcingAbsenceAgendaItem[];
  memberCount: number;
  hasActivityData: boolean;
  isActivityPending: boolean;
  isLeavePending: boolean;
  isActivityError: boolean;
  isLeaveError: boolean;
  activityErrorMessage: string;
  leaveErrorMessage: string;
  canManageOffDays: boolean;
  canAddTeamHoliday: boolean;
  actorUserId: string | null;
  leaveRequestOpen: boolean;
  leaveRequestPending: boolean;
  leaveRequestError: string | null;
  leaveRequestDraft: {
    userId: string;
    startDate: string;
    endDate: string;
    type: "pto" | "sick" | "team_holiday" | "other" | "";
    reason: string;
  };
  goPrevPeriod: () => void;
  goNextPeriod: () => void;
  selectDate: (date: string) => void;
  isWeekendDate: (date: string) => boolean;
  setSelectedOutExpanded: (expanded: boolean) => void;
  openLeaveRequest: () => void;
  closeLeaveRequest: () => void;
  setLeaveRequestDraft: (
    patch: Partial<{
      userId: string;
      startDate: string;
      endDate: string;
      type: "pto" | "sick" | "team_holiday" | "other" | "";
      reason: string;
    }>,
  ) => void;
  submitLeaveRequest: () => Promise<boolean>;
  exportCsv: () => void;
  refetch: () => void;
};

const ABSENCE_PREVIEW_LIMIT = 4;

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function escapeCsvCell(value: string): string {
  const escaped = value.replaceAll('"', '""');
  const needsFormulaGuard = /^[=+\-@]/.test(escaped);
  const safe = needsFormulaGuard ? `'${escaped}` : escaped;
  return `"${safe}"`;
}

function shortHours(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function toActivityHeatMap(
  fromDate: string,
  toDate: string,
  days: Array<{
    date: string;
    totalSeconds: number;
    intensity: number;
    off: { type: string; reason: string | null } | null;
  }>,
): MemberProfileHeatMapData {
  return {
    startDate: fromDate,
    endDate: toDate,
    days: days.map((day, index, all) => {
      let offBand: "single" | "start" | "middle" | "end" | null = null;
      if (day.off) {
        const hasPrev = Boolean(all[index - 1]?.off);
        const hasNext = Boolean(all[index + 1]?.off);
        if (!hasPrev && !hasNext) offBand = "single";
        else if (!hasPrev && hasNext) offBand = "start";
        else if (hasPrev && hasNext) offBand = "middle";
        else offBand = "end";
      }
      return {
        date: day.date,
        totalSeconds: day.totalSeconds,
        intensity: day.intensity,
        off: day.off ? { type: day.off.type, reason: day.off.reason } : null,
        hoursLabel: shortHours(day.totalSeconds),
        dayOfMonthLabel: String(Number(day.date.slice(8, 10))),
        offBand,
      };
    }),
  };
}

export function leaveTypeLabel(type: string) {
  switch (type) {
    case "pto":
      return "Paid time off";
    case "sick":
      return "Sick";
    case "team_holiday":
      return "Team holiday";
    case "other":
      return "Personal";
    default:
      return type;
  }
}

function inclusiveDaySpan(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function weekdayShort(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

function defaultSelectedDate(
  monthKey: string,
  calendarDays: PresenceDayCell[],
  isWeekend: (dateKey: string) => boolean,
): string | null {
  const today = localDateKey();
  if (today.startsWith(monthKey) && calendarDays.some((day) => day.date === today)) {
    return today;
  }
  const firstWeekday = calendarDays.find(
    (day) => day.date && !isWeekend(day.date) && day.working.length + day.out.length > 0,
  );
  return firstWeekday?.date ?? calendarDays.find((day) => day.date)?.date ?? null;
}

export function useAgencyResourcingWorkload(teamId: string): AgencyResourcingWorkloadViewModel {
  const workSchedule = useTeamWorkSchedule(teamId);
  const isWeekend = (dateKey: string) =>
    isWeekendDateKey(dateKey, workSchedule.weekStartsOn, workSchedule.weekendDurationDays);
  const session = authClient.useSession();
  const actorUserId = session.data?.user?.id ?? null;

  const [focusMonthKey, setFocusMonthKey] = useState(() => localDateKey().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedOutExpanded, setSelectedOutExpanded] = useState(false);
  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false);
  const [leaveRequestError, setLeaveRequestError] = useState<string | null>(null);
  const [leaveRequestDraft, setLeaveRequestDraftState] = useState({
    userId: "",
    startDate: "",
    endDate: "",
    type: "" as "pto" | "sick" | "team_holiday" | "other" | "",
    reason: "",
  });
  const createLeave = useAgencyMemberProfileStore((state) => state.createLeave);
  const leaveRequestPending = useAgencyMemberProfileStore((state) => state.leavePending);

  const presenceWindow = useMemo(() => monthWindowDateKeys(focusMonthKey), [focusMonthKey]);
  const utcOffsetMinutes = new Date().getTimezoneOffset();

  const teamQuery = useQuery({
    ...orpc.team.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const teamRole = teamQuery.data?.role;
  const canManageOffDays = teamRole === "owner" || teamRole === "editor";
  const canAddTeamHoliday = canManageOffDays;

  const activityHeatQuery = useQuery({
    ...orpc.agencyOps.activityHeat.list.queryOptions({
      input: {
        teamId,
        fromDate: presenceWindow.fromDate,
        toDate: presenceWindow.toDate,
        utcOffsetMinutes,
      },
    }),
    enabled: Boolean(teamId),
  });

  const leaveQuery = useQuery({
    ...orpc.agencyOps.leave.list.queryOptions({
      input: {
        teamId,
        fromDate: presenceWindow.fromDate,
        toDate: addDaysToDateKey(presenceWindow.toDate, 45),
      },
    }),
    enabled: Boolean(teamId),
  });

  const hasActivityData = Boolean(activityHeatQuery.data);
  const activityRows = useMemo<ResourcingActivityHeatMemberRow[]>(() => {
    const fromDate = activityHeatQuery.data?.fromDate ?? presenceWindow.fromDate;
    const toDate = activityHeatQuery.data?.toDate ?? presenceWindow.toDate;
    return (activityHeatQuery.data?.members ?? []).map((member) => ({
      userId: member.userId,
      userName: member.userName,
      heatMap: toActivityHeatMap(fromDate, toDate, member.days),
    }));
  }, [activityHeatQuery.data, presenceWindow.fromDate, presenceWindow.toDate]);

  const calendarDays = useMemo(
    () => buildPresenceCalendarDays(activityRows, focusMonthKey, workSchedule.weekStartsOn),
    [activityRows, focusMonthKey, workSchedule.weekStartsOn],
  );

  const weekdayLabels = useMemo(
    () => presenceWeekdayLabels(workSchedule.weekStartsOn),
    [workSchedule.weekStartsOn],
  );

  useEffect(() => {
    setSelectedDate((current) => {
      if (current && calendarDays.some((day) => day.date === current && !isWeekend(current))) {
        return current;
      }
      return defaultSelectedDate(focusMonthKey, calendarDays, isWeekend);
    });
  }, [calendarDays, focusMonthKey, workSchedule.weekStartsOn, workSchedule.weekendDurationDays]);

  useEffect(() => {
    setSelectedOutExpanded(false);
  }, [selectedDate]);

  const selectedDay = useMemo(
    () => calendarDays.find((day) => day.date === selectedDate) ?? null,
    [calendarDays, selectedDate],
  );

  const selectedOut = useMemo<ResourcingOutPerson[]>(() => {
    if (!selectedDate || !selectedDay) return [];
    return selectedDay.out.map((person) => {
      const heatDay = activityRows
        .find((row) => row.userId === person.userId)
        ?.heatMap.days.find((day) => day.date === selectedDate);
      const rawType = typeof heatDay?.off?.type === "string" ? heatDay.off.type : "other";
      return {
        ...person,
        leaveType: leaveTypeLabel(rawType),
        leaveReason: heatDay?.off?.reason ?? null,
      };
    });
  }, [activityRows, selectedDate, selectedDay]);

  const selectedOutPreview = selectedOutExpanded
    ? selectedOut
    : selectedOut.slice(0, ABSENCE_PREVIEW_LIMIT);
  const selectedOutHiddenCount = Math.max(0, selectedOut.length - ABSENCE_PREVIEW_LIMIT);

  const selectedWorkingCount =
    selectedDate && isWeekend(selectedDate) ? 0 : (selectedDay?.working.length ?? 0);
  const memberCount = activityRows.length;
  const coveragePct = memberCount > 0 ? Math.round((selectedWorkingCount / memberCount) * 100) : 0;

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of activityRows) map.set(row.userId, row.userName);
    return map;
  }, [activityRows]);

  const agenda = useMemo<ResourcingAbsenceAgendaItem[]>(() => {
    const items = leaveQuery.data?.items ?? [];
    return items
      .filter((item) => item.endDate >= presenceWindow.fromDate)
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        userId: item.userId,
        userName:
          item.userId == null
            ? "Team holiday"
            : (nameByUserId.get(item.userId) ?? shortDisplayName(item.userId)),
        startDate: item.startDate,
        endDate: item.endDate,
        type: leaveTypeLabel(item.type),
        reason: item.reason,
        daySpan: inclusiveDaySpan(item.startDate, item.endDate),
      }));
  }, [leaveQuery.data?.items, nameByUserId, presenceWindow.fromDate]);

  const selectedDayLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "—";

  const briefingDayNumber = selectedDate ? selectedDate.slice(8, 10) : "—";
  const briefingWeekday = selectedDate ? weekdayShort(selectedDate).toUpperCase() : "—";
  const todayKey = localDateKey();
  const briefingHeadline = !hasActivityData
    ? "Team presence unavailable."
    : selectedDate
      ? `${selectedDate === todayKey ? "Today" : selectedDayLabel}: ${selectedWorkingCount} of ${memberCount || 0} not marked out.`
      : "Select a day to inspect presence.";
  const briefingStatus = !hasActivityData
    ? "Team presence data is unavailable."
    : selectedDate
      ? `${selectedWorkingCount} of ${memberCount} not marked out. ${selectedOut.length} out.`
      : "No day selected.";
  const selectedDaySummary =
    selectedOut.length === 0
      ? "No one is marked out."
      : `${selectedOut.length} ${selectedOut.length === 1 ? "person is" : "people are"} marked out.`;

  return {
    periodTitle: monthLabelFromKey(focusMonthKey),
    focusMonthKey,
    focusMonthLabel: monthLabelFromKey(focusMonthKey),
    activityRows,
    calendarDays,
    weekdayLabels,
    selectedDate,
    selectedDay,
    selectedOut,
    selectedOutPreview,
    selectedOutHiddenCount,
    selectedOutExpanded,
    selectedWorkingCount,
    coveragePct,
    briefingDayNumber,
    briefingWeekday,
    briefingHeadline,
    briefingStatus,
    selectedDayLabel,
    selectedDaySummary,
    agenda,
    memberCount,
    hasActivityData,
    isActivityPending: activityHeatQuery.isPending && !activityHeatQuery.data,
    isLeavePending: leaveQuery.isPending && !leaveQuery.data,
    isActivityError: activityHeatQuery.isError && !activityHeatQuery.data,
    isLeaveError: leaveQuery.isError && !leaveQuery.data,
    activityErrorMessage: getErrorMessage(activityHeatQuery.error, "Try refreshing."),
    leaveErrorMessage: getErrorMessage(leaveQuery.error, "Try refreshing."),
    canManageOffDays,
    canAddTeamHoliday,
    actorUserId,
    leaveRequestOpen,
    leaveRequestPending,
    leaveRequestError,
    leaveRequestDraft,
    goPrevPeriod: () => setFocusMonthKey((current) => shiftMonthKey(current, -1)),
    goNextPeriod: () => setFocusMonthKey((current) => shiftMonthKey(current, 1)),
    selectDate: (date) => {
      if (isWeekend(date)) return;
      setSelectedDate(date);
    },
    isWeekendDate: isWeekend,
    setSelectedOutExpanded,
    openLeaveRequest: () => {
      setLeaveRequestError(null);
      const defaultUserId = canManageOffDays
        ? (activityRows[0]?.userId ?? actorUserId ?? "")
        : (actorUserId ?? "");
      setLeaveRequestDraftState({
        userId: defaultUserId,
        startDate: selectedDate ?? `${focusMonthKey}-01`,
        endDate: selectedDate ?? `${focusMonthKey}-01`,
        type: "",
        reason: "",
      });
      setLeaveRequestOpen(true);
    },
    closeLeaveRequest: () => {
      setLeaveRequestOpen(false);
      setLeaveRequestError(null);
    },
    setLeaveRequestDraft: (patch) => {
      setLeaveRequestDraftState((current) => ({ ...current, ...patch }));
    },
    submitLeaveRequest: async () => {
      setLeaveRequestError(null);
      const { userId, startDate, endDate, type, reason } = leaveRequestDraft;
      if (!startDate || !endDate || !type) {
        setLeaveRequestError("Choose dates and an off-day type before saving.");
        return false;
      }
      if (type !== "team_holiday" && !userId) {
        setLeaveRequestError("Choose a teammate before saving.");
        return false;
      }
      if (type === "team_holiday" && !canAddTeamHoliday) {
        setLeaveRequestError("Only managers can add team holidays.");
        return false;
      }
      if (type !== "team_holiday" && !canManageOffDays && userId !== actorUserId) {
        setLeaveRequestError("You can only add off days for yourself.");
        return false;
      }
      if (endDate < startDate) {
        setLeaveRequestError("End date must be on or after the start date.");
        return false;
      }
      try {
        await createLeave({
          teamId,
          userId: type === "team_holiday" ? null : userId,
          startDate,
          endDate,
          type,
          reason: reason.trim() || null,
        });
        await Promise.all([activityHeatQuery.refetch(), leaveQuery.refetch()]);
        toast.success("Off days saved");
        setLeaveRequestOpen(false);
        return true;
      } catch (error) {
        setLeaveRequestError(getErrorMessage(error, "Couldn't save off days."));
        return false;
      }
    },
    exportCsv: () => {
      const rows: string[][] = [["Team member", "Date", "Status"]];
      for (const member of activityRows) {
        for (const day of member.heatMap.days) {
          if (!day.date.startsWith(focusMonthKey) || isWeekend(day.date)) continue;
          rows.push([
            member.userName,
            day.date,
            day.off ? leaveTypeLabel(day.off.type) : "Not marked out",
          ]);
        }
      }
      const csv = rows.map((row) => row.map((value) => escapeCsvCell(value)).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `orch-resourcing-${focusMonthKey}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded", {
        description: `Presence for ${monthLabelFromKey(focusMonthKey)}.`,
      });
    },
    refetch: () => {
      void activityHeatQuery.refetch();
      void leaveQuery.refetch();
    },
  };
}
