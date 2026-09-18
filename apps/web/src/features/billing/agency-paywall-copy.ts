export type AgencyPaywallCopy = {
  eyebrow: string;
  title: string;
  body: string;
  primary: string;
  secondary: string;
};

export function agencyPaywallCopy(_plan: "leftover"): AgencyPaywallCopy {
  return {
    eyebrow: "Agency",
    title: "Trial ended",
    body: "Subscribe to keep Tracker, projects, money, and people for this agency. Canvas stays available on the leftover limits.",
    primary: "Subscribe — 1 seat",
    secondary: "Open Canvas",
  };
}

export type AgencySeatInviteCopy = {
  title: string;
  body: string;
  primary: string;
  secondary: string;
};

export const AGENCY_SEAT_REQUIRED_INVITE_BODY =
  "Every member needs a seat. Add a seat to invite them.";

const TRIAL_SEAT_INVITE_BODY =
  "Trial is solo. Adding someone starts Agency billing for this team.";

export function agencySeatInviteCopy(plan: "trial" | "leftover" | "agency" | "agency_unlimited"): AgencySeatInviteCopy {
  const shared = {
    title: "Add a seat",
    primary: "Continue to checkout",
    secondary: "Cancel",
  };

  if (plan === "trial" || plan === "leftover") {
    return { ...shared, body: TRIAL_SEAT_INVITE_BODY };
  }

  return { ...shared, body: AGENCY_SEAT_REQUIRED_INVITE_BODY };
}
