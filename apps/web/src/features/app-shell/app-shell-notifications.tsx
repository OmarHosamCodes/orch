import { AgencyNotifications } from "@/features/notifications/agency-notifications";
import { FeaturedRailNotification } from "@/features/notifications/featured-rail-notification";
import { useTeamStore } from "@/features/team/team-store";

type AppShellNotificationsProps = {
  /** Top-bar inbox bell, or featured Needs-action card in the rail footer. */
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
