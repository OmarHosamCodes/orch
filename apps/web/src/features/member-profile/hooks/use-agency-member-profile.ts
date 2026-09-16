import { toFiscalCalendar } from "@orch/api/routers/agency-ops/resourcing/tenure-engine";
import { DEFAULT_WORK_SCHEDULE } from "@orch/api/routers/agency-ops/resourcing/work-schedule";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/navigation";
import { toast } from "sonner";

import type {
  AgencyMemberProfileViewModel,
  LeaveType,
} from "@/features/member-profile/agency-member-profile-types";
import {
  emptyHrDraft,
  leaveRangeLabel,
  leaveTypeLabel,
  normalizeGenderDraft,
  rangePresetDisplayLabel,
  todayKey,
} from "@/features/member-profile/member-profile-format";
import { buildMemberProfileView } from "@/features/member-profile/to-member-profile-view";
import { buildMemberProfileGaugeDetail } from "@/features/member-profile/to-gauge-detail-context";
import { agencyTimeRangeCanReset } from "@/features/shared/command-bar/agency-time-range-can-reset";
import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import { useMemberProfileAlerts } from "@/features/member-profile/hooks/use-member-profile-alerts";
import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
import type { AlertPeriodTarget } from "@/features/member-profile/member-profile-alert-period";
import { resolveAlertPeriodTarget } from "@/features/member-profile/member-profile-alert-period";
import type { GaugeDetailModel } from "@/features/member-profile/member-profile-gauge-detail";
import {
  resolveAgencyRangeFromPreset,
  startOfWeekUtc,
  toDateInputValue,
} from "@/features/shared/use-agency-time-range-filters";
import {
  getCurrentTenurePeriodRange,
  getCurrentTenureQuarterMonths,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
  resolveProfilePeriodMonth,
} from "@/features/resourcing/tenure-utils";
import { useCurrentAgencyTeam } from "@/features/time-tracking/stores/agency-timer";
import { useTeamStore } from "@/features/team/team-store";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/env";
import { orpc } from "@/lib/orpc";

import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";
import {
  resolveMemberProfileRosterNav,
  type MemberProfileRosterMember,
} from "@/features/member-profile/member-profile-roster-nav";
import {
  canShiftProfilePeriodMonth,
  resolveDefaultProfilePeriodMonthStart,
  resolveProfilePaceParams,
  resolveProfilePeriodMonthBounds,
  shiftProfilePeriodMonthWithinBounds,
} from "@/features/member-profile/member-profile-period";

export type { AgencyMemberProfileViewModel } from "@/features/member-profile/agency-member-profile-types";

