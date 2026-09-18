import { env } from "@orch/env/server";
import { OpenRouter } from "@openrouter/sdk";

export function createOpenRouterClient() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  return new OpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });
}

export function openRouterFetchOptions(signal?: AbortSignal) {
  return signal ? { fetchOptions: { signal } } : {};
}
