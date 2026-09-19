import {
  knowledgeBoardCardSchema,
  knowledgeObjectSchema,
  knowledgeObjectViewSchema,
  knowledgeRelationSchema,
} from "@orch/workspace";
import { z } from "zod";

import {
  agencyEntityIconKeySchema,
  agencyProjectColorHueIdSchema,
} from "../agency-ops/shared/schemas";
import { protectedProcedure } from "../../procedures";
import {
  archiveCanvasWorkspace,
  createCanvasWorkspace,
  getCanvasWorkspace,
  listCanvasWorkspaces,
  updateCanvasWorkspace,
} from "./canvas-workspace-service";
import { captureKnowledgeAction } from "./knowledge-capture";
import { getKnowledgeObject, listKnowledgeBoard, queryKnowledgeObjects } from "./knowledge-service";
import {
  canvasWorkspaceRecordSchema,
  workspaceDeleteNodeInputSchema,
  workspaceDeleteNodeOutputSchema,
  workspaceGetInputSchema,
  workspaceKnowledgeBoardInputSchema,
  workspaceKnowledgeCaptureInputSchema,
  workspaceKnowledgeGetInputSchema,
  workspaceKnowledgeQueryInputSchema,
  workspaceMarketplaceItemSchema,
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceListOutputSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
  workspaceSaveOutputSchema,
  workspaceShareNodeInputSchema,
  workspaceShareNodeOutputSchema,
  workspaceSnapshotOutputSchema,
  workspaceUnshareNodeInputSchema,
  workspaceUnshareNodeOutputSchema,
} from "./schemas";
import {
  deleteWorkspaceNode,
  assertCanSaveWorkspaceNodes,
  getWorkspaceMarketplaceItems,
  getWorkspaceSnapshot,
  resolveCanvasWorkspaceForNode,
  saveWorkspaceMarketplaceItem,
  saveWorkspaceNodes,
  shareWorkspaceNode,
  unshareWorkspaceNode,
} from "./service";

