import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { AgencyReportDurationCell } from "@/features/reports/cells/agency-report-duration-cell";
import { AgencyReportWasteCell } from "@/features/reports/cells/agency-report-waste-cell";
import { AgencyReportEntryContextMenu } from "@/features/reports/agency-report-entry-context-menu";
import { AgencyReportCreatorRowActions } from "@/features/reports/creator/agency-report-creator-row-actions";
import { Input } from "@/ui/input";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/features/time-tracking/agency-time-entry";
import type { AgencyReportCreatorState } from "@/features/reports/use-agency-report-creator";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  isReportFieldVisible,
  isReportCreatorSelectionHighlightField,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { AgencyReportGroupHourStats } from "@/features/reports/agency-report-group-hour-stats";
import {
  metricsForAggregatedRows,
  type ReportHourClient,
  type ReportHourMetrics,
} from "@/features/reports/agency-report-hour-metrics";
import { formatReportPeriodDayMonth } from "@/features/reports/agency-report-naming";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import {
  groupEntriesForDisplay,
  isReportEntryWaste,
  reportEntryWasteTextClass,
  reportSimilarTaskStripeClass,
  reportSimilarTaskStripeIndexes,
  type AggregatedReportRow,
} from "@/features/reports/agency-report-grouping";
import { DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES } from "@/features/reports/agency-report-merge-tasks";
import { applyDurationToDraft, entryToDraft } from "@/features/time-tracking/time-entry-draft";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import { Table, TableCaption, TableHead, TableHeader, TableRow } from "@/ui/table";

const reportCreatorSelectedCellClass = "bg-primary/8 ring-1 ring-inset ring-primary/20";
const reportPeriodCellClass =
  "border-r border-default bg-success/10 px-3 py-3 text-center align-middle text-sm font-semibold text-highlighted";

/** Short dim rule between task ↔ description; not a full cell-height border. */
const reportTaskDescriptionSepClass =
  "pointer-events-none absolute top-1/2 right-0 z-[1] h-4 w-px -translate-y-1/2 bg-border/45";

function reportCreatorCellSelectionClass(
  isSelected: boolean,
  field: AgencyReportFieldId,
): string | false {
  return isSelected && isReportCreatorSelectionHighlightField(field)
    ? reportCreatorSelectedCellClass
    : false;
}

type AgencyReportCreatorTableProps = {
  creator: AgencyReportCreatorState;
  clients?: readonly ReportHourClient[];
  visibleFields?: AgencyReportFieldId[];
  mergeSameTaskNames?: boolean;
  rangeFrom?: string;
  rangeTo?: string;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onExcludeEntry: (entryId: string) => void;
  onToggleWaste: (entryIds: string[]) => void;
  savingEntryId?: string | null;
  wastePending?: boolean;
};

