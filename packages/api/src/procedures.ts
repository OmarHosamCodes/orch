import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { toProcedureError } from "./dev-errors";

export const o = os.$context<Context>();

const devErrorMiddleware = o.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw toProcedureError("rpc.procedure", error);
  }
});

export const publicProcedure = o.use(devErrorMiddleware);

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
