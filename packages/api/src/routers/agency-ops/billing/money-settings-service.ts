import { db } from "@orch/db";
import {
  agencyOpsMoneySettings,
  type AgencyOpsMoneyCalcOptionsJson,
  type AgencyOpsMoneyRulesJson,
} from "@orch/db/schema";
import { eq } from "drizzle-orm";

import { requireAgencyRole } from "../shared/membership";
import {
  normalizeNumberRecord,
  normalizeStringArrayRecord,
  normalizeStringRecord,
} from "./money-settings-helpers";
import {
  getCachedMoneySettings,
  invalidateMoneySettingsCache,
  setCachedMoneySettings,
  type AgencyMoneySettingsRecord,
} from "./money-settings-cache";
import { defaultMoneyFormulas, mergeMoneyFormulas } from "./money-formula-templates";
import { validateMoneyFormulaTokens } from "./money-formula-tokens";

export type { AgencyMoneySettingsRecord } from "./money-settings-cache";

const DEFAULT_RULES: AgencyOpsMoneyRulesJson = {
  enabledRuleIds: ["profit-loss-share", "rent-allowance"],
  notesByRuleId: {},
  labelByRuleId: {},
  cohortByRuleId: {},
  memberIdsByRuleId: {},
};

function defaultCalc(): AgencyOpsMoneyCalcOptionsJson {
  const formulas = defaultMoneyFormulas();
  return {
    enabledOptionIds: [
      "roi-variables",
      "charity",
      "profit-loss-share",
      "paid-vacation",
      "device-compensation",
      "pbc",
    ],
    notesByOptionId: {},
    summaryByOptionId: {},
    valueByOptionId: { "paid-vacation": 200 },
    formulas,
  };
}

function normalizeRules(value: unknown): AgencyOpsMoneyRulesJson {
  if (!value || typeof value !== "object") return DEFAULT_RULES;
  const record = value as Partial<AgencyOpsMoneyRulesJson>;
  return {
    enabledRuleIds: Array.isArray(record.enabledRuleIds)
      ? record.enabledRuleIds.filter((id): id is string => typeof id === "string")
      : DEFAULT_RULES.enabledRuleIds,
    notesByRuleId: normalizeStringRecord(record.notesByRuleId),
    labelByRuleId: normalizeStringRecord(record.labelByRuleId),
    cohortByRuleId: normalizeStringRecord(record.cohortByRuleId),
    memberIdsByRuleId: normalizeStringArrayRecord(record.memberIdsByRuleId),
  };
}

function normalizeCalc(value: unknown): AgencyOpsMoneyCalcOptionsJson {
  const fallback = defaultCalc();
  if (!value || typeof value !== "object") return fallback;
  const record = value as Partial<AgencyOpsMoneyCalcOptionsJson>;
  const enabledOptionIds = Array.isArray(record.enabledOptionIds)
    ? record.enabledOptionIds.filter((id): id is string => typeof id === "string")
    : fallback.enabledOptionIds;
  const notesByOptionId = normalizeStringRecord(record.notesByOptionId);
  const summaryByOptionId = normalizeStringRecord(record.summaryByOptionId);
  const valueByOptionId = normalizeNumberRecord(record.valueByOptionId);
  const formulas = mergeMoneyFormulas(record.formulas, {
    enabledOptionIds,
    valueByOptionId,
    summaryByOptionId,
  });

  for (const formula of formulas) {
    const validation = validateMoneyFormulaTokens(formula.tokens);
    if (!validation.ok && formula.enabled) {
      formula.enabled = false;
    }
  }

  return {
    enabledOptionIds,
    notesByOptionId,
    summaryByOptionId,
    valueByOptionId,
    formulas,
  };
}

export async function getMoneySettings(
  actorUserId: string,
  input: { teamId: string },
): Promise<AgencyMoneySettingsRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const cached = getCachedMoneySettings(input.teamId);
  if (cached) return cached;

  const [row] = await db
    .select()
    .from(agencyOpsMoneySettings)
    .where(eq(agencyOpsMoneySettings.teamId, input.teamId))
    .limit(1);

  if (!row) {
    const value = {
      teamId: input.teamId,
      currency: "USD",
      currencyLockedAt: null,
      rules: DEFAULT_RULES,
      calcOptions: defaultCalc(),
      updatedAt: new Date(0).toISOString(),
    };
    setCachedMoneySettings(input.teamId, value);
    return value;
  }

  const value = {
    teamId: row.teamId,
    currency: row.currency,
    currencyLockedAt: row.currencyLockedAt?.toISOString() ?? null,
    rules: normalizeRules(row.rulesJson),
    calcOptions: normalizeCalc(row.calcOptionsJson),
    updatedAt: row.updatedAt.toISOString(),
  };
  setCachedMoneySettings(input.teamId, value);
  return value;
}

export async function upsertMoneySettings(
  actorUserId: string,
  input: {
    teamId: string;
    rules: AgencyOpsMoneyRulesJson;
    calcOptions: AgencyOpsMoneyCalcOptionsJson;
  },
): Promise<AgencyMoneySettingsRecord> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const rules = normalizeRules(input.rules);
  const calcOptions = normalizeCalc(input.calcOptions);

  for (const formula of calcOptions.formulas ?? []) {
    if (!formula.enabled) continue;
    const validation = validateMoneyFormulaTokens(formula.tokens);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
  }

  const now = new Date();

  const [row] = await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId: input.teamId,
      rulesJson: rules,
      calcOptionsJson: calcOptions,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: {
        rulesJson: rules,
        calcOptionsJson: calcOptions,
        updatedAt: now,
      },
    })
    .returning();

  invalidateMoneySettingsCache(input.teamId);
  return {
    teamId: input.teamId,
    currency: row?.currency ?? "USD",
    currencyLockedAt: row?.currencyLockedAt?.toISOString() ?? null,
    rules,
    calcOptions,
    updatedAt: (row?.updatedAt ?? now).toISOString(),
  };
}
