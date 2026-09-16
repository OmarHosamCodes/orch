import { assertNever } from "@orch/config/assert-never";
import {
  cloneWorkspaceNodes,
  createDefaultWorkspaceTab,
  createWorkspace2x2MatrixBlock,
  createWorkspaceAiPromptBlock,
  createWorkspaceAssumptionTrackerBlock,
  createWorkspaceAuthorityScorecardBlock,
  createWorkspaceBusinessModelCanvasBlock,
  createWorkspaceChecklistBlock,
  createWorkspaceCohortHealthDashboardBlock,
  createWorkspaceCollectionsTrackerBlock,
  createWorkspaceContentPipelineBlock,
  createWorkspaceContentQualityRadarBlock,
  createWorkspaceContentRoiTrackerBlock,
  createWorkspaceCourseRoadmapBlock,
  createWorkspaceCustomBlock,
  createWorkspaceDealScoringMatrixBlock,
  createWorkspaceDecisionBlock,
  createWorkspaceDecisionMatrixBlock,
  createWorkspaceDelegationMatrixBlock,
  createWorkspaceEisenhowerMatrixBlock,
  createWorkspaceForecastConfidenceBoardBlock,
  createWorkspaceHabitGridBlock,
  createWorkspaceHookBankBlock,
  createWorkspaceKanbanBlock,
  createWorkspaceLeadershipRhythmPlannerBlock,
  createWorkspaceLearningOutcomesMatrixBlock,
  createWorkspaceMessageHouseBlock,
  createWorkspaceNode,
  createWorkspaceNotesBlock,
  createWorkspaceOkrTrackerBlock,
  createWorkspacePipelineFunnelBlock,
  createWorkspacePricingSimulatorBlock,
  createWorkspaceProcessBlock,
  createWorkspaceProfitabilityCashFlowBlock,
  createWorkspaceProsConsBlock,
  createWorkspaceScorecardBlock,
  createWorkspaceSeatPlannerBlock,
  createWorkspaceSkillsHeatMapBlock,
  createWorkspaceSwotBlock,
  createWorkspaceTableBlock,
  createWorkspaceTalentGridBlock,
  createWorkspaceTaskListBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTrackerBlock,
  workspaceBlockSchema,
  workspaceCustomBlockTemplateSchema,
  workspaceMarketplaceItemSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeTintSchema,
  type WorkspaceBlock,
  type WorkspaceCustomBlockTemplate,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
  type WorkspaceNodeTab,
} from "@orch/workspace";
import { tool } from "@openrouter/sdk/lib/tool";
import { z } from "zod";

import { type CanvasAction, canvasActionSchema } from "./canvas-actions";

type DashboardSearchMatch = {
  matchType: "node" | "tab" | "block";
  nodeId: string;
  nodeTitle: string;
  tabId: string | null;
  tabTitle: string | null;
  blockId: string | null;
  blockTitle: string | null;
  source: string;
  excerpt: string;
  score: number;
};

type MarketplaceSearchMatch = {
  itemId: string;
  title: string;
  kind: WorkspaceMarketplaceItem["payload"]["kind"];
  excerpt: string;
  score: number;
};

const WORKSPACE_AGENT_BLOCK_TYPES = [
  "task-list",
  "notes",
  "table",
  "checklist",
  "decision",
  "pros-cons",
  "swot",
  "tracker",
  "ai-prompt",
  "habit-grid",
  "process",
  "2x2-matrix",
  "course-roadmap",
  "learning-outcomes-matrix",
  "time-orchestrator",
  "cohort-health-dashboard",
  "eisenhower-matrix",
  "leadership-rhythm-planner",
  "kanban",
  "timeline",
  "skills-heat-map",
  "delegation-matrix",
  "talent-grid",
  "seat-planner",
  "deal-scoring-matrix",
  "pipeline-funnel",
  "forecast-confidence-board",
  "content-pipeline",
  "content-quality-radar",
  "content-roi-tracker",
  "authority-scorecard",
  "hook-bank",
  "message-house",
  "scorecard",
  "okr-tracker",
  "decision-matrix",
  "business-model-canvas",
  "assumption-tracker",
  "profitability-cash-flow",
  "pricing-simulator",
  "collections-tracker",
  "custom",
] as const;

const workspaceBlockTypeSchema = z.enum(WORKSPACE_AGENT_BLOCK_TYPES);

const detailLevelSchema = z.enum(["summary", "full"]);

const getNodeDetailsInputSchema = z.object({
  nodeId: z.string().trim().min(1),
  detailLevel: detailLevelSchema.default("summary"),
});

const getTabDetailsInputSchema = z.object({
  nodeId: z.string().trim().min(1),
  tabId: z.string().trim().min(1),
  detailLevel: detailLevelSchema.default("summary"),
});

const getBlockDetailsInputSchema = z.object({
  blockId: z.string().trim().min(1),
  nodeId: z.string().trim().min(1).optional(),
  tabId: z.string().trim().min(1).optional(),
  detailLevel: detailLevelSchema.default("summary"),
  includeEditGuide: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Set true when preparing patch_block/replace_block. Agent mode includes editGuide by default.",
    ),
});

/** Opaque JSON for replace_* tool params — full workspace Zod schemas are validated at execute time. */
const opaqueWorkspacePayloadSchema = z
  .unknown()
  .describe("Full raw JSON from get_*_details with detailLevel full.");

const nodeReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  label: z.string().nullable(),
});

const tabReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
});

const customBlockTemplateReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  fieldCount: z.number().int().nonnegative(),
  includeNotes: z.boolean(),
});

const blockReferenceSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  summary: z.string(),
  contentPreview: z.string(),
});

const nodeSummarySchema = nodeReferenceSchema.extend({
  content: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  tabs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      blockCount: z.number().int().nonnegative(),
      blocks: z.array(blockReferenceSchema),
    }),
  ),
});

const tabSummarySchema = tabReferenceSchema.extend({
  blockCount: z.number().int().nonnegative(),
  blocks: z.array(blockReferenceSchema),
});

const marketplaceItemSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  kind: z.enum(["node", "tab", "block"]),
  createdByName: z.string(),
  updatedAt: z.string().datetime(),
  payloadSummary: z.string(),
});

const mutationMetaSchema = z.object({
  updatedAt: z.string().datetime().nullable(),
  nodeCount: z.number().int().nonnegative(),
});

const listDashboardNodesOutputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      label: z.string().nullable(),
      contentPreview: z.string(),
      tabsCount: z.number().int().nonnegative(),
      blockTypes: z.array(z.string()),
    }),
  ),
});

const searchDashboardOutputSchema = z.object({
  matches: z.array(
    z.object({
      matchType: z.enum(["node", "tab", "block"]),
      nodeId: z.string(),
      nodeTitle: z.string(),
      tabId: z.string().nullable(),
      tabTitle: z.string().nullable(),
      blockId: z.string().nullable(),
      blockTitle: z.string().nullable(),
      source: z.string(),
      excerpt: z.string(),
      score: z.number(),
    }),
  ),
});

const listMarketplaceItemsOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      kind: z.enum(["node", "tab", "block"]),
      createdByName: z.string(),
      updatedAt: z.string().datetime(),
    }),
  ),
});

const searchMarketplaceOutputSchema = z.object({
  matches: z.array(
    z.object({
      itemId: z.string(),
      title: z.string(),
      kind: z.enum(["node", "tab", "block"]),
      excerpt: z.string(),
      score: z.number(),
    }),
  ),
});

const getNodeDetailsOutputSchema = z.object({
  node: workspaceNodeSchema.nullable(),
  summary: nodeSummarySchema.nullable(),
});

const getTabDetailsOutputSchema = z.object({
  node: nodeReferenceSchema.nullable(),
  summary: tabSummarySchema.nullable(),
  tab: workspaceNodeTabSchema.nullable(),
  customBlockTemplates: z.array(customBlockTemplateReferenceSchema),
  rawCustomBlockTemplates: z.array(workspaceCustomBlockTemplateSchema),
});

const blockEditGuideSchema = z.object({
  blockType: z.string(),
  editableFieldPaths: z.array(z.string()),
  referenceFieldPaths: z.array(z.string()),
  immutableFieldPaths: z.array(z.string()),
  notes: z.array(z.string()),
});

const getBlockDetailsOutputSchema = z.object({
  node: nodeReferenceSchema.nullable(),
  tab: tabReferenceSchema.nullable(),
  summary: blockReferenceSchema.nullable(),
  block: workspaceBlockSchema.nullable(),
  editGuide: blockEditGuideSchema.nullable(),
  customBlockTemplate: customBlockTemplateReferenceSchema.nullable(),
  rawCustomBlockTemplate: workspaceCustomBlockTemplateSchema.nullable(),
});

const getMarketplaceItemDetailsOutputSchema = z.object({
  summary: marketplaceItemSummarySchema.nullable(),
  item: workspaceMarketplaceItemSchema.nullable(),
});

const nodeMutationOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  tabsCount: z.number().int().nonnegative(),
  blockCount: z.number().int().nonnegative(),
});

const deleteNodeOutputSchema = mutationMetaSchema.extend({
  deleted: z.literal(true),
  nodeId: z.string(),
  title: z.string(),
});

const tabMutationOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  tab: tabReferenceSchema,
  blockCount: z.number().int().nonnegative(),
});

const deleteTabOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  deletedTabId: z.string(),
  deletedTabTitle: z.string(),
  tabsCount: z.number().int().nonnegative(),
  activeTabId: z.string().nullable(),
  fallbackTab: tabReferenceSchema.nullable(),
});

const blockMutationOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  tab: tabReferenceSchema,
  block: blockReferenceSchema,
  customBlockTemplate: customBlockTemplateReferenceSchema.nullable(),
});

const jsonValueSchema: z.ZodType<
  string | number | boolean | null | Record<string, unknown> | unknown[]
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.record(z.string(), jsonValueSchema),
    z.array(jsonValueSchema),
  ]),
);

const blockPatchOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set"),
    path: z.string().trim().min(1),
    value: jsonValueSchema,
  }),
  z.object({
    op: z.literal("merge"),
    path: z.string().trim().min(1),
    value: z.record(z.string(), jsonValueSchema),
  }),
  z.object({
    op: z.literal("append"),
    path: z.string().trim().min(1),
    value: jsonValueSchema,
  }),
  z.object({
    op: z.literal("remove"),
    path: z.string().trim().min(1),
  }),
]);

const createBlockInputSchema = z.object({
  nodeId: z.string().trim().min(1),
  tabId: z.string().trim().min(1),
  type: workspaceBlockTypeSchema,
  title: z.string().trim().min(1).max(120).optional(),
  content: z
    .string()
    .max(8000)
    .optional()
    .describe("Initial body text for notes blocks. Ignored for other block types."),
  customTemplateId: z.string().trim().min(1).optional(),
});

const patchBlockInputSchema = z.object({
  nodeId: z.string().trim().min(1),
  tabId: z.string().trim().min(1),
  blockId: z.string().trim().min(1),
  operations: z.array(blockPatchOperationSchema).min(1).max(50),
});

const replaceBlockInputSchema = z.object({
  nodeId: z.string().trim().min(1),
  tabId: z.string().trim().min(1),
  blockId: z.string().trim().min(1),
  block: opaqueWorkspacePayloadSchema,
});

const patchBlockOutputSchema = blockMutationOutputSchema.extend({
  operationsApplied: z.number().int().nonnegative(),
  matchCount: z.number().int().nonnegative(),
});

const deleteBlockOutputSchema = mutationMetaSchema.extend({
  node: nodeReferenceSchema,
  tab: tabReferenceSchema,
  deletedBlockId: z.string(),
  deletedBlockTitle: z.string(),
  remainingBlockCount: z.number().int().nonnegative(),
});

function truncate(value: string, length = 240) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

const BLOCK_CONTENT_PREVIEW_LENGTH = 180;
const SEARCH_EXCERPT_LENGTH = 260;

type BlockPatchOperation = z.infer<typeof blockPatchOperationSchema>;
type BlockPatchTarget = {
  parent: Record<string, unknown> | unknown[];
  key: string | number;
  value: unknown;
};
type BlockPatchPathSelector =
  | {
      kind: "all";
    }
  | {
      kind: "index";
      index: number;
    }
  | {
      kind: "field";
      field: string;
      value: string | number | boolean | null;
    };
type BlockPatchPathSegment = {
  key: string;
  selector: BlockPatchPathSelector | null;
};

function cloneStructuredValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePatchComparableValue(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  if (trimmedValue === "true") {
    return true;
  }

  if (trimmedValue === "false") {
    return false;
  }

  if (trimmedValue === "null") {
    return null;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  return trimmedValue;
}

function parseBlockPatchPath(path: string): BlockPatchPathSegment[] {
  return path.split(".").map((segment) => {
    const trimmedSegment = segment.trim();
    const match = /^([^[\]]+)(?:\[(.*?)\])?$/.exec(trimmedSegment);

    if (!match) {
      throw new Error(`Invalid block patch path segment "${segment}".`);
    }

    const key = match[1]?.trim();
    const rawSelector = match[2];

    if (!key) {
      throw new Error(`Invalid block patch path segment "${segment}".`);
    }

    if (rawSelector === undefined) {
      return {
        key,
        selector: null,
      };
    }

    const selectorText = rawSelector.trim();

    if (selectorText.length === 0) {
      return {
        key,
        selector: {
          kind: "all",
        },
      };
    }

    if (/^\d+$/.test(selectorText)) {
      return {
        key,
        selector: {
          kind: "index",
          index: Number(selectorText),
        },
      };
    }

    const selectorMatch = /^([^=]+)=(.+)$/.exec(selectorText);

    if (!selectorMatch) {
      throw new Error(`Invalid block patch selector "${selectorText}" in path "${path}".`);
    }

    const [, rawField = "", rawValue = ""] = selectorMatch;

    return {
      key,
      selector: {
        kind: "field",
        field: rawField.trim(),
        value: parsePatchComparableValue(rawValue),
      },
    };
  });
}

function getPatchTargetValue(target: BlockPatchTarget) {
  return Array.isArray(target.parent)
    ? target.parent[target.key as number]
    : target.parent[target.key as string];
}

function setPatchTargetValue(target: BlockPatchTarget, value: unknown) {
  if (Array.isArray(target.parent)) {
    target.parent[target.key as number] = value;
  } else {
    target.parent[target.key as string] = value;
  }

  target.value = value;
}

function resolveBlockPatchTargets(block: WorkspaceBlock, path: string): BlockPatchTarget[] {
  const segments = parseBlockPatchPath(path);
  let targets: BlockPatchTarget[] = [
    {
      parent: {
        root: block,
      },
      key: "root",
      value: block,
    },
  ];

  for (const [segmentIndex, segment] of segments.entries()) {
    const isLastSegment = segmentIndex === segments.length - 1;
    const nextTargets: BlockPatchTarget[] = [];

    for (const target of targets) {
      const container = target.value;

      if (!isPlainObject(container)) {
        throw new Error(`Cannot traverse "${segment.key}" in path "${path}".`);
      }

      if (!segment.selector) {
        if (isLastSegment) {
          nextTargets.push({
            parent: container,
            key: segment.key,
            value: container[segment.key],
          });
          continue;
        }

        const child = container[segment.key];

        if (child === undefined) {
          continue;
        }

        nextTargets.push({
          parent: container,
          key: segment.key,
          value: child,
        });
        continue;
      }

      const collection = container[segment.key];

      if (collection === undefined) {
        continue;
      }

      if (!Array.isArray(collection)) {
        throw new Error(`Path "${path}" expects "${segment.key}" to be an array.`);
      }

      switch (segment.selector.kind) {
        case "all":
          collection.forEach((entry, index) => {
            nextTargets.push({
              parent: collection,
              key: index,
              value: entry,
            });
          });
          break;
        case "index": {
          const selector = segment.selector;

          if (selector.index < collection.length) {
            nextTargets.push({
              parent: collection,
              key: selector.index,
              value: collection[selector.index],
            });
          }
          break;
        }
        case "field": {
          const selector = segment.selector;

          collection.forEach((entry, index) => {
            if (isPlainObject(entry) && entry[selector.field] === selector.value) {
              nextTargets.push({
                parent: collection,
                key: index,
                value: entry,
              });
            }
          });
          break;
        }
        default:
          assertNever(segment.selector);
      }
    }

    targets = nextTargets;
  }

  return targets;
}

function applyBlockPatchOperation(block: WorkspaceBlock, operation: BlockPatchOperation) {
  const targets = resolveBlockPatchTargets(block, operation.path);

  if (targets.length === 0) {
    throw new Error(`Block patch path "${operation.path}" did not match any values.`);
  }

  switch (operation.op) {
    case "set":
      for (const target of targets) {
        setPatchTargetValue(target, cloneStructuredValue(operation.value));
      }
      break;
    case "merge":
      for (const target of targets) {
        const currentValue = getPatchTargetValue(target);

        if (currentValue === undefined) {
          setPatchTargetValue(target, {});
        } else if (!isPlainObject(currentValue)) {
          throw new Error(`Cannot merge into non-object path "${operation.path}".`);
        }

        const nextValue = getPatchTargetValue(target);

        if (!isPlainObject(nextValue)) {
          throw new Error(`Cannot merge into non-object path "${operation.path}".`);
        }

        Object.assign(nextValue, cloneStructuredValue(operation.value));
      }
      break;
    case "append":
      for (const target of targets) {
        const currentValue = getPatchTargetValue(target);

        if (currentValue === undefined) {
          setPatchTargetValue(target, []);
        } else if (!Array.isArray(currentValue)) {
          throw new Error(`Cannot append to non-array path "${operation.path}".`);
        }

        const nextValue = getPatchTargetValue(target);

        if (!Array.isArray(nextValue)) {
          throw new Error(`Cannot append to non-array path "${operation.path}".`);
        }

        const entries = Array.isArray(operation.value) ? operation.value : [operation.value];

        nextValue.push(...entries.map((entry) => cloneStructuredValue(entry)));
      }
      break;
    case "remove": {
      const arrayRemovals = new Map<unknown[], number[]>();

      for (const target of targets) {
        if (Array.isArray(target.parent) && typeof target.key === "number") {
          const indexes = arrayRemovals.get(target.parent) ?? [];
          indexes.push(target.key);
          arrayRemovals.set(target.parent, indexes);
          continue;
        }

        if (Array.isArray(target.parent)) {
          throw new Error(`Cannot remove non-indexed target for path "${operation.path}".`);
        }

        delete target.parent[target.key as string];
      }

      for (const [collection, indexes] of arrayRemovals.entries()) {
        indexes
          .sort((left, right) => right - left)
          .forEach((index) => {
            collection.splice(index, 1);
          });
      }
      break;
    }
    default:
      assertNever(operation);
  }

  return targets.length;
}

function normalizeSearchFragments(fragments: Array<string | number | boolean | null | undefined>) {
  return fragments
    .map((fragment) => {
      if (fragment === null || fragment === undefined) {
        return "";
      }

      return String(fragment).trim();
    })
    .filter(Boolean);
}

function getDisplayTabTitle(tab: WorkspaceNodeTab) {
  return tab.title.trim() || "Untitled tab";
}

function getDisplayBlockTitle(block: WorkspaceBlock) {
  return block.title.trim() || "Untitled block";
}

function getCustomBlockTemplate(
  customTemplates: WorkspaceCustomBlockTemplate[] | undefined,
  definitionId: string,
) {
  return customTemplates?.find((template) => template.id === definitionId) ?? null;
}

function getBlockContentPreview(
  block: WorkspaceBlock,
  customTemplates?: WorkspaceCustomBlockTemplate[],
) {
  const previewText = collectBlockSearchDetails(block, customTemplates).join("\n");

  return truncate(previewText || summarizeBlock(block), BLOCK_CONTENT_PREVIEW_LENGTH);
}

const defaultImmutableBlockFieldPaths = ["id", "type", "createdAt", "updatedAt"];
const defaultBlockEditNotes = [
  "Preserve id, type, createdAt, and existing nested item ids. The mutation tool will set updatedAt for you.",
  "Prefer minimal edits: change only the fields the user asked for and keep unrelated content intact.",
  "Use these field paths with patch_block. Path syntax supports dot paths, [] wildcards, numeric indexes, and [id=...] selectors.",
];
const taskLeafPaths = [
  "text",
  "completed",
  "dueDate",
  "priority",
  "domain",
  "urgency",
  "importance",
  "estimateMinutes",
];
const promptOutputLeafPaths = ["prompt", "output"];
const decisionItemLeafPaths = ["text", "weight"];
const trackerEntryLeafPaths = ["label", "value"];
const meetingLeafPaths = [
  "name",
  "rhythm",
  "owner",
  "participants",
  "purpose",
  "durationMinutes",
  "nextDate",
  "status",
];

function prefixPaths(prefix: string, leafPaths: string[]) {
  return leafPaths.map((path) => `${prefix}.${path}`);
}

function createBlockEditGuide(args: {
  blockType: WorkspaceBlock["type"];
  editableFieldPaths: string[];
  referenceFieldPaths?: string[];
  notes?: string[];
}) {
  return {
    blockType: args.blockType,
    editableFieldPaths: args.editableFieldPaths,
    referenceFieldPaths: args.referenceFieldPaths ?? [],
    immutableFieldPaths: defaultImmutableBlockFieldPaths,
    notes: [...defaultBlockEditNotes, ...(args.notes ?? [])],
  };
}

function describeBlockEditGuide(
  block: WorkspaceBlock,
  customTemplate?: WorkspaceCustomBlockTemplate | null,
) {
  switch (block.type) {
    case "task-list":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: ["title", ...prefixPaths("tasks[]", taskLeafPaths)],
      });
    case "notes":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: ["title", "body"],
      });
    case "table":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: ["title", "columns[].label", "rows[].cells.<columnId>"],
        notes: ["Keep each rows[].cells key aligned with an existing column id."],
      });
    case "checklist":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: ["title", "items[].text", "items[].completed"],
      });
    case "decision":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "recommendation",
          ...prefixPaths("pros[]", decisionItemLeafPaths),
          ...prefixPaths("cons[]", decisionItemLeafPaths),
        ],
      });
    case "pros-cons":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          ...prefixPaths("pros[]", decisionItemLeafPaths),
          ...prefixPaths("cons[]", decisionItemLeafPaths),
        ],
      });
    case "swot":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "cells.strengths",
          "cells.weaknesses",
          "cells.opportunities",
          "cells.threats",
        ],
      });
    case "tracker":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: ["title", "goal", ...prefixPaths("entries[]", trackerEntryLeafPaths)],
      });
    case "ai-prompt":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "includeContext",
          "prompt",
          "latestOutput",
          ...prefixPaths("outputHistory[]", promptOutputLeafPaths),
        ],
        notes: [
          "Only edit latestOutput or outputHistory when the user explicitly wants generated output changed.",
        ],
      });
    case "habit-grid":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "habits[].name",
          "habits[].days.mon",
          "habits[].days.tue",
          "habits[].days.wed",
          "habits[].days.thu",
          "habits[].days.fri",
          "habits[].days.sat",
          "habits[].days.sun",
        ],
      });
    case "process":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: ["title", "steps[].title", "steps[].completed", "steps[].note"],
      });
    case "2x2-matrix":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "xAxisLabel",
          "xStartLabel",
          "xEndLabel",
          "yAxisLabel",
          "yStartLabel",
          "yEndLabel",
          "quadrants.topLeft.name",
          "quadrants.topLeft.items[].text",
          "quadrants.topRight.name",
          "quadrants.topRight.items[].text",
          "quadrants.bottomLeft.name",
          "quadrants.bottomLeft.items[].text",
          "quadrants.bottomRight.name",
          "quadrants.bottomRight.items[].text",
        ],
      });
    case "course-roadmap":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "courses[].name",
          "courses[].status",
          "courses[].lessons[].title",
          "courses[].lessons[].recorded",
          "courses[].outcomes[].text",
        ],
      });
    case "learning-outcomes-matrix":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "courseBlockId",
          "courseId",
          "prompt",
          "latestOutput",
          ...prefixPaths("outputHistory[]", promptOutputLeafPaths),
        ],
        referenceFieldPaths: ["courseBlockId", "courseId"],
        notes: [
          "If both courseBlockId and courseId are set, make sure they point to a real course roadmap block and course.",
        ],
      });
    case "time-orchestrator":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "settings.domains[]",
          "settings.includeUnassigned",
          "settings.quadrants[]",
        ],
      });
    case "cohort-health-dashboard":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "cohorts[].name",
          "cohorts[].seatsSold",
          "cohorts[].capacity",
          "cohorts[].revenueEgp",
          "cohorts[].startDate",
          "cohorts[].status",
          "cohorts[].refundRisk",
          "cohorts[].completionRisk",
        ],
      });
    case "eisenhower-matrix":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "settings.domains[]",
          "settings.includeUnassigned",
          "settings.quadrants[]",
          "latestBattlePlan",
          ...prefixPaths("tasks[]", taskLeafPaths),
        ],
        notes: ["Only change latestBattlePlan when the user wants the synthesized plan updated."],
      });
    case "leadership-rhythm-planner":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: ["title", "filter", ...prefixPaths("meetings[]", meetingLeafPaths)],
      });
    case "kanban":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "columns[].title",
          "cards[].title",
          "cards[].description",
          "cards[].columnId",
          "cards[].assignee",
          "cards[].dueDate",
        ],
        referenceFieldPaths: ["cards[].columnId"],
        notes: ["Each cards[].columnId must match one of the current column ids."],
      });
    case "timeline":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "milestones[].title",
          "milestones[].date",
          "milestones[].status",
          "milestones[].note",
        ],
      });
    case "skills-heat-map":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "dimensions[].label",
          "members[].name",
          "members[].role",
          "members[].scores",
        ],
      });
    case "delegation-matrix":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "hourlyRate",
          "items[].task",
          "items[].from",
          "items[].to",
          "items[].hoursPerWeek",
          "items[].status",
        ],
      });
    case "talent-grid":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "members[].name",
          "members[].role",
          "members[].performance",
          "members[].potential",
        ],
      });
    case "seat-planner":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "filter",
          "seats[].name",
          "seats[].owner",
          "seats[].function",
          "seats[].health",
          "seats[].load",
          "seats[].backupOwner",
          "seats[].notes",
        ],
      });
    case "deal-scoring-matrix":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "deals[].clientName",
          "deals[].valueEgp",
          "deals[].temperature",
          "deals[].score",
          "deals[].stage",
          "deals[].nextAction",
          "deals[].dueDate",
        ],
      });
    case "pipeline-funnel":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "deals[].clientName",
          "deals[].valueEgp",
          "deals[].temperature",
          "deals[].stage",
        ],
      });
    case "forecast-confidence-board":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "targetRevenueEgp",
          "deals[].clientName",
          "deals[].valueEgp",
          "deals[].bucket",
          "deals[].expectedCloseMonth",
          "deals[].confidence",
          "deals[].owner",
          "deals[].nextAction",
        ],
      });
    case "content-pipeline":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "items[].title",
          "items[].status",
          "items[].platform",
          "items[].assignee",
        ],
      });
    case "content-quality-radar":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "scores.hook",
          "scores.value",
          "scores.emotion",
          "scores.cta",
          "scores.platformFit",
          "scores.brand",
          "scores.shareability",
          "scores.scrollStop",
          "scores.authenticity",
          "scores.storytelling",
        ],
      });
    case "content-roi-tracker":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "sortBy",
          "items[].title",
          "items[].platform",
          "items[].campaign",
          "items[].goal",
          "items[].reach",
          "items[].leads",
          "items[].conversionInfluence",
          "items[].repurposeValue",
        ],
      });
    case "authority-scorecard":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "metrics.posts.value",
          "metrics.posts.target",
          "metrics.videos.value",
          "metrics.videos.target",
          "metrics.speakingGigs.value",
          "metrics.speakingGigs.target",
          "metrics.podcastAppearances.value",
          "metrics.podcastAppearances.target",
          "metrics.mediaFeatures.value",
          "metrics.mediaFeatures.target",
          "metrics.followers.value",
          "metrics.followers.target",
        ],
      });
    case "hook-bank":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "hooks[].category",
          "hooks[].text",
          "hooks[].score",
          "lastGeneratedAt",
        ],
        notes: [
          "Prefer leaving lastGeneratedAt unchanged unless the user explicitly wants generation metadata adjusted.",
        ],
      });
    case "message-house":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "brandPromise",
          "pillars[].title",
          "pillars[].body",
          "audiencePains",
          "proofPoints",
          "voicePrinciples",
          "latestStressTest",
        ],
        notes: [
          "The message house is designed around exactly three pillars; preserve that structure unless the user clearly wants it changed.",
        ],
      });
    case "scorecard":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "metrics[].label",
          "metrics[].value",
          "metrics[].target",
          "metrics[].unit",
        ],
      });
    case "okr-tracker":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "objectives[].title",
          "objectives[].keyResults[].title",
          "objectives[].keyResults[].progress",
        ],
      });
    case "decision-matrix":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "question",
          "criteria[].label",
          "criteria[].weight",
          "options[].label",
          "options[].scores.<criterionId>",
        ],
        notes: ["Keep every options[].scores key aligned with an existing criterion id."],
      });
    case "business-model-canvas":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "cells.keyPartners",
          "cells.keyActivities",
          "cells.keyResources",
          "cells.valuePropositions",
          "cells.customerRelationships",
          "cells.channels",
          "cells.customerSegments",
          "cells.costStructure",
          "cells.revenueStreams",
          "analysis",
        ],
      });
    case "assumption-tracker":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "filter",
          "assumptions[].statement",
          "assumptions[].linkType",
          "assumptions[].linkId",
          "assumptions[].owner",
          "assumptions[].reviewDate",
          "assumptions[].confidence",
          "assumptions[].status",
          "assumptions[].evidenceNotes",
        ],
        referenceFieldPaths: ["assumptions[].linkId"],
      });
    case "profitability-cash-flow":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "clients[].name",
          "clients[].paymentStatus",
          "clients[].healthPercent",
          "clients[].revenueEgp",
          "clients[].costEgp",
          "expenses[].category",
          "expenses[].amountEgp",
        ],
      });
    case "pricing-simulator":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "activeClients",
          "hoursPerClientPerMonth",
          "hourlyRateEgp",
          "monthlyOverheadEgp",
          "targetMarginPercent",
        ],
      });
    case "collections-tracker":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "filter",
          "invoices[].clientName",
          "invoices[].amountEgp",
          "invoices[].dueDate",
          "invoices[].owner",
          "invoices[].nextFollowUpDate",
          "invoices[].status",
          "invoices[].notes",
          "invoices[].paidAt",
        ],
      });
    case "custom":
      return createBlockEditGuide({
        blockType: block.type,
        editableFieldPaths: [
          "title",
          "definitionId",
          ...(customTemplate?.fields.map((field) => `values.${field.key}`) ?? [
            "values.<fieldKey>",
          ]),
          "notes",
          "latestAiOutput",
          ...prefixPaths("outputHistory[]", promptOutputLeafPaths),
        ],
        referenceFieldPaths: ["definitionId"],
        notes: [
          customTemplate
            ? `Use the "${customTemplate.name}" template fields and keep definitionId aligned with that template.`
            : "Keep definitionId aligned with a real custom block template on the node.",
        ],
      });
    default:
      return assertNever(block);
  }
}

