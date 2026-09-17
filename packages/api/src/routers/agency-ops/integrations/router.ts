import { z } from "zod";
import { protectedProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import { listIntegrationsStub } from "./stubs-service";

export const integrationsRouter = {
  integrations: {
    list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          items: z.array(
            z.object({
              id: z.enum(["slack", "calendar", "quickbooks", "webhooks"]),
              name: z.string().min(1),
              description: z.string().min(1),
              status: z.enum(["available", "connected"]),
              connectedAt: z.string().datetime().nullable(),
            }),
          ),
        })
        .parse(await listIntegrationsStub(context.session.user.id, input));
    }),
  },
};
