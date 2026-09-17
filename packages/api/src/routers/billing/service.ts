import { getTeamBilling } from "../../billing-team";
import { requireTeamMembership } from "../../lib/team-membership";
import { agencyEnabled, legacyTier } from "@orch/workspace/tiers";

export async function getSubscriptionBillingState(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId);
  const billing = await getTeamBilling(input.teamId);

  return {
    plan: billing.plan,
    tier: legacyTier(billing.plan),
    agencyEnabled: agencyEnabled(billing.plan),
    seats: billing.seats,
    trialEndsAt: billing.trialEndsAt,
    subscription: null,
    limits: {
      ...billing.limits,
      aiConversations: Math.max(1, billing.orchMessagesIncluded),
      teamMembers: billing.seats,
      agencyOps: agencyEnabled(billing.plan),
    },
  };
}