export function AgencyReportCreatorTable({
  creator,
  clients = [],
  visibleFields = allAgencyReportFieldIds(),
  mergeSameTaskNames = DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES,
  rangeFrom,
  rangeTo,
  onSaveEdit,
  onExcludeEntry,
  onToggleWaste,
  savingEntryId = null,
  wastePending = false,
}: AgencyReportCreatorTableProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const clientGroups = groupEntriesForDisplay(creator.visibleEntries, { mergeSameTaskNames });
  const showFrom = isReportFieldVisible(visibleFields, "from") && Boolean(rangeFrom);
  const showTo = isReportFieldVisible(visibleFields, "to") && Boolean(rangeTo);
  const showProject = isReportFieldVisible(visibleFields, "project");
  const showTask = isReportFieldVisible(visibleFields, "task");
  const showDescription = isReportFieldVisible(visibleFields, "description");
  const showLink = isReportFieldVisible(visibleFields, "link");
  const showDuration = isReportFieldVisible(visibleFields, "duration");
  const showAssignee = isReportFieldVisible(visibleFields, "assignee");
  const periodFromLabel = rangeFrom ? formatReportPeriodDayMonth(rangeFrom) : "";
  const periodToLabel = rangeTo ? formatReportPeriodDayMonth(rangeTo) : "";

  return (
    <div className="space-y-6">
      {clientGroups.map((clientGroup) => {
        const clientRowCount = clientGroup.projects.reduce(
          (sum, project) => sum + project.rows.length,
          0,
        );

        return (
          <section key={clientGroup.clientId} className="space-y-2">
            <div className="space-y-2 px-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-highlighted">
                  {clientGroup.clientName}
                </h3>
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
            <div className="overflow-x-auto rounded-surface border border-default/55 bg-default">
              <Table className="min-w-[40rem]">
                <TableCaption className="sr-only">
                  Time entries for {clientGroup.clientName}, grouped by project and task
                </TableCaption>
                <TableHeader className="border-b border-default/50">
                  <TableRow>
                    {showFrom ? (
                      <TableHead scope="col" className="w-20 text-center">
                        {AGENCY_REPORT_FIELD_LABELS.from}
                      </TableHead>
                    ) : null}
                    {showTo ? (
                      <TableHead scope="col" className="w-20 text-center">
                        {AGENCY_REPORT_FIELD_LABELS.to}
                      </TableHead>
                    ) : null}
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
                    <TableHead scope="col" className="w-10 px-2">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody layout={!prefersReducedMotion}>
                  <AnimatePresence initial={false}>
                    {(() => {
                      const flatRows = clientGroup.projects.flatMap((project) => {
                        const taskStripes = reportSimilarTaskStripeIndexes(project.rows);
                        const projectHourMetrics = metricsForAggregatedRows(project.rows, clients);
                        return project.rows.map((row, rowIndex) => ({
                          row,
                          rowIndex,
                          projectRowSpan: project.rows.length,
                          similarTaskStripe: (taskStripes[rowIndex] ?? 0) as 0 | 1,
                          projectHourMetrics,
                        }));
                      });

                      return flatRows.map((item, clientRowIndex) => {
                        const {
                          row,
                          rowIndex,
                          projectRowSpan,
                          similarTaskStripe,
                          projectHourMetrics,
                        } = item;
                        const activeEntryId =
                          creator.editingEntryId &&
                          row.entries.some((entry) => entry.id === creator.editingEntryId)
                            ? creator.editingEntryId
                            : creator.selectedEntryId &&
                                row.entries.some((entry) => entry.id === creator.selectedEntryId)
                              ? creator.selectedEntryId
                              : null;
                        const primaryEntryId = [...row.entries].sort(
                          (left, right) =>
                            new Date(right.startedAt).getTime() -
                            new Date(left.startedAt).getTime(),
                        )[0]?.id;

                        return (
                          <ReportCreatorRow
                            key={row.key}
                            row={row}
                            rowIndex={rowIndex}
                            clientRowIndex={clientRowIndex}
                            projectRowSpan={projectRowSpan}
                            clientRowSpan={clientRowCount}
                            showFrom={showFrom}
                            showTo={showTo}
                            periodFromLabel={periodFromLabel}
                            periodToLabel={periodToLabel}
                            showProject={showProject}
                            showTask={showTask}
                            showDescription={showDescription}
                            showLink={showLink}
                            showDuration={showDuration}
                            showAssignee={showAssignee}
                            activeEntryId={activeEntryId}
                            primaryEntryId={primaryEntryId ?? row.entries[0]?.id ?? ""}
                            isSelected={row.entries.some(
                              (entry) => entry.id === creator.selectedEntryId,
                            )}
                            isEditing={Boolean(
                              creator.editingEntryId &&
                              row.entries.some((entry) => entry.id === creator.editingEntryId),
                            )}
                            isSaving={Boolean(activeEntryId && savingEntryId === activeEntryId)}
                            prefersReducedMotion={prefersReducedMotion}
                            wastePending={wastePending}
                            similarTaskStripe={similarTaskStripe}
                            projectHourMetrics={projectHourMetrics}
                            onSelectEntry={creator.selectEntry}
                            onEdit={(entryId) => creator.startEditing(entryId)}
                            onRemove={onExcludeEntry}
                            onToggleWaste={onToggleWaste}
                            onCancelEdit={creator.cancelEditing}
                            onSaveEdit={(draft) => {
                              if (!activeEntryId) return Promise.resolve();
                              return onSaveEdit(activeEntryId, draft);
                            }}
                          />
                        );
                      });
                    })()}
                  </AnimatePresence>
                </motion.tbody>
              </Table>
            </div>
          </section>
        );
      })}

      <p className="text-xs text-muted">
        Edit or remove from the row menu. Entries stay in Tracker.
      </p>
    </div>
  );
}

