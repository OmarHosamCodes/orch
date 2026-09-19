import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { workspaceTeam } from "./team";
import { canvasWorkspace } from "./workspace";

export const workspaceObject = pgTable(
  "workspace_object",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    canvasWorkspaceId: text("canvas_workspace_id")
      .notNull()
      .references(() => canvasWorkspace.id, { onDelete: "cascade" }),
    objectType: text("object_type").notNull(),
    title: text("title").notNull(),
    visibility: text("visibility").notNull().default("private"),
    teamId: text("team_id").references(() => workspaceTeam.id, { onDelete: "cascade" }),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
    content: jsonb("content").$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("workspace_object_owner_updated_idx").on(table.ownerUserId, table.updatedAt),
    index("workspace_object_workspace_updated_idx").on(table.canvasWorkspaceId, table.updatedAt),
    index("workspace_object_team_type_idx").on(table.teamId, table.objectType),
    index("workspace_object_type_idx").on(table.objectType),
  ],
);

export const workspaceRelation = pgTable(
  "workspace_relation",
  {
    id: text("id").primaryKey(),
    fromObjectId: text("from_object_id")
      .notNull()
      .references(() => workspaceObject.id, { onDelete: "cascade" }),
    canvasWorkspaceId: text("canvas_workspace_id")
      .notNull()
      .references(() => canvasWorkspace.id, { onDelete: "cascade" }),
    fromObjectType: text("from_object_type").notNull(),
    toObjectType: text("to_object_type").notNull(),
    toObjectId: text("to_object_id").notNull(),
    relationType: text("relation_type").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => workspaceTeam.id, { onDelete: "cascade" }),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_relation_from_to_type_unique").on(
      table.fromObjectId,
      table.toObjectType,
      table.toObjectId,
      table.relationType,
    ),
    index("workspace_relation_from_idx").on(table.fromObjectId),
    index("workspace_relation_to_idx").on(table.toObjectType, table.toObjectId),
    index("workspace_relation_workspace_idx").on(table.canvasWorkspaceId),
    index("workspace_relation_team_type_idx").on(table.teamId, table.relationType),
    index("workspace_relation_type_idx").on(table.relationType),
  ],
);

export const workspacePlacement = pgTable(
  "workspace_placement",
  {
    id: text("id").primaryKey(),
    objectId: text("object_id").notNull(),
    canvasWorkspaceId: text("canvas_workspace_id")
      .notNull()
      .references(() => canvasWorkspace.id, { onDelete: "cascade" }),
    objectType: text("object_type"),
    teamId: text("team_id").references(() => workspaceTeam.id, { onDelete: "cascade" }),
    viewId: text("view_id").notNull().default("board"),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    width: doublePrecision("width").notNull(),
    height: doublePrecision("height").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_placement_object_view_owner_unique").on(
      table.objectId,
      table.viewId,
      table.ownerUserId,
    ),
    index("workspace_placement_owner_view_idx").on(table.ownerUserId, table.viewId),
    index("workspace_placement_workspace_view_idx").on(table.canvasWorkspaceId, table.viewId),
    index("workspace_placement_type_idx").on(table.objectType),
  ],
);

export const workspaceRevision = pgTable(
  "workspace_revision",
  {
    id: text("id").primaryKey(),
    objectId: text("object_id").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    proposalId: text("proposal_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("workspace_revision_object_created_idx").on(table.objectId, table.createdAt)],
);
