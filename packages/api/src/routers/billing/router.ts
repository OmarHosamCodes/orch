import { protectedProcedure } from "../../procedures";
import { z } from "zod";
import { billingStateSchema } from "./schemas";
import { getSubscriptionBillingState } from "./service";

export const billingRouter = {
  state: protectedProcedure
    .input(z.object({ teamId: z.string().min(1) }))
    .handler(async ({ context, input }) =>
      billingStateSchema.parse(await getSubscriptionBillingState(context.session.user.id, input)),
    ),
};