export const workspaceRouter = {
  brains: {
    list: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }).optional())
      .handler(async ({ context, input }) =>
        z
          .object({ items: z.array(canvasWorkspaceRecordSchema) })
          .parse(await listCanvasWorkspaces(context.session.user.id, input ?? {})),
      ),
    get: protectedProcedure
      .input(z.object({ canvasWorkspaceId: z.string().min(1) }))
      .handler(async ({ context, input }) =>
        canvasWorkspaceRecordSchema.parse(await getCanvasWorkspace(context.session.user.id, input)),
      ),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().trim().min(1).max(120),
          instructions: z.string().max(8000).optional(),
          iconKey: agencyEntityIconKeySchema.nullable().optional(),
          colorHueId: agencyProjectColorHueIdSchema.nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) =>
        canvasWorkspaceRecordSchema.parse(
          await createCanvasWorkspace(context.session.user.id, input),
        ),
      ),
    update: protectedProcedure
      .input(
        z.object({
          canvasWorkspaceId: z.string().min(1),
          title: z.string().trim().min(1).max(120).optional(),
          instructions: z.string().max(8000).optional(),
          iconKey: agencyEntityIconKeySchema.nullable().optional(),
          colorHueId: agencyProjectColorHueIdSchema.nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) =>
        canvasWorkspaceRecordSchema.parse(
          await updateCanvasWorkspace(context.session.user.id, input),
        ),
      ),
    archive: protectedProcedure
      .input(z.object({ canvasWorkspaceId: z.string().min(1) }))
      .handler(async ({ context, input }) =>
        canvasWorkspaceRecordSchema.parse(
          await archiveCanvasWorkspace(context.session.user.id, input),
        ),
      ),
    forNode: protectedProcedure
      .input(z.object({ nodeId: z.string().min(1) }))
      .handler(async ({ context, input }) =>
        z
          .object({ canvasWorkspaceId: z.string().min(1) })
          .parse(await resolveCanvasWorkspaceForNode(context.session.user.id, input)),
      ),
  },
  get: protectedProcedure.input(workspaceGetInputSchema).handler(async ({ context, input }) =>
    workspaceSnapshotOutputSchema.parse({
      canvasWorkspaceId: input.canvasWorkspaceId,
      ...(await getWorkspaceSnapshot(context.session.user.id, input)),
    }),
  ),
  save: protectedProcedure.input(workspaceSaveInputSchema).handler(async ({ input, context }) => {
    await assertCanSaveWorkspaceNodes(context.session.user.id, { nodes: input.nodes });
    return workspaceSaveOutputSchema.parse(
      await saveWorkspaceNodes(context.session.user.id, {
        canvasWorkspaceId: input.canvasWorkspaceId,
        nodes: input.nodes,
      }),
    );
  }),
  shareNode: protectedProcedure
    .input(workspaceShareNodeInputSchema)
    .handler(async ({ context, input }) =>
      workspaceShareNodeOutputSchema.parse(
        await shareWorkspaceNode(context.session.user.id, input),
      ),
    ),
  unshareNode: protectedProcedure
    .input(workspaceUnshareNodeInputSchema)
    .handler(async ({ context, input }) =>
      workspaceUnshareNodeOutputSchema.parse(
        await unshareWorkspaceNode(context.session.user.id, input),
      ),
    ),
  deleteNode: protectedProcedure
    .input(workspaceDeleteNodeInputSchema)
    .handler(async ({ context, input }) =>
      workspaceDeleteNodeOutputSchema.parse(
        await deleteWorkspaceNode(context.session.user.id, input),
      ),
    ),
  knowledge: {
    query: protectedProcedure
      .input(workspaceKnowledgeQueryInputSchema)
      .handler(async ({ context, input }) =>
        z
          .object({ items: z.array(knowledgeObjectViewSchema) })
          .parse(await queryKnowledgeObjects(context.session.user.id, input)),
      ),
    get: protectedProcedure
      .input(workspaceKnowledgeGetInputSchema)
      .handler(async ({ context, input }) =>
        z
          .object({
            view: knowledgeObjectViewSchema,
            object: knowledgeObjectSchema.nullable(),
            relations: z.array(knowledgeRelationSchema),
            revisions: z.array(z.unknown()),
          })
          .parse(await getKnowledgeObject(context.session.user.id, input)),
      ),
    board: protectedProcedure
      .input(workspaceKnowledgeBoardInputSchema)
      .handler(async ({ context, input }) =>
        z
          .object({
            items: z.array(knowledgeBoardCardSchema),
            unplaced: z.array(knowledgeBoardCardSchema),
          })
          .parse(await listKnowledgeBoard(context.session.user.id, input)),
      ),
    capture: protectedProcedure
      .input(workspaceKnowledgeCaptureInputSchema)
      .handler(async ({ context, input }) =>
        z
          .object({
            status: z.enum(["applied", "pending"]),
            proposalId: z.string().nullable(),
            objectId: z.string().nullable(),
            before: z.unknown(),
            after: z.unknown(),
            label: z.string(),
          })
          .parse(await captureKnowledgeAction(context.session.user.id, input)),
      ),
  },
  marketplace: {
    list: protectedProcedure
      .input(workspaceMarketplaceListInputSchema)
      .handler(async ({ input, context }) =>
        workspaceMarketplaceListOutputSchema.parse(
          await getWorkspaceMarketplaceItems(context.session.user.id, input),
        ),
      ),
    save: protectedProcedure
      .input(workspaceMarketplaceSaveInputSchema)
      .handler(async ({ input, context }) =>
        workspaceMarketplaceItemSchema.parse(
          await saveWorkspaceMarketplaceItem(context.session.user.id, {
            actorUserName: context.session.user.name,
            item: input,
          }),
        ),
      ),
  },
};
