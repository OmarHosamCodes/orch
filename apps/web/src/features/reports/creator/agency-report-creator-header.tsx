import { ArrowLeft, ChevronDown, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  formatRelativeReportTime,
  formatReportHeaderMeta,
  type AgencyReportHeaderLabelContext,
} from "@/features/reports/agency-report-naming";
import type { AgencyReportExportMode } from "@/features/reports/export-agency-report-xlsx";
import type { AgencyReportAutosaveState } from "@/features/reports/use-agency-report-autosave";
import {
  AgencyReportViewOptions,
  type AgencyReportViewOptionsProps,
} from "@/features/reports/agency-report-view-options";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type ReportSaveStatusProps = {
  state: AgencyReportAutosaveState;
  lastSavedAt: Date | null;
  onRetry: () => void;
};

function ReportSaveStatus({ state, lastSavedAt, onRetry }: ReportSaveStatusProps) {
  if (state === "saving" || state === "pending") {
    return <span className="font-mono text-[11px] text-muted">Saving…</span>;
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-error">
        Couldn't save
        <span aria-hidden className="text-error/60">
          ·
        </span>
        <Button variant="link" size="sm" className="h-auto px-0 py-0 text-[11px]" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }
  if (state === "saved" && lastSavedAt) {
    return (
      <span className="font-mono text-[11px] text-muted">
        Saved · {formatRelativeReportTime(lastSavedAt.toISOString())}
      </span>
    );
  }
  return null;
}

type ReportTitleEditorProps = {
  value: string;
  fallbackName: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
};

function ReportTitleEditor({ value, fallbackName, onChange, onCommit }: ReportTitleEditorProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (!trimmed) {
      onChange(fallbackName);
      onCommit(fallbackName);
      return;
    }
    onChange(trimmed);
    onCommit(trimmed);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            onChange(fallbackName);
            setEditing(false);
          }
        }}
        aria-label="Report name"
        className="h-9 max-w-md rounded-dense border-default bg-default px-2 text-base font-semibold"
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        className={cn(
          "min-w-0 truncate text-left text-base font-semibold text-highlighted hover:underline",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        onClick={() => setEditing(true)}
        title="Rename"
      >
        {value || fallbackName}
      </button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 shrink-0 p-0", agencyFocusRingClass)}
        aria-label="Rename report"
        title="Rename"
        onClick={() => setEditing(true)}
      >
        <Pencil className="size-3.5" />
      </Button>
    </div>
  );
}

type ReportHeaderMetaProps = {
  scopeLine: string;
  attributionLine: string;
  saveState: AgencyReportAutosaveState;
  lastSavedAt: Date | null;
  onRetrySave: () => void;
};

function ReportHeaderMeta({
  scopeLine,
  attributionLine,
  saveState,
  lastSavedAt,
  onRetrySave,
}: ReportHeaderMetaProps) {
  const saveStatus = (
    <ReportSaveStatus state={saveState} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />
  );

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted">{scopeLine}</p>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
        <span>{attributionLine}</span>
        {saveStatus ? (
          <>
            <span aria-hidden className="text-muted/60">
              ·
            </span>
            {saveStatus}
          </>
        ) : null}
      </p>
    </div>
  );
}

type ReportHeaderActionsProps = {
  canUndo: boolean;
  onUndo: () => void;
  exportPhase: "idle" | "exporting" | "exported";
  exportDisabled: boolean;
  onExport: (mode: AgencyReportExportMode) => void;
  viewOptions: AgencyReportViewOptionsProps;
  activityMenu: ReactNode;
  deleteDisabled: boolean;
  deletingReport: boolean;
  onRequestDelete: () => void;
};

