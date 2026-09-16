import { type MouseEvent, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { TableCell } from "@/ui/table";
import { cn } from "@/lib/utils";

function stopRowClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

const hoverRevealClass =
  "max-md:opacity-100 md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100 md:group-has-[[data-state=open]]/row:opacity-100";

export function MoneyTableActionsCell({
  settleLabel,
  settleDisabled,
  onSettle,
  overflow,
  className,
}: {
  settleLabel: string | null;
  settleDisabled: boolean;
  onSettle?: () => void;
  overflow?: ReactNode;
  className?: string;
}) {
  const hasSettle = Boolean(settleLabel && onSettle);
  const hasOverflow = Boolean(overflow);

  return (
    <TableCell className={cn("text-right", className)}>
      <div className="flex items-center justify-end gap-1">
        {hasSettle && onSettle ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={hoverRevealClass}
            disabled={settleDisabled}
            aria-haspopup="dialog"
            onClick={(event) => {
              stopRowClick(event);
              onSettle();
            }}
          >
            {settleLabel}
          </Button>
        ) : null}
        {hasOverflow ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-8 text-muted hover:text-highlighted"
                disabled={settleDisabled}
                aria-label="More actions"
                onClick={stopRowClick}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40" onClick={stopRowClick}>
              {overflow}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </TableCell>
  );
}
