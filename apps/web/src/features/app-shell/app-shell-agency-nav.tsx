import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@/lib/navigation";

import {
  AGENCY_PRIMARY_SEGMENTS,
  agencyShellNavItemId,
  agencyShellNavItems,
  managementGroupHref,
  type AgencyPrimarySegmentId,
  type AgencyShellNavItem,
} from "@/features/app-shell/app-shell-agency-nav-tree";
import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import {
  shellFocusRingClass,
  shellNavLinkActiveClass,
  shellNavLinkClass,
  shellRailIconClass,
  shellRailLinkActiveClass,
  shellRailLinkClass,
} from "@/features/app-shell/app-shell-ui";
import {
  AGENCY_MANAGEMENT_PANES,
  agencyManagementHref,
  agencyManagementPaneFromPathname,
  agencyManagementPaneTabId,
} from "@/features/shared/agency-management-sections";
import { agencySegmentFromPathname, agencySegmentTabId } from "@/features/shared/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@/ui/popover";

const OPEN_DELAY_MS = 80;
const CLOSE_DELAY_MS = 140;

const menuItemClass =
  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted outline-hidden transition-colors hover:bg-elevated hover:text-highlighted focus-visible:bg-elevated focus-visible:text-highlighted";

const menuGroupLabelClass =
  "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted";

const railSublinkClass =
  "app-shell__rail-sublink text-xs font-medium text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

const railNestedSublinkClass =
  "app-shell__rail-sublink app-shell__rail-sublink--nested text-xs font-medium text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

type AppShellAgencyNavProps = {
  /** Hover-popover topbar link, or stacked rows for the rail and mobile drawer. */
  variant?: "desktop" | "rail";
  /** Force expanded inline subnav (mobile sheet); ignores rail pin state. */
  expanded?: boolean;
  onNavigate?: () => void;
};

/** Remember the last Management pane for the group label href. */
function useAgencyManagementPaneSync() {
  const location = useLocation();
  const setLastManagementPane = useAppShellStore((s) => s.setLastManagementPane);

  useEffect(() => {
    const pane = agencyManagementPaneFromPathname(location.pathname);
    if (pane) setLastManagementPane(pane);
  }, [location.pathname, setLastManagementPane]);
}

function isSegmentSelected(
  segmentId: AgencyPrimarySegmentId,
  currentSegment: ReturnType<typeof agencySegmentFromPathname>,
): boolean {
  return currentSegment === segmentId;
}

function isManagementPaneSelected(
  paneId: (typeof AGENCY_MANAGEMENT_PANES)[number]["id"],
  currentPane: ReturnType<typeof agencyManagementPaneFromPathname>,
): boolean {
  return currentPane === paneId;
}

function isAgencyParentActive(pathname: string): boolean {
  return pathname.startsWith("/agency");
}

