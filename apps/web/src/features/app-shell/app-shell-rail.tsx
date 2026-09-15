import { useLocation } from "@/lib/navigation";

import { AppShellAccountMenu } from "@/features/app-shell/app-shell-account-menu";
import { AppShellCommandPalette } from "@/features/app-shell/app-shell-command-palette";
import { AppShellNotifications } from "@/features/app-shell/app-shell-notifications";
import { AppShellRailDestinations } from "@/features/app-shell/app-shell-rail-destinations";
import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import { AppShellTeamControl } from "@/features/app-shell/app-shell-team-control";
import { shellRailFooterClass } from "@/features/app-shell/app-shell-ui";
import { resolveShellRailNavItemId } from "@/features/app-shell/shell-nav-selection";
import { ShellLiquidNavProvider } from "@/features/app-shell/shell-liquid-nav";
import { useBilling } from "@/features/billing/billing-queries";
import { useAgencySegmentShortcuts } from "@/features/shared/use-agency-segment-shortcuts";
import { Button } from "@/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/ui/sheet";

export function AppShellRail() {
  const location = useLocation();
  useAgencySegmentShortcuts();
  const activeNavId = resolveShellRailNavItemId(location.pathname);

  return (
    <nav className="app-shell__rail" aria-label="Primary">
      <AppShellTeamControl variant="sidebar" />

      <div className="app-shell__rail-nav">
        <ShellLiquidNavProvider
          activeId={activeNavId}
          className="app-shell__rail-destinations"
          scrollRootClassName="app-shell__rail-nav"
        >
          <AppShellRailDestinations />
        </ShellLiquidNavProvider>
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
  const mobileNavOpen = useAppShellStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppShellStore((s) => s.setMobileNavOpen);
  const { isPro, checkout, billingQuery } = useBilling();
  const showUpgrade = !isPro && !billingQuery.isPending;
  const activeNavId = resolveShellRailNavItemId(location.pathname);

  return (
    <>
      <AppShellCommandPalette />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="app-shell__drawer-static flex w-[min(100vw,17rem)] flex-col gap-2 bg-sidebar p-2 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppShellTeamControl variant="sidebar" />
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Sections">
            <ShellLiquidNavProvider activeId={activeNavId} className="app-shell__rail-destinations">
              <AppShellRailDestinations onNavigate={() => setMobileNavOpen(false)} />
            </ShellLiquidNavProvider>
          </nav>
          <div className="flex flex-col gap-1 pt-2">
            <AppShellNotifications variant="featured" />
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
