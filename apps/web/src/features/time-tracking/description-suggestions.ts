const DESCRIPTION_SUGGESTION_LIMIT = 10;
/** Max unique compounds kept after aggregation (ranker trims further). */
const DESCRIPTION_SUGGESTION_POOL = 40;

export type DescriptionSuggestionEntry = {
  description: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIconKey?: string | null;
  projectId: string;
  projectName: string;
  colorHueId?: number | null;
  projectIconKey?: string | null;
  clientName: string;
  /** ISO datetime from the source entry; used for recency / time-of-day ranking. */
  startedAt?: string;
};

export type DescriptionDatalistOption = {
  description: string;
  taskId: string | null;
  taskTitle: string | null;
  taskIconKey?: string | null;
  projectId: string;
  projectName: string;
  colorHueId?: number | null;
  projectIconKey?: string | null;
  clientName: string;
  /** How many recent entries collapsed into this compound. */
  frequency: number;
  /** Epoch ms of the newest underlying entry. */
  lastUsedAtMs: number;
};

export function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Draft fields to apply when the user explicitly picks a suggestion (not on typing). */
export function draftFromDescriptionSuggestion(option: DescriptionDatalistOption): {
  description: string;
  taskId: string;
  projectId: string;
} {
  return {
    description: option.description,
    taskId: option.taskId ?? "",
    projectId: option.projectId,
  };
}

function parseStartedAtMs(startedAt: string | undefined) {
  if (!startedAt) return 0;
  const ms = Date.parse(startedAt);
  return Number.isFinite(ms) ? ms : 0;
}

/** Aggregate recent entries into unique description compounds with frequency + recency. */
export function buildDescriptionDatalistOptions(
  entries: DescriptionSuggestionEntry[],
  options?: { limit?: number },
): DescriptionDatalistOption[] {
  const limit = options?.limit ?? DESCRIPTION_SUGGESTION_POOL;
  type Aggregate = {
    option: Omit<DescriptionDatalistOption, "frequency" | "lastUsedAtMs">;
    frequency: number;
    lastUsedAtMs: number;
  };
  const byKey = new Map<string, Aggregate>();

  for (const entry of entries) {
    const description = entry.description.trim() || entry.taskTitle?.trim() || "";
    if (!description) continue;

    const key = normalizeSuggestionText(description);
    const at = parseStartedAtMs(entry.startedAt);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        frequency: 1,
        lastUsedAtMs: at,
        option: {
          description,
          taskId: entry.taskId,
          taskTitle: entry.taskTitle,
          taskIconKey: entry.taskIconKey,
          projectId: entry.projectId,
          projectName: entry.projectName,
          colorHueId: entry.colorHueId,
          projectIconKey: entry.projectIconKey,
          clientName: entry.clientName,
        },
      });
      continue;
    }

    existing.frequency += 1;
    if (at >= existing.lastUsedAtMs) {
      existing.lastUsedAtMs = at;
      existing.option = {
        description,
        taskId: entry.taskId,
        taskTitle: entry.taskTitle,
        taskIconKey: entry.taskIconKey,
        projectId: entry.projectId,
        projectName: entry.projectName,
        colorHueId: entry.colorHueId,
        projectIconKey: entry.projectIconKey,
        clientName: entry.clientName,
      };
    }
  }

  return [...byKey.values()]
    .sort((left, right) => right.lastUsedAtMs - left.lastUsedAtMs)
    .slice(0, limit)
    .map((aggregate) => ({
      ...aggregate.option,
      frequency: aggregate.frequency,
      lastUsedAtMs: aggregate.lastUsedAtMs,
    }));
}

export type RankDescriptionSuggestionsContext = {
  query: string;
  affinityProjectId?: string;
  nowMs?: number;
  limit?: number;
};

function optionSearchText(option: DescriptionDatalistOption) {
  return normalizeSuggestionText(
    [option.description, option.taskTitle ?? "", option.projectName, option.clientName].join(" "),
  );
}

function optionMatchesQuery(option: DescriptionDatalistOption, query: string) {
  return optionSearchText(option).includes(query);
}

function scoreDescriptionSuggestion(
  option: DescriptionDatalistOption,
  query: string,
  affinityProjectId: string | undefined,
  nowMs: number,
) {
  let score = 0;
  const description = normalizeSuggestionText(option.description);
  const task = normalizeSuggestionText(option.taskTitle ?? "");
  const project = normalizeSuggestionText(option.projectName);
  const client = normalizeSuggestionText(option.clientName);

  if (query) {
    if (description.startsWith(query)) score += 120;
    else if (description.includes(query)) score += 80;
    if (task.startsWith(query)) score += 70;
    else if (task.includes(query)) score += 45;
    if (project.includes(query)) score += 25;
    if (client.includes(query)) score += 15;
  }

  // Recency: ~full weight within ~3 days, then taper.
  const ageHours = Math.max(0, (nowMs - option.lastUsedAtMs) / 3_600_000);
  score += Math.max(0, 50 - ageHours * 0.7);

  // Frequency (log-ish).
  score += Math.min(40, Math.log2(1 + option.frequency) * 14);

  if (affinityProjectId && option.projectId === affinityProjectId) {
    score += 35;
  }

  // Soft time-of-day affinity (±1 hour of last use).
  if (option.lastUsedAtMs > 0) {
    const lastHour = new Date(option.lastUsedAtMs).getHours();
    const nowHour = new Date(nowMs).getHours();
    const hourDelta = Math.min(Math.abs(lastHour - nowHour), 24 - Math.abs(lastHour - nowHour));
    if (hourDelta <= 1) score += 8;
  }

  return score;
}

/** Local context-aware ranking for compound description+task suggestions. */
export function rankDescriptionDatalistOptions(
  options: DescriptionDatalistOption[],
  context: RankDescriptionSuggestionsContext,
): DescriptionDatalistOption[] {
  const query = normalizeSuggestionText(context.query);
  const nowMs = context.nowMs ?? Date.now();
  const limit = context.limit ?? DESCRIPTION_SUGGESTION_LIMIT;
  const affinityProjectId = context.affinityProjectId || undefined;

  const scored = options
    .filter((option) => !query || optionMatchesQuery(option, query))
    .map((option) => ({
      option,
      score: scoreDescriptionSuggestion(option, query, affinityProjectId, nowMs),
    }));

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return right.option.lastUsedAtMs - left.option.lastUsedAtMs;
  });

  return scored.slice(0, limit).map((row) => row.option);
}

/** First ranked compound that carries a task — for task-chooser best-match highlight. */
export function bestTaskIdFromRankedSuggestions(
  options: DescriptionDatalistOption[],
): string | null {
  for (const option of options) {
    if (option.taskId) return option.taskId;
  }
  return null;
}
