import { Link2 } from "lucide-react";
import { useState } from "react";

import { AgencyTimeEntryLinksDialog } from "@/features/time-tracking/agency-time-entry-links-dialog";
import type { TimeEntryLinkRecord } from "@/features/shared/agency-time-entry-links";
import { agencyFocusRingClass, agencyTimeEntryIconButtonClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntryLinkHoverTriggerProps = {
  links: readonly TimeEntryLinkRecord[];
  disabled?: boolean;
  saving?: boolean;
  /** When true, icon stays visible even without hover (has links). */
  alwaysVisibleWhenFilled?: boolean;
  className?: string;
  buttonClassName?: string;
  hoverRevealClassName?: string;
  onSave: (urls: string[]) => void | Promise<void>;
};

export function AgencyTimeEntryLinkHoverTrigger({
  links,
  disabled = false,
  saving = false,
  alwaysVisibleWhenFilled = true,
  className,
  buttonClassName,
  hoverRevealClassName = "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
  onSave,
}: AgencyTimeEntryLinkHoverTriggerProps) {
  const [open, setOpen] = useState(false);
  const hasLinks = links.length > 0;
  const revealClass =
    alwaysVisibleWhenFilled && hasLinks
      ? "opacity-100"
      : cn(hoverRevealClassName, open && "opacity-100");

  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <button
        type="button"
        className={cn(
          agencyTimeEntryIconButtonClass,
          "inline-flex size-8 items-center justify-center transition-opacity motion-reduce:transition-none",
          revealClass,
          hasLinks ? "text-foreground" : "text-muted-foreground",
          agencyFocusRingClass,
          buttonClassName,
        )}
        aria-label={hasLinks ? `Edit ${links.length} links` : "Add link"}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled || saving}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Link2 className="size-3.5" aria-hidden />
      </button>
      <AgencyTimeEntryLinksDialog
        open={open}
        onOpenChange={setOpen}
        links={links}
        saving={saving}
        onSave={onSave}
      />
    </div>
  );
}
