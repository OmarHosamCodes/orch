export const TIERS = ["free", "pro"] as const;
export type Tier = (typeof TIERS)[number];

export type TierLimits = {
  workspaceNodes: number;
  blocksPerTab: number;
  tabsPerNode: number;
  teams: number;
  teamMembers: number;
  aiConversations: number;
  agencyOps: boolean;
  marketplacePublish: boolean;
};

export const TIER_LIMITS = {
  free: {
    workspaceNodes: 10,
    blocksPerTab: 6,
    tabsPerNode: 3,
    teams: 1,
    teamMembers: 3,
    aiConversations: 5,
    agencyOps: false,
    marketplacePublish: false,
  },
  pro: {
    workspaceNodes: 200,
    blocksPerTab: 24,
    tabsPerNode: 12,
    teams: 5,
    teamMembers: 20,
    aiConversations: -1, // unlimited
    agencyOps: true,
    marketplacePublish: true,
  },
} as const satisfies Record<Tier, TierLimits>;

export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier];
}

export type GatedFeature = "agencyOps" | "marketplacePublish";

export function canAccessFeature(tier: Tier, feature: GatedFeature): boolean {
  return TIER_LIMITS[tier][feature];
}

export const AGENCY_PLANS = ["trial", "leftover", "agency", "agency_unlimited"] as const;
export type AgencyPlan = (typeof AGENCY_PLANS)[number];

export type AgencyPlanLimits = {
  clients: number | null;
  projects: number | null;
  tasksPerProject: number | null;
  workspaceNodes: number;
  blocksPerTab: number;
  tabsPerNode: number;
  teams: number;
  orchMessagesIncluded: number;
  orchMessagesPeriod: "lifetime" | "month";
  brandedInvoices: boolean;
  marketplaceView: boolean;
  marketplacePublish: boolean;
  taskAndKnowledgeUploads: boolean;
};

export const AGENCY_PLAN_LIMITS = {
  trial: {
    clients: 10,
    projects: 30,
    tasksPerProject: 2,
    workspaceNodes: 3,
    blocksPerTab: 2,
    tabsPerNode: 1,
    teams: 1,
    orchMessagesIncluded: 5,
    orchMessagesPeriod: "lifetime",
    brandedInvoices: false,
    marketplaceView: false,
    marketplacePublish: false,
    taskAndKnowledgeUploads: false,
  },
  leftover: {
    clients: 0,
    projects: 0,
    tasksPerProject: 0,
    workspaceNodes: 3,
    blocksPerTab: 2,
    tabsPerNode: 1,
    teams: 1,
    orchMessagesIncluded: 5,
    orchMessagesPeriod: "lifetime",
    brandedInvoices: false,
    marketplaceView: false,
    marketplacePublish: false,
    taskAndKnowledgeUploads: false,
  },
  agency: {
    clients: 100,
    projects: 300,
    tasksPerProject: 50,
    workspaceNodes: 50,
    blocksPerTab: 24,
    tabsPerNode: 12,
    teams: 1,
    orchMessagesIncluded: 50,
    orchMessagesPeriod: "month",
    brandedInvoices: true,
    marketplaceView: true,
    marketplacePublish: false,
    taskAndKnowledgeUploads: true,
  },
  agency_unlimited: {
    clients: null,
    projects: null,
    tasksPerProject: null,
    workspaceNodes: 10_000,
    blocksPerTab: 24,
    tabsPerNode: 12,
    teams: 1,
    orchMessagesIncluded: 200,
    orchMessagesPeriod: "month",
    brandedInvoices: true,
    marketplaceView: true,
    marketplacePublish: true,
    taskAndKnowledgeUploads: true,
  },
} as const satisfies Record<AgencyPlan, AgencyPlanLimits>;

export function agencyEnabled(plan: AgencyPlan): boolean {
  return plan === "trial" || plan === "agency" || plan === "agency_unlimited";
}

export function legacyTier(plan: AgencyPlan): "free" | "pro" {
  return agencyEnabled(plan) ? "pro" : "free";
}

export function resolvePlanAt(input: {
  storedPlan: AgencyPlan;
  trialEndsAt: Date;
  now: Date;
}): AgencyPlan {
  if (input.storedPlan === "trial" && input.now.getTime() > input.trialEndsAt.getTime()) {
    return "leftover";
  }
  return input.storedPlan;
}