function renderFlyoutItem(
  item: AgencyShellNavItem,
  opts: {
    selected: boolean;
    asMenu: boolean;
    onPick?: () => void;
    onNavigate?: () => void;
    index: number;
    onMenuKeyDown: (index: number, key: string) => void;
  },
) {
  const id = agencyShellNavItemId(item);
  const shortcut =
    item.kind === "segment" ? `(g ${item.shortcutKey})` : undefined;
  const title = shortcut ? `${item.label} ${shortcut}` : item.label;
  const linkClass = opts.asMenu
    ? cn(
        menuItemClass,
        item.kind === "management-pane" && "pl-6",
        shellFocusRingClass,
        opts.selected && "bg-primary/10 text-primary",
      )
    : cn(railSublinkClass, shellFocusRingClass, opts.selected && shellRailLinkActiveClass);

  return (
    <Link
      key={id}
      id={id}
      role={opts.asMenu ? "menuitem" : undefined}
      to={item.href}
      title={title}
      className={linkClass}
      aria-current={opts.selected ? "page" : undefined}
      onClick={() => {
        opts.onPick?.();
        opts.onNavigate?.();
      }}
      onKeyDown={
        opts.asMenu
          ? (event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                opts.onMenuKeyDown(-1, "Escape");
                return;
              }
              opts.onMenuKeyDown(opts.index, event.key);
            }
          : undefined
      }
    >
      <LucideIcon name={item.icon} className="size-3.5 shrink-0" />
      {opts.asMenu ? (
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      ) : (
        <span className="rail-label">{item.label}</span>
      )}
      {opts.asMenu && item.kind === "segment" ? (
        <span className="font-mono text-[10px] font-medium tabular-nums text-muted">
          g {item.shortcutKey}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShellAgencyNav({
  variant = "desktop",
  expanded = false,
  onNavigate,
}: AppShellAgencyNavProps) {
  const location = useLocation();
  const menuId = useId();
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const railPinned = useAppShellStore((s) => s.railPinned);
  const lastManagementPane = useAppShellStore((s) => s.lastManagementPane);

  useAgencyManagementPaneSync();

  const active = isAgencyParentActive(location.pathname);
  const currentSegment = agencySegmentFromPathname(location.pathname);
  const currentManagePane = agencyManagementPaneFromPathname(location.pathname);
  const showInlineSubnav = variant === "rail" && (expanded || railPinned);
  const showFlyout = variant === "desktop" || (variant === "rail" && !showInlineSubnav);
  const navItems = agencyShellNavItems();

  function clearTimers() {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleOpen() {
    clearTimers();
    openTimerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }

  function scheduleClose() {
    clearTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  function openNow() {
    clearTimers();
    setOpen(true);
  }

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!showFlyout && open) setOpen(false);
  }, [showFlyout, open]);

  function handleMenuKeyDown(index: number, key: string) {
    if (key === "Escape") {
      setOpen(false);
      return;
    }
    const lastIndex = navItems.length - 1;
    let nextIndex = index;
    if (key === "ArrowDown") {
      nextIndex = index >= lastIndex ? 0 : index + 1;
    } else if (key === "ArrowUp") {
      nextIndex = index <= 0 ? lastIndex : index - 1;
    } else if (key === "Home") {
      nextIndex = 0;
    } else if (key === "End") {
      nextIndex = lastIndex;
    } else {
      return;
    }
    const next = navItems[nextIndex];
    if (next) document.getElementById(agencyShellNavItemId(next))?.focus();
  }

  function primarySegmentLinks() {
    return AGENCY_PRIMARY_SEGMENTS.map((entry) => {
      const selected = isSegmentSelected(entry.id, currentSegment);
      return (
        <Link
          key={entry.id}
          id={agencySegmentTabId(entry.id)}
          to={entry.path}
          title={`${entry.label} (g ${entry.shortcutKey})`}
          className={cn(railSublinkClass, shellFocusRingClass, selected && shellRailLinkActiveClass)}
          aria-current={selected ? "page" : undefined}
          onClick={onNavigate}
        >
          <LucideIcon name={entry.icon} className="size-3.5 shrink-0" />
          <span className="rail-label">{entry.label}</span>
        </Link>
      );
    });
  }

  function managementGroupLinks() {
    const groupSelected = currentSegment === "management" && !currentManagePane;
    const groupHref = managementGroupHref(lastManagementPane);

    return (
      <div className="app-shell__rail-subnav-group">
        <Link
          to={groupHref}
          title="Management (g m)"
          className={cn(
            railSublinkClass,
            shellFocusRingClass,
            groupSelected && shellRailLinkActiveClass,
            currentSegment === "management" && "text-sidebar-accent-foreground",
          )}
          aria-current={groupSelected ? "page" : undefined}
          onClick={onNavigate}
        >
          <LucideIcon name="i-lucide-sliders-horizontal" className="size-3.5 shrink-0" />
          <span className="rail-label">Management</span>
        </Link>
        <div
          className="app-shell__rail-subnav app-shell__rail-subnav--nested"
          role="group"
          aria-label="Management sections"
        >
          {AGENCY_MANAGEMENT_PANES.map((pane) => {
            const selected = isManagementPaneSelected(pane.id, currentManagePane);
            return (
              <Link
                key={pane.id}
                id={agencyManagementPaneTabId(pane.id)}
                to={agencyManagementHref(pane.id)}
                title={pane.label}
                className={cn(
                  railNestedSublinkClass,
                  shellFocusRingClass,
                  selected && shellRailLinkActiveClass,
                )}
                aria-current={selected ? "page" : undefined}
                onClick={onNavigate}
              >
                <LucideIcon name={pane.icon} className="size-3.5 shrink-0" />
                <span className="rail-label">{pane.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  function flyoutLinks(asMenu: boolean) {
    const items: ReactNode[] = [];
    let itemIndex = 0;

    for (const entry of AGENCY_PRIMARY_SEGMENTS) {
      items.push(
        renderFlyoutItem(
          {
            kind: "segment",
            id: entry.id,
            label: entry.label,
            href: entry.path,
            icon: entry.icon,
            shortcutKey: entry.shortcutKey,
          },
          {
            selected: isSegmentSelected(entry.id, currentSegment),
            asMenu,
            onPick: () => setOpen(false),
            onNavigate,
            index: itemIndex,
            onMenuKeyDown: handleMenuKeyDown,
          },
        ),
      );
      itemIndex += 1;
    }

    if (asMenu) {
      items.push(
        <div key="management-group" className={menuGroupLabelClass} role="presentation">
          Management
        </div>,
      );
    }

    for (const pane of AGENCY_MANAGEMENT_PANES) {
      items.push(
        renderFlyoutItem(
          {
            kind: "management-pane",
            id: pane.id,
            label: pane.label,
            href: agencyManagementHref(pane.id),
            icon: pane.icon,
          },
          {
            selected: isManagementPaneSelected(pane.id, currentManagePane),
            asMenu,
            onPick: () => setOpen(false),
            onNavigate,
            index: itemIndex,
            onMenuKeyDown: handleMenuKeyDown,
          },
        ),
      );
      itemIndex += 1;
    }

    return items;
  }

  if (variant === "rail" && showInlineSubnav) {
    return (
      <div className="app-shell__rail-group">
        <Link
          to="/agency"
          className={cn(
            shellRailLinkClass,
            active && "bg-sidebar-accent/60 text-sidebar-accent-foreground font-medium",
          )}
          title="Agency"
          aria-current={active ? "true" : undefined}
          onClick={onNavigate}
        >
          <LucideIcon name="i-lucide-briefcase" className={cn(shellRailIconClass, "rail-icon")} />
          <span className="rail-label">Agency</span>
        </Link>
        <div className="app-shell__rail-subnav" role="group" aria-label="Agency sections">
          {primarySegmentLinks()}
          {managementGroupLinks()}
        </div>
      </div>
    );
  }

  const triggerClass =
    variant === "rail"
      ? cn(
          shellRailLinkClass,
          active && "bg-sidebar-accent/60 text-sidebar-accent-foreground font-medium",
        )
      : cn(shellNavLinkClass, active && shellNavLinkActiveClass);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn("relative", variant === "rail" && "app-shell__rail-group")}
          onPointerEnter={scheduleOpen}
          onPointerLeave={scheduleClose}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onFocusCapture={openNow}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              scheduleClose();
            }
          }}
        >
          <Link
            to="/agency"
            className={triggerClass}
            title="Agency"
            aria-current={active ? "true" : undefined}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={onNavigate}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || (variant === "rail" && event.key === "ArrowRight")) {
                event.preventDefault();
                openNow();
                requestAnimationFrame(() => {
                  document.getElementById(agencySegmentTabId("work"))?.focus();
                });
                return;
              }
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          >
            {variant === "rail" ? (
              <>
                <LucideIcon
                  name="i-lucide-briefcase"
                  className={cn(shellRailIconClass, "rail-icon")}
                />
                <span className="rail-label">Agency</span>
              </>
            ) : (
              "Agency"
            )}
          </Link>
        </div>
      </PopoverAnchor>
      <PopoverContent
        id={menuId}
        role="menu"
        aria-label="Agency sections"
        align="start"
        side={variant === "rail" ? "right" : "bottom"}
        sideOffset={8}
        className="max-h-[min(70vh,28rem)] w-52 gap-0 overflow-y-auto p-1 motion-reduce:animate-none motion-reduce:data-open:zoom-in-100 motion-reduce:data-closed:zoom-out-100"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={openNow}
        onPointerLeave={scheduleClose}
        onEscapeKeyDown={() => setOpen(false)}
      >
        {flyoutLinks(true)}
      </PopoverContent>
    </Popover>
  );
}
