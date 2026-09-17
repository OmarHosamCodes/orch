import type { AgencyOpsMoneyFormulaDef } from "@orch/db/schema";

import { requireAgencyRole } from "../shared/membership";
import { applyFormulasToScoreboard } from "./money-formula-context";
import { syncFormulaPayoutLines } from "./money-formula-payout-sync";
import { getMoneySettings } from "./money-settings-service";
import { getInvoiceSummary, sumPeriodExternalBillablePool } from "./service";
import { sumExpensesInPeriod } from "./expense-service";
import { sumExternalClientPeriodAdjustments } from "./money-pending-adjustment-service";
import { getPayoutSectionTotals, getPayoutSummary } from "./payout-service";
import { buildPeriodScoreboard } from "./period-scoreboard";

function paidVacationHoursFromCalc(
  valueByOptionId: Record<string, number> | undefined,
  formulas: AgencyOpsMoneyFormulaDef[],
): number {
  const vacation = formulas.find((formula) => formula.key === "paid_vacation");
  const fromTokens = vacation?.tokens.find((token) => token.kind === "number");
  if (fromTokens && fromTokens.kind === "number") return fromTokens.value;
  const hours = valueByOptionId?.["paid-vacation"];
  return typeof hours === "number" && Number.isFinite(hours) ? hours : 200;
}

export async function getPeriodScoreboard(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
) {
  const role = await requireAgencyRole(actorUserId, input.teamId, "viewer");
  if (role === "owner") {
    await syncFormulaPayoutLines(actorUserId, {
      ...input,
      refreshSnapshot: false,
    });
  }

  const [
    invoiceSummary,
    payoutSummary,
    expenseTotals,
    sectionTotals,
    settings,
    billablePool,
    clientPeriodAdjustmentsNet,
  ] = await Promise.all([
    getInvoiceSummary(actorUserId, input),
    getPayoutSummary(actorUserId, input),
    sumExpensesInPeriod(actorUserId, input),
    getPayoutSectionTotals(actorUserId, input),
    getMoneySettings(actorUserId, { teamId: input.teamId }),
    sumPeriodExternalBillablePool(actorUserId, input),
    sumExternalClientPeriodAdjustments(actorUserId, input),
  ]);

  const currency =
    settings.currency ||
    invoiceSummary.currency ||
    payoutSummary.currency ||
    expenseTotals.currency ||
    billablePool.currency ||
    "USD";

  const scoreboardInput = {
    billablePoolAmount: billablePool.billablePoolAmount,
    clientPeriodAdjustmentsNet,
    receivedAmount: invoiceSummary.receivedAmount,
    invoicedRemainingAmount: invoiceSummary.remainingAmount,
    salariesDueAmount: payoutSummary.salariesDueAmount || sectionTotals.salaries,
    expensesAmount: expenseTotals.amount,
    debtDiscountAmount: sectionTotals.debt_discount,
    paidVacationAmount: sectionTotals.paid_vacation,
    deviceCompAmount: sectionTotals.device_comp,
    charityAmount: sectionTotals.charity,
    pbcAmount: sectionTotals.pbc,
    teamLossAmount: sectionTotals.team_loss,
    extraIncomeAmount: sectionTotals.extra,
    currency,
  };

  const formulas = settings.calcOptions.formulas ?? [];
  if (formulas.length === 0) {
    return buildPeriodScoreboard(scoreboardInput);
  }

  const paidVacationHours = paidVacationHoursFromCalc(
    settings.calcOptions.valueByOptionId,
    formulas,
  );

  return applyFormulasToScoreboard(scoreboardInput, formulas, paidVacationHours);
}
