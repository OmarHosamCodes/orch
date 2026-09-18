import { protectedProcedure } from "../../procedures";
import { createFirstAgency, getFirstRun, markFirstRunComplete } from "./service";
import {
  firstRunCreateInputSchema,
  firstRunCreateOutputSchema,
  firstRunSessionSchema,
} from "./schemas";

export const onboardingRouter = {
  get: protectedProcedure.handler(async ({ context }) => {
    return firstRunSessionSchema.parse(await getFirstRun(context.session.user.id, {}));
  }),
  complete: protectedProcedure.handler(async ({ context }) => {
    return firstRunSessionSchema.parse(await markFirstRunComplete(context.session.user.id, {}));
  }),
  createAgency: protectedProcedure
    .input(firstRunCreateInputSchema)
    .handler(async ({ context, input }) => {
      return firstRunCreateOutputSchema.parse(
        await createFirstAgency(context.session.user.id, input),
      );
    }),
};
