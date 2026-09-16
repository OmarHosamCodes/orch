import { Input } from "@/ui/input";
import { SurfaceShimmer } from "@/ui/skeleton";
import {
  formatRelativeReportTime,
  type SavedReportListItem,
} from "@/features/reports/agency-report-naming";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import type { SavedReportsListBodyViewModel } from "./hooks/use-agency-saved-reports-list";

const reportItemClass = cn(
  "flex w-full flex-col gap-0.5 rounded-dense px-2 py-2 text-left transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

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
      <p className="px-2 py-4 text-center text-xs text-muted">
        No saved reports yet. Save this recipe to reopen it later.
      </p>
    );
  }

  return (
    <>
      {searchable ? (
        <div className="border-b border-default/55 p-2">
          <Input
            value={vm.searchTerm}
            onChange={(event) => vm.setSearchTerm(event.target.value)}
            placeholder="Search reports…"
            className="h-8 rounded-dense border-default bg-default text-xs"
          />
        </div>
      ) : null}
      <div className={cn("overflow-y-auto p-1", compact ? "max-h-60" : "max-h-72")}>
        {vm.filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted">No reports match that search.</p>
        ) : (
          vm.grouped.map((section) => (
            <div key={section.group.key} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted">
                {section.group.label}
              </p>
              {section.items.map((item) => {
                const selected = item.id === activeReportId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      reportItemClass,
                      "duration-150 active:scale-[0.99] motion-reduce:active:scale-100",
                      selected && "bg-primary/10 text-primary hover:bg-primary/10",
                    )}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelect(item.id)}
                  >
                    <span
                      className={cn(
                        "truncate text-xs font-semibold",
                        selected ? "text-primary" : "text-highlighted",
                      )}
                    >
                      {item.name}
                    </span>
                    <span className="text-[11px] text-muted">
                      {item.createdByUserName} · edited {formatRelativeReportTime(item.updatedAt)}
                    </span>
                  </button>
                );
              })}
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
