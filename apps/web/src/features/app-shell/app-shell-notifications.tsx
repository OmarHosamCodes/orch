import { AgencyNotifications } from "@/features/notifications/agency-notifications";
import { FeaturedRailNotification } from "@/features/notifications/featured-rail-notification";
import { useTeamStore } from "@/features/team/team-store";

type AppShellNotificationsProps = {
  /** Featured Needs-action card in the rail footer. Icon variant is unused (no top-bar bell). */
  variant?: "icon" | "featured";
};

/** Shell-level notifications for the current team, on every authenticated screen. */
export function AppShellNotifications({ variant = "icon" }: AppShellNotificationsProps) {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  if (variant === "featured") {
    return <FeaturedRailNotification />;
  }
  if (!teamId) return null;
  return <AgencyNotifications teamId={teamId} />;
}
