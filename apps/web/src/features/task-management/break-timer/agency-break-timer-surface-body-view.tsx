import NumberFlow from "@number-flow/react";
import { Coffee, Pause, Play, RotateCcw } from "lucide-react";
import { MotionConfig, motion } from "motion/react";

import { formatBreakCountdownDisplay } from "@/features/task-management/break-timer/break-countdown-segments";
import type { AgencyBreakTimerSurfaceViewModel } from "@/features/task-management/hooks/use-agency-break-timer-surface";
import {
  railFastTransition,
  railTapScale,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import {
  agencyMyTasksFilterPillActiveClass,
  agencyMyTasksFilterPillClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

type AgencyBreakTimerSurfaceBodyViewProps = {
  view: AgencyBreakTimerSurfaceViewModel;
};

const PRESETS = [
  { key: "10m" as const, label: "10m" },
  { key: "15m" as const, label: "15m" },
  { key: "30m" as const, label: "30m" },
  { key: "1h" as const, label: "1h" },
];

const countdownDisplayClass =
  "font-mono text-5xl font-semibold tabular-nums tracking-tight text-foreground xl:text-6xl";

export function AgencyBreakTimerSurfaceBodyView({ view }: AgencyBreakTimerSurfaceBodyViewProps) {
  if (!view.surface) return null;

  const minutes = Math.floor(view.remainingSeconds / 60);
  const seconds = view.remainingSeconds % 60;
  const canEditDuration = view.idle;
  const runningOrPaused = view.running || view.paused;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full min-h-0 flex-col px-4 py-4">
        <section
          className={cn(
            "shrink-0 space-y-3 border-b border-default pb-4 transition-opacity",
            runningOrPaused && "opacity-60",
          )}
          aria-label="Break duration"
        >
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-medium text-muted">Duration</Label>
            {runningOrPaused ? (
              <span className="text-[10px] font-medium tracking-wide text-muted uppercase">
                {view.paused ? "Paused" : "Running"}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((preset) => (
              <motion.button
                key={preset.key}
                type="button"
                disabled={!canEditDuration}
                onClick={() => view.onSelectPreset(preset.key)}
                className={cn(
                  agencyMyTasksFilterPillClass,
                  "h-8 w-full justify-center px-0",
                  view.activePreset === preset.key && agencyMyTasksFilterPillActiveClass,
                  !canEditDuration && "pointer-events-none opacity-50",
                )}
                whileTap={canEditDuration ? railTapScale : undefined}
                transition={railFastTransition}
              >
                {preset.label}
              </motion.button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Label htmlFor={`break-custom-${view.surface.id}`} className="sr-only">
                Custom duration
              </Label>
              <Input
                id={`break-custom-${view.surface.id}`}
                type="text"
                inputMode="text"
                placeholder="1h 3m or 10m"
                value={view.customDuration}
                disabled={!canEditDuration}
                aria-invalid={view.customDurationError != null}
                onChange={(event) => view.onCustomDurationChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && view.canApplyCustomDuration) {
                    event.preventDefault();
                    view.onApplyCustomDuration();
                  }
                }}
                className="h-8 text-sm"
              />
              {view.customDurationError ? (
                <p className="mt-1 text-[11px] text-destructive">{view.customDurationError}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 shrink-0"
              disabled={!canEditDuration || !view.canApplyCustomDuration}
              onClick={() => view.onApplyCustomDuration()}
            >
              Set
            </Button>
          </div>
        </section>

        <section
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 py-6"
          aria-label="Break countdown"
        >
          {view.complete ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <Coffee className="size-8 text-success" strokeWidth={1.5} aria-hidden />
              <p className="text-sm font-semibold text-foreground">Break over</p>
              <p className="text-xs text-muted">Reset to start another break.</p>
            </div>
          ) : view.idle ? (
            <div className="relative flex w-full max-w-full items-center justify-center">
              <input
                ref={view.countdownInputRef}
                type="text"
                inputMode="numeric"
                aria-label="Break countdown duration"
                value={
                  view.editingCountdown
                    ? view.countdownInputDraft
                    : formatBreakCountdownDisplay(view.countdownInputDraft)
                }
                readOnly={false}
                onFocus={view.onCountdownFocus}
                onPointerDown={view.onCountdownPointerDown}
                onMouseUp={view.onCountdownMouseUp}
                onChange={(event) => view.onCountdownChange(event.target.value)}
                onKeyDown={view.onCountdownKeyDown}
                onBlur={view.onCountdownBlur}
                className={cn(
                  countdownDisplayClass,
                  "h-auto w-[7.5ch] max-w-full border-0 bg-transparent p-0 text-center shadow-none outline-none",
                  "focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/40",
                  "cursor-text selection:bg-primary/20",
                )}
                spellCheck={false}
              />
            </div>
          ) : (
            <div
              className={cn(countdownDisplayClass, "flex items-center justify-center")}
              aria-live="polite"
              aria-atomic="true"
            >
              <NumberFlow value={minutes} format={{ minimumIntegerDigits: 2 }} />
              <span className="px-1 pb-1 text-muted-foreground">:</span>
              <NumberFlow value={seconds} format={{ minimumIntegerDigits: 2 }} />
            </div>
          )}

          <div className="flex items-center gap-3">
            {!view.complete ? (
              <motion.button
                type="button"
                aria-label={view.running ? "Pause break" : "Start break"}
                onClick={() => view.onToggleRun()}
                className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                whileTap={railTapScale}
                transition={railFastTransition}
              >
                {view.running ? (
                  <Pause className="size-5" fill="currentColor" aria-hidden />
                ) : (
                  <Play className="size-5 translate-x-0.5" fill="currentColor" aria-hidden />
                )}
              </motion.button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Reset break"
              title="Reset break"
              onClick={() => view.onReset()}
            >
              <RotateCcw className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
