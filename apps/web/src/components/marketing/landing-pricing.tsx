import { Check, Minus } from "lucide-react";
import { Link, useNavigate } from "@/lib/navigation";

import { Button } from "@/ui/button";
import { useBilling } from "@/features/billing/billing-queries";
import { useTeamStore } from "@/features/team/team-store";

type LimitFeature = {
  kind: "limit";
  label: string;
  free: string;
  pro: string;
};

type FlagFeature = {
  kind: "flag";
  label: string;
  free: boolean;
  pro: boolean;
};

type PricingFeature = LimitFeature | FlagFeature;

const features: PricingFeature[] = [
  { kind: "limit", label: "Workspace nodes", free: "10", pro: "200" },
  { kind: "limit", label: "Blocks per tab", free: "6", pro: "24" },
  { kind: "limit", label: "Tabs per node", free: "3", pro: "12" },
  { kind: "limit", label: "Teams", free: "1", pro: "5" },
  { kind: "limit", label: "Team members", free: "3", pro: "20" },
  { kind: "limit", label: "Agent conversations", free: "5", pro: "Unlimited" },
  { kind: "flag", label: "Agency ops", free: false, pro: true },
  { kind: "flag", label: "Marketplace publishing", free: false, pro: true },
];

function PlanCell({ included, value }: { included?: boolean; value?: string }) {
  if (value !== undefined) {
    return (
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</span>
    );
  }

  return included ? (
    <Check className="mx-auto size-4 text-primary" aria-hidden="true" />
  ) : (
    <Minus className="mx-auto size-4 text-muted-foreground" aria-hidden="true" />
  );
}

type LandingPricingProps = {
  isAuthenticated: boolean;
};

export function LandingPricing({ isAuthenticated }: LandingPricingProps) {
  const navigate = useNavigate();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const { checkout, isPro, openPortal } = useBilling(selectedTeamId, isAuthenticated);

  async function handleCheckout() {
    if (!isAuthenticated) {
      await navigate("/login");
      return;
    }
    if (isPro) {
      await openPortal();
      return;
    }
    await checkout("pro");
  }

  return (
    <section id="pricing" className="w-full scroll-mt-8 border-t border-border bg-background">
      <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl leading-[1.1] font-semibold tracking-[-0.025em] md:text-5xl">
            Free to start. Pro when 10 nodes is not enough.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Free includes 10 nodes, 6 blocks per tab, and the agent. Pro adds 200 nodes, Agency, and
            marketplace publishing.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Orch plan comparison</caption>
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th
                  scope="col"
                  className="w-[44%] px-5 py-4 text-sm font-semibold text-muted-foreground"
                >
                  Plan
                </th>
                <th
                  scope="col"
                  className="w-[28%] px-5 py-4 text-center text-sm font-semibold text-muted-foreground"
                >
                  Free
                </th>
                <th
                  scope="col"
                  className="w-[28%] bg-primary/5 px-5 py-4 text-center text-sm font-semibold text-primary"
                >
                  Pro
                </th>
              </tr>
              <tr className="border-b border-border">
                <td className="px-5 py-6 align-top">
                  <p className="text-sm text-muted-foreground">Monthly price</p>
                </td>
                <td className="px-5 py-6 text-center align-top">
                  <p className="text-3xl font-bold tabular-nums">$0</p>
                  <p className="mt-1 text-xs text-muted-foreground">10 nodes, single user</p>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full max-w-[10rem]">
                    <Link to={isAuthenticated ? "/canvas" : "/login"}>
                      {isAuthenticated ? "Open workspace" : "Get started"}
                    </Link>
                  </Button>
                </td>
                <td className="bg-primary/5 px-5 py-6 text-center align-top">
                  <p className="text-3xl font-bold tabular-nums">$19</p>
                  <p className="mt-1 text-xs text-muted-foreground">200 nodes, teams, Agency</p>
                  <Button
                    size="sm"
                    variant={isAuthenticated && isPro ? "outline" : "default"}
                    className="mt-4 w-full max-w-[10rem]"
                    onClick={() => void handleCheckout()}
                  >
                    {isAuthenticated && isPro ? "Manage billing" : "Upgrade to Pro"}
                  </Button>
                </td>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.label} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-5 py-4 text-sm font-medium text-muted-foreground">
                    {feature.label}
                  </th>
                  <td className="px-5 py-4 text-center">
                    {feature.kind === "limit" ? (
                      <PlanCell value={feature.free} />
                    ) : (
                      <PlanCell included={feature.free} />
                    )}
                  </td>
                  <td className="bg-primary/5 px-5 py-4 text-center">
                    {feature.kind === "limit" ? (
                      <PlanCell value={feature.pro} />
                    ) : (
                      <PlanCell included={feature.pro} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
