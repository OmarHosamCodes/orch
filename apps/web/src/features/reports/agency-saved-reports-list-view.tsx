import { SurfaceShimmer } from "@/ui/skeleton";
import {
  formatRelativeReportTime,
  type SavedReportListItem,
} from "@/features/reports/agency-report-naming";
import {
  AgencyPickerEmpty,
  AgencyPickerRow,
  AgencyPickerSearch,
} from "@/features/shared/pickers/agency-picker-shell";
import { cn } from "@/lib/utils";
import type { SavedReportsListBodyViewModel } from "./hooks/use-agency-saved-reports-list";

export type SavedReportsListBodyViewProps = {
  items: SavedReportListItem[];
  onSelect: (reportId: string) => void;
  activeReportId?: string | null;
  searchable?: boolean;
  compact?: boolean;
  vm: SavedReportsListBodyViewModel;
};

export function SavedReportsListBodyView({
  items,
  onSelect,
  activeReportId = null,
  searchable = true,
  compact = false,
  vm,
}: SavedReportsListBodyViewProps) {
  if (items.length === 0) {
    return (
      <AgencyPickerEmpty>No saved reports yet. Save this recipe to reopen it later.</AgencyPickerEmpty>
    );
  }

  return (
    <>
      {searchable ? (
        <AgencyPickerSearch
          value={vm.searchTerm}
          onChange={vm.setSearchTerm}
          placeholder="Search reports…"
        />
      ) : null}
      <div className={cn("overflow-y-auto p-1", compact ? "max-h-60" : "max-h-72")}>
        {vm.filtered.length === 0 ? (
          <AgencyPickerEmpty>No reports match that search.</AgencyPickerEmpty>
        ) : (
          vm.grouped.map((section) => (
            <div key={section.group.key} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted">
                {section.group.label}
              </p>
              {section.items.map((item) => (
                <AgencyPickerRow
                  key={item.id}
                  label={item.name}
                  query={vm.searchTerm}
                  description={`${item.createdByUserName} · edited ${formatRelativeReportTime(item.updatedAt)}`}
                  selected={item.id === activeReportId}
                  onSelect={() => onSelect(item.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}

export function SavedReportsListSkeletonView() {
  return <SurfaceShimmer className="min-h-40 m-2" label="Loading saved reports" />;
}
