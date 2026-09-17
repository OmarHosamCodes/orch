import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Button } from "@/ui/button";
import {
  agencyFocusRingClass,
  agencyPanelClass,
  agencyWorkMetaClass,
} from "@/features/shared/agency-ui";

type CalendarDayStatus = "present" | "leave" | "holiday" | "weekend" | "empty";

type CalendarDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  status: CalendarDayStatus;
  leaveId: string | null;
};

type CalendarLegendItem = {
  status: CalendarDayStatus;
  label: string;
  count: number;
};

export type MemberProfileCalendarPanelProps = {
  calendar: {
    label: string;
    weekdayLabels: string[];
    days: CalendarDay[];
    legend: CalendarLegendItem[];
    todayDate: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    canGoPrevMonth: boolean;
    canGoNextMonth: boolean;
  };
  canManageLeave: boolean;
  onFocusDay: (date: string) => void;
  onOpenOffDayRangeSelect: (date: string) => void;
  onOpenAddOffDay: (date: string) => void;
  onOpenRemoveLeave: (leaveId: string, date: string) => void;
};

function calendarDayStatusClass(status: CalendarDayStatus, inMonth: boolean): string {
  if (!inMonth) return "text-foreground/30";
  switch (status) {
    case "present":
      return "bg-muted/40 text-foreground";
    case "leave":
      return "bg-muted/40 text-foreground";
    case "holiday":
      return "border border-border bg-muted/30 text-foreground";
    case "weekend":
      return cn(
        "bg-muted/25 text-muted-foreground",
        "[background-image:repeating-linear-gradient(-45deg,transparent_0_2.5px,var(--border)_2.5px_3.5px)]",
      );
    case "empty":
      return "text-foreground hover:bg-muted/80";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function calendarDayStatusSuffix(status: CalendarDayStatus): string {
  switch (status) {
    case "leave":
      return ", off day";
    case "holiday":
      return ", team holiday";
    case "present":
      return ", logged";
    case "weekend":
      return ", weekend";
    case "empty":
      return "";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function calendarLegendSwatchClass(status: CalendarDayStatus): string {
  switch (status) {
    case "present":
      return "size-2.5 shrink-0 rounded-full bg-success";
    case "leave":
      return "size-2.5 shrink-0 rounded-full bg-warning";
    case "holiday":
      return "size-2.5 shrink-0 rounded-full bg-chart-1";
    case "weekend":
      return "size-2.5 shrink-0 rounded-md bg-muted ring-1 ring-border";
    case "empty":
      return "size-2.5 shrink-0 rounded-md bg-transparent ring-1 ring-border";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function calendarLegendAriaLabel(status: CalendarDayStatus, count: number, label: string): string {
  const unit = count === 1 ? "day" : "days";
  switch (status) {
    case "present":
      return `${count} ${unit} logged`;
    case "leave":
      return `${count} off ${unit}`;
    case "holiday":
      return `${count} team holiday ${unit}`;
    case "weekend":
      return `${count} weekend ${unit}`;
    case "empty":
      return `${count} ${unit} with no hours logged`;
    default: {
      const _exhaustive: never = status;
      void _exhaustive;
      return `${count} ${label}`;
    }
  }
}

function MemberProfileCalendarDayCell({
  day,
  isToday,
  canManageLeave,
  onFocusDay,
  onOpenOffDayRangeSelect,
  onOpenAddOffDay,
  onOpenRemoveLeave,
}: {
  day: CalendarDay;
  isToday: boolean;
  canManageLeave: boolean;
  onFocusDay: (date: string) => void;
  onOpenOffDayRangeSelect: (date: string) => void;
  onOpenAddOffDay: (date: string) => void;
  onOpenRemoveLeave: (leaveId: string, date: string) => void;
}) {
  const statusClass = calendarDayStatusClass(day.status, day.inMonth);
  const statusSuffix = calendarDayStatusSuffix(day.status);

  const dayButton = (
    <button
      type="button"
      disabled={!day.inMonth}
      className={cn(
        "member-profile-cal-day grid place-items-center rounded-md text-xs tabular-nums",
        "aspect-square w-full min-h-0",
        agencyFocusRingClass,
        statusClass,
        day.inMonth && `member-profile-cal-day--${day.status}`,
        isToday && "member-profile-cal-day--today",
        day.inMonth && day.status === "holiday" && "member-profile-cal-day--holiday",
        day.inMonth && day.status === "weekend" && "member-profile-cal-day--weekend",
      )}
      onClick={day.inMonth && !canManageLeave ? () => onFocusDay(day.date) : undefined}
      aria-label={isToday ? `${day.date}, today${statusSuffix}` : `${day.date}${statusSuffix}`}
    >
      <span className="leading-none">{day.dayOfMonth}</span>
      {day.inMonth && day.status === "holiday" ? (
        <span
          className="member-profile-cal-party pointer-events-none absolute end-0 top-0.5 text-[0.5rem] leading-none opacity-90"
          aria-hidden
        >
          🎉
        </span>
      ) : null}
    </button>
  );

  if (!day.inMonth || !canManageLeave) {
    return dayButton;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{dayButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onSelect={() => onOpenOffDayRangeSelect(day.date)}>
          Select
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenAddOffDay(day.date)}>Add off day</DropdownMenuItem>
        {(day.status === "leave" || day.status === "holiday") && day.leaveId ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                const leaveId = day.leaveId;
                if (!leaveId) return;
                onOpenRemoveLeave(leaveId, day.date);
              }}
            >
              Remove off day
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MemberProfileCalendarFooter({
  calendarLabel,
  legend,
}: {
  calendarLabel: string;
  legend: CalendarLegendItem[];
}) {
  const legendItems = legend.filter((item) => item.count > 0);
  if (legendItems.length === 0) return null;

  return (
    <div
      className="member-profile-calendar-footer mt-auto border-t border-border pt-2.5"
      aria-label={`${calendarLabel} summary`}
    >
      <div className={cn(agencyWorkMetaClass, "flex flex-wrap gap-x-2.5 gap-y-1")} role="list">
        {legendItems.map((item) => (
          <span
            key={item.status}
            role="listitem"
            className="inline-flex items-center gap-1.5"
            aria-label={calendarLegendAriaLabel(item.status, item.count, item.label)}
          >
            <span className={calendarLegendSwatchClass(item.status)} aria-hidden />
            <span>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MemberProfileCalendarPanel({
  calendar,
  canManageLeave,
  onFocusDay,
  onOpenOffDayRangeSelect,
  onOpenAddOffDay,
  onOpenRemoveLeave,
}: MemberProfileCalendarPanelProps) {
  return (
    <section className={cn(agencyPanelClass, "flex h-full min-h-0 flex-col p-4")}>
      <div className="mb-2 flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0", agencyFocusRingClass)}
          onClick={calendar.onPrevMonth}
          disabled={!calendar.canGoPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <p className="min-w-0 flex-1 text-center text-xs font-medium text-foreground">
          {calendar.label}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0", agencyFocusRingClass)}
          onClick={calendar.onNextMonth}
          disabled={!calendar.canGoNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="grid shrink-0 grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
        {calendar.weekdayLabels.map((label, index) => (
          <span key={`${label}-${index}`} className="py-0.5">
            {label}
          </span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 content-start gap-0.5">
        {calendar.days.map((day) => (
          <div key={day.date} className="min-w-0">
            <MemberProfileCalendarDayCell
              day={day}
              isToday={calendar.todayDate === day.date}
              canManageLeave={canManageLeave}
              onFocusDay={onFocusDay}
              onOpenOffDayRangeSelect={onOpenOffDayRangeSelect}
              onOpenAddOffDay={onOpenAddOffDay}
              onOpenRemoveLeave={onOpenRemoveLeave}
            />
          </div>
        ))}
      </div>
      <MemberProfileCalendarFooter calendarLabel={calendar.label} legend={calendar.legend} />
    </section>
  );
}
