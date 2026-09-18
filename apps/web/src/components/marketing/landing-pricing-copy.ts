export const LANDING_PRICING_HEADLINE = "Free to try. Agency when the trial ends.";
export const LANDING_PRICING_BODY =
  "Start on a 30-day Agency trial. After that, leftover Canvas stays on the leftover limits. Subscribe for seats when you are ready.";

export const LANDING_PRICING_COLUMNS = [
  {
    id: "trial",
    title: "Trial / leftover",
    price: "Free to try",
    hint: "30 days, then leftover Canvas",
  },
  { id: "agency", title: "Agency", price: "$19", hint: "per seat / month" },
  { id: "unlimited", title: "Agency Unlimited", price: "$19", hint: "per seat / month" },
] as const;

export const LANDING_PRICING_FEATURES = [
  { label: "Agency product", trial: "Trial only", agency: "On", unlimited: "On" },
  { label: "Clients", trial: "10", agency: "100", unlimited: "Uncapped" },
  { label: "Projects", trial: "30", agency: "300", unlimited: "Uncapped" },
  { label: "Tasks per project", trial: "2", agency: "50", unlimited: "Uncapped" },
  { label: "Workspace nodes", trial: "3", agency: "50", unlimited: "Uncapped" },
  { label: "Blocks per tab", trial: "2", agency: "24", unlimited: "24" },
  {
    label: "Orch messages",
    trial: "5 total",
    agency: "50 / seat / month",
    unlimited: "200 / seat / month",
  },
  { label: "Branded invoices", trial: "No", agency: "Yes", unlimited: "Yes" },
  { label: "Marketplace", trial: "No", agency: "View", unlimited: "Publish" },
  {
    label: "Task and knowledge files",
    trial: "No",
    agency: "50 MB / file",
    unlimited: "50 MB / file",
  },
] as const;

export function isPaidAgencyPlan(
  plan: "trial" | "leftover" | "agency" | "agency_unlimited" | undefined,
): boolean {
  return plan === "agency" || plan === "agency_unlimited";
}

export function landingAgencyCta(args: {
  isAuthenticated: boolean;
  plan: "trial" | "leftover" | "agency" | "agency_unlimited" | undefined;
}): { label: string; kind: "login" | "checkout-agency" | "portal" } {
  if (!args.isAuthenticated) return { label: "Get started", kind: "login" };
  if (isPaidAgencyPlan(args.plan)) return { label: "Manage billing", kind: "portal" };
  return { label: "Subscribe — 1 seat", kind: "checkout-agency" };
}

export function landingUnlimitedCta(args: {
  isAuthenticated: boolean;
  plan: "trial" | "leftover" | "agency" | "agency_unlimited" | undefined;
}): { label: string; kind: "login" | "checkout-unlimited" | "portal" } {
  if (!args.isAuthenticated) return { label: "Get started", kind: "login" };
  if (args.plan === "agency_unlimited") return { label: "Manage billing", kind: "portal" };
  return { label: "Subscribe", kind: "checkout-unlimited" };
}
