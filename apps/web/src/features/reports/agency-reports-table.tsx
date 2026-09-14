import { useMemo, type ReactNode } from "react";

import { AgencyReportDescriptionCell } from "@/features/reports/cells/agency-report-description-cell";
import { AgencyReportLinkCell } from "@/features/reports/cells/agency-report-link-cell";
import { AgencyReportDurationCell } from "@/features/reports/cells/agency-report-duration-cell";
import { AgencyReportRowActions } from "@/features/reports/agency-report-row-actions";
import { AgencyReportTaskCell } from "@/features/reports/cells/agency-report-task-cell";
import { AgencyReportWasteCell } from "@/features/reports/cells/agency-report-waste-cell";
import { AgencyReportGroupHourStats } from "@/features/reports/agency-report-group-hour-stats";
import {
  metricsForAggregatedRows,
  type ReportHourClient,
} from "@/features/reports/agency-report-hour-metrics";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  isReportFieldVisible,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import {
  groupEntriesForDisplay,
  isReportEntryWaste,
  reportEntryWasteTextClass,
  reportSimilarTaskStripeClass,
  reportSimilarTaskStripeIndexes,
  type AgencyReportEntry,
  type AggregatedReportRow,
  type DisplayClientGroup,
} from "@/features/reports/agency-report-grouping";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";

/** Short dim rule between task ↔ description; not a full cell-height border. */
const reportTaskDescriptionSepClass =
  "pointer-events-none absolute top-1/2 right-0 z-[1] h-4 w-px -translate-y-1/2 bg-border/45";

type AgencyReportsTableProps = {
  teamId: string;
  entries: AgencyReportEntry[];
  clientGroups?: DisplayClientGroup[];
  clients?: readonly ReportHourClient[];
  visibleFields?: AgencyReportFieldId[];
  footer?: ReactNode;
  projects?: Array<Pick<AgencyProject, "id" | "clientId" | "clientName" | "name" | "colorHueId">>;
  tasks?: Array<
    Pick<
      AgencyProjectTask,
      "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees"
    > & {
      dueDate?: string | null;
    }
  >;
  tasksLoading?: boolean;
  updatingRowKeys?: ReadonlySet<string>;
  savedRowKeys?: ReadonlySet<string>;
  deletingEntryIds?: readonly string[];
  wastePendingRowKeys?: ReadonlySet<string>;
  onTaskChange?: (row: AggregatedReportRow, taskId: string) => void;
  onDescriptionChange?: (row: AggregatedReportRow, description: string) => void;
  onLinksChange?: (row: AggregatedReportRow, links: string[]) => void;
  onEditDetails?: (row: AggregatedReportRow) => void;
  onDeleteRow?: (row: AggregatedReportRow) => void;
  onToggleWaste?: (row: AggregatedReportRow) => void;
  onAskOrchWaste?: (row: AggregatedReportRow) => void;
};