function collectPromptOutputFragments(outputs: { prompt: string; output: string }[]) {
  return outputs.flatMap((entry) => [entry.prompt, entry.output]);
}

function collectBlockSearchDetails(
  block: WorkspaceBlock,
  customTemplates?: WorkspaceCustomBlockTemplate[],
): string[] {
  switch (block.type) {
    case "task-list":
      return normalizeSearchFragments(
        block.tasks.flatMap((task) => [
          task.text,
          task.completed ? "completed" : "open",
          task.dueDate ?? "",
          task.priority ?? "",
          task.domain ?? "",
          task.urgency,
          task.importance,
          task.estimateMinutes,
        ]),
      );
    case "notes":
      return normalizeSearchFragments([block.body]);
    case "table":
      return normalizeSearchFragments([
        ...block.columns.map((column) => column.label),
        ...block.rows.flatMap((row) => block.columns.map((column) => row.cells[column.id] ?? "")),
      ]);
    case "checklist":
      return normalizeSearchFragments(
        block.items.flatMap((item) => [item.text, item.completed ? "completed" : "open"]),
      );
    case "decision":
      return normalizeSearchFragments([
        block.recommendation,
        ...block.pros.flatMap((item) => [item.text, item.weight]),
        ...block.cons.flatMap((item) => [item.text, item.weight]),
      ]);
    case "pros-cons":
      return normalizeSearchFragments([
        ...block.pros.flatMap((item) => [item.text, item.weight, "pro"]),
        ...block.cons.flatMap((item) => [item.text, item.weight, "con"]),
      ]);
    case "swot":
      return normalizeSearchFragments([
        block.cells.strengths,
        block.cells.weaknesses,
        block.cells.opportunities,
        block.cells.threats,
      ]);
    case "tracker":
      return normalizeSearchFragments([
        block.goal ?? "",
        ...block.entries.flatMap((entry) => [entry.label, entry.value]),
      ]);
    case "ai-prompt":
      return normalizeSearchFragments([
        block.includeContext ? "with context" : "without context",
        block.prompt,
        block.latestOutput,
        ...collectPromptOutputFragments(block.outputHistory),
      ]);
    case "habit-grid":
      return normalizeSearchFragments(
        block.habits.flatMap((habit) => [
          habit.name,
          ...Object.entries(habit.days).flatMap(([day, completed]) => [
            day,
            completed ? "done" : "open",
          ]),
        ]),
      );
    case "process":
      return normalizeSearchFragments(
        block.steps.flatMap((step) => [
          step.title,
          step.note,
          step.completed ? "completed" : "open",
        ]),
      );
    case "2x2-matrix":
      return normalizeSearchFragments([
        block.xAxisLabel,
        block.xStartLabel,
        block.xEndLabel,
        block.yAxisLabel,
        block.yStartLabel,
        block.yEndLabel,
        block.quadrants.topLeft.name,
        ...block.quadrants.topLeft.items.map((item) => item.text),
        block.quadrants.topRight.name,
        ...block.quadrants.topRight.items.map((item) => item.text),
        block.quadrants.bottomLeft.name,
        ...block.quadrants.bottomLeft.items.map((item) => item.text),
        block.quadrants.bottomRight.name,
        ...block.quadrants.bottomRight.items.map((item) => item.text),
      ]);
    case "course-roadmap":
      return normalizeSearchFragments(
        block.courses.flatMap((course) => [
          course.name,
          course.status,
          ...course.lessons.flatMap((lesson) => [
            lesson.title,
            lesson.recorded ? "recorded" : "pending",
          ]),
          ...course.outcomes.map((outcome) => outcome.text),
        ]),
      );
    case "learning-outcomes-matrix":
      return normalizeSearchFragments([
        block.prompt,
        block.latestOutput,
        block.courseBlockId ?? "",
        block.courseId ?? "",
        ...collectPromptOutputFragments(block.outputHistory),
      ]);
    case "time-orchestrator":
      return normalizeSearchFragments([
        ...block.settings.domains,
        ...block.settings.quadrants,
        block.settings.includeUnassigned ? "unassigned" : "",
      ]);
    case "cohort-health-dashboard":
      return normalizeSearchFragments(
        block.cohorts.flatMap((cohort) => [
          cohort.name,
          cohort.seatsSold,
          cohort.capacity,
          cohort.revenueEgp,
          cohort.startDate ?? "",
          cohort.status,
          cohort.refundRisk ? "refund risk" : "",
          cohort.completionRisk ? "completion risk" : "",
        ]),
      );
    case "eisenhower-matrix":
      return normalizeSearchFragments([
        block.latestBattlePlan,
        ...block.tasks.flatMap((task) => [
          task.text,
          task.domain ?? "",
          task.priority ?? "",
          task.dueDate ?? "",
          task.urgency,
          task.importance,
          task.estimateMinutes,
          task.completed ? "completed" : "open",
        ]),
      ]);
    case "leadership-rhythm-planner":
      return normalizeSearchFragments([
        block.filter,
        ...block.meetings.flatMap((meeting) => [
          meeting.name,
          meeting.rhythm,
          meeting.owner,
          meeting.participants,
          meeting.purpose,
          meeting.durationMinutes,
          meeting.nextDate ?? "",
          meeting.status,
        ]),
      ]);
    case "kanban":
      return normalizeSearchFragments([
        ...block.columns.map((column) => column.title),
        ...block.cards.flatMap((card) => [
          card.title,
          card.description,
          card.assignee,
          card.dueDate ?? "",
        ]),
      ]);
    case "timeline":
      return normalizeSearchFragments(
        block.milestones.flatMap((milestone) => [
          milestone.title,
          milestone.date ?? "",
          milestone.status,
          milestone.note,
        ]),
      );
    case "skills-heat-map":
      return normalizeSearchFragments(
        block.members.flatMap((member) => [
          member.name,
          member.role,
          ...Object.entries(member.scores).flatMap(([dimension, score]) => [dimension, score]),
        ]),
      );
    case "delegation-matrix":
      return normalizeSearchFragments([
        block.hourlyRate,
        ...block.items.flatMap((item) => [
          item.task,
          item.from,
          item.to,
          item.hoursPerWeek,
          item.status,
        ]),
      ]);
    case "talent-grid":
      return normalizeSearchFragments(
        block.members.flatMap((member) => [
          member.name,
          member.role,
          member.performance,
          member.potential,
        ]),
      );
    case "seat-planner":
      return normalizeSearchFragments([
        block.filter,
        ...block.seats.flatMap((seat) => [
          seat.name,
          seat.owner,
          seat.function,
          seat.health,
          seat.load,
          seat.backupOwner,
          seat.notes,
        ]),
      ]);
    case "deal-scoring-matrix":
      return normalizeSearchFragments(
        block.deals.flatMap((deal) => [
          deal.clientName,
          deal.valueEgp,
          deal.temperature,
          deal.score,
          deal.stage,
          deal.nextAction,
          deal.dueDate ?? "",
        ]),
      );
    case "pipeline-funnel":
      return normalizeSearchFragments(
        block.deals.flatMap((deal) => [
          deal.clientName,
          deal.valueEgp,
          deal.temperature,
          deal.stage,
        ]),
      );
    case "forecast-confidence-board":
      return normalizeSearchFragments([
        block.targetRevenueEgp,
        ...block.deals.flatMap((deal) => [
          deal.clientName,
          deal.valueEgp,
          deal.bucket,
          deal.expectedCloseMonth ?? "",
          deal.confidence,
          deal.owner,
          deal.nextAction,
        ]),
      ]);
    case "content-pipeline":
      return normalizeSearchFragments(
        block.items.flatMap((item) => [item.title, item.status, item.platform, item.assignee]),
      );
    case "content-quality-radar":
      return normalizeSearchFragments(
        Object.entries(block.scores).flatMap(([dimension, score]) => [dimension, score]),
      );
    case "content-roi-tracker":
      return normalizeSearchFragments([
        block.sortBy,
        ...block.items.flatMap((item) => [
          item.title,
          item.platform,
          item.campaign,
          item.goal,
          item.reach,
          item.leads,
          item.conversionInfluence,
          item.repurposeValue,
        ]),
      ]);
    case "authority-scorecard":
      return normalizeSearchFragments(
        Object.entries(block.metrics).flatMap(([metric, entry]) => [
          metric,
          entry.value,
          entry.target,
        ]),
      );
    case "hook-bank":
      return normalizeSearchFragments(
        block.hooks.flatMap((hook) => [hook.category, hook.text, hook.score]),
      );
    case "message-house":
      return normalizeSearchFragments([
        block.brandPromise,
        ...block.pillars.flatMap((pillar) => [pillar.title, pillar.body]),
        block.audiencePains,
        block.proofPoints,
        block.voicePrinciples,
        block.latestStressTest,
      ]);
    case "scorecard":
      return normalizeSearchFragments(
        block.metrics.flatMap((metric) => [metric.label, metric.value, metric.target, metric.unit]),
      );
    case "okr-tracker":
      return normalizeSearchFragments(
        block.objectives.flatMap((objective) => [
          objective.title,
          ...objective.keyResults.flatMap((keyResult) => [keyResult.title, keyResult.progress]),
        ]),
      );
    case "decision-matrix":
      return normalizeSearchFragments([
        block.question,
        ...block.criteria.flatMap((criterion) => [criterion.label, criterion.weight]),
        ...block.options.flatMap((option) => [option.label, ...Object.values(option.scores)]),
      ]);
    case "business-model-canvas":
      return normalizeSearchFragments([block.analysis, ...Object.values(block.cells)]);
    case "assumption-tracker":
      return normalizeSearchFragments([
        block.filter,
        ...block.assumptions.flatMap((assumption) => [
          assumption.statement,
          assumption.owner,
          assumption.reviewDate ?? "",
          assumption.status,
          assumption.confidence,
          assumption.evidenceNotes,
          assumption.linkType,
          assumption.linkId ?? "",
        ]),
      ]);
    case "profitability-cash-flow":
      return normalizeSearchFragments([
        ...block.clients.flatMap((client) => [
          client.name,
          client.paymentStatus,
          client.healthPercent,
          client.revenueEgp,
          client.costEgp,
        ]),
        ...block.expenses.flatMap((expense) => [expense.category, expense.amountEgp]),
      ]);
    case "pricing-simulator":
      return normalizeSearchFragments([
        block.activeClients,
        block.hoursPerClientPerMonth,
        block.hourlyRateEgp,
        block.monthlyOverheadEgp,
        block.targetMarginPercent,
      ]);
    case "collections-tracker":
      return normalizeSearchFragments([
        block.filter,
        ...block.invoices.flatMap((invoice) => [
          invoice.clientName,
          invoice.amountEgp,
          invoice.dueDate ?? "",
          invoice.owner,
          invoice.nextFollowUpDate ?? "",
          invoice.status,
          invoice.notes,
          invoice.paidAt ?? "",
        ]),
      ]);
    case "custom": {
      const template = getCustomBlockTemplate(customTemplates, block.definitionId);

      return normalizeSearchFragments([
        template?.name ?? "",
        ...(template?.fields.map((field) => field.label) ?? []),
        template?.aiPromptTemplate ?? "",
        block.notes,
        block.latestAiOutput,
        ...Object.values(block.values),
        ...collectPromptOutputFragments(block.outputHistory),
      ]);
    }
    default:
      return assertNever(block);
  }
}

