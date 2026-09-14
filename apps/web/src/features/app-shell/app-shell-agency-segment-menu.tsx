import { Check, ChevronsUpDown } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Link } from "@/lib/navigation";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import {
  AGENCY_SEGMENTS,
  agencySegmentHref,
  agencySegmentLabel,
  type AgencySegmentId,
} from "@/features/shared/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

function agencyCrumbItemId(segment: AgencySegmentId): string {
  return `agency-crumb-item-${segment}`;
}

function crumbSegmentHref(segmentId: AgencySegmentId): string {
  return agencySegmentHref(segmentId);
}

/** Wrap-around arrow / Home / End index math for the crumb segment menu. */
export function nextSegmentIndex(
  currentIndex: number,
  key: string,
  lastIndex: number,
): number | null {
  switch (key) {
    case "ArrowDown":
      return currentIndex >= lastIndex ? 0 : currentIndex + 1;
    case "ArrowUp":
      return currentIndex <= 0 ? lastIndex : currentIndex - 1;
    case "Home":
      return 0;
    case "End":
      return lastIndex;
    default:
      return null;
  }
}

type AppShellAgencySegmentMenuProps = {
  segment: AgencySegmentId;
};

export function AppShellAgencySegmentMenu({ segment }: AppShellAgencySegmentMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const label = agencySegmentLabel(segment);

  function focusItem(segmentId: AgencySegmentId) {
    document.getElementById(agencyCrumbItemId(segmentId))?.focus();
  }

  function closeAndReturnFocus() {
    setOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "-mx-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-0.5 font-semibold text-highlighted transition-colors",
            "hover:bg-elevated focus-visible:bg-elevated",
            shellFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-label={`${label}. Switch Agency section`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              requestAnimationFrame(() => {
                const first = AGENCY_SEGMENTS[0];
                if (first) focusItem(first.id);
              });
            }
          }}
        >
          <span>{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={menuId}
        role="menu"
        aria-label="Agency sections"
        align="start"
        sideOffset={8}
        className="w-56 gap-0 p-1 motion-reduce:animate-none motion-reduce:data-open:zoom-in-100 motion-reduce:data-closed:zoom-out-100"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          closeAndReturnFocus();
        }}
      >
        {AGENCY_SEGMENTS.map((entry, index) => {
          const selected = segment === entry.id;
          const lastIndex = AGENCY_SEGMENTS.length - 1;
          return (
            <Link
              key={entry.id}
              id={agencyCrumbItemId(entry.id)}
              role="menuitem"
              to={crumbSegmentHref(entry.id)}
              title={`${entry.label} (g ${entry.shortcutKey})`}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted outline-hidden transition-colors hover:bg-elevated hover:text-highlighted focus-visible:bg-elevated focus-visible:text-highlighted",
                shellFocusRingClass,
                selected && "bg-primary/10 text-primary",
              )}
              aria-current={selected ? "page" : undefined}
              onClick={() => setOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeAndReturnFocus();
                  return;
                }
                const nextIndex = nextSegmentIndex(index, event.key, lastIndex);
                if (nextIndex === null) return;
                event.preventDefault();
                const next = AGENCY_SEGMENTS[nextIndex];
                if (next) focusItem(next.id);
              }}
            >
              <LucideIcon name={entry.icon} className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              <span className="font-mono text-[10px] font-medium tabular-nums text-muted">
                g {entry.shortcutKey}
              </span>
              {selected ? (
                <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <span className="size-3.5 shrink-0" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
