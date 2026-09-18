import { useFeaturedRailNotification } from "@/features/notifications/hooks/use-featured-rail-notification";
import { FeaturedRailNotificationView } from "@/features/notifications/featured-rail-notification-view";

export function FeaturedRailNotificationContainer() {
  const view = useFeaturedRailNotification();
  return <FeaturedRailNotificationView view={view} />;
}
