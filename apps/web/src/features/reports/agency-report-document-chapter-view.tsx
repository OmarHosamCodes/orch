import { AgencyEntityMark } from "@/features/shared/agency-entity-mark";
import { AgencyPartialWasteChip, AgencyWasteTag } from "@/features/shared/agency-waste-badge";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  type AgencyReportFieldId,
  isReportFieldVisible,
} from "@/features/reports/agency-report-fields";
import {
  joinedReportRowLinks,
  reportSimilarTaskStripeClass,
  reportSimilarTaskStripeIndexes,
  type AggregatedReportRow,
} from "@/features/reports/agency-report-grouping";
import {
  aggregatedWasteCounts,
  aggregatedWasteKind,
  type PreviewDocumentClient,
} from "@/features/reports/agency-report-preview";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";

const reportTaskDescriptionSepClass =
  "pointer-events-none absolute top-1/2 right-0 z-[1] h-4 w-px -translate-y-1/2 bg-border/45";

export type AgencyReportDocumentChapterViewProps = {
  client: PreviewDocumentClient;
  visibleFields: AgencyReportFieldId[];
  periodFromLabel: string;
  periodToLabel: string;
  onEditDetails: (row: AggregatedReportRow) => void;
  onExcludeRow: (row: AggregatedReportRow) => void;
};

