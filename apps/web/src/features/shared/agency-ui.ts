/** Shared Tailwind class strings for the Agency dense register. */

import { useLayoutEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

import {
  shellEmptyPanelClass,
  shellErrorPanelClass,
  shellFocusRingClass,
  shellLabelClass,
} from "@/features/app-shell/app-shell-ui";

export const AGENCY_PAGE_SCROLL_ATTR = "data-agency-page-scroll";

/** Page-level scroll container for agency surfaces (see agency-page.tsx). */
export function getAgencyPageScrollElement(): HTMLElement | null {
  return document.querySelector(`[${AGENCY_PAGE_SCROLL_ATTR}]`);
}

/** Offset of a list root from the agency page scroll top (for @tanstack/react-virtual scrollMargin). */
function getAgencyPageScrollMargin(listElement: HTMLElement | null): number {
  const scrollElement = getAgencyPageScrollElement();
  if (!scrollElement || !listElement) return 0;

  const scrollRect = scrollElement.getBoundingClientRect();
  const listRect = listElement.getBoundingClientRect();
  return listRect.top - scrollRect.top + scrollElement.scrollTop;
}

export function useAgencyPageScrollMargin(listRef: RefObject<HTMLElement | null>): number {
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const scrollElement = getAgencyPageScrollElement();
    const listElement = listRef.current;
    if (!scrollElement || !listElement) return;

    const update = () => setScrollMargin(getAgencyPageScrollMargin(listElement));

    update();
    scrollElement.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(listElement);
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
    };
  }, [listRef]);

  return scrollMargin;
}

/** Work surface fills the agency page body so nested rails scroll independently. */
export const agencyWorkSurfaceShellClass = "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

export const agencyLabelClass = shellLabelClass;

export const agencySectionTitleClass = "text-lg font-bold text-highlighted";

export const agencyMetricClass = "font-mono tabular-nums text-highlighted";

/**
 * Work-surface type scale — one hierarchy across tracker, tabs, sessions, and tables.
 * title → primary row name; metric → clock totals; meta → secondary; time → range ticks.
 */
export const agencyWorkTitleClass = "text-sm font-semibold leading-snug text-highlighted";
export const agencyWorkMetricClass = cn(agencyMetricClass, "text-sm font-semibold");
export const agencyWorkMetaClass = "text-xs font-normal text-muted";
export const agencyWorkTimeRangeClass = "font-mono text-xs font-medium tabular-nums text-muted";
export const agencyWorkWeekLabelClass = "text-xs font-medium text-muted";
export const agencyWorkCountBadgeClass = cn(
  "inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-default bg-elevated px-1.5",
  "font-mono text-xs font-semibold tabular-nums text-muted",
  "transition-colors hover:bg-default hover:text-highlighted",
);

export const agencyFocusRingClass = shellFocusRingClass;

/** Hairline separator for overlapping member avatar stacks. */
export const agencyAvatarStackRingClass = "ring-1 ring-background";

/** Readable placeholder text on default/elevated agency surfaces (≥4.5:1). */
export const agencyInputPlaceholderClass = "placeholder:text-muted-foreground";

export const agencyPanelClass = "rounded-surface border border-default bg-default";

export const agencyFormFieldClass = "flex w-full min-w-0 flex-col gap-1.5";

export const agencyFormLabelClass = "block text-sm font-semibold text-muted";

export const agencyErrorPanelClass = shellErrorPanelClass;

export const agencyEmptyPanelClass = shellEmptyPanelClass;

/** My Tasks rail — same card language as the tracker bar (`agencyWorkTrackerCardClass`). */
export const agencyTaskRailClass =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-surface border border-border bg-card";

/** Collapsed rail: top-aligned open count and expand control. */
export const agencyTaskRailCollapsedClass = cn(
  agencyTaskRailClass,
  "relative items-center justify-start gap-2.5 px-2 pt-2.5 pb-2",
);

/**
 * Docked rail width is locked (min = width = max = basis) so flex content
 * cannot widen/narrow it. Steps at lg/xl; below lg the rail is a Sheet.
 */
export const agencyTaskRailExpandedWidthClass = cn(
  "hidden min-h-0 shrink-0 grow-0 flex-col overflow-hidden",
  "lg:flex lg:h-full lg:w-80 lg:min-w-80 lg:max-w-80 lg:basis-80",
  "xl:w-96 xl:min-w-96 xl:max-w-96 xl:basis-96",
);

export const agencyTaskRailCollapsedWidthClass = cn(
  "hidden min-h-0 shrink-0 grow-0 flex-col overflow-hidden",
  "lg:flex lg:h-full lg:w-[5.5rem] lg:min-w-[5.5rem] lg:max-w-[5.5rem] lg:basis-[5.5rem]",
);

