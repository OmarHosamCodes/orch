import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaceTeam } from "./team";

export type AgencyBillingStoredPlan = "trial" | "leftover" | "agency" | "agency_unlimited";

export const workspaceTeamBilling = pgTable(
  "workspace_team_billing",
  {
    teamId: text("team_id")
      .primaryKey()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    plan: text("plan").$type<AgencyBillingStoredPlan>().notNull().default("trial"),
    seats: integer("seats").notNull().default(1),
    trialEndsAt: timestamp("trial_ends_at").notNull(),
    polarSubscriptionId: text("polar_subscription_id"),
    polarProductId: text("polar_product_id"),
    orchMessagesUsed: integer("orch_messages_used").notNull().default(0),
    orchCreditsRemaining: integer("orch_credits_remaining").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("workspace_team_billing_polar_sub_idx").on(table.polarSubscriptionId)],
);