function buildBlockSearchText(
  block: WorkspaceBlock,
  customTemplates?: WorkspaceCustomBlockTemplate[],
) {
  const content = collectBlockSearchDetails(block, customTemplates).join("\n");
  return `${getDisplayBlockTitle(block)}\n${content}`;
}

function buildSearchExcerpt(text: string, query: string, maxLength = SEARCH_EXCERPT_LENGTH) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedText) {
    return "";
  }

  if (!normalizedQuery) {
    return truncate(normalizedText, maxLength);
  }

  const matchIndex = normalizedText.toLowerCase().indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return truncate(normalizedText, maxLength);
  }

  const rawStart = Math.max(0, matchIndex - Math.floor((maxLength - normalizedQuery.length) / 2));
  const start = Math.min(rawStart, Math.max(0, normalizedText.length - maxLength));
  const end = Math.min(normalizedText.length, start + maxLength);
  const excerpt = normalizedText.slice(start, end).trim();

  return `${start > 0 ? "…" : ""}${excerpt}${end < normalizedText.length ? "…" : ""}`;
}

export function summarizeBlock(block: WorkspaceBlock) {
  switch (block.type) {
    case "task-list":
      return `${block.tasks.length} tasks, ${block.tasks.filter((task) => task.completed).length} completed`;
    case "notes":
      return truncate(block.body || "Empty notes block");
    case "table":
      return `${block.rows.length} rows, ${block.columns.length} columns`;
    case "checklist":
      return `${block.items.filter((item) => item.completed).length}/${block.items.length} checklist items completed`;
    case "decision":
      return `${block.pros.length} pros, ${block.cons.length} cons`;
    case "pros-cons":
      return `${block.pros.length} pros vs ${block.cons.length} cons`;
    case "swot":
      return `${Object.values(block.cells).filter((value) => value.trim()).length}/4 SWOT quadrants filled`;
    case "tracker":
      return `${block.entries.length} tracker entries${block.goal !== null && block.goal !== undefined ? `, goal ${block.goal}` : ""}`;
    case "ai-prompt":
      return truncate(block.latestOutput || block.prompt || "No prompt output yet");
    case "habit-grid": {
      const completedChecks = block.habits.reduce(
        (sum, habit) => sum + Object.values(habit.days).filter(Boolean).length,
        0,
      );
      return `${block.habits.length} habits and ${completedChecks} weekly check-ins`;
    }
    case "process":
      return `${block.steps.filter((step) => step.completed).length}/${block.steps.length} process steps completed`;
    case "2x2-matrix":
      return `${Object.values(block.quadrants).reduce((sum, quadrant) => sum + quadrant.items.length, 0)} mapped items`;
    case "course-roadmap": {
      const lessonCount = block.courses.reduce((sum, course) => sum + course.lessons.length, 0);
      const recordedLessonCount = block.courses.reduce(
        (sum, course) => sum + course.lessons.filter((lesson) => lesson.recorded).length,
        0,
      );
      return `${block.courses.length} courses, ${recordedLessonCount}/${lessonCount} lessons recorded`;
    }
    case "learning-outcomes-matrix":
      return truncate(block.latestOutput || block.prompt || "No outcomes matrix yet");
    case "time-orchestrator":
      return `${block.settings.domains.length} domains across ${block.settings.quadrants.length} quadrants`;
    case "cohort-health-dashboard": {
      const seatsSold = block.cohorts.reduce((sum, cohort) => sum + cohort.seatsSold, 0);
      const totalCapacity = block.cohorts.reduce((sum, cohort) => sum + cohort.capacity, 0);
      return `${block.cohorts.length} cohorts, ${seatsSold}/${totalCapacity} seats sold`;
    }
    case "eisenhower-matrix":
      return `${block.tasks.filter((task) => task.completed).length}/${block.tasks.length} tasks completed`;
    case "leadership-rhythm-planner":
      return `${block.meetings.length} meetings with ${block.filter} filter`;
    case "kanban":
      return `${block.columns.length} columns, ${block.cards.length} cards`;
    case "timeline":
      return `${block.milestones.length} milestones`;
    case "skills-heat-map":
      return `${block.members.length} team members across ${block.dimensions.length} skill dimensions`;
    case "delegation-matrix":
      return `${block.items.length} delegation items at ${block.hourlyRate} EGP/hour`;
    case "talent-grid":
      return `${block.members.length} team members mapped on the 9-box grid`;
    case "seat-planner":
      return `${block.seats.length} seats with ${block.filter} filter`;
    case "deal-scoring-matrix":
      return `${block.deals.length} scored deals`;
    case "pipeline-funnel":
      return `${block.deals.length} funnel deals`;
    case "forecast-confidence-board":
      return `${block.deals.length} forecast deals, target ${block.targetRevenueEgp} EGP`;
    case "content-pipeline":
      return `${block.items.length} content pieces across 5 stages`;
    case "content-quality-radar":
      return `${Object.values(block.scores).reduce((sum, score) => sum + score, 0) / 10}/10 average quality score`;
    case "content-roi-tracker":
      return `${block.items.length} content ROI rows sorted by ${block.sortBy}`;
    case "authority-scorecard":
      return `${Object.values(block.metrics).filter((metric) => metric.value >= metric.target).length}/6 metrics on target`;
    case "hook-bank":
      return `${block.hooks.length} hooks scored up to ${Math.max(0, ...block.hooks.map((hook) => hook.score))}/10`;
    case "message-house":
      return `${
        [
          block.brandPromise,
          ...block.pillars.map((pillar) => pillar.body),
          block.audiencePains,
          block.proofPoints,
          block.voicePrinciples,
        ].filter((value) => value.trim()).length
      }/7 sections filled`;
    case "scorecard":
      return `${block.metrics.length} metrics`;
    case "okr-tracker":
      return `${block.objectives.length} objectives`;
    case "decision-matrix":
      return `${block.criteria.length} criteria, ${block.options.length} options`;
    case "business-model-canvas":
      return `${Object.values(block.cells).filter((value) => value.trim()).length}/9 canvas cells filled`;
    case "assumption-tracker":
      return `${block.assumptions.length} assumptions tracked`;
    case "profitability-cash-flow":
      return `${block.clients.length} clients and ${block.expenses.length} expense categories`;
    case "pricing-simulator":
      return `${block.activeClients} active clients at ${block.hourlyRateEgp} EGP/hour`;
    case "collections-tracker":
      return `${block.invoices.length} receivables with filter ${block.filter}`;
    case "custom":
      return truncate(block.notes || block.latestAiOutput || JSON.stringify(block.values));
    default:
      return assertNever(block);
  }
}

function getNodeBlockTypes(node: WorkspaceNode) {
  return [...new Set(node.tabs.flatMap((tab) => tab.blocks.map((block) => block.type)))];
}

function getNodeBlockCount(node: WorkspaceNode) {
  return node.tabs.reduce((total, tab) => total + tab.blocks.length, 0);
}

function describeNodeReference(node: WorkspaceNode) {
  return {
    id: node.id,
    title: node.title,
    label: node.label ?? null,
  };
}

function describeTabSummary(
  tab: WorkspaceNodeTab,
  customTemplates: WorkspaceCustomBlockTemplate[] = [],
) {
  return {
    id: tab.id,
    title: tab.title,
    blockCount: tab.blocks.length,
    blocks: tab.blocks.map((block) => describeBlockReference(block, customTemplates)),
  };
}

function describeTabReference(tab: WorkspaceNodeTab) {
  return {
    id: tab.id,
    title: tab.title,
  };
}

function describeBlockReference(
  block: WorkspaceBlock,
  customTemplates: WorkspaceCustomBlockTemplate[] = [],
) {
  return {
    id: block.id,
    type: block.type,
    title: block.title,
    summary: summarizeBlock(block),
    contentPreview: getBlockContentPreview(block, customTemplates),
  };
}

function describeCustomBlockTemplateReference(template: WorkspaceCustomBlockTemplate) {
  return {
    id: template.id,
    name: template.name,
    fieldCount: template.fields.length,
    includeNotes: template.includeNotes,
  };
}

function describeNodeSummary(node: WorkspaceNode) {
  return {
    ...describeNodeReference(node),
    content: node.content,
    position: {
      x: node.x,
      y: node.y,
    },
    size: {
      width: node.width,
      height: node.height,
    },
    tabs: node.tabs.map((tab) => describeTabSummary(tab, node.customBlockTemplates)),
  };
}

