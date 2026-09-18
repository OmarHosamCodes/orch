import { motion, MotionConfig } from "motion/react";

import type { GaugeDetailModel } from "@/features/member-profile/member-profile-gauge-detail";
import {
  memberProfileGaugeContentFade,
  memberProfileGaugeLayoutId,
  memberProfileGaugeMorphTransition,
} from "@/features/member-profile/member-profile-gauge-morph";
import { MemberProfileMonthPaceVisual } from "@/features/member-profile/member-profile-month-pace-visual";
import { MemberProfileStreakVisual } from "@/features/member-profile/member-profile-streak-visual";
import {
  instrumentPlateInkClass,
  StatPlateGlyph,
  WeekBarsGlyph,
} from "@/features/member-profile/member-profile-instrument-plate";
import { agencyFocusRingClass, agencyWorkMetaClass } from "@/features/shared/agency-ui";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
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

type Props = {
  detail: GaugeDetailModel | null;
  onClose: () => void;
  onPrimaryAction: () => void;
  onFocusDay?: (date: string) => void;
};

function GaugeBodyGlyph({ detail }: { detail: GaugeDetailModel }) {
  if (detail.key === "period" && detail.weekBarRatios.length > 0) {
    return <WeekBarsGlyph ratios={detail.weekBarRatios} className="h-full w-full" />;
  }
  if (detail.key === "waste" && detail.weekBarRatios.length > 0) {
    return <WeekBarsGlyph ratios={detail.weekBarRatios} className="h-full w-full" />;
  }
  return (
    <StatPlateGlyph
      plateKey={detail.key}
      ratio={detail.ratio}
      segments={detail.streakSegments}
      className="h-full w-full"
    />
  );
}

export function MemberProfileGaugeDetailDialog({
  detail,
  onClose,
  onPrimaryAction,
  onFocusDay,
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const open = detail !== null;
  const layoutId =
    detail && !prefersReducedMotion ? memberProfileGaugeLayoutId(detail.key) : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-md",
          "duration-0 data-open:fade-in-0 data-open:zoom-in-100 data-closed:fade-out-0 data-closed:zoom-out-100",
        )}
        showCloseButton={false}
      >
        {detail ? (
          <MotionConfig reducedMotion="user">
            <motion.div
              layoutId={layoutId}
              transition={memberProfileGaugeMorphTransition}
              className="relative rounded-surface border border-border bg-card shadow-xl ring-1 ring-foreground/5 dark:ring-foreground/10"
            >
              <DialogHeader className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn("h-8 w-16 shrink-0", instrumentPlateInkClass(detail.tone))}
                    aria-hidden
                  >
                    <StatPlateGlyph
                      plateKey={detail.key}
                      ratio={detail.ratio}
                      segments={detail.streakSegments}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base">{detail.title}</DialogTitle>
                    <p className="mt-1 font-mono text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {detail.metric}
                    </p>
                    <p className="mt-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {detail.shortLabel}
                    </p>
                  </div>
                </div>
                <DialogDescription className="mt-3 text-pretty text-start">
                  {detail.explain}
                </DialogDescription>
              </DialogHeader>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={memberProfileGaugeContentFade}
                className="max-h-[min(22rem,48vh)] overflow-y-auto px-4 py-3 sm:px-5"
              >
                {detail.monthPaceVisual ? (
                  <MemberProfileMonthPaceVisual pace={detail.monthPaceVisual} />
                ) : detail.streakVisual ? (
                  <MemberProfileStreakVisual streak={detail.streakVisual} />
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                      {detail.stats.map((stat) => (
                        <div key={stat.label} className="min-w-0">
                          <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {stat.label}
                          </dt>
                          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums leading-snug text-foreground">
                            {stat.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {(detail.weekBarRatios.length > 0 || detail.key === "present") &&
                    !detail.streakVisual ? (
                      <div
                        className={cn(
                          "mt-3 h-7 w-full max-w-[12rem]",
                          instrumentPlateInkClass(detail.tone),
                        )}
                        aria-hidden
                      >
                        <GaugeBodyGlyph detail={detail} />
                      </div>
                    ) : null}

                    {detail.rowsHeading ? (
                      <p className="mt-4 text-xs font-medium text-muted-foreground">
                        {detail.rowsHeading}
                      </p>
                    ) : null}

                    {detail.rows.length > 0 ? (
                      <ul className="mt-1 flex list-none flex-col gap-0 p-0">
                        {detail.rows.map((row, index) => {
                          const rowClassName =
                            "flex w-full items-baseline justify-between gap-3 border-t border-border/60 py-2.5 text-start first:border-t-0 first:pt-0";
                          const content = (
                            <>
                              <span className="min-w-0 text-sm text-foreground">{row.label}</span>
                              {row.meta ? (
                                <span
                                  className={cn(
                                    agencyWorkMetaClass,
                                    "shrink-0 font-mono tabular-nums",
                                  )}
                                >
                                  {row.meta}
                                </span>
                              ) : null}
                            </>
                          );
                          if (row.date && onFocusDay) {
                            return (
                              <li key={`${row.label}-${index}`}>
                                <button
                                  type="button"
                                  className={cn(
                                    rowClassName,
                                    agencyFocusRingClass,
                                    "hover:bg-muted/30",
                                  )}
                                  onClick={() => onFocusDay(row.date!)}
                                >
                                  {content}
                                </button>
                              </li>
                            );
                          }
                          return (
                            <li key={`${row.label}-${index}`} className={rowClassName}>
                              {content}
                            </li>
                          );
                        })}
                      </ul>
                    ) : detail.emptyLabel ? (
                      <p className={cn(agencyWorkMetaClass, "mt-3")}>{detail.emptyLabel}</p>
                    ) : null}

                    {detail.rowOverflowLabel ? (
                      <p className={cn(agencyWorkMetaClass, "mt-2 text-foreground/60")}>
                        {detail.rowOverflowLabel}
                      </p>
                    ) : null}
                  </>
                )}
              </motion.div>

              <DialogFooter className="border-t border-border px-4 py-3 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  className={agencyFocusRingClass}
                  onClick={onClose}
                >
                  Close
                </Button>
                {detail.primaryAction ? (
                  <Button type="button" className={agencyFocusRingClass} onClick={onPrimaryAction}>
                    {detail.primaryAction.label}
                  </Button>
                ) : null}
              </DialogFooter>
            </motion.div>
          </MotionConfig>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
