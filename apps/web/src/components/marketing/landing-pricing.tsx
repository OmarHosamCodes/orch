import { Link, useNavigate } from "@/lib/navigation";

import { Button } from "@/ui/button";
import { useBilling } from "@/features/billing/billing-queries";
import { useTeamStore } from "@/features/team/team-store";

import {
  LANDING_PRICING_BODY,
  LANDING_PRICING_COLUMNS,
  LANDING_PRICING_FEATURES,
  LANDING_PRICING_HEADLINE,
  landingAgencyCta,
  landingUnlimitedCta,
} from "./landing-pricing-copy";

type LandingPricingProps = {
  isAuthenticated: boolean;
};

export function LandingPricing({ isAuthenticated }: LandingPricingProps) {
  const navigate = useNavigate();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const { checkout, openPortal, plan } = useBilling(selectedTeamId, isAuthenticated);
  const agencyCta = landingAgencyCta({ isAuthenticated, plan });
  const unlimitedCta = landingUnlimitedCta({ isAuthenticated, plan });

  async function handleAgencyCta() {
    switch (agencyCta.kind) {
      case "login":
        await navigate("/login");
        return;
      case "portal":
        await openPortal();
        return;
      case "checkout-agency":
        await checkout("agency");
        return;
      default: {
        const _exhaustive: never = agencyCta.kind;
        return _exhaustive;
      }
    }
  }

  async function handleUnlimitedCta() {
    switch (unlimitedCta.kind) {
      case "login":
        await navigate("/login");
        return;
      case "portal":
        await openPortal();
        return;
      case "checkout-unlimited":
        await checkout("agency-unlimited");
        return;
      default: {
        const _exhaustive: never = unlimitedCta.kind;
        return _exhaustive;
      }
    }
  }

  return (
    <section id="pricing" className="w-full scroll-mt-8 border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl leading-[1.1] font-semibold tracking-[-0.025em] md:text-5xl">
            {LANDING_PRICING_HEADLINE}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            {LANDING_PRICING_BODY}
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Orch plan comparison</caption>
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th
                  scope="col"
                  className="w-[28%] px-4 py-4 text-sm font-semibold text-muted-foreground"
                >
                  Plan
                </th>
                {LANDING_PRICING_COLUMNS.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={
                      column.id === "agency"
                        ? "w-[24%] bg-primary/5 px-4 py-4 text-center text-sm font-semibold text-primary"
                        : "w-[24%] px-4 py-4 text-center text-sm font-semibold text-muted-foreground"
                    }
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-6 align-top">
                  <p className="text-sm text-muted-foreground">Monthly price</p>
                </td>
                {LANDING_PRICING_COLUMNS.map((column) => (
                  <td
                    key={column.id}
                    className={
                      column.id === "agency"
                        ? "bg-primary/5 px-4 py-6 text-center align-top"
                        : "px-4 py-6 text-center align-top"
                    }
                  >
                    <p className="text-3xl font-bold tabular-nums">{column.price}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{column.hint}</p>
                    {column.id === "trial" ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full max-w-[11rem]"
                      >
                        <Link to={isAuthenticated ? "/canvas" : "/login"}>
                          {isAuthenticated ? "Open Canvas" : "Get started"}
                        </Link>
                      </Button>
                    ) : null}
                    {column.id === "agency" ? (
                      <Button
                        size="sm"
                        variant={agencyCta.kind === "portal" ? "outline" : "default"}
                        className="mt-4 w-full max-w-[11rem]"
                        onClick={() => void handleAgencyCta()}
                      >
                        {agencyCta.label}
                      </Button>
                    ) : null}
                    {column.id === "unlimited" ? (
                      <Button
                        size="sm"
                        variant={unlimitedCta.kind === "portal" ? "outline" : "default"}
                        className="mt-4 w-full max-w-[11rem]"
                        onClick={() => void handleUnlimitedCta()}
                      >
                        {unlimitedCta.label}
                      </Button>
                    ) : null}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {LANDING_PRICING_FEATURES.map((feature) => (
                <tr key={feature.label} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-4 py-4 text-sm font-medium text-muted-foreground">
                    {feature.label}
                  </th>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-semibold text-foreground">{feature.trial}</span>
                  </td>
                  <td className="bg-primary/5 px-4 py-4 text-center">
                    <span className="text-sm font-semibold text-foreground">{feature.agency}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-semibold text-foreground">
                      {feature.unlimited}
                    </span>
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
