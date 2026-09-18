import { Redo2, Undo2 } from "lucide-react";
import type { Ref } from "react";

import { AgencyReportDocumentChapterView } from "@/features/reports/agency-report-document-chapter-view";
import type { AgencyReportFieldId } from "@/features/reports/agency-report-fields";
import type { AggregatedReportRow } from "@/features/reports/agency-report-grouping";
import { formatReportPeriodDayMonth } from "@/features/reports/agency-report-naming";
import type { PreviewDocumentClient } from "@/features/reports/agency-report-preview";
import { agencyFocusRingClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

type ReportDocumentOutlineItem = {
  clientId: string;
  clientName: string;
  hoursLabel: string;
  isCurrent: boolean;
};

type ReportDocumentVirtualChapter = {
  index: number;
  key: string;
  start: number;
  client: PreviewDocumentClient;
};

type ReportDocumentStickyChapter = {
  clientName: string;
  hoursLabel: string;
  amountLabel: string | null;
};

export type AgencyReportDocumentPreviewProps = {
  visibleFields: AgencyReportFieldId[];
  rangeFrom: string;
  rangeTo: string;
  totalSeconds: number;
  totalEntries: number;
  chapterScrollRef: Ref<HTMLDivElement | null>;
  outline: ReportDocumentOutlineItem[];
  stickyChapter: ReportDocumentStickyChapter | null;
  onJumpToClient: (clientId: string) => void;
  onChapterScroll: () => void;
  virtualChapters: ReportDocumentVirtualChapter[];
  virtualTotalSize: number;
  measureChapter: (element: HTMLDivElement | null) => void;
  onEditDetails: (row: AggregatedReportRow) => void;
  onExcludeRow: (row: AggregatedReportRow) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function AgencyReportDocumentPreview({
  visibleFields,
  rangeFrom,
  rangeTo,
  totalSeconds,
  totalEntries,
  chapterScrollRef,
  outline,
  stickyChapter,
  onJumpToClient,
  onChapterScroll,
  virtualChapters,
  virtualTotalSize,
  measureChapter,
  onEditDetails,
  onExcludeRow,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: AgencyReportDocumentPreviewProps) {
  const periodFromLabel = formatReportPeriodDayMonth(rangeFrom);
  const periodToLabel = formatReportPeriodDayMonth(rangeTo);
  const entryLabel = totalEntries === 1 ? "1 entry" : `${totalEntries} entries`;
  const currentClient = outline.find((item) => item.isCurrent);

  return (
    <article className="rounded-surface border border-default bg-card px-4 py-4 md:px-6 md:py-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted">Export document for this range.</p>
          <p className="text-sm text-highlighted">
            <span className={agencyMetricClass}>{formatDuration(totalSeconds, "units")}</span>
            <span className="text-muted"> · {entryLabel}</span>
          </p>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Undo"
                  disabled={!canUndo}
                  onClick={onUndo}
                >
                  <Undo2 aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Redo"
                  disabled={!canRedo}
                  onClick={onRedo}
                >
                  <Redo2 aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Redo</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </header>

      {outline.length > 1 ? (
        <nav
          aria-label="Clients in this report"
          className="mb-4 min-w-0 border-b border-default pb-3"
          onKeyDown={(event) => {
            if (
              event.key !== "ArrowRight" &&
              event.key !== "ArrowDown" &&
              event.key !== "ArrowLeft" &&
              event.key !== "ArrowUp"
            ) {
              return;
            }
            const buttons = [...event.currentTarget.querySelectorAll("button")];
            const current = event.target;
            if (!(current instanceof HTMLButtonElement)) return;
            const index = buttons.indexOf(current);
            if (index < 0) return;
            event.preventDefault();
            const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
            const next = buttons[(index + delta + buttons.length) % buttons.length];
            next?.focus();
            next?.click();
          }}
        >
          <ul className="flex min-w-0 gap-2 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:overflow-y-hidden max-sm:overscroll-x-contain sm:flex-wrap">
            {outline.map((item) => (
              <li key={item.clientId} className="min-w-0 max-sm:shrink-0">
                <button
                  type="button"
                  aria-current={item.isCurrent ? "location" : undefined}
                  className={cn(
                    "inline-flex min-h-11 flex-col items-start justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors",
                    agencyFocusRingClass,
                    item.isCurrent
                      ? "bg-chart-2/15 text-chart-2"
                      : "text-highlighted hover:bg-elevated max-sm:bg-elevated",
                  )}
                  onClick={() => onJumpToClient(item.clientId)}
                >
                  <span className="whitespace-nowrap text-xs font-medium leading-none tracking-[-0.01em]">
                    {item.clientName}
                  </span>
                  <span
                    className={cn(
                      agencyMetricClass,
                      "whitespace-nowrap text-xs leading-none",
                      item.isCurrent ? "text-chart-2/75" : "text-muted",
                    )}
                  >
                    {item.hoursLabel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {currentClient ? (
            <p className="sr-only">Current client {currentClient.clientName}</p>
          ) : null}
        </nav>
      ) : null}

      <div
        ref={chapterScrollRef}
        className="max-h-[min(72vh,calc(100dvh-14rem))] overflow-y-auto"
        onScroll={onChapterScroll}
      >
        {stickyChapter ? (
          <div className="sticky top-0 z-10 h-0 overflow-visible">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-default bg-card py-2">
              <p className="text-base font-semibold tracking-[-0.01em] text-highlighted">
                {stickyChapter.clientName}
              </p>
              <p className="text-xs text-muted">
                <span className={agencyMetricClass}>{stickyChapter.hoursLabel}</span>
                {stickyChapter.amountLabel ? <span> · {stickyChapter.amountLabel}</span> : null}
              </p>
            </div>
          </div>
        ) : null}
        <div className="relative" style={{ height: `${virtualTotalSize}px` }}>
          {virtualChapters.map((virtualChapter) => (
            <div
              key={virtualChapter.key}
              ref={measureChapter}
              data-index={virtualChapter.index}
              className="absolute top-0 left-0 w-full pb-8"
              style={{ transform: `translateY(${virtualChapter.start}px)` }}
            >
              <AgencyReportDocumentChapterView
                client={virtualChapter.client}
                visibleFields={visibleFields}
                periodFromLabel={periodFromLabel}
                periodToLabel={periodToLabel}
                onEditDetails={onEditDetails}
                onExcludeRow={onExcludeRow}
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
