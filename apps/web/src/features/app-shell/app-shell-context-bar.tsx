import { Link, useLocation } from "@/lib/navigation";

import { findActiveNavItem } from "@/features/app-shell/app-navigation";
import { AppShellAgencySegmentMenu } from "@/features/app-shell/app-shell-agency-segment-menu";
import { AppShellNotifications } from "@/features/app-shell/app-shell-notifications";
import {
  shellContextBarClass,
  shellHeaderContextInnerClass,
  shellHeaderContextRegionClass,
  shellUtilityClusterClass,
} from "@/features/app-shell/app-shell-ui";
import { resolveShellContextNavItemId } from "@/features/app-shell/shell-nav-selection";
import {
  ShellLiquidNavProvider,
  useShellLiquidNavRegister,
} from "@/features/app-shell/shell-liquid-nav";
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

function ContextCanvasTitle({ label }: { label: string }) {
  const register = useShellLiquidNavRegister("context-canvas-title");

  return (
    <span ref={register} className="app-shell__context-crumb app-shell__context-crumb--current min-w-0">
      <BreadcrumbPage className="truncate">{label}</BreadcrumbPage>
    </span>
  );
}

function ContextProfileTitle() {
  const register = useShellLiquidNavRegister("context-profile");

  return (
    <span ref={register} className="app-shell__context-crumb app-shell__context-crumb--current min-w-0">
      <BreadcrumbPage className="truncate">Profile</BreadcrumbPage>
    </span>
  );
}

export function AppShellContextBar() {
  const location = useLocation();
  const activeNav = findActiveNavItem(location.pathname);
  const onAgency = location.pathname.startsWith("/agency");
  const onMemberProfile =
    location.pathname === "/agency/me" || location.pathname.startsWith("/agency/members/");
  const segment = agencySegmentFromPathname(location.pathname);
  const sectionLabel = activeNav?.label ?? "Orch";
  const sectionHref = activeNav?.to ?? "/canvas";
  const agencyTeamId = useTeamStore((s) => s.selectedTeamId);
  const contextActiveId = resolveShellContextNavItemId(location.pathname);

  return (
    <header className={shellContextBarClass}>
      <div className={cn(shellHeaderContextRegionClass, shellHeaderContextInnerClass)}>
        <ShellLiquidNavProvider activeId={contextActiveId} className="flex min-w-0 flex-1 items-center">
          <Breadcrumb>
            <BreadcrumbList className="min-w-0 flex-nowrap">
              {onAgency && onMemberProfile ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to={sectionHref}
                        className="app-shell__context-crumb app-shell__context-crumb--parent truncate"
                      >
                        {sectionLabel}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <ContextProfileTitle />
                  </BreadcrumbItem>
                </>
              ) : onAgency && segment ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to={sectionHref}
                        className="app-shell__context-crumb app-shell__context-crumb--parent truncate"
                      >
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
                  <ContextCanvasTitle label={sectionLabel} />
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </ShellLiquidNavProvider>
      </div>

      <div className={shellUtilityClusterClass}>
        {onAgency && agencyTeamId ? <AgencySubtitleBreadcrumb teamId={agencyTeamId} /> : null}
        <AppShellNotifications />
      </div>
    </header>
  );
}