export function AgencyReportDocumentChapterView({
  client,
  visibleFields,
  periodFromLabel,
  periodToLabel,
  onEditDetails,
  onExcludeRow,
}: AgencyReportDocumentChapterViewProps) {
  const showFrom = isReportFieldVisible(visibleFields, "from");
  const showTo = isReportFieldVisible(visibleFields, "to");
  const showProject = isReportFieldVisible(visibleFields, "project");
  const showTask = isReportFieldVisible(visibleFields, "task");
  const showDescription = isReportFieldVisible(visibleFields, "description");
  const showLink = isReportFieldVisible(visibleFields, "link");
  const showDuration = isReportFieldVisible(visibleFields, "duration");
  const showAssignee = isReportFieldVisible(visibleFields, "assignee");
  const clientRowCount = client.rowCount;

  return (
    <section className="space-y-3" aria-labelledby={`report-chapter-${client.clientId}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={`report-chapter-${client.clientId}`}
          className="text-base font-semibold text-highlighted"
        >
          {client.clientName}
        </h2>
        <p className="text-xs text-muted">
          <span className={agencyMetricClass}>{formatDuration(client.totalSeconds, "units")}</span>
          {client.amountLabel ? <span> · {client.amountLabel}</span> : null}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[36rem]">
          <TableCaption className="sr-only">Export document for {client.clientName}</TableCaption>
          <TableHeader className="border-b border-default/50">
            <TableRow>
              {showFrom ? (
                <TableHead scope="col" className="w-24 whitespace-nowrap text-center">
                  {AGENCY_REPORT_FIELD_LABELS.from}
                </TableHead>
              ) : null}
              {showTo ? (
                <TableHead scope="col" className="w-24 whitespace-nowrap text-center">
                  {AGENCY_REPORT_FIELD_LABELS.to}
                </TableHead>
              ) : null}
              {showProject ? (
                <TableHead scope="col" className="w-44">
                  {AGENCY_REPORT_FIELD_LABELS.project}
                </TableHead>
              ) : null}
              {showTask ? (
                <TableHead scope="col" className="min-w-[12rem]">
                  {AGENCY_REPORT_FIELD_LABELS.task}
                </TableHead>
              ) : null}
              {showDescription ? (
                <TableHead scope="col">{AGENCY_REPORT_FIELD_LABELS.description}</TableHead>
              ) : null}
              {showLink ? (
                <TableHead scope="col" className="min-w-[8rem]">
                  {AGENCY_REPORT_FIELD_LABELS.link}
                </TableHead>
              ) : null}
              <TableHead scope="col" className="w-24">
                Waste
              </TableHead>
              {showDuration ? (
                <TableHead scope="col" className="w-28 text-right">
                  {AGENCY_REPORT_FIELD_LABELS.duration}
                </TableHead>
              ) : null}
              {showAssignee ? (
                <TableHead scope="col" className="w-36">
                  {AGENCY_REPORT_FIELD_LABELS.assignee}
                </TableHead>
              ) : null}
              <TableHead scope="col" className="w-10 px-2">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {client.group.projects.flatMap((project, projectIndex) => {
              const stripes = reportSimilarTaskStripeIndexes(project.rows);
              return project.rows.map((row, rowIndex) => {
                const wasteKind = aggregatedWasteKind(row);
                const wasteCounts = aggregatedWasteCounts(row);
                const links = joinedReportRowLinks(row.entries);
                const isFirstClientRow = projectIndex === 0 && rowIndex === 0;
                return (
                  <TableRow
                    key={row.key}
                    className={cn(
                      "group/row cursor-pointer",
                      reportSimilarTaskStripeClass(stripes[rowIndex] ?? 0),
                    )}
                    onClick={() => onEditDetails(row)}
                  >
                    {showFrom && isFirstClientRow ? (
                      <TableCell
                        rowSpan={clientRowCount}
                        className="border-r border-default bg-elevated/40 whitespace-nowrap text-center align-middle text-xs font-medium text-highlighted"
                      >
                        {periodFromLabel}
                      </TableCell>
                    ) : null}
                    {showTo && isFirstClientRow ? (
                      <TableCell
                        rowSpan={clientRowCount}
                        className="border-r border-default bg-elevated/40 whitespace-nowrap text-center align-middle text-xs font-medium text-highlighted"
                      >
                        {periodToLabel}
                      </TableCell>
                    ) : null}
                    {showProject && rowIndex === 0 ? (
                      <TableCell
                        rowSpan={project.rows.length}
                        className="border-r border-default bg-elevated/40 align-top text-sm"
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-highlighted">
                          <AgencyEntityMark
                            name={project.projectName}
                            projectId={project.projectId}
                            iconKey={project.iconKey}
                            colorHueId={project.colorHueId}
                          />
                          <span className="truncate">{project.projectName}</span>
                        </span>
                      </TableCell>
                    ) : null}
                    {showTask ? (
                      <TableCell className="relative min-w-0 text-start text-sm text-highlighted">
                        {showDescription ? (
                          <span aria-hidden className={reportTaskDescriptionSepClass} />
                        ) : null}
                        <span className="block truncate" title={row.taskTitle || undefined}>
                          {row.taskTitle || "—"}
                        </span>
                      </TableCell>
                    ) : null}
                    {showDescription ? (
                      <TableCell className="min-w-0 max-w-md text-start text-sm text-highlighted">
                        <span className="block truncate" title={row.description || undefined}>
                          {row.description || "—"}
                        </span>
                      </TableCell>
                    ) : null}
                    {showLink ? (
                      <TableCell className="min-w-0 max-w-xs truncate text-xs text-highlighted">
                        {links || "—"}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {wasteKind === "all" ? (
                        <AgencyWasteTag />
                      ) : wasteKind === "partial" ? (
                        <AgencyPartialWasteChip
                          wasteCount={wasteCounts.wasteCount}
                          totalCount={wasteCounts.totalCount}
                          onActivate={() => onEditDetails(row)}
                        />
                      ) : null}
                    </TableCell>
                    {showDuration ? (
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="inline-flex min-h-10 w-full items-center justify-end gap-1 font-mono tabular-nums text-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditDetails(row);
                          }}
                        >
                          {formatDuration(row.durationSeconds, "units")}
                          {row.entryCount > 1 ? (
                            <span className="font-sans text-[10px] font-semibold text-dimmed">
                              x{row.entryCount}
                            </span>
                          ) : null}
                        </button>
                      </TableCell>
                    ) : null}
                    {showAssignee ? (
                      <TableCell className="truncate text-sm text-highlighted">
                        {row.userName}
                      </TableCell>
                    ) : null}
                    <TableCell className="px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          onExcludeRow(row);
                        }}
                      >
                        Exclude
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              });
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
