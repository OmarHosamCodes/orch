import { createOpenRouterClient, openRouterFetchOptions } from "./client";
import type { AgentModelInputMessage } from "./types";

export const PLANNER_SYSTEM_PROMPT = [
  "You are Orch's internal planner. There is no Ask, Plan, or Agent mode.",
  "Output a short numbered plan of the tool calls you will make next.",
  "Agency data writes will be proposed for confirmation. Canvas, knowledge, inbox, facts, and navigation apply immediately.",
  "Do not answer the user. Do not invent ids. Prefer inspecting with read tools before writes.",
].join(" ");

export function formatPlannerPlanForTools(planText: string): string {
  const trimmed = planText.trim();
  if (!trimmed) {
    return "Internal plan: inspect with tools, then act. Do not show this note to the user.";
  }
  return `Internal plan (do not show this verbatim to the user):\n${trimmed}`;
}

export function parsePlannerTodos(planText: string) {
  const items: Array<{ id: string; title: string; status: "pending" }> = [];
  for (const line of planText.split("\n")) {
    const match = /^\s*(?:\d+[.)]|[-*])\s+(.+)$/.exec(line);
    const title = match?.[1]?.trim();
    if (!title) continue;
    items.push({
      id: `todo-${items.length + 1}`,
      title: title.slice(0, 160),
      status: "pending",
    });
    if (items.length >= 12) break;
  }
  return items;
}

export async function runPlannerPass(input: {
  model: string;
  messages: AgentModelInputMessage[];
  signal?: AbortSignal;
}): Promise<string> {
  const result = createOpenRouterClient().callModel(
    {
      model: input.model,
      instructions: PLANNER_SYSTEM_PROMPT,
      input: input.messages,
      maxOutputTokens: 400,
    },
    openRouterFetchOptions(input.signal),
  );
  const cancel = () => {
    void result.cancel();
  };
  input.signal?.addEventListener("abort", cancel, { once: true });
  try {
    const text = await result.getText();
    return text.trim();
  } catch {
    return "";
  } finally {
    input.signal?.removeEventListener("abort", cancel);
  }
}