function getBlockTemplateIds(block: WorkspaceBlock) {
  if (block.type !== "custom") {
    return [];
  }

  return [block.definitionId];
}

function getTabTemplateIds(tab: WorkspaceNodeTab) {
  return [...new Set(tab.blocks.flatMap((block) => getBlockTemplateIds(block)))];
}

function getTemplatesByIds(node: WorkspaceNode, ids: string[]): WorkspaceCustomBlockTemplate[] {
  if (ids.length === 0) {
    return [];
  }

  const idSet = new Set(ids);
  return node.customBlockTemplates.filter((template) => idSet.has(template.id));
}

function findNode(nodes: WorkspaceNode[], nodeId: string) {
  return nodes.find((item) => item.id === nodeId) ?? null;
}

function findTab(nodes: WorkspaceNode[], nodeId: string, tabId: string) {
  const node = findNode(nodes, nodeId);
  const tab = node?.tabs.find((item) => item.id === tabId) ?? null;

  return {
    node,
    tab,
  };
}

function findBlock(
  nodes: WorkspaceNode[],
  args: { nodeId?: string; tabId?: string; blockId: string },
) {
  if (args.nodeId) {
    const node = findNode(nodes, args.nodeId);

    if (!node) {
      return {
        node: null,
        tab: null,
        block: null,
      };
    }

    const tabs = args.tabId ? node.tabs.filter((item) => item.id === args.tabId) : node.tabs;

    for (const tab of tabs) {
      const block = tab.blocks.find((item) => item.id === args.blockId);

      if (block) {
        return {
          node,
          tab,
          block,
        };
      }
    }

    return {
      node,
      tab: null,
      block: null,
    };
  }

  for (const node of nodes) {
    for (const tab of node.tabs) {
      if (args.tabId && tab.id !== args.tabId) {
        continue;
      }

      const block = tab.blocks.find((item) => item.id === args.blockId);

      if (block) {
        return {
          node,
          tab,
          block,
        };
      }
    }
  }

  return {
    node: null,
    tab: null,
    block: null,
  };
}

function requireNode(nodes: WorkspaceNode[], nodeId: string) {
  const node = findNode(nodes, nodeId);

  if (!node) {
    throw new Error(`Node "${nodeId}" was not found.`);
  }

  return node;
}

function requireTab(nodes: WorkspaceNode[], nodeId: string, tabId: string) {
  const { node, tab } = findTab(nodes, nodeId, tabId);

  if (!node) {
    throw new Error(`Node "${nodeId}" was not found.`);
  }

  if (!tab) {
    throw new Error(`Tab "${tabId}" was not found in node "${node.title}".`);
  }

  return {
    node,
    tab,
  };
}

function requireBlock(nodes: WorkspaceNode[], nodeId: string, tabId: string, blockId: string) {
  const { node, tab, block } = findBlock(nodes, {
    nodeId,
    tabId,
    blockId,
  });

  if (!node) {
    throw new Error(`Node "${nodeId}" was not found.`);
  }

  if (!tab) {
    throw new Error(`Tab "${tabId}" was not found in node "${node.title}".`);
  }

  if (!block) {
    throw new Error(`Block "${blockId}" was not found.`);
  }

  return {
    node,
    tab,
    block,
  };
}

function getMissingCustomTemplateIds(node: WorkspaceNode, blocks: WorkspaceBlock[]) {
  const knownTemplateIds = new Set(node.customBlockTemplates.map((template) => template.id));

  return [
    ...new Set(
      blocks.flatMap((block) => {
        if (block.type !== "custom" || knownTemplateIds.has(block.definitionId)) {
          return [];
        }

        return [block.definitionId];
      }),
    ),
  ];
}

function assertBlocksUseKnownCustomTemplates(node: WorkspaceNode, blocks: WorkspaceBlock[]) {
  const missingTemplateIds = getMissingCustomTemplateIds(node, blocks);

  if (missingTemplateIds.length === 0) {
    return;
  }

  throw new Error(
    `Unknown custom block template id${missingTemplateIds.length === 1 ? "" : "s"}: ${missingTemplateIds.join(", ")}.`,
  );
}

function assertNodeUsesKnownCustomTemplates(node: WorkspaceNode) {
  assertBlocksUseKnownCustomTemplates(
    node,
    node.tabs.flatMap((tab) => tab.blocks),
  );
}

function getSuggestedNodePosition(nodes: WorkspaceNode[]) {
  const lastNode = nodes.at(-1);

  if (!lastNode) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: lastNode.x + 48,
    y: lastNode.y + 48,
  };
}

function getCustomBlockTemplateForBlock(node: WorkspaceNode, block: WorkspaceBlock) {
  if (block.type !== "custom") {
    return null;
  }

  return node.customBlockTemplates.find((template) => template.id === block.definitionId) ?? null;
}

function summarizeMarketplaceItemPayload(item: WorkspaceMarketplaceItem) {
  switch (item.payload.kind) {
    case "node":
      return truncate(
        `${item.payload.node.title}\n${item.payload.node.content || "No description yet"}`,
      );
    case "tab":
      return truncate(
        `${item.payload.tab.title}\n${item.payload.tab.blocks.map((block) => block.title).join("\n")}`,
      );
    case "block":
      return truncate(`${item.payload.block.title}\n${summarizeBlock(item.payload.block)}`);
    default:
      return "Marketplace item";
  }
}

function createBlockByType(args: {
  node: WorkspaceNode;
  type: z.infer<typeof workspaceBlockTypeSchema>;
  title?: string;
  content?: string;
  customTemplateId?: string;
}) {
  const trimmedTitle = args.title?.trim();
  const titleInput = trimmedTitle ? { title: trimmedTitle } : {};

  switch (args.type) {
    case "task-list":
      return createWorkspaceTaskListBlock(titleInput);
    case "notes":
      return createWorkspaceNotesBlock({
        ...titleInput,
        ...(args.content ? { body: args.content } : {}),
      });
    case "table":
      return createWorkspaceTableBlock(titleInput);
    case "checklist":
      return createWorkspaceChecklistBlock(titleInput);
    case "decision":
      return createWorkspaceDecisionBlock(titleInput);
    case "pros-cons":
      return createWorkspaceProsConsBlock(titleInput);
    case "swot":
      return createWorkspaceSwotBlock(titleInput);
    case "tracker":
      return createWorkspaceTrackerBlock(titleInput);
    case "ai-prompt":
      return createWorkspaceAiPromptBlock(titleInput);
    case "habit-grid":
      return createWorkspaceHabitGridBlock(titleInput);
    case "process":
      return createWorkspaceProcessBlock(titleInput);
    case "2x2-matrix":
      return createWorkspace2x2MatrixBlock(titleInput);
    case "course-roadmap":
      return createWorkspaceCourseRoadmapBlock(titleInput);
    case "learning-outcomes-matrix":
      return createWorkspaceLearningOutcomesMatrixBlock(titleInput);
    case "time-orchestrator":
      return createWorkspaceTimeOrchestratorBlock(titleInput);
    case "cohort-health-dashboard":
      return createWorkspaceCohortHealthDashboardBlock(titleInput);
    case "eisenhower-matrix":
      return createWorkspaceEisenhowerMatrixBlock(titleInput);
    case "leadership-rhythm-planner":
      return createWorkspaceLeadershipRhythmPlannerBlock(titleInput);
    case "kanban":
      return createWorkspaceKanbanBlock(titleInput);
    case "timeline":
      return createWorkspaceTimelineBlock(titleInput);
    case "skills-heat-map":
      return createWorkspaceSkillsHeatMapBlock(titleInput);
    case "delegation-matrix":
      return createWorkspaceDelegationMatrixBlock(titleInput);
    case "talent-grid":
      return createWorkspaceTalentGridBlock(titleInput);
    case "seat-planner":
      return createWorkspaceSeatPlannerBlock(titleInput);
    case "deal-scoring-matrix":
      return createWorkspaceDealScoringMatrixBlock(titleInput);
    case "pipeline-funnel":
      return createWorkspacePipelineFunnelBlock(titleInput);
    case "forecast-confidence-board":
      return createWorkspaceForecastConfidenceBoardBlock(titleInput);
    case "content-pipeline":
      return createWorkspaceContentPipelineBlock(titleInput);
    case "content-quality-radar":
      return createWorkspaceContentQualityRadarBlock(titleInput);
    case "content-roi-tracker":
      return createWorkspaceContentRoiTrackerBlock(titleInput);
    case "authority-scorecard":
      return createWorkspaceAuthorityScorecardBlock(titleInput);
    case "hook-bank":
      return createWorkspaceHookBankBlock(titleInput);
    case "message-house":
      return createWorkspaceMessageHouseBlock(titleInput);
    case "scorecard":
      return createWorkspaceScorecardBlock(titleInput);
    case "okr-tracker":
      return createWorkspaceOkrTrackerBlock(titleInput);
    case "decision-matrix":
      return createWorkspaceDecisionMatrixBlock(titleInput);
    case "business-model-canvas":
      return createWorkspaceBusinessModelCanvasBlock(titleInput);
    case "assumption-tracker":
      return createWorkspaceAssumptionTrackerBlock(titleInput);
    case "profitability-cash-flow":
      return createWorkspaceProfitabilityCashFlowBlock(titleInput);
    case "pricing-simulator":
      return createWorkspacePricingSimulatorBlock(titleInput);
    case "collections-tracker":
      return createWorkspaceCollectionsTrackerBlock(titleInput);
    case "custom": {
      if (!args.customTemplateId) {
        throw new Error("A customTemplateId is required when creating a custom block.");
      }

      const template = args.node.customBlockTemplates.find(
        (entry) => entry.id === args.customTemplateId,
      );

      if (!template) {
        throw new Error(`Custom template "${args.customTemplateId}" was not found.`);
      }

      return createWorkspaceCustomBlock(template, titleInput);
    }
  }
}

type DashboardSearchEntry = Omit<DashboardSearchMatch, "excerpt" | "score"> & {
  text: string;
  specificityBoost: number;
};

function createSearchEntries(nodes: WorkspaceNode[]) {
  return nodes.flatMap((node) => {
    const entries: DashboardSearchEntry[] = [
      {
        matchType: "node",
        nodeId: node.id,
        nodeTitle: node.title,
        tabId: null,
        tabTitle: null,
        blockId: null,
        blockTitle: null,
        source: "node",
        text: `${node.title}\n${node.label ?? ""}\n${node.content}`,
        specificityBoost: 0,
      },
    ];

    for (const tab of node.tabs) {
      entries.push({
        matchType: "tab",
        nodeId: node.id,
        nodeTitle: node.title,
        tabId: tab.id,
        tabTitle: getDisplayTabTitle(tab),
        blockId: null,
        blockTitle: null,
        source: `tab:${getDisplayTabTitle(tab)}`,
        text: `${getDisplayTabTitle(tab)}\n${tab.blocks
          .map((block) => buildBlockSearchText(block, node.customBlockTemplates))
          .join("\n")}`,
        specificityBoost: 4,
      });

      for (const block of tab.blocks) {
        entries.push({
          matchType: "block",
          nodeId: node.id,
          nodeTitle: node.title,
          tabId: tab.id,
          tabTitle: getDisplayTabTitle(tab),
          blockId: block.id,
          blockTitle: getDisplayBlockTitle(block),
          source: `block:${getDisplayBlockTitle(block)}`,
          text: buildBlockSearchText(block, node.customBlockTemplates),
          specificityBoost: 8,
        });
      }
    }

    return entries;
  });
}

function scoreSearchMatch(query: string, text: string, specificityBoost = 0) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedText = text.toLowerCase();

  if (!normalizedQuery || !normalizedText.includes(normalizedQuery)) {
    return 0;
  }

  const exactMatches = normalizedText.split(normalizedQuery).length - 1;
  const startsWithBoost = normalizedText.startsWith(normalizedQuery) ? 2 : 0;

  return (
    exactMatches * 3 +
    startsWithBoost +
    Math.max(1, 12 - normalizedText.indexOf(normalizedQuery)) +
    specificityBoost
  );
}