export function useAgencyMemberProfile(subjectUserId: string): AgencyMemberProfileViewModel {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentAgencyTeamId } = useCurrentAgencyTeam();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const teamId = currentAgencyTeamId || selectedTeamId || "";
  const utcOffsetMinutes = new Date().getTimezoneOffset();
  const today = todayKey(utcOffsetMinutes);
  const queryClient = useQueryClient();
  const store = useAgencyMemberProfileStore();
  const now = useMemo(() => new Date(), []);
  const serverUrl = getServerUrl();
  const [profileImagePending, setProfileImagePending] = useState(false);

  useEffect(() => {
    if (searchParams.get("focus") !== "alerts") return;
    const node = document.getElementById("member-profile-alerts");
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, subjectUserId]);

  const membersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId && session.data?.user),
  });

  const tenurePolicyQuery = useQuery({
    ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const tenurePolicy = tenurePolicyQuery.data?.policy ?? null;
  const defaultRangePreset = useMemo(
    () => resolveDefaultDashboardRangePreset(tenurePolicy),
    [tenurePolicy],
  );
  const defaultTenureMonthIndexes = useMemo(
    () => resolveDefaultTenureMonthIndexes(tenurePolicy, now),
    [now, tenurePolicy],
  );
  const tenureQuarterMonths = useMemo(
    () => getCurrentTenureQuarterMonths(tenurePolicy, now) ?? [],
    [now, tenurePolicy],
  );

  const weekStartsOn = tenurePolicy?.weekStartsOn ?? DEFAULT_WORK_SCHEDULE.weekStartsOn;
  const weekendDurationDays =
    tenurePolicy?.weekendDurationDays ?? DEFAULT_WORK_SCHEDULE.weekendDurationDays;
  const defaultCustomFromDate = toDateInputValue(startOfWeekUtc(weekStartsOn, now));
  const defaultCustomToDate = toDateInputValue(now);
  const defaultCustomRangeRef = useRef({
    from: defaultCustomFromDate,
    to: defaultCustomToDate,
  });

  const [appliedRangePreset, setAppliedRangePreset] = useState<RangePreset | null>(null);
  const [appliedCustomFromDate, setAppliedCustomFromDate] = useState(defaultCustomFromDate);
  const [appliedCustomToDate, setAppliedCustomToDate] = useState(defaultCustomToDate);
  const [appliedTenureMonthIndexes, setAppliedTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveAppliedRangePreset = appliedRangePreset ?? defaultRangePreset;
  const effectiveAppliedTenureMonthIndexes = appliedTenureMonthIndexes ?? defaultTenureMonthIndexes;

  const [draftRangePreset, setDraftRangePreset] = useState<RangePreset | null>(null);
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(defaultCustomFromDate);
  const [draftCustomToDate, setDraftCustomToDate] = useState(defaultCustomToDate);
  const [draftTenureMonthIndexes, setDraftTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveDraftRangePreset = draftRangePreset ?? defaultRangePreset;
  const effectiveDraftTenureMonthIndexes = draftTenureMonthIndexes ?? defaultTenureMonthIndexes;

  const appliedTenurePeriodLabel = useMemo(
    () =>
      getCurrentTenurePeriodRange(tenurePolicy, now, effectiveAppliedTenureMonthIndexes)
        ?.simpleLabel ?? null,
    [effectiveAppliedTenureMonthIndexes, now, tenurePolicy],
  );
  const tenurePeriodLabel = useMemo(
    () =>
      getCurrentTenurePeriodRange(tenurePolicy, now, effectiveDraftTenureMonthIndexes)
        ?.simpleLabel ?? null,
    [effectiveDraftTenureMonthIndexes, now, tenurePolicy],
  );
  const tenureQuarterLabel = useMemo(
    () => getCurrentTenurePeriodRange(tenurePolicy, now)?.simpleLabel ?? null,
    [now, tenurePolicy],
  );

  const range = useMemo(
    () =>
      resolveAgencyRangeFromPreset(
        effectiveAppliedRangePreset,
        appliedCustomFromDate,
        appliedCustomToDate,
        tenurePolicy,
        now,
        effectiveAppliedTenureMonthIndexes,
        weekStartsOn,
      ),
    [
      appliedCustomFromDate,
      appliedCustomToDate,
      effectiveAppliedRangePreset,
      effectiveAppliedTenureMonthIndexes,
      now,
      tenurePolicy,
      weekStartsOn,
    ],
  );

  const hasPendingPeriodChanges =
    effectiveDraftRangePreset !== effectiveAppliedRangePreset ||
    draftCustomFromDate !== appliedCustomFromDate ||
    draftCustomToDate !== appliedCustomToDate ||
    draftTenureMonthIndexes !== appliedTenureMonthIndexes;

  const canResetPeriod = agencyTimeRangeCanReset({
    rangePreset: effectiveDraftRangePreset,
    defaultRangePreset,
    tenureMonthIndexes: effectiveDraftTenureMonthIndexes,
    defaultTenureMonthIndexes,
    clientIds: [],
    projectIds: [],
    memberUserIds: [],
    customFromDate: draftCustomFromDate,
    customToDate: draftCustomToDate,
    defaultCustomFromDate: defaultCustomRangeRef.current.from,
    defaultCustomToDate: defaultCustomRangeRef.current.to,
  });

  function applyPeriodDraft() {
    setAppliedRangePreset(draftRangePreset);
    setAppliedCustomFromDate(draftCustomFromDate);
    setAppliedCustomToDate(draftCustomToDate);
    setAppliedTenureMonthIndexes(draftTenureMonthIndexes);
    setPeriodMonthStartOverride(null);
  }

  function resetPeriodDraft() {
    setDraftRangePreset(null);
    setDraftCustomFromDate(defaultCustomRangeRef.current.from);
    setDraftCustomToDate(defaultCustomRangeRef.current.to);
    setDraftTenureMonthIndexes(null);
    setAppliedRangePreset(null);
    setAppliedCustomFromDate(defaultCustomRangeRef.current.from);
    setAppliedCustomToDate(defaultCustomRangeRef.current.to);
    setAppliedTenureMonthIndexes(null);
    setPeriodMonthStartOverride(null);
  }

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ [today]: true });
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [hrDialogOpen, setHrDialogOpen] = useState(false);
  const [offDayRangeSelect, setOffDayRangeSelect] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [leaveRemoveTarget, setLeaveRemoveTarget] = useState<{
    leaveId: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    rangeLabel: string;
    typeLabel: string;
  } | null>(null);
  const [leaveDraft, setLeaveDraftState] = useState({
    startDate: today,
    endDate: today,
    type: "pto" as LeaveType,
    reason: "",
    teamWide: false,
  });
  const [reviewDraft, setReviewDraftState] = useState({
    reviewDate: today,
    body: "",
  });
  const [hrDraft, setHrDraftState] = useState(emptyHrDraft);
  const pendingFocusDateRef = useRef<string | null>(null);
  const [highlightedActivityDate, setHighlightedActivityDate] = useState<string | null>(null);
  const [selectedHeatDate, setSelectedHeatDate] = useState<string | null>(null);
  const [openGaugeKey, setOpenGaugeKey] = useState<StatPlateKey | null>(null);
  const [hrInactiveConfirmOpen, setHrInactiveConfirmOpen] = useState(false);
  const fiscalCalendar = useMemo(
    () =>
      toFiscalCalendar({
        fiscalYearStartMonth: tenurePolicy?.fiscalYearStartMonth ?? 1,
        fiscalYearStartDay: tenurePolicy?.fiscalYearStartDay ?? 1,
      }),
    [tenurePolicy],
  );
  const rangeStartKey = range.from.slice(0, 10);
  const rangeEndKey = range.to.slice(0, 10);

  const tenureEnabled = tenurePolicy?.enabled ?? false;
  const periodMonthBounds = useMemo(
    () =>
      resolveProfilePeriodMonthBounds(rangeStartKey, rangeEndKey, tenureEnabled, fiscalCalendar),
    [fiscalCalendar, rangeEndKey, rangeStartKey, tenureEnabled],
  );
  const defaultPeriodMonthStart = useMemo(
    () =>
      resolveDefaultProfilePeriodMonthStart(
        rangeStartKey,
        rangeEndKey,
        today,
        tenureEnabled,
        fiscalCalendar,
      ),
    [fiscalCalendar, rangeEndKey, rangeStartKey, tenureEnabled, today],
  );

  const [periodMonthStartOverride, setPeriodMonthStartOverride] = useState<string | null>(null);
  const periodMonthStart = periodMonthStartOverride ?? defaultPeriodMonthStart;

  useEffect(() => {
    setPeriodMonthStartOverride(null);
    setSelectedHeatDate(null);
  }, [subjectUserId]);

  const onRangePresetChange = useCallback((preset: RangePreset) => {
    setDraftRangePreset(preset);
    setPeriodMonthStartOverride(null);
  }, []);

  const onTenureMonthIndexesChange = useCallback((indexes: number[]) => {
    setDraftTenureMonthIndexes(indexes);
    setPeriodMonthStartOverride(null);
  }, []);

  const onCustomFromChange = useCallback((value: string) => {
    setDraftCustomFromDate(value);
    setPeriodMonthStartOverride(null);
  }, []);

  const onCustomToChange = useCallback((value: string) => {
    setDraftCustomToDate(value);
    setPeriodMonthStartOverride(null);
  }, []);

  const profileQueryInput = useMemo(
    () => ({
      teamId,
      userId: subjectUserId,
      utcOffsetMinutes,
      from: range.from,
      to: range.to,
      periodMonthStart,
    }),
    [periodMonthStart, range.from, range.to, subjectUserId, teamId, utcOffsetMinutes],
  );

  const profileQuery = useQuery({
    ...orpc.agencyOps.memberProfile.get.queryOptions({
      input: profileQueryInput,
    }),
    enabled: Boolean(teamId && subjectUserId && session.data?.user),
    placeholderData: (previousData) =>
      previousData?.userId === subjectUserId ? previousData : undefined,
  });

  const departmentsQuery = useQuery({
    ...orpc.agencyOps.departments.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId && session.data?.user),
  });

  function scrollToActivityDay(date: string) {
    setExpandedDays((prev) => ({ ...prev, [date]: true }));
    const el = document.getElementById(`member-profile-day-${date}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function shimmerActivityDay(date: string) {
    scrollToActivityDay(date);
    // Drop then re-set so a repeat jump restarts the CSS animation.
    setHighlightedActivityDate(null);
    requestAnimationFrame(() => setHighlightedActivityDate(date));
  }

  function openAlertPeriod(target: AlertPeriodTarget) {
    const focusDate = target.kind === "day" ? target.dateKey : target.focusDate;
    const alreadyOnTargetPeriod =
      effectiveAppliedRangePreset === "custom" &&
      target.from === rangeStartKey &&
      target.to === rangeEndKey;
    const dayMounted = Boolean(document.getElementById(`member-profile-day-${focusDate}`));

    // Snap the profile period to the alert window so the day's entries load even when
    // the current preset omits that date from the timeline.
    if (alreadyOnTargetPeriod && dayMounted) {
      shimmerActivityDay(focusDate);
      return;
    }

    setDraftRangePreset("custom");
    setDraftCustomFromDate(target.from);
    setDraftCustomToDate(target.to);
    setAppliedRangePreset("custom");
    setAppliedCustomFromDate(target.from);
    setAppliedCustomToDate(target.to);
    setPeriodMonthStartOverride(
      resolveProfilePeriodMonth({
        tenureEnabled,
        calendar: fiscalCalendar,
        anchorDateKey: focusDate,
        requestedStartKey: target.kind === "month" ? target.from : undefined,
      }).startKey,
    );
    pendingFocusDateRef.current = focusDate;
  }

  const alertsFiscalCalendar = tenurePolicy
    ? {
        fiscalYearStartMonth: tenurePolicy.fiscalYearStartMonth,
        fiscalYearStartDay: tenurePolicy.fiscalYearStartDay,
      }
    : undefined;

  const alerts = useMemberProfileAlerts({
    teamId,
    subjectUserId,
    utcOffsetMinutes,
    fiscalCalendar: alertsFiscalCalendar,
    onOpenPeriod: openAlertPeriod,
  });

  const alertDeepLinkHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.get("focus") !== "alerts") return;
    const alertId = searchParams.get("alertId");
    const day = searchParams.get("day");
    const periodKey = searchParams.get("period");
    const linkKey = `${alertId ?? ""}:${day ?? ""}:${periodKey ?? ""}`;
    if (alertDeepLinkHandledRef.current === linkKey) return;
    alertDeepLinkHandledRef.current = linkKey;

    if (alertId) {
      alerts.openDetail(alertId);
    }
    const target = resolveAlertPeriodTarget(
      {
        dateKey: day ?? undefined,
        periodKey: periodKey ?? undefined,
      },
      alertsFiscalCalendar,
    );
    if (target) {
      openAlertPeriod(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume landing URL once per subject/params
  }, [searchParams, subjectUserId]);

  useEffect(() => {
    const date = pendingFocusDateRef.current;
    if (!date || profileQuery.isFetching || profileQuery.isPending) return;
    const timeline = profileQuery.data?.timeline ?? [];
    const focusDate = timeline.some((day) => day.date === date)
      ? date
      : (timeline[0]?.date ?? null);
    if (!focusDate) return;
    pendingFocusDateRef.current = null;
    // Defer one frame so the activity rails mount after period data swaps.
    requestAnimationFrame(() => shimmerActivityDay(focusDate));
  }, [profileQuery.data, profileQuery.isFetching, profileQuery.isPending, range.from, range.to]);

  useEffect(() => {
    if (!highlightedActivityDate) return;
    const clearHandle = window.setTimeout(() => {
      setHighlightedActivityDate(null);
    }, 2400);
    return () => window.clearTimeout(clearHandle);
  }, [highlightedActivityDate]);

  const invalidate = useMutation({
    mutationFn: async () => undefined,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.memberProfile.get.key(),
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.departments.list.key({ input: { teamId } }),
      });
      alerts.refetch();
    },
  });

  const periodLabel = rangePresetDisplayLabel(
    effectiveAppliedRangePreset,
    appliedTenurePeriodLabel,
    appliedCustomFromDate,
    appliedCustomToDate,
  );

  const canGoPrevCalendarMonth = canShiftProfilePeriodMonth(
    periodMonthStart,
    -1,
    periodMonthBounds,
  );
  const canGoNextCalendarMonth = canShiftProfilePeriodMonth(periodMonthStart, 1, periodMonthBounds);

  const monthlyMinHours = tenurePolicy?.monthlyMinHours ?? 200;
  const quarterlyMinHours = tenurePolicy?.quarterlyMinHours ?? 525;
  const requiredDailyHours =
    tenurePolicy?.requiredDailyHours ?? DEFAULT_WORK_SCHEDULE.requiredDailyHours;
  const offDayReduceHours = tenurePolicy?.offDayReduceHours ?? 8;
  const paceParams = useMemo(
    () =>
      resolveProfilePaceParams({
        rangeStartKey,
        rangeEndKey,
        tenureEnabled,
        fiscalCalendar,
        monthlyMinHours,
        quarterlyMinHours,
        effectiveRangePreset: effectiveAppliedRangePreset,
        effectiveTenureMonthIndexes: effectiveAppliedTenureMonthIndexes,
        tenureQuarterMonths,
        anchorDateKey: today,
      }),
    [
      effectiveAppliedRangePreset,
      effectiveAppliedTenureMonthIndexes,
      fiscalCalendar,
      monthlyMinHours,
      quarterlyMinHours,
      rangeEndKey,
      rangeStartKey,
      tenureEnabled,
      tenureQuarterMonths,
      today,
    ],
  );

  const onCalendarPrevMonth = useCallback(() => {
    const next = shiftProfilePeriodMonthWithinBounds(
      periodMonthStart,
      -1,
      periodMonthBounds,
      tenureEnabled,
      fiscalCalendar,
    );
    if (next) setPeriodMonthStartOverride(next);
  }, [fiscalCalendar, periodMonthBounds, periodMonthStart, tenureEnabled]);

  const onCalendarNextMonth = useCallback(() => {
    const next = shiftProfilePeriodMonthWithinBounds(
      periodMonthStart,
      1,
      periodMonthBounds,
      tenureEnabled,
      fiscalCalendar,
    );
    if (next) setPeriodMonthStartOverride(next);
  }, [fiscalCalendar, periodMonthBounds, periodMonthStart, tenureEnabled]);

  const profile = useMemo(() => {
    const data = profileQuery.data;
    if (!data || data.userId !== subjectUserId) return null;
    return buildMemberProfileView({
      data,
      subjectUserId,
      serverUrl,
      today,
      periodLabel,
      paceParams,
      effectiveRangePreset: effectiveAppliedRangePreset,
      effectiveTenureMonthIndexes: effectiveAppliedTenureMonthIndexes,
      expandedDays,
      selectedHeatDate,
      weekStartsOn,
      weekendDurationDays,
      rangeStartKey,
      rangeEndKey,
      requiredDailyHours,
      offDayReduceHours,
      departments: (departmentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
      })),
      onPrevMonth: onCalendarPrevMonth,
      onNextMonth: onCalendarNextMonth,
      canGoPrevMonth: canGoPrevCalendarMonth,
      canGoNextMonth: canGoNextCalendarMonth,
    });
  }, [
    departmentsQuery.data?.items,
    effectiveAppliedRangePreset,
    effectiveAppliedTenureMonthIndexes,
    expandedDays,
    onCalendarNextMonth,
    onCalendarPrevMonth,
    canGoNextCalendarMonth,
    canGoPrevCalendarMonth,
    offDayReduceHours,
    paceParams,
    periodLabel,
    profileQuery.data,
    requiredDailyHours,
    selectedHeatDate,
    serverUrl,
    today,
    subjectUserId,
    weekStartsOn,
    weekendDurationDays,
    rangeStartKey,
    rangeEndKey,
  ]);

  const gaugeDetail = useMemo((): GaugeDetailModel | null => {
    if (!openGaugeKey || !profile || !profileQuery.data) return null;
    return buildMemberProfileGaugeDetail({
      openGaugeKey,
      data: profileQuery.data,
      profile,
      attendanceStreak: profile.attendanceStreak,
      periodLabel,
      today,
      weekStartsOn,
      weekendDurationDays,
      offDayReduceHours,
      requiredDailyHours,
      paceParams,
    });
  }, [
    openGaugeKey,
    periodLabel,
    profile,
    profileQuery.data,
    paceParams,
    offDayReduceHours,
    requiredDailyHours,
    today,
    weekStartsOn,
    weekendDurationDays,
  ]);

  // Keep leave/review drafts inside the selected period when the range changes.
  const clampedDefaultDate =
    today < rangeStartKey ? rangeStartKey : today > rangeEndKey ? rangeEndKey : today;

  const rosterMembers = useMemo<MemberProfileRosterMember[]>(
    () =>
      (membersQuery.data?.items ?? []).map((member) => ({
        userId: member.userId,
        userName: member.userName,
        userAvatarUrl: member.userAvatar ?? null,
      })),
    [membersQuery.data?.items],
  );

  const rosterNav = useMemo(
    () => resolveMemberProfileRosterNav(rosterMembers, subjectUserId),
    [rosterMembers, subjectUserId],
  );

  const memberNav = useMemo(() => {
    const goTo = (userId: string) => {
      if (!userId || userId === subjectUserId) return;
      navigate(`/agency/members/${encodeURIComponent(userId)}`);
    };
    return {
      members: rosterNav.members,
      current: rosterNav.current,
      previous: rosterNav.previous,
      next: rosterNav.next,
      indexLabel:
        rosterNav.index >= 0 && rosterNav.total > 0
          ? `${rosterNav.index + 1} of ${rosterNav.total}`
          : null,
      canGoPrevious: Boolean(rosterNav.previous),
      canGoNext: Boolean(rosterNav.next),
      loading: membersQuery.isPending,
      onGoPrevious() {
        if (rosterNav.previous) goTo(rosterNav.previous.userId);
      },
      onGoNext() {
        if (rosterNav.next) goTo(rosterNav.next.userId);
      },
      onSelectMember(userId: string) {
        goTo(userId);
      },
    };
  }, [
    membersQuery.isPending,
    navigate,
    rosterNav.current,
    rosterNav.index,
    rosterNav.members,
    rosterNav.next,
    rosterNav.previous,
    rosterNav.total,
    subjectUserId,
  ]);

  async function persistHrProfile() {
    if (!teamId || !profile) return;
    try {
      await store.upsertHrProfile({
        teamId,
        userId: subjectUserId,
        status: hrDraft.status,
        departmentId: hrDraft.departmentId || null,
        employmentType: hrDraft.employmentType || null,
        workModel: hrDraft.workModel || null,
        gender: normalizeGenderDraft(hrDraft.gender) || null,
        dateOfBirth: hrDraft.dateOfBirth || null,
        phone: hrDraft.phone.trim() || null,
        address: hrDraft.address.trim() || null,
      });
      toast.success("Profile saved");
      setHrDialogOpen(false);
      setHrInactiveConfirmOpen(false);
      await invalidate.mutateAsync();
      await profileQuery.refetch();
    } catch {
      toast.error("Couldn't save profile");
    }
  }

  async function uploadProfileImage(file: File) {
    if (!profile?.isSelf || !serverUrl) return;

    setProfileImagePending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${serverUrl}/uploads/user-avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({ error: "Upload failed" }))) as {
          error?: string;
        };
        throw new Error(error.error ?? "Upload failed");
      }

      const result = (await response.json()) as { storageKey?: string };
      if (!result.storageKey) throw new Error("Upload did not return an image.");
      await authClient.updateUser({ image: result.storageKey });
      await Promise.all([profileQuery.refetch(), membersQuery.refetch()]);
      toast.success("Profile image updated");
    } catch (error) {
      toast.error("Couldn't update profile image", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setProfileImagePending(false);
    }
  }

  return {
    teamId,
    subjectUserId,
    loading: profileQuery.isPending || tenurePolicyQuery.isPending,
    refreshing:
      (profileQuery.isFetching && Boolean(profileQuery.data?.userId === subjectUserId)) ||
      (tenurePolicyQuery.isFetching && Boolean(tenurePolicyQuery.data)),
    error: profileQuery.error
      ? profileQuery.error instanceof Error
        ? profileQuery.error.message
        : "Couldn't load profile"
      : store.error,
    memberNav,
    period: {
      rangePreset: effectiveDraftRangePreset,
      onRangePresetChange,
      customFromDate: draftCustomFromDate,
      onCustomFromChange,
      customToDate: draftCustomToDate,
      onCustomToChange,
      tenureAvailable: Boolean(tenurePolicy?.enabled),
      tenurePeriodLabel,
      tenureQuarterLabel,
      tenureQuarterMonths,
      tenureMonthIndexes: effectiveDraftTenureMonthIndexes,
      onTenureMonthIndexesChange,
      weekStartsOn,
      label: periodLabel,
      hasPendingChanges: hasPendingPeriodChanges,
      onApply: applyPeriodDraft,
      canReset: canResetPeriod,
      onReset: resetPeriodDraft,
    },
    profile,
    profileImagePending,
    leaveDialogOpen,
    reviewDialogOpen,
    hrDialogOpen,
    offDayRangeSelect,
    leaveRemoveTarget,
    leavePending: store.leavePending,
    reviewPending: store.reviewPending,
    hrPending: store.hrPending,
    hrInactiveConfirmOpen,
    setHrInactiveConfirmOpen,
    leaveDraft,
    reviewDraft,
    hrDraft,
    alerts,
    setLeaveDialogOpen,
    setReviewDialogOpen(open) {
      if (open) {
        setReviewDraftState((prev) => ({ ...prev, reviewDate: clampedDefaultDate }));
      }
      setReviewDialogOpen(open);
    },
    setHrDialogOpen(open) {
      if (open && profile) {
        setHrDraftState({
          status: profile.hr.status,
          departmentId: profile.hr.departmentId ?? "",
          employmentType: profile.hr.employmentType ?? "",
          workModel: profile.hr.workModel ?? "",
          gender: normalizeGenderDraft(profile.hr.gender),
          dateOfBirth: profileQuery.data?.hrProfile.dateOfBirth ?? "",
          phone: profile.hr.phone ?? "",
          address: profile.hr.address ?? "",
        });
      }
      setHrDialogOpen(open);
    },
    openOffDayRangeSelect(startDate) {
      setOffDayRangeSelect({ startDate, endDate: startDate });
    },
    closeOffDayRangeSelect() {
      setOffDayRangeSelect(null);
    },
    confirmOffDayRangeSelect(next) {
      setOffDayRangeSelect(null);
      setLeaveDraftState((prev) => ({
        ...prev,
        startDate: next.startDate,
        endDate: next.endDate,
      }));
      setLeaveDialogOpen(true);
    },
    openAddOffDay(date) {
      setLeaveDraftState((prev) => ({
        ...prev,
        startDate: date,
        endDate: date,
      }));
      setLeaveDialogOpen(true);
    },
    openAddOffDayDialog() {
      setLeaveDraftState((prev) => ({
        ...prev,
        startDate: clampedDefaultDate,
        endDate: clampedDefaultDate,
      }));
      setLeaveDialogOpen(true);
    },
    openRemoveLeave(leaveId, clickedDate) {
      const data = profileQuery.data;
      if (!data) return;
      const fromLeave = data.leave.find((row) => row.id === leaveId);
      const fromHeat = data.heatMap.days.find((day) => day.off?.leaveId === leaveId)?.off;
      const startDate = fromLeave?.startDate ?? fromHeat?.rangeStart ?? clickedDate ?? "";
      const endDate = fromLeave?.endDate ?? fromHeat?.rangeEnd ?? clickedDate ?? "";
      const type = (fromLeave?.type ?? fromHeat?.type ?? "other") as LeaveType;
      const hasRange = Boolean(startDate && endDate);
      setLeaveRemoveTarget({
        leaveId,
        startDate,
        endDate,
        type,
        rangeLabel: hasRange ? leaveRangeLabel(startDate, endDate) : "this off day",
        typeLabel: leaveTypeLabel(type),
      });
    },
    closeRemoveLeave() {
      setLeaveRemoveTarget(null);
    },
    async confirmRemoveLeave() {
      if (!teamId || !leaveRemoveTarget) return;
      try {
        await store.deleteLeave({ teamId, leaveId: leaveRemoveTarget.leaveId });
        toast.success("Off day removed");
        setLeaveRemoveTarget(null);
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't remove off day");
      }
    },
    setLeaveDraft(patch) {
      setLeaveDraftState((prev) => ({ ...prev, ...patch }));
    },
    setReviewDraft(patch) {
      setReviewDraftState((prev) => ({ ...prev, ...patch }));
    },
    setHrDraft(patch) {
      setHrDraftState((prev) => ({ ...prev, ...patch }));
    },
    toggleDay(date) {
      setExpandedDays((prev) => ({ ...prev, [date]: !(prev[date] ?? date === today) }));
    },
    focusDay(date) {
      setSelectedHeatDate(date);
      scrollToActivityDay(date);
    },
    highlightedActivityDate,
    openGaugeKey,
    gaugeDetail,
    openGauge(key) {
      if (!profile || profileQuery.data?.userId !== subjectUserId) return;
      setOpenGaugeKey(key);
    },
    closeGauge() {
      setOpenGaugeKey(null);
    },
    runGaugePrimaryAction() {
      const action = gaugeDetail?.primaryAction;
      if (!action) return;
      setOpenGaugeKey(null);
      if (action.kind === "add_off_day") {
        setLeaveDraftState((prev) => ({
          ...prev,
          startDate: clampedDefaultDate,
          endDate: clampedDefaultDate,
        }));
        setLeaveDialogOpen(true);
        return;
      }
      setSelectedHeatDate(action.date);
      scrollToActivityDay(action.date);
    },
    focusGaugeDay(date: string) {
      setOpenGaugeKey(null);
      setSelectedHeatDate(date);
      scrollToActivityDay(date);
    },
    askOrchAboutMember() {
      if (!profile) return;
      const agent = useWorkspaceAgentStore.getState();
      for (const chip of agent.scopeChips) {
        if (chip.kind === "member") agent.removeScopeChip(chip.id);
      }
      if (!profile.isSelf) {
        agent.addScopeChip({
          kind: "member",
          id: subjectUserId,
          label: profile.userName.trim() || "Member",
        });
      }
      agent.seedComposer({
        toolPreset: "ask",
        text: profile.isSelf
          ? `Review my profile for ${periodLabel}. Summarize hours, attendance, off days, and waste. Flag anomalies or risks, cite the relevant dates and figures, and recommend next steps.`
          : `Review ${profile.userName.trim() || "this member"}'s profile for ${periodLabel}. Summarize hours, attendance, off days, and waste. Flag anomalies or risks, cite the relevant dates and figures, and recommend next steps.`,
      });
    },
    retry() {
      void profileQuery.refetch();
      alerts.refetch();
    },
    async submitLeave() {
      if (!teamId || !profile) return;
      try {
        await store.createLeave({
          teamId,
          userId: leaveDraft.teamWide || leaveDraft.type === "team_holiday" ? null : subjectUserId,
          startDate: leaveDraft.startDate,
          endDate: leaveDraft.endDate,
          type: leaveDraft.teamWide ? "team_holiday" : leaveDraft.type,
          reason: leaveDraft.reason.trim() || null,
        });
        toast.success("Off day saved");
        setLeaveDialogOpen(false);
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't save off day");
      }
    },
    async submitReview() {
      if (!teamId || !profile) return;
      try {
        await store.createReview({
          teamId,
          subjectUserId,
          reviewDate: reviewDraft.reviewDate,
          body: reviewDraft.body,
        });
        toast.success("Review saved");
        setReviewDialogOpen(false);
        setReviewDraftState({ reviewDate: clampedDefaultDate, body: "" });
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't save review");
      }
    },
    async submitHr() {
      await persistHrProfile();
    },
    uploadProfileImage,
    requestSubmitHr() {
      if (!profile) return;
      if (profile.hr.status === "active" && hrDraft.status === "inactive") {
        setHrInactiveConfirmOpen(true);
        return;
      }
      void persistHrProfile();
    },
    confirmHrInactive() {
      setHrInactiveConfirmOpen(false);
      void persistHrProfile();
    },
  };
}
