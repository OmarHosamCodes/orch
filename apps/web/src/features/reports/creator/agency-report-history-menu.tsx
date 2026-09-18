import { FileText } from "lucide-react";
import { useState } from "react";
import { useParams } from "@/lib/navigation";

import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  SavedReportsListBody,
  SavedReportsListSkeleton,
  useSavedReportsList,
} from "@/features/reports/agency-saved-reports-list";
import type { SavedReportSearchContext } from "@/features/reports/agency-report-naming";

type AgencyReportHistoryMenuProps = {
  teamId: string;
  searchContext: SavedReportSearchContext;
  onSelectReport: (reportId: string) => void;
};

export function AgencyReportHistoryMenu({
  teamId,
  searchContext,
  onSelectReport,
}: AgencyReportHistoryMenuProps) {
  const [open, setOpen] = useState(false);
  const activeReportId = useParams<{ reportId?: string }>().reportId ?? null;
  const reportsQuery = useSavedReportsList({ teamId, enabled: Boolean(teamId) });
  const savedCount = reportsQuery.data?.items.length;

  function handleSelect(reportId: string) {
    onSelectReport(reportId);
    setOpen(false);
  }

  const triggerLabel =
    typeof savedCount === "number" ? `Saved reports (${savedCount})` : "Saved reports";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" aria-label={triggerLabel} title={triggerLabel}>
          <FileText className="size-3.5" aria-hidden />
          Saved reports
          {typeof savedCount === "number" ? (
            <span className="font-mono tabular-nums text-muted">{savedCount}</span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" size="chooser">
        <div className="border-b border-default/55 px-3 py-2.5">
          <p className="text-sm font-semibold text-highlighted">Saved reports</p>
          <p className="text-xs text-muted">Open a report you saved.</p>
        </div>
        {reportsQuery.isPending ? (
          <SavedReportsListSkeleton />
        ) : reportsQuery.isError ? (
          <p className="px-3 py-4 text-center text-xs text-muted">Couldn't load reports.</p>
        ) : (
          <SavedReportsListBody
            items={reportsQuery.data?.items ?? []}
            searchContext={searchContext}
            activeReportId={activeReportId}
            onSelect={handleSelect}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
