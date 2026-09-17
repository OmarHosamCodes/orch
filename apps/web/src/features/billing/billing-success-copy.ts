import type { AgencyPlan } from "@orch/workspace/tiers";

export type BillingSuccessCopy = {
  title: string;
  body: string;
  primary: string;
  primaryHref: "/canvas" | "/agency";
  secondary: string;
};

function isPaidAgencyPlan(plan: AgencyPlan): boolean {
  return plan === "agency" || plan === "agency_unlimited";
}

export function billingCreditsAddedCopy(plan: AgencyPlan): BillingSuccessCopy {
  if (isPaidAgencyPlan(plan)) {
    return {
      title: "Orch credits added",
      body: "These credits are ready for Orch on this team.",
      primary: "Open Tracker",
      primaryHref: "/agency",
      secondary: "Manage billing",
    };
  }

  return {
    title: "Orch credits added",
    body: "Use them with Orch while this team is on leftover limits. Subscribe when you want full Agency.",
    primary: "Open Canvas",
    primaryHref: "/canvas",
    secondary: "Manage billing",
  };
}

export function billingSuccessWithoutCheckoutCopy(plan: AgencyPlan): BillingSuccessCopy {
  switch (plan) {
    case "agency":
    case "agency_unlimited":
      return {
        title: "Billing",
        body: "Manage seats, credits, and invoices for this team.",
        primary: "Open Tracker",
        primaryHref: "/agency",
        secondary: "Manage billing",
      };
    case "trial":
      return {
        title: "Team billing",
        body: "Your trial is active on this team. Subscribe to keep Agency after it ends.",
        primary: "Open Canvas",
        primaryHref: "/canvas",
        secondary: "Manage billing",
      };
    case "leftover":
      return {
        title: "Team billing",
        body: "This team is on leftover limits. Subscribe to unlock full Agency.",
        primary: "Open Canvas",
        primaryHref: "/canvas",
        secondary: "Manage billing",
      };
    default: {
      const _exhaustive: never = plan;
      return _exhaustive;
    }
  }
}
