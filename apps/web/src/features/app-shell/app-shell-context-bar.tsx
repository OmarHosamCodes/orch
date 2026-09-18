import { ChevronLeft, Menu } from "lucide-react";
import { Link, useLocation } from "@/lib/navigation";

import { AppShellLocationTitle } from "@/features/app-shell/app-shell-location-title";
import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import {
  shellContextBarClass,
  shellFocusRingClass,
  shellHeaderContextInnerClass,
  shellHeaderContextRegionClass,
  shellUtilityClusterClass,
} from "@/features/app-shell/app-shell-ui";
import { useAppShellLocation } from "@/features/app-shell/hooks/use-app-shell-location";
import { resolveShellContextNavItemId } from "@/features/app-shell/shell-nav-selection";
import { ShellLiquidNavProvider } from "@/features/app-shell/shell-liquid-nav";
import { AgencySubtitleBreadcrumb } from "@/features/shared/agency-subtitle-breadcrumb";
import { useTeamStore } from "@/features/team/team-store";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export function AppShellContextBar() {
  const route = useLocation();
  const location = useAppShellLocation();
  const agencyTeamId = useTeamStore((s) => s.selectedTeamId);
  const setMobileNavOpen = useAppShellStore((s) => s.setMobileNavOpen);
  const contextActiveId = resolveShellContextNavItemId(route.pathname);
  const onAgency = route.pathname.startsWith("/agency");

  return (
    <header className={shellContextBarClass}>
      {/*
        THESIS: One current place, not a nested trail — the leaf title is the wayfinder; destinations live in its menu.
        OWN-WORLD: Continuous surface grain on the connected 44px bar, traveling blob on the title, shadcn popover, no liquid glass.
        STORY: Operators read where they are, open grouped Products / Agency / Management destinations, or take one quiet back step on nested pages.
        FIRST VIEWPORT: Mobile hamburger, optional ChevronLeft parent back, leaf title + chevron; Eclipse companion on the right.
        FORM: Shape 01 Current Title, user-locked after Open Design discovery. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <div className={cn(shellHeaderContextRegionClass, shellHeaderContextInnerClass)}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "app-shell__mobile-nav-trigger md:hidden",
            "text-sidebar-foreground hover:bg-elevated hover:text-highlighted",
            shellFocusRingClass,
          )}
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="size-4" />
        </Button>

        <ShellLiquidNavProvider
          activeId={contextActiveId}
          className="flex min-w-0 flex-1 items-center gap-0.5"
        >
          <nav aria-label="Location" className="flex min-w-0 flex-1 items-center gap-0.5">
            {location.parent ? (
              <Link
                to={location.parent.href}
                className={cn(
                  "app-shell__context-crumb app-shell__context-crumb--parent",
                  "size-8 shrink-0 justify-center px-0",
                  shellFocusRingClass,
                )}
                aria-label={`Back to ${location.parent.label}`}
                title={`Back to ${location.parent.label}`}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <AppShellLocationTitle
              title={location.title}
              pathname={route.pathname}
              destinations={location.destinations}
            />
          </nav>
        </ShellLiquidNavProvider>
      </div>

      <div className={shellUtilityClusterClass}>
        {onAgency && agencyTeamId ? <AgencySubtitleBreadcrumb teamId={agencyTeamId} /> : null}
        <div id="orch-topbar-slot" className="contents" />
      </div>
    </header>
  );
}
