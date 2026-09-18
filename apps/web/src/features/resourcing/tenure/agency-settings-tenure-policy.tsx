import { ChevronRight } from "lucide-react";
import { useId } from "react";

import { AgencyDateField } from "@/features/shared/date/agency-date-field";
import { FISCAL_MONTHS, type FiscalMonth } from "@/features/resourcing/tenure-utils";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

const WEEK_START_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export type TenurePolicyDraft = {
  fiscalYearStartMonth: FiscalMonth;
  fiscalYearStartDay: string;
  quarterlyMinHours: string;
  monthlyMinHours: string;
  penaltyMonths: string;
  internDurationMonths: string;
  internDurationWeeks: string;
  requiredDailyHours: string;
  offDayReduceHours: string;
  weekStartsOn: string;
  weekendDurationDays: string;
  policyEffectiveFrom: string;
  enabled: boolean;
};

type AgencySettingsTenurePolicyProps = {
  policyDraft: TenurePolicyDraft;
  onPolicyDraftChange: (draft: TenurePolicyDraft) => void;
  isOwner: boolean;
  fiscalYearPreview: string;
  saving: boolean;
  onSave: () => void;
  /** Omit outer panel chrome when nested in a sheet or parent card. */
  embedded?: boolean;
};

function weekStartLabel(value: string): string {
  const day = Number.parseInt(value, 10);
  return WEEK_START_OPTIONS.find((option) => option.value === day)?.label ?? "—";
}

/** Split decimal hours into whole hours + minutes for the off-day reduce control. */
function splitOffDayReduceHours(totalHours: string): { hours: string; minutes: string } {
  const value = Number.parseFloat(totalHours);
  if (!Number.isFinite(value) || value < 0) return { hours: "0", minutes: "0" };
  const totalMinutes = Math.round(value * 60);
  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
  };
}

function combineOffDayReduceHours(hours: string, minutes: string): string {
  const h = Number.parseInt(hours, 10);
  const m = Number.parseInt(minutes, 10);
  const safeH = Number.isFinite(h) && h >= 0 ? Math.min(h, 24) : 0;
  const safeM = Number.isFinite(m) && m >= 0 ? Math.min(m, 59) : 0;
  const total = safeH + safeM / 60;
  return String(Math.min(total, 24));
}

