import { CalendarRange } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import {
  formatAgencyDisplayDay,
  formatAgencyDateKey,
  parseAgencyDateKey,
} from "@/features/shared/date/agency-date-field";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

/** Matches `--motion-ease-out` (ease-out-quart). */
const EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];


function rangeLabel(startDate: string, endDate: string, emptyLabel: string): string {
  if (!startDate || !endDate) return emptyLabel;
  if (startDate === endDate) return formatAgencyDisplayDay(startDate);
  return `${formatAgencyDisplayDay(startDate)} → ${formatAgencyDisplayDay(endDate)}`;
}

type RangeValue = { startDate: string; endDate: string };

type MemberProfileOffDayRangePanelProps = {
  startDate: string;
  endDate: string;
  onConfirm: (next: RangeValue) => void;
  onCancel: () => void;
  /** Keep the start day fixed (calendar Select flow). */
  lockStart?: boolean;
  emptyLabel?: string;
};

/** Shared range calendar used by the off-day dialog picker and calendar Select flow. */
export function MemberProfileOffDayRangePanel({
  startDate,
  endDate,
  onConfirm,
  onCancel,
  lockStart = false,
  emptyLabel = "Choose one day or a range",
}: MemberProfileOffDayRangePanelProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [monthCount, setMonthCount] = useState(1);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setMonthCount(media.matches ? 2 : 1);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const from = parseAgencyDateKey(draftStart);
  const to = parseAgencyDateKey(draftEnd);
  const selected: DateRange | undefined = from ? { from, to: to ?? from } : undefined;
  const canConfirm = Boolean(draftStart && draftEnd && draftEnd >= draftStart);
  const draftLabel = rangeLabel(draftStart, draftEnd, emptyLabel);

  return (
    <div className="min-h-0 max-h-[min(85vh,34rem)] overflow-y-auto">
      <Calendar
        mode="range"
        numberOfMonths={monthCount}
        captionLayout="dropdown"
        selected={selected}
        defaultMonth={from ?? new Date()}
        disabled={lockStart && from ? { before: from } : undefined}
        onSelect={(range: DateRange | undefined) => {
          if (!range?.from) return;
          if (lockStart && from) {
            const picked = range.to ?? range.from;
            const end = picked < from ? from : picked;
            setDraftEnd(formatAgencyDateKey(end));
            return;
          }
          setDraftStart(formatAgencyDateKey(range.from));
          setDraftEnd(formatAgencyDateKey(range.to ?? range.from));
        }}
        autoFocus
      />
      <div className="flex flex-col items-stretch gap-3 border-t border-border px-3 py-3 md:flex-row md:items-center">
        <div className="relative min-h-4 min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={draftLabel}
              initial={prefersReducedMotion ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="text-xs leading-relaxed text-muted-foreground"
            >
              {draftLabel}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : { scale: canConfirm ? 1 : 0.98, opacity: canConfirm ? 1 : 0.55 }
            }
            transition={{ duration: 0.16, ease: EASE }}
          >
            <Button
              type="button"
              size="sm"
              disabled={!canConfirm}
              onClick={() => {
                if (!canConfirm) return;
                onConfirm({ startDate: draftStart, endDate: draftEnd });
              }}
            >
              Confirm
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

type MemberProfileLeaveRangePickerProps = {
  startDate: string;
  endDate: string;
  onRangeChange: (next: RangeValue) => void;
  emptyLabel?: string;
  ariaLabel?: string;
  triggerId?: string;
  triggerClassName?: string;
};

export function MemberProfileLeaveRangePicker({
  startDate,
  endDate,
  onRangeChange,
  emptyLabel = "Select off day dates",
  ariaLabel = "Off day date range",
  triggerId = "leave-range",
  triggerClassName,
}: MemberProfileLeaveRangePickerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const committedLabel = rangeLabel(startDate, endDate, emptyLabel);

  function openPicker(nextOpen: boolean) {
    if (nextOpen) {
      setJustConfirmed(false);
      setOpen(true);
      return;
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={openPicker}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={triggerId}
          className={cn(
            "h-auto min-h-10 w-full justify-start gap-2 overflow-hidden px-3 py-2 text-left font-normal",
            "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out",
            "hover:border-border hover:bg-muted/80",
            "active:scale-[0.98]",
            "data-[state=open]:border-primary/40 data-[state=open]:bg-muted data-[state=open]:shadow-sm",
            justConfirmed && "border-primary/35 ring-1 ring-primary/20",
            "motion-reduce:transition-none motion-reduce:active:scale-100",
            agencyFocusRingClass,
            triggerClassName,
          )}
          aria-label={ariaLabel}
          aria-expanded={open}
        >
          <motion.span
            className="inline-flex shrink-0"
            animate={
              prefersReducedMotion
                ? undefined
                : { rotate: open ? 10 : 0, scale: open || justConfirmed ? 1.12 : 1 }
            }
            transition={{ duration: 0.2, ease: EASE }}
          >
            <CalendarRange
              className={cn(
                "size-4 text-muted-foreground transition-colors duration-200 ease-out motion-reduce:transition-none",
                (open || justConfirmed) && "text-primary",
              )}
              aria-hidden
            />
          </motion.span>
          <span className="relative min-h-5 min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={committedLabel}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="block truncate text-sm text-foreground"
              >
                {committedLabel}
              </motion.span>
            </AnimatePresence>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto overflow-hidden p-0" sideOffset={8}>
        {open ? (
          <MemberProfileOffDayRangePanel
            key={`${startDate}:${endDate}`}
            startDate={startDate}
            endDate={endDate}
            emptyLabel={emptyLabel}
            onCancel={() => openPicker(false)}
            onConfirm={(next) => {
              onRangeChange(next);
              setJustConfirmed(true);
              setOpen(false);
              window.setTimeout(() => setJustConfirmed(false), prefersReducedMotion ? 0 : 420);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
