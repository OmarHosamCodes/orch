import type { Model } from "@openrouter/sdk/models";
import { env } from "@orch/env/server";
import { z } from "zod";

import { resolveBudgetModel } from "./budget-model";
import { createOpenRouterClient } from "./client";
import type { ModelPromptSignals, ResolveModelForTurnResult } from "./model-routing";
import { DEFAULT_AGENT_MODEL, DEFAULT_AGENT_MODEL_PRESET, type AgentModelPreset } from "./types";

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const ACCOUNT_STATUS_CACHE_TTL_MS = 60 * 1000;

export const openRouterPricingSchema = z.object({
  prompt: z.string().min(1),
  completion: z.string().min(1),
  request: z.string().min(1).optional(),
  image: z.string().min(1).optional(),
  imageToken: z.string().min(1).optional(),
  imageOutput: z.string().min(1).optional(),
  audio: z.string().min(1).optional(),
  audioOutput: z.string().min(1).optional(),
  inputAudioCache: z.string().min(1).optional(),
  webSearch: z.string().min(1).optional(),
  internalReasoning: z.string().min(1).optional(),
  inputCacheRead: z.string().min(1).optional(),
  inputCacheWrite: z.string().min(1).optional(),
  discount: z.number().optional(),
});

export const openRouterCatalogModelSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  creatorId: z.string().trim().min(1),
  creatorLabel: z.string().trim().min(1),
  contextLength: z.number().int().positive().nullable(),
  supportsTools: z.boolean(),
  pricing: openRouterPricingSchema,
  isFree: z.boolean(),
});

export const openRouterModelCatalogResponseSchema = z.object({
  defaultModel: z.string().trim().min(1),
  models: z.array(openRouterCatalogModelSchema),
});

export const openRouterAccountStatusSchema = z.object({
  totalCredits: z.number().nonnegative(),
  totalUsage: z.number().nonnegative(),
  availableCredits: z.number(),
  keyLabel: z.string().trim().min(1),
  isFreeTier: z.boolean(),
  limit: z.number().nullable(),
  limitRemaining: z.number().nullable(),
  usageDaily: z.number().nonnegative(),
  usageMonthly: z.number().nonnegative(),
});

export const openRouterFreeModelSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  contextLength: z.number().int().positive().nullable(),
  provider: z.string().trim().min(1),
  inputModalities: z.array(z.string()),
  outputModalities: z.array(z.string()),
  supportsTools: z.boolean(),
});

export const openRouterFreeModelsResponseSchema = z.object({
  defaultModel: z.string().trim().min(1),
  models: z.array(openRouterFreeModelSchema),
});

export type OpenRouterPricing = z.infer<typeof openRouterPricingSchema>;
export type OpenRouterCatalogModel = z.infer<typeof openRouterCatalogModelSchema>;
export type OpenRouterModelCatalogResponse = z.infer<typeof openRouterModelCatalogResponseSchema>;
export type OpenRouterAccountStatus = z.infer<typeof openRouterAccountStatusSchema>;
export type OpenRouterFreeModel = z.infer<typeof openRouterFreeModelSchema>;
export type OpenRouterFreeModelsResponse = z.infer<typeof openRouterFreeModelsResponseSchema>;

type ExpiringCache<TResponse> = {
  expiresAt: number;
  response: TResponse;
};

let modelCatalogCache: ExpiringCache<OpenRouterModelCatalogResponse> | null = null;
let modelCatalogRequest: Promise<OpenRouterModelCatalogResponse> | null = null;
let accountStatusCache: ExpiringCache<OpenRouterAccountStatus> | null = null;
let accountStatusRequest: Promise<OpenRouterAccountStatus> | null = null;

function hasTextOutput(model: Model) {
  return model.architecture.outputModalities.includes("text");
}

function normalizeCreatorId(model: Model) {
  return model.id.split("/")[0]?.trim() || model.id.trim();
}

