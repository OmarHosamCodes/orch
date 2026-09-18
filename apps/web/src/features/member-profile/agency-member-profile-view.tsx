import { CalendarOff, Camera, Loader2, Pencil } from "lucide-react";

import {
  AgencyCommandBar,
  agencyCommandBarCustomRangeTriggerClass,
} from "@/features/shared/command-bar/agency-command-bar";
import { RangePresetChooser } from "@/features/shared/command-bar/range-preset-chooser";
import { MemberProfileActivityRails } from "@/features/member-profile/member-profile-activity-rails";
import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import {
  MemberProfileLeaveRangePicker,
  MemberProfileOffDayRangePanel,
} from "@/features/shared/date/member-profile-leave-range-picker";
import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import { MemberProfileCalendarPanel } from "@/features/member-profile/member-profile-calendar-panel";
import { MemberProfileAlertsPanel } from "@/features/member-profile/member-profile-alerts-view";
import { MemberProfileGaugeDetailDialog } from "@/features/member-profile/member-profile-gauge-detail-dialog";
import { memberProfileGaugeLayoutId } from "@/features/member-profile/member-profile-gauge-morph";
import {
  gaugeToneToPlateTone,
  InstrumentPlate,
  statPlateShortLabel,
  StatPlateGlyph,
} from "@/features/member-profile/member-profile-instrument-plate";
import { MemberProfileRosterSwitcher } from "@/features/member-profile/member-profile-roster-switcher";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SurfaceShimmer } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

function safeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

type Props = {
  viewModel: AgencyMemberProfileViewModel;
};

type ProfileData = NonNullable<AgencyMemberProfileViewModel["profile"]>;
type LeaveGauge = ProfileData["leaveGauges"][number];

function IdentityMetaChip({ children }: { children: string }) {
  return <span className="text-xs text-muted">{children}</span>;
}

function ProfileIdentityStrip({
  profile,
  subjectUserId,
  profileImagePending,
  onUploadImage,
  onEditHr,
  onAddOffDay,
}: {
  profile: ProfileData;
  subjectUserId: string;
  profileImagePending: boolean;
  onUploadImage: (file: File) => void;
  onEditHr: () => void;
  onAddOffDay: () => void;
}) {
  const chips = [
    profile.hr.departmentName,
    profile.hr.employmentTypeLabel,
    profile.hr.workModelLabel,
    profile.joinedAtLabel ? `Joined ${profile.joinedAtLabel}` : null,
  ].filter((value): value is string => Boolean(value && value.trim() && value.trim() !== "—"));

  const socials = [
    { href: safeHttpUrl(profile.hr.linkedinUrl), label: "LinkedIn" },
    { href: safeHttpUrl(profile.hr.xUrl), label: "X" },
    { href: safeHttpUrl(profile.hr.instagramUrl), label: "Instagram" },
  ].filter((item): item is { href: string; label: string } => Boolean(item.href));

  return (
    <section
      className="flex min-w-0 shrink-0 items-start justify-between gap-3"
      aria-labelledby="member-profile-name"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <AgencyMemberAvatar
            name={profile.userName}
            userId={subjectUserId}
            avatarUrl={profile.userAvatarUrl}
            size="md"
            className="size-12 shrink-0 rounded-xl"
            alt={profile.userName}
          />
          {profile.isSelf ? (
            <label
              className="absolute -right-1.5 -bottom-1.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
              aria-label="Change profile image"
            >
              {profileImagePending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-3.5" aria-hidden />
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={profileImagePending}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void onUploadImage(file);
                }}
              />
            </label>
          ) : null}
        </div>
        <div className="min-w-0">
          <h1
            id="member-profile-name"
            className={cn(agencyWorkTitleClass, "text-base text-balance")}
          >
            {profile.userName}
          </h1>
          {chips.length > 0 ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {chips.map((chip, index) => (
                <span key={chip} className="inline-flex items-center gap-2">
                  {index > 0 ? (
                    <span className="text-muted" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <IdentityMetaChip>{chip}</IdentityMetaChip>
                </span>
              ))}
            </p>
          ) : null}
          {socials.length > 0 ? (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {socials.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted underline-offset-2 hover:underline"
                >
                  {item.label}
                </a>
              ))}
            </p>
          ) : null}
        </div>
      </div>
      {(profile.canEditHr || profile.canManageLeave) && (
        <div className="flex shrink-0 items-center">
          {profile.canEditHr ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={agencyFocusRingClass}
                  onClick={onEditHr}
                  aria-label="Edit contact details"
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit contact details</TooltipContent>
            </Tooltip>
          ) : null}
          {profile.canManageLeave ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={agencyFocusRingClass}
                  onClick={onAddOffDay}
                  aria-label="Add off day"
                >
                  <CalendarOff className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Add off day</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      )}
    </section>
  );
}

