import { useRouterState } from "@tanstack/react-router";
import { Link } from "@/lib/navigation";
import { BrandMark } from "@/features/app-shell/components/brand-mark";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Bell, Bug, ChevronDown, Layers, Settings } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

export type DevPageNav = {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  description: string;
};

export const DEV_PAGES: DevPageNav[] = [
  {
    id: "index",
    label: "Index",
    href: "/dev",
    icon: <Layers className="size-4" />,
    description: "Overview of all dev pages and components",
  },
  {
    id: "error",
    label: "Error",
    href: "/dev/error",
    icon: <Bug className="size-4" />,
    description: "Route error, not-found, pending, and 404 components",
  },
  {
    id: "dialogs",
    label: "Dialogs",
    href: "/dev/dialogs",
    icon: <Settings className="size-4" />,
    description: "Shared smart inputs and production dialogs",
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/dev/notifications",
    icon: <Bell className="size-4" />,
    description: "Featured rail cards, alerts, and agency inbox",
  },
];

type DevChromeProps = {
  children: ReactNode;
};

function isDevPageActive(pathname: string, href: string) {
  return pathname === href || (href === "/dev" && pathname === "/dev/");
}

function devPageItemDomId(page: DevPageNav) {
  return `dev-page-switcher-item-${page.id}`;
}

function DevPageSwitcher({ pathname }: { pathname: string }) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const current = DEV_PAGES.find((page) => isDevPageActive(pathname, page.href)) ?? DEV_PAGES[0]!;

  function focusItem(index: number) {
    const page = DEV_PAGES[index];
    if (page) document.getElementById(devPageItemDomId(page))?.focus();
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
            "flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-highlighted",
            "transition-colors hover:bg-elevated",
            shellFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-label={`${current.label}. Switch dev page`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          title={current.label}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              requestAnimationFrame(() => focusItem(0));
            }
          }}
        >
          <span className="shrink-0 text-muted">{current.icon}</span>
          <span className="min-w-0 truncate" dir="auto">
            {current.label}
          </span>
          <ChevronDown className="size-3 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={menuId}
        role="menu"
        aria-label="Dev pages"
        align="end"
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
        <div
          className="px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.08em] text-muted uppercase"
          role="presentation"
        >
          Dev pages
        </div>
        {DEV_PAGES.map((page, index) => {
          const selected = isDevPageActive(pathname, page.href);
          return (
            <Link
              key={page.id}
              id={devPageItemDomId(page)}
              role="menuitem"
              to={page.href}
              title={`${page.label} (${page.href})`}
              className={cn(
                "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-hidden transition-colors hover:bg-elevated focus-visible:bg-elevated",
                shellFocusRingClass,
                selected ? "text-highlighted" : "text-muted hover:text-highlighted focus-visible:text-highlighted",
              )}
              aria-current={selected ? "page" : undefined}
              onClick={() => setOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeAndReturnFocus();
                  return;
                }
                let next: number | null = null;
                if (event.key === "ArrowDown") next = (index + 1) % DEV_PAGES.length;
                if (event.key === "ArrowUp")
                  next = (index - 1 + DEV_PAGES.length) % DEV_PAGES.length;
                if (event.key === "Home") next = 0;
                if (event.key === "End") next = DEV_PAGES.length - 1;
                if (next === null) return;
                event.preventDefault();
                focusItem(next);
              }}
            >
              <span className="shrink-0">{page.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium" dir="auto">
                  {page.label}
                </span>
                <span className="block truncate text-xs font-normal text-muted">
                  {page.description}
                </span>
              </span>
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full bg-primary",
                  selected ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function DevChrome({ children }: DevChromeProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-hairline bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <BrandMark className="size-7" />
            <span className="font-title text-lg font-semibold tracking-tight text-highlighted">
              Orch
            </span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary uppercase">
              DEV
            </span>
          </div>

          <DevPageSwitcher pathname={pathname} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