function searchWorkspace(
  nodes: WorkspaceNode[],
  query: string,
  limit: number,
): DashboardSearchMatch[] {
  return createSearchEntries(nodes)
    .map((entry) => {
      const score = scoreSearchMatch(query, entry.text, entry.specificityBoost);

      return {
        matchType: entry.matchType,
        nodeId: entry.nodeId,
        nodeTitle: entry.nodeTitle,
        tabId: entry.tabId,
        tabTitle: entry.tabTitle,
        blockId: entry.blockId,
        blockTitle: entry.blockTitle,
        source: entry.source,
        excerpt: buildSearchExcerpt(entry.text, query),
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function createMarketplaceSearchEntries(items: WorkspaceMarketplaceItem[]) {
  return items.map((item) => {
    const payloadLabel =
      item.payload.kind === "node"
        ? `${item.payload.node.title}\n${item.payload.node.content}`
        : item.payload.kind === "tab"
          ? `${item.payload.tab.title}\n${item.payload.tab.blocks.map((block) => block.title).join("\n")}`
          : `${item.payload.block.title}\n${summarizeBlock(item.payload.block)}`;

    return {
      itemId: item.id,
      title: item.title,
      kind: item.payload.kind,
      text: `${item.title}\n${item.summary}\n${item.payload.kind}\n${payloadLabel}`,
    };
  });
}

function searchMarketplace(
  items: WorkspaceMarketplaceItem[],
  query: string,
  limit: number,
): MarketplaceSearchMatch[] {
  return createMarketplaceSearchEntries(items)
    .map((entry) => {
      const score = scoreSearchMatch(query, entry.text);

      return {
        itemId: entry.itemId,
        title: entry.title,
        kind: entry.kind,
        excerpt: truncate(entry.text, 260),
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function buildWorkspaceOverview(nodes: WorkspaceNode[]) {
  if (nodes.length === 0) {
    return "The dashboard is currently empty.";
  }

  return nodes
    .slice(0, 10)
    .map((node, index) => {
      const blockCount = node.tabs.reduce((total, tab) => total + tab.blocks.length, 0);
      const blockTypes = getNodeBlockTypes(node).join(", ") || "no blocks";

      return `${index + 1}. ${node.title} (${node.tabs.length} tabs, ${blockCount} blocks, ${blockTypes})`;
    })
    .join("\n");
}

export function createDashboardAgentWorkspaceRuntime(args: {
  nodes: WorkspaceNode[];
  updatedAt?: string | null;
}) {
  let currentNodes = cloneWorkspaceNodes(args.nodes);
  let currentUpdatedAt = args.updatedAt ?? null;
  let changed = false;

  return {
    getNodes() {
      return currentNodes;
    },
    getUpdatedAt() {
      return currentUpdatedAt;
    },
    hasChanges() {
      return changed;
    },
    toSnapshot() {
      return {
        nodes: cloneWorkspaceNodes(currentNodes),
        updatedAt: currentUpdatedAt,
      };
    },
    async applyMutation<TResult>(
      mutator: (draft: WorkspaceNode[], timestamp: string) => TResult | Promise<TResult>,
    ) {
      const draft = cloneWorkspaceNodes(currentNodes);
      const timestamp = new Date().toISOString();
      const result = await mutator(draft, timestamp);

      currentNodes = cloneWorkspaceNodes(draft);
      currentUpdatedAt = timestamp;
      changed = true;

      return {
        result,
        updatedAt: currentUpdatedAt,
        nodeCount: currentNodes.length,
      };
    },
  };
}

export type DashboardAgentWorkspaceRuntime = ReturnType<
  typeof createDashboardAgentWorkspaceRuntime
>;

function snapshotCanvasTarget(nodes: WorkspaceNode[], action: CanvasAction): unknown {
  switch (action.type) {
    case "node.create":
      return null;
    case "node.replace":
    case "node.update":
    case "node.delete":
      return findNode(nodes, action.nodeId);
    case "tab.create":
      return findNode(nodes, action.nodeId);
    case "tab.replace":
    case "tab.delete": {
      const found = findTab(nodes, action.nodeId, action.tabId);
      return found.tab;
    }
    case "block.create": {
      const found = findTab(nodes, action.nodeId, action.tabId);
      return found.tab;
    }
    case "block.patch":
    case "block.replace":
    case "block.delete": {
      const found = findBlock(nodes, {
        nodeId: action.nodeId,
        tabId: action.tabId,
        blockId: action.blockId,
      });
      return found.block;
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/** Apply one Canvas proposal action to a node graph. Does not persist. */
export async function applyCanvasAction(
  nodes: WorkspaceNode[],
  rawAction: unknown,
): Promise<{ action: CanvasAction; before: unknown; after: unknown; nextNodes: WorkspaceNode[] }> {
  const action = canvasActionSchema.parse(rawAction);
  const before = snapshotCanvasTarget(nodes, action);
  const workspace = createDashboardAgentWorkspaceRuntime({ nodes });

  const { result } = await workspace.applyMutation((draft, timestamp) => {
    switch (action.type) {
      case "node.create": {
        const suggestedPosition = getSuggestedNodePosition(draft);
        const trimmedContent = action.content?.trim() ?? "";
        const tint = action.tint ? workspaceNodeTintSchema.safeParse(action.tint).data : undefined;
        const node = createWorkspaceNode({
          id: action.id,
          title: action.title,
          content: trimmedContent,
          x: action.x ?? suggestedPosition.x,
          y: action.y ?? suggestedPosition.y,
          width: action.width,
          height: action.height,
          visibility: action.visibility,
          teamId: action.teamId ?? null,
          agencyRef: action.agencyRef ?? null,
          tabs: action.overviewTabTitle
            ? [createDefaultWorkspaceTab(action.overviewTabTitle, trimmedContent)]
            : undefined,
          dashboard: tint ? { tint, featuredBlocks: [] } : undefined,
        });
        if (action.blocks?.length && node.tabs[0]) {
          node.tabs[0].blocks = action.blocks.map((spec) =>
            createBlockByType({
              node,
              type: workspaceBlockTypeSchema.parse(spec.blockType),
              title: spec.title,
              content: spec.content,
            }),
          );
        }
        draft.push(node);
        return { nodeId: node.id };
      }
      case "node.replace": {
        const parsedNode = workspaceNodeSchema.parse(action.node);
        const currentNode = requireNode(draft, action.nodeId);
        const currentIndex = draft.findIndex((entry) => entry.id === action.nodeId);
        const nextNode = createWorkspaceNode({
          ...parsedNode,
          id: currentNode.id,
          createdAt: currentNode.createdAt,
          updatedAt: timestamp,
        });
        assertNodeUsesKnownCustomTemplates(nextNode);
        draft[currentIndex] = nextNode;
        return { nodeId: nextNode.id };
      }
      case "node.update": {
        const node = requireNode(draft, action.nodeId);
        if (action.title !== undefined) node.title = action.title;
        if (action.visibility !== undefined) node.visibility = action.visibility;
        if (action.teamId !== undefined) node.teamId = action.teamId;
        if (action.agencyRef !== undefined) node.agencyRef = action.agencyRef;
        node.updatedAt = timestamp;
        workspaceNodeSchema.parse(node);
        return { nodeId: node.id };
      }
      case "node.delete": {
        const node = requireNode(draft, action.nodeId);
        const currentIndex = draft.findIndex((entry) => entry.id === node.id);
        draft.splice(currentIndex, 1);
        return { nodeId: node.id };
      }
      case "tab.create": {
        const node = requireNode(draft, action.nodeId);
        const tab = createDefaultWorkspaceTab(action.title?.trim() || "New tab");
        node.tabs.push(tab);
        node.viewState.activeTabId = tab.id;
        node.updatedAt = timestamp;
        return { tabId: tab.id };
      }
      case "tab.replace": {
        const parsedTab = workspaceNodeTabSchema.parse(action.tab);
        const { node, tab: currentTab } = requireTab(draft, action.nodeId, action.tabId);
        const currentIndex = node.tabs.findIndex((entry) => entry.id === currentTab.id);
        const nextTab = workspaceNodeTabSchema.parse({
          ...parsedTab,
          id: currentTab.id,
          createdAt: currentTab.createdAt,
          updatedAt: timestamp,
        });
        assertBlocksUseKnownCustomTemplates(node, nextTab.blocks);
        node.tabs[currentIndex] = nextTab;
        node.updatedAt = timestamp;
        return { tabId: nextTab.id };
      }
      case "tab.delete": {
        const { node, tab } = requireTab(draft, action.nodeId, action.tabId);
        const currentIndex = node.tabs.findIndex((entry) => entry.id === tab.id);
        node.tabs = node.tabs.filter((entry) => entry.id !== tab.id);
        if (node.tabs.length === 0) {
          const fallbackTab = createDefaultWorkspaceTab("Overview", node.content);
          node.tabs = [fallbackTab];
          node.viewState.activeTabId = fallbackTab.id;
        } else if (node.viewState.activeTabId === tab.id) {
          const nextTab =
            node.tabs[currentIndex] ??
            node.tabs[Math.max(0, currentIndex - 1)] ??
            node.tabs[0] ??
            null;
          node.viewState.activeTabId = nextTab?.id ?? null;
        }
        node.updatedAt = timestamp;
        return { tabId: tab.id };
      }
      case "block.create": {
        const blockType = workspaceBlockTypeSchema.parse(action.blockType);
        const { node, tab } = requireTab(draft, action.nodeId, action.tabId);
        const block = createBlockByType({
          node,
          type: blockType,
          title: action.title,
          customTemplateId: action.customTemplateId,
          ...(blockType === "notes" && action.content ? { content: action.content } : {}),
        });
        tab.blocks.push(block);
        tab.updatedAt = timestamp;
        node.updatedAt = timestamp;
        return { blockId: block.id };
      }
      case "block.patch": {
        const operations = z
          .array(blockPatchOperationSchema)
          .min(1)
          .max(50)
          .parse(action.operations);
        const {
          node,
          tab,
          block: currentBlock,
        } = requireBlock(draft, action.nodeId, action.tabId, action.blockId);
        const currentIndex = tab.blocks.findIndex((entry) => entry.id === currentBlock.id);
        const draftBlock = cloneStructuredValue(currentBlock);
        for (const operation of operations) {
          applyBlockPatchOperation(draftBlock, operation);
        }
        const nextBlock = workspaceBlockSchema.parse({
          ...draftBlock,
          id: currentBlock.id,
          createdAt: currentBlock.createdAt,
          updatedAt: timestamp,
        });
        assertBlocksUseKnownCustomTemplates(node, [nextBlock]);
        tab.blocks[currentIndex] = nextBlock;
        tab.updatedAt = timestamp;
        node.updatedAt = timestamp;
        return { blockId: nextBlock.id };
      }
      case "block.replace": {
        const parsedBlock = workspaceBlockSchema.parse(action.block);
        const {
          node,
          tab,
          block: currentBlock,
        } = requireBlock(draft, action.nodeId, action.tabId, action.blockId);
        const currentIndex = tab.blocks.findIndex((entry) => entry.id === currentBlock.id);
        const nextBlock = workspaceBlockSchema.parse({
          ...parsedBlock,
          id: currentBlock.id,
          createdAt: currentBlock.createdAt,
          updatedAt: timestamp,
        });
        assertBlocksUseKnownCustomTemplates(node, [nextBlock]);
        tab.blocks[currentIndex] = nextBlock;
        tab.updatedAt = timestamp;
        node.updatedAt = timestamp;
        return { blockId: nextBlock.id };
      }
      case "block.delete": {
        const { node, tab, block } = requireBlock(
          draft,
          action.nodeId,
          action.tabId,
          action.blockId,
        );
        tab.blocks = tab.blocks.filter((entry) => entry.id !== block.id);
        tab.updatedAt = timestamp;
        node.updatedAt = timestamp;
        return { blockId: block.id };
      }
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  });

  const nextNodes = workspace.getNodes();
  const createdNodeId =
    result && typeof result === "object" && "nodeId" in result
      ? String((result as { nodeId?: string }).nodeId ?? "")
      : "";
  const after =
    action.type === "node.create" && createdNodeId
      ? findNode(nextNodes, createdNodeId)
      : snapshotCanvasTarget(nextNodes, action);
  return {
    action,
    before,
    after,
    nextNodes,
  };
}

export function buildDashboardAgentTools(
  workspace: DashboardAgentWorkspaceRuntime,
  marketplaceItems: WorkspaceMarketplaceItem[] = [],
  profile: "ask" | "agent" | "plan" = "ask",
  options: { directMutations?: boolean } = {},
) {
  const profileGuidance =
    profile === "agent" || profile === "plan"
      ? "Start with summary data and request full raw payloads only for mutation prep or exact structural verification."
      : "Prefer the summary response and avoid full raw payloads unless the answer is blocked or you are preparing a replace mutation.";

  const tools = [
    tool({
      name: "list_dashboard_nodes",
      description: "List the current dashboard nodes with structural summaries.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(10),
      }),
      outputSchema: listDashboardNodesOutputSchema,
      execute: async ({ limit }) => ({
        nodes: workspace
          .getNodes()
          .slice(0, limit)
          .map((node) => ({
            id: node.id,
            title: node.title,
            label: node.label ?? null,
            contentPreview: truncate(node.content || "No description yet"),
            tabsCount: node.tabs.length,
            blockTypes: getNodeBlockTypes(node),
          })),
      }),
    }),
    tool({
      name: "search_dashboard",
      description:
        "Search node titles, descriptions, tabs, and full block content in the current dashboard. Returns exact ids you can use with get_block_details. For edits, inspect the matched block first, use its editGuide, then prefer patch_block or fall back to replace_block.",
      inputSchema: z.object({
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(10).default(3),
      }),
      outputSchema: searchDashboardOutputSchema,
      execute: async ({ query, limit }) => ({
        matches: searchWorkspace(workspace.getNodes(), query, limit),
      }),
    }),
    tool({
      name: "list_marketplace_items",
      description: "List marketplace items available for reuse with their payload kinds.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(10),
      }),
      outputSchema: listMarketplaceItemsOutputSchema,
      execute: async ({ limit }) => ({
        items: marketplaceItems.slice(0, limit).map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          kind: item.payload.kind,
          createdByName: item.createdByName,
          updatedAt: item.updatedAt,
        })),
      }),
    }),
    tool({
      name: "search_marketplace",
      description: "Search marketplace item titles, summaries, and payload content.",
      inputSchema: z.object({
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(10).default(3),
      }),
      outputSchema: searchMarketplaceOutputSchema,
      execute: async ({ query, limit }) => ({
        matches: searchMarketplace(marketplaceItems, query, limit),
      }),
    }),
    tool<typeof getNodeDetailsInputSchema, typeof getNodeDetailsOutputSchema>({
      name: "get_node_details",
      description: `Inspect a single dashboard node. ${profileGuidance}`,
      inputSchema: getNodeDetailsInputSchema,
      outputSchema: getNodeDetailsOutputSchema,
      execute: async ({ nodeId, detailLevel }) => {
        const node = findNode(workspace.getNodes(), nodeId);

        return getNodeDetailsOutputSchema.parse({
          node: detailLevel === "full" ? node : null,
          summary: node ? describeNodeSummary(node) : null,
        });
      },
    }),
    tool<typeof getTabDetailsInputSchema, typeof getTabDetailsOutputSchema>({
      name: "get_tab_details",
      description: `Inspect a single dashboard tab and its related templates. ${profileGuidance}`,
      inputSchema: getTabDetailsInputSchema,
      outputSchema: getTabDetailsOutputSchema,
      execute: async ({ nodeId, tabId, detailLevel }) => {
        const { node, tab } = findTab(workspace.getNodes(), nodeId, tabId);
        const templates = node && tab ? getTemplatesByIds(node, getTabTemplateIds(tab)) : [];

        return getTabDetailsOutputSchema.parse({
          node: node ? describeNodeReference(node) : null,
          summary: node && tab ? describeTabSummary(tab, node.customBlockTemplates) : null,
          tab: detailLevel === "full" ? tab : null,
          customBlockTemplates: templates.map(describeCustomBlockTemplateReference),
          rawCustomBlockTemplates: detailLevel === "full" ? templates : [],
        });
      },
    }),
    tool<typeof getBlockDetailsInputSchema, typeof getBlockDetailsOutputSchema>({
      name: "get_block_details",
      description: `Inspect a dashboard block (summary by default). Request includeEditGuide or use Agent mode for field paths before patch_block. Use detailLevel: "full" only for replace_block prep. ${profileGuidance}`,
      inputSchema: getBlockDetailsInputSchema,
      outputSchema: getBlockDetailsOutputSchema,
      execute: async ({ blockId, nodeId, tabId, detailLevel, includeEditGuide }) => {
        const { node, tab, block } = findBlock(workspace.getNodes(), {
          blockId,
          nodeId,
          tabId,
        });
        const customBlockTemplate =
          node && block ? getCustomBlockTemplateForBlock(node, block) : null;
        const shouldIncludeEditGuide =
          Boolean(block) &&
          (profile === "agent" || profile === "plan" || includeEditGuide || detailLevel === "full");

        return getBlockDetailsOutputSchema.parse({
          node: node ? describeNodeReference(node) : null,
          tab: tab ? describeTabReference(tab) : null,
          summary: node && block ? describeBlockReference(block, node.customBlockTemplates) : null,
          block: detailLevel === "full" ? block : null,
          editGuide:
            shouldIncludeEditGuide && block
              ? describeBlockEditGuide(block, customBlockTemplate)
              : null,
          customBlockTemplate: customBlockTemplate
            ? describeCustomBlockTemplateReference(customBlockTemplate)
            : null,
          rawCustomBlockTemplate: detailLevel === "full" ? customBlockTemplate : null,
        });
      },
    }),
    ...(options.directMutations
      ? [
          tool({
            name: "create_node",
            description:
              "Create a new dashboard node with a default overview tab. ONLY use this when the user explicitly asks to create a new node. If the workspace is scoped to an existing node and the user asks to add a block or content, use create_block instead — do NOT create a new node.",
            inputSchema: z.object({
              title: z.string().trim().min(1).max(120),
              content: z.string().max(4000).optional(),
              x: z.number().finite().optional(),
              y: z.number().finite().optional(),
              width: z.number().positive().optional(),
              height: z.number().positive().optional(),
              tint: workspaceNodeTintSchema.optional(),
              overviewTabTitle: z.string().trim().min(1).max(80).optional(),
            }),
            outputSchema: nodeMutationOutputSchema,
            execute: async ({ title, content, x, y, width, height, tint, overviewTabTitle }) => {
              const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft) => {
                const suggestedPosition = getSuggestedNodePosition(draft);
                const trimmedContent = content?.trim() ?? "";
                const node = createWorkspaceNode({
                  title,
                  content: trimmedContent,
                  x: x ?? suggestedPosition.x,
                  y: y ?? suggestedPosition.y,
                  width,
                  height,
                  tabs: overviewTabTitle
                    ? [createDefaultWorkspaceTab(overviewTabTitle, trimmedContent)]
                    : undefined,
                  dashboard: tint
                    ? {
                        tint,
                        featuredBlocks: [],
                      }
                    : undefined,
                });

                draft.push(node);

                return {
                  nodeId: node.id,
                };
              });
              const node = requireNode(workspace.getNodes(), result.nodeId);

              return {
                node: describeNodeReference(node),
                updatedAt,
                nodeCount,
                tabsCount: node.tabs.length,
                blockCount: getNodeBlockCount(node),
              };
            },
          }),
          tool({
            name: "replace_node",
            description:
              'Replace a node with a full raw node payload. Call get_node_details with detailLevel: "full" first, edit the raw node, then call this tool.',
            inputSchema: z.object({
              nodeId: z.string().trim().min(1),
              node: opaqueWorkspacePayloadSchema,
            }),
            outputSchema: nodeMutationOutputSchema,
            execute: async ({ nodeId, node }) => {
              const parsedNode = workspaceNodeSchema.parse(node);
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const currentNode = requireNode(draft, nodeId);
                  const currentIndex = draft.findIndex((entry) => entry.id === nodeId);
                  const nextNode = createWorkspaceNode({
                    ...parsedNode,
                    id: currentNode.id,
                    createdAt: currentNode.createdAt,
                    updatedAt: timestamp,
                  });

                  assertNodeUsesKnownCustomTemplates(nextNode);
                  draft[currentIndex] = nextNode;

                  return {
                    nodeId: nextNode.id,
                  };
                },
              );
              const nextNode = requireNode(workspace.getNodes(), result.nodeId);

              return {
                node: describeNodeReference(nextNode),
                updatedAt,
                nodeCount,
                tabsCount: nextNode.tabs.length,
                blockCount: getNodeBlockCount(nextNode),
              };
            },
          }),
          tool({
            name: "delete_node",
            description: "Delete a dashboard node by id.",
            inputSchema: z.object({
              nodeId: z.string().trim().min(1),
            }),
            outputSchema: deleteNodeOutputSchema,
            execute: async (input) => {
              const { nodeId } = input;
              const { result, updatedAt, nodeCount } = await workspace.applyMutation((draft) => {
                const node = requireNode(draft, nodeId);
                const currentIndex = draft.findIndex((entry) => entry.id === node.id);

                draft.splice(currentIndex, 1);

                return {
                  nodeId: node.id,
                  title: node.title,
                };
              });

              return deleteNodeOutputSchema.parse({
                deleted: true,
                nodeId: result.nodeId,
                title: result.title,
                updatedAt,
                nodeCount,
              });
            },
          }),
          tool({
            name: "create_tab",
            description:
              "Create a new tab on an existing node and make it the active tab for that node.",
            inputSchema: z.object({
              nodeId: z.string().trim().min(1),
              title: z.string().trim().min(1).max(80).optional(),
            }),
            outputSchema: tabMutationOutputSchema,
            execute: async ({ nodeId, title }) => {
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const node = requireNode(draft, nodeId);
                  const tab = createDefaultWorkspaceTab(title?.trim() || "New tab");

                  node.tabs.push(tab);
                  node.viewState.activeTabId = tab.id;
                  node.updatedAt = timestamp;

                  return {
                    nodeId: node.id,
                    tabId: tab.id,
                  };
                },
              );
              const { node, tab: nextTab } = requireTab(
                workspace.getNodes(),
                result.nodeId,
                result.tabId,
              );

              return {
                node: describeNodeReference(node),
                tab: describeTabReference(nextTab),
                updatedAt,
                nodeCount,
                blockCount: nextTab.blocks.length,
              };
            },
          }),
          tool({
            name: "replace_tab",
            description:
              'Replace a tab with a full raw tab payload. Call get_tab_details with detailLevel: "full" first, edit the raw tab, then call this tool.',
            inputSchema: z.object({
              nodeId: z.string().trim().min(1),
              tabId: z.string().trim().min(1),
              tab: opaqueWorkspacePayloadSchema,
            }),
            outputSchema: tabMutationOutputSchema,
            execute: async ({ nodeId, tabId, tab }) => {
              const parsedTab = workspaceNodeTabSchema.parse(tab);
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const { node, tab: currentTab } = requireTab(draft, nodeId, tabId);
                  const currentIndex = node.tabs.findIndex((entry) => entry.id === currentTab.id);
                  const nextTab = workspaceNodeTabSchema.parse({
                    ...parsedTab,
                    id: currentTab.id,
                    createdAt: currentTab.createdAt,
                    updatedAt: timestamp,
                  });

                  assertBlocksUseKnownCustomTemplates(node, nextTab.blocks);
                  node.tabs[currentIndex] = nextTab;
                  node.updatedAt = timestamp;

                  return {
                    nodeId: node.id,
                    tabId: nextTab.id,
                  };
                },
              );
              const { node, tab: nextTab } = requireTab(
                workspace.getNodes(),
                result.nodeId,
                result.tabId,
              );

              return {
                node: describeNodeReference(node),
                tab: describeTabReference(nextTab),
                updatedAt,
                nodeCount,
                blockCount: nextTab.blocks.length,
              };
            },
          }),
          tool({
            name: "delete_tab",
            description:
              "Delete a tab from a node. If it was the last tab, the node gets a fallback Overview tab so the workspace stays usable.",
            inputSchema: z.object({
              nodeId: z.string().trim().min(1),
              tabId: z.string().trim().min(1),
            }),
            outputSchema: deleteTabOutputSchema,
            execute: async ({ nodeId, tabId }) => {
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const { node, tab } = requireTab(draft, nodeId, tabId);
                  const deletedTabTitle = tab.title;
                  const currentIndex = node.tabs.findIndex((entry) => entry.id === tab.id);
                  let fallbackTabId: string | null = null;

                  node.tabs = node.tabs.filter((entry) => entry.id !== tab.id);

                  if (node.tabs.length === 0) {
                    const fallbackTab = createDefaultWorkspaceTab("Overview", node.content);
                    node.tabs = [fallbackTab];
                    node.viewState.activeTabId = fallbackTab.id;
                    fallbackTabId = fallbackTab.id;
                  } else if (node.viewState.activeTabId === tab.id) {
                    const nextTab =
                      node.tabs[currentIndex] ??
                      node.tabs[Math.max(0, currentIndex - 1)] ??
                      node.tabs[0] ??
                      null;
                    node.viewState.activeTabId = nextTab?.id ?? null;
                  }

                  node.updatedAt = timestamp;

                  return {
                    nodeId: node.id,
                    deletedTabId: tab.id,
                    deletedTabTitle,
                    fallbackTabId,
                  };
                },
              );
              const node = requireNode(workspace.getNodes(), result.nodeId);
              const fallbackTab = result.fallbackTabId
                ? (node.tabs.find((tab) => tab.id === result.fallbackTabId) ?? null)
                : null;

              return {
                node: describeNodeReference(node),
                deletedTabId: result.deletedTabId,
                deletedTabTitle: result.deletedTabTitle,
                updatedAt,
                nodeCount,
                tabsCount: node.tabs.length,
                activeTabId: node.viewState.activeTabId ?? null,
                fallbackTab: fallbackTab ? describeTabReference(fallbackTab) : null,
              };
            },
          }),
          tool<typeof createBlockInputSchema, typeof blockMutationOutputSchema>({
            name: "create_block",
            description:
              "Create a new block inside an existing tab. Requires nodeId and tabId — use the scoped IDs from the current context when available. This is the correct tool when the user asks to add a block, content, or a new section to their current tab. Do NOT use create_node for this. Supports the full workspace block catalog. Use customTemplateId when creating a custom block. For notes blocks, pass content to set the body text in a single step instead of needing a follow-up patch_block call.",
            inputSchema: createBlockInputSchema,
            outputSchema: blockMutationOutputSchema,
            execute: async ({ nodeId, tabId, type, title, content, customTemplateId }) => {
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const { node, tab } = requireTab(draft, nodeId, tabId);
                  const block = createBlockByType({
                    node,
                    type,
                    title,
                    customTemplateId,
                    ...(type === "notes" && content ? { content } : {}),
                  });

                  tab.blocks.push(block);
                  tab.updatedAt = timestamp;
                  node.updatedAt = timestamp;

                  return {
                    nodeId: node.id,
                    tabId: tab.id,
                    blockId: block.id,
                  };
                },
              );
              const {
                node,
                tab,
                block: nextBlock,
              } = requireBlock(workspace.getNodes(), result.nodeId, result.tabId, result.blockId);

              return blockMutationOutputSchema.parse({
                node: describeNodeReference(node),
                tab: describeTabReference(tab),
                block: describeBlockReference(nextBlock, node.customBlockTemplates),
                customBlockTemplate: (() => {
                  const template = getCustomBlockTemplateForBlock(node, nextBlock);

                  return template ? describeCustomBlockTemplateReference(template) : null;
                })(),
                updatedAt,
                nodeCount,
              });
            },
          }),
          tool<typeof patchBlockInputSchema, typeof patchBlockOutputSchema>({
            name: "patch_block",
            description:
              "Patch a block with targeted nested operations instead of replacing the whole payload. Supports dot paths, [] wildcards, numeric indexes like courses[0], and selectors like lessons[id=lesson-123]. Prefer this for most edits, including bulk updates such as setting courses[].lessons[].recorded to true.",
            inputSchema: patchBlockInputSchema,
            outputSchema: patchBlockOutputSchema,
            execute: async ({ nodeId, tabId, blockId, operations }) => {
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const {
                    node,
                    tab,
                    block: currentBlock,
                  } = requireBlock(draft, nodeId, tabId, blockId);
                  const currentIndex = tab.blocks.findIndex(
                    (entry) => entry.id === currentBlock.id,
                  );
                  const draftBlock = cloneStructuredValue(currentBlock);
                  let matchCount = 0;

                  for (const operation of operations) {
                    matchCount += applyBlockPatchOperation(draftBlock, operation);
                  }

                  const nextBlock = workspaceBlockSchema.parse({
                    ...draftBlock,
                    id: currentBlock.id,
                    createdAt: currentBlock.createdAt,
                    updatedAt: timestamp,
                  });

                  assertBlocksUseKnownCustomTemplates(node, [nextBlock]);
                  tab.blocks[currentIndex] = nextBlock;
                  tab.updatedAt = timestamp;
                  node.updatedAt = timestamp;

                  return {
                    nodeId: node.id,
                    tabId: tab.id,
                    blockId: nextBlock.id,
                    operationsApplied: operations.length,
                    matchCount,
                  };
                },
              );
              const {
                node,
                tab,
                block: nextBlock,
              } = requireBlock(workspace.getNodes(), result.nodeId, result.tabId, result.blockId);

              return patchBlockOutputSchema.parse({
                node: describeNodeReference(node),
                tab: describeTabReference(tab),
                block: describeBlockReference(nextBlock, node.customBlockTemplates),
                customBlockTemplate: (() => {
                  const template = getCustomBlockTemplateForBlock(node, nextBlock);

                  return template ? describeCustomBlockTemplateReference(template) : null;
                })(),
                operationsApplied: result.operationsApplied,
                matchCount: result.matchCount,
                updatedAt,
                nodeCount,
              });
            },
          }),
          tool<typeof replaceBlockInputSchema, typeof blockMutationOutputSchema>({
            name: "replace_block",
            description:
              'Update any supported block by sending the full raw block payload. Use this when patch_block cannot express the change cleanly. Call get_block_details with detailLevel: "full" first, follow its editGuide, preserve ids and references unless the user explicitly wants them changed, edit only the requested fields, then call this tool.',
            inputSchema: replaceBlockInputSchema,
            outputSchema: blockMutationOutputSchema,
            execute: async ({ nodeId, tabId, blockId, block }) => {
              const parsedBlock = workspaceBlockSchema.parse(block);
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const {
                    node,
                    tab,
                    block: currentBlock,
                  } = requireBlock(draft, nodeId, tabId, blockId);
                  const currentIndex = tab.blocks.findIndex(
                    (entry) => entry.id === currentBlock.id,
                  );
                  const nextBlock = workspaceBlockSchema.parse({
                    ...parsedBlock,
                    id: currentBlock.id,
                    createdAt: currentBlock.createdAt,
                    updatedAt: timestamp,
                  });

                  assertBlocksUseKnownCustomTemplates(node, [nextBlock]);
                  tab.blocks[currentIndex] = nextBlock;
                  tab.updatedAt = timestamp;
                  node.updatedAt = timestamp;

                  return {
                    nodeId: node.id,
                    tabId: tab.id,
                    blockId: nextBlock.id,
                  };
                },
              );
              const {
                node,
                tab,
                block: nextBlock,
              } = requireBlock(workspace.getNodes(), result.nodeId, result.tabId, result.blockId);

              return blockMutationOutputSchema.parse({
                node: describeNodeReference(node),
                tab: describeTabReference(tab),
                block: describeBlockReference(nextBlock, node.customBlockTemplates),
                customBlockTemplate: (() => {
                  const template = getCustomBlockTemplateForBlock(node, nextBlock);

                  return template ? describeCustomBlockTemplateReference(template) : null;
                })(),
                updatedAt,
                nodeCount,
              });
            },
          }),
          tool({
            name: "delete_block",
            description: "Delete a block from a tab by id.",
            inputSchema: z.object({
              nodeId: z.string().trim().min(1),
              tabId: z.string().trim().min(1),
              blockId: z.string().trim().min(1),
            }),
            outputSchema: deleteBlockOutputSchema,
            execute: async ({ nodeId, tabId, blockId }) => {
              const { result, updatedAt, nodeCount } = await workspace.applyMutation(
                (draft, timestamp) => {
                  const { node, tab, block } = requireBlock(draft, nodeId, tabId, blockId);
                  const deletedBlockTitle = block.title;

                  tab.blocks = tab.blocks.filter((entry) => entry.id !== block.id);
                  tab.updatedAt = timestamp;
                  node.updatedAt = timestamp;

                  return {
                    nodeId: node.id,
                    tabId: tab.id,
                    deletedBlockId: block.id,
                    deletedBlockTitle,
                  };
                },
              );
              const { node, tab } = requireTab(workspace.getNodes(), result.nodeId, result.tabId);

              return {
                node: describeNodeReference(node),
                tab: describeTabReference(tab),
                deletedBlockId: result.deletedBlockId,
                deletedBlockTitle: result.deletedBlockTitle,
                updatedAt,
                nodeCount,
                remainingBlockCount: tab.blocks.length,
              };
            },
          }),
        ]
      : []),
    tool({
      name: "get_marketplace_item_details",
      description: `Inspect a marketplace item. ${profileGuidance}`,
      inputSchema: z.object({
        itemId: z.string().trim().min(1),
        detailLevel: detailLevelSchema.default("summary"),
      }),
      outputSchema: getMarketplaceItemDetailsOutputSchema,
      execute: async ({ itemId, detailLevel }) => {
        const item = marketplaceItems.find((entry) => entry.id === itemId) ?? null;

        return {
          summary: item
            ? {
                id: item.id,
                title: item.title,
                summary: item.summary,
                kind: item.payload.kind,
                createdByName: item.createdByName,
                updatedAt: item.updatedAt,
                payloadSummary: summarizeMarketplaceItemPayload(item),
              }
            : null,
          item: detailLevel === "full" ? item : null,
        };
      },
    }),
    tool({
      name: "fetch_web_page",
      description: [
        "Fetch a public web page and return its readable text plus title.",
        "Use when the user shares a URL, asks you to read or summarize a link, research a topic, or import structured info into a node.",
        "Only public HTTP/HTTPS URLs are allowed. Auth-walled, internal, or private addresses are rejected.",
        "Output is truncated for large pages — request a specific section by passing a more specific URL when possible.",
      ].join(" "),
      inputSchema: z.object({
        url: z.string().trim().url(),
        maxCharacters: z
          .number()
          .int()
          .min(500)
          .max(20_000)
          .default(8_000)
          .describe("Maximum characters of extracted text to return."),
      }),
      outputSchema: z.object({
        url: z.string(),
        finalUrl: z.string(),
        title: z.string().nullable(),
        excerpt: z.string().nullable(),
        contentType: z.string().nullable(),
        text: z.string(),
        truncated: z.boolean(),
        error: z.string().nullable(),
      }),
      execute: async ({ url, maxCharacters }) => {
        const empty = (error: string) => ({
          url,
          finalUrl: url,
          title: null,
          excerpt: null,
          contentType: null,
          text: "",
          truncated: false,
          error,
        });

        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          return empty("Invalid URL.");
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return empty("Only http and https URLs are supported.");
        }

        const host = parsed.hostname.toLowerCase();
        const blockedHostPatterns = [
          /^localhost$/,
          /^127\./,
          /^10\./,
          /^192\.168\./,
          /^172\.(1[6-9]|2\d|3[0-1])\./,
          /^169\.254\./,
          /^0\.0\.0\.0$/,
          /^::1$/,
          /\.local$/,
          /\.internal$/,
        ];
        if (blockedHostPatterns.some((pattern) => pattern.test(host))) {
          return empty("Refusing to fetch private or internal hosts.");
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        let response: Response;
        try {
          response = await fetch(parsed.toString(), {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; OrchAgent/1.0; +https://orch.app/agent)",
              Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
              "Accept-Language": "en-US,en;q=0.8",
            },
          });
        } catch (caught) {
          clearTimeout(timeout);
          const message =
            caught instanceof Error
              ? caught.name === "AbortError"
                ? "Request timed out after 10s."
                : caught.message
              : "Failed to fetch URL.";
          return empty(message);
        }
        clearTimeout(timeout);

        if (!response.ok) {
          return {
            ...empty(`HTTP ${response.status} ${response.statusText || ""}`.trim()),
            finalUrl: response.url || url,
            contentType: response.headers.get("content-type"),
          };
        }

        const contentType = response.headers.get("content-type");
        if (contentType && !/^(text\/|application\/(xhtml|json|xml))/i.test(contentType)) {
          return {
            ...empty(`Unsupported content-type: ${contentType}`),
            finalUrl: response.url || url,
            contentType,
          };
        }

        let raw: string;
        try {
          raw = await response.text();
        } catch (caught) {
          return empty(caught instanceof Error ? caught.message : "Failed to read response body.");
        }

        // Cap input to avoid pathological pages.
        const capped = raw.slice(0, 750_000);

        const titleMatch = capped.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const ogTitleMatch = capped.match(
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        );
        const descMatch = capped.match(
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        );
        const ogDescMatch = capped.match(
          /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        );

        const decodeEntities = (input: string) =>
          input
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));

        const cleanTitle = (value: string | undefined | null) =>
          value ? decodeEntities(value).replace(/\s+/g, " ").trim() || null : null;

        const title = cleanTitle(ogTitleMatch?.[1]) ?? cleanTitle(titleMatch?.[1]);
        const excerpt = cleanTitle(ogDescMatch?.[1]) ?? cleanTitle(descMatch?.[1]);

        const stripped = capped
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
          .replace(/<!--([\s\S]*?)-->/g, " ")
          .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, "\n")
          .replace(/<br\s*\/?>(?=)/gi, "\n")
          .replace(/<[^>]+>/g, " ");

        const text = decodeEntities(stripped)
          .replace(/[ \t\f\v]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/^[ \t]+|[ \t]+$/gm, "")
          .trim();

        const truncated = text.length > maxCharacters;
        const finalText = truncated ? `${text.slice(0, maxCharacters)}…` : text;

        return {
          url,
          finalUrl: response.url || url,
          title,
          excerpt,
          contentType,
          text: finalText,
          truncated,
          error: null,
        };
      },
    }),
    tool({
      name: "get_current_time",
      description: "Get the current ISO timestamp for time-sensitive planning questions.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        iso: z.string(),
      }),
      execute: async () => ({
        iso: new Date().toISOString(),
      }),
    }),
  ];

  return tools;
}