export function AgencySettingsTenurePolicy({
  policyDraft,
  onPolicyDraftChange,
  isOwner,
  fiscalYearPreview,
  saving,
  onSave,
  embedded = false,
}: AgencySettingsTenurePolicyProps) {
  const idPrefix = useId();
  const monthId = `${idPrefix}-fiscal-month`;
  const startDayId = `${idPrefix}-start-day`;
  const minHoursId = `${idPrefix}-min-hours`;
  const monthlyMinHoursId = `${idPrefix}-monthly-min-hours`;
  const effectiveFromId = `${idPrefix}-effective-from`;
  const enabledId = `${idPrefix}-enabled`;
  const internMonthsId = `${idPrefix}-intern-months`;
  const internWeeksId = `${idPrefix}-intern-weeks`;
  const penaltyId = `${idPrefix}-penalty-months`;
  const dailyHoursId = `${idPrefix}-daily-hours`;
  const offDayReduceHoursId = `${idPrefix}-off-day-reduce-hours`;
  const offDayReduceMinutesId = `${idPrefix}-off-day-reduce-minutes`;
  const weekStartsId = `${idPrefix}-week-starts`;
  const weekendDaysId = `${idPrefix}-weekend-days`;
  const offDayReduceParts = splitOffDayReduceHours(policyDraft.offDayReduceHours);

  if (!isOwner) {
    const monthLabel =
      FISCAL_MONTHS.find((month) => month.value === policyDraft.fiscalYearStartMonth)?.label ?? "—";
    return (
      <section className={cn(!embedded && agencyPanelClass, !embedded && "p-5 sm:p-6")}>
        {embedded ? null : <h3 className="text-sm font-bold text-highlighted">Team policy</h3>}
        <p className={cn("text-muted text-sm", !embedded && "mt-1")}>
          Read-only team defaults. Ask an owner to change policy or departments.
        </p>
        <dl className={cn("grid gap-3 text-sm", embedded ? "mt-4" : "mt-5")}>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">Fiscal year starts</dt>
            <dd className="text-highlighted">
              {monthLabel} {policyDraft.fiscalYearStartDay}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">Min hours per quarter</dt>
            <dd className="text-highlighted font-mono tabular-nums">
              {policyDraft.quarterlyMinHours}h
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">Min hours per month</dt>
            <dd className="text-highlighted font-mono tabular-nums">
              {policyDraft.monthlyMinHours}h
            </dd>
          </div>
          <div className="border-border space-y-2 border-t pt-3">
            <dt className="text-highlighted text-xs font-semibold tracking-wide uppercase">
              Work schedule
            </dt>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Required daily hours</dt>
              <dd className="text-highlighted font-mono tabular-nums">
                {policyDraft.requiredDailyHours}h
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Hours reduced per off day</dt>
              <dd className="text-highlighted font-mono tabular-nums">
                {offDayReduceParts.hours}h {offDayReduceParts.minutes}m
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Week start</dt>
              <dd className="text-highlighted">{weekStartLabel(policyDraft.weekStartsOn)}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">Weekend duration</dt>
              <dd className="text-highlighted font-mono tabular-nums">
                {policyDraft.weekendDurationDays}{" "}
                {policyDraft.weekendDurationDays === "1" ? "day" : "days"}
              </dd>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">Tenure tracking</dt>
            <dd className="text-highlighted">{policyDraft.enabled ? "On" : "Off"}</dd>
          </div>
          <p className="text-muted text-sm">{fiscalYearPreview}</p>
        </dl>
      </section>
    );
  }

  return (
    <section className={cn(!embedded && agencyPanelClass, !embedded && "p-5 sm:p-6")}>
      {embedded ? null : <h3 className="text-sm font-bold text-highlighted">Team policy</h3>}
      <p className={cn("text-muted text-sm", !embedded && "mt-1")}>
        Each fiscal month runs from the start day through the day before the next period (UTC).
      </p>

      <form
        className={cn("space-y-5", embedded ? "mt-4" : "mt-5")}
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={agencyFormFieldClass}>
            <Label htmlFor={monthId} className={agencyFormLabelClass}>
              Fiscal year starts
            </Label>
            <Select
              value={String(policyDraft.fiscalYearStartMonth)}
              onValueChange={(value) =>
                onPolicyDraftChange({
                  ...policyDraft,
                  fiscalYearStartMonth: Number(value) as FiscalMonth,
                })
              }
            >
              <SelectTrigger id={monthId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FISCAL_MONTHS.map((month) => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={agencyFormFieldClass}>
            <Label htmlFor={startDayId} className={agencyFormLabelClass}>
              Start day
            </Label>
            <Input
              id={startDayId}
              type="number"
              min={1}
              max={31}
              value={policyDraft.fiscalYearStartDay}
              className="w-full max-w-[8rem]"
              onChange={(event) =>
                onPolicyDraftChange({ ...policyDraft, fiscalYearStartDay: event.target.value })
              }
            />
          </div>

          <div className={agencyFormFieldClass}>
            <Label htmlFor={minHoursId} className={agencyFormLabelClass}>
              Min hours per quarter
            </Label>
            <Input
              id={minHoursId}
              type="number"
              min={1}
              value={policyDraft.quarterlyMinHours}
              className="w-full max-w-[10rem]"
              onChange={(event) =>
                onPolicyDraftChange({ ...policyDraft, quarterlyMinHours: event.target.value })
              }
            />
          </div>

          <div className={agencyFormFieldClass}>
            <Label htmlFor={monthlyMinHoursId} className={agencyFormLabelClass}>
              Min hours per month
            </Label>
            <Input
              id={monthlyMinHoursId}
              type="number"
              min={1}
              value={policyDraft.monthlyMinHours}
              className="w-full max-w-[10rem]"
              onChange={(event) =>
                onPolicyDraftChange({ ...policyDraft, monthlyMinHours: event.target.value })
              }
            />
          </div>

          <div className={agencyFormFieldClass}>
            <Label htmlFor={effectiveFromId} className={agencyFormLabelClass}>
              Effective from
            </Label>
            <AgencyDateField
              id={effectiveFromId}
              value={policyDraft.policyEffectiveFrom}
              className="h-8 max-w-[14rem]"
              aria-label="Effective from"
              onChange={(value) =>
                onPolicyDraftChange({ ...policyDraft, policyEffectiveFrom: value })
              }
            />
          </div>
        </div>

        <div className="border-border space-y-4 border-t pt-4">
          <h4 className="text-highlighted text-xs font-semibold tracking-wide uppercase">
            Work schedule
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={agencyFormFieldClass}>
              <Label htmlFor={dailyHoursId} className={agencyFormLabelClass}>
                Required daily hours
              </Label>
              <Input
                id={dailyHoursId}
                type="number"
                min={1}
                max={24}
                value={policyDraft.requiredDailyHours}
                className="w-full max-w-[10rem]"
                onChange={(event) =>
                  onPolicyDraftChange({ ...policyDraft, requiredDailyHours: event.target.value })
                }
              />
            </div>

            <div className={agencyFormFieldClass}>
              <Label htmlFor={offDayReduceHoursId} className={agencyFormLabelClass}>
                Hours reduced per off day
              </Label>
              <div className="flex max-w-[14rem] items-center gap-2">
                <Input
                  id={offDayReduceHoursId}
                  type="number"
                  min={0}
                  max={24}
                  step={1}
                  value={offDayReduceParts.hours}
                  className="w-full min-w-0"
                  aria-label="Hours reduced per off day"
                  onChange={(event) =>
                    onPolicyDraftChange({
                      ...policyDraft,
                      offDayReduceHours: combineOffDayReduceHours(
                        event.target.value,
                        offDayReduceParts.minutes,
                      ),
                    })
                  }
                />
                <span className="text-muted shrink-0 text-xs">h</span>
                <Input
                  id={offDayReduceMinutesId}
                  type="number"
                  min={0}
                  max={59}
                  step={1}
                  value={offDayReduceParts.minutes}
                  className="w-full min-w-0"
                  aria-label="Minutes reduced per off day"
                  onChange={(event) =>
                    onPolicyDraftChange({
                      ...policyDraft,
                      offDayReduceHours: combineOffDayReduceHours(
                        offDayReduceParts.hours,
                        event.target.value,
                      ),
                    })
                  }
                />
                <span className="text-muted shrink-0 text-xs">m</span>
              </div>
              <p className="text-muted mt-1 text-xs">
                Lowers month and quarter minimum and target for each weekday off day or holiday.
              </p>
            </div>

            <div className={agencyFormFieldClass}>
              <Label htmlFor={weekStartsId} className={agencyFormLabelClass}>
                Week start
              </Label>
              <Select
                value={policyDraft.weekStartsOn}
                onValueChange={(value) =>
                  onPolicyDraftChange({ ...policyDraft, weekStartsOn: value })
                }
              >
                <SelectTrigger id={weekStartsId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_START_OPTIONS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={agencyFormFieldClass}>
              <Label htmlFor={weekendDaysId} className={agencyFormLabelClass}>
                Weekend duration
              </Label>
              <Select
                value={policyDraft.weekendDurationDays}
                onValueChange={(value) =>
                  onPolicyDraftChange({ ...policyDraft, weekendDurationDays: value })
                }
              >
                <SelectTrigger id={weekendDaysId} className="w-full max-w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <p className="text-muted text-sm">{fiscalYearPreview}</p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={enabledId}
              checked={policyDraft.enabled}
              onCheckedChange={(checked) =>
                onPolicyDraftChange({ ...policyDraft, enabled: checked === true })
              }
            />
            <Label htmlFor={enabledId} className="cursor-pointer text-sm font-semibold text-muted">
              Enable tenure tracking
            </Label>
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save policy"}
          </Button>
        </div>

        <Collapsible className="border-t border-default pt-4">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="group -ml-2 gap-1.5 text-muted hover:text-highlighted"
            >
              <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-90 motion-reduce:transition-none" />
              Advanced
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={agencyFormFieldClass}>
                <Label htmlFor={internMonthsId} className={agencyFormLabelClass}>
                  Intern duration (months)
                </Label>
                <Input
                  id={internMonthsId}
                  type="number"
                  min={0}
                  value={policyDraft.internDurationMonths}
                  className="w-full max-w-[10rem]"
                  onChange={(event) =>
                    onPolicyDraftChange({
                      ...policyDraft,
                      internDurationMonths: event.target.value,
                    })
                  }
                />
              </div>

              <div className={agencyFormFieldClass}>
                <Label htmlFor={internWeeksId} className={agencyFormLabelClass}>
                  Extra intern weeks
                </Label>
                <Input
                  id={internWeeksId}
                  type="number"
                  min={0}
                  value={policyDraft.internDurationWeeks}
                  className="w-full max-w-[10rem]"
                  onChange={(event) =>
                    onPolicyDraftChange({
                      ...policyDraft,
                      internDurationWeeks: event.target.value,
                    })
                  }
                />
              </div>

              <div className={cn(agencyFormFieldClass, "sm:col-span-2")}>
                <Label htmlFor={penaltyId} className={agencyFormLabelClass}>
                  Penalty per missed quarter (months)
                </Label>
                <Input
                  id={penaltyId}
                  type="number"
                  min={1}
                  value={policyDraft.penaltyMonths}
                  className="w-full max-w-[10rem]"
                  onChange={(event) =>
                    onPolicyDraftChange({ ...policyDraft, penaltyMonths: event.target.value })
                  }
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </form>
    </section>
  );
}
