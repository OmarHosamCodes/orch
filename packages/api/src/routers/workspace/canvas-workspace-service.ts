import { db } from "@orch/db";
import { canvasWorkspace, dashboardWorkspace } from "@orch/db/schema";
import {
  CANVAS_WORKSPACE_OWNER_LIMIT,
  DEFAULT_CANVAS_WORKSPACE_TITLE,
  createWorkspaceId,
} from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import type { AgencyEntityIconKey } from "../agency-ops/shared/entity-icon-catalog";
import { isAgencyEntityIconKey } from "../agency-ops/shared/entity-icon-catalog";
import {
  buildCanvasBrainCreateSettings,
  mergeCanvasBrainAppearanceSettings,
  readCanvasBrainAppearance,
} from "./canvas-brain-appearance";

export type CanvasWorkspaceRecord = {
  id: string;
  ownerUserId: string;
  title: string;
  instructions: string;
  iconKey: AgencyEntityIconKey | null;
  colorHueId: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(value: Date) {
  return value.toISOString();
}

function mapCanvasWorkspace(row: typeof canvasWorkspace.$inferSelect): CanvasWorkspaceRecord {
  const appearance = readCanvasBrainAppearance(row.settings ?? {});
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    title: row.title,
    instructions: row.instructions,
    iconKey: appearance.iconKey,
    colorHueId: appearance.colorHueId,
    archivedAt: row.archivedAt ? toIso(row.archivedAt) : null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function requireOwnedCanvasWorkspace(
  actorUserId: string,
  input: { canvasWorkspaceId: string; allowArchived?: boolean },
) {
  const [row] = await db
    .select()
    .from(canvasWorkspace)
    .where(
      and(
        eq(canvasWorkspace.id, input.canvasWorkspaceId),
        eq(canvasWorkspace.ownerUserId, actorUserId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }
  if (!input.allowArchived && row.archivedAt) {
    throw new ORPCError("NOT_FOUND");
  }
  return mapCanvasWorkspace(row);
}

async function countActiveWorkspaces(actorUserId: string) {
  const rows = await db
    .select({ id: canvasWorkspace.id })
    .from(canvasWorkspace)
    .where(and(eq(canvasWorkspace.ownerUserId, actorUserId), isNull(canvasWorkspace.archivedAt)));
  return rows.length;
}

async function insertEmptyBoard(workspaceId: string, ownerUserId: string, now: Date) {
  await db
    .insert(dashboardWorkspace)
    .values({
      workspaceId,
      ownerUserId,
      nodes: [],
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function ensureDefaultCanvasWorkspace(
  actorUserId: string,
  _input: Record<string, never> = {},
) {
  // The default brain is the frozen Legacy Canvas. Do not change board isolation here as part of a redesign.
  void _input;
  const [existing] = await db
    .select()
    .from(canvasWorkspace)
    .where(and(eq(canvasWorkspace.ownerUserId, actorUserId), isNull(canvasWorkspace.archivedAt)))
    .orderBy(asc(canvasWorkspace.createdAt), asc(canvasWorkspace.id))
    .limit(1);

  if (existing) {
    await insertEmptyBoard(existing.id, actorUserId, new Date());
    return mapCanvasWorkspace(existing);
  }

  const now = new Date();
  const id = createWorkspaceId("cws");
  const [created] = await db
    .insert(canvasWorkspace)
    .values({
      id,
      ownerUserId: actorUserId,
      title: DEFAULT_CANVAS_WORKSPACE_TITLE,
      instructions: "",
      settings: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }
  await insertEmptyBoard(created.id, actorUserId, now);
  return mapCanvasWorkspace(created);
}

export async function listCanvasWorkspaces(
  actorUserId: string,
  input: { includeArchived?: boolean },
) {
  await ensureDefaultCanvasWorkspace(actorUserId);
  const rows = await db
    .select()
    .from(canvasWorkspace)
    .where(
      input.includeArchived
        ? eq(canvasWorkspace.ownerUserId, actorUserId)
        : and(eq(canvasWorkspace.ownerUserId, actorUserId), isNull(canvasWorkspace.archivedAt)),
    )
    .orderBy(asc(canvasWorkspace.createdAt), asc(canvasWorkspace.id));

  return { items: rows.map(mapCanvasWorkspace) };
}

export async function getCanvasWorkspace(
  actorUserId: string,
  input: { canvasWorkspaceId: string },
) {
  return requireOwnedCanvasWorkspace(actorUserId, input);
}

export async function createCanvasWorkspace(
  actorUserId: string,
  input: {
    title: string;
    instructions?: string;
    iconKey?: AgencyEntityIconKey | null;
    colorHueId?: number | null;
  },
) {
  const title = input.title.trim();
  if (!title) {
    throw new ORPCError("BAD_REQUEST", { message: "Title is required." });
  }
  if (input.iconKey != null && !isAgencyEntityIconKey(input.iconKey)) {
    throw new ORPCError("BAD_REQUEST", { message: "Unknown icon." });
  }
  const activeCount = await countActiveWorkspaces(actorUserId);
  if (activeCount >= CANVAS_WORKSPACE_OWNER_LIMIT) {
    throw new ORPCError("FORBIDDEN", {
      message: `You can keep up to ${CANVAS_WORKSPACE_OWNER_LIMIT} brains.`,
    });
  }

  const now = new Date();
  const id = createWorkspaceId("cws");
  const [created] = await db
    .insert(canvasWorkspace)
    .values({
      id,
      ownerUserId: actorUserId,
      title,
      instructions: input.instructions?.trim() ?? "",
      settings: buildCanvasBrainCreateSettings({
        iconKey: input.iconKey,
        colorHueId: input.colorHueId,
      }),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }
  await insertEmptyBoard(created.id, actorUserId, now);
  return mapCanvasWorkspace(created);
}

export async function updateCanvasWorkspace(
  actorUserId: string,
  input: {
    canvasWorkspaceId: string;
    title?: string;
    instructions?: string;
    iconKey?: AgencyEntityIconKey | null;
    colorHueId?: number | null;
  },
) {
  const [existing] = await db
    .select()
    .from(canvasWorkspace)
    .where(
      and(
        eq(canvasWorkspace.id, input.canvasWorkspaceId),
        eq(canvasWorkspace.ownerUserId, actorUserId),
        isNull(canvasWorkspace.archivedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND");
  }

  if (input.iconKey != null && !isAgencyEntityIconKey(input.iconKey)) {
    throw new ORPCError("BAD_REQUEST", { message: "Unknown icon." });
  }

  const now = new Date();
  const nextSettings =
    input.iconKey !== undefined || input.colorHueId !== undefined
      ? mergeCanvasBrainAppearanceSettings(existing.settings ?? {}, {
          ...(input.iconKey !== undefined ? { iconKey: input.iconKey } : {}),
          ...(input.colorHueId !== undefined ? { colorHueId: input.colorHueId } : {}),
        })
      : existing.settings;

  const [updated] = await db
    .update(canvasWorkspace)
    .set({
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.instructions !== undefined ? { instructions: input.instructions.trim() } : {}),
      ...(input.iconKey !== undefined || input.colorHueId !== undefined
        ? { settings: nextSettings }
        : {}),
      updatedAt: now,
    })
    .where(
      and(
        eq(canvasWorkspace.id, input.canvasWorkspaceId),
        eq(canvasWorkspace.ownerUserId, actorUserId),
      ),
    )
    .returning();

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }
  return mapCanvasWorkspace(updated);
}

export async function archiveCanvasWorkspace(
  actorUserId: string,
  input: { canvasWorkspaceId: string },
) {
  await requireOwnedCanvasWorkspace(actorUserId, { canvasWorkspaceId: input.canvasWorkspaceId });
  const activeCount = await countActiveWorkspaces(actorUserId);
  if (activeCount <= 1) {
    throw new ORPCError("BAD_REQUEST", { message: "Keep at least one brain." });
  }
  const now = new Date();
  const [updated] = await db
    .update(canvasWorkspace)
    .set({ archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(canvasWorkspace.id, input.canvasWorkspaceId),
        eq(canvasWorkspace.ownerUserId, actorUserId),
      ),
    )
    .returning();

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }
  return mapCanvasWorkspace(updated);
}

export async function listCanvasWorkspaceTitleMap(
  actorUserId: string,
  input: { workspaceIds: string[] },
) {
  void actorUserId;
  if (input.workspaceIds.length === 0) {
    return new Map<string, string>();
  }
  const uniqueIds = [...new Set(input.workspaceIds)];
  const rows = await db
    .select({ id: canvasWorkspace.id, title: canvasWorkspace.title })
    .from(canvasWorkspace)
    .where(inArray(canvasWorkspace.id, uniqueIds));
  return new Map(rows.map((row) => [row.id, row.title]));
}
