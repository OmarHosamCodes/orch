import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, useLocation } from "@/lib/navigation";

import { findActiveNavItem } from "@/features/app-shell/app-navigation";
import { AppShellAgencySegmentMenu } from "@/features/app-shell/app-shell-agency-segment-menu";
import { AppShellNotifications } from "@/features/app-shell/app-shell-notifications";
import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import {
  shellContextBarClass,
  shellFocusRingClass,
  shellHeaderContextInnerClass,
  shellHeaderContextRegionClass,
  shellUtilityClusterClass,
} from "@/features/app-shell/app-shell-ui";
import { agencySegmentFromPathname } from "@/features/shared/agency-segments";
import { AgencySubtitleBreadcrumb } from "@/features/shared/agency-subtitle-breadcrumb";
import { useTeamStore } from "@/features/team/team-store";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/breadcrumb";

export function AppShellContextBar() {
  const location = useLocation();
  const railPinned = useAppShellStore((s) => s.railPinned);
  const toggleRailPinned = useAppShellStore((s) => s.toggleRailPinned);
  const activeNav = findActiveNavItem(location.pathname);
  const onAgency = location.pathname.startsWith("/agency");
  const onMemberProfile =
    location.pathname === "/agency/me" || location.pathname.startsWith("/agency/members/");
  const segment = agencySegmentFromPathname(location.pathname);
  const sectionLabel = activeNav?.label ?? "Orch";
  const sectionHref = activeNav?.to ?? "/canvas";
  const agencyTeamId = useTeamStore((s) => s.selectedTeamId);

  return (
    <header className={shellContextBarClass}>
      <div className={cn(shellHeaderContextRegionClass, shellHeaderContextInnerClass)}>
        <button
          type="button"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            shellFocusRingClass,
          )}
          onClick={toggleRailPinned}
          aria-pressed={railPinned}
          aria-label={railPinned ? "Collapse sidebar" : "Expand sidebar"}
          title={railPinned ? "Collapse sidebar" : "Expand sidebar"}
        >
          {railPinned ? (
            <PanelLeftClose className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          )}
        </button>
        <Breadcrumb>
          <BreadcrumbList className="min-w-0 flex-nowrap">
            {onAgency && onMemberProfile ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={sectionHref} className="truncate text-muted">
                      {sectionLabel}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate font-semibold text-highlighted">
                    Profile
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : onAgency && segment ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={sectionHref} className="truncate text-muted">
                      {sectionLabel}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <AppShellAgencySegmentMenu segment={segment} pathname={location.pathname} />
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-semibold text-highlighted">
                  {sectionLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className={shellUtilityClusterClass}>
        {onAgency && agencyTeamId ? <AgencySubtitleBreadcrumb teamId={agencyTeamId} /> : null}
        <AppShellNotifications />
      </div>
    </header>
  );
}
