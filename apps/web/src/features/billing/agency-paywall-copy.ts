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

export function agencySeatInviteCopy(): AgencySeatInviteCopy {
  return {
    title: "Add a seat",
    body: "Trial is solo. Adding someone starts Agency billing for this team.",
    primary: "Continue to checkout",
    secondary: "Cancel",
  };
}
