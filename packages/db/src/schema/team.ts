import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export type WorkspaceTeamRole = "owner" | "editor" | "viewer";
export type WorkspaceTeamInviteStatus = "pending" | "accepted" | "declined";

export const workspaceTeam = pgTable(
  "workspace_team",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** Storage key for the team/agency profile image (mirrors user.image). */
    image: text("image"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("workspace_team_created_by_user_idx").on(table.createdByUserId)],
);

export const workspaceTeamMember = pgTable(
  "workspace_team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<WorkspaceTeamRole>().notNull().default("viewer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_team_member_team_user_unique").on(table.teamId, table.userId),
    index("workspace_team_member_user_idx").on(table.userId),
    index("workspace_team_member_team_idx").on(table.teamId),
  ],
);

export const workspaceTeamInvite = pgTable(
  "workspace_team_invite",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => workspaceTeam.id, { onDelete: "cascade" }),
    invitedUserId: text("invited_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<WorkspaceTeamRole>().notNull().default("viewer"),
    status: text("status").$type<WorkspaceTeamInviteStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    respondedAt: timestamp("responded_at"),
  },
  (table) => [
    uniqueIndex("workspace_team_invite_team_user_unique").on(table.teamId, table.invitedUserId),
    index("workspace_team_invite_invited_user_idx").on(table.invitedUserId),
    index("workspace_team_invite_team_status_idx").on(table.teamId, table.status),
  ],
);
