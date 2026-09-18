import { AgencyPaywallView } from "../agency-paywall-view";
import { useAgencyPaywall } from "../hooks/use-agency-paywall";

export function AgencyPaywallContainer() {
  const view = useAgencyPaywall();

  return <AgencyPaywallView {...view} />;
}
