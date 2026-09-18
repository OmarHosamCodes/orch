import { tool } from "@openrouter/sdk/lib/tool";
import { z } from "zod";

import { canvasActionLabel, canvasActionSchema } from "./canvas-actions";
import type { CanvasAgentRuntime, DashboardAgentToolPreset } from "./types";

function buildCanvasApplyTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "apply_canvas_action",
    description:
      "Apply one Canvas write immediately for the user. Returns the created or updated node/block so they can Open it. action.type is node.*|tab.*|block.*.",
    inputSchema: z.object({
      action: z.any(),
      label: z.string().trim().min(1).max(200).optional(),
    }),
    outputSchema: z.object({
      applied: z.literal(true),
      nodeId: z.string().nullable(),
      blockId: z.string().nullable(),
      label: z.string(),
      boardHref: z.string(),
      after: z.unknown(),
    }),
    execute: async ({ action, label }) => {
      const parsedAction = canvasActionSchema.parse(action);
      return runtime.applyCanvasAction({
        action: parsedAction,
        label: label ?? canvasActionLabel(parsedAction),
      });
    },
  });
}

export function buildCanvasWriteTools(
  runtime: CanvasAgentRuntime,
  _preset: DashboardAgentToolPreset,
) {
  void _preset;
  return [buildCanvasApplyTool(runtime)];
}
