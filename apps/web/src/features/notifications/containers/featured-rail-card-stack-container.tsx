import { FeaturedRailCardStackView } from "@/features/notifications/featured-rail-card-stack-view";
import { useFeaturedRailCardStack } from "@/features/notifications/hooks/use-featured-rail-card-stack";

export function FeaturedRailCardStackContainer() {
  const view = useFeaturedRailCardStack();
  return <FeaturedRailCardStackView view={view} />;
}