export function AgencyReportsTable({
  teamId,
  entries,
  clientGroups: clientGroupsProp,
  clients = [],
  visibleFields = allAgencyReportFieldIds(),
  footer,
  projects = [],
  tasks = [],
  tasksLoading = false,
  updatingRowKeys,
  savedRowKeys,
  deletingEntryIds = [],
  wastePendingRowKeys,
  onTaskChange,
  onDescriptionChange,
  onLinksChange,
  onEditDetails,
  onDeleteRow,
  onToggleWaste,
  onAskOrchWaste,
}: AgencyReportsTableProps) {
  const clientGroups = useMemo(
    () => clientGroupsProp ?? groupEntriesForDisplay(entries),
    [clientGroupsProp, entries],
  );
  const totalSeconds = useMemo(
    () =>
      clientGroupsProp
        ? clientGroups.reduce((sum, group) => sum + group.totalSeconds, 0)
        : entries.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    [clientGroups, clientGroupsProp, entries],
  );
  const showProject = isReportFieldVisible(visibleFields, "project");
  const showTask = isReportFieldVisible(visibleFields, "task");
  const showDescription = isReportFieldVisible(visibleFields, "description");
  const showLink = isReportFieldVisible(visibleFields, "link");
  const showDuration = isReportFieldVisible(visibleFields, "duration");
  const showAssignee = isReportFieldVisible(visibleFields, "assignee");
  const showActions = Boolean(onEditDetails || onDeleteRow || onToggleWaste || onAskOrchWaste);
  const deletingEntryIdSet = new Set(deletingEntryIds);

  return (
    <div className="space-y-6">
      {clientGroups.map((clientGroup) => (
        <section key={clientGroup.clientId} className="space-y-2">
          <div className="space-y-2 px-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-highlighted">{clientGroup.clientName}</h3>
              <p className="text-xs text-muted">
                <span className={agencyMetricClass}>
                  {formatDuration(clientGroup.totalSeconds, "clock")}
                </span>
                {" total"}
              </p>
            </div>
            <AgencyReportGroupHourStats
              metrics={metricsForAggregatedRows(
                clientGroup.projects.flatMap((project) => project.rows),
                clients,
              )}
            />
          </div>
          <div className="overflow-x-auto rounded-dense border border-default/55 bg-default">
            <Table className="min-w-[48rem]">
              <TableCaption className="sr-only">
                Time entries for {clientGroup.clientName}, grouped by project and task
              </TableCaption>
              <TableHeader className="border-b border-default/50">
                <TableRow>
                  {showProject ? (
                    <TableHead scope="col" className="w-44">
                      {AGENCY_REPORT_FIELD_LABELS.project}
                    </TableHead>
                  ) : null}
                  {showTask ? (
                    <TableHead scope="col" className="min-w-[14rem] w-[22%]">
                      {AGENCY_REPORT_FIELD_LABELS.task}
                    </TableHead>
                  ) : null}
                  {showDescription ? (
                    <TableHead scope="col">{AGENCY_REPORT_FIELD_LABELS.description}</TableHead>
                  ) : null}
                  {showLink ? (
                    <TableHead scope="col" className="min-w-[10rem]">
                      {AGENCY_REPORT_FIELD_LABELS.link}
                    </TableHead>
                  ) : null}
                  <TableHead scope="col" className="w-20">
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
                  {showActions ? (
                    <TableHead scope="col" className="w-10 px-2">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientGroup.projects.flatMap((project) => {
                  const taskStripes = reportSimilarTaskStripeIndexes(project.rows);
                  return project.rows.map((row, rowIndex) => {
                    const isWaste = isReportEntryWaste(row);
                    return (
                      <TableRow
                        key={row.key}
                        className={cn(
                          "group/row border-b border-default last:border-b-0",
                          reportSimilarTaskStripeClass(taskStripes[rowIndex] ?? 0),
                        )}
                      >
                        {showProject && rowIndex === 0 ? (
                          <TableCell
                            rowSpan={project.rows.length}
                            className="border-r border-default bg-elevated/40 align-top text-sm"
                          >
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold text-highlighted">
                                {project.projectName}
                              </span>
                              <AgencyReportGroupHourStats
                                showTotal
                                showLabels={false}
                                metrics={metricsForAggregatedRows(project.rows, clients)}
                              />
                            </div>
                          </TableCell>
                        ) : null}
                        {showTask ? (
                          <TableCell
                            className={cn(
                              "relative min-w-0 text-start text-sm text-highlighted",
                              isWaste && reportEntryWasteTextClass,
                            )}
                          >
                            {showDescription ? (
                              <span aria-hidden className={reportTaskDescriptionSepClass} />
                            ) : null}
                            {onTaskChange ? (
                              <AgencyReportTaskCell
                                teamId={teamId}
                                row={row}
                                projects={projects}
                                tasks={tasks}
                                loading={tasksLoading}
                                disabled={updatingRowKeys?.has(row.key)}
                                onTaskChange={(taskId) => onTaskChange(row, taskId)}
                              />
                            ) : (
                              <span
                                className="block truncate text-start"
                                title={row.taskTitle || undefined}
                              >
                                {row.taskTitle || "—"}
                              </span>
                            )}
                          </TableCell>
                        ) : null}
                        {showDescription ? (
                          <TableCell
                            className={cn(
                              "min-w-0 max-w-md text-start text-sm text-highlighted",
                              isWaste && reportEntryWasteTextClass,
                            )}
                          >
                            {onDescriptionChange ? (
                              <AgencyReportDescriptionCell
                                value={row.description}
                                disabled={updatingRowKeys?.has(row.key)}
                                onSave={(description) => onDescriptionChange(row, description)}
                              />
                            ) : (
                              <span
                                className="block truncate text-start"
                                title={row.description || undefined}
                              >
                                {row.description || "—"}
                              </span>
                            )}
                          </TableCell>
                        ) : null}
                        {showLink ? (
                          <TableCell className="min-w-0 max-w-xs text-sm text-highlighted">
                            {onLinksChange ? (
                              <AgencyReportLinkCell
                                links={row.links}
                                disabled={updatingRowKeys?.has(row.key)}
                                readOnly={row.entryCount > 1}
                                onSave={(links) => onLinksChange(row, links)}
                              />
                            ) : (
                              <span
                                className="block truncate text-start"
                                title={row.links.map((link) => link.url).join(" · ") || undefined}
                              >
                                {row.links.map((link) => link.url).join(" · ") || "—"}
                              </span>
                            )}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <AgencyReportWasteCell
                            isWaste={isWaste}
                            entryCount={row.entryCount}
                            onToggle={onToggleWaste ? () => onToggleWaste(row) : undefined}
                          />
                        </TableCell>
                        {showDuration ? (
                          <TableCell
                            className={cn(
                              "text-right text-sm text-muted",
                              isWaste && reportEntryWasteTextClass,
                            )}
                          >
                            <AgencyReportDurationCell
                              row={row}
                              onEditDetails={
                                onEditDetails && row.entries.length > 0
                                  ? () => onEditDetails(row)
                                  : undefined
                              }
                            />
                          </TableCell>
                        ) : null}
                        {showAssignee ? (
                          <TableCell
                            className={cn(
                              "text-sm text-highlighted",
                              isWaste && reportEntryWasteTextClass,
                            )}
                          >
                            {row.userName}
                          </TableCell>
                        ) : null}
                        {showActions ? (
                          <TableCell className="px-2 text-right">
                            <AgencyReportRowActions
                              label={row.taskTitle || row.description || row.projectName}
                              entryCount={row.entryCount}
                              taskId={row.taskId}
                              isWaste={isReportEntryWaste(row)}
                              deleting={row.entries.some((entry) =>
                                deletingEntryIdSet.has(entry.id),
                              )}
                              wastePending={wastePendingRowKeys?.has(row.key)}
                              saving={updatingRowKeys?.has(row.key)}
                              justSaved={savedRowKeys?.has(row.key)}
                              onEditDetails={
                                onEditDetails && row.entries.length > 0
                                  ? () => onEditDetails(row)
                                  : undefined
                              }
                              onDelete={() => onDeleteRow?.(row)}
                              onToggleWaste={onToggleWaste ? () => onToggleWaste(row) : undefined}
                              onAskOrchWaste={
                                onAskOrchWaste && row.entryCount === 1
                                  ? () => onAskOrchWaste(row)
                                  : undefined
                              }
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}

      {footer === undefined ? (
        <p className="text-xs text-muted">
          <span className={agencyMetricClass}>{entries.length}</span>
          {entries.length === 1 ? " entry" : " entries"}
          <span aria-hidden="true"> · </span>
          <span className={agencyMetricClass}>{formatDuration(totalSeconds, "clock")}</span>
          {" total"}
        </p>
      ) : (
        footer
      )}
    </div>
  );
}
