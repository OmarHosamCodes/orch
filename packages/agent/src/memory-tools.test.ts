import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { buildMemoryTools } from "./memory-tools";

type ToolFunction = {
  name: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  execute: (input: unknown) => Promise<unknown>;
};

function getTool(tools: ReturnType<typeof buildMemoryTools>, name: string): ToolFunction {
  const toolEntry = tools.find(
    (entry) => entry.type === "function" && entry.function.name === name,
  );
  if (!toolEntry || toolEntry.type !== "function" || !toolEntry.function.outputSchema) {
    throw new Error(`Missing tool ${name}`);
  }
  return {
    name: toolEntry.function.name,
    inputSchema: toolEntry.function.inputSchema,
    outputSchema: toolEntry.function.outputSchema,
    execute: toolEntry.function.execute as ToolFunction["execute"],
  };
}

describe("buildMemoryTools", () => {
  test("remember_fact upserts through the runtime", async () => {
    const calls: Array<{ key: string; value: string }> = [];
    const tools = buildMemoryTools({
      rememberFact: async (input) => {
        calls.push(input);
        return { key: input.key };
      },
    });
    const remember = getTool(tools, "remember_fact");
    await expect(remember.execute({ key: "report_format", value: "nH:nM:nS" })).resolves.toEqual({
      key: "report_format",
      saved: true,
    });
    expect(calls).toEqual([{ key: "report_format", value: "nH:nM:nS" }]);
  });
});
