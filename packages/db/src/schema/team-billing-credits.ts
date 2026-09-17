import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceTeam } from "./team";

export const workspaceTeamBillingCreditGrant = pgTable("workspace_team_billing_credit_grant", {
  checkoutId: text("checkout_id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => workspaceTeam.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
