import { z } from "zod";

import { protectedProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import {
  deletePendingAdjustment,
  listPendingAdjustments,
  upsertPendingAdjustment,
} from "./money-pending-adjustment-service";

export const moneyPartyTypeSchema = z.enum(["client", "member"]);
export const moneyPendingKindSchema = z.enum(["discount", "surcharge", "debt"]);

export const moneyPendingAdjustmentRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  partyType: moneyPartyTypeSchema,
  partyId: z.string().min(1),
  periodStart: z.string().datetime().nullable(),
  periodEnd: z.string().datetime().nullable(),
  obligationId: z.string().min(1).nullable(),
  appliedInvoiceId: z.string().min(1).nullable(),
  invoiceLineItemId: z.string().min(1).nullable(),
  kind: moneyPendingKindSchema,
  amount: z.number().int().positive(),
  note: z.string(),
  createdByUserId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const pendingAdjustmentsRouter = {
  list: protectedProcedure
    .input(
      teamScopedInputSchema.extend({
        partyType: moneyPartyTypeSchema.optional(),
        partyId: z.string().min(1).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      return z
        .object({
          items: z.array(moneyPendingAdjustmentRecordSchema),
        })
        .parse(await listPendingAdjustments(context.session.user.id, input));
    }),
  upsert: protectedProcedure
    .input(
      teamScopedInputSchema.extend({
        id: z.string().min(1).optional(),
        partyType: moneyPartyTypeSchema,
        partyId: z.string().min(1),
        kind: moneyPendingKindSchema,
        amount: z.number().int().positive(),
        note: z.string().optional(),
        periodStart: z.string().datetime().optional(),
        periodEnd: z.string().datetime().optional(),
        obligationId: z.string().min(1).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      return moneyPendingAdjustmentRecordSchema.parse(
        await upsertPendingAdjustment(context.session.user.id, input),
      );
    }),
  remove: protectedProcedure
    .input(
      teamScopedInputSchema.extend({
        id: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) => {
      return z
        .object({ id: z.string().min(1) })
        .parse(await deletePendingAdjustment(context.session.user.id, input));
    }),
};
