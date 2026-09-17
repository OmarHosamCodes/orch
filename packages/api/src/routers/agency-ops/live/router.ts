import { protectedProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import { agencyLiveEventSchema, subscribeAgencyLive } from "./live";

export const liveRouter = {
  live: {
    subscribe: protectedProcedure.input(teamScopedInputSchema).handler(async function* ({
      context,
      input,
      signal,
    }) {
      for await (const event of subscribeAgencyLive(context.session.user.id, {
        ...input,
        signal,
      })) {
        yield agencyLiveEventSchema.parse(event);
      }
    }),
  },
};
