import { tool } from "@openrouter/sdk/lib/tool";
import { z } from "zod";

import type { MemoryAgentRuntime } from "./types";

export function buildMemoryTools(runtime: MemoryAgentRuntime) {
  return [
    tool({
      name: "remember_fact",
      description:
        "Save or update a durable personal fact about this user (report format, timezone, preferences). Immediate. Never store personal preferences as knowledge objects.",
      inputSchema: z.object({
        key: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .describe("Stable snake_case key such as report_format or waste_priority."),
        value: z.string().trim().min(1).max(500),
      }),
      outputSchema: z.object({ key: z.string(), saved: z.literal(true) }),
      execute: async ({ key, value }) => {
        const saved = await runtime.rememberFact({ key, value });
        return { key: saved.key, saved: true as const };
      },
    }),
  ];
}
