import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { agencyTimeWeekFooterClass } from "@/features/shared/agency-ui";

type AgencyWorkSurfacePaginationFooterProps = {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
};

export function AgencyWorkSurfacePaginationFooter({
  rangeStart,
  rangeEnd,
  total,
  previousDisabled = true,
  nextDisabled = false,
  onPrevious,
  onNext,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: AgencyWorkSurfacePaginationFooterProps) {
  if (total === 0) return null;

  return (
    <div className={agencyTimeWeekFooterClass}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={previousDisabled}
          aria-label="Previous page"
          onClick={onPrevious}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-mono text-xs tabular-nums text-muted">
          {rangeStart}-{rangeEnd} of {total}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={nextDisabled}
          aria-label="Next page"
          onClick={onNext}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {pageSize !== undefined && pageSizeOptions && onPageSizeChange ? (
        <label className="flex items-center gap-2 text-xs text-muted">
          <Select
            value={String(pageSize)}
            onValueChange={(next) => onPageSizeChange(Number(next))}
          >
            <SelectTrigger
              size="sm"
              aria-label="Items per page"
              className="font-mono tabular-nums"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>Items per page</span>
        </label>
      ) : null}
    </div>
  );
}
