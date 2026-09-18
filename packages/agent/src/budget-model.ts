import { AGENT_BUDGET_MODELS, type AgentBudgetModel } from "./types";

export function resolveBudgetModel(input: {
  remainingCreditsUsd: number | null;
  freeToggle: boolean;
}): AgentBudgetModel {
  if (input.freeToggle) {
    return "openrouter/free";
  }
  if (input.remainingCreditsUsd === null || input.remainingCreditsUsd <= 0) {
    return "openrouter/free";
  }
  return "openrouter/auto-beta";
}

export function isBudgetModel(modelId: string): modelId is AgentBudgetModel {
  return (AGENT_BUDGET_MODELS as readonly string[]).includes(modelId);
}
