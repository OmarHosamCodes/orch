import {
  knowledgeBoardCardSchema,
  knowledgeObjectSchema,
  knowledgeObjectViewSchema,
  knowledgeRelationSchema,
} from "@orch/workspace";
import { z } from "zod";

import { protectedProcedure } from "../../procedures";
import { captureKnowledgeAction } from "./knowledge-capture";
import { getKnowledgeObject, listKnowledgeBoard, queryKnowledgeObjects } from "./knowledge-service";
import {
  workspaceDeleteNodeInputSchema,
  workspaceDeleteNodeOutputSchema,
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
  saveWorkspaceMarketplaceItem,
  saveWorkspaceNodes,
  shareWorkspaceNode,
  unshareWorkspaceNode,
} from "./service";

export const workspaceRouter = {
  get: protectedProcedure.handler(async ({ context }) =>
    workspaceSnapshotOutputSchema.parse(await getWorkspaceSnapshot(context.session.user.id, {})),
  ),
  save: protectedProcedure.input(workspaceSaveInputSchema).handler(async ({ input, context }) => {
    await assertCanSaveWorkspaceNodes(context.session.user.id, { nodes: input.nodes });
    return workspaceSaveOutputSchema.parse(
      await saveWorkspaceNodes(context.session.user.id, { nodes: input.nodes }),
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