type ReportCreatorRowProps = {
  row: AggregatedReportRow;
  rowIndex: number;
  clientRowIndex: number;
  projectRowSpan: number;
  clientRowSpan: number;
  showFrom: boolean;
  showTo: boolean;
  periodFromLabel: string;
  periodToLabel: string;
  showProject: boolean;
  showTask: boolean;
  showDescription: boolean;
  showLink: boolean;
  showDuration: boolean;
  showAssignee: boolean;
  activeEntryId: string | null;
  primaryEntryId: string;
  isSelected: boolean;
  isEditing: boolean;
  isSaving: boolean;
  prefersReducedMotion: boolean;
  wastePending: boolean;
  similarTaskStripe: 0 | 1;
  projectHourMetrics: ReportHourMetrics;
  onSelectEntry: (entryId: string) => void;
  onEdit: (entryId: string) => void;
  onRemove: (entryId: string) => void;
  onToggleWaste: (entryIds: string[]) => void;
  onCancelEdit: () => void;
  onSaveEdit: (draft: TimeEntryDraft) => Promise<void>;
};

function ReportCreatorRow({
  row,
  rowIndex,
  clientRowIndex,
  projectRowSpan,
  clientRowSpan,
  showFrom,
  showTo,
  periodFromLabel,
  periodToLabel,
  showProject,
  showTask,
  showDescription,
  showLink,
  showDuration,
  showAssignee,
  activeEntryId,
  primaryEntryId,
  isSelected,
  isEditing,
  isSaving,
  prefersReducedMotion,
  wastePending,
  similarTaskStripe,
  projectHourMetrics,
  onSelectEntry,
  onEdit,
  onRemove,
  onToggleWaste,
  onCancelEdit,
  onSaveEdit,
}: ReportCreatorRowProps) {
  const editingEntry =
    row.entries.find((entry) => entry.id === activeEntryId) ??
    row.entries.find((entry) => entry.id === primaryEntryId) ??
    row.entries[0]!;
  const [draft, setDraft] = useState<TimeEntryDraft>(() => entryToDraft(editingEntry));
  const [editError, setEditError] = useState<string | null>(null);
  const rowLabel = row.taskTitle || row.description || row.projectName;

  useEffect(() => {
    if (isEditing) {
      setDraft(entryToDraft(editingEntry));
      setEditError(null);
    }
  }, [isEditing, editingEntry]);

  async function saveDraft() {
    const validationError = validateTimeEntryDraft(draft, { requireTask: false });
    if (validationError) {
      setEditError(validationError);
      return;
    }
    const range = draftToIsoRange(draft);
    if ("error" in range) {
      setEditError(range.error);
      return;
    }
    setEditError(null);
    await onSaveEdit(draft);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveDraft();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit();
    }
  }

  const isWaste = isReportEntryWaste(row);
  const rowEntryIds = row.entries.map((entry) => entry.id);
  const rowElement = (
    <motion.tr
      layout={!prefersReducedMotion}
      initial={false}
      data-report-creator-row
      exit={
        prefersReducedMotion ? undefined : { opacity: 0, height: 0, transition: { duration: 0.2 } }
      }
      className={cn(
        "group/row border-b border-default transition-colors duration-150 last:border-b-0",
        reportSimilarTaskStripeClass(similarTaskStripe),
      )}
    >
      {showFrom && clientRowIndex === 0 ? (
        <td rowSpan={clientRowSpan} className={reportPeriodCellClass}>
          {periodFromLabel}
        </td>
      ) : null}
      {showTo && clientRowIndex === 0 ? (
        <td rowSpan={clientRowSpan} className={reportPeriodCellClass}>
          {periodToLabel}
        </td>
      ) : null}
      {showProject && rowIndex === 0 ? (
        <td
          rowSpan={projectRowSpan}
          className="border-r border-default bg-elevated/40 px-4 py-3 align-top text-sm"
        >
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-highlighted">{row.projectName}</span>
            <AgencyReportGroupHourStats showTotal showLabels={false} metrics={projectHourMetrics} />
          </div>
        </td>
      ) : null}
      {showTask ? (
        <td
          className={cn(
            "relative min-w-0 px-4 py-3 text-start text-sm text-highlighted",
            reportCreatorCellSelectionClass(isSelected, "task"),
            isWaste && reportEntryWasteTextClass,
          )}
          title={row.taskTitle || undefined}
        >
          {showDescription ? <span aria-hidden className={reportTaskDescriptionSepClass} /> : null}
          <span className="block truncate text-start">{row.taskTitle || "—"}</span>
        </td>
      ) : null}
      {showDescription ? (
        <td
          className={cn(
            "min-w-0 max-w-md px-4 py-3 text-start text-sm",
            reportCreatorCellSelectionClass(isSelected, "description"),
            isWaste && !isEditing && reportEntryWasteTextClass,
          )}
        >
          {isEditing ? (
            <Input
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              dir="auto"
              className="h-7 rounded-dense text-start text-xs"
              aria-label="Description"
              autoFocus
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <span
              className="block whitespace-normal break-words text-start text-highlighted"
              title={row.description || undefined}
            >
              {row.description || "—"}
            </span>
          )}
        </td>
      ) : null}
      {showLink ? (
        <td
          className={cn(
            "min-w-0 max-w-xs px-4 py-3 text-start text-sm text-highlighted",
            reportCreatorCellSelectionClass(isSelected, "link"),
          )}
        >
          <span
            className="block truncate text-start"
            title={row.links.map((link) => link.url).join(" · ") || undefined}
          >
            {row.links.map((link) => link.url).join(" · ") || "—"}
          </span>
        </td>
      ) : null}
      <td className="px-4 py-3">
        <AgencyReportWasteCell
          isWaste={isWaste}
          entryCount={row.entryCount}
          disabled={isEditing || isSaving}
          onToggle={() => onToggleWaste(rowEntryIds)}
        />
      </td>
      {showDuration ? (
        <td
          className={cn(
            "px-4 py-3 text-right text-muted",
            reportCreatorCellSelectionClass(isSelected, "duration"),
            isWaste && !isEditing && reportEntryWasteTextClass,
          )}
        >
          {isEditing ? (
            <>
              <Input
                value={draft.durationInput}
                onChange={(event) =>
                  setDraft((current) => applyDurationToDraft(current, event.target.value))
                }
                onBlur={() => void saveDraft()}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className="h-7 rounded-dense text-right font-mono text-xs tabular-nums"
                aria-label="Duration"
                onClick={(event) => event.stopPropagation()}
              />
              {editError ? <p className="mt-1 text-[10px] text-error">{editError}</p> : null}
            </>
          ) : (
            <AgencyReportDurationCell row={row} />
          )}
        </td>
      ) : null}
      {showAssignee ? (
        <td
          className={cn(
            "px-4 py-3 text-highlighted",
            reportCreatorCellSelectionClass(isSelected, "assignee"),
            isWaste && reportEntryWasteTextClass,
          )}
        >
          {row.userName}
        </td>
      ) : null}
      <td className="px-2 py-3 text-right">
        <AgencyReportCreatorRowActions
          label={rowLabel}
          taskId={row.taskId}
          isWaste={isWaste}
          disabled={isEditing || isSaving}
          wastePending={wastePending}
          onEdit={() => onEdit(primaryEntryId)}
          onRemove={() => onRemove(primaryEntryId)}
          onToggleWaste={() => onToggleWaste(rowEntryIds)}
        />
      </td>
    </motion.tr>
  );

  return (
    <AgencyReportEntryContextMenu
      entryId={primaryEntryId}
      taskTitle={row.taskTitle}
      durationSeconds={row.durationSeconds}
      taskId={row.taskId}
      taskIsWaste={isWaste}
      disabled={isEditing || isSaving}
      wastePending={wastePending}
      onSelectEntry={onSelectEntry}
      onEdit={() => onEdit(primaryEntryId)}
      onRemove={() => onRemove(primaryEntryId)}
      onToggleWaste={() => onToggleWaste(rowEntryIds)}
    >
      {rowElement}
    </AgencyReportEntryContextMenu>
  );
}
