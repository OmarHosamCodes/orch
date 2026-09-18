import { CreditCard, Loader2 } from "lucide-react";

import { agencyPlanLabel, isPaidAgencyPlan } from "@/features/billing/agency-plan-label";
import type { AgencyPlan } from "@orch/workspace/tiers";
import { AgencySettingsPaneSection } from "@/features/shared/views/agency-settings-pane-section";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type TeamSettingsBillingPaneViewProps = {
  plan: AgencyPlan | undefined;
  billingLoading: boolean;
  seats: number | null;
  memberCount: number;
  onBillingAction: () => void;
};

export function TeamSettingsBillingPaneView({
  plan,
  billingLoading,
  seats,
  memberCount,
  onBillingAction,
}: TeamSettingsBillingPaneViewProps) {
  const paid = isPaidAgencyPlan(plan);
  const planName = agencyPlanLabel(plan);
  const seatTotal = seats ?? (paid ? memberCount : 1);
  const seatsInUse = Math.min(memberCount, seatTotal);

  return (
    <div className="flex flex-col gap-8">
      <AgencySettingsPaneSection
        title="Plan"
        description={
          paid
            ? "Billing runs through Polar. Invoices and payment methods live in the billing portal."
            : "Subscribe to keep Tracker, projects, Money, and People for this agency."
        }
      >
        <div className="rounded-xl border border-border bg-muted/15 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-foreground">{planName}</p>
                <Badge variant={paid ? "default" : "secondary"}>
                  {paid ? "Active" : "Not subscribed"}
                </Badge>
              </div>
              {billingLoading ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Loading billing…
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {paid
                    ? `${seatsInUse} of ${seatTotal} seat${seatTotal === 1 ? "" : "s"} in use`
                    : "Every member needs a seat before they can join."}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              disabled={billingLoading}
              onClick={onBillingAction}
            >
              <CreditCard className="size-4" />
              {paid ? "Manage billing" : "Subscribe — 1 seat"}
            </Button>
          </div>
        </div>
      </AgencySettingsPaneSection>

      <AgencySettingsPaneSection title="What's included">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "Tracker, projects, and clients for this agency",
            "Money, People, and team-wide Canvas sharing",
            "Seat-based invites for editors and viewers",
          ].map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-foreground" aria-hidden>
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className={cn("mt-4 text-xs text-muted-foreground")}>
          Plan changes, invoices, and cancellation happen in the billing portal — not in this
          dialog.
        </p>
      </AgencySettingsPaneSection>
    </div>
  );
}
