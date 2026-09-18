import { z } from "zod";
import { protectedProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import { listAgencyFavorites, toggleAgencyFavorite } from "./service";

const agencyFavoritesSchema = z.object({
  projectIds: z.array(z.string().min(1)),
  taskIds: z.array(z.string().min(1)),
});

export const favoritesRouter = {
  favorites: {
    list: protectedProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return agencyFavoritesSchema.parse(await listAgencyFavorites(context.session.user.id, input));
    }),
    toggle: protectedProcedure
      .input(
        teamScopedInputSchema.extend({
          kind: z.enum(["project", "task"]),
          projectId: z.string().min(1).optional(),
          taskId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return agencyFavoritesSchema
          .extend({ favorited: z.boolean() })
          .parse(await toggleAgencyFavorite(context.session.user.id, input));
      }),
  },
};
