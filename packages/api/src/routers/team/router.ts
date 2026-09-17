import { workspaceTeamRoleSchema } from "@orch/workspace";
import { z } from "zod";

import { protectedProcedure } from "../../procedures";
import {
  teamAddMemberInputSchema,
  teamCreateInputSchema,
  teamDeleteInputSchema,
  teamDetailSchema,
  teamGetInputSchema,
  teamMemberSchema,
  teamRemoveMemberInputSchema,
  teamSummarySchema,
  teamUpdateInputSchema,
  teamUpdateMemberRoleInputSchema,
} from "./schemas";
import { ensurePersonalAgency } from "./ensure-personal-agency";
import {
  addTeamMember,
  assertCanCreateTeam,
  createTeam,
  deleteTeam,
  getTeam,
  listUserTeams,
  listTeamMembers,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from "./service";

export const teamRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const teams = await listUserTeams(context.session.user.id, {});

    return z.object({ items: z.array(teamSummarySchema) }).parse({ items: teams });
  }),
  ensurePersonal: protectedProcedure.handler(async ({ context }) => {
    return teamSummarySchema.parse(
      await ensurePersonalAgency(context.session.user.id, {
        name: context.session.user.name,
      }),
    );
  }),
  get: protectedProcedure.input(teamGetInputSchema).handler(async ({ context, input }) => {
    return teamDetailSchema.parse(await getTeam(context.session.user.id, input));
  }),
  create: protectedProcedure.input(teamCreateInputSchema).handler(async ({ context, input }) => {
    await assertCanCreateTeam(context.session.user.id, {});

    return teamSummarySchema.parse(await createTeam(context.session.user.id, input));
  }),
  update: protectedProcedure.input(teamUpdateInputSchema).handler(async ({ context, input }) => {
    const team = await updateTeam(context.session.user.id, {
      teamId: input.teamId,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
    });
    const actorMembership = await listUserTeams(context.session.user.id, {});
    const actorTeam = actorMembership.find((item) => item.id === team.id);

    return teamSummarySchema.parse({
      id: team.id,
      name: team.name,
      image: team.image,
      role: actorTeam?.role ?? "owner",
      createdByUserId: team.createdByUserId,
      updatedAt: team.updatedAt,
    });
  }),
  delete: protectedProcedure.input(teamDeleteInputSchema).handler(async ({ context, input }) => {
    return z
      .object({
        teamId: z.string().min(1),
        deleted: z.boolean(),
      })
      .parse(await deleteTeam(context.session.user.id, input));
  }),
  members: {
    list: protectedProcedure.input(teamGetInputSchema).handler(async ({ context, input }) => {
      return z.object({ items: z.array(teamMemberSchema) }).parse({
        items: await listTeamMembers(context.session.user.id, input),
      });
    }),
    add: protectedProcedure.input(teamAddMemberInputSchema).handler(async ({ context, input }) => {
      return teamMemberSchema.parse(await addTeamMember(context.session.user.id, input));
    }),
    updateRole: protectedProcedure
      .input(teamUpdateMemberRoleInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            teamId: z.string().min(1),
            userId: z.string().min(1),
            role: workspaceTeamRoleSchema,
          })
          .parse(await updateTeamMemberRole(context.session.user.id, input));
      }),
    remove: protectedProcedure
      .input(teamRemoveMemberInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            teamId: z.string().min(1),
            userId: z.string().min(1),
            removed: z.boolean(),
          })
          .parse(await removeTeamMember(context.session.user.id, input));
      }),
  },
};
