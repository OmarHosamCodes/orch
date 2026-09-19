import { z } from "zod";

import {
  DEFAULT_WORKSPACE_NODE_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
  DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
  DEFAULT_WORKSPACE_NODE_WIDTH,
} from "./constants";
import {
  workspaceAgencyRefSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeVisibilitySchema,
} from "./schemas";
import type { WorkspaceNode } from "./types";

export type WorkspaceKnowledgeAgencyRef = z.infer<typeof workspaceAgencyRefSchema>;

export const knowledgeObjectTypeSchema = z.enum([
  "document",
  "note",
  "decision",
  "person",
  "source",
  "folder",
  "agency.project",
  "agency.task",
  "agency.member",
  "agency.client",
  "agency.timeEntry",
]);

export const canvasNativeObjectTypeSchema = z.enum([
  "document",
  "note",
  "decision",
  "person",
  "source",
  "folder",
]);

export const knowledgeRelationTypeSchema = z.enum([
  "related",
  "about",
  "supports",
  "blocks",
  "mentions",
  "is",
  "in",
]);

export const knowledgeBoardCardKindSchema = z.enum([
  "document",
  "knowledge",
  "agency",
  "folder",
  "inbox",
]);

export const KNOWLEDGE_INBOX_CLUSTER_ID = "__knowledge-inbox";
export const KNOWLEDGE_INBOX_ORIGIN_X = -2800;
export const KNOWLEDGE_INBOX_ORIGIN_Y = -240;
export const KNOWLEDGE_INBOX_COLUMNS = 3;
export const KNOWLEDGE_INBOX_GAP = 24;
export const KNOWLEDGE_CARD_WIDTH = 280;
export const KNOWLEDGE_CARD_HEIGHT = 180;
export const KNOWLEDGE_FOLDER_WIDTH = 640;
export const KNOWLEDGE_FOLDER_HEIGHT = 420;
export const KNOWLEDGE_AGENCY_PIN_WIDTH = 260;
export const KNOWLEDGE_AGENCY_PIN_HEIGHT = 140;

export const knowledgeTargetSchema = z.object({
  objectType: knowledgeObjectTypeSchema,
  id: z.string().min(1),
});

export const knowledgeDecisionPropertiesSchema = z.object({
  status: z.enum(["open", "decided", "deferred"]).default("open"),
  recommendation: z.string().max(4000).default(""),
  decidedAt: z.string().datetime().nullable().default(null),
});

export const knowledgeFolderPropertiesSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const knowledgeSourcePropertiesSchema = z
  .object({
    kind: z.enum(["upload", "url"]),
    uploadId: z.string().trim().min(1).max(240).optional(),
    url: z.string().trim().url().max(2000).optional(),
    filename: z.string().trim().min(1).max(240).optional(),
    mediaType: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "upload" && !value.uploadId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uploadId"],
        message: "Upload sources require uploadId",
      });
    }
    if (value.kind === "url" && !value.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "URL sources require url",
      });
    }
  });

export const knowledgeDocumentContentSchema = z.object({
  body: z.string().max(4000).default(""),
  nodeType: z.enum(["standard", "orchestrator"]).default("standard"),
  label: z.string().max(120).optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  tabs: z.array(workspaceNodeTabSchema).default([]),
  customBlockTemplates: z.array(z.unknown()).default([]),
  viewState: z
    .object({
      activeTabId: z.string().min(1).nullable().optional(),
      notePreviewState: z.record(z.string(), z.boolean()).default({}),
    })
    .default({ activeTabId: null, notePreviewState: {} }),
  dashboard: z
    .object({
      tint: z.string().default("neutral"),
      featuredBlocks: z
        .array(z.object({ tabId: z.string().min(1), blockId: z.string().min(1) }))
        .default([]),
    })
    .default({ tint: "neutral", featuredBlocks: [] }),
});

export const knowledgeObjectSchema = z
  .object({
    id: z.string().min(1),
    objectType: canvasNativeObjectTypeSchema,
    title: z.string().trim().min(1).max(120),
    ownerUserId: z.string().min(1),
    canvasWorkspaceId: z.string().min(1).optional(),
    visibility: workspaceNodeVisibilitySchema.default("private"),
    teamId: z.string().min(1).nullable().optional(),
    properties: z.record(z.string(), z.unknown()).default({}),
    content: z.unknown().nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((object, ctx) => {
    if (object.visibility === "team" && !object.teamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamId"],
        message: "team-visible objects require teamId",
      });
    }
  });

