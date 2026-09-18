import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Link } from "@/lib/navigation";

import {
  isShellLocationDestinationSelected,
  nextLocationIndex,
  shellLocationDestinationDomId,
  shellLocationGroupLabel,
  type ShellLocationDestination,
  type ShellLocationGroupId,
} from "@/features/app-shell/app-shell-location";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { useShellLiquidNavRegister } from "@/features/app-shell/shell-liquid-nav";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

const LOCATION_GROUPS: readonly ShellLocationGroupId[] = ["product", "agency", "management"];

const menuGroupLabelClass =
  "px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted";

type AppShellLocationTitleProps = {
  title: string;
  pathname: string;
  destinations: ShellLocationDestination[];
};

export function AppShellLocationTitle({
  title,
  pathname,
  destinations,
}: AppShellLocationTitleProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const registerTitle = useShellLiquidNavRegister("context-location-title");
  const lastIndex = destinations.length - 1;

  function focusItem(destination: ShellLocationDestination) {
    document.getElementById(shellLocationDestinationDomId(destination))?.focus();
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
          ref={(element) => {
            triggerRef.current = element;
            registerTitle(element);
          }}
          type="button"
          className={cn(
            "app-shell__context-crumb app-shell__context-crumb--current app-shell__context-crumb--switcher min-w-0",
            "transition-colors hover:text-sidebar-accent-foreground",
            shellFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-label={`${title}. Switch location`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          title={title}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              requestAnimationFrame(() => {
                const first = destinations[0];
                if (first) focusItem(first);
              });
            }
          }}
        >
          <span className="min-w-0 truncate" dir="auto">
            {title}
          </span>
          <ChevronDown className="size-3 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={menuId}
        role="menu"
        aria-label="Locations"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="max-h-[min(70vh,26.25rem)] min-w-[15rem] w-[min(22.5rem,calc(100vw-1.5rem))] gap-0 overflow-y-auto p-1.5 motion-reduce:animate-none motion-reduce:data-open:zoom-in-100 motion-reduce:data-closed:zoom-out-100"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          closeAndReturnFocus();
        }}
      >
        {LOCATION_GROUPS.map((group) => {
          const items = destinations.filter((destination) => destination.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <div className={menuGroupLabelClass} role="presentation">
                {shellLocationGroupLabel(group)}
              </div>
              {items.map((destination) => {
                const selected = isShellLocationDestinationSelected(destination, pathname, title);
                const itemId = shellLocationDestinationDomId(destination);
                const index = destinations.indexOf(destination);
                return (
                  <Link
                    key={destination.id}
                    id={itemId}
                    role="menuitem"
                    to={destination.href}
                    activeOptions={{ exact: true }}
                    title={
                      destination.shortcut
                        ? `${destination.label} (g ${destination.shortcut})`
                        : destination.label
                    }
                    className={cn(
                      "flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted outline-hidden transition-colors hover:bg-elevated hover:text-highlighted focus-visible:bg-elevated focus-visible:text-highlighted",
                      shellFocusRingClass,
                      selected && "text-highlighted",
                    )}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closeAndReturnFocus();
                        return;
                      }
                      const nextIndex = nextLocationIndex(index, event.key, lastIndex);
                      if (nextIndex === null) return;
                      event.preventDefault();
                      const next = destinations[nextIndex];
                      if (next) focusItem(next);
                    }}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full bg-primary",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1" dir="auto">
                      {destination.label}
                    </span>
                    {destination.shortcut ? (
                      <span className="ml-auto font-mono text-[10px] font-medium tabular-nums text-muted">
                        g {destination.shortcut}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
