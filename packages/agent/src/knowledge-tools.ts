import { tool } from "@openrouter/sdk/lib/tool";
import {
  knowledgeObjectViewSchema,
  knowledgeObjectTypeSchema,
  knowledgeTargetSchema,
} from "@orch/workspace";
import { z } from "zod";

import { knowledgeActionLabel, knowledgeActionSchema } from "./knowledge-actions";
import type { CanvasAgentRuntime, DashboardAgentToolPreset } from "./types";

function buildKnowledgeQueryTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "query_knowledge",
    description:
      "Query the team brain: canvas notes, decisions, sources, folders, plus live Agency projects, tasks, members, clients, and time entries. Use about: { objectType, id } for backlinks. Folders use in relations. Never invent Agency ids.",
    inputSchema: z.object({
      canvasWorkspaceId: z.string().trim().min(1).optional(),
      teamId: z.string().trim().min(1).optional(),
      objectType: knowledgeObjectTypeSchema.optional(),
      query: z.string().trim().min(1).optional(),
      about: knowledgeTargetSchema.optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    outputSchema: z.object({ items: z.array(knowledgeObjectViewSchema) }),
    execute: async (input) => {
      if (!runtime.queryKnowledge) return { items: [] };
      return runtime.queryKnowledge(input);
    },
  });
}

function buildKnowledgeGetTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "get_knowledge_object",
    description:
      "Read one knowledge object or live Agency record. Include inbound relations so you can answer what we decided about a project.",
    inputSchema: z.object({
      id: z.string().trim().min(1),
      objectType: knowledgeObjectTypeSchema.optional(),
      teamId: z.string().trim().min(1).optional(),
    }),
    outputSchema: z.unknown(),
    execute: async (input) => {
      if (!runtime.getKnowledge) return { missing: true };
      return runtime.getKnowledge(input);
    },
  });
}

function buildKnowledgeApplyTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "apply_knowledge_action",
    description:
      "Apply one knowledge write immediately (object.create/update/delete, relation.create/delete including in to folders, placement.upsert for Agency pins). Cannot create or edit Agency projects/tasks/time. Link with about, group with in.",
    inputSchema: z.object({
      action: knowledgeActionSchema,
      label: z.string().trim().min(1).max(200).optional(),
    }),
    outputSchema: z.object({
      applied: z.literal(true),
      objectId: z.string().nullable(),
      objectType: z.string().nullable(),
      label: z.string(),
      boardHref: z.string(),
    }),
    execute: async ({ action, label }) => {
      const parsed = knowledgeActionSchema.parse(action);
      if (!runtime.applyKnowledgeAction) {
        throw new Error("Knowledge writes are unavailable.");
      }
      return runtime.applyKnowledgeAction({
        action: parsed,
        label: label ?? knowledgeActionLabel(parsed),
      });
    },
  });
}

function buildListWorkspacesTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "list_workspaces",
    description:
      "List the user's named Canvas brains. Use this from the central nervous system before querying or writing a specific brain.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          instructions: z.string(),
        }),
      ),
    }),
    execute: async () => {
      if (!runtime.listWorkspaces) return { items: [] };
      return runtime.listWorkspaces();
    },
  });
}

export function buildKnowledgeTools(
  runtime: CanvasAgentRuntime,
  _preset: DashboardAgentToolPreset,
) {
  void _preset;
  return [
    buildListWorkspacesTool(runtime),
    buildKnowledgeQueryTool(runtime),
    buildKnowledgeGetTool(runtime),
    buildKnowledgeApplyTool(runtime),
  ];
}