function plateMobileOrderClass(key: LeaveGauge["key"]): string {
  switch (key) {
    case "leaves":
      return "max-xl:order-1";
    case "period":
      return "max-xl:order-2";
    case "present":
      return "max-xl:order-4";
    case "waste":
      return "max-xl:order-5";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function ProfileStatPlate({
  gauge,
  isOpen,
  onOpen,
}: {
  gauge: LeaveGauge;
  isOpen: boolean;
  onOpen: () => void;
}) {
  const plateTone = gaugeToneToPlateTone(gauge.tone);
  const ariaLabel =
    gauge.key === "present"
      ? `Attendance streak: ${gauge.valueLabel} days. Best this month: ${gauge.bestInMonth ?? 0}. ${gauge.secondary}. Open details.`
      : `${gauge.label}: ${gauge.valueLabel}. ${gauge.secondary}. Open details.`;
  return (
    <InstrumentPlate
      tone={plateTone}
      metric={gauge.valueLabel}
      shortLabel={statPlateShortLabel(gauge.key)}
      ariaLabel={ariaLabel}
      glyph={
        <StatPlateGlyph
          plateKey={gauge.key}
          ratio={gauge.ratio}
          segments={gauge.key === "present" ? gauge.streakSegments : undefined}
          className="h-full w-full"
        />
      }
      onClick={onOpen}
      layoutId={isOpen ? undefined : memberProfileGaugeLayoutId(gauge.key)}
      className={cn("h-full", plateMobileOrderClass(gauge.key))}
    />
  );
}

export function AgencyMemberProfileView({ viewModel }: Props) {
  const { profile, period } = viewModel;

  if (!viewModel.teamId) {
    return <div className={agencyEmptyPanelClass}>Select a team to open a member profile.</div>;
  }

  if (viewModel.loading && !profile) {
    return <SurfaceShimmer className="min-h-0 flex-1" label="Loading member profile" />;
  }

  if (viewModel.error && !profile) {
    return (
      <div className={cn(agencyErrorPanelClass, "flex flex-wrap items-center gap-3")}>
        <span>{viewModel.error}</span>
        <Button type="button" variant="outline" size="sm" onClick={viewModel.retry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!profile) {
    return <div className={agencyEmptyPanelClass}>No profile data for this member yet.</div>;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="shimmer-container flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto xl:overflow-hidden">
        <AgencyCommandBar.Root
          className="w-full shrink-0"
          busy={viewModel.refreshing}
          busyLabel="Refreshing profile"
        >
          <AgencyCommandBar.Start>
            <RangePresetChooser
              value={period.rangePreset}
              onChange={period.onRangePresetChange}
              tenureAvailable={period.tenureAvailable}
              tenurePeriodLabel={period.tenurePeriodLabel}
              tenureQuarterLabel={period.tenureQuarterLabel}
              tenureQuarterMonths={period.tenureQuarterMonths}
              tenureMonthIndexes={period.tenureMonthIndexes}
              onTenureMonthIndexesChange={period.onTenureMonthIndexesChange}
            />
            {period.rangePreset === "custom" ? (
              <MemberProfileLeaveRangePicker
                triggerId="profile-period-custom-range"
                startDate={period.customFromDate}
                endDate={period.customToDate}
                emptyLabel="Select period dates"
                ariaLabel="Custom period date range"
                triggerClassName={agencyCommandBarCustomRangeTriggerClass}
                onRangeChange={(next) => {
                  period.onCustomFromChange(next.startDate);
                  period.onCustomToChange(next.endDate);
                }}
              />
            ) : null}
          </AgencyCommandBar.Start>
          <AgencyCommandBar.End>
            <AgencyCommandBar.Apply disabled={!period.hasPendingChanges} onClick={period.onApply} />
            {period.canReset ? <AgencyCommandBar.Reset onClick={period.onReset} /> : null}
            <MemberProfileRosterSwitcher memberNav={viewModel.memberNav} />
          </AgencyCommandBar.End>
        </AgencyCommandBar.Root>

        <ProfileIdentityStrip
          profile={profile}
          subjectUserId={viewModel.subjectUserId}
          profileImagePending={viewModel.profileImagePending}
          onUploadImage={viewModel.uploadProfileImage}
          onEditHr={() => viewModel.setHrDialogOpen(true)}
          onAddOffDay={() => viewModel.openAddOffDayDialog()}
        />

        <div
          className="grid shrink-0 grid-cols-2 items-stretch gap-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(20rem,24rem)] xl:gap-6"
          aria-label="Period health"
        >
          {profile.leaveGauges.map((gauge) => (
            <ProfileStatPlate
              key={gauge.key}
              gauge={gauge}
              isOpen={viewModel.openGaugeKey === gauge.key}
              onOpen={() => viewModel.openGauge(gauge.key)}
            />
          ))}
          <div className="col-span-2 min-h-0 max-xl:order-3 xl:col-span-1">
            <MemberProfileAlertsPanel alerts={viewModel.alerts} />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 max-xl:shrink-0 xl:flex-row">
          <aside className="flex w-full shrink-0 flex-col max-xl:min-h-0 xl:order-2 xl:h-full xl:w-[20rem]">
            <MemberProfileCalendarPanel
              calendar={profile.calendar}
              canManageLeave={profile.canManageLeave}
              onFocusDay={viewModel.focusDay}
              onOpenOffDayRangeSelect={viewModel.openOffDayRangeSelect}
              onOpenAddOffDay={viewModel.openAddOffDay}
              onOpenRemoveLeave={viewModel.openRemoveLeave}
            />
          </aside>
          {profile.timeline.length === 0 ? (
            <section
              className={cn(
                agencyPanelClass,
                "flex min-h-0 min-w-0 flex-1 flex-col p-4 xl:order-1",
              )}
              aria-labelledby="member-profile-activity"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 id="member-profile-activity" className={agencyWorkTitleClass}>
                  Activity & reviews
                </h2>
                {profile.canAddReview ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={agencyFocusRingClass}
                    onClick={() => viewModel.setReviewDialogOpen(true)}
                  >
                    Add review
                  </Button>
                ) : null}
              </div>
              <div className={cn(agencyEmptyPanelClass, "mt-4 flex-1")}>
                {profile.isSelf
                  ? "No activity in this period yet. Log time in Tracker to populate this timeline."
                  : "No activity recorded for this member in this period."}
              </div>
            </section>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:order-1">
              <MemberProfileActivityRails
                teamId={viewModel.teamId}
                days={profile.timeline}
                totalEventsLabel={`${profile.timeline.reduce((sum, day) => sum + day.items.length, 0)} events`}
                highlightDate={viewModel.highlightedActivityDate}
                canAddReview={profile.canAddReview}
                onAddReview={() => viewModel.setReviewDialogOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      <MemberProfileGaugeDetailDialog
        detail={viewModel.gaugeDetail}
        onClose={viewModel.closeGauge}
        onPrimaryAction={viewModel.runGaugePrimaryAction}
        onFocusDay={viewModel.focusGaugeDay}
      />

      <Dialog
        open={viewModel.offDayRangeSelect !== null}
        onOpenChange={(open) => {
          if (!open) viewModel.closeOffDayRangeSelect();
        }}
      >
        <DialogContent className="w-auto gap-0 overflow-hidden p-0 sm:max-w-fit">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle>Select off days</DialogTitle>
            <DialogDescription>
              Choose one day or a range. The start day is fixed from your calendar click.
            </DialogDescription>
          </DialogHeader>
          {viewModel.offDayRangeSelect ? (
            <MemberProfileOffDayRangePanel
              key={`${viewModel.offDayRangeSelect.startDate}:${viewModel.offDayRangeSelect.endDate}`}
              startDate={viewModel.offDayRangeSelect.startDate}
              endDate={viewModel.offDayRangeSelect.endDate}
              lockStart
              onCancel={() => viewModel.closeOffDayRangeSelect()}
              onConfirm={(next) => viewModel.confirmOffDayRangeSelect(next)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={viewModel.leaveDialogOpen} onOpenChange={viewModel.setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add off day</DialogTitle>
            <DialogDescription>
              Choose one day or a range. Team holiday applies to everyone on the team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label htmlFor="leave-range" className={agencyFormLabelClass}>
                Dates
              </Label>
              <MemberProfileLeaveRangePicker
                startDate={viewModel.leaveDraft.startDate}
                endDate={viewModel.leaveDraft.endDate}
                onRangeChange={(next) => viewModel.setLeaveDraft(next)}
              />
            </div>
            {profile.canAddReview ? (
              <div className={agencyFormFieldClass}>
                <Label htmlFor="leave-type" className={agencyFormLabelClass}>
                  Type
                </Label>
                <Select
                  value={viewModel.leaveDraft.type}
                  onValueChange={(value) =>
                    viewModel.setLeaveDraft({
                      type: value as typeof viewModel.leaveDraft.type,
                      teamWide: value === "team_holiday",
                    })
                  }
                >
                  <SelectTrigger id="leave-type" className="w-full">
                    <SelectValue placeholder="Off day type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pto">PTO</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="team_holiday">Team holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className={agencyFormFieldClass}>
                <Label htmlFor="leave-type" className={agencyFormLabelClass}>
                  Type
                </Label>
                <Select
                  value={viewModel.leaveDraft.type}
                  onValueChange={(value) =>
                    viewModel.setLeaveDraft({
                      type: value as typeof viewModel.leaveDraft.type,
                    })
                  }
                >
                  <SelectTrigger id="leave-type" className="w-full">
                    <SelectValue placeholder="Off day type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pto">PTO</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className={agencyFormFieldClass}>
              <Label htmlFor="leave-reason" className={agencyFormLabelClass}>
                Reason
              </Label>
              <Input
                id="leave-reason"
                value={viewModel.leaveDraft.reason}
                onChange={(e) => viewModel.setLeaveDraft({ reason: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => viewModel.setLeaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={viewModel.leavePending}
              onClick={() => void viewModel.submitLeave()}
            >
              {viewModel.leavePending ? "Saving…" : "Save off day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModel.reviewDialogOpen} onOpenChange={viewModel.setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add review</DialogTitle>
            <DialogDescription>Record a manager review for this period.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label htmlFor="review-date" className={agencyFormLabelClass}>
                Review date
              </Label>
              <AgencyDateField
                id="review-date"
                value={viewModel.reviewDraft.reviewDate}
                onChange={(value) => viewModel.setReviewDraft({ reviewDate: value })}
                aria-label="Review date"
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="review-body" className={agencyFormLabelClass}>
                Review
              </Label>
              <Textarea
                id="review-body"
                rows={4}
                value={viewModel.reviewDraft.body}
                onChange={(event) => viewModel.setReviewDraft({ body: event.target.value })}
                placeholder="What went well, what to improve, and next steps."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => viewModel.setReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={viewModel.reviewPending || !viewModel.reviewDraft.body.trim()}
              onClick={() => void viewModel.submitReview()}
            >
              {viewModel.reviewPending ? "Saving…" : "Save review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewModel.leaveRemoveTarget !== null}
        onOpenChange={(open) => {
          if (!open) viewModel.closeRemoveLeave();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove off day</DialogTitle>
            <DialogDescription>
              {viewModel.leaveRemoveTarget ? (
                <>
                  Remove {viewModel.leaveRemoveTarget.typeLabel} for{" "}
                  {viewModel.leaveRemoveTarget.rangeLabel}? Multi-day entries are removed as a
                  whole.
                </>
              ) : (
                "Remove this off day?"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => viewModel.closeRemoveLeave()}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={viewModel.leavePending}
              onClick={() => void viewModel.confirmRemoveLeave()}
            >
              {viewModel.leavePending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModel.hrDialogOpen} onOpenChange={viewModel.setHrDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact & employment</DialogTitle>
            <DialogDescription>
              Light edits for day-to-day contact. Configure rates, tenure, and schedule in{" "}
              <a
                href="/agency/management/people"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                People
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Status</Label>
              <Select
                value={viewModel.hrDraft.status}
                onValueChange={(value) =>
                  viewModel.setHrDraft({ status: value as "active" | "inactive" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Department</Label>
              <Select
                value={viewModel.hrDraft.departmentId || "none"}
                onValueChange={(value) =>
                  viewModel.setHrDraft({ departmentId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profile.departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Employment type</Label>
                <Select
                  value={viewModel.hrDraft.employmentType || "none"}
                  onValueChange={(value) =>
                    viewModel.setHrDraft({
                      employmentType:
                        value === "none"
                          ? ""
                          : (value as NonNullable<typeof viewModel.hrDraft.employmentType>),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Work model</Label>
                <Select
                  value={viewModel.hrDraft.workModel || "none"}
                  onValueChange={(value) =>
                    viewModel.setHrDraft({
                      workModel:
                        value === "none"
                          ? ""
                          : (value as NonNullable<typeof viewModel.hrDraft.workModel>),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Gender</Label>
                <Select
                  value={viewModel.hrDraft.gender || "none"}
                  onValueChange={(value) =>
                    viewModel.setHrDraft({ gender: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Date of birth</Label>
                <AgencyDateField
                  id="hr-dob"
                  value={viewModel.hrDraft.dateOfBirth}
                  onChange={(value) => viewModel.setHrDraft({ dateOfBirth: value })}
                  aria-label="Date of birth"
                />
              </div>
            </div>
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Phone</Label>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 555 000 0000"
                value={viewModel.hrDraft.phone}
                onChange={(e) => viewModel.setHrDraft({ phone: e.target.value })}
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Address</Label>
              <Textarea
                rows={2}
                value={viewModel.hrDraft.address}
                onChange={(e) => viewModel.setHrDraft({ address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => viewModel.setHrDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={viewModel.hrPending}
              onClick={() => viewModel.requestSubmitHr()}
            >
              {viewModel.hrPending ? "Saving…" : "Save profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewModel.hrInactiveConfirmOpen}
        onOpenChange={viewModel.setHrInactiveConfirmOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark member inactive?</DialogTitle>
            <DialogDescription>
              Inactive members stay on the roster but are treated as not currently working. You can
              switch back to active later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => viewModel.setHrInactiveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={viewModel.hrPending}
              onClick={() => viewModel.confirmHrInactive()}
            >
              {viewModel.hrPending ? "Saving…" : "Mark inactive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
