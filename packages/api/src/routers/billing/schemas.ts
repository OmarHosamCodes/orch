import { AGENCY_PLANS, TIERS } from "@orch/workspace/tiers";
import { z } from "zod";

export const agencyPlanLimitsSchema = z.object({
  clients: z.number().int().nonnegative().nullable(),
  projects: z.number().int().nonnegative().nullable(),
  tasksPerProject: z.number().int().nonnegative().nullable(),
  workspaceNodes: z.number().int(),
  blocksPerTab: z.number().int(),
  tabsPerNode: z.number().int(),
  teams: z.number().int(),
  orchMessagesIncluded: z.number().int(),
  orchMessagesPeriod: z.enum(["lifetime", "month"]),
  brandedInvoices: z.boolean(),
  marketplaceView: z.boolean(),
  marketplacePublish: z.boolean(),
  taskAndKnowledgeUploads: z.boolean(),
});

export const teamBillingSnapshotSchema = z.object({
  teamId: z.string().min(1),
  plan: z.enum(AGENCY_PLANS),
  seats: z.number().int().positive(),
  trialEndsAt: z.string().datetime(),
  polarSubscriptionId: z.string().nullable(),
  polarProductId: z.string().nullable(),
  orchMessagesUsed: z.number().int().nonnegative(),
  orchMessagesIncluded: z.number().int().nonnegative(),
  orchCreditsRemaining: z.number().int().nonnegative(),
  limits: agencyPlanLimitsSchema,
});

export const checkoutUrlSchema = z.object({
  url: z.string().url(),
});

export const billingStateSchema = z.object({
  plan: z.enum(AGENCY_PLANS),
  tier: z.enum(TIERS),
  agencyEnabled: z.boolean(),
  seats: z.number().int().positive(),
  trialEndsAt: z.string().datetime(),
  subscription: z
    .object({
      productId: z.string().min(1),
      status: z.string().min(1),
      currentPeriodEnd: z.string().datetime().nullable(),
      source: z.enum(["polar", "lifetime"]),
      isLifetime: z.boolean(),
    })
    .nullable(),
  limits: z.object({
    clients: z.number().int().nonnegative().nullable(),
    projects: z.number().int().nonnegative().nullable(),
    tasksPerProject: z.number().int().nonnegative().nullable(),
    workspaceNodes: z.number().int(),
    blocksPerTab: z.number().int(),
    tabsPerNode: z.number().int(),
    teams: z.number().int(),
    orchMessagesIncluded: z.number().int(),
    orchMessagesPeriod: z.enum(["lifetime", "month"]),
    brandedInvoices: z.boolean(),
    marketplaceView: z.boolean(),
    taskAndKnowledgeUploads: z.boolean(),
    teamMembers: z.number().int(),
    aiConversations: z.number().int(),
    agencyOps: z.boolean(),
    marketplacePublish: z.boolean(),
  }),
});
