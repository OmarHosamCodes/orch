export type BillingCreditsAddedCopy = {
  title: string;
  body: string;
  primary: string;
  secondary: string;
};

export function billingCreditsAddedCopy(): BillingCreditsAddedCopy {
  return {
    title: "Orch credits added",
    body: "These credits apply to Orch on this team. Subscribe separately when you want full Agency access.",
    primary: "Open Canvas",
    secondary: "Manage billing",
  };
}
