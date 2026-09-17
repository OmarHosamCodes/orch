import { db } from "@orch/db";
import {
  agencyOpsMemberRate,
  agencyOpsTimeEntry,
  type AgencyOpsMoneyFormulaOutput,
  type AgencyOpsMoneyFormulaToken,
} from "@orch/db/schema";
import { and, eq, gte, isNull, lte, sum } from "drizzle-orm";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireAgencyRole } from "../shared/membership";
import {
  buildMoneyFormulaContext,
  evaluateFormulaValue,
  type MoneyFormulaPeriodFacts,
} from "./money-formula-context";
import { evaluateMoneyFormulaTokens } from "./money-formula-eval";
import { resolveRuleCohortSize } from "./money-formula-rule";
import { validateMoneyFormulaTokens } from "./money-formula-tokens";
import { getMoneySettings } from "./money-settings-service";
import { getPeriodScoreboard } from "./money-scoreboard-service";

function paidVacationHoursFromSettings(
  valueByOptionId: Record<string, number> | undefined,
  tokens: AgencyOpsMoneyFormulaToken[],
): number {
  const fromTokens = tokens.find((token) => token.kind === "number");
  if (fromTokens && fromTokens.kind === "number") return fromTokens.value;
  const hours = valueByOptionId?.["paid-vacation"];
  return typeof hours === "number" && Number.isFinite(hours) ? hours : 200;
}

export async function previewMoneyFormula(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    tokens: AgencyOpsMoneyFormulaToken[];
    output: AgencyOpsMoneyFormulaOutput;
    memberUserId?: string | null;
    ruleId?: string | null;
    sectionKey?: string | null;
  },
): Promise<{ value: number | null; error: string | null }> {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const structure = validateMoneyFormulaTokens(input.tokens);
  if (!structure.ok) {
    return { value: null, error: structure.error };
  }

  const [board, settings] = await Promise.all([
    getPeriodScoreboard(actorUserId, {
      teamId: input.teamId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    }),
    getMoneySettings(actorUserId, { teamId: input.teamId }),
  ]);

  const paidVacationHours = paidVacationHoursFromSettings(
    settings.calcOptions.valueByOptionId,
    input.tokens,
  );

  const facts: MoneyFormulaPeriodFacts = {
    totalIncomeAmount: board.totalIncomeAmount,
    receivedAmount: board.receivedAmount,
    salariesAmount: board.salariesAmount,
    expensesAmount: board.expensesAmount,
    debtDiscountAmount: board.debtDiscountAmount,
    paidVacationAmount: board.paidVacationAmount,
    deviceCompAmount: board.deviceCompensationAmount,
    charityAmount: board.charityAmount,
    pbcAmount: board.pbcAmount,
    teamLossAmount: board.profitLossShareAmount,
    paidVacationHours,
    cohortSize: resolveRuleCohortSize({
      formula: { ruleId: input.ruleId ?? null, sectionKey: input.sectionKey ?? null },
      sectionKey: input.sectionKey ?? null,
      enabledRuleIds: settings.rules.enabledRuleIds,
      memberIdsByRuleId: settings.rules.memberIdsByRuleId,
      allMemberIds: [],
    }),
  };

  if (input.memberUserId) {
    const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
    const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
    const [rateRow] = await db
      .select({ costRateAmount: agencyOpsMemberRate.costRateAmount })
      .from(agencyOpsMemberRate)
      .where(
        and(
          eq(agencyOpsMemberRate.teamId, input.teamId),
          eq(agencyOpsMemberRate.userId, input.memberUserId),
        ),
      )
      .limit(1);
    const [durationRow] = await db
      .select({ total: sum(agencyOpsTimeEntry.durationSeconds) })
      .from(agencyOpsTimeEntry)
      .where(
        and(
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          eq(agencyOpsTimeEntry.userId, input.memberUserId),
          isNull(agencyOpsTimeEntry.deletedAt),
          gte(agencyOpsTimeEntry.startedAt, periodStart),
          lte(agencyOpsTimeEntry.startedAt, periodEnd),
        ),
      );
    facts.memberCostRateAmount = rateRow?.costRateAmount ?? 0;
    facts.memberHours = Number(durationRow?.total ?? 0) / 3600;
  }

  const context = buildMoneyFormulaContext(facts);
  const result = evaluateMoneyFormulaTokens(input.tokens, context);
  if (!result.ok) {
    return { value: null, error: result.error };
  }

  const value = evaluateFormulaValue(
    {
      id: "preview",
      key: "preview",
      label: "Preview",
      locked: false,
      enabled: true,
      tokens: input.tokens,
      output: input.output,
      metricId: null,
      sectionKey: input.sectionKey ?? null,
      ruleId: input.ruleId ?? null,
    },
    context,
  );

  return { value, error: value === null ? "Could not evaluate formula." : null };
}