function normalizeCreatorLabel(model: Model, creatorId: string) {
  const labelFromName = model.name.split(":")[0]?.trim();

  if (labelFromName) {
    return labelFromName;
  }

  return creatorId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isZeroPrice(value?: string | null) {
  return Number(value ?? "0") === 0;
}

function isFreeModel(model: Model) {
  return (
    model.id.endsWith(":free") ||
    (isZeroPrice(model.pricing.prompt) &&
      isZeroPrice(model.pricing.completion) &&
      isZeroPrice(model.pricing.request))
  );
}

function getDefaultModelId(models: OpenRouterCatalogModel[]) {
  return (
    models.find((model) => model.id === DEFAULT_AGENT_MODEL)?.id ??
    models[0]?.id ??
    DEFAULT_AGENT_MODEL
  );
}

function sortCatalogModels(models: OpenRouterCatalogModel[]) {
  return [...models].sort((left, right) => {
    if (left.id === DEFAULT_AGENT_MODEL) {
      return -1;
    }

    if (right.id === DEFAULT_AGENT_MODEL) {
      return 1;
    }

    if (left.isFree !== right.isFree) {
      return left.isFree ? -1 : 1;
    }

    if (left.supportsTools !== right.supportsTools) {
      return left.supportsTools ? -1 : 1;
    }

    const contextLengthDifference = (right.contextLength ?? 0) - (left.contextLength ?? 0);

    if (contextLengthDifference !== 0) {
      return contextLengthDifference;
    }

    if (left.creatorLabel !== right.creatorLabel) {
      return left.creatorLabel.localeCompare(right.creatorLabel);
    }

    return left.name.localeCompare(right.name);
  });
}

function toCatalogModel(model: Model): OpenRouterCatalogModel | null {
  if (!hasTextOutput(model)) {
    return null;
  }

  const creatorId = normalizeCreatorId(model);

  return openRouterCatalogModelSchema.parse({
    id: model.id,
    name: model.name,
    description: model.description?.trim() || null,
    creatorId,
    creatorLabel: normalizeCreatorLabel(model, creatorId),
    contextLength: model.contextLength,
    supportsTools: model.supportedParameters.includes("tools"),
    pricing: model.pricing,
    isFree: isFreeModel(model),
  });
}

async function fetchOpenRouterModelCatalog() {
  const client = createOpenRouterClient();
  const response = await client.models
    .listForUser({
      bearer: env.OPENROUTER_API_KEY,
    })
    .catch(() => client.models.list());
  const models = sortCatalogModels(
    response.result.data
      .map(toCatalogModel)
      .filter((model): model is OpenRouterCatalogModel => model !== null),
  );

  return openRouterModelCatalogResponseSchema.parse({
    defaultModel: getDefaultModelId(models),
    models,
  });
}

async function fetchOpenRouterAccountStatus() {
  const client = createOpenRouterClient();
  const [keyMetadata, credits] = await Promise.all([
    client.apiKeys.getCurrentKeyMetadata(),
    client.credits.getCredits().catch(() => null),
  ]);
  const totalCredits =
    credits?.data.totalCredits ?? keyMetadata.data.limit ?? keyMetadata.data.usage;
  const totalUsage = credits?.data.totalUsage ?? keyMetadata.data.usage;
  const availableCredits =
    credits?.data.totalCredits !== undefined && credits?.data.totalUsage !== undefined
      ? credits.data.totalCredits - credits.data.totalUsage
      : (keyMetadata.data.limitRemaining ?? Math.max(totalCredits - totalUsage, 0));

  return openRouterAccountStatusSchema.parse({
    totalCredits,
    totalUsage,
    availableCredits,
    keyLabel: keyMetadata.data.label,
    isFreeTier: keyMetadata.data.isFreeTier,
    limit: keyMetadata.data.limit,
    limitRemaining: keyMetadata.data.limitRemaining,
    usageDaily: keyMetadata.data.usageDaily,
    usageMonthly: keyMetadata.data.usageMonthly,
  });
}

async function getOrRefreshCachedValue<TResponse>(args: {
  forceRefresh: boolean;
  cache: ExpiringCache<TResponse> | null;
  request: Promise<TResponse> | null;
  ttlMs: number;
  fetcher: () => Promise<TResponse>;
  setCache: (value: ExpiringCache<TResponse> | null) => void;
  setRequest: (value: Promise<TResponse> | null) => void;
}) {
  const now = Date.now();

  if (!args.forceRefresh && args.cache && args.cache.expiresAt > now) {
    return args.cache.response;
  }

  if (args.request) {
    return args.request;
  }

  const nextRequest = args
    .fetcher()
    .then((response) => {
      args.setCache({
        expiresAt: Date.now() + args.ttlMs,
        response,
      });

      return response;
    })
    .catch((error) => {
      if (args.cache) {
        return args.cache.response;
      }

      throw error;
    })
    .finally(() => {
      args.setRequest(null);
    });

  args.setRequest(nextRequest);

  return nextRequest;
}

export async function listOpenRouterModels(forceRefresh = false) {
  return getOrRefreshCachedValue({
    forceRefresh,
    cache: modelCatalogCache,
    request: modelCatalogRequest,
    ttlMs: MODEL_CACHE_TTL_MS,
    fetcher: fetchOpenRouterModelCatalog,
    setCache: (value) => {
      modelCatalogCache = value;
    },
    setRequest: (value) => {
      modelCatalogRequest = value;
    },
  });
}

export async function listOpenRouterFreeModels(forceRefresh = false) {
  const catalog = await listOpenRouterModels(forceRefresh);

  return openRouterFreeModelsResponseSchema.parse({
    defaultModel:
      catalog.models.find((model) => model.id === catalog.defaultModel && model.isFree)?.id ??
      catalog.models.find((model) => model.isFree)?.id ??
      catalog.defaultModel,
    models: catalog.models
      .filter((model) => model.isFree)
      .map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        contextLength: model.contextLength,
        provider: model.creatorLabel,
        inputModalities: ["text"],
        outputModalities: ["text"],
        supportsTools: model.supportsTools,
      })),
  });
}

