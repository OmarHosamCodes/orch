import type { AgencyPlan } from "@orch/workspace/tiers";

export function isPaidAgencyPlan(plan: AgencyPlan | undefined): boolean {
  return plan === "agency" || plan === "agency_unlimited";
}

export function agencyPlanLabel(
  plan: AgencyPlan | undefined,
): "Trial" | "Leftover" | "Agency" | "Agency Unlimited" {
  switch (plan) {
    case "trial":
      return "Trial";
    case "leftover":
      return "Leftover";
    case "agency":
      return "Agency";
    case "agency_unlimited":
      return "Agency Unlimited";
    case undefined:
      return "Trial";
    default: {
      const _exhaustive: never = plan;
      return _exhaustive;
    }
  }
}
