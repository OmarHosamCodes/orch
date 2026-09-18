import { z } from "zod";
import { protectedProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import {
  listMemberRates,
  upsertMemberRate,
  listInvoices,
  getInvoiceSummary,
  createInvoice,
  updateInvoiceStatus,
  recordInvoicePayment,
  listPeriodBillActivity,
  listBudgetsStub,
} from "./service";
import {
  createPayoutLine,
  createPayoutLineFromMember,
  deletePayoutLine,
  ensurePayoutPeriod,
  getPayoutRun,
  getPayoutSummary,
  listPayoutLines,
  recordPayoutPayment,
  updatePayoutLineStatus,
} from "./payout-service";
import {
  createExpense,
  listExpenses,
  listSubscriptionCycles,
  recordExpensePayment,
  removeExpense,
  updateExpense,
} from "./expense-service";
import { getMoneySettings, upsertMoneySettings } from "./money-settings-service";
import {
  applyCurrentFxToPeriod,
  deleteFxRate,
  listFxRates,
  listPeriodFx,
  setAgencyCurrency,
  suggestFxRate,
  upsertFxRate,
} from "./money-fx-service";
import { getPeriodScoreboard } from "./money-scoreboard-service";
import { previewMoneyFormula } from "./money-formula-preview-service";
import { syncFormulaPayoutLines } from "./money-formula-payout-sync";
import {
  moneyCalcOptionsSchema,
  moneyFormulaTokenSchema,
  moneyRulesSchema,
  moneySettingsRecordSchema,
} from "./money-formula-schemas";
import {
  exportMoneyDocuments,
  listPeriodMoneyObligations,
  settleMoneyObligation,
} from "./money-export-service";
import {
  getSalaryPool,
  recordSalaryPoolPayment,
  upsertSalaryPoolTotal,
} from "./salary-pool-service";
import {
  expenseAmountModeSchema,
  expenseKindSchema,
  expensePeriodSchema,
  expenseRecordSchema,
  positiveFxRateSchema,
  invoiceBillStatusSchema,
  invoiceRecordSchema,
  invoiceStatusSchema,
  moneyClientObligationSchema,
  moneyExportModeSchema,
  moneyMemberObligationSchema,
  moneyObligationKindSchema,
  moneySettleActionSchema,
  payoutBillStatusSchema,
  payoutBillsPartySchema,
  payoutLineRecordSchema,
  payoutRunRecordSchema,
  payoutRunStatusSchema,
  payoutSectionKeySchema,
  subscriptionCycleRecordSchema,
} from "./billing-router-schemas";
import {
  moneyPartyTypeSchema,
  moneyPendingAdjustmentRecordSchema,
  pendingAdjustmentsRouter,
} from "./pending-adjustments-router";

export const billingRouter = {
  budgets: {
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(
              z.object({
                projectId: z.string().min(1),
                currency: z.string().min(1),
                hoursBudget: z.number().nonnegative().nullable(),
                costBudgetAmount: z.number().int().nonnegative().nullable(),
                hoursLogged: z.number().nonnegative(),
                costLoggedAmount: z.number().int().nonnegative(),
                periodStart: z.string().datetime().nullable(),
                periodEnd: z.string().datetime().nullable(),
              }),
            ),
          })
          .parse(await listBudgetsStub(context.session.user.id, input));
      }),
  },

  rates: {
    list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          items: z.array(
            z.object({
              userId: z.string().min(1),
              userName: z.string().min(1),
              userEmail: z.email(),
              costRateAmount: z.number().int().nonnegative().nullable(),
              billableRateAmount: z.number().int().nonnegative().nullable(),
              currency: z.string().min(1),
              effectiveFrom: z.string().datetime().nullable(),
            }),
          ),
        })
        .parse(await listMemberRates(context.session.user.id, input));
    }),
    upsert: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          costRateAmount: z.number().int().nonnegative().nullable().optional(),
          billableRateAmount: z.number().int().nonnegative().nullable().optional(),
          currency: z.string().length(3).optional(),
          effectiveFrom: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            userId: z.string().min(1),
            userName: z.string().min(1),
            userEmail: z.email(),
            costRateAmount: z.number().int().nonnegative().nullable(),
            billableRateAmount: z.number().int().nonnegative().nullable(),
            currency: z.string().min(1),
            effectiveFrom: z.string().datetime().nullable(),
          })
          .parse(await upsertMemberRate(context.session.user.id, input));
      }),
  },

  invoices: {
    summary: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            draftCount: z.number().int().nonnegative(),
            sentCount: z.number().int().nonnegative(),
            partialCount: z.number().int().nonnegative(),
            paidCount: z.number().int().nonnegative(),
            refundedCount: z.number().int().nonnegative(),
            outstandingAmount: z.number().int().nonnegative(),
            currency: z.string().min(1),
            outstandingByCurrency: z.record(z.string(), z.number().int().nonnegative()),
            billedAmount: z.number().int().nonnegative(),
            receivedAmount: z.number().int().nonnegative(),
            remainingAmount: z.number().int().nonnegative(),
          })
          .parse(await getInvoiceSummary(context.session.user.id, input));
      }),
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          status: invoiceStatusSchema.optional(),
          billStatus: invoiceBillStatusSchema.optional(),
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
          search: z.string().optional(),
          page: z.number().int().positive().optional(),
          pageSize: z.number().int().positive().max(200).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(invoiceRecordSchema),
            page: z.number().int().positive(),
            pageSize: z.number().int().nonnegative(),
            total: z.number().int().nonnegative(),
          })
          .parse(await listInvoices(context.session.user.id, input));
      }),
    create: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return invoiceRecordSchema.parse(await createInvoice(context.session.user.id, input));
      }),
    updateStatus: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          invoiceId: z.string().min(1),
          status: z.enum(["sent", "paid", "refunded"]),
        }),
      )
      .handler(async ({ context, input }) => {
        return invoiceRecordSchema.parse(await updateInvoiceStatus(context.session.user.id, input));
      }),
    recordPayment: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          invoiceId: z.string().min(1),
          amount: z.number().int().positive(),
        }),
      )
      .handler(async ({ context, input }) => {
        return invoiceRecordSchema.parse(
          await recordInvoicePayment(context.session.user.id, input),
        );
      }),
    periodActivity: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          search: z.string().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            clients: z.array(
              z.object({
                clientId: z.string().min(1),
                clientName: z.string().min(1),
                durationSeconds: z.number().int().nonnegative(),
                billableAmount: z.number().int().nonnegative(),
                sourceBillableAmount: z.number().int().nonnegative(),
                rateCurrency: z.string().min(1),
                wasteAmount: z.number().int().nonnegative(),
              }),
            ),
            members: z.array(
              z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userAvatar: z.string().nullable(),
                durationSeconds: z.number().int().nonnegative(),
                payableAmount: z.number().int().nonnegative(),
                wasteAmount: z.number().int().nonnegative(),
              }),
            ),
          })
          .parse(await listPeriodBillActivity(context.session.user.id, input));
      }),
  },

  payouts: {
    ensurePeriod: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutRunRecordSchema.parse(
          await ensurePayoutPeriod(context.session.user.id, input),
        );
      }),
    summary: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            salariesDueAmount: z.number().int().nonnegative(),
            salariesPaidAmount: z.number().int().nonnegative(),
            salariesRemainingAmount: z.number().int().nonnegative(),
            currency: z.string().min(1),
          })
          .parse(await getPayoutSummary(context.session.user.id, input));
      }),
    getRun: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            id: z.string().min(1),
            teamId: z.string().min(1),
            status: payoutRunStatusSchema,
            currency: z.string().min(1),
            periodStart: z.string().datetime(),
            periodEnd: z.string().datetime(),
            salariesSectionId: z.string().min(1),
            sections: z.array(
              z.object({
                id: z.string().min(1),
                key: payoutSectionKeySchema,
                title: z.string().min(1),
                sortOrder: z.number().int().nonnegative(),
                lineCount: z.number().int().nonnegative(),
                dueAmount: z.number().int().nonnegative(),
                paidAmount: z.number().int().nonnegative(),
                remainingAmount: z.number().int().nonnegative(),
              }),
            ),
          })
          .parse(await getPayoutRun(context.session.user.id, input));
      }),
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          billStatus: payoutBillStatusSchema.optional(),
          search: z.string().optional(),
          sectionKey: payoutSectionKeySchema.optional(),
          billsParty: payoutBillsPartySchema.optional(),
          page: z.number().int().positive().optional(),
          pageSize: z.number().int().positive().max(200).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(payoutLineRecordSchema),
            page: z.number().int().positive(),
            pageSize: z.number().int().nonnegative(),
            total: z.number().int().nonnegative(),
          })
          .parse(await listPayoutLines(context.session.user.id, input));
      }),
    createLine: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          sectionKey: payoutSectionKeySchema,
          payeeUserId: z.string().min(1).nullable().optional(),
          label: z.string().min(1),
          amount: z.number().int().positive(),
          currency: z.string().length(3).optional(),
          cohortKey: z.string().nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(await createPayoutLine(context.session.user.id, input));
      }),
    createFromMember: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(
          await createPayoutLineFromMember(context.session.user.id, input),
        );
      }),
    recordPayment: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          lineId: z.string().min(1),
          amount: z.number().int().positive(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(
          await recordPayoutPayment(context.session.user.id, input),
        );
      }),
    updateStatus: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          lineId: z.string().min(1),
          status: z.enum(["paid", "draft"]),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(
          await updatePayoutLineStatus(context.session.user.id, input),
        );
      }),
    deleteLine: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          lineId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ id: z.string().min(1) })
          .parse(await deletePayoutLine(context.session.user.id, input));
      }),
    syncFormulaLines: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          refreshSnapshot: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            upserted: z.number().int().nonnegative(),
            skipped: z.number().int().nonnegative(),
          })
          .parse(await syncFormulaPayoutLines(context.session.user.id, input));
      }),
  },

  salaryPool: {
    get: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            pool: z
              .object({
                id: z.string().min(1),
                teamId: z.string().min(1),
                runId: z.string().min(1),
                totalAmount: z.number().int().nonnegative(),
                paidAmount: z.number().int().nonnegative(),
                remainingAmount: z.number().int().nonnegative(),
                currency: z.string().min(1),
                periodStart: z.string().datetime(),
                periodEnd: z.string().datetime(),
                createdAt: z.string().datetime(),
                updatedAt: z.string().datetime(),
              })
              .nullable(),
          })
          .parse(await getSalaryPool(context.session.user.id, input));
      }),
    upsertTotal: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          totalAmount: z.number().int().positive(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            id: z.string().min(1),
            teamId: z.string().min(1),
            runId: z.string().min(1),
            totalAmount: z.number().int().nonnegative(),
            paidAmount: z.number().int().nonnegative(),
            remainingAmount: z.number().int().nonnegative(),
            currency: z.string().min(1),
            periodStart: z.string().datetime(),
            periodEnd: z.string().datetime(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          })
          .parse(await upsertSalaryPoolTotal(context.session.user.id, input));
      }),
    recordPayment: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          amount: z.number().int().positive(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            id: z.string().min(1),
            teamId: z.string().min(1),
            runId: z.string().min(1),
            totalAmount: z.number().int().nonnegative(),
            paidAmount: z.number().int().nonnegative(),
            remainingAmount: z.number().int().nonnegative(),
            currency: z.string().min(1),
            periodStart: z.string().datetime(),
            periodEnd: z.string().datetime(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          })
          .parse(await recordSalaryPoolPayment(context.session.user.id, input));
      }),
  },

  expenses: {
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
          page: z.number().int().positive().optional(),
          pageSize: z.number().int().positive().max(200).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(expenseRecordSchema),
            page: z.number().int().positive(),
            pageSize: z.number().int().nonnegative(),
            total: z.number().int().nonnegative(),
          })
          .parse(await listExpenses(context.session.user.id, input));
      }),
    subscriptionCycles: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .array(subscriptionCycleRecordSchema)
          .parse(await listSubscriptionCycles(context.session.user.id, input));
      }),
    create: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          name: z.string().min(1),
          kind: expenseKindSchema,
          period: expensePeriodSchema.nullable().optional(),
          note: z.string().optional(),
          amount: z.number().int().nonnegative(),
          amountMode: expenseAmountModeSchema.optional(),
          currency: z.string().length(3).optional(),
          fxRate: positiveFxRateSchema.optional(),
          startsAt: z.string().datetime().nullable().optional(),
          nextDueAt: z.string().datetime().nullable().optional(),
          occurredAt: z.string().datetime().nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return expenseRecordSchema.parse(await createExpense(context.session.user.id, input));
      }),
    update: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          expenseId: z.string().min(1),
          name: z.string().min(1).optional(),
          kind: expenseKindSchema.optional(),
          note: z.string().optional(),
          amount: z.number().int().nonnegative().optional(),
          amountMode: expenseAmountModeSchema.optional(),
          currency: z.string().length(3).optional(),
          fxRate: positiveFxRateSchema.optional(),
          period: expensePeriodSchema.nullable().optional(),
          startsAt: z.string().datetime().nullable().optional(),
          nextDueAt: z.string().datetime().nullable().optional(),
          occurredAt: z.string().datetime().nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return expenseRecordSchema.parse(await updateExpense(context.session.user.id, input));
      }),
    recordPayment: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          expenseId: z.string().min(1),
          amount: z.number().int().positive(),
        }),
      )
      .handler(async ({ context, input }) => {
        return expenseRecordSchema.parse(
          await recordExpensePayment(context.session.user.id, input),
        );
      }),
    remove: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          expenseId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ id: z.string().min(1) })
          .parse(await removeExpense(context.session.user.id, input));
      }),
  },

  periodObligations: {
    list: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          search: z.string().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            clients: z.array(moneyClientObligationSchema),
            members: z.array(moneyMemberObligationSchema),
            pendingAdjustments: z.array(moneyPendingAdjustmentRecordSchema),
          })
          .parse(await listPeriodMoneyObligations(context.session.user.id, input));
      }),
  },

  pendingAdjustments: pendingAdjustmentsRouter,

  money: {
    periodScoreboard: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            currency: z.string().min(1),
            totalIncomeAmount: z.number().int(),
            receivedAmount: z.number().int().nonnegative(),
            remainingAmount: z.number().int().nonnegative(),
            salariesAmount: z.number().int().nonnegative(),
            expensesAmount: z.number().int().nonnegative(),
            debtDiscountAmount: z.number().int().nonnegative(),
            paidVacationAmount: z.number().int().nonnegative(),
            teamProfitAmount: z.number().int(),
            profitLossShareAmount: z.number().int(),
            roi: z.number(),
            deviceCompensationAmount: z.number().int().nonnegative(),
            charityAmount: z.number().int().nonnegative(),
            pbcAmount: z.number().int().nonnegative(),
          })
          .parse(await getPeriodScoreboard(context.session.user.id, input));
      }),
    settle: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          partyType: moneyPartyTypeSchema,
          obligationId: z.string().min(1),
          action: moneySettleActionSchema,
          amount: z.number().int().nonnegative(),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          clientId: z.string().min(1).optional(),
          userId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            documentId: z.string().min(1),
            kind: z.enum(["invoice", "payout"]),
          })
          .parse(await settleMoneyObligation(context.session.user.id, input));
      }),
    exportDocuments: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          partyType: moneyPartyTypeSchema,
          partyId: z.string().min(1),
          mode: moneyExportModeSchema,
          selections: z
            .array(
              z.object({
                obligationId: z.string().min(1),
                periodStart: z.string().datetime(),
                periodEnd: z.string().datetime(),
                kind: moneyObligationKindSchema,
                amount: z.number().int().nonnegative(),
              }),
            )
            .min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            documents: z.array(
              z.object({
                id: z.string().min(1),
                kind: z.enum(["invoice", "payout"]),
              }),
            ),
          })
          .parse(await exportMoneyDocuments(context.session.user.id, input));
      }),
  },

  moneySettings: {
    get: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return moneySettingsRecordSchema.parse(
        await getMoneySettings(context.session.user.id, input),
      );
    }),
    upsert: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          rules: moneyRulesSchema,
          calcOptions: moneyCalcOptionsSchema,
        }),
      )
      .handler(async ({ context, input }) => {
        return moneySettingsRecordSchema.parse(
          await upsertMoneySettings(context.session.user.id, input),
        );
      }),
    setCurrency: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          currency: z.string().length(3),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            currency: z.string().length(3),
            currencyLockedAt: z.string().datetime().nullable(),
          })
          .parse(await setAgencyCurrency(context.session.user.id, input));
      }),
    preview: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          tokens: z.array(moneyFormulaTokenSchema).min(1),
          output: z.enum(["amount", "ratio", "hours"]),
          memberUserId: z.string().min(1).nullable().optional(),
          ruleId: z.string().min(1).nullable().optional(),
          sectionKey: z.string().min(1).nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            value: z.number().nullable(),
            error: z.string().nullable(),
          })
          .parse(await previewMoneyFormula(context.session.user.id, input));
      }),
  },

  fxRates: {
    list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          items: z.array(
            z.object({
              id: z.string().min(1),
              teamId: z.string().min(1),
              fromCurrency: z.string().length(3),
              toCurrency: z.string().length(3),
              rate: z.string().min(1),
              updatedAt: z.string().datetime(),
            }),
          ),
          agencyCurrency: z.string().length(3),
          currencyLockedAt: z.string().datetime().nullable(),
        })
        .parse(await listFxRates(context.session.user.id, input));
    }),
    upsert: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          fromCurrency: z.string().length(3),
          toCurrency: z.string().length(3),
          rate: z.string().min(1),
          id: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            id: z.string().min(1),
            teamId: z.string().min(1),
            fromCurrency: z.string().length(3),
            toCurrency: z.string().length(3),
            rate: z.string().min(1),
            updatedAt: z.string().datetime(),
          })
          .parse(await upsertFxRate(context.session.user.id, input));
      }),
    delete: protectedProcedure
      .input(teamScopedInputSchema.extend({ id: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        return z
          .object({ ok: z.literal(true) })
          .parse(await deleteFxRate(context.session.user.id, input));
      }),
    suggest: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          fromCurrency: z.string().length(3),
          toCurrency: z.string().length(3),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            rate: z.string().min(1),
            asOf: z.string().datetime(),
            provider: z.literal("frankfurter"),
          })
          .parse(await suggestFxRate(context.session.user.id, input));
      }),
    listPeriod: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(
              z.object({
                fromCurrency: z.string().length(3),
                toCurrency: z.string().length(3),
                rate: z.string().min(1),
                fxAsOf: z.string().datetime().nullable(),
              }),
            ),
            canApplyCurrent: z.boolean(),
          })
          .parse(await listPeriodFx(context.session.user.id, input));
      }),
    applyCurrentToPeriod: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(
              z.object({
                fromCurrency: z.string().length(3),
                toCurrency: z.string().length(3),
                rate: z.string().min(1),
                fxAsOf: z.string().datetime().nullable(),
              }),
            ),
            canApplyCurrent: z.boolean(),
          })
          .parse(await applyCurrentFxToPeriod(context.session.user.id, input));
      }),
  },
};
