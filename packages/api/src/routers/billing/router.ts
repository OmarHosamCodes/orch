import { protectedProcedure } from "../../procedures";
import { z } from "zod";
import {
  billingStateSchema,
  checkoutUrlSchema,
  teamBillingSnapshotSchema,
} from "./schemas";
import {
  confirmCheckout,
  createCreditCheckout,
  createSeatCheckout,
  getSubscriptionBillingState,
} from "./service";

export const billingRouter = {
  state: protectedProcedure
    .input(z.object({ teamId: z.string().min(1) }))
    .handler(async ({ context, input }) =>
      billingStateSchema.parse(await getSubscriptionBillingState(context.session.user.id, input)),
    ),

  createSeatCheckout: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        seats: z.number().int().positive(),
      }),
    )
    .handler(async ({ context, input }) =>
      checkoutUrlSchema.parse(await createSeatCheckout(context.session.user.id, input)),
    ),

  createCreditCheckout: protectedProcedure
    .input(z.object({ teamId: z.string().min(1) }))
    .handler(async ({ context, input }) =>
      checkoutUrlSchema.parse(await createCreditCheckout(context.session.user.id, input)),
    ),

  confirmCheckout: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        checkoutId: z.string().min(1),
      }),
    )
    .handler(async ({ context, input }) =>
      teamBillingSnapshotSchema.parse(await confirmCheckout(context.session.user.id, input)),
    ),
};
