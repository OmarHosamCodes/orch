import { Loader2, MoreVertical, Pencil, Trash2, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyReportCreatorRowActionsProps = {
  label: string;
  taskId: string | null;
  isWaste: boolean;
  disabled?: boolean;
  wastePending?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onToggleWaste?: () => void;
};

export function AgencyReportCreatorRowActions({
  label,
  taskId: _taskId,
  isWaste,
  disabled = false,
  wastePending = false,
  onEdit,
  onRemove,
  onToggleWaste,
}: AgencyReportCreatorRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canToggleWaste = Boolean(onToggleWaste);

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 [@media(hover:hover)]:opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100",
            (disabled || wastePending || menuOpen) && "opacity-100",
            agencyFocusRingClass,
          )}
          disabled={disabled || wastePending}
          aria-label={`Actions for ${label}`}
          onClick={(event) => event.stopPropagation()}
        >
          {wastePending ? (
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <MoreVertical className="size-3.5" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" size="menu" onClick={(event) => event.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setMenuOpen(false);
            onEdit();
          }}
        >
          <Pencil className="size-3.5" />
          Edit entry
        </Button>
        {canToggleWaste ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start", isWaste && "text-warning")}
            disabled={wastePending}
            onClick={() => {
              setMenuOpen(false);
              onToggleWaste?.();
            }}
          >
            <TrashIcon className="size-3.5" />
            {isWaste ? "Unmark waste" : "Mark as waste"}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-error"
          onClick={() => {
            setMenuOpen(false);
            onRemove();
          }}
        >
          <Trash2 className="size-3.5" />
          Remove from report
        </Button>
      </PopoverContent>
    </Popover>
  );
}
