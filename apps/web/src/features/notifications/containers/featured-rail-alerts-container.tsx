import { useFeaturedRailAlerts } from "@/features/notifications/hooks/use-featured-rail-alerts";
import { FeaturedRailAlertsView } from "@/features/notifications/featured-rail-alerts-view";

export function FeaturedRailAlertsContainer() {
  const view = useFeaturedRailAlerts();
  return <FeaturedRailAlertsView view={view} />;
}