export async function getOpenRouterAccountStatus(forceRefresh = false) {
  return getOrRefreshCachedValue({
    forceRefresh,
    cache: accountStatusCache,
    request: accountStatusRequest,
    ttlMs: ACCOUNT_STATUS_CACHE_TTL_MS,
    fetcher: fetchOpenRouterAccountStatus,
    setCache: (value) => {
      accountStatusCache = value;
    },
    setRequest: (value) => {
      accountStatusRequest = value;
    },
  });
}

export async function getOpenRouterModel(modelId: string) {
  const normalizedModelId = modelId.trim();

  if (!normalizedModelId) {
    return null;
  }

  const { models } = await listOpenRouterModels();

  return models.find((model) => model.id === normalizedModelId) ?? null;
}

export async function getOpenRouterFreeModel(modelId: string) {
  const normalizedModelId = modelId.trim();

  if (!normalizedModelId) {
    return null;
  }

  const { models } = await listOpenRouterFreeModels();

  return models.find((model) => model.id === normalizedModelId) ?? null;
}

export async function resolveOpenRouterModel(modelId?: string | null) {
  const normalizedModelId = modelId?.trim();

  try {
    const catalog = await listOpenRouterModels();
    const selectedModel = normalizedModelId
      ? catalog.models.find((model) => model.id === normalizedModelId)
      : null;

    if (selectedModel) {
      return selectedModel;
    }

    return (
      catalog.models.find((model) => model.id === catalog.defaultModel) ?? catalog.models[0] ?? null
    );
  } catch {
    return null;
  }
}

export async function resolveOpenRouterFreeModel(modelId?: string | null) {
  const normalizedModelId = modelId?.trim();

  try {
    const catalog = await listOpenRouterFreeModels();
    const selectedModel = normalizedModelId
      ? catalog.models.find((model) => model.id === normalizedModelId)
      : null;

    if (selectedModel) {
      return selectedModel;
    }

    return (
      catalog.models.find((model) => model.id === catalog.defaultModel) ?? catalog.models[0] ?? null
    );
  } catch {
    return null;
  }
}

export async function resolveOpenRouterModelForTurn(args: {
  preset?: AgentModelPreset | null;
  pinnedModelId?: string | null;
  signals: ModelPromptSignals;
  content?: string;
}): Promise<ResolveModelForTurnResult> {
  const preset = args.preset ?? DEFAULT_AGENT_MODEL_PRESET;
  const status = await getOpenRouterAccountStatus().catch(() => null);
  const modelId = resolveBudgetModel({
    remainingCreditsUsd: status?.availableCredits ?? status?.limitRemaining ?? null,
    freeToggle: preset.free,
  });

  return {
    model: null,
    modelId,
    pinnedCleared: Boolean(args.pinnedModelId && args.pinnedModelId !== modelId),
    reason: "auto",
  };
}
