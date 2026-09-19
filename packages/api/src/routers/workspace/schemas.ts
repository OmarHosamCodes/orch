import { knowledgeActionSchema } from "@orch/agent/knowledge-actions";
import {
  knowledgeObjectTypeSchema,
  knowledgeTargetSchema,
  workspaceMarketplaceItemSchema,
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceListOutputSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceNodeSchema,
  workspaceNodeVisibilitySchema,
  workspaceSaveInputSchema,
} from "@orch/workspace";
import { z } from "zod";

import {
  agencyEntityIconKeySchema,
  agencyProjectColorHueIdSchema,
} from "../agency-ops/shared/schemas";

export const canvasWorkspaceIdSchema = z.string().min(1);

export const canvasWorkspaceRecordSchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string(),
  iconKey: agencyEntityIconKeySchema.nullable(),
  colorHueId: agencyProjectColorHueIdSchema.nullable(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const workspaceShareNodeInputSchema = z.object({
  nodeId: z.string().min(1),
  teamId: z.string().min(1),
  canvasWorkspaceId: canvasWorkspaceIdSchema.optional(),
});

export const workspaceUnshareNodeInputSchema = z.object({
  nodeId: z.string().min(1),
});

export const workspaceDeleteNodeInputSchema = z.object({
  nodeId: z.string().min(1),
  ownerUserId: z.string().min(1).optional(),
});

export const workspaceSnapshotOutputSchema = z.object({
  canvasWorkspaceId: canvasWorkspaceIdSchema,
  nodes: z.array(workspaceNodeSchema),
  updatedAt: z.string().datetime().nullable(),
});

export const workspaceSaveOutputSchema = z.object({
  nodeCount: z.number().int().nonnegative(),
  savedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const workspaceShareNodeOutputSchema = z.object({
  nodeId: z.string().min(1),
  teamId: z.string().min(1),
  visibility: workspaceNodeVisibilitySchema,
});

export const workspaceUnshareNodeOutputSchema = z.object({
  nodeId: z.string().min(1),
  visibility: workspaceNodeVisibilitySchema,
});

export const workspaceDeleteNodeOutputSchema = z.object({
  nodeId: z.string().min(1),
  ownerUserId: z.string().min(1),
  deleted: z.boolean(),
});

export const workspaceGetInputSchema = z.object({
  canvasWorkspaceId: canvasWorkspaceIdSchema,
});

export const workspaceKnowledgeQueryInputSchema = z.object({
  canvasWorkspaceId: canvasWorkspaceIdSchema.optional(),
  teamId: z.string().min(1).optional(),
  objectType: knowledgeObjectTypeSchema.optional(),
  query: z.string().trim().min(1).optional(),
  about: knowledgeTargetSchema.optional(),
  limit: z.number().int().min(1).max(50).optional(),
  includePlaced: z.boolean().optional(),
  includeAgency: z.boolean().optional(),
});

export const workspaceKnowledgeGetInputSchema = z.object({
  id: z.string().min(1),
  objectType: workspaceKnowledgeQueryInputSchema.shape.objectType,
  teamId: z.string().min(1).optional(),
});

export const workspaceKnowledgeBoardInputSchema = z.object({
  canvasWorkspaceId: canvasWorkspaceIdSchema,
  teamId: z.string().min(1).optional(),
});

export const workspaceKnowledgeCaptureInputSchema = z.object({
  action: knowledgeActionSchema,
  canvasWorkspaceId: canvasWorkspaceIdSchema,
  teamId: z.string().min(1).nullable().optional(),
  label: z.string().trim().min(1).max(200).optional(),
});

export {
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceListOutputSchema,
  workspaceMarketplaceItemSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
};