/** Smooth dock width change — keep in sync with `RAIL_MS.rail` (320ms). */
export const agencyTaskRailWidthTransitionClass = cn(
  "motion-reduce:transition-none",
  "transition-[width,min-width,max-width,flex-basis] duration-[320ms]",
  "ease-[cubic-bezier(0.25,1,0.5,1)]",
);

/** Filter pills in My Tasks rail — inactive = offer, active = selected + clear. */
export const agencyMyTasksFilterPillClass = cn(
  "inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-dashed border-default bg-transparent px-2.5 text-xs font-medium text-muted",
  "transition-colors hover:border-solid hover:bg-muted hover:text-highlighted",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyMyTasksFilterPillActiveClass = cn(
  "border-solid border-primary/40 bg-primary/15 font-semibold text-primary",
  "ring-1 ring-inset ring-primary/20",
  "hover:border-primary/50 hover:bg-primary/20 hover:text-primary",
);

export const agencyMyTasksFilterPillClearIconClass =
  "size-3.5 shrink-0 opacity-70 transition-opacity group-hover/pill:opacity-100";

/** Client group band inside the rail list — quieter than full log day headers. */
export const agencyMyTasksClientGroupHeaderClass = cn(
  "sticky top-0 z-[1] truncate bg-card px-2 py-1.5 text-xs font-semibold tracking-wide text-muted",
);

export const agencyTaskRowContentClass = "relative flex gap-1.5 px-3 py-2.5";

export const agencyTaskRowNestedContentClass = "relative flex gap-1.5 px-3 py-1.5";

export const agencyTaskRowProjectPillClass = cn(
  "inline-flex max-w-[8rem] shrink-0 items-center rounded-full border border-default bg-elevated px-1.5 py-0.5",
  "text-[10px] font-semibold text-highlighted transition-colors hover:bg-default",
);

export const agencyTaskRowCheckboxClass = cn(
  "inline-flex size-3.5 shrink-0 items-center justify-center rounded border border-default bg-elevated",
  "transition-colors hover:border-muted-foreground/40",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTaskRowCheckboxCheckedClass = "border-highlighted bg-highlighted text-inverted";

export const agencyTaskRowClass = cn(
  "transition-[background-color,opacity,transform] duration-200 motion-reduce:transition-none",
  "cursor-pointer hover:bg-default/60",
);

export const agencyTaskRowSelectedClass = "bg-primary/10 hover:bg-primary/10";

export const agencyTaskRowDoneClass = "hover:bg-default/60";

export const agencyTaskRowCompleteClass = "agency-task-row-complete";

export const agencySearchHighlightMarkClass = "agency-search-highlight-mark";

export const agencyTaskRowNeedsDescriptionClass = "bg-warning/5";

/** Work time surface — stacks tracker and log as separate panels. */
export const agencyTimePaneStackClass =
  "@container/tracker flex min-h-0 min-w-0 flex-1 flex-col gap-[20px] font-sans";

export const agencyTimePaneBodyClass = "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden";

export const agencyTimeTrackerPanelClass = "relative z-20 shrink-0 overflow-visible";

/** Log body inside the unified work pane — no second border/radius. */
export const agencyTimeLogPanelClass = "flex min-h-0 flex-1 flex-col overflow-hidden";

const agencyWorkTrackerCardClass =
  "shrink-0 overflow-hidden rounded-surface border border-border bg-card";

export const agencyWorkTableBodyScrollClass = "min-h-0 flex-1 overflow-y-auto p-0";

/** Shared compact state treatment within the work-surface content pane. */
export const agencyWorkSurfaceStateClass =
  "mx-auto flex w-full max-w-md flex-col items-center rounded-none border border-default bg-elevated/35 px-5 py-8 text-center";

export const agencyWorkPlayButtonClass = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-elevated text-muted",
  "transition-colors hover:bg-default hover:text-highlighted",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

/** Ghost icon control for entry rails — play and menu share this (no circle chrome). */
export const agencyTimeEntryIconButtonClass = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted",
  "transition-colors hover:bg-elevated hover:text-highlighted",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

/** Match entry-row content height (`agencyTimeEntryRowClass` min-h-[52px]). */
export const agencyTimeTrackerCardClass = cn(
  agencyWorkTrackerCardClass,
  "agency-tracker-card flex min-h-[52px] min-w-0 flex-row items-center overflow-visible px-3 sm:px-4",
);

/** Whole-surface loading shimmer — one sweep, no stacked placeholders. */
export const agencyTimeTrackerShimmerClass =
  "pointer-events-none absolute inset-0 rounded-[inherit] bg-muted/50 shimmer shimmer-bg text-foreground motion-reduce:animate-none";

export const agencyTimeTrackerDescriptionZoneClass =
  "group/desc relative flex min-h-0 min-w-0 flex-1 items-center overflow-visible";

export const agencyTimeTrackerDescriptionInputClass =
  "block h-9 w-full min-w-0 truncate rounded-md border-0 bg-transparent px-0 py-0 text-base font-normal leading-9 text-foreground shadow-none";

/** Tracker right cluster — single-height rail with hairline separators. */
export const agencyTimeTrackerRailClass =
  "agency-tracker-controls flex h-full shrink-0 items-center";

export const agencyTimeTrackerRailCellClass = "flex shrink-0 items-center gap-2 px-2.5";

export const agencyTimeTrackerRailDividerClass =
  "h-6 w-px shrink-0 self-center bg-border data-vertical:h-6 data-vertical:w-px data-vertical:self-center";

export const agencyTimeTrackerMetricClass = cn(
  agencyWorkMetricClass,
  "inline-flex h-9 w-[5.25rem] shrink-0 items-center justify-center text-base",
);

export const agencyTimeTrackerElapsedInputClass = cn(
  agencyTimeTrackerMetricClass,
  // Override shared Input defaults (px/py/md:text-sm) so digits sit optically centered.
  "rounded-md border border-transparent bg-transparent px-0 py-0 shadow-none",
  "text-center leading-9 md:text-base text-highlighted",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

export const agencyTaskChooserTriggerClass = cn(
  "inline-flex min-w-0 max-w-full shrink items-center justify-start gap-1.5 overflow-hidden rounded-lg border-0 bg-transparent px-2 py-0 font-normal leading-none text-foreground shadow-none",
  "transition-[color,background-color,transform] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-muted hover:text-foreground active:scale-[0.98]",
  agencyFocusRingClass,
  "motion-reduce:transition-none motion-reduce:active:scale-100",
);

export const agencyTimeTrackerTaskChooserTriggerClass = cn(
  agencyTaskChooserTriggerClass,
  "h-9 max-h-9 min-h-9 w-auto gap-1.5 text-sm",
);

export const agencyTaskChooserPanelClass = cn(
  "flex w-[26rem] max-w-[calc(100vw-2rem)] flex-col gap-0 rounded-surface border border-border bg-popover p-0 font-sans text-popover-foreground shadow-lg ring-0",
  // Exit animation can stall Presence unmount and leave a click-eating layer.
  "data-[state=closed]:animate-none",
);

export const agencyTaskChooserSearchInputClass = cn(
  "h-9 rounded-lg border-border bg-card pl-8 font-sans text-sm transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
);

export const agencyTaskChooserRowClass = cn(
  "group flex w-full items-center gap-0.5 rounded-md transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-muted motion-reduce:transition-none",
);

export const agencyTaskChooserRowSelectedClass = "bg-primary/10 hover:bg-primary/10";

export const agencyTaskChooserRowBestMatchClass = "bg-accent/40 hover:bg-accent/50";

export const agencyTaskChooserRowActiveClass = "bg-accent hover:bg-accent";

export const agencyTaskChooserSectionHoverClass = cn(
  "rounded-md transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-muted",
  "motion-reduce:transition-none",
);

export const agencyTaskChooserCreateActionClass = cn(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-muted hover:text-primary/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTaskChooserCreateActionMutedClass = cn(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] hover:bg-muted hover:text-muted-foreground",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTimeTrackerPrimaryActionClass =
  "inline-flex h-9 max-h-9 min-h-9 min-w-[4.75rem] shrink-0 items-center justify-center rounded-2xl bg-primary px-4 text-xs font-semibold uppercase tracking-wide text-primary-foreground hover:bg-primary/80";

export const agencyTimeTrackerStopActionClass =
  "inline-flex h-9 max-h-9 min-h-9 min-w-[4.75rem] shrink-0 items-center justify-center rounded-2xl bg-destructive px-4 text-xs font-semibold uppercase tracking-wide text-primary-foreground hover:bg-destructive/90";

export const agencyTimeTrackerIconActionClass = cn(
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTimeTrackerSuggestionPanelClass = cn(
  "relative z-50 max-h-48 overflow-y-auto overflow-x-hidden rounded-surface border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
);

export const agencyTimeTrackerSuggestionOptionClass = cn(
  "flex w-full min-w-0 flex-col items-stretch gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent/35",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTimeEntryRowClass = cn(
  "agency-entry-row group/row flex min-h-[52px] items-stretch border-b border-border/30 bg-clip-padding font-sans transition-colors hover:bg-elevated/50 motion-reduce:transition-none",
);

/** Nested child row inside an expanded multi-entry group. */
export const agencyTimeEntryMultiChildClass = "border-b border-dotted border-border/40";

/** Bottom rule for expanded multi-entry wrappers (matches row separators). */
export const agencyTimeEntryGroupBorderClass = "border-b border-dotted border-border/40";

/** Clockify-style free-text start/end — plain like multi range; border only on hover/focus. */
export const agencyTimeEntryClockTimeInputClass = cn(
  // Override shared Input defaults (rounded-4xl, bg-input/30, focus ring).
  "h-7 w-[4.25rem] min-w-0 shrink appearance-none rounded-none border border-transparent bg-transparent px-0.5 py-0",
  "text-center font-mono text-xs font-medium tabular-nums text-muted shadow-none outline-none",
  "transition-colors hover:border-border",
  "focus-visible:border-primary focus-visible:bg-transparent focus-visible:text-highlighted focus-visible:ring-0",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

/** Tracker manual-add clocks — same Clockify labels as entry rows, sized to the 52px bar. */
export const agencyTimeTrackerClockTimeInputClass = cn(
  agencyTimeEntryClockTimeInputClass,
  "h-9 w-[5.25rem] rounded-md text-sm",
);

/** Tracker manual-add date trigger — labeled ghost, not a native date input. */
export const agencyTimeTrackerDateTriggerClass = cn(
  "h-9 min-w-0 shrink-0 rounded-2xl px-2.5 text-sm font-medium text-muted-foreground",
  "hover:bg-muted hover:text-foreground",
);

export const agencyTimeEntryDurationInputClass = cn(
  "h-8 w-full min-w-0 appearance-none rounded-none border border-transparent bg-transparent px-0 py-0",
  "text-center font-mono text-sm font-semibold tabular-nums text-highlighted shadow-none outline-none",
  "transition-colors hover:border-border",
  "focus-visible:border-primary focus-visible:bg-transparent focus-visible:ring-0",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive",
);

/** Left cluster — badge, description, task (free; not column-locked). */
export const agencyTimeEntryMainClass =
  "agency-entry-main flex min-w-0 flex-1 self-stretch items-center gap-0 pl-3";

/**
 * Right rail — time | duration | actions.
 * Inset vertical ticks (`inset-y-2`); day headers use the quiet rail (no hairlines).
 */
export const agencyTimeEntryRailClass = cn(
  "agency-entry-controls relative flex shrink-0 self-stretch items-stretch",
  "before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-border/40",
  "[&>*+*]:relative [&>*+*]:before:pointer-events-none [&>*+*]:before:absolute [&>*+*]:before:inset-y-2 [&>*+*]:before:left-0 [&>*+*]:before:w-px [&>*+*]:before:bg-border/40",
);

/** Day-header rail — same cell widths, no vertical separators. */
export const agencyTimeEntryRailQuietClass = "flex shrink-0 items-center";

const agencyTimeEntryRailCellClass = "box-border flex h-full shrink-0 items-center px-[10px]";

export const agencyTimeEntryRailBillableClass = cn(
  agencyTimeEntryRailCellClass,
  "agency-entry-link w-[56px] justify-center",
);

/** Content-box width for locale ranges like "12:29 - 14:54" / "9:29 pm - 9:40 pm". */
export const agencyTimeEntryRailTimeClass = cn(
  agencyTimeEntryRailCellClass,
  "agency-entry-time w-[188px] whitespace-nowrap",
);

export const agencyTimeEntryRailCalendarClass = cn(
  agencyTimeEntryRailCellClass,
  "agency-entry-calendar w-[63px] justify-center",
);

/** Content-box width for bold tabular "HH:MM:SS". */
export const agencyTimeEntryRailDurationClass = cn(
  agencyTimeEntryRailCellClass,
  "agency-entry-duration relative w-[133px] whitespace-nowrap",
);

/** Play / more — 56+56; rail `[&>*+*]:before` draws the divider between them. */
export const agencyTimeEntryRailPlayClass = cn(
  agencyTimeEntryRailCellClass,
  "agency-entry-play w-[56px] justify-center",
);

export const agencyTimeEntryRailMoreClass = cn(
  agencyTimeEntryRailCellClass,
  "agency-entry-more w-[56px] justify-center",
);

/** Combined 112px actions zone for day headers / skeletons. */
export const agencyTimeEntryRailActionsClass =
  "flex h-full w-[112px] shrink-0 items-center justify-end gap-1 pr-2";

/** Day band — same rail geometry as rows so totals lock to the duration column. */
export const agencyTimeEntrySectionHeaderClass = cn(
  "flex h-10 items-center border-b border-border/30 bg-muted/20 font-sans",
  "motion-reduce:transition-none transition-colors duration-150",
);

/** Bulk mode with a selection — soft Operator Violet surface, still quiet. */
export const agencyTimeEntrySectionHeaderBulkActiveClass = "border-b-primary/25 bg-primary/5";

export const agencyTimeEntrySectionLabelClass = cn(
  "flex min-w-0 flex-1 items-center px-5 text-sm font-semibold text-highlighted",
);

/**
 * Shared select column for day header + entry rows.
 * pl-5 (20px) + 14px checkbox fits in w-[34px] under border-box.
 */
export const agencyTimeEntryBulkSelectColumnClass =
  "flex w-[34px] shrink-0 items-center justify-start self-stretch pl-5";

export const agencyTimeEntryBulkRowSelectedClass = "bg-primary/5";

export const agencyTimeEntryBulkToolbarClass = cn(
  "flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/[0.04] px-4 py-2 sm:px-5",
  "motion-reduce:transition-none transition-colors duration-150",
);

export const agencyTimeEntryBulkActionClass = cn(
  "h-7 gap-1 rounded-md px-2 text-xs font-medium text-muted",
  "hover:bg-elevated hover:text-highlighted",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

/** One day block — solid surface so background gutters read as hard separation. */
export const agencyTimeEntryDayGroupClass =
  "@container/entries overflow-hidden rounded-surface border border-default bg-default";

/** Week band with visible week total chrome (Clockify-style). */
export const agencyTimeWeekGroupClass = "flex flex-col";

export const agencyTimeWeekGroupHeaderClass =
  "flex h-[40px] shrink-0 items-center justify-between gap-3 bg-transparent";

export const agencyTimeWeekGroupBodyClass = "flex flex-col gap-[20px] bg-background";

/** Stack of week sections — same gutter as days so week boundaries stay invisible. */
export const agencyTimeWeekStackClass = "flex min-h-full flex-col gap-[20px] bg-background";

export const agencyMyTasksRailRowClass = cn(
  "relative grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1.5",
  "transition-colors hover:bg-default/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "motion-reduce:transition-none",
);

export const agencyMyTasksRailRowTrackingClass =
  "bg-primary/5 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary";

export const agencyMyTasksRailRowTrackingPulseClass = "agency-my-tasks-tracking-pulse";

export const agencyMyTasksCheckPopClass = "agency-my-tasks-check-pop";
export const agencyMyTasksCountTickClass = "agency-my-tasks-count-tick";
export const agencyMyTasksCreateFlashClass = "agency-my-tasks-create-flash";

export const agencyMyTasksRailRowSelectedClass = "bg-muted";

export const agencyMyTasksRailRowDoneClass = "opacity-70";

export const agencyMyTasksRailComposerFormClass =
  "relative z-10 flex min-w-0 shrink-0 flex-col gap-1.5 overflow-visible border-b border-default px-3 py-2 sm:px-4";

export const agencyMyTasksRailComposerChooserClass =
  "flex min-w-0 w-full items-center [&>div]:flex [&>div]:w-full [&>div]:max-w-none";

export const agencyMyTasksRailComposerRowClass = "flex min-w-0 w-full items-center gap-1.5";

export const agencyMyTasksRailAddButtonClass = cn(
  "inline-flex h-8 min-w-0 flex-1 shrink items-center justify-center gap-1 rounded-full px-3",
  "text-sm font-semibold tracking-tight",
  "transition-[color,background-color,box-shadow,border-color,transform] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-out)]",
  "disabled:opacity-100",
  "data-[armed=false]:cursor-not-allowed data-[armed=false]:border-border data-[armed=false]:bg-muted data-[armed=false]:text-highlighted data-[armed=false]:shadow-none",
  "data-[armed=true]:border-transparent data-[armed=true]:bg-primary data-[armed=true]:text-primary-foreground data-[armed=true]:hover:bg-primary/90 data-[armed=true]:hover:shadow-xs data-[armed=true]:active:scale-[0.98]",
  "motion-reduce:transition-none motion-reduce:active:scale-100",
  agencyFocusRingClass,
);

export const agencyTimeEntryRowEditingClass = "bg-primary/5 hover:bg-primary/5";

export const agencyTimeWeekFooterClass = cn(
  "mt-[20px] flex h-[40px] shrink-0 items-center justify-between border-t border-default px-[20px]",
  "bg-elevated/40",
);
