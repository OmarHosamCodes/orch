import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "@/lib/navigation";

import { APP_NAV_ITEMS } from "@/features/app-shell/app-navigation";
import { AppShellAccountMenu } from "@/features/app-shell/app-shell-account-menu";
import { AppShellAgencyNav } from "@/features/app-shell/app-shell-agency-nav";
import { AppShellCommandPalette } from "@/features/app-shell/app-shell-command-palette";
import { AppShellNotifications } from "@/features/app-shell/app-shell-notifications";
import { AppShellTeamControl } from "@/features/app-shell/app-shell-team-control";
import {
  shellFocusRingClass,
  shellRailFooterClass,
  shellRailIconClass,
  shellRailLinkActiveClass,
  shellRailLinkClass,
} from "@/features/app-shell/app-shell-ui";
import { useBilling } from "@/features/billing/billing-queries";
import { useAgencySegmentShortcuts } from "@/features/shared/use-agency-segment-shortcuts";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Separator } from "@/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/ui/sheet";

export function AppShellRail() {
  const location = useLocation();
  useAgencySegmentShortcuts();

  return (
    <nav className="app-shell__rail" aria-label="Primary">
      <AppShellTeamControl variant="sidebar" />
      <Separator className="bg-sidebar-border" />

      <div className="app-shell__rail-nav">
        {APP_NAV_ITEMS.map((item) => {
          if (item.to === "/agency") {
            return <AppShellAgencyNav key={item.to} variant="rail" />;
          }
          const active = item.matches(location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(shellRailLinkClass, active && shellRailLinkActiveClass)}
              aria-current={active ? "page" : undefined}
              title={item.label}
            >
              <LucideIcon name={item.icon} className={cn(shellRailIconClass, "rail-icon")} />
              <span className="rail-label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className={shellRailFooterClass}>
        <AppShellNotifications variant="featured" />
        <AppShellAccountMenu variant="sidebar" />
      </div>
    </nav>
  );
}

export function AppShellRailOverlays() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isPro, checkout, billingQuery } = useBilling();
  const showUpgrade = !isPro && !billingQuery.isPending;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "app-shell__mobile-nav-trigger md:hidden",
          "border border-default bg-default text-highlighted shadow-sm",
          "hover:bg-elevated hover:text-highlighted",
          shellFocusRingClass,
        )}
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="size-4" />
      </Button>

      <AppShellCommandPalette />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="app-shell__drawer-static flex w-[min(100vw,17rem)] flex-col gap-2 bg-sidebar p-2 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppShellTeamControl variant="sidebar" />
          <Separator className="bg-sidebar-border" />
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Sections">
            {APP_NAV_ITEMS.map((item) => {
              if (item.to === "/agency") {
                return (
                  <AppShellAgencyNav
                    key={item.to}
                    variant="rail"
                    expanded
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                );
              }
              const active = item.matches(location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(shellRailLinkClass, active && shellRailLinkActiveClass)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <LucideIcon name={item.icon} className={cn(shellRailIconClass, "rail-icon")} />
                  <span className="rail-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-1 pt-2">
            <AppShellNotifications variant="featured" forceExpanded />
            <AppShellAccountMenu variant="sidebar" />
            {showUpgrade ? (
              <Button
                type="button"
                className="w-full rounded-full"
                onClick={() => {
                  setMobileNavOpen(false);
                  void checkout("pro");
                }}
              >
                Get Pro
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