function ReportHeaderActions({
  canUndo,
  onUndo,
  exportPhase,
  exportDisabled,
  onExport,
  viewOptions,
  activityMenu,
  deleteDisabled,
  deletingReport,
  onRequestDelete,
}: ReportHeaderActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const exporting = exportPhase === "exporting";
  const exported = exportPhase === "exported";

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 pl-10 sm:pl-0">
      {canUndo ? (
        <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs" onClick={onUndo}>
          Undo
        </Button>
      ) : null}
      {activityMenu}
      <AgencyReportViewOptions {...viewOptions} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5"
            disabled={exportDisabled || exporting}
            title="Download Excel for Google Sheets"
          >
            {exporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                Exporting…
              </>
            ) : exported ? (
              "Exported"
            ) : (
              <>
                Export
                <ChevronDown className="size-3.5 opacity-70" aria-hidden />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-1">
          <DropdownMenuItem
            disabled={exportDisabled || exporting}
            onSelect={() => onExport("combined")}
          >
            Export
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={exportDisabled || exporting}
            onSelect={() => onExport("per-client")}
          >
            Export per client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-9 w-9 p-0", agencyFocusRingClass)}
            aria-label="Report options"
            disabled={deletingReport}
          >
            {deletingReport ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-error"
            disabled={deleteDisabled || deletingReport}
            onClick={() => {
              setMenuOpen(false);
              onRequestDelete();
            }}
          >
            <Trash2 className="size-3.5" />
            Delete report
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type AgencyReportCreatorHeaderProps = {
  onBack: () => void;
  reportName: string;
  fallbackName: string;
  onReportNameChange: (name: string) => void;
  onRenameCommitted: (name: string) => void;
  report: {
    rangeFrom: string;
    rangeTo: string;
    clientId: string;
    projectId: string;
    memberUserId: string;
    createdByUserName: string;
  };
  labelContext: AgencyReportHeaderLabelContext;
  visibleEntryCount: number;
  canUndo: boolean;
  onUndo: () => void;
  autosaveState: AgencyReportAutosaveState;
  lastSavedAt: Date | null;
  onRetrySave: () => void;
  exportPhase: "idle" | "exporting" | "exported";
  onExport: (mode: AgencyReportExportMode) => void;
  viewOptions: AgencyReportViewOptionsProps;
  activityMenu: ReactNode;
  deletingReport: boolean;
  onDeleteReport: () => void;
};

export function AgencyReportCreatorHeader({
  onBack,
  reportName,
  fallbackName,
  onReportNameChange,
  onRenameCommitted,
  report,
  labelContext,
  visibleEntryCount,
  canUndo,
  onUndo,
  autosaveState,
  lastSavedAt,
  onRetrySave,
  exportPhase,
  onExport,
  viewOptions,
  activityMenu,
  deletingReport,
  onDeleteReport,
}: AgencyReportCreatorHeaderProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const autosaveBusy = autosaveState === "pending" || autosaveState === "saving";
  const deleteDisabled = autosaveBusy || deletingReport;

  const meta = useMemo(
    () =>
      formatReportHeaderMeta(
        {
          rangeFrom: report.rangeFrom,
          rangeTo: report.rangeTo,
          clientId: report.clientId || undefined,
          projectId: report.projectId || undefined,
          memberUserId: report.memberUserId || undefined,
          createdByUserName: report.createdByUserName,
          visibleEntryCount,
        },
        labelContext,
      ),
    [labelContext, report, visibleEntryCount],
  );

  return (
    <>
      <header className="rounded-surface border border-default bg-card p-surface">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 px-2"
              onClick={onBack}
              aria-label="Back to reports"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <ReportTitleEditor
                value={reportName}
                fallbackName={fallbackName}
                onChange={onReportNameChange}
                onCommit={onRenameCommitted}
              />
              <ReportHeaderMeta
                scopeLine={meta.scopeLine}
                attributionLine={meta.attributionLine}
                saveState={autosaveState}
                lastSavedAt={lastSavedAt}
                onRetrySave={onRetrySave}
              />
            </div>
          </div>
          <ReportHeaderActions
            canUndo={canUndo}
            onUndo={onUndo}
            exportPhase={exportPhase}
            exportDisabled={visibleEntryCount === 0}
            onExport={onExport}
            viewOptions={viewOptions}
            activityMenu={activityMenu}
            deleteDisabled={deleteDisabled}
            deletingReport={deletingReport}
            onRequestDelete={() => setConfirmDeleteOpen(true)}
          />
        </div>
      </header>

      <Dialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          if (deletingReport) return;
          setConfirmDeleteOpen(open);
        }}
      >
        <DialogContent className="max-w-md" showCloseButton={!deletingReport}>
          <DialogHeader>
            <DialogTitle>Delete this report?</DialogTitle>
            <DialogDescription>
              Removes “{reportName || fallbackName}”. Time entries stay in Tracker.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={deletingReport}
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteDisabled}
              onClick={() => {
                onDeleteReport();
                setConfirmDeleteOpen(false);
              }}
            >
              {deletingReport ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  Deleting…
                </>
              ) : (
                "Delete report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
