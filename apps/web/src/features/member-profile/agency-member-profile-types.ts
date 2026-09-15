import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";

import type { AttendanceStreakModel } from "@/features/member-profile/member-profile-attendance-streak";
import type { GaugeDetailModel } from "@/features/member-profile/member-profile-gauge-detail";
import type { MemberProfileHeatLayout } from "@/features/member-profile/member-profile-heat-layout";
import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";
import type { StreakSegmentState } from "@/features/member-profile/member-profile-attendance-streak";
import type { MemberProfileAlertsViewModel } from "@/features/member-profile/hooks/use-member-profile-alerts";
import type { MemberProfileRosterMember } from "@/features/member-profile/member-profile-roster-nav";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";

export type LeaveType = "pto" | "sick" | "team_holiday" | "other";
export type EmploymentType = "full_time" | "part_time" | "contractor" | "intern";
export type WorkModel = "onsite" | "hybrid" | "remote";

export type AgencyMemberProfileViewModel = {
  teamId: string;
  subjectUserId: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  memberNav: {
    members: MemberProfileRosterMember[];
    current: MemberProfileRosterMember | null;
    previous: MemberProfileRosterMember | null;
    next: MemberProfileRosterMember | null;
    indexLabel: string | null;
    canGoPrevious: boolean;
    canGoNext: boolean;
    loading: boolean;
    onGoPrevious: () => void;
    onGoNext: () => void;
    onSelectMember: (userId: string) => void;
  };
  period: {
    rangePreset: RangePreset;
    onRangePresetChange: (preset: RangePreset) => void;
    customFromDate: string;
    onCustomFromChange: (value: string) => void;
    customToDate: string;
    onCustomToChange: (value: string) => void;
    tenureAvailable: boolean;
    tenurePeriodLabel: string | null;
    tenureQuarterLabel: string | null;
    tenureQuarterMonths: TenureQuarterMonth[];
    tenureMonthIndexes: number[];
    onTenureMonthIndexesChange: (monthIndexes: number[]) => void;
    weekStartsOn: number;
    label: string;
    hasPendingChanges: boolean;
    onApply: () => void;
    canReset: boolean;
    onReset: () => void;
  };
  profile: {
    userName: string;
    userAvatarUrl: string | null;
    email: string;
    role: string;
    roleLabel: string;
    joinedAtLabel: string;
    isSelf: boolean;
    canAddReview: boolean;
    canManageLeave: boolean;
    canEditHr: boolean;
    periodHoursLabel: string;
    weekHoursTotalLabel: string;
    weekHoursCaption: string;
    selectedHeatDate: string | null;
    heatLayout: MemberProfileHeatLayout;
    heatMap: {
      startDate: string;
      endDate: string;
      days: Array<{
        date: string;
        totalSeconds: number;
        intensity: number;
        off: {
          leaveId: string;
          type: LeaveType;
          reason: string | null;
          rangeStart: string;
          rangeEnd: string;
        } | null;
        offBand: "single" | "start" | "middle" | "end" | null;
        hoursLabel: string;
        dayOfMonthLabel: string;
      }>;
    };
    leaveSummary: string;
    hr: {
      status: "active" | "inactive";
      statusLabel: string;
      departmentId: string | null;
      departmentName: string | null;
      employmentType: EmploymentType | null;
      employmentTypeLabel: string | null;
      workModel: WorkModel | null;
      workModelLabel: string | null;
      gender: string | null;
      dateOfBirthLabel: string | null;
      phone: string | null;
      address: string | null;
      linkedinUrl: string | null;
      xUrl: string | null;
      instagramUrl: string | null;
      offAllowanceDays: number;
      leaveAllowancePeriod: "year" | "quarter" | "month";
    };
    departments: Array<{ id: string; name: string }>;
    attendanceStreak: AttendanceStreakModel;
    leaveGauges: Array<{
      key: "leaves" | "period" | "present" | "waste";
      label: string;
      valueLabel: string;
      secondary: string;
      ratio: number;
      tone: "success" | "warning" | "foreground";
      streakSegments?: StreakSegmentState[];
      bestInMonth?: number;
      monthPresentDays?: number;
      monthWorkingDays?: number;
    }>;
    weekHours: Array<{
      date: string;
      weekdayLabel: string;
      totalSeconds: number;
      hoursLabel: string;
      heightPct: number;
    }>;
    calendar: {
      label: string;
      weekdayLabels: string[];
      days: Array<{
        date: string;
        dayOfMonth: number;
        inMonth: boolean;
        status: "present" | "leave" | "holiday" | "weekend" | "empty";
        leaveId: string | null;
      }>;
      legend: Array<{
        status: "present" | "leave" | "holiday" | "weekend" | "empty";
        label: string;
        count: number;
      }>;
      onPrevMonth: () => void;
      onNextMonth: () => void;
      canGoPrevMonth: boolean;
      canGoNextMonth: boolean;
      todayDate: string;
    };
    timeline: Array<{
      date: string;
      title: string;
      subtitle: string;
      countLabel: string;
      open: boolean;
      items: Array<
        | {
            kind: "review";
            id: string;
            body: string;
            authorName: string;
            authorAvatarUrl: string | null;
            timeLabel: string;
          }
        | {
            kind: "activity";
            id: string;
            eventType: "time_logged" | "waste_marked" | "leave";
            kindLabel: string;
            title: string;
            body: string | null;
            meta: string | null;
            timeLabel: string;
            durationLabel: string | null;
            durationSeconds: number | null;
            projectId: string | null;
            projectName: string | null;
            taskId: string | null;
            taskTitle: string | null;
            clientId: string | null;
            clientName: string | null;
            description: string | null;
            isWaste: boolean;
            taskIsWaste: boolean | null;
            startedAt: string | null;
            endedAt: string | null;
            teamId: string | null;
            userId: string | null;
            userName: string | null;
            source: "timer" | "manual" | null;
            isBillable: boolean | null;
          }
      >;
    }>;
  } | null;
  profileImagePending: boolean;
  leaveDialogOpen: boolean;
  reviewDialogOpen: boolean;
  hrDialogOpen: boolean;
  offDayRangeSelect: { startDate: string; endDate: string } | null;
  leaveRemoveTarget: {
    leaveId: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    rangeLabel: string;
    typeLabel: string;
  } | null;
  leavePending: boolean;
  reviewPending: boolean;
  hrPending: boolean;
  hrInactiveConfirmOpen: boolean;
  setHrInactiveConfirmOpen: (open: boolean) => void;
  requestSubmitHr: () => void;
  confirmHrInactive: () => void;
  leaveDraft: {
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason: string;
    teamWide: boolean;
  };
  reviewDraft: { reviewDate: string; body: string };
  hrDraft: {
    status: "active" | "inactive";
    departmentId: string;
    employmentType: EmploymentType | "";
    workModel: WorkModel | "";
    gender: string;
    dateOfBirth: string;
    phone: string;
    address: string;
  };
  alerts: MemberProfileAlertsViewModel;
  setLeaveDialogOpen: (open: boolean) => void;
  setReviewDialogOpen: (open: boolean) => void;
  setHrDialogOpen: (open: boolean) => void;
  openOffDayRangeSelect: (startDate: string) => void;
  closeOffDayRangeSelect: () => void;
  confirmOffDayRangeSelect: (next: { startDate: string; endDate: string }) => void;
  openAddOffDay: (date: string) => void;
  openAddOffDayDialog: () => void;
  openRemoveLeave: (leaveId: string, clickedDate?: string) => void;
  closeRemoveLeave: () => void;
  confirmRemoveLeave: () => Promise<void>;
  setLeaveDraft: (patch: Partial<AgencyMemberProfileViewModel["leaveDraft"]>) => void;
  setReviewDraft: (patch: Partial<AgencyMemberProfileViewModel["reviewDraft"]>) => void;
  setHrDraft: (patch: Partial<AgencyMemberProfileViewModel["hrDraft"]>) => void;
  toggleDay: (date: string) => void;
  focusDay: (date: string) => void;
  highlightedActivityDate: string | null;
  openGaugeKey: StatPlateKey | null;
  gaugeDetail: GaugeDetailModel | null;
  openGauge: (key: StatPlateKey) => void;
  closeGauge: () => void;
  runGaugePrimaryAction: () => void;
  focusGaugeDay: (date: string) => void;
  askOrchAboutMember: () => void;
  retry: () => void;
  submitLeave: () => Promise<void>;
  submitReview: () => Promise<void>;
  submitHr: () => Promise<void>;
  uploadProfileImage: (file: File) => Promise<void>;
};

export type MemberProfileViewData = NonNullable<AgencyMemberProfileViewModel["profile"]>;