export const knowledgeRelationSchema = z.object({
  id: z.string().min(1),
  fromObjectId: z.string().min(1),
  fromObjectType: canvasNativeObjectTypeSchema,
  toObjectType: knowledgeObjectTypeSchema,
  toObjectId: z.string().min(1),
  relationType: knowledgeRelationTypeSchema,
  ownerUserId: z.string().min(1),
  canvasWorkspaceId: z.string().min(1).optional(),
  teamId: z.string().min(1).nullable().optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const knowledgePlacementSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  canvasWorkspaceId: z.string().min(1).optional(),
  objectType: knowledgeObjectTypeSchema.optional(),
  teamId: z.string().min(1).nullable().optional(),
  viewId: z.string().min(1).default("board"),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  ownerUserId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KnowledgeObjectType = z.infer<typeof knowledgeObjectTypeSchema>;
export type CanvasNativeObjectType = z.infer<typeof canvasNativeObjectTypeSchema>;
export type AgencyKnowledgeObjectType = Extract<KnowledgeObjectType, `agency.${string}`>;
export type KnowledgeRelationType = z.infer<typeof knowledgeRelationTypeSchema>;
export type KnowledgeBoardCardKind = z.infer<typeof knowledgeBoardCardKindSchema>;
export type KnowledgeTarget = z.infer<typeof knowledgeTargetSchema>;
export type KnowledgeObject = z.infer<typeof knowledgeObjectSchema>;
export type KnowledgeRelation = z.infer<typeof knowledgeRelationSchema>;
export type KnowledgePlacement = z.infer<typeof knowledgePlacementSchema>;
export type KnowledgeFolderProperties = z.infer<typeof knowledgeFolderPropertiesSchema>;
export type KnowledgeSourceProperties = z.infer<typeof knowledgeSourcePropertiesSchema>;
export const knowledgeObjectViewSchema = z.object({
  origin: z.enum(["canvas", "agency"]),
  objectType: knowledgeObjectTypeSchema,
  id: z.string().min(1),
  title: z.string(),
  canvasWorkspaceId: z.string().nullable().optional(),
  canvasWorkspaceTitle: z.string().optional(),
  teamId: z.string().nullable(),
  href: z.string().nullable().optional(),
  missing: z.boolean().optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
  placement: knowledgePlacementSchema.nullable().optional(),
  relationCounts: z
    .object({
      in: z.number().int().nonnegative(),
      out: z.number().int().nonnegative(),
    })
    .optional(),
});

export type KnowledgeObjectView = z.infer<typeof knowledgeObjectViewSchema>;

export const knowledgeBoardCardSchema = z.object({
  id: z.string().min(1),
  kind: knowledgeBoardCardKindSchema,
  objectType: knowledgeObjectTypeSchema,
  title: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  parentId: z.string().min(1).nullable().optional(),
  href: z.string(),
  agencyHref: z.string().nullable().optional(),
  chip: z.string(),
  bodyPreview: z.string().optional(),
  readOnly: z.boolean().optional(),
  unplaced: z.boolean().optional(),
  origin: z.enum(["canvas", "agency", "inbox"]),
  teamId: z.string().nullable().optional(),
  nodeType: z.enum(["standard", "orchestrator"]).optional(),
  connections: z.array(z.object({ targetNodeId: z.string().min(1) })).optional(),
  tint: z.string().optional(),
});

export type KnowledgeBoardCard = z.infer<typeof knowledgeBoardCardSchema>;

export function isCanvasNativeObjectType(value: string): value is CanvasNativeObjectType {
  return canvasNativeObjectTypeSchema.safeParse(value).success;
}

export function isAgencyObjectType(value: string): value is AgencyKnowledgeObjectType {
  return knowledgeObjectTypeSchema.safeParse(value).success && value.startsWith("agency.");
}

export function isBoardNoodleRelation(relationType: KnowledgeRelationType): boolean {
  return relationType === "related";
}

export function shouldProjectIntoWorkspaceBlob(objectType: string): boolean {
  return objectType === "document";
}

export function knowledgeObjectHref(objectType: KnowledgeObjectType, id: string): string {
  if (objectType === "document") return `/node/${id}`;
  return `/object/${id}`;
}

export function knowledgeChipLabel(objectType: KnowledgeObjectType): string {
  switch (objectType) {
    case "document":
      return "Document";
    case "note":
      return "Note";
    case "decision":
      return "Decision";
    case "person":
      return "Person";
    case "source":
      return "Source";
    case "folder":
      return "Folder";
    case "agency.project":
      return "Project";
    case "agency.task":
      return "Task";
    case "agency.member":
      return "Member";
    case "agency.client":
      return "Client";
    case "agency.timeEntry":
      return "Time";
    default: {
      const _exhaustive: never = objectType;
      return _exhaustive;
    }
  }
}

export function defaultKnowledgePlacementSize(objectType: KnowledgeObjectType): {
  width: number;
  height: number;
} {
  switch (objectType) {
    case "document":
      return { width: DEFAULT_WORKSPACE_NODE_WIDTH, height: DEFAULT_WORKSPACE_NODE_HEIGHT };
    case "folder":
      return { width: KNOWLEDGE_FOLDER_WIDTH, height: KNOWLEDGE_FOLDER_HEIGHT };
    case "agency.project":
    case "agency.task":
    case "agency.member":
    case "agency.client":
    case "agency.timeEntry":
      return { width: KNOWLEDGE_AGENCY_PIN_WIDTH, height: KNOWLEDGE_AGENCY_PIN_HEIGHT };
    case "note":
    case "decision":
    case "person":
    case "source":
      return { width: KNOWLEDGE_CARD_WIDTH, height: KNOWLEDGE_CARD_HEIGHT };
    default: {
      const _exhaustive: never = objectType;
      return _exhaustive;
    }
  }
}

export function inboxClusterPlacement(index: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const column = index % KNOWLEDGE_INBOX_COLUMNS;
  const row = Math.floor(index / KNOWLEDGE_INBOX_COLUMNS);
  return {
    x: KNOWLEDGE_INBOX_ORIGIN_X + column * (KNOWLEDGE_CARD_WIDTH + KNOWLEDGE_INBOX_GAP),
    y: KNOWLEDGE_INBOX_ORIGIN_Y + row * (KNOWLEDGE_CARD_HEIGHT + KNOWLEDGE_INBOX_GAP),
    width: KNOWLEDGE_CARD_WIDTH,
    height: KNOWLEDGE_CARD_HEIGHT,
  };
}

export function inboxClusterFrame(unplacedCount: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const columns = Math.min(KNOWLEDGE_INBOX_COLUMNS, Math.max(1, unplacedCount));
  const rows = Math.max(1, Math.ceil(unplacedCount / KNOWLEDGE_INBOX_COLUMNS));
  return {
    x: KNOWLEDGE_INBOX_ORIGIN_X - 24,
    y: KNOWLEDGE_INBOX_ORIGIN_Y - 56,
    width: columns * (KNOWLEDGE_CARD_WIDTH + KNOWLEDGE_INBOX_GAP) + 24,
    height: rows * (KNOWLEDGE_CARD_HEIGHT + KNOWLEDGE_INBOX_GAP) + 64,
  };
}

export function parseKnowledgeSourceProperties(
  properties: Record<string, unknown>,
): KnowledgeSourceProperties | null {
  const parsed = knowledgeSourcePropertiesSchema.safeParse(properties);
  return parsed.success ? parsed.data : null;
}

function knowledgeId(prefix: string, ...parts: string[]) {
  return [prefix, ...parts].join("-");
}

function isoNow(value?: string) {
  return value ?? new Date().toISOString();
}

export function agencyRefFromRelations(
  object: Pick<KnowledgeObject, "id" | "teamId" | "visibility">,
  relations: KnowledgeRelation[],
): WorkspaceKnowledgeAgencyRef | null {
  if (object.visibility !== "team" || !object.teamId) return null;
  const about = relations.filter(
    (relation) =>
      relation.fromObjectId === object.id &&
      relation.relationType === "about" &&
      (relation.toObjectType === "agency.project" || relation.toObjectType === "agency.task"),
  );
  const project = about.find((relation) => relation.toObjectType === "agency.project");
  const task = about.find((relation) => relation.toObjectType === "agency.task");
  if (!project) return null;
  return workspaceAgencyRefSchema.parse({
    teamId: object.teamId,
    projectId: project.toObjectId,
    ...(task ? { taskId: task.toObjectId } : {}),
  });
}

export function relationsFromAgencyRef(input: {
  objectId: string;
  objectType: CanvasNativeObjectType;
  ownerUserId: string;
  teamId: string | null | undefined;
  agencyRef: WorkspaceKnowledgeAgencyRef | null | undefined;
  timestamp?: string;
}): KnowledgeRelation[] {
  const ref = input.agencyRef;
  if (!ref?.projectId) return [];
  const timestamp = isoNow(input.timestamp);
  const relations: KnowledgeRelation[] = [
    knowledgeRelationSchema.parse({
      id: knowledgeId("krel", input.objectId, "agency.project", ref.projectId, "about"),
      fromObjectId: input.objectId,
      fromObjectType: input.objectType,
      toObjectType: "agency.project",
      toObjectId: ref.projectId,
      relationType: "about",
      ownerUserId: input.ownerUserId,
      teamId: input.teamId ?? ref.teamId,
      properties: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ];
  if (ref.taskId) {
    relations.push(
      knowledgeRelationSchema.parse({
        id: knowledgeId("krel", input.objectId, "agency.task", ref.taskId, "about"),
        fromObjectId: input.objectId,
        fromObjectType: input.objectType,
        toObjectType: "agency.task",
        toObjectId: ref.taskId,
        relationType: "about",
        ownerUserId: input.ownerUserId,
        teamId: input.teamId ?? ref.teamId,
        properties: {},
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
  }
  return relations;
}

export function workspaceNodeToKnowledge(node: WorkspaceNode): {
  object: KnowledgeObject;
  placement: KnowledgePlacement;
  relations: KnowledgeRelation[];
} {
  const parsed = workspaceNodeSchema.parse(node);
  const ownerUserId = parsed.ownerUserId;
  if (!ownerUserId) {
    throw new Error("workspace node requires ownerUserId before knowledge projection");
  }
  const timestamp = parsed.updatedAt;
  const object = knowledgeObjectSchema.parse({
    id: parsed.id,
    objectType: "document",
    title: parsed.title,
    ownerUserId,
    visibility: parsed.visibility,
    teamId: parsed.teamId ?? null,
    properties: {},
    content: knowledgeDocumentContentSchema.parse({
      body: parsed.content,
      nodeType: parsed.nodeType,
      label: parsed.label,
      minWidth: parsed.minWidth,
      minHeight: parsed.minHeight,
      tabs: parsed.tabs,
      customBlockTemplates: parsed.customBlockTemplates,
      viewState: parsed.viewState,
      dashboard: parsed.dashboard,
    }),
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  });
  const placement = knowledgePlacementSchema.parse({
    id: knowledgeId("kplc", parsed.id, "board", ownerUserId),
    objectId: parsed.id,
    objectType: "document",
    teamId: parsed.teamId ?? null,
    viewId: "board",
    x: parsed.x,
    y: parsed.y,
    width: parsed.width,
    height: parsed.height,
    ownerUserId,
    createdAt: parsed.createdAt,
    updatedAt: timestamp,
  });
  const relations: KnowledgeRelation[] = [];
  if (parsed.nodeType === "orchestrator") {
    for (const connection of parsed.connections) {
      relations.push(
        knowledgeRelationSchema.parse({
          id: knowledgeId("krel", parsed.id, "document", connection.targetNodeId, "related"),
          fromObjectId: parsed.id,
          fromObjectType: "document",
          toObjectType: "document",
          toObjectId: connection.targetNodeId,
          relationType: "related",
          ownerUserId,
          teamId: parsed.teamId ?? null,
          properties: {},
          createdAt: parsed.createdAt,
          updatedAt: timestamp,
        }),
      );
    }
  }
  relations.push(
    ...relationsFromAgencyRef({
      objectId: parsed.id,
      objectType: "document",
      ownerUserId,
      teamId: parsed.teamId,
      agencyRef: parsed.agencyRef,
      timestamp,
    }),
  );
  return { object, placement, relations };
}

export function knowledgeToWorkspaceNode(
  object: KnowledgeObject,
  placement: KnowledgePlacement | null,
  relations: KnowledgeRelation[],
): WorkspaceNode {
  const parsedObject = knowledgeObjectSchema.parse(object);
  if (parsedObject.objectType !== "document") {
    throw new Error("Only document objects project into workspace nodes");
  }
  const x = placement?.x ?? 0;
  const y = placement?.y ?? 0;
  const width = placement?.width ?? DEFAULT_WORKSPACE_NODE_WIDTH;
  const height = placement?.height ?? DEFAULT_WORKSPACE_NODE_HEIGHT;
  const agencyRef = agencyRefFromRelations(parsedObject, relations);
  const content = knowledgeDocumentContentSchema.parse(parsedObject.content ?? {});
  const connections =
    content.nodeType === "orchestrator"
      ? relations
          .filter(
            (relation) =>
              relation.fromObjectId === parsedObject.id &&
              isBoardNoodleRelation(relation.relationType) &&
              relation.toObjectType === "document",
          )
          .map((relation) => ({ targetNodeId: relation.toObjectId }))
      : [];
  return workspaceNodeSchema.parse({
    id: parsedObject.id,
    title: parsedObject.title,
    content: content.body,
    nodeType: content.nodeType,
    ownerUserId: parsedObject.ownerUserId,
    visibility: parsedObject.visibility,
    teamId: parsedObject.teamId ?? null,
    agencyRef,
    x,
    y,
    width,
    height,
    label: content.label ?? parsedObject.title,
    minWidth: content.minWidth ?? DEFAULT_WORKSPACE_NODE_MIN_WIDTH,
    minHeight: content.minHeight ?? DEFAULT_WORKSPACE_NODE_MIN_HEIGHT,
    createdAt: parsedObject.createdAt,
    updatedAt: parsedObject.updatedAt,
    tabs: content.tabs,
    customBlockTemplates: content.customBlockTemplates,
    connections,
    viewState: content.viewState,
    dashboard: content.dashboard,
  });
}
