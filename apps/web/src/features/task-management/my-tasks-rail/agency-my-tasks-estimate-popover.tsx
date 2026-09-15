import { Clock, X } from "lucide-react";
import { useState } from "react";

import {
  agencyFocusRingClass,
  agencyMyTasksFilterPillActiveClass,
  agencyMyTasksFilterPillClass,
} from "@/features/shared/agency-ui";
import {
  AGENCY_TASK_ESTIMATE_PRESETS,
  formatEstimateMinutes,
  parseEstimateInput,
} from "@/features/task-management/agency-task-estimate";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { cn } from "@/lib/utils";

type AgencyMyTasksEstimatePopoverProps = {
  value: number | null;
  disabled?: boolean;
  onChange: (minutes: number | null) => void;
};

export function AgencyMyTasksEstimatePopover({
  value,
  disabled = false,
  onChange,
}: AgencyMyTasksEstimatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const parsedDraft = parseEstimateInput(draft);
  const hasValue = value !== null && value > 0;
  const triggerLabel = hasValue ? formatEstimateMinutes(value) : null;

  function openPopover(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(value ? formatEstimateMinutes(value) : "");
    }
    setOpen(nextOpen);
  }

  function applyMinutes(minutes: number | null) {
    onChange(minutes);
    if (minutes !== null) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={openPopover}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={triggerLabel ? `Estimate ${triggerLabel}` : "Add estimate"}
          title={triggerLabel ? `Estimate ${triggerLabel}` : "Add estimate"}
          className={cn(
            "h-8 shrink-0 gap-1 rounded-full border border-transparent px-2 text-xs font-medium",
            triggerLabel
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-muted hover:bg-muted hover:text-foreground",
            agencyFocusRingClass,
          )}
        >
          <Clock className="size-3.5 shrink-0" aria-hidden />
          {triggerLabel ? <span className="tabular-nums">{triggerLabel}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" size="form" tone="morph" className="gap-3 p-surface">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Estimate</p>
          {triggerLabel ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear estimate"
              onClick={() => applyMinutes(null)}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Estimate presets">
          {AGENCY_TASK_ESTIMATE_PRESETS.map((preset) => {
            const active = value === preset.minutes;
            return (
              <button
                key={preset.minutes}
                type="button"
                aria-pressed={active}
                className={cn(
                  agencyMyTasksFilterPillClass,
                  active && agencyMyTasksFilterPillActiveClass,
                )}
                onClick={() => applyMinutes(preset.minutes)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (parsedDraft === null) return;
              applyMinutes(parsedDraft);
            }}
            placeholder="1h 30m"
            aria-label="Custom estimate"
            className="h-8"
            autoComplete="off"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0"
            disabled={parsedDraft === null}
            aria-label="Apply custom estimate"
            onClick={() => {
              if (parsedDraft === null) return;
              applyMinutes(parsedDraft);
            }}
          >
            Set
          </Button>
        </div>

        {draft.trim() && parsedDraft === null ? (
          <p className="text-xs text-muted" role="status">
            Try 45m, 1h, or 1h 30m
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
