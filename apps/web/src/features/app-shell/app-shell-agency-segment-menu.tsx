import { Check, ChevronsUpDown } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Link } from "@/lib/navigation";

import {
  agencyShellCrumbLabel,
  agencyShellNavItemId,
  agencyShellNavItems,
} from "@/features/app-shell/app-shell-agency-nav-tree";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { agencyManagementPaneFromPathname } from "@/features/shared/agency-management-sections";
import { type AgencySegmentId } from "@/features/shared/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

const menuGroupLabelClass =
  "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted";

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
  pathname: string;
};

function isNavItemSelected(
  item: ReturnType<typeof agencyShellNavItems>[number],
  segment: AgencySegmentId,
  pathname: string,
): boolean {
  if (item.kind === "segment") {
    return segment === item.id;
  }
  return agencyManagementPaneFromPathname(pathname) === item.id;
}

export function AppShellAgencySegmentMenu({ segment, pathname }: AppShellAgencySegmentMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const navItems = agencyShellNavItems();
  const managementPane = agencyManagementPaneFromPathname(pathname);
  const label = agencyShellCrumbLabel(segment, managementPane);

  function focusItem(itemId: string) {
    document.getElementById(itemId)?.focus();
  }

  function closeAndReturnFocus() {
    setOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  const lastIndex = navItems.length - 1;
  let menuIndex = 0;

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
                const first = navItems[0];
                if (first) focusItem(agencyShellNavItemId(first));
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
        className="max-h-[min(70vh,28rem)] w-56 gap-0 overflow-y-auto p-1 motion-reduce:animate-none motion-reduce:data-open:zoom-in-100 motion-reduce:data-closed:zoom-out-100"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          closeAndReturnFocus();
        }}
      >
        {navItems.map((entry) => {
          const showManagementHeader =
            entry.kind === "management-pane" &&
            (menuIndex === 0 || navItems[menuIndex - 1]?.kind === "segment");
          const selected = isNavItemSelected(entry, segment, pathname);
          const itemId = agencyShellNavItemId(entry);
          const index = menuIndex;
          menuIndex += 1;

          return (
            <div key={itemId}>
              {showManagementHeader ? (
                <div className={menuGroupLabelClass} role="presentation">
                  Management
                </div>
              ) : null}
              <Link
                id={itemId}
                role="menuitem"
                to={entry.href}
                title={
                  entry.kind === "segment"
                    ? `${entry.label} (g ${entry.shortcutKey})`
                    : entry.label
                }
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted outline-hidden transition-colors hover:bg-elevated hover:text-highlighted focus-visible:bg-elevated focus-visible:text-highlighted",
                  entry.kind === "management-pane" && "pl-6",
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
                  const next = navItems[nextIndex];
                  if (next) focusItem(agencyShellNavItemId(next));
                }}
              >
                <LucideIcon name={entry.icon} className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                {entry.kind === "segment" ? (
                  <span className="font-mono text-[10px] font-medium tabular-nums text-muted">
                    g {entry.shortcutKey}
                  </span>
                ) : null}
                {selected ? (
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}
              </Link>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
