import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  mergeTimelineItems,
  type MemberProfileTimelineItem,
  type MergedTimelineActivity,
  type MergedTimelineItem,
} from "@/features/member-profile/member-profile-activity-merge";
import { AgencyReportEntryDetailsDialog } from "@/features/reports/agency-report-entry-details-dialog";
import type { AgencyReportEntry } from "@/features/reports/agency-report-grouping";
import { AgencyWasteTag } from "@/features/shared/agency-waste-badge";
import {
  agencyFocusRingClass,
  agencyWorkCountBadgeClass,
  agencyWorkMetaClass,
} from "@/features/shared/agency-ui";
import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

type MemberProfileActivityRailsDay = {
  date: string;
  title: string;
  subtitle: string;
  countLabel: string;
  items: MemberProfileTimelineItem[];
};

/** Compact day total for the sticky rail (matches profile week bars). */
function shortHours(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function dayTotalSeconds(items: readonly MergedTimelineItem[]): number {
  let total = 0;
  for (const item of items) {
    if (item.kind === "activity") total += item.durationSeconds;
  }
  return total;
}

type Props = {
  teamId: string;
  days: MemberProfileActivityRailsDay[];
  totalEventsLabel: string;
  /** Brief shimmer target after jumping here from an alert. */
  highlightDate?: string | null;
  canAddReview?: boolean;
  onAddReview?: () => void;
};

function dayRailParts(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const dayNum = date.getUTCDate();
  const weekdayShort = date.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
  const monthShort = date.toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });
  return {
    dayNum,
    weekdayShort,
    monthShort,
    tabLabel: `${weekdayShort} ${dayNum}`,
    ariaLabel: date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

function FeedActivityRow({
  item,
  onOpenDetails,
}: {
  item: MergedTimelineActivity;
  onOpenDetails: (item: MergedTimelineActivity) => void;
}) {
  const grouped = item.entryCount > 1 && item.entries.length > 1;
  const canOpenDetails = item.entries.length > 0;
  const durationBlock = (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
      <span>{item.durationLabel}</span>
      {grouped ? (
        <span className={cn(agencyWorkCountBadgeClass, "h-5 min-w-5 px-1 text-[10px]")}>
          x{item.entryCount}
        </span>
      ) : null}
      {canOpenDetails ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : null}
    </span>
  );

  return (
    <article className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2 border-t border-border/60 py-3 first:border-t-0 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-3">
      <time className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
        {item.timeLabel}
      </time>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {item.projectId && item.projectName ? (
            <AgencyTimeEntryProjectLabel
              projectId={item.projectId}
              projectName={item.projectName}
              clientName={item.clientName ?? undefined}
              taskTitle={item.taskTitle ?? item.title}
              colorHueId={item.colorHueId}
              taskIconKey={item.taskIconKey}
              projectIconKey={item.projectIconKey}
              format="task-client"
              className="min-w-0"
            />
          ) : (
            <span className="truncate text-[13px] font-medium text-foreground">{item.title}</span>
          )}
          {item.isWaste ? <AgencyWasteTag /> : null}
        </div>
        {item.eventType === "leave" && item.body ? (
          <p className={cn("mt-1 text-xs", agencyWorkMetaClass)}>{item.body}</p>
        ) : item.description && item.taskTitle ? (
          <p className={cn("mt-0.5 truncate text-xs", agencyWorkMetaClass)}>{item.description}</p>
        ) : null}
        {item.meta && item.eventType === "leave" ? (
          <p className={cn("mt-0.5 font-mono text-[11px]", agencyWorkMetaClass)}>{item.meta}</p>
        ) : null}
      </div>
      {canOpenDetails ? (
        <button
          type="button"
          className={cn(
            "col-start-2 inline-flex justify-self-start sm:col-start-auto sm:justify-self-end",
            "-mx-1 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60",
            agencyFocusRingClass,
          )}
          aria-label={
            grouped
              ? `${item.durationLabel}, ${item.entryCount} entries. Open details.`
              : `${item.durationLabel}. Open details.`
          }
          onClick={() => onOpenDetails(item)}
        >
          {durationBlock}
        </button>
      ) : (
        <span className="col-start-2 justify-self-start sm:col-start-auto sm:justify-self-end">
          {durationBlock}
        </span>
      )}
    </article>
  );
}

const DAY_RAIL_SCROLL_STEP_PX = 160;

export function MemberProfileActivityRails({
  teamId,
  days,
  totalEventsLabel,
  highlightDate = null,
  canAddReview = false,
  onAddReview,
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const feedRef = useRef<HTMLDivElement>(null);
  const navRailRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(days[0]?.date ?? "");
  const [navEdges, setNavEdges] = useState({ canScrollLeft: false, canScrollRight: false });
  const liveStatusRef = useRef<HTMLParagraphElement>(null);
  const [details, setDetails] = useState<{
    title: string;
    entries: AgencyReportEntry[];
  } | null>(null);

  const daysWithMerged = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        items: mergeTimelineItems(day.items),
      })),
    [days],
  );

  useEffect(() => {
    if (daysWithMerged.length === 0) return;
    if (!daysWithMerged.some((day) => day.date === currentDate)) {
      setCurrentDate(daysWithMerged[0]?.date ?? "");
    }
  }, [currentDate, daysWithMerged]);

  useEffect(() => {
    const feed = feedRef.current;
    const navRail = navRailRef.current;
    if (!feed || !navRail || daysWithMerged.length === 0) return;

    let ticking = false;
    const syncCurrentDay = () => {
      const marker = feed.scrollTop + navRail.offsetHeight + 32;
      let current = daysWithMerged[0]?.date ?? "";
      for (const day of daysWithMerged) {
        const el = document.getElementById(`member-profile-day-${day.date}`);
        if (!el) continue;
        if (el.offsetTop <= marker) current = day.date;
      }
      setCurrentDate(current);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncCurrentDay);
    };

    feed.addEventListener("scroll", onScroll, { passive: true });
    syncCurrentDay();
    return () => feed.removeEventListener("scroll", onScroll);
  }, [daysWithMerged]);

  useEffect(() => {
    const navScroll = navScrollRef.current;
    if (!navScroll) return;

    const updateNavEdges = () => {
      const { scrollLeft, scrollWidth, clientWidth } = navScroll;
      setNavEdges({
        canScrollLeft: scrollLeft > 4,
        canScrollRight: scrollLeft + clientWidth < scrollWidth - 4,
      });
    };

    updateNavEdges();
    navScroll.addEventListener("scroll", updateNavEdges, { passive: true });
    const observer = new ResizeObserver(updateNavEdges);
    observer.observe(navScroll);
    return () => {
      navScroll.removeEventListener("scroll", updateNavEdges);
      observer.disconnect();
    };
  }, [daysWithMerged]);

  useEffect(() => {
    const navScroll = navScrollRef.current;
    if (!navScroll || !currentDate) return;
    const active = navScroll.querySelector<HTMLElement>(`[data-day="${currentDate}"]`);
    active?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [currentDate, prefersReducedMotion]);

  function scrollDayRail(direction: -1 | 1) {
    navScrollRef.current?.scrollBy({
      left: direction * DAY_RAIL_SCROLL_STEP_PX,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  function jumpToDay(date: string) {
    const feed = feedRef.current;
    const navRail = navRailRef.current;
    const target = document.getElementById(`member-profile-day-${date}`);
    if (!feed || !navRail || !target) return;
    setCurrentDate(date);
    feed.scrollTo({
      top: Math.max(0, target.offsetTop - navRail.offsetHeight),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    const parts = dayRailParts(date);
    if (liveStatusRef.current) {
      liveStatusRef.current.textContent = `Showing ${parts.ariaLabel}`;
    }
  }

  if (daysWithMerged.length === 0) return null;

  return (
    <>
      <section className="overflow-hidden rounded-surface border border-border bg-card">
        <div className="flex items-end justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Activity & reviews
          </h2>
          <div className="flex items-center gap-2">
            {canAddReview && onAddReview ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn("h-7 px-2 text-xs", agencyFocusRingClass)}
                onClick={onAddReview}
              >
                Add review
              </Button>
            ) : null}
            <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full border border-border px-2 font-mono text-[11px] text-muted-foreground">
              {totalEventsLabel}
            </span>
          </div>
        </div>

        <div
          ref={feedRef}
          tabIndex={0}
          className={cn(
            "relative min-w-0 overscroll-contain",
            "max-xl:overflow-visible max-xl:pb-2",
            "xl:max-h-[min(28rem,calc(100vh-12rem))] xl:overflow-x-hidden xl:overflow-y-auto",
            "scroll-smooth motion-reduce:scroll-auto",
            "[scrollbar-gutter:stable]",
          )}
          aria-label="Activity and reviews by day"
        >
          <div
            ref={navRailRef}
            className={cn(
              "sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm supports-backdrop-filter:bg-card/80",
            )}
          >
            <nav className="relative flex items-stretch" aria-label="Jump to activity day">
              <button
                type="button"
                aria-label="Scroll to earlier days"
                disabled={!navEdges.canScrollLeft}
                className={cn(
                  "flex w-7 shrink-0 items-center justify-center text-muted-foreground transition-opacity duration-150",
                  agencyFocusRingClass,
                  "motion-reduce:transition-none",
                  !navEdges.canScrollLeft && "pointer-events-none opacity-0",
                )}
                onClick={() => scrollDayRail(-1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>

              <div className="relative min-w-0 flex-1">
                <div
                  ref={navScrollRef}
                  className={cn(
                    "flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain py-2",
                    "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  )}
                >
                  {daysWithMerged.map((day) => {
                    const parts = dayRailParts(day.date);
                    const current = day.date === currentDate;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        data-day={day.date}
                        className={cn(
                          "inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-md px-2.5 font-mono text-[11px] tracking-wide transition-colors duration-150",
                          agencyFocusRingClass,
                          "motion-reduce:transition-none",
                          day.date === highlightDate
                            ? "border border-border bg-muted text-foreground ring-1 ring-border"
                            : current
                              ? "border border-border bg-muted text-foreground"
                              : "border border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                        aria-current={current ? "true" : undefined}
                        onClick={() => jumpToDay(day.date)}
                      >
                        {parts.tabLabel}
                      </button>
                    );
                  })}
                </div>

                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-card/95 to-transparent transition-opacity duration-150 motion-reduce:transition-none",
                    navEdges.canScrollLeft ? "opacity-100" : "opacity-0",
                  )}
                />
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-card/95 to-transparent transition-opacity duration-150 motion-reduce:transition-none",
                    navEdges.canScrollRight ? "opacity-100" : "opacity-0",
                  )}
                />
              </div>

              <button
                type="button"
                aria-label="Scroll to later days"
                disabled={!navEdges.canScrollRight}
                className={cn(
                  "flex w-7 shrink-0 items-center justify-center text-muted-foreground transition-opacity duration-150",
                  agencyFocusRingClass,
                  "motion-reduce:transition-none",
                  !navEdges.canScrollRight && "pointer-events-none opacity-0",
                )}
                onClick={() => scrollDayRail(1)}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </nav>
          </div>

          {daysWithMerged.map((day) => {
            const parts = dayRailParts(day.date);
            const isCurrent = day.date === currentDate;
            const isHighlighted = day.date === highlightDate;
            const totalSeconds = dayTotalSeconds(day.items);
            return (
              <section
                key={day.date}
                id={`member-profile-day-${day.date}`}
                data-label={parts.ariaLabel}
                data-highlighted={isHighlighted ? "true" : undefined}
                className={cn(
                  "grid scroll-mt-[3.25rem] grid-cols-[4.5rem_minmax(0,1fr)] border-b border-border last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,1fr)]",
                  isHighlighted && "member-profile-day-shimmer",
                )}
              >
                <h3 className="sticky top-[3.25rem] self-start px-3 py-4 font-mono text-[11px] tracking-[0.07em] text-muted-foreground uppercase sm:px-4">
                  <strong className="mb-0.5 block text-[1.5rem] font-medium tracking-tight text-foreground normal-case sm:text-[1.625rem]">
                    {parts.dayNum}
                  </strong>
                  <span className="font-medium normal-case tracking-normal">
                    {parts.weekdayShort} · {parts.monthShort}
                  </span>
                  <span
                    className={cn(
                      "mt-2.5 block font-normal tracking-normal normal-case",
                      isCurrent ? "text-muted-foreground" : "text-muted-foreground/80",
                    )}
                  >
                    {`${day.items.length} event${day.items.length === 1 ? "" : "s"}`}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block font-normal tracking-normal normal-case tabular-nums",
                      isCurrent ? "text-muted-foreground" : "text-muted-foreground/80",
                    )}
                  >
                    {shortHours(totalSeconds)}
                  </span>
                </h3>

                <div className="min-w-0 border-l border-border px-3 py-2 sm:px-5 sm:pb-4">
                  {day.items.map((item) =>
                    item.kind === "review" ? (
                      <article
                        key={item.id}
                        className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2 border-t border-border/60 py-3.5 first:border-t-0 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-3"
                      >
                        <time className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {item.timeLabel}
                        </time>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold tracking-wide text-pretty text-foreground">
                            {item.authorName} left a review
                          </div>
                          <p className="mt-1.5 max-w-[48ch] text-xs leading-relaxed text-pretty text-muted-foreground">
                            {item.body}
                          </p>
                        </div>
                        <span className="col-start-2 inline-flex h-[22px] items-center self-start justify-self-start rounded-full border border-border bg-muted px-2 font-mono text-[11px] tracking-wide text-foreground sm:col-start-auto sm:justify-self-end">
                          review
                        </span>
                      </article>
                    ) : (
                      <FeedActivityRow
                        key={item.mergeKey}
                        item={item}
                        onOpenDetails={(next) =>
                          setDetails({
                            title: next.taskTitle || next.title,
                            entries: next.entries,
                          })
                        }
                      />
                    ),
                  )}
                </div>
              </section>
            );
          })}

          <p ref={liveStatusRef} className="sr-only" role="status" aria-live="polite" />
        </div>
      </section>

      {details ? (
        <AgencyReportEntryDetailsDialog
          teamId={teamId}
          entries={details.entries}
          title={details.title}
          open
          onOpenChange={(open) => {
            if (!open) setDetails(null);
          }}
        />
      ) : null}
    </>
  );
}
