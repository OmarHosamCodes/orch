import { AgencyPaywallView } from "../agency-paywall-view";
import { useAgencyPaywall } from "../hooks/use-agency-paywall";

// "pro" is the existing Polar checkout slug until Slice 5.
export function AgencyPaywallContainer() {
  const view = useAgencyPaywall();

  return <AgencyPaywallView {...view} />;
}
